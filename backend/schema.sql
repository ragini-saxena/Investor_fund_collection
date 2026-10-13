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

CREATE TABLE IF NOT EXISTS investments (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  investor_id         VARCHAR(20)   NOT NULL,
  reference_id        VARCHAR(50)   NOT NULL UNIQUE,
  pool_id             VARCHAR(50)   NOT NULL,
  pool_name           VARCHAR(150)  NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  apr                 DECIMAL(5,2)  NOT NULL DEFAULT 14.20,
  term_months         INT           NOT NULL DEFAULT 6,
  estimated_yield     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method      VARCHAR(50)   NOT NULL,
  payment_reference   VARCHAR(100)  NULL,
  covenant_number     VARCHAR(50)   NOT NULL,
  status              VARCHAR(30)   NOT NULL DEFAULT 'active',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_investor_id (investor_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS saved_cards (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  investor_id         VARCHAR(20)   NOT NULL,
  cardholder_name     VARCHAR(100)  NOT NULL,
  card_number_masked  VARCHAR(25)   NOT NULL,
  card_last4          VARCHAR(4)    NOT NULL,
  card_brand          VARCHAR(20)   NOT NULL DEFAULT 'CARD',
  expiry_month_year   VARCHAR(10)   NOT NULL,
  billing_country     VARCHAR(10)   NOT NULL DEFAULT 'HT',
  is_default          BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_card_investor (investor_id)
) ENGINE=InnoDB;

