/* ── src/apikey.js — server-wide API key: hash-on-boot, verify, rate limit ──
──────────────────────────────────────────────────────────────────────────── */

const bcrypt = require('bcryptjs');
const config = require('../config');
const { dbGet, dbRun } = require('./db');

// ── Boot: hash the configured passcode once and store it ──────────────────
// Called from server.js after initDB() resolves.
// If a hash is already stored AND the passcode hasn't changed, nothing happens.
// If the passcode changed (or this is first boot), the old hash is replaced.
//
// The plaintext passcode is NEVER written to the database.
// bcrypt is intentionally slow — each compare takes ~100 ms at cost 12,
// making brute-force over the wire impractical even without rate limiting.
function initApiKey() {
  const passcode = config.API_PASSCODE;
  if (!passcode) {
    console.error('[apikey] API_PASSCODE is not set in config.js — server will reject all requests');
    return;
  }

  const existing = dbGet("SELECT value FROM server_config WHERE key = 'api_key_hash'");
  if (existing) {
    // Verify the stored hash still matches the configured passcode.
    // If someone changed the passcode in config, re-hash and update.
    const matches = bcrypt.compareSync(passcode, existing.value);
    if (!matches) {
      const newHash = bcrypt.hashSync(passcode, 12);
      dbRun("UPDATE server_config SET value = ? WHERE key = 'api_key_hash'", [newHash]);
      console.log('  api key: passcode changed — hash updated');
    } else {
      console.log('  api key: ready');
    }
  } else {
    const hash = bcrypt.hashSync(passcode, 12);
    dbRun("INSERT INTO server_config (key, value) VALUES ('api_key_hash', ?)", [hash]);
    console.log('  api key: hash stored for first time');
  }
}

// ── In-memory rate limiter — keyed by IP ──────────────────────────────────
// Tracks failed attempts per IP. After MAX_FAILURES within WINDOW_MS the IP
// is locked out for LOCKOUT_MS. Resets automatically after the window.
const MAX_FAILURES = 10;
const WINDOW_MS    = 60 * 1000;      // 1 minute window
const LOCKOUT_MS   = 15 * 60 * 1000; // 15 minute lockout after too many failures

const failureMap = new Map(); // ip → { count, windowStart, lockedUntil }

function getIp(req) {
  // Trust X-Forwarded-For when behind a proxy (Render, Cloudflare, etc.)
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress || 'unknown').trim();
}

function checkRateLimit(ip) {
  const now   = Date.now();
  const entry = failureMap.get(ip);

  if (!entry) return false; // no failures recorded yet

  // Still locked out
  if (entry.lockedUntil && now < entry.lockedUntil) return true;

  // Window expired — reset
  if (now - entry.windowStart > WINDOW_MS) {
    failureMap.delete(ip);
    return false;
  }

  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip) {
  const now   = Date.now();
  const entry = failureMap.get(ip) || { count: 0, windowStart: now, lockedUntil: null };

  // Reset window if expired
  if (now - entry.windowStart > WINDOW_MS) {
    entry.count       = 0;
    entry.windowStart = now;
    entry.lockedUntil = null;
  }

  entry.count++;
  if (entry.count >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }

  failureMap.set(ip, entry);
}

function clearFailures(ip) {
  failureMap.delete(ip);
}

// ── Verify a raw passcode string against the stored hash ──────────────────
function verifyPasscode(raw) {
  if (!raw) return false;
  const row = dbGet("SELECT value FROM server_config WHERE key = 'api_key_hash'");
  if (!row) return false;
  return bcrypt.compareSync(raw, row.value);
}

// ── Express middleware — applied to all /api/* routes ─────────────────────
// Reads X-Kofi-Key header, checks rate limit, verifies against stored hash.
// On success clears the failure counter for the IP.
// On failure increments it and returns 403.
function apiKeyMiddleware(req, res, next) {
  const ip  = getIp(req);

  if (checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many failed attempts — try again later' });
  }

  const key = req.headers['x-kofi-key'];
  if (!verifyPasscode(key)) {
    recordFailure(ip);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  clearFailures(ip);
  next();
}

// ── WebSocket verify — called in ws.js before admitting a join ────────────
// Returns true if the passcode is valid (and clears failures for the IP).
// Returns false if invalid or rate-limited.
function verifyWsKey(key, ip) {
  if (checkRateLimit(ip)) return false;
  if (!verifyPasscode(key)) {
    recordFailure(ip);
    return false;
  }
  clearFailures(ip);
  return true;
}

module.exports = { initApiKey, apiKeyMiddleware, verifyWsKey };
