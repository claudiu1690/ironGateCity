---
type: history
title: Slice 7 The Nation
aliases: [Slice 7, The nation]
tags: [slice, building]
status: built
dates: 2026-10-04 (designed); 2026-10-15 (approved, building); 2026-10-16 (built, integrated)
commits: [1f8172a, ef6b697]
gdd: ["§2", "§14.1", "§14.8", "§15.1", "§15.4", "§15.5", "§15.6", "§15.8", "§15.9", "§15.10", "§17.1"]
adrs: ["0043", "0044", "0045", "0046", "0047", "0048", "0049", "0050"]
updated: 2026-10-16
---

# Slice 7 The Nation

**Status: built** (16 Oct 2026: both phase C lanes, then the integration: the new art, T30's sweeps and report, the full e2e green, T31's docs); **QA next**. Building began 15 Oct 2026, when the user approved the design's seven defaults. Designed on 4 Oct 2026; amended by [[Review 4]], [[Review 5]] and the [[Voting Rework]]. Phase A runs in two lanes: the developer's rules, schemas and accessors (T1–T6, T9, T10) and the designer's content (T7 Clearwater, T8 the nation).

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 7 — The nation|the plan]]: the rest of the office ladder (Governor/Mayor, Faction Chair, Parliament, national elections, the President), laws with fixed bounds and a 5-law cap, Clearwater as the second battleground, National Control weights 40/30/10/10/10, recall petitions and no-confidence votes.

- **Question:** does holding office feel powerful, and does losing it make players want to fight back?

## What is planned

- **Terms of 28 City Days** from a fixed epoch, with fixed windows for every vote; never a required online time ([[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]]).
- [[Offices]]: the **Governor** (the largest bloc's top councillor), the elected **Chair** of each party (standing orders, the push, the party line), **60 deputies** and **the President** (one law a week, one veto, an Address); no Chancellor. Several offices at once are allowed ([[adr/0046-faction-document-chair-standing-orders-and-push|ADR 0046]], [[adr/0048-offices-on-office-terms-and-the-ladder|ADR 0048]]).
- [[The Legislature and Laws]]: thirteen laws, at most five in force; 31 of 60 passes, 36 for a factional law; laws are a third modifier source and never touch Party XP or the odds ([[adr/0044-laws-a-third-modifier-source|ADR 0044]], [[adr/0045-parliament-bills-slots-and-computed-local-deputies|ADR 0045]]).
- [[National Elections]], reusing the ballot box ([[adr/0047-elections-above-the-council-reuse-the-box|ADR 0047]]).
- [[Clearwater]] as a single-meter battleground with a seven-seat council and the Casino as its hall ([[adr/0050-clearwater-single-meter-battleground|ADR 0050]]).
- [[National Control]]: 0.40 × Irongate + 0.30 × Clearwater + 0.10 × each home.
- [[Recall and Removal]]: a petition **dissolves** a council; a vote removes the President; a vote on a Chair ([[adr/0049-petitions-dissolution-and-removals|ADR 0049]]).
- Ambition chapter 3, now *The list*.

## Documents

- Design: [[design/slice-7-nation|design/slice-7-nation]] (§21 points for the user, §23 settled; review 4, review 5 and voting addenda) and [[design/slice-7-screens|design/slice-7-screens]].
- Tech design: [[tech/slice-7|tech/slice-7]]. Largely rewritten on 14 Oct 2026 with the knock-ons from [[tech/review-4|tech/review-4]] §20, [[tech/review-5|tech/review-5]] §18 and [[tech/voting-rework|tech/voting-rework]] §17 applied: the party's card from `partyCardOf` (Governor or Mayor at the head), `countDistrict` → `countBattleground`, `decideCapitalRule` → `decideBlocRule` (§6.8); petitions close before the set and leave the rule to run out its window. The planned migration is now `011-slice7-nation` (§5.10, was 009).
- ADRs: [[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] to [[adr/0050-clearwater-single-meter-battleground|ADR 0050]]; [[adr/0047-elections-above-the-council-reuse-the-box|0047]] (no backers or deposits), [[adr/0048-offices-on-office-terms-and-the-ladder|0048]] (Governor's rule = card 1) and [[adr/0049-petitions-dissolution-and-removals|0049]] (the rule runs out its window) amended 14 Oct 2026.
- GDD: [[GDD#15. The Political Engine|GDD §15]], [[GDD#14.8 National Control|GDD §14.8]].

## Decisions made

- **15 Oct 2026, the user: the seven points of design §21 approved as written** and the build started: the President only (no Chancellor); the secretary always on the Chair's ballot and the party's own figure on every pick; petitions dissolve rather than call a snap election; the secretaries table bills for parties with no player in Parliament; Clearwater's start evened to 22 / 22 / 22 / 34; The Front's four places as later pins until slice 8; several offices at once. No number moved. Recorded in GDD §0 (15 Oct 2026) and Appendix C #64, #65, #66, #68, #70; [[Decision Log]].
- **Voting simplified (user, 10 Oct 2026)** changed this slice's design: the Governor sets card 1; the Chair's rule is card 1 wherever no Governor sits; the Chair stands for **25 PC, spent, no backers needed**.

- 14 Oct 2026 (drift cleanup): [[design/slice-7-nation|design §13]] is now headed ***The list*** (keepsake *Your line on the list*); the design's ladder table says no backers needed; its old Governor's-rule bullet is marked superseded; §10.1 lets a dissolved council's rule run out its window. The plan names petitions that dissolve a council and votes to remove the President. Clearwater's card shows 22 / 22 / 22 / 34.
- Open (designer): confirm `partyCardOf`'s chain against the GDD wording ([[City Council and the Rule Vote]]).

## Phase A: the content (T7, T8; 15 Oct 2026)

Written by the game-designer against the T6 schemas (`94572ed`): [[Clearwater]] (the city, missions,
jobs, candidates, six Issues, the lake rotation, the Courier), `laws.ts` (thirteen, within
`LAW_BOUNDS`), the factions' figures, pick names, platforms, preferred laws, local deputies and
houses, `family` on every rotation template and the six push templates, the Town Hall and its
venue rows, `nationalLines.ts` (24), `nationHeadlines.ts` (21 personal lines in five voices),
the 26 result modals, chapter 3 *The list* and its keepsake, and `copy.nation` (screens §15, the
help notes, the empty states). Departures from the design are listed in
[[design/slice-7-nation#Added 15 Oct 2026 — the content written (T7 Clearwater, T8 the nation)|design §"Added 15 Oct 2026"]].

**Bound by the developer** (`7a5e514`): the loader imports, Clearwater as a contested city on one
meter, the nation's placeholder sets, the art.

## Phase A: rules, schemas, art, DB (T1–T6, T9, T10; 15 Oct 2026)

- **Rules** (`packages/rules/src`): `term.ts`, `ladder.ts`, `national.ts`, `parliament.ts`, `laws.ts`,
  `nationEvents.ts`, `nationTypes.ts`; the laws' kinds wired into their functions as optional inputs;
  `partyCardOf` with the Governor, Mayor and Chair; `countBattleground` and `decideBlocRule`; orders v3
  (standing orders, families, the push).
- **Content** (`packages/content/src`): the schemas, `GameContent` accessors and `slice7.ts`'s checks.
- **Art**: three figures' portraits, four scenes, Clearwater's map stills; the set is 22.79 MB.
- **DB**: seven collections in `packages/db/src/models/nation.ts`, the changed fields, migration
  `011-slice7-nation`.
- **Stopgap**: Clearwater's city day waits for phase B (T12).
- Checked with scratch scripts (no unit tests, the user's rule) and the council, capital and voting
  Playwright projects. Everything else is in the tech design's
  [[tech/slice-7#Phase A (15 Oct 2026; T1–T6, T9, T10; commits `94572ed`, `54b8951`, `d75c541`, `f07ea6b`, `7a5e514`, `aed0ec7`, `523ae99`)|Deviations (phase A)]].
- **The designer's four phase-A questions, settled 15 Oct** (design doc, *Settled 15 Oct 2026 (phase A)*):
  §6.3's second example corrected to **21 / 20 / 19** (D'Hondt on the exact scores; the build was right);
  the three trimmed alt texts stand; **`governorOf` changes**: a first-term councillor is never
  Governor, so a bloc with no qualified player and no seated local gives the chair to its top
  **unseated local** from the slate (marked *Local*), not its top seated player; the portrait crops
  (`top: 40`) and the scenes' full frame confirmed. The *The Front* / *ballot* vocabulary allowances
  go to the Playwright sweeps in T30 (the Vitest guards are unrun and untouched).

## Phase B, lane 2: the nation's acts (T14–T19; 15 Oct 2026)

Built in parallel with lane 1 (the nation's day, Clearwater, the Governor, the settlement, the dev panel):
- **T14 the Chair's election** ([[National Elections]]): stand (25 PC), back, vote with the secretary on the ballot, the count and the handover at term day 14.
- **T15 Parliament and laws** ([[The Legislature and Laws]]): tabling, votes, divisions by the locals' chain, enactments, strikes, the Monday bills.
- **T16 the Chair's desk** ([[Party Orders]], [[Offices]]): standing orders and the push, the party's target (each member's contribution in the action's transaction), the party line, the party's card, fixtures, the Chair's call from anywhere.
- **T17 the national election**: names, picks, the vote and backing, the count, taking office at day 0.
- **T18 the President**: the Address, the veto and the override, removals (a player's and the clerk's), the runner-up.
- **T19 petitions and the vote on the Chair** ([[Recall and Removal]]): dissolution in every city day before the set, the Town Hall's signatures, the vote on the Chair.
- Two fixes in shared code: the nation's boundary lost ObjectIds (`structuredClone`), and the orders dropped an item's push on every write.
- Checked with scratch scripts on a memory replica set: four tablers for three slots, the veto racing the enactment ten times, a removal at 40 and 39, the clerk's motion at 24 % and 26 %, design §6.3's example end to end. Details, the test hooks lane 1 needs and what phase C reads: [[tech/slice-7|Deviations (phase B, lane 2)]]. One question, the Chair's tie (S7-T14), settled the same day: the secretary wins an exact tie, one comparator step in `countChair` for the developer ([[design/slice-7-nation|design, Settled 15 Oct (phase B)]]).

## Phase B, lane 1: the nation's day, Clearwater, the Governor (T11–T13, T20, T21 in part; 15 Oct 2026)

- **T11 the nation's day** ([[National Control]]): one `nation` document settled boundary by boundary after the five cities (`apps/server/src/services/nationDay.ts`); National Control, the laws' expiries and the news are lane 1's, every window is a handler in `nationSteps.ts` (lane 2's hook point). The read path settles it on every request (`ensureNationDay`), the `nation-day` job at 00:02. `nation.get` (the bar, the law chips, the term line; also on the nation map as `republic`) and `parliament.laws`.
- **Laws in play** ([[The Legislature and Laws]]): every law in force is a named source in every action, mission, wage, journey, held price and Heat day (`lawBook.ts`), and the law-only kinds reach their functions (XP, mission Energy, journey minutes, run-ins, the caught check, the walk-out price, the record's fade).
- **T12 Clearwater** ([[Clearwater]]): its own city day (`battlegroundDay.ts`: seven seats three ways, lists of three, one card per party, the largest bloc's rule), and playable: the train, *Live here*, the bed on the Rows, its election and ballot, the Courier, the branch channel, Heat +25 % for rivals of a place's controller. No patrol there.
- **T13 the Governor** ([[Offices]]): chosen at every count (home: the whole council; contested: the largest bloc) by the designer's ruling (never a first-term councillor; the bloc's top unseated local last); a player's `governor` term and `city.council.governor`.
- **T20** every office's stipend in the settlement and the `offices` projection; **T21** the hooks `/api/test/term`, `/api/test/nation`, `/api/test/office`, and the `events` spec no longer depends on the clock.
- **Finished the same day** (`a9835b1` … `dc36985`): the Governor's (Mayor's) rule and Address, `office.governor` and `office.mine`, the Governor's line on the hall; **the party cards at the set through `partyCardOf`** (the Governor's or Mayor's rule, then the Chair's rule, at home, in the capital and in Clearwater); the Chair's fixtures and Clearwater's control lines; every record path fades at the law's fade; the settlement's office stipend lines, the party's target (+10 Party XP), the Chair's standing orders (*Set by the Chair*); the paper's national section (*From the capital* / *The republic*, two lines, the window line) and nine personal national lines; the dev panel's nation buttons and status; the Chair's tie (the secretary, then the figure in the pick). A whole term on the test clock with the worker off for a week: one read settles the seven boundaries; the largest nation boundary transaction 14–21 ms.
- **Left for phase C:** the office front pages, eleven personal lines, the Officers channel, the orders' target bar, the panel's ballot and petition buttons, T22's ten runs. Details: [[tech/slice-7|tech spec]], *Deviations, phase B, lane 1, continued*.

## Phase C, lane X: Parliament, the Chair, the elections, petitions on screen (T25 in part, T26–T28, T29 in part; 16 Oct 2026)

- **Built:** the Faction tab's sixth chip **Chair** (Rank 4+): the Chair's desk (Orders with the three pickers and the push, Lines with the party line and the party's cards and the Chair's bill, Events with a call from anywhere and tomorrow's fixtures, Members) and the read-only page; the Chair's election (`/faction/election`, `/vote`, `/result`) and the vote on the Chair (`/faction/confidence`); Parliament (`/parliament`, a bill's page with the count and the veto card, the catalogue and bloc sheets, the law book `/parliament/laws`, *LAW* tags on tickets); the party's pick and the republic's election (`/election/pick`, `/election/national`, the result's `ScoreTable` with *To be confirmed* / *Final*); the President's page (`/office/president`); the petition page (`/council/petition`) and the Election card's petition line. Code: `packages/ui` (`NationHeader`, `Parliament`, `NationalBallot`, `ChairDesk`, `Petition`), `apps/client/src/routes/{parliament,election,president,petition}.tsx`, `features/chair/`, `features/nation/`.
- **Specs:** `chair`, `nation` (the Parliament and election half), `removal`, `petition`, each its own Playwright project after slice 6's; all four pass.
- **Findings:** after a quiet month every home city is in Unrest and every bloc's locals abstain, so nothing passes Parliament (**settled 16 Oct**: the −3 at an unvoted count was the cause; in Unrest the locals now vote the secretary's line and the −3 needs an eligible voter; GDD §14.11, §15.6; [[design/slice-7-nation|design, Settled 16 Oct (phase C)]]; built in the integration, [[Drift Report]] D-S7C-1 resolved); the control override did not show in the count's seats; the record hook's rows are shared between characters on one day. Details and deviations: [[tech/slice-7|tech spec]], *Deviations, phase C, lane X*.

## Phase C, lane Y: the nation map, Clearwater, the Governor, the paper (T24, T25 in part, T29 in part; 16 Oct 2026)

- **Built:** the nation map's strip, `NationBar` (who holds the republic) and `LawChips`, over a map that still covers the rest; the pins' second line (*held by the Alliance*, *close race today*, *Vanguard · Steady*); the republic sheet (five cities weighted, the term line, the one act); the city card's plate word and *Governor: {name}*; the Casino's and every Town Hall's *Governor / Mayor* line; Clearwater's first arrival *You're on the lake* and its residence sheet (the lake branch, the Courier). The Me tab's `OfficeCard`s and `LadderCard`; the Governor's or Mayor's page `/office/governor/$cityId` (the party's card, the Address). The paper: *From the capital* / *The republic*, the Election row's second row, the desk's office and target lines, *Set by the Chair*, the push tag and `TargetBar`, the office front pages. Code: `packages/ui/src/components/{Republic,Office}.tsx`, `apps/client/src/routes/{nation,governor}.tsx`, `features/nation/MeOffices.tsx`.
- **Phase B's leftovers, done:** the Chair's handover (a term seated outside the calendar now ends at day 14), `president.address`'s knock-on, the **Officers** chat channel (Rank 4+), the dev panel's ballot and petition buttons, the office front pages, the eleven personal lines and the live `pushed`, `OrdersView.target`, and the `review1` / `day` / `qa` pay-day strings at any hour.
- **Specs:** `clearwater` (the nation map's layout at 375 × 667 and the lake end to end) and `governor`, each its own Playwright project after lane X's; both pass, with `travel`, `review6`, `landscape`, `council`, `voting`, `faction`, `events` green beside them.
- **For QA:** `review1` fails after other phone specs when a rule is in force in Duskwall (the plate's two hit areas overlap); the journey card on the lake train still talks about the capital (fixed in content 16 Oct); the Governor's front page says *Governor* where the office is *Mayor* (the headlines and copy now use `{title}` or the right word, 16 Oct; the caption is the developer's). Details: [[tech/slice-7|tech spec]], *Deviations, phase C, lane Y*.

## Integration: the art, T30, T31 (16 Oct 2026)

- **Art:** six scenes catalogued: the Casino (in the folder since October) and five painted for the nation at 1344 × 752 (the polling station, the law book, the tram depot, the Governor's office, the lake harbour), with the designer's final alt texts. A scene can be bound to one place (`SceneBinding.locationId`, checked first by `pickArt`): Clearwater's Casino, tram depot and harbour. The pick's and the republic's pages stand on the polling station, the bills and the law book on the law book, the Governor's page on the Governor's office. The set is 24.02 MB; the budget 24.52 MB ([[Art and Maps Pipeline]]).
- **The designer's phase C rulings built:** in Unrest the locals vote the secretary's line; the −3 needs an eligible voter; `{title}` (Governor or Mayor) in the Governor's headlines and the office front page, whose caption reads *Mayor* in Irongate and Clearwater. In the full run a bill now passes 41–19 where lane X saw 1–0–59.
- **Lane Y's issues fixed:** the target bar rides on an action's and a mission's result; specs that matched a nation pin's whole name; `review1`'s overlap (the home plate's rule line keeps 44 px but reaches down, so the plate's notes keep a 44 px band).
- **A layout change:** on an upright phone 700 px tall or less the nation map's law chips give way to the map (review 6's every-pin check failed at 375 × 667 with the paper's banner up); a designer flag ([[Drift Report]] D-S7I-2).
- **T30:** the slice-7 vocabulary sweep (refuses *whip, Directive, recall, Legislature, National Control, no-confidence, Chancellor* and the war words; allows *ballot* and *The Front*, *front door*, *front page*) on every slice-7 spec's screens; `pnpm report:playtest` prints *The nation* (§15.2) from a pure builder, `packages/db/src/nation.ts`.
- **The full e2e:** every project green after the fixes (phone 64, the slice 2–6 and review projects, the six slice-7 projects); one flake (`qa-review5` m5) passed on its re-run. Counts and fixes: [[tech/slice-7|tech spec]], *Deviations, Integration*.
- **T31:** the README's slice-7 hooks, dev panel buttons and six walk-throughs; ADRs 0043–0050 accepted; the plan marks slices 6 and 7 built.

## QA and leftovers

Built; QA next (the integration Deviations list what to look at first). The designer's defaults among Appendix C #64–#73 that were not the user's seven (#67 the removal at 25 %, #69 standing orders repeat, #72 the list by backers, #73 the push below Level 10) stay as flags to watch (see [[Open Questions]]).

## Commits

`1f8172a` design, art done (4 Oct) · `ef6b697` tech design and ADRs 0043–0050 (4 Oct). Voting addenda in `9067c94` (10 Oct). Phase A: `94572ed` T6 schemas · `54b8951` T1–T3 · `d75c541` T4 · `f07ea6b` T5 · `c455d44` content (designer) · `7a5e514` T9 and the bindings · `aed0ec7` T10 · `523ae99` the Clearwater stopgap. Phase B lane 2: `c971245` the views · `53ec4c9` T14–T19 · `136b50d` the boundary's ObjectIds · `2f542c4` the petition close and the push on order items · `cb9d2c6` the Chair's call · `237b3e6` the Monday bills now. Integration: `0a6615e` the six scenes · `095b568` the final alt texts · `e710550` the rulings and the e2e fixes · `1819650` T30 · the T31 docs commit.

## Related

- Previous: [[Slice 6 Together]] · Next: [[Slice 8 A Life in the City]]
