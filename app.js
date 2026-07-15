/* ── app.js — UI hook for köfi ───────────────────────────────────────────────
   Hooks into the API server and serves the webapp from public/.

   Run:  node app.js

   What it does:
     1. Imports the API server (server.js) — gets the express app instance
     2. Intercepts GET / to inject window.KOFI_KEY into the HTML before serving
        so the client JS can attach it to every API request automatically
     3. Falls through to express.static for all other public/ assets
     4. Calls start() — same port, same API + WebSocket, now with UI

   The API key is never stored in any public file and never exposed via an
   API endpoint. It only reaches the browser inside the HTML response for /.
──────────────────────────────────────────────────────────────────────────── */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const config  = require('./config');
const { app, start, PORT } = require('./server');

const INDEX   = path.join(__dirname, 'public', 'index.html');
const RAW_HTML = fs.readFileSync(INDEX, 'utf8');

// ── Inject the API key into the HTML served to browsers ───────────────────
// Replaces </head> with an inline <script> that sets window.KOFI_KEY, then
// the closing </head>. The key is only sent to clients loading the webapp —
// external API consumers supply their own key from their own config.
app.get('/', (req, res) => {
  const key      = config.API_PASSCODE;
  const injected = RAW_HTML.replace(
    '</head>',
    `<script>window.KOFI_KEY=${JSON.stringify(key)};</script>\n</head>`
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(injected);
});

// ── Serve everything else in public/ as static assets ─────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Boot ───────────────────────────────────────────────────────────────────
start()
  .then(() => {
    console.log(`köfi running on http://localhost:${PORT}`);
  })
  .catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
