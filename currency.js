(function () {
    const CURRENCIES = ['USD', 'PLN', 'EUR', 'GBP', 'CNY'];
    const FALLBACK = { USD: 1, PLN: 4.0, EUR: 0.92, GBP: 0.79, CNY: 7.2 };
    const CACHE_KEY = 'rates_v1';
    const TS_KEY = 'rates_v1_ts';
    const CUR_KEY = 'currency';
    const TTL = 24 * 60 * 60 * 1000;

    let rates = null;
    const listeners = [];

    function getCurrency() {
        const v = localStorage.getItem(CUR_KEY);
        return CURRENCIES.includes(v) ? v : 'USD';
    }

    function setCurrency(c) {
        if (!CURRENCIES.includes(c)) return;
        localStorage.setItem(CUR_KEY, c);
        notify(c);
    }

    function onChange(fn) { listeners.push(fn); }

    function notify(c) {
        listeners.forEach(fn => { try { fn(c); } catch (e) { console.warn(e); } });
    }

    function getRates() { return rates || FALLBACK; }

    async function loadRates() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            const ts = parseInt(localStorage.getItem(TS_KEY) || '0', 10);
            if (cached && Date.now() - ts < TTL) {
                rates = JSON.parse(cached);
                notify(getCurrency());
                return;
            }
        } catch {}
        try {
            const r = await fetch('/api/rates');
            const j = await r.json();
            if (j && j.rates) {
                rates = j.rates;
                localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
                localStorage.setItem(TS_KEY, String(Date.now()));
                notify(getCurrency());
            }
        } catch {
            rates = FALLBACK;
            notify(getCurrency());
        }
    }

    function formatPrice(usd, currencyOverride) {
        if (usd == null || isNaN(usd)) return '—';
        const cur = currencyOverride || getCurrency();
        const r = getRates();
        const rate = r[cur] || 1;
        const v = Math.round(usd * rate);
        switch (cur) {
            case 'PLN': return `${v} zł`;
            case 'EUR': return `€${v}`;
            case 'GBP': return `£${v}`;
            case 'CNY': return `¥${v}`;
            default:    return `$${v}`;
        }
    }

    function initPicker() {
        const nav = document.querySelector('.nav-right');
        if (!nav || document.getElementById('currencySelect')) return;
        const sel = document.createElement('select');
        sel.id = 'currencySelect';
        sel.className = 'cur-select';
        sel.setAttribute('aria-label', 'Waluta');
        CURRENCIES.forEach(c => {
            const o = document.createElement('option');
            o.value = c;
            o.textContent = c;
            sel.appendChild(o);
        });
        sel.value = getCurrency();
        sel.addEventListener('change', () => setCurrency(sel.value));
        nav.insertBefore(sel, nav.firstChild);
    }

    window.RePluGCurrency = {
        format: formatPrice,
        current: getCurrency,
        onChange,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { initPicker(); loadRates(); });
    } else {
        initPicker();
        loadRates();
    }
})();
