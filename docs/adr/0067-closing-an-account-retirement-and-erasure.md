# ADR 0067 — Closing an account retires the character in one transaction; reopening within 30 days; a daily job erases personal data after 30

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Design §5.3 and §5.5 cover two kinds of closure:

- **Closing one's own account:** a confirm with *CLOSE* typed, then signed out. The character is **retired**: offices vacated as by a move, candidacies withdrawn, chat lines kept for their usual seven days, old editions unchanged.
- **Closure by the moderators:** the same retirement, with one reply allowed.

Signing in within 30 days reopens a self-closed account. After 30 days, **personal data is erased** (the name, the email, the device id, the sightings) and the name reads *A former member*.

The world's records (ballots, ledgers, counts, terms) must stay consistent. Nothing a player owns is destroyed by absence, but closing is the player's own choice.

## Decision

1. **`retireCharacter(session, c, today, by)`**, one transaction:
   - every live `officeTerm` is vacated by its kind (`vacatedBy: 'retired'`, not completed);
   - open candidacies are withdrawn (deposit kept);
   - open event sign-ups are withdrawn (the Energy stays spent; the role falls to the volunteers);
   - `characters.retired = { day, by }`;
   - on the user: `modState: 'closed'`, `closedBy`, `closedDay`; the sessions are deleted.
   Live lists (Members, presence, search, turnout's eligible, the small-branch roll, nudges) exclude retired characters.
2. **Reopen** (`accountProcedure`, self-closed only, `today < closedDay + 30`) clears both flags. Offices stay vacated, and everything owned is where it was.
3. **`account-erase`** runs daily at 00:10 UTC and at worker start, one account at a time, filtered on `erasedAt: null`:
   - the name is replaced through the registry and printed text (ADR 0066);
   - the email becomes `erased-{id}@erased.invalid`, and `emailNorm` is removed;
   - credentials (`account`), sessions, sightings, feedback lines and appeal text are deleted;
   - `erasedAt` is set.
   **The character document stays**, retired and nameless, so ballots, ledgers and counts keep their integrity.
4. Erasure is a scheduled job because it must happen whether or not anyone reads. It is a real event on the calendar. It writes a retired character, which no act can contend with, so ADR 0020's reason for "the world never writes a character" does not apply.

## Consequences

- A player can leave cleanly and change their mind for a month.
- After erasure, telemetry and player-days refer to an id that no longer maps to a person.
- The privacy note's promises are a test: every row of the slice-9 tech design's §14.2 is checked after an erasure.
- How a high office is vacated (Governor, Chair, deputy, President) follows slice 7's own vacancy rules. Defaults are listed for the designer.
