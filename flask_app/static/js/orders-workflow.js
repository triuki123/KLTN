(() => {
  if (document.body.dataset.page !== 'orders') return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>`${Number(value||0).toLocaleString('vi-VN')}đ`;
  const labels={PENDING:'Đã đặt hàng',CONFIRMED:'Đã xác nhận',PREPARING:'Đang chuẩn bị',SHIPPING:'Đang giao',COMPLETED:'Đã giao thành công',CANCELLED:'Đã hủy'};
  function renderHorizontalTimeline(currentStatus) {
    if (currentStatus === 'CANCELLED') {
      return `<div class="customer-status-bar is-cancelled"><div class="status-badge-cancelled">Đơn hàng đã được hủy</div></div>`;
    }
    const steps = [
      { key: 'PENDING', label: 'Đặt hàng' },
      { key: 'CONFIRMED', label: 'Xác nhận' },
      { key: 'SHIPPING', label: 'Đang giao' },
      { key: 'COMPLETED', label: 'Hoàn thành' }
    ];
    const statusWeight = { PENDING: 1, CONFIRMED: 2, PREPARING: 2, SHIPPING: 3, COMPLETED: 4 };
    const currentWeight = statusWeight[currentStatus] || 1;
    return `
      <div class="customer-stepper">
        ${steps.map((step, idx) => {
          const stepWeight = statusWeight[step.key];
          const isDone = currentWeight > stepWeight;
          const isActive = currentWeight === stepWeight;
          const stateClass = isDone ? 'is-done' : isActive ? 'is-active' : '';
          return `
            <div class="stepper-node ${stateClass}">
              <span class="stepper-circle">${isDone ? '✓' : idx + 1}</span>
              <span class="stepper-label">${step.label}</span>
            </div>
            ${idx < steps.length - 1 ? `<div class="stepper-line ${currentWeight > stepWeight ? 'is-done' : ''}"></div>` : ''}
          `;
        }).join('')}
      </div>
    `;
  }

  async function reorder(order) {
    if (!order?.items?.length) return;
    try {
      for (const it of order.items) {
        await fetch('/api/items/cart', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workId: it.work_id, quantity: it.quantity || 1, selected: true })
        });
      }
      location.assign('/cart');
    } catch (_) {
      location.assign('/cart');
    }
  }

  function showCancelDialog(order, onConfirm) {
    const existing = document.querySelector('#cancel-order-dialog');
    if (existing) existing.remove();
    const dialog = document.createElement('div');
    dialog.id = 'cancel-order-dialog';
    dialog.className = 'cancel-order-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = `
      <div class="cancel-modal-backdrop"></div>
      <div class="cancel-modal-panel">
        <header>
          <h3>⚠️ Hủy đơn hàng</h3>
          <button type="button" class="cancel-modal-close" aria-label="Đóng">✕</button>
        </header>
        <div class="cancel-modal-body">
          <p>Mã đơn: <b>${esc(order.order_code)}</b></p>
          <p>Vui lòng cho chúng tôi biết lý do hủy đơn:</p>
          <div class="cancel-reasons">
            <label><input type="radio" name="cancel-reason" value="Mốn đổi địa chỉ giao hàng"><span>Muốn đổi địa chỉ giao hàng</span></label>
            <label><input type="radio" name="cancel-reason" value="Đặt nhầm số lượng"><span>Đặt nhầm số lượng</span></label>
            <label><input type="radio" name="cancel-reason" value="Muốn đổi phương thức thanh toán"><span>Muốn đổi phương thức thanh toán</span></label>
            <label><input type="radio" name="cancel-reason" value="Đổi ý, không muốn mua nữa"><span>Đổi ý, không muốn mua nữa</span></label>
            <label><input type="radio" name="cancel-reason" value="other"><span>Lý do khác</span></label>
          </div>
          <textarea id="cancel-reason-other" placeholder="Nhập lý do cụ thể…" rows="3" hidden></textarea>
        </div>
        <footer>
          <button type="button" class="pill light" id="cancel-modal-dismiss">Đóng</button>
          <button type="button" class="btn-danger" id="cancel-modal-confirm">Xác nhận hủy đơn</button>
        </footer>
      </div>`;
    document.body.appendChild(dialog);
    requestAnimationFrame(() => dialog.classList.add('is-open'));
    document.body.style.overflow = 'hidden';

    const close = () => {
      dialog.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => dialog.remove(), 300);
    };
    dialog.querySelector('.cancel-modal-close').onclick = close;
    dialog.querySelector('#cancel-modal-dismiss').onclick = close;
    dialog.querySelector('.cancel-modal-backdrop').onclick = close;

    dialog.querySelectorAll('[name="cancel-reason"]').forEach(radio => {
      radio.onchange = () => {
        dialog.querySelector('#cancel-reason-other').hidden = radio.value !== 'other';
      };
    });

    dialog.querySelector('#cancel-modal-confirm').onclick = async () => {
      const selected = dialog.querySelector('[name="cancel-reason"]:checked');
      if (!selected) {
        dialog.querySelector('.cancel-reasons').style.outline = '2px solid #c65132';
        return;
      }
      const reason = selected.value === 'other'
        ? (dialog.querySelector('#cancel-reason-other').value.trim() || 'Đổi ý')
        : selected.value;
      close();
      await onConfirm(reason);
    };
  }

  function printOrder(order) {
    const money = v => `${Number(v||0).toLocaleString('vi-VN')}đ`;
    const printWin = window.open('', '_blank', 'width=700,height=800');
    printWin.document.write(`<!DOCTYPE html><html lang="vi"><head>
      <meta charset="utf-8">
      <title>Hóa đơn ${esc(order.order_code)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; font-size: 13px; color: #111; padding: 28px; max-width: 620px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; border-bottom: 2px solid #1F3D2E; padding-bottom: 16px; }
        .brand { font-size: 22px; font-weight: 800; color: #1F3D2E; }
        .brand small { display: block; font-size: 11px; font-weight: 400; color: #888; }
        .order-meta { text-align: right; }
        .order-meta b { font-size: 15px; }
        .order-meta p { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 18px 0; }
        th { background: #1F3D2E; color: #fff; padding: 9px 12px; font-size: 12px; text-align: left; }
        td { padding: 9px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        .total-row td { font-weight: 700; border-top: 2px solid #1F3D2E; }
        .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <div class="header">
        <div><div class="brand">TRẠM SÁCH<small>tramSach.vn · support@tramsach.vn</small></div></div>
        <div class="order-meta"><b>HÓA ĐƠN ĐọN HÀNG</b><p>Mã: ${esc(order.order_code)}</p><p>Ngày: ${new Date(order.created_at).toLocaleDateString('vi-VN')}</p></div>
      </div>
      <p><b>Giao tới:</b> ${esc(order.recipient_name||'')} &middot; ${esc(order.recipient_phone||'')}</p>
      <p><b>Địa chỉ:</b> ${esc(order.shipping_address||'')}</p>
      <table>
        <tr><th>Tên sách</th><th>Số lượng</th><th>Giá đơn vị</th><th>Thành tiền</th></tr>
        ${(order.items||[]).map(it => `<tr><td>${esc(it.title)}</td><td>${it.quantity}</td><td>${money(it.unit_price)}</td><td>${money(Number(it.unit_price)*it.quantity)}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="3">Tổng thanh toán</td><td>${money(order.total_amount)}</td></tr>
      </table>
      <div class="footer">Cảm ơn bạn đã tin tưởng mua sách tại Trạm Sách. — tramSach.vn</div>
    </body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 400);
  }


  async function enhance(){
    if(running||!document.querySelector('.customer-order-card:not([data-workflow])'))return;
    running=true;
    try{
      const response=await fetch('/api/orders',{credentials:'same-origin'}),body=await response.json();
      if(!response.ok||!body.success)return;
      const orders=body.data||[];
      document.querySelectorAll('.customer-order-card:not([data-workflow])').forEach(card=>{
        const code=card.querySelector('.customer-order-code')?.textContent.trim(),order=orders.find(row=>row.order_code===code);
        if(!order)return;
        card.dataset.workflow='true';
        card.dataset.status=order.status;
        const footer=card.querySelector('.customer-order-bottom');
        const stepperHtml = renderHorizontalTimeline(order.status);
        const history=(order.history||[]).map((entry,index)=>`<div class="customer-timeline-step ${index===(order.history||[]).length-1?'current':''}"><i></i><span><b>${esc(labels[entry.status]||entry.status)}</b><small>${new Date(entry.created_at).toLocaleString('vi-VN')}</small></span></div>`).join('');
        
        // Add cancel button for PENDING orders
        if (footer && !footer.querySelector('.btn-cancel-order') && order.status === 'PENDING') {
          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'pill light btn-cancel-order';
          cancelBtn.textContent = 'Hủy đơn hàng';
          cancelBtn.onclick = () => showCancelDialog(order, async (reason) => {
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Đang hủy…';
            try {
              const resp = await fetch(`/api/orders/${order.id}/cancel`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
              });
              const body = await resp.json();
              if (!resp.ok || !body.success) throw new Error(body.message || 'Không thể hủy đơn');
              card.dataset.status = 'CANCELLED';
              card.querySelector('.customer-status')?.classList.remove('', 'shipping', 'done');
              card.querySelector('.customer-status')?.classList.add('cancelled');
              if (card.querySelector('.customer-status')) card.querySelector('.customer-status').textContent = 'Đã hủy';
              cancelBtn.remove();
              if (typeof enhance === 'function') { delete card.dataset.workflow; running = false; enhance(); }
            } catch (error) {
              cancelBtn.disabled = false;
              cancelBtn.textContent = 'Hủy đơn hàng';
              alert(error.message);
            }
          });
          footer.appendChild(cancelBtn);
        }

        // Add reorder button
        if (footer && !footer.querySelector('.btn-reorder') && order.status === 'COMPLETED') {
          const reorderBtn = document.createElement('button');
          reorderBtn.type = 'button';
          reorderBtn.className = 'pill light btn-reorder';
          reorderBtn.textContent = 'Mua lại đơn này';
          reorderBtn.onclick = () => reorder(order);
          footer.appendChild(reorderBtn);
        }

        // Add print invoice button for completed orders
        if (footer && !footer.querySelector('.btn-print-order') && order.status === 'COMPLETED') {
          const printBtn = document.createElement('button');
          printBtn.type = 'button';
          printBtn.className = 'pill light btn-print-order';
          printBtn.innerHTML = '🖨️ In hóa đơn';
          printBtn.onclick = () => printOrder(order);
          footer.appendChild(printBtn);
        }

        footer.insertAdjacentHTML('beforebegin',`
          <div class="customer-order-detail">
            <section><h4>Nhật ký tiến trình</h4><div class="customer-timeline">${history}</div></section>
            <section><h4>Chi tiết thanh toán</h4><div class="customer-finance"><span>Tạm tính <b>${money(order.subtotal)}</b></span>${order.coupon_code?`<span>Mã giảm giá <b>${esc(order.coupon_code)}</b></span>`:''}${Number(order.discount_amount)?`<span>Giảm giá <b>−${money(order.discount_amount)}</b></span>`:''}<span>Vận chuyển <b>${Number(order.shipping_fee)?money(order.shipping_fee):'Miễn phí'}</b></span><strong>Tổng thanh toán <b>${money(order.total_amount)}</b></strong></div>${order.shipping_carrier||order.tracking_code?`<div class="customer-tracking"><b>${esc(order.shipping_carrier||'Đơn vị vận chuyển')}</b><span>Mã vận đơn: ${esc(order.tracking_code||'Đang cập nhật')}</span></div>`:''}<span class="customer-payment ${order.payment_status==='PAID'?'paid':''}">${order.payment_status==='PAID'?'Đã thanh toán':order.payment_status==='REFUNDED'?'Đã hoàn tiền':'Chưa thanh toán'}</span></section>
          </div>
        `);
      });
      if(!document.querySelector('.customer-order-filters')){
        const first=document.querySelector('.customer-order-card');
        first?.insertAdjacentHTML('beforebegin',`<div class="customer-order-filters"><button class="active" data-status="ALL">Tất cả</button><button data-status="PENDING">Chờ xác nhận</button><button data-status="SHIPPING">Đang giao</button><button data-status="COMPLETED">Hoàn thành</button><button data-status="CANCELLED">Đã hủy</button></div>`);
        document.querySelectorAll('.customer-order-filters button').forEach(button=>button.onclick=()=>{
          document.querySelectorAll('.customer-order-filters button').forEach(item=>item.classList.toggle('active',item===button));
          document.querySelectorAll('.customer-order-card').forEach(card=>card.hidden=button.dataset.status!=='ALL'&&card.dataset.status!==button.dataset.status);
        });
      }
    }finally{running=false}
  }
  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.querySelector('#app'),{childList:true,subtree:true});enhance();
})();
