# Slice 4 — "The battleground": the screens

Game designer, 29 Sep 2026. The screen-by-screen spec for slice 4: the national map on phone and desktop, the journey screen, the Irongate district overview and district view, the move-residence flow, the Issues in the paper, and the ledger. Where a canvas mockup exists it is named and this document says what to keep and what changes; where none exists, this document is the mock. Rules and numbers are in `docs/design/slice-4-battleground.md` (cited as *design §n*).

**Phone first** (375 wide, supported from 360), desktop as the existing mockups do it (the map full-bleed with a side sheet; the paper in a column of 640). Every screen below is one tap or one choice, resumable, and reads its numbers from the server.

## 1. The look, and what already exists

The printed-matter look of `docs/mockups/MobileCity.dc.html`, `MobileRegion.dc.html`, `MobileJourney.dc.html` and `Capital.dc.html`: paper `#EFE6D2`, ink `#15181A`, faction colours Vanguard `#C39A3A`, Collective `#8C2B23`, Alliance `#4B7394`, Neutral `#8A8577`; Oswald caps for labels, Courier Prime for datelines and anything typed, Source Serif 4 for body, Playfair Display for headlines.

Components reused as they are: `Masthead`, `DeskList`, `OrdersList`, `TodayStrip`, `LettersRow`, `PollingDayRow`, `Plate`, `Ticket`, `Stamp`, `ResultModal` (kinds `action`, `political`, and a new `journey`), `BottomSheet`, `JobsCard` (the pattern for the residence card), `StoryScreen` (the pattern for the journey card's choice rows), `Picture`, `FactionCrest`, `Button`, `ProgressBar`, `Slate`, `Ballot`, `CountTable`, `CouncilCard`, `SeatGrid`, `OrderPaper`.

New components (plain props, no tRPC): `NationMap`, `CityPlate`, `JourneyScreen`, `JourneyCard`, `DistrictOverview`, `DistrictPlate`, `OpinionBars`, `TramBar`, `ResidenceCard`, `IssuesSection`, `IssueRow`, `LedgerLine`, `LedgerTable`, `DistrictCountTable`. Each is described where it appears.

Marks: the three-bar opinion gauge (`OpinionBars`) is the one new visual idiom: three thin bars in faction colours on a Neutral track, values to one decimal at the ends, the same on the nation plate, the district plate and the paper.

---

## 2. The national map

### 2.1 Phone (`MobileRegion.dc.html`, kept)

Route `/map/nation`. The Map tab toggles between **City** and **Nation** with a segmented control in the top bar (Oswald caps, two segments); below Level 10 the Nation segment is present and every plate reads *From Level 10*.

- The painted republic (`map.nation.day` / `.night`) fills the viewport with `react-zoom-pan-pinch`; the initial fit shows all five pins.
- **Pins** are edge labels as the mockup draws them (`.edge`: ink on ink, a 1px paper border, Oswald caps 11 px): *Irongate* · *Ashford · 12 min* · *Coalport · home · 12 min* · *Duskwall · 15 min* · *Clearwater · 25 min*, positioned at design §2.1. The current city's pin is inverted (paper on ink) and carries *you are here*. A locked pin (rival home, Clearwater) is drawn at 60 % opacity.
- The **rail line** is an SVG polyline overlay along the painted track, 2 px ink, dashed for locked legs.
- Tapping a pin opens the **city plate** (`CityPlate`) as a bottom sheet (the mockup's card): name (Oswald 600, 15 px caps), the role line in Courier (*Capital · 5 districts · two battlegrounds today* / *Home city of the Alliance* / *Battleground · no service yet*), `OpinionBars` for the city (Irongate: the average of five), the two Issues as chips (*Tram Fare Hike* · *Eviction Notices in Eastside*), the council line (*Votes in 3 days* / *Polls open until Saturday midnight*), and the CTA:
  - **Board · 20 Iron · 12 min** (`Button primary`, full width) for an open destination; *Needs 20 Iron* disabled otherwise;
  - **See the five districts** (`Button secondary`) when the player is in Irongate (the mockup's button);
  - a Courier line *Hostile ground · from a later edition* or *No service yet* for a locked one, and no button.
- The HUD is the slice-1 HUD; the tab bar is unchanged.

### 2.2 Desktop (`Region.dc.html`, kept where it agrees)

Route the same. The map fills the viewport; the **side sheet** (360 px, paper) on the right shows the selected city's plate with the same contents, plus the **routes table** under it (a printed timetable in Courier: *Irongate — Coalport · 12 min · 20 Iron*, five rows, the locked ones dimmed). The nation/city toggle sits in the top bar's left, beside the city name. Hover on a pin shows the name and time in a tooltip; click selects.

---

## 3. The journey screen (`MobileJourney.dc.html`, kept with changes)

Route `/journey`, shown in place of the map while `character.journey` is set; the Map tab lands here; the other tabs work. Paper background.

1. **Header:** Courier kicker *Third class · car 4*; Playfair 22 px *The 14:10 to Coalport* (the departure time is `boardedAt` in the player's clock, the train's "name").
2. **The progress line:** the two city names in Oswald caps at the ends, a 2 px track between them with a train mark that moves with `(now − boardedAt) / (arrivesAt − boardedAt)`, ticking on the client once a second; under it in Courier *{n} min to go · arrives 14:22*. At `arrivesAt` the screen replaces itself with the arrival modal (§4) on the next tick; the server is the authority and the client only asks.
3. **The sentence** (body italic 15 px, a 1px rule above and below): *You can close the game. You'll arrive either way, and Energy keeps refilling on the way.*
4. **The journey card** (`JourneyCard`), only when the journey drew one:
   - kicker *On the way · journey event* with an *Optional* tag at the right (Oswald caps);
   - the title (Playfair 700, 20 px) and the setup (body, ≤ 240 chars);
   - the choices as `StoryScreen` rows (full width, 52 px min, 1.5 px ink border; selected row inverted): title in body 600 and the detail line under it in Courier 11 px (*AGI check · about 62 % · +0.05 opinion in Coalport · +5 FXP*; the chance from the server's breakdown);
   - a sticky **Choose** under the rows is **not** used: tapping a row is the choice (one tap), with a 300 ms undo-free commit, as the ballot does not have; so the rows carry their numbers plainly and the setup says *one choice*;
   - after the choice, the rows collapse to the chosen one and the outcome (headline in Playfair 17 px, body ≤ 240) prints beneath with a `Stamp` (*Success* / *Partial* / no stamp for uncheck choices) at the right;
   - under the card, Courier: *Ignore it and you sleep through it. Nothing happens.*
5. **Fellow travellers:** left out in slice 4 (design §2.5); if the count is cheap, one Courier line *You and 2 others on this train*.
6. **While you ride:** two `LettersRow`-style rows: **Read the Paper** (*3 unread*) and **Polling Day** (the residence's row, as the paper shows it). No Dossier row (slice 8).

Desktop: the same column at 640 px, centred on the map's dark background, the map dimmed behind.

---

## 4. The arrival modal

`ResultModal kind="journey"`. The art panel is the destination's map at 30 % zoom on the station (Irongate: the Central Station crop); over it the stamp **Arrived** (success tone) and the place line *Irongate · Station & Market*. Headline *You're in the capital* (first arrival) / *Irongate* / *Home*; body: the journey card's outcome if it was answered on this modal or earlier (one line: *The passenger: +6 FXP, +0.03 opinion in Station & Market*), else *The train was on time. Nothing happened, which is rare.* Knock-on lines: *−20 Iron · ticket* · *The Herald is your paper while you're here* (visitors). If the journey card is unanswered, it is rendered inside the modal above the CTA (the same `JourneyCard`, compact), answerable until **Continue**. One CTA: **Continue** → the district view (Irongate) or the city map.

---

## 5. Irongate: the district overview and the district view

### 5.1 The district overview (`Capital.dc.html` on desktop; new on phone)

Route `/map/irongate`. The full `irongate-districts` image with five **district plates** (`DistrictPlate`, the mockup's `.plate`: ink, 1.5 px paper border, 150 px min, name in Oswald caps 15 px, a status line in Courier, a 6 px gauge in three colours) at the plate positions Old Town 0.13, 0.24 · Government Quarter 0.49, 0.17 · Station & Market 0.46, 0.50 · Eastside 0.86, 0.62 · Garrison Hill 0.15, 0.78 (the mockup's, checked against the art). The status line: *Battleground* / *Leans Alliance* / *Held by the Collective 52 %* / *Groundswell · Vanguard*. The player's current district's plate is inverted; the residence district carries a small house mark.

- **Phone:** the image with `react-zoom-pan-pinch`, fitted to width; the plates scale with the map down to a minimum of 120 px; tapping a plate opens the **district sheet** (bottom sheet, 60 dvh): the district's `Plate` (kicker *DISTRICT FILE · 03*, title, blurb), `OpinionBars` with the three percentages, three Courier lines (*Battleground today · +25 % FXP · +5 %* or *Not a battleground* · *This week: Tram Fare Hike* or *No Issue this week* · *Council seats: J. Varga (C) · Stein (V, ward)*), and two buttons: **Go to Station & Market · Tram · instant** (`Button primary`) and, for the district the player stands in, **Show places on the map** (`Button secondary`). Under the map, the **city line** in Courier on ink: *Irongate: Vanguard 21.0 · Collective 21.2 · Alliance 21.0* and the legend *Held (over 50 %) · Contested*.
- **Desktop:** as the mockup: the map with the plates, the side sheet with the district file and the two buttons, the Herald's ticker at the bottom (*The Herald* · the three city-0 headlines of the day, separated by ■).

### 5.2 The district view (`MobileCity.dc.html`, kept)

Route `/map/irongate/{district}`. The same image through the district's crop (design §4.2) as the initial viewport, pan and pinch beyond it; the numbered pins (`.poi`: 32 px ink discs with the pin number) at the location positions; the selected pin inverted with the paper halo.

- **Top bar:** left the edge button **Irongate** (back to the overview); the title *Irongate* with the subtitle in Courier *Station & Market district · battleground* (or *· leans Alliance*); right the HUD.
- **The plate** (`Plate`, folded to its header when a sheet is open): title the district's name, kicker *DISTRICT · YOU LIVE HERE* or *DISTRICT · VISITING*, children: `OpinionBars` with the three shares to one decimal, the state word (*Battleground* in Oswald caps; *Groundswell · Vanguard +15 %* when it applies), a second line in Courier when an ordinance is in force (*Ordinance: Tram Subsidy · 3 days left*), a third for the Issue (*Issue: Tram Fare Hike · Collective leads 120 to 85*), and the **ledger line** (`LedgerLine`, Courier 11 px): *This cycle you moved Station & Market +0.30 for the Collective (1st of 3)*.
- **The residence card** (`ResidenceCard`, §6) sits under the plate, above the pins' sheet, and folds with it.
- **The tram bar** (`TramBar`): a horizontal row of four chips at the bottom of the map, above the tab bar, Oswald caps 11 px on ink: *Eastside* · *Old Town* · *Gov. Quarter* · *Garrison Hill*; one tap navigates; the mockup's *Tram to Eastside · instant, free* ticket at the Junction is replaced by this bar on every district (the Junction keeps its blurb).
- **The location sheet:** as the city sheet today: `{n} · {kind}` kicker, the name, the tickets. New ticket tags from the server's `ActionView`: *Battleground · +25 % FXP · +5 %* (political actions in a battleground district), *Issue: Tram Fare Hike · +50 % swing* (tagged), *Groundswell · +15 %* (members of the faction with one), *Members only* (a rival at an HQ, the whole ticket dimmed, no button). Central Station's sheet carries, under its tickets, a **Trains** card in the `JobsCard` style: *Board the train to Coalport · 20 Iron · 12 min* (the home city; `Button primary`) and a text button *See the nation map*. Order of tags on a ticket: cost change · Issue · Battleground · Groundswell · ordinance · Party order.
- **The result modal** (`ResultModal kind="action"`): the opinion tile's breakdown lists *Battleground +25 %*, *Issue: Tram Fare Hike +50 %*, *Groundswell +15 %* and *Street Permits +15 %* as lines, then the district's share before and after; the FXP tile lists *Battleground +2* beside *Rested* and *Party order*; the check breakdown lists *Battleground +5 %*; knock-on lines: *Tram Fare Hike: Collective +10 momentum (leads 130 to 85)* and, when a threshold is crossed at the next boundary, nothing (states change at the boundary and the paper says so).

Desktop: the map full-bleed with the crop as the initial viewport and the location sheet at the right, as `City.dc.html`; the tram bar becomes a row of five district links in the side sheet's header.

---

## 6. Moving residence

### 6.1 The residence card (`ResidenceCard`, the `JobsCard` pattern)

On every district view under the plate; on the home city map under its plate. Kicker *RESIDENCE*; one state line and one button:

| State | Line 1 (body 15 px) | Line 2 (Courier 11 px) | Button |
|---|---|---|---|
| Visiting, may move | You live in Coalport | Register here to vote and stand in Eastside · 7 days between moves | **Register in Eastside · 500 Iron** (`primary`) |
| Visiting, below Rank 2 | You live in Coalport | Activists may register in the capital. 400 Faction XP makes an Activist. | none |
| Visiting, in cooldown | You live in Eastside | You can move again from Thursday | none |
| Not enough Iron | You live in Coalport | Register here to vote and stand in Eastside | **Needs 500 Iron** (disabled) |
| Resident here | You live in Eastside | Registered Monday · you vote from Thursday · move again from Monday | none |
| At home, resident elsewhere | You live in Eastside | Register in Coalport to vote at home again · 500 Iron | **Register in Coalport · 500 Iron** |

A second row on the same card, everywhere in Irongate: **A room in Irongate** · *100 Iron · 7 days · Rested cap +50* → **Take a room · 100 Iron** (`outline`), or *Room until Sunday · Rested cap 250* with **Renew · 100 Iron** when one runs. Under the Evictions effect the price line reads *50 Iron · Eviction Notices*.

### 6.2 The sheet (one choice)

Tapping **Register** opens a `BottomSheet`, title *Register in Eastside · 500 Iron*. Five short lines in body 14 px with a Courier tick at the left of each, so the consequences are read before the tap:

- *You vote and stand in Eastside from the next poll that opens (Thursday).*
- *Your Coalport candidacy ends; your Coalport seat, if any, passes to the branch.* (only when either applies; in the failure colour)
- *Party orders come from the capital from tomorrow. The Herald is your paper.*
- *Your job, Standing, Iron and rank are untouched.*
- *Moving again: from Monday.*

One button, **Register · 500 Iron** (`primary`, full width, safe-area padded). Closing the sheet is the only other action.

### 6.3 The result

`ResultModal kind="political"`: the Herald's masthead strip with the stamp **Registered**; headline *Eastside has a new voter*; body *The Herald is your paper from tomorrow. Eastside votes from Thursday. Union House expects you at six.* (the faction's HQ name from content); knock-on lines *−500 Iron · 3,910 left* · *Coalport seat vacated* when it applies. **Continue** → the district view with the card in its *Resident here* state.

The room: no sheet, one tap on the button, a modal with stamp **Taken**, headline *A room in Irongate*, body *Seven nights, a window on the tram line. Rested banks to 250 until Sunday.*, knock-on *−100 Iron*.

---

## 7. The Issues in the paper

### 7.1 The Issues section (`IssuesSection`)

In every edition, between the headlines and Polling Day (§3.3's order), kicker **THE ISSUES** on a double rule. Rows (`IssueRow`, 64 px min, dotted rules between):

- Left: the district or city in Oswald caps 10 px (*STATION & MARKET* / *COALPORT*) over the Issue's name in body 600 16 px.
- Middle, under the name: a three-segment momentum bar (`OpinionBars` in momentum mode: the three faction colours sized by momentum, no Neutral track) with the totals in Courier 11 px beneath: *Collective 120 · Vanguard 85 · Alliance 40 · resolves Sunday midnight*.
- Right: the leader's small crest (`FactionCrest` 12 px) and the word *leads* in Courier; or *open* when nobody has momentum.
- Tapping a row expands it (one at a time): the blurb (body italic 13 px), the three stances as three lines with the crests, the effect line (*Resolved: tickets from Irongate half price for the week*), and a text button **Where to act** → the district view (Irongate) or the city map, with the tagged pins highlighted (a small *Issue* dot on the pin).

Order: the residence city's two Issues; then the capital's two (if the residence is not the capital); then a folded row *Ashford · Duskwall · Coalport* (Oswald caps) that expands to the other cities' four to six rows. On Monday morning the section carries a Courier line above the rows: *New this week*. On the Monday after a resolution, the rows are the new Issues and the results are headlines (`hl.*.issue-resolved`), with the effect shown on the desk (*Tram Fare Hike: tickets from Irongate half price until Sunday*).

### 7.2 The Polling Day row in the capital

The slice-3 `PollingDayRow`, with these capital states added:

| State | Line 1 | Line 2 | Tap → |
|---|---|---|---|
| Registered, first poll not yet open | Registered in Eastside | You vote from Thursday · the count every fifth night | The slate |
| Polls open, not voted | **Cast your ballot in Eastside** | Two seats · any name · secret · until Saturday midnight | The ballot |
| The count | Eastside went Collective, Vanguard | Irongate: 4 V · 3 C · 3 A · turnout 3 of 5 in Eastside | The count (§8) |
| The council sits, councillor | **The council sits** · vote on the ordinance | Three blocs, six of ten to pass · divides Tuesday midnight | The council |

### 7.3 In Print

The `hl.ig.hero` and `hl.ig.quoted` templates render as personal headlines with the In Print kicker (Oswald caps *IN PRINT*) and, for the hero, a small medal mark (a 16 px ink rosette) before the name. No front page: the seat keeps that.

---

## 8. The count in the capital (`DistrictCountTable`)

Route `/council/count`, the slice-3 count screen with a **district switcher** (five chips under the `Plate`, Oswald caps, the player's district first and selected). Per district:

- **The bloc table** (three rows, one per faction, with the crest): **Ballots** · **Opinion** · **Score** · **Seats**, and under it in Courier the weight line: *Ballot half worth 15 % (3 ballots of 10) · opinion half 85 %*. The seat cells show a thin ink bar per seat won.
- **The candidate table** (the slice-3 `CountTable`) grouped by faction in bloc order, each candidate's row with the faction mark or avatar, ward vote, endorsements, votes, total; the two elected rows carry the seat bar; *the line* between the seats and the rest inside each faction's list.
- Under both, Courier: *Score = ballot half × ballot share + opinion half × opinion share. Two seats by D'Hondt. Ties: ballots, opinion, the returning officer's draw.*
- **The ledger table** (`LedgerTable`, §9) for the district under the count.

The `Plate` header: kicker *IRONGATE COUNCIL · THE COUNT*, title *Sunday's result*, Courier *Ten seats · Vanguard 4 · Collective 3 · Alliance 3 · ward members 7 / 10 · final*.

The council (`/council`) is the slice-3 chamber with ten tiles in five pairs labelled by district (`SeatGrid` with group captions), the order paper with the three branch motions marked *the {faction}'s motion · {secretary}*, and the caption *Six of ten to pass. The council divides at {at}.*

---

## 9. The ledger

### 9.1 The line (`LedgerLine`)

On the district plate, the city plate and the Me tab (design §11.2): Courier 11 px, *This cycle you moved {place} {swing} for the {faction} ({rank} of {n})*; `{swing}` to two decimals with its sign, trimmed (*+1.3*, *+0.05*); *(no one else yet)* when the player is the only contributor; the line is absent when the player has moved nothing there this cycle.

### 9.2 The table (`LedgerTable`)

On the count page per district and on the district sheet of the overview (folded, *Top of the ledger* → expands): kicker *THE LEDGER · THIS CYCLE*, a printed table: **#** · **Name** · **Faction** · **Level** · **Moved**; the top three per level bracket, brackets separated by a 1px rule with the bracket in Courier at its right (*Levels 1–15*); the player's own row on paper-2 with *you*; the hero of each bracket carries the rosette. Under it in Courier: *District Hero: the top of each bracket at the count, at +0.5 or more. 25 Political Capital and the Herald.*

### 9.3 The Me tab

Under the party card: *Resident of Eastside, Irongate · move again from Monday* (tap → the district view); the ledger lines (one per place moved this cycle); *District Hero, Eastside · this cycle* while the title runs, and *Heroes: Eastside ×1* beneath it for ever; the PC line gains its new sources in Courier: *District Hero 25 · Issue top five 4*.

---

## 10. Phone layout rules

- The nation map fits all five pins at the initial zoom on 360 px; pins never overlap the HUD or the tab bar (the art's cities are well spread; the Clearwater pin sits above the tab bar's safe area).
- The journey screen's header, progress line, sentence and the card's title and first choice row are above the fold on 375 × 667; the outcome scrolls.
- The district overview's plates keep a 120 px minimum and never overlap at the initial fit; the sheet is at most 60 dvh so the map stays visible.
- The district view's plate folds to its header when a location sheet is open; the tram bar stays visible above the tab bar at all times, 44 px high.
- The Issues section's rows are 64 px and the section shows at most four rows unexpanded (the residence's two and the capital's two); the rest fold.
- The count's bloc table and candidate table use Oswald numerals at 13 px; no horizontal scroll at 360 px.
- Desktop (≥ 1024): the paper stays a 640 px column; the maps are full-bleed with the side sheet; the count and the council render in the paper's column with the district switcher as tabs.

---

## 11. Copy (new strings, for `copy.ts`)

*Nation* · *City* · *From Level 10* · *you are here* · *home* · *Board · {fare} Iron · {min} min* · *Needs {fare} Iron* · *See the five districts* · *Hostile ground · from a later edition* · *No service yet* · *The {time} to {city}* · *{n} min to go · arrives {time}* · *You can close the game. You'll arrive either way, and Energy keeps refilling on the way.* · *On the way · journey event* · *Optional* · *Ignore it and you sleep through it. Nothing happens.* · *Arrived* · *You're in the capital* · *The train was on time. Nothing happened, which is rare.* · *Irongate* · *District file · {nn}* · *Battleground* · *Leans {faction}* · *Held by the {faction} {share} %* · *Groundswell · {faction} +{pct} %* · *Not a battleground* · *Battleground today · +25 % FXP · +5 %* · *This week: {issue}* · *No Issue this week* · *Council seats: {a} · {b}* · *Go to {district} · Tram · instant* · *Show places on the map* · *Held (over 50 %) · Contested* · *District · you live here* · *District · visiting* · *Members only* · *Board the train to {city} · {fare} Iron · {min} min* · *See the nation map* · *Residence* · *You live in {place}* · *Register in {district} · 500 Iron* · *Needs 500 Iron* · *Register here to vote and stand in {district} · 7 days between moves* · *You can move again from {weekday}* · *Registered {weekday} · you vote from {weekday2} · move again from {weekday3}* · *Activists may register in the capital. 400 Faction XP makes an Activist.* · *Register · 500 Iron* · *Registered* · *{district} has a new voter* · *A room in Irongate* · *100 Iron · 7 days · Rested cap +50* · *Take a room · 100 Iron* · *Renew · 100 Iron* · *Room until {weekday} · Rested cap {cap}* · *Taken* · *The Issues* · *leads* · *open* · *resolves Sunday midnight* · *New this week* · *Where to act* · *Registered in {district}* · *Cast your ballot in {district}* · *Two seats · any name · secret · until {until}* · *Ballot half worth {pct} % ({n} ballots of 10) · opinion half {pct2} %* · *Score = ballot half × ballot share + opinion half × opinion share. Two seats by D'Hondt. Ties: ballots, opinion, the returning officer's draw.* · *the {faction}'s motion · {secretary}* · *Six of ten to pass. The council divides at {at}.* · *This cycle you moved {place} {swing} for the {faction} ({rank} of {n})* · *(no one else yet)* · *The ledger · this cycle* · *Levels 1–15* · *Levels 16–30* · *Level 31 and up* · *District Hero: the top of each bracket at the count, at +0.5 or more. 25 Political Capital and the Herald.* · *District Hero, {district} · this cycle* · *Heroes: {district} ×{n}* · *Resident of {district}, Irongate · move again from {weekday}* · *In Print*.

British English, no exclamation marks, times in the player's local clock.
