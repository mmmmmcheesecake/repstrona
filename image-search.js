function T(key, fallback, vars) {
    if (window.RePluGI18n) return window.RePluGI18n.t(key, vars);
    return fallback;
}

const dropEl = document.getElementById('vsDrop');
const fileInput = document.getElementById('vsFile');
const previewEl = document.getElementById('vsPreview');
const dropEmptyEl = document.getElementById('vsDropEmpty');
const channelSel = document.getElementById('vsChannel');
const form = document.getElementById('vsForm');
const submitBtn = document.getElementById('vsSubmit');
const resetBtn = document.getElementById('vsReset');
const statusEl = document.getElementById('vsStatus');
const resultsEl = document.getElementById('vsResults');

let currentFile = null;
let currentImageId = null;

function setStatus(text, kind) {
    statusEl.textContent = text || '';
    statusEl.className = 'qc-status' + (kind ? ` qc-status-${kind}` : '');
}

function showPreview(file) {
    if (!file) {
        previewEl.removeAttribute('src');
        previewEl.hidden = true;
        dropEmptyEl.hidden = false;
        resetBtn.hidden = true;
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        previewEl.src = e.target.result;
        previewEl.hidden = false;
        dropEmptyEl.hidden = true;
        resetBtn.hidden = false;
    };
    reader.readAsDataURL(file);
}

function setFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    currentFile = file;
    currentImageId = null;
    showPreview(file);
}

fileInput.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) setFile(f);
});

dropEl.addEventListener('dragover', e => {
    e.preventDefault();
    dropEl.classList.add('is-dragging');
});
dropEl.addEventListener('dragleave', () => dropEl.classList.remove('is-dragging'));
dropEl.addEventListener('drop', e => {
    e.preventDefault();
    dropEl.classList.remove('is-dragging');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setFile(f);
});

document.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) {
        const f = item.getAsFile();
        if (f) setFile(f);
    }
});

resetBtn.addEventListener('click', () => {
    currentFile = null;
    currentImageId = null;
    fileInput.value = '';
    showPreview(null);
    resultsEl.innerHTML = '';
    pagerEl.hidden = true;
    setStatus('', null);
});

function marketplaceToChannel(m) {
    const x = (m || '').toLowerCase();
    if (x === 'weidian') return 3;
    if (x === 'taobao' || x === 'tmall') return 1;
    if (x === '1688' || x === 'alibaba') return 2;
    return 3;
}

function productHref(r) {
    const channel = marketplaceToChannel(r.marketplace);
    const id = r.goodsId || r.id;
    if (!id) return '#';
    const usfansUrl = `https://usfans.com/product/${channel}/${encodeURIComponent(id)}?ref=MGRSBE`;
    const q = new URLSearchParams({ url: usfansUrl, name: r.title || '' });
    return `produkt.html?${q.toString()}`;
}

function fmtPrice(r) {
    const p = r.discountPrice || r.price;
    if (!p) return '';
    if (window.RePluGCurrency && r.currency === 'CNY') {
        const usd = window.RePluGCurrency.cnyToUsd ? window.RePluGCurrency.cnyToUsd(p) : null;
        if (typeof usd === 'number') return window.RePluGCurrency.format(usd);
    }
    return `${p} ${r.currency || ''}`.trim();
}

function renderResults(data) {
    resultsEl.innerHTML = '';
    const list = data.results || [];
    if (!list.length) {
        setStatus(data.message || T('vs.empty', 'No matches found in this channel.'), 'empty');
        return;
    }
    setStatus(T('vs.results', `${list.length} matches`, { n: list.length }), 'ok');

    const frag = document.createDocumentFragment();
    list.forEach(r => {
        const a = document.createElement('a');
        a.href = productHref(r);
        a.className = 'vs-card';
        const img = r.image || '';
        a.innerHTML = `
            <div class="vs-card-img">${img ? `<img src="${img}" alt="" loading="lazy" onerror="this.parentNode.classList.add('no-img');this.remove()">` : ''}</div>
            <div class="vs-card-body">
                <span class="vs-card-title">${(r.title || '').replace(/[<>]/g, '')}</span>
                <span class="vs-card-price">${fmtPrice(r)}</span>
            </div>
        `;
        frag.appendChild(a);
    });
    resultsEl.appendChild(frag);
}

async function runSearch() {
    if (!currentFile && !currentImageId) {
        setStatus(T('vs.needImage', 'Drop an image first.'), 'error');
        return;
    }
    submitBtn.disabled = true;
    setStatus(T('vs.searching', 'Searching…'), 'loading');
    resultsEl.innerHTML = '';

    const fd = new FormData();
    if (currentImageId) fd.append('imageId', currentImageId);
    else fd.append('image', currentFile);
    fd.append('channel', channelSel.value || '3');
    fd.append('page', '1');

    try {
        const r = await fetch('/api/visual-search', { method: 'POST', body: fd });
        const data = await r.json();
        if (!r.ok || data.error) {
            setStatus(T('vs.error', 'Search failed. Try another image.'), 'error');
            return;
        }
        if (data.imageId) currentImageId = data.imageId;
        renderResults(data);
    } catch {
        setStatus(T('vs.error', 'Search failed. Try another image.'), 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

form.addEventListener('submit', e => {
    e.preventDefault();
    runSearch();
});

channelSel.addEventListener('change', () => {
    if (!currentFile && !currentImageId) return;
    currentImageId = null;
    runSearch();
});

const params = new URLSearchParams(location.search);
const initialChannel = params.get('channel');
if (initialChannel && ['1', '2', '3'].includes(initialChannel)) {
    channelSel.value = initialChannel;
}

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const elD = document.getElementById('nav-discord');
    if (elD && s.discordUrl) elD.href = s.discordUrl;
}).catch(() => {});
