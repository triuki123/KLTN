import os
import re
import uuid
import secrets
import hashlib
import smtplib
import time as _time
from email.message import EmailMessage
import unicodedata
from pathlib import Path
from functools import wraps
from decimal import Decimal
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
import pymysql
import requests
from argon2 import PasswordHasher

# In-memory TTL cache. Key -> (expires_at, payload).
_CACHE = {}
def cache_get(key):
    entry = _CACHE.get(key)
    if not entry: return None
    expires, payload = entry
    if expires < _time.time():
        _CACHE.pop(key, None)
        return None
    return payload
def cache_set(key, payload, ttl):
    _CACHE[key] = (_time.time() + ttl, payload)

from argon2.exceptions import VerifyMismatchError
from werkzeug.utils import secure_filename


def load_local_env():
    """Load local development secrets without requiring another dependency."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.json.ensure_ascii = False
UPLOAD_DIR = Path(app.static_folder) / "uploads" / "covers"
ALLOWED_COVER_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
ph = PasswordHasher()
OPEN_LIBRARY_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "TramSach-KLTN/1.0 (local learning project)",
}
CATEGORY_OPEN_LIBRARY_SUBJECTS = {
    "van-hoc": "literature",
    "kinh-te-kinh-doanh": "business",
    "ky-nang-song": "self_help",
    "tam-ly-giao-duc": "psychology",
    "khoa-hoc-cong-nghe": "science",
    "thieu-nhi": "children",
}
CATEGORY_OPEN_LIBRARY_QUERIES = {
    "van-hoc": "subject:literature",
    "kinh-te-kinh-doanh": "subject:business OR subject:economics",
    "ky-nang-song": "subject:self_help OR subject:personal_development",
    "tam-ly-giao-duc": "subject:psychology OR subject:education",
    "khoa-hoc-cong-nghe": "subject:science OR subject:technology",
    "thieu-nhi": "subject:children OR subject:juvenile_literature",
}

def openlibrary_get(url, **kwargs):
    """Use an identifiable client and predictable timeout for Open Library calls."""
    headers = {**OPEN_LIBRARY_HEADERS, **kwargs.pop("headers", {})}
    timeout = kwargs.pop("timeout", (5, 25))
    last_error = None
    for attempt in range(2):
        try:
            response = requests.get(url, headers=headers, timeout=timeout, **kwargs)
            if response.status_code >= 500 and attempt == 0:
                continue
            return response
        except requests.RequestException as error:
            last_error = error
    raise last_error

@app.after_request
def add_restored_admin_assets(response):
    """Load the complete Flask admin navigation after the existing page script."""
    if response.status_code == 200 and response.content_type.startswith("text/html"):
        html = response.get_data(as_text=True)
        # Dedicated screens do not load the legacy renderer, preventing UI flicker.
        admin_workspace = request.path.startswith("/admin") and request.path != "/admin/login"
        if request.path in ("/", "/books", "/categories", "/orders", "/account", "/checkout") or admin_workspace:
            html = re.sub(r'<script src="/static/js/app\.js[^"]*"></script>', "", html)
        html = re.sub(r"<nav>.*?</nav>", '<nav><a href="/">Trang chủ</a><a href="/books">Sách</a><a href="/categories">Danh mục</a></nav>', html, count=1)
        html = html.replace("</head>", '<link rel="stylesheet" href="/static/css/font-fix.css"></head>')
        if request.path == "/":
            # The dedicated home renderer owns this page. Loading the legacy
            # storefront renderer afterwards can overwrite or interrupt it.
            extra_scripts = ''
        elif request.path in ("/books", "/categories"):
            extra_scripts = '<script src="/static/js/storefront-sync.js"></script><script src="/static/js/storefront-catalog.js"></script><script src="/static/js/openlibrary-client.js"></script>'
        elif request.path == "/orders":
            extra_scripts = '<script src="/static/js/orders-experience.js"></script>'
        elif request.path == "/account":
            extra_scripts = '<script src="/static/js/account-experience.js"></script><script src="/static/js/account-addresses.js"></script><script src="/static/js/storefront-sync.js"></script>'
        elif request.path == "/checkout":
            extra_scripts = '<script src="/static/js/checkout.js"></script><script src="/static/js/checkout-coupon.js?v=20260914-4"></script><script src="/static/js/storefront-sync.js"></script>'
        elif admin_workspace:
            extra_scripts = '<script src="/static/js/admin-shell.js?v=20260914-2"></script><script src="/static/js/admin-shell-edit.js?v=20260915-2"></script><script src="/static/js/admin-book-fields.js"></script><script src="/static/js/admin-coupon-picker.js?v=20260914-3"></script><script src="/static/js/admin-cover-upload.js"></script>'
        else:
            extra_scripts = ''
        response.set_data(html.replace("</body>", extra_scripts + "</body>"))
        response.headers["Content-Type"] = "text/html; charset=utf-8"
    if request.path.startswith("/admin"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    if request.path.startswith("/static/"):
        # Development pages must always use the current UTF-8 CSS and JavaScript.
        if request.path.endswith(".css"):
            response.headers["Content-Type"] = "text/css; charset=utf-8"
        elif request.path.endswith(".js"):
            response.headers["Content-Type"] = "application/javascript; charset=utf-8"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response

ADMIN_LISTS = {
    "account": "SELECT u.id,u.user_code,u.full_name,u.email,u.phone,r.name AS role,u.status,u.last_login_at,u.created_at FROM users u JOIN roles r ON r.id=u.role_id ORDER BY CASE WHEN r.code='ADMIN' THEN 0 ELSE 1 END,u.created_at DESC",
    "customers": "SELECT u.id,u.user_code,u.full_name,u.email,u.phone,u.status,u.created_at,COUNT(o.id) order_count FROM users u JOIN roles r ON r.id=u.role_id AND r.code='CUSTOMER' LEFT JOIN external_orders o ON o.user_id=u.id GROUP BY u.id ORDER BY u.created_at DESC",
    "categories": "SELECT id,name,slug,description,display_order,status,created_at FROM categories ORDER BY display_order,name",
    "authors": "SELECT id,name,slug,biography,status,created_at FROM authors ORDER BY created_at DESC",
    "publishers": "SELECT id,name,slug,email,phone,address,status,created_at FROM publishers ORDER BY created_at DESC",
    "suppliers": "SELECT id,supplier_code,name,phone,email,address,status,created_at FROM suppliers ORDER BY created_at DESC",
    "coupons": "SELECT c.id,c.code,c.name,c.discount_type,c.discount_value,c.maximum_discount,c.minimum_order,c.usage_limit,c.usage_per_customer,c.used_count,c.starts_at,c.ends_at,c.status,GROUP_CONCAT(cp.work_id ORDER BY cp.work_id) work_ids,GROUP_CONCAT(i.title ORDER BY i.title SEPARATOR ', ') product_names FROM coupons c LEFT JOIN external_coupon_products cp ON cp.coupon_id=c.id LEFT JOIN external_book_inventory i ON i.work_id=cp.work_id GROUP BY c.id ORDER BY c.created_at DESC",
    "reviews": "SELECT r.id,r.work_id,u.full_name customer,i.title book,r.rating,r.content,r.status,r.hidden_reason,r.created_at FROM external_book_reviews r JOIN users u ON u.id=r.user_id JOIN external_book_inventory i ON i.work_id=r.work_id ORDER BY r.created_at DESC",
    "imports": "SELECT p.id,p.purchase_code,s.name supplier,p.status,p.total_amount,p.confirmed_at,p.created_at FROM purchase_orders p JOIN suppliers s ON s.id=p.supplier_id ORDER BY p.created_at DESC",
    "books": "SELECT i.work_id,i.isbn,i.title,i.authors,i.description,i.category_id,c.name category,i.publisher_name,i.publication_year,i.page_count,i.cover_url,i.cost_price,i.selling_price,i.promotional_price,i.stock_quantity,i.minimum_stock,i.sold_count,i.status,i.is_featured,i.updated_at FROM external_book_inventory i LEFT JOIN categories c ON c.id=i.category_id ORDER BY i.updated_at DESC",
    "reports": "SELECT status,COUNT(*) order_count,COALESCE(SUM(total_amount),0) revenue FROM external_orders GROUP BY status",
    "logs": "SELECT id,admin_id,action,entity_type,entity_id,description,ip_address,created_at FROM admin_activity_logs ORDER BY created_at DESC LIMIT 500",
}

def db():
    return pymysql.connect(host="localhost", user="root", password="123456", database="bookstore_kltn", charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, autocommit=False)

def ensure_catalog_fields():
    """Add real product fields to the active catalogue without losing books."""
    fields={"isbn":"VARCHAR(20) NULL","description":"LONGTEXT NULL","category_id":"BIGINT UNSIGNED NULL","publisher_name":"VARCHAR(255) NULL","publication_year":"SMALLINT UNSIGNED NULL","page_count":"INT UNSIGNED NULL","cost_price":"DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0","selling_price":"DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 99000","promotional_price":"DECIMAL(15,2) UNSIGNED NULL","status":"ENUM('ACTIVE','HIDDEN','DISCONTINUED') NOT NULL DEFAULT 'ACTIVE'","is_featured":"BOOLEAN NOT NULL DEFAULT FALSE"}
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SHOW COLUMNS FROM external_book_inventory"); existing={row["Field"] for row in cur.fetchall()}
            for name,definition in fields.items():
                if name not in existing: cur.execute(f"ALTER TABLE external_book_inventory ADD COLUMN {name} {definition}")
            cur.execute("UPDATE external_book_inventory SET selling_price=99000 WHERE selling_price IS NULL OR selling_price=0")
        con.commit()
    finally: con.close()

ensure_catalog_fields()

def ensure_external_reviews_table():
    """Create reviews for products sold from external_book_inventory."""
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS external_book_reviews (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NOT NULL,
                work_id VARCHAR(50) NOT NULL,
                rating TINYINT UNSIGNED NOT NULL,
                content TEXT NOT NULL,
                status ENUM('VISIBLE','HIDDEN') NOT NULL DEFAULT 'VISIBLE',
                hidden_reason VARCHAR(500) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_external_review_user_book (user_id,work_id),
                INDEX idx_external_reviews_book (work_id,status,created_at),
                CONSTRAINT fk_external_review_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_external_review_book FOREIGN KEY(work_id) REFERENCES external_book_inventory(work_id) ON DELETE CASCADE,
                CONSTRAINT chk_external_review_rating CHECK (rating BETWEEN 1 AND 5)
            ) ENGINE=InnoDB""")
            cur.execute("SHOW COLUMNS FROM external_book_reviews LIKE 'hidden_reason'")
            if not cur.fetchone():cur.execute("ALTER TABLE external_book_reviews ADD COLUMN hidden_reason VARCHAR(500) NULL AFTER status")
        con.commit()
    finally: con.close()

ensure_external_reviews_table()

def ensure_external_coupon_fields():
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SHOW COLUMNS FROM external_orders");existing={row["Field"] for row in cur.fetchall()}
            fields={"coupon_id":"BIGINT UNSIGNED NULL","coupon_code":"VARCHAR(50) NULL","subtotal":"DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0","discount_amount":"DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0","shipping_fee":"DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0"}
            for name,definition in fields.items():
                if name not in existing:cur.execute(f"ALTER TABLE external_orders ADD COLUMN {name} {definition}")
            cur.execute("""CREATE TABLE IF NOT EXISTS external_coupon_usages (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,coupon_id BIGINT UNSIGNED NOT NULL,
                user_id BIGINT UNSIGNED NOT NULL,order_id BIGINT UNSIGNED NOT NULL,used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_external_coupon_order(coupon_id,order_id),INDEX idx_external_coupon_user(coupon_id,user_id),
                CONSTRAINT fk_external_usage_coupon FOREIGN KEY(coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT,
                CONSTRAINT fk_external_usage_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_external_usage_order FOREIGN KEY(order_id) REFERENCES external_orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB""")
            cur.execute("""CREATE TABLE IF NOT EXISTS external_coupon_products (
                coupon_id BIGINT UNSIGNED NOT NULL,work_id VARCHAR(50) NOT NULL,
                PRIMARY KEY(coupon_id,work_id),INDEX idx_coupon_product_work(work_id),
                CONSTRAINT fk_coupon_product_coupon FOREIGN KEY(coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
                CONSTRAINT fk_coupon_product_book FOREIGN KEY(work_id) REFERENCES external_book_inventory(work_id) ON DELETE CASCADE
            ) ENGINE=InnoDB""")
            cur.execute("ALTER TABLE coupons MODIFY discount_type ENUM('PERCENT','FIXED','FREE_SHIPPING') NOT NULL")
        con.commit()
    finally:con.close()

ensure_external_coupon_fields()

def ensure_order_workflow_fields():
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SHOW COLUMNS FROM external_orders");existing={row["Field"] for row in cur.fetchall()}
            fields={"payment_status":"ENUM('UNPAID','PAID','REFUNDED') NOT NULL DEFAULT 'UNPAID'","shipping_carrier":"VARCHAR(120) NULL","tracking_code":"VARCHAR(120) NULL"}
            for name,definition in fields.items():
                if name not in existing:cur.execute(f"ALTER TABLE external_orders ADD COLUMN {name} {definition}")
            cur.execute("""CREATE TABLE IF NOT EXISTS external_order_status_history (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,order_id BIGINT UNSIGNED NOT NULL,
                status VARCHAR(30) NOT NULL,note VARCHAR(500) NULL,changed_by BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_order_history(order_id,created_at),
                CONSTRAINT fk_external_order_status_history_order FOREIGN KEY(order_id) REFERENCES external_orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB""")
            cur.execute("""INSERT INTO external_order_status_history(order_id,status,note,created_at)
                SELECT o.id,o.status,'Khởi tạo lịch sử từ đơn hàng hiện có',o.created_at FROM external_orders o
                WHERE NOT EXISTS(SELECT 1 FROM external_order_status_history h WHERE h.order_id=o.id)""")
        con.commit()
    finally:con.close()

ensure_order_workflow_fields()

def ensure_cart_selection_field():
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SHOW COLUMNS FROM external_book_items LIKE 'selected'")
            if not cur.fetchone():cur.execute("ALTER TABLE external_book_items ADD COLUMN selected BOOLEAN NOT NULL DEFAULT TRUE AFTER quantity")
        con.commit()
    finally:con.close()

ensure_cart_selection_field()

def ensure_email_verification_table():
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("CREATE TABLE IF NOT EXISTS email_verification_tokens (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,token_hash CHAR(64) NOT NULL UNIQUE,expires_at DATETIME NOT NULL,used_at DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX idx_verify_user(user_id),CONSTRAINT fk_verify_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB")
        con.commit()
    finally:con.close()

ensure_email_verification_table()

def ensure_password_reset_table():
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("CREATE TABLE IF NOT EXISTS password_reset_tokens (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,token_hash CHAR(64) NOT NULL UNIQUE,expires_at DATETIME NOT NULL,used_at DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX idx_reset_user(user_id),CONSTRAINT fk_reset_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB")
        con.commit()
    finally:con.close()

ensure_password_reset_table()

def json_value(value):
    if isinstance(value, Decimal): return float(value)
    if hasattr(value, "isoformat"): return value.isoformat()
    return value

def api_user(role=None):
    def deco(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            if not session.get("user_id"): return jsonify(success=False, message="Vui lòng đăng nhập"), 401
            if role and session.get("role") != role: return jsonify(success=False, message="Bạn không có quyền truy cập"), 403
            return fn(*args, **kwargs)
        return wrapped
    return deco

@app.post("/api/admin/upload-cover")
@api_user("ADMIN")
def upload_cover():
    image = request.files.get("image")
    if not image or not image.filename:
        return jsonify(success=False, message="Vui lòng chọn ảnh bìa"), 422
    extension = secure_filename(image.filename).rsplit(".", 1)[-1].lower() if "." in image.filename else ""
    if extension not in ALLOWED_COVER_EXTENSIONS:
        return jsonify(success=False, message="Chỉ hỗ trợ ảnh PNG, JPG, JPEG, WEBP hoặc GIF"), 422
    if image.mimetype and not image.mimetype.startswith("image/"):
        return jsonify(success=False, message="Tệp đã chọn không phải là ảnh"), 422
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    image.save(UPLOAD_DIR / filename)
    return jsonify(success=True, data={"url": f"/static/uploads/covers/{filename}"}), 201

@app.get("/")
def home(): return render_template("page.html", page="home")
@app.get("/books")
def books(): return render_template("page.html", page="books")
@app.get("/categories")
def categories_page(): return render_template("page.html", page="categories")
@app.get("/books/<work_id>")
def book_detail(work_id): return render_template("page.html", page="detail", work_id=work_id)
@app.get("/login")
def login_page():
    if request.args:
        return redirect(url_for("login_page"))
    return render_template("page.html", page="login")
@app.get("/register")
def register_page(): return render_template("page.html", page="register")
@app.get("/cart")
def cart_page():
    # Keep every item in the cart, but let the customer choose checkout items.
    if session.get("user_id"):
        con=db()
        try:
            with con.cursor() as cur:
                cur.execute("UPDATE external_book_items SET selected=FALSE WHERE user_id=%s AND kind='CART'",(session["user_id"],))
            con.commit()
        finally:
            con.close()
    return render_template("page.html", page="cart")
@app.get("/favorites")
def favorites_page(): return render_template("page.html", page="favorites")
@app.get("/orders")
def orders_page(): return render_template("page.html", page="orders")
@app.get("/account")
def account_page(): return render_template("page.html", page="account")
@app.get("/checkout")
def checkout_page(): return render_template("page.html", page="checkout")
@app.get("/admin")
@app.get("/admin/<module>")
def admin_page(module="dashboard"):
    if session.get("role") != "ADMIN": return redirect(url_for("admin_login"))
    return render_template("page.html", page="admin", module=module)
@app.get("/admin/login")
def admin_login():
    if session.get("role") == "ADMIN":
        return redirect(url_for("admin_page"))
    return render_template("page.html", page="admin-login")

@app.get("/forgot-password")
def forgot_password_page(): return render_template("page.html", page="forgot-password")

@app.get("/reset-password/<token>")
def reset_password_page(token): return render_template("page.html", page="reset-password")

@app.get("/api/session")
def current_session(): return jsonify(success=True, data={"id":session.get("user_id"),"name":session.get("name"),"role":session.get("role")})

@app.get("/api/home")
def home_catalog():
    """Local inventory first (so coupons/prices show), Open Library fills the gap."""
    limit = min(max(int(request.args.get("limit", 8)), 1), 30)
    cache_key = f"home:{limit}"
    cached = cache_get(cache_key)
    if cached is not None: return jsonify(success=True, data=cached)
    local_rows = []
    con = db()
    try:
        with con.cursor() as cur:
            cur.execute("""SELECT i.work_id,i.title,i.authors,i.cover_url,i.stock_quantity,i.sold_count,i.selling_price,i.promotional_price,i.updated_at,
                ac.code AS coupon_code,ac.discount_type AS coupon_discount_type,ac.discount_value AS coupon_discount_value
                FROM external_book_inventory i LEFT JOIN (
                    SELECT cp.work_id,c.code,c.discount_type,c.discount_value,ROW_NUMBER() OVER (PARTITION BY cp.work_id ORDER BY c.discount_value DESC,c.id DESC) priority
                    FROM external_coupon_products cp JOIN coupons c ON c.id=cp.coupon_id
                    WHERE c.status='ACTIVE' AND c.starts_at<=NOW() AND c.ends_at>=NOW() AND (c.usage_limit IS NULL OR c.used_count<c.usage_limit)
                ) ac ON ac.work_id=i.work_id AND ac.priority=1
                WHERE i.stock_quantity>0 AND i.status='ACTIVE' ORDER BY i.is_featured DESC,i.sold_count DESC,i.updated_at DESC LIMIT %s""", (limit,))
            local_rows = [{**{k: json_value(v) for k, v in row.items()}, "source": "mysql"} for row in cur.fetchall()]
    finally:
        con.close()
    remaining = max(limit - len(local_rows), 0)
    if not remaining:
        cache_set(cache_key, local_rows, 300)
        return jsonify(success=True, data=local_rows)
    try:
        response = openlibrary_get("https://openlibrary.org/search.json", params={"q": "language:vie", "limit": remaining, "fields": "key,title,author_name,cover_i,first_publish_year,edition_count"}, timeout=(3, 8))
        response.raise_for_status()
        docs = response.json().get("docs", [])
        ol_rows = [{"work_id": str(book.get("key", "")).split("/")[-1], "title": book.get("title", "Không rõ tên"), "authors": ", ".join(book.get("author_name", [])) or "Chưa rõ tác giả", "cover_url": f"https://covers.openlibrary.org/b/id/{book['cover_i']}-L.jpg" if book.get("cover_i") else None, "stock_quantity": None, "sold_count": 0, "selling_price": None, "promotional_price": None, "source": "openlibrary"} for book in docs if book.get("key")]
        merged = local_rows + ol_rows
        cache_set(cache_key, merged, 300)
        return jsonify(success=True, data=merged)
    except (requests.RequestException, ValueError):
        cache_set(cache_key, local_rows, 60)
        return jsonify(success=True, data=local_rows)

@app.get("/api/categories")
def public_categories():
    cached = cache_get("categories")
    if cached is not None: return jsonify(success=True, data=cached)
    con = db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id,name,slug,description,display_order FROM categories WHERE status='ACTIVE' ORDER BY display_order,name")
            rows = cur.fetchall()
        data = [{key: json_value(value) for key, value in row.items()} for row in rows]
        cache_set("categories", data, 600)
        return jsonify(success=True, data=data)
    finally:
        con.close()

@app.post("/api/auth/login")
def login():
    data=request.get_json() or {}; email=str(data.get("email") or "").strip().lower(); con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT u.id,u.full_name,u.email,u.password_hash,u.status,r.code role FROM users u JOIN roles r ON r.id=u.role_id WHERE LOWER(u.email)=%s",(email,)); user=cur.fetchone()
            if not user or user["status"]!="ACTIVE": return jsonify(success=False,message="Email hoặc mật khẩu không đúng"),401
            try: ph.verify(user["password_hash"],data.get("password",""))
            except (VerifyMismatchError, Exception): return jsonify(success=False,message="Email hoặc mật khẩu không đúng"),401
            session.update(user_id=user["id"],name=user["full_name"],role=user["role"]);cur.execute("UPDATE users SET last_login_at=NOW() WHERE id=%s",(user["id"],));con.commit()
            return jsonify(success=True,data={"name":user["full_name"],"role":user["role"]})
    finally: con.close()

@app.post("/api/auth/register")
def register():
    data=request.get_json() or {}; email=str(data.get("email") or "").strip().lower(); con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE LOWER(email)=%s",(email,))
            if cur.fetchone(): return jsonify(success=False,message="Email đã được sử dụng"),409
            cur.execute("SELECT COALESCE(MAX(id),0)+1 next_id FROM users"); code=f"KH{int(cur.fetchone()['next_id']):06d}"
            cur.execute("INSERT INTO users(user_code,role_id,full_name,email,phone,password_hash) VALUES(%s,2,%s,%s,%s,%s)",(code,data.get("fullName"),email,data.get("phone"),ph.hash(data.get("password",""))));con.commit()
            return jsonify(success=True),201
    finally: con.close()

@app.post("/api/auth/logout")
def logout(): session.clear(); return jsonify(success=True)

@app.route("/api/account",methods=["GET","PATCH"])
@api_user()
def account_api():
    con=db()
    try:
        with con.cursor() as cur:
            if request.method=="PATCH":
                x=request.get_json() or {};name=str(x.get("fullName") or "").strip();email=str(x.get("email") or "").strip().lower();phone=str(x.get("phone") or "").strip()
                if len(name)<2 or "@" not in email or len(phone)<9:return jsonify(success=False,message="Vui lòng nhập đầy đủ thông tin hợp lệ"),422
                cur.execute("SELECT id FROM users WHERE email=%s AND id<>%s",(email,session["user_id"]))
                if cur.fetchone():return jsonify(success=False,message="Email đã được tài khoản khác sử dụng"),409
                cur.execute("UPDATE users SET full_name=%s,email_verified_at=IF(email<>%s,NULL,email_verified_at),email=%s,phone=%s WHERE id=%s",(name,email,email,phone,session["user_id"]));con.commit();session["name"]=name
            cur.execute("SELECT u.user_code,u.full_name,u.email,u.phone,u.avatar_url,u.status,u.email_verified_at,u.last_login_at,u.created_at,r.code role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=%s",(session["user_id"],));profile=cur.fetchone()
            cur.execute("SELECT COUNT(*) order_count,COALESCE(SUM(total_amount),0) total_spent FROM external_orders WHERE user_id=%s",(session["user_id"],));profile.update(cur.fetchone())
            cur.execute("SELECT COUNT(*) favorite_count FROM external_book_items WHERE user_id=%s AND kind='FAVORITE'",(session["user_id"],));profile.update(cur.fetchone())
            cur.execute("SELECT id,recipient_name,phone,province_name,district_name,ward_name,address_line,is_default FROM user_addresses WHERE user_id=%s ORDER BY is_default DESC,updated_at DESC,id DESC",(session["user_id"],));profile["addresses"]=cur.fetchall()
            profile["default_address"]=next((address for address in profile["addresses"] if address["is_default"]),None)
            return jsonify(success=True,data={k:json_value(v) if k not in {"default_address","addresses"} else v for k,v in profile.items()})
    finally:con.close()

@app.post("/api/account/password")
@api_user()
def change_password():
    x=request.get_json() or {};current=x.get("currentPassword","");new=x.get("newPassword","")
    if len(new)<8:return jsonify(success=False,message="Mật khẩu mới phải có ít nhất 8 ký tự"),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT password_hash FROM users WHERE id=%s",(session["user_id"],));user=cur.fetchone()
            try: ph.verify(user["password_hash"],current)
            except Exception:return jsonify(success=False,message="Mật khẩu hiện tại không đúng"),422
            cur.execute("UPDATE users SET password_hash=%s WHERE id=%s",(ph.hash(new),session["user_id"]));con.commit()
        return jsonify(success=True)
    finally:con.close()

@app.post("/api/account/address")
@api_user()
def save_default_address():
    x=request.get_json() or {};required=["recipientName","phone","provinceName","districtName","wardName","addressLine"]
    if any(not str(x.get(field) or "").strip() for field in required):return jsonify(success=False,message="Vui lòng nhập đầy đủ địa chỉ nhận hàng"),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id FROM user_addresses WHERE user_id=%s AND is_default=1 LIMIT 1",(session["user_id"],));row=cur.fetchone()
            values=(str(x["recipientName"]).strip(),str(x["phone"]).strip(),str(x["provinceName"]).strip(),str(x["districtName"]).strip(),str(x["wardName"]).strip(),str(x["addressLine"]).strip())
            if row:cur.execute("UPDATE user_addresses SET recipient_name=%s,phone=%s,province_name=%s,district_name=%s,ward_name=%s,address_line=%s WHERE id=%s",(*values,row["id"]))
            else:cur.execute("INSERT INTO user_addresses(user_id,recipient_name,phone,province_name,district_name,ward_name,address_line,is_default) VALUES(%s,%s,%s,%s,%s,%s,%s,1)",(session["user_id"],*values))
        con.commit();return jsonify(success=True)
    finally:con.close()

def address_values(payload):
    fields=("recipientName","phone","provinceName","districtName","wardName","addressLine")
    values=tuple(str(payload.get(field) or "").strip() for field in fields)
    if any(not value for value in values):
        return None
    return values

@app.post("/api/account/addresses")
@api_user()
def create_address():
    x=request.get_json() or {};values=address_values(x)
    if not values:return jsonify(success=False,message="Vui lòng nhập đầy đủ địa chỉ nhận hàng"),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT COUNT(*) total FROM user_addresses WHERE user_id=%s",(session["user_id"],));first=cur.fetchone()["total"]==0
            make_default=first or bool(x.get("isDefault"))
            if make_default:cur.execute("UPDATE user_addresses SET is_default=0 WHERE user_id=%s",(session["user_id"],))
            cur.execute("INSERT INTO user_addresses(user_id,recipient_name,phone,province_name,district_name,ward_name,address_line,is_default) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)",(session["user_id"],*values,1 if make_default else 0));address_id=cur.lastrowid
        con.commit();return jsonify(success=True,data={"id":address_id}),201
    finally:con.close()

@app.patch("/api/account/addresses/<int:address_id>")
@api_user()
def update_address(address_id):
    x=request.get_json() or {};values=address_values(x)
    if not values:return jsonify(success=False,message="Vui lòng nhập đầy đủ địa chỉ nhận hàng"),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id FROM user_addresses WHERE id=%s AND user_id=%s",(address_id,session["user_id"]));row=cur.fetchone()
            if not row:return jsonify(success=False,message="Không tìm thấy địa chỉ"),404
            if x.get("isDefault"):cur.execute("UPDATE user_addresses SET is_default=0 WHERE user_id=%s",(session["user_id"],))
            cur.execute("UPDATE user_addresses SET recipient_name=%s,phone=%s,province_name=%s,district_name=%s,ward_name=%s,address_line=%s,is_default=IF(%s,1,is_default) WHERE id=%s",(*values,1 if x.get("isDefault") else 0,address_id))
        con.commit();return jsonify(success=True)
    finally:con.close()

@app.patch("/api/account/addresses/<int:address_id>/default")
@api_user()
def set_default_address(address_id):
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id FROM user_addresses WHERE id=%s AND user_id=%s",(address_id,session["user_id"]));row=cur.fetchone()
            if not row:return jsonify(success=False,message="Không tìm thấy địa chỉ"),404
            cur.execute("UPDATE user_addresses SET is_default=(id=%s) WHERE user_id=%s",(address_id,session["user_id"]))
        con.commit();return jsonify(success=True)
    finally:con.close()

@app.delete("/api/account/addresses/<int:address_id>")
@api_user()
def delete_address(address_id):
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT is_default FROM user_addresses WHERE id=%s AND user_id=%s",(address_id,session["user_id"]));row=cur.fetchone()
            if not row:return jsonify(success=False,message="Không tìm thấy địa chỉ"),404
            cur.execute("DELETE FROM user_addresses WHERE id=%s AND user_id=%s",(address_id,session["user_id"]))
            if row["is_default"]:
                cur.execute("UPDATE user_addresses SET is_default=1 WHERE user_id=%s ORDER BY updated_at DESC,id DESC LIMIT 1",(session["user_id"],))
        con.commit();return jsonify(success=True)
    finally:con.close()

@app.post("/api/account/email-verification")
@api_user()
def request_email_verification():
    token=secrets.token_urlsafe(32);token_hash=hashlib.sha256(token.encode()).hexdigest();con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT email,email_verified_at FROM users WHERE id=%s",(session["user_id"],));user=cur.fetchone()
            if user["email_verified_at"]:return jsonify(success=True,data={"verified":True})
            cur.execute("DELETE FROM email_verification_tokens WHERE user_id=%s AND used_at IS NULL",(session["user_id"],))
            cur.execute("INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES(%s,%s,DATE_ADD(NOW(),INTERVAL 30 MINUTE))",(session["user_id"],token_hash));con.commit()
        verification_url=url_for("verify_email",token=token,_external=True);host=os.getenv("SMTP_HOST");sender=os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")
        if host:
            if not sender:return jsonify(success=False,message="Cấu hình SMTP còn thiếu địa chỉ người gửi"),503
            message=EmailMessage();message["Subject"]="Xác thực email Trạm Sách";message["From"]=os.getenv("SMTP_FROM") or os.getenv("SMTP_USER");message["To"]=user["email"]
            message.set_content(f"Xin chào,\n\nMở liên kết sau để xác thực email (hết hạn sau 30 phút):\n{verification_url}\n")
            try:
                with smtplib.SMTP(host,int(os.getenv("SMTP_PORT","587")),timeout=20) as smtp:
                    if os.getenv("SMTP_TLS","true").lower()=="true":smtp.starttls()
                    if os.getenv("SMTP_USER"):smtp.login(os.getenv("SMTP_USER"),os.getenv("SMTP_PASSWORD",""))
                    smtp.send_message(message)
                return jsonify(success=True,data={"verified":False,"delivery":"email"})
            except Exception:return jsonify(success=False,message="Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP"),503
        return jsonify(success=True,data={"verified":False,"verificationUrl":verification_url,"delivery":"development"})
    finally:con.close()

@app.get("/verify-email/<token>")
def verify_email(token):
    token_hash=hashlib.sha256(token.encode()).hexdigest();con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id,user_id FROM email_verification_tokens WHERE token_hash=%s AND used_at IS NULL AND expires_at>NOW() FOR UPDATE",(token_hash,));row=cur.fetchone()
            if not row:return redirect("/account?email=invalid")
            cur.execute("UPDATE users SET email_verified_at=NOW() WHERE id=%s",(row["user_id"],));cur.execute("UPDATE email_verification_tokens SET used_at=NOW() WHERE id=%s",(row["id"],));con.commit()
        return redirect("/account?email=verified")
    finally:con.close()

@app.post("/api/auth/forgot-password")
def request_password_reset():
    email=(request.get_json() or {}).get("email","").strip().lower()
    generic={"message":"Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi."}
    con=db();user=None;reset_url=None
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id,email FROM users WHERE LOWER(email)=%s AND status='ACTIVE'",(email,));user=cur.fetchone()
            if user:
                token=secrets.token_urlsafe(32);token_hash=hashlib.sha256(token.encode()).hexdigest()
                cur.execute("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=%s AND used_at IS NULL",(user["id"],))
                cur.execute("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(%s,%s,DATE_ADD(NOW(),INTERVAL 30 MINUTE))",(user["id"],token_hash))
                reset_url=url_for("reset_password_page",token=token,_external=True)
            con.commit()
    finally:con.close()
    if not user:return jsonify(success=True,data=generic)
    host=os.getenv("SMTP_HOST");sender=os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")
    if host and sender:
        message=EmailMessage();message["Subject"]="Đặt lại mật khẩu Trạm Sách";message["From"]=sender;message["To"]=user["email"]
        message.set_content(f"Xin chào,\n\nMở liên kết sau để tạo mật khẩu mới. Liên kết hết hạn sau 30 phút:\n{reset_url}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.")
        try:
            with smtplib.SMTP(host,int(os.getenv("SMTP_PORT","587")),timeout=20) as smtp:
                if os.getenv("SMTP_TLS","true").lower()=="true":smtp.starttls()
                if os.getenv("SMTP_USER"):smtp.login(os.getenv("SMTP_USER"),os.getenv("SMTP_PASSWORD",""))
                smtp.send_message(message)
        except Exception:return jsonify(success=False,message="Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP"),503
        return jsonify(success=True,data=generic)
    generic["resetUrl"]=reset_url;generic["development"]=True
    return jsonify(success=True,data=generic)

@app.post("/api/auth/reset-password")
def reset_password():
    data=request.get_json() or {};token=data.get("token","");password=data.get("password","")
    if len(password)<8:return jsonify(success=False,message="Mật khẩu mới phải có ít nhất 8 ký tự"),422
    token_hash=hashlib.sha256(token.encode()).hexdigest();con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id,user_id FROM password_reset_tokens WHERE token_hash=%s AND used_at IS NULL AND expires_at>NOW() FOR UPDATE",(token_hash,));row=cur.fetchone()
            if not row:return jsonify(success=False,message="Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"),410
            cur.execute("UPDATE users SET password_hash=%s WHERE id=%s",(ph.hash(password),row["user_id"]))
            cur.execute("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=%s AND used_at IS NULL",(row["user_id"],));con.commit()
        session.clear();return jsonify(success=True,data={"message":"Đã đặt lại mật khẩu thành công"})
    finally:con.close()

@app.get("/api/books")
def search_books():
    query=request.args.get("q") or "language:vie"; page=max(1,int(request.args.get("page",1))); limit=min(50,max(1,int(request.args.get("limit",36)))); source_limit=min(100,max(60,limit))
    try:
        response=openlibrary_get("https://openlibrary.org/search.json",params={"q":query,"page":page,"limit":source_limit,"fields":"key,title,author_name,first_publish_year,cover_i,isbn,edition_count"}); response.raise_for_status(); raw=response.json()
        raw["docs"] = sorted(raw.get("docs", []), key=lambda book: (not bool(book.get("cover_i")), -int(book.get("edition_count") or 0), unicodedata.normalize("NFC", str(book.get("title") or "")).casefold()))
        for book in raw["docs"]:
            book["title"] = unicodedata.normalize("NFC", str(book.get("title") or ""))
            book["author_name"] = [unicodedata.normalize("NFC", str(author)) for author in book.get("author_name", [])]
        items=[{"workId":x.get("key","").split("/")[-1],"title":x.get("title","Không rõ tên"),"authors":x.get("author_name",[]),"year":x.get("first_publish_year"),"cover":f"https://covers.openlibrary.org/b/id/{x['cover_i']}-M.jpg" if x.get("cover_i") else None} for x in raw.get("docs",[])]
        return jsonify(success=True,data={"items":items[:limit],"total":raw.get("numFound",0),"page":page,"source":"openlibrary"})
    except (requests.RequestException, ValueError):
        # The site remains usable when Open Library is blocked or temporarily unavailable.
        con=db()
        try:
            term=f"%{query}%"
            with con.cursor() as cur:
                cur.execute("SELECT work_id,title,authors,cover_url FROM external_book_inventory WHERE title LIKE %s OR authors LIKE %s ORDER BY sold_count DESC,updated_at DESC LIMIT %s",(term,term,limit))
                rows=cur.fetchall()
            items=[{"workId":row["work_id"],"title":row["title"],"authors":row["authors"].split(","),"year":None,"cover":row["cover_url"]} for row in rows]
            return jsonify(success=True,data={"items":items,"total":len(items),"page":1,"source":"mysql-fallback","warning":"openlibrary-unavailable"})
        finally: con.close()

@app.get("/api/books/<work_id>")
def get_book(work_id):
    # Inventory books are rendered from local data first. Waiting for Open
    # Library here made every product click take 10-30 seconds even though
    # the storefront already had enough information in MySQL.
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("""SELECT i.work_id,i.isbn,i.title,i.authors,i.description,i.cover_url,
                i.stock_quantity,i.sold_count,i.selling_price,i.promotional_price,i.publisher_name,
                i.publication_year,i.page_count,c.name category,ac.code coupon_code,
                ac.discount_type coupon_discount_type,ac.discount_value coupon_discount_value,
                ac.maximum_discount coupon_maximum_discount,ac.minimum_order coupon_minimum_order
                FROM external_book_inventory i
                LEFT JOIN categories c ON c.id=i.category_id
                LEFT JOIN (
                    SELECT cp.work_id,co.code,co.discount_type,co.discount_value,
                        co.maximum_discount,co.minimum_order,
                        ROW_NUMBER() OVER (PARTITION BY cp.work_id ORDER BY co.discount_value DESC,co.id DESC) priority
                    FROM external_coupon_products cp JOIN coupons co ON co.id=cp.coupon_id
                    WHERE co.status='ACTIVE' AND co.starts_at<=NOW() AND co.ends_at>=NOW()
                        AND (co.usage_limit IS NULL OR co.used_count<co.usage_limit)
                ) ac ON ac.work_id=i.work_id AND ac.priority=1
                WHERE i.work_id=%s""",(work_id,))
            local=cur.fetchone()
        if local:
            current_price=float(local["promotional_price"] or local["selling_price"])
            coupon_price=None
            if local["coupon_code"]:
                coupon_discount=current_price*float(local["coupon_discount_value"])/100 if local["coupon_discount_type"]=="PERCENT" else float(local["coupon_discount_value"])
                if local["coupon_maximum_discount"] is not None:coupon_discount=min(coupon_discount,float(local["coupon_maximum_discount"]))
                coupon_price=max(0,current_price-coupon_discount)
            return jsonify(success=True,data={
                "workId":local["work_id"],
                "title":local["title"],
                "authors":[name.strip() for name in (local["authors"] or "").split(",") if name.strip()],
                "description":local["description"] or "Thông tin giới thiệu đang được cập nhật.",
                "subjects":[],
                "cover":local["cover_url"],
                "stock":local["stock_quantity"],
                "sold":local["sold_count"],
                "price":local["promotional_price"] or local["selling_price"],
                "originalPrice":local["selling_price"],
                "couponPrice":coupon_price,
                "coupon":({"code":local["coupon_code"],"discountType":local["coupon_discount_type"],"discountValue":json_value(local["coupon_discount_value"]),"minimumOrder":json_value(local["coupon_minimum_order"])} if local["coupon_code"] else None),
                "isbn":local["isbn"],
                "category":local["category"],
                "publisher":local["publisher_name"],
                "publicationYear":local["publication_year"],
                "pageCount":local["page_count"],
                "source":"mysql"
            })
    finally:
        con.close()
    try:
        work=openlibrary_get(f"https://openlibrary.org/works/{work_id}.json", timeout=(2, 7)); work.raise_for_status(); x=work.json()
    except (requests.RequestException, ValueError):
        con=db()
        try:
            with con.cursor() as cur:
                cur.execute("SELECT work_id,title,authors,cover_url,stock_quantity,sold_count FROM external_book_inventory WHERE work_id=%s",(work_id,)); row=cur.fetchone()
            if not row: return jsonify(success=False,message="Không thể lấy dữ liệu sách lúc này."),503
            return jsonify(success=True,data={"workId":row["work_id"],"title":row["title"],"authors":row["authors"].split(","),"description":"Thông tin sách được lưu trong kho nội bộ.","subjects":[],"cover":row["cover_url"],"stock":row["stock_quantity"],"sold":row["sold_count"],"source":"mysql"})
        finally: con.close()
    authors=[]
    for ref in x.get("authors",[])[:4]:
        key=(ref.get("author") or {}).get("key");
        if key:
            try: authors.append(openlibrary_get(f"https://openlibrary.org{key}.json", timeout=(3, 8)).json().get("name",""))
            except Exception: pass
    desc=x.get("description",""); desc=desc.get("value","") if isinstance(desc,dict) else desc
    covers=x.get("covers",[]); con=db()
    try:
        with con.cursor() as cur: cur.execute("SELECT stock_quantity,sold_count,selling_price,promotional_price FROM external_book_inventory WHERE work_id=%s",(work_id,)); stock=cur.fetchone()
    finally: con.close()
    remote=stock is None; stock=stock or {"stock_quantity":20,"sold_count":0,"selling_price":99000,"promotional_price":None}
    return jsonify(success=True,data={"workId":work_id,"title":x.get("title"),"authors":[a for a in authors if a],"description":desc or "Chưa có mô tả.","subjects":x.get("subjects",[])[:8],"cover":f"https://covers.openlibrary.org/b/id/{covers[0]}-L.jpg" if covers else None,"stock":stock["stock_quantity"],"sold":stock["sold_count"],"price":stock["promotional_price"] or stock["selling_price"],"originalPrice":stock["selling_price"],"source":"openlibrary" if remote else "mysql"})

@app.route("/api/books/<work_id>/reviews",methods=["GET","POST"])
def external_book_reviews(work_id):
    con=db()
    try:
        with con.cursor() as cur:
            if request.method=="POST":
                if not session.get("user_id"):
                    return jsonify(success=False,message="Vui lòng đăng nhập để gửi nhận xét."),401
                data=request.get_json() or {}
                try: rating=int(data.get("rating",0))
                except (TypeError,ValueError): rating=0
                content=str(data.get("content") or "").strip()
                if rating<1 or rating>5:return jsonify(success=False,message="Vui lòng chọn từ 1 đến 5 sao."),422
                if len(content)<5:return jsonify(success=False,message="Nhận xét cần có ít nhất 5 ký tự."),422
                if len(content)>2000:return jsonify(success=False,message="Nhận xét không được vượt quá 2.000 ký tự."),422
                cur.execute("SELECT 1 FROM external_book_inventory WHERE work_id=%s",(work_id,))
                if not cur.fetchone():return jsonify(success=False,message="Không tìm thấy sản phẩm."),404
                cur.execute("SELECT 1 FROM external_orders o JOIN external_order_items oi ON oi.order_id=o.id WHERE o.user_id=%s AND oi.work_id=%s AND o.status='COMPLETED' LIMIT 1",(session["user_id"],work_id))
                if not cur.fetchone():return jsonify(success=False,message="Bạn chỉ có thể đánh giá sau khi đơn hàng chứa sản phẩm này đã hoàn tất."),403
                cur.execute("INSERT INTO external_book_reviews(user_id,work_id,rating,content) VALUES(%s,%s,%s,%s) ON DUPLICATE KEY UPDATE rating=VALUES(rating),content=VALUES(content),status='VISIBLE',updated_at=CURRENT_TIMESTAMP",(session["user_id"],work_id,rating,content))
                con.commit()
            cur.execute("SELECT r.id,r.rating,r.content,r.created_at,r.updated_at,u.full_name customer,EXISTS(SELECT 1 FROM external_orders o JOIN external_order_items oi ON oi.order_id=o.id WHERE o.user_id=r.user_id AND oi.work_id=r.work_id AND o.status='COMPLETED') verified_purchase FROM external_book_reviews r JOIN users u ON u.id=r.user_id WHERE r.work_id=%s AND r.status='VISIBLE' ORDER BY r.updated_at DESC",(work_id,))
            rows=cur.fetchall()
            average=round(sum(row["rating"] for row in rows)/len(rows),1) if rows else 0
            can_review=False
            if session.get("user_id"):
                cur.execute("SELECT 1 FROM external_orders o JOIN external_order_items oi ON oi.order_id=o.id WHERE o.user_id=%s AND oi.work_id=%s AND o.status='COMPLETED' LIMIT 1",(session["user_id"],work_id))
                can_review=bool(cur.fetchone())
            return jsonify(success=True,data={"items":rows,"average":average,"count":len(rows),"canReview":can_review,"signedIn":bool(session.get("user_id"))})
    finally: con.close()

@app.patch("/api/admin/reviews/<int:review_id>")
@api_user("ADMIN")
def moderate_external_review(review_id):
    data=request.get_json() or {};status=str(data.get("status") or "").upper();reason=str(data.get("reason") or "").strip()
    if status not in ("VISIBLE","HIDDEN"):return jsonify(success=False,message="Trạng thái đánh giá không hợp lệ."),422
    if status=="HIDDEN" and len(reason)<3:return jsonify(success=False,message="Vui lòng nhập lý do ẩn nhận xét."),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("UPDATE external_book_reviews SET status=%s,hidden_reason=%s WHERE id=%s",(status,reason if status=="HIDDEN" else None,review_id))
            if not cur.rowcount:return jsonify(success=False,message="Không tìm thấy nhận xét."),404
        con.commit();return jsonify(success=True)
    finally:con.close()

@app.get("/api/category-books/<slug>")
def category_books(slug):
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT name FROM categories WHERE slug=%s AND status='ACTIVE'",(slug,))
            active_category=cur.fetchone()
    finally: con.close()
    if not active_category:return jsonify(success=False,message="Danh muc khong ton tai"),404
    subject=CATEGORY_OPEN_LIBRARY_SUBJECTS.get(slug,active_category["name"])
    query=CATEGORY_OPEN_LIBRARY_QUERIES.get(slug,active_category["name"])
    page = max(1, int(request.args.get("page", 1)))
    limit = min(50, max(1, int(request.args.get("limit", 36))))
    try:
        source_limit=min(100,max(60,limit))
        response=openlibrary_get("https://openlibrary.org/search.json",params={"q":query,"page":page,"limit":source_limit,"fields":"key,title,author_name,first_publish_year,cover_i,edition_count"},timeout=(5,18))
        response.raise_for_status()
        raw=response.json()
        docs=sorted(raw.get("docs",[]),key=lambda book:(not bool(book.get("cover_i")),-int(book.get("edition_count") or 0),unicodedata.normalize("NFC",str(book.get("title") or "")).casefold()))
        items=[{
            "workId":str(book.get("key","")).split("/")[-1],
            "title":unicodedata.normalize("NFC",str(book.get("title") or "Khong ro ten")),
            "authors":[unicodedata.normalize("NFC",str(author)) for author in book.get("author_name",[])],
            "year":book.get("first_publish_year"),
            "cover":f"https://covers.openlibrary.org/b/id/{book['cover_i']}-M.jpg" if book.get("cover_i") else None,
        } for book in docs[:limit] if book.get("key")]
        return jsonify(success=True,data={"items":items,"total":raw.get("numFound",len(items)),"page":page,"source":"openlibrary-search","subject":subject})
    except (requests.RequestException, ValueError):
        con=db()
        try:
            with con.cursor() as cur:
                cur.execute("SELECT work_id,title,authors,cover_url FROM external_book_inventory ORDER BY (cover_url IS NULL),sold_count DESC,updated_at DESC LIMIT %s",(limit,))
                rows=cur.fetchall()
            items=[{"workId":row["work_id"],"title":row["title"],"authors":row["authors"].split(","),"year":None,"cover":row["cover_url"]} for row in rows]
            return jsonify(success=True,data={"items":items,"total":len(items),"page":1,"source":"mysql-fallback","subject":subject,"warning":"openlibrary-unavailable"})
        finally: con.close()

@app.route("/api/items/<kind>",methods=["GET","POST"])
@api_user()
def items(kind):
    kind=kind.upper(); con=db()
    try:
        with con.cursor() as cur:
            if request.method=="POST":
                x=request.get_json() or {}; work_id=str(x.get("workId") or "").strip()
                if not work_id:return jsonify(success=False,message="Mã sách không hợp lệ"),422
                cur.execute("SELECT stock_quantity,selling_price,promotional_price,title,authors,cover_url,status FROM external_book_inventory WHERE work_id=%s",(work_id,)); stock=cur.fetchone()
                if not stock:
                    try:
                        response=openlibrary_get(f"https://openlibrary.org/works/{work_id}.json",timeout=(3,8));response.raise_for_status();book=response.json()
                        title=str(book.get("title") or "").strip();covers=book.get("covers") or []
                        authors=[]
                        for ref in book.get("authors",[])[:4]:
                            key=(ref.get("author") or {}).get("key")
                            if key:
                                try:authors.append(str(openlibrary_get(f"https://openlibrary.org{key}.json",timeout=(2,5)).json().get("name") or "").strip())
                                except (requests.RequestException,ValueError):pass
                        if not title:return jsonify(success=False,message="Không tìm thấy sách từ Open Library"),404
                        cover_url=f"https://covers.openlibrary.org/b/id/{covers[0]}-L.jpg" if covers else None
                        cur.execute("INSERT INTO external_book_inventory(work_id,title,authors,cover_url,stock_quantity,minimum_stock,selling_price,status) VALUES(%s,%s,%s,%s,20,5,99000,'ACTIVE')",(work_id,title,", ".join(name for name in authors if name) or "Chưa rõ tác giả",cover_url))
                        cur.execute("SELECT stock_quantity,selling_price,promotional_price,title,authors,cover_url,status FROM external_book_inventory WHERE work_id=%s",(work_id,));stock=cur.fetchone()
                    except (requests.RequestException,ValueError):return jsonify(success=False,message="Không thể thêm sách từ Open Library lúc này"),503
                if kind=="CART" and stock["stock_quantity"]<1: return jsonify(success=False,message="Sách hiện đã hết hàng"),422
                if stock["status"]!='ACTIVE': return jsonify(success=False,message="Sản phẩm hiện không được bán"),422
                try: quantity=max(1,int(x.get("quantity",1)))
                except (TypeError,ValueError): quantity=1
                if kind=="CART" and quantity>stock["stock_quantity"]:return jsonify(success=False,message=f"Kho chỉ còn {stock['stock_quantity']} cuốn"),422
                if kind!="CART":quantity=1
                price=stock["promotional_price"] or stock["selling_price"]
                selected=1 if kind=="CART" and bool(x.get("selected",False)) else 0
                cur.execute("INSERT INTO external_book_items(user_id,work_id,kind,title,authors,cover_url,quantity,selected,unit_price) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE quantity=IF(kind='CART',LEAST(quantity+VALUES(quantity),%s),quantity),selected=IF(kind='CART',VALUES(selected),selected),unit_price=VALUES(unit_price)",(session["user_id"],work_id,kind,stock["title"],stock["authors"],stock["cover_url"],quantity,selected,price,stock["stock_quantity"]));con.commit()
            selected_only=kind=="CART" and request.args.get("selected") in {"1","true"}
            selection_sql=" AND i.selected=TRUE" if selected_only else ""
            cur.execute(f"""SELECT i.*,COALESCE(s.stock_quantity,0) stock,
                ac.code coupon_code,ac.discount_type coupon_discount_type,ac.discount_value coupon_discount_value
                FROM external_book_items i
                LEFT JOIN external_book_inventory s ON s.work_id=i.work_id
                LEFT JOIN (
                    SELECT cp.work_id,c.code,c.discount_type,c.discount_value,
                        ROW_NUMBER() OVER (PARTITION BY cp.work_id ORDER BY c.discount_value DESC,c.id DESC) priority
                    FROM external_coupon_products cp JOIN coupons c ON c.id=cp.coupon_id
                    WHERE c.status='ACTIVE' AND c.starts_at<=NOW() AND c.ends_at>=NOW()
                        AND (c.usage_limit IS NULL OR c.used_count<c.usage_limit)
                ) ac ON ac.work_id=i.work_id AND ac.priority=1
                WHERE i.user_id=%s AND i.kind=%s{selection_sql} ORDER BY i.created_at DESC""",(session["user_id"],kind)); rows=cur.fetchall()
            return jsonify(success=True,data=[{k:json_value(v) for k,v in r.items()} for r in rows])
    finally: con.close()

@app.route("/api/items/<kind>/<work_id>",methods=["PATCH","DELETE"])
@api_user()
def delete_item(kind,work_id):
    kind=kind.upper()
    con=db()
    try:
        with con.cursor() as cur:
            if request.method=="PATCH":
                if kind!="CART":return jsonify(success=False,message="Chỉ có thể thay đổi số lượng trong giỏ hàng"),422
                payload=request.get_json() or {}
                if "selected" in payload:
                    selected=1 if payload.get("selected") else 0
                    cur.execute("UPDATE external_book_items SET selected=%s WHERE user_id=%s AND kind='CART' AND work_id=%s",(selected,session["user_id"],work_id));con.commit()
                    if not cur.rowcount:return jsonify(success=False,message="Không tìm thấy sản phẩm trong giỏ hàng"),404
                    return jsonify(success=True,data={"selected":bool(selected)})
                try:quantity=int(payload.get("quantity"))
                except (TypeError,ValueError):return jsonify(success=False,message="Số lượng không hợp lệ"),422
                if quantity<1:return jsonify(success=False,message="Số lượng tối thiểu là 1"),422
                cur.execute("SELECT i.unit_price,s.stock_quantity FROM external_book_items i JOIN external_book_inventory s ON s.work_id=i.work_id WHERE i.user_id=%s AND i.kind='CART' AND i.work_id=%s FOR UPDATE",(session["user_id"],work_id));item=cur.fetchone()
                if not item:return jsonify(success=False,message="Không tìm thấy sản phẩm trong giỏ hàng"),404
                if quantity>item["stock_quantity"]:return jsonify(success=False,message=f"Kho chỉ còn {item['stock_quantity']} cuốn"),422
                cur.execute("UPDATE external_book_items SET quantity=%s WHERE user_id=%s AND kind='CART' AND work_id=%s",(quantity,session["user_id"],work_id));con.commit()
                return jsonify(success=True,data={"quantity":quantity,"stock":item["stock_quantity"],"lineTotal":float(item["unit_price"])*quantity})
            cur.execute("DELETE FROM external_book_items WHERE user_id=%s AND kind=%s AND work_id=%s",(session["user_id"],kind,work_id));con.commit();return jsonify(success=True)
    finally: con.close()

@app.post("/api/cart/selection/reset")
@api_user()
def reset_cart_selection():
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("UPDATE external_book_items SET selected=FALSE WHERE user_id=%s AND kind='CART'",(session["user_id"],))
        con.commit()
        return jsonify(success=True,data={"selectedCount":0})
    finally:
        con.close()

def chat_normalize(value):
    text=unicodedata.normalize("NFD",str(value or "").lower())
    return "".join(char for char in text if unicodedata.category(char)!="Mn").replace("đ","d")

@app.post("/api/chat")
def storefront_chat():
    data=request.get_json(silent=True) or {};message=str(data.get("message") or "").strip()
    if not message:return jsonify(success=False,message="Bạn hãy nhập câu hỏi."),422
    if len(message)>500:return jsonify(success=False,message="Câu hỏi không được vượt quá 500 ký tự."),422
    normalized=chat_normalize(message);actions=[];products=[]

    if any(key in normalized for key in ("doi tra","tra hang","hoan hang")):
        return jsonify(success=True,data={"message":"Trạm Sách hỗ trợ đổi trả trong 7 ngày khi sách bị lỗi, hư hỏng hoặc giao sai sản phẩm. Bạn nên giữ hóa đơn và chụp ảnh tình trạng sách để được hỗ trợ nhanh.","products":[],"actions":[{"label":"Xem đơn hàng","url":"/orders"}]})
    if any(key in normalized for key in ("giao hang","van chuyen","ship")):
        return jsonify(success=True,data={"message":"Đơn từ 299.000đ được miễn phí vận chuyển. Thời gian giao dự kiến 2–5 ngày tùy khu vực và địa chỉ nhận hàng.","products":[],"actions":[{"label":"Xem giỏ hàng","url":"/cart"}]})
    if any(key in normalized for key in ("thanh toan","cod","chuyen khoan")):
        return jsonify(success=True,data={"message":"Bạn có thể thanh toán khi nhận hàng (COD). Phí vận chuyển và tổng tiền sẽ được hiển thị rõ tại bước thanh toán.","products":[],"actions":[{"label":"Đi đến thanh toán","url":"/checkout"}]})
    if any(key in normalized for key in ("don hang","don cua toi","dang giao","ma don")):
        if not session.get("user_id"):
            return jsonify(success=True,data={"message":"Bạn cần đăng nhập để tôi tra cứu đơn hàng đúng theo tài khoản.","products":[],"actions":[{"label":"Đăng nhập","url":"/login?next=/orders"}]})
        con=db()
        try:
            with con.cursor() as cur:cur.execute("SELECT order_code,status,total_amount,created_at FROM external_orders WHERE user_id=%s ORDER BY created_at DESC LIMIT 3",(session["user_id"],));orders=cur.fetchall()
        finally:con.close()
        labels={"PENDING":"Chờ xác nhận","CONFIRMED":"Đã xác nhận","PREPARING":"Đang chuẩn bị","SHIPPING":"Đang giao","COMPLETED":"Hoàn tất","CANCELLED":"Đã hủy"}
        summary="\n".join(f"• {row['order_code']}: {labels.get(row['status'],row['status'])} — {int(row['total_amount']):,}đ".replace(",",".") for row in orders)
        return jsonify(success=True,data={"message":f"Các đơn hàng gần nhất của bạn:\n{summary}" if orders else "Bạn chưa có đơn hàng nào.","products":[],"actions":[{"label":"Xem tất cả đơn hàng","url":"/orders"}]})

    max_price=None
    price_match=re.search(r"(?:duoi|dưới|toi da|tối đa|khoang|khoảng)\s*([0-9][0-9\.\,]*)\s*(k|nghin|nghìn|d|đ)?",message.lower())
    if price_match:
        raw=re.sub(r"[^0-9]","",price_match.group(1));max_price=int(raw or 0)
        if price_match.group(2) in ("k","nghin","nghìn") and max_price<10000:max_price*=1000
    stop={"tim","kiem","sach","goi","y","cho","toi","minh","con","hang","khong","gia","duoi","toi","da","khoang","muon","mua","mot","cuon","ve","the","loai","tac","gia","nao","hay"}
    terms=[term for term in re.findall(r"[a-z0-9]+",normalized) if len(term)>1 and term not in stop and not term[0].isdigit()]
    category_hints={"tre em":"thiếu nhi","thieu nhi":"thiếu nhi","kinh doanh":"kinh tế","tam ly":"tâm lý","ky nang":"kỹ năng","cong nghe":"công nghệ","van hoc":"văn học"}
    hinted=next((value for key,value in category_hints.items() if key in normalized),None)
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT i.work_id,i.title,i.authors,i.cover_url,i.stock_quantity,i.selling_price,i.promotional_price,c.name category FROM external_book_inventory i LEFT JOIN categories c ON c.id=i.category_id WHERE i.status='ACTIVE' AND i.stock_quantity>0 ORDER BY i.is_featured DESC,i.sold_count DESC,i.updated_at DESC LIMIT 150")
            rows=cur.fetchall()
    finally:con.close()
    def score(row):
        haystack=chat_normalize(" ".join(str(row.get(key) or "") for key in ("title","authors","category")))
        points=sum(4 if term in chat_normalize(row["title"]) else 2 if term in chat_normalize(row["authors"]) else 1 for term in terms if term in haystack)
        if hinted and chat_normalize(hinted) in haystack:points+=5
        return points
    filtered=[]
    for row in rows:
        price=row["promotional_price"] or row["selling_price"]
        if max_price and price>max_price:continue
        row["score"]=score(row);filtered.append(row)
    filtered.sort(key=lambda row:row["score"],reverse=True)
    selected=[row for row in filtered if row["score"]>0][:4] if terms or hinted else filtered[:4]
    products=[{"workId":row["work_id"],"title":row["title"],"authors":row["authors"],"cover":row["cover_url"],"stock":row["stock_quantity"],"price":float(row["promotional_price"] or row["selling_price"])} for row in selected]
    if products:reply="Tôi tìm được một số cuốn phù hợp trong kho. Bạn có thể mở chi tiết hoặc thêm trực tiếp vào giỏ hàng."
    elif terms:reply="Tôi chưa tìm thấy sách phù hợp đang còn hàng. Bạn thử rút gọn tên sách hoặc nhập tên tác giả nhé."
    else:reply="Tôi có thể tìm sách, gợi ý theo thể loại hoặc khoảng giá, kiểm tra đơn hàng và giải đáp chính sách giao hàng, thanh toán, đổi trả."
    return jsonify(success=True,data={"message":reply,"products":products,"actions":[{"label":"Xem toàn bộ sách","url":"/books"}] if not products else []})

@app.get("/api/orders")
@api_user()
def my_orders():
    con=db(); result=[]
    try:
        with con.cursor() as cur:
            cur.execute("SELECT * FROM external_orders WHERE user_id=%s ORDER BY created_at DESC",(session["user_id"],))
            for order in cur.fetchall():
                cur.execute("SELECT * FROM external_order_items WHERE order_id=%s",(order["id"],)); order["items"]=cur.fetchall();result.append({k:json_value(v) if k!="items" else [{ik:json_value(iv) for ik,iv in i.items()} for i in v] for k,v in order.items()})
                cur.execute("SELECT status,note,created_at FROM external_order_status_history WHERE order_id=%s ORDER BY created_at,id",(order["id"],));order["history"]=cur.fetchall();result[-1]["history"]=[{k:json_value(v) for k,v in row.items()} for row in order["history"]]
        return jsonify(success=True,data=result)
    finally: con.close()

@app.patch("/api/orders/<int:order_id>/cancel")
@api_user()
def cancel_my_order(order_id):
    """Customers may only cancel an order before an administrator confirms it."""
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT order_code,status FROM external_orders WHERE id=%s AND user_id=%s FOR UPDATE",(order_id,session["user_id"]));order=cur.fetchone()
            if not order:return jsonify(success=False,message="Không tìm thấy đơn hàng"),404
            if str(order["status"]).upper()!="PENDING":return jsonify(success=False,message="Chỉ có thể hủy đơn đang chờ xác nhận"),422
            cur.execute("SELECT work_id,quantity FROM external_order_items WHERE order_id=%s",(order_id,))
            for item in cur.fetchall():
                cur.execute("SELECT stock_quantity FROM external_book_inventory WHERE work_id=%s FOR UPDATE",(item["work_id"],));stock=cur.fetchone();before=stock["stock_quantity"] if stock else 0;after=before+item["quantity"]
                cur.execute("UPDATE external_book_inventory SET stock_quantity=%s,sold_count=GREATEST(0,sold_count-%s) WHERE work_id=%s",(after,item["quantity"],item["work_id"]))
                cur.execute("INSERT INTO external_inventory_transactions(work_id,transaction_type,quantity_change,quantity_before,quantity_after,reference_code,reason,created_by) VALUES(%s,'CANCEL_RETURN',%s,%s,%s,%s,'Khách hàng hủy đơn trước khi xác nhận',%s)",(item["work_id"],item["quantity"],before,after,order["order_code"],session["user_id"]))
            cur.execute("SELECT coupon_id,coupon_code FROM external_orders WHERE id=%s",(order_id,));order_coupon=cur.fetchone()
            if order_coupon and order_coupon["coupon_id"]:
                cur.execute("SELECT id FROM external_coupon_usages WHERE coupon_id=%s AND order_id=%s LIMIT 1",(order_coupon["coupon_id"],order_id));usage=cur.fetchone()
                if usage:
                    cur.execute("DELETE FROM external_coupon_usages WHERE id=%s",(usage["id"],))
                    cur.execute("UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=%s",(order_coupon["coupon_id"],))
            cur.execute("UPDATE external_orders SET status='CANCELLED' WHERE id=%s",(order_id,))
            cur.execute("INSERT INTO external_order_status_history(order_id,status,note,changed_by) VALUES(%s,'CANCELLED','Khách hàng đã hủy đơn',%s)",(order_id,session["user_id"]))
        con.commit();return jsonify(success=True)
    except Exception:
        con.rollback();raise
    finally:con.close()

def validate_coupon(cur,code,items,user_id):
    code=str(code or "").strip().upper()
    if not code:return None,0
    subtotal=sum(float(item["unit_price"])*item["quantity"] for item in items)
    cur.execute("SELECT * FROM coupons WHERE UPPER(code)=%s FOR UPDATE",(code,));coupon=cur.fetchone()
    if not coupon:return None,"Mã giảm giá không tồn tại."
    if coupon["status"]!="ACTIVE":return None,"Mã giảm giá đang tạm ngừng."
    cur.execute("SELECT NOW() AS server_now");now=cur.fetchone()["server_now"]
    if coupon["starts_at"]>now:return None,"Mã giảm giá chưa đến thời gian áp dụng."
    if coupon["ends_at"]<now:return None,"Mã giảm giá đã hết hạn."
    if coupon["usage_limit"] is not None and coupon["used_count"]>=coupon["usage_limit"]:return None,"Mã giảm giá đã hết lượt sử dụng."
    if subtotal<float(coupon["minimum_order"]):return None,f"Đơn hàng tối thiểu {int(coupon['minimum_order']):,}đ để dùng mã này.".replace(",",".")
    cur.execute("SELECT COUNT(*) total FROM external_coupon_usages WHERE coupon_id=%s AND user_id=%s",(coupon["id"],user_id));used=cur.fetchone()["total"]
    if used>=coupon["usage_per_customer"]:return None,"Bạn đã sử dụng hết lượt của mã giảm giá này."
    cur.execute("SELECT work_id FROM external_coupon_products WHERE coupon_id=%s",(coupon["id"],));eligible_ids={row["work_id"] for row in cur.fetchall()}
    eligible_subtotal=sum(float(item["unit_price"])*item["quantity"] for item in items if not eligible_ids or item["work_id"] in eligible_ids)
    if eligible_ids and eligible_subtotal<=0:return None,"Mã này không áp dụng cho sản phẩm nào trong giỏ hàng."
    if coupon["discount_type"]=="FREE_SHIPPING":
        shipping=0 if subtotal>=299000 else 30000
        coupon["eligible_work_ids"]=list(eligible_ids);coupon["eligible_subtotal"]=eligible_subtotal
        return coupon,shipping
    discount=eligible_subtotal*float(coupon["discount_value"])/100 if coupon["discount_type"]=="PERCENT" else float(coupon["discount_value"])
    if coupon["maximum_discount"] is not None:discount=min(discount,float(coupon["maximum_discount"]))
    coupon["eligible_work_ids"]=list(eligible_ids);coupon["eligible_subtotal"]=eligible_subtotal
    return coupon,min(discount,eligible_subtotal)

@app.post("/api/coupons/validate")
@api_user()
def coupon_validate():
    data=request.get_json() or {};con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT work_id,title,unit_price,quantity FROM external_book_items WHERE user_id=%s AND kind='CART' AND selected=TRUE",(session["user_id"],));items=cur.fetchall();subtotal=sum(float(row["unit_price"])*row["quantity"] for row in items)
            coupon,result=validate_coupon(cur,data.get("code"),items,session["user_id"])
            if isinstance(result,str):return jsonify(success=False,message=result),422
            if not coupon:return jsonify(success=False,message="Bạn hãy nhập mã giảm giá."),422
            shipping=0 if subtotal>=299000 or coupon["discount_type"]=="FREE_SHIPPING" else 30000
            eligible=set(coupon["eligible_work_ids"]);products=[row["title"] for row in items if not eligible or row["work_id"] in eligible]
            product_discount=0 if coupon["discount_type"]=="FREE_SHIPPING" else result
            return jsonify(success=True,data={"code":coupon["code"],"name":coupon["name"],"discountType":coupon["discount_type"],"discountValue":json_value(coupon["discount_value"]),"discount":result,"subtotal":subtotal,"eligibleSubtotal":coupon["eligible_subtotal"],"eligibleWorkIds":coupon["eligible_work_ids"],"eligibleProducts":products,"shipping":shipping,"total":subtotal-product_discount+shipping})
    finally:con.close()

@app.get("/api/coupons/cart-best")
@api_user()
def cart_best_coupon():
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT work_id,title,unit_price,quantity FROM external_book_items WHERE user_id=%s AND kind='CART' AND selected=TRUE",(session["user_id"],));items=cur.fetchall()
            if not items:return jsonify(success=True,data=None)
            work_ids=[row["work_id"] for row in items]
            placeholders=','.join(['%s']*len(work_ids))
            cur.execute(f"""SELECT DISTINCT c.code FROM coupons c
                WHERE c.status='ACTIVE' AND c.starts_at<=NOW() AND c.ends_at>=NOW()
                AND (c.usage_limit IS NULL OR c.used_count<c.usage_limit)
                AND (NOT EXISTS(SELECT 1 FROM external_coupon_products ep WHERE ep.coupon_id=c.id)
                    OR EXISTS(SELECT 1 FROM external_coupon_products ep WHERE ep.coupon_id=c.id AND ep.work_id IN ({placeholders})))""",work_ids)
            candidates=[]
            for row in cur.fetchall():
                coupon,result=validate_coupon(cur,row["code"],items,session["user_id"])
                if coupon and not isinstance(result,str) and result>0:
                    eligible=set(coupon["eligible_work_ids"])
                    candidates.append({"code":coupon["code"],"name":coupon["name"],"discountType":coupon["discount_type"],"discountValue":json_value(coupon["discount_value"]),"discount":result,"eligibleProducts":[item["title"] for item in items if not eligible or item["work_id"] in eligible]})
            if request.args.get("all") in {"1","true"}:
                return jsonify(success=True,data=sorted(candidates,key=lambda item:item["discount"],reverse=True))
            return jsonify(success=True,data=max(candidates,key=lambda item:item["discount"]) if candidates else None)
    finally:con.close()

@app.post("/api/checkout")
@api_user()
def checkout():
    x=request.get_json() or {};con=db()
    try:
        with con.cursor() as cur:
            if x.get("addressMode") in {"default","saved"}:
                if x.get("addressMode")=="saved" and str(x.get("addressId") or "").isdigit():
                    cur.execute("SELECT recipient_name,phone,province_name,district_name,ward_name,address_line FROM user_addresses WHERE id=%s AND user_id=%s",(int(x["addressId"]),session["user_id"]))
                else:
                    cur.execute("SELECT recipient_name,phone,province_name,district_name,ward_name,address_line FROM user_addresses WHERE user_id=%s AND is_default=1 ORDER BY id DESC LIMIT 1",(session["user_id"],))
                saved_address=cur.fetchone()
                if not saved_address:return jsonify(success=False,message="Bạn chưa có địa chỉ mặc định"),422
                x["recipientName"]=saved_address["recipient_name"]
                x["phone"]=saved_address["phone"]
                x["address"]=', '.join(filter(None,[saved_address["address_line"],saved_address["ward_name"],saved_address["district_name"],saved_address["province_name"]]))
            if not all(str(x.get(field) or "").strip() for field in ("recipientName","phone","address")):
                return jsonify(success=False,message="Vui lòng nhập đầy đủ người nhận, số điện thoại và địa chỉ giao hàng"),422
            cur.execute("SELECT * FROM external_book_items WHERE user_id=%s AND kind='CART' AND selected=TRUE FOR UPDATE",(session["user_id"],));items=cur.fetchall()
            if not items:return jsonify(success=False,message="Hãy chọn ít nhất một sản phẩm để thanh toán"),422
            subtotal=sum(float(i["unit_price"])*i["quantity"] for i in items);shipping=0 if subtotal>=299000 else 30000
            coupon,discount=validate_coupon(cur,x.get("couponCode"),items,session["user_id"])
            if isinstance(discount,str):return jsonify(success=False,message=discount),422
            if coupon and coupon["discount_type"]=="FREE_SHIPPING":shipping=0;discount=0
            total=subtotal-discount+shipping;code="DH"+str(int(__import__('time').time()*1000))[-10:]
            for item in items:
                cur.execute("SELECT stock_quantity FROM external_book_inventory WHERE work_id=%s FOR UPDATE",(item["work_id"],));s=cur.fetchone();before=s["stock_quantity"] if s else 0
                if before<item["quantity"]: con.rollback();return jsonify(success=False,message=f"{item['title']} chỉ còn {before} cuốn"),422
                after=before-item["quantity"];cur.execute("UPDATE external_book_inventory SET stock_quantity=%s,sold_count=sold_count+%s WHERE work_id=%s",(after,item["quantity"],item["work_id"]));cur.execute("INSERT INTO external_inventory_transactions(work_id,transaction_type,quantity_change,quantity_before,quantity_after,reference_code,reason) VALUES(%s,'SALE',%s,%s,%s,%s,'Khách đặt hàng')",(item["work_id"],-item["quantity"],before,after,code))
            cur.execute("INSERT INTO external_orders(order_code,user_id,coupon_id,coupon_code,recipient_name,recipient_phone,shipping_address,subtotal,discount_amount,shipping_fee,total_amount,payment_method) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",(code,session["user_id"],coupon["id"] if coupon else None,coupon["code"] if coupon else None,x["recipientName"],x["phone"],x["address"],subtotal,discount,shipping,total,x.get("paymentMethod","COD")));oid=cur.lastrowid
            cur.execute("INSERT INTO external_order_status_history(order_id,status,note,changed_by) VALUES(%s,'PENDING','Đơn hàng đã được tạo',%s)",(oid,session["user_id"]))
            for i in items:cur.execute("INSERT INTO external_order_items(order_id,work_id,title,authors,cover_url,unit_price,quantity) VALUES(%s,%s,%s,%s,%s,%s,%s)",(oid,i["work_id"],i["title"],i["authors"],i["cover_url"],i["unit_price"],i["quantity"]))
            if coupon:
                cur.execute("INSERT INTO external_coupon_usages(coupon_id,user_id,order_id) VALUES(%s,%s,%s)",(coupon["id"],session["user_id"],oid));cur.execute("UPDATE coupons SET used_count=used_count+1 WHERE id=%s",(coupon["id"],))
            cur.execute("DELETE FROM external_book_items WHERE user_id=%s AND kind='CART' AND selected=TRUE",(session["user_id"],));con.commit();return jsonify(success=True,data={"orderCode":code,"total":total})
    finally: con.close()

@app.get("/api/admin/<module>")
@api_user("ADMIN")
def admin_data(module):
    con=db()
    try:
        with con.cursor() as cur:
            if module=="inventory":cur.execute("SELECT * FROM external_book_inventory ORDER BY updated_at DESC")
            elif module=="orders":cur.execute("SELECT o.*,u.full_name customer FROM external_orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC")
            elif module=="history":cur.execute("SELECT t.*,i.title FROM external_inventory_transactions t JOIN external_book_inventory i ON i.work_id=t.work_id ORDER BY t.created_at DESC")
            else:return jsonify(success=False,message="Module chưa hỗ trợ"),404
            return jsonify(success=True,data=[{k:json_value(v) for k,v in r.items()} for r in cur.fetchall()])
    finally:con.close()

@app.get("/api/admin/data/<module>")
@api_user("ADMIN")
def admin_generic_data(module):
    sql=ADMIN_LISTS.get(module)
    if not sql:return jsonify(success=False,message="Module không tồn tại"),404
    con=db()
    try:
        with con.cursor() as cur:
            if module=="imports":
                cur.execute("SELECT t.id,t.reference_code purchase_code,i.title book,t.quantity_change quantity,t.reason,t.created_at FROM external_inventory_transactions t JOIN external_book_inventory i ON i.work_id=t.work_id WHERE t.transaction_type='IMPORT' ORDER BY t.created_at DESC")
            else:cur.execute(sql)
            return jsonify(success=True,data=[{k:json_value(v) for k,v in r.items()} for r in cur.fetchall()])
    finally:con.close()

@app.post("/api/admin/data/<module>")
@api_user("ADMIN")
def admin_generic_create(module):
    x=request.get_json() or {};con=db()
    if module=="coupons":
        try:
            code=str(x.get("code") or "").strip().upper();name=str(x.get("name") or "").strip();kind=str(x.get("discountType") or "PERCENT").upper();value=float(x.get("discountValue") or 0)
            if kind=="FREE_SHIPPING":value=1
            if not code or not name or kind not in ("PERCENT","FIXED","FREE_SHIPPING") or (kind!="FREE_SHIPPING" and value<=0) or (kind=="PERCENT" and value>100):return jsonify(success=False,message="Thông tin mã giảm giá không hợp lệ."),422
            work_ids=[str(item).strip() for item in (x.get("workIds") or []) if str(item).strip()]
            if not work_ids:return jsonify(success=False,message="Hãy chọn ít nhất một sản phẩm được áp dụng."),422
            with con.cursor() as cur:
                cur.execute("INSERT INTO coupons(code,name,discount_type,discount_value,maximum_discount,minimum_order,usage_limit,usage_per_customer,starts_at,ends_at,status) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",(code,name,kind,value,float(x["maximumDiscount"]) if x.get("maximumDiscount") else None,float(x.get("minimumOrder") or 0),int(x["usageLimit"]) if x.get("usageLimit") else None,int(x.get("usagePerCustomer") or 1),x.get("startsAt"),x.get("endsAt"),x.get("status") or "ACTIVE"));coupon_id=cur.lastrowid
                cur.executemany("INSERT INTO external_coupon_products(coupon_id,work_id) VALUES(%s,%s)",[(coupon_id,work_id) for work_id in work_ids])
            con.commit();return jsonify(success=True),201
        except Exception as exc:con.rollback();return jsonify(success=False,message=f"Không thể tạo mã giảm giá: {exc}"),422
        finally:con.close()
    if module=="categories":
        name=str(x.get("name") or "").strip();slug=str(x.get("slug") or "").strip().lower()
        description=str(x.get("description") or "").strip();status=str(x.get("status") or "ACTIVE").upper()
        if not name or not slug:return jsonify(success=False,message="Ten va duong dan danh muc la bat buoc"),422
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",slug):return jsonify(success=False,message="Duong dan chi duoc dung chu thuong, so va dau gach ngang"),422
        if status not in {"ACTIVE","HIDDEN"}:return jsonify(success=False,message="Trang thai danh muc khong hop le"),422
        try:
            with con.cursor() as cur:
                cur.execute("INSERT INTO categories(name,slug,description,display_order,status) VALUES(%s,%s,%s,%s,%s)",(name,slug,description,int(x.get("display_order",0)),status))
                category_id=cur.lastrowid
            con.commit();return jsonify(success=True,data={"id":category_id}),201
        except pymysql.err.IntegrityError:
            con.rollback();return jsonify(success=False,message="Duong dan danh muc da ton tai"),409
        finally:con.close()
    if module=="books":
        work_id=(x.get("workId") or "").strip().upper()
        title=(x.get("title") or "").strip(); authors=(x.get("authors") or "").strip()
        if not work_id or not title or not authors:return jsonify(success=False,message="Mã sách, tên sách và tác giả là bắt buộc"),422
        try:
            stock=max(0,int(x.get("stockQuantity",0))); minimum=max(0,int(x.get("minimumStock",5)))
            with con.cursor() as cur:
                selling=max(1,float(x.get("sellingPrice") or 99000));cost=max(0,float(x.get("costPrice") or 0));promo=float(x.get("promotionalPrice") or 0) or None
                if promo is not None and promo>=selling:return jsonify(success=False,message="Giá khuyến mãi phải thấp hơn giá bán"),422
                cur.execute("INSERT INTO external_book_inventory(work_id,title,authors,cover_url,stock_quantity,minimum_stock,cost_price,selling_price,promotional_price) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)",(work_id,title,authors,x.get("coverUrl") or None,stock,minimum,cost,selling,promo))
                if stock:
                    cur.execute("INSERT INTO external_inventory_transactions(work_id,transaction_type,quantity_change,quantity_before,quantity_after,reference_code,reason,created_by) VALUES(%s,'IMPORT',%s,0,%s,'MANUAL_BOOK',%s,%s)",(work_id,stock,stock,x.get("reason") or "Tạo sách mới",session["user_id"]))
            con.commit();return jsonify(success=True),201
        except Exception as exc:
            con.rollback();return jsonify(success=False,message=f"Không thể tạo sách: {exc}"),422
        finally: con.close()
    statements={
      "categories":("INSERT INTO categories(name,slug,description,display_order,status) VALUES(%s,%s,%s,%s,%s)",(x.get("name"),x.get("slug"),x.get("description"),int(x.get("display_order",0)),x.get("status","ACTIVE"))),
      "authors":("INSERT INTO authors(name,slug,biography,status) VALUES(%s,%s,%s,%s)",(x.get("name"),x.get("slug"),x.get("biography"),x.get("status","ACTIVE"))),
      "publishers":("INSERT INTO publishers(name,slug,email,phone,address,status) VALUES(%s,%s,%s,%s,%s,%s)",(x.get("name"),x.get("slug"),x.get("email"),x.get("phone"),x.get("address"),x.get("status","ACTIVE"))),
      "suppliers":("INSERT INTO suppliers(supplier_code,name,phone,email,address,status) VALUES(%s,%s,%s,%s,%s,%s)",(x.get("supplier_code"),x.get("name"),x.get("phone"),x.get("email"),x.get("address"),x.get("status","ACTIVE"))),
    }
    if module not in statements:return jsonify(success=False,message="Module này chỉ cho phép xem hoặc cần nghiệp vụ chuyên biệt"),422
    try:
        with con.cursor() as cur:cur.execute(*statements[module]);con.commit();return jsonify(success=True),201
    except Exception as exc:con.rollback();return jsonify(success=False,message=f"Không thể lưu dữ liệu: {exc}"),422
    finally:con.close()

@app.patch("/api/admin/coupons/<int:coupon_id>")
@api_user("ADMIN")
def admin_coupon_update(coupon_id):
    data=request.get_json() or {};status=str(data.get("status") or "").upper()
    if status not in ("ACTIVE","INACTIVE"):return jsonify(success=False,message="Trạng thái không hợp lệ."),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("UPDATE coupons SET status=%s WHERE id=%s",(status,coupon_id))
            if not cur.rowcount:return jsonify(success=False,message="Không tìm thấy mã giảm giá."),404
        con.commit();return jsonify(success=True)
    finally:con.close()

@app.patch("/api/admin/entities/<module>/<int:entity_id>")
@api_user("ADMIN")
def admin_entity_update(module,entity_id):
    configs={
        "authors":("authors",["name","slug","biography","status"]),
        "publishers":("publishers",["name","slug","email","phone","address","status"]),
        "suppliers":("suppliers",["supplier_code","name","phone","email","address","status"]),
    }
    if module not in configs:return jsonify(success=False,message="Module khong ho tro chinh sua"),404
    table,fields=configs[module];x=request.get_json() or {};con=db()
    try:
        with con.cursor() as cur:
            cur.execute(f"SELECT * FROM {table} WHERE id=%s FOR UPDATE",(entity_id,));current=cur.fetchone()
            if not current:return jsonify(success=False,message="Khong tim thay du lieu"),404
            values=[]
            for field in fields:
                value=x.get(field,current.get(field))
                if isinstance(value,str):value=value.strip()
                values.append(value)
            if not values[fields.index("name")]:return jsonify(success=False,message="Ten la bat buoc"),422
            cur.execute(f"UPDATE {table} SET "+",".join(f"{field}=%s" for field in fields)+" WHERE id=%s",(*values,entity_id))
        con.commit();return jsonify(success=True)
    except pymysql.err.IntegrityError:
        con.rollback();return jsonify(success=False,message="Ma hoac duong dan da ton tai"),409
    finally:con.close()

@app.delete("/api/admin/entities/<module>/<int:entity_id>")
@api_user("ADMIN")
def admin_entity_delete(module,entity_id):
    configs={
        "authors":("authors","SELECT COUNT(*) total FROM book_authors WHERE author_id=%s","HIDDEN"),
        "publishers":("publishers","SELECT COUNT(*) total FROM books WHERE publisher_id=%s","HIDDEN"),
        "suppliers":("suppliers","SELECT COUNT(*) total FROM purchase_orders WHERE supplier_id=%s","INACTIVE"),
    }
    if module not in configs:return jsonify(success=False,message="Module khong ho tro xoa"),404
    table,reference_sql,hidden_status=configs[module];con=db()
    try:
        with con.cursor() as cur:
            cur.execute(f"SELECT id FROM {table} WHERE id=%s FOR UPDATE",(entity_id,))
            if not cur.fetchone():return jsonify(success=False,message="Khong tim thay du lieu"),404
            cur.execute(reference_sql,(entity_id,));used=cur.fetchone()["total"]
            if used:
                cur.execute(f"UPDATE {table} SET status=%s WHERE id=%s",(hidden_status,entity_id));mode="hidden"
            else:
                cur.execute(f"DELETE FROM {table} WHERE id=%s",(entity_id,));mode="deleted"
        con.commit();return jsonify(success=True,data={"mode":mode})
    finally:con.close()

@app.patch("/api/admin/categories/<int:category_id>")
@api_user("ADMIN")
def admin_category_update(category_id):
    x=request.get_json() or {};con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT * FROM categories WHERE id=%s FOR UPDATE",(category_id,));current=cur.fetchone()
            if not current:return jsonify(success=False,message="Khong tim thay danh muc"),404
            name=str(x.get("name",current["name"]) or "").strip();slug=str(x.get("slug",current["slug"]) or "").strip().lower()
            description=str(x.get("description",current["description"] or "") or "").strip();status=str(x.get("status",current["status"]) or "").upper()
            if not name or not slug:return jsonify(success=False,message="Ten va duong dan danh muc la bat buoc"),422
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",slug):return jsonify(success=False,message="Duong dan chi duoc dung chu thuong, so va dau gach ngang"),422
            if status not in {"ACTIVE","HIDDEN"}:return jsonify(success=False,message="Trang thai danh muc khong hop le"),422
            cur.execute("UPDATE categories SET name=%s,slug=%s,description=%s,display_order=%s,status=%s WHERE id=%s",(name,slug,description,int(x.get("display_order",current["display_order"])),status,category_id))
        con.commit();return jsonify(success=True)
    except pymysql.err.IntegrityError:
        con.rollback();return jsonify(success=False,message="Duong dan danh muc da ton tai"),409
    finally:con.close()

@app.delete("/api/admin/categories/<int:category_id>")
@api_user("ADMIN")
def admin_category_delete(category_id):
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id FROM categories WHERE id=%s FOR UPDATE",(category_id,))
            if not cur.fetchone():return jsonify(success=False,message="Khong tim thay danh muc"),404
            cur.execute("SELECT COUNT(*) total FROM books WHERE category_id=%s",(category_id,));book_count=cur.fetchone()["total"]
            cur.execute("SELECT COUNT(*) total FROM categories WHERE parent_id=%s",(category_id,));child_count=cur.fetchone()["total"]
            if book_count or child_count:
                cur.execute("UPDATE categories SET status='HIDDEN' WHERE id=%s",(category_id,));mode="hidden"
            else:
                cur.execute("DELETE FROM categories WHERE id=%s",(category_id,));mode="deleted"
        con.commit();return jsonify(success=True,data={"mode":mode})
    finally:con.close()

@app.patch("/api/admin/data/books/<work_id>")
@api_user("ADMIN")
def admin_book_update(work_id):
    x=request.get_json() or {};con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT * FROM external_book_inventory WHERE work_id=%s FOR UPDATE",(work_id,)); current=cur.fetchone()
            if not current:return jsonify(success=False,message="Không tìm thấy sách"),404
            title=(x.get("title") or current["title"]).strip();authors=(x.get("authors") or current["authors"]).strip()
            desired=max(0,int(x.get("stockQuantity",current["stock_quantity"])));minimum=max(0,int(x.get("minimumStock",current["minimum_stock"])))
            if not title or not authors:return jsonify(success=False,message="Tên sách và tác giả là bắt buộc"),422
            cur.execute("UPDATE external_book_inventory SET title=%s,authors=%s,cover_url=%s,isbn=%s,description=%s,publisher_name=%s,publication_year=%s,page_count=%s,selling_price=%s,promotional_price=%s,minimum_stock=%s,stock_quantity=%s WHERE work_id=%s",(title,authors,x.get("coverUrl") or None,x.get("isbn") or None,x.get("description") or None,x.get("publisherName") or None,int(x["publicationYear"]) if x.get("publicationYear") else None,int(x["pageCount"]) if x.get("pageCount") else None,float(x.get("sellingPrice") or current["selling_price"]),float(x["promotionalPrice"]) if x.get("promotionalPrice") else None,minimum,desired,work_id))
            delta=desired-current["stock_quantity"]
            if delta:
                transaction="ADJUSTMENT_IN" if delta>0 else "ADJUSTMENT_OUT"
                cur.execute("INSERT INTO external_inventory_transactions(work_id,transaction_type,quantity_change,quantity_before,quantity_after,reference_code,reason,created_by) VALUES(%s,%s,%s,%s,%s,'MANUAL_EDIT',%s,%s)",(work_id,transaction,delta,current["stock_quantity"],desired,x.get("reason") or "Chỉnh sửa sách",session["user_id"]))
        con.commit();return jsonify(success=True)
    except Exception as exc:
        con.rollback();return jsonify(success=False,message=f"Không thể cập nhật sách: {exc}"),422
    finally: con.close()

@app.post("/api/admin/inventory")
@api_user("ADMIN")
def adjust_inventory():
    x=request.get_json();change=int(x["change"]);con=db()
    try:
        with con.cursor() as cur:
            cur.execute("INSERT INTO external_book_inventory(work_id,title,authors,cover_url,stock_quantity,minimum_stock) VALUES(%s,%s,%s,%s,0,%s) ON DUPLICATE KEY UPDATE title=VALUES(title),authors=VALUES(authors),minimum_stock=VALUES(minimum_stock)",(x["workId"],x["title"],x["authors"],x.get("cover"),int(x.get("minimumStock",5))));cur.execute("SELECT stock_quantity FROM external_book_inventory WHERE work_id=%s FOR UPDATE",(x["workId"],));before=cur.fetchone()["stock_quantity"];after=before+change
            if after<0:return jsonify(success=False,message=f"Kho chỉ còn {before} cuốn"),422
            cur.execute("UPDATE external_book_inventory SET stock_quantity=%s WHERE work_id=%s",(after,x["workId"]));cur.execute("INSERT INTO external_inventory_transactions(work_id,transaction_type,quantity_change,quantity_before,quantity_after,reference_code,reason,created_by) VALUES(%s,%s,%s,%s,%s,'MANUAL',%s,%s)",(x["workId"],"IMPORT" if change>0 else "ADJUSTMENT_OUT",change,before,after,x.get("reason"),session["user_id"]));con.commit();return jsonify(success=True)
    finally:con.close()

@app.get("/api/admin/orders-workflow")
@api_user("ADMIN")
def admin_orders_workflow():
    """Order information tailored for the admin fulfilment workspace."""
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT o.*,u.full_name customer FROM external_orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC")
            orders=cur.fetchall()
            for order in orders:
                cur.execute("SELECT work_id,title,authors,cover_url,unit_price,quantity FROM external_order_items WHERE order_id=%s",(order["id"],))
                order["items"]=cur.fetchall()
                cur.execute("SELECT status,note,created_at FROM external_order_status_history WHERE order_id=%s ORDER BY created_at,id",(order["id"],));order["history"]=[{key:json_value(value) for key,value in row.items()} for row in cur.fetchall()]
        return jsonify(success=True,data=[{key:json_value(value) if key!="items" else [{item_key:json_value(item_value) for item_key,item_value in item.items()} for item in value] for key,value in order.items()} for order in orders])
    finally: con.close()

@app.patch("/api/admin/orders-workflow/<int:order_id>")
@api_user("ADMIN")
def admin_orders_workflow_update(order_id):
    status=str((request.get_json() or {}).get("status") or "").upper()
    transitions={
        "PENDING":{"CONFIRMED","CANCELLED"},
        "CONFIRMED":{"PREPARING","CANCELLED"},
        "PREPARING":{"SHIPPING","CANCELLED"},
        "SHIPPING":{"COMPLETED"},
        "COMPLETED":set(),
        "CANCELLED":set(),
    }
    if status not in {state for states in transitions.values() for state in states}|{"PENDING"}:
        return jsonify(success=False,message="Trang thai don hang khong hop le"),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT order_code,status FROM external_orders WHERE id=%s FOR UPDATE",(order_id,))
            order=cur.fetchone()
            if not order:return jsonify(success=False,message="Khong tim thay don hang"),404
            current=str(order["status"] or "PENDING").upper()
            if status==current:
                return jsonify(success=True,data={"status":status})
            if status not in transitions.get(current,set()):
                return jsonify(success=False,message="Khong the chuyen trang thai don theo buoc nay"),422
            if status=="CANCELLED":
                cur.execute("SELECT work_id,quantity FROM external_order_items WHERE order_id=%s",(order_id,))
                for item in cur.fetchall():
                    cur.execute("SELECT stock_quantity FROM external_book_inventory WHERE work_id=%s FOR UPDATE",(item["work_id"],))
                    stock=cur.fetchone()
                    before=stock["stock_quantity"] if stock else 0
                    after=before+item["quantity"]
                    cur.execute("UPDATE external_book_inventory SET stock_quantity=%s,sold_count=GREATEST(0,sold_count-%s) WHERE work_id=%s",(after,item["quantity"],item["work_id"]))
                    cur.execute("INSERT INTO external_inventory_transactions(work_id,transaction_type,quantity_change,quantity_before,quantity_after,reference_code,reason,created_by) VALUES(%s,'CANCEL_RETURN',%s,%s,%s,%s,'Order cancelled by admin',%s)",(item["work_id"],item["quantity"],before,after,order["order_code"],session["user_id"]))
            cur.execute("UPDATE external_orders SET status=%s WHERE id=%s",(status,order_id))
            cur.execute("INSERT INTO external_order_status_history(order_id,status,note,changed_by) VALUES(%s,%s,%s,%s)",(order_id,status,"Admin cập nhật trạng thái đơn hàng",session["user_id"]))
        con.commit()
        return jsonify(success=True,data={"status":status})
    except Exception:
        con.rollback()
        raise
    finally: con.close()

@app.patch("/api/admin/orders-workflow/<int:order_id>/shipping")
@api_user("ADMIN")
def admin_order_shipping_update(order_id):
    data=request.get_json() or {};carrier=str(data.get("shippingCarrier") or "").strip();tracking=str(data.get("trackingCode") or "").strip();payment=str(data.get("paymentStatus") or "UNPAID").upper()
    if payment not in {"UNPAID","PAID","REFUNDED"}:return jsonify(success=False,message="Trạng thái thanh toán không hợp lệ"),422
    con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT id FROM external_orders WHERE id=%s",(order_id,))
            if not cur.fetchone():return jsonify(success=False,message="Không tìm thấy đơn hàng"),404
            cur.execute("UPDATE external_orders SET shipping_carrier=%s,tracking_code=%s,payment_status=%s WHERE id=%s",(carrier or None,tracking or None,payment,order_id))
        con.commit();return jsonify(success=True,data={"shippingCarrier":carrier,"trackingCode":tracking,"paymentStatus":payment})
    finally:con.close()

@app.patch("/api/admin/orders/<int:order_id>")
@api_user("ADMIN")
def update_order(order_id):
    status=(request.get_json() or {}).get("status");con=db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT order_code,status FROM external_orders WHERE id=%s FOR UPDATE",(order_id,));order=cur.fetchone()
            if not order:return jsonify(success=False,message="Không tìm thấy đơn hàng"),404
            if status=="CANCELLED" and order["status"]!="CANCELLED":
                cur.execute("SELECT work_id,quantity FROM external_order_items WHERE order_id=%s",(order_id,))
                for item in cur.fetchall():
                    cur.execute("SELECT stock_quantity FROM external_book_inventory WHERE work_id=%s FOR UPDATE",(item["work_id"],));before=cur.fetchone()["stock_quantity"];after=before+item["quantity"]
                    cur.execute("UPDATE external_book_inventory SET stock_quantity=%s,sold_count=GREATEST(0,sold_count-%s) WHERE work_id=%s",(after,item["quantity"],item["work_id"]));cur.execute("INSERT INTO external_inventory_transactions(work_id,transaction_type,quantity_change,quantity_before,quantity_after,reference_code,reason,created_by) VALUES(%s,'CANCEL_RETURN',%s,%s,%s,%s,'Hoàn kho do hủy đơn',%s)",(item["work_id"],item["quantity"],before,after,order["order_code"],session["user_id"]))
                cur.execute("SELECT coupon_id FROM external_orders WHERE id=%s",(order_id,));order_coupon=cur.fetchone()
                if order_coupon and order_coupon["coupon_id"]:
                    cur.execute("SELECT id FROM external_coupon_usages WHERE coupon_id=%s AND order_id=%s LIMIT 1",(order_coupon["coupon_id"],order_id));usage=cur.fetchone()
                    if usage:
                        cur.execute("DELETE FROM external_coupon_usages WHERE id=%s",(usage["id"],))
                        cur.execute("UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=%s",(order_coupon["coupon_id"],))
            cur.execute("UPDATE external_orders SET status=%s WHERE id=%s",(status,order_id));con.commit();return jsonify(success=True)
    finally:con.close()

if __name__ == "__main__": app.run(host="0.0.0.0",port=3000,debug=False)
