USE ev_charge_hub;

-- Run this file once on an existing database.
-- It adds the four category ratings required by the Reviews & Ratings feature.

ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS charging_speed_rating INT NULL CHECK (charging_speed_rating >= 1 AND charging_speed_rating <= 5),
    ADD COLUMN IF NOT EXISTS availability_rating INT NULL CHECK (availability_rating >= 1 AND availability_rating <= 5),
    ADD COLUMN IF NOT EXISTS cleanliness_rating INT NULL CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    ADD COLUMN IF NOT EXISTS staff_rating INT NULL CHECK (staff_rating >= 1 AND staff_rating <= 5);
