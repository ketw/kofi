const express  = require('express');
const http     = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const os       = require('os');
const fs       = require('fs');

// ── Setup ──────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Cookie helpers ─────────────────────────────────────────────────────────
// Minimal cookie parser — no dependency needed
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(s => {
    const [k, ...v] = s.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }).filter(([k]) => k));
}

function setSessionCookie(res, token) {
  // HttpOnly prevents JS access; SameSite=Strict prevents CSRF
  res.setHeader('Set-Cookie',
    `kofi_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `kofi_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

// ── Session token generator ────────────────────────────────────────────────
function genToken() {
  // 32 random bytes → 64-char hex
  const bytes = new Uint8Array(32);
  crypto.getRandomValues ? crypto.getRandomValues(bytes)
    : require('crypto').randomFillSync(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
const nodeCrypto = require('crypto');
function genTokenNode() {
  return nodeCrypto.randomBytes(32).toString('hex');
}

// ── Database ───────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'chat.db');
let db;

async function initDB() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  // Core tables
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
  `);

  // ── Migrations (safe to re-run on every start) ─────────────────────────
  const userCols = dbAll('PRAGMA table_info(users)').map(c => c.name);

  if (!userCols.includes('avatar')) {
    db.run('ALTER TABLE users ADD COLUMN avatar TEXT');
    console.log('  migration: added users.avatar');
  }
  if (!userCols.includes('uid')) {
    db.run('ALTER TABLE users ADD COLUMN uid TEXT');
    // Back-fill uid for existing accounts
    const rows = dbAll('SELECT id FROM users WHERE uid IS NULL');
    for (const r of rows) {
      db.run('UPDATE users SET uid = ? WHERE id = ?', [genUid(), r.id]);
    }
    // Now add the unique index — SQLite can't enforce NOT NULL retroactively
    // but every row now has a value so this is safe
    try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uid ON users(uid)'); } catch {}
    console.log(`  migration: added users.uid, back-filled ${rows.length} row(s)`);
  }
  if (!userCols.includes('password_hash')) {
    db.run('ALTER TABLE users ADD COLUMN password_hash TEXT');
    // Existing accounts get no password — they'll be prompted to set one on next login
    console.log('  migration: added users.password_hash');
  }

  // Populate user_names from users (idempotent)
  for (const u of dbAll('SELECT id, name, created_at FROM users')) {
    db.run('INSERT OR IGNORE INTO user_names (user_id, name, claimed_at) VALUES (?, ?, ?)',
      [u.id, u.name, u.created_at]);
  }

  // Persist to disk
  let dirty = false;
  const origRun = db.run.bind(db);
  db.run = (...args) => { dirty = true; return origRun(...args); };
  setInterval(() => {
    if (dirty) { dirty = false; fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
  }, 5000);
  process.on('exit', () => fs.writeFileSync(DB_PATH, Buffer.from(db.export())));
  process.on('SIGINT',  () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

// ── DB helpers ─────────────────────────────────────────────────────────────
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function dbGet(sql, params = []) { return dbAll(sql, params)[0] || null; }

// ── UID generator — short 4-char hex, collision-checked ───────────────────
function genUid() {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const uid = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    if (!dbGet('SELECT 1 FROM users WHERE uid = ?', [uid])) return uid;
  }
  // Fallback to 8-char if somehow exhausted (won't happen in practice)
  return Math.random().toString(16).slice(2, 10);
}

// ── File registry ──────────────────────────────────────────────────────────
const fileRegistry = new Map();

function loadFileRegistry() {
  const rows = dbAll(`SELECT file_meta, user_id FROM messages WHERE type='file' AND file_meta IS NOT NULL`);
  for (const row of rows) {
    try {
      const m = JSON.parse(row.file_meta);
      if (m.fileId) fileRegistry.set(m.fileId, { userId: row.user_id, name: m.name, size: m.size, mimeType: m.mimeType });
    } catch {}
  }
  console.log(`  loaded ${fileRegistry.size} file(s) into registry`);
}

// ── Profile helper ─────────────────────────────────────────────────────────
function getProfile(userId) {
  const u = dbGet('SELECT id, uid, name, avatar FROM users WHERE id = ?', [userId]);
  if (!u) return null;
  const aliases = dbAll('SELECT name FROM user_names WHERE user_id = ? ORDER BY claimed_at ASC', [userId]).map(r => r.name);
  return { id: u.id, uid: u.uid, name: u.name, avatar: u.avatar || null, aliases };
}

// ── Validate name string ───────────────────────────────────────────────────
function validateName(raw) {
  if (!raw || typeof raw !== 'string') return 'Name required';
  const s = raw.trim().slice(0, 32);
  if (!s) return 'Name cannot be empty';
  if (!/^[a-zA-Z0-9_\- ]+$/.test(s)) return 'Letters, numbers, spaces, hyphens and underscores only';
  return null; // ok
}

// ── Connected clients ──────────────────────────────────────────────────────
const clients = new Map(); // ws → { socketId, userId, userName }

function broadcast(data, excludeWs = null) {
  const msg = JSON.stringify(data);
  for (const [ws] of clients) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}
function broadcastAll(data) { broadcast(data, null); }

function onlineUsers() {
  const seen = new Set();
  const out  = [];
  for (const c of clients.values()) {
    if (c.userId && !seen.has(c.userId)) {
      seen.add(c.userId);
      const p = getProfile(c.userId);
      out.push({ id: c.userId, name: c.userName, avatar: p ? p.avatar : null });
    }
  }
  return out;
}

function wsForUser(userId) {
  for (const [ws, c] of clients)
    if (c.userId === userId && ws.readyState === WebSocket.OPEN) return ws;
  return null;
}

function socketIdForUser(userId) {
  for (const [, c] of clients)
    if (c.userId === userId) return c.socketId;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// REST API
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/session — resume session from cookie (no password needed) ─────
app.get('/api/session', (req, res) => {
  const token = parseCookies(req).kofi_session;
  if (!token) return res.status(401).json({ error: 'No session' });
  const row = dbGet('SELECT user_id FROM sessions WHERE token = ?', [token]);
  if (!row) { clearSessionCookie(res); return res.status(401).json({ error: 'Session expired' }); }
  const profile = getProfile(row.user_id);
  if (!profile) { clearSessionCookie(res); return res.status(401).json({ error: 'User not found' }); }
  res.json(profile);
});

// ── POST /api/logout — clear session cookie and delete token ──────────────
app.post('/api/logout', (req, res) => {
  const token = parseCookies(req).kofi_session;
  if (token) db.run('DELETE FROM sessions WHERE token = ?', [token]);
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ── POST /api/auth — login or register ────────────────────────────────────
// Body: { name, password }
//
// Rules:
//  1. Name must only match users.name (the active name), never old aliases.
//  2. If name is unclaimed → new account, password required (≥4 chars).
//  3. If name matches an existing account's active name → check password.
//  4. If name is an old alias (not active) → reject with clear error.
app.post('/api/auth', async (req, res) => {
  const { name, password } = req.body;

  const nameErr = validateName(name);
  if (nameErr) return res.status(400).json({ error: nameErr });
  const trimmed = name.trim().slice(0, 32);

  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  // Check if this name is anyone's ACTIVE name
  const activeUser = dbGet('SELECT * FROM users WHERE name = ?', [trimmed]);

  if (activeUser) {
    // Name matches an active account — verify password
    if (!activeUser.password_hash) {
      // Legacy account with no password yet — set it now on first login
      const hash = bcrypt.hashSync(password, 10);
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, activeUser.id]);
      const token = genTokenNode();
      db.run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, activeUser.id, Date.now()]);
      setSessionCookie(res, token);
      return res.json(getProfile(activeUser.id));
    }
    const ok = bcrypt.compareSync(password, activeUser.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });
    const token = genTokenNode();
    db.run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, activeUser.id, Date.now()]);
    setSessionCookie(res, token);
    return res.json(getProfile(activeUser.id));
  }

  // Check if name is an old alias belonging to someone else
  const aliasRow = dbGet('SELECT user_id FROM user_names WHERE name = ?', [trimmed]);
  if (aliasRow) {
    return res.status(409).json({
      error: 'That name belongs to an existing account. Log in using your active name.',
    });
  }

  // Completely new name → create account
  const id  = uuidv4();
  const uid = genUid();
  const now = Date.now();
  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (id, uid, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
    [id, uid, trimmed, hash, now]);
  db.run('INSERT INTO user_names (user_id, name, claimed_at) VALUES (?, ?, ?)', [id, trimmed, now]);
  const token = genTokenNode();
  db.run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, id, Date.now()]);
  setSessionCookie(res, token);
  return res.json(getProfile(id));
});

// ── GET /api/profile/:userId ───────────────────────────────────────────────
app.get('/api/profile/:userId', (req, res) => {
  const p = getProfile(req.params.userId);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// ── POST /api/profile — update name / avatar / password ───────────────────
// Body: { userId, currentPassword, name?, avatar?, newPassword? }
app.post('/api/profile', async (req, res) => {
  const { userId, currentPassword, name, avatar, newPassword } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // All profile mutations require the current password
  if (user.password_hash) {
    if (!currentPassword) return res.status(401).json({ error: 'Current password required' });
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
  }

  // ── Name change / claim ────────────────────────────────────────────────
  if (name !== undefined && name !== user.name) {
    const nameErr = validateName(name);
    if (nameErr) return res.status(400).json({ error: nameErr });
    const trimmed = name.trim().slice(0, 32);

    const existing = dbGet('SELECT user_id FROM user_names WHERE name = ?', [trimmed]);
    if (existing && existing.user_id !== userId) {
      return res.status(409).json({ error: 'That name is already taken' });
    }
    if (!existing) {
      db.run('INSERT INTO user_names (user_id, name, claimed_at) VALUES (?, ?, ?)',
        [userId, trimmed, Date.now()]);
    }
    db.run('UPDATE users SET name = ? WHERE id = ?', [trimmed, userId]);
    for (const [, c] of clients) {
      if (c.userId === userId) c.userName = trimmed;
    }
  }

  // ── Avatar ─────────────────────────────────────────────────────────────
  if (avatar !== undefined) {
    db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar || null, userId]);
  }

  // ── Password change ────────────────────────────────────────────────────
  if (newPassword !== undefined) {
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }
    db.run('UPDATE users SET password_hash = ? WHERE id = ?',
      [bcrypt.hashSync(newPassword, 10), userId]);
    // Invalidate all existing sessions — everyone must log in again with new password
    db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
    // Issue a fresh session for the current request
    const token = genTokenNode();
    db.run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, userId, Date.now()]);
    setSessionCookie(res, token);
  }

  const profile = getProfile(userId);
  broadcastAll({ type: 'profile_update', profile });
  res.json(profile);
});

// ── GET /api/messages ──────────────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  const rows = dbAll('SELECT * FROM messages ORDER BY created_at DESC LIMIT 100').reverse();
  res.json(rows.map(r => {
    const parsed = r.file_meta ? JSON.parse(r.file_meta) : null;
    let uploaderSocketId = null;
    if (parsed?.fileId) {
      const reg = fileRegistry.get(parsed.fileId);
      if (reg) uploaderSocketId = socketIdForUser(reg.userId) || null;
    }
    return { ...r, file_meta: parsed, uploaderSocketId };
  }));
});

// ═══════════════════════════════════════════════════════════════════════════
// WebSocket
// ═══════════════════════════════════════════════════════════════════════════
wss.on('connection', (ws) => {
  const socketId = uuidv4();
  clients.set(ws, { socketId, userId: null, userName: null });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const client = clients.get(ws);

    switch (msg.type) {

      case 'join': {
        const user = dbGet('SELECT * FROM users WHERE id = ?', [msg.userId]);
        if (!user) { ws.send(JSON.stringify({ type: 'error', message: 'Unknown user' })); return; }
        client.userId   = user.id;
        client.userName = user.name;
        ws.send(JSON.stringify({ type: 'welcome', socketId, users: onlineUsers() }));
        broadcast({ type: 'user_joined', user: { id: user.id, name: user.name }, users: onlineUsers() }, ws);
        const myFileIds = [...fileRegistry.entries()]
          .filter(([, m]) => m.userId === user.id).map(([fid]) => fid);
        if (myFileIds.length) ws.send(JSON.stringify({ type: 'rehost_files', fileIds: myFileIds }));
        broadcastAll({ type: 'uploader_online', userId: user.id, socketId });
        break;
      }

      case 'message': {
        if (!client.userId) return;
        const text = (msg.content || '').toString().trim().slice(0, 4000);
        if (!text) return;
        const id = uuidv4(), now = Date.now();
        db.run('INSERT INTO messages (id, user_id, user_name, type, content, file_meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, client.userId, client.userName, 'text', text, null, now]);
        broadcastAll({ type: 'message', id, userId: client.userId, userName: client.userName,
          msgType: 'text', content: text, fileMeta: null, createdAt: now });
        break;
      }

      case 'file_announce': {
        if (!client.userId) return;
        const { fileId, name, size, mimeType } = msg;
        if (!fileId || !name) return;
        fileRegistry.set(fileId, { userId: client.userId, name, size, mimeType });
        if (!msg.reannounce) {
          const id = uuidv4(), now = Date.now();
          db.run('INSERT INTO messages (id, user_id, user_name, type, content, file_meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, client.userId, client.userName, 'file', name, JSON.stringify({ fileId, name, size, mimeType }), now]);
          broadcastAll({ type: 'message', id, userId: client.userId, userName: client.userName,
            msgType: 'file', content: name, fileMeta: { fileId, name, size, mimeType },
            createdAt: now, uploaderSocketId: socketId });
        } else {
          broadcastAll({ type: 'file_available', fileId, uploaderSocketId: socketId });
        }
        break;
      }

      case 'file_request': {
        if (!client.userId) return;
        const { fileId, requestId, resumeFrom = 0 } = msg;
        const reg = fileRegistry.get(fileId);
        if (!reg) { ws.send(JSON.stringify({ type: 'file_unavailable', fileId, requestId })); return; }
        const uploaderWs = wsForUser(reg.userId);
        if (!uploaderWs) { ws.send(JSON.stringify({ type: 'file_unavailable', fileId, requestId })); return; }
        uploaderWs.send(JSON.stringify({ type: 'file_request', fileId, requestId, resumeFrom, requesterSocketId: socketId }));
        break;
      }

      case 'file_chunk': {
        const { requestId, requesterSocketId, chunk, done, error } = msg;
        let rWs = null;
        for (const [oWs, oC] of clients)
          if (oC.socketId === requesterSocketId) { rWs = oWs; break; }
        if (rWs?.readyState === WebSocket.OPEN)
          rWs.send(JSON.stringify({ type: 'file_chunk', requestId, chunk, done, error }));
        break;
      }

      case 'typing': {
        if (!client.userId) return;
        broadcast({ type: 'typing', userId: client.userId, userName: client.userName, isTyping: !!msg.isTyping }, ws);
        break;
      }
    }
  });

  ws.on('close', () => {
    const c = clients.get(ws);
    clients.delete(ws);
    if (c?.userId) broadcast({ type: 'user_left', userId: c.userId, userName: c.userName, users: onlineUsers() });
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  loadFileRegistry();
  server.listen(PORT, '0.0.0.0', () => {
    const ifaces = os.networkInterfaces();
    console.log('\n köfi is running!\n');
    console.log(`   Local:   http://localhost:${PORT}`);
    for (const addrs of Object.values(ifaces))
      for (const a of addrs)
        if (a.family === 'IPv4' && !a.internal)
          console.log(`   Network: http://${a.address}:${PORT}`);
    console.log('');
  });
}).catch(err => { console.error('Failed to init DB:', err); process.exit(1); });
