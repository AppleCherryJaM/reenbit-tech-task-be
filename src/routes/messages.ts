import express from 'express';
import { dbService } from '../services/db.service';
import { quoteService } from '../services/quote.service';

const router = express.Router();

// Send message to user's chat
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { text, chatId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!text || !chatId) {
      return res.status(400).json({ error: 'Text and chat ID are required' });
    }

    // Проверяем, что чат принадлежит пользователю
    const hasAccess = await dbService.validateChatOwnership(userId, chatId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access to chat denied' });
    }

    // Save user message
    const userMessage = await dbService.createMessage(text, chatId, userId, 'user');
    
    res.json(userMessage);

    // Auto-response after 3 seconds
    setTimeout(async () => {
      try {
        const autoResponse = await quoteService.getAutoResponse();
        const botMessage = await dbService.createMessage(autoResponse, chatId, undefined, 'auto');
        
        // Emit via Socket.io
        req.app.get('io').to(`chat:${chatId}`).emit('message:new', botMessage);
        req.app.get('io').emit('notification:new', { 
          type: 'new_message', 
          chatId,
          message: botMessage 
        });
      } catch (error) {
        console.error('Auto-response failed:', error);
      }
    }, 3000);

  } catch (_error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;