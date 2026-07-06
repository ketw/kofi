# ☕ TeaChat

A minimal local network chat app that runs on your device. Anyone on the same network can access it via your device's IP — similar to how LM Studio serves models locally.

## ✨ Features

- **Local network access** — Share your IP:port and anyone on your network can join
- **Name-based auth** — Users enter a unique name to chat
- **Real-time chat** — WebSocket-powered instant messaging
- **P2P-like file sharing** — Files (images, videos, documents) stay in the uploader's browser sandbox. When someone downloads, the file is streamed from the uploader's browser through the server as a relay. No server-side file storage!
- **Media previews** — Inline images and videos with lightbox viewer
- **Typing indicators** — See who's typing in real-time
- **Persistent history** — All messages stored in SQLite (text + metadata only, files stay in browsers)

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Access the chat**
   - On your device: `http://localhost:3000`
   - From other devices on the same network: `http://<YOUR_IP>:3000`

   The server will print your network IP on startup.

## 📁 File Sharing

- Files are held in the **uploader's browser memory** (via File API)
- When someone wants to view/download, the request goes through the WebSocket server as a relay
- The uploader's browser streams chunks to the requester
- **If the uploader closes their browser, their files become unavailable** (true P2P behavior)
- No files are stored on the server or in other users' browsers until they explicitly download

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, WebSocket, better-sqlite3
- **Frontend:** Vanilla HTML/CSS/JavaScript (no frameworks)
- **Database:** SQLite (messages + users, no file storage)

## 🔒 Security Notes

This is a **local network tool** for trusted environments. Not designed for public internet exposure without additional security layers (authentication, HTTPS, rate limiting, etc.).

## 📝 License

MIT — do whatever you want with it!
