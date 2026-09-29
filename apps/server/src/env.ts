import { existsSync } from 'node:fs';
import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3001),
    /** 0.0.0.0 so Railway/Fly (and Docker) can reach the server. */
    HOST: z.string().min(1).default('0.0.0.0'),
    /** `memory` starts a MongoMemoryReplSet in-process (Playwright, quick demos; ADR 0004). */
    DB_MODE: z.enum(['uri', 'memory']).default('uri'),
    MONGODB_URI: optionalString,
    BETTER_AUTH_SECRET: z.string().min(32, 'must be at least 32 characters'),
    /** The origin the browser sees; Better Auth `baseURL` and `trustedOrigins` (ADR 0001). */
    PUBLIC_ORIGIN: z.url(),
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
