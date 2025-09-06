// api/ads.js
const getPool = require("./_db");

module.exports = async (_req, res) => {
  const db = getPool();

  // Aman dipanggil berkali-kali; kalau tabel sudah ada, ini di-skip
  await db.query(`
    CREATE TABLE IF NOT EXISTS ads (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      media_url TEXT NOT NULL,
      reward NUMERIC,              -- 0.003 dsb aman
      duration_sec INTEGER DEFAULT 16,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  const { rows } = await db.query(`
    SELECT id, title, media_url, reward::text AS reward, duration_sec
    FROM ads
    WHERE active = TRUE
    ORDER BY id DESC
    LIMIT 50
  `);

  // cast reward ke number
  res.status(200).json(rows.map(r => ({ ...r, reward: parseFloat(r.reward) })));
};
