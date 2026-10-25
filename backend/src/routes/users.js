import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET /api/users/suggestions
router.get('/suggestions', authenticateToken, (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Users not already connected, not pending, and not blocked
    const suggestions = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.location, u.is_online
      FROM users u
      WHERE u.id != ?
        AND u.id NOT IN (
          SELECT recipient_id FROM connections WHERE requester_id = ?
          UNION
          SELECT requester_id FROM connections WHERE recipient_id = ?
        )
        AND u.id NOT IN (
          SELECT blocked_id FROM blocks WHERE blocker_id = ?
          UNION
          SELECT blocker_id FROM blocks WHERE blocked_id = ?
        )
      LIMIT 10
    `).all(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId);

    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// GET /api/users/search?q=query
router.get('/search', authenticateToken, (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    const currentUserId = req.user.id;

    if (!query) {
      return res.json({ users: [] });
    }

    const users = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.location, u.is_online, u.created_at,
        (SELECT status FROM connections 
         WHERE (requester_id = ? AND recipient_id = u.id) 
            OR (requester_id = u.id AND recipient_id = ?)
         LIMIT 1) as connection_status,
        (SELECT requester_id FROM connections 
         WHERE (requester_id = ? AND recipient_id = u.id) 
            OR (requester_id = u.id AND recipient_id = ?)
         LIMIT 1) as connection_requester_id
      FROM users u
      WHERE u.id != ?
        AND (u.username LIKE ? OR u.full_name LIKE ? OR u.interests LIKE ?)
        AND u.id NOT IN (
          SELECT blocked_id FROM blocks WHERE blocker_id = ?
          UNION
          SELECT blocker_id FROM blocks WHERE blocked_id = ?
        )
      LIMIT 20
    `).all(
      currentUserId, currentUserId,
      currentUserId, currentUserId,
      currentUserId,
      `%${query}%`, `%${query}%`, `%${query}%`,
      currentUserId, currentUserId
    );

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/users/profile/:username
router.get('/profile/:username', authenticateToken, (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user.id;

    const user = db.prepare(`
      SELECT id, username, email, full_name, avatar_url, cover_url, bio, location, interests, is_online, last_seen, created_at
      FROM users WHERE username = ? COLLATE NOCASE
    `).get(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if blocked
    const isBlocked = db.prepare(`
      SELECT id FROM blocks 
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `).get(currentUserId, user.id, user.id, currentUserId);

    if (isBlocked && isBlocked.blocker_id === user.id) {
      return res.status(403).json({ error: 'You are blocked by this user' });
    }

    // Check connection status
    const connection = db.prepare(`
      SELECT id, requester_id, recipient_id, status FROM connections
      WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)
    `).get(currentUserId, user.id, user.id, currentUserId);

    // Friend counts
    const friendCount = db.prepare(`
      SELECT count(*) as count FROM connections
      WHERE (requester_id = ? OR recipient_id = ?) AND status = 'accepted'
    `).get(user.id, user.id).count;

    // Mutual friends count if not self
    let mutualFriends = [];
    if (user.id !== currentUserId) {
      mutualFriends = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.avatar_url
        FROM users u
        WHERE u.id IN (
          SELECT CASE WHEN requester_id = ? THEN recipient_id ELSE requester_id END
          FROM connections WHERE (requester_id = ? OR recipient_id = ?) AND status = 'accepted'
        )
        AND u.id IN (
          SELECT CASE WHEN requester_id = ? THEN recipient_id ELSE requester_id END
          FROM connections WHERE (requester_id = ? OR recipient_id = ?) AND status = 'accepted'
        )
        LIMIT 5
      `).all(currentUserId, currentUserId, currentUserId, user.id, user.id, user.id);
    }

    res.json({
      profile: user,
      friendCount,
      mutualFriends,
      connectionStatus: connection ? connection.status : 'none',
      isRequester: connection ? connection.requester_id === currentUserId : false,
      isBlockedByYou: isBlocked && isBlocked.blocker_id === currentUserId
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, bio, location, interests } = req.body;
    const userId = req.user.id;

    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    db.prepare(`
      UPDATE users
      SET full_name = ?, bio = ?, location = ?, interests = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(full_name.trim(), bio || '', location || '', interests || '', userId);

    const updatedUser = db.prepare(`
      SELECT id, username, email, full_name, avatar_url, cover_url, bio, location, interests, is_online, last_seen, created_at
      FROM users WHERE id = ?
    `).get(userId);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(avatarUrl, req.user.id);

    res.json({
      message: 'Avatar updated successfully',
      avatar_url: avatarUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// POST /api/users/cover
router.post('/cover', authenticateToken, upload.single('cover'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const coverUrl = `/uploads/covers/${req.file.filename}`;
    db.prepare('UPDATE users SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(coverUrl, req.user.id);

    res.json({
      message: 'Cover image updated successfully',
      cover_url: coverUrl
    });
  } catch (error) {
    console.error('Error uploading cover:', error);
    res.status(500).json({ error: 'Failed to upload cover' });
  }
});

export default router;
