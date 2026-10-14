---
type: system
title: Party Orders
aliases: [Party Directives, Directives, Orders, Faction Chair orders, Welcome set]
tags: [street-play, faction, daily]
status: partly built
slice: "1; welcome set 2; capital rotation 4; mission order 5; orders off in the cells review 4; Chair's standing orders designed for 7"
gdd: ["§13.7", "§15.4"]
adrs: ["0009", "0012", "0046", "0073", "0078"]
updated: 2026-10-14
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
- **The welcome set** (ADR 0012, ADR 0073): on the **welcome day** (the City Day of creation, and the next one too if created after 22:00 UTC) the orders are fixed: **A** two attempts at a political action by your best stat; **B** **the favour from the platform** at your HQ (a one-off ticket, see [[Patronage and Favours]]); **C** *Take a job*, which completes when a job is taken (+20 Party XP). Together they pay the first +5 PC.
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

Built: the secretary's rotation ([[Slice 1 The 5-Minute Session|slice 1]]), the welcome set (slice 2, reworked in [[Review 4]] and [[Review 5]]), the capital rotation and crisis pair ([[Slice 4 The Battleground|slice 4]]), the mission order ([[Slice 5 Risk|slice 5]]), orders off in the cells and the doable-only rule (review 4), the branch's backing ([[Voting Rework]]). **Not built:** the event order and the secretary's daily fixture (slice 6), the Chair's standing orders, push and target (slice 7).

## Decisions

- Reviews 1–2: titles say what and where; tapping opens the pin.
- Review 4 (6 Oct 2026): slot B of the welcome set is the favour; orders close in the cells (opportunity, not Party XP; Appendix C #94).
- Appendix C #18: the welcome set is per character, extended to the next day after 22:00 UTC.

## Open questions / drift

> [!warning] Drift
> [[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]] still says the secretary steps in if "the Chair sets nothing **by 06:00**". The slice-7 paragraph in the same section (and ADR 0046) says standing orders apply from the next boundary and the secretary's rotation applies until a Chair first sets any. No 06:00 deadline exists in the slice-7 design.

> [!warning] Drift
> The welcome favour's titles: [[GDD#13.7 Party Directives (new)|GDD §13.7]] still lists the review-4 favours (*Deliver Holm's parcel at the Union Hall* · *Hand out Stahl's bundle at Beacon House* · *Witness the signature at the Assembly Rooms*). [[design/review-5-answers#19.5 The favours (slot B of the welcome set at the HQ; `use: 'welcome'`, type `council`, 10 Energy, difficulty 8; each follows from the beat-1 problem)|Review-5 answers §19.5]] and `orders.ts` / the city files have *Sign on at the Union Hall* · *Get the stamp at Beacon House* · *File the appeal at the Assembly Rooms*.

> [!warning] Drift
> [[adr/0012-welcome-set-first-city-day-orders|ADR 0012]] still describes slot A as "the first pin's canvass" and slot B as a committee session; reviews 1 and 4 changed both (best-stat action; the favour). ADR 0073 amends it, but ADR 0012's text is not marked superseded.

## Related

[[Street Actions]] · [[Missions]] · [[Political Capital]] · [[Iron Vanguard]] · [[Red Collective]] · [[Civic Alliance]] · [[People of Irongate]] · [[The Morning Paper]] · [[Campaign Events]] · [[Residence]]
