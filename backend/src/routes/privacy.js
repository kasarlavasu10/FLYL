import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/privacy/blocked
router.get('/blocked', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const blockedUsers = db.prepare(`
      SELECT b.id as block_id, b.created_at as blocked_at,
             u.id as user_id, u.username, u.full_name, u.avatar_url
      FROM blocks b
      JOIN users u ON u.id = b.blocked_id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    res.json({ blockedUsers });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// POST /api/privacy/block/:targetUserId
router.post('/block/:targetUserId', authenticateToken, (req, res) => {
  try {
    const blockerId = req.user.id;
    const targetUserId = parseInt(req.params.targetUserId, 10);

    if (blockerId === targetUserId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    // Insert block record ignore if already exists
    db.prepare(`
      INSERT OR IGNORE INTO blocks (blocker_id, blocked_id)
      VALUES (?, ?)
    `).run(blockerId, targetUserId);

    // Remove any existing friend connection
    db.prepare(`
      DELETE FROM connections 
      WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)
    `).run(blockerId, targetUserId, targetUserId, blockerId);

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// POST /api/privacy/unblock/:targetUserId
router.post('/unblock/:targetUserId', authenticateToken, (req, res) => {
  try {
    const blockerId = req.user.id;
    const targetUserId = parseInt(req.params.targetUserId, 10);

    const result = db.prepare(`
      DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?
    `).run(blockerId, targetUserId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User is not in your blocked list' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// POST /api/privacy/report
router.post('/report', authenticateToken, (req, res) => {
  try {
    const reporterId = req.user.id;
    const { reported_id, reason, details } = req.body;

    if (!reported_id || !reason) {
      return res.status(400).json({ error: 'reported_id and reason are required' });
    }

    db.prepare(`
      INSERT INTO reports (reporter_id, reported_id, reason, details)
      VALUES (?, ?, ?, ?)
    `).run(reporterId, reported_id, reason, details || '');

    res.status(201).json({ message: 'Report submitted successfully. Our team will review it.' });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
