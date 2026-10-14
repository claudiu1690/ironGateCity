---
type: history
title: Review 4
aliases: [Review 4, Design Review 1]
tags: [review, built]
status: built
dates: 2026-10-05 to 2026-10-07
commits: [9e51183, e714c8e, cc09869, e01a292, 8b18197, d6808ae, d2ceee6, a0e2116, 8007ecd, 48ebd7b, 3dd4bed, f7e180d, 70bcab2, bb9ea4d, f9096bd]
gdd: ["§2.2", "§3.3", "§5.4", "§6.1", "§6.4", "§7", "§13.4", "§13.7", "§14.9", "§14.10", "§14.11", "§14.13", "§15.3", "§19.2"]
adrs: ["0073", "0074", "0075", "0076", "0077", "0078"]
updated: 2026-10-14
---

# Review 4

The user's review **after slice 5**, 6 Oct 2026, on the local build at `a9e7390`. This is the round the review-5 notes call **"Design Review 1"** (the user's Notion naming).

## Before the review

The team stopped after [[Slice 5 Risk]], as the user had asked, and wrote [[review/review-4-guide|the review-4 guide]] (5 Oct): what is in the game, an hour's walk-through, the dev panel shortcuts, **ten defaults taken for the user to confirm**, and the designed slices 6–9 with their own defaults. Screenshots are in `docs/review/review-4/`.

## What the user asked

Twenty-five notes ([[review/2026-10-06-review-4|the notes]]). In short:

- **Faces** at sign-up look alike. **The intro with the old man is really bad**: give 3–5 examples.
- The paper looks odd on a big monitor. **There's no clock** anywhere.
- Small bugs: the level-up line stays stale; *see the note* points to nothing; home orders do nothing away from home; an order sends you to missions you can't take; Health isn't always shown.
- **Travel should happen on the nation map**: a pin moving along the roads, encounters on the way.
- **Irongate's districts must cover the whole map.**
- Register vs take a room: what and why? **I won a seat: now what?** Council rules are invisible: **we need a place on the map** for the council.
- **Heat**: how do I get it, what does it do? Too small. What does Reputation do? What is the *ISSUE* tag? *Legal Aid: half price*?
- Prison: keep the duty officer's lines; **don't tell me to close the game**; **a list of who is in prison**; **prison has no repercussions**.
- **Home cities shouldn't have district-like outlines**; grey out locked places.
- A paper per city? Show the **rank names** and what each unlocks.

## What was decided

From [[design/review-4-answers|the design answers]] (GDD §0, *Added 6 Oct 2026 (review 4)*):

- **A new opening, *The Last Train In*** (three beats: the platform, the suitcase, the lining; whom you help is your party; the favour is your first action; eight taps to the first result). The other options are in the answers' Appendix A. Replaced again in [[Review 5]]. See [[Coming Home]].
- **A clock in the top bar** and one countdown style. See [[Time and the Game Day]].
- **The journey runs on the nation map**; **user, 7 Oct: the traveller is a plain moving pin, not a train**, along roads or rails. See [[Travel and Journeys]].
- **The five districts tile the whole picture.** See [[Capital Districts]].
- **One *Live here* button** with the plain why; the room became a **Lodgings** card. See [[Residence]].
- **The Town Hall is a place on every city map**, with the council, the rule in force and a councillor's desk; a ***What now*** card on winning. See [[City Council and the Rule Vote]].
- Heat bigger and explained; Health always on the HUD; Reputation made concrete (three in a hundred more per step); help notes on the Issue tag and Legal Aid; **the rank ladder**. See [[Heat and Record]], [[Local Standing]], [[Levels and Faction Rank]].
- **The cells cost three things and take nothing owned**: a longer sentence (20 + Heat ÷ 2 min), the day's orders off, a mark on the record for every arrest; ***In the cells now*** on every police station. See [[Jail and the Cells]].
- **Home cities are one map** (reversing slice 5's overview); locked pins greyed with *Opens at Level 6*; only Irongate has districts.
- **Your paper, in a local edition** for the city you are in. See [[The Morning Paper]].

## What was built

Technical plan [[tech/review-4|tech/review-4]] with [[adr/0073-the-last-train-in-faction-as-an-answer-and-a-welcome-only-favour|ADR 0073]] to [[adr/0078-the-cells-costs-orders-off-an-arrest-always-marks-and-the-cells-list|ADR 0078]]; migration 008 reset half-finished old drafts. Phases, all 7 Oct:

| Phase | What | Commit |
|---|---|---|
| quick fixes | level-up point, HUD notes, mission order, Health bar, new faces | `e01a292` |
| 1 | clock and countdowns, Heat, rank ladder, paper on a desk, copy | `8b18197` |
| 2 + 5 | the cells cost more, *In the cells now*, *Live here* and lodgings | `d6808ae` |
| 3 + 4 | Irongate districts tile the map, home cities as one map, the Town Hall | `8007ecd` |
| 6 | the journey on the nation map, a moving pin, the card on the way | `48ebd7b` |
| 7 | local editions of the party paper | `3dd4bed` |
| 8 | *The Last Train In* | `f7e180d` |
| 9 | integration, migration check, docs | `70bcab2` |

The user's build notes: [[review/review-4-build-notes|review-4-build-notes]].

## QA result

- [[qa/review-4-report|QA report]] (7 Oct): **Pass with issues**, blocker 0, major 0, minor 4, nit 9. Migration 008 ran once under two start-ups; Irongate's tiling was checked on 160,000 points.
- **m2**: the "once only" favour paid twice for a sign-up after 22:00 UTC. Fixed in `f9096bd` with m1, m3 and m4 and the browser audit at six sizes.

## Leftovers

- **n9**: night was 20:00–06:00 UTC for everyone, dark until 09:00 at UTC+3. Resolved by [[Review 5]]'s six-hour game day.
- The journey plate still read *arrives now · 19:16* after arrival; a wording was asked of the designer. No fix is recorded.
- The ten defaults in the guide (no move while on a ballot, renewing a room, rival ground at Level 10, ×1 there, police loss = cells, *On file*, the home overview, the caught check on Partial/Failure only, *the duty officer*, the five-minute run-in) have no recorded "confirmed"; the user's notes did not object. One (the home overview) was reversed by note #21.

## Related

- Previous: [[Review 3]] · Next: [[Review 5]]
- Built on: [[Slice 4 The Battleground]], [[Slice 5 Risk]] · [[Decision Log]]
