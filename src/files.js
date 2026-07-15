/* ── src/files.js — file registry, save/unsave/download/saves routes ────────
──────────────────────────────────────────────────────────────────────────── */

const fs     = require('fs');
const path   = require('path');
const config = require('../config');
const { dbAll, dbGet, dbRun } = require('./db');
const { parseCookies } = require('./auth');

// ── Saved-files directory ──────────────────────────────────────────────────
const SAVED_DIR = path.resolve(__dirname, '..', config.SAVED_FILES_DIR);
if (!fs.existsSync(SAVED_DIR)) fs.mkdirSync(SAVED_DIR, { recursive: true });

// ── In-memory file registry: fileId → { userId, name, size, mimeType } ────
const fileRegistry = new Map();

function loadFileRegistry() {
  const rows = dbAll(
    `SELECT file_meta, user_id FROM messages WHERE type='file' AND file_meta IS NOT NULL`
  );
  for (const row of rows) {
    try {
      const m = JSON.parse(row.file_meta);
      if (m.fileId) {
        fileRegistry.set(m.fileId, {
          userId: row.user_id,
          name: m.name,
          size: m.size,
          mimeType: m.mimeType,
        });
      }
    } catch {}
  }
  console.log(`  loaded ${fileRegistry.size} file(s) into registry`);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function isSavedOnDisk(fileId) {
  return fs.existsSync(path.join(SAVED_DIR, fileId));
}

function getSavers(fileId) {
  return dbAll(
    `SELECT u.id, u.name FROM file_saves fs
     JOIN users u ON u.id = fs.user_id
     WHERE fs.file_id = ? ORDER BY fs.saved_at ASC`,
    [fileId]
  );
}

// ── Route registration ─────────────────────────────────────────────────────
function registerFileRoutes(app, broadcastAll) {

  // GET /api/messages — last 100 messages with uploader socket IDs resolved
  app.get('/api/messages', (req, res) => {
    const { socketIdForUser } = require('./ws');
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

  // GET /api/saves — all saved file IDs with saver lists (used on page load)
  app.get('/api/saves', (req, res) => {
    const rows = dbAll(
      `SELECT fs.file_id, u.id as user_id, u.name as user_name
       FROM file_saves fs JOIN users u ON u.id = fs.user_id
       ORDER BY fs.saved_at ASC`
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.file_id]) map[r.file_id] = [];
      map[r.file_id].push({ id: r.user_id, name: r.user_name });
    }
    res.json(map);
  });

  // POST /api/save/:fileId — save a file to the server (raw body)
  app.post('/api/save/:fileId', (req, res) => {
    const token = parseCookies(req).kofi_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const sessionRow = dbGet('SELECT user_id FROM sessions WHERE token = ?', [token]);
    if (!sessionRow) return res.status(401).json({ error: 'Session expired' });
    const userId = sessionRow.user_id;

    const { fileId } = req.params;
    const { name, size, mime } = req.query;

    const fileSize = parseInt(size, 10) || 0;
    if (fileSize > config.SAVE_SIZE_LIMIT_BYTES) {
      return res.status(413).json({
        error: `File too large to save (max ${Math.round(config.SAVE_SIZE_LIMIT_BYTES / (1024 * 1024))} MB)`,
      });
    }

    // Already on disk — just register this user as a saver
    if (isSavedOnDisk(fileId)) {
      dbRun('INSERT OR IGNORE INTO file_saves (file_id, user_id, saved_at) VALUES (?, ?, ?)',
        [fileId, userId, Date.now()]);
      const savers = getSavers(fileId);
      broadcastAll({ type: 'file_saved', fileId, savers });
      return res.json({ ok: true, savers });
    }

    // Write raw body buffer to disk
    const body = req.body;
    if (!body || !Buffer.isBuffer(body)) {
      return res.status(400).json({ error: 'No file data received' });
    }
    if (body.length > config.SAVE_SIZE_LIMIT_BYTES) {
      return res.status(413).json({
        error: `File too large to save (max ${Math.round(config.SAVE_SIZE_LIMIT_BYTES / (1024 * 1024))} MB)`,
      });
    }

    try {
      fs.writeFileSync(path.join(SAVED_DIR, fileId), body);
    } catch {
      return res.status(500).json({ error: 'Failed to write file' });
    }

    dbRun('INSERT OR IGNORE INTO file_saves (file_id, user_id, saved_at) VALUES (?, ?, ?)',
      [fileId, userId, Date.now()]);
    const savers = getSavers(fileId);
    broadcastAll({ type: 'file_saved', fileId, savers });
    res.json({ ok: true, savers });
  });

  // POST /api/unsave/:fileId — remove this user's save (deletes file if last saver)
  app.post('/api/unsave/:fileId', (req, res) => {
    const token = parseCookies(req).kofi_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const sessionRow = dbGet('SELECT user_id FROM sessions WHERE token = ?', [token]);
    if (!sessionRow) return res.status(401).json({ error: 'Session expired' });
    const userId = sessionRow.user_id;
    const { fileId } = req.params;

    dbRun('DELETE FROM file_saves WHERE file_id = ? AND user_id = ?', [fileId, userId]);
    const savers = getSavers(fileId);

    if (savers.length === 0) {
      const filePath = path.join(SAVED_DIR, fileId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    broadcastAll({ type: 'file_unsaved', fileId, savers });
    res.json({ ok: true, savers });
  });

  // GET /api/saved/:fileId — download a server-saved file
  app.get('/api/saved/:fileId', (req, res) => {
    const { fileId } = req.params;
    const filePath = path.join(SAVED_DIR, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found or has been removed' });
    }

    const reg = fileRegistry.get(fileId);
    if (reg) {
      res.setHeader('Content-Type', reg.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition',
        `inline; filename="${encodeURIComponent(reg.name)}"`);
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

module.exports = { fileRegistry, loadFileRegistry, getSavers, registerFileRoutes };
