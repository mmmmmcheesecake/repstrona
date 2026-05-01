const SHEET_ID = '1pc2KcMDWELMeQUW_ZvjHEvDa56inb3IcoHJ9STyGVkk';

export async function onRequest(ctx) {
    const apiKey = ctx.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return new Response('Brak GOOGLE_API_KEY w env', { status: 500 });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}` +
        `?fields=sheets.data.rowData.values(formattedValue,hyperlink)` +
        `&includeGridData=true&key=${apiKey}`;

    const r = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) {
        return new Response(`Sheets API error: ${r.status}`, { status: 502 });
    }
    const json = await r.json();

    const rows = json?.sheets?.[0]?.data?.[0]?.rowData ?? [];
    const products = [];
    let isHeader = true;

    for (const row of rows) {
        const cells = row.values ?? [];
        if (isHeader) { isHeader = false; continue; }
        const get = (i) => cells[i] || {};
        const name = (get(0).formattedValue || '').trim();
        if (!name) continue;

        const link = get(2).hyperlink || null;
        if (!link) continue;

        products.push({
            name,
            batch:       (get(1).formattedValue || '').trim(),
            link,
            price:       (get(3).formattedValue || '').trim(),
            image:       get(4).hyperlink || (get(4).formattedValue || '').trim() || '',
            description: (get(5).formattedValue || '').trim(),
            budgetLink:  get(6).hyperlink || null,
        });
    }

    return new Response(JSON.stringify(products), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
        }
    });
}
