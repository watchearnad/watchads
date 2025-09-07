import { useEffect, useRef, useState } from "react";

/** ===== Adsgram helper (inline) ===== */
declare global { interface Window { Adsgram?: any; Telegram?: any } }

const REWARD_BLOCK_ID = import.meta.env.VITE_ADSGRAM_REWARD_BLOCK_ID as string | undefined;
const INTER_BLOCK_ID  = import.meta.env.VITE_ADSGRAM_INTER_BLOCK_ID  as string | undefined;

let _rewardCtrl: any | null = null;
let _interCtrl:  any | null = null;

function ensureAdsgramReady() {
  if (!window?.Adsgram) return false;
  if (!_rewardCtrl && REWARD_BLOCK_ID) _rewardCtrl = window.Adsgram.init({ blockId: REWARD_BLOCK_ID });
  if (!_interCtrl  && INTER_BLOCK_ID)  _interCtrl  = window.Adsgram.init({ blockId: INTER_BLOCK_ID  });
  return !!(_rewardCtrl || _interCtrl);
}

async function showAdsgram(): Promise<"rewarded"|"interstitial"|"nofill"> {
  const ok = ensureAdsgramReady();
  if (!ok) throw new Error("Adsgram SDK not loaded or blockId missing");

  // coba Rewarded dulu
  if (_rewardCtrl?.show) {
    try { await _rewardCtrl.show(); return "rewarded"; }
    catch { /* no fill / closed */ }
  }
  // fallback Interstitial
  if (_interCtrl?.show) {
    try { await _interCtrl.show(); return "interstitial"; }
    catch { /* no fill */ }
  }
  return "nofill";
}
/** ===== End Adsgram helper ===== */

type Ad = {
  id: number;
  title: string | null;
  media_url: string;     // tidak dipakai lagi untuk openLink
  reward: number;
  duration_sec: number;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

function getTG(): any | null {
  if (typeof window === "undefined") return null;
  // @ts-ignore
  return window?.Telegram?.WebApp ?? null;
}

export default function TaskAdsList() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [userId, setUserId] = useState<number>(123);        // fallback aman
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const guard = useRef(false);

  // ambil userId dari Telegram setelah mount
  useEffect(() => {
    const tg = getTG();
    const uid = tg?.initDataUnsafe?.user?.id;
    if (typeof uid === "number" && Number.isFinite(uid)) setUserId(uid);
  }, []);

  // load ads + saldo
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await fetch(`${API_BASE}/api/ads`).then(r => r.ok ? r.json() : []);
        if (mounted && Array.isArray(a)) setAds(a);
        const b = await fetch(`${API_BASE}/api/balance/${userId}`)
          .then(r => r.ok ? r.json() : { balance: 0 })
          .catch(() => ({ balance: 0 }));
        if (mounted) setBalance(Number(b.balance) || 0);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  /** Tonton iklan via Adsgram (tidak buka Monetag lagi) */
  async function openAd(ad: Ad) {
    if (guard.current) return;
    guard.current = true;
    try {
      setActiveId(ad.id);
      const result = await showAdsgram();             // "rewarded" | "interstitial" | "nofill"
      if (result === "nofill") {
        console.log("Adsgram no fill");               // bisa tampilkan toast jika mau
        setActiveId(null);
        return;
      }
      // mulai cooldown sesuai durasi task; klaim baru aktif ketika 0
      setCooldown(ad.duration_sec || 16);
    } catch (e) {
      console.log("Ad error:", e);
      setActiveId(null);
    } finally {
      setTimeout(() => (guard.current = false), 200);
    }
  }

  /** Klaim reward ke backend setelah selesai nonton + cooldown habis */
  async function claim(ad: Ad) {
    if (claiming || guard.current || cooldown > 0 || activeId !== ad.id) return;
    guard.current = true;
    setClaiming(true);
    try {
      const tg = getTG();
      const uid = tg?.initDataUnsafe?.user?.id ?? userId;
      const res = await fetch(`${API_BASE}/api/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, amount: ad.reward })
      });
      const data = await res.json().catch(() => ({} as any));
      if (typeof data.balance === "number") setBalance(data.balance);
      if (typeof data.cooldown === "number") setCooldown(data.cooldown);
      setActiveId(null);
    } finally {
      setClaiming(false);
      setTimeout(() => (guard.current = false), 250);
    }
  }

  if (loading) {
    return (
      <section className="p-4 rounded-2xl border border-slate-700 bg-slate-800/40">
        Loading tasks…
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Available Tasks</h3>
        <span className="text-xs bg-sky-600/15 text-sky-400 px-3 py-1 rounded-full">
          {ads.length} remaining
        </span>
      </div>

      {ads.length === 0 && (
        <div className="p-4 rounded-2xl border border-slate-700 bg-slate-800/40">
          Belum ada iklan aktif.
        </div>
      )}

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
                  disabled={!isActive || cooldown > 0 || claiming}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white disabled:opacity-50"
                  title={isActive ? (cooldown > 0 ? `Tunggu ${cooldown}s` : "Klaim") : "Tonton dulu"}
                >
                  {isActive ? (cooldown > 0 ? `Tunggu ${cooldown}s` : (claiming ? "Processing…" : "Klaim")) : "Klaim"}
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
