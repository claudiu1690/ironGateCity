# ADR 0072 — The production topology for the hosting step: same-site subdomains (ADR 0001's option B), a direct WebSocket, the worker as a second process, R2 tiles, mail over HTTP; the direct mode built and tested locally first

**Status:** proposed (slice 9; supersedes ADR 0001's production proxy; applies ADR 0038, 0024) · **Date:** 2026-10-04

## Context

The project stays local until the end (the user's decision). Design §10 gathers every deferred hosting item into one checklist (lane D of the slice-9 tech design). Several earlier ADRs left decisions open for that step:

- **ADR 0001** proxies `/api` through a Vercel rewrite, with option B (`play.` and `api.` on one domain, the cookie on the parent domain) for later.
- **ADR 0038** found that a Vercel rewrite cannot upgrade a WebSocket, so chat needs option B, and that `transports: ['websocket']` avoids sticky sessions.
- **ADR 0024** puts tiles on R2 behind `tiles.<domain>`.
- Production Better Auth needs mail (password reset) and Sentry DSNs. The worker must run as a real second process, because quiet cities are counted only by it.

Option B makes the API cross-origin but same-site, so the browser needs CORS with credentials and the cookie on the parent domain. Locally, `localhost:5173` and `localhost:3101` are also same-site, so option B can be exercised before any domain exists.

## Decision

1. **Production:**
   - the client at `play.<domain>` on Vercel, with `VITE_API_ORIGIN=https://api.<domain>` and no `/api` rewrite;
   - the API at `api.<domain>`, with Socket.IO on it using `transports: ['websocket']`;
   - the worker as a second service from the same image;
   - Atlas with change streams verified on the tier;
   - tiles at `tiles.<domain>` on R2;
   - a transactional mail provider called over HTTP through our `Mailer` (no SDK);
   - Sentry for both sides.
2. **The session cookie** is set on the parent domain (`COOKIE_DOMAIN`, Better Auth's cross-subdomain setting), `SameSite=Lax`, `Secure`. **CORS** is a hand-written exact-origin hook (`CORS_ORIGINS`, credentials allowed, preflights answered), with no new dependency.
3. **Built and tested locally first** (slice 9, T25): the direct mode behind configuration, and an e2e project that runs sign-up, a tap, a chat line over the socket and sign-out with the client calling the API origin directly. The default local setup keeps the Vite proxy.
4. **Headers:** CSP (`connect-src` for the API and its WebSocket, `img-src` for tiles), HSTS and HTTPS only. They are configuration, on in production only.
5. The runbook, `docs/ops/hosting.md`, names every variable and check. Lane D ticks it item by item.

## Consequences

- The hosting step switches configuration rather than writing code, and its riskiest change (cross-origin auth and the socket) has already passed a test.
- One proxy hop less per call in production.
- Preview deploys need a staging API or their origins in `CORS_ORIGINS`.
- ADR 0001's production proxy is retired at lane D. Its local proxy stays.
