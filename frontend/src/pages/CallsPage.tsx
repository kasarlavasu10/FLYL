import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { api } from '../services/api';
import { CallLog } from '../types';
import { 
  PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, 
  Video, Phone, Clock, ArrowRight, ShieldCheck 
} from 'lucide-react';

export const CallsPage: React.FC = () => {
  const { user } = useAuth();
  const { startCall } = useCall();

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCalls = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCallHistory();
      setCalls(res.calls || []);
    } catch (err) {
      console.error('Failed to load call history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const formatDuration = (secs: number) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PhoneCall className="text-indigo-600" size={24} /> Call History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review past incoming, outgoing, and missed audio and video calls
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck size={16} /> WebRTC Peer-to-Peer
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No call history logged yet. Start a call from any chat or profile!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {calls.map((call) => {
              const isOutgoing = call.caller_id === user?.id;
              const partner = isOutgoing
                ? { id: call.receiver_id, username: call.receiver_username, name: call.receiver_name, avatar: call.receiver_avatar }
                : { id: call.caller_id, username: call.caller_username, name: call.caller_name, avatar: call.caller_avatar };

              const isMissed = call.status === 'missed' || call.status === 'declined';

              return (
                <div
                  key={call.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                      alt={partner.name}
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {partner.name}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {call.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        {isOutgoing ? (
                          <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <PhoneOutgoing size={13} className="text-indigo-500" /> Outgoing
                          </span>
                        ) : isMissed ? (
                          <span className="flex items-center gap-1 text-rose-500 font-semibold text-[11px]">
                            <PhoneMissed size={13} /> Missed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px]">
                            <PhoneIncoming size={13} /> Incoming
                          </span>
                        )}

                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <span className="text-[11px] text-slate-400">
                          {call.duration_seconds > 0 ? formatDuration(call.duration_seconds) : call.status}
                        </span>

                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(call.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        startCall(
                          {
                            id: partner.id,
                            username: partner.username,
                            full_name: partner.name,
                            avatar_url: partner.avatar,
                          },
                          call.type
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      {call.type === 'video' ? <Video size={14} /> : <Phone size={14} />} Call Back
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
