# ADR 0049 — Petitions are set-once records closed at a boundary; dissolution vacates and strikes without new seats; removals act at the division

**Status:** proposed (slice 7); decision 2 amended 2026-10-14 (the rule runs out its window; GDD §15.9, ADR 0083) · **Date:** 2026-10-04

## Amendment (14 Oct 2026)

Decisions 1 and 3–5 stand. Decision 2 changes in two ways (GDD §15.9, settled 10 Oct 2026; `docs/tech/voting-rework.md` §20.1 Q16):

- **The rule in force is not struck. It runs out its window.** A city always has a rule (ADR 0083), so a dissolution no longer cuts `cities.ordinance.toDay` or its history entry. The "rule this council passed has its `toDay` cut to *d*" step is gone.
- **There is no order paper and no division.** The dissolve petition closes at the city's boundary **before the set** (the boundary into day 2), not before the division. On success the open rule ballot is not dissolved: it proceeds, keeping or taking its cards from the party's chain and the seated locals' rules.

Unchanged: the terms (and the Governor's) get `vacatedDay = d`, the Governor's chair passes to the bloc's top local, `city.council.dissolved = { day, petitionId }`, no new seats and no snap election. The title's "strikes" and Context's "the rule struck" are history.

## Context

Slice 7 adds three ways to end an office early (design §10, GDD §15.9).

- **A petition to dissolve a council.**
  - Rank 3+ residents open it on cycle days 0–2, 10 PC; residents of any party sign, 10 PC.
  - It closes at the second boundary after opening, always before the next count, and succeeds with the greater of three and a quarter of the eligible residents.
  - One per city every seven days. A Town Hall event adds townspeople's signatures.
  - On success: the rule struck, the Governor's chair to a local, every councillor's term uncompleted, locals sitting until the next result. There is no snap election.
- **A vote to remove the President**, tabled by a player (50 PC) or by the clerk when the President's party falls below the trigger. It is a bill needing 40 of 60 (ADR 0045). On passing, the runner-up takes the rest of the term.
- **A vote on the Chair**, after a petition of the greater of three and a quarter of the active Rank 3+ members, or on the home city entering Unrest. Two days; two thirds and at least three No votes remove the Chair.

## Decision

1. **One `petitions` collection** for both kinds:
   - `_id` `dissolve:{city}:{openedDay}`, with a unique partial index on the open petition per city;
   - or `chair:{faction}:{chairTermId}`, which makes it one per Chair per term;
   - signatures are embedded and set-once (`signatures.characterId: { $ne }`, `status: 'open'`, `$inc count`); the opener's signature is in the insert;
   - the 10 PC is spent in the same transaction with the version guard;
   - `needed` is computed **at the close** from the turnout roll (the council's) or the active Rank 3+ roll (the faction's).
2. **The city's boundary closes a dissolve petition before the division** (ADR 0017's order), so a dissolved council's rule never comes into force. On success, in the same transaction:
   - the council's terms (and the Governor's) get `vacatedDay = d`;
   - the open order paper becomes `dissolved` (no division);
   - the rule this council passed has its `toDay` cut to *d* (and its history entry, so wages are right);
   - `city.council.governor` passes to the bloc's top local;
   - `city.council.dissolved = { day, petitionId }`.
   **No new seats are created**: the next count is at most five days away, and nothing needs them before then.
3. **The Town Hall** (`special: 'petitionSignatures'`) adds 3 / 2 / 1 / 0 to the city's open dissolve petition in the event's resolution transaction (slice 6, ADR 0037). Slice 6's ordering resolves an earlier day's events before a boundary's close.
4. **A removal acts at its division** (the nation's day):
   - the runner-up of the term's count takes office from that day;
   - a player runner-up's deputy seat passes to the next unseated name on their list;
   - the removed President's term is vacated.
   The clerk's motion is tabled by the nation's day when `autoRemovalDue` holds: under 25 % of the **control share**, once a term, not on term days 0–4 or 24–27, seven days apart.
5. **A vote on the Chair** is a `factionElections` row of kind `confidence` (ADR 0047), opened by the nation's day (a petition succeeded, or Unrest entered at *d* with a player Chair) and counted two boundaries later. A removal vacates the Chair's term, clears `factions.chair` and the Chair's settings, and the secretary acts.

## Consequences

- Every early end is printed with its count, and nothing is destroyed: councillors lose the rest of a term, and that is all (losses belong to competition, GDD §4.3).
- No snap election keeps the calendar pure, and needs no new seats or jobs.
- A petition's counts are public (signatures are public); ballots on the Chair are secret (ADR 0019).
- At low population the thresholds' minimum of three makes a petition a small group's act. The report counts opened and succeeded, against Appendix C #68's lever.
