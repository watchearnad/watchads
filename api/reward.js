// api/reward.js
const getPool = require("./_db");

// baca body POST aman (kalau req.body kosong)
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
  });
}

const parseAmount = (v) => {
  const s = String(v ?? 1).replace(",", "."); // dukung "1,25"
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 1;
};

module.exports = async (req, res) => {
  const payload = req.method === "POST" ? await readBody(req) : req.query;
  const userId = Number(payload.userId);
  const amount = parseAmount(payload.amount);

  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ error: "userId missing/invalid" });
  }

  const db = getPool();

  // upsert + tambah ke kolom numeric
  await db.query(
    `INSERT INTO users (id, balance) VALUES ($1, $2::numeric)
     ON CONFLICT (id) DO UPDATE SET balance = users.balance + EXCLUDED.balance`,
    [userId, amount]
  );

  const { rows } = await db.query(
    "SELECT COALESCE(balance, 0)::text AS balance FROM users WHERE id = $1",
    [userId]
  );
  const num = parseFloat(rows[0]?.balance ?? "0");
  res.status(200).json({ balance: Number.isFinite(num) ? num : 0 });
};
