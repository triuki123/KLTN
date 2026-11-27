(function () {
  'use strict';

  const app = document.querySelector('#app');
  if (!app) return;

  const money = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  async function initFavoritesPage() {
    // 1. Fetch Session and Favorite items in parallel
    let sessionUser = null;
    let favItems = [];

    try {
      const [sessionRes, favRes] = await Promise.all([
        fetch('/api/session', { headers: { Accept: 'application/json' } }),
        fetch('/api/items/favorite', { headers: { Accept: 'application/json' } })
      ]);

      if (sessionRes.ok) {
        const sessionPayload = await sessionRes.json();
        sessionUser = sessionPayload?.data ?? sessionPayload;
      }

      if (favRes.ok) {
        const favPayload = await favRes.json();
        favItems = Array.isArray(favPayload) ? favPayload : (favPayload?.data || []);
      } else if (favRes.status === 401) {
        sessionUser = null;
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }

    // 2. Guest State: Prompt to Log in
    if (!sessionUser || !sessionUser.id) {
      renderGuestPrompt();
      return;
    }

    // 3. Logged-in State: Render items or Empty state
    if (!favItems.length) {
      renderEmptyState();
    } else {
      renderFavoritesGrid(favItems);
    }
  }

  function renderGuestPrompt() {
    app.innerHTML = `
      <section class="favorites-page-shell">
        <div class="favorites-empty-panel">
          <div class="favorites-empty-icon" style="background:#eaf5eb;color:#176a45;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h2>Đăng nhập để xem Sách yêu thích</h2>
          <p>Đăng nhập tài khoản Trạm Sách để đồng bộ danh sách yêu thích và theo dõi ưu đãi các cuốn sách của bạn trên mọi thiết bị.</p>
          <div class="favorites-empty-actions">
            <a class="btn-primary" href="/login?next=/favorites">Đăng nhập ngay</a>
            <a class="btn-secondary" href="/register">Tạo tài khoản mới</a>
          </div>
        </div>
      </section>
    `;
  }

  function renderEmptyState() {
    app.innerHTML = `
      <section class="favorites-page-shell">
        <div class="favorites-empty-panel">
          <div class="favorites-empty-icon">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <h2>Danh sách yêu thích đang trống</h2>
          <p>Bạn chưa lưu cuốn sách nào. Hãy khám phá kho sách tuyển chọn của Trạm Sách và nhấn vào biểu tượng trái tim để lưu lại cuốn sách bạn quan tâm nhé!</p>
          <div class="favorites-empty-actions">
            <a class="btn-primary" href="/books">Khám phá kho sách ngay ↗</a>
            <a class="btn-secondary" href="/">Về trang chủ</a>
          </div>
        </div>
      </section>
    `;
  }

  function renderFavoritesGrid(items) {
    const cardsHtml = items.map(item => {
      const stock = Number(item.stock || 0);
      const isOutOfStock = stock <= 0;
      const coverHtml = item.cover_url
        ? `<img src="${esc(item.cover_url)}" alt="${esc(item.title)}" loading="lazy">`
        : `<div class="fav-cover-fallback">${esc(item.title?.[0] || 'S')}</div>`;

      const hasPromo = Boolean(item.coupon_code || (Number(item.promotional_price || 0) > 0 && Number(item.promotional_price) < Number(item.selling_price || item.unit_price)));
      const promoBadge = hasPromo
        ? `<span class="fav-promo-badge">🔥 Ưu đãi hôm nay</span>`
        : '';

      return `
        <article class="fav-card is-selected" data-work-id="${esc(item.work_id)}" data-title="${esc(item.title)}">
          <div class="fav-card-cover-wrap">
            <label class="fav-card-select-label" title="${isOutOfStock ? 'Sách đã hết hàng' : 'Chọn cuốn này để thêm giỏ'}" aria-label="Chọn ${esc(item.title)}">
              <input type="checkbox" class="fav-item-checkbox" data-work-id="${esc(item.work_id)}" ${isOutOfStock ? 'disabled' : 'checked'}>
              <span class="fav-custom-checkbox"></span>
            </label>
            <a href="/books/${encodeURIComponent(item.work_id)}" style="display:block;height:100%;width:100%;">
              ${coverHtml}
            </a>
            ${promoBadge}
            <button type="button" class="fav-remove-btn" title="Bỏ khỏi yêu thích" aria-label="Xóa khỏi yêu thích" data-work-id="${esc(item.work_id)}">
              <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
          </div>
          <div class="fav-card-content">
            <a class="fav-card-title" href="/books/${encodeURIComponent(item.work_id)}">${esc(item.title)}</a>
            <p class="fav-card-author">${esc(item.authors || 'Chưa rõ tác giả')}</p>
            <div class="fav-card-bottom">
              <div class="fav-card-price-row">
                <span class="fav-card-price">${money(item.unit_price)}</span>
                <span class="fav-card-stock ${isOutOfStock ? 'out' : ''}">${isOutOfStock ? 'Hết hàng' : `Còn ${stock} cuốn`}</span>
              </div>
              <div class="fav-card-actions">
                <button type="button" class="fav-btn-cart" data-work-id="${esc(item.work_id)}" ${isOutOfStock ? 'disabled' : ''}>
                  🛒 Thêm giỏ hàng
                </button>
                <button type="button" class="fav-btn-buy" data-work-id="${esc(item.work_id)}" ${isOutOfStock ? 'disabled' : ''}>
                  Mua ngay
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    const inStockItems = items.filter(it => Number(it.stock || 0) > 0);

    app.innerHTML = `
      <section class="favorites-page-shell">
        <header class="favorites-header">
          <div>
            <div class="favorites-header-title">
              <h1>Sách yêu thích của bạn</h1>
              <span class="favorites-badge-count" id="favorites-count-badge">♥ ${items.length} cuốn sách</span>
            </div>
            <p class="favorites-header-desc">Những tác phẩm bạn đã lưu lại để đọc và mua sắm sau.</p>
          </div>
          <div class="favorites-header-actions-group">
            ${inStockItems.length > 0 ? `
              <div class="fav-selection-pill">
                <label class="fav-select-all-control" title="Chọn tất cả sách còn hàng">
                  <input type="checkbox" id="fav-select-all" checked>
                  <span class="fav-custom-checkbox"></span>
                  <span class="fav-select-text">Chọn tất cả (<b id="fav-selected-count">${inStockItems.length}</b>/<span id="fav-total-instock">${inStockItems.length}</span>)</span>
                </label>
                <button type="button" class="fav-btn-add-all" id="fav-add-all-btn">
                  <span>🛒 Thêm vào giỏ (<span id="fav-btn-count">${inStockItems.length}</span>)</span>
                </button>
              </div>
            ` : ''}
            <a class="favorites-browse-link" href="/books">
              Khám phá thêm sách ↗
            </a>
          </div>
        </header>
        <div class="favorites-grid" id="favorites-cards-grid">
          ${cardsHtml}
        </div>
        <section class="fav-recommendations-section" id="fav-recommendations" style="display:none;">
          <div class="fav-recommendations-head">
            <div>
              <span class="fav-recommendations-eyebrow">✨ Dành riêng cho bạn</span>
              <h2>Có thể bạn cũng thích</h2>
            </div>
            <a href="/books" class="fav-recommendations-more">Xem thêm kho sách →</a>
          </div>
          <div class="favorites-grid fav-rec-grid" id="fav-rec-grid"></div>
        </section>
      </section>
    `;

    bindGridEvents(items);
    loadRecommendations(items);
  }

  function bindGridEvents(items) {
    const grid = document.querySelector('#favorites-cards-grid');

    const updateSelectionUI = () => {
      const inStockBoxes = [...document.querySelectorAll('.fav-item-checkbox:not(:disabled)')];
      const checkedBoxes = inStockBoxes.filter(cb => cb.checked);
      const selCount = checkedBoxes.length;
      const totalInStock = inStockBoxes.length;

      inStockBoxes.forEach(cb => {
        const card = cb.closest('.fav-card');
        if (card) {
          card.classList.toggle('is-selected', cb.checked);
          card.classList.toggle('is-unselected', !cb.checked);
        }
      });

      const selCountEl = document.querySelector('#fav-selected-count');
      const btnCountEl = document.querySelector('#fav-btn-count');
      const selectAllCb = document.querySelector('#fav-select-all');
      const addBtn = document.querySelector('#fav-add-all-btn');

      if (selCountEl) selCountEl.textContent = selCount;
      if (btnCountEl) btnCountEl.textContent = selCount;

      if (selectAllCb) {
        selectAllCb.checked = selCount === totalInStock && totalInStock > 0;
        selectAllCb.indeterminate = selCount > 0 && selCount < totalInStock;
      }

      if (addBtn) {
        if (selCount === 0) {
          addBtn.disabled = true;
          addBtn.innerHTML = '<span>🛒 Chọn sách để thêm</span>';
        } else {
          addBtn.disabled = false;
          addBtn.innerHTML = `<span>🛒 Thêm vào giỏ (${selCount})</span>`;
        }
      }
    };

    // Select-all checkbox listener
    const selectAllCb = document.querySelector('#fav-select-all');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', () => {
        const isChecked = selectAllCb.checked;
        document.querySelectorAll('.fav-item-checkbox:not(:disabled)').forEach(cb => {
          cb.checked = isChecked;
        });
        updateSelectionUI();
      });
    }

    // Individual checkbox listener
    if (grid) {
      grid.addEventListener('change', event => {
        const cb = event.target.closest('.fav-item-checkbox');
        if (cb) updateSelectionUI();
      });

      grid.querySelectorAll('.fav-card-select-label').forEach(lbl => {
        lbl.addEventListener('click', e => e.stopPropagation());
      });
    }

    // Batch Add Selected to Cart
    const addAllBtn = document.querySelector('#fav-add-all-btn');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', async () => {
        const inStockItems = (items || []).filter(it => Number(it.stock || 0) > 0);
        const selectedItems = inStockItems.filter(it => {
          const cb = document.querySelector(`.fav-item-checkbox[data-work-id="${it.work_id}"]`);
          return cb && cb.checked;
        });

        if (!selectedItems.length) {
          if (window.toast) window.toast({ title: 'Thông báo', message: 'Vui lòng chọn ít nhất 1 cuốn sách để thêm vào giỏ.', kind: 'info' });
          return;
        }

        addAllBtn.disabled = true;
        const originalText = addAllBtn.innerHTML;
        addAllBtn.innerHTML = `<span>⏳ Đang thêm ${selectedItems.length} cuốn…</span>`;

        try {
          let addedCount = 0;
          for (const it of selectedItems) {
            try {
              const res = await fetch('/api/items/cart', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workId: it.work_id, quantity: 1 })
              });
              if (res.ok) addedCount++;
            } catch (_) {}
          }

          if (typeof window.updateCartCount === 'function') {
            window.updateCartCount();
          }

          if (window.toast) {
            window.toast({
              title: 'Thành công!',
              message: `Đã thêm ${addedCount} cuốn sách vào giỏ hàng.`,
              kind: 'ok',
              action: { label: 'Xem giỏ hàng', href: '/cart' }
            });
          }

          // Open cart drawer displaying all items
          if (typeof window.openCartDrawer === 'function') {
            window.openCartDrawer();
          }
        } catch (err) {
          if (window.toast) window.toast({ title: 'Lỗi', message: err.message, kind: 'error' });
        } finally {
          addAllBtn.disabled = false;
          updateSelectionUI();
        }
      });
    }

    if (!grid) return;

    grid.addEventListener('click', async event => {
      // 1. Remove from Favorites
      const removeBtn = event.target.closest('.fav-remove-btn');
      if (removeBtn) {
        event.preventDefault();
        event.stopPropagation();
        const card = removeBtn.closest('.fav-card');
        const workId = removeBtn.dataset.workId;
        const title = card?.dataset.title || 'Sách';

        removeBtn.disabled = true;
        try {
          const res = await fetch(`/api/items/favorite/${encodeURIComponent(workId)}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (!res.ok) throw new Error('Không thể xóa khỏi yêu thích');

          card.classList.add('removing');
          setTimeout(() => {
            card.remove();
            const remainingCards = grid.querySelectorAll('.fav-card');
            const badge = document.querySelector('#favorites-count-badge');
            if (badge) badge.textContent = `♥ ${remainingCards.length} cuốn sách`;

            if (typeof window.updateFavoriteCount === 'function') {
              window.updateFavoriteCount();
            }

            if (!remainingCards.length) {
              renderEmptyState();
            }
          }, 280);

          if (window.toast) {
            window.toast({ title: 'Đã xóa khỏi yêu thích', message: title, kind: 'info' });
          }
        } catch (err) {
          removeBtn.disabled = false;
          if (window.toast) window.toast({ title: 'Lỗi', message: err.message, kind: 'error' });
        }
        return;
      }

      // 2. Add to Cart
      const cartBtn = event.target.closest('.fav-btn-cart');
      if (cartBtn) {
        event.preventDefault();
        const card = cartBtn.closest('.fav-card');
        const workId = cartBtn.dataset.workId;
        const coverEl = card?.querySelector('.fav-card-cover-wrap img');
        const title = card?.dataset.title || 'Sách';

        cartBtn.disabled = true;
        const originalText = cartBtn.innerHTML;
        cartBtn.innerHTML = 'Đang thêm…';

        try {
          let flyPromise = Promise.resolve();
          if (coverEl && typeof window.flyToCart === 'function') {
            flyPromise = window.flyToCart(coverEl);
          }

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
          if (!res.ok || !payload.success) throw new Error(payload.message || 'Không thể thêm vào giỏ');

          await flyPromise;

          if (typeof window.updateCartCount === 'function') {
            window.updateCartCount();
          }

          if (typeof window.openCartDrawer === 'function') {
            window.openCartDrawer({
              title,
              quantity: 1,
              cover_url: coverEl?.src || null
            }, payload.data);
          } else if (window.toast) {
            window.toast({
              title: 'Đã thêm vào giỏ hàng',
              message: title,
              kind: 'ok',
              action: { label: 'Xem giỏ hàng', href: '/cart' }
            });
          }
        } catch (err) {
          if (window.toast) window.toast({ title: 'Lỗi', message: err.message, kind: 'error' });
        } finally {
          cartBtn.disabled = false;
          cartBtn.innerHTML = originalText;
        }
        return;
      }

      // 3. Buy Now
      const buyBtn = event.target.closest('.fav-btn-buy');
      if (buyBtn) {
        event.preventDefault();
        const workId = buyBtn.dataset.workId;
        buyBtn.disabled = true;
        buyBtn.textContent = 'Đang xử lý…';
        try {
          const res = await fetch('/api/items/cart', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workId, quantity: 1, selected: true })
          });
          if (res.status === 401) {
            location.assign(`/login?next=/checkout`);
            return;
          }
          location.assign('/checkout');
        } catch (err) {
          buyBtn.disabled = false;
          buyBtn.textContent = 'Mua ngay';
          if (window.toast) window.toast({ title: 'Lỗi', message: err.message, kind: 'error' });
        }
      }
    });
  }

  async function loadRecommendations(currentFavs) {
    const recSection = document.querySelector('#fav-recommendations');
    const recGrid = document.querySelector('#fav-rec-grid');
    if (!recSection || !recGrid) return;

    try {
      const res = await fetch('/api/recommendations?limit=4', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const payload = await res.json();
      const recs = payload?.data || [];
      const favWorkIds = new Set((currentFavs || []).map(f => f.work_id));
      const filtered = recs.filter(b => !favWorkIds.has(b.work_id)).slice(0, 4);

      if (!filtered.length) return;

      recGrid.innerHTML = filtered.map(book => {
        const coverHtml = book.cover_url
          ? `<img src="${esc(book.cover_url)}" alt="${esc(book.title)}" loading="lazy">`
          : `<div class="fav-cover-fallback">${esc(book.title?.[0] || 'S')}</div>`;
        const price = Number(book.promotional_price || book.selling_price || 99000);
        return `
          <article class="fav-card fav-rec-card" data-work-id="${esc(book.work_id)}">
            <div class="fav-card-cover-wrap">
              <a href="/books/${encodeURIComponent(book.work_id)}" style="display:block;height:100%;width:100%;">
                ${coverHtml}
              </a>
              <span class="fav-rec-badge">Gợi ý</span>
            </div>
            <div class="fav-card-content">
              <a class="fav-card-title" href="/books/${encodeURIComponent(book.work_id)}">${esc(book.title)}</a>
              <p class="fav-card-author">${esc(book.authors || 'Chưa rõ tác giả')}</p>
              <div class="fav-card-bottom">
                <div class="fav-card-price-row">
                  <span class="fav-card-price">${money(price)}</span>
                </div>
                <div class="fav-card-actions">
                  <a href="/books/${encodeURIComponent(book.work_id)}" class="fav-btn-view">
                    Xem chi tiết →
                  </a>
                </div>
              </div>
            </div>
          </article>
        `;
      }).join('');

      recSection.style.display = 'block';
    } catch (err) {
      console.warn('Failed to load favorites recommendations:', err);
    }
  }

  // Run immediately on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFavoritesPage);
  } else {
    initFavoritesPage();
  }
})();

