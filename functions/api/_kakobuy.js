// kakobuy's own API, shared by /api/qc and /api/visual-search.
//
// Their site wraps every payload in AES + RSA (req_code 4), but the server still
// accepts req_code 1, which is the same JSON in the clear — so none of that ceremony
// is needed here. Base URL and the envelope come from their web bundle.
//
// What does need care: item details (which carry the QC groups) and image search are
// both behind a login — anonymous calls answer code 1055/1005 "Please login first".
// The token is the `token` cookie their site sets after signing in; it travels inside
// the payload, not as a header. It lives in KAKOBUY_TOKEN in the Pages environment,
// never in the repo. Without it every call here returns null and the callers fall
// back to qcitems, which is what the site did before.
const API = 'https://v1.kakoapi.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// Constants their bundle sends on every call. versionCode tracks their web release.
const BASE_PAYLOAD = { versionCode: '252', from: '1201', device_type: 'web', cur: 'USD' };

// Their browser keeps a uuid in localStorage and sends it with every call; leave it
// out and the answer is 1002 "missing p uuid". One stable value stands in for one
// device, which is what we are as far as they are concerned — a fresh uuid per
// request would look like a new browser every time.
const CLIENT_UUID = '8f6f2a1c-5f5c-4e7a-9a2d-3c9b1f0e7d44';

export function kakobuyEnabled(env) {
    return Boolean(env && typeof env.KAKOBUY_TOKEN === 'string' && env.KAKOBUY_TOKEN.trim());
}

// Returns { ok, data, msg } — msg carries their code/message when a call is refused,
// which is how a stale token becomes visible instead of looking like "no photos".
async function post(env, path, params, image) {
    if (!kakobuyEnabled(env)) return { ok: false, data: null, msg: 'no token' };

    const payload = { ...BASE_PAYLOAD, uuid: CLIENT_UUID, ...params, token: env.KAKOBUY_TOKEN.trim() };
    const headers = {
        'User-Agent': UA,
        'lang': 'en',
        'Origin': 'https://www.kakobuy.com',
        'Referer': 'https://www.kakobuy.com/'
    };

    let body;
    if (image) {
        // Their wrapper lifts the file out of the payload and posts the rest alongside
        // it as multipart, so the JSON still travels in the `data` field.
        const fd = new FormData();
        fd.append('data', JSON.stringify(payload));
        fd.append('req_code', '1');
        fd.append('image', image);
        body = fd;
    } else {
        headers['content-type'] = 'application/json';
        body = JSON.stringify({ data: JSON.stringify(payload), req_code: 1 });
    }

    let r;
    try {
        r = await fetch(`${API}${path}`, { method: 'POST', headers, body });
    } catch {
        return { ok: false, data: null, msg: 'fetch failed' };
    }
    if (!r.ok) return { ok: false, data: null, msg: `HTTP ${r.status}` };

    let j;
    try { j = await r.json(); } catch { return { ok: false, data: null, msg: 'parse failed' }; }

    // 200 is the only code that carries data; 1005/1055 mean the token is missing or
    // stale, and 1002 means they rejected the request itself.
    if (!j || j.code !== 200) {
        return { ok: false, data: null, msg: j ? `${j.code} ${j.msg || ''}`.trim() : 'empty' };
    }
    return { ok: true, data: j.data, msg: null };
}

// Escape hatch for probing their API: same envelope, arbitrary params.
export function kakobuyPost(env, path, params, image) {
    return post(env, path, params, image);
}

// url is the raw marketplace URL — the same thing their /item/details?url= takes.
export function kakobuyItem(env, marketplaceUrl) {
    return post(env, '/api/sapi/item', { url: marketplaceUrl, tp: '', tid: '', refresh: '0' });
}

// tp filters the marketplace: '1688', 'taobao', or '' for everything they index.
export function kakobuyImageSearch(env, image, tp, page) {
    return post(env, '/api/sapi/imageSearch', { page: page || 1, tp: tp || '' }, image);
}

// QC sets live on the item payload as qc_group[].qc_list[].image. qc_group_count is
// how many exist; qc_limit_points is the points threshold their own site puts in front
// of them, so an account short on points gets the count and an empty list.
export function kakobuyQcGroups(item) {
    const groups = Array.isArray(item && item.qc_group) ? item.qc_group : [];
    const out = [];
    groups.forEach(g => {
        const list = Array.isArray(g && g.qc_list) ? g.qc_list : [];
        const photos = list
            .map(p => (typeof p === 'string' ? p : p && p.image))
            .filter(u => typeof u === 'string' && /^https?:\/\//i.test(u));
        if (photos.length) out.push({ maskId: g.mask_id || null, photos });
    });
    return out;
}
