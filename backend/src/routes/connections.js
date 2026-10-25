import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/connections/friends
router.get('/friends', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const friends = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.location, u.is_online, u.last_seen,
             c.id as connection_id, c.created_at as connected_since
      FROM connections c
      JOIN users u ON (u.id = CASE WHEN c.requester_id = ? THEN c.recipient_id ELSE c.requester_id END)
      WHERE (c.requester_id = ? OR c.recipient_id = ?)
        AND c.status = 'accepted'
      ORDER BY u.is_online DESC, u.full_name ASC
    `).all(userId, userId, userId);

    res.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// GET /api/connections/pending
router.get('/pending', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Incoming requests (requiring user's action)
    const incoming = db.prepare(`
      SELECT c.id as request_id, c.created_at, u.id as user_id, u.username, u.full_name, u.avatar_url, u.bio, u.is_online
      FROM connections c
      JOIN users u ON u.id = c.requester_id
      WHERE c.recipient_id = ? AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `).all(userId);

    // Outgoing requests
    const outgoing = db.prepare(`
      SELECT c.id as request_id, c.created_at, u.id as user_id, u.username, u.full_name, u.avatar_url, u.bio, u.is_online
      FROM connections c
      JOIN users u ON u.id = c.recipient_id
      WHERE c.requester_id = ? AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `).all(userId);

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error('Error fetching pending connections:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// POST /api/connections/request/:recipientId
router.post('/request/:recipientId', authenticateToken, (req, res) => {
  try {
    const requesterId = req.user.id;
    const recipientId = parseInt(req.params.recipientId, 10);

    if (requesterId === recipientId) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    // Check if target user exists
    const recipient = db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Check existing connection or request
    const existing = db.prepare(`
      SELECT id, status FROM connections
      WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)
    `).get(requesterId, recipientId, recipientId, requesterId);

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already connected with this user' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Connection request is already pending' });
      }
    }

    const result = db.prepare(`
      INSERT INTO connections (requester_id, recipient_id, status)
      VALUES (?, ?, 'pending')
    `).run(requesterId, recipientId);

    // Create notification
    db.prepare(`
      INSERT INTO notifications (user_id, sender_id, type, title, body, data)
      VALUES (?, ?, 'friend_request', 'New Connection Request', ?, ?)
    `).run(
      recipientId,
      requesterId,
      `${req.user.full_name} sent you a connection request.`,
      JSON.stringify({ requestId: result.lastInsertRowid, requesterId })
    );

    res.status(201).json({
      message: 'Connection request sent successfully',
      requestId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// POST /api/connections/accept/:requestId
router.post('/accept/:requestId', authenticateToken, (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    const userId = req.user.id;

    const request = db.prepare(`
      SELECT * FROM connections WHERE id = ? AND recipient_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    db.prepare(`
      UPDATE connections SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(requestId);

    // Create accepted notification for requester
    db.prepare(`
      INSERT INTO notifications (user_id, sender_id, type, title, body, data)
      VALUES (?, ?, 'friend_accept', 'Connection Request Accepted', ?, ?)
    `).run(
      request.requester_id,
      userId,
      `${req.user.full_name} accepted your connection request.`,
      JSON.stringify({ friendId: userId })
    );

    res.json({ message: 'Connection request accepted' });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ error: 'Failed to accept connection request' });
  }
});

// POST /api/connections/reject/:requestId
router.post('/reject/:requestId', authenticateToken, (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    const userId = req.user.id;

    const result = db.prepare(`
      DELETE FROM connections WHERE id = ? AND (recipient_id = ? OR requester_id = ?)
    `).run(requestId, userId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: 'Connection request rejected / removed' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to remove connection request' });
  }
});

// DELETE /api/connections/:connectionId
router.delete('/:connectionId', authenticateToken, (req, res) => {
  try {
    const connectionId = parseInt(req.params.connectionId, 10);
    const userId = req.user.id;

    const result = db.prepare(`
      DELETE FROM connections WHERE id = ? AND (recipient_id = ? OR requester_id = ?)
    `).run(connectionId, userId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({ message: 'Connection removed successfully' });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

export default router;
