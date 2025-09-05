import React from 'react';
import { Home, CheckSquare, Users, Wallet } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'task', label: 'Tasks', icon: CheckSquare },
    { id: 'referral', label: 'Referral', icon: Users },
    { id: 'withdraw', label: 'Withdraw', icon: Wallet },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                  isActive
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Navigation;