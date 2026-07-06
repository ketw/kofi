/* ── Media — audio player, PDF viewer, image/video lightbox ─────────────
──────────────────────────────────────────────────────────────────────────── */

// ── Inline audio player ───────────────────────────────────────────────────
function buildAudioPlayer(url, name) {
  const wrap  = mk('div', { className:'audio-player' });
  const icon  = mk('span', { className:'audio-icon', textContent:'🎵' });
  const col   = mk('div', { className:'audio-col' });
  const label = mk('span', { className:'audio-label', title:name, textContent:name });
  const audio = mk('audio');
  audio.src = url; audio.controls = true; audio.preload = 'metadata';
  const dlLink = mk('a', { className:'audio-dl', title:'Download', textContent:'⬇' });
  dlLink.href = url; dlLink.download = name;
  col.append(label, audio);
  wrap.append(icon, col, dlLink);
  return wrap;
}

// ── PDF tile ──────────────────────────────────────────────────────────────
function buildPdfBubble(url, name, isUploader) {
  const wrap  = mk('div', { className:'pdf-bubble', title:'Click to view PDF' });
  const icon  = mk('span', { className:'pdf-icon', textContent:'📕' });
  const info  = mk('div', { className:'pdf-info' });
  const fname = mk('span', { className:'pdf-name', textContent:name });
  const hint  = mk('span', { className:'pdf-hint', textContent:isUploader ? 'Click to open' : 'PDF — click to view' });
  info.append(fname, hint);
  wrap.append(icon, info);
  wrap.addEventListener('click', () => openPdfViewer(url, name));
  return wrap;
}

// ── PDF fullscreen viewer ─────────────────────────────────────────────────
function openPdfViewer(url, name) {
  const overlay  = mk('div', { className:'pdf-overlay' });
  const toolbar  = mk('div', { className:'pdf-toolbar' });
  const title    = mk('span', { className:'pdf-toolbar-title', textContent:name });
  const actions  = mk('div');
  actions.style.cssText = 'display:flex;gap:0.6rem;align-items:center;';
  const dlBtn    = mk('a',      { className:'pdf-toolbar-btn', textContent:'⬇ Download' });
  dlBtn.href = url; dlBtn.download = name;
  const closeBtn = mk('button', { className:'pdf-toolbar-btn', textContent:'✕ Close' });
  closeBtn.addEventListener('click', () => overlay.remove());
  actions.append(dlBtn, closeBtn);
  toolbar.append(title, actions);
  const iframe = mk('iframe', { className:'pdf-iframe', title:name });
  iframe.src = url;
  overlay.append(toolbar, iframe);
  document.body.appendChild(overlay);
}

// ── Media lightbox (image / video / audio) ────────────────────────────────
function openMediaViewer(url, kind, name) {
  const overlay = mk('div', { className:'media-overlay' });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  if (kind === 'image') {
    const img = mk('img');
    img.src = url; img.alt = name;
    overlay.appendChild(img);
  } else if (kind === 'video') {
    const vid = mk('video');
    vid.src = url; vid.controls = true; vid.autoplay = true;
    overlay.appendChild(vid);
  } else if (kind === 'audio') {
    const box = mk('div', { className:'media-overlay-audio' });
    const lbl = mk('div', { className:'media-overlay-audio-name', textContent:name });
    const aud = mk('audio');
    aud.src = url; aud.controls = true; aud.autoplay = true;
    box.append(lbl, aud);
    overlay.appendChild(box);
  }

  const bar      = mk('div', { className:'media-overlay-bar' });
  const dl       = mk('a',      { className:'media-overlay-dl',   textContent:'⬇ Download' });
  dl.href = url; dl.download = name;
  const closeBtn = mk('button', { className:'media-overlay-close', textContent:'✕ Close' });
  closeBtn.addEventListener('click', () => overlay.remove());
  bar.append(dl, closeBtn);
  overlay.appendChild(bar);
  document.body.appendChild(overlay);
}
