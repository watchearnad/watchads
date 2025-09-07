import React, { useEffect, useRef, useState } from 'react';
import { Play, CheckCircle, Clock, DollarSign, Target, TrendingUp } from 'lucide-react';
import { Task, UserData } from '../types';
import AdModal from './AdModal';

interface TaskPageProps {
  tasks: Task[];
  userData: UserData;
  completeTask: (taskId: number) => void;
}
type Ad = { id:number; title:string|null; media_url:string; reward:number; duration_sec:number };
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

const TaskPage: React.FC<TaskPageProps> = ({ tasks, userData, completeTask }) => {
  const [showAdModal, setShowAdModal] = useState(false);
  const [currentAdTask, setCurrentAdTask] = useState<Task | null>(null);

  // data asli kamu (tetap)
  const adTasks = tasks.filter(task => task.type === 'ad');
  const completedAdTasks = adTasks.filter(task => task.completed).length;
  const availableAdTasks = adTasks.filter(task => !task.completed);

  const handleAdStart = (task: Task) => { setCurrentAdTask(task); setShowAdModal(true); };
  const handleAdComplete = () => {
    if (currentAdTask) { completeTask(currentAdTask.id); setShowAdModal(false); setCurrentAdTask(null); }
  };

  // ===== balance lokal biar UI update setelah klaim
  const [balance, setBalance] = useState<number>(userData.balance);
  useEffect(() => { setBalance(userData.balance); }, [userData.balance]);

  // ===== user id (Telegram → ?uid=… → fallback 123)
  const [userId, setUserId] = useState<number>(123);
  useEffect(() => {
    const tg = typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : null;
    const idFromTG = Number(tg?.initDataUnsafe?.user?.id);
    const qs = new URLSearchParams(typeof window !== 'undefined' ? location.search : '');
    const idFromQuery = Number(qs.get('uid'));
    const finalId = Number.isFinite(idFromTG) ? idFromTG : (Number.isFinite(idFromQuery) ? idFromQuery : 123);
    setUserId(finalId);
  }, []);

  // ===== daftar iklan aktif
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/api/ads`)
      .then(r => r.ok ? r.json() : [])
      .then((a: Ad[]) => { if (mounted) setAds(Array.isArray(a) ? a : []); })
      .catch(() => setAds([]));
    return () => { mounted = false; };
  }, []);

  // ===== slot & cooldown
  const [cooldowns, setCooldowns] = useState<number[]>([]);
  const [watchedId, setWatchedId] = useState<(number|null)[]>([]);
  const claiming = useRef<boolean[]>([]);
  const pendingClaim = useRef<boolean[]>([]);

  useEffect(() => {
    const len = Math.max(availableAdTasks.length, 5);
    setCooldowns(prev => Array.from({ length: len }, (_, i) => prev[i] ?? 0));
    setWatchedId(prev => Array.from({ length: len }, (_, i) => prev[i] ?? null));
    claiming.current   = Array.from({ length: len }, (_, i) => claiming.current[i]   ?? false);
    pendingClaim.current = Array.from({ length: len }, (_, i) => pendingClaim.current[i] ?? false);
  }, [availableAdTasks.length]);

  useEffect(() => {
    const t = setInterval(() => setCooldowns(cs => cs.map(s => (s > 0 ? s - 1 : 0))), 1000);
    return () => clearInterval(t);
  }, []);

  const adOf = (i: number) => (ads.length ? ads[i % ads.length] : null);

  // ===== tombol WATCH
  function handleWatchSlot(i: number) {
    const ad = adOf(i);
    if (!ad) { alert('Tidak ada iklan aktif'); return; }

    const fallbackDur = availableAdTasks[i]?.duration ?? 16;
    setWatchedId(prev => { const copy = [...prev]; copy[i] = ad.id; return copy; });
    setCooldowns(prev => { const copy = [...prev]; copy[i] = ad.duration_sec || fallbackDur; return copy; });
    pendingClaim.current[i] = true;

    // Fallback: paksa klaim setelah durasi (jaga-jaga kalau SDK resolve duluan)
    const ms = 1000 * (ad.duration_sec || fallbackDur);
    setTimeout(() => { if (pendingClaim.current[i]) autoClaimSlot(i); }, ms + 200);

    const url = ad.media_url || '';
    if (url.startsWith('monetag://')) {
      const zone = url.slice('monetag://'.length);
      const fn =
        (window as any)[`show_${zone}`] ||
        (window as any).show_9834777 ||
        (window as any).showRewarded ||
        (window as any).playRewardedAd;

      if (typeof fn !== 'function') {
        alert('Iklan belum siap. Pastikan script Monetag sudah ada di index.html.');
        setWatchedId(prev => { const c = [...prev]; c[i] = null; return c; });
        setCooldowns(prev => { const c = [...prev]; c[i] = 0; return c; });
        pendingClaim.current[i] = false;
        return;
      }
      try { Promise.resolve(fn()).then(() => { setTimeout(() => { if (pendingClaim.current[i]) autoClaimSlot(i); }, 200); }); } catch {}
      return;
    }

    // Fallback URL (kalau ada iklan berupa link)
    const tg = typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : null;
    if (tg?.openLink && url) tg.openLink(url, { try_instant_view: false });
    else if (url) window.open(url, '_blank', 'noopener');
  }

  // ===== auto-claim ketika cooldown 0
  useEffect(() => {
    cooldowns.forEach((c, i) => { if (c === 0 && pendingClaim.current[i]) autoClaimSlot(i); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldowns]);

  async function autoClaimSlot(i: number) {
    const ad = adOf(i);
    if (!ad) return;
    if (watchedId[i] !== ad.id) return;
    if (claiming.current[i]) return;

    claiming.current[i] = true;
    pendingClaim.current[i] = false;

    const amount = Number.isFinite(ad.reward) ? ad.reward : (availableAdTasks[i]?.reward ?? 0.003);

    try {
      const resp = await fetch(`${API_BASE}/api/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount })
      });
      const d = await resp.json().catch(() => ({} as any));
      if (resp.ok && typeof d?.balance === 'number') setBalance(d.balance);
      else if (d?.error === 'cooldown') alert(`Tunggu ${d.secondsLeft}s sebelum klaim lagi.`);
      else alert('Server error saat kredit reward.');
      setWatchedId(prev => { const w = [...prev]; w[i] = null; return w; });
    } finally { claiming.current[i] = false; }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Advertisement Tasks</h1>
        <p className="text-gray-400">Watch ads to earn $0.003 each</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Tasks</h2>
          <span className="bg-blue-600 text-xs px-3 py-1 rounded-full">
            {availableAdTasks.length} remaining
          </span>
        </div>

        {availableAdTasks.map((task, idx) => {
          const ad = adOf(idx);
          const duration = ad?.duration_sec ?? task.duration ?? 16;
          const reward = Number(ad?.reward ?? task.reward ?? 0.003);
          const label = (claiming.current[idx]) ? 'Processing…' : (cooldowns[idx] > 0 ? `Tunggu ${cooldowns[idx]}s` : 'Watch Ad');

          return (
            <div key={task.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <Play className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">{`Watch ${ad?.title ?? task.title}`}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{duration}s</div>
                      <div className="flex items-center gap-1 text-green-400"><DollarSign className="w-4 h-4" />{reward.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleWatchSlot(idx)}
                  disabled={cooldowns[idx] > 0 || claiming.current[idx]}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >{label}</button>
              </div>
            </div>
          );
        })}

        {availableAdTasks.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Tasks Completed!</h3>
            <p className="text-gray-400">Check back later for new advertisements</p>
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" /> Task Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Completed Ads</span>
            </div>
            <div className="text-2xl font-bold">{completedAdTasks}</div>
            <div className="text-xs text-gray-400">out of {adTasks.length} total</div>
          </div>
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Available Balance</span>
            </div>
            <div className="text-2xl font-bold text-green-400">${balance.toFixed(6)}</div>
            <div className="text-xs text-gray-400">ready to withdraw</div>
          </div>
        </div>
        <div className="mt-4 bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium">Progress</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all"
                 style={{ width: `${(completedAdTasks / Math.max(adTasks.length, 1)) * 100}%` }} />
          </div>
          <div className="text-xs text-gray-400">
            {Math.round((completedAdTasks / Math.max(adTasks.length, 1)) * 100)}% complete
          </div>
        </div>
      </div>

      {showAdModal && currentAdTask && (
        <AdModal task={currentAdTask} onComplete={handleAdComplete} onClose={() => setShowAdModal(false)} />
      )}
    </div>
  );
};

export default TaskPage;
