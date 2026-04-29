const REF_CODE = '?ref=MGRSBE';

let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';
let sortMode = 'default';

// Dodaje kod referencyjny do linku
function addRef(url) {
    if (!url || url === '#') return '#';
    if (url.includes('?')) return url + '&ref=MGRSBE';
    return url + REF_CODE;
}

function badgeHTML(badge) {
    if (!badge) return '';
    const labels = { hot: '🔥 Hot', new: 'Nowy', top: 'Top Pick' };
    return `<div class="product-badge ${badge}">${labels[badge] || badge}</div>`;
}

function parsePrice(priceStr) {
    const num = parseFloat((priceStr || '0').replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
}

function getFiltered() {
    let items = [...allProducts];

    if (activeCategory !== 'all') {
        items = items.filter(p => p.category === activeCategory);
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q)
        );
    }

    if (sortMode === 'price-asc') items.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    if (sortMode === 'price-desc') items.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    if (sortMode === 'name-asc') items.sort((a, b) => a.title.localeCompare(b.title));

    return items;
}

function renderGrid() {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('resultsCount');
    const items = getFiltered();

    count.textContent = `${items.length} produktów`;

    if (!items.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = items.map(p => `
        <div class="product-card">
            <div class="product-img">
                <img src="${p.image || 'https://via.placeholder.com/300x300/1a1a1a/666?text=Brak+zdjęcia'}"
                     alt="${p.title}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x300/1a1a1a/666?text=Brak+zdjecia'">
                ${badgeHTML(p.badge)}
                <div class="product-category">${p.category || ''}</div>
            </div>
            <div class="product-info">
                <h3>${p.title}</h3>
                ${p.batch ? `<span class="product-batch">Batch: ${p.batch}</span>` : ''}
                <p class="product-desc">${p.description || ''}</p>
                <div class="product-footer">
                    <span class="product-price">${p.price || ''}</span>
                    <a href="${addRef(p.link)}" target="_blank" rel="noopener" class="btn-card">Zobacz ofertę →</a>
                </div>
            </div>
        </div>
    `).join('');
}

// Ładowanie produktów
async function loadKatalog() {
    try {
        const res = await fetch('/products.json');
        const data = await res.json();
        allProducts = data.items || [];

        // Sprawdź parametr URL ?kategoria=buty
        const params = new URLSearchParams(window.location.search);
        const katParam = params.get('kategoria');
        if (katParam) {
            const match = ['Buty','Odzież','Akcesoria','Elektronika','Sport','Torby']
                .find(k => k.toLowerCase() === katParam.toLowerCase());
            if (match) {
                activeCategory = match;
                document.querySelectorAll('.cat-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.cat === match);
                });
            }
        }

        renderGrid();
    } catch (e) {
        document.getElementById('resultsCount').textContent = 'Błąd ładowania produktów';
    }
}

// Eventy
document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderGrid();
});

document.getElementById('sortSelect').addEventListener('change', e => {
    sortMode = e.target.value;
    renderGrid();
});

document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategory = tab.dataset.cat;
        renderGrid();
    });
});

// Discord link z settings
fetch('/content/settings.json').then(r => r.json()).then(s => {
    const el = document.getElementById('nav-discord');
    if (el && s.discordUrl) el.href = s.discordUrl;
    const f = document.getElementById('footer-copy');
    if (f && s.footerText) f.textContent = s.footerText;
}).catch(() => {});

loadKatalog();
