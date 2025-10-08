// middlewares/authRequired.ts
import type { Request, Response, NextFunction } from 'express';
import { dbService } from '../services/db.service';
import { authVerifyMiddleware } from './authVerify';

// middlewares/authRequired.ts
export const authRequiredMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Сначала проверяем токен
    await authVerifyMiddleware(req, res, () => {});
    
    if (res.headersSent) return;

    const googleId = req.user!.id;
    const email = req.user!.email;

    console.log('🔐 Auth Required: Ensuring user exists for:', email);
    
    // Находим или создаем пользователя
    const user = await dbService.findOrCreateUser(
      'google',
      googleId,
      email,
      req.user!.name,
      req.user!.picture
    );

    if (!user) {
      console.error('❌ Auth Required: Failed to find/create user');
      return res.status(500).json({ error: 'User setup failed' });
    }

    console.log('✅ Auth Required: User ensured:', user.email);
    
    // Обновляем req.user - используем ID из базы как основной ID
    req.user = {
      id: user.id,        // ← Теперь это ID из базы, а не Google ID
      email: user.email,
      name: user.name || '',
      picture: user.avatar || ''
      // dbId не нужен - используем id для всего
    };

    next();
  } catch (error) {
    console.error('❌ Auth Required error:', error);
    return res.status(500).json({ error: 'User authentication failed' });
  }
};