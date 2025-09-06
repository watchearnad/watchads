const getPool = require("./_db");
module.exports = async (req, res) => {
  const data = req.method === "GET" ? req.query : (req.body || {});
  const userId = Number(data.userId);
  const amount = Number(data.amount || 1); // kalau mau pass amount
  if (!userId) return res.status(400).json({ error: "userId missing" });

  const db = getPool();
  await db.query(`
    INSERT INTO users (id, balance) VALUES ($1, $2)
    ON CONFLICT (id) DO UPDATE SET balance = users.balance + EXCLUDED.balance
  `, [userId, amount]);

  const r = await db.query("SELECT balance FROM users WHERE id=$1", [userId]);
  res.status(200).json({ balance: r.rows[0].balance });
};
