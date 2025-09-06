// api/withdraw.js
const getPool = require("./_db");

function readBody(req){return new Promise(r=>{let d="";req.on("data",c=>d+=c);req.on("end",()=>{try{r(JSON.parse(d||"{}"))}catch{r({})}})});}
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : NaN; };

const MIN_WITHDRAW = parseFloat(process.env.MIN_WITHDRAW || "1"); // ubah di Vercel env kalau mau

async function ensureSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS withdrawals(
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT,
    account TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`);
  await db.query(`ALTER TABLE users
    ADD COLUMN IF NOT EXISTS wallet_method TEXT,
    ADD COLUMN IF NOT EXISTS wallet_account TEXT;`);
}

module.exports = async (req, res) => {
  const db = getPool();
  await ensureSchema(db);

  if (req.method === "GET") {
    // list withdraw user
    const uid = Number(req.query.userId);
    if (!Number.isFinite(uid)) return res.status(400).json({error:"userId invalid"});
    const { rows } = await db.query(
      `SELECT id, amount::text AS amount, method, account, status, created_at
       FROM withdrawals WHERE user_id=$1 ORDER BY id DESC LIMIT 20`, [uid]
    );
    return res.status(200).json(rows.map(r => ({...r, amount: parseFloat(r.amount)})));
  }

  if (req.method === "POST") {
    const body = req.headers["content-type"]?.includes("application/json")
      ? await readBody(req) : req.query;

    const userId = Number(body.userId);
    const amount = num(body.amount);
    const method = (body.method || body.wallet_method || "").toString().trim();
    const account = (body.account || body.wallet_account || "").toString().trim();

    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({error:"userId invalid"});
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({error:"amount invalid"});
    if (amount < MIN_WITHDRAW) return res.status(400).json({error:`minimum ${MIN_WITHDRAW}`});
    if (!account) return res.status(400).json({error:"wallet/account required"});

    try {
      await db.query("BEGIN");

      // pastikan user ada
      await db.query(`INSERT INTO users (id, balance) VALUES ($1, 0)
                      ON CONFLICT (id) DO NOTHING`, [userId]);

      // lock balance
      const u = await db.query(`SELECT COALESCE(balance,0)::numeric AS bal
                                FROM users WHERE id=$1 FOR UPDATE`, [userId]);
      const bal = parseFloat(String(u.rows[0]?.bal ?? "0"));
      if (bal < amount) {
        await db.query("ROLLBACK");
        return res.status(400).json({error:"insufficient balance", balance: bal});
      }

      // simpan wallet default di users (optional)
      await db.query(`UPDATE users SET wallet_method=$2, wallet_account=$3 WHERE id=$1`,
        [userId, method || null, account || null]);

      // potong saldo & buat request
      const upd = await db.query(
        `UPDATE users SET balance = balance - $2::numeric WHERE id=$1 RETURNING balance`,
        [userId, amount]
      );
      const ins = await db.query(
        `INSERT INTO withdrawals(user_id, amount, method, account, status)
         VALUES ($1,$2,$3,$4,'pending') RETURNING id, status`,
        [userId, amount, method || null, account]
      );

      await db.query("COMMIT");
      return res.status(200).json({
        ok: true,
        requestId: ins.rows[0].id,
        status: ins.rows[0].status,
        balance: parseFloat(String(upd.rows[0].balance))
      });
    } catch (e) {
      await db.query("ROLLBACK");
      console.error(e);
      return res.status(500).json({error:"server_error"});
    }
  }

  res.status(405).json({error:"method_not_allowed"});
};
