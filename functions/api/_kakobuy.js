// kakobuy's own API, shared by /api/qc and /api/visual-search.
//
// Everything they serve under /api/sapi/ — item details, which carry the QC groups,
// and image search — sits behind two gates.
//
// The first is the envelope. Their site compresses the params, encrypts them with a
// one-off AES key, and ships that key and IV RSA-encrypted under the public key baked
// into their bundle (req_code 4); the answer comes back the same way as code 202. A
// plain-JSON form (req_code 1) does exist, and /api/user/info and /api/index/config
// honour it, but every /api/sapi/ endpoint answers 500 to it — so the envelope is not
// optional here. JSEncrypt does RSAES-PKCS1-v1_5, which WebCrypto will not encrypt
// with, hence the modPow below.
//
// The second gate is the login: anonymous calls answer 1055/1005 "Please login first".
// The token is the `token` cookie their site sets after signing in, and it travels
// inside the payload, not as a header. It lives in KAKOBUY_TOKEN in the Pages
// environment, never in the repo. Without it every call here returns null and the
// callers fall back to qcitems, which is what the site did before.
const API = 'https://v1.kakoapi.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const PUB_KEY_B64 = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCx2UKNVOg0dYx1R3p7GNAXcrRQ7QkiE43UFbHxLPJ8gpWFxhSb6ZoCGO/8AkAFEgroJ7NKUhRyq71vCjDFJh8n7zjA6rgIxKOPNwndHlXBLBj60avRb14BrunQ5EijwGpUF9jUeLrLO3GNd39T4l1RC0jjTBa0hpKpGNGfQAd7rwIDAQAB';

// Constants their bundle sends on every call. versionCode tracks their web release.
const BASE_PAYLOAD = { versionCode: '252', from: '1201', device_type: 'web', cur: 'USD' };

// Their browser keeps a uuid in localStorage and sends it with every call; leave it
// out and the answer is 1002 "missing p uuid". One stable value stands in for one
// device, which is what we are as far as they are concerned — a fresh uuid per
// request would look like a new browser every time.
const CLIENT_UUID = '8f6f2a1c-5f5c-4e7a-9a2d-3c9b1f0e7d44';

const enc = new TextEncoder();
const dec = new TextDecoder();

export function kakobuyEnabled(env) {
    return Boolean(env && typeof env.KAKOBUY_TOKEN === 'string' && env.KAKOBUY_TOKEN.trim());
}

function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
}

function b64urlToBigInt(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((b64url.length + 3) % 4);
    let n = 0n;
    for (const b of b64ToBytes(b64)) n = (n << 8n) | BigInt(b);
    return n;
}

function bigIntToBytes(n, len) {
    const out = new Uint8Array(len);
    for (let i = len - 1; i >= 0; i--) {
        out[i] = Number(n & 0xffn);
        n >>= 8n;
    }
    return out;
}

function modPow(base, exp, mod) {
    let result = 1n;
    base %= mod;
    while (exp > 0n) {
        if (exp & 1n) result = (result * base) % mod;
        base = (base * base) % mod;
        exp >>= 1n;
    }
    return result;
}

// WebCrypto will not encrypt with PKCS#1 v1.5, but it will parse the key for us:
// import it under any RSA algorithm, export the JWK, and the modulus and exponent are
// there to raise by hand.
let rsaParamsPromise = null;
function rsaParams() {
    if (!rsaParamsPromise) {
        rsaParamsPromise = (async () => {
            const key = await crypto.subtle.importKey(
                'spki', b64ToBytes(PUB_KEY_B64), { name: 'RSA-OAEP', hash: 'SHA-1' }, true, ['encrypt']);
            const jwk = await crypto.subtle.exportKey('jwk', key);
            const n = b64urlToBigInt(jwk.n);
            let k = 0;
            for (let t = n; t > 0n; t >>= 8n) k++;
            return { n, e: b64urlToBigInt(jwk.e), k };
        })();
    }
    return rsaParamsPromise;
}

async function rsaEncrypt(text) {
    const { n, e, k } = await rsaParams();
    const msg = enc.encode(text);
    if (msg.length > k - 11) throw new Error('too long for one RSA block');

    // EM = 0x00 || 0x02 || non-zero padding || 0x00 || message
    const psLen = k - msg.length - 3;
    const ps = new Uint8Array(psLen);
    crypto.getRandomValues(ps);
    for (let i = 0; i < psLen; i++) if (ps[i] === 0) ps[i] = 1 + (i % 254);

    const em = new Uint8Array(k);
    em[0] = 0x00;
    em[1] = 0x02;
    em.set(ps, 2);
    em[2 + psLen] = 0x00;
    em.set(msg, 3 + psLen);

    let m = 0n;
    for (const b of em) m = (m << 8n) | BigInt(b);
    return bytesToB64(bigIntToBytes(modPow(m, e, n), k));
}

async function deflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

function randomHex(byteLength) {
    const b = new Uint8Array(byteLength);
    crypto.getRandomValues(b);
    return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// The hex strings are used as text, so 16 random bytes make a 32-character key
// (AES-256) and 8 make a 16-character IV — the sizes their bundle picks.
async function seal(params) {
    const keyText = randomHex(16);
    const ivText = randomHex(8);
    const aesKey = await crypto.subtle.importKey('raw', enc.encode(keyText), 'AES-CBC', false, ['encrypt', 'decrypt']);
    const packed = await deflateRaw(enc.encode(JSON.stringify(params)));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: enc.encode(ivText) }, aesKey, packed));

    return {
        fields: {
            data: bytesToB64(cipher),
            key: await rsaEncrypt(keyText),
            iv: await rsaEncrypt(ivText),
            req_code: 4
        },
        async open(b64) {
            const plain = new Uint8Array(await crypto.subtle.decrypt(
                { name: 'AES-CBC', iv: enc.encode(ivText) }, aesKey, b64ToBytes(b64)));
            return JSON.parse(dec.decode(await inflateRaw(plain)));
        }
    };
}

// Returns { ok, data, msg } — msg carries their code and message when a call is
// refused, which is how a stale token stays visible instead of looking like
// "this item has no QC photos".
async function post(env, path, params, image, extraHeaders) {
    if (!kakobuyEnabled(env)) return { ok: false, data: null, msg: 'no token' };

    const payload = { ...BASE_PAYLOAD, uuid: CLIENT_UUID, token: env.KAKOBUY_TOKEN.trim(), ...params };

    let envelope;
    try { envelope = await seal(payload); }
    catch { return { ok: false, data: null, msg: 'seal failed' }; }

    const headers = {
        'User-Agent': UA,
        'lang': 'en',
        'Origin': 'https://www.kakobuy.com',
        'Referer': 'https://www.kakobuy.com/',
        ...(extraHeaders || {})
    };

    let body;
    if (image) {
        // Their wrapper lifts the file out of the payload and posts it alongside the
        // sealed fields as multipart.
        const fd = new FormData();
        for (const [k, v] of Object.entries(envelope.fields)) fd.append(k, String(v));
        fd.append('image', image);
        body = fd;
    } else {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(envelope.fields);
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
    if (!j) return { ok: false, data: null, msg: 'empty' };

    // 202 is a sealed answer, 200 carries data in the clear. Anything else is a
    // refusal — 1005/1055 mean the token is missing or stale.
    if (j.code === 202) {
        try { return { ok: true, data: await envelope.open(j.data), msg: null, sealed: true }; }
        catch { return { ok: false, data: null, msg: 'unseal failed', sealed: true }; }
    }
    if (j.code === 200) return { ok: true, data: j.data, msg: null, sealed: false };
    return { ok: false, data: null, msg: `${j.code} ${j.msg || ''}`.trim(), sealed: false };
}

// Escape hatch for probing their API: same envelope, arbitrary params.
export function kakobuyPost(env, path, params, image, extraHeaders) {
    return post(env, path, params, image, extraHeaders);
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
