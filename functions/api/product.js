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
    if (!url) {
        return new Response(JSON.stringify({ error: 'missing url' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const parsed = parseUsfans(url);
    if (!parsed) {
        return new Response(JSON.stringify({ error: 'unsupported url' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const api = `https://usfans.com/api/goods/info?channel=${parsed.channel}&goodsId=${encodeURIComponent(parsed.goodsId)}`;

    let upstream;
    try {
        upstream = await fetch(api, {
            headers: { 'User-Agent': 'Mozilla/5.0 RePluG-Bot' },
            cf: { cacheTtl: 3600, cacheEverything: true }
        });
    } catch {
        return new Response(JSON.stringify({ error: 'upstream fetch failed' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!upstream.ok) {
        return new Response(JSON.stringify({ error: 'upstream error', status: upstream.status }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
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

    const result = {
        title: d.titleEn || d.title || null,
        image: (Array.isArray(d.images) && d.images[0]) || null,
        images: Array.isArray(d.images) ? d.images.slice(0, 6) : [],
        priceUsd: minPrice,
        stock: typeof d.stock === 'number' ? d.stock : null,
    };

    return new Response(JSON.stringify(result), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
        }
    });
}
