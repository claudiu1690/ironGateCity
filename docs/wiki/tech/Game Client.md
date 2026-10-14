---
type: tech
title: Game Client
aliases: [Client, apps/client, Frontend, UI package]
tags: [tech, client]
status: built
slice: "0; screens added every slice to 5, review rounds, voting rework"
gdd: ["§13.1a"]
adrs: ["0001", "0002", "0006", "0024", "0079"]
updated: 2026-10-14
---

# Game Client

## In one paragraph

`apps/client` is a React 19 single-page app built with Vite. It shows the map, the sheets, the
paper and the result modal, and sends one tRPC call per tap. It never decides an outcome: it shows
odds words and renders the breakdown the server returns. Shared look and components live in
`packages/ui` (Tailwind v4 tokens, the HUD, tickets, stamps, the result modal, the city map). The
client reads time from the server's clock, so a wrong phone clock never shows the wrong day or night.

## How it works

**Boot** (`src/main.tsx`): fonts and `index.css`, `initSentry()` (only with `VITE_SENTRY_DSN`),
`setClockSource(serverNow)` for every time in `@irongate/ui`, then `QueryClientProvider` +
`RouterProvider`.

**Routes** (`src/router.tsx`, TanStack Router):

| Path | Component (`src/routes/`) | Guard / notes |
|---|---|---|
| `/` | — | Redirects: no character → `/arrive`; on a train → `/journey`; held → `/held`; paper due → `/paper`; else the city (or last capital district) |
| `/login`, `/signup` | `login.tsx`, `signup.tsx` | Signed-in users go to `/` ([[Auth and Accounts]]) |
| `/arrive` | `arrive.tsx` | Session only; the opening, full screen, resumable |
| `/city/$cityId`, `/city/$cityId/$quarterId` | `city.tsx` (about 1,700 lines) | The map, place sheets, tickets, result modal; search params `loc`, `order`, `places`, `act` |
| `/nation` | `nation.tsx` | The nation map and boarding |
| `/journey` | `journey.tsx` | The train, its card, the arrival modal |
| `/held` | `held.tsx` | Cells or infirmary instead of the map |
| `/paper` | `paper.tsx` | [[The Morning Paper]] |
| `/me` | `me.tsx` | Character, stats, sign-out |
| `/story/ambition` | `ambition.tsx` | An Ambition chapter |
| `/council`, `/council/slate`, `/council/ballot`, `/council/count` | `council.tsx` | Council and the rule vote |
| `/dev/maps` | `features/dev/MapViewer.tsx` | Dev builds only; outside the sign-in guard |

The signed-in routes sit under one `app` layout route (`AppShell`) whose guard
`requireCharacter` also asks the dev panel's status.

**Features** (`src/features/`):
- `action/usePerformAction.ts` — one tap = one `crypto.randomUUID()` key; network retries reuse it;
  a second tap while in flight is ignored; on success it writes the fresh character into the cache.
- `council/` — `usePoliticalAct`, `useRuleVote`, `TownHall`.
- `street/` — `useMissionStart`, `RunInGate` (the run-in modal over the shell).
- `travel/useBoard.ts` — *Board* as one keyed tap.
- `game/` — `hooks.ts` (`useCharacter`: Energy ticks on screen with the rules' own `projectEnergy`),
  `errors.ts` (words a server refusal; the server's reason decides), `CellsNow`, `PatrolLink`,
  `trainingPlaces`.
- `dev/` — `DevPanel`, `MapViewer`, `devApi` ([[Dev Panel and Local Setup]]).

**Components** (`src/components/`): `AppShell` (HUD on top, tab bar or desktop dock, "paper is in"
line, ticker), `AuthLayout`, `DuskLine` (*Dusk in 40 min*), `MapSwitch` (City | Nation).

**Lib** (`src/lib/`):
- `trpc.ts` — `trpcClient` (`httpBatchLink` to `${apiBase}/trpc`, cookies included), the `trpc`
  options proxy, `gameErrorOf()` (reads `error.data.game`), `isNetworkError()`.
- `queryClient.ts` — refetch on window focus (short sessions), `staleTime` 10 s, one retry.
- `auth.ts` — the Better Auth client, `fetchSession()` (cached 30 s), `resetSession()`.
- `modalGate.ts` — tells the shell a result modal is open, so the orders-complete note waits.
- `useNow.ts` — `noteServerNow()` keeps the skew to the server clock; `serverNow()`, `useNow()`,
  `useMedia`, `useLocationLayout()` (sheet / side panel / centred panel).
- `useNightTurn.ts` — at the view's `night.changesAt` (+0–20 s jitter) refetches the listed
  queries, so the map turns at dusk and dawn without a reload ([[Night and Patrols]]).
- `sentry.ts` — lazy Sentry.

**Styling.** Tailwind v4 through `@tailwindcss/vite`. `src/index.css` imports `tailwindcss` and
`@irongate/ui/tokens.css`, and scans `packages/ui/src` for classes. `tokens.css` is a Tailwind
`@theme` with the Noir Lithograph palette (ink, paper, petrol, faction colours), fonts (Oswald,
Playfair Display, Source Serif 4, Courier Prime) and contrast notes.

**`packages/ui`** exports the shared pieces: `HudBar`, `Ticket`, `Stamp`, `ResultModal`
(`result.ts`, `odds.ts` for odds words), `CityMap` + `TileLayer` + `CloudLayer` (zoomable tiled
maps, [[Art and Maps Pipeline]]), `Picture`, `Paper`/`PaperSheet`, `Places`, `Street`, `Missions`,
`Travel`, `Held`, `Treatment`, `TownHall`, `RuleCard`, `Politics`, `RankLadder`, `Sheets`, `Gauge`,
`ProgressBar`, `FactionCrest`. It depends on Radix Dialog and `react-zoom-pan-pinch`.

**Dev server** (`vite.config.ts`): port 5173 (preview 4173); `/api` is proxied to
`API_PROXY_TARGET` (default `http://127.0.0.1:3001`) without changing the Host header
([[adr/0001-same-origin-api-via-proxy|ADR 0001]]); a small plugin serves map tiles from
`.art-cache/tiles` at `/tiles`.

**Client env** (names only): `VITE_API_BASE`, `VITE_SENTRY_DSN`, `VITE_TILES_ORIGIN`.

## Key files

- `apps/client/src/main.tsx`, `src/router.tsx`, `src/env.ts`, `vite.config.ts`, `vercel.json`
- `apps/client/src/routes/city.tsx` — the main screen
- `apps/client/src/lib/*.ts`, `src/features/*`
- `packages/ui/src/index.ts`, `packages/ui/src/tokens.css`, `packages/ui/src/components/ResultModal.tsx`

## Rules to follow

- Never compute a result. Show what the server sent ([[The Result Modal]]).
- One key per tap, made in the tap handler, reused by retries.
- Use `serverNow()` / `useNow()`, never the phone clock, for days, night and countdowns.
- Never compute the night: read the view's `night` block (ADR 0079).
- Plain words: odds words, not numbers; no dice maths on screen.

## Decisions (ADRs)

- [[adr/0001-same-origin-api-via-proxy|ADR 0001]] — same-origin API.
- [[adr/0002-atomic-idempotent-actions|ADR 0002]], [[adr/0006-repeat-actions-one-request|ADR 0006]] — one key per tap, ×3 in one request.
- [[adr/0024-tiled-maps-and-quarters|ADR 0024]] — tiles inside our own `CityMap`.
- [[adr/0079-the-six-hour-game-day-one-night-seam-and-a-night-block-in-the-views|ADR 0079]] — the night block in every view.

> [!note] Inference
> `apps/client` has no Vitest files; its tests are the Playwright specs in `apps/client/e2e`
> ([[Checks and Testing]]). Component tests live in `packages/ui/test`.

## Related

[[Architecture Overview]] · [[Server and API]] · [[The Result Modal]] · [[Quarters and the Map]] ·
[[Art and Maps Pipeline]] · [[Checks and Testing]]
