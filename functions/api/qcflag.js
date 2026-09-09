import { toMarketplaceUrl, weidianItemId, resolveYupooAlbum, USFANS_QC_HEADERS, QCITEMS_HEADERS } from './qc.js';

// Does this item have QC photos at all? The catalogue asks once per tile it shows, so
// the answer has to be small and it has to cache: whether a warehouse has photographed
// an item changes over days, not minutes, and after the first visitor warms an item
// every other one is served from the edge without touching an upstream.
//
// Deliberately not /api/qc with a flag: that call builds the whole gallery, proxies
// every URL and reaches for kakobuy as well. Here one usfans call usually settles it.
const DAY = 86400;

function answer(qc, maxAge) {
    return new Response(JSON.stringify({ qc }), {
        headers: {
            'content-type': 'application/json',
            // A day for a real answer. When we could not find out — usfans turns away a
            // good share of what the edge sends them — say nothing and cache nothing,
            // or one refusal would hide the badge for a day.
            'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
            'x-content-type-options': 'nosniff'
        }
    });
}

async function usfansCount(marketplaceUrl) {
    const itemId = weidianItemId(marketplaceUrl);
    if (!itemId) return null;

    let r;
    try {
        r = await fetch(`https://usfans.com/api/goods/estimate-info?channel=3&goodsId=${itemId}`, {
            headers: USFANS_QC_HEADERS,
            cf: { cacheTtlByStatus: { '200-299': 86400, '300-599': 0 }, cacheEverything: true }
        });
    } catch { return null; }
    if (!r.ok) return null;

    let data;
    try { data = await r.json(); } catch { return null; }
    if (data?.code !== 200 || !data?.data) return null;

    return Array.isArray(data.data.qcImages) ? data.data.qcImages.length : 0;
}

// Only asked when usfans has nothing, since it is the slower and less reliable of the
// two and its answer carries the entire gallery just to be counted.
async function qcitemsHasPhotos(marketplaceUrl) {
    let r;
    try {
        r = await fetch(`https://qcitems.com/api/product?url=${encodeURIComponent(marketplaceUrl)}`, {
            headers: QCITEMS_HEADERS,
            cf: { cacheTtlByStatus: { '200-299': 86400, '300-599': 0 }, cacheEverything: true }
        });
    } catch { return null; }
    if (!r.ok) return null;

    let data;
    try { data = await r.json(); } catch { return null; }
    // The generic bucket they hand out for links they cannot resolve. Same photos for
    // every such link, so a badge from it would be a lie on every seller item.
    const productId = data?.productId;
    if (!productId || String(productId) === '0' || data?.marketplace === 'unknown') return 0;

    const groups = data?.qcGroups || {};
    let n = 0;
    for (const list of Object.values(groups)) {
        if (!Array.isArray(list)) continue;
        for (const entry of list) n += (entry?.photos || []).length;
    }
    return n;
}

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url).searchParams.get('url');
    if (!url) return answer(null, 0);

    // A seller tile links to a yupoo album, and an album is not something any QC source
    // can look up — but it names the marketplace item it mirrors, which is. That
    // resolution costs a page fetch, so it only happens for tiles someone is looking
    // at, and the answer is cached like any other.
    let marketplaceUrl;
    if (/\.yupoo\.com\//i.test(url)) {
        marketplaceUrl = await resolveYupooAlbum(url);
        // Either the album carries no marketplace link — plenty do not — or yupoo was
        // unreachable. An hour is long enough to stop us re-reading the same album on
        // every scroll, short enough that a bad minute at yupoo does not stick.
        if (!marketplaceUrl) return answer(0, 3600);
    } else {
        marketplaceUrl = toMarketplaceUrl(url);
    }

    const usfans = await usfansCount(marketplaceUrl);
    if (usfans) return answer(usfans, DAY);

    const qcitems = await qcitemsHasPhotos(marketplaceUrl);
    if (qcitems) return answer(qcitems, DAY);

    // "No photos" is only worth a full day when both sources actually said so. With
    // qcitems down, usfans alone saying none would otherwise pin an empty answer for a
    // day on every item whose QC only qcitems carries — hold it for an hour instead.
    if (usfans === 0 && qcitems === 0) return answer(0, DAY);
    if (usfans === 0 || qcitems === 0) return answer(0, 3600);
    return answer(null, 0);
}
