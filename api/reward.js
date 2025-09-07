// api/reward.js — terima GET/POST + JSON/form/query + cooldown 16s
const getPool = require("./_db");
const MIN_SECONDS = 16;

function extractParams(req) {
  return new Promise((resolve) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let uid = url.searchParams.get("uid") ?? url.searchParams.get("userId");
    let amt = url.searchParams.get("amt") ?? url.searchParams.get("amount");
    if (uid && amt) return resolve({ uid: Number(uid), amt: Number(amt) });

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const ct = (req.headers["content-type"] || "").toLowerCase();
      try {
        if (ct.includes("application/json")) {
          const j = JSON.parse(body || "{}");
          uid ??= j.userId ?? j.uid;
          amt ??= j.amount ?? j.amt;
        } else if (ct.includes("application/x-www-form-urlencoded")) {
          const p = new URLSearchParams(body || "");
          uid ??= p.get("userId") ?? p.get("uid");
          amt ??= p.get("amount") ?? p.get("amt");
        }
      } catch {}
      resolve({ uid: Number(uid), amt: Number(amt) });
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST")
    return res.status(405).json({ error: "method_not_allowed" });

  const { uid, amt } = await extractParams(req);
  if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(amt) || amt <= 0)
    return res.status(400).json({ error: "bad_request", detail: { userId: uid, amount: amt } });

  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.users(
      id BIGINT PRIMARY KEY,
      balance NUMERIC(18,6) NOT NULL DEFAULT 0,
      referred_by BIGINT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.ad_reward_logs(
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      amount NUMERIC(18,6) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const last = await db.query(
    `SELECT EXTRACT(EPOCH FROM (NOW()-created_at)) AS since
       FROM public.ad_reward_logs WHERE user_id=$1
       ORDER BY id DESC LIMIT 1`,
    [uid]
  );
  const since = Number(last.rows[0]?.since ?? MIN_SECONDS + 1);
  if (since < MIN_SECONDS)
    return res.status(429).json({ error: "cooldown", secondsLeft: Math.ceil(MIN_SECONDS - since) });

  try {
    await db.query("BEGIN");
    await db.query(`INSERT INTO public.users(id) VALUES($1) ON CONFLICT(id) DO NOTHING`, [uid]);
    await db.query(
      `UPDATE public.users SET balance = COALESCE(balance,0)+$1, updated_at=NOW() WHERE id=$2`,
      [amt, uid]
    );
    await db.query(`INSERT INTO public.ad_reward_logs(user_id,amount) VALUES($1,$2)`, [uid, amt]);
    const bal = await db.query(`SELECT balance FROM public.users WHERE id=$1`, [uid]);
    await db.query("COMMIT");
    res.json({ ok: true, balance: Number(bal.rows[0]?.balance ?? 0) });
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: "server_error", code: e.code || null, message: e.message || String(e) });
  }
};
