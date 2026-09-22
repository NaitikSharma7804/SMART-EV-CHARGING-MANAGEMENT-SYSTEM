USE ev_charge_hub;

-- Favorite Stations Table
CREATE TABLE IF NOT EXISTS favorite_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    station_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_station (user_id, station_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
);
