# ADR 0023 — The paper's political sections are live at read; political headlines are merged into the stored edition by priority

**Status:** accepted (slice 3; extends slice-1 tech design §10 and ADR 0005) · **Date:** 2026-09-29

## Context

The Morning Paper edition is printed at the character's settlement and stored (`paperEntries`, ADR 0005).

Slice 3 adds three political sections:

- **Polling Day**, whose state changes within the day (voted, filed, endorsed);
- the **front page** on the morning after a seat is won, with the ELECTED stamp animated once;
- about fifteen **political headlines** per paper (the count, the seat, *Your Vote Counted*, the division, the ordinance in force, *Stands Firm*).

ADR 0017 makes the count precede every settlement, so they *could* be baked. But then a late count (the degrade path) would leave a day's edition without its biggest news, and a stored edition would duplicate the voter's choice (ADR 0019).

## Decision

- **Polling Day, the front page and the count table are views,** built at read by `politicsService` from `elections`, `candidacies`, `votes` (the caller's own row), `officeTerms`, `ordinances` and the city document. `paper.today` returns `pollingDay`, `frontPage | null` and the merged `headlines`. The HQ council card (`city.get`) and the Paper tab dot (`character.me`) use the same builder.
- **Political headline templates** are content with political condition kinds only: `seatWon`, `seatLost`, `filedYesterday`, `votedFor`, `termEnded`, `divided`, `movedYesterday`, `countToday`, `phaseToday`, `ordinanceFromToday`, `leftUnrest`.
  - The settlement's selector never picks them, and the live selector picks only them.
  - Placeholders are resolved on the server, except the time tokens `{until}` and `{at}`. Those travel as epoch ms beside the text and are rendered in the player's local clock (*Tuesday midnight*, *01:00 on Sunday*).
- **Merge by priority.** The stored edition records each headline's `priority`; older editions look it up by `templateId`. `mergeHeadlines(stored, live)` in rules keeps the slice-1 shape:
  - up to two personal headlines by priority, live first on a tie;
  - then city headlines to three;
  - then the stored ambient headline if there is room.

  When the front page is shown, the seat headline is left out of the block, so it is not printed twice.
- **The stamp animates once.** `officeTerms.frontPageSeenAt` is set by `paper.markRead` (a conditional `$set` where null, idempotent) for the caller's terms that began today. `frontPage.animate = frontPageSeenAt === null`.

## Consequences

- The paper always agrees with the ballot, the count table and the chamber, even when the count ran after the edition was printed.
- `paper.today` does about five more indexed reads. It is read once or twice a session.
- A stored edition's `noPersonal` city headline can appear beside a live personal headline on a count morning. This is accepted: it is cosmetic and rare.
