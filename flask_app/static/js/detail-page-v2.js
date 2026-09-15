(() => {
  const root = document.querySelector('#app');
  if (!root || document.body.dataset.page !== 'detail') return;

  const workId = document.body.dataset.workId;
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = (value) => `${Number(value || 99000).toLocaleString('vi-VN')}đ`;

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(payload.error || payload.message || 'Không thể kết nối máy chủ.');
      error.status = response.status;
      throw error;
    }
    return payload.data ?? payload;
  }

  function showMessage(text, isError = false) {
    const box = document.querySelector('#detail-message');
    if (!box) return;
    box.innerHTML = `<p class="message${isError ? ' error' : ''}">${escapeHtml(text)}</p>`;
  }

  async function saveItem(book, kind, nextUrl = '') {
    const target = nextUrl ? document.querySelector('#buy-now') : document.querySelector(`#add-${kind}`);
    const originalText = target?.textContent;
    if (target) {
      target.disabled = true;
      target.textContent = nextUrl ? 'Đang chuyển…' : 'Đang lưu…';
    }
    try {
      await request(`/api/items/${kind}`, {
        method: 'POST',
        body: JSON.stringify({
          workId: book.workId,
          title: book.title,
          authors: (book.authors || []).join(', '),
          cover: book.cover
        })
      });
      if (nextUrl) {
        window.location.assign(nextUrl);
        return;
      }
      showMessage(kind === 'cart' ? 'Đã thêm sách vào giỏ hàng.' : 'Đã lưu vào danh sách yêu thích.');
    } catch (error) {
      if (error.status === 401) {
        const destination = nextUrl || window.location.pathname;
        window.location.assign(`/login?next=${encodeURIComponent(destination)}`);
        return;
      }
      showMessage(error.message, true);
    } finally {
      if (target && !nextUrl) {
        target.disabled = false;
        target.textContent = originalText;
      }
    }
  }

  function render(book) {
    const authors = (book.authors || []).join(', ') || 'Chưa rõ tác giả';
    const available = Number(book.stock) > 0;
    const cover = book.cover
      ? `<img class="detail-cover" src="${escapeHtml(book.cover)}" alt="Bìa sách ${escapeHtml(book.title)}">`
      : `<div class="detail-cover cover-placeholder" aria-label="Chưa có ảnh bìa">${escapeHtml((book.title || '?')[0])}</div>`;

    root.innerHTML = `
      <section class="shell detail">
        <div>${cover}</div>
        <article>
          <span class="eyebrow">Tác phẩm · Open Library</span>
          <h1>${escapeHtml(book.title)}</h1>
          <p class="author">${escapeHtml(authors)}</p>
          <span class="stock${available ? '' : ' out'}">${available ? `Còn ${book.stock} cuốn` : 'Hết hàng'}</span>
          <h3 class="mt-4">Giới thiệu sách</h3>
          <p class="detail-description">${escapeHtml(book.description || 'Thông tin giới thiệu đang được cập nhật.')}</p>
          <p class="detail-price">${money(book.price)}</p>
          <div class="actions detail-actions">
            <button id="add-cart" class="pill light" ${available ? '' : 'disabled'}>${available ? 'Thêm vào giỏ hàng' : 'Tạm hết hàng'}</button>
            <button id="buy-now" class="btn-brand" ${available ? '' : 'disabled'}>Mua ngay</button>
            <button id="add-favorite" class="pill light"><svg class="ui-icon" aria-hidden="true"><use href="/static/icons/ui-icons.svg#heart"></use></svg> Lưu yêu thích</button>
          </div>
          <div id="detail-message" aria-live="polite"></div>
        </article>
      </section>`;

    document.querySelector('#add-cart')?.addEventListener('click', () => saveItem(book, 'cart'));
    document.querySelector('#buy-now')?.addEventListener('click', () => saveItem(book, 'cart', '/checkout'));
    document.querySelector('#add-favorite')?.addEventListener('click', () => saveItem(book, 'favorite'));
  }

  async function boot() {
    try {
      render(await request(`/api/books/${encodeURIComponent(workId)}`));
    } catch (error) {
      root.innerHTML = `<section class="shell"><p class="message error">${escapeHtml(error.message)}</p></section>`;
    }
  }

  boot();
})();
