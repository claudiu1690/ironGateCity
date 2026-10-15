# ADR 0037 — Event resolution: a job and lazy paths write the world; each participant credits their own rewards on their next read

**Status:** accepted (slice 6, built 15 Oct 2026) · **Date:** 2026-10-03

## Context

A Campaign Event resolves at its start time whether or not anyone is online (`docs/design/slice-6-together.md` §2.6–§2.9). The resolution moves opinion and morale, writes ledger rows and contributions (a rally can make a hero, ADR 0028), adds Issue momentum, and posts a chat line. Each of up to nine participants then gets XP by their own roll, Party XP by the outcome, Political Capital (full for their first event of the day, half after), a Reputation win, the Grand Rally's Heat, and one result modal on their next read. The secretary's daily fixture resolves at the City Day boundary.

The design suggests one transaction that writes the result, the ledger, the momentum, the rewards to every participant and a pending-result entry on each character, run by an Agenda job at the start and lazily on any read.

Writing the participants in the resolution has four costs:

1. **Version conflicts** with up to nine players' own actions at the moment of the start.
2. **Unsettled days.** A participant away for two days has `day.settled` two days behind, so the tally of the day the result lands in is not today's (ADR 0005).
3. **The world writing characters.** ADR 0020 and 0028 keep the world from writing characters: the stipend and hero awards are credited by the character's own settlement.
4. **Heat and Health are lazy timers** whose stored `at` the resolution would have to reconcile.

Ordering matters too. ADR 0017 guarantees that no swing after a boundary reaches that boundary's count. An event of day *d* resolved late, after the boundary into *d + 1*, would add its swing after the drift and the count, its contribution to a closed cycle, and its momentum to an Issue already resolved on Monday.

## Decision

1. **One resolution function, `resolveEvent(eventId, now)`.** It does nothing unless the event is `open` and `startsAt ≤ now`. In one transaction it reads the roster's characters (read only), the place and its day's modifiers (ADR 0030), and runs the pure `resolveCampaignEvent` with the stored seed (ADR 0036). It then writes the **world only**:
   - the event's result, and `status: 'resolved'` (or `'calledOff'` when no member is on it, with nothing else written);
   - the place's opinion (`applyPersuasion`, or slice 5's `applyAgainst` for the Headline Story) and the morale record;
   - one ledger row per member participant per leg (`kind: 'event'`), the contributions, and Issue momentum;
   - **each sign-up's result**: the participant's outcome and their rewards computed from frozen facts (energy, Rested covered, the order bonus, and *first event today*, decided here by start time among the member's committed sign-ups of that City Day);
   - the chat line (ADR 0039).
2. **Four runners, one function.**
   - The Agenda job `campaign-event-resolve`, scheduled by the API after the call commits (best effort, unique by event id, as `journey-arrive`).
   - Any read of the event (the board, the page, the venue).
   - A participant's read, for each of their due sign-ups.
   - **The city day, which resolves every open event of the city with `day < d` before processing boundary *d*.** This also resolves the fixture of *d − 1*, whose start is that boundary.

   The `status: 'open'` guard makes any number of runners resolve once.
3. **Credit on read.** `loadCharacter` (after the settlement) credits each due, resolved sign-up in the participant's own version-guarded transaction:
   - XP, Party XP, PC, level and rank (`applyGains`), the Reputation win, and Heat added as of the start (`addHeatAt`), all into today's tally;
   - the receipt (the modal) stored on the sign-up;
   - `creditedAt` set (guarded by `null`), the pointer moved from `events.open` to `events.unseen`.

   The modal gate shows `events.unseen` oldest first.
4. **Stats as at the start.** Stats are read at resolution. That equals *at the start* because a participant's read path resolves their due events before any act of theirs can change a stat, and nothing else changes a character's stats.
5. **The fixture.** The city day posts day *d*'s fixtures in the boundary transaction (natural key, ADR 0036), and the board, the HQ and the paper ensure them with an idempotent upsert. The fixture's `startsAt` is the next boundary, where step 2's catch-up resolves it.

## Consequences

- The world never writes a character, so the resolution conflicts only with actions on the same place document, as any action does.
- Gains always land in a settled day. A member away for days is credited, with every modal, on return. Being away costs nothing.
- A day's events always land before that city's next drift, count and Monday Issue resolution, whether or not the worker runs.
- Another member's Level on the members list lags until that member's next read. The scoreboard, heroes and opinion do not lag, because they are written at resolution.
- The read path gains two conditional steps (resolve, credit). Both are free when `events.open` holds nothing due.
