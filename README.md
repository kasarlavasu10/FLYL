# ConnectHub – Modern Social Communication Platform

**ConnectHub** is a full-stack, responsive social networking and real-time communication platform. Users can create accounts, customize rich profiles, discover and connect with peers, chat in real time with media attachments, and make direct **peer-to-peer WebRTC audio and video calls**.

---

## 🌟 Key Features

### 1. User Authentication & Security
- **Registration & Login**: Secure account creation with validation for unique usernames and emails.
- **Password Protection**: Salted password hashing with `bcryptjs`.
- **JWT Authentication**: Signed JSON Web Tokens for session persistence and route protection.
- **Forgot Password Workflow**: Reset token generation with password updating.
- **Instant Demo Switcher**: One-click logins for built-in accounts (`alex`, `sarah`, `david`) for rapid testing.

### 2. User Profiles & Social Graph
- **Customizable Profiles**: Profile picture and cover image upload with previews.
- **Profile Fields**: Full name, username, bio, location, and tags for skills/interests.
- **Online Presence**: Live presence indicators with last-seen timestamps.
- **Connection System**: Send, accept, decline, and cancel friend requests.
- **Mutual Friends**: Automatic calculation of mutual connections.
- **Privacy & Moderation**: Block unwanted users and report malicious accounts.

### 3. Real-Time Chat System
- **Instant Messaging**: Socket.IO powered messaging with ultra-low latency.
- **Rich Media**: Send text, emojis, photos, and file attachments.
- **Delivery & Read Receipts**: Visual status checkmarks (`✓` Sent, `✓✓` Read).
- **Typing Indicators**: Real-time feedback when partner is typing.
- **Unread Message Badges**: Counter for unread messages across conversations.
- **Persistent Chat History**: All messages and attachments stored in database.

### 4. Online Audio & Video Calling (WebRTC)
- **Direct P2P Media**: Real-time peer-to-peer streaming via standard browser `RTCPeerConnection`.
- **Socket.IO Signaling**: Complete signaling pipeline for SDP offers, answers, and ICE candidates.
- **Incoming Call Ringing**: Audio ringtone synthesized via native Web Audio API with animated incoming modal.
- **In-Call Controls**:
  - Mute / Unmute microphone.
  - Turn camera on / off.
  - Switch camera (front/rear on mobile devices).
  - Screen share toggle.
  - Picture-in-picture docked mode to browse the app during a call.
  - End call with call duration counter.
- **Call History**: Complete logs of completed, incoming, outgoing, and missed calls with quick "Call Back" action.
- **Hardware Diagnostic Tester**: Settings page includes a live camera test and microphone volume meter.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router 6, Lucide Icons |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | SQLite via `better-sqlite3` (WAL mode enabled, zero external setup, portable to Postgres) |
| **Real-Time** | WebSockets via Socket.IO for chat and WebRTC call signaling |
| **Media Calling**| WebRTC `RTCPeerConnection`, Google STUN servers (`stun:stun.l.google.com:19302`) |
| **File Storage** | Multer disk storage serving static `/uploads` with MIME type validation |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js (v18+)
- npm

### 1. Start Backend Server
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5000` and automatically initializes `database/connecthub.db` with seeded test accounts.*

### 2. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with automatic API and Socket.IO proxying to `http://localhost:5000`.*

## ☁️ Netlify Deployment

Netlify hosts the frontend only. The Express API and Socket.IO server must also be deployed to a Node.js host that supports long-running servers and WebSockets.

1. Connect this repository to Netlify. Set the build command to `npm --prefix frontend ci && npm --prefix frontend run build` and the publish directory to `frontend/dist` (these defaults are in `netlify.toml`).
2. Deploy the `backend` directory to a Node.js host. Set its start command to `npm start` and configure `PORT`, a strong `JWT_SECRET`, and `CLIENT_URL` to your exact Netlify site origin (for example, `https://your-site.netlify.app`, without a trailing slash). For multiple frontend origins, separate them with commas.
3. In Netlify, add the `VITE_API_URL` environment variable with the backend's public origin (for example, `https://your-api.example.com`, without `/api` at the end), then trigger a new deploy. The frontend uses this URL for API requests and Socket.IO.
4. Check that `https://your-api.example.com/api/health` returns a JSON health response. User accounts are stored in the backend database, not Netlify.

---

## 🔑 Pre-Seeded Demo Accounts

For instant testing between two browser windows or devices:

| Name | Username | Password | Email |
|---|---|---|---|
| **Alex Morgan** | `alex` | `Password123!` | `alex@connecthub.com` |
| **Sarah Chen** | `sarah` | `Password123!` | `sarah@connecthub.com` |
| **David Kim** | `david` | `Password123!` | `david@connecthub.com` |

> [!TIP]
> You can also click the quick **Alex Morgan** or **Sarah Chen** buttons on the login page for one-click access.

---

## 📞 How to Test Video and Audio Calling Locally

1. Open `http://localhost:5173` in your regular browser and sign in as **Alex Morgan**.
2. Open an **Incognito / Private Window** (or a second browser) and sign in as **Sarah Chen**.
3. In Alex's browser, open the **Messages** or **Connections** tab and select Sarah Chen.
4. Click the **Video Call** or **Audio Call** button.
5. In Sarah's window, the incoming call modal will ring with sound and display Alex's caller details.
6. Click **Accept**: The WebRTC peer connection will establish, connecting both local and remote video streams.
7. Test the controls: Mute Mic, Toggle Camera, Share Screen, or Minimize to Picture-in-Picture.
8. Click **End Call**: Call duration will be logged into both users' **Call History**!

---

## 🌐 WebRTC STUN/TURN Configuration

WebRTC uses STUN servers to discover public IP/port mappings (ICE candidates) behind NATs:
- **Default STUN Servers**:
  - `stun:stun.l.google.com:19302`
  - `stun:stun1.l.google.com:19302`
- For strict corporate firewalls or symmetric NATs, configure a TURN relay server (e.g., Coturn, Twilio, or Xirsys) in `backend/.env`:
  ```env
  STUN_SERVERS=["stun:stun.l.google.com:19302"]
  TURN_URL=turn:turn.example.com:3478
  TURN_USERNAME=myuser
  TURN_CREDENTIAL=mypassword
  ```

---

## 🛡️ Security & Production Deployment

1. **HTTPS Requirement**: WebRTC `getUserMedia()` (camera and microphone access) requires a secure origin (`https://` or `localhost`). Always enable SSL/TLS in production (e.g., via Let's Encrypt / Cloudflare).
2. **Environment Variables**:
   Update `backend/.env` with a strong `JWT_SECRET` and set `CLIENT_URL` to your production domain.
3. **Production Build**:
   ```bash
   cd frontend
   npm run build
   ```
   Deploy the `frontend/dist` directory to your static host or reverse proxy with Nginx.
