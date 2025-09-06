// api/set-webhook.js
module.exports = async (req, res) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(500).json({error:"TELEGRAM_BOT_TOKEN missing"});
  const url = `https://${req.headers.host}/api/telegram`;
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ url })
  });
  const data = await r.json();
  res.status(200).json({ set_to: url, result: data });
};
