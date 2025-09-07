// api/balance/[id].js
const getPool = require("../_db");

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const userId = req.query?.id || req.url?.split("/").pop();
    
    if (!userId || isNaN(Number(userId))) {
      return res.status(200).json({ balance: 0, error: "invalid_user_id" });
    }

    const db = getPool();
    
    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS users(
        user_id BIGINT PRIMARY KEY,
        balance DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Get user balance
    const result = await db.query(
      "SELECT balance FROM users WHERE user_id = $1", 
      [Number(userId)]
    );
    
    const balance = Number(result.rows[0]?.balance ?? 0);
    
    return res.status(200).json({ 
      balance,
      userId: Number(userId),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Balance endpoint error:", error);
    
    return res.status(200).json({ 
      balance: 0, 
      error: "server_error",
      detail: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};