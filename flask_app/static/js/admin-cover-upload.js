/* Local cover-image upload for both add and edit book forms. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function upload(file) {
    const form = new FormData(); form.append('image', file);
    const response = await fetch('/api/admin/upload-cover', {method:'POST', body:form});
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Kh\u00f4ng th\u1ec3 t\u1ea3i \u1ea3nh l\u00ean.');
    return payload.data.url;
  }
  function attach(form) {
    if (!form || form.dataset.coverUpload) return;
    const urlInput = form.querySelector('[name="coverUrl"]'); if (!urlInput) return;
    form.dataset.coverUpload='1';
    const urlLabel = urlInput.closest('label');
    urlLabel.classList.remove('col-md-6'); urlLabel.classList.add('col-md-3');
    const block = document.createElement('label'); block.className='col-md-3';
    block.innerHTML=`T\u1ea3i \u1ea3nh b\u00eca t\u1eeb m\u00e1y<input name="coverFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small class="d-block mt-2">PNG, JPG, WEBP hoặc GIF · tối đa 5 MB</small><span class="cover-preview"></span>`;
    urlLabel.after(block);
    const fileInput=block.querySelector('input'); const preview=block.querySelector('.cover-preview');
    fileInput.onchange=async()=>{const file=fileInput.files[0];if(!file)return;preview.textContent='Đang tải ảnh…';try{const url=await upload(file);urlInput.value=url;preview.innerHTML=`<img src="${esc(url)}" alt="Xem trước ảnh bìa" style="width:72px;height:94px;object-fit:cover;border-radius:8px;margin-top:8px"> <span>Đã tải ảnh thành công.</span>`}catch(error){preview.innerHTML=`<span class="text-danger">${esc(error.message)}</span>`;fileInput.value=''}};
  }
  const observe=()=>{attach(document.querySelector('#new-book'));attach(document.querySelector('#edit-form'));};
  new MutationObserver(observe).observe(document.querySelector('#app'),{childList:true,subtree:true}); observe();
})();
