// api/reward.js — kredit reward + log + cooldown 16s (auto-fix schema umum)
const getPool = require("./_db");

function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } });
  });
}

const MIN_SECONDS = 16;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const { userId, amount } = await readBody(req);
  const uid = Number(userId);
  const amt = Number(amount);
  if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: "bad_request" });
  }

  const db = getPool();

  // Pastikan skema benar (aman diulang)
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
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='users'
                   AND column_name='id' AND data_type='integer') THEN
        ALTER TABLE public.users ALTER COLUMN id TYPE BIGINT USING id::BIGINT;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='ad_reward_logs'
                   AND column_name='user_id' AND data_type='integer') THEN
        ALTER TABLE public.ad_reward_logs ALTER COLUMN user_id TYPE BIGINT USING user_id::BIGINT;
      END IF;
    END $$;
  `);

  // Cek cooldown ≥16 detik
  const last = await db.query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) AS since
       FROM public.ad_reward_logs
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1`,
    [uid]
  );
  const since = Number(last.rows[0]?.since ?? (MIN_SECONDS + 1));
  if (since < MIN_SECONDS) {
    return res.status(429).json({ error: "cooldown", secondsLeft: Math.max(0, Math.ceil(MIN_SECONDS - since)) });
  }

  try {
    await db.query("BEGIN");
    await db.query("INSERT INTO public.users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [uid]);
    await db.query("UPDATE public.users SET balance = COALESCE(balance,0) + $1, updated_at = NOW() WHERE id = $2", [amt, uid]);
    await db.query("INSERT INTO public.ad_reward_logs (user_id, amount) VALUES ($1,$2)", [uid, amt]);
    const bal = await db.query("SELECT balance FROM public.users WHERE id=$1", [uid]);
    await db.query("COMMIT");
    res.json({ ok: true, balance: Number(bal.rows[0]?.balance ?? 0) });
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    // Kasih error yang mudah dipahami di frontend
    if (e && e.code === "22003") { // integer out of range
      return res.status(500).json({ error: "schema_error_id_overflow" });
    }
    console.error("[/api/reward] error:", e);
    res.status(500).json({ error: "server_error" });
  }
};
