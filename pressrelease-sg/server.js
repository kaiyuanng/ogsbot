require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const path    = require('path');
const { getArticles, getArticle, countArticles, db } = require('./src/db');
const { runAll } = require('./src/scrapers/runner');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API ──────────────────────────────────────────────────────────────────────

app.get('/api/articles', (req, res) => {
  const { category, type, source, limit = 50, offset = 0 } = req.query;
  const articles = getArticles({
    category,
    source_type: type,
    source_name: source,
    limit:  Math.min(parseInt(limit),  100),
    offset: Math.max(parseInt(offset), 0),
  });
  res.json({ articles, total: countArticles() });
});

app.get('/api/articles/:id', (req, res) => {
  const article = getArticle(parseInt(req.params.id));
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json(article);
});

app.get('/api/sources', (req, res) => {
  const sources = db.prepare(`
    SELECT source_name, source_type, category, COUNT(*) as count,
           MAX(published_at) as latest
    FROM articles
    GROUP BY source_name
    ORDER BY count DESC
  `).all();
  res.json(sources);
});

app.get('/api/categories', (req, res) => {
  const cats = db.prepare(`
    SELECT category, COUNT(*) as count FROM articles GROUP BY category ORDER BY count DESC
  `).all();
  res.json(cats);
});

app.get('/api/stats', (req, res) => {
  const stats = {
    total:      countArticles(),
    today:      db.prepare("SELECT COUNT(*) as n FROM articles WHERE date(published_at)=date('now')").get().n,
    government: db.prepare("SELECT COUNT(*) as n FROM articles WHERE source_type='government'").get().n,
    corporate:  db.prepare("SELECT COUNT(*) as n FROM articles WHERE source_type='corporate'").get().n,
    rewritten:  db.prepare("SELECT COUNT(*) as n FROM articles WHERE ai_rewritten=1").get().n,
  };
  res.json(stats);
});

// Trigger manual scrape (for dev)
app.post('/api/scrape', async (req, res) => {
  res.json({ message: 'Scrape started' });
  runAll().catch(console.error);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── SCHEDULER ────────────────────────────────────────────────────────────────

// Scrape every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('[cron] Running scheduled scrape...');
  runAll().catch(console.error);
});

// ── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`pressrelease.sg running on http://localhost:${PORT}`);
  console.log(`AI rewriting: ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled (no API key)'}`);

  // Run initial scrape on startup
  console.log('[startup] Running initial scrape...');
  runAll().catch(console.error);
});
