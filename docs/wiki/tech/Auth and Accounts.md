---
type: tech
title: Auth and Accounts
aliases: [Auth, Better Auth, Sign-up, Login, Accounts]
tags: [tech, auth]
status: partly built
slice: "0 (sign-up, login); 2 (arrival and character at join); review 4 (three beats); anti-abuse and closure designed for 9"
gdd: ["§7.1", "§7.3", "§15.2"]
adrs: ["0001", "0011", "0060", "0061", "0063", "0066", "0067", "0073"]
updated: 2026-10-14
---

# Auth and Accounts

## In one paragraph

Accounts use **Better Auth** with email and password, running inside our own API and storing its
data in our own MongoDB. The browser reaches it on the same origin at `/api/auth/*`, so the session
is a normal first-party cookie. An account is not yet a character: after sign-up the player goes
through the arrival (the face and the three-beat opening), and the character is created only at the
**join**. Anti-abuse, moderation, renames and closing an account are designed for slice 9 but not
built.

## How it works

**Server** (`apps/server/src/auth.ts`, `createAuth(env, db, client)`):
- `betterAuth({ baseURL: PUBLIC_ORIGIN, basePath: '/api/auth', secret: BETTER_AUTH_SECRET,
  trustedOrigins: [PUBLIC_ORIGIN], database: mongodbAdapter(db, { client }),
  emailAndPassword: { enabled: true } })`. Collections `user`, `session`, `account`,
  `verification` live in the game's database.
- **Name rule** in `databaseHooks.user.create/update`: `acceptName()` uses `checkName()` from
  `packages/rules/src/name.ts` — 2–40 characters after trimming and collapsing spaces, stored
  normalised; refusals `NAME_BLANK`, `NAME_TOO_SHORT`, `NAME_TOO_LONG` with the sign-up form's copy.
- **Rate limit**: Better Auth's own, keyed on `x-irongate-client-ip` (`CLIENT_IP_HEADER`), which
  the Fastify bridge sets from `request.ip` (resolved with `TRUST_PROXY`), so a forged
  `X-Forwarded-For` cannot choose the address. Turned off only when the test hooks are on.
- Cookies: host-only, HttpOnly, SameSite=Lax, Secure on https (comment in `auth.ts`). Telemetry off.

**Bridge** (`apps/server/src/app.ts`): `app.route({ method: ['GET','POST'], url: '/api/auth/*' })`
turns the Fastify request into a web `Request` for `auth.handler` and copies status, headers and
every `set-cookie` back.

**Session in tRPC**: `createContext` calls `auth.api.getSession({ headers })` and puts
`{ id, name }` (or `null`) in `ctx.user`; `protectedProcedure` refuses `UNAUTHORIZED` without one.
The test hooks read the session the same way.

**Client**:
- `apps/client/src/lib/auth.ts` — `createAuthClient({ baseURL: <origin>/api/auth })`,
  `fetchSession()` (cached 30 s for route guards), `resetSession()` (clears the whole query cache).
- `/signup` (`routes/signup.tsx`): pick a face (`arrival.faces`, public), name, email, password →
  `authClient.signUp.email` → `resetSession()` → `arrival.start({ avatarId })` (creates the draft)
  → `/arrive`. The name rule is checked under the field too.
- `/login` (`routes/login.tsx`): `authClient.signIn.email` → `resetSession()` → `/`.
- Sign-out on the Me tab (`routes/me.tsx`, `authClient.signOut()`).
- Guards in `router.tsx`: `requireSession` → `/login`; `requireCharacter` → `/arrive` when
  `character.me` refuses with `ARRIVAL_PENDING`; signed-in users skip `/login` and `/signup`.

**From account to character** ([[Coming Home]]):
- `arrivals` holds one draft per user (unique `userId`): the face and the answers, each saved as
  tapped, so the opening resumes after a reload (`arrivalService.startArrival`, `answerArrival`).
- `arrival.join` (`joinArrival`) creates the character (beat 1's party, its first day, the welcome
  edition) in one go; `characters` is unique on `userId`, so a retry cannot make two.
- Every character read goes through `loadCharacter()`, which throws `ARRIVAL_PENDING` when no
  character exists (no auto-create).

### Designed, not built (slice 9)

| ADR | What it adds |
|---|---|
| [[adr/0060-network-sightings-device-cookie-and-signup-caps|ADR 0060]] | Network sightings (salted IP hashes), a device cookie, sign-up caps (two accounts per device, three per network per day) checked in our auth bridge |
| [[adr/0061-linked-accounts-count-once-at-every-count|ADR 0061]] | Linked accounts counted once in every vote count; a nightly `links-refresh` job |
| [[adr/0063-moderation-state-on-the-user-roles-and-the-log|ADR 0063]] | Roles and moderation state as fields on Better Auth's `user`; an append-only moderation log |
| [[adr/0066-renames-through-a-name-snapshot-registry|ADR 0066]] | Renames once every 30 days through a registry |
| [[adr/0067-closing-an-account-retirement-and-erasure|ADR 0067]] | Closing an account retires the character; erasure after 30 days by a daily job |

None of these files, collections or fields exist yet. There is also no email verification,
password reset or OAuth today (the plan says "OAuth later").

## Key files

- `apps/server/src/auth.ts` (`createAuth`, `acceptName`, `CLIENT_IP_HEADER`), `src/app.ts` (bridge, `createContext`), `src/trpc/trpc.ts` (`protectedProcedure`)
- `apps/server/src/services/arrivalService.ts`, `src/trpc/routers/arrival.ts`
- `apps/client/src/lib/auth.ts`, `routes/signup.tsx`, `routes/login.tsx`, `routes/arrive.tsx`, `router.tsx`
- `packages/db/src/models/arrival.ts`, `character.ts` (unique `userId`)

## Rules to follow

- The browser talks to `/api/auth` on its own origin; never point the client at a different host.
- No procedure takes a character id from the client; the session decides.
- Never print or log `BETTER_AUTH_SECRET`; the dev and e2e secrets in scripts are for local memory mode only.
- Tests sign up real accounts through Better Auth (rate limit off only with the test hooks).

## Decisions (ADRs)

- [[adr/0001-same-origin-api-via-proxy|ADR 0001]] — first-party cookie through a same-origin proxy.
- [[adr/0011-arrival-draft-and-character-at-join|ADR 0011]] — the arrival draft and the character at the join.
- [[adr/0073-the-last-train-in-faction-as-an-answer-and-a-welcome-only-favour|ADR 0073]] — the party as an answer in the opening.
- Slice 9 ADRs above — proposed.

## Related

[[Coming Home]] · [[Server and API]] · [[Game Client]] · [[Moderation and Fair Play]] ·
[[Database and Models]]
