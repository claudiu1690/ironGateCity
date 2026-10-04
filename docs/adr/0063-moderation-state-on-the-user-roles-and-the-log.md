# ADR 0063 — Moderation state and roles as flat fields on Better Auth's user, a gate that costs no read, an append-only log that is also the idempotency record, and the two-person rule

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Design §5.3–§5.7 (GDD §16.2) defines the ladder:

- a **note from the editor**;
- **muted** for 24 hours, then 7 days (chat and the feedback line only);
- **suspended** for 3 days, then 14. The player cannot play, sees a screen with the reason and the date, and may reply once; nothing owned is touched;
- **closed** (by an admin, or by two moderators).

The console at `/mod` is for `moderator` and `admin` roles. A moderator never acts alone on a report about their own faction's member.

Every tRPC request already reads the Better Auth session, which returns the user. Better Auth's `additionalFields` are primitives, and `input: false` fields cannot be set by the client. ADR 0008's request keys are per character, and a moderator may have none.

## Decision

1. **Flat fields on `user`**, all `input: false`: `role`, `modState` (`clear | muted | suspended | closed`), `modUntil`, `modReason`, `modLogId` (the decision a reply answers), `renameReason`, `closedBy`, `closedDay`, `erasedAt`, `tester`. Better Auth's `/update-user`, `/delete-user` and `/change-email` are disabled, so only our services write names, closures and emails.
2. **States expire lazily.** `moderationAt(user, now)` reads a mute or suspension past `modUntil` as clear. No job lifts anything.
3. **The gate costs no read.** The context carries the session's fields, and the procedures are split:
   - `playProcedure` refuses `ACCOUNT_SUSPENDED` / `ACCOUNT_CLOSED` with the reason and the date;
   - `accountProcedure` allows status, the reply and reopening in any state;
   - `modProcedure` and `adminProcedure` re-check the role on every call.
   A mute is checked by `chat.post` and the feedback line only.
4. **`moderationLog`**, append-only:
   - one row per act, with the actor, the subject, the reason (one of the policy's lines), a moderator-only memo, and the until-date;
   - a **unique `{ actorId, idempotencyKey }`** makes the row the request record, so a retried decision returns the first outcome;
   - the subject's name snapshot is the only field ever rewritten (by erasure).
5. **Applying a rung** is one transaction:
   - the user's fields and the log row;
   - the subject's editor note;
   - the reports named → *dealt with*, and each reporter's note;
   - for a closure, the retirement (ADR 0067).
6. **The two-person rule.** A moderator's act on a member of their own faction, and any moderator's closure, becomes a `modProposals` row. It is unique per subject and action while open, and a different moderator or an admin confirms it. Admins act alone. Nobody acts on their own account.
7. **The first admin** comes from `ADMIN_EMAIL`, at sign-up, at API start and in the migration. After that, admins set roles in the console. The last admin cannot be demoted.

## Consequences

- Suspension and closure are enforced on every play procedure without a database read.
- A suspended player's lazy timers, wage and Rested run as for any absent player, so the design's promise needs no code.
- Moderators need no character and no request-log plumbing. Every act is auditable and exportable.
- The role and the state are visible to their own user through the session. Notes, links and set-asides live elsewhere and never are.
