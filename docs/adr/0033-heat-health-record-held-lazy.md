# ADR 0033 — Heat, Health, the record, the cells and the infirmary: lazy state on the character, `stays` as history, release on read

**Status:** accepted, built in slice 5; amended 2026-10-14 (Health on the HUD) · **Date:** 2026-10-03

## Amendment (14 Oct 2026)

**Health is always shown on the HUD**, at full too (review 4, GDD §6.1; built in `packages/ui/src/components/HudBar.tsx`; review 5 set the order Energy · Health · Heat · XP · Party XP). The first consequence's "Health only below full" is superseded; Heat is still shown only above 0. Storing *damage* rather than value (decision 1) still stands for its other reason: a level-up never leaves a full-Health player below full.

## Context

Plan rule 2: timers are lazy. `docs/design/slice-5-risk.md` §6–§9 add four pieces of personal state:

- **Heat**: 0–100, cools 5 an hour. A *Customs Strike* week cools it half again as fast.
- **Health**: max 100 at Level 1 and +5 for every Level gained (125 at 6, 145 at 10; QA n10), +10 every ten minutes. Lost only in fights.
- **The record**: marks with levels. Minor marks fade 14 City Days after the last offence. Any mark can be struck off for 30 Political Capital. A second arrest within seven days escalates.
- **The cells and the infirmary**: timers of 10–60 and 20 minutes, left by bail, by walking out or by discharging yourself. Release from the cells on rival ground is a deportation: a train home, and the city barred for 24 hours.

The paper reports arrests and stays the next morning. Slice 6 adds faction mates posting bail and visiting. CLAUDE.md: being away costs opportunity, never assets.

## Decision

1. **Embedded on the character** (read every session):
   - `heat { value, at }`. Cooling is projected piecewise by City Day at the **residence** city's rate. The rate is 5 an hour, raised by the `heatCoolPct` sources of that day, the same rule as the Rested cap (ADR 0030 §5). `at` advances by whole points so no cooling is lost on a write.
   - `health { damage, at }`. Max is derived from the Level. Storing *damage* rather than value means a level-up never leaves a full-Health player below full, which would show the HUD bar to someone who never fought.
   - `record { marks: Array<{ day, kind, logId }>, arrests: DayKey[] }`. A mark is one unit with its kind (`minor`, `moderate`, `serious`). The level, the fading of minor marks and the penalties are computed on read; writes prune.
   - `held { stayId, kind, cityId, locationId, since, until, bail, rivalGround, state: 'in' | 'out' } | null`.
2. **A `stays` collection**, one document per stay in the cells or the infirmary. It holds the reason, the sentence, the bail, how the stay ended, the Iron paid, and the deportation journey. It is history for the paper's headlines, the playtest report and slice 6 (`bailPostedBy`, `visits` exist and stay empty in slice 5). It also stores the release modal's result.
3. **Release on read.** Any read at or after `until` releases the character **as of `until`**:
   - from the cells: Heat is set to 25 at `until`. On rival ground, a fareless, cardless journey home starts at `until`, and the city is barred until `until + 24 h`;
   - from the infirmary: discharged at whatever Health the regen has reached.

   The stay is written and the pointer becomes `state: 'out'` until the release modal is closed (`held.close`). Bail, *Walk out well* and *Discharge yourself* are request-keyed acts (ADR 0008) on the same function.
4. **No scheduled job.** Correctness never depends on one. Readers treat `until ≤ now` as out (`heldNow`), and nothing another player or a count reads in slice 5 depends on the release being written. ADR 0025 added a tidy job so the database says where absent travellers are. If slice 6's presence or a mate's bail needs the same for the cells, it adds one there.
5. **The read order in `loadCharacter`**:
   1. the city days (ADR 0017);
   2. run-in luck (ADR 0032, as of its decide time);
   3. releases;
   4. the character's day (ADR 0005), so the morning's edition sees the release and the Heat of 25;
   5. a due arrival (ADR 0025), including a deportation's.

   Each step is a conditional catch-up that does nothing when there is nothing due.

## Consequences

- Heat, Health and the cells keep running while the player is away, cost nothing they own, and end on their own. A player who closes the game in the cells is free when they come back, and the paper reports it.
- The HUD shows Heat only above 0 and Health only below full, computed from the stored state. The client projects both between reads, as it does Energy.
- Being sent to the cells or the infirmary is a write inside the action or run-in transaction that caused it: the stay insert and the pointer. It is never a second step.
- A run-in resolved late by luck sends the player to the cells *as of its decide time*, so a player who comes back a day later finds the sentence already served.
