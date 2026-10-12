# ADR 0085 — A contested city's rule is the largest bloc's: one card per party, shared cards add up, a shared card's votes split for the score

**Status:** accepted, built 10–12 Oct 2026 (voting rework, `docs/tech/voting-rework.md`; amends ADR 0027; slice 7 generalises it for Clearwater, ADR 0050) · **Date:** 2026-10-10

## Context

In the capital (and in Clearwater from slice 7), the approved design (`voting-simplified.md` §3.3–§3.4, the user's answer to §7 Q3) sets these rules:

- **One card per party**, chosen by the chain: the Mayor or Governor of that party (slice 7) → the party's top-seated player councillor → the Chair (slice 7) → the secretary's default.
- Two parties that choose the same rule share one card, and their seats add up.
- **Seats:** each district's parties are scored by the slice-4 formula, unchanged and unprinted: `w × ballotShare + (100 − w) × opinionShare`, with `w = 50 × min(1, ballots ÷ 10)`. **A party's ballots are the votes for its card.** Seats go by D'Hondt, as today.
- **The rule** is the card with the most seats behind it across the city. Ties go to ballots city-wide, then opinion share, then the cycle's seeded draw.
- The six-of-ten bar goes, so **a rule always passes**.

As built:

- `countDistrict` takes votes for names and sums them by party;
- `councilOrder` orders the branch motions;
- `divideCapital` has each bloc's locals follow their players and passes at 6 of 10;
- the capital's bootstrap may leave no rule in force.

## Decision

1. **`capitalBallot(parties, order)` (pure)** takes one entry per party from `partyCardOf`. It merges entries with the same `ordinanceId` into one card (`factionIds` and `by` concatenated) and orders the cards by `order` (`councilOrder` over the sitting council's seats, then the slice-4 tie rule). So the stored ballot has one to three cards. A district's screen reorders them by the parties' opinion shares there, at read time.
2. **The top-seated player councillor of a party** is the one with the highest count `total`, then the lower seat number. The capital's seat numbers are per district, so they do not rank across districts.
3. **A shared card's votes split equally between its parties** for the score (`cardBallots`), so the shares still sum to one and the turnout weight `w` counts each vote once. `dhondt`'s ballot tie-break takes the fractional ballots as they are.
4. **`decideCapitalRule`** works as follows:
   - a card's seats are the sum of its parties' seats in the new council;
   - the most seats wins;
   - ties go to the card's votes city-wide, then the sum of its parties' opinion shares (the city average), then the earliest of its parties in the cycle's draw (`drawOrderOf` seeded from the stored election seed);
   - `how` is `seats` or `draw`.

   It runs in the capital's count transaction next to the five district counts.
5. **The capital's bootstrap and conversion** put the largest bloc's card in force: the secretaries' defaults over the NPC council on the baselines. The capital never sits without a rule.
6. **Morale does not move in the capital**, as before (design §8.6). The Unrest rule is home cities' only.

## Consequences

- Coalitions need no rule of their own: two Chairs (slice 7), or two top councillors, who pick the same rule pool their seats.
- **The split is a default.** The alternative (each sharing party counts the card's full votes) would inflate a shared bloc's score. It is listed for the designer (tech doc §20, Q1).
- `countDistrict` keeps its shape. Its lines carry backers and no votes, and its `ballotsByFaction` comes from the cards.
- Slice 7 generalises the same functions for Clearwater (seven seats, one meter), and adds the Mayor and the Chair to `partyCardOf`'s chain, as a parameter.
