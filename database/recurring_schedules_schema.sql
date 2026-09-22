-- database/recurring_schedules_schema.sql
-- Migration for Recurring Charging Schedules

USE ev_charge_hub;

CREATE TABLE IF NOT EXISTS recurring_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    station_id INT NOT NULL,
    vehicle_id INT NULL,
    days_of_week VARCHAR(100) NOT NULL, -- e.g. "Monday, Wednesday, Friday"
    time_of_day VARCHAR(20) NOT NULL,   -- e.g. "19:00:00" or "19:00"
    duration_minutes INT NOT NULL DEFAULT 45,
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);
