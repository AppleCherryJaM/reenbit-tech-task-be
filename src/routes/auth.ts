import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { dbService } from '../services/db.service';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('🔐 Creating/finding user for:', payload.email);

    // Find or create user in database
    const user = await dbService.findOrCreateUser(
      'google',
      payload.sub, // Google ID
      payload.email!,
      payload.name,
      payload.picture
    );

    console.log('✅ User processed:', user.id);

    const userChats = await dbService.getAllChats(user.id);
    console.log('📋 User chats after creation:', userChats.length);

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        avatar: user.avatar || ''
      },
      chats: userChats,
      token
    });

  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Check auth status
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Ищем пользователя по Google ID
    const user = await dbService.findUser(
      'google',
      payload.sub, // Google ID
    );

    if (!user) {
      console.log('🚫 User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        avatar: user.avatar || ''
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

export default router;