import { Request, Response, NextFunction } from 'express';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Простой демо-пользователь с валидным ID
    req.user = { 
      id: '65f21a8b7c1d2a4e5f6a7b8c', // 24 hex символа
      email: 'demo@example.com',
      name: 'Demo User'
    };
    
    next();
  } catch (error) {
    // Fallback
    req.user = { 
      id: '65f21a8b7c1d2a4e5f6a7b8c'
    };
    next();
  }
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        name?: string;
      };
    }
  }
}