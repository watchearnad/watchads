/* server/index.js
 * Express API untuk WatchAds (Supabase Postgres)
 * ENV: DATABASE_URL, (opsional) AD_COOLDOWN_SEC=60, REF_RATE=0.10
 */
import express from "express";
import cors from "cors";
import pg from "pg";
import fs from "fs/promises";
import path from "path";
import url from "url";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // pakai Supabase Pooling (port 6543)
  ssl: { rejectUnauthorized: false },
});

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSchema() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
}

const app = express();
app.use(cors());
app.use(express.json());

// helper
const toAmount = (v, def = 0) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
};

// ====== ENDPOINTS YANG DIPAKAI UI KAMU ======

// (opsional, kalau UI kamu ada init user) – aman walau tidak dipanggil
app.post("/api/init", async (req, res) => {
  const { userId, username, ref } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "missing_userId" });
  try {
    await pool.query(
      `INSERT INTO users (id, username, referred_by)
       VALUES ($1,$2, NULLIF($3, $1))
       ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, updated_at=NOW()`,
      [userId, username ?? null, ref ?? null]
    );
    const { rows } = await pool.query(
      "SELECT balance, cooldown_until FROM users WHERE id=$1",
      [userId]
    );
    res.json({
      ok: true,
      balance: parseFloat(rows[0]?.balance ?? 0),
      cooldownUntil: rows[0]?.cooldown_until ?? null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

// dipakai TaskAdsList.tsx → GET daftar iklan (boleh kosong, UI kamu tetap jalan)
app.get("/api/ads", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, media_url, reward, duration_sec FROM ads WHERE is_active=TRUE ORDER BY id ASC"
    );
    const list = rows.map((r) => ({
      id: r.id,
      title: r.title,
      media_url: r.media_url,
      reward: parseFloat(r.reward),
      duration_sec: Number(r.duration_sec),
    }));
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

// tombol klaim setelah iklan selesai
const AD_COOLDOWN_SEC = parseInt(process.env.AD_COOLDOWN_SEC ?? "60", 10);
const REF_RATE = parseFloat(process.env.REF_RATE ?? "0.10");

app.post("/api/reward", async (req, res) => {
  const userId = req.body?.userId;
  const amount = toAmount(req.body?.amount, 0);
  if (!userId || amount <= 0) return res.status(400).json({ error: "bad_request" });

  try {
    const now = new Date();
    const { rows: urows } = await pool.query(
      "SELECT cooldown_until, referred_by FROM users WHERE id=$1",
      [userId]
    );
    if (urows.length === 0) {
      // auto-create user kosong agar tidak ganggu UI
      await pool.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
    } else {
      const cu = urows[0].cooldown_until ? new Date(urows[0].cooldown_until) : null;
      if (cu && cu > now) {
        const left = Math.ceil((cu.getTime() - now.getTime()) / 1000);
        return res.status(429).json({ error: "cooldown", secondsLeft: left });
      }
    }

    await pool.query("BEGIN");
    await pool.query(
      "UPDATE users SET balance = COALESCE(balance,0) + $1, cooldown_until = NOW() + ($2 || ' seconds')::interval, updated_at=NOW() WHERE id=$3",
      [amount, AD_COOLDOWN_SEC, userId]
    );
    await pool.query("INSERT INTO ad_reward_logs (user_id, amount) VALUES ($1,$2)", [userId, amount]);

    // komisi referral
    const refBy = urows[0]?.referred_by ?? null;
    if (refBy) {
      const commission = +(amount * REF_RATE).toFixed(6);
      await pool.query("UPDATE users SET balance = COALESCE(balance,0) + $1 WHERE id=$2", [
        commission,
        refBy,
      ]);
      await pool.query(
        "INSERT INTO referral_commissions (referrer_id, referred_id, source, amount) VALUES ($1,$2,$3,$4)",
        [refBy, userId, "ad_reward", commission]
      );
    }

    const { rows: bal } = await pool.query(
      "SELECT balance, cooldown_until FROM users WHERE id=$1",
      [userId]
    );
    await pool.query("COMMIT");
    const next = new Date(bal[0].cooldown_until);
    const secondsLeft = Math.ceil((next.getTime() - Date.now()) / 1000);
    res.json({ ok: true, balance: parseFloat(bal[0].balance), cooldown: secondsLeft });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

// saldo
app.get("/api/balance/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT balance FROM users WHERE id=$1", [req.params.id]);
  res.json({ balance: parseFloat(rows[0]?.balance ?? 0) });
});

// withdraw (potong saldo & catat pending)
app.post("/api/withdraw", async (req, res) => {
  const { userId, amount, method, address } = req.body ?? {};
  const n = toAmount(amount, 0);
  if (!userId || n <= 0 || !method || !address) return res.status(400).json({ error: "bad_request" });

  try {
    await pool.query("BEGIN");
    const { rows: bal } = await pool.query("SELECT balance FROM users WHERE id=$1", [userId]);
    const balance = parseFloat(bal[0]?.balance ?? 0);
    if (n > balance) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "insufficient_balance" });
    }
    const ins = await pool.query(
      "INSERT INTO withdrawals (user_id, amount, method, address, status) VALUES ($1,$2,$3,$4,'pending') RETURNING id, status",
      [userId, n, method, address]
    );
    await pool.query("UPDATE users SET balance = balance - $1 WHERE id=$2", [n, userId]);
    const { rows: after } = await pool.query("SELECT balance FROM users WHERE id=$1", [userId]);
    await pool.query("COMMIT");
    res.json({ ok: true, requestId: ins.rows[0].id, status: ins.rows[0].status, balance: parseFloat(after[0].balance) });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

// referral summary (jika halaman referral kamu pakai)
app.get("/api/referrals/:id", async (req, res) => {
  const id = req.params.id;
  const [people, comm] = await Promise.all([
    pool.query(
      `SELECT u.id, COALESCE(u.username,'-') AS username,
              COALESCE(SUM(arl.amount),0) AS earned,
              COALESCE(SUM(CASE WHEN rc.referrer_id=$1 THEN rc.amount ELSE 0 END),0) AS commission,
              MIN(arl.created_at) AS joinedDate
       FROM users u
       LEFT JOIN ad_reward_logs arl ON arl.user_id = u.id
       LEFT JOIN referral_commissions rc ON rc.referred_id = u.id
       WHERE u.referred_by = $1
       GROUP BY u.id, u.username
       ORDER BY joinedDate DESC NULLS LAST, u.id DESC`,
      [id]
    ),
    pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM referral_commissions WHERE referrer_id=$1", [id]),
  ]);
  res.json({
    referrals: people.rows.map((r) => ({
      id: Number(r.id),
      username: r.username,
      earned: parseFloat(r.earned),
      commission: parseFloat(r.commission),
      joinedDate: r.joineddate ? new Date(r.joineddate).toISOString() : null,
    })),
    totalCommission: parseFloat(comm.rows[0].total),
  });
});

// (opsional) kalau UI kamu pakai endpoint task dinamis
app.get("/api/tasks", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, type, title, url, reward, is_active FROM tasks WHERE is_active=TRUE ORDER BY id ASC"
  );
  rows.forEach((r) => (r.reward = parseFloat(r.reward)));
  res.json({ tasks: rows });
});

app.post("/api/tasks/:id/complete", async (req, res) => {
  const userId = req.body?.userId;
  const taskId = parseInt(req.params.id, 10);
  if (!userId || !taskId) return res.status(400).json({ error: "bad_request" });

  try {
    const { rows: taskRows } = await pool.query("SELECT id, reward FROM tasks WHERE id=$1 AND is_active=TRUE", [taskId]);
    if (taskRows.length === 0) return res.status(404).json({ error: "task_not_found" });
    const reward = parseFloat(taskRows[0].reward);

    await pool.query("BEGIN");
    const ins = await pool.query(
      "INSERT INTO task_logs (user_id, task_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id",
      [userId, taskId]
    );
    let applied = false;
    if (ins.rowCount > 0) {
      await pool.query("UPDATE users SET balance = balance + $1 WHERE id=$2", [reward, userId]);
      const { rows: ru } = await pool.query("SELECT referred_by FROM users WHERE id=$1", [userId]);
      const refBy = ru[0]?.referred_by;
      if (refBy) {
        const c = +(reward * REF_RATE).toFixed(6);
        await pool.query("UPDATE users SET balance = balance + $1 WHERE id=$2", [c, refBy]);
        await pool.query(
          "INSERT INTO referral_commissions (referrer_id, referred_id, source, amount) VALUES ($1,$2,$3,$4)",
          [refBy, userId, "task_reward", c]
        );
      }
      applied = true;
    }
    const { rows: bal } = await pool.query("SELECT balance FROM users WHERE id=$1", [userId]);
    await pool.query("COMMIT");
    res.json({ ok: true, applied, balance: parseFloat(bal[0]?.balance ?? 0) });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
runSchema().then(() => {
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch((err) => {
  console.error("Failed to init schema", err);
  process.exit(1);
});
