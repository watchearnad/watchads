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
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(200).json({ ok: false, reason: "method_not_allowed" });
  }

  let db;
  try {
    const { uid, amt } = await extractParams(req);
    
    if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(amt) || amt <= 0) {
      return res.status(200).json({ 
        ok: false, 
        reason: "bad_request", 
        detail: { userId: uid, amount: amt } 
      });
    }

    db = getPool();
    
    // Ensure tables exist with proper indexes
    await db.query(`
      CREATE TABLE IF NOT EXISTS users(
        user_id BIGINT PRIMARY KEY,
        balance DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ad_reward_logs(
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_ad_reward_logs_user_created 
        ON ad_reward_logs(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
    `);

    // Check cooldown with optimized query
    const lastReward = await db.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_since
       FROM ad_reward_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [uid]
    );
    
    const secondsSince = Number(lastReward.rows[0]?.seconds_since ?? MIN_SECONDS + 1);
    
    if (secondsSince < MIN_SECONDS) {
      const secondsLeft = Math.ceil(MIN_SECONDS - secondsSince);
      return res.status(200).json({ 
        ok: false, 
        cooldown: true, 
        secondsLeft 
      });
    }

    // Process reward with transaction
    await db.query("BEGIN");
    
    try {
      // Upsert user with updated timestamp
      await db.query(`
        INSERT INTO users(user_id, balance, created_at, updated_at) 
        VALUES($1, $2, NOW(), NOW()) 
        ON CONFLICT(user_id) DO UPDATE SET 
          balance = users.balance + $2,
          updated_at = NOW()
      `, [uid, amt]);
      
      // Insert reward log
      await db.query(
        `INSERT INTO ad_reward_logs(user_id, amount) VALUES($1, $2)`, 
        [uid, amt]
      );
      
      // Get updated balance
      const balanceResult = await db.query(
        `SELECT balance FROM users WHERE user_id = $1`, 
        [uid]
      );
      
      const balance = Number(balanceResult.rows[0]?.balance ?? 0);
      
      await db.query("COMMIT");
      
      return res.status(200).json({ 
        ok: true, 
        credited: amt, 
        balance,
        cooldownSeconds: MIN_SECONDS
      });
      
    } catch (transactionError) {
      await db.query("ROLLBACK");
      throw transactionError;
    }
    
  } catch (error) {
    // Ensure rollback on any error
    if (db) {
      try { 
        await db.query("ROLLBACK"); 
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }
    
    console.error("Reward endpoint error:", error);
    
    return res.status(200).json({ 
      ok: false, 
      reason: "server_error", 
      detail: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};