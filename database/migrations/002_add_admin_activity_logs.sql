USE bookstore_kltn;
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  description VARCHAR(1000),
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_logs_admin_date (admin_id, created_at),
  INDEX idx_admin_logs_entity (entity_type, entity_id),
  CONSTRAINT fk_admin_logs_user FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
