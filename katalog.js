const REF = '?ref=MGRSBE';

function T(key, fallback, vars) {
    if (window.RePluGI18n) return window.RePluGI18n.t(key, vars);
    return fallback;
}

let allProducts = [];
let activeBrand = 'all';
let activeModel = 'all';
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'default';

const CATEGORIES = [
    'Sneakers', 'Hoodies/Crewnecks', 'Shorts', 'Underwear', 'Sport Clothing',
    'Accesories', 'T-shirts', 'High-end', "Jersey's",
    'Lego', 'Jackets', 'Vests',
    'Pants', 'Watches', 'Football', 'Basketball'
];

const HERO_OTHER = '__OTHER__';
const HERO_TILES = [
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
    if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
    const canonical = CATEGORIES.find(x => x.toLowerCase() === key);
    if (canonical) return canonical;
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

function dedupProducts(products) {
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
        const rep = group.find(p => p.image) || group[0];
        merged.push({
            ...rep,
            name: stripBatchFromName(rep.name),
            batch: '',
        });
    }
    return merged;
}

function batchClass(b) {
    const u = (b || '').trim().toUpperCase();
    return KNOWN_BATCHES.includes(u) ? `batch-${u}` : 'batch-other';
}

function ensureRef(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (!url || url === '#') return null;
    if (url.includes('ref=MGRSBE')) return url;
    return url.includes('?') ? url + '&ref=MGRSBE' : url + REF;
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

function tagKey(link) {
    if (!link) return '';
    return link.split('?')[0].replace(/\/+$/, '');
}

async function fetchProducts() {
    const [sheetRes, aiTags] = await Promise.all([
        fetch('/api/sheet'),
        fetchTags(),
    ]);
    if (!sheetRes.ok) throw new Error(`HTTP ${sheetRes.status}`);
    const data = await sheetRes.json();
    if (!Array.isArray(data)) throw new Error('Błędna odpowiedź');

    return data.map(p => {
        const auto = (() => {
            const c = detectCategory(p.name, p.description);
            const { brand, model } = detectBrandModel(p.name, c);
            return { category: c, brand, model };
        })();

        const ai = aiTags[tagKey(p.link)] || {};

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
            description: p.description || '',
            budgetLink: ensureRef(p.budgetLink),
            brand,
            model,
            category,
            livePrice: null,
            liveImage: null,
        };
    });
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
    return p.imageOverride || p.liveImage || p.image || '';
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
    if (sortMode === 'price-desc') items.sort((a, b) => parsePrice(getDisplayPrice(b)) - parsePrice(getDisplayPrice(a)));
    if (sortMode === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
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
    if (repr.source === 'curated') return repr.product.tileImage;
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
        const imgHtml = img
            ? `<img src="${img}" alt="${t.label}" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
            : '';
        tile.innerHTML = `
            <div class="hero-tile-img${img ? '' : ' no-img'}">${imgHtml}</div>
            <span class="hero-tile-label">${t.label}</span>
        `;

        tile.addEventListener('click', () => {
            selectCategory(t.id);
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
        const brands = brandsForCategory(cat);
        if (!brands.length) return;

        const btn = makeTab(cat, cat, activeCategory === cat);
        btn.addEventListener('click', () => { hideFlyout(); selectCategory(cat); });
        btn.addEventListener('mouseenter', () => showFlyout(btn, cat));
        btn.addEventListener('mouseleave', hideFlyoutSoon);
        wrap.appendChild(btn);
    });
}

function selectCategory(cat) {
    activeCategory = cat;
    activeBrand = 'all';
    activeModel = 'all';
    buildHeroTiles();
    buildCategoryPills();
    buildBrandTabs();
    buildModelTabs();
    renderGrid();
}

function buildBrandTabs() {
    const tabs = document.getElementById('brandTabs') || document.getElementById('categoryTabs');
    if (!tabs) return;
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
}

function selectModel(model) {
    activeModel = model;
    buildModelTabs();
    renderGrid();
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
    const img = getDisplayImage(p);
    const imgTag = img
        ? `<img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
        : '';

    let detailHref = '#';
    if (p.link) {
        const q = new URLSearchParams({ url: p.link, name: p.name, batch: p.batch || '' });
        if (p.budgetLink) q.set('budget', p.budgetLink);
        if (p.imageOverride) q.set('img', p.imageOverride);
        detailHref = `produkt.html?${q.toString()}`;
    }

    return `
    <a href="${detailHref}" class="product-card" data-key="${productKey(p).replace(/"/g, '&quot;')}">
        <div class="card-img ${!img ? 'no-img' : ''}">${imgTag}
            ${p.batch ? `<span class="card-batch ${batchClass(p.batch)}">${p.batch}</span>` : ''}
        </div>
        <div class="card-body">
            <p class="card-name">${escapeHtml(p.name)}</p>
            <span class="card-price">${escapeHtml(getDisplayPrice(p))}</span>
        </div>
    </a>`;
}

function renderGrid() {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const info = document.getElementById('resultsInfo');
    const count = document.getElementById('resultsCount');
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
    if (!p.link) return;
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
    const inHand = Array.isArray(data.inHandImages) ? data.inHandImages : [];
    if (inHand.length >= 6) return inHand[Math.floor(inHand.length / 2)];
    if (inHand.length >= 3) return inHand[Math.floor(inHand.length / 2)];
    if (inHand.length >= 1) return inHand[inHand.length - 1];

    const main = Array.isArray(data.images) ? data.images : [];
    if (main.length >= 4) return main[main.length - 1];
    if (main.length >= 2) return main[1];

    const sku = Array.isArray(data.skuImages) ? data.skuImages : [];
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
        const newImg = getDisplayImage(p);
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
            activeCategory, activeBrand, activeModel,
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
    }
});

async function init() {
    try {
        allProducts = dedupProducts(await fetchProducts());
        document.getElementById('loadingState').style.display = 'none';

        const returnState = readCatalogState();
        const params = new URLSearchParams(window.location.search);
        const kat = params.get('kategoria');

        if (returnState) {
            if (returnState.activeCategory) activeCategory = returnState.activeCategory;
            if (returnState.activeBrand) activeBrand = returnState.activeBrand;
            if (returnState.activeModel) activeModel = returnState.activeModel;
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

        buildHeroTiles();
        buildCategoryPills();
        buildBrandTabs();
        buildModelTabs();
        renderGrid();
        setupLazyEnrichment();
        eagerEnrichTileReprs();

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

init();
