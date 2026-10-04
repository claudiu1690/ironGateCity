# ADR 0044 — Laws are a third modifier source with per-effect `appliesTo`, bounded by `LAW_BOUNDS`, read from a day-keyed projection

**Status:** proposed (slice 7; extends ADR 0021 and ADR 0030) · **Date:** 2026-10-04

## Context

Parliament passes **laws** from a closed catalogue of thirteen (design §7, GDD §15.8). A law:

- lasts 7–28 days, everywhere, at most five at a time, one of each;
- changes numbers that exist: pay, seniority, Iron, mission XP, Energy, training, the propaganda swing, journey times, run-ins at night, the infirmary's price, bail, the fade of minor marks, Heat cooling and the caught check;
- is **factional** when an effect names a party's members, or everyone not of it (36 of 60 to pass);
- **never touches Party XP or the odds of a check.**

ADR 0021 made council rules a closed, bounded DSL of day-constant named modifiers. ADR 0030 made ordinances and Issue effects a list of named sources, combined by kind. The settlement credits each ended day with that day's sources (wages, the Rested cap), and slice 5's Heat cools by a per-day rate.

## Decision

1. **A law is a third `ModifierSource` kind (`'law'`)**, gathered after the ordinance and the Issue effects by ADR 0030's builder. Each kind combines by ADR 0030's table unchanged, each law named on its own line or tag (kicker *LAW*).
2. **`appliesTo: 'all' | 'members' | 'others'` is per effect.**
   - `lawSource(law, actor)` keeps the effects that apply to the actor's faction (the Special Powers Act has one members-only effect, and one about missions against its party).
   - `caughtDelta { scope: 'againstFaction' }` applies when the mission's target is the law's party.
   - Ordinances and Issue effects may not carry `appliesTo`.
3. **Seven new kinds, each touching one function:**

   | Kind | Function |
   |---|---|
   | `xpPct` | an XP part, in `rewardShares` |
   | `missionEnergyDelta` | the mission's cost (rewards on the content Energy) |
   | `journeyTimePct` | `journeyMinutes`, at boarding |
   | `runInPct` | `runInChance`'s multiplier |
   | `infirmaryCostPct` | the walk-out's price line |
   | `markFadeDays` | `liveMarks` |
   | `caughtDelta` | `caughtChance` |

4. **`LAW_BOUNDS` in rules**, enforced by the loader:
   - a bound for each kind a law may use (the catalogue's values, the GDD's ranges for the new kinds);
   - a kind absent from `LAW_BOUNDS` is refused, and so are **`fxpPct` and `chancePct`** in particular;
   - the loader computes factional (31 or 36) from the effects, and the content test compares it with the design's table.
5. **The law book is the `laws` collection** (one row per law in force: from, to, an early end and why). **The read path uses a projection** on the `nation` document (ADR 0043): the laws in force and those ended within 60 days. `lawsOnDay(projection, day)` is pure, so a past wage day, a past Heat day and a past fade day take *that* day's laws, as ordinances do (ADR 0021 §4). Expiry is by the calendar and writes nothing.
6. **Two exceptions to "day-constant":**
   - **The Curfew's night window** (`runInPct { window: 'night' }`, GDD §2.2) is read at the act's time. The modifier set stays day-constant; the effect carries an explicit window flag.
   - **`markFadeDays` is monotone**: minor marks are gone once *any* day since the latest mark met that day's fade. A law that ends never brings a mark back.
7. **Control's +25 % Heat for rivals** (design §8) is **not a law kind**. It is a place factor, read with the district's or Clearwater's state.

## Consequences

- A new bounded law using existing kinds is content only. A new kind is a rules change with its bound and a test, as for ordinances.
- The economy's numbers (§21.3) become rules tests: the catalogue cannot drift from the sheet.
- Party XP pacing and the §8.4 band are untouched by Parliament by construction: the loader refuses the kinds that would touch them.
- The ticket and the modal show a law exactly as a council rule, so players learn one pattern.
- The projection makes the laws a free read (on the document read anyway). Keeping 60 days of history covers the settlement's 14-day wage window and the 14-day fade.
