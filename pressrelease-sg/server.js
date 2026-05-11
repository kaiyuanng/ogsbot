require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const path    = require('path');
const {
  getArticles, getArticle, countArticles, db,
  deleteArticle, updateArticle,
  getSponsored, insertSponsored, updateSponsored, deleteSponsored,
} = require('./src/db');
const { runAll } = require('./src/scrapers/runner');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── ADMIN AUTH ────────────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const pw = process.env.ADMIN_PASSWORD || 'admin';
  const auth = req.headers.authorization || '';
  const b64  = Buffer.from(auth.replace('Basic ', ''), 'base64').toString();
  const [, pass] = b64.split(':');
  if (pass === pw) return next();
  res.set('WWW-Authenticate', 'Basic realm="pressrelease.sg admin"');
  res.status(401).json({ error: 'Unauthorized' });
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

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

// Active sponsored listings (public — shown in frontend)
app.get('/api/sponsored', (req, res) => {
  const active = db.prepare(`
    SELECT * FROM sponsored_listings
    WHERE status='active'
      AND (starts_at IS NULL OR starts_at <= datetime('now'))
      AND (ends_at   IS NULL OR ends_at   >= datetime('now'))
    ORDER BY created_at DESC
  `).all();
  res.json(active);
});

// ── ADMIN API (password-protected) ───────────────────────────────────────────

// Scrape trigger
let scrapeRunning = false;
const scrapeLog   = [];

app.post('/api/admin/scrape', adminAuth, async (req, res) => {
  if (scrapeRunning) return res.json({ message: 'Already running' });
  scrapeRunning = true;
  scrapeLog.length = 0;
  res.json({ message: 'Scrape started' });

  const origLog   = console.log.bind(console);
  const origError = console.error.bind(console);
  console.log   = (...a) => { origLog(...a);   scrapeLog.push({ level: 'info',  msg: a.join(' ') }); };
  console.error = (...a) => { origError(...a); scrapeLog.push({ level: 'error', msg: a.join(' ') }); };

  try {
    await runAll();
  } finally {
    scrapeRunning = false;
    console.log   = origLog;
    console.error = origError;
  }
});

app.get('/api/admin/scrape/log', adminAuth, (req, res) => {
  res.json({ running: scrapeRunning, log: scrapeLog.slice(-200) });
});

// Articles CRUD
app.get('/api/admin/articles', adminAuth, (req, res) => {
  const { limit = 50, offset = 0, q } = req.query;
  let query = 'SELECT * FROM articles WHERE 1=1';
  const params = [];
  if (q) { query += ' AND (title LIKE ? OR source_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(parseInt(limit), 200), Math.max(parseInt(offset), 0));
  const articles = db.prepare(query).all(...params);
  const total    = db.prepare('SELECT COUNT(*) as n FROM articles').get().n;
  res.json({ articles, total });
});

app.patch('/api/admin/articles/:id', adminAuth, (req, res) => {
  updateArticle(parseInt(req.params.id), req.body);
  res.json({ ok: true });
});

app.delete('/api/admin/articles/:id', adminAuth, (req, res) => {
  deleteArticle(parseInt(req.params.id));
  res.json({ ok: true });
});

// Sponsored listings CRUD
app.get('/api/admin/sponsored', adminAuth, (req, res) => {
  res.json(getSponsored());
});

app.post('/api/admin/sponsored', adminAuth, (req, res) => {
  const { company, contact, headline, body, cta_text = 'Learn More', cta_url, tier = 'sponsored', status = 'pending', starts_at, ends_at } = req.body;
  if (!company || !headline || !cta_url) return res.status(400).json({ error: 'Missing required fields' });
  const result = insertSponsored({ company, contact: contact || '', headline, body: body || '', cta_text, cta_url, tier, status, starts_at: starts_at || null, ends_at: ends_at || null });
  res.json({ id: result.lastInsertRowid });
});

app.patch('/api/admin/sponsored/:id', adminAuth, (req, res) => {
  updateSponsored(parseInt(req.params.id), req.body);
  res.json({ ok: true });
});

app.delete('/api/admin/sponsored/:id', adminAuth, (req, res) => {
  deleteSponsored(parseInt(req.params.id));
  res.json({ ok: true });
});

// ── ADMIN UI ──────────────────────────────────────────────────────────────────

app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── SCHEDULER ────────────────────────────────────────────────────────────────

cron.schedule('*/15 * * * *', () => {
  console.log('[cron] Running scheduled scrape...');
  runAll().catch(console.error);
});

// ── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`pressrelease.sg running on http://localhost:${PORT}`);
  console.log(`AI rewriting: ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled (no API key)'}`);
  console.log(`Admin: http://localhost:${PORT}/admin  (password: ${process.env.ADMIN_PASSWORD ? '****' : 'admin'})`);
  console.log('[startup] Running initial scrape...');
  runAll().catch(console.error);
});
