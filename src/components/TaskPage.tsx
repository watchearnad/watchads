import React, { useState } from 'react';
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

  return (
    <div className="p-4 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Advertisement Tasks</h1>
        <p className="text-gray-400">Watch ads to earn $0.003 each</p>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Tasks</h2>
          <span className="bg-blue-600 text-xs px-3 py-1 rounded-full">
            {availableAdTasks.length} remaining
          </span>
        </div>

        {availableAdTasks.map(task => (
          <div key={task.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <Play className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium">{task.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {task.duration}s
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="w-4 h-4" />
                      {task.reward.toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleAdStart(task)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Watch Ad
              </button>
            </div>
          </div>
        ))}

        {availableAdTasks.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Tasks Completed!</h3>
            <p className="text-gray-400">Check back later for new advertisements</p>
          </div>
        )}
      </div>

      {/* Statistics Section */}
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
              style={{ width: `${(completedAdTasks / adTasks.length) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400">
            {Math.round((completedAdTasks / adTasks.length) * 100)}% complete
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

export default TaskPage;