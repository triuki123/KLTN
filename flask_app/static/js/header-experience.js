(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const page = document.body.dataset.page;
  const currentPath = location.pathname;

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
})();
