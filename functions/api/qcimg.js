const ALLOWED_HOST_SUFFIXES = [
    '.vectoreps.pl',
    '.qcitems.com',
    '.usfans.com',
    '.kakobuy.com',
    '.cnfans.com',
    '.uufinds.com',
    '.oopbuy.com',
    '.yupoo.com',
    // taobao/1688 product images. cbu01.alicdn.com 403s any request carrying a
    // replug24 Referer, so these have to come through the proxy, which sends none.
    '.alicdn.com',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function hostAllowed(hostname) {
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

    const declared = (upstream.headers.get('content-type') || '').toLowerCase();
    let contentType = declared.startsWith('image/') ? declared : '';
    let body = upstream.body;

    // media.usfans.com serves perfectly good JPEGs as application/octet-stream, and
    // nosniff means the browser will not rescue them — every USFans QC photo showed
    // as a broken tile. Trust the bytes over the header: read just enough of the
    // stream to recognise the format, then hand the untouched stream on.
    if (!contentType) {
        const sniffed = await sniffImage(upstream.body);
        if (!sniffed.type) return new Response('upstream is not an image', { status: 502 });
        contentType = sniffed.type;
        body = sniffed.stream;
    }

    const headers = new Headers();
    headers.set('content-type', contentType);
    headers.set('cache-control', 'public, max-age=86400, immutable');
    headers.set('x-content-type-options', 'nosniff');
    return new Response(body, { status: 200, headers });
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

// Reads the first bytes off the stream to identify the format, then replays them in
// front of the rest so nothing is buffered beyond the header.
async function sniffImage(stream) {
    const reader = stream.getReader();
    const head = [];
    let seen = 0;
    while (seen < 16) {
        let chunk;
        try { chunk = await reader.read(); }
        catch { return { type: null }; }
        if (chunk.done) break;
        if (chunk.value?.length) {
            head.push(chunk.value);
            seen += chunk.value.length;
        }
    }

    const probe = new Uint8Array(seen);
    let at = 0;
    for (const c of head) { probe.set(c, at); at += c.length; }

    const hit = MAGIC.find(([, test]) => {
        try { return test(probe); } catch { return false; }
    });
    if (!hit) {
        reader.cancel().catch(() => {});
        return { type: null };
    }

    return {
        type: hit[0],
        stream: new ReadableStream({
            start(controller) { for (const c of head) controller.enqueue(c); },
            async pull(controller) {
                const { value, done } = await reader.read();
                if (done) controller.close();
                else controller.enqueue(value);
            },
            cancel(reason) { reader.cancel(reason); }
        })
    };
}
