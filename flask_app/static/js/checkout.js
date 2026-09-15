(() => {
  const root = document.querySelector('#app');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))}đ`;
  const api = async (url, options = {}) => {
    const response = await fetch(url, {credentials:'same-origin', headers:{'Content-Type':'application/json'}, ...options});
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.message || 'Không thể xử lý yêu cầu');
    return body.data;
  };
  const fullAddress = address => [address.address_line,address.ward_name,address.district_name,address.province_name].filter(Boolean).join(', ');
  const fields = (address = {}) => `<div class="checkout-fields">
    <label>Người nhận<input name="recipientName" value="${esc(address.recipient_name || '')}" required></label>
    <label>Số điện thoại<input name="phone" value="${esc(address.phone || '')}" required></label>
    <label>Tỉnh / Thành phố<input name="provinceName" value="${esc(address.province_name || '')}" required></label>
    <label>Quận / Huyện<input name="districtName" value="${esc(address.district_name || '')}" required></label>
    <label>Phường / Xã<input name="wardName" value="${esc(address.ward_name || '')}" required></label>
    <label>Địa chỉ cụ thể<input name="addressLine" value="${esc(address.address_line || '')}" required></label>
  </div>`;

  async function boot() {
    const [user, initialItems] = await Promise.all([api('/api/account'), api('/api/items/cart?selected=1')]);
    const items = initialItems;
    if (!items.length) { location.replace('/cart'); return; }
    const addresses = user.addresses || [];
    const hasDefault = addresses.some(address => Boolean(address.is_default));
    const subtotal = items.reduce((sum,item) => sum + Number(item.unit_price) * item.quantity, 0);
    const shipping = subtotal >= 299000 ? 0 : 30000;
    const savedChoices = addresses.map((address,index) => `<label class="address-choice">
      <input type="radio" name="addressMode" value="saved" data-address-id="${address.id}" ${address.is_default || (!hasDefault && index === 0) ? 'checked' : ''}>
      <span><b>${address.is_default ? 'Địa chỉ mặc định' : esc(address.recipient_name)}</b><small>${esc(address.recipient_name)} · ${esc(address.phone)}</small><p>${esc(fullAddress(address))}</p></span>
    </label>`).join('');
    root.innerHTML = `<section class="checkout-page"><span class="eyebrow">THANH TOÁN AN TOÀN</span><h1>Thông tin nhận hàng</h1><div class="checkout-grid">
      <form id="checkout-form" class="panel checkout-card"><h2>Chọn địa chỉ giao hàng</h2>
        ${addresses.length ? savedChoices : '<button class="address-empty" id="empty-address-action" type="button"><b>Chưa có địa chỉ giao hàng</b><p>Bấm vào đây để thêm địa chỉ mới.</p><span>Thêm địa chỉ →</span></button>'}
        <label class="address-choice address-choice-new"><input type="radio" name="addressMode" value="other" ${addresses.length ? '' : 'checked'}><span><b>+ Thêm địa chỉ mới</b><small>${addresses.length ? 'Giao đơn hàng này đến một địa chỉ khác' : 'Nhập thông tin người nhận và địa chỉ giao hàng'}</small></span></label>
        <div id="custom-address" ${addresses.length ? 'hidden' : ''}>${fields({recipient_name:user.full_name,phone:user.phone})}<label class="save-address"><input type="checkbox" name="saveAddress" ${addresses.length ? '' : 'checked'}> Lưu địa chỉ này vào sổ địa chỉ</label><label class="save-address"><input type="checkbox" name="makeDefault" ${addresses.length ? '' : 'checked'}> Đặt làm địa chỉ mặc định</label></div>
        <label>Phương thức thanh toán<select name="paymentMethod"><option value="COD">Thanh toán khi nhận hàng</option><option value="BANK_TRANSFER">Chuyển khoản</option></select></label>
        <div id="checkout-message"></div><button class="btn-brand" id="checkout-submit">Xác nhận đặt hàng · ${money(subtotal + shipping)}</button>
      </form>
      <aside class="panel checkout-summary"><h2>Đơn hàng của bạn</h2>${items.map(item => `<div class="checkout-product" data-work-id="${esc(item.work_id)}"><span>${esc(item.title)}<span class="quantity-picker"><button type="button" class="quantity-minus" aria-label="Giảm số lượng" ${item.quantity<=1?'disabled':''}>−</button><b class="quantity-value">${item.quantity}</b><button type="button" class="quantity-plus" aria-label="Tăng số lượng" ${item.quantity>=item.stock?'disabled':''}>+</button></span><small>Còn ${item.stock} cuốn</small></span><b class="line-total">${money(Number(item.unit_price)*item.quantity)}</b></div>`).join('')}<hr><p><span>Tạm tính</span><b id="checkout-subtotal">${money(subtotal)}</b></p><p><span>Vận chuyển</span><b id="checkout-shipping">${shipping ? money(shipping) : 'Miễn phí'}</b></p><strong><span>Tổng thanh toán</span><b id="checkout-total">${money(subtotal + shipping)}</b></strong></aside>
    </div></section>`;

    const custom = document.querySelector('#custom-address');
    const setMode = mode => { const isOther = mode === 'other'; custom.hidden = !isOther; custom.querySelectorAll('input').forEach(input => input.disabled = !isOther); };
    setMode(addresses.length ? 'saved' : 'other');
    document.querySelectorAll('[name="addressMode"]').forEach(radio => radio.onchange = () => setMode(radio.value));
    document.querySelector('#empty-address-action')?.addEventListener('click',()=>{const option=document.querySelector('[name="addressMode"][value="other"]');option.checked=true;setMode('other');custom.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>custom.querySelector('input:not([type="checkbox"])')?.focus(),350)});
    const updateTotals=()=>{const subtotalNow=items.reduce((sum,item)=>sum+Number(item.unit_price)*Number(item.quantity),0),shippingNow=subtotalNow>=299000?0:30000;document.querySelector('#checkout-subtotal').textContent=money(subtotalNow);document.querySelector('#checkout-shipping').textContent=shippingNow?money(shippingNow):'Miễn phí';document.querySelector('#checkout-total').textContent=money(subtotalNow+shippingNow);document.querySelector('#checkout-submit').textContent=`Xác nhận đặt hàng · ${money(subtotalNow+shippingNow)}`};
    document.querySelectorAll('.checkout-product').forEach(row=>{const item=items.find(entry=>entry.work_id===row.dataset.workId);const change=async delta=>{const next=Number(item.quantity)+delta;if(next<1||next>Number(item.stock))return;row.querySelectorAll('button').forEach(button=>button.disabled=true);try{const result=await api(`/api/items/cart/${encodeURIComponent(item.work_id)}`,{method:'PATCH',body:JSON.stringify({quantity:next})});item.quantity=result.quantity;row.querySelector('.quantity-value').textContent=result.quantity;row.querySelector('.line-total').textContent=money(result.lineTotal);row.querySelector('.quantity-minus').disabled=result.quantity<=1;row.querySelector('.quantity-plus').disabled=result.quantity>=result.stock;updateTotals()}catch(error){document.querySelector('#checkout-message').innerHTML=`<p class="message error">${esc(error.message)}</p>`;row.querySelectorAll('button').forEach(button=>button.disabled=false)}};row.querySelector('.quantity-minus').onclick=()=>change(-1);row.querySelector('.quantity-plus').onclick=()=>change(1)});
    document.querySelector('#checkout-form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      const selected = form.querySelector('[name="addressMode"]:checked');
      const box = document.querySelector('#checkout-message');
      data.addressMode = selected.value;
      if (selected.value === 'saved') data.addressId = selected.dataset.addressId;
      if (selected.value === 'other') data.address = [data.addressLine,data.wardName,data.districtName,data.provinceName].filter(Boolean).join(', ');
      try {
        if (selected.value === 'other' && (data.saveAddress || data.makeDefault)) await api('/api/account/addresses',{method:'POST',body:JSON.stringify({...data,isDefault:Boolean(data.makeDefault)})});
        const order = await api('/api/checkout',{method:'POST',body:JSON.stringify(data)});
        root.innerHTML = `<section class="checkout-success"><b><svg class="ui-icon" aria-hidden="true"><use href="/static/icons/ui-icons.svg#check"></use></svg></b><h1>Đặt hàng thành công</h1><p>Mã đơn: <strong>${esc(order.orderCode)}</strong></p><a class="btn-brand" href="/orders">Xem đơn hàng</a></section>`;
      } catch (error) { box.innerHTML = `<p class="message error">${esc(error.message)}</p>`; }
    };
  }
  boot().catch(() => location.replace('/login?next=/checkout'));
})();
