(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const page = document.body.dataset.page;
  const currentPath = location.pathname;

  /* ── PAGE TRANSITION: progress bar + fade ─────────────────────────── */
  const progressBar = document.createElement('div');
  progressBar.className = 'page-progress-bar';
  document.body.appendChild(progressBar);

  const startProgress = () => {
    progressBar.classList.remove('run', 'done');
    void progressBar.offsetWidth;
    progressBar.classList.add('run');
  };
  const finishProgress = () => {
    progressBar.classList.add('done');
    window.setTimeout(() => progressBar.classList.remove('run', 'done'), 320);
  };

  const isModified = event => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  const isInternalLink = anchor => {
    if (!anchor || anchor.target === '_blank') return false;
    if (anchor.hasAttribute('download')) return false;
    if (anchor.dataset.noTransition !== undefined) return false;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    let url;
    try { url = new URL(anchor.href, location.origin); } catch (_) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === currentPath && url.search === location.search && url.hash) return false;
    return true;
  };

  let transitioning = false;
  document.addEventListener('click', event => {
    if (transitioning) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (isModified(event)) return;
    const anchor = event.target.closest('a');
    if (!anchor || !isInternalLink(anchor)) return;
    event.preventDefault();
    transitioning = true;
    document.body.classList.add('page-leaving');
    startProgress();
    const target = anchor.href;
    const delay = document.body.classList.contains('page-leaving') ? 180 : 0;
    window.setTimeout(() => { location.assign(target); }, delay);
  });

  document.addEventListener('submit', event => {
    if (transitioning) return;
    const form = event.target;
    if (!form || form.target === '_blank') return;
    if (form.dataset.noTransition !== undefined) return;
    if (form.method && form.method.toLowerCase() !== 'get') return;
    transitioning = true;
    document.body.classList.add('page-leaving');
    startProgress();
    window.setTimeout(() => { form.submit(); }, 180);
  });

  window.addEventListener('pageshow', () => {
    finishProgress();
    document.body.classList.remove('page-leaving');
    document.body.classList.remove('page-entered');
    void document.body.offsetWidth;
    document.body.classList.add('page-entered');
  });
  /* ── END PAGE TRANSITION ──────────────────────────────────────────── */

  // Update desktop & mobile nav link active states
  const links = document.querySelectorAll('nav a, .mobile-nav-item, .mobile-drawer-nav a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const active = href === '/' ? page === 'home' : currentPath === href || currentPath.startsWith(`${href}/`);
    if (active) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('active');
    }
  });

  const search = document.querySelector('#header-search');
  search?.addEventListener('submit', event => {
    const input = search.querySelector('input[name="q"]');
    if (!input.value.trim()) {
      event.preventDefault();
      input.focus();
    }
  });

  // Mobile Drawer toggling
  const hamburger = document.querySelector('#header-hamburger');
  const drawer = document.querySelector('#mobile-drawer');
  const backdrop = document.querySelector('#mobile-drawer-backdrop');
  const drawerClose = document.querySelector('#mobile-drawer-close');

  const openDrawer = () => {
    drawer?.classList.add('open');
    backdrop?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer?.classList.remove('open');
    backdrop?.classList.remove('open');
    document.body.style.overflow = '';
  };

  hamburger?.addEventListener('click', openDrawer);
  drawerClose?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  let updating = false;
  const updateCartCount = async () => {
    const cart = document.querySelector('#account-nav .cart');
    const mobileCartBadge = document.querySelector('#mobile-cart-badge');
    if (updating) return;
    updating = true;
    try {
      const response = await fetch('/api/items/cart', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.data;
      if (!Array.isArray(items)) return;

      const count = items.length;
      const countStr = String(Math.min(count, 99));
      if (cart) {
        cart.dataset.count = countStr;
        cart.setAttribute('aria-label', count ? `Giỏ hàng có ${count} sản phẩm` : 'Giỏ hàng');
      }
      if (mobileCartBadge) {
        if (count > 0) {
          mobileCartBadge.textContent = countStr;
          mobileCartBadge.hidden = false;
        } else {
          mobileCartBadge.hidden = true;
        }
      }
    } catch (_) {
    } finally {
      updating = false;
    }
  };

  const accountNav = document.querySelector('#account-nav');
  const drawerAccountSection = document.querySelector('#drawer-account-section');
  const escapeNav = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  fetch('/api/session', { headers: { Accept: 'application/json' } })
    .then(response => response.ok ? response.json() : null)
    .then(payload => {
      const user = payload?.data ?? payload;
      if (!user?.id) return;

      if (accountNav) {
        accountNav.innerHTML = `<a href="/account">${escapeNav(user.name || 'Tài khoản')}</a><a href="/orders">Đơn hàng</a><a class="cart" href="/cart">Giỏ hàng</a><button id="header-logout" class="pill light" type="button">Thoát</button>`;
        document.querySelector('#header-logout')?.addEventListener('click', async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
          location.assign('/');
        });
      }

      if (drawerAccountSection) {
        drawerAccountSection.innerHTML = `<a href="/account"><strong>${escapeNav(user.name || 'Tài khoản')}</strong></a><a href="/orders">Đơn hàng của tôi</a><button id="drawer-logout" class="pill light" type="button" style="width:100%;margin-top:10px;">Đăng xuất</button>`;
        document.querySelector('#drawer-logout')?.addEventListener('click', async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
          location.assign('/');
        });
      }

      updateCartCount();
    })
    .catch(() => {});

  if (!['login', 'register', 'forgot-password', 'reset-password'].includes(page)) updateCartCount();

  /* ── UNIFIED TOAST ───────────────────────────────────────────────── */
  const toastHost = document.createElement('div');
  toastHost.id = 'app-toast-host';
  document.body.appendChild(toastHost);

  const toastIcon = { ok: '✓', error: '✕', warn: '!', info: 'i' };
  window.toast = function ({ title, message, kind = 'info', action, duration = 3200 } = {}) {
    const el = document.createElement('div');
    el.className = `app-toast ${kind === 'error' ? 'error' : kind === 'warn' ? 'warn' : ''}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="app-toast-icon" aria-hidden="true">${toastIcon[kind] || toastIcon.info}</span>
      <div class="app-toast-body">${title ? `<div class="app-toast-title">${escapeNav(title)}</div>` : ''}
        ${message ? `<div class="app-toast-msg">${escapeNav(message)}</div>` : ''}
        ${action && action.href ? `<a class="app-toast-action" href="${escapeNav(action.href)}">${escapeNav(action.label || 'Xem')} →</a>` : ''}
      </div>`;
    toastHost.appendChild(el);
    const dismiss = () => { if (!el.isConnected) return; el.classList.add('leaving'); window.setTimeout(() => el.remove(), 240); };
    el.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      dismiss();
    });
    if (duration > 0) window.setTimeout(dismiss, duration);
    return dismiss;
  };

  /* ── EMPTY STATE BUILDER ─────────────────────────────────────────── */
  const EMPTY_ICON = {
    cart: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="25" cy="55" r="3"/><circle cx="49" cy="55" r="3"/><path d="M5 6h7l5 32a5 5 0 0 0 5 4h22a5 5 0 0 0 5-4l3-18H14"/><path d="M22 22h22" opacity=".5"/></svg>',
    orders: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h26l10 10v36a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z"/><polyline points="40 8 40 18 50 18"/><line x1="18" y1="32" x2="42" y2="32" opacity=".5"/><line x1="18" y1="40" x2="34" y2="40" opacity=".5"/></svg>',
    search: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="28" cy="28" r="18"/><line x1="42" y1="42" x2="56" y2="56"/><line x1="20" y1="28" x2="36" y2="28" opacity=".5"/></svg>',
    coupon: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 18a4 4 0 0 1 4-4h16v36H12a4 4 0 0 1-4-4z"/><path d="M28 14h24a4 4 0 0 1 4 4v14a4 4 0 0 0 0 8v14a4 4 0 0 1-4 4H28z"/><line x1="36" y1="22" x2="48" y2="22" opacity=".5"/><line x1="36" y1="34" x2="46" y2="34" opacity=".5"/><line x1="36" y1="44" x2="42" y2="44" opacity=".5"/></svg>',
    generic: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="22"/><line x1="22" y1="32" x2="42" y2="32" opacity=".5"/><path d="M28 26c0-3 2-5 4-5s4 2 4 5-4 4-4 8" opacity=".5"/><circle cx="32" cy="44" r="1.4" fill="currentColor"/></svg>'
  };
  window.renderEmpty = function (variant, title, message, actions = []) {
    return `<div class="empty-state">
      <div class="empty-illustration" aria-hidden="true">${EMPTY_ICON[variant] || EMPTY_ICON.generic}</div>
      <h3>${escapeNav(title)}</h3>
      <p>${escapeNav(message)}</p>
      ${actions.length ? `<div class="empty-actions">${actions.map(a => `<a class="pill ${a.style === 'primary' ? '' : 'light'}" href="${escapeNav(a.href)}">${escapeNav(a.label)}</a>`).join('')}</div>` : ''}
    </div>`;
  };

  /* ── BOOK CARD MOUSE-TRACK TILT ──────────────────────────────────── */
  if (!('ontouchstart' in window) && matchMedia('(hover: hover)').matches) {
    let rafId = 0;
    let pending = null;
    const apply = card => {
      const wrap = card.querySelector('.book-card-cover-wrap');
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const dx = (pending.x - rect.left) / rect.width - 0.5;
      const dy = (pending.y - rect.top) / rect.height - 0.5;
      wrap.style.setProperty('--rx', `${(-dy * 6).toFixed(2)}deg`);
      wrap.style.setProperty('--ry', `${(dx * 6).toFixed(2)}deg`);
      wrap.style.setProperty('--mx', `${((dx + 0.5) * 100).toFixed(1)}%`);
      wrap.style.setProperty('--my', `${((dy + 0.5) * 100).toFixed(1)}%`);
    };
    const schedule = (card, x, y) => {
      pending = { card, x, y };
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; if (pending) apply(pending.card); });
    };
    document.addEventListener('mousemove', event => {
      const card = event.target.closest('.book-card');
      if (!card) return;
      schedule(card, event.clientX, event.clientY);
    }, { passive: true });
    document.addEventListener('mouseleave', event => {
      const card = event.target.closest && event.target.closest('.book-card');
      if (!card) return;
      const wrap = card.querySelector('.book-card-cover-wrap');
      if (wrap) wrap.style.transform = '';
    }, true);
  }

  /* ── SCROLL REVEAL OBSERVER ───────────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    const reveal = el => el.classList.add('in');
    const singleObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    const staggerObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.04 });

    const scan = root => {
      (root || document).querySelectorAll('.reveal:not(.in)').forEach(el => singleObserver.observe(el));
      (root || document).querySelectorAll('.reveal-stagger:not(.in)').forEach(el => staggerObserver.observe(el));
    };
    scan();

    const auto = document.body.dataset.page;
    if (auto === 'home') {
      document.querySelectorAll('.home-section-v2, .home-hero-v2').forEach(el => el.classList.add('reveal'));
      document.querySelectorAll('#home-books, #home-new-books').forEach(el => el.classList.add('reveal-stagger'));
      scan();
    } else if (auto === 'cart' || auto === 'orders') {
      document.querySelectorAll('.list-item, .order-card').forEach((el, i) => {
        if (i < 8) el.classList.add('reveal');
      });
      scan();
    } else if (auto === 'detail') {
      document.querySelectorAll('.detail-section-heading, .detail-description-panel, .detail-related, #review-section').forEach(el => el.classList.add('reveal'));
      scan();
    } else if (auto === 'books' || auto === 'categories') {
      document.querySelectorAll('.book-card, .home-category-card').forEach((el, i) => { if (i < 16) el.classList.add('reveal'); });
      const grid = document.querySelector('.book-grid, #home-books, .category-grid');
      if (grid) { grid.classList.add('reveal-stagger'); }
      scan();
    }

    const mo = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches && node.matches('.reveal, .reveal-stagger')) scan(node.parentNode || document);
        });
        scan(record.target);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ── ADD-TO-CART FLY ANIMATION ────────────────────────────────────── */
  window.flyToCart = function (sourceEl) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cart = document.querySelector('#account-nav .cart');
    if (!cart || !sourceEl) return;
    const sourceRect = sourceEl.getBoundingClientRect();
    const cartRect = cart.getBoundingClientRect();
    const size = Math.min(sourceRect.width, 140);
    const startX = sourceRect.left + (sourceRect.width - size) / 2;
    const startY = sourceRect.top + (sourceRect.height - size) / 2;
    const endX = cartRect.left + cartRect.width / 2 - size / 2;
    const endY = cartRect.top + cartRect.height / 2 - size / 2;
    const clone = sourceEl.cloneNode(true);
    clone.className = 'fly-clone';
    clone.style.left = `${startX}px`;
    clone.style.top = `${startY}px`;
    clone.style.width = `${size}px`;
    clone.style.height = `${size * 1.3}px`;
    document.body.appendChild(clone);
    const trail = document.createElement('div');
    trail.className = 'fly-trail';
    cart.appendChild(trail);
    requestAnimationFrame(() => {
      const dx = endX - startX;
      const dy = endY - startY;
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.18) rotate(-12deg)`;
      clone.style.opacity = '0.6';
    });
    clone.addEventListener('transitionend', () => {
      clone.remove();
      cart.classList.add('cart-bump');
      trail.remove();
      window.setTimeout(() => cart.classList.remove('cart-bump'), 600);
    }, { once: true });
    window.setTimeout(() => { if (clone.isConnected) clone.remove(); if (trail.isConnected) trail.remove(); }, 1400);
  };
})();
