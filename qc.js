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

function setStatus(text, kind) {
    status.textContent = text || '';
    status.className = 'qc-status' + (kind ? ` qc-status-${kind}` : '');
}

function clearResults() {
    results.innerHTML = '';
    allPhotos = [];
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
        const id = u.searchParams.get('itemID') || u.searchParams.get('itemId');
        if (host === 'weidian.com' || host.endsWith('.weidian.com')) {
            if (id) return `https://www.usfans.com/product/3/${id}?ref=MGRSBE`;
        }
        if (host.endsWith('taobao.com') || host.endsWith('tmall.com')) {
            const tid = u.searchParams.get('id');
            if (tid) return `https://www.usfans.com/product/1/${tid}?ref=MGRSBE`;
        }
        if (host.endsWith('1688.com')) {
            const m = u.pathname.match(/(\d+)\.html/);
            if (m) return `https://www.usfans.com/product/2/${m[1]}?ref=MGRSBE`;
        }
    } catch {}
    return null;
}

function appendUsfansFallback(rawInput) {
    const link = usfansLinkFromInput(rawInput);
    if (!link) return;
    const wrap = document.createElement('div');
    wrap.className = 'qc-fallback';
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'card-btn pd-qc';
    a.textContent = T('qc.openUsfans', 'Check on USFans');
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

function openLightbox(idx) {
    if (idx < 0 || idx >= allPhotos.length) return;
    const lb = ensureLightbox();
    lightboxIdx = idx;
    const img = lb.querySelector('.qc-lb-img');
    img.src = allPhotos[idx];
    lb.querySelector('.qc-lb-counter').textContent = `${idx + 1} / ${allPhotos.length}`;
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
    if (lightboxIdx < 0 || !allPhotos.length) return;
    let next = lightboxIdx + dir;
    if (next < 0) next = allPhotos.length - 1;
    if (next >= allPhotos.length) next = 0;
    openLightbox(next);
}

document.addEventListener('keydown', e => {
    if (lightboxIdx < 0) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') navLightbox(-1);
    else if (e.key === 'ArrowRight') navLightbox(1);
});

function renderResponse(data, rawInput) {
    clearResults();
    const sets = data.sets || [];
    if (!sets.length) {
        setStatus(T('qc.empty', 'No QC photos found for this product yet.'), 'empty');
        appendUsfansFallback(rawInput);
        return;
    }
    setStatus(T('qc.results', `${data.totalPhotos} QC photos`, { n: data.totalPhotos }), 'ok');

    const info = renderInfo(data.info);
    if (info) results.appendChild(info);

    sets.forEach((set, i) => {
        const n = i + 1;
        const block = document.createElement('section');
        block.className = 'qc-set';

        const header = document.createElement('div');
        header.className = 'qc-set-header';
        const title = document.createElement('span');
        title.className = 'qc-set-title';
        title.textContent = T('qc.setName', `QC Photos set #${n}`, { n });
        header.appendChild(title);
        block.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'qc-grid';
        set.photos.forEach(p => {
            const flatIdx = allPhotos.length;
            allPhotos.push(p.url);

            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'qc-tile';
            tile.addEventListener('click', () => openLightbox(flatIdx));

            const img = document.createElement('img');
            img.src = p.url;
            img.loading = 'lazy';
            img.alt = '';
            img.draggable = false;
            img.addEventListener('error', () => {
                console.warn('[qc] image failed:', p.url);
                tile.classList.add('qc-tile-broken');
                tile.disabled = true;
                img.style.display = 'none';
                if (!tile.querySelector('.qc-tile-broken-mark')) {
                    const mark = document.createElement('span');
                    mark.className = 'qc-tile-broken-mark';
                    mark.textContent = '⚠️';
                    tile.appendChild(mark);
                }
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
        results.appendChild(block);
    });

    appendUsfansFallback(rawInput);
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
