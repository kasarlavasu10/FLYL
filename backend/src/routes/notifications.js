import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = db.prepare(`
      SELECT n.id, n.type, n.title, n.body, n.data, n.is_read, n.created_at,
             u.id as sender_id, u.username as sender_username, u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM notifications n
      JOIN users u ON u.id = n.sender_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 30
    `).all(userId);

    const unreadCount = db.prepare(`
      SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(userId).count;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticateToken, (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notifId, userId);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
