const cheerio = require('cheerio');

const SOURCE = { name: 'CapitaLand', full: 'CapitaLand Group', type: 'corporate', category: 'Property' };
const URL = 'https://www.capitaland.com/international/en/about-capitaland/newsroom/news-releases.html';

async function scrape(http) {
  const { data } = await http.get(URL);
  const $ = cheerio.load(data);
  const items = [];

  $('a').each((_, el) => {
    const $el  = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/newsroom/news-releases/') && !href.includes('/news-releases/')) return;
    if (href.endsWith('/news-releases.html') || href.endsWith('/news-releases/')) return;
    const title = $el.text().trim() || $el.find('h3,h4,[class*="title"]').text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.capitaland.com${href}`;
    const dateText = $el.closest('[class*="item"],li,article')
      .find('time,[class*="date"],span').first().text().trim();
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
