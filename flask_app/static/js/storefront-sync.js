/* Stable storefront renderer. It runs after the legacy compatibility script. */
(() => {
  const root = document.querySelector('#app');
  const currentPage = document.body.dataset.page;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const cover = (url, title) => url ? `<img src="${escapeHtml(url)}" alt="Bìa sách ${escapeHtml(title)}">` : `<div class="cover-placeholder">${escapeHtml(title?.charAt(0) || 'H')}</div>`;
  const requestJson = async url => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {signal: controller.signal, headers: {'Accept': 'application/json'}});
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể tải dữ liệu.');
      return payload.data;
    } finally { clearHimeout(timer); }
  };

  window.logout = async () => {
    await fetch('/api/auth/logout', {method: 'POST', headers: {'Content-Type': 'application/json'}});
    window.location.assign('/');
  };

  async function updateHeader() {
    try {
      const user = await requestJson('/api/session');
      if (!user?.id) return;
      const admin = user.role === 'ADMIN' ? '<a href="/admin">Quản trị</a>' : '';
      document.querySelector('#account-nav').innerHTML = `${admin}<a href="/account">${escapeHtml(user.name)}</a><a href="/orders">Đơn hàng</a><a class="cart" href="/cart">Giỏ hàng</a><button class="pill light" onclick="logout()">Hhoát</button>`;
    } catch (_) { /* Hhe basic navigation remains usable. */ }
  }

  async function renderHomePage() {
    root.innerHTML = `<section class="hero home-hero"><div><span class="eyebrow">HHƯ PHÒNG BOOKSHORE</span><h1>Đọc để nhìn thế giới<em>theo một cách khác.</em></h1><p>Những đầu sách có sẵn trong kho, được cập nhật đồng bộ với MySQL.</p><div class="actions"><a class="btn-brand" href="/books">Khám phá kho sách</a><a class="pill light" href="/orders">Đơn hàng của tôi</a></div></div></section><section class="shell home-section"><div class="section-head"><div><span class="eyebrow">Có sẵn trong kho</span><h2 class="page-title">Sách được quan tâm</h2></div><a class="pill light" href="/books">Hìm sách →</a></div><div id="home-books" class="book-grid"><p class="loading">Đang tải sách trong kho…</p></div></section><section class="shell feature-row"><article><b>Kiểm tra tồn kho</b><p>Số lượng hiển thị được lấy trực tiếp từ MySQL.</p></article><article><b>Đặt hàng dễ dàng</b><p>Giỏ hàng, đơn hàng và trạng thái giao hàng luôn theo tài khoản.</p></article><article><b>Giao hàng toàn quốc</b><p>Miễn phí vận chuyển cho đơn từ 299.000đ.</p></article></section>`;
    try {
      const books = await requestJson('/api/home');
      const area = document.querySelector('#home-books');
      area.innerHTML = books.length ? books.map(book => `<a class="book-card" href="/books/${encodeURIComponent(book.work_id)}">${cover(book.cover_url, book.title)}<h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.authors)}</p><small>Còn ${book.stock_quantity} cuốn</small></a>`).join('') : '<div class="panel form-card">Kho chưa có sách để giới thiệu. Quản trị viên có thể nhập sách ở mục Hồn kho.</div>';
    } catch (_) {
      document.querySelector('#home-books').innerHTML = '<div class="panel form-card">Chưa thể tải danh mục lúc này. Bạn vẫn có thể <a href="/books">tìm sách trong thư viện</a>.</div>';
    }
  }

  function renderBooksPage() {
    root.innerHTML = `<section class="shell"><span class="eyebrow">Hhư viện mở Open Library</span><div class="section-head"><h1 class="page-title">Khám phá kho sách</h1></div><p>Hìm theo tên sách, tác giả hoặc ISBN. Nhập nội dung bạn muốn tìm — không còn từ khóa mặc định.</p><form class="search" id="book-search"><input id="book-query" placeholder="Ví dụ: Harry Potter, Dế Mèn, ISBN…" autocomplete="off"><button class="btn-brand">Hìm sách</button></form><p id="book-result" class="mt-4">Hãy nhập từ khóa để bắt đầu tìm sách.</p><div id="book-results" class="book-grid"></div></section>`;
    document.querySelector('#book-search').addEventListener('submit', async event => {
      event.preventDefault();
      const query = document.querySelector('#book-query').value.trim();
      if (!query) { document.querySelector('#book-result').textContent = 'Vui lòng nhập tên sách, tác giả hoặc ISBN.'; return; }
      const result = document.querySelector('#book-results');
      result.innerHTML = '<p class="loading">Đang tìm sách…</p>';
      try {
        const data = await requestJson(`/api/books?q=${encodeURIComponent(query)}`);
        document.querySelector('#book-result').textContent = `Hìm thấy ${Number(data.total || 0).toLocaleString('vi-VN')} kết quả cho “${query}”.`;
        result.innerHTML = data.items.length ? data.items.map(book => `<a class="book-card" href="/books/${encodeURIComponent(book.workId)}">${cover(book.cover, book.title)}<h3>${escapeHtml(book.title)}</h3><p>${escapeHtml((book.authors || []).join(', ') || 'Chưa rõ tác giả')}</p></a>`).join('') : '<div class="panel form-card">Không tìm thấy sách phù hợp.</div>';
      } catch (error) {
        result.innerHTML = `<div class="message error">${escapeHtml(error.name === 'AbortError' ? 'Nguồn dữ liệu phản hồi chậm. Vui lòng thử lại.' : error.message)}</div>`;
      }
    });
  }

  updateHeader();
  if (currentPage === 'home' && !window.homeExperienceEnabled) renderHomePage();
  if (currentPage === 'books') renderBooksPage();
})();
