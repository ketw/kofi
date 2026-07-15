/* ── Profile panel — avatar, display name, aliases, password ─────────────
──────────────────────────────────────────────────────────────────────────── */

function updateMyProfileBtn() {
  const btn = $('my-profile-btn');
  if (!btn) return;
  btn.innerHTML = '';
  if (me.avatar) {
    const img = mk('img');
    img.src = me.avatar;
    btn.appendChild(img);
  } else {
    btn.textContent = me.name.charAt(0);
  }
}

function handleProfileUpdate(profile) {
  profileCache.set(profile.id, profile);
  if (profile.id === me.id) {
    me = profile;
    updateMyProfileBtn();
    refreshProfilePanel();
  }
  document.querySelectorAll(`.msg-avatar[data-user-id="${profile.id}"]`)
    .forEach(el => applyAvatarToEl(el, profile));
  document.querySelectorAll(`.user-blob[data-user-id="${profile.id}"]`)
    .forEach(el => {
      applyAvatarToBlob(el, profile);
      el.dataset.name = profile.id === me.id ? profile.name + ' (you)' : profile.name;
    });
}

// ── Panel lifecycle ───────────────────────────────────────────────────────
function initProfilePanel() {
  $('my-profile-btn').addEventListener('click', openProfilePanel);
  $('pp-close-btn').addEventListener('click', closeProfilePanel);
  $('profile-backdrop').addEventListener('click', closeProfilePanel);
  $('pp-name-save').addEventListener('click', saveProfileName);
  $('pp-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveProfileName(); });
  $('pp-avatar-input').addEventListener('change', handleAvatarUpload);
  $('pp-avatar-remove').addEventListener('click', removeAvatar);
  $('pp-pass-save').addEventListener('click', savePassword);
}

function openProfilePanel() {
  refreshProfilePanel();
  $('profile-panel').classList.remove('hidden');
  $('profile-backdrop').classList.remove('hidden');
  $('pp-name-input').value = me.name;
  $('pp-name-error').textContent = '';
  $('pp-pass-error').textContent = '';
  $('pp-cur-pass').value = '';
  $('pp-new-pass').value = '';
}

function closeProfilePanel() {
  $('profile-panel').classList.add('hidden');
  $('profile-backdrop').classList.add('hidden');
}

function refreshProfilePanel() {
  const preview = $('pp-avatar-preview');
  if (!preview) return;
  applyAvatarToEl(preview, me);
  preview.style.background = me.avatar ? 'transparent' : userColor(me.id);
  $('pp-avatar-remove').classList.toggle('hidden', !me.avatar);
  $('pp-uid').textContent = me.uid ? `#${me.uid}` : '';

  const list = $('pp-aliases-list');
  list.innerHTML = '';
  for (const alias of (me.aliases || [me.name])) {
    const row = mk('div', { className:'pp-alias-row' + (alias === me.name ? ' active' : '') });
    const dot = mk('div', { className:'pp-alias-dot' });
    const nameSpan = mk('span', { className:'pp-alias-name', textContent:alias });
    row.append(dot, nameSpan);
    if (alias === me.name) {
      row.appendChild(mk('span', { className:'pp-alias-badge', textContent:'active' }));
    } else {
      row.title = 'Switch to this name';
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => switchToAlias(alias));
    }
    list.appendChild(row);
  }
}

// ── Name changes ──────────────────────────────────────────────────────────
async function saveProfileName() {
  const newName = $('pp-name-input').value.trim();
  if (!newName || newName === me.name) { closeProfilePanel(); return; }
  $('pp-name-error').textContent = '';
  try {
    const res  = await apiFetch('/api/profile', { method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId:me.id, name:newName }) });
    const data = await res.json();
    if (!res.ok) { $('pp-name-error').textContent = data.error; return; }
    me = data; profileCache.set(me.id, me);
    updateMyProfileBtn(); refreshProfilePanel();
  } catch { $('pp-name-error').textContent = 'Failed to save'; }
}

async function switchToAlias(alias) {
  $('pp-name-error').textContent = '';
  try {
    const res  = await apiFetch('/api/profile', { method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId:me.id, name:alias }) });
    const data = await res.json();
    if (!res.ok) { $('pp-name-error').textContent = data.error; return; }
    me = data; profileCache.set(me.id, me);
    updateMyProfileBtn(); refreshProfilePanel();
    $('pp-name-input').value = me.name;
  } catch { $('pp-name-error').textContent = 'Failed to switch'; }
}

// ── Avatar ────────────────────────────────────────────────────────────────
function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const MAX = 256;
      const canvas = mk('canvas');
      const scale  = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      uploadAvatar(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

async function uploadAvatar(dataUrl) {
  try {
    const res  = await apiFetch('/api/profile', { method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId:me.id, avatar:dataUrl }) });
    const data = await res.json();
    if (!res.ok) return;
    me = data; profileCache.set(me.id, me);
    updateMyProfileBtn(); refreshProfilePanel();
  } catch {}
}

async function removeAvatar() {
  try {
    const res  = await apiFetch('/api/profile', { method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId:me.id, avatar:null }) });
    const data = await res.json();
    if (!res.ok) return;
    me = data; profileCache.set(me.id, me);
    updateMyProfileBtn(); refreshProfilePanel();
  } catch {}
}

// ── Password change ───────────────────────────────────────────────────────
async function savePassword() {
  const currentPassword = $('pp-cur-pass').value;
  const newPassword     = $('pp-new-pass').value;
  $('pp-pass-error').textContent = '';
  if (!currentPassword) { $('pp-pass-error').textContent = 'Enter your current password'; return; }
  if (!newPassword || newPassword.length < 4) {
    $('pp-pass-error').textContent = 'New password must be at least 4 characters'; return;
  }
  try {
    const res  = await apiFetch('/api/profile', { method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId:me.id, currentPassword, newPassword }) });
    const data = await res.json();
    if (!res.ok) { $('pp-pass-error').textContent = data.error; return; }
    $('pp-cur-pass').value = '';
    $('pp-new-pass').value = '';
    $('pp-pass-error').style.color = '#4ade80';
    $('pp-pass-error').textContent = 'Password updated';
    setTimeout(() => { $('pp-pass-error').textContent = ''; $('pp-pass-error').style.color = ''; }, 2500);
  } catch { $('pp-pass-error').textContent = 'Failed to update'; }
}
