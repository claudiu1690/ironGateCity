# Inventory, wardrobe and equipment screens: what other games do, and what Irongate should do

Game designer, 4 Oct 2026. Research for slice 8 ("A life in the city"), asked for by the user before the Wardrobe was designed. The recommendation in §4 is what `docs/design/slice-8-screens.md` §2–§3 builds; the rules behind it are in `docs/design/slice-8-life.md` §3. **Borrow principles, not signature systems** (CLAUDE.md rule 3): nothing here is copied; every borrowed idea is re-expressed through a 1946 political campaign.

Sources are listed in §5. Where a wiki or an official page could not be read (several fan wikis are behind paywalls or expired certificates today) the entry relies on the game's own documentation as summarised in search results and on the designer's knowledge of the game; those cases are marked.

---

## 1. What the games do

### 1.1 Torn (browser, 2004–; the direct genre reference)

**The items page.** One long page of **category tabs** (Primary, Secondary, Melee, Temporary, Defensive, Clothing, Medical, Drugs, Energy, Booster, Alcohol, Candy, Enhancer, Special, Supply, Flower, Plushie, Car, Artifact, Other…), each a **list of rows**: a small icon, the name, the quantity, the market value, and a row of text actions (*Use · Equip · Send · Sell · Add to market*). Weapons carry their numbers (damage, accuracy, quality) in a popup. **Equipping** is a text button on the row; four weapon slots (Primary, Secondary, Melee, Temporary) and five armour slots are fixed, and a weapon type belongs to one slot (rifles primary, pistols secondary). **Clothing is cosmetic** (no bonus, except masks), kept apart from armour. **Loadouts** save a whole set (weapons, armour, mods, ammunition, clothing) as presets switched from the page.

- **Good:** the category tab with a flat list is fast to scan on a phone; the row's actions are text, not icons; loadouts exist because switching one slot at a time was tedious.
- **Bad:** twenty categories is a filing cabinet, not a wardrobe; nothing about the page says who you are; the numbers are the only story; a new player cannot tell a 2 % item from a 20 % one without the wiki; the page is dense desktop markup squeezed onto phones.
- **Short sessions:** fine for a player who knows the page; poor for a newcomer who wants one answer ("what should I wear?").

### 1.2 Fallen London (browser and app, 2009–; the strongest match)

**Possessions.** Text-led, period, one page: a column of **equipment slots** at the top (Hat, Clothing, Gloves, Weapon, Boots, Companion, Destiny, Affiliation, Transport, Home Comfort, Ship, Spouse, Club, Treasure, Adornment, Luggage, Tools of the Trade, and more: the slot list grew with the game), each a small card with the item's picture, and below them the owned items grouped by category, as cards. **An item card** shows the picture, the name, one or two lines of flavour, and its **quality modifiers in words and numbers** (*Watchful +3 · Shadowy −1*); several items modify two or three qualities with a mix of pluses and minuses, which is the whole art of dressing there. A tap on a card equips it; the slot's card changes.

**Outfits.** A **Wear:** dropdown at the top of Possessions switches between saved outfits. Players start with four, named **Morning, Evening, Incognito and Hard-wearing**, which can be renamed; more can be bought (up to seventeen by every route). The 2020 outfits update made **saving explicit** (changing a hat while wearing an outfit no longer silently rewrites it: you press the save button), added **filtering equipment by a quality**, raised the cap, and briefly **locked outfit changes inside storylets**, which the developers scaled back within weeks because it worsened the clicking it was meant to cure, keeping the lock only where the fiction demands it (a heist). Their stated aims: make outfit choice strategic, make mixed-modifier items worth wearing, reduce clicking.

- **Good:** the four default outfit names say what outfits are *for* (a morning's work, an evening out, going unnoticed, rough weather) before a player has read a rule; the modifiers are visible on the card in plain words; one tap equips; saving is explicit; a filter by quality answers "what raises Shadowy?".
- **Bad:** the slot list is long (a dozen-plus slots, some whimsical) and the page is a scroll on a phone; cards for a hundred owned items are a wall; the lock experiment showed that friction on changing clothes is resented.
- **Short sessions:** the outfit dropdown is the thing that fits a phone session: one choice, then play.
- **Keepsakes:** many items cannot be sold (story items, companions); they sit in their own categories with no sell button, which is the right answer.

### 1.3 Sunless Sea (PC, 2015; Failbetter)

**The ship's fitting.** Fixed, named **slots** on a drawn ship (Forward, Deck, Aft, Bridge, Auxiliary, Engine), one item each; "each piece of equipment is designed to fit one specific place on your ship, and nowhere else". Items trade stats off against each other: the **Blazing Glim-Lamp** gives Mirrors +5 and **Veils −3** (you see better and are seen better); the Speculative Consonator gives Mirrors +4 and does not limit hiding. Unequipped items take hold space. The screen is a drawn ship with the slots on it and a list beside it.

- **Good:** a slot is a place on a picture, so the fit is obvious; the lamp's trade-off (seeing against being seen) is the clearest example in any game of an item that is good for one job and bad for another.
- **Bad:** a paper-doll ship needs a lot of art; the hold list is a plain table.
- **Borrow:** the lamp. In Irongate a good coat is the lamp: it opens doors and gets you recognised.

### 1.4 Kingdom of Loathing (browser, 2003–)

**Equipment.** Text and small icons. Slots: hat, weapon, off-hand, shirt, pants, three accessories, familiar equipment. The inventory page is tabs by category with items as **text rows**; an item's enchantment is a line of text in its description (*+5 Moxie · Regenerate 3–5 HP per adventure*). **Outfits** are of two kinds: **named sets** (wear all three pieces of the *Bugbear Bravery* set and get a set bonus) and **custom outfits** (save the current set under a name, up to 99; switching puts on the saved pieces and, by a well-known quirk, does not take off pieces the saved outfit does not mention).

- **Good:** the enchantment line is plain words; custom outfits with a name; the set bonus makes a complete outfit worth more than its parts.
- **Bad:** three accessory slots is bookkeeping; the quirk is a lesson (an outfit must *replace* the whole set); the inventory is a long list.
- **Borrow:** the complete-set idea, re-expressed as the faction's outfit paying a little more on party work when worn whole.

### 1.5 Mafia Wars and Mob Wars (Facebook, 2008–; the loadout school)

Hundreds of weapons, armour and vehicles with attack and defence numbers; the game **auto-equips the best** you own for a fight, by category, and the advice to players was simply "never buy more than 501 of anything". Items are an accumulating score, not a choice.

- **Good:** auto-equip means nobody is punished for not managing an inventory.
- **Bad:** no choice, no identity, no reason to look at the page; the numbers inflate until an item is a line in a table.
- **Borrow:** one principle only: **the game should never let a player be worse off for not visiting the wardrobe**. The default outfit must be sensible, and a *best for this* suggestion is the auto-equip, re-expressed as advice rather than automation.

### 1.6 Disco Elysium (PC and console, 2019)

**Clothing.** Eight slots (hat, glasses, jacket, neck, shirt, gloves, pants, shoes), each item with **skill modifiers both ways**: the FALN Pipo Pipo hat is Logic +2, Perception −1; the Army Surplus Winter Scarf is Empathy +2, Composure −1; the Itchy Pants are Half Light +2, Composure −1, Savoir Faire −1; the Horrific Necktie is Inland Empire +1 and talks to you. The inventory shows each slot with the item's icon and a tooltip listing every modifier; the character sheet shows the totals. Players change clothes before a check that matters.

**The Thought Cabinet.** A separate screen of **thought slots** (a few at the start, more with levels). A thought found in conversation is **internalised over in-game hours**, with a temporary effect while it cooks (the *Hobocop* thought lowers Composure while internalising) and a permanent effect when done (double money from recycling trash). A thought can be **forgotten** for a skill point. It is presented as a cabinet of cards: a drawn image, a title, a few lines of text, the timer, the effects.

- **Good:** modifiers both ways make dressing a decision; the Thought Cabinet is the best presentation of a *slow personal project* in any RPG: a card with a timer, a cost while it runs, a prize at the end.
- **Bad:** eight slots is too many for a phone; the inventory is a desktop grid.
- **Borrow:** modifiers both ways (through CHA: a good coat helps at the opera and gets you recognised on rival ground); the Thought Cabinet's *shape* for the Dossier's Case Files and for a patron's Request: a card that fills over days and pays at the end.

### 1.7 Citizen Sleeper (PC and console, 2022)

No inventory to speak of. Each **cycle** (a day) the player rolls a handful of dice and places them on actions around the station; **drives** are the medium-term goals, presented as cards with **clocks** (segmented circles) that fill as the player works at them over cycles; completing a drive pays a skill point and advances a storyline. Sessions are a cycle or two, and a run is a month of cycles.

- **Good:** a goal is a card with a clock; the player always sees three or four of them; each session advances one by a segment or two; nothing has to be finished today.
- **Bad:** nothing to wear, so nothing for the wardrobe question.
- **Borrow:** **the clock on the card** for everything in slice 8 that takes days: a Case File (3 fresh entries), a patron's Favour tier, a Request, a flat's rent, an Ambition chapter's wait. This is how the slice's question ("goals for the next month") becomes visible on a phone.

### 1.8 Modern mobile RPGs (Honkai: Star Rail, Genshin Impact; the item-card school)

Equipment screens are a **drawn item card** (a picture, a rarity colour and star count, the main stat large, sub-stats in a list, a level and an upgrade button) with a **compare** view against the equipped item showing **stat deltas** (+12 / −4 in green and red). Star Rail moved its menus to the right side for the **thumb zone** and put the character's stats where they stay visible when a weapon is chosen; the write-ups on Genshin's screen complain that the weapon's description fills the panel and the player must go back to see what changed.

- **Good:** the delta on the compare view answers the only question a player has ("is this better?"); the thumb zone; the card as a picture first.
- **Bad:** rarity colours and stars are a language a 1946 paper has no words for; sub-stats and upgrade levels are a second game; the card is a shop window designed to sell.
- **Borrow:** the **delta in one line** (*Charisma 5 → 17*), the picture first, the stats that stay visible.

---

## 2. Across the games: the questions, answered

| Question | What works | What does not |
|---|---|---|
| **Slots or a list?** | Few, named, fixed slots on top (Fallen London's column; Sunless Sea's places) with the owned items as a list beneath | Twenty category tabs (Torn); eight-plus slots (Disco, Fallen London's later years) |
| **A paper-doll?** | A *drawn item* per slot is enough; nobody needs a mannequin. Sunless Sea's ship is a paper-doll that works because the ship is the game's picture; a person in a browser game is a portrait, not a doll | A dressed avatar that needs art per item per body |
| **Showing bonuses** | Words and small numbers on the card (*Watchful +3*; *Charisma 12*); a one-line delta against what is worn | Hidden numbers behind a popup (Torn); sub-stat lists (Genshin) |
| **Comparison** | One line: what changes if you wear it | A two-column stat table |
| **Rarity and tier language** | Fallen London has none and needs none: the item's picture and price say it. Irongate has tiers (I–V) but should speak them as what they are: *work clothes*, *a good coat*, *a tailor's suit* | Colours and stars |
| **Outfits for situations** | Fallen London's four defaults, *named for what they are for* | Saving by accident; locking changes in play |
| **Sell and discard** | A sell price on the row for things that are things; **no sell button on keepsakes**, in a section of their own | A discard button next to a story item |
| **Keepsakes vs equipment** | Separate sections, and keepsakes show what chapter gave them | Mixing them in one list |
| **Short sessions on a phone** | One outfit choice, one tap to wear; the card's one line | Scrolling a hundred cards; eight taps to dress |

---

## 3. Principles to borrow, re-expressed through 1946 politics

1. **Four slots, named in plain words, on top.** *Coat · On you · Papers · Tools.* The coat is the Charisma; what is on you (a hat, a watch, a badge) is the small touch; the papers are what you show at a door; the tools are what you work with. No weapon slot: this is a political battle, and a run-in is won by Strength and a coat with some weight to it (GDD §20.3), never by a pistol.
2. **A coat cuts both ways** (Sunless Sea's lamp, Disco's scarf, GDD §8.2). The best coat opens the opera and gets you recognised in Duskwall. The card says both: *Charisma 22 · recognised on rival ground*.
3. **Outfits named for what they are for** (Fallen London). Two from the start, ***Town*** and ***Plain clothes***; a flat adds a third, ***Evening***. Changing is one tap on the Me tab and on the journey screen. Saving is explicit: dress, then *Keep this as Town*. Never locked: a player may change clothes anywhere but in the cells, the infirmary and on a train (a fiction a player accepts; Fallen London's heist rule).
4. **Advice, not automation** (the Mafia Wars lesson turned round). The wardrobe never dresses you, but every item card and every ticket that needs Charisma says what would help: *A good coat would give you Fair odds here*. Nobody is worse off for never opening the wardrobe: the starting outfit is sensible and the plain clothes are the ones you came with.
5. **The card is a picture and one line** (the mobile school, made quiet). The drawn item at 128 px, the name in Playfair, the one effect line in Courier, the price or *Wearing*. No stars, no colours, no sub-stats.
6. **A goal is a card with a clock** (Citizen Sleeper; Disco's cabinet). The Dossier's Case Files, a patron's Favour, a Request, a flat's rent, the season: each is a card that fills over days and says when it pays. This is the slice's answer to "goals for the next month": the cards are on the Me tab and in the paper, filling.
7. **Keepsakes are a drawer of their own** (Fallen London, KoL). No sell button; each says which chapter gave it. Nothing a player owns is ever destroyed, sold by accident, or lost by absence: homes and clothes included.
8. **The delta, in one line.** *Charisma 5 → 17* on the card before the tap; after it, the HUD's Charisma line changes and the card reads *Wearing*. No modal for dressing: dressing is not a result.
9. **Tiers in plain words, numbers in Charisma.** A tier is said as what it is on the shop card (*Work clothes · a good coat · a tailor's suit · a society wardrobe*), and the only number a player reads is the Charisma it gives and the Iron it costs.
10. **The shop is a card on a place**, like the Jobs card (slice 1): the market's clothes stall, the party hall's store, the hotel's tailor, the bar's back room. No new pins, no shop screen: a place sells what a place would sell.

---

## 4. The recommended Irongate inventory and wardrobe

A full screen-by-screen spec is in `slice-8-screens.md` §2–§3; this is the shape and the reasons.

**Where it lives.** A fourth block on the **Me tab**, under the stats block: kicker **WARDROBE** with the outfit chip row (*Town · Plain clothes · Evening*) and the four slot cards; a text button **Everything you own** opens the full wardrobe sheet. The Me tab is the thumb-zone tab a player already opens for stats and the record; the wardrobe is three thumb-heights down on a 375 × 667 phone.

**The four slot cards** (`SlotCard`): a row each, 72 px, left to right: the drawn item at 56 px on paper-2 with a 1 px ink border; the slot's kicker in Oswald caps (*COAT*), the item's name in body 600, the effect line in Courier (*Charisma 12 · armour for a run-in*); at the right *Wearing* in Courier, or *Nothing* for an empty slot with the hint *Tap to choose*. Tapping a slot card opens the slot's chooser: the owned items for that slot as cards, the worn one marked, one tap wears another. Dressing shows no modal; the HUD's Charisma figure and the slot card change.

**The outfit chips** (`OutfitChips`): *Town* (inverted when worn), *Plain clothes*, and *Evening* once the player has a flat. One tap changes the whole set; the chip row's Courier line reads *Town · Charisma 17* / *Plain clothes · Charisma 2 · unnoticed on rival ground*. When the worn set differs from the chosen outfit a small text button appears, *Keep this as Town*; outfits are saved explicitly (Fallen London's rule). A journey to rival ground offers *Change into plain clothes* as a line on the journey screen, one tap, the same action.

**The item card** (`ItemCard`, in choosers, shops and the full wardrobe): the picture at 128 px over paper-2 with the printed-matter border; the name in Playfair 18 px; the kind in Oswald caps (*COAT · A GOOD COAT*: the tier in plain words); the effect line in Courier (*Charisma 12 · Party XP +5 % when the whole outfit is the party's*; *Forged: Good odds at a checkpoint · a mark if they look twice*; *Press pass: better odds watching and listening · an entry for the Dossier now and then*); the second line, where it applies, the warning (*Recognised on rival ground from Charisma 20*); then the one button: **Wear** / *Wearing* / **Buy · 800 Iron** / *Needs 800 Iron* / *From Level 6*; a delta line above the button when choosing (*Charisma 5 → 12*); a keepsake carries the stamp **Keepsake** and *From chapter 2, "Stand where he stood"* and no button but **Read** where it has a text. A sell line in Courier under the button on things that are things: *Sells for 80 Iron at a market*, never a button on the card (selling is a shop's act, so a mistaken tap cannot sell a coat).

**Shops** (`ShopCard`, a place's card like `JobsCard`): on the place's sheet under its tickets, kicker *FOR SALE · THE CLOTHES STALL*, three or four `ItemCard`s in a horizontal scroll (the picture, the name, the Charisma, the price, **Buy**), a Courier line (*The stall buys too: a coat you don't want, at a tenth*), and a text button *Sell something* that opens the sellable items as rows with a price each (one tap, a confirm sheet with the price, since selling is the one act that takes something away by a player's own hand; keepsakes never appear). Shops by place kind: the **market** (Tier I–II clothes, hats), the **party hall** (the faction's outfit, the badge, the propaganda kit), the **hotel** (Tier III–IV, the tailor), the **bar's back room** (forged papers, wire cutters, the record-clearing bribe: the Black Market, with the record check), the **press** (the press pass, the camera). A shop sells what a place would sell; no shop screen exists.

**The full wardrobe sheet** (`WardrobeSheet`, a `BottomSheet` at 90 dvh): the outfit chips; then the items as `ItemCard`s in a two-column grid, grouped under rules by slot (**Coats · On you · Papers · Tools**), the worn one in each group first with *Wearing*; then **Keepsakes** (the drawer: cards with the stamp, no buttons but *Read*); at the end *Sells at a market: {n} things*. Empty groups read *Nothing yet · the market sells a hat*. On desktop the sheet is the side sheet at 480 px and the grid is three columns.

**What is not built:** no paper-doll, no stars, no sub-stats, no upgrade levels, no crafting (GDD §21.3's 40 % craft is post-MVP), no player trading (§18.4), no discard button anywhere, no item count badge, no weapon slot.

**Why it fits short sessions:** the question a player has on opening the Me tab ("am I dressed right for what I'm about to do?") is answered by the chip row's one line; changing is one tap; buying is one tap at a place the player is already standing in; nothing in the wardrobe takes more than three taps from the tab bar to done.

**Why it fits the look:** cards are printed matter (paper-2, 1 px ink, Courier lines, a stamp for keepsakes and for *Wearing*); the item pictures are the twenty drawn items of `mvp/items` at their 512 px square framing (an object on cream, no scene); the shop is a card on a place sheet like the Jobs card the player has seen since day 1; no new screen kind is introduced beyond the sheet.

---

## 5. Sources

- Torn: the items page and loadouts, from the official wiki's *Item*, *Loadout*, *Melee*, *Armor* and *Clothing* pages (https://wiki.torn.com/wiki/Loadout, https://wiki.torn.com/wiki/Clothing, https://wiki.torn.com/wiki/Armor; read through search summaries, the wiki itself refused the fetch today).
- Fallen London: the outfits guide (https://fallenlondon.wiki/wiki/Outfits_(Guide)), Failbetter's *Update to Outfits in Fallen London* (https://www.failbettergames.com/news/update-to-outfits-in-fallen-london) and *Another update to Outfits* (https://www.failbettergames.com/news/another-update-to-outfits-in-fallen-london); the forum thread on the update (https://community.failbettergames.com/t/update-to-outfits/19717).
- Sunless Sea: the official wiki's *Ship equipment* page (https://sunlesssea.miraheze.org/wiki/Ship_equipment).
- Kingdom of Loathing: the KoL wiki's *Outfit* page and the forum guide *Outfits and you* (https://wiki.kingdomofloathing.com/Outfit, https://forums.kingdomofloathing.com/vb/showthread.php?t=178329; read through search summaries).
- Mafia Wars: the fan wiki's *Best Equipment* pages (https://mafiawars.fandom.com/wiki/Category:Best_Equipment).
- Disco Elysium: the clothing list (https://discoelysium.wiki.gg/wiki/Clothing) and the Wikipedia article's account of the Thought Cabinet (https://en.wikipedia.org/wiki/Disco_Elysium).
- Citizen Sleeper: the Wikipedia article (https://en.wikipedia.org/wiki/Citizen_Sleeper) and the designer's knowledge of the drives and clocks (the fan wiki refused the fetch).
- The mobile item-card school: *How Honkai: Star Rail fixes Genshin Impact's UI problem* (https://medium.com/@acarenatnic/how-honkai-star-rail-fixes-genshin-impacts-ui-problem-6b386d6154f1) and the ArtStation case study on Star Rail's thumb zone (https://eyween.artstation.com/blog/WBeAB/what-you-can-learn-from-hoyoverse-honkai-star-rail-and-mobile-gaming); the itch.io *RPG Equipment Compare UI Pack* for the stat-delta convention (https://mtw1man2.itch.io/rpg-equipment-compare-ui-pack-inventory-item-slots-tooltip-assets).
