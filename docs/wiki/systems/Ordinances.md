---
type: system
title: Ordinances
aliases: [Ordinance, Council rules, Council rule menu, Rule menu, Ordinance DSL, Effects DSL]
tags: [politics, council, modifiers]
status: built
slice: "3; renamed in reviews 1–2; Tram Subsidy in 4; plainLine in review 4; chosen by the rule vote since 12 Oct 2026"
gdd: ["§15.3", "§15.8", "§22.2"]
adrs: ["0021", "0030", "0044", "0083"]
updated: 2026-10-14
---

# Ordinances

## In one paragraph

An ordinance is a **council rule**: a small, bounded change to a number that already exists in
the game (job pay, a speech's Energy, the Rested cap, train fares), in force in one city for five
City Days, for everyone there whatever their party. The menu is closed and every effect has a
fixed bound, so a rule can tune the game but never break it. Since the [[Voting Rework]] the town
picks which ordinance runs by the [[City Council and the Rule Vote|rule vote]]: the three cards on
the ballot are three ordinances. The same effects language later carries the week's Issues and,
from slice 7, national laws.

## How it works

- **The menu: eleven rules, one menu for every city** ([[GDD#15.3 City Councils|GDD §15.3]], which says so since 14 Oct 2026; content `ordinances.ts`). Headline effects:
  - *Public Works Order* job pay +10 % · *Long Service Order* seniority builds two days a day · *Street Permits* propaganda swing +15 % · *Rally Permits* speeches −2 Energy · *Reading Room Grant* training Energy −20 % · *Rest Day Order* Rested cap +50 · *Open Doors* canvass +4 % chance · *Street Register* every Success counts two for [[Local Standing]] · *Street Fund* Iron from checked actions +25 %, job pay −25 % · *Public Meetings Order* Party XP +25 % on actions · *Tram Subsidy* tickets from the city −50 % (floor 5 Iron).
- **One in force per city**, from the count for five days. With no votes, card 1 (the party's rule) runs, so a city always has one.
- **Cost rules change the cost only.** Rewards stay on the content Energy (a cheaper speech still pays as a full one).
- **Rested never shrinks** when Rest Day ends: a pool banked to 250 stays 250 and is spent down.
- **Every bonus is a named line** in the [[The Result Modal|result modal]] and a tag on the ticket. Each rule has three texts: `line` (flavour), `effectLine` (caps, with numbers, on cards) and `plainLine` (≤ 60 characters, on the city plate and the Town Hall: *jobs pay a tenth more*).
- **Season rollover** ends every council rule and law in force ([[GDD#22.2 Rollover (the first day of the new season)|GDD §22.2]]; see [[Political Seasons]]).

**The effects language (DSL)** ([[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]]):
- A **closed list of effect kinds** owned by `packages/rules`, each with a bound in `ORDINANCE_BOUNDS` (e.g. `jobPayPct` −25…+10, `energyDelta` −2…0, `ticketPct` −50…0). The content loader refuses any effect outside its bound.
- **Constant for a City Day.** Each city has one modifier set per day; the character settlement credits each past day with *that day's* rule (pay, the Rested cap), using `cities.ordinance` and the last four in `ordinanceHistory`.
- A new rule using an existing kind is **content only**; a new kind is a rules change with its bound.
- Since slice 4 ([[adr/0030-modifier-sources-and-named-factors|ADR 0030]]) the week's [[Issues of the Week|Issue]] effects use the same DSL as a second **modifier source** (kinds `ticketPct`, `roomPct`, and from slice 5 `heatCoolPct`, `bailPct`). Slice 7 adds **laws** as a third source with their own `LAW_BOUNDS` ([[adr/0044-laws-a-third-modifier-source|ADR 0044]]; [[The Legislature and Laws]]). See [[Modifiers]].

**How ordinances relate to the rule vote.** An ordinance is the *thing* voted on; the rule vote is the *way* one is chosen. A candidate names an ordinance when standing; a councillor's ordinance (on `officeTerms.rule`) can become card 2 or 3; the party's default ordinance is card 1. The winner is written to `cities.ordinance { id, fromDay, toDay, paperId }`, where `paperId` now points at the rule ballot that chose it ([[adr/0083-the-town-votes-on-a-rule-three-cards-set-at-day-2|ADR 0083]]). Before 12 Oct 2026 the sitting council chose it on an order paper.

## Where it lives

**Rules:** [[GDD#15.3 City Councils|GDD §15.3]] (the menu, *The home-city menu*) · [[GDD#15.8 Laws|GDD §15.8]] (laws on the same DSL) · [[design/slice-3-politics|slice 3 design §10]] · [[design/review-4-answers|review 4 answers §11]] (`plainLine`) · [[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]] (amended 14 Oct 2026: the eleven ids and the current effect kinds) · [[adr/0030-modifier-sources-and-named-factors|ADR 0030]] · [[adr/0083-the-town-votes-on-a-rule-three-cards-set-at-day-2|ADR 0083]]

**Code:**
- Rules: `packages/rules/src/ordinances.ts` (`OrdinanceEffect`, `ordinanceBoundProblem`, `cityModifiers`, `placeModifiers`, `actionEnergy`, `trainingEnergy`, `jobPayLines`, `swingMultiplier`, `standingPerSuccess`, `restedCapFor`, `priceLines`, `rewardShares`) · `ORDINANCE_BOUNDS` in `packages/rules/src/constants.ts`
- Server: `apps/server/src/services/modifiers.ts` (the day's sources for a place: the ordinance, then the Issues) · the rule picker `ruleMenu` in `apps/server/src/services/politicsService.ts`
- Data: content `packages/content/src/data/ordinances.ts` (the eleven); the in-force rule and history on the city document, `packages/db/src/models/city.ts`
- Client: the city plate's rule line and chip (`apps/client/src/routes/city.tsx`), `packages/ui/src/components/RuleCard.tsx`

## Status

- **Built** in slice 3 (ten rules), Tram Subsidy added in slice 4, `plainLine` in review 4. Chosen by the rule vote since 12 Oct 2026.
- **Waiting for later slices:** the older list (Police Patrols, Rent Control, Market Tax, Clinic Funding, Press Freedom / Licensing, Festival Permit, Curfew) returns "with the same bounds" in the slices that build the systems they touch (GDD §15.3).

## Decisions

- Review 1: *Shift Hours Order* → **Long Service Order** (seniority ×2).
- Review 2: *Ward Register* → **Street Register**, *Ward Fund* → **Street Fund**.
- Review 4: `plainLine` added; `effectLine` keeps its caps role (with the architect, 6 Oct 2026).
- Voting rework (10 Oct 2026): the menu, bounds and plain lines are untouched: "the bonuses the user likes are the one thing this document keeps whole" ([[design/voting-simplified|voting-simplified Appendix B]]).
- 14 Oct 2026 (drift cleanup): GDD §15.3's menu table lists all eleven (Tram Subsidy row added; a home town may halve its own fares); [[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]] now names the eleven ids and the kinds the code has (`seniorityDays`, `ticketPct`, `roomPct`, `heatCoolPct`, `bailPct`).

## Open questions / drift

> [!warning] Drift
> **Still open (the user, drift row A9).** GDD §22.2 (slice 8 paragraph) says at rollover "every law and council rule in force ends (the councils' **next order papers** start the rules again)". Order papers no longer exist, and the voting rework's principle is that **a city always has a rule**. What runs in a city between the rollover and the next count is not settled. See [[Political Seasons]].

## Related

[[City Council and the Rule Vote]] · [[Modifiers]] · [[Issues of the Week]] · [[The Legislature and Laws]] · [[Jobs]] · [[Rested]] · [[Travel and Journeys]] · [[The Result Modal]]
