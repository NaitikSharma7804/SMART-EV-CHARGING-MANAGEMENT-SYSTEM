-- database/wallet_schema.sql
-- EV Wallet & Payment History Schema & Seed

-- 1. Ensure users table has wallet_balance column
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "wallet_balance";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(10,2) DEFAULT 850.00 AFTER role;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    station_id INT NULL,
    station_name VARCHAR(150) NULL,
    description VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    status ENUM('success', 'pending', 'failed') DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Set wallet balance for User 3 to ₹850.00
UPDATE users SET wallet_balance = 850.00 WHERE id = 3;

-- 4. Seed user 3 transactions if not already present
DELETE FROM wallet_transactions WHERE user_id = 3;

INSERT INTO wallet_transactions (user_id, type, amount, station_id, station_name, description, payment_method, status, created_at)
VALUES
(3, 'credit', 1595.00, NULL, NULL, 'Wallet Top-up via UPI', 'UPI', 'success', '2026-09-10 10:15:00'),
(3, 'debit', 185.00, 2, 'Hinjewadi', 'Charging Session - Hinjewadi Tech Hub', 'Wallet', 'success', '2026-09-12 11:30:00'),
(3, 'debit', 310.00, 3, 'Baner EV Hub', 'Charging Session - Baner High Street EV Station', 'Wallet', 'success', '2026-09-15 17:45:00'),
(3, 'debit', 250.00, 1, 'Shastri Nagar', 'Charging Session - Shastri Nagar EV Station', 'Wallet', 'success', '2026-09-18 19:10:00');
