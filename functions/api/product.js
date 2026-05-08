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

    let priceUsd = null;
    if (typeof info.itemLowPrice === 'number' && info.itemLowPrice > 0) {
        priceUsd = Math.round((info.itemLowPrice / 100 / 7.2) * 100) / 100;
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
            convertedPrice: null,
            stock: s.stock,
            imgUrl: s.img || null,
        }));
    }

    return result;
}

async function handleUsfans(parsed, full) {
    const api = `https://usfans.com/api/goods/info?channel=${parsed.channel}&goodsId=${encodeURIComponent(parsed.goodsId)}`;

    let upstream;
    try {
        upstream = await fetch(api, {
            headers: { 'User-Agent': 'Mozilla/5.0 RePluG-Bot' },
            cf: { cacheTtl: 3600, cacheEverything: true }
        });
    } catch {
        return jsonError('upstream fetch failed', 502);
    }
    if (!upstream.ok) return jsonError('upstream error', 502);

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

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url).searchParams.get('url');
    const full = new URL(ctx.request.url).searchParams.get('full') === '1';

    if (!url) return jsonError('missing url', 400);

    const usf = parseUsfans(url);
    if (usf) return handleUsfans(usf, full);

    const kako = parseKakobuy(url);
    if (kako && kako.source === 'weidian') return handleWeidian(kako.itemId, full);

    return jsonError('unsupported url', 400);
}

function jsonOk(obj) {
    return new Response(JSON.stringify(obj), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
        }
    });
}

function jsonError(msg, status) {
    return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
