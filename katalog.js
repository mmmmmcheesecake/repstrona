const REF = '?ref=MGRSBE';

function T(key, fallback, vars) {
    if (window.RePluGI18n) return window.RePluGI18n.t(key, vars);
    return fallback;
}

let allProducts = [];
let activeBrand = 'all';
let activeModel = 'all';
let activeCategory = 'all';
let activeSeller = null;
let searchQuery = '';
let sortMode = 'default';

const GENDER = (window.RePluGGender && window.RePluGGender.get()) || 'men';

const CATEGORIES_MEN = [
    'Sneakers', 'Sellers', 'Hoodies/Crewnecks', 'T-shirts', 'Jackets',
    'Pants', 'Shorts', 'Accesories', 'Watches',
    'High-end', 'Underwear', 'Sport Clothing', "Jersey's",
    'Football', 'Basketball', 'Lego', 'MISC'
];
const CATEGORIES_WOMEN = [
    'Sneakers', 'Hoodies/Crewnecks', 'T-shirts',
    'Shorts/Skirts', 'Bags', 'Accesories', 'Swimwear'
];
const CATEGORIES = GENDER === 'women' ? CATEGORIES_WOMEN : CATEGORIES_MEN;

const CATEGORY_LABEL_FALLBACK = {
    'Football': 'Soccer',
    'Sport Clothing': 'Sports Clothing',
    'Accesories': 'Accessories',
};
function categoryLabel(cat) {
    const baseKey = cat === HERO_OTHER ? 'cat.Other' : ('cat.' + cat);
    if (window.RePluGI18n) {
        if (GENDER === 'women') {
            const wKey = cat === HERO_OTHER ? 'cat.women.Other' : ('cat.women.' + cat);
            const wv = window.RePluGI18n.t(wKey);
            if (wv && wv !== wKey) return wv;
        }
        const v = window.RePluGI18n.t(baseKey);
        if (v && v !== baseKey) return v;
    }
    if (cat === HERO_OTHER) return 'Other';
    return CATEGORY_LABEL_FALLBACK[cat] || cat;
}

const HERO_OTHER = '__OTHER__';
const HERO_TILES_MEN = [
    { id: 'Sneakers',           label: 'Sneakers' },
    { id: 'Hoodies/Crewnecks',  label: 'Hoodies/Crewnecks' },
    { id: 'T-shirts',           label: 'T-shirts' },
    { id: 'Jackets',    label: 'Jackets' },
    { id: 'Pants',      label: 'Pants' },
    { id: 'Shorts',     label: 'Shorts' },
    { id: 'Accesories', label: 'Accessories' },
    { id: 'Watches',    label: 'Watches' },
    { id: HERO_OTHER,   label: 'Other' },
];
const HERO_TILES_WOMEN = [
    { id: 'Sneakers',           label: 'Sneakers' },
    { id: 'Hoodies/Crewnecks',  label: 'Hoodies/Crewnecks' },
    { id: 'T-shirts',           label: 'T-shirts' },
    { id: 'Shorts/Skirts',      label: 'Shorts/Skirts' },
    { id: 'Bags',               label: 'Bags' },
    { id: 'Accesories',         label: 'Accessories' },
    { id: 'Swimwear',           label: 'Swimwear' },
    { id: HERO_OTHER,           label: 'Other' },
];
const HERO_TILES = GENDER === 'women' ? HERO_TILES_WOMEN : HERO_TILES_MEN;
const HERO_MAIN_IDS = HERO_TILES.filter(t => t.id !== HERO_OTHER).map(t => t.id);

function strongCategoryHint(name) {
    const text = (name || '').toLowerCase();

    if (/\b(watch case|watch box)\b/.test(text)) return 'Accesories';
    if (/\b(socks|sock)\b/.test(text)) return 'Accesories';

    if (/\b(rolex|patek philippe|audemars piguet|richard mille|apple watch)\b/.test(text)) return 'Watches';

    if (/\b(hoodie|hoody|hooded)\b/.test(text)) return 'Hoodies/Crewnecks';
    if (/\b(t-shirt|t-shirts|tshirt|tshirts|\btee\b|\btees\b)\b/.test(text)) return 'T-shirts';
    if (/\b(jersey|jerseys|jersyes|trikot)\b/.test(text)) return "Jersey's";
    if (/\bbelt bag\b/.test(text)) return 'Accesories';
    if (/\b(backpack)\b/.test(text)) return 'Accesories';
    if (/\b(jacket|jackets|puffer|parka|bomber|windbreaker|down jacket|trench coat|peacoat|varsity jacket)\b/.test(text)) return 'Jackets';
    if (/\b(vest|gilet|waistcoat)\b/.test(text)) return 'Vests';
    if (/\b(crewneck|crew neck|sweatshirt)\b/.test(text)) return 'Hoodies/Crewnecks';
    if (/\b(tracksuit|track suit|jogging suit|track set|dres)\b/.test(text)) return 'Hoodies/Crewnecks';
    if (/\bshorts?\b/.test(text)) return 'Shorts';
    if (/\b(jeans|trousers|joggers|sweatpants|cargo pants|chinos|denim pants)\b/.test(text)) return 'Pants';
    if (/\bpants\b/.test(text)) return 'Pants';

    if (/\b(beanie|bucket hat|snapback|balaclava|skull cap|durag|ski mask)\b/.test(text)) return 'Accesories';
    if (/\bbelt(s)?\b/.test(text)) return 'Accesories';
    if (/\b(handbag|tote|duffle|duffel|crossbody|messenger bag|fanny pack|bumbag)\b/.test(text)) return 'Accesories';
    if (/\b(sunglasses|sunglass)\b/.test(text)) return 'Accesories';
    if (/\b(necklace|bracelet|earrings|pendant|cuban link)\b/.test(text)) return 'Accesories';
    if (/\b(airpods|iphone|ipad|macbook|airtag|drone|gopro)\b/.test(text)) return 'Accesories';

    if (/\b(perfume|fragrance|cologne|eau de (parfum|toilette))\b/.test(text)) return 'Accesories';
    if (/\blego\b/.test(text)) return 'Lego';

    if (/\b(slides|slipper|slippers|sandal|sandals|crocs|foamposite)\b/.test(text)) return 'Sneakers';
    if (/\b(air jordan|jordan\s?\d+|dunk|air force|af1|air max|samba|gazelle|cortez|vomero|huarache|hypervenom|sb dunk|ultraboost|nmd|sneaker|trainer)\b/.test(text)) return 'Sneakers';

    return null;
}

const CATEGORY_ALIASES = {
    'accessories': 'Accesories',
    'accesories': 'Accesories',
    'akcesoria': 'Accesories',
    'inne': 'Accesories',
    'other': 'Accesories',
    'sneaker': 'Sneakers',
    'shoes': 'Sneakers',
    'buty': 'Sneakers',
    'sneakers/footwear': 'Sneakers',
    'footwear': 'Sneakers',
    'swimwear': 'Swimwear',
    'strój kąpielowy': 'Swimwear',
    'stroje kąpielowe': 'Swimwear',
    'bikini': 'Swimwear',
    'skirt': 'Shorts/Skirts',
    'skirts': 'Shorts/Skirts',
    'spódnica': 'Shorts/Skirts',
    'spódnice': 'Shorts/Skirts',
    'shorts/skirts': 'Shorts/Skirts',
    'hoodie': 'Hoodies/Crewnecks',
    'hoodies': 'Hoodies/Crewnecks',
    'bluza': 'Hoodies/Crewnecks',
    'bluzy': 'Hoodies/Crewnecks',
    'crewneck': 'Hoodies/Crewnecks',
    'crewnecks': 'Hoodies/Crewnecks',
    'sweatshirt': 'Hoodies/Crewnecks',
    'sweatshirts': 'Hoodies/Crewnecks',
    'sweter': 'Hoodies/Crewnecks',
    'swetry': 'Hoodies/Crewnecks',
    'jumper': 'Hoodies/Crewnecks',
    'pullover': 'Hoodies/Crewnecks',
    't-shirt': 'T-shirts',
    'tshirt': 'T-shirts',
    'tshirts': 'T-shirts',
    'tee': 'T-shirts',
    'tees': 'T-shirts',
    'koszulka': 'T-shirts',
    'koszulki': 'T-shirts',
    'jersey': "Jersey's",
    'jerseys': "Jersey's",
    'jacket': 'Jackets',
    'kurtka': 'Jackets',
    'kurtki': 'Jackets',
    'vest': 'Vests',
    'kamizelka': 'Vests',
    'short': 'Shorts',
    'spodenki': 'Shorts',
    'pant': 'Pants',
    'spodnie': 'Pants',
    'mask': 'Accesories',
    'masks': 'Accesories',
    "mask's & hats": 'Accesories',
    'mask & hats': 'Accesories',
    'masks & hats': 'Accesories',
    'hat': 'Accesories',
    'hats': 'Accesories',
    'cap': 'Accesories',
    'caps': 'Accesories',
    'czapka': 'Accesories',
    'czapki': 'Accesories',
    'belt': 'Accesories',
    'belts': 'Accesories',
    'pasek': 'Accesories',
    'paski': 'Accesories',
    'bag': 'Accesories',
    'bags': 'Accesories',
    'torba': 'Accesories',
    'torby': 'Accesories',
    'sunglass': 'Accesories',
    'sunglasses': 'Accesories',
    'okulary': 'Accesories',
    'jewelry': 'Accesories',
    'jewellery': 'Accesories',
    'bizuteria': 'Accesories',
    'biżuteria': 'Accesories',
    'electronic': 'Accesories',
    'electronics': 'Accesories',
    'elektronika': 'Accesories',
    'perfume': 'Accesories',
    'fragrance': 'Accesories',
    'cologne': 'Accesories',
    'perfumy': 'Accesories',
    'watch': 'Watches',
    'zegarek': 'Watches',
    'zegarki': 'Watches',
    'underwear': 'Underwear',
    'bielizna': 'Underwear',
    'tracksuit': 'Hoodies/Crewnecks',
    'tracksuits': 'Hoodies/Crewnecks',
    'dres': 'Hoodies/Crewnecks',
    'dresy': 'Hoodies/Crewnecks',
};

function normalizeCategory(cat) {
    if (!cat) return cat;
    const c = String(cat).trim();
    if (!c) return null;
    const key = c.toLowerCase();
    const canonical = CATEGORIES.find(x => x.toLowerCase() === key);
    if (canonical) return canonical;
    if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
    return c;
}

function detectCategory(name, description = '') {
    const text = ((name || '') + ' ' + (description || '')).toLowerCase();

    if (/\blego\b/.test(text)) return 'Lego';
    if (/\b(perfume|fragrance|cologne|eau de (parfum|toilette)|edp|edt|parfum)\b/.test(text)) return 'Accesories';
    if (/\b(rolex|patek|audemars|cartier watch|richard mille|omega watch|hublot|tag heuer|ap watch|datejust|submariner|daytona|gmt|nautilus)\b/.test(text)) return 'Watches';
    if (/\bwatch(es)?\b/.test(text) && !/\bwatchcase\b/.test(text)) return 'Watches';
    if (/\b(sunglasses|sunglass|shades|eyewear|goggles|aviators)\b/.test(text)) return 'Accesories';
    if (/\b(necklace|bracelet|earring|earrings|cuban link|chain|pendant|jewelry|jewellery|cufflink|brooch|anklet|ring)\b/.test(text)) return 'Accesories';
    if (/\b(airpods|iphone|ipad|macbook|airtag|earbud|earbuds|headphone|headphones|charger|earpods|ps5|ps4|console|nintendo|xbox|samsung galaxy|smartwatch|apple watch|drone|gopro)\b/.test(text)) return 'Accesories';
    if (/\b(backpack|handbag|tote|duffle|duffel|luggage|suitcase|crossbody|messenger|fanny pack|bumbag|sling)\b/.test(text)) return 'Accesories';
    if (/\bbag(s)?\b/.test(text) && !/\bairbag\b/.test(text)) return 'Accesories';
    if (/\bbelt(s)?\b/.test(text)) return 'Accesories';
    if (/\b(tracksuit|track suit|jogging suit|track set)\b/.test(text)) return 'Hoodies/Crewnecks';
    if (/\b(jacket|parka|puffer|coat|varsity|bomber|windbreaker|anorak|trench|down jacket|peacoat)\b/.test(text)) return 'Jackets';
    if (/\b(vest|gilet|waistcoat)\b/.test(text)) return 'Vests';
    if (/\b(hoodie|hoody|hooded)\b/.test(text)) return 'Hoodies/Crewnecks';
    if (/\b(crewneck|crew neck|sweatshirt|jumper|sweater|cardigan|pullover|knit)\b/.test(text)) return 'Hoodies/Crewnecks';
    if (/\bjersey|trikot|kit\b/.test(text)) return "Jersey's";
    if (/\b(t-shirt|tshirt|tee|polo shirt|polo)\b/.test(text)) return 'T-shirts';
    if (/\bshorts?\b/.test(text)) return 'Shorts';
    if (/\b(jeans|trousers|pants|sweatpants|joggers|cargo|leggings|chinos|denim)\b/.test(text)) return 'Pants';
    if (/\b(boxer|boxers|briefs|underwear|thong|panty|panties|lingerie)\b/.test(text)) return 'Underwear';
    if (/\b(beanie|bucket hat|baseball cap|snapback|fedora|balaclava|skull cap|durag|ski mask|face mask)\b/.test(text)) return 'Accesories';
    if (/\b(cap|hat|mask)\b/.test(text)) return 'Accesories';
    if (/\b(football boot|soccer ball|football ball|matchball|football jersey)\b/.test(text)) return 'Football';
    if (/\b(basketball ball|basketball hoop|basketball jersey)\b/.test(text)) return 'Basketball';
    if (/\b(jordan|dunk|air force|air max|yeezy|samba|gazelle|campus|spezial|new balance|\bnb\b|cortez|vomero|sneaker|shoe|trainer|runner|sb dunk|ultraboost|nmd|ozweego|asics|huarache|loafer|sandal|slide|slipper|foamposite|boot|kobe|lebron|kyrie|kd|adidas |nike |puma)\b/.test(text)) return 'Sneakers';
    if (/\b(louis vuitton|\blv\b|gucci|hermes|dior|chanel|prada|balenciaga|fendi|burberry|saint laurent|ysl|givenchy|moncler|amiri|off-white|stone island|rhude|essentials)\b/.test(text)) return 'High-end';
    if (/\b(training|workout|gym|sport|active|athletic|tracksuit)\b/.test(text)) return 'Sport Clothing';
    return 'Accesories';
}

const KNOWN_BATCHES = ['LJR', 'BD', 'DG', 'PK', 'UA', 'OG'];

function batchClass(b) {
    const u = (b || '').trim().toUpperCase();
    return KNOWN_BATCHES.includes(u) ? `batch-${u}` : 'batch-other';
}

function weidianToUsfans(host, src) {
    if (host !== 'weidian.com' && !host.endsWith('.weidian.com')) return null;
    const id = src.searchParams.get('itemID') || src.searchParams.get('itemId');
    if (!id) return null;
    return `https://www.usfans.com/product/3/${id}?ref=MGRSBE`;
}

function convertToUsfans(url) {
    if (!url || typeof url !== 'string') return url;
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();

        if (host === 'kakobuy.com' || host === 'www.kakobuy.com') {
            const inner = u.searchParams.get('url');
            if (inner) {
                try {
                    const src = new URL(inner);
                    const innerHost = src.hostname.toLowerCase();
                    const conv = weidianToUsfans(innerHost, src);
                    if (conv) return conv;
                } catch {}
            }
            return url;
        }

        const conv = weidianToUsfans(host, u);
        if (conv) return conv;
    } catch {}
    return url;
}

function ensureRef(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (!url || url === '#') return null;
    url = convertToUsfans(url);
    const safe = safeHttpUrl(url);
    if (!safe) return null;
    const u = new URL(safe);
    u.searchParams.set('ref', 'MGRSBE');
    return u.toString();
}

function safeHttpUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        const u = new URL(url, window.location.href);
        return (u.protocol === 'https:' || u.protocol === 'http:') ? u.toString() : null;
    } catch {
        return null;
    }
}

function safeImageUrl(url) {
    return safeHttpUrl(url) || '';
}

const HIGH_END_BRANDS = ['louis vuitton', 'lv ', 'gucci', 'dior', 'hermes', 'chanel', 'prada', 'balenciaga', 'fendi', 'burberry', 'saint laurent', 'ysl', 'givenchy', 'valentino', 'rick owens', 'lanvin', 'amiri'];

function detectBrandModel(name, category = '') {
    const n = (name || '').toLowerCase();
    let m;

    if (category === 'Sneakers' || category === 'Football' || category === 'Basketball') {
        if (HIGH_END_BRANDS.some(b => n.includes(b))) return { brand: 'High-End', model: 'High-End' };
        if (n.includes('off-white') || n.includes('off white')) return { brand: 'Off-White', model: 'Off-White' };
        if ((m = n.match(/jordan\s*1\b/))) return { brand: 'Jordan 1', model: 'Jordan 1' };
        if ((m = n.match(/jordan\s*3\b/))) return { brand: 'Jordan 3', model: 'Jordan 3' };
        if ((m = n.match(/jordan\s*4\b/))) return { brand: 'Jordan 4', model: 'Jordan 4' };
        if ((m = n.match(/jordan\s*(5|6|7|8|9|10|11|12|13)\b/))) return { brand: 'Jordan 5-13', model: `Jordan ${m[1]}` };
        if (n.includes('jordan')) return { brand: 'Jordan (Other)', model: 'Other' };
        if (n.includes('dunk')) return { brand: 'Dunks', model: n.includes('low') ? 'Dunk Low' : (n.includes('high') ? 'Dunk High' : 'Dunk') };
        if (n.includes('yeezy')) {
            if ((m = n.match(/yeezy\s*(\d{3,4})/))) return { brand: 'Yeezy', model: `Yeezy ${m[1]}` };
            if (n.includes('slide')) return { brand: 'Yeezy', model: 'Slide' };
            if (n.includes('foam')) return { brand: 'Yeezy', model: 'Foam' };
            return { brand: 'Yeezy', model: 'Yeezy' };
        }
        if (n.includes('air force')) return { brand: 'Nike', model: 'Air Force' };
        if (n.includes('air max')) return { brand: 'Nike', model: 'Air Max' };
        if (n.includes('cortez')) return { brand: 'Nike', model: 'Cortez' };
        if (n.includes('vomero')) return { brand: 'Nike', model: 'Vomero' };
        if (n.includes('nocta')) return { brand: 'Nike', model: 'Nocta' };
        if (n.includes('mercurial') || n.includes('phantom') || n.includes('tiempo') || n.includes('predator')) return { brand: 'Nike', model: 'Football' };
        if (n.includes('nike')) return { brand: 'Nike', model: 'Other' };
        if (n.includes('samba')) return { brand: 'Adidas', model: 'Samba' };
        if (n.includes('gazelle')) return { brand: 'Adidas', model: 'Gazelle' };
        if (n.includes('campus')) return { brand: 'Adidas', model: 'Campus' };
        if (n.includes('spezial')) return { brand: 'Adidas', model: 'Spezial' };
        if (n.includes('adidas')) return { brand: 'Adidas', model: 'Other' };
        if ((m = n.match(/(?:new balance|\bnb)\s*(\d{3,4}r?)/i))) return { brand: 'New Balance', model: m[1].toUpperCase() };
        if (n.includes('new balance') || /\bnb\b/.test(n)) return { brand: 'New Balance', model: 'Other' };
        if (n.includes('asics')) return { brand: 'Asics', model: 'Other' };
        if (n.includes('ugg')) return { brand: 'UGG', model: 'Other' };
        if (n.includes('timberland')) return { brand: 'Timberland', model: 'Other' };
        if (n.includes('puma')) return { brand: 'Puma', model: 'Other' };
        if (n.includes('crocs')) return { brand: 'Crocs', model: 'Other' };
        return { brand: 'Other', model: 'Other' };
    }

    if (HIGH_END_BRANDS.some(b => n.includes(b))) {
        for (const b of HIGH_END_BRANDS) {
            if (n.includes(b)) {
                const label = b.replace(/\s+$/, '').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
                return { brand: label === 'Lv' ? 'Louis Vuitton' : (label === 'Ysl' ? 'Saint Laurent' : label), model: 'Other' };
            }
        }
    }
    if (n.includes('ralph lauren') || n.includes('polo ralph')) return { brand: 'Ralph Lauren', model: 'Other' };
    if (n.includes('stone island')) return { brand: 'Stone Island', model: 'Other' };
    if (n.includes('lacoste')) return { brand: 'Lacoste', model: 'Other' };
    if (n.includes('ami ')) return { brand: 'Ami', model: 'Other' };
    if (n.includes('moncler')) return { brand: 'Moncler', model: 'Other' };
    if (n.includes('supreme')) return { brand: 'Supreme', model: 'Other' };
    if (n.includes('essentials') || n.includes('fear of god')) return { brand: 'Essentials', model: 'Other' };
    if (n.includes('comme des') || n.includes('cdg')) return { brand: 'Comme des Garçons', model: 'Other' };
    if (n.includes('corteiz')) return { brand: 'Corteiz', model: 'Other' };
    if (n.includes('syna')) return { brand: 'Syna World', model: 'Other' };
    if (n.includes('goyard')) return { brand: 'Goyard', model: 'Other' };
    if (n.includes('off-white') || n.includes('off white')) return { brand: 'Off-White', model: 'Other' };
    if (n.includes('nike')) return { brand: 'Nike', model: 'Other' };
    if (n.includes('adidas')) return { brand: 'Adidas', model: 'Other' };
    if (n.includes('jordan')) return { brand: 'Jordan', model: 'Other' };
    if (n.includes('apple') || n.includes('airpods') || n.includes('iphone') || n.includes('ipad') || n.includes('macbook')) return { brand: 'Apple', model: 'Other' };
    if (n.includes('jbl')) return { brand: 'JBL', model: 'Other' };
    if (n.includes('bose')) return { brand: 'Bose', model: 'Other' };
    if (n.includes('beats')) return { brand: 'Beats', model: 'Other' };
    if (n.includes('samsung')) return { brand: 'Samsung', model: 'Other' };
    if (n.includes('sony')) return { brand: 'Sony', model: 'Other' };
    if (n.includes('rolex')) return { brand: 'Rolex', model: 'Other' };
    if (n.includes('cartier')) return { brand: 'Cartier', model: 'Other' };
    if (n.includes('omega')) return { brand: 'Omega', model: 'Other' };
    if (n.includes('lego')) return { brand: 'Lego', model: 'Other' };

    return { brand: 'Other', model: 'Other' };
}

async function fetchTags() {
    try {
        const r = await fetch('/content/tags.json');
        if (!r.ok) return {};
        const j = await r.json();
        return j.tags || {};
    } catch {
        return {};
    }
}

async function fetchTileImages() {
    try {
        const r = await fetch('/content/tile-images.json');
        if (!r.ok) return {};
        const j = await r.json();
        return j.tiles || {};
    } catch {
        return {};
    }
}

function tagKey(link) {
    if (!link) return '';
    try {
        const u = new URL(link);
        if (/(^|\.)kakobuy\.com$/i.test(u.hostname)) {
            const inner = u.searchParams.get('url');
            if (inner) {
                try {
                    const innerU = new URL(inner);
                    if (/(^|\.)weidian\.com$/i.test(innerU.hostname)) {
                        const itemId = innerU.searchParams.get('itemID') || innerU.searchParams.get('itemId');
                        if (itemId) return `kakobuy:weidian:${itemId}`;
                    }
                    return `kakobuy:${innerU.hostname}${innerU.pathname}${innerU.search}`;
                } catch {
                    return `kakobuy:${inner}`;
                }
            }
        }
    } catch {}
    return link.split('?')[0].replace(/\/+$/, '');
}

let cachedAiTags = null;
let cachedTileImages = null;

function mapApiProduct(p) {
    const aiTags = cachedAiTags || {};
    const tileImages = cachedTileImages || {};

    const auto = (() => {
        const c = detectCategory(p.name, p.description);
        const { brand, model } = detectBrandModel(p.name, c);
        return { category: c, brand, model };
    })();

    const key = tagKey(p.link);
    const ai = aiTags[key] || {};
    const aiTile = tileImages[key] || '';

    const hint = strongCategoryHint(p.name);
    const category = normalizeCategory(p.categoryOverride)
        || hint
        || normalizeCategory(ai.category)
        || auto.category;
    const brand    = (p.brandOverride && p.brandOverride.trim()) || ai.brand || auto.brand;
    const model    = (p.modelOverride && p.modelOverride.trim()) || ai.model || auto.model;

    return {
        name: p.name,
        batch: p.batch || '',
        link: ensureRef(p.link),
        price: p.price || '',
        image: p.image || '',
        imageOverride: p.imageOverride || '',
        tileImage: p.tileImage || '',
        aiTileImage: aiTile,
        description: p.description || '',
        budgetLink: ensureRef(p.budgetLink),
        brand,
        model,
        category,
        livePrice: p.livePrice ?? null,
        liveImage: null,
        shopId: p.shopId || null,
        shopName: p.shopName || null,
        yupooAlbumUrl: p.yupooAlbumUrl || null,
        productCount: p.productCount || null,
        isShopStub: !!p.isShopStub,
    };
}

async function fetchProducts() {
    const [sheetRes, aiTags, tileImages] = await Promise.all([
        fetch(`/api/sheet?gender=${encodeURIComponent(GENDER)}`),
        fetchTags(),
        fetchTileImages(),
    ]);
    if (!sheetRes.ok) throw new Error(`HTTP ${sheetRes.status}`);
    const data = await sheetRes.json();
    if (!Array.isArray(data)) throw new Error('Błędna odpowiedź');

    cachedAiTags = aiTags;
    cachedTileImages = tileImages;

    return data.map(mapApiProduct);
}

let sellerStubsPromise = null;
function fetchSellerStubs() {
    if (sellerStubsPromise) return sellerStubsPromise;
    sellerStubsPromise = (async () => {
        try {
            const r = await fetch(`/api/sheet?gender=${encodeURIComponent(GENDER)}&sellers=1`);
            if (!r.ok) return [];
            const data = await r.json();
            if (!Array.isArray(data)) return [];
            return data.map(mapApiProduct);
        } catch { return []; }
    })();
    return sellerStubsPromise;
}

function mergeSellerStubs(stubs) {
    if (!stubs.length) return;
    const have = new Set(allProducts.filter(p => p.isShopStub).map(p => p.shopId));
    for (const s of stubs) {
        if (!have.has(s.shopId)) allProducts.push(s);
    }
}

const shopFetchCache = new Map();
async function loadShopProducts(shopId) {
    if (shopFetchCache.has(shopId)) return shopFetchCache.get(shopId);
    const promise = (async () => {
        const r = await fetch(`/api/sheet?shop=${encodeURIComponent(shopId)}&v=2`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!Array.isArray(data)) throw new Error('Bad shop response');
        return data.map(mapApiProduct);
    })();
    shopFetchCache.set(shopId, promise);
    try {
        return await promise;
    } catch (e) {
        shopFetchCache.delete(shopId);
        throw e;
    }
}

function parsePrice(str) {
    return parseFloat((str || '0').replace(/[^0-9.]/g, '')) || 0;
}

function getDisplayPrice(p) {
    if (p.livePrice != null) {
        if (window.RePluGCurrency) return window.RePluGCurrency.format(p.livePrice);
        return `$${Math.round(p.livePrice)}`;
    }
    return p.price;
}

function getDisplayImage(p) {
    return [p.imageOverride, p.liveImage, p.image]
        .map(safeImageUrl)
        .find(Boolean) || '';
}

function getCardImage(p) {
    return [p.imageOverride, p.aiTileImage, p.liveImage, p.image]
        .map(safeImageUrl)
        .find(Boolean) || '';
}

const SNEAKER_BRAND_ORDER = [
    'Jordan 1', 'Jordan 3', 'Jordan 4', 'Jordan 5-13', 'Jordan (Other)',
    'Dunks', 'Off-White', 'Yeezy', 'Nike', 'Adidas', 'New Balance',
    'Asics', 'UGG', 'Timberland', 'Puma', 'Crocs', 'High-End', 'Other'
];

function brandsForCategory(cat) {
    let pool;
    if (cat === 'all') pool = allProducts;
    else if (cat === HERO_OTHER) pool = allProducts.filter(p => !HERO_MAIN_IDS.includes(p.category));
    else pool = allProducts.filter(p => p.category === cat);
    if (cat === 'Sellers') pool = pool.filter(p => !p.isShopStub);
    if (cat === 'Sellers' && activeSeller) pool = pool.filter(p => p.shopId === activeSeller);
    const brands = [...new Set(pool.map(p => p.brand))];

    if (cat === 'Sneakers' || cat === 'Football' || cat === 'Basketball') {
        return brands.sort((a, b) => {
            const ai = SNEAKER_BRAND_ORDER.indexOf(a);
            const bi = SNEAKER_BRAND_ORDER.indexOf(b);
            const aa = ai === -1 ? 999 : ai;
            const bb = bi === -1 ? 999 : bi;
            if (aa !== bb) return aa - bb;
            return a.localeCompare(b);
        });
    }

    return brands.sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
    });
}

function brandsAvailable() {
    return brandsForCategory(activeCategory);
}

function modelsForBrand(brand) {
    let items;
    if (activeCategory === 'all') items = allProducts;
    else if (activeCategory === HERO_OTHER) items = allProducts.filter(p => !HERO_MAIN_IDS.includes(p.category));
    else items = allProducts.filter(p => p.category === activeCategory);
    if (activeCategory === 'Sellers') items = items.filter(p => !p.isShopStub);
    if (activeCategory === 'Sellers' && activeSeller) items = items.filter(p => p.shopId === activeSeller);
    if (brand !== 'all') items = items.filter(p => p.brand === brand);
    return [...new Set(items.map(p => p.model))].sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        const an = parseInt(a.replace(/\D/g, ''), 10);
        const bn = parseInt(b.replace(/\D/g, ''), 10);
        if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
        return a.localeCompare(b);
    });
}

function getFiltered() {
    let items = [...allProducts];
    if (activeCategory === HERO_OTHER) items = items.filter(p => !HERO_MAIN_IDS.includes(p.category));
    else if (activeCategory !== 'all') items = items.filter(p => p.category === activeCategory);
    if (activeCategory === 'Sellers') items = items.filter(p => !p.isShopStub);
    if (activeCategory === 'Sellers' && activeSeller) items = items.filter(p => p.shopId === activeSeller);
    if (activeBrand !== 'all') items = items.filter(p => p.brand === activeBrand);
    if (activeModel !== 'all') items = items.filter(p => p.model === activeModel);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.batch.toLowerCase().includes(q)
        );
    }
    if (sortMode === 'price-asc') items.sort((a, b) => parsePrice(getDisplayPrice(a)) - parsePrice(getDisplayPrice(b)));
    else if (sortMode === 'price-desc') items.sort((a, b) => parsePrice(getDisplayPrice(b)) - parsePrice(getDisplayPrice(a)));
    else if (sortMode === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name));
    else {
        items.sort((a, b) => {
            const ai = CATEGORIES.indexOf(a.category);
            const bi = CATEGORIES.indexOf(b.category);
            const aC = ai === -1 ? 999 : ai;
            const bC = bi === -1 ? 999 : bi;
            if (aC !== bC) return aC - bC;
            const aR = brandRank(a.category, a.brand);
            const bR = brandRank(b.category, b.brand);
            if (aR.idx !== bR.idx) return aR.idx - bR.idx;
            return aR.name.localeCompare(bR.name);
        });
    }
    return items;
}

function brandRank(category, brand) {
    const b = brand || '';
    if (category === 'Sneakers' || category === 'Football' || category === 'Basketball') {
        const i = SNEAKER_BRAND_ORDER.indexOf(b);
        return { idx: i === -1 ? 999 : i, name: b };
    }
    return { idx: b === 'Other' ? 999 : 0, name: b };
}

let flyoutTimer = null;

function ensureFlyout() {
    let fly = document.getElementById('catFlyout');
    if (fly) return fly;
    const bar = document.querySelector('.cat-bar-main');
    if (!bar) return null;
    fly = document.createElement('div');
    fly.id = 'catFlyout';
    fly.className = 'cat-flyout';
    fly.addEventListener('mouseenter', () => clearTimeout(flyoutTimer));
    fly.addEventListener('mouseleave', hideFlyoutSoon);
    bar.appendChild(fly);
    return fly;
}

function showFlyout(pill, cat) {
    const fly = ensureFlyout();
    if (!fly) return;
    clearTimeout(flyoutTimer);

    const brands = brandsForCategory(cat);
    if (!brands.length) { fly.classList.remove('open'); return; }

    fly.innerHTML = '';
    brands.forEach(brand => {
        const chip = document.createElement('button');
        chip.className = 'flyout-chip' + (activeCategory === cat && activeBrand === brand ? ' active' : '');
        chip.textContent = brand;
        chip.addEventListener('click', () => {
            hideFlyout();
            activeCategory = cat;
            activeBrand = brand;
            activeModel = 'all';
            buildCategoryPills();
            buildBrandTabs();
            buildModelTabs();
            renderGrid();
        });
        fly.appendChild(chip);
    });

    const bar = document.querySelector('.cat-bar-main');
    const barRect = bar.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const maxLeft = barRect.width - 32;
    const left = Math.max(0, Math.min(pillRect.left - barRect.left - 12, maxLeft));
    fly.style.left = `${left}px`;
    fly.classList.add('open');
}

function hideFlyoutSoon() {
    clearTimeout(flyoutTimer);
    flyoutTimer = setTimeout(hideFlyout, 180);
}

function hideFlyout() {
    const fly = document.getElementById('catFlyout');
    if (fly) fly.classList.remove('open');
}

function getTileRepr(tileId) {
    const inCat = tileId === HERO_OTHER
        ? allProducts.filter(p => !HERO_MAIN_IDS.includes(p.category))
        : allProducts.filter(p => p.category === tileId);

    const curated = inCat.find(p => p.tileImage);
    if (curated) return { product: curated, source: 'curated' };

    const live = inCat.find(p => p.liveImage);
    if (live) return { product: live, source: 'live' };

    const fallback = inCat.find(p => p.image) || inCat[0];
    return fallback ? { product: fallback, source: fallback.image ? 'image' : 'pending' } : null;
}

function findTileImage(tileId) {
    const repr = getTileRepr(tileId);
    if (!repr) return '';
    if (repr.source === 'curated') return safeImageUrl(repr.product.tileImage);
    return getDisplayImage(repr.product);
}

async function eagerEnrichTileReprs() {
    const targets = HERO_TILES
        .map(t => getTileRepr(t.id))
        .filter(r => r && (r.source === 'pending' || r.source === 'image') && !r.product.liveImage)
        .map(r => r.product);

    if (!targets.length) return;
    await Promise.all(targets.map(p => enrichProduct(p).catch(() => {})));
    buildHeroTiles();
}

function buildHeroTiles() {
    const wrap = document.getElementById('heroTiles');
    if (!wrap) return;
    wrap.innerHTML = '';

    HERO_TILES.forEach(t => {
        const tile = document.createElement('button');
        tile.className = 'hero-tile' + (activeCategory === t.id ? ' active' : '');
        tile.dataset.cat = t.id;

        const img = findTileImage(t.id);
        const label = categoryLabel(t.id);
        const imgHtml = img
            ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(label)}" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
            : '';
        tile.innerHTML = `
            <div class="hero-tile-img${img ? '' : ' no-img'}">${imgHtml}</div>
            <span class="hero-tile-label">${escapeHtml(label)}</span>
        `;

        tile.addEventListener('click', () => {
            selectCategory(t.id);
            if (isMobile()) return;
            const target = document.querySelector('.filter-bar');
            if (target) {
                const top = target.getBoundingClientRect().top + window.scrollY - 64;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });

        wrap.appendChild(tile);
    });
}

function buildCategoryPills() {
    const wrap = document.getElementById('categoryPills');
    if (!wrap) return;
    wrap.innerHTML = '';

    const allBtn = makeTab(T('tab.all', 'All'), 'all', activeCategory === 'all');
    allBtn.addEventListener('click', () => { hideFlyout(); selectCategory('all'); });
    allBtn.addEventListener('mouseenter', hideFlyoutSoon);
    wrap.appendChild(allBtn);

    CATEGORIES.forEach(cat => {
        if (cat === 'Sellers') {
            const hasSellers = allProducts.some(p => p.category === 'Sellers' && p.shopId);
            if (!hasSellers) return;
        } else {
            const brands = brandsForCategory(cat);
            if (!brands.length) return;
        }

        const btn = makeTab(categoryLabel(cat), cat, activeCategory === cat);
        btn.addEventListener('click', () => { hideFlyout(); selectCategory(cat); });
        btn.addEventListener('mouseenter', () => showFlyout(btn, cat));
        btn.addEventListener('mouseleave', hideFlyoutSoon);
        wrap.appendChild(btn);
    });
}

function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function getStickyBottom() {
    const cat = document.querySelector('.cat-bar.cat-bar-main');
    if (!cat) return 170;
    const cs = getComputedStyle(cat);
    const stickyTop = parseFloat(cs.top) || 111;
    return stickyTop + cat.offsetHeight;
}

function scrollToProducts() {
    const target = document.getElementById('resultsInfo') || document.getElementById('productsGrid');
    if (!target) return;
    const apply = () => {
        const offset = getStickyBottom() + 8;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    };
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
}

function selectCategory(cat) {
    activeCategory = cat;
    activeBrand = 'all';
    activeModel = 'all';
    activeSeller = null;
    buildHeroTiles();
    buildCategoryPills();
    buildBrandTabs();
    buildModelTabs();
    renderGrid();
    if (isMobile()) scrollToProducts();
}

async function selectSeller(shopId) {
    activeSeller = shopId;
    activeBrand = 'all';
    activeModel = 'all';

    const hasRealProducts = allProducts.some(p => p.shopId === shopId && !p.isShopStub);
    if (!hasRealProducts) {
        renderShopLoading();
        try {
            const products = await loadShopProducts(shopId);
            allProducts = allProducts.filter(p => !(p.shopId === shopId && p.isShopStub));
            for (const p of products) allProducts.push(p);
        } catch (e) {
            console.error(e);
            showError(T('state.errorProducts', 'Failed to load products.'));
            return;
        }
    }

    buildBrandTabs();
    buildModelTabs();
    renderGrid();
    if (isMobile()) scrollToProducts();
}

function renderShopLoading() {
    updateSellerBack();
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const info = document.getElementById('resultsInfo');
    if (info) info.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (grid) {
        grid.style.display = 'block';
        grid.innerHTML = `<div class="spinner" style="margin: 60px auto;"></div>`;
    }
}

function clearSeller() {
    activeSeller = null;
    activeBrand = 'all';
    activeModel = 'all';
    buildBrandTabs();
    buildModelTabs();
    renderGrid();
}

function uniqueSellers() {
    const map = new Map();
    for (const p of allProducts) {
        if (p.category !== 'Sellers' || !p.shopId) continue;
        if (!map.has(p.shopId)) {
            map.set(p.shopId, {
                shopId: p.shopId,
                shopName: p.shopName || `Shop ${p.shopId}`,
                cover: '',
                productCount: 0,
                description: null,
                products: [],
            });
        }
        const s = map.get(p.shopId);
        s.products.push(p);
        if (!s.cover) s.cover = p.imageOverride || p.image || '';
        if (p.isShopStub && p.productCount) s.productCount = p.productCount;
        if (p.isShopStub && p.description && !s.description) s.description = p.description;
    }
    for (const s of map.values()) {
        if (!s.productCount) s.productCount = s.products.filter(p => !p.isShopStub).length;
    }
    return [...map.values()];
}

function buildBrandTabs() {
    const tabs = document.getElementById('brandTabs') || document.getElementById('categoryTabs');
    if (!tabs) return;
    const bar = tabs.parentElement?.parentElement;

    if (activeCategory === 'Sellers' && !activeSeller) {
        if (bar) bar.style.display = 'none';
        tabs.innerHTML = '';
        return;
    }
    if (bar) bar.style.display = '';

    tabs.innerHTML = '';

    const allBtn = makeTab(T('tab.all', 'All'), 'all', activeBrand === 'all');
    allBtn.addEventListener('click', () => selectBrand('all'));
    tabs.appendChild(allBtn);

    brandsAvailable().forEach(brand => {
        const btn = makeTab(brand, brand, activeBrand === brand);
        btn.addEventListener('click', () => selectBrand(brand));
        tabs.appendChild(btn);
    });
}

function buildModelTabs() {
    const tabs = document.getElementById('modelTabs');
    if (!tabs) return;
    tabs.innerHTML = '';

    const models = modelsForBrand(activeBrand);
    if (activeBrand === 'all' || models.length <= 1) {
        tabs.parentElement.parentElement.style.display = 'none';
        return;
    }
    tabs.parentElement.parentElement.style.display = '';

    const allBtn = makeTab(T('tab.all', 'All'), 'all', activeModel === 'all');
    allBtn.addEventListener('click', () => selectModel('all'));
    tabs.appendChild(allBtn);

    models.forEach(model => {
        const btn = makeTab(model, model, activeModel === model);
        btn.addEventListener('click', () => selectModel(model));
        tabs.appendChild(btn);
    });
}

function makeTab(label, value, active) {
    const btn = document.createElement('button');
    btn.className = 'cat-pill' + (active ? ' active' : '');
    btn.dataset.value = value;
    btn.textContent = label;
    return btn;
}

function selectBrand(brand) {
    activeBrand = brand;
    activeModel = 'all';
    buildBrandTabs();
    buildModelTabs();
    renderGrid();
    if (isMobile()) scrollToProducts();
}

function selectModel(model) {
    activeModel = model;
    buildModelTabs();
    renderGrid();
    if (isMobile()) scrollToProducts();
}

function productKey(p) {
    return p.link || p.name;
}

function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function cardHTML(p) {
    const img = getCardImage(p);
    const imgTag = img
        ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
        : '';

    let detailHref = '#';
    if (p.link) {
        const safeLink = safeHttpUrl(p.link);
        if (!safeLink) return '';
        const q = new URLSearchParams({ url: safeLink, name: p.name, batch: p.batch || '' });
        if (p.budgetLink) q.set('budget', p.budgetLink);
        const safeOverride = safeImageUrl(p.imageOverride);
        if (safeOverride) q.set('img', safeOverride);
        if (p.category) q.set('cat', p.category);
        const safeYupoo = safeHttpUrl(p.yupooAlbumUrl);
        if (safeYupoo) q.set('yupoo', safeYupoo);
        detailHref = `produkt.html?${q.toString()}`;
    }

    return `
    <a href="${escapeHtml(detailHref)}" class="product-card" data-key="${escapeHtml(productKey(p))}">
        <div class="card-img ${!img ? 'no-img' : ''}">${imgTag}
            ${p.batch ? `<span class="card-batch ${batchClass(p.batch)}">${escapeHtml(p.batch)}</span>` : ''}
        </div>
        <div class="card-body">
            <p class="card-name">${escapeHtml(p.name)}</p>
            <span class="card-price">${escapeHtml(getDisplayPrice(p))}</span>
        </div>
    </a>`;
}

function sellerCardHTML(s) {
    const previewImg = s.cover || '';
    const imgTag = previewImg
        ? `<img src="${escapeHtml(previewImg)}" alt="${escapeHtml(s.shopName)}" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
        : '';
    const subtitle = s.productCount
        ? T('sellers.items', `${s.productCount} items`, { n: s.productCount })
        : T('sellers.view', 'View shop →');
    const descHtml = s.description
        ? `<p class="seller-desc">${escapeHtml(s.description)}</p>`
        : '';
    return `
    <a class="product-card seller-card" role="button" tabindex="0" data-shop="${escapeHtml(s.shopId)}">
        <div class="card-img ${!previewImg ? 'no-img' : ''}">${imgTag}</div>
        <div class="card-body">
            <p class="card-name">${escapeHtml(s.shopName)}</p>
            ${descHtml}
            <span class="card-price">${escapeHtml(subtitle)}</span>
        </div>
    </a>`;
}

function renderSellerTiles() {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const info = document.getElementById('resultsInfo');
    const count = document.getElementById('resultsCount');
    const back = document.getElementById('sellerBack');
    if (back) back.style.display = 'none';

    const sellers = uniqueSellers();

    count.textContent = T('sellers.count', `${sellers.length} sellers`, { n: sellers.length });
    info.style.display = 'block';

    if (!sellers.length) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = sellers.map(sellerCardHTML).join('');

    grid.querySelectorAll('.seller-card').forEach(el => {
        const go = () => selectSeller(el.dataset.shop);
        el.addEventListener('click', go);
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        });
    });
}

function ensureSellerBack() {
    let el = document.getElementById('sellerBack');
    if (el) return el;
    const main = document.querySelector('.shop-main .container');
    const info = document.getElementById('resultsInfo');
    if (!main || !info) return null;
    el = document.createElement('button');
    el.id = 'sellerBack';
    el.className = 'seller-back';
    el.style.display = 'none';
    el.addEventListener('click', () => { selectCategory('Sellers'); });
    main.insertBefore(el, info);
    return el;
}

function updateSellerBack() {
    const el = ensureSellerBack();
    if (!el) return;
    if (activeCategory === 'Sellers' && activeSeller) {
        const s = uniqueSellers().find(s => s.shopId === activeSeller);
        const label = s?.shopName || 'Sellers';
        el.textContent = `← ${T('sellers.back', 'All sellers')} · ${label}`;
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

function renderGrid() {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const info = document.getElementById('resultsInfo');
    const count = document.getElementById('resultsCount');

    updateSellerBack();

    if (activeCategory === 'Sellers' && !activeSeller) {
        renderSellerTiles();
        return;
    }

    const items = getFiltered();

    count.textContent = T('results.count', `${items.length} products`, { n: items.length });
    info.style.display = 'block';

    if (!items.length) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = items.map(cardHTML).join('');

    grid.querySelectorAll('[data-stop]').forEach(el => {
        el.addEventListener('click', e => e.stopPropagation());
    });
}

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    const msgEl = document.getElementById('errorMsg');
    if (msgEl) msgEl.textContent = msg;
}

const enrichCache = new Map();
const enrichPromises = new Map();

async function enrichProduct(p) {
    if (!p.link || p.isShopStub) return;
    const key = p.link;
    if (enrichCache.has(key)) {
        applyEnrichment(p, enrichCache.get(key));
        return;
    }
    let promise = enrichPromises.get(key);
    if (!promise) {
        promise = (async () => {
            try {
                const r = await fetch(`/api/product?url=${encodeURIComponent(p.link)}`);
                if (!r.ok) return null;
                const data = await r.json();
                enrichCache.set(key, data);
                return data;
            } catch {
                return null;
            }
        })();
        enrichPromises.set(key, promise);
    }
    const data = await promise;
    if (data) applyEnrichment(p, data);
}

function pickLifestyleImage(data) {
    const main = Array.isArray(data.images) ? data.images : [];
    const sku = Array.isArray(data.skuImages) ? data.skuImages : [];

    if (sku.length >= 3 && main.length >= 1) {
        // For 2-photo listings, [0] is usually a size chart or seller banner —
        // prefer [1] which tends to be the actual product shot.
        if (main.length === 2) return main[1];
        return main[0];
    }

    const inHand = Array.isArray(data.inHandImages) ? data.inHandImages : [];
    if (inHand.length >= 6) return inHand[Math.floor(inHand.length / 2)];
    if (inHand.length >= 3) return inHand[Math.floor(inHand.length / 2)];
    if (inHand.length >= 1) return inHand[inHand.length - 1];

    if (main.length >= 4) return main[main.length - 1];
    if (main.length >= 2) return main[1];

    if (sku.length) return sku[0];

    return data.image || null;
}

function applyEnrichment(p, data) {
    if (!data) return;
    let changed = false;
    if (data.priceUsd != null && p.livePrice !== data.priceUsd) {
        p.livePrice = data.priceUsd;
        changed = true;
    }
    const pick = pickLifestyleImage(data);
    if (pick && p.liveImage !== pick) {
        p.liveImage = pick;
        changed = true;
    }
    if (changed) updateCard(p);
}

function updateCard(p) {
    const sel = `.product-card[data-key="${CSS.escape(productKey(p))}"]`;
    document.querySelectorAll(sel).forEach(card => {
        const priceEl = card.querySelector('.card-price');
        if (priceEl) priceEl.textContent = getDisplayPrice(p);

        const imgWrap = card.querySelector('.card-img');
        const newImg = getCardImage(p);
        if (imgWrap && newImg) {
            const existing = imgWrap.querySelector('img');
            if (existing) {
                if (existing.src !== newImg) existing.src = newImg;
            } else {
                imgWrap.classList.remove('no-img');
                const img = document.createElement('img');
                img.src = newImg;
                img.alt = p.name;
                img.loading = 'lazy';
                img.onerror = function () { imgWrap.classList.add('no-img'); this.remove(); };
                imgWrap.prepend(img);
            }
        }
    });
}

function setupLazyEnrichment() {
    if (!('IntersectionObserver' in window)) {
        allProducts.forEach(p => enrichProduct(p));
        return;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const key = entry.target.dataset.key;
            const p = allProducts.find(x => productKey(x) === key);
            if (p) enrichProduct(p);
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '300px' });

    const watch = () => {
        document.querySelectorAll('.product-card[data-key]').forEach(el => {
            if (!el.dataset.observed) {
                el.dataset.observed = '1';
                observer.observe(el);
            }
        });
    };
    watch();

    const grid = document.getElementById('productsGrid');
    if (grid) {
        const mo = new MutationObserver(watch);
        mo.observe(grid, { childList: true });
    }
}

const CATALOG_STATE_KEY = 'repluG:catalogState';

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

function saveCatalogState() {
    try {
        sessionStorage.setItem(CATALOG_STATE_KEY, JSON.stringify({
            activeCategory, activeBrand, activeModel, activeSeller,
            searchQuery, sortMode,
            scrollY: window.scrollY || window.pageYOffset || 0,
            path: location.pathname,
            ts: Date.now(),
        }));
    } catch {}
}

function readCatalogState() {
    try {
        const raw = sessionStorage.getItem(CATALOG_STATE_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || Date.now() - (s.ts || 0) > 30 * 60 * 1000) return null;
        if (s.path && s.path !== location.pathname) return null;
        return s;
    } catch { return null; }
}

window.addEventListener('pagehide', saveCatalogState);
window.addEventListener('beforeunload', saveCatalogState);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveCatalogState();
});

window.addEventListener('pageshow', e => {
    const fly = document.getElementById('catFlyout');
    if (fly) fly.classList.remove('open');
    if (e.persisted) {
        const s = readCatalogState();
        if (s && typeof s.scrollY === 'number') window.scrollTo(0, s.scrollY);
        // iOS Safari sometimes clears the search input on bfcache restore even though
        // the JS state (and therefore the filtered grid) is preserved — re-sync the DOM.
        const inp = document.getElementById('searchInput');
        if (inp && inp.value !== searchQuery) inp.value = searchQuery;
    }
});

async function init() {
    try {
        const stubsPromise = fetchSellerStubs();
        allProducts = await fetchProducts();
        document.getElementById('loadingState').style.display = 'none';

        const returnState = readCatalogState();
        const params = new URLSearchParams(window.location.search);
        const kat = params.get('kategoria');

        if (returnState) {
            if (returnState.activeCategory) activeCategory = returnState.activeCategory;
            if (returnState.activeBrand) activeBrand = returnState.activeBrand;
            if (returnState.activeModel) activeModel = returnState.activeModel;
            if (returnState.activeSeller) activeSeller = returnState.activeSeller;
            if (returnState.sortMode) {
                sortMode = returnState.sortMode;
                const sel = document.getElementById('sortSelect');
                if (sel) sel.value = sortMode;
            }
            if (returnState.searchQuery) {
                searchQuery = returnState.searchQuery;
                const inp = document.getElementById('searchInput');
                if (inp) inp.value = searchQuery;
            }
        } else if (kat) {
            if (kat.toLowerCase() === 'other') {
                activeCategory = HERO_OTHER;
            } else {
                const catMatch = CATEGORIES.find(c => c.toLowerCase() === kat.toLowerCase());
                if (catMatch) {
                    activeCategory = catMatch;
                } else {
                    const brandMatch = brandsAvailable().find(b => b.toLowerCase() === kat.toLowerCase());
                    if (brandMatch) activeBrand = brandMatch;
                }
            }
        }

        const inSellersView = activeCategory === 'Sellers';
        if (inSellersView && !activeSeller) {
            mergeSellerStubs(await stubsPromise);
        }

        buildHeroTiles();
        buildCategoryPills();
        buildBrandTabs();
        buildModelTabs();
        renderGrid();
        setupLazyEnrichment();
        eagerEnrichTileReprs();

        if (!inSellersView) {
            stubsPromise.then(stubs => {
                mergeSellerStubs(stubs);
                buildCategoryPills();
            });
        }

        if (activeSeller) {
            const hasReal = allProducts.some(p => p.shopId === activeSeller && !p.isShopStub);
            if (!hasReal) {
                try {
                    const products = await loadShopProducts(activeSeller);
                    allProducts = allProducts.filter(p => !(p.shopId === activeSeller && p.isShopStub));
                    for (const p of products) allProducts.push(p);
                    buildBrandTabs();
                    buildModelTabs();
                    renderGrid();
                    if (returnState && typeof returnState.scrollY === 'number') {
                        window.scrollTo(0, returnState.scrollY);
                    }
                } catch (e) { console.error(e); }
            }
        }

        if (returnState && typeof returnState.scrollY === 'number') {
            const targetY = returnState.scrollY;
            const tryScroll = () => window.scrollTo(0, targetY);
            tryScroll();
            requestAnimationFrame(tryScroll);
            setTimeout(tryScroll, 60);
            setTimeout(tryScroll, 200);
            setTimeout(tryScroll, 500);
            setTimeout(tryScroll, 1000);
        }
    } catch (e) {
        console.error(e);
        showError(T('state.errorProducts', 'Failed to load products.'));
    }
}

document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderGrid();
});

if (window.RePluGI18n) {
    window.RePluGI18n.onChange(() => {
        if (allProducts.length) {
            buildHeroTiles();
            buildCategoryPills();
            buildBrandTabs();
            buildModelTabs();
            renderGrid();
        }
    });
}

document.getElementById('sortSelect').addEventListener('change', e => {
    sortMode = e.target.value;
    renderGrid();
});

function enableHorizontalWheel(el) {
    if (!el || el.dataset.wheelBound) return;
    el.dataset.wheelBound = '1';
    el.addEventListener('wheel', e => {
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (!delta) return;
        if (el.scrollWidth <= el.clientWidth) return;
        e.preventDefault();
        el.scrollLeft += delta;
    }, { passive: false });
}

document.querySelectorAll('.cat-scroll').forEach(enableHorizontalWheel);

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const el = document.getElementById('nav-discord');
    if (el && s.discordUrl) el.href = s.discordUrl;
}).catch(() => {});

if (window.RePluGCurrency) {
    window.RePluGCurrency.onChange(() => {
        if (allProducts.length) renderGrid();
    });
}

(function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    const THRESHOLD = 480;
    let visible = false;
    const update = () => {
        const shouldShow = (window.scrollY || window.pageYOffset || 0) > THRESHOLD;
        if (shouldShow === visible) return;
        visible = shouldShow;
        if (visible) {
            btn.hidden = false;
            requestAnimationFrame(() => btn.classList.add('is-visible'));
        } else {
            btn.classList.remove('is-visible');
            setTimeout(() => { if (!visible) btn.hidden = true; }, 200);
        }
    };
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', update, { passive: true });
    update();
})();

init();
