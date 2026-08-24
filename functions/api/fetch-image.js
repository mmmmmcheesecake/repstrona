// Fetches an image the visitor pasted as a link and hands it back inline, so the page
// can carry on exactly as if the picture had been uploaded: same preview, same crop,
// same search path — weidian still asked from the browser, where usfans answers.
//
// The page cannot do this itself: other people's domains do not allow a browser on our
// origin to read their images.

function json(body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
        }
    });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
// Enough for anything worth searching by, small enough to base64 without trouble.
const MAX_BYTES = 4 * 1024 * 1024;

function bytesToBase64(bytes) {
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
}

export async function onRequest(ctx) {
    const raw = new URL(ctx.request.url).searchParams.get('url');
    if (!raw) return json({ error: 'missing url' }, 400);

    let target;
    try { target = new URL(raw); } catch { return json({ error: 'invalid url' }, 400); }
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
        return json({ error: 'invalid url' }, 400);
    }

    let r;
    try {
        r = await fetch(target.href, {
            headers: { 'User-Agent': UA, 'Accept': 'image/*' },
            cf: { cacheTtlByStatus: { '200-299': 600, '300-599': 0 }, cacheEverything: true }
        });
    } catch {
        return json({ error: 'unreachable' }, 502);
    }
    if (!r.ok) return json({ error: 'unreachable' }, 502);

    const type = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!type.startsWith('image/')) return json({ error: 'not an image' }, 415);
    if (Number(r.headers.get('content-length') || 0) > MAX_BYTES) {
        return json({ error: 'too large' }, 413);
    }

    let bytes;
    try { bytes = new Uint8Array(await r.arrayBuffer()); } catch { return json({ error: 'unreachable' }, 502); }
    if (!bytes.length) return json({ error: 'not an image' }, 415);
    if (bytes.length > MAX_BYTES) return json({ error: 'too large' }, 413);

    return json({ dataUrl: `data:${type};base64,${bytesToBase64(bytes)}`, type, bytes: bytes.length });
}
