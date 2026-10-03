# ADR 0038 — Chat transport: Socket.IO as a push-only channel behind the same-origin proxy, writes over tRPC, fan-out by MongoDB change streams

**Status:** proposed (slice 6) · **Date:** 2026-10-03

## Context

Slice 6 adds faction chat with live lines while the chat is open (`docs/design/slice-6-together.md` §8, GDD §16.2). Nothing in the game may depend on being connected. The plan names Socket.IO for chat (Realtime row) and has no Redis. ADR 0001 sends every browser request to its own origin (a Vite proxy locally, a Vercel rewrite in production) and leaves open whether long-lived connections pass the rewrite.

Lines come from four places:

- members posting, through the API;
- system lines written inside the API's transactions (an event called, a mate taken in, bail posted, a nudge);
- the **worker**: an event resolved by its job, and seats and heroes at the city day;
- later, several API instances.

The project runs locally until the end; production concerns are to be recorded.

Options: `@fastify/websocket` with our own rooms, heartbeats and reconnection; or Socket.IO (rooms, reconnection, heartbeats and a polling fallback built in). For several instances: Socket.IO's MongoDB adapter, or each instance reading the database's changes.

## Decision

1. **Socket.IO**, attached to the API's HTTP server at `path: '/api/socket.io'`, so it sits under the proxied `/api` prefix. The Vite `server.proxy` and `preview.proxy` gain `ws: true`.
2. **Push only.** The client sends nothing over the socket. Posting is the tRPC mutation `chat.post` (one auth, validation, rate limit, idempotency key and test path); history is `chat.history`.
   - At the handshake the server reads the Better Auth session from the cookie, as the tRPC context does.
   - It checks the `Origin` header against the public origin.
   - It joins the socket to its faction's channel rooms (*Party* and the city branches) and a personal room.
   - It allows at most five sockets a user, with a 10 kB buffer.
3. **Fan-out by a change stream.** Each API process watches `chatMessages` for inserts and emits each one to its channel's room, using Socket.IO's default in-memory adapter.
   - Lines from any writer (this process, another API instance, the worker) reach every connected client.
   - Lines are inserted inside the transactions that cause them, so the stream emits only committed lines.
   - On a stream error the process logs it and reopens from the last resume token.
4. **The socket is a nicety.** The client connects only while the Faction tab is open and chat is not hidden. On every (re)connect it refetches the channel's history. Missed lines are never recovered from the socket, and no rule, reward or result travels over it.
5. **Production, recorded, not built.**
   - Vercel rewrites cannot upgrade a WebSocket. At deploy, take ADR 0001's option B: the API on a same-site subdomain with the session cookie on the parent domain, and the client socket on the API origin.
   - Use `transports: ['websocket']`, so no sticky sessions are needed with several instances. If the polling fallback is kept, the load balancer needs sticky sessions.
   - Several instances need nothing else: each runs its own change stream, with no adapter and no Redis. Check change-stream support on the chosen Atlas tier.
6. Server-Sent Events, named first in the plan, are not built: nothing else in the slices needs push (refetch on focus covers it).

## Consequences

- Two dependencies from the plan: `socket.io` (server) and `socket.io-client` (client; also a server dev dependency for tests).
- The worker needs no socket, and lines it writes appear live.
- Tests drive the socket with `socket.io-client` against `app.listen({ port: 0 })`. A smoke test proves change streams on the memory replica set (`wiredTiger`, ADR 0004).
- One change stream per API process is one long-lived cursor. At MVP scale it costs nothing, and above that it is the documented scaling path.
- ADR 0001's open question is answered for local play (tested through `vite preview` in e2e) and deferred, with a plan, for production.
