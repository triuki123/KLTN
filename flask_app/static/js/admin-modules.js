/* All original administration modules restored for the Flask interface. */
const restoredAdminModules = [
  ['orders', 'Đơn hàng'], ['customers', 'Khách hàng'], ['books', 'Sách'],
  ['categories', 'Danh mục'], ['authors', 'Tác giả'], ['publishers', 'Nhà xuất bản'],
  ['inventory', 'Tồn kho'], ['imports', 'Nhập sách'], ['suppliers', 'Nhà cung cấp'],
  ['history', 'Lịch sử kho'], ['coupons', 'Mã giảm giá'], ['reviews', 'Đánh giá'],
  ['reports', 'Thống kê'], ['logs', 'Nhật ký hoạt động'], ['account', 'Tài khoản quản trị']
];

function restoredSidebar() {
  return `<aside class="admin-side"><h3>TRẠM SÁCH</h3><small>ADMIN PORTAL</small><hr><a href="/admin">Dashboard</a>${restoredAdminModules.map(([path, label]) => `<a href="/admin/${path}">${label}</a>`).join('')}</aside>`;
}

async function restoreAdminHeader() {
  const user = await api('/api/session');
  if (!user?.id || user.role !== 'ADMIN') return;
  document.querySelector('#account-nav').innerHTML = `<a href="/admin">Quản trị</a><a href="/account">${esc(user.name)}</a><a href="/orders">Đơn hàng</a><a class="cart" href="/cart">Giỏ hàng</a><button class="pill light" onclick="logout()">Thoát</button>`;
}

async function restoreAdminModules() {
  const sidebar = restoredSidebar();
  if (moduleName === 'dashboard') {
    app.innerHTML = `<section class="shell admin-layout">${sidebar}<div class="admin-content"><span class="eyebrow">Quản trị</span><h1 class="page-title">Tổng quan hệ thống</h1><p class="mb-4">Tất cả module được quản lý bằng Flask và dữ liệu MySQL.</p><div class="book-grid">${restoredAdminModules.map(([path, label]) => `<a class="panel form-card" href="/admin/${path}"><b>${label}</b><small class="d-block mt-2">Mở module →</small></a>`).join('')}</div></div></section>`;
    return;
  }
  const special = ['inventory', 'orders', 'history'].includes(moduleName);
  const rows = await api(special ? `/api/admin/${moduleName}` : `/api/admin/data/${moduleName}`);
  if (!special) { renderGenericAdmin(rows, sidebar, restoredAdminModules); return; }
  let content = '';
  if (moduleName === 'inventory') content = `<button class="btn-brand mb-3" onclick="inventoryForm()">+ Nhập hàng</button><div id="form-slot"></div><div class="panel table-responsive"><table class="admin-table"><tr><th>Mã</th><th>Sách</th><th>Tồn</th><th>Tối thiểu</th><th>Đã bán</th></tr>${rows.map(row => `<tr><td>${esc(row.work_id)}</td><td>${esc(row.title)}<small>${esc(row.authors)}</small></td><td><b>${row.stock_quantity}</b></td><td>${row.minimum_stock}</td><td>${row.sold_count}</td></tr>`).join('')}</table></div>`;
  if (moduleName === 'orders') content = `<div class="panel table-responsive"><table class="admin-table"><tr><th>Mã</th><th>Khách</th><th>Tổng</th><th>Trạng thái</th></tr>${rows.map(row => `<tr><td>${esc(row.order_code)}</td><td>${esc(row.customer)}</td><td>${money(row.total_amount)}</td><td><select onchange="setStatus(${row.id},this.value)">${['PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','CANCELLED'].map(status => `<option ${status === row.status ? 'selected' : ''}>${status}</option>`).join('')}</select></td></tr>`).join('')}</table></div>`;
  if (moduleName === 'history') content = `<div class="panel table-responsive"><table class="admin-table"><tr><th>Thời gian</th><th>Sách</th><th>Loại</th><th>Trước</th><th>Thay đổi</th><th>Sau</th></tr>${rows.map(row => `<tr><td>${new Date(row.created_at).toLocaleString('vi-VN')}</td><td>${esc(row.title)}</td><td>${esc(row.transaction_type)}</td><td>${row.quantity_before}</td><td>${row.quantity_change}</td><td>${row.quantity_after}</td></tr>`).join('')}</table></div>`;
  const title = moduleName === 'inventory' ? 'Tồn kho' : moduleName === 'orders' ? 'Đơn hàng' : 'Lịch sử kho';
  app.innerHTML = `<section class="shell admin-layout">${sidebar}<div class="admin-content"><span class="eyebrow">Quản trị</span><h1 class="page-title">${title}</h1>${content}</div></section>`;
}

restoreAdminHeader();
if (document.body.dataset.page === 'admin') restoreAdminModules().catch(error => {
  app.innerHTML = `<section class="shell"><p class="message error">${esc(error.message)}</p></section>`;
});
