---
type: tech
title: Lazy Timers
aliases: [Timers, Lazy Timer, Computed on Read]
tags: [tech, pattern, rules]
status: built
slice: "0 (Energy); 1 (Rested, the day); 5 (Heat, Health, held); review 5 (patrol)"
gdd: ["§6.1", "§6.2", "§6.3", "§6.4", "§2.2"]
adrs: ["0005", "0017", "0021", "0030", "0032", "0033", "0079"]
updated: 2026-10-14
---

# Lazy Timers

## In one paragraph

Nothing in Irongate ticks on a server clock. Each timer is stored as **a value plus the time it
was true**, and the current value is **computed when someone reads it**, by a pure function in
[[Rules Package]]. Writes save the projected value and a new timestamp. So there are no per-minute
workers, a player who is away loses nothing, and the client can tick the same bar on screen with the
same function. Only real events at a set time are scheduled jobs ([[Scheduled Jobs]]).

## How it works

| Timer | Stored on `characters` | Rule (headline) | Pure function |
|---|---|---|---|
| [[Energy]] | `energy { value, updatedAt }` | Max 100, +5 every 10 min ([[GDD#6.2 Energy|GDD §6.2]]) | `projectEnergy`, `spendEnergy` (`energy.ts`) |
| [[Rested]] | `rested` (with Energy) | Regen that overflows a full bar banks here, cap 200 + sources ([[GDD#6.3 Rested (new)|GDD §6.3]]) | inside `projectEnergy`, `projectEnergyThrough` |
| [[Health]] | `health { damage, at }` | Max 100 + 5 a Level after the first; +10 every 10 min ([[GDD#6.1 Health|GDD §6.1]]) | `projectHealth`, `healthNow`, `healthMax` (`health.ts`) |
| [[Heat and Record|Heat]] | `heat { value, at }` | 0–100, cools 5 an hour at the **residence** city's rate of each day ([[GDD#6.4 Heat (new)|GDD §6.4]]) | `projectHeat`, `addHeat`, `coolRate` (`heat.ts`) |
| Record marks | `record { marks[], arrests[] }` | Level and fading worked out on read | `liveMarks`, `recordLevel` (`record.ts`) |
| Cells / infirmary | `held { until, state… }` | Released on any read at or after `until`, **as of `until`** | `heldNow`, `release` (`held.ts`) |
| Run-in deadline | `runIn` pointer + `encounters.decideBy` | Left to luck once the window passes | `luckChoice` (`runIn.ts`); server `runInDue` |
| Journey | `journey { arrivesAt, status }` | Arrives on the first read after `arrivesAt` (plus a tidy job) | server `ensureArrived` |
| The day | `day.settled` | Wage, paper, orders settle on first touch each City Day | `settleDays` (`jobs.ts`); server `ensureSettled` |
| Night | nothing stored | Last 2 hours of every 6 from 00:00 UTC | `isNight`, `nextDusk` (`day.ts`); server `nightAt` |

**Details that keep it exact:**
- Energy's `updatedAt` only advances by **whole ticks**, so the part-tick already waited is kept.
  What would overflow a full bar goes to Rested up to its cap; a pool already above the cap keeps
  its value and banks nothing more.
- Health is stored as **damage**, so a level-up never leaves a full player below full.
- Heat cools in **integer units** (a point is 3,600,000 × 2,000 units), so a write never loses or
  invents a part-point, and a rate raised by a source (the Customs Strike: 7.5 an hour) stays exact.
- The Rested cap and Heat rate depend on the residence city's [[Modifiers]] **for each day**.
  `capOn()` and `heatRateOn()` (`apps/server/src/services/modifiers.ts`, `risk.ts`) give a per-day
  function; the day settlement re-bases Energy (`projectEnergyThrough`) when a cap other than the
  base was in force, so the projection never mixes two caps.

**The read order** (`loadCharacter()`, `apps/server/src/services/dayService.ts`, from
[[adr/0033-heat-health-record-held-lazy|ADR 0033]] §5) — each step is a conditional catch-up that
does nothing when nothing is due:
1. the cities' days (`ensurePlaces`, ADR 0017);
2. run-in luck (`ensureRunInSettled`, ADR 0032);
3. releases (`ensureReleased`, ADR 0033);
4. the character's day (`ensureSettled`, ADR 0005) — so the morning paper sees the release;
5. a due journey (`ensureArrived`, ADR 0025).

**Inside an action** the transaction projects timers as of `now`, refuses with
`NOT_ENOUGH_ENERGY { energy, cost, nextTickAt }` if short, then writes the new value and timestamp
with the version guard ([[Atomic Actions and Idempotency]]).

**On the client**, `useCharacter()` (`apps/client/src/features/game/hooks.ts`) re-runs
`projectEnergy` every second against `serverNow()`; held minutes and countdowns tick the same way.
The server stays authoritative: at `until` the client asks again.

## Key files

- `packages/rules/src/energy.ts`, `health.ts`, `heat.ts`, `record.ts`, `held.ts`, `day.ts`, `constants.ts` (`ENERGY`, `RESTED`, `HEAT`, `HEALTH`)
- `apps/server/src/services/dayService.ts` (`loadCharacter`, `ensureSettled`, `computeSettlement`)
- `apps/server/src/services/risk.ts` (`heatTimerOf`, `healthTimerOf`, `heatRateOn`), `heldService.ts` (`ensureReleased`), `journeyArrival.ts`, `night.ts`

## Rules to follow

- Never add a job to move a timer. Store value + time; project on read.
- Pure projections take `now` as an argument; the server passes `ctx.now()`.
- Advance stored timestamps by whole ticks (or whole points) so nothing is lost.
- "Being away costs opportunity, never assets" (`CLAUDE.md` design rule 4): projections only add
  back (regen, cooling), they never take.

## Decisions (ADRs)

- [[adr/0005-lazy-per-character-city-day|ADR 0005]] — the character's day on first touch (amended 14 Oct 2026: the wage, ADR 0079's night).
- [[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]], [[adr/0030-modifier-sources-and-named-factors|ADR 0030]] §5 — the Rested cap by day.
- [[adr/0032-run-ins-pending-step-and-luck|ADR 0032]] — run-in luck on read.
- [[adr/0033-heat-health-record-held-lazy|ADR 0033]] — Heat, Health, record, held; release on read; the read order (amended 14 Oct 2026: Health always on the HUD).

GDD §2's units table now says Heat cools continuously, 5 an hour, not on the 10-minute tick, as `packages/rules/src/heat.ts` does (fixed 14 Oct 2026).
- [[adr/0079-the-six-hour-game-day-one-night-seam-and-a-night-block-in-the-views|ADR 0079]] — the night computed, never stored.

## Related

[[Energy]] · [[Rested]] · [[Health]] · [[Heat and Record]] · [[Jail and the Cells]] ·
[[Time and the Game Day]] · [[Scheduled Jobs]] · [[Modifiers]]
