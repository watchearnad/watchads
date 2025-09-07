// api/reward-debug.js - Debug endpoint untuk monitoring
const getPool = require("./_db");

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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = Number(url.searchParams.get("userId"));
    
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(200).json({ 
        ok: false, 
        error: "bad_user_id",
        userId: url.searchParams.get("userId")
      });
    }

    const db = getPool();
    
    // Ensure tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users(
        user_id BIGINT PRIMARY KEY,
        balance DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ad_reward_logs(
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    // Get user info
    const userResult = await db.query(
      "SELECT user_id, balance, created_at, updated_at FROM users WHERE user_id = $1",
      [userId]
    );
    
    // Get recent logs
    const logsResult = await db.query(
      `SELECT id, amount, created_at, 
              EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_ago
       FROM ad_reward_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );
    
    // Get last reward time
    const lastRewardResult = await db.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) AS seconds_since
       FROM ad_reward_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    // Get total stats
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) as total_rewards,
         SUM(amount) as total_earned,
         MIN(created_at) as first_reward,
         MAX(created_at) as last_reward
       FROM ad_reward_logs 
       WHERE user_id = $1`,
      [userId]
    );

    const user = userResult.rows[0] || { 
      user_id: userId, 
      balance: 0, 
      created_at: null, 
      updated_at: null 
    };
    
    const stats = statsResult.rows[0] || {
      total_rewards: 0,
      total_earned: 0,
      first_reward: null,
      last_reward: null
    };

    return res.status(200).json({
      ok: true,
      user: {
        id: Number(user.user_id),
        balance: Number(user.balance),
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      stats: {
        totalRewards: Number(stats.total_rewards),
        totalEarned: Number(stats.total_earned || 0),
        firstReward: stats.first_reward,
        lastReward: stats.last_reward
      },
      cooldown: {
        lastRewardSecondsSince: Number(lastRewardResult.rows[0]?.seconds_since ?? null),
        canClaimNext: (Number(lastRewardResult.rows[0]?.seconds_since ?? 16) >= 16)
      },
      recentLogs: logsResult.rows.map(log => ({
        id: Number(log.id),
        amount: Number(log.amount),
        created_at: log.created_at,
        seconds_ago: Math.floor(Number(log.seconds_ago))
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Debug endpoint error:", error);
    
    return res.status(200).json({ 
      ok: false, 
      error: "server_error",
      detail: process.env.NODE_ENV === 'development' ? error.message : "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
};