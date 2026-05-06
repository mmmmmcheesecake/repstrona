const REF = '?ref=MGRSBE';

function T(key, fallback, vars) {
    if (window.RePluGI18n) return window.RePluGI18n.t(key, vars);
    return fallback;
}

function weidianToUsfans(host, src) {
    if (host !== 'weidian.com' && !host.endsWith('.weidian.com')) return null;
    const id = src.searchParams.get('itemID') || src.searchParams.get('itemId');
    if (!id) return null;
    return `https://www.usfans.com/product/3/${id}?ref=MGRSBE`;
}

function convertToUsfans(url) {
    if (!url || typeof url !== 'string') return url;
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();

        if (host === 'kakobuy.com' || host === 'www.kakobuy.com') {
            const inner = u.searchParams.get('url');
            if (inner) {
                try {
                    const src = new URL(inner);
                    const conv = weidianToUsfans(src.hostname.toLowerCase(), src);
                    if (conv) return conv;
                } catch {}
            }
            return url;
        }

        const conv = weidianToUsfans(host, u);
        if (conv) return conv;
    } catch {}
    return url;
}

function ensureRef(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (!url || url === '#') return null;
    url = convertToUsfans(url);
    if (url.includes('ref=MGRSBE')) return url;
    return url.includes('?') ? url + '&ref=MGRSBE' : url + REF;
}

const params = new URLSearchParams(window.location.search);
const productUrl = params.get('url');
const sheetName = params.get('name') || '';
const sheetBatch = params.get('batch') || '';
const budgetUrl = params.get('budget') ? ensureRef(params.get('budget')) : null;
const imageOverride = params.get('img') || '';
const productCategory = params.get('cat') || '';

const state = {
    properties: [],
    skuList: [],
    selected: {},
    images: [],
};

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    if (msg) {
        const p = document.querySelector('#errorState p');
        if (p) p.textContent = msg;
    }
}

function el(id) { return document.getElementById(id); }

function setMainImage(src) {
    const img = el('pdMainImg');
    if (!src) { img.style.display = 'none'; return; }
    img.style.display = '';
    if (img.src !== src) img.src = src;
}

function buildThumbs(images) {
    const wrap = el('pdThumbs');
    wrap.innerHTML = '';
    images.forEach((src, i) => {
        const t = document.createElement('button');
        t.className = 'pd-thumb' + (i === 0 ? ' active' : '');
        t.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
        t.addEventListener('click', () => {
            wrap.querySelectorAll('.pd-thumb').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            setMainImage(src);
        });
        wrap.appendChild(t);
    });
}

function pricesForSku(sku) {
    return typeof sku.convertedPrice === 'number' ? sku.convertedPrice : null;
}

function matchingSkus() {
    return state.skuList.filter(s => {
        return Object.entries(state.selected).every(([propId, valId]) => {
            if (!valId) return true;
            return (s.valueIds || []).includes(valId);
        });
    });
}

function minPrice(skus) {
    let min = null;
    for (const s of skus) {
        const p = pricesForSku(s);
        if (p != null && p > 0 && (min === null || p < min)) min = p;
    }
    return min;
}

function totalStock(skus) {
    let total = 0;
    let any = false;
    for (const s of skus) {
        if (typeof s.stock === 'number') { total += s.stock; any = true; }
    }
    return any ? total : null;
}

function refreshPriceAndStock() {
    const skus = matchingSkus();
    let p = minPrice(skus);
    if (p == null) p = minPrice(state.skuList);
    let priceText = '—';
    if (p != null) {
        priceText = window.RePluGCurrency
            ? window.RePluGCurrency.format(p)
            : `$${Math.round(p)}`;
    }
    el('pdPrice').textContent = priceText;
    const stock = totalStock(skus);
    el('pdStock').textContent = stock === 0 ? T('pd.outOfStock', 'Out of stock') : '';
    el('pdStock').classList.toggle('out', stock === 0);
}

const mqMobile = window.matchMedia('(max-width: 768px)');

function placeColorwaysForViewport() {
    const opts = document.getElementById('pdOptions');
    if (!opts) return;
    const groups = opts.parentElement.querySelectorAll('.pd-option-group');
    let colorways = null;
    for (const g of groups) {
        if (g.querySelector('.pd-option-pill.with-image')) { colorways = g; break; }
    }
    if (!colorways) {
        const slot = document.getElementById('pdMobileColors');
        if (slot) slot.style.display = 'none';
        return;
    }

    let slot = document.getElementById('pdMobileColors');
    if (!slot) {
        slot = document.createElement('div');
        slot.id = 'pdMobileColors';
        slot.className = 'pd-mobile-colors';
        const gallery = document.querySelector('.pd-gallery');
        if (gallery) gallery.appendChild(slot);
    }

    if (mqMobile.matches) {
        if (colorways.parentNode !== slot) slot.appendChild(colorways);
    } else {
        if (colorways.parentNode !== opts) opts.insertBefore(colorways, opts.firstChild);
    }
}

if (mqMobile.addEventListener) mqMobile.addEventListener('change', placeColorwaysForViewport);
else if (mqMobile.addListener) mqMobile.addListener(placeColorwaysForViewport);

function buildOptions() {
    const wrap = el('pdOptions');
    wrap.innerHTML = '';

    if (!state.properties.length) return;

    state.properties.forEach((prop, idx) => {
        const group = document.createElement('div');
        group.className = 'pd-option-group';

        const label = document.createElement('div');
        label.className = 'pd-option-label';
        const propTitle = idx === 0
            ? T('pd.colorVariant', 'Color / Variant')
            : (idx === 1 ? T('pd.size', 'Size') : (prop.propName || T('pd.option', `Option ${idx + 1}`, { n: idx + 1 })));
        label.textContent = propTitle;
        group.appendChild(label);

        const choices = document.createElement('div');
        choices.className = 'pd-option-choices' + (prop.valuesList.some(v => v.picUrl) ? ' with-images' : '');
        prop.valuesList.forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'pd-option-pill';
            btn.dataset.propId = prop.propId;
            btn.dataset.valueId = v.valueId;

            if (v.picUrl) {
                btn.classList.add('with-image');
                btn.innerHTML = `<img src="${v.picUrl}" alt="${v.valueName}" loading="lazy"><span>${v.valueName}</span>`;
            } else {
                btn.textContent = v.valueName;
            }

            btn.addEventListener('click', () => {
                if (state.selected[prop.propId] === v.valueId) {
                    state.selected[prop.propId] = null;
                } else {
                    state.selected[prop.propId] = v.valueId;
                    if (v.picUrl) setMainImage(v.picUrl);
                }
                buildOptions();
                refreshPriceAndStock();
            });

            if (state.selected[prop.propId] === v.valueId) btn.classList.add('active');
            choices.appendChild(btn);
        });

        group.appendChild(choices);
        wrap.appendChild(group);
    });

    placeColorwaysForViewport();
}

async function load() {
    if (!productUrl) {
        showError('Missing product URL.');
        return;
    }

    const ref = ensureRef(productUrl);
    el('pdBuy').href = ref;
    if (budgetUrl) {
        el('pdBudget').href = budgetUrl;
        el('pdBudget').style.display = '';
    }

    try {
        const r = await fetch(`/api/product?url=${encodeURIComponent(productUrl)}&full=1`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (data.error) throw new Error(data.error);

        const titleName = data.title || sheetName || 'Product';
        document.title = T('title.productNamed', `${titleName} — RePluG`, { name: titleName });

        const meta = [];
        if (sheetBatch) meta.push(`<span class="card-batch ${batchClass(sheetBatch)}">${sheetBatch}</span>`);
        el('pdMeta').innerHTML = meta.join('');

        el('pdName').textContent = sheetName || data.title || 'Product';

        state.images = data.images || [];
        state.properties = data.properties || [];
        state.skuList = data.skuList || [];

        const variantImages = [];
        state.properties.forEach(p => p.valuesList.forEach(v => { if (v.picUrl) variantImages.push(v.picUrl); }));
        const allImgs = [...new Set([
            ...(imageOverride ? [imageOverride] : []),
            ...state.images,
            ...variantImages,
        ])];
        if (allImgs.length) {
            setMainImage(allImgs[0]);
            buildThumbs(allImgs);
        } else {
            el('pdMainImg').style.display = 'none';
        }

        state.selected = {};
        state.properties.forEach(p => state.selected[p.propId] = null);
        buildOptions();
        refreshPriceAndStock();

        el('loadingState').style.display = 'none';
        el('productDetail').style.display = '';
    } catch (e) {
        console.error(e);
        showError(T('state.errorProduct', 'Failed to load product.'));
    }
}

function batchClass(b) {
    const known = ['LJR', 'BD', 'DG', 'PK', 'UA', 'OG'];
    const u = (b || '').trim().toUpperCase();
    return known.includes(u) ? `batch-${u}` : 'batch-other';
}

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const elD = document.getElementById('nav-discord');
    if (elD && s.discordUrl) elD.href = s.discordUrl;
}).catch(() => {});

if (window.RePluGCurrency) {
    window.RePluGCurrency.onChange(() => refreshPriceAndStock());
}

if (window.RePluGI18n) {
    window.RePluGI18n.onChange(() => {
        buildOptions();
        refreshPriceAndStock();
    });
}

function selectedNameFor(propIdx) {
    const prop = state.properties[propIdx];
    if (!prop) return '';
    const valId = state.selected[prop.propId];
    if (!valId) return '';
    const v = (prop.valuesList || []).find(x => x.valueId === valId);
    return v ? v.valueName : '';
}

function currentMainImage() {
    const img = el('pdMainImg');
    return (img && img.src) ? img.src : (imageOverride || '');
}

function showCartToast(msg) {
    const t = el('pdCartToast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = '';
    clearTimeout(showCartToast._tm);
    showCartToast._tm = setTimeout(() => { t.style.display = 'none'; }, 2000);
}

function colorwayIdx() {
    return state.properties.findIndex(p => (p.valuesList || []).some(v => v.picUrl));
}

function colorNameFromMainImage() {
    const src = currentMainImage();
    if (!src) return '';
    for (const p of state.properties) {
        for (const v of (p.valuesList || [])) {
            if (v.picUrl && v.picUrl === src) return v.valueName || '';
        }
    }
    return '';
}

function bindAddToCart() {
    const btn = el('pdAddToCart');
    if (!btn || !window.RePluGCart) return;
    btn.addEventListener('click', () => {
        const skus = matchingSkus();
        let usd = minPrice(skus);
        if (usd == null) usd = minPrice(state.skuList);
        const cwIdx = colorwayIdx();
        const colorIdx = cwIdx >= 0 ? cwIdx : 0;
        const sizeIdx = state.properties.findIndex((_, i) => i !== colorIdx);
        const colorName = selectedNameFor(colorIdx) || colorNameFromMainImage();
        const item = {
            link: productUrl,
            name: el('pdName').textContent || sheetName || '',
            image: currentMainImage(),
            price: el('pdPrice').textContent || '',
            priceUsd: typeof usd === 'number' && isFinite(usd) ? usd : null,
            batch: sheetBatch || '',
            color: colorName,
            size: selectedNameFor(sizeIdx),
            category: productCategory || '',
            qty: 1,
        };
        window.RePluGCart.add(item);
        showCartToast(T('cart.added', 'Added to cart'));
    });
}

bindAddToCart();

load();
