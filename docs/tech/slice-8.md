# Slice 8 — A life in the city: technical design

| | |
|---|---|
| **Goal** | Goals for the next month, shown as **cards with clocks**. **The Wardrobe**: four slots (*Coat · On you · Papers · Tools*), two named outfits (*Town*, *Plain clothes*; a flat adds *Evening*), one tap to change, shops as cards on places, a catalogue of nineteen priced or earned items with three bounded effect kinds; **worn Charisma** opens society calls and gets you **recognised** on rival ground. **The Dossier** opens as the fourth tab: entries on the republic's named people, fresh for a week, three entries' worth on one name bind into a **Case File** (Level 16), and a Case File becomes **an exposé** (three steps at a newspaper), a sale at a station, or **an informant**. **Two patrons**, Edith Crane and Julius Marr: Favour 0–100 from Requests in the paper, gifts and society calls, perks at 10 / 30 / 60 / 90. **A flat**: 2,500 Iron and 150 a week prepaid, never repossessed. **Legacy**: a public, permanent record with small lasting perks. ***Finish His Work*** chapters 4–12, *Clear His Name* 2 and *Settle His Debts* 3. **The Front** opens in Clearwater. ~~The Political Season~~ is **deferred** (16 Oct 2026, the note below) |
| **Question** | **Do players have goals for the next month, not just the next session?** |
| **Builds on** | Slices 0–4 as built on branch `slice-0`, **slice 5 as designed** in `docs/tech/slice-5.md` (phase B being built now), **slice 6 as designed** in `docs/tech/slice-6.md` and **slice 7 as designed** in `docs/tech/slice-7.md` (neither built). Where this document leans on a slice 5–7 name (`heat`, `held`, `runIn`, `runInChance`, `runInChances`, `yourPower`, `liveMarks`, `strikeOldest`, `missionTarget`, `MISSION_TYPES`, `resolveMission`, `encounters`, `stays`, `applyAgainst`, `rivalPressure`, `campaignEvents`, `eventSignups`, `eventService.call/withdraw/resolve`, `faction.profile`, `presence`, `contributions` faction scopes, `TERM`, `termOf`, `nation`, `settleNationDay`, `officeTerms.office`, `offices[]`, `nationalElections`, `laws`, `lawSourcesOn`, Clearwater's `cities` document), it is that design's name. If a slice's Deviations rename something, T9 follows the rename. Slices 0–5, reviews 4–5 and the voting rework (ADR 0073–0086) are now built; their knock-ons were applied to this document on 14 Oct 2026 (dated notes at the end) |
| **Design inputs** | `docs/design/slice-8-life.md` (*design §n*) · `docs/design/slice-8-screens.md` (*screens §n*) · `docs/design/inventory-research.md` (*research §n*) · `docs/economy.md` §22 · GDD §1.5, §3.3, §6.3, §6.4, §6.7, §8.2, §8.4, §10, §11.3, §11.4, §13.1, §13.3, §13.6, §14.1, §14.12, §16.2, §17.1–§17.4, §18.3, §19.3, §20.3, §21, §22, Appendix C #63, #71, #74–#81 · `docs/IMPLEMENTATION_PLAN.md` · ADR 0002, 0008, 0009, 0013, 0014, 0017, 0020, 0021, 0025, 0028, 0030–0034, 0036, 0037, 0040, 0042–0044, 0048 |
| **ADRs** | [0051 the Wardrobe](../adr/0051-wardrobe-four-slots-outfits-and-shops.md) · [0052 personal modifiers and recognition](../adr/0052-personal-modifiers-items-perks-and-recognition.md) · [0053 the Dossier](../adr/0053-dossier-entries-collection-counted-not-stored.md) · [0054 the exposé](../adr/0054-expose-a-story-at-the-press.md) · [0055 patrons](../adr/0055-patrons-favour-and-requests-by-the-calendar.md) · [0056 the flat](../adr/0056-the-flat-prepaid-rent-as-a-day-key.md) · [0057 Legacy](../adr/0057-legacy-entries-by-natural-ref-credited-in-character-transactions.md) · [0058 the season](../adr/0058-the-political-season-calendar-score-finale-and-rollover.md) (**deferred**, 16 Oct 2026) · [0088 bodyguards and the bar](../adr/0088-bodyguards-a-run-in-row-on-a-day-key-contract-and-bar-buffs-as-lazy-personal-modifiers.md) |
| **Defaults** (design §20, **approved by the user 16 Oct 2026**) | **No weapon slot and no weapon items** · **Crane and Marr** as the two patrons · **three fixed outfit names** · **an exposé's Failure keeps the Case File** · **the flat alone** as a priced home · **Blackmail and Denounce deferred** · and two season rules that wait with the season: **+100 per national election** in the season score, **no season track and no twist** in season 1 |
| **Environment** | **Local only** until the end of the project. Everything is played in `pnpm dev:mem` with the dev panel (§8.7). A month of play runs on the test clock (`POST /api/test/clock`, `/term`, `/city-day`, §8.6). No hosting work |
| **Added scope (14 Oct 2026, the user's decision; designed 16 Oct 2026)** | **Bodyguards** (*someone to walk with you*: a prepaid week, a run-in row) and **the bar's services with their buffs** (*Buy a round* → *in good spirits*, *A plate of something* → *well fed*, the hotel's *Dinner* → *well fed, properly*) join this slice: **§24** and ADR 0088, tasks T26–T32. The five user points of design §24.7 are built on their defaults. **Legacy perks** were already in it (§6.9) |

Every number below is a GDD, design or economy number. Where the design leaves a point open, this document states a default and lists the question in §22.

## Seasons deferred (16 Oct 2026)

**The user's decision (16 Oct 2026): "let's leave the seasons for later".** The Political Season is out of slice 8: the 84-day season, the score, the Season Election, the Champion, the awards, the Hall of Fame, the rollover and the finale. The other design §20 defaults are approved. [ADR 0058](../adr/0058-the-political-season-calendar-score-finale-and-rollover.md) is *Deferred*. Each section below marks what the season touched as **deferred** (struck through or tagged *Deferred (seasons)*) or **kept** with the reason; §20's tasks are rewritten so phases A–C build without it. Where a deferred line is struck through, the struck text is the design to pick up later.

**Moves to a later slice** (not yet placed in the plan):

- **The calendar**: `packages/rules/src/season.ts` entirely (`seasonOf`, `isSeasonStart`, `seasonNumber`, `electionFrom`, `seasonReset`, `addControl`, `seasonScores`, `champion`, `awardWinner`, `bracketOf`, `heatAt`) and the `SEASON` constants.
- **The score and the finale**: `nation.season` (the running score), `nation.lastSeason`, the Season Election's +100, the Champion, the four awards, `contributions` scope `season|{s}`, `seasonService.seasonFinaleInTx`, the `seasons` collection (the Hall of Fame), `season.hall`, `/republic/hall`, the republic sheet's `SeasonCard`, `HallOfFamePage`, `SeasonCardView`, `HallOfFameView`, `NationView.season`.
- **The rollover**: `seasonResetCity` in the three city boundaries (meters halfway, `influenceLedger` kind `season`), the council rule cut at season day 0 (drift row A9 waits with it), the laws ended at season day 0 (`laws.endedBy: 'season'`), Heat to 0 (`heatAt` on every read), `drawIssues`' reshuffle on a season's first Monday.
- **Legacy from seasons**: `seasonCredits`, `legacy.seasonCredited`, the kinds `champion` and `seasonAward` (Legacy +5 each), the *Champion of Season n* and award titles.
- **The paper**: `nl.season-week`, `nl.season-countdown`, `nl.season-front` and their headline conditions, the Ahead clock's Season Election, *While You Were Away*'s new season, *No twist this season*.
- **Tooling**: `POST /api/test/season`, the dev panel's *Season* buttons and status fields, `season.spec.ts`, the season in the integration suite (T18), the README's *a season in an afternoon*, the playtest report's `seasons` read.
- **Data**: the `dossierEntries` partial index for the spymaster; migration 012's `nation.season` step.
- **Questions**: §22.1 Q42, Q43, Q45–Q48 (settled for the season, reopened with it); §22.2 #2 (season 1's start) and #6; GDD Appendix C #5 (season length) stays open.

**Kept, although the old design listed them with the season:**

| Item | Why it stays |
|---|---|
| `CountLine.bonus` (the home count, `countSeats` as built by ADR 0084) and `scoreBonus` (`districtScores` / `countBattleground`) | The Protégé's endorsement (patrons, design §5) and the Legacy perk *A name they know*; neither is a season rule. Moved from T4 to T3 |
| The perk *A quiet word at the station* (`perkHeatCoolPct` into `coolRate`) and Marr's discretion (Heat to 0 at the tap) | Legacy and patrons. Heat is read as slice 5 built it (`projectHeat`); only `heatAt`, whose one job was the rollover's zero, is deferred |
| `dossierEntries.used { how, day, ref }` | Written by every use: the report, the Headline Story and the burn read it; the spymaster will later |
| Legacy, its eight perks, the backfill (Q41) and every non-season kind | Approved MVP (14 Oct 2026); none needs the season |
| The `legacyEntries` unique `{ characterId, ref }` | Every Legacy row's idempotency |
| `TERM`, `termOf`, the nation's day | Slice 7, built; the season will be derived from them |

**Forward compatibility** (so the season can be added later with no data migration):

1. **No season state is stored now.** The season will be a pure function of the day from `TERM.epochDay` (84 days = three terms); keep `TERM` and its epoch as they are, so a later `seasonOf` lands season day 0 on a term day 0 and a Monday. The first season will be the one in progress when the feature ships (partial, Q45's default); `nation.controlLog` keeps only 60 days, so nothing may rely on it to backfill a score.
2. **Legacy refs are reserved**: `champion:{s}` and `award:{s}:{kind}:{bracket}` (nothing in slice 8 writes them; slice 4's awards use `award:{awardId}` with an ObjectId, which a season number never equals). `LegacyKind` and the model's `kind` gain `champion` and `seasonAward` later, an additive enum. `legacy.seasonCredited` is not added now: absent reads as *nothing credited*, so the later settlement credits from the first finished season.
3. **Heat**: `heat { value, at }` stays as stored. Every server read of Heat goes through the one projection (`projectHeat` in `loadCharacter`); the later `heatAt` wraps it in that one place, lazily, with no write.
4. **Contributions**: `addInfluence` keeps its scopes as a list (ADR 0042), so `season|{s}` is one more upsert later; a season's ledger starts on its first day, so there is nothing to backfill.
5. **Open enums**: `laws.endedBy` and `influenceLedger.kind` take additive values (`season`); the rollover's council-rule question (A9) is decided when the season comes back.
6. **The Dossier** writes `used.day` on every use from now; the spymaster's partial index is an `ensureIndexes` addition later (no data moves).
7. **The paper**: the ids `nl.season-*` and the conditions `seasonWeek`, `seasonCountdown`, `seasonFront` are reserved; `selectHeadlines`' conditions are additive. `drawIssues` already takes `lastWeek`, so the reshuffle is a caller passing `[]`.
8. **The nation's day** keeps ADR 0043's step order; the finale later appends after the take-office step in the same transaction, and `nation.season` arrives with a default computed at its first boundary.

---

## 1. Scope

**In**

- **The Wardrobe** (design §3, screens §2–§5):
  - four slots (`clothing`, `accessory`, `document`, `utility`); the Coat slot is never empty;
  - outfits *Town*, *Plain clothes* and *Evening* (the third with a paid flat), one tap to change, explicit saving, locked in the cells, the infirmary and on a train, with the journey's *Change into plain clothes* applied at arrival;
  - worn Charisma = the origin's base (0 for every character created since review 4; older characters keep theirs) + the coat (every new character wears it) + what is on you + 2 in the city of a paid flat;
  - the catalogue: nineteen wearable or usable items, ten keepsakes, three effect kinds (`chancePct`, `fxpPct`, `dossierChance`), bounds enforced by the loader;
  - **shops** as cards on places (the clothes stall, the party store, the tailor, the press, the back room), one of each item, the record's surcharge, buy-back at a tenth with a confirm;
  - **the back room's bribe** (500 / 1,000 / 2,000 a mark, one a day, half price under Marr's discretion);
  - **the coat in a run-in** (power and damage from the worn coat's armour) and **the Papers slot** at the checkpoint and in *Talk your way out*.
- **Charisma cuts both ways** (design §3.6–§3.7): **society calls** (a tier-2 mission type `social`, the door ten under the figure), six calls; **recognition** on rival ground added to every run-in roll; a recognised visitor counted by the home faction's presence.
- **The Front opens** (design §3.7, §16.3) by its places leaving Clearwater's `laterPins` and becoming locations (review 4: Clearwater is one map, no quarter view): four places, eight tier-1 actions, four calls, the back room at the Casino, the tailor and Marr at the Pier Hotel.
- **The Dossier** (design §4): the tab; names; entries from eight sources; capacity by Intelligence and perks; freshness; **Case Files** at Level 16; **selling** at a station; **informants**; the **Headline Story** with a Case File attached.
- **The exposé** (design §4.5): three steps at a `press` place, one a day, resumable; the swing against the name's party in the name's town; the front page with the author's name.
- **Patrons** (design §5): Crane and Marr; Favour; **Requests** in the paper; gifts; the perks of four tiers (gossip, introductions and informants, the weekly favour, the endorsement and the patron's piece).
- **The home** (design §6): the rented room's +10 Rested at every boundary for everyone; **the flat** (buy, rent, the lapse that waits, *Evening*, +25, the cap, +2 Charisma).
- **Legacy** (design §7): the record (fourteen kinds of entry, plus the Unrest prize's +2 from review 5), the balance to spend, eight lasting perks.
- **Ambitions** (design §8): *Finish His Work* 4–12 and its completion; *Clear His Name* 2; *Settle His Debts* 3.
- ~~**The Political Season** (design §9): the calendar, the running score, the Season Election, the Champion, four awards, the Hall of Fame, the rollover.~~ **Deferred (seasons, 16 Oct 2026).**
- **The paper** (design §10): seventeen personal lines, the Letters row (Requests, informants, gossip), the desk's Dossier, Patrons, Where you sleep and Ahead rows, the exposé's public line (~~the season's lines and front page~~: deferred).
- **Art**: eighteen new item entries (eight new pictures; the standard coat reuses `item.winter-coat`), four scenes (`flat`, `casino`, `lido`, `front-page`), location scenes for the Casino and the Lido.
- **The dev panel and test hooks** for the slice (§8.6–§8.7), and the playtest report's **life** section (§15.2).

**Out** (§19): **the Political Season** (the user, 16 Oct 2026: the note at the top); weapons; crafting; player trading; Blackmail and Denounce; the other three patrons; the townhouse, the villa, a second flat and the map marker; the season track and Season Twists (the twist multiplier is wired, no twist exists); the *Lodged* and *Weatherproof* buffs (the Well-Fed buffs and *In Good Spirits* are added scope, §1.1); a Legacy for a rule that won (not designed; voting rework); Charisma's vote appeal on the national score; Political Protection; players as Dossier names; hosting.

### 1.1 Added scope: bodyguards and bar services (14 Oct 2026; designed 16 Oct 2026, §24)

The user moved bodyguards and the bar's services with their buffs into this slice (14 Oct 2026); the designer's design is `docs/design/slice-8-life.md` §24 (16 Oct 2026). **Their technical design is §24 below** ([ADR 0088](../adr/0088-bodyguards-a-run-in-row-on-a-day-key-contract-and-bar-buffs-as-lazy-personal-modifiers.md)):

- a prepaid day-key contract `bodyguard { tier, name, paidThroughDay }` hired at the party store;
- a fifth run-in row (`minder`), frozen on the encounter, never against the police;
- the bar's round and plate and the hotel's dinner;
- the buffs as lazy state `buffs { wellFed { tier, until }, spirits { left } }`, read as named parts through `PersonalModifiers`.

Its tasks are T26–T32 in §20. Legacy perks were already here (§6.9).

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| Items | **Catalogue stays content** (ADR 0014). `ItemSlot` becomes four; an item gains `effects` (a closed DSL of three kinds with `ITEM_EFFECT_BOUNDS` in rules), `price`, `level`, `rank`, `factionId`, `members`, `keepsakeFrom`. **Armour is not stored**: it is the clothing tier's (`armourOf`, slice 5) | ADR 0051, §4.1 (Q1) |
| What is worn | `characters.equipment { clothing, accessory, document, utility }` of inventory uids (ADR 0014). **One of each item** (shops sell one of each), so the inventory stays bounded (≤ 40) | ADR 0051 |
| Outfits | `outfits { town, plain, evening }` (each an `Equipment`; `evening` null until a flat) and `lastOutfit`. **Which chip is inverted is computed** (`outfitOf(equipment, outfits)`), never stored, so nothing drifts. Dressing is a set-to-state write under the version guard with no request key (ADR 0008's allowance) and no modal | ADR 0051 (Q1) |
| Changing on a train | The journey screen's *Change into plain clothes* writes `journey.dress: 'plain'` on the pointer and the journey; **`settleArrival` applies it** in its conditional update, so it takes effect at the station whether the arrival is lazy or the tidy job's | ADR 0051, §3.2 |
| Shops | `Location.shops[]` (content: kind, items, what it buys), at most two on a place (the Mountain Inn: the tailor and the back room). Prices in the catalogue; **the surcharge by the record's level at the tap**; buy and sell are one version-guarded character update with an ADR 0008 request key | ADR 0051 (Q2) |
| Worn Charisma | `wornStats` (ADR 0014) remains the one place: base + coat + on you + **the flat's +2 while standing in its city, paid, and resident** | ADR 0051, 0056 |
| Item and perk effects | **Personal modifiers** (`PersonalModifiers { worn, perks }`) beside ADR 0030's place modifiers, not new `ModifierSource` kinds: an item's `chancePct` is keyed by **the act's own type** (a mission's type, not its *seen as*), which the place DSL cannot express. Each effect is a named check row or reward part | ADR 0052 |
| Recognition | Pure `recognition()` from worn Charisma, plain clothes, the night, the highest **current** office (the `offices[]` projection) and `legacy.total`; **added to the run-in chance on rival ground** before the 0–90 clamp; words on the plate and tickets, never a digit | ADR 0052 (Q10) |
| Dossier storage | **`dossierEntries` collection** (entries, Case Files, informants: one row each, `status` held / attached / informant / spent / sold / bound). **The slot count is counted, not stored**: every path that adds an entry writes the character under its version guard in the same transaction, so a count in the session cannot be raced | ADR 0053 (Q3) |
| Entry landing | Rolled **in the act's own transaction** from a named stream of the act's seed (`seed:dossier:{row}`) after the check; one roll per row; the knock-on carries the line (and, for the dev panel, the chance and roll) | ADR 0053 (Q4) |
| Names | `GameContent.names()`: every candidate, secretary, local deputy and party figure with a party and a town (deputies and figures in the capital's Government Quarter), plus dossier-only names (Brandauer) that are never drawn at random | §4.1 |
| Lazy Dossier income | **Informant reports and patron gossip land in the character's settlement** (the boundary days in the window, in order, slot permitting), not by a job: the world never writes a character (ADR 0020), and a reader away for a week gets each report once | ADR 0053 (Q3) |
| The exposé | A story with the chapter's shape (ADR 0013): **step 1 a set-once pointer** `characters.expose { fileId, angle, locationId }`; **step 2 a keyed game action** (`actionLogs` kind `expose`) that writes the file, the swing in the name's town or district, Legacy and the headline; a Failure keeps the file | ADR 0054 (Q5) |
| The burn | **Per player** (`characters.dossierBurns[]`, 14 days, pruned): the player's own exposé or Headline Story; another player's file on the name is untouched (§22.1 Q18) | ADR 0054 |
| Patrons | **Embedded** `patrons[]` (≤ 2): Favour, the first visit, open Requests with progress, the rotation pointer, the tier days, the weekly favour's day, Marr's discretion. **Requests arrive, expire and are paid by calendar arithmetic in the settlement** (pure `patronDays`); progress is written with the act that earns it, by the orders' matcher | ADR 0055 (Q6) |
| The flat | `home.flat { cityId, boughtDay, paidThroughDay }`: **rent is a day key**; every bonus is a pure function of the day, so a lapse needs no write. Buying and paying re-base Energy at the tap (ADR 0030 §5). **Rested at the boundary** joins the settlement's projection | ADR 0056 (Q7) |
| Legacy | **`legacyEntries` collection** with a unique `{ characterId, ref }` (`term:{id}`, `award:{id}`, `expose:{logId}` …; `champion:{season}` reserved for the deferred season) and **embedded `legacy { total, spent, perks }`** (`seasonCredited` deferred). Every entry is inserted in a character transaction (an act, or the settlement for terms and awards), so `total` and the rows never disagree | ADR 0057 (Q8) |
| Chapter requirements | `characters.milestones` (first Chair vote, first national vote, first list, first Case File, completed terms by office, the first deputy term's day), kept by the acts and the settlement, so `chapterStatus` stays pure on the character | §5.9 |
| ~~The season~~ **Deferred (16 Oct 2026)** | ~~`seasonOf(day)` from `TERM.epochDay` (84 days); **the running score on `nation.season`** (one read every request already pays); **`seasons` documents** at the finale (the Hall of Fame). The Champion's and awards' Legacy is **credited lazily** by each member's settlement~~ | ADR 0058 (Q9) |
| ~~The rollover~~ **Deferred** | Split by owner: **each city's boundary into season day 0** moves its meters halfway and ends its council rule (last step, after the count; **whether the rollover may end a rule at all is the user's call**, since the voting rework says a city always has a rule: drift row A9, ADR 0058's amendment); **the nation's day** seats the Season Election, adds its +100, writes the season, ends the laws; **Heat to 0 is lazy** (a Heat stamped before the season's start projects as 0 from it) | ADR 0058 (Q9) |
| ~~Awards~~ **Deferred** | Read at the finale from what already exists: a new contributions scope `season|{s}` (Top of the ledger), `awards` (Hero titles), `eventSignups` (Triumphs as Speaker or Organiser), `dossierEntries.used` (the spymaster) | ADR 0058 |
| The council counts (**kept**) | The Protégé's +2 and *A name they know*'s +1 a level join `CountLine.bonus` at home (`countSeats`, ADR 0084); the Protégé's +1 point of score a `scoreBonus` on the party in a battleground count. Read from the candidates' characters at the count (read only). Patrons and Legacy, not the season | §6.11 |
| Bodyguards (§24) | `bodyguard { tier, name, paidThroughDay }` embedded, **a day key** (ADR 0056's shape): no job, no auto-renew, a lapse writes nothing. In a run-in **a fifth row** (`minder`) at the Fight formula with his power, **frozen on the encounter**; never against the police | ADR 0088 |
| The bar's buffs (§24) | `buffs { wellFed { tier, until }, spirits { left } }` embedded, lazy; their percentages are **named parts through `PersonalModifiers`** (`buffShares`), a line each on the receipt; a round is used up in the mission's transaction | ADR 0088, 0052 |
| Routes | `/dossier`, `/dossier/expose` (~~`/republic/hall`~~ deferred); the Me tab's blocks; sheets on places (shop, sell, station, patron) and on the Me tab (slot chooser, wardrobe) | §12.1 |
| Jobs | **None new, and none extended.** Rent, Requests, informants, gossip and Heat are lazy; `nation-day` and `city-day` run as slice 7 built them (the season's finale and resets on them are deferred) | §9 |

---

## 3. The order of play, time, and the flow

### 3.1 Wearing (one tap, no modal)

```
wardrobe.wear({ uid })   (one conditional update; no key: the end state is the request, ADR 0008)
  refuse: CHANGE_LOCKED (held 'in', or journey 'onTheWay') · NOT_OWNED · NOT_WEARABLE (no slot)
  equipment.{slot of the item} = uid      filter { _id, version }  → $inc version
  → WardrobeView (the chip, the slot cards, Charisma)

wardrobe.outfit({ outfit })   equipment = outfits[outfit]; lastOutfit = outfit
  refuse: CHANGE_LOCKED · OUTFIT_LOCKED (evening without a counting flat)
wardrobe.keep({ outfit })     outfits[outfit] = equipment; lastOutfit = outfit   (same refusals)
wardrobe.takeOff({ slot })    equipment[slot] = null   (COAT_REQUIRED for 'clothing')
```

A dangling uid is never possible: selling a worn item is refused (*Take it off first*), and selling an item saved in an outfit takes it out of that outfit in the same update (§22.1 Q2).

### 3.2 Dressing for arrival

```
travel.journey (onTheWay, to a rival home city)  → JourneyView.dress: { offered, done, warning: 'recognised' | null }
wardrobe.dressOnArrival({ journeyId })            journey.dress = 'plain' on the pointer and the journey doc
settleArrival (lazy or the journey-arrive job, ADR 0025 §4)
  … the character's conditional update also $set equipment = outfits.plain, lastOutfit = 'plain'
     when journey.dress = 'plain' (the outfit read in the same session)
```

### 3.3 Buying and selling

```
shop.buy({ locationId, itemId, key })     (one transaction: the character + requestLogs)
  refuse: NOT_IN_CITY · NO_SHOP / NOT_SOLD_HERE · MEMBERS_ONLY · LEVEL · RANK · ALREADY_OWNED · NOT_ENOUGH_IRON
  price = shopPrice(item.price, recordLevel(today))          // +15 % Repeat offender, +30 % Notorious
  character: iron − price (filter iron ≥ price, version), inventory += { uid, itemId, day, source: 'shop' },
             firsts.coat (the first coat bought: hl `wardrobe-first`)
  → PoliticalResult act 'bought' (Wear it now: a second button calling wardrobe.wear)

shop.sell({ locationId, uid, key })
  refuse: NOT_SOLD_HERE (the shop's `buys`) · NOT_SELLABLE { why: keepsake | kit | worn | noPrice } · IN_STORY
  character: iron + sellPrice(item.price) (a tenth of the catalogue price), inventory −= uid,
             outfits: the uid replaced (a coat by the kit's outfit, anything else by null)
  → PoliticalResult act 'sold'

shop.bribe({ locationId, key })           (the back room; Rank 3)
  refuse: RANK · NO_MARKS · BRIBED_TODAY · NOT_ENOUGH_IRON
  price = bribePrice(recordLevel(today), discretion = patrons.marr.discretionUntil ≥ today)
  character: record.marks = strikeOldest(...) (slice 5), iron − price, today.bribe = true
  → PoliticalResult act 'markBought'
```

### 3.4 An entry lands (every source)

```
any act that can land one (an intelligence Success, a surveillance or theft mission, the informer card, the cells'
or the ward's tap, a society call, a chapter), inside its own transaction, after the check:
  chance = DOSSIER.chance[source] + dossierChanceOf(worn)        // 10 % + the press pass 10, the camera 15, the pen 10
  r = rollEntry({ chance, category, cityId, subject?, actor }, createRng(seed + ':dossier:' + row))
  if r.lands:
     used = DossierEntry.countDocuments({ characterId, status: 'held' }).session(s)
     used < dossierCapacity(int, perks) → insert { kind: 'entry', subjectId, category, lineId, params, day, source }
                                          + dossierLastAt (the tab's dot), Requests' progress (§3.7)
     else → the knock-on 'refused' (*Dossier full · an entry went begging*)
  the character's version-guarded write that the act already makes serialises two landings
```

### 3.5 A Case File, a sale, an informant

```
dossier.bind({ subjectId, key })   Level 16 · no file held on the name · weight of the held entries ≥ 3
  entries (held, on the name) → status 'bound', fileId; insert the file { lines, kinds, weight, status 'held' }
  milestones.caseFileAt (once); the character's version  → PoliticalResult 'caseFile'
dossier.sell({ locationId, id, key })   at a `station` place; an entry 50 (25 stale), a file 200
  the row → 'sold' (filter status 'held'); iron + value; used.day for a file (the spymaster)  → 'dossierSold'
dossier.turn({ fileId, key })   a pattern line · Associate with the patron of the name's city · < 2 informants
  the file → 'informant' { fromDay: today, untilDay: today + 14, reported: 0 }; used.day  → 'informant'
the settlement (each boundary b in the window, in order):
  informant reports at b = fromDay + 2k (k = 1…7, b ≤ untilDay): an entry on a name of its city, pattern and
  political alternating, if a slot is free (else not landed, no line); Monday b and Acquaintance: the patron's
  gossip (Crane: political on a capital name; Marr: asset on a Clearwater name)
```

### 3.6 The exposé's life

```
step 1   expose.choose({ locationId, fileId, angle })          set-once: characters.expose null → { fileId, angle,
         at a press place; a file held with a political or      locationId, day }; the file stays 'held'
         criminal line; the name has a party not yours; not     (no Energy, no key, ADR 0013)
         burned; today.expose false
step 2   expose.attempt({ wayId, key })                         one transaction, ADR 0002 (actionLogs kind 'expose')
         at expose.locationId's city · Energy 20 (Rested applies) · PRINTED_TODAY · the file still held
         check = computeCheck(way, worn stats, exposeDifficulty(weight, angle, the paper's city role),
                              bonuses: item rows on 'expose', rival ground's row when the press is on rival ground)
         success | partial → the file 'spent' (used { how: 'expose', day }); the swing in the NAME's town or district
                              (plain: the party → Neutral; headline: applyAgainst, half yours, half Neutral; the 2-point
                              cap when that town is the party's home); ledger, contributions, Issue points; burn 14 days
         success          → PC + 5, Legacy + 2 (legacyEntries 'expose:{logId}'), hl `expose-front` tomorrow
         failure          → the file kept; hl `expose-spiked`
         characters.expose = null; today.expose = true; Requests (`req.crane.print`)
step 3   the modal (kind 'story', stamp Printed / Page three / Spiked)
```

### 3.7 A patron's Request

```
patron.visit({ patronId })      first card view at the place: patrons[p].firstVisitDay = today (set-once, no key)
boundary a = v + 2k (k ≥ 1)     a Request arrives unless two are open: requests += { id: rotation[next], arrivedDay a,
                                untilDay a + 3, target, progress 0, params (district) }; next += 1 (skipping
                                `req.crane.print` below Level 16)          → Letters row `patron-letter`
days a … a + 3                  every matching act advances progress in its own transaction (requestMatches)
boundary after doneAt           + 6 Favour (× 1.1 rounded up with the perk) → `patron-thanks`; tiers crossed
                                (`patron-tier`; Protégé: the piece and Legacy + 5)
boundary a + 4, not done        removed (the letter is in the bin; nothing else)
```

All of it is computed by the pure `patronDays` in the character's settlement for every boundary in `(settled, today]`, so an absent player's Requests arrive and expire exactly as a present player's would.

### 3.8 The flat's week

```
home.buyFlat({ key })    Level 10 · in the residence city · no flat · 2,500 Iron
                         flat = { cityId: residence, boughtDay: today, paidThroughDay: today + 6 }; outfits.evening = equipment;
                         Energy re-based (the cap rises today)
home.payRent({ weeks, key })   1 or 4 · 150 a week · from anywhere
                         paidThroughDay = max(paidThroughDay, today − 1) + 7 × weeks   (no arrears: a lapsed flat pays from today)
day d                    counts(d) = paidThroughDay ≥ d and residence.cityId = flat.cityId
                         cap + 50 (the larger with a room), Evening as a set, + 2 Charisma while standing in its city
boundary into d          Rested + (counts(d − 1) ? 25 : 10), banked up to the day's cap
```

### 3.9 The season's last boundary (into season day 0) — **deferred (seasons, 16 Oct 2026)**

Kept as the design to pick up later; nothing in this subsection is built in slice 8. The city and nation boundaries run as slices 4–7 built them.

```
each city's boundary d (city-day, ADR 0017): drift → Issues (Monday; the deck reshuffled: no "last week") →
   … the count and division as usual … → LAST: seasonResetCity: every meter halfway to its baseline
   (ledger rows kind 'season'), the council rule in force on d − 1 ends at d
the nation's boundary d (nation-day, ADR 0043), after every city:
   (1) control snapshot (post-reset) …  (4) divisions and enactments  (5) term day 0: take office — the Season
   Election seated → nation.season.elections += { termIndex, president's party }   (6)–(8) as slice 7
   then seasonFinale(d) in the same transaction:
     score = Σ control share over the season's boundaries (running) + 100 × elections won
     champion (ties §22.1 Q43), the three Presidents, the four awards (aggregations over the season's days)
     insert seasons { _id: 'season:{s}' }; nation.lastSeason = { index, champion, awards }
     laws: every row in force on d − 1 ends at d (endedBy 'season'); the projection keeps what comes in at d
     nation.season = { index: s + 1, fromDay: d, score: today's snapshot, elections: [] }
     news: `season-front`
each member's next read: the settlement credits Champion (+5, 14 days in the faction) and awards (+5) as
   legacyEntries 'champion:{s}' / 'award:{s}:{kind}'; Heat stamped before d projects as 0 from d
```

### 3.10 Time and the lazy state

| State | Stored | Read | Ends |
|---|---|---|---|
| What is worn | `equipment`, `outfits`, `lastOutfit` | `outfitOf` (computed) | a tap |
| Worn Charisma | — | `wornStats` at the tap (the flat's +2 by the day and the city) | — |
| An entry's freshness | `dossierEntries.day` | `isFresh(day, today)`: `today − day < 7` | stale from `day + 7`; nothing deleted |
| A burn | `dossierBurns[] { subjectId, until }` | `until > today` | pruned at every write |
| Informants | `dossierEntries` (status `informant`, `informant.fromDay/untilDay/reported`) | reports in the settlement | after `untilDay` (14 days) |
| Requests | `patrons[].requests[]` | `patronDays` in the settlement | paid, or expired at `arrivedDay + 4` |
| Favour | `patrons[].favour` | — | never falls |
| The weekly favour | `patrons[].favourDay` | `favourReadyOn = favourDay + 7` | — |
| Marr's discretion | `patrons.marr.discretionUntil` | `≥ today` | after 7 days |
| The flat's rent | `home.flat.paidThroughDay` | `flatCounts(day)` | the flat waits; nothing is written |
| Rested at the boundary | — | the settlement's projection through each boundary | — |
| ~~The season~~ (deferred) | ~~`nation.season`~~ | ~~`seasonOf(dayKey(now))`~~ | ~~the finale at season day 0~~ |
| ~~Heat at the rollover~~ (deferred) | `heat { value, at }` (unchanged) | slice 5's `projectHeat`; ~~`heatAt(t, now, seasonStartMs)`~~ later wraps it | — |
| Recognition | — | `recognition()` at the act (the night at the act's time) | — |
| Legacy | `legacy.total/spent/perks` + `legacyEntries` | — | permanent |

### 3.11 The read order (`loadCharacter` v8)

Unchanged in order (slice 7 §3.6): places → **the nation's day** (as slice 7; ~~the finale at season day 0~~ deferred) → run-ins, releases, events → **the settlement v8** → events credited, arrival, presence. The settlement gains, on a new day only:

- **reads**: the held count and the informants of `dossierEntries` (one indexed find, only when the character has informants or a patron at Acquaintance); ~~`seasons` newer than `legacy.seasonCredited`~~ (deferred); the confidence votes and removal bills the character survived (only when it held a Chair's or President's term in the window);
- **writes in its existing transaction**: Rested at each boundary, the Monday perk's day of pay, patrons (Requests, Favour, tiers, the piece), informant and gossip entries, Legacy entries (terms, awards, pledges, survivals; ~~seasons~~ deferred), milestones, the stored headlines.

With no new day, slice 8 adds **no read** to a request: worn Charisma, the patrons, the flat and Legacy are on the character; the Dossier's dot is `dossierLastAt > dossierSeenAt`.

### 3.12 The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | any screen | the read path (§3.11) | the settlement (Rested, Requests, Favour, informants, gossip, Legacy, milestones) (~~the season finale on its day~~: deferred) |
| 1 | Me · Wardrobe, the slot chooser, *Everything you own* | `wardrobe.get`, `.wear`, `.takeOff`, `.outfit`, `.keep` | `characters` |
| 2 | A place's sheet · a shop, *Sell something*, the back room | `city.get`, `shop.buy`, `.sell`, `.bribe` | `characters`, `requestLogs` |
| 3 | The journey screen | `travel.journey`, `wardrobe.dressOnArrival` | `characters.journey`, `journeys` |
| 4 | A society call (ticket → briefing) | `mission.start` (type `social`) | as slice 5's missions, plus `patrons` Favour, `dossierEntries` |
| 5 | Dossier (`/dossier`): Names, Case Files, Informants | `dossier.get`, `.bind`, `.turn`, `.seen` | `dossierEntries`, `characters` |
| 6 | A station's sheet · *Sell something from the Dossier* | `dossier.sell` | `dossierEntries`, `characters`, `requestLogs` |
| 7 | The exposé (`/dossier/expose`) | `expose.get`, `.choose`, `.attempt` | `characters`, `dossierEntries`, `cities`/`districts`, `influenceLedger`, `contributions`, `issues`, `legacyEntries`, `actionLogs` |
| 8 | A patron's card (Herald House, the Pier Hotel), Me · Patrons | `patron.get`, `.visit`, `.gift`, `.favour` | `characters`, `issues`, `contributions`, `legacyEntries`, `requestLogs` |
| 9 | Residence card, Me · Where you sleep | `home.get`, `.buyFlat`, `.payRent` | `characters`, `requestLogs` |
| 10 | Me · Legacy; a profile | `legacy.get`, `.takePerk`; `faction.profile` | `characters`, `requestLogs` |
| 11 | The Headline Story's call sheet | `events.call` (+ `caseFileId`) | as slice 6, plus `dossierEntries`, `characters.dossierBurns` |
| 12 | Letters: a chapter | `ambition.*` | as slice 2, plus items, `legacyEntries`, `dossierEntries`, `patrons` |
| ~~13~~ | ~~The republic sheet's season card, the Hall of Fame (`/republic/hall`)~~ **Deferred (seasons)** | ~~`nation.get`, `season.hall`~~ | — |
| 14 | Paper | `paper.today` | — (stored headlines at the settlement; live lines) |

---

## 4. Content (`packages/content`)

### 4.1 New and changed schemas

```ts
// Items (ADR 0014, 0051; design §3.2, §3.9). Rules own the kinds and bounds (ITEM_EFFECT_BOUNDS).
ItemSlot = z.enum(['clothing', 'accessory', 'document', 'utility']);
ItemWork = z.enum([...ActionType.options, ...MissionType.options, 'checkpoint', 'bluff', 'expose']);
ItemEffect = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('chancePct'), on: ItemWork, value: z.int(),          // 5–10
                   against: z.literal('police').optional() }),                           // forged papers' bluff
  z.strictObject({ kind: z.literal('fxpPct'), value: z.int() }),                          // 5
  z.strictObject({ kind: z.literal('dossierChance'), value: z.int() }),                   // 5–15
]).superRefine(itemEffectBoundProblem);
Item += {
  slot: ItemSlot.nullable(),                       // a keepsake with a slot is wearable (the pen, the case, the rosette)
  effects: z.array(ItemEffect).max(3).default([]),
  price: z.int().positive().optional(),            // absent: never bought or sold (the kit, the origin, keepsakes)
  level: z.int().min(1).optional(), rank: z.int().min(1).max(7).optional(),
  factionId: FactionId.optional(),                 // the party coats, the correspondent's suit
  members: z.literal(true).optional(),             // the badge, paste and brush: any member, at their own store
  keepsakeFrom: z.union([z.strictObject({ ambitionId: AmbitionId, chapter: z.int().min(1).max(12) }),
                         z.strictObject({ patronId: PatronId })]).optional(),   // "KEEPSAKE · FROM CHAPTER 4"
  read: StoryText.optional(),                      // the keepsake's text behind *Read* (none written yet, §22.1 Q32)
};

// Shops (ADR 0051; design §3.5). Kickers and Courier lines are copy, by kind.
ShopKind = z.enum(['clothesStall', 'partyStore', 'tailor', 'press', 'backRoom']);
Shop = z.strictObject({
  kind: ShopKind,
  items: z.array(ItemId).min(1).max(6),
  buys: z.enum(['any', 'own']).nullable(),         // §22.1 Q1: the stall 'any', the others 'own'
  bribe: z.literal(true).optional(),               // the back room's *Have a mark struck off*
});
Location += {
  shops: z.array(Shop).max(2).optional(),
  scene: AssetId.optional(),                       // a place's own scene before its kind's (the Casino, the Lido)
  patronId: PatronId.optional(),                   // Herald House: 'crane'; the Pier Hotel: 'marr'
};

// Missions (ADR 0031): the society call and the Dossier payloads (design §3.7, §4.2)
MissionType += 'social';
DossierCategory = z.enum(['political', 'criminal', 'pattern', 'asset', 'neutral']);
Mission += {
  society: z.strictObject({ needs: z.int().min(10).max(40),            // the Charisma figure = the difficulty
                            favour: z.int().min(1).max(5).optional(),   // the late table's +3 (default PATRON.call)
                            entry: z.enum(['oneInFour', 'onSuccess']).optional() }).optional(),  // required iff social
  dossier: z.strictObject({ category: DossierCategory.optional(),      // default by type (rules)
                            subject: z.union([NpcId, z.literal('choose')]).optional() }).optional(),
  requires += { patron: z.strictObject({ id: PatronId, tier: z.enum(['associate']) }).optional() },
};
//  difficulty: min 10 for `social` (it is `society.needs`); level 10 for every society call (§22.1 Q10)

// Patrons and their Requests (ADR 0055; design §5, §16.5)
PatronId = z.enum(['crane', 'marr']);
RequestMatch = OrderMatchSchema.extend({ missionTypes: z.array(MissionType).min(1).optional() });
//  kinds may now name 'dossierEntry' and 'expose'; districtId may be 'rotate' (the request's own district)
PatronRequest = z.strictObject({
  id: Id,                                          // 'req.crane.files'
  title: z.string().min(1).max(60),                // may carry {district}
  line: z.string().min(1).max(200),                // the letter; {until} {district} {issue}
  match: RequestMatch, target: z.int().min(1).max(5),
  minLevel: z.int().optional(),                    // 'req.crane.print': 16 (else the next in rotation)
});
Patron = z.strictObject({
  id: PatronId, npcId: NpcId, name: z.string(), cityId: Id, locationId: Id, portrait: AssetId,
  voice: z.string().max(90),                       // the card's italic line
  gossip: DossierCategory,                         // Crane political, Marr asset
  introduction: Id,                                // the Associate's mission id (the morgue file, the late table)
  favour: z.strictObject({ act: z.enum(['plantHeadline', 'discretion']), pc: z.int() }),   // 25, 20
  piece: ItemId,                                   // the Protégé's keepsake
  requests: z.array(PatronRequest).length(6),
});

// The Dossier's lines and names (design §16.4)
dossierLines: z.strictObject(Object.fromEntries(DossierCategory.options.map((c) =>
  [c, z.array(z.string().min(1).max(120)).length(4)])));   // {name} {party} {place} {weekday} {city}
DossierName = z.strictObject({ id: NpcId, name: z.string(), cityId: Id, districtId: Id.optional(),
                               factionId: FactionId.nullable(), drawn: z.boolean() });   // Brandauer: null, false
people.ts += extraNames: DossierName[]            // Brandauer (no portrait, so not an `Npc`)

// Chapters (design §8, §16.1–§16.2)
Chapter.requires += {
  councilTerms: z.int().min(1).max(3).optional(),          // ch 4: 1
  governorOrCouncilTerms: z.literal(3).optional(),          // ch 8: a Governor's term, or three council terms
  chairVote: z.literal(true).optional(),                    // ch 6
  caseFile: z.literal(true).optional(),                     // ch 7; Clear His Name ch 3 (not written)
  nationalVote: z.literal(true).optional(),                 // ch 10
  onList: z.literal(true).optional(),                       // ch 11
  deputyTerm: z.literal(true).optional(),                   // ch 12
};
Chapter.story.choose.choices[] += { iron: z.int().min(1).max(500).optional() };   // Settle His Debts 3: 100
Chapter.story += {
  favour: z.strictObject({ patronId: PatronId, value: z.int().min(1).max(10) }).optional(),   // ch 7: Crane +5
  dossier: z.strictObject({ subjectId: NpcId, category: DossierCategory }).optional(),       // CHN 2: Brandauer
  completes: z.literal(true).optional(),                    // ch 12: the Ambition completed (Legacy 30)
  art: z.union([z.literal('home-hq'), z.literal('faction-hq'), z.literal('faction-house'), AssetId]),
};

// Journey cards and the held taps (design §4.2)
JourneyRewards += { dossier: z.strictObject({ category: DossierCategory, city: z.literal('destination') }).optional() };
HeldAction += { dossier: z.strictObject({ chance: z.literal(25), category: DossierCategory }).optional() };

// Issues (design §4.5): an Issue's feeds may name the exposé
IssueMatch.actionTypes: ActionType | 'expose'

// Headlines and lines (design §10)
HeadlineCondition += LifeCondition;               // §11.2
// NationalLine ids += 'nl.season-week', 'nl.season-countdown', 'nl.season-front'   — deferred (seasons); the ids are reserved
Content += {
  patrons: z.array(Patron).length(2),
  dossierLines, names via GameContent, legacyWords (copy), perks (copy: names and lines),
};
```

`GameContent` gains:

- `item(id)` with effects; `shopsAt(locationId)`; `shopItem(locationId, itemId)`; `kitOf(factionId)` (the outfit and the card);
- `names()`, `namesOf(cityId)`, `name(id)` (party, town, district, `drawn`);
- `patron(id)`, `patronOf(cityId)`, `patronAt(locationId)`, `request(id)`;
- `dossierLine(category, index)`; `societyCalls()`;
- `chapterAt(ambitionId, n)` with the new requirement kinds.

### 4.2 Loader cross-checks (added)

- **Items.** Ids unique; a `clothing` item has a tier; every `effects` entry inside `ITEM_EFFECT_BOUNDS` (`chancePct` 5–10, `fxpPct` 5, `dossierChance` 5–15), **at most one `chancePct` per `on`**, `against` only on `bluff`; **no item has an Energy, Iron, Rested or opinion effect** (the kinds do not exist); `price` only on non-keepsakes; the kit's items (`factions[].kit`), the origin's coat and every keepsake have no price; `keepsakeFrom` on every keepsake a chapter or patron grants; the CHA of each slot within its band (clothing 2–50, accessory 2–10, document and utility 0).
- **Not catalogued:** no item id or art names the revolver or the truncheon (a content test greps `revolver`, `truncheon`, `weapon` in `items.ts` and `art.ts`).
- **Shops.** A `clothesStall` on a `market`, a `partyStore` on a `faction-hq` and only that faction's items (or `members` items), a `tailor` on a `hotel` or a `bar`, a `press` on a `press`, a `backRoom` (with `bribe`) on a `bar`; every item a shop sells has a price; every priced item is sold by at least one shop; design §3.5's table reproduced place by place.
- **The Front.** Its four places leave Clearwater's `laterPins` and become locations (review 4: no quarter); four places with pins equal to `mapPins.clearwater`, kinds as slice 7's table (Promenade `square`, Casino `bar`, Lido `square`, Pier Hotel `hotel`), two tier-1 actions each at difficulty 10 (design §16.3) and the four calls; the Casino carries the back room, the Pier Hotel the tailor and `patronId: 'marr'`.
- **Society calls.** Six, type `social`, Energy 15, `difficulty = society.needs` (15, 20, 10, 15, 12, 20), no `pool`, Level 10, three ways (CHA · CHA+INT · best); *The late table* at the Casino with `needs` 25, `favour` 3, `entry: 'onSuccess'`, `requires.patron: marr/associate`; *The morgue file* at Herald House: surveillance, Level 10, difficulty 20, `dossier.subject: 'choose'`, `requires.patron: crane/associate`.
- **Patrons.** Two; `locationId` a place of `cityId` carrying the same `patronId`; six Requests each (design §16.5 word for word); every Request's match parses with the extended fields and names real ids; `piece` a wearable keepsake with `keepsakeFrom.patronId`; `introduction` a mission with the matching `requires.patron`.
- **Names.** Every drawn name has a party and a town; ids unique across candidates, secretaries, deputies, figures and `extraNames`; a capital name has a district (deputies and figures: `irongate.government-quarter`); every Request's `{district}` rotation has names in each of the five districts.
- **Dossier lines.** Four per category; placeholders only from §4.3.
- **Chapters.** *Finish His Work* 4–12 (difficulties 18–26, Energy 20–30, rewards as design §8's table, the keepsakes, ch 7's `favour`, ch 12's `completes` and `acc.his-rosette`), *Clear His Name* 2 (with `dossier: npc.brandauer / political`, the Agility way's Heat 6), *Settle His Debts* 3 (choice B `iron: 100`, the Agility way's Heat 6); every keepsake has `keepsakeFrom`. The strings are review 5's (*The Names on the Stone*, *Who Sold the Homes*, *The Ration Ledger*; the dated note at the end lists them); ids are unchanged. `outfit.fathers-coat-promised` is no longer granted (review 4: every new character wears the coat), so the keepsakes list and the content check drop it.
- **Jobs** (review 5's ladder). The Market trader, when the Wardrobe places it, is Level 3 · Intelligence 10 · `dailyPay: 240`; the Level-6 rung it adds is 320. The rung test covers each.
- **Vocabulary.** Both QA guards over every new string; the slice's refused words (§12.4); *The Front* keeps its allowance.

### 4.3 Placeholders

| Where | Added | Resolved |
|---|---|---|
| Dossier lines (design §16.4) | `{name}` `{party}` `{place}` `{weekday}` `{city}` | at landing: `{place}` a location of the subject's town drawn from the entry's stream, `{weekday}` drawn; both stored in `params`, so a line always reads the same |
| Requests (design §16.5) | `{district}` `{until}` `{issue}` | the Request's stored `params` (the district by rotation; the Herald's Issue = the first live capital Issue at arrival) and its `untilDay` |
| Personal lines (design §10.1) | `{item}` `{charisma}` `{street}` `{paper}` `{subject}` `{headlineLine}` `{line1}` `{line2}` `{party}` `{city}` `{n}` `{patron}` `{request}` `{until}` `{favour}` `{tier}` `{next}` `{perkLine}` `{daysLeft}` `{restedLine}` `{entry}` `{total}` `{toSpend}` `{office}` `{coat}` | the settlement's facts |
| ~~National lines (design §10.1)~~ deferred (seasons) | `{leader}` `{margin}` `{faction}` `{FACTION}` `{n}` `{score}` `{second}` `{awards}` | `nation.news` facts (the finale and the countdown) |
| Modals (design §11) | `{item}` `{flavour}` `{effectLine}` `{price}` `{subject}` `{kinds}` `{used}` `{cap}` `{city}` `{patron}` `{giftLine}` `{a}` `{b}` `{favourTitle}` `{favourLine}` `{pc}` `{flatLine}` `{until}` `{iron}` `{n}` `{perk}` `{perkLine}` `{cost}` `{toSpend}` | the server (`PoliticalResult` texts) |

### 4.4 Data to transcribe

| File | Contents | Source |
|---|---|---|
| `data/items.ts` | nineteen items and ten keepsakes with effects, prices, gates, art; `keepsakeFrom` on the slice 2–7 keepsakes | design §3.9, §8 |
| `data/cities/*.ts` | `shops` on the twenty places of design §3.5; `patronId` on Herald House and the Pier Hotel; the Front's four places, eight actions (16 outcome texts, four blurbs), `scene` on the Casino and the Lido | design §3.5, §16.3 |
| `data/missions/*.ts` | the six society calls, *The late table*, *The morgue file*; `dossier` on the surveillance and theft missions where a named figure fits (the designer names them, §22.1 Q12) | design §3.7, §5.4 |
| `data/patrons.ts` (new) | Crane and Marr, twelve Requests | design §5, §16.5 |
| `data/dossier.ts` (new) | the twenty lines | design §16.4 |
| `data/people.ts` | `extraNames`: Konrad Brandauer | design §8 |
| `data/ambitions.ts` | *Finish His Work* 4–12; *Clear His Name* 2; *Settle His Debts* 3 | design §16.1–§16.2 |
| `data/journeyEvents.ts`, `data/held.ts` | the informer's *Feed him a story* Success: `dossier`; the cells' and ward's taps: `dossier` | design §4.2 |
| `data/headlines.ts`, `heraldHeadlines.ts`, `courierHeadlines.ts` | design §10.1's personal lines in the five voices (~~`nationalLines.ts`: the season's three national lines~~, deferred) | design §10 |
| `data/art.ts` | §13's twenty-two entries (eighteen items, four scenes) | design §19 |
| `data/copy.ts` | screens §17's strings; the ten help notes; design §11's modal texts; the Legacy entries' words; the perks' names and lines; the shops' kickers and lines | screens §17, design §7, §11, §16.7 |

Content tests parse both slice-8 design documents and compare every table and text word for word, as slices 1–7 do.

---

## 5. Data model (`packages/db`)

Two new collections, each for a reason (plan rule 6); the third, `seasons`, is deferred with the season:

| Collection | Why its own | Growth |
|---|---|---|
| `dossierEntries` | Entries, Case Files and informants grow with play, are read on the Dossier tab and by a few acts, and keep their history for the spymaster and the report. The character holds no copy | ~1 a day per active player; ≤ 62 held at once |
| `legacyEntries` | The public record grows for ever (terms every five days, titles; seasons later); read on the Me tab and the profile; the natural `ref` is the idempotency key | ~30 a season per active player |
| ~~`seasons`~~ (deferred) | The Hall of Fame: one document per finished season | 1 every 84 days |

### 5.1 `dossierEntries` — new (ADR 0053)

```ts
{
  _id: ObjectId,
  characterId: ObjectId,
  kind: 'entry' | 'file',
  subjectId: string,                   // a name's id (`npc.c.baum`)
  subjectFactionId: FactionId | null,  // frozen at landing (Brandauer: null)
  cityId: string, districtId: string | null,
  // an entry
  category?: DossierCategory, lineId?: string /* 'political.2' */, params?: { placeId?: string; weekday?: number },
  day: DayKey,                         // landing (entry) or binding (file)
  source: 'intelligence' | 'surveillance' | 'theft' | 'informer' | 'cells' | 'ward' | 'society' | 'gossip'
        | 'informant' | 'chapter' | 'morgue' | 'test',
  // a file
  lines?: Array<{ category, lineId, params, day, source }>,   // the bound entries' lines, in order
  kinds?: DossierCategory[], weight?: number,                  // the weight at binding (fresh 1, stale ½)
  fileId?: ObjectId,                                           // a bound entry's file
  status: 'held' | 'bound' | 'attached' | 'informant' | 'spent' | 'sold',
  informant?: { fromDay: DayKey; untilDay: DayKey; reported: number; cityId: string } | null,
  used?: { how: 'expose' | 'sold' | 'informant' | 'headlineStory'; day: DayKey; ref: string | null } | null,
  attachedTo?: ObjectId | null,        // the Headline Story's event
  createdAt, updatedAt
}
```

Indexes:

- `{ characterId: 1, status: 1, subjectId: 1, day: -1 }`: the tab (held by name), the slot count (`status: 'held'`), binding, the informants;
- ~~`{ kind: 1, 'used.day': 1 }` partial `{ kind: 'file', used: { $type: 'object' } }`: the spymaster's count at the finale~~ (deferred with the season; `used.day` is still written on every use, so the index is an `ensureIndexes` addition later);
- `{ characterId: 1, kind: 1, status: 1, day: 1 }` partial `{ kind: 'entry', status: 'held' }`: *n go stale tomorrow*.

### 5.2 `legacyEntries` — new (ADR 0057)

```ts
{
  _id: ObjectId,
  characterId: ObjectId,
  ref: string,                         // 'term:{termId}' · 'award:{awardId}' · 'pledge:{termId}:{lawId}'
                                       // 'survived:{electionId|billId}' · 'expose:{logId}' · 'protege:{patronId}'
                                       // 'ambition:{ambitionId}' · reserved for the deferred season, not written in slice 8:
                                       // 'champion:{season}' · 'award:{season}:{kind}:{bracket}'
                                       // 'backfill:…' (migration 012)
  kind: 'hero' | 'councilTerm' | 'issueTopFive' | 'pledge' | 'governorTerm' | 'deputyTerm' | 'chairTerm'
      | 'presidentTerm' | 'survived' | 'ambition' | 'expose' | 'protege',   // + 'champion' | 'seasonAward' with the season
  points: number,
  day: DayKey,
  params: { cityId?, districtId?, office?, patronId?, ambitionId?, lawId? },   // + season, award, bracket with the season
  createdAt
}
```

Indexes: `{ characterId: 1, ref: 1 }` **unique**; `{ characterId: 1, day: -1 }` (the Me tab, the profile).

### 5.3 `seasons` — new (ADR 0058) — **deferred (seasons, 16 Oct 2026)**

Not created in slice 8; kept as the design to pick up.

```ts
{
  _id: string,                         // 'season:3'
  index: number, number: number,       // the absolute index; the number the player reads (from the bootstrap season)
  fromDay: DayKey, toDay: DayKey,      // toDay exclusive (the finale's day)
  partial: boolean,                    // the bootstrap season
  scores: Record<FactionId, { control: number /* thousandths */, elections: number, total: number }>,
  champion: FactionId | null, drawn: boolean,
  presidents: Array<{ termIndex: number; name: string; factionId: FactionId; figure: boolean }>,
  awards: Array<{ kind: 'ledger' | 'titles' | 'orator' | 'spymaster'; bracket: 1 | 2 | 3 | null;
                  characterId: ObjectId; name: string; factionId: FactionId; value: number }>,
  createdAt
}
```

Index: `{ index: -1 }`.

### 5.4 `nation` — changed (ADR 0043, 0058) — **deferred (seasons, 16 Oct 2026)**

No `nation` change in slice 8: the document stays as slice 7 built it. Later, `season` arrives with a default computed at its first boundary (no migration).

```ts
nation += {
  season: { index: number, first: number /* the bootstrap season */, fromDay: DayKey,
            control: Record<FactionId, number> /* Σ control share in thousandths, this season */,
            elections: Array<{ termIndex: number; factionId: FactionId }> },
  lastSeason: { index: number, number: number, champion: FactionId | null,
                awards: Array<{ kind; bracket; characterId: ObjectId; name: string }> } | null,
}
```

Written only by the nation's day (the running score at every boundary, the finale at season day 0).

### 5.5 Changed collections

- **Deferred (seasons):** ~~**`contributions`**: scope `season|{s}` (kind `season`, one row per character per season; `amount` the actor's opinion legs in thousandths, as the place scopes; `bracket` and `lastAt`), upserted by `addInfluence` beside ADR 0042's four. Index: the existing `{ scope: 1, bracket: 1, amount: -1, lastAt: 1 }` serves the award.~~ No `contributions` change in slice 8.
- **`campaignEvents`**: `caseFile: { fileId: ObjectId, subjectId: string, name: string } | null` (the Headline Story, set at the call).
- **`journeys`**: `dress: 'plain' | null`.
- **`actionLogs`**: `kind` += `'expose'`; a mission log of type `social`; the Dossier knock-on in `result`.
- **`influenceLedger`**: `kind` += `'expose'` (~~`'season'`~~, the rollover's system source: deferred).
- **`cities`**, **`districts`**: no new fields and no new writer (~~the rollover~~ deferred, with drift row A9); Clearwater's Front is content.
- **`requestLogs`**: `REQUEST_KINDS` += §18's.
- ~~**`laws`**: `endedBy` += `'season'`.~~ Deferred (seasons): no `laws` change.

### 5.6 `characters` — changed embedded fields

```ts
{
  ...slice 7,
  equipment: { clothing: string, accessory: string | null, document: string | null, utility: string | null },
  // §24.4: bodyguard { tier, name, paidThroughDay } | null · buffs { wellFed, spirits } · today.rounds
  outfits: { town: Equipment, plain: Equipment, evening: Equipment | null },
  lastOutfit: 'town' | 'plain' | 'evening',
  inventory[].source += 'shop' | 'patron',
  patrons: Array<{
    id: 'crane' | 'marr',
    favour: number,                                 // 0–100, never falls
    firstVisitDay: DayKey | null,
    requests: Array<{ id: string; arrivedDay: DayKey; untilDay: DayKey; target: number; progress: number;
                      doneAt: Date | null; params: { districtId?: string; issueId?: string } }>,   // ≤ 2
    next: number,                                   // the rotation pointer
    tierDays: { acquaintance?: DayKey; associate?: DayKey; confidant?: DayKey; protege?: DayKey },
    favourDay: DayKey | null,                       // the weekly favour last called
    discretionUntil: DayKey | null,                 // Marr's: the bribe at half price through this day
    thanks: Array<{ requestId: string; day: DayKey }>,   // the last boundary's paid Requests (the paper), ≤ 4
  }>,
  home: { flat: { cityId: string; boughtDay: DayKey; paidThroughDay: DayKey } | null },
  legacy: { total: number, spent: number,
            perks: { party: 0 | 1; dossier: 0 | 1 | 2; sleep: 0 | 1; walk: 0 | 1; name: 0 | 1 | 2 | 3;
                     monday: 0 | 1; friends: 0 | 1; quiet: 0 | 1 } },
            // seasonCredited: deferred with the season (absent reads as nothing credited yet)
  milestones: { caseFileAt: Date | null, chairVoteAt: Date | null, nationalVoteAt: Date | null,
                listAt: Date | null, deputyFromDay: DayKey | null,
                completed: { council: number; governor: number; chair: number; deputy: number; president: number } },
  expose: { fileId: ObjectId; angle: 'plain' | 'headline'; locationId: string; day: DayKey } | null,
  dossierBurns: Array<{ subjectId: string; until: DayKey }>,       // pruned at every write
  dossierLastAt: Date | null,                       // the tab's dot (an entry landed since …)
  dossierSeenAt: Date | null,                       // unversioned (ADR 0040's pattern): the tab opened
  today += { calls: string[] /* society calls, by place */, gifts: Array<'crane' | 'marr'>,
             expose: boolean, bribe: boolean },
  journey.dress?: 'plain' | null,
  firsts += { coat?: Date, recognised?: Date },
  presence.recognised?: boolean,                    // unversioned (ADR 0040): counted by the home faction
}
```

No new index on `characters`. The count's read of the candidates' `patrons.favour` and `legacy.perks.name` is by `_id`.

### 5.7 Migration `012-slice8-life.ts`

`ensureIndexes()` runs it after 011 (renumbered 14 Oct 2026). Idempotent: each step filters on the field's absence.

1. Characters without `outfits`: `equipment.accessory/utility: null`; `outfits.town` = the worn set; `outfits.plain` = `{ clothing: the kit outfit's uid, document: the party card's uid, accessory: null, utility: null }` (the kit's instances already in the inventory, ADR 0014); `outfits.evening: null`; `lastOutfit: 'town'`; `patrons: []`; `home: { flat: null }`; `legacy: { total: 0, spent: 0, perks: all 0 }`; `milestones` (below); `expose: null`; `dossierBurns: []`; `dossierLastAt: null`; `today.calls: []`, `gifts: []`, `expose: false`, `bribe: false`.
2. **Milestones from history**: `chairVoteAt` and `nationalVoteAt` from `votes` (the first of each key space), `listAt` from `candidacies` (`kind: 'list'`), `completed` from `officeTerms` (`completed: true`, by office), `deputyFromDay` from the first `deputy` term.
3. **The Legacy backfill** (§22.1 Q41): for each character, `legacyEntries` from completed `officeTerms` (council 3, governor 5, chair 10, deputy 5, president 40; `ref: term:{id}`) and from `awards` (hero 2, Issue top five 2; `ref: award:{id}`), with their days; `legacy.total` = the sum. Unique refs make a second run a no-op.
4. **Deferred (seasons): 012 does not touch `nation`.** ~~`nation`: `season` from the current day (`first` = `index` when the season has not been counted, the running control from `controlLog` within the season), `lastSeason: null`.~~

A test runs 012 twice (no change the second time) and checks a backfilled total against the ledger of a seeded history.

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants

```ts
export const ITEM_EFFECT_BOUNDS = { chancePct: [5, 10], fxpPct: [5, 5], dossierChance: [5, 15] } as const;
export const SLOT_CHA = { clothing: [2, 50], accessory: [2, 10], document: [0, 0], utility: [0, 0] } as const;
export const SHOP = { confirmOver: 1_000, sellShare: 0.1,
                      surchargePct: { clean: 0, onFile: 0, repeat: 15, notorious: 30 } } as const;      // design §3.5
export const BRIBE = { rank: 3, perMark: { onFile: 500, repeat: 1_000, notorious: 2_000 }, discretionShare: 0.5 } as const;
export const PLAIN_CLOTHES = { under: 10 } as const;
export const RECOGNITION = { cha: [[30, 10], [20, 5]], office: { council: 5, governor: 10, chair: 10, deputy: 15,
                             president: 15 }, legacyPer: 10, legacyMax: 5, nightFactor: 2 } as const;   // design §3.6
export const SOCIETY = { energy: 15, doorBelow: 10, entryOneIn: 4, favour: { success: 2, partial: 1 }, level: 10 } as const;
export const DOSSIER = {
  capacity: [[51, 60], [36, 40], [21, 25], [11, 15], [1, 10]],                 // INT → slots (GDD §10.1)
  freshDays: 7, staleWeight: 0.5, fileWeight: 3, caseFileLevel: 16, burnDays: 14, maxInformants: 2,
  informant: { days: 14, every: 2 },
  chance: { intelligence: 10, cells: 25, ward: 25, society: 25 },              // percent; surveillance and theft by outcome
  rivalShare: 2 / 3,
  sell: { file: 200, fresh: 50, stale: 25 },
  categoryByKind: { press: 'political', 'faction-hq': 'political', parliament: 'political', ministry: 'political',
                    jail: 'criminal', court: 'criminal', station: 'pattern', bar: 'pattern', street: 'pattern',
                    docks: 'pattern', hotel: 'asset', market: 'asset', theatre: 'asset' },   // else neutral
} as const;
export const EXPOSE = {
  energy: 20, difficulty: [[5, 14], [4, 16], [3, 18]], headline: 1, battleground: 2,
  swing: { success: 1.0, partial: 0.5 },
  rewards: { success: { xp: 150, fxp: 40, iron: 100 }, partial: { xp: 75, fxp: 20, iron: 50 }, failure: { xp: 30, fxp: 0, iron: 0 } },
  pc: 5, legacy: 2,
} as const;
export const PATRON = {
  tiers: [['acquaintance', 10], ['associate', 30], ['confidant', 60], ['protege', 90]], max: 100, level: 10,
  request: { favour: 6, everyDays: 2, held: 2, openDays: 4 },
  gift: { iron: 200, favour: 2 }, chapter: 5, perkFactor: 1.1,
  favourEveryDays: 7, discretionDays: 7, plantMomentum: 50,
  endorsement: { homeTotal: 2, battlegroundScore: 1 },
} as const;
export const FLAT = { level: 10, price: 2_500, week: 150, weeks: [1, 4], cap: 50, rest: 25, cha: 2 } as const;
export const ROOM_REST = 10;                                                  // the rented room, every boundary
export const LEGACY = {
  points: { hero: 2, councilTerm: 3, issueTopFive: 2, pledge: 10, governorTerm: 5, deputyTerm: 5, chairTerm: 10,
            presidentTerm: 40, survived: 10, ambition: 30, expose: 2, protege: 5 },   // + champion 5, seasonAward 5 with the season
  perks: { party: { cost: 15, max: 1 }, dossier: { cost: 5, max: 2 }, sleep: { cost: 10, max: 1 },
           walk: { cost: 15, max: 1 }, name: { cost: 10, max: 3 }, monday: { cost: 10, max: 1 },
           friends: { cost: 10, max: 1 }, quiet: { cost: 10, max: 1 } },
  effects: { fxpPct: 5, restedCap: 50, canvassEnergy: -1, heatCoolPct: 10, favourFactor: 1.1 },
} as const;
// Deferred (seasons, 16 Oct 2026): SEASON = { days: 84, terms: 3, electionBonus: 100, weekNotice: 77, championTenureDays: 14,
//                                            brackets: [[1, 15], [16, 30], [31, Infinity]] }
MISSION_TYPES.social = { energy: 15, heat: 0, runIn: 0, caught: null, marks: 0, markKind: null, givesFxp: false,
                         opinion: 'persuade', opinionMult: 1, ironMult: 1, seenAs: 'social', illegal: false };
```

`RESTED.cap` stays 200. `ROOM` (slice 4's room in Irongate) is unchanged; its +50 and the flat's +50 never stack.

### 6.2 `items.ts` v2 (ADR 0014, 0051)

```ts
export type ItemSlot = 'clothing' | 'accessory' | 'document' | 'utility';
export interface Equipment { clothing: string; accessory: string | null; document: string | null; utility: string | null }
export type ItemEffect = { kind: 'chancePct'; on: ItemWork; value: number; against?: 'police' }
                       | { kind: 'fxpPct'; value: number } | { kind: 'dossierChance'; value: number };
export interface ItemSpec { id; slot: ItemSlot | null; tier: number | null; cha: number; keepsake: boolean;
                            effects: readonly ItemEffect[]; price?: number; level?; rank?; factionId?; members?: boolean }
export const itemEffectBoundProblem = (e: ItemEffect) => string | null;
export function equippedItems(inv, eq: Equipment, spec): ItemSpec[];       // four slots, in slot order
export function wornCha(chaBase: number, equipped: readonly ItemSpec[], flatBonus = 0): number;
export const coatTier = (equipped: readonly ItemSpec[]) => number | null;  // the clothing's tier, for armourOf
export const isPlainClothes = (cha: number) => cha < PLAIN_CLOTHES.under;
export type OutfitId = 'town' | 'plain' | 'evening';
export const sameSet = (a: Equipment, b: Equipment) => boolean;
export function outfitOf(eq: Equipment, outfits: { town; plain; evening: Equipment | null }): OutfitId | null;
//  the first saved outfit equal to what is worn, in the order town, plain, evening (screens §2: one chip inverted)
export function wearGate(i: { held: boolean; onTrain: boolean; owned: boolean; slot: ItemSlot | null;
  outfit?: OutfitId; flatCounts: boolean }): null | { reason: 'CHANGE_LOCKED' | 'NOT_OWNED' | 'NOT_WEARABLE'
  | 'OUTFIT_LOCKED' | 'COAT_REQUIRED'; where?: 'held' | 'train' };
export function defaultOutfits(inv, worn: Equipment, kit: { outfit: string; card: string }): { town; plain; evening: null };
export function withoutUid(outfits, uid: string, kitOutfitUid: string): typeof outfits;   // a sold item leaves its outfits
export function grantItem(…);                                              // unchanged; keepsakes once
```

### 6.3 `personal.ts`: the item and perk effects (ADR 0052)

```ts
export interface PersonalModifiers { worn: readonly ItemSpec[]; perks: LegacyPerks; names: (id: string) => string }
export function itemBonuses(p: PersonalModifiers, work: { tier1Type?: string; missionType?: string;
  special?: 'checkpoint' | 'bluff' | 'expose' }, against?: 'police' | string): CheckBonus[];
//  one row per worn item whose chancePct names the act's OWN type (a mission's type, never its seenAs):
//  { id: 'item:{itemId}', label: name, value }  → the ticket's tag *{Item} · better odds*
export function personalFxpShares(p: PersonalModifiers, kind: 'action' | 'mission'): BonusShare[];
//  the party coat and the badge (+5 each), the perk *A fifth more from the party* (+5): each its own part on the base
export const dossierChanceOf = (p: PersonalModifiers) => number;          // Σ dossierChance of what is worn
export interface LegacyPerks { party; dossier; sleep; walk; name; monday; friends; quiet }
export const perkRestedCap = (p: LegacyPerks) => 50 × p.sleep;
export const perkCanvassEnergy = (p: LegacyPerks, type: string) => type === 'canvass' ? −p.walk : 0;   // never below 1
export const perkHeatCoolPct = (p: LegacyPerks) => 10 × p.quiet;           // into coolRate's pcts
export const perkFavour = (p: LegacyPerks, gain: number) => p.friends ? Math.ceil(gain × 1.1) : gain;
export const perkDossierSlots = (p: LegacyPerks) => p.dossier;
export const perkHomeVotes = (p: LegacyPerks) => p.name;                  // +1 a level to the home count's total
export const perkMondayPay = (p: LegacyPerks) => p.monday === 1;
```

Personal shares and rows apply to **tier-1 actions and missions** (society calls included); not to chapters, event roles or the exposé's fixed rewards (§22.1 Q50). The exposé's check takes `itemBonuses(…, { special: 'expose' })`.

### 6.4 `recognition.ts` (ADR 0052)

```ts
export type HeldOffice = 'none' | 'council' | 'governor' | 'chair' | 'deputy' | 'president';
export const highestOffice = (offices: ReadonlyArray<{ office: Office }>) => HeldOffice;    // the projection: current only
export interface Recognition { total: number; cha: number; office: number; legacy: number; night: boolean; plain: boolean }
export function recognition(i: { wornCha: number; night: boolean; office: HeldOffice; legacy: number }): Recognition;
//  night = nightAt(now).night at the act (review 5, ADR 0079: the last two hours of each six-hour day)
//  cha = wornCha ≥ 30 ? 10 : wornCha ≥ 20 ? 5 : 0 · office = 5 / 10 / 10 / 15 / 15
//  plain (wornCha < 10): cha = 0, office = floor(office / 2)
//  total = (cha + office) × (night ? 2 : 1) + min(5, floor(legacy / 10))      (§22.1 Q14)
//  a Governor (10) in a greatcoat (22: 5) at night: 30; a new player in work clothes: 0
```

`runInChance` (slice 5) gains `recognition: number`, added on rival ground before the 0–90 clamp (tier-1 taps and missions). `presence.recognised = recognition(at the touch).total > 0`.

### 6.5 `shop.ts`

```ts
export const shopPrice = (price: number, record: RecordLevel) => roundHalfUp(price × (1 + SHOP.surchargePct[record] / 100));
export const sellPrice = (price: number) => roundHalfUp(price × SHOP.sellShare);     // 200 → 20, 800 → 80
export function buyGate(i: { item: ItemSpec; level; rank; factionId; owned: boolean; iron: number; price: number;
  inOwnHq: boolean }): null | { reason: 'LEVEL' | 'RANK' | 'MEMBERS_ONLY' | 'ALREADY_OWNED' | 'NOT_ENOUGH_IRON'; need?: number };
export function sellGate(i: { item: ItemSpec; entry: InventoryEntry; worn: boolean; inStory: boolean;
  buys: 'any' | 'own' | null; soldHere: boolean }): null | { reason: 'NOT_SOLD_HERE' | 'NOT_SELLABLE'; why?: 'keepsake'
  | 'kit' | 'worn' | 'noPrice' };
export const bribePrice = (level: RecordLevel, discretion: boolean) => BRIBE.perMark[level] × (discretion ? 0.5 : 1);
export function bribeGate(i: { rank; level: RecordLevel; marks: number; today: boolean; iron; price }): null | { reason };
```

### 6.6 `dossier.ts` (ADR 0053, 0054)

```ts
export type DossierCategory = 'political' | 'criminal' | 'pattern' | 'asset' | 'neutral';
export const dossierCapacity = (int: number, perkSlots: number) => number;  // 10 / 15 / 25 / 40 / 60 + perks
export const isFresh = (day: DayKey, today: DayKey) => today − day < DOSSIER.freshDays;
export const staleOn = (day: DayKey) => day + DOSSIER.freshDays;           // *goes stale on Thursday*
export const entryWeight = (day, today) => isFresh(day, today) ? 1 : 0.5;
export const nameWeight = (entries: ReadonlyArray<{ day }>, today) => number;
export const categoryOfKind = (locationKind: string) => DossierCategory;
export function pickName(i: { names: readonly DossierName[]; cityId: string; actor: FactionId;
  party?: FactionId; rng: Rng }): DossierName | null;
//  `party` given: a name of that party in the city; else a rival's 2 times in 3, the actor's own party's otherwise;
//  only `drawn` names; none in the city → null (nothing lands)
export function rollEntry(i: { chance: number /* percent; 100 = certain */; category: DossierCategory;
  subject: DossierName | null; cityPlaces: readonly string[]; rng: Rng }):
  { lands: boolean; roll: number; chance: number; entry?: { subjectId; category; lineIndex: 0 | 1 | 2 | 3;
    params: { placeId; weekday } } };
export function bindGate(i: { level: number; entries: ReadonlyArray<{ day }>; fileHeld: boolean; today }):
  null | { reason: 'CASE_FILES_LEVEL' | 'NOT_ENOUGH_ENTRIES' | 'FILE_HELD'; weight?: number };
export function bindFile(entries, today): { lines; kinds: DossierCategory[]; weight: number };   // all held entries on the name
export const sellValue = (row: { kind; day }, today) => number;           // 200 · 50 · 25
export function turnGate(i: { kinds; subjectCityId; patronTierInCity: Tier | null; informants: number }):
  null | { reason: 'NEEDS_PATTERN' | 'NEEDS_ASSOCIATE' | 'INFORMANTS_FULL' | 'NO_PATRON_HERE'; patronId? };
export function informantReports(i: { fromDay; untilDay; reported: number }, settled: DayKey, today: DayKey):
  Array<{ day: DayKey; n: number; category: 'pattern' | 'political' }>;   // boundaries fromDay + 2k in (settled, today]
// The exposé
export const printable = (file: { kinds }) => file.kinds.includes('political') || file.kinds.includes('criminal');
export function exposeGate(i: { atPress: boolean; file: { status; kinds; subjectFactionId } | null; actor: FactionId;
  burned: boolean; printedToday: boolean; energy: number }): null | { reason: 'NOT_A_PRESS' | 'NO_PRINTABLE_FILE'
  | 'OWN_PARTY' | 'NO_PARTY' | 'BURNED' | 'PRINTED_TODAY' | 'NOT_ENOUGH_ENERGY' };
export const exposeDifficulty = (weight: number, angle: 'plain' | 'headline', role: CityRole) =>
  (weight ≥ 5 ? 14 : weight ≥ 4 ? 16 : 18) + (angle === 'headline' ? 1 : 0) + (role === 'battleground' ? 2 : 0);
export function exposeSwing(i: { outcome: Outcome; angle; factors: SwingFactor[] /* Issue tag, the twist */ }):
  { amount: number; mode: 'toNeutral' | 'against' };                     // −1.0 / −0.5 × Π factors; 0 on a Failure
export const exposeRewards = (o: Outcome, restedUsed: number) => Rewards; // EXPOSE.rewards with Rested on XP and Iron
```

`opinion.ts` gains `applyToNeutral(shares, target, amount, floors)`: the target party's loss goes wholly to Neutral (a home city's home share never below 50); `applyAgainst` (ADR 0034) is the headline's split.

### 6.7 `patrons.ts` (ADR 0055)

```ts
export type PatronTier = 'acquaintance' | 'associate' | 'confidant' | 'protege';
export const tierOf = (favour: number) => PatronTier | null;
export const nextTier = (favour: number) => { tier: PatronTier; at: number } | null;
export function addFavour(favour: number, gain: number, perks: LegacyPerks): { favour: number; gained: number;
  crossed: PatronTier[] };                                                 // cap 100, ×1.1 rounded up with the perk
export interface StoredPatronState { favour; firstVisitDay; requests; next; tierDays; favourDay; discretionUntil }
export function patronDays(i: { state: StoredPatronState; rotation: readonly RequestSpec[]; level: number;
  settled: DayKey; today: DayKey; perks: LegacyPerks; districts: readonly string[]; liveIssue: (day) => string | null }):
  { state: StoredPatronState; paid: Array<{ requestId; day; favour: number }>; expired: string[];
    arrived: Array<{ requestId; day }>; crossed: Array<{ tier: PatronTier; day }>; gossipDays: DayKey[] };
//  for each boundary b in (settled, today], in order: (1) pay the Requests done before b (+6 each, crossing tiers);
//  (2) drop those with untilDay < b; (3) b = firstVisitDay + 2k and fewer than two open → the next in rotation
//  (skipping a minLevel above the Level), untilDay = b + 3, params (the district by k mod 5, the Issue);
//  (4) b a Monday and favour ≥ 10 → a gossip day
export function requestMatches(m: RequestMatch, a: ActionDescriptor, params): boolean;   // orderMatches without the
//  rival-ground exclusion, with `missionTypes`, `districtId: 'rotate'` = params.districtId, and the new kinds
export function advanceRequests(state, rotation, a: ActionDescriptor, outcome: Outcome, now): { state; advanced: string[];
  done: string[] };                                                         // counts successes or attempts as the order's
export const favourReady = (favourDay: DayKey | null, today: DayKey) => favourDay === null || today ≥ favourDay + 7;
export function favourGate(i: { tier: PatronTier | null; ready: boolean; pc: number; cost: number }): null | { reason };
export const protege = (patrons: ReadonlyArray<{ favour: number }>) => patrons.some((p) => p.favour ≥ 90);
```

### 6.8 `home.ts` (ADR 0056)

```ts
export interface Flat { cityId: string; boughtDay: DayKey; paidThroughDay: DayKey }
export const flatPaidOn = (f: Flat | null, day: DayKey) => !!f && day ≤ f.paidThroughDay;
export const flatCounts = (f: Flat | null, residenceCityId: string, day: DayKey) =>
  flatPaidOn(f, day) && f!.cityId === residenceCityId;                   // §22.1 Q6
export const flatCha = (f, residenceCityId, standingIn: string, day) => flatCounts(f, residenceCityId, day) &&
  standingIn === f!.cityId ? FLAT.cha : 0;
export const restAtBoundary = (f, residenceCityId, boundaryDay: DayKey) =>
  flatCounts(f, residenceCityId, boundaryDay − 1) ? FLAT.rest : ROOM_REST;
export const flatState = (f, today) => 'paid' | 'due' /* paidThroughDay === today */ | 'waiting';
export const payRent = (f: Flat, today: DayKey, weeks: 1 | 4) => ({ ...f, paidThroughDay: Math.max(f.paidThroughDay, today − 1) + 7 × weeks });
export function buyFlatGate(i: { level; inResidenceCity: boolean; flat: Flat | null; iron }): null | { reason:
  'FLAT_LEVEL' | 'NOT_IN_RESIDENCE_CITY' | 'FLAT_OWNED' | 'NOT_ENOUGH_IRON' };
```

`restedCapFor(m, room)` (ADR 0030 §5) becomes `restedCapFor(m, { room: boolean; flat: boolean; perkSleep: number })` = 200 + the residence's deltas + **max(room ? 50 : 0, flat ? 50 : 0)** + 50 × perkSleep. `capOn(day)` on the server passes `flatCounts(…, day)`. `projectEnergyThrough(state, now, max, capOn, restOn?)` adds `restOn(b)` to Rested at each boundary *b* crossed, capped at that day's cap (so the settlement's projection banks it exactly once).

### 6.9 `legacy.ts` (ADR 0057)

```ts
export type LegacyKind = keyof typeof LEGACY.points;
export type PerkId = keyof typeof LEGACY.perks;
export const toSpend = (l: { total; spent }) => l.total − l.spent;
export function perkGate(l: { total; spent; perks }, id: PerkId): null | { reason: 'PERK_MAX' | 'NOT_ENOUGH_LEGACY'; need? };
export function legacyFromWindow(i: {
  settled: DayKey; today: DayKey;
  terms: ReadonlyArray<{ id; office: Office; toDay: DayKey; completed: boolean; cityId: string | null;
                         pledges?: Array<{ lawId; keptDay: DayKey | null }> }>;
  awards: ReadonlyArray<{ id; kind: 'hero' | 'issue' | 'unrest'; ref?: string; day }>;   // credited by this settlement (ADR 0028)
  //  review 5: the Unrest prize's award (`ref: 'unrest|{cityId}|{entry}'`) gives Legacy +2 under the same natural ref
  //  (ADR 0057), credited in the settlement that credits the award (GDD §14.11; the entry's words are the designer's)
  survived: ReadonlyArray<{ ref: string; day }>;
}): Array<{ ref; kind: LegacyKind; points; day; params }>;
//  a term whose toDay is a boundary in the window and completed → its office's row; a pledge kept in the window;
//  each award; each survival. Refs make a replay a no-op
// Deferred (seasons, 16 Oct 2026):
// export function seasonCredits(i: { seasons: ReadonlyArray<{ index; number; champion; awards; toDay }>;
//   characterId: string; factionId: FactionId; joinedDay: DayKey }): Array<{ ref; kind: 'champion' | 'seasonAward'; … }>;
//  Champion: the faction and joinedDay ≤ toDay − 14; each award naming the character
export const milestonesAfter = (m: Milestones, window: { completedTerms; deputyFromDay }) => Milestones;
```

### 6.10 `season.ts` (ADR 0058) — **deferred (seasons, 16 Oct 2026)**

Not written in slice 8; kept as the design to pick up. Nothing else in `packages/rules` may import it. `heatAt` goes with it: Heat stays slice 5's `projectHeat`.

```ts
export interface SeasonDay { index: number; seasonDay: number; fromDay: DayKey; toDay: DayKey }
export const seasonOf = (day: DayKey): SeasonDay;                        // floor((day − TERM.epochDay) / 84), mod 84
export const isSeasonStart = (day: DayKey) => seasonOf(day).seasonDay === 0;
export const seasonNumber = (index: number, first: number) => index − first + 1;
export const electionFrom = (day: DayKey) => DayKey;                      // the third term's vote (season day 79)
export function seasonReset(shares: OpinionShares, baseline: OpinionShares, floor: { factionId; min } | null): OpinionShares;
//  every share halfway to its baseline (the four sum to 100 still), then the home floor
export const addControl = (acc: Record<FactionId, number>, controlShare: Record<FactionId, number>) => …;   // thousandths
export function seasonScores(i: { control: Record<FactionId, number>; elections: ReadonlyArray<{ factionId }> }):
  Record<FactionId, { control: number; elections: number; total: number }>;    // control ÷ 1000 + 100 × wins
export function champion(scores, tie: { elections; lastControl: Record<FactionId, number>; drawOrder: FactionId[] }):
  { factionId: FactionId; drawn: boolean };                               // §22.1 Q43
export function awardWinner<T extends { characterId: string; value: number; reachedAt: number }>(rows: T[]): T | null;
//  the highest value > 0; ties to the earlier `reachedAt`
export const bracketOf = (level: number) => 1 | 2 | 3;
export const heatAt = (t: HeatTimer, now: number, seasonStartMs: number, rateOn) => HeatTimer;
//  a timer stamped before the season's start is { value: 0, at: seasonStartMs } and projects from there
```

### 6.11 Changed functions

| Function | Change |
|---|---|
| `wornStats` (server) | four slots; `+ flatCha(...)`; the one source of Charisma for checks, run-ins and views |
| `yourPower(str, tier)`, damage on a win | the worn coat's tier (`coatTier`); damage `max(0, power × 0.8 ± 20 % − armourOf(tier))` |
| `runInChance` | `+ recognition` on rival ground |
| `runInChances` | `talkPct` from `itemBonuses(…, { special: 'bluff' }, opponent side)`: Marr's case always, forged papers against the police |
| `computeCheck` callers | `bonuses += itemBonuses(...)` for tier-1 actions, missions, the hostile cards (`checkpoint`), the exposé (`expose`) |
| `computeRewards`, `tier2Rewards` | `personalFxpShares` as parts on the Party XP base |
| `actionEnergy` | `+ perkCanvassEnergy` (never below 1; rewards stay on the content Energy) |
| `coolRate` | the perk's `heatCoolPct` for this character's Heat; re-based at the tap |
| ~~`projectHeat` callers~~ | ~~through `heatAt` (the season's start)~~ **deferred (seasons)**: unchanged |
| `restedCapFor`, `capOn`, `projectEnergyThrough`, `settleDays` | the flat, the perk, Rested at each boundary; `settleDays` adds a day's pay at a Monday boundary with the perk (`perkMondayPay`, within the 14 paid days) |
| `countSeats` (was `countElection`; voting rework, ADR 0084) — **kept** | `CountLine.bonus` (Protégé +2, *A name they know* +1 a level) in the total (ward vote + 3 × backers + bonus); the tie order unchanged |
| `districtScores` / `countBattleground` — **kept** | `scoreBonus: Partial<Record<FactionId, number>>` (+1 for a party with a Protégé standing) added to the score before D'Hondt |
| ~~`drawIssues` callers~~ | ~~`lastWeek: []` on a season's first Monday (the deck reshuffled)~~ **deferred (seasons)**: unchanged |
| `feedMatches` | an `expose` descriptor matches feeds whose `actionTypes` include `expose` (the name's town and district) |
| `orderMatches` | unchanged (Requests use `requestMatches`); `ACTION_KINDS` += `dossierEntry`, `expose` |
| `chapterStatus` | the new requirement kinds, read from `milestones` and the Level/Rank; a choice's `iron` |
| `selectHeadlines` | §11.2's conditions |
| `missionGate` | `social`: `NOT_DRESSED { door }` below `needs − 10`, `CALLED_TODAY`; `requires.patron` → `NEEDS_ASSOCIATE` |

`computeCheck` itself is unchanged: an item is a named bonus row (the §8.4 *right item*), as an ordinance's `chancePct` is.

### 6.12 Types: views, results, errors

All in `types.ts` (§8.3, §10). `GameErrorReason` gains:

- the Wardrobe: `CHANGE_LOCKED { where }`, `NOT_OWNED`, `NOT_WEARABLE`, `OUTFIT_LOCKED`, `COAT_REQUIRED`;
- shops: `NO_SHOP`, `NOT_SOLD_HERE`, `ALREADY_OWNED`, `NOT_SELLABLE { why }`, `BRIBED_TODAY`, `RANK`, `LEVEL`;
- the Dossier: `CASE_FILES_LEVEL`, `NOT_ENOUGH_ENTRIES { weight }`, `FILE_HELD`, `FILE_NOT_FOUND`, `NOT_A_STATION`, `NEEDS_PATTERN`, `NEEDS_ASSOCIATE { patronId }`, `INFORMANTS_FULL`, `NO_PATRON_HERE`, `IN_STORY`;
- the exposé: `NOT_A_PRESS`, `NO_PRINTABLE_FILE`, `OWN_PARTY`, `NO_PARTY`, `BURNED { until }`, `PRINTED_TODAY`, `NO_STORY`, `STORY_ELSEWHERE { locationId }`;
- society calls: `NOT_DRESSED { door }`, `CALLED_TODAY`, `SUBJECT_REQUIRED`;
- patrons: `PATRON_LEVEL`, `NOT_A_PATRON_PLACE`, `GIVEN_TODAY`, `NOT_CONFIDANT`, `FAVOUR_USED { from }`, `NOT_AN_ISSUE`;
- the home: `FLAT_LEVEL`, `NOT_IN_RESIDENCE_CITY`, `FLAT_OWNED`, `NO_FLAT`;
- Legacy: `PERK_MAX`, `NOT_ENOUGH_LEGACY { need }`.

`PoliticalAct` += `bought`, `sold`, `markBought`, `caseFile`, `dossierSold`, `informant`, `gift`, `patronFavour`, `flatBought`, `rentPaid`, `perk`. `ActionResult.kind 'story'` gains `stamp: 'printed' | 'pageThree' | 'spiked'` for the exposé. Knock-on kinds (§10.3): `dossier`, `favour`, `legacy`, `keepsake`, `recognised`.

### 6.13 Tests (Vitest, `packages/rules/test`)

- **Items and the Wardrobe:** every catalogue item against `ITEM_EFFECT_BOUNDS` and `SLOT_CHA`; `wornCha` for economy §22.2's model by day (2 · 12 · 18 · 20 · 30 · 34 · 50); `outfitOf` with Town equal to Plain (Town inverted), with nothing matching, with Evening null; `wearGate` in the cells, on a train, Evening lapsed, the Coat off; `withoutUid` (a coat falls back to the kit).
- **Shops:** `shopPrice` (800 → 920 Repeat offender, 4,500 → 5,850 Notorious, 150 → 173); `sellPrice` (200 → 20, 800 → 80); every `buyGate` and `sellGate` refusal; `bribePrice` (500 / 1,000 / 2,000, halves under discretion).
- **Personal modifiers:** the press pass on a tier-1 intelligence tap (+10) and on a surveillance mission (+10, not +20); the camera on a surveillance mission (+5) and not on a tier-1 tap; the correspondent's suit and the pass together (+15); forged papers on Talk against the police (+10) and not against an enforcer; Marr's case against anyone; `personalFxpShares` (coat + badge + perk = three parts of 5 %).
- **Recognition:** the table at the edges (Charisma 9 / 10 / 19 / 20 / 29 / 30; each office; Legacy 9 / 10 / 50 / 60; plain clothes halving 5 to 2 and 15 to 7), night doubling, the design's 30 and 0, `runInChance` clamped at 90.
- **Combat with coats:** the reference recruit against an enforcer 29 % → 41 % with a Tier II coat (GDD §20.3); damage on a win reduced by 8.
- **The Dossier:** `dossierCapacity` at INT 10 / 11 / 20 / 21 / 35 / 36 / 50 / 51 and the perk; freshness at 6 and 7 days; `nameWeight` (2 fresh + 2 stale = 3); `pickName` over 10,000 draws: rival 2 in 3, never undrawn names, null in an empty town; `rollEntry` at 10 %, 25 %, 35 % (pass + camera); `bindFile` takes all held entries; every `bindGate`, `turnGate`, `exposeGate` refusal; `informantReports` across a seven-day absence (three reports, once each); `sellValue`.
- **The exposé:** `exposeDifficulty` (3 → 18, 3.5 → 18, 4 → 16, 5 → 14, headline +1, the capital +2); `exposeSwing` (plain → Neutral entirely, headline half and half, ×1.5 tagged, 0 on a Failure); `applyToNeutral` at a home floor of 50; `exposeRewards` with Rested.
- **Patrons:** `addFavour` with the perk (+6 → 7, +2 → 3, +1 → 2) and the cap; tiers crossed at 10 / 30 / 60 / 90; `patronDays` from a first visit over 30 days (arrivals every two days, never three open, expiry at the fourth boundary, the rotation with `req.crane.print` skipped below Level 16, gossip on Mondays from Acquaintance); a Request done on its last day paid at the next boundary; economy §22.5's three players' tier days (± a day); `requestMatches` for each of the twelve Requests' descriptors; `favourReady` at 6 and 7 days.
- **The home:** `restAtBoundary` (10, 25, 10 the morning after it lapses, 25 the first night after paying); `flatCounts` when living elsewhere; `payRent` paid and lapsed (no arrears); the cap with a room and a flat (250, not 300), with the perk (300).
- **Legacy:** `legacyFromWindow` for every kind in a three-day absence (terms ending inside and outside the window, a vacated term, two awards, the Unrest prize's +2 under `unrest|{cityId}|{entry}` once, a pledge); ~~`seasonCredits` with 13 and 14 days of tenure~~ (deferred); every `perkGate`; economy §22.7's model (15 by day 30).
- ~~**The season:** `seasonOf` at the epoch, at 83 / 84 and before the epoch; season day 0 is a Monday and a term day 0 for 100 seasons; `seasonReset` (a district at 50 / 20 / 10 / 20 against 30 / 25 / 20 / 25 → 40 / 22.5 / 15 / 22.5; a home floor); `seasonScores` with economy §22.8's figures; `champion` ties at each level; `awardWinner` ties to the earlier; `heatAt` across a season's start.~~ **Deferred (seasons).**
- **Counts (kept):** `countSeats` with a Protégé (+2) and *A name they know* ×3 (+3) changing the seventh seat; `districtScores` with `scoreBonus`.
- **Settlement:** `settleDays` with the Monday perk inside and outside the 14 paid days; `projectEnergyThrough` with `restOn` over three boundaries (banked once each, capped).

---

## 7. The read path and the guards (`apps/server`)

### 7.1 `loadCharacter(user, content, now, opts?)` v8

The order is §3.11's. `LoadedCharacter` gains `personal` (`PersonalModifiers`, built once per request from the worn items and the perks) and `recognitionAt(cityId, now)` (rival ground only). `wornStats` reads the flat. Heat is read as slice 5 built it (`projectHeat`, with the perk's cooling); ~~through `heatAt` with `seasonOf(dayKey(now)).fromDay`~~ is deferred with the season. Keep that projection the one place Heat is read, so `heatAt` can wrap it later.

`touchPresence` (ADR 0040) writes `presence.recognised` with `locationId` and `seenAt` (unversioned).

### 7.2 The guards

| Procedure | Refuses |
|---|---|
| `wardrobe.wear`, `.takeOff`, `.outfit`, `.keep` | `CHANGE_LOCKED` (in the cells or the infirmary; on a train), `NOT_OWNED`, `NOT_WEARABLE`, `COAT_REQUIRED`, `OUTFIT_LOCKED` (Evening without a counting flat) |
| `wardrobe.dressOnArrival` | `NOT_ON_TRAIN` (no journey on the way), `OUTFIT_LOCKED` (only `plain`) |
| `shop.buy` | `IN_TRANSIT`, `WRONG_CITY` (the place is in another city), `NOT_SOLD_HERE`, `MEMBERS_ONLY`, `LEVEL`, `RANK`, `ALREADY_OWNED`, `NOT_ENOUGH_IRON` |
| `shop.sell` | as buy, plus `NOT_SELLABLE { why }` |
| `shop.bribe` | `NO_SHOP` (no back room here), `RANK { need: 3 }`, `NO_MARKS`, `BRIBED_TODAY`, `NOT_ENOUGH_IRON` |
| `dossier.bind` | `CASE_FILES_LEVEL`, `NOT_ENOUGH_ENTRIES`, `FILE_HELD` |
| `dossier.sell` | `NOT_A_STATION` (the place's kind), `FILE_NOT_FOUND` (not held by me), `IN_STORY` |
| `dossier.turn` | `FILE_NOT_FOUND`, `NEEDS_PATTERN`, `NO_PATRON_HERE`, `NEEDS_ASSOCIATE`, `INFORMANTS_FULL`, `IN_STORY` |
| `expose.choose` | `NOT_A_PRESS`, `IN_TRANSIT`, `WRONG_CITY`, `FILE_NOT_FOUND`, `NO_PRINTABLE_FILE`, `OWN_PARTY`, `NO_PARTY`, `BURNED`, `PRINTED_TODAY`, `IN_STORY` (a story already chosen) |
| `expose.attempt` | `NO_STORY`, `STORY_ELSEWHERE` (not in the paper's city), `PRINTED_TODAY`, `NOT_ENOUGH_ENERGY`, `FILE_NOT_FOUND` (sold or spent since: the story is cleared) |
| `mission.start` (`social`) | slice 5's, plus `NOT_DRESSED`, `CALLED_TODAY`, `NEEDS_ASSOCIATE`, `SUBJECT_REQUIRED` (the morgue file) |
| `events.call` (+ `caseFileId`) | slice 6's, plus `FILE_NOT_FOUND`, `NO_PRINTABLE_FILE`, `WRONG_PARTY` (not the event's target party), `BURNED` |
| `patron.visit`, `.gift`, `.favour` | `PATRON_LEVEL`, `NOT_A_PATRON_PLACE` (not in the patron's city), `GIVEN_TODAY`, `NOT_ENOUGH_IRON`, `NOT_CONFIDANT`, `FAVOUR_USED { from }`, `NOT_ENOUGH_PC`, `NOT_AN_ISSUE` (Crane's: a live Issue of an open city) |
| `home.buyFlat` | `FLAT_LEVEL`, `NOT_IN_RESIDENCE_CITY`, `FLAT_OWNED`, `NOT_ENOUGH_IRON` |
| `home.payRent` | `NO_FLAT`, `NOT_ENOUGH_IRON` |
| `legacy.takePerk` | `PERK_MAX`, `NOT_ENOUGH_LEGACY` |

Every guard is checked twice: before the key (a clean refusal) and inside the transaction against the session's read.

---

## 8. API (`apps/server`)

### 8.1 Procedures

Every procedure is protected. No input names the caller's character, faction, residence, prices or odds. `Oid = z.string().regex(/^[0-9a-f]{24}$/)`; `Key = z.uuid()`; `PatronId = z.enum(['crane', 'marr'])`; `Slot = z.enum(['clothing', 'accessory', 'document', 'utility'])`; `Outfit = z.enum(['town', 'plain', 'evening'])`.

```ts
// The Wardrobe (set-to-state: no key, ADR 0008; the version guard; no modal)
wardrobe.get           ()                                                   → WardrobeView
wardrobe.wear          ({ uid: z.string().min(1).max(40) })                 → WardrobeView
wardrobe.takeOff       ({ slot: Slot.exclude(['clothing']) })               → WardrobeView
wardrobe.outfit        ({ outfit: Outfit })                                 → WardrobeView
wardrobe.keep          ({ outfit: Outfit })                                 → WardrobeView
wardrobe.dressOnArrival ({ journeyId: Oid })                                → JourneyView
// Shops (a place's cards)
shop.buy               ({ locationId: z.string().min(1), itemId: z.string().min(1), idempotencyKey: Key }) → PoliticalResult (bought)
shop.sell              ({ locationId: z.string().min(1), uid: z.string().min(1), idempotencyKey: Key })    → PoliticalResult (sold)
shop.bribe             ({ locationId: z.string().min(1), idempotencyKey: Key })                           → PoliticalResult (markBought)
// The Dossier
dossier.get            ()                                                   → DossierView
dossier.seen           ()                                                   → void          // unversioned dossierSeenAt
dossier.bind           ({ subjectId: z.string().min(1), idempotencyKey: Key })                           → PoliticalResult (caseFile)
dossier.sell           ({ locationId: z.string().min(1), id: Oid, idempotencyKey: Key })                  → PoliticalResult (dossierSold)
dossier.turn           ({ fileId: Oid, idempotencyKey: Key })                                            → PoliticalResult (informant)
// The exposé (ADR 0013's StoryScreenView)
expose.get             ({ locationId: z.string().min(1).optional() })       → ExposeView     // the stored story, else step 1 at this press
expose.choose          ({ locationId: z.string().min(1), fileId: Oid, angle: z.enum(['plain', 'headline']) }) → ExposeView
expose.attempt         ({ wayId: z.enum(['write', 'talk', 'legwork']), idempotencyKey: Key })            → ActionResult (story)
// Patrons
patron.get             ({ patronId: PatronId })                             → PatronCardView
patron.visit           ({ patronId: PatronId })                             → PatronCardView // set-once firstVisitDay
patron.gift            ({ patronId: PatronId, idempotencyKey: Key })                                     → PoliticalResult (gift)
patron.favour          ({ patronId: PatronId, issueDocId: z.string().min(1).optional(), idempotencyKey: Key }) → PoliticalResult (patronFavour)
// The home
home.get               ()                                                   → HomeView
home.buyFlat           ({ idempotencyKey: Key })                                                         → PoliticalResult (flatBought)
home.payRent           ({ weeks: z.union([z.literal(1), z.literal(4)]), idempotencyKey: Key })            → PoliticalResult (rentPaid)
// Legacy (the season's procedure deferred)
legacy.get             ()                                                   → LegacyView     // your own; others via faction.profile
legacy.takePerk        ({ perkId: z.enum(['party', 'dossier', 'sleep', 'walk', 'name', 'monday', 'friends', 'quiet']),
                          idempotencyKey: Key })                                                         → PoliticalResult (perk)
// season.hall         ()                                                   → HallOfFameView   — deferred (seasons)

// Changed
mission.start   += { subjectId: z.string().min(1).optional() }   // the morgue file's chosen name
events.call     += { caseFileId: Oid.optional() }                // the Headline Story
character.me → CharacterView v9 · city.get → CityView v8 · paper.today → PaperView v8 · nation.get (unchanged; ~~+ season~~ deferred)
· travel.journey (+ dress) · faction.profile (+ legacy, titles) · ambition.* (new chapters, the choice's Iron)
```

The Wardrobe's procedures carry no key: each writes a target state (an item in a slot, a saved set), so a replay is a no-op, and the version guard serialises a double tap; the client disables the chip and the card from the tap until the view renders. Everything that moves Iron, Favour, Legacy or a file carries a key.

### 8.2 Services

**`wardrobeService`** (ADR 0051): `get` (the view from the character and content); `wear`/`takeOff`/`outfit`/`keep` (`wearGate`, then one `updateOne({ _id, version }, { $set, $inc: { version: 1 } })`; a miss re-reads and repeats once, else `CONFLICT`); `dressOnArrival` (`journeys.updateOne({ _id, characterId, status: 'onTheWay' }, { dress: 'plain' })` and the pointer, one transaction). **`settleArrival`** (ADR 0025) reads `outfits.plain` and `journey.dress` in its session and adds `equipment`, `lastOutfit` to its conditional update.

**`shopService`**: `buy`, `sell`, `bribe` as §3.3, each `withRequestKey(kind)` in one transaction on the character (one document: the request log is the second). The shop and item are resolved from content by `locationId` (the client's ids are never trusted for a price). `wornStats` and every view call `equippedItems` v2.

**`dossierService`** (ADR 0053):

- `landEntry(session, c, { source, category, cityId, party?, subject?, chancePct, seed, row, now })`: the shared helper every source calls inside its own transaction: `pickName` → `rollEntry` → the count (`status: 'held'`) against `dossierCapacity(int, perks)` → insert, or the refused knock-on. Returns the knock-on and the descriptor (`kind: 'dossierEntry'`, the subject's city and district) for the caller's Request matching. Callers: `actionService` (tier-1 intelligence Successes; rows of a ×3 each with its own row index), `missionService` (surveillance, theft, social, the morgue file with `subjectId`), `travelService.choose` (the informer), `heldService.act`, `ambitionService` (Clear His Name 2's certain entry), and the settlement (reports and gossip).
- `get` (the tab: names grouped, weights, clocks, burns, files with the uses each allows, informants with days left; `{ used, cap, fresh, stale, files }`), `bind`, `sell`, `turn`, `seen`.
- **Selling at a station** is the station place's card; the service checks the place's kind and the character's city.

**`exposeService`** (ADR 0054, 0013): `get` builds the `StoryScreenView` for the stored step (step 1's file rows and the two angles; step 2's three ways with odds words and the camera's tag); `choose` is a set-once `updateOne({ _id, expose: null, version })`; `attempt` is `keyedAction('expose')` (the shared retry helper of ADR 0013): in one transaction the character (Energy, Rested, rewards, PC, the tally, `expose: null`, `today.expose`, `dossierBurns`, Requests, `legacy.total`), the file (`status: 'held' → 'spent'`, `used`), the name's meter (`cities` or `districts`, `applyToNeutral` or `applyAgainst`, `rivalPressure` when the town is the party's home), `influenceLedger` (kind `expose`), `contributions` (the place cycle, the faction scopes; ~~`season|{s}`~~ deferred; the actor's leg only), `issues` (points when tagged), `legacyEntries` (`expose:{logId}`), `actionLogs` (kind `expose`). A Failure writes only the character (Energy, XP, `today.expose`, `expose: null`) and the log; the file stays held. *Something I can print* advances on a Success or a Partial, when something was printed (§22.1 Q26).

**`missionService`** (slice 5) gains the `social` type: `missionGate` with the door and once a day (`today.calls`); no run-in or caught roll (the type's zeros); `landEntry` one time in four on a Success (`entry: 'onSuccess'` for the late table); Favour with `patronOf(cityId)` (`society.favour` or 2, 1 on a Partial) through `addFavour` with tier crossings (§8.2 `patronService.crossInTx`); the morgue file's chosen subject. Every mission and tier-1 act passes `personal` for item rows and Party XP parts, and `recognition` on rival ground.

**`patronService`** (ADR 0055): `get`, `visit` (set-once `patrons.$[p].firstVisitDay`, pushing a new `patrons[]` entry if absent, under the version guard), `gift` (200 Iron, `today.gifts`, `addFavour(+2)`), `favour` (Crane: `plantHeadline`: the Issue `status: 'live'` → `$inc momentum.{f}: 50` and `addPoints` for the caller, 25 PC; Marr: `discretion`: `setHeat(0, now)`, `discretionUntil: today + 6`, 20 PC; both `favourDay: today`). `crossInTx(session, c, patronId, crossed)` grants the piece (`grantItem`, source `patron`) and inserts `legacyEntries` `protege:{patronId}` at Protégé, and records `tierDays`. **Request progress** is `advanceRequests` inside the transactions of `action.perform`, `mission.start`/`encounter.choose`, `expose.attempt` and `landEntry`.

**`homeService`** (ADR 0056): `buyFlat`, `payRent` (one character update each with a request key; Energy re-based at the tap when today's cap changes: buying, or paying a lapsed flat). The residence card and the Me tab's home card read `home.get`.

**`legacyService`** (ADR 0057): `get`, `takePerk` (the gate; `legacy.spent += cost`, `perks.{id} += 1`; Energy re-based for `sleep`, Heat re-based for `quiet`; request key). `addLegacyInTx(session, c, rows)` inserts the rows (unique refs; a duplicate means it is already there and the row is skipped by a prior `find` of the refs in the session) and `$inc legacy.total`. Callers: `expose.attempt`, `patronService.crossInTx`, `ambitionService` (ch 12), the settlement.

~~**`seasonService`**~~ **Deferred (seasons, 16 Oct 2026); not built in slice 8, `processNationBoundary` is unchanged.** (ADR 0058): `seasonFinaleInTx(session, d)` called by `processNationBoundary` at a season's day 0 after the take-office step: the scores from `nation.season`; the Champion; the three Presidents from `nationalElections` of the season's terms; the awards (`Contribution.find({ scope: 'season|{s}', bracket }).sort({ amount: -1, lastAt: 1 }).limit(2)` per bracket; `Award.aggregate` heroes by character within the season's days; `EventSignup.aggregate` Triumphs by Speaker or Organiser roles; `DossierEntry.aggregate` files by `used.day`); `seasons.insert` (`_id` unique: E11000 is success); `nation.lastSeason`, `nation.season` reset; laws ended (`Law.updateMany({ endedDay: null, fromDay: { $lt: d } }, { endedDay: d, endedBy: 'season' })` and the projection); `nation.news` `nl.season-front`. `processNationBoundary` also adds the day's control share to `nation.season.control` at every boundary, and a seated national election's party to `nation.season.elections` at term day 0 (to the old season's list when it is also season day 0). `hall()` reads `seasons` newest first.

~~**`cityDay.ts`**~~ **Deferred (seasons); `cityDay.ts` is unchanged in slice 8.** (ADR 0017, 0058): at a boundary into season day 0, the **last** step of `processHomeBoundary`, `processCapitalBoundary` and `processBattlegroundBoundary` is `seasonResetCity(d)`: each meter `seasonReset` against its baseline (ledger rows `kind: 'season'`, system source), and the council's rule in force on `d − 1` cut to `toDay: d`. Monday's draw on a season's first day passes `lastWeek: []`.

**The settlement v8** (`computeSettlement`, ADR 0020, 0055–0057):

1. **Reads added** (§3.11): the Dossier's held count and informants when needed; ~~`seasons` newer than `seasonCredited` when behind~~ (deferred); the confidence votes and removal bills survived when the window holds a Chair's or President's term; the candidates' live Issue for a Request's `{issue}`.
2. **Energy and Rested**: `projectEnergyThrough` with `capOn` (the flat, the perk) and `restOn` (`restAtBoundary`), as one projection.
3. **The wage**: `settleDays` with the Monday perk.
4. **Patrons**: `patronDays` per patron → `patrons` (Requests, Favour, tiers, `thanks`), `crossInTx` for crossings (the Protégé's piece and Legacy), the gossip days → `landEntry` (source `gossip`).
5. **Informants**: `informantReports` per informant → `landEntry` (source `informant`), `reported` updated on the row.
6. **Legacy**: `legacyFromWindow` (terms, awards credited in this settlement, pledges, survivals) → `addLegacyInTx` (~~`seasonCredits`, `seasonCredited`~~: deferred).
7. **Milestones**: completed terms by office, `deputyFromDay`.
8. **Stored headlines**: §11.2's facts.

All in the settlement's one transaction (ADR 0020's guard on `day.settled`), so each boundary's income is credited once whoever reads first.

**Action, mission, travel, held, event and ambition services**: `personal` everywhere a check or Party XP is computed; `landEntry` where a source applies; `advanceRequests`; `recognition` on rival ground (`firsts.recognised` the first time a run-in fires with recognition above 0); `wornStats` with the flat; `coatTier` for power and damage; the Headline Story's file (`events.call`: the file `held → attached`, `campaignEvents.caseFile`, the burn; `events.withdraw` by the caller: back to `held`, the burn removed; `resolveEvent`: `attached → spent`, `used`, the swing ×1.5 and the name in the result's headline).

### 8.3 Views

```ts
interface ItemCardView { uid: string | null; itemId: string; name: string; art: AssetId; kindLine: string /* COAT · A GOOD COAT */;
  cha: number; words: string[] /* better odds watching and listening, holds up in a run-in, recognised on rival ground */;
  keepsake: { from: string } | null; read: boolean; worn: boolean; inOutfits: OutfitId[]; sells: number | null }
interface WardrobeView {
  cha: number;
  chips: Array<{ id: OutfitId; inverted: boolean; enabled: boolean; why: 'payRent' | null; cha: number }>;
  keep: OutfitId | null;                                // *Keep this as …* when nothing matches
  line: { outfit: OutfitId | null; cha: number; word: 'recognised' | 'unnoticed' | 'dressedForCasino' | null };
  locked: 'out' | 'arrive' | null;
  slots: Array<{ slot: ItemSlot; item: ItemCardView | null; choices: ItemCardView[] /* with the Charisma delta */ }>;
  owned: number; groups: Record<ItemSlot | 'keepsakes', ItemCardView[]>; sellable: number;
}
interface ShopCardView { kind: ShopKind; kicker: string; line: string; items: Array<ItemCardView & { price: number;
  surchargePct: 15 | 30 | null; state: 'buy' | 'owned' | 'needsIron' | 'locked'; lock: { reason; need } | null;
  confirm: boolean /* over 1,000 */ }>; sell: { buys: boolean; rows: Array<{ uid; name; art; price; blocked: 'worn' | null;
  inOutfits: OutfitId[] }> } | null; bribe: { price: number; level: RecordLevel; discretion: boolean;
  state: 'ok' | 'clean' | 'today' | 'needsIron' } | null }
interface DossierView { used: number; cap: number; fresh: number; stale: number; files: number; full: boolean;
  names: Array<{ subjectId; name; factionId: FactionId | null; city: string; district: string | null; weight: number;
    clock: Array<'fresh' | 'stale' | 'empty'>; canBind: boolean; why: string | null;
    burned: { until: DayKey } | null;
    entries: Array<{ id; category; line: string /* filled */; source: string; day: DayKey; staleOn: DayKey; fresh: boolean }> }>;
  caseFiles: Array<{ id; subjectId; name; factionId; city; kinds: DossierCategory[]; lines: string[]; weight: number;
    print: { ok: boolean; why: string | null; nearest: { locationId; name; street } | null };
    sell: { value: 200; nearest: { locationId; name } | null }; turn: { ok: boolean; why: string | null } }>;
  informants: Array<{ id; name; city; daysLeft: number; next: DayKey; last: string | null }> }
interface ExposeView extends StoryScreenView { step: 1 | 2; files?: Array<{ id; name; party; lines: number }> }
interface PatronCardView { id: PatronId; name; portrait; voice: string; visited: boolean; level: boolean;
  tier: PatronTier | null; favour: number; next: { tier: PatronTier; at: number } | null;
  gift: { cost: 200; state: 'ok' | 'given' | 'needsIron' };
  requests: Array<{ id; title: string; until: DayKey; progress: number; target: number; to: Route }>;
  favourAct: { title: string; pc: number; state: 'ok' | 'used' | 'needsPc'; from: DayKey | null;
               issues?: Array<{ docId; cityName; name }> } | null;
  perks: Array<{ tier: PatronTier; line: string; reached: boolean }> }
interface HomeView { sleep: 'room' | 'flat'; flat: { cityId; cityName; paidThrough: DayKey; state: 'paid' | 'due' | 'waiting';
  counts: boolean; livesIn: string | null /* *you live in Eastside* */ } | null;
  buy: { ok: boolean; why: 'level' | 'notHere' | null; cost: 2500 } | null; rent: { week: 150; four: 600 } }
interface LegacyView { total; toSpend; entries: Array<{ words: string; day: DayKey; points: number }>;
  perks: Array<{ id: PerkId; name; line; cost; taken: number; max: number; state: 'take' | 'needs' | 'taken' }>;
  titles: string[] }
// Deferred (seasons, 16 Oct 2026): SeasonCardView { number; day; of: 84; electionFrom; scores }
//   and HallOfFameView { seasons[{ number, champion, score, presidents, awards }], current { number, endsOn } }
CharacterView v9 += { cha: number; outfit: OutfitId | null; dossierDot: boolean; legacy: number }
                      // titles: string[] (Champion of Season 1, the awards): deferred with the season
CityView v8 += { places[].cards: Array<'shop' | 'patron' | 'station' | 'press'>;
                 recognition: { word: 'recognised' | 'unnoticed' } | null /* rival ground */;
                 tickets[].tags += item tags, *Recognised · run-ins likelier* / *Plain clothes · unnoticed* }
JourneyView += { dress: { offered: boolean; done: boolean; warning: string | null } }
ProfileView += { legacy: number; entries: Array<{ words; day; points }> /* the newest ten */ }   // titles: deferred
// NationView += { season: SeasonCardView }: deferred (seasons)
```

The client receives words, never a chance: odds words for the society calls and the exposé, risk words for run-ins; `recognition` as a word (*recognised here*), never a figure.

### 8.4 The paper v8

§11.

### 8.5 Realtime

Nothing new. The Dossier's dot, the Requests and the Legacy figures arrive on focus with `character.me`.

### 8.6 Test hooks (only with `E2E_TEST_HOOKS`, memory mode)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/wardrobe` | `{ grant: string[] }` · `{ wear: string[] }` | adds items to the inventory (source `test`) and wears them, through the services' own writers |
| `POST /api/test/dossier` | `{ entries: Array<{ subjectId, category?, daysAgo?: number }> }` · `{ file: subjectId }` · `{ informant: subjectId }` | lands entries (stale ones by `daysAgo`), binds a file, turns one |
| `POST /api/test/force` (slice 5, extended) | `+ { dossier: 'land' \| 'never' }` | the caller's next act lands (or never lands) its entry |
| `POST /api/test/patron` | `{ patronId, favour?: number, visitDaysAgo?: number }` | sets Favour (crossings through `crossInTx`) and the first visit |
| `POST /api/test/home` | `{ paidThroughDay: 'yesterday' \| 'today' \| number }` | moves the flat's rent (a lapse, the due day) |
| `POST /api/test/legacy` | `{ points: number }` | inserts a `test:{n}` entry |
| ~~`POST /api/test/season`~~ | ~~`{ seasonDay: 0..83, next?: boolean }`~~ | ~~moves the test clock to that season day and runs every day up to it, the finale included~~ **Deferred (seasons)**; a month is played with `/clock`, `/term` and `/city-day` |
| `POST /api/test/clock`, `/term`, `/city-day` | unchanged | — |

### 8.7 The dev panel (README "Reviewing with the dev panel")

Each new button calls a hook above, then the existing settle. The panel holds no rule.

- **Wardrobe:** *Give me a party coat*, *Give me the greatcoat and the hat*, *Give me the press pass and the camera*, *Give me forged papers*.
- **Dossier:** *Three entries on a rival name*, *Make it stale*, *Next tap lands an entry*, *A Case File now*.
- **Patrons:** *Crane at 29 / 59 / 89*, *Marr at 29 / 59 / 89*, *First visit two days ago*.
- **Home:** *Rent due today*, *Rent ran out*.
- **Legacy:** *Give me 20 Legacy*.
- ~~**Season:** *Go to season day …* (0, 41, 77, 79, 83), *Next season*.~~ Deferred (seasons).

`GET /api/test/dev/status` adds: worn Charisma and its parts, the outfit, recognition here (the figure and its parts), the Dossier's used / cap and the last entry roll, each patron's Favour and open Requests, the flat's state, Legacy total / to spend (~~the season, its day and the running scores~~: deferred).

---

## 9. Scheduled jobs (Agenda)

| Job | When | Does | Idempotency |
|---|---|---|---|
| `nation-day` (slice 7) | unchanged | **unchanged in slice 8.** ~~The running season score at every boundary; at a season's day 0, after taking office, the finale (scores, Champion, Presidents, awards, `seasons`, laws ended, the reset of `nation.season`)~~: deferred (seasons) | `nation.world.settledDay` (~~`seasons._id` unique; `nation.season.index` filtered on the old index~~) |
| `city-day` | unchanged | **unchanged in slice 8.** ~~At a season's day 0, the last step of each city's boundary: meters halfway to baseline, the council rule ended; Monday's draw with the deck reshuffled~~: deferred (seasons) | ADR 0017's `world.settledDay` guards |
| `journey-arrive` (slice 4) | unchanged | `settleArrival` now also dresses for arrival | the journey's `status: 'onTheWay'` guard |
| `campaign-event-resolve` (slice 6) | unchanged | the Headline Story spends its attached file | the event's status guard |

**No new job, and no job extended** beyond `settleArrival`'s dress and the Headline Story's file (a bodyguard's lapse and a meal's end are lazy too, §24.2). Rent, Requests, informants, gossip, freshness and burns are computed from day keys on read (the rollover's Heat and the season's boundary work are deferred). Each still has its lazy path (`ensureNationDay`, `ensureCityDay`, `ensureArrived`) as the guarantee and the job as the tidy runner, as slices 4–7.

---

## 10. The result modal: how the breakdown is produced

### 10.1 The political modals (`ResultModal kind: 'political'`, design §11)

Built by each service in its transaction, stored with the request key (`requestLogs`), returned unchanged on a retry. Texts are content (`politics.results` and `copy.ts`); numbers and names are filled by the server.

| Act | Stamp · headline | Knock-ons | `view` |
|---|---|---|---|
| `bought` | *Bought* · *{item}* | `iron { before, after: −price }` (with the surcharge line when it applied), *Wear it now* (second button → `wardrobe.wear`) | `wardrobe` |
| `sold` | *Sold* · *{item}* | `iron +{price}`; *Taken out of your {outfit} outfit* when it was saved (§22.1 Q2) | `wardrobe` |
| `markBought` | *Struck off* · *One mark fewer* | `iron −{price}` (*Half price · Marr's discretion*), marks left | `record` |
| `caseFile` | *Bound* · *A Case File on {subject}* | the kinds, the weight's words (*five lines' worth*), *Dossier {used} of {cap}* | `dossier` |
| `dossierSold` | *Sold* · *A word by the left-luggage* | `iron +{price}`, *Dossier {used} of {cap}* | `dossier` |
| `informant` | *Turned* · *An informant in {city}* | *Case File spent*, *2 informants at most*, the first report's weekday | `dossier` |
| `gift` | *Given* · *A gift for {patron}* | `iron −200`, `favour { patronId, before, after }`, a tier reached | `patron` |
| `patronFavour` | *Called in* · *{favourTitle}* | `pc −25 / −20`; Crane: the Issue's momentum `before → after` by party, *in your name*; Marr: `heat { before, after: 0 }`, *the back room at half price until {weekday}*; *once a week · again from {weekday}* | `patron` |
| `flatBought` | *Yours* · *A flat in {city}* | `iron −2,500`, *Rested +25 a night · Rested cap +50*, *paid until {weekday}*, *Evening is a third outfit now* | `home` |
| `rentPaid` | *Paid* · *Rent until {until}* | `iron −150 / −600` | `home` |
| `perk` | *Lasting* · *{perk}* | `legacy { toSpend before → after }`, the effect line | `legacy` |

### 10.2 The exposé (`ResultModal kind: 'story'`, screens §7)

Stamp **Printed** (Success) / **Page three** (Partial) / **Spiked** (Failure), the outcome text by angle (design §16.6), and the knock-ons: `opinion { cityId, districtId, factionId, delta: −1.0 | −0.5, mode, factors }` (*Opinion in Eastside: Vanguard −1.0*), `xp`, `fxp`, `iron` with the Rested part, `pc +5`, `legacy { kind: 'expose', points: 2, total }`, *Case File spent* / *Case File kept · the editor wants more*, *{name} is in tomorrow's paper*, a Request advanced. The full `CheckBreakdown` (the roll, the chance, the camera's row, the rival-ground row) is in the result for the dev panel and QA; the client renders words only.

### 10.3 New knock-on lines on existing modals

| Knock-on | On | Shape |
|---|---|---|
| `dossier` | tier-1 actions, missions, society calls, journey cards, the cells' and ward's taps, chapters | `{ subjectId, name, category, staleOn, refused: boolean }` (*Dossier: an entry on Josef Baum · political · goes stale Thursday* / *Dossier full · an entry went begging*); dev: `{ chance, roll }` |
| `favour` | society calls, gifts, chapter 7, the paper's thanks | `{ patronId, before, after, crossed: PatronTier[] }` |
| `legacy` | the exposé, Protégé, chapter 12 | `{ kind, points, total }` (*Legacy +2 · An exposé printed*) |
| `keepsake` | chapters, Protégé | slice 2's, with *wear it from the Me tab* for a wearable one |
| item rows | every check | `CheckBonus { id: 'item:{itemId}', label, value }` (dev); the ticket and the result show *{Item} · better odds* |
| item and perk parts | Party XP lines | `RewardPart { id: 'item:{itemId}' \| 'perk:party', label, amount }` (*Steward's jacket +5 % Party XP*) |
| `recognised` | run-in pending and result on rival ground | `{ word }` (*Recognised here · run-ins likelier*); dev: `Recognition` |
| Request | any act that advances one | `{ patronId, requestId, progress, target }` (*Crane's letter: 1 of 2*) |

No modal shows a percentage for odds; every count is a real number.

---

## 11. The paper v8

### 11.1 Sections

- ***Letters*** (design §10.2), in order: Ambition chapters, **Requests** (`RequestRow`: *From Edith Crane*, the title, *by {weekday} · Favour +6*), **informants' reports** of today (*From your informant*), **the patron's Monday gossip** (*From Edith Crane: a word about {name}*). The tab's dot shows while a chapter or a Request is open and unanswered.
- ***Your desk*** (design §10.3), after *Your record*: **Dossier** (*{n} entries · {m} go stale {when}*, live: a count of held entries with `day = today − 6`), **Patrons** (*Crane: Associate 41 · Marr: Acquaintance 12*), **Where you sleep** (*A flat in Coalport · paid until Thursday* / *A rented room*), **Ahead** (`ClockRow`, up to three of: the next chapter's date, a patron's next tier within 30, a file one entry short; ~~the Season Election's days~~ deferred).
- ***In Print***: the exposé's front page (stored; the slice-3 front page's shape with `scene.front-page`), the page-three line, *A New Coat on {name}*, the flat, the Legacy entries, *{name} Recognised in {city}*.
- **The public exposé line** (§22.1 Q28): one live headline in every reader's paper, the most recent Success of yesterday (`ActionLog.find({ kind: 'expose', day: today − 1, 'result.outcome': 'success' }).sort({ at: -1 }).limit(1)`), in the reader's paper's voice (*{subject} EXPOSED: …*, *By {name}*).
- **Deferred (seasons):** ~~***From the capital*** / ***The Republic***: `nl.season-week` on season day 77, `nl.season-countdown` each morning of the last week, `nl.season-front` on day 0 (the front page: the Champion's crest as the photograph, the stamp *CHAMPIONS*, the reader's own line: *You: Legacy +5, Champion of Season 1* or *The map settled halfway; your coat, your flat and your Dossier are where you left them*). *No twist this season* once, on season 1's first front page.~~
- ~~***While You Were Away*** names a new season when one began in the absence.~~ Deferred (seasons).

### 11.2 New headline conditions (design §10.1)

| Condition | Kind | Facts from |
|---|---|---|
| `coatBought` → `hl.*.wardrobe-first` | stored | `firsts.coat` yesterday |
| `exposePrinted` → `hl.*.expose-front` (front page) · `exposeP3` · `exposeSpiked` | stored | the member's `expose` log yesterday by outcome (the subject, the lines, the swing) |
| `caseFileMade` → `hl.*.case-file` | stored | a file bound yesterday |
| `staleTomorrow` → `hl.*.dossier-stale` | stored | held entries with `day = today − 6` at the settlement |
| `requestArrived` → Letters `patron-letter` | live | `patrons[].requests` with `arrivedDay = today` (and every open one as a row) |
| `requestThanks` → `hl.*.patron-thanks` | stored | `patrons[].thanks` from this settlement |
| `patronTier` → `hl.*.patron-tier` | stored | `tierDays.* = yesterday` or crossed in this settlement |
| `informantReport` → Letters `informant` | stored | this settlement's reports |
| `flatBought` · `flatDue` · `flatWaiting` → `hl.*.flat-*` | stored | `boughtDay = yesterday` · `paidThroughDay = today` · `paidThroughDay = yesterday` |
| `legacyEntry` → `hl.*.legacy-entry` | stored | entries added yesterday or in this settlement (the largest one; the rest on the Me tab) |
| `recognised` → `hl.*.recognised` | stored | `firsts.recognised` yesterday |
| ~~`seasonWeek`, `seasonCountdown`, `seasonFront`~~ deferred (seasons; the ids reserved) | national | `nation.news` |

*Yesterday* for a personal line is the boundary day, as slices 3–7.

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes

| Route | Screen (screens §) | Data |
|---|---|---|
| `/me` | the party card, stats, **Wardrobe** (chips, four slot cards, *Everything you own*), **Patrons**, **Where you sleep**, **Legacy**, the offices and ladder, the scoreboard lines (§2, §8.2, §9.2, §10); each lower block collapsed to its kicker and one line until tapped (the state remembered locally) | `character.me`, `wardrobe.get`, `patron.get` ×2, `home.get`, `legacy.get` |
| sheets on `/me` | `SlotChooser` (70 dvh), `WardrobeSheet` (90 dvh; desktop side sheet 480 px), a keepsake's *Read* | `wardrobe.*` |
| `/dossier` | the tab bar's fourth tab (*Soon* until now): the header, the chips **Names · Case Files · Informants** (`?tab=`) (§6) | `dossier.get`, `dossier.seen` on open |
| `/dossier/expose` | the exposé's `StoryScreen`, steps 1–2, then the modal (§7) | `expose.get`, `.choose`, `.attempt` |
| ~~`/republic/hall`~~ | ~~the Hall of Fame (§11.2)~~ **deferred (seasons)** | ~~`season.hall`~~ |
| `/city/$cityId…` place sheets | every card below goes in the place sheet's card slot (`cards`, review 4's `docs/tech/review-4.md` §3.1; slice 8's shops were already named last in its order): `PatronCard` (first under the tickets where present), `ShopCard`(s), the back room's row, `SellSheet`, `StationSellCard` and its sheet, the press place's exposé ticket, society call tickets; the Front's four places (§4, §6.3, §8.1, §14) | `city.get`, `shop.*`, `dossier.sell`, `patron.*`, `mission.start` |
| `/journey` | the *Change into plain clothes* line and the warning (§13) | `travel.journey`, `wardrobe.dressOnArrival` |
| ~~`/map/nation`~~ | ~~the republic sheet's `SeasonCard` with *The Hall of Fame* (§11.1)~~ **deferred (seasons)**: no change to the nation map | — |
| `/paper` | Letters (Requests, informants, gossip), the desk's new rows and `ClockRow`, *In Print* (~~the season's front page~~ deferred) (§12) | `paper.today` |
| `/faction?tab=events` (slice 6) | the Headline Story's call sheet gains *Attach a Case File* | `events.callSheet`, `events.call` |

- **The modal gate** unchanged: shop, Dossier, patron, home and perk acts return their modal directly; dressing returns a view and shows **no modal** (design §11: *dressing is not a result*).
- After any mutation the client renders the returned view and invalidates `character.me`, `wardrobe.get`, `dossier.get`, `patron.get`, `home.get`, `legacy.get`, `city.get`, `paper.today` (not `nation.get`: nothing on it changes without the season).
- **The Dossier tab's dot** is `character.dossierDot`; opening the tab calls `dossier.seen`.
- **The tab bar** gains *Dossier* in its fourth position (it was *Soon*); the Faction tab keeps its place.

### 12.2 `packages/ui` additions (plain props, no tRPC)

New (screens §1): `WardrobeBlock`, `OutfitChips`, `SlotCard`, `SlotChooser`, `ItemCard`, `ShopCard`, `SellSheet`, `WardrobeSheet`, `DossierTab`, `NameCard`, `EntryRow`, `CaseFileCard`, `InformantRow`, `ExposeStory` (a `StoryScreen` with step 1's file picker), `StationSellCard`, `PatronCard`, `PatronClock`, `RequestRow`, `HomeCard`, `LegacyBlock`, `LegacyEntryRow`, `PerkRow`, ~~`SeasonCard`, `HallOfFamePage`~~ (deferred), `ClockRow` (the three-segment clock glyph shared by `NameCard`). Changed: `Ticket` (item tags, *Recognised · run-ins likelier* / *Plain clothes · unnoticed*, *MISSION · SOCIETY*, *Not dressed for it*), `Plate` (*RECOGNISED HERE*), `ResultModal` (the exposé's three stamps, the new knock-ons), `ProfileSheet` (*Legacy {n}*; ~~titles~~ deferred), `Paper` (Letters rows, desk rows; ~~the season front page~~ deferred), `ResidenceCard` (its second line is *Where you sleep* only; lodgings are their own place card since review 4), `JourneyScreen` (the dress line), `TabBar` (*Dossier*). The item words (`chancePct` by `on` → *better odds watching and listening* …) live in `copy.ts` and are composed by the server into `ItemCardView.words`.

### 12.3 Layout checks (screens §16)

On 375 × 667: the Me tab's party card and stats first, the Wardrobe block's kicker, chips and Coat card one thumb-scroll down (the block ~400 px); the chooser's two rows of 164 × 260 cards above its fold; a shop's first card and a half with its **Buy** visible when the shop is the first card under the tickets; the Dossier header (120), chips (44) and the first `NameCard` (112) above the fold, **Make a Case File** full width and never wrapping; the exposé's step 1 (one file row and both angles) above the fold; the patron card's portrait, Favour line, bar and **Gift** above the fold at Herald House and the Pier Hotel (~~the season card at the republic sheet's foot~~: deferred). Desktop (≥ 1024): the Me tab in two columns (640 + 360), the Dossier list at 640 with the file's detail in the side column, the exposé centred at 640, side sheets at 480, the wardrobe grid three columns. Sideways phones: the chip row scrolls. Reduced motion: chips swap and clock segments fill without easing; stamps appear at once. Matrix: 360 × 640, 375 × 667, 390 × 844, landscape, 1440 × 900.

**Double taps:** every buy, sell, bind, turn, gift, favour, rent, perk, call and *Take it to the editor* is disabled from the tap until the returned view renders; every keyed mutation's key is made once per tap; a chip or a slot card is disabled from its tap until the view renders.

### 12.4 Copy and vocabulary

Screens §17's strings, the ten help notes (design §16.7), design §11's modal texts, the Legacy words and the perks go to `copy.ts`; items, shops, patrons, Requests, Dossier lines and chapters are content. The QA vocabulary guards run on every new string: *Wardrobe, outfit, Charisma, Dossier, Case File, exposé, patron, Favour, Legacy, season, Champion, recognised, the back room, a society call* pass; **refused in a player string**: *inventory, equipment, slot, tier, armour, CHA, utility, loadout, Black Market, NPC, weapon* (and slice 7's list); *The Front* keeps its allowance. No player string shows a percentage for odds, a roll, a recognition figure, a tier's Roman numeral or an armour value; the only numbers on an item card are its Charisma and its price.

---

## 13. Art (ADR 0007, 0015)

The pictures are in `art-direction/mvp/` now: eight new item drawings (`items/*.jpg`, 512 × 512, RGB) and four scenes (`scenes/*.png`, 2688 × 1520). The `item()` helper takes the source's file name, so the slice's mix of `.jpg` (all of these) and any `.png` an item may later arrive as needs no change; the art build reads the format from the file.

| Asset id | Source (`art-direction/mvp/`) | Kind · widths | Used for |
|---|---|---|---|
| `item.stewards-jacket` | `items/stewards-jacket.jpg` (**new**: the redraw; plain collar, no tabs) | item · 128, 256 | the Vanguard's party coat |
| `item.convenors-coat` | `items/convenors-coat.jpg` (**new**) | item | the Collective's party coat |
| `item.campaign-suit` | `items/alliance-campaign-suit.jpg` | item | the Alliance's party coat |
| `item.greatcoat` | `items/officer-overcoat.jpg` | item | the dress greatcoat |
| `item.evening-dress` | `items/evening-dress.jpg` | item | evening dress |
| `item.correspondents-suit` | `items/correspondents-suit.jpg` (**new**) | item | the correspondent's suit |
| `item.three-piece` | `items/three-piece-suit.jpg` | item | the tailored three-piece suit |
| `item.lapel-badge` | `items/lapel-badge.jpg` (**crop needed**, §22.1 Q34) | item | the party badge |
| `item.good-hat` | `items/good-hat.jpg` (**new**) | item | a good hat |
| `item.wristwatch` | `items/gold-wristwatch.jpg` | item | the gold wristwatch |
| `item.fountain-pen` | `items/fountain-pen.jpg` (**new**) | item | Edith Crane's pen |
| `item.cigarette-case` | `items/cigarette-case.jpg` (**new**) | item | Julius Marr's cigarette case |
| `item.rosette` | `items/rosette.jpg` (**new**) | item | his rosette |
| `item.forged-papers` | `items/forged-papers.jpg` | item | forged papers |
| `item.press-pass` | `items/press-pass.jpg` (**new**) | item | the press pass |
| `item.propaganda-kit` | `items/propaganda-kit.jpg` | item | paste and brush |
| `item.press-camera` | `items/press-camera.jpg` | item | the press camera |
| `item.wire-cutters` | `items/wire-cutters.jpg` | item | wire cutters |
| `scene.flat` | `scenes/flat.png` (**new**) | scene · 640, 1280 (WebP 640) | the flat sheet's crop, the `flatBought` modal, the home card |
| `scene.casino` | `scenes/casino.png` (**new**) | scene | the Casino's `Location.scene`: its sheet, the back room, *The tables after midnight* and *The late table* |
| `scene.lido` | `scenes/lido.png` (**new**) | scene | the Lido's `Location.scene`: its sheet and *The lido's Sunday* |
| `scene.front-page` | `scenes/front-page.png` (**new**) | scene | the exposé's step 3 and its front page in *In Print*; fallback `scene.newsroom` |
| `item.winter-coat`, `item.document-folder`, the starting outfits; `scene.newsroom`, `.hotel`, `.bar-anchor`, `.market`, `.square`, `.election-night`, `.parliament`, the HQ scenes; `portrait.crane`, `portrait.marr` | existing | — | the standard coat; the keepsakes; Herald House, the Pier Hotel, the back rooms, the stalls, the Promenade; chapters 10 and 12; the patrons (~~the season~~ deferred) |

- **Wiring** (T7): the twenty-two catalogue entries in `data/art.ts` (`item()` and `scene()`); each item's `art`; `Location.scene` on the Casino and the Lido; `content.art.lifeScenes = { flat, frontPage }` so no id is hard-coded in the client. **Not catalogued:** `revolver.jpg`, `truncheon.jpg`, `vanguard-field-jacket.jpg` (superseded by the redraw), `items-clothing.png`, `items-gear.png` (sheets). Alt texts (≤ 160, drafts for the designer to confirm against the pictures):
  - `item.stewards-jacket`: *A belted dark grey wool jacket with four pockets, horn buttons and a plain collar.*
  - `item.convenors-coat`: *A long dark-brown wool coat with a wide collar and a red scarf folded inside it.*
  - `item.correspondents-suit`: *A grey herringbone suit with a waistcoat, a press card in the breast pocket and a folded newspaper.*
  - `item.good-hat`: *A dark felt hat with a grosgrain band, the brim turned down at the front.*
  - `item.press-pass`: *A press card in a worn leather holder, PRESS in plain capitals, a stamp and a photograph's corner.*
  - `item.fountain-pen`: *A black fountain pen with a gold nib and a worn clip.*
  - `item.cigarette-case`: *An engine-turned silver cigarette case, open to show the band.*
  - `item.rosette`: *A deputy's rosette of cream and dark ribbon with a plain centre.*
  - `scene.flat`: *A rented room at night: a bed, a wardrobe with coats on the door, a gas ring, a paper on the chair, tram wires outside.*
  - `scene.casino`: *The domed casino after midnight: a long bar, the tables beyond, a cashier's window, evening dress.*
  - `scene.lido`: *The lido on a Sunday: the pavilion, deckchairs down to the water, a brass band on the bandstand.*
  - `scene.front-page`: *A newspaper's front page coming off the press under a pressman's hands, the headline band blank.*
  - and the existing pictures' alts as items: *A long officer's-cut dress greatcoat* (greatcoat), *An evening gown on a stand*, *A three-piece suit on a hanger*, *An enamel lapel badge*, *A gold wristwatch*, *A folded set of forged papers*, *A paste pot and brush with posters* (propaganda kit), *A folding press camera*, *A pair of wire cutters*, *A dark campaign suit*.
- **Crops:** items are square and need none, except **the badge** (the disc sits left of centre with a stray object at the right edge: a `crop` on the asset to the disc's square, chosen in the dev viewer, or a redraw). Scenes keep the full frame with a `focus` where the subject is off-centre (the bed, the cashier's window, the bandstand, the pressman's hands).
- **Content policy** (design §15, §19): checked when wired. The steward's jacket's redraw has a plain collar; the rosette has no device and only cream and dark ribbon; the press pass's *PRESS* is the one word the design allows; **the badge is blue**, which reads as one party's colour on a picture *drawn once* for all three (§22.1 Q34). The art build's review list records each.
- **Budget:** eighteen items at two widths (~10–20 kB each in AVIF, ~0.5 MB in all) and four scenes (~0.6 MB), measured after `pnpm art:build` and recorded in the Deviations. No new ADR (ADR 0015's per-slice rule).
- **Maps:** none new. The Front's four pins exist in `mapPins.clearwater`; they leave `laterPins` (review 4: Clearwater has no quarter outlines).

---

## 14. Security

| Threat | Guard |
|---|---|
| Wearing what you don't own, or another's | `wear` takes an inventory uid of the session's character; the item's slot is the catalogue's |
| Buying below price, or a gated item | Price, surcharge, Level, Rank, faction and membership are computed server-side from content and the character; the client sends a place and an item id only; `iron ≥ price` is in the update's filter |
| Selling a keepsake, the kit or a worn item | `sellGate` in the transaction; keepsakes and the kit carry no price; a worn uid is refused |
| Duplicating items by racing buy and sell | One version-guarded document; a request key per tap; one of each item (`ALREADY_OWNED` read in the session) |
| Reading another player's Dossier | `dossier.get` filters by the session's character; files and entries are never in any other view; `faction.profile` shows Legacy, never the Dossier |
| Naming any subject (the morgue file, binding, attaching) | Subjects are content name ids, checked against `names()`; a file is the caller's (`characterId` in every filter) |
| Probing the entry chance or recognition | Words only; the dev panel and QA read the breakdown; the API never sends either figure to a player view |
| Racing two landings past the cap | Every landing writes the character under its version guard in the same transaction as the count |
| Spending a file twice (exposé, sale, informant, the Headline Story) | Each use filters the file on `status: 'held'` and writes the new status in its transaction |
| Gaming Favour (gift spam, call spam) | `today.gifts`, `today.calls`, the weekly `favourDay`, one Request paid once (removed in the settlement's guarded transaction) |
| Fabricating Legacy | Rows only from acts and the settlement; unique `{ characterId, ref }`; the perk spends `total − spent`, never `total` |
| Shopping in a city you aren't in | `city` checks: `IN_TRANSIT`, `WRONG_CITY` for every place act |
| Test hooks in production | `E2E_TEST_HOOKS` requires memory mode; granted items carry `source: 'test'` and are left out of the report |

---

## 15. Testing

| Layer | What |
|---|---|
| Rules | §6.13 |
| Content | The real data validates. A failing fixture for every §4.2 check: an item at `chancePct 12`, two `chancePct` on one `on`, a priced keepsake, a kit item with a price, a priced item no shop sells, a back room on a `market`, a party store selling another party's coat, a social mission whose difficulty is not its `needs`, a Request with an unknown location, a drawn name without a party, a capital name without a district, a chapter keepsake without `keepsakeFrom`, a catalogued revolver. Word-for-word comparisons with both design documents (the catalogue, the shops, the Front's places, actions and texts, the calls, the patrons and Requests, the Dossier lines, the chapters, the lines, the modals, the help notes). The vocabulary guards |
| DB | The two collections' indexes (`seasons` deferred); migration 012 twice; the Legacy backfill against a seeded history; the unique `{ characterId, ref }` refuses a duplicate; a transaction over `characters`, `dossierEntries`, `legacyEntries`, `districts`, `influenceLedger`, `contributions`, `issues`, `actionLogs` commits |
| Server — the Wardrobe | wear, take off, the three outfits, *Keep this as*, Evening locked after a lapse, locked in the cells and on a train; dressing on arrival by the lazy path and by the job; worn Charisma with the flat in and out of its city; a party coat's +5 % on an action's Party XP |
| Server — shops | buy (each refusal, the surcharge at *Repeat offender* and *Notorious*, one of each), sell (a tenth; a saved coat falls back to the kit; worn refused), the bribe (the price by level, one a day, half under the discretion), the first coat's headline |
| Server — rival ground | recognition in a run-in's chance (dev status) for a Governor in a greatcoat at 22:00 and 21:59 (review 5's night), in plain clothes, with Legacy 50; the forged papers at the checkpoint and against the police; a recognised visitor counted by the home faction and invisible by name |
| Server — the Dossier | each of the eight sources lands an entry at its chance with the forced hook, and the press pass and camera raise the tap's chance; a full Dossier refuses; four parallel landings at 61 of 62 → one lands; binding (all on the name, the weight, one file per name); selling at a station; turning (the Associate rule, two at most); informant reports across a five-day absence (twice, once each); gossip on Mondays from Acquaintance; stale-tomorrow facts |
| Server — the exposé | step 1 set-once; resuming after a reload; step 2 in each outcome: the swing in the name's district (the capital), Clearwater's meter, a home city with the 2-point cap; plain → Neutral; headline split; Rested; the Issue tag with a fixture feed; Legacy +2 once on a retry; the file kept on a Failure; one a day; the burn; the public line in another player's paper; the Headline Story with a file (+50 %, the name, spent at resolution; returned when the caller withdraws) |
| Server — patrons and calls | the six calls (the door, once a day, the Favour, one entry in four, no run-in, no Heat, no Party XP); the late table and the morgue file behind Associate; visit, Requests arriving every two days over a twelve-day absence (never three, expired at four, paid once), every Request's matcher through its real act; gifts; the favours (the planted headline's momentum; the discretion's Heat 0 and half-price bribe); Protégé's piece and Legacy; the endorsement in a home count and a battleground count |
| Server — the home and Legacy | buy, pay, lapse and pay again (no arrears); Rested +25 and +10 at the boundaries, the cap 250 / 300; Evening; moving residence (the flat waits); every Legacy kind from the settlement and from acts, once each; perks (each effect live; Energy and Heat re-based) |
| Server — chapters | *Finish His Work* 4–12 (each requirement from milestones, the seven days, ch 7's Favour, ch 12's rosette and Legacy 30), *Clear His Name* 2 (Brandauer's entry), *Settle His Debts* 3 (the 100 Iron choice) |
| ~~Server — the season~~ **deferred (seasons)** | ~~the running score per boundary; the Season Election's +100; the finale (Champion, Presidents, awards with ties); four runners settle day 0 once; the cities' reset (halfway, the home floor, the council rule ended, the deck reshuffled); laws ended and a day-0 enactment kept; Heat 0 from the start; Champion and award Legacy credited on a read a season later; the Hall of Fame~~ |
| Server — integration (T18) | **a month on the test clock** (28 days, one term) with three players and test members: wardrobe, Dossier, an exposé, a patron to Associate, a flat lapsing and paid, a chapter by its milestone, a completed council term's Legacy, with the worker off for a week in the middle (~~the season, the finale and the rollover~~ deferred). Run ten times in a row |
| UI | fixtures for every new component and state (screens §15's empty states included) |
| E2E | §15.1 |

### 15.1 E2E specs (each its own Playwright project after slice 7's, in this order; all on the test clock)

Plus §24.11's `bodyguard.spec.ts` and `bar.spec.ts` (T32), after `flat.spec.ts`.

**`wardrobe.spec.ts`** (phone): a Level 6 member at the party store → **Buy · 800 Iron** → *Bought* → **Wear it now**; the Me tab's Coat card and *Charisma 5 → 12*; *Keep this as Town*; **PLAIN CLOTHES** one tap → *Charisma 2 · unnoticed on rival ground*; back to Town. The market's stall → **Sell something** → the standard coat → *Sell the standard coat for 20 Iron?* → *Sold*. Level 10 (hook) in Clearwater: the Promenade's call *needs Charisma 10* → **Call · 15 Energy** → the mission modal with *Favour: Julius Marr +2*.

**`dossier.spec.ts`** (phone, then desktop): a Level 16 player; *Three entries on a rival name* (hook) → the Dossier tab's dot → the `NameCard` with a full clock → **Make a Case File** → *Bound*; Herald House → **Take a Case File to the paper · 20 Energy** → the file and *The story, with a headline* → *Write it straight* (forced Success) → *Printed* with *Opinion in Eastside: {party} −1.0 · … · Legacy +2*; the next boundary → the front page with the player's name, and a second context's paper with the public line; the name card reads *in the paper*. A second file → Central Station → **Sell · 200 Iron** → *Sold*.

**`patron.spec.ts`** (phone): a Level 10 player at Herald House → the card (*A letter comes the morning after next.*) → **Gift · 200 Iron** → *Given* (*Favour 0 → 2*); two boundaries → the paper's Letters *From Edith Crane: …* → the act (forced) → *1 of 2*, *2 of 2*; the boundary → *Crane's Thanks* and Favour +6; *Crane at 29* (hook) and a gift → *Associate* (`patron-tier`) and *Recruit as an informant* enabled for a capital file.

**`flat.spec.ts`** (phone): Level 10 at home → the residence card **A flat in Coalport · 2,500 Iron** → the sheet → **Buy** → *Yours*; the chips gain **EVENING**; the next boundary's desk *Rested +25*; *Rent ran out* (hook) → *The Flat Waits* in the paper, the chip *pay the rent*, the desk *A rented room*; **Pay a week · 150** → *Paid* → Evening wearable as a set.

~~**`season.spec.ts`** (phone): season day 77 (hook) → *A Week to the Season Election*; the season card on the republic sheet; season day 0 of the next season (hook, with a forced Collective lead) → the front page *THE COLLECTIVE ARE CHAMPIONS OF SEASON 1* with *You: Legacy +5, Champion of Season 1* for a Collective member and *The map settled halfway…* for another; the Hall of Fame lists the season; the Me tab's Legacy and the title; **Take it · 10 Legacy** (*A better night's sleep*) → *Lasting*.~~ **Deferred (seasons).** The perk step moves to `chapter12.spec.ts`.

**`chapter12.spec.ts`** (phone): the ladder and milestones by hooks; *Finish His Work* chapter 12 → the result → *His rosette · wear it from the Me tab* and *Legacy +30*; the rosette worn as *On you*; the Me tab's Legacy block → **Take it · 10 Legacy** (*A better night's sleep*) → *Lasting* (moved from the deferred `season.spec.ts`).

### 15.2 Playtest report: life (design §18 Q12)

`pnpm report:playtest` gains a **life** section beside slices 5–7's: a pure builder in `packages/db/src/life.ts` with fixture tests, reading `characters`, `actionLogs`, `requestLogs`, `dossierEntries`, `legacyEntries`, `contributions` (~~`seasons`~~ deferred) (test members, `source: 'test'` items and boosted testers left out).

- **The Wardrobe:** items bought by tier and by day since joining; outfit changes per player-day and the share made **before a rival-ground journey** (a `wardrobe.outfit` to `plain` or a `dressOnArrival` within the hour before boarding); worn Charisma by day; sales.
- **The Dossier:** entries per player-day by source; the stale share; files made; exposés by outcome and angle; sales; informants.
- **Patrons:** Favour per patron per player-day; days from the first visit to each tier; Requests arrived, done, expired.
- **The home:** flats bought (day since joining), lapses, days lapsed before paying again.
- **Legacy:** perks taken; Legacy by day 30.
- **The question:** the share of players with **at least one unfilled clock** at day 14 (a name at two entries' worth or more, a patron within 30 of a tier, a chapter dated, rent paid ahead, an informant reporting) **against their day-21 return rate**, and the same for players with none.

---

## 16. QA playtest checklist (the slice question, in play)

Run on `pnpm dev:mem` with the dev panel and the clock hooks; testers across the three factions, test members for the rest.

- [ ] **Dressing:** one tap per change; the chip line says *recognised* / *unnoticed*; *Keep this as Town* only when nothing matches; nothing saved by accident; no modal.
- [ ] **Shops:** the coat bought where you stand, one tap under 1,000 and a confirm over; selling always confirmed; keepsakes never offered; the record's surcharge line.
- [ ] **Charisma both ways:** a society call opens as Charisma rises; the greatcoat at night on rival ground makes run-ins likelier, plain clothes quiet them; the journey's *Change into plain clothes* works without stopping.
- [ ] **The Dossier:** an entry by luck in the first days; a name's clock filling; a Case File; the exposé in three taps, resumed after closing the tab; the front page with your name; a sale at the station.
- [ ] **Patrons:** a Request in the paper, done by ordinary play, thanked the next morning; the Favour bar; the first perk.
- [ ] **The flat:** bought, the rent lapses, the flat waits, nothing is taken, one tap restores it.
- [ ] **Legacy:** entries appear for terms and titles; a perk taken; the profile shows the figure.
- [ ] ~~**The season:** the card's countdown; the week's notice; the front page; the Hall of Fame; the map halfway back; coats, flat and Dossier where they were.~~ Deferred (seasons).
- [ ] **Being away costs nothing:** a player away a fortnight finds Favour where it was, the flat waiting, informant entries in the Dossier and no arrears.
- [ ] **Vocabulary:** no *inventory, equipment, slot, tier, armour, CHA, loadout, Black Market, NPC* anywhere; no odds as a number; no weapon anywhere.
- [ ] **Do players have goals for the next month, not just the next session?** Ask:
  - Which clock were you watching when you closed the game today?
  - What were you saving Iron for, and how many days away was it?
  - Did you change clothes before a trip to rival ground? Why?
  - ~~What would you have to do to be Champion, or win an award, and did that change what you did this week?~~ (deferred with the season)

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| **The settlement grows** (Rested at boundaries, patrons, informants, gossip, Legacy, milestones) | Each is a pure function over the same window; the extra reads happen only when the character has something due (informants, a patron at Acquaintance, an office); measured in T14 (the settlement's p95 within 15 % of slice 7's) |
| **Entry landing touches many paths** (eight sources, the settlement) | One helper (`landEntry`) used by every source, tested per source with the forced hook; the knock-on shape is shared |
| **Personal modifiers diverge from the place's** | A separate, small DSL with its own tests; the check and reward functions take both lists; an item tag and a council rule's tag look the same on a ticket |
| **Recognition makes rival ground unplayable for office-holders** | It is the design's trade-off (economy §22.2, Appendix C #75); plain clothes halve the office part; the report measures outfit changes before journeys; one constant to change |
| **Legacy double-credit** (a term in two settlements, a replay, the backfill) | Window arithmetic plus the unique `ref`; the backfill and the settlement use the same refs |
| ~~**The season finale's transaction**~~ (deferred) (aggregations over the season's awards, sign-ups, files and contributions) | Each aggregation is indexed and bounded by the season's days; measured in T18's integration run; the fallback is a guarded second transaction with a step marker on `nation.season` |
| ~~**The rollover splits across city and nation boundaries**~~ (deferred) | Each part is owned by the document it writes; the order (cities, then the nation) is ADR 0043's; a test settles cities in random order and checks the snapshot and the reset |
| **Missing places** (no `press` in Coalport or Duskwall; Coalport's and Ashford's stations in teaser quarters) | Built on the places that exist (§22.1 Q33); the Dossier's uses need Level 16, by which time the train runs |
| **Transcription volume**: 29 items, 20 shop rows, the Front (4 places, 8 actions, 16 texts), 8 calls, 12 Requests, 20 lines, 11 chapters (33 texts each way), 17 lines in five voices, ~250 copy strings | Word-for-word tests against both design documents; the designer transcribes the four other voices of the personal lines in the content change, as slice 7's |
| ~~**The first season locally is partial**~~ (deferred) | Season 1 will be the season in progress when the feature ships (§22.1 Q45) |
| **The month-long goal without the season** (the user's deferral, 16 Oct 2026) | The design already rests the slice's question on the Dossier, patrons, the flat, Ambition #1 and Legacy (design §20 #7, Appendix C #80); the report's *unfilled clock* measure (§15.2) needs no season |
| **The lapel badge's picture** reads as one party's colour | §22.1 Q34; a crop now, a decision before launch |

---

## 18. Idempotency and atomicity summary

- **Dressing** (`wear`, `takeOff`, `outfit`, `keep`): a set-to-state update under the version guard; a replay is a no-op (ADR 0008).
- **Dressing on arrival:** the journey's `dress` set-once while `onTheWay`; applied inside `settleArrival`'s conditional update (journey `onTheWay → arrived`), so once whoever runs it.
- **Buy, sell, bribe, gift, favour, rent, flat, perk:** one transaction on the character with an ADR 0008 request key; `iron ≥ price`, `pc ≥ cost`, `total − spent ≥ cost` in the filter; the day's limits (`today.gifts`, `today.bribe`) and the week's (`favourDay`) read in the session.
- **Entries:** landed in the act's own transaction (keyed by the act), the count under the character's version guard; the settlement's entries inside its `day.settled` guard.
- **Binding, selling, turning, attaching:** each filters the rows on `status: 'held'` and writes the new status in its transaction, with a request key (`attach` rides the event call's key).
- **The exposé:** step 1 set-once (`expose: null`); step 2 `keyedAction('expose')` (ADR 0002): the stored result replays; the file's `held` guard and `today.expose`; the Legacy row's unique ref.
- **Requests and Favour from the calendar:** inside the settlement's guard; a Request is removed when paid, so it is paid once.
- **Legacy rows:** the unique `{ characterId, ref }`; `legacy.total` moves only in the same transaction as an insert.
- ~~**The season:** `seasons._id` unique; `nation.season.index` filtered on the old index; the cities' reset inside each boundary's `world.settledDay` transaction.~~ Deferred (seasons).
- **Request kinds** added: `shop.buy`, `shop.sell`, `shop.bribe`, `dossier.bind`, `dossier.sell`, `dossier.turn`, `patron.gift`, `patron.favour`, `home.buyFlat`, `home.payRent`, `legacy.takePerk`, and §24's `bodyguard.hire`, `bodyguard.renew`, `bar.round`, `bar.meal`, `bar.dinner` (§24.8). Action kinds: `expose`.

---

## 19. Deliberately left out of slice 8

| Left out | Why / where |
|---|---|
| The v3.0 bodyguard modifiers, auto-renew, the barman's report, the stimulant, recruitment, street food, the society dinner | §24.12 |
| **The Political Season**: the 84-day calendar, the score, the Season Election's +100, the Champion, four awards, the Hall of Fame, the rollover (meters halfway, laws and council rules ended, Heat to 0, the deck reshuffled), Legacy from seasons, the season's paper lines, its hooks and spec | The user, 16 Oct 2026: "let's leave the seasons for later". ADR 0058 *Deferred*; the list and the forward-compatibility rules are in the note at the top |
| Weapons as items, a weapon slot | Design §3.1, GDD §20.3, Appendix C #74 (the user's point 1) |
| Crafting, mission drops, player trading | GDD §21.3, §18.4: post-MVP |
| Blackmail and Denounce | Appendix C #78 (the user's point 8) |
| Voss, Draganov and Reinholt; halved Favour for a rival-leaning patron; "two active patrons" | GDD §17.2, §25: the next patron batch |
| The townhouse, the villa, a second flat, the home's map marker | GDD §17.4, §25 |
| The season track (free and premium), Season Twists | Appendix C #80; the twist's swing multiplier is a parameter with no source |
| *Lodged*, *Weatherproof* | GDD §6.7: not built (the Well-Fed buffs and *In Good Spirits* are added scope, §1.1) |
| A Legacy entry for a rule that won | Not designed (voting rework §17) |
| Charisma's and Legacy's appeal on the national score; Notorious's −5 % vote appeal; the Protégé's "+1 % national" | Not pinned for slice 8 (GDD §8.2 points it at slice 9) |
| The society venues' record and Heat rules (*Wanted* barred, *On file* +5 Charisma) | Not pinned by the design (§22.1 Q11) |
| Political Protection (Rank 4) | GDD §11.4 |
| Players as Dossier names | GDD §10: v1.5 |
| The reporter job's daily entry | GDD §10.2: waits for the job |
| *Clear His Name* 3 and *Settle His Debts* 4 | Written with the next slice that touches them (design §8) |
| Renaming outfits | Design §3.3 (the user's point 3) |
| Hosting, Atlas and deploying | Local only until the end |

---

## 20. Task list (in order; each task leaves `pnpm lint typecheck test` green and is one commit)

**Before T1:** slices 5, 6 and 7 are built and their Deviations are read (the names this design leans on: `wornStats`, `equippedItems`, `yourPower`, `runInChance`, `runInChances`, `MISSION_TYPES`, `resolveMission`, `missionGate`, `strikeOldest`, `liveMarks`, `applyAgainst`, `rivalPressure`, `eventService.call/withdraw/resolve`, `faction.profile`, `touchPresence`, `addInfluence`'s scopes, `TERM`, `termOf`, `nation`, `processNationBoundary`, `nationalElections`, `laws`, `officeTerms.office`, `offices[]`, `settleArrival`, Clearwater's content). The designer's answers to §22.1 are in, or the defaults are taken. The pictures are in `art-direction/mvp/` (they are).

**Seasons deferred (16 Oct 2026).** The tasks below are rewritten to build without the season (the note at the top). T15 is deferred whole; its number is kept so the other tasks keep theirs. Struck-through text is the season's part, to pick up with it.

**Parallel lanes.**

- **Phase A:** T1 first. T2, T3 and T4 need T1 and run in parallel. T5 needs T1–T4's types. T6 needs T5. T7 runs alongside T5–T6 (it needs only the asset ids). T8 needs T5's types and runs alongside T6–T7. **Added 16 Oct (§24):** T26 (rules) needs T1 and can start now; T27 (content) needs T5 and T26's types; T28 (art) rides T7; T29 (db) rides T8.
- **Phase B:** T9 first. T10 and T11 start after T9, in parallel. T12 needs T11. T13 needs T9 and T11. T14 needs T9 and T13 (the settlement's patrons). ~~T15~~ (deferred). T16 needs T11–T14. T17 starts with T9 and grows with each task. **Added (§24):** T30 needs T9, T10 (the party store's card) and T29; T31 needs T9 and T29; T30 and T31 run in parallel and before T16 (the paper's two lines and the *Ahead* clock). T18 last.
- **Phase C:** UI T19 can start after T5, on fixtures, alongside phase B. T20 needs T9, T10 and T14; T21 needs T11 and T12; T22 needs T13; T23 needs T16; **T32 (§24) needs T19's patterns, T30 and T31**. Then T24 and T25.

### Phase A — rules, content, art, db

**T1. Rules: the Wardrobe, shops, personal modifiers, recognition.** §6.1's constants (not `SEASON`; `LEGACY.points` without `champion` and `seasonAward`); `items.ts` v2 (four slots, `wornCha` with the flat, `outfitOf`, `wearGate`, `defaultOutfits`, `withoutUid`, `coatTier`); `shop.ts`; `personal.ts` (`itemBonuses`, `personalFxpShares`, `dossierChanceOf`, the perk effects, `perkHeatCoolPct` into `coolRate`); `recognition.ts`; the changed `yourPower`, damage, `runInChance`, `runInChances`, `actionEnergy`, `computeRewards`, `tier2Rewards`; `MISSION_TYPES.social`; `missionGate`'s door. Heat's projection is unchanged (no `heatAt`). *Done when:*
- economy §22.2's worn Charisma by day reproduces (2 · 12 · 18 · 20 · 30 · 34 · 50);
- the recruit's Fight is 29 % → 41 % with a Tier II coat;
- recognition gives 30 for a Governor in a greatcoat at night and 0 for a new player, and plain clothes halve the office part;
- the press pass gives +10 (never +20) on a surveillance mission, and every slice 1–7 rules test passes unchanged.

**T2. Rules: the Dossier and the exposé.** `dossier.ts` (capacity, freshness, weights, `pickName`, `rollEntry`, binding, selling, turning, informant reports, the exposé's gate, difficulty, swing and rewards); `applyToNeutral`; `feedMatches` for `expose`. *Done when:* §6.13's Dossier and exposé tests pass, including the 2-in-3 rival draw over 10,000 draws and the swing modes at a home floor. (Unchanged by the deferral.)

**T3. Rules: patrons, the home, Legacy, chapters, the endorsement in the counts.** `patrons.ts` (`addFavour`, `patronDays`, `requestMatches`, `advanceRequests`, `favourReady`, `protege`); `home.ts`; `restedCapFor` v2, `projectEnergyThrough` with `restOn`, `settleDays` with the Monday perk; `legacy.ts` (`perkGate`, `legacyFromWindow`, `milestonesAfter`; ~~`seasonCredits`~~ deferred); `chapterStatus` with the new requirements and a choice's Iron; **`CountLine.bonus` in `countSeats` and `scoreBonus` in `districtScores` / `countBattleground`** (moved here from T4: the Protégé and *A name they know*). *Done when:* economy §22.5's tier days hold within a day for the three players, Rested is banked once per boundary over a three-day gap, every non-season Legacy kind is produced once from its facts, and the Protégé's +2 changes a seventh seat in a test count.

**T4. Rules: the paper; types.** §11.2's personal conditions in `selectHeadlines` (not `seasonWeek`, `seasonCountdown`, `seasonFront`); §6.12's and §8.3's types and errors (not `SeasonCardView`, `HallOfFameView`, `NationView.season`, the `titles` fields); `ACTION_KINDS` += `dossierEntry`, `expose`. ~~`season.ts`; `drawIssues`' reshuffle at a season start~~: deferred. *Done when:* each §11.2 personal condition is selected from a fixture's facts and `pnpm typecheck` is green across the repo.

**T5. Content: schemas, accessors, cross-checks.** §4.1–§4.2, the `GameContent` accessors, a failing fixture for each check (no season national-line ids). *Done when:* every §4.2 check has a failing fixture and the existing content validates (new arrays empty or defaulted until T6).

**T6. Content: the catalogue, shops, the Front, patrons, the Dossier, chapters, lines.** `items.ts` (nineteen items and ten keepsakes; `keepsakeFrom` on the earlier keepsakes); `shops` on the twenty places; the Front's four places, eight actions, sixteen texts, blurbs; the eight calls; `patrons.ts`; `dossier.ts`; `extraNames`; the surveillance and theft missions' `dossier` (from the designer, §22.1 Q12); *Finish His Work* 4–12, *Clear His Name* 2, *Settle His Debts* 3; the informer's and the held taps' `dossier`; the personal lines in five voices; screens §17's copy, the help notes, the modal texts, the Legacy words and perks (no Champion or award words). ~~The season's national lines~~: deferred. *Done when:* the word-for-word tests against both design documents pass (the season's sections skipped), every Front pin equals `mapPins.clearwater`, and both vocabulary guards pass.

**T7. Art.** §13's twenty-two catalogue entries, `Location.scene` on the Casino and the Lido, `content.art.lifeScenes`, the badge's crop, `pnpm art:build`, the budget measured and recorded. *Done when:* `art:check` passes, the dev viewer shows all twenty-two with their crops and focus points, and the designer has confirmed the alt texts and the content-policy read (the jacket's collar, the rosette, the badge's colour). (Unchanged: no art was the season's own.)

**T8. DB.** The two new models and their indexes (§5.1–§5.2; not the spymaster's partial index), the changed fields and enums (`campaignEvents`, `journeys`, `actionLogs`, `influenceLedger` `expose`, `requestLogs`, `characters` without `legacy.seasonCredited`), migration 012 with the milestones and the Legacy backfill (steps 1–3; ~~step 4, `nation`~~ deferred). ~~`seasons`, `nation`, `contributions` `season|{s}`, `laws.endedBy: 'season'`~~: deferred. *Done when:* migration 012 run twice changes nothing the second time, the backfill equals a seeded history's sum, the unique `{ characterId, ref }` refuses a duplicate, and a transaction over every touched collection commits on the memory replica set.

**Added 16 Oct 2026 (§24, ADR 0088): bodyguards and the bar, phase A.** *Done when* means a scratch script or a Playwright spec (§24 opening), not a new unit test.

**T26. Rules: bodyguards and the buffs (phase A).** `BODYGUARD`, `BAR`; `bodyguard.ts` (`contractCounts`, `lastDay`, `goneToday`, `hireGate`, `hire`, `renewGate`, `renewed`, `canRenew`); `runIn.ts` (`minder` and `minded`, `minderChance`, `runInChances`' third argument, `luckChoice`, `resolveRunIn`, `cause: 'minder'`); every `'talked'` reader in `packages/rules` also takes `'minded'`; `buffs.ts` (`wellFedAt`, `roundGate`, `mealGate`, `afterRound`, `afterMeal`, `mealHealth`); `PersonalModifiers.buffs`, `buffShares`, `spendSpirits`; the `bodyguardLast` and `bodyguardGone` conditions; §24.6's views, the result acts `hired`, `renewed`, `round`, `meal`, `dinner` and the new error reasons in `types.ts`. *Done when:* a scratch script prints §24.11's rules checks (the odds table, luck, both run-in branches, the renew limit, every gate, the buff shares at the clock's edge, rounds to nine, Health to max) matching the design, and `pnpm typecheck` is green.

**T27. Content: the hire card, the bar, the dining room, the words (phase A).** `data/bodyguards.ts`; `Shop.hire` on every party store; `Location.bar` on every bar and `dining` on the three dining rooms; §24.3's cross-checks; the copy, help notes, modal texts, receipt labels and the two headlines in five voices (the designer's four other voices in the same change). *Done when:* the content loads in `pnpm check`, and a scratch script feeding one broken fixture per new cross-check prints each refusal.

**T28. Art: three portraits and two items (phase A, with T7).** `portrait.doorman`, `portrait.steward`, `portrait.minder`, `item.round`, `item.bar-plate` from `art-direction/mvp/`; `pnpm art:build`; the budget and the content-policy read recorded. *Done when:* `art:check` passes and the dev viewer shows the five.

**T29. DB: the contract, the buffs, the encounter (phase A, with T8).** §24.4's fields on `characters` and `encounters`, the enums, the request kinds, migration 012's additions. *Done when:* a scratch script on the memory replica set runs 012 twice (no change the second time) and reads an old encounter with `minder: null`.

### Phase B — the server

**T9. Server: the Wardrobe and personal modifiers.** `wornStats` v2 (four slots, the flat), `personal` on `LoadedCharacter`, `wardrobe.*`, `dressOnArrival` and `settleArrival`, item rows and Party XP parts in every action and mission, `coatTier` in run-ins, recognition on rival ground (and `presence.recognised`), the Papers slot at the checkpoint and in *Talk your way out*. *Done when:* the Wardrobe and rival-ground server tests of §15 pass, and every slice 1–7 server test and e2e spec passes unchanged.

**T10. Server: shops.** `shopService` (`buy`, `sell`, `bribe`), the shop cards on `CityView`, the record's surcharge, the first coat's fact. *Done when:* the shop tests of §15 pass, including one of each and a saved coat falling back to the kit.

**T11. Server: the Dossier.** `landEntry` and its eight callers, `dossier.*`, the station's card, informants and gossip in the settlement, stale-tomorrow facts. *Done when:* the Dossier tests of §15 pass, including four parallel landings at the cap and a five-day absence's informant reports once each.

**T12. Server: the exposé and the Headline Story.** `exposeService` (`get`, `choose`, `attempt`), the swing in the name's town or district with the cap, the burn, Legacy, the public line's read, `events.call`'s `caseFileId` with its return on withdrawal and its spending at resolution. `contributions` gets the place and faction scopes only (~~`season|{s}`~~). *Done when:* the exposé tests of §15 pass, including a retry that does not double Legacy and a Failure that keeps the file.

**T13. Server: society calls, the Front, patrons.** The `social` type through `missionService`, the late table and the morgue file, `patronService` (`get`, `visit`, `gift`, `favour`, `crossInTx`), Request progress in every act, the endorsement in the counts (`CountLine.bonus`, `scoreBonus`, read from the candidates at the count). *Done when:* the patron and call tests of §15 pass, including each of the twelve Requests advanced by its real act.

**T14. Server: the settlement v8, the home, Legacy, chapters.** The settlement's §8.2 steps (Rested at boundaries, the Monday perk, `patronDays`, informants, Legacy from the window, milestones; ~~Legacy from seasons~~ deferred); `homeService`; `legacyService` and `faction.profile`'s Legacy (no titles); the eleven chapters with their requirements, Iron, Favour, Dossier entry and completion. *Done when:* the home, Legacy and chapter tests of §15 pass, a twelve-day absence credits everything once, and the settlement's p95 is recorded.

**~~T15. Server: the season.~~ Deferred (seasons, 16 Oct 2026).** ~~The running score in `processNationBoundary`, `seasonFinaleInTx`, `seasonResetCity` in the three city boundaries, the laws' end, `heatAt` on every read, `season.hall`, `nation.get`'s season card, the season credits in the settlement.~~ Nothing replaces it: `processNationBoundary`, `cityDay.ts`, the Heat read and `nation.get` stay as built.

**T16. Server: the paper v8.** Letters (Requests, informants, gossip), the desk's rows and Ahead clocks (without the Season Election), §11.2's stored headlines, the exposé's front page and public line, *While You Were Away* (Requests, informants, Legacy). ~~The season's lines and front page~~: deferred. *Done when:* each §11.2 personal headline is produced from its facts in a test and the Letters order matches design §10.2.

**T17. Server: test hooks and the dev panel.** §8.6–§8.7 without the season (no `POST /api/test/season`, no *Season* buttons or status fields). *Done when:* `devPanel.test.ts` covers each new button and status field, and every hook is absent without `E2E_TEST_HOOKS`.

**Added (§24): bodyguards and the bar, phase B.**

**T30. Server: bodyguards (phase B).** `bodyguardService` (`hire`, `renew`); the hire card on `CityView`; `CharacterView.minder`; the run-in row written with every encounter (tier-1 taps and missions), `encounter.choose`'s `minder`, the auto path; the run-in's modal and `RunInView` with his lines and portrait; every `'talked'` reader in `apps/server` takes `'minded'`; the settlement's `bodyguard-last` / `bodyguard-gone` headlines and the *Ahead* clock (with T16); §24.9's hooks and dev-panel buttons (with T17). *Done when:* a scratch script against `pnpm dev:mem` (the hooks) hires a doorman, fires a forced mission run-in with his row working (+10 XP, the mission paid) and failing (the fight at −10), sees the row dimmed against the police, lapses him and reads the paper's line with Iron unchanged, and replays a hire with the same key to the same modal.

**T31. Server: the bar and the buffs (phase B).** `barService` (`round`, `meal`, `dinner`); the bar and dining-room cards on `CityView`; `CharacterView.buffs`; `buffShares` in every tier-1 action and mission (the encounter's `createdAt` after a run-in), `spendSpirits` in the mission's update; §24.9's buff hooks. *Done when:* a scratch script against `pnpm dev:mem` buys a plate (Health +15 up to max), shows *Well fed · +10 % XP* on a forced mission's receipt, buys three rounds and sees *In good spirits · 2 left* then 1 then 0, is refused a fourth round and a plate over a dinner, and sees the line gone after the clock passes `until`.

**T18. Server: the integration suite.** §15's **month on the test clock** (28 days, one term; three players and test members: the Wardrobe, the Dossier, an exposé, a patron to Associate, a flat lapsing and paid, a chapter by its milestone, a completed council term's Legacy) with the worker off for a week in the middle. *Done when:* it passes ten times in a row and the settlement's time after the week away is recorded in the Deviations.

### Phase C — the client, e2e, report, docs

**T19. UI package.** §12.2's components and changes with fixtures and smoke tests (screens §15's empty states included; not `SeasonCard` or `HallOfFamePage`). *Done when:* each fixture test passes and the existing UI tests pass.

**T20. Client: the Me tab, shops and the journey.** The Wardrobe block, chooser and sheet; Patrons, Where you sleep and Legacy blocks; shop cards, the sell sheet, the back room's row on place sheets; the residence card's flat; the journey's dress line; the plate's and tickets' recognition words. *Done when:* `wardrobe.spec.ts` and `flat.spec.ts` pass and the Me tab's layout check at 375 × 667 passes.

**T21. Client: the Dossier and the exposé.** `/dossier` with its three chips, the station's card, `/dossier/expose`, the Headline Story's *Attach a Case File*. *Done when:* `dossier.spec.ts` passes on phone and desktop and the Dossier's layout check passes.

**T22. Client: patrons, the Front and society calls.** The patron card, Requests in Letters and on the card, the Front's places, the society tickets and their door. *Done when:* `patron.spec.ts` passes.

**T23. Client: the paper.** The paper's new rows, `ClockRow`, the exposé's front page and page-three line, the Legacy block's perk. ~~The season card, `/republic/hall`, the season's front page~~: deferred. *Done when:* `chapter12.spec.ts` passes (with the perk step moved from `season.spec.ts`), and the paper's rows render in `dossier.spec.ts` and `patron.spec.ts`.

**Added (§24): T32. UI and client: the hire card, the run-in row, the bar (phase C).** `packages/ui`: `HireCard`, `HireRow`, `MinderRow`, `BarCard`, `DiningCard`, the run-in sheet's first row with his portrait, the buff line under the stats, `ResultModal`'s five new acts and the *Got away* stamp with his line (screens §18). `apps/client`: the cards in the place sheet's slot (the party store: shop above hire; a bar: the bar's card above the back room), the Me tab's *Walking with you* row and buff line, the invalidations (`character.me`, `city.get`). *Done when:* `bodyguard.spec.ts` and `bar.spec.ts` (§24.11) pass on phone, and the run-in sheet with five rows and the party store's sheet pass the layout check at 360 × 640.

**T24. E2E, vocabulary, report.** The seven Playwright projects after slice 7's (`wardrobe`, `dossier`, `patron`, `flat`, `bodyguard`, `bar`, `chapter12`; ~~`season`~~ deferred); §24.11's report lines; the vocabulary test over slice-8 strings; §15.2's *life* section with a pure builder. *Done when:* the whole e2e suite is green locally and a report run after it prints every *life* line.

**T25. Docs.** The README (the new buttons; walk-throughs: dressing for rival ground, a Case File to the front page, a patron to Associate, a flat that lapses, a doorman who steps in and then goes home, a plate and a round on the receipt, **a month in an afternoon on the test clock**; ~~a season in an afternoon~~ deferred), the **Deviations** section at the end of this file, ADR statuses (0058 stays *Deferred*), the plan's §5 row for slice 8 (§23 #5), the GDD edits for any answered §22.1 question that changes a number. *Done when:* the README's steps reproduce each walk-through from a fresh `pnpm dev:mem`.

---

## 21. Answers to the design's questions (design §18)

1. **Slots and effects.** As suggested, with three changes (ADR 0051, 0052):
   - `ItemSlot` becomes the four, and `ItemSpec` gains `effects`, `price`, `level`, `rank`, `factionId` and `members`; a keepsake with a slot is wearable;
   - **armour is not stored**: it is the coat's tier's (`armourOf`, already in slice 5), so a coat cannot disagree with its tier;
   - **which outfit is worn is computed**, not stored: `outfits { town, plain, evening }` plus `lastOutfit` (the name *Keep this as …* offers); a chip is inverted when its saved set equals what is worn.
   Worn Charisma adds the flat's +2 when the flat is paid, its city is the residence, and the player stands in it. Items stay catalogue content; `inventory[]` and `equipment` stay as ADR 0014.
2. **Shops.** `Location.shops[]` (not `shop?`), because the Mountain Inn carries the tailor and the back room, with `{ kind, items, buys, bribe }`; the kicker and line come from copy by kind. The catalogue holds the price. A buy is one conditional update (`iron ≥ price`, the version) after the Level, Rank, faction and membership gates read in the session, with the surcharge computed server-side, and a request key.
3. **The Dossier.** A collection, `dossierEntries`, as suggested; Case Files are rows of kind `file` with `lines`, `kinds` and `weight`; informants are files with `status: 'informant'` and `{ fromDay, untilDay, reported }`. Two changes (ADR 0053):
   - **no `dossier.count` on the character**: the slot count is a count in the session, safe because every landing writes the character under its version guard in the same transaction, so a counter that could drift is not needed;
   - **informants report in the character's settlement**, not the day job: the world never writes a character (ADR 0020), and the settlement already walks each boundary once.
4. **Entry chance.** As suggested: one roll in the act's transaction from a named stream of the act's seed (`seed:dossier:{row}`), after the check, so it never disturbs the check's or the run-in's rolls; the knock-on carries the result, and the dev panel the chance and roll. The subject is a rival's two times in three, otherwise the actor's own party's (§22.1 Q16).
5. **The exposé.** A story with the chapter's shape, as suggested, but **not** inside `ambition`: `characters.expose { fileId, angle, locationId, day }` is its own pointer (step 1 set-once), and step 2 is a keyed game action (`actionLogs` kind `expose`) through ADR 0013's shared retry helper. The swing uses ADR 0022's and ADR 0034's opinion writes **in the name's town (its district in the capital)**, with a new `applyToNeutral` for *the facts, plainly* (ADR 0054).
6. **Patrons.** Embedded as suggested (an array of ≤ 2 for Mongoose), with `tierDays`, `favourDay`, `discretionUntil` and `next` (the rotation). Requests resolve with the orders' matcher extended (`requestMatches`: no rival-ground exclusion, `missionTypes`, the request's own district). **The +6 is paid by the character's settlement at the boundary**, not by a day job: a job may not write characters (ADR 0020), and the settlement computes arrivals, expiries and payments by calendar arithmetic for any absence (ADR 0055).
7. **The flat.** `home.flat { cityId, boughtDay, paidThroughDay }` (an inclusive day key) rather than `{ kind, cityId, paidUntilDay }`: *a rented room* is the absence of a flat. Rested at the boundary and the cap read it per day; the Evening chip needs `flatCounts(today)`. Buying and paying a lapsed flat re-base Energy at the tap (ADR 0056).
8. **Legacy.** **Not embedded entries**: the record grows for ever (a council term every five days), so the rows go to `legacyEntries` with a unique `{ characterId, ref }`, and the character keeps `legacy { total, spent, perks }`. (Deferred with the season, 16 Oct 2026: `seasonCredited`, and the awards and the Champion **credited lazily by each member's settlement** from the `seasons` documents, so the season job writes no character and a member who returns a season later still gets them; ADR 0057.)
9. **The season. Deferred (16 Oct 2026); the answer stands for when it returns.** `seasonOf(day)` beside `termOf` and a `seasons` collection, as suggested. The rollover is **not** one job of its own: each city's boundary into season day 0 moves its meters halfway and ends its council rule as its last step (the city's own transaction), and the nation's day writes the finale and ends the laws after seating the Season Election. Heat to 0 is lazy (ADR 0058).
10. **Recognition.** A pure function as suggested, with the night read at the act's time and the office from the `offices[]` projection; added to the run-in chance on rival ground before the clamp. The client shows the server's word (*Recognised · run-ins likelier* / *Plain clothes · unnoticed*), never the figure (ADR 0052).
11. **Test hooks.** §8.6 covers each: grant items (and so set worn Charisma), force an entry, force a Case File, step the season day, the Season Election through the term and season hooks, force Favour, force the rent's lapse (~~step the season day, the Season Election~~: deferred). The four e2e flows you list are `wardrobe.spec.ts`, `dossier.spec.ts`, `patron.spec.ts` and `flat.spec.ts`; `chapter12.spec.ts` adds the Ambition's end and a Legacy perk (~~`season.spec.ts`~~ deferred) (§15.1).
12. **The playtest report.** §15.2 covers every number you listed, with the question's measure: the share with an unfilled clock at day 14 against their day-21 return.
13. **The vocabulary test.** As you list it, plus *weapon* refused; *The Front* keeps its allowance (§12.4).

---

## 22. Questions

### 22.1 For the game designer (each has a default so the build does not wait)

**All fifty settled 4 Oct 2026** (`docs/design/slice-8-life.md` §21.1, the same numbers; the deviations from the default: Q4 eight weeks ahead, Q11 pinned, Q29 two Issues, Q30 the hint rewritten, Q32 the texts written, Q33 the press pass and camera at the party store too, Q34 redrawn neutral).


**The Wardrobe and shops**

1. **Who buys what.** Design §3.5 says a shop buys back "at a tenth of its own prices", but screens §3 says a party coat "sells for 80 Iron at a market", and the market does not sell it. **Default:** the clothes stall buys anything sellable at a tenth of the catalogue price (`buys: 'any'`); every other shop buys only what it sells (`'own'`). **Settled** (design §21.1 #1).
2. **Selling an item saved in an outfit** (not worn). **Default:** allowed; it leaves the outfit (a coat falls back to the faction's work clothes), and the confirm sheet and the `sold` modal add *It's in your {outfit} outfit* / *Taken out of your {outfit} outfit*. Please write the two strings. **Settled** (design §21.1 #2).
3. **The surcharge's rounding.** **Default:** whole Iron, half up (800 → 920; 150 → 173). **Settled** (design §21.1 #3).
4. **Prepaying rent.** **Default:** no limit (the GDD names none). **Settled** (design §21.1 #4).
5. **Buying the flat.** **Default:** standing in the residence city (the residence card is the city's); the rent can be paid from anywhere. **Settled** (design §21.1 #5).
6. **A flat in a town you don't live in.** **Default:** all its bonuses (+25, the cap, *Evening* as a set, +2 Charisma) need its city to be the residence; the +2 also needs standing there. **Settled** (design §21.1 #6).
7. **The *Evening* set when the flat is bought.** **Default:** what is worn at the purchase. **Settled** (design §21.1 #7).
8. **Forged papers at the checkpoint.** Cards never fail, and *Show your papers* is unchecked (the Cool-and-Clean gate). **Default:** with forged papers in the Papers slot, *Show your papers* becomes a Charisma check at the card's difficulty 14 with the papers' +10 in place of the gate; its Partial is the party card's (+10 Heat, *Watched*; the papers kept); the `checkpoint` bonus also applies to *Talk your way through*. The press pass passes as the party card does. **Settled** (design §21.1 #8).

**Society calls**

9. **Party XP.** The design is silent; economy §22.3 says "a call pays none". **Default:** none. **Settled** (design §21.1 #9).
10. **The Level a call opens at.** **Default:** Level 10 (the train; the reference player meets them there). **Settled** (design §21.1 #10).
11. **The record and Heat at society venues.** GDD §6.4 (*Wanted*: "barred from high-society venues") and §11.3 (*On file*: "some venues need +5 CHA") wait for the Wardrobe, and the design does not pin them. **Default:** not built. Please pin them or drop them. **Settled** (design §21.1 #11).
12. **The morgue file and the missions' named figures.** "An entry on a name of the player's choosing" and "Iron 60" (the tier-2 rate on 12 Energy is 48); the surveillance missions' `dossier.subject` (economy §22.4's "watching one name"). **Default:** a name picker on the briefing (the capital's names); Iron at the tier-2 rate (48); no mission names a figure until you list them (each surveillance mission then lands on a random name of its target party). **Settled** (design §21.1 #12).
13. **The late table's pay.** **Default:** Favour +3 on a Success and +1 on a Partial; the asset entry on a Success. **Settled** (design §21.1 #13).

**Recognition**

14. **What the night doubles.** **Default:** the Charisma and office parts together; the Legacy part is not doubled (so *a Governor in a greatcoat at night adds 30*). **Settled** (design §21.1 #14).
15. **The office.** **Default:** offices held now (the projection), not offices held before. **Settled** (design §21.1 #15).

**The Dossier**

16. **The third of entries that is not a rival's.** **Default:** a name of the actor's own party; a name with no party (Brandauer) is never drawn. **Settled** (design §21.1 #16).
17. **Exposing your own party, or a name with no party.** **Default:** refused (*Not against your own party* / *Nobody to print it against*); such files can still be sold or turned. Please write the two strings. **Settled** (design §21.1 #17).
18. **The burn's scope.** **Default:** per player (your own exposé or Headline Story). The alternative is republic-wide (a scoop): another player's file on the name could not be printed for 14 days. **Settled** (design §21.1 #18).
19. **"Nothing new for {n} days"** on a burned name. **Default:** no exposé on it; entries still land. **Settled** (design §21.1 #19).
20. **Whose name an informant reports.** §4.2's table says "the informant's name"; §4.4 says "a name of that city". **Default:** §4.4. **Settled** (design §21.1 #20).
21. **How many reports.** **Default:** seven (days +2, +4 … +14). **Settled** (design §21.1 #21).
22. **What binding takes.** **Default:** every held entry on the name (fresh and stale), so a player who waits for five lines' worth gets the easier check. **Settled** (design §21.1 #22).
23. **A Request matched by entries.** **Default:** entries from any source count, the patron's own gossip included. **Settled** (design §21.1 #23).

**The exposé**

24. **Rival ground.** **Default:** no run-in anywhere (an exposé is legal, and the paper is indoors); the press place's rival-ground check row applies when the paper is on rival ground; the 2-point cap applies when the name's town is its party's home. **Settled** (design §21.1 #24).
25. **Where the swing lands.** **Default:** the name's town (its district in the capital), wherever the paper is. **Settled** (design §21.1 #25).
26. **What counts as printed.** **Default:** Legacy +2 on a Success only; *Something I can print* on a Success or a Partial; a Failure uses the day's one exposé (the editor read it). **Settled** (design §21.1 #26).
27. **The plain angle and the ledger.** All of the swing goes to Neutral, so by ADR 0034's rule the actor's contribution is 0 (no hero credit, nothing towards *Top of the ledger*). **Default:** as ADR 0034. The alternative counts the amount moved. **Settled** (design §21.1 #27).
28. **"A front-page line with your name in every paper."** **Default:** the author's stored front page, and one live line in every reader's paper the next morning (yesterday's most recent Success). **Settled** (design §21.1 #28).
29. **Which Issues feed exposés.** The design says Issues' feeds may include `expose`. **Default:** none until you list them (the mechanism is built and tested with a fixture). **Settled** (design §21.1 #29).

**Chapters**

30. **Chapter 7's choice A** (*A name for the Dossier, and a debt to Crane*). **Default:** no entry (the hint is flavour). The alternative lands one (whose name?). **Settled** (design §21.1 #30).
31. **Chapter 7's Favour +5 on a Failure.** The Failure text does not mention it. **Default:** every outcome (the knock-on lists it). **Settled** (design §21.1 #31).
32. **Keepsake texts behind *Read*.** None are written. **Default:** no *Read* button until they are. **Settled** (design §21.1 #32).

**Places and art**

33. **The Clarion and the Sentinel are not places.** Coalport and Duskwall have no `press` place, and Coalport's and Ashford's stations are in their teaser quarters. **Default:** the exposé and the press shop at Herald House and Gazette House; Dossier sales at Central Station, the Goods Yard (Duskwall) and Clearwater Station. Add places (with pins) if you want them nearer. **Settled** (design §21.1 #33).
34. **The party badge's picture.** `lapel-badge.jpg` sits left of centre with a stray object at the right edge, and it is blue: on a picture drawn once for all three parties, blue reads as one party's colour. **Default:** cropped to the disc in the dev viewer; the colour question goes to you and the user (a neutral metal redraw, or three recolours). **Settled** (design §21.1 #34).

**Patrons**

35. **Request timing.** **Default:** arrivals at the boundaries into first visit + 2, + 4 …; skipped while two are open; open four days (*by* the third day after arrival); paid at the boundary after it is done; expired at the fourth. **Settled** (design §21.1 #35).
36. **"Once a week" for the Confidant's favour.** **Default:** seven City Days from the last call. **Settled** (design §21.1 #36).
37. **The first visit.** **Default:** the first time the patron's card is shown at the place (the client calls `patron.visit`), from Level 10. **Settled** (design §21.1 #37).
38. **The Protégé's "+1 point of score" in a battleground count.** The score is the party's. **Default:** +1 to the party's score when at least one of its standing candidates is a Protégé (not one per Protégé). **Settled** (design §21.1 #38).
39. **Favour before the first visit** (a call at the Opera before Herald House). **Default:** it counts. **Settled** (design §21.1 #39).
40. ***Something I can print* below Level 16.** **Default:** skipped for the next in rotation, as the design says. **Settled** (design §21.1 #40).

**Legacy and the season** (Q42, Q43 and Q45–Q48 are the season's: **deferred with it on 16 Oct 2026**, their settled answers kept for its return; Q41 and Q44 stand)

41. **The backfill.** **Default:** migration 012 writes past entries from completed terms and Hero and Issue awards, with their days. **Settled** (design §21.1 #41).
42. **"In the faction for 14 days."** **Default:** the character is at least 14 days old at the confirmation (switching is not built). **Settled** (design §21.1 #42).
43. **The Champion's ties.** **Default:** more national elections won in the season, then the higher control share at the last boundary, then the seeded draw. **Settled** (design §21.1 #43).
44. ***A name they know* in a battleground count.** **Default:** home counts only, as the design pins it. **Settled** (design §21.1 #44).
45. **Season 1.** The term epoch is 5 January 2026, so the first local season is already under way. **Default:** *Season 1* is the season in progress when the nation bootstraps (partial), played out with its finale. **Settled** (design §21.1 #45).
46. **Laws and council rules at the rollover.** **Default:** what was in force on season day 83 ends; a law or rule that the old season's last vote brings into force at day 0 stands. **Settled** (design §21.1 #46).
47. **"A national election won."** **Default:** the party of the President seated by it. **Settled** (design §21.1 #47).
48. **The halfway move.** **Default:** all four shares move halfway to the baseline, then the home floor; ledger rows of kind `season`; morale and Groundswell are recomputed at the next boundary as usual. **Settled** (design §21.1 #48).

**Other**

49. **The call's type for the place's rules.** **Default:** a type of its own (`seenAs: 'social'`): no close race, no council rule keyed by type. **Settled** (design §21.1 #49).
50. **Where item and perk Party XP apply.** **Default:** tier-1 actions and missions (society calls included); not chapters, event roles or the exposé's fixed rewards. **Settled** (design §21.1 #50).

### 22.2 For the user

None blocks the build. Defaults taken:

1. **Design §20's eight points** (no weapons; Crane and Marr; three fixed outfit names; an exposé's Failure keeps the file; the flat alone; +100 per election; no track or twist; Blackmail and Denounce deferred): **approved by the user on 16 Oct 2026**, with the season itself deferred (so +100 and *no track or twist* wait with it).
2. ~~**Season 1's start.**~~ (deferred with the season) **Season 1's start.** The season counts from slice 7's term epoch (Monday 5 January 2026), so locally the first season is a partial one. Choosing launch day as season 1's start moves `TERM.epochDay` (a migration once data exists, ADR 0043).
3. **The party badge's picture** (§22.1 Q34): one blue disc for all three parties.
4. **No newspaper or station in some home towns** (§22.1 Q33): Coalport and Duskwall players go to Irongate or Ashford to print, and sell at Irongate, Duskwall or Clearwater.
5. **No new dependency.**
6. ~~**An 84-day season cannot be playtested in real time locally.**~~ (moot: the season is deferred) The slice's question (goals for the next month) is answered with the clocks visible after a week of real play plus a month on the test clock.

---

## 23. Notes on the design documents (for the designer)

1. **The Clarion and the Sentinel** are named as `press` places (design §3.5, §4.5, screens §6.1, §12.3), but no such place exists in Coalport or Duskwall; Coalport's and Ashford's stations are in teaser quarters (§22.1 Q33).
2. **"Buys back at a tenth of its own prices"** (design §3.5) against *Sells for 80 Iron at a market* for a party coat (screens §3) (§22.1 Q1).
3. **The informant's name**: §4.2's table (*the informant's name*) against §4.4 (*a name of that city*) (§22.1 Q20).
4. **Design §4.5 cites "(§10.2)"** for the front-page line; §10.1 holds it.
5. **The plan's data-model row for slice 8** becomes:
   - collections: `dossierEntries` (entries, Case Files, informants), **`legacyEntries`** (~~`seasons`~~ deferred, 16 Oct 2026);
   - changed: `campaignEvents` (the attached file), `journeys` (`dress`) (~~`nation` (the running season), `contributions` (`season|{s}`), `laws` (`endedBy: 'season'`)~~ deferred);
   - embedded on `characters`: `equipment` (four slots), `outfits`, `lastOutfit`, `patrons[]`, `home.flat`, `legacy { total, spent, perks }`, `milestones`, `expose`, `dossierBurns`, the day's limits on `today`.
   The row's "`items` (four slots, effects, prices)" is content, not a collection (ADR 0014).
6. **The Mountain Inn** is the tailor in design §3.5 ("a `hotel` place") but is a `bar` in content; the tailor is allowed on a `bar` here (§4.2).
7. **Design Q1's `armour` on items** is derived from the tier instead (§21 #1).
8. **Design Q6's "+6 paid by the day job"** and **Q3's informants "reported by the day job"** become the character's settlement (ADR 0020).
9. **Design Q8's embedded Legacy entries** become `legacyEntries` (§21 #8).
10. **GDD §17.2's "2 active patrons, change weekly"** and halved gains for a rival-leaning patron are not exercised with two neutral patrons (design §5.1 says so for the second).
11. **GDD §17.4's table** still reads "+2 CHA at home events" for the flat; the pinned paragraph says "+2 worn Charisma while in its city", which is built.
12. **GDD §6.4 and §11.3's venue rules** (*Wanted* barred, *On file* +5 Charisma) are not pinned (§22.1 Q11).
13. **The society calls' difficulties 10 and 12** sit under the mission schema's 14 floor: the loader relaxes it for `social`.
14. **Recognition's "doubled at night"** reads as the Charisma part alone, but the worked figure (30) needs the office part doubled too (§22.1 Q14).
15. **An item's `chancePct` on `surveillance`** is keyed by the mission's own type, not its *seen as* (`intelligence`), or the press pass would count twice on a surveillance mission (ADR 0052).
16. **Brandauer** cannot be an `Npc` (the schema requires a portrait): he is a dossier-only name in `people.ts`'s `extraNames`.
17. **Counting the catalogue**: design §3.9's table has nineteen wearable or usable rows (the "eighteen" counts the rosette among the keepsakes) and ten chapter keepsakes; `items.ts` has eleven items today and slice 7 adds `keep.deposit-receipt`.
18. **"A rented room"** (where everyone sleeps, +10) and **slice 4's "room in Irongate"** (100 Iron, cap +50) share a word on the Me tab and the capital's residence card. Please check that the two read apart.
19. **`lapel-badge.jpg`**'s composition and colour (§22.1 Q34).
20. **The personal lines** (§10.1) are in the Herald's wording only; T6 needs the four other voices in the same content change, as slice 7's.
21. **Economy §22.3's "a call pays none"** is the only statement on the calls' Party XP (§22.1 Q9).

---

## 24. Bodyguards and the bar (technical design, 16 Oct 2026; ADR 0088)

Design inputs: `docs/design/slice-8-life.md` §24 (*design §24.n*), screens §18, GDD §6.7, §12.1, §19.3, §20.1, economy §22.11, Appendix C #113, #114. **The five user points of design §24.7 are built on their defaults** unless the user says otherwise:

- never against the police;
- all three tiers at the party store;
- one contract at a time, a different tier when the week is up;
- three services (a round, a plate, dinner) and the back room;
- Health up to max only.

Testing follows the user's rule (8 Oct 2026): **no new unit tests**. Each task's *Done when* is a scratch script (run with `pnpm exec tsx`, kept out of the repo, its printed output pasted into the task's commit message) or a Playwright spec.

### 24.1 The order of play

```
bodyguard.hire({ locationId, tier, key })     at your own party store (a `partyStore` shop with `hire`)
  refuse: IN_TRANSIT · WRONG_CITY · NO_HIRE (no hire card here) · MEMBERS_ONLY (not your party's store)
          · LEVEL / RANK (the tier's gate) · WITH_YOU { name, until } (a contract counts today)
          · NOT_ENOUGH_IRON
  name = same tier as the stored (lapsed) contract ? its name : drawName(tier, rng(key))
  character: iron − week (filter iron ≥ week, version); bodyguard = { tier, name, paidThroughDay: today + 6 }
  → PoliticalResult act 'hired'

bodyguard.renew({ weeks: 1 | 4, key })        from anywhere (the Me tab's row, the card)
  refuse: NO_CONTRACT (none counts today: hire him again at the store) · PAID_AHEAD { until } · NOT_ENOUGH_IRON
  paidThroughDay = max(paidThroughDay, today − 1) + 7 × weeks, at most today + 6 + 28 (§24.10 Q1)
  → PoliticalResult act 'renewed'

a run-in fires (tier-1 tap or mission, slice 5)  the encounter is created as today, plus:
  contractCounts(bodyguard, today) → encounter.minder = { tier, name, power, blocked: side === 'police' ? 'police' : null }
                                     chances.minder = blocked ? null : minderChance(power, scaled opponent)
encounter.choose({ choice: 'minder' })  or luck (player or auto) picking it
  roll ≤ chances.minder → outcome 'minded': no Health lost, +10 XP, the act paid as rolled, the caught check as normal
  else                  → the fight at followUp(−10), as a failed Talk

bar.round({ locationId, key })    a place with `bar`; 2 Energy · 30 Iron; today.rounds < 3; spirits.left < 9
  spirits.left = min(9, left + 3); today.rounds += 1                       → 'round'
bar.meal({ locationId, key })     a place with `bar`; 2 Energy · 100 Iron; no meal counting now
  wellFed = { tier: 'plate', until: now + 4 h }; health = healHealth(+15)   → 'meal'
bar.dinner({ locationId, key })   a place with `dining`; 2 Energy · 400 Iron; worn Charisma ≥ 10; no dinner counting now
  wellFed = { tier: 'dinner', until: now + 6 h } (replaces a plate); health = healHealth(+25)   → 'dinner'

any tier-1 action or mission                    rewards += buffShares(personal, kind, act's at)
  a mission that reaches its rewards with spirits.left > 0 → left − 1 in the same transaction
```

### 24.2 Time and the lazy state

| State | Stored | Read | Ends |
|---|---|---|---|
| The contract | `bodyguard { tier, name, paidThroughDay }` | `contractCounts(b, day) = !!b && day ≤ b.paidThroughDay` | the row is gone from the day after; nothing is written; the record stays (his name for a re-hire) |
| His row at a run-in | `encounter.minder`, `chances.minder` | the encounter (frozen at the run-in) | with the encounter |
| Well fed | `buffs.wellFed { tier, until }` | `wellFedAt(b, at) = until > at` | at `until`, whether or not you play |
| In good spirits | `buffs.spirits.left` | `> 0` | one per resolved mission; waits while away |
| Rounds today | `today.rounds` | the day's tally (reset with `today`, slice 1) | the City Day |

Without a new day, nothing here adds a read: the contract and the buffs are on the character.

### 24.3 Content (`packages/content`)

```ts
// data/bodyguards.ts (new). Rules own prices, gates and power (BODYGUARD); content owns words and faces.
BodyguardTier = z.strictObject({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  said: z.enum(['doorman', 'steward', 'minder']),
  names: z.array(z.string().min(1).max(30)).length(3),   // Ruda · Big Anton · Ferko …
  portrait: AssetId,                                      // portrait.doorman / .steward / .minder
  works: z.string().min(1).max(200),                      // {Name}
  fails: z.string().min(1).max(200),
});
Content += { bodyguards: z.array(BodyguardTier).length(3) };
Shop += { hire: z.literal(true).optional() };             // the hire card, only on a `partyStore`
Location += {
  bar: z.literal(true).optional(),                        // the bar's card (a round, a plate)
  dining: z.literal(true).optional(),                     // the dining room (dinner)
};
```

**Loader cross-checks:**

- three tiers, 1 to 3, with design §24.2's names and lines word for word;
- every `partyStore` carries `hire`, and nothing else does;
- **every `bar`-kind place carries `bar`**;
- `dining` only on the Grand Hotel, the Pier Hotel and the Mountain Inn (design §24.3), and on all three;
- the three portraits and `item.round`, `item.bar-plate` in the art catalogue;
- the vocabulary guards refuse *bodyguard, guard, escort, muscle, protection, hired hand, buff, stimulant* in a player string (*enforcer* stays the opponent's word only).

**Copy** (`copy.ts`):

- design §24.2's and §24.3's strings and modal texts;
- the help notes `bodyguard`, `wellFed`, `goodSpirits`;
- the receipt labels *Well fed* and *In good spirits · {n} left*;
- the headlines `bodyguard-last` and `bodyguard-gone` in the five voices (Herald's wording in the design; the designer writes the other four with T27, as §23 #20).

**Art** (T28, ADR 0015; the pictures are in `art-direction/mvp/`):

- `portrait.doorman` (`portraits/doorman.png`), `portrait.steward`, `portrait.minder`;
- `item.round` (`items/round.png`), `item.bar-plate`;
- the dining room uses `scene.hotel`;
- `portraits/vanguard-doorman.png` is not catalogued (the gym's, later).
- The content-policy read (no uniform, badge, armband or weapon) is recorded in the art build's review list.

### 24.4 Data (`packages/db`)

```ts
characters += {
  bodyguard: { tier: 1 | 2 | 3; name: string; paidThroughDay: DayKey } | null,   // kept after a lapse
  buffs: { wellFed: { tier: 'plate' | 'dinner'; until: Date } | null; spirits: { left: number /* 0–9 */ } },
  today += { rounds: number },                                                    // 0–3
}
encounters += {
  minder: { tier: 1 | 2 | 3; name: string; power: number; blocked: 'police' | null } | null,
  chances.minder: number | null,                       // null: no contract, or the police
  choice: ENCOUNTER_CHOICES += 'minder',
  result.outcome += 'minded',
}
requestLogs: REQUEST_KINDS += 'bodyguard.hire', 'bodyguard.renew', 'bar.round', 'bar.meal', 'bar.dinner'
actionLogs: the run-in's stored outcome may be 'minded' (the mission and tier-1 logs carry it as today)
```

No new collection and no new index: the contract and the buffs are read with the character; a contract is one at a time (embed what is read together, plan rule 6).

**Migration 012 additions** (step 1, filtered on the field's absence): `bodyguard: null`, `buffs: { wellFed: null, spirits: { left: 0 } }`, `today.rounds: 0`. Encounters need none: an absent `minder` or `chances.minder` reads as `null`.

### 24.5 Rules (`packages/rules`, pure)

```ts
// constants.ts
export const BODYGUARD = {
  tiers: { 1: { level: 6, rank: null, week: 400, power: 28 },
           2: { level: null, rank: 3, week: 1_200, power: 36 },
           3: { level: 16, rank: null, week: 3_000, power: 44 } },
  weekDays: 7, aheadWeeks: 4, confirmOver: 1_000,
} as const;
export const BAR = {
  energy: 2,
  round: { iron: 30, perDay: 3, missions: 3, max: 9, xpPct: 10 },
  plate: { iron: 100, hours: 4, xpPct: 10, ironPct: 0, health: 15 },
  dinner: { iron: 400, hours: 6, cha: 10, xpPct: 10, ironPct: 10, health: 25 },
} as const;

// bodyguard.ts (new)
export type BodyguardTier = 1 | 2 | 3;
export interface Contract { tier: BodyguardTier; name: string; paidThroughDay: DayKey }
export const contractCounts = (c: Contract | null, day: DayKey) => !!c && day <= c.paidThroughDay;
export const lastDay = (c: Contract | null, today: DayKey) => contractCounts(c, today) && c!.paidThroughDay === today;
export const goneToday = (c: Contract | null, today: DayKey) => !!c && c.paidThroughDay === today - 1;
export function hireGate(i: { tier: BodyguardTier; level: number; rank: number; member: boolean;
  contract: Contract | null; today: DayKey; iron: number }):
  null | { reason: 'MEMBERS_ONLY' | 'LEVEL' | 'RANK' | 'WITH_YOU' | 'NOT_ENOUGH_IRON'; need?: number; name?: string; until?: DayKey };
export function hire(i: { tier; contract: Contract | null; names: readonly string[]; today; rng: Rng }): Contract;
//  same tier as the stored contract: his name; else names[rng.int(3)]; paidThroughDay = today + 6
export function renewGate(i: { contract: Contract | null; weeks: 1 | 4; today; iron }):
  null | { reason: 'NO_CONTRACT' | 'PAID_AHEAD' | 'NOT_ENOUGH_IRON'; until?: DayKey; need?: number };
export const renewed = (c: Contract, weeks: 1 | 4, today: DayKey): Contract =>
  ({ ...c, paidThroughDay: Math.max(c.paidThroughDay, today - 1) + 7 * weeks });
export const aheadLimit = (today: DayKey) => today + 6 + 7 * BODYGUARD.aheadWeeks;   // §24.10 Q1
export const canRenew = (c, weeks, today) => renewed(c, weeks, today).paidThroughDay <= aheadLimit(today);

// runIn.ts (changed)
export type RunInChoice = 'fight' | 'run' | 'talk' | 'pay' | 'minder';
export type RunInOutcomeKind = 'won' | 'lost' | 'ran' | 'talked' | 'paid' | 'minded';
export interface RunInChances { fight; run; talk; pay: number | null; minder?: number | null }
export const minderChance = (power: number, them: ScaledOpponent) =>
  clamp(roundHalfUp(RUN_IN.fight.base + RUN_IN.fight.perPower * (power - them.power) + them.fightPct), 5, 95);
runInChances(you, them, minder?: { power: number; blocked: boolean } | null)   // minder: null when blocked or none
luckChoice(c)            // the free rows with the best odds; ties minder > fight > run > talk
resolveRunIn             // case 'minder': ok → 'minded' (xp RUN_IN.xp.away, no Health lost);
                         //   not ok → cause 'minder', fight(followUp(RUN_IN.followUpPct))
// RunInOutcome.cause += 'minder' (the reason line *{Name} was pushed aside*)
// Every reader of `outcome === 'talked'` (missions.ts, the action path, the caught check, the views)
// treats 'minded' the same: the act is paid as rolled.

// buffs.ts (new)
export type MealTier = 'plate' | 'dinner';
export interface Buffs { wellFed: { tier: MealTier; until: number } | null; spirits: number }
export const wellFedAt = (b: Buffs, at: number) => b.wellFed !== null && at < b.wellFed.until ? b.wellFed.tier : null;
export function roundGate(i: { rounds: number; spirits: number; energy: number; iron: number }):
  null | { reason: 'ROUNDS_TODAY' | 'SPIRITS_FULL' | 'NOT_ENOUGH_ENERGY' | 'NOT_ENOUGH_IRON' };
export function mealGate(i: { tier: MealTier; current: MealTier | null; until: number | null; wornCha: number;
  energy: number; iron: number }): null | { reason: 'WELL_FED' | 'NOT_DRESSED' | 'NOT_ENOUGH_ENERGY' | 'NOT_ENOUGH_IRON';
  until?: number; need?: number };
//  a plate: refused while any meal counts; dinner: refused while a dinner counts (replaces a plate), needs CHA 10
export const afterRound = (b: Buffs): Buffs => ({ ...b, spirits: Math.min(BAR.round.max, b.spirits + BAR.round.missions) });
export const afterMeal = (b: Buffs, tier: MealTier, now: number): Buffs =>
  ({ ...b, wellFed: { tier, until: now + BAR[tier].hours * 3_600_000 } });
export const mealHealth = (tier: MealTier) => BAR[tier].health;           // through healHealth: never above max

// personal.ts (changed, ADR 0052)
PersonalModifiers += { buffs: Buffs };
export function buffShares(p: PersonalModifiers, kind: 'action' | 'mission', at: number):
  { xp: LineShare[]; iron: LineShare[] };
//  well fed at `at`: xp { id: 'buff:wellFed', label: 'Well fed', share: 0.10 }, and on a dinner
//    iron { id: 'buff:wellFed', label: 'Well fed', share: 0.10 };
//  kind 'mission' and spirits > 0: xp { id: 'buff:spirits', label: 'In good spirits · {spirits − 1} left', share: 0.10 }
export const spendSpirits = (b: Buffs, kind: 'action' | 'mission') => kind === 'mission' && b.spirits > 0
  ? { ...b, spirits: b.spirits - 1 } : b;

// paper.ts: LifeCondition += 'bodyguardLast' (lastDay) · 'bodyguardGone' (goneToday)
```

`computeRewards` and `tier2Rewards` are unchanged: their callers add `buffShares(…).xp` to `xpShares` and `.iron` to `ironShares`, beside Rested and the laws' parts, each rounded per line (GDD §5.5). The shares apply where the coat's Party XP part applies (tier-1 actions and missions, society calls included; §21.1 Q50), so training, chapters, event roles and the exposé's fixed rewards take none.

### 24.6 API (`apps/server`)

```ts
// Bodyguards
bodyguard.hire   ({ locationId: z.string().min(1), tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
                    idempotencyKey: Key })                                     → PoliticalResult (hired)
bodyguard.renew  ({ weeks: z.union([z.literal(1), z.literal(4)]), idempotencyKey: Key }) → PoliticalResult (renewed)
// The bar and the dining room
bar.round        ({ locationId: z.string().min(1), idempotencyKey: Key })    → PoliticalResult (round)
bar.meal         ({ locationId: z.string().min(1), idempotencyKey: Key })    → PoliticalResult (meal)
bar.dinner       ({ locationId: z.string().min(1), idempotencyKey: Key })    → PoliticalResult (dinner)
// Changed
encounter.choose += choice 'minder'          // refused: NO_MINDER (no row on this encounter), NOT_AGAINST_POLICE
character.me → CharacterView v9 += {
  minder: { tier; said: 'doorman' | 'steward' | 'minder'; name; portrait; until: DayKey; state: 'with' | 'last';
            renew: { week: number; four: number | null /* null when it would pass four weeks ahead */ } } | null,
  buffs: { wellFedUntil: number | null; tier: MealTier | null; spirits: number } | null,   // the Me tab's line
}
city.get → CityView v8: places[].cards += 'hire' | 'bar' | 'dining', with
  HireCardView { rows: Array<{ tier; said; portrait; week: number; word: OddsWord /* vs a street enforcer at home */;
    state: 'hire' | 'level' | 'rank' | 'withYou' | 'running' | 'needsIron'; need?: number; name?: string;
    until?: DayKey; confirm: boolean /* over 1,000 */; renew?: { week; four: number | null } }> }
  BarCardView { place: string; round: { state: 'ok' | 'today' | 'full' | 'needsIron' | 'needsEnergy'; left: number };
    plate: { state: 'ok' | 'fed' | 'needsIron' | 'needsEnergy'; until: number | null } }
  DiningCardView { hotel: string; state: 'ok' | 'notDressed' | 'fed' | 'needsIron' | 'needsEnergy'; until: number | null; cha: 10 }
RunInView (slice 5) += { minder: { name; portrait; word: OddsWord | null; blocked: 'police' | null } | null }
```

**Services.**

- **`bodyguardService`**: `hire` and `renew`, each `withRequestKey(kind)` in one transaction on the character (the request log is the second document). The place, the shop and the tier's gate and price are resolved from content and rules; the client sends a place id and a tier.
- **`barService`**: `round`, `meal` and `dinner`, the same pattern. Energy is spent through the slice-0 lazy writer (value + timestamp, re-based at the tap) and Health through `healHealth`. Worn Charisma for dinner is `wornStats` (with the flat).
- **Run-ins** (`encounterService.create`, the tier-1 and mission callers): read `bodyguard` in the session that fires the run-in, then write `minder` and `chances.minder` on the encounter. The opponent's side is `sideOf(opponentId) === 'police'`.
- **`encounterService.choose`** and the auto path (ADR 0032 §5): pass `chances.minder` to `luckChoice` and `resolveRunIn`.
- The run-in's modal and `RunInView` read the tier's content lines.
- **Action and mission services**: `personal.buffs` on `LoadedCharacter`. `buffShares` is taken at the act's `at` (a mission resolved after its run-in uses the encounter's `createdAt`). `spendSpirits` goes in the character update that pays the mission.
- **The settlement**: the stored headlines `bodyguard-last` (the last paid day) and `bodyguard-gone` (the day after); the desk's *Ahead* gets *{Name}'s last day {weekday}* within three days (T16).

### 24.7 The result modal

| Act | Stamp · headline | Knock-ons | `view` |
|---|---|---|---|
| `hired` | *Hired* · *{Name} walks with you* | `iron −{week}`, *until {weekday}*, his portrait | `minder` |
| `renewed` | *Paid* · *{Name} · another week* | `iron −{price}`, *until {weekday}* | `minder` |
| `round` | *Your round* · *A round for the bar* | `iron −30`, `energy −2`, *In good spirits · your next {n} missions* | `bar` |
| `meal` | *Fed* · *A plate of something hot* | `iron −100`, `energy −2`, *Well fed until {time}*, `health { before, after }` (*Health +{n}*, the real gain up to max) | `bar` |
| `dinner` | *Fed* · *Dinner at the {hotel}* | `iron −400`, `energy −2`, *Well fed, properly, until {time}*, `health` | `dining` |
| a run-in, `minded` | *Got away* · slice 5's headline | his `works` line as the body; `xp +10`; the act's own result as rolled | as slice 5 |
| a run-in, his row failed | the fight's stamp | his `fails` line, then the fight's text; the reason line *{Name} was pushed aside* | as slice 5 |
| any act with a buff | as the act | `RewardPart { id: 'buff:wellFed' \| 'buff:spirits', label, amount }` on the XP and Iron lines (*Well fed · +10 % XP*, *In good spirits · +10 % XP · 2 left*) | as the act |

The texts are content and `copy.ts`; the numbers and names are filled by the server and stored with the request key. The full `RunInOutcome` (his chance, the roll, the follow-up) is in the result for the dev panel and QA; the player sees words.

### 24.8 Idempotency and atomicity

- **Hire, renew, a round, a meal, dinner:** one transaction on the character with an ADR 0008 request key. The filter holds `iron ≥ price` and the version. The day's and the meal's limits are read in the session and re-checked by the pure gates, so a double tap writes once and the second replays the stored modal.
- **His row:** written once, with the encounter, in the transaction that fires the run-in. The choice is ADR 0032's guarded `pending → resolved` and the rolls come from the encounter's seed, so a retry or the auto path gives the same result.
- **Rounds in hand:** decremented inside the mission's own keyed transaction, under the character's version guard, once per mission.
- **A lapse or a meal running out:** computed on read, never written.

### 24.9 Test hooks and the dev panel (with T17)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/bodyguard` | `{ tier: 1 \| 2 \| 3, daysLeft?: number /* 0 = last day */ }` · `{ lapse: true }` | sets the contract (the name drawn as a hire would) or moves `paidThroughDay` to yesterday |
| `POST /api/test/buffs` | `{ wellFed?: { tier, minutesLeft }, spirits?: number, rounds?: number }` | sets the buffs and today's rounds |
| `POST /api/test/force` (extended) | `+ { runIn: 'street-enforcer' \| 'police' \| …, minder?: 'works' \| 'fails' }` | the caller's next act fires a run-in with that opponent; his row's roll forced |

**Dev panel buttons:**

- **Walking with you:** *A doorman for a week*, *A steward*, *A minder*, *Last day*, *Send him home (lapse)*;
- **The bar:** *Well fed, five minutes left*, *Nine missions in good spirits*, *Rounds used today*.

The dev status gains the contract and his power, his chance against the last opponent, the meal's tier and time left, the rounds in hand and today's.

### 24.10 Questions for the game designer (each has a default; none blocks the build)

1. **"At most four weeks ahead."** Default: four renewal weeks beyond the running one (`paidThroughDay ≤ today + 34`), which parks the economy's 1,600 / 4,800 / 12,000. *Four weeks* is offered only when it fits; otherwise *Another week* until *Paid four weeks ahead*.
2. **A round at seven or eight in hand.** Default: allowed, and it tops up to nine (the extra is lost); refused only at nine (*Nine missions in hand already*).
3. **Which missions use up *in good spirits*.** Default: every mission that reaches its rewards, whatever the outcome (its receipt shows the line). A mission refused at the gate does not.
4. **A meal and a mission whose run-in waits.** Default: the meal counts at the mission's start, so the receipt does not change if the clock runs out while the run-in waits.
5. **Re-hiring after a lapse.** Default: the same tier brings back the same man (his name is kept); a different tier draws a new name.
6. **The record's surcharge on a hire.** Default: none (one price, the week; the surcharge is the shops' items').
7. **Which odds the card shows.** GDD §12.1's *62 % / 50 %* (and 86 / 74) are a **mission's** figures: the street enforcer's power is 22, ×1.1 on a mission = 24. Against a tier-1 tap's run-in he is 68 / 56 (92 / 80). Default: the card's word is computed against the street enforcer on a mission at home (the design's figure). Please add *on a mission* to §12.1's column, or say which you meant.

### 24.11 Testing

- **Scratch scripts (rules):**
  - the odds table against a street enforcer on a mission (22 × 1.1 = 24; +4 on rival ground): 62 / 50, 86 / 74, 95 / 95; on a tier-1 tap (22): 68 / 56, 92 / 80, 95 / 95; the inspector's −10;
  - `luckChoice` taking his row; `resolveRunIn` forced both ways (minded: +10 XP and no Health lost; failed: the fight at −10);
  - `renewed` and `canRenew` at the limit;
  - every gate's refusal; `buffShares` at `until − 1` and `until`;
  - a dinner over a plate, and a plate over a dinner refused; spirits 0 → 3 → 6 → 9, refused at nine, eight topped up to nine;
  - Health +15 at max − 5 gives +5.
- **Playwright (T32):**
  - **`bodyguard.spec.ts`** (phone):
    - a Level 6 member at the party store → **Hire · 400 Iron** → *Hired* → the Me tab's *Walking with you*;
    - a forced mission run-in against a street enforcer → his row first → **{Name} steps in** (forced to work) → *Got away* with his line and +10 XP, the mission paid;
    - a forced police run-in → his row dimmed *Not against the police*;
    - *Last day* (hook) → the desk's *Ahead*;
    - lapse (hook) → the paper's *{Name} Has Gone Back to the Door* → the row gone, Iron unchanged;
    - the card hires him again with the same name.
  - **`bar.spec.ts`** (phone):
    - a bar → **A plate of something · Buy** → *Fed* with *Health +15*;
    - a forced-Success mission → *Well fed · +10 % XP* on the receipt;
    - **Buy a round** → the next mission shows *In good spirits · +10 % XP · 2 left*;
    - *Well fed, five minutes left* (hook) and the clock moved → the line gone;
    - the Pier Hotel at worn Charisma 9 → *Not dressed for the dining room*; at 10 → **Dinner** → *Fed*;
    - a plate now dimmed *Well fed until {time}*.
- **The playtest report** (§15.2) gains:
  - contracts by tier and day since joining; renewals and lapses;
  - his row's share of run-in choices and its success rate;
  - meals and rounds per player-day;
  - the share of XP from buff lines.

### 24.12 Risks and what is left out

| Risk | Mitigation |
|---|---|
| Rival ground becomes a walk with a steward or a minder | Never against the police (half the night pool); the levers are his power and the police's share (Appendix C #113), one constant each; the report measures his row's share and success |
| Meals become a chore every session | +10 % only, priced; the levers are the price and then the hours, never the percentage (Appendix C #114); the report measures meals per player-day |
| A `talked` branch missed for `minded` | T26 greps every `'talked'` reader and adds `'minded'`; the scratch script and `bodyguard.spec.ts` check the act is paid as rolled after his row |
| The run-in sheet's layout with a fifth row | Screens §18.3's row; T32's layout check at 360 × 640 |

**Left out:**

- the v3.0 bodyguard modifiers (power, Run, damage, hospital avoidance, intercepted ambush);
- auto-renew;
- two contracts at once, or replacing one mid-week;
- Vanguard House's discount (the gym, later);
- the Black Market's +25 %;
- *Bribe the barman*, the stimulant and *Faction recruitment*;
- street food and the society dinner;
- Health above max;
- *Lodged* and *Weatherproof*;
- eliminate mode (v1.5).

---

## Review 4 knock-ons (dated note, 7 Oct 2026)

Copied from `docs/tech/review-4.md` §20 when review 4 was built (ADRs 0073–0078). **Applied to the sections above on 14 Oct 2026** (drift row A17); kept here as the record.

- Worn Charisma's "the origin's base" is 0 for every character from review 4 (old characters keep theirs). Every new character wears the coat. `outfit.fathers-coat-promised` is no longer granted (the keepsakes list and the content check).
- **The Front opens** by its places leaving `laterPins` (they become locations); no quarter view.
- Shops are place cards in the slot.
- The residence card's second line is *Where you sleep* only; lodgings are the place card.

## Review 5 knock-on: *Coming home* (dated note, 8 Oct 2026)

The opening is *Coming home* (GDD §7.1; `docs/design/review-5-answers.md` §19) and the Ambitions are re-anchored without the father (GDD §17.1): *The Names on the Stone* (`finish-his-work`), *Who Sold the Homes* (`clear-his-name`), *The Ration Ledger* (`settle-his-debts`). For this slice, **strings only changed; no number, requirement, reward, difficulty, Energy, Heat or id moved**:

- Design §8 and §16.1: chapters 4–12 re-strung (titles *The count* · *Your seat* · *The hall* · *The cutting* · *The stone's rule* · *The list* · *The republic votes* · *Twenty-five marks* · *The names read out*; keepsakes *The count sheet*, *The minute book*, *Your ballot stub*, *The cutting*, *The rule, in draft*, *The letter from the list*, *Your polling card*, *The list's receipt*, *The memorial ribbon*). Flag ids renamed where they said *his*: `forty-total`, `sent-ahead` / `kept-for-floor`, `stone-rule`, `stone-first`, `closed-names` / `left-names`, `forty-read`.
- Design §16.2: *The night caretaker* (was *The night foreman*; `keep.foremans-name` is now named *The caretaker's name*; art `scene.street`, was `scene.factory-gate`; Brandauer stays a dossier-only `extraNames` row in Coalport, now the block's night caretaker) and *The collector* (the ring's page, not the father's debt).
- Design §3.9 and §21.3: `acc.his-rosette` is *The memorial ribbon*; the `item.rosette` brief is a **plain black ribbon** (regenerate the item picture if the cream-and-ink rosette was already made); every keepsake's *Read* text re-strung.
- The content test for *father* (`review5.opening.test.ts`) must cover this slice's chapters and keepsakes when built.

## Review 5 knock-ons: the night, the patrol, the Unrest prize (dated note, 10 Oct 2026)

Copied from `docs/tech/review-5.md` §18 when review 5 was built (ADRs 0079–0082). **Applied to the sections above on 14 Oct 2026** (drift row A17); kept here as the record.

- **Recognition at night** reads `nightAt` at the act. Its test times *at 20:00 and 19:59* (§1356) become 22:00 and 21:59.
- **Legacy +2** for the Unrest prize: a legacy entry by the natural ref `unrest|{cityId}|{entry}` (ADR 0057), credited in the settlement that credits the award.
- **The Market trader**, when placed, is Level 3 · Intelligence 10 · 240. The Level-6 rung is 320 when the Wardrobe places it (the rung test covers each).
- The designed chapters are re-strung with the opening.
- **As built (phase 8):** the Unrest award is `{ kind: 'unrest', ref: 'unrest|{cityId}|{entry}', fxp: 50, meta: { pushedK, top } }` in `awards`; the member's settlement credits its FXP (`awardsFxp`). Legacy is credited from the same row when `legacyEntries` lands.

## Voting rework knock-on (dated note, 12 Oct 2026)

From `docs/tech/voting-rework.md` §17 (ADRs 0083–0086; **applied to the sections above on 14 Oct 2026**): Legacy for a seat or a term is unchanged. A Legacy for a *rule that won* is not designed and is out of this slice.

## Deviations (as built)

### Phase A (16 Oct 2026; T1–T5, T7, T8, T26, T27's schema, T28, T29 and the T6 binding; commits `2bcd5d1`, `11d2c41`, `bcc6cef`, `065ad16`, `6d43735`, `7798bc8`, `cf934e2`, `bc4a8f6`, `2e346df`, `91f1503`, `18ef217`)

**Testing.** No unit tests (the user's rule, 8 Oct 2026). Each *Done when* was checked with a throwaway scratch script (`tsx`, not committed):
- **T1:** economy §22.2's worn Charisma by day, 2 · 12 · 18 · 20 · 30 · 34 · 50; the recruit's Fight against an enforcer on a mission, 29 % → 41 % with a Tier II coat (STR 11); recognition 30 for a Governor in a greatcoat at night and 0 for a new player, plain clothes halving 5 → 2 and 15 → 7, the Charisma edges 9 / 10 / 19 / 20 / 29 / 30 and Legacy 9 / 10 / 50 / 60 (never doubled), `runInChance` +30 on rival ground, clamped at 90, nothing at home; the press pass +10 on a tier-1 intelligence tap and +10 (not +20) on a surveillance mission, the camera +5 on the mission and 0 on a tier-1 tap, the suit and the pass +15, forged papers against the police only, Marr's case against anyone; three 5 % Party XP parts; the perk's Favour 6 → 7, 2 → 3, 1 → 2; *A shorter walk* and its floor of 1; the outfit, wear, sell and buy gates; `shopPrice` 800 → 920, 4,500 → 5,850, 150 → 173; `sellPrice`; `bribePrice` 500 / 1,000 / 2,000 and half; the society door and the patron's introduction.
- **T5:** the real content loads through every check, and a refused fixture for each slice-8 check: a weapon id, a coat without a tier, Charisma out of a slot's band, an effect out of bounds, `against` off `bluff`, an unknown effect kind, two `chancePct` on one act, a priced keepsake, a priced kit item, a priced item that no shop sells, a stall on a bar, a back room without the bribe, a stall buying `own`, three shops, a missing `keepsakeFrom` once the catalogue lands, `patronId` before the patrons, an undrawn name without a party that is drawn, a duplicate name, a Dossier line with an unknown token and with three lines, `completes` on chapter 1, an unknown Dossier name on a chapter, a society call's difficulty, a mission without a pool, a half-built Front, a life scene that is not a scene. For T27's schema: the three tiers, two tiers, a wrong `said`, `hire` off a party store, the bar card on one bar only, dining elsewhere, dining on one of the three places.
- **T2:** capacity at INT 10 / 11 / 20 / 21 / 35 / 36 / 50 / 51 and the perk; fresh at 6 days, stale at 7; 2 fresh + 2 stale weigh 3; `pickName` over 10,000 draws gives a rival 0.66 of the time, never an undrawn name, and null in an empty town; `rollEntry` at 10 / 25 / 35 % within 1.5 points; `bindFile`, every `bindGate`, `turnGate` and `exposeGate` refusal; a week away gives three informant reports, once each, seven in all; `sellValue`; the exposé's difficulty 3 → 18, 3.5 → 18, 4 → 16, 5 → 14, headline +1, the capital +2; the swing modes; `applyToNeutral` stopping at a home floor of 50; Rested on the exposé's XP and Iron; `feedMatches` for `expose`.
- **T3:** `addFavour` with the perk and the cap, tiers crossed; `patronDays` over 30 days from a first visit (arrivals at +2 … +30, never three open, `req.crane.print` skipped below 16, expiry at the fourth boundary, a Request done on its last day paid at the next boundary, gossip on Mondays from Acquaintance); `requestMatches` for the Dossier kind, `rotate` and `missionTypes`; the flat's Rested 25 / 25 / 10 the morning after it lapses / 25 after paying, no arrears, living elsewhere, the caps 250 and 300, eight weeks ahead; Rested banked exactly 75 over three boundaries with `restOn`; the Monday perk's extra day; every Legacy kind from its facts (the Unrest prize under `unrest|{cityId}|{entry}`); `perkGate`; the Protégé's +2 taking a seventh seat; `scoreBonus` +1; chapters 4 and 8's requirements; a choice's Iron.
- **T26:** the minder against the street enforcer on a mission 62 / 86 / 95 (tiers I–III), on a tier-1 tap 68 / 92 / 95 (GDD §12.1's mission figures hold); the police block the row; luck takes him first on a tie; *minded* 62 % over 2,000 rolls with no Health lost and +10 XP; pushed aside is the fight at −10; the contract's days, the same man for the same tier, the hire and renew gates, `aheadLimit` today + 34; the buffs' gates and shares; spirits spent on missions only.
- **T8 / T29:** on a memory replica set, migration 012 run twice changes nothing the second time; a seeded history (two council terms, a Chair term, a Hero title, the Unrest prize) backfills Legacy 20; the milestones come from history; the unique `{ characterId, ref }` refuses a duplicate; a transaction over `characters`, `dossierEntries`, `legacyEntries` and `requestLogs` commits.
- **The fast check** (`pnpm art:check && pnpm turbo run lint typecheck build`) is green. **Playwright** (ports 4273 / 3301, `--no-deps`, a separate `--output`, then deleted): `missions`, `rival`, `travel`, `capital`, `home-map` and `clearwater` pass (Clearwater's spec now expects no later pins: the Front is open). `phone` was cut at the 10-minute mark; one test fails reproducibly: `canvass.spec.ts` *all six pins on the first view* (pin 3, the Union Hall, which carries the Issue mark, measures a viewport ratio of 0.9999998 against a required 1). It is a sub-pixel position, in no code this phase touched; it is left for QA.

**Rules.**
- **`Equipment`** keeps `clothing: string | null` (the join builds it before the coat's uid exists, and stored pre-012 documents lack the two new slots); the never-empty Coat is `wearGate`'s `COAT_REQUIRED`. `asEquipment` reads a two-slot set as four. `ItemSpec` gains `tier`, `effects`, `price`, `level`, `rank`, `factionId` and `members`, all optional, and `itemSpec()` fills them.
- **The coat in a run-in** was already built (slice 5's `clothingTierOf` reads the worn coat's tier). `coatTier` is the rules' version for phase B.
- **Changed functions take optional inputs**, as slice 7's did: `runInChance({ recognition })` (added after the laws' percentages, before the clamp), `runInChances(you.talkPct, minder)`, `actionEnergy(…, personalDelta)`, `missionGate({ social, patronTier })`, `restedCapFor(m, boolean | { room, flat, perkSleep })`, `projectEnergyThrough(…, restOn)`, `settleDays({ restOn, mondayPay })`, `chapterStatus(c.milestones)`, `CountLine.bonus`, `districtScores` / `countBattleground` / `countDistrict({ scoreBonus })`. `computeRewards` and `tier2Rewards` are unchanged: the personal and buff shares go in through `fxpShares` / `xpShares` / `ironShares`. `perkHeatCoolPct` is a percentage for `coolRate`'s existing list; Heat's projection is unchanged.
- **`missionGate`** returns the new reasons (`NEEDS_ASSOCIATE`, `WANTED`, `NOT_DRESSED`, `CALLED_TODAY`). The server's `missionCtx` still passes none of the new inputs, so its type is narrowed with a cast until phase B. `MissionView.label` gains `society`, and the server maps `social` to it.
- **Legacy** has a kind of its own for the Unrest prize (`unrest`, 2 points), beside `hero` and `issueTopFive`, because its ref is natural (`unrest|{cityId}|{entry}`). `champion` and `seasonAward` are not in `LEGACY.points` (the season is deferred); their refs are reserved.
- **Requests count Successes and Partials** (a Failure never counts); the design names no `counts` for a Request. This is a question for the designer.
- **`patronDays`** takes a Request's `doneAt` as epoch ms and pays when its City Day is before the boundary. The district rotation is `k mod` the districts given. `informantReports` skips reports at or below `reported`.
- **Not built in phase A:** §8.3's views (left to phase B with the services that build them, as slice 7 did); `wornStats` v2 and every server caller (T9).
- **The run-in's `minded`** is accepted by the street view, `missionResult` and `streetService`. The opponent's line falls back to `talked`, and the UI's did line reads it as a talk, until phase B gives it the bodyguard's `works` line. No run-in carries a minder yet.
- **`selectHeadlines`** reads the life conditions from `PaperFacts.life.kinds`. (T5's first edit of `paper.ts` did not apply because of the file's CRLF line endings; T26 fixed it.)

**Content.**
- **The new fields land optional or defaulted:** `patrons`, `extraNames` and `bodyguards` default to []; `dossierLines`, `art.lifeScenes` and each item's `effects` are optional. `slice8Problems` and `barProblems` check each set once any of it is present. `Mission.difficulty` is 10–40 in the schema, and the loader holds the ladder for every type but `social`. `Mission.pool` defaults to [], so a data file typed with the parsed `Mission` must write `pool: []` on a society call.
- **The accessors** come from `lifeAccessors` (spread into `GameContent`): `shopsAt`, `shopItem`, `kitOf`, `names`, `namesOf`, `name`, `patron`, `patronOf`, `patronAt`, `request`, `dossierLine`, `societyCalls`. `chapterAt` is the existing `chapter`. `names()` takes the candidates, the secretaries (in their NPC's town, else the faction's home city), the local deputies and the figures (the capital's Government Quarter), then `extraNames`.
- **The T6 binding** (after the designer's `9b7f37f`): `rawContent` carries `patrons`, `dossierLines`, `extraNames` and the life headlines. `LIFE_PLACEHOLDERS` (rules) joins the loader's allowed set, with `{minder}` and `{price}`: the bodyguards' two paper lines moved from `copy.life.minder.paper` into `lifeHeadlines.ts`, and the man's name is `{minder}`, not the copy's `{name}` (the personal lines' `{name}` is the player's). The `social` mission card is `scene.hotel` (no scene was named), so the per-type card check covers every type again.
- **Not built:** the vocabulary guards (Vitest files, left untouched under the user's rule); the word-for-word comparisons with the design documents (content tests).

**Art (T7, T28).** All twenty-two §13 entries were in `art-direction/mvp/`, as were design §24.6's five; nothing is missing. `item.rosette` uses `items/memorial-ribbon.jpg` (review 5's plain black ribbon), not `rosette.jpg`. The badge is the user's neutral cream redraw, centred, so it needs no crop. The bar's two items are 1024 px PNGs, so `item()` takes the side. `portrait.crane` and `portrait.marr` are catalogued with the binding. The portraits' WebP is written at 256 px only (`withWebp`, as slice 7's). Alt texts: §13's drafts for the Wardrobe; drafts from the pictures for the bar items, the three bodyguards and the two patrons; the minder's is the designer's wording, shortened to 159 characters. The content-policy read: no uniform, badge, armband or weapon on the three men; the steward's jacket has a plain collar; the ribbon has no device. The minder's cigarette is lit (the prompt said unlit). The set measures **25.38 MB**, so `TOTAL_BUDGET` is 25.77 MB. Focus points wait for the dev viewer.

**DB (T8, T29).**
- `dossierEntries` has the tab's and the stale-tomorrow indexes. The spymaster's partial index is deferred with the season.
- `legacyEntries` has the unique ref and the by-day index.
- The new character fields are optional at the type level, with schema defaults equal to migration 012's. `outfits` has no default: the join (phase B) and migration 012 build it from the kit.
- Step 1 runs per character in JS (`defaultOutfits`) and also sets T29's `bodyguard`, `buffs` and `today.rounds`. Step 2 takes the first Chair and national votes by the `chair:` / `nation:` election-id prefixes. Step 3 upserts each row on its ref and sets `legacy.total` from the character's rows, all filtered on the field's absence.
- The report types (`report.ts`, `funnel.ts`, `battleground.ts`, `risk.ts`) widen to the new kinds. `nation`, `seasons`, the `season|{s}` scope and `laws.endedBy: 'season'` are not built.

**For phase B.**
- T9: `wornStats` v2 with the flat's +2, `personal` (and `buffs`) on `LoadedCharacter`, and the item rows and Party XP parts in every caller.
- Pass the optional inputs above: recognition, `talkPct`, `restOn`, `mondayPay`, the milestones, `scoreBonus` and `CountLine.bonus`.
- Widen `missionCtx`'s gate and the router's `MISSION_LOCKED` mapping.
- Build `outfits` at the join.
- The encounter router's `minder` choice and the minder row at a run-in's start.
- The bodyguard's `works` line in the run-in modal.
- The §8.3 views.
- The paper facts for the life conditions.


### Phase B, lane 1 (16 Oct 2026; T9, T10, T30, T31 and the designer's 683cc78 edits; commits `310a86f`, `bc29e2d`, `96d8c20`)

**Testing.** No unit tests (the user's rule). Scratch scripts on a memory replica set (`tsx`, kept out of the repo) went through the real procedures (`createCaller`):
- **T9:** the join builds `outfits` (Town = what is worn, Plain clothes = the kit's outfit and the party card) and `lastOutfit: 'town'`; the Wardrobe reads Charisma 5 (Town) / 2 (Plain); wearing the press pass and replaying the same wear are one write (the replay a no-op); the greatcoat gives 22 and the words *holds up in a run-in · recognised on rival ground*; *Keep this as Town*; Evening refused `OUTFIT_LOCKED` without a flat, a foreign uid `NOT_OWNED`; a counting flat adds +2 in its city (plain 2 → 4); an intelligence tap with the pass carries the row `item:doc.press-pass +10`.
- **T10:** a buy and its replay return the same modal and charge once; three parallel taps with one key charge once; a second buy `ALREADY_OWNED`; `firsts.coat` set; a worn coat refused (`NOT_SELLABLE worn`), then sold out of Town (*Taken out of your Town outfit*, the coat falls back to the kit's); a bribe at *On file* 500, the next `NO_MARKS`.
- **T30:** the hire card at the Union Hall (doorman *fair*, steward *good*, minder locked by Level); a hire and its replay identical; a second hire `WITH_YOU`; four weeks paid, then one more `PAID_AHEAD`; a forced mission run-in against the street enforcer shows his row at 62 (the design's mission figure), luck picks him, *minded* with his `works` line and +10 XP; against the police the row is blocked and `encounter.choose('minder')` is refused `NOT_AGAINST_POLICE`.
- **T31:** a plate heals the 10 missing (*Health +10*, up to max) and a second is refused `WELL_FED`; three rounds then `ROUNDS_TODAY`, nine missions in hand; the forced mission above shows *Well fed* and *In good spirits · 8 left* parts on its XP, spirits 9 → 8.
- **The fast check:** server, rules, UI and client typecheck and eslint on every touched file; `art:check` ok. The repo-wide `turbo run lint typecheck build` cannot go green while lane 2's uncommitted files sit in the shared working tree (`legacyService.ts`, `lifeSettlement.ts` and others failed typecheck mid-edit), so it was run per package. **Playwright** (4273 / 3301, `--no-deps`): `missions` 2/2; `rival` + `travel` + `qa-risk` 23/25; `capital` + `clearwater` + `events` 5/6, then `clearwater` 2/2 on a rerun (a flaky `not.toContainText`); `phone` (arrival, canvass, day, session, review1, chapter, qa) 26/27. The failures: `canvass` *all six pins on the first view* (phase A's known sub-pixel pin 3) and `qa-risk` *360 × 640 / 812 × 375: the quarter …* (the plate's share bar measures 360 × 6 against the 44 px rule; slice 7 code, no lane-1 change near it). Both are for QA. The map, tiles and places specs of `phone` were not run (no lane-1 change reaches them).

**Built.**
- **`wornStats(doc, content, now?)`**: the flat's +2 at `now` (no `now`: no flat part; the cells' tap and the patrol card pass none). `services/personal.ts`: `personalOf` (worn items, perks, buffs, the catalogue's names), `itemRows`, `talkPctOf`, `recognitionOf`, `flatChaOf`; `LoadedCharacter.personal` and `recognitionAt`.
- **Item rows come in through `bonuses`** (the ticket's preview and the act's check read the same rows: `computeTier1`, `cityService`'s action preview, `missionCtx.bonuses`); the Party XP parts and the buff shares go through the rules (`Tier1ActionInput.personal`, `MissionInput.personal`, `personalShares`); *A shorter walk* through `actionEnergy`. `MissionInput.recognition` and `missionRisk`'s `recognition` feed `runInChance`.
- **`missionGate`** gets the society door and the introduction through `lifeGateInput` (shared by the ticket and `missionRefusal`); the cast is gone; `MissionView.locked.reason` is `MissionGateReason | 'NIGHT'`, with `patron` (the name) for `NEEDS_ASSOCIATE`; the UI's `missionLockText` words the four new reasons.
- **The Rested cap**: `capOn` / `restedCapToday` take `homeCapOf(c)` (the flat, the residence, the perk) at every caller. **The settlement's `restOn`** (the room's 10, the flat's 25) goes to `settleDays`, and the re-base now runs whenever a boundary was crossed since the last Energy write, so the banked Rested is written once.
- **The Wardrobe** (`wardrobe.get/wear/takeOff/outfit/keep`, `dressOnArrival`): set-to-state under the version guard, a miss re-read once. A character stored without `outfits` reads the kit's defaults (`outfitsOf`); the first outfit change saves them. `dressOnArrival` refuses with the existing `NO_JOURNEY` (no new `NOT_ON_TRAIN` reason) and returns `{ done }`, not the `JourneyView`.
- **Shops** (`shop.buy/sell/bribe`), **bodyguards** (`bodyguard.hire/renew`), **the bar** (`bar.round/meal/dinner`): each is a `lifeAct` = `withRequestKey` (the key guard in the transaction, the winner's stored result on a lost race), the character re-read in the session, the guards in the filter (`iron ≥ price`, the version, one of each). The modal is `lifeResult` (lane 1's shell beside lane 2's `lifePolitical`), its extra lines in `knockOns.life` (the same `life?: string[]` lane 2 declared).
- **His row**: `minderAtRunIn` in `startRunInInTx` (every run-in path: tier-1 taps and missions; the auto path's luck reads `chances.minder`); `RunInPending.rows.minder`; `minderLine` replaces the `talked` stopgap in `missionResult` and `streetService` (*minded*: his `works` line; his row failed: his `fails` line, then the fight's). The UI's `RunInChoice` takes `minder` (the row itself is T32).
- **A round in hand is spent at the mission's start** (in the start's transaction, with its receipt's line), not at its rewards: the shares are computed at the start (§24.10 Q4), so the spend goes with them. `firsts.recognised` is set on the first run-in that fires while recognised (tier-1 and missions); `firsts.coat` on the first coat bought.

**Deviations from §8.1–§8.3.**
- **A place's cards are a query of their own**, `life.place({ locationId })` → `PlaceLifeCardsView { shops, hire, bar, dining }`, not `CityView.places[].cards`; **the Me tab's line** is `life.me()` → `{ cha, outfit, minder, buffs }`, not new `CharacterView` fields. Both keep `cityService` and `toCharacterView` (shared with lane 2) as they were; the client (T20, T32) calls them when a sheet or the Me tab opens and invalidates them with `character.me`.
- **The result views**: a buy, a sale, a hire, a round and a meal return `view: { kind: 'place', locationId }`; the bribe `record`; a renewal `{ kind: 'minder', minder }` (new). No `wardrobe`, `bar` or `dining` view kinds.
- **Lane 1's views live in `packages/rules/src/wardrobeViews.ts`** (lane 2's in `lifeViews.ts`).

**Not built (lane 1's next round, or phase C).**
- **T13** whole: the `social` type through `missionService` (`today.calls`, Favour with the city's patron and the crossings, the late table and the morgue file), `patronService` (`get`, `visit`, `gift`, `favour`, `crossInTx`), Request progress in every act, the endorsement in the counts. The Request rule is settled (a Success and a Partial count, never a Failure).
- **Forged papers at the checkpoint** (design §21.1 #8: *Show your papers* as a Charisma check at 14 with the papers' +10; the card's Partial): the journey card's resolution is unchanged; only *Talk your way out* reads the Papers slot.
- **`presence.recognised`** in `touchPresence`.
- **The paper's facts for `bodyguardLast` / `bodyguardGone`** (lane 2's paper): read `characters.bodyguard { tier, name, paidThroughDay }` with `lastDay(contract, today)` / `goneToday(contract, today)` from `@irongate/rules`; `{minder}` is `name`, `{price}` is `BODYGUARD.tiers[tier].week`, the said word `content.bodyguards[tier].said`.
- **Test hooks for lane 2's dev panel** (§8.6, §24.9): `POST /api/test/wardrobe { grant, wear }` (push inventory entries, source `test`, then `wardrobe.wear`), `/api/test/bodyguard { tier, daysLeft } | { lapse }` (set `bodyguard`), `/api/test/buffs { wellFed: { tier, minutesLeft }, spirits, rounds }` (set `buffs`, `today.rounds`), `/api/test/force` + `{ minder: 'works' | 'fails' }` (the existing `choiceRoll` 1 / 100 with `runIn: 'next'`), and `/api/test/patron` once T13 lands. Dev status: worn Charisma and its parts (`personalOf`, `flatChaOf`), recognition here (`recognitionOf`), the contract and his power (`minderPower`), the buffs (`buffsOf`).

### Phase B, lane 2 (16 Oct 2026; T11, T12, T14, T16, T17, T18's run and the canvass spec; commits `f20a5d0`, `2d5ffd2`, `fab48f0`, `908d996`)

**Testing.** No unit tests (the user's rule). Scratch scripts on a memory replica set (`tsx`, kept out of the repo in `apps/server/scratch-s8b2/`, excluded from git) went through the real procedures (`createCaller`):
- **T11:** at 14 of 15 slots, four parallel landings in four transactions: one lands, three are refused (*Dossier full*). 2 fresh + 1 stale reads 2.5 and *Make a Case File* stays shut; a fourth entry binds (3.5; political · criminal · pattern · the small stuff). The bind's replay with its key is the same modal; a second bind is `FILE_HELD`; `milestones.caseFileAt` is set. A sale and its replay pay once (50 a fresh entry, 200 a file); `NOT_A_STATION` at Herald House; `IN_STORY` while the file is chosen for an exposé. *Recruit as an informant* is `NEEDS_ASSOCIATE` (Crane) until Favour 31, then turned. Five days away: two reports (+2, +4), once each, the same after a re-read. Crane's Requests arrive at +2 / +4 from the first visit; Monday's gossip lands at Acquaintance.
- **T12:** at Herald House, `expose.choose` is set-once (a second is `IN_STORY`); `attempt` and its replay are the same result. A Success with *the facts, plainly* moves the Government Quarter's Vanguard −1.0 to Neutral, PC +5, Legacy 0 → 2 (one row), the file `spent`, the name burned 14 days; a second attempt is `NO_STORY`. A weak reporter's Failure keeps the file held, no Legacy. The next morning the author's paper leads with `expose-front` (*Hedwig Brandt EXPOSED: …*); another party's reader gets it live as `paper.today().life.publicExpose`; the author's paper does not print it twice.
- **T14:** `home.buyFlat` and its replay charge once, a second is `FLAT_OWNED`; Rested +25 at the next boundary; *Rent Due* on the last paid day, *The Flat Waits* the morning after, the flat still stored, `payRent` from today (no arrears). `legacy.takePerk` is refused `NOT_ENOUGH_LEGACY`, then taken, its replay the same, a second `PERK_MAX`.
- **T17:** every lane-2 and lane-1 dev-panel button through `lifeAction`; the status's life block (worn Charisma, recognition's parts, the contract and his power, the buffs and rounds, the Dossier's used / cap and last roll, the flat, Legacy).
- **T18 (the month):** three players, 28 days from a Monday, the worker off throughout (every city day, nation day and settlement on first touch), one player away days 10–16. No refusals in 84 intelligence ×3 taps; each player's informant reports 7 of 7, once each (the absent player's on return); an exposé printed (*headline*, split); flats lapsing and paid; hero awards' Legacy +2 each; the life lines printed over the month (flat-bought, case-file, expose-front, flat-due, dossier-stale, flat-waiting, legacy-entry). **The settlement after the week away took 48 ms; the slowest read of the month 373 ms** (the first day's, with the city and nation days). Not run ten times; no patron to Associate by play (T13 is not built); no council term's Legacy (nobody stood).
- **The fast check** (`pnpm art:check && pnpm turbo run lint typecheck build`) is green (14 of 14) at `908d996`. **Playwright** (4373 / 3401, `--no-deps`): `missions` + `travel` + `dev-panel` 9/9; `events` + `rival` + `favours` 4/4; `dev-panel` 2/2 after T17; `phone` chapter, day and session 3/3; `canvass` (phone) 4/4 after the fix below.
- **The canvass spec** (*all six pins on the first view*, phone, pin 3 at a viewport ratio of 0.9999998): bisected on a worktree, it passes at `2c2eb35` and fails from `1115447` (the slice-7 fix round's 20 px foot under the home plate shortens the map). It is a sub-pixel fit, not a slice-8 change. The spec now asks every pin to be on screen to a thousandth of its area (`ratio: 0.999`).

**Built.**
- `services/dossierService.ts`: `landEntry`, the one helper. It takes the named subject or `pickName`, rolls `rollEntry` on `{seed}:dossier:{row}`, counts the slots in the session over `held` and `attached`, and inserts or returns the refused knock-on. It writes `dossierLastAt`, which also serialises two landings. Also `dossier.get/seen/station/bind/sell/turn`, the Headline Story's `attachCaseFileInTx` / `detachCaseFileInTx` / `spendCaseFileInTx`, and `landSettled` for the settlement. The callers: `writeTier1` (intelligence Successes, a roll per row; the cells' and the ward's taps use their content `dossier`, 25 % and its category), `writeMissionFinal` (surveillance and theft), the journey card (*Feed him a story*, on the destination), `chapterLifeInTx` (a chapter's entry by hand) and the settlement (informants, gossip).
- `services/exposeService.ts`: `expose.get/choose/attempt`. The check is `computeCheck` with three ways (*write* INT, *talk* CHA and INT, *legwork* best) at `exposeDifficulty`; Energy 20 with Rested. The swing lands in the name's town (`readPlace` on a place of its district or city): *plainly* through `applyToNeutral` (with the rival-ground cap and `rivalPressure` on the city), *headline* through `moveOpinion` against. Ledger kind `expose`; the actor's leg as influence; tagged Issues ×1.5 (`ISSUES.swingPct`) with `pointsFor`; Legacy `expose:{logId}`. The result is `ActionResult.kind 'expose'` with `effects.expose` (`ExposeOutcome`: the stamp, the swing, the lines, `printed` for the paper).
- **The Headline Story:** `events.callEvent` takes `caseFileId` (only on the `againstLeader` type; `WRONG_PARTY`, a new reason, when the file names another party). The file is `attached` and burned at the call; the caller's withdrawal returns it and lifts the burn; the resolution spends it (`used.how 'headlineStory'`) and adds `extraFactors: [{ caseFile, 50 }]` to `resolveCampaignEvent` (a new optional input). Called off, the file goes back.
- `services/lifeSettlement.ts` (`settleLifeInTx`) runs in `ensureSettled`'s transaction before the guarded write, and its `set` merges into the settlement's. It covers: `patronDays` per patron (Requests, Favour, tiers, `thanks`, Protégé's Legacy row); gossip and informants through `landSettled`; `legacyFromWindow` (completed terms, the awards credited now, the Unrest prize's +2 under its own ref) through `addLegacyInTx`; the milestones (completed terms, the first deputy term, the list). `computeSettlement` passes `mondayPay` to `settleDays`. The edition (T16) gets the life kinds in `PaperFacts.life`, their fills, and `desk.life { desk, letters }`.
- Also: `services/homeService.ts` (`home.get/buyFlat/payRent`; Energy stored at the tap under the old cap), `services/legacyService.ts` (`addLegacyInTx`, `legacy.get/takePerk`, the entries' words), `services/chapterLife.ts`, `services/lifePaper.ts`, `services/lifeResult.ts`, `trpc/routers/dossier.ts` (`dossier`, `expose`, `home`, `legacy`), `packages/rules/src/lifeViews.ts` (the views and knock-on types), `dev/life.ts`.
- The first Chair vote and the first national vote set `milestones.chairVoteAt` / `nationalVoteAt` in their transactions. `ambitionStatus` passes the milestones to `chapterStatus`. A chapter's step-1 choice pays its Iron with the check.

**Deviations from §7–§11.**
- **The station's card is a query**, `dossier.station({ locationId })` → `StationCardView`, not `CityView.places[].cards` (lane 1 did the same for its cards).
- **The Letters' life rows and the desk's rows** are `PaperView.life { desk, letters, publicExpose }`, stored at the settlement on `paperEntries.desk.life`. `requestArrived` and `informantReport` are not headline conditions (they would take the two personal slots); they are Letters rows. The Request rows are every open Request (with progress), not only today's.
- **The `{issue}` of a Request** is the capital's first live Issue at the settlement, for every boundary in the window, not the Issue of each arrival day.
- **`listAt`** is read lazily by the settlement (`Candidacy.exists({ characterId, kind: 'list' })` while unset), so a list place shows on the chapter the morning after. That read has no `characterId`-first index on `candidacies` (a small collection).
- **`legacyFromWindow`'s survivals and pledges are not read**: `survived` is passed empty and pledges are not joined to the terms (the confidence votes, the removal bills and the President's pledges need their own reads). No Legacy for those yet.
- **The exposé:** the camera's `chancePct expose` row and rival ground's row at the press are not in its check (lane 1's `itemRows` are not wired there). The swing's place is the name's district or city (the Government Quarter for deputies and figures). *Something I can print* (Crane's Request) waits on T13's `advanceRequests`. The public line and the author's line find yesterday's exposé by `result.performedAt` (the act's clock), with the partial index `expose_by_day`.
- **A chapter's Favour** writes the patron's Favour and tier days directly (`chapterLifeInTx`); the Protégé's piece waits on T13's `crossInTx`.
- **Not built:** *While You Were Away*'s life lines (Requests, informants, Legacy); `presence.recognised`; the dev panel's patron buttons and `/api/test/patron` (with T13). `dossier.get`'s `print.nearest` is the first press in content order outside the character's city, not the nearest by distance.

**Notes for the designer.** `dossier-stale` reads *1 Entries Go Stale Tomorrow* when one entry goes stale (the headline has no singular). With two personal headlines a day, `bodyguard-gone`, `flat-waiting` and `legacy-entry` (priority 2) often lose to a level or rank line on a busy morning.

**For phase C.**
- T13 (lane 1's next round): `advanceRequests` in every act's transaction, from the descriptors `landEntry` returns (`kind: 'dossierEntry'`) and the exposé's (`kind: 'expose'`); `crossInTx` for the settlement's and the chapter's crossings (the piece); `/api/test/patron` and the patron buttons in `dev/life.ts`.
- The client (T19–T23): the Dossier tab reads `dossier.get` (and calls `dossier.seen`); the station sheet `dossier.station`; the exposé `expose.get` / `.choose` / `.attempt` (`ActionResult.kind 'expose'`, `effects.expose`); the call sheet's *Attach a Case File* (`events.callEvent`'s `caseFileId`); the Me tab's home and Legacy blocks (`home.get`, `legacy.get`); the paper's `life` part; `effects.dossier` on tier-1, mission and journey results; `knockOns.dossier`, `.legacy` and `.life` on the political modals.
- The full e2e before QA, and T18's month run ten times.
