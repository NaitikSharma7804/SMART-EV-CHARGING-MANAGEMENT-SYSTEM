// database/seed_diverse_chargers.js
import pool from '../backend/config/db.js';

async function seedDiverseChargers() {
    try {
        console.log('Seeding diverse stations and chargers...');

        // 1. Check/add additional stations if not existing
        const [existingStations] = await pool.query('SELECT name FROM charging_stations');
        const stationNames = new Set(existingStations.map(s => s.name));

        if (!stationNames.has('Hinjewadi Tech Hub EV Station')) {
            await pool.query(`
                INSERT INTO charging_stations 
                (name, address, city, state, latitude, longitude, operator_name, opening_time, closing_time, is_24_hours, status, rating, total_reviews)
                VALUES 
                ('Hinjewadi Tech Hub EV Station', 'Hinjewadi Phase 1, Near Infosys Circle', 'Pune', 'Maharashtra', 18.5913, 73.7389, 'EV Charge Hub', '00:00:00', '23:59:59', 1, 'Active', 4.85, 24)
            `);
            console.log('Added Hinjewadi Tech Hub EV Station');
        }

        if (!stationNames.has('Baner High Street EV Station')) {
            await pool.query(`
                INSERT INTO charging_stations 
                (name, address, city, state, latitude, longitude, operator_name, opening_time, closing_time, is_24_hours, status, rating, total_reviews)
                VALUES 
                ('Baner High Street EV Station', 'Main High Street, Baner', 'Pune', 'Maharashtra', 18.5590, 73.7868, 'EV Charge Hub', '06:00:00', '23:00:00', 0, 'Active', 4.50, 16)
            `);
            console.log('Added Baner High Street EV Station');
        }

        // Get updated station list
        const [allStations] = await pool.query('SELECT id, name FROM charging_stations');
        const stationMap = {};
        allStations.forEach(s => { stationMap[s.name] = s.id; });

        // 2. Add diverse chargers where missing
        // Station 1: Add 7kW Type 2
        const [ch1] = await pool.query('SELECT id FROM chargers WHERE station_id = ? AND power_kw = 7.00', [stationMap['Shastri Nagar EV Station'] || 1]);
        if (ch1.length === 0 && stationMap['Shastri Nagar EV Station']) {
            await pool.query(`
                INSERT INTO chargers (station_id, charger_number, charger_type, connector_type, power_kw, price_per_hour, status)
                VALUES (?, 'CH-04', 'AC Slow', 'Type 2', 7.00, 8.50, 'Available')
            `, [stationMap['Shastri Nagar EV Station']]);
        }

        // Station 2: Add CHAdeMO
        const [ch2] = await pool.query('SELECT id FROM chargers WHERE station_id = ? AND connector_type = "CHAdeMO"', [stationMap['Koregaon Park EV Station'] || 2]);
        if (ch2.length === 0 && stationMap['Koregaon Park EV Station']) {
            await pool.query(`
                INSERT INTO chargers (station_id, charger_number, charger_type, connector_type, power_kw, price_per_hour, status)
                VALUES (?, 'CH-03', 'DC Fast', 'CHAdeMO', 50.00, 18.00, 'Available')
            `, [stationMap['Koregaon Park EV Station']]);
        }

        // Station 5: Add GB/T
        const [ch5] = await pool.query('SELECT id FROM chargers WHERE station_id = ? AND connector_type = "GB/T"', [stationMap['Shivaji Nagar EV Station'] || 5]);
        if (ch5.length === 0 && stationMap['Shivaji Nagar EV Station']) {
            await pool.query(`
                INSERT INTO chargers (station_id, charger_number, charger_type, connector_type, power_kw, price_per_hour, status)
                VALUES (?, 'CH-03', 'DC Fast', 'GB/T', 60.00, 16.00, 'Available')
            `, [stationMap['Shivaji Nagar EV Station']]);
        }

        // Hinjewadi chargers: CCS2 (150kW), CHAdeMO (60kW), GB/T (60kW), Type 2 (22kW)
        const hinjewadiId = stationMap['Hinjewadi Tech Hub EV Station'];
        if (hinjewadiId) {
            const [hinjCh] = await pool.query('SELECT id FROM chargers WHERE station_id = ?', [hinjewadiId]);
            if (hinjCh.length === 0) {
                await pool.query(`
                    INSERT INTO chargers (station_id, charger_number, charger_type, connector_type, power_kw, price_per_hour, status) VALUES
                    (?, 'CH-01', 'DC Ultra-Fast', 'CCS2', 150.00, 24.00, 'Available'),
                    (?, 'CH-02', 'DC Fast', 'CHAdeMO', 60.00, 19.00, 'Available'),
                    (?, 'CH-03', 'DC Fast', 'GB/T', 60.00, 17.50, 'Available'),
                    (?, 'CH-04', 'AC Fast', 'Type 2', 22.00, 12.00, 'Available')
                `, [hinjewadiId, hinjewadiId, hinjewadiId, hinjewadiId]);
                console.log('Added chargers for Hinjewadi Tech Hub');
            }
        }

        // Baner chargers: Type 2 (7kW), CCS2 (60kW)
        const banerId = stationMap['Baner High Street EV Station'];
        if (banerId) {
            const [banerCh] = await pool.query('SELECT id FROM chargers WHERE station_id = ?', [banerId]);
            if (banerCh.length === 0) {
                await pool.query(`
                    INSERT INTO chargers (station_id, charger_number, charger_type, connector_type, power_kw, price_per_hour, status) VALUES
                    (?, 'CH-01', 'AC Standard', 'Type 2', 7.00, 9.00, 'Available'),
                    (?, 'CH-02', 'DC Fast', 'CCS2', 60.00, 15.00, 'Available')
                `, [banerId, banerId]);
                console.log('Added chargers for Baner High Street');
            }
        }

        // Check one charger as 'Occupied' in Station 4 so available filtering can be tested
        const kharadiId = stationMap['Kharadi EV Station'] || 4;
        await pool.query(`
            UPDATE chargers SET status = 'Occupied' WHERE station_id = ? AND charger_number = 'CH-02'
        `, [kharadiId]);

        console.log('Diverse chargers & stations seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedDiverseChargers();
