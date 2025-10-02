import express from 'express';
import { dbService } from '../services/db.service';

const router = express.Router();

// Get all chats for current user with search
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id; // Предполагаем, что middleware аутентификации добавит user в req
    const { search } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const chats = await dbService.getAllChats(userId, search as string);
    res.json(chats);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Create new chat for current user
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const chat = await dbService.createChat(userId, firstName, lastName);
    res.status(201).json(chat);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Update user's chat
router.put('/:chatId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;
    const { firstName, lastName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const chat = await dbService.updateChat(userId, chatId, firstName, lastName);
    res.json(chat);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// Delete user's chat
router.delete('/:chatId', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await dbService.deleteChat(userId, chatId);
    res.json({ message: 'Chat deleted successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Get messages from user's chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const messages = await dbService.getChatMessages(userId, chatId);
    res.json(messages);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;