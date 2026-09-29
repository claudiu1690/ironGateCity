# ADR 0001 — The API is same-origin to the client (proxy), not cross-site

**Status:** accepted (slice 0) · **Date:** 2026-09-29

## Context

The client is deployed on Vercel and the API on Railway/Fly. Better Auth keeps the session in an
HttpOnly cookie. If the browser talks to `api.railway.app` from `*.vercel.app`, that cookie is a
**third-party cookie**: it needs `SameSite=None; Secure`, `credentials: 'include'` and CORS with
credentials, and Safari (ITP) and privacy-mode browsers drop it anyway. A game that is played on
phones cannot rely on third-party cookies.

## Decision

The browser only ever talks to **its own origin**. Every `/api/*` request is proxied to the API:

- **Production:** a Vercel rewrite in `apps/client/vercel.json`: `/api/:path*` → `https://<api-host>/api/:path*`.
- **Development:** Vite `server.proxy` (and `preview.proxy`) `/api` → `http://localhost:3001`.
- **Tests (Playwright):** the same Vite proxy.

Consequences for the server: mount Better Auth at `/api/auth/*` and tRPC at `/api/trpc`; set Better
Auth `baseURL` to the **public client origin** and `trustedOrigins` to the same; `trustProxy: true`
in Fastify; cookies stay `SameSite=Lax`, `Secure` in production, host-only (no `Domain`). CORS is
not needed on the happy path and stays configured only as a fallback.

Option B for later: custom domains `play.example.com` and `api.example.com` (same site) with the
cookie `Domain=.example.com`, which removes the proxy hop. It needs a domain the project doesn't
have yet.

## Consequences

- No third-party-cookie problem on any browser; no CORS preflights.
- One extra hop through Vercel's edge for every API call (tens of ms).
- Vercel rewrites buffer long-lived responses: **SSE through the rewrite is unproven**. Slice 6
  (chat) must test it and may need option B or a direct WebSocket origin.
- The API host is hard-coded in `vercel.json` (rewrites can't read env vars); it changes once when
  the user provisions Railway/Fly.
