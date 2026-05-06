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

function renderImages(images, sources) {
    clearResults();
    if (!images.length) {
        setStatus(T('qc.empty', 'No QC photos found for this product yet.'), 'empty');
        return;
    }
    setStatus(T('qc.results', `${images.length} QC photos`, { n: images.length }), 'ok');
    const frag = document.createDocumentFragment();
    images.forEach(src => {
        const a = document.createElement('a');
        a.href = src;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'qc-tile';
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy';
        img.alt = '';
        img.addEventListener('error', () => a.remove());
        a.appendChild(img);
        frag.appendChild(a);
    });
    results.appendChild(frag);

    if (sources && sources.length) {
        const note = document.createElement('p');
        note.className = 'qc-sources';
        note.textContent = T('qc.source', `Source: ${sources.join(', ')}`, { name: sources.join(', ') });
        results.appendChild(note);
    }
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
            if (data.error === 'unsupported') {
                setStatus(T('qc.invalid', 'Could not recognize the product link.'), 'error');
            } else {
                setStatus(T('qc.error', 'Failed to load QC photos. Try another link.'), 'error');
            }
            return;
        }
        renderImages(data.images || [], data.sources || []);
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
