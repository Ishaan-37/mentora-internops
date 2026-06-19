// config/db.js
// PostgreSQL connection pool using node-postgres (pg)
// All queries go through this module — never import pg directly elsewhere

const { Pool } = require('pg');
const logger   = require('./logger');

// ------------------------------------------------------------------
// Connection pool
// ------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }   // Supabase / Railway use self-signed certs
    : false,
});

// Log any idle-client errors (network blip, DB restart, etc.)
pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', { error: err.message });
});

// ------------------------------------------------------------------
// query()
// Parameterized query helper — always use $1, $2 … placeholders.
// NEVER string-interpolate user input.
//
// Usage:
//   const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
// ------------------------------------------------------------------
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      logger.debug('DB query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (err) {
    logger.error('DB query error', { text, error: err.message });
    throw err;
  }
};

// ------------------------------------------------------------------
// getClient()
// Returns a raw client from the pool for multi-statement transactions.
//
// Usage:
//   const client = await db.getClient();
//   try {
//     await client.query('BEGIN');
//     await client.query('INSERT INTO ...', [...]);
//     await client.query('COMMIT');
//   } catch (e) {
//     await client.query('ROLLBACK');
//     throw e;
//   } finally {
//     client.release();
//   }
// ------------------------------------------------------------------
const getClient = () => pool.connect();

// ------------------------------------------------------------------
// healthCheck()
// Used by /api/health endpoint and startup probe
// ------------------------------------------------------------------
const healthCheck = async () => {
  const { rows } = await pool.query('SELECT NOW() AS server_time');
  return rows[0].server_time;
};

module.exports = { query, getClient, healthCheck };
