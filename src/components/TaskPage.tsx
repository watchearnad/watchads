import React, { useEffect, useRef, useState } from 'react';
import { Play, CheckCircle, Clock, DollarSign, Target, TrendingUp } from 'lucide-react';
import { Task, UserData } from '../types';
import AdModal from './AdModal';

interface TaskPageProps {
  tasks: Task[];
  userData: UserData;
  completeTask: (taskId: number) => void;
}

const TaskPage: React.FC<TaskPageProps> = ({ tasks, userData, completeTask }) => {
  const [showAdModal, setShowAdModal] = useState(false);
  const [currentAdTask, setCurrentAdTask] = useState<Task | null>(null);

  // ====== data asli kamu (tetap) ======
  const adTasks = tasks.filter(task => task.type === 'ad');
  const completedAdTasks = adTasks.filter(task => task.completed).length;
  const availableAdTasks = adTasks.filter(task => !task.completed);

  const handleAdStart = (task: Task) => {
    setCurrentAdTask(task);
    setShowAdModal(true);
  };

  const handleAdComplete = () => {
    if (currentAdTask) {
      completeTask(currentAdTask.id);
      setShowAdModal(false);
      setCurrentAdTask(null);
    }
  };

  // ====== LOGIC IKLAN 16s + KLAIM (disuntik tanpa ubah UI) ======
  type Ad = { id:number; title:string|null; media_url:string; reward:number; duration_sec:number };

  const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

  // user id dari Telegram; fallback 123 untuk test lokal
  const [userId, setUserId] = useState<number>(123);
  useEffect(() => {
    const tg = typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : null;
    const uid = tg?.initDataUnsafe?.user?.id;
    if (typeof uid === 'number' && Number.isFinite(uid)) setUserId(uid);
  }, []);

  // ambil daftar iklan aktif (untuk isi title/reward/durasi dan link Monetag)
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/api/ads`)
      .then(r => r.ok ? r.json() : [])
      .then((a: Ad[]) => { if (mounted) setAds(Array.isArray(a) ? a : []); })
      .catch(() => setAds([]));
    return () => { mounted = false; };
  }, []);

  // state per-kartu (pakai 5 slot sesuai UI kamu)
  const SLOTS = 5;
  const [cooldowns, setCooldowns] = useState<number[]>(Array(SLOTS).fill(0));
  const [watchedId, setWatchedId] = useState<(number|null)[]>(Array(SLOTS).fill(null));
  const claiming = useRef<boolean[]>(Array(SLOTS).fill(false));

  // timer countdown
  useEffect(() => {
    const t = setInterval(() => {
      setCooldowns(cs => cs.map(s => (s > 0 ? s - 1 : 0)));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // util: pilih iklan untuk slot i (kalau ads < 5, diputar)
  const adOf = (i:number) => (ads.length ? ads[i % ads.length] : null);

  // tombol "Watch Ad" di kartu ke-i
  function handleWatchSlot(i:number){
    const ad = adOf(i);
    if (!ad) { alert('Tidak ada iklan aktif'); return; }

    setWatchedId(prev => { const copy=[...prev]; copy[i] = ad.id; return copy; });
    setCooldowns(prev => { const copy=[...prev]; copy[i] = ad.duration_sec || 16; return copy; });

    const tg = typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : null;
    if (tg?.openLink) tg.openLink(ad.media_url, { try_instant_view: false });
    else window.open(ad.media_url, '_blank', 'noopener');
  }

  // tombol "Klaim" di kartu ke-i
  async function handleClaimSlot(i:number){
    const ad = adOf(i);
    if (!ad) return;
    if (cooldowns[i] > 0) return;            // belum 16s
    if (watchedId[i] !== ad.id) return;      // harus nonton iklan slot ini dulu
    if (claiming.current[i]) return;

    claiming.current[i] = true;
    try{
      const res = await fetch(`${API_BASE}/api/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: ad.reward })
      });
      const data = await res.json().catch(() => ({} as any));
      if (typeof data.cooldown === 'number') {
        setCooldowns(prev => { const c=[...prev]; c[i]=data.cooldown; return c; });
      } else {
        // sukses klaim → reset slot (boleh nonton lagi)
        setWatchedId(prev => { const w=[...prev]; w[i]=null; return w; });
      }
    } finally {
      claiming.current[i] = false;
    }
  }

  const canClaim = (i:number) => {
    const ad = adOf(i);
    return !!ad && watchedId[i] === ad.id && cooldowns[i] <= 0 && !claiming.current[i];
  };
  // ====== END LOGIC IKLAN ======

  return (
    <div className="p-4 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Advertisement Tasks</h1>
        <p className="text-gray-400">Watch ads to earn $0.003 each</p>
      </div>

      {/* Task List (tetap layout kamu) */}
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

          return (
            <div key={task.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <Play className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {`Watch ${ad?.title ?? task.title}`}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {duration}s
                      </div>
                      <div className="flex items-center gap-1 text-green-400">
                        <DollarSign className="w-4 h-4" />
                        {reward.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Watch Ad = buka link + mulai timer slot */}
                  <button
                    onClick={() => handleWatchSlot(idx)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Watch Ad
                  </button>

                  {/* Klaim = tambah saldo setelah 16s */}
                  <button
                    onClick={() => handleClaimSlot(idx)}
                    disabled={!canClaim(idx)}
                    className="bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    title={canClaim(idx) ? "Klaim" : (cooldowns[idx] > 0 ? `Tunggu ${cooldowns[idx]}s` : "Tonton dulu")}
                  >
                    {canClaim(idx) ? "Klaim" : (cooldowns[idx] > 0 ? `Tunggu ${cooldowns[idx]}s` : "Klaim")}
                  </button>
                </div>
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

      {/* Statistics Section (tetap) */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Task Statistics
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
            <div className="text-2xl font-bold text-green-400">${userData.balance.toFixed(6)}</div>
            <div className="text-xs text-gray-400">ready to withdraw</div>
          </div>
        </div>

        <div className="mt-4 bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium">Progress</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(completedAdTasks / Math.max(adTasks.length,1)) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">
            {Math.round((completedAdTasks / Math.max(adTasks.length,1)) * 100)}% complete
          </div>
        </div>

        <div className="mt-4 bg-slate-700 rounded-lg p-4">
          <div className="text-sm font-medium mb-2">Estimated Earnings</div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">From ads:</span>
            <span className="font-medium">${(completedAdTasks * 0.003).toFixed(6)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-400">Potential remaining:</span>
            <span className="font-medium">${(availableAdTasks.length * 0.003).toFixed(6)}</span>
          </div>
        </div>
      </div>

      {/* Ad Modal (tetap, kalau masih dipakai di tempat lain) */}
      {showAdModal && currentAdTask && (
        <AdModal
          task={currentAdTask}
          onComplete={handleAdComplete}
          onClose={() => setShowAdModal(false)}
        />
      )}
    </div>
  );
};

export default TaskPage;
