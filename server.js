/* ── server.js — entry point: wires everything together and starts listening ──
──────────────────────────────────────────────────────────────────────────── */

const express = require('express');
const http    = require('http');
const path    = require('path');
const config  = require('./config');

const { initDB }                        = require('./src/db');
const { registerAuthRoutes }            = require('./src/auth');
const { registerProfileRoutes }         = require('./src/profile');
const { loadFileRegistry, registerFileRoutes } = require('./src/files');
const { broadcastAll, clients, attachWS } = require('./src/ws');
const { printAddresses, runIpCheck }    = require('./src/network');

// ── Express app + HTTP server ──────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Raw body parser for file save uploads (bypasses JSON size limit)
app.use('/api/save', express.raw({ type: '*/*', limit: config.SAVE_SIZE_LIMIT_BYTES + 1024 }));

// ── Routes ─────────────────────────────────────────────────────────────────
registerAuthRoutes(app);
registerProfileRoutes(app, broadcastAll, clients);
registerFileRoutes(app, broadcastAll);

// ── WebSocket ──────────────────────────────────────────────────────────────
attachWS(server);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || config.PORT || 3000;

initDB().then(() => {
  loadFileRegistry();
  server.listen(PORT, '0.0.0.0', async () => {
    printAddresses(PORT);
    await runIpCheck();
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});
