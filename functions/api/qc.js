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
            'cache-control': 'public, max-age=600'
        }
    });
}

const PLATFORM_WEIDIAN = 3;
const PLATFORM_TAOBAO = 1;
const PLATFORM_ALIBABA = 2;

function fromWeidian(u) {
    const id = u.searchParams.get('itemID') || u.searchParams.get('itemId');
    return id ? { platform: PLATFORM_WEIDIAN, itemId: id } : null;
}

function fromTaobao(u) {
    const id = u.searchParams.get('id');
    return id ? { platform: PLATFORM_TAOBAO, itemId: id } : null;
}

function fromAlibaba(u) {
    const m = u.pathname.match(/(\d+)\.html/);
    return m ? { platform: PLATFORM_ALIBABA, itemId: m[1] } : null;
}

function fromUsfans(u) {
    const m = u.pathname.match(/\/product\/(\d+)\/([0-9a-zA-Z]+)/);
    if (!m) return null;
    return { platform: parseInt(m[1], 10), itemId: m[2] };
}

function extractIdent(rawUrl, depth = 0) {
    if (depth > 2 || !rawUrl) return null;
    let u;
    try { u = new URL(rawUrl); } catch { return null; }
    const host = u.hostname.toLowerCase();

    if (host === 'weidian.com' || host.endsWith('.weidian.com')) return fromWeidian(u);
    if (host.endsWith('taobao.com') || host.endsWith('tmall.com')) return fromTaobao(u);
    if (host.endsWith('1688.com')) return fromAlibaba(u);
    if (host.endsWith('usfans.com')) return fromUsfans(u);

    const inner = u.searchParams.get('url')
        || u.searchParams.get('itemUrl')
        || u.searchParams.get('shop_type')
        || u.searchParams.get('shoplink')
        || u.searchParams.get('shop_link');
    if (inner && /^https?:\/\//i.test(inner)) {
        return extractIdent(inner, depth + 1);
    }

    const idParam = u.searchParams.get('itemId') || u.searchParams.get('goodsId') || u.searchParams.get('id');
    const platformParam = u.searchParams.get('platform') || u.searchParams.get('shopType') || u.searchParams.get('shop_type');
    if (idParam && platformParam) {
        const p = parseInt(platformParam, 10);
        if (p >= 1 && p <= 3) return { platform: p, itemId: idParam };
    }

    return null;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

async function tryFetchJson(url, opts = {}) {
    try {
        const r = await fetch(url, {
            headers: { 'User-Agent': UA, 'Accept': 'application/json,*/*', ...(opts.headers || {}) },
            cf: { cacheTtl: 600, cacheEverything: true }
        });
        if (!r.ok) return null;
        const text = await r.text();
        try { return JSON.parse(text); } catch { return null; }
    } catch { return null; }
}

function deepCollectImages(node, out, seen) {
    if (!node) return;
    if (typeof node === 'string') {
        if (/^https?:\/\/[^\s"']+\.(jpe?g|png|webp|gif)/i.test(node) && !seen.has(node)) {
            seen.add(node);
            out.push(node);
        }
        return;
    }
    if (Array.isArray(node)) {
        for (const v of node) deepCollectImages(v, out, seen);
        return;
    }
    if (typeof node === 'object') {
        for (const k of Object.keys(node)) deepCollectImages(node[k], out, seen);
    }
}

async function fromKakobuy({ platform, itemId }) {
    const tries = [
        `https://www.kakobuy.com/Service/Qcimg/get?goodsId=${encodeURIComponent(itemId)}&platform=${platform}`,
        `https://www.kakobuy.com/Service/QualityControl/index?goodsId=${encodeURIComponent(itemId)}&platform=${platform}`,
    ];
    for (const url of tries) {
        const j = await tryFetchJson(url);
        if (!j) continue;
        const out = [];
        const seen = new Set();
        deepCollectImages(j, out, seen);
        if (out.length) return { name: 'KakoBuy', images: out };
    }
    return null;
}

async function fromAllchinabuy({ platform, itemId }) {
    const url = `https://www.allchinabuy.com/front/cnTrade/qcImage/list?platformType=${platform}&goodsNumber=${encodeURIComponent(itemId)}`;
    const j = await tryFetchJson(url);
    if (!j) return null;
    const out = [];
    const seen = new Set();
    deepCollectImages(j, out, seen);
    return out.length ? { name: 'AllChinaBuy', images: out } : null;
}

async function fromSugargoo({ platform, itemId }) {
    const tries = [
        `https://www.sugargoo.com/api/v2/qcImage/getQcImage?platform=${platform}&goodsId=${encodeURIComponent(itemId)}`,
        `https://www.sugargoo.com/front/qualityControl/list?goodsId=${encodeURIComponent(itemId)}&platformType=${platform}`,
    ];
    for (const url of tries) {
        const j = await tryFetchJson(url);
        if (!j) continue;
        const out = [];
        const seen = new Set();
        deepCollectImages(j, out, seen);
        if (out.length) return { name: 'Sugargoo', images: out };
    }
    return null;
}

async function fromCssbuy({ platform, itemId }) {
    if (platform !== PLATFORM_TAOBAO) return null;
    const url = `https://www.cssbuy.com/Service/QcImglist?ItemID=${encodeURIComponent(itemId)}`;
    const j = await tryFetchJson(url);
    if (!j) return null;
    const out = [];
    const seen = new Set();
    deepCollectImages(j, out, seen);
    return out.length ? { name: 'CSSBuy', images: out } : null;
}

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url).searchParams.get('url');
    if (!url) return jsonError('missing url', 400);

    const ident = extractIdent(url);
    if (!ident || !ident.itemId || !ident.platform) {
        return jsonError('unsupported', 400);
    }

    const providers = [fromKakobuy, fromAllchinabuy, fromSugargoo, fromCssbuy];
    const results = await Promise.all(providers.map(fn => fn(ident).catch(() => null)));

    const all = [];
    const seen = new Set();
    const sources = [];
    for (const res of results) {
        if (!res || !res.images || !res.images.length) continue;
        sources.push(res.name);
        for (const img of res.images) {
            if (!seen.has(img)) {
                seen.add(img);
                all.push(img);
            }
        }
    }

    return jsonOk({
        platform: ident.platform,
        itemId: ident.itemId,
        sources,
        images: all
    });
}
