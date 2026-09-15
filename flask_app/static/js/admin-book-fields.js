(() => {
  if (document.body.dataset.module !== 'books') return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let books=[];
  fetch('/api/admin/data/books').then(response=>response.json()).then(body=>books=body.data||[]).catch(()=>{});
  const enhance=()=>{
    const form=document.querySelector('#edit-form');
    if(!form||form.dataset.catalogFields)return;
    form.dataset.catalogFields='1';
    const workId=form.querySelector('input:disabled')?.value;
    const book=books.find(item=>item.work_id===workId)||{};
    const row=form.querySelector('.row');
    row.insertAdjacentHTML('beforeend',`<label class="col-md-4">ISBN<input name="isbn" value="${esc(book.isbn||'')}"></label><label class="col-md-4">Nhà xuất bản<input name="publisherName" value="${esc(book.publisher_name||'')}"></label><label class="col-md-2">Năm xuất bản<input name="publicationYear" type="number" min="1000" max="2200" value="${esc(book.publication_year||'')}"></label><label class="col-md-2">Số trang<input name="pageCount" type="number" min="1" value="${esc(book.page_count||'')}"></label><label class="col-12">Mô tả<textarea name="description" rows="4">${esc(book.description||'')}</textarea></label><label class="col-md-4">Giá bán<input name="sellingPrice" type="number" min="1" value="${book.selling_price||99000}" required></label><label class="col-md-4">Giá khuyến mãi<input name="promotionalPrice" type="number" min="1" value="${book.promotional_price||''}"></label>`);
  };
  new MutationObserver(enhance).observe(document.querySelector('#app'),{childList:true,subtree:true});
})();
