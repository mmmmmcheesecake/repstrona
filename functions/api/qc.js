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

export async function onRequest(ctx) {
    const url = new URL(ctx.request.url).searchParams.get('url');
    if (!url) return jsonError('missing url', 400);

    let target;
    try {
        target = `https://qcitems.com/api/product?url=${encodeURIComponent(url)}`;
    } catch {
        return jsonError('invalid url', 400);
    }

    let upstream;
    try {
        upstream = await fetch(target, {
            headers: { 'User-Agent': UA, 'Accept': 'application/json' },
            cf: { cacheTtl: 600, cacheEverything: true }
        });
    } catch {
        return jsonError('upstream fetch failed', 502);
    }
    if (!upstream.ok) return jsonError('upstream error', 502);

    let data;
    try { data = await upstream.json(); }
    catch { return jsonError('upstream parse failed', 502); }

    if (data?.error) return jsonError(data.error, 400);

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
