// middlewares/authVerify.ts
import type { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authVerifyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    
    console.log('🔐 Auth Verify: Token verification');
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('✅ Auth Verify: Google token verified for:', payload.email);
    
    req.user = {
      id: payload.sub, // Google ID
      email: payload.email!,
      name: payload.name || '',
      picture: payload.picture || ''
    };

    next();
  } catch (error) {
    console.error('❌ Auth Verify error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};