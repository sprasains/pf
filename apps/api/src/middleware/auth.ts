import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // Replace this with jwt.verify(token, secret) if needed
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
