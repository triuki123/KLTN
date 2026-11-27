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
    if (event.defaultPrevented) return;
    if (transitioning) return;
    const form = event.target;
    if (!form || form.target === '_blank') return;
    if (form.id === 'chat-form') return;
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

  // ── CATEGORY MEGA DROPDOWN IN HEADER ──
  const catNavLink = document.querySelector('nav a[href="/categories"]');
  if (catNavLink && !document.querySelector('.header-mega-menu')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'header-nav-cat-wrapper';
    catNavLink.parentNode.insertBefore(wrapper, catNavLink);
    wrapper.appendChild(catNavLink);

    catNavLink.innerHTML = `<span>Danh mục</span> <svg class="cat-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;

    const MEGA_CATEGORIES = [
      { slug: 'van-hoc', name: 'Văn học', icon: '📚' },
      { slug: 'kinh-te-kinh-doanh', name: 'Kinh tế & Kinh doanh', icon: '📈' },
      { slug: 'ky-nang-song', name: 'Kỹ năng sống', icon: '💡' },
      { slug: 'tam-ly-giao-duc', name: 'Tâm lý & Giáo dục', icon: '🌿' },
      { slug: 'khoa-hoc-cong-nghe', name: 'Khoa học & Công nghệ', icon: '🔬' },
      { slug: 'thieu-nhi', name: 'Sách Thiếu nhi', icon: '🎈' },
      { slug: 'truyen-tranh-manga', name: 'Truyện Tranh & Manga', icon: '🎨' },
      { slug: 'lich-su-dia-ly', name: 'Lịch sử & Địa lý', icon: '🏛️' },
      { slug: 'suc-khoe-y-hoc', name: 'Sức khỏe & Thể thao', icon: '🏃' },
      { slug: 'ngoai-ngu-tu-dien', name: 'Ngoại ngữ & Từ điển', icon: '🌐' },
      { slug: 'triet-hoc-tam-linh', name: 'Triết học & Tâm linh', icon: '☯️' },
      { slug: 'am-thuc-doi-song', name: 'Ẩm thực & Đời sống', icon: '🍳' }
    ];

    const megaMenu = document.createElement('div');
    megaMenu.className = 'header-mega-menu';
    megaMenu.innerHTML = `
      <div class="mega-menu-head">
        <span>📖 Khám phá 12 chủ đề sách</span>
        <a href="/categories">Tất cả danh mục →</a>
      </div>
      <div class="mega-menu-grid">
        ${MEGA_CATEGORIES.map(c => `
          <a class="mega-menu-item" href="/books?category=${c.slug}">
            <span class="mega-icon">${c.icon}</span>
            <span class="mega-name">${c.name}</span>
          </a>
        `).join('')}
      </div>
    `;
    wrapper.appendChild(megaMenu);
  }

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
  const searchInput = search?.querySelector('input[name="q"]');
  search?.addEventListener('submit', event => {
    if (!searchInput?.value.trim()) {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  // ── Live Search Autocomplete & Smart History ──
  if (search && searchInput) {
    search.style.position = 'relative';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'header-search-clear';
    clearBtn.setAttribute('aria-label', 'Xóa tìm kiếm');
    clearBtn.textContent = '✕';
    clearBtn.hidden = !searchInput.value.trim();
    const submitBtn = search.querySelector('button[type="submit"]');
    if (submitBtn) search.insertBefore(clearBtn, submitBtn);
    else search.appendChild(clearBtn);

    const suggestDropdown = document.createElement('div');
    suggestDropdown.id = 'header-search-suggest';
    suggestDropdown.className = 'header-search-suggest';
    suggestDropdown.hidden = true;
    search.appendChild(suggestDropdown);

    const HISTORY_KEY = 'tram_sach_search_history';
    const getHistory = () => {
      try {
        const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        return Array.isArray(data) ? data : [];
      } catch (_) { return []; }
    };
    const saveHistory = item => {
      const text = String(item || '').trim();
      if (!text || text.length < 2) return;
      const list = getHistory().filter(x => x.toLowerCase() !== text.toLowerCase());
      list.unshift(text);
      if (list.length > 8) list.length = 8;
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (_) {}
    };
    const removeHistoryItem = item => {
      const list = getHistory().filter(x => x.toLowerCase() !== String(item).toLowerCase());
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (_) {}
    };
    const clearHistory = () => {
      try { localStorage.removeItem(HISTORY_KEY); } catch (_) {}
    };

    const escapeHtml = str => String(str || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const highlightMatches = (text, query) => {
      const safe = escapeHtml(text);
      if (!query) return safe;
      const tokens = query.trim().split(/\s+/).filter(Boolean);
      if (!tokens.length) return safe;
      const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      try {
        const regex = new RegExp(`(${escaped})`, 'gi');
        return safe.replace(regex, '<mark>$1</mark>');
      } catch (_) {
        return safe;
      }
    };

    let searchTimer = null;
    let activeSuggestIndex = -1;

    const TRENDING_KEYWORDS = [
      'Manga - Comic',
      'Kinh tế & Đầu tư',
      'Dạy con làm giàu',
      'Tâm lý học',
      'Harry Potter',
      'Sức khỏe & Y học'
    ];

    const renderDropdownInitial = () => {
      activeSuggestIndex = -1;
      const history = getHistory();
      let html = '';

      if (history.length > 0) {
        html += `
          <div class="search-history-section">
            <div class="search-history-head">
              <span>🕒 Lịch sử tìm kiếm</span>
              <button type="button" class="search-history-clear-all" id="clear-all-history">Xóa tất cả</button>
            </div>
            <div class="search-history-tags">
              ${history.map(item => `
                <span class="search-history-chip" data-query="${escapeHtml(item)}">
                  <span>${escapeHtml(item)}</span>
                  <span class="remove-item" title="Xóa" data-remove="${escapeHtml(item)}">✕</span>
                </span>
              `).join('')}
            </div>
          </div>
        `;
      }

      html += `
        <div class="search-suggest-head" style="display:flex;justify-content:space-between;align-items:center">
          <span>🔥 Chủ đề & Từ khóa thịnh hành</span>
        </div>
        <div class="search-trending-tags">
          ${TRENDING_KEYWORDS.map(kw => `<button type="button" class="search-tag-chip" data-query="${kw}">${kw}</button>`).join('')}
        </div>
      `;

      suggestDropdown.innerHTML = html;

      suggestDropdown.querySelectorAll('.search-tag-chip, .search-history-chip > span:first-child').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          const q = el.closest('[data-query]')?.dataset.query || el.dataset.query;
          if (q) {
            saveHistory(q);
            searchInput.value = q;
            clearBtn.hidden = false;
            search.submit();
          }
        });
      });

      suggestDropdown.querySelectorAll('.search-history-chip .remove-item').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          removeHistoryItem(btn.dataset.remove);
          renderDropdownInitial();
        });
      });

      const clearAllBtn = suggestDropdown.querySelector('#clear-all-history');
      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          clearHistory();
          renderDropdownInitial();
        });
      }

      suggestDropdown.hidden = false;
    };

    const renderSuggestions = (items, categories, term) => {
      activeSuggestIndex = -1;
      const safeTerm = escapeHtml(term);
      const hasCategories = Array.isArray(categories) && categories.length > 0;
      const hasBooks = Array.isArray(items) && items.length > 0;

      if (!hasCategories && !hasBooks) {
        suggestDropdown.innerHTML = `<div class="search-suggest-empty">Không tìm thấy sách hoặc chủ đề khớp với "<b>${safeTerm}</b>"</div>`;
        suggestDropdown.hidden = false;
        return;
      }

      let html = '';

      if (hasCategories) {
        html += `
          <div class="search-category-section">
            <div class="search-suggest-head" style="padding-bottom:6px">📁 Chủ đề liên quan</div>
            <div class="search-category-pills">
              ${categories.map(c => `
                <a class="search-category-pill" href="/books?category=${encodeURIComponent(c.slug)}">
                  <span class="icon">🏷️</span>
                  <span>${highlightMatches(c.name, term)}</span>
                </a>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (hasBooks) {
        html += `
          <div class="search-suggest-head" style="display:flex;justify-content:space-between;align-items:center">
            <span>📚 Gợi ý tác phẩm (${items.length})</span>
            <span style="font-size:9px;color:#94a3b8;font-weight:normal">Dùng phím ↑ ↓ để chọn</span>
          </div>
          <div class="search-suggest-list">
            ${items.map((b, idx) => {
              const promo = b.promotional_price && b.promotional_price > 0 ? Number(b.promotional_price) : null;
              const selling = b.selling_price ? Number(b.selling_price) : 99000;
              const finalPrice = promo || selling;
              const discountPercent = promo && promo < selling ? Math.round((1 - promo / selling) * 100) : 0;
              const cover = b.cover_url || b.cover;
              return `<a class="search-suggest-item" data-index="${idx}" href="/books/${encodeURIComponent(b.work_id || b.workId)}">
                ${cover ? `<img src="${cover}" alt="${escapeHtml(b.title)}" loading="lazy">` : `<span class="search-suggest-placeholder">${(b.title?.[0]||'S').toUpperCase()}</span>`}
                <div class="search-suggest-meta">
                  <b>${highlightMatches(b.title, term)}</b>
                  <small>${highlightMatches(b.authors || 'Chưa rõ tác giả', term)}${b.category_name ? ` · <em>${escapeHtml(b.category_name)}</em>` : ''}</small>
                  <div class="search-suggest-price-box">
                    <strong>${finalPrice.toLocaleString('vi-VN')}₫</strong>
                    ${promo && promo < selling ? `<del>${selling.toLocaleString('vi-VN')}₫</del><span class="search-suggest-badge">-${discountPercent}%</span>` : ''}
                  </div>
                </div>
              </a>`;
            }).join('')}
          </div>
        `;
      }

      html += `<a class="search-suggest-all" href="/books?q=${encodeURIComponent(term)}">Xem tất cả kết quả cho "${safeTerm}" →</a>`;
      suggestDropdown.innerHTML = html;

      suggestDropdown.querySelectorAll('.search-suggest-item, .search-category-pill, .search-suggest-all').forEach(el => {
        el.addEventListener('click', () => {
          saveHistory(term);
        });
      });

      suggestDropdown.hidden = false;
    };

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.hidden = true;
      searchInput.focus();
      renderDropdownInitial();
    });

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const query = searchInput.value.trim();
      clearBtn.hidden = !query;

      if (!query) {
        renderDropdownInitial();
        return;
      }
      if (query.length < 2) {
        suggestDropdown.hidden = true;
        return;
      }
      searchTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/books/suggest?q=${encodeURIComponent(query)}&limit=6`);
          const json = await res.json();
          if (json.success) {
            renderSuggestions(json.data || [], json.categories || [], query);
          } else {
            suggestDropdown.hidden = true;
          }
        } catch (_) {
          suggestDropdown.hidden = true;
        }
      }, 180);
    });

    searchInput.addEventListener('keydown', event => {
      if (suggestDropdown.hidden) return;
      const items = suggestDropdown.querySelectorAll('.search-suggest-item');
      if (!items.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeSuggestIndex = (activeSuggestIndex + 1) % items.length;
        items.forEach((item, idx) => item.classList.toggle('active', idx === activeSuggestIndex));
        items[activeSuggestIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeSuggestIndex = (activeSuggestIndex - 1 + items.length) % items.length;
        items.forEach((item, idx) => item.classList.toggle('active', idx === activeSuggestIndex));
        items[activeSuggestIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        if (activeSuggestIndex >= 0 && items[activeSuggestIndex]) {
          event.preventDefault();
          saveHistory(searchInput.value.trim());
          items[activeSuggestIndex].click();
        } else if (searchInput.value.trim()) {
          saveHistory(searchInput.value.trim());
        }
      } else if (event.key === 'Escape') {
        suggestDropdown.hidden = true;
      }
    });

    searchInput.addEventListener('focus', () => {
      const query = searchInput.value.trim();
      clearBtn.hidden = !query;
      if (!query) {
        renderDropdownInitial();
      } else if (query.length >= 2 && suggestDropdown.innerHTML) {
        suggestDropdown.hidden = false;
      }
    });

    document.addEventListener('click', event => {
      if (!search.contains(event.target)) {
        suggestDropdown.hidden = true;
      }
    });
  }

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
  window.updateCartCount = updateCartCount;

  const triggerTargetReaction = (favTarget) => {
    if (!favTarget) return;
    favTarget.classList.remove('pulse-active', 'badge-bump');
    void favTarget.offsetWidth;
    favTarget.classList.add('pulse-active', 'badge-bump');

    // Ripple wave on target
    const ripple = document.createElement('span');
    ripple.className = 'nav-fav-ripple';
    favTarget.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    setTimeout(() => favTarget.classList.remove('pulse-active', 'badge-bump'), 650);
  };

  const triggerFavoriteAnimation = (sourceEl, isAdding = true) => {
    if (!sourceEl) return;

    if (isAdding) {
      // 1. Spring pop on the clicked button
      sourceEl.classList.remove('pop-anim', 'deflate-anim');
      void sourceEl.offsetWidth;
      sourceEl.classList.add('pop-anim');
      setTimeout(() => sourceEl.classList.remove('pop-anim'), 450);

      // 2. Sparkles Burst around the button
      const burst = document.createElement('span');
      burst.className = 'fav-burst-container';
      burst.setAttribute('aria-hidden', 'true');
      const colors = ['#e53935', '#ff4757', '#ffa502', '#ff6b81', '#ff5252', '#e4bd70'];
      const angles = [0, 60, 120, 180, 240, 300];
      angles.forEach((deg, idx) => {
        const dot = document.createElement('span');
        dot.className = 'fav-sparkle';
        dot.style.setProperty('--angle', `${deg}deg`);
        dot.style.setProperty('--dist', `${Math.floor(18 + Math.random() * 8)}px`);
        dot.style.backgroundColor = colors[idx % colors.length];
        burst.appendChild(dot);
      });
      sourceEl.appendChild(burst);
      setTimeout(() => burst.remove(), 600);

      // 3. Mini Flying Heart jumping to Header
      const favTarget = document.querySelector('#account-nav .nav-fav') || document.querySelector('.site-header .nav-fav');
      if (favTarget && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const sRect = sourceEl.getBoundingClientRect();
        const tRect = favTarget.getBoundingClientRect();

        if (sRect.width > 0 && tRect.width > 0) {
          const flyEl = document.createElement('div');
          flyEl.className = 'flying-fav-heart';
          flyEl.style.top = '0px';
          flyEl.style.left = '0px';
          flyEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

          const startX = sRect.left + sRect.width / 2 - 16;
          const startY = sRect.top + sRect.height / 2 - 16;
          const endX = tRect.left + tRect.width / 2 - 16;
          const endY = tRect.top + tRect.height / 2 - 16;
          const dx = endX - startX;
          const dy = endY - startY;

          // Natural arc trajectory that always stays gracefully inside the viewport
          const cp1X = startX + dx * 0.12;
          const cp1Y = startY + dy * 0.58;
          const cp2X = startX + dx * 0.72;
          const cp2Y = Math.max(14, endY - 6);

          const STEPS = 40;
          const keyframes = [];
          const trailPoints = [];

          for (let i = 0; i <= STEPS; i++) {
            const rawT = i / STEPS;
            // Smooth ease-in-out time warping
            const t = rawT < 0.5 ? 2 * rawT * rawT : -1 + (4 - 2 * rawT) * rawT;

            // Pure Cubic Bezier interpolation
            const u = 1 - t;
            const x = u * u * u * startX + 3 * u * u * t * cp1X + 3 * u * t * t * cp2X + t * t * t * endX;
            const y = u * u * u * startY + 3 * u * u * t * cp1Y + 3 * u * t * t * cp2Y + t * t * t * endY;

            // Pure sine wave scale (smooth ramp up, steady glide, smooth contract)
            const scale = 0.5 + Math.sin(rawT * Math.PI) * 0.65;
            const rot = Math.sin(rawT * Math.PI) * (dx < 0 ? -12 : 12);
            const opacity = rawT > 0.88 ? Math.max(0, 1 - (rawT - 0.88) / 0.12) : 1;

            keyframes.push({
              transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`,
              opacity: opacity.toFixed(2),
              offset: rawT
            });

            if (i === 10 || i === 20 || i === 30) {
              trailPoints.push({ x: x + 16 - 3, y: y + 16 - 3, delay: Number((rawT * 560).toFixed(0)) });
            }
          }

          document.body.appendChild(flyEl);

          // Zero-reflow magic trail sparkles
          trailPoints.forEach(pt => {
            setTimeout(() => {
              if (!flyEl.isConnected) return;
              const trail = document.createElement('span');
              trail.className = 'flying-fav-trail';
              trail.style.left = `${pt.x.toFixed(1)}px`;
              trail.style.top = `${pt.y.toFixed(1)}px`;
              document.body.appendChild(trail);
              setTimeout(() => trail.remove(), 400);
            }, pt.delay);
          });

          if (typeof flyEl.animate === 'function') {
            const anim = flyEl.animate(keyframes, { duration: 560, fill: 'forwards', easing: 'linear' });
            anim.onfinish = () => {
              flyEl.remove();
              triggerTargetReaction(favTarget);
            };
          } else {
            setTimeout(() => {
              flyEl.remove();
              triggerTargetReaction(favTarget);
            }, 560);
          }
        } else {
          triggerTargetReaction(favTarget);
        }
      } else if (favTarget) {
        triggerTargetReaction(favTarget);
      }
    } else {
      // Deflate on unlike
      sourceEl.classList.remove('pop-anim', 'deflate-anim');
      void sourceEl.offsetWidth;
      sourceEl.classList.add('deflate-anim');
      setTimeout(() => sourceEl.classList.remove('deflate-anim'), 350);
      const favTarget = document.querySelector('#account-nav .nav-fav') || document.querySelector('.site-header .nav-fav');
      if (favTarget) triggerTargetReaction(favTarget);
    }
  };
  window.triggerFavoriteAnimation = triggerFavoriteAnimation;

  const updateFavoriteCount = async (options = {}) => {
    const fav = document.querySelector('#account-nav .nav-fav');
    try {
      const response = await fetch('/api/items/favorite', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.data;
      if (!Array.isArray(items)) return;
      const count = items.length;
      if (fav) {
        const oldCount = fav.dataset.count;
        const newCountStr = String(Math.min(count, 99));
        fav.dataset.count = newCountStr;
        fav.setAttribute('aria-label', count ? `Yêu thích có ${count} sản phẩm` : 'Sách yêu thích');
        if (options.bump || (oldCount !== undefined && oldCount !== newCountStr)) {
          triggerTargetReaction(fav);
        }
      }
    } catch (_) {}
  };
  window.updateFavoriteCount = updateFavoriteCount;

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
        const adminBtn = user.role === 'ADMIN' ? '<a href="/admin" class="btn-admin-nav" style="background:#0b74e5;color:#fff!important;font-weight:600;padding:4px 10px;border-radius:6px;margin-right:6px;display:inline-flex;align-items:center;gap:4px;font-size:13px;text-decoration:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>⚙ Quản trị</a>' : '';
        accountNav.innerHTML = `${adminBtn}<a href="/account">${escapeNav(user.name || 'Tài khoản')}</a><a class="nav-fav" href="/favorites">♡ Yêu thích</a><a href="/orders">Đơn hàng</a><a class="cart" href="/cart">Giỏ hàng</a><button id="header-logout" class="pill light" type="button">Thoát</button>`;
        document.querySelector('#header-logout')?.addEventListener('click', async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
          location.assign('/');
        });
      }

      if (drawerAccountSection) {
        const adminDrawerBtn = user.role === 'ADMIN' ? '<a href="/admin" style="background:#0b74e5;color:#fff!important;font-weight:600;padding:8px 12px;border-radius:6px;display:block;margin-bottom:8px;text-align:center;text-decoration:none;">⚙ Vào trang Quản trị Admin</a>' : '';
        drawerAccountSection.innerHTML = `${adminDrawerBtn}<a href="/account"><strong>${escapeNav(user.name || 'Tài khoản')}</strong></a><a href="/favorites">Sách yêu thích</a><a href="/orders">Đơn hàng của tôi</a><button id="drawer-logout" class="pill light" type="button" style="width:100%;margin-top:10px;">Đăng xuất</button>`;
        document.querySelector('#drawer-logout')?.addEventListener('click', async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
          location.assign('/');
        });
      }

      updateCartCount();
      updateFavoriteCount();
    })
    .catch(() => {});

  if (!['login', 'register', 'forgot-password', 'reset-password'].includes(page)) {
    updateCartCount();
    updateFavoriteCount();
  }

  /* ── UNIFIED TOAST ───────────────────────────────────────────────── */
  const toastHost = document.createElement('div');
  toastHost.id = 'app-toast-host';
  document.body.appendChild(toastHost);

  const toastIcon = { ok: "✓", error: "✕", warn: "!", info: "i" };
  window.toast = function ({ title, message, kind = "info", action, duration = 3500 } = {}) {
    const el = document.createElement("div");
    const kindClass = kind === "error" ? "error" : kind === "warn" ? "warn" : kind === "ok" ? "ok" : "info";
    el.className = `app-toast ${kindClass}`;
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
      document.querySelector('.detail-related-grid')?.classList.add('reveal-stagger');
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
  if (typeof window.flyToCart !== 'function') {
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
  }

  /* ── BACK TO TOP BUTTON ── */
  const backToTopBtn = document.createElement('button');
  backToTopBtn.type = 'button';
  backToTopBtn.className = 'back-to-top-btn';
  backToTopBtn.setAttribute('aria-label', 'Cuộn lên đầu trang');
  backToTopBtn.innerHTML = '↑';
  document.body.appendChild(backToTopBtn);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 380) {
      backToTopBtn.classList.add('is-visible');
    } else {
      backToTopBtn.classList.remove('is-visible');
    }
  }, { passive: true });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
