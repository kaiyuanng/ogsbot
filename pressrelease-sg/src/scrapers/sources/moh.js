const cheerio = require('cheerio');

const SOURCE = { name: 'MOH', full: 'Ministry of Health', type: 'government', category: 'Health' };
const URL = 'https://www.moh.gov.sg/news-highlights';

async function scrape(http) {
  const { data } = await http.get(URL);
  const $ = cheerio.load(data);
  const items = [];

  // MOH uses a list of news items
  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/news-highlights/details/') && !href.includes('/news/')) return;
    const title = $el.text().trim() || $el.find('h2,h3,h4,.title').text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.moh.gov.sg${href}`;
    const dateText = $el.closest('li, article, [class*="item"]').find('time, [class*="date"], span').first().text().trim();
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
