-- ============================================================
-- EV CHARGE HUB - COMPLETE TIDB CLOUD SCHEMA & SEED DATA
-- Copy and run this script in the TiDB Cloud SQL Editor / Chat2Query
-- ============================================================

CREATE DATABASE IF NOT EXISTS ev_charge_hub;
USE ev_charge_hub;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT IGNORE INTO roles (id, name) VALUES (1, 'EV_USER'), (2, 'ADMIN');

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    mobile VARCHAR(20) NULL,
    password VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NULL,
    role VARCHAR(50) DEFAULT 'user',
    role_id INT DEFAULT 1,
    is_verified BOOLEAN DEFAULT TRUE,
    wallet_balance DECIMAL(10,2) DEFAULT 850.00,
    status ENUM('active', 'blocked') DEFAULT 'active',
    google_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

-- Pre-seed Admin and Demo Users
-- admin123 hash: $2b$10$/wVtZ7975yBw8.OUrro7y.N4TtiOB2sd6eExOzUHcDRODBHHuDu1C
-- password123 hash: $2b$10$WIoMaR1y0LGs31/lz5yVUOkvExF7bvrlFOFC9Zu3BHoTBtddHn18e
INSERT INTO users (id, name, email, phone, mobile, password, password_hash, role, role_id, is_verified, wallet_balance)
VALUES 
(1, 'System Admin', 'admin@evchargehub.com', '9999999999', '9999999999', '$2b$10$/wVtZ7975yBw8.OUrro7y.N4TtiOB2sd6eExOzUHcDRODBHHuDu1C', '$2b$10$/wVtZ7975yBw8.OUrro7y.N4TtiOB2sd6eExOzUHcDRODBHHuDu1C', 'admin', 2, TRUE, 2500.00),
(2, 'John Doe', 'john@example.com', '9876543210', '9876543210', '$2b$10$WIoMaR1y0LGs31/lz5yVUOkvExF7bvrlFOFC9Zu3BHoTBtddHn18e', '$2b$10$WIoMaR1y0LGs31/lz5yVUOkvExF7bvrlFOFC9Zu3BHoTBtddHn18e', 'user', 1, TRUE, 1200.00),
(3, 'Demo Driver', 'driver@example.com', '9876543211', '9876543211', '$2b$10$WIoMaR1y0LGs31/lz5yVUOkvExF7bvrlFOFC9Zu3BHoTBtddHn18e', '$2b$10$WIoMaR1y0LGs31/lz5yVUOkvExF7bvrlFOFC9Zu3BHoTBtddHn18e', 'user', 1, TRUE, 850.00)
ON DUPLICATE KEY UPDATE 
    password = VALUES(password),
    password_hash = VALUES(password_hash),
    is_verified = TRUE;

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    battery_capacity DECIMAL(5,2) NOT NULL,
    connector_type VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO vehicles (id, user_id, vehicle_number, brand, model, battery_capacity, connector_type, is_default)
VALUES
(1, 2, 'MH-12-AB-1234', 'Tata', 'Nexon EV', 30.20, 'CCS2', TRUE),
(2, 3, 'MH-14-EV-5678', 'MG', 'ZS EV', 50.30, 'CCS2', TRUE);

-- Charging Stations
CREATE TABLE IF NOT EXISTS charging_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Pune',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    contact VARCHAR(50) DEFAULT '1800-123-456',
    operator_name VARCHAR(100) DEFAULT 'EV Charge Hub',
    opening_time TIME DEFAULT '00:00:00',
    closing_time TIME DEFAULT '23:59:59',
    is_24_hours BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3, 2) DEFAULT 4.50,
    total_reviews INT DEFAULT 15,
    status VARCHAR(50) DEFAULT 'Active',
    operating_hours VARCHAR(100) DEFAULT '24/7',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location (latitude, longitude)
);

INSERT INTO charging_stations (id, name, address, city, state, latitude, longitude, contact, operator_name, opening_time, closing_time, is_24_hours, rating, total_reviews, status)
VALUES
(1, 'Shastri Nagar EV Station', 'Yerawada, Shastri Nagar, Pune', 'Pune', 'Maharashtra', 18.5529, 73.8930, '1800-123-456', 'EV Charge Hub', '00:00:00', '23:59:59', 1, 4.70, 22, 'Active'),
(2, 'Koregaon Park EV Station', 'North Main Road, Koregaon Park, Pune', 'Pune', 'Maharashtra', 18.5362, 73.8940, '1800-234-567', 'Tata Power EZ Charge', '00:00:00', '23:59:59', 1, 4.85, 34, 'Active'),
(3, 'Hinjewadi Tech Hub EV Station', 'Phase 1, Near Infosys Circle, Hinjewadi, Pune', 'Pune', 'Maharashtra', 18.5913, 73.7389, '1800-345-678', 'Jio-bp pulse', '00:00:00', '23:59:59', 1, 4.90, 48, 'Active'),
(4, 'Baner High Street EV Station', 'Main High Street, Baner, Pune', 'Pune', 'Maharashtra', 18.5590, 73.7868, '1800-456-789', 'Statiq Power', '06:00:00', '23:00:00', 0, 4.60, 19, 'Active'),
(5, 'Shivaji Nagar EV Station', 'FC Road, Shivaji Nagar, Pune', 'Pune', 'Maharashtra', 18.5246, 73.8400, '1800-567-890', 'ChargeGrid', '00:00:00', '23:59:59', 1, 4.75, 41, 'Active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Chargers
CREATE TABLE IF NOT EXISTS chargers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    charger_number VARCHAR(20) NOT NULL,
    charger_type VARCHAR(50) DEFAULT 'DC Fast',
    connector_type VARCHAR(50) NOT NULL,
    charging_speed VARCHAR(50) DEFAULT '50kW DC',
    power_kw DECIMAL(6, 2) DEFAULT 50.00,
    price DECIMAL(8, 2) DEFAULT 15.00,
    price_per_hour DECIMAL(8, 2) DEFAULT 15.00,
    status VARCHAR(50) DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

INSERT INTO chargers (id, station_id, charger_number, charger_type, connector_type, charging_speed, power_kw, price, price_per_hour, status)
VALUES
(1, 1, 'CH-01', 'DC Fast', 'CCS2', '60kW DC', 60.00, 16.50, 16.50, 'Available'),
(2, 1, 'CH-02', 'DC Fast', 'CCS2', '50kW DC', 50.00, 15.00, 15.00, 'Available'),
(3, 1, 'CH-03', 'AC Fast', 'Type 2', '22kW AC', 22.00, 11.00, 11.00, 'Available'),
(4, 2, 'KP-01', 'DC Ultra', 'CCS2', '120kW DC', 120.00, 21.00, 21.00, 'Available'),
(5, 2, 'KP-02', 'DC Fast', 'CHAdeMO', '50kW DC', 50.00, 17.50, 17.50, 'Available'),
(6, 3, 'HJ-01', 'DC Fast', 'CCS2', '60kW DC', 60.00, 16.00, 16.00, 'Available'),
(7, 3, 'HJ-02', 'AC Standard', 'Type 2', '7.4kW AC', 7.40, 8.50, 8.50, 'Available'),
(8, 4, 'BN-01', 'DC Fast', 'CCS2', '50kW DC', 50.00, 15.50, 15.50, 'Available'),
(9, 5, 'SN-01', 'DC Fast', 'CCS2', '60kW DC', 60.00, 16.00, 16.00, 'Available')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Charging Slots
CREATE TABLE IF NOT EXISTS charging_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    charger_id INT NOT NULL,
    station_id INT NOT NULL,
    slot_name VARCHAR(50) NOT NULL,
    start_time TIME DEFAULT '00:00:00',
    end_time TIME DEFAULT '23:59:59',
    status VARCHAR(50) DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

INSERT INTO charging_slots (id, charger_id, station_id, slot_name, status)
VALUES
(1, 1, 1, 'CH-01-SLOT-01', 'Available'),
(2, 2, 1, 'CH-02-SLOT-01', 'Available'),
(3, 4, 2, 'KP-01-SLOT-01', 'Available'),
(4, 6, 3, 'HJ-01-SLOT-01', 'Available')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    station_id INT NOT NULL,
    charger_id INT NOT NULL,
    slot_id INT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    energy_kwh DECIMAL(6, 2) DEFAULT 15.00,
    status VARCHAR(50) DEFAULT 'Confirmed',
    payment_status VARCHAR(50) DEFAULT 'Paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_booking_time (charger_id, booking_date, start_time, end_time),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE,
    FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
    razorpay_payment_id VARCHAR(100) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Successful',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- OTP Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    attempts INT DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_identifier (identifier)
);

-- Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reset_token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Wallet Transactions
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

INSERT IGNORE INTO wallet_transactions (id, user_id, type, amount, station_name, description, payment_method, status)
VALUES
(1, 1, 'credit', 2500.00, NULL, 'Initial Admin Balance', 'Admin Seed', 'success'),
(2, 3, 'credit', 1595.00, NULL, 'Wallet Top-up via UPI', 'UPI', 'success'),
(3, 3, 'debit', 185.00, 'Hinjewadi Tech Hub', 'Charging Session', 'Wallet', 'success'),
(4, 3, 'debit', 310.00, 'Baner High Street', 'Charging Session', 'Wallet', 'success');

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    station_id INT NOT NULL,
    booking_id INT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    charging_speed_rating INT NULL CHECK (charging_speed_rating >= 1 AND charging_speed_rating <= 5),
    availability_rating INT NULL CHECK (availability_rating >= 1 AND availability_rating <= 5),
    cleanliness_rating INT NULL CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    staff_rating INT NULL CHECK (staff_rating >= 1 AND staff_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Favorite Stations
CREATE TABLE IF NOT EXISTS favorite_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    station_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_station (user_id, station_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

-- Recurring Schedules
CREATE TABLE IF NOT EXISTS recurring_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    station_id INT NOT NULL,
    vehicle_id INT NULL,
    days_of_week VARCHAR(100) NOT NULL,
    time_of_day VARCHAR(20) NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);

-- Maintenance Tickets
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL,
    user_id INT NULL,
    user_name VARCHAR(100) NULL,
    station_id INT NOT NULL,
    station_name VARCHAR(150) NOT NULL,
    charger_id INT NULL,
    charger_number VARCHAR(50) DEFAULT 'General',
    problem_type VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'High Priority',
    description TEXT,
    status ENUM('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
    assigned_to VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
