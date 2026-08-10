function parseUsfans(rawUrl) {
    try {
        const u = new URL(rawUrl);
        if (!/usfans\.com$/i.test(u.hostname)) return null;
        const m = u.pathname.match(/\/product\/(\d+)\/([0-9a-zA-Z]+)/);
        if (!m) return null;
        return { channel: m[1], goodsId: m[2] };
    } catch { return null; }
}

function parseKakobuy(rawUrl) {
    try {
        const u = new URL(rawUrl);
        if (!/kakobuy\.com$/i.test(u.hostname)) return null;
        const inner = u.searchParams.get('url');
        if (!inner) return null;
        const innerU = new URL(inner);
        if (/(^|\.)weidian\.com$/i.test(innerU.hostname)) {
            const itemId = innerU.searchParams.get('itemID') || innerU.searchParams.get('itemId');
            if (itemId) return { source: 'weidian', itemId };
        }
        return null;
    } catch { return null; }
}

function decodeEntities(s) {
    return s
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

async function fetchWeidianRocker(itemId) {
    const r = await fetch(`https://weidian.com/item.html?itemID=${encodeURIComponent(itemId)}`, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 RePluG-Bot' },
        cf: { cacheTtl: 3600, cacheEverything: true }
    });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/id="__rocker-render-inject__"\s+data-obj="([^"]+)"/);
    if (!m) return null;
    try {
        return JSON.parse(decodeEntities(m[1]));
    } catch {
        return null;
    }
}

const CNY_PER_USD = 7.2;

function usdFromCny(cny) {
    const n = typeof cny === 'string' ? parseFloat(cny) : cny;
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
    return Math.round((n / CNY_PER_USD) * 100) / 100;
}

function shapeWeidian(j, full) {
    const info = j?.result?.default_model?.item_info || {};
    const skuProp = j?.result?.default_model?.sku_properties || {};
    const shop = j?.result?.default_model?.shop_info || {};
    const attr_list = Array.isArray(skuProp.attr_list) ? skuProp.attr_list : [];
    const skuMap = skuProp.sku && typeof skuProp.sku === 'object' ? skuProp.sku : {};

    const images = Array.isArray(info.imgs) ? info.imgs.slice(0, 8) : [];

    const skuImagesSet = new Set();
    for (const a of attr_list) {
        for (const v of (a.attr_values || [])) if (v.img) skuImagesSet.add(v.img);
    }
    const skuImages = [...skuImagesSet].slice(0, 12);

    // itemLowPrice is in fen (14000 == ¥140), sku.price is a yuan string ("140.00").
    let priceUsd = null;
    if (typeof info.itemLowPrice === 'number' && info.itemLowPrice > 0) {
        priceUsd = usdFromCny(info.itemLowPrice / 100);
    }

    const result = {
        title: info.item_name || null,
        image: images[0] || null,
        images,
        inHandImages: [],
        skuImages,
        priceUsd,
        stock: typeof info.stock === 'number' ? info.stock : null,
    };

    if (full) {
        result.description = '';
        result.shopName = shop.shopName || null;
        result.detailUrl = null;
        result.properties = attr_list.map((a, idx) => ({
            propId: idx,
            propName: a.attr_title || `attr_${idx}`,
            valuesList: (a.attr_values || []).map(v => ({
                valueId: v.attr_id,
                valueName: v.attr_value,
                picUrl: v.img || null,
            })),
        }));
        result.skuList = Object.entries(skuMap).map(([id, s]) => ({
            skuId: s.id || id,
            valueIds: typeof s.attr_ids === 'string'
                ? s.attr_ids.split('-').map(x => parseInt(x, 10)).filter(Number.isFinite)
                : [],
            price: s.price,
            // produkt.js renders the price off convertedPrice; leaving it null showed "—".
            convertedPrice: usdFromCny(s.price),
            stock: s.stock,
            imgUrl: s.img || null,
        }));
    }

    return result;
}

// usfans channel 3 == weidian, and the goodsId is the weidian itemID. usfans is
// regularly unreachable from the Cloudflare edge even while it answers fine from
// elsewhere, so channel 3 papers over that by scraping weidian directly. Channels
// 1 (1688) and 2 (taobao/tmall) have no such source and fall through to qcitems.
function weidianFallback(parsed, full) {
    if (parsed.channel === '3' && /^\d+$/.test(parsed.goodsId)) {
        return handleWeidian(parsed.goodsId, full);
    }
    return null;
}

function hasNoImages(result) {
    return (!Array.isArray(result.images) || !result.images.length) &&
        (!Array.isArray(result.skuImages) || !result.skuImages.length);
}

// usfans cannot serve taobao or 1688 to us: its API answers null for every taobao
// id (from anywhere, headers make no difference) and returns nothing at all to the
// Cloudflare edge. qcitems reaches both from the edge — /api/qc already relies on
// it — so take the cover image, title and price from there instead of rendering a
// blank product page.
async function fetchQcitems(rawUrl, bypassCache) {
    let upstream;
    try {
        upstream = await fetch(`https://qcitems.com/api/product?url=${encodeURIComponent(rawUrl)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 RePluG-Bot', 'Accept': 'application/json' },
            cf: bypassCache
                ? { cacheTtl: 0, cacheEverything: false }
                : { cacheTtlByStatus: { '200-299': 3600, '300-599': 0 }, cacheEverything: true },
        });
    } catch { return null; }
    if (!upstream.ok) return null;

    try {
        const j = await upstream.json();
        return (!j || j.error) ? null : j;
    } catch { return null; }
}

// qcitems gets its taobao/1688 data from usfans, and when that is down it still
// answers HTTP 200 — just with source:"none" and every field blank. cacheTtlByStatus
// cannot tell that apart from a real answer, so one bad minute used to stay pinned
// at the edge for an hour.
function qcitemsHasInfo(j) {
    const info = j && j.info;
    if (!info) return false;
    return Boolean(info.title || info.titleEn || info.image || info.description) ||
        Number(info.price) > 0;
}

async function handleQcitems(rawUrl) {
    let j = await fetchQcitems(rawUrl, false);
    if (!qcitemsHasInfo(j)) {
        const fresh = await fetchQcitems(rawUrl, true);
        if (fresh) j = fresh;
    }
    if (!j) return null;

    const info = j.info || {};
    const rawImage = typeof info.image === 'string' && /^https:\/\//i.test(info.image) ? info.image : null;
    // The cover alone made for a one-photo product page; qcitems ships the rest of
    // the listing's photos inside the description HTML, which is all taobao/1688
    // gives us. Proxied, not hot-linked: cbu01.alicdn.com 403s requests that carry
    // our Referer, so the browser cannot load these directly.
    const gallery = [rawImage, ...imagesFromHtml(info.description, 24)]
        .filter(Boolean)
        .filter((u, i, arr) => arr.indexOf(u) === i)
        .slice(0, 24)
        .map(proxyImage);
    const title = firstString(info.titleEn, info.title);
    const usd = usdFromCny(info.price);
    if (!gallery.length && !title && usd === null) return null;

    return {
        ...emptyResult(),
        title,
        image: gallery[0] || null,
        images: gallery,
        priceUsd: usd,
        // produkt.js reads the displayed price off skuList.convertedPrice, not priceUsd.
        skuList: usd === null ? [] : [{ convertedPrice: usd, valueIds: [] }],
        properties: [],
        shopName: firstString(info.shopName),
        // qcitems reports weight in grams; 0 means "unknown", not weightless.
        weightG: typeof info.weight === 'number' && info.weight > 0 ? info.weight : null,
        category: firstString(info.category),
    };
}

function firstString(...vals) {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
}

function imagesFromHtml(html, limit) {
    const out = [];
    if (typeof html !== 'string' || !html) return out;
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null && out.length < limit) {
        const src = m[1].trim();
        if (/^https:\/\//i.test(src) && !out.includes(src)) out.push(src);
    }
    return out;
}

async function handleUsfans(parsed, full) {
    const api = `https://usfans.com/api/goods/info?channel=${parsed.channel}&goodsId=${encodeURIComponent(parsed.goodsId)}`;

    let upstream;
    try {
        upstream = await fetch(api, {
            headers: { 'User-Agent': 'Mozilla/5.0 RePluG-Bot' },
            // Don't cache error responses — otherwise a transient usfans 5xx gets
            // pinned for an hour and the product stays broken.
            cf: { cacheTtlByStatus: { '200-299': 3600, '300-599': 0 }, cacheEverything: true }
        });
    } catch {
        const fb = weidianFallback(parsed, full);
        if (fb) return fb;
        return jsonOk(emptyResult());
    }
    if (!upstream.ok) {
        const fb = weidianFallback(parsed, full);
        if (fb) return fb;
        return jsonOk(emptyResult());
    }

    const j = await upstream.json();
    const d = j?.data || {};

    let minPrice = null;
    if (Array.isArray(d.skuList)) {
        for (const s of d.skuList) {
            const p = typeof s.convertedPrice === 'number' ? s.convertedPrice : null;
            if (p !== null && p > 0 && (minPrice === null || p < minPrice)) minPrice = p;
        }
    }
    if (minPrice === null && typeof d.convertedPrice === 'number' && d.convertedPrice > 0) {
        minPrice = d.convertedPrice;
    }

    const descImages = [];
    if (typeof d.description === 'string' && d.description) {
        const re = /<img[^>]+src=["']([^"']+)["']/gi;
        let mm;
        while ((mm = re.exec(d.description)) !== null && descImages.length < 16) {
            const src = mm[1];
            if (src.startsWith('http') && !descImages.includes(src)) descImages.push(src);
        }
    }

    const skuImages = Array.isArray(d.skuList)
        ? [...new Set(d.skuList.map(s => s.imgUrl).filter(Boolean))].slice(0, 12)
        : [];

    const result = {
        title: d.titleEn || d.title || null,
        image: (Array.isArray(d.images) && d.images[0]) || null,
        images: Array.isArray(d.images) ? d.images.slice(0, 8) : [],
        inHandImages: descImages,
        skuImages,
        priceUsd: minPrice,
        stock: typeof d.stock === 'number' ? d.stock : null,
    };

    if (full) {
        result.description = d.description || '';
        result.shopName = d.shopNameEn || d.shopName || null;
        result.detailUrl = d.detailUrl || null;
        result.properties = Array.isArray(d.properties) ? d.properties.map(p => ({
            propId: p.propId,
            propName: p.propNameEn || p.propName || '',
            valuesList: (p.valuesList || []).map(v => ({
                valueId: v.valueId,
                valueName: v.valueNameEn || v.valueName || '',
                picUrl: v.picUrl || null,
            })),
        })) : [];
        result.skuList = Array.isArray(d.skuList) ? d.skuList.map(s => ({
            skuId: s.skuId,
            valueIds: s.valueIds || [],
            price: s.price,
            convertedPrice: s.convertedPrice,
            stock: s.stock,
            imgUrl: s.imgUrl || null,
        })) : [];
    }

    // usfans sometimes returns a valid-but-imageless payload for weidian items.
    // Fall back to weidian so the tile/gallery isn't left blank.
    if (hasNoImages(result)) {
        const fb = weidianFallback(parsed, full);
        if (fb) {
            const fbRes = await fb;
            if (fbRes && fbRes.status >= 200 && fbRes.status < 300) return fbRes;
        }
    }

    return jsonOk(result);
}

async function handleWeidian(itemId, full) {
    let j;
    try {
        j = await fetchWeidianRocker(itemId);
    } catch {
        return jsonError('upstream fetch failed', 502);
    }
    if (!j) return jsonError('upstream parse failed', 502);
    return jsonOk(shapeWeidian(j, full));
}

function b64urlEncode(s) {
    return btoa(unescape(encodeURIComponent(s)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function proxyImage(url) {
    return `/api/qcimg?u=${b64urlEncode(url)}`;
}

const AGENT_PLATFORM_TO_CHANNEL = { WEIDIAN: 3, TAOBAO: 2, TMALL: 2, '1688': 1, ALIBABA: 1 };

// Taobao hands out opaque item tokens ("0000S_yf-ottGagYnlf…") alongside numeric
// ids — image search returns nothing else — and qcitems resolves both.
const TAOBAO_ID = /^[A-Za-z0-9_-]{6,80}$/;

function refToUsfans(ref) {
    if (!ref) return null;
    // usfans addresses items by numeric marketplace id; a token cannot be one.
    if (!/^\d+$/.test(ref.itemId)) return null;
    const channel = ref.source === 'weidian' ? 3
        : (ref.source === 'taobao' || ref.source === 'tmall') ? 2
        : ref.source === '1688' ? 1
        : null;
    if (!channel) return null;
    return `https://www.usfans.com/product/${channel}/${ref.itemId}?ref=MGRSBE`;
}

function parseAgentUrl(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
        const u = new URL(raw);
        const host = u.hostname.toLowerCase();
        if (host === 'weidian.com' || host.endsWith('.weidian.com')) {
            const id = u.searchParams.get('itemID') || u.searchParams.get('itemId');
            if (id && /^\d+$/.test(id)) return { source: 'weidian', itemId: id };
        }
        if (host === 'taobao.com' || host.endsWith('.taobao.com')) {
            const id = u.searchParams.get('id');
            if (id && TAOBAO_ID.test(id)) return { source: 'taobao', itemId: id };
        }
        if (host === 'tmall.com' || host.endsWith('.tmall.com')) {
            const id = u.searchParams.get('id');
            if (id && TAOBAO_ID.test(id)) return { source: 'tmall', itemId: id };
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
        const id = u.searchParams.get('id') || u.searchParams.get('itemId') || u.searchParams.get('itemID');
        if (platform && id && /^\d+$/.test(id) && AGENT_PLATFORM_TO_CHANNEL[platform]) {
            const source = platform === 'WEIDIAN' ? 'weidian'
                : platform === 'TAOBAO' ? 'taobao'
                : platform === 'TMALL' ? 'tmall'
                : '1688';
            return { source, itemId: id };
        }
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

    const externals = html.matchAll(/\/external\?url=([^"&<>\s]+)/g);
    for (const m of externals) {
        let decoded = m[1];
        for (let i = 0; i < 3 && /%/.test(decoded); i++) {
            try { decoded = decodeURIComponent(decoded); } catch { break; }
        }
        const ref = parseAgentUrl(decoded);
        if (ref) return ref;
    }
    return null;
}

async function fetchYupooAlbumData(albumUrl) {
    try {
        const u = new URL(albumUrl);
        if (!/\.yupoo\.com$/i.test(u.hostname)) return { images: [], usfansUrl: null };
        const r = await fetch(albumUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 RePluG-Bot',
                'Referer': `https://${u.hostname}/albums`,
            },
            cf: { cacheTtl: 3600, cacheEverything: true },
        });
        if (!r.ok) return { images: [], usfansUrl: null };
        const html = await r.text();

        const seen = new Set();
        const photos = [];
        const re = /https:\/\/photo\.yupoo\.com\/[^"\s]+\/[a-f0-9]+\/(?:big|medium|small)\.(?:jpg|jpeg|png|webp)/g;
        const matches = html.match(re) || [];
        for (const raw of matches) {
            const idM = raw.match(/\/([a-f0-9]+)\/[a-z]+\.[a-z]+$/);
            if (!idM) continue;
            const id = idM[1];
            if (seen.has(id)) continue;
            seen.add(id);
            const big = raw.replace(/\/(medium|small)\./, '/big.');
            photos.push(proxyImage(big));
        }

        const usfansUrl = refToUsfans(extractAlbumItemRef(html));

        return { images: photos.slice(0, 16), usfansUrl };
    } catch { return { images: [], usfansUrl: null }; }
}

function emptyResult() {
    return { title: null, image: null, images: [], inHandImages: [], skuImages: [], priceUsd: null, stock: null };
}

async function resolveByUrl(url, full) {
    const usf = parseUsfans(url);
    if (usf) {
        const r = await handleUsfans(usf, full);
        return r;
    }
    const kako = parseKakobuy(url);
    if (kako && kako.source === 'weidian') {
        const r = await handleWeidian(kako.itemId, full);
        return r;
    }
    // Raw marketplace links: seller shop items point straight at weidian, and sheet
    // rows may hold taobao/tmall/1688 links. Without this they fell through to
    // "unsupported url" and the product page failed to load.
    const agent = parseAgentUrl(url);
    if (agent) {
        // weidian goes direct — the rocker endpoint is more reliable than usfans.
        if (agent.source === 'weidian') {
            const r = await handleWeidian(agent.itemId, full);
            return r;
        }
        // taobao/1688 go to qcitems first: usfans answers null for every taobao id
        // and returns nothing to the CF edge for 1688, so asking it first only cost
        // a round trip and left the page with one photo and a Chinese title.
        const qc = await handleQcitems(url);
        if (qc) return jsonOk(qc);

        const parsed = parseUsfans(refToUsfans(agent) || '');
        if (parsed) return handleUsfans(parsed, full);
    }
    return null;
}

async function readResponse(r) {
    if (!r) return null;
    try { return await r.clone().json(); }
    catch { return null; }
}

export async function onRequest(ctx) {
    const params = new URL(ctx.request.url).searchParams;
    const url = params.get('url');
    const full = params.get('full') === '1';
    const yupoo = params.get('yupoo');

    let result = null;
    let upstreamErrorResponse = null;

    if (url) {
        const upstream = await resolveByUrl(url, full);
        if (upstream && upstream.status >= 200 && upstream.status < 300) {
            result = await readResponse(upstream);
        } else if (upstream && !yupoo) {
            return upstream;
        } else if (!upstream && !yupoo) {
            return jsonError('unsupported url', 400);
        } else {
            upstreamErrorResponse = upstream;
        }
    } else if (!yupoo) {
        return jsonError('missing url', 400);
    }

    if (yupoo) {
        const { images: yupooImgs, usfansUrl } = await fetchYupooAlbumData(yupoo);
        if (!result) result = emptyResult();
        const merged = [...new Set([...yupooImgs, ...(result.images || [])])];
        result.images = merged.slice(0, 20);
        if (!result.image && result.images.length) result.image = result.images[0];
        if (usfansUrl) result.usfansUrl = usfansUrl;
    }

    if (!result) {
        return upstreamErrorResponse || jsonError('no data', 502);
    }

    return jsonOk(result);
}

// A blank payload is an upstream hiccup, not a product that happens to have no
// data. Caching it for an hour pinned the failure in every visitor's browser: the
// catalog tile stayed image- and price-less (the sheet supplies neither) while the
// product page showed the item fine, because it asks with full=1 and so lands on a
// different cache key.
function hasPayload(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return Boolean(obj.title) || Boolean(obj.image) ||
        (Array.isArray(obj.images) && obj.images.length > 0) ||
        obj.priceUsd != null;
}

function jsonOk(obj) {
    return new Response(JSON.stringify(obj), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': hasPayload(obj) ? 'public, max-age=3600' : 'no-store',
            'X-Content-Type-Options': 'nosniff',
        }
    });
}

function jsonError(msg, status) {
    return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
