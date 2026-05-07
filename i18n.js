(function () {
    const LANGS = ['en', 'pl'];
    const KEY = 'lang';
    const DEFAULT = 'en';

    const DICT = {
        en: {
            'nav.discord': 'Discord',
            'nav.usfans': 'Claim coupons',
            'gender.men': 'Men',
            'gender.women': 'Women',
            'title.imageSearch': 'Image search — RePluG',
            'vs.heading': 'Search by image',
            'vs.subtitle': 'Upload a photo and find similar products on Weidian, Taobao or 1688.',
            'vs.drop': 'Drop an image here or click to upload',
            'vs.search': 'Search',
            'vs.reset': 'Reset',
            'vs.searching': 'Searching…',
            'vs.empty': 'No matches found in this channel.',
            'vs.error': 'Search failed. Try another image.',
            'vs.needImage': 'Drop an image first.',
            'vs.results': '{n} matches',
            'vs.byImage': 'Search by image',
            'vs.ch.weidian': 'Weidian',
            'vs.ch.taobao': 'Taobao',
            'vs.ch.alibaba': '1688',
            'nav.lang.label': 'Language',
            'nav.cur.label': 'Currency',
            'hero.headline.main': '2900+ products',
            'hero.headline.sub': 'with QC photos',
            'hero.sub': 'Verified replicas from trusted sellers. Always the best batch. Updated catalog with agent links and much more!',
            'hero.cta.badge': '+$800',
            'hero.cta.text': 'in USFans coupons',
            'filter.search': 'Search products, batches...',
            'sort.default': 'Default',
            'sort.priceAsc': 'Price: low to high',
            'sort.priceDesc': 'Price: high to low',
            'sort.nameAsc': 'Name: A–Z',
            'state.errorProducts': 'Failed to load products. Please refresh the page.',
            'state.errorProduct': 'Failed to load product.',
            'state.empty': 'No results. Try a different search or category.',
            'state.errorBack': 'Back to catalog',
            'footer.text': '© 2026 RePluG. For informational purposes only.',
            'tab.all': 'All',
            'results.count': '{n} products',
            'pd.back': '← Back',
            'pd.outOfStock': 'Out of stock',
            'pd.colorVariant': 'Color / Variant',
            'pd.size': 'Size',
            'pd.option': 'Option {n}',
            'pd.buy': 'Buy from agent →',
            'pd.budget': 'Budget version',
            'pd.qc': 'Quality check',
            'pd.shop': 'Shop: {name}',
            'title.catalog': 'Catalog — RePluG',
            'title.home': 'RePluG — Product Catalog',
            'title.product': 'Product — RePluG',
            'title.productNamed': '{name} — RePluG',
            'title.qc': 'Quality check — RePluG',
            'qc.heading': 'Quality check',
            'qc.subtitle': 'Paste any product link to find its QC photos.',
            'qc.placeholder': 'Paste product link (Weidian, Taobao, 1688 or agent link)…',
            'qc.check': 'Check',
            'qc.checking': 'Searching for QC photos…',
            'qc.empty': 'No QC photos found for this product yet.',
            'qc.error': 'Failed to load QC photos. Try another link.',
            'qc.invalid': 'Could not recognize the product link.',
            'qc.results': '{n} QC photos',
            'qc.source': 'Source: {name}',
            'qc.setName': 'QC Photos set #{n}',
            'qc.days': 'days',
            'qc.openUsfans': 'Check on USFans',
            'cart.title': 'Cart — RePluG',
            'cart.nav': 'Cart',
            'cart.heading': 'Cart',
            'cart.empty': 'Your cart is empty.',
            'cart.browse': 'Browse catalog',
            'cart.continue': '← Continue shopping',
            'cart.add': 'Add to cart',
            'cart.added': 'Added to cart',
            'cart.share': 'Copy share link',
            'cart.shared': 'Link copied',
            'cart.copy': 'Copy',
            'cart.copyManual': 'Copy the link manually',
            'cart.clear': 'Clear cart',
            'cart.clearConfirm': 'Clear the cart?',
            'cart.remove': 'Remove',
            'cart.viewing': 'Viewing shared cart',
            'cart.clone': 'Save to my cart',
            'cart.total': 'Subtotal',
            'cart.weight': 'Approx. weight',
            'cart.shipTo': 'Ship to',
            'cart.shipping': 'Shipping (est.)',
            'cart.estimateInfo': 'Values are approximate. The actual weight and shipping cost may differ slightly.',
            'cart.estimateInfoLabel': 'More info about the estimate',
            'cart.cheaper.title': 'Buy cheaper',
            'cart.cheaper.subtitle': 'Save up to 60% on shipping',
            'cart.cheaper.modalTitle': 'How to get a cheaper proxy order',
            'cart.cheaper.step1': 'Join our Discord server.',
            'cart.cheaper.step1Cta': 'Open Discord invite',
            'cart.cheaper.step2': 'DM mmmmmcheesecake with a link to your cart or your question.',
            'cart.cheaper.step2Cta': 'Copy share link to cart',
            'cart.cheaper.step3': 'Settle the details and enjoy a cheaper package — shipping up to 60% off!',
            'cart.cheaper.close': 'Close',
            'cart.grandTotal': 'Grand total (est.)',
            'cart.region.PL': 'Poland',
            'cart.region.EU': 'Other EU',
            'cart.region.UK': 'United Kingdom',
            'cart.region.NA': 'USA / Canada',
            'cart.region.WORLD': 'Rest of world',
            'card.add': '+ Cart',
            'usfansPopup.eyebrow': 'Current promotion',
            'usfansPopup.title': 'Claim +$800 in USFans coupons & 40% off shipping',
            'usfansPopup.body': 'Register an account using our link and unlock free coupons plus a 40% shipping discount on your orders. Or use code "MGRSBE" when signing up.',
            'usfansPopup.cta': 'Claim coupons',
            'usfansPopup.dismiss': 'Maybe later',
            'usfansPopup.close': 'Close',
            'cat.Sneakers': 'Sneakers',
            'cat.Hoodies/Crewnecks': 'Hoodies/Crewnecks',
            'cat.T-shirts': 'T-shirts',
            'cat.Jackets': 'Jackets',
            'cat.Pants': 'Pants',
            'cat.Shorts': 'Shorts',
            'cat.Accesories': 'Accessories',
            'cat.Watches': 'Watches',
            'cat.High-end': 'High-end',
            'cat.Underwear': 'Underwear',
            'cat.Sport Clothing': 'Sports Clothing',
            "cat.Jersey's": 'Jerseys',
            'cat.Football': 'Soccer',
            'cat.Basketball': 'Basketball',
            'cat.Lego': 'Lego',
            'cat.MISC': 'MISC',
            'cat.Vests': 'Vests',
            'cat.Other': 'Other',
            'cat.Shorts/Skirts': 'Shorts/Skirts',
            'cat.Bags': 'Bags',
        },
        pl: {
            'nav.discord': 'Discord',
            'nav.usfans': 'Odbierz kupony',
            'gender.men': 'Męskie',
            'gender.women': 'Damskie',
            'title.imageSearch': 'Wyszukiwanie po zdjęciu — RePluG',
            'vs.heading': 'Wyszukaj po zdjęciu',
            'vs.subtitle': 'Wgraj zdjęcie żeby znaleźć podobne produkty na Weidian, Taobao lub 1688.',
            'vs.drop': 'Upuść zdjęcie tutaj lub kliknij żeby wgrać',
            'vs.search': 'Szukaj',
            'vs.reset': 'Wyczyść',
            'vs.searching': 'Szukam…',
            'vs.empty': 'Brak podobnych produktów w tym kanale.',
            'vs.error': 'Wyszukiwanie nie udało się. Spróbuj innego zdjęcia.',
            'vs.needImage': 'Najpierw wgraj zdjęcie.',
            'vs.results': 'Znaleziono {n} produktów',
            'vs.byImage': 'Szukaj po zdjęciu',
            'vs.ch.weidian': 'Weidian',
            'vs.ch.taobao': 'Taobao',
            'vs.ch.alibaba': '1688',
            'nav.lang.label': 'Język',
            'nav.cur.label': 'Waluta',
            'hero.headline.main': '2900+ produktów',
            'hero.headline.sub': 'ze zdjęciami QC',
            'hero.sub': 'Sprawdzone repliki od zaufanych sellerów. Zawsze najlepszy batch. Aktualizowany katalog z linkami do agentów i wiele więcej!',
            'hero.cta.badge': '+800 USD',
            'hero.cta.text': 'w kuponach USFans',
            'filter.search': 'Szukaj produktów, batchy...',
            'sort.default': 'Domyślnie',
            'sort.priceAsc': 'Cena: od najniższej',
            'sort.priceDesc': 'Cena: od najwyższej',
            'sort.nameAsc': 'Nazwa: A–Z',
            'state.errorProducts': 'Nie udało się załadować produktów. Odśwież stronę.',
            'state.errorProduct': 'Nie udało się załadować produktu.',
            'state.empty': 'Brak wyników. Spróbuj innego wyszukiwania lub kategorii.',
            'state.errorBack': 'Wróć do katalogu',
            'footer.text': '© 2026 RePluG. Wyłącznie w celach informacyjnych.',
            'tab.all': 'Wszystkie',
            'results.count': '{n} produktów',
            'pd.back': '← Wróć',
            'pd.outOfStock': 'Brak w magazynie',
            'pd.colorVariant': 'Kolor / Wariant',
            'pd.size': 'Rozmiar',
            'pd.option': 'Opcja {n}',
            'pd.buy': 'Kup u agenta →',
            'pd.budget': 'Wersja budżetowa',
            'pd.qc': 'Sprawdź jakość',
            'pd.shop': 'Sklep: {name}',
            'title.catalog': 'Katalog — RePluG',
            'title.home': 'RePluG — Katalog produktów',
            'title.product': 'Produkt — RePluG',
            'title.productNamed': '{name} — RePluG',
            'title.qc': 'Sprawdź jakość — RePluG',
            'qc.heading': 'Sprawdź jakość',
            'qc.subtitle': 'Wklej link do produktu, żeby znaleźć zdjęcia QC.',
            'qc.placeholder': 'Wklej link produktu (Weidian, Taobao, 1688 lub link agenta)…',
            'qc.check': 'Sprawdź',
            'qc.checking': 'Szukam zdjęć QC…',
            'qc.empty': 'Brak zdjęć QC dla tego produktu.',
            'qc.error': 'Nie udało się pobrać zdjęć QC. Spróbuj innego linku.',
            'qc.invalid': 'Nie rozpoznano linku produktu.',
            'qc.results': 'Znaleziono {n} zdjęć QC',
            'qc.source': 'Źródło: {name}',
            'qc.setName': 'Zestaw zdjęć QC #{n}',
            'qc.days': 'dni',
            'qc.openUsfans': 'Sprawdź na USFans',
            'cart.title': 'Koszyk — RePluG',
            'cart.nav': 'Koszyk',
            'cart.heading': 'Koszyk',
            'cart.empty': 'Twój koszyk jest pusty.',
            'cart.browse': 'Przeglądaj katalog',
            'cart.continue': '← Wróć do zakupów',
            'cart.add': 'Dodaj do koszyka',
            'cart.added': 'Dodano do koszyka',
            'cart.share': 'Skopiuj link do koszyka',
            'cart.shared': 'Link skopiowany',
            'cart.copy': 'Kopiuj',
            'cart.copyManual': 'Skopiuj link ręcznie',
            'cart.clear': 'Wyczyść koszyk',
            'cart.clearConfirm': 'Wyczyścić koszyk?',
            'cart.remove': 'Usuń',
            'cart.viewing': 'Przeglądasz udostępniony koszyk',
            'cart.clone': 'Zapisz do mojego koszyka',
            'cart.total': 'Suma produktów',
            'cart.weight': 'Przybliżona waga',
            'cart.shipTo': 'Wysyłka do',
            'cart.shipping': 'Dostawa (szacunek)',
            'cart.estimateInfo': 'Wartości są przybliżone. Realna waga oraz koszt dostawy mogą się trochę różnić.',
            'cart.estimateInfoLabel': 'Więcej informacji o szacunku',
            'cart.cheaper.title': 'Kup taniej',
            'cart.cheaper.subtitle': 'Oszczędź nawet 60% na dostawie',
            'cart.cheaper.modalTitle': 'Jak zrobić tańsze proxy',
            'cart.cheaper.step1': 'Dołącz na nasz serwer Discord.',
            'cart.cheaper.step1Cta': 'Otwórz zaproszenie na Discord',
            'cart.cheaper.step2': 'Napisz DM do mmmmmcheesecake z linkiem do swojego koszyka lub pytaniem.',
            'cart.cheaper.step2Cta': 'Skopiuj link do koszyka',
            'cart.cheaper.step3': 'Ustal szczegóły i ciesz się tańszą paczką z przesyłką tańszą nawet o 60%!',
            'cart.cheaper.close': 'Zamknij',
            'cart.grandTotal': 'Łączny koszt (szacunek)',
            'cart.region.PL': 'Polska',
            'cart.region.EU': 'Inne kraje UE',
            'cart.region.UK': 'Wielka Brytania',
            'cart.region.NA': 'USA / Kanada',
            'cart.region.WORLD': 'Reszta świata',
            'card.add': '+ Koszyk',
            'usfansPopup.eyebrow': 'Obecna promocja',
            'usfansPopup.title': 'Odbierz +800 USD w kuponach USFans i 40% zniżki na wysyłkę',
            'usfansPopup.body': 'Załóż konto z naszego linku i odbierz darmowe kupony oraz 40% zniżki na wysyłkę. Lub użyj kodu „MGRSBE" przy rejestracji.',
            'usfansPopup.cta': 'Odbierz kupony',
            'usfansPopup.dismiss': 'Może później',
            'usfansPopup.close': 'Zamknij',
            'cat.Sneakers': 'Buty',
            'cat.Hoodies/Crewnecks': 'Bluzy',
            'cat.T-shirts': 'Koszulki',
            'cat.Jackets': 'Kurtki',
            'cat.Pants': 'Spodnie',
            'cat.Shorts': 'Spodenki',
            'cat.Accesories': 'Akcesoria',
            'cat.Watches': 'Zegarki',
            'cat.High-end': 'High-end',
            'cat.Underwear': 'Bielizna',
            'cat.Sport Clothing': 'Odzież sportowa',
            "cat.Jersey's": 'Stroje sportowe',
            'cat.Football': 'Piłka nożna',
            'cat.Basketball': 'Koszykówka',
            'cat.Lego': 'Lego',
            'cat.MISC': 'Różne',
            'cat.Vests': 'Kamizelki',
            'cat.Other': 'Inne',
            'cat.Shorts/Skirts': 'Spodenki/Spódnice',
            'cat.Bags': 'Torebki',
        },
    };

    const listeners = [];

    function getLang() {
        const v = localStorage.getItem(KEY);
        return LANGS.includes(v) ? v : DEFAULT;
    }

    function setLang(l) {
        if (!LANGS.includes(l)) return;
        localStorage.setItem(KEY, l);
        applyAll();
        notify(l);
    }

    function onChange(fn) { listeners.push(fn); }

    function notify(l) {
        listeners.forEach(fn => { try { fn(l); } catch (e) { console.warn(e); } });
    }

    function t(key, vars) {
        const lang = getLang();
        let s = (DICT[lang] && DICT[lang][key]) || (DICT[DEFAULT] && DICT[DEFAULT][key]) || key;
        if (vars) {
            Object.keys(vars).forEach(k => {
                s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
            });
        }
        return s;
    }

    function applyAll() {
        const lang = getLang();
        document.documentElement.setAttribute('lang', lang);

        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            el.innerHTML = t(el.getAttribute('data-i18n-html'));
        });
        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const spec = el.getAttribute('data-i18n-attr');
            spec.split(',').forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (attr && key) el.setAttribute(attr, t(key));
            });
        });
        const titleEl = document.querySelector('title[data-i18n-title]');
        if (titleEl) document.title = t(titleEl.getAttribute('data-i18n-title'));

        const sel = document.getElementById('langSelect');
        if (sel) sel.value = lang;
    }

    function initPicker() {
        const nav = document.querySelector('.nav-right');
        if (!nav || document.getElementById('langSelect')) return;
        const sel = document.createElement('select');
        sel.id = 'langSelect';
        sel.className = 'lang-select';
        sel.setAttribute('aria-label', t('nav.lang.label'));
        [['en', 'EN'], ['pl', 'PL']].forEach(([v, label]) => {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = label;
            sel.appendChild(o);
        });
        sel.value = getLang();
        sel.addEventListener('change', () => setLang(sel.value));
        nav.insertBefore(sel, nav.firstChild);
    }

    window.RePluGI18n = { t, current: getLang, set: setLang, onChange, apply: applyAll };

    function boot() {
        initPicker();
        applyAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
