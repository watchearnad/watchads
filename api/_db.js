const { Pool } = require("pg");
let pool;
module.exports = () => (pool ??= new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
}));
