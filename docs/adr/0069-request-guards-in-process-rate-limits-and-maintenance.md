# ADR 0069 — Request guards: in-process rate limits (no Redis) and a maintenance flag from the environment

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Design §4.1 asks for **60 game mutations a minute per account and 600 a minute per IP**. A refusal reads *Slow down a moment.* and the tap is not spent. Better Auth limits sign-in and sign-up on its own. Chat has its own limiter (ADR 0039). Screens §12 adds **the maintenance screen** (*The presses are stopped. Back at {time}.*) for deploys.

The plan has no Redis. The betas run one API instance. A counter in MongoDB per mutation would add a write to every tap.

## Decision

1. **A sliding-window counter in each API process**, keyed `account:{id}` and `ip:{address}`, pruned every minute. It runs as tRPC middleware on mutations before any procedure code, and a miss throws `SLOW_DOWN { retryAt }` (429). The telemetry beacon has its own limit (120 events a minute per session).
2. **Maintenance comes from `MAINTENANCE_UNTIL`** (an ISO time, or `soon`):
   - an `onRequest` hook answers 503 `MAINTENANCE { until }` on tRPC and auth routes;
   - `/healthz` reports it;
   - the client shows the screen on that answer, or after three failed health checks a minute apart (*Back shortly.*), which covers a deploy with the API down;
   - with the test hooks, a route flips it for the process.
3. No dependency (`@fastify/rate-limit` would bring the same in-memory store).

## Consequences

- No extra write on a tap, and an exact limit within one process.
- With N instances the ceiling becomes N × 60. This is recorded. The path past one instance is a MongoDB counter document per account per minute, the same pattern as `chatLimits`.
- Maintenance is a restart with a variable, which matches how deploys happen (lane D #14).
