# Review 4 — design and copy answers (6 Oct 2026)

Answers to the twenty-five notes of `docs/review/2026-10-06-review-4.md` (part 1 of review 4, after slice 5). Each answer gives the decision, the reason, the exact player-facing strings, ids and numbers, and the screens affected. Every rule change is pinned in `docs/GDD.md` (§0, *Added 6 Oct 2026 (review 4)*) and in the section named; the pacing check is `docs/economy.md` §24; the slice design docs that are built (1–5) and those that change (6–9) carry a dated addendum, listed per answer and collected in §27. The plain-words rule (GDD §1.5) applies to every string here. **No code in this document; a developer builds from it** (§28, the fix list).

Three of the notes are already being coded in parallel (**5**, **12**'s tooltip bug, **22**, **24**, and the faces of **1**); their answers here say the intended behaviour and nothing else.

Nothing here adds a required tap to a session. The prologue loses two taps (8 from sign-up to the first result, was 11); the Town Hall is a pin like any other; the clock, the lock notes, the rank ladder and the help notes are read, not tapped.

| # | Note | Decision | Where |
|---|---|---|---|
| 1 | Faces alike | Done (five replacements, same file names); the sign-up grid shows **eighteen** faces | §1 |
| 2 | The prologue | ***The Last Train In***: three beats on a platform and a train; whom you help is your party; the favour is your first action | §2; GDD §7 |
| 3 | The paper on a wide screen | **A sheet on a desk**: max width 720 px, a frame and a shadow from 960 px | §3 |
| 4 | No clock | **A clock in the top bar**, the player's own time; **one countdown style** everywhere | §4; GDD §2.2 |
| 5 | Level-up line stale | Bug: after the point is placed the line reads the placed stat | §5 |
| 6 | *see the note* | Rewritten: *That's all three; Holm has a word for you when you close this.* | §6 |
| 7 | Travel | **The journey runs on the nation map**: a pin moves along the traced route (roads or rails; user, 7 Oct); cards fire at a point drawn at boarding; lazy and server-authoritative | §7; GDD §14.10 |
| 8 | Unassigned land in Irongate | **The five districts tile the whole picture**, river included, split along the river's middle; new outlines | §8; GDD §14.9 |
| 9 | Register or take a room? | **One button, *Live here***, with the plain why; **lodgings leave the residence card** and become a card at a place | §9; GDD §14.11 |
| 10 | Won a seat, now what? | **A *What now* card** on the front page and the first Town Hall visit; **a councillor's desk** | §10; GDD §15.3 |
| 11 | Rules invisible, no place | **The Town Hall is a place on every city map**: members, the rule in force in plain words, the order paper, the week's Issues; the rule line on the city plate says its effect | §11; GDD §15.3 |
| 12 | Heat | Bigger, a help note that says the state's effect and how to cool, the first-state card; the tooltip bug | §12; GDD §6.4 |
| 13 | Home orders while away | **One collapsed line**, *Your orders are in Coalport*, not tappable | §13 |
| 14 | *ISSUE* tag | A help note on the tag; the tag names the Issue | §14 |
| 15 | The duty officer | Kept | — |
| 16 | *You can close the game* | Removed everywhere; *Energy keeps refilling* stays | §16 |
| 17 | *Legal Aid* | A help note: the Alliance pays half of any member's bail | §17 |
| 18 | Reputation | Concrete: *three in a hundred more per step*; a ticket tag *Known here · better odds*; the card says the figure | §18; GDD §13.4 |
| 19 | Who is in prison | ***In the cells now*** on every police station's sheet (any party, name, until when); slice 6 adds *Post bail* on the Faction tab | §19; GDD §19.2 |
| 20 | No repercussions | **Three costs, no asset taken**: a longer minimum (20 min), **the day's orders are off**, **an arrest is always at least one mark** | §20; GDD §19.2, §11.2 |
| 21 | Home-city outlines | **Reversed**: home cities have no quarters on the map; one map, every surveyed place a pin, locked ones greyed with a lock and *Opens at Level 6*; only Irongate has districts | §21; GDD §14.13 |
| 22 | Orders for missions you can't reach | Bug and rule: **an order is offered only when the member can take at least one matching ticket today** | §22; GDD §13.7 |
| 23 | A paper per city? | **Your paper, printed in a local edition for the city you are in**: *The Coalport Clarion · Duskwall edition*; the Herald stays the capital resident's paper | §23; GDD §3.3 |
| 24 | Health hidden | **Always shown** on the HUD | §24; GDD §6.1 |
| 25 | Rank names | **The rank ladder** on the Party XP label and the Me tab: seven titles, the Party XP, what each opens | §25; GDD §5.4 |

---

## 1. #1 — The faces (done)

Five replacements were generated on 6 Oct 2026 under the same file names (`avatar-woman-20s-b/-c`, `avatar-woman-30s-c`, `avatar-man-20s-c`, `avatar-man-30s-c`), so nothing in content or the database changes. The sign-up grid shows **all eighteen** `mvp/avatars/*.png` (the review-4 guide already says eighteen; GDD §7.3 said six and is corrected). The face stays cosmetic (Appendix C #19) and changeable on the Me tab. Nothing else.

---

## 2. #2 — The prologue: *The Last Train In* (GDD §7, rewritten)

### 2.1 What was wrong

A dying father asking memory questions is a quiz with a corpse: six questions whose only purpose is to set numbers the player never sees, then a street with three recruiting posters. It is read as a test, it is the longest part of the first three minutes, and it has nothing to do with the game that follows (a city, a branch, orders). The user asked for an introduction that ends in a party and its orders.

### 2.2 The shape

Three beats, each **one screen, one choice, 2–3 lines**, saved as tapped (a closed tab resumes at the next beat), no number anywhere:

| Beat | Where | The choice | What it sets |
|---|---|---|---|
| 1 ***The platform*** | Irongate · Central Station · the last train in | **Whom you help**: the organiser's parcel, the steward's leaflets, the agent's signature | **Your party**, and so your home city; the favour becomes **your first action** |
| 2 ***The suitcase*** | The six o'clock to {city} · the compartment | **What you carry**: tools, books, or not much | **Your stats** (+6 to one, +1 to another) |
| 3 ***The lining*** | The same compartment · under the lining | **What he left you**: his ward book, his prison letter, the marker | **Your Ambition**; his coat, worn from here on |

Then the welcome edition, as today, and the first landing on **the HQ's pin with the favour's ticket highlighted** (§7.5 changes: the first landing was slot A's pin). **Taps from sign-up to the first result: eight** (name and face · beat 1 row and confirm · beat 2 · beat 3 · *To the city* · the favour's *Once*), was eleven.

**The face and the name** stay on the sign-up form (eighteen faces, §1). **The home city follows the party** (GDD §7.4 is unchanged: your faction decides where you start): the station you arrive at is the capital's, at night, and the morning train with the person you helped takes you to their town. Chosen over a free city choice because the three cities *are* the three parties' homes, and over "you arrive at your home city's station" because the party is not known until beat 1 is answered.

**The three people are the three secretaries.** Petra Holm, Viktor Stahl and Thomas Grey (portraits `holm`, `stahl`, `grey`) are already the voice of the orders on day 1; meeting them on the platform is why their signed line the next morning means something. Their established descriptions fit the asks: Holm is the Coalport branch secretary of a union party (the parcel); Stahl, the Duskwall district organiser, is a *Steward* of the movement in the party's own rank word (the leaflets; the user's *veterans' steward* is read as the steward of the ex-servicemen's club the Vanguard runs in Duskwall, and the row says *steward* only); Grey, the Alliance's agent, carries the Rooms' legal-aid papers (the signature; he is not called a lawyer, which he isn't). Alternative recorded in Appendix A: three new faces.

### 2.3 Beat 1 — *The platform* (`origin.step-platform`)

- **Art:** `mvp/scenes/station.png` (the man with one suitcase on the platform, the engine, the clock) · kicker ***Irongate · Central Station · the last train in*** · no portrait; the three rows carry the portraits.
- **Narrative:** *The night train empties onto a platform that smells of coal smoke and wet wool. One suitcase, nobody waiting. Three people are, in their way, and each wants two minutes of you.*
- **The rows** (`StoryScreen` rows, the portrait at 40 px at the left; the title in body 600; two Courier lines under it):

| Row | Title (the ask) | Line 1 | Line 2 | Effect |
|---|---|---|---|---|
| `holm` | **"Carry this parcel for me as far as the Coalport train. My hands are full and the porter's been bought."** | Petra Holm · union organiser · Coalport | Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence | `faction: collective` |
| `stahl` | **"Take a bundle. Hand them out on your way down the platform. The meeting is Thursday and this town forgets."** | Viktor Stahl · steward · Duskwall | Iron Vanguard · order, discipline and a strong hand · +3 Strength | `faction: vanguard` |
| `grey` | **"Witness a signature. A pen, your name, two minutes. His lease runs out at midnight and the office that stamps it opens at nine."** | Thomas Grey · agent · Ashford | Civic Alliance · elections, courts and a free press · +3 Intelligence | `faction: alliance` |

- **Under the rows** (Courier): *Whoever you help, you go with. Permanent: a Faction Reset token is the only way back.*
- **The confirm button** once a row is selected: ***Help Holm · the six o'clock to Coalport*** / ***Help Stahl · the six o'clock to Duskwall*** / ***Help Grey · the six o'clock to Ashford***. A row selects, the button commits (the mission briefing's pattern, so a brush is not a party).
- **Echo line** on beat 2: *You carried Holm's parcel.* / *You took Stahl's bundle.* / *You witnessed Grey's signature.*

The Vanguard row is reviewed against the content policy (§26): a steward, a meeting, a bundle of leaflets; no uniform, no march, no symbol; the party is named as the GDD names it (naming stays parked).

### 2.4 Beat 2 — *The suitcase* (`origin.step-suitcase`)

- **Art:** `art-direction/train-compartment.png` (exists; promoted to `mvp/scenes/train-compartment.png`, asset `scene.train-compartment`) · kicker ***The six o'clock to {City} · the compartment*** · portrait: the person helped (`holm` / `stahl` / `grey`).
- **Narrative:** *{Holm} dozes against the window before the viaduct. The suitcase sits between your feet, heavier than it should be. {She} wakes long enough to ask what a person carries to a new town.*
- **Answers** (one tap, final):

| Id | Text | Effect | Echo |
|---|---|---|---|
| `tools` | **Tools, mostly. I'm better with my hands than my mouth.** | +6 STR, +1 INT | You carry tools. |
| `books` | **Books. His, and a few of mine.** | +6 INT, +1 STR | You carry books. |
| `light` | **Not much. I travel light, and I run when I have to.** | +6 AGI, +1 STR | You travel light. |

### 2.5 Beat 3 — *The lining* (`origin.step-lining`)

- **Art:** the compartment again · kicker ***The same compartment · under the lining*** · portrait: none (the suitcase is the speaker).
- **Narrative:** *Under the lining, where he kept what mattered: his coat, folded small, and one thing more. Your father has been three weeks in the ground in the capital. This is what he left you to finish.*
- **Answers:**

| Id | Text | Hint (Courier) | Effect |
|---|---|---|---|
| `ward-book` | **His ward book.** | Two hundred names in his hand, and the seat he lost. | `ambition: finish-his-work` + `wear: outfit.fathers-coat` |
| `letter` | **His letter from prison.** | The Mill Fire of '19, and the word *innocent*, underlined twice. | `ambition: clear-his-name` + the coat |
| `marker` | **The marker.** | What he owed, to whom, and the Clearwater address. | `ambition: settle-his-debts` + the coat |

- **Then:** the welcome edition. The street screen, the faction cards and the father's *wish* are gone (the party is chosen; the +50 FXP seed with it: the favour pays its own Party XP, §2.6).

### 2.6 The favour: the first action (GDD §7.5, §13.7)

The favour is **slot B of the welcome set**, replacing the committee session on the welcome day only: the same type (`council`: a best-stat check, party work, Party XP at 1.5×, no opinion), **10 Energy**, difficulty 10, the *First day* +10 %. Only the texts change. It is a one-off welcome action at the HQ (`use: 'welcome'`), and the first landing opens the HQ's pin with it highlighted.

| Party | Order (`dir.welcome-b`, `dir.v.welcome-b`, `dir.a.welcome-b`) | Ticket title | Success (≤ 240) | Partial (≤ 240) |
|---|---|---|---|---|
| Collective | **Deliver Holm's parcel at the Union Hall** · *The parcel, to the hall, to whoever's on the door. Then come and find me; there's tea. — P.H.* | Deliver the parcel | The parcel is flyers, five hundred of them, and the man on the door counts them in front of you. "She said you'd come." He writes your name in the book under hers. | The man on the door is out and the parcel waits on a bench till he's back. He counts them twice and asks your name three times. It goes in the book, in pencil. |
| Vanguard | **Hand out Stahl's bundle at Beacon House** · *The rest of the bundle on my desk by noon; the first handful to whoever is at the door. Names, if you can. — V.S.* | Hand out the bundle | Twenty leaflets go into twenty hands on the steps of Beacon House, and the clerk inside takes the rest with a nod that is nearly approval. Your name goes on the list under Thursday. | The steps are empty at that hour and most of the bundle goes to the clerk unread. He enters your name in the day book and says Thursday, twice. |
| Alliance | **Witness the signature at the Assembly Rooms** · *Mr Albrecht's lease, the reading room, the pen on the desk. Your name under his, and the date right. — T.G.* | Witness the signature | The tenant signs, you sign, Grey blots it and holds it to the light. "That'll hold." The reading room has your name on a tenancy now, which is how the Rooms start people. | The tenant is late and nervous and signs on the wrong line; the second copy is the one that counts. Grey files it without comment and writes your name in the Rooms' book. |

Slot A (two attempts at a political action by the best stat) and slot C (*Take a job*) are unchanged. The welcome headline that named slot A's place (`docs/design/slice-2-onboarding.md` §7.2) now names the HQ and the favour: *Welcome to Coalport* · deck *…Holm's parcel wants delivering at the Union Hall; start there.*

### 2.7 Numbers (GDD §8.5, §7.2; `docs/economy.md` §24.1)

Starting stats are **5 each + beat 2 (+6 and +1) + the faction's +3**. **The reference recruit** (Collective, *books*, *ward book*) becomes **STR 8 / INT 12 / AGI 5 / CHA 5** (was 10 / 12 / 5 / 2): the best stat and every INT-based figure in the economy sheet are unchanged; STR drops two (the second stat's odds, the Fight power 17 → 15) and worn Charisma rises to the coat's 5 for everyone (the +150 Iron for refusing it, and the promised-coat keepsake, are gone; the faction's Tier I outfit is still given and sits in the wardrobe). The Vanguard and Alliance tuning characters are **STR 14 / INT 6 / AGI 5** (*tools*) and **STR 6 / INT 14 / AGI 5** (*books*) with CHA 5. **The flattest build** is now *light* in any party (best stat AGI 11, second 6–9): a 54 % home check on the AGI actions, the *First day* bonus making it 64 %. The CHA base 0–4 of the old answers is gone; CHA is worn only, as §8.2 says. No §5.2 milestone moves (§24.1).

### 2.8 The Ambition re-anchored (GDD §17.1)

The work is still **his**: your father died in the capital three weeks before you arrived; the suitcase is what he left; the three keepsakes of chapter 1 are the three things under the lining. *Finish His Work* keeps its twelve chapters and its ladder; only the openers of the three chapter 1s change so they no longer discover what beat 3 already found:

- *His ward book* (choose step): *The ward book, opened properly for the first time, on the hall's table: two hundred names in his hand, a tick or a cross against each, and the last page dated the week he lost his seat.*
- *The prison letter*: *The letter, read again in daylight: the Mill Fire of '19, his cell number, and the word innocent underlined twice in a hand that shook.*
- *The marker*: *The marker, flat on the table: what he owed, who to, and the Clearwater address written small, as if that made it less.*

The Letters row's *From your father's things* stays. The chapter titles, checks, rewards and hooks are unchanged.

### 2.9 Screens, art, content

- **Screens:** `StoryScreen` for all three beats (the origin's existing screen with rows); beat 1's rows carry a portrait; the confirm button pattern of the briefing. Resumable at `origin.step`.
- **Art:** `scene.station` (exists), `scene.train-compartment` (exists in `art-direction/`, to be copied into `mvp/scenes`). Optional, not blocking: a night variant of the station (§29).
- **Content:** `origin.ts` rewritten to three steps of one question each (the schema's `questions[]` of length 1; `effects` kinds `faction` (new), `stat`, `ambition`, `wear`); the `street` block removed; `reference` = `holm · books · ward-book`; the three welcome-B order templates and the three favour actions (`use: 'welcome'`, type `council`, 10 Energy) in `orders.ts` and `cities/*.ts`; the welcome headline's deck in `headlines.ts`; the three chapter-1 openers in `ambitions.ts`.
- **GDD:** §7.1–7.3 rewritten; §7.5 (the first landing and the taps); §8.5 (the reference recruit); §13.7 (the welcome set's slot B); §17.1 (the anchor); Appendix C #12 noted closed by removal, #19 kept.
- **Slice docs:** `slice-2-onboarding.md` (addendum: §1, §2, §5, §8 superseded by this section).

---

## 3. #3 — The paper on a wide screen

**A sheet on a desk.** The paper is set at a **maximum width of 720 px**, centred. From **960 px** of viewport the ground behind it is a desk: ink-2 (`#1c1a17`) with a soft radial vignette, and the sheet gets a frame: a 1 px ink line, a 3 px paper edge in paper-2, and a shadow (`0 24px 48px rgba(0,0,0,.45)`), so it reads as a newspaper lying on a desk, not a web page with margins. Under 960 px nothing changes. The HUD and the tab bar stay full width above and below the desk. Dark mode is not a thing here: the desk is dark on purpose, the paper is paper. No art is needed; if the user wants a drawn desk later, one wide ink-and-wash desk still (blotter, lamp base, a cup ring) would replace the vignette.

Also applies to the held screens, the council screens and any other paper-ground page on a wide screen: the same 720 px sheet on the same desk, so the game has one rule for "paper on a desktop".

Where: `apps/client` layout; `packages/ui` a `Sheet` wrapper. No GDD rule; a line in `slice-3-screens.md` §1 (addendum).

---

## 4. #4 — A clock, and one countdown style (GDD §2.2)

### 4.1 The clock

The top bar shows **the time** in the player's own clock, Courier 12 px, at the right of the Energy line on phones and in the HUD's first line on wide screens: ***14:22***. It ticks on the client from the server's clock (the dev panel's test clock included, so a jumped clock shows). The label is dotted; its note (`help.clock`):

> **THE CLOCK**
> The game runs on real time, shown in your own clock. The day turns at {dayTurn}; the map is dark from {nightFrom} to {nightTo}. Every time you read in the game is in this clock.

`{dayTurn}` is 00:00 UTC in the player's zone (*01:00* at UTC+1), the night window likewise (*21:00 to 07:00*). The dateline keeps the date; the clock is the time.

### 4.2 One countdown style (every string)

Every time a player reads is written one way, by how far off it is:

| How far | Form | Example |
|---|---|---|
| Under an hour | **in {n} min** | *ready in 24 min* · *out in 38 min* |
| Later today | **at {hh:mm}** | *ready at 14:40* · *Cool at 20:40* |
| Tomorrow | **tomorrow {hh:mm}** | *the council votes tomorrow 01:00* |
| Two days or more | **{Weekday}** (and the time where it matters) | *from Thursday* · *the result Sunday morning* |

A duration that is not a moment (the sentence's length, a term's days) is written as a count (*38 minutes*, *3 days left*). *By* is dropped (*Cool by 20:40* → *Cool at 20:40*). The strings that change: `held.*` (*out at* already; *{n} minutes to go* → *out in {n} min*), `heat` lines (*cools by* → *Cool at*), `again.*Needs` (*ready at* → the rule), the journey (*{n} min to go · arrives 14:22* → *arrives in 7 min · 14:22*), the Election card's countdown, the Jobs card's *paid at*. One helper, `copy.when(at)`, renders them all.

Where: `copy.ts` (`help.clock`, `when`); the HUD; every countdown string. GDD §2.2 gains the clock and the style.

---

## 5. #5 — The level-up line (bug; being fixed)

After the stat point is placed from the result modal's knock-on line, the line must change at once to the placed state: ***Level 2 · Intelligence 12 → 13*** (the stat in full), and the Me tab's dot goes off. The client re-reads the character view after the place call (as it does after an action), or applies the response. The line never again reads *place your point* once a point is placed; with two points waiting it reads *Level 3 · place your points (2)*.

---

## 6. #6 — *see the note* (copy)

The third order's signed line referred to the orders-complete modal, which the player had not seen yet. It now says what happens next, in each secretary's voice (`copy.orderSigned.*`, the `left === 0` case):

- Collective: ***Done, that one · +20 Party XP. That's the three; Holm has a word for you when you close this.***
- Vanguard: ***Order carried out · +20 Party XP. That's all three; Stahl's note follows when you close this.***
- Alliance: ***Ticked · +20 Party XP. Three for three; Grey has something to say when you close this.***

The modal itself is unchanged.

---

## 7. #7 — The journey on the nation map (GDD §14.10)

### 7.1 The rule

**User decision (7 Oct 2026):** the traveller is **a simple moving pin, not a train**. It moves along the route (the roads or rails traced between the two cities); no locomotive mark, no train art, no railway styling required.

A journey is **drawn on the nation map**. The map opens zoomed so the two cities are both in view, the painted railway between them is **traced** (a 2 px ink line with a paper halo over the painted rails, so the route reads at any zoom), and **your pin** (the same map pin as the city markers, in your faction's colour with a small ink ring, 20 px, with a Courier label under it: *To Coalport · in 12 min*) sits on the route at the point the clock says: `progress = (now − boardedAt) ÷ (arrivesAt − boardedAt)`, mapped onto the route's polyline by length. It ticks on the client once a second; the server is the authority, and the client only asks (as today). Everything else about a journey is unchanged: it leaves at the tap, it runs with the app closed, Energy refills, the paper and the political acts work, arrival is settled lazily by any read at or after `arrivesAt`.

**Routes are content**: `nation.routes[]`, one polyline per leg (Irongate–Coalport, Irongate–Ashford, Irongate–Duskwall, Irongate–Clearwater; 8–20 points in fractions of the nation picture), traced by the developer in the dev viewer along the painted rails (the halts and villages are scenery the train passes). A journey between two outer cities is the two legs joined, as the times already are.

### 7.2 The card fires on the way

**Where the card fires is drawn at boarding**, seeded with the card: a fraction `cardAt` uniform in **0.20–0.80** of the journey, stored as a timestamp beside the card. Until then the card is not shown; **from `cardAt` the card is shown** as a sheet over the map (the `JourneyCard` as today, the pin pulsing once), answerable until arrival or on the arrival modal; unanswered after that, it was slept through. Lazy and server-authoritative: the server returns `card.at`; the client shows it when its clock passes it; the answer is a call the server accepts between `cardAt` and the arrival's settlement, never before `cardAt`. Nothing is scheduled.

**Leaving and coming back:** the map shows the train where the clock puts it. If `cardAt` has passed and the card is unanswered, the sheet is open on return. If `arrivesAt` has passed, the first read settles the arrival and shows the arrival modal with the card inside it if still unanswered, exactly as slice 4 says. A player who never comes back is settled by the tidy job as before.

### 7.3 The screen (`/journey` → the nation map in journey mode)

1. **The map**, zoomed to fit the two cities with a margin, the route traced, the train on it, the other cities muted. Drag and zoom as always; a **Follow the train** chip returns the view when the player has dragged away.
2. **The plate** (top): kicker *THIRD CLASS · CAR 4*, Playfair *The 14:10 to Coalport*, Courier *arrives in 7 min · 14:22* (the §4.2 style), a 2 px track under it (kept: the same progress twice is fine, the map is the picture, the track is the number).
3. **The sentence** (body italic): ***You'll arrive either way, and Energy keeps refilling on the way.*** (#16: *You can close the game* is gone.)
4. **The card**, when fired: the sheet of §7.2; before it fires, nothing says a card is coming (the surprise is the point); when the journey drew none, nothing.
5. **While you ride:** the two rows (the Paper, the residence's Election row) in the plate's foot, as today.
6. **Arrival:** the arrival modal, unchanged, over the destination.

Desktop: the map full-bleed, the plate as a side sheet at 480 px.

### 7.4 What this replaces

The slice-4 journey screen (`slice-4-screens.md` §3) becomes this; the arrival modal (§4 there) is unchanged. The deck, the draw rule (the first journey always, then one in three), the rewards and the hostile deck's "always a card on the way in" are unchanged.

Where: GDD §14.10 (the rule, `cardAt`), `nation.ts` (`routes`), `copy.travel.*` (*arrives in 7 min · 14:22*, *Follow the train*), `slice-4-screens.md` §3 (addendum), `slice-4-battleground.md` §2.4 (addendum). Architect: ADR 0025's "in transit is the city you left plus the journey's status" stands; `journey.card.at` is new on the character.

---

## 8. #8 — Irongate's five districts cover the whole picture (GDD §14.9)

### 8.1 The rule

**Every point of the capital's picture belongs to exactly one district**, water included. The five are enlarged to tile the square (the user's preference; a sixth district waits, Appendix C #41). The split follows **the river's middle** between the northern three and the southern two, two lines from the river to the top edge between Old Town, the Government Quarter and Garrison Hill, and the existing line between Station & Market and Eastside carried north to the river and south to the bottom edge through the southern town (its spired church and domed hall to Station & Market, its glasshouse park to Eastside).

### 8.2 The outlines (`cities/irongate.ts` → `quarters[].outline`; fractions of the picture)

The river's middle, shared by every outline it touches: **(0, 0.37) · (0.20, 0.40) · (0.43, 0.43) · (0.50, 0.45) · (0.60, 0.47) · (0.62, 0.47) · (0.75, 0.49) · (1, 0.54)**.

| District | Outline (clockwise from the top-left) |
|---|---|
| **Old Town** | [0, 0] · [0.43, 0] · [0.42, 0.16] · [0.41, 0.28] · [0.42, 0.355] · [0.43, 0.43] · [0.20, 0.40] · [0, 0.37] |
| **Government Quarter** | [0.43, 0] · [0.70, 0] · [0.69, 0.14] · [0.71, 0.22] · [0.73, 0.30] · [0.74, 0.37] · [0.75, 0.49] · [0.62, 0.47] · [0.60, 0.47] · [0.50, 0.45] · [0.43, 0.43] · [0.42, 0.355] · [0.41, 0.28] · [0.42, 0.16] |
| **Garrison Hill** | [0.70, 0] · [1, 0] · [1, 0.54] · [0.75, 0.49] · [0.74, 0.37] · [0.73, 0.30] · [0.71, 0.22] · [0.69, 0.14] |
| **Station & Market** | [0, 0.37] · [0.20, 0.40] · [0.43, 0.43] · [0.50, 0.45] · [0.60, 0.47] · [0.605, 0.53] · [0.60, 0.58] · [0.585, 0.62] · [0.575, 0.64] · [0.53, 0.64] · [0.52, 0.70] · [0.50, 0.745] · [0.52, 0.85] · [0.53, 1] · [0, 1] |
| **Eastside** | [0.60, 0.47] · [0.62, 0.47] · [0.75, 0.49] · [1, 0.54] · [1, 1] · [0.53, 1] · [0.52, 0.85] · [0.50, 0.745] · [0.52, 0.70] · [0.53, 0.64] · [0.575, 0.64] · [0.585, 0.62] · [0.60, 0.58] · [0.605, 0.53] |

Checked against the pins: every pin lies inside its own district (the closest to a line are the Iron Bridge, 0.62, 0.50, 0.02 south of the river's middle at 0.62, 0.47, and the Bombed Blocks, 0.555, 0.62, 0.03 west of the Station & Market–Eastside line); the five anchors (§5.1 of `slice-4-screens.md`) are inside; shared edges are the same points in both polygons so the loader's "no overlap, no gap" check is exact; the new **City Hall** pin (§11, 0.57, 0.345) is inside the Government Quarter. The developer may slide points along the painted river in the dev viewer, keeping shared points shared.

### 8.3 Frames and the lock

The **frames** (the zoom targets at rest) stay as they are: the pins' box grown by 0.06, which is what keeps pins 44 px apart on a phone (`slice-4-battleground.md` §4.2's check). The **lock** changes in one respect: inside a district the player may **drag to the district's outline** (its bounding box), not the frame plus 10 %, so the whole district is reachable; the zoom-out limit stays the district's own view at rest. The overview draws the five outlines, which now meet edge to edge like a printed ward map, with the names on their hearts.

Where: GDD §14.9 (the frames table gains the outlines and the tiling rule; the "unassigned band" sentence goes); `slice-4-battleground.md` §4.2 and `slice-4-screens.md` *district lock* (addenda); Appendix C #41 reworded (a sixth district is a split of one of these, never new land).

---

## 9. #9 — *Live here*, and lodgings off the residence card (GDD §14.11)

### 9.1 What was wrong

Two buttons on one card (*Register in Eastside · 500 Iron*, *Take a room · 100 Iron*) for two unrelated things, both in system words. *Register* is a word from the rules; a room's benefit was a cap number.

### 9.2 Residence: one button, the plain why

The card's kicker stays ***WHERE YOU LIVE***. Its help note (`help.residence`):

> **WHERE YOU LIVE**
> The town whose council you vote for and stand for, whose paper comes first, and whose Party orders you get. Living somewhere else costs 500 Iron and a week between moves; everything you own comes with you.

The button is ***Live here · 500 Iron*** (`copy.residence.liveHere`). The states and lines, in words:

| State | Line 1 | Line 2 (Courier) | Button |
|---|---|---|---|
| Visiting, may move | You live in Coalport. | Live in Eastside instead: vote and stand here, and your orders come from here. A week between moves. | **Live here · 500 Iron** |
| Below Rank 2 | You live in Coalport. | {rank2}s can live in the capital. 400 Party XP makes a {rank2}. | none |
| In cooldown | You live in Eastside. | You can move again from Thursday. | none |
| On a ballot where you live | You live in Coalport. | You're a candidate in Coalport until the result · you can move from Sunday. | none |
| Short of Iron | You live in Coalport. | Live in Eastside instead: vote and stand here, and your orders come from here. | **Needs 500 Iron** (disabled) |
| Resident here | You live in Eastside. | Since Monday · you vote from Thursday · move again from Monday. | none |
| At home, resident elsewhere | You live in Eastside. | Live in Coalport again: vote and stand at home. | **Live here · 500 Iron** |

The sheet's lines (slice 4 §6.2) are kept with *Register* replaced: title *Live in Eastside · 500 Iron*; button **Live here · 500 Iron**; the modal's stamp ***Moved in*** (was *Registered*), headline *Eastside has a new voter* (kept), the Next line kept. *registered in {district}* in the vocabulary table (§1.5) becomes *you live in {district}*.

### 9.3 Lodgings: a card at a place, said as a bed

The paid room **leaves the residence card** and becomes a **Lodgings card** on a place, in the `JobsCard` pattern, with its benefit in words: kicker ***LODGINGS***, line ***A bed on the tram line · 7 nights · 100 Iron***, Courier ***Rested banks higher while you have it: up to 250 instead of 200.***, button ***Take a bed · 100 Iron*** (`outline`); running: *Your bed until Sunday · Rested banks to 250* with **Seven more nights · 100 Iron** while seven or fewer remain, else *renew from Monday*. Half price under *Eviction Notices* / *Rents in the Rows* (*50 Iron · Eviction Notices*). The rule (100 Iron, seven nights, cap +50, renewal adds to the end, at most fourteen paid) is unchanged; only where it lives and what it says.

| City | Place with the card | Why |
|---|---|---|
| Irongate | **Tram Junction** (`irongate.tram-junction`) | The room's own line is *a window on the tram line*; the Junction had a blurb and nothing to do |
| Clearwater (slice 7) | **The Rows** | Where the town's lodgings are; the Issue is *Rents in the Rows* |

The help note on *Lodgings*: *A paid bed for a week. While you have one, Rested banks to 250 instead of 200. Nothing else; your vote and your orders have nothing to do with it.* Slice 8's *Where you sleep* (the free room's +10 and the flat) is untouched: the flat is a home; lodgings are a bed; the cap takes the larger of the two as §17.4 says. The slice-8 string *Lodgings in {city}* was already this card's name.

Where: GDD §14.11 (the room paragraph: moved, reworded), §1.5 (*you live in*); `slice-4-screens.md` §6 (addendum: the card as above; the room row removed); `slice-7-nation.md` §9.4 (addendum: the Rows); `slice-8-screens.md` §9.1 (addendum: the residence card's second line is the free room / the flat only); `copy.residence.*`.

---

## 10. #10 — Winning a seat: *What now*, and the councillor's desk (GDD §15.3)

### 10.1 The *What now* card

On **the front page the morning of the win** (under the headline, above *To the council*) and on **the first visit to the Town Hall** during the term, a card in the Standing card's style, kicker ***WHAT NOW · YOUR FIVE DAYS***, three numbered lines and one button:

1. ***Put a rule forward*** *— today or tomorrow, 20 Political Capital. Or back one already on the paper.*
2. ***Vote on the rule*** *— one vote, before the council votes at {tomorrow 01:00}. The rule with four of seven passes and runs for five days.*
3. ***Draw your pay*** *— 10 Political Capital and 20 Party XP every morning you hold the seat, present or not.*

Button: ***To your desk at the Town Hall*** → the Town Hall's sheet (§11) with the desk open. In the capital the second line reads *six of ten*. Shown once per term (a flag on the seat).

### 10.2 The councillor's desk

The Town Hall sheet (§11) carries, for a sitting councillor, a block ***YOUR DESK*** before the public blocks: the order paper with the vote (the existing `UpForAVote`), **Put forward a rule · 20 Political Capital** (the existing `RuleMenu`), and a **Next** line in the political modals' style: *Next: the council votes tomorrow 01:00.* (days 0–1) · *Next: {rule} runs until Sunday; candidates put their names in from Thursday.* (days 2–4) · *Your vote is in: {rule}. The result is in tomorrow's paper.* After the council's vote the block shows the result stamp (*Passed* / *The council couldn't agree*). Nothing new is built; the council screen's parts move onto the hall.

Where: GDD §15.3 (*What the player sees*); `slice-3-screens.md` §2.2, §6 (addendum); `copy.council.whatNow.*`.

---

## 11. #11 — The Town Hall is a place (GDD §15.3, §14.9, §13.5)

### 11.1 The rule

**Every city's council hall is a location on its map**, kind **`town-hall`** (new in the closed list of §13.5), open from Level 1 whatever quarter it stands in, with one ordinary ticket and a sheet that is the public face of the council. Review 3 made the hall a backdrop (`council.hall`); it is now also a pin, and `council.hall` is read from the location's pin.

| City | Location id · name | Pin | Note |
|---|---|---|---|
| Coalport | `coalport.town-hall` · **Town Hall** | 0.525, 0.19 | The domed hall on the river; appended last in the city's list (§29 Q10) |
| Duskwall | `duskwall.town-hall` · **Town Hall** | 0.555, 0.55 | The tower hall on the Customs Market |
| Ashford | `ashford.town-hall` · **Town Hall** | 0.805, 0.275 | The survey's pin, lowered to review 3's point; was a teaser-quarter place, now open at Level 1 |
| Irongate | `irongate.city-hall` · **City Hall** | 0.57, 0.345 | The Government Quarter's seventh place (pins stay 44 px apart, §8.2) |
| Clearwater (slice 7) | `clearwater.casino` | as surveyed | The Casino is already a place; its sheet gains the council blocks |

**Blurbs** (≤ 200): Coalport *The dome on the river, soot on the stone and the council's clock a minute slow. Seven councillors sit here five days at a time, and the rule they pass is pinned in the lobby.* · Duskwall *A spire over a clock over a long cold front on the Customs Market. The council sits under the flags of the republic; the rule in force hangs in a frame by the door.* · Ashford *The clock-tower hall by the bridge, where the county has argued for two hundred years. The council's rule is printed and posted; the public gallery is free.* · Irongate *Baroque, copper-domed, between Parliament and the Opera: the capital's own council, ten seats from five districts, and the rule they can agree on, when they can.*

**The ticket** (one, tier 1, type `intelligence`, Intelligence, **6 Energy**, difficulty 10): ***Sit in the public gallery*** · *Watch and listen*. Success: *An hour on the hard bench above the chamber. Who sits with whom, who leaves before the vote, which clerk the chairman looks at. The minute book says less than the room.* Partial: *The gallery is cleared for a closed session after twenty minutes. You get the seating plan and the clerk's cold. The rest is in the paper tomorrow, if it's anywhere.* Rewards at the tier-1 intelligence rate (XP, Iron; no Party XP, no opinion). The same four texts in every city; the Irongate hall's texts say *ten seats*.

### 11.2 The sheet

Kicker *{n} · TOWN HALL*, the name, the blurb, then in this order:

1. **The ticket** (the place is a place).
2. **`YOUR DESK`** (§10.2) for a councillor here.
3. ***THE RULE IN FORCE*** · the rule's name in body 600, its effect in plain words from content, the days left: ***Reading Room Grant** · Studying costs a fifth less Energy everywhere in Coalport · 3 days left*; or *No rule in force · the council couldn't agree* / *· the council votes tomorrow 01:00*. Tap: the `ordinance` help note.
4. ***THE COUNCIL*** · the seven (ten) seats as rows, not tiles: avatar or crest, name, **`Player · Organiser`** or **`Local candidate · townspeople run by the game`** under it, *you* on your own, and after the council's vote *voted for {rule}*. The term's end: *Term ends Thursday*. The review-3 line under the locals stays (*Townspeople run by the game…*).
5. ***UP FOR A VOTE*** · the order paper read-only for non-councillors: item, who put it forward, its effect line, and the next vote's moment (*the council votes tomorrow 01:00* / *voted Tuesday: Reading Room Grant, 5 of 7*). Days 2–4: the result rows with the *Passed* stamp.
6. ***THIS WEEK'S ISSUES*** · the city's two Issues as the paper's rows (the Issue, every party's momentum, who leads); tap → the first tagged place.
7. **The Election card** (the same component as the city screen).

The council route (`/council`) stays and opens the same blocks on the paper ground; every path (the front page, the Election card, the HQ card, the Me tab, the hall's pin) lands on one state.

### 11.3 The rule is always visible in the city

The plate's council-rule line reads **the effect, not only the name**: ***Council rule: Reading Room Grant · studying costs a fifth less · 3 days left*** (tap → the Town Hall's sheet). The ten rules' plain effects (content, **`ordinances[].plainLine`**, ≤ 60; `effectLine` is the existing caps line with numbers on the order paper and stays; settled with the architect, §29 Q1): Public Works Order *jobs pay a tenth more* · Long Service Order *every day at the job counts double* · Street Permits *posters move opinion more* · Rally Permits *speeches cost 2 Energy less* · Reading Room Grant *studying costs a fifth less* · Rest Day Order *Rested banks to 250* · Open Doors *talking to voters comes off more often* · Street Register *every win counts twice for your reputation* · Street Fund *actions pay a quarter more Iron, jobs a quarter less* · Public Meetings Order *party work pays a quarter more Party XP* · Tram Subsidy *trains from here at half price*. The `ordinance` help note gains a line: *The rule in force is on the city plate and at the Town Hall.*

Where: GDD §15.3 (the hall as a place; the plate line), §13.5 (`town-hall`), §14.9 (the City Hall as a place), §14.13 (the hall is open at every Level); content: four locations, four tickets, `effectLine` on eleven ordinances, `council.hall` read from the pin; `slice-3-screens.md` §6 and §8 (addendum); `slice-4-battleground.md` §4.3 (addendum: the 30th place); `slice-7-nation.md` §9.2 (addendum: the Casino's sheet).

---

## 12. #12 — Heat (GDD §6.4)

- **Size and place.** Heat is a **line of its own** in the HUD under Energy, body 13 px (not Courier 11), ***Heat 60 · Hot*** with the state word in the failure colour for *Hot* and *Wanted*, **shown from 1** as before (a player who has never been noticed never sees it). On the Me tab the same line and the cooling moment.
- **The bug.** The Political Capital label opened Heat's note: the two labels share a `HelpButton` id; each label opens its own note (being fixed).
- **The help note** says the state's effect and how to cool (`help.heat`, replacing slice 5's):

> **HEAT · {state}**
> How much notice the police are taking of you. {stateLine} It cools five an hour on its own, faster under a Customs Strike; a quiet day clears it. Nothing you own is at risk from Heat.

`{stateLine}` by state: *Cool: nothing follows you.* · *Noticed (25 and over): run-ins are likelier and the police join them; a mission that goes wrong is likelier to cost a mark.* · *Hot (50 and over): the same, more so, and your name taken means the cells.* · *Wanted (75 and over): any mission that fails is the cells, no roll.*

- **The first-state card** (slice 5 §4.3) stays; its *Noticed* line gains *Cool at {time}*.
- **Where Heat comes from** is on the ticket already (*Heat +8*); the result's knock-on line reads *Heat +8 → 32 · Noticed · Cool at 20:40*.

Where: GDD §6.4 (the HUD sentence); `copy.help.heat`; the HUD.

---

## 13. #13 — Home orders while away

In any city but the residence, the orders panel is **one collapsed line, not tappable**: ***Your orders are in Coalport · 1 of 3 done*** (Courier, the panel's height 36 px, no chevron). On rival ground the line was *Your orders are in {city} today*; it is now the same line everywhere away. Tapping does nothing; the Faction tab (slice 6) and the paper still list them in full with their lines. Where: `copy.orders.away`; `slice-5-screens.md` §8.3 (addendum).

---

## 14. #14 — The *ISSUE* tag

The tag names the Issue and is tappable: ***Issue: Harbour Rates · opinion +50 %*** on tickets (already), and on the Places list and a place's sheet the short chip ***Issue · Harbour Rates*** (was *ISSUE*). Its note (`help.issue`):

> **ISSUE OF THE WEEK**
> Two things the town is arguing about this week, drawn Monday. Work tagged with one moves opinion half again and counts for your party on it; on Sunday night the party with the most work owns the Issue, gains three points here, and its effect runs for a week.

Where: `copy.help.issue`; the Places list chip; GDD §14.6 (the player's words, one line).

---

## 15. #15 — The duty officer (kept)

*"Name." He has it already. "Address." He has that too. He writes slowly, because he can.* stays, as do his other two lines. The voice is the model for the Town Hall's and the station's new strings: civic, exact, not unkind.

## 16. #16 — *You can close the game*

Removed from the cells, the infirmary and the journey. The sentences now read: cells ***The door opens at {time} either way, and Energy keeps refilling in here.*** · infirmary ***You're discharged at {time} either way, and Health comes back ten every ten minutes.*** · journey ***You'll arrive either way, and Energy keeps refilling on the way.*** The encounter modal's *If you close the game, it's left to luck.* stays: it is a warning, not an invitation. Where: `copy.held.*`, `copy.travel.youCanClose`; GDD §14.10, §19.2 (the sentences).

---

## 17. #17 — *Legal Aid: half price*

The line under *Pay bail* for Alliance members becomes ***Legal Aid · the Alliance pays half your bail*** (dotted), with the note (`help.legalAid`): *The Alliance runs a legal-aid desk in every town. Its members pay half of any bail, anywhere, as a matter of policy. The other parties have no such desk.* The same note on the bail sheet of slice 6. Where: `copy.held.legalAid`, `copy.help.legalAid`.

---

## 18. #18 — Reputation, made concrete (GDD §13.4)

- **The figure, once, in the help note** (`help.standing`): *How well {city} knows your face. Every win here counts: Familiar at 10, Known at 30, Trusted at 70, One of Us at 150. **Each step makes everything you try here come off three times in a hundred more**; you are {n} steps up. One of Us pays 1 Political Capital a day.*
- **The Standing card** gains the figure: *Faces nod. Everything you try in Duskwall comes off three in a hundred more often, from now on.*
- **A ticket tag** on every checked ticket in a city where the player is Familiar or better: ***Known here · better odds*** (the Reputation word), in the position of *Open Doors · better odds*. It says the bonus is in the odds word already shown.

The rule is unchanged (+3 % per level, §13.4). Appendix C #35 (no percentage for odds) stands: *three in a hundred* is the rule's size said once, and the ticket keeps its word. Where: `copy.help.standing`, the Standing card texts, `ActionView` tag; GDD §13.4.

---

## 19. #19 — *In the cells now* (GDD §19.2, §16.2)

Every **police station's sheet** (Harbour Police, the Lock-up, Ashford's Police Station, Police Headquarters, Clearwater's Harbour Police) carries a card ***IN THE CELLS NOW***: one row per player held there, **any party**: avatar, name, the party's small mark, ***out in 24 min*** (the §4.2 style). Being held is public (the paper prints it under *In Print*), so the list is not a leak; the record, Heat and bail are not shown. Empty: *Nobody. The duty officer is reading.* The viewer's own row reads *you*.

**Before slice 6** the card is read-only. **Slice 6** adds, on a faction mate's row, the ***Post bail · 150 Iron*** button (the same `FavourSheet` as the Members list), and the Members list's status line *in the cells at Harbour Police · out in 24 min* as designed. A list across the republic is not built: the Members list shows one's own party everywhere, and the station shows everyone here.

Where: GDD §19.2 (one sentence), §16.2 (presence: the cells list); `slice-5-screens.md` §6 (addendum); `slice-6-together.md` §9.1 and `slice-6-screens.md` §7 (addendum).

---

## 20. #20 — The cells cost more, and take nothing (GDD §19.2, §11.2, §13.7)

### 20.1 The decision

Three costs, each an opportunity or a rate, none an asset:

1. **A longer minimum.** The sentence is **20 minutes + Heat ÷ 2, at most 60** (was 10 +). A *Hot* player at 58: 49 minutes; ×1.5 on rival ground, still 60.
2. **The day's orders are off.** From the arrest to the day's turn the Party orders are **closed**: orders already done stay done and paid; open ones cannot be completed today; the +5 Political Capital for all three is unreachable unless already paid. The panel reads ***Orders off today · the branch heard about the cells*** and the paper's row the same; tomorrow's orders arrive as always.
3. **An arrest is always on the record.** The marks are **the type's, or one mark when the work carried none** (legal work, a run-in with the police lost on a speech or a watch): *taken in* is itself a mark. It is a minor mark (fades in fourteen quiet days); a second arrest within seven days is three marks for every arrest, as §11.2 already says.

### 20.2 What was not taken, and why

- **A Reputation drop**: Reputation never decays (§13.4) and its wins are earned; a drop would take an asset. Not taken.
- **A Party XP penalty**: Party XP is a total the player earned; taking from it is taking an asset, whatever the fiction (§4.3). The orders being off is the party's disapproval, said in the branch's voice, and it costs up to 60 Party XP and 5 Political Capital of **opportunity** a day.
- **A lasting mark beyond the record**: the record is the lasting mark; a second kind would be a second system.

### 20.3 The words

The cells screen's sentence gains a line: ***The branch has taken today's orders off the board.*** The release modal's knock-on lines: *Heat 58 → 25 · Noticed* · *−150 Iron · bail* (when paid) · ***Your record: taken in · 1 mark · On file*** · ***Orders off until the day turns***. The paper's `hl.cells` deck gains *; the branch took the day's orders off the board* where it fits under 200 (the Clarion's: *Taken in after {missionTitle}; {how} The duty officer wrote it down. Heat is back to 25; today's orders are off.*). The help note (`help.cells`): *A sentence of twenty to sixty minutes, by your Heat. Pay bail or wait; either way you walk out with Heat at 25, a mark on your record, and no Party orders until the day turns. Energy, the wage and the vote carry on without you.*

### 20.4 The economy (`docs/economy.md` §24.3)

For the day-10 reference player on the illegal road (about one arrest a week while *Hot*): ten more minutes is 5 Energy of regen (about 25 XP); the orders off cost 0–60 Party XP and 0–5 Political Capital depending on the hour (about 30 Party XP on average: a day of orders is 60, half done by the arrest on average), roughly **a sixth of a day's Party XP once a week, 2–3 %**; the arrest mark on legal work turns −10 % mission Iron on for a fortnight (about 40 Iron a day) where there was nothing. Rank 3 and Rank 4 move by less than half a day. Appendix C #50's lever is reworded: the base is now 20; if nobody pays bail, lower the base back to 10 before touching the orders.

Where: GDD §19.2, §11.2 (the arrest mark), §13.7 (orders off), §4.2 (the table: the cells row); `copy.held.*`, `copy.orders.off`; `slice-5-risk.md` §8 and `slice-5-screens.md` §6 (addendum); `headlines.ts` (`hl.cells` decks).

---

## 21. #21 — Home cities have no quarters on the map (GDD §14.13, reversed)

### 21.1 The rule

**A home city is one map.** The whole painted picture, every surveyed place a pin: open places as today; **locked places as greyed pins with a lock mark** and, on the Places list and the pin's sheet, one note: ***Opens at Level 6*** / ***Opens with a later edition***. No quarter outlines, no quarter bar, no overview, no quarter names on the picture, no teaser sheet. **Only Irongate has districts** (outlines, the lock, the tram bar), because there they are political units. Clearwater (slice 7) is a home-style single map too.

### 21.2 What quarters still are

A quarter stays in content as **the Level gate of a group of places** (`quarters[].level`, `quarters[].name`): the Places list is **grouped by quarter** with the group's lock line (*THE HARBOUR · opens at Level 6*), which is the one place the name is read, and the quarter's blurb opens from the group header. Frames and outlines are dropped from the home cities' content (kept for Irongate). The Level gates (1 / 6 / 10) and "a quarter never closes" are unchanged; the place the game sends you to (the cells, the infirmary) opens as before, and with it its group.

### 21.3 Where the map opens

As §14.13 says, less the quarter: the last pin viewed in that city; **the Town Hall's pin selected on arrival by train** (until the station quarters exist; it is the civic centre and every city has one); the HQ's pin with the favour's sheet open for a new character (§2.6). At rest the map is zoomed to the covering scale centred on that pin; free zoom and drag as always; the Places list names every place in pin order under its group.

### 21.4 The lock

A locked pin: the ink disc at 50 %, a small lock glyph in place of the number, no zoom on tap; the tap opens a short sheet: kicker *{QUARTER} · OPENS AT LEVEL 6*, the place's name, the quarter's blurb, *Level 6 opens it; you are Level {n}.* (the old teaser sheet's lines, on the pin). The Places row: the name greyed, *Opens at Level 6* in Courier. **A pin a locked place's sheet names is never reachable**, as before.

Where: GDD §14.13 (rewritten for home cities; the capital's paragraph stands), §0; `slice-5-risk.md` §2.1–§2.2 and `slice-5-screens.md` §3 (addendum: outlines, the bar, the overview and the teaser sheet withdrawn for home cities); `city-quarters.md` and `maps-v3-integration.md` (a dated note at the top: the overview and the frames are the capital's only); `cities/coalport.ts`, `duskwall.ts`, `ashford.ts` (`frame`, `outline`, `anchor` removed; `level`, `name`, `blurb` kept); `copy.map.lockedPlace`.

---

## 22. #22 — Orders that can be carried out (GDD §13.7; bug, being fixed)

**The rule:** a Party order is offered to a member only when **at least one ticket that matches it can be taken by that member today**, Energy aside: the place is in the residence city and open to them (its Level gate), and the ticket's own gates pass (Level, Rank, Reputation, the record, members-only). When a template fails the test the rotation takes **the next template of that slot** for that member; the welcome set and the crisis pair are exempt (they are built to pass). This is what "faction-wide among members who can do them" meant; it now has a test. The case seen: *Take on a mission anywhere in Ashford* at Level 6, where Ashford's missions on the Wharf need **Rank 3** (five of six) or a *Known* reputation, so a Level-6 Recruit had nothing to take; from now on that member reads the slot's next template, and the mission order first appears when a mission is open to them. The order's pin rule is unchanged (the first matching ticket the member may take). Where: GDD §13.7 (one sentence); `slice-5-risk.md` §12.2 (addendum).

---

## 23. #23 — Your paper, in a local edition (GDD §3.3)

### 23.1 The rule

**Every player has one paper**, the paper of where they live: *The Coalport Clarion* for a Coalport resident, *The Duskwall Sentinel*, *The Ashford Gazette*, ***The Irongate Herald*** for a capital resident, *The Clearwater Courier* for a lake resident. **It is printed in a local edition for the city the player is in**: the masthead carries the edition under the name in Courier (***The Coalport Clarion · Duskwall edition***), the dateline names the city (*Tuesday · 29 September · Duskwall*), and the paper's **local** parts are that city's while its **own** parts follow the player. In the home town there is no edition line. On a train the edition is the destination's.

**Rival ground** reads the same way: *The Coalport Clarion · Duskwall edition* (the user's own example), with the desk's *Where you are · Rival ground · Duskwall* row. The Herald is **no longer forced on visitors** to the capital (slice 4's rule reversed): a Coalport resident in Irongate reads *The Coalport Clarion · Irongate edition*. The Herald remains the capital resident's own paper, and theirs in Coalport is *The Irongate Herald · Coalport edition*.

### 23.2 Which parts are local, which follow the player

| Part | Follows the player (the paper's own voice) | Local (the city you are in) |
|---|---|---|
| Masthead, motto, the edition line | the paper | the edition line |
| Dateline | — | the city |
| **Headlines**: personal (*In Print*), the rank, the seat, the record, the cells | ✓ (stored at settlement, as now) | — |
| **Headlines**: ambient (`*.ambient-n`) | — | ✓ the city's ambient set, chosen at read |
| **Headlines**: city group (*Rival Callers*, morale, *Stands Firm*, the count) | ✓ for the residence city | ✓ **one** local line when the city has one that day, in the neutral wording the Herald uses (every city group template has a Herald form already; the home voice stays for the home city) |
| The Issues | the residence's two **second** | the city's two **first**, with momentum and who leads |
| The Election row | ✓ the residence's (actionable) | a Courier line under it: *{City} elects its council: voting until Saturday* (not actionable) |
| Party orders | ✓ | — |
| Letters | ✓ | — |
| Your desk | ✓, with *Where you are* when away | — |
| Events (slice 6) | the faction's events **in the city you are in** first, as slice 6 already says | — |
| From the capital (slice 7) | ✓ (one set of words in every paper) | — |
| While you were away (slice 9) | ✓ | — |

At most **three headlines** as now: the personal ones first (at most two), then the local line, then ambient.

### 23.3 Content and the print rule

Nothing new is written: the ambient sets exist for the four cities (Clearwater's with slice 7); the Herald's forms of the city-group templates exist. The edition's local parts are **live at read**; the own parts are stored at settlement as today, so an edition can still be reopened. The welcome edition is unchanged. `masthead.edition(city)` → *· {City} edition*; `help.edition`: *Your paper is the paper of where you live. Away from home it prints a local edition: the town's own news and Issues first, your party's voice throughout.*

Where: GDD §3.3 (mastheads: rewritten paragraph; slice 4's "visitors read the Herald" and slice 5's "a visitor on rival ground reads their own home paper" replaced by the edition rule); `slice-4-battleground.md` §12 (addendum), `slice-5-risk.md` §14 (addendum), `slice-7-nation.md` §11.3 (addendum: the Courier is the lake resident's; visitors read their own paper's Clearwater edition).

---

## 24. #24 — Health always shown (GDD §6.1; being fixed)

The HUD shows Health **always**, as a third thin bar under Party XP: label *Health*, *125 / 125* at the right, ink on the failure track. It no longer hides when full. The reason the rule was "only below full" (a player who never fights never sees it) gave way to the user's point: a bar that appears only when it matters looks like a fault. The Me tab, the encounter modal and the note are unchanged.

---

## 25. #25 — The rank ladder (GDD §5.4)

The Party XP label (HUD and Me tab) opens **the ladder**, a sheet: kicker *THE {FACTION}'S RANKS*, seven rows (title · Party XP · what it opens, in plain words), the player's row marked *you*, the next one *next · {n} more*. The Me tab's party card prints ***Activist · 1,212 / 2,000 to Organiser*** (the real figures: Activist from 400, Organiser at 2,000; §29 Q9).

| Rank | Party XP | Opens (plain words; the same in every party) |
|---|---|---|
| 1 Initiate / Recruit / Volunteer | 0 | The party's hall and its chat; a pair of hands at any campaign event |
| 2 Steward / Activist / Campaigner | 400 | **The vote** in every election; a named role at campaign events; backing a candidate |
| 3 Bailiff / Organiser / Agent | 2,000 | **Standing for the council**; calling campaign events; the harder missions |
| 4 Prefect / Convenor / Senator | 6,000 | **Standing for Chair** after a council term; the party strikes a mark off your record once a month |
| 5 Intendant / Delegate / Representative | 15,000 | **The party's list for Parliament** after a term as Governor or three on a council |
| 6 Guardian / Tribune / Speaker | 25,000 | **Standing for President** after a term in Parliament |
| 7 Keeper of the Gate / Chairman / Prime Minister | 60,000 | The title for life, and a line in the party's history |

The `fxp` help note is shortened to point at it: *What the party thinks of you, earned by party work and orders. Ranks give rights: tap for the ladder. {n} more to {next}.* Where: `copy.help.fxp`, `copy.ranks.*` (the seven lines); `RankLadderSheet`; GDD §5.4 (the plain-words column).

---

## 26. Content-policy check

The Vanguard row of beat 1 (a steward, a meeting on Thursday, a bundle of leaflets; *order, discipline and a strong hand*), Stahl's favour texts (*the clerk*, *the day book*, *Thursday*), the Sentinel's edition line and the City Hall blurbs carry no uniform, rank of the army, symbol, salute or slogan; *ex-servicemen's club* appears in this document only, not in any string. *Veterans* is not used in a string. The duty officer's lines stay civic. Checked against `docs/design/content-policy-review.md`.

## 27. Documents changed

| Document | Change |
|---|---|
| `docs/GDD.md` | §0 (*Added 6 Oct 2026, review 4*); §1.5 (*you live in*); §2.2 (the clock, the countdown style); §3.3 (editions); §4.2 (the cells row); §5.4 (the ladder in plain words); §6.1 (Health always); §6.4 (Heat's HUD line and note); §7 (rewritten: *The Last Train In*); §7.5 (eight taps, the favour); §8.5 (the reference recruit); §11.2 (the arrest mark); §13.4 (the figure said, the tag); §13.5 (`town-hall`); §13.7 (the favour as slot B; orders off; the "can be carried out" test); §14.6 (the Issue's player words); §14.9 (the tiling outlines; the City Hall as a place); §14.10 (the journey on the map; `cardAt`); §14.11 (*Live here*; lodgings at a place); §14.13 (home cities: one map, no quarters); §15.3 (the Town Hall as a place; the desk; *What now*; the plate line); §17.1 (the anchor); §19.2 (20 minutes; orders off; the list); Appendix C #12, #19, #35, #41, #50, new #90–#95 |
| `docs/economy.md` | §24 (review 4: the recruit, the favour, the cells' new costs, the lodgings' move; no milestone moves) |
| `slice-2-onboarding.md` | Addendum: §1, §2, §5, §8 superseded by §2 here |
| `slice-3-screens.md` | Addendum: the sheet on a desk; the Town Hall sheet; the plate line; *What now* |
| `slice-4-battleground.md` | Addendum: the outlines; the journey on the map; residence words; the 30th place; editions |
| `slice-4-screens.md` | Addendum: the journey screen; the lock's drag limit; the residence card; the Lodgings card |
| `slice-5-risk.md` | Addendum: home-city quarters withdrawn from the map; the cells' costs; the order test; editions |
| `slice-5-screens.md` | Addendum: Heat's line and note; Health always; the home map without quarters; the cells (the list, the sentences, the lines); the orders line away |
| `slice-6-together.md`, `slice-6-screens.md` | Addendum: *Post bail* on the station's list; the cells' Members status in the §4.2 style |
| `slice-7-nation.md` | Addendum: the Casino's council blocks; the Rows' lodgings; the Courier as the resident's paper; Clearwater is one map |
| `slice-8-life.md`, `slice-8-screens.md` | Addendum: lodgings beside the free room and the flat; the residence card carries no paid room |
| `city-quarters.md`, `maps-v3-integration.md` | A dated note: frames, outlines and the overview are the capital's only |

---

## 28. For the developer: the fix list

Ordered; each with *Done when*. Items marked **(in hand)** are being coded in parallel.

### Bugs

1. **(in hand)** Level-up line after placing the point (§5). *Done when* the knock-on line reads *Level 2 · Intelligence 12 → 13* the moment the place call returns, and the Me tab's dot is off.
2. **(in hand)** The Political Capital label opens Heat's note (§12). *Done when* each HUD label opens its own note, and a test asserts the pairing for every dotted HUD label.
3. **(in hand)** Orders that cannot be carried out (§22). *Done when* the rotation skips a template no matching ticket of the member's passes today, and a test gives a Level-6 Recruit in Ashford a slot-B order that is not `dir.a.mission`.
4. **(in hand)** Health always on the HUD (§24). *Done when* the bar shows at full Health on every screen size.

### Copy

5. *see the note* (§6). *Done when* the three `orderSigned` third lines read as §6.
6. *You can close the game* removed (§16). *Done when* no string in `copy.ts` contains *close the game* except the encounter's warning.
7. *Legal Aid* line and note (§17). *Done when* the cells screen and the bail sheet show the line and its note.
8. Reputation's figure in the note and the card; the *Known here · better odds* tag (§18). *Done when* a Familiar player's checked tickets carry the tag and the note prints *{n} steps up*.
9. The Issue chip and note (§14). *Done when* the Places list reads *Issue · {name}* and the chip opens the note.
10. The rank ladder (§25). *Done when* the Party XP label opens the seven-row sheet with the player's row marked and the Me tab prints *{title} · {fxp} / {next} to {nextTitle}*.
11. Heat's note by state (§12). *Done when* the note prints the state's line and *Cool at {time}*.
12. The councils' plain effect lines (§11.3). *Done when* every ordinance has `plainLine` and the plate and the hall print it.
13. One countdown style (§4.2). *Done when* `copy.when()` exists, every countdown string uses it, and a test finds no *by {time}* and no *{n} minutes to go*.

### UI

14. The clock in the top bar with its note (§4.1). *Done when* the time shows in the player's zone and follows the dev panel's clock.
15. Heat as a body line under Energy (§12). *Done when* the HUD shows *Heat 60 · Hot* at 13 px in the failure colour.
16. Home orders away: one collapsed line (§13). *Done when* the panel in another city is 36 px, not tappable, and reads *Your orders are in {city} · n of 3 done*.
17. The paper as a sheet on a desk (§3). *Done when* at 1280 px the paper is 720 px wide, framed and shadowed on the desk ground, and under 960 px nothing has changed.
18. *Live here* (§9.2). *Done when* the residence card reads the §9.2 table, the sheet's button is *Live here · 500 Iron* and the stamp *Moved in*.
19. The Lodgings card at Tram Junction (§9.3). *Done when* the residence card has no room row, the Junction's sheet has the card, and the rule (100 / 7 / +50 / renewal) is unchanged in tests.
20. *In the cells now* on the station sheets (§19). *Done when* a held player's name and *out in n min* appear on their station's sheet to any visitor, and the card is empty-stated.

### Features

21. **The prologue** (§2). *Done when* a new account plays three beats (platform, suitcase, lining), lands on the HQ pin with the favour highlighted, the favour completes slot B, the reference answers give STR 8 / INT 12 / AGI 5 / CHA 5 and *Finish His Work*, and the three chapter-1 openers read as §2.8. Content tests: `origin.ts` has three steps of one question, every text ≤ 240, the Vanguard strings pass the policy regex.
22. **Home cities without quarters** (§21). *Done when* Coalport, Duskwall and Ashford show one map with 15–17 pins, locked ones greyed with the lock and the note, the Places list grouped by quarter with its lock line, no overview, no bar, no outline; arrival by train selects the Town Hall's pin; Irongate is unchanged; `travel.spec.ts` and the slice-5 e2e are updated.
23. **The Town Hall as a place** (§11). *Done when* four `town-hall` locations exist with pins, blurbs and *Sit in the public gallery*, the sheet shows the desk (councillors), the rule in force with its effect, the council rows with *Player* / *Local candidate*, the order paper read-only, the week's Issues and the Election card; `/council` opens the same blocks; `council.hall` is read from the location.
24. **The *What now* card and the desk** (§10). *Done when* the card shows on the winner's front page and first hall visit of the term and the desk's Next line reads by cycle day.
25. **Irongate's outlines tile the picture** (§8). *Done when* the five polygons of §8.2 are in content, the loader asserts no gap and no overlap (shared points equal) and every pin inside its own, the overview shows the five meeting edge to edge, and the drag limit inside a district is the outline's bounding box.
26. **The journey on the nation map** (§7). *Done when* `nation.routes` has four traced legs, `/journey` shows the train on the line at the clock's position with the plate and the sentence, `journey.card.at` is drawn at boarding in 0.20–0.80 and the card sheet opens when the clock passes it (and on return, and in the arrival modal if unanswered), and the server refuses an answer before `card.at`.
27. **Local editions** (§23). *Done when* a Coalport resident in Duskwall reads *The Coalport Clarion · Duskwall edition* with Duskwall's dateline, ambient and Issues first and their own personal lines, orders, Letters and desk; in Irongate the same with *Irongate edition*; a capital resident reads the Herald everywhere with the city's edition line; the Herald is not forced on visitors; reopened editions still render.
28. **The cells' costs** (§20). *Done when* the sentence is 20 + Heat ÷ 2 (max 60), an arrest with no type marks adds one minor mark, the orders are closed until the day turns with the panel's line, and the release modal and `hl.cells` print the new lines; the economy test's cells figures are updated.

### Art (noir lithograph, the `mvp/scenes` style; checked against the folder)

- **Exists, reused:** `mvp/scenes/station.png` (beat 1); `art-direction/train-compartment.png` (beats 2–3; copy into `mvp/scenes` as `train-compartment.png`, 2688 × 1520 crop); the three secretaries' portraits; `event-town-hall.png` is an event scene and is not used for the hall.
- **New, wanted:**
  1. **`scene.town-hall`** — one council chamber for the `town-hall` kind (a horseshoe of desks under a clock, the republic's plain flag, a public gallery rail, a clerk's table with the minute book; no party colours), 2688 × 1520. Until it exists the map crop at the hall point stands in (the fallback ladder, §13.5), which is what the election screens already show, so this is not blocking. **Done 6 Oct 2026:** generated and saved as `mvp/scenes/town-hall.png` (a horseshoe of desks, the presiding chair under an arched window, the clerk with the minute book, the public gallery rail in the foreground; no flag drawn, so no device appears), and `train-compartment.png` copied into `mvp/scenes`.
  2. ~~The train mark~~ **Dropped (user, 7 Oct):** the traveller is a plain pin drawn by the client; no art needed.
  3. **The lock glyph** for locked pins (SVG, 12 px), and a lock variant of the pin disc.
- **Optional:** a night variant of the station scene for beat 1 (the text says *the last train in*; the existing picture is daylight through glass and reads well enough as early morning: the narrative says *the night train empties*, which the engine's steam and the lamps carry).

---

## 29. Settled with the architect (6 Oct 2026; `docs/tech/review-4.md` §23.1)

Twelve questions, each with the architect's default; eight take the default, three are written here (Q2, Q3, Q9) and one changes it (Q10).

| Q | Decision |
|---|---|
| 1 | **`plainLine`**, a new field on all eleven ordinances; `effectLine` (the caps line with numbers) stays where it is. **The plate and the hall both print `plainLine`; the hall adds nothing.** The eleven words of §11.3 are the plain lines, as written. GDD §15.3 corrected |
| 2 | **Six neutral local-line templates written** (§29.1), `cityId: '*'`, `group: 'city'`, read for the city the player is in. The Irongate edition keeps the Herald's own lines |
| 3 | **Eight headlines written** (§29.2) |
| 4 | **Default.** The act that got you arrested does not advance an order: the arrest is the act's outcome, and a progress line beside *Orders off today* would read as a contradiction |
| 5 | **Default.** The arrival modal's Herald line goes; the masthead's edition line says it |
| 6 | **Default.** A boundary always prints the time (*until tomorrow 01:00*, *until Saturday 01:00*); a day-granular line prints the weekday alone (*from Thursday*). GDD §2.2 gains the sentence |
| 7 | **Default.** The client receives `cardAt`, never the card, at boarding |
| 8 | **Default.** A two-leg journey divides the time by the legs' minutes, not by drawn length |
| 9 | **The real figures:** *Activist · 1,212 / 2,000 to Organiser*; the ladder's rows read the floors (0 · 400 · 2,000 · 6,000 · 15,000 · 25,000 · 60,000) and *next · 788 more* |
| 10 | **Append each hall last** (the architect's alternative): no pin renumbers, the map pins and the e2e specs stay, the hall's number is high and nobody minds (a hall is found by its name and its dome). On the Places list the hall sits **at the end of the first, open group** whatever quarter it is painted in (Ashford's is painted in Station Road, a teaser quarter, and must not be listed under a lock). §11.1's "pin 7" is withdrawn |
| 11 | **Default.** On a train the orders panel is the same collapsed line |
| 12 | **Default.** Away: personal (at most two) → the local line → the residence's city lines → the local ambient, capped at three. §23.2's "personal, then local, then ambient" meant this |

### 29.1 Q2 — The neutral local lines (`headlines.ts`, `cityId: '*'`, `group: 'city'`)

Conditions are the existing kinds, evaluated for **the city the player is in**; `{city}` its name, `{faction}` its home party (home cities only), `{plainLine}` the ordinance's plain words. Ids `hl.local.*`. The slot prints at most one, by priority. Every deck ≤ 200. The Herald's forms stay for the Irongate edition; a home city's own paper keeps its home-voice lines at home.

| Id | Priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.local.count` | 0 | `countToday` | {city} Has a New Council | Seven seats counted overnight: {playerSeats} went to players, {npcSeats} to local candidates. The council sits from this morning; its rule is decided within two days. |
| `hl.local.voting` | 1 | `phaseToday · polling · cycleDay 2` | Voting Open in {city} | {city} elects its council until {until}. Residents vote at the Town Hall or from the Election card; everyone else reads about it here. |
| `hl.local.candidates` | 1 | `phaseToday · nominations · cycleDay 0` | {city} Council: Candidates Wanted | Names go in until {until}. Residents who are Known here and senior enough in their party can stand; the Town Hall has the list. |
| `hl.local.rule` | 2 | `ordinanceFromToday` | {ordinance} in Force in {city} | {plainLine}. Five days, everyone in town whatever their party; it is pinned in the Town Hall's lobby. |
| `hl.local.rival-pressure` | 3 | `moraleLostToRivals · min 1` (home cities) | Callers from Other Parties on {city}'s Streets | The {faction}'s share of the town fell {lost} yesterday to visitors. The streets answer the door to whoever knocks. |
| `hl.local.morale` | 4 | `homeShare · min 0` (home cities) | {faction} Holds {city} at {share} % | The home party's share of the town this morning. Above 80 the branch is fired up; below 60 it is in trouble. |

In the capital and Clearwater (no home party) the last two never match. For Clearwater (slice 7) `hl.local.count` reads its seven three-way seats the same way.

### 29.2 Q3 — The outcome headlines (≤ 80)

| Action | Success | Partial |
|---|---|---|
| `coalport.union-hall.favour` *Deliver the parcel* | **The parcel, counted in** | **Counted twice, in pencil** |
| `duskwall.beacon-house.favour` *Hand out the bundle* | **Twenty hands on the steps** | **Thursday, twice** |
| `ashford.assembly-rooms.favour` *Witness the signature* | **"That'll hold"** | **The second copy counts** |
| `*.town-hall.gallery` / `irongate.city-hall.gallery` *Sit in the public gallery* | **From the hard bench** | **Gallery cleared** |

The bodies are §2.6's and §11.1's, unchanged.

### 29.3 Notes taken (`docs/tech/review-4.md` §24)

The schema limits raised in §4.1 are accepted; `{Holm}` / `{She}` / `{City}` are `{helper}` / `{helperPronoun}` / `{city}` with a `pronoun` on the three secretaries (Holm *she*, Stahl and Grey *he*); `pins.json` moves with `mapPins.ts` when a survey pin moves; the order test is the `offerable` predicate for every template, now and later. The alt text for `scene.train-compartment` (≤ 160): *A third-class compartment at dawn: wooden seats, a suitcase between two pairs of feet, a woman asleep against the window, fields going past.*


## Appendix A — The other prologue options (for the user to swap)

1. **The Burned Ballot Box.** You arrive the morning after a count was spoiled: a ballot box burned on the steps of the Town Hall. Three people are arguing over the ashes (the organiser says the mill-owners did it, the steward says the agitators, the agent says the count must be run again); whom you side with is your party, and your first action is the re-count's canvass. Strong politics on screen; weaker on *why you*.
2. **The Printing Press.** A basement press is being moved out before the landlord's men arrive; three parties each want it. Your first action is carrying a crate. Good for the Collective and the Alliance, thin for the Vanguard.
3. **The Bread Queue.** A ration queue at dawn, three people working it in three ways (a petition, a stewards' list, a leaflet); you take a place in the queue and someone talks to you. The quietest option and the most 1946; the favours are near-identical, which is why the platform was chosen.
4. **The By-election.** You arrive the week a seat fell vacant and the three parties are recruiting canvassers at the station; each hands you a card. Clean, but it is the old street scene with better lighting.
5. **Three new faces** instead of the secretaries for *The Last Train In*: a dock steward, an ex-servicemen's club steward and a reading-room volunteer, with their own portraits (three new 880 × 1168 portraits), handing you on to the secretary on arrival. Chosen against because the secretaries' line the next morning lands harder when you have met them.
