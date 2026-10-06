(() => {
  const form = document.querySelector('#header-search');
  if (!form) return;
  const input = form.querySelector('input[name="q"]');
  const panel = document.querySelector('#header-search-panel');
  if (!input || !panel) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  let timer = 0;
  let controller = null;
  let activeIndex = -1;

  const setOpen = open => {
    panel.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) activeIndex = -1;
  };
  const state = (message, loading = false) => {
    panel.innerHTML = `<div class="search-flow-state" role="status">${loading ? '<i class="search-flow-spinner" aria-hidden="true"></i>' : ''}<span>${esc(message)}</span></div>`;
    setOpen(true);
  };
  const items = () => [...panel.querySelectorAll('[role="option"]')];
  const selectAt = index => {
    const options = items();
    if (!options.length) return;
    activeIndex = (index + options.length) % options.length;
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === activeIndex)));
    options[activeIndex].scrollIntoView({ block: 'nearest' });
  };

  const render = (books, query) => {
    if (!books.length) {
      state(`Không tìm thấy sách phù hợp với “${query}”. Hãy thử tên tác giả hoặc từ khóa khác.`);
      return;
    }
    panel.innerHTML = books.slice(0, 6).map((book, index) => {
      const workId = book.workId || book.work_id;
      const authors = Array.isArray(book.authors) ? book.authors.join(', ') : book.authors || 'Chưa rõ tác giả';
      const cover = book.cover || book.cover_url;
      return `<a class="search-flow-item" role="option" aria-selected="false" id="search-option-${index}" href="/books/${encodeURIComponent(workId)}">${cover ? `<img class="search-flow-cover" src="${esc(cover)}" alt="" loading="lazy">` : '<span class="search-flow-cover"></span>'}<span class="search-flow-copy"><strong>${esc(book.title)}</strong><small>${esc(authors)}</small></span><span class="search-flow-arrow" aria-hidden="true">→</span></a>`;
    }).join('') + `<a class="search-flow-all" href="/books?q=${encodeURIComponent(query)}">Xem tất cả kết quả cho “${esc(query)}” →</a>`;
    setOpen(true);
  };

  const search = async query => {
    controller?.abort();
    controller = new AbortController();
    state(`Đang tìm “${query}”…`, true);
    try {
      const response = await fetch(`/api/books?q=${encodeURIComponent(query)}&page=1&limit=6`, { headers: { Accept: 'application/json' }, signal: controller.signal });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error();
      render(payload.data?.items || [], query);
    } catch (error) {
      if (error.name !== 'AbortError') state('Chưa thể tải gợi ý. Bạn vẫn có thể nhấn Enter để tìm kiếm.');
    }
  };

  input.addEventListener('input', () => {
    const query = input.value.trim();
    window.clearTimeout(timer);
    controller?.abort();
    if (!query) { setOpen(false); return; }
    if (query.length < 2) { state('Nhập thêm ít nhất 1 ký tự để xem gợi ý.'); return; }
    state('Đang nhập…');
    timer = window.setTimeout(() => search(query), 280);
  });
  input.addEventListener('focus', () => {
    if (input.value.trim() && panel.innerHTML) setOpen(true);
  });
  input.addEventListener('keydown', event => {
    if (panel.hidden) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); selectAt(activeIndex + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); selectAt(activeIndex - 1); }
    else if (event.key === 'Escape') { setOpen(false); }
    else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      items()[activeIndex]?.click();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!form.contains(event.target)) setOpen(false);
  });
})();
