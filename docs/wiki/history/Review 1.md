---
type: history
title: Review 1
aliases: [Review 1, First play-through]
tags: [review, built]
status: built
dates: 2026-09-30
commits: [2f846dd, d2e9470, f120c9a]
gdd: ["§3.7", "§5.3", "§5.4", "§7.5", "§8.4", "§9", "§13.4", "§13.7", "§15.4"]
adrs: []
updated: 2026-10-14
---

# Review 1

The user's **first play-through**, 30 Sep 2026, as the Iron Vanguard in Duskwall, on slices 0–3 (`pnpm dev:mem`).

## What the user asked

Fifteen notes ([[review/2026-09-30-review-1|the notes]]). In short:

- Labels nobody can read: *STANDING · Stranger 0/10*, the faction-share bar, *EN*, the *Today* tally numbers.
- The XP bar should say how much is needed; there is no Faction XP bar except on the profile.
- The first order (*Be at the gate*) doesn't match the place.
- The map jumps back to the centre after closing a sheet.
- Very low odds on the first actions, and an unreadable check breakdown (*Rolled 26 against 38 %…*).
- No "orders complete" moment with rewards; no modal when Local Standing levels up.
- **A job should be automatic**: a shift shouldn't cost Energy, it should just pay per day.
- The level-up offers STR or INT only, with no explanation.

## What was decided

From [[design/review-1-answers|the design answers]] (GDD §0, *Added 30 Sep 2026 (review 1)*):

- **A job is a wage** (user decision): full daily pay at every boundary, no shift, no Energy. Streak and sick days go; **seniority** (+2 % a day, to +20 %) replaces them. *Shift Hours Order* became the *Long Service Order*. See [[Jobs]].
- **The first day is played on your best stat**: the welcome order routes to it, a *First day* +10 % bonus, and every ticket names its stat. See [[Stats and Checks]], [[Party Orders]].
- **Orders say what and where** (*Talk to the customs men at the Fortress Gate*); tapping one opens its pin.
- **One plain sentence** for the breakdown (later replaced: [[Review 2]] hid the maths entirely).
- **Tap the label**: dotted labels open a two-line note; no "i" icons.
- **An orders-complete modal** in the secretary's voice (+5 Political Capital).
- **STR, INT or AGI** at level-up, with what each does here. See [[Levels and Faction Rank]].
- **A Faction XP bar in the HUD**; a **Standing card** in the result modal; *One of Us* pays 1 PC a day. See [[Local Standing]].
- The council session has no once-a-day rule.

## What was built

- `d2e9470`: the clarity pass, jobs as a daily wage, the first day on your best stat.
- `f120c9a`: migration 004 (jobs as a wage) runs at start-up.
- The map no longer recentres after a sheet closes.

## QA and leftovers

- No separate QA report for this round; the slice suites were kept green.
- The breakdown sentence was superseded a few hours later by [[Review 2]]'s "no rolls" rule.
- Appendix C items opened by this round, all defaults to watch: #31 seniority counts absent days, #32 best-stat council sessions, #33 the *First day* bonus size, #34 AGI level points. See [[Open Questions]].

## Commits

`2f846dd` the notes and the design answers · `d2e9470` the build · `f120c9a` migration at start-up (all 30 Sep 2026).

## Related

- Built on: [[Slice 1 The 5-Minute Session]], [[Slice 2 Arrival]], [[Slice 3 The First Vote]]
- Next: [[Review 2]] · [[Decision Log]]
