import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/conversations - list all conversations for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Get all conversations user participates in
    const convs = db.prepare(`
      SELECT c.id, c.is_group, c.title, c.updated_at,
             cp.last_read_message_id,
             u.id as partner_id, u.username as partner_username, u.full_name as partner_name,
             u.avatar_url as partner_avatar, u.is_online as partner_is_online, u.last_seen as partner_last_seen,
             (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message,
             (SELECT m.attachment_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_attachment_type,
             (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message_time,
             (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message_sender_id,
             (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id AND m.id > cp.last_read_message_id AND m.sender_id != ?) as unread_count
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
      JOIN conversation_participants cp_other ON cp_other.conversation_id = c.id AND cp_other.user_id != ?
      JOIN users u ON u.id = cp_other.user_id
      ORDER BY COALESCE(last_message_time, c.updated_at) DESC
    `).all(userId, userId, userId);

    res.json({ conversations: convs });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/conversations/with/:targetUserId - get or create 1-to-1 conversation
router.post('/with/:targetUserId', authenticateToken, (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = parseInt(req.params.targetUserId, 10);

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    // Check if target user exists
    const targetUser = db.prepare('SELECT id, username, full_name, avatar_url, is_online FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if conversation already exists between both users
    const existing = db.prepare(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
      WHERE c.is_group = 0
      LIMIT 1
    `).get(currentUserId, targetUserId);

    if (existing) {
      return res.json({ conversationId: existing.id, partner: targetUser });
    }

    // Create new conversation inside transaction
    const createConvTx = db.transaction(() => {
      const conv = db.prepare('INSERT INTO conversations (is_group) VALUES (0)').run();
      const newConvId = conv.lastInsertRowid;

      db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(newConvId, currentUserId);
      db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(newConvId, targetUserId);

      return newConvId;
    });

    const newId = createConvTx();

    res.status(201).json({ conversationId: newId, partner: targetUser });
  } catch (error) {
    console.error('Error initiating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', authenticateToken, (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    // Check authorization
    const isParticipant = db.prepare(`
      SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `).get(conversationId, userId);

    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to view messages in this conversation' });
    }

    // Partner info
    const partner = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_online, u.last_seen
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = ? AND cp.user_id != ?
      LIMIT 1
    `).get(conversationId, userId);

    const messages = db.prepare(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.attachment_url,
             m.attachment_type, m.attachment_name, m.status, m.created_at,
             u.username as sender_username, u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.id ASC
    `).all(conversationId);

    // Update last_read_message_id for current user
    if (messages.length > 0) {
      const lastMsgId = messages[messages.length - 1].id;
      db.prepare(`
        UPDATE conversation_participants
        SET last_read_message_id = ?
        WHERE conversation_id = ? AND user_id = ?
      `).run(lastMsgId, conversationId, userId);
    }

    res.json({ partner, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/conversations/:id/read - mark conversation as read
router.post('/:id/read', authenticateToken, (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const lastMsg = db.prepare(`
      SELECT id FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1
    `).get(conversationId);

    if (lastMsg) {
      db.prepare(`
        UPDATE conversation_participants
        SET last_read_message_id = ?
        WHERE conversation_id = ? AND user_id = ?
      `).run(lastMsg.id, conversationId, userId);

      // Update message statuses to 'read'
      db.prepare(`
        UPDATE messages
        SET status = 'read'
        WHERE conversation_id = ? AND sender_id != ? AND status != 'read'
      `).run(conversationId, userId);
    }

    res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;
