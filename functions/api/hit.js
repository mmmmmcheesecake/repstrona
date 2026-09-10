// One row per thing worth counting, and nothing that says who did it.
//
// What goes in: what kind of event it was, what it was about, and the day. No cookie
// is set, no identifier is stored, and the visitor's address never leaves the edge —
// two events from one person are indistinguishable from two people, which is the
// point. Country comes from Cloudflare's own edge header and is no narrower than the
// country, so there is nothing here to consent to and no banner to show.
//
// Nothing reads this back over HTTP. There is deliberately no /api/stats to find:
// the numbers leave the database through wrangler, on the owner's machine, and an
// endpoint that does not exist cannot be guessed, scraped or leaked.

const KINDS = new Set(['page', 'product', 'agent', 'coupon', 'discord', 'search', 'filter']);

// The table is created on the first request an isolate serves rather than by hand, so
// binding the database is the only setup step. IF NOT EXISTS makes the repeat free.
let schemaReady = false;

async function ensureSchema(db) {
    if (schemaReady) return;
    await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            day TEXT NOT NULL,
            kind TEXT NOT NULL,
            label TEXT,
            category TEXT,
            seller TEXT,
            country TEXT,
            num INTEGER
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_events_day_kind ON events(day, kind)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_events_kind_label ON events(kind, label)'),
        // What a search returned is the whole point of recording searches, so the
        // question "which searches came back empty" gets its own index.
        db.prepare('CREATE INDEX IF NOT EXISTS idx_events_search_num ON events(kind, num)'),
    ]);
    schemaReady = true;
}

// Anything not sent by the site itself is noise. This is not a security boundary —
// a header is trivially forged — it only keeps stray crawlers out of the numbers.
function fromThisSite(request) {
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    const host = new URL(request.url).hostname;
    for (const v of [origin, referer]) {
        if (!v) continue;
        try { if (new URL(v).hostname === host) return true; } catch {}
    }
    return false;
}

function clean(v, max) {
    return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// Always 204, whatever happened. A counter that reports its own failures tells a
// visitor something about the site's insides and gains the owner nothing — the
// numbers are read directly, where a gap is visible anyway.
const noContent = () => new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
});

// One handler for every method rather than onRequestPost plus an onRequest catch-all:
// two exports leave which one wins up to the runtime, and a counter that silently 405s
// every POST would look exactly like a site nobody visits.
export async function onRequest(ctx) {
    const { request, env } = ctx;
    if (request.method !== 'POST') {
        return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }
    if (!env?.STATS) return noContent();
    if (!fromThisSite(request)) return noContent();

    let body;
    try { body = await request.json(); } catch { return noContent(); }

    const kind = clean(body?.kind, 20);
    if (!KINDS.has(kind)) return noContent();

    const now = new Date();
    try {
        await ensureSchema(env.STATS);
        await env.STATS.prepare(
            'INSERT INTO events (ts, day, kind, label, category, seller, country, num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            now.getTime(),
            now.toISOString().slice(0, 10),
            kind,
            clean(body?.label, 200),
            clean(body?.category, 60),
            clean(body?.seller, 80),
            clean(request.cf?.country, 8),
            Number.isFinite(body?.num) ? Math.max(0, Math.min(1e6, Math.trunc(body.num))) : null
        ).run();
    } catch {
        // A missing table, a full database, a bad day at D1 — none of it is worth
        // failing a page over. The visit still happened; only the record of it is lost.
    }
    return noContent();
}
