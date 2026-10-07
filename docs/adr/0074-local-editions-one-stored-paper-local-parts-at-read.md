# ADR 0074 — Local editions: one stored paper per player, its local parts composed at read

**Status:** accepted, built in the review 4 fix round (7 Oct 2026; replaces the "which paper" rule of `docs/tech/slice-4.md` §11.1 and `docs/tech/slice-5.md` §11.1; extends ADR 0023) · **Date:** 2026-10-06

## Context

Review 4 (`docs/design/review-4-answers.md` §23, GDD §3.3) settles whose paper a player reads.

- **Every player has one paper: the paper of where they live.** In another city it is printed in a **local edition**: *The Coalport Clarion · Duskwall edition*.
- The dateline, the ambient headline, one local line, the local Issues (first) and a line on the local election are **that city's**.
- Personal headlines, orders, Letters and the desk **follow the player**.
- The Herald is the capital resident's own paper. It is no longer forced on visitors to the capital.

Today the settlement prints one edition a day. The edition is stored with `cityId = paperCityFor(c)`: the Herald when the character stands in the capital, otherwise the residence. Its headlines (personal, city and ambient) are chosen at that moment. `paper.today` merges the live political lines into it (ADR 0023) and, for a visitor's Herald, the capital's city lines. The edition is printed once, but the player may move between cities several times a day.

## Decision

1. **What is stored stays as it is, and it is always the residence's paper.**
   - `paperCityFor` returns the residence city whatever the position (renamed `paperCityOf`).
   - The settlement prints personal, city and ambient lines from the residence's templates, as before.
   - The welcome edition is unchanged.
2. **The edition is a read-time view.**
   - At `paper.today` the reader's city is computed: the journey's destination while on a train, else `cityId`.
   - When it differs from the edition's `cityId`, the response carries `edition: { cityId, cityName }`, and the dateline names that city.
   - Nothing is written. Moving city changes the edition at the next read.
3. **One pure function composes the headlines:** `composeHeadlines` in `packages/rules/src/paper.ts`.
   - At home it is today's `mergeHeadlines`.
   - Away, it drops the stored ambient line and prints, capped at three:
     - personal lines (stored and live, at most two);
     - **one** local line;
     - the residence's city lines;
     - the local city's ambient line for the day (`ambientFor(templates, day)`, the same rotation the settlement uses).
4. **The local line.**
   - In the capital it is the first of the Herald's city lines for the day, selected with the visitor facts already built (slice 4). This moves the old visitor block into the edition.
   - In a home city it comes from **neutral `{city}` templates** that do not exist yet. Until the designer writes them, no local line is printed in home-city editions, and the ambient line takes the slot (`docs/tech/review-4.md` §22 Q2).
5. **Issues and elections.**
   - `PaperView.issues` lists the local city's two Issues first (`local: true`), then the residence's two.
   - `localElection` is a non-actionable line when the local city's council is in nominations or polling.
6. **An edition stored before this change** keeps its stored `cityId`, so a visitor's Herald printed this morning still renders as the Herald. The edition line is computed against the stored `cityId`, never against today's rule.

## Consequences

- Each read costs at most one city-day lookup (the local council's calendar) and the local city's two Issues. The capital's facts were already read for visitors.
- The arrival modal's `heraldVisitor` knock-on loses its meaning and is removed.
- Clearwater (slice 7) needs no special case: the Courier is the lake resident's paper, and a visitor reads their own paper's Clearwater edition. Slice 7's "the Herald's rule" for the Courier is replaced (`docs/tech/review-4.md` §20).
- If the designer later wants the residence's city lines dropped away from home, only the order inside `composeHeadlines` changes.
