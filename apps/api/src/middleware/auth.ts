import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis.js';
import { ErrorCode } from './errorHandler.js';

export interface AuthPayload {
  userId: string;
  characterId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

function unauthorisedResponse(res: Response, message: string): void {
  res.status(401).json({ error: { code: ErrorCode.UNAUTHORISED, message } });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    unauthorisedResponse(res, 'Missing or invalid Authorization header.');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthPayload;

    // Session must still be alive in Redis (invalidated on logout)
    const sessionExists = await redis.exists(`session:${payload.userId}`);
    if (!sessionExists) {
      unauthorisedResponse(res, 'Session expired — please log in again.');
      return;
    }

    req.auth = payload;
    next();
  } catch {
    unauthorisedResponse(res, 'Invalid or expired token.');
  }
}
