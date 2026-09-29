# Slice 3 — "The first vote": the political screens

Game designer, 29 Sep 2026. The screen-by-screen spec for the plan's "Political screens (mocks)": standing, endorsements, the ballot, results, the ordinance vote, plus the morale and ordinance lines on screens that already exist. There is no canvas mockup for these; this document is the mock. Rules and numbers are in `docs/design/slice-3-politics.md` (cited as *politics §n*).

**Phone first** (375 wide, supported from 360), desktop as the existing mockups do it (the paper in a column of 640, the map with a side sheet). Every screen below is one tap or one choice, resumable, and reads its numbers from the server.

## 1. The look, and what already exists

The printed-matter look of `docs/mockups/MobilePaper.dc.html` and `MobileMission.dc.html`: paper `#EFE6D2`, ink `#15181A`, Playfair Display for headlines, Source Serif 4 for body, Oswald caps for labels, Courier Prime for datelines, footnotes and anything "typed". Rules are double (3px double ink) for section heads, dotted (`#9b917a`) between rows.

Components in `packages/ui/src/components` this slice reuses as they are:

| Component | Used for |
|---|---|
| `Masthead`, `DeskList`, `OrdersList`, `TodayStrip` | The paper, unchanged |
| `Plate` (title, kicker, children) | The city plate (morale word, ordinance line) and the council screen's header |
| `Ticket` | Unchanged; gains ordinance tags in its tags line (the tags come from the server's `ActionView`) |
| `Stamp` (`tone`, `label`) | *Ballot cast*, *Filed*, *Voted*, **ELECTED** |
| `ResultModal` | The vote, filing and council-vote results (a new `kind: 'political'`, §9) |
| `BottomSheet` | The ordinance menu (Propose), the platform picker |
| `JobsCard` | The **pattern** for the council card: a card on a location sheet with a state line and one button |
| `StoryScreen` | The **pattern** for choice lists: full-width rows, one selected, a sticky CTA, the Courier caption under it |
| `Picture` | Avatars on lists; the halftone photograph on the front page |
| `FactionCrest` | The small mark in an NPC's avatar ring |
| `Button` (`primary`, `secondary`, `outline`) | CTAs |
| `ProgressBar` (`tone: 'ink'`) | Endorsements *n / 2*; the term's days |
| `LettersRow` | The **pattern** for the Polling Day row on the paper |

New components (plain props, no tRPC, as the slice-0 rule): `PollingDayRow`, `FrontPage`, `CandidateRow`, `Slate`, `Ballot`, `CountTable`, `CouncilCard`, `SeatGrid`, `OrderPaper`, `OrdinanceRow`, `OrdinanceMenu`. Each is described where it appears.

Marks: a player line shows the avatar (32 px ring); an NPC line shows the faction's small mark (`FactionCrest`, 12 px) centred in the same ring on paper-2, and the word **ward** in Oswald caps where a rank title would be (politics §5.4).

---

## 2. The Morning Paper: the Polling Day row and the front page

### 2.1 Polling Day (every edition, between Party orders and Letters)

A row built like `LettersRow`: a 56 px full-width button with a kicker, a line and a chevron. Kicker **POLLING DAY** (Oswald caps, 10 px, letter-spaced, above a 1px rule). One of these states, chosen by the server:

| State | Line 1 (body, 15 px) | Line 2 (Courier, 11 px) | Tap → |
|---|---|---|---|
| Nominations, not eligible to stand | Nominations open in Coalport | Coalport votes from Thursday · see who's standing | The slate (§3) |
| Nominations, eligible (Rank 3, Known) | **Stand for the council** · 10 PC | Nominations close Tuesday midnight | The slate with the declare card open (§3.2) |
| Nominations, filed | On the slate · endorsements 1 / 2 | Do today's orders and the branch backs you | The slate |
| Polls open, not voted | **Cast your ballot** | Polls open until Saturday midnight · the ballot is secret | The ballot (§4) |
| Polls open, voted | Ballot cast for Anna Weiss | The count is in Sunday's paper | The ballot, read-only (the chosen row marked) |
| The count (the morning after) | Polls closed: Weiss tops the poll | Seven seats, 6 by ward members · turnout 3 of 9 | The count (§5) |
| The council sits, the player is a councillor | **The council sits** · vote on the ordinance | Divides Tuesday midnight | The council (§6) |
| Below Rank 2 | Coalport votes from Thursday | Activists vote. 400 Faction XP makes an Activist. | Nothing (no chevron) |

"Midnight" is the boundary in the player's local clock, rendered by the same helper as the shift ticket. The Paper tab's dot is shown while a ballot can be cast and has not been, and while a councillor's ordinance vote is open and not cast; never for nominations.

### 2.2 The front page (the morning a seat is won)

Only on the first edition after a count in which the player took a seat. It replaces the headline block at the top of the paper, under the masthead, in this order (phone, one column):

1. **The photograph.** The player's avatar (`Picture`, 256 width) as a printed halftone: greyscale, slight contrast, a 1px ink border, 4:5, 160 px wide, centred. CSS only (`filter: grayscale(1) contrast(1.15)` and a dotted-pattern overlay at 30 % opacity); no new asset. Under it a Courier caption, 11 px, centred: *{name}, Organiser, elected to Coalport Council*.
2. **The stamp**, `Stamp tone="success" label="ELECTED"`, absolutely positioned over the photograph's top-right corner (rotated as the component does), animated in on open (`animate-stamp`), once. Reopening the paper shows it without the animation.
3. **The headline** (Playfair 900, 34 px, centred): *{name} Takes a Seat on Coalport Council* or *{name} Tops the Poll in Coalport*.
4. **The deck** (Playfair italic 700, 17 px, `#3d3a33`, centred), from the template (politics §8).
5. **The count table** (§5.2) with the player's row highlighted.
6. A sticky bottom CTA **To the council** (`Button primary`, full width, safe-area padded). The rest of the paper follows below as usual.

Desktop: the same column at 640 px; the photograph floats left of the headline at 200 px wide with the stamp on it.

### 2.3 Losing, and the voter's morning

No front page. The count headline and the player's personal line (*Misses the Last Seat by 3* / *Your Vote Counted: …*) appear as ordinary headlines in the headline block, and the Polling Day row reads *Polls closed: … tops the poll* → the count.

---

## 3. The slate (nominations)

Route `/council/slate`. Header: `Plate` with kicker *COALPORT COUNCIL · NOMINATIONS* and title *The slate*; under the title, in Courier: *Nominations close Tuesday midnight · polls open Wednesday*.

### 3.1 The list

A `Slate` of `CandidateRow`s, players first in filing order, then NPCs in profile order (labelled with a 1px rule and *Ward candidates* in Oswald caps). Each row (min 64 px):

- Left: the avatar ring or the ward mark.
- Middle: **name** (body 600, 16 px); second line in Oswald caps 10 px: *Organiser · Trusted in Coalport · endorsements 2 / 2* (NPC: *ward · Known in Coalport*); third line, body italic 13 px, the platform line.
- Right: **Endorse · 10 PC** (`Button outline`, 36 px) when the viewer may endorse this candidate; *Endorsed* (Courier) once they have; nothing on NPC rows; *You* on the viewer's own row.
- Tapping the row (not the button) expands it to show *Endorsed by Petra Holm (the branch), M. Kovac* and the ward vote (*Ward vote 40 · from 200 Successes*). One row open at a time.

Endorse is one tap; the row's button becomes *Endorsed* and the count moves; a small line under the list confirms *You endorsed {name} · −10 PC*. Not enough PC: the button reads **Needs 10 PC** (disabled), the same pattern as *Needs 10 Energy*.

### 3.2 The declare card (eligible players only)

Above the list, a card in the `JobsCard` style (paper-card, 1px ink border):

- Kicker *STAND FOR THE COUNCIL*. Three requirement lines with a tick or a cross in Courier: *✓ Rank 3, Organiser* · *✓ Known in Coalport (74 Successes)* · *2 endorsements by Tuesday midnight*. Below Rank 3 or Known: the crosses and no button (*Needs Rank 3 · 1,240 FXP to go*).
- **Your line**: three radio rows (the faction's platform lines, politics §6.4), one selected by default.
- Button **Declare · 10 PC** (`Button primary`, full width). Under it, Courier: *The deposit is spent when your name is printed on the ballot. Struck for want of endorsements: returned.*
- After declaring, the card becomes the **candidacy card**: *On the slate · endorsements 1 / 2* with a `ProgressBar tone="ink"` (max 2), the line *All orders carried out · the branch endorses you* when it applies, the small-branch note *The branch will make up the number* when it applies (politics §6.3), and a text button **Withdraw** (outline, right-aligned, Courier caption *The deposit stays with the branch*). Withdraw is one tap; no dialog; the caption is the warning, as the job switch does it.

The declare result is a modal (§9): stamp **Filed**.

---

## 4. The ballot (polls open)

Route `/council/ballot`. Header: `Plate` kicker *COALPORT COUNCIL · POLLS OPEN*, title *Your ballot*, Courier line *Seven seats · one vote · secret and final · polls close Saturday midnight*.

The list is the `Slate` in ballot mode: the same rows, no Endorse buttons, and a radio mark at the right (a 24 px ring; filled ink when selected). Tapping anywhere on a row selects it. Order: players first, then NPCs, as the slate.

Sticky bottom: **Cast your ballot for Anna Weiss** (`Button primary`, disabled reading *Choose a name* until a row is selected). Under it in Courier: *One ballot, final. The count is at 01:00 on Sunday.*

Already voted: the chosen row carries *Your ballot* in Courier instead of the ring, the others are dimmed, the CTA is replaced by the line *Ballot cast · the count is in Sunday's paper*. There are no totals anywhere on this screen (politics §4.3).

The result is a modal (§9): stamp **Ballot cast**.

---

## 5. The count

Route `/council/count`, also embedded in the front page (§2.2) and reached from the Polling Day row on the morning after.

### 5.1 Header

`Plate` kicker *COALPORT COUNCIL · THE COUNT*, title *Sunday's result*, Courier: *Turnout 3 of 9 members · NPC seats 6 / 7 · final*.

### 5.2 `CountTable`

A printed table, one row per candidate in finishing order, dotted rules, Oswald caps header: **#** · **Name** · **Ward** · **End.** · **Votes** · **Total**. The first seven rows carry a thin ink bar at the left (seats); the eighth onward none, and a 1px rule between the seventh and eighth with *the line* in Courier at its right. The player's own row (if they stood) is on paper-2 with *you* after the name; the row they voted for carries *your vote* in Courier. NPC rows show the ward mark before the name. Numbers right-aligned in Oswald.

Under the table, in Courier 11 px: *Total = ward vote + 3 × endorsements + members' votes. Ties: votes, endorsements, standing, filing.* One line, always shown: the maths is never hidden.

Desktop: the same table at full width.

---

## 6. The council (the chamber)

Route `/council`. Reached from the front page, the Polling Day row, the HQ sheet's council card (§7) and the Me tab's office line.

### 6.1 Header

`Plate` kicker *COALPORT COUNCIL · SITTING*, title *The council*, Courier: *Term ends Thursday · NPC seats 6 / 7 · ordinance in force: Shift Hours Order · 3 days left*.

### 6.2 `SeatGrid`

Seven tiles in a row that wraps (4 + 3 on phones), each 64 px: the avatar or ward-mark ring, the name in Oswald caps 10 px below, the seat number. The viewer's tile has a 2px ink outline. Tapping a tile shows a small popover with the name, rank or *ward*, standing, and (after the division) *voted for {ordinance}*.

### 6.3 `OrderPaper` (term days 0–1)

Kicker *THE ORDER PAPER* with the double rule. Rows of `OrdinanceRow`:

- Left: an item number in Courier (1, 2, 3, 4).
- Middle: **name** (body 600), second line the one-line text (italic 13 px), third line in Oswald caps the effect (*JOB SHIFTS −1 ENERGY · 5 DAYS*). Item 1 carries *the branch's motion · Secretary Holm* in Courier; a proposal carries *moved by {name}*.
- Right: the radio ring (a councillor who has not voted); *your vote* in Courier once cast; after the division, the number of votes in Oswald.
- A final row **Against all**, same shape, no effect line.

Under the paper: **Propose · 20 PC** (`Button outline`, full width) while the councillor has not proposed and fewer than three proposals stand; it opens the `OrdinanceMenu` (§6.5). Otherwise a Courier line: *You moved Ward Fund* or *The order paper is full*.

Sticky bottom for a councillor who has not voted: **Vote for Shift Hours Order** (disabled *Choose a motion* until a row is selected); Courier under it: *One vote, public in the chamber, final. The council divides at 01:00 on Tuesday.* After voting: the line *Vote recorded · the division is in Tuesday's paper*.

For a resident who is not a councillor the same screen is read-only: the seats, the order paper without rings, and the in-force line. That is how a voter sees what their council is doing.

### 6.4 After the division (term days 2–4)

The order paper shows each item's votes and the passed item stamped in-line with a small `Stamp tone="success" label="Passed"` (18 px text variant via `className`), or *Council rose without a motion* in the failure colour. The in-force line in the header counts down.

### 6.5 `OrdinanceMenu` (a `BottomSheet`)

Title *Propose an ordinance · 20 PC*. Ten rows (`OrdinanceRow` without the ring): name, line, effect caps. Rows already on the order paper are dimmed with *on the paper*. Tapping a row proposes it at once (one tap; the sheet's title says the price; not enough PC dims every row with *Needs 20 PC* in the title). The sheet closes on the modal (§9, stamp **Moved**).

---

## 7. The council card on the HQ sheet

On the faction HQ location sheet (Union Hall, Beacon House, the Assembly Rooms), under the tickets and above the Jobs card if any: a `CouncilCard` in the `JobsCard` style. Kicker *COALPORT COUNCIL*; one state line and one button, mirroring the Polling Day row (§2.1) so the map route and the paper route lead to the same place:

- *Nominations open · closes Tuesday* → **See the slate** / **Stand for the council · 10 PC**
- *Polls open · closes Saturday* → **Cast your ballot** / *Ballot cast*
- *The council sits · divides Tuesday* → **Vote on the ordinance** (councillors) / **See the council**
- *Ordinance in force: Shift Hours Order · 3 days left* as a second Courier line whenever one is in force.

Plus, for a filed candidate on a day the orders are done: *All orders carried out · the branch endorses you*.

---

## 8. The city plate, tickets and the Me tab

- **The plate** (`Plate`): title *Coalport*, kicker *HOME CITY*, children: *Collective 84.0 % · Fired up* (the state word in Oswald caps; *Unrest* in the failure colour), and a second line when an ordinance is in force: *Ordinance: Shift Hours Order · 3 days left* (Courier). On phones the plate already folds to its header when a sheet is open; the two lines fold with it.
- **Tickets** (`Ticket`): the server adds ordinance tags to the tags line, before the Party-order tag: *Rally Permits: 10 Energy* (and the Energy stub shows 10), *Open Doors: +4 %* (and the odds include it; the breakdown lists *Open Doors +4 %* as a bonus row), *Ward Fund: +25 % Iron*, *Public Meetings: +25 % FXP*, *Reading Room Grant: 35 Energy*. Shift tickets: *Shift Hours: 3 Energy*.
- **The result modal** (`ResultModal`): bonus lines named after the ordinance and the morale state (*Fired up: +1 FXP*, *Ward Fund: +5 Iron*), the same pattern as *Rested* and *party order*; a knock-on line when a threshold is crossed (*Coalport: Fired up · +10 % Faction XP at home*).
- **The Me tab**: a line under the party card: *Councillor, Coalport · term ends Thursday* (tap → the council), or *No office · Organisers may stand for the council* at Rank 3, or nothing below Rank 3. The PC value with its sinks listed in Courier: *Political Capital 45 · declare 10 · endorse 10 · propose 20*.
- **The HUD**: PC shown on phones once PC > 0 (politics §15 Q10); nothing else changes.

---

## 9. The result modals (one modal each, `ResultModal` kind `political`)

No art panel: the modal's top section is the masthead strip of the city's paper (the paper name in Playfair 22 px on a 3px double rule) with the stamp over its right end, in place of the map crop. Sections: stamp and place · headline and text · knock-on lines · **Continue** only. No *How it went*, no reward tiles (nothing rolled).

| Act | Stamp | Headline | Text (≤ 240 chars) | Knock-on lines |
|---|---|---|---|---|
| Cast a ballot | **Ballot cast** (success) | Your ballot is in the box | One vote for {name}. The Clarion carries the count on Sunday morning. Nobody sees who you voted for. | *Coalport morale +0.5 → 84.5 %* |
| Declare | **Filed** (success) | Your name is on the slate | Two endorsements by Tuesday midnight and your name is printed. Do today's orders and the branch backs you. | *−10 PC · 35 left* |
| Endorse | **Endorsed** (success) | {name} has your name | An endorsement is public and final. {name} needs {n} more by Tuesday midnight. | *−10 PC · 25 left* |
| Withdraw | **Withdrawn** (partial) | Your name comes off the slate | The deposit stays with the branch. Nominations open again on Friday. | — |
| Propose | **Moved** (success) | {ordinance} is on the order paper | {ordinanceLine} The council divides at 01:00 on Tuesday. | *−20 PC · 25 left* |
| Council vote | **Voted** (success) | Your vote is recorded | For {ordinance}. Public in the chamber, final. The council divides at 01:00 on Tuesday; the Clarion prints the result. | — |

The seat itself has no modal: the front page (§2.2) is its moment.

---

## 10. Phone layout rules (as slice 2's §12.3)

- Lists use full-width rows ≥ 56 px, one selected state, and a sticky CTA with safe-area padding; on a 375 × 667 phone the header and at least five rows are visible above the CTA.
- The front page's photograph, stamp, headline and deck fit above the fold with the CTA visible; the count table scrolls.
- The `BottomSheet` for the ordinance menu is at most 80 dvh and scrolls its ten rows.
- No horizontal scroll at 360 px; the count table's six columns use Oswald numerals at 13 px and abbreviate *Endorsements* to *End.*
- Desktop (≥ 1024): the slate, ballot, count and council render in the paper's 640 px column; the HQ sheet stays a side sheet with the council card inside it.

---

## 11. Copy (new strings, for `copy.ts`)

*Polling Day* · *Cast your ballot* · *Cast your ballot for {name}* · *Choose a name* · *One ballot, final. The count is at {hh:mm} on {weekday}.* · *Ballot cast · the count is in {weekday}'s paper* · *Stand for the council · 10 PC* · *Declare · 10 PC* · *Needs 10 PC* · *Endorse · 10 PC* · *Endorsed* · *You endorsed {name} · −10 PC* · *On the slate · endorsements {n} / 2* · *All orders carried out · the branch endorses you* · *The branch will make up the number* · *Withdraw* · *The deposit stays with the branch* · *See who's standing* · *See the slate* · *Ward candidates* · *ward* · *NPC seats {n} / 7* · *Turnout {n} of {m} members* · *the line* · *your vote* · *you* · *To the council* · *The council sits · vote on the ordinance* · *The order paper* · *the branch's motion · {secretary}* · *moved by {name}* · *Against all* · *Propose · 20 PC* · *Needs 20 PC* · *on the paper* · *The order paper is full* · *Vote for {ordinance}* · *Choose a motion* · *One vote, public in the chamber, final. The council divides at {hh:mm} on {weekday}.* · *Vote recorded · the division is in {weekday}'s paper* · *Passed* · *Council rose without a motion* · *Ordinance: {name} · {n} days left* · *Councillor, {city} · term ends {weekday}* · *No office · {rank3Title}s may stand for the council* · *Fired up* · *Steady* · *Unrest* · *{name}, {rank}, elected to {city} Council* · *ELECTED*.

British English, no exclamation marks, times in the player's local clock.
