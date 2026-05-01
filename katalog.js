const REF = '?ref=MGRSBE';

let allProducts = [];
let activeBrand = 'all';
let activeModel = 'all';
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'default';

const CATEGORIES = [
    'Sneakers', 'Hoodie', 'Shorts', 'Underwear', 'Crewnecks', 'Sport Clothing',
    'Accesories', 'T-shirts', 'Electronics', 'Bags', 'High-end', "Jersey's",
    'Jewelry', 'Lego', 'Jackets', 'Tracksuits', 'Sunglasses', 'Belt', 'Vests',
    'Pants', "Mask's & hats", 'Watches', 'Football', 'Basketball', 'Perfume'
];

function detectCategory(name, description = '') {
    const text = ((name || '') + ' ' + (description || '')).toLowerCase();

    if (/\blego\b/.test(text)) return 'Lego';
    if (/\b(perfume|fragrance|cologne|eau de (parfum|toilette)|edp|edt|parfum)\b/.test(text)) return 'Perfume';
    if (/\b(rolex|patek|audemars|cartier watch|richard mille|omega watch|hublot|tag heuer|ap watch|datejust|submariner|daytona|gmt|nautilus)\b/.test(text)) return 'Watches';
    if (/\bwatch(es)?\b/.test(text) && !/\bwatchcase\b/.test(text)) return 'Watches';
    if (/\b(sunglasses|sunglass|shades|eyewear|goggles|aviators)\b/.test(text)) return 'Sunglasses';
    if (/\b(necklace|bracelet|earring|earrings|cuban link|chain|pendant|jewelry|jewellery|cufflink|brooch|anklet|ring)\b/.test(text)) return 'Jewelry';
    if (/\b(airpods|iphone|ipad|macbook|airtag|earbud|earbuds|headphone|headphones|charger|earpods|ps5|ps4|console|nintendo|xbox|samsung galaxy|smartwatch|apple watch|drone|gopro)\b/.test(text)) return 'Electronics';
    if (/\b(backpack|handbag|tote|duffle|duffel|luggage|suitcase|crossbody|messenger|fanny pack|bumbag|sling)\b/.test(text)) return 'Bags';
    if (/\bbag(s)?\b/.test(text) && !/\bairbag\b/.test(text)) return 'Bags';
    if (/\bbelt(s)?\b/.test(text)) return 'Belt';
    if (/\b(tracksuit|track suit|jogging suit|track set)\b/.test(text)) return 'Tracksuits';
    if (/\b(jacket|parka|puffer|coat|varsity|bomber|windbreaker|anorak|trench|down jacket|peacoat)\b/.test(text)) return 'Jackets';
    if (/\b(vest|gilet|waistcoat)\b/.test(text)) return 'Vests';
    if (/\b(hoodie|hoody|hooded)\b/.test(text)) return 'Hoodie';
    if (/\b(crewneck|crew neck|sweatshirt|jumper|sweater|cardigan|pullover|knit)\b/.test(text)) return 'Crewnecks';
    if (/\bjersey|trikot|kit\b/.test(text)) return "Jersey's";
    if (/\b(t-shirt|tshirt|tee|polo shirt|polo)\b/.test(text)) return 'T-shirts';
    if (/\bshorts?\b/.test(text)) return 'Shorts';
    if (/\b(jeans|trousers|pants|sweatpants|joggers|cargo|leggings|chinos|denim)\b/.test(text)) return 'Pants';
    if (/\b(boxer|boxers|briefs|underwear|thong|panty|panties|lingerie)\b/.test(text)) return 'Underwear';
    if (/\b(beanie|bucket hat|baseball cap|snapback|fedora|balaclava|skull cap|durag|ski mask|face mask)\b/.test(text)) return "Mask's & hats";
    if (/\b(cap|hat|mask)\b/.test(text)) return "Mask's & hats";
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

function detectBrandModel(name) {
    const n = name.toLowerCase();

    let m;
    if ((m = n.match(/jordan\s*(\d+)/))) return { brand: 'Jordan', model: `Jordan ${m[1]}` };
    if (n.includes('jordan')) return { brand: 'Jordan', model: 'Inne' };

    if ((m = n.match(/yeezy\s*(\d{3,4})/))) return { brand: 'Adidas', model: `Yeezy ${m[1]}` };
    if (n.includes('yeezy slide')) return { brand: 'Adidas', model: 'Yeezy Slide' };
    if (n.includes('yeezy foam')) return { brand: 'Adidas', model: 'Yeezy Foam' };
    if (n.includes('yeezy')) return { brand: 'Adidas', model: 'Yeezy' };
    if (n.includes('samba')) return { brand: 'Adidas', model: 'Samba' };
    if (n.includes('gazelle')) return { brand: 'Adidas', model: 'Gazelle' };
    if (n.includes('campus')) return { brand: 'Adidas', model: 'Campus' };
    if (n.includes('handball spezial') || n.includes('spezial')) return { brand: 'Adidas', model: 'Spezial' };
    if (n.includes('adidas')) return { brand: 'Adidas', model: 'Inne' };

    if (n.includes('dunk low')) return { brand: 'Nike', model: 'Dunk Low' };
    if (n.includes('dunk high') || n.includes('dunk hi')) return { brand: 'Nike', model: 'Dunk High' };
    if (n.includes('dunk')) return { brand: 'Nike', model: 'Dunk' };
    if (n.includes('air force')) return { brand: 'Nike', model: 'Air Force' };
    if (n.includes('air max')) return { brand: 'Nike', model: 'Air Max' };
    if (n.includes('cortez')) return { brand: 'Nike', model: 'Cortez' };
    if (n.includes('vomero')) return { brand: 'Nike', model: 'Vomero' };
    if (n.includes('nike')) return { brand: 'Nike', model: 'Inne' };

    if ((m = n.match(/(?:new balance|nb)\s*(\d{3,4}r?)/i))) return { brand: 'New Balance', model: m[1].toUpperCase() };
    if (n.includes('new balance') || /\bnb\b/.test(n)) return { brand: 'New Balance', model: 'Inne' };

    return { brand: 'Inne', model: 'Inne' };
}

async function fetchProducts() {
    const res = await fetch('/api/sheet');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Błędna odpowiedź');

    return data.map(p => {
        const { brand, model } = detectBrandModel(p.name);
        const category = detectCategory(p.name, p.description);
        return {
            name: p.name,
            batch: p.batch || '',
            link: ensureRef(p.link),
            price: p.price || '',
            image: p.image || '',
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
    if (p.livePrice != null) return `$${Math.round(p.livePrice)}`;
    return p.price;
}

function getDisplayImage(p) {
    return p.liveImage || p.image || '';
}

function brandsAvailable() {
    const pool = activeCategory === 'all'
        ? allProducts
        : allProducts.filter(p => p.category === activeCategory);
    return [...new Set(pool.map(p => p.brand))].sort((a, b) => {
        if (a === 'Inne') return 1;
        if (b === 'Inne') return -1;
        return a.localeCompare(b);
    });
}

function modelsForBrand(brand) {
    let items = activeCategory === 'all'
        ? allProducts
        : allProducts.filter(p => p.category === activeCategory);
    if (brand !== 'all') items = items.filter(p => p.brand === brand);
    return [...new Set(items.map(p => p.model))].sort((a, b) => {
        if (a === 'Inne') return 1;
        if (b === 'Inne') return -1;
        const an = parseInt(a.replace(/\D/g, ''), 10);
        const bn = parseInt(b.replace(/\D/g, ''), 10);
        if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
        return a.localeCompare(b);
    });
}

function getFiltered() {
    let items = [...allProducts];
    if (activeCategory !== 'all') items = items.filter(p => p.category === activeCategory);
    if (activeBrand !== 'all') items = items.filter(p => p.brand === activeBrand);
    if (activeModel !== 'all') items = items.filter(p => p.model === activeModel);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.batch.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }
    if (sortMode === 'price-asc') items.sort((a, b) => parsePrice(getDisplayPrice(a)) - parsePrice(getDisplayPrice(b)));
    if (sortMode === 'price-desc') items.sort((a, b) => parsePrice(getDisplayPrice(b)) - parsePrice(getDisplayPrice(a)));
    if (sortMode === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
}

function buildBrandTabs() {
    const tabs = document.getElementById('brandTabs') || document.getElementById('categoryTabs');
    if (!tabs) return;
    tabs.innerHTML = '';

    const allBtn = makeTab('Wszystkie', 'all', activeBrand === 'all');
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

    const allBtn = makeTab('Wszystkie', 'all', activeModel === 'all');
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
        detailHref = `produkt.html?${q.toString()}`;
    }

    const desc = (p.description || '').replace(/\s+/g, ' ').trim();

    return `
    <a href="${detailHref}" class="product-card" data-key="${productKey(p).replace(/"/g, '&quot;')}">
        <div class="card-img ${!img ? 'no-img' : ''}">${imgTag}
            ${p.batch ? `<span class="card-batch ${batchClass(p.batch)}">${p.batch}</span>` : ''}
        </div>
        <div class="card-body">
            <p class="card-name">${escapeHtml(p.name)}</p>
            ${desc ? `<p class="card-desc">${escapeHtml(desc)}</p>` : '<p class="card-desc card-desc--empty"></p>'}
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

    count.textContent = `${items.length} produktów`;
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

function applyEnrichment(p, data) {
    if (!data) return;
    let changed = false;
    if (data.priceUsd != null && p.livePrice !== data.priceUsd) {
        p.livePrice = data.priceUsd;
        changed = true;
    }
    if (data.image && p.liveImage !== data.image) {
        p.liveImage = data.image;
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

async function init() {
    try {
        allProducts = dedupProducts(await fetchProducts());
        document.getElementById('loadingState').style.display = 'none';

        const params = new URLSearchParams(window.location.search);
        const kat = params.get('kategoria');
        if (kat) {
            const brandMatch = brandsAvailable().find(b => b.toLowerCase() === kat.toLowerCase());
            if (brandMatch) activeBrand = brandMatch;
        }

        buildBrandTabs();
        buildModelTabs();
        renderGrid();
        setupLazyEnrichment();
    } catch (e) {
        console.error(e);
        showError('Nie udało się załadować produktów.');
    }
}

document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderGrid();
});

document.getElementById('sortSelect').addEventListener('change', e => {
    sortMode = e.target.value;
    renderGrid();
});

const catSel = document.getElementById('categorySelect');
if (catSel) {
    CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catSel.appendChild(opt);
    });
    catSel.addEventListener('change', e => {
        activeCategory = e.target.value || 'all';
        activeBrand = 'all';
        activeModel = 'all';
        buildBrandTabs();
        buildModelTabs();
        renderGrid();
    });
}

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const el = document.getElementById('nav-discord');
    if (el && s.discordUrl) el.href = s.discordUrl;
}).catch(() => {});

init();
