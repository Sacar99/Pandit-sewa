require('dotenv').config();
const mysql = require('mysql2');

// Database Configuration - loaded from .env
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pandit_sewa',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise wrapper
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('💡 Troubleshooting:');
        console.error('   1. MySQL service running xa ki check garnus');
        console.error('   2. Check .env file credentials (DB_USER, DB_PASSWORD)');
        console.error('   3. Database "' + (process.env.DB_NAME || 'pandit_sewa') + '" create bhayo ki');
        console.error('   4. Port ' + (process.env.DB_PORT || 3306) + ' ma MySQL running xa');
    } else {
        console.log('✅ Database connected successfully!');
        console.log(`📊 Connected as: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
        console.log(`🗄️  Database: ${process.env.DB_NAME}`);
        connection.release();
    }
});

module.exports = promisePool;
module.exports.getConnection = () => pool.promise().getConnection();