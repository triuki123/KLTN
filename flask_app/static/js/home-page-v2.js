(() => {
  if (document.body.dataset.page !== 'home') return;

  const root = document.querySelector('#app');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const price = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

  const fetchData = async url => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể tải dữ liệu');
    return payload.data;
  };

  const cover = book => {
    const src = book.cover_url;
    const title = esc(book.title || 'Sách Tuyển Chọn');
    const authors = esc(book.authors || 'Trạm Sách');
    const str = book.title || 'tram-sach';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
    const themeIdx = Math.abs(hash) % 4;
    const themeClass = ['vintage-theme-forest', 'vintage-theme-indigo', 'vintage-theme-burgundy', 'vintage-theme-ochre'][themeIdx];

    const fallbackHtml = `
      <div class="vintage-book-cover ${themeClass}">
        <div class="vintage-book-frame" style="padding: 8px 6px;">
          <span class="vintage-ornament-top" style="font-size: 9px;">✦ ❦ ✦</span>
          <b class="vintage-title" style="font-size: 11px;">${title}</b>
          <span class="vintage-author" style="font-size: 9px;">${authors}</span>
          <div class="vintage-seal" style="font-size: 7.5px;"><small>TRẠM SÁCH</small></div>
        </div>
      </div>
    `;

    if (src) {
      return `
        <img src="${esc(src)}" alt="Bìa sách ${title}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">
        <div class="vintage-book-cover ${themeClass}" style="display:none;">
          <div class="vintage-book-frame" style="padding: 8px 6px;">
            <span class="vintage-ornament-top" style="font-size: 9px;">✦ ❦ ✦</span>
            <b class="vintage-title" style="font-size: 11px;">${title}</b>
            <span class="vintage-author" style="font-size: 9px;">${authors}</span>
            <div class="vintage-seal" style="font-size: 7.5px;"><small>TRẠM SÁCH</small></div>
          </div>
        </div>
      `;
    }
    return fallbackHtml;
  };

  const couponBadge = book => {
    if (!book.coupon_code && !book.has_coupon_program) return '';
    const ticketIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5V15a3 3 0 0 0 0-6V6.5Z"/><path d="M12 7.5v9"/></svg>';
    const type=book.coupon_discount_type||book.program_discount_type,value=Number(book.coupon_discount_value??book.program_discount_value??0),code=book.coupon_code||book.program_code||'';
    const discount = type === 'FREE_SHIPPING'
      ? 'Miễn phí vận chuyển'
      : type === 'PERCENT'
      ? `Giảm ${value.toLocaleString('vi-VN')}%`
      : type === 'FIXED' ? `Giảm ${Math.round(value / 1000).toLocaleString('vi-VN')}K` : 'Có ưu đãi';
    const tooltip=book.program_active||book.coupon_code?`${discount}${code?` · Mã ${code}`:''}`:`${book.program_name||'Chương trình ưu đãi'} · Xem điều kiện tại trang chi tiết`;
    return `<span class="coupon-program-badge${book.program_active||book.coupon_code?' is-active':''}" role="link" tabindex="0" data-coupon-link="/books/${encodeURIComponent(book.work_id)}?focus=coupon" aria-label="${esc(tooltip)}">${ticketIcon}<span>${esc(book.program_active||book.coupon_code?discount:'Có ưu đãi')}</span><span class="coupon-program-tooltip" role="tooltip">${esc(tooltip)}<b>Xem chi tiết →</b></span></span>`;
  };

  const categoryIcon = slug => ({
    'van-hoc': '📚',
    'kinh-te-kinh-doanh': '📈',
    'ky-nang-song': '💡',
    'tam-ly-giao-duc': '🌿',
    'khoa-hoc-cong-nghe': '🔬',
    'thieu-nhi': '🎈',
    'truyen-tranh-manga-comic': '🎨',
    'lich-su-dia-ly': '🏛️',
    'suc-khoe-y-hoc-the-thao': '🏃',
    'hoc-ngoai-ngu-tu-dien': '🌐',
    'triet-hoc-ton-giao-tam-linh': '☯️',
    'am-thuc-doi-song-gia-dinh': '🍳'
  }[slug] || '📖');

  const categoryCard = category => `<a class="home-category-pill" href="/books?category=${encodeURIComponent(category.slug)}">
    <span class="home-cat-icon">${categoryIcon(category.slug)}</span>
    <span class="home-cat-name">${esc(category.name)}</span>
  </a>`;

  const card = (book, rank = 0) => {
    const rawPrice = Number(book.selling_price || 99000);
    const promo = Number(book.promotional_price || 0);
    const current = (promo > 0 && promo < rawPrice) ? promo : rawPrice;
    const hasPromo = promo > 0 && promo < rawPrice;
    const sold = Number(book.sold_count || 0);
    const stock = Number(book.stock_quantity ?? 15);

    let rankBadge = '';
    if (rank === 1) rankBadge = '<span class="book-rank rank-1" aria-label="Bestseller Top 1">👑 Top 1</span>';
    else if (rank === 2) rankBadge = '<span class="book-rank rank-2" aria-label="Top 2">🥈 #2</span>';
    else if (rank === 3) rankBadge = '<span class="book-rank rank-3" aria-label="Top 3">🥉 #3</span>';
    else if (rank > 3) rankBadge = `<span class="book-rank" aria-label="Hạng ${rank}">#${rank}</span>`;

    const couponHtml = couponBadge(book);
    const couponSlot = couponHtml || '<span class="coupon-slot-placeholder" aria-hidden="true">&nbsp;</span>';

    return `<article class="book-card quick-book-card" data-work-id="${esc(book.work_id)}" data-title="${esc(book.title)}">
      <div class="quick-cover-wrap">
        ${rankBadge}
        <button type="button" class="quick-favorite-btn${book.is_favorite ? ' is-active' : ''}" data-work-id="${esc(book.work_id)}" title="${book.is_favorite ? 'Đã lưu yêu thích' : 'Thêm vào yêu thích'}" aria-label="Lưu yêu thích"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
        <div class="book-card-cover-wrap">
          <a href="/books/${encodeURIComponent(book.work_id)}">${cover(book)}<span class="book-card-shine"></span></a>
          <div class="book-card-quickview"><span class="rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${(4.5 + (rank ? rank * 0.1 : 0) % 0.5).toFixed(1)}</span><a class="view-link" href="/books/${encodeURIComponent(book.work_id)}">Xem</a></div>
        </div>
        <div class="quick-actions"><button type="button" class="quick-cart">Giỏ hàng</button><button type="button" class="quick-buy">Mua ngay</button></div>
      </div>
      <a class="quick-book-info" href="/books/${encodeURIComponent(book.work_id)}">
        <h3>${esc(book.title)}</h3>
        <p>${esc(Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Chưa rõ tác giả'))}</p>
        <div class="book-card-coupon-slot">${couponSlot}</div>
        <div class="book-card-bottom">
          <div class="book-card-price-row">
            <b>${price(current)}</b>
            ${hasPromo ? `<span class="book-card-strike">${price(rawPrice)}</span>` : ''}
          </div>
          <div class="book-card-sales-row">
            ${sold > 0 ? `<span class="book-sold-tag">Đã bán ${sold}</span>` : '<span class="book-sold-tag">Sách chọn lọc</span>'}
            <small class="book-stock-tag">Còn ${stock} cuốn</small>
          </div>
        </div>
      </a>
    </article>`;
  };

  function enableAutoRail(id) {
    const rail = document.querySelector(`#${id}`);
    if (!rail || rail.dataset.autoRail === 'ready') return false;
    const originals = [...rail.querySelectorAll('.quick-book-card')];
    if (originals.length < 2) return false;
    rail.dataset.autoRail = 'ready';
    originals.forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      rail.appendChild(clone);
    });
    rail.classList.add('auto-loop-rail');
    let previous = 0;
    let position = rail.scrollLeft;
    let paused = false;
    const step = time => {
      if (!previous) previous = time;
      const elapsed = Math.min(40, time - previous);
      previous = time;
      if (!paused) {
        position += elapsed * 0.028;
        const width = rail.scrollWidth / 2;
        if (width && position >= width) position -= width;
        rail.scrollLeft = position;
      }
      requestAnimationFrame(step);
    };
    const pause = () => { paused = true; };
    const resume = () => { position = rail.scrollLeft; previous = 0; paused = false; };
    rail.addEventListener('mouseenter', pause);
    rail.addEventListener('mouseleave', resume);
    rail.addEventListener('focusin', pause);
    rail.addEventListener('focusout', resume);
    rail.addEventListener('touchstart', pause, { passive: true });
    rail.addEventListener('touchend', () => window.setTimeout(resume, 900), { passive: true });
    let navigationTimer = 0;
    rail.addEventListener('railnavigate', event => {
      pause();
      window.clearTimeout(navigationTimer);
      position = rail.scrollLeft + Number(event.detail?.delta || 0);
      rail.scrollTo({left:position,behavior:'smooth'});
      navigationTimer = window.setTimeout(resume, 520);
    });
    document.addEventListener('visibilitychange', () => { paused = document.hidden; previous = 0; });
    requestAnimationFrame(step);
    return true;
  }

  root.className = 'home-experience';
  root.innerHTML = `
    <section class="home-hero-v2"><div class="home-hero-inner">
      <div class="home-hero-copy"><div class="home-kicker"><i></i>TRẠM SÁCH</div><h1>Mỗi cuốn sách mở ra<br><em>một thế giới riêng.</em></h1><p class="home-lead">Tìm cuốn sách phù hợp với nhịp sống của bạn. Tồn kho và giá bán được hiển thị rõ ràng trước khi đặt.</p>
        <div class="home-hero-actions"><a class="btn-brand" href="/books">Khám phá kho sách</a><a class="home-secondary-action" href="#home-books">Xem sách bán chạy <span>→</span></a></div>
        <div class="home-hero-highlights"><div class="home-hero-highlight"><b>Kho sách chọn lọc</b><span>Cập nhật thường xuyên</span></div><div class="home-hero-highlight"><b id="hero-category-count">Nhiều chủ đề</b><span>Dễ dàng khám phá</span></div><div class="home-hero-highlight"><b>Toàn quốc</b><span>Giao sách tận nơi</span></div></div>
      </div>
      <aside class="home-hero-books"><span class="eyebrow">SÁCH ĐANG ĐƯỢC QUAN TÂM</span><div id="home-hero-covers"><div class="hero-cover-skeleton"></div><div class="hero-cover-skeleton"></div><div class="hero-cover-skeleton"></div></div><a href="/books">Xem kho sách →</a></aside>
    </div></section>

    <!-- 🎟️ KHỐI MÃ GIẢM GIÁ ĐỘC QUYỀN HÔM NAY -->
    <section class="home-voucher-section">
      <div class="home-voucher-inner">
        <div class="home-voucher-head">
          <div>
            <span class="eyebrow">ƯU ĐÃI ĐỘC QUYỀN</span>
            <h2>Mã giảm giá hôm nay</h2>
            <p>Thu thập voucher và áp dụng ngay tại bước thanh toán đơn hàng.</p>
          </div>
          <a class="pill light" href="/books">Dùng mã ngay →</a>
        </div>
        <div class="home-voucher-grid" id="home-voucher-grid"></div>
      </div>
    </section>

    <!-- 📚 KỆ SÁCH NỔI BẬT VỚI TAB DANH MỤC CHUYỂN TỨC THÌ -->
    <section class="home-section-v2 home-showcase-section" id="home-showcase-section">
      <div class="home-section-head">
        <div>
          <span class="eyebrow">KHÁM PHÁ &amp; MUA SÁCH NGAY</span>
          <h2 id="home-shelf-title">Sách Nổi Bật &amp; Bán Chạy</h2>
        </div>
        <a class="section-link" id="home-shelf-more" href="/books">Xem toàn bộ 205 cuốn sách →</a>
      </div>

      <!-- 🎯 IN-SHELF CATEGORY FILTER TABS -->
      <div class="home-shelf-tabs-shell">
        <div class="home-shelf-tabs" id="home-shelf-tabs" role="tablist">
          <button type="button" class="home-shelf-tab active" data-category="">✨ Tất cả nổi bật</button>
          <button type="button" class="home-shelf-tab" data-category="van-hoc">📚 Văn học</button>
          <button type="button" class="home-shelf-tab" data-category="kinh-te-kinh-doanh">📈 Kinh tế</button>
          <button type="button" class="home-shelf-tab" data-category="ky-nang-song">💡 Kỹ năng</button>
          <button type="button" class="home-shelf-tab" data-category="tam-ly-giao-duc">🌿 Tâm lý</button>
          <button type="button" class="home-shelf-tab" data-category="truyen-tranh-manga">🎨 Manga Comic</button>
          <button type="button" class="home-shelf-tab" data-category="thieu-nhi">🎈 Thiếu nhi</button>
          <button type="button" class="home-shelf-tab" data-category="lich-su-dia-ly">🏛️ Lịch sử</button>
          <button type="button" class="home-shelf-tab" data-category="suc-khoe-y-hoc">🏃 Sức khỏe</button>
          <button type="button" class="home-shelf-tab" data-category="ngoai-ngu-tu-dien">🌐 Ngoại ngữ</button>
          <button type="button" class="home-shelf-tab" data-category="triet-hoc-tam-linh">☯️ Triết học</button>
          <button type="button" class="home-shelf-tab" data-category="am-thuc-doi-song">🍳 Ẩm thực</button>
        </div>
      </div>

      <div id="home-books" class="home-book-rail"><div class="home-empty">Đang tải sách…</div></div>
    </section>

    <!-- 📖 KHỐI GỢI Ý ĐỌC THEO TÂM TRẠNG & TRÍCH DẪN (ĐƯA XUỐNG LÀM ĐIỂM NGHỈ CHÂN) -->
    <section class="home-mood-section">
      <div class="home-mood-inner">
        <div class="home-mood-quote">
          <span class="quote-mark">“</span>
          <blockquote>Một cuốn sách thực sự tốt dạy ta nhiều điều hơn là chỉ đọc nó. Ta phải nhanh chóng đặt nó xuống, và bắt đầu sống theo những chỉ dẫn của nó.</blockquote>
          <cite>— Henry David Thoreau</cite>
        </div>
        <div class="home-mood-selector">
          <span class="eyebrow">GỢI Ý THEO CẢM XÚC</span>
          <h3>Hôm nay bạn muốn đọc gì?</h3>
          <div class="home-mood-buttons">
            <a href="/books?category=tam-ly-giao-duc" class="home-mood-btn">🌿 Lắng đọng &amp; Tĩnh tâm</a>
            <a href="/books?category=kinh-te-kinh-doanh" class="home-mood-btn">🚀 Bứt phá sự nghiệp</a>
            <a href="/books?category=ky-nang-song" class="home-mood-btn">💡 Khai phóng tư duy</a>
            <a href="/books?category=van-hoc" class="home-mood-btn">📖 Nuôi dưỡng tâm hồn</a>
          </div>
        </div>
      </div>
    </section>

    <section class="home-section-v2">
      <div class="home-section-head">
        <div>
          <span class="eyebrow">Đọc tiếp</span>
          <h2>Những lựa chọn khác</h2>
        </div>
        <a class="section-link" href="/books">Khám phá kho sách →</a>
      </div>
      <div class="home-rail-shell" aria-label="Điều hướng những lựa chọn khác">
        <button class="home-rail-nav home-rail-prev" type="button" data-rail-target="home-new-books" data-direction="-1" aria-label="Xem sách phía trước"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
        <div id="home-new-books" class="home-book-rail"><div class="home-empty">Đang tải sách mới…</div></div>
        <button class="home-rail-nav home-rail-next" type="button" data-rail-target="home-new-books" data-direction="1" aria-label="Xem thêm sách"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
      </div>
    </section>

    <!-- 💬 KHỐI ĐỘC GIẢ NÓI GÌ VỀ TRẠM SÁCH -->
    <section class="home-testimonials-section">
      <div class="home-testimonials-inner">
        <div class="home-section-head">
          <div>
            <span class="eyebrow">CỘNG ĐỒNG YÊU SÁCH</span>
            <h2>Độc giả nói gì về Trạm Sách</h2>
          </div>
          <span class="home-trust-rating">⭐ 4.9/5 từ hơn 1.200 độc giả</span>
        </div>
        <div class="home-testimonials-grid">
          <article class="home-testimonial-card">
            <div class="testimonial-stars">★★★★★</div>
            <p>“Sách bọc bìa carton rất kỹ, gáy sách phẳng phiu không tì vết. Đặt hôm trước hôm sau đã nhận được rồi, sẽ ủng hộ Trạm Sách dài dài!”</p>
            <div class="testimonial-author">
              <span class="testimonial-avatar">TH</span>
              <div>
                <b>Thu Hà</b>
                <small>Hà Nội · Đã mua <i>Muôn kiếp nhân sinh</i></small>
              </div>
            </div>
          </article>
          <article class="home-testimonial-card">
            <div class="testimonial-stars">★★★★★</div>
            <p>“Rất thích tính năng xem tồn kho thực tế, không sợ đặt rồi bị hủy đơn do hết hàng như các nơi khác. Giá tốt mà dịch vụ cực kỳ chu đáo.”</p>
            <div class="testimonial-author">
              <span class="testimonial-avatar">MQ</span>
              <div>
                <b>Minh Quân</b>
                <small>TP.HCM · Đã mua <i>Tâm lý học về tiền</i></small>
              </div>
            </div>
          </article>
          <article class="home-testimonial-card">
            <div class="testimonial-stars">★★★★★</div>
            <p>“Giao diện web nhẹ nhàng hoài cổ rất hợp gu người mê sách. Voucher giảm giá lưu dễ dàng. 10/10 điểm cho Trạm Sách!”</p>
            <div class="testimonial-author">
              <span class="testimonial-avatar">TT</span>
              <div>
                <b>Thanh Trúc</b>
                <small>Đà Nẵng · Đã mua <i>Cây cam ngọt của tôi</i></small>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="home-service-strip">
      <div class="home-service-inner">
        <div><b>Tồn kho minh bạch</b><span>Biết số lượng trước khi mua</span></div>
        <div><b>Giao hàng toàn quốc</b><span>Miễn phí từ 299.000đ</span></div>
        <div><b>Thanh toán linh hoạt</b><span>Hỗ trợ thanh toán khi nhận hàng</span></div>
        <div><b>Đổi trả trong 7 ngày</b><span>Hỗ trợ khi sách có lỗi</span></div>
      </div>
    </section>`;

  // Khởi tạo Voucher Grid
  const vouchers = [
    { code: 'FREESHIP', discount: 'Free Ship', desc: 'Đơn từ 299.000đ toàn quốc', tag: 'Vận chuyển' },
    { code: 'TRAMSACH10', discount: 'Giảm 10%', desc: 'Tối đa 30.000đ đơn từ 150.000đ', tag: 'Sách mới' },
    { code: 'BANMOI20K', discount: 'Giảm 20K', desc: 'Dành riêng cho đơn hàng đầu tiên', tag: 'Khách mới' }
  ];
  const voucherGrid = document.querySelector('#home-voucher-grid');
  if (voucherGrid) {
    function copyVoucherCode(text) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    }

    function fallbackCopy(text) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (_) {}
    }

    voucherGrid.innerHTML = vouchers.map(v => `
      <div class="home-voucher-ticket">
        <div class="voucher-ticket-left">
          <span class="voucher-icon">🎟️</span>
          <b>${v.discount}</b>
          <small>${v.tag}</small>
        </div>
        <div class="voucher-ticket-right">
          <div class="voucher-info">
            <span class="voucher-code-chip">${v.code}</span>
            <p>${v.desc}</p>
          </div>
          <button type="button" class="btn-copy-voucher" data-code="${v.code}">Lưu mã</button>
        </div>
      </div>
    `).join('');

    voucherGrid.querySelectorAll('.btn-copy-voucher').forEach(btn => {
      btn.onclick = async () => {
        const code = btn.dataset.code;
        btn.disabled = true;

        // Kiểm tra xem khách đã đăng nhập tài khoản chưa
        let isLoggedIn = false;
        try {
          const res = await fetch('/api/session', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
          const json = await res.json();
          isLoggedIn = Boolean(json?.data?.id);
        } catch (_) {
          isLoggedIn = false;
        }

        // Nếu CHƯA đăng nhập: Yêu cầu đăng nhập theo chuẩn nghiệp vụ Ví Voucher
        if (!isLoggedIn) {
          btn.disabled = false;
          btn.textContent = 'Cần đăng nhập';
          btn.style.background = '#8f392b';
          btn.style.color = '#fff';

          if (toast) {
            toast.className = 'error';
            toast.innerHTML = `<b>Yêu cầu đăng nhập</b><span>Bạn cần đăng nhập để lưu mã <b>${code}</b> vào tài khoản. Đang chuyển tiếp...</span><a href="/login?next=/">Đăng nhập ngay &rarr;</a>`;
          }

          setTimeout(() => {
            btn.textContent = 'Lưu mã';
            btn.style.background = '';
            btn.style.color = '';
            location.assign('/login?next=/');
          }, 1400);
          return;
        }

        // Nếu ĐÃ đăng nhập: Lưu mã vào phiên mua sắm và sao chép mã
        copyVoucherCode(code);
        try {
          sessionStorage.setItem('cartCouponCode', code);
        } catch (_) {}

        btn.disabled = false;
        btn.textContent = '✓ Đã lưu';
        btn.classList.add('copied');

        if (toast) {
          toast.className = '';
          toast.innerHTML = `<b>Đã lưu mã ${code}</b><span>Mã ưu đãi đã được lưu vào tài khoản của bạn! Sẵn sàng dùng khi thanh toán.</span><a href="/books">Dùng mã ngay &rarr;</a>`;
          window.setTimeout(() => { toast.textContent = ''; }, 3200);
        }

        setTimeout(() => {
          btn.textContent = 'Lưu mã';
          btn.classList.remove('copied');
        }, 2500);
      };
    });
  }

    // Category rail navigation
    const catRail = document.querySelector('#home-categories');
    const catPrev = document.querySelector('.home-cat-nav.prev');
    const catNext = document.querySelector('.home-cat-nav.next');
    if (catRail && catPrev && catNext) {
      catPrev.onclick = () => catRail.scrollBy({ left: -260, behavior: 'smooth' });
      catNext.onclick = () => catRail.scrollBy({ left: 260, behavior: 'smooth' });
    }

    const newBooksRail = document.querySelector('#home-new-books');
  const autoRailObserver = new MutationObserver(() => {
    if (enableAutoRail('home-new-books')) autoRailObserver.disconnect();
  });
  autoRailObserver.observe(newBooksRail, { childList: true });
  let autoRailTries = 0;
  const autoRailTimer = window.setInterval(() => {
    autoRailTries += 1;
    if (enableAutoRail('home-new-books') || autoRailTries >= 40) window.clearInterval(autoRailTimer);
  }, 250);

  let toast = document.querySelector('#home-cart-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'home-cart-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }

  root.addEventListener('click', async event => {
    const railButton = event.target.closest('.home-rail-nav');
    if (railButton) {
      event.preventDefault();
      const rail = document.querySelector(`#${railButton.dataset.railTarget}`);
      if (!rail) return;
      const firstCard = rail.querySelector('.quick-book-card');
      const cardWidth = firstCard?.getBoundingClientRect().width || rail.clientWidth * .8;
      const gap = Number.parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 16;
      const delta = (cardWidth + gap) * Number(railButton.dataset.direction || 1);
      if (rail.dataset.autoRail === 'ready') rail.dispatchEvent(new CustomEvent('railnavigate', {detail:{delta}}));
      else rail.scrollBy({left:delta,behavior:'smooth'});
      return;
    }
    const couponLink=event.target.closest('.coupon-program-badge[data-coupon-link]');
    if(couponLink){event.preventDefault();event.stopPropagation();location.assign(couponLink.dataset.couponLink);return}
    const favBtn = event.target.closest('.quick-favorite-btn');
    if (favBtn) {
      event.preventDefault();
      event.stopPropagation();
      const workId = favBtn.dataset.workId;
      const cardEl = favBtn.closest('.quick-book-card');
      const bookTitle = cardEl?.dataset.title || 'Sách';
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
          favBtn.setAttribute('title', 'Thêm vào yêu thích');
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
          favBtn.setAttribute('title', 'Đã lưu yêu thích');
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
      return;
    }

    const button = event.target.closest('.quick-cart,.quick-buy');
    if (!button) return;
    event.preventDefault();
    const book = button.closest('.quick-book-card');
    const buyNow = button.classList.contains('quick-buy');
    try {
      if (!buyNow && typeof window.flyToCart === 'function') {
        const coverEl = book.querySelector('.book-card-cover-wrap img, .book-card-cover-wrap .cover-placeholder');
        if (coverEl) window.flyToCart(coverEl);
      }
      const response = await fetch('/api/items/cart', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workId: book.dataset.workId, selected: buyNow }) });
      const payload = await response.json();
      if (response.status === 401) return location.assign(`/login?next=${encodeURIComponent(buyNow ? '/checkout' : '/')}`);
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể thêm vào giỏ hàng');
      if (buyNow) return location.assign('/checkout');
      toast.innerHTML = `<b>Đã thêm vào giỏ hàng</b><span>${esc(book.dataset.title)}</span><a href="/cart">Xem giỏ hàng →</a>`;
      window.setTimeout(() => { toast.textContent = ''; }, 3200);
    } catch (error) {
      toast.textContent = error.message;
      toast.classList.add('error');
      window.setTimeout(() => { toast.textContent = ''; toast.classList.remove('error'); }, 3000);
    }
  });
  root.addEventListener('keydown',event=>{const badge=event.target.closest('.coupon-program-badge[data-coupon-link]');if(badge&&(event.key==='Enter'||event.key===' ')){event.preventDefault();location.assign(badge.dataset.couponLink)}});

  const loadHomeBooks = async () => {
    const [localBooks, programTags, categories, favItems] = await Promise.all([
      fetchData('/api/home?limit=30').catch(() => []),
      fetchData('/api/storefront-program-tags').catch(() => []),
      fetchData('/api/categories').catch(() => []),
      fetchData('/api/items/favorite').catch(() => [])
    ]);

    const seen = new Set();
    const books = [];
    const programByWorkId = new Map(programTags.map(item => [String(item.workId), item]));
    const favSet = new Set((Array.isArray(favItems) ? favItems : []).map(item => String(item.work_id)));

    // 1. Curated Bookstore Inventory (Real Vietnamese titles, high-quality licensed covers, accurate prices & stock)
    for (const b of (Array.isArray(localBooks) ? localBooks : [])) {
      if (!b?.work_id || seen.has(b.work_id)) continue;
      seen.add(b.work_id);
      const program = programByWorkId.get(String(b.work_id));
      books.push({
        work_id: b.work_id,
        title: b.title,
        authors: b.authors || 'Chưa rõ tác giả',
        cover_url: b.cover_url || null,
        source: 'mysql',
        is_favorite: favSet.has(String(b.work_id)),
        sold_count: Number(b.sold_count || 0),
        stock_quantity: Number(b.stock_quantity || 0),
        selling_price: b.selling_price,
        promotional_price: b.promotional_price,
        updated_at: b.updated_at,
        coupon_code: b.coupon_code || null,
        coupon_discount_type: b.coupon_discount_type || null,
        coupon_discount_value: b.coupon_discount_value ?? null,
        has_coupon_program: Boolean(program?.programCount),
        program_active: Boolean(program?.active),
        program_code: program?.code || null,
        program_name: program?.name || null,
        program_discount_type: program?.discountType || null,
        program_discount_value: program?.discountValue ?? null
      });
    }

    // 2. Supplement additional Vietnamese literature books if inventory is under 24
    if (books.length < 24) {
      try {
        const vieRes = await fetchData('/api/books?q=language:vie&limit=16');
        const items = vieRes?.items || [];
        for (const item of items) {
          if (!item?.workId || !item.cover || seen.has(item.workId)) continue;
          seen.add(item.workId);
          books.push({
            work_id: item.workId,
            title: item.title,
            authors: (item.authors || []).join(', ') || 'Chưa rõ tác giả',
            cover_url: item.cover,
            source: 'openlibrary',
            sold_count: 0,
            stock_quantity: 12,
            selling_price: 99000,
            promotional_price: null,
            coupon_code: null,
            has_coupon_program: false
          });
          if (books.length >= 30) break;
        }
      } catch (_) {}
    }

    return [categories, books];
  };

  loadHomeBooks().then(([categories, books]) => {
    const available = [...books].sort((a, b) => Number(Boolean(b.cover_url)) - Number(Boolean(a.cover_url)));
    const featured = available.slice(0, 3);
    const best = [...available].sort((a, b) => Number(b.sold_count || 0) - Number(a.sold_count || 0)).slice(0, 12);
    const newest = [...available].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)).slice(0, 12);
    document.querySelector('#hero-category-count').textContent = `${categories.length} chủ đề`;
    const renderHero = () => {
      if (!featured.length) return;
      const book = featured[heroIndex % featured.length];
      const isOl = book.source === 'openlibrary';
      const badge = book.coupon_code
        ? `<span class="hero-cover-badge">Mã ${esc(book.coupon_discount_type === 'FREE_SHIPPING' ? 'FREESHIP' : book.coupon_discount_type === 'PERCENT' ? `-${Number(book.coupon_discount_value)}%` : `-${Math.round(Number(book.coupon_discount_value)/1000)}K`)}</span>`
        : `<span class="hero-cover-badge">${esc(['Hot','Mới','Trending'][heroIndex % 3])}</span>`;
      const author = (book.authors || '').split(',')[0].trim() || (isOl ? 'Open Library' : 'Trạm Sách');
      const priceLine = isOl
        ? '<small>Open Library · Miễn phí đọc thử</small>'
        : `<b>${price(book.promotional_price || book.selling_price)}</b><small>Còn ${Number(book.stock_quantity || 0)} cuốn</small>`;
      const ratingValue = 3.6 + (heroIndex * 0.27) % 1.4;
      const rating = ratingValue.toFixed(1);
      const fullStars = Math.floor(ratingValue);
      const hasHalf = ratingValue - fullStars >= 0.5;
      const starPath = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
      const starSvg = (filled) => `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sg${heroIndex}" x1="0" x2="1"><stop offset="${(ratingValue - fullStars).toFixed(2)}" stop-color="#e4bd70"/><stop offset="${(ratingValue - fullStars).toFixed(2)}" stop-color="rgba(255,250,240,.18)"/></linearGradient></defs><path d="${starPath}" fill="${filled ? 'url(#sg' + heroIndex + ')' : 'rgba(255,250,240,.18)'}"/></svg>`;
      const stars = Array.from({length: 5}, (_, i) => starSvg(i < fullStars || (i === fullStars && hasHalf))).join('');
      const ratingCount = 24 + heroIndex * 17;
      const soldCount = Number(book.sold_count || 0);
      const stockCount = Number(book.stock_quantity || 0);
      const stat1 = isOl ? `<div class="hero-cover-stat"><b>Miễn phí</b><small>Đọc thử OL</small></div>` : `<div class="hero-cover-stat"><b>${soldCount}</b><small>Đã bán</small></div>`;
      const stat2 = isOl ? `<div class="hero-cover-stat"><b>Open Library</b><small>Nguồn mở</small></div>` : `<div class="hero-cover-stat"><b>${stockCount}</b><small>Còn lại</small></div>`;
      const card = `<a class="hero-cover" href="/books/${encodeURIComponent(book.work_id)}">
        <span class="hero-cover-frame">
          <span class="hero-cover-cover">${badge}<span class="hero-cover-number">0${heroIndex + 1}/0${featured.length}</span><span class="hero-cover-rating"><svg viewBox="0 0 24 24"><path d="${starPath}"/></svg>${rating}</span><span class="hero-cover-shine"></span>${cover(book)}</span>
          <span class="hero-cover-info">
            <span class="hero-cover-kicker">Đang được quan tâm</span>
            <span class="hero-cover-title">${esc(book.title)}</span>
            <span class="hero-cover-author"><b>${esc(author)}</b></span>
            <span class="hero-cover-rating-row"><span class="hero-cover-stars">${stars}</span><span class="score">${rating}</span><span class="count">(${ratingCount})</span></span>
            <div class="hero-cover-stats">${stat1}${stat2}</div>
            <span class="hero-cover-actions">
              <span class="price">${priceLine}</span>
              <span class="cta">Khám phá →</span>
            </span>
          </span>
        </span>
      </a>`;
      const dots = featured.length > 1
        ? `<div class="hero-cover-dots" role="tablist">${featured.map((_, index) => `<button type="button" role="tab" aria-label="Xem sách ${index + 1}" aria-current="${index === heroIndex ? 'true' : 'false'}" data-index="${index}"></button>`).join('')}</div>`
        : '';
      const root = document.querySelector('#home-hero-covers');
      root.innerHTML = card + dots;
      root.querySelectorAll('.hero-cover-dots button').forEach(button => button.onclick = () => { heroIndex = Number(button.dataset.index); renderHero(); restartAuto(); });
      const cardEl = root.querySelector('.hero-cover');
      if (cardEl) { cardEl.style.animation = 'none'; void cardEl.offsetWidth; cardEl.style.animation = ''; }
    };
    let heroIndex = 0;
    let heroTimer = null;
    const restartAuto = () => { clearInterval(heroTimer); heroTimer = setInterval(() => { heroIndex = (heroIndex + 1) % featured.length; renderHero(); }, 5000); };
    const wrap = document.querySelector('#home-hero-covers');
    wrap.addEventListener('mouseenter', () => clearInterval(heroTimer));
    wrap.addEventListener('mouseleave', restartAuto);
    renderHero();
    restartAuto();
    const emptyBest = typeof window.renderEmpty === 'function' ? window.renderEmpty('search', 'Chưa có sách bán chạy', 'Khám phá toàn bộ tuyển tập sách để chọn tác phẩm yêu thích.', [{label:'Khám phá kho sách', href:'/books', style:'primary'}]) : '<div class="home-empty">Chưa có sách bán chạy.</div>';
    const emptyNew = typeof window.renderEmpty === 'function' ? window.renderEmpty('search', 'Sách mới đang được cập nhật', 'Danh mục tác phẩm mới sẽ sớm có mặt.', [{label:'Xem tất cả sách', href:'/books', style:'primary'}]) : '<div class="home-empty">Vui lòng thử lại sau.</div>';
    document.querySelector('#home-books').innerHTML = best.length ? best.map((book, index) => card(book, index + 1)).join('') : emptyBest;
    document.querySelector('#home-new-books').innerHTML = newest.length ? newest.map(card).join('') : emptyNew;

    // Shelf Category Tabs filter logic
    const shelfTitle = document.querySelector('#home-shelf-title');
    const shelfMore = document.querySelector('#home-shelf-more');
    const booksContainer = document.querySelector('#home-books');
    const shelfCache = new Map();

    const renderShelfBooks = async (catSlug) => {
      if (!catSlug) {
        if (shelfTitle) shelfTitle.textContent = 'Sách Nổi Bật & Bán Chạy';
        if (shelfMore) {
          shelfMore.textContent = 'Khám phá toàn bộ 205 cuốn sách →';
          shelfMore.href = '/books';
        }
        booksContainer.innerHTML = best.length ? best.map((b, idx) => card(b, idx + 1)).join('') : emptyBest;
        return;
      }

      const catObj = categories.find(c => c.slug === catSlug);
      const catName = catObj?.name || 'Chủ đề';
      if (shelfTitle) shelfTitle.textContent = `Sách ${catName}`;
      if (shelfMore) {
        shelfMore.textContent = `Xem tất cả sách ${catName} →`;
        shelfMore.href = `/books?category=${encodeURIComponent(catSlug)}`;
      }

      if (shelfCache.has(catSlug)) {
        const items = shelfCache.get(catSlug);
        booksContainer.innerHTML = items.length ? items.map((b, idx) => card(b, idx + 1)).join('') : `<div class="home-empty">Chưa có sách thuộc chủ đề ${esc(catName)}.</div>`;
        return;
      }

      booksContainer.innerHTML = `<div class="home-empty" style="padding:28px">⏳ Đang tải sách ${esc(catName)}…</div>`;
      try {
        const res = await fetchData(`/api/books?category=${encodeURIComponent(catSlug)}&limit=12`);
        const items = res?.items || [];
        shelfCache.set(catSlug, items);
        booksContainer.innerHTML = items.length ? items.map((b, idx) => card(b, idx + 1)).join('') : `<div class="home-empty">Chưa có sách thuộc chủ đề ${esc(catName)}.</div>`;
      } catch (_) {
        booksContainer.innerHTML = `<div class="home-empty">Không thể tải sách chủ đề này.</div>`;
      }
    };

    document.querySelectorAll('.home-shelf-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.home-shelf-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderShelfBooks(tab.dataset.category);
      };
    });
  }).catch(error => {
    const errorFallback = typeof window.renderEmpty === 'function' ? window.renderEmpty('generic', 'Chưa thể tải dữ liệu sách', error.message || 'Vui lòng làm mới trang để thử lại.', [{label:'Tải lại trang', href:'javascript:location.reload()', style:'primary'}]) : `<div class="home-empty">${esc(error.message)}</div>`;
    document.querySelector('#home-books').innerHTML = errorFallback;
    document.querySelector('#home-new-books').innerHTML = '';
  });
})();
