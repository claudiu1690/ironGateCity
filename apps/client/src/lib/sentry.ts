import { env } from '../env';

/** Initialise Sentry only when VITE_SENTRY_DSN is set; loaded lazily so it costs nothing otherwise. */
export async function initSentry(): Promise<void> {
  if (!env.sentryDsn) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({ dsn: env.sentryDsn, environment: env.mode, tracesSampleRate: 0 });
}
