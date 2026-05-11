const SHEET_IDS = {
    men:   '1pc2KcMDWELMeQUW_ZvjHEvDa56inb3IcoHJ9STyGVkk',
    women: '1TraN-QZhqFgzaCSKgfqWhIG0BHSBq0jyktaU7i_pjco',
};

const BATCH_TOKEN_RE = /\b(LJR|BD|DG|PK|UA|OG|MAS|GD|REP|GP|G5|H12|TS|OWF|HC|BATCH)\b/gi;

function normalizeNameKey(name) {
    return (name || '')
        .toLowerCase()
        .replace(BATCH_TOKEN_RE, '')
        .replace(/[^a-z0-9 ]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripBatchFromName(name) {
    return (name || '')
        .replace(BATCH_TOKEN_RE, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.])/g, '$1')
        .trim()
        .replace(/[\s,;:-]+$/, '');
}

function groupByImageOrLink(products) {
    const groups = new Map();
    let solo = 0;
    for (const p of products) {
        const img = (p.image || '').trim();
        const link = (p.link || '').trim();
        const key = img || link || `__solo_${solo++}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
    }
    const merged = [];
    for (const group of groups.values()) {
        if (group.length === 1) {
            merged.push(group[0]);
            continue;
        }
        const rep = group.find(p => p.image) || group[0];
        merged.push({ ...rep, name: stripBatchFromName(rep.name), batch: '' });
    }
    return merged;
}

function dedupByLink(products) {
    const seen = new Map();
    let solo = 0;
    for (const p of products) {
        const link = (p.link || '').trim();
        if (!link) {
            seen.set(`__solo_${solo++}`, p);
            continue;
        }
        const existing = seen.get(link);
        if (!existing) {
            seen.set(link, p);
        } else if (!existing.image && p.image) {
            seen.set(link, p);
        }
    }
    return Array.from(seen.values());
}

function dedupByName(products) {
    const seen = new Map();
    let solo = 0;
    const score = x => (x.imageOverride ? 8 : 0) + (x.tileImage ? 4 : 0) + (x.image ? 2 : 0) + (x.budgetLink ? 1 : 0);
    for (const p of products) {
        const key = normalizeNameKey(p.name);
        if (!key) {
            seen.set(`__solo_${solo++}`, p);
            continue;
        }
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, p);
            continue;
        }
        const better = score(p) > score(existing) ? p : existing;
        seen.set(key, {
            ...better,
            image: better.image || existing.image || p.image,
            imageOverride: better.imageOverride || existing.imageOverride || p.imageOverride,
            tileImage: better.tileImage || existing.tileImage || p.tileImage,
            budgetLink: better.budgetLink || existing.budgetLink || p.budgetLink,
            name: stripBatchFromName(better.name),
            batch: '',
        });
    }
    return Array.from(seen.values());
}

function normalizeRef(url) {
    if (!url) return url;
    try {
        const u = new URL(url);
        u.searchParams.delete('ref');
        u.searchParams.set('ref', 'MGRSBE');
        return u.toString();
    } catch { return url; }
}

function cleanCellError(s) {
    if (!s) return s;
    if (/^#(REF|N\/A|ERROR|VALUE|NAME)!/i.test(String(s).trim())) return '';
    return s;
}

function compact(p) {
    const out = {
        name: p.name,
        link: p.link,
    };
    if (p.batch) out.batch = p.batch;
    if (p.price) out.price = p.price;
    if (p.image) out.image = p.image;
    if (p.description) out.description = p.description;
    if (p.budgetLink) out.budgetLink = p.budgetLink;
    if (p.categoryOverride) out.categoryOverride = p.categoryOverride;
    if (p.brandOverride) out.brandOverride = p.brandOverride;
    if (p.modelOverride) out.modelOverride = p.modelOverride;
    if (p.imageOverride) out.imageOverride = p.imageOverride;
    if (p.tileImage) out.tileImage = p.tileImage;
    return out;
}

export async function onRequest(ctx) {
    const apiKey = ctx.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return new Response('Brak GOOGLE_API_KEY w env', { status: 500 });
    }

    const genderParam = new URL(ctx.request.url).searchParams.get('gender');
    const gender = genderParam === 'women' ? 'women' : 'men';
    const sheetId = SHEET_IDS[gender];
    const hasHeaderRow = gender !== 'women';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}` +
        `?fields=sheets.data.rowData.values(formattedValue,hyperlink)` +
        `&includeGridData=true&key=${apiKey}`;

    const r = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) {
        return new Response(`Sheets API error: ${r.status}`, { status: 502 });
    }
    const json = await r.json();

    const rows = json?.sheets?.[0]?.data?.[0]?.rowData ?? [];
    const products = [];
    let isHeader = hasHeaderRow;

    for (const row of rows) {
        const cells = row.values ?? [];
        if (isHeader) { isHeader = false; continue; }
        const get = (i) => cells[i] || {};
        const name = (get(0).formattedValue || '').trim();
        if (!name) continue;

        const link = get(2).hyperlink || null;
        if (!link) continue;

        products.push({
            name,
            batch:       (get(1).formattedValue || '').trim(),
            link:        normalizeRef(link),
            price:       (get(3).formattedValue || '').trim(),
            image:       cleanCellError(get(4).hyperlink || (get(4).formattedValue || '').trim()) || '',
            description: (get(5).formattedValue || '').trim(),
            budgetLink:  normalizeRef(get(6).hyperlink) || null,
            categoryOverride: (get(7).formattedValue || '').trim() || null,
            brandOverride:    (get(8).formattedValue || '').trim() || null,
            modelOverride:    (get(9).formattedValue || '').trim() || null,
            imageOverride:    cleanCellError(get(10).hyperlink || (get(10).formattedValue || '').trim()) || null,
            tileImage:        cleanCellError(get(11).hyperlink || (get(11).formattedValue || '').trim()) || null,
        });
    }

    const deduped = dedupByLink(groupByImageOrLink(products)).map(compact);

    return new Response(JSON.stringify(deduped), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=900',
        }
    });
}
