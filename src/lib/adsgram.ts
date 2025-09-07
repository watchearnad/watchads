// src/lib/adsgram.ts
// Helper: coba Rewarded dulu, kalau no-fill → Interstitial.
declare global { interface Window { Adsgram?: any; Telegram?: any } }

let rewardController: any | null = null;
let interController: any | null = null;

function ensureInit() {
  if (!window?.Adsgram) return false;

  if (!rewardController) {
    const rewardId = import.meta.env.VITE_ADSGRAM_REWARD_BLOCK_ID as string | undefined;
    if (rewardId) rewardController = window.Adsgram.init({ blockId: rewardId });
  }
  if (!interController) {
    const interId = import.meta.env.VITE_ADSGRAM_INTER_BLOCK_ID as string | undefined;
    if (interId) interController = window.Adsgram.init({ blockId: interId });
  }
  return !!rewardController || !!interController;
}

/** Tampilkan Adsgram: 'rewarded' | 'interstitial' | 'nofill' */
export async function showRewardThenFallback(): Promise<'rewarded'|'interstitial'|'nofill'> {
  const ok = ensureInit();
  if (!ok) return 'nofill';

  if (rewardController?.show) {
    try { await rewardController.show(); return 'rewarded'; }
    catch { /* no fill / closed */ }
  }
  if (interController?.show) {
    try { await interController.show(); return 'interstitial'; }
    catch { /* no fill */ }
  }
  return 'nofill';
}
export {};
