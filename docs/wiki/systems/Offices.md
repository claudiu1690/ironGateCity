---
type: system
title: Offices
aliases: [Office ladder, The ladder of office, Cursus honorum, Councillor, Governor, Mayor, Faction Chair, Deputy, President]
tags: [politics, offices, ladder]
status: partly built
slice: "3 (councillor); 4 (capital seats); Governor, Chair, deputy, President designed for 7"
gdd: ["§15.1", "§15.2", "§15.4", "§15.5"]
adrs: ["0020", "0048", "0084"]
updated: 2026-10-14
---

# Offices

## In one paragraph

Offices are the seats a player can win: City Councillor, Governor (Mayor in Irongate), Faction
Chair, Deputy in Parliament and President. They form a **ladder**: you can't skip a rung, because
each office needs a completed term in the one below. Rank gives the right to stand; the ladder
gives the experience. Every office pays Political Capital and Party XP each morning it is held,
present or not, and every duty has a default, so an absent holder never blocks anyone. Only the
**councillor** is built today.

## How it works

- **Five offices, about 108 seats a term** ([[GDD#15.1 Offices|GDD §15.1]]):
  - **City Councillor**: 7 per home city, 10 in Irongate (2 per district), 7 in Clearwater (slice 7). 5-day term, count to count. Won on reputation and backers. Power: **your rule on the town's ballot**. Pay **10 PC + 20 Party XP** a day. See [[City Council and the Rule Vote]].
  - **Governor / Mayor**: 1 per city. 5-day term with the council. Chosen at the count: the player councillor with the highest total who has completed a council term (in the capital and Clearwater, among the largest bloc). Power: **card 1 on the city's ballot** and the **Address** (+50 momentum on one Issue) once a term. Pay **20 PC + 30 Party XP** on top of the seat.
  - **Faction Chair**: 1 per faction. 28 days (term day 14 → 14). Elected by the faction. Sets the [[Party Orders]], the party line on bills, the party's rule per city, calls events anywhere. Pay **20 PC + 40 Party XP**. Election detail: [[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]].
  - **Deputy**: 60 seats. 28 days. The party's seats by D'Hondt go down its list. Votes on bills, tables one law a term (50 PC). Pay **5 PC + 30 Party XP**. See [[The Legislature and Laws]].
  - **President**: 1. 28 days, at most two in a row. A law a week, the veto and the Address once a term. Pay **50 PC + 60 Party XP**, Legacy 40. See [[National Elections]].
  - *Minister* and *Speaker* are post-MVP ([[Ministers]]).
- **The ladder** (who can stand):
  - Councillor: Rank 3, resident, *Known* there, **10 PC spent**, a named rule.
  - Governor: a completed council term (nothing to file).
  - Chair: Rank 4, a completed council term, 14 days in faction, **25 PC spent**, no backers needed.
  - Deputy: Rank 5, a completed Governor term **or three** completed council terms, 25 PC.
  - President: Rank 6, a completed deputy term, wins the party's pick, 100 PC.
- **Pacing the GDD expects:** first seat in week 2 at the earliest; Governor in month 2; Parliament at the end of season 1; the Presidency from season 2.
- **A term is completed** only when held to its count. A seat vacated by a move, a dissolved council ([[Recall and Removal]]) or a removal does not count.
- **Several offices at once are allowed** (a Chair may sit on a council). Stipends add; the 1,000 PC cap is the only limit (Appendix C #65).
- **Integrity rules** ([[GDD#15.2 Integrity rules|GDD §15.2]]): one account per person; linked accounts count once in every count (see [[Moderation and Fair Play]]); tenure after a faction switch (7 days to vote or back, 14 to stand; national candidates always need 14 days); switching faction vacates every office and halves PC ([[Monetisation]]); nothing political is for sale.

## Where it lives

**Rules:** [[GDD#15.1 Offices|GDD §15.1]] · [[GDD#15.2 Integrity rules|GDD §15.2]] · [[design/slice-7-nation|slice 7 design §3]] · [[adr/0020-council-records-collections-and-projections|ADR 0020]] (council seats as `officeTerms`, stipends credited lazily) · [[adr/0048-offices-on-office-terms-and-the-ladder|ADR 0048]] (every office an `officeTerms` row; the ladder is a count) · [[adr/0084-seats-by-reputation-and-backers-standing-is-spent-with-a-rule|ADR 0084]] (the councillor's rule lives on the term)

**Code (built: the councillor):**
- Rules: `packages/rules/src/council.ts` (`countSeats`, `stipendBoundaries`, `marginToSeat`); `COUNCIL` in `packages/rules/src/constants.ts` (stand Rank 3, stipend 10 PC / 20 FXP, cost 10)
- Server: `apps/server/src/services/councilService.ts` (`declare`, `setRule`); stipend credit in `apps/server/src/services/dayService.ts`
- Data: model `OfficeTerm` in `packages/db/src/models/politics.ts` (one row per seat per term, players and locals; `completed`, `vacatedDay`, `rule`, `whatNowSeenAt`); `offices[]` projection on the character
- Client: the Town Hall's council rows and *What now* card (`packages/ui/src/components/TownHall.tsx`, `apps/client/src/features/council/TownHall.tsx`)

**Planned (slice 7, [[tech/slice-7|tech spec]]):** `officeTerms.office` (`council | governor | chair | deputy | president`), `packages/rules/src/ladder.ts` (`standGate`, `ladderRows`, `officeStipends`, `governorOf`), `governorService`, `chairElectionService`.

## Status

- **Built:** City Councillor (slice 3 at home, slice 4 in the capital), reworked in the [[Voting Rework]] (12 Oct 2026): standing is 10 PC spent with a named rule; the seat's power is the rule on the ballot.
- **Designed, not built:** Governor/Mayor, Faction Chair, Deputy, President, the ladder's gates and `officeTerms.office` (slice 7). No `governor`, `chair` or `president` exists in the code yet.
- **Post-MVP:** Minister, Speaker.

## Decisions

- **One office at the top, the President; no Chancellor** (slice 7; Appendix C #64).
- **Several offices at once** (Appendix C #65).
- **No backers needed to stand**, for councillor and Chair (user, 10 Oct 2026; Appendix C #106).
- **The Governor's power is card 1**, not an order-paper item (voting rework, 10 Oct 2026; [[tech/slice-7|tech/slice-7]] §6.8, rewritten 14 Oct 2026 around `partyCardOf`).
- 14 Oct 2026 (drift cleanup): [[adr/0048-offices-on-office-terms-and-the-ladder|ADR 0048]] amended (decision 6 superseded: the Governor's rule is card 1, no council vote); the slice-7 design's ladder table now says no backers needed, and its old Governor's-rule bullet is marked superseded.

## Open questions / drift

- Open (designer): confirm slice 7's `partyCardOf` chain against the GDD wording (see [[City Council and the Rule Vote]]).

## Related

[[City Council and the Rule Vote]] · [[National Elections]] · [[The Legislature and Laws]] · [[Recall and Removal]] · [[NPC Fill]] · [[Political Capital]] · [[Levels and Faction Rank]] · [[Party Orders]] · [[Legacy]]
