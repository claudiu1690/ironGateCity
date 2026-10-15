# Slice 6 "Together": how to play it (15 Oct 2026)

Slice 6 is built, QA'd and fixed on branch `slice-0`. This page is for you to play it: how to start, what is new, a 20-minute walk-through, and what an account you already have will see. The playtest question is **do players feel part of a team, and do they come back for the group's events?**

## How to start

1. `pnpm install` (once after pulling), then `pnpm dev:mem`. It starts the API, the client, the worker and an in-memory database, with the test hooks and the dev panel on.
2. Open <http://localhost:5173> and sign up (or sign in with an account you made on an earlier `pnpm dev:mem` run, if that database is still running).
3. The **Dev** button (dashed amber border, right edge, half-way down) opens the dev panel. Its **Together** block holds the slice's buttons (below).

Stopping `pnpm dev:mem` resets its database and the clock. The clock only moves forward.

## What is new

- **The Faction tab** (bottom bar): five parts. *Orders* (the party's orders, with the branch's daily event), *Events* (the board), *Members* (search, who is in the cells or on the ward), *Scoreboard* (this week and all time, by Level bracket) and *Chat*.
- **Campaign Events.** The branch does an event together: a Rally, a Doorstep Drive, Poster Night, and each party's own big event. A member of Rank 3 or above calls one 1 to 12 hours ahead at a fixed venue. Anyone else signs up for a named role (Rank 2 and above) or as a pair of hands (any Rank, 5 Energy, no roll). **Signing up is the commitment.** The event happens at its time whether you are online or not. Roles nobody took go to the branch's volunteers at half strength. The result waits for you as one modal and as a line in the next morning's paper. Events pay Party XP, XP and Political Capital, never Iron.
- **The branch's daily event.** The secretary posts one every day in each city. It settles at the day's turn, so a new player can join as a hand on day 1.
- **Chat**, live between browsers: Party, the city branch and Irongate. Mute and report only. Me → *Hide chat* turns it off.
- **Who is here now**: a venue or the event page shows who from your party was here in the last ten minutes.
- **Favours**: post a mate's bail from chat, the Members list or *In the cells now* (Iron from you, +10 Party XP); visit a mate on the ward for 3 Energy (not from rival ground); *Invite to the rally · 19:40* invites a mate to your soonest event with a place for them (review 7; was *Ask to join*).
- **The fix round's changes**: an unseen release from the cells now shows on any screen, not only on the map. *settles at 19:40* on an event card and the board's *anyone can join one* line are dotted labels: tap them for a short note. The paper prints swings as *+1* or *+0.8*.

## The Together buttons (dev panel)

| Button | What it does |
|---|---|
| **Three test members here** | Three Rank 2 test members of your party in your city (no login) |
| **Fill my event (roles / hands)** | The test members sign up to your soonest open event, in the named roles or as hands |
| **Start my event now** | Your soonest open event starts now; the next screen read resolves it and its result modal follows |
| **Rolls: All succeed / All fail / Random** | The rolls your soonest event uses when it starts (once) |
| **A member to the cells / to the ward** | A test member is taken in or admitted, so *Post bail* and *Visit* appear |
| **Give 2,000 Iron** | Review 7: Iron in your purse, enough to post bail |
| **A member says something** | A test member posts a line in your branch's chat |
| **Clear my chat limits** | Forgets the three-second and thirty-in-ten-minutes chat limits for you |

Other buttons you will use: **Rank 3** (or *Boost me*), **Next day**, **Refill Energy**, and **Cells now** / **Release now** for your own stay.

## A 20-minute walk-through

**1. Join an event as a hand (4 minutes).** Sign up as a new Collective member in Coalport and finish the arrival. The welcome edition's *Events* row names the branch's doorstep drive. Open **Faction**: it lands on *Events*, with the branch's event and **Join as a hand**. Tap it, then **Join as a hand · 5 Energy** on the event page: *Signed up · You're a pair of hands*. Tap the dotted *settles at …* on the card for what that time means. Then **Next day** in the panel: the next screen shows the event's result modal (the stamp, how each role went, the volunteers, your hands, the receipt), and the paper's *In Print* has the line.

**2. Call one (6 minutes).** In the panel, **Rank 3** and **Three test members here**. Faction → Events → **Call an event**: pick the Rally, a time and your role, then **Call it**. The branch's chat gets the line, and the board says *one at a time* until it is done. Then **Fill my event (roles)**, **Rolls: All succeed**, **Start my event now**: the result modal lists every member by name. Try the same with **All fail** or **Random** on a second event the next day (the panel's **Next day**) to see the other outcomes.

**3. Chat between two browsers (5 minutes).** Open a private window and sign up a second account. In the arrival, answer so you join the same party, and stay in the same city. Put both on Faction → **Chat**, city branch selected. A line sent in one appears in the other within a second or two, with no reload. A second line within three seconds shows the limit line under the composer (**Clear my chat limits** resets it). From the second account, open the first one's profile (Members) and **Mute**: their lines fold to *Muted · {name}*. Long-press a line on a phone (hover on a desktop) for **Report**.

**4. Bail a mate (5 minutes).** A new character has no Iron: tap **Give 2,000 Iron** in the dev panel's *Together* section first (review 7). Then **A member to the cells**. The chat gets *{name} has been taken in at … · bail {n} Iron* with **Post bail**, and their Members row turns red with the same button. Tap it and confirm: *Bail posted · {name} is out*, the Iron leaves your purse, +10 Party XP. Then **A member to the ward** and **Visit · 3 Energy** from the Members list.

To see your own release (the fix round): in the panel tap **Cells now**, then **Release now**, then open <http://localhost:5173/faction> directly (or reload while on the Faction tab). The release modal shows there first, and any event results wait behind it.

## What an existing account will see

- A character made before slice 6 keeps everything it had. Migration 010 adds the new fields (an empty sign-up list, chat settings, presence from the last action), and the scoreboard's *this week* is filled from the week's ledger, so your party's work this week already counts.
- The **Faction** tab appears in the bottom bar with a dot when an event result or a chat line for you is waiting. Chat starts empty; the branch's daily event is on the board the first time any member opens it.
- Unless the character is Rank 3, it cannot call an event yet. It can join one: a Rank 1 as a hand, a Rank 2 in a named role. **Rank 3** in the panel lifts it.
- If the character is in the cells or on the ward, the held screen now lists visitors, bail posted by a mate and your sign-ups, and the release modal shows on whichever screen you open next.
- Nothing is taken away for having been away: an event you signed up for resolves without you and its result waits as a modal.

## Known limits

- One modal per result, oldest first: the run-in, then the release, then event results, then *orders complete*. QA did not walk the run-in step or the orders-complete note in that chain (Open Questions S6-4).
- Withdrawing from an event is one tap and a line under the roles, no modal. You approved this.
- Test members have no login. To see the other side of chat or a sign-up, use a second real account in a private window.
