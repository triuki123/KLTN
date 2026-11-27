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
        const hasSelected = items.some(item => Boolean(item.selected));
        if (!hasSelected && items.length > 0) {
          try {
            await request('/api/items/cart/select-all', { method: 'POST', body: JSON.stringify({ selected: true }) });
          } catch (_) {}
        }
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
      // Checkout Steps Bar (Bước 1: Giỏ hàng)
      const shell = app.querySelector('.shell');
      if (shell && !document.querySelector('#checkout-steps-bar')) {
        const stepsBar = document.createElement('nav');
        stepsBar.id = 'checkout-steps-bar';
        stepsBar.className = 'checkout-steps-bar';
        stepsBar.setAttribute('aria-label', 'Tiến trình đặt hàng');
        stepsBar.innerHTML = `
          <div class="step-item is-active"><span class="step-num">1</span><span class="step-text">Giỏ hàng</span></div>
          <div class="step-divider"></div>
          <div class="step-item"><span class="step-num">2</span><span class="step-text">Thanh toán</span></div>
          <div class="step-divider"></div>
          <div class="step-item"><span class="step-num">3</span><span class="step-text">Hoàn tất</span></div>
        `;
        const title = shell.querySelector('.page-title') || shell.querySelector('h1') || shell.firstElementChild;
        if (title) title.insertAdjacentElement('beforebegin', stepsBar);
      }

      // Freeship threshold calculation (299.000đ)
      const freeshipThreshold = 299000;
      const freeshipPercent = Math.min(100, Math.round((subtotal / freeshipThreshold) * 100));
      const remainingForFreeship = Math.max(0, freeshipThreshold - subtotal);
      const freeshipNotice = subtotal >= freeshipThreshold
        ? `<div class="cart-freeship-meter is-reached"><div class="freeship-info"><span class="freeship-icon">🎉</span><b>Đơn hàng đã được MIỄN PHÍ VẬN CHUYỂN!</b></div><div class="freeship-track"><div class="freeship-fill" style="width:100%"></div></div></div>`
        : `<div class="cart-freeship-meter"><div class="freeship-info"><span class="freeship-icon">🚚</span><span>Mua thêm <b>${money(remainingForFreeship)}</b> để được <strong>FREESHIP</strong></span></div><div class="freeship-track"><div class="freeship-fill" style="width:${freeshipPercent}%"></div></div></div>`;

      summary.dataset.enhanced = 'true';
      if (!appliedCode && suggestedCoupon?.code) appliedCode = suggestedCoupon.code;
      summary.innerHTML = `
        ${freeshipNotice}
        <h3>Tóm tắt đơn hàng</h3>
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

      // Ensure cards are wrapped inside .cart-main-col to keep .two-col grid strictly 2 columns
      const cardsWrapper = app.querySelector('.cards');
      let mainCol = app.querySelector('.cart-main-col');
      if (cardsWrapper && !mainCol) {
        mainCol = document.createElement('div');
        mainCol.className = 'cart-main-col';
        cardsWrapper.insertAdjacentElement('beforebegin', mainCol);
        mainCol.appendChild(cardsWrapper);
      }

      // ── Master "Chọn tất cả" checkbox ──
      const allChecked = items.length > 0 && items.every(i => Boolean(i.selected));
      const someChecked = items.some(i => Boolean(i.selected));
      const selectedCount = items.filter(i => Boolean(i.selected)).length;

      let masterBar = app.querySelector('#cart-select-all-bar');
      if (!masterBar && cardsWrapper) {
        masterBar = document.createElement('div');
        masterBar.id = 'cart-select-all-bar';
        masterBar.className = 'cart-select-all-bar';
        cardsWrapper.insertAdjacentElement('beforebegin', masterBar);
      }
      if (masterBar) {
        masterBar.innerHTML = `
          <label class="cart-master-check" title="Chọn hoặc bỏ chọn tất cả">
            <input type="checkbox" id="cart-master-checkbox" ${allChecked ? 'checked' : ''}>
            <span>Chọn tất cả (<b>${items.length}</b> sản phẩm)</span>
          </label>
          <div class="cart-master-meta">
            <span>Đã chọn: <b class="cart-selected-count">${selectedCount}</b>/${items.length}</span>
          </div>`;
        const masterCb = masterBar.querySelector('#cart-master-checkbox');
        if (masterCb) {
          masterCb.indeterminate = !allChecked && someChecked;
          masterCb.onchange = async () => {
            const nextVal = masterCb.checked;
            masterCb.disabled = true;
            try {
              await request('/api/items/cart/select-all', {
                method: 'POST',
                body: JSON.stringify({ selected: nextVal })
              });
              delete summary.dataset.enhanced;
              await install();
            } catch (error) {
              masterCb.checked = !nextVal;
              masterCb.disabled = false;
              if (window.toast) window.toast({ title: 'Lỗi cập nhật', message: error.message, kind: 'error' });
              else window.alert(error.message);
            }
          };
        }
      }

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
        card.insertAdjacentHTML('afterbegin', `<label class="cart-item-select" title="Chọn ${esc(item.title)}"><input type="checkbox" ${item.selected ? 'checked' : ''}></label>`);
        card.querySelector('.cart-item-select input').onchange = async event => {
          const checkbox = event.target;
          const nextSelected = checkbox.checked;
          checkbox.disabled = true;
          card.classList.toggle('is-selected', nextSelected);
          try {
            await request(`/api/items/cart/${encodeURIComponent(item.work_id)}`, {method:'PATCH',body:JSON.stringify({selected:nextSelected})});
            delete summary.dataset.enhanced;
            await install();
          } catch (error) {
            checkbox.checked = !nextSelected;
            card.classList.toggle('is-selected', !nextSelected);
            checkbox.disabled = false;
            if (window.toast) window.toast({title:'Không thể cập nhật',message:error.message,kind:'error'});
            else window.alert(error.message);
          }
        };
      });

      const checkoutLink = summary.querySelector('#cart-checkout-link');
      if (checkoutLink) {
        if (!selectedItems.length) {
          checkoutLink.classList.add('is-disabled');
          checkoutLink.removeAttribute('href');
          checkoutLink.textContent = 'Hãy chọn sản phẩm để thanh toán';
        } else {
          checkoutLink.classList.remove('is-disabled');
          checkoutLink.setAttribute('href', '/checkout');
          checkoutLink.textContent = `Tiến hành thanh toán (${selectedItems.length})`;
        }
      }

      // ── Undo Toast khi xóa sản phẩm ──
      app.querySelectorAll('.list-item .pill.light').forEach(btn => {
        if (btn.dataset.undoHooked) return;
        btn.dataset.undoHooked = '1';
        const origClick = btn.onclick;
        btn.onclick = null;
        btn.addEventListener('click', event => {
          event.stopImmediatePropagation();
          const card = btn.closest('.list-item');
          const cardIndex = [...app.querySelectorAll('.list-item')].indexOf(card);
          const deletedItem = items[cardIndex];
          if (!deletedItem) return;

          // Ẩn card ngay lập tức
          card.style.transition = 'opacity .2s, transform .2s';
          card.style.opacity = '0';
          card.style.transform = 'translateX(12px)';

          let undone = false;
          let undoTimer = null;

          // Hiện undo toast
          let undoToast = document.querySelector('#cart-undo-toast');
          if (!undoToast) {
            undoToast = document.createElement('div');
            undoToast.id = 'cart-undo-toast';
            undoToast.className = 'cart-undo-toast';
            document.body.appendChild(undoToast);
          }
          undoToast.innerHTML = `
            <span>Đã xóa <b>${esc(deletedItem.title)}</b> khỏi giỏ hàng</span>
            <button type="button" id="cart-undo-btn">↩ Hoàn tác</button>`;
          undoToast.classList.add('is-visible');

          undoTimer = setTimeout(async () => {
            if (undone) return;
            // Thực hiện xóa thật
            try {
              await request(`/api/items/cart/${encodeURIComponent(deletedItem.work_id)}`, {method:'DELETE'});
              undoToast.classList.remove('is-visible');
              location.reload();
            } catch (_) { card.style.opacity = '1'; card.style.transform = ''; }
          }, 4200);

          document.querySelector('#cart-undo-btn').onclick = () => {
            undone = true;
            clearTimeout(undoTimer);
            undoToast.classList.remove('is-visible');
            card.style.opacity = '1';
            card.style.transform = '';
          };
        });
      });
    } catch (error) {
      summary.innerHTML = `<h3>Tóm tắt đơn hàng</h3><p class="message error">${esc(error.message)}</p>`;
    } finally { installing = false; }
  }

  const observer = new MutationObserver(() => install());
  observer.observe(app, {childList:true,subtree:true});
  install();
})();
