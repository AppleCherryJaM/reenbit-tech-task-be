import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import chatRoutes from './routes/chats';
import messageRoutes from './routes/messages';
import authRoutes from './routes/auth';

// Services
import { dbService } from './services/db.service';
// Убрали: import { quoteService } from './services/quote.service'; // ❌ Не используется здесь

// Middleware
import { authMiddleware } from './middlewares/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes with authentication
app.use('/api/chats', authMiddleware, chatRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/auth', authRoutes); // No auth required for login

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
    
    // Получаем все чаты пользователя
    const userChats = await dbService.getAllChats(userId);
    
    if (userChats.length === 0) {
      socket.emit('live:messages:error', { message: 'No chats available' });
      return;
    }

    // Интервал для случайных сообщений
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
        
        // Отправляем сообщение в конкретный чат
        io.to(`chat:${randomChat.id}`).emit('message:new', botMessage);
        socket.emit('notification:new', {
          type: 'live_message',
          chatId: randomChat.id,
          message: botMessage
        });
        
      } catch (error) {
        console.error('Live message failed:', error);
      }
    }, 5000); // Каждые 5 секунд

    // Сохраняем intervalId для остановки
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
    // Очищаем интервал при отключении
    if (socket.data.liveMessagesInterval) {
      clearInterval(socket.data.liveMessagesInterval);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Initialize predefined chats for demo user on startup
async function initializeDemoUserChats() {
  try {
    // Просто используем валидный 24-символьный hex ID
    const demoUserId = '65f21a8b7c1d2a4e5f6a7b8c'; // Только 0-9, a-f
    const existingChats = await dbService.getAllChats(demoUserId);
    
    if (existingChats.length === 0) {
      const predefinedChats = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
        { firstName: 'Bob', lastName: 'Johnson' }
      ];

      for (const chat of predefinedChats) {
        await dbService.createChat(demoUserId, chat.firstName, chat.lastName);
      }
      console.log('✅ Predefined chats created for demo user');
    } else {
      console.log('✅ Predefined chats already exist');
    }
  } catch (error) {
    console.error('❌ Failed to initialize demo chats:', error);
  }
}

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    timestamp: new Date().toISOString(),
    message: 'API is ready for testing'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initializeDemoUserChats();
});

export { app };