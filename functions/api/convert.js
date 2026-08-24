// Turns any link someone pastes — a marketplace item, one of our own agent links, or
// a listing at one of the three dozen other agents — into the raw marketplace URL the
// rest of the site is built on. From there produkt.html opens it like any other item:
// our buy link, our affiliate code, the QC photos.
//
// Local parsing handles the shapes that are unambiguous, which is most of them. What
// is left goes to qcitems, whose /api/convert knows every agent's URL scheme and hands
// the raw link back under "Raw".

function json(body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: {
            'content-type': 'application/json',
            // A link is converted once, on demand; caching it saves nothing and a
            // cached failure would outlive the reason for it.
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff'
        }
    });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// usfans channels, from their own bundle: 1 = 1688, 2 = taobao, 3 = weidian.
const USFANS_CHANNEL = { '1': '1688', '2': 'taobao', '3': 'weidian' };

// Every spelling of a platform seen across the agents: cnfans and mulebuy say
// WEIDIAN, acbuy says WD, cssbuy says micro, basetao spells it out in the path.
const PLATFORM_ALIAS = {
    weidian: 'weidian', wd: 'weidian', micro: 'weidian', wei: 'weidian',
    taobao: 'taobao', tb: 'taobao',
    tmall: 'tmall', tm: 'tmall',
    '1688': '1688', alibaba: '1688', ali: '1688', al: '1688'
};

// Taobao ids are not always numeric — image search hands out opaque tokens — so the
// only thing worth insisting on is that an id looks like an id.
const ITEM_ID = /^[A-Za-z0-9_-]{6,80}$/;
const NUMERIC_ID = /^\d{6,30}$/;

function marketplaceUrl(platform, id) {
    switch (platform) {
        case 'weidian': return `https://weidian.com/item.html?itemID=${encodeURIComponent(id)}`;
        case 'taobao': return `https://item.taobao.com/item.htm?id=${encodeURIComponent(id)}`;
        case 'tmall': return `https://detail.tmall.com/item.htm?id=${encodeURIComponent(id)}`;
        case '1688': return `https://detail.1688.com/offer/${encodeURIComponent(id)}.html`;
        default: return null;
    }
}

function firstParam(params, names) {
    for (const name of names) {
        const v = params.get(name);
        if (v) return v;
    }
    return null;
}

function parseLink(raw, depth) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    if ((depth || 0) > 3) return null;

    let u;
    try { u = new URL(raw.trim()); } catch { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;

    const host = u.hostname.toLowerCase();
    let path;
    try { path = decodeURIComponent(u.pathname); } catch { path = u.pathname; }

    // The marketplaces themselves.
    if (host === 'weidian.com' || host.endsWith('.weidian.com')) {
        const id = firstParam(u.searchParams, ['itemID', 'itemId', 'offerId']);
        if (id && NUMERIC_ID.test(id)) return { platform: 'weidian', id };
    }
    if (host === 'taobao.com' || host.endsWith('.taobao.com')) {
        const id = u.searchParams.get('id') || (path.match(/\/i(\d+)\.htm/) || [])[1];
        if (id && ITEM_ID.test(id)) return { platform: 'taobao', id };
    }
    if (host === 'tmall.com' || host.endsWith('.tmall.com')) {
        const id = u.searchParams.get('id');
        if (id && ITEM_ID.test(id)) return { platform: 'tmall', id };
    }
    if (host === '1688.com' || host.endsWith('.1688.com')) {
        const m = path.match(/\/offer\/(\d+)\.html/);
        if (m) return { platform: '1688', id: m[1] };
    }

    // usfans, which is where our own links point.
    if (host === 'usfans.com' || host.endsWith('.usfans.com')) {
        const m = path.match(/\/product\/(\d)\/([A-Za-z0-9_-]+)/);
        const platform = m && USFANS_CHANNEL[m[1]];
        if (platform && ITEM_ID.test(m[2])) return { platform, id: m[2] };
    }

    // Agents that carry the marketplace URL in a parameter: kakobuy, superbuy, hagobuy,
    // itaobuy, loongbuy, ossbuy, hubbuycn, kameymall, blikbuy, ezbuycn and others.
    const nested = firstParam(u.searchParams, ['url', 'link', 'productLink', 'key', 'goodsUrl', 'goods_url']);
    if (nested) {
        let inner = nested;
        // fishgoo double-encodes; unwrap until it stops changing.
        for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(inner); i++) {
            let next;
            try { next = decodeURIComponent(inner); } catch { break; }
            if (next === inner) break;
            inner = next;
        }
        const found = parseLink(inner, (depth || 0) + 1);
        if (found) return found;
    }

    // Agents that name the platform and the id in the query: cnfans, mulebuy, joyabuy,
    // orientdig, lovegobuy, acbuy, joyagoo.
    const named = firstParam(u.searchParams, ['platform', 'shop_type', 'shopType', 'source', 'shop']);
    const id = firstParam(u.searchParams, ['id', 'goodsId', 'goods_id', 'offerId', 'itemId', 'itemID']);
    if (named && id) {
        const platform = PLATFORM_ALIAS[named.toLowerCase()];
        if (platform && ITEM_ID.test(id)) return { platform, id };
    }

    // Agents that put both in the path: oopbuy, cnshopper, hipobuy, litbuy, whalebuy,
    // basetao. Numeric channels (hoobuy, gtbuy, ponybuy) are left to qcitems, since
    // every one of them numbers the marketplaces differently.
    const inPath = path.match(/\/(?:products?|item)(?:\/agent)?\/([a-z0-9]+)\/([A-Za-z0-9_-]+)/i);
    if (inPath) {
        const platform = PLATFORM_ALIAS[inPath[1].toLowerCase()];
        const pathId = inPath[2].replace(/\.html?$/i, '');
        if (platform && ITEM_ID.test(pathId)) return { platform, id: pathId };
    }

    // cssbuy: item-micro-<id>.html for weidian, item-1688-<id>.html, item-<id>.html
    // for taobao.
    const css = path.match(/\/item-(?:([a-z0-9]+)-)?(\d{6,30})\.html/i);
    if (css) {
        const platform = css[1] ? PLATFORM_ALIAS[css[1].toLowerCase()] : 'taobao';
        if (platform) return { platform, id: css[2] };
    }

    return null;
}

// qcitems knows every agent's scheme and answers with the raw link under "Raw".
// Without a qcitems.com Referer their API answers 403 to everything.
async function convertViaQcitems(link) {
    let r;
    try {
        r = await fetch(`https://qcitems.com/api/convert?link=${encodeURIComponent(link)}`, {
            headers: {
                'User-Agent': UA,
                'Accept': 'application/json',
                'Referer': 'https://qcitems.com/',
                'Origin': 'https://qcitems.com'
            }
        });
    } catch { return null; }
    if (!r.ok) return null;

    let j;
    try { j = await r.json(); } catch { return null; }
    if (!j || typeof j.Raw !== 'string') return null;

    // Their Raw is the link they were given when they cannot place it either, so it
    // only counts once it parses as a marketplace item.
    return parseLink(j.Raw, 0);
}

export async function onRequest(ctx) {
    const link = new URL(ctx.request.url).searchParams.get('link');
    if (!link || !link.trim()) return json({ error: 'missing link' }, 400);
    if (link.length > 2048) return json({ error: 'link too long' }, 400);

    let found = parseLink(link, 0);
    let source = 'local';
    if (!found) {
        found = await convertViaQcitems(link);
        source = 'qcitems';
    }

    if (!found) return json({ error: 'unsupported link' }, 404);

    const url = marketplaceUrl(found.platform, found.id);
    if (!url) return json({ error: 'unsupported link' }, 404);

    return json({ url, platform: found.platform, id: found.id, source });
}
