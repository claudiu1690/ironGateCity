# Voting, simplified: one ballot, three rules

> **Approved by the user (10 Oct 2026)**, with the recommended default on all three open questions (§7). The GDD, `docs/economy.md` and the slice 3, 4 and 7 design docs carry the §5.1–5.2 edits as of the same day; **§5.3 and Appendix A are the developer's list** (content and `copy.ts`), with ids.

Game designer, 10 Oct 2026. Written as a proposal; the paragraphs below keep that voice. It answers the user's note after review 5: *"The voting feature feels overwhelming and I don't really understand it. I like what the feature does with the buffs (laws), but I want it easier to understand."* The skills applied are `design-game-design-fundamentals` (design by subtraction, elegant rules, interesting decisions, feedback within thirty seconds, MDA, respect for the player's time) and `design-game-economy-design` (Political Capital as a currency with faucets and sinks). The audit covers GDD §15, §14.11, §1.5 and §6.5; `slice-3-politics.md`, `slice-3-screens.md`, `slice-4-battleground.md` §8, `slice-4-screens.md` §7–8, `review-4-answers.md` §10–11, `slice-7-nation.md`; and the built screens in `packages/ui/src/components/Politics.tsx`, `TownHall.tsx`, `apps/client/src/routes/council.tsx` and `packages/content/src/data/copy.ts`.

**In one line:** the player votes for **a rule**, not for people; three rule cards, one tap; the rule with the most votes runs the city for five days; the council and the seats stay underneath, as the optional path for the ambitious, and feed the ladder of slice 7 unchanged.

---

## 1. The diagnosis

### 1.1 Every concept a player meets today

*Needed* means a player must hold the idea to enjoy the feature. *Simulation* means it exists so the maths works at any population, and the player is shown it only because it is there.

| # | Concept | Where it appears, and when | Needed? |
|---|---|---|---|
| 1 | The five-day cycle with three phases (names in · voting · the result) | The Election card, the paper's row, every election screen; from Rank 2 | Partly: *when do I vote, when does the rule start* is needed; the phase names are not |
| 2 | Candidates putting their names in (nominations) | The card on cycle days 0–1; the *Who's standing* screen | Simulation for a voter; needed only by the one in twenty who stands |
| 3 | Rank 2 to vote, Rank 3 and *Known* to stand | The card below Rank 2; the stand card's ticks | Needed, once (two lines) |
| 4 | Players standing vs **local candidates** (townspeople run by the game) | Every list, two groups with two explanatory lines | Simulation: it exists so there is always an election. Shown because Appendix C #3 said locals must be marked |
| 5 | Nine names for seven seats, *the line*, *the last seat is usually close* | Who's standing, the vote, the result | Simulation |
| 6 | **Backers** (endorsements): 10 PC, public, irrevocable, two needed, five count, +3 each | The card (*backers 1 of 2*), the stand card, the slate's buttons, the result's column, a help note | Simulation for a voter; a pile for a candidate |
| 7 | The branch's backing (do the orders) and the small-branch doubling | The candidate card, two Courier lines | Simulation (it exists so a lone player can meet #6) |
| 8 | The deposit (10 PC, returned only if struck), withdraw, struck, *your name comes off* | The stand card, the candidate card, three headlines | Simulation (a consequence of #6) |
| 9 | Platform lines (three, no effect) | The stand card, every candidate row | Neither: flavour that reads as a choice |
| 10 | **Local support** (reputation ÷ 5, the NPC electorate) | A row's fold, the result's column, a help note | Simulation |
| 11 | Members' votes | The result's column | Simulation |
| 12 | *Support = local support + 3 per backer + votes*, and the tie order | Under the title of *Who's standing*, under the result table, the five-line help note | Simulation, and shown three times |
| 13 | Turnout (*3 of 9 members*) | The result's header, the card's result line | Simulation |
| 14 | A secret and final ballot | The ballot's caption, the modal | Needed (one line) |
| 15 | The result table: #, Name, Local support, Backers, Votes, Support | The result screen, the front page | Simulation |
| 16 | **The council rule**: its name, its plain line, its effect line, five days, one per city | The plate, the card's third line, the hall, the ticket tags, the result modal's bonus lines | **Needed: this is the feature** |
| 17 | **Up for a vote** (the order paper): the party's proposal, up to three proposals (20 PC), *None of these* | The hall's desk and read-only block; the card's *You're on the council · vote on the rule* | Simulation for everyone but a councillor; a second vote the voter never takes |
| 18 | The council's vote (the division): four of seven, six of ten, locals follow the leading player, *the council couldn't agree* | The desk's Next line, the *What now* card, the hall's *No rule in force*, two help notes | Simulation; and it is the vote that decides the thing the player likes, taken by other people two days after the player voted |
| 19 | Political Capital: what it is, +5 a day, the three sinks | The HUD, the Me tab, every political button, a help note | Needed, once |
| 20 | Morale +0.5 per ballot, −3 at a count nobody voted in | The vote modal's knock-on line | Nice; not needed |
| 21 | The term, *term ends Thursday*, the pay (10 PC + 20 Party XP) | The Me tab, the hall, the stand card, *What now* | Needed by a councillor (one line) |
| 22 | The Town Hall as a place, *Your desk*, *What now* | Review 4 | Needed by a councillor |
| 23 | A sitting councillor cannot stand for the next council; a candidate cannot move house | The stand card, the residence card | Simulation |
| 24 | **The capital:** two seats a district, *any name, any party*, the party's score (*votes mix with opinion*), the turnout weight (*from ten cast*), the D'Hondt sentence, the returning officer's draw, six of ten, three party proposals on one paper | The capital's card, ballot, result (two tables), help note | Simulation, all of it; one idea is needed: *who holds the district gets its way unless the votes say otherwise* |
| 25 | **Slice 7:** the Governor's rule as item 1, the Chair's rule, the chain for locals, four *None of these* make the locals abstain, a petition strikes the rule, laws with the *LAW* kicker, Parliament's For / Against | The office pages, the hall, the law book | The laws and the Governor's rule are needed by their holders; the chain and the four-of-seven are simulation |

**Thirty-three concepts, forty-odd terms.** A Rank 2 player who only wants to vote meets twelve of them on the way to one tap (#1–6, 10–15), and the thing they came for (#16) is decided by a vote they do not take (#17–18). A player who stands meets nine more. The capital adds six on top. **Needed, by this audit: nine.**

### 1.2 Where players get lost, and why

1. **The vote is for a person; the bonus is chosen by a different vote.** The ballot lists nine names with platform lines that have no effect, and nothing on it says which rule any of them would put forward. Two days later seven people, six of them run by the game, pick the rule. The player cannot see the line from their tap to the bonus, so the tap means nothing to them. This is the root of *I don't understand it*.
2. **Two votes, two vocabularies, two calendars inside one five-day cycle.** The election (names in → voting → the result) and the rule (up for a vote → the council votes → in force) overlap: the rule vote runs on the same two days as the next election's nominations. The Election card has eleven states at home and sixteen with the capital, and its *Result* line carries three facts in two lines (*Result: Weiss topped the poll · you: elected 3rd of 7 · Seven seats · the new council sits until Thursday · next election: names in until Tuesday*).
3. **The maths is printed.** *Support = local support + 3 per backer + votes* appears under the title, under the table and in the help note; the capital prints *votes count 15 % of the score, opinion 85 % (votes count in full from 10 cast)*. GDD §8.4's no-maths rule exempted counts; the user is telling us a count reads the same as a roll.
4. **Standing is a pile.** Rank 3, Known, the deposit, two backers, the branch's backing, the small-branch doubling, struck, withdraw, on the ballot, a platform line: ten things, most of which exist to make a two-backer requirement workable for a branch of one.
5. **In a branch of one the vote decides nothing** (Appendix C #44): nine locals for seven seats, and the player's ballot can only move the seventh. The screen now says so (*the last seat is usually close*), which is honest and still pointless.
6. **Local candidates are explained four times** on the way to one tap (two kickers, two Courier lines, the help note, the hall's rows), because every list has to say who is run by the game. Correct, and heavy.

### 1.3 The principles, applied

- **Design by subtraction (Ueda):** remove the second vote; the citizens' vote *is* the rule vote. Remove the backer requirement, the deposit's refund logic, the platform lines, the proposal fee, the thresholds and *None of these*.
- **Minimal rules, emergent play (Garfield):** one rule everywhere a player reads it: *the rule with the most votes runs for five days*. The capital adds one clause: *votes and opinion together*.
- **Interesting decisions (Meier):** *Street Fund or Public Works* is a real choice (one pays the active member, the other the wage-earner); *Weiss or Baum* is not, because nothing distinguishes them that the player can act on. The councillor's interesting decision becomes *which rule do I put to the town*, not *which of four items do I tick*.
- **Feedback in thirty seconds:** the tap, the modal (*Street Fund. If it wins, it runs from Sunday for five days.*), and the next morning the rule's name on every ticket and the plate. The seat count stays in the paper for those who care.
- **Respect the player's time:** three cards instead of nine rows; two paragraphs of explanation become one line; the simulation's columns go behind a help note.

---

## 2. The core fantasy and the thirty-second loop

**The fantasy:** *My town runs by a rule I helped choose, and I can see it on every ticket I pull.* Not *I elected a councillor*; that is the ambitious player's fantasy (*my rule is on the ballot; the town is voting on my idea*), one rung up.

**The thirty-second loop (every five days, Rank 2+):** open the paper → the row reads *Which rule for Coalport next week?* → three rule cards → tap one → *Vote for Street Fund* → the modal says what happens and when → done. Next morning the row reads *Street Fund won · 4 of 6 votes · runs until Thursday*, the plate reads it, and the first action's ticket carries *Street Fund · +25 % Iron*. One decision, one tap, one visible consequence.

**The session loop (five days, Rank 3+):** stand (one tap, your rule named) → the result morning: the front page, ELECTED → your rule is on the next ballot → the town votes on it → if it wins, the plate carries your rule and your name for five days. Pay every morning.

**The long loop (slice 7):** two terms → Governor: the party's card is yours · Chair: the party's card in every city is yours · deputy: a law up for a vote, For or Against, which is the same shape at the top as the rule card at the bottom.

**MDA.** Mechanics: three cards, one tap, most votes wins, fallback to the party's card. Dynamics: branches argue for a card in chat; a councillor picks the card the town wants so as to top the poll next time; in the capital, two Chairs who pick the same rule form a coalition without a rule for coalitions. Aesthetics: Fellowship (our rule), Expression (my rule), a little Challenge (who holds the district).

**Player motivation worksheet (the political feature only).** Achievers: a seat, a rule with your name, the ladder. Explorers: which rule suits which build (trainers want the Reading Room, speech builds want Rally Permits, the once-a-day player wants the Rest Day). Socialisers: the branch's card, backing a colleague. Killers: the capital's party cards and *who holds Eastside*. Autonomy: which rule (three real options). Competence: seats go to reputation, which is the work the player can see. Relatedness: the branch's rule against yours. Daily hook: the ticket tag; five-day hook: the vote; weekly: the Issue; monthly: the Chair. Session cadence: the vote is a quick-check act (two taps); standing is an active-session act once a cycle.

---

## 3. The simplified model

### 3.1 The rule in one paragraph

Every five days each city **votes on one rule**. **Three rules are on the ballot**: the party's rule and two put up by councillors. Every Rank 2+ resident votes **once, in secret, for one rule**, during three days. At the count **the rule with the most votes runs the city for five days**, for everyone there; a tie, or no votes at all, goes to the party's rule. In a contested city (Irongate, Clearwater) **each party puts up its rule**, and *votes and opinion together* decide which party is ahead: it takes the most seats and its rule runs. **The council** is seven (ten) seats won by **reputation and backers**; a councillor's power is to **put their rule on the ballot** and to draw pay. The council, the seats, the terms and the ladder to Governor, Chair, Parliament and President stand as they are.

### 3.2 The calendar (unchanged days, one new reading)

`cycleDay` and the offsets are untouched. What changes is what each window holds and the sentence the player reads.

| Cycle day | Was | Now | The player reads |
|---|---|---|---|
| **0–1** | nominations; the sitting council puts forward and votes on the rule | the new council sits (seated at the count); **councillors set their rule** (one tap, free, changeable until the boundary into day 2); **candidates stand** for the next council | *Stand until {weekday} midnight* (Rank 3+) · *Your rule: … · change it until {weekday} midnight* (a councillor) |
| **2–4** | polls open (a vote for a person) | **the vote on the rule** (three cards; fixed at the boundary into day 2) | *Vote until {weekday} midnight* |
| **the boundary into 0** | the count: seats | **the count: the rule and the seats** | *The result {weekday} morning* |
| **0–4** | the rule in force ran days 2–4, 0′, 1′ (from the division) | **the winning rule is in force from the count for five days** (days 0–4) | *{Rule} · runs until {weekday}* |

One timeline sentence on every card: ***Vote until {weekday} midnight · the winner runs from {weekday} for five days.*** No phase ever has a clock time; every window is whole City Days; nothing waits on a job (the count is the same job as today). Being away costs the vote, never the rule's benefit (it applies to everyone in the city) and never a seat held.

### 3.3 The three cards

**Home city** (one party):

1. **The party's rule.** Chosen by the Governor (slice 7) → else the Chair (slice 7) → else the secretary's default (Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*; unchanged).
2. and 3. **The councillors' rules**: the rules named by the **two top-seated player councillors** (by the count's order) whose rule is not already on the ballot; empty places are filled by **the seated local councillors' rules** in seat order (each local candidate carries a rule in content: Appendix A), so there are always three different cards even in a branch of one.

**Contested city** (Irongate, Clearwater): **one card per party**, chosen by the chain **Mayor or Governor (of that party) → the party's top-seated player councillor → the Chair → the secretary.** Two parties that choose the same rule share one card (both crests on it), and their votes and seats add up: that is the coalition, with no rule for coalitions.

A councillor sets their rule when they stand (it replaces the platform line) and may change it on cycle days 0–1 of their term at no cost, one tap, from the city's menu (the eleven of §15.3). A player councillor whose rule did not make the ballot reads *Your rule is next in line: the two seats above yours chose first.*

### 3.4 How the rule is decided

- **Home city:** the card with the most votes. Ties go to card 1, then the earlier card. **No votes: card 1.** So a city always has a rule, and *the council couldn't agree* never happens again.
- **Contested city:** each party's **score** per district is the existing slice-4 formula, unchanged and unprinted: `w × ballotShare + (100 − w) × opinionShare`, `w = 50 × min(1, ballots ÷ 10)`, where a party's ballots are the votes for its card. Seats go by D'Hondt on the scores as today. **The rule is the one with the most seats behind it across the city** (parties sharing a card add up); ties by ballots city-wide, then opinion share, then the cycle's seeded draw. The player reads: *Each party puts up its rule. Votes and opinion in your district together decide which party is ahead: it takes the most seats, and the party with the most seats across Irongate gets its rule.* The six-of-ten threshold goes: a rule always passes.
- **Unrest** (home city): the party's card comes off the ballot (the branch has lost its voice until it wins the town back); the fallback is card 1 of what remains. This replaces *NPC councillors abstain so a motion needs four player votes*.

### 3.5 The seats

**Total = local support + 3 × backers** (at most five backers count). Members' votes are no longer part of the seat count: the ballot is for a rule. Ties: more backers, then Standing Successes (a local's `profile × 5`), then earlier filing (locals after every player, in profile order). Seats go to the seven highest; in a contested city, within each party by the same total. The player reads one sentence: ***Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.*** Local support and backers stay as they are in the rules (`profile` ±2, Successes ÷ 5): the NPC electorate still means mission work wins seats when nobody is around.

*Why drop members' votes from seats.* A vote for a person needs the voter to know the person; the screen could never give them a reason to prefer Weiss to Baum. Backing (public, 10 PC) is the deliberate act of choosing a person, and it stays. Reputation is the work, and the game's rule is that work is the vote. The lever if seats feel unreachable at scale is in §7 Q1.

### 3.6 Standing, cut to four things

**Rank 3 · Known here · 10 Political Capital · name your rule.** One tap on the stand card: *Stand · 10 Political Capital* with the rule picker (eleven rows, one selected, the branch's default first). The 10 PC is the price of standing, spent, never returned. Removed: the two-backer requirement, striking, *your name comes off*, withdrawing, the small-branch doubling, the deposit's refund rule, the platform lines. Kept: **backing** as an optional boost (*Back · 10 Political Capital*, +3, public, final, one per member per cycle per city, open until the count) and **the branch's backing** as a free +3 on any day of the term's window on which the candidate does all three orders (the loop link, now a bonus instead of a gate). A sitting councillor still cannot stand for the next council of the same city; a candidate still cannot move house until the result (`ON_BALLOT`, Appendix C #61).

### 3.7 The councillor

Elected on the count morning (the front page, ELECTED, unchanged). Their term is five days; their power is **their rule on the ballot** (set at standing; changeable on days 0–1); their pay 10 PC and 20 Party XP a morning, present or not. There is no council vote to attend. In slice 7 a completed term is a rung as before; the Governor's power is card 1 and the Address; the Chair's rule per city is the party's card wherever no Governor sits.

### 3.8 Political Capital, as a currency

Faucets unchanged (§6.5): +5 a day for the orders, +10 a morning for a seat, events, Issues, heroes, *One of Us*, the offices. Sinks in slice 3 go from three (stand 10 · back 10 · put forward 20) to **two** (stand 10 · back 10); the 20 PC proposal goes, because putting a rule forward is now the seat's power, not a purchase. The price of every political button stays printed in full. Slice 7's sinks (Chair 25, the list 25, President 100, a bill 50, a petition 10, a removal 50) are unchanged and remain the real drain; `docs/economy.md` §21.2 already finds office-holders reach the cap in a season, so the lost 20 a term changes nothing that matters. The help note on the label becomes: *Your pull in the party. You earn it by doing all three Party orders (+5 a day) and by holding a council seat. You spend it to stand for the council (10) or to back a candidate (10).* Flag for the economy sheet: a councillor banks 15 a day against at most 20 a cycle; PC accumulates about 55 a cycle from the first seat (was 35) until slice 7's sinks arrive. Acceptable: the 1,000 cap is the limit by design (§23.3).

### 3.9 What replaces each removed or hidden concept

| Removed or hidden | What replaces it, or why nothing needs to |
|---|---|
| The ballot for a person (nine names) | **Three rule cards.** The names live on *Who's standing* (a folded row under the ballot) for anyone who wants them |
| The council's vote (the division), four of seven, six of ten, *None of these*, *the council couldn't agree*, locals following the leading player, the slice-7 chain for locals, four *None of these* making locals abstain | **The town's vote.** Nothing follows anything: a card wins or the party's card falls back. Locals never vote; they only fill seats and, through their content rule, the ballot's empty cards |
| The order paper, proposals (20 PC), *the party's proposal · Secretary Holm* | **The three cards**, set by the chain of §3.3. The councillor's act is *your rule*, free |
| Members' votes in the seat count | Backing (kept) and reputation. See §7 Q1 for the lever |
| Two backers to stay on the list, struck, withdraw, the branch's backing as a gate, the small-branch doubling, the deposit returned | **10 PC spent, your name is on the list.** Backing stays as a boost; the branch's backing stays as a bonus |
| Platform lines | **The candidate's rule** (it is what a councillor does) |
| *Support = local support + 3 per backer + votes* printed three times; the six-column table | One sentence (*the seven best known here, counting backers*); the council as rows with *One of Us · 3 backers*; the numbers behind a tap on a row |
| Turnout in the header | *6 of 9 members voted* stays on the result only (it is the vote's own number) |
| The capital's two tables, *votes count 15 % of the score*, the D'Hondt sentence, the returning officer's draw | One sentence (*votes and opinion together*); per district three party rows (crest · votes · seats); the formula in the help note for the curious |
| Eleven (sixteen) Election card states | **Five** for everyone, two more for candidates and councillors (§4.1) |
| Two help notes (*Backers*, *Local support*) and the five-line *How elections work* | One three-line note, *Council rule* (§4.9) |
| `hl.filed`, `hl.on-ballot`, `hl.struck`, `hl.moved`, `hl.council-passed`, `hl.council-failed`, `hl.voted-won / lost / lost-tie`, `hl.polls-open`, `hl.ordinance-city` | `hl.filed` and `hl.nominations` (reworded), `hl.rule-won`, `hl.rule-fallback`, `hl.your-rule-won`, `hl.your-rule-lost`, `hl.your-rule-on-ballot`, `hl.vote-open` (replacing `hl.polls-open`, day 2 only) (§4.8, §8.4) |
| The Election card at the hall | The hall's *Next week's rule* block is the card |

### 3.10 Trade-offs, stated

- **Against slice 7's offices.** A Governor today, with six locals who follow, passes any rule outright; under this model the Governor **sets card 1** and wins it when nobody votes otherwise. In a branch of one that is the same thing; at scale the Governor sets the agenda and the town decides. That is the politics the game says it is about (*a political battle*), and the Address (+50 on an Issue) is untouched. The Chair's rule per city is card 1 wherever no Governor sits, as now. Parliament and the laws change nothing: a deputy's For / Against on a bill is already a vote on a rule, and the law book's rows read as council rules with the *LAW* kicker; the national ballot (a person with two pledged laws) should lead each row with the pledges, which it nearly does. Petitions still dissolve a council and strike its rule.
- **Against the faction competition.** In the capital the rule follows seats, and seats follow votes and opinion, exactly as the slice-4 formula has it; what goes is *coalition or nothing* (a 4 / 3 / 3 council of locals passed no rule). Now the largest bloc's rule passes, and two Chairs who pick the same rule outvote it: a coalition is a choice, not a threshold. A rule always runs, which is what the user likes about the feature.
- **Against the GDD's "a growing player base can see itself taking over".** Seats go to reputation and backers, not votes, so a branch of fifty cannot vote one member onto the council; it can back them (five count) and it can out-work the locals, which every player does by day ten (Appendix C #22). The *Local seats 6 / 7* line stays; players still replace locals, by work.
- **Against secrecy (Appendix C #25).** The rule ballot would make running totals a strong *it's close, turn out* hook. Not taken here: the ballot stays secret until the count, so the model changes one thing at a time. It is the first lever to pull if turnout reads low.

---

## 4. The screen rework

Everything below is one tap or one choice; no flow is longer than three steps; every act ends in one modal with a *Next* line; every string is in §1.5's words. Weekdays are examples; the client renders the player's clock as today.

### 4.1 The Election card (city screen, the paper's row, the HQ sheet)

One component, three layouts, as now. The kicker becomes **COUNCIL RULE · COALPORT** (the paper's row kicker *Council rule*), because every state of the card is about the rule: up for a vote, just decided, or in force. The *Election* word moves to the stand card and the seats. Tap on the kicker: the *Council rule* help note (§4.9).

**Lines:** line 1 (body 600, 15 px), line 2 (Courier 11 px), **line 3 the rule in force** (Courier 11 px: *Now: Street Fund · actions pay a quarter more Iron, jobs a quarter less · 3 days left*; absent in the result state, where line 1 is the rule), then one primary button and at most one outline button.

| State · when | Line 1 | Line 2 | Buttons |
|---|---|---|---|
| **Vote** · days 2–4, Rank 2+, not voted | **Which rule for Coalport next week?** | Vote until Saturday midnight · the winner runs from Sunday for five days | **Vote now** → the ballot |
| **Voted** · days 2–4 | You voted for Street Fund | Result Sunday morning, here and in the Clarion | *See the ballot* (outline) |
| **Result** · days 0–1 | **Street Fund won · 4 of 6 votes** | Runs until Thursday · the next vote opens Wednesday | **See the result**; *Stand for the council · 10 Political Capital* (outline, Rank 3 and Known) |
| **Below Rank 2** · any day | Coalport votes on its rule every five days | Activists vote · 400 Party XP makes an Activist · you have 210 | *See the ballot* (outline, read-only) |
| **Standing** · days 0–1, a candidate | You're standing · your rule: Reading Room Grant | Seats are counted Sunday morning · 1 backer · do today's orders and the branch backs you | *See who's standing* |
| **On the council** · days 0–1, a councillor | You're on the council · your rule is on the ballot: Reading Room Grant | Change it until Monday midnight · the town votes from Wednesday | **To your desk** → the hall |
| **On the council, next in line** · days 0–1 | You're on the council · your rule is next in line | The two seats above yours chose first · pay every morning | *To your desk* |

On days 0–1 a councillor who is also eligible to stand sees the council state; the stand button is on the hall. On days 2–4 candidates and councillors see *Vote* / *Voted* like everyone (their candidacy or rule is on the ballot screen). **The capital:** the kicker *COUNCIL RULE · IRONGATE · EASTSIDE*; *Which rule for Irongate next week?*; the result line *Rally Permits won · the Vanguard's, 4 seats of 10* / *Eastside: Vanguard, Collective · runs until Thursday*; the registered-but-not-yet-voting state stays (*You live in Eastside · you vote from Thursday*). **First appearance** (the Rank 2 morning, once): *Coalport picks a council rule every five days. You can vote on it now; Organisers who are Known here can stand for the council.*

**Phone (390 × 844):** the card is at most 120 px unfolded: kicker · line 1 · line 2 · line 3 · one button row; folded with the plate it keeps the kicker and line 1 (*Which rule for Coalport next week? ›*). **Desktop:** in the side column the card **is the ballot** on days 2–4: the three rule rows (§4.2) with radio rings and **Vote for Street Fund** under them, so a desktop vote is two taps with no navigation.

### 4.2 The ballot (`/council/ballot`)

The hall header (150 px; the short-phone rule stays) · `Plate` kicker *COALPORT COUNCIL · THE VOTE*, title **Which rule for next week?**, Courier *One vote, secret and final · until Saturday midnight · the winner runs from Sunday for five days*.

**Three `RuleCard`s** (new component; the `OrdinanceRow` grown into a card, min 88 px, 1.5 px ink border, selected inverted as a `StoryScreen` row), each:
- the name (body 600, 16 px) · the plain line (body 14 px: *actions pay a quarter more Iron, jobs a quarter less*) · the effect line in Oswald caps 10 px petrol (*IRON FROM ACTIONS +25 % · JOB PAY −25 % · 5 DAYS*; these are rewards, not odds, and stay) · a Courier line saying whose it is: *the branch's rule · Secretary Holm* / *Councillor Anna Weiss's rule* / *your rule* / in the capital *the Vanguard's rule · Secretary Stahl* with the crest, or two crests and *the Collective's and the Alliance's rule*;
- a radio ring at the right; tapping anywhere selects.

Sticky bottom: **Vote for Street Fund** (`Button primary`; *Choose a rule* while none is selected); Courier under it *Secret and final. The result is at 01:00 on Sunday.* Under the cards (scrolls): a folded row **Who's standing · 2 players and 7 local candidates for 7 seats ›** → §4.5; the link **How the vote works** → the help note; *Last result · Sunday*.

Already voted: the chosen card carries *your vote* in Courier, the others dim to 50 %, the CTA is the line *Vote cast · the result is in Sunday's paper and on the card*. Closed: *Coalport votes from Wednesday* with **See the result** and *See who's standing*.

**The capital's line under the title:** *Each party puts up a rule. Votes and opinion in Eastside together decide: the party ahead takes the most seats, and its rule runs in every district.* Three cards, one per party, in order of the parties' shares in the district.

**Above the fold at 390 × 844** (top bar 56, tab bar 60; 728 px usable): header 150 · plate 80 · three cards 264 · sticky 64 = 558. All three cards and the button are visible without scrolling; on a 667 px phone the header drops to its 64 px band and the third card's top edge still shows. **Desktop (≥ 960):** the 720 px sheet; the three cards in one row of three (each a third wide, 160 px tall) with the button under them; the folded *Who's standing* row and the help link below.

### 4.3 The result (`/council/count`)

Plate kicker *COALPORT COUNCIL · THE RESULT*, title *Sunday's result*, Courier *6 of 9 members voted · final*.

1. **The three cards** in finishing order, each with its vote count in Oswald 16 px at the right and a thin ink bar under the name sized to the share; the winner carries the **PASSED** stamp (the in-line variant) and the Courier line *runs until Thursday*; the player's card carries *your vote*. A card that won on the fallback reads *the branch's · no votes cast*.
2. **The council** (kicker): the seven seated as rows (`PersonMark`, the name, *Player · Organiser · One of Us · 3 backers* or *Local candidate · Trusted*; *you* on the player's; *· the rule you named: Reading Room Grant* on a player councillor's). Under *the line*, the unseated in order, the player's own with *8th · 4 short*. Tapping a row opens the small popover with the two numbers (*local support 40 · backers 2*) for anyone who wants them. Courier under the list: ***Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.***
3. **Links:** *How the vote works* · *The Town Hall*.

**The capital** (`/council/count?d=`): the plate line *Rally Permits won · 4 seats of 10 behind it · local candidates 7 of 10 · final*; the three cards as above with **seats** (bars) instead of votes and the parties' crests; the district switcher; per district **three party rows** (crest · the party · *votes* n · *seats* bars) with the Courier *Votes and opinion together · final*; the party's candidates under each row as the council rows. No *Score*, *Opinion* or *w* column; the formula lives in the help note.

**The front page** (the count morning, a seat won) keeps the photograph, ELECTED, the headline and the deck; under them the three cards, not the six-column table; then *What now* (§4.6); then **To your desk at the Town Hall**.

### 4.4 The Town Hall's sheet (and `/council`)

After the ticket, in this order:

1. **THE RULE IN FORCE** · *Street Fund* (body 600, 16) · *Actions pay a quarter more Iron, jobs a quarter less · 3 days left* · Courier *won Sunday with 4 of 6 votes* / *the branch's · no votes cast* / in the capital *the Vanguard's · 4 seats of 10*. Tap the kicker: the help note.
2. **NEXT WEEK'S RULE** · the three `RuleCard`s. Days 2–4: the radio rings and the **Vote for …** button inside the block (the ballot without leaving the hall), or *your vote* once cast. Days 0–1: the cards as they stand with *the ballot is set at Tuesday midnight*; for a councillor, their card carries *your rule* and a text button **Change ›** (a `BottomSheet`, *Your rule · choose one*, eleven `OrdinanceRow`s, one tap; rows already on the ballot dimmed *on the ballot*); a councillor whose rule is not on reads the *next in line* line here. Then the Courier **Next** line: *Next: the town votes Wednesday to Saturday; the result Sunday morning.* / *Next: the result, Sunday morning.* / *Your pay: 10 Political Capital and 20 Party XP every morning, present or not.* (councillors). This block replaces *Your desk* and *Up for a vote*.
3. **THE COUNCIL** · the rows as now (*Player · Organiser* / *Local candidate · townspeople run by the game*), *Term ends Thursday*, the one line that says what locals are; a player councillor's row adds *· rule: Reading Room Grant*.
4. **STAND FOR THE COUNCIL** (days 0–1, Rank 3 and Known, not a councillor here) · the stand card of §4.5.
5. **THIS WEEK'S ISSUES** · unchanged.

The Election card is no longer appended to the hall: block 2 is the card. `/council` opens the same five blocks on the paper ground.

### 4.5 Who's standing, and the stand card (`/council/slate`)

The hall header · plate kicker *COALPORT COUNCIL · CANDIDATES*, title *Who's standing*, Courier *Seven seats · counted Sunday morning · stand until Monday midnight*. One sentence under the title: *Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.*

**The stand card** (eligible, days 0–1): kicker *STAND FOR THE COUNCIL*; two ticks in Courier (*✓ Rank 3, Organiser* · *✓ Known in Coalport (74 wins)*; below either, the cross and *Needs Rank 3 · 1,240 Party XP to go* and no button); the line *A seat is five days on the council: your rule on the town's ballot, and 10 Political Capital and 20 Party XP a morning.*; **Your rule**: one row showing the chosen rule (the branch's default first) with *Change ›* to the eleven-row sheet; the button **Stand · 10 Political Capital** (*Needs 10 Political Capital* when short); Courier *Costs 10 Political Capital. Your name is on the list until the count.* After standing the card reads *You're standing · your rule: Reading Room Grant · 1 backer* with the branch's line when it applies.

**The list:** *Players standing* (name · *Organiser · Trusted in Coalport · 2 backers* · *rule: Public Works Order*; **Back · 10 Political Capital** at the right for others; *Backed* once given; *You* on your own), then *Local candidates* with the one line (*Townspeople run by the game. They fill the list so there is always a council; a player who is better known here beats them.*) and their rows (*Local candidate · One of Us* · the platform line · *rule: Public Works Order*). The *last seat is usually close* line goes: the vote no longer decides seats.

### 4.6 The *What now* card (once per term; the front page and the first hall visit)

Kicker *WHAT NOW · YOUR FIVE DAYS*, two numbered lines, one button:

1. ***Your rule is on the ballot*** *— Reading Room Grant. The town votes Wednesday to Saturday. Change it until Monday midnight at your desk.* (or ***Your rule is next in line*** *— the two seats above yours chose first. Stand again when the term ends.*)
2. ***Draw your pay*** *— 10 Political Capital and 20 Party XP every morning you hold the seat, present or not.*

Button **To your desk at the Town Hall**. In the capital line 1 reads ***Your rule is on the ballot*** *— the Collective's card is yours: Reading Room Grant.* when the player leads the bloc, else ***Your party's card is set*** *— Councillor Varga chose the Collective's card: Public Works Order. The bloc's top seat chooses first.* (§8.6 Q4).

### 4.7 The active rule, always visible

- **The plate** keeps *Council rule: Street Fund · actions pay a quarter more Iron, jobs a quarter less · 3 days left* (tap → the hall). **New: the folded plate keeps a chip** (*Street Fund · 3 days*, Oswald caps on paper-2, right of the kicker) when a sheet is open, so the rule is on screen while the player pulls tickets.
- **Tickets** keep their tags (*Street Fund · +25 % Iron*, *Rally Permits · 10 Energy*). **The result modal** keeps the named bonus line.
- **The paper:** the *Council rule* row's line 3; the morning the rule starts, the city headline (§4.8).
- **The Me tab:** *Coalport · Street Fund · 3 days left* under the party card (one line), beside the seat line.
- **The capital's district plate and the district list:** the same line, city-wide.

### 4.8 The result modals and the paper

Modals (`kind: 'political'`, the masthead strip, one *Continue*, ≤ 240 characters):

| Act | Stamp | Headline | Text | Knock-on lines |
|---|---|---|---|---|
| Vote | **Vote cast** | Your vote is in | Street Fund. Nobody can see who you chose. The result is in the Clarion on Sunday morning; if it wins, it runs from Sunday for five days. | *Coalport morale +0.5 → 84.5 %* · *Next: the result, Sunday morning.* |
| Stand | **You're standing** | Your name is on the list | Your rule: Reading Room Grant. Seats are counted Sunday morning: the seven best known here, counting backers. Do today's orders and the branch backs you. | *−10 Political Capital · 35 left* · *Next: the result, Sunday morning.* |
| Back | **Backed** | {name} has your backing | Backing is public and final: three more to {name}'s count at Sunday's result. | *−10 Political Capital · 25 left* · *Next: the result, Sunday morning.* |
| Change your rule | **Changed** | Your rule is Street Fund | Actions pay a quarter more Iron, jobs a quarter less. On the ballot from Wednesday; the town votes until Saturday. | *Next: the vote opens Wednesday.* |

Headlines (the Clarion's wording; the Sentinel and the Gazette transcribe in their voices as slice 3 did): `hl.rule-won` (city 0, the count morning) **Street Fund Wins the Vote in Coalport** · *4 of 6 votes. In force until Thursday: actions pay a quarter more Iron, jobs a quarter less.* · `hl.rule-fallback` **Coalport Keeps the Branch's Rule** · *No votes were cast. Long Service Order runs until Thursday.* · `hl.your-rule-won` (personal 2) **Your Vote Counted: Street Fund Wins** · *4 of 6. In force until Thursday.* · `hl.your-rule-lost` **Your Vote Counted: Street Fund Falls Short** · *Public Works Order took it, 4 votes to 2. In force until Thursday.* · `hl.your-rule-on-ballot` (a councillor, personal 2, cycle day 2) **Councillor {name} Puts Reading Room Grant to the Town** · *Studying costs a fifth less. Voting opens today until Saturday midnight.* · `hl.filed` reworded **{name} Stands for the Council** · *Rule: Reading Room Grant. Seats are counted Sunday morning.* · `hl.vote-open` (city 0, days 2–4) **Coalport Votes on Its Rule** · *Three rules on the ballot. Vote from the paper or the Town Hall until Saturday midnight.* `hl.seat-won`, `hl.seat-top`, `hl.seat-lost`, `hl.seat-lost-tie`, `hl.seat-ended`, `hl.count` stay (their decks lose *members' votes* from the tie order). Removed: `hl.on-ballot`, `hl.struck`, `hl.moved`, `hl.council-passed`, `hl.council-failed`, `hl.voted-won`, `hl.voted-lost`, `hl.voted-lost-tie`, `hl.ordinance-city` (now `hl.rule-won`).

### 4.9 Help notes (two, in place of five)

**COUNCIL RULE** (the card's kicker, the hall's block, *How the vote works*), three lines: *Every five days Coalport votes on one rule for the town. Three are on the ballot: the branch's and the councillors'. The one with the most votes runs for five days, for everyone here whatever their party; no votes, the branch's.* · *Activists vote once, in secret, from Wednesday to Saturday. Organisers who are Known here can stand for the council for 10 Political Capital: the seven best known in Coalport take the seats, counting backers, and a councillor's rule goes on the ballot.* · *The rule in force is on the city plate, on your tickets and at the Town Hall.* **The capital's** second line: *Each party puts up its rule. Votes and opinion in your district together decide which party is ahead: it takes the most seats, and the party with the most seats across Irongate gets its rule.* The curious get a fourth line behind *More*: *Until ten people have voted in a district, opinion carries most of the weight; from ten, votes and opinion count half each. Two parties that put up the same rule share one card and split its votes equally.* (the last sentence explains the result rows' *shared*, §8.6 Q5).

**POLITICAL CAPITAL** as §3.8. The *Backers* and *Local support* notes go (one line each is on the screens that need them: *+3 at the count, public and final* on the back button's row; *your reputation here* in a row's popover).

### 4.10 Steps and taps

| Act | Steps | Taps on a phone |
|---|---|---|
| Vote | the card → the ballot → the modal | 3 (Vote now · a card · Vote for …), 4 with *Continue* |
| Vote on desktop | the card is the ballot | 2 |
| Stand | the hall or the card → the stand card → the modal | 2 (Stand · Continue), 3 if the rule is changed first |
| Back | the list → the modal | 1 |
| Change your rule | the desk → the sheet → the modal | 2 |

Nothing needs the player at a set time; every window is whole City Days; the count runs without anyone; every result waits in the paper.

---

## 5. The rules changes: to apply on approval

**Don't apply yet.** Each line names the number or rule that moves and where it lives.

### 5.1 GDD

| Section | Edit |
|---|---|
| §0 | A change-table line: *10 Oct 2026, voting simplified: the ballot is for a rule; the council's division, proposals, the backer requirement and members' votes in the seat count are removed; the rule runs from the count* |
| §1.5 | The ordinance row: drop *motion · to move · the division · Against all · rose without a motion*; add *the vote on the rule · your rule · next week's rule · the branch's rule*; the nominations row: drop *struck · your name comes off · the slate*; the endorse row: *the deposit* → *the price of standing (10 Political Capital, spent)*; the capital row: the D'Hondt sentence is no longer shown, only *votes and opinion together* |
| §2 | The Council Cycle row: days 0–1 the council sits, councillors set their rule and candidates stand; days 2–4 the vote on the rule; the winner in force **from the count for five days (days 0–4)** |
| §3.3 | The paper's row is *Council rule*; the front page carries the three cards, not the table |
| §5.2 | Unchanged (the right on day 2, the ballot by day 4) |
| §6.5 | The sinks table: *File candidacy: Council* → *Stand for the council: 10, spent*; *Propose an ordinance (councillor) 20* removed (a bill 50 stays for slice 7); the help note reworded (§3.8) |
| §14.11 | *NPC councillors abstain on ordinances, so a motion needs four player votes* → *the branch's card comes off the ballot*; the morale inputs (+0.5 a ballot, +2 a seat, −3 an unvoted count) stand |
| §15.1 | The Councillor row: powers *name a rule for the town's ballot (free, set at standing, changeable on cycle days 0–1) and draw pay*; who can stand: *Rank 3 · resident · Known · 10 PC*, no endorsements. The Governor row: *the Governor's rule* is **card 1** of the city's ballot; *local councillors with no player lead vote for it* removed |
| §15.3 | **Nominations:** the deposit is spent; no two-endorsement rule, no striking, no withdrawal, no small-branch rule; the branch's endorsement is a +3 bonus; platform lines → the candidate's rule. **The ballot:** *single choice, one tap, secret, final* stands; **for a rule**, three cards, set as §3.3. **The count in home cities:** total = ward vote + 3 × endorsements (members' votes removed; ties: endorsements, Successes, filing). **Seat allocation in battlegrounds:** unchanged formula; `ballotShare` is the votes for the party's card. **The order paper, the division, the Irongate order paper, the chain for a local councillor, four *None of these*, Clearwater's *passes with four of seven*:** replaced by §3.3–3.4 of this document. **The home-city menu:** unchanged (the bonuses are the point); *renew* is simply choosing the same rule again. **What the player sees:** rewritten to §4 |
| §15.4 | *The party's rule per city* = card 1 wherever no Governor sits; the Chair's own election loses the two-backer requirement (25 PC spent; backers optional, +3) |
| §15.9 | A petition still dissolves the council; **the rule in force runs out its window** (a city always has a rule; settled §8.1 Q16, was *strikes the rule*); the open ballot proceeds with the party's card and the locals' rules; the Governor's chair passes as before |
| §15.10 | NPC councillors' voting rule removed; *local candidates carry a rule in content*; the ward vote stays the NPC electorate for seats |
| Appendix C | #22 reworded (the weights without members' votes); #25 stands, flagged as the first lever; **#26 closed as moot** (no council vote); **#30 closed** (the capital's ballot is a party's card); **#44 closed** (the vote always decides the rule); new **#105** *members' votes are out of the seat count* (lever: a vote for a card counts one for each of its champions); **#106** *no backers needed to stand* (lever: raise the price to 15 before any gate); **#107** *the capital's rule is the largest bloc's* (lever: a six-of-ten bar behind one card, else the Mayor's rule) |

### 5.2 Design documents

- `slice-3-politics.md` §3 (who can do what), §4.2–4.4 (the count), §6 (standing), §7 (the ballot), §8 (headlines), §9.2, §10 (the ordinance: the ballot replaces §10.2–10.5), §12 (what the player sees), §13.2 (sinks), §17 Q2, Q3, Q15, Q16, Q18 (superseded).
- `slice-3-screens.md` §1a, §2.1–2.3, §3, §4, §5, §6, §9, §11, the review-3 and review-4 addenda: replaced by §4 here.
- `slice-4-battleground.md` §8.1 (who stands: no endorsements), §8.2 (`ballotShare` by card; the rule by seats), §8.4 (replaced), §8.6 (what the count prints); `slice-4-screens.md` §7.2, §8.
- `slice-7-nation.md` §3.1 (the Governor's rule = card 1; the locals' chain removed), §4.1 (no backers needed), §4.3 (the party's rule = card 1; Appendix C #26 line removed), §9 (Clearwater: three party cards, seven seats by D'Hondt, the rule by seats), §10.1 (unchanged), §15 (the session table), §12 (the modals); `slice-7-screens.md` §4.1, §7.1, §9.1.
- `review-4-answers.md` §10–11: superseded by §4.4–4.6 here.
- `docs/economy.md` §14.2 (two sinks; +55 a cycle from the first seat), §14.6 (the session shape), §21.2 (the Chair's deposit spent).

### 5.3 Content (`packages/content`): the developer's list

**Schemas and data**
- `candidates.ts` (`packages/content/src/data/candidates.ts`; `people.ts` holds the secretaries, not the locals): every **home** local candidate gains `rule: OrdinanceId` (the 27 of Appendix A, by id). The capital's thirty (`npc.*.ig.*`) and Clearwater's nine need none: their party's card falls to the secretary. `schemas.ts`: `rule` required on a home slate's candidate, forbidden elsewhere; the loader checks the id exists in the city's menu.
- `ordinances[]`: **unchanged** (`id`, `name`, `line`, `plainLine`, `effectLine`, `effects[]`, `bound`). Ids as built: `ord.public-works` · `ord.long-service` · `ord.street-permits` · `ord.rally-permits` · `ord.reading-room` · `ord.rest-day` · `ord.open-doors` · `ord.street-register` · `ord.street-fund` · `ord.public-meetings` · `ord.tram-subsidy`.
- `factions.ts`: the candidates' `platforms` (three lines per faction) are **no longer offered on the stand card**; keep the field for the slice-7 Chair's platform lines if it is shared, else remove it. The secretaries' default rule per faction stays as it is (`ord.rally-permits` · `ord.long-service` · `ord.reading-room`).
- `cities/irongate.ts` and `missions/irongate.ts` reference `platforms` (the grep in this change); check whether those are the council's or something else before removing.

**`copy.ts`** (`packages/content/src/data/copy.ts`)
- `election.*`: the seven states of §4.1 replace `belowRank`, `candidates`, `standing`, `backing`, `registered`, `voting`, `voted`, `candidateVoting`, `result`, `yourLine.*`, `councilSits`, `councilVoted`, `voteOnTheRule`, `noneOfThese`, `seeTheCouncil`; the kicker becomes `election.kicker(city) → 'Council rule · {city}'` and `rowKicker → 'Council rule'`; `firstTime` → *{city} picks a council rule every five days. You can vote on it now; {rank3}s who are Known here can stand for the council.*; keep `days`, `seeWhosStanding`, `seeTheResult`, `voteNow`; add `seeTheBallot`, `toYourDesk`, `ruleNow(name, plainLine, days) → 'Now: …'`.
- `capitalElection.*`: keep `kicker` (now *Council rule · Irongate · {district}*), `resultKicker`, `resultSundays`; replace `votingIsOpenIn`, `twoSeats`, `went`, `capitalSeats`, `resultLine`, `ballotLine`, `sixVotes`, `factionProposal` with §4.1–4.3's capital strings (*Which rule for Irongate next week?*, *{rule} won · the {party}'s, {n} seats of 10*, *Votes and opinion together · final*); **remove** `partiesColumns`, `votesCast`, `howSeatsAreWon`.
- `hall.*`: `yourDesk` and `upForAVote` go; add `nextWeeksRule`, `ballotSetAt(until)`, `change`, `yourRule`, `nextInLine`, `wonWith(weekday, votes, cast)`, `branchNoVotes`, `largestBloc(party, seats, of)`, `standForTheCouncil`; keep `ruleInForce`, `council`, `issues`, `ruleLine`, `player`, `local`, `termEnds`; `noRuleDivided` and `noRuleVotes` go (a city always has a rule).
- `council.whatNow.lines` → the two lines of §4.6 (and the *next in line* and capital variants); `council.deskNext.*` → *Next: the town votes {weekday} to {weekday}; the result {weekday} morning.* · *Next: the result, {weekday} morning.* · *Your pay: 10 Political Capital and 20 Party XP every morning, present or not.*
- `help.election`, `help.capitalElection`, `help.backers`, `help.localSupport` → **one** `help.rule(city, rank2, rank3, capital?)` (the three lines of §4.9, the capital's second line, the *More* line); `help.ordinance` and `help.pc` reworded as §4.9 / §3.8.
- **Remove:** `formula`, `howDecided`, `lastSeatClose`, `againstAll`, `roseWithoutMotion`, `theOrderPaper`, `propose`, `paperFull`, `youMoved`, `onThePaper`, `chooseAMotion`, `branchMotionBy`, `movedBy`, `depositRule`, `depositStays`, `withdraw`, `withdrawnLine`, `struckLine`, `onTheBallotLine`, `onTheSlate`, `branchMakesUpTheNumber`, `tooLateToStand`, `resultColumns`, `resultColumnsShort`, `backersOf` (the row reads *{n} backers*).
- **Add:** `rule.whose.branch(secretary)`, `rule.whose.councillor(name)`, `rule.whose.you`, `rule.whose.party(faction, who)`, `rule.whose.shared(a, b)`; `ballot.title`, `ballot.line(until, from)`, `ballot.voteFor(rule)`, `ballot.chooseARule`, `ballot.caption(at)`, `ballot.cast(weekday)`, `ballot.whoIsStanding(players, locals, seats)`; `seats.sentence(city, seats)` (*Seats go to the seven best known in {city}, counting their backers. Local candidates fill the rest.*), `seats.short(place, by)` (*8th · 4 short*), `seats.row(rank, standing, backers)`, `seats.rule(name)`; `stand.gives`, `stand.yourRule`, `stand.costs`, `stand.standing(rule, backers)`; `politics.results` → the four modals of §4.8 (`vote`, `stand`, `back`, `changeRule`); `plate.ruleChip(name, days)`; `me.rule(city, name, days)`.

**Headlines** (`hl.*` for the Clarion, `hl.v.*` the Sentinel, `hl.a.*` the Gazette, `hl.ig.*` the Herald; the Courier's follow slice 7's pattern)
- **Retire:** `hl.on-ballot`, `hl.struck`, `hl.moved`, `hl.council-passed`, `hl.council-failed`, `hl.voted-won`, `hl.voted-lost`, `hl.voted-lost-tie`, `hl.ordinance-city` in all four voices (`hl.ig.*` includes these ids). **Replace:** `hl.polls-open` → `hl.vote-open` (day 2 only; §8.1 Q12).
- **Reword:** `hl.filed` → *{name} Stands for the Council* · *Rule: {rule}. Seats are counted {weekday} morning.*; `hl.nominations` **kept**, reworded as §8.4 (*Names Go In*: 10 Political Capital and a rule); `hl.seat-won`, `hl.seat-top`, `hl.seat-lost`, `hl.seat-lost-tie`, `hl.seat-ended`, `hl.count` keep their ids and lose *members' votes* from any tie-order sentence (the tie is backers, then reputation, then who stood first).
- **Add:** `hl.rule-won` (city 0, the count morning: *{rule} Wins the Vote in {city}* · *{votes} of {cast} votes. In force until {weekday}: {plainLine}.*), `hl.rule-fallback` (city 0: *{city} Keeps the Branch's Rule* · *No votes were cast. {rule} runs until {weekday}.*), `hl.your-rule-won` (personal 2: *Your Vote Counted: {rule} Wins* · *{votes} of {cast}. In force until {weekday}.*), `hl.your-rule-lost` (personal 2: *Your Vote Counted: {rule} Falls Short* · *{winner} took it, {a} votes to {b}. In force until {weekday}.*), `hl.your-rule-on-ballot` (a councillor, personal 2, cycle day 2: *Councillor {name} Puts {rule} to the Town* · *{plainLine}. Voting opens today until {until}.*), `hl.vote-open` (city 0, days 2–4: *{city} Votes on Its Rule* · *Three rules on the ballot. Vote from the paper or the Town Hall until {until}.*). The capital's `hl.ig.rule-won` deck names the bloc: *The {party}'s, {n} seats of ten. In force until {weekday}: {plainLine}.*
- Conditions: `ruleWon { ordinanceId, votes, cast, fallback }`, `yourRule { won: boolean, … }`, `yourRuleOnBallot`, `voteOpen`; the slice-1 priority scheme is unchanged.

### 5.4 For the architect (not a decision here)

`elections.candidates[].rule`, `city.ballot { cards[3] { ordinanceId, by }, setAtDay }`, `votes { electionId, voterId, ordinanceId }` (the natural key unchanged); the count writes the rule and the seats in one transaction; `city.ordinance.fromDay` = the count day; the proposal and council-vote mutations are removed; `setRule` (a councillor, days 0–1) and `declare` carry an `ordinanceId`.

---

## 6. Before and after, in one minute

| | Before | After |
|---|---|---|
| Concepts to cast one vote | 12: the phases, candidates and locals, nine for seven, backers, local support, members' votes, the support sum and its ties, turnout, secret and final, the result table, a second vote by the council, the rule | **4:** the rule in force, three rule cards, *vote until Saturday · runs from Sunday for five days*, secret and final |
| Concepts to stand | +10: Rank 3, Known, the deposit and its refund, two backers, the branch's backing, the small-branch rule, struck, withdraw, a platform line | **+4:** Rank 3, Known, 10 Political Capital, your rule (backers optional) |
| Concepts as a councillor | +6: up for a vote, the party's proposal, put forward (20 PC), *None of these*, four of seven / six of ten, *couldn't agree*, locals follow | **+1:** your rule on the ballot, changeable until Monday |
| The capital on top | +6: two seats, any name any party, the score, the turnout weight, the D'Hondt sentence, six of ten, the draw | **+1:** each party's rule; votes and opinion together |
| **Concepts in all** | **33** | **10** |
| Election card states | 11 (16 with the capital) | 7 (8 with the capital) |
| Votes a member takes per cycle | 1 for a person; the rule decided by others | 1 for the rule |
| What the ballot shows | 9 rows × 3 lines, two groups, four explanatory lines, a formula | 3 cards × 3 lines, one line |
| Taps to vote (phone) | 4 (Vote now · a name · Vote for … · Continue) after reading nine rows | 3 + Continue; **2 on desktop** |
| Help notes on the path | 5 (*Election* five lines, *Council rule*, *Backers*, *Local support*, the capital's) | 2 (*Council rule* three lines, *Political Capital*) |
| Can a city end up with no rule? | Yes (*the council couldn't agree*; a 4 / 3 / 3 capital) | No |
| Does the vote decide the bonus? | Only through seven councillors two days later | Directly |
| Political Capital sinks in slice 3 | 3 (stand 10 · back 10 · put forward 20) | 2 (stand 10 · back 10) |
| The ladder, the offices, the laws | — | Unchanged |

---

## 7. Open questions for the user

1. **Members' votes out of the seat count** (§3.5): seats go to reputation and backers; the ballot is for the rule alone. **Recommended: yes.** The alternative keeps a hidden link (a vote for a card counts one for each candidate who named that rule), which keeps *a growing player base votes itself in* but lets candidates ride a popular card; hold it as the lever (Appendix C #105) if seats read as unreachable at scale.
2. **No backers needed to stand** (§3.6): 10 Political Capital, spent; backers optional (+3). **Recommended: yes.** It removes six concepts and the only cost is that a Rank 3 player can stand on a whim once a cycle, which a 10 PC price (two days' orders) already discourages. The alternative is to keep *two backers* with the branch's backing as a gate; that is the pile the user tripped on.
3. **The capital's rule is the largest bloc's** (§3.4), with parties that pick the same rule adding up. **Recommended: yes.** A rule always runs, and a coalition is a Chair's choice rather than a six-of-ten bar. The alternative keeps a bar (six seats of ten behind one card, else the Mayor's rule runs; never *nothing*), which preserves *one person can be the coalition* at the price of one more sentence on the capital's screens.

---

## Appendix A: the local candidates' rules (content, on approval)

A rule per home local, matching their line, so that a branch of one always sees three different cards (card 1 is the branch's; cards 2–3 fill from the seated locals in seat order, skipping duplicates).

`packages/content/src/data/candidates.ts`, field `rule`, an ordinance id from the city's menu. **Collective (Coalport):** `npc.c.weiss` (44) `ord.public-works` · `npc.c.baum` (38) `ord.rally-permits` · `npc.c.kolar` (33) `ord.street-fund` · `npc.c.hauser` (29) `ord.tram-subsidy` · `npc.c.novak` (25) `ord.long-service` · `npc.c.dressler` (22) `ord.public-meetings` · `npc.c.pohl` (19) `ord.rest-day` · `npc.c.ruzicka` (17) `ord.open-doors` · `npc.c.lenz` (15) `ord.street-permits`. **Vanguard (Duskwall):** `npc.v.kessler` (44) `ord.public-works` · `npc.v.vogel` (38) `ord.long-service` · `npc.v.reinhardt` (33) `ord.rest-day` · `npc.v.lang` (29) `ord.tram-subsidy` · `npc.v.steiner` (25) `ord.reading-room` · `npc.v.ehrlich` (22) `ord.street-register` · `npc.v.weber` (19) `ord.open-doors` · `npc.v.marquardt` (17) `ord.street-fund` · `npc.v.fink` (15) `ord.street-permits`. **Alliance (Ashford):** `npc.a.auer` (44) `ord.public-meetings` · `npc.a.kranz` (38) `ord.public-works` · `npc.a.holl` (33) `ord.reading-room` · `npc.a.mayr` (29) `ord.street-permits` · `npc.a.dorn` (25) `ord.tram-subsidy` · `npc.a.frisch` (22) `ord.street-fund` · `npc.a.tauber` (19) `ord.rest-day` · `npc.a.pichler` (17) `ord.long-service` · `npc.a.brenner` (15) `ord.open-doors`.

| Profile | Collective (Coalport) | Vanguard (Duskwall) | Alliance (Ashford) |
|---|---|---|---|
| 44 | Weiss · Public Works Order | Kessler · Public Works Order | Auer · Public Meetings Order |
| 38 | Baum · Rally Permits | Vogel · Long Service Order | Kranz · Public Works Order |
| 33 | Kolar · Street Fund | Reinhardt · Rest Day Order | Holl · Reading Room Grant |
| 29 | Hauser · Tram Subsidy | Lang · Tram Subsidy | Mayr · Street Permits |
| 25 | Novak · Long Service Order | Steiner · Reading Room Grant | Dorn · Tram Subsidy |
| 22 | Dressler · Public Meetings Order | Ehrlich · Street Register | Frisch · Street Fund |
| 19 | Pohl · Rest Day Order | Weber · Open Doors | Tauber · Rest Day Order |
| 17 | Ruzicka · Open Doors | Marquardt · Street Fund | Pichler · Long Service Order |
| 15 | Lenz · Street Permits | Fink · Street Permits | Brenner · Open Doors |

The fill rule (§3.3) skips a local whose rule is already on the ballot, so Holl's Reading Room Grant (the Alliance's default card) never duplicates card 1; Ashford's three with no players are *Reading Room Grant · Public Meetings Order · Public Works Order*.

With no player in Coalport the ballot reads *Long Service Order (the branch's) · Public Works Order (Councillor Weiss) · Rally Permits (Councillor Baum)*: a wage rule, a pay rule, a speech rule. In Duskwall *Rally Permits · Public Works Order · Long Service Order*; in Ashford *Reading Room Grant · Public Meetings Order · Public Works Order*. Content-policy check: no new Vanguard string; the rules are civic.

## Appendix B: what was checked and not changed

The check formula (§8.4) is untouched: nothing here rolls. Combat is untouched. The ordinance menu, its bounds and its plain lines are untouched: the bonuses the user likes are the one thing this document keeps whole. The five-day stagger, the offsets, the day boundary and the count job are untouched. Faction names are untouched. No real-world symbol or slogan appears in any new string.

---

## 8. Settled with the architect (10 Oct 2026; `docs/tech/voting-rework.md` §20.1 and §21)

Each of the plan's sixteen questions, with the default confirmed or changed and the reason. Strings are in full where the plan asked for them. "Confirmed" means the plan's default is the rule.

### 8.1 The sixteen questions

| # | Question | Settled | Why |
|---|---|---|---|
| 1 | A shared card's votes in a district's score | **Confirmed: split equally** between the sharing parties; the rows show the card's full votes with *shared*. | The player reads *parties sharing a card add up*; what they never see should be the plainest arithmetic. Splitting by opinion share would reward the bigger party twice (once in the split, once in the opinion half). GDD §15.3 and the slice-4 addendum now say *split equally* (they said *by their opinion shares*; corrected). |
| 2 | The Unrest ballot | **Confirmed: three cards** from the councillors' chain (player councillors by seat, then locals), card 1 of those the fallback. | Three cards everywhere means one ballot shape and one help note. Two cards would be a visible state to explain. |
| 3 | The branch's backing | **Confirmed: +3 once**, on any day 0–4 until the count on which the candidate does all three orders. | It is a bonus for touching the daily loop, not a second ladder; per-day would make the orders worth +15 to a candidate and nothing to anyone else. |
| 4 | A candidate changing their rule after standing | **Confirmed: no.** The stand card's *Change ›* is before the tap; a councillor changes it on days 0–1 of the term. | One act fewer on the list screen, and the paper's *{name} Stands for the Council · Rule: …* stays true all week. |
| 5 | The capital's "top-seated" player councillor | **Confirmed:** the highest count total, then the lower seat number. | The total is the count's own order; the seat number is the tie-break the player can see on the council rows. |
| 6 | Where the rule chip sits | **Confirmed:** on a phone, right of the plate's kicker when the rule line is folded away (under 700 px), and in the place sheet's header row while a sheet covers the plate; a tap opens the hall. | The chip exists for the moment the player is pulling tickets, which is when the plate is covered. |
| 7 | The card's `result` line for a fallback | **Changed: two lines, below.** | The default put three facts on one line; the card has two. |
| 8 | The switch cycle's result line (`how: 'carried'`) | **Changed: two lines, below.** | Same. The player who was mid-cycle needs to know nothing was lost and when the first rule vote opens. |
| 9 | The desktop card as the ballot | **Confirmed:** `ballotInline` in the city screen's side column from 640 px; the HQ sheet and the paper row keep the link. | The side column is where the card renders as a card; the paper's row is a row. |
| 10 | A councillor choosing a rule already on the ballot | **Confirmed: allowed**; the sheet dims those rows with the note *already on the ballot · yours would be skipped* and does not disable them. | A councillor may want the branch's rule to be seen as theirs too; the skip costs the town nothing. |
| 11 | The fill past the seated locals | **Confirmed:** the city's other locals by profile, then the menu's order. | Never reached with Appendix A; the loader check (`ballotFillProblems`) is the real guard. |
| 12 | `hl.vote-open` on each of days 2–4 | **Changed: day 2 only** (the morning the vote opens). | The *Council rule* row already says *Which rule for Coalport next week?* every morning with the dot; three mornings of the same city headline is noise. The old `hl.polls-open` printed daily because the row did not yet carry the vote. |
| 13 | The Clearwater and capital locals carry no rule | **Confirmed:** they never fill a card; `fill` is a home-city function and the capital's cards are one per party through the chain, which ends at the secretary. | A contested city's card is a party's, never a person's. |
| 14 | The rival edition's local-election line | **Written below** (§8.3). | |
| 15 | The other voices' strings | **Written below** (§8.4). | |
| 16 | Slice 7's dissolution "strikes the rule" | **Changed, as the default says: the rule in force runs out its window**; the open ballot proceeds with the party's card and the seated locals' rules; every councillor's term ends *not completed*; the Governor's chair passes to the bloc's top local. | *A city always has a rule* (§3.4). What a petition takes from a council is its seats, its Governor and its rungs; the rule the town voted for is the town's. GDD §15.9, §5.1's row and the slice-7 addendum now say so. |

### 8.2 Q7 and Q8: the card's result lines

The `result` state (cycle days 0–1), line 1 (body 600) and line 2 (Courier), by `how`:

| `how` | Line 1 | Line 2 |
|---|---|---|
| `votes` | **Street Fund won · 4 of 6 votes** | Runs until Thursday · the next vote opens Wednesday |
| `tie` | **Street Fund won · 3 votes each, the first card takes a tie** | Runs until Thursday · the next vote opens Wednesday |
| `fallback` (home) | **Long Service Order runs · the branch's rule** | No votes were cast · runs until Thursday · the next vote opens Wednesday |
| `fallback` (Unrest; card 1 is a councillor's) | **Public Works Order runs · Councillor Weiss's rule** | No votes were cast · the branch had no card: Coalport is in Unrest · runs until Thursday |
| `seats` (capital) | **Rally Permits won · the Vanguard's, 4 seats of 10** | Eastside: Vanguard, Collective · runs until Thursday · the next vote opens Wednesday |
| `seats`, a shared card | **Reading Room Grant won · the Collective's and the Alliance's, 6 seats of 10** | Eastside: Collective, Alliance · runs until Thursday · the next vote opens Wednesday |
| `draw` (capital) | **Rally Permits won · on the returning officer's draw** | Level on seats, votes and opinion · runs until Thursday · the next vote opens Wednesday |
| `carried` (the switch cycle) | **Street Fund runs · carried over** | Runs until Thursday · the first vote on a rule opens Wednesday |

The hall's *The rule in force* block prints the same fact under the days left: *won Sunday with 4 of 6 votes* · *won Sunday on a tie · 3 votes each* · *the branch's · no votes cast* · *Councillor Weiss's · no votes cast · the branch had no card* · *the Vanguard's · 4 seats of 10* · *the Collective's and the Alliance's · 6 seats of 10* · *the Vanguard's · on the returning officer's draw* · *carried over from the old council*. The result screen's winner card carries the same words under *PASSED*. `copy.rule.how.*`, one key per `how` plus `fallbackUnrest` and `sharedSeats`.

### 8.3 Q14: the rival edition's local-election line (`copy.paper.localElection`)

`localElection(city, phase, until)`: on days 2–4 (`polling`) `until` is the close of the vote; on days 0–1 (`nominations`) it is **the day voting opens** (the set day), not the close of names.

- `polling`: ***Duskwall votes on its rule until Saturday midnight.***
- `nominations`: ***Duskwall chooses next week's ballot · voting opens Wednesday.***

A visitor cannot vote there (they do not live there), so the line is a notice, not a button; it keeps reading *rule*, never *council*, so that the capital's and the home cities' papers say the same thing about the same event.

### 8.4 Q15: the headline strings in the other three voices

Tokens as the plan's §10 (`{rule}`, `{winner}`, `{votes}`, `{of}`, `{until}`, `{line}` = the winner's `plainLine`, sentence case at a sentence's start), plus `{name}`, `{weekday}`, `{district}`, `{parties}` (*the Vanguard* / *the Collective and the Alliance*), `{seats}`, `{winnerVotes}`, `{winnerSeats}`. Decks ≤ 200 characters with the longest `{line}` (*actions pay a quarter more Iron, jobs a quarter less*). The Clarion's are §4.8; repeated here so the four voices sit together.

**The Coalport Clarion (`hl.*`)**

| Id | Headline | Deck |
|---|---|---|
| `hl.rule-won` | {rule} Wins the Vote in Coalport | {votes} of {of} votes. In force until {until}: {line}. |
| `hl.rule-fallback` | Coalport Keeps the Branch's Rule | No votes were cast. {rule} runs until {until}. The Union Hall would like a word about that. |
| `hl.your-rule-won` | Your Vote Counted: {rule} Wins | {votes} of {of}. In force until {until}. |
| `hl.your-rule-lost` | Your Vote Counted: {rule} Falls Short | {winner} took it, {winnerVotes} votes to {votes}. In force until {until}. |
| `hl.your-rule-on-ballot` | Councillor {name} Puts {rule} to the Town | {line}. Voting opens today until {until}. |
| `hl.vote-open` (day 2) | Coalport Votes on Its Rule | Three rules on the ballot. Vote from the paper or the Town Hall until {until}. |
| `hl.filed` (reworded) | {name} Stands for the Council | Rule: {rule}. Seats are counted {weekday} morning. |
| `hl.nominations` (kept, reworded) | Coalport Council: Names Go In | Organisers who are Known here can stand at the Town Hall until {until}: 10 Political Capital, and the rule you would put to the town. |

**The Duskwall Sentinel (`hl.v.*`)**, cold, the committee's voice

| Id | Headline | Deck |
|---|---|---|
| `hl.v.rule-won` | {rule} Carries the Vote in Duskwall | {votes} of {of} votes. In force until {until}: {line}. The committee notes the result. |
| `hl.v.rule-fallback` | Duskwall Keeps the Committee's Rule | No votes were cast. {rule} runs until {until}. Beacon House has noticed. |
| `hl.v.your-rule-won` | Your Vote Counted: {rule} Carries | {votes} of {of}. In force until {until}. |
| `hl.v.your-rule-lost` | Your Vote Counted: {rule} Falls Short | {winner} took it, {winnerVotes} votes to {votes}. In force until {until}. The minutes record it. |
| `hl.v.your-rule-on-ballot` | Councillor {name} Puts {rule} to the Town | {line}. Voting opens today until {until}. The committee expects every member to vote. |
| `hl.v.vote-open` (day 2) | Duskwall Votes on Its Rule | Three rules on the ballot. Vote from the paper or at the Town Hall until {until}. The committee expects a full turnout. |
| `hl.v.filed` | {name} Stands for Duskwall Council | Rule: {rule}. Seats are counted {weekday} morning. The committee does not extend deadlines. |
| `hl.v.nominations` | Duskwall Council: Names Go In | Bailiffs Known here may stand at the Town Hall until {until}: 10 Political Capital, and the rule they would put to the town. In order. |

**The Ashford Gazette (`hl.a.*`)**, dry, a newspaper that checks

| Id | Headline | Deck |
|---|---|---|
| `hl.a.rule-won` | {rule} Wins the Vote in Ashford | {votes} of {of} votes. In force until {until}: {line}. The Gazette has checked the count. |
| `hl.a.rule-fallback` | Ashford Keeps the Branch's Rule, Unopposed | No votes were cast. {rule} runs until {until}. The leader column wonders why. |
| `hl.a.your-rule-won` | Your Vote Counted: {rule} Wins | {votes} of {of}. In force until {until}. |
| `hl.a.your-rule-lost` | Your Vote Counted: {rule} Falls Short | {winner} took it, {winnerVotes} votes to {votes}. In force until {until}. The Gazette prints the count in full. |
| `hl.a.your-rule-on-ballot` | Councillor {name} Puts {rule} to the Town | {line}. Voting opens today until {until}. The Gazette wishes it luck, impartially. |
| `hl.a.vote-open` (day 2) | Ashford Votes on Its Rule | Three rules on the ballot. Vote from the paper or at the Rooms until {until}. The Gazette has read all three. |
| `hl.a.filed` | {name} Stands for Ashford Council | Rule: {rule}. Seats are counted {weekday} morning, says the returning officer, who means it. |
| `hl.a.nominations` | Ashford Council: Names Go In | Agents Known here can stand at the Town Hall until {until}: 10 Political Capital, and the rule they would put to the town. |

**The Irongate Herald (`hl.ig.*`)**, the capital's, wry; the capital has no fallback (`how` is `seats` or `draw`)

| Id | Headline | Deck |
|---|---|---|
| `hl.ig.rule-won` (`seats`) | {rule} Wins the Capital | Backed by {parties}: {seats} seats of ten. In force until {until} in every district: {line}. |
| `hl.ig.rule-drawn` (`draw`; the Herald's form of `rule-fallback`) | {rule} Wins the Capital on the Returning Officer's Draw | Level on seats, votes and opinion, so the hat decided. In force until {until}: {line}. |
| `hl.ig.your-rule-won` | Your Vote Counted: {rule} Wins the Capital | {seats} seats of ten behind it. In force until {until}. |
| `hl.ig.your-rule-lost` | Your Vote Counted: {rule} Falls Short | {winner} had {winnerSeats} seats of ten to {seats}. In force until {until}. |
| `hl.ig.your-rule-on-ballot` | Councillor {name} Carries {parties}'s Card: {rule} | {line}. Voting opens today in every district until {until}. |
| `hl.ig.vote-open` (day 2) | The Capital Votes on Its Rule | One card a party, every district, until {until}. Your vote is secret; the seats follow it. |
| `hl.ig.filed` | {name} Stands for the Council in {district} | Rule: {rule}. Two seats, counted {weekday} morning. |
| `hl.ig.nominations` | Names Go In Across the Capital | Known in Irongate and Rank 3: stand in your district at the City Hall until {until}, 10 Political Capital and a rule. |

`{parties}'s` in the Herald's on-ballot headline reads *the Vanguard's Card* for one party (the possessive rule is §8.6 Q1); a shared card never has a single carrier, so the condition `ruleOnBallot` fires for the first party in the card's order and the headline names that party. The Herald's count line (`capitalPaper.ts`) reads *{rule} · {seats} seats of 10* beside the seats by party. The Clearwater Courier's set is written with slice 7's build in the Courier's voice (not now).

### 8.5 The plan's §21 notes

- **`people.ts` → `candidates.ts`:** corrected in §5.3 and Appendix A. `people.ts` holds the secretaries and the office figures; the 27 home locals are `packages/content/src/data/candidates.ts`.
- **Eight states:** §4.1's table is seven plus the capital's `registered` (*You live in Eastside · you vote from Thursday*), as the plan's §6 reads it.
- **`hl.polls-open` → `hl.vote-open`:** the mapping is now in §4.8 and §5.3; `hl.vote-open` prints on day 2 only (Q12). **`hl.nominations` is kept and reworded** (above), not retired as §5.3 first said: the plan's §10 is right that the city's standing window deserves one morning line, and it already exists in four voices.
- **GDD §15.3, a shared card's ballots:** *split equally* (Q1), corrected from *by their opinion shares*.
- **Ambition chapter 3, *The deposit*** (the plan's §17 item 9): the chapter's fiction (the ten marks handed over, the name on the list) stands, because the 10 PC is still paid and still printed on the list; only the refund is gone, which the chapter never promised. Re-read its strings when slice 7 strings it; no number moves.

### 8.6 Phase-1 wording (12 Oct 2026; the developer's five questions from commit `04bcb83`)

Strings live in `packages/content/src/data/copy.ts` and `data/ruleHeadlines.ts`; the keys are named so phase 2 can bind them without asking again.

| # | Question | Settled | Why |
|---|---|---|---|
| 1 | The possessive on the party card | **Every party's short name takes `'s`:** *the Vanguard's Card*, *the Collective's Card*, *the Alliance's Card*. The Herald's template is `{parties}'s Card` (`hl.ig.your-rule-on-ballot`); the design's `{parties}'` was a slip. The same rule holds wherever a party owns something: *the Vanguard's rule*, *the Collective's card is yours*, *the Alliance's, 4 seats of 10*. | None of the three short names ends in an s, so a bare apostrophe would print *the Vanguard' Card*. *Vanguard*, *Collective* and *Alliance* are singular bodies, like *the party's*. A joint card (*the Collective and the Alliance's card*) is correct joint possession too, though the on-ballot headline names one carrier (§8.4). If naming is ever unparked and a name ends in s, the copy is re-read then, not now. |
| 2 | `errors.notOnBallot` | **Approved as proposed:** *That rule isn't on this ballot.* | Short, says the one fact; *this* ballot because last week's and next week's exist. |
| 3 | `errors.ruleWindowClosed` | **Rewritten:** *Your rule is set for this term · councillors change it on a term's first two days · the next term starts {when}* | The proposal led with the rule and ended with *next {when}*, which with a `when` phrase prints *next tomorrow 01:00*. The refusal should say what happened (your rule is set), the rule, and the moment, with the phrase carrying its own preposition (*starts Thursday*, *starts tomorrow 01:00*). *Term* is the word already on the council block (*Term ends Thursday*). |
| 4 | The capital's *What now* opening when another councillor chose the card | **Rewritten:** head ***Your party's card is set***, line *Councillor Varga chose the Collective's card: Public Works Order. The bloc's top seat chooses first.* (`council.whatNow.rule.capitalChosen`). The Election card's council state in the capital reads *You're on the council · your party's card is set* / *Councillor Varga chose it: Public Works Order · pay every morning* (`election.v2.partyCardSet`); the hall's block-2 line is *Your party's card is set: Councillor Varga chose the Collective's card, Public Works Order.* (`hall.partyCardSet`). The home cities keep *next in line*. | In the capital there is no line to be next in: the party has one card and the bloc's top seat (§8.1 Q5) chooses it. *Next in line* would promise a place that never comes up. The second sentence mirrors the home line's *the two seats above yours chose first*, so a councillor learns the same thing in both: who chose, and that seat order decides. |
| 5 | The *· shared* marker on a capital party row | **Kept, as *· shared*** (`capitalElection.partyVotes`: *votes 4 · shared*). The *More* line of the capital's help note gains one sentence: *Two parties that put up the same rule share one card and split its votes equally.* | One word on a row that is already crest · party · votes · seats; §8.1 Q1 chose the word. The reader who wonders why two rows show the same figure has the help note one tap away; the row is not the place to explain arithmetic. |

Not a GDD change: wording only, no rule or number moves. The old §4.6 and §4.9 lines are updated above in place.
