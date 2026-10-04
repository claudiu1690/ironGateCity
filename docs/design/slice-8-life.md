# Slice 8 — "A life in the city": the Wardrobe, the Dossier and exposés, two patrons, a flat, the Legacy record, Ambition #1 complete, the Political Season

Game designer, 4 Oct 2026. Companion to `docs/design/slice-8-screens.md` (the screens) and `docs/design/inventory-research.md` (the research behind the Wardrobe); `docs/economy.md` §22 has the sums. The architect writes the slice-8 tech design from these; every rule and number here is also in the GDD (edits listed in §17). Builds on slices 5 (Heat, missions, rival ground), 6 (the Faction tab, profiles, favours) and 7 (offices, terms, Clearwater, laws).

**Playtest question:** do players have goals for the next month, not just the next session?

**The answer this slice gives:** goals are **cards with clocks** that the player sees filling: a Case File (three fresh entries on one name), a patron's next tier (Favour 30, 60, 90), a Request due Thursday, a flat's rent, the next Ambition chapter's date, and the season's election with its awards. None of them needs the player at a set time; every one of them pays when it fills and waits when it doesn't.

**Rules this design obeys:** one tap or one choice by default, stories at most three steps and resumable; nothing owned is ever destroyed, sold by accident or lost by absence (homes and clothes included); no weapon is an item; campaign vocabulary; the check formula is untouched (§8.4), combat is one choice (§20); no real-world symbol on any item; plain words, no dice maths; server-authoritative; content is data; faction names as they are. **Player-facing words** follow GDD §1.5; the slice's new ones are in §1.1.

---

## 1. The design in one paragraph

What you wear is your **Charisma**, and from this slice it is also a decision: the **Wardrobe** has four slots in plain words (*Coat · On you · Papers · Tools*), two outfits with names (*Town* and *Plain clothes*; a flat adds *Evening*), and shops that are cards on the places a player already stands in. A good coat opens the opera and the casino and gets you recognised on rival ground; plain clothes do the opposite. The **Dossier** opens as the fourth tab: entries on the republic's named people, gathered by watching and listening, going stale after a week; three on one name make a **Case File**, and a Case File taken to a newspaper is an **exposé**: three steps, one check, a headline with your name and a swing against the subject's party in their town. Two **patrons** can be courted over real days, **Edith Crane** of the *Herald* and **Julius Marr** of Clearwater, with Requests in the morning paper, gifts, and perks at 10, 30, 60 and 90 Favour. A **flat** is the first home with a price: 2,500 Iron and 150 a week, prepaid, never repossessed. The **Legacy** record is the public, permanent account of what a player did, with small permanent perks bought from it. ***Finish His Work*** runs to its twelfth chapter and a seat in Parliament under his name. And the **Political Season** gets its skeleton: three terms, the Season Election, the Champion faction and four awards, the Hall of Fame, and a rollover that resets the map halfway and nothing a player owns.

### 1.1 Plain words for slice 8 (GDD §1.5)

| System term | The player reads |
|---|---|
| Equipment · inventory · a slot · tier I–V · armour | **the Wardrobe** · **everything you own** · **Coat / On you / Papers / Tools** · **work clothes / a good coat / a tailor's suit / a society wardrobe** (the tier said as what it is; the Roman numeral never appears) · **some weight to it** (a coat's armour, said on the card as *holds up in a run-in*) |
| Outfit · loadout · equip / unequip | **outfit** (kept: *Town*, *Plain clothes*, *Evening*) · **wear** / **take off** |
| Utility item · accessory · document | **tools** · **on you** · **papers** |
| CHA | **Charisma** (kept, as the HUD and tickets say it) |
| Recognition · fame | **recognised** (*recognised on rival ground*) |
| Dossier · entry · subject · freshness · stale | **the Dossier** (kept) · **an entry** · **a name** · **fresh / stale** (*goes stale on Thursday*) |
| Case File · exposé · informant | **a Case File** (kept) · **an exposé** (kept; the button says *Take it to the paper*) · **an informant** |
| Patron · Favour · Request · tier | **patron** (kept) · **Favour** (kept, capital F) · **a Request** · **Acquaintance / Associate / Confidant / Protégé** |
| Home · lodging · prepaid | **where you sleep** · **a rented room / a flat** · **paid until {date}** |
| Legacy · Legacy points · perks | **your record in the republic** (the kicker *LEGACY*) · **Legacy** (the number) · **a lasting perk** |
| Season · Season Score · Season Champion · rollover | **the season** · **the season's score** · **Champion of the season** · **the new season** |
| Black Market | **the back room** (of a bar) |
| Social mission · high-society venue · dress check | **a society call** (*Mission · Society*) · **the money side of town** · **not dressed for it** |

Kept with a help note on the label: Charisma, the Wardrobe, the Dossier, a Case File, Favour, Legacy, the season.

---

## 2. What opens, and when

| Thing | Opens at | Where |
|---|---|---|
| The Wardrobe (four slots, two outfits, shops) | Level 1 (the Me tab's block exists from the start; the first shop a player meets is the market's clothes stall) | the Me tab; place cards |
| The Dossier tab and entries | Level 1 (the first entry comes from the first lucky intelligence tap); **Case Files at Level 16** (GDD §5.2) | the Dossier tab |
| Exposés | a Case File | a `press` place |
| Patrons | Level 10 (the train: both patrons live in battlegrounds) | Herald House (Irongate), the Pier Hotel (Clearwater) |
| A flat | Level 10, a residence | the residence card |
| Legacy (the record) | Level 1 (empty until the first entry) | the Me tab; the profile |
| Society calls and the money side of town | the Wardrobe: by worn Charisma | the Opera, the Grand Hotel, the Front's four places |
| The season | day 0 of the first season (the deploy's epoch) | the republic sheet; the paper |

---

## 3. The Wardrobe (GDD §8.2, §21)

### 3.1 Slots (GDD §21.1, rewritten)

Four slots. **No weapon slot in the MVP** (and none planned for the game as a political contest): a run-in is decided by Strength and a coat with some weight to it (§20.3), never by a pistol. The two weapon pictures in `mvp/items` (the revolver, the truncheon) are not catalogued.

| Slot (`ItemSlot`) | The player reads | What it carries | Charisma range | Other effects |
|---|---|---|---|---|
| `clothing` | **Coat** | the outfit: the main Charisma and the armour | 2–50 | armour by tier (I 4 · II 8 · III 12 · IV 16 · V 20; §20.3); a party coat pays +5 % Party XP |
| `accessory` | **On you** | a badge, a hat, a watch, a patron's piece | 2–10 | Party XP, a patron piece's touch |
| `document` | **Papers** | the party card, forged papers, a press pass | 0 | what *Show your papers* shows; better odds at a checkpoint or at a watch |
| `utility` | **Tools** | paste and brush, a camera, wire cutters | 0 | better odds on one kind of work (+5 to +10 %, §8.4) |

**Worn Charisma** = the origin's base (0–4) + the coat + what is on you + **2 while in the city of a paid flat** (§6). The HUD shows it on the Me tab as before (*Charisma 17 · Town*). Every Charisma check (§8.4) uses the worn figure at the moment of the tap.

### 3.2 Item effects, in rules terms

An item carries `cha`, `armour` (clothing only), `keepsake`, and zero or more **effects** from a closed list (the ordinance DSL's shape, `packages/rules`):

| Effect | Fields | Bound | Used by |
|---|---|---|---|
| `chancePct` | `on: ActionType \| MissionType \| 'checkpoint' \| 'bluff' \| 'expose'`, `value` | 5–10 | the §8.4 bonus row *the right item* (a ticket tag *{Item} · better odds*) |
| `fxpPct` | `value` | 5 | the party coat and the badge (a line of its own on the base, like a council rule's) |
| `dossierChance` | `value` | 5–15 | added to the 10 % base chance of an entry on an intelligence Success (§4.2) |

Nothing else: no Energy, Iron, Rested or opinion effect on any item in the MVP. Items never touch Party XP beyond the two +5s above. **Bounds are enforced by the loader** like the ordinances'.

### 3.3 Outfits

- Two named sets from the start: **Town** and **Plain clothes**; a paid flat adds **Evening** (§6). Each is the four slots' uids (null allowed).
- **Changing is one tap** on the chip (the Me tab's Wardrobe block, the full wardrobe sheet, and the journey screen's line *Change into plain clothes* on the way to rival ground). Changing clothes is **not allowed in the cells, in the infirmary or on a train** (the chip row reads *Change when you're out* / *Change when you arrive*; the journey line is the exception that dresses you *for* arrival and takes effect at the station). Nowhere else is it locked.
- **Saving is explicit:** when the worn set differs from the chosen outfit a text button *Keep this as {outfit}* appears; nothing is saved by accident. Wearing a single item from a chooser changes the worn set only.
- **Plain clothes** are defined by effect, not by name: worn Charisma **under 10** (§3.6). The default *Plain clothes* set is the faction's Tier I outfit, the party card and nothing else; the default *Town* is whatever the character wears at the moment the slice arrives (the migration rule) or, for a new character, the coat if taken, else the outfit.
- The names are fixed in the MVP (no renaming): three words every player reads the same way.

### 3.4 Tiers (GDD §21.2, pinned)

| Tier | Said as | Unlock | Coat's Charisma | Armour | Where |
|---|---|---|---|---|---|
| I | **work clothes** | Level 1 | 2–5 | 4 | the kit; the market |
| II | **a good coat** | Level 6 | 10–15 | 8 | the party hall (the party's coat); the market (a hat) |
| III | **a tailor's suit** | Level 16 | 20–28 | 12 | the tailor (a `hotel` place); the press (the correspondent's suit) |
| IV | **a society wardrobe** | Level 31 | 30–40 | 16 | the tailor at the Grand Hotel |
| V | — | Level 51, Rank 6 | 42–50 | 20 | post-MVP (the regalia) |

### 3.5 Shops: a card on a place (no shop screen)

A place's sheet may carry a **`shop`** (content on the location, like `jobs`): a kicker (*FOR SALE · THE CLOTHES STALL*), the items it sells with prices, what it buys. One tap buys (a confirm sheet when the price is over 1,000 Iron: *Buy the greatcoat for 4,500 Iron?*); a modal `bought`. Buying needs the item's Level and, where set, Rank or membership. A shop **buys back** at a tenth of its own prices (never keepsakes, never the kit): *Sell something* opens the sellable items as rows, each with a confirm sheet (selling is the one act that takes a thing away by the player's own hand, so it is never one tap).

| Shop | Place kind | Where in the MVP | Sells |
|---|---|---|---|
| **The clothes stall** | `market` | Market Row (Coalport), the Customs Market (Duskwall), Bridge Street (Ashford), Market Square (Irongate), Back Lane Market (Clearwater) | the standard coat, a good hat |
| **The party store** | `faction-hq` (members only) | every HQ, the capital houses | the party's coat (II), the party badge, paste and brush |
| **The tailor** | `hotel` | the Grand Hotel (Irongate), the Pier Hotel (Clearwater), the Mountain Inn (Duskwall) | the greatcoat, evening dress, the wristwatch (III); the three-piece suit (IV, the Grand Hotel only) |
| **The press** | `press` | Herald House, Gazette House, the Clarion, the Sentinel | the press pass, the press camera; the correspondent's suit (Gazette House, Alliance members, III) |
| **The back room** | `bar` (Rank 3+) | The Anchor (Coalport), the Gate Tavern (Irongate), the Red Lantern (Irongate), the Mountain Inn's taproom, the Casino | forged papers, wire cutters; **the bribe that clears a mark** (§3.8) |

The **record's surcharge** (§11.3: *Repeat offender*: clothing +15 %; pinned here: +15 % at every shop from *Repeat offender*, **+30 % at *Notorious***) is a price line on the card (*Your record: +15 %*). The *Timber Rates* Issue's and the *Free Market Charter*'s `ironPct` do not touch prices (they are income effects).

### 3.6 Charisma cuts both ways (GDD §8.2, §14.12 "fame is dangerous", pinned)

- **Society calls** (§3.7) need a worn Charisma: a ticket is **barred below the requirement minus 10** (*Not dressed for it · needs Charisma 10 at the door*), a long shot from there, and the difficulty is the requirement (§8.4's row).
- **Recognised on rival ground.** On rival ground every run-in roll (tier-1 taps and missions, §20) adds **recognition**: worn Charisma 20–29 **+5**, 30 and over **+10**, **doubled at night** (20:00–06:00 UTC, §2.2); plus the highest office held: councillor **+5**, Governor or Chair **+10**, deputy or President **+15**; plus **+1 per 10 Legacy** (at most +5). **Plain clothes (worn Charisma under 10) remove the Charisma part and halve the office part** (rounded down); nothing removes the Legacy part. The plate's kicker on rival ground gains the word (*Recognised here · run-ins likelier*) and the ticket tag names it. A new player in work clothes adds 0; a Governor in a greatcoat at night adds 30, which is the design. Presence on rival ground (Appendix C #63): a **recognised** visitor (recognition above 0) is counted for the home faction as *1 from another party*, never named.
- **The police and your papers.** *Show your papers* at a checkpoint (the hostile deck, slice 5) and *Talk your way out* against the police now read the **Papers** slot: the party card as before; **forged papers** give +10 % on the checkpoint's check and on *Talk your way out* against the city police, and a Failure with them in hand writes your name down with **+10 Heat** (the papers are kept: nothing is confiscated); a **press pass** passes a checkpoint as the party card does and gives +10 % watching and listening.

### 3.7 Society calls (GDD §13.6, the slice-8 form) and the money side of town

A **society call** is a tier-2 mission of the new type **`social`**: legal, 15 Energy, **difficulty = its Charisma requirement**, the check **Charisma** (one way) or **Charisma and Intelligence** (the second way) or **best** (*Legwork*: a waiter's door, the tradesmen's entrance); no run-in, no Heat; pays **XP 75 / 38 / 15**, **Iron 60 / 30 / 0**, **opinion 0.15 / 0.075** (persuasion among the well-off, from Neutral), **a Dossier entry on a Success one time in four** (a named figure of the place's city), and **+2 Favour** (+1 on a Partial) with the patron whose city it is in. Once a day per place. The §13.6 table's XP figures (+200 to +1,000) were written against v3.0's rates and are replaced by the tier-2 rate; its five rows become the six calls below, and the weekly and once-a-term limits become once a day per place.

| Place | Call | Needs Charisma | Flavour |
|---|---|---|---|
| The Opera (Irongate) | *The interval in the boxes* | 15 | the box-holders and their talk |
| The Grand Hotel (Irongate) | *The Thursday dance* | 20 | the ballroom; a card from the manager |
| **The Promenade** (Clearwater, The Front) | *The four o'clock promenade* | 10 | who walks with whom |
| **The Pier Hotel** (Clearwater) | *Tea on the terrace* | 15 | Marr's table is by the window |
| **The Lido** (Clearwater) | *The lido's Sunday* | 12 | the bandstand and the deckchairs |
| **The Casino** (Clearwater) | *The tables after midnight* | 20 | the committee room's other use |

**The Front opens** (Appendix C #71): its four places become playable with blurbs, each with two tier-1 actions (a canvass on CHA+INT at 10 Energy and an intelligence tap at 3–4) and its call; the Casino also carries the back room (§3.5) and the tailor sits at the Pier Hotel. The eight tier-1 actions and their outcome texts: §16.3.

### 3.8 The back room: the bribe that clears a mark (GDD §11.4, pinned)

At a `bar` with a back room, from Rank 3, one row: **Have a mark struck off · {price} Iron**: **500 Iron a mark at *On file*, 1,000 at *Repeat offender*, 2,000 at *Notorious*** (the price by the record's level at the tap), the oldest mark first, one a day; the stamp *Struck off*; the modal names the price. The 30 Political Capital route (slice 5) stays beside it on the Me tab. Marr's Confidant favour halves the price for a week (§5.4).

### 3.9 The catalogue (GDD §21.4, the slice-8 additions)

Eleven items exist (slice 2, 3, 5, 7). The slice adds **eighteen** wearable or usable items and **eleven keepsakes** (the chapters, §8). Art ids in `packages/content/src/data/art.ts`; files in `mvp/items`; *new* = §19.

| Id | Name | Slot | Tier · said as | Charisma | Armour | Effects | Price (Iron) | Where | Needs | Art |
|---|---|---|---|---|---|---|---|---|---|---|
| `outfit.standard-coat` | A standard coat | Coat | I · work clothes | 5 | 4 | — | 200 | the clothes stall | — | `item.winter-coat` |
| `outfit.stewards-jacket` | Steward's jacket | Coat | II · a good coat | 12 | 8 | `fxpPct 5` | 800 | the party store | Vanguard, Level 6 | `item.stewards-jacket` ← `vanguard-field-jacket.jpg` (**redraw**: no collar tabs, §19) |
| `outfit.convenors-coat` | Convenor's coat | Coat | II · a good coat | 12 | 8 | `fxpPct 5` | 800 | the party store | Collective, Level 6 | *new* `item.convenors-coat` |
| `outfit.campaign-suit` | Campaign suit | Coat | II · a good coat | 12 | 8 | `fxpPct 5` | 800 | the party store | Alliance, Level 6 | `item.campaign-suit` ← `alliance-campaign-suit.jpg` |
| `outfit.greatcoat` | Dress greatcoat | Coat | III · a tailor's suit | 22 | 12 | — | 4,500 | the tailor | Level 16 | `item.greatcoat` ← `officer-overcoat.jpg` |
| `outfit.evening-dress` | Evening dress | Coat | III · a tailor's suit | 24 | 12 | — | 5,000 | the tailor | Level 16 | `item.evening-dress` ← `evening-dress.jpg` |
| `outfit.correspondents-suit` | Correspondent's suit | Coat | III · a tailor's suit | 25 | 12 | `chancePct intelligence 5` | 5,500 | Gazette House | Alliance, Level 16 | *new* `item.correspondents-suit` |
| `outfit.three-piece` | Tailored three-piece suit | Coat | IV · a society wardrobe | 38 | 16 | — | 20,000 | the Grand Hotel's tailor | Level 31 | `item.three-piece` ← `three-piece-suit.jpg` |
| `acc.party-badge` | Party badge | On you | I | 2 | — | `fxpPct 5` | 150 | the party store | members | `item.lapel-badge` ← `lapel-badge.jpg` (a plain enamel disc in the party's colour, drawn once; no device) |
| `acc.good-hat` | A good hat | On you | II | 6 | — | — | 400 | the clothes stall | Level 6 | *new* `item.good-hat` |
| `acc.wristwatch` | Gold wristwatch | On you | III | 10 | — | — | 2,500 | the tailor | Level 16 | `item.wristwatch` ← `gold-wristwatch.jpg` |
| `acc.cranes-pen` | Edith Crane's pen | On you | — | 8 | — | `dossierChance 10` | — | Crane at Protégé | keepsake (wearable) | *new* `item.fountain-pen` |
| `acc.marrs-case` | Julius Marr's cigarette case | On you | — | 8 | — | `chancePct bluff 10` | — | Marr at Protégé | keepsake (wearable) | *new* `item.cigarette-case` |
| `acc.his-rosette` | His rosette | On you | — | 5 | — | — | — | *Finish His Work* chapter 12 | keepsake (wearable) | *new* `item.rosette` |
| `doc.forged-papers` | Forged papers | Papers | II | 0 | — | `chancePct checkpoint 10`, `chancePct bluff 10` (the police only) | 600 | the back room | Rank 3 | `item.forged-papers` ← `forged-papers.jpg` |
| `doc.press-pass` | Press pass | Papers | II | 0 | — | `chancePct intelligence 10`, `chancePct surveillance 10`, `dossierChance 10` | 500 | the press | Level 6 | *new* `item.press-pass` |
| `tool.paste-and-brush` | Paste and brush | Tools | I | 0 | — | `chancePct propaganda 10` | 300 | the party store | members | `item.propaganda-kit` ← `propaganda-kit.jpg` |
| `tool.press-camera` | Press camera | Tools | II | 0 | — | `chancePct surveillance 5`, `chancePct expose 10`, `dossierChance 15` | 1,200 | the press | Level 6 | `item.press-camera` ← `press-camera.jpg` |
| `tool.wire-cutters` | Wire cutters | Tools | II | 0 | — | `chancePct sabotage 10`, `chancePct vandalism 10` | 400 | the back room | Rank 3 | `item.wire-cutters` ← `wire-cutters.jpg` |

Every coat's card carries *holds up in a run-in* from Tier II (armour 8 is +4 power, §20.3) and *recognised on rival ground* from Charisma 20. The §8.2 table is rewritten to this catalogue (its *Officer's suit* becomes the *Dress greatcoat*, its *Vanguard dress suit* and *Full regalia* wait for Tier IV–V content after the MVP). **Not catalogued:** `revolver.jpg`, `truncheon.jpg` (no weapons). The *Weatherproof* buff (§6.7) and the *Lodged* buffs are not built: the flat is the lodging (§6).

### 3.10 Combat with coats (GDD §20.3, unchanged in shape)

Power = STR × 1.5 + armour ÷ 2 (Tier I +2 · II +4 · III +6 · IV +8); Health lost on a win less the armour value (the slice-5 rule used Tier I's 4; now the worn coat's). A Tier II coat's +4 power is +12 % on Fight for the reference recruit against an enforcer (29 → 41 %): a coat with some weight to it, as §8.4's reason line promises.

---

## 4. The Dossier (GDD §10, pinned)

### 4.1 What it is

The player's private intelligence journal, the **Dossier tab** (the tab bar's fourth tab, *Soon* until now). It holds **entries** on **names**: the republic's named people with a party and a town (the local candidates of every city's slate, the local deputies, the parties' own figures, the secretaries, and the named figures of the Ambitions; `people.ts`, `candidates.ts`, `nation.ts`: any NPC with `factionId` and `cityId`). Players are not names in the MVP (§10: v1.5).

**An entry:** `{ uid, subjectId, category, lineId, day, source }`. Categories (§10.3): **political** (*who they meet, what they said*), **criminal** (*what they did that the police would like*), **pattern** (*where they are and when*), **asset** (*what they own and owe*), **neutral** (*the small stuff*). The **line** is drawn seeded from the category's pool (§16.4: twenty lines with `{name}`, `{party}`, `{place}`, `{weekday}`); the entry shows the line, the name, the party, the source and the day.

**Capacity** (§10.1, by Intelligence; the trained stat at the tap): 10 / 15 / 25 / 40 / 60 slots at INT 1–10 / 11–20 / 21–35 / 36–50 / 51+, **+1 per Legacy perk** (twice). Entries and Case Files each take a slot. A full Dossier **refuses** new entries (the result's knock-on line reads *Dossier full · an entry went begging*): opportunity, never loss.

**Freshness** (§10.5): an entry is **fresh for 7 City Days** from its day and **stale** after (*goes stale on Thursday* → *stale*). Stale entries count **half** toward a Case File and sell for half. Nothing is deleted by time. The desk's row *Dossier: 2 entries go stale tomorrow* (§3.3) is live.

### 4.2 Where entries come from (§10.2, the slice-8 form)

| Source | Chance | Category | Whose name |
|---|---|---|---|
| A tier-1 **intelligence** Success (*Listen at the bar*, *Read the notices*, *Watch the platforms*…) | **10 %** base, **+ the worn `dossierChance`** (the press pass 10, the camera 15, Crane's pen 10) | by the place's kind: `press`, `faction-hq`, `parliament`, `ministry` → political · `jail`, `court` → criminal · `station`, `bar`, `street`, `docks` → pattern · `hotel`, `market`, `theatre` → asset · the rest → neutral | a random name of the city (a rival party's two times in three) |
| A **surveillance** mission (*Watch and listen*) | **Success: one entry; Partial: one time in two** | the mission's `dossier.category` (content; default pattern) | the mission's `dossier.subject` (a named figure) or a random name of the target party in the city |
| A **theft** mission (*the rolls*) | Success: one entry | political, or the mission's | a random name of the target party |
| *The informer* (the hostile deck): *feed him false information* | on the card's Success (slice 5's promise, now live) | political | a random name of the rival home city |
| *Listen to the cells* / *Talk to the ward* (slice 5) | **25 %** on a Success | criminal / neutral | a random name of the city |
| A **society call** (§3.7) | 25 % on a Success | asset | a named figure of the place's city |
| A patron's **gossip** (Acquaintance, §5.3) | every Monday's paper | the patron's choice (Crane: political; Marr: asset) | a name of the patron's city |
| An **informant** (§4.4) | one entry every 2 days for 14 days | pattern or political | the informant's name |

Every entry is a knock-on line on the result modal (*Dossier: an entry on Josef Baum · political · goes stale on Thursday*) with the small book mark the tab's dot uses.

### 4.3 Case Files (§10.4, pinned; **Level 16**)

**Three or more entries' worth on one name** (fresh 1, stale ½) can be bound into a **Case File**: one tap on the name's card (*Make a Case File · 3 entries*), the entries are consumed, the file keeps their lines and their **kinds** (the categories present) and **does not go stale**. A file takes one slot. A name can have one file at a time; new entries on the name start a second count. The knock-on line reads *Case File: Josef Baum · political, pattern*.

**Uses in the MVP:**

| Use | Needs | What happens | Where |
|---|---|---|---|
| **An exposé** (§4.5) | a political or criminal line in the file | a three-step story; a swing against the name's party; a headline with your name; the file is spent on a Success or a Partial | a `press` place |
| **Sell** | any file or entry | **a file 200 Iron; a fresh entry 50, a stale one 25**; one tap, a confirm sheet; the paper does not print it | a `station` place (*the man by the left-luggage*) |
| **An informant** (§4.4) | a pattern line, and **Associate** with the patron of the name's city | the file becomes an informant for 14 days | the Dossier tab |

| **The Headline Story** (slice 6's Alliance event, GDD §16.3) | a file on a name of the event's target party | the caller may attach it at the call (one tap on the call sheet's new row *Attach a Case File*); the file is spent, the name burned for 14 days, the event's swing +50 % and the name in the result's headline | the call sheet |

**Deferred (post-MVP):** Blackmail, Denounce (Appendix C #78). The *Sell* rule covers §10.4's 50–200 range.

### 4.4 Informants (the Associate perk)

A Case File with a pattern line, in a city where the player is **Associate** or better with its patron, can be **turned**: one tap, *Recruit as an informant*; the file is spent; for **14 City Days** the paper's Letters row carries *From your informant* every second morning with **one entry** (pattern or political, alternating) on a name of that city; the Dossier tab lists the informant with its days left. At most **two informants** at a time. Nothing to collect: the entry is in the Dossier when the paper is read, slot permitting (full: *went begging*).

### 4.5 The exposé (three steps; the slice's story)

At a `press` place (the Clarion, the Sentinel, Gazette House, Herald House; the Courier's office is not a place), the sheet carries a ticket **Take a Case File to the paper · 20 Energy** when the player holds a file with a political or criminal line, dimmed with the reason otherwise (*No Case File with something to print*). **One exposé a day** per player (the editor prints one story). Tier-3 shape (§13.1): a choice, a check, the result; resumable.

**Step 1 · the file and the angle.** The files that qualify as rows (the name, the party, the lines, *3 lines* / *5 lines*); then two choices (a flag): ***The facts, plainly*** (*Every line checked. It runs on page three.*) or ***The story, with a headline*** (*Page one, if the editor bites.*). The flag chooses the texts and the split of the swing: *plainly* takes the swing from the party to **Neutral** entirely; *the headline* splits it **half to your party, half to Neutral** (§14.2's rule for an action against a rival), and is **a point of difficulty harder**.

**Step 2 · the check.** Difficulty by the file's weight: **18 with three lines' worth, 16 with four, 14 with five or more** (+1 for *the headline*; +2 in the capital's and Clearwater's papers, the ladder's rule; the camera's `chancePct expose 10` applies). Three ways: ***Write it straight*** (Intelligence) · ***Talk the editor into it*** (Charisma and Intelligence) · ***Legwork: check every line twice*** (best). No run-in, no Heat (an exposé is legal). CTA **Take it to the editor · 20 Energy**.

**Step 3 · the result.** Success: **opinion −1.0 against the name's party in the name's city** (split by the flag), **XP 150, Party XP 40, Iron 100** (the paper pays), **+5 Political Capital**, the file spent, a **front-page line with your name** in every paper the next morning (§10.2), Legacy **+2** (*An exposé printed*, §7.1), the name **burned for 14 days** (no second exposé on it). Partial: **−0.5**, 75 / 20 / 50, no PC, the file spent, the line on page three (a headline without the front page). Failure: **nothing moves**, XP 30, the file **kept** (*spiked*; the editor wants more), no Legacy. Rested applies to XP and Iron. Issue tags apply to the swing when the name's city has a tagged Issue the file matches (the Issue's `feeds` include `expose` from this slice); the *Free Press Spring* twist's +50 % is the swing multiplier when it exists. In the capital the swing lands in the name's district (`candidates` carry one); for a deputy or a party figure, in the capital's Government Quarter.

**On rival ground**, an exposé against the home party is allowed (its swing draws from morale under §14.11's 2-point cap) and its result counts as an action there (recognition, run-ins: a legal mission's 5 %).

### 4.6 The spymaster

Case Files used (exposés printed, files sold, informants recruited) are counted per season for the award (§9.2).

---

## 5. Patrons (GDD §17.2, two for the MVP)

### 5.1 The two

| Patron | City · place | Leans | What they are for | Portrait |
|---|---|---|---|---|
| **Edith Crane**, owner of the *Irongate Herald* | Irongate · Herald House (Old Town) | neutral | the paper: Dossier gossip, a headline planted, the pen | `portrait.crane` (exists) |
| **Julius Marr**, banker | Clearwater · the Pier Hotel (The Front) | neutral | money and the back room: a cheaper bribe, Heat gone, the case | `portrait.marr` (exists) |

Both are neutral, both live in a battleground (Level 10 opens the train), so every faction courts them on the same terms and the GDD's halved gains for a rival-leaning patron are not exercised in the MVP. Voss, Draganov and Reinholt (portraits exist) wait for the next patron batch (§25).

### 5.2 Favour (0–100, never decays)

| Source | Favour | Limit |
|---|---|---|
| **A Request done** (§5.3) | **+6** | one Request every 2 City Days; hold at most 2; each expires 4 days after it arrives |
| **A gift** (200 Iron, at the patron's place, one tap) | **+2** | one a day per patron |
| **A society call** Success in the patron's city (§3.7) | +2 (Partial +1) | once a day per place |
| **An Ambition chapter** that names the patron (*Clear His Name* 3, *Finish His Work* 7) | +5 | once |
| A Legacy perk (*Favour +10 %*) | every gain ×1.1, rounded up | — |

A devoted player gains about 5–7 a day; a player who does the Requests and nothing else about 3. **Tiers:** Acquaintance **10** · Associate **30** · Confidant **60** · Protégé **90**. The clock card on the Me tab reads *Edith Crane · Associate · 41 · Confidant at 60*.

### 5.3 Requests: a letter in the paper

A Request is **an order from a patron**: a line in the paper's Letters row (*From Edith Crane: two entries for my files from Garrison Hill · by Thursday*), a matcher in the orders' DSL (`match`, `counts`, `target`), progress on the patron's card, and **+6 Favour** at the boundary when it is done (the paper prints *Crane's thanks*). Arrives every second boundary after the first visit to the patron's place; two may be held; an unanswered one **expires** at its fourth boundary (*the letter is in the bin*; nothing else). Each patron has **six** Requests, drawn in rotation (§16.5):

- **Crane:** *Two entries for my files from {district}* (2 Dossier entries on capital names) · *A speech on the Herald's Issue* (1 speech tagged with a capital Issue) · *Watch the boxes for me* (1 surveillance mission in Irongate) · *Three posters where the Hill can read them* (3 propaganda in Garrison Hill) · *A word at the Press Club* (1 intelligence tap at the Press Club) · *Something I can print* (1 exposé, Level 16+; else the next in rotation).
- **Marr:** *A watch on the cannery gate* (1 surveillance mission in Clearwater) · *A word at the tables* (the Casino's society call) · *Three conversations in the Rows* (3 canvasses in Clearwater) · *Who comes off the ferry* (2 intelligence taps at the Harbour) · *A speech the Courier will quote* (1 speech in Clearwater) · *Tea, Thursday* (the Pier Hotel's society call).

### 5.4 Perks by tier

| Tier | Favour | Crane | Marr |
|---|---|---|---|
| **Acquaintance** | 10 | **Gossip:** a free Dossier entry (political, a capital name) in every Monday's paper | **Gossip:** a free entry (asset, a Clearwater name) every Monday |
| **Associate** | 30 | **An introduction:** the mission *The morgue file* at Herald House (surveillance, 12 Energy, difficulty 20, Level 10; pays an entry on a name of the player's choosing among the capital's, and Iron 60) · **informants** in Irongate (§4.4) | **An introduction:** the call *The late table* at the Casino (Charisma 25; pays Favour +3 and an asset entry) · informants in Clearwater |
| **Confidant** | 60 | **A headline planted · 25 Political Capital, once a week:** +50 momentum for your party on one Issue of one city (the Governor's Address's figure; attributed to you) | **The bank's discretion · 20 Political Capital, once a week:** Heat to 0 now, and the back room's bribe at half price for 7 days |
| **Protégé** | 90 | **Endorsement:** +2 to your total in every home-council count and +1 point of score in a battleground count while Protégé · **Edith Crane's pen** (§3.9) · Legacy +5 (*Protégé of Edith Crane*) | **Endorsement** (the same) · **Julius Marr's cigarette case** · Legacy +5 |

The Protégé endorsement is the §17.2 "+2 % to your council score" pinned to the count formulas of §15.3 (a home total is an integer; a battleground score is a percentage: +1 point). The "+1 % national" waits for the next patron batch. A favour is one tap on the patron's card with its price; the modal `patronFavour`.

### 5.5 Away

Favour never falls. Requests expire (opportunity). Informants keep reporting into the Dossier, slot permitting. Nothing else.

---

## 6. A home (GDD §17.4, the MVP form)

| Home | Cost | Where | Gives |
|---|---|---|---|
| **A rented room** | free, always | the residence city | **+10 Rested at every boundary** (banked, up to the cap) |
| **A flat** | **2,500 Iron**, then **150 a week prepaid** (*Pay a week · 150* / *Pay four weeks · 600*) | the residence city, from **Level 10**; one flat per player in the MVP | **+25 Rested at every boundary** · **Rested cap +50** while paid (the larger of the flat and a room, never both) · **a third outfit, *Evening*** · **+2 worn Charisma while in the flat's city** |

- The flat is bought from the residence card (*A flat in Coalport · 2,500 Iron*), a confirm sheet, the modal `flatBought`; it comes with its first week paid. Rent is **prepaid**, paid from the Me tab's home card or the residence card; the paper's desk row reads *Your flat · paid until Thursday*.
- **When the rent runs out the flat waits.** The bonuses stop; the *Evening* outfit's set is remembered and its chip reads *Evening · pay the rent to wear it as a set* (its items are still wearable one by one); the player drops to the rented room's +10. Paying a week restores everything. **Nothing is taken away, ever**, and a player away for a season finds the flat waiting with the rent to pay from today (no arrears: the weeks unpaid are not owed).
- **Moving residence** leaves the flat where it is: its bonuses need the player to live there (*the Rested cap where you live*); it waits, paid or not, and is a line on the Me tab (*A flat in Coalport · you live in Eastside*). Buying a second is post-MVP, as the townhouse and the villa are (§25).
- The map marker (§17.4) is post-MVP.

---

## 7. Legacy (GDD §17.3, pinned)

### 7.1 The record

Public, permanent, on the profile sheet (*Legacy 23*) and on the Me tab (kicker *LEGACY · your record in the republic*), as a list of entries with dates. **Entries and points:**

| Entry | Points |
|---|---|
| City Hero or District Hero (each count) | 2 |
| A council term completed | 3 |
| An Issue resolved with you in its top five | 2 |
| A pledged law passed (the President's pledge) | 10 |
| A term completed as Governor or Mayor (new row) | 5 |
| A term completed as a deputy (new row) | 5 |
| A term completed as Chair | 10 |
| A term completed as President | 40 |
| Survived a vote on the Chair, or a vote to remove the President | 10 |
| An Ambition completed | 30 |
| An exposé printed (new row) | 2 |
| Protégé of a patron (new row) | 5 |
| A member of the Champion faction at the Season Election | 5 |
| A season award (new row) | 5 |

### 7.2 Lasting perks

Bought with Legacy on the Me tab, one tap each, permanent; the record's total never falls (the perks spend a balance kept beside it: *Legacy 23 · 8 to spend*).

| Perk | Cost | Effect (rules) |
|---|---|---|
| A fifth more from the party | 15 | `fxpPct 5` on every action and mission |
| A bigger Dossier (twice) | 5 each | +1 slot |
| A better night's sleep | 10 | Rested cap +50 |
| A shorter walk | 15 | canvass −1 Energy |
| A name they know (three times) | 10 each | +1 % personal vote appeal (the §15.3 ballot half: +1 % to the player's own ballots' weight; pinned: *+1 to the ward vote per level*, so the home total gains one point per perk level) |
| A bonus at the end of the week | 10 | an extra day's pay at the Monday boundary |
| A friend of friends | 10 | Favour gains ×1.1 |
| A quiet word at the station | 10 | Heat cools +10 % |

The reference player has about 15 Legacy by day 30 (three council terms, a hero title, two Issues): one perk, chosen. Legacy is never spent on anything else and cannot be bought.

---

## 8. *Finish His Work*, chapters 4–12 (GDD §17.1); the two due chapters of the others

The chapter rules are §17.1's: three steps, one check with three ways (two written, one *Legwork* on the best stat), never fails, no run-in at home (chapters 6, 8, 10 and 12 are set in the capital and carry none either: an Ambition is the one thing the street never interrupts), Rested applies, no Standing, no orders, seven City Days between chapters plus the requirement, the keepsake on every outcome. **Difficulties follow the tier-3 band** (22–30) once the player is past Level 16; the reference player meets each at *Fair* to *Good* odds on their best stat. Scripts: §16.1. Keepsakes use `item.document-folder` unless named.

| Ch | Title | Letters row | Requirement (plus 7 days) | About when | Difficulty · Energy | Success / Partial / Failure (XP / FXP / Iron) | Keepsake |
|---|---|---|---|---|---|---|---|
| 4 | *The count* | *From the count's night* | a completed council term | day 20 | 18 · 20 | 400 / 100 / 250 · 200 / 50 / 125 · 60 / 0 / 0 | `keep.count-sheet` *His count sheet* |
| 5 | *His seat* | *From the chamber's back row* | Rank 4 | day 27 | 18 · 20 | 400 / 100 / 250 · half · 60 / 0 / 0 | `keep.minute-book` *The minute book* |
| 6 | *The hall* | *From the Chair's ballot* | voted in a Chair election | day 35 | 20 · 20 | 450 / 120 / 300 · half · 70 / 0 / 0 | `keep.ballot-stub` *His ballot stub* |
| 7 | *The cutting* | *From the Herald's morgue* | a Case File made (Level 16) | day 42 | 20 · 20 | 450 / 120 / 300 · half · 70 / 0 / 0 | `keep.cutting` *The cutting* |
| 8 | *The rule* | *From the Governor's desk* | a term as Governor or Mayor completed, or three council terms | day 50 | 22 · 25 | 500 / 140 / 350 · half · 80 / 0 / 0 | `keep.rule-draft` *His rule, in draft* |
| 9 | *The list* | *From the party's list* | Rank 5 | day 56 | 22 · 25 | 500 / 140 / 350 · half · 80 / 0 / 0 | `keep.list-letter` *The letter from the list* |
| 10 | *The republic votes* | *From the ballot box* | voted in a national election | day 63 | 24 · 25 | 600 / 160 / 400 · half · 90 / 0 / 0 | `keep.polling-card` *His polling card* |
| 11 | *Twenty-five marks* | *From the clerk's receipt* | on the party's list for Parliament | day 70 | 24 · 25 | 600 / 160 / 400 · half · 90 / 0 / 0 | `keep.list-receipt` *The list's receipt* |
| 12 | *Under his name* | *From the roll of the chamber* | a term as a deputy begun (the seat taken at a term's day 0) | day 84+ | 26 · 30 | 1,000 / 300 / 1,000 · 500 / 150 / 500 · 150 / 0 / 0 | `acc.his-rosette` *His rosette* (wearable, §3.9); **Ambition completed: Legacy 30** |

Chapter 12's requirement is the GDD's ending (a seat in Parliament under his name). For most players it lands in season 2; that is the design (§17.1: "runs for months"). The *Chapter n of 12* kicker is honest from this slice.

**The two due chapters:** ***Clear His Name* chapter 2, *The night foreman*** (requirement Level 6, Dossier work; difficulty 14, 15 Energy; 300 / 80 / 150; keepsake `keep.foremans-name` *The foreman's name*; it gives the player's first Dossier entry by hand: a political line on Brandauer, a name added to `people.ts` with no party and the city Coalport, so the chapter and the Dossier meet) and ***Settle His Debts* chapter 3, *The collector*** (Rank 3; difficulty 16, 15 Energy; 350 / 90 / 200; keepsake `keep.collectors-card` *The collector's card*; the Agility way carries Heat +6 as chapter 2 did). Scripts: §16.2. Chapter 3 of *Clear His Name* and chapter 4 of *Settle His Debts* are written with the next slice that touches them (§25: four chapters each by launch).

---

## 9. The Political Season (GDD §22, the skeleton)

### 9.1 The calendar

A **season is three terms** (84 City Days) from the same `TERM_EPOCH` (slice 7): `seasonDay = (dayKey − TERM_EPOCH) mod 84`, `seasonIndex` from the epoch. **The Season Election is the third term's national election** (the count into season day 83, confirmed into day 0 of the next season). No new phase, no clock time, nothing scheduled beyond the term jobs; the rollover is **the day-0 boundary job of the new season** (one transaction after the national seating).

### 9.2 The season's score, the Champion and the awards

- **The season's score** per faction = **the sum over the season's days of the party's control share** (its National Control ÷ the three parties', the slice-7 figure, read at each boundary: ~33 a day for a level republic) **+ 100 per national election won** (the GDD's 10 is raised: at 10 an election was a third of one day's lead; at 100 a win is worth about a month of a four-point lead, which is what a win should be).
- **Champion of the season:** the highest score at the Season Election's confirmation. Every member of the faction on that day (in it for 14 days or more) gets **Legacy +5** and the title *Champion of Season {n}* on the profile (cosmetic, kept for ever; the §22.1 cosmetic).
- **Four awards** (Legacy +5 and a title each): **Top of the ledger** (the most opinion moved in the season, one per Level bracket: 1–15, 16–30, 31+) · **Most titles** (the most Hero titles in the season) · **Best orator** (the most Triumphs as a Speaker or Organiser) · **The spymaster** (the most Case Files used). Ties go to the earlier. Awards are computed from the ledgers at the confirmation.
- **The Hall of Fame:** a `seasons` document per season (the Champion, the score table, the three Presidents of its terms, the four award holders) and a page reached from Parliament's side column and the republic sheet.

### 9.3 The rollover (§22.2, pinned)

At the day-0 boundary of the new season, after the government is seated:

| Resets | Stays |
|---|---|
| Every city's and district's opinion moves **50 % of the way back to its baseline** (Neutral the counterparty; a home city never below 50) | Level, Rank, stats, items, Iron, the home and its rent |
| **Every law and council rule in force ends** (the law book empties; the councils' next papers start the rules again) | Political Capital, Favour, Legacy, the Dossier, the record (minor marks keep fading) |
| **Heat to 0** for everyone | Ambition progress, chapters, keepsakes |
| The Issue deck reshuffles (the week's two Issues are drawn fresh on the Monday) | Offices won at the Season Election (they take office normally); seniority; residence |
| The season's counters (the ledger's season totals, Case Files used, Triumphs) | Everything else |

**The season track (§22.4) and Season Twists (§22.3) are not built in the MVP**: the first season has no track and no twist; the paper says so once (*No twist this season*) and the republic sheet's season card carries the countdown and the standings only (Appendix C #80).

### 9.4 What the player sees

- **The republic sheet** (slice 7 §2.1) gains a **season card** at its foot: kicker *THE SEASON*, *Season 1 · day 41 of 84 · the Season Election from {date}*, the three parties' season scores as a `NationBar`, and the line *Champion: the top score. Members get Legacy and the title.*; a text button *The Hall of Fame*.
- **The paper:** a *From the capital* line on **day 77** (*A week to the Season Election*) and the countdown line each morning of the last week; the **season front page** on day 0 (the Champion, the awards, the player's own Legacy line); *While You Were Away* names the new season.
- **The Me tab:** *Champion of Season 1* and award titles under the party card.

---

## 10. The Morning Paper (GDD §3.3)

### 10.1 Personal lines (every paper; the Herald's wording, the home papers transcribe as slice 7 §23.9 did; ≤ 90 headline, ≤ 200 deck)

| Id | When | Headline | Deck |
|---|---|---|---|
| `wardrobe-first` | the first coat bought | A New Coat on {name} | {item}, {charisma} Charisma, seen on {street} yesterday. The {paper} notes that the party's work pays. |
| `expose-front` (front page) | an exposé's Success, the next morning | {subject} EXPOSED: {headlineLine} | By {name}. {line1} {line2} The {party} has not replied. Opinion in {city}: {party} −1.0. |
| `expose-p3` | a Partial | {subject}: Questions on Page Three | By {name}. {line1} The {party} calls it gossip. Opinion in {city}: {party} −0.5. |
| `expose-spiked` | a Failure | The Editor Wants More | {name}'s piece on {subject} is held for want of a second source. The Case File is kept. |
| `case-file` | a Case File made | A File on {subject} | Three fresh entries make a Case File. Take it to a newspaper, sell it at the station, or turn it with a patron's help. |
| `dossier-stale` | entries go stale tomorrow | {n} Entries Go Stale Tomorrow | Stale entries count half toward a Case File and sell for half. Nothing is lost; it just gets old. |
| `patron-letter` (Letters) | a Request arrives | From {patron}: {request} | By {until}. Favour +6 when it's done. |
| `patron-thanks` | a Request done | {patron}'s Thanks | {request}, done. Favour {favour}; {tier} at {next}. |
| `patron-tier` | a tier reached | {name}, {tier} of {patron} | {perkLine} |
| `informant` (Letters) | an informant reports | From your informant | {line} · {subject} · {category}. {daysLeft} days of reports left. |
| `flat-bought` | the flat | {name} Takes a Flat in {city} | {restedLine}. Rent 150 a week, paid until {until}. The {paper}'s housing column approves. |
| `flat-due` | the last paid day | Rent Due on {street} | Your flat is paid until tonight. Pay a week on the Me tab, or let it wait: nothing is lost either way. |
| `flat-waiting` | the morning after it lapses | The Flat Waits | The rent ran out at midnight. A rented room until you pay a week; the flat is yours whenever you do. |
| `legacy-entry` | a Legacy entry | For the Record: {entry} | Legacy {total}. {toSpend} to spend on a lasting perk. |
| `season-week` (From the capital) | season day 77 | A Week to the Season Election | The third term's vote decides the season. {leader} leads the season's score by {margin}. |
| `season-front` (front page, day 0) | the new season | THE {FACTION} ARE CHAMPIONS OF SEASON {n} | Score {score} to {second}. {awards}. The map settles halfway, the law book empties, and the new season begins. |
| `recognised` | the first run-in with recognition on rival ground | {name} Recognised in {city} | A {office} in a {coat} does not pass for a stranger. Plain clothes and a quiet night would. |

### 10.2 The Letters row

Carries, in order: Ambition chapters (slice 2), **patron Requests** (one row each, with the countdown), **informants' reports**, **the patron's Monday gossip**. The tab's dot shows while a chapter or a Request is unanswered.

### 10.3 Your desk

New rows when they apply, after *Your record*: **Dossier** · *{n} entries · {m} go stale {when}* · **Patrons** · *Crane: Associate 41 · Marr: Acquaintance 12* · **Where you sleep** · *A flat in Coalport · paid until Thursday* / *A rented room* · **Ahead** · up to three clocks in Courier (*Chapter 5 from Tuesday · Crane: Confidant at 60 · the Season Election in 12 days*).

---

## 11. The result modals (`ResultModal`; each body ≤ 240)

| Act | Kind | Stamp | Headline | Body | Knock-on |
|---|---|---|---|---|---|
| `bought` | political | Bought | {item} | {flavour}. {effectLine}. It's in your wardrobe; wear it from the Me tab or now. | −{price} Iron · {button: Wear it now} |
| `sold` | political | Sold | {item} | The stallholder counts it out without looking up. | +{price} Iron |
| `caseFile` | political | Bound | A Case File on {subject} | {n} entries bound into one file: {kinds}. It won't go stale. Take it to a paper, sell it at a station, or turn it. | Dossier {used} of {cap} |
| `expose` (the story's step 3) | story | Printed / Page three / Spiked | {outcome title} | the outcome text (§16.6) | Opinion in {city}: {party} −1.0 · +150 XP · +40 Party XP · +100 Iron · +5 Political Capital · Legacy +2 · Case File spent |
| `dossierSold` | political | Sold | A word by the left-luggage | He reads it, folds it, pays. Nobody will ever know it was yours. | +{price} Iron · Dossier {used} of {cap} |
| `informant` | political | Turned | An informant in {city} | {subject}'s file bought you a pair of ears. A report every second morning for fourteen days, in the Letters. | Case File spent · 2 informants at most |
| `gift` | political | Given | A gift for {patron} | {giftLine} | −200 Iron · Favour {a} → {b} |
| `patronFavour` | political | Called in | {favourTitle} | {favourLine} | −{pc} Political Capital · once a week |
| `requestDone` (the paper) | — | — | — | — | — |
| `flatBought` | political | Yours | A flat in {city} | {flatLine}. Rent 150 a week, paid until {until}. Evening is a third outfit now. | −2,500 Iron · Rested +25 a night · Rested cap +50 |
| `rentPaid` | political | Paid | Rent until {until} | The landlady writes it in the book. | −{iron} Iron |
| `markBought` | political | Struck off | One mark fewer | The man in the back room has a friend at the station. The oldest mark on your record is gone. {n} left. | −{price} Iron |
| `perk` | political | Lasting | {perk} | {perkLine}. It's yours for good. | −{cost} Legacy · {toSpend} to spend |
| `outfit` | — | no modal | — | the chip inverts; the HUD's Charisma line changes | — |
| `wear` | — | no modal | — | the slot card changes; *Wearing* on the card | — |

---

## 12. What the player sees and does

### 12.1 Day 1–6: the wardrobe is there, the Dossier fills by luck

The Me tab's Wardrobe block shows *Town · Charisma 5* and the four slots (the coat, nothing, the party card, nothing). A tap on the market's clothes stall card shows the standard coat (200) and, dimmed, *A good hat · from Level 6*. An intelligence tap at the bar lands an entry one time in ten: *Dossier: an entry on Emil Hauser · pattern*. The Dossier tab opens with one card.

### 12.2 Day 6–14: a good coat, the press pass, the first Request

Level 6: the party store sells the convenor's coat (800; *Charisma 5 → 12 · +5 % Party XP*); the press sells a pass (500). Charisma 14 opens the Promenade's call at Level 10. The first trip to the capital: Herald House's card (*Edith Crane · a word with the proprietor · Gift · 200*), the first Request two mornings later.

### 12.3 Day 16–30: a Case File, an exposé, a flat

Level 16 (about day 12–13): three entries on one Hill name bind into a file; the Clarion's ticket *Take a Case File to the paper*; the first front page with the player's name and −1.0 on a rival in the capital. A flat (2,500, about day 15 for the reference player): Rested +25 a night and *Evening*. Crane at Associate about day 20; the first informant.

### 12.4 Month 2 and on: the Confidant's favour, the greatcoat, the season

Confidant with Crane (a headline planted for 25 PC, once a week); the greatcoat at Level 16 (4,500: a week's Iron) and *recognised on rival ground* as the cost of it; the Season Election at day 83 with the awards and the Champion's title; the rollover morning's front page.

---

## 13. Session shape (pillar 7)

| Thing | Taps | Online at a set time? |
|---|---|---|
| Wear an item / change outfit | 1 | no |
| Buy | 1 (2 over 1,000 Iron) | no |
| Sell | 2 (confirm) | no |
| Make a Case File | 1 | no |
| An exposé | 3 (the file and angle · the way · Continue), resumable | no |
| Sell an entry | 2 | no |
| Turn an informant | 1 | no |
| A gift / a favour | 1 | no |
| A Request | 1 to read; done by ordinary play; paid at the boundary | no |
| Buy the flat / pay rent | 2 / 1 | no; the rent waits |
| A perk | 1 | no |
| The season | nothing to do; the awards arrive | no |

Nothing in slice 8 requires a tap at a set hour; every clock pays at a boundary and waits otherwise.

---

## 14. Economy

`docs/economy.md` §22. Slice 8 adds **no tier-1 or tier-2 rate** except the social type (the tier-2 rate) and the exposé's story rewards. It adds the game's first **big Iron sinks** (coats 200–20,000, the flat 2,500 + 150 a week, bribes 500–2,000, gifts 200) against the slice-5 income (about 1,000 Iron a day in week 1, 1,500–2,000 by week 3). **Verdict:** a reference player affords the party coat on day 6–7, the press pass and camera by day 10, the flat about day 15, the greatcoat about day 20 (a week's Iron), and the three-piece suit in month 2 (two weeks' Iron at Level 31): the §18.3 "200–50,000" band is now priced and the week-1 surplus Appendix C flagged in slice 5 has a home. The two +5 % Party XP items are inside the heavy player's envelope (+10 % for a member in the party's coat with the badge); Rank milestones move by at most a day. Legacy perks are small by design. Dossier sales (50–200) are *Other* income of §18.2: about 100–300 a day for a player who sells and never exposes.

---

## 15. Content-policy check

Every string was read against `content-policy-review.md` §7. The Vanguard's coat is a **steward's jacket** (its art needs the collar tabs removed: a civilian jacket); the party badge is a plain enamel disc with no device; no item carries a symbol, armband, flash or insignia; no weapon is catalogued. The patrons are a newspaper proprietor and a banker; Marr's "the bank's discretion" is a favour, not a crime, and the back room's bribe is named as what it is. The exposé's vocabulary is a newspaper's (*printed*, *page three*, *spiked*, *burned*); the swing is *against a party*, never *an attack*. *Recognised* is a word for fame. The season is *Champion*, never *victor*; no *front*, *war*, *enemy*, *troops*.

---

## 16. Content

### 16.1 *Finish His Work*, chapters 4–12 (scripts; every text ≤ 240 characters and four sentences)

**Chapter 4 · *The count*** · kicker *Ambition · Finish His Work · Chapter 4 of 12* · art `scene.election-night`
*Step 1.* The count's night, and your name on the board where his was in '21. The ward book's last page is a tally in his hand: his votes, and a line under them, *not enough*. You have the chalk and the branch's runner at the door.
- A · *Chalk his total under yours* (hint: *The hall will see the two numbers.* flag `his-total`) · B · *Chalk yours alone* (hint: *The board is tonight's.* flag `own-total`)
*Step 2 · The margin.* Two seats, three names, and the margin is a handful. The runner says the Rows haven't come in and the hall is drifting home. Somebody has to fetch them.
- *Send the runner with his name and yours* (Charisma and Intelligence) · *Work out which street is short and go there* (Intelligence) · *Legwork. Knock the Rows yourself, book in hand, until the hall is full again* (best)
*Step 3.* Success — *Full house* — The Rows come in wet and loud and the margin stops being a handful. The returning officer writes the figure twice. Under it, in chalk, a second figure nobody asks about. · Partial — *Enough* — Half the Rows, enough of the hall. It holds. The runner says the old man would have fetched the other half himself, and you say he did, once, and it wasn't enough. · Failure — *The board stays* — The Rows stay in and the margin goes the other way. The board is wiped at eleven. You keep the chalk. The count sheet goes in the suitcase with the rest of it.
- Knock-on: *Keepsake: His count sheet* · *Chapter 5, "His seat": from {date}, at Rank 4*

**Chapter 5 · *His seat*** · art `scene.union-hq` (the faction's HQ scene)
*Step 1.* The branch's minute book, the back row of the chamber he sat in for one term. His entries stop in March '21. The secretary says the book is yours to fill now, if you want it.
- A · *Take the book* (hint: *His pages stay in it.* `took-book`) · B · *Leave his pages and start a new one* (hint: *A clean book, your hand.* `new-book`)
*Step 2 · The motion he never moved.* On the last of his pages a motion in draft, crossed through: a public baths for the Rows. The branch meets at six; the Governor wants the hour for the licence. You have the draft and a room that owes him.
- *Move it from the floor in his words* (Charisma and Intelligence) · *Cost it, then move it in yours* (Intelligence) · *Legwork. Find three members who remember the draft and bring them* (best)
*Step 3.* Success — *Carried* — The baths go to the vote and carry on a show of hands, the Governor's licence pushed to seven. The secretary writes *carried* in your hand on his page. · Partial — *Referred* — Referred to the next meeting, which is a kind of yes. The Governor is polite about it. The secretary writes *referred* and underlines nothing. · Failure — *Out of time* — The licence takes the hour and the baths wait for another March. You write the date under his, and the word *again*.
- Knock-on: *Keepsake: The minute book* · *Chapter 6, "The hall": from {date}, after you vote for a Chair*

**Chapter 6 · *The hall*** · art the faction's capital house scene
*Step 1.* The party chose its Chair this week and you voted. He never did: the ward book says the '21 ballot went out the morning he lost his seat and he didn't open it. His stub is in the suitcase, blank.
- A · *Vote his stub, for the record* (hint: *Nobody counts it. You'll know.* `voted-his`) · B · *Burn the stub* (hint: *The vote was yours.* `burned-stub`)
*Step 2 · The question from the floor.* The new Chair's first meeting at the capital house. There's a question from the floor about the orders and nobody asking it. It's his question; he wrote it on the stub's back.
- *Ask it, standing, in his words* (Charisma and Intelligence) · *Write it out and hand it to the Chair's clerk* (Intelligence) · *Legwork. Ask three branches first, so the floor is already with you* (best)
*Step 3.* Success — *Minuted* — The Chair answers it and the clerk minutes it under your name. Afterwards the Chair asks whose question it was. You say a councillor's, from '21. · Partial — *Noted* — Noted, the Chair says, which means tomorrow. Two members stop you at the door to say it was a fair question. · Failure — *Next business* — The Chair moves to next business and the floor lets it. You keep the stub. The question is still written on it.
- Knock-on: *Keepsake: His ballot stub* · *Chapter 7, "The cutting": from {date}, after your first Case File*

**Chapter 7 · *The cutting*** · art `scene.newsroom`
*Step 1.* The Herald's morgue has a cutting from March '21: *Councillor Loses Seat; Questions on Baths Fund*. Edith Crane has it on her desk when you come in. "Your father. I was the junior who wrote it. Do you want to know who gave me the story?"
- A · *Yes* (hint: *A name for the Dossier, and a debt to Crane.* `asked-crane`) · B · *No. Let him stay a councillor who lost* (hint: *Some files stay shut.* `let-it-lie`)
*Step 2 · The second source.* The story was true and the fund was his own money, which the cutting left out. Crane will print a correction twenty-five years late, if you can bring her a second source.
- *Find the clerk who kept the fund's book* (Intelligence) · *Ask Crane to run it on your name alone* (Charisma and Intelligence) · *Legwork. Walk the Rows for anyone who used the baths* (best)
*Step 3.* Success — *Corrected* — Page five, a paragraph: the fund was the councillor's own, and the baths were built. Crane signs it. Favour +5. A cutting goes in the suitcase next to the old one. · Partial — *A letter* — A letter to the editor, under your name, printed on Thursday. Crane says it's what she can do with one source. Favour +5. · Failure — *Held* — The clerk is dead and the Rows don't read page five. Crane keeps the cutting on her desk, which she says is a kind of printing.
- Knock-on: *Keepsake: The cutting* · *Favour: Edith Crane +5* · *Chapter 8, "The rule": from {date}, after a term as Governor, or three council terms*

**Chapter 8 · *The rule*** · art `scene.ministry`
*Step 1.* The Governor's desk, or the back of three terms: either way the rule that goes first is yours to choose this week. His draft from '21 is in the minute book: the baths, costed, with a line he never got to move.
- A · *Put his rule first* (hint: *The baths, in his costing.* `his-rule`) · B · *Put the rule the town needs this week* (hint: *His can wait a term.* `towns-rule`)
*Step 2 · Four of seven.* Four votes of seven, and two councillors who think a public baths is a vanity. One of them owes the branch; the other owes nobody.
- *Trade the licence hour for the two votes* (Charisma and Intelligence) · *Rewrite the costing so the baths pay for themselves* (Intelligence) · *Legwork. Walk both councillors to the Rows and show them the standpipe* (best)
*Step 3.* Success — *Four of seven* — Carried, four to three, the second councillor's hand going up last and slowest. The rule is in force from Thursday. You write *carried* on his draft and date it. · Partial — *Amended* — Carried with a cut: half the baths, the Rows' end first. He'd have taken half. You take half. · Failure — *Three of seven* — Three. The licence goes first and the baths go to the next paper. You've learned which councillor owes nobody, which is worth a term.
- Knock-on: *Keepsake: His rule, in draft* · *Chapter 9, "The list": from {date}, at Rank 5*

**Chapter 9 · *The list*** · art the faction's capital house scene
*Step 1.* Rank 5. A letter from the party's list committee: would you let your name go forward for Parliament. The same letter came to him in '20, and he wrote *no* on the back, and the reason: *the ward first*.
- A · *Write yes* (hint: *The list, when names are in.* `wrote-yes`) · B · *Write what he wrote, and then yes* (hint: *The ward first. Then the list.* `ward-first`)
*Step 2 · The backer.* The list goes by backers, and you need one who isn't the branch. The old docker who signed his deposit in '21 is still on the quay and still argues.
- *Ask him, on the quay, in front of the gang* (Charisma and Intelligence) · *Write to him with the ward book's page about '21* (Intelligence) · *Legwork. Carry for his gang a morning and ask at the break* (best)
*Step 3.* Success — *Backed* — He backs you at the break with the gang watching, and says the old man would have asked worse. The letter goes back with yes on it. · Partial — *Backed, with a condition* — He'll back you if the baths get finished. You say they will. He says the old man said that. · Failure — *The quay says no* — Not this term, he says; the ward first. You keep the letter and the reason, which is now two reasons in two hands.
- Knock-on: *Keepsake: The letter from the list* · *Chapter 10, "The republic votes": from {date}, after you vote for President*

**Chapter 10 · *The republic votes*** · art `scene.parliament`
*Step 1.* The republic voted and so did you. His polling card from '21 is in the suitcase, unused: the election was the week after he lost the seat and the ward book says *didn't go*. You have his card and the registrar's office is on the Forecourt.
- A · *Ask the registrar to strike his card* (hint: *The roll closes a name properly.* `struck-card`) · B · *Keep the card* (hint: *A name on the roll is a name on the roll.* `kept-card`)
*Step 2 · The turnout.* Turnout in the Rows was half what it was in the Villas. The result is in; the next isn't. The branch wants a canvass that explains the republic to a street that voted for a council once.
- *Speak in the Rows on why the republic's vote is theirs* (Charisma and Intelligence) · *Draw the republic as a sum on the back of a poster* (Intelligence) · *Legwork. Walk the Rows with the sum until it's in every window* (best)
*Step 3.* Success — *The sum in the window* — The sum is in forty windows by dark and three people ask when the next one is. The branch counts it as a canvass; you count it as his. · Partial — *Twenty windows* — Twenty windows and a long argument at the standpipe about whether the capital counts. It does. Half the street believes you. · Failure — *Rain* — Rain, and the posters run. The sum is in your pocket. The Rows will vote next term or they won't; you'll be there.
- Knock-on: *Keepsake: His polling card* · *Chapter 11, "Twenty-five marks": from {date}, when your name is on the party's list*

**Chapter 11 · *Twenty-five marks*** · art the faction's capital house scene
*Step 1.* Twenty-five Political Capital and your name on the party's list for Parliament. The clerk's receipt is the same form as the one from '21 in the tin. He never filled this one in. Somebody has to say so.
- A · *Tell the list committee whose child you are* (hint: *The list will know.* `told-list`) · B · *Say nothing; let the name stand on its own* (hint: *It's your name on the receipt.* `own-name`)
*Step 2 · The place on the list.* The list goes by backers and you're third. Third is a seat only if the party takes three. One more backer puts you second.
- *Ask the Chair for the party's backing, in the Officers' room* (Charisma and Intelligence) · *Show the second-placed name the arithmetic and ask them to swap* (Intelligence) · *Legwork. Find one member in every branch who'll back a name from the Rows* (best)
*Step 3.* Success — *Second* — Second on the list by the close of names. The Chair says the Rows have never had a second. You say they had a first, once, who wrote no on the back. · Partial — *Third, with a promise* — Third, and the Chair's word that the party will push for three seats. A word is a word. The receipt is stamped. · Failure — *Third* — Third. The arithmetic doesn't move and neither does the second name. The receipt is stamped anyway, and filed with his.
- Knock-on: *Keepsake: The list's receipt* · *Chapter 12, "Under his name": from {date}, when you take a seat in Parliament*

**Chapter 12 · *Under his name*** · art `scene.parliament`
*Step 1.* The roll of the chamber, and a clerk with a pen. "Name as it is to be entered." The ward book is in your coat. The clerk is waiting.
- A · *Your name, and his after it* (hint: *Two names on the roll.* `two-names`) · B · *Your name* (hint: *His is in the book. Yours is on the roll.* `one-name`)
*Step 2 · The maiden speech.* A deputy's first words in the chamber, and the baths fund of '21 is a sentence you could say or not. Sixty seats, three parties and a gallery with the Herald in it.
- *Say it, standing, to the chamber* (Charisma and Intelligence) · *Write it into a question on the public baths bill* (Intelligence) · *Legwork. Say it first in every branch, so the chamber has heard it before you stand* (best)
*Step 3.* Success — *On the record* — The chamber hears it and the record has it: a councillor, a fund, a baths, a seat lost, a seat taken. The Herald prints the sentence. The clerk hands you the rosette they give new deputies, and you wear it. · Partial — *In the question* — The question is on the order paper with the sentence in it, which the clerk says is the record too. The rosette is yours. · Failure — *Next speaker* — Your name is called and the chamber is loud and the sentence stays in your coat. The rosette is yours anyway. You'll stand again; there's a term.
- Knock-on: *Keepsake: His rosette · wear it from the Me tab* · *Finish His Work: completed · Legacy +30*

### 16.2 The two due chapters

**_Clear His Name_ · chapter 2 · *The night foreman*** · requirement Level 6 · difficulty 14 · 15 Energy · 300 / 80 / 150 · keepsake `keep.foremans-name` · art `scene.factory-gate` · Letters row *From the prison letter's margin*
*Step 1.* The prison letter names nobody, but the margin does, in pencil, in another hand: *Brandauer, nights*. The mill still runs nights. The gate lists the foremen on a board you can read from the road.
- A · *Read the board and go in* (hint: *Twenty years of foremen.* `read-board`) · B · *Ask the union clerk who Brandauer was* (hint: *A name for a name.* `asked-clerk`)
*Step 2 · Nights.* Brandauer kept the night book for the mill in '19 and the night book is in the gatehouse, under the new one. The watchman is the kind who can be talked to, or walked past.
- *Talk the watchman into an hour with the book* (Charisma and Intelligence) · *Read the shift times off the board and go in when the gate is empty* (Agility; **Heat +6, whatever happens**) · *Legwork. Carry nights for a week and read the book on the break* (best)
*Step 3.* Success — *The night book* — March '19, the night of the fire: Brandauer signed in, your father didn't; he was on the day book. The page goes in your pocket. Brandauer went to the capital in '22 and did well. · Partial — *A page torn out* — The night of the fire is torn out, which is a kind of evidence. Brandauer's name is on the pages either side. The watchman says the book's been like that for years. · Failure — *The new book* — The old book is gone to the company's archive in the capital. The board says Brandauer, nights, '18 to '20. That's the name; the proof is in Irongate.
- Knock-on: *Keepsake: The foreman's name* · *Dossier: an entry on Konrad Brandauer · political* · *Chapter 3, "The archive": from {date}, after your first Case File*

**_Settle His Debts_ · chapter 3 · *The collector*** · requirement Rank 3 · difficulty 16 · 15 Energy · 350 / 90 / 200 · keepsake `keep.collectors-card` · art `scene.street` · Letters row *From under the door*
*Step 1.* A card under the door: a name, a Clearwater address, and *Friday* underlined twice. The ledger page says the debt is four hundred. The branch says the collector drinks at the Anchor on Thursdays.
- A · *Meet him at the Anchor* (hint: *A public house is a public place.* `met-him`) · B · *Pay a hundred on account and send the rest of the week away* (hint: *A hundred buys a week.* `paid-hundred`; **−100 Iron**) 
*Step 2 · Thursday.* He's a small man with a big ledger and the branch's own barman keeps his glass full. He wants four hundred or a favour. The favour is a parcel to Clearwater, no questions.
- *Talk the debt down to two hundred and a signature* (Charisma and Intelligence) · *Lift the ledger page with your father's name while he's at the bar* (Agility; **Heat +6, whatever happens**) · *Legwork. Find three men he's squeezed and bring them to the next table* (best)
*Step 3.* Success — *Two hundred and a signature* — Two hundred, a signature, and his card torn in half on the table. The barman pours one on the house. The parcel is not mentioned again. · Partial — *A month* — A month's grace and his card kept, which is a month. He says the syndicate is patient with people who pay. You say you'll pay. · Failure — *The parcel* — He keeps the ledger, the debt and his glass. The parcel goes to Clearwater Friday, he says, with or without you. His card is on the table when he leaves.
- Knock-on: *Keepsake: The collector's card* · *Chapter 4, "The parcel": from {date}, at Level 16*

### 16.3 The Front's eight tier-1 actions (Clearwater; difficulty 10; outcome texts ≤ 240)

| Id | Place | Title | Type · stat · Energy |
|---|---|---|---|
| `clearwater.promenade.canvass` | The Promenade | Talk to people on the benches | canvass · CHA+INT · 10 |
| `clearwater.promenade.watch` | The Promenade | Watch who walks with whom | intelligence · INT · 4 |
| `clearwater.casino.bar` | The Casino | Talk to people at the long bar | canvass · CHA+INT · 10 |
| `clearwater.casino.listen` | The Casino | Listen at the cashier's window | intelligence · INT · 3 |
| `clearwater.lido.deckchairs` | The Lido | Talk to people in the deckchairs | canvass · CHA+INT · 10 |
| `clearwater.lido.bandstand` | The Lido | Speak from the bandstand | speech · CHA+INT · 12 |
| `clearwater.pier-hotel.lounge` | The Pier Hotel | Talk to people in the lounge | canvass · CHA+INT · 10 |
| `clearwater.pier-hotel.porters` | The Pier Hotel | Listen to the porters | intelligence · INT · 3 |

Blurbs (≤ 200): **The Promenade** · *A mile of benches, a bandstand and the people who have time for both. The money side of town walks here at four and talks about the other side.* · **The Casino** · *The company's domed palace: a long bar, the tables after midnight, and the committee room upstairs it lends the council. The cashier sees everything.* · **The Lido** · *The lake's pavilion and its deckchairs, the bandstand the parties fight over, a Sunday crowd that reads the Courier and votes.* · **The Pier Hotel** · *Terraces over the water, tea at four, a lounge where the bank's business is done quietly. Julius Marr keeps a table by the window.*

Outcome texts (Success / Partial):
- *Talk to people on the benches* — *A bench a vote* — Four benches, four conversations, one of them a councillor's widow who has opinions about the trams. She'll tell her bridge table. / *The band starts* — Two benches before the band starts and nobody can hear the trams argument. The widow waves.
- *Watch who walks with whom* — *Four o'clock, as usual* — The tram director walks with the casino's manager, as usual, and today with a third man who isn't. You note the hat. / *A hat* — Rain at four and the walkers under the bandstand. One hat you'd know again.
- *Talk to people at the long bar* — *The bar's view* — The long bar talks licence, trams and who's buying. Three of them will vote, one of them for you. / *A round you didn't buy* — Somebody else's round and the talk stays on the tables. One name, one maybe.
- *Listen at the cashier's window* — *The cashier's arithmetic* — Chips out, chips in, and who signs for them. The cashier's book is a ledger of the Front. One line worth remembering. / *A busy night* — Too busy to overhear anything but the sums. The sums are large.
- *Talk to people in the deckchairs* — *A Sunday's worth* — The deckchairs vote and say so: the bandstand, the licence, the Rows' water. Three conversations, one convert. / *Sunburn* — Two deckchairs and a child with a bucket. One of the two is yours.
- *Speak from the bandstand* — *The bandstand's ours* — Twenty minutes before the band, two hundred deckchairs, and the lake carries a voice. They clap because it's Sunday; some of them mean it. / *The band's early* — Ten minutes and the brass. A knot by the pavilion stays to argue, which is the point.
- *Talk to people in the lounge* — *Tea and a vote* — The lounge talks quietly and votes loudly. A retired magistrate, a tram shareholder, a sister from the sanatorium: three views, one yours. / *The waiter's eye* — The waiter has opinions about who sits where. Two conversations before you're moved.
- *Listen to the porters* — *What the porters carry* — Who arrived, who paid cash, who had the banker's table. Porters know the Front by its luggage. / *Luggage only* — Trunks, a dog, a crate marked fragile. The dog's name is Max.

### 16.4 Dossier lines (twenty; `{name}`, `{party}`, `{place}`, `{weekday}`, `{city}`)

- **political:** *Met the {party}'s organiser at {place} on {weekday}, an hour, no minutes.* · *Spoke against the {party}'s rule at a meeting the paper didn't cover.* · *Has a letter from the Chair's office; carries it.* · *Backed a name the branch didn't, quietly, in {city}.*
- **criminal:** *Paid off a constable at {place} on {weekday}; the constable's name is in the book.* · *Signed for a parcel at the station that wasn't theirs.* · *Was in the cells at {place} in '45 under another name.* · *The licence at {place} was renewed on a signature that isn't the clerk's.*
- **pattern:** *At {place} every {weekday} after six.* · *Takes the last tram from {place}; alone.* · *Lodges above the shop at {place}; a light until two.* · *Leaves {city} on the {weekday} train and is back by Monday.*
- **asset:** *Owns the lease on {place}, through a cousin.* · *Owes the bank in Clearwater; the bank is patient.* · *Keeps a box at the station's left-luggage, paid a year ahead.* · *Sold a share in the tram company the week before the fare vote.*
- **neutral:** *Drinks at {place}; tea, not beer.* · *Has a sister at the sanatorium; visits {weekday}s.* · *Reads the paper standing up at {place}.* · *Walks a dog called Max on the front at four.*

### 16.5 Patron Requests (orders DSL; `target`, `match`)

| Id | Patron | Title | Line (the letter) | Match · target |
|---|---|---|---|---|
| `req.crane.files` | Crane | Two entries for my files from {district} | The Herald keeps files. Mine are thin on {district}. Two entries by {until}; what they say is your business. — E.C. | dossier entries, `cityId: irongate`, `districtId` rotating · 2 |
| `req.crane.issue` | Crane | A speech on the Herald's Issue | The paper is arguing about {issue} and so should the street. One speech, tagged, where the Herald's man can hear it. | speech, `issueTagged`, `cityId: irongate` · 1 |
| `req.crane.boxes` | Crane | Watch the boxes for me | The Opera's boxes on a Thursday are the republic in miniature. Watch and listen, and tell me who sat with whom. | surveillance mission, `cityId: irongate` · 1 |
| `req.crane.hill` | Crane | Three posters where the Hill can read them | Garrison Hill reads the fences on its way down. Three lots of paper by {until}. | propaganda, `districtId: irongate.garrison-hill` · 3 |
| `req.crane.club` | Crane | A word at the Press Club | My own staff tell me nothing. Listen at the club bar once and tell me what they're saying about the Herald. | intelligence, `locationId: irongate.press-club` · 1 |
| `req.crane.print` | Crane | Something I can print | You have a Case File and I have a page. Take it to the paper by {until}. | expose · 1 (Level 16; else skipped) |
| `req.marr.cannery` | Marr | A watch on the cannery gate | The cannery owes the bank and the bank likes to know who comes and goes. One watch, after dark. — J.M. | surveillance mission, `cityId: clearwater` · 1 |
| `req.marr.tables` | Marr | A word at the tables | The tables after midnight are where the Front says what it thinks. Be there, dressed for it. | social mission, `locationId: clearwater.casino` · 1 |
| `req.marr.rows` | Marr | Three conversations in the Rows | The Rows think the bank is against the town. Three conversations that say otherwise, by {until}. | canvass, `cityId: clearwater` · 3 |
| `req.marr.ferry` | Marr | Who comes off the ferry | Twice this week, the ferry stage at the hour. Who comes off with luggage and who without. | intelligence, `locationId: clearwater.harbour` · 2 |
| `req.marr.courier` | Marr | A speech the Courier will quote | The Courier quotes anyone who speaks on the lake. Give it a sentence about the bank's patience. | speech, `cityId: clearwater` · 1 |
| `req.marr.tea` | Marr | Tea, Thursday | My table by the window, four o'clock. Come dressed. | social mission, `locationId: clearwater.pier-hotel` · 1 |

### 16.6 The exposé's texts (step 3; per angle)

- **Plainly** · Success — *Page three, every line* — Every line checked, every line printed, no adjectives. The {party}'s office rings the editor at nine. The editor says it's all true, which it is. · Partial — *Three of five lines* — Three lines survive the lawyer and run on page three. The {party} calls it gossip. Two of the five are still true. · Failure — *Spiked* — The editor wants a second source on the second line and won't run the rest without it. The file goes back in your coat.
- **The headline** · Success — *Page one* — The front page, your name under the headline, {subject}'s face from the morgue. By noon the {party}'s office has issued a denial that repeats the story. · Partial — *Page three, with a headline* — A headline on page three and your name under it. The editor says page one wanted one more line. The {party} says nothing at all. · Failure — *Spiked* — The editor reads it twice and says the front page is for things that stand up. The file goes back in your coat; so does the headline.

### 16.7 Help notes (the review-1 pattern, two lines)

| Key | Kicker | Note |
|---|---|---|
| `charisma` | Charisma | What you wear. Your coat, what's on you and a flat in town add up to it. It opens society doors and gets you recognised on rival ground. |
| `wardrobe` | The Wardrobe | Four slots: Coat, On you, Papers, Tools. Two outfits, Town and Plain clothes, one tap to change. Shops are cards on the places that sell things. |
| `plainClothes` | Plain clothes | Charisma under 10. On rival ground nobody looks twice at work clothes; an office or a famous name still carries, half as far. |
| `dossier` | The Dossier | What you know about the republic's named people. Entries come from watching and listening; they go stale in a week and count half after. Three on one name make a Case File. |
| `caseFile` | A Case File | Three entries' worth on one name, bound. Take it to a newspaper for an exposé, sell it at a station, or turn it into an informant with a patron's help. |
| `favour` | Favour | How much a patron thinks of you, 0 to 100. Requests, gifts and society calls raise it; nothing lowers it. Acquaintance at 10, Associate 30, Confidant 60, Protégé 90. |
| `legacy` | Legacy | Your record in the republic: terms, titles, exposés, a completed Ambition. Public and permanent. Points buy small lasting perks and are never lost. |
| `season` | The season | Three terms, eighty-four days. The third term's vote decides the Champion. Then the map settles halfway back, the law book empties, and everything you own stays. |
| `home` | Where you sleep | A rented room gives +10 Rested a night. A flat gives +25, a bigger Rested cap, a third outfit and +2 Charisma in its town, for 150 a week. If the rent runs out the flat waits. |
| `society` | A society call | A mission that needs Charisma: the door is ten under the figure, and the figure is the difficulty. It pays Favour with the town's patron and sometimes a Dossier entry. |

---

## 17. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 4 Oct 2026 (slice-8 design)" change table |
| §1.5 | The slice-8 words (the Wardrobe, outfits, the Dossier, a Case File, Favour, Legacy, the season, the back room, a society call) |
| §3.3 | Slice 8: Letters carries patron Requests and informants; the desk's Dossier, Patrons, Where you sleep and Ahead rows; the season front page |
| §5.2 | Case Files at Level 16 confirmed; the flat and patrons at Level 10 |
| §6.3 | The home's Rested at the boundary; the flat's cap +50 (the larger of a room and a flat) |
| §6.7 | *Lodged* and *Weatherproof* not built; the flat is the lodging |
| §8.2 | The table rewritten to the slice-8 catalogue; worn Charisma includes the flat's +2; recognition pinned |
| §8.4 | *The right item* row: the slice-8 effects and the `chancePct` bound |
| §10 | Rewritten for slice 8: names, entries, sources and chances, capacity with the perks, freshness, Case Files at Level 16, the three uses, informants, the exposé's steps and numbers; Blackmail and Denounce deferred |
| §11.3 | The record's surcharge at shops (+15 % / +30 %) |
| §11.4 | The back room's bribe pinned (500 / 1,000 / 2,000 a mark) |
| §13.1 | The exposé and the society call as tier-2/3 shapes |
| §13.3 | The `social` mission type row |
| §13.6 | Rewritten: society calls at the tier-2 rate; the six calls and their Charisma; the door rule |
| §14.1 | The Front's four places open (Appendix C #71 closed) |
| §14.12 | Recognition pinned; plain clothes; forged papers and the press pass; a recognised visitor is counted |
| §16.2 | Presence: a recognised visitor counted as *1 from another party* |
| §17.1 | Chapters 4–12 of *Finish His Work*; *The night foreman*; *The collector* |
| §17.2 | Rewritten: the two MVP patrons; Favour sources and numbers; Requests; the perks by tier pinned |
| §17.3 | New rows (Governor, deputy, exposé, Protégé, award); perk costs; the spend balance |
| §17.4 | The MVP form: the room's +10, the flat's numbers, the rent that waits, one flat, moving |
| §18.3 | Prices pinned: clothing 150–20,000; the flat; gifts 200; bribes 500–2,000; Dossier sales |
| §19.3 | *Black Market Contact* → the back room (forged papers, wire cutters, the bribe) |
| §20.3 | No weapon items in the MVP; power from the worn coat's armour |
| §21.1 | Four slots: clothing, accessory, document, utility; no weapon |
| §21.2 | Tiers said in plain words; the slice-8 examples |
| §21.3 | Crafting post-MVP |
| §21.4 | The slice-8 catalogue and keepsakes |
| §22 | The season pinned: three terms; the score (+100 per election); the Champion; four awards; the Hall of Fame; the rollover table; the track and twists not built |
| §25 | Slice 8's scope line; Blackmail, Denounce, the other patrons, the townhouse, the track, twists, crafting after the MVP |
| Appendix A | Wardrobe, outfit, Case File, exposé, Favour, Request, Legacy, the season, the back room |
| Appendix C | #71 closed; new #74 (no weapon slot), #75 (recognition sizes), #76 (the exposé's swing), #77 (Favour pace), #78 (Blackmail and Denounce deferred), #79 (the flat waits), #80 (no track or twist in season 1), #81 (the season score's +100) |

Companion edit: `docs/economy.md` §22.

---

## 18. Questions for the architect (each with a default)

1. **Slots and effects.** `ItemSlot` becomes the four; `ItemSpec` gains `armour`, `effects: ItemEffect[]`, `level`, `rank`, `factionId`, `price`, `wearable` (a keepsake with a slot is wearable); `Equipment` gains the two slots; worn CHA adds the flat's +2 when `character.home.cityId === currentCityId` and paid. Default: items stay catalogue content; the character's `inventory[]` and `equipment` as ADR 0014; **outfits** as `outfits: { town: Equipment, plain: Equipment, evening?: Equipment }` plus `wornOutfit: 'town' | 'plain' | 'evening' | null` (null when the worn set matches none).
2. **Shops** are `Location.shop?: { id, kicker, items: ItemId[], buys: boolean }`; the catalogue holds the price; a buy is one conditional update (Iron ≥ price, Level, Rank, faction, the surcharge computed server-side).
3. **The Dossier** is a collection (`dossierEntries`, plan §5) with the character's `dossier: { count, capacityExtra }` projection; Case Files are entries of kind `file` with `lines[]` and `kinds[]`; informants are files with `until` and a `nextReportDay`, reported by the day job into the paper and the collection.
4. **Entry chance** is rolled in the action's transaction from the seeded RNG after the check (one roll; the knock-on line carries it); the subject is drawn from the city's names weighted two-to-one to rivals.
5. **The exposé** is an `AmbitionRun`-shaped story (`story { kind: 'expose', fileUid, step, flags }`), resumable, at a `press` location; the swing uses the opinion write of ADR 0022 against the subject's party in the subject's city or district.
6. **Patrons**: `patrons: { [patronId]: { favour, firstVisitDay, requests: [{ id, fromDay, until, progress }], lastGiftDay, lastFavourDay, tier } }` embedded; Requests resolve from the orders' matcher (ADR 0009's computed progress) with `fromDay`; the +6 is paid at the boundary by the day job.
7. **The flat**: `home: { kind: 'room' | 'flat', cityId, paidUntilDay }`; the Rested at the boundary and the cap read it lazily; the *Evening* outfit's chip is enabled by `paidUntilDay ≥ today`.
8. **Legacy**: `legacy: { entries: [{ kind, day, points, ref }], spent, perks: [] }` embedded (bounded: a few dozen entries a season); the awards and the Champion write entries from the season job.
9. **The season**: `seasonDay(dayKey)` in `packages/rules` beside `termDay`; a `seasons` collection; the rollover as the day-0 job after the national seating, one transaction per city for the halfway drift and one for the laws.
10. **Recognition** is a pure function `recognition(wornCha, isNight, highestOffice, legacy, plainClothes)` added to the run-in roll on rival ground; the client shows the tag from the server's view.
11. **Test hooks:** grant an item; set worn Charisma; force an entry; force a Case File; step the season day; force the Season Election; force Favour; force the rent's lapse; the e2e: buy a coat → wear → a society call; three entries → a file → an exposé → the swing and the headline; a Request → done → +6; the flat → the rent lapses → waits → paid.
12. **Playtest report:** items bought by tier and day; outfit changes per day and before rival-ground journeys; entries per day, stale share, files made, exposés by outcome; Favour per patron per day and tiers reached; flats bought and rent lapses; perks bought; and, for the question, the share of players with at least one unfilled clock (a file in progress, a tier under 30 away, a chapter date, rent paid ahead) at day 14 against their day-21 return rate.
13. **The QA vocabulary test:** *Wardrobe*, *outfit*, *Charisma*, *Dossier*, *Case File*, *exposé*, *patron*, *Favour*, *Legacy*, *season*, *Champion* are allowed; *inventory*, *equipment*, *slot*, *tier*, *armour*, *CHA*, *utility*, *loadout*, *Black Market*, *NPC* must not appear in a player string; *the Front* keeps its allowance.

---

## 19. Art needed (noir lithograph, `mvp/` style; checked against the folder first)

**Items are drawn as the twenty existing ones:** a single object on cream paper, 512 × 512, ink line with a muted two- or three-colour wash, a soft drop shadow, no scene, no text, no symbol. **Already there and used:** `winter-coat.jpg` (the standard coat), `alliance-campaign-suit.jpg`, `officer-overcoat.jpg` (the dress greatcoat), `evening-dress.jpg`, `three-piece-suit.jpg`, `lapel-badge.jpg`, `gold-wristwatch.jpg`, `forged-papers.jpg`, `press-camera.jpg`, `propaganda-kit.jpg`, `wire-cutters.jpg`, `document-folder.jpg` (the keepsakes), and the three starting outfits. **Not used:** `revolver.jpg`, `truncheon.jpg`. **Scenes used as they are:** `newsroom.png` (Crane, Herald House), `hotel.png` (the Pier Hotel, the tailor), `bar.png`/`bar-anchor.png` (the back room), `market.png` (the stall), `square.png` (the Promenade, the Lido), `election-night.png` (the season), `parliament.png` (chapters 10 and 12), the HQ scenes.

| # | Asset id | What it is | Format |
|---|---|---|---|
| 1 | `item.stewards-jacket` | **Redraw** of `vanguard-field-jacket.jpg`: the same belted four-pocket wool jacket with **a plain collar (no collar tabs)**, dark grey, horn buttons; a steward's civilian jacket | item 512 × 512 |
| 2 | `item.convenors-coat` | The Collective's good coat: a long dark-brown wool coat with a wide collar, a red wool scarf folded inside it, worn cuffs | item |
| 3 | `item.correspondents-suit` | The Alliance's Tier III: a grey herringbone suit with a waistcoat, a press card tucked in the breast pocket, a folded newspaper | item |
| 4 | `item.good-hat` | A dark felt hat with a grosgrain band, brim down at the front, on cream | item |
| 5 | `item.press-pass` | A card in a worn leather holder: *PRESS* in plain capitals, a stamp, a photograph corner; no masthead | item |
| 6 | `item.fountain-pen` | A black fountain pen with a gold nib and a worn clip; Edith Crane's | item |
| 7 | `item.cigarette-case` | A silver cigarette case, engine-turned, open to show the band; Julius Marr's | item |
| 8 | `item.rosette` | A deputy's rosette: cream and ink ribbon, a plain centre, no device or colour of any party | item |
| 9 | `scene.flat` | A rented flat at night: one room with a bed, a wardrobe with three coats on the door, a window over tram wires, a gas ring; a paper on the chair | scene 2688 × 1520 |
| 10 | `scene.casino` | The Casino's long bar after midnight: the domed room, the tables beyond, a cashier's window, the Front's money in evening dress | scene |
| 11 | `scene.lido` | The Lido on a Sunday: the pavilion, deckchairs to the water, the bandstand with a brass band, the lake behind | scene |
| 12 | `scene.front-page` (optional) | A newspaper front page coming off the press, the headline band blank (text is never drawn), a pressman's hands; the exposé's result art, else `newsroom.png` | scene |

Twelve pieces (eleven with the optional). The crest rule holds: nothing on any coat, cap, hat, badge, rosette or wall.

---

## 20. Points for the user (each with the default this document takes)

1. **No weapon slot, no weapons as items** (§3.1, GDD §21.1, §20.3). Default: **none**: a run-in is Strength and a coat with some weight to it; the revolver and truncheon pictures are left uncatalogued. The alternative keeps §20.3's weapon tiers as items, which makes a political game look armed.
2. **The two MVP patrons are Edith Crane and Julius Marr** (§5.1), both neutral, both in battlegrounds. Default: **Crane and Marr**, so every faction courts them on the same terms and the patron pages stand on Herald House and the Pier Hotel. The alternative gives each faction its home patron (Draganov, Reinholt, Voss), which is three patrons and one each.
3. **Outfits are three fixed names, Town, Plain clothes and Evening** (§3.3), not renamable, the third from a flat. Default: **fixed**, so every player and every help note says the same three words. The alternative is Fallen London's renaming.
4. **The exposé's Failure keeps the Case File** (§4.5). Default: **kept** (spiked, not spent), because a file is a week's work and a Failure that destroyed it would be the one thing in the slice that takes an asset by the dice. The alternative spends it on every outcome.
5. **The flat is the only home with a price in the MVP** (§6): 2,500 and 150 a week, the rent waits, one flat per player. Default: **the flat alone**; townhouse and villa after the MVP as the plan says.
6. **The season score's election bonus is 100, not the GDD's 10** (§9.2). Default: **100**, so a national election is worth about a month of a four-point lead. The alternative keeps 10, at which the elections cannot change the Champion.
7. **No season track and no Season Twist in season 1** (§9.3). Default: **neither**; the skeleton is the election, the Champion, the awards and the rollover. The alternative builds the thirty-tier free track now.
8. **Blackmail and Denounce are deferred** (§4.3); the Dossier's uses are the exposé, the sale and the informant. Default: **deferred** (they need a favour economy with players and a removal rule that reads as fair). The alternative builds Denounce for controlled cities now.
