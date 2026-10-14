// backend/config/db.js
import mysql from 'mysql2/promise';
import 'dotenv/config';

const isTiDB = (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com')) || 
               String(process.env.DB_PORT) === '4000';
const isSSL = process.env.DB_SSL === 'true' || isTiDB;

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ev_charge_hub',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: process.env.VERCEL ? 5 : 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

if (isSSL) {
    poolConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
    };
}

let pool;
if (process.env.DATABASE_URL) {
    const urlConfig = {
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: process.env.VERCEL ? 5 : 15,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    };
    if (isSSL || process.env.DATABASE_URL.includes('tidbcloud.com') || process.env.DATABASE_URL.includes(':4000')) {
        urlConfig.ssl = {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
        };
    }
    pool = mysql.createPool(urlConfig);
} else {
    pool = mysql.createPool(poolConfig);
}

// Test connection & ensure schema compatibility on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to database:', poolConfig.database, isSSL ? '(SSL Enabled)' : '');

        try {
            const safeAdd = async (sql) => {
                try {
                    await connection.query(sql);
                } catch (e) {
                    // Ignore column already exists or duplicate column errors
                    if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
                        console.warn('Migration step notice:', e.message);
                    }
                }
            };

            // 1. Ensure vehicles table has both brand/model and vehicle_name/vehicle_model
            await safeAdd('ALTER TABLE vehicles ADD COLUMN vehicle_name VARCHAR(100) NULL');
            await safeAdd('ALTER TABLE vehicles ADD COLUMN vehicle_model VARCHAR(100) NULL');
            await safeAdd('ALTER TABLE vehicles ADD COLUMN brand VARCHAR(100) NULL');
            await safeAdd('ALTER TABLE vehicles ADD COLUMN model VARCHAR(100) NULL');
            await safeAdd('ALTER TABLE vehicles ADD COLUMN is_default BOOLEAN DEFAULT FALSE');

            try {
                await connection.query('UPDATE vehicles SET vehicle_name = brand WHERE vehicle_name IS NULL AND brand IS NOT NULL');
            } catch (e) {}
            try {
                await connection.query('UPDATE vehicles SET vehicle_model = model WHERE vehicle_model IS NULL AND model IS NOT NULL');
            } catch (e) {}
            try {
                await connection.query('UPDATE vehicles SET brand = vehicle_name WHERE brand IS NULL AND vehicle_name IS NOT NULL');
            } catch (e) {}
            try {
                await connection.query('UPDATE vehicles SET model = vehicle_model WHERE model IS NULL AND vehicle_model IS NOT NULL');
            } catch (e) {}

            // 2. Ensure bookings table has optional payment & slot columns
            await safeAdd('ALTER TABLE bookings ADD COLUMN razorpay_order_id VARCHAR(100) NULL');
            await safeAdd('ALTER TABLE bookings ADD COLUMN razorpay_payment_id VARCHAR(100) NULL');
            await safeAdd("ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'Pending'");
            await safeAdd('ALTER TABLE bookings ADD COLUMN slot_id INT NULL');

            // 3. Ensure recurring_schedules table exists
            await connection.query(`
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
                    INDEX idx_user_status (user_id, status)
                )
            `);

            console.log('✅ Schema compatibility checks completed successfully.');
        } catch (migErr) {
            console.warn('⚠️ Schema check notice:', migErr.message);
        }

        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
})();

export default pool;