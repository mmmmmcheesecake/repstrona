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

function setStatus(text, kind) {
    status.textContent = text || '';
    status.className = 'qc-status' + (kind ? ` qc-status-${kind}` : '');
}

function clearResults() {
    results.innerHTML = '';
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

function renderResponse(data) {
    clearResults();
    const sets = data.sets || [];
    if (!sets.length) {
        setStatus(T('qc.empty', 'No QC photos found for this product yet.'), 'empty');
        return;
    }
    setStatus(T('qc.results', `${data.totalPhotos} QC photos`, { n: data.totalPhotos }), 'ok');

    const info = renderInfo(data.info);
    if (info) results.appendChild(info);

    sets.forEach(set => {
        const block = document.createElement('section');
        block.className = 'qc-set';

        const header = document.createElement('div');
        header.className = 'qc-set-header';
        const title = document.createElement('span');
        title.className = 'qc-set-title';
        title.textContent = set.name;
        const badge = document.createElement('span');
        badge.className = 'qc-set-source';
        badge.textContent = set.sourceLabel;
        header.appendChild(title);
        header.appendChild(badge);
        block.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'qc-grid';
        set.photos.forEach(p => {
            const a = document.createElement('a');
            a.href = p.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'qc-tile';
            const img = document.createElement('img');
            img.src = p.url;
            img.loading = 'lazy';
            img.alt = '';
            img.addEventListener('error', () => a.remove());
            a.appendChild(img);
            const date = fmtDate(p.timestamp);
            if (date) {
                const cap = document.createElement('span');
                cap.className = 'qc-tile-date';
                cap.textContent = date;
                a.appendChild(cap);
            }
            grid.appendChild(a);
        });
        block.appendChild(grid);
        results.appendChild(block);
    });
}

async function runCheck(url) {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    lastQuery = trimmed;
    clearResults();
    setStatus(T('qc.checking', 'Searching for QC photos…'), 'loading');
    try {
        const r = await fetch(`/api/qc?url=${encodeURIComponent(trimmed)}`);
        const data = await r.json();
        if (lastQuery !== trimmed) return;
        if (!r.ok || data.error) {
            if (data.error === 'unsupported' || data.error === 'invalid url') {
                setStatus(T('qc.invalid', 'Could not recognize the product link.'), 'error');
            } else {
                setStatus(T('qc.error', 'Failed to load QC photos. Try another link.'), 'error');
            }
            return;
        }
        renderResponse(data);
    } catch {
        if (lastQuery !== trimmed) return;
        setStatus(T('qc.error', 'Failed to load QC photos. Try another link.'), 'error');
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
