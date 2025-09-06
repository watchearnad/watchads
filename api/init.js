// api/init.js
const getPool = require("./_db");

module.exports = async (_req, res) => {
  const db = getPool();

  // Buat tabel dengan PRIMARY KEY (supaya UI Railway pasti nampilin)
  await db.query(`
    CREATE TABLE IF NOT EXISTS ad_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Kalau tabelnya sudah ada tapi BELUM ada kolom id → tambahkan
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ad_sessions' AND column_name = 'id'
      ) THEN
        ALTER TABLE ad_sessions ADD COLUMN id BIGSERIAL PRIMARY KEY;
      END IF;
    END$$;
  `);

  // Index kecil biar query cepat (optional)
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ad_sessions_user_started
      ON ad_sessions (user_id, started_at);
  `);

  res.status(200).json({ ok: true });
};
