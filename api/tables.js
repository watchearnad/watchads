// api/tables.js
const getPool = require("./_db");

module.exports = async (_req, res) => {
  const { rows } = await getPool().query(`
    SELECT schemaname, tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname NOT IN ('pg_catalog','information_schema')
    ORDER BY schemaname, tablename
  `);
  res.status(200).json(rows);
};
