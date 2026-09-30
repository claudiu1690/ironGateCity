import { existsSync } from 'node:fs';
import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

/** An http(s) origin: scheme, host and optional port; no path, query, fragment or credentials. */
function isHttpOrigin(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const u = new URL(value);
    return u.pathname === '/' && !u.search && !u.hash && !u.username && !u.password;
  } catch {
    return false;
  }
}

/**
 * Fastify `trustProxy` from TRUST_PROXY: a hop count ("2") or a comma list of proxy addresses or
 * CIDR ranges ("10.0.0.0/8,192.168.1.7"). "true" is refused: trusting every hop lets a client
 * choose its own address with X-Forwarded-For.
 */
function parseTrustProxy(value: string | undefined, ctx: z.RefinementCtx): number | string[] {
  const v = value?.trim() || '2';
  if (/^\d+$/.test(v)) return Number(v);
  const list = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0 || list.some((s) => !/^[0-9a-f.:]+(\/\d{1,3})?$/i.test(s))) {
    ctx.addIssue({ code: 'custom', message: 'a hop count or a comma list of IP addresses / CIDR ranges' });
    return z.NEVER;
  }
  return list;
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3001),
    /**
     * Loopback by default, so a dev server (with the dev secret published in package.json) is not
     * on the LAN (QA n12). The Dockerfile sets 0.0.0.0 so Railway/Fly can reach the server.
     */
    HOST: z.string().min(1).default('127.0.0.1'),
    /** `memory` starts a MongoMemoryReplSet in-process (Playwright, quick demos; ADR 0004). */
    DB_MODE: z.enum(['uri', 'memory']).default('uri'),
    MONGODB_URI: optionalString,
    BETTER_AUTH_SECRET: z.string().min(32, 'must be at least 32 characters'),
    /** The origin the browser sees; Better Auth `baseURL` and `trustedOrigins` (ADR 0001). */
    PUBLIC_ORIGIN: z
      .string()
      .refine(isHttpOrigin, 'must be an http(s) origin with no path, e.g. https://play.example.com')
      .transform((v) => new URL(v).origin),
    /**
     * QA m7: the proxies in front of the API, so `request.ip` is the player's address and the auth
     * rate limit counts per player. Default 2 hops, the production topology of ADR 0001: the
     * Vercel `/api` rewrite (Vercel overwrites X-Forwarded-For with the client address, so a
     * client cannot spoof it) and then the Railway or Fly edge proxy, which appends Vercel's
     * address. A hop count also trusts a caller who reaches the API origin directly and sends
     * its own X-Forwarded-For; once the edge's addresses are known, list them as CIDRs instead.
     * ASSUMPTION, not verifiable before provisioning: at the first deploy, check that sign-in
     * attempts from two networks are limited separately and that the log has no Better Auth
     * "could not determine a client IP" warning; adjust the count or the CIDRs if not.
     */
    TRUST_PROXY: z.string().optional().transform(parseTrustProxy),
    SENTRY_DSN: optionalString,
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Playwright only: registers POST /api/test/clock (tech design §7.8). Refused unless DB_MODE=memory. */
    E2E_TEST_HOOKS: z
      .enum(['0', '1', ''])
      .optional()
      .transform((v) => v === '1'),
  })
  .superRefine((env, ctx) => {
    if (env.DB_MODE === 'uri' && !env.MONGODB_URI) {
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'required when DB_MODE=uri' });
    }
    if (env.E2E_TEST_HOOKS && env.DB_MODE !== 'memory') {
      ctx.addIssue({ code: 'custom', path: ['E2E_TEST_HOOKS'], message: 'only allowed with DB_MODE=memory' });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** A mongodb:// URI whose every host is 127.0.0.1 or localhost. */
export function isLoopbackUri(uri: string): boolean {
  const m = /^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/.exec(uri);
  if (!m) return false;
  return m[1]!.split(',').every((h) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h));
}

/** Validate the environment; a bad value fails fast with the field name. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** Load `.env` from the working directory with Node's built-in loader, only if it exists. */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
