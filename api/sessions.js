const getPool = require("./_db");
module.exports = async (req, res) => {
  const db = getPool();
  const uid = req.query.userId ? Number(req.query.userId) : null;
  const sql = uid
    ? `SELECT user_id, started_at FROM ad_sessions
       WHERE user_id=$1 ORDER BY started_at DESC LIMIT 20`
    : `SELECT user_id, started_at FROM ad_sessions
       ORDER BY started_at DESC LIMIT 20`;
  const { rows } = await db.query(sql, uid ? [uid] : []);
  res.status(200).json(rows);
};
