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

- **Against slice 7's offices.** A Governor today, with six locals who follow, passes any rule outright; under this model the Governor **sets card 1** and wins it when nobody votes otherwise. In a branch of one that is the same thing; at scale the Governor sets the agenda and the town decides. That is the politics the game says it is about (*a political battle*), and the Address (+50 on an Issue) is untouched. The Chair's rule per city is card 1 wherever no Governor sits, as now. Parliament and the laws change nothing: a deputy's For / Against on a bill is already a vote on a rule, and the law book's rows read as council rules with the *LAW* kicker; the national ballot (a person with two pledged laws) should lead each row with the pledges, which it nearly does. Petitions still dissolve a council; **the rule in force runs out its window** (a city always has a rule; settled with the architect, §8.1 Q16, and GDD §15.9; this paragraph said *strike its rule* until 14 Oct 2026).
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
- the name (body 600, 16 px) · the plain line (body 14 px: *actions pay a quarter more Iron, jobs a quarter less*) · the effect line in Oswald caps 10 px petrol (*IRON FROM ACTIONS +25 % · JOB PAY −25 % · 5 DAYS*; these are rewards, not odds, and stay) · a Courier line saying whose it is: *the branch's rule · Secretary Holm* / *Councillor Anna Weiss's rule* / *your rule* / in the capital *Vanguard · Organiser Stahl* with the crest (the secretary as the branch addresses them, `addressedAs`; §8.8 Q4) or, when a councillor leads the bloc, *Collective · Councillor Jana Varga* (§8.9 Q2; the capital's forms carry no *'s rule*, §8.11 Q1), or two crests and *Collective and Alliance*;
- a radio ring at the right; tapping anywhere selects.

Sticky bottom: **Vote for Street Fund** (`Button primary`; *Choose a rule* while none is selected); Courier under it *Secret and final. The result is at 01:00 on Sunday.* Under the cards (scrolls): a folded row **Who's standing · 2 players and 7 local candidates for 7 seats ›** → §4.5; the link **How the vote works** → the help note; *Last result · Sunday*.

Already voted: the chosen card carries *your vote* in Courier, the others dim to 50 %, the CTA is the line *Vote cast · the result is in Sunday's paper and on the card*. Closed: *Coalport votes from Wednesday* with **See the result** and *See who's standing*.

**The capital's line under the title** (§8.9 Q3, shortened §8.10 Q1; the home line's shape, three Courier lines at most at 390 px): *One vote · until Saturday midnight · votes and opinion decide Eastside's seats · most seats city-wide wins the rule.* The long form (*Each party puts up its rule. Votes and opinion in your district together decide …*) is the help note's second line, one tap away. Three cards, one per party, in order of the parties' shares in the district.

**Above the fold at 390 × 844** (top bar 56, tab bar 60; 728 px usable): header 150 · plate 80 · three cards 264 · sticky 64 = 558. All three cards and the button are visible without scrolling; on a 667 px phone the header drops to its 64 px band and the third card's top edge still shows. **Desktop (≥ 960):** the 720 px sheet; the three cards in one row of three (each a third wide, 160 px tall) with the button under them; the folded *Who's standing* row and the help link below.

### 4.3 The result (`/council/count`)

Plate kicker *COALPORT COUNCIL · THE RESULT*, title *Sunday's result*, Courier *6 of 9 members voted · final*.

1. **The three cards** in finishing order, each with its vote count in Oswald 16 px at the right and a thin ink bar under the name sized to the share; the winner carries the **PASSED** stamp (the in-line variant) and the Courier line *runs until Thursday*; the player's card carries *your vote*. A card that won on the fallback reads *the branch's · no votes cast*.
2. **The council** (kicker): the seven seated as rows (`PersonMark`, the name, *Player · Organiser · One of Us · 3 backers* or *Local candidate · Trusted*; *you* on the player's; *· the rule you named: Reading Room Grant* on a player councillor's). Under *the line*, the unseated in order, the player's own with *8th · 4 short*. Tapping a row opens the small popover with the two numbers (*local support 40 · backers 2*) for anyone who wants them. Courier under the list: ***Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.***
3. **Links:** *How the vote works* · *The Town Hall*.

**The capital** (`/council/count?d=`): the plate line *Rally Permits won · 4 seats of 10 behind it · local candidates 7 of 10 · final*; the three cards as above with **seats** (bars) instead of votes and the parties' crests; the district switcher; per district **three party rows** (crest · the party · *votes* n · *seats* bars) with the Courier *Votes and opinion together · final*; the party's candidates under each row as the council rows; under them the capital's seats sentence (§8.9 Q1). No *Score*, *Opinion* or *w* column; the formula lives in the help note.

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

The hall header · plate kicker *COALPORT COUNCIL · CANDIDATES*, title *Who's standing*, Courier *Seven seats · counted Sunday morning · stand until Monday midnight*. One sentence under the title: *Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.* **The capital's sentence** (§8.9 Q1): *Two seats in Eastside: votes and opinion decide how many each party takes; a party's seats go to its best known in Irongate, counting their backers. Local candidates fill the rest.*

**The stand card** (eligible, days 0–1): kicker *STAND FOR THE COUNCIL*; two ticks in Courier (*✓ Rank 3, Organiser* · *✓ Known in Coalport (74 wins)*; below either, the cross and *Needs Rank 3 · 1,240 Party XP to go* / *Needs to be Known in Coalport · 18 wins to go* (§8.8 Q1) and no button); the line *A seat is five days on the council: your rule on the town's ballot, and 10 Political Capital and 20 Party XP a morning.*; **Your rule**: one row showing the chosen rule (the branch's default first) with *Change ›* to the eleven-row sheet; the button **Stand · 10 Political Capital** (*Needs 10 Political Capital* when short); Courier *Costs 10 Political Capital. Your name is on the list until the count.* After standing the card reads *You're standing · your rule: Reading Room Grant · 1 backer* with the branch's line when it applies.

**The list:** *Players standing* (name · *Organiser · Trusted in Coalport · 2 backers* · *rule: Public Works Order*; **Back · 10 Political Capital** at the right for others; *Backed* once given; *You* on your own), then *Local candidates* with the one line (*Townspeople run by the game. They fill the list so there is always a council; a player who is better known here beats them.*) and their rows (*Local candidate · One of Us* · the platform line · *rule: Public Works Order*). The *last seat is usually close* line goes: the vote no longer decides seats.

### 4.6 The *What now* card (once per term; the front page and the first hall visit)

Kicker *WHAT NOW · YOUR FIVE DAYS*, two numbered lines, one button:

1. ***Your rule is on the ballot*** *— Reading Room Grant. The town votes Wednesday to Saturday. Change it until Monday midnight at your desk.* (or ***Your rule is next in line*** *— the two seats above yours chose first. Stand again when the term ends.*)
2. ***Draw your pay*** *— 10 Political Capital and 20 Party XP every morning you hold the seat, present or not.*

Button **To your desk at the Town Hall**. In the capital line 1 reads ***Your rule is on the ballot*** *— the Collective's card is yours: Reading Room Grant.* when the player leads the bloc, else ***Your party's card is set*** *— Councillor Varga chose the Collective's card: Public Works Order. The bloc's top seat chooses first.* (§8.6 Q4).

### 4.7 The active rule, always visible

- **The plate** keeps *Council rule: Street Fund · actions pay a quarter more Iron, jobs a quarter less · 3 days left* (tap → the hall). **New: the folded plate keeps a chip** (*Street Fund · 3 days*, Oswald caps on paper-2, right of the kicker) when a sheet is open, so the rule is on screen while the player pulls tickets. On an upright phone under 700 px tall the plate's own chip prints the name alone, *Street Fund*, and the kicker row beside it drops *Home city ·* (§8.11 Q2); the sheet's chip keeps the days.
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

### 8.7 Phase-2 strings keyed (12 Oct 2026; the developer's stand-ins from commit `a4a810d`)

Four strings the phase-2 client printed inline. Each now has a key in `copy.ts`; phases 3–5 bind them where the stand-ins are (`ResultModal.tsx` twice, `Capital.tsx`, `DevPanel.tsx` and `apps/server/src/dev/clock.ts`).

| # | Where | Key | Prints | Why |
|---|---|---|---|---|
| 1 | The *Backed* modal's knock-on line (`knockOns.backers`) | `copy.stand.backersKnock(name, n)` | *Anna Weiss · 3 backers* | The count after your backing, in the words the slate's rows and the council's rows already use (*· 3 backers*). The modal's body says what a backing is worth (*three more to {name}'s count*); the line says only the new figure. |
| 2 | The action modal's effect line the day a standing candidate does all three orders (`effects.branch`) | `copy.branchBacksYou(n)` | *The branch backs you · 2 backers* | Capitalised like its neighbours (*All orders carried out · +5 Political Capital*). Two facts, no third: the stand card's *do today's orders and the branch backs you* has already promised this, and the figure counts the branch as one backer (ADR 0084). `branchEndorsesYou` (*All orders carried out · the branch backs you*) stays for the candidacy card's line. |
| 3 | A district's party row at the capital's count | `copy.capitalElection.partyVotes(n, shared)` (existing) | *votes 4* / *votes 4 · shared* | No new key: the row's `shared` flag picks the form, so the plain row and the shared row are one string. The stand-in's *votes {n}* is the `false` branch. |
| 4 | The dev panel's next-boundary label and phase line | `copy.dev.next.vote` · `copy.dev.next.count` · `copy.dev.phase(cycleDay)` | *The vote opens* · *The count* · *Result day · stand and set rules (day 1 of 2)* / *Stand and set rules (day 2 of 2)* / *The vote (day 1 of 3)* … *(day 3 of 3)* | Not player-facing, but the panel should name the windows as the cards do. **Confirmed against §3.2:** days 2–4 are *the vote* (the ballot's kicker is *THE VOTE*, the card reads *Vote until …*), the boundary into day 0 is *the count* (*Seats are counted Sunday morning*), and *The vote opens* is the card's own phrase (*the next vote opens Wednesday*). Days 0–1 say what the window holds in §3.2's two verbs, *stand* and *set rules*. The old *Polls open* and *Nominations* go with the person ballot. |

Not a GDD change: wording only, no rule or number moves.

### 8.8 Phase-3 questions settled (12 Oct 2026; the developer's four from commit `0468164`)

Strings in `packages/content/src/data/copy.ts`; the developer binds or changes what the last column names.

| # | Question | Settled | Why | For the developer |
|---|---|---|---|---|
| 1 | The stand card's second cross, a player not yet Known here | **Rewritten:** *Needs to be Known in Coalport · 18 wins to go* (`copy.stand.needsKnown`, same signature; it prints the gap, `need − wins`, singular at 1). §4.5 now lists it beside the rank's cross. | The rank's cross reads *Needs Rank 3 · 1,240 Party XP to go*: a target and the gap. The second cross should be the same shape, so the two read as one list. *12 of 30 wins* is a progress fraction, which is a different shape and makes the player subtract. *Wins* stays: it is the tick's word (*Known in Coalport (74 wins)*). | Nothing to bind; the call is unchanged. The e2e that asserts the old words, if any, changes. |
| 2 | The ballot's plate line folds away under 700 px tall | **Confirmed; no shorter line.** Under 700 px the plate keeps the kicker and the title; the sticky caption keeps *Secret and final. The result is at 01:00 on Sunday.* | The player opens the ballot from the Election card, which has just read *Vote until Saturday midnight · the winner runs from Sunday for five days*; the vote modal repeats *runs from Sunday for five days*. At the moment of the tap the two facts that matter are on the caption: that the vote is secret and final, and when the result is. The fold is the same rule the hall header already follows on short phones, so it is one rule, not two. A line short enough to fit one Courier row at 375 px would carry at most two of the three facts and would differ between phones. On a 390 × 844 phone nothing folds (§4.2's fold table holds). | Nothing. |
| 3 | *Who's standing* on days 2–4: the plate line | **Written:** *Seven seats · the vote is on · counted Sunday morning · names go in again from Sunday* (`copy.stand.plateLineVoting(seats, countWeekday)`; the one weekday is the count's: the next standing window opens that morning, cycle days 0–1 of the next term). `tooLateToStand` is retired (already on §5.3's removal list; the key stays until phase 5 so the client compiles). | The old line (*Voting is open; it's too late to stand*) says what the player cannot do and not when they can. The new one keeps the plate line's shape (seats · when counted) and adds the two facts of the state: the town is voting, and the next names go in on the count morning. *Names go in* is the paper's phrase (`hl.nominations`, *Names Go In*), so the plate and the headline agree. No clock time (§3.2). | `apps/client/src/routes/council.tsx` `SlatePage`: the `polling` branch of the plate line → `copy.stand.plateLineVoting(seats, formatWeekday(e.countAt))`. The *Vote now* link after the list stays. |
| 4 | The party card's name: *Petra Holm* or *Secretary Holm* | **The title: `secretary.addressedAs`.** *the branch's rule · Secretary Holm* (Collective), *· Organiser Stahl* (Vanguard), *· Mr Grey* (Alliance). The design's *Secretary Stahl* in §4.2 was a slip: the Vanguard's secretary is addressed as *Organiser Stahl* (`factions.ts`); corrected in place. The same holds in the capital's card (`rule.whose.party`). | Everywhere else the game speaks of the secretary by office, never by full name: the orders, the headlines (*Secretary Holm Calls for …*), the story. A councillor's line carries the full name (*Councillor Anna Weiss's rule*) because councillors are players the reader may not know; the secretary is one figure per branch, and *the branch's rule · Petra Holm* reads as a private person's rule rather than the branch's. | **A phase-5 server change:** `RuleCardView.whose.by` for a `party` card carries `faction.secretary.addressedAs`, not the NPC's `name` (`apps/server/src/services/ruleBallot.ts`, `secretaryCard` / `capitalCards`' `secretary: { npcId, name }`). The fixtures that print *Petra Holm* as `by` (`packages/rules/src/testing/fixtures.ts`, `slice4.ts`, `review4.ts`) follow. No copy change: `rule.whose.branch` / `party` take the string as given (their comments now say which). |

Not a GDD change: wording only, no rule or number moves.

### 8.9 Phase-4 questions settled (12 Oct 2026; the developer's four from commit `f8cfc88`), and the phase-5 list

Strings in `packages/content/src/data/copy.ts`; the developer binds or changes what the last column names. The headline files other than `ruleHeadlines.ts` are phase 5's to edit; their new words are written out in §8.9.2.

#### 8.9.1 The four questions

| # | Question | Settled | Why | For the developer |
|---|---|---|---|---|
| 1 | *Who's standing* in the capital: a sentence of its own | **Written:** *Two seats in Eastside: votes and opinion decide how many each party takes; a party's seats go to its best known in Irongate, counting their backers. Local candidates fill the rest.* (`copy.seats.capitalSentence(district)`). It is the capital's form of `seats.sentence` and goes where that sentence goes: under *Who's standing*'s title, and under the district's rows at the count. §4.3 and §4.5 now say so. | The home sentence says two things: who gets a seat (the best known, counting backers) and who fills the rest. The capital has one more fact between them: how many seats each party gets, which is the one idea the capital adds (*votes and opinion together*). Three clauses in the home sentence's order; the ballot's line (Q3) is about the vote, not the seats, and was doing a job it was not written for. *Known in Irongate*, not *in Eastside*: reputation is per city. | `apps/client/src/routes/council.tsx` `SlatePage` and the capital's `CountPage`: the sentence under the title → `copy.seats.capitalSentence(districtName)` in place of `capitalElection.ballotLineV2`. `capital.spec.ts` asserts the new sentence. |
| 2 | A capital card set by a councillor: *· Jana Varga* or *· Councillor Varga* | ***the Collective's rule · Councillor Jana Varga*** (`copy.rule.whose.partyCouncillor(faction, name)`, new). The full name, with the title; nothing splits a name. The secretary's card stays `rule.whose.party` with `addressedAs` (§8.8 Q4). §4.2 now gives both forms. | §8.8 Q4's rule: the secretary by office, a councillor by title and name, because a councillor is a player the reader may not know (*Councillor Anna Weiss's rule* at home). *Councillor Varga* in §4.6 and §8.6 was shorthand: player names are one stored string, and splitting one to find a surname fails on a one-word name. The same holds for `hall.partyCardSet`, `election.partyCardSet` and `council.whatNow.rule.capitalChosen`: `name` is the stored name, and they print *Councillor Jana Varga chose …*. | **Phase 5, server and view:** `RuleCardView.whose` (party form) gains `via: 'secretary' \| 'councillor'` from `CardBy.via`, and `by` carries `faction.secretary.addressedAs` for a secretary (the `addressedAs` change of §8.8 Q4: `apps/server/src/services/ruleBallot.ts` `secretaryCard` and `capitalCards`' `secretary.name`) or the councillor's stored name. **Client:** `whoseLine` (`packages/ui/src/components/RuleCard.tsx`) prints `rule.whose.partyCouncillor` when `via === 'councillor'`, else `rule.whose.party` (capital) / `rule.whose.branch` (home). The fixtures that print *Petra Holm* as `by` follow. |
| 3 | The capital ballot's hall header is 15 px shorter on phones 701–900 px tall | **A shorter line; the header keeps its 150 px everywhere.** *One vote · until Saturday midnight · votes and opinion in Eastside decide its seats · the party with the most seats city-wide gets its rule* (`copy.capitalElection.voteLine(district, until)`; 138 characters with the longest `until`, three Courier lines at 390 px where the old line took four). **The budget here was miscounted; the line still took four. Shortened in §8.10 Q1, which has the real budget.** The closed state (days 0–1) prints `ballot.votesFrom(city, weekday)` as at home. §4.2 now carries the line. | §8.8 Q2's reason, the other way round: the fold is one rule for every screen, and so should the header's height be. A capital-only header is a second rule a reader cannot see the reason for. The old line was the help note's sentence pressed into a plate line; a plate line has the home line's shape (*one vote · until · the consequence*) and leaves the explanation to the note. The new line also returns the deadline to the capital's plate, which the old one had lost. It is more exact than the old one, too: the district's votes and opinion decide the district's seats, and the rule follows the seats across the city, not the district's leader. | `BallotPage` (capital): the plate line → `copy.capitalElection.voteLine(districtName, formatUntil(closeAt))`; the closed state → `ballot.votesFrom`; the hall header back to `h-[150px]` with no capital branch. `qa.slice4.spec.ts` *the capital ballot on a short phone* and `capital.spec.ts` (the line in full) assert the new line. If the third card still ends under the sticky bar at 390 × 844 with three lines, report it; do not cut the header again. |
| 4 | `copy.help.more` is *More* | **Confirmed: *More*.** | One word, the reader's own; *Show more* and *The maths* would each add a word for nothing. | Nothing. |

Not a GDD change: wording only, no rule or number moves.

#### 8.9.2 Phase 5: what §5 leaves unwritten, settled here

Phase 5 is the paper, the chip, the help notes and the dev panel (tech design T11–T14). Everything below is either a string the developer would otherwise invent, or a choice two documents left open.

**The headlines (T11)**

1. **The count morning's city slot.** `hl.rule-won` / `hl.rule-fallback` (the Herald: `hl.ig.rule-won` / `hl.ig.rule-drawn`) and `hl.count` all fire at city priority 0 on the count morning. **The rule's headline leads:** `hl.count`, `hl.v.count`, `hl.a.count` and `hl.ig.count` move to **priority 1**; their words stay. §8.4's note that the Herald's count line names the rule (*{rule} · {seats} seats of 10*) is **withdrawn**: `hl.ig.rule-won` carries the rule and the seats, and the count line need not repeat them.
2. **`hl.filed` in four voices** is §8.4's (*{name} Stands for the Council* · *Rule: {rule}. Seats are counted {weekday} morning.*; the Sentinel, the Gazette and the Herald as written there). The `filedYesterday` facts gain `{rule}` (the candidacy's rule, by name) and `{weekday}` is **the count morning's weekday** (its only other user, `hl.struck`, is removed).
3. **`hl.nominations` in four voices** is §8.4's; `{until}` stays the close of names (days 0–1, as today).
4. **`hl.seat-lost-tie` (the Clarion)** deck → *Level with {last} on {votes}. The seat went on backers, then reputation, then who stood first. Candidates can put their names in again today.* The Sentinel's, the Gazette's and the Herald's tie decks name no order and stand.
5. **`hl.seat-won`, `hl.seat-top` and their voices** keep *with {votes} support*: `{votes}` is the count total (local support + 3 × backers), and *support* is still the word for it.
6. **`ordinanceFromToday` → `ruleFromToday`**, as tech §10. `hl.ordinance-city`, `hl.v.ordinance-city`, `hl.a.ordinance-city` and `hl.ig.ordinance-city` go (the rule now starts on the count morning, when `hl.rule-won` prints). `hl.local.rule` moves to `ruleFromToday`.
7. **The neutral local lines (`localHeadlines.ts`, `cityId: '*'`)**, reworded to the rule vote; conditions unchanged except #6:

| Id | Headline | Deck |
|---|---|---|
| `hl.local.count` | {city} Has a New Council | Seven seats counted overnight: {playerSeats} went to players, {npcSeats} to local candidates. The town's rule for the week was counted with them and runs from this morning. |
| `hl.local.voting` (day 2) | {city} Votes on Its Rule | Three rules on the ballot until {until}. Residents vote from the paper or at the Town Hall; everyone else reads about it here. |
| `hl.local.candidates` (day 0) | {city} Council: Names Go In | Names go in until {until}. Residents who are Known here and senior enough in their party can stand, naming the rule they would put to the town; the Town Hall has the list. |
| `hl.local.rule` | {ordinance} in Force in {city} | {plainLine}. Five days, everyone in town whatever their party; it is pinned in the Town Hall's lobby. (unchanged) |

8. **The paper's *Council rule* row** is `election.rowKicker` and the seven states; the dot on `vote`. **The front page** as §4.3. Nothing new to write.
9. **The rival edition's line** is `paper.localElectionV2` (§8.3), renamed `paper.localElection` at the swap.

**Always visible (T12)**

10. `plate.ruleChip(name, days)` and `me.rule(city, name, days)` are written; the placement is §8.1 Q6. Nothing new.

**Help notes and copy (T13)**

11. **`help.rule`** is `help.ruleV2` renamed, bound on the card's kicker, the hall's block 1, *How the vote works* **and the city plate's rule note**, where `help.ordinance(4, 7)` / `(6, 10)` still prints *passed by four councillors of seven* (`apps/client/src/routes/city.tsx` `plateNotes`); the weekdays come from the city's Election card view (`pollsOpenAt`, `countAt`), `capital` from `districts`. `help.ordinance`, `help.rule` (the old one-liner), `help.election`, `help.capitalElection`, `help.backers` and `help.localSupport` go.
12. **`help.pc` is reworded in place now** (this commit; the HUD and the Me tab print it); `help.pcV2` is the same text and goes. **`copy.pcSinks`** is reworded in place now: *Political Capital 35 · stand 10 · back a candidate 10*.
13. **Renames at the swap:** `election.v2.*` → `election.*`; `help.ruleV2` → `help.rule`; `paper.localElectionV2` → `paper.localElection`. `capitalElection.resultLine` stays for counts older than the rework (phase 4), so `resultLineV2` keeps its name.
14. **Removals.** §5.3's list, plus the keys the swap leaves with no reference. Known dead now: `seatGives`, `voteAnyone`, `localCandidatesLine`, `howElectionsWork`, `resultHeader`, `namesGoIn`, `seeTheSlate`, `turnout`, `theCouncilSits`, `councilCaption`, `voteRecorded`, `pollingDay`, `castYourBallot`, `castYourBallotFor`, `chooseAName`, `ballotCaption`, `ballotCastLine`, `youVotedFor`, `youEndorsed`, `onTheSlate`, `backedBy`, `localSupport`, `voteFor`, `tooLateToStand`, `ordinanceLine`, `ordinanceInForce` (the plate prints `plate.rule`), `hall.votedFor`, `hall.nextVote`, `hall.voted`, `hall.votedNothing`, `council.whatNow.lines`, `council.deskNext.votes` / `voted` / `runs` / `rose`, the old `election.*` states (`belowRank` … `noneOfThese`, `yourLine.*`), `capitalElection.kicker` (old), `votingIsOpenIn`, `twoSeats`, `went`, `capitalSeats`, `ballotLine`, `ballotLineV2`, `votesCast`, `howSeatsAreWon`, `factionProposal`, `sixVotes`, `partiesColumns`, and `help.pcV2`. The grep is the arbiter; a key still bound stays.

**The dev panel (T14)**

15. The two actions' words are in `copy.dev`: `seatMe` *Seat me* · `townVotes` *Votes for card 2 × 3* · `alreadySeated` *Already on the council here* · `notTheVote` *Only while the vote is on (days 2–4)*. The README's steps are the developer's.

**Server changes for phase 5, in one list:** `whose.via` and `addressedAs` on party cards (Q2 above); `filedYesterday`'s `{rule}` and `{weekday}` (#2); `ruleFromToday` (#6); `PoliticalFacts.rule` filled so the §8.4 templates fire (tech §10); the `hl.*count` priorities (#1).

### 8.10 Phase-5 questions settled (12 Oct 2026; the developer's four from commit `17f817e`)

Strings in `packages/content/src/data/copy.ts`; the developer binds or changes what the last column names.

| # | Question | Settled | Why | For the developer |
|---|---|---|---|---|
| 1 | The capital ballot's line is four Courier lines at 390 × 844, so the third card ends about 21 px under the sticky bar | **Shortened, deadline included; the header keeps its 150 px; nothing moves to the help note.** ***One vote · until Saturday midnight · votes and opinion decide Eastside's seats · most seats city-wide wins the rule*** (`copy.capitalElection.voteLine(district, until)`). It still says the four things: one vote; until when; the district's votes and opinion decide its seats; the most seats across the city wins the rule (the cards are the parties', so *most seats* is a party's). **The real budget:** the plate's text is 316 px wide at 390 px (the page's 16 px sides, the plate's 4 px and 1 px border, its 16 px padding) and Courier Prime at 12 px advances 7.2 px a character, so a line holds **43 characters**, three lines 129 at the most and about 120 after word-wrap. §8.9 Q3's *138* was a miscount. The longest case, *Government Quarter* with *Wednesday 02:00*, is 123 characters and wraps *One vote · until Wednesday 02:00 · votes* / *and opinion decide Government Quarter's* / *seats · most seats city-wide wins the rule* (40 · 39 · 42), one character to spare; every other district and deadline is shorter. The sentence and the five district names may not grow without re-measuring. | The fold is one rule for every screen (§8.8 Q2), so the 700 px rule is not extended to the capital; the header is one height everywhere (§8.9 Q3). Moving a fact to the help note would leave the plate saying less than the home plate does. The old line had two redundancies a plate line can lose: *in Eastside … its seats* (the possessive carries it) and *the party with the most seats … gets its rule* (the cards are parties' cards; *wins the rule* says the same in four words). *City-wide* stays: it is the one word that says the rule follows the whole city, not the district, and the help note's *across Irongate* is its long form. At 375 px wide (301 px of text, 41 a line) the worst district runs to four lines; under 700 px tall the header folds anyway, and on a 375 × 812 the third card's top edge still shows, which is the floor the developer measured. Accepted; the reference phone is 390 × 844. | `apps/client/e2e/qa.slice4.spec.ts` (*the capital ballot on a short phone*) and `apps/client/e2e/capital.spec.ts` assert the new line: `/^One vote · until .+ · votes and opinion decide Eastside's seats · most seats city-wide wins the rule$/`. **`qa.slice4`'s 390 × 844 check goes back to *every card above the sticky bar*:** at three lines the capital's plate is the home ballot's height (the home line also wraps to three at 43 columns: *One vote, secret and final · until Saturday* / *02:00 · the winner runs from Sunday for* / *five days*), and the home ballot fits (§4.2's fold table). The *last card's top edge* fallback was for the four-line state. If the measurement still puts the third card under the bar by a few pixels, report the number and keep the top-edge check; do not cut the header. Nothing else binds. |
| 2 | `election.days` and the other dead keys were removed, though §5.3 kept `days` | **Confirmed, all of them:** `ward`, `wardCandidates`, `theLine`, `electedMark`, `yourVote`, `passed`, `playersStanding`, `ballotSecretNote`, `election.days`, `election.ruleLine`, `election.seeTheCandidates`. Nothing comes back. | §5.3's *keep `days`* meant the day word must survive, and it does as the `daysN` helper every rule line uses (`plate.ruleChip`, `election.ruleNow`, `me.rule`, `rule.effect`); a second key for the same word is a trap. The top-level eight are the person ballot's words; where the rule ballot needs the same word it has its own key in the new blocks (`ballot.yourVote`, `ruleResult.passed`, `ruleResult.theLine`, `stand.playersStanding`, `stand.localCandidates`, `seats.localRow`). `ballotSecretNote`'s sentence lives in the vote modal's body (`politics.ts`: *Nobody can see who you chose.*), and the ballot's caption says *Secret and final*; `election.ruleLine` is `election.ruleNow`; `seeTheCandidates` is `seeWhosStanding`. §8.9.2 #14's rule stands: *the grep is the arbiter; a key still bound stays.* | Nothing. |
| 3 | The rule chip's row on the home plate | **Confirmed: the *Home city · {party} {share} %* row.** It is the home plate's kicker in all but name: the one caps line above the city's name, which is where §8.1 Q6 put the chip and where the district plate carries it. On rival ground, where that row's text folds under 700 px tall (QA m7), the chip stays and keeps the row's right edge and height; the row does not collapse. | The chip is for the moment the player is pulling tickets with the rule line folded away; it belongs on the line the eye reads first, beside the city's standing, not on the name (which is the tap target for the map) and not on the rival header (which is the push bar's). One row for every plate, so the chip is always in the same place. On rival ground the rule shown is the rival city's, which is right: a rule runs for everyone in the city whatever their party (§3.1), and the plate's own rule line says so when it is not folded. | Nothing to bind. One check: on rival ground under 700 px tall, the folded row must keep its height so the chip does not shift the name up (the 44 px box with negative margins should already do this). |
| 4 | The capital visitors' paper prints `hl.ig.rule-won` and `hl.ig.vote-open` where `hl.ig.ordinance-city` and `hl.ig.polls-open` printed | **Confirmed.** A visitor to the capital reads the Herald's city lines, as slice 4 and review 4 had it (ADR 0074); the rule's two city lines are the ones that replaced the old pair (§4.8, §8.9.2 #6, §8.1 Q12), so the visitor sees the same morning the resident does: on the count morning *{rule} Wins the Capital* (or *… on the Returning Officer's Draw*), on day 2 *The Capital Votes on Its Rule*. The rival edition's Courier notice (`paper.localElection`, §8.3) prints under it as before. | The rule a visitor reads about is the rule they will pull tickets under while they are there; the count morning is the morning to say so, and the Herald's deck already names every district. The old `ordinance-city` fired when the division passed, two days after the count; the rule now starts on the count morning, so `rule-won` is the same headline on the right day. `hl.ig.vote-open`'s *Your vote is secret* addresses a resident, as the old `polls-open`'s *Your vote is secret* did; the Herald speaks to its readers, and the rival notice beside it says who may vote. Not reworded. | Nothing. The personal lines (`hl.ig.your-rule-*`) are rightly excluded from a visitor's line (`personal: false`). |

Not a GDD change: wording only, no rule or number moves. §4.2 and §8.9 Q3 are corrected in place.

**For phase 6, in one list:** the two e2e regexes on `ballot-line` and `qa.slice4`'s 390 × 844 assertion back to *every card above the sticky bar* (Q1); the rival-ground chip's row height under 700 px (Q3, a check, not a change). Nothing else from §8.10 binds.

### 8.11 Phase-6 wording settled (12 Oct 2026; the developer's three questions from commit `f938d03`)

Strings in `packages/content/src/data/copy.ts`, `issues.ts`, `candidates.ts` and `ambitions.ts`; the developer binds or changes what the last column names. QA is testing phase 6 in parallel; nothing here moves a number, a rule or a screen's structure.

| # | Question | Settled | Why | For the developer |
|---|---|---|---|---|
| 1 | The capital ballot at 390 × 844 with a councillor's card: *the Alliance's rule · Councillor Ilse Brandt* wraps, and the third card ends 5 px under the sticky bar | **Shortened: the capital's three forms drop *'s rule*.** The secretary's card ***Vanguard · Organiser Stahl*** (`rule.whose.party`), a councillor's ***Alliance · Councillor Ilse Brandt*** (`rule.whose.partyCouncillor`), a shared card ***Collective and Alliance*** (`rule.whose.shared`, two crests). The home forms stand: *the branch's rule · Secretary Holm* · *Councillor Anna Weiss's rule* · *your rule*. The title stays and nothing splits a name (§8.9 Q2). **The budget:** the whose line is 281 px wide at 390 px (the page's 16 px sides, the card's 1.5 px border and 12 px padding, the 24 px radio and its 12 px gap, the crest and its gap) and Courier Prime at 11 px advances 6.6 px a character, so a line holds **42 characters**. *the Collective's rule · Councillor* left 8 for a name; *Collective · Councillor* leaves **18**, which is one line for every name in the fixtures and most a player types. A longer name wraps and the card grows one Courier line, which is the card's normal behaviour: not truncated (a name on a ballot is the player's), and not reported again. | Accepting it would have made the wrap the common case, not the edge: once players hold seats, most capital cards are a councillor's, and any name over seven characters wrapped. Truncation cuts the one thing on the line that is the player's. Shortening the councillor form alone would have put two shapes on one ballot. What *'s rule* said on the capital's line is said twice already: every card on the capital's ballot is a party's (the plate line, the help note), and the crest sits on the line. At home the possessive does a job (*the branch's rule* against *Councillor Anna Weiss's rule*) and keeps it. The abbreviation *Cllr* is out: labels are spelled out (player-facing simplicity). | `whoseLine` (`packages/ui/src/components/RuleCard.tsx`) is unchanged. `apps/client/e2e/capital.spec.ts` (line 243) asserts `${party} · Councillor ${leader}`; any assertion of *the {party}'s rule ·* on a capital card follows. `qa.slice4.spec.ts`'s 390 × 844 check: re-measure with *Ilse Brandt* on the ballot; with the line back to one row the third card should sit above the bar in both states, so assert *every card above the sticky bar* for both and record the numbers as before. If a fixture name longer than 18 characters is ever on that ballot, the top-edge check is the one to keep. `hall.partyCardSet`, `election.partyCardSet` and `council.whatNow.rule.capitalChosen` are sentences, not the whose line, and do not change. |
| 2 | The home plate's kicker row on short phones: the chip *LONG SERVICE ORDER · 4 DAYS* (155 px) leaves *Home city · Collective 70.0 %* about 85 px, which wraps to three lines and grows the plate 32 px | **Both halves lose a word under the fold's own query (an upright phone under 640 px wide and 700 px tall); nothing moves to a new row.** The chip prints **the rule's name alone**, ***LONG SERVICE ORDER*** (`copy.plate.ruleChip(name)` with no `days`; the signature is now `(name, days?)`), and the row prints **the crest, the party and the share**, ***Collective 70.0 %***: the words *Home city ·* (and *Close race ·* on the capital's district plate) fold with the rule line. The place sheet's chip, which has the row to itself, keeps *Long Service Order · 4 days*. The chip's aria-label keeps the days. No new string: the row's words are the client's own (`'Home city'`, `'Close race'`), and the chip's short form is the existing key with one argument. | A chip on its own row would put back the line the fold took out (§8.1 Q6 put the chip beside the kicker so the plate keeps its height on the phones the fold is for). Dropping the share alone does not fit (*Home city · Collective* is still about 140 px against 85), nor does the full chip beside *Collective 70.0 %* (about 104 px against 85). **The budget:** the row is about 248 px at 375 and 233 px at 360; Oswald caps at 9.5 px run about 5.3 px a character (155 px less the chip's 12 px padding, over 27). The chip's name alone is 107 px for *Long Service Order* and **123 px for *Public Meetings Order*, the longest**; *Collective 70.0 %* with its crest is about 104 px, and *Collective* is the longest party name. The usual pair (219 px) fits both phones; the worst pair (227 px) fits at 375 and is within a few pixels at 360, where it may go to two lines (*COLLECTIVE* / *70.0 %*). Accepted there: one caps line, not three, and never a truncated rule name. The days are not lost to the player: the Me line (*Coalport · Long Service Order · 4 days left*) and the hall's *The rule in force* carry them, and the chip's tap opens the hall. *Home city* is not lost either: the kicker reads in full on every phone taller than 700 px, and the Me tab and the nation card say whose home the city is. | **`RuleChip`** (`packages/ui/src/components/RuleCard.tsx`): the visible text is `copy.plate.ruleChip(name, short ? undefined : daysLeft)` (a `short` prop, or `daysLeft` optional); the aria-label stays `copy.plate.ruleChip(name, daysLeft)` + *The rule in force*. **`city.tsx`** `ruleChip(testId, folded)`: the plate's chip (`folded`) is the short form; the sheet's chip (`kickerAside`) is not. The kicker row (`data-testid="city-plate"`): the first span (*Home city* / *Close race*) gets `[@media(max-width:639px)_and_(max-height:700px)]:hidden`, and the second span's `before:` dot goes with it under the same query (`…:before:content-none`), so no dot dangles before the party. The row keeps `flex-wrap` as the fallback for the one worst pair. The rival-ground fold (QA m7) stands as it is: the whole row's text folds there and the chip keeps the row's height. **Tests:** `voting.spec.ts` (lines 407 and 414) at 375 × 667 expect the plate chip `^{name}$` and the sheet chip `^{name} · 5 days$`; `qa.slice5.spec.ts` m7's chip assertion follows if it reads the text; add one check at 375 × 667 and 360 × 640 on the home plate that the kicker row's height is one caps line (within 1 px of 14.25) with *Long Service Order* in force. The 412 × 915 and 390 × 844 phones are untouched (the rule line shows, the chip is hidden). |
| 3 | Content that still spoke of the old model | **Reworded, in the town's words.** `issues.ts` (the Esplanade curfew Issue, the Alliance's stance): ***No curfew without the town's vote, and the town has not voted for one.*** `candidates.ts` (Max Gruber, Garrison Hill): ***Magistrate's clerk. "No curfew without the town's vote."*** Ambition chapter 3 of *The Names on the Stone*: the teaser title is ***The ten marks*** (`ambitions.ts`; id and requirement unchanged, Rank 3); its script is re-strung in §8.11.1, superseding `slice-7-nation.md` §13's step 1, step 2 and the keepsake's name (the numbers stand); slice 7's note item 9 is closed by this. The keepsake `keep.deposit-receipt` keeps its id and is named ***Your receipt for ten marks***. **The grep** (division, proposal / propose, None of these, deposit, withdraw, order paper, council vote, endorsement as a gate, and also nomination, motion, struck, platform, abstain, polls open, put forward, on the slate) finds nothing else player-facing in the old model's sense. Left as they are, on purpose: *Minutes taken, proposal carried* and *The proposal carries* (the branch meeting's and the Debating Union's tier-1 texts in `coalport.ts`, `ashford.ts`, `duskwall.ts`, `irongate.ts`: a committee's or a debating society's proposal, not the council's); *struck off* (a mark on the record, the Heat system); *platform* (railway platforms and a speaker's platform); *abstain* (deputies in Parliament, slice 7's Unrest note); the phase ids `'nominations'` / `'polling'` (schema identifiers, never printed); `packages/content/test/review2.ts`'s old-to-new pairs (a test fixture). Two code comments are tidied (`ordinances.ts` *the ballot's card*, `schemas.ts` *the branch's rule, card 1 on every ballot*). | The council no longer votes; the town does, on its rule. An Alliance stance built on *a council vote* would teach the old model from an Issue card; *the town's vote* teaches the new one in four words. The chapter's story (the families' tin, whose ten marks, the branch's last candidate who talked to the hall and not the streets) is untouched; what changes is the mechanics the story leans on: the ten marks are the price of standing, paid and gone (no deposit, no refund), backers are a boost and not a gate (no *two names* needed), and a candidate names a rule and not a platform line. *The ten marks* keeps the chapter's concrete object as its title, as *The count* does for chapter 4. | Nothing to bind. No e2e asserts the stance, the clerk's line or the teaser title; `review5.opening.test.ts` (not run; no Vitest for now) reads the chapter when it is built. |

Not a GDD change: wording only, no rule or number moves. The GDD's lines that name *The deposit* and *Your deposit receipt* (§0's change table, §17.1, §21.4, the keepsake row) follow at the next GDD pass; the GDD's rule for standing (§15.4) already says *10 PC, spent when the name is printed, never returned*.

#### 8.11.1 Chapter 3 of *The Names on the Stone*, re-strung: *The list*

*(Titled *The ten marks* from 12 Oct 2026 until the fix round the same day; §8.12 #7 renames the chapter *The list* and its keepsake *Your line on the list*, and rewrites step 1's last sentence, the two choices and the Failure's last line. The script below is otherwise the one that stands.)*

Supersedes `slice-7-nation.md` §13's step 1, step 2 and the keepsake's name. Requirement, difficulty, Energy, rewards, flags (`fund-marks` / `own-marks`), the three ways and their checks, the art and the id all stand. Letters row: *From the families' tin* · *Your receipt for ten marks* · *Chapter 3 is ready · 15 Energy*.

**Step 1** · kicker *Ambition · The Names on the Stone · Chapter 3 of 12* · art `home-hq`
The families' tin on the hall's shelf: what three streets collected for the stone before the council said no, the forty names on the lid. The branch wants your name on the list by Tuesday. Printing it costs ten marks, paid and gone; the tin has ten.

| | Choice | Hint | Flag |
|---|---|---|---|
| A | Pay the ten marks from the families' tin | Their ten marks, for a seat that puts the names up. The branch will know whose they are. | `fund-marks` |
| B | Leave the tin and pay your own | The name on the list is yours. The tin stays shut. | `own-marks` |

**Step 2** · *Who stands behind you*
Nobody has to back you, and the branch's last candidate found out what that is worth: he stood alone and lost the seat on backers. The minute book says why: *talked to the hall, not to the streets*. You have the list, the branch's meeting at six, and three streets that knew the forty.

| Approach | Check |
|---|---|
| Ask the branch meeting to back you, from the floor | CHA+INT vs 16 |
| Name your rule, say what the stone has to do with it, and show it round | INT vs 16 |
| Walk the three streets with the list and ask the doors that knew the forty | best vs 16 |

CTA: **Find your backers · 15 Energy**

**Step 3** · the result
- Success — *Two backers, and a third* — Two by nine and a third by ten, an old docker whose boy is on the list and says so. The branch secretary stamps the receipt without looking up. Somebody has to say what the seat is for, so you do.
- Partial — *One backer, and the branch's* — One from the street and the branch's own, which the secretary says counts, this once. The receipt is stamped. The list gets a new line in your hand: *talked to the streets. Mostly.*
- Failure — *The hall, not the streets* — The meeting argues about the canteen for an hour and nobody puts a name to yours. You walk home with the receipt unstamped and ten marks in the same pocket. Tuesday is still Tuesday. The doors are still there.
- Knock-on lines: *Keepsake: Your line on the list* · *Chapter 4, "The count": from {date}, after a completed council term* (chapter 4's requirement is **a completed council term**, GDD §17.1 and `slice-8-life.md`; *after your first council seat* until 14 Oct 2026)

Every text is under 240 characters and four sentences. The keepsake comes on every outcome, as before.

**For the fix round, in one list:** the three capital whose forms in `capital.spec.ts` and the 390 × 844 re-measure (Q1); `RuleChip`'s short form on the plate, the kicker row's first span and its dot under the fold's query, and the two chip regexes in `voting.spec.ts` (Q2). Nothing from Q3 binds.

### 8.12 The fix round, wording half (12 Oct 2026; QA's report `docs/qa/voting-rework-report.md` at `ddf32f4`)

Wording only: no rule, number or screen structure moves. The developer fixes the code half in parallel; the last column names what binds. Decided and not reopened: **m3** (the count morning's order stays: personal lines and *While You Were Away* first, the rule headline leads the city section; §8.9.2 #1 reads that way) and **m8** (the east-of-UTC weekday and clock strings stand, per the review-4 clock decision).

| # | QA item | Settled | Why | For the developer |
|---|---|---|---|---|
| 1 | **M1**, the Unrest fallback called *the branch's rule* in the hall and the paper | **The headline names the card that won.** Each home paper has a fourth city line, `hl.rule-fallback-unrest` / `hl.v.rule-fallback-unrest` / `hl.a.rule-fallback-unrest`: ***Councillor {name}'s Rule Runs in Coalport*** · *No votes were cast, and the branch had no card: Coalport is in Unrest. {rule} runs until {until}.* (the Sentinel says *the committee had no card* and adds *Beacon House has noticed*; the Gazette adds *, Unopposed* and *The leader column wonders why*). The plain fallback keeps *Keeps the Branch's Rule*, now only when card 1 is the branch's. The hall's *The rule in force* uses the existing `copy.rule.how.fallbackUnrest(councillor)`; no new hall string. | The Election card and the result already say it right; the paper and the hall were the two surfaces that contradicted them, in the one state where the explanation matters most. | **Schema** (`packages/content/src/schemas.ts`): the `ruleDecided` condition takes `unrest?: boolean` and `tie?: boolean`; `votedRule` takes `tie?: boolean`. **Server** `ruleHeadlineFacts` (`politicsService.ts`): set `unrest` (true when the fallback card was a councillor's) and `name` (that councillor) on a fallback; the `rule-fallback` templates now match `{ fallback: true, unrest: false }`, so the fact must be present, not absent. **`RuleCard.tsx` `howWords`** `case 'fallback'`: pass the councillor and print `fallbackUnrest` when the card was not the branch's. |
| 2 | **m2**, plurals and ties | **Singular for 1, and a tie says so.** `copy.election.resultTie` and `copy.rule.how.tie` print `votesN(each)` (*1 vote each*). The decks no longer put *votes* after a number that can be 1: the winners' decks read *{votes} of {of} cast*, the loser's *{winner} took it by {winnerVotes} to {votes}*. **A tie has its own headline** in each home paper, `hl.rule-tie` (`hl.v.`, `hl.a.`): ***{rule} Wins the Vote in Coalport on a Tie*** · *Level at {votes} each; the first card takes a tie. In force until {until}: {line}.*, and a personal one, `hl.your-rule-lost-tie`: ***Your Vote Counted: {rule} Falls Short on a Tie*** · *Level at {votes} each, and the first card takes a tie: {winner}.* **The capital's seat tie settled on votes** has `hl.ig.rule-seat-tie` (***{rule} Wins the Capital on Votes, Level on Seats*** · *Backed by {parties}: {seats} seats of ten, the same as the runner-up, so the ballots decided.*), `hl.ig.your-rule-lost-tie` (***… Falls Short, Level on Seats*** · *Level at {seats} seats of ten; {winner} had more votes.*), and on the card and the hall `copy.election.resultSeatsTie` (*Rally Permits won · the Vanguard's, level at 5 seats of 10, more votes*), `copy.rule.how.seatsTie(party, seats)` and `sharedSeatsTie(a, b, seats)` (*the Vanguard's · level at 5 seats of 10 · more votes*). The draw keeps its own line. | A branch of one with one voter is the common early case, so *1 votes* would be the first result many players read. *Level* is the paper's word for a tie (the draw line already uses it); the card says *tie* because it also says the rule for one. | **Facts:** `tie` on `ruleDecided` and `votedRule` (home: the winner level on votes with another card; capital: level on seats, settled on ballots or opinion, `drawn` false); `rule-won` and `your-rule-lost` now match `tie: false`, so set it on every count. **Card and hall:** when the capital's `how` is `seats` and the seats were level, bind `resultSeatsTie` / `how.seatsTie` (and the shared forms) from a `seatTie` flag on the result; `resultSeats` and `how.seats` stand for a clear win. |
| 3 | **m5**, old-model words | **Reworded.** `headlines.ts` rank-up decks (three cities): *… vote: Coalport picks its council rule every five days, and the Council rule card says when.* `heraldHeadlines.ts` `hl.ig.rank-up-2`: *{rank}s vote on the rule, at home or, once registered, in the capital; the Council rule card says when.* `copy.help.residence`: *The town whose rule you vote on and whose council you can stand for, …* `copy.ranks.opens.vote`: *The vote on the rule every five days; …* `copy.errors.notYetVoter`: *You vote here from the next vote that opens.* `notYetCandidate`: *You can stand here when names next go in for the council.* `copy.residence.sheet.vote`: *You vote and stand in {place} from the next vote that opens ({weekday}).* **Two new keys** replace the client's own strings: `copy.errors.alreadyBacking(name)` *You're already backing {name} for this council.* and `copy.errors.alreadyStanding` *You're already standing for this council.* | Players vote on a rule and the card is called *Council rule*; *election* and *elects its council* taught the old model from the first rank-up. *For this council* names the thing the backing or the candidacy is for without a calendar word. Left as they are: *this election* on the capital's district-hero lines (`heraldHeadlines.ts` 126 and 327, `copy.contest.*`): the district contest is an election of seats. | `apps/client/src/features/game/errors.ts`: `ALREADY_ENDORSED` → `copy.errors.alreadyBacking(String(game.name ?? 'a candidate'))`; `ALREADY_FILED` → `copy.errors.alreadyStanding`. |
| 4 | **m6**, `NOT_POLLING` always *Voting has closed* | **Two forms:** `copy.errors.voteOpens(when)` *The vote opens {when}.* on cycle days 0–1, and `copy.errors.votingClosed` *Voting has closed.* after the count. | A stale tab on day 1 is told the truth and the time; the server knows which side of the window it is. | `errors.ts` `NOT_POLLING`: if the error carries `opensAt` (a number), `copy.errors.voteOpens(formatWhen(opensAt))`, else `copy.errors.votingClosed`. The server adds `opensAt` to `NOT_POLLING` on days 0–1 (the boundary into day 2), as `RULE_WINDOW_CLOSED` already does. |
| 5 | **m7**, a Recruit on the ballot page | **One line in place of the vote line:** `copy.ballot.belowRank(rank1, rank2, fxp)` *Recruits can't vote yet: 400 Party XP makes an Activist, and Activists vote.* (the faction's rank names, as the card's `election.belowRank`). | The card says it; the page the card leads to must say it too, or the page reads as broken. | `apps/client/src/routes/council.tsx`, the Rank 1 branch: print `copy.ballot.belowRank(…)` where the *One vote, secret and final* line goes, with the cards still shown and no button. |
| 6 | **m10**, the GDD | §15.3's calendar bullet rewritten (*standing* on days 0–1, the cards fixed at the boundary into day 2, *the vote* on days 2–4, the count the only scheduled event); §15.1's Chair row reads **25 PC, spent · no backers needed** (as §15.4). | — | Nothing. |
| 7 | *The ten marks* checked | **Renamed: chapter 3 is *The list*; the keepsake is *Your line on the list*** (`keep.deposit-receipt`, id kept). Standing costs 10 Political Capital, which is the party's credit, not money; a tin of marks cannot pay it, so §8.11's title and its step 1 misstated what is paid. §8.11.1 stands except: **the title**; **step 1's last sentence**, now *Printing it costs ten Political Capital, the branch's credit, spent and gone; the families' names on the lid are what you are standing for.*; **the choices**, now **A** *Let the three streets put your name forward* (hint: *Their names behind yours, for a seat that puts theirs up. The branch will know whose idea it was.*, flag `fund-marks`) and **B** *Put your own name forward* (hint: *The name on the list is yours alone. The tin stays shut.*, flag `own-marks`); **the Failure's** *and ten marks in the same pocket* → *and the list unsigned*; the keepsake line *Keepsake: Your line on the list*. Flag ids, checks, numbers and art stand. `ambitions.ts` carries the new title; the GDD's §0, §17.1 and §21.4 follow. | *The list* is the chapter's concrete object, as *The count* is chapter 4's: the branch's printed list of names, and the line on it that is yours. | Nothing now; the chapter is built with slice 7. |

**Keys for the developer, in one list:** `copy.errors.alreadyBacking`, `copy.errors.alreadyStanding`, `copy.errors.voteOpens`, `copy.errors.votingClosed`, `copy.ballot.belowRank`, `copy.election.resultSeatsTie`, `copy.rule.how.seatsTie`, `copy.rule.how.sharedSeatsTie`; the facts `tie`, `unrest` and `name` on the rule headlines; `copy.rule.how.fallbackUnrest` bound in the hall.
