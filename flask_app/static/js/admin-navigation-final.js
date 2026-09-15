/* Main admin navigation stays concise; book-related tools live inside the Books hub. */
(() => {
  const mainMenu = () => `<h3>TR\u1ea0M S\u00c1CH</h3><small>ADMIN PORTAL</small><hr>
    <a href="/admin">Dashboard</a><a href="/admin/orders">\u0110\u01a1n h\u00e0ng</a><a href="/admin/customers">Kh\u00e1ch h\u00e0ng</a>
    <a href="/admin/books">S\u00e1ch</a><a href="/admin/coupons">M\u00e3 gi\u1ea3m gi\u00e1</a><a href="/admin/reviews">\u0110\u00e1nh gi\u00e1</a>
    <a href="/admin/reports">Th\u1ed1ng k\u00ea</a><a href="/admin/logs">Nh\u1eadt k\u00fd</a><a href="/admin/account">T\u00e0i kho\u1ea3n</a>`;
  const bookTools = `<nav id="book-tools" class="d-flex flex-wrap gap-2 mb-4"><a class="pill light" href="/admin/books">S\u00e1ch</a><a class="pill light" href="/admin/categories">Danh m\u1ee5c</a><a class="pill light" href="/admin/authors">T\u00e1c gi\u1ea3</a><a class="pill light" href="/admin/publishers">Nh\u00e0 xu\u1ea5t b\u1ea3n</a><a class="pill light" href="/admin/inventory">T\u1ed3n kho</a><a class="pill light" href="/admin/imports">Nh\u1eadp s\u00e1ch</a><a class="pill light" href="/admin/suppliers">Nh\u00e0 cung c\u1ea5p</a><a class="pill light" href="/admin/history">L\u1ecbch s\u1eed kho</a></nav>`;
  function apply() {
    if (document.body.dataset.page !== 'admin') return;
    if (document.body.dataset.module === 'dashboard') {
      const modules = [['orders','\u0110\u01a1n h\u00e0ng'],['customers','Kh\u00e1ch h\u00e0ng'],['books','S\u00e1ch'],['coupons','M\u00e3 gi\u1ea3m gi\u00e1'],['reviews','\u0110\u00e1nh gi\u00e1'],['reports','Th\u1ed1ng k\u00ea'],['logs','Nh\u1eadt k\u00fd'],['account','T\u00e0i kho\u1ea3n']];
      document.querySelector('#app').innerHTML = `<section class="shell admin-layout"><aside class="admin-side">${mainMenu()}</aside><div class="admin-content"><span class="eyebrow">Qu\u1ea3n tr\u1ecb</span><h1 class="page-title">T\u1ed5ng quan h\u1ec7 th\u1ed1ng</h1><p class="mb-4">Ch\u1ecdn nh\u00f3m nghi\u1ec7p v\u1ee5. C\u00e1c c\u00f4ng c\u1ee5 v\u1ec1 danh m\u1ee5c, t\u00e1c gi\u1ea3 v\u00e0 t\u1ed3n kho n\u1eb1m trong S\u00e1ch.</p><div class="book-grid">${modules.map(([path,label]) => `<a class="panel form-card" href="/admin/${path}"><b>${label}</b><small class="d-block mt-2">M\u1edf module \u2192</small></a>`).join('')}</div></div></section>`;
      document.documentElement.classList.add('admin-ready');
      return;
    }
    const side = document.querySelector('.admin-side'); if (side) side.innerHTML = mainMenu();
    if (document.body.dataset.module === 'books') {
      const content = document.querySelector('.admin-content');
      if (content && !document.querySelector('#book-tools')) {
        const title = content.querySelector('.page-title');
        if (title) title.insertAdjacentHTML('afterend', bookTools);
      }
    }
    document.documentElement.classList.add('admin-ready');
  }
  setTimeout(apply, 1450);
})();
