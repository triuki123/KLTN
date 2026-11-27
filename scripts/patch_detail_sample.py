def patch():
    with open('flask_app/static/js/detail-page-v3.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add Scarcity Alert & Read Sample button in HTML template
    target_row = '<div class="detail-purchase-row">'
    replacement_row = '''${Number(book.stock_quantity || 0) <= 5 && Number(book.stock_quantity || 0) > 0 ? `<div class="detail-scarcity-alert" style="display:inline-flex;align-items:center;gap:6px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:12px;"><span style="font-size:14px;">🔥</span> Chỉ còn <b>${Number(book.stock_quantity)} cuốn</b> trong kho — Nhanh tay kẻo hết!</div>` : ''}
              <div class="detail-purchase-row">'''

    if target_row in c and 'detail-scarcity-alert' not in c:
        c = c.replace(target_row, replacement_row, 1)
        print('Added scarcity alert')

    # Add read sample button next to buy-now
    target_btns = '<button id="buy-now" class="btn-brand" ${available ? \'\' : \'aria-disabled="true"\'}>Mua ngay</button>'
    replacement_btns = '''<button id="buy-now" class="btn-brand" ${available ? '' : 'aria-disabled="true"'}>Mua ngay</button><button id="read-sample-btn" type="button" class="pill light" style="display:inline-flex;align-items:center;gap:6px;font-weight:600;background:#faf8f2;border:1px solid #dcd4c3;color:#1f3d2e;" title="Đọc thử vài trang sách">📖 Đọc thử</button>'''

    if target_btns in c and 'read-sample-btn' not in c:
        c = c.replace(target_btns, replacement_btns, 1)
        print('Added read sample button')

    # 2. Add openReaderModal function and button handler
    reader_logic = '''
  function openReaderModal(sampleData, book) {
    const pages = sampleData?.pages || [];
    if (!pages.length) {
      if (window.toast) window.toast({ title: 'Chưa có bản đọc thử', message: 'Tác phẩm đang được cập nhật nội dung trích đoạn.', kind: 'info' });
      return;
    }

    let currentIdx = 0;
    const modalRoot = document.createElement('div');
    modalRoot.id = 'book-reader-modal-root';
    modalRoot.innerHTML = `
      <div id="reader-backdrop" style="position:fixed;inset:0;background:rgba(17,41,31,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fdfbf7;border-radius:18px;max-width:760px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 70px rgba(0,0,0,0.4);border:1px solid #e7dfd0;overflow:hidden;font-family:'Lora',serif;">
          
          <!-- Reader Topbar -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #eae2d5;background:#f8f5ee;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:22px;">📖</span>
              <div>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:#11291f;line-height:1.2;">${esc(sampleData.title || book.title)}</h3>
                <small style="font-family:'Be Vietnam Pro',sans-serif;color:#6b7280;font-size:12px;">Tác giả: <b>${esc(sampleData.author || book.authors)}</b> · Đọc thử chọn lọc</small>
              </div>
            </div>
            <button type="button" id="reader-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#555;padding:4px 8px;border-radius:6px;line-height:1;">✕</button>
          </div>

          <!-- Reader Chapter Navigation -->
          <div style="display:flex;gap:6px;padding:10px 20px;background:#f4efe6;border-bottom:1px solid #eae2d5;overflow-x:auto;-webkit-overflow-scrolling:touch;font-family:'Be Vietnam Pro',sans-serif;">
            ${pages.map((p, idx) => `
              <button type="button" class="reader-chapter-tab ${idx === 0 ? 'active' : ''}" data-idx="${idx}" style="white-space:nowrap;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid ${idx === 0 ? '#1f3d2e' : '#dcd4c3'};background:${idx === 0 ? '#1f3d2e' : '#fff'};color:${idx === 0 ? '#fff' : '#1f3d2e'};cursor:pointer;">
                ${esc(p.chapter)}
              </button>
            `).join('')}
          </div>

          <!-- Reader Body / Page Content -->
          <div id="reader-content-body" style="flex:1;overflow-y:auto;padding:28px 32px;line-height:1.85;font-size:15.5px;color:#2c2c2c;background:#fdfbf7;">
            <h4 id="reader-chapter-title" style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f3d2e;border-bottom:1px solid #ebd9c0;padding-bottom:8px;">${esc(pages[0].chapter)}</h4>
            <div id="reader-chapter-text" style="white-space:pre-line;">${esc(pages[0].content)}</div>
          </div>

          <!-- Reader Footer CTA -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-top:1px solid #eae2d5;background:#f8f5ee;font-family:'Be Vietnam Pro',sans-serif;flex-wrap:wrap;gap:12px;">
            <div style="font-size:13px;color:#555;">
              Bạn yêu thích tác phẩm này? Mua trọn cuốn với giá <b style="color:#bf5032;font-size:15px;">${money(book.couponPrice || book.price || 99000)}</b>
            </div>
            <div style="display:flex;gap:8px;">
              <button type="button" id="reader-buy-now-btn" class="btn-brand" style="border-radius:8px;padding:8px 18px;font-size:13px;">Mua sách ngay →</button>
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modalRoot);
    const backdrop = modalRoot.querySelector('#reader-backdrop');
    const closeBtn = modalRoot.querySelector('#reader-close-btn');
    const tabs = modalRoot.querySelectorAll('.reader-chapter-tab');
    const chapterTitle = modalRoot.querySelector('#reader-chapter-title');
    const chapterText = modalRoot.querySelector('#reader-chapter-text');
    const contentBody = modalRoot.querySelector('#reader-content-body');
    const buyBtn = modalRoot.querySelector('#reader-buy-now-btn');

    const close = () => modalRoot.remove();
    closeBtn.onclick = close;
    backdrop.onclick = e => { if (e.target === backdrop) close(); };

    tabs.forEach(tab => {
      tab.onclick = () => {
        const idx = Number(tab.dataset.idx);
        currentIdx = idx;
        tabs.forEach(t => {
          const isActive = Number(t.dataset.idx) === idx;
          t.style.background = isActive ? '#1f3d2e' : '#fff';
          t.style.color = isActive ? '#fff' : '#1f3d2e';
          t.style.borderColor = isActive ? '#1f3d2e' : '#dcd4c3';
        });
        chapterTitle.textContent = pages[idx].chapter;
        chapterText.textContent = pages[idx].content;
        contentBody.scrollTop = 0;
      };
    });

    buyBtn.onclick = () => {
      close();
      const actualBuy = document.querySelector('#buy-now');
      if (actualBuy) actualBuy.click();
    };
  }
'''

    # Wire read-sample-btn click
    handler_logic = '''
    const sampleBtn = document.querySelector('#read-sample-btn');
    if (sampleBtn) {
      sampleBtn.onclick = async () => {
        sampleBtn.disabled = true;
        const origText = sampleBtn.innerHTML;
        sampleBtn.innerHTML = 'Đang tải…';
        try {
          const sampleData = await api(`/api/books/${encodeURIComponent(workId)}/sample`);
          openReaderModal(sampleData, book);
        } catch (err) {
          if (window.toast) window.toast({ title: 'Không thể mở đọc thử', message: err.message, kind: 'error' });
        } finally {
          sampleBtn.disabled = false;
          sampleBtn.innerHTML = origText;
        }
      };
    }
'''

    # Insert reader_logic right before renderRelated or boot
    anchor = "document.querySelector('#add-cart').onclick"
    if anchor in c and 'openReaderModal' not in c:
        idx = c.find(anchor)
        c = c[:idx] + reader_logic + '\n' + handler_logic + '\n    ' + c[idx:]
        print('Inserted openReaderModal and handler')

    with open('flask_app/static/js/detail-page-v3.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print('Done patching detail-page-v3.js')

if __name__ == '__main__':
    patch()
