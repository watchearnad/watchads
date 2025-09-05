import express from "express";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // dari Railway
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(express.json());

// API: nambah reward
app.post("/api/reward", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID missing" });

  await pool.query(`
    INSERT INTO users (id, balance)
    VALUES ($1, 1)
    ON CONFLICT (id) DO UPDATE SET balance = users.balance + 1
  `, [userId]);

  const result = await pool.query("SELECT balance FROM users WHERE id=$1", [userId]);
  res.json({ balance: result.rows[0].balance });
});

// API: cek saldo
app.get("/api/balance/:id", async (req, res) => {
  const result = await pool.query("SELECT balance FROM users WHERE id=$1", [req.params.id]);
  res.json({ balance: result.rows[0]?.balance || 0 });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running 🚀");
});
