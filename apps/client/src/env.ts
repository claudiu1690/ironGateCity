/** Client configuration from Vite env vars (see .env.example). */
export const env = {
  /** Same-origin by default (ADR 0001). An absolute URL only for the cross-origin fallback. */
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) || '/api',
  sentryDsn: (import.meta.env.VITE_SENTRY_DSN as string | undefined) || undefined,
  mode: import.meta.env.MODE,
  /**
   * ADR 0024 (maps v3): where the map tiles are, e.g. https://tiles.<domain> once R2 exists. Dev and
   * preview serve the local cache at /tiles (vite.config.ts); production without it: no tiles, the
   * stills. An empty value means no tile requests at all.
   */
  tilesOrigin:
    (import.meta.env.VITE_TILES_ORIGIN as string | undefined) ?? (import.meta.env.DEV ? '/tiles' : ''),
};
