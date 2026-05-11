const cheerio = require('cheerio');

const SOURCE = { name: 'MOM', full: 'Ministry of Manpower', type: 'government', category: 'Jobs' };
const URL = 'https://www.mom.gov.sg/newsroom/press-releases';

async function scrape(http) {
  const { data } = await http.get(URL);
  const $ = cheerio.load(data);
  const items = [];

  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/press-release') && !href.includes('/newsroom/')) return;
    const title = $el.text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.mom.gov.sg${href}`;
    const parent = $el.closest('li, article, tr, [class*="item"]');
    const dateText = parent.find('time, [class*="date"]').first().text().trim()
      || parent.children('span, td').last().text().trim();
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
