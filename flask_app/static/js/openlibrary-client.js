/* Browser-side Open Library search. Flask/MySQL remains the fallback. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const card = book => { const cover = book.cover ? `<img src="${esc(book.cover)}" alt="Bia sach ${esc(book.title)}">` : `<div class="cover-placeholder">${esc(book.title?.slice(0,1)||'T')}</div>`; return `<a class="book-card" href="/books/${encodeURIComponent(book.workId)}">${cover}<h3>${esc(book.title)}</h3><p>${esc((book.authors||[]).join(', ') || 'Chua ro tac gia')}</p></a>`; };
  async function localSearch(query) { const response = await fetch(`/api/books?q=${encodeURIComponent(query)}`); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || 'Khong the tim sach.'); return payload.data; }
  async function openLibrarySearch(query) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=24&fields=key,title,author_name,cover_i,first_publish_year`;
    const response = await fetch(url, {headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('Open Library khong phan hoi.');
    const raw = await response.json();
    return {total: raw.numFound || 0, items: (raw.docs || []).map(item => ({workId:(item.key||'').split('/').pop(),title:item.title || 'Khong ro ten',authors:item.author_name || [],cover:item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null}))};
  }
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form.id !== 'catalog-search') return;
    event.preventDefault(); event.stopImmediatePropagation();
    const query = document.querySelector('#catalog-query').value.trim(); if (!query) return;
    const area = document.querySelector('#catalog-results'); const label = document.querySelector('#catalog-label');
    area.innerHTML = '<p class="loading">Dang tim tren Open Library...</p>';
    try {
      const data = await openLibrarySearch(query);
      label.textContent = `Open Library: ${Number(data.total).toLocaleString('vi-VN')} ket qua cho "${query}"`;
      area.innerHTML = data.items.length ? data.items.map(card).join('') : '<div class="panel form-card">Khong tim thay sach phu hop.</div>';
    } catch (_) {
      try { const data = await localSearch(query); label.textContent = `Kho MySQL: ket qua cho "${query}"`; area.innerHTML = data.items.map(card).join('') || '<div class="panel form-card">Khong tim thay sach trong kho.</div>'; }
      catch (error) { area.innerHTML = `<div class="message error">${esc(error.message)}</div>`; }
    }
  }, true);
})();
