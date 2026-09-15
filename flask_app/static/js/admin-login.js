(() => {
  const root = document.querySelector('#app');
  const text = {
    title: '\u0110\u0103ng nh\u1eadp qu\u1ea3n tr\u1ecb',
    loading: '\u0110ang x\u00e1c th\u1ef1c\u2026',
    incomplete: 'Vui l\u00f2ng nh\u1eadp email v\u00e0 m\u1eadt kh\u1ea9u.',
    denied: 'T\u00e0i kho\u1ea3n n\u00e0y kh\u00f4ng c\u00f3 quy\u1ec1n qu\u1ea3n tr\u1ecb.',
    failed: '\u0110\u0103ng nh\u1eadp th\u1ea5t b\u1ea1i. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i email v\u00e0 m\u1eadt kh\u1ea9u.'
  };
  const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function request(url, options = {}) {
    const response = await fetch(url, {credentials:'same-origin', headers:{'Content-Type':'application/json', ...(options.headers || {})}, ...options});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error('request-failed');
    return payload.data;
  }

  function render(message = '', isError = false) {
    root.innerHTML = `<section class="admin-login-card"><div class="eyebrow">Tr\u1ea1m S\u00e1ch &middot; Admin portal</div><h1>${text.title}</h1><p>Khu v\u1ef1c n\u1ed9i b\u1ed9, ch\u1ec9 d\u00e0nh cho qu\u1ea3n tr\u1ecb vi\u00ean \u0111\u01b0\u1ee3c c\u1ea5p quy\u1ec1n.</p><form id="admin-login-form" novalidate><label for="admin-email">Email qu\u1ea3n tr\u1ecb</label><input id="admin-email" type="email" autocomplete="username" required><label for="admin-password">M\u1eadt kh\u1ea9u</label><input id="admin-password" type="password" autocomplete="current-password" required><div id="login-message">${message ? `<div class="message${isError ? ' error' : ''}">${esc(message)}</div>` : ''}</div><button class="btn-brand" type="submit">\u0110\u0103ng nh\u1eadp an to\u00e0n</button></form><a class="back-store" href="/">&larr; Tr\u1edf v\u1ec1 c\u1eeda h\u00e0ng</a></section>`;
    root.querySelector('#admin-login-form').addEventListener('submit', submit);
  }

  async function submit(event) {
    event.preventDefault();
    const email = root.querySelector('#admin-email').value.trim();
    const password = root.querySelector('#admin-password').value;
    const message = root.querySelector('#login-message');
    if (!email || !password) { message.innerHTML = `<div class="message error">${text.incomplete}</div>`; return; }
    const button = root.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = text.loading;
    try {
      const user = await request('/api/auth/login', {method:'POST', body:JSON.stringify({email,password})});
      if (user.role !== 'ADMIN') { await fetch('/api/auth/logout', {method:'POST',credentials:'same-origin'}); throw new Error('denied'); }
      location.replace('/admin');
    } catch (error) {
      message.innerHTML = `<div class="message error">${error.message === 'denied' ? text.denied : text.failed}</div>`;
      button.disabled = false; button.textContent = '\u0110\u0103ng nh\u1eadp an to\u00e0n';
    }
  }

  request('/api/session').then(user => { if (user?.role === 'ADMIN') location.replace('/admin'); else render(); }).catch(() => render());
})();
