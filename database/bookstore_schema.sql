-- =============================================================
-- KLTN - HE THONG BAN SACH
-- DBMS: MySQL 8.0.16+
-- Encoding: utf8mb4
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS bookstore_kltn;
CREATE DATABASE bookstore_kltn
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE bookstore_kltn;

-- =============================================================
-- 1. NGUOI DUNG VA PHAN QUYEN
-- =============================================================

CREATE TABLE roles (
  id            TINYINT UNSIGNED PRIMARY KEY,
  code          VARCHAR(30) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_code         VARCHAR(20) NOT NULL UNIQUE COMMENT 'Backend sinh, vi du KH000001',
  role_id           TINYINT UNSIGNED NOT NULL,
  full_name         VARCHAR(150) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(20),
  password_hash     VARCHAR(255) NOT NULL COMMENT 'Chi luu bcrypt/argon2 hash',
  avatar_url        VARCHAR(500),
  status            ENUM('ACTIVE','LOCKED','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  email_verified_at DATETIME NULL,
  last_login_at     DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_phone UNIQUE (phone),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%._%')
) ENGINE=InnoDB;

CREATE TABLE user_addresses (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          BIGINT UNSIGNED NOT NULL,
  recipient_name   VARCHAR(150) NOT NULL,
  phone            VARCHAR(20) NOT NULL,
  province_code    VARCHAR(20),
  province_name    VARCHAR(100) NOT NULL,
  district_code    VARCHAR(20),
  district_name    VARCHAR(100) NOT NULL,
  ward_code        VARCHAR(20),
  ward_name        VARCHAR(100) NOT NULL,
  address_line     VARCHAR(255) NOT NULL,
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_addresses_user (user_id),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 cua refresh token',
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_user_expiry (user_id, expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 2. DANH MUC SACH
-- =============================================================

CREATE TABLE categories (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id     BIGINT UNSIGNED NULL,
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(170) NOT NULL UNIQUE,
  description   TEXT,
  image_url     VARCHAR(500),
  display_order INT NOT NULL DEFAULT 0,
  status        ENUM('ACTIVE','HIDDEN') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categories_parent (parent_id),
  INDEX idx_categories_status_order (status, display_order),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE publishers (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  email       VARCHAR(255),
  phone       VARCHAR(20),
  address     VARCHAR(500),
  status      ENUM('ACTIVE','HIDDEN') NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_publishers_name (name)
) ENGINE=InnoDB;

CREATE TABLE authors (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  biography   TEXT,
  avatar_url  VARCHAR(500),
  status      ENUM('ACTIVE','HIDDEN') NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_authors_name (name)
) ENGINE=InnoDB;

CREATE TABLE books (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_code          VARCHAR(20) NOT NULL UNIQUE COMMENT 'Backend sinh, vi du SP000001',
  category_id        BIGINT UNSIGNED NOT NULL,
  publisher_id       BIGINT UNSIGNED NULL,
  isbn               VARCHAR(20) NOT NULL UNIQUE,
  title              VARCHAR(300) NOT NULL,
  slug               VARCHAR(330) NOT NULL UNIQUE,
  description        LONGTEXT,
  publication_year   SMALLINT UNSIGNED,
  page_count         INT UNSIGNED,
  language           VARCHAR(50) NOT NULL DEFAULT 'Tiếng Việt',
  cost_price         DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  selling_price      DECIMAL(15,2) UNSIGNED NOT NULL,
  promotional_price  DECIMAL(15,2) UNSIGNED NULL,
  stock_quantity     INT UNSIGNED NOT NULL DEFAULT 0,
  minimum_stock      INT UNSIGNED NOT NULL DEFAULT 5,
  sold_count         INT UNSIGNED NOT NULL DEFAULT 0,
  average_rating     DECIMAL(3,2) UNSIGNED NOT NULL DEFAULT 0,
  review_count       INT UNSIGNED NOT NULL DEFAULT 0,
  cover_image_url    VARCHAR(500),
  is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
  status             ENUM('ACTIVE','HIDDEN','DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
  published_at       DATETIME NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT INDEX ft_books_search (title, description),
  INDEX idx_books_category_status (category_id, status),
  INDEX idx_books_publisher (publisher_id),
  INDEX idx_books_price (selling_price, promotional_price),
  INDEX idx_books_sales (sold_count),
  INDEX idx_books_rating (average_rating),
  INDEX idx_books_created (created_at),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_books_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE SET NULL,
  CONSTRAINT chk_books_prices CHECK (
    selling_price > 0 AND cost_price >= 0 AND
    (promotional_price IS NULL OR (promotional_price > 0 AND promotional_price < selling_price))
  ),
  CONSTRAINT chk_books_rating CHECK (average_rating BETWEEN 0 AND 5),
  CONSTRAINT chk_books_publication_year CHECK (publication_year IS NULL OR publication_year BETWEEN 1000 AND 2200)
) ENGINE=InnoDB;

CREATE TABLE book_authors (
  book_id       BIGINT UNSIGNED NOT NULL,
  author_id     BIGINT UNSIGNED NOT NULL,
  author_order  SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (book_id, author_id),
  INDEX idx_book_authors_author (author_id),
  CONSTRAINT fk_book_authors_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE book_images (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id        BIGINT UNSIGNED NOT NULL,
  image_url      VARCHAR(500) NOT NULL,
  alt_text       VARCHAR(255),
  display_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_book_images_book_order (book_id, display_order),
  CONSTRAINT fk_book_images_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE banners (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  image_url      VARCHAR(500) NOT NULL,
  target_url     VARCHAR(500),
  display_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  starts_at      DATETIME NULL,
  ends_at        DATETIME NULL,
  status         ENUM('ACTIVE','HIDDEN') NOT NULL DEFAULT 'ACTIVE',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_banners_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
) ENGINE=InnoDB;

-- =============================================================
-- 3. NHA CUNG CAP, NHAP HANG VA KHO
-- =============================================================

CREATE TABLE suppliers (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Backend sinh, vi du NCC00001',
  name         VARCHAR(200) NOT NULL,
  phone        VARCHAR(20),
  email        VARCHAR(255),
  address      VARCHAR(500),
  status       ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppliers_name (name)
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_code  VARCHAR(20) NOT NULL UNIQUE COMMENT 'Backend sinh, vi du PN000001',
  supplier_id    BIGINT UNSIGNED NOT NULL,
  created_by     BIGINT UNSIGNED NOT NULL,
  confirmed_by   BIGINT UNSIGNED NULL,
  status         ENUM('DRAFT','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  total_amount   DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  note           VARCHAR(1000),
  confirmed_at   DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_purchase_supplier (supplier_id),
  INDEX idx_purchase_status_date (status, created_at),
  CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_confirmer FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id  BIGINT UNSIGNED NOT NULL,
  book_id            BIGINT UNSIGNED NOT NULL,
  quantity           INT UNSIGNED NOT NULL,
  unit_cost          DECIMAL(15,2) UNSIGNED NOT NULL,
  line_total         DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  CONSTRAINT uq_purchase_book UNIQUE (purchase_order_id, book_id),
  CONSTRAINT fk_purchase_items_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_items_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT,
  CONSTRAINT chk_purchase_item CHECK (quantity > 0 AND unit_cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE inventory_transactions (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id           BIGINT UNSIGNED NOT NULL,
  transaction_type  ENUM('IMPORT','SALE','CANCEL_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT') NOT NULL,
  quantity_change   INT NOT NULL COMMENT 'Duong khi nhap, am khi xuat',
  quantity_before   INT UNSIGNED NOT NULL,
  quantity_after    INT UNSIGNED NOT NULL,
  reference_type    ENUM('PURCHASE_ORDER','ORDER','MANUAL') NOT NULL,
  reference_id      BIGINT UNSIGNED NULL,
  reason            VARCHAR(500),
  created_by        BIGINT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inventory_book_date (book_id, created_at),
  INDEX idx_inventory_reference (reference_type, reference_id),
  CONSTRAINT fk_inventory_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_inventory_math CHECK (quantity_after = quantity_before + quantity_change)
) ENGINE=InnoDB;

-- =============================================================
-- 4. GIO HANG, YEU THICH VA HANH VI
-- =============================================================

CREATE TABLE carts (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NULL,
  session_token  CHAR(64) NULL,
  status         ENUM('ACTIVE','CONVERTED','ABANDONED') NOT NULL DEFAULT 'ACTIVE',
  expires_at     DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_carts_user_status (user_id, status),
  INDEX idx_carts_session_status (session_token, status),
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_owner CHECK (user_id IS NOT NULL OR session_token IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id     BIGINT UNSIGNED NOT NULL,
  book_id     BIGINT UNSIGNED NOT NULL,
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  is_selected BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_cart_book UNIQUE (cart_id, book_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE favorites (
  user_id     BIGINT UNSIGNED NOT NULL,
  book_id     BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id),
  INDEX idx_favorites_book (book_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE book_views (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NULL,
  session_token  CHAR(64) NULL,
  book_id        BIGINT UNSIGNED NOT NULL,
  viewed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_views_user_date (user_id, viewed_at),
  INDEX idx_views_book_date (book_id, viewed_at),
  CONSTRAINT fk_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_views_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 5. KHUYEN MAI VA DON HANG
-- =============================================================

CREATE TABLE coupons (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code               VARCHAR(50) NOT NULL UNIQUE,
  name               VARCHAR(200) NOT NULL,
  discount_type      ENUM('PERCENT','FIXED') NOT NULL,
  discount_value     DECIMAL(15,2) UNSIGNED NOT NULL,
  maximum_discount   DECIMAL(15,2) UNSIGNED NULL,
  minimum_order      DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  usage_limit        INT UNSIGNED NULL,
  usage_per_customer INT UNSIGNED NOT NULL DEFAULT 1,
  used_count         INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at          DATETIME NOT NULL,
  ends_at            DATETIME NOT NULL,
  status             ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_coupon_value CHECK (
    discount_value > 0 AND
    (discount_type <> 'PERCENT' OR discount_value <= 100) AND
    ends_at > starts_at
  )
) ENGINE=InnoDB;

CREATE TABLE orders (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code            VARCHAR(20) NOT NULL UNIQUE COMMENT 'Backend sinh, vi du DH000001',
  user_id               BIGINT UNSIGNED NOT NULL,
  coupon_id             BIGINT UNSIGNED NULL,
  recipient_name        VARCHAR(150) NOT NULL,
  recipient_phone       VARCHAR(20) NOT NULL,
  shipping_address      VARCHAR(700) NOT NULL COMMENT 'Snapshot dia chi khi dat',
  subtotal              DECIMAL(15,2) UNSIGNED NOT NULL,
  discount_amount       DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  shipping_fee          DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  grand_total           DECIMAL(15,2) UNSIGNED NOT NULL,
  payment_method        ENUM('COD','BANK_TRANSFER','ONLINE') NOT NULL DEFAULT 'COD',
  payment_status        ENUM('UNPAID','PAID','REFUNDED','FAILED') NOT NULL DEFAULT 'UNPAID',
  status                ENUM('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  customer_note         VARCHAR(1000),
  cancellation_reason   VARCHAR(1000),
  cancelled_by          ENUM('CUSTOMER','ADMIN','SYSTEM') NULL,
  cancelled_at          DATETIME NULL,
  completed_at          DATETIME NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_user_date (user_id, created_at),
  INDEX idx_orders_status_date (status, created_at),
  INDEX idx_orders_payment (payment_method, payment_status),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL,
  CONSTRAINT chk_order_total CHECK (
    subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0 AND
    discount_amount <= subtotal AND grand_total = subtotal - discount_amount + shipping_fee
  )
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id       BIGINT UNSIGNED NOT NULL,
  book_id        BIGINT UNSIGNED NOT NULL,
  book_name      VARCHAR(300) NOT NULL COMMENT 'Snapshot ten sach khi mua',
  isbn           VARCHAR(20) NOT NULL COMMENT 'Snapshot ISBN khi mua',
  cover_image_url VARCHAR(500) NULL COMMENT 'Snapshot anh bia khi mua',
  unit_price     DECIMAL(15,2) UNSIGNED NOT NULL COMMENT 'Snapshot gia ban khi mua',
  quantity       INT UNSIGNED NOT NULL,
  line_total     DECIMAL(15,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  CONSTRAINT uq_order_book UNIQUE (order_id, book_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT,
  CONSTRAINT chk_order_item CHECK (unit_price >= 0 AND quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE order_status_histories (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     BIGINT UNSIGNED NOT NULL,
  from_status  ENUM('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','CANCELLED') NULL,
  to_status    ENUM('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','CANCELLED') NOT NULL,
  changed_by   BIGINT UNSIGNED NULL,
  note         VARCHAR(1000),
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_history (order_id, created_at),
  CONSTRAINT fk_order_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE coupon_usages (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  order_id    BIGINT UNSIGNED NOT NULL,
  used_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_coupon_order UNIQUE (coupon_id, order_id),
  INDEX idx_coupon_usage_user (coupon_id, user_id),
  CONSTRAINT fk_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT,
  CONSTRAINT fk_coupon_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_coupon_usage_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- 6. DANH GIA
-- =============================================================

CREATE TABLE reviews (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  book_id        BIGINT UNSIGNED NOT NULL,
  order_item_id  BIGINT UNSIGNED NOT NULL,
  rating         TINYINT UNSIGNED NOT NULL,
  content        TEXT,
  status         ENUM('VISIBLE','HIDDEN') NOT NULL DEFAULT 'VISIBLE',
  hidden_reason  VARCHAR(500),
  hidden_by      BIGINT UNSIGNED NULL,
  hidden_at      DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_review_order_item UNIQUE (order_item_id),
  INDEX idx_reviews_book_status (book_id, status, created_at),
  INDEX idx_reviews_user (user_id),
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_hidden_by FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE admin_activity_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id     BIGINT UNSIGNED NOT NULL,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(80) NOT NULL,
  entity_id    VARCHAR(50) NOT NULL,
  description  VARCHAR(1000),
  ip_address   VARCHAR(45),
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_logs_admin_date (admin_id, created_at),
  INDEX idx_admin_logs_entity (entity_type, entity_id),
  CONSTRAINT fk_admin_logs_user FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- 7. TRIGGER BAO VE DU LIEU VA CAP NHAT THONG KE
-- =============================================================

DELIMITER $$

CREATE TRIGGER trg_inventory_immutable_update
BEFORE UPDATE ON inventory_transactions
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lich su kho khong duoc chinh sua';
END$$

CREATE TRIGGER trg_inventory_immutable_delete
BEFORE DELETE ON inventory_transactions
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lich su kho khong duoc xoa';
END$$

CREATE TRIGGER trg_order_history_immutable_update
BEFORE UPDATE ON order_status_histories
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lich su trang thai don hang khong duoc chinh sua';
END$$

CREATE TRIGGER trg_order_history_immutable_delete
BEFORE DELETE ON order_status_histories
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lich su trang thai don hang khong duoc xoa';
END$$

CREATE TRIGGER trg_review_after_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  UPDATE books b
  SET b.average_rating = (
        SELECT COALESCE(AVG(r.rating), 0) FROM reviews r
        WHERE r.book_id = NEW.book_id AND r.status = 'VISIBLE'
      ),
      b.review_count = (
        SELECT COUNT(*) FROM reviews r
        WHERE r.book_id = NEW.book_id AND r.status = 'VISIBLE'
      )
  WHERE b.id = NEW.book_id;
END$$

CREATE TRIGGER trg_review_after_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  UPDATE books b
  SET b.average_rating = (
        SELECT COALESCE(AVG(r.rating), 0) FROM reviews r
        WHERE r.book_id = NEW.book_id AND r.status = 'VISIBLE'
      ),
      b.review_count = (
        SELECT COUNT(*) FROM reviews r
        WHERE r.book_id = NEW.book_id AND r.status = 'VISIBLE'
      )
  WHERE b.id = NEW.book_id;
END$$

CREATE TRIGGER trg_review_after_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
  UPDATE books b
  SET b.average_rating = (
        SELECT COALESCE(AVG(r.rating), 0) FROM reviews r
        WHERE r.book_id = OLD.book_id AND r.status = 'VISIBLE'
      ),
      b.review_count = (
        SELECT COUNT(*) FROM reviews r
        WHERE r.book_id = OLD.book_id AND r.status = 'VISIBLE'
      )
  WHERE b.id = OLD.book_id;
END$$

DELIMITER ;

-- =============================================================
-- 8. VIEW PHUC VU ADMIN VA BAO CAO
-- =============================================================

CREATE VIEW vw_book_inventory AS
SELECT
  b.id,
  b.book_code,
  b.title,
  b.stock_quantity,
  b.minimum_stock,
  CASE
    WHEN b.stock_quantity = 0 THEN 'OUT_OF_STOCK'
    WHEN b.stock_quantity <= b.minimum_stock THEN 'LOW_STOCK'
    ELSE 'IN_STOCK'
  END AS inventory_status,
  b.status AS selling_status
FROM books b;

CREATE VIEW vw_customer_summary AS
SELECT
  u.id,
  u.user_code,
  u.full_name,
  u.email,
  u.phone,
  u.created_at,
  u.status,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.grand_total ELSE 0 END), 0) AS total_spent
FROM users u
JOIN roles r ON r.id = u.role_id AND r.code = 'CUSTOMER'
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.user_code, u.full_name, u.email, u.phone, u.created_at, u.status;

CREATE VIEW vw_daily_revenue AS
SELECT
  DATE(completed_at) AS revenue_date,
  COUNT(*) AS completed_orders,
  SUM(grand_total) AS revenue,
  AVG(grand_total) AS average_order_value
FROM orders
WHERE status = 'COMPLETED' AND completed_at IS NOT NULL
GROUP BY DATE(completed_at);

-- =============================================================
-- 9. DU LIEU HE THONG TOI THIEU
-- Mat khau va tai khoan admin phai duoc tao boi backend de dam bao hash.
-- =============================================================

INSERT INTO roles (id, code, name) VALUES
  (1, 'ADMIN', 'Quản trị viên'),
  (2, 'CUSTOMER', 'Khách hàng');

SET FOREIGN_KEY_CHECKS = 1;

-- Sách tham chiếu từ Open Library được người dùng lưu hoặc thêm vào giỏ
CREATE TABLE IF NOT EXISTS external_book_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  work_id VARCHAR(30) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  title VARCHAR(300) NOT NULL,
  authors VARCHAR(500) NOT NULL,
  cover_url VARCHAR(500),
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_external_book_item (user_id, work_id, kind),
  INDEX idx_external_book_user_kind (user_id, kind),
  CONSTRAINT fk_external_book_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_external_book_kind CHECK (kind IN ('CART','FAVORITE')),
  CONSTRAINT chk_external_book_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;
