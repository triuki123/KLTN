(() => {
  const root = document.querySelector('#app');
  const page = document.body.dataset.page;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const get = async url => { const response = await fetch(url,{headers:{Accept:'application/json'}}); const body = await response.json(); if (!response.ok || !body.success) throw new Error('load'); return body.data; };
  const cover = (url,title) => url ? `<img src="${esc(url)}" alt="B\u00eca s\u00e1ch ${esc(title)}" loading="lazy">` : `<div class="cover-placeholder">${esc(String(title || 'T').slice(0,1))}</div>`;
  const couponRibbon = book => {
    if (!book.coupon_code || !book.coupon_discount_type) return '';
    const value = Number(book.coupon_discount_value || 0);
    const discount = book.coupon_discount_type === 'PERCENT' ? `-${value.toLocaleString('vi-VN')}%` : `-${Math.round(value / 1000).toLocaleString('vi-VN')}K`;
    return `<span class="coupon-ribbon" title="D\u00f9ng m\u00e3 ${esc(book.coupon_code)}">M\u00c3 ${esc(discount)}</span>`;
  };
  const cards = books => books.map(book => `<a class="book-card" href="/books/${encodeURIComponent(book.workId || book.work_id)}">${couponRibbon(book)}${cover(book.cover || book.cover_url,book.title)}<h3>${esc(book.title)}</h3><p>${esc(Array.isArray(book.authors) ? book.authors.join(', ') : book.authors)}</p>${book.year ? `<small>Xu\u1ea5t b\u1ea3n: ${esc(book.year)}</small>` : ''}${book.stock_quantity != null ? `<small>C\u00f2n ${esc(book.stock_quantity)} cu\u1ed1n</small>` : ''}</a>`).join('');

  async function showBooks() {
    const params = new URLSearchParams(location.search);
    const category = params.get('category') || '';
    const initialQuery = params.get('q') || '';
    const categoryLabels = {"van-hoc":"V\u0103n h\u1ecdc","kinh-te-kinh-doanh":"Kinh t\u1ebf - Kinh doanh","ky-nang-song":"K\u1ef9 n\u0103ng s\u1ed1ng","tam-ly-giao-duc":"T\u00e2m l\u00fd - Gi\u00e1o d\u1ee5c","khoa-hoc-cong-nghe":"Khoa h\u1ecdc - C\u00f4ng ngh\u1ec7","thieu-nhi":"Thi\u1ebfu nhi"};
    const categoryText = categoryLabels[category] || category.replaceAll('-', ' ');
    root.innerHTML = `<section class="shell"><span class="eyebrow">Kho s\u00e1ch &middot; Open Library</span><div class="section-head"><div><h1 class="page-title">${category ? `Danh m\u1ee5c: ${esc(categoryText)}` : 'Kh\u00e1m ph\u00e1 kho s\u00e1ch'}</h1><p>T\u00ecm ki\u1ebfm to\u00e0n b\u1ed9 kho d\u1eef li\u1ec7u m\u1edf c\u1ee7a Open Library, theo t\u1eebng trang nh\u1eb9 nh\u00e0ng.</p></div></div><form class="search" id="catalog-search"><input id="catalog-query" value="${esc(initialQuery || categoryText)}" placeholder="T\u00ean s\u00e1ch, t\u00e1c gi\u1ea3 ho\u1eb7c ISBN" autocomplete="off"><button class="btn-brand">T\u00ecm s\u00e1ch</button></form><div class="section-head mt-5"><span id="catalog-label" class="eyebrow">G\u1ee3i \u00fd s\u00e1ch c\u00f3 s\u1eb5n</span><a class="pill light" href="/categories">Xem danh m\u1ee5c</a></div><div id="catalog-results" class="book-grid"><p class="loading">\u0110ang t\u1ea3i s\u00e1ch\u2026</p></div><div id="catalog-more" class="text-center mt-4"></div></section>`;
    const results = document.querySelector('#catalog-results');
    const label = document.querySelector('#catalog-label');
    const more = document.querySelector('#catalog-more');
    let activeQuery = initialQuery || categoryText;
    let usingCategory = Boolean(category && !initialQuery);
    let currentPage = 1;
    let total = 0;
    let displayed = 0;

    const drawMore = () => {
      const canLoad = activeQuery && displayed < total;
      more.innerHTML = canLoad ? `<button id="load-more-books" class="pill light">Xem th\u00eam s\u00e1ch (${Math.max(0,total-displayed).toLocaleString('vi-VN')} c\u00f2n l\u1ea1i)</button>` : '';
      const button = document.querySelector('#load-more-books');
      if (button) button.addEventListener('click', () => load(false));
    };
    const load = async reset => {
      if (!activeQuery) return;
      if (reset) { currentPage = 1; displayed = 0; results.innerHTML = '<p class="loading">\u0110ang t\u00ecm trong Open Library\u2026</p>'; more.innerHTML = ''; }
      else { const button = document.querySelector('#load-more-books'); if (button) { button.disabled = true; button.textContent = '\u0110ang t\u1ea3i th\u00eam\u2026'; } }
      try {
        const endpoint = usingCategory ? `/api/category-books/${encodeURIComponent(category)}?page=${currentPage}&limit=36` : `/api/books?q=${encodeURIComponent(activeQuery)}&page=${currentPage}&limit=36`;
        let data = await get(endpoint);
        if (usingCategory && !(data.items || []).length) {
          data = await get(`/api/books?q=${encodeURIComponent(categoryText)}&page=${currentPage}&limit=36`);
        }
        const items = data.items || [];
        total = Number(data.total || 0);
        if (reset) results.innerHTML = items.length ? cards(items) : '<div class="panel form-card">Kh\u00f4ng t\u00ecm th\u1ea5y s\u00e1ch ph\u00f9 h\u1ee3p.</div>';
        else results.insertAdjacentHTML('beforeend', cards(items));
        displayed += items.length;
        label.textContent = `${String(data.source || '').startsWith('openlibrary') ? 'Open Library' : 'Kho s\u00e1ch n\u1ed9i b\u1ed9'} \u00b7 Hi\u1ec3n th\u1ecb ${displayed.toLocaleString('vi-VN')} / ${total.toLocaleString('vi-VN')} k\u1ebft qu\u1ea3`;
        if (items.length) currentPage += 1;
        drawMore();
      } catch (_) { results.innerHTML = '<div class="message error">Ch\u01b0a th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u. Vui l\u00f2ng th\u1eed l\u1ea1i.</div>'; }
    };
    document.querySelector('#catalog-search').addEventListener('submit', event => { event.preventDefault(); activeQuery = document.querySelector('#catalog-query').value.trim(); usingCategory = false; if (activeQuery) load(true); });
    if (activeQuery) load(true);
    else {
      get('/api/home?limit=30').then(books => { results.innerHTML = books.length ? cards(books) : '<div class="panel form-card">Ch\u01b0a c\u00f3 s\u00e1ch trong kho.</div>'; label.textContent = 'G\u1ee3i \u00fd t\u1eeb kho s\u00e1ch c\u1ee7a Tr\u1ea1m S\u00e1ch'; }).catch(() => { results.innerHTML = '<div class="message error">Ch\u01b0a th\u1ec3 t\u1ea3i s\u00e1ch.</div>'; });
    }
  }

  async function showCategories() {
    root.innerHTML = `<section class="shell"><span class="eyebrow">Kh\u00e1m ph\u00e1 theo ch\u1ee7 \u0111\u1ec1</span><h1 class="page-title">Danh m\u1ee5c s\u00e1ch</h1><p>Ch\u1ecdn m\u1ed9t danh m\u1ee5c \u0111\u1ec3 b\u1eaft \u0111\u1ea7u t\u00ecm trong kho s\u00e1ch m\u1edf.</p><div id="category-grid" class="book-grid"><p class="loading">\u0110ang t\u1ea3i danh m\u1ee5c\u2026</p></div></section>`;
    const area = document.querySelector('#category-grid');
    try {
      const categories = await get('/api/categories');
      area.innerHTML = categories.length ? categories.map(category => {
        const target = `/books?category=${encodeURIComponent(category.slug)}`;
        return `<a class="panel form-card category-card" href="${target}" data-category-target="${target}" aria-label="Xem s\u00e1ch danh m\u1ee5c ${esc(category.name)}"><span class="eyebrow">Danh m\u1ee5c</span><h3>${esc(category.name)}</h3><p>${esc(category.description || 'Kh\u00e1m ph\u00e1 s\u00e1ch theo ch\u1ee7 \u0111\u1ec1 n\u00e0y.')}</p><b>Xem s\u00e1ch &rarr;</b></a>`;
      }).join('') : '<div class="panel form-card">Ch\u01b0a c\u00f3 danh m\u1ee5c.</div>';
      area.addEventListener('click', event => {
        const card = event.target.closest('.category-card');
        if (!card) return;
        event.preventDefault();
        window.location.assign(card.dataset.categoryTarget);
      });
    } catch (_) { area.innerHTML = '<div class="message error">Ch\u01b0a th\u1ec3 t\u1ea3i danh m\u1ee5c.</div>'; }
  }
  if (page === 'books') showBooks();
  if (page === 'categories') showCategories();
})();
