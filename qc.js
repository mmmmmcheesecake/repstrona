function T(key, fallback, vars) {
    if (window.RePluGI18n) return window.RePluGI18n.t(key, vars);
    return fallback;
}

const params = new URLSearchParams(window.location.search);
const initialUrl = params.get('url') || '';

const input = document.getElementById('qcInput');
const form = document.getElementById('qcForm');
const status = document.getElementById('qcStatus');
const results = document.getElementById('qcResults');

let lastQuery = '';
let allPhotos = [];
let lightboxIdx = -1;
let setCount = 0;
// The "open at agent" button is appended once and stays last: sets that arrive after
// it — usfans answering the browser directly — slot in above it.
let fallbackEl = null;

function setStatus(text, kind) {
    status.textContent = text || '';
    status.className = 'qc-status' + (kind ? ` qc-status-${kind}` : '');
}

function clearResults() {
    results.innerHTML = '';
    allPhotos = [];
    setCount = 0;
    fallbackEl = null;
}

function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleDateString();
}

function renderInfo(info) {
    if (!info) return null;
    const bits = [];
    if (info.weight) bits.push(`${info.weight} g`);
    if (info.length || info.width || info.height) {
        bits.push(`${info.length || '?'} × ${info.width || '?'} × ${info.height || '?'} cm`);
    }
    if (info.avgArrivalDays) bits.push(`~${info.avgArrivalDays} ${T('qc.days', 'days')}`);
    if (!bits.length) return null;
    const div = document.createElement('div');
    div.className = 'qc-info';
    div.textContent = bits.join('  •  ');
    return div;
}

function usfansLinkFromInput(raw) {
    if (!raw) return null;
    try {
        const u = new URL(raw);
        const host = u.hostname.toLowerCase();
        if (host.endsWith('usfans.com')) return raw + (raw.includes('?') ? '&' : '?') + 'ref=MGRSBE';
        // Only weidian resolves on usfans; taobao and 1688 never open there, so they
        // go through kakobuy, which takes the raw marketplace URL. Same split as
        // produkt.js.
        // am_redirect=true runs kakobuy's affiliate flow, which resolves the item and
        // credits the affcode; affcode alone bounces the SPA to "item not found".
        const kako = raw => `https://www.kakobuy.com/item/details?url=${encodeURIComponent(raw)}` +
            `&affcode=5zj3z&am_redirect=true`;
        const id = u.searchParams.get('itemID') || u.searchParams.get('itemId');
        if (host === 'weidian.com' || host.endsWith('.weidian.com')) {
            if (id) return `https://www.usfans.com/product/3/${id}?ref=MGRSBE`;
        }
        if (host.endsWith('taobao.com')) {
            const tid = u.searchParams.get('id');
            if (tid) return kako(`https://item.taobao.com/item.htm?id=${tid}`);
        }
        if (host.endsWith('tmall.com')) {
            const tid = u.searchParams.get('id');
            if (tid) return kako(`https://detail.tmall.com/item.htm?id=${tid}`);
        }
        if (host.endsWith('1688.com')) {
            const m = u.pathname.match(/\/offer\/(\d+)\.html/);
            if (m) return kako(`https://detail.1688.com/offer/${m[1]}.html`);
        }
    } catch {}
    return null;
}

function appendUsfansFallback(rawInput) {
    const link = usfansLinkFromInput(rawInput);
    if (!link) return;
    const wrap = document.createElement('div');
    wrap.className = 'qc-fallback';
    fallbackEl = wrap;
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'card-btn pd-qc';
    // The link is only usfans for weidian — taobao and 1688 go to kakobuy.
    a.textContent = /usfans\.com/i.test(link)
        ? T('qc.openUsfans', 'Check on USFans')
        : T('qc.openAgent', 'Open at agent');
    wrap.appendChild(a);
    results.appendChild(wrap);
}

function ensureLightbox() {
    let lb = document.getElementById('qcLightbox');
    if (lb) return lb;
    lb = document.createElement('div');
    lb.id = 'qcLightbox';
    lb.className = 'qc-lightbox';
    lb.innerHTML = `
        <button type="button" class="qc-lb-close" aria-label="Close">×</button>
        <button type="button" class="qc-lb-nav qc-lb-prev" aria-label="Prev">‹</button>
        <button type="button" class="qc-lb-nav qc-lb-next" aria-label="Next">›</button>
        <img class="qc-lb-img" alt="" oncontextmenu="return false">
        <div class="qc-lb-counter"></div>
    `;
    document.body.appendChild(lb);
    lb.addEventListener('click', e => {
        if (e.target === lb) closeLightbox();
    });
    lb.querySelector('.qc-lb-close').addEventListener('click', closeLightbox);
    lb.querySelector('.qc-lb-prev').addEventListener('click', e => { e.stopPropagation(); navLightbox(-1); });
    lb.querySelector('.qc-lb-next').addEventListener('click', e => { e.stopPropagation(); navLightbox(1); });
    lb.querySelector('.qc-lb-img').addEventListener('click', e => e.stopPropagation());
    return lb;
}

// Photos whose host stopped serving them are marked broken and pulled out of the
// grid, so the lightbox has to count and step over the ones that are still there.
function livePhotos() {
    return allPhotos.filter(p => !p.broken);
}

function openLightbox(idx) {
    const photo = allPhotos[idx];
    if (!photo || photo.broken) return;
    const lb = ensureLightbox();
    lightboxIdx = idx;
    const img = lb.querySelector('.qc-lb-img');
    // The archive holds the viewing size for the first photos of a product and the tile
    // size for the rest, so when an outage means the big one is not there, show the
    // small one rather than an empty frame.
    img.onerror = () => {
        if (photo.thumb && img.src !== photo.thumb) img.src = photo.thumb;
    };
    img.src = photo.url;
    const live = livePhotos();
    lb.querySelector('.qc-lb-counter').textContent = `${live.indexOf(photo) + 1} / ${live.length}`;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('qcLightbox');
    if (!lb) return;
    lb.classList.remove('open');
    lightboxIdx = -1;
    document.body.style.overflow = '';
    const img = lb.querySelector('.qc-lb-img');
    if (img) img.src = '';
}

function navLightbox(dir) {
    const live = livePhotos();
    if (lightboxIdx < 0 || !live.length) return;
    const at = live.indexOf(allPhotos[lightboxIdx]);
    const next = at < 0 ? 0 : (at + dir + live.length) % live.length;
    openLightbox(allPhotos.indexOf(live[next]));
}

document.addEventListener('keydown', e => {
    if (lightboxIdx < 0) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') navLightbox(-1);
    else if (e.key === 'ArrowRight') navLightbox(1);
});

function updateCount() {
    const n = livePhotos().length;
    if (!n) {
        setStatus(T('qc.unavailable', 'QC photos are temporarily unavailable — the site hosting them is not responding.'), 'empty');
        return;
    }
    setStatus(T('qc.results', `${n} QC photos`, { n }), 'ok');
}

function renderSet(set) {
    const n = ++setCount;
    const block = document.createElement('section');
    block.className = 'qc-set';

    const header = document.createElement('div');
    header.className = 'qc-set-header';
    const title = document.createElement('span');
    title.className = 'qc-set-title';
    title.textContent = T('qc.setName', `QC Photos set #${n}`, { n });
    header.appendChild(title);
    // Whose warehouse shot these. Worth saying now that sets come from more than one
    // place: usfans we fetch ourselves, the rest arrive through qcitems.
    if (set.sourceLabel) {
        const src = document.createElement('span');
        src.className = 'qc-set-source';
        src.textContent = set.sourceLabel;
        header.appendChild(src);
    }
    block.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'qc-grid';
    set.photos.forEach(p => {
        const photo = { url: p.url, thumb: p.thumb || null, broken: false };
        const flatIdx = allPhotos.length;
        allPhotos.push(photo);

        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'qc-tile';
        tile.addEventListener('click', () => openLightbox(flatIdx));

        const img = document.createElement('img');
        // A tile-sized copy where the source can make one; the full frame waits for the
        // lightbox. usfans serves 4 MB originals, and twenty of those is not a page.
        img.src = p.thumb || p.url;
        img.loading = 'lazy';
        img.alt = '';
        img.draggable = false;
        img.addEventListener('error', () => {
            // A photo that fails here means its host stopped serving it — the whole
            // set usually goes at once. Take the tile out instead of leaving a grid
            // of warning marks, take the set out when nothing is left in it, and let
            // the count say what actually loaded.
            console.warn('[qc] image failed:', img.src);
            photo.broken = true;
            tile.remove();
            if (!grid.children.length) block.remove();
            updateCount();
        });
        img.addEventListener('contextmenu', e => e.preventDefault());
        tile.appendChild(img);

        const date = fmtDate(p.timestamp);
        if (date) {
            const cap = document.createElement('span');
            cap.className = 'qc-tile-date';
            cap.textContent = date;
            tile.appendChild(cap);
        }
        grid.appendChild(tile);
    });
    block.appendChild(grid);
    if (fallbackEl) results.insertBefore(block, fallbackEl);
    else results.appendChild(block);
}

function qcimg(url) {
    try {
        const b64 = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return `/api/qcimg?u=${b64}`;
    } catch { return url; }
}

// media.usfans.com is Alibaba OSS, so it can hand back the size we are about to draw.
function ossWidth(url, w) {
    return `${url}${url.includes('?') ? '&' : '?'}x-oss-process=image/resize,w_${w}`;
}

// The worker asks usfans from the Cloudflare edge, and usfans turns a large share of
// that away with their own block page. Their CORS names replug24, so the visitor's own
// browser gets an answer where the edge did not — and these are the photos that stay
// up when qcitems is down. Only runs when the worker says it came back empty-handed.
async function appendUsfansQc(itemId, forQuery) {
    let payload;
    try {
        const r = await fetch(`https://usfans.com/api/goods/estimate-info?channel=3&goodsId=${encodeURIComponent(itemId)}`);
        if (!r.ok) return;
        payload = await r.json();
    } catch (e) {
        console.warn('[qc] usfans direct failed', e);
        return;
    }
    // The visitor asked about something else while this was in flight.
    if (lastQuery !== forQuery) return;

    const d = payload && payload.code === 200 ? payload.data : null;
    const photos = (d && Array.isArray(d.qcImages) ? d.qcImages : [])
        .filter(u => typeof u === 'string' && /^https:\/\//i.test(u))
        .map(u => ({
            // Same widths the worker serves, or these photos would miss the archive
            // and arrive as multi-megabyte originals.
            url: qcimg(ossWidth(u, 800)),
            thumb: qcimg(ossWidth(u, 400)),
            // The path carries the day the warehouse shot it: /2026/08/29/163539/….
            timestamp: (u.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//) || []).slice(1, 4).join('-') || null
        }));
    if (!photos.length) return;

    renderSet({ source: 'usfans', sourceLabel: 'USFans', photos });
    // Their answer carries the measured weight and box size too, which is what the
    // shipping line reads — show it if qcitems gave us nothing to show.
    if (!results.querySelector('.qc-info')) {
        const info = renderInfo(d);
        if (info) results.insertBefore(info, results.firstChild);
    }
    updateCount();
}

function renderResponse(data, rawInput) {
    clearResults();
    const sets = data.sets || [];
    // A yupoo album is not a link any agent opens; the API hands back the marketplace
    // item it mirrors, which is what the fallback button has to point at.
    const linkSource = /^https:\/\//i.test(data.resolvedUrl || '') ? data.resolvedUrl : rawInput;

    if (sets.length) {
        setStatus(T('qc.results', `${data.totalPhotos} QC photos`, { n: data.totalPhotos }), 'ok');
        const info = renderInfo(data.info);
        if (info) results.appendChild(info);
        sets.forEach(renderSet);
    } else {
        // The API sets `unavailable` when it found photos but their host refused to
        // serve them — a different thing from a product nobody has QC'd yet.
        setStatus(data.unavailable
            ? T('qc.unavailable', 'QC photos are temporarily unavailable — the site hosting them is not responding.')
            : T('qc.empty', 'No QC photos found for this product yet.'), 'empty');
    }

    appendUsfansFallback(linkSource);

    if (data.usfansPending && data.usfansItemId) appendUsfansQc(data.usfansItemId, rawInput);
}

async function runCheck(url) {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    lastQuery = trimmed;
    clearResults();
    setStatus(T('qc.checking', 'Searching for QC photos…'), 'loading');
    try {
        const r = await fetch(`/api/qc?url=${encodeURIComponent(trimmed)}`);
        const text = await r.text();
        let data;
        try { data = JSON.parse(text); }
        catch (parseErr) {
            console.error('[qc] non-JSON response', r.status, text.slice(0, 300));
            if (lastQuery !== trimmed) return;
            setStatus(T('qc.error', 'Failed to load QC photos. Try another link.'), 'error');
            appendUsfansFallback(trimmed);
            return;
        }
        if (lastQuery !== trimmed) return;
        if (!r.ok || data.error) {
            console.warn('[qc] API error', r.status, data);
            if (data.error === 'unsupported' || data.error === 'invalid url') {
                setStatus(T('qc.invalid', 'Could not recognize the product link.'), 'error');
            } else {
                setStatus(T('qc.error', 'Failed to load QC photos. Try another link.'), 'error');
            }
            appendUsfansFallback(trimmed);
            return;
        }
        renderResponse(data, trimmed);
    } catch (e) {
        console.error('[qc] fetch failed', e);
        if (lastQuery !== trimmed) return;
        setStatus(T('qc.error', 'Failed to load QC photos. Try another link.'), 'error');
        appendUsfansFallback(trimmed);
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    runCheck(input.value);
});

if (initialUrl) {
    input.value = initialUrl;
    runCheck(initialUrl);
}

fetch('/content/settings.json').then(r => r.json()).then(s => {
    const elD = document.getElementById('nav-discord');
    if (elD && s.discordUrl) elD.href = s.discordUrl;
}).catch(() => {});
