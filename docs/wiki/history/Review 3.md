---
type: history
title: Review 3
aliases: [Review 3, Third play-through]
tags: [review, built]
status: built
dates: 2026-10-02
commits: [7c90bb1, c305299, 271987f, 9d8f108, a89ad1b, dbabf40]
gdd: ["§8.4", "§8.5", "§13.1", "§13.1a", "§13.7", "§14.13", "§15.3", "§15.10"]
adrs: []
updated: 2026-10-14
---

# Review 3

The user's notes after the new painted maps (maps v3), 2 Oct 2026, on the local build.

## What the user asked

Six notes ([[review/2026-10-02-review-3|the notes]]), plus three done earlier the same day:

- **Let the player zoom** the city map if he wants (this reverses [[Review 2]]'s "no free zoom").
- A place's sheet and the dim overlay **pop in**; make them ease in.
- The result's **bulky XP squares**, more than half empty.
- *Again ×3 24*: the bare 24 (the Energy) is confusing.
- ***TRAIN*** at the Union Hall reads oddly ("this is not a gym").
- **The election screen** is a beige page, and the system makes no sense: are those NPCs or players? How does it work?
- Done earlier that day: no dark bands, a list of places on the map, a sharp zoom on upright phones (`7c90bb1`); **clouds and fog drifting over the city** (`c305299`, `271987f`, `9d8f108`, on for the three home cities in `a89ad1b`).

## What was decided

From [[design/review-3-answers|the design answers]] (GDD §0, *Added 2 Oct 2026 (review 3)*):

- **Free zoom** between two limits: never further in than the painting's finest detail (never blurry), never further out than the picture filling the screen (never a dark band). See [[Quarters and the Map]].
- **Opening a place is one movement**: the zoom, the dim and the sheet ease in together over 250–350 ms.
- **A receipt, not tiles**: one line per reward with its value and a note; a zero line is not printed. See [[The Result Modal]].
- **Every button that spends Energy says what it does and what it costs**: *Once more · 10 Energy*, *Three more · 30 Energy*.
- **The training button is the title's verb** (*Study*, *Lift*, *Run*, *Unload*).
- **Elections:** the council's hall is a point on each city map and its picture heads every election screen; **local candidates are townspeople run by the game**, marked on every list; seats are explained in words; a *How elections work* note. See [[City Council and the Rule Vote]], [[NPC Fill]].
- Three items left **for the user to decide** (answers §9): the fill at low population (nine names or eight), the receipt's thin bars, *Once* / *×3* on the ticket.

## What was built

- `dbabf40`: free zoom, smooth place sheets, the reward receipt, plain buttons, training verbs, the election screens.
- Slice 4's design was brought up to date for maps v3 and reviews 1–2 the same day (`61ab859`); the user's three slice-4 decisions were recorded (`698095f`). See [[Slice 4 The Battleground]].

## QA and leftovers

- No separate QA report; slice 4's QA (3 Oct) ran on top of this round.
- Of the three items for the user: the fill question was **closed by the [[Voting Rework]]** (Appendix C #44). The receipt bars and *Once* / *×3* have no recorded answer. See [[Open Questions]].
- Appendix C #45 (free-zoom limits) opened as a default to watch.

## Commits

`7c90bb1` the map fills the screen, a Places list, sharp zoom · `c305299`, `271987f`, `9d8f108`, `a89ad1b` clouds · `dbabf40` the round's build (all 2 Oct 2026).

## Related

- Previous: [[Review 2]] · Next: [[Review 4]]
- [[Art and Maps Pipeline]]
