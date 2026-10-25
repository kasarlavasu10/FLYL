import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/index.js';
import { setupSocketIO } from './socket/index.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import connectionRoutes from './routes/connections.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import callRoutes from './routes/calls.js';
import privacyRoutes from './routes/privacy.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e8, // 100MB
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static uploaded files (avatars, covers, attachments)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'ConnectHub API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/privacy', privacyRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize database
try {
  initDatabase();
  console.log('Database initialized successfully.');
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

// Setup Socket.IO signaling & real-time messaging
setupSocketIO(io);

// Start server
server.listen(PORT, () => {
  console.log(`ConnectHub Backend Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for client origin: ${CLIENT_URL}`);
});
