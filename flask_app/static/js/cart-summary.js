(() => {
  if (document.body.dataset.page !== 'cart') return;
  const app = document.querySelector('#app');
  const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let appliedCode = sessionStorage.getItem('cartCouponCode') || '';
  let installing = false;
  let selectionInitialized = false;

  async function request(url, options = {}) {
    const response = await fetch(url, {credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
    const raw = await response.text();
    let body;
    try { body = JSON.parse(raw); }
    catch (_) { throw new Error('Không thể kết nối API giỏ hàng. Vui lòng tải lại trang.'); }
    if (!response.ok || !body.success) throw new Error(body.message || 'Không thể kiểm tra mã giảm giá.');
    return body.data;
  }

  async function install() {
    const summary = app.querySelector('.summary');
    if (!summary || summary.dataset.enhanced === 'true' || installing) return;
    const eyebrow = app.querySelector('.shell > .eyebrow');
    if (eyebrow) eyebrow.textContent = 'TÀI KHOẢN CỦA TÔI';
    installing = true;
    try {
      let items;
      if (!selectionInitialized) {
        items = await request('/api/items/cart');
        await Promise.all(items.filter(item => Boolean(item.selected)).map(item =>
          request(`/api/items/cart/${encodeURIComponent(item.work_id)}`, {method:'PATCH',body:JSON.stringify({selected:false})})
        ));
        selectionInitialized = true;
        appliedCode = '';
        sessionStorage.removeItem('cartCouponCode');
      }
      items = await request('/api/items/cart');
      let suggestedCoupon = null;
      try { suggestedCoupon = await request('/api/coupons/cart-best'); } catch (_) { suggestedCoupon = null; }
      if (!summary.isConnected) return;
      const selectedItems = items.filter(item => Boolean(item.selected));
      const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);
      const shipping = selectedItems.length ? (subtotal >= 299000 ? 0 : 30000) : 0;
      summary.dataset.enhanced = 'true';
      if (!appliedCode && suggestedCoupon?.code) appliedCode = suggestedCoupon.code;
      summary.innerHTML = `<h3>Tóm tắt đơn hàng</h3>
        <p class="cart-summary-row"><i>+</i><span>Tiền sách <small>${selectedItems.length} sản phẩm được chọn</small></span><b>${money(subtotal)}</b></p>
        <p class="cart-summary-row"><i>+</i><span>Vận chuyển</span><b>${shipping ? money(shipping) : '0đ · Miễn phí'}</b></p>
        <div class="cart-coupon"><label for="cart-coupon-code">Mã giảm giá</label><div><input id="cart-coupon-code" value="${esc(appliedCode)}" placeholder="Nhập mã ưu đãi" maxlength="50"><button id="cart-apply-coupon" type="button">Áp dụng</button></div><small id="cart-coupon-message"></small></div>
        <p id="cart-discount-row" class="cart-summary-row cart-discount" hidden><i>−</i><span id="cart-discount-label">Giảm giá</span><b>−0đ</b></p>
        <div class="cart-summary-total"><i>=</i><span>Tổng thanh toán</span><strong id="cart-grand-total">${money(subtotal + shipping)}</strong></div>
        <a id="cart-checkout-link" class="btn-brand d-block text-center" href="/checkout">Tiến hành thanh toán</a>`;

      const apply = async () => {
        const input = summary.querySelector('#cart-coupon-code');
        const button = summary.querySelector('#cart-apply-coupon');
        const message = summary.querySelector('#cart-coupon-message');
        const code = input.value.trim().toUpperCase();
        if (!code) { message.textContent = 'Hãy nhập mã giảm giá.'; message.className = 'error'; return; }
        button.disabled = true; button.textContent = 'Đang kiểm tra…';
        try {
          const data = await request('/api/coupons/validate', {method:'POST',body:JSON.stringify({code})});
          appliedCode = data.code;
          sessionStorage.setItem('cartCouponCode', appliedCode);
          input.value = appliedCode;
          const discountRow = summary.querySelector('#cart-discount-row');
          discountRow.hidden = false;
          discountRow.querySelector('b').textContent = `−${money(data.discount)}`;
          const discountText = data.discountType === 'FREE_SHIPPING' ? 'Miễn phí vận chuyển' : data.discountType === 'PERCENT' ? `${Number(data.discountValue).toLocaleString('vi-VN')}%` : money(data.discountValue);
          summary.querySelector('#cart-discount-label').innerHTML = `${data.discountType === 'FREE_SHIPPING' ? 'Phí vận chuyển' : 'Giảm giá'} <small>${esc(data.code)} · ${esc(discountText)}</small>`;
          summary.querySelector('#cart-grand-total').textContent = money(data.total);
          message.textContent = `Áp dụng cho: ${(data.eligibleProducts || []).join(', ')}`;
          message.className = 'success';
        } catch (error) {
          appliedCode = '';
          sessionStorage.removeItem('cartCouponCode');
          summary.querySelector('#cart-discount-row').hidden = true;
          summary.querySelector('#cart-grand-total').textContent = money(subtotal + shipping);
          message.textContent = error.message;
          message.className = 'error';
        } finally { button.disabled = false; button.textContent = 'Áp dụng'; }
      };
      summary.querySelector('#cart-apply-coupon').onclick = apply;
      summary.querySelector('#cart-coupon-code').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } };
      if (appliedCode) apply();
      const cards = [...app.querySelectorAll('.cards .list-item')];
      app.querySelectorAll('.cart-item-select').forEach(control => control.remove());
      app.querySelectorAll('.cart-coupon-ribbon').forEach(ribbon => ribbon.remove());
      cards.forEach((card, index) => {
        const item = items[index];
        if (!item) return;
        card.classList.add('has-cart-selection');
        card.classList.toggle('is-selected', Boolean(item.selected));
        if (item.coupon_code && item.coupon_discount_type) {
          const value = Number(item.coupon_discount_value || 0);
          const discount = item.coupon_discount_type === 'FREE_SHIPPING'
            ? 'FREESHIP'
            : item.coupon_discount_type === 'PERCENT'
            ? `-${value.toLocaleString('vi-VN')}%`
            : `-${Math.round(value / 1000).toLocaleString('vi-VN')}K`;
          card.insertAdjacentHTML('afterbegin', `<span class="cart-coupon-ribbon" title="Dùng mã ${esc(item.coupon_code)}">MÃ ${esc(discount)}</span>`);
        }
        card.insertAdjacentHTML('afterbegin', `<label class="cart-item-select" title="Chọn ${esc(item.title)}"><input type="checkbox" ${item.selected ? 'checked' : ''}><span></span></label>`);
        card.querySelector('.cart-item-select input').onchange = async event => {
          const checkbox = event.target;
          const nextSelected = checkbox.checked;
          checkbox.disabled = true;
          card.classList.toggle('is-selected', nextSelected);
          try {
            await request(`/api/items/cart/${encodeURIComponent(item.work_id)}`, {method:'PATCH',body:JSON.stringify({selected:nextSelected})});
            // Only rebuild the summary and selection controls. Product cards stay
            // in place, avoiding the visible full-cart redraw on every click.
            delete summary.dataset.enhanced;
            await install();
          } catch (error) {
            checkbox.checked = !nextSelected;
            card.classList.toggle('is-selected', !nextSelected);
            checkbox.disabled = false;
            window.alert(error.message);
          }
        };
      });
      const checkoutLink = summary.querySelector('#cart-checkout-link');
      if (!selectedItems.length) { checkoutLink.classList.add('is-disabled'); checkoutLink.removeAttribute('href'); checkoutLink.textContent = 'Hãy chọn sản phẩm để thanh toán'; }
    } catch (error) {
      summary.innerHTML = `<h3>Tóm tắt đơn hàng</h3><p class="message error">${esc(error.message)}</p>`;
    } finally { installing = false; }
  }

  const observer = new MutationObserver(() => install());
  observer.observe(app, {childList:true,subtree:true});
  install();
})();
