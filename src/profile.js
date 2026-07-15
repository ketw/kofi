/* ── src/profile.js — profile helpers and /api/profile routes ───────────────
──────────────────────────────────────────────────────────────────────────── */

const bcrypt = require('bcryptjs');
const { dbGet, dbAll, dbRun } = require('./db');
const { parseCookies, setSessionCookie, clearSessionCookie, genToken, validateName } = require('./utils');

// ── Profile helper — builds the full profile object for a userId ───────────
function getProfile(userId) {
  const u = dbGet('SELECT id, uid, name, avatar FROM users WHERE id = ?', [userId]);
  if (!u) return null;
  const aliases = dbAll(
    'SELECT name FROM user_names WHERE user_id = ? ORDER BY claimed_at ASC',
    [userId]
  ).map(r => r.name);
  return { id: u.id, uid: u.uid, name: u.name, avatar: u.avatar || null, aliases };
}

// ── Route registration ─────────────────────────────────────────────────────
// broadcastAll and clients are passed in from server.js to avoid circular imports
function registerProfileRoutes(app, broadcastAll, clients) {

  // GET /api/profile/:userId
  app.get('/api/profile/:userId', (req, res) => {
    const p = getProfile(req.params.userId);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  });

  // POST /api/profile — update name / avatar / password
  // Body: { userId, name?, avatar?, currentPassword?, newPassword? }
  // name/avatar: session cookie is sufficient proof of identity
  // newPassword: requires currentPassword
  app.post('/api/profile', async (req, res) => {
    const { userId, currentPassword, name, avatar, newPassword } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Verify the session cookie belongs to this userId
    const token = parseCookies(req).kofi_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const sessionRow = dbGet('SELECT user_id FROM sessions WHERE token = ?', [token]);
    if (!sessionRow || sessionRow.user_id !== userId) {
      return res.status(401).json({ error: 'Session does not match user' });
    }

    const user = dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // ── Name change / claim ──────────────────────────────────────────────
    if (name !== undefined && name !== user.name) {
      const nameErr = validateName(name);
      if (nameErr) return res.status(400).json({ error: nameErr });
      const trimmed = name.trim().slice(0, 32);

      const existing = dbGet('SELECT user_id FROM user_names WHERE name = ?', [trimmed]);
      if (existing && existing.user_id !== userId) {
        return res.status(409).json({ error: 'That name is already taken' });
      }
      if (!existing) {
        dbRun('INSERT INTO user_names (user_id, name, claimed_at) VALUES (?, ?, ?)',
          [userId, trimmed, Date.now()]);
      }
      dbRun('UPDATE users SET name = ? WHERE id = ?', [trimmed, userId]);
      // Keep in-memory client state in sync so WS messages use the new name immediately
      for (const [, c] of clients) {
        if (c.userId === userId) c.userName = trimmed;
      }
    }

    // ── Avatar ───────────────────────────────────────────────────────────
    if (avatar !== undefined) {
      dbRun('UPDATE users SET avatar = ? WHERE id = ?', [avatar || null, userId]);
    }

    // ── Password change — requires current password ──────────────────────
    if (newPassword !== undefined) {
      if (!user.password_hash || !currentPassword) {
        return res.status(401).json({ error: 'Current password required to set a new one' });
      }
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
      if (typeof newPassword !== 'string' || newPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters' });
      }
      dbRun('UPDATE users SET password_hash = ? WHERE id = ?',
        [bcrypt.hashSync(newPassword, 10), userId]);
      // Invalidate all existing sessions, issue a fresh one for this request
      dbRun('DELETE FROM sessions WHERE user_id = ?', [userId]);
      const newToken = genToken();
      dbRun('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
        [newToken, userId, Date.now()]);
      setSessionCookie(res, newToken);
    }

    const profile = getProfile(userId);
    broadcastAll({ type: 'profile_update', profile });
    res.json(profile);
  });
}

module.exports = { getProfile, registerProfileRoutes };
