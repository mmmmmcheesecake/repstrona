const REF = '?ref=MGRSBE';

let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'default';

const KNOWN_BATCHES = ['LJR', 'BD', 'DG', 'PK', 'UA', 'OG'];

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

function detectCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('jordan 1')) return 'Jordan 1';
    if (n.includes('jordan 3')) return 'Jordan 3';
    if (n.includes('jordan 4')) return 'Jordan 4';
    if (n.includes('jordan 5')) return 'Jordan 5';
    if (n.includes('jordan 6')) return 'Jordan 6';
    if (n.includes('jordan')) return 'Jordan';
    if (n.includes('yeezy') || n.includes('adidas')) return 'Adidas';
    if (n.includes('dunk') || n.includes('air force') || n.includes('air max') || n.includes('nike')) return 'Nike';
    if (n.includes('new balance') || n.includes('nb ')) return 'New Balance';
    return 'Inne';
}

async function fetchProducts() {
    const res = await fetch('/api/sheet');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Błędna odpowiedź');

    return data.map(p => ({
        name: p.name,
        batch: p.batch || '',
        link: ensureRef(p.link),
        price: p.price || '',
        image: p.image || '',
        description: p.description || '',
        budgetLink: ensureRef(p.budgetLink),
        category: detectCategory(p.name),
        livePrice: null,
        liveImage: null,
    }));
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

function getFiltered() {
    let items = [...allProducts];
    if (activeCategory !== 'all') items = items.filter(p => p.category === activeCategory);
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

function buildCategoryTabs() {
    const cats = [...new Set(allProducts.map(p => p.category))].sort();
    const tabs = document.getElementById('categoryTabs');
    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-pill';
        btn.dataset.cat = cat;
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-pill').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = cat;
            renderGrid();
        });
        tabs.appendChild(btn);
    });
}

function productKey(p) {
    return p.link || p.name;
}

function cardHTML(p) {
    const img = getDisplayImage(p);
    const imgTag = img
        ? `<img src="${img}" alt="${p.name}" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
        : '';

    const mainBtn = p.link
        ? `<a href="${p.link}" target="_blank" rel="noopener" class="card-btn primary">Kup →</a>`
        : `<span class="card-btn disabled">Brak</span>`;

    const budgetBtn = p.budgetLink
        ? `<a href="${p.budgetLink}" target="_blank" rel="noopener" class="card-btn">Budget</a>`
        : '';

    return `
    <div class="product-card" data-key="${productKey(p).replace(/"/g, '&quot;')}">
        <div class="card-img ${!img ? 'no-img' : ''}">${imgTag}
            ${p.batch ? `<span class="card-batch ${batchClass(p.batch)}">${p.batch}</span>` : ''}
        </div>
        <div class="card-body">
            <p class="card-name">${p.name}</p>
            <div class="card-foot">
                <span class="card-price">${getDisplayPrice(p)}</span>
                <div class="card-actions">${mainBtn}${budgetBtn}</div>
            </div>
        </div>
    </div>`;
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
}

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    const msgEl = document.getElementById('errorMsg');
    if (msgEl) msgEl.textContent = msg;
}

const enrichCache = new Map();
const enrichInFlight = new Set();

async function enrichProduct(p) {
    if (!p.link) return;
    const key = p.link;
    if (enrichInFlight.has(key)) return;
    if (enrichCache.has(key)) {
        applyEnrichment(p, enrichCache.get(key));
        return;
    }
    enrichInFlight.add(key);
    try {
        const r = await fetch(`/api/product?url=${encodeURIComponent(p.link)}`);
        if (!r.ok) return;
        const data = await r.json();
        enrichCache.set(key, data);
        applyEnrichment(p, data);
    } catch {} finally {
        enrichInFlight.delete(key);
    }
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
        allProducts = await fetchProducts();

        document.getElementById('loadingState').style.display = 'none';

        buildCategoryTabs();
        renderGrid();

        const params = new URLSearchParams(window.location.search);
        const kat = params.get('kategoria');
        if (kat) {
            const match = [...new Set(allProducts.map(p => p.category))].find(c => c.toLowerCase() === kat.toLowerCase());
            if (match) {
                activeCategory = match;
                document.querySelectorAll('.cat-pill').forEach(t => t.classList.toggle('active', t.dataset.cat === match));
                renderGrid();
            }
        }

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

document.querySelector('[data-cat="all"]').addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-cat="all"]').classList.add('active');
    activeCategory = 'all';
    renderGrid();
});

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const el = document.getElementById('nav-discord');
    if (el && s.discordUrl) el.href = s.discordUrl;
}).catch(() => {});

init();
