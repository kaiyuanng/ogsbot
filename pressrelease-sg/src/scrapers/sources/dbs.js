const cheerio = require('cheerio');

const SOURCE = { name: 'DBS Bank', full: 'DBS Bank', type: 'corporate', category: 'Banking' };
const URL = 'https://www.dbs.com/newsroom/index.html';

async function scrape(http) {
  const { data } = await http.get(URL);
  const $ = cheerio.load(data);
  const items = [];

  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/newsroom/') || href === URL || href.endsWith('/newsroom/')) return;
    const title = $el.text().trim() || $el.find('h2,h3,h4,[class*="title"]').first().text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.dbs.com${href}`;
    const dateText = $el.closest('[class*="item"],[class*="card"],article,li')
      .find('time,[class*="date"]').first().text().trim();
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
