import { kakobuyEnabled, kakobuyItem, kakobuyQcGroups } from './_kakobuy.js';

function jsonError(message, status) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        // _headers puts max-age=300 on everything under /api/, which would park an
        // upstream failure in the visitor's browser for five minutes after it healed.
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
}

function jsonOk(body, { store = true } = {}) {
    return new Response(JSON.stringify(body), {
        headers: {
            'content-type': 'application/json',
            // An outage answers 200 as well (see onRequest), and parking that for ten
            // minutes would keep QC dark long after the host came back.
            'cache-control': store ? 'public, max-age=600' : 'no-store',
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
    // `origin` is dropped before the payload leaves onRequest; it is only here so the
    // reachability check below can ask the real host rather than our own proxy.
    if (typeof p === 'string') return { url: proxyImage(p), origin: p, timestamp: null };
    if (typeof p === 'object' && typeof p.url === 'string') {
        return { url: proxyImage(p.url), origin: p.url, timestamp: p.timestamp || null };
    }
    return null;
}

function photoHost(photo) {
    try { return new URL(photo.origin).hostname.toLowerCase(); } catch { return null; }
}

// qcitems keeps every photo it has ever scraped on its own R2 bucket, and in September
// 2026 that bucket stopped being public: cdn.finds.vectoreps.pl answers 403 "This
// bucket cannot be viewed" to everyone, their own site included. Their API still hands
// out those URLs, so a product looks like it has 161 QC photos and the page fills with
// broken tiles. Sample one photo per host and drop the sets we cannot actually serve —
// nothing is hardcoded, so the sets come back by themselves once the host does.
async function reachableSets(sets) {
    const sample = new Map();
    for (const set of sets) {
        for (const photo of set.photos) {
            const host = photoHost(photo);
            if (host && !sample.has(host)) sample.set(host, photo.origin);
        }
    }
    const checks = await Promise.all(
        [...sample].map(async ([host, url]) => [host, await hostServesImages(url)])
    );
    const alive = new Set(checks.filter(([, ok]) => ok).map(([host]) => host));

    return sets
        .map(set => ({ ...set, photos: set.photos.filter(p => alive.has(photoHost(p))) }))
        .filter(set => set.photos.length);
}

async function hostServesImages(sampleUrl) {
    let u;
    try { u = new URL(sampleUrl); } catch { return false; }
    const headers = { 'User-Agent': UA, 'Accept': 'image/*' };
    if (/\.yupoo\.com$/i.test(u.hostname)) headers['Referer'] = `https://${u.hostname}/`;

    let r;
    try { r = await fetch(sampleUrl, { method: 'HEAD', headers }); }
    catch { return false; }
    // Not every CDN answers HEAD; only a refusal counts as down.
    if (r.status === 405 || r.status === 501) return true;
    return r.ok;
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

function emptyPayload(resolvedUrl, extra) {
    return {
        productId: null,
        marketplace: null,
        info: null,
        sets: [],
        totalPhotos: 0,
        sources: [],
        resolvedUrl: resolvedUrl || null,
        ...extra,
    };
}

// usfans hands out the QC photos its own warehouse took, through the endpoint that
// estimates shipping — no login, no signature, no points. Two thirds of the weidian
// catalogue has a set (measured: 19 of 30 sampled items, 4-6 photos each), the photos
// sit on media.usfans.com, which stayed up through the September qcitems outage, and
// the same answer carries the measured weight and box size — better shipping data than
// anything qcitems returns.
const USFANS_QC_HEADERS = {
    'User-Agent': UA,
    'Accept': 'application/json',
    'Referer': 'https://usfans.com/'
};

function weidianItemId(marketplaceUrl) {
    try {
        const u = new URL(marketplaceUrl);
        const h = u.hostname.toLowerCase();
        if (h !== 'weidian.com' && !h.endsWith('.weidian.com')) return null;
        // Shops that sell by offerId keep it in goodsId upstream too, so either id works.
        const id = u.searchParams.get('itemID') || u.searchParams.get('itemId') || u.searchParams.get('offerId');
        return id && /^\d+$/.test(id) ? id : null;
    } catch { return null; }
}

// media.usfans.com is Alibaba OSS and the frames are ~4 MB each — twenty of those is a
// 90 MB page. Ask OSS for the width we are about to draw: 4.4 MB drops to 85 KB for a
// tile and 800 KB for the lightbox, which is still more detail than a screen shows.
function ossWidth(url, width) {
    return `${url}${url.includes('?') ? '&' : '?'}x-oss-process=image/resize,w_${width}`;
}

// The path carries the day the warehouse shot it: /2026/08/29/163539/uuid.jpg.
function usfansPhotoDate(url) {
    const m = url.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function usfansPhoto(raw) {
    if (typeof raw !== 'string' || !/^https:\/\//i.test(raw)) return null;
    return {
        url: proxyImage(ossWidth(raw, 1600)),
        thumb: proxyImage(ossWidth(raw, 400)),
        origin: raw,
        timestamp: usfansPhotoDate(raw)
    };
}

function usfansInfo(d) {
    const out = {};
    for (const key of ['weight', 'length', 'width', 'height', 'avgArrivalDays']) {
        const v = d?.[key];
        if (typeof v === 'number' && v > 0) out[key] = v;
    }
    return Object.keys(out).length ? out : null;
}

async function usfansSets(marketplaceUrl) {
    const itemId = weidianItemId(marketplaceUrl);
    if (!itemId) return { sets: [], info: null, itemId: null, answered: true };

    const miss = { sets: [], info: null, itemId, answered: false };
    let r;
    try {
        r = await fetch(`https://usfans.com/api/goods/estimate-info?channel=3&goodsId=${itemId}`, {
            headers: USFANS_QC_HEADERS,
            cf: { cacheTtlByStatus: { '200-299': 600, '300-599': 0 }, cacheEverything: true }
        });
    } catch { return miss; }
    // usfans turns away a large share of what the Cloudflare edge sends it, answering
    // 503 with their own block page. Nothing to be done from here — report that we got
    // no answer and let the page ask again from the visitor's own address, which their
    // CORS allows by name.
    if (!r.ok) return miss;

    let data;
    try { data = await r.json(); } catch { return miss; }
    if (data?.code !== 200 || !data?.data) return miss;

    const photos = (Array.isArray(data.data.qcImages) ? data.data.qcImages : [])
        .map(usfansPhoto)
        .filter(Boolean);

    return {
        sets: photos.length
            ? [{ source: 'usfans', sourceLabel: SOURCE_LABEL.usfans, name: `${SOURCE_LABEL.usfans} QC`, photos }]
            : [],
        info: usfansInfo(data.data),
        itemId,
        answered: true
    };
}

// usfans measured the item; qcitems reports what it scraped. Where both speak, the
// measurement wins — the weight qcitems returns has been wrong often enough to throw
// off the shipping estimate.
function mergeInfo(qciInfo, usfInfo) {
    if (!qciInfo && !usfInfo) return null;
    return { ...(qciInfo || {}), ...(usfInfo || {}) };
}

// The owner buys taobao and 1688 through kakobuy, so for those we ask kakobuy for the
// QC first and let qcitems fill in around it. Dormant as it stands: their item
// endpoint answers 500 to anything that is not their own site — from the edge, with or
// without a session, for weidian as much as taobao — while their lighter endpoints
// answer us fine. Their item pages carry no QC photos anyway, and qcitems mirrors the
// KakoBuy sets that do exist, so nothing is missing while this waits. If they ever
// serve us, this starts working on its own; if they never do, it costs one failed
// subrequest per taobao QC lookup, made alongside qcitems rather than before it.
const KAKOBUY_MARKETPLACES = new Set(['taobao', 'tmall', '1688']);

function marketplaceSourceOf(raw) {
    try {
        const h = new URL(raw).hostname.toLowerCase();
        if (h === 'taobao.com' || h.endsWith('.taobao.com')) return 'taobao';
        if (h === 'tmall.com' || h.endsWith('.tmall.com')) return 'tmall';
        if (h === '1688.com' || h.endsWith('.1688.com')) return '1688';
        if (h === 'weidian.com' || h.endsWith('.weidian.com')) return 'weidian';
    } catch {}
    return null;
}

async function kakobuySets(env, marketplaceUrl) {
    const res = await kakobuyItem(env, marketplaceUrl);
    if (!res.ok) return { sets: [], info: null, msg: res.msg };

    const item = res.data || {};
    const sets = kakobuyQcGroups(item).map((g, i) => ({
        source: 'kakobuy',
        sourceLabel: SOURCE_LABEL.kakobuy,
        name: `${SOURCE_LABEL.kakobuy} QC #${i + 1}`,
        photos: g.photos.map(normalizePhoto).filter(Boolean)
    })).filter(set => set.photos.length);

    return { sets, info: item, msg: null };
}

// qcitems, unchanged in what it returns — it just no longer answers for the whole
// endpoint, since kakobuy can have photos when qcitems has none, which is the normal
// state of affairs for taobao while their upstream is down.
async function qcitemsSets(marketplaceUrl) {
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
        return { sets: [], info: null, error: 'upstream fetch failed', status: 502 };
    }
    // A 400 means qcitems could not make a product out of the link (yupoo albums,
    // shop pages, agents it does not know). That is a rejected link, not an outage.
    if (upstream.status === 400) return { sets: [], info: null, error: 'unsupported', status: 400 };
    if (!upstream.ok) return { sets: [], info: null, error: 'upstream error', status: 502 };

    let data;
    try { data = await upstream.json(); }
    catch { return { sets: [], info: null, error: 'upstream parse failed', status: 502 }; }

    if (data?.error) return { sets: [], info: null, error: data.error, status: 400 };

    // For links it cannot resolve to a marketplace product (yupoo albums, seller shop
    // pages) qcitems answers productId "0" / marketplace "unknown" plus a generic
    // photo bucket under finds/0/ that is identical for every such link. Serving it
    // would show one random product QC set on every seller item.
    const productId = data?.productId;
    if (!productId || String(productId) === '0' || data?.marketplace === 'unknown') {
        return { sets: [], info: null, error: null, status: 200 };
    }

    return {
        sets: flattenGroups(data?.qcGroups),
        info: data?.info || null,
        productId: data?.productId || null,
        marketplace: data?.marketplace || null,
        error: null,
        status: 200
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

    const source = marketplaceSourceOf(marketplaceUrl);
    const askKakobuy = KAKOBUY_MARKETPLACES.has(source) && kakobuyEnabled(ctx.env);

    // Temporary: reports whether the kakobuy token works and what shape came back,
    // without echoing any of it. Their API is undocumented and a stale token looks
    // exactly like "this item has no QC" from the outside.
    // Both at once: kakobuy is the source we want for taobao and 1688, but qcitems
    // still carries the other agents' sets, and either one can come back empty.
    const [kako, qci, usf] = await Promise.all([
        askKakobuy ? kakobuySets(ctx.env, marketplaceUrl) : Promise.resolve({ sets: [], info: null, msg: null }),
        qcitemsSets(marketplaceUrl),
        usfansSets(marketplaceUrl)
    ]);

    // Photos we fetched ourselves stand in for the copies qcitems mirrors from the same
    // agent, so nobody scrolls the same set twice. kakobuy goes by source, since their
    // photos carry different URLs upstream; usfans goes by URL, because their sets and
    // ours are literally the same files on media.usfans.com — matching on source alone
    // would throw away the shots from other buyers' orders that qcitems does have.
    const mine = new Set(usf.sets.flatMap(set => set.photos.map(p => p.origin)));
    const qciSets = qci.sets
        .filter(set => !(kako.sets.length && set.source === 'kakobuy'))
        .map(set => ({ ...set, photos: set.photos.filter(p => !mine.has(p.origin)) }))
        .filter(set => set.photos.length);

    // Ours first: they are the item this shop actually sends people to buy, and they
    // are the ones still standing when qcitems is down.
    const sets = [...kako.sets, ...usf.sets, ...qciSets];

    // Told to the page so it can ask usfans itself when the edge got turned away.
    const usfansHint = { usfansItemId: usf.itemId, usfansPending: !usf.answered };

    // Only let a qcitems failure speak when it is the whole story. An outage there is
    // not a rejected link: when their backend is down every /api path answers 502,
    // ours included, and a 5xx of ours never reaches the browser intact — Cloudflare
    // swaps it for its own error page, the JSON parse fails and the visitor is told to
    // try another link over a link that was fine. Only a 4xx means the link itself.
    if (!sets.length && qci.error && qci.status >= 500) {
        return jsonOk(emptyPayload(albumResolvedUrl, { unavailable: true, ...usfansHint }), { store: false });
    }
    // A link qcitems rejects can still be one usfans knows, so only let the error stand
    // when we have nothing else to offer and nothing else to try.
    if (!sets.length && qci.error && !usfansHint.usfansPending) return jsonError(qci.error, qci.status);
    if (!sets.length) return jsonOk(emptyPayload(albumResolvedUrl, usfansHint), { store: !usfansHint.usfansPending });

    const live = (await reachableSets(sets)).map(set => ({
        ...set,
        photos: set.photos.map(({ url, thumb, timestamp }) => ({ url, thumb, timestamp }))
    }));
    // There are photos, we just cannot serve any of them today. Say so instead of
    // claiming the product has no QC.
    if (!live.length) return jsonOk(emptyPayload(albumResolvedUrl, { unavailable: true, ...usfansHint }), { store: false });

    const totalPhotos = live.reduce((n, s) => n + s.photos.length, 0);

    return jsonOk({
        productId: qci.productId || null,
        marketplace: qci.marketplace || source || null,
        info: mergeInfo(qci.info, usf.info),
        sets: live,
        ...usfansHint,
        totalPhotos,
        sources: [...new Set(live.map(s => s.sourceLabel))],
        // Only set for yupoo albums: the marketplace item the album mirrors, so the QC
        // page can offer an agent link for a URL no agent would accept.
        resolvedUrl: albumResolvedUrl,
    });
}
