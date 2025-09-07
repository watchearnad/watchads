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
      resolve({ uid: Number(uid), amt: Number(amt || 0.003) });
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST")
    return res.status(200).json({ ok: false, reason: "method_not_allowed" });

  try {
    const { uid, amt } = await extractParams(req);
    if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(amt) || amt <= 0)
      return res.status(200).json({ ok: false, reason: "bad_request", detail: { userId: uid, amount: amt } });

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

    // Check cooldown
    const last = await db.query(
      `SELECT EXTRACT(EPOCH FROM (NOW()-created_at)) AS since
         FROM ad_reward_logs WHERE user_id=$1
         ORDER BY id DESC LIMIT 1`,
      [uid]
    );
    const since = Number(last.rows[0]?.since ?? MIN_SECONDS + 1);
    if (since < MIN_SECONDS) {
      const secondsLeft = Math.ceil(MIN_SECONDS - since);
      return res.status(200).json({ ok: false, cooldown: true, secondsLeft });
    }

    // Process reward
    await db.query("BEGIN");
    
    // Upsert user
    await db.query(`
      INSERT INTO users(user_id, balance) VALUES($1, $2) 
      ON CONFLICT(user_id) DO UPDATE SET balance = users.balance + $2
    `, [uid, amt]);
    
    // Insert log
    await db.query(`INSERT INTO ad_reward_logs(user_id, amount) VALUES($1, $2)`, [uid, amt]);
    
    // Get updated balance
    const bal = await db.query(`SELECT balance FROM users WHERE user_id=$1`, [uid]);
    const balance = Number(bal.rows[0]?.balance ?? 0);
    
    await db.query("COMMIT");
    
    res.status(200).json({ ok: true, credited: amt, balance });
    
  } catch (e) {
    try { await getPool().query("ROLLBACK"); } catch {}
    console.error("Reward error:", e);
    res.status(200).json({ 
      ok: false, 
      reason: "server_error", 
      detail: e.message || String(e) 
    });
  }
};
