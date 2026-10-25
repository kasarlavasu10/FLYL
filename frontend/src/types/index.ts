export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  location?: string;
  interests?: string;
  is_online?: number;
  last_seen?: string;
  created_at: string;
  updated_at?: string;
}

export interface Connection {
  id: number;
  requester_id: number;
  recipient_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Conversation {
  id: number;
  is_group: number;
  title?: string;
  updated_at: string;
  partner_id: number;
  partner_username: string;
  partner_name: string;
  partner_avatar?: string;
  partner_is_online: number;
  partner_last_seen: string;
  last_message?: string;
  last_attachment_type?: string;
  last_message_time?: string;
  last_message_sender_id?: number;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'file' | 'audio';
  attachment_name?: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  sender_username: string;
  sender_name: string;
  sender_avatar?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  sender_id: number;
  type: 'message' | 'call_audio' | 'call_video' | 'friend_request' | 'friend_accept';
  title: string;
  body: string;
  data?: string;
  is_read: number;
  created_at: string;
  sender_username: string;
  sender_name: string;
  sender_avatar?: string;
}

export interface CallLog {
  id: number;
  caller_id: number;
  receiver_id: number;
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'cancelled';
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  caller_username: string;
  caller_name: string;
  caller_avatar?: string;
  receiver_username: string;
  receiver_name: string;
  receiver_avatar?: string;
}

export interface BlockedUser {
  block_id: number;
  blocked_at: string;
  user_id: number;
  username: string;
  full_name: string;
  avatar_url?: string;
}

export interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  callId: string | null;
  callType: 'audio' | 'video';
  partner: {
    id: number;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined' | 'failed';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  facingMode: 'user' | 'environment';
  durationSeconds: number;
}
