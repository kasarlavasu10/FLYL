import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, MessageSquare, Compass, Users, PhoneCall, 
  Bell, Settings, User, Shield 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navLinks = [
    { to: '/', label: 'Home Feed', icon: Home },
    { to: '/chat', label: 'Messages', icon: MessageSquare },
    { to: '/discover', label: 'Explore People', icon: Compass },
    { to: '/connections', label: 'Connections', icon: Users },
    { to: '/calls', label: 'Call History', icon: PhoneCall },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: `/profile/${user?.username}`, label: 'My Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 justify-between h-[calc(100vh-4rem)] sticky top-16 transition-colors">
        <div className="space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-white'
                  }`
                }
              >
                <Icon size={19} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Mini Profile Card */}
        {user && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-center gap-3">
            <div className="relative">
              <img
                src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                alt={user.full_name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.full_name}</p>
              <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 py-2 px-3 z-40 flex items-center justify-around transition-colors">
        {[
          { to: '/', icon: Home, label: 'Home' },
          { to: '/chat', icon: MessageSquare, label: 'Chat' },
          { to: '/discover', icon: Compass, label: 'Explore' },
          { to: '/calls', icon: PhoneCall, label: 'Calls' },
          { to: `/profile/${user?.username}`, icon: User, label: 'Profile' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
