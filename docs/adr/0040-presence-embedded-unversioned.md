# ADR 0040 — Presence: `presence { locationId, seenAt }` on the character, touched without the version, read by index, invisible on rival ground

**Status:** accepted (slice 6, built 15 Oct 2026) · **Date:** 2026-10-03

## Context

Slice 6 shows who is about (`docs/design/slice-6-together.md` §7, GDD §16.2):

- *Here now* on a place's sheet: your faction by name, the other two as one count;
- the city plate's *{n} of the {faction} in town now*;
- the Members list's bands (*here now*, *online*, *today*, *this week*, *away*) and statuses (*in the cells*, *in the infirmary*, *on the train*, *rival ground*);
- the chat header's count;
- *You and n others on this train*.

*Here now* means seen within ten minutes. **A visitor on rival ground is invisible to everyone but their own faction** (§14.12).

The plan embeds `presence { locationId, seenAt }`. The design suggests `presence { cityId, locationId, seenAt }`, touched by the auth middleware at most once a minute. The character already has `cityId` (where it stands; ADR 0025) and is the document every game action guards with `version` (ADR 0002).

## Decision

1. **`presence { locationId, seenAt }` on the character.** No `cityId`: the character's `cityId` already is it, and a duplicate could disagree. `locationId` is:
   - set by every action at a place (in its own `$set`) and by `presence.at` when a place's sheet opens;
   - cleared on boarding a train;
   - set to the service's place when taken in or admitted (slice 5).
2. **Presence writes never bump `version`.**
   - `loadCharacter` touches `seenAt` when it is older than a minute, with a conditional `$set` after the read path's other steps. It needs the character, so it is not in the auth middleware.
   - `presence.at` skips the write when the place and a fresh `seenAt` are unchanged, and returns the place's *Here now* line, so opening a sheet is one round trip.
   - A touch that lands inside an action's transaction makes the driver retry that transaction (a transient write conflict). It does not trip the version guard.
3. **Reads by index:**
   - `{ 'presence.locationId': 1, 'presence.seenAt': -1 }` (partial on a set place) for *Here now*;
   - `{ factionId: 1, 'presence.seenAt': -1 }` for the Members list, the plate and the chat header;
   - journeys' existing `{ to, boardedAt }` for the train.
4. **Visibility is one pure rule, `visibleTo(viewer, x, placeHomeFaction)`.** A member is visible to their own faction always. To others they are visible only at a place that is nobody's home (the capital) or their own faction's home. Other factions appear as a count only. No view carries another faction's character ids.
5. **Status is projected, not stored.** The Members list derives a mate's status from `held`, `journey` and `cityId` with `now`. A stay whose `until` has passed reads as out, or as *on the train home* after a rival-ground arrest (slice 5's deportation), even before the mate's own read has released them. So no tidy job is needed for releases (ADR 0033 §4's open point; ADR 0041).

## Consequences

- Presence costs one small unversioned write a minute per active player and one per sheet opened. Players with no fresh presence add no write.
- *Here now* is a range scan over a ten-minute window per place: cheap at any plausible scale.
- Privacy on rival ground holds in every view because every presence read goes through the same rule.
- `seenAt` is also the playtest report's *last seen*.
