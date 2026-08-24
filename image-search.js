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
let currentPreview = null;   // dataURL podglądu — przeżywa nawigację, currentFile nie
let lastResults = null;      // ostatnia odpowiedź /api/visual-search
let previewSeq = 0;

const VS_STATE_KEY = 'repluG:vsState';
const VS_STATE_TTL = 30 * 60 * 1000;
const VS_PREVIEW_MAX = 900;  // dłuższy bok zapisywanego podglądu (px)

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

function safeHttpUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        const u = new URL(url, window.location.href);
        return (u.protocol === 'https:' || u.protocol === 'http:') ? u.toString() : null;
    } catch {
        return null;
    }
}

function setStatus(text, kind) {
    statusEl.textContent = text || '';
    statusEl.className = 'qc-status' + (kind ? ` qc-status-${kind}` : '');
}

function showPreview(src) {
    if (!src) {
        previewEl.removeAttribute('src');
        previewEl.hidden = true;
        dropEmptyEl.hidden = false;
        resetBtn.hidden = true;
        return;
    }
    previewEl.src = src;
    previewEl.hidden = false;
    dropEmptyEl.hidden = true;
    resetBtn.hidden = false;
}

function readAsDataUrl(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// Zdjęcie z telefonu ma kilka MB — w sessionStorage zmieściłoby się co najwyżej
// jedno. Skalujemy je raz: ten sam dataURL służy za podgląd i za plik do
// ponownego wyszukania po powrocie na stronę.
function shrinkToDataUrl(file) {
    return new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, VS_PREVIEW_MAX / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const cv = document.createElement('canvas');
            cv.width = w;
            cv.height = h;
            try {
                cv.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(cv.toDataURL('image/jpeg', 0.82));
            } catch { resolve(null); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

function dataUrlToFile(dataUrl, name) {
    const m = /^data:([^;,]+)[^,]*;base64,(.*)$/.exec(dataUrl || '');
    if (!m) return null;
    try {
        const bin = atob(m[2]);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return new File([buf], name || 'search.jpg', { type: m[1] });
    } catch { return null; }
}

async function setFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const seq = ++previewSeq;
    currentFile = file;
    const small = await shrinkToDataUrl(file);
    if (seq !== previewSeq) return;
    if (small) {
        currentPreview = small;
        showPreview(small);
    } else {
        // Canvas nie poradził sobie z formatem — pokazujemy oryginał, ale go nie
        // zapisujemy (zbyt duży dla sessionStorage).
        currentPreview = null;
        const raw = await readAsDataUrl(file);
        if (seq === previewSeq) showPreview(raw);
    }
    saveState();
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
    previewSeq++;
    currentFile = null;
    currentPreview = null;
    lastResults = null;
    fileInput.value = '';
    showPreview(null);
    resultsEl.innerHTML = '';
    setStatus('', null);
    clearState();
});

function clearState() {
    try { sessionStorage.removeItem(VS_STATE_KEY); } catch {}
}

function saveState() {
    if (!currentPreview && !lastResults) {
        clearState();
        return;
    }
    const state = {
        preview: currentPreview,
        channel: channelSel.value,
        results: lastResults,
        scrollY: window.scrollY || window.pageYOffset || 0,
        search: location.search,
        ts: Date.now(),
    };
    try {
        sessionStorage.setItem(VS_STATE_KEY, JSON.stringify(state));
    } catch {
        // Brak miejsca — same wyniki są ważniejsze niż podgląd.
        try {
            sessionStorage.setItem(VS_STATE_KEY, JSON.stringify({ ...state, preview: null }));
        } catch { clearState(); }
    }
}

function readState() {
    try {
        const raw = sessionStorage.getItem(VS_STATE_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || Date.now() - (s.ts || 0) > VS_STATE_TTL) return null;
        // Wejście z innym ?channel= to nowe wyszukiwanie, nie powrót z produktu.
        if ((s.search || '') !== location.search) return null;
        return s;
    } catch { return null; }
}

function restoreState() {
    const s = readState();
    if (!s) return;
    if (['1', '2', '3'].includes(String(s.channel))) channelSel.value = String(s.channel);
    if (s.preview) {
        currentPreview = s.preview;
        currentFile = dataUrlToFile(s.preview, 'search.jpg');
        showPreview(s.preview);
    }
    if (s.results) renderResults(s.results);
    if (typeof s.scrollY === 'number' && s.scrollY > 0) {
        requestAnimationFrame(() => window.scrollTo(0, s.scrollY));
    }
}

// `id` used to be a ready marketplace URL; on the multi endpoint it is the bare item
// id, and for taobao an opaque token. Only take it as a link when it really is one —
// safeHttpUrl resolves against this page, so a bare token would come back as an
// address on our own domain and the product page would have nothing to open.
function marketplaceUrl(r) {
    const direct = /^https?:\/\//i.test(r.id || '') ? safeHttpUrl(r.id) : null;
    if (direct) return direct;
    const id = r.goodsId || r.id;
    if (!id) return null;
    switch ((r.marketplace || '').toLowerCase()) {
        case 'weidian': return `https://weidian.com/item.html?itemID=${encodeURIComponent(id)}`;
        case 'taobao': return `https://item.taobao.com/item.htm?id=${encodeURIComponent(id)}`;
        case 'tmall': return `https://detail.tmall.com/item.htm?id=${encodeURIComponent(id)}`;
        case '1688':
        case 'alibaba': return `https://detail.1688.com/offer/${encodeURIComponent(id)}.html`;
        default: return null;
    }
}

// Hand the raw marketplace link to the product page — it sends weidian to usfans
// and taobao/1688 to kakobuy, which is the only agent that resolves those.
function productHref(r) {
    const url = marketplaceUrl(r);
    if (!url) return '#';
    const q = new URLSearchParams({ url, name: r.title || '' });
    return `produkt.html?${q.toString()}`;
}

// alicdn (taobao/1688 covers) can refuse requests carrying our Referer; the proxy
// sends none. Only used as a retry, so working hot-links cost nothing.
function proxiedImage(url) {
    try {
        const b64 = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return `/api/qcimg?u=${b64}`;
    } catch { return null; }
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
        setStatus(T('vs.empty', 'No matches found in this channel.'), 'empty');
        return;
    }
    setStatus(T('vs.results', `${list.length} matches`, { n: list.length }), 'ok');

    const frag = document.createDocumentFragment();
    list.forEach(r => {
        const a = document.createElement('a');
        a.href = productHref(r);
        a.className = 'vs-card';
        const img = safeHttpUrl(r.image);

        const imgWrap = document.createElement('div');
        imgWrap.className = 'vs-card-img';
        if (img) {
            const image = document.createElement('img');
            image.src = img;
            image.alt = '';
            image.loading = 'lazy';
            image.onerror = function () {
                const viaProxy = proxiedImage(img);
                if (viaProxy && this.src !== new URL(viaProxy, location.href).href) {
                    this.src = viaProxy;
                    return;
                }
                imgWrap.classList.add('no-img');
                this.remove();
            };
            imgWrap.appendChild(image);
        }

        const body = document.createElement('div');
        body.className = 'vs-card-body';
        const title = document.createElement('span');
        title.className = 'vs-card-title';
        title.textContent = r.title || '';
        const price = document.createElement('span');
        price.className = 'vs-card-price';
        price.textContent = fmtPrice(r);
        body.append(title, price);
        a.append(imgWrap, body);
        frag.appendChild(a);
    });
    resultsEl.appendChild(frag);
}

async function runSearch() {
    if (!currentFile && !currentPreview) {
        setStatus(T('vs.needImage', 'Drop an image first.'), 'error');
        return;
    }
    submitBtn.disabled = true;
    setStatus(T('vs.searching', 'Searching…'), 'loading');
    resultsEl.innerHTML = '';
    lastResults = null;

    // Weidian obsługuje usfans, które przyjmuje zdjęcie jako base64 w ciele JSON —
    // wysyłamy pomniejszony podgląd, żeby nie kodować kilku megabajtów w workerze ani
    // nie wypychać ich z telefonu. Taobao i 1688 idą do qcitems całym plikiem.
    const channel = channelSel.value || '3';
    const fd = new FormData();
    if (channel === '3' && currentPreview) {
        fd.append('imageData', currentPreview);
    } else {
        // Po powrocie z produktu mamy tylko podgląd — plik odtwarzamy z niego.
        const file = currentFile || dataUrlToFile(currentPreview, 'search.jpg');
        if (!file) {
            setStatus(T('vs.needImage', 'Drop an image first.'), 'error');
            submitBtn.disabled = false;
            return;
        }
        fd.append('image', file);
    }
    fd.append('channel', channel);
    fd.append('page', '1');

    try {
        const r = await fetch('/api/visual-search', { method: 'POST', body: fd });
        const data = await r.json();
        if (!r.ok || data.error) {
            setStatus(T('vs.error', 'Search failed. Try another image.'), 'error');
            return;
        }
        lastResults = data;
        renderResults(data);
        saveState();
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
    if (!currentFile && !currentPreview) return;
    runSearch();
});

window.addEventListener('pagehide', saveState);
window.addEventListener('beforeunload', saveState);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveState();
});

// Przy bfcache DOM i stan JS są nienaruszone — brakuje tylko pozycji scrolla,
// bo wyłączyliśmy automatyczne przywracanie.
window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    const s = readState();
    if (s && typeof s.scrollY === 'number' && s.scrollY > 0) window.scrollTo(0, s.scrollY);
});

const params = new URLSearchParams(location.search);
const initialChannel = params.get('channel');
if (initialChannel && ['1', '2', '3'].includes(initialChannel)) {
    channelSel.value = initialChannel;
}

restoreState();

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const elD = document.getElementById('nav-discord');
    if (elD && s.discordUrl) elD.href = s.discordUrl;
}).catch(() => {});
