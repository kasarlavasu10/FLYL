import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCall } from '../context/CallContext';
import { api } from '../services/api';
import { 
  Users, UserCheck, Clock, Check, X, MessageSquare, 
  Phone, Video, Trash2, ArrowRight 
} from 'lucide-react';

export const ConnectionsPage: React.FC = () => {
  const { startCall } = useCall();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        api.getFriends(),
        api.getPendingConnections(),
      ]);
      setFriends(friendsRes.friends || []);
      setIncoming(pendingRes.incoming || []);
      setOutgoing(pendingRes.outgoing || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccept = async (requestId: number) => {
    try {
      await api.acceptConnectionRequest(requestId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await api.rejectConnectionRequest(requestId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject request');
    }
  };

  const handleRemoveFriend = async (connectionId: number, name: string) => {
    if (!confirm(`Remove ${name} from your connections?`)) return;
    try {
      await api.removeConnection(connectionId);
      setFriends(prev => prev.filter(f => f.connection_id !== connectionId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove connection');
    }
  };

  const handleStartChat = async (userId: number) => {
    try {
      const res = await api.getOrCreateConversation(userId);
      navigate(`/chat?c=${res.conversationId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to open chat');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header and Tab Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600" size={24} /> My Connections
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage your network, incoming requests, and friendships
            </p>
          </div>

          <Link
            to="/discover"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition self-start sm:self-auto flex items-center gap-1.5"
          >
            Find New People <ArrowRight size={14} />
          </Link>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setTab('friends')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              tab === 'friends'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck size={16} /> Friends ({friends.length})
          </button>

          <button
            onClick={() => setTab('incoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              tab === 'incoming'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock size={16} /> Incoming Requests ({incoming.length})
          </button>

          <button
            onClick={() => setTab('outgoing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              tab === 'outgoing'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Outgoing ({outgoing.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No connected friends yet</p>
              <p className="text-xs text-slate-400 mt-1">Explore suggested connections to expand your network!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <Link to={`/profile/${friend.username}`} className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                        alt={friend.full_name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/40"
                      />
                      {friend.is_online ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate hover:underline">
                        {friend.full_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">@{friend.username}</p>
                      <span className="text-[10px] text-slate-400">
                        {friend.is_online ? 'Active now' : 'Offline'}
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStartChat(friend.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                      title="Chat"
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button
                      onClick={() => startCall(friend, 'audio')}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition"
                      title="Audio Call"
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      onClick={() => startCall(friend, 'video')}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition"
                      title="Video Call"
                    >
                      <Video size={16} />
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend.connection_id, friend.full_name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="Remove Connection"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'incoming' ? (
          incoming.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-xs text-slate-400">
              No pending incoming requests
            </div>
          ) : (
            <div className="space-y-3">
              {incoming.map((req) => (
                <div
                  key={req.request_id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <Link to={`/profile/${req.username}`} className="flex items-center gap-3 min-w-0">
                    <img
                      src={req.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                      alt={req.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate hover:underline">
                        {req.full_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">@{req.username}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{req.bio || 'Wants to connect with you'}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAccept(req.request_id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.request_id)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : outgoing.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-xs text-slate-400">
            No pending outgoing requests
          </div>
        ) : (
          <div className="space-y-3">
            {outgoing.map((req) => (
              <div
                key={req.request_id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <Link to={`/profile/${req.username}`} className="flex items-center gap-3 min-w-0">
                  <img
                    src={req.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                    alt={req.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {req.full_name}
                    </p>
                    <p className="text-xs text-slate-400">@{req.username}</p>
                  </div>
                </Link>

                <button
                  onClick={() => handleReject(req.request_id)}
                  className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition"
                >
                  Cancel Request
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
