(() => {
  if (document.body.dataset.page === 'admin-login' || location.pathname.startsWith('/admin')) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const icon = name => `<svg class="ui-icon" aria-hidden="true"><use href="/static/icons/ui-icons.svg#${name}"></use></svg>`;
  const closeIcon = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const safeJson = async response => {
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new Error('Máy chủ đang bận. Vui lòng thử lại sau.');
    return response.json();
  };
  const formatMessage = value => {
    let html = esc(value).replace(/\r\n?/g, '\n');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    html = html.replace(/(^|\n)[*-]\s+([^\n]+)/g, '$1<span class="chat-list-item">$2</span>');
    return html.replace(/\n/g, '<br>');
  };

  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" class="chat-launcher" id="chat-launcher" aria-label="Mở trợ lý Trạm Sách" aria-controls="chat-panel" aria-expanded="false">${icon('sparkles')}</button>
    <aside class="chat-panel" id="chat-panel" role="dialog" aria-modal="false" aria-label="Trợ lý Trạm Sách">
      <header class="chat-head"><div><b>Trợ lý Trạm Sách</b><small>Tìm sách và hỗ trợ mua hàng</small></div><button type="button" id="chat-close" aria-label="Đóng">${closeIcon}</button></header>
      <div class="chat-messages" id="chat-messages" aria-live="polite">
        <div class="chat-message bot">Xin chào! Tôi có thể giúp bạn tìm sách, kiểm tra tồn kho, giá bán hoặc tra cứu đơn hàng.</div>
        <div class="chat-suggestions"><button type="button">Tìm sách kỹ năng sống</button><button type="button">Sách dưới 150.000đ</button><button type="button">Đơn hàng của tôi</button><button type="button">Chính sách đổi trả</button></div>
      </div>
      <form method="post" class="chat-form" id="chat-form" data-no-transition>
        <span class="chat-privacy">AI chỉ nhận câu hỏi và thông tin thư mục sách công khai.</span>
        <input id="chat-input" maxlength="500" autocomplete="off" placeholder="Bạn muốn tìm cuốn sách nào?" aria-label="Nhập câu hỏi">
        <button type="submit" id="chat-send" aria-label="Gửi">${icon('send')}</button>
      </form>
    </aside>`);

  const panel = document.querySelector('#chat-panel');
  const messages = document.querySelector('#chat-messages');
  const input = document.querySelector('#chat-input');
  const sendButton = document.querySelector('#chat-send');
  const launcher = document.querySelector('#chat-launcher');

  // ── Restore lịch sử chat từ sessionStorage ──
  const SESSION_KEY = 'tramSachChatSession';
  const history = [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (saved && Array.isArray(saved.history) && saved.history.length) {
      history.push(...saved.history);
      // Render lại các tin nhắn đã lưu
      const restoreWrap = document.createElement('div');
      restoreWrap.className = 'chat-session-restore';
      restoreWrap.innerHTML = '↺ Đã khôi phục cuộc trò chuyện trước';
      messages.appendChild(restoreWrap);
      saved.history.forEach(entry => {
        const node = document.createElement('div');
        node.className = `chat-message ${entry.role === 'user' ? 'user' : 'bot'}`;
        node.innerHTML = entry.role === 'user' ? esc(entry.content) : formatMessage(entry.content);
        messages.appendChild(node);
      });
      messages.scrollTop = messages.scrollHeight;
    }
  } catch (_) {}

  let sending = false;
  let controller = null;

  const scroll = () => { messages.scrollTop = messages.scrollHeight; };
  const addMessage = (text, type = 'bot') => {
    const node = document.createElement('div');
    node.className = `chat-message ${type}`;
    node.innerHTML = type === 'bot' ? formatMessage(text) : esc(text);
    messages.append(node);
    scroll();
  };
  const setSending = value => {
    sending = value;
    sendButton.disabled = value;
    input.disabled = value;
    sendButton.classList.toggle('is-loading', value);
  };
  const renderProducts = products => {
    if (!products?.length) return;
    messages.insertAdjacentHTML('beforeend', `<div class="chat-products">${products.map(product => `<article class="chat-product">${product.cover ? `<img src="${esc(product.cover)}" alt="">` : `<div class="chat-cover">${esc(product.title?.[0] || 'S')}</div>`}<div class="chat-product-info"><b>${esc(product.title)}</b><span>${esc(product.authors)} · Còn ${Number(product.stock || 0)} cuốn</span><strong>${money(product.price)}</strong><div class="chat-product-actions"><a href="/books/${encodeURIComponent(product.workId)}">Chi tiết</a><button type="button" data-cart="${esc(product.workId)}">${icon('cart')} Thêm</button></div></div></article>`).join('')}</div>`);
    scroll();
  };

  const send = async rawText => {
    const text = String(rawText || '').trim();
    if (!text || sending) return;
    addMessage(text, 'user');
    input.value = '';
    setSending(true);
    controller = new AbortController();
    // ── Typing indicator 3 chấm ──
    const typing = document.createElement('div');
    typing.className = 'chat-message bot chat-typing-dots';
    typing.innerHTML = '<span></span><span></span><span></span>';
    typing.setAttribute('aria-label', 'Trợ lý đang soạn câu trả lời');
    messages.append(typing);
    scroll();

    const timeout = setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({message:text, history:history.slice(-4)})
      });
      const body = await safeJson(response);
      if (!response.ok || body.success === false) throw new Error(body.message || 'Không thể gửi câu hỏi.');
      addMessage(body.data.message);
      history.push({role:'user',content:text},{role:'assistant',content:body.data.message});
      if (history.length > 8) history.splice(0, history.length - 8);
      // Lưu lịch sử vào sessionStorage
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({history: history.slice(-8)})); } catch (_) {}
      renderProducts(body.data.products);
      if (body.data.actions?.length) {
        messages.insertAdjacentHTML('beforeend', `<div class="chat-actions">${body.data.actions.map(action => `<a href="${esc(action.url)}">${esc(action.label)}</a>`).join('')}</div>`);
        scroll();
      }
    } catch (error) {
      addMessage(error.name === 'AbortError' ? 'Phản hồi đang mất nhiều thời gian. Bạn vui lòng thử lại với câu hỏi ngắn hơn.' : error.message);
    } finally {
      clearTimeout(timeout);
      typing.remove();
      controller = null;
      setSending(false);
      input.focus();
    }
  };

  const close = () => { panel.classList.remove('open'); launcher.setAttribute('aria-expanded','false'); };
  launcher.onclick = () => { const open = panel.classList.toggle('open'); launcher.setAttribute('aria-expanded',String(open)); if (open) input.focus(); };
  document.querySelector('#chat-close').onclick = close;
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && panel.classList.contains('open')) close(); });
  document.querySelector('#chat-form').onsubmit = event => { event.preventDefault(); send(input.value); };
  messages.addEventListener('click', async event => {
    const suggestion = event.target.closest('.chat-suggestions button');
    if (suggestion) return send(suggestion.textContent);
    const cart = event.target.closest('[data-cart]');
    if (!cart || cart.disabled) return;
    cart.disabled = true;
    try {
      const response = await fetch('/api/items/cart',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({workId:cart.dataset.cart})});
      if (response.status === 401) return location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
      const body = await safeJson(response);
      if (!response.ok || body.success === false) throw new Error(body.message || 'Không thể thêm vào giỏ hàng.');
      cart.innerHTML = `${icon('check')} Đã thêm`;
      if (typeof window.updateCartCount === 'function') window.updateCartCount();
      if (typeof window.toast === 'function') window.toast({ title: 'Đã thêm vào giỏ hàng', message: 'Sách đã được thêm từ Trợ lý AI.', kind: 'ok', action: { label: 'Xem giỏ hàng', href: '/cart' } });
    } catch (error) {
      addMessage(error.message);
      cart.disabled = false;
    }
  });
})();
