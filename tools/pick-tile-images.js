#!/usr/bin/env node
/**
 * AI tile-image picker.
 *
 * Dla każdego wielo-kolorowego produktu wybiera zdjęcie pokazujące
 * wszystkie kolorystyki naraz (lineup / family shot). Wynik trafia
 * do content/tile-images.json i jest używany jako preferowane zdjęcie
 * karty produktu w katalogu.
 *
 * Wymaga Node 18+ (fetch wbudowane).
 *
 * Użycie:
 *   ANTHROPIC_API_KEY=sk-ant-...  node tools/pick-tile-images.js
 *
 * Opcje:
 *   --force         przelicz wszystkie produkty (domyślnie tylko nowe)
 *   --retry-nulls   przelicz produkty zapisane jako null (przydatne po fixie product API)
 *   --sheet=URL     inny endpoint /api/sheet
 *   --product=URL   inny endpoint /api/product
 *   --model=ID      inny model Claude (domyślnie Haiku 4.5)
 *   --limit=N       przetwórz tylko N pierwszych pasujących produktów (debug)
 *
 * Wyjście: content/tile-images.json
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
const RETRY_NULLS = args.includes('--retry-nulls');
const SHEET_URL   = (args.find(a => a.startsWith('--sheet=')) || '').split('=')[1] || 'https://replug24.com/api/sheet';
const PRODUCT_URL = (args.find(a => a.startsWith('--product=')) || '').split('=')[1] || 'https://replug24.com/api/product';
const MODEL       = (args.find(a => a.startsWith('--model=')) || '').split('=')[1] || 'claude-haiku-4-5-20251001';
const LIMIT       = parseInt((args.find(a => a.startsWith('--limit=')) || '').split('=')[1] || '0', 10) || 0;

const THROTTLE_MS = 1500;
const MAX_IMAGES = 3;
const OUT_PATH = path.join(PROJECT_ROOT, 'content', 'tile-images.json');

function tagKey(link) {
    if (!link) return '';
    return link.split('?')[0].replace(/\/+$/, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchProductDetail(productLink) {
    const r = await fetch(`${PRODUCT_URL}?url=${encodeURIComponent(productLink)}&full=1`);
    if (!r.ok) {
        const txt = await r.text().catch(() => '');
        if (r.status === 400 && /unsupported url/i.test(txt)) {
            const e = new Error('unsupported source (e.g. kakobuy)');
            e.unsupportedSource = true;
            throw e;
        }
        throw new Error(`product API ${r.status}`);
    }
    return r.json();
}

function extractColorways(properties) {
    if (!Array.isArray(properties)) return [];
    const colorProp = properties.find(p =>
        Array.isArray(p.valuesList) && p.valuesList.some(v => v.picUrl)
    );
    if (!colorProp) return [];
    return colorProp.valuesList
        .filter(v => v.picUrl)
        .map(v => (v.valueName || '').trim())
        .filter(Boolean);
}

function gatherCandidateImages(detail) {
    const main = Array.isArray(detail.images) ? detail.images : [];
    const inHand = Array.isArray(detail.inHandImages) ? detail.inHandImages : [];
    const out = [];
    const seen = new Set();
    for (const u of [...main, ...inHand]) {
        if (!u || typeof u !== 'string' || !u.startsWith('http')) continue;
        if (seen.has(u)) continue;
        seen.add(u);
        out.push(u);
        if (out.length >= MAX_IMAGES) break;
    }
    return out;
}

async function askClaude(images, colorways, attempt = 1) {
    const content = [];
    images.forEach((url, i) => {
        content.push({ type: 'text', text: `Image ${i}:` });
        content.push({ type: 'image', source: { type: 'url', url } });
    });
    content.push({
        type: 'text',
        text: `This product comes in ${colorways.length} colorways: ${colorways.join(', ')}.

Pick which Image (if any) shows ALL of those colorways visible together — e.g. a lineup / family / "all colors" marketing photo where every colorway appears side by side.
Rules:
- Prefer the cleanest studio shot when multiple qualify.
- A photo of just one colorway does NOT count, even if it's well-styled.
- If no image shows all colorways together, return null.

Return ONLY JSON: {"index": <integer 0-${images.length - 1} or null>}
No explanation, no markdown.`
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 64,
            messages: [{ role: 'user', content }],
        }),
    });

    if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
        const waitMs = (retryAfter > 0 ? retryAfter : Math.min(60, 5 * attempt)) * 1000;
        console.log(`  ⏳ 429 — czekam ${Math.round(waitMs / 1000)}s (próba ${attempt})`);
        await sleep(waitMs);
        if (attempt > 6) throw new Error('rate limit po 6 próbach');
        return askClaude(images, colorways, attempt + 1);
    }

    if (!res.ok) {
        const txt = await res.text();
        if (/credit balance is too low/i.test(txt)) {
            const err = new Error('Anthropic credits exhausted');
            err.creditsExhausted = true;
            throw err;
        }
        throw new Error(`API ${res.status}: ${txt.slice(0, 300)}`);
    }

    const j = await res.json();
    const text = (j.content || []).map(c => c.text || '').join('').trim();
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`Parse fail: ${cleaned.slice(0, 200)}`);
    }
    const idx = parsed.index;
    if (idx === null || idx === undefined) return null;
    if (typeof idx !== 'number' || idx < 0 || idx >= images.length) return null;
    return idx;
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

    let store = { tiles: {} };
    if (fs.existsSync(OUT_PATH)) {
        try {
            store = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
            if (!store.tiles) store.tiles = {};
        } catch {
            store = { tiles: {} };
        }
    }

    const todo = products.filter(p => {
        const k = tagKey(p.link);
        if (!k) return false;
        if (FORCE) return true;
        if (RETRY_NULLS) return !(k in store.tiles) || store.tiles[k] === null;
        return !(k in store.tiles);
    });

    const queue = LIMIT > 0 ? todo.slice(0, LIMIT) : todo;
    const flags = [FORCE && 'FORCE', RETRY_NULLS && 'RETRY-NULLS', LIMIT && `limit ${LIMIT}`].filter(Boolean).join(', ');
    console.log(`🤖 Do sprawdzenia: ${queue.length}${flags ? ` (${flags})` : ''}`);
    if (!queue.length) {
        console.log('✓ Nic do roboty. Użyj --force żeby przeliczyć wszystko.');
        return;
    }

    const expectedAiCalls = Math.round(queue.length * 0.5);
    const estCostUsd = (expectedAiCalls * 0.005).toFixed(2);
    console.log(`💰 Szacunek: ~${expectedAiCalls} calli AI (zakładam ~50% to skipy <2 kolorystyk), ~$${estCostUsd} (Haiku 4.5 @ ${MAX_IMAGES} zdj/call)`);

    let processed = 0;
    let picked = 0;
    let skipped = 0;
    let failed = 0;

    for (const p of queue) {
        const k = tagKey(p.link);
        try {
            const detail = await fetchProductDetail(p.link);
            const colorways = extractColorways(detail.properties);

            if (colorways.length < 2) {
                store.tiles[k] = null;
                skipped++;
                processed++;
                if (processed % 10 === 0) flush(store);
                continue;
            }

            const images = gatherCandidateImages(detail);
            if (images.length < 2) {
                store.tiles[k] = null;
                skipped++;
                processed++;
                if (processed % 10 === 0) flush(store);
                continue;
            }

            const idx = await askClaude(images, colorways);
            const url = idx === null ? null : images[idx];
            store.tiles[k] = url;
            if (url) picked++;
            processed++;
            console.log(`  [${processed}/${queue.length}] ${url ? '🎯' : '—'} ${p.name.slice(0, 60)}`);
        } catch (e) {
            if (e.creditsExhausted) {
                flush(store);
                console.error(`\n💸 STOP — Anthropic credits exhausted at ${p.name?.slice(0, 60)}`);
                console.error(`   Doładuj na https://console.anthropic.com/settings/billing i odpal ponownie (bez --force wznowi od tego miejsca).`);
                console.error(`   Stan: picked=${picked}, skipped=${skipped}, failed=${failed}, processed=${processed}/${queue.length}`);
                console.error(`   Zapisane w ${OUT_PATH} (${Object.keys(store.tiles).length} wpisów łącznie)`);
                process.exit(2);
            }
            if (e.unsupportedSource) {
                store.tiles[k] = null;
                skipped++;
                processed++;
                if (processed % 10 === 0) flush(store);
                continue;
            }
            failed++;
            processed++;
            console.warn(`  ⚠ ${p.name?.slice(0, 60)}: ${e.message}`);
        }

        if (processed % 5 === 0) flush(store);
        await sleep(THROTTLE_MS);
    }

    flush(store);
    console.log(`✅ Gotowe: picked=${picked}, skipped=${skipped}, failed=${failed}, total=${processed}`);
    console.log(`   Zapisane w ${OUT_PATH} (${Object.keys(store.tiles).length} wpisów łącznie)`);
}

function flush(store) {
    fs.writeFileSync(OUT_PATH, JSON.stringify(store, null, 2));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
