---
type: system
title: National Control
aliases: [NC, Who holds the republic, Leads the republic, controlShare]
tags: [nation, opinion]
status: designed
slice: "7 (designed, not built)"
gdd: ["§14.8", "§15.5", "§22.1"]
adrs: ["0042", "0043"]
updated: 2026-10-14
---

# National Control

## In one paragraph

National Control (player words: *who holds the republic*) is each party's **weighted average
opinion across the five cities**. It is half of every party's national election score, the Season
Score's input and the bar on the nation map. About 70 % of it is won in the two battlegrounds,
Irongate and [[Clearwater]]; the three home cities give every party the same small base. Like city
control, it **gives no multiplier**.

## How it works

- **The formula** ([[GDD#14.8 National Control|GDD §14.8]], pinned for slice 7):
  `NC = 0.40 × Irongate + 0.30 × Clearwater + 0.10 × Coalport + 0.10 × Duskwall + 0.10 × Ashford`,
  each the party's share of that meter. Irongate is the **equal average of its five districts**
  ([[Capital Districts]]).
- **Unrest halves a home city**: a home city in Unrest counts at weight 0.05 for every party and
  Neutral, so the shares then sum to 95 and the bar shows them as they are (settled 4 Oct 2026;
  [[Battleground and Groundswell]]).
- Computed **at the boundary** with the day's battleground flags; shown to one decimal.
- **At the baselines every party holds 23.5.** That is why Clearwater's baseline was evened to
  22 / 22 / 22 / 34.
- **What it feeds:** `controlShare` = a party's NC ÷ the three parties' NC is **half of its
  national score** ([[National Elections]], [[GDD#15.5 National elections|GDD §15.5]]); the Season
  Score ([[Political Seasons]]); the nation map's bar.
- ***Leads the republic.*** The party with the highest NC at a boundary leads for the day: a line in
  every paper and a headline when it changes. Nothing more.
- **Faction scoreboard** (ADR 0042, slice 6) is a different thing: it ranks *members* by their
  contribution, see [[Influence Ledger and City Hero]].

## Where it lives

**Rules:** [[GDD#14.8 National Control|GDD §14.8]] ·
[[design/slice-7-nation#8. National Control: who holds the republic|slice-7 design §8]] ·
[[tech/slice-7|slice-7 tech spec §6.4]] (`national.ts`) ·
[[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] (the republic document) ·
[[adr/0042-faction-scoreboard-scoped-totals|ADR 0042]] (the member scoreboard, related)

**Code (planned, per the tech spec):** `packages/rules/src/national.ts` (`nationalControl`,
`nationalScores`, `countNation`) and a `nation` collection. **Neither exists yet.**

## Status

- **Designed, not built** (slice 7). Today the nation map shows each city's card and holder line,
  but there is no NC figure, no bar and no *leads the republic* line.

## Decisions

- Clearwater's baseline evened from 20 / 24 / 24 / 32 to 22 / 22 / 22 / 34 so no party starts ahead
  (Appendix C #70).
- A home city in Unrest counts half for everyone (4 Oct 2026).
- NC never multiplies rewards (GDD §14.3, the anti-snowball rule).

## Open questions / drift

- None open. Clearwater's card now shows **22 / 22 / 22 / 34** (`baselineOpinion` in `packages/content/src/data/nation.ts`, fixed 14 Oct 2026), and GDD §14.1 / §14.11 no longer call slice-7 items built.

## Related

[[Influence and Opinion]] · [[Capital Districts]] · [[Clearwater]] · [[Home Cities]] ·
[[National Elections]] · [[The Legislature and Laws]] · [[Political Seasons]] · [[Slice 7 The Nation]]
