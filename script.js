// Dark / Light mode
const toggle = document.getElementById('themeToggle');
const html = document.documentElement;
const icon = toggle.querySelector('.icon');

const saved = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', saved);
icon.textContent = saved === 'dark' ? '🌙' : '☀️';

toggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    icon.textContent = next === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('theme', next);
});

// Ładowanie produktów z products.json
async function loadProducts() {
    try {
        const res = await fetch('/products.json');
        const data = await res.json();
        renderTrending(data.items);
    } catch (e) {
        console.warn('Nie można załadować products.json lokalnie — użyj serwera lub GitHub Pages');
    }
}

function badgeHTML(badge) {
    if (!badge) return '';
    const labels = { hot: '🔥 Hot', new: 'Nowy', top: 'Top Pick' };
    return `<div class="product-badge ${badge}">${labels[badge] || badge}</div>`;
}

function renderTrending(items) {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;

    const trending = items.filter(p => p.trending).slice(0, 5);
    if (trending.length === 0) return;

    grid.innerHTML = trending.map((p, i) => `
        <div class="product-card${i < 2 ? ' large' : ''}">
            <div class="product-img">
                <img src="${p.image}" alt="${p.title}" loading="lazy">
                ${badgeHTML(p.badge)}
                <div class="product-category">${p.category}</div>
            </div>
            <div class="product-info">
                <h3>${p.title}</h3>
                <p class="product-desc">${p.description}</p>
                <div class="product-footer">
                    <span class="product-price">${p.price}</span>
                    <a href="${p.link}" target="_blank" rel="noopener" class="btn-card">Zobacz ofertę →</a>
                </div>
            </div>
        </div>
    `).join('');
}

loadProducts();
