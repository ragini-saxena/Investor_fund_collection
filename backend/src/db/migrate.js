import pool from "./db.js";

export async function runMigration() {
  console.log("Starting DB migration...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS investments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      investor_id VARCHAR(20) NOT NULL,
      reference_id VARCHAR(50) NOT NULL UNIQUE,
      pool_id VARCHAR(50) NOT NULL,
      pool_name VARCHAR(150) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      apr DECIMAL(5,2) NOT NULL DEFAULT 14.20,
      term_months INT NOT NULL DEFAULT 6,
      estimated_yield DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(50) NOT NULL,
      payment_reference VARCHAR(100) NULL,
      covenant_number VARCHAR(50) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_investor_id (investor_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_cards (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      investor_id VARCHAR(20) NOT NULL,
      cardholder_name VARCHAR(100) NOT NULL,
      card_number_masked VARCHAR(25) NOT NULL,
      card_last4 VARCHAR(4) NOT NULL,
      card_brand VARCHAR(20) NOT NULL DEFAULT 'CARD',
      expiry_month_year VARCHAR(10) NOT NULL,
      billing_country VARCHAR(10) NOT NULL DEFAULT 'HT',
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_card_investor (investor_id)
    ) ENGINE=InnoDB;
  `);

  console.log("Migration completed successfully.");
}

if (process.argv[1]?.endsWith("migrate.js")) {
  runMigration()
    .then(() => {
      console.log("Migration executed cleanly.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
