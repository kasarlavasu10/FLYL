import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, Moon, Sun, Mic, Video, Volume2, 
  Shield, Check, User, Bell, Laptop 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, theme, toggleTheme } = useAuth();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [testingMedia, setTestingMedia] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<any>(null);

  const startMediaTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Audio meter analyzer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      setTestingMedia(true);
    } catch (err) {
      alert('Could not access microphone or camera. Please verify device permissions in browser.');
    }
  };

  const stopMediaTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMicLevel(0);
    setTestingMedia(false);
  };

  useEffect(() => {
    return () => {
      stopMediaTest();
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="text-indigo-600" size={24} /> Application Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize your experience, appearance, and test camera & microphone hardware
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance & Sound */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Sun size={18} className="text-amber-500" /> Preferences
          </h3>

          {/* Theme Switcher */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Color Mode</p>
              <p className="text-xs text-slate-400">Currently using {theme} mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={16} className="text-amber-400" /> Light Mode
                </>
              ) : (
                <>
                  <Moon size={16} /> Dark Mode
                </>
              )}
            </button>
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Call & Message Sounds</p>
              <p className="text-xs text-slate-400">Play chime when receiving calls or messages</p>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* Account Snapshot */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Account Username:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">@{user?.username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Registered Email:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Account ID:</span>
              <span className="font-mono text-slate-500">#{user?.id}</span>
            </div>
          </div>
        </div>

        {/* Audio/Video Device Hardware Diagnostic Tester */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Laptop size={18} className="text-indigo-600" /> Device Diagnostics
            </h3>
            {testingMedia ? (
              <button
                onClick={stopMediaTest}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-bold"
              >
                Stop Test
              </button>
            ) : (
              <button
                onClick={startMediaTest}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
              >
                Test Camera & Mic
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Verify your camera preview and microphone volume before starting WebRTC calls.
          </p>

          {/* Camera Preview Monitor */}
          <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {testingMedia ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Video size={24} />
                <span>Camera preview inactive. Click 'Test' above.</span>
              </div>
            )}
            {testingMedia && (
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500/80 backdrop-blur-md rounded text-[10px] text-white font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> Live Camera Active
              </span>
            )}
          </div>

          {/* Microphone Volume Meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                <Mic size={14} className={micLevel > 15 ? 'text-emerald-500' : 'text-slate-400'} /> Microphone Volume Level
              </span>
              <span className="font-mono text-slate-400">{micLevel}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  micLevel > 60 ? 'bg-rose-500' : micLevel > 25 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${micLevel}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
