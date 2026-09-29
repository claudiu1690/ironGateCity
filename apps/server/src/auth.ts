import { copy } from '@irongate/content/copy';
import { checkName } from '@irongate/rules';
import type { NameProblem } from '@irongate/rules';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { APIError } from 'better-auth/api';
import type { Db, MongoClient } from 'mongodb';
import type { Env } from './env';

/** Set by the Fastify bridge from `request.ip` (app.ts); any client-sent value is replaced. */
export const CLIENT_IP_HEADER = 'x-irongate-client-ip';

const NAME_REFUSAL: Record<NameProblem, { code: string; message: string }> = {
  blank: { code: 'NAME_BLANK', message: copy.nameBlank },
  short: { code: 'NAME_TOO_SHORT', message: copy.nameTooShort },
  long: { code: 'NAME_TOO_LONG', message: copy.nameTooLong },
};

/**
 * §7.3 (onboarding §14.2, slice-2 QA m3): the account's name is 2–40 characters once trimmed, with
 * inner runs of spaces collapsed; it is stored normalised. Refused with the sign-up form's copy.
 */
export function acceptName(raw: unknown): string {
  const r = checkName(typeof raw === 'string' ? raw : '');
  if (!r.ok) throw new APIError('BAD_REQUEST', NAME_REFUSAL[r.reason]);
  return r.name;
}

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
    // QA m3: the name rule at sign-up, and on any later change through Better Auth's update-user.
    databaseHooks: {
      user: {
        create: { before: async (user) => ({ data: { ...user, name: acceptName(user.name) } }) },
        update: {
          before: async (user) =>
            'name' in user && user.name !== undefined
              ? { data: { ...user, name: acceptName(user.name) } }
              : { data: user },
        },
      },
    },
    // Playwright signs up several accounts from one address within seconds; Better Auth's
    // production rate limit (sign-up included) would refuse the fourth. Only with the test hooks,
    // which require DB_MODE=memory.
    ...(env.E2E_TEST_HOOKS ? { rateLimit: { enabled: false } } : {}),
    // The rate limit keys on the address Fastify resolved (TRUST_PROXY), not on X-Forwarded-For.
    advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
