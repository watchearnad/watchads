// api/reward-debug.js — GET /api/reward-debug?userId=123
const getPool = require("./_db");

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const uid = Number(url.searchParams.get("userId"));

    if (!Number.isFinite(uid) || uid <= 0) {
      return res.status(400).json({ ok: false, error: "bad_userId" });
    }

    const db = getPool();

    // Pastikan tabel ada
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        balance NUMERIC(18,6) NOT NULL DEFAULT 0,
        referred_by BIGINT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ad_reward_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount NUMERIC(18,6) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const u = await db.query("SELECT id, balance FROM users WHERE id=$1", [uid]);
    const logs = await db.query(
      `SELECT id, amount::text AS amount, created_at
         FROM ad_reward_logs
        WHERE user_id=$1
        ORDER BY id DESC
        LIMIT 5`,
      [uid]
    );
    const last = await db.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) AS since
         FROM ad_reward_logs
        WHERE user_id=$1
        ORDER BY id DESC
        LIMIT 1`,
      [uid]
    );

    res.json({
      ok: true,
      user: u.rows[0] || null,
      lastSecondsSince: last.rows[0]?.since ?? null,
      recentLogs: logs.rows,
      hint: "Kalau lastSecondsSince < 16 → server tolak (cooldown). Pastikan userId yang dikirim benar.",
    });
  } catch (e) {
    console.error("[/api/reward-debug] error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
