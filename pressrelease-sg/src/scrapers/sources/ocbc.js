const cheerio = require('cheerio');

const SOURCE = { name: 'OCBC Bank', full: 'OCBC Bank', type: 'corporate', category: 'Banking' };
const URL = 'https://www.ocbc.com/group/media/media-releases.page';

async function scrape(http) {
  const { data } = await http.get(URL);
  const $ = cheerio.load(data);
  const items = [];

  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/group/media/') && !href.includes('media-release')) return;
    if (href.endsWith('media-releases.page')) return;
    const title = $el.text().trim() || $el.find('[class*="title"],h3,h4').text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.ocbc.com${href}`;
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
