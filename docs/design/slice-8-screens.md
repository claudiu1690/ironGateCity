# Slice 8 — "A life in the city": the screens

Game designer, 4 Oct 2026. The screen-by-screen spec for slice 8: the Wardrobe block on the Me tab, the item card, the slot chooser and the outfit chips, shops as cards on places, the full wardrobe sheet, the Dossier tab with its name cards and Case Files, the exposé flow (three steps), selling at a station, the two patron cards and the Me tab's patron clocks, the flat on the residence card and the Me tab, the Legacy record and its perks, the season card, the Hall of Fame, the paper's new rows, empty states, phone and desktop, and what sits above the fold. Rules and numbers are in `docs/design/slice-8-life.md` (cited as *design §n*); the research behind the Wardrobe is `docs/design/inventory-research.md` (*research §n*). Where a slice-1 to slice-7 screen already does the job it is named and only the change is given.

**Phone first** (375 wide, supported from 360), desktop as the existing screens. **Every string a player reads is in everyday words** (GDD §1.5, design §1.1): no *inventory*, *equipment*, *slot*, *tier*, *armour*, *CHA*, *utility*, *loadout*, *Black Market*, *NPC*; the only numbers on an item card are its Charisma and its price; no percentage for odds anywhere.

## 1. The look, and what already exists

The printed-matter look of slices 1–7. Components reused as they are: `HudBar`, `Ticket`, `MissionTicket` and `MissionBriefing`, `Stamp`, `ResultModal` (kinds `action`, `political`, `mission`, `story`), `BottomSheet`, `StoryScreen` (the exposé is a story), `JobsCard` (the shop card and the patron card are its shape), `ArtHeader`, `LettersRow`, `ProfileSheet`, `HelpButton` and the help notes, `Picture`, `FactionCrest`, `Button`, `ProgressBar`, `NationBar`, the residence card and sheet, the paper's rows, the Me tab's rows, the journey screen.

New components (plain props, no tRPC): `WardrobeBlock` (the Me tab's block), `OutfitChips`, `SlotCard`, `SlotChooser` (a `BottomSheet`), `ItemCard`, `ShopCard`, `SellSheet`, `WardrobeSheet`, `DossierTab`, `NameCard`, `EntryRow`, `CaseFileCard`, `InformantRow`, `ExposeStory` (a `StoryScreen` with the file picker as step 1), `StationSellCard`, `PatronCard` (the place's card), `PatronClock` (the Me tab's row with the bar), `RequestRow` (Letters), `HomeCard`, `LegacyBlock`, `LegacyEntryRow`, `PerkRow`, `SeasonCard`, `HallOfFamePage`, `ClockRow` (the desk's *Ahead* row).

---

## 2. The Me tab: the Wardrobe block (`WardrobeBlock`)

Under the stats block (Health, Heat, the record; slice 5 §2.4) and above the scoreboard lines. The Me tab's order from this slice: the party card · the stats block · **Wardrobe** · **Patrons** (§6.2) · **Where you sleep** (§7.2) · **Legacy** (§8) · the offices and the ladder (slice 7) · the scoreboard and residence lines.

1. **Kicker *WARDROBE*** (dotted-underlined: the `wardrobe` note) with, at the right in Courier, ***Charisma 17*** (dotted: the `charisma` note). The slice-2 *Wearing* row is replaced by this block.
2. **`OutfitChips`**: a row of chips in Oswald caps 11 px, 36 px high: **TOWN** · **PLAIN CLOTHES** · **EVENING** (the third only with a flat; dimmed with *pay the rent* under it when the rent has lapsed). The worn outfit is inverted (paper on ink). One tap changes the whole set at once: no modal, the chips swap, the four slot cards redraw, the Charisma figure changes. When the worn set matches no saved outfit, no chip is inverted and a text button **Keep this as Town** (or the last-worn outfit's name) sits at the row's right; tapping saves and inverts. Under the chips a Courier 11 px line: *Town · Charisma 17 · recognised on rival ground* / *Plain clothes · Charisma 2 · unnoticed on rival ground* / *Evening · Charisma 25 · dressed for the Casino*. In the cells, the infirmary or on a train the chips are disabled with the line *Change when you're out* / *Change when you arrive*.
3. **`SlotCard` ×4**, 72 px each, full width, paper-2 with a 1 px ink border, stacked with 8 px gaps: the item's picture at 56 px (the drawn object; an empty slot shows a faint dashed square), the slot's kicker in Oswald caps 10 px (**COAT** · **ON YOU** · **PAPERS** · **TOOLS**), the item's name in body 600 15 px, the effect line in Courier 11 px (*Charisma 12 · +5 % Party XP · holds up in a run-in* / *Shows at a checkpoint* / *Better odds putting up posters*), and at the right *Wearing* in Courier, or for an empty slot *Nothing · tap to choose* in paper-3. A keepsake worn carries the small **Keepsake** stamp at 10 px over the picture's corner. Tapping a card opens the `SlotChooser` (§2.1).
4. A text button under the four: **Everything you own · {n}** → the `WardrobeSheet` (§4).

### 2.1 The slot chooser (`SlotChooser`, a `BottomSheet` at 70 dvh)

Title *Coat* (the slot's word); a Courier line *Wearing: {item} · Charisma {n}* or *Nothing on*; then the owned items for the slot as `ItemCard`s (§3) in a two-column grid, the worn one first with *Wearing* and no button, each other with **Wear** and the delta line (*Charisma 12 → 22*); for the Coat slot nothing can be taken off (a character is never coatless: the kit's outfit is always owned), for the other three a last row **Take it off** (text button) when something is worn. One tap wears; the sheet closes; no modal. Empty: *Nothing for this yet. {hint}* (design §13's empty states: *The market sells a hat* / *The party store sells paste and brush* / *The press sells a pass*).

---

## 3. The item card (`ItemCard`)

Used in the chooser, the shop card, the wardrobe sheet and the `bought` modal. A card on paper-2 with the printed-matter 1 px ink border; width: half the sheet in a grid (about 164 px on a 375 phone), full width in a horizontal shop scroll (200 px).

- **The picture**: the drawn item (`Picture` at 128 px square, the 512 source), on a cream field with the border; a keepsake has the **Keepsake** stamp across the top-right corner (the slice-2 small mark becomes this stamp).
- **The name** in Playfair 16 px, two lines at most.
- **The kind line** in Oswald caps 10 px: the slot and the tier said as what it is (*COAT · A GOOD COAT* · *ON YOU* · *PAPERS* · *TOOLS* · *KEEPSAKE · FROM CHAPTER 4*).
- **The effect line** in Courier 11 px, at most two lines: Charisma first, then the effects in words, then the warnings (*Charisma 22 · holds up in a run-in · recognised on rival ground* · *Better odds at a checkpoint · a mark and +10 Heat if they look twice* · *Better odds watching and listening · a Dossier entry now and then* · *+5 % Party XP*). The effect words per effect kind: `chancePct propaganda` → *better odds putting up posters*; `intelligence`/`surveillance` → *better odds watching and listening*; `sabotage`/`vandalism` → *better odds on the rough work*; `checkpoint` → *better odds at a checkpoint*; `bluff` → *better odds talking your way out*; `expose` → *better odds at the paper*; `fxpPct` → *+5 % Party XP*; `dossierChance` → *a Dossier entry now and then*; armour from Tier II → *holds up in a run-in*; Charisma 20+ → *recognised on rival ground*.
- **The price lines** (shop only), Courier: *800 Iron*; under it a surcharge line when it applies (*Your record: +15 %*); *From Level 6* / *Members only* / *From Rank 3* when locked (the card dimmed, no button).
- **The delta line** (chooser only), Courier 11 px: *Charisma 5 → 12* (or *→ 2* for plain clothes, in ink, never in the failure colour: lower is not worse).
- **The one button** (`Button`, full width of the card, 40 px): **Wear** / **Buy · 800 Iron** / **Read** (a keepsake with a text: opens a sheet with the chapter's keepsake line); or the Courier state *Wearing* / *Needs 800 Iron* / *Owned* (in a shop, for a thing already owned that is not a keepsake: shops sell one of each).
- **The sell line** (wardrobe sheet only), Courier 10 px in paper-3: *Sells for 80 Iron at a market*. Never a button on the card.

---

## 4. Shops (`ShopCard`) and selling (`SellSheet`)

On a place's sheet under its tickets and above the Jobs card: kicker **FOR SALE · {SHOP NAME}** (*THE CLOTHES STALL* · *THE PARTY STORE* · *THE TAILOR* · *THE PRESS* · *THE BACK ROOM*), the items as `ItemCard`s in a horizontal scroll (snap, 200 px wide, the first one and a half visible on a phone), a Courier line under the scroll (*The stall buys too: a coat you don't want, at a tenth* / *Members only; the party's prices* / *Cash, and no questions* for the back room), and a text button **Sell something** when the shop buys and the player owns something sellable. Buying: one tap for a price up to 1,000 Iron (→ the `bought` modal with **Wear it now** as a second button and **Continue**); over 1,000 a confirm sheet (*Buy the dress greatcoat for 4,500 Iron?* · **Buy** · *Not now*). *Needs {price} Iron* dims the button.

**The back room** (a `bar` from Rank 3): the shop's two items and, as a `JobsCard`-style row under them, **Have a mark struck off · {price} Iron** with the Courier line *{level}: {price} a mark, the oldest first, one a day* → the `markBought` modal; *Clean · nothing to strike* when the record is clean; *Half price this week · Marr's discretion* when the favour runs. Below Rank 3 the back room is not on the sheet at all (the bar is a bar).

**`SellSheet`** (a `BottomSheet`): title *Sell to {shop}*; rows of the sellable owned items (never the kit, never a keepsake, never a worn item: *Take it off first*), each the picture at 40 px, the name, *{price} Iron* and a text button **Sell**; a tap opens a one-line confirm (*Sell the standard coat for 20 Iron?* · **Sell** · *Keep it*) → the `sold` modal. Empty: *Nothing to sell here.*

---

## 5. The full wardrobe (`WardrobeSheet`, a `BottomSheet` at 90 dvh; desktop: the side sheet at 480 px)

Title *Everything you own*; the `OutfitChips` at the top; then the items as `ItemCard`s in a two-column grid (three on desktop), grouped under thin rules with Oswald kickers: **COATS** · **ON YOU** · **PAPERS** · **TOOLS** (the worn item first in each group, with *Wearing*; the rest with **Wear**), then **KEEPSAKES** (cards with the stamp, the kind line *KEEPSAKE · FROM CHAPTER n, "{title}"*, **Read** where there is a text, no other button; a wearable keepsake such as the rosette or a patron's piece appears in its slot's group as well, with the stamp), then a Courier foot *Sells at a market: {n} things*. Empty groups read *Nothing yet · {hint}*.

---

## 6. The Dossier tab (route `/dossier`; the tab bar's fourth tab, *Soon* until now)

### 6.1 The tab

- **Header band** (120 px): `ArtHeader` with `scene.newsroom`'s crop, kicker *THE DOSSIER* (dotted: the `dossier` note), the Courier line *{used} of {cap} · {fresh} fresh · {stale} stale · {files} Case Files*; a second line when the Dossier is full, in the failure colour: *Full · sell or use something before the next entry*.
- **A strip of three chips** (the Faction tab's pattern): **Names** · **Case Files** · **Informants**.
- **Names**: one **`NameCard`** per name with at least one entry, sorted by the freshest entry: the party's crest mark at 24 px (locals have no portrait), the name in body 600, *{party} · {city}* (*· {district}* in the capital) in Courier, the count line *{n} entries · {weight} toward a Case File* with a three-segment **clock** (the Citizen Sleeper borrowing: three ink segments, half-filled for a stale entry; full at three), and under it the **`EntryRow`s** (collapsed to the first two; *and {n} more* expands): the category word in Oswald caps 10 px (*POLITICAL*), the line in body 14 px, *{source} · {weekday} · fresh* / *· stale* in Courier. At the right of the card, when the clock is full: **Make a Case File** (one tap → the `caseFile` modal); when the file would exceed the cap (it never does: a file replaces three entries) nothing. A name that is **burned** (an exposé in the last 14 days) carries *in the paper {weekday} · nothing new for {n} days*.
- **Case Files**: one **`CaseFileCard`** per file: the crest mark, the name, the party and city, the kinds as chips (*POLITICAL* · *PATTERN*), the lines (all), and three text buttons as the rules allow: **Take it to the paper** (→ the press place's name in Courier under it: *at Herald House, Old Town*; the button opens the city map with that place's sheet when the player is in a city with a press; else *At a newspaper: Herald House in the capital, or Gazette House in Ashford*), **Sell · 200 Iron** (*at a station*: the button opens the station's sheet when the player is in a city; the sale itself is the station's card, §6.3), **Recruit as an informant** (needs a pattern line and Associate with the city's patron; else the Courier reason: *Needs a pattern line* / *Needs Associate with Edith Crane*).
- **Informants**: `InformantRow`s: the name, the city, *{n} days of reports left · next {weekday}*, and the last report's line; the Courier foot *Two at most*. Empty: *No informant yet. Turn a Case File with a pattern line in a town whose patron is your Associate.*

### 6.2 Where entries show up

Every result modal that lands an entry carries the knock-on line *Dossier: an entry on {name} · {category} · goes stale {weekday}* with a small book glyph (the tab's dot glyph), and the Dossier tab's dot shows until the tab is opened. *Dossier full · an entry went begging* when refused.

### 6.3 Selling at a station (`StationSellCard`)

On every `station` place's sheet, a `JobsCard`-style card: kicker *THE MAN BY THE LEFT-LUGGAGE*, the Courier line *Buys what you know. A Case File 200, a fresh entry 50, a stale one 25. Nobody prints it.*, and the button **Sell something from the Dossier** → a `BottomSheet` listing the files and entries as rows with prices and a **Sell** per row (a one-line confirm each) → the `dossierSold` modal. Empty: the card reads *Nothing in the Dossier to sell* with no button.

---

## 7. The exposé (`ExposeStory`; at a `press` place; three steps, resumable)

The press place's sheet carries the ticket **Take a Case File to the paper · 20 Energy** (kicker *EXPOSÉ · ONE A DAY*; dimmed with *No Case File with something to print* / *Printed today; tomorrow* / *Needs 20 Energy*). Tapping opens the `StoryScreen` with the press place's scene (`scene.newsroom`; `scene.front-page` when drawn, for step 3).

- **Step 1 · *The file and the angle*** · kicker *EXPOSÉ · {PAPER} · STEP 1 OF 3*: the qualifying files as radio rows (the crest, the name, the party, *{n} lines*; the first selected); under them the two choices as `StoryScreen` rows: ***The facts, plainly*** (hint *Every line checked. It runs on page three. Nothing to your party's name.*) · ***The story, with a headline*** (hint *Page one, if the editor bites. A point harder.*). One tap on a choice commits the file and the angle (the flag) and moves to step 2.
- **Step 2 · *The editor's desk*** · the narrative (*{Editor} reads the first line and the last. "Who's your second source?" You have the file, the morning, and three ways to answer.*); three `StoryScreen` rows with the odds word and the stat: ***Write it straight*** · *Good odds · Intelligence* · ***Talk the editor into it*** · *Fair odds · Charisma and Intelligence* · ***Legwork: check every line twice*** · *Good odds · your best, Intelligence*; the item tag under a row when the camera is worn (*Press camera · better odds*); the CTA on the selected row **Take it to the editor · 20 Energy**.
- **Step 3 · the result**: `ResultModal kind="story"` with the stamp **Printed** / **Page three** / **Spiked**, the outcome text (design §16.6), the knock-on lines (*Opinion in {city}: {party} −1.0 · +150 XP · +40 Party XP · +100 Iron · +5 Political Capital · Legacy +2 · Case File spent · {name} is in tomorrow's paper*; on a Failure *Case File kept · the editor wants more*), **Continue** → the press place's sheet. A closed tab mid-way resumes at the step reached (the file and angle are stored).

---

## 8. Patrons

### 8.1 The patron's card on the place (`PatronCard`)

On Herald House's and the Pier Hotel's sheets, under the tickets: kicker *PATRON · EDITH CRANE* (dotted: the `favour` note on *Favour*), the portrait at 56 px (`portrait.crane` / `portrait.marr`), the name in body 600, *{tier} · Favour {n} · {nextTier} at {next}* in Courier with a thin `ProgressBar` to the next tier, one line of the patron's voice in italic 13 px (Crane: *"The Herald prints what it can prove. Bring me what it can prove."* · Marr: *"The bank is patient with people who are useful."*), and the rows:
- **Gift · 200 Iron** (`Button`; *Given today* after; → the `gift` modal, Favour +2).
- **The open Requests** (`RequestRow` ×≤2): the title, *by {weekday}* and the progress (*1 of 2*), tap → the thing to do (the city map at the place, or the Dossier).
- **The favour** (Confidant+): **{favourTitle} · {pc} Political Capital** (Crane: *Plant a headline*, a sheet with the five cities' Issues as rows; Marr: *The bank's discretion*, one tap) → `patronFavour`; *Called in · again from {weekday}*.
- **The perks as they stand** in Courier under the rows: *Acquaintance: gossip in Monday's paper ✓ · Associate: an introduction and informants ✓ · Confidant at 60: a favour once a week · Protégé at 90: an endorsement and the pen*.
- Before the first visit the card is the same without the Requests (the first arrives two boundaries after the first tap on the card: the visit is the tap).

### 8.2 The Me tab's patron clocks (`PatronClock`)

Kicker *PATRONS* (two rows; before Level 10 the block reads *Patrons · from Level 10, in the capital and on the lake*): each the portrait at 32 px, the name, *{tier} · {favour}* and the `ProgressBar` to the next tier with *{next} at {n}*; under it the open Requests' titles with their *by {weekday}*. Tap → the place (the city map) or, from another city, the nation map with the city's card.

### 8.3 Requests in the paper

A `LettersRow` per open Request: kicker *FROM EDITH CRANE*, the title, *by {weekday} · Favour +6*; tap → the thing to do. *Crane's thanks* as a headline the morning it is done.

---

## 9. The flat

### 9.1 The residence card (slice 4 §6.1, changed)

Under the residence line a second line: *Where you sleep: a rented room · +10 Rested a night* with the text button **A flat in {city} · 2,500 Iron** (Level 10 and resident; else *A flat from Level 10*), → a `BottomSheet` (*A flat in Coalport*: `scene.flat`'s crop, the lines *+25 Rested a night · Rested cap +50 · a third outfit, Evening · +2 Charisma in Coalport*, *2,500 Iron, then 150 a week. If the rent runs out the flat waits; nothing is taken.*, **Buy · 2,500 Iron**) → `flatBought`. With a flat: *Where you sleep: a flat in Coalport · paid until Thursday* and **Pay a week · 150** / **Pay four weeks · 600** as two text buttons; lapsed: *Your flat waits · pay a week to sleep there* in the failure colour.

### 9.2 The Me tab's home card (`HomeCard`)

Kicker *WHERE YOU SLEEP* (dotted: the `home` note): the same line and buttons; with a flat in another city: *A flat in Coalport · you live in Eastside · its comforts wait for you there*.

---

## 10. Legacy (`LegacyBlock`)

Kicker *LEGACY · your record in the republic* (dotted: the `legacy` note), the figure in Playfair 22 px (*23*) and *{toSpend} to spend* in Courier; then the entries as `LegacyEntryRow`s, newest first, collapsed to three (*and {n} more* expands): the entry's words in body 14 px (*A council term completed · Coalport*), the date and the points in Courier (*Thu 15 Oct · +3*); then a rule and the kicker *LASTING PERKS* with `PerkRow`s: the perk's name in body 600, its line in Courier (*+5 % Party XP on everything*), and **Take it · 15 Legacy** / *Needs 15 Legacy* / *Taken ✓* (a counted perk reads *Taken 1 of 3*). One tap → the `perk` modal. Empty: *Nothing on the record yet. A council term, a hero's title or an exposé goes here, for good.* The profile sheet (slice 6) gains the line *Legacy {n}* and the titles (*Champion of Season 1* · *The spymaster, Season 1*).

---

## 11. The season

### 11.1 The republic sheet's season card (`SeasonCard`; slice 7 §2.1, changed)

At the sheet's foot: kicker *THE SEASON* (dotted: the `season` note), *Season 1 · day 41 of 84 · the Season Election from {date}* in Courier, the three parties' season scores as a `NationBar` with the figures (*Vanguard 1,380 · Collective 1,402 · Alliance 1,366*), the line *Champion: the top score at the Season Election. Members get Legacy and the title; four awards go to the season's best.*, and the text button **The Hall of Fame**.

### 11.2 The Hall of Fame (`HallOfFamePage`, route `/republic/hall`)

Header `scene.parliament`, kicker *THE HALL OF FAME*; one block per season, newest first: *Season {n}* in Playfair, the Champion's crest and *Champions: the {faction} · {score}*, the three Presidents of its terms (*Term 1: {name}* …), the four awards as rows (*Top of the ledger, Levels 1–15: {name}* · *Most titles: {name}* · *Best orator: {name}* · *The spymaster: {name}*). Empty (the first season): *The first season ends on {date}. The Champion and the awards go here.* Desktop: Parliament's side column carries the latest season's block with the link.

### 11.3 The front page of the new season

The slice-3 front page's shape: the Champion's crest as the photograph, the stamp **CHAMPIONS**, the headline, the deck with the awards, the player's own line (*You: Legacy +5, Champion of Season 1* / *The map settled halfway; your coat, your flat and your Dossier are where you left them*), the CTA **To the republic**.

---

## 12. The paper (slice 7 §11, changed)

- **Letters** carries Requests (§8.3), *From your informant* rows and the patron's Monday gossip (*From Edith Crane: a word about {name}* · the entry is already in the Dossier).
- **Your desk** gains **Dossier**, **Patrons**, **Where you sleep** and **Ahead** (`ClockRow`: up to three clocks in Courier with a tiny three-segment glyph each: *Chapter 5 from Tuesday · Crane: Confidant at 60 · the Season Election in 12 days*).
- **In Print** gains the exposé's front page (the player's name under the headline; the slice-3 front page's shape with `scene.front-page` or the newsroom crop), the page-three line, *A New Coat on {name}*, the flat, the Legacy entries, *{name} Recognised in {city}*.
- **From the capital**: the season week and the countdown.

---

## 13. Rival ground and the journey (slice 5 §8, changed)

- **The journey screen** to a rival home city gains a line under the card: **Change into plain clothes** (a text button; *Plain clothes on arrival ✓* after; *You're in plain clothes* when already) and, when the worn outfit is Town with Charisma 20+, the Courier warning *In this coat you'll be recognised in Duskwall*.
- **The plate's kicker** on rival ground reads *DUSKWALL · RIVAL GROUND · RECOGNISED HERE* when recognition is above 0 (the note: `plainClothes`), and every ticket there carries the tag *Recognised · run-ins likelier* in the failure colour, or *Plain clothes · unnoticed* in ink.
- **The hostile deck's *Papers, please*** reads the Papers slot: the card's first row says *Show your papers · {party card / forged papers / press pass}* with the odds word where a check applies.

---

## 14. Society calls and the Front

- **The Opera, the Grand Hotel and the Front's four places** carry a `MissionTicket` with the kicker *MISSION · SOCIETY*: the title, *needs Charisma 15 · the door is at 5*, the odds word on Charisma, *+2 Favour with {patron}* as a tag, **Call · 15 Energy**; barred: the ticket dimmed with *Not dressed for it · needs Charisma 5 at the door · a good coat would do it*. The briefing and the result are slice 5's mission screens with no risk line (*Safe*).
- **The Front** opens as a quarter (the slice-5 quarter bar's lock goes): four pins, the blurbs of design §16.3, two tickets each and the call; the Casino's sheet carries the back room (from Rank 3) and the Pier Hotel's the tailor and Marr's card.

---

## 15. Empty states

| Where | State | What it reads |
|---|---|---|
| The Wardrobe block, a slot | nothing | *Nothing · tap to choose* |
| The slot chooser | nothing owned for it | *Nothing for this yet. The market sells a hat.* / *The party store sells paste and brush.* / *The press sells a pass.* |
| The wardrobe sheet, a group | nothing | *Nothing yet · {hint}* |
| The wardrobe sheet, keepsakes | none | *The chapters leave things here.* |
| A shop | everything owned | the cards read *Owned*; the button row reads *Nothing new here* |
| The sell sheet | nothing sellable | *Nothing to sell here.* |
| The Dossier, Names | no entry | *Nothing yet. Listen at a bar, read the notices, watch a platform: one time in ten, a name goes in here.* |
| The Dossier, Case Files | none | *Three entries on one name make a Case File. From Level 16.* (below 16) / *No Case File yet. Three entries on one name.* |
| The Dossier, Informants | none | *No informant yet. Turn a Case File with a pattern line in a town whose patron is your Associate.* |
| The press ticket | no file | *No Case File with something to print* |
| The station's card | nothing to sell | *Nothing in the Dossier to sell* |
| The patron card, first visit | no Request | *A letter comes the morning after next.* |
| The Me tab, Patrons, below Level 10 | — | *Patrons · from Level 10, in the capital and on the lake* |
| The Me tab, Legacy | none | *Nothing on the record yet. A council term, a hero's title or an exposé goes here, for good.* |
| The Hall of Fame | the first season | *The first season ends on {date}. The Champion and the awards go here.* |
| The desk's Ahead | no clock | the row is absent |

---

## 16. Phone and desktop layouts; above the fold

- **The Me tab on 375 × 667:** the party card and the stats block are the first screen as before; the Wardrobe block is the first thing below the fold and its kicker, the chips and the Coat card are reached in one thumb-scroll; the four slot cards are 72 px, so the block is 36 + 4 × 80 + 40 = about 400 px; Patrons, Where you sleep and Legacy follow, each collapsed to its kicker and one line until tapped (the kicker row is 44 px and a tap expands; the state is remembered).
- **The slot chooser and the wardrobe sheet:** two cards per row at 164 px wide, the card 260 px tall (the picture 128, the name 40, the lines 44, the button 40); two rows above the sheet's fold; the chips pinned at the sheet's top.
- **A shop card:** the horizontal scroll shows one card and a half; the card's **Buy** is reachable without scrolling the sheet when the shop is the first card under the tickets (it is, by rule: shop above jobs).
- **The Dossier tab:** the header (120 px), the strip (44 px) and the first `NameCard` (min 112 px with two entry rows) above the fold; the **Make a Case File** button never wraps (full width of the card when the clock is full, under the rows).
- **The exposé:** step 1's file rows and both choices above the fold (one file: 72 px; the choices 56 px each); step 2 as a slice-5 briefing (three rows and the sticky CTA); step 3 the modal.
- **The patron card:** the portrait, the Favour line, the bar and **Gift** above the fold on the place's sheet when the card is first under the tickets (it is: patron above shop above jobs at Herald House and the Pier Hotel).
- **The season card:** at the republic sheet's foot; the sheet grows to 70 dvh when the season card is present.
- **Desktop (≥ 1024):** the Me tab is two columns (the party card, stats and Wardrobe in the 640 px column; Patrons, Where you sleep and Legacy in the 360 px side column); the Dossier tab is a 640 px list with the file's detail in the side column; the exposé is a centred card at 640 px; sheets are side sheets at 480 px; the wardrobe sheet's grid is three columns.
- **Sideways phones (review 2 #3):** the Wardrobe block's slot cards stay 72 px; the chips row scrolls horizontally if the three chips and *Keep this* do not fit.
- **Reduced motion:** chips swap without animation; the clock segments fill without easing; the stamps appear at once.

---

## 17. Copy (new strings, for `copy.ts`)

*Wardrobe* · *Charisma {n}* · *Town* · *Plain clothes* · *Evening* · *pay the rent* · *Keep this as {outfit}* · *Town · Charisma {n} · recognised on rival ground* · *Plain clothes · Charisma {n} · unnoticed on rival ground* · *Evening · Charisma {n} · dressed for the Casino* · *Change when you're out* · *Change when you arrive* · *Coat* · *On you* · *Papers* · *Tools* · *Wearing* · *Nothing · tap to choose* · *Keepsake* · *Everything you own · {n}* · *Wearing: {item} · Charisma {n}* · *Nothing on* · *Wear* · *Take it off* · *Charisma {a} → {b}* · *work clothes* · *a good coat* · *a tailor's suit* · *a society wardrobe* · *holds up in a run-in* · *recognised on rival ground* · *better odds putting up posters* · *better odds watching and listening* · *better odds on the rough work* · *better odds at a checkpoint* · *a mark and +10 Heat if they look twice* · *better odds talking your way out* · *better odds at the paper* · *+5 % Party XP* · *a Dossier entry now and then* · *Shows at a checkpoint* · *From chapter {n}, "{title}"* · *Read* · *Owned* · *Needs {n} Iron* · *From Level {n}* · *Members only* · *From Rank 3* · *Your record: +{pct} %* · *Sells for {n} Iron at a market* · *For sale · {shop}* · *The clothes stall* · *The party store* · *The tailor* · *The press* · *The back room* · *The stall buys too: a coat you don't want, at a tenth* · *Members only; the party's prices* · *Cash, and no questions* · *Sell something* · *Buy · {n} Iron* · *Buy {item} for {n} Iron?* · *Not now* · *Wear it now* · *Have a mark struck off · {n} Iron* · *{level}: {price} a mark, the oldest first, one a day* · *Clean · nothing to strike* · *Half price this week · Marr's discretion* · *Sell to {shop}* · *Take it off first* · *Sell* · *Sell {item} for {n} Iron?* · *Keep it* · *Nothing to sell here.* · *Everything you own* · *Coats* · *Keepsakes* · *Sells at a market: {n} things* · *Nothing yet · {hint}* · *The market sells a hat* · *The party store sells paste and brush* · *The press sells a pass* · *The chapters leave things here.* · *Nothing new here* · *The Dossier* · *{used} of {cap} · {fresh} fresh · {stale} stale · {files} Case Files* · *Full · sell or use something before the next entry* · *Names* · *Case Files* · *Informants* · *{n} entries · {weight} toward a Case File* · *Political* · *Criminal* · *Pattern* · *Asset* · *The small stuff* · *{source} · {weekday} · fresh* · *stale* · *and {n} more* · *Make a Case File* · *in the paper {weekday} · nothing new for {n} days* · *Take it to the paper* · *at {press}, {street}* · *At a newspaper: the Clarion, the Sentinel, Gazette House or Herald House* · *Sell · 200 Iron* · *at a station* · *Recruit as an informant* · *Needs a pattern line* · *Needs Associate with {patron}* · *{n} days of reports left · next {weekday}* · *Two at most* · *Dossier: an entry on {name} · {category} · goes stale {weekday}* · *Dossier full · an entry went begging* · *Dossier: Case File on {name} · {kinds}* · *The man by the left-luggage* · *Buys what you know. A Case File 200, a fresh entry 50, a stale one 25. Nobody prints it.* · *Sell something from the Dossier* · *Nothing in the Dossier to sell* · *Take a Case File to the paper · 20 Energy* · *Exposé · one a day* · *No Case File with something to print* · *Printed today; tomorrow* · *Exposé · {paper} · step {n} of 3* · *The file and the angle* · *{n} lines* · *The facts, plainly* · *Every line checked. It runs on page three.* · *The story, with a headline* · *Page one, if the editor bites. A point harder.* · *The editor's desk* · *Write it straight* · *Talk the editor into it* · *Legwork: check every line twice* · *Take it to the editor · 20 Energy* · *Printed* · *Page three* · *Spiked* · *Case File spent* · *Case File kept · the editor wants more* · *{name} is in tomorrow's paper* · *Opinion in {city}: {party} −{n}* · *Patron · {name}* · *{tier} · Favour {n} · {nextTier} at {next}* · *Acquaintance* · *Associate* · *Confidant* · *Protégé* · *Gift · 200 Iron* · *Given today* · *by {weekday}* · *{a} of {b}* · *Plant a headline · 25 Political Capital* · *The bank's discretion · 20 Political Capital* · *Called in · again from {weekday}* · *Acquaintance: gossip in Monday's paper* · *Associate: an introduction and informants* · *Confidant at 60: a favour once a week* · *Protégé at 90: an endorsement and the pen* · *Protégé at 90: an endorsement and the case* · *A letter comes the morning after next.* · *Patrons* · *Patrons · from Level 10, in the capital and on the lake* · *{next} at {n}* · *From {patron}* · *by {weekday} · Favour +6* · *{patron}'s thanks* · *From your informant* · *From {patron}: a word about {name}* · *Where you sleep* · *a rented room · +10 Rested a night* · *A flat in {city} · 2,500 Iron* · *A flat from Level 10* · *+25 Rested a night · Rested cap +50 · a third outfit, Evening · +2 Charisma in {city}* · *2,500 Iron, then 150 a week. If the rent runs out the flat waits; nothing is taken.* · *Buy · 2,500 Iron* · *a flat in {city} · paid until {weekday}* · *Pay a week · 150* · *Pay four weeks · 600* · *Your flat waits · pay a week to sleep there* · *A flat in {city} · you live in {place} · its comforts wait for you there* · *Legacy · your record in the republic* · *{n} to spend* · *Lasting perks* · *Take it · {n} Legacy* · *Needs {n} Legacy* · *Taken ✓* · *Taken {a} of {b}* · *A fifth more from the party* · *A bigger Dossier* · *A better night's sleep* · *A shorter walk* · *A name they know* · *A bonus at the end of the week* · *A friend of friends* · *A quiet word at the station* · *Nothing on the record yet. A council term, a hero's title or an exposé goes here, for good.* · *Legacy {n}* · *Champion of Season {n}* · *The season* · *Season {n} · day {d} of 84 · the Season Election from {date}* · *Champion: the top score at the Season Election. Members get Legacy and the title; four awards go to the season's best.* · *The Hall of Fame* · *Champions: the {faction} · {score}* · *Term {n}: {name}* · *Top of the ledger, Levels {bracket}: {name}* · *Most titles: {name}* · *Best orator: {name}* · *The spymaster: {name}* · *The first season ends on {date}. The Champion and the awards go here.* · *Champions* · *To the republic* · *You: Legacy +5, Champion of Season {n}* · *The map settled halfway; your coat, your flat and your Dossier are where you left them* · *Ahead* · *Chapter {n} from {weekday}* · *{patron}: {tier} at {n}* · *the Season Election in {n} days* · *Change into plain clothes* · *Plain clothes on arrival ✓* · *You're in plain clothes* · *In this coat you'll be recognised in {city}* · *{city} · rival ground · recognised here* · *Recognised · run-ins likelier* · *Plain clothes · unnoticed* · *Show your papers · {papers}* · *Mission · Society* · *needs Charisma {n} · the door is at {m}* · *+2 Favour with {patron}* · *Call · 15 Energy* · *Not dressed for it · needs Charisma {m} at the door · a good coat would do it* · *The Front* · *Bought* · *Sold* · *Bound* · *Turned* · *Given* · *Yours* · *Paid* · *Struck off* · *Lasting* · *Rent until {weekday}* · *The landlady writes it in the book.* · *A word by the left-luggage* · *He reads it, folds it, pays. Nobody will ever know it was yours.* · *An informant in {city}* · *A gift for {patron}* · *A flat in {city}* · *No twist this season*.

British English, no exclamation marks, no percentages for odds, times in the player's local clock, every count a real number; *Charisma* and *Iron* always in full.

---

## 18. Settled for the build (4 Oct 2026; `slice-8-life.md` §21)

- **Shops:** the clothes stall buys anything sellable at a tenth of the catalogue price; every other shop only what it sells. **The party store also sells the press pass and the camera.** The sell sheet's confirm gains a Courier second line when the item is saved in an outfit: *It's in your {outfit} outfit; selling takes it out.* (*It's in your Town and Evening outfits; selling takes it out of both.*); the `sold` modal's knock-on: *Taken out of your {outfit} outfit*. Prices with the surcharge are whole Iron, half up.
- **Press and stations:** the exposé ticket and the press shop are at **Herald House and Gazette House** only; the station card is at **Central Station, the Goods Yard and Clearwater Station**. §6.1's lines read *at Herald House, Old Town* / *At a newspaper: Herald House in the capital, or Gazette House in Ashford*.
- **The exposé's refusals** (the ticket dimmed, or the file card's button replaced; the Courier reason under it): *Not against your own party* · *The {paper} prints nothing against the {party}'s own. Sell the file at a station, or turn it.* and *Nobody to print it against* · *{name} belongs to no party. Sell the file at a station, or turn it.* The plain angle's hint reads *Every line checked. It runs on page three. Nothing to your party's name.*
- **Society calls:** Level 10; no Party XP (the ticket's tags: *no Party XP · +2 Favour with {patron}*); **barred while *Wanted*** (*Not while you're Wanted · the doorman has the list*); the *On file* +5 is dropped. *The morgue file*'s briefing carries a name picker (the capital's names) and pays Iron 48.
- **Forged papers** on *Papers, please*: *Show your papers · forged papers · Fair odds · Charisma* (a check at 14 with +10; its Partial is the party card's); the press pass passes as the card does.
- **Recognition:** the night doubles the Charisma and office parts, not the Legacy part; current offices only.
- **The rent:** at most eight weeks ahead; the buttons dim with *Paid eight weeks ahead*.
- **The Mountain Inn** keeps its `bar` kind and carries the tailor and the back room (two shop cards on one sheet, the tailor first).
- **Keepsakes:** every keepsake from slice 2 on has a *Read* text (`slice-8-life.md` §21.3); the button shows on each.
- **The two rooms:** slice 4's paid room in the capital and Clearwater reads ***Lodgings in {city}*** (*Take lodgings · 100 Iron* · *Renew · 100 Iron · 7 more nights*) from this slice's copy change; *a rented room* is only the free home.
- **The party badge:** redrawn neutral (cream and ink), centred, no crop; alt *A plain round enamel lapel badge, cream with a dark ink rim, on a pin.*
- **The personal lines' four voices:** `slice-8-life.md` §21.4; the rest print the Herald's deck. `{office}` reads *visitor* for a player with none.
- **Chapter 7's choice A** hint: *The truth, and a debt to Crane.* (no entry lands); Favour +5 on every outcome.
- **Issues feeding exposés:** *The Casino's Licence* and *The Cells Are Full*.
- New copy for §17: *It's in your {outfit} outfit; selling takes it out.* · *It's in your {a} and {b} outfits; selling takes it out of both.* · *Taken out of your {outfit} outfit* · *Taken out of your {a} and {b} outfits* · *Not against your own party* · *The {paper} prints nothing against the {party}'s own. Sell the file at a station, or turn it.* · *Nobody to print it against* · *{name} belongs to no party. Sell the file at a station, or turn it.* · *Nothing to your party's name.* · *no Party XP · +2 Favour with {patron}* · *Not while you're Wanted · the doorman has the list* · *Paid eight weeks ahead* · *Lodgings in {city}* · *Take lodgings · 100 Iron* · *visitor* · *at Herald House, Old Town* · *At a newspaper: Herald House in the capital, or Gazette House in Ashford* · *Show your papers · forged papers*.

---

## 19. Review 4 addendum (6 Oct 2026)

- **§9.1, the residence card:** the first line and button are *Live here · 500 Iron* (slice 4 §6.1 as revised by review 4); the second line is *Where you sleep* with the free room / the flat; **no paid room row** (the Lodgings card is at Tram Junction / the Rows).
- **§13, the journey:** the nation map in journey mode; *Change into plain clothes* is a chip on the journey plate.
