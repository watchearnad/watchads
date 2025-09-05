import React, { useState, useEffect } from 'react';
import { Home, CheckSquare, Users, Wallet, User, Clock, Star, Gift } from 'lucide-react';
import HomePage from './components/HomePage';
import TaskPage from './components/TaskPage';
import ReferralPage from './components/ReferralPage';
import WithdrawPage from './components/WithdrawPage';
import Navigation from './components/Navigation';
import { UserData, Task, Referral } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [userData, setUserData] = useState<UserData>({
    balance: 0.0,
    completedAds: 0,
    totalTasks: 15,
    referrals: [],
    lastLuckyDraw: null,
    telegramId: '@username'
  });

  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, type: 'ad', title: 'Watch Advertisement #1', reward: 0.003, completed: false, duration: 16 },
    { id: 2, type: 'ad', title: 'Watch Advertisement #2', reward: 0.003, completed: false, duration: 16 },
    { id: 3, type: 'ad', title: 'Watch Advertisement #3', reward: 0.003, completed: false, duration: 16 },
    { id: 4, type: 'ad', title: 'Watch Advertisement #4', reward: 0.003, completed: false, duration: 16 },
    { id: 5, type: 'ad', title: 'Watch Advertisement #5', reward: 0.003, completed: false, duration: 16 },
    { id: 6, type: 'follow', title: 'Follow @TelegramChannel', reward: 0.005, completed: false },
    { id: 7, type: 'follow', title: 'Follow @CryptoNews', reward: 0.005, completed: false },
    { id: 8, type: 'follow', title: 'Join Community Group', reward: 0.008, completed: false },
  ]);

  const completeTask = (taskId: number) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      setUserData(prevData => ({
        ...prevData,
        balance: prevData.balance + task.reward,
        completedAds: task.type === 'ad' ? prevData.completedAds + 1 : prevData.completedAds
      }));
    }
  };

  const performLuckyDraw = () => {
    const today = new Date().toDateString();
    if (userData.lastLuckyDraw !== today) {
      const rewards = [0.005, 0.008, 0.010, 0.012, 0.015, 0.020];
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
      
      setUserData(prevData => ({
        ...prevData,
        balance: prevData.balance + randomReward,
        lastLuckyDraw: today
      }));
      
      return randomReward;
    }
    return null;
  };

  const canPlayLuckyDraw = () => {
    const today = new Date().toDateString();
    return userData.lastLuckyDraw !== today;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-md mx-auto bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">{userData.telegramId}</div>
              <div className="text-sm text-gray-400">Rewards Earner</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-400">${userData.balance.toFixed(6)}</div>
            <div className="text-xs text-gray-400">Balance</div>
          </div>
        </div>

        {/* Page Content */}
        <div className="pb-16">
          {currentPage === 'home' && (
            <HomePage
              userData={userData}
              tasks={tasks}
              completeTask={completeTask}
              performLuckyDraw={performLuckyDraw}
              canPlayLuckyDraw={canPlayLuckyDraw}
              setCurrentPage={setCurrentPage}
            />
          )}
          {currentPage === 'task' && (
            <TaskPage
              tasks={tasks}
              userData={userData}
              completeTask={completeTask}
            />
          )}
          {currentPage === 'referral' && (
            <ReferralPage userData={userData} />
          )}
          {currentPage === 'withdraw' && (
            <WithdrawPage userData={userData} />
          )}
        </div>

        {/* Navigation */}
        <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
    </div>
  );
}

export default App;