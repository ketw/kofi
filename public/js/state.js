/* ── Shared state & utilities ─────────────────────────────────────────────
   Everything in this file is used by multiple modules.
   Loaded first so all globals are available.
──────────────────────────────────────────────────────────────────────────── */

// ── DOM helper ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function mk(tag, props) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) el[k] = v;
  return el;
}

// ── Formatters ────────────────────────────────────────────────────────────
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024*1024)).toFixed(1) + ' MB';
  return (bytes / (1024*1024*1024)).toFixed(2) + ' GB';
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}

function fileIcon(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('zip') || mime.includes('compressed')) return '🗜️';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
  return '📄';
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function linkify(text) {
  return text.replace(/(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent)">$1</a>');
}

function triggerDownload(url, name) {
  const a = mk('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Avatar helpers ────────────────────────────────────────────────────────
function userColor(userId) {
  const palette = ['#b07156','#7a8c5e','#5e7a8c','#8c5e7a','#8c7a5e','#5e8c75'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}

function applyAvatarToEl(el, profile) {
  el.innerHTML = '';
  if (profile.avatar) {
    const img = mk('img');
    img.src = profile.avatar;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    el.appendChild(img);
  } else {
    el.textContent = profile.name.charAt(0);
  }
}

function applyAvatarToBlob(el, profile) {
  applyAvatarToEl(el, profile); // same logic
}

// ── App state ─────────────────────────────────────────────────────────────
let me = null;      // { id, uid, name, avatar, aliases[] }
let ws = null;
let mySocketId = null;

const profileCache   = new Map(); // userId → profile
const hostedFiles    = new Map(); // fileId → File
const fileUploaderMap = new Map(); // fileId → uploaderSocketId
const fileOwnerMap   = new Map(); // fileId → userId
const waitingForUploader = new Map(); // fileId → Set<callback>
const pendingDownloads   = new Map(); // requestId → DownloadState
const partialDownloads   = new Map(); // fileId → { chunks, received }

let queuedFiles  = [];
let typingTimer  = null;
let isTyping     = false;
let lastGroup    = null; // { userId, el, lastTs }

// ── WebSocket send helper ─────────────────────────────────────────────────
function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

// ── reveal: body starts visibility:hidden, called once screen is mounted ──
function reveal() { document.body.classList.add('ready'); }
