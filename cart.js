(function () {
    const KEY = 'repluG:cart';
    const URL_PARAM = 'c';

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch { return []; }
    }

    function write(items) {
        try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
        notify();
    }

    function variantKey(it) {
        return [it.link || '', it.color || '', it.size || '', it.batch || ''].join('|');
    }

    function add(item) {
        const items = read();
        const key = variantKey(item);
        const idx = items.findIndex(x => variantKey(x) === key);
        if (idx >= 0) {
            items[idx].qty = (items[idx].qty || 1) + (item.qty || 1);
        } else {
            items.push({ ...item, qty: item.qty || 1, addedAt: Date.now() });
        }
        write(items);
        return items;
    }

    function remove(idx) {
        const items = read();
        if (idx >= 0 && idx < items.length) {
            items.splice(idx, 1);
            write(items);
        }
    }

    function setQty(idx, qty) {
        const items = read();
        if (items[idx]) {
            items[idx].qty = Math.max(1, Math.floor(Number(qty) || 1));
            write(items);
        }
    }

    function clear() { write([]); }

    function count() {
        return read().reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    }

    function toBase64Url(str) {
        const b64 = btoa(unescape(encodeURIComponent(str)));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function fromBase64Url(s) {
        s = String(s).replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        return decodeURIComponent(escape(atob(s)));
    }

    function encode(items) {
        const compact = items.map(it => ({
            l: it.link, n: it.name, i: it.image, p: it.price,
            b: it.batch, c: it.color, s: it.size, k: it.category || '',
            q: it.qty || 1,
        }));
        return toBase64Url(JSON.stringify(compact));
    }

    function decode(s) {
        try {
            const arr = JSON.parse(fromBase64Url(s));
            if (!Array.isArray(arr)) return [];
            return arr.map(it => ({
                link: it.l || '', name: it.n || '', image: it.i || '',
                price: it.p || '', batch: it.b || '', color: it.c || '',
                size: it.s || '', category: it.k || '', qty: it.q || 1,
            }));
        } catch { return []; }
    }

    function buildShareUrl(items) {
        const data = encode(items);
        const url = new URL(location.origin + '/koszyk.html');
        url.searchParams.set(URL_PARAM, data);
        return url.toString();
    }

    const listeners = [];
    function onChange(fn) { listeners.push(fn); }
    function notify() { listeners.forEach(fn => { try { fn(); } catch (e) { console.warn(e); } }); }

    window.addEventListener('storage', e => {
        if (e.key === KEY) notify();
    });

    function T(key, fallback) {
        if (window.RePluGI18n) return window.RePluGI18n.t(key);
        return fallback;
    }

    function initCartLink() {
        const nav = document.querySelector('.nav-right');
        if (!nav || document.getElementById('cartLink')) return;
        const link = document.createElement('a');
        link.id = 'cartLink';
        link.href = 'koszyk.html';
        link.className = 'cart-link';
        link.innerHTML = `
            <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.5L22 7H6"/>
                <circle cx="9" cy="20" r="1.4"/>
                <circle cx="18" cy="20" r="1.4"/>
            </svg>
            <span class="cart-label"></span>
            <span class="cart-count" hidden></span>
        `;

        const labelEl = link.querySelector('.cart-label');
        const countEl = link.querySelector('.cart-count');

        function update() {
            const n = count();
            labelEl.textContent = T('cart.nav', 'Cart');
            link.setAttribute('aria-label', T('cart.nav', 'Cart') + (n > 0 ? ` (${n})` : ''));
            if (n > 0) {
                countEl.textContent = `(${n})`;
                countEl.removeAttribute('hidden');
            } else {
                countEl.textContent = '';
                countEl.setAttribute('hidden', '');
            }
        }
        update();
        onChange(update);
        if (window.RePluGI18n) window.RePluGI18n.onChange(update);

        nav.insertBefore(link, nav.firstChild);
    }

    window.RePluGCart = {
        read, write, add, remove, setQty, clear, count,
        encode, decode, buildShareUrl, onChange,
        URL_PARAM,
    };

    function boot() { initCartLink(); }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
