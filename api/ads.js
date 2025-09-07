// api/ads.js — ambil daftar iklan aktif
const getPool = require("./_db");
module.exports = async (req, res) => {
  try {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        media_url TEXT,
        reward NUMERIC(18,6) NOT NULL DEFAULT 0,
        duration_sec INT NOT NULL DEFAULT 16,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const q = await db.query(`
      SELECT id, title, media_url, reward, duration_sec
      FROM ads
      WHERE (active = TRUE OR is_active = TRUE)
        AND media_url IS NOT NULL AND media_url <> ''
      ORDER BY id ASC
      LIMIT 50;
    `);
    res.setHeader("Content-Type","application/json");
    res.status(200).end(JSON.stringify(q.rows.map(r => ({
      id: r.id,
      title: r.title,
      media_url: r.media_url,
      reward: Number(r.reward ?? 0),
      duration_sec: Number(r.duration_sec ?? 16),
    }))));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
};
