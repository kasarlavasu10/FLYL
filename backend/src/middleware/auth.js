import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'connecthub_super_secret_jwt_key_2026_secure';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const user = db.prepare(`
      SELECT id, username, email, full_name, avatar_url, cover_url, bio, location, interests, is_online, last_seen, created_at
      FROM users WHERE id = ?
    `).get(payload.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  });
}
