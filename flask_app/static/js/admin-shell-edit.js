/* Edit controls for every row in the single-pass Books admin screen. */
(() => {
  if (document.body.dataset.module !== 'books') return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const api = async (url, options = {}) => { const response = await fetch(url, {headers:{'Content-Type':'application/json'}, ...options}); const payload=await response.json(); if(!response.ok || !payload.success) throw new Error(payload.message || 'Kh\u00f4ng th\u1ec3 l\u01b0u d\u1eef li\u1ec7u.'); return payload.data; };
  async function openEdit(book) {
    document.querySelector('#edit-panel')?.remove();
    const panel=document.createElement('section'); panel.id='edit-panel'; panel.className='panel form-card mb-4';
    panel.innerHTML=`<h3>Ch\u1ec9nh s\u1eeda s\u00e1ch: ${esc(book.title)}</h3><form id="edit-form"><div class="row"><label class="col-md-4">M\u00e3 s\u00e1ch<input value="${esc(book.work_id)}" disabled></label><label class="col-md-8">T\u00ean s\u00e1ch *<input name="title" value="${esc(book.title)}" required></label><label class="col-md-6">T\u00e1c gi\u1ea3 *<input name="authors" value="${esc(book.authors)}" required></label><label class="col-md-6">URL \u1ea3nh b\u00eca<input name="coverUrl" value="${esc(book.cover_url || '')}"></label><label class="col-md-4">S\u1ed1 l\u01b0\u1ee3ng t\u1ed3n<input name="stockQuantity" type="number" min="0" value="${book.stock_quantity}" required></label><label class="col-md-4">T\u1ed3n t\u1ed1i thi\u1ec3u<input name="minimumStock" type="number" min="0" value="${book.minimum_stock}" required></label><label class="col-md-4">L\u00fd do thay \u0111\u1ed5i<input name="reason" value="C\u1eadp nh\u1eadt th\u00f4ng tin s\u00e1ch"></label></div><div id="edit-message"></div><button class="btn-brand">L\u01b0u thay \u0111\u1ed5i</button> <button id="close-edit" type="button" class="pill light">H\u1ee7y</button></form>`;
    document.querySelector('.admin-table').parentElement.before(panel);
    document.querySelector('#close-edit').onclick=()=>panel.remove();
    document.querySelector('#edit-form').onsubmit=async event=>{event.preventDefault();try{await api(`/api/admin/data/books/${encodeURIComponent(book.work_id)}`,{method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});document.querySelector('#edit-message').innerHTML='<p class="message">\u0110\u00e3 l\u01b0u thay \u0111\u1ed5i v\u00e0 l\u1ecbch s\u1eed kho.</p>';setTimeout(()=>location.reload(),350)}catch(error){document.querySelector('#edit-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`}};
  }
  async function bind() {
    const table=document.querySelector('.admin-table'); if(!table || table.dataset.editBound) return;
    table.dataset.editBound='1'; const books=await api('/api/admin/data/books'); const head=table.querySelector('tr'); const actionHead=document.createElement('th');actionHead.textContent='Thao t\u00e1c';head.append(actionHead);
    [...table.querySelectorAll('tr')].slice(1).forEach((row,index)=>{const cell=document.createElement('td');const button=document.createElement('button');button.className='pill light';button.type='button';button.textContent='Ch\u1ec9nh s\u1eeda';button.onclick=()=>openEdit(books[index]);cell.append(button);row.append(cell)});
  }
  const observer=new MutationObserver(()=>bind().catch(console.error)); observer.observe(document.querySelector('#app'),{childList:true,subtree:true}); bind().catch(()=>{});
})();
