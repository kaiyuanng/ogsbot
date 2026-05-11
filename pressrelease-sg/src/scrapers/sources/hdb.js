const cheerio = require('cheerio');

const SOURCE = { name: 'HDB', full: 'Housing & Development Board', type: 'government', category: 'Housing' };
const URL = 'https://www.hdb.gov.sg/about-us/news-and-publications/press-releases';

async function scrape(http) {
  const { data } = await http.get(URL);
  const $ = cheerio.load(data);
  const items = [];

  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/press-releases/') && !href.includes('/press-release/')) return;
    if (href === URL || href.endsWith('/press-releases')) return;
    const title = $el.text().trim() || $el.attr('title') || '';
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.hdb.gov.sg${href}`;
    const dateText = $el.closest('li, article, [class*="item"], tr')
      .find('time, [class*="date"], span').first().text().trim();
    if (items.find(i => i.url === url)) return;
    items.push({ ...SOURCE, title, url, raw_content: title, published_at: parseDate(dateText) });
  });

  return items.slice(0, 10);
}

function parseDate(text) {
  if (!text) return new Date().toISOString();
  const d = new Date(text);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

module.exports = { scrape, SOURCE };
