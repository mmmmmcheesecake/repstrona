#!/usr/bin/env node
/**
 * AI batch tagger.
 * Wymaga Node 18+ (fetch wbudowane).
 *
 * Użycie:
 *   ANTHROPIC_API_KEY=sk-ant-...  node tools/tag-products.js
 *
 * Opcje:
 *   --force      przetaguj wszystkie produkty (domyślnie tylko te bez tagów)
 *   --sheet=URL  inny endpoint (domyślnie produkcyjny /api/sheet)
 *   --model=ID   inny model Claude (domyślnie Haiku 4.5)
 *
 * Wyjście: content/tags.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
    console.error('❌ Brak ANTHROPIC_API_KEY. Ustaw zmienną środowiskową i uruchom ponownie.');
    process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const SHEET_URL = (args.find(a => a.startsWith('--sheet=')) || '').split('=')[1] || 'https://repstrona.pages.dev/api/sheet';
const MODEL = (args.find(a => a.startsWith('--model=')) || '').split('=')[1] || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 20;
const THROTTLE_MS = 7000;
const OUT_PATH = path.join(PROJECT_ROOT, 'content', 'tags.json');

const CATEGORIES = [
    'Sneakers', 'Hoodie', 'Shorts', 'Underwear', 'Crewnecks', 'Sport Clothing',
    'Accesories', 'T-shirts', 'Electronics', 'Bags', 'High-end', "Jersey's",
    'Jewelry', 'Lego', 'Jackets', 'Tracksuits', 'Sunglasses', 'Belt', 'Vests',
    'Pants', "Mask's & hats", 'Watches', 'Football', 'Basketball', 'Perfume'
];

const SNEAKER_BRANDS = [
    'Jordan 1', 'Jordan 3', 'Jordan 4', 'Jordan 5-13', 'Jordan (Other)',
    'Dunks', 'Off-White', 'Yeezy', 'Nike', 'Adidas', 'New Balance',
    'Asics', 'UGG', 'Timberland', 'Puma', 'Crocs', 'High-End', 'Other'
];

const SYSTEM_PROMPT = `You are a tagger for a sneaker/streetwear/electronics/luxury catalog.

For each product, decide:

1. category — EXACTLY one of: ${CATEGORIES.join(', ')}.

2. brand — rules:
   - If category is Sneakers/Football/Basketball: use EXACTLY one of: ${SNEAKER_BRANDS.join(', ')}.
     Jordan model mapping: "Jordan 1" → Jordan 1, "Jordan 3" → Jordan 3, "Jordan 4" → Jordan 4, "Jordan 5/6/7/8/9/10/11/12/13" → Jordan 5-13, other Jordans → Jordan (Other).
     Luxury brands (LV, Gucci, Dior, Balenciaga, Amiri etc.) in sneakers → "High-End".
   - For other categories: natural brand name (e.g. "Stone Island", "Apple", "Rolex", "Lego", "Stussy", "Supreme", "Essentials"). If brand cannot be recognized → "Other".

3. model — specific model (e.g. "Jordan 4 Black Cat", "Air Force 1 Low", "AirPods Pro 2", "Tech Fleece Hoodie") or "Other" when not recognizable.

Return ONLY valid JSON in the format:
{"tags": [{"i": <index from input>, "category": "...", "brand": "...", "model": "..."}, ...]}

Do not add any comments, markdown, or prefix. JSON only.`;

function tagKey(link) {
    if (!link) return '';
    return link.split('?')[0].replace(/\/+$/, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callClaude(products, attempt = 1) {
    const userMsg = products.map((p, i) => `${i}: ${p.name}${p.description ? ' — ' + p.description.slice(0, 200) : ''}`).join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMsg }],
        }),
    });

    if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
        const waitMs = (retryAfter > 0 ? retryAfter : Math.min(60, 5 * attempt)) * 1000;
        console.log(`  ⏳ 429 — czekam ${Math.round(waitMs / 1000)}s (próba ${attempt})`);
        await sleep(waitMs);
        if (attempt > 6) throw new Error('rate limit po 6 próbach');
        return callClaude(products, attempt + 1);
    }

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API ${res.status}: ${txt.slice(0, 300)}`);
    }

    const j = await res.json();
    const text = (j.content || []).map(c => c.text || '').join('').trim();
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        throw new Error(`Parse fail: ${cleaned.slice(0, 200)}`);
    }
    return parsed.tags || [];
}

async function main() {
    console.log(`📥 Pobieram produkty z ${SHEET_URL}`);
    const r = await fetch(SHEET_URL);
    if (!r.ok) {
        console.error(`❌ Sheet API ${r.status}`);
        process.exit(1);
    }
    const products = await r.json();
    console.log(`✓ ${products.length} produktów`);

    let existing = { tags: {} };
    if (fs.existsSync(OUT_PATH)) {
        try {
            existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
            if (!existing.tags) existing.tags = {};
        } catch {
            existing = { tags: {} };
        }
    }

    const todo = products.filter(p => {
        const k = tagKey(p.link);
        if (!k) return false;
        if (FORCE) return true;
        return !existing.tags[k];
    });

    console.log(`🤖 Do otagowania: ${todo.length}${FORCE ? ' (FORCE)' : ''}`);
    if (!todo.length) {
        console.log('✓ Wszystko już otagowane. Użyj --force żeby przetagować.');
        return;
    }

    const batches = [];
    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
        batches.push(todo.slice(i, i + BATCH_SIZE));
    }

    let done = 0;
    for (const batch of batches) {
        try {
            const tags = await callClaude(batch);
            for (const t of tags) {
                const product = batch[t.i];
                if (!product) continue;
                const k = tagKey(product.link);
                existing.tags[k] = {
                    category: t.category,
                    brand: t.brand,
                    model: t.model,
                };
            }
            done += batch.length;
            fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
            console.log(`  ${done}/${todo.length} (zapisane)`);
            await sleep(THROTTLE_MS);
        } catch (e) {
            console.warn(`  ⚠ batch fail: ${e.message}`);
            await sleep(THROTTLE_MS);
        }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
    console.log(`✅ Zapisane do ${OUT_PATH} (${Object.keys(existing.tags).length} tagów)`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
