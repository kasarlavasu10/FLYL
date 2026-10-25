import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'connecthub_super_secret_jwt_key_2026_secure';

// Map of userId -> Set of socketIds (to support multiple tabs/devices)
const onlineUsers = new Map();

// Map of active calls: callId -> { callerId, receiverId, callType, startTime }
const activeCalls = new Map();

export function setupSocketIO(io) {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Invalid token'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRoom = `user_${userId}`;

    socket.join(userRoom);

    // Track online state
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // Set online in DB and notify
      db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
      io.emit('user:presence', { userId, is_online: 1 });
    }
    onlineUsers.get(userId).add(socket.id);

    console.log(`User ${socket.user.username} (ID: ${userId}) connected on socket ${socket.id}`);

    // ==========================================
    // CHAT & CONVERSATION EVENTS
    // ==========================================

    socket.on('conversation:join', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      socket.to(`conv_${conversationId}`).emit('chat:user_typing', {
        conversationId,
        userId,
        username: socket.user.username,
        isTyping
      });
    });

    socket.on('chat:send_message', (message) => {
      const convRoom = `conv_${message.conversation_id}`;
      // Broadcast message to room and to all participants' rooms
      io.to(convRoom).emit('chat:new_message', message);

      const participants = db.prepare(`
        SELECT user_id FROM conversation_participants 
        WHERE conversation_id = ?
      `).all(message.conversation_id);

      for (const p of participants) {
        io.to(`user_${p.user_id}`).emit('chat:new_message', message);
      }

      // Also deliver direct notification to partner's user room
      const partner = db.prepare(`
        SELECT user_id FROM conversation_participants 
        WHERE conversation_id = ? AND user_id != ? LIMIT 1
      `).get(message.conversation_id, userId);

      if (partner) {
        io.to(`user_${partner.user_id}`).emit('notification:new', {
          type: 'message',
          title: `New message from ${message.sender_name}`,
          body: message.content || 'Sent an attachment',
          conversationId: message.conversation_id,
          senderId: userId
        });
      }
    });

    socket.on('chat:mark_read', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('chat:messages_read', {
        conversationId,
        readBy: userId
      });
    });

    // ==========================================
    // WEBRTC CALL SIGNALING EVENTS
    // ==========================================

    // Caller initiates call
    socket.on('call:initiate', ({ receiverId, callType }) => {
      const targetUserId = parseInt(receiverId, 10);
      const isOnline = onlineUsers.has(targetUserId) && onlineUsers.get(targetUserId).size > 0;

      const callerUser = db.prepare('SELECT id, username, full_name, avatar_url FROM users WHERE id = ?').get(userId);

      if (!isOnline) {
        // Record missed call in DB
        db.prepare(`
          INSERT INTO call_history (caller_id, receiver_id, type, status, duration_seconds)
          VALUES (?, ?, ?, 'missed', 0)
        `).run(userId, targetUserId, callType);

        socket.emit('call:failed', { reason: 'User is currently offline' });
        return;
      }

      const callId = `call_${userId}_${targetUserId}_${Date.now()}`;
      activeCalls.set(callId, {
        callId,
        callerId: userId,
        receiverId: targetUserId,
        callType,
        startTime: null
      });

      // Signal target user
      io.to(`user_${targetUserId}`).emit('call:incoming', {
        callId,
        caller: callerUser,
        callType
      });

      socket.emit('call:ringing', { callId, receiverId: targetUserId });
    });

    // Receiver accepts call
    socket.on('call:accept', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) {
        socket.emit('call:error', { message: 'Call no longer active' });
        return;
      }

      call.startTime = Date.now();
      const receiverUser = db.prepare('SELECT id, username, full_name, avatar_url FROM users WHERE id = ?').get(userId);

      io.to(`user_${call.callerId}`).emit('call:accepted', {
        callId,
        receiver: receiverUser
      });
    });

    // Receiver rejects call
    socket.on('call:reject', ({ callId, reason }) => {
      const call = activeCalls.get(callId);
      if (call) {
        // Log declined call
        db.prepare(`
          INSERT INTO call_history (caller_id, receiver_id, type, status, duration_seconds)
          VALUES (?, ?, ?, 'declined', 0)
        `).run(call.callerId, call.receiverId, call.callType);

        io.to(`user_${call.callerId}`).emit('call:rejected', {
          callId,
          reason: reason || 'Call declined'
        });
        activeCalls.delete(callId);
      }
    });

    // WebRTC SDP Offer relay
    socket.on('call:offer', ({ callId, targetUserId, sdp }) => {
      io.to(`user_${targetUserId}`).emit('call:offer', {
        callId,
        senderId: userId,
        sdp
      });
    });

    // WebRTC SDP Answer relay
    socket.on('call:answer', ({ callId, targetUserId, sdp }) => {
      io.to(`user_${targetUserId}`).emit('call:answer', {
        callId,
        senderId: userId,
        sdp
      });
    });

    // WebRTC ICE Candidate relay
    socket.on('call:ice-candidate', ({ callId, targetUserId, candidate }) => {
      io.to(`user_${targetUserId}`).emit('call:ice-candidate', {
        callId,
        senderId: userId,
        candidate
      });
    });

    // Toggle camera / microphone state notification to peer
    socket.on('call:toggle-media', ({ targetUserId, kind, enabled }) => {
      io.to(`user_${targetUserId}`).emit('call:peer-media-toggle', {
        senderId: userId,
        kind,
        enabled
      });
    });

    // End call
    socket.on('call:end', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (call) {
        const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
        const durationSeconds = call.startTime ? Math.round((Date.now() - call.startTime) / 1000) : 0;
        const status = call.startTime ? 'completed' : 'cancelled';

        // Log to DB
        db.prepare(`
          INSERT INTO call_history (caller_id, receiver_id, type, status, duration_seconds, ended_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(call.callerId, call.receiverId, call.callType, status, durationSeconds);

        io.to(`user_${otherUserId}`).emit('call:ended', {
          callId,
          durationSeconds
        });

        activeCalls.delete(callId);
      }
    });

    // ==========================================
    // DISCONNECTION
    // ==========================================
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (user ${userId})`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          db.prepare('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
          io.emit('user:presence', { userId, is_online: 0 });
        }
      }

      // Clean up any active calls where this user was a participant
      for (const [callId, call] of activeCalls.entries()) {
        if (call.callerId === userId || call.receiverId === userId) {
          const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
          const durationSeconds = call.startTime ? Math.round((Date.now() - call.startTime) / 1000) : 0;

          db.prepare(`
            INSERT INTO call_history (caller_id, receiver_id, type, status, duration_seconds, ended_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(call.callerId, call.receiverId, call.callType, call.startTime ? 'completed' : 'missed', durationSeconds);

          io.to(`user_${otherUserId}`).emit('call:ended', {
            callId,
            durationSeconds,
            reason: 'User disconnected'
          });

          activeCalls.delete(callId);
        }
      }
    });
  });
}
