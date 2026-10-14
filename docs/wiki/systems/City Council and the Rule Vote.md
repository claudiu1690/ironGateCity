---
type: system
title: City Council and the Rule Vote
aliases: [City Council, Council, The Rule Vote, Rule vote, Council rule, Council elections, The ballot, Standing for the council, Backing, Town Hall]
tags: [politics, council, voting]
status: built
slice: "3 (home council); 4 (capital districts); review 4 (Town Hall); reworked in the voting rework (10–12 Oct 2026)"
gdd: ["§2", "§15.1", "§15.3", "§15.10", "§14.11"]
adrs: ["0019", "0020", "0077", "0083", "0084", "0085", "0086"]
updated: 2026-10-14
---

# City Council and the Rule Vote

## In one paragraph

Every five days each city **votes on one rule** (an [[Ordinances|ordinance]]) that changes a
number for everyone in town for the next five days: jobs pay more, speeches cost less, trains are
half price. Three rule cards are on the ballot; every Rank 2+ resident taps one, in secret; the
most votes wins, and a tie or no votes goes to card 1, the party's rule, so **a city always has a
rule**. Underneath sits the **council**: seven seats (ten in Irongate) won on **reputation and
backers**. A councillor's power is to **put their rule on the ballot** and draw pay. This replaced
the old model on 10–12 Oct 2026, where citizens elected people and the council then voted on the
rule (see *What it replaced* below).

## How it works

**The calendar** ([[GDD#2. Time model|GDD §2]], [[GDD#15.3 City Councils|GDD §15.3]]). `cycleDay = (dayKey − offset) mod 5`; offsets Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4, so a vote is open somewhere every day. No phase has a clock time.

| Cycle day | What happens |
|---|---|
| 0–1 | The new council sits. **Candidates stand** for the next council; **councillors set their rule** (free, one tap). |
| Boundary into day 2 | **The set:** the candidate list and the **three cards are frozen**. |
| 2–4 | **The vote on the rule.** Backing stays open until the count. |
| Boundary into day 0 | **The count:** the rule and the seats. The winner is in force **from the count for five days**. |

**The three cards.**
- **Home city:** card 1 is **the party's rule** (the Governor's choice → else the Chair's → else the secretary's default: Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*). Cards 2–3 are the rules of the **two top-seated player councillors**, filled by the seated **local councillors' rules** in seat order (each home local carries a rule in content), so there are always three different cards even in a branch of one.
- **During Unrest** the party's card comes off the ballot ([[Home Cities]], [[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]]); player councillors may then fill all three cards.
- **Irongate and Clearwater:** **one card per party**, by the chain Mayor/Governor → the party's top-seated player councillor → the Chair → the secretary. Two parties picking the same rule **share one card** and their votes and seats add up: that is the coalition.

**Deciding the rule.**
- **Home:** most votes wins; ties to card 1, then the earlier card; **no votes: card 1**.
- **Capital:** each district scores its parties with the slice-4 formula (`w × ballotShare + (100 − w) × opinionShare`, `w = 50 × min(1, ballots ÷ 10)`; a party's ballots are its card's votes, a shared card's votes split equally). Two seats per district by D'Hondt. **The rule is the card with the most seats across the city**; ties by ballots, opinion share, then a seeded draw. A rule always passes. The formula is never printed. See [[Capital Districts]] and [[Battleground and Groundswell]].

**The vote.** Rank 2+ residents (of the district in the capital), once per cycle, one tap, **secret and final**. No running totals; every count printed after. Voting is 3 taps on a phone, 2 on desktop (the card is the ballot).

**The seats.**
- **Total = local support + 3 × backers** (at most five backers count). Local support (the ward vote) is your [[Local Standing]] Successes in the city ÷ 5, read at the count; a local's is a fixed profile ±2 jitter. Members' votes are **not** part of it.
- Seven highest totals win. Ties: backers, then Successes, then filing (locals last).
- **Standing:** Rank 3 · resident · *Known* there · **10 PC, spent, never returned** · name a rule. Not a sitting councillor of that city; can't move house until the result.
- **Backing:** Rank 2+ residents, **10 PC, +3**, public, final, one per member per cycle per city, open until the count. **The branch's backing** is a free +3 on a day the candidate finishes all three [[Party Orders]].
- **Pay:** 10 PC + 20 Party XP at every boundary held, present or not.
- The player reads one sentence: *Seats go to the seven best known here, counting their backers. Local candidates fill the rest.*

**The Town Hall** (review 4, [[adr/0077-the-town-hall-an-always-open-place-and-the-councils-public-view|ADR 0077]]). A place on every city map (kind `town-hall`, open from Level 1) with one *Sit in the public gallery* ticket (Intelligence, 6 Energy) and a sheet that is the council's public face: *The rule in force* · *Next week's rule* (the vote itself on days 2–4) · *The council* · *Stand for the council* · *This week's Issues*. The rule in force is also on the city plate (its `plainLine`), the tickets and the Me tab. Winning a seat shows a two-line *What now* card once per term.

**What it replaced** (until 10 Oct 2026). The ballot was for **a person** (nine names for seven seats); members' votes counted toward seats; candidates needed **two backers** or were struck, paid a **refundable 10 PC deposit**, could withdraw, and had platform lines. The **sitting council then divided on an order paper** on days 0–1 (the branch's motion plus proposals at 20 PC; *None of these*; four of seven to pass at home, six of ten in the capital; locals followed the leading player). A city could end up with **no rule** (*the council couldn't agree*). The design counted 33 concepts to cast one vote; the new model has 10 ([[design/voting-simplified|voting-simplified §6]]).

## Where it lives

**Rules:** [[GDD#15.3 City Councils|GDD §15.3]] · [[GDD#15.10 NPC fill: politics at any population|GDD §15.10]] · [[design/voting-simplified|design: voting simplified]] (§3 the model, §4 the screens, §8.6–§8.12 settled wording) · [[tech/voting-rework|tech: voting rework]] · [[qa/voting-rework-report|QA report]] · [[adr/0083-the-town-votes-on-a-rule-three-cards-set-at-day-2|ADR 0083]] (the rule vote, three cards set at day 2) · [[adr/0084-seats-by-reputation-and-backers-standing-is-spent-with-a-rule|ADR 0084]] (seats, standing, backing) · [[adr/0085-the-contested-citys-rule-is-the-largest-blocs|ADR 0085]] (the capital's largest bloc) · [[adr/0086-converting-a-city-to-the-rule-vote|ADR 0086]] (the conversion, migration 009) · [[adr/0019-secret-ballot-numbered-box|ADR 0019]] (one `votes` row per voter, secret at the API) · [[adr/0020-council-records-collections-and-projections|ADR 0020]] (council records in their own collections) · [[adr/0077-the-town-hall-an-always-open-place-and-the-councils-public-view|ADR 0077]] (the Town Hall). Older background: [[design/slice-3-politics|slice 3 design]], [[design/slice-4-battleground|slice 4 design §8]].

**Code:**
- Rules: `packages/rules/src/calendar.ts` (`councilDay`, `boundaryWork` → `{ count, set }`) · `ruleBallot.ts` (`homeBallot`, `partyCardOf`, `capitalBallot`, `decideHomeRule`) · `council.ts` (`countSeats`, `freezeList`, `wardVote`, `backersOf`) · `capitalCount.ts` (`districtScores`, `dhondt`, `cardBallots`, `decideCapitalRule`) · `COUNCIL`, `CAPITAL_COUNCIL` in `constants.ts`
- Server: `apps/server/src/services/councilService.ts` (`declare`, `endorse`, `vote`, `setRule`, `branchBackIfStanding`) · `ruleBallot.ts` (cards, the set, the tally) · `cityDay.ts` / `capitalDay.ts` (the boundaries) · `votingConversion.ts` (`convertCityVoting`) · `townHallService.ts` · `politicsService.ts` (views, rule menu, headlines) · router `apps/server/src/trpc/routers/council.ts` (`election`, `ballot`, `count`, `capitalCount`, `hall`, `whatNowSeen`, `declare`, `endorse`, `vote`, `setRule`)
- Data: `packages/db/src/models/politics.ts` (`Election`, `Candidacy`, `Vote` with `ordinanceId`, `OfficeTerm` with `rule`, `RuleBallot` in the `ordinances` collection) · migration `packages/db/src/migrations/009-voting-rework.ts` · content `packages/content/src/data/candidates.ts` (locals' `rule`), `ordinances.ts`, `politics.ts` (result modals), `ruleHeadlines.ts`, `copy.ts`, `cities/townHall.ts`
- Client: routes `/council`, `/council/slate`, `/council/ballot`, `/council/count` (`apps/client/src/routes/council.tsx`) · `apps/client/src/features/council/` (`TownHall.tsx`, `useRuleVote.ts`, `usePoliticalAct.ts`) · `packages/ui/src/components/RuleCard.tsx`, `Politics.tsx`, `TownHall.tsx`
- Checks: `apps/server/scripts/checkVotingConversion.ts` (601 of 601 at QA); dev hooks `apps/server/src/dev/voting.ts`; e2e `apps/client/e2e/voting.spec.ts`, `qa.voting*.spec.ts`

## Status

- **Built.** Slice 3 (home council), slice 4 (capital districts), review 4 (Town Hall), then the [[Voting Rework]] built 10–12 Oct 2026, QA'd (no blockers, two majors) and fixed (`ae6ab89`, 12 Oct).
- **Designed, not built:** the Governor's/Mayor's card and the Chair's rule in the chain (slice 7); Clearwater's seven-seat council (slice 7); petitions to dissolve ([[Recall and Removal]]).
- **Leftovers (minor):** times east of UTC read oddly (*until Wednesday 03:00*; kept by the review-4 clock decision); *Councillor … Steps Down* untested; no test drives a capital ballot with a wrapped Street Fund line; `packages/db/test/elections.test.ts` expects removed report columns. The full e2e last passed 276/276 before the fix round.

## Decisions

- **Vote on the rule, not on people** (user, 10 Oct 2026, after review 5: *"The voting feature feels overwhelming"*). Approved with the three recommended defaults: members' votes out of the seat count (Appendix C #105), no backers needed to stand (#106), the capital's rule is the largest bloc's (#107).
- **Dissolution doesn't strike the rule**: it runs out its window (architect Q16, 10 Oct 2026).
- **A shared card's votes split equally** for the score (with the architect, 10 Oct 2026).
- **The count morning's order stays** (personal lines first) and the east-of-UTC strings stand (design §8.12, 12 Oct 2026).
- **The ballot stays secret** (no running totals; Appendix C #25 is the first lever if turnout reads low).

## Open questions / drift

> [!warning] Drift
> **The menu size.** GDD §15.3's home-city menu table lists **ten** ordinances and says Tram Subsidy "returns in slice 4"; its capital bullet says the capital's menu is "the home menu plus Tram Subsidy". But the stand card and rule sheet say **eleven rows**, and the code gives every city all eleven (`ordinancesMenu()` and `irongateMenu()` in `packages/content/src/load.ts` both return all of `ordinances.ts`; home locals carry `ord.tram-subsidy`).

> [!warning] Drift
> GDD §15.10 says each home local's rule is in **`people.ts`**; it is in `packages/content/src/data/candidates.ts` (`people.ts` has none). [[design/voting-simplified|voting-simplified Appendix A]] names `candidates.ts` correctly.

> [!warning] Drift
> Old-model words left in sources: GDD §2 (City Day row: "every day some city counts, seats a council or **divides on an ordinance**"); GDD §14.11 *Residence* ("two endorsements…", a filed candidacy "withdrawn at the move (the deposit stays with the branch)"); GDD Appendix C #24 (the small-branch endorsement rule, removed 10 Oct) still reads as live; code comments in `packages/rules/src/constants.ts` (`CAPITAL_COUNCIL`: "six to pass") and `packages/db/src/models/city.ts` (`paperId`: "the order paper that passed it"). [[adr/0019-secret-ballot-numbered-box|ADR 0019]] and [[adr/0020-council-records-collections-and-projections|ADR 0020]] still describe candidate ballots, deposits and order papers; ADR 0083/0084 amend them, but the old ADR texts carry no pointer.

> [!note] Inference
> The rule voted on in cycle k runs in cycle k + 1, while a different council sits. ADR 0083 states this as intended; nothing in play tests whether players read it as surprising.

## Related

[[Ordinances]] · [[Offices]] · [[NPC Fill]] · [[Recall and Removal]] · [[Capital Districts]] · [[Home Cities]] · [[Local Standing]] · [[Political Capital]] · [[Voting Rework]] · [[Slice 3 The First Vote]] · [[Slice 4 The Battleground]] · [[Review 4]]
