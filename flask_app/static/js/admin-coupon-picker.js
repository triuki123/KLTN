(() => {
  if (document.body.dataset.module !== 'coupons') return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
  let assigned=new Set();
  const markAssigned=()=>document.querySelectorAll('.coupon-picker-item').forEach(item=>{const input=item.querySelector('input'),used=assigned.has(input.value);input.disabled=false;item.classList.toggle('has-coupon',used);if(used&&!item.dataset.marked){item.dataset.marked='1';item.querySelector('small').textContent+=' · Đã có mã khác (vẫn có thể chọn)'}});
  fetch('/api/admin/data/coupons').then(response=>response.json()).then(body=>{(body.data||[]).forEach(coupon=>String(coupon.work_ids||'').split(',').filter(Boolean).forEach(id=>assigned.add(id)));markAssigned()}).catch(()=>{});
  const enhance=()=>{
    const select=document.querySelector('#coupon-form select[name="workIds"]');
    if(!select||select.dataset.enhanced)return;
    const typeInput=document.querySelector('#coupon-form select[name="discountType"]');
    if(typeInput&&!typeInput.querySelector('[value="FREE_SHIPPING"]'))typeInput.insertAdjacentHTML('beforeend','<option value="FREE_SHIPPING">Miễn phí vận chuyển</option>');
    const valueInput=document.querySelector('#coupon-form input[name="discountValue"]'),maximumInput=document.querySelector('#coupon-form input[name="maximumDiscount"]');
    const syncType=()=>{const freeShip=typeInput?.value==='FREE_SHIPPING';if(valueInput){valueInput.required=!freeShip;valueInput.disabled=freeShip;valueInput.value=freeShip?'0':valueInput.value;valueInput.closest('label').hidden=freeShip}if(maximumInput)maximumInput.closest('label').hidden=freeShip};
    if(typeInput){typeInput.addEventListener('change',syncType);syncType()}
    select.dataset.enhanced='1';select.hidden=true;select.required=false;
    const wrapper=document.createElement('div');wrapper.className='coupon-picker';
    wrapper.innerHTML=`<div class="coupon-picker-toolbar"><input type="search" placeholder="Tìm tên sách hoặc tác giả…" autocomplete="off"><span>Đã chọn <b>0</b> sản phẩm</span></div><div class="coupon-picker-list">${[...select.options].map(option=>{const parts=option.textContent.split(' — ');return `<label class="coupon-picker-item" data-search="${esc(normalize(option.textContent))}"><input type="checkbox" value="${esc(option.value)}"><i><svg class="ui-icon" aria-hidden="true"><use href="/static/icons/ui-icons.svg#check"></use></svg></i><span><b>${esc(parts[0])}</b><small>${esc(parts.slice(1).join(' — ')||'Chưa rõ tác giả')}</small></span></label>`}).join('')}</div><small class="coupon-picker-help">Nhấn vào sản phẩm chưa áp dụng mã để chọn — không cần giữ Ctrl.</small>`;
    select.after(wrapper);
    const count=wrapper.querySelector('.coupon-picker-toolbar b');
    const sync=()=>{const checked=[...wrapper.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);[...select.options].forEach(option=>option.selected=checked.includes(option.value));count.textContent=checked.length};
    wrapper.querySelectorAll('input[type="checkbox"]').forEach(input=>input.onchange=sync);
    wrapper.querySelector('input[type="search"]').oninput=event=>{const query=normalize(event.target.value.trim());wrapper.querySelectorAll('.coupon-picker-item').forEach(item=>item.hidden=Boolean(query&&!item.dataset.search.includes(query)))};
    markAssigned();
    select.closest('label')?.querySelector('small:last-child')?.remove();
  };
  const observer=new MutationObserver(enhance);observer.observe(document.querySelector('#app'),{childList:true,subtree:true});enhance();
})();
