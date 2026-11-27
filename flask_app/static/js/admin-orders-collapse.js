(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const labels = {
    PENDING: 'Chờ xử lý',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Đang chuẩn bị',
    SHIPPING: 'Đang giao hàng',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy'
  };

  let rows = [], loading = false;

  const load = async () => {
    if (loading) return;
    loading = true;
    try {
      const response = await fetch('/api/admin/orders-workflow', { credentials: 'same-origin' });
      const body = await response.json();
      if (response.ok && body.success) rows = body.data || [];
    } finally {
      loading = false;
      enhance();
    }
  };

  const timeline = order => `<div class="order-timeline">${(order.history || []).map((entry, index) => `
    <div class="order-timeline-step ${index === (order.history || []).length - 1 ? 'current' : ''}">
      <i></i>
      <span>
        <b>${esc(labels[entry.status] || entry.status)}</b>
        <small>${new Date(entry.created_at).toLocaleString('vi-VN')}</small>
      </span>
    </div>
  `).join('')}</div>`;

  const finance = order => `
    <div class="admin-order-finance">
      <span>Tạm tính <b>${money(order.subtotal || order.total_amount)}</b></span>
      ${order.coupon_code ? `<span>Mã giảm giá <b>${esc(order.coupon_code)}</b></span>` : ''}
      ${Number(order.discount_amount) ? `<span>Giảm giá <b>−${money(order.discount_amount)}</b></span>` : ''}
      <span>Vận chuyển <b>${Number(order.shipping_fee) ? money(order.shipping_fee) : 'Miễn phí'}</b></span>
      <strong>Tổng thanh toán <b>${money(order.total_amount)}</b></strong>
    </div>
  `;

  function printInvoice(order) {
    const items = (order.items || []).map((item, idx) => `
      <tr>
        <td style="text-align:center;padding:8px 6px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
          <b style="color:#11291f;">${esc(item.title)}</b>
          ${item.authors ? `<div style="font-size:11px;color:#666;">${esc(item.authors)}</div>` : ''}
        </td>
        <td style="text-align:center;padding:8px 6px;border-bottom:1px solid #e5e7eb;font-weight:600;">${item.quantity}</td>
        <td style="text-align:right;padding:8px 6px;border-bottom:1px solid #e5e7eb;">${money(item.unit_price)}</td>
        <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#1f3d2e;">${money(Number(item.unit_price) * Number(item.quantity))}</td>
      </tr>
    `).join('');

    const invoiceModal = document.createElement('div');
    invoiceModal.id = 'invoice-modal-root';
    invoiceModal.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden !important; }
          #invoice-printable-area, #invoice-printable-area * { visibility: visible !important; }
          #invoice-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
        }
      </style>
      <div id="invoice-modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;">
        <div id="invoice-printable-area" style="background:#fff;border-radius:16px;max-width:700px;width:100%;max-height:92vh;overflow-y:auto;padding:32px;box-shadow:0 25px 70px rgba(0,0,0,0.35);font-family:'Be Vietnam Pro',sans-serif;color:#1a202c;position:relative;">
          
          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1f3d2e;padding-bottom:16px;margin-bottom:20px;">
            <div>
              <h2 style="margin:0;font-family:'Lora',serif;color:#1f3d2e;font-size:24px;font-weight:700;">TRẠM SÁCH</h2>
              <div style="font-size:12px;color:#555;margin-top:3px;">Nhà sách trực tuyến tuyển chọn · Hotline: 0925.464.420</div>
              <div style="font-size:12px;color:#555;">Website: tram-sach.vn · Kho: TP. Hồ Chí Minh</div>
            </div>
            <div style="text-align:right;">
              <span style="display:inline-block;background:#f3f4f6;padding:4px 10px;border-radius:6px;font-weight:800;font-size:13.5px;letter-spacing:0.5px;color:#1f3d2e;">${esc(order.order_code)}</span>
              <div style="font-size:12px;color:#777;margin-top:4px;">Ngày: ${new Date(order.created_at).toLocaleString('vi-VN')}</div>
            </div>
          </div>

          <div style="text-align:center;margin-bottom:22px;">
            <h3 style="margin:0;font-size:18px;font-weight:800;color:#11291f;text-transform:uppercase;letter-spacing:1px;">HÓA ĐƠN BÁN HÀNG & PHIẾU ĐÓNG GÓI</h3>
            <span style="font-size:12px;color:#666;">Trạng thái: <b>${esc(labels[order.status] || order.status)}</b></span>
          </div>

          <!-- Two-col sender and recipient -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;background:#f9fafb;padding:16px;border-radius:10px;margin-bottom:20px;font-size:13px;border:1px solid #e5e7eb;">
            <div>
              <b style="color:#1f3d2e;display:block;margin-bottom:4px;font-size:11px;letter-spacing:0.5px;">ĐƠN VỊ GỬI:</b>
              <div><b>Trạm Sách Fulfillment</b></div>
              <div>Hotline: 0925.464.420</div>
              <div>Địa chỉ: TP. Hồ Chí Minh</div>
            </div>
            <div>
              <b style="color:#1f3d2e;display:block;margin-bottom:4px;font-size:11px;letter-spacing:0.5px;">NGƯỜI NHẬN:</b>
              <div><b>${esc(order.recipient_name || order.customer)}</b></div>
              <div>Điện thoại: <b>${esc(order.recipient_phone || 'Chưa có')}</b></div>
              <div>Địa chỉ: ${esc(order.shipping_address || 'Chưa cập nhật')}</div>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
            <thead>
              <tr style="background:#1f3d2e;color:#fff;">
                <th style="padding:8px 6px;text-align:center;border-radius:6px 0 0 6px;width:36px;">STT</th>
                <th style="padding:8px 10px;text-align:left;">Tác phẩm</th>
                <th style="padding:8px 6px;text-align:center;width:40px;">SL</th>
                <th style="padding:8px 6px;text-align:right;width:95px;">Đơn giá</th>
                <th style="padding:8px 10px;text-align:right;border-radius:0 6px 6px 0;width:105px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>

          <!-- Financial summary -->
          <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
            <div style="width:280px;font-size:13px;">
              <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Tạm tính:</span> <b>${money(order.subtotal || order.total_amount)}</b></div>
              ${Number(order.discount_amount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#c2410c;"><span>Giảm giá (${esc(order.coupon_code || 'Voucher')}):</span> <b>−${money(order.discount_amount)}</b></div>` : ''}
              <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Phí vận chuyển:</span> <b>${Number(order.shipping_fee) ? money(order.shipping_fee) : 'Miễn phí'}</b></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #11291f;margin-top:4px;font-size:15px;color:#1f3d2e;"><span>TỔNG THANH TOÁN:</span> <b>${money(order.total_amount)}</b></div>
              <div style="font-size:12px;color:#666;text-align:right;margin-top:2px;">Phương thức: <b>${esc(order.payment_method || 'COD')}</b></div>
            </div>
          </div>

          <!-- Signatures -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:center;font-size:12px;margin-bottom:30px;padding-top:10px;">
            <div>
              <b>NGƯỜI LẬP PHIẾU</b>
              <div style="height:55px;"></div>
              <i>(Ký, ghi rõ họ tên)</i>
            </div>
            <div>
              <b>NGƯỜI NHẬN HÀNG</b>
              <div style="height:55px;"></div>
              <i>(Ký xác nhận đã nhận đủ hàng)</i>
            </div>
          </div>

          <div style="border-top:1px dashed #d1d5db;padding-top:14px;text-align:center;font-size:12px;color:#666;font-style:italic;">
            Trạm Sách cảm ơn quý khách đã tin tưởng và ủng hộ. Chúc bạn có những phút giây đọc sách thật tuyệt vời!
          </div>

          <div style="display:flex;justify-content:center;gap:12px;margin-top:24px;" class="no-print">
            <button type="button" id="btn-trigger-print" style="background:#1f3d2e;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">🖨️ In phiếu ngay</button>
            <button type="button" id="btn-close-print" style="background:#f3f4f6;color:#333;border:1px solid #d1d5db;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Đóng</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(invoiceModal);
    const backdrop = invoiceModal.querySelector('#invoice-modal-backdrop');
    const closeBtn = invoiceModal.querySelector('#btn-close-print');
    const printBtn = invoiceModal.querySelector('#btn-trigger-print');

    const close = () => invoiceModal.remove();
    closeBtn.onclick = close;
    backdrop.onclick = e => { if (e.target === backdrop) close(); };
    printBtn.onclick = () => window.print();
  }

  function toolbar() {
    if (document.querySelector('.admin-order-tools')) return;
    const list = document.querySelector('.admin-orders');
    if (!list) return;

    const allCount = rows.length;
    const pendingCount = rows.filter(r => r.status === 'PENDING').length;
    const prepCount = rows.filter(r => r.status === 'PREPARING' || r.status === 'CONFIRMED').length;
    const shipCount = rows.filter(r => r.status === 'SHIPPING').length;
    const doneCount = rows.filter(r => r.status === 'COMPLETED').length;
    const cancelCount = rows.filter(r => r.status === 'CANCELLED').length;

    list.insertAdjacentHTML('beforebegin', `
      <div class="admin-order-tools" style="background:#fff;border-radius:14px;padding:16px;border:1px solid rgba(17,41,31,0.08);margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.02);">
        <input id="order-search" type="search" placeholder="🔍 Tìm kiếm theo Mã đơn (DH...), Khách hàng, SĐT người nhận, Địa chỉ..." style="width:100%;border-radius:8px;padding:10px 14px;border:1px solid #d1d5db;font-size:13px;margin-bottom:12px;">
        <div class="order-filter-tabs" style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;">
          <button class="active" data-status="ALL">Tất cả (${allCount})</button>
          <button data-status="PENDING">Chờ xử lý (${pendingCount})</button>
          <button data-status="PREPARING">Chuẩn bị (${prepCount})</button>
          <button data-status="SHIPPING">Đang giao (${shipCount})</button>
          <button data-status="COMPLETED">Hoàn thành (${doneCount})</button>
          <button data-status="CANCELLED">Đã hủy (${cancelCount})</button>
        </div>
      </div>
    `);

    let active = 'ALL';
    const filter = () => {
      const query = (document.querySelector('#order-search')?.value || '').trim().toLowerCase();
      document.querySelectorAll('.admin-order-card').forEach(card => {
        const status = String(card.dataset.orderStatus || 'PENDING').toUpperCase();
        let matchesStatus = false;
        if (active === 'ALL') matchesStatus = true;
        else if (active === 'PENDING') matchesStatus = (status === 'PENDING');
        else if (active === 'PREPARING') matchesStatus = (status === 'PREPARING' || status === 'CONFIRMED');
        else if (active === 'SHIPPING') matchesStatus = (status === 'SHIPPING');
        else if (active === 'COMPLETED') matchesStatus = (status === 'COMPLETED');
        else if (active === 'CANCELLED') matchesStatus = (status === 'CANCELLED');

        const cardText = card.textContent.toLowerCase();
        const matchesQuery = !query || cardText.includes(query);
        card.hidden = !(matchesStatus && matchesQuery);
      });
    };

    document.querySelector('#order-search').oninput = filter;
    document.querySelectorAll('.order-filter-tabs button').forEach(button => {
      button.onclick = () => {
        active = button.dataset.status;
        document.querySelectorAll('.order-filter-tabs button').forEach(item => item.classList.toggle('active', item === button));
        filter();
      };
    });
  }

  function enhance() {
    toolbar();
    document.querySelectorAll('.admin-order-card:not([data-collapsible])').forEach((card, index) => {
      const header = card.querySelector(':scope > header');
      const body = card.querySelector(':scope > .admin-order-body');
      const footer = card.querySelector(':scope > footer');
      const actions = header?.querySelector('.admin-order-total');
      const order = rows[index];
      if (!header || !body || !footer || !actions || !order) return;

      card.dataset.collapsible = 'true';
      card.dataset.orderStatus = String(order.status || 'PENDING').toUpperCase();

      const details = document.createElement('div');
      details.className = 'admin-order-details';
      details.hidden = true;
      body.before(details);
      details.append(body);
      body.insertAdjacentHTML('beforeend', `<div class="admin-order-workflow"><section><h4>Lịch sử đơn hàng</h4>${timeline(order)}</section><section><h4>Chi tiết thanh toán</h4>${finance(order)}</section></div>`);
      details.append(footer);

      // Add Print Invoice button & View Details button
      const btnGroup = document.createElement('div');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '6px';
      btnGroup.style.alignItems = 'center';

      const printBtn = document.createElement('button');
      printBtn.type = 'button';
      printBtn.className = 'pill light';
      printBtn.style.padding = '8px 12px';
      printBtn.style.fontSize = '12px';
      printBtn.style.fontWeight = '600';
      printBtn.innerHTML = '🖨️ In hóa đơn';
      printBtn.onclick = (e) => {
        e.stopPropagation();
        printInvoice(order);
      };

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'pill light order-detail-toggle';
      toggle.textContent = 'Xem chi tiết';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.onclick = () => {
        const open = details.hidden;
        document.querySelectorAll('.admin-order-card.is-open').forEach(other => {
          if (other === card) return;
          other.classList.remove('is-open');
          other.querySelector('.admin-order-details').hidden = true;
          const old = other.querySelector('.order-detail-toggle');
          if (old) {
            old.textContent = 'Xem chi tiết';
            old.setAttribute('aria-expanded', 'false');
          }
        });
        details.hidden = !open;
        card.classList.toggle('is-open', open);
        toggle.textContent = open ? 'Thu gọn' : 'Xem chi tiết';
        toggle.setAttribute('aria-expanded', String(open));
      };

      btnGroup.append(printBtn);
      btnGroup.append(toggle);
      actions.append(btnGroup);
    });
  }

  const observer = new MutationObserver(() => requestAnimationFrame(() => {
    if (document.querySelector('.admin-order-card:not([data-collapsible])')) load();
    else enhance();
  }));
  observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  load();
})();
