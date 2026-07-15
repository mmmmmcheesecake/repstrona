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

    const headers = new Headers();
    const ct = upstream.headers.get('content-type') || '';
    if (!ct.toLowerCase().startsWith('image/')) {
        return new Response('upstream is not an image', { status: 502 });
    }
    const len = Number(upstream.headers.get('content-length') || 0);
    if (len > 15 * 1024 * 1024) {
        return new Response('image too large', { status: 413 });
    }
    headers.set('content-type', ct);
    headers.set('cache-control', 'public, max-age=86400, immutable');
    headers.set('x-content-type-options', 'nosniff');
    return new Response(upstream.body, { status: 200, headers });
}
