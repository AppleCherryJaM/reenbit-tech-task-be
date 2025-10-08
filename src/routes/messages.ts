import express from 'express';
import { dbService } from '../services/db.service';
import { quoteService } from '../services/quote.service';

const router = express.Router();

// Send message to user's chat
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { text, chatId } = req.body;
    console.log(` AAAAAAAAAAA User id: ${userId}`);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!text || !chatId) {
      return res.status(400).json({ error: 'Text and chat ID are required' });
    }

    const user = await dbService.findUser('google', userId);
    
    if (!user) {
      console.error('❌ User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    const hasAccess = await dbService.validateChatOwnership(user.id, chatId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access to chat denied' });
    }

    
    const userMessage = await dbService.createMessage(text, chatId, userId, 'user');
    
    res.json(userMessage);

    // Auto-response after 3 seconds
    setTimeout(async () => {
      try {
        const autoResponse = await quoteService.getAutoResponse();
        console.log(`AutoResponse: ${autoResponse}`);
        
        const botMessage = await dbService.createMessage(autoResponse, chatId, undefined, 'auto');
        console.log(`AutoMessage: ${botMessage.id}`);

        // Emit via Socket.io
        const io = req.app.get('io');
        console.log(`chat: ${chatId}`);
        
        io.to(`chat:${chatId}`).emit('message:new', botMessage);
        console.log("Socket emitted successfully");

        io.emit('message:new', botMessage);
        
        io.emit('notification:new', { 
          type: 'new_message', 
          chatId,
          message: botMessage 
        });
      } catch (error) {
        console.error('Auto-response failed:', error);
      }
    }, 3000);

  } catch (_error) {
    console.error(`Failed to send message: ${_error}`)
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;