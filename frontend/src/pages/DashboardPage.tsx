import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { api } from '../services/api';
import { User, Conversation, NotificationItem } from '../types';
import { 
  MessageSquare, Video, Phone, UserPlus, Users, Sparkles, 
  Search, ArrowRight, Bell, Check, Clock, ShieldCheck 
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [sugRes, convRes, friendsRes, notifRes] = await Promise.all([
          api.getSuggestions(),
          api.getConversations(),
          api.getFriends(),
          api.getNotifications(),
        ]);
        setSuggestions(sugRes.suggestions || []);
        setConversations(convRes.conversations || []);
        setFriends(friendsRes.friends || []);
        setNotifications((notifRes.notifications || []).slice(0, 4));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleConnect = async (targetUserId: number) => {
    try {
      await api.sendConnectionRequest(targetUserId);
      setSuggestions(prev => prev.filter(u => u.id !== targetUserId));
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  const handleStartConversation = async (targetUserId: number) => {
    try {
      const res = await api.getOrCreateConversation(targetUserId);
      navigate(`/chat?c=${res.conversationId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start chat');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Profile Summary Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/30 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                alt={user?.full_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 border-2 border-indigo-900 rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold">{user?.full_name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 backdrop-blur-md text-indigo-200">
                  Online
                </span>
              </div>
              <p className="text-sm text-indigo-200 mt-0.5">@{user?.username}</p>
              <p className="text-xs text-slate-300 mt-2 max-w-md line-clamp-1">
                {user?.bio || 'Connect with colleagues, friends, and peers with real-time audio and video!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              to="/chat"
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-sm shadow-md hover:bg-slate-100 transition flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} /> Open Chat
            </Link>
            <Link
              to={`/profile/${user?.username}`}
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md transition flex items-center justify-center"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Quick Search & Discovery Box (Mobile & Desktop) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
          }}
          className="flex items-center gap-3"
        >
          <Search className="text-slate-400 shrink-0" size={20} />
          <input
            type="text"
            placeholder="Search ConnectHub to find friends, colleagues, or people with shared interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Conversations Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-600" /> Recent Conversations
              </h3>
              <Link to="/chat" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                View all chats
              </Link>
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                <p>No active conversations yet.</p>
                <p className="text-xs mt-1 text-slate-500">Find people below and start chatting!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {conversations.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/chat?c=${conv.id}`)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <img
                          src={conv.partner_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                          alt={conv.partner_name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/40"
                        />
                        {conv.partner_is_online ? (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {conv.partner_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-[200px] sm:max-w-xs">
                          {conv.last_message || (conv.last_attachment_type ? `Sent an attachment` : 'No messages yet')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {conv.unread_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">
                          {conv.unread_count}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startCall(
                              {
                                id: conv.partner_id,
                                username: conv.partner_username,
                                full_name: conv.partner_name,
                                avatar_url: conv.partner_avatar,
                              },
                              'audio'
                            );
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition"
                          title="Audio Call"
                        >
                          <Phone size={17} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startCall(
                              {
                                id: conv.partner_id,
                                username: conv.partner_username,
                                full_name: conv.partner_name,
                                avatar_url: conv.partner_avatar,
                              },
                              'video'
                            );
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition"
                          title="Video Call"
                        >
                          <Video size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* People You May Know / Suggested Connections */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-cyan-500" /> Suggested Connections
              </h3>
              <Link to="/discover" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                Explore more
              </Link>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No suggestions right now</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.slice(0, 4).map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <Link to={`/profile/${sug.username}`} className="flex items-center gap-3 min-w-0">
                      <img
                        src={sug.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                        alt={sug.full_name}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate hover:underline">
                          {sug.full_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">@{sug.username}</p>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleConnect(sug.id)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 transition"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          {/* Online Friends List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-emerald-500" /> Online Friends
              </h3>
              <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                {friends.filter(f => f.is_online).length} online
              </span>
            </div>

            {friends.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No connected friends yet</p>
            ) : (
              <div className="space-y-3">
                {friends.slice(0, 6).map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition"
                  >
                    <Link to={`/profile/${friend.username}`} className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <img
                          src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                          alt={friend.full_name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        {friend.is_online ? (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {friend.full_name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {friend.is_online ? 'Active now' : 'Offline'}
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartConversation(friend.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Chat"
                      >
                        <MessageSquare size={15} />
                      </button>
                      <button
                        onClick={() => startCall(friend, 'audio')}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Audio Call"
                      >
                        <Phone size={15} />
                      </button>
                      <button
                        onClick={() => startCall(friend, 'video')}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Video Call"
                      >
                        <Video size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity / Notifications Snippet */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Bell size={16} className="text-amber-500" /> Recent Activity
              </h3>
              <Link to="/notifications" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                All
              </Link>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No recent notifications</p>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
