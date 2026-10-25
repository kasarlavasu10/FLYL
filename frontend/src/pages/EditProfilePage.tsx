import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Camera, Image, ArrowLeft, Check, AlertCircle } from 'lucide-react';

export const EditProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [interests, setInterests] = useState(user?.interests || '');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [coverPreview, setCoverPreview] = useState<string | null>(user?.cover_url || null);

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const res = await api.uploadAvatar(formData);
        setAvatarPreview(res.avatar_url);
        updateUser({ avatar_url: res.avatar_url });
      } catch (err: any) {
        setError(err.message || 'Failed to upload avatar');
      }
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('cover', file);

      try {
        const res = await api.uploadCover(formData);
        setCoverPreview(res.cover_url);
        updateUser({ cover_url: res.cover_url });
      } catch (err: any) {
        setError(err.message || 'Failed to upload cover');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.updateProfile({
        full_name: fullName,
        bio,
        location,
        interests,
      });

      updateUser(res.user);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/profile/${user?.username}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back to profile
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <Check size={16} className="shrink-0" />
            <span>Profile successfully updated! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Cover Upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Cover Photo
              </label>
              <div className="relative h-36 rounded-2xl overflow-hidden bg-slate-800 group">
                <img
                  src={coverPreview || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200'}
                  alt="Cover Preview"
                  className="w-full h-full object-cover"
                />
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition"
                >
                  <span className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2">
                    <Image size={16} /> Change Cover Photo
                  </span>
                </div>
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverFile}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Avatar Upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Profile Avatar
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 group">
                  <img
                    src={avatarPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                    alt="Avatar Preview"
                    className="w-full h-full object-cover"
                  />
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition text-white"
                  >
                    <Camera size={20} />
                  </div>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarFile}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Upload New Avatar
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1">Recommended square format, JPG or PNG up to 10MB.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Bio / About Me
              </label>
              <textarea
                rows={3}
                placeholder="Tell others about your work, hobbies, and background..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Interests & Skills (comma-separated)
              </label>
              <input
                type="text"
                placeholder="React, Design, WebRTC, Music, Hiking"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
