# Cơ sở dữ liệu hệ thống bán sách

## Yêu cầu

- MySQL Server 8.0.16 trở lên
- MySQL Workbench 8
- Collation mặc định: `utf8mb4_0900_ai_ci`

## Cách import trong MySQL Workbench

1. Mở MySQL Workbench và kết nối MySQL Server.
2. Chọn **File → Open SQL Script**.
3. Mở tệp `bookstore_schema.sql`.
4. Nhấn biểu tượng tia sét để chạy toàn bộ script.
5. Refresh mục **Schemas**; cơ sở dữ liệu `bookstore_kltn` sẽ xuất hiện.

> Script có lệnh `DROP DATABASE IF EXISTS bookstore_kltn`. Chạy lại script sẽ xóa dữ liệu cũ của schema này.

## Tạo sơ đồ ERD trong Workbench

1. Chọn **Database → Reverse Engineer**.
2. Chọn connection đang dùng và schema `bookstore_kltn`.
3. Hoàn tất wizard, sau đó chọn **Model → Add Diagram** nếu Workbench chưa tự tạo diagram.
4. Dùng **Arrange → Autolayout** để sắp xếp các bảng.
5. Lưu model dưới dạng `bookstore_kltn.mwb`.

## Phạm vi thiết kế

Schema bao phủ:

- người dùng, vai trò và nhiều địa chỉ giao hàng;
- refresh token được băm để quản lý phiên đăng nhập an toàn;
- danh mục cha/con, sách, tác giả nhiều-nhiều, nhà xuất bản và hình ảnh;
- giỏ hàng cho Guest bằng `session_token` và giỏ hàng Customer;
- yêu thích, lịch sử xem để phục vụ gợi ý;
- đơn hàng cùng snapshot tên/giá sách và địa chỉ tại thời điểm mua;
- lịch sử trạng thái đơn, mã giảm giá và lượt sử dụng;
- đánh giá gắn với sản phẩm thực sự đã mua;
- nhà cung cấp, phiếu nhập và lịch sử kho bất biến;
- các view tồn kho, khách hàng và doanh thu cho Admin.

## Quy tắc dành cho backend

Một số quy tắc phải được xử lý trong API/service bằng transaction, không chỉ dựa vào database:

- Chuẩn hóa email về chữ thường trước khi lưu.
- Khi đặt một địa chỉ làm mặc định: cập nhật các địa chỉ khác của cùng người dùng thành `is_default = FALSE`, rồi cập nhật địa chỉ được chọn thành `TRUE` trong cùng một transaction.
- Hash mật khẩu bằng Argon2id hoặc bcrypt; không bao giờ lưu mật khẩu thuần.
- Khi checkout: khóa các dòng sách bằng `SELECT ... FOR UPDATE`, kiểm tra trạng thái/giá/tồn kho, rồi mới tạo đơn và trừ kho.
- Ghi đồng thời `order_items`, `order_status_histories` và `inventory_transactions` trong cùng transaction.
- Chỉ cho phép chuyển trạng thái: `PENDING → CONFIRMED → PREPARING → SHIPPING → COMPLETED`; `CANCELLED` chỉ từ trạng thái hợp lệ.
- Khi hủy đơn, hoàn tồn kho đúng một lần và ghi lịch sử.
- Chỉ cho đánh giá nếu `order_items` thuộc đơn `COMPLETED` của chính người dùng.
- Không cho frontend gửi và quyết định `role_id`, tổng tiền, giá bán hoặc trạng thái hệ thống.
- Tạo tài khoản Admin qua seed của backend với password hash hợp lệ, không chèn mật khẩu mẫu dạng plain text trong SQL.

## Lưu ý triển khai

Các mã `user_code`, `book_code`, `order_code`, `purchase_code`, `supplier_code` phải được backend sinh theo định dạng nghiệp vụ. Không dùng `MAX(id) + 1` vì dễ trùng khi có nhiều request đồng thời; nên dùng sequence riêng, UUID/ULID, hoặc tạo bản ghi trong transaction rồi cập nhật mã từ ID.
