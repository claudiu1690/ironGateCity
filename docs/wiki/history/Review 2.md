---
type: history
title: Review 2
aliases: [Review 2, Second play-through]
tags: [review, built]
status: built
dates: 2026-09-30 to 2026-10-01
commits: [8e15d97, c3df8d0, cee1d87]
gdd: ["§1.2", "§1.5", "§3.3", "§6.5", "§8.4", "§13.1a", "§15.3"]
adrs: []
updated: 2026-10-14
---

# Review 2

The user's **second play-through**, 30 Sep 2026, after the [[Review 1]] fixes, on a desktop and a phone (upright and sideways).

## What the user asked

Nine notes ([[review/2026-09-30-review-2|the notes]]). In short:

- **Words are too complicated** (*leaflets*, *canvass*): use simple words.
- On desktop, open a place **in the middle of the screen**, not in a side panel.
- **Phone landscape is unplayable**: map too small, everything too big and scrollable.
- **Remove the roll and the odds maths** from results. Say whether it was a success or a partial and, if not a success, why. Don't show the rolls.
- *PC* should say **Political Capital**.
- The council vote and the candidacy gave no feedback: "Either it's extremely confusing or it's not working."
- Show progress on the Faction XP bar.
- The map pans freely; it should pan **only when zoomed in** on a place. **No free zoom**: a tap on a place zooms smoothly into it.

## What was decided

From [[design/review-2-answers|the design answers]] (GDD §0, *Added 30 Sep 2026 (review 2)*):

- **Plain words** ([[GDD#1.5 Plain words (review 2)|GDD §1.5]]): a player reads everyday words (*talk to voters*, *put up posters*, *a council rule*, *back a candidate*, *Reputation*, *Party XP*, *a close race*); the GDD and the code keep the system terms. The Alliance's Rank 2 title became *Campaigner*; *Ward Fund* became *Street Fund*.
- **The rolls are hidden**: the ticket shows an odds word and the stat (*Good odds · Intelligence*); a result says *Success* or *Partial* and, if not a success, **one plain reason**. The server still returns the full breakdown for the dev panel and QA. See [[Stats and Checks]], [[The Result Modal]].
- **Political Capital** in full everywhere ([[Political Capital]]).
- **An Election card** on the city screen and in the paper: the phase in plain words, what you can do now, a countdown, one button; every political act ends in a result and a next step. See [[City Council and the Rule Vote]].
- The map rules (centred sheet on desktop, pan only when zoomed, no free zoom) went to the developer. **Free zoom was given back in [[Review 3]].**

The answers proposed an edit to project `CLAUDE.md` design rule 2 ([[design/review-2-answers|answers §1.3]], "The user decides on the edit"). Since 14 Oct 2026 rule 2 says the design uses the campaign terms while **players read plain words** (GDD §1.5).

## What was built

- `c3df8d0` (1 Oct): a fixed map, a landscape layout, plain words, no rolls, the Election card.
- `cee1d87`: the city map never shows black past the art.

## QA and leftovers

- No separate QA report. The QA vocabulary test (a screen that prints a system term is a bug) came with this round.
- Appendix C items opened: #35 no percentage anywhere, #36 plain over period, #37 the Alliance's Rank 2 title (defaults to watch).

## Commits

`8e15d97` the notes and answers (30 Sep) · `c3df8d0` the build (1 Oct) · `cee1d87` map edge fix.

## Related

- Previous: [[Review 1]] · Next: [[Review 3]]
- Maps work between rounds (1–2 Oct): city quarters, then maps v3 (one painted picture per city). See [[Quarters and the Map]], [[Slice 4 The Battleground]].
