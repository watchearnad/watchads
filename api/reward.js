// api/reward.js
const getPool = require("./_db");

function readBody(req){
  return new Promise(resolve=>{
    let d=""; req.on("data",c=>d+=c);
    req.on("end",()=>{ try{ resolve(JSON.parse(d||"{}")); }catch{ resolve({}); }});
  });
}

const MIN_SECONDS = 16;   // durasi nonton yang kamu mau
const REF_RATE = 0.10;    // komisi referral (ubah/0 kalau gak dipakai)

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error:"method_not_allowed" });

  const { userId, amount } = await readBody(req);
  const n = parseFloat(String(amount ?? "").replace(",", "."));
  if (!userId || !Number.isFinite(n) || n <= 0) return res.status(400).json({ error:"bad_request" });

  const db = getPool();

  // 1) Cek detik sejak klaim terakhir (berdasarkan log)
  const last = await db.query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) AS since
       FROM ad_reward_logs
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 1`, [userId]
  );
  const since = parseFloat(last.rows[0]?.since ?? `${MIN_SECONDS+1}`);
  if (since < MIN_SECONDS) {
    const left = Math.max(0, Math.ceil(MIN_SECONDS - since));
    return res.status(429).json({ error:"cooldown", secondsLeft:left });
  }

  try {
    await db.query("BEGIN");

    // 2) Pastikan user ada
    await db.query(
      "INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
      [userId]
    );

    // 3) Tambah saldo
    await db.query(
      "UPDATE users SET balance = COALESCE(balance,0) + $1, updated_at=NOW() WHERE id=$2",
      [n, userId]
    );

    // 4) Log reward
    await db.query(
      "INSERT INTO ad_reward_logs (user_id, amount) VALUES ($1,$2)",
      [userId, n]
    );

    // 5) Komisi referral (opsional)
    const ref = await db.query("SELECT referred_by FROM users WHERE id=$1", [userId]);
    const refBy = ref.rows[0]?.referred_by;
    if (refBy) {
      const c = +(n * REF_RATE).toFixed(6);
      await db.query("UPDATE users SET balance = COALESCE(balance,0) + $1 WHERE id=$2", [c, refBy]);
      await db.query(
        "INSERT INTO referral_commissions (referrer_id, referred_id, source, amount) VALUES ($1,$2,'ad_reward',$3)",
        [refBy, userId, c]
      );
    }

    const bal = await db.query("SELECT balance FROM users WHERE id=$1", [userId]);
    await db.query("COMMIT");
    res.json({ ok:true, balance: parseFloat(bal.rows[0]?.balance ?? 0) });
  } catch (e) {
    await db.query("ROLLBACK").catch(()=>{});
    console.error(e);
    res.status(500).json({ error:"server_error" });
  }
};
