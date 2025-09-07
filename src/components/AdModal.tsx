// src/components/AdModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { showAdsgram } from "../lib/adsgram";

type Task = {
  id: number;
  title?: string | null;
  reward?: number;
  duration_sec?: number;
};

type Props = {
  open: boolean;
  task: Task | null;
  userId?: number;
  onClose: () => void;
  onComplete?: (payload?: { taskId: number; reward: number }) => void;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

function getTG(): any | null {
  if (typeof window === "undefined") return null;
  // @ts-ignore
  return window?.Telegram?.WebApp ?? null;
}

export default function AdModal({ open, task, userId: userIdProp, onClose, onComplete }: Props) {
  const [status, setStatus] = useState<"idle"|"playing"|"claiming"|"done"|"nofill"|"error">("idle");
  const started = useRef(false);

  const reward = useMemo(() => Number(task?.reward ?? 1), [task?.reward]);

  // ambil userId dari Telegram jika tidak dipassing lewat props
  const userId = useMemo(() => {
    if (typeof userIdProp === "number" && Number.isFinite(userIdProp)) return userIdProp;
    const tg = getTG();
    const uid = tg?.initDataUnsafe?.user?.id;
    return (typeof uid === "number" && Number.isFinite(uid)) ? uid : 123;
  }, [userIdProp]);

  useEffect(() => {
    // jalanin flow IKLAN -> CLAIM otomatis saat modal open
    if (!open || !task || started.current) return;
    started.current = true;

    (async () => {
      try {
        setStatus("playing");
        const result = await showAdsgram(); // "rewarded" | "interstitial" | "nofill"
        if (result === "nofill") { setStatus("nofill"); return; }

        setStatus("claiming");
        const res = await fetch(`${API_BASE}/api/reward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, amount: reward })
        });
        await res.json().catch(() => ({}));

        setStatus("done");
        onComplete?.({ taskId: task.id, reward });
        // auto close setelah sedikit jeda
        setTimeout(() => onClose(), 700);
      } catch (e) {
        console.log(e);
        setStatus("error");
      }
    })();

    // reset flag saat modal ditutup
    return () => { started.current = false; setStatus("idle"); };
  }, [open, task, userId, reward, onClose, onComplete]);

  if (!open || !task) return null;

  // UI modal sederhana (Tailwind)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* card */}
      <div className="relative z-10 w-[92%] max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="mb-3">
          <h3 className="text-lg font-semibold truncate">
            Watching Ad — {task.title || `Task #${task.id}`}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Reward: <b>{reward.toFixed(3)}</b>
          </p>
        </div>

        {/* status */}
        {status === "playing" && (
          <div className="py-6 text-center">
            <div className="animate-pulse text-slate-300">Showing ad…</div>
            <div className="text-xs text-slate-500 mt-2">Please wait until it finishes.</div>
          </div>
        )}
        {status === "claiming" && (
          <div className="py-6 text-center">
            <div className="animate-pulse text-slate-300">Claiming reward…</div>
          </div>
        )}
        {status === "done" && (
          <div className="py-6 text-center">
            <div className="text-emerald-400 font-medium">Reward added!</div>
          </div>
        )}
        {status === "nofill" && (
          <div className="py-6 text-center">
            <div className="text-amber-400 font-medium">No ad available right now.</div>
            <div className="text-xs text-slate-500 mt-2">Try again in a moment.</div>
          </div>
        )}
        {status === "error" && (
          <div className="py-6 text-center">
            <div className="text-rose-400 font-medium">Something went wrong.</div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-700 text-white hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
