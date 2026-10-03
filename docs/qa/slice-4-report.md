# QA report: slice 4, "The battleground"

| | |
|---|---|
| **Build under test** | branch `slice-0` at `2d0d672` ("Slice 4 phase C: the screens"), plus the QA test files in §5 (uncommitted). During the session the branch moved to `a337c5c` ("Slice 5 design: Risk", docs only): see §6 |
| **Date** | 3 Oct 2026 (machine clock: Saturday, UTC+3) |
| **Tester** | QA agent |
| **Sources of truth** | `docs/GDD.md` (§1.5, §14.2–§14.6, §14.9–§14.13, §15.3, §15.10, §18.3) · `docs/IMPLEMENTATION_PLAN.md` slice 4 · `docs/design/slice-4-battleground.md` incl. §19 · `docs/design/slice-4-screens.md` incl. *the ground sash* and *the user's district lock* · `docs/tech/slice-4.md` incl. **Deviations (as built)** · ADRs 0025–0030 · `CLAUDE.md` |
| **Environments** | Vitest on the in-memory replica set (rules, content, db, server, ui), a real Agenda worker for `journey-arrive` · a private copy of the app (the built API on :3201 in memory mode with the test hooks, the Vite dev client on :5273 with tiles), driven by scratch Playwright scripts: about 70 screenshots and a DOM audit (unnamed controls, targets under 44 px, contrast, side scroll, odds maths) at 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 915×412, 812×375, 667×375, 412×915, 390×844, 375×667 and 360×640, a keyboard-only walk, a drag-to-the-limits sweep of the six capital maps and a frame-rate probe · the Playwright suite against the production build (`pnpm e2e`). The user's own `pnpm dev:mem` (ports 3001 / 5173 / 27018, started before this session) was left untouched |

---

## 1. Verdict

**Pass with issues. Nothing blocks the playtest, but fix M1–M3 before it.**

The server is solid. I tried hard to break it:

- **Boarding is once.** Five taps with five keys at once: one journey, 20 Iron once, `journeysMade` 1, one request log; the others are refused with nothing written.
- **The card is once.** Three answers at once (two keys for one choice, one for the other): one stored, rewarded once, the rest refused. Over 24 journeys through the API the passenger came first and no card repeated inside a round of seven; over 2,000 × 40 seeded journeys one trip in three drew a card (±2 %).
- **Arrival is lazy and the tidy job is harmless.** The job alone (no request) settles a journey once; a second run is a no-op; a real Agenda worker picked up a job the API scheduled twice (one job document) and settled it once. Two days later the player opens the game to the arrival modal with the card still answerable, in the Herald.
- **Closing the game mid-journey costs nothing.** Energy refilled on the train, the city was closed (`IN_TRANSIT`), and a ballot at home was cast from the train.
- **A move is one transaction.** Three Register taps with three keys at once: one move, 500 Iron once.
- **The capital's count is the GDD's.** 5,000 random districts: the three scores add to 100; 5,000 D'Hondt counts: the leader takes both seats exactly when it has more than twice the runner-up; 2,000 random ballots: two seated, each party's seats to its own best. In play, nine Alliance ballots in Eastside give w 45 and the Collective keeps the second seat; the tenth gives w 50 and the Alliance both. Ten seats, two a district, numbered by district. 5,000 random order papers: an item passes exactly at six of ten, and locals follow their own players.
- **The ledger adds up.** After ×3 actions by three parties, a journey card and three nights of drift, the rows for Station & Market equal its meter's change for every party, to the thousandth.
- **Issues behave.** 10,000 Monday draws: two, never last week's, from two districts. A ×3 tagged canvass adds each row's points. Six contributors: the top five get 4 Political Capital, the sixth nothing. A tie on points goes to the district's share.
- **Migration 006** over a mixed database (slice-3 documents beside slice-4 ones, an orphan candidacy, an election with no ballot) fills only what is missing, never touches a slice-4 value, and the second run changes nothing byte for byte.

In the real app the first trip, the arrival, the tram, Register, the vote, the count and Monday's Issues work in one tap and one modal each, with the keyboard too, and with no console errors. The clouds cost nothing measurable.

The problems are in three places:

1. **The capital's front door on a desktop.** The overview rests zoomed in. At 1440 × 900 two of the five districts are off screen (M1, the user's known item 1).
2. **One rule hole in the move.** A candidacy already on the ballot survives a move. The member can then win a seat in a city they no longer live in (M2).
3. **Layout on a phone held sideways and on short phones.** The tram bar's labels run into one unreadable line (M3); the ballot shows no name above its button (m6); the district map is a thin band (m7).

**Bug count:** blocker 0 · **major 3** · **minor 9** · **nit 8**.

---

## 2. Test plan followed

Legend: ✅ verified and correct · ⚠️ verified, bug filed · ➖ not verifiable here.

### 2.1 Travel (GDD §14.10, design §2–§3, ADR 0025)

| # | Check | How | Result |
|---|---|---|---|
| T1 | Times 12 / 12 / 15 / 25 in content equal the GDD table; Clearwater `later` | Content + GDD parsed | ✅ |
| T2 | Each faction home → capital → home: 12 (Coalport), 12 (Ashford), 15 (Duskwall) minutes each way, 20 Iron each | Server, three factions | ✅ |
| T3 | Who goes where: rival homes *rival ground*, Clearwater *no service yet*, both with no fare and `DESTINATION_LOCKED`; Level 9 `LEVEL_TOO_LOW`; `ALREADY_THERE`; `NOT_ENOUGH_IRON` | Server (QA + developer) | ✅ |
| T4 | Fares: 20; one halving 10; two 5; a third still 5 (the floor) | Rules + developer server test | ✅ |
| T5 | Five boards, five keys, at once → one journey, −20 once, one request log, the rest refused | Server | ✅ |
| T6 | One answer per journey under concurrency; the deck without replacement over 24 journeys; one in three over 80,000 draws | Server + rules | ✅ |
| T7 | Closing the game mid-journey: Energy 40 → refilled at `arrivesAt`; `city.get` refused; a home ballot from the train | Server | ✅ |
| T8 | Arriving while away: the job alone settles it once; two days later the modal waits with the card; the Herald | Server | ✅ |
| T9 | A real Agenda: two schedules → one job document; the worker settles once | Server (`agenda` + Mongo backend) | ✅ |
| T10 | Continue racing an answer on the arrival modal | Server, 30 races | ⚠️ **n1** |
| T11 | In the app: the first card's rows show an odds word and the stat, no percentage; the arrival modal (stamp, *Arrived*, the ground sash *Contested*) and Continue to Central Station | Scratch walk + e2e | ✅ |
| T12 | Keyboard: Tab to the Irongate pin, Enter opens its card, Enter boards, Tab + Space answers the card, focus on Continue, Escape is Continue | Scratch walk + e2e | ✅ |
| T13 | A double tap on *Board* → one journey, 20 Iron | e2e | ✅ |

### 2.2 Residence (GDD §14.11, design §7, screens §6, ADR 0026)

| # | Check | Result |
|---|---|---|
| R1 | The windows, for **every** city offset and 40 days: vote from the next cycle day 2 after today, stand from the next day 0, move in 7; registered on days 0–1, the vote is this cycle's | ✅ |
| R2 | Three taps with three keys at once → one move, 500 Iron once; the same key ×3 → the same modal ×3 | ✅ |
| R3 | Every refusal writes nothing; a *filed* home candidacy withdrawn, a home seat vacated to a local, the stipend stopped, moving back (developer tests, re-run) | ✅ |
| R4 | A candidacy **on the ballot** (the polls open) when the member moves | ⚠️ **M2** |
| R5 | The room: 100 Iron, renewal restarts the seven days, Eviction Notices 50 with the Issue named on the price line | ✅ |
| R6 | *Renew* on the day the room was taken | ⚠️ **m5** |
| R7 | The Rested cap follows the residence: Fever at St Agnes for residents only, + the room 300 (developer test) | ✅ |
| R8 | In the app: the card, the sheet's lines read before the tap, *Registered*, the card then *Resident here*; keyboard; a double tap → 500 Iron once | ✅ |
| R9 | The Me tab's *You live in …* line | ⚠️ **m8** (36 px target) |

### 2.3 The capital and its districts (GDD §14.2–§14.4, §14.9, §14.13; the user's district lock)

| # | Check | Result |
|---|---|---|
| D1 | Drift: 5,000 random districts: the sum stays 100.000, no party overshoots its baseline, a falling party moves its full 1 %, Neutral never under 5 | ✅ |
| D2 | Close race at 10.000 apart (yes) and 10.001 (no); control at 50.001 (yes) and 50.000 (no) | ✅ |
| D3 | Comeback: 300 random 60-day walks: it starts exactly when control is lost, +5 a day to +30, ends on retaking or after 14 boundaries | ✅ (n7: one comeback a district) |
| D4 | The ledger equals the meter (actions of three parties, a card, three nights of drift) | ✅ (n3) |
| D5 | Members-only HQs; 29 places, 62 actions; place tags in order (developer tests, re-run) | ✅ |
| D6 | The lock: the overview has outlines and names only, a district only its pins, the view held to its frame | ✅ (developer e2e, re-run) |
| D7 | **Never black past the art:** each of the six capital maps zoomed out with the wheel and dragged hard in six directions at 1440×900, 812×375 and 390×844: the art covers the map everywhere outside the opaque phone bands | ✅ |
| D8 | The overview at rest shows the five names | ⚠️ **M1** |
| D9 | The tram bar: one tap, keyboard reachable, 44 px | ✅ · labels ⚠️ **M3** |
| D10 | The district view on short phones | ⚠️ **m7** |
| D11 | The ground sash: *Contested* on Station & Market (a close race); a headquarters always its own party (UI fixtures); text contrast by eye | ✅ |
| D12 | **Clouds frame rate** (390×844 at DPR 2.6, CPU 4× slower, the dev build with tiles): the nation 60 fps at rest and dragging (≤ 2 frames over 25 ms in 4 s); the overview 58 fps; Eastside 56–57 fps (4–8 frames over 25 ms, worst 67 ms). With the clouds still (reduced motion), the same numbers: the slow frames are the tiles and the dev build, not the clouds | ✅ |

### 2.4 The capital's elections (GDD §15.3, §15.10, design §8)

| # | Check | Result |
|---|---|---|
| E1 | Who votes: a visitor votes at home (an Eastside name is `UNKNOWN_CANDIDATE`); an Old Town resident cannot use Eastside's list; any party's name on the voter's own list; a Rank 1 resident `RANK_TOO_LOW`; a new resident `NOT_YET_VOTER` (developer) | ✅ |
| E2 | Who stands: *Known* at home is not *Known* in Irongate (29 Irongate Successes refused, 30 stands); `NOT_YET_CANDIDATE`; `SITTING_COUNCILLOR` | ✅ |
| E3 | Backing: one a cycle in the city, across districts (`ALREADY_ENDORSED`); none from a member who lives at home (`UNKNOWN_CANDIDACY`, PC untouched); `WRONG_FACTION` (developer) | ✅ |
| E4 | The score and D'Hondt as properties (5,000 + 5,000 + 2,000 cases) | ✅ |
| E5 | The turnout weight in play: 9 ballots → w 45, 10 → w 50 and the second seat changes hands | ✅ |
| E6 | NPC fill: one Collective player standing → six names, Pavel Novak fills; three → seven names, no Collective local | ✅ |
| E7 | Ten seats, two a district, numbered 1–2 … 9–10 in district order, each district's parties as counted | ✅ |
| E8 | Ties on the returning officer's draw (developer, re-run) | ✅ |
| E9 | The division: ten locals 4 / 3 / 3 pass nothing; one player crossing the floor passes 7–3; 5,000 random papers | ✅ |
| E10 | Secrecy during the capital's polls (developer, re-run) | ✅ |
| E11 | In the app: *Voting is open in Eastside*, the ballot (six names, three parties), the modal, the count (five districts, the player's first, both tables, no side scroll at 360), *Ten seats · Vanguard 5 · Alliance 3 · Collective 2 · local candidates 10 of 10 · final* | ✅ |
| E12 | The ballot on a short phone | ⚠️ **m6** |
| E13 | The Herald's seat headlines | ⚠️ **m3** |
| E14 | *How elections work* in the capital | ⚠️ **m9** (draft text) |

### 2.5 Issues of the Week (GDD §14.6, design §9, ADR 0029)

| # | Check | Result |
|---|---|---|
| I1 | The draw: 10,000 Mondays in the capital, two, never last week's, two districts | ✅ |
| I2 | Points: Success the content Energy, Partial half up (10 → 5, 3 → 2, 12 → 6); a ×3 adds each row's | ✅ |
| I3 | Momentum guarded on `live` (developer boundary race, re-run) | ✅ |
| I4 | Resolution: most points; tie → the district's share; still tied nobody; no points → lapse (5,000 random); the top five 4 PC each, the sixth nothing; the effect for seven days | ✅ |
| I5 | Effects in play: tickets halved (developer), rooms halved (QA), Fever on the cap (developer) | ✅ |
| I6 | The Issues section: the residence's two first, then the rest; *New this week* on Monday; a row opens to its blurb, stances and *Where to act* | ✅ |
| I7 | A capital resident's *Speak on this week's Issue* order | ⚠️ **m2** |
| I8 | No Issue line names odds | ✅ |

### 2.6 Orders, the paper, settlement, the scoreboard

| # | Check | Result |
|---|---|---|
| P1 | Capital orders for a resident from the next day; `{issue}` resolved (developer, re-run; seen in the app) | ✅ |
| P2 | Order titles for a capital resident | ⚠️ **m1** (the user's known item 2) |
| P3 | The Herald for a visitor, and on the train to the capital (developer + QA T8) | ✅ |
| P4 | Hero and Issue awards credited once at the next settlement, on the desk, after three days away (developer, re-run) | ✅ |
| P5 | Scoreboard rank with ties to the earlier; heroes only at +0.5; brackets 15 / 16, 30 / 31 | ✅ |
| P6 | Close-race and first-arrival wording | ⚠️ **m4** |

### 2.7 Plain words, accessibility, layout

| # | Check | Result |
|---|---|---|
| A1 | No odds maths on the new screens (nation card, journey, arrival, Central Station's tickets, a district, the register sheet, the Issues): no *chance*, *roll* or *difficulty*; every percentage a reward or a share of opinion | ✅ (DOM audit + e2e) |
| A2 | No unnamed control on any new screen at any size | ✅ |
| A3 | Targets ≥ 44 px | ⚠️ **m8** (the Me tab's residence line, 36 px) |
| A4 | Contrast ≥ 4.5:1: the audit's hits were a disabled CTA (*Choose a name*), the *Arrived* stamp and the sash over the art, and a decorative `·`; each checked by eye | ✅ |
| A5 | No side scroll on any screen at 360 px | ✅ |
| A6 | Phone portrait, phone sideways, desktop | ⚠️ **M1, M3, m6, m7** |
| A7 | Short sessions (pillar 7): board 2–3 taps; a journey wholly in the background; a move 3 taps + Continue on a phone (a recorded deviation); a vote 2 taps + the CTA; nothing at a set time | ✅ |

### 2.8 Content policy and regressions

| # | Check | Result |
|---|---|---|
| C1 | The whole-content war sweep (with its two allowances) and the review-2 vocabulary test, re-run | ✅ |
| C2 | A wider sweep of the slice-4 content for victory, defeat, crush, march, banner, traitor, loyal, revolution, comrade, blood, struggle, occupation, leader, discipline… | ✅. Hits read: *a crush on the steps* (a crowd), *the stone, where tomorrow's leader is set* and *Leader-writer* (printing), *after the march, which is a tune* (a band on the Esplanade; the text says it is music), *Public works under discipline* (the Vanguard's stance, GDD §14.6's own words). Nothing to change; the designer may glance at the Esplanade line |
| C3 | Journey cards against the GDD's caps (45 / 6 / 0.05 / 10, 10 Rested, 100 Iron, only the parcel over 40); no card takes unstaked Iron | ✅ |
| C4 | Slices 0–3: the whole existing suite, including the earlier QA files | ✅ (§6) |

---

## 3. Bugs, ordered by severity

### Major

#### M1. The capital's overview rests zoomed in: on a desktop two of the five districts are off screen (the user's known item 1)

- **Where:** `packages/ui/src/components/CityMap.tsx`, in `fitPinsView` → `mostPinsClear` (l. 318–408) with `REST_MAX_SCALE` 1.5 (l. 264). The overview passes the five name labels as pins (`apps/client/src/routes/city.tsx` l. 695–713). The desktop corner plate (election card plus orders, about 450 px tall) is a *block* that no pin may sit under. No covering view keeps all five clear of it, so `mostPinsClear` picks the scale where a *drag* could bring the most pins clear, and that favours zooming in.
- **Steps:** Level 10, in Irongate, desktop 1440 × 900 → Map → the overview.
- **Expected:** screens §5.1 and the user's district lock: the whole capital zoomed out, covering the screen, five outlines with their names.
- **Actual** (names clear at rest; scale 1.0 = the cover scale):

  | Size | Rest scale | Names clear | Not clear |
  |---|---|---|---|
  | 1920 × 1080 | 1.00 | 4 | Garrison Hill above the top edge (the view is not centred on the districts) |
  | **1440 × 900** | **1.36** | **3** | **Old Town and Garrison Hill off screen** |
  | 1280 × 800 | 1.50 | 2–3 | Old Town, Eastside, Garrison Hill off screen |
  | 1024 × 768 | 1.00 | 4 | Old Town under the election card |
  | 768 × 1024 | 1.06 | 3 | Old Town, Government Quarter under the card |
  | 812 × 375 | 1.10 | 4 | Garrison Hill under the *Districts* button |
  | 667 × 375 | 1.00 | 4 | **Old Town's name over the Government Quarter's** |
  | 390 × 844 | 0.72 | **5** | — |
  | 375 × 667, 360 × 640 (paper unread) | 1.22–1.28 | 2 | Station & Market and Eastside under the orders, Garrison Hill off |

- **The best rest view** (measured by zooming out to the cover scale and centring on the five names' box, y 0.16–0.62):
  - 1920 × 1080: **5 of 5**.
  - 1440 × 900: **4 of 5**. Old Town's name lies under the corner plate, but its outline is plainly visible right of the plate.
  - 1280 × 800: 3 of 5.
  - 375 × 667: 3–4 of 5.

  On a wide screen the cover scale has no sideways room, and the corner plate covers x < 430, where Old Town's name sits (x 0.24). So no position alone shows all five.
- **Proposal:**
  1. For the overview only, rest at the **cover scale centred on the five names' box**, never zoomed in. The outlines are the tap targets, so the "every pin clear of every block" search should not apply.
  2. Let a **district's name slide out from under a block** (the corner plate, the *Districts* button), staying inside its own outline. The names already slide along the map's edge. Old Town's outline runs to x ≈ 0.43, right of the plate, so the name would show in full.
  3. Labels must never overlap: on a narrow map, shrink or stack them.

  With (1) and (2), all five names show at every desktop size measured, and 4–5 on phones. A simpler alternative for (2) is to show the overview's corner panel without the orders (the overview has no places to act in), which shortens the plate.
- **Is the *Districts* list enough?** It reaches all five in two taps, so nobody is stuck. But it is not enough for the overview's purpose: the overview *is* "the whole capital at a glance" (the user's lock). On the most common desktop size it hides two districts, one of them the Vanguard's home ground.
- **Test:** `test.fail` ×3 in `apps/client/e2e/qa.slice4.spec.ts`: 1440 × 900, 1280 × 800, and the 667 × 375 overlap. 390 × 844 passes.

#### M2. A candidacy already on the ballot survives a move: the member can win a seat in a city they no longer live in

- **Where:**
  - `apps/server/src/services/residenceService.ts` `oldPlaceStakes` (l. 57–82) looks only for `status: 'filed'`. After the close of nominations a candidacy is `standing`.
  - The residence card's sheet (`residenceCardView`, l. 136–144) therefore prints no warning.
  - The count (`cityDay.ts` / `capitalDay.ts`) seats whoever is on the frozen ballot, resident or not.
- **Steps:**
  1. A Coalport member (Rank 3, *Known*, 500 Coalport Successes) declares in Coalport, reaches the ballot at Coalport's close (cycle day 2), and stands in Irongate.
  2. They open Eastside's residence card: the sheet has **no** "You stop being a Coalport candidate" line.
  3. Register → the modal says nothing about the candidacy; `candidacyWithdrawn: false`; the candidacy is still `standing`.
  4. At Coalport's count the member, who lives in Eastside, takes **Coalport seat 1** (`officeTerms coalport:4147`, holder the player).
- **Expected:**
  - GDD §14.11: "a candidacy filed at home is withdrawn".
  - Screens §6.2: the sheet says "You stop being a Coalport candidate" before the tap.
  - §15.1 / §15.3: who stands is a resident.

  The same hole applies between two districts (standing in Eastside, moving to Old Town during the polls).
- **Impact:** a member can hold a home seat and stand (or sit) in the capital at once. The stipend is paid for a council of a city they left. The sheet promises nothing and the result surprises.
- **Needs a decision** (designer, then developer). GDD §15.3 also says that after the polls open "the name is on the ballot", so withdrawing it is not obviously right. Options:
  - (a) the move strikes the name from the ballot (votes already cast for it are lost);
  - (b) the name stays, and a seat it wins at the count goes straight to the party's next local, as a vacated seat does;
  - (c) a candidate on a ballot cannot move until the count (`ON_BALLOT` refusal, said on the card).

  I recommend (b): it keeps the ballot honest, and the sheet can say "Your name stays on the Coalport ballot; a seat it wins goes to the branch".
- **Tests:** `it.fails` ×2 in `apps/server/test/qa.slice4.residence.test.ts` (the sheet and withdrawal; the seat at the next count), plus a passing control.

#### M3. On a phone held sideways the capital's side panel is unreadable; *Station & Market* overflows its tram chip everywhere

- **Where:** `packages/ui/src/components/Capital.tsx` `TramBar` (l. 301–325): `flex-1 min-w-0 whitespace-nowrap px-2` with no truncation. The district plate in the 260 px side panel (`apps/client/src/routes/city.tsx`, `SIDE_W`) has the same problem.
- **Steps:** a phone sideways (667 × 375, 812 × 375, 915 × 412) → any Irongate district.
- **Actual:**
  - The tram bar reads *DV. QUARTEOLD TOWN EASTSIDGARRISON HI*: the four labels run into each other (58 px chips for 68–80 px labels).
  - The plate's kicker wraps to *DISTRICT / · / VISITING*, *Close race* wraps, and at 812 px the name *Eastside* overlaps *Stranger · 0 / 10*. Screenshots: `land-sm-667x375`, `district-eastside-812x375`.
  - Upright, *Station & Market* overflows its chip by 3–7 px at every width from 360 to 1440. At 360 px it reads *STATION & MARKE* against *GARRISON HILL*.
- **Expected:** screens §5.2: four chips, 44 px, one tap, readable. Review 2 #3 supports a phone held sideways.
- **Impact:** the tram is the main way between districts; sideways it becomes four unlabelled buttons. Taps still work (each chip is 44 px tall) and the *Districts* list still works.
- **Fix idea:** in the side panel, the tram bar as two rows of two, or the four short names (*Gov. Quarter* already exists; add *Station* / *Market*?); `text-overflow: ellipsis` as a floor. Let the plate's kicker and state word take the full panel width.
- **Tests:** `test.fail` ×2 in `qa.slice4.spec.ts` (every label fits its chip at 360 × 640 and at 812 × 375).

### Minor

#### m1. Order titles name the home city for a capital resident (the user's known item 2)

- **Where:** `packages/content/src/data/orders.ts`, the slot-C templates with `residence: 'any'` (`dir.sharpen-up`, `dir.full-day`, `dir.five-in-the-book` and their `dir.v.` / `dir.a.` twins). Their match `cityId: 'home'` now means the residence city.
- **Actual:** a capital resident reads *Five attempts anywhere in Coalport · 1*, and the pin *1* is Irongate's Parliament (seen in the app, `eastside-resident-polls-360`). *Study, lift or run once in Coalport* and its line name Coalport's places too.
- **Fix:** a `{city}` placeholder resolved at read, like `{issue}`, or residence-neutral titles (designer's text).
- **Test:** `it.fails` in `apps/server/test/qa.slice4.issues.test.ts`.

#### m2. A capital resident's *Speak on this week's Issue* has no pin

- **Where:** `apps/server/src/services/views.ts` `orderPin` (l. 211–247). The descriptor it builds carries no `issueIds`, so `orderMatches` with `issueTagged: true` never matches.
- **Actual:** the order has no number and is not a link (seen in the app), so it says neither where to go nor which places count. Every other order points at a place.
- **Expected:** slice-2 §7.3 ("the pins say where"). The Tram Fare Hike, for example, is tagged at the arrivals hall, Market Square and the Junction.
- **Fix:** give the pin search the live Issue tags of each place, or point the order at *Where to act*.
- **Test:** `it.fails` in `qa.slice4.issues.test.ts`.

#### m3. The Herald writes "a Eastside" and "a Old Town"

- **Where:** `packages/content/src/data/heraldHeadlines.ts` l. 59 (`hl.ig.seat-won` *Takes a {district} Seat*), l. 77 (`seat-lost` *Misses a {district} Seat*), l. 132 (`voted-won` *Takes a {district} Seat*). This is design §12's text.
- **Actual:** *Your Vote Counted: Georg Hollmann Takes a Eastside Seat*, seen on a real count morning.
- **Fix:** the designer rewords (*Takes a Seat in {district}*) or adds an article-aware placeholder.
- **Test:** `it.fails` in `packages/content/test/qa.slice4.test.ts`.

#### m4. Player text says a close race is "three parties within ten points"; the first-arrival deck fixes the number of close races

- **Where:**
  - `copy.ts` l. 801 (the *Close race* help note) and `heraldHeadlines.ts` l. 378 (`hl.ig.battleground` deck) both say *Three parties within ten points*.
  - The rule (GDD §14.4) is **the top two** within ten. Eastside at 40 / 35 / 10 is a close race; Government Quarter at 50 / 20 / 15 is not.
  - `heraldHeadlines.ts` l. 40 (`hl.ig.first-arrival`) prints *Five districts, two of them close races today* whatever the count. The nation card already computes the live count (*one close race today*, *contested*).
- **Fix:** the designer's text; `{closeRaces}` for the deck.
- **No automated test** (wording).

#### m5. *Renew* on the day a room was taken charges 100 Iron for no extra night

- **Where:** `residenceService.ts` `takeRoom` (l. 416–488). The card shows *Renew · 100 Iron* as soon as a room runs (`Capital.tsx` l. 538–549).
- **Actual:** take a room, then tap *Renew* the same day: 800 Iron left, `untilDay` unchanged. The design allows renewal "any day" with no stacking, so this follows the letter. But the button sells the player nothing on the first day and little on the second.
- **Also:** two requests with two keys at once buy the room twice. The client blocks the second tap, so this needs a hand-made request; recorded only.
- **Fix:** offer *Renew* only when it adds a night, or refuse a renewal that adds none.
- **Owner:** designer and developer.
- **Test:** `it.fails` in `qa.slice4.residence.test.ts`.

#### m6. The capital's ballot shows no name above its button (slice-3 m4, carried over and worse)

- **Where:** `apps/client/src/routes/council.tsx`: the City Hall header (review 3), the plate, *How elections work*, *Last result*, then the sticky CTA.
- **Measured:** **0** names above the CTA at 375 × 667 and 360 × 640, and at 1440 × 900 the CTA floats over the first name (`ballot-375x667`, `ballot-1440x900`).
- **Expected:** screens §10: the header and at least five rows above the CTA on a 375 × 667 phone.
- **Test:** `test.fail` in `qa.slice4.spec.ts` (the slice-3 m4 test still fails as expected too).

#### m7. On short phones a district's map is a thin band

- **Measured** (Station & Market; the clear band between the plate, the three opinion bars, the tram bar and the orders):

  | Phone | Paper unread (banner) | Paper read |
  |---|---|---|
  | 360 × 640 | 122 px (19 % of the screen) | 166 px (26 %) |
  | 375 × 667 | 149 px (22 %) | 193 px (29 %) |
  | 390 × 844 | 302 px (36 %) | 346 px (41 %) |

  The *City / Nation* and *Places* pills sit inside that band. Every pin is clear or a drag away, as review 3 allows, so the developer's e2e passes.
- **Expected:** screens §10 keeps "the map stays visible"; the home plate already hides its Election card under 700 px tall.
- **Fix idea:** under 700 px, fold the three bars into the plate's band (*20.0 · 20.0 · 20.0*) or hide the orders as the home city's plate does.
- **Also:** at 812 × 375 with the paper unread the nation map's at-rest view leaves Coalport (*you are here*) off the map. Appendix C #42 promises your city and the capital in view.

#### m8. The Me tab's *You live in Eastside, Irongate · move again from Saturday* is a 36 px target

- **Where:** `apps/client/src/routes/me.tsx` l. 162–175 (`me-residence`, a link to the district).
- **Same pattern as:** slice-3 m5 (the office line).

#### m9. The capital's *How elections work* is the developer's draft (the user's known item 3)

- **Where:** `copy.ts` l. 351–360 (`copy.help.capitalElection`).
- **Check:** its five lines are correct against design §8.
- **Missing compared with the home note:**
  - how to stand: 10 Political Capital and two backers of your party who live in Irongate;
  - that a new resident votes from the next election that opens;
  - what a seat gives: 10 Political Capital and 20 Party XP a day.
- **Owner:** the designer, to confirm or rewrite.

### Nits

| # | Where | What |
|---|---|---|
| n1 | `travelService.ts` `close` (l. 807–839) | It reads the journey before its transaction. An answer committed in between is stored and paid, but the journey is marked *slept through*. The client does not block Continue while a card answer is in flight. Seen in the very first race I ran. Only the report's slept-through count is wrong. `it.fails` in `qa.slice4.travel.test.ts` |
| n2 | The arrival modal | *The train was on time. Nothing happened, which is rare.* is printed directly above an unanswered card (as specified; reads oddly). For the designer |
| n3 | ADR 0028 §4 / `ledger.ts` | Rows record only the gaining party. When Neutral is at its floor and rivals lose share, their losses have no row, so "folding the meter from the ledger" would not reproduce it. No effect at slice-4 scale (Neutral 35–40 in the capital); worth one line in the ADR |
| n4 | GDD §14.5, §14.6 | Two stale player strings: *"This cycle you moved Eastside…"* (built and screens: *This election you've moved…*) and the tag *Issue: Tram Fare Hike · +50 % swing* (built: *opinion +50 %*). The code follows the screens; the GDD should too |
| n5 | `apps/client/src/routes/{city,paper,council}.tsx` `useNow(60_000)` | The value is taken at mount, before `character.me` brings `serverNow`. On a phone with a wrong clock, or after a dev-panel time skip, countdowns (*28 days left*) are wrong for up to a minute. Pre-existing |
| n6 | Design §8.2 (as designed) | One rival ballot flips a leaning district's second seat: Eastside 15 / 35 / 15 with one Vanguard ballot gives the Vanguard 26.9 against the Collective's 25.6 (seen in the app). The design's own example uses two. Not a bug; on the playtest list (§7) |
| n7 | `rules/district.ts` `districtState` | One comeback per district: if a second party loses control within the first's 14 days, the first comeback is replaced. The GDD does not say; edge case |
| n8 | Screens §8 copy, `dhondt` | *A party takes both only with more than twice the next.* At exactly twice the quotients tie and the tie rule (ballots, then opinion) gives the leader both. Shares to the thousandth make this rare |

---

## 4. GDD vs code: disagreements and which is right

| Topic | GDD / design says | Code does | My view |
|---|---|---|---|
| §14.11 a candidacy at a move | "filed at home is withdrawn" | Only `filed`; a candidacy on the ballot stands and can win (M2) | **The GDD's intent is right** (only residents sit); the GDD should say what happens to a name already on the ballot. Designer to decide (M2's options) |
| Screens §5.1 / the lock: the overview | The whole capital, five names | Zoomed in on desktop (M1) | **Screens are right** |
| §14.4 a close race | Top two within ten | Code: top two (correct). Player text: "three parties" (m4) | **GDD and code right**; the text is wrong |
| Design §7.4 the room's renewal | Any day, no stacking | As written | Letter kept; the UX sells a no-op (m5). Designer |
| §14.5, §14.6 player strings | *This cycle…*, *+50 % swing* | *This election…*, *opinion +50 %* | **Code (screens) right**; GDD to follow (n4) |
| Design §2.5 / tech §8.3 fellow travellers | A count line | Counted, not shown | Recorded as optional; fine |
| Tech §12.3 / design §17 Q15 the overview's district card | Pins with a card | Outlines, straight in (the user's lock) | The lock wins (a user decision) |

Everything else agrees, number for number: times, fares, the windows, the score, D'Hondt, NPC fill, six of ten, drift, the thresholds, the comeback, the Issues' numbers, heroes and the card caps.

---

## 5. Tests added (not committed)

| File | Tests | What it covers |
|---|---|---|
| `packages/rules/test/qa.slice4.rules.test.ts` | **21** | The slice-4 constants **parsed from GDD §14.2, §14.4–§14.6, §14.10, §14.11, §15.3**. w for 0–40 ballots. 5,000 score sums, 5,000 D'Hondt counts, 2,000 district counts with NPC fill. The design's division cases and 5,000 random papers. 5,000 drifts. The close-race and control edges. 300 comeback walks. 10,000 Issue draws. Points. 5,000 resolutions. Tickets and the room. 80,000 card draws. The windows for every offset over 40 days. Heroes and the scoreboard |
| `packages/content/test/qa.slice4.test.ts` | **4** (1 `it.fails`) | Journey cards against the GDD's caps; the card shape; Issue lines without odds; m3 (`it.fails`) |
| `packages/db/test/qa.slice4.db.test.ts` | **1** | Migration 006 twice over a mixed database, byte for byte |
| `apps/server/test/qa.slice4.travel.test.ts` | **11** (1 `it.fails`) | The timetable per faction both ways; five boards at once; three answers at once; the deck over 24 journeys; closing the game mid-journey; arriving while away; a real Agenda worker; n1 (`it.fails`) |
| `apps/server/test/qa.slice4.residence.test.ts` | **8** (3 `it.fails`) | Three moves at once; the same key ×3; M2 ×2 (`it.fails`) and its control; Evictions on the room; m5 (`it.fails`); the room bought twice by two hand-made requests |
| `apps/server/test/qa.slice4.capital.test.ts` | **8** | Who votes where; who stands; one backing a cycle across districts; none from home; NPC fill with players; 9 vs 10 ballots; ten seats by district |
| `apps/server/test/qa.slice4.issues.test.ts` | **6** (2 `it.fails`) | A ×3 tagged canvass; the ledger equals the meter; the top five; a tie by share; m2 and m1 (`it.fails`) |
| `apps/client/e2e/qa.slice4.spec.ts` | **9** (6 `test.fail`) | The overview at 390 × 844 (passes), 1440 × 900 and 1280 × 800 (M1), sideways overlap (M1); the tram labels at 360 × 640 and 812 × 375 (M3); a double tap on Board and on Register; the card and the arrival by keyboard with no odds maths; the capital ballot on 375 × 667 (m6) |
| `apps/client/playwright.config.ts` | — | The `phone` project ignores `qa.slice4.spec.ts`; a new `qa-capital` project runs it last (after `capital`: it moves the shared clock to the capital's polls) |

Every expected failure was run once as a plain test, to check that it fails for the bug's reason:

- Vitest: a copy of each file with `it.fails` → `it`.
- Playwright: `QA_SHOW_BUGS=1`, which turns each `test.fail` off.

When a bug is fixed, its test turns red: that is the reminder to remove the marker.

The scratch scripts are in the session's scratchpad, outside the repo: the overview audit at ten sizes, the screen walk and DOM audit, the politics walk, the keyboard walk, the never-black sweep, the tram measurement, the map-band measurement, the frame-rate probe and the cover-scale proposal. About 70 screenshots are there too.

---

## 6. Command output (real runs)

| Command | Result |
|---|---|
| Baseline at `2d0d672`, before QA changes: `pnpm art:check && pnpm turbo lint typecheck test build --force`, then `pnpm e2e` | exit 0 · `art:check ok: 34 assets, 12.64 MB` · 20/20 tasks · rules 33 files / 348 passed · content 11 / 168 · ui 12 / 263 · db 11 / 48 + 1 expected fail · server 30 / 304 + 2 expected fail · `pnpm e2e` **84 passed (13.1 m)** (the slice-3 m4 test fails as expected) |
| **Final, on a clean worktree of `2d0d672` plus the QA files:** `pnpm art:check && pnpm turbo lint typecheck test build --force && pnpm e2e` | **exit 0**. `art:check ok: 34 assets, 12.64 MB` · turbo **20 successful, 20 total, 0 cached**: rules 34 files / **369 passed** · content 12 / **171 passed + 1 expected fail** · ui 12 / **263 passed** · db 12 / **49 passed + 1 expected fail** (slice-3 m6) · server 34 / **331 passed + 8 expected fail** (6 of them slice 4's) · `pnpm e2e` **93 passed (13.1 m)**, including the 9 `qa-capital` tests (6 failed as expected) and slice-3 m4 (failed as expected) |
| Along the way | Several of my first assertions were wrong and were fixed in the tests, not the code: a visitor's ballot on a day Coalport is not polling (`NOT_POLLING`, correct); a home member's backing on a day Coalport is not in nominations (Coalport's nominations never meet the capital's; Ashford's do, and the refusal is `UNKNOWN_CANDIDACY`); turnout's *eligible* counting this file's earlier residents; a test helper that resets the capital when a new character's clock is behind it; the training-action type without `energy` |
| **The branch moved during the session** | At 17:24 `a337c5c` "Slice 5 design: Risk" (docs only: GDD, economy, slice-5 design) was committed on `slice-0`. At that HEAD the gate is **red**: `packages/content/test/qa.slice2.test.ts` › *§21.4 catalogue … from the GDD table* fails, because the GDD's §21.4 table now lists `keep.ledger-page`, which content does not have yet. Not a slice-4 defect; it is "design one slice ahead" meeting a test that parses the GDD. Developer or designer: add the item with slice 5, or make the test skip rows marked for a later slice. Everything else at that HEAD is unchanged code |
| Clean-up | My private API (:3201, with its in-process MongoDB) and client (:5273) stopped; no port of mine listening. The user's `pnpm dev:mem` (PIDs started 2 and 3 Oct, before this session) untouched. The scratch worktree removed. Nothing committed |

**Not verified here:**

- a real phone or iOS Safari;
- a screen reader;
- a real network;
- CI and deployment (local-only by the user's decision);
- Agenda across a real midnight and a real journey of twelve real minutes;
- human feel (that is the playtest).

---

## 7. Playtest checklist (for the whole-game review)

The slice question: **do players choose to move to the capital, and does the three-way fight feel alive?**

### Before the playtest
- [ ] Fix **M1**: the overview must show the five districts at rest on a desktop.
- [ ] Fix **M3**: the sideways tram bar.
- [ ] Decide and fix **M2**: a candidacy on the ballot at a move.
- [ ] Fix **m1** and **m3**: the text a capital resident reads every day and on count mornings.
- [ ] Make the gate green at HEAD (`keep.ledger-page`, §6).
- [ ] Testers in **different factions**: the three-way fight needs at least one of each. With one tester, a single ballot decides a seat (n6), so the capital will feel like a solo game.
- [ ] Use the dev panel: *Level 10*, *Take me to Irongate*, *Live in…*, *Arrive now*, *Next Monday*. Note each tester's time zone: boundaries show as 03:00 local in summer and 02:00 after 25 Oct.

### Watch live
- [ ] **The first trip:** do they find *Nation* on the Map tab unprompted? Do they read the city card's line (*two close races today*)? How long from *The Train Is Open* to the first board?
- [ ] **The journey:** do they wait on the journey screen or close the game? (The report measures dwell; ask anyway.) Do they answer the card, and on the way or on the arrival?
- [ ] **The arrival:** do they read *You're in the capital* and the sash (*Contested*)? Where do they tap first?
- [ ] **The capital map:** on a desktop, do they find Old Town and Garrison Hill (M1)? On a phone, do they use the tram bar or the *Districts* list? Sideways, can they read it (M3)?
- [ ] **A close race:** do they notice *Close race · +25 % Party XP · better odds* and choose to work there? Do they mention the *Issue* tag?
- [ ] **Register:** do they read the sheet before *Register · 500 Iron*? Do they understand *you vote from Thursday*? Do they regret the 500 Iron?
- [ ] **The vote:** on a short phone, do they scroll to find the names (m6)? Do they vote for another party's local? Do they know *local* means the game's candidates?
- [ ] **The count morning:** do they open *See the result*? Do they understand the parties' table (votes, opinion, score) from the one sentence under it? Do they say "one vote took a seat" (n6)?
- [ ] **Monday:** do they read *The Issues* section? Did they change where they worked because of an Issue? Do they notice the effect (a half-price ticket, a room for 50)?
- [ ] **Orders:** does a capital resident question *Five attempts anywhere in Coalport* (m1) or the order with no pin (m2)?

### From the report (`pnpm report:playtest`, the battleground section)
- [ ] Journeys per tester per day; cards answered on the way, on arrival, or slept through (n1 inflates the last a little); dwell (closed within two minutes of `arrivesAt`).
- [ ] The first move: the day after Level 10 and after Rank 2. Moves back home. Rooms taken.
- [ ] Per district per cycle: ballots, w, turnout, seats by party, ties on the draw. Ordinances passed in Irongate, and by which coalition.
- [ ] Close-race days per district; comebacks (expect none at this scale).
- [ ] Issues: points by party, owners or lapses.
- [ ] Heroes by bracket; the capital's opinion moved by actions vs cards vs Issues vs drift.
- [ ] `txAttempts` for capital actions (contention).

### Questions afterwards
1. "Why did you move to the capital, or why not?"
2. "Did you see another party move a district you had worked? How did you know?"
3. "Did a close race or an Issue change where you went?"
4. "What decided the seats in your district?"
5. "Did you wait on the train, or come back later?"
6. "Was anything hard to find, read or tap on the capital's map?"

### Answer the question
- **Yes**, if:
  - most testers who reach Rank 2 register in a district within two days;
  - they return to work the district they live in;
  - at least one district changes hands or becomes a close race through player work;
  - testers can name another party's move.
- **No, and where:**
  - If they visit and go home, look at what the capital gives a resident that home does not: the orders, the paper, the vote.
  - If the fight feels empty, look at tester count and factions first (n6), then at what the paper says each morning.

---

## 8. Fix round (3 Oct 2026, developer)

Code fixes from this report, and the designer's decisions in `docs/design/slice-4-fixes.md` (M2, m1–m5, m9, n2, n4, `keep.ledger-page`). Every expected fail QA wrote for a fixed bug is now a plain passing test, renamed *fixed (…)*.

| Bug | Status | What changed | Test |
|---|---|---|---|
| **M1** overview zoomed in | **Fixed** | The overview rests on the whole picture at the covering scale, centred on the five names, moved up or down only where that lets every name sit clear; a name slides out from under the corner plate, the *Districts* button or another name to the nearest clear spot with its centre inside its own outline; under 560 px of map the names are compact (*Gov. Quarter*). All five clear, none overlapping, at 1920 × 1080, 1440 × 900, 1280 × 800, 915 × 412, 812 × 375, 667 × 375, 390 × 844, 375 × 667 and 360 × 640 | e2e ×7 (`qa.slice4.spec.ts`), ui ×8 (`slice4.fixes.test.tsx`) |
| **M2** a candidacy on the ballot survives a move | **Fixed** (designer: option c) | While the name is on the ballot where the member lives, the card is `onBallot` (*You're a candidate in Coalport until the result · you can move from Sunday*, no button) and `register` is refused `ON_BALLOT` (after the cooldown, before the Iron); the count seats the member normally. The refusal reads *You're a candidate where you live until the result. You can move after it.* (*ballot* is a system word, review 2 §1.13) | QA's two tests rewritten to the decision (+1), rules, ui |
| **M3** sideways tram bar and plate; *Station & Market* overflows | **Fixed** | The tram bar is a grid (two rows of two in the side column) and a label wraps in its chip; sideways the plate puts *‹ Irongate* and Reputation on one row and the district's name on the next; the overview plate's title wraps | e2e ×2 (+ the name/Reputation overlap check), ui ×2 |
| m1 slot-C titles name the home city | **Fixed** | `{city}` and `{verbs}` resolved at read wherever a title prints (orders, the result's order lines, the ticket's order tag, the paper's `{ordersTitle}`): *Study, carry or run once in Irongate*, a Vanguard member *Study, lift or carry*; loader checks the placeholder set | QA test flipped; server ×2; content (review 3 and the fixes table) |
| m2 the Issue order has no pin | **Fixed** | The pin is the first place, in pin order, with an action the first live Issue tags (else the second's); another party's HQ is never a pin; a pin in another district (or on the overview) opens that district first | QA test flipped; server ×2 (Tram Fare Hike → 13 Market Square, Press Raids → 7 Herald House) |
| m3 "a Eastside" | **Fixed** (designer) | Seat headlines reworded | QA content test flipped (by the designer) |
| m4 close-race wording, first-arrival count | **Fixed** | Help note and deck (designer); `{closeRaces}` counts today's close races at the edition | server ×1 |
| m5 Renew on day one | **Fixed** (designer's rule) | A renewal adds seven nights to the end (act `renew`, stamp *Renewed*), offered while seven or fewer remain; more ahead is refused `ROOM_PAID_AHEAD` and the card says *renew from {weekday}*. The two hand-made taps now buy a room and at most one renewal | QA test rewritten; server, rules, ui |
| m6 no name above the ballot's button | **Fixed to the brief's bar** | The names follow the plate (help and last result after them; *who can be voted for* moves under the names and the hall shrinks to 64 px on a phone under 700 px, hidden under 660 px). The first whole name is above the button at 375 × 667 and 360 × 640, two whole names (and the third’s name) at 1440 × 900 | e2e (new). QA's *five rows above the CTA* stays an expected fail: a row is 64 px or more, so five need 320 px of a 370 px content area under the HUD and the paper's banner |
| m7 district map a thin band | **Fixed** | In the capital, a phone under 700 px tall folds the orders to one 44 px row that opens them in a sheet. Station & Market's clear band: 360 × 640 122 → 209 px, 375 × 667 149 → 236 px (390 × 844 unchanged, 302 px) | screenshots |
| m8 Me tab line 36 px | **Fixed** | 44 px (and the office line, slice-3 m5's pattern) | measured 317 × 44 |
| m9 capital *How elections work* | **Fixed** (designer) | | |
| n1 Continue racing an answer | **Fixed** | `travel.close` decides *slept through* on the document as it closes it | QA test flipped |
| n2 *Nothing happened* above a card | **Fixed** | `copy.travel.cardBelow` when a card waits below | server ×1 |
| n3 ledger rows for losses | Open | For the architect (ADR 0028 note) | |
| n4 stale GDD strings | **Fixed** (designer) | | |
| n5 countdowns after a time skip | **Fixed** | `useNow` hooks re-read the server clock as soon as its offset jumps | (no client unit-test setup) |
| n6, n7, n8 | Open | Playtest / designer questions, unchanged | |
| `keep.ledger-page` | **Fixed** (designer) | The gate is green at HEAD again | |

**Also in this round:** the October art (`docs/design/art-wiring-oct.md`): fourteen scenes bound by kind (`alliance-hq` for the Alliance's HQs) with their alt texts and three focus points, twelve faces, eighteen at sign-up in the note's order (four to a row on a phone). Six of the new 1280 px WebPs stayed over their 200 KB budget at the q60 floor, so the new scenes' WebP fallback is written at 640 px only, as the maps'; the committed set measures **16.31 MB** and the cap is raised to **16.8 MB** (ADR 0015's per-slice rule: the measured figure plus 0.5 MB). The map crop still stands in for `hospital`, `jail`, `parliament` and `barracks` (tested on St Agnes). `playwright.config.ts` takes **`E2E_WEB_PORT`** (default 4173) and **`E2E_API_PORT`** (default 3101); turbo passes `E2E_*` and `QA_SHOW_BUGS` to the e2e task.

**Still open:**
- On a tablet (1024 × 768, 768 × 1024) Old Town's name stays under the corner plate (4 of 5 clear): its whole outline lies under the 420 px plate there, so no clear spot exists inside it. The *Districts* list reaches it. Not one of the sizes in the brief; a shorter overview plate on tablets would fix it.
- m7's *also*: the nation map at 812 × 375 with the paper unread (Coalport off the map at rest) was not touched.

**Command output (fix round, real runs):** `pnpm art:check && pnpm turbo lint typecheck test build --force` → exit 0: `art:check ok: 60 assets, 16.31 MB`; turbo **20 successful, 20 total**; rules 35 files / **374 passed**; content 13 / **177 passed**; ui 13 / **275 passed**; db 12 / **49 passed + 1 expected fail** (slice-3 m6); server 35 / **344 passed + 2 expected fail** (slice 3's; none of slice 4's remain). `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` → exit 0, **97 passed (13.5 m)**, of them 2 expected fails (slice-3 m4 and this report's *five rows above the CTA*). The suite ran on other ports because another program of the user's held 4173; the suite is otherwise identical.
