// api/init.js — sekali jalan buat tabel pendukung
const getPool = require("./_db");

module.exports = async (_req, res) => {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS ad_sessions (
      user_id BIGINT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  res.status(200).json({ ok: true });
};
