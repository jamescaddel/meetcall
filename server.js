const express = require('express');
const next = require('next');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const cors = require('cors');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  app.use(cors());

  app.get('/health', (req, res) => {
    res.send({ status: 'healthy', service: 'nexin-meet-signaling-server' });
  });

  const server = http.createServer(app);

  // PeerServer configuration integrated into the Express server
  const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/'
  });

  app.use('/peerjs', peerServer);

  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins for local dev ease
      methods: ["GET", "POST"]
    }
  });

  // Rooms dictionary to manage users
  const rooms = {};

  io.on('connection', (socket) => {
    console.log(`[Socket] Connection established: ${socket.id}`);

    socket.on('join-room', ({ roomId, userId, userName }) => {
      console.log(`[Room] User join request: ${userName} (${userId}) -> Room: ${roomId}`);
      
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userName = userName;

      if (!rooms[roomId]) {
        rooms[roomId] = {};
      }
      
      rooms[roomId][socket.id] = { userId, userName };

      // Broadcast connection to other users in the room
      socket.to(roomId).emit('user-connected', { userId, userName, socketId: socket.id });

      // Send full list of other active participants in this room to the joining user
      const participants = Object.entries(rooms[roomId])
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, info]) => ({ ...info, socketId: sid }));
      
      socket.emit('get-participants', participants);
    });

    socket.on('send-message', ({ content, timestamp }) => {
      const { roomId, userId, userName } = socket;
      if (roomId) {
        console.log(`[Chat] Message from ${userName} in Room ${roomId}: ${content}`);
        io.to(roomId).emit('receive-message', {
          userId,
          userName,
          content,
          timestamp
        });
      }
    });

    socket.on('toggle-audio', ({ isMuted }) => {
      const { roomId, userId } = socket;
      if (roomId) {
        socket.to(roomId).emit('user-toggle-audio', { userId, isMuted });
      }
    });

    socket.on('toggle-video', ({ isMuted }) => {
      const { roomId, userId } = socket;
      if (roomId) {
        socket.to(roomId).emit('user-toggle-video', { userId, isMuted });
      }
    });

    socket.on('toggle-screen-share', ({ isSharing }) => {
      const { roomId, userId } = socket;
      if (roomId) {
        socket.to(roomId).emit('user-toggle-screen-share', { userId, isSharing });
      }
    });

    socket.on('disconnect', () => {
      const { roomId, userId, userName } = socket;
      console.log(`[Socket] Disconnected: ${socket.id} (User: ${userName || 'unknown'})`);
      
      if (roomId && rooms[roomId]) {
        delete rooms[roomId][socket.id];
        if (Object.keys(rooms[roomId]).length === 0) {
          delete rooms[roomId];
        }
        // Notify other clients in the room
        socket.to(roomId).emit('user-disconnected', { userId, userName });
      }
    });
  });

  // Next.js handles all other requests (pages, assets, api routes)
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port} [Unified Server: Next.js + Signaling]`);
  });
});
