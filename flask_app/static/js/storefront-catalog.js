(() => {
  const root = document.querySelector('#app');
  const page = document.body.dataset.page;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const price = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const get = async url => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error('load');
    return body.data;
  };
  const cover = (url, title) => url
    ? `<img src="${esc(url)}" alt="Bìa sách ${esc(title)}" loading="lazy">`
    : `<div class="cover-placeholder">${esc(String(title || 'T').slice(0, 1))}</div>`;

  const couponRibbon = book => {
    if (!book.coupon_code || !book.coupon_discount_type) return '';
    const value = Number(book.coupon_discount_value || 0);
    const discount = book.coupon_discount_type === 'FREE_SHIPPING'
      ? 'MIỄN PHÍ VẬN CHUYỂN'
      : book.coupon_discount_type === 'PERCENT'
      ? `GIẢM ${value.toLocaleString('vi-VN')}%`
      : `GIẢM ${Math.round(value / 1000).toLocaleString('vi-VN')}K`;
    return `<span class="coupon-ribbon" title="Dùng mã ${esc(book.coupon_code)}">${esc(discount)}</span>`;
  };

  const card = book => {
    const workId = book.workId || book.work_id || '';
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Chưa rõ tác giả');
    const priceVal = Number(book.promotional_price || book.selling_price || 99000);
    const hasPrice = Boolean(book.selling_price || book.promotional_price);
    const inStock = book.stock_quantity == null || Number(book.stock_quantity) > 0;
    const rating = (4.0 + (Math.abs(String(workId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10) * 0.1).toFixed(1);

    return `<a class="book-card catalog-book-card" href="/books/${encodeURIComponent(workId)}">
      ${couponRibbon(book)}
      <div class="book-card-cover-wrap">
        <button type="button" class="quick-favorite-btn${book.is_favorite ? ' is-active' : ''}" data-work-id="${esc(workId)}" title="Lưu yêu thích" aria-label="Lưu yêu thích"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
        ${cover(book.cover || book.cover_url, book.title)}
        <span class="book-card-shine"></span>
        <span class="catalog-card-rating">★ ${rating}</span>
      </div>
      <h3>${esc(book.title)}</h3>
      <p>${esc(authors)}</p>
      <div class="catalog-card-meta">
        <b class="catalog-card-price">${hasPrice ? price(priceVal) : 'Giá ưu đãi'}</b>
        <span class="catalog-card-stock ${inStock ? '' : 'out'}">${book.stock_quantity != null ? (inStock ? `Còn ${book.stock_quantity}` : 'Tạm hết') : 'Có sẵn'}</span>
      </div>
    </a>`;
  };

  async function showBooks() {
    const params = new URLSearchParams(location.search);
    const category = params.get('category') || '';
    const initialQuery = params.get('q') || '';
    const initialSort = params.get('sort') || 'popular';
    const initialPrice = params.get('price') || 'all';

    const categoriesList = [
      { slug: 'van-hoc', label: 'Văn học' },
      { slug: 'kinh-te-kinh-doanh', label: 'Kinh tế - Kinh doanh' },
      { slug: 'ky-nang-song', label: 'Kỹ năng sống' },
      { slug: 'tam-ly-giao-duc', label: 'Tâm lý - Giáo dục' },
      { slug: 'khoa-hoc-cong-nghe', label: 'Khoa học - Công nghệ' },
      { slug: 'thieu-nhi', label: 'Thiếu nhi' },
      { slug: 'truyen-tranh-manga-comic', label: 'Truyện Tranh - Manga' },
      { slug: 'lich-su-dia-ly', label: 'Lịch sử - Địa lý' },
      { slug: 'suc-khoe-y-hoc-the-thao', label: 'Sức khỏe - Y học' },
      { slug: 'hoc-ngoai-ngu-tu-dien', label: 'Học Ngoại Ngữ' },
      { slug: 'triet-hoc-ton-giao-tam-linh', label: 'Triết học - Tâm linh' },
      { slug: 'am-thuc-doi-song-gia-dinh', label: 'Ẩm thực - Đời sống' }
    ];
    const categoryLabels = Object.fromEntries(categoriesList.map(c => [c.slug, c.label]));
    const categoryText = categoryLabels[category] || category.replaceAll('-', ' ');

    root.innerHTML = `
      <section class="shell catalog-page">
        <nav class="detail-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><b>Kho sách</b>${category ? `<span>/</span><b>${esc(categoryText)}</b>` : ''}</nav>
        <div class="section-head catalog-header">
          <div>
            <span class="eyebrow">Kho sách trực tuyến &middot; Trạm Sách</span>
            <h1 class="page-title">${category ? `Chủ đề: ${esc(categoryText)}` : 'Khám phá kho sách'}</h1>
            <p>Hàng ngàn tựa sách chọn lọc, cập nhật tồn kho minh bạch và giao hàng toàn quốc.</p>
          </div>
        </div>

        <div class="catalog-pills-row">
          <a class="catalog-pill ${!category ? 'active' : ''}" href="/books">Tất cả chủ đề</a>
          ${categoriesList.map(c => `<a class="catalog-pill ${category === c.slug ? 'active' : ''}" href="/books?category=${encodeURIComponent(c.slug)}">${esc(c.label)}</a>`).join('')}
        </div>

        <div class="catalog-toolbar">
          <form class="search catalog-search-box" id="catalog-search">
            <input id="catalog-query" value="${esc(initialQuery || (category ? '' : ''))}" placeholder="Tìm tên sách, tác giả hoặc ISBN…" autocomplete="off">
            <button class="btn-brand" type="submit">Tìm kiếm</button>
          </form>

          <div class="catalog-filters">
            <div class="catalog-filter-group">
              <label for="catalog-sort">Sắp xếp:</label>
              <select id="catalog-sort">
                <option value="popular" ${initialSort === 'popular' ? 'selected' : ''}>Bán chạy nhất</option>
                <option value="newest" ${initialSort === 'newest' ? 'selected' : ''}>Mới nhất</option>
                <option value="price-asc" ${initialSort === 'price-asc' ? 'selected' : ''}>Giá: Thấp đến cao</option>
                <option value="price-desc" ${initialSort === 'price-desc' ? 'selected' : ''}>Giá: Cao đến thấp</option>
              </select>
            </div>

            <div class="catalog-filter-group">
              <label for="catalog-price-filter">Khoảng giá:</label>
              <select id="catalog-price-filter">
                <option value="all" ${initialPrice === 'all' ? 'selected' : ''}>Tất cả mức giá</option>
                <option value="under-100" ${initialPrice === 'under-100' ? 'selected' : ''}>Dưới 100.000đ</option>
                <option value="100-200" ${initialPrice === '100-200' ? 'selected' : ''}>100.000đ – 200.000đ</option>
                <option value="above-200" ${initialPrice === 'above-200' ? 'selected' : ''}>Trên 200.000đ</option>
              </select>
            </div>

            <label class="catalog-stock-filter">
              <input type="checkbox" id="catalog-stock-only">
              <span>Chỉ còn hàng</span>
            </label>
          </div>
        </div>

        <div class="section-head mt-4">
          <span id="catalog-label" class="eyebrow">Đang tải danh sách sách…</span>
          <div class="catalog-active-filters" id="catalog-active-filters"></div>
        </div>

        <div id="catalog-results" class="book-grid">
          <div class="skeleton-grid" style="margin:0">
            <div class="skeleton-card"><div class="skeleton skeleton-cover"></div><div class="skeleton skeleton-text"></div></div>
            <div class="skeleton-card"><div class="skeleton skeleton-cover"></div><div class="skeleton skeleton-text"></div></div>
            <div class="skeleton-card"><div class="skeleton skeleton-cover"></div><div class="skeleton skeleton-text"></div></div>
            <div class="skeleton-card"><div class="skeleton skeleton-cover"></div><div class="skeleton skeleton-text"></div></div>
          </div>
        </div>

        <div id="catalog-more" class="text-center mt-5"></div>
      </section>`;

    const results = document.querySelector('#catalog-results');
    const label = document.querySelector('#catalog-label');
    const more = document.querySelector('#catalog-more');
    const sortSelect = document.querySelector('#catalog-sort');
    const priceSelect = document.querySelector('#catalog-price-filter');
    const stockCheck = document.querySelector('#catalog-stock-only');

    let rawBooks = [];
    let activeQuery = initialQuery || categoryText;
    let usingCategory = Boolean(category && !initialQuery);
    let currentPage = 1;
    let total = 0;
    let displayedCount = 0;

    const filterAndSort = books => {
      let filtered = [...books];
      const priceFilter = priceSelect.value;
      if (priceFilter === 'under-100') {
        filtered = filtered.filter(b => Number(b.promotional_price || b.selling_price || 99000) < 100000);
      } else if (priceFilter === '100-200') {
        filtered = filtered.filter(b => {
          const p = Number(b.promotional_price || b.selling_price || 99000);
          return p >= 100000 && p <= 200000;
        });
      } else if (priceFilter === 'above-200') {
        filtered = filtered.filter(b => Number(b.promotional_price || b.selling_price || 99000) > 200000);
      }

      if (stockCheck.checked) {
        filtered = filtered.filter(b => b.stock_quantity == null || Number(b.stock_quantity) > 0);
      }

      const sortMode = sortSelect.value;
      if (sortMode === 'price-asc') {
        filtered.sort((a, b) => Number(a.promotional_price || a.selling_price || 99000) - Number(b.promotional_price || b.selling_price || 99000));
      } else if (sortMode === 'price-desc') {
        filtered.sort((a, b) => Number(b.promotional_price || b.selling_price || 99000) - Number(a.promotional_price || a.selling_price || 99000));
      } else if (sortMode === 'newest') {
        filtered.sort((a, b) => new Date(b.updated_at || b.year || 0) - new Date(a.updated_at || a.year || 0));
      } else {
        filtered.sort((a, b) => Number(b.sold_count || 0) - Number(a.sold_count || 0));
      }

      return filtered;
    };

    const renderEmpty = () => `
      <div class="panel form-card text-center py-5 catalog-empty-box" style="grid-column: 1 / -1;">
        <div style="font-size: 42px; margin-bottom: 12px;">📚</div>
        <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Không tìm thấy tác phẩm phù hợp</h3>
        <p style="color: var(--muted, #666); max-width: 480px; margin: 0 auto 18px;">Hãy thử tìm kiếm với từ khóa khác, hoặc khám phá các chủ đề sách nổi bật của Trạm Sách bên dưới.</p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <a class="pill light" href="/books?q=Văn học">Văn học</a>
          <a class="pill light" href="/books?q=Kinh tế">Kinh tế</a>
          <a class="pill light" href="/books?q=Kỹ năng">Kỹ năng sống</a>
          <a class="pill light" href="/books?q=Tâm lý">Tâm lý</a>
        </div>
        <button type="button" class="btn-brand mt-4" id="btn-reset-filters">Xóa bộ lọc & Xem tất cả sách</button>
      </div>`;

    const renderList = () => {
      const displayable = filterAndSort(rawBooks);
      if (!displayable.length) {
        results.innerHTML = renderEmpty();
        document.querySelector('#btn-reset-filters')?.addEventListener('click', () => {
          priceSelect.value = 'all';
          stockCheck.checked = false;
          sortSelect.value = 'popular';
          document.querySelector('#catalog-query').value = '';
          activeQuery = '';
          usingCategory = false;
          load(true);
        });
        label.textContent = '0 kết quả phù hợp';
        more.innerHTML = '';
        return;
      }
      results.innerHTML = displayable.map(card).join('');
      label.textContent = `Hiển thị ${displayable.length} / ${total || displayable.length} cuốn sách`;
      drawMore();
    };

    const drawMore = () => {
      const canLoad = activeQuery && displayedCount < total;
      more.innerHTML = canLoad
        ? `<button id="load-more-books" class="btn-brand" style="min-width: 220px;">Xem thêm sách (${Math.max(0, total - displayedCount).toLocaleString('vi-VN')} cuốn còn lại)</button>`
        : '';
      const button = document.querySelector('#load-more-books');
      if (button) button.addEventListener('click', () => load(false));
    };

    const load = async reset => {
      if (reset) {
        currentPage = 1;
        displayedCount = 0;
        rawBooks = [];
        results.innerHTML = '<p class="loading">Đang tải sách từ kho dữ liệu…</p>';
        more.innerHTML = '';
      } else {
        const button = document.querySelector('#load-more-books');
        if (button) {
          button.disabled = true;
          button.textContent = 'Đang tải thêm sách…';
        }
      }

      try {
        let items = [];
        if (!activeQuery) {
          const homeBooks = await get('/api/home?limit=30');
          items = homeBooks || [];
          total = items.length;
        } else {
          const endpoint = usingCategory
            ? `/api/category-books/${encodeURIComponent(category)}?page=${currentPage}&limit=36`
            : `/api/books?q=${encodeURIComponent(activeQuery)}&page=${currentPage}&limit=36`;
          let data = await get(endpoint);
          if (usingCategory && !(data.items || []).length) {
            data = await get(`/api/books?q=${encodeURIComponent(categoryText)}&page=${currentPage}&limit=36`);
          }
          items = data.items || [];
          total = Number(data.total || 0);
        }

        if (reset) rawBooks = items;
        else rawBooks.push(...items);

        displayedCount += items.length;
        if (items.length) currentPage += 1;
        renderList();
      } catch (_) {
        results.innerHTML = '<div class="message error">Chưa thể tải dữ liệu kho sách. Vui lòng thử lại.</div>';
      }
    };

    document.querySelector('#catalog-search').addEventListener('submit', event => {
      event.preventDefault();
      activeQuery = document.querySelector('#catalog-query').value.trim();
      usingCategory = false;
      load(true);
    });

    sortSelect.addEventListener('change', renderList);
    priceSelect.addEventListener('change', renderList);
    results.addEventListener('click', async event => {
      const favBtn = event.target.closest('.quick-favorite-btn');
      if (!favBtn) return;
      event.preventDefault();
      event.stopPropagation();
      const workId = favBtn.dataset.workId;
      const cardEl = favBtn.closest('.catalog-book-card');
      const bookTitle = cardEl?.querySelector('h3')?.textContent || 'Sách';
      const isActive = favBtn.classList.contains('is-active');
      favBtn.disabled = true;
      try {
        if (isActive) {
          const res = await fetch(`/api/items/favorite/${encodeURIComponent(workId)}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (res.status === 401) {
            location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
            return;
          }
          favBtn.classList.remove('is-active');
          if (typeof window.triggerFavoriteAnimation === 'function') {
            window.triggerFavoriteAnimation(favBtn, false);
          }
          if (window.toast) window.toast({ title: 'Đã xóa khỏi yêu thích', message: bookTitle, kind: 'info' });
        } else {
          const res = await fetch('/api/items/favorite', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workId })
          });
          if (res.status === 401) {
            location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
            return;
          }
          const payload = await res.json();
          if (!res.ok || !payload.success) throw new Error(payload.message || 'Không thể lưu yêu thích');
          favBtn.classList.add('is-active');
          if (typeof window.triggerFavoriteAnimation === 'function') {
            window.triggerFavoriteAnimation(favBtn, true);
          }
          if (window.toast) {
            window.toast({
              title: 'Đã thêm vào yêu thích ♥',
              message: bookTitle,
              kind: 'ok',
              action: { label: 'Xem danh sách', href: '/favorites' }
            });
          }
        }
        if (typeof window.updateFavoriteCount === 'function') window.updateFavoriteCount({ bump: true });
      } catch (err) {
        if (window.toast) window.toast({ title: 'Lỗi', message: err.message, kind: 'error' });
      } finally {
        favBtn.disabled = false;
      }
    });

    load(true);
  }

  async function showCategories() {
    root.innerHTML = `<section class="shell"><span class="eyebrow">Khám phá theo chủ đề</span><h1 class="page-title">Danh mục sách</h1><p>Chọn một danh mục để bắt đầu khám phá tri thức cùng Trạm Sách.</p><div id="category-grid" class="book-grid"><p class="loading">Đang tải danh mục…</p></div></section>`;
    const area = document.querySelector('#category-grid');
    try {
      const categories = await get('/api/categories');
      area.innerHTML = categories.length ? categories.map(c => {
        const target = `/books?category=${encodeURIComponent(c.slug)}`;
        return `<a class="panel form-card category-card" href="${target}" data-category-target="${target}" aria-label="Xem sách danh mục ${esc(c.name)}"><span class="eyebrow">Chủ đề</span><h3>${esc(c.name)}</h3><p>${esc(c.description || 'Khám phá sách tuyển chọn theo chủ đề này.')}</p><b>Khám phá sách &rarr;</b></a>`;
      }).join('') : '<div class="panel form-card">Chưa có danh mục.</div>';
      area.addEventListener('click', event => {
        const cardEl = event.target.closest('.category-card');
        if (!cardEl) return;
        event.preventDefault();
        window.location.assign(cardEl.dataset.categoryTarget);
      });
    } catch (_) {
      area.innerHTML = '<div class="message error">Chưa thể tải danh mục.</div>';
    }
  }

  if (page === 'books') showBooks();
  if (page === 'categories') showCategories();
})();
