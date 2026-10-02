# Slice 4 — "The battleground": the screens

Game designer, 29 Sep 2026; **rewritten 2 Oct 2026** for the painted maps (maps v3 and review 3: one picture per city, districts as frames, the map fills the screen, drag within a quarter, the Places list), the job as a wage (review 1) and plain words with no odds maths (review 2, GDD §1.5 and §8.4). The screen-by-screen spec for slice 4: the nation map, the journey screen, the Irongate overview and district view, moving residence, the Issues in the paper, the capital's Election card, the result and the scoreboard. Where a canvas mockup exists it is named and this document says what to keep and what changes; where none exists, this document is the mock. Rules and numbers are in `docs/design/slice-4-battleground.md` (cited as *design §n*).

**Phone first** (375 wide, supported from 360), desktop as the existing screens do it (the map full-bleed with a side sheet; the paper in a column of 640). Every screen below is one tap or one choice, resumable, and reads its numbers from the server. **Every string a player reads is in everyday words**: no *canvass*, *ballot*, *ordinance*, *FXP*, *PC*, *battleground*, *groundswell*, *ledger*, *momentum*; no percentage, roll, check or difficulty anywhere (reward percentages such as *+25 % Party XP* are rewards, not odds, and stay).

## 1. The look, and what already exists

The printed-matter look of `docs/mockups/MobileCity.dc.html`, `MobileRegion.dc.html`, `MobileJourney.dc.html` and `Capital.dc.html`: paper `#EFE6D2`, ink `#15181A`, faction colours Vanguard `#C39A3A`, Collective `#8C2B23`, Alliance `#4B7394`, Neutral `#8A8577`; Oswald caps for labels, Courier Prime for datelines and anything typed, Source Serif 4 for body, Playfair Display for headlines.

Components reused as they are: `CityMap` (with `frame` and `tiles`, as the mini-slice left it: cover at rest, drag within the frame, pin zoom, `PlacesList`), `Masthead`, `DeskList`, `OrdersList`, `TodayStrip`, `LettersRow`, the slice-3 **Election card**, `Plate`, `Ticket`, `Stamp`, `ResultModal` (kinds `action`, `political`, and a new `journey`), `BottomSheet`, `JobsCard` (the pattern for the residence card), `StoryScreen` (the pattern for the journey card's choice rows), `Picture`, `FactionCrest`, `Button`, `ProgressBar`, the candidates list, the vote list, `CountTable`, `CouncilCard`, `SeatGrid`, the *Up for a vote* list.

New components (plain props, no tRPC): `CityCard` (the nation's sheet), `JourneyScreen`, `JourneyCard`, `DistrictPin`, `DistrictCard` (the overview's sheet), `OpinionBars`, `TramBar`, `ResidenceCard`, `IssuesSection`, `IssueRow`, `ScoreboardLine`, `ScoreboardTable`, `DistrictResultTable`. Each is described where it appears. The map screens are `CityMap` with different pictures, frames and pin sets; nothing new is built for panning or zooming.

Marks: the three-bar opinion gauge (`OpinionBars`) is the one new visual idiom: three thin bars in faction colours on a Neutral track, values to one decimal at the ends, the same on the city card, the district card and the paper.

---

## 2. The nation map

### 2.1 Phone (`MobileRegion.dc.html`, kept for the look; the behaviour is review 3's)

Route `/map/nation`. The Map tab toggles between **City** and **Nation** with a segmented control in the top bar (Oswald caps, two segments); below Level 10 the Nation segment is present and every city card reads *From Level 10*.

- **The painted republic** (`map.nation.day` / `.night`, 9,216 px, tiled) in `CityMap` with `frame` = the five cities' box grown by 0.06 (x 0.06–0.94, y 0.11–0.91). **It fills the screen**: no bands, no free zoom; the player may **drag** anywhere inside the picture. **At rest the view is centred so that the player's city and the capital are both visible** (design §2.1); the rest of the country is a drag away. In transit the view centres on the line being travelled.
- **City pins** (`.edge` in the mockup: ink on ink, a 1 px paper border, Oswald caps 11 px): *Irongate* · *Ashford · 12 min* · *Coalport · home · 12 min* · *Duskwall · 15 min* · *Clearwater · 25 min*, at the `mapPins.nation` positions. The current city's pin is inverted (paper on ink) and carries *you are here*. A locked city (a rival home, Clearwater) is drawn at 60 % opacity with its lock word under the name (*rival ground* / *no service yet*).
- **No rail overlay.** The railways are painted; nothing is drawn over them.
- **Tapping a pin** zooms onto the town (the pin zoom of a place) and opens the **city card** (`CityCard`) as a bottom sheet: the name (Oswald 600, 15 px caps), the line in Courier (*Capital · 5 districts · two close races today* / *Home city of the Alliance* / *Contested · no service yet*), `OpinionBars` for the city (Irongate: the average of five) under the label *Who holds Irongate*, the two Issues as chips (*Tram Fare Hike* · *Eviction Notices in Eastside*), the Election line in the card's words (*Votes in 3 days* / *Voting open until Saturday midnight*), and the button:
  - **Board · 20 Iron · 12 min** (`Button primary`, full width) for an open destination; *Needs 20 Iron* disabled otherwise;
  - **See the five districts** (`Button secondary`) when the player is in Irongate;
  - a Courier line *Rival ground · from a later edition* or *No service yet* for a locked one, and no button.
  Closing the card returns to the dragged view.
- **The Cities list**: the Places pill, labelled *Cities*, above the tab bar at the right. A bottom sheet, *Cities of the republic*, five rows in a fixed order (the capital, your home, the other three): the name, the line, *12 min · 20 Iron* or the lock word. A row does what the pin does. Escape and Close close it.
- The HUD is the slice-1 HUD; the tab bar is unchanged. The top bar's subtitle says where you are (*Coalport · home* / *On the train to Irongate*).

### 2.2 Desktop (`Region.dc.html`, kept where it agrees)

Route the same. The map fills the viewport under the same cover-and-drag rules; the **side sheet** (360 px, paper) on the right shows the selected city's card with the same contents, plus the **timetable** under it (Courier: *Irongate — Coalport · 12 min · 20 Iron*, five rows, the locked ones dimmed with their lock word). The nation/city toggle sits in the top bar's left, beside the city name. The Cities pill sits at the map's top right. Hover on a pin shows the name and time in a tooltip; click selects and zooms.

---

## 3. The journey screen (`MobileJourney.dc.html`, kept with changes)

Route `/journey`, shown in place of the map while `character.journey` is set; the Map tab lands here; the other tabs work. Paper background.

1. **Header:** Courier kicker *Third class · car 4*; Playfair 22 px *The 14:10 to Coalport* (the departure time is `boardedAt` in the player's clock, the train's "name").
2. **The progress line:** the two city names in Oswald caps at the ends, a 2 px track between them with a train mark that moves with `(now − boardedAt) / (arrivesAt − boardedAt)`, ticking on the client once a second; under it in Courier *{n} min to go · arrives 14:22*. At `arrivesAt` the screen replaces itself with the arrival modal (§4) on the next tick; the server is the authority and the client only asks.
3. **The sentence** (body italic 15 px, a 1 px rule above and below): *You can close the game. You'll arrive either way, and Energy keeps refilling on the way.*
4. **The journey card** (`JourneyCard`), only when the journey drew one:
   - kicker *On the way* with an *Optional* tag at the right (Oswald caps);
   - the title (Playfair 700, 20 px) and the setup (body, ≤ 240 chars, 2–3 lines);
   - the choices as `StoryScreen` rows (full width, 52 px min, 1.5 px ink border; selected row inverted): the title in body 600 and the detail line under it in Courier 11 px: **the odds word from the server's chance, the stat in full, then the rewards** (*Good odds · Agility · opinion +0.05 in Coalport · +5 Party XP*; an unchecked choice has no odds word: *+14 XP*). No percentage, no check, no roll (review 2 §2.2);
   - tapping a row is the choice (one tap, final); the setup says *one choice*;
   - after the choice, the rows collapse to the chosen one and the outcome (headline in Playfair 17 px, body ≤ 240) prints beneath with a `Stamp` (*Success* / *Partial* / no stamp for an unchecked choice) at the right; under a Partial, the one-line reason of review 2 §2.4 (*Your Agility is low for this. Train it at Central Station.*);
   - under the card, Courier: *Ignore it and you sleep through it. Nothing happens.*
5. **Fellow travellers:** left out in slice 4 (design §2.5); if the count is cheap, one Courier line *You and 2 others on this train*.
6. **While you ride:** two `LettersRow`-style rows: **Read the Paper** (*3 unread*) and the residence's **Election** row (as the paper shows it). No Dossier row (slice 8).

Desktop: the same column at 640 px, centred on the map's dark background, the nation map dimmed behind with the view centred on the line being travelled.

---

## 4. The arrival modal

`ResultModal kind="journey"`. The art panel is the destination's painting zoomed on the station (the `map-crop` rung on the 2048 still; Irongate: Central Station); over it the stamp **Arrived** (success tone) and the place line *Irongate · Station & Market*. Headline *You're in the capital* (first arrival) / *Irongate* / *Home*; body: the journey card's outcome if it was answered on this modal or earlier (one line: *The passenger: +6 Party XP, opinion +0.03 in Station & Market*), else *The train was on time. Nothing happened, which is rare.* Knock-on lines: *−20 Iron · ticket* · *The Herald is your paper while you're here* (visitors). If the journey card is unanswered, it is rendered inside the modal above the button (the same `JourneyCard`, compact), answerable until **Continue**. One button: **Continue** → the district view (Irongate, the station district with Central Station selected) or the city map (home: the quarter the player last viewed, since the home cities' station quarters are a later addendum, not slice 4; the user decided 2 Oct 2026, §14.13).

---

## 5. Irongate: the district overview and the district view

### 5.1 The district overview (`Capital.dc.html` for the desktop look; new on phone)

Route `/map/irongate`. `CityMap` on the capital's picture with `frame` = the whole picture (0, 0, 1, 1), so the whole capital is seen zoomed out, covering the screen, dragable, **no place pins**. Five **district pins** (`DistrictPin`: the 32 px ink disc of a place pin with the district's number 1–5, and its name beside it in Oswald caps 11 px) at these anchors, each on the district's heart:

| # | District | Anchor x, y | On |
|---|---|---|---|
| 1 | Government Quarter | 0.53, 0.30 | The Parliament dome |
| 2 | Old Town | 0.24, 0.25 | The basilica |
| 3 | Station & Market | 0.40, 0.60 | The station's glass roof |
| 4 | Eastside | 0.76, 0.62 | The ironworks' chimneys |
| 5 | Garrison Hill | 0.85, 0.16 | The hill |

The pins are 0.29 of the picture apart at the closest (1 and 2): clear at every size. The current district's pin is inverted; the residence district's pin carries a small house mark. A **Districts** list (the Places pill, *Districts*) lists the five rows: the name, the state line and the three bars; a row does what the pin does.

- **Phone:** tapping a pin or a row zooms a little onto the district and opens the **district card** (`DistrictCard`, a bottom sheet, at most 60 dvh): kicker *DISTRICT · 3 OF 5*, the name, the blurb (2–3 lines), `OpinionBars` with the three shares to one decimal under *Who holds Station & Market*, three Courier lines (*Close race today · +25 % Party XP · better odds* or *Not a close race today* · *This week: Tram Fare Hike* or *No Issue this week* · *Council seats: J. Varga (Collective) · K. Steinhauser (Vanguard, local)*), and two buttons: **Go to Station & Market · tram · instant** (`Button primary`) and, for the district the player stands in, **Show places** (`Button secondary`). Under the map, the **city line** in Courier on ink: *Irongate: Vanguard 21.0 · Collective 21.2 · Alliance 21.0* and the legend *Held (over 50) · Contested*.
- **Desktop:** the map with the five pins and the Districts pill, the side sheet with the district card and the two buttons, the Herald's ticker at the bottom (*The Herald* · the three city headlines of the day, separated by ■). The mockup's plates become the pins; their status words stand: *Close race* / *Leans Alliance* / *Held by the Collective 52* / *Comeback · Vanguard*.

### 5.2 The district view (`MobileCity.dc.html`, kept; `CityMap` as the home cities use it)

Route `/map/irongate/{district}`. `CityMap` with the district's **frame** (design §4.2) and **only that district's pins** (the numbered 32 px discs; the pin number is the location's index in the city's list, 1–29, so Eastside's pins read 19–24). Cover at rest, drag within the frame plus 10 %, the pin zoom on tap, the **Places** list for the district's five or six places, exactly as Coalport's Mill.

- **Top bar:** left the edge button **Irongate** (back to the overview); the title *Irongate* with the subtitle in Courier *Station & Market · close race today* (or *· leans Alliance*); right the HUD.
- **The plate** (`Plate`, folded to its header when a sheet is open; on a phone the opaque top band with `hideTop`): title the district's name, kicker *DISTRICT · YOU LIVE HERE* or *DISTRICT · VISITING*, children: `OpinionBars` with the three shares to one decimal under the label *Who holds Station & Market* (tap: the help note), the state word (*Close race* in Oswald caps; *Comeback · Vanguard +15 %* when it applies, for members), a Courier line when a council rule is in force (*Council rule: Tram Subsidy · 3 days left*), a third for the Issue (*Issue: Tram Fare Hike · Collective leads 120 to 85*), and the **scoreboard line** (`ScoreboardLine`, Courier 11 px): *This election you've moved Station & Market +0.30 for the Collective (1st of 3)*.
- **The Election card** (slice 3's, §7.2) and the **residence card** (`ResidenceCard`, §6) sit under the plate, above the places sheet, and fold with it.
- **The tram bar** (`TramBar`): a horizontal row of four chips at the bottom of the map, above the tab bar, Oswald caps 11 px on ink, 44 px high: *Eastside* · *Old Town* · *Gov. Quarter* · *Garrison Hill*; one tap navigates (instant, free, no modal). The Junction's ticket *Tram to Eastside · instant, free* of the mockup is replaced by this bar on every district (the Junction keeps its blurb). The Places pill steps aside for the bar as it does for the orders panel.
- **The location sheet:** as the city sheet today: `{n} · {kind}` kicker, the name, the tickets with the odds word and the stat (*Good odds · Intelligence*). New ticket tags from the server's `ActionView`, in words: *Close race · +25 % Party XP · better odds* (political actions in a battleground district), *Issue: Tram Fare Hike · opinion +50 %* (tagged), *Comeback · +15 %* (members of the faction with one), *Members only* (a rival at an HQ, the whole ticket dimmed, no button). Central Station's sheet carries, under its tickets, a **Trains** card in the `JobsCard` style: *Board the train to Coalport · 20 Iron · 12 min* (the home city; `Button primary`) and a text button *See the nation map*; the Jobs card for the Porter sits under it. Order of tags on a ticket: cost change · Issue · Close race · Comeback · council rule · Party order.
- **The result modal** (`ResultModal kind="action"`): the opinion tile's breakdown lists *Close race +25 %*, *Issue: Tram Fare Hike +50 %*, *Comeback +15 %* and *Street Permits +15 %* as lines, then the district's share before and after; the Party XP tile lists *Close race +2* beside *Rested* and *Party order*; the attempt rows are *Success* / *Partial* with the one-line reason (no odds maths, review 2 §2.3); knock-on lines: *Tram Fare Hike: Collective +10 points (leads 130 to 85)* and, when a state will change at the next boundary, nothing (states change at the boundary and the paper says so).

Desktop: the map full-bleed with the frame and the location sheet at the right, as `City.dc.html`; the tram bar becomes a row of five district links in the side sheet's header.

---

## 6. Moving residence

### 6.1 The residence card (`ResidenceCard`, the `JobsCard` pattern)

On every district view under the plate; on the home city map under its plate. Kicker *WHERE YOU LIVE* (tap: the help note *Where you live is where you vote and stand for the council, whose paper you read first and whose Party orders you get. Moving costs 500 Iron and seven days between moves.*); one state line and one button:

| State | Line 1 (body 15 px) | Line 2 (Courier 11 px) | Button |
|---|---|---|---|
| Visiting, may move | You live in Coalport | Register here to vote and stand in Eastside · 7 days between moves | **Register in Eastside · 500 Iron** (`primary`) |
| Visiting, below Rank 2 | You live in Coalport | {rank2}s can register in the capital. 400 Party XP makes a {rank2}. | none |
| Visiting, in cooldown | You live in Eastside | You can move again from Thursday | none |
| Not enough Iron | You live in Coalport | Register here to vote and stand in Eastside | **Needs 500 Iron** (disabled) |
| Resident here | You live in Eastside | Registered Monday · you vote from Thursday · move again from Monday | none |
| At home, resident elsewhere | You live in Eastside | Register in Coalport to vote at home again · 500 Iron | **Register in Coalport · 500 Iron** |

A second row on the same card, everywhere in Irongate: **A room in Irongate** · *100 Iron · 7 days · Rested cap +50* → **Take a room · 100 Iron** (`outline`), or *Room until Sunday · Rested cap 250* with **Renew · 100 Iron** when one runs. Under the Evictions effect the price line reads *50 Iron · Eviction Notices*.

### 6.2 The sheet (one choice)

Tapping **Register** opens a `BottomSheet`, title *Register in Eastside · 500 Iron*. Five short lines in body 14 px with a Courier tick at the left of each, so the consequences are read before the tap:

- *You vote and stand in Eastside from the next election that opens (Thursday).*
- *You stop being a Coalport candidate; your Coalport seat, if any, passes to the branch.* (only when either applies; in the failure colour)
- *Party orders come from the capital from tomorrow. The Herald is your paper.*
- *Your job, reputation, Iron and rank are untouched.*
- *Moving again: from Monday.*

One button, **Register · 500 Iron** (`primary`, full width, safe-area padded). Closing the sheet is the only other action.

### 6.3 The result

`ResultModal kind="political"`: the Herald's masthead strip with the stamp **Registered**; headline *Eastside has a new voter*; body *The Herald is your paper from tomorrow. Eastside votes from Thursday. Union House expects you at six.* (the faction's HQ name from content); knock-on lines *−500 Iron · 3,910 left* · *Coalport seat given up* when it applies; the Next line *Next: vote in Eastside from Thursday.* **Continue** → the district view with the card in its *Resident here* state and the Election card already reading *Registered in Eastside*.

The room: no sheet, one tap on the button, a modal with stamp **Taken**, headline *A room in Irongate*, body *Seven nights, a window on the tram line. Rested banks to 250 until Sunday.*, knock-on *−100 Iron*.

---

## 7. The Issues in the paper

### 7.1 The Issues section (`IssuesSection`)

In every edition, between the headlines and the Election row (§3.3's order), kicker **THE ISSUES** on a double rule (tap: the help note *Two things the town is arguing about this week. Work on them moves opinion half again and scores points for your party; on Sunday night the party with most points owns the Issue, and that changes a number for everyone for a week.*). Rows (`IssueRow`, 64 px min, dotted rules between):

- Left: the district or city in Oswald caps 10 px (*STATION & MARKET* / *COALPORT*) over the Issue's name in body 600 16 px.
- Middle, under the name: a three-segment points bar (`OpinionBars` in points mode: the three faction colours sized by points, no Neutral track) with the totals in Courier 11 px beneath: *Collective 120 · Vanguard 85 · Alliance 40 · settles Sunday midnight*.
- Right: the leader's small crest (`FactionCrest` 12 px) and the word *leads* in Courier; or *open* when nobody has points.
- Tapping a row expands it (one at a time): the blurb (body italic 13 px, 2–3 lines), the three parties' lines with the crests, the effect line (*If settled: tickets from Irongate half price for the week*), and a text button **Where to act** → the district view (Irongate) or the city map, with the Issue's pins marked (a small *Issue* dot on the pin) and the same mark on the Places list rows.

Order: the residence city's two Issues; then the capital's two (if the residence is not the capital); then a folded row *Ashford · Duskwall · Coalport* (Oswald caps) that expands to the other cities' four to six rows. On Monday morning the section carries a Courier line above the rows: *New this week*. On the Monday after a resolution, the rows are the new Issues and the results are headlines (`hl.*.issue-resolved`), with the effect shown on the desk (*Tram Fare Hike: tickets from Irongate half price until Sunday*).

### 7.2 The Election card in the capital

The slice-3 Election card (review 2 §4.3) on the district view and as the paper's row, with these capital states added to its table. The kicker reads *ELECTION · IRONGATE COUNCIL · EASTSIDE*.

| State | Line 1 | Line 2 | Button |
|---|---|---|---|
| Registered, first vote not yet open | Registered in Eastside | You vote from Thursday · the result every fifth morning | See who's standing |
| Voting open, not voted | **Voting is open in Eastside** | Two seats · any name · your vote is secret · until Saturday midnight | **Vote now** |
| Voting open, voted | You voted for {name} | Result Sunday morning, here and in the Herald | See the candidates |
| The result (days 0–1) | Eastside went Collective, Vanguard · {your line} | Irongate: 4 Vanguard · 3 Collective · 3 Alliance · turnout 3 of 5 in Eastside | **See the result** |
| The council sits, councillor | **You're on the council** · vote on the rule | Three parties, six votes of ten to pass · the council votes Tuesday midnight | **Vote on the rule** |

`{your line}` as slice 3's (*you: elected, 1st of 2* · *you: missed the second seat* · *your vote: {name} was elected*). A visitor who lives at home sees their home card, unchanged.

### 7.3 In Print

The `hl.ig.hero` and `hl.ig.quoted` templates render as personal headlines with the In Print kicker (Oswald caps *IN PRINT*) and, for the hero, a small medal mark (a 16 px ink rosette) before the name. No front page: the seat keeps that.

---

## 8. The result in the capital (`DistrictResultTable`)

Route `/council/result`, the slice-3 result screen with a **district switcher** (five chips under the `Plate`, Oswald caps, the player's district first and selected). Per district:

- **The parties' table** (three rows, one per faction, with the crest): **Votes** · **Opinion** · **Score** · **Seats**, and under it in Courier: *3 votes cast · votes count 15 % of the score, opinion 85 % (votes count in full from 10 cast)*. The seat cells show a thin ink bar per seat won.
- **The candidates' table** (the slice-3 `CountTable`) grouped by party in the order of the parties' table, each candidate's row with the faction mark or avatar, **local support**, **backers**, **votes**, **support**; the two elected rows carry the seat bar; *the line* between the seats and the rest inside each party's list; *local* marks an NPC.
- Under both, Courier (one fixed line, no maths): *Each party's score mixes its share of the votes with its share of opinion. The top score takes the first seat; a party takes both only with more than twice the next. Ties: votes, then opinion, then the returning officer's draw.*
- **The scoreboard table** (`ScoreboardTable`, §9) for the district under the result.

The `Plate` header: kicker *IRONGATE COUNCIL · THE RESULT*, title *Sunday's result*, Courier *Ten seats · Vanguard 4 · Collective 3 · Alliance 3 · local candidates 7 of 10 · final*.

The council (`/council`) is the slice-3 council with ten tiles in five pairs labelled by district (`SeatGrid` with group captions), **Up for a vote** with the three parties' proposals marked *the {faction}'s proposal · {secretary}*, and the caption *Six votes of ten to pass. The council votes at {at}.*

---

## 9. The scoreboard (the player's word for the ledger)

### 9.1 The line (`ScoreboardLine`)

On the district plate, the city plate and the Me tab (design §11.2): Courier 11 px, *This election you've moved {place} {swing} for the {faction} ({rank} of {n})*; `{swing}` to two decimals with its sign, trimmed (*+1.3*, *+0.05*); *(no one else yet)* when the player is the only contributor; the line is absent when the player has moved nothing there this election.

### 9.2 The table (`ScoreboardTable`)

On the result page per district and on the district card of the overview (folded, *Who moved Eastside* → expands): kicker *WHO MOVED {DISTRICT} · THIS ELECTION*, a printed table: **#** · **Name** · **Party** · **Level** · **Moved**; the top three per level bracket, brackets separated by a 1 px rule with the bracket in Courier at its right (*Levels 1–15*); the player's own row on paper-2 with *you*; the hero of each bracket carries the rosette. Under it in Courier: *District Hero: the top of each bracket at the result, at +0.5 or more. 25 Political Capital and your name in the Herald.*

### 9.3 The Me tab

Under the party card: *You live in Eastside, Irongate · move again from Monday* (tap → the district view); the scoreboard lines (one per place moved this election); *District Hero, Eastside · this election* while the title runs, and *Heroes: Eastside ×1* beneath it for ever; the Political Capital line gains its new sources in Courier: *District Hero 25 · Issue top five 4*.

---

## 10. Phone layout rules

- The nation map covers the screen at rest (`data-fit="cover"`), with the player's city and the capital both in view; every other city is a drag away or one tap in the Cities list; no pin sits under the HUD or the tab bar at rest (the Cities pill clears both).
- The journey screen's header, progress line, sentence and the card's title and first choice row are above the fold on 375 × 667; the outcome scrolls.
- The district overview's five pins are at least 0.29 of the picture apart and never overlap at any size; the district card is at most 60 dvh so the map stays visible.
- The district view's plate folds to its header when a location sheet is open; the tram bar stays visible above the tab bar at all times, 44 px high; pins are at least 44 px apart at rest on a 360 px phone in every district (design §4.2's check: the closest, Market Square and the Grand Hotel, are 51 px at the floor and about 90 px upright).
- The Issues section's rows are 64 px and the section shows at most four rows unexpanded (the residence's two and the capital's two); the rest fold.
- The result's two tables use Oswald numerals at 13 px; no horizontal scroll at 360 px.
- Desktop (≥ 1024): the paper stays a 640 px column; the maps are full-bleed with the side sheet; the result and the council render in the paper's column with the district switcher as tabs.

---

## 11. Copy (new strings, for `copy.ts`)

*Nation* · *City* · *From Level 10* · *you are here* · *home* · *rival ground* · *no service yet* · *Cities* · *Cities of the republic* · *Board · {fare} Iron · {min} min* · *Needs {fare} Iron* · *See the five districts* · *Rival ground · from a later edition* · *No service yet* · *Who holds {place}* · *Votes in {n} days* · *Voting open until {until}* · *On the train to {city}* · *The {time} to {city}* · *{n} min to go · arrives {time}* · *You can close the game. You'll arrive either way, and Energy keeps refilling on the way.* · *On the way* · *Optional* · *one choice* · *Ignore it and you sleep through it. Nothing happens.* · *Arrived* · *You're in the capital* · *The train was on time. Nothing happened, which is rare.* · *Irongate* · *District · {n} of 5* · *Districts* · *Close race* · *Leans {faction}* · *Held by the {faction} {share}* · *Comeback · {faction} +{pct} %* · *Not a close race today* · *Close race today · +25 % Party XP · better odds* · *This week: {issue}* · *No Issue this week* · *Council seats: {a} · {b}* · *Go to {district} · tram · instant* · *Show places* · *Held (over 50) · Contested* · *District · you live here* · *District · visiting* · *{district} · close race today* · *{district} · leans {faction}* · *Members only* · *Council rule: {rule} · {n} days left* · *Issue: {issue} · {faction} leads {a} to {b}* · *Board the train to {city} · {fare} Iron · {min} min* · *See the nation map* · *Where you live* · *You live in {place}* · *Register in {district} · 500 Iron* · *Needs 500 Iron* · *Register here to vote and stand in {district} · 7 days between moves* · *You can move again from {weekday}* · *Registered {weekday} · you vote from {weekday2} · move again from {weekday3}* · *{rank2}s can register in the capital. 400 Party XP makes a {rank2}.* · *Register · 500 Iron* · *Registered* · *{district} has a new voter* · *Coalport seat given up* · *Next: vote in {district} from {weekday}.* · *A room in Irongate* · *100 Iron · 7 days · Rested cap +50* · *Take a room · 100 Iron* · *Renew · 100 Iron* · *Room until {weekday} · Rested cap {cap}* · *Taken* · *The Issues* · *leads* · *open* · *settles Sunday midnight* · *New this week* · *If settled: {effect}* · *Where to act* · *Registered in {district}* · *Voting is open in {district}* · *Two seats · any name · your vote is secret · until {until}* · *{n} votes cast · votes count {pct} % of the score, opinion {pct2} % (votes count in full from 10 cast)* · *Each party's score mixes its share of the votes with its share of opinion. The top score takes the first seat; a party takes both only with more than twice the next. Ties: votes, then opinion, then the returning officer's draw.* · *the {faction}'s proposal · {secretary}* · *Six votes of ten to pass. The council votes at {at}.* · *This election you've moved {place} {swing} for the {faction} ({rank} of {n})* · *(no one else yet)* · *Who moved {district} · this election* · *Levels 1–15* · *Levels 16–30* · *Level 31 and up* · *District Hero: the top of each bracket at the result, at +0.5 or more. 25 Political Capital and your name in the Herald.* · *District Hero, {district} · this election* · *Heroes: {district} ×{n}* · *You live in {district}, Irongate · move again from {weekday}* · *In Print*.

Help notes (tap the label, review 1 §5): *Where you live* (§6.1), *The Issues* (§7.1), *Who holds {place}* (the share note of review 2 §1.9 with *a home city never falls below half* replaced, in the capital, by *nobody holds a district until a party passes half*), *Close race* (*Three parties within ten points of each other here today. Party work in a close race pays +25 % Party XP, moves opinion +25 % and has better odds.*), *Comeback* (*A party that has just lost a district gets +5 % opinion a day on its work there, up to +30 %, until it wins it back or two weeks pass.*).

British English, no exclamation marks, no percentages for odds, times in the player's local clock.
