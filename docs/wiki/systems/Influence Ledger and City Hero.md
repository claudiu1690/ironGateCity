---
type: system
title: Influence Ledger and City Hero
aliases: [Influence Ledger, Ledger, City Hero, District Hero, Heroes, Contributions, Faction scoreboard, Scoreboard]
tags: [city, opinion, recognition]
status: partly built
slice: "4 (ledger, plate line, heroes); faction scoreboard designed for 6"
gdd: ["§14.5"]
adrs: ["0028", "0042"]
updated: 2026-10-14
---

# Influence Ledger and City Hero

## In one paragraph

Every change to an opinion meter is written down as a **ledger row**, attributed to the player
(or the system) that caused it. That makes each player's work visible without outside tools: a
line on the city plate says how much you moved this place this election and your rank. At every
count the biggest contributor in each level bracket becomes **City Hero** (in a home city) or
**District Hero** (per Irongate district), with Political Capital, a title and a line in the paper.

## How it works

- **The ledger** ([[GDD#14.5 The Influence Ledger and City Hero|GDD §14.5]]): one row per opinion
  change: place, faction, the swing *as applied* (after floors, in thousandths), kind, source
  (character or system), day, council cycle and a reference. Actions, missions and journey cards are
  attributed to the character; drift, Issue awards, ballots and seats to the system.
- **The plate line**, live at read: *This election you've moved Eastside +1.3 for the Collective
  (2nd of 7)*. The rank is among **all** contributors there this cycle, any party.
- **Heroes**, at each count, per city (per district in the capital) and per **level bracket**
  (1–15, 16–30, 31+): the character with the largest positive sum this cycle, **if at least +0.5
  points**. Ties go to whoever reached it first. Any contributor qualifies, resident or visitor. A
  home ballot's +0.5 is a row but not a contribution, so a ballot never makes a hero.
- **Rewards:** the title for the next cycle (*District Hero, Eastside*), **25 PC**, a line *In
  Print* in the paper; from slice 8 a Legacy entry and a medal. Paid at the count whether present
  or not, credited at the player's next settlement.
- Up to 15 heroes a cycle in the capital (5 districts × 3 brackets), 3 in each home city. The top
  three per bracket are printed on the count page.
- **Issue awards** use the same machinery: the owning party's top five contributors by momentum get
  4 PC each ([[Issues of the Week]]).
- **The faction scoreboard (slice 6, designed):** the Faction tab ranks members by *Moved* (positive
  swings summed across cities), *Events* joined and *Heroes* (titles won in the period), for **this week** (Monday to Monday) and **all
  time** (*this season* from slice 8), per level bracket, with a city filter. Members only.

## Where it lives

**Rules:** [[GDD#14.5 The Influence Ledger and City Hero|GDD §14.5]] ·
[[design/slice-4-battleground#11. The influence ledger and District Hero (§14.5, pinned)|slice-4 design §11]] ·
[[design/slice-6-together|slice-6 design §6.4]] (scoreboard) ·
[[adr/0028-influence-ledger-contributions-and-awards|ADR 0028]] ·
[[adr/0042-faction-scoreboard-scoped-totals|ADR 0042]] (proposed)

**Code:**
- Rules: `packages/rules/src/ledger.ts` (`levelBracket`, `scoreboardLine`, `heroes`,
  `topByBracket`) · constant `HERO` in `packages/rules/src/constants.ts`
- Server: `apps/server/src/services/ledger.ts` (`writeLedger`, `addInfluence`, `addPoints`,
  `cycleKeyOf`) · `apps/server/src/services/issuesDay.ts` (`heroesStep`, called by
  `cityDay.ts` and `capitalDay.ts` on count day) · `apps/server/src/services/cityService.ts`
  (`scoreboardLines`)
- Data: `packages/db/src/models/ledger.ts` (collections `influenceLedger`, `contributions`,
  `awards`)

## Status

- **Built (slice 4):** ledger rows in the same transaction as the meter write, per-character
  running totals in `contributions` (`influence|<place cycle>` and `points|<issue>`), the plate
  line, City and District Heroes with 25 PC and the title, the count page's top three. Review 5
  added the `unrest` award kind on the same `awards` collection
  ([[Battleground and Groundswell]]).
- **Not built:** the faction scoreboard (slice 6; no `faction|…` scopes in the code yet); Legacy
  entries and the medal (slice 8).

## Decisions

- Keep ADR 0010's write-through and add a ledger row alongside, rather than folding the meter
  from the ledger. Nothing aggregates the ledger on a read path (ADR 0028).
- Awards are written by the city day and credited by the character's settlement, so being away
  never loses a title or PC.
- On an action *against* a rival, the actor's half counts as their contribution (ADR 0034).

## Open questions / drift

- **Ledger rows for losses (QA slice 4, n3, still open):** persuasion writes a row only for the
  gaining party. When Neutral is at its floor and rivals lose share, their losses have no row, so a
  fold of the ledger would not reproduce the meter. Harmless at today's numbers. Since 14 Oct 2026
  [[adr/0028-influence-ledger-contributions-and-awards|ADR 0028]]'s amendment records the limit and
  lists the choice as a **decision for slice 6** ([[tech/slice-6|tech/slice-6]] §22.1): (a) write the
  losers' rows too, or (b) call the ledger an attribution log; default (a) if the slice-6 screens show
  losses per party. See [[qa/slice-4-report|QA slice-4 report]].
- The scoreboard's columns now agree: GDD §14.5 names *Moved*, *Events* and *Heroes*, as ADR 0042
  does (fixed 14 Oct 2026).

## Related

[[Influence and Opinion]] · [[Issues of the Week]] · [[Political Capital]] · [[Legacy]] ·
[[City Council and the Rule Vote]] · [[The Morning Paper]] · [[Campaign Events]]
