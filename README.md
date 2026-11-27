# Trạm Sách

Website bán sách xây dựng bằng Flask, MySQL và JavaScript thuần. Dự án tích hợp kho sách nội bộ, dữ liệu Open Library, giỏ hàng, thanh toán, đơn hàng, đánh giá, mã giảm giá, trang quản trị và trợ lý Gemini/RAG.

## Chạy nhanh bằng Docker (khuyến nghị)

Yêu cầu duy nhất: Docker Desktop đang chạy.

```powershell
git clone https://github.com/triuki123/KLTN.git
cd KLTN
docker compose up --build
```

Mở <http://localhost:3000>. Ở lần chạy đầu, Docker tự động:

- tạo MySQL và schema `bookstore_kltn`;
- tạo đầy đủ bảng nghiệp vụ mà Flask đang sử dụng;
- thêm danh mục và 30 đầu sách mẫu;
- tạo tài khoản quản trị phát triển.

Tài khoản quản trị mặc định:

- URL: <http://localhost:3000/admin/login>
- Email: `admin@tramsach.local`
- Mật khẩu: `TramSach@123`

Đây chỉ là thông tin dùng cho máy local. Hãy đổi `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `.env` trước khi chia sẻ môi trường hoặc triển khai thật.

### Dừng hoặc tạo lại database Docker

```powershell
docker compose down
```

Database được giữ trong Docker volume. Muốn xóa toàn bộ dữ liệu mẫu và khởi tạo lại từ đầu:

```powershell
docker compose down -v
docker compose up --build
```

Lệnh `down -v` sẽ xóa database Docker hiện tại.

## Cấu hình `.env`

Không commit file `.env` vì file này chứa khóa bí mật. Sao chép `.env.example` thành `.env` nếu muốn thay đổi cấu hình mặc định:

```powershell
Copy-Item .env.example .env
```

Các biến quan trọng:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bookstore_kltn
DB_USER=root
DB_PASSWORD=your-database-password

ADMIN_NAME=Quản trị viên
ADMIN_EMAIL=admin@tramsach.local
ADMIN_PASSWORD=your-admin-password

FLASK_SECRET_KEY=your-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
```

Gemini là tùy chọn. Website vẫn chạy khi không có `GEMINI_API_KEY`; chỉ phần trả lời AI sẽ không hoạt động đầy đủ.

## Chạy không dùng Docker

Yêu cầu Python 3.11+ và MySQL 8.0+.

1. Tạo môi trường Python và cài thư viện:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

2. Import lần lượt các file SQL bằng MySQL Workbench:

```text
database/bookstore_schema.sql
database/migrations/005_create_external_commerce.sql
database/migrations/003_seed_storefront_categories.sql
database/migrations/004_seed_demo_catalog.sql
```

3. Sao chép `.env.example` thành `.env`, điền thông tin MySQL rồi chạy:

```powershell
python app.py
```

## Lưu ý dành cho đồng đội

- Không gửi `.env`, API key, mật khẩu thật hoặc database chứa dữ liệu khách hàng lên GitHub.
- Dữ liệu trong repo là schema và dữ liệu mẫu có thể tái tạo.
- Ảnh tải lên khi dùng Docker được giữ trong volume `tram_sach_uploads`.
- Open Library cần kết nối Internet để tải thêm sách và ảnh bìa.
