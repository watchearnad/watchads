// api/balance/[id].js
const getPool = require("../_db");

module.exports = async (req, res) => {
  const id = req.query?.id || req.url.split("/").pop();
  if (!id) return res.status(400).json({ balance: 0 });

  const db = getPool();
  const r = await db.query("SELECT balance FROM users WHERE id=$1", [id]);
  res.json({ balance: parseFloat(r.rows[0]?.balance ?? 0) });
};
