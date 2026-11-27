(() => {
  'use strict';

  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

  // Find target cart element on desktop or mobile
  function getCartTarget() {
    const mobileCart = document.querySelector('.mobile-bottom-nav a[href="/cart"]');
    if (mobileCart && window.innerWidth <= 768 && mobileCart.offsetParent !== null) {
      const badge = document.querySelector('#mobile-cart-badge') || mobileCart;
      return { el: mobileCart, badge };
    }
    const desktopCart = document.querySelector('#account-nav .cart') || document.querySelector('.site-header .cart');
    return { el: desktopCart, badge: desktopCart };
  }

  // ── 1. ULTRA-SMOOTH GPU-ACCELERATED FLY-TO-CART ANIMATION ──────────────────
  window.flyToCart = function (sourceEl, options = {}) {
    return new Promise(resolve => {
      if (!sourceEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        triggerCartImpact();
        resolve();
        return;
      }

      const { el: cartEl, badge: badgeEl } = getCartTarget();
      if (!cartEl) {
        resolve();
        return;
      }

      // 1. Get exact pixel coordinates of source element (NO sizing assumptions)
      const sourceRect = sourceEl.getBoundingClientRect();
      const cartRect = cartEl.getBoundingClientRect();

      const startW = sourceRect.width;
      const startH = sourceRect.height;
      const startX = sourceRect.left;
      const startY = sourceRect.top;

      if (startW <= 0 || startH <= 0) {
        triggerCartImpact(cartEl, badgeEl);
        resolve();
        return;
      }

      // 2. Build 3D Miniature Physical Book
      const flyEl = document.createElement('div');
      flyEl.className = 'fly-book-object';
      flyEl.style.width = `${startW}px`;
      flyEl.style.height = `${startH}px`;
      flyEl.style.left = `${startX}px`;
      flyEl.style.top = `${startY}px`;

      const coverWrap = document.createElement('div');
      coverWrap.className = 'fly-book-cover';

      // Find real image source if available
      const img = sourceEl.tagName === 'IMG' ? sourceEl : sourceEl.querySelector('img');
      if (img && img.src && !img.src.endsWith('undefined')) {
        const cloneImg = document.createElement('img');
        cloneImg.src = img.src;
        cloneImg.alt = '';
        coverWrap.appendChild(cloneImg);
      } else {
        const cloneNode = sourceEl.cloneNode(true);
        coverWrap.appendChild(cloneNode);
      }

      flyEl.appendChild(coverWrap);

      // Add spine shadow, paper edge highlight, and glass sheen
      const spine = document.createElement('div');
      spine.className = 'fly-book-spine';
      const pages = document.createElement('div');
      pages.className = 'fly-book-pages';
      const sheen = document.createElement('div');
      sheen.className = 'fly-book-sheen';
      flyEl.appendChild(spine);
      flyEl.appendChild(pages);
      flyEl.appendChild(sheen);

      document.body.appendChild(flyEl);

      // 3. Compute target coordinates & bezier control point
      const targetCenterX = cartRect.left + cartRect.width / 2;
      const targetCenterY = cartRect.top + cartRect.height / 2;

      // Miniature target scale (approx 36px wide book)
      const targetScale = Math.min(Math.max(36 / startW, 0.1), 0.22);

      // Offset so center of miniature book hits center of cart icon
      const targetTranslateX = targetCenterX - (startX + startW / 2);
      const targetTranslateY = targetCenterY - (startY + startH / 2);

      // Curve peak control point:
      let controlX = targetTranslateX * 0.35;
      let controlY;
      if (targetTranslateY < 0) {
        // Desktop: flying up to header cart
        const arcElevation = Math.max(90, Math.min(220, Math.abs(targetTranslateY) * 0.45));
        controlY = Math.min(0, targetTranslateY) - arcElevation;
      } else {
        // Mobile: flying down to bottom nav
        controlY = -70;
      }

      // 4. Sample 32 keyframes along the Bezier curve for GPU hardware animation
      const STEPS = 32;
      const keyframes = [];

      for (let i = 0; i <= STEPS; i++) {
        const rawT = i / STEPS;

        // Smooth cubic ease-in-out
        const t = rawT < 0.5
          ? 4 * rawT * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

        // Quadratic Bezier relative to start (0, 0):
        // B(t) = 2*(1-t)*t * control + t^2 * target
        const curX = 2 * (1 - t) * t * controlX + Math.pow(t, 2) * targetTranslateX;
        const curY = 2 * (1 - t) * t * controlY + Math.pow(t, 2) * targetTranslateY;

        // Stage 1: Anticipation lift (0 -> 0.12): scale lifts to 1.04
        // Stage 2: Flight shrinking (0.12 -> 0.9): smooth transition to targetScale
        // Stage 3: Vortex suck-in (0.9 -> 1.0): shrinks to 0.05
        let curScale;
        if (rawT < 0.12) {
          curScale = 1.0 + 0.04 * (rawT / 0.12);
        } else if (rawT < 0.88) {
          const subT = (rawT - 0.12) / 0.76;
          curScale = 1.04 - (1.04 - targetScale) * subT;
        } else {
          const subT = (rawT - 0.88) / 0.12;
          curScale = targetScale * (1 - 0.7 * subT);
        }

        // 3D rotation & tilt
        const rotZ = -18 * t;
        const tiltX = Math.sin(t * Math.PI) * 14;
        const tiltY = -Math.sin(t * Math.PI) * 10;

        // Opacity: stay 1.0, vanish only at the very final 10%
        const opacity = rawT > 0.88 ? Math.max(0, 1 - (rawT - 0.88) / 0.12) : 1;

        keyframes.push({
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${curScale.toFixed(3)}) rotateZ(${rotZ.toFixed(1)}deg) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg)`,
          opacity: opacity.toFixed(2),
          offset: rawT
        });
      }

      // 5. Emit subtle golden sparkle particles at flight intervals
      const sparkleTimers = [120, 240, 360, 460].map(delay => {
        return setTimeout(() => {
          if (!flyEl.isConnected) return;
          const rect = flyEl.getBoundingClientRect();
          const spark = document.createElement('div');
          spark.className = 'fly-sparkle';
          spark.style.left = `${rect.left + rect.width / 2}px`;
          spark.style.top = `${rect.top + rect.height / 2}px`;
          document.body.appendChild(spark);
          setTimeout(() => spark.remove(), 450);
        }, delay);
      });

      const DURATION = 580; // ms

      // 6. Execute hardware-accelerated Web Animations API
      if (typeof flyEl.animate === 'function') {
        const anim = flyEl.animate(keyframes, {
          duration: DURATION,
          fill: 'forwards',
          easing: 'linear' // Easing is already baked into sample points
        });

        anim.onfinish = () => {
          sparkleTimers.forEach(clearTimeout);
          flyEl.remove();
          triggerCartImpact(cartEl, badgeEl);
          resolve();
        };
      } else {
        // Fallback for older browsers
        setTimeout(() => {
          sparkleTimers.forEach(clearTimeout);
          flyEl.remove();
          triggerCartImpact(cartEl, badgeEl);
          resolve();
        }, DURATION);
      }
    });
  };

  // ── 2. CART IMPACT: SPRING BOUNCE, DUAL GLOW RING & BADGE POP ──────────────
  function triggerCartImpact(targetEl, badgeEl) {
    const { el, badge } = targetEl ? { el: targetEl, badge: badgeEl } : getCartTarget();
    if (!el) return;

    // 1. Cart spring bounce
    el.classList.remove('cart-bounce');
    void el.offsetWidth; // Force reflow
    el.classList.add('cart-bounce');
    setTimeout(() => el.classList.remove('cart-bounce'), 650);

    // 2. Dual radiating glow rings
    el.style.position = el.style.position || 'relative';
    const ring1 = document.createElement('div');
    ring1.className = 'cart-glow-ring';
    el.appendChild(ring1);
    setTimeout(() => ring1.remove(), 800);

    const ring2 = document.createElement('div');
    ring2.className = 'cart-glow-ring secondary';
    el.appendChild(ring2);
    setTimeout(() => ring2.remove(), 900);

    // 3. Badge spring pop
    const targetBadge = badge || el;
    targetBadge.classList.remove('badge-pop');
    void targetBadge.offsetWidth;
    targetBadge.classList.add('badge-pop');
    setTimeout(() => targetBadge.classList.remove('badge-pop'), 500);

    // Update global cart counts
    if (typeof window.updateCartCount === 'function') {
      window.updateCartCount();
    }
  }

  // ── 3. MINI CART DRAWER ───────────────────────────────────────────────────
  let drawerBackdrop = null;
  let drawer = null;

  function ensureDrawerMarkup() {
    if (drawer && drawerBackdrop) return;

    drawerBackdrop = document.querySelector('.cart-drawer-backdrop');
    if (!drawerBackdrop) {
      drawerBackdrop = document.createElement('div');
      drawerBackdrop.className = 'cart-drawer-backdrop';
      document.body.appendChild(drawerBackdrop);
    }

    drawer = document.querySelector('.cart-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'cart-drawer';
      drawer.setAttribute('aria-label', 'Giỏ hàng của bạn');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      document.body.appendChild(drawer);
    }

    drawerBackdrop.addEventListener('click', window.closeCartDrawer);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drawer?.classList.contains('is-open')) {
        window.closeCartDrawer();
      }
    });
  }

  window.openCartDrawer = async function (item = {}, cartItems = []) {
    ensureDrawerMarkup();

    let itemsList = Array.isArray(cartItems) && cartItems.length ? cartItems : null;
    if (!itemsList) {
      try {
        const res = await fetch('/api/items/cart', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          const payload = await res.json();
          itemsList = Array.isArray(payload) ? payload : (payload?.data || []);
        }
      } catch (_) {}
    }

    if (!Array.isArray(itemsList) || !itemsList.length) {
      if (item && item.title) itemsList = [item];
      else itemsList = [];
    }

    // Calculate subtotal from all items in cart
    const totalCount = itemsList.reduce((sum, i) => sum + Number(i.quantity || 1), 0);
    const subtotal = itemsList.reduce((sum, i) => {
      const p = Number(i.unit_price || i.promotional_price || i.selling_price || i.price || 99000);
      const q = Number(i.quantity || 1);
      return sum + p * q;
    }, 0);

    // Free shipping threshold (299.000đ)
    const FREESHIP_THRESHOLD = 299000;
    const freeshipProgress = Math.min(Math.round((subtotal / FREESHIP_THRESHOLD) * 100), 100);
    const freeshipRemaining = Math.max(FREESHIP_THRESHOLD - subtotal, 0);

    const freeshipMarkup = subtotal >= FREESHIP_THRESHOLD
      ? `<div class="drawer-freeship-text"><span>🎉 <strong>Đủ điều kiện Miễn phí vận chuyển!</strong></span><small>100%</small></div><div class="drawer-freeship-bar"><div class="drawer-freeship-fill is-complete" style="width:100%"></div></div>`
      : `<div class="drawer-freeship-text"><span>Mua thêm <strong>${money(freeshipRemaining)}</strong> để được <strong>Freeship</strong></span><small>${freeshipProgress}%</small></div><div class="drawer-freeship-bar"><div class="drawer-freeship-fill" style="width:${freeshipProgress}%"></div></div>`;

    const itemsMarkup = itemsList.length === 0 ? `
      <div class="cart-drawer-empty" style="text-align:center;padding:48px 16px;color:#6a7c71;">
        <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin-bottom:12px;opacity:0.5;fill:none;stroke:currentColor;stroke-width:1.5;">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p style="margin:0;font-size:15px;font-weight:600;color:#1f3d2e;">Giỏ hàng của bạn đang trống</p>
      </div>
    ` : itemsList.map(it => {
      const itTitle = esc(it.title || 'Tác phẩm');
      const itAuthor = esc(Array.isArray(it.authors) ? it.authors.join(', ') : (it.authors || 'Trạm Sách'));
      const itPrice = Number(it.unit_price || it.promotional_price || it.selling_price || it.price || 99000);
      const itQty = Number(it.quantity || 1);
      const itCover = it.cover_url || it.cover || '';
      const itWorkId = it.work_id || it.workId || '';

      const itCoverMarkup = itCover
        ? `<img src="${esc(itCover)}" alt="${itTitle}">`
        : `<div class="vintage-book-cover vintage-theme-forest" style="height:100%;"><div class="vintage-book-frame" style="padding:6px;"><b class="vintage-title" style="font-size:10px;">${itTitle}</b></div></div>`;

      return `
        <div class="cart-drawer-item" data-work-id="${esc(itWorkId)}">
          <div class="cart-drawer-thumb">
            ${itCoverMarkup}
          </div>
          <div class="cart-drawer-info">
            <h3 class="cart-drawer-item-title">${itTitle}</h3>
            <span class="cart-drawer-item-author">${itAuthor}</span>
            <div class="cart-drawer-item-price-row">
              <span class="cart-drawer-item-qty">Số lượng: ${itQty}</span>
              <strong class="cart-drawer-item-price">${money(itPrice * itQty)}</strong>
            </div>
          </div>
          ${itWorkId ? `
            <button type="button" class="cart-drawer-item-delete" data-work-id="${esc(itWorkId)}" title="Bỏ cuốn này khỏi giỏ hàng" aria-label="Xóa ${itTitle}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h2 class="cart-drawer-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          Giỏ hàng của bạn (${totalCount})
        </h2>
        <button type="button" class="cart-drawer-close" aria-label="Đóng giỏ hàng">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="cart-drawer-alert">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span>Đã thêm sách vào giỏ hàng thành công!</span>
      </div>

      <div class="cart-drawer-freeship">
        ${freeshipMarkup}
      </div>

      <div class="cart-drawer-body">
        ${itemsMarkup}
      </div>

      <div class="cart-drawer-footer">
        <div class="cart-drawer-subtotal">
          <span>Tạm tính giỏ hàng:</span>
          <strong>${money(subtotal)}</strong>
        </div>
        <div class="cart-drawer-actions">
          <a href="/cart" class="btn-drawer-cart">Xem giỏ hàng</a>
          <a href="/checkout" class="btn-drawer-checkout">
            <span>Thanh toán</span>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    `;

    drawer.querySelector('.cart-drawer-close')?.addEventListener('click', window.closeCartDrawer);

    // Delete item directly inside drawer
    drawer.querySelectorAll('.cart-drawer-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const workId = btn.dataset.workId;
        if (!workId) return;
        btn.disabled = true;
        btn.style.opacity = '0.4';
        try {
          const res = await fetch(`/api/items/cart/${encodeURIComponent(workId)}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (res.ok) {
            if (typeof window.updateCartCount === 'function') window.updateCartCount();
            const row = btn.closest('.cart-drawer-item');
            if (row) {
              row.style.transition = 'all 0.22s ease';
              row.style.opacity = '0';
              row.style.transform = 'translateX(24px)';
              setTimeout(() => {
                window.openCartDrawer();
              }, 220);
            } else {
              window.openCartDrawer();
            }
          }
        } catch (_) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    });

    // Open animations
    requestAnimationFrame(() => {
      drawerBackdrop.classList.add('is-visible');
      drawer.classList.add('is-open');
    });
  };

  window.closeCartDrawer = function () {
    if (drawer) drawer.classList.remove('is-open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('is-visible');
  };

  // ── 4. FAVORITE SIDE DRAWER ────────────────────────────────────────────────
  let favDrawerBackdrop = null;
  let favDrawer = null;

  function ensureFavDrawerMarkup() {
    if (favDrawer && favDrawerBackdrop) return;

    favDrawerBackdrop = document.querySelector('.fav-drawer-backdrop');
    if (!favDrawerBackdrop) {
      favDrawerBackdrop = document.createElement('div');
      favDrawerBackdrop.className = 'cart-drawer-backdrop fav-drawer-backdrop';
      document.body.appendChild(favDrawerBackdrop);
    }

    favDrawer = document.querySelector('.fav-drawer');
    if (!favDrawer) {
      favDrawer = document.createElement('aside');
      favDrawer.className = 'cart-drawer fav-drawer';
      favDrawer.setAttribute('aria-label', 'Sách yêu thích của bạn');
      favDrawer.setAttribute('role', 'dialog');
      favDrawer.setAttribute('aria-modal', 'true');
      document.body.appendChild(favDrawer);
    }

    favDrawerBackdrop.addEventListener('click', window.closeFavoriteDrawer);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && favDrawer?.classList.contains('is-open')) {
        window.closeFavoriteDrawer();
      }
    });
  }

  window.openFavoriteDrawer = function (item = {}, favList = []) {
    ensureFavDrawerMarkup();

    const title = esc(item.title || 'Tác phẩm');
    const author = esc(Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || 'Trạm Sách'));
    const price = Number(item.unit_price || item.promotional_price || item.selling_price || item.price || 99000);
    const coverUrl = item.cover_url || item.cover || '';
    const workId = item.workId || item.work_id || '';

    const list = Array.isArray(favList) && favList.length ? favList : [item];
    const totalFavs = list.length;

    const coverMarkup = coverUrl
      ? `<img src="${esc(coverUrl)}" alt="${title}">`
      : `<div class="vintage-book-cover vintage-theme-forest" style="height:100%;"><div class="vintage-book-frame" style="padding:6px;"><b class="vintage-title" style="font-size:10px;">${title}</b></div></div>`;

    favDrawer.innerHTML = `
      <div class="cart-drawer-header">
        <h2 class="cart-drawer-title" style="color:#c2410c;">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="color:#c2410c;">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          Sách yêu thích của bạn
        </h2>
        <button type="button" class="cart-drawer-close" aria-label="Đóng thanh yêu thích">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="cart-drawer-alert" style="background:#fff0eb;border-color:rgba(194,65,12,0.2);color:#c2410c;">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span>Đã lưu vào danh sách yêu thích thành công!</span>
      </div>

      <div class="cart-drawer-body">
        <div class="cart-drawer-item">
          <div class="cart-drawer-thumb">
            ${coverMarkup}
          </div>
          <div class="cart-drawer-info">
            <h3 class="cart-drawer-item-title">${title}</h3>
            <span class="cart-drawer-item-author">${author}</span>
            <div class="cart-drawer-item-price-row">
              <span class="cart-drawer-item-qty" style="color:#c2410c;background:#fdeee8;">Đã yêu thích ♥</span>
              <strong class="cart-drawer-item-price">${money(price)}</strong>
            </div>
          </div>
        </div>

        <div class="fav-drawer-tip-box" style="margin-top:16px;padding:14px;border-radius:12px;background:#f8f6f0;border:1px dashed rgba(17,41,31,0.14);font-size:12.5px;color:#556b60;line-height:1.5;">
          💡 Bạn có thể dễ dàng quản lý, nhận thông báo giảm giá và mua nhanh danh sách yêu thích bất cứ lúc nào.
        </div>

        ${totalFavs > 1 ? `
          <div class="cart-drawer-extra-info" style="margin-top:14px;">
            Bạn đang có <b>${totalFavs}</b> cuốn sách trong danh sách yêu thích.
          </div>
        ` : ''}
      </div>

      <div class="cart-drawer-footer">
        <div class="cart-drawer-actions" style="grid-template-columns:1fr 1fr;">
          <button type="button" class="btn-drawer-cart" id="fav-drawer-add-cart-btn" data-work-id="${esc(workId)}" style="border-color:#176a45;color:#176a45;">
            🛒 Thêm giỏ hàng
          </button>
          <a href="/favorites" class="btn-drawer-checkout" style="background:#c2410c;border-color:#c2410c;">
            <span>Xem yêu thích</span>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    `;

    favDrawer.querySelector('.cart-drawer-close')?.addEventListener('click', window.closeFavoriteDrawer);

    const addCartBtn = favDrawer.querySelector('#fav-drawer-add-cart-btn');
    if (addCartBtn) {
      addCartBtn.addEventListener('click', async () => {
        addCartBtn.disabled = true;
        addCartBtn.textContent = 'Đang thêm…';
        try {
          const res = await fetch('/api/items/cart', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workId, quantity: 1 })
          });
          if (res.status === 401) {
            location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
            return;
          }
          const payload = await res.json();
          window.closeFavoriteDrawer();
          if (typeof window.updateCartCount === 'function') window.updateCartCount();
          if (typeof window.openCartDrawer === 'function') {
            window.openCartDrawer(item, payload.data);
          }
        } catch (err) {
          addCartBtn.disabled = false;
          addCartBtn.textContent = '🛒 Thêm giỏ hàng';
        }
      });
    }

    requestAnimationFrame(() => {
      favDrawerBackdrop.classList.add('is-visible');
      favDrawer.classList.add('is-open');
    });
  };

  window.closeFavoriteDrawer = function () {
    if (favDrawer) favDrawer.classList.remove('is-open');
    if (favDrawerBackdrop) favDrawerBackdrop.classList.remove('is-visible');
  };

})();

