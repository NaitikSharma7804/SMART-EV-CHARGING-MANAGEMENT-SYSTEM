USE ev_charge_hub;

-- Reviews & Ratings Table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    station_id INT NOT NULL,
    booking_id INT NOT NULL, -- Ensures user actually booked a slot
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    charging_speed_rating INT NULL CHECK (charging_speed_rating >= 1 AND charging_speed_rating <= 5),
    availability_rating INT NULL CHECK (availability_rating >= 1 AND availability_rating <= 5),
    cleanliness_rating INT NULL CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    staff_rating INT NULL CHECK (staff_rating >= 1 AND staff_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system', -- 'system', 'booking', 'payment', 'alert'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================================
-- EXISTING DATABASE MIGRATION
-- Run these statements if the reviews table already existed
-- before the category-rating feature was added.
-- =========================================================

ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS charging_speed_rating INT NULL CHECK (charging_speed_rating >= 1 AND charging_speed_rating <= 5),
    ADD COLUMN IF NOT EXISTS availability_rating INT NULL CHECK (availability_rating >= 1 AND availability_rating <= 5),
    ADD COLUMN IF NOT EXISTS cleanliness_rating INT NULL CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    ADD COLUMN IF NOT EXISTS staff_rating INT NULL CHECK (staff_rating >= 1 AND staff_rating <= 5);
