# Slice 5 — "Risk": the screens

Game designer, 3 Oct 2026. The screen-by-screen spec for slice 5: the second quarter and the home-city overview, the mission ticket and its briefing, the mission result, the encounter modal, Heat and Health on the HUD with their help notes, the record on the Me tab, the cells, the infirmary, rival ground on the nation map and the city plate, and the hostile journey cards. Rules and numbers are in `docs/design/slice-5-risk.md` (cited as *design §n*). Where a slice-4 screen already does the job it is named and only the change is given.

**Phone first** (375 wide, supported from 360), desktop as the existing screens. **Every string a player reads is in everyday words** (GDD §1.5): no *encounter*, *bluff*, *bribe*, *flee*, *approach*, *criminal record*, *jail*, *hospital*, *surveillance*, *sabotage*, *hostile*; no percentage, roll, check or difficulty anywhere. Heat and marks are numbers because they are costs; odds are words.

## 1. The look, and what already exists

The printed-matter look of the slice-3 and slice-4 screens: paper `#EFE6D2`, ink `#15181A`, the faction colours, Oswald caps for labels, Courier Prime for datelines and anything typed, Source Serif 4 for body, Playfair Display for headlines; the failure colour for *Hot*, *Wanted*, *Taken in* and *Failure*.

Components reused as they are: `CityMap` (frames, outlines, the lock, the quarter bar as `TramBar`), `PlacesList`, `Plate`, `Ticket`, `Stamp`, `ResultModal` (kinds `action` and `political`; a new `mission` kind that is `action` plus the encounter's block), `BottomSheet`, `StoryScreen` (the briefing's rows are its rows), `HudBar`, `HelpButton` and the help notes, `Picture`, `FactionCrest`, `Button`, `ProgressBar`, `JourneyCard`, `CityCard`, the Me tab's rows, the desk rows.

New components (plain props, no tRPC): `MissionTicket` (a `Ticket` with the risk line and the *Again* / *Choose another way* pair), `MissionBriefing` (a `BottomSheet` with `StoryScreen` rows), `WayRow`, `RiskLine`, `EncounterModal`, `EncounterRow`, `HeldScreen` (the cells and the infirmary share it), `RecordRow` (the Me tab), `HeatRow`, `HealthBar` (the HUD's bar in the Energy bar's style, ink on the failure track).

---

## 2. The HUD, the Me tab and the help notes

### 2.1 Heat on the HUD

Under the Political Capital line, **only when Heat is above 0**: *Heat 32 · Noticed* in Courier 11 px; the state word in ink for *Cool* and *Noticed*, in the failure colour for *Hot* and *Wanted*. No bar: Heat is a number that falls, not a bar that fills. Tap the label (dotted underline) for the help note. On the narrowest phones the line wraps rather than shortens, as Political Capital's does.

### 2.2 Health on the HUD

A third thin bar under Party XP, **only while Health is below full**: label *Health*, the value *96 / 125* at the right, the bar ink on the failure track. It disappears when full. Tap the label for the note. The Me tab shows it always.

### 2.3 Help notes (`copy.help.*`; the review-1 pattern: kicker, two lines)

| Key | Kicker | Note |
|---|---|---|
| `heat` | Heat | How much notice the police are taking of you. It rises with the harder work and cools five an hour on its own. From 25 the police start to turn up; from 50 a mark on your record can mean the cells. |
| `health` | Health | What a run-in costs you. It comes back on its own, ten every ten minutes. At nothing you wake in the infirmary; twenty minutes, or pay to walk out. |
| `record` | Your record | What the police have on you: a mark each time your name is taken. On file at one, a repeat offender at three, notorious at six. Marks fade in a fortnight if you stay quiet; 30 Political Capital strikes one off. |
| `risk` (the ticket's risk word) | Risk | The chance of a run-in on the way out: someone at the door who wants a word. Heat, your record and rival ground all raise it. A run-in is one choice: fight, run, talk, or pay. |
| `mission` (the *Missions* kicker) | Missions | The harder work: a briefing, two or three ways to do it, one tap. It can fail, which pays a little XP. The game remembers your way, so the second time is one tap. |
| `rivalGround` (the plate's kicker on rival ground) | Rival ground | The other side's home town. Everything is harder, Heat doubles, every tap can bring a run-in, and party work pays half again. Nothing you own is at risk; the worst is a night in the cells and the train home. |
| `cells` | The cells | A sentence of ten to sixty minutes, by your Heat. Pay bail or wait; either way you walk out with Heat at 25. Energy, the wage and the vote carry on without you. |
| `infirmary` | The infirmary | Twenty minutes on the ward after a run-in lost. Walk out well for 100 Iron, or discharge yourself at half strength. Energy, the wage and the vote carry on without you. |

### 2.4 The Me tab

Under the party card, three new rows in the stats block's style:

- **Health** · *125 / 125* (always).
- **Heat** · *32 · Noticed · cool by 20:40* (or *0 · Cool*).
- **Your record** (`RecordRow`) · *Clean* / *On file · 2 marks · one fades on Thursday* / *Repeat offender · 4 marks* / *Notorious · 7 marks · bail doubled*; a text button at the right when there is a mark: **Have a mark struck off · 30 Political Capital** (one tap → `ResultModal kind="political"`, stamp **Struck off**, headline *One mark fewer*, body *The oldest mark on your record is gone. {n} left. The branch's friend at the station says nothing.*, knock-on *−30 Political Capital · {left} left*). *Needs 30 Political Capital* disabled otherwise.

The scoreboard lines and the residence line are unchanged.

### 2.5 The desk (the paper)

Two rows when they apply, after *Rested*: **Heat** · *Noticed (32), cooling · Cool by 20:40*; **Your record** · *On file · 2 marks*. On rival ground a row before them: **Where you are** · *Rival ground · Duskwall · everything is harder here*. In the cells or the infirmary the desk's first row is the held line: *In the cells at Harbour Police · 24 minutes to go · bail 150 Iron* (tap → the held screen).

---

## 3. The second quarter and the home overview

### 3.1 The quarter bar

The slice-4 `TramBar` on every home-city quarter view, labelled with the quarters: *The Mill* · *The Harbour* · *The Sidings*; the current one inverted; a locked one carries a small lock mark and its tap opens the teaser sheet (§3.3) instead of moving. 44 px high above the orders panel, as in the capital.

### 3.2 The overview (route `/city/{cityId}`; the capital's `CityPage` path)

The whole picture zoomed out, covering the box, free drag and zoom within the review-3 limits; **the quarters as outlines with their names** (the district lock's look: a printed paper line over a thin ink edge, the name on the quarter's heart in Oswald caps); no place pins. Tapping an open quarter's outline or name zooms smoothly into its frame (300 ms; a cut under reduced motion) and holds the player there, as a district does; *‹ Coalport* on the plate returns. A locked quarter's outline is drawn the same, with its lock line under the name in Courier 10 px (*Opens at Level 6* / *Opens with a later edition*); tapping it opens the teaser sheet. The Places pill reads **Quarters** here and lists the three with their lock lines. The city plate on the overview: the city's name, the morale line and the Election card as the quarter views have them.

### 3.3 The teaser sheet

`BottomSheet`, kicker *QUARTER · OPENS AT LEVEL 6* (or *· A LATER EDITION*), the name in Playfair 20 px, the three-line blurb from content (*The Harbour: where the basin opens to the sea: the slipway, the customs house, the infirmary, the police, and across the water by ferry the far bank with its fish market and its lower town that votes late.*), and one Courier line: *Level 6 opens it; you are Level {n}.* No button but Close.

### 3.4 The quarter view

`CityMap` with the quarter's frame and only its pins (numbered 7–11), the quarter bar, the Places list, the plate's subtitle *Coalport · The Harbour*. Everything else as the Mill's view today. The infirmary's and the police station's sheets are ordinary sheets with two tickets each (design §3); the service screens (§6, §7) are not reached from the sheet.

---

## 4. The mission ticket and the briefing

### 4.1 The ticket (`MissionTicket`)

On a place's sheet, after the tier-1 tickets, under a kicker **MISSIONS** on a double rule (tap: the help note). A `Ticket` with:

- the stub: the Energy (*15* over *ENERGY*);
- the title (body 600) and the tags line in Oswald caps 10 px: the type label (**Mission · Speech** / **Mission · Watch and listen** / **Mission · Against the Vanguard**), then the odds word and the stat of the remembered way, or of the player's best way the first time (*Fair odds · Agility*), then the usual tags (*Issue: Harbour Rates · opinion +50 %*, *Rival ground · +50 % Party XP · worse odds*, *Party order 1 / 1*);
- **the risk line** (`RiskLine`, Courier 11 px, its own row): *Heat +8 · Risky · if caught, a mark on your record* (*Heat +0 · A little risk* on a speech; *Safe* never appears on a mission: every mission has some). The risk word is dotted-underlined; tap for the note. In the failure colour when the word is *Dangerous*;
- the buttons: first time, one button **Choose a way** (64 px, the training button's size); after that, **Again** with *15 Energy* under it (the ×3 button's two-line form) and a text button under the ticket, *Choose another way*;
- locked: the ticket dimmed, no button, one reason in the slot the odds use: *From Level 8* · *Organisers and above* · *Needs a Known reputation here* · *Not with your record* · *Needs 15 Energy*.

### 4.2 The briefing (`MissionBriefing`)

A `BottomSheet` (at most 70 dvh; a 480 px panel on desktop), kicker *MISSION · THE SHIPYARD*, the title in Playfair 20 px, the briefing (body 15 px, 2–3 lines), then the rows (`WayRow`, the `StoryScreen` row: full width, 56 px min, 1.5 px ink border):

- the way's title (body 600);
- under it in Courier 11 px: the odds word and the stat (*Fair odds · Strength*), and, when the way's risk differs from the ticket's, its own risk line (*run-in: Dangerous*);
- the hint (body italic 13 px, one line, wraps to two);
- the remembered way sits first with a Courier tag *Last time* at its right.

Tapping a row is the choice; the row inverts and the sheet's sticky button reads **{Way} · 15 Energy** (one more tap to confirm, so a brush on a row is not a spend; the row's tap selects, the button spends; on desktop the same). *Needs 15 Energy* disabled when short. Escape and Close close it with nothing spent.

### 4.3 The result (`ResultModal kind="mission"`)

The slice-4 action modal with:

- the art: the rung-4 mission card for the type (design §21), else the place's kind scene, else the map crop; the stamp **Success** / **Partial** / **Failure** (failure colour) / **Taken in** / **Taken to the infirmary**;
- **the run-in block** first, when there was one (above the headline): the opponent's portrait at 40 px, their label (*A Vanguard street enforcer*), one line for what you did and one for how it went (*You paid him off. He takes the notes without counting and steps back onto the kerb.*), and the Health line if any (*Health 125 → 109*); under it the reason line when the choice did not come off (*Your Agility is low for this. Raise it at Harbour Quays.* / *You were outmatched. Strength is what counts in a fight; a coat with some weight to it helps.*);
- the headline and body of the mission's outcome;
- *How it went*: one row, *Success* / *Partial* / *Failure* with its XP and, under a row that is not a Success, the reason (*It went badly. The odds were only fair…*); after a Run or a loss the row reads the outcome the check gave with a Courier note *dropped: you ran* / *dropped: you lost*;
- the receipt: XP, Party XP (with *rival ground +6* and *won at full strength +1* as parts), Iron (with *−6 your record* and *−60 paid off* as parts), opinion (*Opinion against the Vanguard in Coalport · −0.20 · Vanguard 70.0 → 69.8 %*), the keepsake if any;
- knock-on lines in this order: **Heat** (*Heat +8 → 32 · Noticed · cools by 20:40*; the first crossing of a state adds the one-line card: *NOTICED · The police have started to take an interest…*), **the record** (*The police took your name · 1 mark · On file*; the first mark adds its card), *Agility +¼ · 3 more for a point*, Reputation, the orders, *Missions remember: next time, one tap* (first time only), the Issue's points;
- the buttons: **Again · 15 Energy** · **Continue** (no *Three more*); when the player was taken in or carried off, one button: **To the cells** / **To the infirmary**.

---

## 5. The encounter modal (`EncounterModal`)

Opens over the map the moment the mission's response says a run-in is pending; it cannot be dismissed (closing the tab leaves it pending, and the next read resolves it by luck). A `ResultModal`-sized card:

1. **Art:** the opponent's portrait (4:5, 96 px on a phone, 128 on desktop) at the left of a band in ink; beside it the kicker *A RUN-IN · THE FAR BANK*, the label in Playfair 20 px (*A Vanguard street enforcer*), and the *appears* line in body italic (*A man in a good coat steps off the kerb and asks what party you're with. He knows.*).
2. **Your line:** Courier 11 px: *Health 125 / 125 · Heat 14 · Cool*.
3. **The rows** (`EncounterRow`, the `StoryScreen` row, four of them, 56 px min):
   - **Fight** · *Fair odds · Strength*
   - **Run** · *Long shot · Agility*
   - **Talk your way out** · *Long shot · Charisma*
   - **Pay them off · 60 Iron** · *nearly always works*; disabled with *Won't be bought* for the inspector; *Needs 60 Iron* when short.
   A small Courier tag *best free odds* sits at the right of whichever of the first three is best.
   Tapping a row is the choice (one tap, final: the sheet's confirm pattern is not used here, since a run-in is one choice by design and the odds are on the row).
4. **Under the rows,** a text button **Leave it to luck** (takes the best free odds) and one Courier line: *One choice. If you close the game, it's left to luck.*

Desktop: the same card at 520 px. Reduced motion: no slide. The response renders the mission's result modal (§4.3) with the run-in block; there is never a separate encounter result.

---

## 6. The cells (`HeldScreen kind="cells"`, route `/held`)

Shown in place of the map while `character.held.kind === 'cells'`; the Map tab lands here; the Paper, Me and Council tabs work; the HUD is the HUD. Paper background; the art is the `jail-cell` scene with the stamp **Taken in** and the place line *Harbour Police · Coalport*.

1. **Header:** kicker *THE CELLS · HARBOUR POLICE*; Playfair 22 px *38 minutes*; Courier under it *out at 15:12 · or pay bail*; a 2 px progress track that empties with the sentence, ticking on the client.
2. **The duty officer:** `portrait.duty-officer` at 48 px and one line in body italic, by case: *"Name." He has it already. "Address." He has that too. He writes slowly, because he can.* (home) · *"Visiting, were we." He writes it down. The train home leaves when we say.* (rival ground) · *"You again." The book is already open at your page.* (a second arrest in seven days).
3. **The sentence** (body 15 px, a rule above and below): *You can close the game. The door opens at 15:12 either way, and Energy keeps refilling in here.*
4. **Buttons:** **Pay bail · 150 Iron** (`primary`, full width; *Needs 150 Iron* disabled; a Courier line under it on rival ground: *Bail is double on rival ground*; for Alliance members: *Legal Aid: half price*) and, under it, a `Ticket`: **Listen to the cells** · *Watch and listen* · *Good odds · Intelligence* · 3 Energy · **Once** (the cell's one tap; the result modal as any intelligence action).
5. **While you wait:** the `LettersRow` rows: **Read the Paper** and the residence's **Election** row.
6. **Release** (bail paid, or the time read at or after `until`): `ResultModal kind="political"`, stamp **Released**, headline *Out, with the duty officer's regards*, body *Heat is down to 25 and the duty officer has your page. He says mind how you go.*, knock-on *Heat 58 → 25 · Noticed* · *−150 Iron · bail* (when paid); **Continue** → the police station's pin with its sheet open. On rival ground the stamp is **Put on the train**, the headline *Escorted to the station*, the body *Two constables, one platform, and a ticket you didn't buy. Duskwall is barred to you until tomorrow. The train home leaves when they say, which is now.*, knock-on *Heat → 25* · *Barred from Duskwall until Thursday 14:20*; **Continue** → the journey screen (no card).

Desktop: the same column at 640 px over the dimmed city map.

---

## 7. The infirmary (`HeldScreen kind="infirmary"`)

The same screen, `kind="infirmary"`: the `hospital` scene with the stamp **Taken to the infirmary** and the place line *The Infirmary · Coalport*.

1. **Header:** kicker *THE INFIRMARY · THE WARD*; Playfair *20 minutes*; Courier *out at 14:40 · Health 30 / 125, rising*; the progress track.
2. **The matron** (`portrait.matron`, 48 px) and one line: *"Politics," says the matron, and puts the thermometer in before you can answer. Twenty minutes. She has seen worse from the rolling mill.* (first time) · *"You again," says the matron. The same bed.* (after).
3. **The sentence:** *You can close the game. You're discharged at 14:40 either way, and Health comes back ten every ten minutes.*
4. **Buttons:** **Walk out well · 5 Energy · 100 Iron** (`primary`: full Health, out now; *Needs 100 Iron* / *Needs 5 Energy* disabled) and **Discharge yourself · 5 Energy** (`outline`: out now at half Health); under them the `Ticket` **Talk to the ward** · *Watch and listen* · *Good odds · Intelligence* · 3 Energy · **Once**.
5. **While you wait:** the Paper and the Election rows.
6. **Discharge:** `ResultModal kind="political"`, stamp **Discharged**, headline *Out, on your own feet* / *Out, well* (paid), body *The matron signs you off without looking up. Health {hp} / {max}. Mind the step.*, knock-on *Health 30 → 63* · *−100 Iron · the ward* · *−5 Energy*; **Continue** → the infirmary's pin with its sheet open.

---

## 8. Rival ground

### 8.1 The nation map (slice-4 §2, changed)

From Level 10 a rival home city's pin is no longer muted: *Duskwall · rival ground · 15 min*. Its card: the name, the line *Rival ground · Home city of the Vanguard*, `OpinionBars`, the two Issues, and a Courier paragraph in place of the lock word: *Everything is harder here. Heat doubles, every tap can bring a run-in, and party work pays half again. Nothing you own is at risk.* Then **Board · 20 Iron · 15 min**. When barred after deportation: *Barred · until Thursday 14:20* and no button. Below Level 10 every card reads *From Level 10* as before.

### 8.2 The journey and the card

The slice-4 journey screen; the card is always drawn on the way in (design §11.4). The checkpoint's *Show your papers* row has no odds word (unchecked) and its detail reads *your party card · it depends on your Heat and your record*; *Pay the lamp · 30 Iron*; the rows otherwise as slice 4's. The arrival modal's place line reads *Duskwall · The Fortress · rival ground* and its knock-on lines carry the warning once: *Rival ground: Heat doubles here, every tap can bring a run-in, and nothing you own is at risk.* plus *Watched today: run-ins likelier in Duskwall until midnight* / *Warned: run-ins less likely…* when a card set a flag.

### 8.3 The city on rival ground

- **The plate:** kicker *DUSKWALL · RIVAL GROUND* (tap: the note), the city's name, the morale line (*Vanguard 70.0 % · Fired up*) with a Courier line under it: *Your work here draws from the Vanguard's morale · 1.3 of 2.0 points left today*, and the Heat line (*Heat 16 · Cool*). No residence card (the card's one line: *You can't live or stand here*). The Election card shows the home residence's state as it does from anywhere.
- **Tickets:** every checked ticket carries *Rival ground · +50 % Party XP · worse odds* and **one button, Once** (no ×3, no cost line under a second button); the orders panel reads *Your orders are in Coalport today*; at an HQ the members-only tickets are dimmed and the *Missions* kicker sits under them with the visitor's missions.
- **The cap reached:** political tickets gain a Courier line *The town has had enough today · no opinion*, and the receipt's opinion row is absent.
- **The paper:** the player's home paper, with the desk's *Where you are* row (§2.5).

---

## 9. Letters: the chapter

*The riverside house* uses the slice-2/3 chapter screens unchanged; the AGI way's row carries a Courier line *Heat +6, whatever happens*, and the result's knock-on block gains the Heat line with its first-time card. The Letters row: *From the marker's other side · The riverside house · Chapter 2 is ready · 15 Energy*.

---

## 10. Phone layout rules

- The HUD with Heat and Health both showing is at most two lines taller than today's on 360 px; neither shows for a player who has done nothing risky, so the slice-1 HUD is unchanged for most.
- The mission ticket is at most four lines (title, tags, risk line, nothing more) plus its buttons; the risk line never wraps on 360 px with the longest strings (*Heat +24 · Dangerous · if caught, three marks on your record* is 56 characters at 11 px Courier, 48 px short of the column).
- The briefing's title, text and first two rows are above the sticky button on 375 × 667; the third row scrolls.
- The encounter modal's portrait band, your line and all four rows are above *Leave it to luck* on 375 × 667; nothing scrolls.
- The held screens' header, the duty officer or the matron, the sentence and the primary button are above the fold; the ticket and the rows scroll.
- The overview's quarter names are at least 0.25 of the picture apart in every home city (The Mill's heart at 0.55, 0.35; The Harbour's at 0.70, 0.66; The Sidings' at 0.38, 0.62 for Coalport; the developer sets the hearts with the outlines) and never overlap at any size.
- Desktop (≥ 1024): the briefing and the encounter are centred cards; the held screens the 640 px column over the dimmed map; the overview full-bleed with the side sheet for the teaser.

---

## 11. Copy (new strings, for `copy.ts`)

*Missions* · *Mission · Speech* · *Mission · Watch and listen* · *Mission · Against the {faction}* · *Choose a way* · *Again* · *Choose another way* · *Last time* · *{way} · {n} Energy* · *Needs {n} Energy* · *From Level {n}* · *{rank3}s and above* · *Needs a Known reputation here* · *Not with your record* · *Heat +{n}* · *Safe* · *A little risk* · *Risky* · *Dangerous* · *if caught, a mark on your record* · *if caught, two marks on your record* · *if caught, three marks on your record* · *run-in: {word}* · *Success* · *Partial* · *Failure* · *Taken in* · *Taken to the infirmary* · *dropped: you ran* · *dropped: you lost* · *It went badly. {cause}* · *You were outmatched. Strength is what counts in a fight; a coat with some weight to it helps.* · *Missions remember: next time, one tap* · *Agility +¼ · {n} more for a point* · *Heat {a} → {b} · {state} · cools by {time}* · *Heat {n} · {state}* · *Cool* · *Noticed* · *Hot* · *Wanted* · *NOTICED · The police have started to take an interest. Run-ins are likelier and a mark on your record is easier to earn. Heat cools five an hour.* · *HOT · The police know your face. Your name taken now means the cells. A quiet day cools it.* · *WANTED · Any mission that goes wrong is the cells. Stay in, or stay legal, until it cools.* · *The police took your name · {n} mark{s} · {level}* · *Second time this week: three marks* · *ON FILE · One mark. It fades in a fortnight if there's no second; Iron from missions is down a tenth until then.* · *Your record* · *Clean* · *On file* · *Repeat offender* · *Notorious* · *{level} · {n} marks* · *one fades on {weekday}* · *bail doubled* · *Have a mark struck off · 30 Political Capital* · *Needs 30 Political Capital* · *Struck off* · *One mark fewer* · *The oldest mark on your record is gone. {n} left. The branch's friend at the station says nothing.* · *−30 Political Capital · {left} left* · *Health* · *{hp} / {max}* · *Health {a} → {b} · full again by {time}* · *A run-in · {place}* · *Health {hp} / {max} · Heat {n} · {state}* · *Fight* · *Run* · *Talk your way out* · *Pay them off · {n} Iron* · *nearly always works* · *Won't be bought* · *Needs {n} Iron* · *best free odds* · *Leave it to luck* · *One choice. If you close the game, it's left to luck.* · *won at full strength +{n}* · *paid off −{n}* · *your record −{n}* · *rival ground +{n}* · *Opinion against the {faction} in {city}* · *The cells · {place}* · *{n} minutes* · *out at {time} · or pay bail* · *You can close the game. The door opens at {time} either way, and Energy keeps refilling in here.* · *Pay bail · {n} Iron* · *Bail is double on rival ground* · *Legal Aid: half price* · *Listen to the cells* · *Released* · *Out, with the duty officer's regards* · *Heat is down to 25 and the duty officer has your page. He says mind how you go.* · *−{n} Iron · bail* · *Put on the train* · *Escorted to the station* · *Two constables, one platform, and a ticket you didn't buy. {city} is barred to you until tomorrow. The train home leaves when they say, which is now.* · *Barred from {city} until {time}* · *The infirmary · the ward* · *out at {time} · Health {hp} / {max}, rising* · *You can close the game. You're discharged at {time} either way, and Health comes back ten every ten minutes.* · *Walk out well · 5 Energy · 100 Iron* · *Discharge yourself · 5 Energy* · *Talk to the ward* · *Discharged* · *Out, on your own feet* · *Out, well* · *The matron signs you off without looking up. Health {hp} / {max}. Mind the step.* · *−100 Iron · the ward* · *In the cells at {place} · {n} minutes to go · bail {iron} Iron* · *In the infirmary at {place} · {n} minutes to go* · *Where you are* · *Rival ground · {city} · everything is harder here* · *rival ground* · *Rival ground · Home city of the {faction}* · *Everything is harder here. Heat doubles, every tap can bring a run-in, and party work pays half again. Nothing you own is at risk.* · *Barred · until {time}* · *{city} · rival ground* · *Rival ground · +50 % Party XP · worse odds* · *Your orders are in {city} today* · *You can't live or stand here* · *Your work here draws from the {faction}'s morale · {left} of 2.0 points left today* · *The town has had enough today · no opinion* · *Rival ground: Heat doubles here, every tap can bring a run-in, and nothing you own is at risk.* · *Watched today: run-ins likelier in {city} until midnight* · *Warned: run-ins less likely in {city} until midnight* · *your party card · it depends on your Heat and your record* · *Pay the lamp · 30 Iron* · *Quarters* · *Opens at Level 6* · *Opens with a later edition* · *Quarter · opens at Level 6* · *Quarter · a later edition* · *Level 6 opens it; you are Level {n}.* · *{city} · {quarter}* · *From the marker's other side* · *Heat +6, whatever happens* · *Keepsake: A page of his ledger*.

British English, no exclamation marks, no percentages for odds, times in the player's local clock.

---

## 12. Settled for the build (3 Oct 2026; `slice-5-risk.md` §23)

- **§4.2 keeps the confirm**: a row selects, the sticky button spends. A first mission is three taps; design §16 counts it so.
- **The cells' voice is the duty officer** (`portrait.duty-officer`, source `mvp/portraits/sergeant.png`): every *sergeant* in §6, §10 and §11 is reworded; the lines are otherwise unchanged (*"Name." He has it already…*).
- **The Heat line** reads *Heat 32 · Noticed · cools by 20:40* only while *Noticed* or above (the time is when it drops under 25); at *Cool* it reads *Heat 12 · Cool* with no time.
- **After a Run** the stamp is the check's outcome and the row reads *Success · dropped: you ran* (design §23.1 #19).
- **The result's one button** after a police loss on a legal mission reads *To the cells* (design §23.1 #3); the cells screen shows Health 30 / max.
