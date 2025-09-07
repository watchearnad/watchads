// api/withdraw.js
const getPool = require("./_db");

function readBody(req){
  return new Promise(resolve=>{
    let d=""; req.on("data",c=>d+=c);
    req.on("end",()=>{ try{ resolve(JSON.parse(d||"{}")); }catch{ resolve({}); }});
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error:"method_not_allowed" });

  const { userId, amount, method, address } = await readBody(req);
  const n = parseFloat(String(amount ?? "").replace(",", "."));
  if (!userId || !Number.isFinite(n) || n <= 0 || !method || !address) {
    return res.status(400).json({ error:"bad_request" });
  }

  const db = getPool();
  try {
    await db.query("BEGIN");

    const bal = await db.query("SELECT balance FROM users WHERE id=$1", [userId]);
    const cur = parseFloat(bal.rows[0]?.balance ?? 0);
    if (n > cur) {
      await db.query("ROLLBACK");
      return res.status(400).json({ error:"insufficient_balance" });
    }

    const ins = await db.query(
      "INSERT INTO withdrawals (user_id, amount, method, address, status) VALUES ($1,$2,$3,$4,'pending') RETURNING id, status",
      [userId, n, method, address]
    );

    await db.query("UPDATE users SET balance = balance - $1 WHERE id=$2", [n, userId]);
    const after = await db.query("SELECT balance FROM users WHERE id=$1", [userId]);

    await db.query("COMMIT");
    res.json({ ok:true, requestId: ins.rows[0].id, status: ins.rows[0].status, balance: parseFloat(after.rows[0].balance) });
  } catch (e) {
    await db.query("ROLLBACK").catch(()=>{});
    console.error(e);
    res.status(500).json({ error:"server_error" });
  }
};
