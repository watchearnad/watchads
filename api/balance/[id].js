const getPool = require("../_db");
module.exports = async (req, res) => {
  const { id } = req.query;
  const r = await getPool().query("SELECT balance FROM users WHERE id=$1", [id]);
  res.status(200).json({ balance: r.rows[0]?.balance || 0 });
};
