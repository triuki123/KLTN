/* ASCII source with Unicode escapes keeps Vietnamese text correct on every Windows code page. */
(() => {
  const vn = {
    admin: 'Qu\u1ea3n tr\u1ecb', products: 'S\u1ea3n ph\u1ea9m', title: 'Qu\u1ea3n l\u00fd s\u00e1ch',
    intro: 'M\u1ed7i s\u00e1ch th\u00eam t\u1ea1i \u0111\u00e2y s\u1ebd l\u01b0u v\u00e0o MySQL, t\u1ea1o t\u1ed3n kho ban \u0111\u1ea7u v\u00e0 hi\u1ec7n tr\u00ean trang S\u00e1ch.',
    code: 'M\u00e3 s\u00e1ch', name: 'T\u00ean s\u00e1ch', author: 'T\u00e1c gi\u1ea3', cover: 'URL \u1ea3nh b\u00eca (t\u00f9y ch\u1ecdn)',
    opening: 'S\u1ed1 l\u01b0\u1ee3ng t\u1ed3n ban \u0111\u1ea7u', minimum: 'M\u1ee9c t\u1ed3n t\u1ed1i thi\u1ec3u', note: 'Ghi ch\u00fa nh\u1eadp kho',
    save: 'L\u01b0u s\u00e1ch v\u00e0o MySQL', saved: '\u0110\u00e3 l\u01b0u s\u00e1ch v\u00e0 t\u1ed3n kho th\u00e0nh c\u00f4ng.',
    stock: 'T\u1ed3n kho', sold: '\u0110\u00e3 b\u00e1n', dashboard: 'Dashboard', orders: '\u0110\u01a1n h\u00e0ng', customers: 'Kh\u00e1ch h\u00e0ng', categories: 'Danh m\u1ee5c', inventory: 'T\u1ed3n kho'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const call = async (url, options = {}) => { const response = await fetch(url, {headers:{'Content-Type':'application/json'}, ...options}); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || 'Kh\u00f4ng th\u1ec3 l\u01b0u d\u1eef li\u1ec7u.'); return payload.data; };
  const nav = () => `<aside class="admin-side"><h3>TR\u1ea0M S\u00c1CH</h3><small>ADMIN PORTAL</small><hr><a href="/admin">${vn.dashboard}</a><a href="/admin/orders">${vn.orders}</a><a href="/admin/customers">${vn.customers}</a><a href="/admin/books">S\u00e1ch</a><a href="/admin/categories">${vn.categories}</a><a href="/admin/authors">T\u00e1c gi\u1ea3</a><a href="/admin/inventory">${vn.inventory}</a></aside>`;
  async function draw() {
    if (document.body.dataset.page !== 'admin' || document.body.dataset.module !== 'books') return;
    const user = await call('/api/session');
    if (user?.id) document.querySelector('#account-nav').innerHTML = `<a href="/admin">${vn.admin}</a><a href="/account">${esc(user.name)}</a><a href="/orders">${vn.orders}</a><a class="cart" href="/cart">Gi\u1ecf h\u00e0ng</a><button class="pill light" onclick="logout()">Tho\u00e1t</button>`;
    const rows = await call('/api/admin/data/books');
    const listing = rows.length ? rows.map(row => `<tr><td>${esc(row.work_id)}</td><td><b>${esc(row.title)}</b><small>${esc(row.authors)}</small></td><td>${row.stock_quantity}</td><td>${row.minimum_stock}</td><td>${row.sold_count}</td></tr>`).join('') : `<tr><td colspan="5">Ch\u01b0a c\u00f3 s\u00e1ch. H\u00e3y th\u00eam s\u00e1ch \u0111\u1ea7u ti\u00ean.</td></tr>`;
    document.querySelector('#app').innerHTML = `<section class="shell admin-layout">${nav()}<div class="admin-content"><span class="eyebrow">${vn.admin} / ${vn.products}</span><h1 class="page-title">${vn.title}</h1><p>${vn.intro}</p><form id="book-entry" class="panel form-card mb-4"><div class="row"><label class="col-md-4">${vn.code} *<input name="workId" required placeholder="VD: TP-BOOK-001"></label><label class="col-md-8">${vn.name} *<input name="title" required></label><label class="col-md-6">${vn.author} *<input name="authors" required></label><label class="col-md-6">${vn.cover}<input name="coverUrl" type="url"></label><label class="col-md-4">${vn.opening} *<input name="stockQuantity" type="number" min="0" value="10" required></label><label class="col-md-4">${vn.minimum}<input name="minimumStock" type="number" min="0" value="5" required></label><label class="col-md-4">${vn.note}<input name="reason" value="Nh\u1eadp s\u00e1ch m\u1edbi"></label></div><div id="book-status"></div><button class="btn-brand">+ ${vn.save}</button></form><div class="panel table-responsive"><table class="admin-table"><tr><th>M\u00e3</th><th>S\u00e1ch / ${vn.author}</th><th>${vn.stock}</th><th>T\u1ed1i thi\u1ec3u</th><th>${vn.sold}</th></tr>${listing}</table></div></div></section>`;
    document.querySelector('#book-entry').onsubmit = async event => { event.preventDefault(); const status = document.querySelector('#book-status'); try { await call('/api/admin/data/books', {method:'POST', body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))}); status.innerHTML=`<p class="message">${vn.saved}</p>`; setTimeout(draw, 350); } catch (error) { status.innerHTML=`<p class="message error">${esc(error.message)}</p>`; } };
  }
  setTimeout(() => draw().catch(console.error), 700);
})();
