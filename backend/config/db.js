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

// Test connection on startup (only in local dev, skip blocking in serverless)
if (!process.env.VERCEL) {
    (async () => {
        try {
            const connection = await pool.getConnection();
            console.log('✅ Connected to database:', poolConfig.database, isSSL ? '(SSL Enabled)' : '');
            connection.release();
        } catch (err) {
            console.error('❌ Database connection failed:', err.message);
        }
    })();
}

export default pool;