---
type: system
title: Party Orders
aliases: [Party Directives, Directives, Orders, Faction Chair orders, Welcome set]
tags: [street-play, faction, daily]
status: partly built
slice: "1; welcome set 2; capital rotation 4; mission order 5; orders off in the cells review 4; Chair's standing orders designed for 7"
gdd: ["§13.7", "§15.4"]
adrs: ["0009", "0012", "0046", "0073", "0078"]
updated: 2026-10-16
---

# Party Orders

## In one paragraph

Every City Day each member gets **three Party orders**: the faction's agenda for the day, in plain words (*Knock on doors in Foundry Row*). They tell a new player the most useful thing to do today and tie each short session to the faction's plan. Until a player is elected **Faction Chair**, an NPC **party secretary** sets them: Petra Holm (Collective, signs "— P.H."), Viktor Stahl (Vanguard, "— V.S.") and Thomas Grey (Alliance, "— T.G."). The GDD calls them *Party Directives*.

## How it works

- **Three slots** ([[GDD#13.7 Party Directives (new)|GDD §13.7]]): **A** a canvass order, **B** party work (propaganda, a speech, a committee session, intelligence, and from Level 6 a mission), **C** a habit (*Train once*, *Six wins*, *Five attempts*). Every member of a faction gets the same set on the same day, chosen from the day number. Never the same set two days running. No scheduled job.
- **Rewards** ([[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]]): **+25 % Party XP** on matching rows while the order is open (on base Party XP only; the completing row gets it, later rows don't); **+20 Party XP** when an order is done; **+5 Political Capital** when all three are done. Orders are about 30 % of a day's Party XP. The three fit in about **60 Energy**.
- **Progress** counts attempts (Success or Partial) for count orders and wins for *Six wins*; each ×3 row counts.
- **Refresh at 00:00 UTC.** Unfinished orders are simply gone; nothing is taken.
- **Tapping an order** opens its pin with the matching ticket highlighted; every matching ticket wears *Party order n / m*.
- **Completion has a voice:** one order done is a signed line in the [[The Result Modal|result modal]]; all three is a modal in the secretary's voice (+5 PC · +60 Party XP), which waits if the tab closes.
- **The welcome set** (ADR 0012, ADR 0073): on the **welcome day** (the City Day of creation, and the next one too if created after 22:00 UTC) the orders are fixed: **A** two attempts at a political action by your best stat; **B** **the favour from the counter** at your HQ (*Sign on* · *Get the stamp* · *File the appeal*) (a one-off ticket, see [[Patronage and Favours]]); **C** *Take a job*, which completes when a job is taken (+20 Party XP). Together they pay the first +5 PC.
- **By residence** (slice 4): a capital resident gets the capital rotation; slot C's shared templates read `{city}` as the residence city ([[Residence]]).
- **The Unrest crisis pair** replaces slots A and B for members living in a home city in Unrest ([[Home Cities]]).
- **Only doable orders** (review 4): a template is offered only if at least one matching ticket passes your gates today; night-only missions never make the mission order offerable.
- **Orders off in the cells** (review 4, ADR 0078): from an arrest to the day's turn your orders are closed. Done stays done; the +5 PC is out of reach unless already paid ([[Jail and the Cells]]).
- **The branch backs you** (voting rework, ADR 0084): on a day a standing candidate completes all three orders, the branch gives a free +3 backing ([[City Council and the Rule Vote]]).
- **The Chair (designed, slice 7):** an elected Chair sets **standing orders** (three picks by *family*, repeating until changed) and may **push** one to a battleground with a faction target (25 / 50 / 100 attempts; +10 Party XP each if met). Members below Level 10 read the pushed order at home. With no Chair, the secretary's rotation applies. The **event order** (slice 6) joins slot B.

## Where it lives

**Rules:** [[GDD#13.7 Party Directives (new)|GDD §13.7]] · [[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]] · [[design/slice-1-content|slice-1 content §6]] · [[design/review-1-answers|review-1 answers §2, §6]] (welcome table, completion texts) · [[design/review-2-answers|review-2 answers §1.7]] (titles) · [[design/slice-4-battleground|slice-4 design §10]] · [[design/slice-7-nation|slice-7 design §4]] · [[adr/0009-party-orders-computed-progress-embedded|ADR 0009]] · [[adr/0012-welcome-set-first-city-day-orders|ADR 0012]] · [[adr/0073-the-last-train-in-faction-as-an-answer-and-a-welcome-only-favour|ADR 0073]] · [[adr/0078-the-cells-costs-orders-off-an-arrest-always-marks-and-the-cells-list|ADR 0078]] · [[adr/0046-faction-document-chair-standing-orders-and-push|ADR 0046]] (Chair, proposed)

**Code:**
- Rules: `packages/rules/src/orders.ts` (`ordersForDay`, `startOrders`, `orderMatches`, `advanceOrders`, `closeOrders`, `orderRewards`), `welcome.ts` (`isWelcomeDay`); `DIRECTIVES` in `constants.ts`
- Server: progress in the action's transaction (`actionService.ts`, `missionService.ts`, `jobService.ts`); the day's set at settlement (`dayService.ts`); `ordersService.ts` (`seeOrdersNote`); `branchBackIfStanding` in `councilService.ts`
- Data: embedded `characters.orders { day, items[], allDoneAt, off }` · templates `packages/content/src/data/orders.ts` (slots A / B / C, `use: 'welcome'`, `slot: 'crisis'`); `welcomeOrders` per faction in `factions.ts`
- Client: `packages/ui/src/components/Paper.tsx` (`OrdersList`), `OrdersComplete.tsx`, `Ticket.tsx` (the tag)

## Status

- **Phase C, lane Y (16 Oct 2026):** *Set by the Chair, {name}* on the paper's orders, the push tag *the Chair's push · {place}* and the `TargetBar` under the three (`OrdersView.target`, `apps/server/src/services/pushTarget.ts`), on the paper, the city and the Faction tab.
Built: the secretary's rotation ([[Slice 1 The 5-Minute Session|slice 1]]), the welcome set (slice 2, reworked in [[Review 4]] and [[Review 5]]), the capital rotation and crisis pair ([[Slice 4 The Battleground|slice 4]]), the mission order ([[Slice 5 Risk|slice 5]]), orders off in the cells and the doable-only rule (review 4), the branch's backing ([[Voting Rework]]). **Not built:** the event order and the secretary's daily fixture (slice 6). **Slice 7 phase B (15 Oct 2026):** the Chair's standing orders, the push and the party's target on the server (`apps/server/src/services/chairDeskService.ts`: `setOrders`, the member's `push|{f}|{day}` contribution in every action and mission transaction, the day's result in the nation's day); the settlement turns them into each member's orders, marked *Set by the Chair, {name}*, with the push item naming its place, and pays +10 Party XP for each met day the member knocked (`apps/server/src/services/nationEdition.ts`, `dayService.ts`; `orders.setBy` on the character). The welcome set and the crisis pair still win. The screens and the orders' target bar are phase C.

## Decisions

- Reviews 1–2: titles say what and where; tapping opens the pin.
- Review 4 (6 Oct 2026): slot B of the welcome set is the favour; orders close in the cells (opportunity, not Party XP; Appendix C #94).
- Appendix C #18: the welcome set is per character, extended to the next day after 22:00 UTC.
- 14 Oct 2026 (drift cleanup): GDD §15.4 drops the secretary's "by 06:00" (a Chair's picks apply from the next boundary, no deadline); GDD §13.7 names the review-5 favours; [[adr/0012-welcome-set-first-city-day-orders|ADR 0012]] amended (slot A by best stat, slot B the favour).

## Open questions / drift

- None open in the sources.

## Related

[[Street Actions]] · [[Missions]] · [[Political Capital]] · [[Iron Vanguard]] · [[Red Collective]] · [[Civic Alliance]] · [[People of Irongate]] · [[The Morning Paper]] · [[Campaign Events]] · [[Residence]]
