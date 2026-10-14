---
type: runbook
title: Add a Mission
aliases: [new mission, add mission]
tags: [content, missions]
updated: 2026-10-14
---

# Add a Mission

**Use when:** you want a new tier-2 mission at an existing place. Content is data: no code changes
(project CLAUDE.md, engineering rule 4). For a new place first, see [[Add a Place]]. Background:
[[Missions]], [[GDD#13.2 Mission anatomy|GDD §13.2]], [[GDD#13.3 Mission types|GDD §13.3]],
[[design/slice-5-risk#4. Missions (tier 2): the rules|slice-5 design §4]].

## Steps

1. **Design it first** (game-designer). Write the mission in the design doc of the slice or round
   (as `docs/design/slice-5-risk.md` §5 does): place, type, Level, who may do it, target, the
   briefing, two or three ways with hints, and the three outcome texts. Check the content policy if
   it is Vanguard or Duskwall text ([[design/content-policy-review#7. The checklist for future Vanguard content (the content policy, Appendix C #7)|checklist]]).
2. **Pick the type.** One of six: `speech`, `surveillance` (legal), `vandalism`, `disruption`,
   `sabotage`, `theft` (illegal). The type fixes Energy, Heat, run-in base, caught chance, record
   marks and rewards in `packages/rules/src/constants.ts` (`MISSION_TYPES`). **Rewards are not
   data**: they follow from the type and Energy at the [[GDD#5.5 Reward rates per mission tier (starting values)|GDD §5.5]]
   tier-2 rates.
3. **Open the city's mission file**: `packages/content/src/data/missions/<city>.ts`. Missions are
   listed by place id (`MissionsByPlace`); the city file attaches them with `withMissions(...)`
   (`missions/attach.ts`). A place id that is not in the city throws.
4. **Fill the fields** (schema `Mission` in `packages/content/src/schemas.ts`):

   | Field | Rule (checked by the loader) |
   |---|---|
   | `id` | `<place id>.<slug>`, unique across actions and missions |
   | `name` | ≤ 80 chars, says what and where in plain words |
   | `tier` | `2` |
   | `type` | from the six |
   | `energy` | must equal the type's Energy (speech 15, surveillance 12, vandalism 10, disruption 15, sabotage 20, theft 15) |
   | `level` | 6, 8, 10 or 12 |
   | `difficulty` | must equal `missionDifficulty(level, city.role)` (`packages/rules/src/missions.ts`): 14 / 16 / 18 at home for Level 6 / 8 / 10; 20 in the capital at Level 10 |
   | `requires.rank` | `3` on every illegal type, never on a legal one |
   | `target` | illegal types only: a faction id, or `'leader'` (only in the capital). A mission at an HQ targets that HQ's party |
   | `pool` | 1–4 opponent ids from `opponents.ts` (the run-in draws from it) |
   | `briefing` | ≤ 300 chars and ≤ 4 sentences |
   | `ways` | 2–3; `id` is the stat (`str`, `agi`, `int`, `cha-int`, `best`), unique; at most one `best`; `title` ≤ 60; `hint` ≤ 90; optional `heat` (0–30) and `runIn` (0–90) for a louder way |
   | `text` | `success`, `partial`, `failure`: headline ≤ 80, body ≤ 240 chars and ≤ 4 sentences; **no `{placeholders}`** |
   | `card` | optional: a `scene` asset that overrides the type's card |
   | `window: 'night'` | optional: night only, at the night rate. A night mission's ways carry no window; a day mission keeps at least one way without one |

5. **Keep the day ladder whole.** Every Level a city offers needs at least one mission without a
   night window.
6. **Art: usually nothing to do.** Missions never get unique art
   ([[GDD#13.5 Art for missions: the fallback ladder (new)|GDD §13.5]]). The result picks, in order:
   the mission's `card` → the type's card (`missionCards` in `packages/content/src/data/art.ts`) →
   the place kind's scene (`scenes` in `art.ts`) → a crop of the city map at the pin
   (`missionArt` in `apps/server/src/services/missionResult.ts`). Only if you set a new `card`:
   add the asset in `art.ts` (`scene(key, alt)`, source `mvp/scenes/<key>.png`), run
   `pnpm art:build`, then `pnpm art:check`.
7. **Numbers.** If the mission needs a number that differs from the GDD (a new Energy, a reward
   rate), change the GDD in the same piece of work and say so (engineering rule 7). Pacing is
   checked against `docs/economy.md`.
8. **Update the GDD and the wiki**: the city's mission list in the design doc, the city page
   ([[Coalport]], [[Duskwall]], [[Ashford]], [[Irongate]]) and [[Keep the Wiki Current]].

## Checks before done

- The content loads. The server validates content at start (`getContent()`); a quick check without
  the server: run `loadContent()` from `packages/content/src/load.ts` with `tsx` (it throws a list
  of every problem).
- The fast check: `pnpm art:check && pnpm turbo run lint typecheck build` (turbo cache, never
  `--force`).
- The missions e2e project: `pnpm --filter @irongate/client exec playwright test --project=missions`
  (set `E2E_WEB_PORT` / `E2E_API_PORT` if the dev ports are busy).
- Play it: `pnpm dev:mem`, open http://localhost:5173, use the dashed **Dev** button to give the
  Level and Rank, and check the ticket, the briefing, each way and the result modal. Odds show as
  words (*Good odds · Intelligence*), never a percentage.

> [!warning] Drift
> The 8 Oct 2026 workflow names `pnpm check` and `pnpm e2e:only`. **Neither script exists** in
> `package.json` yet (planned, not built). Use the commands above.

## Related

[[Missions]] · [[Add a Place]] · [[Add or Change Game Text]] · [[Content Package]] ·
[[Checks and Testing]] · [[Art and Maps Pipeline]]
