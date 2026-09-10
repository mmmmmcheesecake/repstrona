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
    'Sneakers', 'Sellers', 'Hoodies/Crewnecks', 'T-shirts',
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

// Every tile on this page draws at a few hundred pixels, and both image families hand
// back the original: weidian's CDN serves 1920x1920 JPEGs around half a megabyte, and
// the Alibaba OSS hosts are no better. Both will crop server-side first — geilicdn
// takes ?w=, the OSS hosts take the same x-oss-process the QC gallery already asks for.
// Measured on one catalogue photo: 568 KB whole, 41 KB at 400px, 96 KB at 640px.
// Retina screens get the larger step, so the saving costs nothing visible.
const OSS_IMAGE_HOSTS = ['media.usfans.com', '.kakobuy.com', '.kakobyy.com', 'oss.acbuy.com'];
const RETINA = (typeof window !== 'undefined' && window.devicePixelRatio > 1.5);
const TILE_IMAGE_WIDTH = RETINA ? 640 : 400;
const HERO_IMAGE_WIDTH = RETINA ? 900 : 560;

function scaledImageUrl(url, width) {
    if (!url) return url;
    let host;
    try { host = new URL(url, location.href).hostname.toLowerCase(); } catch { return url; }
    const sep = url.includes('?') ? '&' : '?';
    if (host === 'si.geilicdn.com' || host.endsWith('.geilicdn.com')) {
        return `${url}${sep}w=${width}`;
    }
    if (OSS_IMAGE_HOSTS.some(h => (h.startsWith('.') ? host.endsWith(h) : host === h))) {
        return `${url}${sep}x-oss-process=image/resize,w_${width}`;
    }
    return url;
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
        featured: !!p.featured,
    };
}

async function fetchProducts() {
    const [sheetRes, aiTags, tileImages] = await Promise.all([
        fetch(`/api/sheet?gender=${encodeURIComponent(GENDER)}&v=3`),
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
let sellerStubsReady = false;
function fetchSellerStubs() {
    if (sellerStubsPromise) return sellerStubsPromise;
    sellerStubsPromise = (async () => {
        try {
            const r = await fetch(`/api/sheet?gender=${encodeURIComponent(GENDER)}&sellers=1&v=3`);
            if (!r.ok) return [];
            const data = await r.json();
            if (!Array.isArray(data)) return [];
            return data.map(mapApiProduct);
        } catch { return []; }
    })().then(stubs => { sellerStubsReady = true; return stubs; });
    return sellerStubsPromise;
}

function mergeSellerStubs(stubs) {
    if (!stubs.length) return;
    const have = new Set(allProducts.filter(p => p.isShopStub).map(p => p.shopId));
    let added = 0;
    for (const s of stubs) {
        if (!have.has(s.shopId)) { allProducts.push(s); added++; }
    }
    if (added) bumpProductsVersion();
}

// Taobao's own pages answer a server with their login wall, so a taobao shop is only
// listable through usfans — and usfans refuses that particular call from the Cloudflare
// edge every single time (measured: 0 of 8). Their CORS names replug24, so the shop
// gets listed here instead, from the visitor's own address. Same call, same shape as
// the worker builds; the worker stays the preferred path for the day they let it
// through, and for its cache.
const TAOBAO_PAGE_SIZE = 20;
// Fifteen pages at once got every one of them answered `90000 search risk error`, and
// the address stayed refused for minutes afterwards — page one included, so the shop
// came up empty and the catalogue showed a load failure. One page at a time, with a
// pause between, and six of them: a hundred and twenty items is a shop worth browsing
// without being greedy with somebody else's search endpoint.
const TAOBAO_MAX_PAGES = 6;
const TAOBAO_PAGE_GAP_MS = 800;
const CNY_PER_USD = 7.2;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Kept for a day rather than a tab: usfans bans an address that asks too often, so the
// fewer times a returning visitor has to list the same shop, the better. Best-effort —
// a private window or blocked site data throws on both.
const TAOBAO_CACHE_TTL = 24 * 60 * 60 * 1000;

function readStoredJson(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { v, t } = JSON.parse(raw);
        if (!t || Date.now() - t > TAOBAO_CACHE_TTL) return null;
        return v;
    } catch { return null; }
}

function writeStoredJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() })); } catch {}
}

function b64url(s) {
    try {
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch { return null; }
}

// img.alicdn.com refuses a hotlink carrying a replug24 Referer; the proxy sends none.
function proxyAlicdn(url) {
    if (!/^https?:\/\/[^/]*\.alicdn\.com\//i.test(url || '')) return url || '';
    const token = b64url(url);
    return token ? `/api/qcimg?u=${token}` : url;
}

async function usfansShopPage(shopId, pageNum) {
    try {
        const r = await fetch('https://usfans.com/api/goods/search/keyword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: 2, shopId: String(shopId), pageNum, pageSize: TAOBAO_PAGE_SIZE })
        });
        if (!r.ok) return null;
        const data = await r.json();
        // 90000 is their abuse guard, not a failure of this page: asking again right
        // away digs the hole deeper, so callers stop rather than retry.
        if (data?.code === 90000) return 'risk';
        if (data?.code !== 200) return null;
        return Array.isArray(data?.data?.records) ? data.data.records : [];
    } catch { return null; }
}

function usfansRecordToProduct(item, shopKey, shopName) {
    const name = (item?.title || '').replace(/\s+/g, ' ').trim();
    if (!name || !item?.goodsId) return null;
    const cny = Number(item.price);
    const usd = isFinite(cny) && cny > 0 ? Math.round(cny / CNY_PER_USD) : null;
    const img = proxyAlicdn(item.image || '');
    return mapApiProduct({
        name,
        link: `https://usfans.com/product/2/${item.goodsId}?ref=MGRSBE`,
        price: usd != null ? `$${usd}` : '',
        livePrice: usd,
        image: img,
        imageOverride: img || null,
        categoryOverride: 'Sellers',
        shopId: shopKey,
        shopName: shopName || null,
    });
}

async function loadTaobaoShopFromBrowser(shopKey, shopName) {
    const numericId = shopKey.replace(/^tb-/, '');
    const out = [];

    for (let page = 1; page <= TAOBAO_MAX_PAGES; page++) {
        let records = await usfansShopPage(numericId, page);

        // One retry, only for the first page and only after a real pause: without it a
        // visitor who arrives inside somebody else's cooldown sees an empty shop.
        if (page === 1 && (records === 'risk' || records === null)) {
            await sleep(2000);
            records = await usfansShopPage(numericId, 1);
        }
        // Their guard is on, or the shop ran out. Either way, keep what we have.
        if (!records || records === 'risk' || !records.length) break;

        for (const r of records) {
            const product = usfansRecordToProduct(r, shopKey, shopName);
            if (product) out.push(product);
        }
        if (records.length < TAOBAO_PAGE_SIZE) break;
        if (page < TAOBAO_MAX_PAGES) await sleep(TAOBAO_PAGE_GAP_MS);
    }
    return out;
}

// A shop is read a slice at a time — five yupoo pages, or six kakobuy ones — because
// reading it whole was three megabytes of HTML in one worker call and capped the shop
// at 1800 items. One of them has over 5400. The endpoint says in a header whether
// another slice exists.
const shopMoreAvailable = new Map();
const shopBatchesLoaded = new Map();

const shopFetchCache = new Map();
async function loadShopProducts(shopId, batch = 0) {
    const key = `${shopId}#${batch}`;
    if (shopFetchCache.has(key)) return shopFetchCache.get(key);
    const promise = (async () => {
        const isTaobao = /^tb-\d+$/.test(shopId);
        try {
            const r = await fetch(`/api/sheet?shop=${encodeURIComponent(shopId)}&batch=${batch}&v=3`);
            if (r.ok) {
                shopMoreAvailable.set(shopId, r.headers.get('x-shop-has-more') === '1');
                const data = await r.json();
                if (Array.isArray(data) && data.length) return data.map(mapApiProduct);
                if (batch > 0) return [];
                if (!isTaobao) throw new Error('Bad shop response');
            } else if (!isTaobao) {
                throw new Error(`HTTP ${r.status}`);
            }
        } catch (e) {
            if (batch > 0) return [];
            if (!isTaobao) throw e;
        }
        if (batch > 0) return [];
        const shopName = uniqueSellers().find(s => s.shopId === shopId)?.shopName || null;

        // Listing a shop costs six paced calls against an endpoint that bans bursts, so
        // do not spend them again on a shop this browser already listed today.
        const cached = readStoredJson(`tbshop:${shopId}`);
        if (cached) return cached.map(mapApiProduct);

        const products = await loadTaobaoShopFromBrowser(shopId, shopName);
        if (!products.length) throw new Error('Shop returned nothing');
        writeStoredJson(`tbshop:${shopId}`, products);
        return products;
    })();
    shopFetchCache.set(key, promise);
    try {
        return await promise;
    } catch (e) {
        shopFetchCache.delete(key);
        throw e;
    }
}

let allSellerProductsPromise = null;
function fetchAllSellerProducts() {
    if (allSellerProductsPromise) return allSellerProductsPromise;
    allSellerProductsPromise = (async () => {
        const stubs = await fetchSellerStubs();
        mergeSellerStubs(stubs);
        // Taobao shops are left out on purpose. Every other kind is listed by the
        // worker in one call, but a taobao one costs six paced browser calls against
        // an endpoint that bans bursts — doing that for each of them on every catalogue
        // load is what tripped the guard in the first place. They fill in when opened.
        const shopIds = [...new Set(stubs.map(s => s.shopId).filter(Boolean))]
            .filter(id => !/^tb-\d+$/.test(id));
        const results = await Promise.all(
            shopIds.map(id => loadShopProducts(id).catch(() => []))
        );
        const haveLinks = new Set(allProducts.filter(p => !p.isShopStub).map(p => p.link));
        let added = 0;
        for (const arr of results) {
            for (const p of arr) {
                if (p.link && !haveLinks.has(p.link)) {
                    allProducts.push(p);
                    haveLinks.add(p.link);
                    added++;
                }
            }
        }
        if (added) bumpProductsVersion();
    })().catch(() => { allSellerProductsPromise = null; });
    return allSellerProductsPromise;
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
    const url = [p.imageOverride, p.aiTileImage, p.liveImage, p.image]
        .map(safeImageUrl)
        .find(Boolean) || '';
    return scaledImageUrl(url, TILE_IMAGE_WIDTH);
}

const SNEAKER_BRAND_ORDER = [
    'Jordan 1', 'Jordan 3', 'Jordan 4', 'Jordan 5-13', 'Jordan (Other)',
    'Dunks', 'Off-White', 'Yeezy', 'Nike', 'Adidas', 'New Balance',
    'Asics', 'UGG', 'Timberland', 'Puma', 'Crocs', 'High-End', 'Other'
];

let productsVersion = 0;
function bumpProductsVersion() {
    productsVersion++;
    brandsCache.clear();
    productKeyMap = null;
}
const brandsCache = new Map();

let productKeyMap = null;
function getProductByKey(key) {
    if (!productKeyMap) {
        productKeyMap = new Map();
        for (const p of allProducts) productKeyMap.set(productKey(p), p);
    }
    return productKeyMap.get(key);
}

function brandsForCategory(cat) {
    const cacheKey = cat + '|' + (cat === 'Sellers' ? (activeSeller || '') : '');
    if (brandsCache.has(cacheKey)) return brandsCache.get(cacheKey);
    let pool;
    if (cat === 'all') pool = allProducts;
    else if (cat === HERO_OTHER) pool = allProducts.filter(p => !HERO_MAIN_IDS.includes(p.category));
    else pool = allProducts.filter(p => p.category === cat);
    if (cat === 'Sellers') pool = pool.filter(p => !p.isShopStub);
    if (cat === 'Sellers' && activeSeller) pool = pool.filter(p => p.shopId === activeSeller);
    const brands = [...new Set(pool.map(p => p.brand))];

    let sorted;
    if (cat === 'Sneakers' || cat === 'Football' || cat === 'Basketball') {
        sorted = brands.sort((a, b) => {
            const ai = SNEAKER_BRAND_ORDER.indexOf(a);
            const bi = SNEAKER_BRAND_ORDER.indexOf(b);
            const aa = ai === -1 ? 999 : ai;
            const bb = bi === -1 ? 999 : bi;
            if (aa !== bb) return aa - bb;
            return a.localeCompare(b);
        });
    } else {
        sorted = brands.sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
        });
    }
    brandsCache.set(cacheKey, sorted);
    return sorted;
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
    let items = [...allProducts].filter(p => !p.isShopStub);
    if (searchQuery) {
        if (activeSeller) items = items.filter(p => p.shopId === activeSeller);
        const q = searchQuery.toLowerCase();
        items = items.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.batch.toLowerCase().includes(q)
        );
    } else {
        if (activeCategory === HERO_OTHER) items = items.filter(p => !HERO_MAIN_IDS.includes(p.category));
        else if (activeCategory !== 'all') items = items.filter(p => p.category === activeCategory);
        if (activeCategory === 'Sellers' && activeSeller) items = items.filter(p => p.shopId === activeSeller);
        if (activeBrand !== 'all') items = items.filter(p => p.brand === activeBrand);
        if (activeModel !== 'all') items = items.filter(p => p.model === activeModel);
    }
    if (sortMode === 'price-asc') items.sort((a, b) => parsePrice(getDisplayPrice(a)) - parsePrice(getDisplayPrice(b)));
    else if (sortMode === 'price-desc') items.sort((a, b) => parsePrice(getDisplayPrice(b)) - parsePrice(getDisplayPrice(a)));
    else if (sortMode === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name));
    else {
        items.sort((a, b) => {
            // Featured items (sheet column N "featured_items") float to the top.
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
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
    if (repr.source === 'curated') return scaledImageUrl(safeImageUrl(repr.product.tileImage), HERO_IMAGE_WIDTH);
    return scaledImageUrl(getDisplayImage(repr.product), HERO_IMAGE_WIDTH);
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
        if (cat !== 'Sellers') {
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
    if (activeSeller && history.state && history.state.view === 'seller') {
        try { history.replaceState(null, ''); } catch {}
    }
    activeCategory = cat;
    activeBrand = 'all';
    activeModel = 'all';
    activeSeller = null;
    buildHeroTiles();
    buildCategoryPills();
    buildBrandTabs();
    buildModelTabs();
    renderGrid();
    scrollToProducts();
}

async function selectSeller(shopId, opts = {}) {
    activeSeller = shopId;
    activeBrand = 'all';
    activeModel = 'all';

    if (!opts.fromHistory) {
        try { history.pushState({ view: 'seller', shopId }, ''); } catch {}
    }

    const hasRealProducts = allProducts.some(p => p.shopId === shopId && !p.isShopStub);
    if (!hasRealProducts) {
        renderShopLoading();
        try {
            const products = await loadShopProducts(shopId);
            // Keep the shop stub. uniqueSellers() orders seller cards by first
            // appearance in allProducts, and the stub also carries the card's cover,
            // description and item count. Dropping it moved the card to the bottom of
            // the grid once the real products were appended. Stubs are filtered out of
            // every product listing via isShopStub.
            for (const p of products) allProducts.push(p);
            bumpProductsVersion();
        } catch (e) {
            console.error(e);
            // The spinner lives inside the grid and showError does not touch it, so an
            // error message with a spinner still turning beneath it read as a page that
            // was somehow both failed and still trying.
            const grid = document.getElementById('productsGrid');
            if (grid) grid.innerHTML = '';
            showError(T('sellers.error', 'Could not load this shop right now. Try again in a moment.'));
            return;
        }
    }

    buildBrandTabs();
    buildModelTabs();
    renderGrid();
    if (isMobile()) scrollToProducts();
}

let loadingMore = false;

async function loadMoreShopProducts() {
    if (loadingMore || !activeSeller) return;
    if (!shopMoreAvailable.get(activeSeller)) return;

    loadingMore = true;
    const btn = document.getElementById('shopLoadMore');
    if (btn) btn.textContent = T('sellers.loading', 'Loading…');

    const next = (shopBatchesLoaded.get(activeSeller) || 0) + 1;
    try {
        const products = await loadShopProducts(activeSeller, next);
        shopBatchesLoaded.set(activeSeller, next);
        const known = new Set(allProducts.map(p => p.link));
        let added = 0;
        for (const p of products) {
            if (p.link && !known.has(p.link)) { allProducts.push(p); known.add(p.link); added++; }
        }
        if (!added) shopMoreAvailable.set(activeSeller, false);
        bumpProductsVersion();
        // renderGrid below rebuilds the tiles; the button survives, so make sure it is
        // still being watched and back to its resting label.
        const btnAfter = document.getElementById('shopLoadMore');
        if (btnAfter) {
            btnAfter.textContent = T('sellers.more', 'Show more from this shop');
            watchShopLoadMore(btnAfter);
        }
        buildBrandTabs();
        buildModelTabs();
        renderGrid();
    } catch { shopMoreAvailable.set(activeSeller, false); }
    loadingMore = false;
}

// Sits under the grid of a shop that has more behind it, and loads the next slice when
// the reader reaches it. The button stays visible and clickable — it is the thing being
// watched, so it doubles as the fallback where IntersectionObserver is missing and as
// somewhere to show that loading is happening.
let shopMoreObserver = null;

function watchShopLoadMore(btn) {
    if (!('IntersectionObserver' in window)) return;
    if (!shopMoreObserver) {
        shopMoreObserver = new IntersectionObserver(entries => {
            // One slice at a time: loadMoreShopProducts guards on loadingMore, so a fast
            // scroll cannot stack up requests against somebody else's site.
            if (entries.some(e => e.isIntersecting)) loadMoreShopProducts();
        }, { rootMargin: '400px' });
    }
    shopMoreObserver.observe(btn);
}

function renderShopLoadMore() {
    const existing = document.getElementById('shopLoadMore');
    // An active seller is the whole condition. Checking the category as well looked
    // tidier but breaks on a back-button restore, where the shop is reopened without
    // the category being set again.
    const wanted = Boolean(activeSeller && shopMoreAvailable.get(activeSeller));
    if (!wanted) { if (existing) existing.remove(); return; }
    if (existing) { existing.textContent = T('sellers.more', 'Show more from this shop'); return; }

    const grid = document.getElementById('productsGrid');
    if (!grid || !grid.parentNode) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'shopLoadMore';
    btn.className = 'shop-load-more';
    btn.textContent = T('sellers.more', 'Show more from this shop');
    btn.addEventListener('click', loadMoreShopProducts);
    grid.parentNode.insertBefore(btn, grid.nextSibling);
    watchShopLoadMore(btn);
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

// Says the item has real photos of the goods behind it, which is the thing shoppers
// look for first. Drawn rather than typed so it reads at 9px on a phone.
function qcBadgeHTML() {
    const label = T('qc.badge', 'QC');
    return `<span class="card-qc" title="${escapeHtml(T('qc.badgeTitle', 'QC photos available'))}">` +
        `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4 4.6 9 10 3.2" fill="none" ` +
        `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
        `${escapeHtml(label)}</span>`;
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
        // A taobao item has no upstream that will resolve it — kakobuy links carry
        // their own id, not a taobao one — so the price on this tile is the only price
        // the product page will ever have. Hand it over.
        if (/kakobuy\.com|taobao\.com/i.test(p.link) && typeof p.livePrice === 'number' && p.livePrice > 0) {
            q.set('price', String(p.livePrice));
            q.set('cur', 'USD');
        }
        if (p.category) q.set('cat', p.category);
        const safeYupoo = safeHttpUrl(p.yupooAlbumUrl);
        if (safeYupoo) q.set('yupoo', safeYupoo);
        detailHref = `produkt.html?${q.toString()}`;
    }

    return `
    <a href="${escapeHtml(detailHref)}" class="product-card" data-key="${escapeHtml(productKey(p))}">
        <div class="card-img ${!img ? 'no-img' : ''}">${imgTag}
            ${p.batch ? `<span class="card-batch ${batchClass(p.batch)}">${escapeHtml(p.batch)}</span>` : ''}
            ${p.hasQc ? qcBadgeHTML() : ''}
        </div>
        <div class="card-body">
            <p class="card-name">${escapeHtml(p.name)}</p>
            <span class="card-price">${escapeHtml(getDisplayPrice(p))}</span>
        </div>
    </a>`;
}

function sellerCardHTML(s) {
    const previewImg = scaledImageUrl(s.cover || '', TILE_IMAGE_WIDTH);
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
    const loading = document.getElementById('loadingState');
    const back = document.getElementById('sellerBack');
    if (back) back.style.display = 'none';

    let sellers = uniqueSellers();
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        sellers = sellers.filter(s =>
            (s.shopName || '').toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q)
        );
    }

    if (!sellers.length && !sellerStubsReady) {
        info.style.display = 'none';
        grid.style.display = 'none';
        empty.style.display = 'none';
        if (loading) loading.style.display = '';
        return;
    }
    if (loading) loading.style.display = 'none';

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
    fillTaobaoCovers(sellers, grid);

    grid.querySelectorAll('.seller-card').forEach(el => {
        const go = () => selectSeller(el.dataset.shop);
        el.addEventListener('click', go);
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        });
    });
}

// The worker builds every other seller card with a cover, but a taobao one cannot: the
// only source is usfans and they refuse the Cloudflare edge outright. Ask from here,
// once per shop, and drop the first product photo into the card.
const taobaoCoverCache = new Map();

function fillTaobaoCovers(sellers, grid) {
    for (const s of sellers) {
        if (s.cover || !/^tb-\d+$/.test(s.shopId || '')) continue;

        let promise = taobaoCoverCache.get(s.shopId);
        if (!promise) {
            const key = `tbcover:${s.shopId}`;
            const saved = readStoredJson(key);
            promise = saved
                ? Promise.resolve(saved)
                : usfansShopPage(s.shopId.replace(/^tb-/, ''), 1)
                    .then(records => {
                        if (!records || records === 'risk') return '';
                        const cover = proxyAlicdn(records.find(r => r?.image)?.image || '');
                        if (cover) writeStoredJson(key, cover);
                        return cover;
                    })
                    .catch(() => '');
            taobaoCoverCache.set(s.shopId, promise);
        }
        promise.then(cover => {
            if (!cover) return;
            s.cover = cover;
            const card = grid.querySelector(`.seller-card[data-shop="${CSS.escape(s.shopId)}"]`);
            const wrap = card && card.querySelector('.card-img');
            if (!wrap || wrap.querySelector('img')) return;
            wrap.classList.remove('no-img');
            const img = document.createElement('img');
            img.src = cover;
            img.alt = s.shopName || '';
            img.loading = 'lazy';
            img.onerror = function () { wrap.classList.add('no-img'); this.remove(); };
            wrap.prepend(img);
        });
    }
}

// The button sticks below whatever is already stuck to the top: the navbar always, the
// main category bar when the layout keeps it there. Measured on the real elements, so
// a shorter mobile navbar or a wrapped row of pills does not leave a gap or an overlap.
function positionSellerBack(el) {
    if (!el) return;
    let offset = 0;
    for (const sel of ['.navbar', '.cat-bar.cat-bar-main']) {
        const node = document.querySelector(sel);
        if (!node) continue;
        if (getComputedStyle(node).position !== 'sticky') continue;
        offset += node.getBoundingClientRect().height;
    }
    // A measurement of zero means there was nothing to measure — no layout yet, or the
    // bars are not sticky at this width. Leave the stylesheet's fallback rather than
    // pinning the button under the navbar where it cannot be seen.
    if (offset > 0) el.style.top = `${Math.round(offset)}px`;
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
    el.addEventListener('click', () => {
        if (history.state && history.state.view === 'seller') {
            history.back();
        } else {
            selectCategory('Sellers');
        }
    });
    main.insertBefore(el, info);
    positionSellerBack(el);
    window.addEventListener('resize', () => positionSellerBack(el));
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
        positionSellerBack(el);
    } else {
        el.style.display = 'none';
    }
}

const RENDER_INITIAL = 60;
const RENDER_BATCH = 80;
let renderToken = 0;
const scheduleIdle = window.requestIdleCallback
    ? (cb) => window.requestIdleCallback(cb, { timeout: 200 })
    : (cb) => setTimeout(cb, 16);

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
    const myToken = ++renderToken;

    count.textContent = T('results.count', `${items.length} products`, { n: items.length });
    info.style.display = 'block';

    if (!items.length) {
        grid.style.display = 'none';
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    renderShopLoadMore();

    const initial = items.slice(0, RENDER_INITIAL);
    grid.innerHTML = initial.map(cardHTML).join('');

    if (items.length > RENDER_INITIAL) {
        let i = RENDER_INITIAL;
        const mountNext = () => {
            if (myToken !== renderToken) return;
            const chunk = items.slice(i, i + RENDER_BATCH);
            if (!chunk.length) return;
            const tmp = document.createElement('div');
            tmp.innerHTML = chunk.map(cardHTML).join('');
            const frag = document.createDocumentFragment();
            while (tmp.firstChild) frag.appendChild(tmp.firstChild);
            grid.appendChild(frag);
            i += RENDER_BATCH;
            if (i < items.length) scheduleIdle(mountNext);
        };
        scheduleIdle(mountNext);
    }

    renderShopLoadMore();
}

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    const msgEl = document.getElementById('errorMsg');
    if (msgEl) msgEl.textContent = msg;
}

const enrichCache = new Map();
const enrichPromises = new Map();

// Whether an item has QC photos, asked once per tile and remembered. The answer is
// cached hard at the edge, so this is usually a hit that never reaches an agent; the
// copy in localStorage saves even that on a second visit. A day matches what the API
// promises — a warehouse either photographed an item or it did not, and that changes
// over days.
const QC_FLAG_TTL = 24 * 60 * 60 * 1000;
const qcFlagCache = new Map();

function readQcFlag(link) {
    if (qcFlagCache.has(link)) return qcFlagCache.get(link);
    try {
        const raw = localStorage.getItem(`qcflag:${link}`);
        if (!raw) return undefined;
        const { n, t } = JSON.parse(raw);
        if (!t || Date.now() - t > QC_FLAG_TTL) return undefined;
        qcFlagCache.set(link, n);
        return n;
    } catch { return undefined; }
}

function writeQcFlag(link, n) {
    qcFlagCache.set(link, n);
    // Private windows and blocked site data both throw here; the badge just costs a
    // fetch next time.
    try { localStorage.setItem(`qcflag:${link}`, JSON.stringify({ n, t: Date.now() })); } catch {}
}

// usfans refuses the Cloudflare edge for roughly six requests in ten, so the worker
// often cannot tell whether an item has QC photos and the tile goes unbadged even
// though the photos are there — measured at five badges across twelve items that all
// have QC, with no wrong answers, only missing ones. The visitor's own address is
// served, so ask from here when the worker came back unsure.
//
// Paced on purpose. Bursting their search endpoint earned a ban that outlasted the
// afternoon, and there is no reason to find out the hard way whether this endpoint is
// guarded the same way: two at a time, a gap between starts, and only for tiles someone
// is actually looking at.
const QC_MAX_INFLIGHT = 2;
const QC_GAP_MS = 250;
const qcQueue = [];
let qcInFlight = 0;

function weidianIdFromLink(link) {
    try {
        const u = new URL(link, location.href);
        const host = u.hostname.toLowerCase();
        // A seller tile is an album; only the worker can resolve one, so the direct
        // usfans fallback sits this one out rather than guessing.
        if (host.endsWith('.yupoo.com')) return null;
        if (host === 'usfans.com' || host.endsWith('.usfans.com')) {
            const m = u.pathname.match(/\/product\/3\/(\d+)/);
            return m ? m[1] : null;
        }
        if (host === 'weidian.com' || host.endsWith('.weidian.com')) {
            const id = u.searchParams.get('itemID') || u.searchParams.get('itemId') || u.searchParams.get('offerId');
            return id && /^\d+$/.test(id) ? id : null;
        }
    } catch {}
    return null;
}

function pumpQcQueue() {
    if (qcInFlight >= QC_MAX_INFLIGHT) return;
    const job = qcQueue.shift();
    if (!job) return;
    qcInFlight++;
    job().finally(() => {
        qcInFlight--;
        setTimeout(pumpQcQueue, QC_GAP_MS);
    });
}

// Resolves to the photo count, or null when usfans did not answer either.
function usfansQcCount(link) {
    const itemId = weidianIdFromLink(link);
    if (!itemId) return Promise.resolve(null);

    return new Promise(resolve => {
        qcQueue.push(async () => {
            // A request that never settles would stall the queue behind it.
            const abort = new AbortController();
            const timer = setTimeout(() => abort.abort(), 8000);
            try {
                const r = await fetch(`https://usfans.com/api/goods/estimate-info?channel=3&goodsId=${itemId}`,
                    { signal: abort.signal });
                if (!r.ok) return resolve(null);
                const d = await r.json();
                if (d?.code !== 200 || !d?.data) return resolve(null);
                resolve(Array.isArray(d.data.qcImages) ? d.data.qcImages.length : 0);
            } catch { resolve(null); }
            finally { clearTimeout(timer); }
        });
        pumpQcQueue();
    });
}

async function flagQc(p) {
    // Everything with a link gets asked. Taobao items were skipped here on the grounds
    // that nothing has QC for them — true of usfans, which photographs weidian orders
    // only, but not of qcitems, which mirrors other agents' sets. Measured after the
    // fact: of the 73 catalogue items linking straight to taobao or 1688, the first
    // three carried 612, 19 and 34 photos, and not one of them could show a badge.
    if (!p.link || p.isShopStub || p.hasQc) return;

    const cached = readQcFlag(p.link);
    if (cached !== undefined) {
        if (cached > 0) { p.hasQc = true; updateCard(p); }
        return;
    }
    let n = null;
    try {
        const r = await fetch(`/api/qcflag?url=${encodeURIComponent(p.link)}`);
        if (r.ok) n = (await r.json()).qc;
    } catch {}

    // The worker could not find out. Ask usfans ourselves before giving up on the tile.
    if (typeof n !== 'number') n = await usfansQcCount(p.link);
    if (typeof n !== 'number') return;

    writeQcFlag(p.link, n);
    if (n > 0) {
        p.hasQc = true;
        updateCard(p);
    }
}

// A tile's price and photo both arrive from one /api/product call that takes around
// three seconds when the upstream answers at all, and roughly three catalogue items in
// five are shop entries with no price in the sheet — for those, this call is the only
// price the grid will ever show. The answer does not change over an afternoon, so keep
// it the way flagQc already keeps its verdict: a copy in localStorage, so a second visit
// and a scroll back up the grid both draw from disk instead of the wire.
const ENRICH_TTL = 12 * 60 * 60 * 1000;

function readEnrich(link) {
    try {
        const raw = localStorage.getItem(`enrich:${link}`);
        if (!raw) return null;
        const v = JSON.parse(raw);
        if (!v.t || Date.now() - v.t > ENRICH_TTL) return null;
        return v;
    } catch { return null; }
}

// Private windows, blocked site data and a full quota all throw. The tile simply asks
// again next time, which is what it did before this cache existed.
function writeEnrich(link, priceUsd, image) {
    if (priceUsd == null && !image) return;
    try {
        localStorage.setItem(`enrich:${link}`, JSON.stringify({ p: priceUsd, i: image, t: Date.now() }));
    } catch {}
}

async function enrichProduct(p) {
    if (!p.link || p.isShopStub) return;
    const key = p.link;
    if (enrichCache.has(key)) {
        applyEnrichment(p, enrichCache.get(key));
        return;
    }
    const stored = readEnrich(key);
    if (stored) {
        let changed = false;
        if (stored.p != null && p.livePrice !== stored.p) { p.livePrice = stored.p; changed = true; }
        if (stored.i && p.liveImage !== stored.i) { p.liveImage = stored.i; changed = true; }
        if (changed) updateCard(p);
        return;
    }
    let promise = enrichPromises.get(key);
    if (!promise) {
        promise = (async () => {
            try {
                // v=2 mints a fresh cache key. /api/product used to send
                // max-age=3600 even for the blank payload it returns when an
                // upstream is down, so browsers that hit a bad minute replayed an
                // empty tile — no image, no price, since the sheet supplies
                // neither — and a hard reload does not clear it: Ctrl+Shift+R
                // skips the HTTP cache for the document, not for fetches this
                // observer fires after load. Bump if it ever needs resetting again.
                const r = await fetch(`/api/product?url=${encodeURIComponent(p.link)}&v=2`);
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
    writeEnrich(p.link, data.priceUsd != null ? data.priceUsd : null, pick || null);
}

function updateCard(p) {
    const sel = `.product-card[data-key="${CSS.escape(productKey(p))}"]`;
    document.querySelectorAll(sel).forEach(card => {
        const priceEl = card.querySelector('.card-price');
        if (priceEl) priceEl.textContent = getDisplayPrice(p);

        const imgWrap = card.querySelector('.card-img');
        if (p.hasQc && imgWrap && !imgWrap.querySelector('.card-qc')) {
            imgWrap.insertAdjacentHTML('beforeend', qcBadgeHTML());
        }
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
        allProducts.forEach(p => { enrichProduct(p); flagQc(p); });
        return;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const key = entry.target.dataset.key;
            const p = getProductByKey(key);
            if (p) {
                enrichProduct(p);
                flagQc(p);
            }
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '300px' });

    const observeEl = (el) => {
        if (el && el.dataset && el.dataset.key && !el.dataset.observed) {
            el.dataset.observed = '1';
            observer.observe(el);
        }
    };
    document.querySelectorAll('.product-card[data-key]').forEach(observeEl);

    const grid = document.getElementById('productsGrid');
    if (grid) {
        const mo = new MutationObserver(muts => {
            for (const m of muts) {
                m.addedNodes.forEach(n => {
                    if (n.nodeType !== 1) return;
                    if (n.classList && n.classList.contains('product-card')) observeEl(n);
                });
            }
        });
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

// Push the in-memory search query back into the input box. iOS Safari clears
// form fields on bfcache restore — and does it asynchronously, sometimes AFTER
// the pageshow handler runs — so we re-sync now and again on the next frames.
function syncSearchInput() {
    const inp = document.getElementById('searchInput');
    if (inp && inp.value !== searchQuery) inp.value = searchQuery;
}

function syncSearchInputSoon() {
    syncSearchInput();
    requestAnimationFrame(syncSearchInput);
    setTimeout(syncSearchInput, 0);
    setTimeout(syncSearchInput, 150);
    setTimeout(syncSearchInput, 400);
}

window.addEventListener('pagehide', saveCatalogState);
window.addEventListener('beforeunload', saveCatalogState);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveCatalogState();
});

window.addEventListener('popstate', e => {
    const st = e.state;
    if (st && st.view === 'seller' && st.shopId) {
        if (activeCategory !== 'Sellers' || activeSeller !== st.shopId) {
            activeCategory = 'Sellers';
            activeSeller = st.shopId;
            activeBrand = 'all';
            activeModel = 'all';
            buildHeroTiles();
            buildCategoryPills();
            buildBrandTabs();
            buildModelTabs();
            renderGrid();
        }
    } else if (activeSeller) {
        activeSeller = null;
        activeBrand = 'all';
        activeModel = 'all';
        fetchSellerStubs().then(stubs => {
            mergeSellerStubs(stubs);
            if (!activeSeller && activeCategory === 'Sellers') renderGrid();
        });
        buildBrandTabs();
        buildModelTabs();
        renderGrid();
    }
});

window.addEventListener('pageshow', e => {
    const fly = document.getElementById('catFlyout');
    if (fly) fly.classList.remove('open');
    if (e.persisted) {
        const s = readCatalogState();
        if (s && typeof s.scrollY === 'number') window.scrollTo(0, s.scrollY);
        // The JS state (and therefore the filtered grid) is preserved on bfcache
        // restore, but iOS clears the input — re-sync it over the next frames.
        syncSearchInputSoon();
    }
});

async function init() {
    try {
        const stubsPromise = fetchSellerStubs();
        allProducts = await fetchProducts();
        bumpProductsVersion();
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
                syncSearchInputSoon();
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

        stubsPromise.then(stubs => {
            mergeSellerStubs(stubs);
            buildCategoryPills();
            if (activeCategory === 'Sellers' && !activeSeller) renderGrid();
        });

        fetchAllSellerProducts().then(() => {
            if (searchQuery) renderGrid();
        });

        if (activeSeller) {
            const hasReal = allProducts.some(p => p.shopId === activeSeller && !p.isShopStub);
            if (!hasReal) {
                try {
                    const products = await loadShopProducts(activeSeller);
                    // Stub stays for the same reason as in selectSeller().
                    for (const p of products) allProducts.push(p);
                    bumpProductsVersion();
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

let searchDebounceTimer = null;
document.getElementById('searchInput').addEventListener('input', e => {
    const val = e.target.value.trim();
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        searchQuery = val;
        renderGrid();
        if (searchQuery) {
            fetchAllSellerProducts().then(() => {
                if (searchQuery) renderGrid();
            });
        }
    }, 180);
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
    // The Discord link is wired for every page in script.js.
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
