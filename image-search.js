function T(key, fallback, vars) {
    if (window.RePluGI18n) return window.RePluGI18n.t(key, vars);
    return fallback;
}

const dropEl = document.getElementById('vsDrop');
const fileInput = document.getElementById('vsFile');
const previewEl = document.getElementById('vsPreview');
const previewWrapEl = document.getElementById('vsPreviewWrap');
const cropEl = document.getElementById('vsCrop');
const cropBoxEl = document.getElementById('vsCropBox');
const cropHintEl = document.getElementById('vsCropHint');
const dropEmptyEl = document.getElementById('vsDropEmpty');
const channelSel = document.getElementById('vsChannel');
const form = document.getElementById('vsForm');
const submitBtn = document.getElementById('vsSubmit');
const resetBtn = document.getElementById('vsReset');
const dropTextEl = document.getElementById('vsDropText');
const pickFileBtn = document.getElementById('vsPickFile');
const linkInput = document.getElementById('vsLink');
const linkBtn = document.getElementById('vsLinkGo');
const statusEl = document.getElementById('vsStatus');
const resultsEl = document.getElementById('vsResults');

let currentFile = null;
let currentPreview = null;   // dataURL podglądu — przeżywa nawigację, currentFile nie
let crop = null;             // zaznaczony fragment, ułamki 0..1 względem podglądu
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
        previewWrapEl.hidden = true;
        dropEmptyEl.hidden = false;
        resetBtn.hidden = true;
        cropHintEl.hidden = true;
        setCrop(null);
        return;
    }
    previewEl.src = src;
    previewWrapEl.hidden = false;
    dropEmptyEl.hidden = true;
    resetBtn.hidden = false;
    cropHintEl.hidden = false;
}

function setCrop(rect) {
    crop = rect;
    if (!rect) {
        cropBoxEl.hidden = true;
        return;
    }
    cropBoxEl.hidden = false;
    cropBoxEl.style.left = `${rect.x * 100}%`;
    cropBoxEl.style.top = `${rect.y * 100}%`;
    cropBoxEl.style.width = `${rect.w * 100}%`;
    cropBoxEl.style.height = `${rect.h * 100}%`;
}

// Zaznaczenie trzymamy w ułamkach obrazu, nie w pikselach ekranu — podgląd skaluje się
// z szerokością strony, a kadr ma przeżyć powrót z produktu.
const clamp01 = n => Math.min(1, Math.max(0, n));
let dragFrom = null;

cropEl.addEventListener('pointerdown', e => {
    if (previewWrapEl.hidden) return;
    // Podgląd siedzi w <label>, więc bez tego każde kliknięcie otwiera wybór pliku.
    e.preventDefault();
    e.stopPropagation();
    const box = previewEl.getBoundingClientRect();
    if (!box.width || !box.height) return;
    dragFrom = { x: clamp01((e.clientX - box.left) / box.width), y: clamp01((e.clientY - box.top) / box.height), box };
    setCrop(null);
    try { cropEl.setPointerCapture(e.pointerId); } catch {}
});

cropEl.addEventListener('pointermove', e => {
    if (!dragFrom) return;
    const { box } = dragFrom;
    const x = clamp01((e.clientX - box.left) / box.width);
    const y = clamp01((e.clientY - box.top) / box.height);
    setCrop({
        x: Math.min(dragFrom.x, x),
        y: Math.min(dragFrom.y, y),
        w: Math.abs(x - dragFrom.x),
        h: Math.abs(y - dragFrom.y),
    });
});

function endDrag() {
    if (!dragFrom) return;
    dragFrom = null;
    // Samo kliknięcie, bez przeciągnięcia, kasuje zaznaczenie — szukamy całego zdjęcia.
    if (crop && (crop.w < 0.05 || crop.h < 0.05)) setCrop(null);
    saveState();
}
cropEl.addEventListener('pointerup', endDrag);
cropEl.addEventListener('pointercancel', endDrag);
// Safari fires the click on the surrounding label even after pointerdown was handled.
cropEl.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
});

// Wycina zaznaczony fragment z podglądu; bez zaznaczenia oddaje podgląd bez zmian.
function croppedDataUrl() {
    if (!currentPreview || !crop) return Promise.resolve(currentPreview);
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const sx = Math.round(crop.x * img.naturalWidth);
            const sy = Math.round(crop.y * img.naturalHeight);
            const sw = Math.max(1, Math.round(crop.w * img.naturalWidth));
            const sh = Math.max(1, Math.round(crop.h * img.naturalHeight));
            const cv = document.createElement('canvas');
            cv.width = sw;
            cv.height = sh;
            try {
                cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                resolve(cv.toDataURL('image/jpeg', 0.85));
            } catch { resolve(currentPreview); }
        };
        img.onerror = () => resolve(currentPreview);
        img.src = currentPreview;
    });
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
    setCrop(null);
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

// Wklejenie klawiaturą — na desktopie. Telefon nie wyśle tego zdarzenia bez pola
// tekstowego, dlatego niżej jest jeszcze przycisk czytający schowek wprost.
document.addEventListener('paste', async e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (!item) return;
    const f = item.getAsFile();
    if (!f) return;
    await setFile(f);
    runSearch();
});

// Na telefonie zdjęcie ze schowka nie miało jak trafić do wyszukiwarki — trzeba je
// było najpierw zapisać do galerii. Schowek czytamy tylko z kliknięcia, bo tego
// wymagają przeglądarki, a samo navigator.clipboard.read() musi być pierwszą rzeczą
// po nim: cokolwiek wcześniej poczekamy, gest przestaje się liczyć i Safari odmawia.
// Udostępnianie z aplikacji nigdy nie kopiuje samego adresu: Taobao wysyła
// „【淘宝】https://e.tb.cn/h.xxx 点击链接…", Weidian nazwę przedmiotu przed linkiem, a
// wklejenie z przeglądarki potrafi przyjść jako HTML. Bierzemy pierwszy adres, jaki
// da się w tym znaleźć, zamiast wymagać, żeby tekst się od niego zaczynał.
function firstUrlIn(text) {
    if (typeof text !== 'string') return null;
    const m = text.match(/https?:\/\/[^\s"'<>\\]+/i);
    if (!m) return null;
    // Adresy w zdaniach kończą się interpunkcją, która do nich nie należy.
    return m[0].replace(/[),.;!?\]]+$/, '');
}

// Adres zdjęcia poznajemy po rozszerzeniu — „skopiuj adres obrazka" w przeglądarce
// daje właśnie to, a wtedy szukamy tym zdjęciem, nie traktujemy go jak link do produktu.
function looksLikeImageUrl(url) {
    try {
        return /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(new URL(url).pathname);
    } catch {
        return false;
    }
}

// Zdjęcia spod adresu nie pobierze przeglądarka — obce domeny nie pozwalają na to
// przez CORS — więc ściąga je worker i oddaje nam samą treść. Dalej idzie już zwykłą
// drogą: podgląd, kadrowanie i Weidian pytany wprost z przeglądarki, bo tamtędy usfans
// odpowiada, a z workera blokuje mniej więcej co drugie zapytanie.
async function searchByImageUrl(url, quiet) {
    setStatus(T('vs.searching', 'Searching…'), 'loading');
    try {
        const r = await fetch(`/api/fetch-image?url=${encodeURIComponent(url)}`);
        const data = await r.json().catch(() => null);
        if (!r.ok || !data || !data.dataUrl) {
            if (!quiet) setStatus(T('vs.linkUnknown', 'That link is not a product we can open.'), 'error');
            return false;
        }
        const file = dataUrlToFile(data.dataUrl, 'clipboard.jpg');
        if (!file) {
            if (!quiet) setStatus(T('vs.error', 'Search failed. Try another image.'), 'error');
            return false;
        }
        await setFile(file);
        runSearch();
        return true;
    } catch {
        if (!quiet) setStatus(T('vs.error', 'Search failed. Try another image.'), 'error');
        return false;
    }
}

// Ze schowka przychodzi goły adres i nic w nim nie mówi, czy to przedmiot, czy zdjęcie.
// Rozszerzeniu pliku ufać się nie da — połowa CDN-ów wydaje obrazki bez niego — więc
// najpierw pytamy konwerter, a jak nie rozpozna produktu, próbujemy potraktować to
// jako zdjęcie i dopiero wtedy się poddajemy.
async function handlePastedLink(link) {
    if (looksLikeImageUrl(link)) {
        if (await searchByImageUrl(link, true)) return;
    }
    linkInput.value = link;
    if (await openPastedLink(true)) return;
    if (await searchByImageUrl(link, true)) return;
    setStatus(T('vs.linkUnknown', 'That link is not a product we can open.'), 'error');
}

async function pasteFromClipboard() {
    let items;
    try {
        items = await navigator.clipboard.read();
    } catch (err) {
        const name = err && err.name ? err.name : '';
        // NotAllowedError to odmowa — reszta znaczy, że przeglądarka w ogóle nie daje
        // rady, i wtedy warto pokazać nazwę błędu, bo inaczej zgłoszenie brzmi
        // „nie działa" i nie ma z czego wnioskować.
        setStatus(name && name !== 'NotAllowedError'
            ? `${T('vs.pasteDenied', 'The browser would not hand over the clipboard.')} (${name})`
            : T('vs.pasteDenied', 'The browser would not hand over the clipboard.'), 'error');
        return;
    }

    const seen = [];
    for (const item of items) seen.push(...(item.types || []));

    for (const item of items) {
        const type = (item.types || []).find(t => t.startsWith('image/'));
        if (!type) continue;
        try {
            const blob = await item.getType(type);
            await setFile(new File([blob], `clipboard.${type.split('/')[1] || 'png'}`, { type }));
            runSearch();
            return;
        } catch {}
    }

    // W schowku bywa adres zdjęcia albo link do przedmiotu — jedno i drugie da się
    // obsłużyć, zamiast tłumaczyć, że to nie obrazek.
    // Telefony podają adres jako text/uri-list, nie text/plain — dlatego bierzemy
    // wszystko, co jest tekstem, zamiast wymieniać typy z nazwy.
    const texts = [];
    for (const item of items) {
        for (const type of (item.types || [])) {
            if (!type.startsWith('text/')) continue;
            try { texts.push(await (await item.getType(type)).text()); } catch {}
        }
    }
    // Część przeglądarek wydaje przez read() tylko obrazki, a tekst dopiero tędy.
    try { texts.push(await navigator.clipboard.readText()); } catch {}

    for (const text of texts) {
        const link = firstUrlIn(text);
        if (!link) continue;
        handlePastedLink(link);
        return;
    }

    // Co w schowku było, skoro nie zdjęcie i nie link — bez tego zgłoszenie „nie
    // wkleja się" nie niesie żadnej informacji.
    const kinds = [...new Set(seen)].join(', ');
    setStatus(`${T('vs.pasteEmpty', 'There is no image or product link in the clipboard.')}${kinds ? ` (${kinds})` : ''}`, 'empty');
}

// Kafelek jest teraz przyciskiem wklejania, bo na telefonie zdjęcie prawie zawsze
// jest w schowku, a nie w galerii. Gdzie schowka przeczytać się nie da, zostaje tym,
// czym był — otwiera wybór pliku.
const CLIPBOARD_READ = Boolean(navigator.clipboard && typeof navigator.clipboard.read === 'function');

if (CLIPBOARD_READ) {
    dropTextEl.setAttribute('data-i18n', 'vs.dropPaste');
    dropTextEl.textContent = T('vs.dropPaste', 'Tap here to paste an image');
    pickFileBtn.hidden = false;
} else {
    // Bez tego kafelek po cichu otwiera wybór pliku i wygląda, jakby wklejanie było
    // zepsute, zamiast powiedzieć, że ta przeglądarka go nie udostępnia.
    cropHintEl.hidden = false;
    cropHintEl.setAttribute('data-i18n', 'vs.pasteUnsupported');
    cropHintEl.textContent = T('vs.pasteUnsupported', 'This browser will not share the clipboard — upload a file or paste a link below.');
}

dropEl.addEventListener('click', () => {
    if (CLIPBOARD_READ) pasteFromClipboard();
    else fileInput.click();
});

dropEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    dropEl.click();
});

pickFileBtn.addEventListener('click', e => {
    e.stopPropagation();
    fileInput.click();
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
        crop,
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
    if (['2', '3'].includes(String(s.channel))) channelSel.value = String(s.channel);
    if (s.preview) {
        currentPreview = s.preview;
        currentFile = dataUrlToFile(s.preview, 'search.jpg');
        showPreview(s.preview);
        if (s.crop && s.crop.w > 0 && s.crop.h > 0) setCrop(s.crop);
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
//
// The photo and price go with it because taobao items have no data source behind
// them: qcitems reads taobao from usfans, and usfans has answered nothing for it
// for weeks, so the product page opens on a blank gallery and a dash unless the
// card passes down what it already showed.
function productHref(r) {
    const url = marketplaceUrl(r);
    if (!url) return '#';
    const q = new URLSearchParams({ url, name: r.title || '' });
    const img = safeHttpUrl(r.image);
    if (img) q.set('img', hotlinkSafeImage(img));
    const price = r.discountPrice || r.price;
    if (price > 0) {
        q.set('price', String(price));
        q.set('cur', r.currency || 'CNY');
    }
    return `produkt.html?${q.toString()}`;
}

// The card renders a cover directly and only reaches for the proxy if that fails;
// the product page has no such retry, so alicdn covers (cbu01 refuses hot-links
// carrying our Referer) go through the proxy from the start.
function hotlinkSafeImage(url) {
    try {
        if (!/(^|\.)alicdn\.com$/i.test(new URL(url).hostname)) return url;
    } catch { return url; }
    return proxiedImage(url) || url;
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
    const cur = window.RePluGCurrency;
    if (cur && r.currency === 'CNY') {
        const usd = cur.toUsd ? cur.toUsd(p, 'CNY') : null;
        if (typeof usd === 'number') return cur.format(usd);
    }
    // kakobuy converts before it answers, so those prices arrive in USD already.
    if (cur && r.currency === 'USD' && cur.format) return cur.format(p);
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

// Weidian pytamy prosto z przeglądarki: usfans pozwala na CORS z naszej domeny, a to
// samo zapytanie wysłane z workera Cloudflare jest blokowane mniej więcej co drugi raz
// (ich własna strona blokady, HTTP 503, niezależnie od nagłówków). Z przeglądarki idzie
// z IP odwiedzającego, którego nikt nie blokuje. /api/visual-search zostaje zapasem.
const USFANS_API = 'https://www.usfans.com/api';

async function usfansPost(path, payload) {
    const r = await fetch(`${USFANS_API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!r.ok) return null;
    const j = await r.json();
    // Ich API odpowiada HTTP 200 także na błędy — liczy się code i success.
    return j && j.success !== false && j.code === 200 ? j : null;
}

// Ten sam kształt wyniku co z /api/visual-search, żeby renderResults nie musiał wiedzieć,
// skąd przyszły dane. Trzymać zsynchronizowane z shapeUsfansRecord w workerze.
function shapeUsfans(r) {
    if (!r || !r.goodsId) return null;
    const price = r.discountPrice != null ? r.discountPrice : r.price;
    return {
        id: `https://www.usfans.com/product/3/${encodeURIComponent(r.goodsId)}?ref=MGRSBE`,
        goodsId: String(r.goodsId),
        marketplace: 'weidian',
        title: r.title || '',
        image: typeof r.image === 'string' ? r.image : null,
        price: typeof price === 'number' ? price : null,
        currency: 'CNY'
    };
}

async function searchWeidianDirect(dataUrl, page) {
    try {
        const up = await usfansPost('/goods/image/upload', { imageBase64: dataUrl, channel: 3 });
        const imageId = up && up.data && up.data.imageId;
        if (!imageId) return null;

        const found = await usfansPost('/goods/search/image', {
            pageNum: page,
            pageSize: 20,
            imageId,
            channel: 3
        });
        const records = found && found.data && found.data.records;
        if (!Array.isArray(records)) return null;

        return {
            channel: '3',
            marketplace: 'weidian',
            results: records.map(shapeUsfans).filter(Boolean)
        };
    } catch {
        return null;
    }
}

// usfans odrzuca mniej wiecej co druge polaczenie z edge'a Cloudflare — blad wraca
// natychmiast (~0,2 s wobec ~2 s przy odpowiedzi), a kolejna proba zwykle przechodzi.
// Ponawiamy tylko 5xx: 4xx to odpowiedz o naszym zapytaniu i drugi raz wyjdzie tak samo.
const SEARCH_ATTEMPTS = 4;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function postSearch(fd) {
    for (let i = 0; i < SEARCH_ATTEMPTS; i++) {
        try {
            const r = await fetch('/api/visual-search', { method: 'POST', body: fd });
            if (r.ok) {
                const data = await r.json();
                if (!data.error) return data;
                return null;
            }
            if (r.status < 500) return null;
        } catch {}
        if (i < SEARCH_ATTEMPTS - 1) await sleep(250);
    }
    return null;
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

    // Szukamy tym, co widać w ramce: wykadrowany podgląd zamiast całego kadru z tłem.
    // usfans przyjmuje zdjęcie jako base64 w ciele JSON, qcitems jako plik.
    const channel = channelSel.value || '3';
    const searchImage = await croppedDataUrl();
    const fd = new FormData();
    if (channel === '3' && searchImage) {
        fd.append('imageData', searchImage);
    } else {
        const file = (searchImage && dataUrlToFile(searchImage, 'search.jpg')) || currentFile;
        if (!file) {
            setStatus(T('vs.needImage', 'Drop an image first.'), 'error');
            submitBtn.disabled = false;
            return;
        }
        fd.append('image', file);
    }
    fd.append('channel', channel);
    fd.append('page', '1');

    // Weidian najpierw prosto do usfans; worker tylko gdy to nie wyjdzie.
    let data = null;
    if (channel === '3') {
        const dataUrl = searchImage || (currentFile ? await readAsDataUrl(currentFile) : null);
        if (dataUrl) data = await searchWeidianDirect(dataUrl, 1);
    }
    if (!data) data = await postSearch(fd);
    submitBtn.disabled = false;
    if (!data) {
        setStatus(T('vs.error', 'Search failed. Try another image.'), 'error');
        return;
    }
    lastResults = data;
    renderResults(data);
    saveState();
}

// Wklejony link — czyjkolwiek by nie był — zamieniamy na surowy link marketplace'u
// i otwieramy jak każdy inny produkt: z naszym linkiem do agenta i zdjęciami QC.
async function openPastedLink(quiet) {
    const raw = linkInput.value.trim();
    if (!raw) return false;

    linkBtn.disabled = true;
    setStatus(T('vs.linkChecking', 'Checking the link…'), 'loading');
    try {
        const r = await fetch(`/api/convert?link=${encodeURIComponent(raw)}`);
        const data = await r.json().catch(() => null);
        if (r.ok && data && data.url) {
            location.href = `produkt.html?${new URLSearchParams({ url: data.url }).toString()}`;
            return true;
        }
        if (!quiet) {
            setStatus(r.status === 404
                ? T('vs.linkUnknown', 'That link is not a product we can open.')
                : T('vs.linkFailed', 'Could not check the link. Try again.'), 'error');
        }
        return false;
    } catch {
        if (!quiet) setStatus(T('vs.linkFailed', 'Could not check the link. Try again.'), 'error');
        return false;
    } finally {
        linkBtn.disabled = false;
    }
}

linkBtn.addEventListener('click', () => openPastedLink());
linkInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    openPastedLink();
});

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
if (initialChannel && ['2', '3'].includes(initialChannel)) {
    channelSel.value = initialChannel;
}

restoreState();

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const elD = document.getElementById('nav-discord');
    if (elD && s.discordUrl) elD.href = s.discordUrl;
}).catch(() => {});
