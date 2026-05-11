const cheerio = require('cheerio');

const SOURCE = { name: 'Grab', full: 'Grab Holdings', type: 'corporate', category: 'Tech & Digital' };
const URL = 'https://www.grab.com/sg/press/';

async function scrape(http) {
  const { data } = await http.get(URL);
  const $ = cheerio.load(data);
  const items = [];

  $('article, [class*="post"], [class*="press"]').each((_, el) => {
    const $el = $(el);
    const $a  = $el.find('a[href]').first();
    const href  = $a.attr('href') || '';
    const title = $el.find('h2,h3,h4,[class*="title"]').first().text().trim()
      || $a.text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.grab.com${href}`;
    const dateText = $el.find('time,[class*="date"],[class*="time"]').first().text().trim();
    if (items.find(i => i.url === url)) return;
    items.push({ ...SOURCE, title, url, raw_content: title, published_at: parseDate(dateText) });
  });

  // fallback: scrape plain links
  if (!items.length) {
    $('a[href*="/press/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      if (href === URL || href.endsWith('/press/')) return;
      const title = $el.text().trim();
      if (!title || title.length < 20) return;
      const url = href.startsWith('http') ? href : `https://www.grab.com${href}`;
      if (items.find(i => i.url === url)) return;
      items.push({ ...SOURCE, title, url, raw_content: title, published_at: new Date().toISOString() });
    });
  }

  return items.slice(0, 10);
}

function parseDate(text) {
  if (!text) return new Date().toISOString();
  const d = new Date(text);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

module.exports = { scrape, SOURCE };
