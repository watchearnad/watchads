const { Pool } = require("pg");

let pool;

module.exports = function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      acquireTimeoutMillis: 60000,
      allowExitOnIdle: false
    });
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      pool.end(() => {
        console.log('Pool has ended');
        process.exit(0);
      });
    });
  }
  return pool;
};
