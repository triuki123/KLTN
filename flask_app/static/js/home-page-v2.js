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

  const cover = book => book.cover_url
    ? `<img src="${esc(book.cover_url)}" alt="Bìa sách ${esc(book.title)}" loading="lazy">`
    : `<div class="cover-placeholder">${esc(String(book.title || 'S').charAt(0))}</div>`;

  const couponRibbon = book => {
    if (!book.coupon_code || !book.coupon_discount_type) return '';
    const value = Number(book.coupon_discount_value || 0);
    const discount = book.coupon_discount_type === 'FREE_SHIPPING'
      ? 'FREESHIP'
      : book.coupon_discount_type === 'PERCENT'
      ? `-${value.toLocaleString('vi-VN')}%`
      : `-${Math.round(value / 1000).toLocaleString('vi-VN')}K`;
    return `<span class="coupon-ribbon" title="Dùng mã ${esc(book.coupon_code)}">MÃ ${esc(discount)}</span>`;
  };

  const categoryIcon = slug => ({
    'van-hoc': '✦', 'kinh-te-kinh-doanh': '↗', 'ky-nang-song': '◌',
    'tam-ly-giao-duc': '◈', 'khoa-hoc-cong-nghe': '⌘', 'thieu-nhi': '☼'
  }[slug] || '◉');

  const categoryCard = category => `<a class="home-category-card" href="/books?category=${encodeURIComponent(category.slug)}">
    <span class="home-category-icon" aria-hidden="true">${categoryIcon(category.slug)}</span>
    <span><b>${esc(category.name)}</b><small>${esc(category.description || 'Khám phá tuyển chọn sách')}</small></span><i aria-hidden="true">→</i>
  </a>`;

  const card = (book, rank = 0) => {
    const local = book.source !== 'openlibrary';
    const current = Number(book.promotional_price || book.selling_price || 0);
    return `<article class="book-card quick-book-card" data-work-id="${esc(book.work_id)}" data-title="${esc(book.title)}">
      <div class="quick-cover-wrap">
        ${rank ? `<span class="book-rank" aria-label="Hạng ${rank}">#${rank}</span>` : ''}
        ${couponRibbon(book)}
        <div class="book-card-cover-wrap">
          <a href="/books/${encodeURIComponent(book.work_id)}">${cover(book)}<span class="book-card-shine"></span></a>
          <div class="book-card-quickview"><span class="rating"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${(3.6 + (rank ? rank * 0.27 : 0) % 1.4).toFixed(1)}</span><a class="view-link" href="/books/${encodeURIComponent(book.work_id)}">Xem</a></div>
        </div>
        <div class="quick-actions"><button type="button" class="quick-cart">Giỏ hàng</button><button type="button" class="quick-buy">Mua ngay</button></div>
      </div>
      <a class="quick-book-info" href="/books/${encodeURIComponent(book.work_id)}"><h3>${esc(book.title)}</h3><p>${esc(book.authors || 'Chưa rõ tác giả')}</p>${local ? `<b>${price(current)}</b><small>Còn ${Number(book.stock_quantity || 0)} cuốn</small>` : '<small>Khám phá từ Open Library</small>'}</a>
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
    <section class="home-section-v2"><div class="home-section-head"><div><span class="eyebrow">Bắt đầu từ điều bạn quan tâm</span><h2>Khám phá theo chủ đề</h2></div><a class="pill light" href="/categories">Xem tất cả danh mục</a></div><div id="home-categories" class="home-chips"><span class="home-chip">Đang tải chủ đề…</span></div></section>
    <section class="home-section-v2"><div class="home-section-head"><div><span class="eyebrow">Tuyển chọn hôm nay</span><h2>Khám phá nhiều chủ đề</h2></div><a class="section-link" href="/books">Xem tất cả →</a></div><div id="home-books" class="home-book-rail"><div class="home-empty">Đang tải sách…</div></div></section>
    <section class="home-section-v2"><div class="home-section-head"><div><span class="eyebrow">Đọc tiếp</span><h2>Những lựa chọn khác</h2></div><a class="section-link" href="/books">Khám phá kho sách →</a></div><div id="home-new-books" class="home-book-rail"><div class="home-empty">Đang tải sách mới…</div></div></section>
    <section class="home-service-strip"><div class="home-service-inner"><div><b>Tồn kho minh bạch</b><span>Biết số lượng trước khi mua</span></div><div><b>Giao hàng toàn quốc</b><span>Miễn phí từ 299.000đ</span></div><div><b>Thanh toán linh hoạt</b><span>Hỗ trợ thanh toán khi nhận hàng</span></div><div><b>Đổi trả trong 7 ngày</b><span>Hỗ trợ khi sách có lỗi</span></div></div></section>`;

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

  const openLibraryHome = async () => {
    const queries = ['language:vie', 'subject:self_help', 'subject:business', 'subject:science', 'subject:children', 'subject:fiction'];
    const batches = await Promise.all(queries.map(query => fetchData(`/api/books?q=${encodeURIComponent(query)}&limit=8`).catch(() => ({items: []}))));
    const seen = new Set();
    const books = [];
    for (let index = 0; books.length < 24 && batches.some(batch => batch.items?.[index]); index += 1) {
      for (const batch of batches) {
        const book = batch.items?.[index];
        if (!book?.workId || seen.has(book.workId)) continue;
        seen.add(book.workId);
        books.push({work_id: book.workId, title: book.title, authors: (book.authors || []).join(', '), cover_url: book.cover || null, source: 'openlibrary', sold_count: 0});
        if (books.length === 24) break;
      }
    }
    if (!books.length) throw new Error('Open Library chưa có sách phù hợp');
    return books;
  };

  Promise.all([fetchData('/api/categories'), openLibraryHome().catch(() => fetchData('/api/home?limit=24'))]).then(([categories, books]) => {
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
    document.querySelector('#home-categories').innerHTML = categories.map(categoryCard).join('');
    document.querySelector('#home-books').innerHTML = best.length ? best.map((book, index) => card(book, index + 1)).join('') : '<div class="home-empty">Chưa có sách bán chạy.</div>';
    document.querySelector('#home-new-books').innerHTML = newest.length ? newest.map(card).join('') : '<div class="home-empty">Vui lòng thử lại sau.</div>';
  }).catch(error => {
    document.querySelector('#home-books').innerHTML = `<div class="home-empty">${esc(error.message)}</div>`;
    document.querySelector('#home-new-books').innerHTML = '<div class="home-empty">Vui lòng thử lại sau.</div>';
  });
})();
