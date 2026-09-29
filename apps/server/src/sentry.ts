import type * as SentryNode from '@sentry/node';
import type { Env } from './env';

type SentryModule = typeof SentryNode;

let sentry: SentryModule | undefined;

/** Initialise Sentry only when SENTRY_DSN is set; otherwise every call here is a no-op. */
export async function initSentry(env: Env, release?: string): Promise<void> {
  if (!env.SENTRY_DSN) return;
  sentry = await import('@sentry/node');
  sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, release, tracesSampleRate: 0 });
}

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  sentry?.captureException(err, extra ? { extra } : undefined);
}

export async function flushSentry(): Promise<void> {
  await sentry?.flush(2_000);
}
