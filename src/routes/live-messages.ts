import express from 'express';
import { dbService } from '../services/db.service';
import { quoteService } from '../services/quote.service';

const router = express.Router();

// Start live messages
router.post('/start', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Получаем все чаты пользователя
    const userChats = await dbService.getAllChats(userId);
    
    if (userChats.length === 0) {
      return res.status(400).json({ error: 'No chats available for live messages' });
    }

    const io = req.app.get('io');
    
    // Запускаем интервал для случайных сообщений
    const intervalId = setInterval(async () => {
      try {
        const randomChat = userChats[Math.floor(Math.random() * userChats.length)];
        const autoResponse = await quoteService.getAutoResponse();
        
        const botMessage = await dbService.createMessage(
          autoResponse, 
          randomChat.id, 
          undefined, 
          'auto'
        );
        
        // Отправляем сообщение в конкретный чат
        io.to(`chat:${randomChat.id}`).emit('message:new', botMessage);
        
        // Отправляем всем для toast уведомлений
        io.emit('message:new', botMessage);
        
        console.log(`⚡ Live message sent to chat ${randomChat.id}: ${autoResponse}`);
        
      } catch (error) {
        console.error('Live message failed:', error);
      }
    }, 10000); // Каждые 10 секунд

    // Сохраняем intervalId для остановки
    req.app.set(`liveMessagesInterval_${userId}`, intervalId);

    res.json({ 
      success: true, 
      message: 'Live messages started',
      interval: 10000 
    });

  } catch (error) {
    console.error('Error starting live messages:', error);
    res.status(500).json({ error: 'Failed to start live messages' });
  }
});

// Stop live messages
router.post('/stop', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const intervalId = req.app.get(`liveMessagesInterval_${userId}`);
    
    if (intervalId) {
      clearInterval(intervalId);
      req.app.set(`liveMessagesInterval_${userId}`, null);
      console.log(`🛑 Live messages stopped for user ${userId}`);
    }

    res.json({ 
      success: true, 
      message: 'Live messages stopped' 
    });

  } catch (error) {
    console.error('Error stopping live messages:', error);
    res.status(500).json({ error: 'Failed to stop live messages' });
  }
});

export default router;