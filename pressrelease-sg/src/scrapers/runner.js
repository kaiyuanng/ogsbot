require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const axios   = require('axios');
const { insertArticle, updateRewritten, getByUrl } = require('../db');
const { rewrite } = require('../rewriter');

const SOURCES = [
  require('./sources/mas'),
  require('./sources/moh'),
  require('./sources/mom'),
  require('./sources/hdb'),
  require('./sources/nea'),
  require('./sources/dbs'),
  require('./sources/ocbc'),
  require('./sources/singtel'),
  require('./sources/grab'),
  require('./sources/capitaland'),
];

const http = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-SG,en;q=0.9',
    'Cache-Control': 'no-cache',
  },
});

async function runSource({ scrape, SOURCE }) {
  console.log(`[runner] Scraping ${SOURCE.name}...`);
  try {
    const items = await scrape(http);
    console.log(`[runner] ${SOURCE.name}: got ${items.length} items`);
    let saved = 0;

    for (const item of items) {
      if (!item.title || !item.url) continue;

      const existing = getByUrl(item.url);
      if (existing && existing.ai_rewritten) continue;

      const row = {
        source_url:   item.url,
        source_name:  item.source_name || SOURCE.name,
        source_type:  item.source_type || SOURCE.type,
        category:     item.category    || SOURCE.category || 'General',
        title:        item.title,
        lede:         null,
        body:         null,
        raw_content:  item.raw_content || item.title,
        tags:         null,
        published_at: item.published_at || new Date().toISOString(),
        ai_rewritten: 0,
      };

      if (!existing) insertArticle(row);

      // AI rewrite
      if (process.env.ANTHROPIC_API_KEY && process.env.AI_REWRITE !== 'false') {
        await new Promise(r => setTimeout(r, 500)); // rate limit
        const rewritten = await rewrite(item.raw_content || item.title, SOURCE.name);
        if (rewritten) {
          updateRewritten({
            source_url: item.url,
            title:    rewritten.headline || item.title,
            lede:     rewritten.lede     || null,
            body:     rewritten.body     || null,
            tags:     rewritten.tags ? JSON.stringify(rewritten.tags) : null,
            category: rewritten.category || row.category,
          });
          saved++;
        }
      } else {
        saved++;
      }
    }
    console.log(`[runner] ${SOURCE.name}: saved/updated ${saved}`);
  } catch (err) {
    console.error(`[runner] ${SOURCE.name} FAILED:`, err.message);
  }
}

async function runAll() {
  console.log('[runner] Starting scrape run...');
  for (const source of SOURCES) {
    await runSource(source);
    await new Promise(r => setTimeout(r, 1000)); // polite delay between sources
  }
  console.log('[runner] Done.');
}

module.exports = { runAll };

if (require.main === module) {
  runAll().catch(console.error);
}
