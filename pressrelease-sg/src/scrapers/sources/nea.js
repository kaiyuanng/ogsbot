const RSSParser = require('rss-parser');

const SOURCE = { name: 'NEA', full: 'National Environment Agency', type: 'government', category: 'Environment' };

// NEA provides a confirmed RSS feed
const RSS_URLS = [
  'https://www.nea.gov.sg/rss/media-releases-rss',
  'https://www.nea.gov.sg/rss/news-rss',
];

const parser = new RSSParser({ timeout: 10000 });

async function scrape() {
  for (const url of RSS_URLS) {
    try {
      const feed = await parser.parseURL(url);
      return feed.items.slice(0, 10).map(item => ({
        ...SOURCE,
        title:        item.title || '',
        url:          item.link  || item.guid || '',
        raw_content:  item.contentSnippet || item.content || item.title || '',
        published_at: item.isoDate || item.pubDate
          ? new Date(item.isoDate || item.pubDate).toISOString()
          : new Date().toISOString(),
      })).filter(i => i.title && i.url);
    } catch (_) { /* try next */ }
  }
  return [];
}

module.exports = { scrape, SOURCE };
