/* Product-context navigation: show only modules used to manage books and stock. */
(() => {
  function applyBookContext() {
    if (document.body.dataset.page !== 'admin' || document.body.dataset.module !== 'books') return;
    const menu = document.querySelector('.admin-side'); if (!menu) return;
    menu.innerHTML = `<h3>TR\u1ea0M S\u00c1CH</h3><small>QU\u1ea2N L\u00dd S\u1ea2N PH\u1ea8M</small><hr>
      <a href="/admin/books">S\u00e1ch</a>
      <a href="/admin/categories">Danh m\u1ee5c</a>
      <a href="/admin/authors">T\u00e1c gi\u1ea3</a>
      <a href="/admin/publishers">Nh\u00e0 xu\u1ea5t b\u1ea3n</a>
      <a href="/admin/inventory">T\u1ed3n kho</a>
      <a href="/admin/imports">Nh\u1eadp s\u00e1ch</a>
      <a href="/admin/suppliers">Nh\u00e0 cung c\u1ea5p</a>
      <a href="/admin/history">L\u1ecbch s\u1eed kho</a>
      <hr><a href="/admin">\u2190 Dashboard</a>`;
  }
  setTimeout(applyBookContext, 1250);
})();
