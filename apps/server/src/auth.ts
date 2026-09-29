import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import type { Db, MongoClient } from 'mongodb';
import type { Env } from './env';

/**
 * Better Auth, mounted at /api/auth on the API but addressed through the client's own origin
 * (ADR 0001): `baseURL` and `trustedOrigins` are the public client origin, and cookies stay
 * host-only, HttpOnly, SameSite=Lax (Secure when the origin is https).
 * Its `user`, `session`, `account` and `verification` collections share our database.
 */
export function createAuth(env: Env, db: Db, client: MongoClient) {
  return betterAuth({
    appName: 'Irongate City',
    baseURL: env.PUBLIC_ORIGIN,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.PUBLIC_ORIGIN],
    database: mongodbAdapter(db, { client }),
    emailAndPassword: { enabled: true },
    // Playwright signs up several accounts from one address within seconds; Better Auth's
    // production rate limit (sign-up included) would refuse the fourth. Only with the test hooks,
    // which require DB_MODE=memory.
    ...(env.E2E_TEST_HOOKS ? { rateLimit: { enabled: false } } : {}),
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
