const SHEET_ID = '1pc2KcMDWELMeQUW_ZvjHEvDa56inb3IcoHJ9STyGVkk';
const REF = '?ref=MGRSBE';

// Kolumny arkusza (0-indexed)
const COL = { name: 0, batch: 1, link: 2, price: 3, image: 4, description: 5, budgetLink: 6 };

let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'default';

function addRef(url) {
    if (!url || !url.trim() || url === '#' || url.toLowerCase() === 'link' || url.toLowerCase() === 'budget link') return null;
    url = url.trim();
    if (url.includes('ref=MGRSBE')) return url;
    return url.includes('?') ? url + '&ref=MGRSBE' : url + REF;
}

// Auto-wykrywanie kategorii z nazwy produktu
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
    if (n.includes('panda') || n.includes('panda')) return 'Inne';
    return 'Inne';
}

// Parser CSV
function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
    return lines.map(line => {
        const cells = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i], nx = line[i + 1];
            if (inQ) {
                if (ch === '"' && nx === '"') { cur += '"'; i++; }
                else if (ch === '"') inQ = false;
                else cur += ch;
            } else {
                if (ch === '"') inQ = true;
                else if (ch === ',') { cells.push(cur.trim()); cur = ''; }
                else cur += ch;
            }
        }
        cells.push(cur.trim());
        return cells;
    });
}

// Pobieranie z Google Sheets przez własną funkcję Netlify
async function fetchProducts() {
    const res = await fetch('/api/sheet');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) throw new Error('Błędna odpowiedź');
    return parseCSV(text);
}

function rowToProduct(row) {
    const name = (row[COL.name] || '').trim();
    if (!name) return null;
    return {
        name,
        batch:       (row[COL.batch] || '').trim(),
        link:        addRef(row[COL.link]),
        price:       (row[COL.price] || '').trim(),
        image:       (row[COL.image] || '').trim(),
        description: (row[COL.description] || '').trim(),
        budgetLink:  addRef(row[COL.budgetLink]),
        category:    detectCategory(name)
    };
}

function parsePrice(str) {
    return parseFloat((str || '0').replace(/[^0-9.]/g, '')) || 0;
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
    if (sortMode === 'price-asc') items.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    if (sortMode === 'price-desc') items.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    if (sortMode === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
}

function buildCategoryTabs() {
    const cats = [...new Set(allProducts.map(p => p.category))].sort();
    const tabs = document.getElementById('categoryTabs');
    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-tab';
        btn.dataset.cat = cat;
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = cat;
            renderGrid();
        });
        tabs.appendChild(btn);
    });
}

function cardHTML(p) {
    const img = p.image
        ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">`
        : '';

    const mainBtn = p.link
        ? `<a href="${p.link}" target="_blank" rel="noopener" class="btn-link main-link">Kup →</a>`
        : `<span class="btn-link disabled">Brak linku</span>`;

    const budgetBtn = p.budgetLink
        ? `<a href="${p.budgetLink}" target="_blank" rel="noopener" class="btn-link budget-link">Budget</a>`
        : '';

    return `
    <div class="product-card">
        <div class="product-img ${!p.image ? 'no-img' : ''}">${img}
            <div class="product-category">${p.category}</div>
            ${p.batch ? `<div class="batch-badge">${p.batch}</div>` : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${p.name}</h3>
            ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
            <div class="product-footer">
                <span class="product-price">${p.price}</span>
                <div class="product-btns">
                    ${mainBtn}
                    ${budgetBtn}
                </div>
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
    document.getElementById('errorMsg').textContent = msg;
}

async function init() {
    try {
        const rows = await fetchProducts();
        allProducts = rows.map(rowToProduct).filter(Boolean);

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('productCount').textContent = `${allProducts.length} produktów w katalogu`;

        buildCategoryTabs();
        renderGrid();

        // URL param ?kategoria=
        const params = new URLSearchParams(window.location.search);
        const kat = params.get('kategoria');
        if (kat) {
            const match = [...new Set(allProducts.map(p => p.category))].find(c => c.toLowerCase() === kat.toLowerCase());
            if (match) {
                activeCategory = match;
                document.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === match));
                renderGrid();
            }
        }
    } catch (e) {
        showError('Nie udało się załadować produktów. Upewnij się że arkusz jest publiczny.');
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
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-cat="all"]').classList.add('active');
    activeCategory = 'all';
    renderGrid();
});

// Discord z settings
fetch('/content/settings.json').then(r => r.json()).then(s => {
    const el = document.getElementById('nav-discord');
    if (el && s.discordUrl) el.href = s.discordUrl;
}).catch(() => {});

init();
