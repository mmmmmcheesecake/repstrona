function jsonError(message, status) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        // _headers puts max-age=300 on everything under /api/, which would park an
        // upstream failure in the visitor's browser for five minutes after it healed.
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// qcitems dropped weidian from image search and folded the marketplaces that are
// left behind one endpoint: /api/image-search/multi queries taobao and 1688 at once
// and answers with a merged, similarity-sorted list. The old /internal endpoint is
// still up but now rejects channel 3 with "Invalid channel" — which is exactly what
// this page sent by default — so there is nothing left to select between.
const UPSTREAM = 'https://qcitems.com/api/image-search/multi';

// Without a qcitems.com Referer every one of their endpoints answers 403
// "Open this content through QCItems". Same gate as /api/qc and /api/product.
const UPSTREAM_HEADERS = {
    'User-Agent': UA,
    'Referer': 'https://qcitems.com/visual-search',
    'Origin': 'https://qcitems.com'
};

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

    const image = body.get('image');
    if (!image || typeof image !== 'object' || !String(image.type || '').startsWith('image/')) {
        return jsonError('invalid image type', 400);
    }
    if (typeof image.size === 'number' && image.size > MAX_IMAGE_BYTES) {
        return jsonError('image too large', 413);
    }

    const fwd = new FormData();
    fwd.append('image', image);

    let upstream;
    try {
        upstream = await fetch(UPSTREAM, {
            method: 'POST',
            body: fwd,
            headers: UPSTREAM_HEADERS
        });
    } catch {
        return jsonError('upstream fetch failed', 502);
    }

    if (!upstream.ok) return jsonError('upstream error', 502);

    let data;
    try { data = await upstream.json(); }
    catch { return jsonError('upstream parse failed', 502); }

    if (!data || data.success === false) return jsonError('upstream error', 502);

    // Every marketplace answers for itself. Keep how each one did, but drop its copy
    // of the hits: the merged list already holds all of them and the duplicates make
    // up most of the payload.
    const sources = {};
    let answered = 0;
    for (const [name, s] of Object.entries(data.sources || {})) {
        const status = s?.status || 'ok';
        if (status === 'ok') answered++;
        sources[name] = {
            status,
            total: Number(s?.total) || 0,
            error: s?.error || null
        };
    }
    // Every marketplace failing is an outage, not an empty result. Saying "no matches"
    // there would send visitors off hunting for a better photo that cannot help.
    if (Object.keys(sources).length && !answered) return jsonError('upstream error', 502);

    const results = Array.isArray(data.results) ? data.results : [];

    return new Response(JSON.stringify({
        results,
        total: results.length,
        // true when one marketplace answered and the other did not
        partial: Boolean(data.partial),
        sources
    }), {
        headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
        }
    });
}
