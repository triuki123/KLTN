/* Single-pass Flask admin UI: stable navigation with module-specific workflows. */
(() => {
  const root = document.querySelector('#app');
  let currentModule = document.body.dataset.module || 'dashboard';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  const api = async (url, options = {}) => {
    const response = await fetch(url, {headers:{'Content-Type':'application/json'}, ...options});
    const payload = await response.json().catch(() => ({success:false,message:'Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.'}));
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể tải dữ liệu.');
    return payload.data;
  };

  const showAdminPopup = (title, message, type = 'error') => {
    document.querySelector('.admin-feedback-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = `admin-feedback-modal is-${type}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'admin-feedback-title');
    modal.innerHTML = `<div class="admin-feedback-backdrop"></div><section class="admin-feedback-card"><span class="admin-feedback-icon" aria-hidden="true">${type==='success'?'✓':'!'}</span><div><h3 id="admin-feedback-title">${esc(title)}</h3><p>${esc(message)}</p></div><button type="button">Đóng</button></section>`;
    const close = () => modal.remove();
    modal.querySelector('button').onclick = close;
    modal.querySelector('.admin-feedback-backdrop').onclick = close;
    document.body.append(modal);
    modal.querySelector('button').focus();
  };

  const navItems = [
    { key: 'dashboard', href: '/admin', label: 'Dashboard', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
    { key: 'orders', href: '/admin/orders', label: 'Đơn hàng', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-2z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>' },
    { key: 'customers', href: '/admin/customers', label: 'Khách hàng', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
    { key: 'books', href: '/admin/books', label: 'Sách & Kho', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>' },
    { key: 'coupons', href: '/admin/coupons', label: 'Mã giảm giá', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>' },
    { key: 'reviews', href: '/admin/reviews', label: 'Đánh giá', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
    { key: 'reports', href: '/admin/reports', label: 'Thống kê', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>' },
    { key: 'logs', href: '/admin/logs', label: 'Nhật ký', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' },
    { key: 'account', href: '/admin/account', label: 'Tài khoản', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' }
  ];

  // SPA Top Loading Progress Bar
  const progressBar = (() => {
    let bar = document.querySelector('#admin-top-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'admin-top-progress';
      document.body.prepend(bar);
    }
    return {
      start() {
        bar.style.opacity = '1';
        bar.style.width = '35%';
      },
      done() {
        bar.style.width = '100%';
        setTimeout(() => {
          bar.style.opacity = '0';
          setTimeout(() => { bar.style.width = '0%'; }, 250);
        }, 180);
      }
    };
  })();

  const isBookSub = (mod) => ['books','categories','authors','publishers','inventory','imports','suppliers','history','combos'].includes(mod);

  const mainMenu = (mod = currentModule) => `<aside class="admin-side"><div class="admin-side-brand"><span class="admin-brand-icon">📚</span><div><h3>TRẠM SÁCH</h3><small class="admin-portal-badge">ADMIN PORTAL</small></div></div><hr class="admin-side-divider"><nav class="admin-side-nav">${navItems.map(item=>{const active=mod===item.key||(item.key==='books'&&isBookSub(mod));return `<a href="${item.href}" class="${active?'active':''}" data-nav-key="${item.key}">${item.icon}<span>${item.label}</span></a>`;}).join('')}</nav></aside>`;

  const bookNavList = [
    { path: 'books', label: 'Sách' },
    { path: 'categories', label: 'Danh mục' },
    { path: 'authors', label: 'Tác giả' },
    { path: 'publishers', label: 'Nhà xuất bản' },
    { path: 'inventory', label: 'Tồn kho' },
    { path: 'imports', label: 'Nhập sách' },
    { path: 'suppliers', label: 'Nhà cung cấp' },
    { path: 'history', label: 'Lịch sử kho' },
    { path: 'combos', label: 'Combo sách' }
  ];

  const getBookTools = (mod = currentModule) => `<nav class="admin-subnav" role="tablist">${bookNavList.map(item => `<a class="admin-subnav-item ${mod === item.path ? 'active' : ''}" href="/admin/${item.path}" data-subnav-path="${item.path}" role="tab" aria-selected="${mod === item.path}">${item.label}</a>`).join('')}</nav>`;
  let bookTools = getBookTools(currentModule);

  const titles = {customers:'Khách hàng',coupons:'Mã giảm giá',reviews:'Đánh giá',reports:'Thống kê',logs:'Nhật ký',account:'Tài khoản',categories:'Danh mục',authors:'Tác giả',publishers:'Nhà xuất bản',inventory:'Tồn kho',imports:'Nhập sách',suppliers:'Nhà cung cấp',history:'Lịch sử kho',combos:'Combo sách'};

  // Update sidebar active highlights without destroying DOM tree
  function updateSidebarActive(mod) {
    const isSub = isBookSub(mod);
    document.querySelectorAll('.admin-side-nav a').forEach(a => {
      const key = a.dataset.navKey || a.getAttribute('href').replace('/admin/', '').replace('/admin', '') || 'dashboard';
      const isActive = (key === mod) || (key === 'books' && isSub);
      a.classList.toggle('active', isActive);
    });
  }

  // Update subnav active pill instantly (0ms) without re-rendering DOM
  function updateSubnavActive(mod) {
    const subnav = root.querySelector('.admin-subnav');
    if (!subnav) return;
    subnav.querySelectorAll('.admin-subnav-item').forEach(item => {
      const p = item.dataset.subnavPath || item.getAttribute('href').replace('/admin/', '').split('?')[0];
      const isActive = (p === mod);
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
  }

  // Persistent Layout Shell: keeps sidebar and subnav bar mounted, only updates inner view
  const layout = content => {
    let sideEl = root.querySelector('.admin-side');
    let contentEl = root.querySelector('.admin-content');
    let subnavSlot = root.querySelector('#admin-subnav-slot');
    let viewEl = root.querySelector('#admin-view');

    // Clean any nested subnav that might be inside content string
    const cleanContent = content.replace(/<nav class="admin-subnav"[\s\S]*?<\/nav>/g, '');
    const isSub = isBookSub(currentModule);

    if (sideEl && contentEl && subnavSlot && viewEl) {
      updateSidebarActive(currentModule);

      // Handle persistent subnav
      if (isSub) {
        subnavSlot.style.display = 'block';
        if (!subnavSlot.querySelector('.admin-subnav')) {
          subnavSlot.innerHTML = getBookTools(currentModule);
        } else {
          updateSubnavActive(currentModule);
        }
      } else {
        subnavSlot.style.display = 'none';
      }

      // Update inner view smoothly without full-page re-layout
      viewEl.innerHTML = cleanContent;
      viewEl.classList.remove('is-loading');
      viewEl.classList.remove('fade-in-subview');
      void viewEl.offsetWidth; // trigger reflow
      viewEl.classList.add('fade-in-subview');
    } else {
      root.innerHTML = `
        <section class="shell admin-layout">
          ${mainMenu(currentModule)}
          <div class="admin-content">
            <div id="admin-subnav-slot" class="admin-subnav-wrapper" style="display:${isSub ? 'block' : 'none'};">
              ${isSub ? getBookTools(currentModule) : ''}
            </div>
            <div id="admin-view" class="admin-view fade-in-subview">
              ${cleanContent}
            </div>
          </div>
        </section>
      `;
    }
  };
  const money = value => new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + '\u0111';
  const date = value => value ? new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '\u2014';

  async function books() {
    const rows = await api('/api/admin/data/books');

    function renderBookRows(list) {
      if (!list.length) return '';
      return list.map(row => {
        const qty = Number(row.stock_quantity || 0);
        const min = Number(row.minimum_stock || 0);
        let stockBadge = '';
        if (qty <= 0) stockBadge = `<span class="stock-badge out-of-stock">Hết hàng</span>`;
        else if (qty <= min) stockBadge = `<span class="stock-badge low-stock">Sắp hết (${qty})</span>`;
        else stockBadge = `<span class="stock-badge in-stock">Còn ${qty}</span>`;

        const hasPromo = Number(row.promotional_price) > 0 && Number(row.promotional_price) < Number(row.selling_price);
        const priceMarkup = hasPromo
          ? `<div class="price-cell"><span class="promo-price">${money(row.promotional_price)}</span><span class="original-price-strike">${money(row.selling_price)}</span></div>`
          : `<div class="price-cell"><span class="selling-price">${money(row.selling_price)}</span></div>`;

        const coverMarkup = row.cover_url
          ? `<img class="book-thumb" src="${esc(row.cover_url)}" alt="${esc(row.title)}" onerror="this.outerHTML='<div class=\\'book-thumb-placeholder\\'>📖</div>'">`
          : `<div class="book-thumb-placeholder">📖</div>`;

        return `<tr>
          <td>${coverMarkup}</td>
          <td>
            <div class="book-meta">
              <h4>${esc(row.title)}</h4>
              <small>${esc(row.authors)}</small>
              <span class="book-code-chip">${esc(row.work_id)}</span>
            </div>
          </td>
          <td>${priceMarkup}</td>
          <td>${stockBadge}</td>
          <td>${min}</td>
          <td>${row.sold_count || 0}</td>
          <td>
            <button type="button" class="btn-edit-book" data-work-id="${esc(row.work_id)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Sửa</span>
            </button>
          </td>
        </tr>`;
      }).join('');
    }

    layout(`
      <div class="admin-page-header">
        <div>
          <span class="eyebrow">Quản trị / Sản phẩm</span>
          <h1 class="page-title">Quản lý sách</h1>
          <p class="admin-page-desc">Danh sách tất cả các đầu sách trong kho, giá bán và tình trạng tồn kho.</p>
        </div>
        <div class="admin-page-actions">
          <button type="button" class="btn-brand" id="btn-toggle-new-book">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Thêm sách mới</span>
          </button>
          <button type="button" class="btn-secondary" id="btn-toggle-openlibrary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            <span>Nhập từ Open Library</span>
          </button>
          <button type="button" class="btn-secondary" id="btn-crawl-tiki" style="background:#0b74e5;color:#fff;border-color:#0b74e5;display:inline-flex;align-items:center;gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Cào sách Tiki (c8322)</span>
          </button>
        </div>
      </div>

      ${bookTools}

      <!-- Form Thêm sách mới (Mặc định ẩn, bật mở khi cần) -->
      <section id="new-book-panel" class="collapsible-panel" style="display:none">
        <div class="panel-header">
          <h3>Thêm đầu sách mới vào kho</h3>
          <button type="button" class="btn-close-panel" id="close-new-book" title="Đóng">✕</button>
        </div>
        <form id="new-book" class="form-card">
          <div class="form-group-title">1. Thông tin cơ bản</div>
          <div class="row">
            <label class="col-md-3">Mã sách *<input name="workId" required placeholder="Ví dụ: OL12345W"></label>
            <label class="col-md-5">Tên sách *<input name="title" required placeholder="Ví dụ: Hoàng tử bé"></label>
            <label class="col-md-4">Tác giả *<input name="authors" required placeholder="Ví dụ: Antoine de Saint-Exupéry"></label>
            <label class="col-md-6">URL ảnh bìa<input name="coverUrl" placeholder="https://..."></label>
          </div>

          <div class="form-group-title">2. Giá bán &amp; Tồn kho</div>
          <div class="row">
            <label class="col-md-3">Giá vốn (VNĐ)<input name="costPrice" type="number" min="0" value="0"></label>
            <label class="col-md-3">Giá bán * (VNĐ)<input name="sellingPrice" type="number" min="1" value="99000" required></label>
            <label class="col-md-3">Giá khuyến mãi<input name="promotionalPrice" type="number" min="0" placeholder="Để trống nếu không giảm"></label>
            <label class="col-md-3">Tồn ban đầu<input name="stockQuantity" type="number" min="0" value="10"></label>
            <label class="col-md-3">Tồn tối thiểu cảnh báo<input name="minimumStock" type="number" min="0" value="5"></label>
            <label class="col-md-9">Ghi chú nhập<input name="reason" value="Nhập sách mới vào kho"></label>
          </div>

          <div id="form-message"></div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn-brand">+ Lưu sách vào kho</button>
            <button type="button" class="btn-secondary" id="cancel-new-book">Hủy</button>
          </div>
        </form>
      </section>

      <div id="edit-slot"></div>
      <div id="openlibrary-slot"></div>

      <!-- Toolbar Tìm kiếm & Lọc -->
      <div class="books-toolbar">
        <div class="books-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="books-search-input" placeholder="Tìm theo tên sách, tác giả, mã sách...">
        </div>
        <div class="books-filter-actions">
          <select id="books-stock-filter" class="books-filter-select">
            <option value="all">Tất cả trạng thái kho</option>
            <option value="in_stock">Còn hàng (tồn &gt; tối thiểu)</option>
            <option value="low_stock">Sắp hết hàng (tồn ≤ tối thiểu)</option>
            <option value="out_of_stock">Hết hàng (tồn = 0)</option>
          </select>
          <span class="books-count-badge" id="books-count-display">${rows.length} đầu sách</span>
        </div>
      </div>

      <!-- Bảng Sách -->
      <div class="books-table-panel table-responsive">
        <table class="books-table admin-table" data-edit-bound="1">
          <thead>
            <tr>
              <th style="width:60px">Bìa</th>
              <th>Sách &amp; Tác giả</th>
              <th>Giá bán</th>
              <th>Tồn kho</th>
              <th>Tối thiểu</th>
              <th>Đã bán</th>
              <th style="width:85px">Thao tác</th>
            </tr>
          </thead>
          <tbody id="books-table-body">
            ${renderBookRows(rows)}
          </tbody>
        </table>
        <div id="books-empty" class="p-4 text-center text-muted" style="display:${rows.length ? 'none' : 'block'}">
          Không tìm thấy sách nào phù hợp.
        </div>
      </div>
    `);

    // Toggle New Book Form
    const newBookPanel = document.querySelector('#new-book-panel');
    const toggleNewBookBtn = document.querySelector('#btn-toggle-new-book');
    const closeNewBookBtn = document.querySelector('#close-new-book');
    const cancelNewBookBtn = document.querySelector('#cancel-new-book');
    const togglePanel = (show) => {
      const willShow = show !== undefined ? show : (newBookPanel.style.display === 'none');
      newBookPanel.style.display = willShow ? 'block' : 'none';
      if (willShow) newBookPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (toggleNewBookBtn) toggleNewBookBtn.onclick = () => togglePanel();
    if (closeNewBookBtn) closeNewBookBtn.onclick = () => togglePanel(false);
    if (cancelNewBookBtn) cancelNewBookBtn.onclick = () => togglePanel(false);

    // Toggle Open Library
    const toggleOlBtn = document.querySelector('#btn-toggle-openlibrary');
    if (toggleOlBtn) {
      toggleOlBtn.onclick = () => {
        if (typeof window.adminToggleOpenLibrary === 'function') window.adminToggleOpenLibrary();
      };
    }

    // Crawl Tiki Button
    const crawlTikiBtn = document.querySelector('#btn-crawl-tiki');
    if (crawlTikiBtn) {
      crawlTikiBtn.onclick = async () => {
        const confirmed = confirm('Bạn có muốn cào thêm sách mới từ Tiki (nhà sách c8322)? Quá trình có thể mất từ 10-20 giây.');
        if (!confirmed) return;
        const origText = crawlTikiBtn.innerHTML;
        crawlTikiBtn.disabled = true;
        crawlTikiBtn.innerHTML = '<span>⏳ Đang cào Tiki...</span>';
        try {
          const res = await api('/api/admin/crawler/tiki', { method: 'POST', body: JSON.stringify({ limit_per_category: 10 }) });
          alert('Cào sách Tiki thành công! ' + (res.message || 'Đã cập nhật sách mới.'));
          location.reload();
        } catch (err) {
          alert('Lỗi khi cào sách Tiki: ' + (err.message || err));
          crawlTikiBtn.disabled = false;
          crawlTikiBtn.innerHTML = origText;
        }
      };
    }

    // Submit New Book
    document.querySelector('#new-book').onsubmit = async event => {
      event.preventDefault();
      try {
        await api('/api/admin/data/books', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
        location.reload();
      } catch(error) {
        document.querySelector('#form-message').innerHTML = `<p class="message error">${esc(error.message)}</p>`;
      }
    };

    // Filter & Search
    const searchInput = document.querySelector('#books-search-input');
    const stockFilter = document.querySelector('#books-stock-filter');
    const countDisplay = document.querySelector('#books-count-display');
    const tableBody = document.querySelector('#books-table-body');
    const emptyBox = document.querySelector('#books-empty');

    const bindEditListeners = () => {
      document.querySelectorAll('.btn-edit-book').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.workId;
          const b = rows.find(item => item.work_id === id);
          if (b && typeof window.adminOpenEditBook === 'function') {
            window.adminOpenEditBook(b);
          }
        };
      });
    };

    const filterBooks = () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      const stockMode = stockFilter.value;
      const filtered = rows.filter(book => {
        const matchQuery = !q || (book.title || '').toLowerCase().includes(q) || (book.authors || '').toLowerCase().includes(q) || (book.work_id || '').toLowerCase().includes(q);
        if (!matchQuery) return false;
        const qty = Number(book.stock_quantity || 0);
        const min = Number(book.minimum_stock || 0);
        if (stockMode === 'out_of_stock') return qty <= 0;
        if (stockMode === 'low_stock') return qty > 0 && qty <= min;
        if (stockMode === 'in_stock') return qty > min;
        return true;
      });
      tableBody.innerHTML = renderBookRows(filtered);
      countDisplay.textContent = `${filtered.length} / ${rows.length} đầu sách`;
      emptyBox.style.display = filtered.length ? 'none' : 'block';
      bindEditListeners();
    };

    if (searchInput) searchInput.addEventListener('input', filterBooks);
    if (stockFilter) stockFilter.addEventListener('change', filterBooks);
    bindEditListeners();
  }

  const orderLabels = {PENDING:'\u0110ang giao',CONFIRMED:'\u0110ang giao',PREPARING:'\u0110ang giao',SHIPPING:'\u0110ang giao',COMPLETED:'\u0110\u00e3 giao',CANCELLED:'\u0110\u00e3 h\u1ee7y'};
  const nextAction = {PENDING:['COMPLETED','X\u00e1c nh\u1eadn \u0111\u00e3 giao'],CONFIRMED:['COMPLETED','X\u00e1c nh\u1eadn \u0111\u00e3 giao'],PREPARING:['COMPLETED','X\u00e1c nh\u1eadn \u0111\u00e3 giao'],SHIPPING:['COMPLETED','X\u00e1c nh\u1eadn \u0111\u00e3 giao']};
  async function orders() {
    const rows = await api('/api/admin/orders-workflow');
    const delivering = rows.filter(row => !['COMPLETED','CANCELLED'].includes(String(row.status || 'PENDING').toUpperCase())).length;
    layout(`<span class="eyebrow">Qu\u1ea3n tr\u1ecb / V\u1eadn h\u00e0nh</span><div class="section-head"><div><h1 class="page-title">\u0110\u01a1n h\u00e0ng</h1><p>Theo d\u00f5i \u0111\u01a1n \u0111ang giao v\u00e0 x\u00e1c nh\u1eadn khi kh\u00e1ch \u0111\u00e3 nh\u1eadn h\u00e0ng.</p></div><div class="admin-order-count">${delivering} \u0111\u01a1n \u0111ang giao</div></div><div id="order-feedback"></div><div class="admin-orders">${rows.map(order => orderCard(order)).join('') || '<div class="panel form-card">Ch\u01b0a c\u00f3 \u0111\u01a1n h\u00e0ng n\u00e0o.</div>'}</div>`);
    document.querySelectorAll('.order-transition').forEach(button => button.onclick = async () => {
      if (!window.confirm('X\u00e1c nh\u1eadn \u0111\u01a1n h\u00e0ng n\u00e0y \u0111\u00e3 giao th\u00e0nh c\u00f4ng?')) return;
      button.disabled = true;
      try { await api(`/api/admin/orders-workflow/${button.dataset.id}`,{method:'PATCH',body:JSON.stringify({status:button.dataset.status})}); await orders(); }
      catch(error) { document.querySelector('#order-feedback').innerHTML=`<p class="message error">${esc(error.message)}</p>`; button.disabled=false; }
    });
  }
  function orderCard(order) {
    const status=String(order.status || 'PENDING').toUpperCase();
    const action=nextAction[status];
    const items=(order.items || []).map(item=>`<div><span>${esc(item.title)} <small>\u00d7 ${item.quantity}</small></span><b>${money(Number(item.unit_price)*Number(item.quantity))}</b></div>`).join('') || '<span>Ch\u01b0a c\u00f3 chi ti\u1ebft s\u1ea3n ph\u1ea9m.</span>';
    return `<article class="panel admin-order-card"><header><div><span class="eyebrow">${esc(order.order_code)}</span><h3>${esc(order.customer)}</h3><small>${date(order.created_at)}</small></div><div class="admin-order-total"><span class="badge-status status-${status==='COMPLETED'?'completed':status==='CANCELLED'?'cancelled':'shipping'}">${orderLabels[status] || esc(status)}</span><b>${money(order.total_amount)}</b></div></header><div class="admin-order-body"><div class="admin-order-meta"><span><b>Ng\u01b0\u1eddi nh\u1eadn:</b> ${esc(order.recipient_name)}</span><span><b>S\u1ed1 \u0111i\u1ec7n tho\u1ea1i:</b> ${esc(order.recipient_phone)}</span><span><b>Thanh to\u00e1n:</b> ${esc(order.payment_method || 'COD')}</span><span class="wide"><b>Giao t\u1edbi:</b> ${esc(order.shipping_address)}</span></div><div class="admin-order-items">${items}</div></div><footer>${action ? `<button class="btn-brand order-transition" data-id="${order.id}" data-status="${action[0]}">${action[1]} \u2192</button>` : `<span class="order-finished">${status==='COMPLETED'?'\u0110\u01a1n h\u00e0ng \u0111\u00e3 giao th\u00e0nh c\u00f4ng.':'\u0110\u01a1n h\u00e0ng \u0111\u00e3 h\u1ee7y.'}</span>`}</footer></article>`;
  }

  const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0111/g,'d').replace(/\u0110/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  async function categories() {
    const rows=await api('/api/admin/data/categories');
    layout(`<span class="eyebrow">Qu\u1ea3n tr\u1ecb / S\u1ea3n ph\u1ea9m</span><h1 class="page-title">Danh m\u1ee5c</h1>${bookTools}<div class="d-flex justify-content-between align-items-center mb-4"><p class="mb-0">T\u00f9y ch\u1ec9nh nh\u00f3m s\u00e1ch hi\u1ec3n th\u1ecb ngo\u00e0i c\u1eeda h\u00e0ng.</p><button id="add-category" class="btn-brand">+ Th\u00eam danh m\u1ee5c</button></div><div id="category-editor"></div><div id="category-message"></div><div class="panel table-responsive"><table class="admin-table category-table"><thead><tr><th>Th\u1ee9 t\u1ef1</th><th>T\u00ean danh m\u1ee5c</th><th>\u0110\u01b0\u1eddng d\u1eabn</th><th>M\u00f4 t\u1ea3</th><th>Tr\u1ea1ng th\u00e1i</th><th>Thao t\u00e1c</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.display_order}</td><td><b>${esc(row.name)}</b></td><td>${esc(row.slug)}</td><td>${esc(row.description || '')}</td><td><span class="badge-status status-${row.status==='ACTIVE'?'completed':'cancelled'}">${row.status==='ACTIVE'?'\u0110ang hi\u1ec3n th\u1ecb':'\u0110ang \u1ea9n'}</span></td><td><div class="d-flex gap-2"><button class="pill light edit-category" data-id="${row.id}">Ch\u1ec9nh s\u1eeda</button><button class="pill light delete-category" data-id="${row.id}">X\u00f3a</button></div></td></tr>`).join('')}</tbody></table></div>`);
    const openEditor = category => {
      const editing=Boolean(category);
      document.querySelector('#category-editor').innerHTML=`<form id="category-form" class="panel form-card mb-4"><h3>${editing?'Ch\u1ec9nh s\u1eeda danh m\u1ee5c':'Th\u00eam danh m\u1ee5c m\u1edbi'}</h3><div class="row"><label class="col-md-6">T\u00ean danh m\u1ee5c *<input name="name" value="${esc(category?.name || '')}" required></label><label class="col-md-6">\u0110\u01b0\u1eddng d\u1eabn (slug) *<input name="slug" value="${esc(category?.slug || '')}" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required><small>V\u00ed d\u1ee5: sach-lich-su</small></label><label class="col-md-6">M\u00f4 t\u1ea3<textarea name="description" rows="3">${esc(category?.description || '')}</textarea></label><label class="col-md-3">Th\u1ee9 t\u1ef1 hi\u1ec3n th\u1ecb<input name="display_order" type="number" min="0" value="${category?.display_order ?? rows.length+1}"></label><label class="col-md-3">Tr\u1ea1ng th\u00e1i<select name="status"><option value="ACTIVE" ${category?.status!=='HIDDEN'?'selected':''}>Hi\u1ec3n th\u1ecb</option><option value="HIDDEN" ${category?.status==='HIDDEN'?'selected':''}>\u1ea8n</option></select></label></div><div id="category-form-message"></div><button class="btn-brand">${editing?'L\u01b0u thay \u0111\u1ed5i':'T\u1ea1o danh m\u1ee5c'}</button> <button type="button" class="pill light" id="cancel-category">H\u1ee7y</button></form>`;
      const form=document.querySelector('#category-form'),name=form.elements.name,slug=form.elements.slug;
      let slugEdited=editing;
      slug.addEventListener('input',()=>{slugEdited=true});
      name.addEventListener('input',()=>{if(!slugEdited)slug.value=slugify(name.value)});
      document.querySelector('#cancel-category').onclick=()=>document.querySelector('#category-editor').innerHTML='';
      form.onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(form));try{await api(editing?`/api/admin/categories/${category.id}`:'/api/admin/data/categories',{method:editing?'PATCH':'POST',body:JSON.stringify(body)});await categories()}catch(error){document.querySelector('#category-form-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`}};
      form.scrollIntoView({behavior:'smooth',block:'center'});
    };
    document.querySelector('#add-category').onclick=()=>openEditor(null);
    document.querySelectorAll('.edit-category').forEach(button=>button.onclick=()=>openEditor(rows.find(row=>String(row.id)===button.dataset.id)));
    document.querySelectorAll('.delete-category').forEach(button=>button.onclick=async()=>{const category=rows.find(row=>String(row.id)===button.dataset.id);if(!window.confirm(`X\u00f3a danh m\u1ee5c "${category.name}"? Danh m\u1ee5c \u0111ang c\u00f3 s\u00e1ch s\u1ebd \u0111\u01b0\u1ee3c chuy\u1ec3n sang tr\u1ea1ng th\u00e1i \u1ea9n.`))return;try{const result=await api(`/api/admin/categories/${category.id}`,{method:'DELETE'});await categories();const message=result?.mode==='hidden'?'Danh m\u1ee5c \u0111ang \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng n\u00ean \u0111\u00e3 chuy\u1ec3n sang tr\u1ea1ng th\u00e1i \u1ea9n.':'\u0110\u00e3 x\u00f3a danh m\u1ee5c.';document.querySelector('#category-message').innerHTML=`<p class="message">${message}</p>`}catch(error){document.querySelector('#category-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`}});
  }

  const entityConfigs={
    authors:{title:'T\u00e1c gi\u1ea3',fields:[['name','T\u00ean t\u00e1c gi\u1ea3','text',true],['slug','\u0110\u01b0\u1eddng d\u1eabn','text',true],['biography','Ti\u1ec3u s\u1eed','textarea',false],['status','Tr\u1ea1ng th\u00e1i','status',false]]},
    publishers:{title:'Nh\u00e0 xu\u1ea5t b\u1ea3n',fields:[['name','T\u00ean nh\u00e0 xu\u1ea5t b\u1ea3n','text',true],['slug','\u0110\u01b0\u1eddng d\u1eabn','text',true],['email','Email','email',false],['phone','S\u1ed1 \u0111i\u1ec7n tho\u1ea1i','text',false],['address','\u0110\u1ecba ch\u1ec9','textarea',false],['status','Tr\u1ea1ng th\u00e1i','status',false]]},
    suppliers:{title:'Nh\u00e0 cung c\u1ea5p',fields:[['supplier_code','M\u00e3 nh\u00e0 cung c\u1ea5p','text',true],['name','T\u00ean nh\u00e0 cung c\u1ea5p','text',true],['phone','S\u1ed1 \u0111i\u1ec7n tho\u1ea1i','text',false],['email','Email','email',false],['address','\u0110\u1ecba ch\u1ec9','textarea',false],['status','Tr\u1ea1ng th\u00e1i','supplier-status',false]]}
  };
  const fieldMarkup=(field,value='')=>{const [name,label,type,required]=field;if(type==='textarea')return `<label class="col-md-6">${label}<textarea name="${name}" rows="3" ${required?'required':''}>${esc(value||'')}</textarea></label>`;if(type==='status'||type==='supplier-status'){const hidden=type==='status'?'HIDDEN':'INACTIVE';return `<label class="col-md-4">${label}<select name="${name}"><option value="ACTIVE" ${value!=='HIDDEN'&&value!=='INACTIVE'?'selected':''}>Ho\u1ea1t \u0111\u1ed9ng</option><option value="${hidden}" ${value===hidden?'selected':''}>T\u1ea1m \u1ea9n</option></select></label>`}return `<label class="col-md-6">${label}${required?' *':''}<input name="${name}" type="${type}" value="${esc(value||'')}" ${required?'required':''}></label>`};
  async function entities(){
    const config=entityConfigs[module],rows=await api(`/api/admin/data/${module}`);
    layout(`<span class="eyebrow">Qu\u1ea3n tr\u1ecb / S\u1ea3n ph\u1ea9m</span><h1 class="page-title">${config.title}</h1>${bookTools}<div class="d-flex justify-content-between align-items-center mb-4"><p class="mb-0">Th\u00eam, ch\u1ec9nh s\u1eeda v\u00e0 qu\u1ea3n l\u00fd tr\u1ea1ng th\u00e1i d\u1eef li\u1ec7u.</p><button id="add-entity" class="btn-brand">+ Th\u00eam m\u1edbi</button></div><div id="entity-editor"></div><div id="entity-message"></div><div class="panel table-responsive"><table class="admin-table"><thead><tr>${config.fields.map(field=>`<th>${field[1]}</th>`).join('')}<th>Thao t\u00e1c</th></tr></thead><tbody>${rows.map(row=>`<tr>${config.fields.map(field=>`<td>${field[0]==='status'?`<span class="badge-status">${row.status==='ACTIVE'?'Ho\u1ea1t \u0111\u1ed9ng':'T\u1ea1m \u1ea9n'}</span>`:esc(row[field[0]]||'\u2014')}</td>`).join('')}<td><div class="d-flex gap-2"><button class="pill light edit-entity" data-id="${row.id}">Ch\u1ec9nh s\u1eeda</button><button class="pill light delete-entity" data-id="${row.id}">X\u00f3a</button></div></td></tr>`).join('')}</tbody></table>${rows.length?'':'<p class="p-4">Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u. H\u00e3y nh\u1ea5n “Th\u00eam m\u1edbi” \u0111\u1ec3 t\u1ea1o b\u1ea3n ghi \u0111\u1ea7u ti\u00ean.</p>'}</div>`);
    const openEditor=row=>{const editing=Boolean(row);document.querySelector('#entity-editor').innerHTML=`<form id="entity-form" class="panel form-card mb-4"><h3>${editing?'Ch\u1ec9nh s\u1eeda':'Th\u00eam m\u1edbi'} ${config.title.toLowerCase()}</h3><div class="row">${config.fields.map(field=>fieldMarkup(field,row?.[field[0]])).join('')}</div><div id="entity-form-message"></div><button class="btn-brand">${editing?'L\u01b0u thay \u0111\u1ed5i':'T\u1ea1o m\u1edbi'}</button> <button id="cancel-entity" type="button" class="pill light">H\u1ee7y</button></form>`;const form=document.querySelector('#entity-form');const name=form.elements.name,slug=form.elements.slug;if(name&&slug&&!editing){let manual=false;slug.oninput=()=>manual=true;name.oninput=()=>{if(!manual)slug.value=slugify(name.value)}}document.querySelector('#cancel-entity').onclick=()=>document.querySelector('#entity-editor').innerHTML='';form.onsubmit=async event=>{event.preventDefault();try{await api(editing?`/api/admin/entities/${module}/${row.id}`:`/api/admin/data/${module}`,{method:editing?'PATCH':'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});await entities()}catch(error){document.querySelector('#entity-form-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`}};form.scrollIntoView({behavior:'smooth',block:'center'})};
    document.querySelector('#add-entity').onclick=()=>openEditor(null);document.querySelectorAll('.edit-entity').forEach(button=>button.onclick=()=>openEditor(rows.find(row=>String(row.id)===button.dataset.id)));document.querySelectorAll('.delete-entity').forEach(button=>button.onclick=async()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!confirm(`X\u00f3a "${row.name}"? D\u1eef li\u1ec7u \u0111ang \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng s\u1ebd \u0111\u01b0\u1ee3c chuy\u1ec3n sang t\u1ea1m \u1ea9n.`))return;try{await api(`/api/admin/entities/${module}/${row.id}`,{method:'DELETE'});await entities()}catch(error){document.querySelector('#entity-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`}});
  }

  async function inventory(){
    const rows=await api('/api/admin/inventory');
    layout(`<span class="eyebrow">Qu\u1ea3n tr\u1ecb / Kho</span><h1 class="page-title">T\u1ed3n kho</h1>${bookTools}<form id="inventory-form" class="panel form-card mb-4"><h3>\u0110i\u1ec1u ch\u1ec9nh t\u1ed3n kho</h3><div class="row"><label class="col-md-6">S\u00e1ch<select name="workId" required><option value="">Ch\u1ecdn s\u00e1ch</option>${rows.map(row=>`<option value="${esc(row.work_id)}">${esc(row.title)} \u00b7 c\u00f2n ${row.stock_quantity}</option>`).join('')}</select></label><label class="col-md-3">S\u1ed1 l\u01b0\u1ee3ng thay \u0111\u1ed5i<input name="change" type="number" required placeholder="V\u00ed d\u1ee5: 10 ho\u1eb7c -2"></label><label class="col-md-3">T\u1ed3n t\u1ed1i thi\u1ec3u<input name="minimumStock" type="number" min="0" value="5"></label><label class="col-12">L\u00fd do<input name="reason" required value="\u0110i\u1ec1u ch\u1ec9nh kho th\u1ee7 c\u00f4ng"></label></div><div id="inventory-message"></div><button class="btn-brand">L\u01b0u thay \u0111\u1ed5i</button></form><div class="panel table-responsive"><table class="admin-table"><tr><th>M\u00e3</th><th>S\u00e1ch / T\u00e1c gi\u1ea3</th><th>T\u1ed3n hi\u1ec7n t\u1ea1i</th><th>T\u1ed1i thi\u1ec3u</th><th>\u0110\u00e3 b\u00e1n</th></tr>${rows.map(row=>`<tr><td>${esc(row.work_id)}</td><td><b>${esc(row.title)}</b><small>${esc(row.authors)}</small></td><td>${row.stock_quantity}</td><td>${row.minimum_stock}</td><td>${row.sold_count}</td></tr>`).join('')}</table></div>`);
    document.querySelector('#inventory-form').onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget)),book=rows.find(row=>row.work_id===data.workId);try{await api('/api/admin/inventory',{method:'POST',body:JSON.stringify({...data,title:book.title,authors:book.authors,cover:book.cover_url})});await inventory()}catch(error){document.querySelector('#inventory-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`}};
  }

  async function imports(){
    const [books,suppliers,logs]=await Promise.all([api('/api/admin/inventory'),api('/api/admin/data/suppliers'),api('/api/admin/data/imports')]);
    layout(`<span class="eyebrow">Qu\u1ea3n tr\u1ecb / Kho</span><h1 class="page-title">Nh\u1eadp s\u00e1ch</h1>${bookTools}<form id="import-form" class="panel form-card mb-4"><h3>T\u1ea1o l\u1ea7n nh\u1eadp kho</h3><div class="row"><label class="col-md-6">S\u00e1ch<select name="workId" required><option value="">Ch\u1ecdn s\u00e1ch</option>${books.map(book=>`<option value="${esc(book.work_id)}">${esc(book.title)}</option>`).join('')}</select></label><label class="col-md-3">S\u1ed1 l\u01b0\u1ee3ng nh\u1eadp<input name="change" type="number" min="1" required></label><label class="col-md-3">Nh\u00e0 cung c\u1ea5p<select name="supplier"><option value="">Kh\u00f4ng x\u00e1c \u0111\u1ecbnh</option>${suppliers.filter(item=>item.status==='ACTIVE').map(item=>`<option value="${esc(item.name)}">${esc(item.name)}</option>`).join('')}</select></label><label class="col-12">Ghi ch\u00fa<input name="note" value="Nh\u1eadp b\u1ed5 sung kho"></label></div><div id="import-message"></div><button class="btn-brand">X\u00e1c nh\u1eadn nh\u1eadp kho</button></form><div class="panel table-responsive"><table class="admin-table"><tr><th>Th\u1eddi gian</th><th>S\u00e1ch</th><th>S\u1ed1 l\u01b0\u1ee3ng</th><th>Ghi ch\u00fa</th></tr>${logs.map(log=>`<tr><td>${date(log.created_at)}</td><td>${esc(log.book)}</td><td>+${log.quantity}</td><td>${esc(log.reason||'')}</td></tr>`).join('')}</table>${logs.length?'':'<p class="p-4">Ch\u01b0a c\u00f3 l\u1ea7n nh\u1eadp kho n\u00e0o.</p>'}</div>`);
    document.querySelector('#import-form').onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget)),book=books.find(item=>item.work_id===data.workId),reason=`${data.note||'Nh\u1eadp kho'}${data.supplier?' \u00b7 '+data.supplier:''}`;try{await api('/api/admin/inventory',{method:'POST',body:JSON.stringify({workId:book.work_id,title:book.title,authors:book.authors,cover:book.cover_url,change:data.change,minimumStock:book.minimum_stock,reason})});await imports()}catch(error){document.querySelector('#import-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`}};
  }

  async function history(){const rows=await api('/api/admin/history');layout(`<span class="eyebrow">Qu\u1ea3n tr\u1ecb / Kho</span><h1 class="page-title">L\u1ecbch s\u1eed kho</h1>${bookTools}<p class="message">Nh\u1eadt k\u00fd kho ch\u1ec9 cho ph\u00e9p xem \u0111\u1ec3 b\u1ea3o \u0111\u1ea3m \u0111\u1ed1i so\u00e1t. Mu\u1ed1n s\u1eeda sai l\u1ec7ch, h\u00e3y t\u1ea1o m\u1ed9t l\u1ea7n \u0111i\u1ec1u ch\u1ec9nh m\u1edbi trong T\u1ed3n kho.</p><div class="panel table-responsive"><table class="admin-table"><tr><th>Th\u1eddi gian</th><th>S\u00e1ch</th><th>Lo\u1ea1i</th><th>Tr\u01b0\u1edbc</th><th>Thay \u0111\u1ed5i</th><th>Sau</th><th>L\u00fd do</th></tr>${rows.map(row=>`<tr><td>${date(row.created_at)}</td><td>${esc(row.title)}</td><td>${esc(row.transaction_type)}</td><td>${row.quantity_before}</td><td>${row.quantity_change}</td><td>${row.quantity_after}</td><td>${esc(row.reason||'')}</td></tr>`).join('')}</table></div>`)}

  async function reports(currentRange = 'all') {
    const [analyticsData, wishlistRows] = await Promise.all([
      api(`/api/admin/reports/analytics?range=${encodeURIComponent(currentRange)}`).catch(() => ({ status_summary: [], trend: [], top_selling: [] })),
      api('/api/admin/reports/wishlist').catch(() => [])
    ]);

    const reportData = analyticsData.status_summary || [];
    const trendData = analyticsData.trend || [];
    const topSelling = analyticsData.top_selling || [];

    const rows=(reportData || []).map(row=>({
      status:String(row.status || 'PENDING').toUpperCase(),
      count:Number(row.order_count || 0),
      revenue:Number(row.revenue || 0)
    }));
    const palette={
      COMPLETED:'#2e7d32',
      SHIPPING:'#0288d1',
      PREPARING:'#7b1fa2',
      CONFIRMED:'#f57c00',
      PENDING:'#e6a23c',
      CANCELLED:'#d32f2f'
    };
    const detailedLabels={
      COMPLETED:'Đã giao hàng',
      SHIPPING:'Đang vận chuyển',
      PREPARING:'Đang đóng gói',
      CONFIRMED:'Đã xác nhận',
      PENDING:'Chờ xử lý',
      CANCELLED:'Đã hủy đơn'
    };
    const ordered=['COMPLETED','SHIPPING','PREPARING','CONFIRMED','PENDING','CANCELLED'].map(status=>rows.find(row=>row.status===status)).filter(Boolean);
    const totalOrders=ordered.reduce((sum,row)=>sum+row.count,0);
    const totalRevenue=ordered.reduce((sum,row)=>sum+row.revenue,0);
    const completed=ordered.find(row=>row.status==='COMPLETED') || {count:0,revenue:0};
    const completionRate=totalOrders ? Math.round(completed.count/totalOrders*100) : 0;
    const maxRevenue=Math.max(...ordered.map(row=>row.revenue),1);
    let offset=0;
    const slices=ordered.map(row=>{const start=offset;offset+=totalOrders?row.count/totalOrders*100:0;return `${palette[row.status]} ${start}% ${offset}%`;});
    const donut=slices.length?`conic-gradient(${slices.join(',')})`:'#eeece6';

    const maxTrendRevenue = Math.max(...trendData.map(t => Number(t.revenue || 0)), 1);

    layout(`
      <div class="report-header-wrap">
        <div>
          <span class="eyebrow">Quản trị / Phân tích dữ liệu</span>
          <h1 class="page-title">Thống kê kinh doanh</h1>
          <p class="report-subtitle">Dữ liệu tổng hợp theo thời gian thực từ cơ sở dữ liệu MySQL.</p>
        </div>
        <div class="report-header-actions">
          <div class="report-filter-pills" role="tablist">
            <button type="button" class="report-filter-pill ${currentRange==='all'?'active':''}" data-range="all">Tất cả</button>
            <button type="button" class="report-filter-pill ${currentRange==='month'?'active':''}" data-range="month">30 ngày</button>
            <button type="button" class="report-filter-pill ${currentRange==='week'?'active':''}" data-range="week">7 ngày qua</button>
            <button type="button" class="report-filter-pill ${currentRange==='today'?'active':''}" data-range="today">Hôm nay</button>
          </div>
          <button type="button" class="btn-brand report-export-btn" id="export-report-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Xuất dữ liệu</span>
          </button>
        </div>
      </div>

      <section class="report-kpis">
        <article class="panel report-kpi">
          <div class="report-kpi-head">
            <span>Tổng đơn hàng</span>
            <span class="report-kpi-icon">📦</span>
          </div>
          <strong>${totalOrders}</strong>
          <small class="report-kpi-sub">${currentRange === 'all' ? 'Tất cả đơn phát sinh' : `Đơn trong khoảng lọc (${currentRange})`}</small>
        </article>

        <article class="panel report-kpi">
          <div class="report-kpi-head">
            <span>Tổng giá trị đơn</span>
            <span class="report-kpi-icon">🏷️</span>
          </div>
          <strong>${money(totalRevenue)}</strong>
          <small class="report-kpi-sub">Bao gồm các đơn đang &amp; đã giao</small>
        </article>

        <article class="panel report-kpi report-kpi-highlight">
          <div class="report-kpi-head">
            <span>Doanh thu thực nhận</span>
            <span class="report-kpi-badge">Thực thu</span>
          </div>
          <strong>${money(completed.revenue)}</strong>
          <small class="report-kpi-sub">Từ ${completed.count} đơn đã giao thành công</small>
        </article>

        <article class="panel report-kpi">
          <div class="report-kpi-head">
            <span>Tỷ lệ hoàn thành</span>
            <span class="report-kpi-icon">🎯</span>
          </div>
          <strong>${completionRate}%</strong>
          <div class="report-kpi-bar-mini">
            <div style="width:${completionRate}%"></div>
          </div>
          <small class="report-kpi-sub">${completed.count}/${totalOrders} đơn giao thành công</small>
        </article>
      </section>

      <section class="report-charts">
        <article class="panel report-chart">
          <div class="report-chart-header">
            <div>
              <h2>Trạng thái đơn hàng</h2>
              <span class="report-chart-note">Phân bổ tỷ lệ theo số lượng đơn</span>
            </div>
            <span class="report-chart-tag">${totalOrders} đơn</span>
          </div>
          <div class="report-donut-area">
            <div class="report-donut-wrap">
              <div class="report-donut" style="--report-donut:${donut}"></div>
              <div class="report-donut-center">
                <strong>${totalOrders}</strong>
                <span>tổng đơn</span>
              </div>
            </div>
            <div class="report-legend">
              ${ordered.map(row=>{
                const pct=totalOrders ? Math.round(row.count/totalOrders*100) : 0;
                return `<div class="report-legend-row">
                  <i class="report-dot" style="background:${palette[row.status]}"></i>
                  <span class="report-legend-label">${detailedLabels[row.status]||orderLabels[row.status]||esc(row.status)}</span>
                  <div class="report-legend-val">
                    <b>${row.count}</b>
                    <small>(${pct}%)</small>
                  </div>
                </div>`;
              }).join('')||'<span>Chưa có dữ liệu.</span>'}
            </div>
          </div>
        </article>

        <article class="panel report-chart">
          <div class="report-chart-header">
            <div>
              <h2>Giá trị theo trạng thái</h2>
              <span class="report-chart-note">So sánh quy mô dòng tiền theo tiến độ</span>
            </div>
            <span class="report-chart-tag">${money(totalRevenue)}</span>
          </div>
          <div class="report-bars">
            ${ordered.map(row=>{
              const fillPct=Math.max(row.revenue/maxRevenue*100,2);
              const sharePct=totalRevenue ? Math.round(row.revenue/totalRevenue*100) : 0;
              return `<div class="report-bar">
                <div class="report-bar-head">
                  <span class="report-bar-title"><i class="report-dot" style="background:${palette[row.status]}"></i> ${detailedLabels[row.status]||orderLabels[row.status]||esc(row.status)}</span>
                  <div class="report-bar-nums">
                    <b>${money(row.revenue)}</b>
                    <small>(${sharePct}%)</small>
                  </div>
                </div>
                <div class="report-bar-track">
                  <div class="report-bar-fill" style="width:${fillPct}%;background:${palette[row.status]}"></div>
                </div>
              </div>`;
            }).join('')||'<span>Chưa có dữ liệu.</span>'}
          </div>
        </article>
      </section>

      <!-- Biểu đồ xu hướng doanh thu theo ngày -->
      ${trendData.length ? `
      <section class="panel report-chart" style="margin-top:24px;padding:24px;border-radius:18px;background:#fff;border:1px solid rgba(17,41,31,0.08);">
        <div class="report-chart-header">
          <div>
            <h2>📈 Xu hướng doanh thu các đợt gần nhất</h2>
            <span class="report-chart-note">Biểu đồ thể hiện biến động giá trị đơn hàng theo ngày</span>
          </div>
        </div>
        <div class="report-daily-trend">
          ${trendData.map(item => {
            const rev = Number(item.revenue || 0);
            const heightPct = Math.max(Math.round((rev / maxTrendRevenue) * 100), 10);
            return `
              <div class="report-trend-col" title="${item.day_label}: ${money(rev)} (${item.order_count} đơn)">
                <span class="report-trend-val">${money(rev).replace('₫','đ')}</span>
                <div class="report-trend-bar" style="height:${heightPct}%;"></div>
                <span class="report-trend-label">${item.day_label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </section>` : ''}

      <!-- Top Sách bán chạy nhất -->
      ${topSelling.length ? `
      <section class="panel" style="margin-top:24px;padding:24px;border-radius:18px;background:#fff;border:1px solid rgba(17,41,31,0.08);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="font-family:'Lora',serif;font-size:18px;margin:0 0 4px;color:#11291f;">🏆 Top sách bán chạy nhất</h2>
            <small style="color:#5f7166;">Xếp hạng theo tổng số lượng cuốn thực tế đã xuất bán từ các đơn hàng.</small>
          </div>
          <span style="background:#e8f5e9;color:#2e7d32;font-weight:700;font-size:12px;padding:4px 12px;border-radius:99px;">Top 5 tác phẩm</span>
        </div>
        <div class="table-responsive">
          <table class="admin-table" style="margin:0;">
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th>Tác phẩm</th>
                <th>Số lượng đã bán</th>
                <th>Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody>
              ${topSelling.map((b, idx) => `
                <tr>
                  <td><b>${idx + 1}</b></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${b.cover_url ? `<img src="${esc(b.cover_url)}" style="width:32px;height:42px;object-fit:cover;border-radius:4px;" alt="">` : '<div style="width:32px;height:42px;background:#eee;border-radius:4px;display:grid;place-items:center;font-size:11px;">📖</div>'}
                      <div>
                        <b style="font-size:13px;color:#11291f;display:block;">${esc(b.title)}</b>
                        <small style="color:#667a6e;">${esc(b.authors || 'Chưa rõ tác giả')}</small>
                      </div>
                    </div>
                  </td>
                  <td><span style="font-size:13px;font-weight:700;color:#2e7d32;">${b.total_sold} cuốn</span></td>
                  <td><b>${money(b.total_revenue)}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}

      <section class="panel report-wishlist-section" style="margin-top:24px;padding:24px;border-radius:18px;background:#fff;border:1px solid rgba(17,41,31,0.08);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="font-family:'Lora',serif;font-size:18px;margin:0 0 4px;color:#11291f;">❤️ Top sách được độc giả quan tâm &amp; yêu thích</h2>
            <small style="color:#5f7166;">Thống kê từ số lượt lưu vào danh sách yêu thích của khách hàng để hỗ trợ chiến lược nhập kho &amp; khuyến mãi.</small>
          </div>
          <span style="background:#fbeee8;color:#c2410c;font-weight:700;font-size:12px;padding:4px 12px;border-radius:99px;">${(wishlistRows || []).length} tác phẩm</span>
        </div>
        <div class="table-responsive">
          <table class="admin-table" style="margin:0;">
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th>Tác phẩm</th>
                <th>Lượt yêu thích</th>
                <th>Giá bán</th>
                <th>Tồn kho hiện tại</th>
                <th>Trạng thái kho</th>
              </tr>
            </thead>
            <tbody>
              ${(wishlistRows && wishlistRows.length) ? wishlistRows.map((item, idx) => {
                const stock = Number(item.stock_quantity || 0);
                const isOut = stock <= 0;
                const isLow = stock > 0 && stock <= 5;
                const badge = isOut
                  ? '<span class="stock-badge out-of-stock">Hết hàng</span>'
                  : isLow
                    ? `<span class="stock-badge low-stock">Sắp hết (${stock})</span>`
                    : `<span class="stock-badge in-stock">Còn ${stock}</span>`;

                return `
                  <tr>
                    <td><b>${idx + 1}</b></td>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px;">
                        ${item.cover_url ? `<img src="${esc(item.cover_url)}" style="width:32px;height:42px;object-fit:cover;border-radius:4px;" alt="">` : '<div style="width:32px;height:42px;background:#eee;border-radius:4px;display:grid;place-items:center;font-size:11px;">📖</div>'}
                        <div>
                          <b style="font-size:13px;color:#11291f;display:block;">${esc(item.title)}</b>
                          <small style="color:#667a6e;">${esc(item.authors || 'Chưa rõ tác giả')}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style="font-size:13px;font-weight:700;color:#c2410c;">♥ ${item.favorite_count} lượt</span>
                    </td>
                    <td><b>${money(item.selling_price)}</b></td>
                    <td>${stock} cuốn</td>
                    <td>${badge}</td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="6" style="text-align:center;padding:24px;color:#778b7f;">Chưa có dữ liệu sách yêu thích.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `);

    const exportBtn=document.querySelector('#export-report-btn');
    if(exportBtn){
      exportBtn.onclick=()=>{
        let csv = "Trang thai,So luong don,Doanh thu (VND),Ty le (%)\n";
        ordered.forEach(row=>{
          const pct=totalOrders ? (row.count/totalOrders*100).toFixed(1) : '0';
          const label=detailedLabels[row.status]||orderLabels[row.status]||row.status;
          csv+=`"${label}",${row.count},${row.revenue},${pct}%\n`;
        });
        csv+=`"TONG CONG",${totalOrders},${totalRevenue},100%\n`;
        const blob=new Blob(["﻿"+csv],{type:'text/csv;charset=utf-8;'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=`bao-cao-kinh-doanh-tram-sach-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    document.querySelectorAll('.report-filter-pill').forEach(pill=>{
      pill.onclick=()=>{
        reports(pill.dataset.range);
      };
    });
  }

  async function coupons() {
    const [rows,books]=await Promise.all([api('/api/admin/data/coupons'),api('/api/admin/data/books')]);
    const discountLabel=row=>row.discount_type==='FREE_SHIPPING'?'Miễn phí vận chuyển':row.discount_type==='PERCENT'?`${row.discount_value}%`:money(row.discount_value);
    layout(`<span class="eyebrow">Quản trị / Khuyến mãi</span><h1 class="page-title">Mã giảm giá</h1><form id="coupon-form" class="panel form-card mb-4"><div class="coupon-form-head"><div><h3 id="coupon-form-title">Tạo mã giảm giá</h3><p id="coupon-form-subtitle">Thiết lập ưu đãi và những sản phẩm được áp dụng.</p></div><span id="coupon-edit-badge" hidden>Đang chỉnh sửa</span></div><div class="row"><label class="col-md-3">Mã *<input name="code" required></label><label class="col-md-5">Tên chương trình *<input name="name" required></label><label class="col-md-2">Loại<select name="discountType"><option value="PERCENT">Phần trăm</option><option value="FIXED">Số tiền</option></select></label><label class="col-md-2">Giá trị *<input name="discountValue" type="number" min="1" required></label><label class="col-md-3">Giảm tối đa<input name="maximumDiscount" type="number" min="0"></label><label class="col-md-3">Đơn tối thiểu<input name="minimumOrder" type="number" min="0" value="0"></label><label class="col-md-2">Tổng lượt dùng<input name="usageLimit" type="number" min="1"></label><label class="col-md-2">Lượt / khách<input name="usagePerCustomer" type="number" min="1" value="1"></label><label class="col-md-3">Bắt đầu *<input name="startsAt" type="datetime-local" required></label><label class="col-md-3">Kết thúc *<input name="endsAt" type="datetime-local" required></label><label class="col-12">Sản phẩm được áp dụng *<select name="workIds" multiple size="7" required>${books.map(book=>`<option value="${esc(book.work_id)}">${esc(book.title)} — ${esc(book.authors)}</option>`).join('')}</select><small>Giữ Ctrl để chọn nhiều sản phẩm.</small></label></div><div id="coupon-form-message"></div><div class="coupon-form-actions"><button id="coupon-submit" class="btn-brand">+ Tạo mã giảm giá</button><button id="coupon-cancel-edit" type="button" class="pill light" hidden>Hủy chỉnh sửa</button></div></form><div class="panel table-responsive"><table class="admin-table coupon-admin-table"><tr><th>Mã</th><th>Chương trình</th><th>Sản phẩm áp dụng</th><th>Mức giảm</th><th>Đơn tối thiểu</th><th>Đã dùng</th><th>Trạng thái</th><th>Thao tác</th></tr>${rows.map(row=>`<tr><td><b>${esc(row.code)}</b></td><td>${esc(row.name)}</td><td><small>${esc(row.product_names||'Chưa chọn sản phẩm')}</small></td><td>${discountLabel(row)}</td><td>${money(row.minimum_order)}</td><td>${row.used_count}${row.usage_limit?` / ${row.usage_limit}`:''}</td><td><span class="coupon-status ${row.status==='ACTIVE'?'active':'inactive'}">${row.status==='ACTIVE'?'Đang bật':'Đã tắt'}</span></td><td><div class="coupon-row-actions"><button class="coupon-action coupon-edit" type="button" data-id="${row.id}">Chỉnh sửa</button><button class="coupon-action coupon-toggle" type="button" data-id="${row.id}" data-status="${row.status}">${row.status==='ACTIVE'?'Tắt mã':'Bật mã'}</button><button class="coupon-action danger coupon-delete" type="button" data-id="${row.id}" data-code="${esc(row.code)}">Xóa</button></div></td></tr>`).join('')}</table>${rows.length?'':'<p class="p-4">Chưa có mã giảm giá.</p>'}</div>`);
    const form=document.querySelector('#coupon-form'),formTitle=document.querySelector('#coupon-form-title'),formSubtitle=document.querySelector('#coupon-form-subtitle'),editBadge=document.querySelector('#coupon-edit-badge'),submitButton=document.querySelector('#coupon-submit'),cancelButton=document.querySelector('#coupon-cancel-edit');
    let editingId=null,startControl=null,endControl=null;
    const dateTimeLocal=value=>value?String(value).replace(' ','T').slice(0,16):'';
    const localDateTimeValue=date=>{const shifted=new Date(date.getTime()-date.getTimezoneOffset()*60000);return shifted.toISOString().slice(0,16)};
    const createDateControl=(name,label)=>{const hidden=form.elements[name],host=hidden.closest('label');hidden.type='hidden';hidden.required=false;host.classList.add('coupon-date-host');host.childNodes[0].textContent=`${label} *`;const shell=document.createElement('div');shell.className='coupon-datetime-fields';shell.innerHTML='<label><span>Ngày</span><input type="date" required></label><label><span>Giờ</span><input type="time" step="300" required></label>';hidden.after(shell);const dateInput=shell.querySelector('input[type="date"]'),timeInput=shell.querySelector('input[type="time"]');const sync=()=>{hidden.value=dateInput.value&&timeInput.value?`${dateInput.value}T${timeInput.value}`:'';return hidden.value};dateInput.addEventListener('input',sync);timeInput.addEventListener('input',sync);return{set(value){const normalized=dateTimeLocal(value);hidden.value=normalized;dateInput.value=normalized.slice(0,10);timeInput.value=normalized.slice(11,16)||'00:00'},value:sync}};
    const setSelectedProducts=ids=>{const selected=new Set(ids);[...form.elements.workIds.options].forEach(option=>option.selected=selected.has(option.value));document.querySelectorAll('.coupon-picker-item input[type="checkbox"]').forEach(input=>{input.checked=selected.has(input.value);input.dispatchEvent(new Event('change',{bubbles:true}))})};
    const setDefaultDates=(days=7)=>{const start=new Date(),end=new Date(start);start.setMinutes(Math.ceil(start.getMinutes()/5)*5,0,0);end.setDate(end.getDate()+days);startControl?.set(localDateTimeValue(start));endControl?.set(localDateTimeValue(end))};
    const resetForm=()=>{editingId=null;form.reset();form.elements.minimumOrder.value=0;form.elements.usagePerCustomer.value=1;setSelectedProducts([]);setDefaultDates();formTitle.textContent='Tạo mã giảm giá';formSubtitle.textContent='Thiết lập ưu đãi và những sản phẩm được áp dụng.';editBadge.hidden=true;cancelButton.hidden=true;submitButton.textContent='+ Tạo mã giảm giá';document.querySelector('#coupon-form-message').textContent='';form.elements.discountType.dispatchEvent(new Event('change',{bubbles:true}))};
    startControl=createDateControl('startsAt','Bắt đầu');endControl=createDateControl('endsAt','Kết thúc');
    const dateShortcuts=document.createElement('div');dateShortcuts.className='coupon-date-shortcuts';dateShortcuts.innerHTML='<span>Thiết lập nhanh:</span><button type="button" data-now>Bắt đầu ngay</button><button type="button" data-days="7">7 ngày</button><button type="button" data-days="30">30 ngày</button><button type="button" data-days="90">90 ngày</button>';const dateHosts=form.querySelectorAll('.coupon-date-host');dateHosts[dateHosts.length-1].after(dateShortcuts);const roundedNow=()=>{const now=new Date();now.setMinutes(Math.ceil(now.getMinutes()/5)*5,0,0);return now};dateShortcuts.querySelector('[data-now]').onclick=()=>{const now=roundedNow();startControl.set(localDateTimeValue(now));dateShortcuts.querySelectorAll('[data-days]').forEach(item=>item.classList.remove('active'))};dateShortcuts.querySelectorAll('[data-days]').forEach(button=>button.onclick=()=>{const start=roundedNow(),end=new Date(start);end.setDate(end.getDate()+Number(button.dataset.days));startControl.set(localDateTimeValue(start));endControl.set(localDateTimeValue(end));dateShortcuts.querySelectorAll('[data-days]').forEach(item=>item.classList.toggle('active',item===button))});setDefaultDates();
    const maximumInput=document.querySelector('#coupon-form [name="maximumDiscount"]');
    if(maximumInput){maximumInput.placeholder='Ví dụ: 30000';maximumInput.closest('label').childNodes[0].textContent='Giảm tối đa (VNĐ)';maximumInput.insertAdjacentHTML('afterend','<small>Để trống nếu mã phần trăm không giới hạn số tiền giảm.</small>')}
    const minimumInput=document.querySelector('#coupon-form [name="minimumOrder"]');
    if(minimumInput)minimumInput.closest('label').childNodes[0].textContent='Đơn tối thiểu (VNĐ)';
    form.onsubmit=async event=>{event.preventDefault();const wasEditing=Boolean(editingId),scrollPosition=window.scrollY;startControl.value();endControl.value();const data=Object.fromEntries(new FormData(form));data.workIds=[...form.elements.workIds.selectedOptions].map(option=>option.value);const current=rows.find(row=>Number(row.id)===Number(editingId));if(current)data.status=current.status;if(!data.startsAt||!data.endsAt)return showAdminPopup('Thiếu thời gian','Vui lòng chọn đầy đủ ngày và giờ bắt đầu, kết thúc.');if(new Date(data.endsAt)<=new Date(data.startsAt))return showAdminPopup('Thời gian chưa hợp lệ','Thời gian kết thúc phải sau thời gian bắt đầu.');if(!data.workIds.length)return showAdminPopup('Chưa chọn sản phẩm','Vui lòng chọn ít nhất một sản phẩm áp dụng mã giảm giá.');try{submitButton.disabled=true;submitButton.textContent='Đang lưu…';await api(editingId?`/api/admin/coupons/${editingId}`:'/api/admin/data/coupons',{method:editingId?'PATCH':'POST',body:JSON.stringify(data)});await coupons();requestAnimationFrame(()=>window.scrollTo({top:scrollPosition,behavior:'auto'}));showAdminPopup('Đã lưu thành công',wasEditing?'Thông tin mã giảm giá đã được cập nhật.':'Mã giảm giá mới đã được tạo.','success')}catch(error){showAdminPopup('Không thể lưu mã giảm giá',error.message);submitButton.disabled=false;submitButton.textContent=wasEditing?'Lưu thay đổi':'+ Tạo mã giảm giá'}};
    cancelButton.onclick=resetForm;
    document.querySelectorAll('.coupon-edit').forEach(button=>button.onclick=()=>{const row=rows.find(item=>Number(item.id)===Number(button.dataset.id));if(!row)return;editingId=row.id;form.elements.code.value=row.code||'';form.elements.name.value=row.name||'';form.elements.discountType.value=row.discount_type||'PERCENT';form.elements.discountValue.value=row.discount_type==='FREE_SHIPPING'?'':row.discount_value||'';form.elements.maximumDiscount.value=row.maximum_discount??'';form.elements.minimumOrder.value=row.minimum_order??0;form.elements.usageLimit.value=row.usage_limit??'';form.elements.usagePerCustomer.value=row.usage_per_customer??1;startControl.set(row.starts_at);endControl.set(row.ends_at);setSelectedProducts(String(row.work_ids||'').split(',').filter(Boolean));form.elements.discountType.dispatchEvent(new Event('change',{bubbles:true}));formTitle.textContent=`Chỉnh sửa mã ${row.code}`;formSubtitle.textContent='Bạn có thể đổi ưu đãi, thời hạn và chọn lại sản phẩm áp dụng.';editBadge.hidden=false;cancelButton.hidden=false;submitButton.textContent='Lưu thay đổi';form.scrollIntoView({behavior:'smooth',block:'start'});form.elements.name.focus()});
    document.querySelectorAll('.coupon-toggle').forEach(button=>button.onclick=async()=>{const scrollPosition=window.scrollY;button.disabled=true;try{await api(`/api/admin/coupons/${button.dataset.id}`,{method:'PATCH',body:JSON.stringify({status:button.dataset.status==='ACTIVE'?'INACTIVE':'ACTIVE'})});await coupons();requestAnimationFrame(()=>window.scrollTo({top:scrollPosition,behavior:'auto'}));showAdminPopup('Đã cập nhật','Trạng thái mã giảm giá đã được thay đổi.','success')}catch(error){button.disabled=false;showAdminPopup('Không thể cập nhật',error.message)}});
    document.querySelectorAll('.coupon-delete').forEach(button=>button.onclick=async()=>{if(!confirm(`Xóa vĩnh viễn mã ${button.dataset.code}? Thao tác này không thể hoàn tác.`))return;const scrollPosition=window.scrollY;button.disabled=true;try{await api(`/api/admin/coupons/${button.dataset.id}`,{method:'DELETE'});await coupons();requestAnimationFrame(()=>window.scrollTo({top:scrollPosition,behavior:'auto'}));showAdminPopup('Đã xóa mã','Mã giảm giá đã được xóa khỏi hệ thống.','success')}catch(error){button.disabled=false;showAdminPopup('Không thể xóa mã',error.message)}});
  }

  async function reviews() {
    const rows=await api('/api/admin/data/reviews');
    layout(`<span class="eyebrow">Quản trị / Nội dung</span><h1 class="page-title">Đánh giá</h1><p class="mb-4">Ẩn nhận xét không phù hợp và lưu lại lý do kiểm duyệt.</p><div class="panel table-responsive"><table class="admin-table"><tr><th>Khách hàng</th><th>Sách</th><th>Điểm</th><th>Nhận xét</th><th>Trạng thái</th><th>Thao tác</th></tr>${rows.map(row=>`<tr><td>${esc(row.customer)}</td><td>${esc(row.book)}</td><td>${Number(row.rating)}/5</td><td>${esc(row.content)}${row.hidden_reason?`<small>Lý do: ${esc(row.hidden_reason)}</small>`:''}</td><td>${row.status==='VISIBLE'?'Đang hiển thị':'Đã ẩn'}</td><td><button class="pill light review-moderate" data-id="${row.id}" data-status="${row.status}">${row.status==='VISIBLE'?'Ẩn':'Hiện lại'}</button></td></tr>`).join('')}</table>${rows.length?'':'<p class="p-4">Chưa có nhận xét.</p>'}</div>`);
    document.querySelectorAll('.review-moderate').forEach(button=>button.onclick=async()=>{const hiding=button.dataset.status==='VISIBLE';const reason=hiding?prompt('Nhập lý do ẩn nhận xét:','Nội dung chưa phù hợp'):'';if(hiding&&(!reason||reason.trim().length<3))return;await api(`/api/admin/reviews/${button.dataset.id}`,{method:'PATCH',body:JSON.stringify({status:hiding?'HIDDEN':'VISIBLE',reason})});await reviews()});
  }

  async function generic() {
    const special=['inventory','history'].includes(module);
    const rows=await api(special?`/api/admin/${module}`:`/api/admin/data/${module}`);
    const columns=rows.length?Object.keys(rows[0]).slice(0,8):[];
    const product=['categories','authors','publishers','inventory','imports','suppliers','history'].includes(module);
    layout(`<span class="eyebrow">Qu\u1ea3n tr\u1ecb</span><h1 class="page-title">${titles[module]||module}</h1>${product?bookTools:''}<div class="panel table-responsive"><table class="admin-table"><tr>${columns.map(column=>`<th>${esc(column.replaceAll('_',' '))}</th>`).join('')}</tr>${rows.map(row=>`<tr>${columns.map(column=>`<td>${esc(row[column])}</td>`).join('')}</tr>`).join('')}</table>${rows.length?'':'<p class="p-4">Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u.</p>'}</div>`);
  }
  async function dashboard() {
    let stats = null;
    try {
      stats = await api('/api/admin/dashboard-stats');
    } catch(err) {
      console.warn('Dashboard stats error:', err);
    }

    const kpi = stats?.kpi || {
      total_revenue: 0,
      today_revenue: 0,
      week_revenue: 0,
      total_orders: 0,
      pending_orders: 0,
      shipping_orders: 0,
      completed_orders: 0,
      total_titles: 0,
      total_stock: 0,
      low_stock_count: 0
    };

    const recentOrders = stats?.recent_orders || [];
    const topSelling = stats?.top_selling || [];
    const lowStock = stats?.low_stock || [];
    const chartData = stats?.revenue_chart || [];

    const maxRev = Math.max(...chartData.map(d => Number(d.daily_revenue || 0)), 100000);

    const groups = [
      ['orders', 'Đơn hàng', '📦', `${kpi.total_orders} đơn (${kpi.pending_orders} chờ duyệt)`],
      ['books', 'Sách & Kho', '📚', `${kpi.total_titles} đầu sách trong kho`],
      ['customers', 'Khách hàng', '👥', `${kpi.total_customers || 0} tài khoản đăng ký`],
      ['coupons', 'Mã giảm giá', '🏷️', 'Quản lý voucher & khuyến mãi'],
      ['reports', 'Báo cáo thống kê', '📊', 'Doanh thu & phân tích dữ liệu'],
      ['reviews', 'Đánh giá', '⭐', 'Kiểm duyệt nhận xét của khách'],
      ['inventory', 'Tồn kho & Nhập hàng', '🏢', `${new Intl.NumberFormat('vi-VN').format(kpi.total_stock)} cuốn trong kho`],
      ['logs', 'Nhật ký hệ thống', '📝', 'Lịch sử thao tác quản trị']
    ];

    const statusLabels = {
      PENDING: 'Chờ duyệt',
      CONFIRMED: 'Đã xác nhận',
      PREPARING: 'Đang chuẩn bị',
      SHIPPING: 'Đang giao hàng',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy'
    };

    layout(`
      <div class="admin-dashboard-wrap">
        <!-- Header & Quick Actions -->
        <div class="dashboard-header-bar">
          <div class="dashboard-header-title">
            <span class="eyebrow">Trạm Sách · Control Center</span>
            <h1>Tổng quan hệ thống</h1>
            <p class="dashboard-header-desc">Chào mừng quay trở lại! Dưới đây là tình hình kinh doanh và kho hàng hôm nay.</p>
          </div>
          <div class="dashboard-quick-actions">
            <button type="button" class="dashboard-action-btn btn-tiki" id="dash-btn-crawl-tiki">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Cào sách Tiki (c8322)</span>
            </button>
            <a href="/admin/books" class="dashboard-action-btn btn-new-book">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>+ Quản lý sách</span>
            </a>
            <a href="/admin/orders" class="dashboard-action-btn btn-outline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-2z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
              <span>Xử lý đơn hàng</span>
            </a>
          </div>
        </div>

        <!-- 4 KPI Cards -->
        <div class="dashboard-kpi-grid">
          <!-- Card 1: Revenue -->
          <div class="kpi-card kpi-revenue">
            <div class="kpi-card-header">
              <span class="kpi-card-label">Tổng doanh thu</span>
              <div class="kpi-icon-badge">💵</div>
            </div>
            <div class="kpi-value">${money(kpi.total_revenue)}</div>
            <div class="kpi-subtext">
              Tuần này: <strong>${money(kpi.week_revenue)}</strong>
            </div>
          </div>

          <!-- Card 2: Orders -->
          <div class="kpi-card kpi-orders">
            <div class="kpi-card-header">
              <span class="kpi-card-label">Đơn hàng chờ duyệt</span>
              <div class="kpi-icon-badge">📦</div>
            </div>
            <div class="kpi-value">
              ${kpi.pending_orders} <small style="font-size:14px;font-weight:600;color:#b45309;">đơn</small>
            </div>
            <div class="kpi-subtext">
              ${kpi.pending_orders > 0 ? `<span class="badge-pulse"></span><strong>${kpi.pending_orders} đơn cần xử lý ngay</strong>` : `<span>✓ Toàn bộ đơn đã được duyệt</span>`}
            </div>
          </div>

          <!-- Card 3: Books In Stock -->
          <div class="kpi-card kpi-books">
            <div class="kpi-card-header">
              <span class="kpi-card-label">Đầu sách trong kho</span>
              <div class="kpi-icon-badge">📚</div>
            </div>
            <div class="kpi-value">${kpi.total_titles} <small style="font-size:14px;font-weight:600;color:#2563eb;">đầu sách</small></div>
            <div class="kpi-subtext">
              Tổng số lượng tồn: <strong>${new Intl.NumberFormat('vi-VN').format(kpi.total_stock)} cuốn</strong>
            </div>
          </div>

          <!-- Card 4: Low Stock Alert -->
          <div class="kpi-card kpi-stock">
            <div class="kpi-card-header">
              <span class="kpi-card-label">Cảnh báo tồn kho</span>
              <div class="kpi-icon-badge">⚠️</div>
            </div>
            <div class="kpi-value">${kpi.low_stock_count} <small style="font-size:14px;font-weight:600;color:#dc2626;">sách</small></div>
            <div class="kpi-subtext">
              ${kpi.low_stock_count > 0 ? `<strong style="color:#dc2626;">Cần nhập thêm hàng</strong>` : `<span>Kho hàng đang ở mức an toàn</span>`}
            </div>
          </div>
        </div>

        <!-- Main 2-Column Content -->
        <div class="dashboard-main-grid">
          <!-- Left Column: Recent Orders & 7-Day Chart -->
          <div style="display:flex;flex-direction:column;gap:20px;">
            <!-- Recent Orders Panel -->
            <div class="dashboard-panel">
              <div class="dashboard-panel-header">
                <h3 class="dashboard-panel-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-2z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  <span>Đơn hàng mới nhất</span>
                </h3>
                <a href="/admin/orders" class="dashboard-panel-link">Xem tất cả ${kpi.total_orders} đơn →</a>
              </div>
              <div class="table-responsive">
                <table class="dashboard-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentOrders.length ? recentOrders.map(o => `
                      <tr>
                        <td><a href="/admin/orders" style="font-weight:700;color:#0b74e5;text-decoration:none;">${esc(o.order_code)}</a></td>
                        <td>${esc(o.recipient_name)}</td>
                        <td><b>${money(o.total_amount)}</b></td>
                        <td><span class="status-chip status-${esc(o.status)}">${statusLabels[o.status] || esc(o.status)}</span></td>
                        <td><small style="color:#718277;">${date(o.created_at)}</small></td>
                      </tr>
                    `).join('') : `
                      <tr><td colspan="5" style="text-align:center;padding:24px;color:#718277;">Chưa có đơn hàng nào phát sinh.</td></tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 7-Day Revenue Chart -->
            <div class="dashboard-panel">
              <div class="dashboard-panel-header">
                <h3 class="dashboard-panel-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  <span>Biểu đồ doanh thu 7 ngày gần nhất</span>
                </h3>
                <span style="font-size:12.5px;color:#718277;">Tổng tuần: <b>${money(kpi.week_revenue)}</b></span>
              </div>
              <div class="chart-container">
                <div class="chart-bars-wrap">
                  ${chartData.length ? chartData.map(d => {
                    const rev = Number(d.daily_revenue || 0);
                    const pct = Math.max(8, Math.round((rev / maxRev) * 100));
                    const dateStr = d.order_date ? d.order_date.slice(5) : '';
                    return `
                      <div class="chart-bar-col" title="${d.order_date}: ${money(rev)} (${d.order_count} đơn)">
                        <span class="chart-bar-value">${rev > 0 ? (rev >= 1000000 ? (rev/1000000).toFixed(1)+'tr' : (rev/1000).toFixed(0)+'k') : ''}</span>
                        <div class="chart-bar-fill" style="height:${pct}%;"></div>
                        <span class="chart-bar-label">${dateStr}</span>
                      </div>
                    `;
                  }).join('') : `
                    <div style="width:100%;text-align:center;color:#718277;padding:30px 0;">
                      <p style="margin:0 0 6px;">📊 Chưa có phát sinh doanh thu trong 7 ngày qua.</p>
                      <small>Biểu đồ sẽ tự động hiển thị ngay khi có đơn hàng mới.</small>
                    </div>
                  `}
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Top Best Sellers & Low Stock -->
          <div style="display:flex;flex-direction:column;gap:20px;">
            <!-- Top Best Sellers -->
            <div class="dashboard-panel">
              <div class="dashboard-panel-header">
                <h3 class="dashboard-panel-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                  <span>Top sách bán chạy nhất</span>
                </h3>
                <a href="/admin/books" class="dashboard-panel-link">Xem tất cả →</a>
              </div>
              <div class="dashboard-book-list">
                ${topSelling.map((b, idx) => `
                  <div class="dashboard-book-item">
                    <span class="rank-badge rank-${idx + 1}">${idx + 1}</span>
                    <img class="dashboard-book-thumb" src="${esc(b.cover_url)}" alt="${esc(b.title)}" onerror="this.outerHTML='<div class=\'dashboard-book-thumb\' style=\'display:flex;align-items:center;justify-content:center;font-size:20px;\'>📖</div>'">
                    <div class="dashboard-book-info">
                      <h4 class="dashboard-book-title" title="${esc(b.title)}">${esc(b.title)}</h4>
                      <p class="dashboard-book-sub">${esc(b.authors)} · <b>${money(b.selling_price)}</b></p>
                    </div>
                    <div class="dashboard-book-stat stat-sold">
                      ${new Intl.NumberFormat('vi-VN').format(b.sold_count)}
                      <small style="display:block;font-size:10px;color:#718277;font-weight:400;">đã bán</small>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Low Stock Alert / Watchlist -->
            <div class="dashboard-panel">
              <div class="dashboard-panel-header">
                <h3 class="dashboard-panel-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  <span>Theo dõi tồn kho sách</span>
                </h3>
                <a href="/admin/inventory" class="dashboard-panel-link">Quản lý kho →</a>
              </div>
              <div class="dashboard-book-list">
                ${lowStock.map(b => `
                  <div class="dashboard-book-item">
                    <img class="dashboard-book-thumb" src="${esc(b.cover_url)}" alt="${esc(b.title)}" onerror="this.outerHTML='<div class=\'dashboard-book-thumb\' style=\'display:flex;align-items:center;justify-content:center;font-size:20px;\'>📖</div>'">
                    <div class="dashboard-book-info">
                      <h4 class="dashboard-book-title" title="${esc(b.title)}">${esc(b.title)}</h4>
                      <p class="dashboard-book-sub">${esc(b.authors)} · Tối thiểu: ${b.minimum_stock}</p>
                    </div>
                    <div class="dashboard-book-stat stat-lowstock">
                      Còn ${b.stock_quantity}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Modules Shortcuts Grid at Bottom -->
        <div class="dashboard-modules-header">
          <h3 style="font-size:16px;font-weight:700;color:#1a2e22;margin:10px 0 14px;">Truy cập nhanh các phân hệ</h3>
          <div class="dashboard-modules-grid">
            ${groups.map(([path, label, icon, desc]) => `
              <a class="module-shortcut-card" href="/admin/${path}">
                <div class="module-shortcut-icon">${icon}</div>
                <div class="module-shortcut-text">
                  <b>${label}</b>
                  <small>${desc}</small>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    `);

    // Wire Tiki button click in Dashboard
    const dashTikiBtn = document.querySelector('#dash-btn-crawl-tiki');
    if (dashTikiBtn) {
      dashTikiBtn.onclick = async () => {
        const confirmed = confirm('Bạn có muốn cào thêm sách mới từ Tiki (nhà sách c8322)?');
        if (!confirmed) return;
        const origText = dashTikiBtn.innerHTML;
        dashTikiBtn.disabled = true;
        dashTikiBtn.innerHTML = '<span>⏳ Đang cào Tiki...</span>';
        try {
          const res = await api('/api/admin/crawler/tiki', { method: 'POST', body: JSON.stringify({ limit_per_category: 10 }) });
          alert('Cào sách Tiki thành công! ' + (res.message || 'Đã cập nhật sách mới.'));
          location.reload();
        } catch (err) {
          alert('Lỗi khi cào sách Tiki: ' + (err.message || err));
          dashTikiBtn.disabled = false;
          dashTikiBtn.innerHTML = origText;
        }
      };
    }
  }


  async function combos() {
    const [combosList, booksList] = await Promise.all([
      api('/api/admin/combos'),
      api('/api/admin/data/books')
    ]);

    const activeBooks = (Array.isArray(booksList) ? booksList : []).filter(b => b.status !== 'DISCONTINUED');
    const bookMap = new Map(activeBooks.map(b => [String(b.work_id), b]));

    layout(`
      <span class="eyebrow">Quản trị / Bán hàng</span>
      <h1 class="page-title">Quản lý Combo Sách &amp; Trọn Bộ</h1>
      ${bookTools}
      <p class="mb-4 text-muted">Thiết lập các bộ sách nhiều tập (Tập 1 + Tập 2 + Tập 3...) hoặc sách mua cùng nhau với mức giá ưu đãi để kích thích khách hàng mua trọn bộ tại trang chi tiết.</p>
      
      <form id="combo-form" class="panel form-card mb-4" style="background:#fff;border-radius:16px;padding:24px;border:1px solid rgba(31,61,46,0.12);box-shadow:0 4px 20px rgba(0,0,0,0.04);">
        <div class="coupon-form-head mb-3 d-flex justify-content-between align-items-center">
          <div>
            <h3 id="combo-form-title" style="margin:0;font-size:18px;font-weight:700;color:#11291f;">+ Tạo gói Combo / Trọn Bộ mới</h3>
            <p id="combo-form-subtitle" class="text-muted small mb-0">Chọn sách chính (Tập 1) và một hoặc nhiều sách đi kèm (Tập 2, Tập 3...) để ghép trọn bộ.</p>
          </div>
          <span id="combo-edit-badge" class="badge bg-warning text-dark px-3 py-2" style="font-size:12px;border-radius:20px;" hidden>Đang chỉnh sửa</span>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label" style="font-weight:600;font-size:13px;color:#11291f;">1. Sách chính (Trang hiển thị combo / Tập 1) *</label>
            <input type="text" id="combo-search-main" class="form-control mb-1" placeholder="🔍 Gõ tìm sách chính theo tên/tác giả..." style="font-size:12px;border-radius:8px;">
            <select name="mainWorkId" id="combo-main-select" class="form-select" size="7" required style="font-size:12.5px;border-radius:8px;">
              ${activeBooks.map(b => `<option value="${esc(b.work_id)}">${esc(b.title)} — ${esc(b.authors)} (${money(b.selling_price)})</option>`).join('')}
            </select>
            <small class="text-muted d-block mt-1">Khi khách xem cuốn sách này, combo sẽ được hiển thị ngay bên dưới mô tả.</small>
          </div>

          <div class="col-md-6">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label class="form-label mb-0" style="font-weight:600;font-size:13px;color:#11291f;">2. Sách đi kèm (Tập 2, Tập 3...) *</label>
              <span id="combo-selected-count-badge" class="badge bg-primary" style="font-size:11px;">Đã chọn: 0 cuốn</span>
            </div>
            
            <!-- Danh sách Pills sách đã chọn -->
            <div id="combo-selected-pills" class="d-flex flex-wrap gap-1 mb-2 p-2" style="background:#f8faf8;border:1px dashed #c0d1c7;border-radius:8px;min-height:38px;align-items:center;">
              <small class="text-muted" id="combo-no-pills-hint">Chưa chọn sách đi kèm nào. Click vào sách ở danh sách dưới để chọn.</small>
            </div>

            <input type="text" id="combo-search-paired" class="form-control mb-1" placeholder="🔍 Gõ tìm sách đi kèm (click để chọn/bỏ chọn)..." style="font-size:12px;border-radius:8px;">
            <select id="combo-paired-select" class="form-select" size="6" style="font-size:12.5px;border-radius:8px;">
              ${activeBooks.map(b => `<option value="${esc(b.work_id)}">${esc(b.title)} — ${esc(b.authors)} (${money(b.selling_price)})</option>`).join('')}
            </select>
            <small class="text-muted d-block mt-1">💡 Click vào bất kỳ cuốn sách nào để chọn thêm vào combo (không cần giữ Ctrl).</small>
          </div>

          <div class="col-md-6">
            <label class="form-label" style="font-weight:600;font-size:13px;color:#11291f;">Tiêu đề Combo (Tùy chọn)</label>
            <input name="comboTitle" id="combo-title-input" class="form-control" placeholder="Ví dụ: Trọn bộ 3 tập Dạy Con Làm Giàu, Bộ đôi rèn luyện kỹ năng..." style="border-radius:8px;">
            <small class="text-muted">Để trống sẽ dùng tiêu đề mặc định: "Thường được mua cùng nhau".</small>
          </div>

          <div class="col-md-3">
            <label class="form-label" style="font-weight:600;font-size:13px;color:#11291f;">Mức giảm khi mua Combo (%) *</label>
            <div class="input-group">
              <input name="discountPercent" id="combo-discount-input" type="number" class="form-control" min="0" max="90" value="15" required style="border-radius:8px 0 0 8px;">
              <span class="input-group-text" style="border-radius:0 8px 8px 0;">%</span>
            </div>
            <small class="text-muted">Giảm trên tổng các cuốn trong combo.</small>
          </div>

          <div class="col-md-3">
            <label class="form-label" style="font-weight:600;font-size:13px;color:#11291f;">Trạng thái</label>
            <select name="status" id="combo-status-select" class="form-select" style="border-radius:8px;">
              <option value="ACTIVE">Đang bật (Hiển thị ngoài web)</option>
              <option value="INACTIVE">Đã tắt (Tạm ẩn)</option>
            </select>
          </div>
        </div>

        <div id="combo-preview-card" class="mt-3 p-3" style="background:#f9f7f2;border:1px dashed #cfc8b8;border-radius:12px;display:none;">
          <small class="fw-bold text-uppercase text-muted d-block mb-2">Xem trước combo hiển thị:</small>
          <div class="d-flex align-items-center gap-2 flex-wrap" id="preview-books-row"></div>
          <div id="preview-pricing" class="mt-2 p-2 px-3 text-end" style="background:#fff;border-radius:8px;border:1px solid #e2ddd0;"></div>
        </div>

        <div id="combo-form-message" class="mt-3"></div>

        <div class="d-flex gap-2 mt-4">
          <button id="combo-submit-btn" type="submit" class="btn-brand" style="border-radius:8px;padding:9px 24px;">+ Tạo Combo mới</button>
          <button id="combo-cancel-btn" type="button" class="pill light" style="border-radius:8px;padding:9px 18px;" hidden>Hủy chỉnh sửa</button>
        </div>
      </form>

      <div class="panel table-responsive" style="background:#fff;border-radius:16px;border:1px solid rgba(31,61,46,0.12);box-shadow:0 4px 20px rgba(0,0,0,0.04);">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center" style="background:rgba(31,61,46,0.03);">
          <b>Danh sách các gói Combo đã thiết lập (<span id="combo-count">${combosList.length}</span>)</b>
          <span class="text-muted small">Các sách chưa cấu hình combo riêng sẽ tự động dùng thuật toán gợi ý thông minh</span>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width: 28%">Sách chính</th>
              <th style="width: 32%">Sách đi kèm (Tập tiếp theo)</th>
              <th>Tiêu đề Combo</th>
              <th>Ưu đãi</th>
              <th>Trạng thái</th>
              <th style="width: 140px; text-align: center;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${combosList.length ? combosList.map(row => {
              const mainPrice = Number(row.main_price || 0);
              const pairedBooks = Array.isArray(row.paired_books) && row.paired_books.length ? row.paired_books : (row.paired_title ? [{
                id: row.id,
                work_id: row.paired_work_id,
                title: row.paired_title,
                authors: row.paired_authors,
                cover_url: row.paired_cover_url,
                selling_price: row.paired_price
              }] : []);

              let pairedTotal = 0;
              pairedBooks.forEach(pb => { pairedTotal += Number(pb.selling_price || 0); });
              const origTotal = mainPrice + pairedTotal;
              const discount = Number(row.discount_percent || 0);
              const saved = Math.round(origTotal * (discount / 100));
              const finalTotal = origTotal - saved;

              const mainCover = row.main_cover_url ? `<img src="${esc(row.main_cover_url)}" style="width:36px;height:48px;object-fit:cover;border-radius:4px;flex-shrink:0;">` : `<div style="width:36px;height:48px;background:#eee;border-radius:4px;display:grid;place-items:center;font-size:11px;font-weight:700;">S</div>`;

              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${mainCover}
                      <div>
                        <span class="badge bg-secondary mb-1" style="font-size:10px;">Sách chính</span>
                        <b style="display:block;font-size:13px;line-height:1.2;">${esc(row.main_title)}</b>
                        <small class="text-muted">${esc(row.main_authors)} · ${money(mainPrice)}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      <span class="badge bg-info text-dark" style="align-self:flex-start;font-size:11px;">+ ${pairedBooks.length} cuốn đi kèm</span>
                      ${pairedBooks.map(pb => `
                        <div style="display:flex;align-items:center;gap:8px;">
                          ${pb.cover_url ? `<img src="${esc(pb.cover_url)}" style="width:26px;height:36px;object-fit:cover;border-radius:3px;flex-shrink:0;">` : `<div style="width:26px;height:36px;background:#eee;border-radius:3px;display:grid;place-items:center;font-size:9px;">📖</div>`}
                          <div>
                            <b style="display:block;font-size:12px;line-height:1.2;">${esc(pb.title)}</b>
                            <small class="text-muted">${esc(pb.authors)} · ${money(pb.selling_price)}</small>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </td>
                  <td>
                    <b>${esc(row.combo_title || 'Thường được mua cùng nhau')}</b>
                    <div class="text-muted small mt-1">Trọn bộ ${1 + pairedBooks.length} cuốn</div>
                  </td>
                  <td>
                    <span class="badge ${discount > 0 ? 'bg-success' : 'bg-secondary'}" style="font-size:12px;">-${discount}%</span>
                    <div style="font-size:12px;margin-top:2px;">
                      <del class="text-muted">${money(origTotal)}</del> <b>${money(finalTotal)}</b>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${row.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}" style="font-size:11px;border-radius:12px;padding:5px 10px;">
                      ${row.status === 'ACTIVE' ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </td>
                  <td style="text-align: center;">
                    <div class="d-flex justify-content-center gap-1">
                      <button type="button" class="btn btn-sm btn-outline-secondary combo-edit-btn" data-id="${row.id}" data-main="${esc(row.main_work_id)}" title="Sửa">✏️</button>
                      <button type="button" class="btn btn-sm btn-outline-${row.status === 'ACTIVE' ? 'warning' : 'success'} combo-toggle-btn" data-id="${row.id}" data-status="${row.status}" title="${row.status === 'ACTIVE' ? 'Tắt' : 'Bật'}">
                        ${row.status === 'ACTIVE' ? '⏸️' : '▶️'}
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-danger combo-delete-btn" data-id="${row.id}" data-main="${esc(row.main_work_id)}" title="Xóa">🗑️</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="6" class="p-4 text-center text-muted">Chưa có gói combo nào được thiết lập. Hãy tạo gói combo đầu tiên ở trên!</td></tr>`}
          </tbody>
        </table>
      </div>
    `);

    // Interactive logic
    const form = document.querySelector('#combo-form');
    const mainSelect = document.querySelector('#combo-main-select');
    const pairedSelect = document.querySelector('#combo-paired-select');
    const searchMain = document.querySelector('#combo-search-main');
    const searchPaired = document.querySelector('#combo-search-paired');
    const discountInput = document.querySelector('#combo-discount-input');
    const titleInput = document.querySelector('#combo-title-input');
    const statusSelect = document.querySelector('#combo-status-select');
    const formTitle = document.querySelector('#combo-form-title');
    const formSubtitle = document.querySelector('#combo-form-subtitle');
    const editBadge = document.querySelector('#combo-edit-badge');
    const submitBtn = document.querySelector('#combo-submit-btn');
    const cancelBtn = document.querySelector('#combo-cancel-btn');
    const previewCard = document.querySelector('#combo-preview-card');
    const previewBooksRow = document.querySelector('#preview-books-row');
    const previewPricing = document.querySelector('#preview-pricing');
    const messageBox = document.querySelector('#combo-form-message');
    const countBadge = document.querySelector('#combo-selected-count-badge');
    const pillsContainer = document.querySelector('#combo-selected-pills');

    let editingId = null;
    let selectedPairedSet = new Set();

    // Render pills & sync
    function renderPills() {
      const arr = Array.from(selectedPairedSet);
      if (countBadge) {
        countBadge.textContent = `Đã chọn: ${arr.length} cuốn`;
      }
      if (!arr.length) {
        pillsContainer.innerHTML = '<small class="text-muted" id="combo-no-pills-hint">Chưa chọn sách đi kèm nào. Click vào sách ở danh sách dưới để chọn.</small>';
      } else {
        pillsContainer.innerHTML = arr.map(id => {
          const b = bookMap.get(id);
          const title = b ? b.title : id;
          const p = b ? money(b.selling_price) : '';
          return `
            <span class="badge d-inline-flex align-items-center gap-1" style="background:#1f3d2e;color:#fff;font-size:12px;padding:6px 10px;border-radius:18px;">
              <span>📖 ${esc(title)} (${p})</span>
              <button type="button" class="btn-close btn-close-white pill-remove-btn" data-id="${esc(id)}" aria-label="Xóa" style="font-size:8px;cursor:pointer;"></button>
            </span>
          `;
        }).join('');

        pillsContainer.querySelectorAll('.pill-remove-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            selectedPairedSet.delete(btn.dataset.id);
            renderPills();
            updatePreview();
          };
        });
      }
      updatePreview();
    }

    // Toggle paired book when clicked in select
    pairedSelect.addEventListener('change', (e) => {
      const val = pairedSelect.value;
      if (val) {
        if (selectedPairedSet.has(val)) {
          selectedPairedSet.delete(val);
        } else {
          selectedPairedSet.add(val);
        }
        pairedSelect.value = ''; // clear focus
        renderPills();
      }
    });

    // Filter selects
    function setupFilter(inputEl, selectEl) {
      inputEl.addEventListener('input', () => {
        const query = inputEl.value.toLowerCase().trim();
        const opts = selectEl.options;
        for (let i = 0; i < opts.length; i++) {
          const text = opts[i].textContent.toLowerCase();
          opts[i].hidden = query ? !text.includes(query) : false;
        }
      });
    }
    setupFilter(searchMain, mainSelect);
    setupFilter(searchPaired, pairedSelect);

    // Live preview update
    function updatePreview() {
      const mainVal = mainSelect.value;
      const pairedVals = Array.from(selectedPairedSet);

      if (!mainVal || !pairedVals.length) {
        previewCard.style.display = 'none';
        return;
      }
      const b1 = bookMap.get(String(mainVal));
      if (!b1) {
        previewCard.style.display = 'none';
        return;
      }
      previewCard.style.display = 'block';

      const c1 = b1.cover_url ? `<img src="${esc(b1.cover_url)}" style="width:32px;height:44px;object-fit:cover;border-radius:3px;">` : `<div style="width:32px;height:44px;background:#ddd;border-radius:3px;display:grid;place-items:center;">S</div>`;

      let html = `
        <div class="d-flex align-items-center gap-2 p-1 px-2" style="background:#fff;border-radius:8px;border:1px solid #ddd;">
          ${c1}<div><span class="badge bg-secondary" style="font-size:9px;">Chính</span><b style="font-size:12px;display:block;">${esc(b1.title)}</b><div class="text-muted" style="font-size:11px;">${money(b1.selling_price)}</div></div>
        </div>
      `;

      let origTotal = Number(b1.selling_price || 0);

      pairedVals.forEach(pv => {
        const b2 = bookMap.get(String(pv));
        if (b2) {
          origTotal += Number(b2.selling_price || 0);
          const c2 = b2.cover_url ? `<img src="${esc(b2.cover_url)}" style="width:32px;height:44px;object-fit:cover;border-radius:3px;">` : `<div style="width:32px;height:44px;background:#ddd;border-radius:3px;display:grid;place-items:center;">S</div>`;
          html += `
            <b style="font-size:18px;color:#bf5032;">+</b>
            <div class="d-flex align-items-center gap-2 p-1 px-2" style="background:#fff;border-radius:8px;border:1px solid #ddd;">
              ${c2}<div><span class="badge bg-info text-dark" style="font-size:9px;">Đi kèm</span><b style="font-size:12px;display:block;">${esc(b2.title)}</b><div class="text-muted" style="font-size:11px;">${money(b2.selling_price)}</div></div>
            </div>
          `;
        }
      });

      previewBooksRow.innerHTML = html;

      const disc = Math.max(0, Math.min(90, Number(discountInput.value || 0)));
      const saved = Math.round(origTotal * (disc / 100));
      const finalPrice = origTotal - saved;

      previewPricing.innerHTML = `
        <span class="badge ${disc > 0 ? 'bg-success' : 'bg-secondary'}" style="font-size:11px;">Giảm ${disc}% (Tiết kiệm ${money(saved)}) khi mua trọn bộ ${1 + pairedVals.length} cuốn</span>
        <div style="font-size:13px;margin-top:2px;"><del class="text-muted">${money(origTotal)}</del> <strong style="color:#bf5032;font-size:15px;">${money(finalPrice)}</strong></div>
      `;
    }

    mainSelect.addEventListener('change', updatePreview);
    discountInput.addEventListener('input', updatePreview);

    // Form submit
    form.onsubmit = async (e) => {
      e.preventDefault();
      messageBox.innerHTML = '';
      const mainId = mainSelect.value;
      const pairedIds = Array.from(selectedPairedSet);

      if (!mainId || !pairedIds.length) {
        messageBox.innerHTML = '<p class="message error">Vui lòng chọn Sách chính và ít nhất một Sách đi kèm.</p>';
        return;
      }
      if (pairedIds.includes(mainId)) {
        messageBox.innerHTML = '<p class="message error">Sách đi kèm không được trùng với Sách chính.</p>';
        return;
      }

      submitBtn.disabled = true;
      const origText = submitBtn.textContent;
      submitBtn.textContent = 'Đang lưu…';

      try {
        const payload = {
          main_work_id: mainId,
          paired_work_ids: pairedIds,
          combo_title: titleInput.value.trim() || null,
          discount_percent: Number(discountInput.value || 10),
          status: statusSelect.value
        };

        const currentScroll = window.scrollY;

        if (editingId) {
          await api(`/api/admin/combos/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
          showAdminPopup('Đã cập nhật', 'Gói combo sách đã được lưu thành công!', 'success');
        } else {
          await api('/api/admin/combos', { method: 'POST', body: JSON.stringify(payload) });
          showAdminPopup('Đã tạo thành công', `Gói combo trọn bộ ${1 + pairedIds.length} cuốn mới đã được thiết lập!`, 'success');
        }
        await combos();
        window.scrollTo({ top: currentScroll, behavior: 'instant' });
      } catch (err) {
        messageBox.innerHTML = `<p class="message error">${esc(err.message || 'Có lỗi xảy ra khi lưu combo.')}</p>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    };

    // Cancel edit
    cancelBtn.onclick = () => {
      editingId = null;
      selectedPairedSet.clear();
      form.reset();
      formTitle.textContent = '+ Tạo gói Combo / Trọn Bộ mới';
      formSubtitle.textContent = 'Chọn sách chính (Tập 1) và một hoặc nhiều sách đi kèm (Tập 2, Tập 3...) để ghép trọn bộ.';
      submitBtn.textContent = '+ Tạo Combo mới';
      editBadge.hidden = true;
      cancelBtn.hidden = true;
      previewCard.style.display = 'none';
      messageBox.innerHTML = '';
      renderPills();
    };

    // Row Edit
    document.querySelectorAll('.combo-edit-btn').forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.dataset.id);
        const combo = combosList.find(c => c.id === id || c.main_work_id === btn.dataset.main);
        if (!combo) return;

        editingId = id;
        mainSelect.value = combo.main_work_id;

        // Populate selectedPairedSet
        selectedPairedSet.clear();
        (combo.paired_books || []).forEach(pb => {
          if (pb.work_id) selectedPairedSet.add(String(pb.work_id));
        });
        renderPills();

        titleInput.value = combo.combo_title || '';
        discountInput.value = combo.discount_percent ?? 15;
        statusSelect.value = combo.status || 'ACTIVE';

        formTitle.textContent = `Chỉnh sửa Combo: ${combo.main_title}`;
        formSubtitle.textContent = `Gói combo gồm ${1 + selectedPairedSet.size} cuốn sách.`;
        submitBtn.textContent = 'Lưu thay đổi';
        editBadge.hidden = false;
        cancelBtn.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });

    // Row Toggle
    document.querySelectorAll('.combo-toggle-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        const curr = btn.dataset.status;
        const nextStatus = curr === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        btn.disabled = true;
        try {
          const currentScroll = window.scrollY;
          await api(`/api/admin/combos/${id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
          await combos();
          window.scrollTo({ top: currentScroll, behavior: 'instant' });
          showAdminPopup('Đã cập nhật', `Trạng thái combo đã được chuyển sang: ${nextStatus === 'ACTIVE' ? 'Bật' : 'Tắt'}`, 'success');
        } catch (err) {
          btn.disabled = false;
          showAdminPopup('Lỗi', err.message);
        }
      };
    });

    // Row Delete
    document.querySelectorAll('.combo-delete-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        if (!confirm('Bạn có chắc chắn muốn xóa gói combo này không?')) return;
        btn.disabled = true;
        try {
          const currentScroll = window.scrollY;
          await api(`/api/admin/combos/${id}`, { method: 'DELETE' });
          await combos();
          window.scrollTo({ top: currentScroll, behavior: 'instant' });
          showAdminPopup('Đã xóa', 'Gói combo đã được xóa.', 'success');
        } catch (err) {
          btn.disabled = false;
          showAdminPopup('Lỗi', err.message);
        }
      };
    });
  }

  async function customers() {
    const rows = await api('/api/admin/data/customers');
    const customerList = Array.isArray(rows) ? rows : [];

    const totalCustomers = customerList.length;
    const buyingCustomers = customerList.filter(r => Number(r.order_count) > 0).length;
    const totalSpentAll = customerList.reduce((acc, r) => acc + Number(r.total_spent || 0), 0);
    const activeCustomers = customerList.filter(r => r.status === 'ACTIVE').length;

    const getTier = (spent, orders) => {
      if (spent >= 500000 || orders >= 3) return { label: '⭐ VIP', class: 'bg-warning text-dark', code: 'VIP' };
      if (orders >= 1) return { label: 'Thân thiết', class: 'bg-info text-dark', code: 'MEMBER' };
      return { label: 'Mới', class: 'bg-light text-muted', code: 'NEW' };
    };

    layout(`
      <span class="eyebrow">Quản trị / Người dùng</span>
      <h1 class="page-title">Quản lý Khách hàng</h1>
      <p class="mb-4 text-muted">Theo dõi danh sách khách hàng, lịch sử mua sắm, giá trị chi tiêu tích lũy và kiểm soát trạng thái tài khoản.</p>

      <!-- KPI Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="panel p-3 d-flex align-items-center gap-3" style="background:#fff;border-radius:14px;border:1px solid rgba(17,41,31,0.08);box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="width:48px;height:48px;border-radius:12px;background:#e0f2fe;color:#0284c7;display:grid;place-items:center;font-size:22px;flex-shrink:0;">👥</div>
            <div>
              <small class="text-muted text-uppercase fw-bold" style="font-size:11px;letter-spacing:0.5px;">Tổng khách hàng</small>
              <div style="font-size:22px;font-weight:800;color:#11291f;line-height:1.2;">${totalCustomers} <span style="font-size:13px;font-weight:500;color:#6d7f74;">tài khoản</span></div>
              <small class="text-success" style="font-size:11.5px;">✓ ${activeCustomers} đang hoạt động</small>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="panel p-3 d-flex align-items-center gap-3" style="background:#fff;border-radius:14px;border:1px solid rgba(17,41,31,0.08);box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="width:48px;height:48px;border-radius:12px;background:#fef3c7;color:#d97706;display:grid;place-items:center;font-size:22px;flex-shrink:0;">🛍️</div>
            <div>
              <small class="text-muted text-uppercase fw-bold" style="font-size:11px;letter-spacing:0.5px;">Khách đã mua hàng</small>
              <div style="font-size:22px;font-weight:800;color:#11291f;line-height:1.2;">${buyingCustomers} <span style="font-size:13px;font-weight:500;color:#6d7f74;">khách (${Math.round((buyingCustomers / (totalCustomers || 1)) * 100)}%)</span></div>
              <small class="text-muted" style="font-size:11.5px;">Đã phát sinh đơn hàng thực tế</small>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="panel p-3 d-flex align-items-center gap-3" style="background:#fff;border-radius:14px;border:1px solid rgba(17,41,31,0.08);box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="width:48px;height:48px;border-radius:12px;background:#dcfce7;color:#16a34a;display:grid;place-items:center;font-size:22px;flex-shrink:0;">💳</div>
            <div>
              <small class="text-muted text-uppercase fw-bold" style="font-size:11px;letter-spacing:0.5px;">Tổng chi tiêu tích lũy</small>
              <div style="font-size:22px;font-weight:800;color:#11291f;line-height:1.2;">${money(totalSpentAll)}</div>
              <small class="text-muted" style="font-size:11.5px;">Doanh thu từ tài khoản khách hàng</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="panel p-3 mb-4 d-flex gap-3 align-items-center flex-wrap" style="background:#fff;border-radius:14px;border:1px solid rgba(17,41,31,0.08);box-shadow:0 2px 8px rgba(0,0,0,0.02);">
        <div class="flex-grow-1" style="min-width:240px;">
          <input type="text" id="customer-search-input" class="form-control" placeholder="🔍 Tìm theo Họ tên, Email, Số điện thoại hoặc Mã KH..." style="border-radius:8px;font-size:13px;padding:9px 14px;">
        </div>
        <div style="min-width:170px;">
          <select id="customer-status-filter" class="form-select" style="border-radius:8px;font-size:13px;padding:9px 12px;">
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang hoạt động (Active)</option>
            <option value="LOCKED">🔴 Đã bị khóa (Locked)</option>
          </select>
        </div>
        <div style="min-width:170px;">
          <select id="customer-tier-filter" class="form-select" style="border-radius:8px;font-size:13px;padding:9px 12px;">
            <option value="ALL">Tất cả phân hạng</option>
            <option value="VIP">⭐ VIP (>500.000đ)</option>
            <option value="MEMBER">🏷️ Thân thiết (Đã có đơn)</option>
            <option value="NEW">🌱 Khách mới (Chưa có đơn)</option>
          </select>
        </div>
      </div>

      <!-- Customers Table -->
      <div class="panel table-responsive" style="background:#fff;border-radius:14px;border:1px solid rgba(17,41,31,0.08);box-shadow:0 2px 8px rgba(0,0,0,0.02);overflow:hidden;">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center" style="background:rgba(31,61,46,0.02);">
          <b>Danh sách khách hàng (<span id="customer-count">${totalCustomers}</span>)</b>
          <small class="text-muted">Nhấn Khóa 🔒 để chặn tài khoản vi phạm hoặc Mở khóa 🔓 bất kỳ lúc nào</small>
        </div>
        <table class="admin-table" id="customers-table">
          <thead>
            <tr>
              <th style="width: 25%">Khách hàng</th>
              <th style="width: 22%">Liên hệ</th>
              <th>Phân hạng & Chi tiêu</th>
              <th>Đơn hàng</th>
              <th>Ngày tham gia</th>
              <th>Trạng thái</th>
              <th style="width: 120px; text-align: center;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="customers-tbody">
          </tbody>
        </table>
      </div>
    `);

    function renderRows(list) {
      const tbody = document.querySelector('#customers-tbody');
      const countEl = document.querySelector('#customer-count');
      if (countEl) countEl.textContent = list.length;
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-muted">Không tìm thấy khách hàng nào phù hợp với bộ lọc.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(r => {
        const spent = Number(r.total_spent || 0);
        const orders = Number(r.order_count || 0);
        const tier = getTier(spent, orders);
        const avatarLetter = (r.full_name || r.email || 'K')[0].toUpperCase();
        const isLocked = r.status === 'LOCKED';

        return `
          <tr data-id="${r.id}">
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg, #1f3d2e 0%, #2f5641 100%);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px;flex-shrink:0;">
                  ${esc(avatarLetter)}
                </div>
                <div>
                  <b style="display:block;font-size:13.5px;color:#11291f;line-height:1.2;">${esc(r.full_name || 'Khách vãng lai')}</b>
                  <code style="font-size:11px;color:#6d7f74;background:#f3f4f6;padding:1px 5px;border-radius:4px;">${esc(r.user_code || ('KH' + r.id))}</code>
                </div>
              </div>
            </td>
            <td>
              <div style="font-size:12.5px;color:#11291f;">${esc(r.email)}</div>
              <div style="font-size:11.5px;color:#6d7f74;margin-top:2px;">📞 ${esc(r.phone || 'Chưa cập nhật')}</div>
            </td>
            <td>
              <span class="badge ${tier.class}" style="font-size:11px;padding:4px 8px;border-radius:6px;">${tier.label}</span>
              <div style="font-size:13px;font-weight:700;color:#bf5032;margin-top:3px;">
                ${money(spent)}
              </div>
            </td>
            <td>
              <div style="font-weight:600;font-size:13px;">${orders} đơn</div>
              ${orders > 0 ? '<a href="/admin/orders" class="small text-primary text-decoration-none" style="font-size:11px;">Xem đơn hàng →</a>' : '<small class="text-muted" style="font-size:11px;">Chưa mua</small>'}
            </td>
            <td style="font-size:12px;color:#555;">
              ${date(r.created_at)}
            </td>
            <td>
              <span class="badge ${isLocked ? 'bg-danger' : r.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}" style="font-size:11px;border-radius:12px;padding:5px 10px;">
                ${isLocked ? 'Đã khóa' : r.status === 'ACTIVE' ? 'Hoạt động' : 'Chưa kích hoạt'}
              </span>
            </td>
            <td style="text-align: center;">
              <button type="button" class="btn btn-sm ${isLocked ? 'btn-outline-success' : 'btn-outline-danger'} customer-lock-btn" data-id="${r.id}" data-status="${isLocked ? 'ACTIVE' : 'LOCKED'}" data-name="${esc(r.full_name || r.email)}" style="border-radius:6px;font-size:11.5px;padding:4px 10px;">
                ${isLocked ? '🔓 Mở khóa' : '🔒 Khóa'}
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.customer-lock-btn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          const targetStatus = btn.dataset.status;
          const name = btn.dataset.name;
          const actionText = targetStatus === 'LOCKED' ? 'khóa tài khoản' : 'mở khóa tài khoản';

          if (!confirm(`Bạn có chắc chắn muốn ${actionText} của "${name}" không?`)) return;

          btn.disabled = true;
          try {
            await api(`/api/admin/customers/${id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: targetStatus })
            });
            showAdminPopup('Thành công', `Đã ${actionText} thành công.`, 'success');
            await customers();
          } catch (err) {
            btn.disabled = false;
            showAdminPopup('Không thể cập nhật', err.message);
          }
        };
      });
    }

    renderRows(customerList);

    const searchInput = document.querySelector('#customer-search-input');
    const statusFilter = document.querySelector('#customer-status-filter');
    const tierFilter = document.querySelector('#customer-tier-filter');

    function applyFilter() {
      const q = (searchInput?.value || '').toLowerCase().trim();
      const st = statusFilter?.value || 'ALL';
      const tr = tierFilter?.value || 'ALL';

      const filtered = customerList.filter(r => {
        if (q) {
          const name = (r.full_name || '').toLowerCase();
          const email = (r.email || '').toLowerCase();
          const phone = (r.phone || '').toLowerCase();
          const code = (r.user_code || '').toLowerCase();
          if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !code.includes(q)) return false;
        }

        if (st !== 'ALL') {
          if (r.status !== st) return false;
        }

        if (tr !== 'ALL') {
          const spent = Number(r.total_spent || 0);
          const orders = Number(r.order_count || 0);
          const tier = getTier(spent, orders);
          if (tier.code !== tr) return false;
        }

        return true;
      });

      renderRows(filtered);
    }

    if (searchInput) searchInput.addEventListener('input', applyFilter);
    if (statusFilter) statusFilter.addEventListener('change', applyFilter);
    if (tierFilter) tierFilter.addEventListener('change', applyFilter);
  }

  let isNavigating = false;

  async function renderModule(mod) {
    currentModule = mod;
    document.body.dataset.module = mod;
    bookTools = getBookTools(mod);
    updateSidebarActive(mod);
    progressBar.start();

    try {
      if (mod === 'dashboard') await dashboard();
      else if (mod === 'books') await books();
      else if (mod === 'orders') await orders();
      else if (mod === 'categories') await categories();
      else if (mod === 'coupons') await coupons();
      else if (mod === 'combos') await combos();
      else if (mod === 'customers') await customers();
      else if (mod === 'reviews') await reviews();
      else if (entityConfigs[mod]) await entities();
      else if (mod === 'inventory') await inventory();
      else if (mod === 'imports') await imports();
      else if (mod === 'history') await history();
      else if (mod === 'reports') await reports();
      else await generic();
    } catch (err) {
      console.error('Module load error:', err);
      layout(`<div class="panel p-4" style="background:#fff;border-radius:14px;border:1px solid #fee2e2;"><h3 style="color:#dc2626;">Không thể tải dữ liệu module ${esc(mod)}</h3><p style="color:#666;">${esc(err.message)}</p><button class="btn-brand mt-3" onclick="location.reload()">Tải lại trang</button></div>`);
    } finally {
      progressBar.done();
    }
  }

  async function navigateTo(targetModule, push = true) {
    if (isNavigating) return;
    isNavigating = true;

    try {
      if (push) {
        const targetUrl = targetModule === 'dashboard' ? '/admin' : `/admin/${targetModule}`;
        if (location.pathname !== targetUrl) {
          history.pushState({ module: targetModule }, '', targetUrl);
        }
      }

      // 1. Instant Optimistic UI feedback (0ms delay)
      updateSidebarActive(targetModule);
      if (isBookSub(targetModule)) {
        const slot = root.querySelector('#admin-subnav-slot');
        if (slot) {
          slot.style.display = 'block';
          updateSubnavActive(targetModule);
        }
      }

      // 2. Soft dim current inner view while loading new data
      const viewEl = root.querySelector('#admin-view');
      if (viewEl) viewEl.classList.add('is-loading');

      // 3. Render new module
      await renderModule(targetModule);

      // 4. Smart scroll: only smoothly scroll up if user was deep down the page
      if (window.scrollY > 280) {
        window.scrollTo({ top: 80, behavior: 'smooth' });
      }
    } finally {
      isNavigating = false;
      const viewEl = root.querySelector('#admin-view');
      if (viewEl) viewEl.classList.remove('is-loading');
    }
  }

  // Intercept all clicks on admin links for instant SPA navigation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('/admin') || link.getAttribute('target') === '_blank') return;
    if (href.startsWith('/admin/login') || href.startsWith('/admin/logout')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const cleanPath = href.split('?')[0].split('#')[0];
    const parts = cleanPath.split('/').filter(Boolean);
    const targetModule = parts[1] || 'dashboard';

    e.preventDefault();
    if (targetModule === currentModule && !href.includes('?')) return;
    navigateTo(targetModule, true);
  });

  // Handle browser Back / Forward buttons
  window.addEventListener('popstate', () => {
    const cleanPath = location.pathname.split('?')[0].split('#')[0];
    const parts = cleanPath.split('/').filter(Boolean);
    const targetModule = parts[1] || 'dashboard';
    navigateTo(targetModule, false);
  });

  async function boot() {
    let user = null;
    try {
      user = await api('/api/session');
    } catch(err) {
      console.warn('Admin session check failed:', err);
      location.replace('/admin/login');
      return;
    }

    if (!user?.id || user.role !== 'ADMIN') {
      location.replace('/admin/login');
      return;
    }

    const accountNav = document.querySelector('#account-nav');
    if (accountNav) {
      accountNav.innerHTML = `<a href="/admin">Quản trị</a><a href="/account">${esc(user.name)}</a><button class="pill light" id="admin-logout">Đăng xuất</button>`;
      const logoutBtn = document.querySelector('#admin-logout');
      if (logoutBtn) {
        logoutBtn.onclick = async () => {
          await fetch('/api/auth/logout', { method: 'POST', headers: {'Content-Type': 'application/json'} });
          location.replace('/admin/login');
        };
      }
    }

    const cleanPath = location.pathname.split('?')[0].split('#')[0];
    const parts = cleanPath.split('/').filter(Boolean);
    const initialModule = parts[1] || 'dashboard';

    try {
      await renderModule(initialModule);
    } catch(err) {
      console.error('Failed to load initial admin module:', err);
      layout(`<div class="panel p-4" style="background:#fff;border-radius:14px;border:1px solid #fee2e2;"><h3 style="color:#dc2626;">Không thể tải module ${esc(initialModule)}</h3><p style="color:#666;">${esc(err.message)}</p></div>`);
    }
  }
  boot();
})();
