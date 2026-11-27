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
      ,sample:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/>'
      ,shield:'<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-5"/>'
      ,package:'<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>'
      ,return:'<path d="M9 7H5V3M5 7a8 8 0 1 1-1 8"/>'
      ,truck:'<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>'
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
      ['building','Nhà xuất bản', book.publisher, 'Đơn vị phát hành'], ['calendar','Năm xuất bản', book.publicationYear, 'Năm phát hành'], ['pages','Số trang', book.pageCount, 'Thông tin ấn bản']
    ].filter(([, label, value]) => label === 'Mã sách' || (value !== null && value !== undefined && String(value).trim()));

    // Estimated reading time calculation (approx 1 - 1.5 min per page)
    const pageNum = Number(book.pageCount || 0);
    const readingHours = pageNum > 0 ? (pageNum * 1.2 / 60).toFixed(1) : null;
    const readingTimeItem = readingHours
      ? `<div class="detail-meta-item"><i>${lineIcon('calendar')}</i><span><small>Thời gian đọc</small><b>~${readingHours} giờ</b><em>Khoảng 250 từ/phút</em></span></div>`
      : '';

    const items = fields.map(([symbol,label,value,note]) => `<div class="detail-meta-item"><i>${lineIcon(symbol)}</i><span><small>${label}</small><b>${esc(value)}</b><em>${note}</em></span></div>`).join('');
    return items + readingTimeItem + (fields.length === 1 ? `<div class="detail-meta-pending">${lineIcon('books')}<span><b>Thông tin xuất bản đang cập nhật</b><small>Danh mục, ISBN và thông tin ấn bản sẽ sớm được bổ sung.</small></span></div>` : '');
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers || {})},...options});
    let body = {};
    try { body = await response.json(); } catch (_) {}
    if (!response.ok) { const error = new Error(body.message || 'Không thể kết nối máy chủ.'); error.status = response.status; throw error; }
    return body.data ?? body;
  }

  function cover(book, className = '') {
    const src = book.cover || book.cover_url;
    const title = esc(book.title || 'Sách Tuyển Chọn');
    const authors = esc(Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Trạm Sách'));
    const str = book.title || 'tram-sach';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
    const themeIdx = Math.abs(hash) % 4;
    const themeClasses = ['vintage-theme-forest', 'vintage-theme-indigo', 'vintage-theme-burgundy', 'vintage-theme-ochre'];
    const themeClass = themeClasses[themeIdx];

    const fallbackCover = `
      <div class="vintage-book-cover ${themeClass} ${className}">
        <div class="vintage-book-frame">
          <span class="vintage-ornament-top">✦ ❦ ✦</span>
          <b class="vintage-title">${title}</b>
          <span class="vintage-author">${authors}</span>
          <div class="vintage-seal">
            <span class="vintage-seal-icon">✦</span>
            <small>TRẠM SÁCH</small>
          </div>
        </div>
      </div>
    `;

    if (src) {
      return `
        <div class="book-cover-wrapper ${className}">
          <img class="book-cover-img" src="${esc(src)}" alt="Bìa sách ${title}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">
          <div class="vintage-book-cover ${themeClass} fallback-hidden" style="display:none;">
            <div class="vintage-book-frame">
              <span class="vintage-ornament-top">✦ ❦ ✦</span>
              <b class="vintage-title">${title}</b>
              <span class="vintage-author">${authors}</span>
              <div class="vintage-seal">
                <span class="vintage-seal-icon">✦</span>
                <small>TRẠM SÁCH</small>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    return fallbackCover;
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
          <div class="detail-visual reveal detail-reveal-left">
            <div class="detail-cover-stage" id="detail-cover-stage">
              <div class="detail-book-shadow" aria-hidden="true"></div>
              <div class="detail-book-object">
                <span class="detail-badge-authentic">⭐ Bản chính hãng</span>
                ${cover(book, 'detail-cover')}
                <span class="detail-book-spine" aria-hidden="true"></span>
                <span class="detail-paper-edge detail-paper-edge-right" aria-hidden="true"></span>
                <span class="detail-paper-edge detail-paper-edge-bottom" aria-hidden="true"></span>
              </div>
            </div>
            ${coverUrl ? `<div class="detail-cover-actions"><button class="detail-zoom-pill" id="detail-zoom" type="button" aria-label="Xem ảnh bìa phóng to">${lineIcon('zoom')}<span>Xem ảnh bìa phóng to</span></button></div>` : ''}
          </div>
          <article class="detail-info reveal detail-reveal-right">
            <span class="eyebrow">Tác phẩm · Trạm Sách</span>
            <h1>${esc(book.title)}</h1>
            <p class="author">${esc(authors)}</p>
            <button class="detail-quick-rating" id="detail-quick-rating" type="button" aria-label="Xem đánh giá và nhận xét">
              <span class="detail-quick-stars">${stars(0)}</span>
              <strong id="detail-quick-score">0.0/5</strong>
              <span id="detail-quick-count">0 nhận xét</span>
              <i></i>
              <span>${Number(book.sold || 0)} cuốn đã bán</span>
            </button>
            <div class="detail-social-proof">
              <span class="pulse-dot"></span>
              <span><strong>18 độc giả</strong> đang xem cuốn sách này</span>
              <span class="detail-divider">•</span>
              <span class="detail-free-bookmark">🎁 Tặng kèm Bookmark & Thẻ cảm ơn Trạm Sách</span>
            </div>
            <div class="detail-status"><span class="stock${available ? '' : ' out'}">${available ? `Còn ${book.stock} cuốn` : 'Hết hàng'}</span><span>Đã bán ${Number(book.sold || 0)}</span></div>
            <div class="detail-highlights-box">
              <div class="highlight-item"><span class="highlight-icon">📖</span><span>Giấy vàng ngà chống lóa mắt Bãi Bằng 80gsm tiêu chuẩn xuất bản cao cấp</span></div>
              <div class="highlight-item"><span class="highlight-icon">✨</span><span>Bìa cán mờ dập nổi, bọc màng co bảo vệ nguyên vẹn từng góc cạnh</span></div>
              <div class="highlight-item"><span class="highlight-icon">📦</span><span>Đóng gói hộp carton sóng 3 lớp & bọc túi khí chống sốc 100% khi vận chuyển</span></div>
            </div>
            <div class="detail-meta">${metadata(book)}</div>
            <div class="detail-purchase-card">
              <div class="detail-purchase-heading">
                <div>
                  <small>Giá tại Trạm Sách</small>
                  <div class="detail-price-line">${priceMarkup}</div>
                  ${available && Number(book.stock) <= 15 ? `<div class="detail-stock-alert">⚡ Chỉ còn ${book.stock} cuốn trong kho - Đặt sớm kẻo lỡ!</div>` : ''}
                </div>
                <span class="detail-purchase-availability${available ? '' : ' out'}">${available ? 'Sẵn sàng giao' : 'Tạm hết hàng'}</span>
              </div>
              ${hasCoupon ? `<div class="detail-coupon-ticket" aria-label="Mã giảm giá ${esc(book.coupon.code)}"><div class="detail-coupon-ticket-mark"><span>Ưu đãi</span><b>${Math.max(0,Math.round((1-couponPrice/Number(book.price))*100))}%</b></div><div class="detail-coupon-ticket-copy"><small>Mã dành cho sản phẩm</small><strong>${esc(book.coupon.code)}</strong><span>${Number(book.coupon.minimumOrder) > Number(book.price) ? `Đơn tối thiểu ${money(book.coupon.minimumOrder)}` : `Tiết kiệm ${money(Number(book.price)-couponPrice)}`}</span></div><button id="copy-coupon" type="button" data-code="${esc(book.coupon.code)}">${lineIcon('copy')}<span>Sao chép mã</span></button></div>` : ''}
              ${Number(book.stock_quantity || 0) <= 5 && Number(book.stock_quantity || 0) > 0 ? `<div class="detail-scarcity-alert" style="display:inline-flex;align-items:center;gap:6px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:12px;"><span style="font-size:14px;">🔥</span> Chỉ còn <b>${Number(book.stock_quantity)} cuốn</b> trong kho — Nhanh tay kẻo hết!</div>` : ''}
              <div class="detail-purchase-row"><div class="detail-quantity" aria-label="Chọn số lượng"><button id="quantity-minus" type="button" aria-label="Giảm số lượng">−</button><strong id="quantity-value">1</strong><button id="quantity-plus" type="button" aria-label="Tăng số lượng">+</button></div><button id="add-cart" class="pill light" ${available ? '' : 'aria-disabled="true"'}>Thêm vào giỏ hàng</button><button id="buy-now" class="btn-brand" ${available ? '' : 'aria-disabled="true"'}>Mua ngay</button><button id="read-sample-btn" type="button" class="pill light detail-sample-btn" title="Đọc thử vài trang sách">📖 Đọc thử</button><button id="add-favorite" class="pill light detail-favorite" type="button" aria-label="Lưu yêu thích" title="Lưu yêu thích"><svg class="detail-heart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button></div>
              <div class="detail-freeship-banner"><span>🚚</span><span><strong>Miễn phí vận chuyển</strong> toàn quốc cho đơn hàng từ 299.000đ</span></div>
              <div id="detail-message" aria-live="polite"></div>
            </div>
            <div class="detail-secondary-actions"><button class="detail-share" id="detail-share" type="button">${lineIcon('share')}<span>Chia sẻ cuốn sách</span></button><button class="detail-lookinside" id="detail-lookinside" type="button">${lineIcon('sample')}<span>Đọc thử vài trang</span></button></div>
            <div class="detail-trust-badges">
              <div class="trust-badge"><span class="trust-icon">${lineIcon('shield')}</span><div><b>Sách thật chính hãng</b><small>100% đảm bảo nguồn gốc</small></div></div>
              <div class="trust-badge"><span class="trust-icon">${lineIcon('package')}</span><div><b>Đóng gói cẩn thận</b><small>3 lớp chống móp góc sách</small></div></div>
              <div class="trust-badge"><span class="trust-icon">${lineIcon('return')}</span><div><b>Đổi trả miễn phí</b><small>Trong 7 ngày nếu có lỗi</small></div></div>
              <div class="trust-badge"><span class="trust-icon">${lineIcon('truck')}</span><div><b>Giao hàng toàn quốc</b><small>Miễn phí từ 299.000đ</small></div></div>
            </div>
          </article>
        </section>
        <nav class="detail-quick-nav" id="detail-quick-nav" aria-label="Điều hướng nhanh">
          <a href="#detail-desc" class="active">Giới thiệu sách</a>
          <a href="#detail-combo">Combo ưu đãi</a>
          <a href="#review-section">Đánh giá & Nhận xét</a>
          <a href="#detail-related">Gợi ý tương tự</a>
        </nav>
        <section id="detail-desc" class="detail-description-panel"><span class="eyebrow">Thông tin tác phẩm</span><h2>Giới thiệu sách</h2><blockquote class="detail-quote"><span>Trích dẫn nổi bật</span><p>“${esc(quote)}”</p></blockquote><div class="detail-description-copy${description.length > 420 ? ' is-collapsed' : ''}" id="detail-description-copy"><p>${esc(description)}</p></div>${description.length > 420 ? '<button class="detail-read-more" id="detail-read-more" type="button" aria-expanded="false">Xem thêm</button>' : ''}</section>
        <section id="detail-combo" class="detail-combo-section" hidden></section>
        <section id="review-section" class="detail-reviews"><div class="detail-section-heading"><div><span class="eyebrow">Ý kiến bạn đọc</span><h2>Đánh giá & nhận xét</h2></div><div class="review-proof"><div id="review-summary" class="review-summary">Đang tải…</div><div id="rating-breakdown" class="rating-breakdown" aria-label="Phân bổ đánh giá"></div></div></div><div class="review-layout"><form id="review-form" class="review-form"><h3>Chia sẻ cảm nhận</h3><label>Đánh giá<select name="rating" required><option value="5">5 sao — Rất tốt</option><option value="4">4 sao — Tốt</option><option value="3">3 sao — Bình thường</option><option value="2">2 sao — Chưa tốt</option><option value="1">1 sao — Không hài lòng</option></select></label><label>Nhận xét<textarea name="content" rows="5" minlength="5" maxlength="2000" placeholder="Điều gì khiến bạn thích hoặc chưa hài lòng về cuốn sách này?" required></textarea></label><div id="review-message"></div><button class="btn-brand">Gửi nhận xét</button><small>Vui lòng đăng nhập để gửi hoặc cập nhật nhận xét.</small></form><div id="review-list" class="review-list"><p>Đang tải nhận xét…</p></div></div></section>
        <section id="detail-related" class="detail-related"><div class="detail-section-heading"><div><span class="eyebrow">Khám phá thêm</span><h2>Có thể bạn cũng thích</h2></div><a href="/books">Xem tất cả →</a></div><div id="related-books" class="detail-related-grid reveal-stagger"><p>Đang tải sách liên quan…</p></div></section>
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
    if(new URLSearchParams(location.search).get('focus')==='coupon'){
      const couponTarget=document.querySelector('.detail-coupon-ticket')||document.querySelector('.detail-purchase-card');
      window.setTimeout(()=>{couponTarget?.scrollIntoView({behavior:'smooth',block:'center'});couponTarget?.classList.add('is-coupon-focused');window.setTimeout(()=>couponTarget?.classList.remove('is-coupon-focused'),1800)},320);
    }
    document.querySelector('#detail-share')?.addEventListener('click', () => {
      copyText(location.href, 'Đã sao chép liên kết vào clipboard');
    });
    document.querySelector('#detail-quick-rating')?.addEventListener('click', () => {
      document.querySelector('#review-section')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
    const quickNavLinks = document.querySelectorAll('#detail-quick-nav a');
    quickNavLinks.forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        const targetId = link.getAttribute('href');
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          quickNavLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
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

    // Look Inside modal (Sample Preview)
    const lookInsideBtn = document.querySelector('#detail-lookinside');
    if (lookInsideBtn) {
      lookInsideBtn.addEventListener('click', async () => {
        let sampleData = null;
        try {
          const res = await fetch(`/api/books/${encodeURIComponent(book.workId)}/sample`);
          if (res.ok) {
            const payload = await res.json();
            sampleData = payload?.data;
          }
        } catch (_) {}

        // Fallback pages if API not available
        const defaultPages = [
          {
            chapter: 'Lời giới thiệu',
            content: book.description || 'Thông tin giới thiệu tác phẩm đang được cập nhật.'
          },
          {
            chapter: 'Mục lục chọn lọc',
            content: '• Lời mở đầu\n• Chương 1 · Khởi đầu hành trình\n• Chương 2 · Những điều cốt lõi\n• Chương 3 · Ứng dụng thực tiễn\n• Lời kết & Phụ lục'
          },
          {
            chapter: 'Trích đoạn chương 1',
            content: `“Mỗi trang sách là một ô cửa sổ mở ra thế giới mới. Bạn đang đọc những dòng chữ trích đoạn từ tác phẩm '${book.title}'. Hãy sở hữu ấn bản đầy đủ để thưởng thức trọn vẹn kiệt tác này.”`
          }
        ];

        const pages = (sampleData && sampleData.pages && sampleData.pages.length)
          ? sampleData.pages
          : defaultPages;

        let currentPageIndex = 0;

        // Remove old modal if exists
        document.querySelector('#look-inside-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'look-inside-modal';
        modal.className = 'look-inside-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', `Đọc thử: ${book.title}`);

        const renderPage = (idx) => {
          const pg = pages[idx];
          return `
            <div class="look-inside-page-content">
              <div class="look-inside-page-top">
                <span class="look-inside-page-tag">Trang ${idx + 1} / ${pages.length}</span>
                <b class="look-inside-chapter-title">${esc(pg.chapter || `Trích đoạn ${idx + 1}`)}</b>
              </div>
              <div class="look-inside-text">${esc(pg.content || '').replace(/\n/g, '<br><br>')}</div>
            </div>
          `;
        };

        modal.innerHTML = `
          <div class="look-inside-backdrop"></div>
          <div class="look-inside-panel">
            <header class="look-inside-head">
              <div>
                <span class="eyebrow" style="color:#d4a853;">ĐỌC THỬ TRÍCH ĐOẠN &middot; TRẠM SÁCH</span>
                <h2>${esc(sampleData?.title || book.title)}</h2>
                <p>${esc(sampleData?.author || (book.authors || []).join(', ') || authors)}</p>
              </div>
              <button type="button" class="look-inside-close" id="look-inside-close" aria-label="Đóng">✕</button>
            </header>
            <div class="look-inside-body">
              <div class="look-inside-page" id="look-inside-page-slot">
                ${renderPage(0)}
              </div>
              <aside class="look-inside-toc">
                <h3>📑 Mục lục đọc thử</h3>
                <ul class="look-inside-toc-list">
                  ${pages.map((p, i) => `
                    <li class="look-inside-toc-item ${i === 0 ? 'active' : ''}" data-page="${i}">
                      <button type="button">${esc(p.chapter || `Trang ${i + 1}`)}</button>
                    </li>
                  `).join('')}
                </ul>
                <div class="look-inside-page-nav">
                  <button type="button" class="look-inside-nav-btn" id="look-inside-prev" disabled>← Trang trước</button>
                  <span class="look-inside-page-indicator" id="look-inside-indicator">1 / ${pages.length}</span>
                  <button type="button" class="look-inside-nav-btn" id="look-inside-next" ${pages.length <= 1 ? 'disabled' : ''}>Trang sau →</button>
                </div>
              </aside>
            </div>
            <footer class="look-inside-footer">
              <p>Thưởng thức trọn vẹn tác phẩm với sách in giấy kem cao cấp.</p>
              <button type="button" class="btn-brand" id="look-inside-buy">${available ? 'Mua sách ngay &rarr;' : 'Xem kho sách'}</button>
            </footer>
          </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('is-open'));
        document.body.style.overflow = 'hidden';

        const updateActivePage = (newIdx) => {
          currentPageIndex = newIdx;
          const slot = modal.querySelector('#look-inside-page-slot');
          if (slot) slot.innerHTML = renderPage(currentPageIndex);

          modal.querySelectorAll('.look-inside-toc-item').forEach((li, idx) => {
            li.classList.toggle('active', idx === currentPageIndex);
          });

          const prevBtn = modal.querySelector('#look-inside-prev');
          const nextBtn = modal.querySelector('#look-inside-next');
          const indicator = modal.querySelector('#look-inside-indicator');
          if (prevBtn) prevBtn.disabled = currentPageIndex <= 0;
          if (nextBtn) nextBtn.disabled = currentPageIndex >= pages.length - 1;
          if (indicator) indicator.textContent = `${currentPageIndex + 1} / ${pages.length}`;
        };

        modal.querySelector('#look-inside-prev')?.addEventListener('click', () => {
          if (currentPageIndex > 0) updateActivePage(currentPageIndex - 1);
        });

        modal.querySelector('#look-inside-next')?.addEventListener('click', () => {
          if (currentPageIndex < pages.length - 1) updateActivePage(currentPageIndex + 1);
        });

        modal.querySelectorAll('.look-inside-toc-item button').forEach((btn, idx) => {
          btn.addEventListener('click', () => updateActivePage(idx));
        });

        const close = () => {
          modal.classList.remove('is-open');
          document.body.style.overflow = '';
          setTimeout(() => modal.remove(), 280);
        };

        modal.querySelector('#look-inside-close').addEventListener('click', close);
        modal.querySelector('.look-inside-backdrop').addEventListener('click', close);
        modal.querySelector('#look-inside-buy').addEventListener('click', () => {
          close();
          if (available) save('cart', '/checkout');
          else location.assign('/books');
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });
      });
    }

    async function save(kind, next = '') {
      if (!available) return showOutOfStock();
      const trigger = kind === 'cart' ? (next ? buyBtn : document.querySelector('#add-cart')) : document.querySelector('#add-favorite');
      const originalLabel = trigger?.innerHTML;

      // 1. Button press effect (scale 0.95 -> 1)
      if (trigger) {
        trigger.classList.add('btn-press');
        setTimeout(() => trigger.classList.remove('btn-press'), 140);
        trigger.disabled = true;
        trigger.setAttribute('aria-busy', 'true');
      }

      try {
        let flyPromise = Promise.resolve();
        if (kind === 'cart' && !next && typeof window.flyToCart === 'function') {
          const coverEl = document.querySelector('.detail-cover img') ||
                          document.querySelector('.detail-cover .book-cover-img') ||
                          document.querySelector('.detail-cover') ||
                          document.querySelector('.detail-visual img');
          if (coverEl) flyPromise = window.flyToCart(coverEl);
        }

        if (kind === 'cart') {
          const cartItems = await api('/api/items/cart', {
            method: 'POST',
            body: JSON.stringify({
              workId: book.workId,
              quantity: quantity,
              selected: Boolean(next)
            })
          });

          if (next) return location.assign(next);

          // Wait for flight impact before showing drawer & badge transition
          await flyPromise;

          // 4. Transform button to "✓ Đã thêm vào giỏ"
          if (trigger) {
            trigger.classList.add('btn-added-state');
            trigger.innerHTML = '<span class="btn-added-check">✓</span> <span>Đã thêm vào giỏ</span>';
          }

          // 5. Open mini cart / cart drawer
          if (typeof window.openCartDrawer === 'function') {
            const addedBookData = {
              title: book.title,
              authors: book.authors,
              price: Number(book.couponPrice || book.price || 99000),
              quantity: quantity,
              cover_url: book.cover || book.cover_url
            };
            window.openCartDrawer(addedBookData, cartItems);
          }
        } else {
          // KIND === 'FAVORITE'
          const isCurrentlyFavorited = trigger?.classList.contains('is-favorited') || trigger?.classList.contains('is-active');

          if (isCurrentlyFavorited) {
            // UNFAVORITE (Bỏ yêu thích)
            const res = await fetch(`/api/items/favorite/${encodeURIComponent(book.workId)}`, {
              method: 'DELETE',
              credentials: 'same-origin'
            });
            if (res.status === 401) return location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);

            trigger?.classList.remove('is-favorited', 'is-active');
            trigger?.setAttribute('title', 'Lưu yêu thích');
            trigger?.setAttribute('aria-label', 'Lưu yêu thích');

            if (trigger && typeof window.triggerFavoriteAnimation === 'function') {
              window.triggerFavoriteAnimation(trigger, false);
            }
            if (typeof window.updateFavoriteCount === 'function') window.updateFavoriteCount({ bump: false });
            if (window.toast) {
              window.toast({
                title: 'Đã xóa khỏi yêu thích',
                message: esc(book.title),
                kind: 'info'
              });
            }
          } else {
            // FAVORITE (Thêm yêu thích)
            const favItems = await api('/api/items/favorite', {
              method: 'POST',
              body: JSON.stringify({
                workId: book.workId,
                quantity: 1,
                selected: false
              })
            });

            trigger?.classList.add('is-favorited', 'is-active');
            trigger?.setAttribute('title', 'Đã lưu yêu thích');
            trigger?.setAttribute('aria-label', 'Đã lưu yêu thích');

            if (trigger && typeof window.triggerFavoriteAnimation === 'function') {
              window.triggerFavoriteAnimation(trigger, true);
            }
            if (typeof window.updateFavoriteCount === 'function') window.updateFavoriteCount({ bump: true });

            // Open favorite side drawer
            if (typeof window.openFavoriteDrawer === 'function') {
              const addedFavData = {
                workId: book.workId,
                title: book.title,
                authors: book.authors,
                price: Number(book.couponPrice || book.price || 99000),
                cover_url: book.cover || book.cover_url
              };
              window.openFavoriteDrawer(addedFavData, favItems);
            } else if (window.toast) {
              window.toast({ title: 'Đã lưu yêu thích ♥', message: esc(book.title), kind: 'ok', action: { label: 'Xem danh sách', href: '/favorites' } });
            }
          }
        }
      } catch (error) {
        if (error.status === 401) return location.assign(`/login?next=${encodeURIComponent(next || location.pathname)}`);
        const errorMsg = error.message || 'Có lỗi xảy ra, vui lòng thử lại.';
        if (window.toast) window.toast({ title: kind === 'cart' ? 'Không thể thêm vào giỏ' : 'Lỗi yêu thích', message: esc(errorMsg), kind: 'error' });
        document.querySelector('#detail-message').innerHTML = `<p class="message error">${esc(errorMsg)}</p>`;
      } finally {
        if (trigger) {
          setTimeout(() => {
            trigger.disabled = false;
            trigger.removeAttribute('aria-busy');
            if (kind === 'cart') {
              trigger.classList.remove('btn-added-state');
              if (originalLabel !== undefined) trigger.innerHTML = originalLabel;
            }
          }, kind === 'cart' && !next ? 1400 : 0);
        }
      }
    }
    
  function openReaderModal(sampleData, book) {
    const pages = sampleData?.pages || [];
    if (!pages.length) {
      if (window.toast) window.toast({ title: 'Chưa có bản đọc thử', message: 'Tác phẩm đang được cập nhật nội dung trích đoạn.', kind: 'info' });
      return;
    }

    let currentIdx = 0;
    const modalRoot = document.createElement('div');
    modalRoot.id = 'book-reader-modal-root';
    modalRoot.innerHTML = `
      <div id="reader-backdrop" style="position:fixed;inset:0;background:rgba(17,41,31,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fdfbf7;border-radius:18px;max-width:760px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 70px rgba(0,0,0,0.4);border:1px solid #e7dfd0;overflow:hidden;font-family:'Lora',serif;">
          
          <!-- Reader Topbar -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #eae2d5;background:#f8f5ee;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:22px;">📖</span>
              <div>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:#11291f;line-height:1.2;">${esc(sampleData.title || book.title)}</h3>
                <small style="font-family:'Be Vietnam Pro',sans-serif;color:#6b7280;font-size:12px;">Tác giả: <b>${esc(sampleData.author || book.authors)}</b> · Đọc thử chọn lọc</small>
              </div>
            </div>
            <button type="button" id="reader-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#555;padding:4px 8px;border-radius:6px;line-height:1;">✕</button>
          </div>

          <!-- Reader Chapter Navigation -->
          <div style="display:flex;gap:6px;padding:10px 20px;background:#f4efe6;border-bottom:1px solid #eae2d5;overflow-x:auto;-webkit-overflow-scrolling:touch;font-family:'Be Vietnam Pro',sans-serif;">
            ${pages.map((p, idx) => `
              <button type="button" class="reader-chapter-tab ${idx === 0 ? 'active' : ''}" data-idx="${idx}" style="white-space:nowrap;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid ${idx === 0 ? '#1f3d2e' : '#dcd4c3'};background:${idx === 0 ? '#1f3d2e' : '#fff'};color:${idx === 0 ? '#fff' : '#1f3d2e'};cursor:pointer;">
                ${esc(p.chapter)}
              </button>
            `).join('')}
          </div>

          <!-- Reader Body / Page Content -->
          <div id="reader-content-body" style="flex:1;overflow-y:auto;padding:28px 32px;line-height:1.85;font-size:15.5px;color:#2c2c2c;background:#fdfbf7;">
            <h4 id="reader-chapter-title" style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f3d2e;border-bottom:1px solid #ebd9c0;padding-bottom:8px;">${esc(pages[0].chapter)}</h4>
            <div id="reader-chapter-text" style="white-space:pre-line;">${esc(pages[0].content)}</div>
          </div>

          <!-- Reader Footer CTA -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-top:1px solid #eae2d5;background:#f8f5ee;font-family:'Be Vietnam Pro',sans-serif;flex-wrap:wrap;gap:12px;">
            <div style="font-size:13px;color:#555;">
              Bạn yêu thích tác phẩm này? Mua trọn cuốn với giá <b style="color:#bf5032;font-size:15px;">${money(book.couponPrice || book.price || 99000)}</b>
            </div>
            <div style="display:flex;gap:8px;">
              <button type="button" id="reader-buy-now-btn" class="btn-brand" style="border-radius:8px;padding:8px 18px;font-size:13px;">Mua sách ngay →</button>
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modalRoot);
    const backdrop = modalRoot.querySelector('#reader-backdrop');
    const closeBtn = modalRoot.querySelector('#reader-close-btn');
    const tabs = modalRoot.querySelectorAll('.reader-chapter-tab');
    const chapterTitle = modalRoot.querySelector('#reader-chapter-title');
    const chapterText = modalRoot.querySelector('#reader-chapter-text');
    const contentBody = modalRoot.querySelector('#reader-content-body');
    const buyBtn = modalRoot.querySelector('#reader-buy-now-btn');

    const close = () => modalRoot.remove();
    closeBtn.onclick = close;
    backdrop.onclick = e => { if (e.target === backdrop) close(); };

    tabs.forEach(tab => {
      tab.onclick = () => {
        const idx = Number(tab.dataset.idx);
        currentIdx = idx;
        tabs.forEach(t => {
          const isActive = Number(t.dataset.idx) === idx;
          t.style.background = isActive ? '#1f3d2e' : '#fff';
          t.style.color = isActive ? '#fff' : '#1f3d2e';
          t.style.borderColor = isActive ? '#1f3d2e' : '#dcd4c3';
        });
        chapterTitle.textContent = pages[idx].chapter;
        chapterText.textContent = pages[idx].content;
        contentBody.scrollTop = 0;
      };
    });

    buyBtn.onclick = () => {
      close();
      const actualBuy = document.querySelector('#buy-now');
      if (actualBuy) actualBuy.click();
    };
  }


    const sampleBtn = document.querySelector('#read-sample-btn');
    if (sampleBtn) {
      sampleBtn.onclick = async () => {
        sampleBtn.disabled = true;
        const origText = sampleBtn.innerHTML;
        sampleBtn.innerHTML = 'Đang tải…';
        try {
          const sampleData = await api(`/api/books/${encodeURIComponent(workId)}/sample`);
          openReaderModal(sampleData, book);
        } catch (err) {
          if (window.toast) window.toast({ title: 'Không thể mở đọc thử', message: err.message, kind: 'error' });
        } finally {
          sampleBtn.disabled = false;
          sampleBtn.innerHTML = origText;
        }
      };
    }

    document.querySelector('#add-cart').onclick = () => save('cart');
    document.querySelector('#buy-now').onclick = () => save('cart', '/checkout');
    if (mobileBuyBtn) mobileBuyBtn.onclick = () => save('cart', '/checkout');
    document.querySelector('#add-favorite').onclick = () => save('favorite');

    // Check if book is already favorited by the logged-in user
    api('/api/items/favorite')
      .then(favs => {
        const isFav = Array.isArray(favs) && favs.some(item => String(item.work_id || item.workId) === String(book.workId));
        if (isFav) {
          const favBtn = document.querySelector('#add-favorite');
          if (favBtn) {
            favBtn.classList.add('is-favorited', 'is-active');
            favBtn.setAttribute('title', 'Đã lưu yêu thích');
            favBtn.setAttribute('aria-label', 'Đã lưu yêu thích');
          }
        }
      })
      .catch(() => {});

    document.querySelector('#review-form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
      const origText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang gửi nhận xét…'; }
      try {
        await api(`/api/books/${encodeURIComponent(workId)}/reviews`, {method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
        document.querySelector('#review-message').innerHTML = '<p class="message">Đã lưu nhận xét của bạn.</p>';
        if (window.toast) window.toast({title:'Gửi nhận xét thành công',message:'Cảm ơn bạn đã chia sẻ cảm nhận!',kind:'ok'});
        form.reset();
        loadReviews();
      } catch (error) {
        if (error.status === 401) return location.assign(`/login?next=${encodeURIComponent(location.pathname + '#review-section')}`);
        document.querySelector('#review-message').innerHTML = `<p class="message error">${esc(error.message)}</p>`;
        if (window.toast) window.toast({title:'Không thể gửi nhận xét',message:error.message,kind:'error'});
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
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

  async function loadRelated(currentBook) {
    try {
      let related = [];
      try {
        const recData = await api(`/api/books/${encodeURIComponent(workId)}/recommendations?limit=8`);
        related = Array.isArray(recData) ? recData : (recData?.items || []);
      } catch (_) {}

      if (!related.length) {
        const books = await api('/api/home?limit=12');
        related = books.filter(book => (book.work_id || book.workId) !== workId);
      }

      const displayList = related.slice(0, 4);
      document.querySelector('#related-books').innerHTML = displayList.map(book => {
        const title = esc(book.title || 'Tác phẩm');
        const authors = esc(Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Chưa rõ tác giả'));
        const price = Number(book.promotional_price || book.selling_price || 99000);
        const originalPrice = Number(book.selling_price || 0);
        const hasDiscount = originalPrice > price;
        return `
          <a class="related-card" href="/books/${encodeURIComponent(book.work_id)}">
            <div class="related-card-cover">
              ${cover(book)}
              <span class="book-card-spine" aria-hidden="true"></span>
              <span class="related-card-badge">Đề xuất</span>
            </div>
            <div class="related-card-copy">
              <span class="related-card-author">${authors}</span>
              <h3 class="related-card-title" title="${title}">${title}</h3>
              <div class="related-card-price-row">
                <strong class="related-card-price">${money(price)}</strong>
                ${hasDiscount ? `<del class="related-card-del">${money(originalPrice)}</del>` : ''}
              </div>
              <div class="related-card-cta">
                <span>Xem chi tiết</span>
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" aria-hidden="true"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>
              </div>
            </div>
          </a>
        `;
      }).join('') || '<p>Chưa có sách liên quan.</p>';
      document.querySelector('#related-books').classList.add('reveal-stagger');

      let comboInfo = null;
      try {
        const comboRes = await api(`/api/books/${encodeURIComponent(workId)}/combo`);
        comboInfo = comboRes;
      } catch (_) {}

      const partners = comboInfo?.partners?.length ? comboInfo.partners : (comboInfo?.partner ? [comboInfo.partner] : (related.slice(0, 3)));
      const comboContainer = document.querySelector('#detail-combo');
      if (currentBook && partners && partners.length && comboContainer) {
        const currentPrice = Number(currentBook.couponPrice || currentBook.price || 0);
        const discountPercent = comboInfo?.discount_percent ?? 10;
        const isCustom = Boolean(comboInfo?.is_custom);
        const comboTitle = comboInfo?.combo_title || 'Thường được mua cùng nhau';
        const currentCoverUrl = currentBook.cover || currentBook.cover_url || '';

        // Render multi-item combo
        comboContainer.innerHTML = `
          <div class="detail-section-heading">
            <div>
              <span class="eyebrow">${isCustom ? 'Combo tuyển chọn đặc biệt' : 'Ưu đãi trọn bộ / Mua cùng nhau'}</span>
              <h2>${esc(comboTitle)}</h2>
            </div>
          </div>
          <div class="combo-grid">
            <div class="combo-left-col">
              <div class="combo-books-wrap">
                <!-- Sách chính (Đang xem) -->
                <div class="combo-book-item is-main" id="combo-item-main">
                  <span class="combo-book-tag">Cuốn này</span>
                  ${currentCoverUrl ? `<img class="combo-thumb" src="${esc(currentCoverUrl)}" alt="${esc(currentBook.title)}">` : `<div class="combo-thumb" style="background:#eee8db;display:grid;place-items:center;font-weight:700;color:#1f3d2e;">S</div>`}
                  <div class="combo-book-meta">
                    <b>${esc(currentBook.title)}</b>
                    <span>${money(currentPrice)}</span>
                  </div>
                </div>

                <!-- Các sách đi kèm (Phần 2, Phần 3...) -->
                ${partners.map((p, idx) => {
                  const pCover = p.cover || p.cover_url || '';
                  const pPrice = Number(p.promotional_price || p.selling_price || 0);
                  return `
                    <span class="combo-plus-badge" id="combo-plus-${idx}">+</span>
                    <div class="combo-book-item" id="combo-item-partner-${idx}">
                      <span class="combo-book-tag partner">Tập kèm</span>
                      ${pCover ? `<img class="combo-thumb" src="${esc(pCover)}" alt="${esc(p.title)}">` : `<div class="combo-thumb" style="background:#eee8db;display:grid;place-items:center;font-weight:700;color:#1f3d2e;">S</div>`}
                      <div class="combo-book-meta">
                        <b>${esc(p.title)}</b>
                        <span>${money(pPrice)}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Danh sách Checkbox chọn linh hoạt -->
              <div class="combo-selection-list">
                <div class="combo-check-row is-fixed">
                  <input type="checkbox" checked disabled>
                  <span class="combo-check-name"><b>Sách đang xem:</b> ${esc(currentBook.title)}</span>
                  <b class="combo-check-price">${money(currentPrice)}</b>
                </div>
                ${partners.map((p, idx) => {
                  const pPrice = Number(p.promotional_price || p.selling_price || 0);
                  return `
                    <label class="combo-check-row" for="cb-partner-${idx}">
                      <input type="checkbox" id="cb-partner-${idx}" class="combo-partner-cb" data-idx="${idx}" checked>
                      <span class="combo-check-name"><b>Mua thêm:</b> ${esc(p.title)}</span>
                      <b class="combo-check-price">+${money(pPrice)}</b>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Bảng tính giá & Nút mua combo -->
            <div class="combo-pricing-card">
              <div id="combo-discount-badge-container"></div>
              <div class="combo-pricing-row">
                <small id="combo-pricing-label">Tổng combo:</small>
                <div>
                  <del id="combo-orig-price"></del>
                  <strong id="combo-final-price"></strong>
                </div>
              </div>
              <button type="button" class="btn-buy-combo" id="buy-combo-btn">Đang tính giá…</button>
            </div>
          </div>
        `;
        comboContainer.hidden = false;

        const comboBtn = comboContainer.querySelector('#buy-combo-btn');
        const badgeContainer = comboContainer.querySelector('#combo-discount-badge-container');
        const pricingLabel = comboContainer.querySelector('#combo-pricing-label');
        const origPriceEl = comboContainer.querySelector('#combo-orig-price');
        const finalPriceEl = comboContainer.querySelector('#combo-final-price');

        // Hàm cập nhật giá theo các checkbox được tick
        function recalculate() {
          const checkedPartners = [];
          comboContainer.querySelectorAll('.combo-partner-cb').forEach(cb => {
            const idx = Number(cb.dataset.idx);
            const itemEl = comboContainer.querySelector(`#combo-item-partner-${idx}`);
            const plusEl = comboContainer.querySelector(`#combo-plus-${idx}`);
            if (cb.checked) {
              checkedPartners.push(partners[idx]);
              if (itemEl) itemEl.classList.remove('is-deselected');
              if (plusEl) plusEl.classList.remove('is-deselected');
            } else {
              if (itemEl) itemEl.classList.add('is-deselected');
              if (plusEl) plusEl.classList.add('is-deselected');
            }
          });

          const totalCount = 1 + checkedPartners.length;
          let origSum = currentPrice;
          checkedPartners.forEach(p => {
            origSum += Number(p.promotional_price || p.selling_price || 0);
          });

          if (totalCount > 1) {
            const discountRate = (100 - discountPercent) / 100;
            const finalTotal = Math.round((origSum * discountRate) / 1000) * 1000;
            const savedAmount = origSum - finalTotal;

            badgeContainer.innerHTML = discountPercent > 0 ? `<span class="combo-discount-badge">Tiết kiệm ${money(savedAmount)} (giảm ${discountPercent}%) khi mua combo ${totalCount} cuốn</span>` : `<span class="combo-discount-badge">Bộ tác phẩm đọc cùng nhau</span>`;
            pricingLabel.textContent = `Tổng combo (${totalCount} cuốn):`;
            origPriceEl.textContent = discountPercent > 0 ? money(origSum) : '';
            origPriceEl.style.display = discountPercent > 0 ? 'inline' : 'none';
            finalPriceEl.textContent = money(finalTotal);
            comboBtn.textContent = `Mua cả ${totalCount} cuốn (${money(finalTotal)})`;
          } else {
            // Chỉ mua sách chính
            badgeContainer.innerHTML = `<span class="combo-discount-badge" style="background:#f1f5f9;color:#475569;">Tick chọn thêm sách đi kèm để giảm ${discountPercent}%</span>`;
            pricingLabel.textContent = 'Giá sách chính:';
            origPriceEl.textContent = '';
            origPriceEl.style.display = 'none';
            finalPriceEl.textContent = money(currentPrice);
            comboBtn.textContent = `Mua sách này (${money(currentPrice)})`;
          }
        }

        comboContainer.querySelectorAll('.combo-partner-cb').forEach(cb => {
          cb.addEventListener('change', recalculate);
        });
        recalculate();

        if (comboBtn) {
          comboBtn.addEventListener('click', async () => {
            const checkedPartners = [];
            comboContainer.querySelectorAll('.combo-partner-cb:checked').forEach(cb => {
              checkedPartners.push(partners[Number(cb.dataset.idx)]);
            });
            const totalCount = 1 + checkedPartners.length;

            const origText = comboBtn.textContent;
            comboBtn.disabled = true;
            comboBtn.textContent = 'Đang thêm vào giỏ hàng…';
            try {
              // Thêm sách chính
              await api('/api/items/cart', { method: 'POST', body: JSON.stringify({ workId: currentBook.workId, quantity: 1, selected: true }) });
              // Thêm các sách đi kèm đã chọn
              for (const p of checkedPartners) {
                await api('/api/items/cart', { method: 'POST', body: JSON.stringify({ workId: p.work_id || p.workId, quantity: 1, selected: true }) });
              }

              if (window.toast) {
                window.toast({
                  title: 'Đã thêm combo vào giỏ hàng!',
                  message: `${totalCount} cuốn sách đã sẵn sàng trong giỏ của bạn.`,
                  kind: 'ok',
                  action: { label: 'Xem giỏ hàng', href: '/cart' }
                });
              }
              setTimeout(() => location.assign('/cart'), 600);
            } catch (err) {
              if (err.status === 401) return location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
              if (window.toast) window.toast({ title: 'Không thể thêm combo', message: err.message, kind: 'error' });
              comboBtn.disabled = false;
              comboBtn.textContent = origText;
            }
          });
        }
      }
    } catch (_) {
      document.querySelector('#related-books').innerHTML = '<p>Chưa thể tải sách liên quan lúc này.</p>';
    }
  }

  root.innerHTML = `<div class="skeleton-detail"><div class="skeleton skeleton-cover"></div><div class="skeleton-detail-body"><div class="skeleton-line title"></div><div class="skeleton-line meta"></div><div class="skeleton-line block"></div><div class="skeleton-line block"></div><div class="skeleton-line short"></div></div></div>`;

  api(`/api/books/${encodeURIComponent(workId)}`).then(book => { renderBook(book); loadReviews(); loadRelated(book); }).catch(error => {
    if (typeof window.renderEmpty === 'function') {
      root.innerHTML = `<section class="shell">${window.renderEmpty('search', 'Không tìm thấy sách', esc(error.message) || 'Có lỗi xảy ra khi tải thông tin sách.', [{label:'Về trang chủ',href:'/',style:'primary'},{label:'Xem kho sách',href:'/books'}])}</section>`;
    } else {
      root.innerHTML = `<section class="shell"><p class="message error">${esc(error.message)}</p></section>`;
    }
  });
})();
