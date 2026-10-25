import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { CallState, User } from '../types';
import { soundEffects } from '../utils/audio';
import { api } from '../services/api';

interface CallContextType {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isDocked: boolean;
  setIsDocked: (docked: boolean) => void;
  startCall: (partner: { id: number; username: string; full_name: string; avatar_url?: string }, type: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
}

const initialCallState: CallState = {
  isActive: false,
  isIncoming: false,
  callId: null,
  callType: 'audio',
  partner: null,
  status: 'connecting',
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  facingMode: 'user',
  durationSeconds: 0,
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState<CallState>(initialCallState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isDocked, setIsDocked] = useState<boolean>(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  // Clean up WebRTC peer connection & media streams
  const cleanupCall = useCallback(() => {
    soundEffects.stopRingtone();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    pendingCandidates.current = [];
  }, []);

  // Initialize RTCPeerConnection
  const createPeerConnection = useCallback((targetUserId: number, currentCallId: string) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          callId: currentCallId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track received:', event.streams[0]);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('ICE Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState((prev) => ({ ...prev, status: 'connected' }));
        // Start duration counter if not already running
        if (!timerRef.current) {
          timerRef.current = setInterval(() => {
            setCallState((prev) => ({ ...prev, durationSeconds: prev.durationSeconds + 1 }));
          }, 1000);
        }
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setCallState((prev) => ({ ...prev, status: 'failed' }));
      }
    };

    return pc;
  }, [socket]);

  // Request user media
  const getMedia = async (type: 'audio' | 'video', facingMode: 'user' | 'environment' = 'user') => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing camera/microphone:', err);
      // Fallback to audio only if video request failed
      if (type === 'video') {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setCallState((prev) => ({ ...prev, isVideoOff: true }));
          return audioStream;
        } catch (audioErr) {
          alert('Unable to access microphone or camera. Please check browser permissions.');
          throw audioErr;
        }
      }
      alert('Unable to access microphone. Please check browser permissions.');
      throw err;
    }
  };

  // Start outgoing call
  const startCall = async (
    partner: { id: number; username: string; full_name: string; avatar_url?: string },
    type: 'audio' | 'video'
  ) => {
    if (!socket) return;
    cleanupCall();

    setCallState({
      isActive: true,
      isIncoming: false,
      callId: null,
      callType: type,
      partner,
      status: 'ringing',
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      facingMode: 'user',
      durationSeconds: 0,
    });

    try {
      await getMedia(type, 'user');
      socket.emit('call:initiate', { receiverId: partner.id, callType: type });
    } catch (err) {
      cleanupCall();
      setCallState(initialCallState);
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!socket || !callState.callId || !callState.partner) return;
    soundEffects.stopRingtone();

    try {
      const stream = await getMedia(callState.callType, callState.facingMode);
      const pc = createPeerConnection(callState.partner.id, callState.callId);

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      socket.emit('call:accept', { callId: callState.callId });

      setCallState((prev) => ({
        ...prev,
        isIncoming: false,
        status: 'connecting',
      }));
    } catch (err) {
      rejectCall('Microphone or Camera permission denied');
    }
  };

  // Reject incoming call
  const rejectCall = (reason = 'Call declined') => {
    soundEffects.stopRingtone();
    if (socket && callState.callId) {
      socket.emit('call:reject', { callId: callState.callId, reason });
    }
    cleanupCall();
    setCallState(initialCallState);
  };

  // End active call
  const endCall = () => {
    soundEffects.playCallEndSound();
    if (socket && callState.callId) {
      socket.emit('call:end', { callId: callState.callId });
    }
    cleanupCall();
    setCallState(initialCallState);
  };

  // Toggle microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !callState.isMuted;
        audioTracks[0].enabled = !nextState;
        setCallState((prev) => ({ ...prev, isMuted: nextState }));

        if (socket && callState.partner) {
          socket.emit('call:toggle-media', {
            targetUserId: callState.partner.id,
            kind: 'audio',
            enabled: !nextState,
          });
        }
      }
    }
  };

  // Toggle camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !callState.isVideoOff;
        videoTracks[0].enabled = !nextState;
        setCallState((prev) => ({ ...prev, isVideoOff: nextState }));

        if (socket && callState.partner) {
          socket.emit('call:toggle-media', {
            targetUserId: callState.partner.id,
            kind: 'video',
            enabled: !nextState,
          });
        }
      }
    }
  };

  // Switch camera (front/rear) on mobile devices
  const switchCamera = async () => {
    if (callState.callType !== 'video' || !localStreamRef.current) return;
    const newFacingMode = callState.facingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }

      localStreamRef.current.addTrack(newVideoTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setCallState((prev) => ({ ...prev, facingMode: newFacingMode }));
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  };

  // Screen sharing
  const toggleScreenShare = async () => {
    if (!callState.isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setCallState((prev) => ({ ...prev, isScreenSharing: true }));
      } catch (err) {
        console.error('Error starting screen share:', err);
      }
    } else {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: callState.facingMode },
        });
        const cameraTrack = cameraStream.getVideoTracks()[0];

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(cameraTrack);
          }
        }

        setCallState((prev) => ({ ...prev, isScreenSharing: false }));
      } catch (err) {
        console.error('Error restoring camera after screen share:', err);
      }
    }
  };

  // Socket.IO event listeners for call signaling
  useEffect(() => {
    if (!socket) return;

    // Outgoing call is ringing on other side
    socket.on('call:ringing', ({ callId }) => {
      setCallState((prev) => ({ ...prev, callId, status: 'ringing' }));
    });

    // Incoming call received
    socket.on('call:incoming', ({ callId, caller, callType }) => {
      soundEffects.startRingtone();
      setCallState({
        isActive: true,
        isIncoming: true,
        callId,
        callType,
        partner: caller,
        status: 'ringing',
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        facingMode: 'user',
        durationSeconds: 0,
      });
    });

    // Receiver accepted the call -> Caller initiates WebRTC offer
    socket.on('call:accepted', async ({ callId, receiver }) => {
      setCallState((prev) => ({
        ...prev,
        callId,
        partner: receiver,
        status: 'connecting',
      }));

      const pc = createPeerConnection(receiver.id, callId);

      // Add local stream tracks to PC
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Create offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', {
          callId,
          targetUserId: receiver.id,
          sdp: offer,
        });
      } catch (err) {
        console.error('Error creating SDP offer:', err);
      }
    });

    // Receiver gets SDP offer -> sets remote description & sends answer
    socket.on('call:offer', async ({ callId, senderId, sdp }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        // Flush any queued candidates
        while (pendingCandidates.current.length) {
          const candidate = pendingCandidates.current.shift();
          if (candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);

        socket.emit('call:answer', {
          callId,
          targetUserId: senderId,
          sdp: answer,
        });
      } catch (err) {
        console.error('Error handling SDP offer:', err);
      }
    });

    // Caller gets SDP answer -> sets remote description
    socket.on('call:answer', async ({ sdp }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        while (pendingCandidates.current.length) {
          const candidate = pendingCandidates.current.shift();
          if (candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error setting remote answer:', err);
      }
    });

    // Received ICE candidate
    socket.on('call:ice-candidate', async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    // Call ended by peer
    socket.on('call:ended', () => {
      soundEffects.playCallEndSound();
      cleanupCall();
      setCallState(initialCallState);
    });

    // Call rejected by peer
    socket.on('call:rejected', ({ reason }) => {
      soundEffects.stopRingtone();
      alert(`Call was declined: ${reason}`);
      cleanupCall();
      setCallState(initialCallState);
    });

    // Call failed (e.g., user offline)
    socket.on('call:failed', ({ reason }) => {
      soundEffects.stopRingtone();
      alert(reason);
      cleanupCall();
      setCallState(initialCallState);
    });

    return () => {
      socket.off('call:ringing');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:offer');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
      socket.off('call:ended');
      socket.off('call:rejected');
      socket.off('call:failed');
    };
  }, [socket, createPeerConnection, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        localStream,
        remoteStream,
        isDocked,
        setIsDocked,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera,
        toggleScreenShare,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
