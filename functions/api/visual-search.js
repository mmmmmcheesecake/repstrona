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
// Encoding a phone-sized photo to base64 inside the worker is the one thing here that
// costs real CPU, so the page sends the shrunk preview it already has. This cap only
// applies to the fallback, for when the browser could not produce one.
const MAX_ENCODE_BYTES = 2 * 1024 * 1024;

// Channel numbering is the same on both upstreams: 1 = 1688, 2 = taobao, 3 = weidian.
const CHANNELS = new Set(['1', '2', '3']);
const CHANNEL_MARKETPLACE = { '1': '1688', '2': 'taobao', '3': 'weidian' };

// ---------------------------------------------------------------- weidian: usfans
//
// qcitems retired their weidian channel — /api/image-search/internal answers
// "Invalid channel" for it — and weidian is where the reps are, so taobao results on
// their own are close to useless on this site. usfans still searches weidian by
// image, and it is the agent we send people to anyway: upload the photo, then query
// with the id the upload hands back.
const USFANS_API = 'https://www.usfans.com/api';
const USFANS_HEADERS = {
    'content-type': 'application/json',
    'User-Agent': UA,
    'Origin': 'https://www.usfans.com',
    'Referer': 'https://www.usfans.com/'
};

// usfans drops about half the connections that come from the Cloudflare edge — the
// failures are instant (~0.15s, where an answer takes ~2s) and the next attempt
// usually goes through, so retry rather than telling the visitor the search broke.
const USFANS_ATTEMPTS = 3;

async function usfansPost(path, payload) {
    const body = JSON.stringify(payload);
    for (let i = 0; i < USFANS_ATTEMPTS; i++) {
        let r;
        try {
            r = await fetch(`${USFANS_API}${path}`, {
                method: 'POST',
                headers: USFANS_HEADERS,
                body
            });
        } catch { continue; }
        if (!r.ok) continue;
        try {
            const j = await r.json();
            // Their API answers HTTP 200 for failures too, with code 10001 and
            // success false. That is a real answer — retrying it changes nothing.
            return j && j.success !== false && j.code === 200 ? j : null;
        } catch { return null; }
    }
    return null;
}

function bytesToBase64(bytes) {
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
}

// usfans wants the photo as a data URL; bare base64 comes back rejected as malformed.
async function toDataUrl(imageData, file) {
    if (typeof imageData === 'string' && /^data:image\/[a-z.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(imageData)) {
        return imageData;
    }
    if (!file) return null;
    if (typeof file.size === 'number' && file.size > MAX_ENCODE_BYTES) return null;
    try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return `data:${file.type || 'image/jpeg'};base64,${bytesToBase64(bytes)}`;
    } catch { return null; }
}

function shapeUsfansRecord(r) {
    const goodsId = r && r.goodsId;
    if (!goodsId) return null;
    const price = r.discountPrice != null ? r.discountPrice : r.price;
    return {
        // Link straight to the agent listing, the same address the catalogue stores:
        // /api/product already opens those, and falls back to weidian itself when
        // usfans is unreachable from the edge.
        id: `https://www.usfans.com/product/3/${encodeURIComponent(goodsId)}?ref=MGRSBE`,
        goodsId: String(goodsId),
        marketplace: 'weidian',
        title: r.title || '',
        image: typeof r.image === 'string' ? r.image : null,
        price: typeof price === 'number' ? price : null,
        currency: 'CNY',
        sales: typeof r.monthSold === 'number' ? r.monthSold : null
    };
}

async function searchWeidian(dataUrl, page) {
    const up = await usfansPost('/goods/image/upload', { imageBase64: dataUrl, channel: 3 });
    const imageId = up && up.data && up.data.imageId;
    if (!imageId) return null;

    const found = await usfansPost('/goods/search/image', {
        pageNum: page,
        pageSize: 20,
        imageId,
        channel: 3
    });
    const records = found && found.data && found.data.records;
    if (!Array.isArray(records)) return null;

    return {
        results: records.map(shapeUsfansRecord).filter(Boolean),
        totalPages: Number(found.data.pages) || 1
    };
}

// ------------------------------------------------------- taobao and 1688: qcitems
//
// Without a qcitems.com Referer every one of their endpoints answers 403
// "Open this content through QCItems". Same gate as /api/qc and /api/product.
const QCITEMS_INTERNAL = 'https://qcitems.com/api/image-search/internal';
const QCITEMS_HEADERS = {
    'User-Agent': UA,
    'Referer': 'https://qcitems.com/visual-search',
    'Origin': 'https://qcitems.com'
};

async function searchQcitems(file, channel, page) {
    if (!file) return null;
    const fwd = new FormData();
    fwd.append('image', file);
    fwd.append('channel', channel);
    fwd.append('page', String(page));

    let r;
    try {
        r = await fetch(QCITEMS_INTERNAL, { method: 'POST', body: fwd, headers: QCITEMS_HEADERS });
    } catch { return null; }
    if (!r.ok) return null;

    let j;
    try { j = await r.json(); } catch { return null; }
    if (!j || j.success === false || !Array.isArray(j.results)) return null;

    return { results: j.results, totalPages: Number(j.totalPages) || 1 };
}

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

    const channel = String(body.get('channel') || '3');
    if (!CHANNELS.has(channel)) return jsonError('invalid channel', 400);

    const page = Math.min(Math.max(parseInt(body.get('page'), 10) || 1, 1), 10);

    const file = body.get('image');
    const hasFile = Boolean(file) && typeof file === 'object';
    if (hasFile) {
        if (!String(file.type || '').startsWith('image/')) return jsonError('invalid image type', 400);
        if (typeof file.size === 'number' && file.size > MAX_IMAGE_BYTES) return jsonError('image too large', 413);
    }

    const imageData = body.get('imageData');
    if (!hasFile && typeof imageData !== 'string') return jsonError('missing image', 400);

    let found;
    if (channel === '3') {
        const dataUrl = await toDataUrl(imageData, hasFile ? file : null);
        if (!dataUrl) {
            // Either the photo is past what we will base64 inside the worker, or what
            // arrived was not a data URL at all — those are different problems.
            const tooBig = hasFile && typeof file.size === 'number' && file.size > MAX_ENCODE_BYTES;
            return jsonError(tooBig ? 'image too large' : 'invalid image', tooBig ? 413 : 400);
        }
        found = await searchWeidian(dataUrl, page);
    } else {
        found = await searchQcitems(hasFile ? file : null, channel, page);
    }

    // 504 for weidian on purpose: usfans dropping the connection is a different
    // failure from qcitems answering badly, and Cloudflare swaps our 5xx bodies for
    // its own error page, so the status code is all the page has to go on.
    if (!found) return jsonError('upstream error', channel === '3' ? 504 : 502);

    return new Response(JSON.stringify({
        channel,
        marketplace: CHANNEL_MARKETPLACE[channel],
        results: found.results,
        total: found.results.length,
        page,
        totalPages: found.totalPages
    }), {
        headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
        }
    });
}
