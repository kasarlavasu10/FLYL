import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { User } from '../types';
import { Search, UserPlus, MessageSquare, Compass, Sparkles, Check } from 'lucide-react';

export const DiscoverPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'suggestions'>('all');

  const executeSearch = async (searchTerm: string) => {
    setIsLoading(true);
    try {
      if (searchTerm.trim()) {
        const res = await api.searchUsers(searchTerm.trim());
        setUsers(res.users || []);
      } else {
        const res = await api.getSuggestions();
        setUsers(res.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    executeSearch(q);
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
  };

  const handleConnect = async (targetUserId: number) => {
    try {
      await api.sendConnectionRequest(targetUserId);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, connection_status: 'pending' } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to send connection request');
    }
  };

  const handleMessage = async (targetUserId: number) => {
    try {
      const res = await api.getOrCreateConversation(targetUserId);
      navigate(`/chat?c=${res.conversationId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Search Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-xl mx-auto text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Compass size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discover People</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search for friends, colleagues, or professionals by name, username, or shared interests
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, @username, or skills (e.g. React, Design)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {query.trim() ? `Search Results for "${query}"` : 'Recommended Connections'}
          </h3>
          <span className="text-xs text-slate-400">{users.length} people found</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No users match your search criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try searching for other keywords, interests, or names.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((person) => (
              <div
                key={person.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition group"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-3">
                    <Link to={`/profile/${person.username}`} className="relative shrink-0">
                      <img
                        src={person.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                        alt={person.full_name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/30 group-hover:scale-105 transition-transform"
                      />
                      {person.is_online ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                      ) : null}
                    </Link>

                    <div className="min-w-0">
                      <Link
                        to={`/profile/${person.username}`}
                        className="text-sm font-bold text-slate-900 dark:text-white truncate block hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      >
                        {person.full_name}
                      </Link>
                      <p className="text-xs text-slate-400 truncate">@{person.username}</p>
                      {person.location && <p className="text-[11px] text-slate-500 truncate mt-0.5">{person.location}</p>}
                    </div>
                  </div>

                  {person.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                      {person.bio}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {person.connection_status === 'accepted' ? (
                    <button
                      onClick={() => handleMessage(person.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare size={14} /> Message
                    </button>
                  ) : person.connection_status === 'pending' ? (
                    <span className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium text-center">
                      Requested
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnect(person.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={14} /> Connect
                    </button>
                  )}

                  <Link
                    to={`/profile/${person.username}`}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
