import { useEffect, useRef, useState } from "react";

type Ad = { id: number; title: string | null; media_url: string; reward: number; duration_sec: number };

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
// @ts-ignore
const tg = window?.Telegram?.WebApp;
const userId: number = tg?.initDataUnsafe?.user?.id ?? 123; // 123 untuk tes lokal

export default function TaskAdsList() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const guard = useRef(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/ads`).then(r => r.json()).then(setAds).catch(console.error);
    fetch(`${API_BASE}/api/balance/${userId}`)
      .then(r => r.json())
      .then(d => setBalance(Number(d.balance) || 0))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function openAd(ad: Ad) {
    setActiveId(ad.id);
    if (tg?.openLink) tg.openLink(ad.media_url, { try_instant_view: false });
    else window.open(ad.media_url, "_blank", "noopener");
    setCooldown(ad.duration_sec || 16);
  }

  async function claim(ad: Ad) {
    if (loading || guard.current || cooldown > 0 || activeId !== ad.id) return;
    guard.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: ad.reward })
      });
      const data = await res.json(); // { balance, cooldown }
      if (typeof data.balance === "number") setBalance(data.balance);
      if (typeof data.cooldown === "number") setCooldown(data.cooldown);
    } catch (e) {
      console.error(e);
      alert("Gagal klaim reward");
    } finally {
      setLoading(false);
      setTimeout(() => (guard.current = false), 250);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Available Tasks</h3>
        <span className="text-xs bg-sky-600/15 text-sky-400 px-3 py-1 rounded-full">
          {ads.length} remaining
        </span>
      </div>

      {ads.map((ad, idx) => {
        const isActive = activeId === ad.id;
        const title = ad.title || `Advertisement #${idx + 1}`;
        return (
          <div key={ad.id} className="p-4 rounded-2xl border border-slate-700 bg-slate-800/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-medium truncate">Watch {title}</div>
                <div className="text-sm opacity-70 mt-1 flex items-center gap-4">
                  <span>🕒 {ad.duration_sec || 16}s</span>
                  <span>💲 {Number(ad.reward).toFixed(3)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openAd(ad)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
                >
                  Watch Ad
                </button>
                <button
                  onClick={() => claim(ad)}
                  disabled={!isActive || cooldown > 0 || loading}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white disabled:opacity-50"
                  title={isActive ? (cooldown>0 ? `Tunggu ${cooldown}s` : "Klaim") : "Tonton dulu"}
                >
                  {isActive ? (cooldown > 0 ? `Tunggu ${cooldown}s` : (loading ? "Processing…" : "Klaim")) : "Klaim"}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="text-right text-sm opacity-70">Saldo: <b>{balance.toFixed(3)}</b></div>
    </section>
  );
}
