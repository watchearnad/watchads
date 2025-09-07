import React, { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';
import { Task } from '../types';

interface Props {
  task: Task;
  onComplete: () => void;
  onClose: () => void;
}

export default function AdModal({ task, onComplete, onClose }: Props) {
  const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
  const [seconds, setSeconds] = useState<number>(task.duration ?? 16);
  const [status, setStatus] = useState<'playing' | 'claiming' | 'done' | 'error'>('playing');
  const [userId, setUserId] = useState<number>(123);

  // ambil user id telegram
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    const uid = tg?.initDataUnsafe?.user?.id;
    if (typeof uid === 'number' && Number.isFinite(uid)) setUserId(uid);
  }, []);

  // tampilkan iklan monetag & mulai hitung mundur
  useEffect(() => {
    const show =
      (window as any).show_9834777 ||
      (window as any).showRewarded ||
      (window as any).playRewardedAd ||
      (() => Promise.resolve());
    try { show().catch(() => {}); } catch {}
    const t = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  // selesai 16s -> klaim
  useEffect(() => {
    if (seconds === 0 && status === 'playing') {
      setStatus('claiming');
      claim();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, status]);

  async function claim() {
    let tries = 0;
    while (tries < 6) {
      try {
        const res = await fetch(`${API_BASE}/api/reward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, amount: task.reward ?? 0.003 }),
        });
        const data: any = await res.json().catch(() => ({}));

        // kalau masih cooldown → tunggu sisa detik, lanjut play lagi (tanpa alert)
        if (res.status === 429 && typeof data.secondsLeft === 'number') {
          const left = Math.max(1, Math.ceil(data.secondsLeft));
          setSeconds(left);
          setStatus('playing'); // biar timer jalan lagi; nanti auto-claim lagi saat 0
          return;
        }

        // sukses
        if (res.ok && !data?.error) {
          setStatus('done');
          onComplete();
          return;
        }

        // error lain → retry beberapa kali
        tries++;
        await new Promise(r => setTimeout(r, 1200));
      } catch {
        tries++;
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    setStatus('error'); // tampilkan status, TANPA alert
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 p-4 relative">
        <button onClick={onClose} className="absolute right-3 top-3 text-gray-400 hover:text-white">
          <X />
        </button>

        <div className="aspect-video w-full bg-black/40 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
          <span className="text-sm text-gray-400">ads by Monetag</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4" />
            <span>{seconds}s</span>
          </div>
          <div className="text-sm text-gray-400">
            {status === 'playing' && 'Tonton iklan…'}
            {status === 'claiming' && 'Mengklaim reward…'}
            {status === 'done' && 'Reward masuk!'}
            {status === 'error' && 'Gagal klaim. Coba lagi.'}
          </div>
        </div>
      </div>
    </div>
  );
}
