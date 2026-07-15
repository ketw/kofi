/* ── src/db.js — SQLite database: init, helpers, migrations, uid gen ────────
──────────────────────────────────────────────────────────────────────────── */

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'chat.db');

let db; // sql.js Database instance

// ── Init ───────────────────────────────────────────────────────────────────
async function initDB() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  // ── Core schema ──────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      uid           TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar        TEXT,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_names (
      user_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, name),
      UNIQUE (name)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      user_name  TEXT NOT NULL,
      type       TEXT NOT NULL,
      content    TEXT NOT NULL,
      file_meta  TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS file_saves (
      file_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      saved_at   INTEGER NOT NULL,
      PRIMARY KEY (file_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS server_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // ── Migrations (safe to re-run on every start) ───────────────────────────
  const userCols = dbAll('PRAGMA table_info(users)').map(c => c.name);

  if (!userCols.includes('avatar')) {
    db.run('ALTER TABLE users ADD COLUMN avatar TEXT');
    console.log('  migration: added users.avatar');
  }

  if (!userCols.includes('uid')) {
    db.run('ALTER TABLE users ADD COLUMN uid TEXT');
    const rows = dbAll('SELECT id FROM users WHERE uid IS NULL');
    for (const r of rows) {
      db.run('UPDATE users SET uid = ? WHERE id = ?', [genUid(), r.id]);
    }
    try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uid ON users(uid)'); } catch {}
    console.log(`  migration: added users.uid, back-filled ${rows.length} row(s)`);
  }

  if (!userCols.includes('password_hash')) {
    db.run('ALTER TABLE users ADD COLUMN password_hash TEXT');
    console.log('  migration: added users.password_hash');
  }

  // Populate user_names from users table (idempotent)
  for (const u of dbAll('SELECT id, name, created_at FROM users')) {
    db.run(
      'INSERT OR IGNORE INTO user_names (user_id, name, claimed_at) VALUES (?, ?, ?)',
      [u.id, u.name, u.created_at]
    );
  }

  // ── Auto-persist: write to disk every 5 s when dirty ────────────────────
  let dirty = false;
  const origRun = db.run.bind(db);
  db.run = (...args) => { dirty = true; return origRun(...args); };

  setInterval(() => {
    if (dirty) { dirty = false; fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
  }, 5000);

  const flush = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  process.on('exit',   flush);
  process.on('SIGINT',  () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

// ── Query helpers ──────────────────────────────────────────────────────────
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  return dbAll(sql, params)[0] || null;
}

function dbRun(sql, params = []) {
  return db.run(sql, params);
}

// ── UID generator — short 4-char hex, collision-checked ───────────────────
function genUid() {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const uid = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    if (!dbGet('SELECT 1 FROM users WHERE uid = ?', [uid])) return uid;
  }
  // Fallback to 8-char if somehow pool exhausted
  return Math.random().toString(16).slice(2, 10);
}

module.exports = { initDB, dbAll, dbGet, dbRun, genUid };
