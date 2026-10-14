---
type: tech
title: Rules Package
aliases: [packages/rules, Rules, Game Maths]
tags: [tech, rules]
status: built
slice: "0; grown every slice to 5, review rounds, voting rework"
gdd: ["§8.4", "§5.5", "§6"]
adrs: ["0002", "0005", "0021", "0030", "0033"]
updated: 2026-10-14
---

# Rules Package

## In one paragraph

`packages/rules` (`@irongate/rules`) is the game's maths as pure TypeScript functions: state in,
result out. It has no database, no clock and no randomness of its own. The server uses it to decide
every outcome; the client uses the same functions to show odds and tick Energy on screen. It also
owns `constants.ts` (every number, with its GDD §) and `types.ts` (the shared vocabulary and the view
types the server builds and the client renders).

## How it works

- **Purity.** No `Date.now`, `Math.random`, `process.env`, `fetch` or `node:` import anywhere in
  `packages/rules/src` (checked 2026-10-14). The caller passes `now`, the seed and the state.
- **Seeded RNG** (`rng.ts`): `createRng(seed)` — a cyrb128 hash of the seed string feeds sfc32.
  `next()`, `int(min, max)`, `roll100()`. The same seed always gives the same rolls, so a stored
  seed can replay any result.
- **Where seeds come from** (server): `keySeed(characterId, idempotencyKey)` in
  `apps/server/src/services/keyGuard.ts` (HMAC-SHA256 with a per-process salt). A re-run of the
  same request's transaction draws the same rolls. Named streams split one seed: `${seed}:runIn`,
  `:choice`, `:damage`, `:caught` (`runIn.ts`). World draws use their own seeds: the Issues' week
  `sha256("${cityId}:${weekDay}")` and an election's NPC jitter seed, stored with the election.
- **Day maths** (`day.ts`): `dayKey(now)` (whole City Days since 1970, UTC), `dayStart`, `weekday`,
  the six-hour game day (`isNight`, `nextDusk`, `nextDawn`).
- **Exports**: `src/index.ts` re-exports every module; `@irongate/rules/testing` has fixtures for
  server and package tests.

### Modules

| Module | What it computes |
|---|---|
| `constants.ts` | Every number with its § (Energy 100, +5 per 10 min; Rested cap 200; check 50 + 4 × (stat − difficulty), 5–95; tier rates; levels…) |
| `types.ts` | Shared ids, DTOs and views (`ActionResult`, `CharacterView`, `GameErrorReason`, `BonusTag`, `RewardLine`…), about 2,800 lines |
| `rng.ts` | `createRng` (cyrb128 + sfc32) |
| `day.ts`, `week.ts` | City Day key, weekdays, game-day night; the Monday week of Issues |
| `calendar.ts` | The five-day council cycle by city offset: `cycleOf`, election and ballot keys, `boundaryWork` |
| `check.ts` | `computeCheck` (chance and bonuses), `tier1Difficulty`, `outcomeForRoll`, `bestTrainedStat` |
| `action.ts` | `resolveTier1Action` (×1 / ×3 rows, stamps, rewards, orders), `summarise` |
| `training.ts` | `trainingCost` (20 + 2 × stat), `resolveTraining` |
| `rewards.ts` | `computeRewards`, rounding half up, named bonus parts (Rested, Party order…) |
| `energy.ts` | `projectEnergy`, `spendEnergy`, `projectEnergyThrough` (Rested overflow) |
| `health.ts` | `projectHealth`, `healthNow`, `healthMax`, `treatmentPrice`, `treat` |
| `heat.ts` | `projectHeat` (integer units), `addHeat`, `heatState`, `coolRate`, `heatEta` |
| `record.ts` | Marks, record level, fading, `barredByRecord`, `strikeOldest` |
| `held.ts` | Sentences, bail, `arrest`, `admit`, `release`, `walkOut`, `deportation` |
| `runIn.ts` | `runInChance`, `pickOpponent`, `resolveRunIn`, `luckChoice`, `caughtCheck` |
| `missions.ts` | Mission difficulty, gates, ways, risk bands, night windows |
| `rivalGround.ts` | Rival ground state, the daily push cap, `rivalFxpShare` |
| `patrol.ts` | Night patrol bucket, chance and decision |
| `levels.ts`, `rank.ts`, `progress.ts` | XP per level, Rank from FXP, `applyGains` (level-ups, stat points, PC cap) |
| `standing.ts` | Local Standing level and its check bonus |
| `tally.ts` | The "Today" tally |
| `jobs.ts` | `jobPay`, seniority, `settleDays` (the wage of every ended day) |
| `orders.ts` | Party orders of the day (`ordersForDay`), progress, completion |
| `welcome.ts` | The welcome day and its first-day bonus |
| `paper.ts` | Headline selection, templates, the deck, `isPaperDue` |
| `opinion.ts` | `applyPersuasion`, `applyAgainst` (thousandths, sums to 100.000) |
| `ordinances.ts` | The closed effect DSL, `placeModifiers`, `sourcesOf`, `effects`, `actionEnergy` ([[Modifiers]]) |
| `morale.ts` | Morale states (≥ 80 / ≥ 60 / below), drift, Unrest entry and prize |
| `council.ts` | Ward vote, NPC slates, seat counts, stipends |
| `ruleBallot.ts` | The three rule cards and the home city's rule (voting rework) |
| `capitalCount.ts` | The capital's three-way count, D'Hondt seats, NPC fill, the largest bloc's rule |
| `district.ts` | District meters: drift, close race, control, comeback |
| `issues.ts` | The Monday draw, tags, points, resolution |
| `ledger.ts` | Scoreboard lines, heroes by level bracket |
| `residence.ts` | Move windows, registration refusals, room price |
| `travel.ts` | Legs, fares, journey cards and their one choice |
| `quarters.ts` | Which quarters and places are open by Level |
| `items.ts` | Equipped items, worn Charisma |
| `origin.ts` | The opening's effects, `buildNewCharacter` |
| `ambition.ts` | Chapter status, choice, check, rewards |
| `name.ts` | Name normalising and the 2–40 rule |
| `statGuide.ts` | Which stats a city's actions use |

## Key files

- `packages/rules/src/index.ts`, `constants.ts`, `types.ts`, `rng.ts`
- `packages/rules/test/` — 46 Vitest files (run with coverage); frozen under the 8 Oct rule ([[Checks and Testing]])

## Rules to follow

- No I/O. Take `now`, seeds and state as arguments; return plain data.
- Every number goes in `constants.ts` with its GDD §; if a number must change, change the GDD in the
  same work (`CLAUDE.md` engineering rule 7).
- One seed per keyed request; split it into named streams for separate rolls.
- View types live in `types.ts`, so server, `ui` and client share one definition.

## Decisions (ADRs)

- [[adr/0002-atomic-idempotent-actions|ADR 0002]] — results replayable from the stored seed.
- [[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]], [[adr/0030-modifier-sources-and-named-factors|ADR 0030]] — the effect DSL.
- [[adr/0033-heat-health-record-held-lazy|ADR 0033]] — the lazy risk timers.
- [[adr/0005-lazy-per-character-city-day|ADR 0005]], [[adr/0079-the-six-hour-game-day-one-night-seam-and-a-night-block-in-the-views|ADR 0079]] — day and night.

## Related

[[Architecture Overview]] · [[Lazy Timers]] · [[Modifiers]] · [[Stats and Checks]] ·
[[Content Package]] · [[Server and API]]
