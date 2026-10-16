# Slice 7 "The Nation": how to play it (16 Oct 2026)

Slice 7 is built, QA'd and fixed on branch `slice-0`. This page is for you to play it. It covers how to start, what is new, the dev panel's nation buttons, a 30-minute walk-through, what an account you already have will see, and the known limits. The playtest question is **does holding office feel powerful, and does losing it make players want to fight back?**

## How to start

1. Run `pnpm install` (once after pulling), then `pnpm dev:mem`. It starts the API, the client, the worker and an in-memory database, with the test hooks and the dev panel on.
2. Open <http://localhost:5173> and sign up (or sign in with an account from an earlier `pnpm dev:mem` run, if that database is still running).
3. The **Dev** button (dashed amber border, right edge, half-way down) opens the dev panel. The slice-7 buttons are listed below.

Stopping `pnpm dev:mem` resets its database and the clock. The clock is shared by everyone on your local server, and it only moves forward.

**Ranks 4 and 5.** The panel's *Boost me* stops at Rank 3. Standing for Chair needs Rank 4, and standing for Parliament or President needs Rank 5. To get there, open the browser's console on the game's tab (F12, then *Console*) and paste:

```js
await fetch('/api/test/character', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rank: 5, pc: 500 }) })
```

Then reload the page.

## What is new

- **Terms of 28 days.** Every office above the council runs for a term of 28 City Days, and every vote has fixed days in the term. Nothing needs you online at a set time.
- **The Governor** (*Mayor* in Irongate and Clearwater) is the top councillor of the largest bloc, if they have already served a full council term. The Governor chooses the party's rule card (card 1 on the town's ballot) and makes **the Address**: once a term, a speech that puts 50 points behind the party on one of the town's Issues.
- **The Chair** of each party is elected by the members. Standing costs 25 Political Capital and needs no backers. The Chair has a desk with four parts:
  - **Orders**: the party's daily orders and a push on one place.
  - **Lines**: the party's vote on each bill.
  - **Events**: call an event in any of the party's cities.
  - **Members**.
  Members can also vote the Chair out.
- **Parliament**: 60 seats. Players who win seats sit beside the local deputies; the locals vote the way the party tells them. A deputy can put one law to Parliament a term (50 Political Capital) and votes on every bill. A law passes with 31 of 60 votes, and a law that favours one party needs 36.
- **Laws.** There are thirteen laws, and at most five can be in force. A law in force changes the game for everyone: tickets and missions carry a *LAW · …* tag, the law book (`/parliament/laws`) lists the laws in force, and the paper prints them.
- **The President.** The President is elected by the republic and can propose one law a week, veto one bill a term, and make an Address. Parliament can remove a President.
- **The national election.** It is held in the last ten days of a term and takes four steps: names, the party's pick, the vote, the count. The result is *To be confirmed* first and *Final* at the next term.
- **Petitions.** Residents can sign a petition to **dissolve** their town's council.
- **Clearwater**, the second battleground: a town on the lake with seven council seats, the Casino as its hall, and its own paper, the *Clearwater Courier*.
- **The nation map** gains a strip across the top: who holds the republic and the laws in force. The republic sheet shows the five cities by their weight in the republic, and each city's pin shows a second line, such as *held by the Alliance*.
- **The Me tab** shows your offices and **the ladder**, the offices you can stand for and what each one needs.
- **The fix round** changed four things:
  - The law book now says who put each law to Parliament and the real vote (*put to Parliament by Organiser Stahl · passed Friday 40–0*).
  - A tap on the share bar under your city's plate opens the plate's notes again, and the bar can be reached with the keyboard. To make room, the plate is 12 px taller when the council rule is its last line.
  - A Mayor's front-page caption is now a content string.
  - The Chair's result never says more people voted than were on the roll.

## The nation buttons (dev panel)

| Button | What it does |
|---|---|
| **Term day 0 · 9 · 11 · 14 · 19 · 21 · 23 · 27** | Moves the clock to 09:00 UTC on that day of the term, then runs the cities' and the nation's days. The days are: 0 the result and taking office, 9 names for Chair, 11 the vote for Chair, 14 the Chair's count, 19 names for the republic, 21 the party's pick, 23 the republic's vote, 27 the provisional result. A day already passed means the next term |
| **Make me Governor here / Chair / a deputy / President** | You hold that office for the rest of the term, at once. Governor is for the council town you stand in, or your home town |
| **Give me the ladder** | Gives you completed past terms (councillor, Governor, deputy), so every office's *needs* is met apart from the Rank |
| **Table the secretary's bill now** | The parties' secretaries put their weekly bills now instead of on Monday |
| **Three test deputies** | Three Rank 5 test members of your party, seated in Parliament |
| **Test deputies vote For / Against** | Those deputies vote on the newest bill up for a vote |
| **My party leads by ten** | The next day's count puts your party at 40 and the others at 30 in the republic |
| **Three test residents sign** | Three copies of you in your town sign the open petition to dissolve the council |
| **Three test members back me for Chair / vote me Chair / vote my party / sign on the Chair** | Three new Rank 3 test members back you for Chair, vote you Chair, vote for your party in the republic, or sign the petition against the Chair. If something is refused, the line names why |

You will also use **Boost me**, **Level 10**, **Give 2,000 Iron**, **Next day**, **Skip to next phase**, **Refill Energy** and **Arrive now**.

## A 30-minute walk-through

Use a fresh `pnpm dev:mem`. Sign up and pick **Petra Holm** at the counter, so you are a Collective member in Coalport. Finish the arrival and go **To the city**. Follow the steps in order, because the clock only moves forward.

**0. Set up (3 minutes).**
1. In the panel, tap **Boost me**, **Level 10**, **Give 2,000 Iron** and **Give me the ladder**.
2. Paste the Rank 5 line from *How to start* into the console and reload.
3. Open the **Me** tab: the ladder lists every office and what it needs.

**1. Become Governor (4 minutes).**
1. Tap **Make me Governor here**. The Me tab shows *Governor of Coalport · term ends …* and the 20 Political Capital and 30 Party XP it pays each day.
2. Tap the card. On the Governor's page, under **The party's card**, tap **Choose the rule** and pick **Public Works Order**: it is card 1 on the town's next ballot.
3. Under **The Address**, tap **Speak on …**. The page says *Spoken*, and that Issue's bar moves for your party.
4. On the nation map, Coalport's card and the Town Hall both read *Governor: {you}*.

**2. Stand for Chair and win (5 minutes).**
1. Tap **Term day 9**. Open **Faction**, then the **Chair** chip, and tap **Stand for Chair · 25 Political Capital**.
2. Tap **Three test members back me for Chair**. Each backer adds 3 to your total.
3. Tap **Term day 11**. **Vote now** opens the ballot: you, then the party's secretary, last. Vote, then tap **Three test members vote me Chair**. Nobody sees the votes until the count.
4. Tap **Term day 14**: you now *Chair the Collective*. On the desk's **Orders**, pick three orders and a push, then **Set the orders**.
5. Tap **Next day**. Every member's orders read *Set by the Chair, {you}*. The orders repeat every day you are away.

**3. Put a law to Parliament and see it on a ticket (6 minutes).**
1. Tap **Make me a deputy**. Open `/parliament`, or Map → **Nation** → the strip's law chips → the law book. You see the chamber, the bills up for a vote and *Local deputies: n of 60*.
2. Tap **Put a law to Parliament · 50 Political Capital** and pick a law that is not in force, for example **People's Education Act**. It is now *up for a vote*, and the vote is held four days later. On the bill's page, vote **For** (your vote is public and final).
   - Optional: tap **Three test deputies**, then **Test deputies vote For**.
   - As Chair, you can also set the party's line on the bill in one tap.
3. Tap **Term day 19**, which is past the day of the vote if you put the law on day 15. If you put it later, tap **Next day** until the bill's page shows the count. The bill's page shows how each party's bloc voted and why. The locals follow the party's line, or the secretary's line if the town is in Unrest.
4. Tap **Next day**. The law is in force, and the law book reads *put to Parliament by {you} · passed {weekday} {for}–{against}*. A mission ticket now carries *LAW · People's Education Act*, and the paper's *The republic* section prints it.

**4. A national election in an afternoon (6 minutes).**
1. You are on term day 20; the names window covers days 19 and 20. On Map → **Nation**, tap the strip, then *The republic's election*. Tap **Stand for Parliament** (the party's list), or **Stand for President** with two laws you pledge to pass. You can withdraw a candidacy for President on days 19–20 and get the 100 Political Capital back.
2. Tap **Term day 21** and open `/election/pick`, the polling station. Choose the party's candidate. The party's figure is on the list too, *run by the game*.
3. Tap **Term day 23** and open `/election/national`. Tap **Vote for {name}**; your vote is secret and you get one. **Back · 10 Political Capital** adds a backer. Then tap **Three test members vote my party** and **My party leads by ten**.
4. Tap **Term day 27**. The result is *To be confirmed*, with the score table. Nothing changes in office yet.
5. Tap **Term day 0**. The result is *Final*: the front page, the President's page (`/office/president`), and `/parliament` with the players' seats. At no point did anyone have to be online at a set time.

**5. A petition (3 minutes).**
1. Tap **Skip to next phase** until the council is on cycle day 1. The Election card and the Town Hall offer **Petition to dissolve the council · 10 Political Capital**. `/council/petition` shows the signatures so far against the number needed.
2. Sign it, then tap **Three test residents sign**.
3. Tap **Next day** twice. The paper reads *Coalport Council Dissolved by Petition*. The rule in force runs out its days, the councillors' terms end unfinished, a local takes the chair, and the plate reads *Dissolved: local candidates sit until {weekday}*.

**6. Visit Clearwater (3 minutes).**
1. On Map → **Nation**, Clearwater reads *37 min · close race today*. Tap **Board · 20 Iron · 37 min**, then **Arrive now**. You see *You're on the lake* and the Casino's own picture. The Front's four places come in slice 8.
2. Optional: **Live here · 500 Iron** moves your bed to the Rows. Your party's orders then come from the lake branch, and the *Clearwater Courier* becomes your paper from the next day.
3. Make a canvass at the harbour, or a mission at the Tram Depot. At the council's count, the Casino seats seven councillors, and the hall reads *Mayor: {name}*.

## What an existing account will see

- A character made before slice 7 keeps everything it had. Migration 011 marks its old council terms and candidacies as council ones, so they count on the ladder. The republic and the parties' records are created on the first request after the update.
- The terms are counted from a fixed date, so an existing database starts partway through a term. Check the panel's status, or the nation strip's term line, for today's term day.
- In the first week, a figure of a party is President and Parliament is all local deputies. The parties' secretaries put bills on Mondays, so laws appear without any player in Parliament. Their law book rows name the secretary and the real vote.
- The nation map shows the strip, Clearwater and the pins' second lines. The paper gains *From the capital* / *The republic*. The Me tab shows the ladder, and your offices once you hold one.
- From Rank 4, the Faction tab shows the **Chair** chip and the **Officers** chat channel.
- A law in force shows on your tickets and results the morning it comes in. Laws never change Party XP or a check's odds.
- Being away costs nothing you own. Office pay builds up while you are away and is paid once, when you next open the game. The Chair's orders keep repeating.

## Known limits

- **A human playtest is still needed on whether Parliament reads clearly.** QA judged clarity only from the screens it opened. The law book and the ladder read well. Parliament is the hardest to follow, with three voices (players, the locals by the party line, the secretaries) and *one bill a term*. Its help notes explain it, but nobody has played it fresh. The national election's four steps were not walked through as a new player either.
- **QA did not test some cases.** These are double taps on the national election (stand, withdraw, pick, vote, back), the vote on the Chair, and the Chair's desk. They also include:
  - a removal vote at exactly 40 and 39;
  - an override of the veto;
  - the five-law cap and replacing a law;
  - a law that favours one party at 35 and 36;
  - the Rehabilitation Act's effect on the record;
  - the nation map at 390 × 844;
  - keyboard reach on the new screens.
- **Ranks 4 and 5 need the console line** above, because the panel stops at Rank 3.
- **The Chair's result line** shows the number of voters capped at the roll (fix round). The roll is counted over the last seven days, so jumping the clock can leave it short. When that happens, the votes in the table can add up to more than *n members voted*. This doesn't happen in real play.
- **The plate is 12 px taller** on an upright phone when the council rule is its last line. This gives the rule line a full-size tap target that doesn't cover the share bar. On a phone 700 px tall or less, the rule line folds away, so the plate stays the same height there.
- **The DEV pill** covers the end of a law's line on `/parliament/laws`. This only happens in the dev build.
- **The Front's four places** in Clearwater are later pins (slice 8).
- **Designer defaults to watch** (not your seven approved points): the removal at 25 % of the control share, standing orders that repeat, the party list ranked by backers, and the push for members below Level 10 ([[Open Questions]]).
