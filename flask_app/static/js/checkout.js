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

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    const orig = btn.textContent;
    btn.textContent = '✓ Đã chép';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('copied');
    }, 2000);
  }

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

    root.innerHTML = `<section class="checkout-page">
      <nav class="checkout-steps-bar" id="checkout-steps-bar" aria-label="Tiến trình đặt hàng">
        <div class="step-item is-done"><span class="step-num">✓</span><span class="step-text">Giỏ hàng</span></div>
        <div class="step-divider"></div>
        <div class="step-item is-active"><span class="step-num">2</span><span class="step-text">Thanh toán</span></div>
        <div class="step-divider"></div>
        <div class="step-item"><span class="step-num">3</span><span class="step-text">Hoàn tất</span></div>
      </nav>
      <span class="eyebrow">THANH TOÁN AN TOÀN</span><h1>Thông tin nhận hàng</h1><div class="checkout-grid">
      <form id="checkout-form" class="panel checkout-card"><h2>Chọn địa chỉ giao hàng</h2>
        ${addresses.length ? savedChoices : '<button class="address-empty" id="empty-address-action" type="button"><b>Chưa có địa chỉ giao hàng</b><p>Bấm vào đây để thêm địa chỉ mới.</p><span>Thêm địa chỉ →</span></button>'}
        <label class="address-choice address-choice-new"><input type="radio" name="addressMode" value="other" ${addresses.length ? '' : 'checked'}><span><b>+ Thêm địa chỉ mới</b><small>${addresses.length ? 'Giao đơn hàng này đến một địa chỉ khác' : 'Nhập thông tin người nhận và địa chỉ giao hàng'}</small></span></label>
        <div id="custom-address" ${addresses.length ? 'hidden' : ''}>${fields({recipient_name:user.full_name,phone:user.phone})}<label class="save-address"><input type="checkbox" name="saveAddress" ${addresses.length ? '' : 'checked'}> Lưu địa chỉ này vào sổ địa chỉ</label><label class="save-address"><input type="checkbox" name="makeDefault" ${addresses.length ? '' : 'checked'}> Đặt làm địa chỉ mặc định</label></div>
        
        <label for="payment-method-select">Phương thức thanh toán</label>
        <select name="paymentMethod" id="payment-method-select">
          <option value="COD">Thanh toán khi nhận hàng (COD)</option>
          <option value="BANK_TRANSFER">Chuyển khoản ngân hàng (Quét mã VietQR)</option>
        </select>
        
        <div id="payment-method-tip" class="payment-tip" hidden>
          <span class="payment-tip-icon">💡</span>
          <div>
            <b>Thanh toán tức thì qua VietQR</b>
            <p>Sau khi bấm đặt hàng, màn hình sẽ hiển thị mã QR kèm STK. Bạn chỉ cần mở ứng dụng ngân hàng quét mã để thanh toán.</p>
          </div>
        </div>

        <div id="checkout-message"></div>
        <button class="btn-brand" id="checkout-submit">Xác nhận đặt hàng · ${money(subtotal + shipping)}</button>
      </form>

      <aside class="panel checkout-summary">
        <h2>Đơn hàng của bạn</h2>
        ${items.map(item => `<div class="checkout-product" data-work-id="${esc(item.work_id)}"><span>${esc(item.title)}<span class="quantity-picker"><button type="button" class="quantity-minus" aria-label="Giảm số lượng" ${item.quantity<=1?'disabled':''}>−</button><b class="quantity-value">${item.quantity}</b><button type="button" class="quantity-plus" aria-label="Tăng số lượng" ${item.quantity>=item.stock?'disabled':''}>+</button></span><small>Còn ${item.stock} cuốn</small></span><b class="line-total">${money(Number(item.unit_price)*item.quantity)}</b></div>`).join('')}
        
        <div class="checkout-eta-box">
          <span class="eta-icon">🚚</span>
          <div>
            <b>Giao hàng tiêu chuẩn toàn quốc</b>
            <p>Dự kiến nhận hàng trong <b>2 – 3 ngày làm việc</b></p>
          </div>
        </div>

        <hr>
        <p><span>Tạm tính</span><b id="checkout-subtotal">${money(subtotal)}</b></p>
        <p><span>Vận chuyển</span><b id="checkout-shipping">${shipping ? money(shipping) : 'Miễn phí'}</b></p>
        <strong><span>Tổng thanh toán</span><b id="checkout-total">${money(subtotal + shipping)}</b></strong>
      </aside>
    </div></section>`;

    const custom = document.querySelector('#custom-address');
    const paymentSelect = document.querySelector('#payment-method-select');
    const paymentTip = document.querySelector('#payment-method-tip');

    paymentSelect.addEventListener('change', () => {
      paymentTip.hidden = paymentSelect.value !== 'BANK_TRANSFER';
    });

    const setMode = mode => {
      const isOther = mode === 'other';
      custom.hidden = !isOther;
      custom.querySelectorAll('input').forEach(input => input.disabled = !isOther);
    };
    setMode(addresses.length ? 'saved' : 'other');
    document.querySelectorAll('[name="addressMode"]').forEach(radio => radio.onchange = () => setMode(radio.value));
    document.querySelector('#empty-address-action')?.addEventListener('click', () => {
      const option = document.querySelector('[name="addressMode"][value="other"]');
      option.checked = true;
      setMode('other');
      custom.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(() => custom.querySelector('input:not([type="checkbox"])')?.focus(), 350);
    });

    const updateTotals = () => {
      const subtotalNow = items.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);
      const shippingNow = subtotalNow >= 299000 ? 0 : 30000;
      document.querySelector('#checkout-subtotal').textContent = money(subtotalNow);
      document.querySelector('#checkout-shipping').textContent = shippingNow ? money(shippingNow) : 'Miễn phí';
      document.querySelector('#checkout-total').textContent = money(subtotalNow + shippingNow);
      document.querySelector('#checkout-submit').textContent = `Xác nhận đặt hàng · ${money(subtotalNow + shippingNow)}`;
    };

    document.querySelectorAll('.checkout-product').forEach(row => {
      const item = items.find(entry => entry.work_id === row.dataset.workId);
      const change = async delta => {
        const next = Number(item.quantity) + delta;
        if (next < 1 || next > Number(item.stock)) return;
        row.querySelectorAll('button').forEach(button => button.disabled = true);
        try {
          const result = await api(`/api/items/cart/${encodeURIComponent(item.work_id)}`, {method:'PATCH', body:JSON.stringify({quantity:next})});
          item.quantity = result.quantity;
          row.querySelector('.quantity-value').textContent = result.quantity;
          row.querySelector('.line-total').textContent = money(result.lineTotal);
          row.querySelector('.quantity-minus').disabled = result.quantity <= 1;
          row.querySelector('.quantity-plus').disabled = result.quantity >= result.stock;
          updateTotals();
        } catch (error) {
          document.querySelector('#checkout-message').innerHTML = `<p class="message error">${esc(error.message)}</p>`;
          row.querySelectorAll('button').forEach(button => button.disabled = false);
        }
      };
      row.querySelector('.quantity-minus').onclick = () => change(-1);
      row.querySelector('.quantity-plus').onclick = () => change(1);
    });

    document.querySelector('#checkout-form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitBtn = document.querySelector('#checkout-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xử lý đặt hàng…';
      const data = Object.fromEntries(new FormData(form));
      const selected = form.querySelector('[name="addressMode"]:checked');
      const box = document.querySelector('#checkout-message');
      data.addressMode = selected.value;
      if (selected.value === 'saved') data.addressId = selected.dataset.addressId;
      if (selected.value === 'other') data.address = [data.addressLine, data.wardName, data.districtName, data.provinceName].filter(Boolean).join(', ');

      try {
        if (selected.value === 'other' && (data.saveAddress || data.makeDefault)) {
          await api('/api/account/addresses', {method:'POST', body:JSON.stringify({...data, isDefault:Boolean(data.makeDefault)})});
        }
        const order = await api('/api/checkout', {method:'POST', body:JSON.stringify(data)});
        const orderCode = order.orderCode;
        const totalPay = order.totalAmount || items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0) + (subtotal >= 299000 ? 0 : 30000);

        if (data.paymentMethod === 'BANK_TRANSFER') {
          const bankName = 'MB Bank (Ngân hàng Quân Đội)';
          const bankAccount = '0987654321';
          const accountHolder = 'TRAM SACH KLTN';
          const transferContent = `${orderCode}`;
          const qrUrl = `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${totalPay}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountHolder)}`;

          root.innerHTML = `
            <section class="checkout-page checkout-success-wrap">
              <nav class="checkout-steps-bar" aria-label="Tiến trình đặt hàng">
                <div class="step-item is-done"><span class="step-num">✓</span><span class="step-text">Giỏ hàng</span></div>
                <div class="step-divider"></div>
                <div class="step-item is-done"><span class="step-num">✓</span><span class="step-text">Thanh toán</span></div>
                <div class="step-divider"></div>
                <div class="step-item is-active"><span class="step-num">3</span><span class="step-text">Hoàn tất</span></div>
              </nav>

              <div class="checkout-success text-center">
                <span class="success-icon-badge">✓</span>
                <span class="eyebrow text-success">ĐẶT HÀNG THÀNH CÔNG</span>
                <h1>Mã đơn hàng: ${esc(orderCode)}</h1>
                <p class="lead">Vui lòng quét mã VietQR bên dưới bằng ứng dụng ngân hàng hoặc ví điện tử để hoàn tất thanh toán.</p>

                <div class="vietqr-card">
                  <div class="vietqr-qr-wrap">
                    <img class="vietqr-image" src="${qrUrl}" alt="Mã thanh toán VietQR cho đơn ${esc(orderCode)}" loading="eager">
                    <span class="vietqr-scan-note">⚡ Quét mã bằng VietQR / MoMo / App Ngân hàng</span>
                    <div style="margin-top:10px;font-size:12px;color:#78867e">Thời gian quét mã còn: <strong id="qr-timer" style="color:#bf5032;font-size:14px">10:00</strong></div>
                  </div>
                  <div class="vietqr-details">
                    <h3>Thông tin chuyển khoản</h3>
                    <div class="vietqr-row">
                      <span>Ngân hàng</span>
                      <b>${bankName}</b>
                    </div>
                    <div class="vietqr-row">
                      <span>Số tài khoản</span>
                      <div class="copy-cell">
                        <b>${bankAccount}</b>
                        <button type="button" class="btn-copy" id="btn-copy-acc">Sao chép</button>
                      </div>
                    </div>
                    <div class="vietqr-row">
                      <span>Chủ tài khoản</span>
                      <b>${accountHolder}</b>
                    </div>
                    <div class="vietqr-row highlight">
                      <span>Số tiền</span>
                      <div class="copy-cell">
                        <strong class="text-brand">${money(totalPay)}</strong>
                        <button type="button" class="btn-copy" id="btn-copy-amount">Sao chép</button>
                      </div>
                    </div>
                    <div class="vietqr-row highlight">
                      <span>Nội dung CK</span>
                      <div class="copy-cell">
                        <strong class="text-brand">${esc(transferContent)}</strong>
                        <button type="button" class="btn-copy" id="btn-copy-content">Sao chép</button>
                      </div>
                    </div>
                    <div class="vietqr-notice">
                      ⚠️ <i>Hệ thống sẽ tự động xác nhận đơn hàng trong vòng 5 - 10 phút sau khi giao dịch thành công.</i>
                    </div>
                    <button type="button" id="btn-confirm-paid" class="btn-brand" style="width:100%;margin-top:14px;padding:12px;border-radius:10px;font-weight:700">✓ Tôi đã hoàn tất chuyển khoản</button>
                  </div>
                </div>

                <div class="success-actions mt-4">
                  <a class="btn-brand" href="/orders">Xem đơn hàng của tôi &rarr;</a>
                  <a class="pill light" href="/">Tiếp tục mua sách</a>
                </div>
              </div>
            </section>`;

          document.querySelector('#btn-copy-acc')?.addEventListener('click', e => copyText(bankAccount, e.currentTarget));
          document.querySelector('#btn-copy-amount')?.addEventListener('click', e => copyText(String(totalPay), e.currentTarget));
          document.querySelector('#btn-copy-content')?.addEventListener('click', e => copyText(transferContent, e.currentTarget));

          let timeLeft = 600;
          const timerEl = document.querySelector('#qr-timer');
          const timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
              clearInterval(timerInterval);
              if (timerEl) timerEl.textContent = 'Hết hạn (Vui lòng tải lại)';
            } else if (timerEl) {
              const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
              const s = String(timeLeft % 60).padStart(2, '0');
              timerEl.textContent = `${m}:${s}`;
            }
          }, 1000);

          document.querySelector('#btn-confirm-paid')?.addEventListener('click', () => {
            clearInterval(timerInterval);
            if (typeof window.toast === 'function') {
              window.toast({
                title: 'Đã nhận thông tin chuyển khoản',
                message: `Đơn hàng ${orderCode} đang được hệ thống xác thực. Chuyển tiếp tới trang đơn hàng...`,
                kind: 'ok',
                duration: 2500
              });
            }
            setTimeout(() => {
              location.assign('/orders');
            }, 1500);
          });
        } else {
          root.innerHTML = `
            <section class="checkout-page checkout-success-wrap">
              <nav class="checkout-steps-bar" aria-label="Tiến trình đặt hàng">
                <div class="step-item is-done"><span class="step-num">✓</span><span class="step-text">Giỏ hàng</span></div>
                <div class="step-divider"></div>
                <div class="step-item is-done"><span class="step-num">✓</span><span class="step-text">Thanh toán</span></div>
                <div class="step-divider"></div>
                <div class="step-item is-active"><span class="step-num">3</span><span class="step-text">Hoàn tất</span></div>
              </nav>
              <div class="checkout-success text-center">
                <span class="success-icon-badge">✓</span>
                <span class="eyebrow text-success">ĐẶT HÀNG THÀNH CÔNG</span>
                <h1>Cảm ơn bạn đã mua sách!</h1>
                <p class="lead">Mã đơn hàng của bạn là <b>${esc(orderCode)}</b>. Chúng tôi sẽ chuẩn bị sách và giao sớm nhất đến địa chỉ của bạn.</p>
                <div class="success-actions mt-4">
                  <a class="btn-brand" href="/orders">Theo dõi đơn hàng &rarr;</a>
                  <a class="pill light" href="/">Về trang chủ</a>
                </div>
              </div>
            </section>`;
        }
      } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Xác nhận đặt hàng';
        box.innerHTML = `<p class="message error">${esc(error.message)}</p>`;
      }
    };
  }
  boot().catch(() => location.replace('/login?next=/checkout'));
})();
