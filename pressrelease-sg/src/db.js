const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'pressrelease.db');

require('fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url  TEXT UNIQUE NOT NULL,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('government','corporate')),
    category    TEXT NOT NULL DEFAULT 'General',
    title       TEXT NOT NULL,
    lede        TEXT,
    body        TEXT,
    raw_content TEXT,
    tags        TEXT,
    published_at TEXT NOT NULL,
    scraped_at  TEXT NOT NULL DEFAULT (datetime('now')),
    ai_rewritten INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_articles_source    ON articles(source_name);
  CREATE INDEX IF NOT EXISTS idx_articles_category  ON articles(category);
  CREATE INDEX IF NOT EXISTS idx_articles_type      ON articles(source_type);
`);

const insert = db.prepare(`
  INSERT OR IGNORE INTO articles
    (source_url, source_name, source_type, category, title, lede, body, raw_content, tags, published_at, ai_rewritten)
  VALUES
    (@source_url, @source_name, @source_type, @category, @title, @lede, @body, @raw_content, @tags, @published_at, @ai_rewritten)
`);

const update = db.prepare(`
  UPDATE articles SET title=@title, lede=@lede, body=@body, tags=@tags, category=@category, ai_rewritten=1
  WHERE source_url=@source_url
`);

module.exports = {
  db,
  insertArticle: (article) => insert.run(article),
  updateRewritten: (article) => update.run(article),
  getArticles: (opts = {}) => {
    const { category, source_type, source_name, limit = 50, offset = 0 } = opts;
    let q = 'SELECT * FROM articles WHERE 1=1';
    const params = [];
    if (category)    { q += ' AND category=?';    params.push(category); }
    if (source_type) { q += ' AND source_type=?'; params.push(source_type); }
    if (source_name) { q += ' AND source_name=?'; params.push(source_name); }
    q += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return db.prepare(q).all(...params);
  },
  getArticle: (id) => db.prepare('SELECT * FROM articles WHERE id=?').get(id),
  countArticles: () => db.prepare('SELECT COUNT(*) as n FROM articles').get().n,
  getByUrl: (url) => db.prepare('SELECT * FROM articles WHERE source_url=?').get(url),
};
