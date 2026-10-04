# ADR 0031 — Missions: their own list on a location, one pure resolver, the way remembered on the character

**Status:** accepted, built in slice 5 · **Date:** 2026-10-03

## Context

Slice 5 adds tier-2 missions (GDD §13.1–§13.3, `docs/design/slice-5-risk.md` §4–§5): 22 missions at 21 places. A mission has a briefing, two or three **ways** (a stat, a hint, and sometimes its own Heat or run-in chance), a Level, a Rank and a Standing gate, an optional target faction (`leader` in the capital), an opponent pool, and three outcome texts. It resolves Success, Partial or Failure on one roll, then the street's two rolls (ADR 0032). The game remembers the way the player chose.

Content's `Action` is a Zod discriminated union on `type` (`canvass`, `speech`, `propaganda`, `intelligence`, `council`, `training`). The design (§19 Q1) proposes a third member, `Mission`. Two problems:

- A speech mission's `type` is `speech`, which collides with tier-1 `speech` in a union discriminated on `type`.
- About forty readers of `location.actions` assume tier 1: ×3 and its costs, Rested, the stat guide's counts, the Places list, `isCheckedAction`, and the orders' `kinds: ['checked']` matches (*Six wins*, *Five attempts*).

## Decision

1. **`Location.missions?: Mission[]`**, separate from `actions`. Ids are unique across actions and missions (`{locationId}.{slug}`). `GameContent.mission(id)` returns `{ city, location, mission }` and `missionsAt(locationId)` lists a place's missions. The loader runs the same checks on missions as on actions (ids, text lengths and sentences, the vocabulary), plus mission-specific ones.
2. **Rules own the type table.** `MISSION_TYPES` holds, for each type: Energy, Heat, the run-in base, the caught base, marks, whether it pays Party XP, the opinion mode (`persuade`, `against` or none), the Iron multiplier, and the type that orders and Issues see. The difficulty ladder is `missionDifficulty(level, cityRole)`. Content states each mission's Energy and difficulty, and the loader holds both to the rules, so any deviation has to be a deliberate change to the loader.
3. **One pure entry point.** `resolveMission(input, rng)` spends the Energy and makes the check. It returns:
   - the held rewards: the result as rolled, plus its *dropped* twin, which is Failure's XP only;
   - the Heat gain;
   - the run-in roll and the opponent.

   `finishMission(start, street)` then applies the street's outcome: the run-in, the caught check, the record, and the cells or the infirmary. Both are deterministic per seed.
4. **A mission is an `ActionDescriptor` of kind `mission`.** Its `type` is the one orders and Issues see:
   - a speech mission is `speech`;
   - extended surveillance is `intelligence`;
   - an illegal type keeps its own name.

   So speech and intelligence orders and Issue feeds count missions, and `kinds: ['mission']` matches any mission (the new slot-B order). The slot-C orders' `kinds: ['checked']` does not count missions. No `tier` match field is needed.
5. **The log and the result.** `actionLogs.kind: 'mission'`. `ActionResult` gains `mission` and `street`, and the slice-4 result modal renders it, with a run-in block added.
6. **The remembered way** is `characters.ways: Array<{ missionId, wayId }>`. The catalogue bounds it. It is set when the mission starts, so a run-in or a retry cannot lose it.

## Consequences

- None of the slice 1–4 code that reads `location.actions` changes. The ticket, the breakdown and the result reuse the tier-1 machinery (`computeCheck`, `computeRewards` with tier-2 rates, order advancement, Issue tags).
- A new mission is a content-only change when its type exists. A new type is a rules change, bounded and tested, like an ordinance effect kind (ADR 0021).
- The client has two lists on a place sheet: the tickets, then the *Missions* kicker.
