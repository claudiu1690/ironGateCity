---
type: system
title: Political Capital
aliases: [PC, Political capital]
tags: [resource, politics]
status: partly built
slice: "1 (stored, orders bonus); 3 (first sinks); 4 (Issues, heroes); 5 (strike a mark); voting rework (costs spent)"
gdd: ["§6.5"]
adrs: ["0018", "0084"]
updated: 2026-10-14
---

# Political Capital

## In one paragraph

Political Capital is a player's pull in the party. It is *earned* by political work, never by a
timer, and *spent* on political acts: standing for office, backing a candidate, striking a mark off
the record, and later laws and petitions. It cannot be bought, traded or transferred, so political
power always traces back to play.

## How it works

- **Capped at 1,000**, never decays ([[GDD#6.5 Political Capital (new)|GDD §6.5]]).
- **Always written in full:** *Political Capital*, never *PC*, on every screen; on the HUD only once
  it is above 0. Every political button prints its price (*Stand for the council · 10 Political
  Capital*).
- **Earned (built):** all three of today's [[Party Orders]] **+5 a day** · a council seat **+10 at
  every boundary held** (with 20 Party XP) · resolving an Issue, **4 each** to the owning faction's
  top five ([[Issues of the Week]]) · City or District Hero **25**
  ([[Influence Ledger and City Hero]]) · *One of Us* in a city **1 a day** ([[Local Standing]]).
- **Earned (designed):** Campaign Events 3 / 6 / 10 / 15 by outcome, halved after the first of the
  day (slice 6) · stipends for Governor, Chair, deputy, President (slice 7) · patron favours and
  Ambition chapters.
- **Spent (built):** stand for the council **10** (spent when the name is printed, never returned)
  · back a candidate **10** (optional, one per member per cycle in each city) · strike a mark off
  the record **30** ([[Heat and Record]]).
- **Spent (designed):** the party's list 25, Chair 25, President 100; a petition 10; a law to
  Parliament 50; a removal vote 50; calling in a patron favour 15–40.
- **Pace:** a daily player has about 45 by day 10, enough to stand and back a colleague; a
  councillor banks about 15 a day ([[economy|economy sheet §14.2]]).

## Where it lives

**Rules:** [[GDD#6.5 Political Capital (new)|GDD §6.5]] ·
[[design/voting-simplified|voting simplified]] (costs spent, no proposal fee) ·
[[economy|economy sheet §14.2, §15.5, §19.8, §20.4, §21.2]] ·
[[adr/0084-seats-by-reputation-and-backers-standing-is-spent-with-a-rule|ADR 0084]] ·
[[adr/0018-political-acts-set-once-with-request-keys|ADR 0018]]

**Code:**
- Rules: `PC`, `DIRECTIVES.allDonePc`, `COUNCIL.cost`, `COUNCIL.stipend`, `ISSUES.topPc`,
  `HERO.pc`, `STANDING.oneOfUsPcPerDay`, `RECORD.strikePc` in `packages/rules/src/constants.ts` ·
  `applyGains` in `packages/rules/src/progress.ts` · `packages/rules/src/orders.ts`
- Server: `apps/server/src/services/ordersService.ts` · `councilService.ts`, `politicsService.ts`
  (stand, back) · `issuesDay.ts` (Issue and hero awards; maths in `packages/rules/src/ledger.ts`)
  · `heldService.ts`, `risk.ts` (strike)
- Data: `characters.pc` (`packages/db/src/models/character.ts`)
- Client: `packages/ui/src/components/HudBar.tsx`, `OrdersComplete.tsx`; Me tab
  `apps/client/src/routes/me.tsx`

## Status

Stored and shown from slice 1; first sinks in slice 3; Issue and hero awards in slice 4; the strike
in slice 5. The [[Voting Rework]] (12 Oct 2026) made the council cost spent, not a deposit, and
removed the 20 PC rule proposal. Events, higher offices, laws and patrons are not built.

## Decisions

- [[Review 2]]: always the full name, never *PC*.
- 10 Oct 2026 ([[Voting Rework]]): standing is spent, backing is optional (Appendix C #106), a
  councillor's rule on the ballot is free.
- Slice 6 (designed): event PC halves after the first event of the day (Appendix C #59).

## Open questions / drift

No drift found: the code's `COUNCIL.stipend = { pc: 10, fxp: 20 }` and the other constants match
§6.5.

> [!note] Inference
> GDD §6.5 says a councillor *banks 15 a day*: that is the seat's 10 plus the orders' 5, not a
> stipend of 15.

> [!note] Inference
> The Political Aide job (§9.2, 2 PC a day) would be a PC source; it is not placed in any city yet.

## Related

[[Party Orders]] · [[City Council and the Rule Vote]] · [[Offices]] · [[Heat and Record]] ·
[[Issues of the Week]] · [[Influence Ledger and City Hero]] · [[Levels and Faction Rank]] ·
[[Campaign Events]]
