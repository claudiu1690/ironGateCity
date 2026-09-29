# Content-policy review: the Vanguard, the Collective's titles, and war framing

Game designer, 29 Sep 2026. Approved by the user as a content-policy review of the flags in `docs/tech/slice-2.md` §20.3 (architect, QA, developer). Rules applied: CLAUDE.md design rule 2 (*a political battle, not a war*: never "front", "uprising" or war framing) and rule 6 (*no real-world extremist symbols* in art or text; every Vanguard string reviewed). Rule 5 holds: **the faction names and the "(Fascists / Communists / Democrats)" labels are untouched**; naming stays parked (GDD Appendix C #10).

The GDD is the source of truth; every change below is in it (§0 change row "content-policy review"). This document is the old → new table the developer applies to `packages/content`, removing the `TODO(content-policy)` markers and the QA test's exemption for *ex-soldiers*.

**Written only to `docs/`.** Content files, the QA test, the tech design and the mockups are listed in §8 for their owners.

---

## 1. The decisions

1. **The Vanguard is an authoritarian nationalist party, not a militia.** It keeps its voice (order, discipline, hierarchy, the frontier shut, a strong hand) and loses its army: no ranks, drill, muster, garrison, uniform, march, roll call, patrol or barracks. It has a committee, an organiser, volunteers and stewards. The state's customs men and police are the state's; the Vanguard courts them (canvasses the customs shift, holds the Archives' keys), it is not them.
2. **Party ranks in the Vanguard's voice:** *Initiate / Steward / Bailiff / Prefect / Intendant / Guardian / Keeper of the Gate.* The offices of a party that runs its wards like a prefecture: a Steward keeps order at meetings (Rank 2 unlocks event roles), a Bailiff runs a ward (Rank 3, council), a Prefect a district (Rank 4, Chair), an Intendant sits above the prefects (Rank 5, the Legislature), a Guardian is the movement's elder (Rank 6), and the Keeper of the Gate is the honorific, from the crest. None is a real-world party's title; none is military.
3. **The Torchlight March is gone. The Vanguard's Campaign Event is the Grand Rally:** the movement fills the main square by the thousand, a show of numbers and discipline. Roles *Speaker (CHA), Stand-builder (STR), 2 Stewards (STR), Lookout (AGI)*. Mechanics unchanged: big swing, +Heat for participants in rival-held cities.
4. **Duskwall is a frontier customs town, not a garrison town.** The old fortress on the map stays; it now houses the frontier customs (Fortress Gate, kind `ministry`) and the customs sells what it seizes under the walls (the Customs Market). Every action, job, order and headline that had a soldier in it now has a customs man, a storeman, a clerk or an inspector. Judgement on the question asked: a garrison *exists* in a 1946 frontier town, but a party whose home pin is the barracks, which canvasses the guard, drills with the recruits and works in the army's stores, is a paramilitary party by depiction. The pin had to become civic.
5. **Chalking is words, never a mark.** A symbol chalked on walls with a slogan beneath it is the signature practice of the real thing. Election chalking of the period was words (*Vote X*), so the Rampart Row action chalks *ORDER AND BREAD* and the movement's name. The plain square stays a small UI mark (bullets, the map plate) and nothing else.
6. **The wish** is *Order. Somebody has to keep the streets quiet.* (was *hold the line*, a military idiom).
7. **The Collective's real-world titles go:** *Commissar* → **Convenor** (Rank 4; the convenor of shop stewards), *Comrade-General* → **Tribune** (Rank 6). *Red Guard* and *People's Commissar* (§20.2) become *Strike Picket* and *Branch Inspector*. *People's Hero attire* (a real state honour) goes.
8. **War framing elsewhere in the GDD:** "enemy" → "rival" everywhere (and "opponent" in §20 combat); *The Uprising* → **The Upset** (an electoral upset); *Martial Law in Duskwall* → **Direct Rule in Duskwall**; *Emergency Conscription Act* → **Emergency Permits Act**; *Purge the traitors* → *Clear out the rot*; *raid squad* → *rival crew*; *Militia Guard* → *Vanguard Doorman*; *uniform(s)* → outfits, suits, bunting.

Ids: **no id changes.** Every changed string is display text; the Duskwall ids that carry the old words (`duskwall.garrison-gate.*`, `duskwall.quartermaster-market.*`, `duskwall.beacon-house.muster`, `duskwall.rampart-row.chalk`, `dir.v.guard-change`) stay, because ids are never shown and a character's job, order progress and logs reference them. One data field changes that is not text: the Fortress Gate's kind, `barracks` → `ministry` (no scene for either; the map crop stands in).

---

## 2. Old → new: the GDD

| Section | Old | New | Reason |
|---|---|---|---|
| §5.4 ranks 2–7, Vanguard | Footsoldier / Sergeant / Lieutenant / Captain / Commander / Marshal | **Steward / Bailiff / Prefect / Intendant / Guardian / Keeper of the Gate** | Military ranks (rule 2) |
| §5.4 ranks 4, 6, Collective | Commissar / Comrade-General | **Convenor / Tribune** | Real-world Soviet titles (rule 6) |
| §5.4 note | — | Paragraph explaining both ladders | Record of the decision |
| §7.2 the wish | Order. Someone needs to hold the line. | **Order. Somebody has to keep the streets quiet.** | Military idiom |
| §8.2 outfits | Faction uniform (Tier II) · Ceremonial Vanguard uniform (T IV) | **Party outfit (Tier II)** · **Vanguard dress suit (T IV)** | Uniforms are the militia's |
| §8.4 modifiers | The People's Commissar or similar enemy effects | The **Branch Inspector** or similar **opponent** effects | Real-world title; war word |
| §9.2 | the garrison stores · the Quartermaster's Market · Stores hand at the Garrison Gate | the **customs stores** · the **Customs Market** · Stores hand at the **Fortress Gate** | Duskwall as a customs town |
| §12.1 | Hired at Vanguard Barracks | Hired at **Vanguard House** | Barracks = militia |
| §13.5 kinds | `market`: the military market · `barracks`: Vanguard Barracks, the old barracks · `gym`: Boxing clubs, the running track | `market`: the Customs Market · `barracks`: the old barracks on Garrison Hill (a landmark; no faction building uses this kind) · `gym`: …, **Vanguard House** | The kind list is closed and never shrinks; the faction building moves to `gym` |
| §13.5 Duskwall | Garrison Gate `barracks`, Quartermaster's Market `market` | **Fortress Gate `ministry`, Customs Market `market`** | Location recast; one kind change |
| §14.1 Duskwall | Garrison city on the border: discipline and checkpoints · Vanguard Barracks, state archives, military market | **Frontier town in the mountains: the old fortress, customs and checkpoints** · **Vanguard House, state archives, the Customs Market** | As above |
| §14.4 | buildings open (Barracks, Safehouse, Press Club) · dressing (posters, banners, uniforms in text) | (**Vanguard House**, Safehouse, Press Club) · (posters, banners, **bunting** in text) | Barracks; uniforms |
| §14.6 Corruption Scandal, Vanguard stance | Purge the traitors | **Clear out the rot** | "Purge" is a real-world totalitarian practice |
| §14.11 | A raid squad can cause a crisis · Season Twist *The Uprising* | A **rival crew** can cause a crisis · *The Upset* | War words |
| §14.12 and throughout | enemy home city / enemy-held / Enemy home cities (24 uses) | **rival** home city / rival-held / Rival home cities | Rule 2: rivals, not enemies |
| §15.8 laws | Emergency Conscription Act (Vanguard) | **Emergency Permits Act** (Vanguard); effect unchanged | Conscription is the army's |
| §16.1 Vanguard | A paramilitary movement that believes strength, order and the nation above all are the only way forward. Its strongholds are the industrial outer cities, held through discipline and hierarchy. | **An authoritarian nationalist party that believes strength, order and a strong hand at the top are the only way forward. Its strongholds are the frontier and industrial outer cities, held through discipline and hierarchy. It is a party, not a militia: it has a committee, an organiser, volunteers and stewards, and it courts the police and the customs rather than being them.** | "Paramilitary" is the militia; "the nation above all" echoes a real anthem line |
| §16.1 Vanguard | Signature event: Torchlight March · Exclusive location: Vanguard Barracks (faster STR/AGI training, cheaper bodyguards, military market) | Signature event: **Grand Rally** · Exclusive location: **Vanguard House** (the movement's gymnasium and club, kind `gym`: faster STR/AGI training, cheaper bodyguards, a surplus market) | Real-world event; barracks |
| §16.3 events table | **Torchlight March** (Vanguard) · Standard-bearer, Drummer, 2 Marshals, Lookout · CHA, STR, STR, AGI · Big swing; +Heat… | **Grand Rally** (Vanguard) · **Speaker, Stand-builder, 2 Stewards, Lookout** · CHA, STR, STR, AGI (unchanged) · The movement fills the main square by the thousand: a show of numbers and discipline. Big swing; +Heat… (unchanged) | Real-world event; military roles. Mechanics kept |
| §17.2 patrons | **Colonel Anton Reinholt**, garrison commander | **Commissioner Anton Reinholt**, frontier commissioner (customs and checkpoints) | An army officer as the party's face is the paramilitary link. (Not *Prefect*: that is now a rank) |
| §20 | Enemies · Enemy · the enemy's Wits · if the enemy can be bribed · enemy power rises | **Opponents** · **Opponent** · their Wits · if they can be bribed · opponent power rises | Rule 2 |
| §20.2 | Militia Guard (Vanguard) · Red Guard (Collective) · People's Commissar (Collective) · Secret Police, side Vanguard, "Operations, Level 20+" | **Vanguard Doorman** · **Strike Picket** · **Branch Inspector** · Secret Police, side **State (Vanguard-held cities)**, "Operations in Vanguard-held cities, Level 20+" | Militia; real-world names; the secret police is the state's, run by whoever holds the city |
| §21.2 tiers II–V | Field jacket / commissar coat / campaign suit · Officer's overcoat / Vanguard uniform / barrister's vest · Dress uniform / Red Guard regalia / senator's suit · Marshal's regalia / People's Hero attire / Prime Minister's frock coat | **Steward's jacket / convenor's coat** / campaign suit · **Prefect's overcoat / delegate's greatcoat** / barrister's vest · **Intendant's dress suit / Congress regalia** / senator's suit · **Keeper's regalia / Chairman's regalia** / Prime Minister's frock coat | Uniforms, military and real-world titles; each example now names the rank of its tier |
| §22.3 | *Martial Law in Duskwall* · *The Uprising* | ***Direct Rule in Duskwall*** · ***The Upset*** | Military rule; a word rule 2 names |
| §26 | Named-symbol blacklist; review of all Vanguard content | … against the checklist in this document | Where the checklist lives |
| Appendix C #7 | Open | **Content policy closed** (this document); **chat moderation policy still open** | |
| §0 | — | Change row "content-policy review" | Significant change |

---

## 3. Old → new: the faction card and onboarding (`packages/content/src/data/factions.ts`, origin content)

| Where | Old | New |
|---|---|---|
| `factions[vanguard].rankTitles` | Initiate, Footsoldier, Sergeant, Lieutenant, Captain, Commander, Marshal | **Initiate, Steward, Bailiff, Prefect, Intendant, Guardian, Keeper of the Gate** |
| `factions[collective].rankTitles` | Recruit, Activist, Organiser, Commissar, Delegate, Comrade-General, Chairman | Recruit, Activist, Organiser, **Convenor**, Delegate, **Tribune**, Chairman |
| `factions[vanguard].card.blurb` | Order, discipline, and the nation above all. A movement of ex-soldiers and clerks who want the streets quiet, the ration fair and the frontier shut. They hold Duskwall, the garrison town in the mountains. | **Order, discipline and a strong hand. A party of clerks, foremen and old officials who want the streets quiet, the ration fair and the frontier shut. They hold Duskwall, the frontier town in the mountains.** |
| `factions[vanguard].card.signatureEvent` | the Torchlight March | **the Grand Rally** (rendered *Their event: the Grand Rally*) |
| Origin, step 3, wish A | Order. Someone needs to hold the line. | **Order. Somebody has to keep the streets quiet.** |
| Party-card line, example | Iron Vanguard · Initiate · member since 29 September | unchanged; at Rank 7 it reads *Iron Vanguard · Keeper of the Gate · member since …* (18 characters, four more than *Prime Minister*; the HUD wraps or truncates as it does for that) |

The `(Fascists)` label, the faction names, the crest, the small-mark square and the +3 STR bonus are unchanged.

---

## 4. Old → new: Duskwall (`packages/content/src/data/cities/duskwall.ts`, `headlines.ts`, jobs, order templates)

Full texts are in `docs/design/slice-2-cities.md` §1, which is the checked source for `slice2.content.test.ts`. Ids in the left column are unchanged.

### 4.1 City and locations

| Id / field | Old | New |
|---|---|---|
| city character (doc only) | Garrison city on the border… | Frontier town in the mountains: the old fortress, now the customs house; the checkpoint on the road below it; the goods yard… |
| `duskwall.garrison-gate` name | Garrison Gate | **Fortress Gate** |
| `duskwall.garrison-gate` kind | `barracks` | **`ministry`** (the one non-text data change) |
| `duskwall.garrison-gate` blurb | The gatehouse of the old fortress, now the garrison's front door. The guard changes at four, and the whole town sets its watch by it. | The gatehouse of the old fortress, now the frontier customs house. The shift changes at four, and the whole town sets its watch by it. |
| `duskwall.quartermaster-market` name | Quartermaster's Market | **Customs Market** |
| `duskwall.quartermaster-market` blurb | Tents and trestles under the walls, where the garrison sells what it doesn't need and the town buys what it can't get elsewhere. | Tents and trestles under the walls, where the customs auctions what it seizes at the frontier and the town buys what it can't get elsewhere. |
| `duskwall.beacon-house` blurb | …the volunteers muster in the yard at six. | …the volunteers **gather** in the yard at six. |
| reserved bar (doc only) | The Bugle | The Signal Lamp |

### 4.2 Actions (titles)

| Id | Old title | New title |
|---|---|---|
| `duskwall.garrison-gate.canvass` | Canvass the guard change | **Canvass the customs shift** |
| `duskwall.garrison-gate.drill` | Drill with the recruits | **Shift crates in the bonded store** |
| `duskwall.garrison-gate.stores` | Work your shift in the garrison stores | **Work your shift in the customs stores** |
| `duskwall.quartermaster-market.stall` | Work the sutler's stall | **Work the market stall** |
| `duskwall.beacon-house.muster` | Address the evening muster | **Address the evening volunteers** |
| `duskwall.rampart-row.chalk` | Chalk the movement's mark | **Chalk the slogan on the gable end** |
| `duskwall.rampart-row.run` | Run messages for the street warden | **Run messages for the ward office** |

Unchanged titles: Speak from the gate steps, Canvass the ration queue, Hand out leaflets between the tents, Speak from the lorry bed, Sit in on the district committee, Run the duplicator, Study in the reading room, Search the registers, Canvass the clerks at closing time, Talk to the loaders at the break, Paste posters on the wagons, Note the manifests, Drive the yard lorry, Canvass door to door.

### 4.3 Outcome texts

| Id · outcome | Old | New |
|---|---|---|
| `garrison-gate.canvass` · Success | *They stop for one of their own* — The guard comes off at four, boots loud on the cobbles. … A corporal takes ten leaflets for the billet. | *They stop for one of their own* — **The customs men** come off at four, boots loud on the cobbles. You've the shoulders for it, so they stop. Ration, rents, the checkpoint queues: you keep it short. **A senior man takes ten leaflets for the office.** |
| `garrison-gate.canvass` · Partial | *Most of them march past* — The relief marches through and the old guard heads for the canteen without slowing. … | ***Most of them go past*** — **The night shift goes in and the day shift heads for the canteen without slowing.** You press leaflets on the stragglers. One asks if the movement can do anything about the pay. You say you'll ask. |
| `garrison-gate.speech` · Success | …Order on the streets, bread at a fixed price, the frontier held. Nobody heckles here. When you finish, the sergeant of the guard nods once. | …Order on the streets, bread at a fixed price, **the frontier shut**. Nobody heckles here. When you finish, **the chief of customs** nods once. |
| `garrison-gate.speech` · Partial | *The bugle cuts you off* — You get through prices and the checkpoint queues before the bugle goes for the relief and the square empties at the double. A few townsfolk stay to hear the end. The sergeant looks at his watch. | ***The four o'clock bell cuts you off*** — You get through prices and the checkpoint queues before **the bell goes for the shift and the square empties at a trot**. A few townsfolk stay to hear the end. **The chief** looks at his watch. |
| `garrison-gate.drill` · Trained | *An hour on the square* — The drill sergeant doesn't ask which party you're with; he asks if you can carry a pack. You can, by the end. Your shoulders will tell you about it tomorrow. | ***An hour in the bonded store*** — **The storeman** doesn't ask which party you're with; he asks if you can **get a crate of tinned beef onto the top rack**. You can, by the end. Your shoulders will tell you about it tomorrow. |
| `garrison-gate.stores` · Worked | *Eight hours among the crates* — Blankets, boots, tinned beef, counted in and counted out under a corporal who trusts nobody. … | *Eight hours among the crates* — **Seized tobacco, bonded spirits, tinned beef**, counted in and counted out under **a storeman** who trusts nobody. The paybook gets its stamp. Half came at midnight; here's the rest, with the streak on top. |
| `quartermaster-market.canvass` · Success | …By the time the corporal shouts next, … | …By the time **the clerk** shouts next, … |
| `quartermaster-market.canvass` · Partial | Three people in, the corporal drops the flap … | Three people in, **the clerk** drops the flap … |
| `quartermaster-market.leaflets` · Success | …and the market provost never sees you. | …and the market **inspector** never sees you. |
| `quartermaster-market.leaflets` · Partial | *The provost sees you* — Half the bag is gone when the market provost plants himself in the row … | ***The inspector sees you*** — Half the bag is gone when the market **inspector** plants himself in the row … |
| `quartermaster-market.speech` · Partial | …for the tea stall and a provost who looks bored. … | …for the tea stall and **an inspector** who looks bored. … |
| `quartermaster-market.stall` · Worked | …and the provost has stopped asking. | …and **the inspector** has stopped asking. |
| `archives.registers` · Success | Who moved into the officers' terrace last spring, … | Who moved into **the new terrace by the fortress** last spring, … |
| `goods-yard.lorry` · Worked | Six runs between the sidings and the garrison depot, … | Six runs between the sidings and **the customs depot**, … |
| `rampart-row.chalk` · Success | …You get HOLD THE LINE up in fair capitals, the square beneath it, before the rent-man's boy comes round the corner. … | …You get **ORDER AND BREAD** up in fair capitals, **the movement's name beneath it**, before the rent-man's boy comes round the corner. Then you're away down the entry. |
| `rampart-row.chalk` · Partial | *Half a slogan* — You get as far as HOLD THE before a window goes up … | *Half a slogan* — You get as far as **ORDER AND** before a window goes up and someone shouts about their wall. You finish the last word small and leave by the back entry. It reads, just about. |

Every other Duskwall outcome text is unchanged (including *Address the evening volunteers*' texts: "Forty volunteers in the yard at six, caps off, waiting to be told" is a party briefing, and "the front row" stays on the QA test's allowed list).

### 4.4 Jobs (`duskwall-stores-hand`, `duskwall-street-vendor`, `duskwall-driver`)

| Field | Old | New |
|---|---|---|
| Stores hand · location and action | Garrison Gate, *Work your shift in the garrison stores* | Fortress Gate, *Work your shift in the customs stores* |
| Stores hand · blurb | Eight hours counting blankets and boots in the garrison stores. Vanguard members draw a fifth more. | **Eight hours counting seized tobacco and bonded spirits in the customs stores.** Vanguard members draw a fifth more. |
| Street vendor · location and action | Quartermaster's Market, *Work the sutler's stall* | Customs Market, *Work the market stall* |
| Street vendor · blurb | …from a stall in the Quartermaster's Market. The provost has stopped asking. | …from a stall in the **Customs Market**. **The inspector** has stopped asking. |
| Driver · blurb | The yard lorry between the sidings and the garrison depot, … | The yard lorry between the sidings and **the customs depot**, … |

### 4.5 Order templates

| Id | Old line | New line |
|---|---|---|
| `dir.v.guard-change` | The guard changes at four. Be at the gate before it. | **The customs shift changes at four.** Be at the gate before it. |
| `dir.v.sharpen-up` | A soft organiser is no use to me. The drill square, or the reading room. | A soft organiser is no use to me. **The bonded store**, or the reading room. |

### 4.6 The Sentinel (`headlines.ts`)

| Id | Old | New |
|---|---|---|
| `hl.v.welcome` deck | …Spend it at the Garrison Gate first. | …Spend it at the **Fortress Gate** first. |
| `hl.v.rank-up-2` | {name} Made Footsoldier by the Movement · Initiates become Footsoldiers on the strength of their work. The vote follows. | **{name} Made Steward by the Vanguard** · **Initiates become Stewards** on the strength of their work. The vote follows. |
| `hl.v.rank-up-3` | {name} Made Sergeant by the Movement · A Sergeant can stand for the council. Organiser Stahl: "Now we shall see." | **{name} Made Bailiff by the Vanguard** · **A Bailiff** can stand for the council. Organiser Stahl: "Now we shall see." |
| `hl.v.rank-up` | {name} Made {rank} by the Movement | {name} Made {rank} **by the Vanguard** (deck unchanged) |
| `hl.v.orders-done` headline | Movement Commends Its Canvassers | **Vanguard Commends Its Canvassers** |
| `hl.v.away-no-job` deck | …The garrison stores are still hiring: the Jobs card is at the Garrison Gate. | …**The customs stores** are still hiring: the Jobs card is at the **Fortress Gate**. |
| `hl.v.morale-fired` deck | The garrison town stands in step. | **The frontier town is of one mind.** |
| ambient pool | Garrison Band to Play Sunday in the Square | **Town Band to Play Sunday in the Fortress Square** |

`{rank}` now resolves to the new Vanguard titles; nothing else in the Sentinel hard-codes a title.

---

## 5. Crest verdicts

**Red Collective, `crest.collective.svg` ("a hammer raised through a gear wheel"): change it.** The composition is a diagonal hammer on a red disc inside a cream ring: the silhouette of the hammer and sickle with the sickle removed, and hammer-and-cogwheel is itself a family of real communist-party and state emblems (a cogwheel with a tool through it on the flag of a one-party state, the hammer in a ring of grain on others). Rule 6 covers the family, not just the exact device, and the hammer and sickle is banned by law in several countries in the region the game is set in.

**User decision (29 Sep 2026): keep the current crest as it is.** The verdict above is recorded for reference; the flag is closed, the crest ships unchanged and its alt text stays honest ("a hammer raised through a gear wheel"). The brief below is kept in case the art is ever revisited.

*Art brief (do not draw here):* keep the red disc, the cream ring and the circle silhouette (the faction colour and the small mark). Replace the device with **a quayside crane lifting a bale over the river, two mill chimneys behind it**, cream line on the red, in the same flat two-tone cut as the other two crests. It is the Collective's own fiction ("the mill and the docks against the men who own them") and the Coalport map already has the crane on Harbour Quays. **Nothing crossed, no tool, no gear, no star, no wreath, no fist, no rising sun, no clasped hands.** Same file names; the small-mark circle is unaffected.

**Civic Alliance, `crest.alliance.svg` ("a domed hall rising over an open ballot"): passes.** A domed hall with columns above a ballot slot, three short rays, on a blue triangle. Generic civic architecture and a ballot box; no real party or state uses it. One caution for future art: keep the rays as three short strokes. Lengthened into a sunburst over the triangle they would start to read as a lodge emblem, and an eye must never be added above the dome.

**Iron Vanguard, `crest.vanguard.svg` ("an iron gate beneath a lantern"): passes** (already reviewed, onboarding doc §13 Q6). A barred arch beneath a lantern, gold line on black in a square frame: the city's gate. The barred gate sits in the same family as a portcullis, which is a parliamentary emblem, not an extremist one. Black and gold are Prussian and Belgian state colours as much as anything; there is no shirt colour, no rune, no fasces, no eagle, no wreath, no lightning, no arrow, no cross, no torch.

---

## 6. Judged acceptable as it stands

| Item | Where | Why |
|---|---|---|
| The faction names and the "(Fascists / Communists / Democrats)" labels | everywhere | Rule 5: naming is parked |
| "the movement" (lower case) as the Vanguard's word for itself | Duskwall texts, Stahl's lines | A common noun of politics (the labour movement, a civic movement); the echo is only in the capitalised proper noun, which no string now uses (*by the Movement* → *by the Vanguard*) |
| "Initiate" (Vanguard Rank 1), "Recruit" (Collective Rank 1) | §5.4 | Party and campaign words; a campaign recruits volunteers |
| "Steward" as a Vanguard rank and event role | §5.4, §16.3 | The person who keeps order at a political meeting; period, English, generic. It is the rank's job (Rank 2 unlocks event roles) |
| "Chairman" (Collective Rank 7) | §5.4 | Generic; every union and party has one |
| "Picket Captain" (General Strike role) | §16.3 | A trade-union term of art, not a rank |
| "Security" role in the all-faction Rally | §16.3 | Generic |
| Curfew bells, checkpoints, a searchlight on Beacon House, provosts becoming inspectors, "doors that open for the right accent" | Duskwall | These show what the party does to a town; the texts never argue it is right (onboarding doc §5.3, tone) |
| Garrison Hill (Irongate district), "the old barracks" as a landmark, "officers' villas" | §14.7, §17.4 | A capital's historic garrison quarter is a place name; the state's army existed. No party building or player action is set in a barracks |
| "Secret Police" as an opponent and a Dossier source in Vanguard-held cities | §10.2, §20.2 | The state's police, run by whoever holds the city; political-thriller vocabulary, no real-world name. Its side is now labelled *State (Vanguard-held cities)* |
| "Street Enforcer" (Vanguard), "Party Thug" (Alliance) | §20.2 | Political muscle, not a militia; noir vocabulary |
| Special Powers Act, Curfew Order, Dress Code Mandate (Vanguard laws) | §15.8 | Authoritarian civil law, which is the faction's legislative voice |
| "the Acclamation" (the Vanguard's primary) | §15.5 | A vote by shout: authoritarian and civic |
| Combat's weapon and armour tiers (truncheon, revolver…) | §20.3, §21.1 | Combat is a hazard, not a system, and not in slice 2. **Note for the slice that builds it:** the QA regex bans "weapon", "gun" and "rifle" in content; when §20 is built, label the slot by its item (*Cosh*, *Coat*) or extend the allowed list deliberately. Recorded in Appendix C #7's successor if it arises |
| "march" as a campaign verb, and "Rally" as the all-faction event | §0, §16.3 | Campaign vocabulary in CLAUDE.md rule 2 itself; the Torchlight March was removed for its real-world echo, not for the verb |
| Vanguard scene `vanguard-office.png` (desk, wall map, a plain banner, a window) | §9 art table | Reviewed earlier: no symbol on the banner |
| "the front row" in *Address the evening volunteers* | Duskwall | A row of seats; on the QA test's allowed list |

---

## 7. The checklist for future Vanguard content (the content policy, Appendix C #7)

Apply to every string a Vanguard character says, every Duskwall or Vanguard-held text, every rank, event, item, law and headline.

1. **A party, not a militia.** Allowed: committee, organiser, volunteers, stewards, wards, districts, the district office, permits, curfews, inspectors, the ration, the frontier shut, a strong hand. Not allowed: rank words the army uses (footsoldier, sergeant, lieutenant, captain, commander, marshal, colonel, general), drill, muster, garrison, barracks, billet, parade, bugle, patrol, roll call, uniform, regalia described as military, "hold the line", conscription, martial law.
2. **No real-world symbol, salute, colour, slogan, anthem line, title or event.** Not allowed: any shirt colour as identity, torches and torchlight, a chalked or painted mark, "above all", "the nation first", purity, blood, race, storm, leader as a title, purge, salutes, runes, fasces, eagles, wreaths, lightning, arrows. The crest is a gate under a lantern and the small mark is a plain square, used only in UI.
3. **The state is the state.** Police, customs, secret police and the archives belong to the republic; the Vanguard courts, infiltrates or captures them in the fiction, and the texts show that, but the party never *is* them and never has its own armed body.
4. **Written cold.** Texts show what the party does to a town and how people react; no text argues it is right, and no headline praises it beyond what a party paper would print about its own canvassers.
5. **The same for the Collective:** no Soviet or bloc titles (commissar, politburo, presidium, political officer, people's hero), no hammer-and-sickle family in art, no "comrade" as a rank. Allowed: branch, secretary, shop steward, convenor, delegate, tribune, congress, picket, solidarity, the union hall.
6. **War words anywhere:** rival, not enemy; opponent in combat; campaign, contest, battleground and groundswell for the conflict; never front, uprising, war, invasion, siege, troops, army, militia.

---

## 8. For the owners of the other files

- **Developer (`packages/content`):** apply §3 and §4 to `factions.ts`, `cities/duskwall.ts`, `headlines.ts` and the jobs and order templates; change the Fortress Gate's kind to `ministry`; remove every `TODO(content-policy)`; in `qa.content.test.ts` remove the *ex-soldiers* exemption. `slice2.content.test.ts` checks Duskwall word for word against `docs/design/slice-2-cities.md` §1, which is already updated. Recommended, not required: extend the QA war regex with `garrison|barracks|drill|muster|marshal|footsoldier|sergeant|uniform|purge|conscription|paramilitary` so the next slice cannot reintroduce them.
- **Architect (`docs/tech/slice-2.md` §20.3):** the flags are decided here; the section can point to this document.
- **Mockups (`docs/mockups/Main.dc.html`):** the Duskwall map's alt text reads "walled garrison town with parade ground…"; it should read "walled frontier town with its old fortress, archives, searchlight tower…". The art itself needs no change.
- **Art (`E:\Projects\ironGateCity Docs\art-direction\crests\`):** the Collective crest brief in §5.
