// GET /api/reward-debug?userId=123
const getPool = require("./_db");

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const uid = Number(url.searchParams.get("userId"));
    if (!Number.isFinite(uid) || uid <= 0) {
      return res.status(200).json({ ok: false, reason: "bad_userId" });
    }

    const db = getPool();
    
    // Ensure tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users(
        user_id BIGINT PRIMARY KEY,
        balance DOUBLE PRECISION DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ad_reward_logs(
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    const u = await db.query(
      "SELECT user_id, balance FROM users WHERE user_id=$1",
      [uid]
    );
    const logs = await db.query(
      "SELECT id, amount, created_at FROM ad_reward_logs WHERE user_id=$1 ORDER BY id DESC LIMIT 5",
      [uid]
    );
    const last = await db.query(
      "SELECT EXTRACT(EPOCH FROM (NOW()-created_at)) AS since FROM ad_reward_logs WHERE user_id=$1 ORDER BY id DESC LIMIT 1",
      [uid]
    );

    res.status(200).json({
      ok: true,
      user: u.rows[0] || { user_id: uid, balance: 0 },
      lastSecondsSince: last.rows[0]?.since ?? null,
      recentLogs: logs.rows
    });
  } catch (e) {
    console.error("Debug error:", e);
    res.status(200).json({ ok: false, reason: "server_error", detail: e.message });
  }
};