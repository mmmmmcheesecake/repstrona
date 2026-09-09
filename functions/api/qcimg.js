export const ALLOWED_HOST_SUFFIXES = [
    '.vectoreps.pl',
    '.qcitems.com',
    '.usfans.com',
    '.kakobuy.com',
    // kakobuy serves the same files from a kakobyy.com spelling of its own name, and
    // qcitems hands out both. Six hundred photos in a sample of twenty-five products
    // came from it, every one of them refused here — which is why galleries appeared
    // for a moment and then emptied themselves tile by tile.
    '.kakobyy.com',
    '.cnfans.com',
    '.uufinds.com',
    '.oopbuy.com',
    // acbuy's photos are on the .cn domain, not the .com one their site uses.
    '.acbuy.com',
    '.acbuy.cn',
    '.yupoo.com',
    // taobao/1688 product images. cbu01.alicdn.com 403s any request carrying a
    // replug24 Referer, so these have to come through the proxy, which sends none.
    '.alicdn.com',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

export function hostAllowed(hostname) {
    const h = (hostname || '').toLowerCase();
    if (!h) return false;
    return ALLOWED_HOST_SUFFIXES.some(suffix => h === suffix.slice(1) || h.endsWith(suffix));
}

function b64urlDecode(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
}

export async function onRequest(ctx) {
    const u = new URL(ctx.request.url).searchParams.get('u');
    if (!u) return new Response('missing u', { status: 400 });

    let original;
    try { original = b64urlDecode(u); }
    catch { return new Response('invalid token', { status: 400 }); }

    let target;
    try { target = new URL(original); } catch { return new Response('invalid url', { status: 400 }); }
    if (target.protocol !== 'https:') {
        return new Response('forbidden protocol', { status: 403 });
    }
    if (!hostAllowed(target.hostname)) {
        return new Response('host not allowed', { status: 403 });
    }

    // The agents' CDNs are the only copy of these photos, and one of them has already
    // gone dark on us this month: qcitems' bucket started answering 403 to everyone and
    // took every set it hosted with it. Anything served through here gets kept, so the
    // next time a host disappears the photos are still ours to show. Dormant until an
    // R2 bucket is bound as QC_ARCHIVE — without it this file behaves exactly as before.
    const archive = ctx.env?.QC_ARCHIVE || null;
    const key = archive ? await archiveKey(original) : null;

    if (archive && key) {
        const kept = await archive.get(key).catch(() => null);
        if (kept) return archivedResponse(kept);
    }

    const upstreamHeaders = { 'User-Agent': UA, 'Accept': 'image/*' };
    if (/\.yupoo\.com$/i.test(target.hostname)) {
        upstreamHeaders['Referer'] = `https://${target.hostname}/`;
    }

    let upstream;
    try {
        upstream = await fetch(target.href, {
            headers: upstreamHeaders,
            cf: { cacheTtl: 86400, cacheEverything: true }
        });
    } catch {
        return new Response('upstream failed', { status: 502 });
    }
    if (!upstream.ok) return new Response('upstream error', { status: 502 });

    const len = Number(upstream.headers.get('content-length') || 0);
    if (len > 15 * 1024 * 1024) {
        return new Response('image too large', { status: 413 });
    }

    // Read the whole picture before answering, then serve and store the same bytes.
    // This replaced a tee'd stream whose archive branch went to waitUntil. That version
    // was abandoned on a measurement that turned out to be worthless — a shell loop
    // whose requests were failing before they reached us — so it may well have worked.
    // This one is verified end to end (eight photos, eight archived) and is the simpler
    // thing to reason about: the size is capped at 15 MB a few lines above, so holding
    // one in memory is the cheaper problem.
    let bytes;
    try { bytes = await upstream.arrayBuffer(); }
    catch { return new Response('upstream failed', { status: 502 }); }

    const declared = (upstream.headers.get('content-type') || '').toLowerCase();
    let contentType = declared.startsWith('image/') ? declared : '';

    // media.usfans.com serves perfectly good JPEGs as application/octet-stream, and
    // nosniff means the browser will not rescue them — every USFans QC photo showed
    // as a broken tile. Trust the bytes over the header.
    if (!contentType) {
        contentType = sniffImageBytes(new Uint8Array(bytes));
        if (!contentType) return new Response('upstream is not an image', { status: 502 });
    }

    if (archive && key) {
        ctx.waitUntil(
            archive.put(key, bytes, {
                httpMetadata: { contentType },
                customMetadata: { src: original.slice(0, 900) },
            }).catch(() => {})
        );
    }

    const headers = new Headers();
    headers.set('content-type', contentType);
    headers.set('cache-control', 'public, max-age=86400, immutable');
    headers.set('x-content-type-options', 'nosniff');
    return new Response(bytes, { status: 200, headers });
}

function sniffImageBytes(b) {
    if (b.length < 12) return null;
    for (const [type, test] of MAGIC) {
        if (test(b)) return type;
    }
    return null;
}

// Content-addressed by the URL that produced it, resize parameters included — a 400px
// tile and a 1600px lightbox frame are different pictures and both are worth keeping.
async function archiveKey(originalUrl) {
    try {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(originalUrl));
        const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
        return `img/${hex.slice(0, 2)}/${hex}`;
    } catch { return null; }
}

function archivedResponse(object) {
    const headers = new Headers();
    headers.set('content-type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('cache-control', 'public, max-age=86400, immutable');
    headers.set('x-content-type-options', 'nosniff');
    headers.set('x-qc-archive', 'hit');
    return new Response(object.body, { status: 200, headers });
}

const MAGIC = [
    ['image/jpeg', b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
    ['image/png', b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
    ['image/gif', b => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46],
    ['image/webp', b => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50],
    ['image/avif', b => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 &&
        b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66],
    ['image/bmp', b => b[0] === 0x42 && b[1] === 0x4d],
];

