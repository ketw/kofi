/* ── src/auth.js — session/auth/logout routes ────────────────────────────────
──────────────────────────────────────────────────────────────────────────── */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbRun, genUid } = require('./db');
const { parseCookies, setSessionCookie, clearSessionCookie, genToken, validateName } = require('./utils');
const { getProfile } = require('./profile');

// ── Session middleware helper — resolves a cookie token to a userId ─────────
// Returns userId string or null.
function resolveSession(req) {
  const token = parseCookies(req).kofi_session;
  if (!token) return null;
  const row = dbGet('SELECT user_id FROM sessions WHERE token = ?', [token]);
  return row ? row.user_id : null;
}

// ── Route registration ─────────────────────────────────────────────────────
function registerAuthRoutes(app) {

  // GET /api/session — resume session from cookie (no password needed)
  app.get('/api/session', (req, res) => {
    const token = parseCookies(req).kofi_session;
    if (!token) return res.status(401).json({ error: 'No session' });
    const row = dbGet('SELECT user_id FROM sessions WHERE token = ?', [token]);
    if (!row) { clearSessionCookie(res); return res.status(401).json({ error: 'Session expired' }); }
    const profile = getProfile(row.user_id);
    if (!profile) { clearSessionCookie(res); return res.status(401).json({ error: 'User not found' }); }
    res.json(profile);
  });

  // POST /api/logout — clear session cookie and delete token
  app.post('/api/logout', (req, res) => {
    const token = parseCookies(req).kofi_session;
    if (token) dbRun('DELETE FROM sessions WHERE token = ?', [token]);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // POST /api/auth — login or register
  // Body: { name, password }
  //
  // Rules:
  //  1. Name must only match users.name (active name), never old aliases.
  //  2. Unclaimed name → new account, password required (≥4 chars).
  //  3. Active name match → verify password.
  //  4. Old alias (not active) → reject with clear error.
  app.post('/api/auth', async (req, res) => {
    const { name, password } = req.body;

    const nameErr = validateName(name);
    if (nameErr) return res.status(400).json({ error: nameErr });
    const trimmed = name.trim().slice(0, 32);

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check if this name is anyone's active name
    const activeUser = dbGet('SELECT * FROM users WHERE name = ?', [trimmed]);

    if (activeUser) {
      // Legacy account with no password yet — set it on first login
      if (!activeUser.password_hash) {
        const hash = bcrypt.hashSync(password, 10);
        dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, activeUser.id]);
        const token = genToken();
        dbRun('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
          [token, activeUser.id, Date.now()]);
        setSessionCookie(res, token);
        return res.json(getProfile(activeUser.id));
      }
      const ok = bcrypt.compareSync(password, activeUser.password_hash);
      if (!ok) return res.status(401).json({ error: 'Incorrect password' });
      const token = genToken();
      dbRun('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
        [token, activeUser.id, Date.now()]);
      setSessionCookie(res, token);
      return res.json(getProfile(activeUser.id));
    }

    // Name is an old alias belonging to someone else
    const aliasRow = dbGet('SELECT user_id FROM user_names WHERE name = ?', [trimmed]);
    if (aliasRow) {
      return res.status(409).json({
        error: 'That name belongs to an existing account. Log in using your active name.',
      });
    }

    // Completely new name → create account
    const id   = uuidv4();
    const uid  = genUid();
    const now  = Date.now();
    const hash = bcrypt.hashSync(password, 10);
    dbRun('INSERT INTO users (id, uid, name, password_hash, avatar, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
      [id, uid, trimmed, hash, now]);
    dbRun('INSERT INTO user_names (user_id, name, claimed_at) VALUES (?, ?, ?)',
      [id, trimmed, now]);
    const token = genToken();
    dbRun('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
      [token, id, Date.now()]);
    setSessionCookie(res, token);
    return res.json(getProfile(id));
  });
}

module.exports = { resolveSession, registerAuthRoutes };
