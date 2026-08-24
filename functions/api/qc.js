function jsonError(message, status) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        // _headers puts max-age=300 on everything under /api/, which would park an
        // upstream failure in the visitor's browser for five minutes after it healed.
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
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

// qcitems gates its API on the call coming from their own pages: with no qcitems.com
// Referer (or Origin) every request answers 403 "Open this content through QCItems",
// which is why QC went blank site-wide. Keep this in step with product.js and
// visual-search.js, the other two callers.
const QCITEMS_HEADERS = {
    'User-Agent': UA,
    'Accept': 'application/json',
    'Referer': 'https://qcitems.com/',
    'Origin': 'https://qcitems.com'
};

// A source missing here is a source dropped: flattenGroups only walks this list.
const SOURCE_ORDER = ['kakobuy', 'cnfans', 'usfans', 'uufinds', 'oopbuy', 'acbuy'];
const SOURCE_LABEL = {
    kakobuy: 'KakoBuy',
    cnfans: 'CNFans',
    usfans: 'USFans',
    uufinds: 'UUfinds',
    oopbuy: 'Oopbuy',
    acbuy: 'ACBuy'
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

// Seller-category items are yupoo albums, and qcitems cannot make a product out of
// one. The album page links the marketplace item it mirrors, which is the same ref
// /api/product turns into the usfans buy link — resolve it here so seller items get
// the exact QC sets the rest of the catalogue gets.
const MARKETPLACE_URL = {
    weidian: id => `https://weidian.com/item.html?itemID=${id}`,
    taobao: id => `https://item.taobao.com/item.htm?id=${id}`,
    tmall: id => `https://detail.tmall.com/item.htm?id=${id}`,
    '1688': id => `https://detail.1688.com/offer/${id}.html`,
};

const AGENT_PLATFORM_TO_SOURCE = {
    WEIDIAN: 'weidian', TAOBAO: 'taobao', TMALL: 'tmall', '1688': '1688', ALIBABA: '1688',
};

function isYupooUrl(raw) {
    try { return /\.yupoo\.com$/i.test(new URL(raw).hostname); } catch { return false; }
}

// Same shapes /api/product accepts, kept in step with parseAgentUrl there.
function parseAgentUrl(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
        const u = new URL(raw);
        const host = u.hostname.toLowerCase();
        const numeric = v => (v && /^\d+$/.test(v) ? v : null);
        if (host === 'weidian.com' || host.endsWith('.weidian.com')) {
            const id = numeric(u.searchParams.get('itemID') || u.searchParams.get('itemId'));
            if (id) return { source: 'weidian', itemId: id };
        }
        if (host === 'taobao.com' || host.endsWith('.taobao.com')) {
            const id = numeric(u.searchParams.get('id'));
            if (id) return { source: 'taobao', itemId: id };
        }
        if (host === 'tmall.com' || host.endsWith('.tmall.com')) {
            const id = numeric(u.searchParams.get('id'));
            if (id) return { source: 'tmall', itemId: id };
        }
        if (host === '1688.com' || host.endsWith('.1688.com')) {
            const m = u.pathname.match(/\/offer\/(\d+)\.html/);
            if (m) return { source: '1688', itemId: m[1] };
        }
        const nested = u.searchParams.get('url');
        if (nested) {
            const inner = parseAgentUrl(nested);
            if (inner) return inner;
        }
        const platform = (u.searchParams.get('platform') || '').toUpperCase();
        const id = numeric(u.searchParams.get('id') || u.searchParams.get('itemId') || u.searchParams.get('itemID'));
        const source = AGENT_PLATFORM_TO_SOURCE[platform];
        if (source && id) return { source, itemId: id };
    } catch {}
    return null;
}

function extractAlbumItemRef(html) {
    if (!html) return null;
    const weidianM = html.match(/\bweidian\.com\/item\.html\?[^"'<>\s]*\bitem[Ii][Dd]=(\d+)/i);
    if (weidianM) return { source: 'weidian', itemId: weidianM[1] };
    const tmallM = html.match(/\b(?:detail\.)?tmall\.com\/item\.htm\?[^"'<>\s]*\bid=(\d+)/i);
    if (tmallM) return { source: 'tmall', itemId: tmallM[1] };
    const taobaoM = html.match(/\b(?:item\.|world\.|m\.)?taobao\.com\/item(?:\.htm|\.html)?\?[^"'<>\s]*\bid=(\d+)/i);
    if (taobaoM) return { source: 'taobao', itemId: taobaoM[1] };
    const e1688M = html.match(/\b(?:detail\.|world\.)?1688\.com\/offer\/(\d+)\.html/i);
    if (e1688M) return { source: '1688', itemId: e1688M[1] };

    // yupoo routes outbound links through /external?url=<encoded>, sometimes double-encoded.
    for (const m of html.matchAll(/\/external\?url=([^"&<>\s]+)/g)) {
        let decoded = m[1];
        for (let i = 0; i < 3 && /%/.test(decoded); i++) {
            try { decoded = decodeURIComponent(decoded); } catch { break; }
        }
        const ref = parseAgentUrl(decoded);
        if (ref) return ref;
    }
    return null;
}

async function resolveYupooAlbum(albumUrl) {
    let u;
    try { u = new URL(albumUrl); } catch { return null; }
    let r;
    try {
        r = await fetch(albumUrl, {
            headers: { 'User-Agent': UA, 'Referer': `https://${u.hostname}/albums` },
            cf: { cacheTtlByStatus: { '200-299': 3600, '300-599': 0 }, cacheEverything: true },
        });
    } catch { return null; }
    if (!r.ok) return null;

    let html;
    try { html = await r.text(); } catch { return null; }
    const ref = extractAlbumItemRef(html);
    const build = ref && MARKETPLACE_URL[ref.source];
    return build ? build(ref.itemId) : null;
}

function emptyPayload(resolvedUrl) {
    return {
        productId: null,
        marketplace: null,
        info: null,
        sets: [],
        totalPhotos: 0,
        sources: [],
        resolvedUrl: resolvedUrl || null,
    };
}

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url).searchParams.get('url');
    if (!url) return jsonError('missing url', 400);

    // Seller-category items arrive as yupoo album links. Swap in the marketplace item
    // the album points at — an album an agent cannot open has no QC to show, so answer
    // "no photos" rather than letting qcitems reject the link outright.
    let marketplaceUrl = toMarketplaceUrl(url);
    let albumResolvedUrl = null;
    if (isYupooUrl(url)) {
        albumResolvedUrl = await resolveYupooAlbum(url);
        if (!albumResolvedUrl) return jsonOk(emptyPayload(null));
        marketplaceUrl = albumResolvedUrl;
    }

    const target = `https://qcitems.com/api/product?url=${encodeURIComponent(marketplaceUrl)}`;

    let upstream;
    try {
        upstream = await fetch(target, {
            headers: QCITEMS_HEADERS,
            // Only cache what worked: cacheTtl pinned 403s and 5xx at the edge too, so
            // one bad minute upstream kept QC dark for ten more.
            cf: { cacheTtlByStatus: { '200-299': 600, '300-599': 0 }, cacheEverything: true }
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
        return jsonOk(emptyPayload(albumResolvedUrl));
    }

    const sets = flattenGroups(data?.qcGroups);
    const totalPhotos = sets.reduce((n, s) => n + s.photos.length, 0);

    return jsonOk({
        productId: data?.productId || null,
        marketplace: data?.marketplace || null,
        info: data?.info || null,
        sets,
        totalPhotos,
        sources: [...new Set(sets.map(s => s.sourceLabel))],
        // Only set for yupoo albums: the marketplace item the album mirrors, so the QC
        // page can offer an agent link for a URL no agent would accept.
        resolvedUrl: albumResolvedUrl,
    });
}
