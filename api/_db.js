// api/balance/[id].js
const getPool = require("../_db");

module.exports = async (req, res) => {
  try {
    const id = req.query?.id || req.url.split("/").pop();
    if (!id) return res.status(200).json({ balance: 0 });

    const db = getPool();
    
    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS users(
        user_id BIGINT PRIMARY KEY,
        balance DOUBLE PRECISION DEFAULT 0
      );
    `);
    
    const r = await db.query("SELECT balance FROM users WHERE user_id=$1", [id]);
    res.status(200).json({ balance: parseFloat(r.rows[0]?.balance ?? 0) });
  } catch (e) {
    console.error("Balance error:", e);
    res.status(200).json({ balance: 0 });
  }
};
