// GET /api/reward-kick?uid=123456789&amt=0.003
const getPool = require("./_db");
const MIN_SECONDS = 16;

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const uid = Number(url.searchParams.get("uid"));
    const amt = Number(url.searchParams.get("amt") || "0.003");
    if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ ok:false, error:"bad_request", detail:{ uid, amt } });
    }

    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id BIGINT PRIMARY KEY,
        balance NUMERIC(18,6) NOT NULL DEFAULT 0,
        referred_by BIGINT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS public.ad_reward_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount NUMERIC(18,6) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const last = await db.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) AS since
         FROM public.ad_reward_logs WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [uid]);
    const since = Number(last.rows[0]?.since ?? (MIN_SECONDS + 1));
    if (since < MIN_SECONDS) {
      return res.status(429).json({ ok:false, error:"cooldown", secondsLeft: Math.ceil(MIN_SECONDS - since) });
    }

    await db.query("BEGIN");
    await db.query("INSERT INTO public.users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [uid]);
    await db.query("UPDATE public.users SET balance = COALESCE(balance,0)+$1, updated_at = NOW() WHERE id=$2", [amt, uid]);
    await db.query("INSERT INTO public.ad_reward_logs (user_id, amount) VALUES ($1,$2)", [uid, amt]);
    const bal = await db.query("SELECT balance FROM public.users WHERE id=$1", [uid]);
    await db.query("COMMIT");

    res.json({ ok:true, balance: Number(bal.rows[0]?.balance ?? 0) });
  } catch (e) {
    try { await getPool().query("ROLLBACK"); } catch {}
    res.status(500).json({ ok:false, error:"server_error", code:e.code||null, message:e.message||String(e) });
  }
};
