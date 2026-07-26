function jsonError(message, status) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}

function jsonOk(body) {
    return new Response(JSON.stringify(body), {
        headers: {
            'content-type': 'application/json',
            'cache-control': 'public, max-age=600',
            'x-content-type-options': 'nosniff'
        }
    });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const SOURCE_ORDER = ['kakobuy', 'cnfans', 'usfans', 'uufinds', 'oopbuy'];
const SOURCE_LABEL = {
    kakobuy: 'KakoBuy',
    cnfans: 'CNFans',
    usfans: 'USFans',
    uufinds: 'UUfinds',
    oopbuy: 'Oopbuy'
};

function b64url(s) {
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function proxyImage(originalUrl) {
    return `/api/qcimg?u=${b64url(originalUrl)}`;
}

function normalizePhoto(p) {
    if (!p) return null;
    if (typeof p === 'string') return { url: proxyImage(p), timestamp: null };
    if (typeof p === 'object' && typeof p.url === 'string') {
        return { url: proxyImage(p.url), timestamp: p.timestamp || null };
    }
    return null;
}

function flattenGroups(qcGroups) {
    const sets = [];
    for (const source of SOURCE_ORDER) {
        const list = Array.isArray(qcGroups?.[source]) ? qcGroups[source] : [];
        list.forEach((entry, idx) => {
            const photos = (entry?.photos || [])
                .map(normalizePhoto)
                .filter(Boolean);
            if (!photos.length) return;
            sets.push({
                source,
                sourceLabel: SOURCE_LABEL[source] || source,
                name: entry?.name || `${SOURCE_LABEL[source] || source} #${idx + 1}`,
                photos
            });
        });
    }
    return sets;
}

// qcitems only resolves raw marketplace URLs — it answers 400 for an agent link.
// Almost everything reaching this endpoint is an agent link: the sheet stores usfans
// URLs, so the product page and the "quality check" button both hand one over, and
// visitors paste whatever the site gave them. Unwrap first.
// usfans channels, from their own bundle: 1 = 1688, 2 = taobao, 3 = weidian.
const USFANS_CHANNEL_URL = {
    '1': id => `https://detail.1688.com/offer/${id}.html`,
    '2': id => `https://item.taobao.com/item.htm?id=${id}`,
    '3': id => `https://weidian.com/item.html?itemID=${id}`,
};

function toMarketplaceUrl(raw) {
    let u;
    try { u = new URL(raw); } catch { return raw; }

    if (/(^|\.)usfans\.com$/i.test(u.hostname)) {
        const m = u.pathname.match(/\/product\/(\d+)\/([0-9a-zA-Z]+)/);
        const build = m && USFANS_CHANNEL_URL[m[1]];
        if (build) return build(m[2]);
        return raw;
    }

    // kakobuy and the other agents that carry the marketplace URL in ?url=
    const inner = u.searchParams.get('url');
    if (inner && /^https?:\/\//i.test(inner)) return inner;

    return raw;
}

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url).searchParams.get('url');
    if (!url) return jsonError('missing url', 400);

    const target = `https://qcitems.com/api/product?url=${encodeURIComponent(toMarketplaceUrl(url))}`;

    let upstream;
    try {
        upstream = await fetch(target, {
            headers: { 'User-Agent': UA, 'Accept': 'application/json' },
            cf: { cacheTtl: 600, cacheEverything: true }
        });
    } catch {
        return jsonError('upstream fetch failed', 502);
    }
    // A 400 means qcitems could not make a product out of the link (yupoo albums,
    // shop pages, agents it does not know). That is a rejected link, not an outage —
    // say so, instead of the generic "failed to load, try another link".
    if (upstream.status === 400) return jsonError('unsupported', 400);
    if (!upstream.ok) return jsonError('upstream error', 502);

    let data;
    try { data = await upstream.json(); }
    catch { return jsonError('upstream parse failed', 502); }

    if (data?.error) return jsonError(data.error, 400);

    // For links it cannot resolve to a marketplace product (yupoo albums, seller shop
    // pages) qcitems answers productId "0" / marketplace "unknown" plus a generic
    // photo bucket under finds/0/ that is identical for every such link. Serving it
    // would show one random product's QC on every seller item.
    const productId = data?.productId;
    if (!productId || String(productId) === '0' || data?.marketplace === 'unknown') {
        return jsonOk({
            productId: null,
            marketplace: null,
            info: null,
            sets: [],
            totalPhotos: 0,
            sources: []
        });
    }

    const sets = flattenGroups(data?.qcGroups);
    const totalPhotos = sets.reduce((n, s) => n + s.photos.length, 0);

    return jsonOk({
        productId: data?.productId || null,
        marketplace: data?.marketplace || null,
        info: data?.info || null,
        sets,
        totalPhotos,
        sources: [...new Set(sets.map(s => s.sourceLabel))]
    });
}
