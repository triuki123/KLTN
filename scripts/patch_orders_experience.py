ORDERS_EXPERIENCE_JS = '''(() => {
  const root = document.querySelector('#app');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const request = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options });
    const body = await response.json();
    if (!response.ok || body.success === false) throw new Error(body.message || 'Không thể xử lý yêu cầu');
    return body.data;
  };

  const statuses = {
    PENDING: ['Chờ xác nhận', ''],
    CONFIRMED: ['Đã xác nhận', ''],
    PREPARING: ['Đang chuẩn bị', 'shipping'],
    SHIPPING: ['Đang giao hàng', 'shipping'],
    COMPLETED: ['Đã giao thành công', 'done'],
    CANCELLED: ['Đã hủy', 'cancelled']
  };

  const cover = item => item.cover_url
    ? `<img class="customer-order-cover" src="${esc(item.cover_url)}" alt="Bìa sách ${esc(item.title)}">`
    : `<div class="customer-order-cover customer-order-fallback">${esc(String(item.title || 'T').slice(0, 1))}</div>`;

  const itemMarkup = item => `
    <div class="customer-order-item">
      ${cover(item)}
      <div>
        <b>${esc(item.title)}</b>
        <small>${esc(item.authors || '')} · SL: ${item.quantity}</small>
      </div>
      <strong>${money(Number(item.unit_price) * Number(item.quantity))}</strong>
    </div>
  `;

  const stepperMarkup = order => {
    const status = String(order.status || 'PENDING').toUpperCase();
    if (status === 'CANCELLED') {
      return `
        <div class="customer-order-cancelled-banner" style="display:flex;align-items:center;gap:12px;background:#fef2f2;border:1px solid #fee2e2;padding:12px 16px;border-radius:10px;margin:12px 0;color:#991b1b;font-size:13px;">
          <span style="font-size:20px;">🚫</span>
          <div>
            <b>Đơn hàng này đã được hủy</b>
            <div style="font-size:11.5px;color:#b91c1c;margin-top:2px;">Sách đã được hoàn kho và voucher ưu đãi (nếu có) đã được hoàn lại tài khoản của bạn.</div>
          </div>
        </div>
      `;
    }

    const steps = [
      { key: 'PENDING', label: 'Đặt đơn', icon: '📝' },
      { key: 'CONFIRMED', label: 'Xác nhận', icon: '✓' },
      { key: 'PREPARING', label: 'Đóng gói', icon: '📦' },
      { key: 'SHIPPING', label: 'Đang giao', icon: '🚚' },
      { key: 'COMPLETED', label: 'Thành công', icon: '🎁' }
    ];

    const stepMap = { PENDING: 0, CONFIRMED: 1, PREPARING: 2, SHIPPING: 3, COMPLETED: 4 };
    const currentStepIdx = stepMap[status] ?? 0;
    const progressPct = Math.round((currentStepIdx / 4) * 100);

    return `
      <div class="order-progress-stepper" style="margin:16px 0 20px;padding:18px 16px 14px;background:#fafaf7;border-radius:12px;border:1px solid #eef0eb;">
        <div style="position:relative;display:flex;align-items:center;justify-content:space-between;">
          
          <!-- Background Progress Line -->
          <div style="position:absolute;top:15px;left:24px;right:24px;height:3px;background:#e5e7eb;z-index:0;"></div>
          <!-- Filled Progress Line -->
          <div style="position:absolute;top:15px;left:24px;width:calc((100% - 48px) * ${progressPct} / 100);height:3px;background:#1f3d2e;z-index:0;transition:width 0.4s ease;"></div>

          ${steps.map((st, i) => {
            const isDone = i <= currentStepIdx;
            const isCurrent = i === currentStepIdx;
            return `
              <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;width:60px;text-align:center;">
                <div style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:${isDone ? '#1f3d2e' : '#fff'};color:${isDone ? '#fff' : '#9ca3af'};border:2px solid ${isDone ? '#1f3d2e' : '#d1d5db'};${isCurrent ? 'box-shadow:0 0 0 4px rgba(31,61,46,0.18);' : ''}transition:all 0.3s;">
                  ${isDone ? (st.icon) : (i + 1)}
                </div>
                <span style="font-size:11px;font-weight:${isCurrent ? '700' : '500'};color:${isCurrent ? '#1f3d2e' : isDone ? '#374151' : '#9ca3af'};margin-top:6px;white-space:nowrap;">
                  ${esc(st.label)}
                </span>
              </div>
            `;
          }).join('')}

        </div>
      </div>
    `;
  };

  const orderMarkup = order => {
    const info = statuses[order.status] || [order.status, ''];
    const reorder = order.status === 'COMPLETED'
      ? `<button class="btn-brand reorder" data-items="${encodeURIComponent(JSON.stringify(order.items || []))}">Đặt lại đơn này</button>`
      : '';
    const cancel = order.status === 'PENDING'
      ? `<button class="pill light cancel-order" data-id="${order.id}">Hủy đơn hàng</button>`
      : '';

    return `
      <article class="customer-order-card">
        <header class="customer-order-top">
          <div>
            <span class="order-overline">Mã đơn hàng</span>
            <b class="customer-order-code">${esc(order.order_code)}</b>
            <span class="customer-order-date">Đặt ngày ${new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
          </div>
          <span class="customer-status ${info[1]}">${info[0]}</span>
          <div class="customer-order-total">
            <span class="order-overline">Tổng thanh toán</span>
            <b>${money(order.total_amount)}</b>
          </div>
        </header>

        ${stepperMarkup(order)}

        <div class="customer-order-items">
          ${(order.items || []).map(itemMarkup).join('')}
        </div>

        <footer class="customer-order-bottom">
          <div class="delivery-info">
            <i><svg class="ui-icon" aria-hidden="true"><use href="/static/icons/ui-icons.svg#pin"></use></svg></i>
            <p>
              <b>Giao tới:</b> ${esc(order.recipient_name || '')} · ${esc(order.recipient_phone || '')}<br>
              ${esc(order.shipping_address || 'Chưa cập nhật địa chỉ')}
            </p>
          </div>
          <div class="order-actions">
            ${cancel}
            ${reorder}
          </div>
        </footer>
      </article>
    `;
  };

  async function reorderItems(encoded) {
    for (const item of JSON.parse(decodeURIComponent(encoded))) {
      await request('/api/items/cart', {
        method: 'POST',
        body: JSON.stringify({
          workId: item.work_id,
          title: item.title,
          authors: item.authors,
          cover: item.cover_url
        })
      });
    }
    location.assign('/cart');
  }

  async function boot() {
    try {
      const user = await request('/api/session');
      if (!user?.id) {
        location.assign('/login?next=/orders');
        return;
      }

      const nav = document.querySelector('#account-nav');
      if (nav && !nav.querySelector('.nav-fav')) {
        nav.innerHTML = `
          <a href="/account">${esc(user.name)}</a>
          <a class="nav-fav" href="/favorites">♡ Yêu thích</a>
          <a href="/orders">Đơn hàng</a>
          <a class="cart" href="/cart">Giỏ hàng</a>
          <button class="pill light" id="logout">Thoát</button>
        `;
        document.querySelector('#logout')?.addEventListener('click', async () => {
          await request('/api/auth/logout', { method: 'POST' });
          location.assign('/');
        });
        if (typeof window.updateFavoriteCount === 'function') window.updateFavoriteCount();
        if (typeof window.updateCartCount === 'function') window.updateCartCount();
      }

      const orders = await request('/api/orders');
      const total = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

      root.innerHTML = `
        <section class="orders-page">
          <span class="eyebrow">TÀI KHOẢN CỦA TÔI</span>
          <h1 class="page-title">Đơn hàng</h1>
          <p class="orders-intro">Theo dõi tiến trình vận chuyển theo thời gian thực, hủy đơn chưa xác nhận hoặc đặt lại những đơn đã hoàn thành.</p>
          ${orders.length ? `
            <div class="orders-stats">
              <div><b>${orders.length}</b><span>đơn hàng</span></div>
              <div><b>${money(total)}</b><span>tổng giá trị đã đặt</span></div>
            </div>
            ${orders.map(orderMarkup).join('')}
          ` : `
            <div class="panel orders-empty">
              <h2>Chưa có đơn hàng</h2>
              <p>Những cuốn sách bạn đặt sẽ xuất hiện tại đây.</p>
              <a class="btn-brand" href="/books">Khám phá kho sách</a>
            </div>
          `}
        </section>
      `;

      root.querySelectorAll('.reorder').forEach(button => {
        button.onclick = () => reorderItems(button.dataset.items).catch(error => {
          if (window.toast) window.toast({ title: 'Không thể đặt lại đơn', message: error.message, kind: 'error' });
          else alert(error.message);
        });
      });

      root.querySelectorAll('.cancel-order').forEach(button => {
        button.onclick = async () => {
          if (!confirm('Bạn muốn hủy đơn này? Sách sẽ được hoàn lại kho.')) return;
          button.disabled = true;
          try {
            await request(`/api/orders/${button.dataset.id}/cancel`, { method: 'PATCH', body: '{}' });
            if (window.toast) window.toast({ title: 'Đã hủy đơn hàng thành công', message: 'Sách đã được hoàn lại kho.', kind: 'ok' });
            await boot();
          } catch (error) {
            button.disabled = false;
            if (window.toast) window.toast({ title: 'Không thể hủy đơn', message: error.message, kind: 'error' });
            else alert(error.message);
          }
        };
      });
    } catch (_) {
      location.assign('/login?next=/orders');
    }
  }

  boot();
})();
'''

with open('flask_app/static/js/orders-experience.js', 'w', encoding='utf-8') as f:
    f.write(ORDERS_EXPERIENCE_JS)
print('Updated orders-experience.js successfully!')
