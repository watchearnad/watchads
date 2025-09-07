const getPool = require("./_db");
module.exports = async (req, res) => {
  try {
    const db = getPool();
    const r = await db.query("select 1 as ok");
    res.json({ ok: true, db: r.rows[0].ok === 1 });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
};
