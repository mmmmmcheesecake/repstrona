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
        merged.push({ ...rep, name: stripBatchFromName(rep.name), batch: '', featured: group.some(p => p.featured) });
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
        if (arr.length === 1) return arr[0];
        return { ...pickCheapest(arr), featured: arr.some(p => p.featured) };
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

// Column N ("featured_items"): any non-empty, non-falsey mark means featured.
function isFeatured(v) {
    const s = String(v || '').trim().toLowerCase();
    if (!s) return false;
    return !['0', 'false', 'no', 'nie', 'n', '-', 'off'].includes(s);
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

function b64urlEncode(s) {
    return btoa(unescape(encodeURIComponent(s)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function proxyYupooImage(url) {
    if (!url) return url;
    try {
        const u = new URL(url);
        if (!/\.yupoo\.com$/i.test(u.hostname)) return url;
        return `/api/qcimg?u=${b64urlEncode(url)}`;
    } catch { return url; }
}

// Shops that cannot work on the site. Either the source is gone/blocked, or the
// albums carry no marketplace link so nothing in them can be opened at the agent.
// Verified 2026-07-15 — recheck before adding, since a shop returning no items is
// usually a transient upstream failure rather than a dead shop.
const DISABLED_SHOPS = new Set([
    'yp-simple2899',       // yupoo 404 — gone
    'yp-repsking',         // yupoo 403 — blocked
    'yp-cprepscn',         // yupoo 200 but zero albums
    '1676081342',          // weidian 302 — gone
    'yp-artiemaster',      // no agent link in any album (0/14 sampled)
    'yp-chaorenqihaodian', // no agent link in any album (0/14 sampled)
]);

function parseWeidianShopId(link) {
    if (!link) return null;
    try {
        const u = new URL(link);
        if (!/(^|\.)weidian\.com$/i.test(u.hostname)) return null;
        if (/item\.html/i.test(u.pathname)) return null;
        const userid = u.searchParams.get('userid');
        if (userid && /^\d+$/.test(userid)) return userid;
        const m = u.hostname.match(/^shop(\d+)(?:\.v)?\.weidian\.com$/i);
        if (m) return m[1];
        return null;
    } catch { return null; }
}

function parseYupooSubdomain(link) {
    if (!link) return null;
    try {
        const u = new URL(link);
        const m = u.hostname.match(/^([a-zA-Z0-9-]+)\.x\.yupoo\.com$/i);
        return m ? m[1].toLowerCase() : null;
    } catch { return null; }
}

function parseShopFromLink(link) {
    const weidianId = parseWeidianShopId(link);
    if (weidianId) return weidianId;
    const yupooSub = parseYupooSubdomain(link);
    if (yupooSub) return `yp-${yupooSub}`;
    return null;
}

function extractYupooFromHtml(html) {
    if (!html) return null;
    const decoded = html.replace(/&#34;/g, '"').replace(/&amp;/g, '&').replace(/\\n/g, '\n');
    const m = decoded.match(/[Yy]upoo[^a-zA-Z0-9]+(https?:\/\/[a-zA-Z0-9.-]+\.yupoo\.com[^\s"<,]*)/);
    if (!m) return null;
    try {
        const u = new URL(m[1]);
        return `https://${u.hostname}`;
    } catch { return null; }
}

async function fetchWeidianShopMeta(shopId) {
    try {
        const r = await fetch(`https://weidian.com/?userid=${shopId}`, {
            headers: { 'User-Agent': WEIDIAN_UA },
            cf: { cacheTtl: 1800, cacheEverything: true },
        });
        if (!r.ok) return null;
        const html = await r.text();
        const nameM = html.match(/&#34;shopName&#34;:&#34;([^&]+)&#34;/);
        const name = nameM ? nameM[1].trim() : null;
        const yupooUrl = extractYupooFromHtml(html);
        return (name || yupooUrl) ? { name, yupooUrl } : null;
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

// Placeholder listings every weidian shop keeps around: price-difference top-ups,
// shipping fees, deposits, "contact me before ordering" links. They are not products.
const WEIDIAN_JUNK_RE = /(一元|1元|补差价|差价|运费|邮费|定金|拍前联系|勿拍)/;

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

// Shops that mirror their catalogue on yupoo get english titles from there. Shops
// that do not are chinese-only, and cleanWeidianName() — which exists to strip the
// chinese noise off mixed titles — leaves them as a bare SKU or as nothing at all.
// Nameless items are dropped, so such a shop shows up empty. Clothing vocabulary is
// small and repetitive, so a glossary covers most of it; whatever is left over stays
// in chinese rather than disappearing.
const CN_GARMENTS = [
    ['卫衣', 'Hoodie'], ['连帽衫', 'Hoodie'], ['卫裤', 'Sweatpants'], ['短袖', 'Tee'],
    ['长袖', 'Long Sleeve'], ['牛仔裤', 'Jeans'], ['阔腿裤', 'Wide-Leg Pants'],
    ['短裤', 'Shorts'], ['裤子', 'Pants'], ['长裤', 'Pants'], ['拉链衫', 'Zip-Up'],
    ['开衫', 'Cardigan'], ['针织衫', 'Knit'], ['POLO衫', 'Polo'], ['polo衫', 'Polo'],
    ['衬衫', 'Shirt'], ['风衣', 'Windbreaker'], ['夹克', 'Jacket'], ['外套', 'Jacket'],
    ['羽绒服', 'Puffer'], ['马甲', 'Vest'], ['球衣', 'Jersey'], ['棒球帽', 'Cap'],
    ['冷帽', 'Beanie'], ['背包', 'Backpack'], ['挂件', 'Keychain'], ['袜子', 'Socks'],
    ['皮带', 'Belt'], ['腰带', 'Belt'], ['套装', 'Set'], ['TEE', 'Tee'], ['Tee', 'Tee'],
];

const CN_TERMS = [
    // noise the shops glue onto every title
    ['系列合集', ''], ['综合链接', ''], ['男女同款', ''], ['新配色', ''], ['同款', ''],
    ['系列', ''], ['合集', ''], ['链接', ''], ['现货', ''], ['预售', ''], ['包邮', ''],
    // motifs
    ['幺三零', '130'], ['骷髅', 'Skull'], ['反战', 'Anti-War'], ['战争', 'War'],
    ['十字架', 'Cross'], ['樱花', 'Sakura'], ['骑士', 'Knight'], ['天使', 'Angel'],
    ['龙纹', 'Dragon'], ['猛虎', 'Tiger'], ['虎头', 'Tiger'], ['老鹰', 'Eagle'],
    ['凤凰', 'Phoenix'], ['仙鹤', 'Crane'], ['双狮', 'Lions'], ['双马', 'Horses'],
    ['鲤鱼', 'Koi'], ['神鸟', 'Firebird'], ['武士', 'Samurai'], ['三刀流', 'Three Swords'],
    ['西部牛仔', 'Western'], ['新西部', 'New West'], ['空降部队', 'Airborne'],
    ['抢滩登陆', 'D-Day'], ['世界和平', 'World Peace'], ['百鬼夜行', 'Night Parade'],
    ['惊魂夜', 'Fright Night'], ['太阳神', 'Sun God'], ['创世纪', 'Genesis'],
    ['圣餐', 'Communion'], ['圣战', 'Crusade'], ['救赎', 'Redemption'], ['教堂', 'Church'],
    ['女巫', 'Witch'], ['鬼娃', 'Doll'], ['鬼脸', 'Ghost Face'], ['哥特', 'Gothic'],
    ['星条旗', 'Stars & Stripes'], ['国旗', 'Flag'], ['五星', 'Five Star'],
    ['红星', 'Red Star'], ['军团', 'Legion'], ['士兵', 'Soldier'], ['兵人', 'Soldier'],
    ['老兵', 'Veteran'], ['二战', 'WWII'], ['战地', 'Battlefield'], ['摄影', 'Photo'],
    ['全军冲锋', 'Charge'], ['大爆炸', 'Big Bang'], ['洗脑', 'Brainwash'],
    ['摇滚', 'Rock'], ['音符', 'Music Note'], ['大脑', 'Brain'], ['弹幕', 'Danmaku'],
    ['飞刀', 'Knife'], ['素描', 'Sketch'], ['手绘', 'Hand-Drawn'], ['草写', 'Script'],
    ['机械', 'Mecha'], ['阴阳', 'Yin Yang'], ['和风', 'Japanese'], ['月桂', 'Laurel'],
    ['花枝', 'Floral'], ['鲜花', 'Flower'], ['海浪', 'Wave'], ['太阳', 'Sun'],
    ['迷彩', 'Camo'], ['格子', 'Plaid'], ['条纹', 'Stripe'], ['水洗', 'Washed'],
    ['刺绣', 'Embroidered'], ['拼接', 'Patchwork'], ['撞色', 'Contrast'],
    ['假两件', 'Layered'], ['华夫格', 'Waffle'], ['羊羔绒', 'Sherpa'], ['机能', 'Tech'],
    ['原浆', 'Raw Denim'], ['缝线', 'Stitched'], ['钢印', 'Stamped'], ['破坏', 'Distressed'],
    ['撕裂', 'Ripped'], ['运动', 'Sport'], ['联名', 'Collab'], ['联邦', 'Federal'],
    ['别注版', 'Special Edition'], ['基础', 'Basic'], ['圆形', 'Round'], ['多维', 'Multi'],
    ['遗忘', 'Forgotten'], ['麻花', 'Braided'], ['防弹衣', 'Body Armor'],
    // places
    ['欧盟', 'EU'], ['巴西', 'Brazil'], ['阿根廷', 'Argentina'], ['瑞典', 'Sweden'],
    ['冰岛', 'Iceland'], ['中东', 'Middle East'],
    // colours
    ['黑白', 'Black & White'], ['黑色', 'Black'], ['灰色', 'Grey'], ['白色', 'White'],
    ['红色', 'Red'], ['蓝色', 'Blue'], ['绿色', 'Green'], ['粉色', 'Pink'],
];

const CN_GLOSSARY = [
    ...CN_GARMENTS.map(([cn, en]) => ({ cn, en, garment: true })),
    ...CN_TERMS.map(([cn, en]) => ({ cn, en, garment: false })),
].sort((a, b) => b.cn.length - a.cn.length);

const CJK_RE = /[一-鿿]/;

function translateWeidianName(raw) {
    const s = String(raw || '')
        .replace(/【[^】]*】/g, ' ')
        .replace(/[（(][^)）]*[)）]/g, ' ');

    const parts = [];
    let run = '';
    let hasGarment = false;
    const flush = () => { if (run.trim()) parts.push(run.trim()); run = ''; };

    for (let i = 0; i < s.length;) {
        const hit = CN_GLOSSARY.find(g => s.startsWith(g.cn, i));
        if (hit) {
            flush();
            if (hit.en) parts.push(hit.en);
            if (hit.garment) hasGarment = true;
            i += hit.cn.length;
            continue;
        }
        const ch = s[i];
        if (/[A-Za-z0-9]/.test(ch)) {
            if (CJK_RE.test(run)) flush();
            run += ch;
        } else if (CJK_RE.test(ch)) {
            if (run && !CJK_RE.test(run)) flush();
            run += ch;
        } else {
            flush();
        }
        i++;
    }
    flush();

    // Without a garment word the title is not chinese product vocabulary — leave it
    // to the latin-only cleanup so existing shops keep the names they have today.
    if (!hasGarment) return '';

    const out = [];
    for (const p of parts) if (!out.includes(p)) out.push(p);
    return out.join(' ').replace(/\s+/g, ' ').trim();
}

function weidianDisplayName(raw) {
    return translateWeidianName(raw) || cleanWeidianName(raw);
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

function weidianItemToProduct(item, cateName, shopId, shopName, yMatch) {
    const yParsed = yMatch?.parsed;
    const yAlbum = yMatch?.album;

    if (WEIDIAN_JUNK_RE.test(item.itemName || '')) return null;

    const name = (yParsed?.name) || weidianDisplayName(item.itemName);
    if (!name) return null;

    // Shops without a category tree give us no cateName to classify on, so fall back
    // to reading the brand out of the title the same way the yupoo path does.
    const bm = yParsed
        ? yupooBrandModel(yParsed.name)
        : (cateName ? weidianBrandModel(cateName) : yupooBrandModel(name));

    const cnyFromYupoo = yParsed?.priceCny;
    const cnyFromWeidian = parseFloat(item.price);
    const cny = (cnyFromYupoo && cnyFromYupoo > 0)
        ? cnyFromYupoo
        : (isFinite(cnyFromWeidian) && cnyFromWeidian > 0 ? cnyFromWeidian : null);
    const usd = cny != null ? Math.round(cny / CNY_PER_USD) : null;

    const batch = yParsed ? yupooBatchCode(yParsed.batchRaw) : '';

    let img = '';
    if (yAlbum?.cover) {
        const raw = yAlbum.cover.replace(/\/small\.(jpg|jpeg|png|webp)$/, '/medium.$1');
        img = proxyYupooImage(raw);
    } else if (item.itemImg) {
        img = item.itemImg;
    }

    return {
        name,
        batch,
        link: normalizeRef(item.itemUrl || `https://weidian.com/item.html?itemID=${item.itemId}`),
        price: usd != null ? `$${usd}` : '',
        livePrice: usd,
        image: img,
        description: '',
        budgetLink: null,
        categoryOverride: 'Sellers',
        brandOverride: bm.brand,
        modelOverride: bm.model,
        imageOverride: img || null,
        tileImage: null,
        shopId: String(shopId),
        shopName: shopName || null,
        yupooAlbumUrl: yAlbum?.url || null,
    };
}

// Not every shop groups its items into categories — getCateTree then answers with an
// empty cateList and there is nothing to page through per category. The same endpoint
// still lists the entire shop under the synthetic category 0, so use that as the
// fallback instead of reporting the shop as empty.
const ALL_ITEMS_CATE_ID = '0';
const FLAT_PAGE_LIMIT = 100;
const FLAT_MAX_PAGES = 10;

async function fetchWeidianItemsFlat(shopId) {
    const out = [];
    for (let page = 0; page < FLAT_MAX_PAGES; page++) {
        const res = await thorGet('/decorate/itemCate.getCateItemList/1.0', {
            cateId: ALL_ITEMS_CATE_ID,
            shopId: String(shopId),
            offset: page * FLAT_PAGE_LIMIT,
            limit: FLAT_PAGE_LIMIT,
            sortField: 'all',
            sortType: 'desc',
            from: 'h5',
            isQdFx: false,
            isHideSold: false,
        });
        const items = res?.itemList || [];
        out.push(...items);
        if (items.length < FLAT_PAGE_LIMIT) break;
    }
    return out;
}

async function fetchAllWeidianItems(shopId) {
    const tree = await thorGet('/decorate/itemCate.getCateTree/1.0', {
        shopId: String(shopId),
        from: 'h5',
    });
    const topCates = tree?.cateList || [];
    if (!topCates.length) {
        const flat = await fetchWeidianItemsFlat(shopId);
        const seen = new Set();
        return flat.filter(it => {
            if (!it?.itemId || seen.has(it.itemId)) return false;
            seen.add(it.itemId);
            return true;
        }).map(it => ({ ...it, _cateName: '' }));
    }

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
            out.push({ ...it, _cateName: cate.cateName });
        }
    }
    return out;
}

function parseYupooTitle(rawTitle) {
    let s = String(rawTitle || '').trim();
    let priceCny = null;
    const priceM = s.match(/^(\d+)\s*[¥￥]/);
    if (priceM) {
        priceCny = parseInt(priceM[1], 10);
        s = s.slice(priceM[0].length).trim();
    }
    const batches = [];
    s = s.replace(/【([^】]+)】/g, (_, b) => { batches.push(b.trim()); return ' '; });
    const name = s.replace(/\s+/g, ' ').trim();
    return { name, priceCny, batchRaw: batches[0] || '' };
}

function yupooBatchCode(rawBatch) {
    const t = (rawBatch || '').toUpperCase();
    if (/\bLJR\b/.test(t)) return 'LJR';
    if (/\bPK\b/.test(t)) return 'PK';
    if (/\bOG\b/.test(t)) return 'OG';
    if (/\bBD\b/.test(t)) return 'BD';
    if (/\bDG\b/.test(t)) return 'DG';
    if (/\bUA\b/.test(t)) return 'UA';
    return '';
}

function yupooBrandModel(name) {
    const c = name.toLowerCase();
    if (/jordan\s*1\b/.test(c)) return { brand: 'Jordan 1', model: 'Jordan 1' };
    if (/jordan\s*3\b/.test(c)) return { brand: 'Jordan 3', model: 'Jordan 3' };
    if (/jordan\s*4\b/.test(c)) return { brand: 'Jordan 4', model: 'Jordan 4' };
    const jMid = c.match(/jordan\s*(5|6|7|8|9|10|11|12|13)\b/);
    if (jMid) return { brand: 'Jordan 5-13', model: `Jordan ${jMid[1]}` };
    if (/jordan/.test(c)) return { brand: 'Jordan (Other)', model: 'Other' };
    if (/dunk/.test(c)) return { brand: 'Dunks', model: c.includes('low') ? 'Dunk Low' : (c.includes('high') ? 'Dunk High' : 'Dunk') };
    if (/yeezy/.test(c)) {
        const yM = c.match(/yeezy\s*(\d{3,4})/);
        if (yM) return { brand: 'Yeezy', model: `Yeezy ${yM[1]}` };
        if (c.includes('slide')) return { brand: 'Yeezy', model: 'Slide' };
        if (c.includes('foam')) return { brand: 'Yeezy', model: 'Foam' };
        return { brand: 'Yeezy', model: 'Other' };
    }
    if (/kobe/.test(c)) return { brand: 'Nike', model: 'Kobe' };
    if (/air\s*max/.test(c)) return { brand: 'Nike', model: 'Air Max' };
    if (/(air\s*force|af1)/.test(c)) return { brand: 'Nike', model: 'Air Force' };
    if (/cortez/.test(c)) return { brand: 'Nike', model: 'Cortez' };
    if (/vomero/.test(c)) return { brand: 'Nike', model: 'Vomero' };
    if (/hot\s*step/.test(c)) return { brand: 'Nike', model: 'Hot Step' };
    if (/nike|nocta|kd|kyrie|lebron|sb\s/.test(c)) return { brand: 'Nike', model: 'Other' };
    if (/samba/.test(c)) return { brand: 'Adidas', model: 'Samba' };
    if (/gazelle/.test(c)) return { brand: 'Adidas', model: 'Gazelle' };
    if (/campus/.test(c)) return { brand: 'Adidas', model: 'Campus' };
    if (/spezial/.test(c)) return { brand: 'Adidas', model: 'Spezial' };
    if (/adidas/.test(c)) return { brand: 'Adidas', model: 'Other' };
    if (/balenciaga|巴黎/.test(c)) return { brand: 'Balenciaga', model: 'Other' };
    if (/louis\s*vuitton|\blv\b/.test(c)) return { brand: 'Louis Vuitton', model: 'Other' };
    if (/dior/.test(c)) return { brand: 'Dior', model: 'Other' };
    if (/bape/.test(c)) return { brand: 'Bape', model: 'Other' };
    if (/new\s*balance|\bnb\b/.test(c)) {
        const nbM = c.match(/(?:new\s*balance|\bnb\b)\s*(\d{3,4}r?)/);
        return { brand: 'New Balance', model: nbM ? nbM[1].toUpperCase() : 'Other' };
    }
    if (/asics/.test(c)) return { brand: 'Asics', model: 'Other' };
    if (/mcqueen/.test(c)) return { brand: 'Alexander McQueen', model: 'Other' };
    if (/off-?white/.test(c)) return { brand: 'Off-White', model: 'Other' };
    if (/amiri/.test(c)) return { brand: 'Amiri', model: 'Other' };
    if (/burberry/.test(c)) return { brand: 'Burberry', model: 'Other' };
    if (/ugg/.test(c)) return { brand: 'UGG', model: 'Other' };
    if (/timberland/.test(c)) return { brand: 'Timberland', model: 'Other' };
    if (/bottega/.test(c)) return { brand: 'Bottega Veneta', model: 'Other' };
    if (/louboutin/.test(c)) return { brand: 'Christian Louboutin', model: 'Other' };
    if (/birkenstock/.test(c)) return { brand: 'Birkenstock', model: 'Other' };
    if (/mihara|\bmmy\b/.test(c)) return { brand: 'Maison Mihara Yasuhiro', model: 'Other' };
    if (/golden\s*goose/.test(c)) return { brand: 'Golden Goose', model: 'Other' };
    if (/lanvin/.test(c)) return { brand: 'Lanvin', model: 'Other' };
    if (/rick\s*owens/.test(c)) return { brand: 'Rick Owens', model: 'Other' };
    if (/on\s*cloud/.test(c)) return { brand: 'On Running', model: 'Other' };
    if (/loewe/.test(c)) return { brand: 'Loewe', model: 'Other' };
    if (/puma|p6000/.test(c)) return { brand: 'Puma', model: 'Other' };
    if (/crocs/.test(c)) return { brand: 'Crocs', model: 'Other' };
    return { brand: 'Other', model: 'Other' };
}

function parseYupooAlbums(html, base) {
    const out = [];
    const re = /class="album__main"([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const block = m[1];
        const titleM = block.match(/title="([^"]+)"/);
        const hrefM = block.match(/href="\/albums\/(\d+)/);
        const imgM = block.match(/src="(https:\/\/photo\.yupoo\.com\/[^"]+)"/);
        const photoCountM = block.match(/album__photonumber"[^>]*>(\d+)/);
        if (!titleM || !hrefM) continue;
        const id = hrefM[1];
        out.push({
            id,
            title: titleM[1],
            cover: imgM?.[1] || '',
            photoCount: photoCountM ? parseInt(photoCountM[1], 10) : null,
            url: `${base}/albums/${id}?uid=1`,
        });
    }
    return out;
}

async function fetchYupooAlbums(yupooBaseUrl) {
    const base = yupooBaseUrl.replace(/\/+$/, '');
    const MAX_PAGES = 15;
    const fetches = [];
    for (let p = 1; p <= MAX_PAGES; p++) {
        fetches.push(
            fetch(`${base}/albums?tab=gallery&page=${p}`, {
                headers: { 'User-Agent': WEIDIAN_UA },
                cf: { cacheTtl: 1800, cacheEverything: true },
            })
                .then(async r => ({ status: r.status, html: r.ok ? await r.text() : '' }))
                .catch(() => ({ status: 0, html: '' }))
        );
    }
    const pages = await Promise.all(fetches);
    // 404 means the shop is really gone. Anything else that is not a 200 (rate limit,
    // 5xx, network error) is transient and must not be published — and cached — as an
    // empty shop, which is what made healthy shops show up dead for minutes at a time.
    const reachable = pages[0].status === 200 || pages[0].status === 404;
    const seen = new Set();
    const all = [];
    for (const { html } of pages) {
        if (!html) continue;
        const albums = parseYupooAlbums(html, base);
        for (const a of albums) {
            if (seen.has(a.id)) continue;
            seen.add(a.id);
            all.push(a);
        }
    }
    return { albums: all, reachable };
}

function normalizeForMatch(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[*]+/g, '')
        .replace(/系列合集|综合链接|系列|合集|链接\d*|新配色/g, '')
        .replace(/【[^】]+】/g, '')
        .replace(/^\d+\s*[¥￥]/, '')
        .replace(/[^a-z0-9一-鿿]+/g, '');
}

function buildAlbumMatcher(albums) {
    const norm = [];
    for (const a of albums) {
        const parsed = parseYupooTitle(a.title);
        const key = normalizeForMatch(parsed.name);
        if (key.length >= 4) norm.push({ album: a, parsed, key });
    }
    return (weidianName) => {
        const wKey = normalizeForMatch(weidianName);
        if (wKey.length < 4) return null;
        for (const x of norm) if (x.key === wKey) return x;
        for (const x of norm) {
            if (x.key.length >= 6 && wKey.includes(x.key)) return x;
            if (wKey.length >= 6 && x.key.includes(wKey)) return x;
        }
        const wStripped = wKey.slice(1);
        if (wStripped.length >= 6) {
            for (const x of norm) {
                if (x.key.endsWith(wStripped) || x.key.includes(wStripped)) return x;
            }
        }
        return null;
    };
}

async function fetchWeidianShop(shopId) {
    const meta = await fetchWeidianShopMeta(shopId);
    const shopName = meta?.name || `Shop ${shopId}`;
    const yupooUrl = meta?.yupooUrl || null;

    const [weidianItems, { albums }] = await Promise.all([
        fetchAllWeidianItems(shopId),
        yupooUrl ? fetchYupooAlbums(yupooUrl) : Promise.resolve({ albums: [], reachable: true }),
    ]);

    const matcher = albums.length ? buildAlbumMatcher(albums) : null;

    const out = [];
    for (const it of weidianItems) {
        const yMatch = matcher ? matcher(it.itemName) : null;
        const p = weidianItemToProduct(it, it._cateName, shopId, shopName, yMatch);
        if (p) out.push(p);
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
    if (p.shopId) out.shopId = p.shopId;
    if (p.shopName) out.shopName = p.shopName;
    if (p.yupooAlbumUrl) out.yupooAlbumUrl = p.yupooAlbumUrl;
    if (p.productCount) out.productCount = p.productCount;
    if (p.isShopStub) out.isShopStub = true;
    if (p.featured) out.featured = true;
    return out;
}

async function fetchYupooFirstPageMeta(base) {
    try {
        const r = await fetch(`${base}/albums?tab=gallery&page=1`, {
            headers: { 'User-Agent': WEIDIAN_UA },
            cf: { cacheTtl: 3600, cacheEverything: true },
        });
        if (!r.ok) return { cover: null, productCount: null };
        const html = await r.text();
        const albums = parseYupooAlbums(html, base);
        let cover = null;
        if (albums.length) {
            const firstCover = albums[0].cover.replace(/\/small\.(jpg|jpeg|png|webp)$/, '/medium.$1');
            cover = proxyYupooImage(firstCover);
        }
        let maxPage = 1;
        for (const pm of html.matchAll(/pagination__number[^>]*>(\d+)</g)) {
            const n = parseInt(pm[1], 10);
            if (n > maxPage) maxPage = n;
        }
        const productCount = maxPage > 1 ? maxPage * 120 : albums.length;
        return { cover, productCount };
    } catch { return { cover: null, productCount: null }; }
}

// Cover plus a rough item count for the seller card. Kept to one or two requests —
// the sellers listing builds every card in a single worker invocation, so walking a
// whole catalogue here is what trips the worker resource limit.
async function fetchWeidianItemsMeta(shopId) {
    const tree = await thorGet('/decorate/itemCate.getCateTree/1.0', {
        shopId: String(shopId),
        from: 'h5',
    });
    const cates = tree?.cateList || [];
    if (cates.length) {
        const total = cates.reduce((n, c) => n + (c.speCateItemNum || 0), 0);
        const firstPage = await fetchWeidianCategoryItems(shopId, cates[0].cateId, 1);
        return {
            cover: firstPage.find(i => i.itemImg)?.itemImg || null,
            productCount: total || null,
        };
    }
    const items = await fetchWeidianItemsFlat(shopId);
    return {
        cover: items.find(i => i.itemImg)?.itemImg || null,
        productCount: items.length || null,
    };
}

async function fetchWeidianStub(shopId, extras) {
    const meta = await fetchWeidianShopMeta(shopId);
    const shopName = meta?.name || `Shop ${shopId}`;
    const yupooUrl = meta?.yupooUrl;

    let cover = null;
    let productCount = null;
    if (yupooUrl) {
        ({ cover, productCount } = await fetchYupooFirstPageMeta(yupooUrl.replace(/\/+$/, '')));
    } else {
        // No yupoo mirror to take a cover and a count from — use the shop's own items,
        // otherwise the seller card renders blank with no item count.
        ({ cover, productCount } = await fetchWeidianItemsMeta(shopId));
    }
    const finalCover = extras?.image || cover;

    return {
        name: shopName,
        link: `https://weidian.com/?userid=${shopId}`,
        image: finalCover || '',
        imageOverride: finalCover || null,
        description: extras?.description || null,
        categoryOverride: 'Sellers',
        brandOverride: 'Other',
        modelOverride: 'Other',
        shopId: String(shopId),
        shopName,
        productCount,
        isShopStub: true,
    };
}

async function fetchYupooStub(subdomain, extras) {
    const base = `https://${subdomain}.x.yupoo.com`;
    const { cover, productCount } = await fetchYupooFirstPageMeta(base);
    const finalCover = extras?.image || cover;
    const shopName = subdomain;
    return {
        name: shopName,
        link: base,
        image: finalCover || '',
        imageOverride: finalCover || null,
        description: extras?.description || null,
        categoryOverride: 'Sellers',
        brandOverride: 'Other',
        modelOverride: 'Other',
        shopId: `yp-${subdomain}`,
        shopName,
        productCount,
        isShopStub: true,
    };
}

function fetchShopStub(shopId, extras) {
    const ypMatch = shopId.match(/^yp-([a-zA-Z0-9-]+)$/);
    if (ypMatch) return fetchYupooStub(ypMatch[1], extras);
    return fetchWeidianStub(shopId, extras);
}

async function fetchYupooShop(subdomain) {
    const base = `https://${subdomain}.x.yupoo.com`;
    const { albums, reachable } = await fetchYupooAlbums(base);
    if (!reachable) return { products: [], reachable: false };
    if (!albums.length) return { products: [], reachable: true };

    const shopId = `yp-${subdomain}`;
    const shopName = subdomain;

    const out = [];
    for (const a of albums) {
        const parsed = parseYupooTitle(a.title);
        if (!parsed.name) continue;
        const bm = yupooBrandModel(parsed.name);
        const usd = parsed.priceCny && parsed.priceCny > 0
            ? Math.round(parsed.priceCny / CNY_PER_USD) : null;
        const rawTile = a.cover.replace(/\/small\.(jpg|jpeg|png|webp)$/, '/medium.$1');
        const tileImg = proxyYupooImage(rawTile);

        out.push({
            name: parsed.name,
            batch: yupooBatchCode(parsed.batchRaw) || '',
            link: a.url,
            price: usd != null ? `$${usd}` : '',
            livePrice: usd,
            image: tileImg,
            description: '',
            budgetLink: null,
            categoryOverride: 'Sellers',
            brandOverride: bm.brand,
            modelOverride: bm.model,
            imageOverride: tileImg,
            tileImage: null,
            shopId,
            shopName,
            yupooAlbumUrl: a.url,
        });
    }
    return { products: out, reachable: true };
}

function upstreamUnavailable() {
    return new Response(JSON.stringify({ error: 'shop upstream unavailable' }), {
        status: 503,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store',
        },
    });
}

function jsonResponse(body, maxAge = 900) {
    return new Response(JSON.stringify(body), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': `public, max-age=${maxAge}`,
            'X-Content-Type-Options': 'nosniff',
        }
    });
}

async function readSheet(apiKey, gender) {
    const sheetId = SHEET_IDS[gender];
    const hasHeaderRow = gender !== 'women';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}` +
        `?fields=sheets.data.rowData.values(formattedValue,hyperlink)` +
        `&includeGridData=true&key=${apiKey}`;
    const r = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) return null;
    const json = await r.json();
    const rows = json?.sheets?.[0]?.data?.[0]?.rowData ?? [];

    const products = [];
    const shopIds = new Set();
    const sellerExtras = new Map();
    let isHeader = hasHeaderRow;
    for (const row of rows) {
        const cells = row.values ?? [];
        if (isHeader) { isHeader = false; continue; }
        const get = (i) => cells[i] || {};
        const name = (get(0).formattedValue || '').trim();
        const link = get(2).hyperlink || null;
        if (!link) continue;
        if (!name) {
            const shopId = parseShopFromLink(link);
            if (shopId) {
                shopIds.add(shopId);
                const image = cleanCellError(get(4).hyperlink || (get(4).formattedValue || '').trim()) || null;
                const description = (get(5).formattedValue || '').trim() || null;
                if (image || description) sellerExtras.set(shopId, { image, description });
            }
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
            featured:         isFeatured(get(13).formattedValue),
        });
    }
    return { products, shopIds: [...shopIds], sellerExtras };
}

export async function onRequest(ctx) {
    const apiKey = ctx.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return new Response('Brak GOOGLE_API_KEY w env', { status: 500 });
    }

    const params = new URL(ctx.request.url).searchParams;

    const shopParam = params.get('shop');
    if (shopParam) {
        if (/^\d+$/.test(shopParam)) {
            const products = await fetchWeidianShop(shopParam);
            return jsonResponse(products.map(compact), 300);
        }
        const ypMatch = shopParam.match(/^yp-([a-zA-Z0-9-]+)$/);
        if (ypMatch) {
            const { products, reachable } = await fetchYupooShop(ypMatch[1]);
            if (!reachable) return upstreamUnavailable();
            return jsonResponse(products.map(compact), 300);
        }
    }

    const genderParam = params.get('gender');
    const gender = genderParam === 'women' ? 'women' : 'men';
    const data = await readSheet(apiKey, gender);
    if (!data) return new Response('Sheets API error', { status: 502 });

    if (params.get('sellers') === '1') {
        const shopIds = data.shopIds.filter(id => !DISABLED_SHOPS.has(id));
        const stubs = shopIds.length
            ? (await Promise.all(shopIds.map(id => fetchShopStub(id, data.sellerExtras.get(id))))).map(compact)
            : [];
        return jsonResponse(stubs, 1800);
    }

    const deduped = clusterByName(dropKakobuyDuplicates(dedupByLink(groupByImageOrLink(data.products)))).map(compact);
    return jsonResponse(deduped, 900);
}
