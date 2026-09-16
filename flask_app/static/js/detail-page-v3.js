(() => {
  const root = document.querySelector('#app');
  const workId = document.body.dataset.workId;
  if (!root || document.body.dataset.page !== 'detail' || !workId) return;

  const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => `${Number(value || 99000).toLocaleString('vi-VN')}đ`;
  const icon = name => `<svg class="ui-icon" aria-hidden="true"><use href="/static/icons/ui-icons.svg#${name}"></use></svg>`;
  const stars = value => Array.from({length:5},(_,index)=>icon(index < Math.round(value) ? 'star' : 'star-outline')).join('');
  const date = value => new Date(value).toLocaleDateString('vi-VN');

  function metadata(book) {
    const fields = [
      ['Mã sách', book.workId], ['Danh mục', book.category], ['ISBN', book.isbn],
      ['Nhà xuất bản', book.publisher], ['Năm xuất bản', book.publicationYear], ['Số trang', book.pageCount]
    ];
    return fields.map(([label, value]) => `<div><small>${label}</small><b class="${value ? '' : 'is-pending'}">${esc(value || 'Chưa cập nhật')}</b></div>`).join('');
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers || {})},...options});
    let body = {};
    try { body = await response.json(); } catch (_) {}
    if (!response.ok) { const error = new Error(body.message || 'Không thể kết nối máy chủ.'); error.status = response.status; throw error; }
    return body.data ?? body;
  }

  function cover(book, className = '') {
    return book.cover || book.cover_url
      ? `<img class="${className}" src="${esc(book.cover || book.cover_url)}" alt="Bìa sách ${esc(book.title)}">`
      : `<div class="cover-placeholder ${className}">${esc((book.title || '?')[0])}</div>`;
  }

  function renderBook(book) {
    const authors = (book.authors || []).join(', ') || 'Chưa rõ tác giả';
    const available = Number(book.stock) > 0;
    const couponPrice = Number(book.couponPrice);
    const hasCoupon = book.coupon && Number.isFinite(couponPrice) && couponPrice < Number(book.price);
    const priceMarkup = hasCoupon
      ? `<del>${money(book.price)}</del><strong>${money(couponPrice)}</strong><span class="detail-coupon-code">MÃ ${esc(book.coupon.code)}</span>`
      : `<strong>${money(book.price)}</strong>${Number(book.originalPrice) > Number(book.price) ? `<del>${money(book.originalPrice)}</del><span>-${Math.round((1 - Number(book.price) / Number(book.originalPrice)) * 100)}%</span>` : ''}`;
    root.innerHTML = `
      <div class="detail-page">
        <nav class="detail-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><a href="/books">Sách</a><span>/</span><b>${esc(book.title)}</b></nav>
        <section class="detail-product">
          <div class="detail-visual">${cover(book, 'detail-cover')}<span class="detail-cover-note">Ảnh bìa sản phẩm</span></div>
          <article class="detail-info">
            <span class="eyebrow">Tác phẩm · Trạm Sách</span>
            <h1>${esc(book.title)}</h1>
            <p class="author">${esc(authors)}</p>
            <div class="detail-status"><span class="stock${available ? '' : ' out'}">${available ? `Còn ${book.stock} cuốn` : 'Hết hàng'}</span><span>Đã bán ${Number(book.sold || 0)}</span></div>
            <div class="detail-meta">${metadata(book)}</div>
            <div class="detail-price-line">${priceMarkup}</div>
            ${hasCoupon ? `<p class="detail-coupon-hint">Giá ưu đãi khi nhập mã <b>${esc(book.coupon.code)}</b>${Number(book.coupon.minimumOrder) > Number(book.price) ? ` · Đơn tối thiểu ${money(book.coupon.minimumOrder)}` : ''}</p>` : ''}
            <div class="detail-purchase-row"><div class="detail-quantity" aria-label="Chọn số lượng"><button id="quantity-minus" type="button">−</button><strong id="quantity-value">1</strong><button id="quantity-plus" type="button">+</button></div><button id="add-cart" class="pill light" ${available ? '' : 'aria-disabled="true"'}>Thêm vào giỏ hàng</button><button id="buy-now" class="btn-brand" ${available ? '' : 'aria-disabled="true"'}>Mua ngay</button><button id="add-favorite" class="pill light detail-favorite" aria-label="Lưu yêu thích">${icon('heart')}</button></div>
            <div id="detail-message" aria-live="polite"></div>
            <div class="detail-services"><div><i class="icon-check">${icon('check')}</i><b>Giao hàng toàn quốc</b><span>Dự kiến từ 2–5 ngày</span></div><div><i class="icon-check">${icon('check')}</i><b>Miễn phí từ 299.000đ</b><span>Áp dụng theo giá trị đơn</span></div><div><i class="icon-check">${icon('check')}</i><b>Đổi trả trong 7 ngày</b><span>Khi sách có lỗi</span></div><div><i class="icon-check">${icon('check')}</i><b>Thanh toán linh hoạt</b><span>Hỗ trợ COD</span></div></div>
          </article>
        </section>
        <section class="detail-description-panel"><span class="eyebrow">Thông tin tác phẩm</span><h2>Giới thiệu sách</h2><p>${esc(book.description || 'Thông tin giới thiệu đang được cập nhật.')}</p></section>
        <section id="review-section" class="detail-reviews"><div class="detail-section-heading"><div><span class="eyebrow">Ý kiến bạn đọc</span><h2>Đánh giá & nhận xét</h2></div><div id="review-summary" class="review-summary">Đang tải…</div></div><div class="review-layout"><form id="review-form" class="review-form"><h3>Chia sẻ cảm nhận</h3><label>Đánh giá<select name="rating" required><option value="5">5 sao — Rất tốt</option><option value="4">4 sao — Tốt</option><option value="3">3 sao — Bình thường</option><option value="2">2 sao — Chưa tốt</option><option value="1">1 sao — Không hài lòng</option></select></label><label>Nhận xét<textarea name="content" rows="5" minlength="5" maxlength="2000" placeholder="Điều gì khiến bạn thích hoặc chưa hài lòng về cuốn sách này?" required></textarea></label><div id="review-message"></div><button class="btn-brand">Gửi nhận xét</button><small>Vui lòng đăng nhập để gửi hoặc cập nhật nhận xét.</small></form><div id="review-list" class="review-list"><p>Đang tải nhận xét…</p></div></div></section>
        <section class="detail-related"><div class="detail-section-heading"><div><span class="eyebrow">Khám phá thêm</span><h2>Có thể bạn cũng thích</h2></div><a href="/books">Xem tất cả →</a></div><div id="related-books" class="detail-related-grid"><p>Đang tải sách liên quan…</p></div></section>
        <div id="mobile-sticky-buy-bar" class="mobile-sticky-buy-bar">
          <div class="mobile-sticky-buy-info">
            <b>${esc(book.title)}</b>
            <strong>${money(hasCoupon ? couponPrice : book.price)}</strong>
          </div>
          <button id="mobile-buy-now" ${available ? '' : 'disabled'}>Mua ngay</button>
        </div>
      </div>`;

    let quantity = 1;
    const quantityValue = document.querySelector('#quantity-value');
    const showOutOfStock = () => { document.querySelector('#detail-message').innerHTML = '<p class="message error" role="alert">Sản phẩm đã hết hàng. Vui lòng chọn sách khác hoặc quay lại sau.</p>'; };
    const updateQuantity = delta => { if (!available) return showOutOfStock(); quantity = Math.max(1, Math.min(Number(book.stock || 1), quantity + delta)); quantityValue.textContent = quantity; };
    document.querySelector('#quantity-minus').onclick = () => updateQuantity(-1);
    document.querySelector('#quantity-plus').onclick = () => updateQuantity(1);

    const buyBtn = document.querySelector('#buy-now');
    const stickyBar = document.querySelector('#mobile-sticky-buy-bar');
    const mobileBuyBtn = document.querySelector('#mobile-buy-now');

    if (buyBtn && stickyBar && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting && window.innerWidth <= 760) {
          stickyBar.classList.add('visible');
        } else {
          stickyBar.classList.remove('visible');
        }
      }, { threshold: 0 });
      observer.observe(buyBtn);
    }

    async function save(kind, next = '') {
      if (!available) return showOutOfStock();
      try {
        if (kind === 'cart' && !next && typeof window.flyToCart === 'function') {
          const coverEl = document.querySelector('.detail-cover') || document.querySelector('.detail-visual img, .detail-visual .cover-placeholder');
          if (coverEl) window.flyToCart(coverEl);
        }
        await api(`/api/items/${kind}`, {method:'POST',body:JSON.stringify({workId:book.workId,quantity:kind === 'cart' ? quantity : 1,selected:Boolean(next)})});
        if (next) return location.assign(next);
        if (kind === 'cart' && window.toast) {
          window.toast({title:'Đã thêm vào giỏ hàng',message:`${quantity} cuốn · ${esc(book.title)}`,kind:'ok',action:{label:'Xem giỏ',href:'/cart'}});
        } else {
          document.querySelector('#detail-message').innerHTML = `<p class="message">${kind === 'cart' ? `Đã thêm ${quantity} cuốn vào giỏ hàng.` : 'Đã lưu vào danh sách yêu thích.'}</p>`;
        }
      } catch (error) {
        if (error.status === 401) return location.assign(`/login?next=${encodeURIComponent(next || location.pathname)}`);
        if (window.toast) window.toast({title:'Không thể cập nhật',message:esc(error.message),kind:'error'});
        document.querySelector('#detail-message').innerHTML = `<p class="message error">${esc(error.message)}</p>`;
      }
    }
    document.querySelector('#add-cart').onclick = () => save('cart');
    document.querySelector('#buy-now').onclick = () => save('cart', '/checkout');
    if (mobileBuyBtn) mobileBuyBtn.onclick = () => save('cart', '/checkout');
    document.querySelector('#add-favorite').onclick = () => save('favorite');

    document.querySelector('#review-form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        await api(`/api/books/${encodeURIComponent(workId)}/reviews`, {method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
        document.querySelector('#review-message').innerHTML = '<p class="message">Đã lưu nhận xét của bạn.</p>';
        form.reset();
        loadReviews();
      } catch (error) {
        if (error.status === 401) return location.assign(`/login?next=${encodeURIComponent(location.pathname + '#review-section')}`);
        document.querySelector('#review-message').innerHTML = `<p class="message error">${esc(error.message)}</p>`;
      }
    };
  }

  async function loadReviews() {
    try {
      const data = await api(`/api/books/${encodeURIComponent(workId)}/reviews`);
      document.querySelector('#review-summary').innerHTML = `<strong>${data.average || '0.0'}</strong><span>${stars(data.average || 0)} · ${data.count} nhận xét</span>`;
      const form = document.querySelector('#review-form');
      if (!data.canReview) {
        form.querySelectorAll('select,textarea,button').forEach(control => control.disabled = true);
        form.querySelector('small').textContent = data.signedIn ? 'Bạn có thể đánh giá sau khi đơn hàng chứa sách này đã hoàn tất.' : 'Vui lòng đăng nhập và mua sách để gửi nhận xét.';
      }
      document.querySelector('#review-list').innerHTML = data.items.length ? data.items.map(item => `<article class="review-item"><header><div class="review-avatar">${esc((item.customer || 'K')[0].toUpperCase())}</div><div><b>${esc(item.customer)} ${item.verified_purchase ? `<em class="verified-purchase">${icon('check')} Đã mua hàng</em>` : ''}</b><span class="review-stars">${stars(item.rating)}</span></div><time>${date(item.updated_at || item.created_at)}</time></header><p>${esc(item.content)}</p></article>`).join('') : '<div class="review-empty"><b>Chưa có nhận xét nào</b><p>Khách hàng đã hoàn tất đơn mua sách có thể chia sẻ cảm nhận tại đây.</p></div>';
    } catch (error) { document.querySelector('#review-list').innerHTML = `<p class="message error">${esc(error.message)}</p>`; }
  }

  async function loadRelated() {
    try {
      const books = await api('/api/home?limit=12');
      const related = books.filter(book => book.work_id !== workId).slice(0,4);
      document.querySelector('#related-books').innerHTML = related.map(book => `<a class="related-card" href="/books/${encodeURIComponent(book.work_id)}"><div class="book-card-cover-wrap">${cover(book)}<span class="book-card-shine"></span></div><div><b>${esc(book.title)}</b><span>${esc(book.authors || 'Chưa rõ tác giả')}</span><strong>${money(book.promotional_price || book.selling_price)}</strong></div></a>`).join('') || '<p>Chưa có sách liên quan.</p>';
    } catch (_) { document.querySelector('#related-books').innerHTML = '<p>Chưa thể tải sách liên quan lúc này.</p>'; }
  }

  root.innerHTML = `<div class="skeleton-detail"><div class="skeleton skeleton-cover"></div><div class="skeleton-detail-body"><div class="skeleton-line title"></div><div class="skeleton-line meta"></div><div class="skeleton-line block"></div><div class="skeleton-line block"></div><div class="skeleton-line short"></div></div></div>`;

  api(`/api/books/${encodeURIComponent(workId)}`).then(book => { renderBook(book); loadReviews(); loadRelated(); }).catch(error => {
    if (typeof window.renderEmpty === 'function') {
      root.innerHTML = `<section class="shell">${window.renderEmpty('search', 'Không tìm thấy sách', esc(error.message) || 'Có lỗi xảy ra khi tải thông tin sách.', [{label:'Về trang chủ',href:'/',style:'primary'},{label:'Xem kho sách',href:'/books'}])}</section>`;
    } else {
      root.innerHTML = `<section class="shell"><p class="message error">${esc(error.message)}</p></section>`;
    }
  });
})();
