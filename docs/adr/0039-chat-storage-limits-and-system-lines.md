# ADR 0039 — Chat storage: a TTL collection capped on read, an atomic limiter per poster, system lines as outbox inserts

**Status:** accepted (slice 6, built 15 Oct 2026) · **Date:** 2026-10-03

## Context

Faction chat (`docs/design/slice-6-together.md` §8, GDD §16.2) keeps **the last 200 messages or 7 days per channel, whichever is less**, loads 50 at a time, and limits posting to **one message every 3 seconds, 30 in ten minutes**, refusing an identical repeat within a minute. **System lines** carry the branch's news with buttons: an event called and its result, a mate taken in (*Post bail*) or admitted (*Visit*), bail posted, a seat won, a hero named, a nudge. **Mute** hides a member's lines for you. **Report** records a line with twenty lines of context. Moderation tools are slice 9.

Plan rule 6 puts chat in its own collection. The character document is the hot, version-guarded document of every game action (ADR 0002): a chat post must not conflict with a player's own actions.

## Decision

1. **`chatMessages`**, one document per line: the channel, the faction and city, `kind: 'member' | 'system'`, the author's snapshot (name, avatar, Rank), the text or the system line's `{ kind, payload, to?, ref? }`, and `at`.
   - A **TTL index** removes lines after 7 days.
   - The **200 cap is enforced on read**: history never pages past the channel's 200th newest line. A daily `chat-trim` job deletes the rest, which is storage hygiene only.
2. **`chatLimits`, one small document per poster**, updated atomically by `chat.post`:
   - `recent[]` holds the last 30 post times and `last` the hash and time of the last text. The 3-second, 30-in-ten-minutes and repeat rules are a single `findOneAndUpdate` filter.
   - A miss reads the document to name the reason and the retry time (`CHAT_RATE`).
   - The post and the limiter write share one transaction, and a unique `{ characterId, idempotencyKey }` on the line makes a retried tap return the same line.
   - The same document keeps the playtest report's counters (posts, days posted).
3. **Text** is normalised on the server: NFC; control characters and bidi overrides removed; newlines to spaces; at most 280 code points. It is rendered as text and never linked.
4. **System lines are outbox inserts** in the transaction that causes them: the call, the resolution, the arrest or admission, the bail, the city day's count and heroes, the nudge.
   - A unique `dedupeKey` (`result:{eventId}`, `held:{stayId}`, `nudge:{eventId}:{from}:{to}`, …) makes a re-run insert nothing. The nudge's *once per caller per member per event* is that key.
   - Lines are worded on the client from copy and the payload, so times are in the reader's clock.
   - Buttons are computed per viewer at read (bail still open, already visited, event open or resolved). On a live line the client checks the state when tapped.
5. **Mutes** are `mutes[]` on the character (at most 200), written with `$addToSet` and `$pull` **without the version bump** (a preference, not game state). History returns them and the client collapses those lines. **`chat.hidden`** and **`chat.seenAt`** (the *for you* dot: an indexed `exists` over `system.to`) live on the character the same way.
6. **`chatReports`** (unique `{ messageId, reporterId }`) store the line and the twenty lines around it at report time. Nothing automatic happens, and they have no TTL: slice 9's audit reads them.

## Consequences

- Chat never writes the version-guarded parts of the character, so it cannot make an action retry, except through the unversioned preference writes, which are rare.
- The limits are exact per poster under concurrent tabs.
- History reads are one indexed range. The 200 cap holds even if the trim job never runs.
- Every system line is committed with the state it describes, and re-running a job or a transaction never duplicates one.
- Seven days of chat only: the playtest report counts posts through `chatLimits`, not the lines.
