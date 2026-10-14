---
type: history
title: Slice 4 The Battleground
aliases: [Slice 4, The battleground]
tags: [slice, built]
status: built
dates: 2026-09-29 to 2026-10-03
commits: [43e2a1e, 61ab859, 698095f, 00a6b89, db8539e, 125d278, 1d475a2, fcba145, 2d0d672, 5d27adb]
gdd: ["§14.2", "§14.4", "§14.5", "§14.6", "§14.9", "§14.10", "§14.11", "§14.13", "§15.3", "§15.10"]
adrs: ["0024", "0025", "0026", "0027", "0028", "0029", "0030"]
updated: 2026-10-14
---

# Slice 4 The Battleground

**Status: built** (3 Oct 2026), QA'd and fixed the same day. The capital's three-way council count was later replaced by "the largest bloc's rule" ([[Voting Rework]]).

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 4 — The battleground|the plan]]: the national map and timed train journeys with journey events, [[Irongate]] with five districts, district opinion, Battleground and Groundswell, moving residence, three-way council elections there, Issues of the Week, the influence ledger and District Hero.

- **Question:** do players choose to move to the capital, and does the three-way fight feel alive?

## What it added

- [[Travel and Journeys]]: third class, 20 Iron, from Level 10; the train leaves at the tap and arrival is settled lazily, with a tidy job ([[adr/0025-journeys-lazy-arrival-and-a-tidy-job|ADR 0025]]). Seven journey cards; the first journey always has one.
- [[Irongate]] and its [[Capital Districts]]: five districts on one painted picture, 29 places, 62 tier-1 actions at difficulty 10, three jobs; the City Hall. The three-way count ([[adr/0027-capital-districts-and-the-three-way-count|ADR 0027]]).
- [[Battleground and Groundswell]] (players read *close race* and *comeback*), and drift to the baseline.
- [[Residence]]: register in a district (500 Iron, seven days between moves), an optional room ([[adr/0026-residence-the-political-home|ADR 0026]]).
- [[Issues of the Week]]: the Monday draw, momentum, Sunday resolution, 4 PC to the top five ([[adr/0029-issues-of-the-week|ADR 0029]]).
- [[Influence Ledger and City Hero]]: ledger rows for every swing and District Hero at the count ([[adr/0028-influence-ledger-contributions-and-awards|ADR 0028]]).
- [[Modifiers]]: modifier sources and named factors ([[adr/0030-modifier-sources-and-named-factors|ADR 0030]]).
- [[Quarters and the Map]]: tiled maps (maps v3, one painted picture per city, [[adr/0024-tiled-maps-and-quarters|ADR 0024]]), free zoom everywhere, clouds, the ground sash.

## Documents

- Design: [[design/slice-4-battleground|design/slice-4-battleground]] (§19 settled with the architect; review 4, review 5 and voting addenda), [[design/slice-4-screens|design/slice-4-screens]] (the user's district lock, the ground sash), [[design/slice-4-fixes|design/slice-4-fixes]] (QA decisions).
- Maps: [[design/city-quarters|design/city-quarters]], [[design/maps-v3-integration|design/maps-v3-integration]], [[design/art-wiring-oct|design/art-wiring-oct]].
- Tech design: [[tech/slice-4|tech/slice-4]].
- ADRs: [[adr/0024-tiled-maps-and-quarters|ADR 0024]] to [[adr/0030-modifier-sources-and-named-factors|ADR 0030]].
- QA: [[qa/slice-4-report|qa/slice-4-report]] (§8 the fix round).

## Decisions made

- **User, 2 Oct 2026:** journey times stay **12 / 12 / 15 / 25** minutes, not the painted distances; the nation map **fills the screen** on a phone; home-city station quarters are **later, not slice 4**.
- **User, 2 Oct:** one painted picture per city, with quarters and districts as frames on it (the "stitched model").
- **User, 3 Oct: the district lock.** The Irongate overview shows only the five districts as outlines with names; inside a district the player is held to it.
- **User, 3 Oct: the ground sash** says whose ground a place is, not the player's own party.
- The user asked the team to decide small points themselves ([[design/slice-4-battleground|design §19]]).
- After QA M2: **a candidate on a ballot cannot move** until the result (GDD Appendix C #61).

> [!warning] Drift
> The plan's "three-way council elections" and "moving residence" were later reshaped: the capital's rule is now **the largest bloc's** ([[Voting Rework]]), *Register* became one **Live here** button, and the room became a **Lodgings** card at Tram Junction ([[Review 4]]). The journey now runs **on the nation map** with a moving pin (Review 4).

## QA and leftovers

- **Verdict: Pass with issues** ([[qa/slice-4-report|QA report]], 3 Oct): blocker 0, major 3, minor 9, nit 8. Boarding, the card, arrival, moves and the capital's count all held under races.
- **M1** (two districts off-screen on a desktop), **M2** (moving while on a ballot) and **M3** (the sideways tram bar) were fixed in `5d27adb`, with the October art.
- **Left open:** **n3**, ledger rows for losses (for the architect, ADR 0028 note); **n6–n8**, playtest and designer questions; on a tablet, Old Town's name under the corner plate; the nation map at 812 × 375 with the paper unread.

> [!note] Inference
> The Old Town tablet item predates review 4's re-drawn district outlines, so it may have changed. It has not been re-checked in a report.

## Commits

`43e2a1e` design (29 Sep) · `61ab859`, `698095f` design updated for maps v3 and the user's three decisions (2 Oct) · `00a6b89` tech design, ADRs 0025–0030 · `db8539e` answers · `125d278` phase A · `1d475a2` the ground sash · `fcba145` phase B · `2d0d672` phase C · `5d27adb` fix round (all 3 Oct). Maps work on 1–2 Oct: `b9623a9`, `207ac0c`, `2dc6b49`, `e899218` and the cloud commits.

## Related

- Previous: [[Slice 3 The First Vote]] · Next: [[Slice 5 Risk]]
- [[Review 3]] · [[Review 4]] · [[Voting Rework]]
