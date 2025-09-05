import React, { useState } from 'react';
import { ChevronRight, Gift, Star, Users, Play, CheckCircle, Clock } from 'lucide-react';
import { Task, UserData } from '../types';
import AdModal from './AdModal';

interface HomePageProps {
  userData: UserData;
  tasks: Task[];
  completeTask: (taskId: number) => void;
  performLuckyDraw: () => number | null;
  canPlayLuckyDraw: () => boolean;
  setCurrentPage: (page: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({
  userData,
  tasks,
  completeTask,
  performLuckyDraw,
  canPlayLuckyDraw,
  setCurrentPage
}) => {
  const [showAdModal, setShowAdModal] = useState(false);
  const [currentAdTask, setCurrentAdTask] = useState<Task | null>(null);
  const [luckyDrawResult, setLuckyDrawResult] = useState<number | null>(null);

  const followTasks = tasks.filter(task => task.type === 'follow' && !task.completed);
  const availableAds = tasks.filter(task => task.type === 'ad' && !task.completed);

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

  const handleLuckyDraw = () => {
    const reward = performLuckyDraw();
    if (reward) {
      setLuckyDrawResult(reward);
      setTimeout(() => setLuckyDrawResult(null), 3000);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Task Categories Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-200">Available Tasks</h2>
        
        {/* Follow Tasks */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-medium">Follow Tasks</h3>
            <span className="bg-blue-600 text-xs px-2 py-1 rounded-full">
              {followTasks.length} Available
            </span>
          </div>
          
          {followTasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Users className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-xs text-green-400">${task.reward.toFixed(3)} reward</div>
                </div>
              </div>
              <button
                onClick={() => completeTask(task.id)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Complete
              </button>
            </div>
          ))}
        </div>

        {/* Lucky Draw */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <h3 className="font-medium">Daily Lucky Draw</h3>
            {!canPlayLuckyDraw() && (
              <span className="bg-gray-600 text-xs px-2 py-1 rounded-full">Completed Today</span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Win random rewards up to $0.020!</div>
              <div className="text-xs text-gray-400">Average reward: $0.010</div>
            </div>
            <button
              onClick={handleLuckyDraw}
              disabled={!canPlayLuckyDraw()}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                canPlayLuckyDraw()
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              {canPlayLuckyDraw() ? 'Play Now' : 'Try Tomorrow'}
            </button>
          </div>
        </div>

        {/* Watch Ads Section */}
        {availableAds.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4" />
              </div>
              <h3 className="font-medium">Watch Ads</h3>
              <span className="bg-green-600 text-xs px-2 py-1 rounded-full">
                {availableAds.length} Available
              </span>
            </div>
            
            <div className="space-y-2">
              {availableAds.slice(0, 2).map(task => (
                <div key={task.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Play className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.duration}s • $0.003 reward
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdStart(task)}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                  >
                    Watch
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Friends Section */}
      <div 
        onClick={() => setCurrentPage('referral')}
        className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600 cursor-pointer hover:from-slate-700 hover:to-slate-600 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Invite Friends</h3>
              <p className="text-gray-400 text-sm">Get 10% from friends' earnings</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400" />
        </div>
      </div>

      {/* Lucky Draw Result Modal */}
      {luckyDrawResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 m-4 text-center border border-slate-600">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
            <p className="text-gray-300 mb-4">You won</p>
            <div className="text-3xl font-bold text-green-400 mb-4">
              ${luckyDrawResult.toFixed(6)}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div className="bg-green-500 h-1 rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Ad Modal */}
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

export default HomePage;