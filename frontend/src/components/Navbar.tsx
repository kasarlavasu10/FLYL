import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { 
  Search, Bell, Sun, Moon, LogOut, User, 
  Settings, Shield, MessageSquare, Phone, Check, Sparkles 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = () => {
      fetchNotifications();
    };
    socket.on('notification:new', handleNewNotif);
    return () => {
      socket.off('notification:new', handleNewNotif);
    };
  }, [socket]);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {}
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-black bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              ConnectHub
            </span>
            <span className="text-[10px] tracking-widest block uppercase font-bold text-slate-400 -mt-1">Social</span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search people by name, username or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 rounded-full text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </form>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popup Menu */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-up">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell size={16} className="text-indigo-500" /> Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Check size={14} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          api.markNotificationRead(notif.id);
                          setShowNotifications(false);
                          if (notif.type === 'message') navigate('/chat');
                          else if (notif.type === 'friend_request' || notif.type === 'friend_accept') navigate('/connections');
                        }}
                        className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition ${
                          !notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <img
                          src={notif.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                          alt={notif.sender_name}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                            {notif.body}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-2"></span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Link
                  to="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="block p-3 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800 transition"
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/50 transition"
            >
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                alt={user?.full_name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500"
              />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 hidden lg:inline max-w-[120px] truncate">
                {user?.full_name}
              </span>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-scale-up">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
                </div>

                <div className="py-1">
                  <Link
                    to={`/profile/${user?.username}`}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <User size={16} /> Your Profile
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Settings size={16} /> Settings
                  </Link>

                  <Link
                    to="/privacy"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Shield size={16} /> Privacy & Blocked
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition font-medium"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
