import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BlockedUser } from '../types';
import { Shield, Ban, Unlock, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBlockedUsers();
      setBlockedUsers(res.blockedUsers || []);
    } catch (err) {
      console.error('Failed to load blocked users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const handleUnblock = async (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to unblock ${name}?`)) return;
    try {
      await api.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.user_id !== userId));
      alert(`${name} has been unblocked.`);
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="text-indigo-600" size={24} /> Privacy & Moderation
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Control your safety, review blocked accounts, and understand our privacy standards
        </p>
      </div>

      {/* Blocked Users Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Ban size={18} className="text-rose-500" /> Blocked Users ({blockedUsers.length})
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Blocked users cannot send you messages, initiate audio/video calls with you, or see your online status.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            You have not blocked any users.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {blockedUsers.map((item) => (
              <div
                key={item.block_id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                    alt={item.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.full_name}</p>
                    <p className="text-xs text-slate-400">@{item.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(item.user_id, item.full_name)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Unlock size={14} /> Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Standards Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Lock size={18} className="text-emerald-500" /> Security & Encryption Standards
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-500" /> Direct WebRTC Calling
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Audio and video communication is streamed directly peer-to-peer using DTLS and SRTP encryption. Media is never stored on intermediate servers.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Lock size={16} className="text-indigo-500" /> Token & Hash Protection
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Passwords are salted and hashed using standard bcrypt algorithms. Protected API routes verify signed JSON Web Tokens for every sensitive action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
