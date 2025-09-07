// GET /api/reward-debug?userId=123
const getPool = require("./_db");
module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const uid = Number(url.searchParams.get("userId"));
    if (!Number.isFinite(uid) || uid <= 0) return res.status(400).json({ ok:false, error:"bad_userId" });

    const db = getPool();
    const u = await db.query("SELECT id, balance::text AS balance FROM public.users WHERE id=$1",[uid]);
    const logs = await db.query(
      "SELECT id, amount::text AS amount, created_at FROM public.ad_reward_logs WHERE user_id=$1 ORDER BY id DESC LIMIT 10",[uid]);
    const last = await db.query(
      "SELECT EXTRACT(EPOCH FROM (NOW()-created_at)) AS since FROM public.ad_reward_logs WHERE user_id=$1 ORDER BY id DESC LIMIT 1",[uid]);

    res.json({ ok:true, user:u.rows[0]||null, lastSecondsSince:last.rows[0]?.since ?? null, recentLogs:logs.rows });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};
