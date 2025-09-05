import React, { useState } from 'react';
import { Users, Copy, Share, DollarSign, UserPlus, TrendingUp, CheckCircle } from 'lucide-react';
import { UserData } from '../types';

interface ReferralPageProps {
  userData: UserData;
}

const ReferralPage: React.FC<ReferralPageProps> = ({ userData }) => {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://t.me/YourBot?start=${userData.telegramId}`;
  
  // Mock referral data - in real app this would come from props
  const mockReferrals = [
    { id: 1, username: '@alice_crypto', earned: 0.245, commission: 0.0245, joinedDate: '2024-01-15' },
    { id: 2, username: '@bob_trader', earned: 0.156, commission: 0.0156, joinedDate: '2024-01-18' },
    { id: 3, username: '@crypto_sarah', earned: 0.089, commission: 0.0089, joinedDate: '2024-01-20' },
    { id: 4, username: '@mike_investor', earned: 0.334, commission: 0.0334, joinedDate: '2024-01-22' },
  ];

  const totalEarnings = mockReferrals.reduce((sum, ref) => sum + ref.earned, 0);
  const totalCommissions = mockReferrals.reduce((sum, ref) => sum + ref.commission, 0);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me and earn cryptocurrency!',
        text: 'Start earning crypto by watching ads. Join using my referral link!',
        url: referralLink,
      });
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Referral Program</h1>
        <p className="text-gray-400">Invite your friends to get 10% from their earnings</p>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium">Total Referrals</span>
          </div>
          <div className="text-2xl font-bold">{mockReferrals.length}</div>
          <div className="text-xs text-gray-400">active users</div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium">Commission Earned</span>
          </div>
          <div className="text-2xl font-bold text-green-400">${totalCommissions.toFixed(6)}</div>
          <div className="text-xs text-gray-400">from referrals</div>
        </div>
      </div>

      {/* Invite Section */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Share className="w-5 h-5" />
          Invite Friends
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Your Referral Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <button
            onClick={shareLink}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Share className="w-5 h-5" />
            Share Invitation Link
          </button>
        </div>
      </div>

      {/* Commission Info */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-4 border border-purple-700/50">
        <h3 className="text-lg font-semibold mb-3 text-purple-200">How It Works</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            <span>Friend joins using your link</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Friend earns from watching ads</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span>You get 10% commission instantly</span>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Your Referrals
        </h3>
        
        {mockReferrals.length > 0 ? (
          <div className="space-y-3">
            {mockReferrals.map(referral => (
              <div key={referral.id} className="bg-slate-700 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{referral.username}</div>
                    <div className="text-xs text-gray-400">
                      Joined {new Date(referral.joinedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${referral.earned.toFixed(6)}</div>
                  <div className="text-xs text-green-400">+${referral.commission.toFixed(6)} commission</div>
                </div>
              </div>
            ))}
            
            <div className="border-t border-slate-600 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Earnings from Referrals:</span>
                <span className="text-lg font-bold text-green-400">${totalEarnings.toFixed(6)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-400">Your commission (10%):</span>
                <span className="text-green-400 font-medium">${totalCommissions.toFixed(6)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Referrals Yet</h3>
            <p className="text-gray-400 mb-4">Start inviting friends to earn commissions!</p>
            <button
              onClick={shareLink}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Share Your Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralPage;