/** Client configuration from Vite env vars (see .env.example). */
export const env = {
  /** Same-origin by default (ADR 0001). An absolute URL only for the cross-origin fallback. */
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) || '/api',
  sentryDsn: (import.meta.env.VITE_SENTRY_DSN as string | undefined) || undefined,
  mode: import.meta.env.MODE,
};
