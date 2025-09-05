export interface UserData {
  balance: number;
  completedAds: number;
  totalTasks: number;
  referrals: Referral[];
  lastLuckyDraw: string | null;
  telegramId: string;
}

export interface Task {
  id: number;
  type: 'ad' | 'follow' | 'lucky';
  title: string;
  reward: number;
  completed: boolean;
  duration?: number;
}

export interface Referral {
  id: number;
  username: string;
  earned: number;
  commission: number;
  joinedDate: string;
}