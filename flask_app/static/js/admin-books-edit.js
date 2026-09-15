/* Adds edit controls to the manual MySQL book-management table. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const request = async (url, options = {}) => { const response = await fetch(url, {headers:{'Content-Type':'application/json'}, ...options}); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || 'Kh\u00f4ng th\u1ec3 l\u01b0u d\u1eef li\u1ec7u.'); return payload.data; };
  const v = text => text;
  function form(book) {
    const old = document.querySelector('#edit-book-slot'); if (old) old.remove();
    const slot = document.createElement('div'); slot.id = 'edit-book-slot'; slot.className = 'panel form-card mb-4';
    slot.innerHTML = `<h3>Ch\u1ec9nh s\u1eeda: ${esc(book.title)}</h3><form id="edit-book-form"><div class="row"><label class="col-md-4">M\u00e3 s\u00e1ch<input value="${esc(book.work_id)}" disabled></label><label class="col-md-8">T\u00ean s\u00e1ch *<input name="title" value="${esc(book.title)}" required></label><label class="col-md-6">T\u00e1c gi\u1ea3 *<input name="authors" value="${esc(book.authors)}" required></label><label class="col-md-6">URL \u1ea3nh b\u00eca<input name="coverUrl" type="url" value="${esc(book.cover_url || '')}"></label><label class="col-md-4">S\u1ed1 l\u01b0\u1ee3ng t\u1ed3n<input name="stockQuantity" type="number" min="0" value="${book.stock_quantity}" required></label><label class="col-md-4">T\u1ed3n t\u1ed1i thi\u1ec3u<input name="minimumStock" type="number" min="0" value="${book.minimum_stock}" required></label><label class="col-md-4">L\u00fd do ch\u1ec9nh s\u1eeda<input name="reason" value="C\u1eadp nh\u1eadt th\u00f4ng tin s\u00e1ch"></label></div><div id="edit-message"></div><button class="btn-brand">L\u01b0u thay \u0111\u1ed5i</button> <button type="button" class="pill light" id="cancel-edit">H\u1ee7y</button></form>`;
    document.querySelector('.admin-content').insertBefore(slot, document.querySelector('.admin-content').querySelector('.panel.table-responsive'));
    document.querySelector('#cancel-edit').onclick = () => slot.remove();
    document.querySelector('#edit-book-form').onsubmit = async event => { event.preventDefault(); try { await request(`/api/admin/data/books/${encodeURIComponent(book.work_id)}`, {method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))}); document.querySelector('#edit-message').innerHTML='<p class="message">\u0110\u00e3 c\u1eadp nh\u1eadt s\u00e1ch v\u00e0 t\u1ed3n kho.</p>'; setTimeout(() => location.reload(), 450); } catch (error) { document.querySelector('#edit-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`; } };
  }
  async function addEditControls() {
    if (document.body.dataset.page !== 'admin' || document.body.dataset.module !== 'books') return;
    const books = await request('/api/admin/data/books');
    const table = document.querySelector('.admin-table'); if (!table) return;
    const header = table.querySelector('tr');
    if (!header.querySelector('.book-actions')) { const th=document.createElement('th'); th.className='book-actions'; th.textContent='Thao t\u00e1c'; header.append(th); }
    const rows = [...table.querySelectorAll('tr')].slice(1);
    rows.forEach((row,index) => { if (row.querySelector('.edit-book')) return; const td=document.createElement('td'); const button=document.createElement('button'); button.className='pill light edit-book'; button.type='button'; button.textContent='Ch\u1ec9nh s\u1eeda'; button.onclick=()=>form(books[index]); td.append(button); row.append(td); });
  }
  setTimeout(() => addEditControls().catch(console.error), 1050);
})();
