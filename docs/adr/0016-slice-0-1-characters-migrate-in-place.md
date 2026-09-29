# ADR 0016 — Characters from slices 0–1 are migrated in place as the reference recruit; no "finish your arrival" path

**Status:** accepted (slice 2) · **Date:** 2026-09-29

## Context

Every character created before slice 2 is the auto-created reference recruit (Collective, Coalport,
STR 10 / INT 12 / AGI 5, `chaBase: 2` standing in for worn CHA) with no origin, no Ambition, no face, no items, and
possibly a job under the unprefixed Coalport ids (`factory-worker`, `street-vendor`, `driver`). There is no
production data yet (provisioning is still waiting), but dev databases, QA runs and any early playtest deployment
have such characters, and slice 2 renames the job ids (`coalport-factory-worker`, …).

Options:

- **Send them through the origin** with the faction locked: the answers would change stats and Iron of a character
  who has already played, and the faction screen would offer a choice that isn't one.
- **Migrate in place** to what they already are: the reference recruit, whose origin answers GDD §8.5 pins.

## Decision

Migration `002-slice2-arrival` (run by `ensureIndexes()` at start-up, idempotent, filter `ambition: { $exists: false }`):

- `origin: { answers: content.origin.reference, arrivedAt: createdAt, migrated: true }`. Stats are **not**
  recomputed; the 150 Iron and 50 FXP of the reference answers are **not** paid (they were never part of these
  characters' economy).
- `stats.chaBase: 0`; `inventory` gets the mill work coat and the party card; `equipment` wears both. Worn CHA stays 2.
- `ambition: { id: 'finish-his-work', chapter: 1, step: 'choose', choiceId: null, flags: [], history: [] }`, so
  chapter 1 appears in their Letters row.
- `avatarId: null`: the HUD shows the crest until they pick a face on the Me tab (`character.setAvatar`).
- Job ids renamed in the same migration: `job.id` `factory-worker` → `coalport-factory-worker`, `street-vendor` →
  `coalport-street-vendor`, `driver` → `coalport-driver`.
- Old `actionLogs.result` and `requestLogs.result` keep the old ids: they are history, re-read only by a retry of the
  same key within minutes, and never interpreted.

## Consequences

- No second onboarding path in the client; every existing player keeps everything they had (CLAUDE.md rule 4).
- Migrated players skip the origin and the welcome edition; that's acceptable for developers and QA, and a slice-1
  playtester would read it as the game continuing.
- Tests cover the migration on a slice-1 fixture document, twice (idempotent).
