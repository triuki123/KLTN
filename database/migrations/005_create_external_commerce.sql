USE bookstore_kltn;

CREATE TABLE IF NOT EXISTS external_book_inventory (
  work_id VARCHAR(50) PRIMARY KEY,
  isbn VARCHAR(20) NULL,
  title VARCHAR(300) NOT NULL,
  authors VARCHAR(500) NOT NULL,
  description LONGTEXT NULL,
  category_id BIGINT UNSIGNED NULL,
  publisher_name VARCHAR(255) NULL,
  publication_year SMALLINT UNSIGNED NULL,
  page_count INT UNSIGNED NULL,
  cover_url VARCHAR(500) NULL,
  cost_price DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  selling_price DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 99000,
  promotional_price DECIMAL(15,2) UNSIGNED NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  minimum_stock INT UNSIGNED NOT NULL DEFAULT 5,
  sold_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','HIDDEN','DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_external_catalog_status (status, is_featured, sold_count),
  CONSTRAINT fk_external_inventory_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT chk_external_inventory_stock CHECK (stock_quantity >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(30) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  coupon_id BIGINT UNSIGNED NULL,
  coupon_code VARCHAR(50) NULL,
  recipient_name VARCHAR(150) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  shipping_address VARCHAR(700) NOT NULL,
  subtotal DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(15,2) UNSIGNED NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) UNSIGNED NOT NULL,
  payment_method ENUM('COD','BANK_TRANSFER','ONLINE') NOT NULL DEFAULT 'COD',
  payment_status ENUM('UNPAID','PAID','REFUNDED') NOT NULL DEFAULT 'UNPAID',
  shipping_carrier VARCHAR(120) NULL,
  tracking_code VARCHAR(120) NULL,
  status ENUM('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_external_orders_user (user_id, created_at),
  INDEX idx_external_orders_status (status, created_at),
  CONSTRAINT fk_external_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_external_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  work_id VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  authors VARCHAR(500) NOT NULL,
  cover_url VARCHAR(500) NULL,
  unit_price DECIMAL(15,2) UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_external_order_items_order (order_id),
  CONSTRAINT fk_external_order_item_order FOREIGN KEY (order_id) REFERENCES external_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_external_order_item_book FOREIGN KEY (work_id) REFERENCES external_book_inventory(work_id) ON DELETE RESTRICT,
  CONSTRAINT chk_external_order_item_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_inventory_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_id VARCHAR(50) NOT NULL,
  transaction_type ENUM('IMPORT','SALE','CANCEL_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT') NOT NULL,
  quantity_change INT NOT NULL,
  quantity_before INT UNSIGNED NOT NULL,
  quantity_after INT UNSIGNED NOT NULL,
  reference_code VARCHAR(30) NULL,
  reason VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_external_inventory_history (work_id, created_at),
  CONSTRAINT fk_external_inventory_work FOREIGN KEY (work_id) REFERENCES external_book_inventory(work_id) ON DELETE RESTRICT,
  CONSTRAINT fk_external_inventory_admin FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_external_inventory_math CHECK (quantity_after = quantity_before + quantity_change)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_order_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(30) NOT NULL,
  note VARCHAR(500) NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_external_order_history (order_id, created_at),
  CONSTRAINT fk_external_order_history_order FOREIGN KEY (order_id) REFERENCES external_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_external_order_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE coupons MODIFY discount_type ENUM('PERCENT','FIXED','FREE_SHIPPING') NOT NULL;

CREATE TABLE IF NOT EXISTS external_coupon_products (
  coupon_id BIGINT UNSIGNED NOT NULL,
  work_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (coupon_id, work_id),
  CONSTRAINT fk_external_coupon_product_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_external_coupon_product_book FOREIGN KEY (work_id) REFERENCES external_book_inventory(work_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_coupon_usages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_external_coupon_order (coupon_id, order_id),
  CONSTRAINT fk_external_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT,
  CONSTRAINT fk_external_coupon_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_external_coupon_usage_order FOREIGN KEY (order_id) REFERENCES external_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_book_reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  work_id VARCHAR(50) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  status ENUM('VISIBLE','HIDDEN') NOT NULL DEFAULT 'VISIBLE',
  hidden_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_external_review_user_book (user_id, work_id),
  CONSTRAINT fk_external_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_external_review_book FOREIGN KEY (work_id) REFERENCES external_book_inventory(work_id) ON DELETE CASCADE,
  CONSTRAINT chk_external_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
