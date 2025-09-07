// api/_db.js
const { Pool } = require("pg");

let pool;
module.exports = function getPool() {
  if (pool) return pool;

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "DATABASE_URL missing. Set Supabase Transaction Pooler :6543 with ?sslmode=require, then redeploy."
    );
  }

  // Pastikan tidak ada spasi/line break
  const urlStr = raw.trim();

  // Pakai WHATWG URL untuk parse; dukung 'postgresql://' & 'postgres://'
  const u = new URL(
    urlStr.startsWith("postgres://") ? urlStr : urlStr.replace(/^postgresql:\/\//, "postgres://")
  );

  pool = new Pool({
    host: u.hostname,
    port: parseInt(u.port || "5432", 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: (u.pathname && u.pathname.replace(/^\//, "")) || "postgres",
    // Supabase pooler butuh SSL
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
  });

  return pool;
};
