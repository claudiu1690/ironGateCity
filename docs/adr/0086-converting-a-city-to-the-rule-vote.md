# ADR 0086 — Converting a city to the rule vote: a guarded step of the city day, as of the city's settled day; deposits refunded once by migration 009

**Status:** accepted, built 10–12 Oct 2026 (voting rework, `docs/tech/voting-rework.md`; follows ADR 0017's bootstrap and the slice-4 `needsIssues` pattern) · **Date:** 2026-10-10

## Context

The rework switches every council city from the old model (an election for people, an order paper divided at day 2) to the rule vote (ADR 0083, 0084, 0085) mid-cycle. Everything is local only, but databases on `pnpm dev` (Docker) persist, so the switch must be written properly:

- **The rule in force:** its window must move to the new calendar without changing any day that has already been settled.
- **The live documents:** the open order paper or the divided one, filed candidacies, person ballots cast on days 2–4 and deposits waiting to be returned all have to become new-model state.
- **Concurrency:** the API and the worker both start up and both settle cities (ADR 0017).
- **The guard:** no new-model boundary may ever run on an unconverted city.

The documents describe the city as of `world.settledDay` (S), not the wall clock. A city idle for days is caught up boundary by boundary after S.

## Decision

1. **The conversion is a city-day step**, `convertCityVoting(content, cityId)` in `apps/server`.
   - `settleCityDay` runs it before any boundary when `world` exists and `world.voting !== 2`, as it runs `bootstrapIssues` when `issues` is missing.
   - It is one transaction per city, which ends with `City.updateOne({ _id, 'world.settledDay': S, 'world.voting': { $ne: 2 } }, { $set: { 'world.voting': 2, … } })`. A miss throws `AlreadySettled`, and the loop re-reads.
   - Bootstraps write `world.voting: 2`.
   - The worker's `runCityDay` at start converts every city. The request path converts any city it touches first.
2. **It converts as of S** (cycle k, `start`, cycle day `cd`):

   | What | Days 0–1 (`cd ≤ 1`) | Days 2–4 (`cd ≥ 2`) |
   |---|---|---|
   | **The rule in force** (what ran on S) | Extended to `start + 5` | Clipped to `start + 5` |
   | No rule ran on S | Card 1 (the home party's, or the capital's largest bloc's) from `S + 1` to `start + 5` | same |
   | **Ballot k − 1** | `counted`, `result.how: 'carried'`, the winner the rule in force, old fields under `legacy` | same |
   | **Ballot k** | `open`, the old paper's items, votes and division under `legacy` | `set`, cards from council k's rules and the morale state on S, under `legacy` as well |
   | **Council k's terms** | `rule` = the ordinance the player proposed on paper k, else the faction's default (`branchMotion`); locals from content | same |
   | **Open election k** | `filed` → `standing` with the default rule; struck and withdrawn untouched | person ballots deleted and `ballots: 0`: members vote again, on the rule |

   - Only future days of a window move (`start + 5 > S`). The history entry for the rule in force moves with it, so ADR 0021's per-day reads of settled days do not change.
   - `paperId` points at ballot k − 1, because the rule in force in cycle k is always ballot k − 1's result.
   - Counted elections and their votes are history and are not touched. Views read old count rows tolerantly (`backers ?? endorsements`, no `votes` column).
3. **Migration 009 (`packages/db`, `ensureIndexes`) refunds the deposits.** For each `candidacies { deposit: 'due' }`, one transaction:
   - flips the candidacy to `returned` (the guard);
   - credits the character `pc + 10` up to the cap, with `version + 1`.

   A second run matches nothing. The refund is world-independent, so it does not wait for a city. Index changes come from the schemas (`syncIndexes`): the `deposit: 'due'` partial index is dropped and `votes { electionId, ordinanceId }` is added.
4. **Checked by a script, not a unit test** (the user's 8 Oct rule): `apps/server/scripts/checkVotingConversion.ts`.
   - It runs on a memory replica set and writes old-shaped documents for every home city and the capital, at each cycle day 0–4.
   - It runs the conversion twice, then the next count.
   - It asserts the table above and the refund's single credit, and exits non-zero on any failure.

## Consequences

- No new-model boundary can see old state, whether the worker or the API starts first, and whatever the city's lag.
- A proposal's 20 PC is not refunded: the proposal becomes the councillor's rule, which is what it paid for. A council vote cast on days 0–1 is dropped, because no division follows.
- Ballots cast for people on days 2–4 of the switch cycle are discarded: they cannot be read as rules. Their +0.5 morale stays. This affects only local databases.
- Candidates who withdrew or were struck in the switch cycle cannot stand again in it, because of the unique `{ electionId, characterId }`. They stand from the next cycle.
- The step runs once per city per database and costs one read by `_id` after that.
