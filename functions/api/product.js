function parseUsfans(rawUrl) {
    try {
        const u = new URL(rawUrl);
        if (!/usfans\.com$/i.test(u.hostname)) return null;
        const m = u.pathname.match(/\/product\/(\d+)\/([0-9a-zA-Z]+)/);
        if (!m) return null;
        return { channel: m[1], goodsId: m[2] };
    } catch { return null; }
}

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url).searchParams.get('url');
    const full = new URL(ctx.request.url).searchParams.get('full') === '1';

    if (!url) return jsonError('missing url', 400);

    const parsed = parseUsfans(url);
    if (!parsed) return jsonError('unsupported url', 400);

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

    return new Response(JSON.stringify(result), {
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
