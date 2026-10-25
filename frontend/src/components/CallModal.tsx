import React, { useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  SwitchCamera, MonitorUp, Minimize2, Maximize2, Volume2, Shield 
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const {
    callState,
    localStream,
    remoteStream,
    isDocked,
    setIsDocked,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleScreenShare,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState.isVideoOff, isDocked]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isDocked]);

  if (!callState.isActive) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. INCOMING CALL MODAL
  if (callState.isIncoming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          {/* Animated decorative pulsing background ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-56 h-56 rounded-full bg-indigo-500 animate-ping"></div>
          </div>

          <div className="relative z-10">
            <div className="relative mx-auto w-28 h-28 mb-6">
              <img
                src={callState.partner?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                alt={callState.partner?.full_name}
                className="w-full h-full rounded-full object-cover ring-4 ring-indigo-500 shadow-xl"
              />
              <span className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                {callState.callType === 'video' ? <Video size={18} /> : <Phone size={18} />}
              </span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {callState.partner?.full_name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Incoming {callState.callType === 'video' ? 'Video' : 'Audio'} Call...
            </p>

            <div className="flex items-center justify-center gap-6 mt-8">
              {/* Decline Button */}
              <button
                onClick={() => rejectCall('Call declined by user')}
                className="flex flex-col items-center gap-2 group"
                title="Decline"
              >
                <div className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110 active:scale-95">
                  <PhoneOff size={28} />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Decline</span>
              </button>

              {/* Accept Button */}
              <button
                onClick={acceptCall}
                className="flex flex-col items-center gap-2 group"
                title="Accept"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110 active:scale-95 animate-bounce">
                  <Phone size={28} />
                </div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-semibold">Accept</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. DOCKED MINI CALL WIDGET (PIP)
  if (isDocked) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-4 w-72 text-white animate-scale-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src={callState.partner?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
              alt={callState.partner?.full_name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500"
            />
            <div>
              <p className="text-sm font-semibold truncate max-w-[110px]">{callState.partner?.full_name}</p>
              <p className="text-xs text-emerald-400 font-mono">
                {callState.status === 'connected' ? formatDuration(callState.durationSeconds) : callState.status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDocked(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              title="Expand"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={endCall}
              className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white"
              title="End Call"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        </div>

        {callState.callType === 'video' && remoteStream && (
          <div className="h-28 rounded-xl overflow-hidden bg-black mb-3">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center justify-around pt-2 border-t border-slate-800">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl text-xs flex items-center justify-center ${
              callState.isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {callState.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          {callState.callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-xl text-xs flex items-center justify-center ${
                callState.isVideoOff ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {callState.isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. FULL ACTIVE CALL INTERFACE
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white">
      {/* Background Media / Video */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {callState.callType === 'video' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          /* Audio Call Visualizer Banner */
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-6">
              <div className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-indigo-500 shadow-2xl relative z-10">
                <img
                  src={callState.partner?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                  alt={callState.partner?.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Audio waves animation */}
              {callState.status === 'connected' && (
                <div className="absolute inset-0 -m-4 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
              )}
            </div>

            <h2 className="text-3xl font-bold">{callState.partner?.full_name}</h2>
            <p className="text-slate-400 text-sm mt-1">@{callState.partner?.username}</p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-800/80 rounded-full mt-4 font-mono text-sm border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${callState.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {callState.status === 'connected' ? formatDuration(callState.durationSeconds) : `${callState.status}...`}
            </div>
          </div>
        )}

        {/* Local Self-Video Thumbnail (Picture in Picture) */}
        {callState.callType === 'video' && (
          <div className="absolute top-6 right-6 w-36 h-48 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-2xl z-20">
            {callState.isVideoOff ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                <VideoOff size={28} />
                <span className="text-xs mt-2">Camera Off</span>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-medium text-white">
              You
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <Shield size={14} /> WebRTC End-to-End
            </span>
            <span className="text-slate-300 text-sm font-mono hidden sm:inline">
              {callState.status === 'connected' ? `Duration: ${formatDuration(callState.durationSeconds)}` : callState.status}
            </span>
          </div>

          <button
            onClick={() => setIsDocked(true)}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-lg"
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 size={20} />
          </button>
        </div>

        {/* Bottom Floating Controls Bar */}
        <div className="absolute bottom-8 inset-x-0 flex items-center justify-center px-4 z-20">
          <div className="flex items-center gap-3 sm:gap-5 bg-slate-900/90 backdrop-blur-xl px-6 py-4 rounded-3xl border border-slate-800 shadow-2xl">
            {/* Mute Mic Button */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl transition duration-200 ${
                callState.isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={callState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {callState.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Video On/Off Button */}
            {callState.callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-2xl transition duration-200 ${
                  callState.isVideoOff
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={callState.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {callState.isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            {/* Switch Camera (Mobile) */}
            {callState.callType === 'video' && (
              <button
                onClick={switchCamera}
                className="p-3.5 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition duration-200 hidden sm:block"
                title="Switch Camera (Front / Rear)"
              >
                <SwitchCamera size={22} />
              </button>
            )}

            {/* Screen Share */}
            {callState.callType === 'video' && (
              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-2xl transition duration-200 ${
                  callState.isScreenSharing
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={callState.isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
              >
                <MonitorUp size={22} />
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="p-3.5 sm:px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition duration-200 hover:scale-105 active:scale-95"
              title="End Call"
            >
              <PhoneOff size={22} />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
