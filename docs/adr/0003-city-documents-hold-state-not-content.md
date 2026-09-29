# ADR 0003 — `cities` documents hold live state; locations and actions stay in `packages/content`

**Status:** accepted (slice 0) · **Date:** 2026-09-29

## Context

The plan lists `cities (locations embedded)` as a slice-0 collection, and also says "content is
data in `packages/content`, validated with Zod, loaded at startup". Copying locations and actions
from the content package into MongoDB at seed time creates two sources of truth that drift: every
content edit would need a re-seed, and a stale seed would silently show old text.

## Decision

- **Static definitions** (a city's name, role, home faction, its locations, their actions and text)
  live only in `packages/content`, loaded and validated once at server start, and are addressed
  by stable string ids (`coalport`, `coalport.mill-gate`, `coalport.mill-gate.canvass`).
- **Live state** per city (opinion shares, later morale, weather, control, Issues) lives in the
  `cities` collection, keyed by the same content id (`_id: 'coalport'`).
- `seed` is an idempotent upsert (`$setOnInsert`) of one state document per content city with its
  baseline opinion. Running it twice is a no-op.
- The API merges the two: `city.get` returns content + state + the calling character's odds.

## Consequences

- Adding a location or an action is a content change and a deploy; no migration, no seed.
- Anything that must be queried across cities (opinion, elections) is in the database where it can
  be indexed and updated atomically.
- The `cities` document is small; the "embedded locations" the plan mentions are the *content*
  locations returned by the API, not stored copies.
