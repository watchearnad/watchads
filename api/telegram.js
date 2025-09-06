// api/telegram.js
const getPool = require("./_db");

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}
async function tg(method, payload) {
  const r = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  return r.json();
}
const toNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const MIN_WITHDRAW = parseFloat(process.env.MIN_WITHDRAW || "1");

async function ensure(db) {
  // ads untuk daftar iklan (Monetag SmartLink)
  await db.query(`
    CREATE TABLE IF NOT EXISTS ads(
      id BIGSERIAL PRIMARY KEY,
      title TEXT,
      media_url TEXT NOT NULL,
      reward NUMERIC,
      duration_sec INTEGER DEFAULT 16,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  // withdrawals untuk request WD
  await db.query(`
    CREATE TABLE IF NOT EXISTS withdrawals(
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      amount NUMERIC NOT NULL,
      method TEXT,
      account TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("ok");
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN missing" });

  const raw = await readBody(req);
  let update = {};
  try { update = JSON.parse(raw || "{}"); } catch { update = {}; }

  const msg = update.message || update.edited_message || update.callback_query?.message;
  const chatId = msg?.chat?.id;
  const from = update.message?.from || update.callback_query?.from;
  const text = (update.message?.text || "").trim();
  if (!chatId) return res.status(200).send("ok");

  const db = getPool();
  await ensure(db);

  const webappUrl = process.env.WEBAPP_URL || `https://${req.headers.host}/`;

  // /start → buka WebApp
  if (text === "/start") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Selamat datang! Tap tombol di bawah untuk buka aplikasi.",
      reply_markup: { inline_keyboard: [[{ text: "Open App", web_app: { url: webappUrl } }]] },
    });
    return res.status(200).send("ok");
  }

  // /balance → saldo user
  if (text === "/balance") {
    const uid = from?.id;
    let bal = 0;
    if (uid) {
      const r = await db.query(
        `SELECT COALESCE(balance,0)::text AS b FROM users WHERE id=$1`, [uid]
      );
      bal = parseFloat(r.rows[0]?.b ?? "0") || 0;
    }
    await tg("sendMessage", { chat_id: chatId, text: `Saldo kamu: ${bal.toFixed(6)}` });
    return res.status(200).send("ok");
  }

  // /ads → kirim daftar judul; tiap tombol buka WebApp ?ad=<id>
  if (text === "/ads") {
    const { rows } = await db.query(`
      SELECT id, COALESCE(title,'Ad') AS title
      FROM ads WHERE active = TRUE
      ORDER BY id DESC LIMIT 10
    `);
    if (!rows.length) {
      await tg("sendMessage", { chat_id: chatId, text: "Belum ada iklan aktif." });
      return res.status(200).send("ok");
    }
    const kb = rows.map((r) => [
      { text: `Tonton: ${r.title}`, web_app: { url: `${webappUrl}?ad=${r.id}` } },
    ]);
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Pilih iklan:",
      reply_markup: { inline_keyboard: kb },
    });
    return res.status(200).send("ok");
  }

  // /withdraw <amount> <method> <account...>
  if (text.startsWith("/withdraw")) {
    const parts = text.split(/\s+/); // [/withdraw, amount, method, account...]
    const amount = toNum(parts[1]);
    const method = parts[2] || "";
    const account = parts.slice(3).join(" ");

    if (!Number.isFinite(amount) || !method || !account) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `Format: /withdraw <amount> <method> <account>\nContoh: /withdraw 1.2 dana 08123xxxxxxx\nMin: ${MIN_WITHDRAW}`,
      });
      return res.status(200).send("ok");
    }

    try {
      await db.query("BEGIN");

      // pastikan user ada
      await db.query(
        `INSERT INTO users (id, balance) VALUES ($1, 0)
         ON CONFLICT (id) DO NOTHING`,
        [from.id]
      );

      // lock saldo
      const u = await db.query(
        `SELECT COALESCE(balance,0)::numeric AS bal
         FROM users WHERE id=$1 FOR UPDATE`,
        [from.id]
      );
      const bal = parseFloat(String(u.rows[0]?.bal ?? "0"));

      if (amount < MIN_WITHDRAW) {
        await db.query("ROLLBACK");
        await tg("sendMessage", { chat_id: chatId, text: `Minimal withdraw ${MIN_WITHDRAW}` });
        return res.status(200).send("ok");
      }
      if (bal < amount) {
        await db.query("ROLLBACK");
        await tg("sendMessage", { chat_id: chatId, text: `Saldo kurang. Saldo: ${bal.toFixed(6)}` });
        return res.status(200).send("ok");
      }

      // potong saldo & buat request
      await db.query(
        `UPDATE users SET balance = balance - $2::numeric WHERE id=$1`,
        [from.id, amount]
      );
      const ins = await db.query(
        `INSERT INTO withdrawals(user_id, amount, method, account, status)
         VALUES ($1,$2,$3,$4,'pending') RETURNING id`,
        [from.id, amount, method, account]
      );

      await db.query("COMMIT");
      await tg("sendMessage", {
        chat_id: chatId,
        text: `Request withdraw #${ins.rows[0].id} dibuat.\nJumlah: ${amount}\nKe: ${method} ${account}`,
      });
      return res.status(200).send("ok");
    } catch (e) {
      await db.query("ROLLBACK");
      console.error(e);
      await tg("sendMessage", { chat_id: chatId, text: "Gagal membuat request. Coba lagi." });
      return res.status(200).send("ok");
    }
  }

  // help default
  await tg("sendMessage", {
    chat_id: chatId,
    text: [
      "Perintah:",
      "/start – buka aplikasi",
      "/ads – daftar iklan",
      "/balance – cek saldo",
      `/withdraw <amount> <method> <account> – ajukan withdraw (min ${MIN_WITHDRAW})`,
    ].join("\n"),
  });
  res.status(200).send("ok");
};
