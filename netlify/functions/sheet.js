const https = require('https');

const SHEET_ID = '1pc2KcMDWELMeQUW_ZvjHEvDa56inb3IcoHJ9STyGVkk';

function get(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 6) return reject(new Error('Too many redirects'));
        https.get(url, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(get(res.headers.location, redirects + 1));
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
    });
}

exports.handler = async () => {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
        const { status, body } = await get(url);

        if (status !== 200 || body.trim().startsWith('<')) {
            return { statusCode: 502, body: 'Arkusz niedostępny lub niepubliczny' };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=120'
            },
            body
        };
    } catch (e) {
        return { statusCode: 500, body: e.message };
    }
};
