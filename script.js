document.documentElement.setAttribute('data-theme', 'light');

// ===== HELPER =====
function set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setHref(id, url) {
    const el = document.getElementById(id);
    if (el) el.href = url;
}

// ===== ŁADOWANIE DANYCH =====
async function fetchJSON(path) {
    const res = await fetch(path);
    return res.json();
}

async function loadAll() {
    const [settings, hero, categories, products, discord] = await Promise.all([
        fetchJSON('/content/settings.json'),
        fetchJSON('/content/hero.json'),
        fetchJSON('/content/categories.json'),
        fetchJSON('/products.json'),
        fetchJSON('/content/discord.json')
    ]);

    applySettings(settings);
    applyHero(hero);
    renderCategories(categories.items);
    renderTrending(products.items);
    applyDiscord(discord, settings.discordUrl);
}

// ===== USTAWIENIA =====
function applySettings(s) {
    set('stat1-num', s.stat1Num);
    set('stat1-label', s.stat1Label);
    set('stat2-num', s.stat2Num);
    set('stat2-label', s.stat2Label);
    set('stat3-num', s.stat3Num);
    set('stat3-label', s.stat3Label);
    set('footer-text', s.footerText);
    setHref('nav-discord-link', s.discordUrl);
}

// ===== HERO =====
function applyHero(h) {
    set('hero-badge', h.badge);
    set('hero-heading2', h.heading2);
    set('hero-description', h.description);
    set('hero-cta1', h.cta1Text);
    set('hero-cta2', h.cta2Text);

    const heading = document.getElementById('hero-heading');
    if (heading) {
        const span = heading.querySelector('span');
        heading.childNodes[0].textContent = h.heading1;
        if (span) span.textContent = h.heading2;
    }
}

// ===== KATEGORIE =====
function renderCategories(items) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid || !items) return;

    grid.innerHTML = items.map(cat => `
        <a href="katalog.html?kategoria=${cat.slug}" class="category-card">
            <div class="cat-icon">${cat.icon}</div>
            <div class="cat-info">
                <h3>${cat.name}</h3>
                <span>${cat.description}</span>
            </div>
        </a>
    `).join('');
}

// ===== TRENDING =====
function badgeHTML(badge) {
    if (!badge) return '';
    const labels = { hot: '🔥 Hot', new: 'New', top: 'Top Pick' };
    return `<div class="product-badge ${badge}">${labels[badge] || badge}</div>`;
}

function renderTrending(items) {
    const grid = document.getElementById('trendingGrid');
    if (!grid || !items) return;

    const trending = items.filter(p => p.trending).slice(0, 5);
    if (!trending.length) return;

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
                    <a href="${p.link}" target="_blank" rel="noopener" class="btn-card">View offer →</a>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== DISCORD BANNER =====
function applyDiscord(d, url) {
    set('discord-title', d.title);
    set('discord-desc', d.description);
    set('discord-btn-text', d.btnText);
    setHref('hero-discord-btn', url);
    setHref('discord-banner-btn', url);
}

// ===== START =====
loadAll().catch(err => console.warn('Data loading error:', err));

// ===== TRYB EDYCJI =====
function initEditMode() {
    // Dodaj overlaye do sekcji
    document.querySelectorAll('[data-edit]').forEach(section => {
        const overlay = document.createElement('div');
        overlay.className = 'edit-overlay';
        overlay.innerHTML = `<a href="${section.dataset.editUrl}" target="_blank">✏️ Edit: ${section.dataset.editLabel}</a>`;
        section.appendChild(overlay);
    });

    // Przycisk FAB
    const fab = document.createElement('button');
    fab.id = 'edit-fab';
    fab.innerHTML = '✏️ Edit mode';
    document.body.appendChild(fab);

    let editMode = false;
    fab.addEventListener('click', () => {
        editMode = !editMode;
        document.body.classList.toggle('edit-mode', editMode);
        fab.textContent = editMode ? '✕ Close edit' : '✏️ Edit mode';
        fab.classList.toggle('active', editMode);
    });

    fab.style.display = 'flex';
}

// Netlify Identity — pokaż tryb edycji tylko dla zalogowanych
if (window.netlifyIdentity) {
    window.netlifyIdentity.on('init', user => { if (user) initEditMode(); });
    window.netlifyIdentity.on('login', () => initEditMode());
    window.netlifyIdentity.on('logout', () => {
        document.getElementById('edit-fab')?.remove();
        document.body.classList.remove('edit-mode');
    });
}
