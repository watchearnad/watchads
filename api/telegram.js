// api/telegram.js
const getPool = require("./_db");

function readBody(req){return new Promise(r=>{let d="";req.on("data",c=>d+=c);req.on("end",()=>r(d))})}
async function tg(method, payload){
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)
  });
  return r.json();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("ok");
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(500).json({error:"TELEGRAM_BOT_TOKEN missing"});

  const raw = await readBody(req);
  const update = (()=>{try{return JSON.parse(raw||"{}")}catch{ return {} }})();
  const msg = update.message || update.edited_message || update.callback_query?.message;
  const chatId = msg?.chat?.id;
  const from = update.message?.from || update.callback_query?.from;
  if (!chatId) return res.status(200).send("ok");

  const webappUrl = process.env.WEBAPP_URL || `https://${req.headers.host}/`;

  // perintah
  const text = (update.message?.text || "").trim();
  if (text === "/start") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Selamat datang! Tap tombol di bawah untuk buka aplikasi.",
      reply_markup: {
        inline_keyboard: [[{ text: "Open App", web_app: { url: webappUrl } }]]
      }
    });
    return res.status(200).send("ok");
  }

  if (text === "/balance") {
    const userId = from?.id;
    let balance = 0;
    if (userId) {
      const { rows } = await getPool().query(
        "SELECT COALESCE(balance,0)::text AS b FROM users WHERE id=$1",[userId]
      );
      balance = parseFloat(rows[0]?.b ?? "0") || 0;
    }
    await tg("sendMessage", {
      chat_id: chatId,
      parse_mode: "HTML",
      text: `Saldo kamu: <b>${balance.toFixed(2)}</b>`
    });
    return res.status(200).send("ok");
  }

  // default
  await tg("sendMessage", { chat_id: chatId, text: "Perintah:\n/start - buka aplikasi\n/balance - cek saldo" });
  res.status(200).send("ok");
};
