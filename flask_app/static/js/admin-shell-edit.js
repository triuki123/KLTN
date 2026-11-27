/* Modern Slide-out Edit Drawer for Books Admin Screen */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + 'đ';

  const api = async (url, options = {}) => {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể lưu dữ liệu.');
    return payload.data;
  };

  // Toast notification
  function showToast(msg) {
    document.querySelectorAll('.admin-toast-float').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'admin-toast-float';
    toast.innerHTML = `<span style="color:#34d399;font-size:16px;">✓</span><span>${esc(msg)}</span>`;
    document.body.append(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  let activeRow = null;

  async function openEdit(book) {
    // Remove any existing drawer
    document.querySelector('#book-edit-backdrop')?.remove();
    document.querySelector('#book-edit-drawer')?.remove();
    document.querySelectorAll('.is-editing-row').forEach(tr => tr.classList.remove('is-editing-row'));

    // Highlight active row in table WITHOUT scrolling
    activeRow = document.querySelector(`.btn-edit-book[data-work-id="${book.work_id}"]`)?.closest('tr');
    if (activeRow) activeRow.classList.add('is-editing-row');

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'book-edit-backdrop';
    backdrop.className = 'book-drawer-backdrop';
    document.body.append(backdrop);

    // Create drawer
    const drawer = document.createElement('aside');
    drawer.id = 'book-edit-drawer';
    drawer.className = 'book-drawer-panel';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');

    drawer.innerHTML = `
      <div class="book-drawer-header">
        <div style="min-width:0;">
          <span class="badge bg-primary mb-1" style="font-size:10.5px;letter-spacing:0.4px;">MÃ SÁCH: ${esc(book.work_id)}</span>
          <h3 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Chỉnh sửa: ${esc(book.title)}</h3>
          <small style="color:#63756a;display:block;">${esc(book.authors)} · Kho hiện tại: <b>${book.stock_quantity || 0} cuốn</b></small>
        </div>
        <button type="button" class="book-drawer-close" id="close-book-drawer" title="Đóng (Esc)">✕</button>
      </div>

      <form id="book-edit-form" class="book-drawer-body">
        <!-- 1. Thông tin tác phẩm -->
        <div>
          <div class="book-drawer-section-title">1. Thông tin tác phẩm</div>
          <div class="mb-3">
            <label class="form-label" style="font-weight:600;font-size:12.5px;">Tên sách *</label>
            <input name="title" class="form-control" value="${esc(book.title)}" required style="border-radius:8px;">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-7">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Tác giả *</label>
              <input name="authors" class="form-control" value="${esc(book.authors)}" required style="border-radius:8px;">
            </div>
            <div class="col-5">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Mã ISBN</label>
              <input name="isbn" class="form-control" value="${esc(book.isbn || '')}" style="border-radius:8px;">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Nhà xuất bản</label>
              <input name="publisherName" class="form-control" value="${esc(book.publisher_name || '')}" style="border-radius:8px;">
            </div>
            <div class="col-3">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Năm XB</label>
              <input name="publicationYear" type="number" class="form-control" value="${esc(book.publication_year || '')}" style="border-radius:8px;">
            </div>
            <div class="col-3">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Số trang</label>
              <input name="pageCount" type="number" class="form-control" value="${esc(book.page_count || '')}" style="border-radius:8px;">
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-weight:600;font-size:12.5px;">Giới thiệu / Tóm tắt sách</label>
            <textarea name="description" class="form-control" rows="4" style="border-radius:8px;font-size:12.5px;">${esc(book.description || '')}</textarea>
          </div>
        </div>

        <!-- 2. Giá & Tồn kho -->
        <div>
          <div class="book-drawer-section-title">2. Giá bán &amp; Tồn kho</div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Giá niêm yết (VNĐ) *</label>
              <input name="sellingPrice" type="number" min="0" class="form-control" value="${book.selling_price || 99000}" required style="border-radius:8px;">
            </div>
            <div class="col-6">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Giá khuyến mãi (VNĐ)</label>
              <input name="promotionalPrice" type="number" min="0" class="form-control" value="${book.promotional_price || ''}" placeholder="Để trống nếu không giảm" style="border-radius:8px;">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Tồn kho thực tế (cuốn) *</label>
              <input name="stockQuantity" type="number" min="0" class="form-control" value="${book.stock_quantity ?? 0}" required style="border-radius:8px;">
            </div>
            <div class="col-6">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">Tồn tối thiểu cảnh báo</label>
              <input name="minimumStock" type="number" min="0" class="form-control" value="${book.minimum_stock ?? 5}" style="border-radius:8px;">
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label" style="font-weight:600;font-size:12.5px;">Lý do điều chỉnh kho</label>
            <input name="reason" class="form-control" value="Chỉnh sửa thông tin sách" style="border-radius:8px;">
          </div>
        </div>

        <!-- 3. Ảnh bìa -->
        <div>
          <div class="book-drawer-section-title">3. Ảnh bìa sách</div>
          <div class="d-flex gap-3 align-items-center">
            <img id="drawer-cover-img" src="${esc(book.cover_url || '')}" alt="" onerror="this.src='/static/icons/book-placeholder.svg'" style="width:50px;height:70px;object-fit:cover;border-radius:4px;border:1px solid #ddd;flex-shrink:0;">
            <div class="flex-grow-1">
              <label class="form-label" style="font-weight:600;font-size:12.5px;">URL ảnh bìa</label>
              <input name="coverUrl" id="drawer-cover-input" class="form-control" value="${esc(book.cover_url || '')}" placeholder="https://..." style="border-radius:8px;font-size:12px;">
            </div>
          </div>
        </div>

        <div id="drawer-message" class="mt-2"></div>
      </form>

      <div class="book-drawer-footer">
        <button type="button" class="btn btn-outline-secondary" id="cancel-book-drawer" style="border-radius:8px;padding:8px 18px;">Hủy (Đóng)</button>
        <button type="submit" form="book-edit-form" class="btn-brand" id="save-book-drawer" style="border-radius:8px;padding:8px 22px;">✓ Lưu thay đổi</button>
      </div>
    `;

    document.body.append(drawer);

    // Open animation
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      drawer.classList.add('is-open');
    });

    const coverInput = drawer.querySelector('#drawer-cover-input');
    const coverImg = drawer.querySelector('#drawer-cover-img');
    if (coverInput && coverImg) {
      coverInput.addEventListener('input', () => {
        coverImg.src = coverInput.value.trim() || '/static/icons/book-placeholder.svg';
      });
    }

    const closeDrawer = () => {
      backdrop.classList.remove('is-open');
      drawer.classList.remove('is-open');
      if (activeRow) activeRow.classList.remove('is-editing-row');
      setTimeout(() => {
        backdrop.remove();
        drawer.remove();
      }, 280);
    };

    drawer.querySelector('#close-book-drawer').onclick = closeDrawer;
    drawer.querySelector('#cancel-book-drawer').onclick = closeDrawer;
    backdrop.onclick = closeDrawer;

    // Handle escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Handle Form Submit (In-Place Table Update)
    const form = drawer.querySelector('#book-edit-form');
    const saveBtn = drawer.querySelector('#save-book-drawer');
    const msgBox = drawer.querySelector('#drawer-message');

    form.onsubmit = async (event) => {
      event.preventDefault();
      msgBox.innerHTML = '';
      saveBtn.disabled = true;
      const origText = saveBtn.textContent;
      saveBtn.textContent = 'Đang lưu…';

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData);

      try {
        await api(`/api/admin/data/books/${encodeURIComponent(book.work_id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });

        // IN-PLACE OPTIMISTIC UPDATE ON TABLE ROW:
        if (activeRow) {
          const newTitle = String(payload.title || book.title);
          const newAuthors = String(payload.authors || book.authors);
          const newSelling = Number(payload.sellingPrice || book.selling_price || 0);
          const newPromo = Number(payload.promotionalPrice || 0);
          const newStock = Number(payload.stockQuantity || 0);
          const newMin = Number(payload.minimumStock || 0);
          const newCover = String(payload.coverUrl || book.cover_url || '');

          // Update book meta
          const h4 = activeRow.querySelector('.book-meta h4');
          if (h4) h4.textContent = newTitle;
          const sm = activeRow.querySelector('.book-meta small');
          if (sm) sm.textContent = newAuthors;

          // Update price cell
          const priceCell = activeRow.querySelector('.price-cell') || activeRow.querySelector('td:nth-child(3)');
          if (priceCell) {
            const hasPromo = newPromo > 0 && newPromo < newSelling;
            priceCell.innerHTML = hasPromo
              ? `<span class="promo-price">${money(newPromo)}</span><span class="original-price-strike">${money(newSelling)}</span>`
              : `<span class="selling-price">${money(newSelling)}</span>`;
          }

          // Update stock badge
          const stockCell = activeRow.querySelector('td:nth-child(4)');
          if (stockCell) {
            let badgeHtml = '';
            if (newStock <= 0) badgeHtml = `<span class="stock-badge out-of-stock">Hết hàng</span>`;
            else if (newStock <= newMin) badgeHtml = `<span class="stock-badge low-stock">Sắp hết (${newStock})</span>`;
            else badgeHtml = `<span class="stock-badge in-stock">Còn ${newStock}</span>`;
            stockCell.innerHTML = badgeHtml;
          }

          // Update min stock
          const minCell = activeRow.querySelector('td:nth-child(5)');
          if (minCell) minCell.textContent = newMin;

          // Update cover
          if (newCover) {
            const img = activeRow.querySelector('.book-thumb');
            if (img) img.src = newCover;
          }

          // Update cached book object
          Object.assign(book, payload);

          // Flash row highlight
          activeRow.classList.remove('is-editing-row');
          activeRow.classList.add('is-updated-row');
          setTimeout(() => activeRow.classList.remove('is-updated-row'), 2000);
        }

        // Close drawer smoothly
        closeDrawer();
        showToast(`Đã lưu thay đổi sách "${payload.title || book.title}"!`);
      } catch (err) {
        msgBox.innerHTML = `<p class="message error" style="color:#dc2626;font-size:12.5px;">${esc(err.message || 'Có lỗi xảy ra khi lưu sách.')}</p>`;
        saveBtn.disabled = false;
        saveBtn.textContent = origText;
      }
    };
  }

  window.adminOpenEditBook = openEdit;

  async function bind() {
    const table = document.querySelector('.admin-table');
    if (!table || table.dataset.editBound) return;
    table.dataset.editBound = '1';

    let books = [];
    try {
      books = await api('/api/admin/data/books');
    } catch (_) {}

    document.querySelectorAll('.btn-edit-book').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const id = btn.dataset.workId;
        const b = books.find(item => item.work_id === id);
        if (b) openEdit(b);
      };
    });
  }

  const observer = new MutationObserver(() => {
    bind().catch(console.error);
  });
  observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  bind().catch(() => {});
})();
