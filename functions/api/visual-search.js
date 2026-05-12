function jsonError(message, status) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function onRequest(ctx) {
    if (ctx.request.method !== 'POST') {
        return jsonError('method not allowed', 405);
    }

    let body;
    try {
        body = await ctx.request.formData();
    } catch {
        return jsonError('invalid form data', 400);
    }

    const fwd = new FormData();
    const allowed = new Set(['image', 'imageId', 'channel', 'page']);
    for (const [k, v] of body.entries()) {
        if (!allowed.has(k)) continue;
        if (k === 'image') {
            if (!v || typeof v !== 'object' || !String(v.type || '').startsWith('image/')) {
                return jsonError('invalid image type', 400);
            }
            if (typeof v.size === 'number' && v.size > MAX_IMAGE_BYTES) {
                return jsonError('image too large', 413);
            }
        }
        if (k === 'channel' && !['1', '2', '3'].includes(String(v))) continue;
        if (k === 'page') {
            const page = Number(v);
            if (!Number.isInteger(page) || page < 1 || page > 10) continue;
        }
        fwd.append(k, v);
    }
    if (!fwd.has('channel')) fwd.append('channel', '3');
    if (!fwd.has('page')) fwd.append('page', '1');
    if (!fwd.has('image') && !fwd.has('imageId')) {
        return jsonError('missing image or imageId', 400);
    }

    let upstream;
    try {
        upstream = await fetch('https://qcitems.com/api/image-search/internal', {
            method: 'POST',
            body: fwd,
            headers: { 'User-Agent': UA }
        });
    } catch {
        return jsonError('upstream fetch failed', 502);
    }

    if (!upstream.ok) return jsonError('upstream error', 502);

    let data;
    try { data = await upstream.json(); }
    catch { return jsonError('upstream parse failed', 502); }

    return new Response(JSON.stringify(data), {
        headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
        }
    });
}
