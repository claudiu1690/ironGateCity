/**
 * Rate Limiting Middleware — §10.2
 *
 * Uses express-rate-limit with rate-limit-redis for distributed limiting.
 * Redis store ensures limits are enforced across multiple API instances
 * (horizontally scaled deployments behind a load balancer).
 *
 * All responses return the standard §10.1 error envelope:
 *   { error: { code: 'RATE_LIMIT', message: '...', details: { retryAfter } } }
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { Request, Response } from 'express';
import { redis } from '../lib/redis.js';
import { ErrorCode } from './errorHandler.js';

function rateLimitHandler(req: Request, res: Response): void {
  const retryAfter = res.getHeader('Retry-After');
  res.status(429).json({
    error: {
      code:    ErrorCode.RATE_LIMIT,
      message: 'Too many requests — please slow down.',
      details: { retryAfter: retryAfter ? Number(retryAfter) : undefined },
    },
  });
}

/**
 * Build a rate limiter using the shared Redis client.
 * keyPrefix ensures different limits have isolated namespaces in Redis.
 */
function makeLimit(opts: {
  keyPrefix: string;
  windowMs: number;
  max: number;
  /** 'ip' uses req.ip; 'user' uses req.auth?.userId || req.ip */
  keyBy: 'ip' | 'user';
}): RateLimitRequestHandler {
  return rateLimit({
    skip: () => process.env.NODE_ENV !== 'production',
    windowMs: opts.windowMs,
    max:      opts.max,
    standardHeaders: true,  // Return RateLimit-* headers
    legacyHeaders:   false,
    handler: rateLimitHandler,

    keyGenerator: (req: Request) => {
      // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 → 127.0.0.1) to
      // prevent ERR_ERL_KEY_GEN_IPV6 from express-rate-limit
      const rawIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      const ip = rawIp.replace(/^::ffff:/, '');
      if (opts.keyBy === 'user') {
        const userId = req.auth?.userId;
        return userId ? `${opts.keyPrefix}:user:${userId}` : `${opts.keyPrefix}:ip:${ip}`;
      }
      return `${opts.keyPrefix}:ip:${ip}`;
    },

    store: new RedisStore({
      prefix:      `rl:${opts.keyPrefix}:`,
      // ioredis.call() returns Promise<unknown>; cast satisfies rate-limit-redis's RedisReply constraint
      sendCommand: (...args: string[]): Promise<RedisReply> =>
        redis.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
    }),
  });
}

// ─── §10.2 Rate limit definitions ────────────────────────────────────────────

/** POST /auth/register — 5 per IP per hour */
export const registerLimiter = makeLimit({
  keyPrefix: 'register',
  windowMs:  60 * 60 * 1000,   // 1 hour
  max:       5,
  keyBy:     'ip',
});

/** POST /auth/login — 10 per IP per 15 minutes */
export const loginLimiter = makeLimit({
  keyPrefix: 'login',
  windowMs:  15 * 60 * 1000,   // 15 minutes
  max:       10,
  keyBy:     'ip',
});

/** POST /missions/:id/start — 30 per user per minute */
export const missionStartLimiter = makeLimit({
  keyPrefix: 'mission-start',
  windowMs:  60 * 1000,        // 1 minute
  max:       30,
  keyBy:     'user',
});

/** POST /dossier/surveillance — 10 per user per hour */
export const dossierSurveillanceLimiter = makeLimit({
  keyPrefix: 'dossier-surv',
  windowMs:  60 * 60 * 1000,   // 1 hour
  max:       10,
  keyBy:     'user',
});

/** POST /payments/* — 20 per user per hour */
export const paymentsLimiter = makeLimit({
  keyPrefix: 'payments',
  windowMs:  60 * 60 * 1000,   // 1 hour
  max:       20,
  keyBy:     'user',
});

/** All other authenticated routes — 100 per user per minute */
export const defaultAuthLimiter = makeLimit({
  keyPrefix: 'auth-default',
  windowMs:  60 * 1000,        // 1 minute
  max:       100,
  keyBy:     'user',
});
