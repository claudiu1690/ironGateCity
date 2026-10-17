# Slice 8 — "A life in the city": the Wardrobe, the Dossier and exposés, two patrons, a flat, the Legacy record, Ambition #1 complete, bodyguards and the bar

**Status (16 Oct 2026): approved by the user (§20's eight defaults as written); building. Political Seasons are deferred out of the slice (§23); bodyguards and the bar services with their buffs are designed in §24.** The title's *Political Season* is gone from the slice; §9 is kept as the design for a later slice.

Game designer, 4 Oct 2026. Companion to `docs/design/slice-8-screens.md` (the screens) and `docs/design/inventory-research.md` (the research behind the Wardrobe); `docs/economy.md` §22 has the sums. The architect writes the slice-8 tech design from these; every rule and number here is also in the GDD (edits listed in §17). Builds on slices 5 (Heat, missions, rival ground), 6 (the Faction tab, profiles, favours) and 7 (offices, terms, Clearwater, laws).

**Playtest question:** do players have goals for the next month, not just the next session?

**The answer this slice gives:** goals are **cards with clocks** that the player sees filling: a Case File (three fresh entries on one name), a patron's next tier (Favour 30, 60, 90), a Request due Thursday, a flat's rent, the next Ambition chapter's date, and the season's election with its awards. None of them needs the player at a set time; every one of them pays when it fills and waits when it doesn't.

**Rules this design obeys:** one tap or one choice by default, stories at most three steps and resumable; nothing owned is ever destroyed, sold by accident or lost by absence (homes and clothes included); no weapon is an item; campaign vocabulary; the check formula is untouched (§8.4), combat is one choice (§20); no real-world symbol on any item; plain words, no dice maths; server-authoritative; content is data; faction names as they are. **Player-facing words** follow GDD §1.5; the slice's new ones are in §1.1.

---

## 1. The design in one paragraph

What you wear is your **Charisma**, and from this slice it is also a decision: the **Wardrobe** has four slots in plain words (*Coat · On you · Papers · Tools*), two outfits with names (*Town* and *Plain clothes*; a flat adds *Evening*), and shops that are cards on the places a player already stands in. A good coat opens the opera and the casino and gets you recognised on rival ground; plain clothes do the opposite. The **Dossier** opens as the fourth tab: entries on the republic's named people, gathered by watching and listening, going stale after a week; three on one name make a **Case File**, and a Case File taken to a newspaper is an **exposé**: three steps, one check, a headline with your name and a swing against the subject's party in their town. Two **patrons** can be courted over real days, **Edith Crane** of the *Herald* and **Julius Marr** of Clearwater, with Requests in the morning paper, gifts, and perks at 10, 30, 60 and 90 Favour. A **flat** is the first home with a price: 2,500 Iron and 150 a week, prepaid, never repossessed. The **Legacy** record is the public, permanent account of what a player did, with small permanent perks bought from it. ***The Names on the Stone*** (review 5; was *Finish His Work*) runs to its twelfth chapter, a seat in Parliament and the forty names read out there. And the **Political Season** gets its skeleton: three terms, the Season Election, the Champion faction and four awards, the Hall of Fame, and a rollover that resets the map halfway and nothing a player owns.

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
| Season · Season Score · Season Champion · rollover | **the season** · **the season's score** · **Champion of the season** · **the new season** (*deferred with the season, §23*) |
| Black Market | **the back room** (of a bar) |
| Bodyguard · contract · tier I–III | **someone to walk with you** · **a week, paid** · **a doorman / a steward / a minder** (§24.1) |
| Buff · Well-Fed · In Good Spirits | (never *buff*) · **well fed** / **well fed, properly** · **in good spirits** (§24.1) |
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
| ~~The season~~ | deferred out of the slice (§23) | — |
| Someone to walk with you (a bodyguard) | Level 6, a member (a doorman); Rank 3 (a steward); Level 16 (a minder) | the party store's card (§24.2) |
| The bar's card (a round, a plate) and the dining room (dinner, Charisma 10) | Level 1 at any bar; a hotel's dining room from the Wardrobe's Charisma 10 | the place card (§24.3) |

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

A place's sheet may carry a **`shop`** (content on the location, like `jobs`): a kicker (*FOR SALE · THE CLOTHES STALL*), the items it sells with prices, what it buys. One tap buys (a confirm sheet when the price is over 1,000 Iron: *Buy the greatcoat for 4,500 Iron?*); a modal `bought`. Buying needs the item's Level and, where set, Rank or membership. **The clothes stall buys anything sellable at a tenth of its catalogue price** (so a party coat *sells for 80 Iron at a market*); every other shop buys only what it sells, at the same tenth; never keepsakes, never the kit, never a worn item (settled 4 Oct 2026, §21 Q1). *Sell something* opens the sellable items as rows, each with a confirm sheet (selling is the one act that takes a thing away by the player's own hand, so it is never one tap).

| Shop | Place kind | Where in the MVP | Sells |
|---|---|---|---|
| **The clothes stall** | `market` | Market Row (Coalport), the Customs Market (Duskwall), Bridge Street (Ashford), Market Square (Irongate), Back Lane Market (Clearwater) | the standard coat, a good hat |
| **The party store** | `faction-hq` (members only) | every HQ, the capital houses | the party's coat (II), the party badge, paste and brush, **the press pass and the press camera** (settled 4 Oct 2026, §21 Q33: the branch has a tame reporter, so a Level-6 item is not behind the Level-10 train for Coalport and Duskwall) |
| **The tailor** | `hotel`, or the Mountain Inn (a `bar` with rooms; §21 note 6) | the Grand Hotel (Irongate), the Pier Hotel (Clearwater), the Mountain Inn (Duskwall) | the greatcoat, evening dress, the wristwatch (III); the three-piece suit (IV, the Grand Hotel only) |
| **The press** | `press` | **Herald House and Gazette House** (the Clarion and the Sentinel are mastheads, not places; §21 Q33) | the press pass, the press camera; the correspondent's suit (Gazette House, Alliance members, III) |
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

Eleven items exist (slice 2, 3, 5, 7). The slice adds **nineteen** wearable or usable items (the rosette, the pen and the case among them: wearable keepsakes) and **ten slotless keepsakes** (the chapters, §8). Art ids in `packages/content/src/data/art.ts`; files in `mvp/items`; *new* = §19.

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
| `acc.his-rosette` | The memorial ribbon | On you | — | 5 | — | — | — | *The Names on the Stone* chapter 12 | keepsake (wearable) | *new* `item.rosette` (a plain black ribbon; *His rosette* until review 5, id kept) |
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
| An **informant** (§4.4) | one entry every 2 days for 14 days (seven reports) | pattern and political, alternating | a name of the informant's town (§4.4; settled 4 Oct 2026, §21 Q20) |

Every entry is a knock-on line on the result modal (*Dossier: an entry on Josef Baum · political · goes stale on Thursday*) with the small book mark the tab's dot uses.

### 4.3 Case Files (§10.4, pinned; **Level 16**)

**Three or more entries' worth on one name** (fresh 1, stale ½) can be bound into a **Case File**: one tap on the name's card (*Make a Case File · 3 entries*), the entries are consumed, the file keeps their lines and their **kinds** (the categories present) and **does not go stale**. A file takes one slot. A name can have one file at a time; new entries on the name start a second count. The knock-on line reads *Case File: Josef Baum · political, pattern*.

**Uses in the MVP:**

| Use | Needs | What happens | Where |
|---|---|---|---|
| **An exposé** (§4.5) | a political or criminal line in the file | a three-step story; a swing against the name's party; a headline with your name; the file is spent on a Success or a Partial | a `press` place |
| **Sell** | any file or entry | **a file 200 Iron; a fresh entry 50, a stale one 25**; one tap, a confirm sheet; the paper does not print it | a `station` place (*the man by the left-luggage*): **Central Station, the Goods Yard (Duskwall) and Clearwater Station** in the MVP (Coalport's and Ashford's stations sit in teaser quarters; §21 Q33) |
| **An informant** (§4.4) | a pattern line, and **Associate** with the patron of the name's city | the file becomes an informant for 14 days | the Dossier tab |

| **The Headline Story** (slice 6's Alliance event, GDD §16.3) | a file on a name of the event's target party | the caller may attach it at the call (one tap on the call sheet's new row *Attach a Case File*); the file is spent, the name burned for 14 days, the event's swing +50 % and the name in the result's headline | the call sheet |

**Deferred (post-MVP):** Blackmail, Denounce (Appendix C #78). The *Sell* rule covers §10.4's 50–200 range.

### 4.4 Informants (the Associate perk)

A Case File with a pattern line, in a city where the player is **Associate** or better with its patron, can be **turned**: one tap, *Recruit as an informant*; the file is spent; for **14 City Days** the paper's Letters row carries *From your informant* every second morning with **one entry** (pattern or political, alternating) on a name of that city; the Dossier tab lists the informant with its days left. At most **two informants** at a time. Nothing to collect: the entry is in the Dossier when the paper is read, slot permitting (full: *went begging*).

### 4.5 The exposé (three steps; the slice's story)

At a `press` place (**Herald House or Gazette House**; the Clarion, the Sentinel and the Courier are mastheads, not places: a Coalport or Duskwall player prints in the capital or in Ashford; §21 Q33), the sheet carries a ticket **Take a Case File to the paper · 20 Energy** when the player holds a file with a political or criminal line, dimmed with the reason otherwise (*No Case File with something to print*). **One exposé a day** per player (the editor prints one story). Tier-3 shape (§13.1): a choice, a check, the result; resumable.

**Step 1 · the file and the angle.** The files that qualify as rows (the name, the party, the lines, *3 lines* / *5 lines*); then two choices (a flag): ***The facts, plainly*** (*Every line checked, nothing added. What they lose goes to the undecided; none to your party's name.*) or ***The story, with a headline*** (*Your party's name under it: half of what they lose comes to you. A point harder.*). **The page is the outcome's, not the angle's** (a Success is the front page on either; §25 #4). The flag chooses the texts and the split of the swing: *plainly* takes the swing from the party to **Neutral** entirely; *the headline* splits it **half to your party, half to Neutral** (§14.2's rule for an action against a rival), and is **a point of difficulty harder**.

**Step 2 · the check.** Difficulty by the file's weight: **18 with three lines' worth, 16 with four, 14 with five or more** (+1 for *the headline*; +2 in the capital's and Clearwater's papers, the ladder's rule; the camera's `chancePct expose 10` applies). Three ways: ***Write it straight*** (Intelligence) · ***Talk the editor into it*** (Charisma and Intelligence) · ***Legwork: check every line twice*** (best). No run-in, no Heat (an exposé is legal). CTA **Take it to the editor · 20 Energy**.

**Step 3 · the result.** Success: **opinion −1.0 against the name's party in the name's city** (split by the flag), **XP 150, Party XP 40, Iron 100** (the paper pays), **+5 Political Capital**, the file spent, a **front-page line with your name** in every paper the next morning (§10.1), Legacy **+2** (*An exposé printed*, §7.1), the name **burned for 14 days** (no second exposé on it). Partial: **−0.5**, 75 / 20 / 50, no PC, the file spent, the line on page three (a headline without the front page). Failure: **nothing moves**, XP 30, the file **kept** (*spiked*; the editor wants more), no Legacy. Rested applies to XP and Iron. Issue tags apply to the swing when the name's city has a tagged Issue the file matches (the Issue's `feeds` include `expose` from this slice); the *Free Press Spring* twist's +50 % is the swing multiplier when it exists. In the capital the swing lands in the name's district (`candidates` carry one); for a deputy or a party figure, in the capital's Government Quarter.

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
| **An Ambition chapter** that names the patron (*Who Sold the Homes* 3, *The Names on the Stone* 7) | +5 | once |
| A Legacy perk (*Favour +10 %*) | every gain ×1.1, rounded up | — |

A devoted player gains about 5–7 a day; a player who does the Requests and nothing else about 3. **Tiers:** Acquaintance **10** · Associate **30** · Confidant **60** · Protégé **90**. The clock card on the Me tab reads *Edith Crane · Associate · 41 · Confidant at 60*.

### 5.3 Requests: a letter in the paper

A Request is **an order from a patron**: a line in the paper's Letters row (*From Edith Crane: two entries for my files from Garrison Hill · by Thursday*), a matcher in the orders' DSL (`match`, `counts`, `target`), progress on the patron's card, and **+6 Favour** at the boundary when it is done (the paper prints *Crane's thanks*). Arrives every second boundary after the first visit to the patron's place; two may be held; an unanswered one **expires** at its fourth boundary (*the letter is in the bin*; nothing else). **What counts (settled 16 Oct 2026, §24.9):** a **Success or a Partial** on a matching action or mission; **a Failure never** (the party orders' rule, GDD §15.4); a Request that asks for entries counts entries from any source (§21.1 #20). Each patron has **six** Requests, drawn in rotation (§16.5):

- **Crane:** *Two entries for my files from {district}* (2 Dossier entries on capital names) · *A speech on the Herald's Issue* (1 speech tagged with a capital Issue) · *Watch the boxes for me* (1 surveillance mission in Irongate) · *Three posters where the Hill can read them* (3 propaganda in Garrison Hill) · *A word at the Press Club* (1 intelligence tap at the Press Club) · *Something I can print* (1 exposé, Level 16+; else the next in rotation).
- **Marr:** *A watch on the cannery gate* (1 surveillance mission in Clearwater) · *A word at the tables* (the Casino's society call) · *Three conversations in the Rows* (3 canvasses in Clearwater) · *Who comes off the ferry* (2 intelligence taps at the Harbour) · *A speech the Courier will quote* (1 speech in Clearwater) · *Tea, Thursday* (the Pier Hotel's society call).

### 5.4 Perks by tier

| Tier | Favour | Crane | Marr |
|---|---|---|---|
| **Acquaintance** | 10 | **Gossip:** a free Dossier entry (political, a capital name) in every Monday's paper | **Gossip:** a free entry (asset, a Clearwater name) every Monday |
| **Associate** | 30 | **An introduction:** the mission *The morgue file* at Herald House (surveillance, 12 Energy, difficulty 20, Level 10; pays an entry on a name of the player's choosing among the capital's, and Iron 48, the tier-2 rate) · **informants** in Irongate (§4.4) | **An introduction:** the call *The late table* at the Casino (Charisma 25; pays Favour +3 and an asset entry) · informants in Clearwater |
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

## 8. *The Names on the Stone*, chapters 4–12 (GDD §17.1); the two due chapters of the others (re-strung for *Coming home*, 8 Oct 2026: titles, keepsakes and strings only; no number moved)

The chapter rules are §17.1's: three steps, one check with three ways (two written, one *Legwork* on the best stat), never fails, no run-in at home (chapters 6, 8, 10 and 12 are set in the capital and carry none either: an Ambition is the one thing the street never interrupts), Rested applies, no Standing, no orders, seven City Days between chapters plus the requirement, the keepsake on every outcome. **Difficulties follow the tier-3 band** (22–30) once the player is past Level 16; the reference player meets each at *Fair* to *Good* odds on their best stat. Scripts: §16.1. Keepsakes use `item.document-folder` unless named.

| Ch | Title | Letters row | Requirement (plus 7 days) | About when | Difficulty · Energy | Success / Partial / Failure (XP / FXP / Iron) | Keepsake |
|---|---|---|---|---|---|---|---|
| 4 | *The count* | *From the count's night* | a completed council term | day 20 | 18 · 20 | 400 / 100 / 250 · 200 / 50 / 125 · 60 / 0 / 0 | `keep.count-sheet` *The count sheet* |
| 5 | *Your seat* | *From the chamber's back row* | Rank 4 | day 27 | 18 · 20 | 400 / 100 / 250 · half · 60 / 0 / 0 | `keep.minute-book` *The minute book* |
| 6 | *The hall* | *From the Chair's ballot* | voted in a Chair election | day 35 | 20 · 20 | 450 / 120 / 300 · half · 70 / 0 / 0 | `keep.ballot-stub` *Your ballot stub* |
| 7 | *The cutting* | *From the Herald's morgue* | a Case File made (Level 16) | day 42 | 20 · 20 | 450 / 120 / 300 · half · 70 / 0 / 0 | `keep.cutting` *The cutting* |
| 8 | *The stone's rule* | *From the Governor's desk* | a term as Governor or Mayor completed, or three council terms | day 50 | 22 · 25 | 500 / 140 / 350 · half · 80 / 0 / 0 | `keep.rule-draft` *The rule, in draft* |
| 9 | *The list* | *From the party's list* | Rank 5 | day 56 | 22 · 25 | 500 / 140 / 350 · half · 80 / 0 / 0 | `keep.list-letter` *The letter from the list* |
| 10 | *The republic votes* | *From the ballot box* | voted in a national election | day 63 | 24 · 25 | 600 / 160 / 400 · half · 90 / 0 / 0 | `keep.polling-card` *Your polling card* |
| 11 | *Twenty-five marks* | *From the clerk's receipt* | on the party's list for Parliament | day 70 | 24 · 25 | 600 / 160 / 400 · half · 90 / 0 / 0 | `keep.list-receipt` *The list's receipt* |
| 12 | *The names read out* | *From the roll of the chamber* | a term as a deputy begun (the seat taken at a term's day 0) | day 84+ | 26 · 30 | 1,000 / 300 / 1,000 · 500 / 150 / 500 · 150 / 0 / 0 | `acc.his-rosette` *The memorial ribbon* (wearable, §3.9; a plain black ribbon, no device); **Ambition completed: Legacy 30** |

Chapter 12's requirement is the GDD's ending (a seat in Parliament, and the forty names read out there). For most players it lands in the third month (§23; was *season 2*); that is the design (§17.1: "runs for months"). The *Chapter n of 12* kicker is honest from this slice. The spine across the nine chapters is the council's memorial rule (*the town's own*): the motion that lost (5), the party's position (6), the proof the forty were on the town's rates (7), the rule replaced (8), and a memorials law for the republic (12). Flags renamed where they said *his* (`forty-total`, `sent-ahead` / `kept-for-floor`, `stone-rule`, `stone-first`, `closed-names` / `left-names`, `forty-read`); nothing is built on them yet.

**The two due chapters:** ***Who Sold the Homes* chapter 2, *The night caretaker*** (requirement Level 6, Dossier work; difficulty 14, 15 Energy; 300 / 80 / 150; keepsake `keep.foremans-name` *The caretaker's name*; it gives the player's first Dossier entry by hand: a political line on Brandauer, the block's night caretaker, a name added to `people.ts` with no party and the city Coalport, so the chapter and the Dossier meet) and ***The Ration Ledger* chapter 3, *The collector*** (Rank 3; difficulty 16, 15 Energy; 350 / 90 / 200; keepsake `keep.collectors-card` *The collector's card*; the Agility way carries Heat +6 as chapter 2 did). Scripts: §16.2. Chapter 3 of *Who Sold the Homes* and chapter 4 of *The Ration Ledger* are written with the next slice that touches them (§25: four chapters each by launch).

---

## 9. The Political Season (GDD §22, the skeleton) — **deferred out of slice 8 (the user, 16 Oct 2026; §23)**

Kept as the design for the slice that builds seasons. Nothing below is built in slice 8; the defaults #6 and #7 of §20 apply when it is.

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
| `dossier-stale` | entries go stale tomorrow | Stale Tomorrow: {n} in the Dossier | Stale entries count half toward a Case File and sell for half. Nothing is lost; it just gets old. |
| `patron-letter` (Letters) | a Request arrives | From {patron}: {request} | By {until}. Favour +6 when it's done. |
| `patron-thanks` | a Request done | {patron}'s Thanks | {request}, done. Favour {favour}; {tier} at {next}. |
| `patron-tier` | a tier reached | {name}, {tier} of {patron} | {perkLine} |
| `informant` (Letters) | an informant reports | From your informant | {line} · {subject} · {category}. Days of reports left: {daysLeft}. |
| `flat-bought` | the flat | {name} Takes a Flat in {city} | {restedLine}. Rent 150 a week, paid until {until}. The {paper}'s housing column approves. |
| `flat-due` | the last paid day | Rent Due on {street} | Your flat is paid until tonight. Pay a week on the Me tab, or let it wait: nothing is lost either way. |
| `flat-waiting` | the morning after it lapses | The Flat Waits | The rent ran out at midnight. A rented room until you pay a week; the flat is yours whenever you do. |
| `legacy-entry` | a Legacy entry | For the Record: {entry} | Legacy {total}. {toSpend} to spend on a lasting perk. |
| ~~`season-week`~~, ~~`season-front`~~ | deferred with the season (§23) | | |
| `bodyguard-last` · `bodyguard-gone` | §24.2 | | |
| `recognised` | the first run-in with recognition on rival ground | {name} Recognised in {city} | A {office} in a {coat} does not pass for a stranger. Plain clothes and a quiet night would. |

The paper prints two personal lines a day; which of these must reach the player, and which are safe to lose, is settled in §24.9 #4. Counts (`{n}`, `{daysLeft}`) are bare numerals from the server, so they sit after a colon, where *1* reads right.

### 10.2 The Letters row

Carries, in order: Ambition chapters (slice 2), **patron Requests** (one row each, with the countdown), **informants' reports**, **the patron's Monday gossip**. The tab's dot shows while a chapter or a Request is unanswered.

### 10.3 Your desk

New rows when they apply, after *Your record*: **Dossier** · *{n} entries · {m} go stale {when}* · **Patrons** · *Crane: Associate 41 · Marr: Acquaintance 12* · **Where you sleep** · *A flat in Coalport · paid until Thursday* / *A rented room* · **Ahead** · up to three clocks in Courier (*Chapter 5 from Tuesday · Crane: Confidant at 60 · Ruda's last day Thursday*; the Season Election's clock is deferred with the season, §23) · **Walking with you** · *Ruda, a doorman · until Thursday* (§24.2).

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
| ~~The season~~ | deferred (§23) | — |
| Hire or renew a bodyguard | 1 (2 over 1,000 Iron) | no; the week waits for nobody and takes nothing |
| A round, a plate, a dinner | 1 | no; the clock is a choice |

Nothing in slice 8 requires a tap at a set hour; every clock pays at a boundary and waits otherwise.

---

## 14. Economy

`docs/economy.md` §22. Slice 8 adds **no tier-1 or tier-2 rate** except the social type (the tier-2 rate) and the exposé's story rewards. It adds the game's first **big Iron sinks** (coats 200–20,000, the flat 2,500 + 150 a week, bribes 500–2,000, gifts 200) against the slice-5 income (about 1,000 Iron a day in week 1, 1,500–2,000 by week 3). **Verdict:** a reference player affords the party coat on day 6–7, the press pass and camera by day 10, the flat about day 15, the greatcoat about day 20 (a week's Iron), and the three-piece suit in month 2 (two weeks' Iron at Level 31): the §18.3 "200–50,000" band is now priced and the week-1 surplus Appendix C flagged in slice 5 has a home. The two +5 % Party XP items are inside the heavy player's envelope (+10 % for a member in the party's coat with the badge); Rank milestones move by at most a day. Legacy perks are small by design. Dossier sales (50–200) are *Other* income of §18.2: about 100–300 a day for a player who sells and never exposes.

---

## 15. Content-policy check

Every string was read against `content-policy-review.md` §7. The Vanguard's coat is a **steward's jacket** (its art needs the collar tabs removed: a civilian jacket); the party badge is a plain enamel disc with no device; no item carries a symbol, armband, flash or insignia; no weapon is catalogued. The patrons are a newspaper proprietor and a banker; Marr's "the bank's discretion" is a favour, not a crime, and the back room's bribe is named as what it is. The exposé's vocabulary is a newspaper's (*printed*, *page three*, *spiked*, *burned*); the swing is *against a party*, never *an attack*. *Recognised* is a word for fame. The season is *Champion*, never *victor*; no *front*, *war*, *enemy*, *troops*.

---

## 16. Content

### 16.1 *The Names on the Stone*, chapters 4–12 (scripts; every text ≤ 240 characters and four sentences; re-strung for *Coming home*, 8 Oct 2026: no number moved)

**Chapter 4 · *The count*** · kicker *Ambition · The Names on the Stone · Chapter 4 of 12* · art `scene.election-night`
*Step 1.* The count's night, and your name on the board. The forty's families are at the back of the hall, standing, because the branch's chairs ran out. You have the chalk, the list in your coat and the branch's runner at the door.
- A · *Chalk the forty under your total* (hint: *The hall will see what the seat is for.* flag `forty-total`) · B · *Chalk yours alone* (hint: *The board is tonight's.* flag `own-total`)
*Step 2 · The margin.* Two seats, three names, and the margin is a handful. The runner says the Rows haven't come in and the hall is drifting home. Somebody has to fetch them.
- *Send the runner with your name and the forty's* (Charisma and Intelligence) · *Work out which street is short and go there* (Intelligence) · *Legwork. Knock the Rows yourself, list in hand, until the hall is full again* (best)
*Step 3.* Success — *Full house* — The Rows come in wet and loud and the margin stops being a handful. The returning officer writes the figure twice. Under it, in chalk, forty names nobody rubs out. · Partial — *Enough* — Half the Rows, enough of the hall. It holds. The runner says the families fetched the other half themselves, and you say that's what the seat is for. · Failure — *The board stays* — The Rows stay in and the margin goes the other way. The board is wiped at eleven. You keep the chalk. The count sheet goes in the kitbag with the list.
- Knock-on: *Keepsake: The count sheet* · *Chapter 5, "Your seat": from {date}, at Rank 4*

**Chapter 5 · *Your seat*** · art `scene.union-hq` (the faction's HQ scene)
*Step 1.* The branch's minute book, and the back row of the chamber where the newest councillor sits. The last motion in it is the memorial's, moved in the autumn and lost four to three. The secretary says the book is yours to fill now.
- A · *Take the book* (hint: *The autumn's pages stay in it.* `took-book`) · B · *Leave the old pages and start a new one* (hint: *A clean book, your hand.* `new-book`)
*Step 2 · The motion that lost.* On the last page, the motion in draft: that the stone carry every name the town buried, lodged or paid. The branch meets at six; the Governor wants the hour for the licence. You have the draft and a room that lost once.
- *Move it from the floor in the families' words* (Charisma and Intelligence) · *Cost it, forty names at the mason's rate, then move it in yours* (Intelligence) · *Legwork. Find three members who voted for it in the autumn and bring them* (best)
*Step 3.* Success — *Carried* — The names go to the vote and carry on a show of hands, the Governor's licence pushed to seven. The secretary writes *carried* in your hand under the autumn's *lost*. · Partial — *Referred* — Referred to the next meeting, which is a kind of yes. The Governor is polite about it. The secretary writes *referred* and underlines nothing. · Failure — *Out of time* — The licence takes the hour and the names wait for another month. You write the date under the autumn's, and the word *again*.
- Knock-on: *Keepsake: The minute book* · *Chapter 6, "The hall": from {date}, after you vote for a Chair*

**Chapter 6 · *The hall*** · art the faction's capital house scene
*Step 1.* The party chose its Chair this week and you voted. Your stub is in your coat, and on its back, in your hand, the question the branch never got answered: where does the party stand on the stone? The new Chair's first meeting is Thursday.
- A · *Send the question to the Chair's clerk in advance* (hint: *The Chair will have an answer ready, or an excuse.* `sent-ahead`) · B · *Keep it for the floor* (hint: *A question nobody expects gets an honest answer.* `kept-for-floor`)
*Step 2 · The question from the floor.* The new Chair's first meeting at the capital house. There's a question from the floor about memorials and nobody asking it: every town has a stone, and every stone has a rule. You have the stub and the forty names.
- *Ask it, standing, with the names* (Charisma and Intelligence) · *Write it out and hand it to the Chair's clerk* (Intelligence) · *Legwork. Ask three branches first, so the floor is already with you* (best)
*Step 3.* Success — *Minuted* — The Chair answers it and the clerk minutes it under your name: the party will back a memorials rule, town by town. Afterwards the Chair asks how many names. You say forty, so far. · Partial — *Noted* — Noted, the Chair says, which means tomorrow. Two members stop you at the door to say their towns have a stone like that too. · Failure — *Next business* — The Chair moves to next business and the floor lets it. You keep the stub. The question is still written on it.
- Knock-on: *Keepsake: Your ballot stub* · *Chapter 7, "The cutting": from {date}, after your first Case File*

**Chapter 7 · *The cutting*** · art `scene.newsroom`
*Step 1.* The Herald's morgue has a cutting from the autumn: *Council Trims Memorial List; "Not the Town's Own"*. Edith Crane has it on her desk when you come in. "I wrote it from the council's hand-out. Do you want to know who wrote the hand-out?"
- A · *Yes* (hint: *The name, and a debt to Crane.* `asked-crane`) · B · *No. The names matter, not the man* (hint: *Some files stay shut.* `let-it-lie`)
*Step 2 · The second source.* The hand-out called the forty lodgers. The mill's wage book would show they lived in the Rows and paid the town's rates, which makes them the town's own by the council's own rule. Crane will print it, if you bring her a second source.
- *Find the clerk who kept the mill's wage book* (Intelligence) · *Ask Crane to run it on your name alone* (Charisma and Intelligence) · *Legwork. Walk the Rows for anyone who lodged one of the forty* (best)
*Step 3.* Success — *Printed* — Page five, a paragraph: forty men on the town's rates, their names, and the council's rule beside them. Crane signs it. Favour +5. The cutting goes in your coat next to the autumn's. · Partial — *A letter* — A letter to the editor, under your name, printed on Thursday, with the forty names in small type. Crane says it's what she can do with one source. Favour +5. · Failure — *Held* — The clerk is dead and the Rows don't read page five. Crane keeps the cutting on her desk, which she says is a kind of printing.
- Knock-on: *Keepsake: The cutting* · *Favour: Edith Crane +5* · *Chapter 8, "The stone's rule": from {date}, after a term as Governor, or three council terms*

**Chapter 8 · *The stone's rule*** · art `scene.ministry`
*Step 1.* The Governor's desk, or the back of three terms: either way the rule that goes first is yours to choose this week. The council's rule is one line, *the town's own*; the draft that replaces it is in the minute book, costed to the last mark.
- A · *Put the stone's rule first* (hint: *The names, before anything else.* `stone-rule`) · B · *Put the rule the town needs this week* (hint: *The stone can wait a term.* `towns-rule`)
*Step 2 · Four of seven.* Four votes of seven, and two councillors who think forty names on a stone is a vanity. One of them owes the branch; the other owes nobody.
- *Trade the licence hour for the two votes* (Charisma and Intelligence) · *Rewrite the costing so the names cost the town nothing* (Intelligence) · *Legwork. Walk both councillors to the Rows and show them the three doors* (best)
*Step 3.* Success — *Four of seven* — Carried, four to three, the second councillor's hand going up last and slowest. The rule is in force from Thursday: every name the town buried, lodged or paid. You write *carried* on the draft and date it. · Partial — *Amended* — Carried with a cut: the names go on, but on a second tablet, at the back. The families would take half. You take half. · Failure — *Three of seven* — Three. The licence goes first and the stone goes to the next paper. You've learned which councillor owes nobody, which is worth a term.
- Knock-on: *Keepsake: The rule, in draft* · *Chapter 9, "The list": from {date}, at Rank 5*

**Chapter 9 · *The list*** · art the faction's capital house scene
*Step 1.* Rank 5. A letter from the party's list committee: would you let your name go forward for Parliament. A town's rule is a town's rule; a law for every stone in the republic needs a seat in the chamber. The letter wants an answer by Friday.
- A · *Write yes* (hint: *The list, when names are in.* `wrote-yes`) · B · *Write the stone first, and then yes* (hint: *The town's names first. Then the republic's.* `stone-first`)
*Step 2 · The backer.* The list goes by backers, and you need one who isn't the branch. The old docker who backed your deposit is still on the quay and still argues.
- *Ask him, on the quay, in front of the gang* (Charisma and Intelligence) · *Write to him with the cutting and the forty names* (Intelligence) · *Legwork. Carry for his gang a morning and ask at the break* (best)
*Step 3.* Success — *Backed* — He backs you at the break with the gang watching, and says his boy's name had better be on the first tablet. The letter goes back with yes on it. · Partial — *Backed, with a condition* — He'll back you if the stone gets cut this year. You say it will. He says the council said that. · Failure — *The quay says no* — Not this term, he says; the stone first. You keep the letter and the reason, which is now two reasons in two hands.
- Knock-on: *Keepsake: The letter from the list* · *Chapter 10, "The republic votes": from {date}, after you vote for President*

**Chapter 10 · *The republic votes*** · art `scene.parliament`
*Step 1.* The republic voted and so did you. Your polling card has a number on it, and the register the number comes from still carries the forty: nobody struck them, and nobody voted for them either. The registrar's office is on the Forecourt.
- A · *Ask the registrar to close the forty's names properly* (hint: *The roll closes a name with a date and a reason.* `closed-names`) · B · *Leave them on the roll* (hint: *A name on the roll is a name on the roll.* `left-names`)
*Step 2 · The turnout.* Turnout in the Rows was half what it was in the Villas. The result is in; the next isn't. The branch wants a canvass that explains the republic to a street that voted for a council once.
- *Speak in the Rows on why the republic's vote is theirs* (Charisma and Intelligence) · *Draw the republic as a sum on the back of a poster* (Intelligence) · *Legwork. Walk the Rows with the sum until it's in every window* (best)
*Step 3.* Success — *The sum in the window* — The sum is in forty windows by dark and three people ask when the next one is. The branch counts it as a canvass; you count it as forty. · Partial — *Twenty windows* — Twenty windows and a long argument at the standpipe about whether the capital counts. It does. Half the street believes you. · Failure — *Rain* — Rain, and the posters run. The sum is in your pocket. The Rows will vote next term or they won't; you'll be there.
- Knock-on: *Keepsake: Your polling card* · *Chapter 11, "Twenty-five marks": from {date}, when your name is on the party's list*

**Chapter 11 · *Twenty-five marks*** · art the faction's capital house scene
*Step 1.* Twenty-five Political Capital and your name on the party's list for Parliament. The clerk's receipt asks what you stand for, in one line, for the list's printed sheet. The forty are a long line.
- A · *Write the forty names on the back of the receipt* (hint: *The list will know what the seat is for.* `told-list`) · B · *Write your own name, and nothing else* (hint: *It's your name on the receipt.* `own-name`)
*Step 2 · The place on the list.* The list goes by backers and you're third. Third is a seat only if the party takes three. One more backer puts you second.
- *Ask the Chair for the party's backing, in the Officers' room* (Charisma and Intelligence) · *Show the second-placed name the arithmetic and ask them to swap* (Intelligence) · *Legwork. Find one member in every branch who'll back a name from the Rows* (best)
*Step 3.* Success — *Second* — Second on the list by the close of names. The Chair says the Rows have never had a second. You say they had forty who never had a vote. · Partial — *Third, with a promise* — Third, and the Chair's word that the party will push for three seats. A word is a word. The receipt is stamped. · Failure — *Third* — Third. The arithmetic doesn't move and neither does the second name. The receipt is stamped anyway, and filed with the rest.
- Knock-on: *Keepsake: The list's receipt* · *Chapter 12, "The names read out": from {date}, when you take a seat in Parliament*

**Chapter 12 · *The names read out*** · art `scene.parliament`
*Step 1.* The roll of the chamber, and a clerk with a pen. "Name as it is to be entered." The unit's list is in your coat. The clerk is waiting.
- A · *Your name, and ask for the forty to be read after it* (hint: *Forty names on the record, once.* `forty-read`) · B · *Your name* (hint: *The forty are in the list. Yours is on the roll.* `one-name`)
*Step 2 · The maiden speech.* A deputy's first words in the chamber, and the memorials bill is on the order paper: every stone in the republic, every name a town buried, lodged or paid. Sixty seats, three parties and a gallery with the Herald in it.
- *Read the forty names, standing, to the chamber* (Charisma and Intelligence) · *Write them into a question on the memorials bill* (Intelligence) · *Legwork. Read them first in every branch, so the chamber has heard them before you stand* (best)
*Step 3.* Success — *On the record* — The chamber hears the forty and the record has them, every one, with the town's name beside each. The Herald prints the list. The clerk hands you the black ribbon the chamber wears for names read out, and you wear it. · Partial — *In the question* — The question is on the order paper with the forty names in it, which the clerk says is the record too. The ribbon is yours. · Failure — *Next speaker* — Your name is called and the chamber is loud and the list stays in your coat. The ribbon is yours anyway. You'll stand again; there's a term.
- Knock-on: *Keepsake: The memorial ribbon · wear it from the Me tab* · *The Names on the Stone: completed · Legacy +30*

### 16.2 The two due chapters

**_Who Sold the Homes_ · chapter 2 · *The night caretaker*** · requirement Level 6 · difficulty 14 · 15 Energy · 300 / 80 / 150 · keepsake `keep.foremans-name` (*The caretaker's name*) · art `scene.street` (the block from the road; was `scene.factory-gate`) · Letters row *From the register's margin*
*Step 1.* The order's signature is a man who is rising, but the register's margin named the one who held the keys, in pencil: *Brandauer, nights*. The block still has a night caretaker. The lobby board lists them, readable from the street.
- A · *Read the board and go in* (hint: *Twenty years of caretakers.* `read-board`) · B · *Ask the housing office's clerk who Brandauer is* (hint: *A name for a name.* `asked-clerk`)
*Step 2 · Nights.* Brandauer kept the block's night book in the autumn, who came with keys and who paid for them, and the night book is in the lodge, under the new one. The day porter is the kind who can be talked to, or walked past.
- *Talk the porter into an hour with the book* (Charisma and Intelligence) · *Read the rounds off the board and go in when the lodge is empty* (Agility; **Heat +6, whatever happens**) · *Legwork. Take the block's night shift for a week and read the book on the break* (best)
*Step 3.* Success — *The night book* — The autumn's page: your flat's keys signed over by Brandauer to a clerk from the capital, against a receipt with a senator's office on it. The page goes in your pocket. Brandauer still does nights, and does well. · Partial — *A page torn out* — The autumn's page is torn out, which is a kind of evidence. Brandauer's name is on the pages either side. The porter says the book's been like that since the winter. · Failure — *The new book* — The old book is gone to the housing office's archive in the capital. The board says Brandauer, nights, since the autumn. That's the name; the proof is in Irongate.
- Knock-on: *Keepsake: The caretaker's name* · *Dossier: an entry on Konrad Brandauer · political* · *Chapter 3, "The archive": from {date}, after your first Case File*

**_The Ration Ledger_ · chapter 3 · *The collector*** · requirement Rank 3 · difficulty 16 · 15 Energy · 350 / 90 / 200 · keepsake `keep.collectors-card` · art `scene.street` · Letters row *From under the door*
*Step 1.* A card under the door: a name, a Clearwater address, and *Friday* underlined twice. The ring's page says what your silence is worth to them: four hundred, or the page back. The branch says the collector drinks at the Anchor on Thursdays.
- A · *Meet him at the Anchor* (hint: *A public house is a public place.* `met-him`) · B · *Pay a hundred on account and send the rest of the week away* (hint: *A hundred buys a week.* `paid-hundred`; **−100 Iron**)
*Step 2 · Thursday.* He's a small man with a big ledger and the branch's own barman keeps his glass full. He wants four hundred, or the page, or a favour. The favour is a parcel to Clearwater, no questions.
- *Talk the price down to two hundred and a signature* (Charisma and Intelligence) · *Lift the ring's page with your family's name while he's at the bar* (Agility; **Heat +6, whatever happens**) · *Legwork. Find three people he's squeezed and bring them to the next table* (best)
*Step 3.* Success — *Two hundred and a signature* — Two hundred, a signature, and his card torn in half on the table. The barman pours one on the house. The parcel is not mentioned again. · Partial — *A month* — A month's grace and his card kept, which is a month. He says the ring is patient with people who pay. You say you'll pay. · Failure — *The parcel* — He keeps the ledger, the price and his glass. The parcel goes to Clearwater Friday, he says, with or without you. His card is on the table when he leaves.
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

**`counts` (settled 16 Oct 2026, §24.9):** every Request is a count-type order and counts **attempts, Success or Partial**, as GDD §15.4 counts them; **a Failure never counts** and never costs progress. A tier-1 action (canvass, propaganda, speech) never fails, so every attempt counts; a mission's (surveillance, social, intelligence, the exposé) counts on a Success or a Partial only, which is what *Something I can print* already says (§21.1 #26). `req.crane.files` counts Dossier entries landed, from any source (§21.1 #20). Nothing in the DSL needs a per-Request `counts`; the one rule applies to the twelve.

### 16.6 The exposé's texts (step 3; per angle)

- **Plainly** · Success — *Page one, every line* (was *Page three, every line*; §25 #4) — Every line checked, every line printed, no adjectives. The {party}'s office rings the editor at nine. The editor says it's all true, which it is. · Partial — *Three of five lines* — Three lines survive the lawyer and run on page three. The {party} calls it gossip. Two of the five are still true. · Failure — *Spiked* — The editor wants a second source on the second line and won't run the rest without it. The file goes back in your coat.
- **The headline** · Success — *Page one* — The front page, your name under the headline, {subject}'s face from the morgue. By noon the {party}'s office has issued a denial that repeats the story. · Partial — *Page three, with a headline* — A headline on page three and your name under it. The editor says page one wanted one more line. The {party} says nothing at all. · Failure — *Spiked* — The editor reads it twice and says the front page is for things that stand up. The file goes back in your coat; so does the headline.

### 16.7 Help notes (the review-1 pattern, two lines)

| Key | Kicker | Note |
|---|---|---|
| `charisma` | Charisma | What you wear. Your coat, what's on you and a flat in town add up to it. It opens society doors and gets you recognised on rival ground. |
| `wardrobe` | The Wardrobe | Four things you wear: Coat, On you, Papers, Tools. Two outfits, Town and Plain clothes, one tap to change. Shops are cards on the places that sell things. (*slots* is a refused word, §12.4 of the tech design; re-worded 16 Oct 2026) |
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
| §17.1 | Chapters 4–12 of *The Names on the Stone* (was *Finish His Work*); *The night caretaker* (was *The night foreman*); *The collector* |
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

| §0, §6.4, §10.4, §11.3, §14.12, §17.4, §18.3, §21.1 (settled, 4 Oct 2026) | *Wanted* bars society calls; the *On file* +5 dropped; the press places and stations named; the exposé's refusals; forged papers as a check at 14; the flat's row corrected and the rent's eight-week cap; *Lodgings in {city}*; the party store's press pass and camera; the stall's buy-back rule |
| §0, §4.1, §6.7, §12, §14.12, §17.3, §18.3, §19.3, §20.1, §22, §25, Appendix C (16 Oct 2026; §23, §24) | Slice 8 approved; **seasons deferred** (§22's status, §25's row, §17.3's two rows *with seasons*, #5, #80, #81 deferred, A9 with them); **bodyguards** (three tiers at the party store, 400 / 1,200 / 3,000 a week, the *steps in* row with his power in the Fight formula, never against the police, no auto-renew, four weeks ahead at most; §20.1's per-tier terms replaced); **the bar** (a round 30, a plate 100, the hotel's dinner 400 at Charisma 10; *well fed* +10 % XP for 4 h / +10 % XP and Iron for 6 h, Health up to max; *in good spirits* +10 % XP on three missions, nine in hand at most; the barman, the stimulant and recruitment cut); #110 and #111 closed; new #113 (not against the police), #114 (the buffs' levers) |

Companion edit: `docs/economy.md` §22 (and §22.6's note on the rent cap; §22.11 for bodyguards and the bar, 16 Oct 2026).

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
| 8 | `item.rosette` | The memorial ribbon: a plain black ribbon folded once, no device, badge or colour of any party (review 5, 8 Oct 2026; was a deputy's cream-and-ink rosette) | item |
| 9 | `scene.flat` | A rented flat at night: one room with a bed, a wardrobe with three coats on the door, a window over tram wires, a gas ring; a paper on the chair | scene 2688 × 1520 |
| 10 | `scene.casino` | The Casino's long bar after midnight: the domed room, the tables beyond, a cashier's window, the Front's money in evening dress | scene |
| 11 | `scene.lido` | The Lido on a Sunday: the pavilion, deckchairs to the water, the bandstand with a brass band, the lake behind | scene |
| 12 | `scene.front-page` (optional) | A newspaper front page coming off the press, the headline band blank (text is never drawn), a pressman's hands; the exposé's result art, else `newsroom.png` | scene |

**Done 4 Oct 2026:** all twelve generated in the noir style and saved: `mvp/items/{stewards-jacket,convenors-coat,correspondents-suit,good-hat,press-pass,fountain-pen,cigarette-case,rosette}.jpg` (512 × 512, like the existing items) and `mvp/scenes/{flat,casino,lido,front-page}.png` (2688 × 1520). Checked: the steward's jacket has a plain collar (no tabs), the rosette is cream and ink with a blank centre, the press pass says only PRESS, the front page's headline band is blank; no symbol anywhere.

Twelve pieces (eleven with the optional). The crest rule holds: nothing on any coat, cap, hat, badge, rosette or wall.

**The patrons' alt texts (final, 16 Oct 2026; checked against `mvp/portraits/{crane,marr}.png`; ≤ 160 characters):**

- `portrait.crane` · *Edith Crane, owner of the Herald: a silver-haired woman in a dark suit and a wine-red blouse, pearl earrings and a brooch, a cigarette holder raised.* (149)
- `portrait.marr` · *Julius Marr, banker: slicked dark hair, a thin moustache and a half-smile, a pinstriped double-breasted suit, a red tie and pocket square, a watch chain.* (153)

---

## 20. Points for the user (each with the default this document takes) — **approved as written, 16 Oct 2026** (#6 and #7 apply when seasons are built; §23)

1. **No weapon slot, no weapons as items** (§3.1, GDD §21.1, §20.3). Default: **none**: a run-in is Strength and a coat with some weight to it; the revolver and truncheon pictures are left uncatalogued. The alternative keeps §20.3's weapon tiers as items, which makes a political game look armed.
2. **The two MVP patrons are Edith Crane and Julius Marr** (§5.1), both neutral, both in battlegrounds. Default: **Crane and Marr**, so every faction courts them on the same terms and the patron pages stand on Herald House and the Pier Hotel. The alternative gives each faction its home patron (Draganov, Reinholt, Voss), which is three patrons and one each.
3. **Outfits are three fixed names, Town, Plain clothes and Evening** (§3.3), not renamable, the third from a flat. Default: **fixed**, so every player and every help note says the same three words. The alternative is Fallen London's renaming.
4. **The exposé's Failure keeps the Case File** (§4.5). Default: **kept** (spiked, not spent), because a file is a week's work and a Failure that destroyed it would be the one thing in the slice that takes an asset by the dice. The alternative spends it on every outcome.
5. **The flat is the only home with a price in the MVP** (§6): 2,500 and 150 a week, the rent waits, one flat per player. Default: **the flat alone**; townhouse and villa after the MVP as the plan says.
6. **The season score's election bonus is 100, not the GDD's 10** (§9.2). Default: **100**, so a national election is worth about a month of a four-point lead. The alternative keeps 10, at which the elections cannot change the Champion.
7. **No season track and no Season Twist in season 1** (§9.3). Default: **neither**; the skeleton is the election, the Champion, the awards and the rollover. The alternative builds the thirty-tier free track now.
8. **Blackmail and Denounce are deferred** (§4.3); the Dossier's uses are the exposé, the sale and the informant. Default: **deferred** (they need a favour economy with players and a removal rule that reads as fair). The alternative builds Denounce for controlled cities now.

---

## 21. Settled for the build (4 Oct 2026; answers to `docs/tech/slice-8.md` §22.1 and §23)

The architect's default stands wherever the answer below says **default**; the rest are the deviations, with the reason. Every number that moved is also in the GDD (§17's table gains the rows marked *settled*).

### 21.1 The fifty questions

**The Wardrobe and shops**

1. **Who buys what: default.** The clothes stall buys anything sellable at a tenth of the *catalogue* price (`buys: 'any'`); every other shop buys only what it sells (`'own'`). §3.5 now says "the catalogue price", which is what screens §3's *Sells for 80 Iron at a market* assumed.
2. **Selling an item saved in an outfit: default** (allowed; it leaves the outfit; a coat falls back to the faction's work clothes). The strings: the confirm sheet's second line, Courier, ***It's in your {outfit} outfit; selling takes it out.*** (two outfits: *It's in your Town and Evening outfits; selling takes it out of both.*); the `sold` modal's knock-on line ***Taken out of your {outfit} outfit*** (*Taken out of your Town and Evening outfits*). A worn item is never sellable (*Take it off first*, unchanged).
3. **Rounding: default** (whole Iron, half up: 800 → 920, 150 → 173).
4. **Prepaying rent: deviation.** **At most eight weeks ahead** (`paidThroughDay ≤ today + 55`): the buttons dim with the Courier line *Paid eight weeks ahead*. Reason: the rent waits anyway, so prepaying is never urgent, and *paid until next spring* on the desk reads as a bug. Eight weeks covers a season's absence with a week to spare.
5. **Buying the flat: default** (standing in the residence city; the rent from anywhere).
6. **A flat elsewhere: default** (every bonus needs its city to be the residence; the +2 also needs standing there).
7. **The *Evening* set at purchase: default** (what is worn at the purchase).
8. **Forged papers at the checkpoint: default**, written out: with forged papers in the Papers slot, *Show your papers* on *Papers, please* becomes **a Charisma check at the card's difficulty 14 with the papers' +10** in place of the Cool-and-Clean gate; its Partial is the party card's (*They write your name down*: +10 Heat, *Watched*; the papers kept); the `checkpoint` bonus applies to *Talk your way through* as well; the press pass passes as the party card does (the gate, unchecked). The design's "a Failure with them in hand" (§3.6) is read as the card's Partial, since cards never fail.

**Society calls**

9. **Party XP: none** (default; economy §22.3 stands). A call pays Favour where a mission pays Party XP; the ticket's tags say *no Party XP · +2 Favour with {patron}*.
10. **Level 10** for every call (default).
11. **The record and Heat at society venues: pinned.** ***Wanted* bars every society call** (the ticket dimmed: *Not while you're Wanted · the doorman has the list*), which is GDD §6.4's line built; **the *On file* "+5 Charisma at some venues" is dropped** from §11.3 (the record already taxes the Wardrobe through the shop surcharge, and a second rule on the same door is bookkeeping). Not built: anything else.
12. **The morgue file: default** (a name picker on the briefing from the capital's names; Iron 48, the tier-2 rate on 12 Energy; no existing surveillance mission names a figure: each lands on a random name of its target party). Design §5.4's "Iron 60" was the 15-Energy figure by mistake.
13. **The late table: default** (Favour +3 on a Success, +1 on a Partial; the asset entry on a Success).

**Recognition**

14. **The night doubles the Charisma and office parts together; the Legacy part is not doubled** (default; the worked figure 30 = (5 + 10) × 2). §3.6's sentence is read so.
15. **Offices held now** (default).

**The Dossier**

16. **The third that is not a rival's is the actor's own party's; Brandauer and any `drawn: false` name are never drawn** (default).
17. **Own party and no party: refused** (default). The strings: the exposé ticket's state and its Courier reason, and the file card's text button replaced by the same words: ***Not against your own party*** · *The {paper} prints nothing against the {party}'s own. Sell the file at a station, or turn it.*; ***Nobody to print it against*** · *{name} belongs to no party. Sell the file at a station, or turn it.* Such files sell and turn as any other.
18. **The burn is per player** (default): your own exposé or Headline Story; another player's file on the name is untouched. The alternative (a republic-wide scoop) would let one player lock a name for everyone, which at low population is one player locking the town.
19. **A burned name still gathers entries** (default); *nothing new for {n} days* means no exposé.
20. **An informant reports a name of its town** (§4.4; default). §4.2's row is corrected.
21. **Seven reports** (days +2 … +14; default).
22. **Binding takes every held entry on the name, fresh and stale** (default): waiting for five lines' worth buys the easier check, which is the clock's reward.
23. **Entries from any source count toward a Request, the patron's own gossip included** (default).

**The exposé**

24. **No run-in anywhere** (default): an exposé is legal and the paper is indoors; the press place's rival-ground rows apply to its own tickets; the 2-point cap applies when the name's town is its party's home.
25. **The swing lands in the name's town (its district in the capital), wherever the paper is** (default).
26. **Printed: Legacy +2 on a Success only; *Something I can print* on a Success or a Partial; a Failure uses the day's one exposé** (default).
27. **The plain angle credits nothing to the actor's ledger** (default, ADR 0034): all of the swing goes to Neutral, so there is nothing of the actor's party to attribute; the headline angle is the hero's road. Said on the step-1 choice's hint from now: *The facts, plainly* · *Every line checked. It runs on page three. Nothing to your party's name.*
28. **The front page: the author's stored front page, and one live line in every reader's paper the next morning** (default).
29. **Issues that feed exposés: two**, `issue.casino-licence` (Clearwater) and `issue.cells-full` (Irongate, Garrison Hill): an exposé on a name of the Issue's city (and district, where the Issue has one) is tagged while the Issue runs (+50 % on the swing, §14.6). The rest of the deck feeds none until a later slice.

**Chapters**

30. **Chapter 7's choice A lands no entry** (default); its hint is rewritten so it promises none: *The truth, and a debt to Crane.* (§16.1).
31. **Chapter 7's Favour +5 on every outcome** (default; the knock-on lists it on all three).
32. **Keepsake texts behind *Read*: written** (§21.3), for every keepsake from slice 2 on; `Item.read` is filled in the same content change, and *Read* shows on each.

**Places and art**

33. **The Clarion and the Sentinel are not places: default, with one addition.** The exposé and the press shop are at **Herald House and Gazette House**; Dossier sales at **Central Station, the Goods Yard and Clearwater Station**; no place is added. **The addition: the party store also sells the press pass and the camera** (both Level 6, both reachable before the Level-10 train for every faction; the branch has a tame reporter), so the Level gates read true in every home city. Design §3.5 and §4.5 are corrected.
34. **The party badge: redrawn by the user** as a neutral cream-and-ink enamel disc (`mvp/items/lapel-badge.jpg`, the same file name, centred: no crop). Alt text: ***A plain round enamel lapel badge, cream with a dark ink rim, on a pin.*** The art build's review list records "no party colour, no device".

**Patrons**

35. **Request timing: default** (arrivals at the boundaries into first visit + 2, + 4 …; skipped while two are open; open four days, *by* the third day after arrival; paid at the boundary after it is done; expired at the fourth).
36. **"Once a week": seven City Days from the last call** (default).
37. **The first visit is the first time the patron's card is shown at the place, from Level 10** (default).
38. **The Protégé's +1 point of score goes to the party once, when at least one of its standing candidates in that count is a Protégé** (default), never one per Protégé.
39. **Favour earned before the first visit counts** (default).
40. ***Something I can print* below Level 16 is skipped for the next in rotation** (default).

**Legacy and the season**

41. **Migration 010 backfills** past terms and Hero and Issue entries with their days (default).
42. **"In the faction for 14 days" is the character's age at the confirmation** until switching exists (default).
43. **The Champion's ties: more national elections won in the season, then the higher control share at the last boundary, then the seeded draw** (default).
44. ***A name they know* in home counts only** (default).
45. **Season 1 is the season in progress when the nation bootstraps, partial, played out with its finale** (default; §22.2's point for the user stands).
46. **Laws and council rules in force on season day 83 end; one that the old season's last vote brings into force at day 0 stands** (default).
47. **"A national election won" is the party of the President it seats** (default).
48. **The halfway move: all four shares halfway to the baseline, then the home floor; ledger rows of kind `season`; morale and Groundswell recomputed at the next boundary** (default).

**Other**

49. **The call is a type of its own for the place's rules** (`seenAs: 'social'`; no close race, no council rule keyed by type; default).
50. **Item and perk Party XP apply to tier-1 actions and missions, society calls included; not to chapters, event roles or the exposé's fixed rewards** (default).

### 21.2 The twenty-one notes

1. Q33. 2. Q1; §3.5 corrected. 3. Q20; §4.2 corrected. 4. The citation corrected (§10.1). 5. The plan's row rewritten as the architect lists it (`docs/IMPLEMENTATION_PLAN.md` §5). 6. **The Mountain Inn keeps its `bar` kind and carries both the tailor and the back room** (an inn has rooms upstairs and a taproom below); §3.5's table says so; the loader's allowance (a tailor on a `bar`) is the rule. 7. Armour derived from the tier: accepted. 8. The settlement, not a day job: accepted. 9. `legacyEntries`: accepted. 10. Noted; the GDD's sentence stands for the next patron batch. 11. **GDD §17.4's table row corrected** to *+2 Charisma in its city*. 12. Q11. 13. The loader's relaxed floor for `social`: accepted. 14. Q14. 15. Keyed by the mission's own type: accepted (the press pass counts once on a watch). 16. Brandauer as an `extraNames` row: accepted. 17. Nineteen and ten; §3.9's sentence corrected. 18. **The two rooms read apart from this slice: slice 4's paid room in the capital and Clearwater is renamed *lodgings*** in copy (`copy.room` → *Lodgings in {city}*; *Take lodgings · 100 Iron*; *Renew · 100 Iron · 7 more nights*; the help note's first words *A week's lodgings…*), made in slice 8's copy change, not now (the slice-5 developer is in the tree); *a rented room* is only ever the free home. GDD §14.11's and §18.3's rows gain the word in brackets. 19. Q34. 20. **The four voices for the personal lines: §21.4.** 21. Q9.

### 21.3 The keepsakes' *Read* texts (`Item.read`, ≤ 240 characters, four sentences at most; outcome-neutral, since a keepsake is granted on every outcome)

| Id | Text |
|---|---|
| `keep.ward-book` | Forty names in the quartermaster's hand, a home street against each. Three of the streets are yours now. The council's notice about the stone is folded inside. |
| `keep.prison-letter` | The requisition order for the flat: the address, a date in the autumn, the word vacant typed where a family's name should be, and a signature you can read. Held to a lamp, it shows what the typewriter struck out. |
| `keep.marker` | A page from a ration book in your family's name, drawn every month for a year after they were gone. A Clearwater stamp in the corner, small. It has been folded and unfolded a great many times. |
| `keep.election-bill` | Your election bill, off the branch's press: your name in capitals on brown paper and the forty under it. Somebody wrote *lodgers* across it and somebody else rubbed it out. |
| `keep.ledger-page` | The one page the ring didn't tear out: the names they drew rations in, yours among them, and what each page fetched, in a neater hand than the stamp. The last entry is the month the office held your post. |
| `keep.deposit-receipt` | The branch's printed list, and your line on it in the secretary's hand: ten Political Capital, spent and gone. The signature beside it is the same as on the council's notice about the stone. (re-strung 16 Oct 2026 for the voting rework: no deposit) |
| `keep.count-sheet` | The returning officer's sheet from the night you were counted. Two figures: yours, and under it, in chalk, forty. One of them was enough. |
| `keep.minute-book` | The branch's minute book. The autumn's pages stop at a motion for the memorial, lost four to three. The next entry is in your hand. |
| `keep.ballot-stub` | Your ballot stub from the election for Chair. On the back, in pencil, a question about the stone. It has been asked now. |
| `keep.cutting` | *Council Trims Memorial List; "Not the Town's Own".* The autumn, the Herald, by E. Crane. A second cutting, with forty names in it, is pinned to it. |
| `keep.rule-draft` | A memorial rule for the town, costed to the last mark: every name the town buried, lodged or paid. Under it, in your hand, a date and a word. |
| `keep.list-letter` | The list committee's letter, inviting your name for Parliament. On the back, in your hand, one word; under it, in a docker's, a condition about the stone. |
| `keep.polling-card` | Your polling card for the republic's vote, used. The register it came from still carried forty names that never voted. You have carried it to the Forecourt since. |
| `keep.list-receipt` | The clerk's receipt for twenty-five Political Capital and a name on the party's list. On the back, one line for the list's printed sheet, in your hand. |
| `acc.his-rosette` | The black ribbon the chamber wears when names are read out. Plain, folded once, nothing on it. You wore it the day the forty went on the record. |
| `keep.foremans-name` | *Brandauer, nights.* Pencil, another hand, in the margin of the housing register. The board in the block's lobby says the same, since the autumn. The proof is in the capital. |
| `keep.collectors-card` | A small man's card: a Clearwater address, *Friday* underlined twice. He drinks at the Anchor on Thursdays and keeps a big ledger. |
| `acc.cranes-pen` | Edith Crane's own pen, given at Herald House. The nib is worn to her hand. "Write what you can prove," she said, "and sign it." |
| `acc.marrs-case` | Julius Marr's cigarette case, engine-turned, the band inside it. "The bank's regards," he said. "It opens doors. So does money, but this is quieter." |

`doc.party-card` has no *Read* (it is a line on the Me tab, slice 2).

### 21.4 The personal lines in the four other voices (`docs/tech/slice-8.md` §23 #20; the slice-7 pattern)

**Factual lines print the Herald's deck in every paper:** `expose-front`, `expose-p3`, `expose-spiked`, `case-file`, `dossier-stale`, `patron-letter`, `patron-thanks`, `patron-tier`, `informant`, `flat-due`, `legacy-entry`, `season-week`, `season-front`. **Four carry a voice**; their decks (≤ 200 with the longest tokens):

| Id | Clarion | Sentinel | Gazette | Courier |
|---|---|---|---|---|
| `wardrobe-first` | {item}, {charisma} Charisma, seen on {street} yesterday. Holm: "Mind it on the picket line." | {item}, {charisma} Charisma, seen on {street} yesterday. The committee approves of a tidy coat. | {item}, {charisma} Charisma, seen on {street} yesterday. Mr Grey asks who the tailor is. | {item}, {charisma} Charisma, seen on {street} yesterday. The Front has noticed; the Rows have not. |
| `flat-bought` | {restedLine}. Rent 150 a week, paid until {until}. The branch knows the landlady. | {restedLine}. Rent 150 a week, paid until {until}. The committee notes the address. | {restedLine}. Rent 150 a week, paid until {until}. The Rooms will call, with a book. | {restedLine}. Rent 150 a week, paid until {until}. The lake air, the Courier adds, is included. |
| `flat-waiting` | The rent ran out at midnight. A rented room until you pay a week; the flat is yours whenever you do. Holm says the landlady is patient. | The rent ran out at midnight. A rented room until you pay a week; the flat waits. The committee expects the matter settled. | The rent ran out at midnight. A rented room until you pay a week; the flat is yours whenever you do. No arrears, the Gazette confirms. | The rent ran out at midnight. A rented room until you pay a week; the flat waits, lake view and all. |
| `recognised` | A {office} in a {coat} does not pass for a stranger in {city}. Holm: "Wear the mill coat next time." | A {office} in a {coat} does not pass for a stranger in {city}. Plain clothes, the committee notes, were available. | A {office} in a {coat} does not pass for a stranger in {city}. Mr Grey suggests the worn overcoat, and a quiet night. | A {office} in a {coat} does not pass for a stranger in {city}. The lake dresses down for a reason. |

`{office}` for a player with none reads *visitor*; `{coat}` is the coat's name in lower case (*a dress greatcoat*).

### 21.5 For QA

The seven slice-5 risk headline decks changed on 4 Oct 2026 (`hl.cells`, `hl.a.cells`, `hl.a.name-taken` shortened; the four `*.record-up` decks on `{marksLine}`) are in `packages/content/src/data/headlines.ts` and `slice-5-risk.md` §14 together; the fills `{marksLine}` (*One mark* / *{n} marks*), `{how}`'s fallback (*no reason was given.*), `{missionTitle}`'s fallback (*a word with the police*) and `{recordLevel}`'s *On File* are the slice-5 developer's in `copy.ts`.

---

## 22. Review 4 addendum (6 Oct 2026)

- **§6, a home:** the paid room (slice 4) is now a ***Lodgings*** card at a place (Tram Junction; the Rows), said as *a bed* (GDD §14.11). *Where you sleep* keeps the free room (+10) and the flat; the Rested cap takes **the larger of the flat and lodgings**, as §6 already says. The residence card carries **no paid room**: its second line is *Where you sleep: a rented room · +10 Rested a night* and the flat's button only (`slice-8-screens.md` §9.1).
- **§3.6, recognition:** unchanged; the journey screen it names is the nation map in journey mode (GDD §14.10), where *Change into plain clothes* is a chip on the plate.
- **§10, the paper:** the patron's Request, the informant's report and the clocks follow the player (the paper's own parts, GDD §3.3); the city's lines are the edition's.
- **The reference recruit** for every price check is STR 8 / INT 12 / AGI 5 / CHA 5 (`docs/economy.md` §24.1); §22.2's Wardrobe prices against the days do not move (they are Iron against income).

---

## 23. Approved; the season deferred (the user, 16 Oct 2026)

**§20's eight defaults are approved as written** (no number moves). **Political Seasons are deferred out of slice 8**: the 84-day season, the season's score, the Season Election, the Champion, the four awards, the Hall of Fame and the rollover wait for a later slice, and the rollover question (what rule runs after it, the wiki's drift row A9) waits with them. Defaults #6 (+100 a season score per election) and #7 (no track, no twist) stand and apply when seasons are built. §9 above is kept as the design for that slice and is not built now.

**What in this slice leaned on the season, and what happens to it:**

| Leaned on the season | Now |
|---|---|
| Legacy's two rows *Champion faction* (+5) and *a season award* (+5) (§7.1) | **Wait.** The rows stay in the GDD table marked *with seasons*; nothing credits them. The reference player's day-30 Legacy (15) is unchanged; the day-84 figure in `docs/economy.md` §22.7 drops from about 50 to about 45 |
| §4.6 *The spymaster* (Case Files used, counted per season) | **Waits.** Nothing is counted; the ledger keeps what it keeps |
| The paper's `season-week` and `season-front` lines (§10.1), *No twist this season*, the desk's *Ahead* clock *the Season Election in 12 days* (§10.3) | **Removed.** *Ahead* shows up to three of: the next chapter's date, a patron's next tier, the flat's rent, a bodyguard's last day (§24) |
| The republic sheet's season card, the Hall of Fame, the Me tab's and profile's *Champion of Season n* titles (`slice-8-screens.md` §10, §11) | **Wait** with the season |
| The help note `season` and the words *the season*, *Champion*, *the season's score*, *the new season* (§1.1) | **Wait**; the QA vocabulary test (§18 #13) no longer needs *season* or *Champion* |
| *Every law and council rule in force ends* at the rollover (§9.3; settled #45–#48) | **Nothing ends a law or a rule at a season.** Laws and rules run as slice 7 built them (a law until repealed or replaced; a city's rule for its five days, and a city always has a rule). Drift row A9 is deferred with the season |
| §13's row *The season: nothing to do* and §12.4's *the Season Election at day 83* | A reference player's month 2 is the Confidant's favour, the greatcoat, recognition on rival ground and a bodyguard (§24) |
| The *Free Press Spring* multiplier on the exposé's swing (§4.5) | A constant 1 until a twist exists; the architect may drop the wiring |
| Chapter 12's note *for most players it lands in season 2* (§8) | Read as *in the third month*; no number moves |

The slice's question (goals for the next month) is answered by the clocks that remain: a Case File, a patron's next tier, a Request's Thursday, the flat's rent, the next chapter's date, and from §24 a bodyguard's week.

---

## 24. Bodyguards and the bar (added scope, designed 16 Oct 2026)

The user put bodyguards and the bar services with their buffs into the slice on 14 Oct 2026 (GDD §0). This section is their design; the numbers are in GDD §6.7, §12, §19.3, §20.1 and §18.3, and the sums in `docs/economy.md` §22.11. Both obey the slice's rules (the opening of this document): one tap, one modal with visible numbers, nothing taken by absence, campaign vocabulary, the check formula untouched, combat one choice, no symbol, plain words.

### 24.1 Plain words (GDD §1.5)

| System term | The player reads |
|---|---|
| Bodyguard · contract · tier I–III | **someone to walk with you** (the card's kicker) · **a week, paid** · **a doorman / a steward / a minder** (the tier said as what he is; no numeral) |
| Buff · Well-Fed (Bar) · Well-Fed (Fine) · In Good Spirits | (never *buff*) · **well fed** · **well fed, properly** (dinner) · **in good spirits** |
| Bar services · Stimulant · Black Market | **the bar** (the card's kicker) · (not built) · **the back room** (as before) |

Never *guard*, *escort*, *muscle*, *enforcer* (the opponent's word), *protection* or *hired hand* in a player string: a bodyguard is a minder or a steward, a civilian who walks with you, never a soldier.

### 24.2 Bodyguards (GDD §12, §20.1)

**What he is.** A named man on a **prepaid seven-day contract**, one at a time, who **steps in first** at a run-in. The card is on **the party store** (every HQ and capital house, members only; the slice's shop card, §3.5), under the kicker *SOMEONE TO WALK WITH YOU*: three rows, one per tier, each with a portrait, a name drawn at hire from the tier's three, the price and the odds line. One tap hires for a week (a confirm sheet over 1,000 Iron, as any purchase); the modal `hired`.

| Tier | Said as | Needs | A week | His strength (power) | Against a street enforcer on a mission, at home / on rival ground (§24.8 #7) | Names (drawn at hire) | Portrait |
|---|---|---|---|---|---|---|---|
| I | **a doorman** | Level 6, a member | **400** | 28 | 62 % / 50 % | Ruda · Big Anton · Ferko | `portrait.doorman` (new, §24.6) |
| II | **a steward** | Rank 3 | **1,200** | 36 | 86 % / 74 % | Weiss · Dušek · Holub | `portrait.steward` (new) |
| III | **a minder** | Level 16 | **3,000** | 44 | 95 % / 95 % | Mr Halm · Mr Varga · Mr Olbrich | `portrait.minder` (new) |

**Why these prices** (`docs/economy.md` §22.11): a doorman costs about what a week of paying off enforcers costs the day-10 illegal player (ten run-ins at 60), so *pay as you go* or *a doorman for the week* is a real choice; a steward is a day's Iron in week 2–3 and pays for itself for the rival-ground specialist; a minder is two days' Iron around day 20, a month-1 goal, bought for safety rather than Iron. The GDD's hire fee is dropped (one price, the week); the Black Market's +25 % is dropped (nothing to be relative to); Vanguard House's cheaper bodyguards wait for the gym (§16.1, later) as a discount on the same card.

**In a run-in: a row, not a modifier.** The run-in sheet (slice 5: *Fight · Run · Talk your way out · Pay them off · Leave it to luck*) gains, while a contract runs, a fifth row at the top: ***{Name} steps in · {odds word} · his strength***. Its odds are **§20.1's Fight formula with his power in place of yours** (50 % + 3 % × (his power − theirs), 5–95; the opponent scaled as for you: ×1.1 on a mission, +4 on rival ground; the branch inspector's −10 applies). **If it works**, the run-in ends as *Talk your way out* does: the act's result is paid as rolled, you lose no Health, **+10 XP** (you got away), the caught check runs as normal. **If it fails**, he is down and **the fight goes ahead at your own Fight odds −10**, as after a failed Talk. **Never against the police:** the row is dimmed with *Not against the police* (a doorman does not argue with a constable; Heat keeps its bite, and so does the bribe). *Leave it to luck* counts his row among the free ones and takes it when its odds are best. The GDD's +5 power and +5 % Run per tier, the damage reduction, the hospital-avoidance chance and the intercepted ambush are **replaced by the row**: one visible number, no hidden dice.

**His two lines** (content, by tier; ≤ 200 characters): the modal's body when he steps in, and the reason line when he is pushed aside.

| Tier | It works | It fails |
|---|---|---|
| doorman | *{Name} puts himself in the way and says nothing. They look at the width of him and go.* | *{Name} goes down in the first rush. It's you now.* |
| steward | *{Name} steps between you with his notebook open and asks for their names. Nobody gives one. They go.* | *{Name} is shouldered aside and the notebook goes in the gutter. It's you now.* |
| minder | *{Name} says a name, quietly, to the biggest of them. The biggest of them remembers an appointment.* | *{Name}'s name means nothing to these. He's down, and it's you.* |

**The contract.** `bodyguard { tier, name, paidThroughDay }`, read lazily like the flat's rent: the row exists while `paidThroughDay ≥ today`. **Renewing** is one tap on the Me tab's row or the card (*Another week · 400* / *Four weeks · 1,600*), **at most four weeks ahead** (the rent's rule, shorter: 12,000 Iron parked for a minder is enough). **One at a time:** while a contract runs the other two rows are dimmed with *{Name} is with you until {weekday}*; a different tier is hired when the week is up. **No auto-renew** (the GDD's option is dropped: it would spend an absent player's Iron, which rule 4 forbids). **A lapse ends the contract and nothing else:** the morning after, the paper says he has gone back to the door; the row is gone; Iron, record, everything stands; the card hires him again at the same price. The last paid morning the desk reads *{Name} · last day · another week on the party store's card*. A bodyguard is not an item: never in the Wardrobe, never sold, never worn.

**Where he goes.** Everywhere you go: home, the capital, rival ground, the train (nothing happens on the train). Not into the cells (the row is absent there, as every row is) and not into a journey card or a patrol stop (cards, not fights).

**What the player sees.**

- **The party store's card**, kicker *SOMEONE TO WALK WITH YOU*, under the items: three `HireRow`s (the portrait at 64 px, *A doorman · 400 a week*, the line *Steps in first at a run-in · his strength {odds word against a street enforcer}*, the button **Hire · 400 Iron** / *From Level 6* / *From Rank 3* / *From Level 16* / *{Name} is with you until {weekday}*). The odds word on the card is against a street enforcer on a mission at home, said so in Courier (*against a street enforcer, on a mission at home*; §24.8 #7).
- **The Me tab**, a row under *Where you sleep*: kicker *WALKING WITH YOU* (dotted: the `bodyguard` note): *{Name}, a doorman · until {weekday}* and **Another week · 400** / *Paid four weeks ahead*; empty: *Nobody · a doorman from the party store, 400 a week*.
- **The run-in sheet**: the row first, with his portrait at 40 px beside the opponent's.
- **The desk**: *Ahead* carries *{Name}'s last day {weekday}* when it is within three days.

**Modals** (`ResultModal kind: 'political'`, body ≤ 240):

| Act | Stamp | Headline | Body | Knock-on |
|---|---|---|---|---|
| `hired` | Hired | {Name} walks with you | A week, paid. He meets you at the door and goes where you go. In a run-in he steps in first; if they push past him, it's you. | −{price} Iron · until {weekday} |
| `renewed` | Paid | {Name} · another week | He nods and says nothing. Until {weekday}. | −{price} Iron · until {weekday} |
| the run-in's modal (slice 5) | Got away / the fight's stamp | as slice 5 | his line (above), then the fight's text if it went ahead | +10 XP · {the act's result as rolled} |

**Paper lines** (every paper; the Herald's wording; ≤ 90 / ≤ 200):

| Id | When | Headline | Deck |
|---|---|---|---|
| `bodyguard-last` | the last paid morning | {Name}'s Week Is Up Tonight | Paid until tonight. Another week on the party store's card, or he goes back to the door. Nothing else changes. |
| `bodyguard-gone` | the morning after a lapse | {Name} Has Gone Back to the Door | The week ran out at midnight. He'll walk with you again for {price} a week; the card is at the party store. |

**Help note** `bodyguard` (two lines, the review-1 pattern): *Someone to walk with you* · *A week at a time, paid in advance. In a run-in he steps in first, with his own odds; if they push past him the fight is yours. He never argues with the police. When the week is up he goes; nothing else changes.*

**Copy** (new strings for `copy.ts`): *Someone to walk with you* · *A doorman* · *A steward* · *A minder* · *{n} a week* · *Steps in first at a run-in · his strength* · *against a street enforcer, on a mission at home* · *Hire · {n} Iron* · *Hire {Name} for a week, {n} Iron?* · *{Name} is with you until {weekday}* · *Walking with you* · *{Name}, a doorman · until {weekday}* · *Another week · {n}* · *Four weeks · {n}* · *Paid four weeks ahead* · *Nobody · a doorman from the party store, 400 a week* · *{Name} steps in* · *his strength* · *Not against the police* · *{Name}'s last day {weekday}* · *Hired* · *{Name} walks with you* · *{Name} · another week* · *Got away*.

**Content-policy check.** A doorman, a steward and a minder are civilians; the portraits carry no uniform, badge, armband or weapon (§24.6); the stewards' word is the rally's (*stewards* keep order at a meeting); the minder *says a name*, he does not draw anything. The row is *steps in*, never *fights for you*; the fail line is *it's you now*.

### 24.3 The bar and its buffs (GDD §6.7, §19.3)

**Which services are in.** Of §19.3's seven, **three** are built, and the rest are either already there or cut with a reason:

| §19.3 | In slice 8? | Why |
|---|---|---|
| **Buy a Round** | **In** · *Buy a round* · 2 Energy · **30 Iron** · *In good spirits* · three a day | the social sink the GDD wanted; priced (it had no Iron) |
| **Bar meal** | **In** · *A plate of something* · 2 Energy · **100 Iron** · *Well fed* for four hours | the GDD's band (100–150) at its floor, since a session buys one |
| (§6.7 Well-Fed (Fine)) | **In**, at a `hotel` · *Dinner* · 2 Energy · **400 Iron** · worn Charisma 10 · *Well fed, properly* for six hours | the hotels already carry a card (the tailor); the Charisma gate is the Wardrobe's first reward outside society calls |
| **Black Market Contact** | In, as **the back room** (§3.5, §3.8) | already designed |
| Overhear Conversation | **Already there**: every bar's intelligence ticket (*Listen at the bar*, *Listen to the porters*…) is this, and from this slice it carries the 10 % Dossier chance (§4.2) | a second ticket for the same thing would be two words for one act |
| Bribe the Barman | **Cut** | it would sell what the plate and the Faction tab already show (opinion, battlegrounds, the fixture); when there is something a barman knows that the paper does not, it comes back |
| Stimulant | **Cut** | Health comes back free and *Get patched up* (review 5) already sells it at 1 Iron a point; the overdose is a punishment (§4.3 rule 5) |
| Faction Recruitment | **Cut** | *recruit an NPC* is Party XP for Energy, which the orders and every tier-1 tap already are; NPC fill makes the recruit meaningless |
| (§6.7 Well-Fed (Street), (Society)) | **Not built** | street food's +5 % is below what the receipt prints; the society dinner needs its exclusive mission (later, with the Grand Hotel's events) |

**The two buffs** are **lazy state on the character** (value + timestamp; no job): `buffs.wellFed { tier: 'plate' | 'dinner', until }` and `buffs.spirits { left }`.

| Buff | From | Price · Energy | Needs | What it does | Lasts | Limit |
|---|---|---|---|---|---|---|
| **Well fed** | a plate at any bar | 100 · 2 | — | **+10 % XP** on tier-1 actions and missions (society calls included; not training, chapters, event roles or the exposé's fixed rewards, §21 #50's rule) · **Health +15 now, up to max** | **4 hours** from the tap | one meal at a time |
| **Well fed, properly** | dinner at a hotel (the Grand Hotel, the Pier Hotel, the Mountain Inn's dining room) | 400 · 2 | worn Charisma 10 | **+10 % XP and +10 % Iron** on the same · **Health +25, up to max** | **6 hours** | one meal at a time |
| **In good spirits** | a round at any bar | 30 · 2 | — | **+10 % XP on the next three missions** (tier 2, society calls included) | three missions; a second round adds three more, **nine at most** | **three rounds a day** |

- **One meal at a time, the better one** (Appendix C #111 settled): a dinner may be bought over a plate (it replaces it: new tier, new clock); a plate over a dinner is dimmed (*Well fed until {time}*); the same tier over itself is dimmed too (no topping up: the clock is the clock). **Health never goes above max** (default taken: §6.1's max is a Level figure and a buff above it would print a second ceiling). Health's own regen is untouched.
- **The percentages are lines of their own** on the receipt, added as the council rules' percentages are (ADR 0052's personal modifiers): *Well fed · +10 % XP* · *In good spirits · +10 % XP · 2 left*. Rested, the party coat's +5 % Party XP and a rule's percentage sit beside them; whole numbers, halves up, per line (§5.5).
- **Away:** a meal's clock runs out whether or not you play (a timer that is a choice, §4.3 rule 5); *in good spirits* waits (a count, not a clock). Nothing is taken; nothing is owed.
- **The bar's card** (every `bar`, review 4's card slot; above the back room, below the tickets), kicker *THE BAR · {place}*: two rows with an item picture at 64 px, the name, the Courier line, the price and **Buy · {n} Iron** (one tap; no confirm under 1,000): *Buy a round · 30 Iron · 2 Energy* · *In good spirits: a tenth more XP on your next three missions* · *A plate of something · 100 Iron · 2 Energy* · *Well fed: a tenth more XP for four hours, and some Health back*. States: *Three rounds a day · more tomorrow* · *Well fed until {time}* · *Nine missions in hand already*. **The hotel's card**, kicker *THE DINING ROOM · {hotel}*: *Dinner · 400 Iron · 2 Energy · needs Charisma 10* · *Well fed, properly: a tenth more XP and a tenth more Iron for six hours; Health back*; barred: *Not dressed for the dining room · needs Charisma 10*. The Mountain Inn (a `bar` with rooms) carries both cards, as it carries the tailor and the back room (§21.2 note 6).
- **The Me tab and the HUD:** a line under the stats block while a buff runs: *Well fed until 19:40 · In good spirits, 2 missions* (the `wellFed` and `goodSpirits` notes); nothing on the HUD bar (it is full).
- **The desk:** no row (a four-hour clock is a session's, not a morning's).

**Modals** (`political`, body ≤ 240):

| Act | Stamp | Headline | Body | Knock-on |
|---|---|---|---|---|
| `round` | Your round | A round for the bar | The barman lines them up and the bar remembers your name for an hour. You're in good spirits. | −30 Iron · −2 Energy · In good spirits · your next 3 missions |
| `meal` | Fed | A plate of something hot | Dumplings, gravy, and bread to mop it. The day looks better from here. | −100 Iron · −2 Energy · Well fed until {time} · Health +15 |
| `dinner` | Fed | Dinner at the {hotel} | A white tablecloth, a waiter who has seen everything, and the Front's prices. Worth it, tonight. | −400 Iron · −2 Energy · Well fed, properly, until {time} · Health +25 |

**Help notes:** `wellFed` · *Well fed* · *A plate at a bar or dinner at a hotel: a tenth more XP for a few hours, and some Health back, up to full. One meal counts at a time, the better one.* · `goodSpirits` · *In good spirits* · *A round at the bar: a tenth more XP on your next three missions. Three rounds a day, nine missions in hand at most.*

**Copy** (new strings): *The bar* · *The dining room* · *Buy a round* · *A plate of something* · *Dinner* · *In good spirits: a tenth more XP on your next three missions* · *Well fed: a tenth more XP for four hours, and some Health back* · *Well fed, properly: a tenth more XP and a tenth more Iron for six hours; Health back* · *needs Charisma 10* · *Not dressed for the dining room · needs Charisma 10* · *Three rounds a day · more tomorrow* · *Well fed until {time}* · *Nine missions in hand already* · *Well fed until {time} · In good spirits, {n} missions* · *Well fed · +10 % XP* · *Well fed · +10 % Iron* · *In good spirits · +10 % XP · {n} left* · *Your round* · *Fed* · *A round for the bar* · *A plate of something hot* · *Dinner at the {hotel}* · *Health +{n}*.

**Content-policy check.** A round, a plate and a dinner; no drunkenness mechanic, no stimulant, nothing a player is punished for not buying; the dining room's Charisma gate is the Wardrobe's rule and reads *not dressed for it*, as the society calls do.

### 24.4 Economy (`docs/economy.md` §22.11)

- **Bodyguards:** 400 / 1,200 / 3,000 a week against about 1,000 Iron a day in week 1, 1,500–2,000 by week 3 and 2,500–3,500 in month 2. The day-10 illegal player (1.5 run-ins a day, mostly enforcers at 60) spends about 600 a week on pay-offs; a doorman at 400 handles six of ten and keeps the Iron for bail: even. The rival-ground specialist (seven run-ins a day, about thirty a week that are not the police) saves ~1,500 of pay-offs and most infirmary stays with a steward at 1,200, which is why the steward is Rank 3's. A minder at 3,000 is for the player who is *Notorious* on rival ground at night and wants to come home. **Nothing here changes a rate**; the run-in's expected cost (§19.5) falls for the player who pays for it to fall. Verdict: the sinks band of §18.3 gains a weekly sink of 400–3,000 for the illegal road and nothing for the legal one.
- **Buffs:** a meal every session (300 a day) and three rounds (90) buy about **+12 % XP** for the model (190 + 70 XP on ~1,900), inside the heavy player's +35 % envelope (§5.2): Level 10 moves from day 5 to about 4.5, Level 16 from day 12 to about 11; **no §5.2 milestone moves by more than a day**. The week-1 player who buys everything spends about 40 % of a day's Iron on it, which is the point of a week-1 surplus. The dinner's +10 % Iron is about 100 a day for 400: never a profit.
- **Flags (Appendix C #113, #114):** if everyone buys three meals a day, the lever is the price (100 → 150) and then the hours (4 → 3), never the percentage; if bodyguards make rival ground a walk, the lever is his power (−4 a tier) or the police's share of the pool, never the price.

### 24.5 Questions for the architect (each with a default)

1. **The contract** is `bodyguard: { tier, name, paidThroughDay } | null` embedded (ADR 0056's day-key shape); the row's presence is `paidThroughDay ≥ today` at the run-in's read; a lapse needs no job. Default: yes; the paper's two lines are conditions on the day's read like the flat's.
2. **The row** is a fifth `RunInChoice` (`minder`) with its chance from `runInChances` given his power; `resolveRunIn` treats a success as `talked` (outcome kind `minded`, +10 XP) and a failure as Talk's (the fight at −10). The opponent's `sideOf === 'police'` dims it. Default: yes; the six opponent lines gain nothing (his two lines are his).
3. **Buffs** are `buffs: { wellFed?: { tier, until }, spirits?: { left } }` embedded; the modifiers enter `PersonalModifiers` (ADR 0052) as named parts; `spirits.left` is decremented in the mission's transaction after the rewards are computed. Default: yes.
4. **The bar card and the dining-room card** are content on the location (`bar?: { rounds: true, meal: true }`, `dining?: { price, cha }`), like `shop`; the prices are rules constants (`BAR`, `BODYGUARD`). Default: yes; a bar without the card is a bar as today.
5. **Test hooks:** force a contract (tier, days left); step the day to lapse it; set a buff; force the run-in's row. The e2e: hire → a run-in with the row → he steps in → +10 XP and the act paid as rolled; the week lapses → the paper's line → the row is gone and Iron stands; a plate → a mission → *Well fed · +10 % XP* on the receipt → the clock runs out.
6. **The playtest report** gains: contracts by tier and day; the row's share of run-in choices and its success rate; lapses and renewals; meals and rounds a day; the share of XP from buffs.

### 24.6 Art needed (Noir Lithograph; checked against the folder)

Three portraits and two item pictures. Portraits are drawn as the existing ones (`mvp/portraits`: a head and shoulders on a plain ground, ink line with a muted wash, no text, no symbol); items as the twenty existing (`mvp/items`: one object on cream paper, 512 × 512, a soft shadow, no scene). **No flag, badge, armband, pin, stripe or insignia on anyone; no weapon in any hand; no uniform.** Minders and stewards, not soldiers.

| # | Asset id | Kind | Prompt |
|---|---|---|---|
| 1 | `portrait.doorman` | portrait | *Noir lithograph portrait, 1946 Central Europe, head and shoulders: a bar doorman in his forties, broad, a heavy wool coat buttoned to the neck over a collarless shirt, a flat cap, a boxer's nose, patient eyes, a day's beard. Ink line with a muted sepia and slate wash on a plain ground. No text, no badge, no symbol, no weapon.* |
| 2 | `portrait.steward` | portrait | *Noir lithograph portrait, 1946 Central Europe, head and shoulders: a party steward in his thirties, lean, a worn dark suit and a plain tie, a notebook held against his chest with a pencil behind one ear, hair combed flat, an alert, reasonable face. Ink line with a muted wash on a plain ground. No armband, no rosette, no badge, no symbol, no text.* |
| 3 | `portrait.minder` | portrait | *Noir lithograph portrait, 1946 Central Europe, head and shoulders: a minder in his fifties, a good dark overcoat with the collar up, a felt hat with the brim down, a silk scarf, a calm, unreadable face lit from one side, a cigarette unlit. Ink line with a muted wash on a plain ground. No text, no symbol, no weapon.* |
| 4 | `item.bar-plate` | item 512 × 512 | *Noir lithograph still life on cream paper: a tin plate of bread dumplings and gravy with a slice of dark bread, a bent fork, a half glass of beer beside it, soft shadow, ink line with a muted two-colour wash. No text.* |
| 5 | `item.round` | item 512 × 512 | *Noir lithograph still life on cream paper: a tin tray with four glasses of beer, foam at the rims, one glass raised slightly off the tray, wet rings on the tray, soft shadow, ink line with a muted amber and slate wash. No text.* |

The hotel's dinner uses `scene.hotel` (exists) on its modal and the card. The run-in's modal keeps the opponent's portrait and adds the bodyguard's at 40 px.

**Done 16 Oct 2026:** all five are in the folder (`mvp/portraits/{doorman,steward,minder}.png`, `mvp/items/{bar-plate,round}.png`). Checked: no badge, armband, pin or weapon on any of the three; the minder's cigarette is unlit; the plate and the tray carry no text. **Alt texts (final; ≤ 160 characters; §24.9):**

| Asset id | Alt text | Length |
|---|---|---|
| `portrait.doorman` | A bar doorman in his forties: broad, a flat cap, a heavy dark wool coat buttoned to the neck, a day's beard, a lined face, patient eyes. | 136 |
| `portrait.steward` | A party steward in his thirties: lean, wavy hair combed back, a worn dark suit and a dark red tie, a pencil behind one ear, a notebook held to his chest. | 153 |
| `portrait.minder` | A minder in his fifties: a felt hat, a dark overcoat with the collar up, a red silk scarf, an unlit cigarette in the corner of his mouth, a hard, calm face. | 156 |
| `item.bar-plate` | A tin plate of three bread dumplings in gravy with a slice of dark bread, a fork, and a glass of beer beside it. | 112 |
| `item.round` | A tin tray with handles and four glasses of beer, foam at the rims, one glass lifted off the tray, wet rings below. | 115 |

**The `social` mission card is `scene.hotel`** (confirmed 16 Oct 2026): a society call's archetype is a hotel lobby (the Grand Hotel, the Pier Hotel), and the card is the type's fallback only. A mission's own `card` comes first (`mission.card ?? missionCard(type)`, slice 5), so **the Casino's two calls** (*A word at the tables*, *The late table*) **should carry `card: 'scene.casino'`** in `missions/clearwater.ts`; otherwise the late table's result shows a lobby. The Lido has its own scene on the place (`scene.lido`) and a call there may carry it the same way. No new picture is needed.

### 24.7 Points for the user (each with the default this document takes)

1. **A bodyguard never steps in against the police** (§24.2). Default: **never**, so Heat keeps its bite and the back room's bribe keeps its reason. The alternative lets the minder (tier III) argue with a constable at his odds, which makes *Notorious* on rival ground a walk for 3,000 a week.
2. **All three tiers are hired at the party store** (§24.2), none at the back room. Default: **the party store** (one card, one place kind, the branch's own stewards; the gym's discount later sits on the same card). The alternative puts the minder in the back room (Rank 3, any faction), which is flavour for a second card.
3. **One contract at a time, a different tier when the week is up**; no replacing mid-week. Default: **wait**, so no tap ever forfeits paid days. The alternative is *Replace him* with a confirm sheet and the days forfeit.
4. **Three services** (a round, a plate, the hotel's dinner) **and the back room**; the barman's report, the stimulant and recruitment are cut (§24.3). Default: **three**. The alternative builds *Bribe the barman* as a 4-Energy, 20-Iron row that tells you who was in the bar yesterday (the presence log), which is the one thing a barman knows that the plate does not.
5. **Well fed does not take Health above max** (Appendix C #111). Default: **up to max**. The alternative is a short overheal to max + 15 that fades with the meal, a second ceiling on the HUD.

### 24.8 Settled for the build (16 Oct 2026; answers to `docs/tech/slice-8.md` §24.10)

1. **"At most four weeks ahead": default.** Four renewal weeks beyond the running one (`paidThroughDay ≤ today + 34`); *Four weeks* is offered only when it fits, else *Another week* until *Paid four weeks ahead*. GDD §12.1 says so.
2. **A round at seven or eight in hand: default.** Allowed; it tops up to nine and the extra is lost (the player read *nine at most* on the card); refused only at nine (*Nine missions in hand already*).
3. **Which missions use up a round: default.** Every mission that reaches its rewards, whatever the outcome; the receipt shows the line. A mission refused at the gate does not.
4. **A meal and a waiting run-in: default.** The meal counts at the mission's start, so the receipt is the receipt whenever the run-in is answered.
5. **Re-hiring after a lapse: default.** The same tier brings back the same man and his name; a different tier draws a new one.
6. **The record's surcharge on a hire: none** (default). One price, the week.
7. **Which odds the card shows: the mission's.** §24.2's 62 / 50 and 86 / 74 were written against the street enforcer **on a mission** (power 22 × 1.1 = 24), and that is the figure to show: a mission is where the Iron goes and where the row is read most. Against a tier-1 tap's run-in he is 68 / 56 and 92 / 80, which the card does not print (one number, one place). The card's Courier line reads ***against a street enforcer, on a mission at home***; §24.2's table column and GDD §12.1's say *on a mission*.

### 24.9 Settled 16 Oct 2026 (phase A): the developer's questions

Answered during phase B's build; recorded here and in the sections they belong to.

1. **A Request counts a Success or a Partial; a Failure never counts.** Confirmed as built. It is the party orders' rule (GDD §15.4: count-type orders count attempts, Success or Partial) and the one a player already knows from the secretary's orders; a patron's letter is an order from a different desk. A Failure takes nothing from the count (opportunity, never assets). Pinned in §5.3 and §16.5; GDD §17.2 reads *done by ordinary play* and needs no number. The exposé's *Something I can print* already said it (§21.1 #26).
2. **Alt texts.** The seven checked against the pictures. Crane, Marr, the plate and the round stand as drafted (the round gains *with handles*; Marr his half-smile). Three corrected: the **doorman** has no boxer's nose (a lined face); the **steward's** tie is dark red and his hair wavy; the **minder's** cigarette is **unlit** (as §24.6's prompt asked) and his face is *hard, calm* rather than *calm, unreadable*. Finals: §19 (the patrons) and §24.6 (the five). All under 160 characters. The developer passes them into `art.ts`.
3. **The `social` mission card is `scene.hotel`**: fine. The Casino's two calls should carry `card: 'scene.casino'` so the late table shows the tables, not a lobby (§24.6). A content line each, no code.
4. **The life lines' priorities (phase B, lane 2's report).** The paper prints two personal lines a day, lowest priority first, and the selector's sort is stable, so the order of `lifeHeadlines.ts` breaks ties (the slice-5 risk lines, earlier in the content list, win equal priorities, which is right: the cells and the infirmary outrank the rent). The scale is the one the risk lines already use (0 the cells; 1 seen, deported; 2 a mark, the record up; 3 a first mission). The rule: **a line about something the player could lose, or must act on today, outranks news; a line the desk rows or the Letters row repeat word for word is safe to lose.**
   - **0, the front page:** `expose-front`. The whole city reads it.
   - **1, must reach the player**, in tie order: `recognised` (once ever; a safety fact), `flat-due` and `bodyguard-last` (a deadline tonight: the Rested bonus or the minder stop if the week is not paid; the Ahead clocks show *Rent due Saturday* and *Ruda's last day Thursday*, but only while there is room among three and only as a date), `bodyguard-gone` (the lapse landed at midnight and **nothing else on the page says so**: the *Walking with you* row and his Ahead clock are gone with him, and a player who walks onto rival ground believing he is there could lose Health or a night in the cells), `flat-waiting` (the morning the Rested bonus stopped; the sleep row says *the rent is out* but not why, and this is the only line that says the flat is kept), `patron-tier` (once per tier; the perk's line is told nowhere else; the patrons' desk row shows the number only).
   - **2, the player's own doing, already shown in a modal:** `expose-p3` and `expose-spiked` (the story modal stamped *Page three* or *Spiked* the moment the act was done; the Dossier shows the Case File spent or kept), `case-file` (the *Bound* modal), `patron-thanks` (the Letters row drops the Request and the patrons' row shows the new Favour; the line adds the next tier's mark), `patron-letter` (the same Request sits in the Letters row in full, with the countdown and the progress, and the tab's dot shows while it is unanswered: the row is the Request, the headline is only its announcement), `flat-bought` (the *Yours* modal and the sleep row), `wardrobe-first` (the *Bought* modal; once ever, but it falls on a quiet day).
   - **3, repeated word for word elsewhere on the page, safe to lose:** `legacy-entry` (the act's knock-on line said *Legacy +2* and the desk's Legacy row carries the total and what is left to spend), `informant` (the Letters row carries the same report, subject, category and days left; a report every second morning for a fortnight would otherwise hold one of the two slots for two weeks, which was the main crowding), `dossier-stale` (the desk's Dossier row reads *{n} entries · {m} go stale tomorrow*).
   - **Plurals.** The server fills `{n}` and `{daysLeft}` with bare numerals and the content cannot vary a headline by the count, so the two counted lines put the number after a colon: *Stale Tomorrow: 1 in the Dossier*, *Days of reports left: 1*. No other life line puts a numeral before a noun that changes with it (*150 a week*, *Favour 41*, *Legacy 12*, *3 to spend* all read right at 1). Two of the same fault lie outside the content file, for the developer: the Letters row's informant line in `lifeSettlement.ts` (`${l.daysLeft} days of reports left`) and the desk's Dossier row in `copy.ts` (`${n} entries · ${m} go stale`; `deskNone` beside it already pluralises). If the user wants a true singular (*An Entry Goes Stale Tomorrow*), the server would fill a word token (say `{entries}` = *an entry* / *3 entries*) and the headline would drop the verb; a rules-and-server change, not content.

## 25. Settled (phase C) — 17 Oct 2026, the developer's six questions

Rulings on the lane P and lane Q deviations (`docs/tech/slice-8.md`, *Deviations, Phase C*). Strings changed in `packages/content/src/data/copy.ts` in the same commit; the code changes are the developer's.

1. **The hire card's odds words (steward 86 %, minder 95 %, both *Good odds*).** The three words stand: *Good odds* from 70, *Fair odds* from 50, *Long shot* under (GDD §8.4, Appendix C #35: three words, no digit, the same bands on every ticket in the game). No fourth band: *Very good odds* at 90 would change every ticket that reads at 90 and up (training, a Confidant's call, the doorman at home against a tier-1 tap's run-in) and the §8.4 ruling was made for the whole game, not one card. Instead the card names what the minder adds, truthfully: **95 is the formula's ceiling** (§20.1 clamps 5–95), so a row whose chance sits at the ceiling carries the tag ***as good as odds get***. The minder's row reads *Steps in first at a run-in · his strength: Good odds · as good as odds get*; the steward's stays *Good odds*; the doorman's *Fair odds*. The same tag goes on his run-in row (*Mr Halm steps in · Good odds · as good as odds get · his strength*) when his chance there is 95, which is the one place a player compares him with their own *Fight* row. **Copy:** `copy.life.minder.asGoodAsTheyGet`. **Code (developer):** `HireRowView` gains `capped: boolean` (the mission-at-home chance of §24.8 #7 ≥ 95; `wardrobeService`/the bodyguard view builds it, `packages/rules`); `HireCard` prints `m.stepsInLine(oddsWordOf(r.word))` + ` · ${m.asGoodAsTheyGet}` when `capped`; `MinderEncounterRow` adds the same tag when `minder.chance >= 95` (the number is already in the view). `bodyguard.spec.ts`'s row text for the minder changes accordingly.

2. **The Town outfit's chip line below Charisma 20.** The chip's third phrase is about the coat, and under 20 the coat adds nothing to recognition (§3.6; `RECOGNITION.cha`'s lowest edge is 20, so `wardrobeView.line.word` is already `null` there). The missing line: ***Town · Charisma 5 · nobody looks twice at the coat***. It says the coat, not the player, because an office-holder is recognised by the office whatever they wear (§3.6: the office's part is halved only by plain clothes). **Condition:** the chip's own `setCha` (the Charisma the chip prints) **≥ 20 → `chipTown`; below → `chipTownPlain`**; the Plain clothes and Evening chips are unchanged. **Copy:** `copy.life.wardrobe.chipTownPlain`. **Code (developer):** `wardrobeService` `chipLine(id, cha)`: `id === 'town' ? (cha >= RECOGNITION.cha[RECOGNITION.cha.length - 1][0] ? w.chipTown(cha) : w.chipTownPlain(cha)) : …`; `wardrobe.spec.ts`'s `toContainText('Town · Charisma')` still passes.

3. **Lane Q's copy, confirmed or reworded.** All of it already lives in `copy.life` (`lifeQLines.ts` and the lane Q components carry no literal player text; nothing to move).
   - **Sources** (`copy.life.dossier.sources`): *Listening*, *Watching*, *In the cells*, *On the ward*, *A society call*, *A patron's word*, *Your informant*, *A chapter* confirmed. Three reworded: `theft` **Lifted papers** (was *A lifted letter*: the theft missions take rolls and ledgers), `informer` **A rival's informer** (was *On the train*: the informer card is the hostile deck's, on rival ground, not a journey card), `morgue` **The morgue file** (the mission's name). `test` stays *A test* (dev only).
   - **Empty states** (`copy.life.dossier.empty`): `names` and `filesEarly` confirmed. `files` → *No Case File yet. Three fresh entries on one name make one.* `informants` → *No informant yet. Turn a Case File with a pattern line, in a town whose patron counts you an Associate.*
   - **The exposé's two step texts** (`fileNarrative`, `deskNarrative`): confirmed as written; no editor is named, by rule (the paper is the place, Crane is the owner, and the Gazette has no named editor).
   - **The desk row labels** (`copy.life.desk`): *Dossier* · *Patrons* · *Where you sleep* · *Legacy*, plus *Ahead* (`copy.life.ahead.kicker`) and *Walking with you* (`copy.life.minder.meKicker`): confirmed; they match §10.3.

4. **"The facts, plainly" and the front page.** §4.5 was at odds with itself: step 1 promised *plainly* page three while step 3 gave every Success *a front-page line with your name*, and §11 stamped the modal by outcome. **The rule: the outcome decides the page; the angle decides the split and the difficulty.** A Success is the front page (`expose-front`, the stamp *Printed*) on either angle; a Partial is page three (`expose-p3`); a Failure is spiked. *Plainly* keeps what it was for: the whole swing to Neutral, a point easier than *the headline*, which puts half with your party. The code is right as built; the strings were wrong. **Copy:** `plainlyHint` → *Every line checked, nothing added. What they lose goes to the undecided; none to your party's name.* · `headlineHint` → *Your party's name under it: half of what they lose comes to you. A point harder.* · the plainly Success's title → *Page one, every line* (its body unchanged). §4.5 step 1 and §16.6 are corrected below. **Code:** none.

5. **The Flat Waits lost both slots to the Level 10 lines.** The numbers are right and stay: `flat-waiting` is **priority 1** (§24.9 #4: a lapse at midnight, the only line that says the flat is kept) and the Level 10 lines (`train-open` in every paper, *The Train Is Open to {name}*) are **priority 2**, as are the quarter-open and the other milestone lines: news the Map tab repeats, with no deadline. Nothing at Level 10 outranks a lapse. The tech note's "(priority 2)" is the pre-pass number. So if the paper still prints two Level 10 lines over *The Flat Waits*, the fault is the selector, not the content: **the two personal slots must be chosen from every personal candidate of the morning in one sort by priority (lowest first, stable)**, the life lines included, not the milestone lines first and the life lines in what is left. **Code (developer):** check where the settlement picks the personal lines (the slice-4 facts' lines against `lifeSettlement`'s) and merge before cutting to two; `home.spec.ts` can then read *The Flat Waits* in the paper as `docs/tech/slice-8.md` §1439 wrote it. In play the two rarely meet (the flat comes with its first week paid, so a lapse is a week after Level 10 at the earliest), which is why the pass did not catch it.

6. **The patron card's position.** It goes **first on the place's sheet, above the tickets**, at Herald House and the Pier Hotel; the exposé's ticket and the station's card stay in the card slot under the tickets. The place is the patron's house (Crane owns the Herald, Marr keeps his table at the Pier), the card is a portrait, a line and one button, and a player comes to these two places for Crane or Marr as often as for a ticket. A phone then has the portrait, the Favour line and **Gift** above the fold and the first ticket one thumb-scroll down, which screens §12 accepted for the shop card. Screens §8.1 and §12 are corrected. **Code (developer):** `PlaceDossierCards` renders the patron card (when `life.place().patron` is set) before the sheet's ticket list rather than in the card slot; `patron.spec.ts`'s screenshot moves. No copy change.

### 25.1 Integration (17 Oct 2026): plurals, and the Me tab's stat strip

7. **Plurals in `copy.life`** (tech *Deviations, Integration*; wiki drift S8-6). Eight strings read wrong at 1 and now pluralise: the desk's Dossier row (*1 entry · 1 goes stale tomorrow*), the informant's line (*1 day of reports left · next Monday*), the burned name's two lines (*nothing new for 1 day*), *Make a Case File · 3 entries*, the wardrobe's *Sells at a market: 1 thing*, the exposé's *1 line*, and the *Bound* modal's body. The rule for every counted string in the game: **a numeral before a noun that changes with it is written with the count** (`daysN`, `n === 1 ? … : …`); a headline template, which cannot vary by count, puts the number after a colon (§24.9 #4). No code change; `wardrobe.spec.ts`'s `/\d+ things$/` should allow *thing*.

8. **The Me tab's stat strip reads *STR 8 · INT 12 · AGI 5 · CHA 5*.** It is slice 1's strip, and it breaks the player-facing rule (GDD §1.5; the user's: spelled-out labels, plain words) and §18 #13, which bars *CHA* from any player string. **The labels are the four names the rest of the game already uses: *Strength · Intelligence · Agility · Charisma***, from `copy.statNames` (the odds lines, the level-up panel, the knock-on lines and the training rows all print them). No new copy key. The strip stays four columns with the number large under its name; the name is set in mixed case, not small caps, so *Intelligence* fits an 80 px column on a 375 px phone. **Code (developer):** `apps/client/src/routes/me.tsx`, the Level card's `<dl>`: `<dt>` prints `copy.statNames[s]` instead of `{s}`, and drops `label-caps` for the body face at 11 px (`font-label text-[11px] text-muted`); `data-testid="stat-{s}"` is unchanged, so `qa.spec.ts`'s `stat-str` read stands. The abbreviations stay in code and test ids only (`statLabel()` in `packages/ui/src/format.ts` has no player-facing caller left; remove it if the sweep agrees).
