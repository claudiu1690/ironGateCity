# ADR 0082 — The push by party on the city's pressure, and the Unrest prize as an award paid by the boundary

**Status:** proposed (review 5 fix round; extends ADR 0022, 0028 and 0034) · **Date:** 2026-10-08

## Context

The user approved the rival header and the prize (review 5 #10; `docs/design/review-5-answers.md` §10.2–§10.3; GDD §14.11–§14.12).

The plate on rival ground shows four figures:

- **the push bar**, today's points taken from the home party, split by the two rival parties, against the 2-point cap;
- **the danger word**;
- **the goal**, points to Unrest;
- **the player's party's push this week**.

**When a rival home city enters Unrest**, every member of a pushing party who moved **at least 0.5 points there in the last seven days** gets **+50 Party XP**, a headline in their paper and, from slice 8, **Legacy +2**. The prize is paid **once per entry per city, and at most once in seven days per city**.

ADR 0034 stores the day's pressure on the city document as `rivalPressure { day, lost, prev }`, in thousandths. It has no split by party. The influence ledger (ADR 0028) has a row per leg with the actor as the source.

The morale record (ADR 0022) is written by the act that crosses the threshold, as `{ state, since, previous }`. A boundary's own crossing (a count with no voter) writes it too.

Awards (ADR 0028) are written by city days with a unique `{ kind, ref, characterId }` and are credited by the member's settlement.

## Decision

1. **The push by party lives on the pressure the act already writes.** `rivalPressure` gains:
   - `byFaction` (today, in thousandths);
   - `week: Array<{ day, byFaction }>` (the six days before today).

   `addPressure(p, today, takenK, actor)` keeps both. A new day moves today into `week`, and days older than seven are dropped. Both are written by the act's existing `$set` in the act's transaction (`moveOpinion`). So the push bar's split and *your party has pushed 4.2 this week* are pure reads of a document the view already loads, with no aggregate on a read.
2. **The prize is decided at the city's boundary** (`processBoundary`, inside its guarded transaction) by a pure `unrestEntry`:
   - It looks at the morale record after the boundary's own transition. A record in `unrest` whose `since` differs from `city.unrestPrize.entry` is a new entry, and it is considered exactly once.
   - It **pays** when the last payment was seven or more days before, or there was none.
   - Either way the city records `unrestPrize { entry, paidDay }`, so a town that wobbles at the line pays nobody twice and a skipped entry never pays later.
3. **Who is paid** comes from one aggregate over the influence ledger, run only when an entry pays:
   - the rows matched are the home party's negative `action` legs at that place in the seven City Days before the boundary, sourced from a character;
   - the match uses the existing `{ placeId, cycleKey }` index with the cycle keys of those days;
   - the sum is grouped by character, and members of the home party are dropped;
   - a member qualifies at 500 thousandths or more.
4. **The payment is an award.** `awards` gains:
   - `kind: 'unrest'`;
   - `fxp` (default 0);
   - `meta { pushedK, top }`, where `top` is the names of the top three in the member's own party.

   The boundary writes the awards with upserts on `{ kind: 'unrest', ref: 'unrest|{cityId}|{entry}', characterId }`. The member's settlement credits `fxp` once (`creditedAt`), as it does hero and Issue awards, and prints the line *Duskwall in Unrest · you pushed 1.8 points this week · +50 Party XP*. The paper's headline is composed at read from today's unrest award. Slice 8 credits Legacy +2 from the same award ref.

## Consequences

- No new job, collection or index.
- An act writes two more small fields on the city document it already writes.
- **Double pay is excluded** by three guards that do not depend on each other:
  - the boundary's `settledDay` guard (a re-run throws `AlreadySettled`);
  - the award's unique index;
  - `unrestPrize.entry`.

  **Farming** is bounded by the seven-day rule per city and by the home share's floor and recovery.
- A member with two rival home cities can earn the prize in both, so up to 100 Party XP a week. This follows the rule as written per city; it is a question for the designer.
- **Pressure written before this round** has no split. The bar shows that day's total without the two colours, and the week ring starts empty (local databases only, so nothing is backfilled).
- An award written after a member's settlement that day is credited at the next settlement. This is the hero award's existing behaviour, and the line says when it was earned.
