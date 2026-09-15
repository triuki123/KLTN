/* Dedicated manual book-entry module for the Flask admin portal. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const request = async (url, options = {}) => {
    const response = await fetch(url, {headers: {'Content-Type': 'application/json'}, ...options});
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Khong the luu du lieu.');
    return payload.data;
  };
  const sidebar = () => `<aside class="admin-side"><h3>TRAM SACH</h3><small>ADMIN PORTAL</small><hr><a href="/admin">Dashboard</a><a href="/admin/orders">Don hang</a><a href="/admin/customers">Khach hang</a><a href="/admin/books">Sach</a><a href="/admin/categories">Danh muc</a><a href="/admin/authors">Tac gia</a><a href="/admin/inventory">Ton kho</a></aside>`;
  async function renderBookAdmin() {
    if (document.body.dataset.page !== 'admin' || document.body.dataset.module !== 'books') return;
    const rows = await request('/api/admin/data/books');
    const table = rows.length ? rows.map(row => `<tr><td>${esc(row.work_id)}</td><td><b>${esc(row.title)}</b><small>${esc(row.authors)}</small></td><td>${row.stock_quantity}</td><td>${row.minimum_stock}</td><td>${row.sold_count}</td></tr>`).join('') : '<tr><td colspan="5">Chua co sach. Hay them sach dau tien.</td></tr>';
    document.querySelector('#app').innerHTML = `<section class="shell admin-layout">${sidebar()}<div class="admin-content"><span class="eyebrow">Quan tri / San pham</span><h1 class="page-title">Quan ly sach</h1><p>Moi sach them tai day se luu vao MySQL, tao ton kho ban dau va hien tren trang Sach.</p><form id="manual-book-form" class="panel form-card mb-4"><div class="row"><label class="col-md-4">Ma sach *<input name="workId" required placeholder="VD: TP-BOOK-001"></label><label class="col-md-8">Ten sach *<input name="title" required></label><label class="col-md-6">Tac gia *<input name="authors" required></label><label class="col-md-6">URL anh bia (tuy chon)<input name="coverUrl" type="url"></label><label class="col-md-4">So luong ton ban dau *<input name="stockQuantity" type="number" min="0" value="10" required></label><label class="col-md-4">Muc ton toi thieu<input name="minimumStock" type="number" min="0" value="5" required></label><label class="col-md-4">Ghi chu nhap kho<input name="reason" value="Nhap sach moi"></label></div><div id="book-message"></div><button class="btn-brand">+ Luu sach vao MySQL</button></form><div class="panel table-responsive"><table class="admin-table"><tr><th>Ma</th><th>Sach / Tac gia</th><th>Ton kho</th><th>Toi thieu</th><th>Da ban</th></tr>${table}</table></div></div></section>`;
    document.querySelector('#manual-book-form').addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.querySelector('#book-message');
      try {
        await request('/api/admin/data/books', {method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});
        message.innerHTML = '<p class="message">Da luu sach va ton kho thanh cong.</p>';
        setTimeout(renderBookAdmin, 350);
      } catch (error) { message.innerHTML = `<p class="message error">${esc(error.message)}</p>`; }
    });
  }
  setTimeout(() => renderBookAdmin().catch(error => console.error(error)), 300);
})();
