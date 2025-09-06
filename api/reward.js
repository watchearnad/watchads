// api/reward.js
const getPool = require("./_db");

// baca body POST aman
function readBody(req){
  return new Promise((resolve)=>{
    let data=""; req.on("data",(c)=>data+=c);
    req.on("end",()=>{ try{ resolve(JSON.parse(data||"{}")) } catch{ resolve({}) } });
  });
}
const parseAmount = (v)=>{
  const n = parseFloat(String(v ?? 1).replace(",", "."));
  return Number.isFinite(n) ? n : 1;
};

const COOLDOWN_SEC = 16;

module.exports = async (req, res) => {
  const payload = req.method === "POST" ? await readBody(req) : req.query;
  const userId = Number(payload.userId);
  const amount = parseAmount(payload.amount); // mis: 1.25
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ error: "userId missing/invalid" });
  }

  const db = getPool();

  // Pastikan tabel ada (aman dipanggil berkali-kali)
  await db.query(`
    CREATE TABLE IF NOT EXISTS ad_sessions (
      user_id BIGINT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Pastikan row user ada
  await db.query(`INSERT INTO users (id, balance) VALUES ($1, 0)
                  ON CONFLICT (id) DO NOTHING`, [userId]);

  // Coba buka sesi baru hanya jika cooldown lewat (atomic)
  const { rows } = await db.query(
    `
    WITH last AS (
      SELECT MAX(started_at) AS last_started
      FROM ad_sessions
      WHERE user_id = $1
    ),
    ins AS (
      INSERT INTO ad_sessions(user_id, started_at)
      SELECT $1, now()
      FROM last
      WHERE last.last_started IS NULL
         OR now() >= last.last_started + ($2 || ' seconds')::interval
      RETURNING 1
    )
    SELECT
      (SELECT COUNT(*) FROM ins)::int AS inserted,
      GREATEST(
        0,
        CEIL(
          EXTRACT(EPOCH FROM (
            COALESCE((SELECT last_started FROM last), now())
            + ($2 || ' seconds')::interval - now()
          ))
        )
      )::int AS cooldown_left
    `,
    [userId, COOLDOWN_SEC]
  );

  const inserted = rows[0]?.inserted === 1;
  const cooldownLeft = Number(rows[0]?.cooldown_left ?? COOLDOWN_SEC);

  if (inserted) {
    // Tambah saldo
    const up = await db.query(
      `UPDATE users
         SET balance = balance + $2::numeric
       WHERE id = $1
       RETURNING balance`,
      [userId, amount]
    );
    const balance = parseFloat(String(up.rows[0].balance));
    return res.status(200).json({ balance, cooldown: 0 });
  }

  // Masih cooldown → kirim sisa detik & saldo sekarang
  const cur = await db.query(
    "SELECT COALESCE(balance,0)::text AS b FROM users WHERE id=$1",
    [userId]
  );
  const balance = parseFloat(cur.rows[0]?.b ?? "0");
  return res.status(200).json({ balance, cooldown: cooldownLeft });
};
