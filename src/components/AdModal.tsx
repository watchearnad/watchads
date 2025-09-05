import React, { useState, useEffect } from 'react';
import { X, Play, CheckCircle, Clock } from 'lucide-react';
import { Task } from '../types';

interface AdModalProps {
  task: Task;
  onComplete: () => void;
  onClose: () => void;
}

const AdModal: React.FC<AdModalProps> = ({ task, onComplete, onClose }) => {
  const [isWatching, setIsWatching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(task.duration || 16);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWatching && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsCompleted(true);
            setIsWatching(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWatching, timeLeft]);

  const startAd = () => {
    setIsWatching(true);
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleClose = () => {
    if (!isWatching) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-600">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold">Advertisement</h3>
          {!isWatching && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {!isWatching && !isCompleted && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <Play className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">{task.title}</h4>
                <p className="text-gray-400 mb-4">Watch this ad to earn ${task.reward.toFixed(6)}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {task.duration} seconds</span>
                </div>
              </div>
              <button
                onClick={startAd}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Watching
              </button>
            </div>
          )}

          {isWatching && (
            <div className="text-center space-y-4">
              <div className="w-full h-40 bg-slate-700 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-gray-400 text-sm">Advertisement Playing</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-400">{timeLeft}s</div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((task.duration! - timeLeft) / task.duration!) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-400">Please wait until the ad completes</div>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Advertisement Completed!</h4>
                <p className="text-gray-400 mb-4">You've successfully watched the advertisement</p>
                <div className="bg-slate-700 rounded-lg p-3 mb-4">
                  <div className="text-sm text-gray-400">Reward Earned</div>
                  <div className="text-2xl font-bold text-green-400">${task.reward.toFixed(6)}</div>
                </div>
              </div>
              <button
                onClick={handleComplete}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium transition-colors"
              >
                Claim Reward
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdModal;