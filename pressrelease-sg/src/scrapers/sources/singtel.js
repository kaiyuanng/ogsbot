const cheerio = require('cheerio');
const RSSParser = require('rss-parser');

const SOURCE = { name: 'Singtel', full: 'Singapore Telecommunications', type: 'corporate', category: 'Telco' };
const RSS_URL  = 'https://www.singtel.com/rss/media-releases.rss';
const HTML_URL = 'https://www.singtel.com/about-singtel/media-centre/media-releases';
const parser   = new RSSParser({ timeout: 10000 });

async function scrape(http) {
  // Try RSS first
  try {
    const feed = await parser.parseURL(RSS_URL);
    if (feed.items.length) {
      return feed.items.slice(0, 10).map(item => ({
        ...SOURCE,
        title:        item.title || '',
        url:          item.link  || item.guid || '',
        raw_content:  item.contentSnippet || item.title || '',
        published_at: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
      })).filter(i => i.title && i.url);
    }
  } catch (_) { /* fall through to HTML */ }

  const { data } = await http.get(HTML_URL);
  const $ = cheerio.load(data);
  const items = [];

  $('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (!href.includes('/media-') && !href.includes('/press-')) return;
    const title = $el.text().trim() || $el.find('h3,h4,[class*="title"]').text().trim();
    if (!title || title.length < 20) return;
    const url = href.startsWith('http') ? href : `https://www.singtel.com${href}`;
    const dateText = $el.closest('[class*="item"],li,article')
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
