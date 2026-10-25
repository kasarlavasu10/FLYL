import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// POST /api/messages - send message with optional attachment
router.post('/', authenticateToken, upload.single('attachment'), (req, res) => {
  try {
    const { conversation_id, content } = req.body;
    const senderId = req.user.id;

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    const convId = parseInt(conversation_id, 10);

    // Verify user is in conversation
    const isParticipant = db.prepare(`
      SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `).get(convId, senderId);

    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    // Check if blocked by or blocking the partner
    const partner = db.prepare(`
      SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ? LIMIT 1
    `).get(convId, senderId);

    if (partner) {
      const blocked = db.prepare(`
        SELECT id FROM blocks 
        WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      `).get(senderId, partner.user_id, partner.user_id, senderId);

      if (blocked) {
        return res.status(403).json({ error: 'Cannot send message to this user due to privacy settings' });
      }
    }

    let attachmentUrl = null;
    let attachmentType = null;
    let attachmentName = null;

    if (req.file) {
      attachmentUrl = `/uploads/attachments/${req.file.filename}`;
      attachmentName = req.file.originalname;
      if (req.file.mimetype.startsWith('image/')) {
        attachmentType = 'image';
      } else if (req.file.mimetype.startsWith('audio/')) {
        attachmentType = 'audio';
      } else {
        attachmentType = 'file';
      }
    }

    if (!content && !attachmentUrl) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const insertMsgTx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO messages (conversation_id, sender_id, content, attachment_url, attachment_type, attachment_name, status)
        VALUES (?, ?, ?, ?, ?, ?, 'sent')
      `).run(convId, senderId, content || '', attachmentUrl, attachmentType, attachmentName);

      const msgId = result.lastInsertRowid;

      // Update conversation updated_at
      db.prepare(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(convId);

      // Update sender's last_read_message_id
      db.prepare(`
        UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?
      `).run(msgId, convId, senderId);

      // Create notification for partner
      if (partner) {
        db.prepare(`
          INSERT INTO notifications (user_id, sender_id, type, title, body, data)
          VALUES (?, ?, 'message', 'New Message', ?, ?)
        `).run(
          partner.user_id,
          senderId,
          `${req.user.full_name}: ${content ? (content.length > 50 ? content.slice(0, 47) + '...' : content) : 'Sent an attachment'}`,
          JSON.stringify({ conversationId: convId, messageId: msgId })
        );
      }

      return msgId;
    });

    const newMsgId = insertMsgTx();

    const createdMsg = db.prepare(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.attachment_url,
             m.attachment_type, m.attachment_name, m.status, m.created_at,
             u.username as sender_username, u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?
    `).get(newMsgId);

    // Direct server-side Socket.IO broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${convId}`).emit('chat:new_message', createdMsg);

      const participants = db.prepare(`
        SELECT user_id FROM conversation_participants WHERE conversation_id = ?
      `).all(convId);

      for (const p of participants) {
        io.to(`user_${p.user_id}`).emit('chat:new_message', createdMsg);
      }
    }

    res.status(201).json({ message: createdMsg });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
