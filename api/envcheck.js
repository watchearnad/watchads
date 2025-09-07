module.exports = async (req, res) => {
  const url = process.env.DATABASE_URL || "";
  res.json({
    present: !!url,
    startsWithPostgres: url.startsWith("postgres"),
    has6543: url.includes(":6543"),
    hasSSL: url.includes("sslmode=require"),
  });
};
