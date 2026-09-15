USE bookstore_kltn;

CREATE TABLE IF NOT EXISTS external_book_inventory (
  work_id VARCHAR(30) PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  authors VARCHAR(500) NOT NULL,
  cover_url VARCHAR(500) NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  minimum_stock INT UNSIGNED NOT NULL DEFAULT 5,
  sold_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_external_inventory_stock CHECK (stock_quantity >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS external_inventory_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_id VARCHAR(30) NOT NULL,
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

ALTER TABLE external_orders
  MODIFY status ENUM('PENDING','CONFIRMED','PREPARING','SHIPPING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING';

INSERT IGNORE INTO external_book_inventory (work_id,title,authors,cover_url,stock_quantity)
SELECT work_id,MAX(title),MAX(authors),MAX(cover_url),20
FROM external_book_items GROUP BY work_id;

INSERT IGNORE INTO external_book_inventory (work_id,title,authors,cover_url,stock_quantity,sold_count)
SELECT work_id,MAX(title),MAX(authors),MAX(cover_url),20,SUM(quantity)
FROM external_order_items GROUP BY work_id;
