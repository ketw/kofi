/* ── src/ws.js — WebSocket server, client map, broadcast, message handlers ──
──────────────────────────────────────────────────────────────────────────── */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbRun } = require('./db');
const { getProfile } = require('./profile');
const { fileRegistry } = require('./files');
const { verifyWsKey } = require('./apikey');

// ── Connected clients: ws → { socketId, userId, userName } ────────────────
const clients = new Map();

// ── Broadcast helpers ──────────────────────────────────────────────────────
function broadcast(data, excludeWs = null) {
  const msg = JSON.stringify(data);
  for (const [ws] of clients) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function broadcastAll(data) {
  broadcast(data, null);
}

// ── Online user list ───────────────────────────────────────────────────────
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

// ── Find a WS connection or socketId by userId ────────────────────────────
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

// ── Attach WebSocket server to an existing HTTP server ────────────────────
function attachWS(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const socketId = uuidv4();
    const ip       = (req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0]
      : req.socket.remoteAddress || 'unknown').trim();

    clients.set(ws, { socketId, userId: null, userName: null, ip, authenticated: false });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      handleMessage(ws, msg, socketId);
    });

    ws.on('close', () => {
      const c = clients.get(ws);
      clients.delete(ws);
      if (c?.userId) {
        broadcast({ type: 'user_left', userId: c.userId, userName: c.userName, users: onlineUsers() });
      }
    });
  });

  return wss;
}

// ── Message dispatcher ─────────────────────────────────────────────────────
function handleMessage(ws, msg, socketId) {
  const client = clients.get(ws);

  switch (msg.type) {

    case 'join': {
      // Verify API key before anything else
      if (!verifyWsKey(msg.key, client.ip)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid API key' }));
        ws.close();
        return;
      }
      client.authenticated = true;

      const user = dbGet('SELECT * FROM users WHERE id = ?', [msg.userId]);
      if (!user) {
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown user' }));
        return;
      }
      client.userId   = user.id;
      client.userName = user.name;

      ws.send(JSON.stringify({ type: 'welcome', socketId, users: onlineUsers() }));
      broadcast({ type: 'user_joined', user: { id: user.id, name: user.name }, users: onlineUsers() }, ws);

      // Ask the client to re-announce any files they were previously hosting
      const myFileIds = [...fileRegistry.entries()]
        .filter(([, m]) => m.userId === user.id)
        .map(([fid]) => fid);
      if (myFileIds.length) {
        ws.send(JSON.stringify({ type: 'rehost_files', fileIds: myFileIds }));
      }

      broadcastAll({ type: 'uploader_online', userId: user.id, socketId });
      break;
    }

    case 'message': {
      if (!client.userId || !client.authenticated) return;
      const text = (msg.content || '').toString().trim().slice(0, 4000);
      if (!text) return;
      const id = uuidv4(), now = Date.now();
      dbRun(
        'INSERT INTO messages (id, user_id, user_name, type, content, file_meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, client.userId, client.userName, 'text', text, null, now]
      );
      broadcastAll({
        type: 'message', id,
        userId: client.userId, userName: client.userName,
        msgType: 'text', content: text, fileMeta: null, createdAt: now,
      });
      break;
    }

    case 'file_announce': {
      if (!client.userId || !client.authenticated) return;
      const { fileId, name, size, mimeType } = msg;
      if (!fileId || !name) return;

      fileRegistry.set(fileId, { userId: client.userId, name, size, mimeType });

      if (!msg.reannounce) {
        const id = uuidv4(), now = Date.now();
        dbRun(
          'INSERT INTO messages (id, user_id, user_name, type, content, file_meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, client.userId, client.userName, 'file', name,
            JSON.stringify({ fileId, name, size, mimeType }), now]
        );
        broadcastAll({
          type: 'message', id,
          userId: client.userId, userName: client.userName,
          msgType: 'file', content: name,
          fileMeta: { fileId, name, size, mimeType },
          createdAt: now, uploaderSocketId: socketId,
        });
      } else {
        broadcastAll({ type: 'file_available', fileId, uploaderSocketId: socketId });
      }
      break;
    }

    case 'file_request': {
      if (!client.userId || !client.authenticated) return;
      const { fileId, requestId, resumeFrom = 0 } = msg;
      const reg = fileRegistry.get(fileId);
      if (!reg) {
        ws.send(JSON.stringify({ type: 'file_unavailable', fileId, requestId }));
        return;
      }
      const uploaderWs = wsForUser(reg.userId);
      if (!uploaderWs) {
        ws.send(JSON.stringify({ type: 'file_unavailable', fileId, requestId }));
        return;
      }
      uploaderWs.send(JSON.stringify({
        type: 'file_request', fileId, requestId, resumeFrom,
        requesterSocketId: socketId,
      }));
      break;
    }

    case 'file_chunk': {
      const { requestId, requesterSocketId, chunk, done, error } = msg;
      let rWs = null;
      for (const [oWs, oC] of clients) {
        if (oC.socketId === requesterSocketId) { rWs = oWs; break; }
      }
      if (rWs?.readyState === WebSocket.OPEN) {
        rWs.send(JSON.stringify({ type: 'file_chunk', requestId, chunk, done, error }));
      }
      break;
    }

    case 'typing': {
      if (!client.userId || !client.authenticated) return;
      broadcast({
        type: 'typing',
        userId: client.userId,
        userName: client.userName,
        isTyping: !!msg.isTyping,
      }, ws);
      break;
    }
  }
}

module.exports = { clients, broadcast, broadcastAll, onlineUsers, wsForUser, socketIdForUser, attachWS };
