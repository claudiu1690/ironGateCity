# Review 3 — design and copy answers (2 Oct 2026)

Answers to the design items of `docs/review/2026-10-02-review-3.md`: **#3** the result's reward boxes, **#4** the *Again ×3 24* buttons, **#5** *TRAIN* at the Union Hall, **#6** the election screen. Items **#1** and **#2** are the developer's (motion and zoom); §1 and §2 below give only the player-facing rules they must keep. The user's notes are direction. Every rule change is pinned in `docs/GDD.md` (§0, *Added 2 Oct 2026 (review 3)*); the screens are in `docs/design/slice-3-screens.md` §12 (addendum); the pacing check is `docs/economy.md` §18 (nothing moves). The plain-words rule of review 2 (GDD §1.5) applies to every string here.

Nothing here adds a tap to a session. Two things are removed from every result (four tiles become a receipt; three before → after lines go), one word is removed from every training ticket (*Train*), and one tap is added that nobody has to take (*How elections work*).

| # | Item | Decision | Where |
|---|---|---|---|
| 1 | Free zoom | **The player may zoom the city map** between two limits a player can understand: no further in than the painting's finest detail (never blurry), no further out than the scale that still fills the screen (never a dark band) | GDD §14.13 |
| 2 | The sheet pops | **Opening a place is one movement**: the zoom, the dim and the sheet ease in together over 250–350 ms and out in reverse; reduced motion is a quick fade | GDD §14.13 |
| 3 | The XP boxes | **A receipt, not tiles**: one line per reward with its value, a note and (XP, Party XP) a thin bar; a zero line is not printed; level-up and reputation cards unchanged | GDD §13.1a; §3 |
| 4 | *Again ×3 24* | **Every button that spends Energy says what it does and what it costs**: *Once more · 10 Energy*, *Three more · 30 Energy*, *Study again · 46 Energy*; the ticket's buttons read *Once* and *×3* with *30 Energy* under it | GDD §13.1; §4 |
| 5 | *TRAIN* | **The button is the title's verb** (*Study*, *Lift*, *Run*, *Unload*), a content field on every training action; the reason line says *Raise it at the Union Hall*; the training order names the verbs | GDD §8.4, §8.5, §13.7; `cities/*.ts` (done) |
| 6 | Elections | (a) **The council's hall** is a point on each city's picture (content, done) and a map crop of it heads every election screen, day or night; (b) **players and local candidates are told apart on every list**, local candidates are *townspeople run by the game*, seats are explained in words, and a five-line *How elections work* note is one tap away | GDD §15.3, §15.10; §6 |

---

## 1. #1 — Free zoom: the rule (for the developer)

A player may zoom the city map as they like: pinch and double-tap on a phone, the wheel or a trackpad on a desktop, and a **+ / −** pair on desktop beside the Places button. Two limits, both of which a player can see the reason for: **in**, no further than the painting's finest detail (the top tile level at its real size, so the art is never blurry); **out**, no further than the scale at which the picture still fills the screen (never a dark band past its edge, review 3's first note). The map stays filled at every zoom. Zooming has no rule effect; the zoom is remembered for the session, so nothing snaps back on its own. A tap on a pin still zooms into that place, and the Places list still names every place in pin order. A double-tap toggles between the rest view and twice its scale. GDD §14.13 says this; the numbers (the covering scale, the top tile level) are the dev viewer's, not the design's.

## 2. #2 — The place sheet eases in (for the developer)

Opening a place is **one movement**, not three events. The zoom to the pin, the dim overlay over the map and the place sheet start together and arrive together, **250–350 ms** on one curve (the map's existing ease; the sheet slides up from the bottom on phones and rises about 12 px while fading on wide screens; the dim fades to its final opacity). Closing runs the same movement in reverse. Under `prefers-reduced-motion` the sheet and the dim cross-fade in about 120 ms with no movement and the map cuts to the place. The result modal's stamp animation is unchanged. GDD §14.13.

---

## 3. #3 — The rewards block: a receipt, not tiles (GDD §13.1a)

### 3.1 What was wrong

Four bordered tiles in a 2 × 2 grid (4 × 1 on desktop), each a 9 px label, a 22 px number and a note. A canvass fills them (+45 · +6 · +20 · +0.05 %); a training action prints one number and three near-empty boxes (*+0*, *+0*, *—*); an intelligence action two. The boxes are the size of the biggest case and most results are not that case.

### 3.2 The design: one line per reward

The block keeps its kicker *REWARDS* and its tag line (*RESTED +50 % XP AND IRON · PARTY ORDER +25 % PARTY XP*, the petrol caps chips, unchanged). Under them, **a printed receipt**: a list with dotted rules between rows, like the knock-on block but with the number set large. Each row:

- **Label** left, body 13 px (*XP* · *Party XP* · *Iron* · *Opinion in Coalport* · *Keepsake* / *Item*).
- **Value** right, Oswald 17 px semibold, signed (*+45*); the Party XP value in the faction's text colour, as the tile was.
- **Note** under the label, Courier 10.5 px muted, only where there is something to say: the parts (*+40 and Rested +5* · *+5 and party order +1*, the existing part logic), then for XP *· 120 to Level 3* and for Party XP *· 212 / 400 to Activist* (the HUD's own strings, `copy.hud.xpLine` and `fxpLine`, read from the same character view the HUD reads after the gain); for opinion the move of the town's meter, *Collective 84.0 → 84.1 %* (this line moves here from the knock-on block).
- **A bar** under the XP and Party XP rows only: 3 px, the full row width, ink on track for XP (to the next Level) and the faction colour for Party XP (to the next Rank), the HUD's two bars in miniature. At the top Rank the Party XP bar is full and the note reads the total (`fxpTop`).
- **An item row** keeps its 40 px picture at the left and *Keepsake · His election bill* as label and name; no value.

**A zero line is not printed.** A training result is one row (*XP +99* with its bar and *120 to Level 3*); an intelligence action is two (*XP*, *Iron*); a canvass is four. The order is fixed (XP, Party XP, Iron, opinion, item) so the eye learns it. *XP* is the label, as in the HUD and the attempt rows; the help note's kicker stays *Experience*.

```
REWARDS                 RESTED +50 % XP AND IRON · PARTY ORDER +25 % PARTY XP
XP                                                               +45
+40 and Rested +5 · 120 to Level 3
▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱
Party XP                                                          +6
+5 and party order +1 · 212 / 400 to Activist
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱
Iron                                                             +20
Opinion in Coalport                                          +0.05 %
Collective 84.0 → 84.1 %
```

### 3.3 Layout

- **Phone (< 640):** one column, rows full width, min-height 32 px (about 36 with a note, 44 with a bar). Four rows with notes are about 160 px, a little more than the old grid and all of it used; the sticky buttons keep the first screen.
- **Desktop (the 600 px modal):** the same single column; never a four-column grid. A receipt reads down.
- **The knock-on block** loses the *Experience*, *Party XP*, *Iron* and *{Faction} in {city}* before → after lines (the receipt carries them) and keeps *Energy*, *Rested*, *Reputation*, the orders' progress, *Rank*, *Trained* and *Political Capital*. The level-up card, its stat buttons, the Reputation card, the signed order lines and the hooks are unchanged.
- The server payload is unchanged: `rewards.xp/fxp/iron` (`base`, `bonus`, `parts`), `rewards.opinion`, `effects.opinion`, `effects.item`, and the character view's XP, Level and Party XP after the action.

---

## 4. #4 — Buttons that say what they cost (GDD §13.1)

### 4.1 The rule

**A button that spends Energy says what it does and what it costs, in words, and never a bare number.** The pattern is `{What} · {n} Energy` on one line where the line fits, and the cost on a second line in Courier where it doesn't. The Energy colour (`energy` on ink, `energy-light` on ink-2) stays on the cost.

### 4.2 The result modal's buttons

| After | Buttons | Was |
|---|---|---|
| A checked action (×1 or ×3) | **Once more · 10 Energy** · **Three more · 30 Energy** · **Continue** | *Again ×1 10* · *Again ×3 30* · *Continue* |
| A *Trained* result | **Study again · 46 Energy** (the title's verb, §5; the live cost of the next point) · **Continue** | *Again ×1 46* · *Continue* |
| A political act, a chapter | **Continue** | unchanged |

*Once more* is one attempt and *Three more* three, whatever the result was: after a ×3, *Once more* runs one. The words say so; *Again* after a batch did not.

**Phone (< 640):** two rows in the sticky bar. Row 1: *Once more* and *Three more* side by side, each **two lines** (the label in caps 12 px; the cost under it in Courier 11 px, energy-light; min-height 52 px). Row 2: *Continue* (outline, full width). **Desktop (the 600 px modal):** one row of three, the repeat labels on one line (*Once more · 10 Energy*). **Short of Energy:** the button is disabled (as now) and keeps its label and cost; the one hint line under the bar stays, reworded (§7): *Once more needs 10 Energy · ready at 14:20* · *Three more needs 30 Energy · ready at 14:40*. Never two hint lines: if both are short, the first.

### 4.3 The ticket's buttons

The stub stays the price of one (*10* over *ENERGY*). The two buttons at the right read **Once** (was *×1*) and **×3** with **30 Energy** under it in the stub's 8 px caps (energy-light on ink-2), so the one cost the stub does not state is on the button that spends it. Both buttons 52 px wide, the stub's width, so the ticket has a rhythm (52 · text · 52 · 52); on a 375 px phone the title column is 187 px, on 360 px 172 px, which the existing titles wrap inside at two lines. The training ticket's one button is the verb (§5), 64 px as now, and its stub is the live cost. The accessible names are unchanged (*{title}, once, 10 Energy* · *{title}, three times, 30 Energy* · *{title}, 44 Energy*).

### 4.4 Elsewhere

Every other Energy-spending button already names the thing and the cost in words (*Stand · 10 Political Capital* is the model). The Jobs card, the chapter button and the political buttons are unchanged. The *Today* strip's *Energy* label and the HUD are unchanged.

---

## 5. #5 — Training: the button is the verb (GDD §8.5, §8.4, §13.7)

### 5.1 What was wrong

Every training ticket ended in *TRAIN*, which at a reading room reads as *train your Intelligence*. The titles were already right (review 2: *Study in the reading room*, *Lift cargo with the dockers*, *Run messages around the streets*); the button was a category word standing where a verb belongs.

### 5.2 The rule

**The training ticket's button is the title's verb**, one word: *Study*, *Lift*, *Run*, *Unload*. It is content, not code: every training action carries `verb` (`packages/content/src/schemas.ts`, a capitalised word of 2–6 letters so it fits the 64 px button), and the ticket prints it. The *Trained* result's repeat button reads *{Verb} again · {cost} Energy* (§4.2). The stat line stays as it is (*Intelligence 12 → 13 · always works*), the stub stays the live cost, and the stamp stays *Trained*. The tags line keeps the category *Training* beside the Party-order tag: it is the type, like *Speech*, not an instruction, and it is what the orders and the Today tally call the activity.

### 5.3 The nine actions (done in `packages/content/src/data/cities/*.ts`)

| City | Id | Title (unchanged) | Button |
|---|---|---|---|
| Coalport | `coalport.union-hall.reading-room` (INT) | Study in the reading room | **Study** |
| Coalport | `coalport.quays.haul` (STR) | Lift cargo with the dockers | **Lift** |
| Coalport | `coalport.terraces.run` (AGI) | Run messages around the streets | **Run** |
| Duskwall | `duskwall.archives.reading-room` (INT) | Study in the reading room | **Study** |
| Duskwall | `duskwall.garrison-gate.drill` (STR) | Lift crates in the customs store | **Lift** |
| Duskwall | `duskwall.rampart-row.run` (AGI) | Run messages around the streets | **Run** |
| Ashford | `ashford.university.reading-room` (INT) | Study in the college reading room | **Study** |
| Ashford | `ashford.gazette-house.newsprint` (STR) | Unload the paper lorry | **Unload** |
| Ashford | `ashford.weavers-row.run` (AGI) | Run messages up and down the stairs | **Run** |

The titles stay: each already names a place-fitting thing to do, and the content tests hold them against the slice-1 and slice-2 tables word for word. (The user's examples, *Work a shift on the cranes* and *Run the back entries*, were not taken: *shift* is the word the job shed in review 1, and the bodies describe hooks and sacks, not cranes; the verb was the problem, and the verb is what changed.)

### 5.4 The word *train* elsewhere

- **The reason line** (review 2 §2.4) said *Train it at the Union Hall*. Now: ***Raise it at the Union Hall***, *Raise it at Harbour Quays*; the best-stat line *Raising any of them would help*; the *Long shot* note *…raising it would help*. *Raise* is plain, fits any place, and matches *Intelligence 12 → 13*.
- **The training order** (`dir.sharpen-up`, `dir.v.sharpen-up`, `dir.a.sharpen-up`) was *Train once, anywhere in {city}*. Now it names the verbs: ***Study, lift or run once in Coalport*** · ***Study, lift or run once in Duskwall*** · ***Study, unload or run once in Ashford*** (35–36 characters; the secretaries' lines are unchanged). The developer applies it in `orders.ts` and the two design tables the tests read (`slice-1-content.md` §6, `slice-2-cities.md` §1.5 and §2.5).
- Unchanged: the type label *Training*, the stamp *Trained*, the tally's *Trained*, the help notes.

---

## 6. #6 — Elections: the hall, and the system in plain words (GDD §15.3, §15.10)

### 6.1 (a) The backdrop: the council's hall

Each home city names the building its council sits in, as a point on the painted city picture (`council.hall` in `cities/*.ts`, fractions like a pin; done). It is a backdrop and a name, not a location: no pin, no actions, no sheet.

| City | Building (on the painting) | `hall` | Why this one |
|---|---|---|---|
| **Coalport** | The domed hall on the river between the Union Hall and the Mill Gate, the biggest civic building in the picture (no survey pin) | **x 0.525 · y 0.19** · *Town Hall* | The dome sits at 0.525, 0.17 and the front steps at 0.53, 0.25; the point is between them so a 150 px header holds the dome and the colonnade |
| **Duskwall** | The tower hall on the north-east side of the Customs Market, below the fortress: a spire over a clock, a long civic front facing the stalls (no survey pin; Beacon House at 0.38, 0.45 is the Vanguard's, not the town's) | **x 0.555 · y 0.55** · *Town Hall* | The spire tops at 0.552, 0.45 and the front runs 0.54–0.59 × 0.56–0.62; the point holds the tower and the front |
| **Ashford** | The clock-tower hall by the river bridge, the survey's `ashford.town-hall` (0.80, 0.235, third quarter) | **x 0.805 · y 0.275** · *Town Hall* | The survey pin is on the clock; the point is lowered so the header shows the clock face and the main front together |

**The header.** Who's standing, the vote, the result and the council open on a **150 px (phone) / 180 px (desktop) crop of the city picture at the hall**, built as the result modal's map crop is (`ArtHeader`: the 2048 px still at its native width, never upscaled, the hall point at 50 % of the width and **55 %** of the height so the dome or tower shows above the front; the ink gradient over the bottom 45 %). Over the gradient, bottom-left, the caps line *COALPORT COUNCIL · THE TOWN HALL* (10 px, dim). The paper plate with the title (*Who's standing*, *Your vote*, *Sunday's result*, *The council*) sits under it as now. **Day or night** by the same rule as the map (the night still from 20:00 to 06:00 UTC, §2.2). On a phone the crop shows about a fifth of the picture's width: the hall and its square. No stamp, no clouds. The political result modals keep the masthead strip: the paper is their voice, and *Next* is what they are for.

### 6.2 (b) Who's who, said on every list

The second note in the review was the real one: *Are those NPCs? Are those players?* The design marks locals with a crest instead of a face and the word *local* (§15.10), which told the designer and not the player. From now on every list says it in words:

- **Players first, under a rule:** kicker ***Players standing*** (Oswald caps, the double rule). When nobody has stood: one Courier line, *No player has put their name in yet. The local candidates below fill the list.*
- **Then the locals:** kicker ***Local candidates*** with one Courier line under it, always: ***Townspeople run by the game. They fill the list so there is always an election; you can vote for them, and a player with enough support beats them.***
- **On a local's row** the rank-title slot reads ***Local candidate*** (was *local*, which could read as *from here*): *Local candidate · Trusted in Coalport*. A player's row is unchanged (*Organiser · Known in Coalport · 2 backers*; *you* on your own).
- **The result table and the council's seats** use the same words: the crest and *Local candidate* on a row; *Local seats 6 / 7* becomes ***6 of the 7 seats went to local candidates*** in the result's header line.

### 6.3 (b) How it works, in words

Three sentences carry the system, each on the screen where it is needed, none with a formula:

| Where | Line (Courier under the title unless stated) |
|---|---|
| **Who's standing** | *Seven seats. The seven with the most support take them. Support is the town's own vote for a candidate (their reputation here), plus their backers, plus members' votes.* Then the link **How elections work** (§6.4). |
| **Who's standing, the list** | Under the local candidates' line: *The last seat is usually close: a few votes decide it.* |
| **The stand card** | A fourth Courier line after the three requirements: *A seat is five days on the council: a vote on the town's rule, and 10 Political Capital and 20 Party XP a day.* |
| **Your vote** | *Seven seats · one vote, secret and final · closes Saturday midnight* (as now) and, second line, *Vote for anyone on the list, a player or a local candidate.* Then **How elections work**. |
| **The result** | Header line: *6 of the 7 seats went to local candidates · 3 of 9 members voted · final*. Under the table, replacing the formula: *The seven with the most support took the seats: the town's own vote for each candidate (their reputation here), plus their backers, plus members' votes. A tie goes to votes, then backers, then reputation, then who stood first.* Then **How elections work**. The columns stay (*#* · *Name* · *Local support* · *Backers* · *Votes* · *Support*): an election is a count and its numbers are real and small; *Local support* keeps its tap note. |
| **The council** | Kicker *COALPORT COUNCIL · SITTING AT THE TOWN HALL*; the rest as now. |
| **The Election card** | Unchanged, except that its kicker's note is the new five-line one (§6.4). |

### 6.4 The help note: *How elections work*

One note, five short lines, opened from the Election card's kicker (as now) and from a visible Courier link ***How elections work*** (dotted underline) under the title on who's standing, the vote and the result. It replaces `copy.help.election`:

> **HOW ELECTIONS WORK**
> Coalport elects seven councillors every five days: two days for names to go in, three days of voting, the result the next morning.
> The candidates are players who stand, and local candidates: townspeople run by the game, who fill the list so there is always an election.
> Activists vote once, in secret. Organisers who are Known in Coalport can stand; it costs 10 Political Capital and takes two backers.
> The seven with the most support win. Support is the town's own vote for you (your reputation here), plus your backers, plus the votes.
> A seat is five days on the council: a vote on the town's rule, and 10 Political Capital and 20 Party XP a day.

`{city}`, `{rank2}`, `{rank3}` as the current note; the developer renders the five lines as lines (one note, `whitespace-pre-line` or five paragraphs), not one run-on sentence.

### 6.5 Are the rules themselves confusing?

Two things are worth saying to the user; neither changes a number here.

1. **Nine names for seven seats in a branch of one.** With no player standing, the vote can only decide the last seat between the bottom locals (profiles 19, 17, 15, §15.10). The design intends it (*a handful of votes decides the last seat*), but the screen never said so, which is why the vote felt like nothing. The wording above says it (*The last seat is usually close: a few votes decide it.*). **If the playtest still finds voting pointless, the lever is the fill, not the words:** fill the list to **eight** names when fewer than two players stand, so there is one visible loser and the votes choose who. That is a §15.10 number and needs the user's decision; it stays nine until then (Appendix C #44).
2. **Three ingredients of support** (reputation, backers, votes) are one more than a first-timer expects, but each is a thing the player already does (work here, find backers, vote), and in words they read as a story rather than a sum. Kept. The deposit rule (*costs 10, back only if your name comes off*) is odd but small and already worded; kept.

---

## 7. Strings for `copy.ts` and `orders.ts` (the developer wires them)

```
// §4: buttons that say what they cost
again.once:        (cost) => `Once more · ${cost} Energy`          // two lines on phones: ['Once more', `${cost} Energy`]
again.three:       (cost) => `Three more · ${cost} Energy`
again.train:       (verb, cost) => `${verb} again · ${cost} Energy`   // "Study again · 46 Energy"
again.onceNeeds:   (cost, readyAt) => `Once more needs ${cost} Energy · ready at ${readyAt}`
again.threeNeeds:  (cost, readyAt) => `Three more needs ${cost} Energy · ready at ${readyAt}`
ticket.once:       'Once'
ticket.three:      '×3'
ticket.threeCost:  (cost) => `${cost} Energy`                      // the line under ×3
x3Needs:           (cost) => `×3 needs ${cost} Energy`             // unchanged (the ticket's hint)

// §3: the receipt
reward.xp: 'XP' · reward.fxp: 'Party XP' · reward.iron: 'Iron' · reward.opinion: (city) => `Opinion in ${city}`
reward.keepsake: 'Keepsake' · reward.item: 'Item'
reward.parts: (base, parts) => `${base} and ${parts}`              // "+40 and Rested +5" (existing logic)
reward.toLevel: copy.hud.xpLine · reward.toRank: copy.hud.fxpLine / fxpTop
reward.opinionMove: (faction, before, after) => `${faction} ${before} → ${after} %`

// §5: the verb (content: action.verb → ActionView.verb) and the reason lines
reason.statLow:     (stat, place) => `Your ${stat} is low for this.${place ? ` Raise it at ${place}.` : ''}`
reason.statLowTwo:  (a, b, weak, place) => `This needs ${a} and ${b}, and your ${weak} is the low one.${weak === 'Charisma' ? ' It comes from what you wear.' : place ? ` Raise it at ${place}.` : ''}`
reason.statLowBest: (stat) => `Even your best, ${stat}, is low for this. Raising any of them would help.`
odds.note.long:     (stat) => ['Long shot', `Fewer than one try in two come off here. It uses your ${stat}; raising it would help.`]
orders: dir.sharpen-up 'Study, lift or run once in Coalport' · dir.v.sharpen-up 'Study, lift or run once in Duskwall' · dir.a.sharpen-up 'Study, unload or run once in Ashford'

// §6: the election screens
hall.kicker:        (city, hallRef) => `${city} Council · ${hallRef}`        // "Coalport Council · the Town Hall" (caps)
council.sittingAt:  (city, hallRef) => `${city} Council · sitting at ${hallRef}`
playersStanding:    'Players standing'
noPlayersStanding:  'No player has put their name in yet. The local candidates below fill the list.'
wardCandidates:     'Local candidates'                                       // unchanged
localCandidatesLine:'Townspeople run by the game. They fill the list so there is always an election; you can vote for them, and a player with enough support beats them.'
lastSeatClose:      'The last seat is usually close: a few votes decide it.'
ward:               'Local candidate'                                        // was 'local'
howDecided:         'Seven seats. The seven with the most support take them. Support is the town\'s own vote for a candidate (their reputation here), plus their backers, plus members\' votes.'
seatGives:          'A seat is five days on the council: a vote on the town\'s rule, and 10 Political Capital and 20 Party XP a day.'
voteAnyone:         'Vote for anyone on the list, a player or a local candidate.'
resultHeader:       (npcSeats, seats, voters, eligible) => `${npcSeats} of the ${seats} seats went to local candidates · ${turnoutOf(voters, eligible)} members voted · final`
formula:            'The seven with the most support took the seats: the town\'s own vote for each candidate (their reputation here), plus their backers, plus members\' votes. A tie goes to votes, then backers, then reputation, then who stood first.'
howElectionsWork:   'How elections work'                                     // the link
help.election:      (city, rank2, rank3) => ['How elections work', [ ...the five lines of §6.4 ]]
```

Vocabulary check (review 2 §1.13): none of the above carries a system term; *Local candidate* and *local candidates* are allowed words; *ward* and *slate* appear nowhere.

---

## 8. For the developer, by file

1. **`packages/content`** (done, tests green): `schemas.ts` — `TrainingAction.verb` (required) and `City.council.hall { name, ref, x, y }`; the nine `verb`s and the three `hall`s in `cities/*.ts`; `test/slice3.content.test.ts` line 265 keeps the hall so the offset is what fails. Still to do: `copy.ts` (§7), `orders.ts` (§5.4) with the two design tables the tests read.
2. **`packages/rules/src/types.ts`**: `ActionView.trains` gains `verb` (or `ActionView.verb?: string`); `CouncilView`, `ElectionView` and `CountView` gain `hall: { name, ref, x, y, asset: { day, night } }` (the server maps `council.hall` and the city's `map` assets). `ActionResult.again` gains `verb?` for the *Trained* case.
3. **`packages/ui`**: `Ticket.tsx` — *Once* / *×3* + cost line, the verb button; `ResultModal.tsx` — the receipt (`RewardRow`, replacing `RewardTile`/`Tile`), the knock-on block trimmed, the two-row button bar on phones; a `HallHeader` (lift `ArtHeader`'s crop into a shared component with a `y`-offset of 55 %); `Politics.tsx` — the group kickers and lines, *Local candidate*, the *How elections work* link (a `HelpButton` with the five-line note).
4. **`apps/client`**: `council.tsx` — the four screens get the `HallHeader` and the lines of §6.3; `city.tsx` — nothing (the card is unchanged); the zoom and the sheet motion of §1–§2 in `CityMap.tsx` and the sheets.
5. **Tests to update:** `components.test.tsx` (the training button reads *Study*, not *Train*), `ResultModal.test.tsx` and `review1.test.tsx` (*Raise it at*), `qa.spec.ts` (*Once more* / *Three more*; *Study again*), the vocabulary regex unchanged; new: every training ticket's button equals the action's `verb`; no result button text matches `/\d$/` without the word *Energy* after it; a result with `fxp.total === 0` renders no Party XP row; each election screen's header carries `data-art` with the city's day or night asset.
6. **Migration:** none. `council.hall` is content; no document stores it.

---

## 9. For the user to decide

1. **The fill at low population** (§6.5, Appendix C #44): keep nine names and say that the last seat is close (this document's default), or fill to eight when fewer than two players stand so the votes pick one visible loser. A §15.10 number; not changed here.
2. **The receipt's bars** (§3.2): the XP and Party XP rows carry a thin bar to the next Level and Rank. Pinned here because the user offered *one line per reward with its bar*; if it reads as clutter in the next play-through, the bars go and the notes stay.
3. **The ticket's *Once***: *×1* became *Once*; *×3* stays a symbol because *Three times* does not fit a 52 px button. If *Once* / *×3* reads as a mismatch, the fallback is *1×* / *3×*.
