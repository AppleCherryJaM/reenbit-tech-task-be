import express from 'express';
import { dbService } from '../services/db.service';

const router = express.Router();

// Google OAuth callback
router.post('/google', async (req, res) => {
  try {
    const { token, email, name, picture, sub } = req.body;

    // Verify token (в production используйте google-auth-library)
    const user = await dbService.findOrCreateUser(
      'google',
      sub,
      email,
      name,
      picture
    );

    res.json({ user });
  } catch (error) {
		console.log(error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;