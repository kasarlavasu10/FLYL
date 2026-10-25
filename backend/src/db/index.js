import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(__dirname, '../../', process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../database/connecthub.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      cover_url TEXT,
      bio TEXT,
      location TEXT,
      interests TEXT,
      is_online INTEGER DEFAULT 0,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(requester_id, recipient_id)
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      is_group INTEGER DEFAULT 0,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      last_read_message_id INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT,
      attachment_url TEXT,
      attachment_type TEXT,
      attachment_name TEXT,
      status TEXT DEFAULT 'sent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS call_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('audio', 'video')),
      status TEXT NOT NULL CHECK(status IN ('completed', 'missed', 'declined', 'cancelled')),
      duration_seconds INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_conv_part ON conversation_participants(user_id, conversation_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
    CREATE INDEX IF NOT EXISTS idx_calls_user ON call_history(caller_id, receiver_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_connections ON connections(requester_id, recipient_id, status);
  `);

  // Seed sample starter accounts if empty
  const count = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (count === 0) {
    seedStarterData();
  }
}

function seedStarterData() {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('Password123!', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, avatar_url, cover_url, bio, location, interests, is_online)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const user1 = insertUser.run(
    'alex',
    'alex@connecthub.com',
    hash,
    'Alex Morgan',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    'Product designer & tech enthusiast. Love building intuitive web experiences and connecting with creative minds.',
    'San Francisco, CA',
    'Design, React, AI, Photography, Travel',
    1
  );

  const user2 = insertUser.run(
    'sarah',
    'sarah@connecthub.com',
    hash,
    'Sarah Chen',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
    'Full-stack engineer & open-source contributor. Always curious about WebRTC, distributed systems, and coffee.',
    'Seattle, WA',
    'JavaScript, Node.js, WebRTC, Hiking, Reading',
    1
  );

  const user3 = insertUser.run(
    'david',
    'david@connecthub.com',
    hash,
    'David Kim',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80',
    'Mobile developer and UI specialist. Working on next-generation cross-platform apps.',
    'Austin, TX',
    'Mobile, Swift, Flutter, Music, Cycling',
    0
  );

  const u1Id = user1.lastInsertRowid;
  const u2Id = user2.lastInsertRowid;
  const u3Id = user3.lastInsertRowid;

  // Add mutual connection between Alex and Sarah
  db.prepare(`
    INSERT INTO connections (requester_id, recipient_id, status)
    VALUES (?, ?, 'accepted')
  `).run(u1Id, u2Id);

  // Add pending connection request from David to Alex
  db.prepare(`
    INSERT INTO connections (requester_id, recipient_id, status)
    VALUES (?, ?, 'pending')
  `).run(u3Id, u1Id);

  // Create conversation between Alex and Sarah
  const conv = db.prepare(`
    INSERT INTO conversations (is_group, title) VALUES (0, NULL)
  `).run();
  const convId = conv.lastInsertRowid;

  db.prepare(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)`).run(convId, u1Id);
  db.prepare(`INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)`).run(convId, u2Id);

  // Seed messages
  const insertMsg = db.prepare(`
    INSERT INTO messages (conversation_id, sender_id, content, status, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  insertMsg.run(convId, u2Id, 'Hey Alex! Welcome to ConnectHub! Real-time messaging and calls are ready!', 'read', '-30 minutes');
  insertMsg.run(convId, u1Id, 'Hi Sarah! That looks super sleek. Have you tested video calling yet?', 'read', '-20 minutes');
  insertMsg.run(convId, u2Id, 'Yes! WebRTC peer-to-peer works smoothly. Let’s do a quick test call whenever you want.', 'sent', '-5 minutes');

  // Seed notification for Alex
  db.prepare(`
    INSERT INTO notifications (user_id, sender_id, type, title, body, data)
    VALUES (?, ?, 'friend_request', 'New Connection Request', 'David Kim sent you a connection request.', ?)
  `).run(u1Id, u3Id, JSON.stringify({ requesterId: u3Id }));

  // Seed call history
  db.prepare(`
    INSERT INTO call_history (caller_id, receiver_id, type, status, duration_seconds, started_at, ended_at)
    VALUES (?, ?, 'video', 'completed', 142, datetime('now', '-2 hours'), datetime('now', '-1 hours 57 minutes'))
  `).run(u2Id, u1Id);

  console.log('Database seeded with starter users (alex, sarah, david - password: Password123!)');
}
