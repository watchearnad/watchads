// api/_db.js
const { Pool } = require("pg");

let pool;
module.exports = function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,   // pakai URI Supabase Pooler 6543 + ?sslmode=require
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
};
