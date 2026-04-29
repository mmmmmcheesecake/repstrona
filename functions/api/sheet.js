const SHEET_ID = '1pc2KcMDWELMeQUW_ZvjHEvDa56inb3IcoHJ9STyGVkk';

export async function onRequest() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

    const res = await fetch(url, { redirect: 'follow' });
    const body = await res.text();

    if (!res.ok || body.trim().startsWith('<')) {
        return new Response('Arkusz niedostępny lub niepubliczny', { status: 502 });
    }

    return new Response(body, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=120',
        }
    });
}
