import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'connecthub_super_secret_jwt_key_2026_secure';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { full_name, username, email, password } = req.body;

    if (!full_name || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check unique username
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check unique email
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Default avatars using stylish UI dicebear/unsplash
    const avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, avatar_url, is_online)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(username, email, password_hash, full_name, avatar_url);

    const newUser = db.prepare(`
      SELECT id, username, email, full_name, avatar_url, cover_url, bio, location, interests, is_online, last_seen, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Account created successfully',
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body; // login can be username or email

    if (!login || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const user = db.prepare(`
      SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE
    `).get(login, login);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Update online status
    db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const { password_hash, ...safeUser } = user;
    const token = generateToken(safeUser);

    res.json({
      message: 'Logged in successfully',
      user: safeUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT id, email, username FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    // Clean up old tokens for this user
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);

    db.prepare(`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, token, expiresAt);

    // Return the token so user can use the simulated reset link directly
    res.json({
      message: 'Password reset link generated successfully.',
      resetToken: token,
      resetUrl: `/reset-password?token=${token}`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const resetRecord = db.prepare(`
      SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime('now')
    `).get(token);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(password_hash, resetRecord.user_id);

    db.prepare('DELETE FROM password_resets WHERE id = ?').run(resetRecord.id);

    res.json({ message: 'Password has been successfully reset. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
