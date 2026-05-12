export async function onRequest(ctx) {
    try {
        const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=PLN,EUR,GBP,CNY', {
            cf: { cacheTtl: 86400, cacheEverything: true }
        });
        if (!r.ok) throw new Error('upstream');
        const j = await r.json();
        const out = {
            base: 'USD',
            rates: { USD: 1, ...(j.rates || {}) },
            date: j.date || null,
        };
        return new Response(JSON.stringify(out), {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400',
                'X-Content-Type-Options': 'nosniff',
            }
        });
    } catch {
        return new Response(JSON.stringify({
            base: 'USD',
            rates: { USD: 1, PLN: 4.0, EUR: 0.92, GBP: 0.79, CNY: 7.2 },
            date: 'fallback',
        }), {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
            }
        });
    }
}
