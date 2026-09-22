// database/seed_more_stations.js
import pool from '../backend/config/db.js';

const newStations = [
    {
        name: 'Aundh Nexus EV Hub',
        address: 'ITI Road, Parihar Chowk, Aundh',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5580,
        longitude: 73.8075,
        operator_name: 'Jio-bp pulse',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.65,
        total_reviews: 28,
        amenities: [2, 6, 7, 8], // Cafe, Parking, Restroom, WiFi
        chargers: [
            { number: 'AN-01', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 16.00, status: 'Available' },
            { number: 'AN-02', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 11.00, status: 'Available' },
            { number: 'AN-03', type: 'AC Standard', connector: 'Type 2', power: 7.00, price: 8.50, status: 'Available' }
        ]
    },
    {
        name: 'Kothrud Central Supercharge',
        address: 'Paud Road, Near Vanaz Metro Station, Kothrud',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5074,
        longitude: 73.8077,
        operator_name: 'Tata Power EZ Charge',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.80,
        total_reviews: 35,
        amenities: [1, 2, 5, 7], // Restaurant, Cafe, ATM, Restroom
        chargers: [
            { number: 'KC-01', type: 'DC Fast', connector: 'CCS2', power: 120.00, price: 19.00, status: 'Available' },
            { number: 'KC-02', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 15.00, status: 'Available' },
            { number: 'KC-03', type: 'DC Fast', connector: 'CHAdeMO', power: 50.00, price: 17.00, status: 'Available' }
        ]
    },
    {
        name: 'Magarpatta Cybercity EV Station',
        address: 'Destination Centre, Magarpatta City, Hadapsar',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5147,
        longitude: 73.9282,
        operator_name: 'Statiq Power',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.75,
        total_reviews: 42,
        amenities: [4, 6, 8, 10], // Shopping, Parking, WiFi, Food Court
        chargers: [
            { number: 'MC-01', type: 'DC Ultra-Fast', connector: 'CCS2', power: 150.00, price: 21.00, status: 'Available' },
            { number: 'MC-02', type: 'DC Fast', connector: 'GB/T', power: 60.00, price: 16.00, status: 'Available' },
            { number: 'MC-03', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 12.00, status: 'Available' }
        ]
    },
    {
        name: 'Wakad Phoenix EV Express',
        address: 'Datta Mandir Road, Near Phoenix Mall of Millennium, Wakad',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5987,
        longitude: 73.7634,
        operator_name: 'EV Charge Hub',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.90,
        total_reviews: 56,
        amenities: [4, 6, 7, 10], // Shopping, Parking, Restroom, Food Court
        chargers: [
            { number: 'WP-01', type: 'DC Ultra-Fast', connector: 'CCS2', power: 180.00, price: 24.00, status: 'Available' },
            { number: 'WP-02', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 15.00, status: 'Available' },
            { number: 'WP-03', type: 'DC Fast', connector: 'CHAdeMO', power: 60.00, price: 18.00, status: 'Available' },
            { number: 'WP-04', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 11.00, status: 'Available' }
        ]
    },
    {
        name: 'Pimpri Finolex Metro Charging',
        address: 'Old Mumbai-Pune Highway, Pimpri Colony, PCMC',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.6279,
        longitude: 73.8009,
        operator_name: 'Ather Grid & Tata Power',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.45,
        total_reviews: 19,
        amenities: [5, 6, 7], // ATM, Parking, Restroom
        chargers: [
            { number: 'PF-01', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 14.50, status: 'Available' },
            { number: 'PF-02', type: 'DC Fast', connector: 'GB/T', power: 60.00, price: 15.00, status: 'Available' },
            { number: 'PF-03', type: 'AC Standard', connector: 'Type 2', power: 7.00, price: 8.00, status: 'Available' }
        ]
    },
    {
        name: 'Swargate Metro Transit EV Hub',
        address: 'Jedhe Chowk, Near Swargate Bus Stand',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5018,
        longitude: 73.8586,
        operator_name: 'MSEDCL & EV Charge Hub',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.35,
        total_reviews: 22,
        amenities: [2, 7, 9], // Cafe, Restroom, Waiting Area
        chargers: [
            { number: 'SW-01', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 14.00, status: 'Available' },
            { number: 'SW-02', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 10.00, status: 'Available' },
            { number: 'SW-03', type: 'AC Standard', connector: 'Type 2', power: 7.00, price: 8.00, status: 'Occupied' }
        ]
    },
    {
        name: 'Camp MG Road EV Plaza',
        address: 'East Street, Near Aurora Towers, Camp',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5167,
        longitude: 73.8789,
        operator_name: 'Shell Recharge',
        opening_time: '06:00:00',
        closing_time: '23:30:00',
        is_24_hours: 0,
        status: 'Active',
        rating: 4.70,
        total_reviews: 31,
        amenities: [1, 2, 4, 6], // Restaurant, Cafe, Shopping, Parking
        chargers: [
            { number: 'MG-01', type: 'DC Fast', connector: 'CCS2', power: 120.00, price: 20.00, status: 'Available' },
            { number: 'MG-02', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 12.00, status: 'Available' },
            { number: 'MG-03', type: 'DC Fast', connector: 'CHAdeMO', power: 50.00, price: 17.50, status: 'Available' }
        ]
    },
    {
        name: 'Pune Railway Station EV Point',
        address: 'RBM Road, Pune Station Concourse',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5284,
        longitude: 73.8744,
        operator_name: 'Indian Oil EV Care',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.20,
        total_reviews: 14,
        amenities: [5, 7, 9], // ATM, Restroom, Waiting Area
        chargers: [
            { number: 'PS-01', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 15.00, status: 'Available' },
            { number: 'PS-02', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 10.50, status: 'Available' }
        ]
    },
    {
        name: 'Bavdhan & Chandani Chowk Hub',
        address: 'NDA Road, Near Chandani Chowk Flyover, Bavdhan',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5089,
        longitude: 73.7745,
        operator_name: 'Fortum Charge & Drive',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.60,
        total_reviews: 27,
        amenities: [1, 2, 6, 7], // Restaurant, Cafe, Parking, Restroom
        chargers: [
            { number: 'BV-01', type: 'DC Ultra-Fast', connector: 'CCS2', power: 150.00, price: 22.00, status: 'Available' },
            { number: 'BV-02', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 15.00, status: 'Available' },
            { number: 'BV-03', type: 'AC Standard', connector: 'Type 2', power: 7.00, price: 9.00, status: 'Available' }
        ]
    },
    {
        name: 'Kalyani Nagar Waterfront EV Station',
        address: 'North Main Road, Near Jogger\'s Park, Kalyani Nagar',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5463,
        longitude: 73.9034,
        operator_name: 'Zeon Charging',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.85,
        total_reviews: 38,
        amenities: [2, 6, 7, 8], // Cafe, Parking, Restroom, WiFi
        chargers: [
            { number: 'KN-01', type: 'DC Fast', connector: 'CCS2', power: 120.00, price: 19.50, status: 'Available' },
            { number: 'KN-02', type: 'DC Fast', connector: 'GB/T', power: 60.00, price: 16.00, status: 'Available' },
            { number: 'KN-03', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 11.50, status: 'Available' }
        ]
    },
    {
        name: 'Senapati Bapat Road Tech Plaza',
        address: 'ICC Tech Park, Senapati Bapat Road',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.5312,
        longitude: 73.8298,
        operator_name: 'EV Charge Hub',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.65,
        total_reviews: 25,
        amenities: [1, 2, 5, 6], // Restaurant, Cafe, ATM, Parking
        chargers: [
            { number: 'SB-01', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 16.00, status: 'Available' },
            { number: 'SB-02', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 11.00, status: 'Available' },
            { number: 'SB-03', type: 'AC Standard', connector: 'Type 2', power: 7.00, price: 8.50, status: 'Available' }
        ]
    },
    {
        name: 'Nigdi Pradhikaran EV Station',
        address: 'Bhakti Shakti Chowk, Nigdi, PCMC',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.6548,
        longitude: 73.7725,
        operator_name: 'Tata Power EZ Charge',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.40,
        total_reviews: 18,
        amenities: [1, 6, 7], // Restaurant, Parking, Restroom
        chargers: [
            { number: 'NG-01', type: 'DC Fast', connector: 'CCS2', power: 60.00, price: 14.50, status: 'Available' },
            { number: 'NG-02', type: 'DC Fast', connector: 'CHAdeMO', power: 50.00, price: 17.00, status: 'Available' },
            { number: 'NG-03', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 10.00, status: 'Available' }
        ]
    },
    {
        name: 'Sinhagad Road Abhiruchi Hub',
        address: 'Sinhagad Road, Vadgaon Budruk',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.4725,
        longitude: 73.8189,
        operator_name: 'Jio-bp pulse',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.55,
        total_reviews: 21,
        amenities: [2, 4, 6, 7], // Cafe, Shopping, Parking, Restroom
        chargers: [
            { number: 'SR-01', type: 'DC Fast', connector: 'CCS2', power: 120.00, price: 18.00, status: 'Available' },
            { number: 'SR-02', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 11.00, status: 'Available' },
            { number: 'SR-03', type: 'AC Standard', connector: 'Type 2', power: 7.00, price: 8.50, status: 'Available' }
        ]
    },
    {
        name: 'Mumbai-Pune Expressway Urse Plaza',
        address: 'Urse Toll Plaza, Mumbai-Pune Expressway',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.7214,
        longitude: 73.6652,
        operator_name: 'Shell Recharge Hypercharge',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.90,
        total_reviews: 85,
        amenities: [1, 5, 6, 7, 8, 10], // Restaurant, ATM, Parking, Restroom, WiFi, Food Court
        chargers: [
            { number: 'XP-01', type: 'DC Hyper-Fast', connector: 'CCS2', power: 240.00, price: 26.00, status: 'Available' },
            { number: 'XP-02', type: 'DC Fast', connector: 'CCS2', power: 120.00, price: 20.00, status: 'Available' },
            { number: 'XP-03', type: 'DC Fast', connector: 'CHAdeMO', power: 60.00, price: 19.00, status: 'Available' },
            { number: 'XP-04', type: 'DC Fast', connector: 'GB/T', power: 60.00, price: 18.00, status: 'Available' },
            { number: 'XP-05', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 13.00, status: 'Available' }
        ]
    },
    {
        name: 'Chakan Auto Cluster EV Hub',
        address: 'MIDC Phase 2, Chakan Industrial Area',
        city: 'Pune',
        state: 'Maharashtra',
        latitude: 18.7523,
        longitude: 73.8512,
        operator_name: 'EV Charge Hub Heavy',
        opening_time: '00:00:00',
        closing_time: '23:59:59',
        is_24_hours: 1,
        status: 'Active',
        rating: 4.50,
        total_reviews: 16,
        amenities: [6, 7, 9], // Parking, Restroom, Waiting Area
        chargers: [
            { number: 'CK-01', type: 'DC Ultra-Fast', connector: 'CCS2', power: 150.00, price: 21.00, status: 'Available' },
            { number: 'CK-02', type: 'DC Fast', connector: 'GB/T', power: 120.00, price: 19.00, status: 'Available' },
            { number: 'CK-03', type: 'AC Fast', connector: 'Type 2', power: 22.00, price: 11.00, status: 'Available' }
        ]
    }
];

async function seedMoreStations() {
    try {
        console.log('Seeding 15 additional charging stations...');

        const [existing] = await pool.query('SELECT name FROM charging_stations');
        const existingNames = new Set(existing.map(s => s.name));

        let addedCount = 0;

        for (const st of newStations) {
            if (existingNames.has(st.name)) {
                console.log(`Station already exists: ${st.name}`);
                continue;
            }

            // 1. Insert Station
            const [res] = await pool.query(`
                INSERT INTO charging_stations 
                (name, address, city, state, latitude, longitude, operator_name, opening_time, closing_time, is_24_hours, status, rating, total_reviews)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                st.name,
                st.address,
                st.city,
                st.state,
                st.latitude,
                st.longitude,
                st.operator_name,
                st.opening_time,
                st.closing_time,
                st.is_24_hours,
                st.status,
                st.rating,
                st.total_reviews
            ]);

            const stationId = res.insertId;

            // 2. Insert Chargers and Slots
            for (const ch of st.chargers) {
                const [chRes] = await pool.query(`
                    INSERT INTO chargers 
                    (station_id, charger_number, charger_type, connector_type, power_kw, price_per_hour, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    stationId,
                    ch.number,
                    ch.type,
                    ch.connector,
                    ch.power,
                    ch.price,
                    ch.status
                ]);

                const chargerId = chRes.insertId;

                // Insert booking slot
                const slotStatus = ch.status === 'Available' ? 'Available' : 'Booked';
                await pool.query(`
                    INSERT INTO charging_slots
                    (charger_id, station_id, slot_name, start_time, end_time, status)
                    VALUES (?, ?, ?, '00:00:00', '23:59:59', ?)
                `, [
                    chargerId,
                    stationId,
                    `${ch.number}-SLOT-01`,
                    slotStatus
                ]);
            }

            // 3. Insert Amenities
            for (const amenityId of st.amenities) {
                await pool.query(`
                    INSERT IGNORE INTO station_amenities (station_id, amenity_id)
                    VALUES (?, ?)
                `, [stationId, amenityId]);
            }

            addedCount++;
            console.log(`✓ Added: ${st.name} (ID: ${stationId}, Chargers: ${st.chargers.length})`);
        }

        const [finalCount] = await pool.query('SELECT COUNT(*) as total FROM charging_stations');
        console.log(`\nDone! Added ${addedCount} new stations. Total charging stations in database: ${finalCount[0].total}`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding more stations:', err);
        process.exit(1);
    }
}

seedMoreStations();
