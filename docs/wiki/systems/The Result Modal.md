---
type: system
title: The Result Modal
aliases: [Result modal, Result, Receipt, Knock-on effects, Stamp, Result breakdown]
tags: [ui, core, rules]
status: built
slice: "1; review 2 (no maths shown); review 3 (receipt, buttons); review 5 (compact modal)"
gdd: ["§13.1", "§13.1a", "§8.4"]
adrs: ["0002", "0006", "0031"]
updated: 2026-10-14
---

# The Result Modal

## In one paragraph

Every action and mission ends in one modal that covers the map, never a line in a log. It says what
happened in a picture, a stamp and two or three lines; lists what the player earned as a printed
receipt; and shows the knock-on effects (Heat, an order done, a level-up). Then it offers the next
tap: *Once more*, *Three more* or *Continue*. The server returns the **full breakdown** (roll,
chance, bonuses, rewards, effects) so the client can draw it and QA can check it, but the player
never sees the dice.

## How it works

Top to bottom ([[GDD#13.1a The result modal|GDD §13.1a]]):

1. **Art and a stamp:** a scene or map crop from the art fallback ladder, with a big stamp
   (*Success*, *Partial*, *Failure*, *2 of 3*, *Trained*, *Taken in*, *Carried off*), the place
   and the in-game time.
2. **What happened:** a headline and a short text (≤ 240 characters). A ×3 uses the success text
   when more than half the rows succeeded, else the partial text.
3. **How it went:** printed **only when it says something the stamp does not**: nothing for a ×1
   Success; one italic reason line for a Partial or Failure ([[Stats and Checks]]); one Courier
   line of rows for a ×3; the run-in's block ([[Run-ins and Combat]]).
4. **Bonus tags:** one line (*Party order · +25 % Party XP · First day in Coalport · better odds*),
   cut with *· +n more*.
5. **Rewards, a receipt** (review 3): one line per reward in a fixed order, XP, Party XP, Iron,
   opinion (and an item on chapters). **A zero line is not printed.** XP and Party XP keep a thin bar
   and one note (*955 to Level 7*); everything else (base and bonus, Rested's share, the opinion
   meter) sits behind ***Details ▾***.
6. **Knock-on effects:** **three lines** in a fixed priority, as built (`PRIORITY` in
   `packages/ui/src/result.ts`; GDD §13.1a says the same since 14 Oct 2026): a point to place · a
   rank, Reputation or first-time Heat or record card · Heat · the record · the order's lines ·
   the morale crossing · Issue momentum · the branch's backing · Political Capital · Reputation
   progress · the ledger · the chapter hook · a trained stat · Energy and Rested · *Missions
   remember*; a *Trained* result puts its stat first. The rest behind ***n more ▾***. Two lines on
   phones under 700 px.
7. **Buttons:** *Once more · 10 Energy* · *Three more · 30 Energy* · *Continue*. After training:
   *Study again · 46 Energy*. When a run-in follows, one button leads into it.

**It fits** (review 5): a ×1 Success and a mission with a level-up **never scroll** at 390 × 740 or
on any desktop. The picture is 112 / 136 / 150 px by viewport height (88 px under 700 px tall). A
×3, a reason line or a run-in may scroll the middle about 100 px on a 740 px phone; the picture and
the buttons never scroll.

**The server side:** every action returns an `ActionResult` with each attempt's `check` breakdown,
`roll` and `outcome`, the reward lines with named parts, and all effects (Energy, Rested, XP, Party
XP, Iron, opinion, Standing, level-up, rank-up, Political Capital, orders, trained stat, item, Issue
momentum, morale, Heat). It is **stored verbatim** in the action log, so a retried request returns
the same result ([[Atomic Actions and Idempotency]]).

## Where it lives

**Rules:** [[GDD#13.1 Three tiers of play (new)|GDD §13.1]] · [[GDD#13.1a The result modal|GDD §13.1a]]
· [[design/review-3-answers|review 3 answers §3, §4]] (receipt, buttons) ·
[[design/review-5-answers|review 5 answers §17, §18]] (the compact modal; the priority settled with
the architect) · [[design/review-2-answers|review 2 answers §2]] (reason lines) ·
[[adr/0002-atomic-idempotent-actions|ADR 0002]] · [[adr/0006-repeat-actions-one-request|ADR 0006]] ·
[[adr/0031-missions-their-own-list-one-resolver|ADR 0031]] · [[tech/review-5|tech spec, review 5 §4]]

**Code:**
- Rules: `ActionResult`, `ResultAttempt`, `ResultStamp`, `ActionAttempt` (`check`, `roll`) in
  `packages/rules/src/types.ts` · `packages/rules/src/rewards.ts` (`computeRewards`, `RESTED_PART`,
  `ORDER_PART`)
- Server: `apps/server/src/services/actionResult.ts` (`buildActionResult`) ·
  `apps/server/src/services/missionResult.ts` (`buildMissionResult`, `missionArt`, the run-in block)
  · `apps/server/src/services/art.ts` (`pickArt`, the fallback ladder)
- Data: `actionLogs.result` (`packages/db/src/models/actionLog.ts`)
- Client: `packages/ui/src/components/ResultModal.tsx` (`Receipt`, `TagsLine`, `AgainButtons`,
  `LevelUpLine`, `StandingCard`) · `packages/ui/src/result.ts` (`howItWent`, `knockOnLines`,
  `KNOCK_ONS_SHOWN = 3`, `SHORT_SCREEN`) · `packages/ui/src/odds.ts` (reason lines) ·
  `apps/client/src/features/action/usePerformAction.ts`

## Status

Built in slice 1; the roll and chance were hidden in review 2; the receipt and cost-naming buttons
in review 3; the compact modal and the level-up line in review 5 (QA fix round 10 Oct 2026 added
the under-700 px rules). Political acts and journeys use the same modal with their own bodies.

## Decisions

- [[Review 2]]: no percentage, roll or bonus row anywhere a player reads; the server still returns
  them.
- [[Review 3]] (2 Oct 2026): a receipt, not four tiles; every Energy button names act and cost.
- [[Review 5]] (8 Oct 2026): the modal fits; folds behind *Details* and *n more* (Appendix C #104).

## Open questions / drift

- Appendix C #104: if testers open *Details* on most results, the opinion meter line comes back
  out first; if *n more* hides the order's line too often, the order moves above Heat.

## Related

[[Stats and Checks]] · [[Street Actions]] · [[Missions]] · [[Rested]] · [[Energy]] ·
[[Levels and Faction Rank]] · [[Heat and Record]] · [[Party Orders]] ·
[[Atomic Actions and Idempotency]] · [[Art and Maps Pipeline]]
