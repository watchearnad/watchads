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
    const db = getPool();
    
    // Test database connection
    const startTime = Date.now();
    const result = await db.query("SELECT 1 as health_check, NOW() as server_time");
    const responseTime = Date.now() - startTime;
    
    // Get pool status
    const poolStatus = {
      totalCount: db.totalCount,
      idleCount: db.idleCount,
      waitingCount: db.waitingCount
    };
    
    return res.status(200).json({ 
      ok: true, 
      database: {
        connected: true,
        responseTime: `${responseTime}ms`,
        serverTime: result.rows[0].server_time
      },
      pool: poolStatus,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Health check error:", error);
    
    return res.status(200).json({ 
      ok: false, 
      database: {
        connected: false,
        error: error.message
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  }
};