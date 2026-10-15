---
type: history
title: Review 6
aliases: [Review 6, Design Review 3]
tags: [review, built]
status: built
dates: 2026-10-15
commits: []
updated: 2026-10-15
---

# Review 6

The user's notes of 15 Oct 2026, on the build that includes the [[Voting Rework]] (`ae6ab89`), played
on an iPhone SE among other devices. **In the user's Notion this is "Design Review 3"**; the repo
calls it review 6 ([[review/2026-10-15-review-6|the notes]]). Three small fixes, so the round ran
without an answers doc or a tech plan: developer, then build notes.

## Goal and playtest question

Make the maps behave on small screens and give the journey a calmer trail. Playtest question: on a
phone held sideways, can you reach every city on the nation map, and does the trail read as a train's
way along the rails?

## What it added

1. **The nation map held sideways** (bug): the nation screen kept a 420 px minimum height, so on a
   short screen held sideways the map ran past the bottom of the screen and the drag stopped with
   Coalport and Clearwater in the hidden strip (Clearwater 58 % on screen at 667 × 375; Coalport and
   Clearwater 0 % at 568 × 320). The floor is dropped in the sideways layout, as the city screen
   already did; the pan limits and the zoom are unchanged (the map stays locked). Now every city's pin
   and label can be dragged fully into view at 667 × 375, 568 × 320, 844 × 390 and 932 × 430;
   upright unchanged. See [[Travel and Journeys]], [[Quarters and the Map]].
2. **The city's map buttons** (bug): *City · Nation* sat a fixed 124 px from the edge, less than
   *What's here*'s width, so they overlapped by 11 px at 667 × 375. The two now share one flex row
   with an 8 px gap (the nation map's *City · Nation* and *Cities* too); 44 px tall; checked at 14
   sizes. See [[Quarters and the Map]].
3. **The journey trail** (UI): round ink dots ringed in paper, 4 px dots 9 px apart on screen at any
   zoom; the traced route is smoothed by Chaikin corner cutting (`smoothRoute`, four rounds: the
   sharpest bend 89° → 14°, at most about 40 px off the traced rails on the 9,216 px art), and the pin
   rides the same smoothed points. See [[Travel and Journeys]].

## Documents

[[review/2026-10-15-review-6|The notes and triage]] · [[review/review-6-build-notes|build notes]] ·
screenshots before and after at 667 × 375 in `docs/review/review-6/` · spec
`apps/client/e2e/review6.spec.ts` (Playwright project `review6`, last in the chain).

## Decisions made

- The locked map with zoom-to-place stays (an earlier user decision); the fix is to the page's
  height, not to freeing the map.
- No GDD number changed.

## QA and leftovers

- Checks: the fast check (14 of 14 tasks); `review6` 8 of 8; `landscape`, `small-phone`, `travel`
  11 of 11; `qa-review4` and `home-map` 34 of 35 with the journey screen changed as well, then the
  journey group 7 of 7 with that change undone; `phone`'s `map.spec` and `places.spec` 11 of 11. The
  full e2e was not run this round.
- **Leftover R6-1** (closed 15 Oct 2026): the journey screen held sideways kept its 420 px floor.
  Now the plate is a 260 px column beside the map (as the city's), and the map takes the screen's
  height; the pin on the map at the four sideways sizes, the whole trail in view at 667 × 375 and
  568 × 320 (93–94 % at 844 × 390 and 932 × 430, where the pin-gap floor stops the zoom).
- **Leftover R6-2** (closed 15 Oct 2026): measured, the map buttons' row ran under the 420 px corner
  card by 44 px at 640 wide, 42 at 667, 9 at 700. From 640 to 767 px the two buttons stack (gap 64–144 px).
- **Leftovers, also fixed:** the dev clock's offset is kept in the database (`dev/clockStore.ts`) so
  `dev:mem`'s reload never puts it back; a character settled ahead of the clock gets a clear dev
  error (`CLOCK_BEHIND`) on an act instead of a 409 loop. The night trail was checked: legible, unchanged.
- Leftover checks: the fast check 14 of 14; `review6` 16 of 16; `landscape`, `small-phone`, `travel`,
  `dev-panel` with it 29 of 29; `qa-review4`, `home-map` 35 of 35.

## Related

[[Review 5]] · [[Voting Rework]] · [[Travel and Journeys]] · [[Quarters and the Map]] ·
[[Decision Log]] · [[Run a Design Review Round]]
