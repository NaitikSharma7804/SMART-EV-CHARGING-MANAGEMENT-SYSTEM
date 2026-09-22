// ============================================================
// EV CHARGE HUB
// STATION CONTROLLER
// ============================================================

import pool from '../config/db.js';


// ============================================================
// GET ALL STATIONS
// GET /api/stations
// ============================================================

export const getStations = async (req, res) => {
    try {
        const {
            lat,
            lng,
            radius = 25,
            search,
            connector,
            power,
            availableOnly,
            minPrice,
            maxPrice,
            minRating
        } = req.query;

        const query = `
            SELECT
                s.id,
                s.name,
                s.address,
                s.city,
                s.state,
                s.latitude,
                s.longitude,
                s.operator_name,
                s.opening_time,
                s.closing_time,
                s.is_24_hours,
                s.status,
                s.rating,
                s.total_reviews,
                s.created_at,
                CASE 
                    WHEN s.is_24_hours = 1 THEN '24/7'
                    WHEN s.opening_time IS NOT NULL AND s.closing_time IS NOT NULL THEN CONCAT(s.opening_time, ' - ', s.closing_time)
                    ELSE '24/7'
                END AS operating_hours,
                COUNT(c.id) AS total_chargers,
                SUM(CASE WHEN LOWER(c.status) IN ('available', 'active') THEN 1 ELSE 0 END) AS available_chargers,
                GROUP_CONCAT(DISTINCT c.connector_type) AS connector_types_str,
                GROUP_CONCAT(DISTINCT c.power_kw) AS powers_str,
                MIN(c.price_per_hour) AS min_price,
                MAX(c.price_per_hour) AS max_price
            FROM charging_stations s
            LEFT JOIN chargers c ON s.id = c.station_id
            WHERE s.status != 'Inactive'
            GROUP BY s.id
            ORDER BY s.name ASC
        `;

        const [stations] = await pool.query(query);

        // ----------------------------------------------------
        // Map and parse aggregated charger attributes
        // ----------------------------------------------------
        let formattedStations = stations.map(station => {
            const connectors = station.connector_types_str
                ? station.connector_types_str.split(',').map(s => s.trim()).filter(Boolean)
                : [];
            const powers = station.powers_str
                ? station.powers_str.split(',').map(p => Number(p)).filter(p => !isNaN(p)).sort((a, b) => a - b)
                : [];
            const maxPower = powers.length > 0 ? Math.max(...powers) : 0;
            const minPriceVal = station.min_price !== null ? Number(station.min_price) : 0;
            const maxPriceVal = station.max_price !== null ? Number(station.max_price) : 0;
            const availableCount = Number(station.available_chargers || 0);
            const totalCount = Number(station.total_chargers || 0);

            return {
                ...station,
                connectors,
                powers,
                max_power_kw: maxPower,
                min_price: minPriceVal,
                max_price: maxPriceVal,
                price: minPriceVal,
                available_chargers: availableCount,
                available: availableCount,
                total_chargers: totalCount,
                distance: null
            };
        });

        // ----------------------------------------------------
        // Distance calculation using Haversine formula
        // ----------------------------------------------------
        if (
            lat !== undefined &&
            lng !== undefined &&
            Number.isFinite(Number(lat)) &&
            Number.isFinite(Number(lng))
        ) {
            const userLat = Number(lat);
            const userLng = Number(lng);
            const maxRadius = Number(radius) || 25;

            formattedStations = formattedStations
                .map(station => {
                    const stationLat = Number(station.latitude);
                    const stationLng = Number(station.longitude);

                    if (
                        !Number.isFinite(stationLat) ||
                        !Number.isFinite(stationLng)
                    ) {
                        return null;
                    }

                    const distance =
                        calculateDistance(
                            userLat,
                            userLng,
                            stationLat,
                            stationLng
                        );

                    return {
                        ...station,
                        distance:
                            Math.round(distance * 100) / 100
                    };
                })
                .filter(Boolean);

            if (maxRadius > 0) {
                formattedStations = formattedStations.filter(
                    station => station.distance <= maxRadius
                );
            }

            formattedStations.sort(
                (a, b) => a.distance - b.distance
            );
        }

        // ----------------------------------------------------
        // Query filters (optional backend support)
        // ----------------------------------------------------
        if (search && search.trim()) {
            const term = search.trim().toLowerCase();
            formattedStations = formattedStations.filter(s =>
                (s.name && s.name.toLowerCase().includes(term)) ||
                (s.address && s.address.toLowerCase().includes(term)) ||
                (s.city && s.city.toLowerCase().includes(term)) ||
                (s.operator_name && s.operator_name.toLowerCase().includes(term))
            );
        }

        if (connector) {
            const requestedConnectors = Array.isArray(connector)
                ? connector
                : connector.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            if (requestedConnectors.length > 0) {
                formattedStations = formattedStations.filter(s =>
                    s.connectors.some(c => requestedConnectors.includes(c.toLowerCase()))
                );
            }
        }

        if (power) {
            const powerTiers = Array.isArray(power) ? power : power.split(',').map(p => p.trim());
            formattedStations = formattedStations.filter(s => {
                return powerTiers.some(tier => {
                    if (tier === '7' || tier === '7kW') return s.powers.some(p => p >= 6 && p <= 11);
                    if (tier === '22' || tier === '22kW') return s.powers.some(p => p >= 12 && p <= 30);
                    if (tier === '60+' || tier === '60kW+' || tier === '60') return s.powers.some(p => p >= 50);
                    const num = Number(tier);
                    return Number.isFinite(num) && s.powers.some(p => p >= num);
                });
            });
        }

        if (availableOnly === 'true' || availableOnly === '1' || availableOnly === true) {
            formattedStations = formattedStations.filter(s => s.available_chargers > 0);
        }

        if (minPrice !== undefined && !isNaN(Number(minPrice))) {
            formattedStations = formattedStations.filter(s => s.min_price >= Number(minPrice));
        }

        if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
            formattedStations = formattedStations.filter(s => s.min_price <= Number(maxPrice) || s.max_price <= Number(maxPrice));
        }

        if (minRating !== undefined && !isNaN(Number(minRating))) {
            formattedStations = formattedStations.filter(s => Number(s.rating || 0) >= Number(minRating));
        }

        return res.status(200).json({
            success: true,
            count: formattedStations.length,
            data: formattedStations,
            stations: formattedStations
        });

    } catch (error) {
        console.error(
            'Get Stations Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch charging stations.',
            error:
                process.env.NODE_ENV !== 'production'
                    ? error.message
                    : undefined
        });
    }
};


// ============================================================
// GET SINGLE STATION
// GET /api/stations/:id
// ============================================================

// ============================================================
// GET SINGLE STATION
// GET /api/stations/:id
// ============================================================

export const getStationById = async (req, res) => {
    try {
        const stationId = Number(req.params.id);

        if (
            !Number.isInteger(stationId) ||
            stationId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid station ID.'
            });
        }

        // ----------------------------------------------------
        // GET STATION
        // ----------------------------------------------------

        const [stations] = await pool.query(
            `
            SELECT
                id,
                name,
                address,
                city,
                state,
                latitude,
                longitude,
                operator_name,
                opening_time,
                closing_time,
                is_24_hours,
                status,
                rating,
                total_reviews,
                created_at,
                updated_at
            FROM charging_stations
            WHERE id = ?
            LIMIT 1
            `,
            [stationId]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Charging station not found.'
            });
        }

        const station = stations[0];

        // ----------------------------------------------------
        // GET CHARGERS
        // ----------------------------------------------------

        const [chargers] = await pool.query(
            `
            SELECT
                id,
                station_id,
                charger_number,
                charger_type,
                connector_type,
                power_kw,
                price_per_hour,
                status
            FROM chargers
            WHERE station_id = ?
            ORDER BY id ASC
            `,
            [stationId]
        );

        // ----------------------------------------------------
        // GET AMENITIES
        //
        // Your database uses:
        // amenities
        // station_amenities
        //
        // NOT station_facilities
        // ----------------------------------------------------

        let amenities = [];

        try {
            const [amenityRows] = await pool.query(
                `
                SELECT
                    a.id,
                    a.name
                FROM amenities a
                INNER JOIN station_amenities sa
                    ON sa.amenity_id = a.id
                WHERE sa.station_id = ?
                ORDER BY a.name ASC
                `,
                [stationId]
            );

            amenities = amenityRows.map(
                amenity => amenity.name
            );

        } catch (amenityError) {
            // Amenities should not prevent the station
            // booking page from loading.
            console.warn(
                'Could not load station amenities:',
                amenityError.message
            );

            amenities = [];
        }

        // ----------------------------------------------------
        // FORMAT CHARGERS
        // ----------------------------------------------------

        const formattedChargers = chargers.map(
            charger => ({
                id: charger.id,

                station_id:
                    charger.station_id,

                charger_number:
                    charger.charger_number,

                charger_type:
                    charger.charger_type,

                connector_type:
                    charger.connector_type,

                power_kw:
                    Number(
                        charger.power_kw || 0
                    ),

                price_per_hour:
                    Number(
                        charger.price_per_hour || 0
                    ),

                // Frontend compatibility
                price:
                    Number(
                        charger.price_per_hour || 0
                    ),

                charging_speed:
                    `${Number(
                        charger.power_kw || 0
                    )} kW`,

                status:
                    charger.status
            })
        );

        // ----------------------------------------------------
        // FORMAT STATION
        // ----------------------------------------------------

        const formattedStation = {
            ...station,

            // Frontend compatibility
            station_id:
                station.id,

            station_name:
                station.name,

            location:
                station.address,

            charging_speed:
                formattedChargers.length > 0
                    ? formattedChargers[0]
                        .charging_speed
                    : null,

            charger_type:
                formattedChargers.length > 0
                    ? formattedChargers[0]
                        .charger_type
                    : null,

            price:
                formattedChargers.length > 0
                    ? formattedChargers[0]
                        .price
                    : null,

            amenities,

            chargers:
                formattedChargers
        };

        console.log(
            `Station ${stationId} loaded successfully`
        );

        console.log(
            `Chargers found: ${formattedChargers.length}`
        );

        console.log(
            `Amenities found: ${amenities.length}`
        );

        return res.status(200).json({
            success: true,

            data: formattedStation,

            // Compatibility
            station: formattedStation
        });

    } catch (error) {
        console.error(
            'Get Station Details Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Failed to fetch station details.',
            error:
                process.env.NODE_ENV !== 'production'
                    ? error.message
                    : undefined
        });
    }
};


// ============================================================
// GET STATION AVAILABILITY
// GET /api/stations/:id/availability
// ============================================================

export const getStationAvailability = async (
    req,
    res
) => {
    try {
        const stationId = Number(
            req.params.id
        );

        if (
            !Number.isInteger(stationId) ||
            stationId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid station ID.'
            });
        }


        const [slots] = await pool.query(
            `
            SELECT
                cs.id,
                cs.charger_id,
                cs.station_id,
                cs.slot_name,
                cs.start_time,
                cs.end_time,
                cs.status,

                c.charger_number,
                c.charger_type,
                c.connector_type,
                c.power_kw,
                c.price_per_hour

            FROM charging_slots cs

            JOIN chargers c
                ON cs.charger_id = c.id

            WHERE cs.station_id = ?

            ORDER BY
                cs.start_time ASC
            `,
            [stationId]
        );


        return res.status(200).json({
            success: true,
            count: slots.length,
            data: slots,
            slots: slots
        });

    } catch (error) {
        console.error(
            'Get Station Availability Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Failed to fetch station availability.',
            error:
                process.env.NODE_ENV !== 'production'
                    ? error.message
                    : undefined
        });
    }
};


// ============================================================
// HAVERSINE DISTANCE
// Returns distance in KM
// ============================================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const earthRadius = 6371;

    const dLat =
        toRadians(lat2 - lat1);

    const dLon =
        toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +

        Math.cos(
            toRadians(lat1)
        ) *
        Math.cos(
            toRadians(lat2)
        ) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadius * c;
}


function toRadians(degrees) {
    return degrees *
        (Math.PI / 180);
}


// ============================================================
// COMPATIBILITY ALIASES
// ============================================================

export const getStation =
    getStationById;

export const stationDetails =
    getStationById;


// ============================================================
// FAVORITE STATIONS
// ============================================================

let favoriteTableChecked = false;

async function ensureFavoriteTable() {
    if (favoriteTableChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favorite_stations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                station_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_station (user_id, station_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
            )
        `);
        favoriteTableChecked = true;
    } catch (err) {
        console.warn("ensureFavoriteTable check error:", err.message);
    }
}

// GET /api/stations/favorites
export const getFavoriteStations = async (req, res) => {
    try {
        await ensureFavoriteTable();
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const query = `
            SELECT 
                s.id,
                s.name,
                s.address,
                s.city,
                s.state,
                s.latitude,
                s.longitude,
                s.operator_name,
                s.rating,
                s.status,
                CASE 
                    WHEN s.is_24_hours = 1 THEN '24/7'
                    WHEN s.opening_time IS NOT NULL AND s.closing_time IS NOT NULL THEN CONCAT(s.opening_time, ' - ', s.closing_time)
                    ELSE '24/7'
                END AS operating_hours,
                f.created_at AS favorited_at,
                (
                    SELECT COUNT(*) 
                    FROM chargers c 
                    WHERE c.station_id = s.id AND (c.status = 'AVAILABLE' OR c.status = 'active')
                ) AS available_chargers
            FROM favorite_stations f
            JOIN charging_stations s ON f.station_id = s.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `;

        const [favorites] = await pool.query(query, [userId]);

        return res.status(200).json({
            success: true,
            favorites: favorites || []
        });
    } catch (error) {
        console.error('getFavoriteStations error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve favorite stations.',
            error: error.message
        });
    }
};

// GET /api/stations/favorites/ids
export const getFavoriteStationIds = async (req, res) => {
    try {
        await ensureFavoriteTable();
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const [rows] = await pool.query(
            'SELECT station_id FROM favorite_stations WHERE user_id = ?',
            [userId]
        );

        const favoriteIds = rows.map(r => Number(r.station_id));

        return res.status(200).json({
            success: true,
            favoriteIds
        });
    } catch (error) {
        console.error('getFavoriteStationIds error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve favorite station IDs.',
            error: error.message
        });
    }
};

// POST /api/stations/favorites/:id
export const addFavoriteStation = async (req, res) => {
    try {
        await ensureFavoriteTable();
        const userId = req.user?.id || req.user?.userId;
        const stationId = Number(req.params.id || req.body.stationId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!stationId || !Number.isInteger(stationId) || stationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid station ID is required.'
            });
        }

        // Check if station exists
        const [stations] = await pool.query(
            'SELECT id, name, address FROM charging_stations WHERE id = ?',
            [stationId]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Station not found.'
            });
        }

        await pool.query(
            'INSERT IGNORE INTO favorite_stations (user_id, station_id) VALUES (?, ?)',
            [userId, stationId]
        );

        return res.status(201).json({
            success: true,
            message: 'Station added to favorites.',
            station: stations[0]
        });
    } catch (error) {
        console.error('addFavoriteStation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add station to favorites.',
            error: error.message
        });
    }
};

// DELETE /api/stations/favorites/:id
export const removeFavoriteStation = async (req, res) => {
    try {
        await ensureFavoriteTable();
        const userId = req.user?.id || req.user?.userId;
        const stationId = Number(req.params.id);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!stationId || !Number.isInteger(stationId) || stationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'A valid station ID is required.'
            });
        }

        await pool.query(
            'DELETE FROM favorite_stations WHERE user_id = ? AND station_id = ?',
            [userId, stationId]
        );

        return res.status(200).json({
            success: true,
            message: 'Station removed from favorites.'
        });
    } catch (error) {
        console.error('removeFavoriteStation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to remove station from favorites.',
            error: error.message
        });
    }
};

// ============================================================
// SMART STATION RECOMMENDATIONS
// GET /api/stations/recommendations
// ============================================================
export const getSmartRecommendations = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        let userVehicle = null;
        let userConnector = req.query.connector ? String(req.query.connector).trim() : null;

        // If user is authenticated, query their registered vehicles
        if (userId) {
            try {
                const [vehicles] = await pool.query(
                    'SELECT id, vehicle_name, vehicle_model, vehicle_number, connector_type, battery_capacity FROM vehicles WHERE user_id = ? ORDER BY id ASC',
                    [userId]
                );
                if (vehicles && vehicles.length > 0) {
                    if (req.query.vehicle_id) {
                        userVehicle = vehicles.find(v => v.id === Number(req.query.vehicle_id)) || vehicles[0];
                    } else {
                        userVehicle = vehicles[0];
                    }
                    if (!userConnector && userVehicle.connector_type) {
                        userConnector = userVehicle.connector_type;
                    }
                }
            } catch (vErr) {
                console.warn('Vehicle lookup warning in recommendations:', vErr.message);
            }
        }

        // Coordinates (Default: Central Pune 18.5204, 73.8567)
        const userLat = parseFloat(req.query.lat) || 18.5204;
        const userLng = parseFloat(req.query.lng) || 73.8567;

        // Load all active stations with chargers aggregated
        const query = `
            SELECT
                s.id,
                s.name,
                s.address,
                s.city,
                s.state,
                s.latitude,
                s.longitude,
                s.operator_name,
                s.rating,
                s.total_reviews,
                s.is_24_hours,
                COUNT(c.id) AS total_chargers,
                SUM(CASE WHEN LOWER(c.status) IN ('available', 'active') THEN 1 ELSE 0 END) AS available_chargers,
                GROUP_CONCAT(DISTINCT c.connector_type) AS connector_types_str,
                GROUP_CONCAT(DISTINCT c.power_kw) AS powers_str,
                MIN(c.price_per_hour) AS min_price,
                MAX(c.price_per_hour) AS max_price
            FROM charging_stations s
            LEFT JOIN chargers c ON s.id = c.station_id
            WHERE s.status != 'Inactive'
            GROUP BY s.id
        `;

        const [stations] = await pool.query(query);

        // Score each station using the 6-factor transparent algorithm
        const scoredStations = stations.map(station => {
            const connectors = station.connector_types_str
                ? station.connector_types_str.split(',').map(c => c.trim()).filter(Boolean)
                : [];
            const powers = station.powers_str
                ? station.powers_str.split(',').map(p => Number(p)).filter(p => !isNaN(p))
                : [];
            const maxPower = powers.length > 0 ? Math.max(...powers) : 22;
            const minPrice = station.min_price !== null ? Number(station.min_price) : 15;
            const maxPrice = station.max_price !== null ? Number(station.max_price) : minPrice;
            const availableCount = Number(station.available_chargers || 0);
            const totalCount = Number(station.total_chargers || 0);
            const rating = Number(station.rating || 4.2);

            // Haversine Distance
            const radlat1 = (Math.PI * userLat) / 180;
            const radlat2 = (Math.PI * station.latitude) / 180;
            const theta = userLng - station.longitude;
            const radtheta = (Math.PI * theta) / 180;
            let dist = Math.sin(radlat1) * Math.sin(radlat2) +
                       Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            dist = Math.min(1, Math.max(-1, dist));
            dist = Math.acos(dist);
            dist = (dist * 180) / Math.PI;
            dist = dist * 60 * 1.1515 * 1.609344;
            const distance = Math.round(dist * 10) / 10;

            let score = 0;
            const reasons = [];
            const breakdown = {};

            // 1. Connector Match (30 pts)
            let connectorMatched = false;
            if (userConnector) {
                const target = userConnector.toLowerCase().trim();
                connectorMatched = connectors.some(c => c.toLowerCase().includes(target) || target.includes(c.toLowerCase()));
                if (connectorMatched) {
                    score += 30;
                    breakdown.connector = 30;
                    const vehLabel = userVehicle ? `${userVehicle.vehicle_name || userVehicle.vehicle_model}` : 'your vehicle';
                    reasons.push(`Compatible with ${vehLabel} (${userConnector})`);
                } else {
                    breakdown.connector = 0;
                    reasons.push(`Requires adapter (${connectors.slice(0, 2).join(', ')} available)`);
                }
            } else {
                score += 20;
                breakdown.connector = 20;
                if (connectors.length > 0) {
                    reasons.push(`Standard connectors supported (${connectors.slice(0, 3).join(', ')})`);
                }
            }

            // 2. Availability (25 pts)
            if (availableCount > 0) {
                const availRatio = availableCount / Math.max(totalCount, 1);
                const availPts = Math.round(15 + availRatio * 10);
                score += availPts;
                breakdown.availability = availPts;
                reasons.push(`Charger currently available (${availableCount} of ${totalCount} free)`);
            } else {
                breakdown.availability = 0;
                reasons.push(`High demand — chargers currently busy`);
            }

            // 3. Proximity / Distance (20 pts)
            let distPts = 6;
            if (distance <= 3.0) {
                distPts = 20;
                reasons.push(`Very close — just ${distance} km away`);
            } else if (distance <= 7.0) {
                distPts = 16;
                reasons.push(`Conveniently nearby (${distance} km away)`);
            } else if (distance <= 15.0) {
                distPts = 11;
                reasons.push(`Accessible location (${distance} km away)`);
            } else {
                distPts = 6;
                reasons.push(`Within driving range (${distance} km)`);
            }
            score += distPts;
            breakdown.distance = distPts;

            // 4. Charging Power / Speed (15 pts)
            let powerPts = 5;
            if (maxPower >= 60) {
                powerPts = 15;
                reasons.push(`Fast DC charging (${maxPower} kW)`);
            } else if (maxPower >= 30) {
                powerPts = 11;
                reasons.push(`Rapid charging (${maxPower} kW)`);
            } else if (maxPower >= 15) {
                powerPts = 8;
                reasons.push(`Standard charging (${maxPower} kW)`);
            } else {
                powerPts = 5;
                reasons.push(`AC standard charging (${maxPower} kW)`);
            }
            score += powerPts;
            breakdown.power = powerPts;

            // 5. Price Efficiency (10 pts)
            let pricePts = 4;
            if (minPrice <= 15) {
                pricePts = 10;
                reasons.push(`Within preferred price (₹${minPrice}/hr)`);
            } else if (minPrice <= 20) {
                pricePts = 7;
                reasons.push(`Affordable rate (₹${minPrice}/hr)`);
            } else {
                pricePts = 4;
                reasons.push(`High-power rate (₹${minPrice}/hr)`);
            }
            score += pricePts;
            breakdown.price = pricePts;

            // 6. Rating (Bonus / Trust, Max 10 pts)
            let ratingPts = 4;
            if (rating >= 4.6) {
                ratingPts = 10;
                reasons.push(`Top-rated station (${rating} ★)`);
            } else if (rating >= 4.0) {
                ratingPts = 7;
                reasons.push(`Well-rated by drivers (${rating} ★)`);
            } else {
                ratingPts = 4;
                reasons.push(`Driver reviewed (${rating} ★)`);
            }
            score += ratingPts;
            breakdown.rating = ratingPts;

            const finalScore = Math.min(100, Math.round(score));
            let matchLabel = 'Compatible';
            if (finalScore >= 90) matchLabel = 'Outstanding Match';
            else if (finalScore >= 80) matchLabel = 'Great Match';
            else if (finalScore >= 70) matchLabel = 'Good Match';

            return {
                id: station.id,
                name: station.name,
                address: station.address,
                city: station.city,
                state: station.state,
                latitude: station.latitude,
                longitude: station.longitude,
                operator_name: station.operator_name,
                rating: rating,
                total_reviews: station.total_reviews,
                is_24_hours: station.is_24_hours,
                connectors,
                powers,
                max_power_kw: maxPower,
                min_price: minPrice,
                max_price: maxPrice,
                price: minPrice,
                available_chargers: availableCount,
                total_chargers: totalCount,
                distance,
                score: finalScore,
                match_percentage: `${finalScore}%`,
                match_label: matchLabel,
                reasons,
                breakdown,
                primary_connector: userConnector && connectorMatched ? userConnector : (connectors[0] || 'CCS2')
            };
        });

        // Sort by score DESC, available DESC, distance ASC
        scoredStations.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.available_chargers !== a.available_chargers) return b.available_chargers - a.available_chargers;
            return a.distance - b.distance;
        });

        const topRecommendations = scoredStations.slice(0, 10);

        return res.status(200).json({
            success: true,
            count: topRecommendations.length,
            user_vehicle: userVehicle ? {
                id: userVehicle.id,
                name: userVehicle.vehicle_name || userVehicle.vehicle_model,
                model: userVehicle.vehicle_model,
                number: userVehicle.vehicle_number,
                connector: userVehicle.connector_type,
                battery_capacity: userVehicle.battery_capacity
            } : null,
            target_connector: userConnector,
            recommendations: topRecommendations
        });
    } catch (error) {
        console.error('getSmartRecommendations error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate smart recommendations.',
            error: error.message
        });
    }
};