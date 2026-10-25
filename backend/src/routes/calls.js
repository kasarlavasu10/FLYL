import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/calls/history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const calls = db.prepare(`
      SELECT ch.id, ch.caller_id, ch.receiver_id, ch.type, ch.status, ch.duration_seconds, ch.started_at, ch.ended_at,
             caller.username as caller_username, caller.full_name as caller_name, caller.avatar_url as caller_avatar,
             receiver.username as receiver_username, receiver.full_name as receiver_name, receiver.avatar_url as receiver_avatar
      FROM call_history ch
      JOIN users caller ON caller.id = ch.caller_id
      JOIN users receiver ON receiver.id = ch.receiver_id
      WHERE ch.caller_id = ? OR ch.receiver_id = ?
      ORDER BY ch.started_at DESC
      LIMIT 50
    `).all(userId, userId);

    res.json({ calls });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// POST /api/calls/log
router.post('/log', authenticateToken, (req, res) => {
  try {
    const { receiver_id, type, status, duration_seconds } = req.body;
    const callerId = req.user.id;

    if (!receiver_id || !type || !status) {
      return res.status(400).json({ error: 'receiver_id, type, and status are required' });
    }

    const duration = parseInt(duration_seconds, 10) || 0;
    const endedAt = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO call_history (caller_id, receiver_id, type, status, duration_seconds, ended_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(callerId, receiver_id, type, status, duration, endedAt);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Call logged' });
  } catch (error) {
    console.error('Error logging call:', error);
    res.status(500).json({ error: 'Failed to log call' });
  }
});

export default router;
