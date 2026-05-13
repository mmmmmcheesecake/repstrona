const SHEET_IDS = {
    men:   '1pc2KcMDWELMeQUW_ZvjHEvDa56inb3IcoHJ9STyGVkk',
    women: '1TraN-QZhqFgzaCSKgfqWhIG0BHSBq0jyktaU7i_pjco',
};

const BATCH_TOKEN_RE = /\b(LJR|BD|DG|PK|UA|OG|MAS|GD|REP|GP|G5|H12|TS|OWF|HC|BATCH)\b/gi;

function normalizeNameKey(name) {
    return (name || '')
        .toLowerCase()
        .replace(BATCH_TOKEN_RE, '')
        .replace(/[^a-z0-9 ]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stripBatchFromName(name) {
    return (name || '')
        .replace(BATCH_TOKEN_RE, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.])/g, '$1')
        .trim()
        .replace(/[\s,;:-]+$/, '');
}

function parsePriceNum(s) {
    const n = parseFloat(String(s || '').replace(/[^0-9.]/g, ''));
    return isFinite(n) && n > 0 ? n : Infinity;
}

function pickCheapest(group) {
    return group.reduce((best, p) => parsePriceNum(p.price) < parsePriceNum(best.price) ? p : best, group[0]);
}

function groupByImageOrLink(products) {
    const groups = new Map();
    let solo = 0;
    for (const p of products) {
        const img = (p.image || '').trim();
        const link = (p.link || '').trim();
        const key = img || link || `__solo_${solo++}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
    }
    const merged = [];
    for (const group of groups.values()) {
        if (group.length === 1) {
            merged.push(group[0]);
            continue;
        }
        const rep = pickCheapest(group);
        merged.push({ ...rep, name: stripBatchFromName(rep.name), batch: '' });
    }
    return merged;
}

function dedupByLink(products) {
    const groups = new Map();
    let solo = 0;
    const order = [];
    for (const p of products) {
        const link = (p.link || '').trim();
        const key = link || `__solo_${solo++}`;
        if (!groups.has(key)) {
            groups.set(key, []);
            order.push(key);
        }
        groups.get(key).push(p);
    }
    return order.map(k => {
        const arr = groups.get(k);
        return arr.length === 1 ? arr[0] : pickCheapest(arr);
    });
}

function isKakobuyLink(link) {
    return /(?:^|\/\/|\.)kakobuy\.com\//i.test(link || '');
}

function dropKakobuyDuplicates(products) {
    const nonKakoNames = new Set();
    for (const p of products) {
        if (isKakobuyLink(p.link)) continue;
        const key = normalizeNameKey(p.name);
        if (key) nonKakoNames.add(key);
    }
    return products.filter(p => {
        if (!isKakobuyLink(p.link)) return true;
        const key = normalizeNameKey(p.name);
        if (!key) return true;
        return !nonKakoNames.has(key);
    });
}

function dedupByName(products) {
    const seen = new Map();
    let solo = 0;
    const score = x => (x.imageOverride ? 8 : 0) + (x.tileImage ? 4 : 0) + (x.image ? 2 : 0) + (x.budgetLink ? 1 : 0);
    for (const p of products) {
        const key = normalizeNameKey(p.name);
        if (!key) {
            seen.set(`__solo_${solo++}`, p);
            continue;
        }
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, p);
            continue;
        }
        const better = score(p) > score(existing) ? p : existing;
        seen.set(key, {
            ...better,
            image: better.image || existing.image || p.image,
            imageOverride: better.imageOverride || existing.imageOverride || p.imageOverride,
            tileImage: better.tileImage || existing.tileImage || p.tileImage,
            budgetLink: better.budgetLink || existing.budgetLink || p.budgetLink,
            name: stripBatchFromName(better.name),
            batch: '',
        });
    }
    return Array.from(seen.values());
}

function normalizeRef(url) {
    if (!url) return url;
    try {
        const u = new URL(url);
        u.searchParams.delete('ref');
        u.searchParams.set('ref', 'MGRSBE');
        return u.toString();
    } catch { return url; }
}

function cleanCellError(s) {
    if (!s) return s;
    if (/^#(REF|N\/A|ERROR|VALUE|NAME)!/i.test(String(s).trim())) return '';
    return s;
}

function clusterByName(products) {
    const groups = new Map();
    let solo = 0;
    for (const p of products) {
        const key = normalizeNameKey(p.name) || `__solo_${solo++}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
    }
    const out = [];
    for (const arr of groups.values()) out.push(...arr);
    return out;
}

const WEIDIAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const WEIDIAN_REFERER = 'https://h5.weidian.com/';
const CNY_PER_USD = 7.2;

function parseWeidianShopId(link) {
    if (!link) return null;
    try {
        const u = new URL(link);
        if (!/(^|\.)weidian\.com$/i.test(u.hostname)) return null;
        if (/item\.html/i.test(u.pathname)) return null;
        const userid = u.searchParams.get('userid');
        if (userid && /^\d+$/.test(userid)) return userid;
        const m = u.hostname.match(/^shop(\d+)\.weidian\.com$/i);
        if (m) return m[1];
        return null;
    } catch { return null; }
}

async function thorGet(path, params) {
    const url = `https://thor.weidian.com${path}?param=${encodeURIComponent(JSON.stringify(params))}`;
    try {
        const r = await fetch(url, {
            headers: { 'Referer': WEIDIAN_REFERER, 'User-Agent': WEIDIAN_UA },
            cf: { cacheTtl: 600, cacheEverything: true },
        });
        if (!r.ok) return null;
        const data = await r.json();
        if (data?.status?.code !== 0) return null;
        return data.result;
    } catch { return null; }
}

async function fetchWeidianCategoryItems(shopId, cateId, total) {
    const limit = 20;
    const pages = Math.max(1, Math.ceil((total || limit) / limit));
    const fetches = [];
    for (let i = 0; i < pages; i++) {
        fetches.push(thorGet('/decorate/itemCate.getCateItemList/1.0', {
            cateId: String(cateId),
            shopId: String(shopId),
            offset: i * limit,
            limit,
            sortField: 'all',
            sortType: 'desc',
            from: 'h5',
            isQdFx: false,
            isHideSold: false,
        }));
    }
    const pageResults = await Promise.all(fetches);
    const items = [];
    for (const res of pageResults) {
        if (res?.itemList) items.push(...res.itemList);
    }
    return items;
}

function cleanWeidianName(name) {
    let n = String(name || '');
    n = n.replace(/【[^】]*】/g, ' ');
    n = n.replace(/系列合集|综合链接|系列|合集|链接\d*|新配色/g, ' ');
    n = n.replace(/\*ordan/gi, 'Jordan');
    n = n.replace(/Tr\*vis/gi, 'Travis');
    n = n.replace(/Sc\*tt/gi, 'Scott');
    n = n.replace(/D\*\*r/gi, 'Dior');
    n = n.replace(/\*alenciaga/gi, 'Balenciaga');
    n = n.replace(/\*eezy/gi, 'Yeezy');
    n = n.replace(/\*ike/gi, 'Nike');
    n = n.replace(/\*ir\s*[jJ]/g, 'Air J');
    n = n.replace(/\*ir/gi, 'Air');
    n = n.replace(/[一-鿿]+/g, ' ');
    n = n.replace(/\*/g, '');
    n = n.replace(/\s+/g, ' ').trim();
    return n;
}

function weidianBrandModel(cateName) {
    const c = String(cateName || '').toLowerCase();
    if (c.includes('jordan')) return { brand: 'Jordan', model: 'Other' };
    if (c.includes('air max')) return { brand: 'Nike', model: 'Air Max' };
    if (c.includes('nike') || c.includes('dunk') || c.includes('af1') || c.includes('kobe')) return { brand: 'Nike', model: 'Other' };
    if (c.includes('balenciaga') || c.includes('巴黎')) return { brand: 'Balenciaga', model: 'Other' };
    if (c.includes('louis vuitton') || /\blv\b/.test(c)) return { brand: 'Louis Vuitton', model: 'Other' };
    if (c.includes('dior')) return { brand: 'Dior', model: 'Other' };
    if (c.includes('yeezy')) return { brand: 'Yeezy', model: 'Other' };
    if (c.includes('bape')) return { brand: 'Bape', model: 'Other' };
    if (c.includes('balance')) return { brand: 'New Balance', model: 'Other' };
    if (c.includes('asics')) return { brand: 'Asics', model: 'Other' };
    if (c.includes('adidas') || c.includes('samba') || c.includes('gazelle')) return { brand: 'Adidas', model: 'Other' };
    if (c.includes('mcqueen')) return { brand: 'Alexander McQueen', model: 'Other' };
    if (c.includes('off-white') || c.includes('off white')) return { brand: 'Off-White', model: 'Other' };
    if (c.includes('amiri')) return { brand: 'Amiri', model: 'Other' };
    if (c.includes('burberry')) return { brand: 'Burberry', model: 'Other' };
    if (c.includes('ugg')) return { brand: 'UGG', model: 'Other' };
    if (c.includes('timberland')) return { brand: 'Timberland', model: 'Other' };
    if (c.includes('bottega')) return { brand: 'Bottega Veneta', model: 'Other' };
    if (c.includes('louboutin')) return { brand: 'Christian Louboutin', model: 'Other' };
    if (c.includes('birkenstock')) return { brand: 'Birkenstock', model: 'Other' };
    if (c.includes('mihara')) return { brand: 'Maison Mihara Yasuhiro', model: 'Other' };
    if (c.includes('golden goose')) return { brand: 'Golden Goose', model: 'Other' };
    if (c.includes('lanvin')) return { brand: 'Lanvin', model: 'Other' };
    if (c.includes('rick owens')) return { brand: 'Rick Owens', model: 'Other' };
    return { brand: 'Other', model: 'Other' };
}

function weidianItemToProduct(item, cateName) {
    const name = cleanWeidianName(item.itemName);
    if (!name) return null;
    const bm = weidianBrandModel(cateName);
    const cnyNum = parseFloat(item.price);
    const usd = isFinite(cnyNum) && cnyNum > 0 ? Math.round(cnyNum / CNY_PER_USD) : null;
    return {
        name,
        batch: '',
        link: normalizeRef(item.itemUrl || `https://weidian.com/item.html?itemID=${item.itemId}`),
        price: usd != null ? `$${usd}` : '',
        livePrice: usd,
        image: item.itemImg || '',
        description: '',
        budgetLink: null,
        categoryOverride: 'Sellers',
        brandOverride: bm.brand,
        modelOverride: bm.model,
        imageOverride: null,
        tileImage: null,
    };
}

async function fetchWeidianShop(shopId) {
    const tree = await thorGet('/decorate/itemCate.getCateTree/1.0', {
        shopId: String(shopId),
        from: 'h5',
    });
    const topCates = tree?.cateList || [];
    if (!topCates.length) return [];

    const perCate = await Promise.all(topCates.map(c =>
        fetchWeidianCategoryItems(shopId, c.cateId, c.speCateItemNum)
            .then(items => ({ cate: c, items }))
    ));

    const seen = new Set();
    const out = [];
    for (const { cate, items } of perCate) {
        for (const it of items) {
            if (!it?.itemId || seen.has(it.itemId)) continue;
            seen.add(it.itemId);
            const p = weidianItemToProduct(it, cate.cateName);
            if (p) out.push(p);
        }
    }
    return out;
}

function compact(p) {
    const out = {
        name: p.name,
        link: p.link,
    };
    if (p.batch) out.batch = p.batch;
    if (p.price) out.price = p.price;
    if (p.image) out.image = p.image;
    if (p.description) out.description = p.description;
    if (p.budgetLink) out.budgetLink = p.budgetLink;
    if (p.categoryOverride) out.categoryOverride = p.categoryOverride;
    if (p.brandOverride) out.brandOverride = p.brandOverride;
    if (p.modelOverride) out.modelOverride = p.modelOverride;
    if (p.imageOverride) out.imageOverride = p.imageOverride;
    if (p.tileImage) out.tileImage = p.tileImage;
    if (p.livePrice != null) out.livePrice = p.livePrice;
    return out;
}

export async function onRequest(ctx) {
    const apiKey = ctx.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return new Response('Brak GOOGLE_API_KEY w env', { status: 500 });
    }

    const genderParam = new URL(ctx.request.url).searchParams.get('gender');
    const gender = genderParam === 'women' ? 'women' : 'men';
    const sheetId = SHEET_IDS[gender];
    const hasHeaderRow = gender !== 'women';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}` +
        `?fields=sheets.data.rowData.values(formattedValue,hyperlink)` +
        `&includeGridData=true&key=${apiKey}`;

    const r = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) {
        return new Response(`Sheets API error: ${r.status}`, { status: 502 });
    }
    const json = await r.json();

    const rows = json?.sheets?.[0]?.data?.[0]?.rowData ?? [];
    const products = [];
    const shopIds = new Set();
    let isHeader = hasHeaderRow;

    for (const row of rows) {
        const cells = row.values ?? [];
        if (isHeader) { isHeader = false; continue; }
        const get = (i) => cells[i] || {};
        const name = (get(0).formattedValue || '').trim();
        const link = get(2).hyperlink || null;

        if (!link) continue;

        if (!name) {
            const shopId = parseWeidianShopId(link);
            if (shopId) shopIds.add(shopId);
            continue;
        }

        products.push({
            name,
            batch:       (get(1).formattedValue || '').trim(),
            link:        normalizeRef(link),
            price:       (get(3).formattedValue || '').trim(),
            image:       cleanCellError(get(4).hyperlink || (get(4).formattedValue || '').trim()) || '',
            description: (get(5).formattedValue || '').trim(),
            budgetLink:  normalizeRef(get(6).hyperlink) || null,
            categoryOverride: (get(7).formattedValue || '').trim() || null,
            brandOverride:    (get(8).formattedValue || '').trim() || null,
            modelOverride:    (get(9).formattedValue || '').trim() || null,
            imageOverride:    cleanCellError(get(10).hyperlink || (get(10).formattedValue || '').trim()) || null,
            tileImage:        cleanCellError(get(11).hyperlink || (get(11).formattedValue || '').trim()) || null,
        });
    }

    const deduped = clusterByName(dropKakobuyDuplicates(dedupByLink(groupByImageOrLink(products)))).map(compact);

    const sellerProducts = shopIds.size
        ? (await Promise.all([...shopIds].map(fetchWeidianShop))).flat().map(compact)
        : [];

    return new Response(JSON.stringify([...deduped, ...sellerProducts]), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=900',
            'X-Content-Type-Options': 'nosniff',
        }
    });
}
