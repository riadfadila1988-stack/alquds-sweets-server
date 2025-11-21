import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function normalizeDecodedUser(decoded: any) {
  if (!decoded || typeof decoded !== 'object') return decoded;
  // normalize id/_id fields that might be ObjectId-like objects
  ['id', '_id'].forEach((k) => {
    const v = decoded[k];
    if (!v) return;
    try {
      // Mongoose ObjectId has toHexString
      if (typeof v === 'object' && typeof (v as any).toHexString === 'function') {
        decoded[k] = (v as any).toHexString();
        return;
      }
      // If it has nested _id (rare), extract it
      if (typeof v === 'object' && (v as any)._id) {
        decoded[k] = String((v as any)._id);
        return;
      }
      // Fallback: if toString looks like a 24-hex string, use it
      if (typeof v.toString === 'function') {
        const s = v.toString();
        if (/^[a-fA-F0-9]{24}$/.test(s)) {
          decoded[k] = s;
          return;
        }
      }
    } catch (e) {
      // ignore and leave as-is
    }
  });
  return decoded;
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = normalizeDecodedUser(decoded);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
        return;
    }
}

export function authorizeRoles(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            res.status(403).json({ message: 'Forbidden: insufficient role' });
            return;
        }
        next();
    };
}
