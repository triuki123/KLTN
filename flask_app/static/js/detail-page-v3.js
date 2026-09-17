(() => {
  const root = document.querySelector('#app');
  const workId = document.body.dataset.workId;
  if (!root || document.body.dataset.page !== 'detail' || !workId) return;

  const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => `${Number(value || 99000).toLocaleString('vi-VN')}đ`;
  const icon = name => `<svg class="ui-icon" aria-hidden="true"><use href="/static/icons/ui-icons.svg#${name}"></use></svg>`;
  const stars = value => Array.from({length:5},(_,index)=>icon(index < Math.round(value) ? 'star' : 'star-outline')).join('');
  const date = value => new Date(value).toLocaleDateString('vi-VN');
  const lineIcon = name => {
    const paths = {
      copy:'<rect x="7" y="7" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      zoom:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6"/>',
      share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',
      tag:'<path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
      books:'<path d="M4 5h5v15H4zM10 4h5v16h-5zM16 6h4v14h-4z"/>',
      hash:'<path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"/>',
      building:'<path d="M4 21h16M6 21V8l6-4 6 4v13M9 11h1M14 11h1M9 15h1M14 15h1"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
      pages:'<path d="M6 3h10a2 2 0 0 1 2 2v14H8a2 2 0 0 0-2 2V3Z"/><path d="M6 17h9M9 7h6M9 11h6"/>'
    };
    return `<svg class="detail-line-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
  };

  const notify = message => {
    if (typeof window.toast === 'function') return window.toast({title:message,kind:'ok'});
    let toast = document.querySelector('#detail-toast');
    if (!toast) {
      document.body.insertAdjacentHTML('beforeend','<div id="detail-toast" class="detail-toast" role="status" aria-live="polite"></div>');
      toast = document.querySelector('#detail-toast');
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  };

  async function copyText(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (_) {
      const input = document.createElement('textarea');
      input.value = value; input.setAttribute('readonly',''); input.style.position = 'fixed'; input.style.opacity = '0';
      document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
    notify(successMessage);
  }

  function metadata(book) {
    const fields = [
      ['tag','Mã sách', book.workId, 'Tác phẩm'], ['books','Danh mục', book.category, 'Thể loại'], ['hash','ISBN', book.isbn, 'Mã xuất bản'],
      ['building','Nhà xuất bản', book.publisher, 'Đơn vị phát hành'], ['calendar','Năm xuất bản', book.publicationYear, 'Năm phát hành'], ['pages','Số trang', book.pageCount, 'Giấy ngà chống lóa']
    ];
    return fields.map(([symbol,label,value,note]) => `<div class="detail-meta-item"><i>${lineIcon(symbol)}</i><span><small>${label}</small><b class="${value ? '' : 'is-pending'}">${esc(value || 'Chưa cập nhật')}</b><em>${note}</em></span></div>`).join('');
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
    const description = book.description || 'Thông tin giới thiệu đang được cập nhật.';
    const quote = description.split(/(?<=[.!?])\s+/)[0].slice(0, 220);
    const coverUrl = book.cover || book.cover_url || '';
    const priceMarkup = hasCoupon
      ? `<del>${money(book.price)}</del><strong>${money(couponPrice)}</strong><span class="detail-coupon-code">MÃ ${esc(book.coupon.code)}</span>`
      : `<strong>${money(book.price)}</strong>${Number(book.originalPrice) > Number(book.price) ? `<del>${money(book.originalPrice)}</del><span>-${Math.round((1 - Number(book.price) / Number(book.originalPrice)) * 100)}%</span>` : ''}`;
    root.innerHTML = `
      <div class="detail-page">
        <nav class="detail-breadcrumb" aria-label="Đường dẫn"><a href="/">Trang chủ</a><span>/</span><a href="/books">Sách</a><span>/</span><b>${esc(book.title)}</b></nav>
        <section class="detail-product">
          <div class="detail-visual"><div class="detail-cover-stage" id="detail-cover-stage"><div class="detail-book-object">${cover(book, 'detail-cover')}<span class="detail-book-spine" aria-hidden="true"></span><span class="detail-paper-edge detail-paper-edge-right" aria-hidden="true"></span><span class="detail-paper-edge detail-paper-edge-bottom" aria-hidden="true"></span></div></div><span class="detail-cover-note">Ảnh bìa sản phẩm</span>${coverUrl ? `<button class="detail-zoom" id="detail-zoom" type="button" aria-label="Phóng to ảnh bìa">${lineIcon('zoom')}<span class="detail-zoom-label">Phóng to ảnh bìa</span></button>` : ''}</div>
          <article class="detail-info">
            <span class="eyebrow">Tác phẩm · Trạm Sách</span>
            <h1>${esc(book.title)}</h1>
            <p class="author">${esc(authors)}</p>
            <button class="detail-quick-rating" id="detail-quick-rating" type="button" aria-label="Xem đánh giá và nhận xét"><span class="detail-quick-stars">${stars(0)}</span><strong id="detail-quick-score">0.0/5</strong><span id="detail-quick-count">0 nhận xét</span><i></i><span>${Number(book.sold || 0)} cuốn đã bán</span></button>
            <div class="detail-status"><span class="stock${available ? '' : ' out'}">${available ? `Còn ${book.stock} cuốn` : 'Hết hàng'}</span><span>Đã bán ${Number(book.sold || 0)}</span></div>
            <div class="detail-meta">${metadata(book)}</div>
            <div class="detail-price-line">${priceMarkup}</div>
            ${hasCoupon ? `<div class="detail-coupon-ticket" aria-label="Mã giảm giá ${esc(book.coupon.code)}"><div class="detail-coupon-ticket-mark"><span>Ưu đãi</span><b>${Math.max(0,Math.round((1-couponPrice/Number(book.price))*100))}%</b></div><div class="detail-coupon-ticket-copy"><small>Mã dành cho sản phẩm</small><strong>${esc(book.coupon.code)}</strong><span>${Number(book.coupon.minimumOrder) > Number(book.price) ? `Đơn tối thiểu ${money(book.coupon.minimumOrder)}` : `Tiết kiệm ${money(Number(book.price)-couponPrice)}`}</span></div><button id="copy-coupon" type="button" data-code="${esc(book.coupon.code)}">${lineIcon('copy')}<span>Sao chép mã</span></button></div>` : ''}
            <div class="detail-purchase-row"><div class="detail-quantity" aria-label="Chọn số lượng"><button id="quantity-minus" type="button">−</button><strong id="quantity-value">1</strong><button id="quantity-plus" type="button">+</button></div><button id="add-cart" class="pill light" ${available ? '' : 'aria-disabled="true"'}>Thêm vào giỏ hàng</button><button id="buy-now" class="btn-brand" ${available ? '' : 'aria-disabled="true"'}>Mua ngay</button><button id="add-favorite" class="pill light detail-favorite" aria-label="Lưu yêu thích">${icon('heart')}</button></div>
            <button class="detail-share" id="detail-share" type="button">${lineIcon('share')}<span>Chia sẻ cuốn sách</span></button>
            <div id="detail-message" aria-live="polite"></div>
            <div class="detail-services"><div><i class="icon-check">${icon('check')}</i><b>Giao hàng toàn quốc</b><span>Dự kiến từ 2–5 ngày</span></div><div><i class="icon-check">${icon('check')}</i><b>Miễn phí từ 299.000đ</b><span>Áp dụng theo giá trị đơn</span></div><div><i class="icon-check">${icon('check')}</i><b>Đổi trả trong 7 ngày</b><span>Khi sách có lỗi</span></div><div><i class="icon-check">${icon('check')}</i><b>Thanh toán linh hoạt</b><span>Hỗ trợ COD</span></div></div>
          </article>
        </section>
        <section class="detail-description-panel"><span class="eyebrow">Thông tin tác phẩm</span><h2>Giới thiệu sách</h2><blockquote class="detail-quote"><span>Trích dẫn nổi bật</span><p>“${esc(quote)}”</p></blockquote><div class="detail-description-copy${description.length > 420 ? ' is-collapsed' : ''}" id="detail-description-copy"><p>${esc(description)}</p></div>${description.length > 420 ? '<button class="detail-read-more" id="detail-read-more" type="button" aria-expanded="false">Xem thêm</button>' : ''}</section>
        <section id="review-section" class="detail-reviews"><div class="detail-section-heading"><div><span class="eyebrow">Ý kiến bạn đọc</span><h2>Đánh giá & nhận xét</h2></div><div class="review-proof"><div id="review-summary" class="review-summary">Đang tải…</div><div id="rating-breakdown" class="rating-breakdown" aria-label="Phân bổ đánh giá"></div></div></div><div class="review-layout"><form id="review-form" class="review-form"><h3>Chia sẻ cảm nhận</h3><label>Đánh giá<select name="rating" required><option value="5">5 sao — Rất tốt</option><option value="4">4 sao — Tốt</option><option value="3">3 sao — Bình thường</option><option value="2">2 sao — Chưa tốt</option><option value="1">1 sao — Không hài lòng</option></select></label><label>Nhận xét<textarea name="content" rows="5" minlength="5" maxlength="2000" placeholder="Điều gì khiến bạn thích hoặc chưa hài lòng về cuốn sách này?" required></textarea></label><div id="review-message"></div><button class="btn-brand">Gửi nhận xét</button><small>Vui lòng đăng nhập để gửi hoặc cập nhật nhận xét.</small></form><div id="review-list" class="review-list"><p>Đang tải nhận xét…</p></div></div></section>
        <section class="detail-related"><div class="detail-section-heading"><div><span class="eyebrow">Khám phá thêm</span><h2>Có thể bạn cũng thích</h2></div><a href="/books">Xem tất cả →</a></div><div id="related-books" class="detail-related-grid"><p>Đang tải sách liên quan…</p></div></section>
        <section class="detail-recently" id="detail-recently" hidden><div class="detail-section-heading"><div><span class="eyebrow">Dấu trang của bạn</span><h2>Sách vừa xem gần đây</h2></div></div><div class="detail-recently-grid" id="detail-recently-grid"></div></section>
        ${coverUrl ? `<div class="detail-lightbox" id="detail-lightbox" role="dialog" aria-modal="true" aria-label="Ảnh bìa ${esc(book.title)}" hidden><button type="button" id="detail-lightbox-close" aria-label="Đóng ảnh phóng to">${lineIcon('close')}</button><img src="${esc(coverUrl)}" alt="Bìa sách ${esc(book.title)}"></div>` : ''}
        <div id="mobile-sticky-buy-bar" class="mobile-sticky-buy-bar">
          <div class="mobile-sticky-thumb">${cover(book, 'mobile-sticky-cover')}</div>
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

    document.querySelector('#copy-coupon')?.addEventListener('click', event => {
      copyText(event.currentTarget.dataset.code, 'Đã sao chép mã giảm giá!');
    });
    document.querySelector('#detail-share')?.addEventListener('click', () => {
      copyText(location.href, 'Đã sao chép liên kết vào clipboard');
    });
    document.querySelector('#detail-quick-rating')?.addEventListener('click', () => {
      document.querySelector('#review-section')?.scrollIntoView({behavior:'smooth',block:'start'});
    });

    const readMore = document.querySelector('#detail-read-more');
    const descriptionCopy = document.querySelector('#detail-description-copy');
    readMore?.addEventListener('click', () => {
      const expanded = readMore.getAttribute('aria-expanded') === 'true';
      readMore.setAttribute('aria-expanded', String(!expanded));
      readMore.textContent = expanded ? 'Xem thêm' : 'Thu gọn';
      descriptionCopy.classList.toggle('is-collapsed', expanded);
    });

    const coverStage = document.querySelector('#detail-cover-stage');
    if (coverStage && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      coverStage.addEventListener('pointermove', event => {
        const box = coverStage.getBoundingClientRect();
        const rotateY = ((event.clientX - box.left) / box.width - .5) * 7;
        const rotateX = (.5 - (event.clientY - box.top) / box.height) * 6;
        coverStage.style.setProperty('--cover-rx', `${rotateX.toFixed(2)}deg`);
        coverStage.style.setProperty('--cover-ry', `${rotateY.toFixed(2)}deg`);
        coverStage.classList.add('is-tilting');
      });
      coverStage.addEventListener('pointerleave', () => {
        coverStage.classList.remove('is-tilting');
        coverStage.style.removeProperty('--cover-rx'); coverStage.style.removeProperty('--cover-ry');
      });
    }

    const lightbox = document.querySelector('#detail-lightbox');
    const closeLightbox = () => { if (!lightbox) return; lightbox.hidden = true; document.body.classList.remove('detail-lightbox-open'); };
    document.querySelector('#detail-zoom')?.addEventListener('click', () => {
      document.body.appendChild(lightbox);
      lightbox.hidden = false;
      document.body.classList.add('detail-lightbox-open');
      document.querySelector('#detail-lightbox-close')?.focus();
    });
    document.querySelector('#detail-lightbox-close')?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox(); });

    try {
      const storageKey = 'tramSachRecentlyViewed';
      const previous = JSON.parse(localStorage.getItem(storageKey) || '[]').filter(item => item.workId !== book.workId);
      const recentSection = document.querySelector('#detail-recently');
      const recentGrid = document.querySelector('#detail-recently-grid');
      if (previous.length && recentSection && recentGrid) {
        recentGrid.innerHTML = previous.slice(0,5).map(item => `<a class="detail-recent-card" href="/books/${encodeURIComponent(item.workId)}">${item.cover ? `<img src="${esc(item.cover)}" alt="Bìa sách ${esc(item.title)}">` : `<span class="detail-recent-fallback">${esc((item.title || 'S')[0])}</span>`}<span><b>${esc(item.title)}</b><small>${esc(item.authors || 'Chưa rõ tác giả')}</small>${item.price ? `<strong>${money(item.price)}</strong>` : ''}</span></a>`).join('');
        recentSection.hidden = false;
      }
      localStorage.setItem(storageKey, JSON.stringify([{workId:book.workId,title:book.title,authors,cover:coverUrl,price:hasCoupon ? couponPrice : book.price},...previous].slice(0,5)));
    } catch (_) {}

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
      const quickScore = document.querySelector('#detail-quick-score');
      const quickCount = document.querySelector('#detail-quick-count');
      const quickStars = document.querySelector('.detail-quick-stars');
      if (quickScore) quickScore.textContent = `${Number(data.average || 0).toFixed(1)}/5`;
      if (quickCount) quickCount.textContent = `${Number(data.count || 0)} nhận xét`;
      if (quickStars) quickStars.innerHTML = stars(data.average || 0);
      const reviewItems = Array.isArray(data.items) ? data.items : [];
      const ratingCounts = [5,4,3,2,1].map(rating => ({rating,count:reviewItems.filter(item => Number(item.rating) === rating).length}));
      const breakdownTotal = Math.max(Number(data.count || 0), reviewItems.length, 1);
      document.querySelector('#rating-breakdown').innerHTML = ratingCounts.map(row => `<div><span>${row.rating} sao</span><i><b style="width:${Math.round(row.count / breakdownTotal * 100)}%"></b></i><small>${row.count}</small></div>`).join('');
      const form = document.querySelector('#review-form');
      if (!data.canReview) {
        form.querySelectorAll('select,textarea,button').forEach(control => control.disabled = true);
        form.querySelector('small').textContent = data.signedIn ? 'Bạn có thể đánh giá sau khi đơn hàng chứa sách này đã hoàn tất.' : 'Vui lòng đăng nhập và mua sách để gửi nhận xét.';
      }
      document.querySelector('#review-list').innerHTML = reviewItems.length ? reviewItems.map(item => `<article class="review-item"><header><div class="review-avatar">${esc((item.customer || 'K')[0].toUpperCase())}</div><div><b>${esc(item.customer)} ${item.verified_purchase ? `<em class="verified-purchase">${icon('check')} Đã mua tại Trạm Sách</em>` : ''}</b><span class="review-stars">${stars(item.rating)}</span></div><time>${date(item.updated_at || item.created_at)}</time></header><p>${esc(item.content)}</p></article>`).join('') : '<div class="review-empty"><b>Chưa có nhận xét nào</b><p>Khách hàng đã hoàn tất đơn mua sách có thể chia sẻ cảm nhận tại đây.</p></div>';
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
