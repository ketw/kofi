/* ── src/utils.js — shared cookie, token, and name-validation helpers ────────
   Kept separate so auth.js and profile.js can both import from here
   without creating a circular dependency.
──────────────────────────────────────────────────────────────────────────── */

const crypto = require('crypto');

// ── Cookie helpers ─────────────────────────────────────────────────────────
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(
    raw.split(';').map(s => {
      const [k, ...v] = s.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    }).filter(([k]) => k)
  );
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `kofi_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `kofi_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

// ── Session token — 32 random bytes as hex ─────────────────────────────────
function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Name validation ────────────────────────────────────────────────────────
function validateName(raw) {
  if (!raw || typeof raw !== 'string') return 'Name required';
  const s = raw.trim().slice(0, 32);
  if (!s) return 'Name cannot be empty';
  if (!/^[a-zA-Z0-9_\- ]+$/.test(s)) return 'Letters, numbers, spaces, hyphens and underscores only';
  return null; // ok
}

module.exports = { parseCookies, setSessionCookie, clearSessionCookie, genToken, validateName };
