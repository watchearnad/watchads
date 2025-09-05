import React, { useState } from 'react';
import { Wallet, DollarSign, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { UserData } from '../types';

interface WithdrawPageProps {
  userData: UserData;
}

interface WithdrawRequest {
  id: number;
  amount: number;
  method: string;
  address: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  date: string;
}

const WithdrawPage: React.FC<WithdrawPageProps> = ({ userData }) => {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState('dana');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const minWithdraw = 0.01;
  
  // Mock withdraw history
  const withdrawHistory: WithdrawRequest[] = [
    { id: 1, amount: 0.025, method: 'Dana', address: '0812****5678', status: 'completed', date: '2024-01-20' },
    { id: 2, amount: 0.015, method: 'GoPay', address: '0823****9012', status: 'processing', date: '2024-01-22' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    
    if (withdrawAmount < minWithdraw) {
      alert(`Minimum withdrawal is $${minWithdraw.toFixed(3)}`);
      return;
    }
    
    if (withdrawAmount > userData.balance) {
      alert('Insufficient balance');
      return;
    }
    
    if (!address.trim()) {
      alert('Please enter your wallet address/phone number');
      return;
    }
    
    // Simulate withdrawal request
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setAmount('');
      setAddress('');
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Withdraw Funds</h1>
        <p className="text-gray-400">Withdraw your earnings to your e-wallet</p>
      </div>

      {/* Balance Display */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
        <div className="text-sm text-gray-400 mb-1">Available Balance</div>
        <div className="text-3xl font-bold text-green-400 mb-2">${userData.balance.toFixed(6)}</div>
        <div className="text-xs text-gray-500">Minimum withdrawal: ${minWithdraw.toFixed(3)}</div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Withdraw Funds
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selection */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-3">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('dana')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  method === 'dana'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium">DANA</div>
              </button>
              
              <button
                type="button"
                onClick={() => setMethod('gopay')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  method === 'gopay'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="w-8 h-8 bg-green-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium">GoPay</div>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Withdrawal Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.001"
                min={minWithdraw}
                max={userData.balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min $${minWithdraw.toFixed(3)}`}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Min: ${minWithdraw.toFixed(3)}</span>
              <button
                type="button"
                onClick={() => setAmount(userData.balance.toString())}
                className="text-blue-400 hover:text-blue-300"
              >
                Use Max
              </button>
            </div>
          </div>

          {/* Address Input */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              {method === 'dana' ? 'DANA' : 'GoPay'} Phone Number
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={`Enter your ${method === 'dana' ? 'DANA' : 'GoPay'} phone number`}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!amount || !address || parseFloat(amount || '0') < minWithdraw}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-medium transition-colors"
          >
            Request Withdrawal
          </button>
        </form>
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-yellow-200 mb-1">Important Notice</div>
            <ul className="text-gray-300 space-y-1">
              <li>• Processing time: 1-3 business days</li>
              <li>• Minimum withdrawal: ${minWithdraw.toFixed(3)}</li>
              <li>• Ensure your phone number is correct</li>
              <li>• Withdrawals are processed manually for security</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Withdrawal History */}
      {withdrawHistory.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Withdrawal History</h3>
          <div className="space-y-3">
            {withdrawHistory.map(request => (
              <div key={request.id} className="bg-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="font-medium">${request.amount.toFixed(6)}</span>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{request.method} • {request.address}</span>
                  <span>{new Date(request.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 m-4 text-center border border-slate-600 max-w-sm">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Withdrawal Requested!</h3>
            <p className="text-gray-300 mb-4">
              Your withdrawal request has been submitted successfully. 
              Processing time is 1-3 business days.
            </p>
            <div className="text-sm text-gray-400">
              Amount: ${parseFloat(amount).toFixed(6)}<br />
              Method: {method.toUpperCase()}<br />
              Address: {address}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawPage;