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
                    <span class="cart-item-price">${escapeHtml(it.price || '')}</span>
                </div>
            </div>
        </div>`;
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

        if (mode === 'own') {
            window.RePluGCart.onChange(render);
        }
        if (window.RePluGI18n) window.RePluGI18n.onChange(render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
