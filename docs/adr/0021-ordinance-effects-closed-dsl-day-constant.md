# ADR 0021 — Ordinance effects are a closed, bounded DSL owned by rules, applied as named modifiers that are constant for a City Day

**Status:** accepted (slice 3) · **Date:** 2026-09-29

## Context

Ten ordinances (design §10.1, GDD §15.3) change existing numbers for five City Days in one city:

| Ordinance | Effect |
|---|---|
| Public Works Order | job pay +10 % |
| Ward Fund | job pay −25 %, Iron from checked actions +25 % |
| Shift Hours Order | shift −1 Energy (never below 2), each shift adds two days to the streak |
| Street Permits | propaganda swing +15 % |
| Rally Permits | speech −2 Energy |
| Reading Room Grant | training Energy −20 % |
| Rest Day Order | Rested cap +50 |
| Open Doors | canvass chance +4 % |
| Ward Register | every Success counts two for Local Standing |
| Public Meetings Order | Faction XP +25 % |

CLAUDE.md requires three things of them: content is data; the rules package has no I/O; the result modal shows every number. The design also sets a hard limit: expiry must never destroy Rested.

The difficulty is time. Salary is credited per boundary crossed (ADR 0005), and Rested banks continuously over an absence that may span several ordinances.

## Decision

1. **A closed DSL in `packages/rules`** (`OrdinanceEffect`), validated by content with Zod `satisfies`, like `OriginEffect`:

   | Kind | Value | Example |
   |---|---|---|
   | `jobPayPct` | −25…+10 | |
   | `shiftEnergyDelta` | −1…0, `floor` 2 | |
   | `shiftStreakDays` | 1…2 | |
   | `swingPct` | 0…15 | `{ actionType }` |
   | `energyDelta` | −2…0 | `{ actionType }` |
   | `trainingEnergyPct` | −20…0 | |
   | `restedCapDelta` | 0…50 | |
   | `chancePct` | 0…4 | `{ actionType }` |
   | `standingMultiplier` | 1…2 | |
   | `ironPct` | 0…25 | `{ scope: 'checked' }` |
   | `fxpPct` | 0…25 | `{ scope: 'actions' }` |

   The bounds are `ORDINANCE_BOUNDS` in rules: the GDD's values, since the menu is closed. The content loader refuses an effect outside its bound, and more than one effect of a kind per ordinance. An ordinance is `{ id, name, line, effects[] }` in `packages/content`.
2. **One modifier set per city per City Day.** An ordinance is in force from a division boundary for five days, so `cityModifiers({ ordinance, moraleState, actorIsHomeFaction })` is constant for the day. It also carries *Fired up* (+10 % FXP), because morale is a modifier with the same shape. Pure helpers read it:
   - `actionEnergy`, `trainingEnergy`, `shiftEnergy`, `shiftStreakStep`;
   - `ordinanceCheckBonuses` (a `CheckBonus` named after the ordinance);
   - `rewardParts` (named bonus parts on the XP, FXP and Iron lines, each rounded half up on its own);
   - `swingMultiplier`, `standingPerSuccess`, `jobPayWith`, `restedCapFor`.

   `resolveTier1Action`, `resolveTraining`, `resolveShift`, `settleDays` and `projectEnergy` take the modifiers or the values derived from them.
3. **Cost ordinances change the cost only.** Rewards, the opinion swing and the Rested bonus are computed on the unmodified content Energy. The Rested share, though, is `restedUsed / cost paid`, so a fully covered 10-Energy speech still gets the full +50 %. *Rally Permits* says so explicitly. Reading Room and Shift Hours follow the same rule (a designer question, tech design §20.1).
4. **Per-day values are settled at the boundary.**
   - `cities` keeps `ordinance { id, fromDay, toDay, paperId }` and `ordinanceHistory` (the last four, 20 days).
   - The character settlement credits each ended day's half pay with **that day's** `jobPayPct`.
   - The settlement re-bases stored Energy and Rested to the boundary, piecewise over the days crossed, with each day's Rested cap (`projectEnergyThrough`). A day older than the history uses the base cap.
   - Within a day, `projectEnergy(state, now, max, restedCap)` uses today's cap. `CharacterView.restedCap` lets the client project the same way.
5. **Rested never shrinks.** Banking is `rested ≥ cap ? rested : min(cap, rested + overflow)`. A pool of 250 banked under Rest Day stays 250 when the order expires. It is spent down normally and does not bank again above 200.
6. **Standing ×2 is applied at write** (Ward Register). Each Success adds `standingPerSuccess` to `localStanding`, inside the ×N loop, so a later row's Standing bonus sees it. Nothing is retroactive.

## Consequences

- A new bounded ordinance is content-only when it uses an existing kind. A new kind is a rules change with its bound and tests, which is intended: the bounds are GDD numbers.
- Tickets show live costs and tags from the same helpers the server resolves with, so the odds and costs shown always match the result.
- Settlement now writes Energy once a day. Slice-1 tests that assert a stored `energy.updatedAt` across a boundary must be updated. The projection they compute is unchanged when no Rest Day Order is involved.
- Stored `ActionResult`s from slices 0–2 have no `parts` on reward lines. The field is optional, and the UI treats an absent field as none.
