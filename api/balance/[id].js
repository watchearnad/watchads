const getPool = require("../_db");

module.exports = async (req, res) => {
  const { id } = req.query;
  const db = getPool();

  // ambil balance sebagai TEXT lalu parse ke number (pg kirim numeric sebagai string)
  const { rows } = await db.query(
    "SELECT COALESCE(balance, 0)::text AS balance FROM users WHERE id = $1",
    [id]
  );

  const num = parseFloat(rows[0]?.balance ?? "0");
  res.status(200).json({ balance: Number.isFinite(num) ? num : 0 });
};
