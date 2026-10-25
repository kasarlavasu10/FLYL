import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, MessageSquare, Video, Phone, Users, Shield, 
  Zap, Globe, ArrowRight, CheckCircle2, Lock 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles size={22} />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
            ConnectHub
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-full text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition duration-200 hover:scale-105"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-500/20 via-cyan-500/15 to-transparent blur-3xl pointer-events-none rounded-full"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
            <Zap size={14} className="text-indigo-500 animate-bounce" /> Next-Generation Social Communication Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Connect, Chat & Call <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
              In Real Time Anywhere
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Experience ultra-low latency peer-to-peer WebRTC audio and video calling, instant messaging with rich media, and intuitive social profiles built for meaningful conversations.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition duration-200 hover:scale-105 flex items-center justify-center gap-2"
            >
              Join ConnectHub Free <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-base transition duration-200"
            >
              Explore Live Demo
            </Link>
          </div>

          {/* Social Proof / Trust */}
          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> WebRTC P2P Encryption
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> Zero Installation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> Instant Real-Time Sync
            </span>
          </div>

          {/* Interactive UI Mockup Preview */}
          <div className="mt-16 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900/90 shadow-2xl p-4 sm:p-6 max-w-5xl mx-auto backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Feature Box 1 */}
              <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Video size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">HD Video & Audio Calls</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Direct peer-to-peer WebRTC connections with camera toggling, front/rear switching, screen share, and crystal-clear audio.
                </p>
              </div>

              {/* Feature Box 2 */}
              <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">Real-Time Chat</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Socket.IO powered messaging with typing indicators, delivery checkmarks, image attachments, and unread badges.
                </p>
              </div>

              {/* Feature Box 3 */}
              <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Users size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">Social Profiles & Graph</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Customizable avatars, cover photos, bio, mutual connections, search & discovery, and comprehensive privacy controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            <span className="font-bold text-slate-700 dark:text-slate-200">ConnectHub</span> &copy; 2026. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-indigo-600 transition">Sign In</Link>
            <Link to="/register" className="hover:text-indigo-600 transition">Register</Link>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Lock size={12} /> Secure & Private
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
