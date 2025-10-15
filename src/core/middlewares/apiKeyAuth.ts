import { Request, Response, NextFunction } from 'express';

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
