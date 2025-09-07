// api/_db.js
const { Pool } = require("pg");
let pool;
module.exports = function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url || !url.startsWith("postgres")) {
      throw new Error("DATABASE_URL missing/invalid. Use Supabase Transaction Pooler :6543 with ?sslmode=require and redeploy.");
    }
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10000 });
  }
  return pool;
};
