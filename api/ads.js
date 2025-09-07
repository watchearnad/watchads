// api/ads.js — daftar iklan aktif (+ auto-seed kalau kosong)
const getPool = require("./_db");

module.exports = async (_req, res) => {
  try {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS public.ads (
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

    // seed 3 baris Monetag jika kosong
    const cnt = await db.query(`SELECT COUNT(*)::int AS n FROM public.ads`);
    if ((cnt.rows[0]?.n ?? 0) === 0) {
      await db.query(
        `INSERT INTO public.ads (title, media_url, reward, duration_sec, active, is_active)
         VALUES 
         ('Monetag Rewarded #1','monetag://9834777',0.003,16,TRUE,TRUE),
         ('Monetag Rewarded #2','monetag://9834777',0.003,16,TRUE,TRUE),
         ('Monetag Rewarded #3','monetag://9834777',0.003,16,TRUE,TRUE)`
      );
    }

    const q = await db.query(`
      SELECT id, title, media_url, reward::text AS reward, duration_sec
      FROM public.ads
      WHERE (active OR is_active) AND (media_url IS NOT NULL)
      ORDER BY id ASC
      LIMIT 10
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
    res.status(500).json({ error: "server_error", message: e.message });
  }
};
