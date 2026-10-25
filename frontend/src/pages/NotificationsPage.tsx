import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { Bell, Check, MessageSquare, UserPlus, Phone, CheckCheck } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleClick = (notif: NotificationItem) => {
    api.markNotificationRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));

    if (notif.type === 'message') {
      navigate('/chat');
    } else if (notif.type === 'friend_request' || notif.type === 'friend_accept') {
      navigate('/connections');
    } else if (notif.type === 'call_audio' || notif.type === 'call_video') {
      navigate('/calls');
    }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="text-indigo-600" size={24} /> Notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stay updated with your latest messages, friend requests, and call alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 transition flex items-center gap-1.5"
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            filter === 'unread'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No notifications found
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`py-4 px-3 flex items-start justify-between gap-4 rounded-2xl cursor-pointer transition ${
                  !notif.is_read
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={notif.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                    alt={notif.sender_name}
                    className="w-11 h-11 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(notif.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                {!notif.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 mt-2"></span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
