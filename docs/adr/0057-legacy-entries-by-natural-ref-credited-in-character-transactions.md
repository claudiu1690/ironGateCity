# ADR 0057 — Legacy: entries in their own collection keyed by a natural ref; the total and perks embedded; every entry credited in a character transaction

**Status:** proposed (slice 8; applies ADR 0020 and 0028) · **Date:** 2026-10-04

## Context

GDD §17.3 and design §7: **Legacy** is the public, permanent record (City or District Hero 2, a council term 3, an Issue's top five 2, a pledged law 10, a Governor's or deputy's term 5, a Chair's 10, a President's 40, surviving a vote 10, an Ambition 30, an exposé 2, Protégé 5, the Champion faction 5, a season award 5). Small **lasting perks** spend a balance kept beside the total, which never falls. The design suggests `legacy { entries[], spent, perks[] }` embedded.

Entries arise in three places: the character's own acts (an exposé, Protégé, chapter 12), the world's boundaries (terms completed, heroes and Issue awards, pledges kept, votes survived), and the season's finale (the Champion, the awards). ADR 0020 and 0028: the world never writes a character; awards are credited by the character's settlement.

## Decision

1. **`legacyEntries`**, one row per entry with a **unique `{ characterId, ref }`** (`term:{termId}`, `award:{awardId}`, `pledge:{termId}:{lawId}`, `survived:{id}`, `expose:{logId}`, `protege:{patronId}`, `ambition:{id}`, `champion:{season}`, `award:{season}:{kind}:{bracket}`). The record grows for ever (a council term every five days), so it is not embedded.
2. **Embedded `legacy { total, spent, perks, seasonCredited }`**: the figure every read needs (the profile, recognition's +1 per 10, the perks' effects) without a query.
3. **Every row is inserted in a character transaction** with `$inc legacy.total`: the act's own, or the **settlement**, which derives the window's entries purely (`legacyFromWindow`: terms whose end is a boundary in the window and completed, the awards it credits, pledges, survivals) and, when behind, the seasons since `seasonCredited` (`seasonCredits`). The season's finale writes no character and no row.
4. **Perks** spend `total − spent`; each is one tap with a request key; the ones that change a lazy rate re-base it (ADR 0052).
5. **A backfill** (migration 010) writes past terms and awards with the same refs, so a later settlement never repeats them.

## Consequences

- `total` and the rows agree by construction; a replay or a second runner meets the unique ref.
- A member who returns a season late is credited for the Champion and awards then.
- The profile and the Me tab read the newest entries by `{ characterId, day }`.
