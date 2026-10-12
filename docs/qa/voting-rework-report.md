# QA report: the voting rework

Branch `slice-0`, HEAD `29004a8` (phases 1 to 6 plus design §8.11). Screenshots are in `docs/qa/voting-rework/`. The tests behind them are `apps/client/e2e/qa.voting.spec.ts`, `qa.voting.screens.spec.ts` and `qa.voting.irongate.spec.ts` (project `qa-voting`, run with `E2E_WEB_PORT=4273 E2E_API_PORT=3301`).

## Verdict in one paragraph

The model works and is much easier to read than the old one. Standing, backing, the vote, the tie rules, the five days, Unrest, the conversion and the capital's shared cards all behave as designed, and every action is atomic and idempotent under bursts. There are **no blockers**. There are **two majors**, both about what the player reads (Unrest described as "the branch's rule"; the third ballot card hidden under the sticky bar in the commonest state), and a list of minors, mostly stale old-model wording and plural and tie phrasing.

## What I ran, with results

| Check | Result |
|---|---|
| `pnpm art:check && pnpm turbo run lint typecheck build` | green, 14 of 14 cached |
| `pnpm --filter @irongate/server check:voting-conversion` | **601 of 601** |
| `council`, `qa-council`, `capital`, `qa-capital` (at 29004a8) | `capital` failed 2 tests after §8.11 Q1 (test code only, fixed, below); the rest 21 of 21 |
| `voting`, `qa-risk`, `rival`, `dev-panel` | 33 of 33 |
| `qa-voting` (my 3 specs, one run) | 18 of 18 |
| `pnpm report:playtest` | prints the *Rule ballots* section and summary, see "The playtest report" |

I did not re-run the whole suite (phase 6's 276 predate 29004a8).

### Verified against the design and GDD

- **Seats** are local support + 3 × at most five backers. With 7 backers, the result row read `ward 40, backers 2, total 46` in one run and `wardVote 6 + 15 = 21` with "7 backers" in another (five count).
- **Standing** needs Rank 3, Known and 10 PC, spent. Each refusal names its reason (`RANK_TOO_LOW`, `NOT_KNOWN`, `NOT_ENOUGH_PC`, `NOT_NOMINATIONS`). A 10 PC balance stands and leaves 0.
- **The winner runs five days.** `daysLeft` reads 5, 4, 3, 2, 1, then the next count replaces it.
- **Ties and fallbacks:** a three-way tie (1-1-1) goes to card 1; a 2–2 tie between cards 2 and 3 goes to card 2; no votes gives card 1.
- **Unrest** takes the party card off and gives three councillor cards.
- **Bursts:**
  - Stand: 6 calls (2 with one key) gave one candidacy and one −10 PC. The winning key replays byte for byte.
  - Back: 2 simultaneous keys gave one backing and one charge. 5 simultaneous backers all succeed (counts 2 to 6).
  - Vote: 6 keys over 3 cards gave one vote and one +0.5 morale. One key sent 3 times gives one body.
  - setRule: 5 keys end on one of the five rules, no PC charged. Choosing the same rule again is accepted.
- **Windows:** no vote on days 0–1 (`NOT_POLLING`); on day 2 no standing (`NOT_NOMINATIONS`) and no setRule; backing is still open on day 4; a vote is allowed on day 4.
- **Another city:** `council.ballot` for a city that is not your residence gives `NOT_RESIDENT`.
- **The capital:**
  - Two parties naming the same rule give one card with two crests, and the card's seats equal the sum of its parties' seats.
  - The result rows say `votes 1 · shared`.
  - The bloc's second councillor reads "Your party's card is set — Councillor Ilse Brandt chose …".
  - There are no score columns.
- **Strings:** every Election card state (below Rank 2, vote, voted, result by `votes`, `tie`, `fallback`, `fallbackUnrest`, standing, councillor, next in line), the ballot, the closed ballot, the result, the slate, the stand card and picker, the four modals, the hall's five blocks, the What now card, the Me line, the chip and the help note match design §4 and §8 wording. The exceptions are in the bug list.
- **Short-session rules:** voting is 3 taps on a phone (card, Vote for, Continue) and 2 on a 1440 desktop (the card is the ballot). Nothing needs the player online at a set time.

## Bugs, ranked

### Major

**M1. Unrest fallback is called "the branch's rule" in the hall and in the paper.**
- Steps: push Duskwall into Unrest on day 1 (`/api/test/unrest`, `share: 55`), cast no votes, count.
- Expected (design §8.2, §8.4): the hall's *Rule in force* reads "Councillor Ernst Kessler's · no votes cast · the branch had no card". The headline must not claim the branch's rule.
- Actual:
  - The hall prints "the branch's · no votes cast".
  - The paper prints "Duskwall Keeps the Committee's Rule … Public Works Order runs" (`hl.v.rule-fallback`; likewise `hl.rule-fallback`, `hl.a.rule-fallback` "Keeps the Branch's Rule").
  - The Election card and the result screen are correct ("Councillor Ernst Kessler's rule … the branch had no card").
  - So the four surfaces contradict each other in the one state where the player most needs the explanation.
- Files:
  - `packages/ui/src/components/RuleCard.tsx`, `howWords` `case 'fallback'`: the hall block passes no `councillor`.
  - `packages/content/src/data/ruleHeadlines.ts`: the fallback templates have no Unrest variant, and the condition `ruleDecided {fallback:true}` does not distinguish Unrest.
  - The server fact `ruleHeadlineFacts` in `apps/server/src/services/politicsService.ts`.
- Screenshots: `52-card-result-fallback-unrest-paper-m.png` (card, correct), `53-result-fallback-unrest-m.png` (result, correct).

**M2. The third card sits under the sticky *Vote for* bar whenever the day's paper has not been opened (390 × 844).**
- Steps: new Rank 2 member on a vote day, go straight to `/council/ballot` without opening `/paper` (the "THE CLARION IS IN" strip is up).
- Expected (design §4.2, tech §9.3): all three cards and the button above the fold.
- Actual:
  - Home: card bottoms at 549, 645 and **741** against a bar top of 698.5, so the third card is **42.5 px under** the bar.
  - After the paper is read: 505, 601, 697, which is 1.5 px clear. The developer's numbers only cover this second state.
  - The capital with three cards is worse: 559, 655, **751**, which is 52.8 px under, and with the paper read the third still ends **8.8 px under** (707.3 against 698.5).
  - Cause: a Street Fund card's plain line (*actions pay a quarter more Iron, jobs a quarter less*) wraps to two lines. §8.11 Q1 shortened the capital's whose line to one row, but it did not remove this.
- Impact: the third rule's title is still visible and tappable, so this is not a blocker. It still contradicts the design's acceptance test and hides a third of the choice from a first-time voter.
- Files: `packages/ui/src/components/RuleCard.tsx` (card padding and plain line) and the ballot page in `apps/client/src/routes/council.tsx`. `qa.slice4.spec.ts` asserts a top edge only.
- Screenshots: `70-ballot-paper-unread-m.png` (strip up, third card cut off), `21-ballot-m.png` (paper read, fits), `60-capital-ballotb-m.png` (capital, 3 cards, strip up).

### Minor

**m1. Plate rule chip wraps the kicker row on short phones (confirmed, fix settled but not bound).**
- At 375 × 667 and 360 × 640 the chip "PUBLIC WORKS ORDER · 5 DAYS" leaves "COLLECTIVE 70.2 %" about 85 px, so the kicker row wraps to three lines (HOME CITY / COLLECTIVE / 70.2 %). The plate grows and pin 12 (Town Hall) is partly under it.
- Design §8.11 Q2 settled the fix: chip prints the name alone, row drops "Home city ·". `copy.plate.ruleChip(name, days?)` is in `copy.ts`, but `RuleChip` in `RuleCard.tsx` and `ruleChip()` in `city.tsx` still pass the days and the kicker still reads "Home city".
- Screenshot: `45-plate-chip-375x667-s.png`.

**m2. Plurals and tie wording.**
- A 1–1 tie prints "won · **1 votes each**, the first card takes a tie" (card, hall, result) and, for the loser, "Reading Room Grant took it, **1 votes to 1**" under "Falls Short".
- Nothing says "tie" in the headline: "Reading Room Grant Wins the Vote … 1 of 2 votes".
- The capital reads "Reading Room Grant had 5 seats of ten to 5" when a 5–5 seat tie is settled on votes. `how` is `seats`, so the player never learns it was a tie.
- Files: `copy.ts` `rule.how.tie`, `election.resultTie`; `ruleHeadlines.ts` your-rule-lost (use `{n} vote(s)`; add a tie branch).

**m3. Count-morning headline order (developer's flagged point).**
- The voter's page prints "Your Vote Counted: …", then "While You Were Away", then "Public Works Order Wins the Vote in Coalport".
- Design §8.9.2 #1 says "the rule's headline leads", which the build implements only against `hl.count` (priority 1), not against personal or filler lines.
- This needs a designer decision: either personal lines stay first (then amend §8.9.2 #1) or the city rule line takes the lead slot on the count morning.

**m4. "Councillor … Steps Down" on a term ending without re-standing (developer's flagged point).** I did not exercise this path (see "Not covered").

**m5. Old-model words that remain player-facing.**
- The three leads you named are closed by 29004a8. A grep of `issues.ts` and `candidates.ts` found no "council vote". I did not re-read the new chapter-3 text.
- Still stale:
  - `headlines.ts` 446, 629, 808 (the rank-up headlines): "Activists vote: Coalport elects its council every five days, and the Election card says when." Players do not elect the council, and the card is called *Council rule*.
  - `heraldHeadlines.ts` 155: "…the Election card says when."
  - `copy.ts` 493 (`help.residence`): "the town whose council you vote for".
  - `copy.ts` 655 (`ranks.opens.vote`): "The vote in every election".
  - `copy.ts` 1341, 1342, 1485: "from the next election that opens".
  - `errors.ts`: "backing … this election" and "standing in this election".
- Screenshot: `02-card-result-voter-paper-m.png` shows the rank-up headline above the card.

**m6. `NOT_POLLING` always reads "Voting has closed."** (`apps/client/src/features/game/errors.ts`). On days 0–1, from a stale tab, the vote has not opened yet.

**m7. A Recruit on the ballot page sees "One vote, secret and final…" with no reason they cannot vote.** The card says "400 Party XP makes an Activist", but the ballot page does not.
- Files: `apps/client/src/routes/council.tsx`, the Rank 1 branch.
- Screenshot: `30-ballot-rank1-m.png`.

**m8. Weekday and time strings read oddly east of UTC.** The City Day turns at 00:00 UTC, which is 03:00 locally for a UTC+3 player.
- Examples: "Vote until Wednesday 03:00", "the town votes Sunday to Wednesday; the result Wednesday morning" (three voting days read like four), and the design's "midnight".
- This is the review-4 clock decision, so I report it for the designer rather than as a defect.

**m9. Small things.**
- The *PASSED* stamp overlaps the share bar and the count on the winner card (`42-result-m.png`).
- "0 of 0 members voted" when nobody was eligible.
- The disabled *Choose a rule* button is 2.52:1 contrast (WCAG exempts disabled controls, but it is the page's instruction).
- The plate's rule-line button measures 17 px tall (existing since review 4; I could not confirm a larger hit area).
- The playtest report still prints old-model columns (`filed`, `withdrawn`, `struck`, `smallBranchDoubles`, `councilVoteRate`).

**m10. GDD text not updated** (`docs/GDD.md`, game-designer):
- §15.3's first bullet still says "nominations (declare, withdraw, endorse)", "polls open" and "the division".
- §15.1's Chair row says "25 PC deposit · two backers" while §15.4 says no backers.

### Test code I fixed

- `apps/client/e2e/capital.spec.ts` (two assertions): §8.11 Q1 changed the capital's whose forms to "Collective · Councillor Ilse Brandt" and "Collective and Alliance". It now passes (3 of 3 in the project).
- `apps/client/playwright.config.ts`: added project `qa-voting` and its `phone` ignore.

### Environment notes

- One run hit `ERR_CONNECTION_REFUSED` on the preview port mid-test; the rerun was green. I did not find the cause.
- The desktop card once printed "Vote until 21 October 03:00" where the phone row printed "Wednesday 03:00". That is the dev test clock (the card uses the device's `now`), not a production issue.

## The developer's flagged points

1. **Capital ballot with a councillor's card, 390 × 844:** with the shortened whose forms, with Street Fund as a card and the paper read, 3 cards end **8.8 px** under the bar. With the paper unread, 52.8 px. See M2.
2. **Short-phone home plate:** confirmed three lines, about +32 px. See m1.
3. **Headline order:** see m3.
4. **"Councillor … Steps Down":** not exercised.
5. **`pnpm report:playtest` council section:** run against a `dev:mem`-style database after my 18 tests, about 37 ballots over several cycles.
   - It prints the rule ballots table (cards by kind, Unrest flag, player councillors, rule changes, turnout, winner, how, kind) and the summary.
   - The summary read: set 37, counted 35, fallback 71 %, winning kinds party 24 / player councillor 1 / local 10, rule changes 13, "7 of 9 player councillors set a rule", stands 3, member backings 9, branch backings 0.
   - These figures match what my tests did.
   - The "First vote" block is all zeros only because my test accounts are given Rank 2 by a hook, not through play.

## Clarity (a new player in one short session)

- **Good.** One question, "Which rule for next week?", three cards with name, plain line and an effect line, one tap, one modal that says what happens and when. The card says "You voted for …", the result says who won and by how many, and the plate, tickets and Me line carry the rule. No formula, threshold or "None of these" appears on the voting path. The capital needs one extra sentence and it fits in three lines.
- **Muddy spots:**
  - Weekday and clock strings (m8).
  - Tie and Unrest explanations (M1, m2).
  - A few old words in rank-up headlines and help notes that call the vote an election (m5).
  - A hidden third card on the first screen of the day (M2).
- **Playtest checklist (tech §15.4):**
  - Items 1, 3, 4 and 6 pass.
  - Item 2 passes for the plate, tickets and Me tab, but the paper's fallback line is wrong in Unrest.
  - Item 5 ("nothing prints a formula") passes.

## Not covered

- Other e2e projects after 29004a8 (`review3`, `review4`, `qa-review4`, `review5`, `qa-review5`, `phone`).
- The vote against the count at the exact boundary (a race).
- The branch's +3 backing in play (the report shows 0 branch backings).
- The *carried over* Election card state, and the capital's *registered* state beyond `capital.spec`.
- Keyboard use on the new screens beyond the existing `qa-council` spec.
- The "Steps Down" headline.
- Contrast on painted backdrops.
- Desktop screenshots of most screens (only the desktop card-is-ballot and the desktop ballot are kept).
- A real phone clock and timezone.
