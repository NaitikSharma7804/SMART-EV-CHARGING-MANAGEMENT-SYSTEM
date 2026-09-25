// scripts/migrate_tidb.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const password = process.argv[2] || process.env.TIDB_PASSWORD;

if (!password) {
    console.error('❌ Please provide the TiDB password as an argument: node scripts/migrate_tidb.js <YOUR_PASSWORD>');
    process.exit(1);
}

const config = {
    host: process.env.DB_HOST || process.argv[3] || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: Number(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER || process.argv[4] || 'root',
    password: password,
    multipleStatements: true,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
    }
};

async function run() {
    console.log('🚀 Connecting to TiDB Cloud cluster...');
    let conn;
    try {
        conn = await mysql.createConnection(config);
        console.log('✅ Connected to TiDB Cloud successfully!');

        // 1. Create database
        console.log('📦 Ensuring database ev_charge_hub exists...');
        await conn.query('CREATE DATABASE IF NOT EXISTS ev_charge_hub;');
        await conn.query('USE ev_charge_hub;');
        console.log('✅ Database ev_charge_hub is ready.');

        // 2. Read tidb_schema.sql
        const sqlPath = path.join(__dirname, '../database/tidb_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Executing database/tidb_schema.sql statements...');
        await conn.query(sql);
        console.log('✅ All schema tables and seed data executed successfully!');

        // 3. Verify tables
        const [tables] = await conn.query('SHOW TABLES;');
        console.log(`\n🎉 Verification: Found ${tables.length} tables in ev_charge_hub:`);
        tables.forEach((t, i) => {
            const tableName = Object.values(t)[0];
            console.log(`   ${i + 1}. ${tableName}`);
        });

        const [users] = await conn.query('SELECT id, name, email, role FROM users;');
        console.log('\n👤 Initial Users:');
        console.table(users);

        const [stations] = await conn.query('SELECT id, name, city, rating FROM charging_stations;');
        console.log('\n⚡ Initial Stations:');
        console.table(stations);

        console.log('\n✨ Database migration completed 100% successfully!');
        await conn.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        if (conn) await conn.end();
        process.exit(1);
    }
}

run();
