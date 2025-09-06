import { useEffect, useRef, useState } from "react";

type Ad = { id: number; title: string; media_url: string; reward: number; duration_sec: number };

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
// @ts-ignore
const tg = window?.Telegram?.WebApp;
const userId: number = tg?.initDataUnsafe?.user?.id ?? 123; // 123 untuk tes lokal

export default function TaskAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [balance, setBalance] = useState(0);
  const [activeAd, setActiveAd] = useState<Ad | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const guard = useRef(false);

  // ambil saldo & daftar ads aktif
  useEffect(() => {
    fetch(`${API_BASE}/api/balance/${userId}`)
      .then(r => r.json())
      .then(d => setBalance(Number(d.balance) || 0))
      .catch(console.error);

    fetch(`${API_BASE}/api/ads`)
      .then(r => r.json())
      .then((list: Ad[]) => setAds(list))
      .catch(console.error);
  }, []);

  // countdown UX
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function watch(ad: Ad) {
    setActiveAd(ad);
    // buka link Monetag / media iklan
    if (tg?.openLink) tg.openLink(ad.media_url, { try_instant_view: false });
    else window.open(ad.media_url, "_blank", "noopener");
    // mulai timer sesuai durasi iklan
    setCooldown(ad.duration_sec || 16);
  }

  async function claim() {
    if (!activeAd || loading || guard.current || cooldown > 0) return;
    guard.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: activeAd.reward })
      });
      const data = await res.json(); // { balance, cooldown }
      // server juga punya cooldown 16s; kalau belum cukup waktu, saldo tak bertambah dan dapat sisa cooldown
      if (typeof data.balance === "number") setBalance(data.balance);
      if (typeof data.cooldown === "number") setCooldown(data.cooldown);
    } catch (e) {
      console.error(e);
      alert("Gagal klaim reward");
    } finally {
      setLoading(false);
      setTimeout(() => (guard.current = false), 300);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task: Tonton Iklan</h2>
        <div className="text-sm">Saldo: <b>{balance.toFixed(3)}</b></div>
      </header>

      {ads.length === 0 && (
        <div className="p-4 rounded-xl border">Belum ada iklan aktif.</div>
      )}

      <div className="grid gap-3">
        {ads.map(ad => (
          <div key={ad.id} className="p-4 rounded-xl border">
            <div className="font-medium">{ad.title || "Ad"}</div>
            <div className="text-sm opacity-70">
              Reward: {ad.reward} • Durasi: {ad.duration_sec}s
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => watch(ad)}
                className="px-4 py-2 rounded bg-sky-600 text-white"
              >
                Tonton
              </button>
              <button
                onClick={claim}
                disabled={!activeAd || activeAd.id !== ad.id || cooldown > 0 || loading}
                className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
                title={!activeAd || activeAd.id !== ad.id ? "Tonton dulu" : (cooldown>0 ? `Tunggu ${cooldown}s` : "Klaim reward")}
              >
                {activeAd && activeAd.id === ad.id
                  ? (cooldown > 0 ? `Tunggu ${cooldown}s` : (loading ? "Processing…" : "Klaim"))
                  : "Klaim"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
