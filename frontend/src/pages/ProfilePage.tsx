import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { api } from '../services/api';
import { User } from '../types';
import { 
  MapPin, Calendar, Tag, MessageSquare, Phone, Video, 
  UserPlus, UserCheck, ShieldAlert, Flag, Check, Edit3, ArrowLeft, Ban 
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { startCall } = useCall();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(null);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('none'); // 'none', 'pending', 'accepted'
  const [isRequester, setIsRequester] = useState<boolean>(false);
  const [isBlockedByYou, setIsBlockedByYou] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or Scam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase();

  const loadProfile = async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const res = await api.getProfile(username);
      setProfile(res.profile);
      setFriendCount(res.friendCount);
      setMutualFriends(res.mutualFriends || []);
      setConnectionStatus(res.connectionStatus);
      setIsRequester(res.isRequester);
      setIsBlockedByYou(res.isBlockedByYou);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [username]);

  const handleSendRequest = async () => {
    if (!profile) return;
    try {
      await api.sendConnectionRequest(profile.id);
      setConnectionStatus('pending');
      setIsRequester(true);
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  const handleStartChat = async () => {
    if (!profile) return;
    try {
      const res = await api.getOrCreateConversation(profile.id);
      navigate(`/chat?c=${res.conversationId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start chat');
    }
  };

  const handleBlockUser = async () => {
    if (!profile || !confirm(`Are you sure you want to block ${profile.full_name}?`)) return;
    try {
      await api.blockUser(profile.id);
      setIsBlockedByYou(true);
      setConnectionStatus('none');
      alert('User has been blocked');
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    if (!profile) return;
    try {
      await api.unblockUser(profile.id);
      setIsBlockedByYou(false);
      alert('User has been unblocked');
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await api.reportUser({
        reported_id: profile.id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportModalOpen(false);
        setReportDetails('');
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">User Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">The user profile you are looking for does not exist.</p>
        <Link to="/" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          Go Home
        </Link>
      </div>
    );
  }

  const interestsList = profile.interests
    ? profile.interests.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* 1. Cover Photo & Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Cover Photo */}
        <div className="h-48 sm:h-64 w-full bg-slate-800 relative">
          <img
            src={profile.cover_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200'}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>

        {/* Profile Info Row */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-5">
            {/* Avatar & Online status */}
            <div className="relative">
              <img
                src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                alt={profile.full_name}
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-2xl bg-white"
              />
              <span
                className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-3 border-white dark:border-slate-900 ${
                  profile.is_online ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
                title={profile.is_online ? 'Online' : 'Offline'}
              ></span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
              {isOwnProfile ? (
                <Link
                  to="/edit-profile"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  <Edit3 size={15} /> Edit Profile
                </Link>
              ) : (
                <>
                  {/* Connection Button */}
                  {connectionStatus === 'accepted' ? (
                    <span className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                      <UserCheck size={16} /> Friends
                    </span>
                  ) : connectionStatus === 'pending' ? (
                    <span className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                      {isRequester ? 'Request Sent' : 'Request Pending'}
                    </span>
                  ) : (
                    <button
                      onClick={handleSendRequest}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <UserPlus size={16} /> Add Friend
                    </button>
                  )}

                  {/* Message Button */}
                  <button
                    onClick={handleStartChat}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    <MessageSquare size={16} /> Message
                  </button>

                  {/* Audio Call */}
                  <button
                    onClick={() => startCall(profile, 'audio')}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
                    title="Audio Call"
                  >
                    <Phone size={16} />
                  </button>

                  {/* Video Call */}
                  <button
                    onClick={() => startCall(profile, 'video')}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
                    title="Video Call"
                  >
                    <Video size={16} />
                  </button>

                  {/* Block / Report Dropdown */}
                  <button
                    onClick={() => setReportModalOpen(true)}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Report or Block"
                  >
                    <Flag size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name & Bio Details */}
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{profile.full_name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">@{profile.username}</p>

            {profile.bio && (
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Meta Row: Location, Friends Count, Join Date */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-indigo-500" /> {profile.location}
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <Calendar size={15} className="text-cyan-500" /> Joined{' '}
                {new Date(profile.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}
              </span>

              <span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">{friendCount}</strong> Connections
              </span>
            </div>

            {/* Interests Chips */}
            {interestsList.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2">
                  <Tag size={13} /> Interests & Hobbies
                </div>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Mutual Friends Section */}
      {!isOwnProfile && mutualFriends.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
            Mutual Connections ({mutualFriends.length})
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            {mutualFriends.map((mf) => (
              <Link
                key={mf.id}
                to={`/profile/${mf.username}`}
                className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <img
                  src={mf.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                  alt={mf.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{mf.full_name}</p>
                  <p className="text-[10px] text-slate-400">@{mf.username}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Report & Block Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={20} /> User Safety & Moderation
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit a report about @{profile.username} or block them from interacting with you.
            </p>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl text-xs font-semibold text-center flex items-center justify-center gap-2">
                <Check size={18} /> Report submitted for moderation review.
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Reason for report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="Spam or Scam">Spam or Scam</option>
                    <option value="Harassment or Bullying">Harassment or Bullying</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Impersonation">Impersonation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Details / Additional context
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about the issue..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {isBlockedByYou ? (
                    <button
                      type="button"
                      onClick={handleUnblockUser}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Unblock User
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBlockUser}
                      className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Ban size={14} /> Block User
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
