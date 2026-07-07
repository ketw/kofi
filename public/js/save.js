/* ── Save-in-chat ─────────────────────────────────────────────────────────
   Double-tap a file bubble to save it to the server.
   File is kept until every saver unsaves it (Snapchat group chat behaviour).
   Files over the server's size limit cannot be saved.
──────────────────────────────────────────────────────────────────────────── */

// fileId → [{ id, name }]  (who has it saved)
const fileSavers = new Map();

// ── Load initial save state on page load ─────────────────────────────────
async function loadSaveState() {
  try {
    const data = await fetch('/api/saves').then(r => r.json());
    for (const [fileId, savers] of Object.entries(data)) {
      fileSavers.set(fileId, savers);
    }
    // Update any already-rendered bubbles
    for (const [fileId, savers] of fileSavers) {
      updateSaveIndicator(fileId, savers);
    }
  } catch {}
}

// ── WS handlers (called from chat.js handleWS) ────────────────────────────
function handleFileSaved({ fileId, savers }) {
  fileSavers.set(fileId, savers);
  updateSaveIndicator(fileId, savers);
}

function handleFileUnsaved({ fileId, savers }) {
  if (savers.length === 0) {
    fileSavers.delete(fileId);
  } else {
    fileSavers.set(fileId, savers);
  }
  updateSaveIndicator(fileId, savers);
}

// ── Attach double-tap/double-click save behaviour to a file wrapper ────────
function attachSaveBehaviour(wrapper, meta) {
  const fileId = meta.fileId;

  // Double-click on desktop, double-tap on touch
  let lastTap = 0;
  let tapTimer = null;

  const onDoubleTrigger = () => {
    const savers = fileSavers.get(fileId) || [];
    const alreadySaved = savers.some(s => s.id === me.id);
    if (alreadySaved) {
      unsaveFile(fileId, wrapper);
    } else {
      saveFile(fileId, meta, wrapper);
    }
  };

  wrapper.addEventListener('dblclick', e => {
    e.preventDefault();
    onDoubleTrigger();
  });

  wrapper.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 350) {
      clearTimeout(tapTimer);
      e.preventDefault();
      onDoubleTrigger();
    } else {
      tapTimer = setTimeout(() => {}, 350);
    }
    lastTap = now;
  });
}

// ── Save a file ───────────────────────────────────────────────────────────
async function saveFile(fileId, meta, wrapper) {
  const indicator = wrapper.querySelector('.save-indicator');
  if (indicator) indicator.dataset.status = 'saving';

  // If the file is already on the server (someone else saved it), we just
  // register ourselves without re-uploading.
  const alreadyOnServer = (fileSavers.get(fileId) || []).length > 0;

  if (alreadyOnServer) {
    try {
      const res = await fetch(`/api/save/${fileId}?name=${encodeURIComponent(meta.name)}&size=${meta.size}&mime=${encodeURIComponent(meta.mimeType || '')}`, {
        method: 'POST', body: '' });
      if (!res.ok) {
        const err = await res.json();
        showSaveError(wrapper, err.error || 'Failed to save');
      }
    } catch { showSaveError(wrapper, 'Network error'); }
    return;
  }

  // File needs to be uploaded. Get the blob — from hostedFiles (uploader) or
  // download from the P2P network first (downloader who already received it).
  let blob = null;

  if (hostedFiles.has(fileId)) {
    blob = hostedFiles.get(fileId);
  } else {
    // Try to get it from the P2P network first
    if (!fileUploaderMap.has(fileId)) {
      showSaveError(wrapper, 'Uploader offline — wait until they return to save');
      return;
    }
    showSaveStatus(wrapper, 'Downloading to save…');
    blob = await runDownload(fileId, meta, {
      onProgress(received, total) { if (total) showSaveStatus(wrapper, `Saving… ${Math.round(received/total*100)}%`); },
      onStatusChange(status, detail) { if (status === 'error') showSaveError(wrapper, detail); },
    });
    if (!blob) return;
  }

  // Upload to server
  showSaveStatus(wrapper, 'Saving to chat…');
  try {
    const res = await fetch(
      `/api/save/${fileId}?name=${encodeURIComponent(meta.name)}&size=${meta.size}&mime=${encodeURIComponent(meta.mimeType || '')}`,
      { method: 'POST', body: blob, headers: { 'Content-Type': meta.mimeType || 'application/octet-stream' } }
    );
    if (!res.ok) {
      const err = await res.json();
      showSaveError(wrapper, err.error || 'Failed to save');
    }
    // Success — WS broadcast will update the indicator
  } catch { showSaveError(wrapper, 'Upload failed'); }
}

// ── Unsave a file ─────────────────────────────────────────────────────────
async function unsaveFile(fileId, wrapper) {
  try {
    const res = await fetch(`/api/unsave/${fileId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      showSaveError(wrapper, err.error || 'Failed to unsave');
    }
  } catch { showSaveError(wrapper, 'Network error'); }
}

// ── Build save indicator bar (attached to file bubble wrappers) ────────────
function buildSaveIndicator(wrapper, fileId) {
  const existing = wrapper.querySelector('.save-indicator');
  if (existing) return existing;

  const bar = mk('div', { className:'save-indicator' });
  bar.dataset.fileId = fileId;
  bar.title = 'Double-click to save in chat';

  const icon  = mk('span', { className:'save-icon', textContent:'🔖' });
  const label = mk('span', { className:'save-label' });
  bar.append(icon, label);
  wrapper.appendChild(bar);

  // Populate immediately if we already have savers
  const savers = fileSavers.get(fileId) || [];
  refreshSaveLabel(label, savers);
  return bar;
}

function updateSaveIndicator(fileId, savers) {
  // Update every wrapper with this fileId in the DOM
  document.querySelectorAll(`[data-file-id="${fileId}"] .save-label`).forEach(label => {
    refreshSaveLabel(label, savers);
  });
  // Also update saved-file bubbles (which have data-saved-file-id)
  document.querySelectorAll(`[data-saved-file-id="${fileId}"] .save-label`).forEach(label => {
    refreshSaveLabel(label, savers);
  });
}

function refreshSaveLabel(label, savers) {
  if (!savers || savers.length === 0) {
    label.textContent = '';
    label.closest('.save-indicator').classList.remove('has-savers');
    return;
  }
  label.closest('.save-indicator').classList.add('has-savers');
  const mine = savers.some(s => s.id === me.id);
  const others = savers.filter(s => s.id !== me.id);
  const names = [mine ? 'you' : null, ...others.map(s => s.name)].filter(Boolean);
  label.textContent = names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
}

function showSaveStatus(wrapper, msg) {
  const bar = wrapper.querySelector('.save-indicator');
  if (bar) { bar.dataset.status = 'saving'; bar.querySelector('.save-label').textContent = msg; }
}

function showSaveError(wrapper, msg) {
  const bar = wrapper.querySelector('.save-indicator');
  if (!bar) return;
  bar.dataset.status = 'error';
  bar.querySelector('.save-label').textContent = msg;
  setTimeout(() => {
    bar.dataset.status = '';
    updateSaveIndicator(bar.dataset.fileId, fileSavers.get(bar.dataset.fileId) || []);
  }, 3000);
}

// ── Build saved-file bubble (served from server, always available) ─────────
function buildSavedFileBubble(container, fileId, meta, savers) {
  const wrapper = mk('div', { className:'file-wrapper saved-file-wrapper' });
  wrapper.dataset.savedFileId = fileId;

  const bubble  = mk('div', { className:'file-bubble saved-file-bubble' });
  const icon    = mk('span', { className:'file-icon', textContent: fileIcon(meta.mimeType) });
  const info    = mk('div', { className:'file-info' });
  const fname   = mk('span', { className:'file-name', title:meta.name, textContent:meta.name });
  const fsize   = mk('span', { className:'file-size', textContent:formatSize(meta.size) });
  const faction = mk('span', { className:'file-action', textContent:'Saved in chat — click to open' });
  faction.style.color = 'var(--accent)';
  info.append(fname, fsize, faction);
  bubble.append(icon, info);

  const mime = meta.mimeType || '';
  const kind = mime.split('/')[0];
  const isPdf = mime.includes('pdf');

  bubble.style.cursor = 'pointer';
  bubble.addEventListener('click', () => {
    const url = `/api/saved/${fileId}`;
    if (kind === 'image') openMediaViewer(url, 'image', meta.name);
    else if (kind === 'video') openMediaViewer(url, 'video', meta.name);
    else if (kind === 'audio') openMediaViewer(url, 'audio', meta.name);
    else if (isPdf) openPdfViewer(url, meta.name);
    else window.open(url, '_blank');
  });

  wrapper.append(bubble);
  updateSaveIndicator(fileId, savers);
  container.appendChild(wrapper);
}