# Trạm Sách

Hệ thống bán sách được xây dựng hoàn toàn bằng:

- Python 3 + Flask
- MySQL
- HTML5, CSS3 và JavaScript
- Bootstrap 5

## Cài đặt và chạy

Mở PowerShell tại thư mục gốc của project, sau đó chạy:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Mở `http://localhost:3000` trên trình duyệt.

Website và API Flask chạy chung tại cổng `3000`. Không dùng React, Express, Node.js hoặc npm.

## Chức năng

- Đăng ký, đăng nhập, hồ sơ khách hàng.
- Tìm sách qua Open Library.
- Giỏ hàng, yêu thích, thanh toán, lịch sử đơn hàng và đặt lại đơn.
- Đồng bộ tồn kho MySQL, tự trừ kho khi khách đặt và hoàn kho khi hủy đơn.
- Admin quản lý đơn hàng, tồn kho, lịch sử kho, khách hàng, sách, danh mục, tác giả, nhà xuất bản, nhà cung cấp, phiếu nhập, mã giảm giá, đánh giá, báo cáo và nhật ký.
