// api/init.js - Initialize database tables and indexes
const getPool = require("./_db");

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const db = getPool();

  // Create all necessary tables with proper indexes
    await db.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGINT PRIMARY KEY,
        balance DOUBLE PRECISION DEFAULT 0,
        referred_by BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Ad reward logs
      CREATE TABLE IF NOT EXISTS ad_reward_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Withdrawals
      CREATE TABLE IF NOT EXISTS withdrawals (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        method TEXT NOT NULL,
        address TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Ads
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        title TEXT,
        media_url TEXT NOT NULL,
        reward DOUBLE PRECISION DEFAULT 0.003,
        duration_sec INTEGER DEFAULT 16,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Referral commissions
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id BIGSERIAL PRIMARY KEY,
        referrer_id BIGINT NOT NULL,
        referred_id BIGINT NOT NULL,
        source TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
      CREATE INDEX IF NOT EXISTS idx_ad_reward_logs_user_created ON ad_reward_logs(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON withdrawals(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active) WHERE is_active = true;
      CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
    `);

    // Seed default ads if empty
    const adsCount = await db.query("SELECT COUNT(*) as count FROM ads");
    if (Number(adsCount.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO ads (title, media_url, reward, duration_sec, is_active) VALUES
        ('Monetag Rewarded #1', 'monetag://9834777', 0.003, 16, true),
        ('Monetag Rewarded #2', 'monetag://9834777', 0.003, 16, true),
        ('Monetag Rewarded #3', 'monetag://9834777', 0.003, 16, true),
        ('Monetag Rewarded #4', 'monetag://9834777', 0.003, 16, true),
        ('Monetag Rewarded #5', 'monetag://9834777', 0.003, 16, true)
      `);
    }

    return res.status(200).json({ 
      ok: true, 
      message: "Database initialized successfully",
      tables: [
        "users", 
        "ad_reward_logs", 
        "withdrawals", 
        "ads", 
        "referral_commissions"
      ],
      indexes: [
        "idx_users_user_id",
        "idx_users_referred_by", 
        "idx_ad_reward_logs_user_created",
        "idx_withdrawals_user_status",
        "idx_ads_active",
        "idx_referral_commissions_referrer"
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Database initialization error:", error);
    
    return res.status(200).json({ 
      ok: false, 
      error: "initialization_failed",
      detail: process.env.NODE_ENV === 'development' ? error.message : "Database initialization failed",
      timestamp: new Date().toISOString()
    });
  }
};
