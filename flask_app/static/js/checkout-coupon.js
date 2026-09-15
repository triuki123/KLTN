(() => {
  if (document.body.dataset.page !== 'checkout') return;
  const money=value=>`${Number(value||0).toLocaleString('vi-VN')}đ`;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let applied=null;
  const install=()=>{
    const summary=document.querySelector('.checkout-summary'),form=document.querySelector('#checkout-form');
    if(!summary||!form||document.querySelector('#coupon-box'))return false;
    const anchor=document.querySelector('#checkout-shipping')?.closest('p');
    anchor?.insertAdjacentHTML('afterend',`<div id="coupon-box" class="coupon-box"><div class="coupon-heading"><label for="coupon-code">Mã giảm giá</label><div class="coupon-heading-actions"><button id="remove-coupon" class="coupon-remove" type="button" hidden>Bỏ mã</button><button id="toggle-coupons" class="coupon-toggle" type="button">Xem mã khả dụng</button></div></div><div><input id="coupon-code" maxlength="50" placeholder="Nhập mã ưu đãi"><button id="apply-coupon" type="button">Áp dụng</button></div><div id="available-coupons" class="available-coupons" hidden><p>Đang tìm mã phù hợp…</p></div><p id="coupon-message"></p></div><p id="checkout-discount" hidden><span>Giảm giá</span><b></b></p>`);
    form.insertAdjacentHTML('beforeend','<input type="hidden" name="couponCode" id="checkout-coupon-code">');
    document.querySelector('#apply-coupon').onclick=apply;
    document.querySelector('#remove-coupon').onclick=removeCoupon;
    document.querySelector('#coupon-code').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();apply()}};
    document.querySelector('#toggle-coupons').onclick=toggleAvailable;
    const savedCode=sessionStorage.getItem('cartCouponCode');if(savedCode){document.querySelector('#coupon-code').value=savedCode;setTimeout(apply,0)}
    return true;
  };
  const apply=async()=>{
    const code=document.querySelector('#coupon-code').value.trim().toUpperCase(),message=document.querySelector('#coupon-message'),button=document.querySelector('#apply-coupon');
    if(!code){message.textContent='Bạn hãy nhập mã giảm giá.';message.className='error';return}
    button.disabled=true;button.textContent='Đang kiểm tra…';
    try{const response=await fetch('/api/coupons/validate',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const body=await response.json();if(!response.ok)throw new Error(body.message);applied=body.data;document.querySelector('#checkout-coupon-code').value=applied.code;document.querySelector('#remove-coupon').hidden=false;message.textContent=`Đang dùng ${applied.code}: tiết kiệm ${money(applied.discount)}`;message.className='success';render(applied)}catch(error){applied=null;document.querySelector('#checkout-coupon-code').value='';document.querySelector('#remove-coupon').hidden=true;message.textContent=error.message;message.className='error';document.querySelector('#checkout-discount').hidden=true}finally{button.disabled=false;button.textContent='Áp dụng'}};
  const render=data=>{const row=document.querySelector('#checkout-discount'),freeShip=data.discountType==='FREE_SHIPPING';row.hidden=false;row.querySelector('span').textContent=freeShip?'Miễn phí vận chuyển':'Giảm giá';row.querySelector('b').textContent=`−${money(data.discount)}`;document.querySelector('#checkout-shipping').textContent=data.shipping?'30.000đ':'Miễn phí';document.querySelector('#checkout-total').textContent=money(data.total);document.querySelector('#checkout-submit').textContent=`Xác nhận đặt hàng · ${money(data.total)}`};
  function removeCoupon(){
    applied=null;sessionStorage.removeItem('cartCouponCode');
    document.querySelector('#coupon-code').value='';document.querySelector('#checkout-coupon-code').value='';
    document.querySelector('#remove-coupon').hidden=true;document.querySelector('#checkout-discount').hidden=true;
    document.querySelector('#coupon-message').textContent='Đã bỏ mã giảm giá.';document.querySelector('#coupon-message').className='';
    const subtotal=Number(document.querySelector('#checkout-subtotal').textContent.replace(/[^\d]/g,''))||0;
    const shipping=subtotal>=299000?0:30000;
    document.querySelector('#checkout-shipping').textContent=shipping?money(shipping):'Miễn phí';
    const baseTotal=subtotal+shipping;
    document.querySelector('#checkout-total').textContent=money(baseTotal);
    document.querySelector('#checkout-submit').textContent=`Xác nhận đặt hàng · ${money(baseTotal)}`;
  }
  let couponsLoaded=false;
  async function toggleAvailable(){
    const panel=document.querySelector('#available-coupons'),toggle=document.querySelector('#toggle-coupons');
    panel.hidden=!panel.hidden;toggle.textContent=panel.hidden?'Xem mã khả dụng':'Ẩn mã giảm giá';
    if(panel.hidden||couponsLoaded)return;
    try{
      const response=await fetch('/api/coupons/cart-best?all=1',{credentials:'same-origin'}),body=await response.json();
      if(!response.ok||!body.success)throw new Error(body.message||'Không thể tải mã giảm giá.');
      const coupons=Array.isArray(body.data)?body.data:body.data?[body.data]:[];
      panel.innerHTML=coupons.length?coupons.map(coupon=>`<article class="available-coupon"><div><b>${esc(coupon.code)}</b><span>${coupon.discountType==='FREE_SHIPPING'?'Miễn phí vận chuyển':coupon.discountType==='PERCENT'?`Giảm ${Number(coupon.discountValue).toLocaleString('vi-VN')}%`:`Giảm ${money(coupon.discountValue)}`}</span><small>Tiết kiệm ${money(coupon.discount)} · ${esc((coupon.eligibleProducts||[]).join(', '))}</small></div><button type="button" data-coupon="${esc(coupon.code)}">Chọn</button></article>`).join(''):'<p class="coupon-empty">Hiện chưa có mã phù hợp với các sản phẩm đang thanh toán.</p>';
      panel.querySelectorAll('[data-coupon]').forEach(button=>button.onclick=()=>{document.querySelector('#coupon-code').value=button.dataset.coupon;panel.hidden=true;toggle.textContent='Xem mã khả dụng';apply()});
      couponsLoaded=true;
    }catch(error){panel.innerHTML=`<p class="error">${esc(error.message)}</p>`}
  }
  const observer=new MutationObserver(()=>{if(install())observer.disconnect()});observer.observe(document.querySelector('#app'),{childList:true,subtree:true});install();
  document.addEventListener('click',event=>{if(applied&&event.target.closest('.quantity-minus,.quantity-plus'))setTimeout(()=>{document.querySelector('#coupon-code').value=applied.code;apply()},650)},true);
})();
