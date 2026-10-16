---
type: system
title: National Control
aliases: [NC, Who holds the republic, Leads the republic, controlShare]
tags: [nation, opinion]
status: built
slice: "7 (designed, not built)"
gdd: ["§14.8", "§15.5", "§22.1"]
adrs: ["0042", "0043"]
updated: 2026-10-16
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

- **Rules (built, slice 7 phase A):** `nationalControl` in `packages/rules/src/national.ts` (Unrest halves a home city for every party and Neutral), `TERM`, `NATIONAL`, `CONTROL` in `constants.ts`; the place factor `heatGainAt` in `heat.ts`. Stored on the `nation` document (`packages/db/src/models/nation.ts`). The nation's day that writes it is phase B.
**Rules:** [[GDD#14.8 National Control|GDD §14.8]] ·
[[design/slice-7-nation#8. National Control: who holds the republic|slice-7 design §8]] ·
[[tech/slice-7|slice-7 tech spec §6.4]] (`national.ts`) ·
[[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] (the republic document) ·
[[adr/0042-faction-scoreboard-scoped-totals|ADR 0042]] (the member scoreboard, related)

**Code (built, slice 7 phase B lane 1):** the snapshot is taken at every boundary by
`controlOf` in `apps/server/src/services/nationDay.ts` (the capital's district average, the other
cities' meters, a home city in Unrest at half) and stored on `nation.control` with a 60-day
`controlLog`; `nation.get` (`nationService.ts`) shows it as the bar. Test hook: `/api/test/nation`
`{ control }` (the next snapshot).

## Status

- **Built** (16 Oct 2026, the integration): on an upright phone 700 px tall or less the law chips give way to the map (the bar stays), so review 6's every-pin check holds at 375 × 667 with the paper's banner up; a designer flag ([[Drift Report]] D-S7I-2). [[tech/slice-7|tech spec]], *Deviations, Integration*.
- **Phase C, lane Y (16 Oct 2026):** on screen: the nation map's `NationBar` and `LawChips`, the pins' second line, the republic sheet (`packages/ui/src/components/Republic.tsx`, `apps/client/src/routes/nation.tsx`); `NationRepublicView.cities[].governor` (`nationService.governorsByCity`). Spec `clearwater.spec.ts` (the layout at 375 × 667).
- **Built on the server** (slice 7 phase B, 15 Oct 2026): the snapshot, the log and the *leads the
  republic* news lines. The client's bar is phase C.

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
