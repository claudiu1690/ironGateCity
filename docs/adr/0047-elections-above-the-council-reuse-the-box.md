# ADR 0047 — Elections above the council reuse slice 3's candidacies and numbered ballot box, with `factionElections` and `nationalElections` for the windows and the counts

**Status:** proposed (slice 7; applies ADR 0018 and ADR 0019); amended 2026-10-14 for the voting rework, see ADR 0083 and ADR 0084 · **Date:** 2026-10-04

## Amendment (14 Oct 2026)

The reuse of `candidacies` and `votes`, the two window documents, `termBackings[]` and the pure counts stand. The voting rework (10–12 Oct; GDD §15.1, §15.4, App C #106) changed what slice 3 hands this ADR:

- **No candidate needs backers.** The Chair's election has **no two-backer gate**: Rank 4, a completed council term, 14 days in the faction, **25 PC spent when the name is printed, never returned**. Backing stays **optional**: +3 to the Chair's total (10 PC, Rank 2+, one per member per Chair election, public). For the national vote backing is likewise optional (+1 to the party's score, at most +5; it orders the party's list).
- **No deposits and no striking.** Slice 3's candidacies no longer carry a refundable deposit, a strike at the close or the small-branch rule (ADR 0084). So the Chair's candidacy has no `deposit: 'due'`, the settlement's struck-Chair refund goes, and `CHAIR.backers` goes. The President's 100 PC is the one stake still returned (only on a withdrawal before the party's pick opens, GDD §15.5).
- **The secretary's backing** reuses the branch's backing as rebuilt by ADR 0084 (a free +3 on a day the candidate completes the three orders).
- **`votes` rows** carry `candidateKey` for the Chair, the pick and a vote on the Chair, and `ordinanceId` for councils (ADR 0083 §4); exactly one is set. The national vote's key is unchanged.

The Context above (two backers, deposits, the small-branch rule) is history. The slice-7 tech design's voting-rework note lists the build changes (`docs/tech/slice-7.md`).

## Context

Slice 7 adds four ballots, each one tap, secret and final, plus public backing:

- **the Chair's election**: per faction per term; names in, two backers, a vote with the secretary on the ballot, a count;
- **the party's pick**: per faction per term; the party's figure on the ballot;
- **the republic's vote**: per term; three candidates, any party;
- **a vote on the Chair**: on a petition or on entering Unrest.

Backing is public: 10 PC, one per member per Chair election and one per member per term nationally.

Slice 3 already has `candidacies` (deposits, endorsements, the secretary's endorsement on orders done, the small-branch rule) and `votes`: one row per voter per election, secret at the API and linkable only for the audit (ADR 0019). ADR 0018 serialises every window-bound act with the boundary that closes its window.

## Decision

1. **Reuse `candidacies` and `votes`** with new election keys:

   | Election | Key | Candidacy `kind` |
   |---|---|---|
   | The Chair's election | `chair:{faction}:{term}` | `chair` |
   | The party's pick | `pick:{faction}:{term}` | — (the ballot is the faction's `president` candidacies) |
   | The republic's vote | `nation:{term}` | `president` / `list` |
   | A vote on the Chair | `confidence:{faction}:{chairTermId}:{trigger}` | — |

   A candidacy's `kind` is `council` when absent. The unique `{ electionId, characterId }` keeps a member to one national candidacy a term (President *or* the list). ADR 0019's secrecy applies to every new key, and server tests assert it on the wire.
2. **Two new window documents:**
   - **`factionElections`**: the Chair's election and the votes on the Chair. Each has its own window, `filed` and `ballots` counters, the frozen ballot (players by filing, then `n:secretary`) and its result.
   - **`nationalElections`**: one per term, `nation:{term}`. It holds the three picks (embedded: ballot, counter, result), the frozen candidates, the national counter, the per-party backers and the count.
   Every act `$inc`s its window document filtered on the open status, which the close or count writes (ADR 0018), so an act racing a boundary is a conflict and a retry.
3. **Backing:**
   - public on the candidacy (`endorsements[]`), or `nationalElections.backers.{faction}` when backing the party's candidate;
   - the one-per-election guard is a new **`termBackings[]`** on the character (≤ 6, the current and the previous term). Slice 3's `endorsementsGiven[]` is pruned to four entries and would forget a 28-day window;
   - the secretary's backing reuses slice 3's hook (a member's three orders done in the window).
4. **The counts are pure** (`countChair`, `countPick`, `nationalScores`, `countNation`, `partyList`), run by the nation's day (ADR 0043):
   - the Chair at the boundary into term day 14;
   - the picks into 23;
   - **the national count into 27**, from that boundary's control snapshot, stored with every input (scores, `w`, ballots, backers, seats, lists, turnout), *to be confirmed tomorrow*;
   - **taking office into day 0**, a separate transaction.
5. **The party's own figure and the secretary are ballot lines** (`n:{npcId}`, `n:secretary`), never characters. They do not back, pledge, veto or draw pay.

## Consequences

- One ballot mechanism, one secrecy rule and one idempotency pattern for every election in the game.
- `candidacies` and `votes` grow by a few rows per member per term. Their indexes already serve the new keys.
- A result page is a stored count, not a recomputation, so the provisional day (and slice 9's audit) can check exactly what was counted.
- The national vote's input names a party (the three candidates are one per party and frozen), so no figure's id travels from the client.
