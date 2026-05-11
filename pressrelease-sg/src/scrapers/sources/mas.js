const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE = { name: 'MAS', full: 'Monetary Authority of Singapore', type: 'government', category: 'Economy' };
const BASE = 'https://www.mas.gov.sg';

async function scrape(http) {
  const { data } = await http.get(`${BASE}/news`);
  const $ = cheerio.load(data);
  const items = [];

  // MAS news listing — each item in .list-news or .news-card
  $('a[href*="/news/"], a[href*="/publications/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const title = $el.text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `${BASE}${href}`;
    const dateText = $el.closest('[class*="item"], [class*="card"], li, tr')
      .find('time, [class*="date"]').first().text().trim();
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
