# ADR 0019 — The secret ballot: one `votes` row per voter, secret at the API, linkable only for the audit

**Status:** accepted, implemented (slice 3) · **Date:** 2026-09-29

## Context

GDD §15.3 and design §4.3 set the rules for the ballot:

- it is **single, secret and final**;
- "nobody, including the candidate, sees who voted for whom";
- there are **no running totals during polling**;
- every total is printed after the count.

The voter still sees their own choice: *Ballot cast for Anna Weiss*, *your vote* in the count, *Your Vote Counted: …*. A double vote must be impossible. The slice-9 audit (§15.2: accounts on the same network may not vote in the same election) has to be able to find vote-stacking.

Options:

- **A box with no voter id**, plus a register of voters (or a receipt on the character) to stop double votes. The voter's own "your vote" then needs a receipt linking them anyway. The audit could no longer see *what* a suspicious cluster voted for, only that it voted.
- **Encrypted choices.** A key the server holds protects nothing from the server, and adds key management for a game.
- **One row per voter holding the choice, secret by construction of the API.** This is the 1946 British numbered ballot paper: secret from everyone, and linkable only by the returning officer under an audit.

## Decision

- `votes { electionId, voterId, candidateKey, day, createdAt }`, with a unique index on `{ electionId, voterId }` (the double-vote guard, ADR 0018) and `{ electionId, candidateKey }` for the count's `$group`.
- **The API never returns another player's row, and never returns any total before `elections.status === 'counted'`.**
  - `council.election` during the polls carries no `ballots` field.
  - `elections.ballots` (the `$inc` that serialises votes with the count) is excluded from every view.
  - The caller's own choice is read by `{ electionId, voterId: me }`.
  - After the count, `CountRow.votes` are totals only.
- Nothing else stores the choice: not the character, not a paper edition (its political sections are live, ADR 0023), not `requestLogs` beyond its 7-day TTL (the vote modal names the choice to its voter).
- The playtest report aggregates votes per election and never prints a voter next to a choice.
- Server tests assert the secrecy on the wire: during the polls, no procedure output contains another voter's choice or any count.

## Consequences

- A double vote is impossible at the database level, and the voter's own receipt costs one indexed read.
- Operators with database access can see individual choices. That is the price of the audit. It is documented here and for the user (tech design §20.2), and access to production data is an operational control, not a game rule.
- Adding running totals later (Appendix C #25) is a view change, not a data change.
