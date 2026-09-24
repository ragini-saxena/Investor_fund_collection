-- Investors Funds Collection S.A. — schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS investor_fund_collection
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE investor_fund_collection;

CREATE TABLE IF NOT EXISTS investors (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  investor_id         VARCHAR(20)   NOT NULL UNIQUE,   -- e.g. IFC-1000-HT
  first_name          VARCHAR(100)  NOT NULL,
  last_name           VARCHAR(100)  NOT NULL,
  email               VARCHAR(191)  NOT NULL UNIQUE,
  whatsapp            VARCHAR(30)   NOT NULL,
  phone               VARCHAR(30)   NULL,

  pledge_range_label  VARCHAR(40)   NOT NULL,
  pledge_min          DECIMAL(12,2) NOT NULL,
  pledge_max          DECIMAL(12,2) NOT NULL,

  is_investor         BOOLEAN NOT NULL DEFAULT FALSE,
  total_invested       DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_whatsapp (whatsapp),
  INDEX idx_phone (phone)
) ENGINE=InnoDB;

-- Keeps the sequential numeric part of investor_id in one row so
-- concurrent registrations (inside runInTransaction) never collide.
CREATE TABLE IF NOT EXISTS investor_id_sequence (
  id            TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
  last_number   INT UNSIGNED NOT NULL
) ENGINE=InnoDB;

INSERT INTO investor_id_sequence (id, last_number)
VALUES (1, 999)
ON DUPLICATE KEY UPDATE id = id; -- first ID issued will be IFC-1000-HT
