import React from "react";
import { Target, TrendingUp, CheckCircle, DollarSign } from "lucide-react";
import { Task, UserData } from "../types";
import AdModal from "./AdModal";         // tetap ada kalau kamu masih pakai modal untuk task lain
import TaskAdsList from "./TaskAdsList"; // ← list iklan dari DB

interface TaskPageProps {
  tasks: Task[];
  userData: UserData;
  completeTask: (taskId: number) => void;
}

const TaskPage: React.FC<TaskPageProps> = ({ tasks, userData /*, completeTask*/ }) => {
  // Kamu masih punya statistik dari tasks lama; biarkan agar UI konsisten
  const adTasks = tasks.filter(t => t.type === "ad");
  const completedAdTasks = adTasks.filter(t => t.completed).length;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Advertisement Tasks</h1>
        <p className="text-gray-400">Watch ads to earn $0.003 each</p>
      </div>

      {/* Available Tasks dari DB */}
      <TaskAdsList />

      {/* Statistics Section (opsional, tetap seperti punyamu) */}
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
            <div className="text-2xl font-bold text-green-400">
              ${userData.balance.toFixed(6)}
            </div>
            <div className="text-xs text-gray-400">ready to withdraw</div>
          </div>
        </div>

        <div className="mt-4 bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium">Progress</span>
          </div>
          <div className="text-sm text-gray-300">
            Keep watching ads to increase your earnings!
          </div>
        </div>
      </div>

      {/* AdModal tetap tersedia kalau kamu pakai di tempat lain */}
      {/* <AdModal ... /> */}
    </div>
  );
};

export default TaskPage;
