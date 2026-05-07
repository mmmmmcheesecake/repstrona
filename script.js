document.documentElement.setAttribute('data-theme', 'light');

// ===== GENDER (men/women catalog) =====
(function () {
    const KEY = 'repluG:gender';
    function get() {
        try { return localStorage.getItem(KEY) === 'women' ? 'women' : 'men'; }
        catch { return 'men'; }
    }
    function set(g) {
        try { localStorage.setItem(KEY, g === 'women' ? 'women' : 'men'); } catch {}
    }
    function T(k, fb) { return window.RePluGI18n ? window.RePluGI18n.t(k) : fb; }

    function ensureToggleInNav() {
        if (document.querySelector('.gender-toggle')) return;
        const nav = document.querySelector('.nav-right');
        if (!nav) return;
        const wrap = document.createElement('div');
        wrap.className = 'gender-toggle';
        wrap.innerHTML = `
            <button type="button" class="gender-opt" data-gender="men"><span class="gender-label">${T('gender.men', 'Men')}</span></button>
            <button type="button" class="gender-opt" data-gender="women"><span class="gender-label">${T('gender.women', 'Women')}</span></button>
        `;
        nav.appendChild(wrap);
    }

    function bindToggles() {
        ensureToggleInNav();
        document.querySelectorAll('.gender-toggle').forEach(wrap => {
            if (wrap.dataset.bound === '1') return;
            wrap.dataset.bound = '1';
            const current = get();
            wrap.querySelectorAll('[data-gender]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.gender === current);
            });
            wrap.addEventListener('click', e => {
                const btn = e.target.closest('[data-gender]');
                if (!btn) return;
                const next = btn.dataset.gender;
                if (next === get()) return;
                set(next);
                location.reload();
            });
        });
    }

    window.RePluGGender = { get, set };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindToggles);
    } else {
        bindToggles();
    }
})();

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

// ===== USFANS WELCOME POPUP =====
function shouldShowUsfansPopup() {
    const path = location.pathname;
    const isHome = path === '/' || path === '' || /\/index\.html$/i.test(path);
    if (!isHome) return false;

    let navType = '';
    try {
        const entry = performance.getEntriesByType('navigation')[0];
        if (entry) navType = entry.type;
    } catch {}

    if (navType === 'back_forward') return false;
    if (navType === 'reload') return true;

    if (document.referrer) {
        try {
            if (new URL(document.referrer).origin === location.origin) return false;
        } catch {}
    }
    return true;
}

function showUsfansPopup() {
    if (document.querySelector('.usfans-popup')) return;

    const T = (k, fb) => (window.RePluGI18n ? window.RePluGI18n.t(k) : fb);
    const HREF = 'https://www.usfans.com/register?ref=MGRSBE';

    const wrap = document.createElement('div');
    wrap.className = 'usfans-popup';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'usfansPopupTitle');
    wrap.innerHTML = `
        <div class="usfans-popup-backdrop" data-act="close"></div>
        <div class="usfans-popup-card" role="document">
            <button type="button" class="usfans-popup-close" data-act="close" aria-label="${T('usfansPopup.close', 'Close')}">×</button>
            <span class="usfans-popup-eyebrow">${T('usfansPopup.eyebrow', 'Limited offer')}</span>
            <h2 class="usfans-popup-title" id="usfansPopupTitle">${T('usfansPopup.title', 'Claim +$800 in USFans coupons')}</h2>
            <p class="usfans-popup-body">${T('usfansPopup.body', 'Register an account using our link and unlock free coupons to spend on your orders.')}</p>
            <a class="usfans-popup-cta" href="${HREF}" target="_blank" rel="noopener">${T('usfansPopup.cta', 'Claim coupons')}</a>
            <button type="button" class="usfans-popup-dismiss" data-act="close">${T('usfansPopup.dismiss', 'Maybe later')}</button>
        </div>
    `;

    function close() {
        wrap.classList.remove('is-open');
        document.body.classList.remove('usfans-popup-open');
        setTimeout(() => wrap.remove(), 200);
        document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    wrap.addEventListener('click', e => {
        const t = e.target;
        if (t.closest('.usfans-popup-cta')) { close(); return; }
        if (t.closest('[data-act="close"]')) close();
    });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(wrap);
    document.body.classList.add('usfans-popup-open');
    requestAnimationFrame(() => wrap.classList.add('is-open'));
}

window.RePluGUsfansPopup = { show: showUsfansPopup };

function initUsfansPopupAuto() {
    if (shouldShowUsfansPopup()) showUsfansPopup();
}

function bindUsfansLinks() {
    document.querySelectorAll('.usfans-link').forEach(el => {
        if (el.dataset.popupBound === '1') return;
        el.dataset.popupBound = '1';
        el.addEventListener('click', e => {
            e.preventDefault();
            showUsfansPopup();
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initUsfansPopupAuto, 600);
        bindUsfansLinks();
    });
} else {
    setTimeout(initUsfansPopupAuto, 600);
    bindUsfansLinks();
}

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
