import { useEffect, useRef, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

function getTelegramUserId(): number {
  // @ts-ignore
  const tg = window?.Telegram?.WebApp;
  return tg?.initDataUnsafe?.user?.id ?? 123;
}

export default function ClaimAdButton({ amount = 1.25 }: { amount?: number }) {
  const [balance, setBalance] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const guard = useRef(false);
  const userId = getTelegramUserId();

  useEffect(() => {
    fetch(`${API_BASE}/api/balance/${userId}`)
      .then(r => r.json())
      .then(d => setBalance(Number(d.balance) || 0))
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleClaim() {
    if (loading || guard.current || cooldown > 0) return;
    guard.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount })
      });
      const data = await res.json(); // { balance, cooldown }
      setBalance(Number(data.balance) || 0);
      setCooldown(Number(data.cooldown) || 0);
    } finally {
      setLoading(false);
      setTimeout(() => (guard.current = false), 300);
    }
  }

  return (
    <div className="p-4 border rounded-xl max-w-sm">
      <div className="mb-3">Saldo: <b>{balance.toFixed(2)}</b></div>
      <button
        onClick={handleClaim}
        disabled={loading || cooldown > 0}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {cooldown > 0 ? `Tunggu ${cooldown}s` : (loading ? "Processing…" : `Claim ${amount}`)}
      </button>
    </div>
  );
}
