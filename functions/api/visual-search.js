import { kakobuyEnabled, kakobuyImageSearch } from './_kakobuy.js';

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

// usfans blocks about half the requests that reach it from the Cloudflare edge: its
// own block page, HTTP 503 carrying "USFans 专属 403 页面", no matter what headers we
// send. It is not the headers and not the rate — from a home connection nothing is
// blocked at all. That is why the page asks usfans directly and only falls back here;
// within one worker request every attempt gets blocked together, so two is plenty.
const USFANS_ATTEMPTS = 2;

async function usfansPost(path, payload) {
    const body = JSON.stringify(payload);
    for (let i = 0; i < USFANS_ATTEMPTS; i++) {
        let r;
        try {
            r = await fetch(`${USFANS_API}${path}`, { method: 'POST', headers: USFANS_HEADERS, body });
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

// -------------------------------------------------- taobao and 1688: kakobuy first
//
// The owner buys taobao and 1688 through kakobuy, so the search that fills those two
// channels is kakobuy's own — the cards then link at the listing people actually buy
// from. It needs KAKOBUY_TOKEN; without it, or when it comes back empty, qcitems below
// still answers, which is what the site did before.
const CHANNEL_TP = { '1': '1688', '2': 'taobao' };

function firstString(...vals) {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
}

function firstNumber(...vals) {
    for (const v of vals) {
        const n = typeof v === 'string' ? parseFloat(v) : v;
        if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n;
    }
    return null;
}

// Their list items are not documented anywhere, and the field names differ between
// their endpoints, so read every spelling we have seen rather than guessing one.
function shapeKakobuyRecord(r, marketplace, currency) {
    if (!r || typeof r !== 'object') return null;
    const link = firstString(r.detail_url, r.detailUrl, r.url, r.goods_url);
    const id = firstString(r.goods_id, r.goodsId, r.item_id, r.itemId, r.num_iid, r.id);
    if (!link && !id) return null;
    return {
        // The page treats an absolute URL in id as the marketplace link and builds the
        // kakobuy address from it; detail_url is exactly that raw link.
        id: link || id,
        goodsId: id || '',
        marketplace,
        title: firstString(r.title, r.name, r.goods_name, r.goodsName, r.subject) || '',
        image: firstString(r.pic, r.img, r.image, r.goods_img, r.main_img, r.picUrl, r.imgUrl),
        price: firstNumber(r.price, r.shop_price, r.sale_price, r.goods_price, r.min_price),
        currency,
        sales: firstNumber(r.sales, r.sold, r.month_sold, r.sale_num)
    };
}

// Temporary: same idea as the one on /api/qc — their list item field names are not
// documented, so report the shape (names and counts only, no account data) until the
// mapping above is confirmed against a live answer.
async function probeKakobuy(env, file, channel, page) {
    const res = await kakobuyImageSearch(env, file, CHANNEL_TP[channel], page);
    const data = res.data || {};
    const list = Array.isArray(data.list) ? data.list : [];
    return {
        tokenConfigured: kakobuyEnabled(env),
        ok: res.ok,
        msg: res.msg || null,
        dataKeys: res.ok ? Object.keys(data).slice(0, 20) : null,
        count: list.length,
        recordKeys: list.length ? Object.keys(list[0]).slice(0, 40) : null,
        curSym: data.cur_sym || null,
        mapped: list.length ? shapeKakobuyRecord(list[0], CHANNEL_MARKETPLACE[channel], 'USD') : null
    };
}

async function searchKakobuy(env, file, channel, page) {
    const res = await kakobuyImageSearch(env, file, CHANNEL_TP[channel], page);
    if (!res.ok) return null;

    const data = res.data || {};
    const list = Array.isArray(data.list) ? data.list : [];
    // We ask for USD, and cur_sym says what came back.
    const currency = /\u00a5|cny|rmb/i.test(String(data.cur_sym || '')) ? 'CNY' : 'USD';
    const marketplace = CHANNEL_MARKETPLACE[channel];
    const results = list.map(r => shapeKakobuyRecord(r, marketplace, currency)).filter(Boolean);
    if (!results.length) return null;

    return { results, totalPages: Number(data.total_pages) || Number(data.pages) || 1, source: 'kakobuy' };
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

    return { results: j.results, totalPages: Number(j.totalPages) || 1, source: 'qcitems' };
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

    if (new URL(ctx.request.url).searchParams.get('debug') === 'kako' && channel !== '3') {
        const probe = await probeKakobuy(ctx.env, hasFile ? file : null, channel, page);
        return new Response(JSON.stringify(probe), {
            headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
        });
    }

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
        if (found) found.source = 'usfans';
    } else {
        if (hasFile && kakobuyEnabled(ctx.env)) {
            found = await searchKakobuy(ctx.env, file, channel, page);
        }
        if (!found) found = await searchQcitems(hasFile ? file : null, channel, page);
    }

    // 504 for weidian on purpose: usfans dropping the connection is a different
    // failure from qcitems answering badly, and Cloudflare swaps our 5xx bodies for
    // its own error page, so the status code is all the page has to go on.
    // 504 for weidian on purpose: usfans blocking the edge is a different failure from
    // qcitems answering badly, and Cloudflare swaps our 5xx bodies for its own error
    // page, so the status code is all the page has to go on.
    if (!found) return jsonError('upstream error', channel === '3' ? 504 : 502);

    return new Response(JSON.stringify({
        channel,
        marketplace: CHANNEL_MARKETPLACE[channel],
        results: found.results,
        total: found.results.length,
        page,
        totalPages: found.totalPages,
        source: found.source || null
    }), {
        headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
        }
    });
}
