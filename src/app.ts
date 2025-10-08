import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import chatRoutes from './routes/chats';
import messageRoutes from './routes/messages';
import authRoutes from './routes/auth';
import liveMessagesRoutes from './routes/live-messages';

// Services
import { dbService } from './services/db.service';

// Middleware
import { authMiddleware } from './middlewares/auth';

dotenv.config();
const FE_ENDPOINT = process.env.FRONTEND_ENDPOINT;
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

const app = express();
const httpServer = createServer(app);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes with authentication
app.use('/api/chats', authMiddleware, chatRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/live-messages', authMiddleware, liveMessagesRoutes);

// Routes that can create users
app.use('/api/auth', authRoutes);

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join chat room
  socket.on('join:chat', (chatId) => {
    socket.join(`chat:${chatId}`);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  // Leave chat room
  socket.on('leave:chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
    console.log(`User ${socket.id} left chat ${chatId}`);
  });

  // Live messages feature (random auto messages to random chats)
  socket.on('live:messages:start', async (userId: string) => {
    console.log('Live messages started for user:', userId);
    
    const userChats = await dbService.getAllChats(userId);
    
    if (userChats.length === 0) {
      socket.emit('live:messages:error', { message: 'No chats available' });
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const randomChat = userChats[Math.floor(Math.random() * userChats.length)];
        const autoResponse = await import('./services/quote.service').then(module => 
          module.quoteService.getAutoResponse()
        );
        
        const botMessage = await dbService.createMessage(
          autoResponse, 
          randomChat.id, 
          undefined, 
          'auto'
        );
        
        io.to(`chat:${randomChat.id}`).emit('message:new', botMessage);
        socket.emit('notification:new', {
          type: 'live_message',
          chatId: randomChat.id,
          message: botMessage
        });
        
      } catch (error) {
        console.error('Live message failed:', error);
      }
    }, 5000); 

    socket.data.liveMessagesInterval = intervalId;
  });

  socket.on('live:messages:stop', () => {
    console.log('Live messages stopped');
    if (socket.data.liveMessagesInterval) {
      clearInterval(socket.data.liveMessagesInterval);
      socket.data.liveMessagesInterval = null;
    }
  });

  socket.on('disconnect', () => {
    if (socket.data.liveMessagesInterval) {
      clearInterval(socket.data.liveMessagesInterval);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    timestamp: new Date().toISOString(),
    message: 'API is ready for testing'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OAuth configured with Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Yes' : 'No'}`);
});

export { app };