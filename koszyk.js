(function () {
    function T(key, fallback, vars) {
        if (window.RePluGI18n) return window.RePluGI18n.t(key, vars);
        return fallback;
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function batchClass(b) {
        const known = ['LJR', 'BD', 'DG', 'PK', 'UA', 'OG'];
        const u = (b || '').trim().toUpperCase();
        return known.includes(u) ? `batch-${u}` : 'batch-other';
    }

    let mode = 'own';
    let viewItems = [];

    function getItems() {
        return mode === 'shared' ? viewItems : window.RePluGCart.read();
    }

    function detailHrefFor(it) {
        if (!it.link) return '#';
        const q = new URLSearchParams({ url: it.link, name: it.name || '', batch: it.batch || '' });
        if (it.image) q.set('img', it.image);
        return `produkt.html?${q.toString()}`;
    }

    function rowHTML(it, idx) {
        const img = it.image
            ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" loading="lazy" onerror="this.style.display='none'">`
            : '';

        const badges = [];
        if (it.batch) badges.push(`<span class="card-batch ${batchClass(it.batch)}">${escapeHtml(it.batch)}</span>`);
        if (it.color) badges.push(`<span class="cart-meta-pill">${T('pd.colorVariant', 'Color')}: ${escapeHtml(it.color)}</span>`);
        if (it.size) badges.push(`<span class="cart-meta-pill">${T('pd.size', 'Size')}: ${escapeHtml(it.size)}</span>`);

        const qtyControls = mode === 'shared'
            ? `<span class="cart-qty-readonly">×${it.qty || 1}</span>`
            : `<div class="cart-qty">
                <button class="cart-qty-btn" data-act="dec" data-idx="${idx}" aria-label="−">−</button>
                <span class="cart-qty-val">${it.qty || 1}</span>
                <button class="cart-qty-btn" data-act="inc" data-idx="${idx}" aria-label="+">+</button>
              </div>`;

        const removeBtn = mode === 'shared' ? '' :
            `<button class="cart-remove" data-act="rm" data-idx="${idx}" aria-label="${T('cart.remove', 'Remove')}">×</button>`;

        return `
        <div class="cart-item">
            <a class="cart-thumb" href="${detailHrefFor(it)}">
                <div class="cart-thumb-img${img ? '' : ' no-img'}">${img}</div>
            </a>
            <div class="cart-item-body">
                <div class="cart-item-head">
                    <a class="cart-item-name" href="${detailHrefFor(it)}">${escapeHtml(it.name || '')}</a>
                    ${removeBtn}
                </div>
                <div class="cart-item-meta">${badges.join(' ')}</div>
                <div class="cart-item-row">
                    ${qtyControls}
                    <span class="cart-item-price">${escapeHtml(formatUsd(itemUsd(it)))}</span>
                </div>
            </div>
        </div>`;
    }

    const CATEGORY_WEIGHTS = {
        'Sneakers': 1.2,
        'Hoodies/Crewnecks': 0.9,
        'T-shirts': 0.35,
        "Jersey's": 0.4,
        'Jackets': 1.4,
        'Vests': 0.5,
        'Shorts': 0.4,
        'Pants': 0.8,
        'Underwear': 0.2,
        'Sport Clothing': 0.6,
        'High-end': 1.0,
        'Watches': 0.5,
        'Lego': 0.7,
        'Accesories': 0.3,
        'Football': 0.8,
        'Basketball': 0.8,
    };

    function inferCategory(name) {
        const t = String(name || '').toLowerCase();
        if (/\b(jordan|dunk|air force|air max|yeezy|samba|gazelle|sneaker|trainer|cortez|vomero|new balance|\bnb\b|asics|crocs|slide|sandal|slipper)\b/.test(t)) return 'Sneakers';
        if (/\b(hoodie|hoody|hooded|crewneck|crew neck|sweatshirt|sweater|tracksuit|track suit)\b/.test(t)) return 'Hoodies/Crewnecks';
        if (/\b(t-shirt|tshirt|tee|polo)\b/.test(t)) return 'T-shirts';
        if (/\b(jersey|jerseys|trikot)\b/.test(t)) return "Jersey's";
        if (/\b(jacket|puffer|parka|bomber|windbreaker|coat)\b/.test(t)) return 'Jackets';
        if (/\b(vest|gilet|waistcoat)\b/.test(t)) return 'Vests';
        if (/\bshorts?\b/.test(t)) return 'Shorts';
        if (/\b(jeans|pants|trousers|joggers|sweatpants|cargo|chinos|denim)\b/.test(t)) return 'Pants';
        if (/\b(rolex|patek|audemars|richard mille|cartier watch|apple watch|watch)\b/.test(t)) return 'Watches';
        if (/\blego\b/.test(t)) return 'Lego';
        return null;
    }

    function estimateWeight(item) {
        const cat = item.category || inferCategory(item.name);
        const kg = CATEGORY_WEIGHTS[cat];
        return (typeof kg === 'number' ? kg : 0.5) * (Number(item.qty) || 1);
    }

    function formatWeight(kg) {
        if (kg <= 0) return '—';
        if (kg < 1) return `${Math.round(kg * 1000)} g`;
        return `${kg.toFixed(kg < 10 ? 1 : 0)} kg`;
    }

    const SHIPPING_RATES = {
        PL:    { base: 10, perKg: 16, min: 18 },
        EU:    { base: 12, perKg: 18, min: 22 },
        UK:    { base: 14, perKg: 20, min: 26 },
        NA:    { base: 12, perKg: 16, min: 22 },
        WORLD: { base: 16, perKg: 24, min: 30 },
    };
    const REGION_KEY = 'repluG:shipRegion';

    function getRegion() {
        const v = localStorage.getItem(REGION_KEY);
        if (v && SHIPPING_RATES[v]) return v;
        return 'PL';
    }

    function setRegion(v) {
        if (SHIPPING_RATES[v]) {
            try { localStorage.setItem(REGION_KEY, v); } catch {}
        }
    }

    function shippingUsd(kg, region) {
        const r = SHIPPING_RATES[region] || SHIPPING_RATES.PL;
        const billable = Math.max(kg, 0.5);
        return Math.max(r.min, r.base + r.perKg * billable);
    }

    function formatUsd(n) {
        if (window.RePluGCurrency && typeof window.RePluGCurrency.format === 'function') {
            const f = window.RePluGCurrency.format(n);
            if (f) return f;
        }
        const r = Math.round(n * 100) / 100;
        return `$${r % 1 === 0 ? r : r.toFixed(2)}`;
    }

    function parsePriceNum(str) {
        const s = String(str || '').replace(/[^\d.,-]/g, '').replace(/,/g, '.');
        const n = parseFloat(s);
        return isFinite(n) ? n : 0;
    }

    function priceSymbol(str) {
        const s = String(str || '');
        const m = s.match(/[^\d\s.,-]+/);
        return m ? m[0].trim() : '';
    }

    function detectCurrency(text) {
        const s = String(text || '');
        if (/zł|PLN/i.test(s)) return 'PLN';
        if (/€|EUR/i.test(s)) return 'EUR';
        if (/£|GBP/i.test(s)) return 'GBP';
        if (/¥|CNY|RMB/i.test(s)) return 'CNY';
        if (/\$|USD/i.test(s)) return 'USD';
        return null;
    }

    function itemUsd(it) {
        if (typeof it.priceUsd === 'number' && isFinite(it.priceUsd) && it.priceUsd > 0) {
            return it.priceUsd;
        }
        const num = parsePriceNum(it.price);
        if (!num) return 0;
        const cur = detectCurrency(it.price);
        if (!cur || cur === 'USD') return num;
        if (window.RePluGCurrency && typeof window.RePluGCurrency.toUsd === 'function') {
            return window.RePluGCurrency.toUsd(num, cur);
        }
        return num;
    }

    function formatTotal(n, sample) {
        if (window.RePluGCurrency && typeof window.RePluGCurrency.format === 'function') {
            const formatted = window.RePluGCurrency.format(n);
            if (formatted) return formatted;
        }
        const sym = priceSymbol(sample);
        const rounded = Math.round(n * 100) / 100;
        const txt = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
        if (!sym) return txt;
        return /^[A-Za-z]/.test(sym) ? `${txt} ${sym}` : `${sym}${txt}`;
    }

    function updateTotal(items) {
        let subtotal = 0;
        let sample = '';
        items.forEach(it => {
            const p = itemUsd(it);
            subtotal += p * (Number(it.qty) || 1);
            if (!sample && it.price) sample = it.price;
        });

        const totalEl = document.getElementById('cartTotalValue');
        if (totalEl) totalEl.textContent = formatTotal(subtotal, sample);

        const totalKg = items.reduce((acc, it) => acc + estimateWeight(it), 0);
        const wEl = document.getElementById('cartWeightValue');
        if (wEl) wEl.textContent = formatWeight(totalKg);

        const region = getRegion();
        const shipping = shippingUsd(totalKg, region);
        const shipEl = document.getElementById('cartShippingValue');
        if (shipEl) shipEl.textContent = formatUsd(shipping);

        const grandEl = document.getElementById('cartGrandValue');
        if (grandEl) grandEl.textContent = formatUsd(subtotal + shipping);
    }

    function render() {
        const items = getItems();
        const wrap = document.getElementById('cartItems');
        const empty = document.getElementById('cartEmpty');
        const footer = document.getElementById('cartFooter');

        if (!items.length) {
            wrap.innerHTML = '';
            empty.style.display = '';
            footer.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        footer.style.display = '';
        wrap.innerHTML = items.map(rowHTML).join('');
        updateTotal(items);

        wrap.querySelectorAll('[data-act="inc"]').forEach(b => b.addEventListener('click', () => {
            const i = +b.dataset.idx;
            const it = window.RePluGCart.read()[i];
            if (it) window.RePluGCart.setQty(i, (it.qty || 1) + 1);
        }));
        wrap.querySelectorAll('[data-act="dec"]').forEach(b => b.addEventListener('click', () => {
            const i = +b.dataset.idx;
            const it = window.RePluGCart.read()[i];
            if (it && it.qty > 1) window.RePluGCart.setQty(i, it.qty - 1);
        }));
        wrap.querySelectorAll('[data-act="rm"]').forEach(b => b.addEventListener('click', () => {
            window.RePluGCart.remove(+b.dataset.idx);
        }));
    }

    function showToast(msg) {
        const t = document.getElementById('cartToast');
        if (!t) return;
        t.textContent = msg;
        t.style.display = '';
        clearTimeout(showToast._tm);
        showToast._tm = setTimeout(() => { t.style.display = 'none'; }, 2200);
    }

    function bindShare() {
        const btn = document.getElementById('cartShare');
        const wrap = document.getElementById('cartShareUrl');
        const input = document.getElementById('cartShareInput');
        const copy = document.getElementById('cartCopyBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const items = window.RePluGCart.read();
            if (!items.length) return;
            const url = window.RePluGCart.buildShareUrl(items);
            input.value = url;
            wrap.style.display = '';
            input.select();
            try {
                navigator.clipboard.writeText(url).then(
                    () => showToast(T('cart.shared', 'Link copied')),
                    () => showToast(T('cart.copyManual', 'Copy the link manually'))
                );
            } catch {
                showToast(T('cart.copyManual', 'Copy the link manually'));
            }
        });

        copy.addEventListener('click', () => {
            input.select();
            try {
                navigator.clipboard.writeText(input.value).then(
                    () => showToast(T('cart.shared', 'Link copied')),
                    () => document.execCommand && document.execCommand('copy')
                );
            } catch {
                document.execCommand && document.execCommand('copy');
            }
        });
    }

    function bindClear() {
        const btn = document.getElementById('cartClear');
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (confirm(T('cart.clearConfirm', 'Clear the cart?'))) {
                window.RePluGCart.clear();
            }
        });
    }

    function bindClone() {
        const btn = document.getElementById('cartClone');
        if (!btn) return;
        btn.addEventListener('click', () => {
            viewItems.forEach(it => window.RePluGCart.add(it));
            const url = new URL(location.href);
            url.searchParams.delete(window.RePluGCart.URL_PARAM);
            location.replace(url.toString());
        });
    }

    function showModalToast(msg) {
        const t = document.getElementById('buyCheaperToast');
        if (!t) return;
        t.textContent = msg;
        t.style.display = '';
        clearTimeout(showModalToast._tm);
        showModalToast._tm = setTimeout(() => { t.style.display = 'none'; }, 2200);
    }

    function bindBuyCheaper() {
        const btn = document.getElementById('buyCheaperBtn');
        const modal = document.getElementById('buyCheaperModal');
        if (!btn || !modal) return;

        const dialog = modal.querySelector('.buy-cheaper-dialog');
        const closeBtn = modal.querySelector('.buy-cheaper-close');

        function open() {
            modal.hidden = false;
            document.body.classList.add('modal-open');
            requestAnimationFrame(() => modal.classList.add('is-open'));
            if (closeBtn) closeBtn.focus();
        }
        function close() {
            modal.classList.remove('is-open');
            document.body.classList.remove('modal-open');
            setTimeout(() => { modal.hidden = true; }, 180);
            btn.focus();
        }

        btn.addEventListener('click', open);
        modal.querySelectorAll('[data-act="close"]').forEach(el => el.addEventListener('click', close));
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !modal.hidden) close();
        });
        if (dialog) dialog.addEventListener('click', e => e.stopPropagation());

        const copyBtn = document.getElementById('buyCheaperCopy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const items = window.RePluGCart.read();
                if (!items.length) {
                    showModalToast(T('cart.empty', 'Your cart is empty.'));
                    return;
                }
                const url = window.RePluGCart.buildShareUrl(items);
                try {
                    navigator.clipboard.writeText(url).then(
                        () => showModalToast(T('cart.shared', 'Link copied')),
                        () => showModalToast(T('cart.copyManual', 'Copy the link manually'))
                    );
                } catch {
                    showModalToast(T('cart.copyManual', 'Copy the link manually'));
                }
            });
        }

        const dEl = document.getElementById('buyCheaperDiscord');
        if (dEl) {
            fetch('/content/settings.json')
                .then(r => r.json())
                .then(s => { if (s && s.discordUrl) dEl.href = s.discordUrl; })
                .catch(() => {});
        }
    }

    function init() {
        const params = new URLSearchParams(location.search);
        const shared = params.get(window.RePluGCart.URL_PARAM);
        if (shared) {
            mode = 'shared';
            viewItems = window.RePluGCart.decode(shared);
            const banner = document.getElementById('cartReadonlyBanner');
            if (banner) banner.style.display = '';
            const clearBtn = document.getElementById('cartClear');
            const shareBtn = document.getElementById('cartShare');
            if (clearBtn) clearBtn.style.display = 'none';
            if (shareBtn) shareBtn.style.display = 'none';
        }
        render();
        bindShare();
        bindClear();
        bindClone();
        bindBuyCheaper();

        const regionSel = document.getElementById('cartRegion');
        if (regionSel) {
            regionSel.value = getRegion();
            regionSel.addEventListener('change', () => {
                setRegion(regionSel.value);
                render();
            });
        }

        if (mode === 'own') {
            window.RePluGCart.onChange(render);
        }
        if (window.RePluGI18n) window.RePluGI18n.onChange(render);
        if (window.RePluGCurrency) window.RePluGCurrency.onChange(render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
