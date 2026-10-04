# ADR 0065 — One `reports` queue for lines, names and filter flags; editor notes and appeals in their own collections

**Status:** proposed (slice 9; supersedes ADR 0039 §6's `chatReports`) · **Date:** 2026-10-04

## Context

Slice 6 records a reported chat line with twenty lines of context in `chatReports`, with nothing automatic (ADR 0039). Slice 9 adds:

- four **reasons**, and reports of a **name** from a profile;
- **filter flags** queued with a tag;
- ten reports a day per account, and *baseless* reporters sinking in the queue;
- a queue with states (*New, In review, Dealt with, No action*), sorted oldest first, and gated on **the median time to first action under 24 hours**;
- the reporter told *A line you reported was dealt with.*;
- **a note from the editor** as a Letters row, and **one reply per decision** answered as a Letters row (or an email when the account is closed).

The world never writes a character (ADR 0020). Moderator acts are rare, but a Letters row should not bump the character's version.

## Decision

1. **`reports`** replaces `chatReports` (migration 011 moves the rows across):
   - fields: `kind: 'line' | 'name' | 'filter'`, a `targetKey`, the reporter (null for a flag), the reported account, character and faction, `reason`, the filter's `tags`, a filtered note, the line with its context or the name;
   - workflow: `state`, `assignee`, `firstActionAt` (the gate's measure), `resolvedAt`, `decisionLogId`;
   - the unique `{ targetKey, reporterId }` makes a repeat report a no-op (*already*);
   - a TTL removes it 365 days after resolution.
2. **A filter flag** is a `reports` row written in `chat.post`'s own transaction, so the line and its flag commit together.
3. **The daily cap** lives on slice 6's `chatLimits` (`reports { day, n }`, conditional `$inc`), with the posting limits. *Baseless* (three *No action* in a week) is computed at read for the queue's order and is never a stored state.
4. **`editorNotes`**, keyed by `{ characterId, ref }`, for the rung's note, *reportDealt* and the appeal's answer. The Letters builder reads them live, and `character.me` checks one indexed `exists` for the dot. A tap sets `readAt` (set-once). Kept 90 days.
5. **`appeals`**, one per decision (unique `logId`), 500 characters, answered by an admin. The text is erased with the account.

## Consequences

- One queue serves every source, sorted and filtered in one index.
- Players are told only the design's lines, and never who reported them.
- A Letters row from the moderators never writes the character document.
- Slice 6's report procedure (`chat.report`) becomes `report.line`, with a reason.
