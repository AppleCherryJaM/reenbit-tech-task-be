import express from 'express';
import { dbService } from '../services/db.service';

const router = express.Router();

// Get all chats for current user with search
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { search } = req.query;

    console.log('🔍 GET /chats - Headers:', req.headers);
    console.log('🔍 GET /chats - User:', req.user);
    console.log('🔍 GET /chats - User ID:', userId);

    if (!userId) {
      console.log('❌ No user ID in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const chats = await dbService.getAllChats(userId, search as string);
    console.log('✅ Chats fetched:', chats.length);

    if (chats.length > 0) {
      console.log('📋 First chat structure:', JSON.stringify(chats[0], null, 2));
    }
    
    res.json(chats);
  } catch (error) {
    console.error('❌ GET /chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Create new chat for current user
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName } = req.body;

    console.log('📝 POST /chats - Request details:', {
      userId,
      firstName,
      lastName,
      headers: req.headers,
      user: req.user
    });

    if (!userId) {
      console.log('❌ No user ID in request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!firstName || !lastName) {
      console.log('❌ Missing first or last name');
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    console.log('🔧 Calling dbService.createChat...');
    const chat = await dbService.createChat(userId, firstName, lastName);
    console.log('✅ Chat created successfully:', chat.id, chat.firstName, chat.lastName);
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('❌ POST /chats error:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Update user's chat
router.put('/:chatId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;
    const { firstName, lastName } = req.body;

    console.log('✏️ PUT /chats - User:', userId, 'Chat:', chatId);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const chat = await dbService.updateChat(userId, chatId, firstName, lastName);
    console.log('✅ Chat updated:', chat.id);
    res.json(chat);
  } catch (error) {
    console.error('❌ PUT /chats error:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// Delete user's chat
  router.delete('/:chatId', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { chatId } = req.params;

      console.log('🗑️ DELETE /chats - User:', userId, 'Chat:', chatId);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await dbService.deleteChat(userId, chatId);
      console.log('✅ Chat deleted:', chatId);
      res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
      console.error('❌ DELETE /chats error:', error);
      res.status(500).json({ error: 'Failed to delete chat' });
    }
  });

// Get messages from user's chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    console.log('💬 GET /chats/messages - User:', userId, 'Chat:', chatId);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const messages = await dbService.getChatMessages(userId, chatId);
    console.log('✅ Messages fetched:', messages.length);
    res.json(messages);
  } catch (error) {
    console.error('❌ GET /chats/messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;