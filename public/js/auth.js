/* ── Auth — login screen, session check ──────────────────────────────────
   Runs last (after all other modules) because it fires the boot sequence.
──────────────────────────────────────────────────────────────────────────── */

(async () => {
  try {
    const res = await apiFetch('/api/session');
    if (res.ok) {
      buildChatScreen();
      reveal();
      enterChat(await res.json());
      return;
    }
  } catch {}
  buildLoginScreen();
  reveal();
})();

// ── Login screen ──────────────────────────────────────────────────────────
function buildLoginScreen() {
  const root = $('root');
  root.innerHTML = '';

  const screen = mk('div', { id:'login-screen' });
  const box    = mk('div', { className:'login-box' });

  const nameIn = mk('input', { id:'name-input', type:'text', placeholder:'your name',
    maxLength:32, autocomplete:'off' });
  nameIn.spellcheck = false;

  const passIn = mk('input', { id:'password-input', type:'password',
    placeholder:'password', maxLength:128, autocomplete:'current-password' });

  const btn = mk('button', { id:'join-btn', textContent:'join' });
  const err = mk('span',   { id:'login-error', className:'error' });

  box.append(nameIn, passIn, btn, err);
  screen.appendChild(box);
  root.appendChild(screen);

  btn.addEventListener('click', doLogin);
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') passIn.focus(); });
  passIn.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  nameIn.focus();
}

async function doLogin() {
  const name     = $('name-input').value.trim();
  const password = $('password-input').value;
  if (!name)     return;
  if (!password) { $('login-error').textContent = 'Password required'; return; }
  $('login-error').textContent = '';
  try {
    const res  = await apiFetch('/api/auth', { method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ name, password }) });
    const data = await res.json();
    if (!res.ok) { $('login-error').textContent = data.error; return; }
    buildChatScreen();
    enterChat(data);
  } catch { $('login-error').textContent = 'Connection error'; }
}
