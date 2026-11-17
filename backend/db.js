require('dotenv').config();
const { Pool } = require('pg');

// Determine connection settings (supports Supabase connection string DATABASE_URL or discrete variables)
const connectionConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: (process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'))
            ? { rejectUnauthorized: false }
            : false
    };

const pool = new Pool(connectionConfig);

// Helper to convert MySQL "?" placeholders to PostgreSQL "$1, $2, ..." and handle RETURNING id for inserts
function transformSql(sql) {
    let paramIndex = 1;
    let converted = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Automatically add RETURNING id for INSERT queries if not already present
    const isInsert = /^\s*insert\s+/i.test(converted);
    if (isInsert && !/returning\s+/i.test(converted)) {
        converted = `${converted.trim().replace(/;$/, '')} RETURNING id;`;
    }
    return converted;
}

// Format result to match [rows, resultMeta] structure expected by existing code
function formatResult(res) {
    const rows = res.rows || [];
    const meta = {
        insertId: rows.length > 0 && rows[0].id ? rows[0].id : null,
        affectedRows: res.rowCount || 0,
        rowCount: res.rowCount || 0
    };
    return [rows, meta];
}

// Wrapper for pool.query that provides MySQL2-compatible syntax: [rows, result] = await db.query(sql, params)
async function query(sql, params = []) {
    const pgSql = transformSql(sql);
    const res = await pool.query(pgSql, params);
    return formatResult(res);
}

// Transaction wrapper for db.getConnection()
async function getConnection() {
    const client = await pool.connect();
    return {
        query: async (sql, params = []) => {
            const pgSql = transformSql(sql);
            const res = await client.query(pgSql, params);
            return formatResult(res);
        },
        beginTransaction: async () => {
            await client.query('BEGIN');
        },
        commit: async () => {
            await client.query('COMMIT');
        },
        rollback: async () => {
            await client.query('ROLLBACK');
        },
        release: () => {
            client.release();
        }
    };
}

// Initial connection test
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Supabase / PostgreSQL database connection failed:', err.message);
        console.error('💡 Troubleshooting:');
        console.error('   1. Check your DATABASE_URL in .env');
        console.error('   2. Verify Supabase project is active and password is correct');
        console.error('   3. If using pooler, ensure port is 6543 or 5432 with SSL enabled');
    } else {
        console.log('✅ Supabase PostgreSQL connected successfully!');
        release();
    }
});

module.exports = {
    query,
    getConnection,
    pool
};