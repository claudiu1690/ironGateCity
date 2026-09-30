# Slice 2 — "Arrival": the onboarding script

> **Vocabulary superseded (review 2, 30 Sep 2026).** Player-facing words follow `docs/design/review-2-answers.md` §1 and GDD §1.5: *canvass* → *talk to voters*, *flyers* → *flyers*, *ordinance* → *council rule*, *endorse* → *back*, *the slate* → *who's standing*, *nominations* → *candidates*, *the ballot* → *vote*, *the count* → *the result*, *Local Standing* → *Reputation*, *FXP* → *Party XP*, *PC* → *Political Capital*, *Battleground* (the state) → *close race*, *Groundswell* → *comeback*, *Polling Day* → *Election*. Action and order titles below were updated mechanically; rule prose keeps the design's terms. Odds and rolls are no longer shown to players (GDD §8.4): percentages quoted here are design maths, not screen text.

Game designer, 29 Sep 2026; Vanguard strings revised the same day by the content-policy review (`docs/design/content-policy-review.md`). Companion to `docs/design/slice-2-cities.md` (Duskwall and Ashford content) and `docs/economy.md` §13. The architect writes the slice-2 tech design from these two documents; every rule and number here is also in the GDD (edits listed in §12).

**Playtest question:** does a brand-new player understand what to do in the first 10 minutes, without a tutorial screen?

**Rules this script obeys:** the origin is a tier-3 story of three steps, resumable at every tap, 2–3 lines of narrative per step (§1.2 pillar 7, §13.1); the whole origin plus the faction choice takes about two minutes, and the player taps a real action inside three; nothing requires being online at a set time; there is no tutorial screen, so the paper, the Party orders, the ticket tags and the result modal do the teaching; campaign vocabulary only; 1946, noir, British English.

---

## 1. The flow at a glance

| Minute | Screen | Taps | What the player does |
|---|---|---|---|
| 0:00 | **Sign-up** | 1 | Name, face (six portraits), email, password → *Join the campaign* |
| 0:30 | **Origin, step 1** *The room* | 2 | Two of his questions: the summer, the trouble |
| 1:00 | **Origin, step 2** *The talent* | 2 | His talent question; the coat |
| 1:30 | **Origin, step 3** *The promise* | 2 | The promise (the Ambition); his last question (the wish) |
| 1:50 | **The street** | 1 + 1 | He dies. Three faction cards; pick one, confirm: *Join the Red Collective · take the train to Coalport* |
| 2:15 | **The welcome edition** | 1 | Masthead, three headlines, three Party orders, a letter, your desk → *To the city* |
| 2:45 | **The city map**, the first pin's sheet already open | 1 | The canvass ticket: *×1 · 10 Energy · 66 %* → the result modal |
| 3:00 | **The result modal** | — | Stamp, text, the roll, four tiles, *Party order 1 / 2* |

Eleven taps from sign-up to the first result, no screen that only explains. Every step after sign-up is resumable: close the tab at any point and the same screen is waiting.

---

## 2. The origin story (§7.1–7.2)

A tier-3 story in three steps. Each step is one screen: the art panel, a kicker, the father's question and three answers. Two questions share a step: after the first answer the question text and buttons swap in place, the art and the kicker stay, and the answer just given is echoed as one line in Courier above the next question ("*You went fishing with him.*"). Every answer is saved the moment it is tapped (`origin.answers`), so a closed tab resumes at the next question, never the start. **No numbers appear on any origin screen.** The hints under the coat answers are words.

**Art:** steps 1–3 use `mvp/scenes/origin-deathbed.png` in the art panel with `mvp/portraits/father.png` as the speaker's portrait beside the question; the street uses `mvp/scenes/origin-street.png` (§9).

**Echo lines** (one per answer to the first question of each step, shown in Courier above the second question; the second question of a step has no echo because the step ends there). An answer is final once tapped (§7.2); the echo is how the player sees what they chose.

| Step | A | B | C |
|---|---|---|---|
| 1 *The summer* | You went fishing with him. | You worked the factory floor. | You sat in the library. |
| 2 *The talent* | You could outrun anyone. | You could fix anything. | You could read people. |
| 3 *The promise* | You promised to clear his name. | You promised to settle what he owed. | You promised to finish what he started. |

### 2.1 Step 1 — The room

Kicker: *Irongate · a rented room above the tram depot · night*
Narrative: Your father has the bed by the window and not much else. The trams have stopped. He wants to talk, and there is no one else he can talk to.

**"Do you remember the summer you were ten? What did you do every day?"**

| | Answer | Effect (§7.2) |
|---|---|---|
| A | Fished the river with you. | +3 AGI |
| B | Worked the factory floor after school. | +3 STR |
| C | Sat in the library till they threw me out. | +3 INT |

**"And when the street kids got into trouble. What did you do?"**

| | Answer | Effect |
|---|---|---|
| A | Led them in. Someone had to. | +2 STR |
| B | Talked them out of it. | +2 CHA (permanent base) |
| C | Watched from the corner, and learned. | +2 INT |

### 2.2 Step 2 — The talent

Kicker: *The same room · later*
Narrative: He coughs, and waves you back down when you stand. The lamp needs oil. He is not finished.

**"You always had a talent. What was it?"**

| | Answer | Effect |
|---|---|---|
| A | I could outrun anyone on the block. | +3 AGI |
| B | I could fix anything with my hands. | +3 STR, +1 INT |
| C | I could read people like a book. | +1 CHA (base), +3 INT |

**"Take my coat. It's all I have left."**

| | Answer | Hint under the button | Effect (§7.2, §4 below) |
|---|---|---|---|
| A | Take it, and say nothing. | A good wool coat. | *Your father's coat*: clothing, Tier I, CHA 5, worn from the start |
| B | No. I'll earn my own. | He tells you where the tin is. | +150 Iron; you start in your faction's work clothes (CHA 2) |
| C | Take it, and promise to bring it back. | His coat, and your word. | The same coat as a **keepsake** (unique, never sold or crafted) and **+1 CHA base**; the promise returns in a later chapter |

### 2.3 Step 3 — The promise

Kicker: *The same room · before the first tram*
Narrative: Near the end he holds your wrist harder than a dying man should. There is something he has carried for twenty years, and now it is yours.

**"Promise me one thing…"**

| | Answer | Hint | Effect |
|---|---|---|---|
| A | …I'll clear your name. | The Mill Fire of '19. He didn't set it. | Ambition: **Clear His Name** (§3) |
| B | …I'll settle what you owed. | The Clearwater people will come for it. | Ambition: **Settle His Debts** |
| C | …I'll finish what you started. | He lost his seat, and everything with it. | Ambition: **Finish His Work** |

**"And you. What do you want, when all this is over?"**

| | Answer | Effect |
|---|---|---|
| A | Order. Somebody has to keep the streets quiet. | +50 FXP seed, paid if you join the Vanguard |
| B | Justice. The workers deserve better. | +50 FXP seed, paid if you join the Collective |
| C | Truth. Let the people decide. | +50 FXP seed, paid if you join the Alliance |

The wish is the last question so that the faction screen can show it (§5): the matching card carries the tag *His wish · +50 Faction XP*. A player who chooses against the wish loses nothing they had; the seed simply isn't paid.

### 2.4 Appendix C #12, resolved: the answers stack as written

§8.5 said the origin gives "up to +5" to a stat; the table lets three answers stack to +8 (library, watched, read people → +8 INT; factory, led, fix anything → +8 STR). **Decision: accept the stacking and say so.** The three memory answers add **8 or 9 points counting CHA base**: the summer gives +3 to one trained stat; the trouble gives +2 STR, +2 INT or **+2 CHA base**; the talent gives +3, or +4 with *fix anything* (+3 STR +1 INT) or *read people* (+3 INT **+1 CHA base**). So the origin adds **6–9 points across STR, INT and AGI**, with **at most +8 to one stat**, plus **up to +4 CHA base** (talked them out +2, read people +1, the promised coat +1). With the faction's +3 (§7.3), a new player's best stat is **8–16, typically 11–14**. (Corrected 29 Sep 2026, §13 Q13: the first draft said "8–9 across STR, INT and AGI" and "10–16"; the table was always right and the build follows it.)

Why not cap at +5: the player never sees a number (§7.1), so a cap would silently waste the second and third answers of anyone who answered consistently, which is exactly the player who cared. Why the spread is fine: an all-in build reaches 16 (an 82 % home check) but sits at 5 in everything else (38 %), while the reference recruit's 12 (66 %) comes with 10 in STR; the difference in expected reward on the best stat is 0.91 against 0.83 (`docs/economy.md` §2). The flattest build, a Vanguard recruit who fished, talked them out and read people, is STR 8 / INT 8 / AGI 8 with CHA base 3: 50 % everywhere on day 1, and the biggest permanent CHA base there is, which every later coat adds to (`docs/economy.md` §13.1). Every build reaches the 95 % clamp on its best stat from level-up points and Standing, the reference recruit by day 3–4 and the flattest by about day 5. The spread is flavour with a cost, not a gap.

**The reference recruits.** The canonical recruit (§8.5) is unchanged and is now fully specified: *library · watched · fix anything · refuse the coat · Justice · Finish His Work*, so **STR 10 / INT 12 / AGI 5 / CHA 2 (worn), 150 Iron, +50 FXP, no coat**. The same answers in the other factions give the tuning characters for Duskwall and Ashford:

| Recruit | STR | INT | AGI | CHA (worn) | Best home checks (difficulty 8) |
|---|---|---|---|---|---|
| Vanguard (reference answers, +3 STR) | 11 | 11 | 5 | 2 | STR 62 % · INT 62 % · CHA+INT 44 % · CHA+STR 44 % · AGI 38 % |
| **Collective** (canonical, +2 STR +1 INT) | 10 | 12 | 5 | 2 | INT 66 % · STR 58 % · CHA+INT 46 % · AGI 38 % |
| Alliance (reference answers, +3 INT) | 8 | 14 | 5 | 2 | INT 74 % · STR 50 % · CHA+INT 50 % · AGI 38 % |

With coat A (CHA 5) every CHA+INT check rises 6 points (the average rises by 1.5); with coat C (CHA 6), 8 points. `docs/economy.md` §13 has the day-1 arithmetic.

---

## 3. The Ambition choice and chapter 1 (§17.1)

**In the MVP all three Ambitions can be chosen and each has chapter 1 in slice 2.** *Finish His Work* is the one built to twelve chapters first (Appendix C #6, closed: it teaches politics, and its chapters key off things the player does anyway: a vote, a seat, a speech). *Clear His Name* and *Settle His Debts* get four chapters by launch (§25). Chapter 1 is designed to be played on day 1, in the home city, by any faction; the texts use three placeholders: `{secretary}` (Secretary Holm / Organiser Stahl / Mr Grey), `{hq}` (the Union Hall / Beacon House / the Rooms) and `{city}`.

### 3.1 Chapter rules (pinned in §17.1)

- **Chapter 1 unlocks on arrival**, with no requirement, and is delivered as a **Letter** in the welcome edition (§7). Later chapters need their requirement and **seven City Days since the previous chapter**; the paper's Letters row announces each one.
- A chapter is a **tier-3 story of at most three steps**: (1) a choice with no roll, remembered as a flag for later chapters; (2) one check with two approaches, each showing its stat and chance, paid in Energy on commit; (3) the result modal, which also carries the next chapter's hook as a knock-on line.
- **A chapter never fails.** The check decides the text and the rewards (Success / Partial / Failure as §8.4 for tiers 2–3); the chapter completes on any outcome. Chapters set in the home city trigger no encounter.
- **Chapter 1 numbers:** difficulty **8** (the chapter sets its own difficulty; the §8.4 tier-3 band of 22–30 is for later chapters and Operations), **10 Energy**, rewards Success **150 XP / 40 FXP / 100 Iron**, Partial **75 / 20 / 50**, Failure **25 / 0 / 0**, and a keepsake on every outcome. No opinion. Rested applies to the XP and Iron. Chapter checks do not count for Local Standing or Party orders.
- **Resumable:** `ambition { id, chapter, step, flags, completedDay }`. Closing the tab keeps the step; the Letters row then reads *waiting for you*. If Energy is short at step 2 the CTA reads *Needs 10 Energy · ready at hh:mm* and the story waits.

### 3.2 Finish His Work — Chapter 1: *His ward book*

**Step 1** · kicker *Ambition · Finish His Work · Chapter 1 of 12* · art: map crop of the home city (§9)
At the bottom of the suitcase, under the shirts: a ward book. Two hundred names in his hand, a tick or a cross against each, and the last page dated the week he lost his seat.

| | Choice | Hint | Flag |
|---|---|---|---|
| A | Show it to {secretary} | The branch will know what you carry. | `showedBook` |
| B | Keep it to yourself for now | Some things you do alone first. | `keptBook` |

**Step 2** · *Three names*
Three names in the book have two ticks: the ones who came out for him in the rain. Their street is twenty minutes' walk. You have the flyers and his name; it's a question of how you use them.

| Approach | Check | Chance for the reference recruit |
|---|---|---|
| Knock the three doors and say whose child you are | CHA+INT vs 8 | 46 % (52 % with coat A, 54 % with coat C) |
| Sort the book by street first, then knock | INT vs 8 | 66 % |

CTA: **Walk his ward · 10 Energy**

**Step 3** · the result
- Success — *Two of the three remember him* — One cries, one puts the kettle on, one shuts the door and then opens it again. All three take a flyer. The third asks, on the step, whether you'll be standing. You say not yet.
- Partial — *One door opens* — New tenants at two of the three; the third remembers the name and not much else. She takes a flyer for the landing. It's a start, and the book is still two hundred names long.
- Failure — *Nobody home* — No one answers at any of the three. You leave a flyer with his name written on each and walk back through the ward in the rain. The book goes back in the suitcase, for now.
- Knock-on lines: *Keepsake: His ward book* · *Chapter 2, "Stand where he stood": from {date}, after your first ballot*, where `{date}` is the weekday and day-month seven City Days after the day the chapter was played (*Tuesday 6 October* for a chapter played on 29 September; §13 Q2). **Superseded in slice 3** (`slice-3-politics.md` §17 Q21): the requirement was *at Rank 2* when this was written; chapter 2 now keys off the first ballot, and its script is in that document's §17.7.

### 3.3 Clear His Name — Chapter 1: *The prison letter*

**Step 1** · kicker *Ambition · Clear His Name · Chapter 1 of 12*
Sewn into the lining of the suitcase: a letter on prison paper, dated the second winter of his sentence. Someone has crossed a name out so hard the pen went through. He kept it twenty-five years.

| | Choice | Hint | Flag |
|---|---|---|---|
| A | Hold the letter up to the lamp | See what the pen cut through. | `readName` |
| B | Take it to {secretary} unread | The branch has long memories. | `toldBranch` |

**Step 2** · *The Mill Fire of '19*
Three dead in the fire, one man convicted, and a witness whose name was crossed out. The old report is somewhere in the {city} records, and the old men who remember are in the market. Pick your door.

| Approach | Check |
|---|---|
| Find the fire report in the reading room | INT vs 8 |
| Ask the oldest men in the market who remembers '19 | CHA+INT vs 8 |

CTA: **Start asking · 10 Energy**

**Step 3**
- Success — *A name comes back* — One man convicted on the word of a night foreman called Brandauer. Brandauer is alive, retired, and drawing a pension from a senator's office. You write the name down twice, in case.
- Partial — *A name in pencil* — The report is missing its last page, but someone has written a name in the margin in pencil: Brandauer, foreman. Nobody in the market will say the name out loud. That tells you something too.
- Failure — *Out on loan* — The file is out on loan to a ministry, and the old men in the market go quiet when you say the year. You leave your name with the clerk, which may have been a mistake.
- Knock-on: *Keepsake: The prison letter* · *Chapter 2, "The night foreman": from {date}, at Level 6*

### 3.4 Settle His Debts — Chapter 1: *The marker*

**Step 1** · kicker *Ambition · Settle His Debts · Chapter 1 of 12*
Your first night in the rented room, a man in a good coat knocks and doesn't come in. He leaves a folded paper: a marker for two thousand marks in your father's hand, countersigned in Clearwater. "No hurry," he says. "Not yet."

| | Choice | Hint | Flag |
|---|---|---|---|
| A | Ask who sent him | A name is worth more than a month. | `askedName` |
| B | Say nothing and shut the door | Let them wonder what you know. | `saidNothing` |

**Step 2** · *The man in the good coat*
He's back the next evening, on the stairs, with the same paper and the same smile. You have no two thousand marks. What you have is a minute, and it's a question of how you use it.

| Approach | Check |
|---|---|
| Look him in the eye and name a date | CHA+STR vs 8 |
| Read the marker properly before you answer | INT vs 8 |

CTA: **Answer him · 10 Energy**

**Step 3**
- Success — *A month, and a name* — The countersignature is a house on the Clearwater riverside. He shrugs: a month, then they'll want something instead of money. A month is a long time in politics. You write the house down.
- Partial — *A month, no name* — You get a month, not a name. He takes the stairs two at a time, whistling, and leaves the marker on the banister. You'll see him again; you'd both rather it was later.
- Failure — *A fortnight* — He gives you a fortnight and no name, and looks round the room as if pricing it. The stairwell is very quiet after he's gone. You put the marker in the suitcase, next to the shirts.
- Knock-on: *Keepsake: The marker* · *Chapter 2, "The riverside house": from {date}, at Level 6*

---

## 4. The starting kit and first outfit (§8.2, §21)

Charisma is worn (§8.2): a character's CHA is the sum of equipped items plus the origin's CHA base (0–4). Slice 2 uses two equipment slots, **clothing** and **document**; the others stay empty until slice 8. Slice 0's `chaBase: 2` stand-in becomes `chaBase: 0` plus a worn Tier I outfit of 2, as the slice-0 answers foresaw. Every new character starts with **0 Iron** (plus 150 if the coat was refused): the suitcase and what's in it.

### 4.1 Per faction

| | Vanguard | Collective | Alliance |
|---|---|---|---|
| **Outfit** (clothing, Tier I, CHA 2) | Work jacket and cap | Mill work coat | Worn wool overcoat |
| **Document** | Party card, Iron Vanguard | Party card, Red Collective | Party card, Civic Alliance |
| **Coat, if taken** (clothing, Tier I, CHA 5) | Your father's coat, worn in place of the outfit; the outfit stays in the wardrobe | same | same |
| **Worn CHA at the start** | 2 (refused) · 5 (accepted) · 6 (promised) | same | same |
| **Iron** | 0, or 150 if refused | same | same |
| **FXP** | 50 if the wish was Order, else 0 | 50 if Justice | 50 if Truth |
| **Home** | A rented room in Duskwall (§17.4) | A rented room in Coalport | A rented room in Ashford |

The faction outfit is the *plain clothes* of §14.12: a player who wears the coat keeps the outfit for hostile ground in slice 5. Nothing is sold or destroyed at the start.

### 4.2 The item catalogue slice 2 needs (§21.4, new)

| Id | Name | Slot | Tier | Effects | Flags | Art (`mvp/items`, `crests`) |
|---|---|---|---|---|---|---|
| `outfit.work-jacket` | Work jacket and cap | clothing | I | CHA 2 | — | `work-jacket-cap.jpg` |
| `outfit.mill-coat` | Mill work coat | clothing | I | CHA 2 | — | `collective-work-coat.jpg` |
| `outfit.worn-overcoat` | Worn wool overcoat | clothing | I | CHA 2 | — | `wool-overcoat.jpg` |
| `outfit.fathers-coat` | Your father's coat | clothing | I | CHA 5 | — | `winter-coat.jpg` |
| `outfit.fathers-coat-promised` | Your father's coat | clothing | I | CHA 5 | `keepsake` (unique: never sold, crafted, given or lost; a small mark in the wardrobe) | `winter-coat.jpg` |
| `doc.party-card` | Party card | document | I | none in slice 2 (*Show papers* at checkpoints, slice 5) | `keepsake` | the faction crest, `crests/crest-{faction}.svg` |
| `keep.ward-book` | His ward book | keepsake (no slot) | — | none; later chapters read it | `keepsake` | `document-folder.jpg` |
| `keep.prison-letter` | The prison letter | keepsake | — | none | `keepsake` | `document-folder.jpg` |
| `keep.marker` | The marker | keepsake | — | none | `keepsake` | `document-folder.jpg` |

§21.2's Tier I examples become *work jacket / mill coat / worn overcoat* to match the art that exists; "worn blazer" had none. The Standard coat of §8.2 (Tier I, CHA 5) is the father's coat by another name; the shop that sells one arrives with the Wardrobe in slice 8. The Me tab shows *Wearing: Your father's coat · CHA 5* and the party card as a line (*Iron Vanguard · Initiate · member since 29 September*), not a tile.

---

## 5. The street and the faction choice (§7.3)

**Screen:** art `mvp/scenes/origin-street.png` (the newsboy, the tram, the posters on the wall). Kicker *Irongate · morning*. Narrative: **He dies before the first tram.** You come down into the street with his suitcase. A newsboy is shouting the *Herald*: the government has fallen, and every party in the republic is recruiting. Three cards below, then *Permanent. A Faction Reset token is the only way back.* in Courier, and a confirm button once a card is selected: **Join the {faction} · take the train to {city}**.

### 5.1 The cards

Each card: crest, name, three lines, and three facts. The faction's home city is where the player will start (§7.4); the card says so.

**■ Iron Vanguard** — Order, discipline and a strong hand. A party of clerks, foremen and old officials who want the streets quiet, the ration fair and the frontier shut. They hold Duskwall, the frontier town in the mountains.
*+3 Strength · Starts in Duskwall · Their event: the Grand Rally*

**● Red Collective** — The mill and the docks against the men who own them. Strikes, solidarity, and a union hall in every town. They hold Coalport, the steel town on the river.
*+2 Strength, +1 Intelligence · Starts in Coalport · Their event: the General Strike*

**▲ Civic Alliance** — Elections, courts and a free press. Lawyers, students and shopkeepers who think the republic can still be argued back onto its feet. They hold Ashford, the university town.
*+3 Intelligence · Starts in Ashford · Their event: the Headline Story*

The card matching the father's wish carries a tag: **His wish · +50 Faction XP**. The names are the GDD's working names; naming is parked (Appendix C #10) and only these display strings change when it is decided.

### 5.2 What the player learns before choosing

Each card answers four questions in under thirty words: who they are, what they want, where you'll start, what their big event is. The stat bonus is shown as a fact because it is a choice about the character, not a memory. Nothing else is explained here: the home city, the paper and the orders explain themselves on arrival.

### 5.3 Vanguard content review (CLAUDE.md rule 6, GDD §26)

The Vanguard is a period antagonist written cold, never an aspiration. Reviewed in this change and again in the content-policy review of 29 Sep 2026 (`docs/design/content-policy-review.md`, which holds the old → new table and the checklist), for the card, the Duskwall content and the paper:

- **A party, not a militia.** The Vanguard has a committee, an organiser, volunteers and stewards. It has no drill, muster, garrison, uniform, march, roll call, patrol or barracks. The state's customs men and police are the state's; the Vanguard courts them (canvasses the customs shift, holds the Archives' keys), it is not them. Its patron is a commissioner, not a colonel.
- **No real-world symbols, salutes, uniform colours, titles, slogans or names.** The crest on the faction card and the party card is `crests/crest-vanguard.svg`: an iron gate beneath a lantern, gold line on black, inside a square frame (reviewed 29 Sep 2026, §13 Q6: it passes; it is the city's gate, and nothing in it is a real-world emblem). The plain square is the **small mark** only (list bullets, the map plate). **Nothing is chalked or painted on walls as a mark**: chalking is words, as election chalking was (*ORDER AND BREAD* and the movement's name). Ranks are a party's offices (Initiate / Steward / Bailiff / Prefect / Intendant / Guardian / Keeper of the Gate, §5.4), never military. The NPC is an *organiser*, the office is a *committee*, the party is *the movement* (lower case, a common noun) or *the district*; the paper says *by the Vanguard*, never *by the Movement*. No leader is named or titled.
- **Vocabulary avoided:** purity, blood, race, storm, march on, torches, shirts of any colour, "above all", "the nation first", purge, leader as a title, salute, any rank or word the army uses (footsoldier, sergeant, captain, marshal, drill, muster, garrison, billet, parade, bugle).
- **§16.1's description** said "strength, order and national purity", then "the nation above all" (an echo of a real anthem); it now reads "strength, order and a strong hand at the top". The card reads "Order, discipline and a strong hand."
- **Tone:** the Duskwall texts show the movement through what it does to a town (curfew bells, inspectors, ration queues, a searchlight on the party office) and how people react (fear, relief, compliance); they never argue that it is right. The player can play it; the game never praises it.
- **Faction names and the ideology labels stay as they are** (naming is parked).

---

## 6. The face (avatar)

Chosen at **sign-up**, not in the origin: the form gains *Your face*, six portrait tiles in a row (three by two on phones), required, no default. `mvp/avatars/avatar-{man,woman}-{20s,30s,40s}.png` → asset ids `avatar.man-20s` … `avatar.woman-40s`, 4:5 head-and-shoulders crop like the NPC portraits, widths 128 / 256. Stored on the character as `avatarId`; shown in the HUD (the Story mockup's portrait circle), on the Me tab and, from slice 6, in chat and presence. It can be changed on the Me tab at any time, free. No other appearance choice exists in the MVP; what you wear is the rest of it.

---

## 7. The welcome edition (§3.3)

The first Morning Paper, shown once the faction is confirmed, replaces slice 1's `hl.first-day`. Its job is to be the whole tutorial without being one: three headlines that tell the player where they are and what's expected, three Party orders they can carry out in ten minutes, a letter that opens the personal story, and a desk that shows the meters they'll live with. One tap dismisses it (*To the city*); the Paper tab reopens it.

### 7.1 Mastheads

| City | Name | Short name | Strapline | Price |
|---|---|---|---|---|
| Coalport | The Coalport Clarion | Clarion | The voice of the mill and the quays | 5 marks |
| Duskwall | **The Duskwall Sentinel** | Sentinel | For the city and the frontier | 5 marks |
| Ashford | **The Ashford Gazette** | Gazette | Fair report, free comment | 6 marks |

Dateline as §3.3: `{Weekday} · {D Month} · {City}`, no year. The app-shell banner reads *The Sentinel is in* / *The Gazette is in*.

### 7.2 Headlines on the first edition

Three, in this order: the personal welcome, the city's arrival notice (first edition only, so the player's name is in the paper on day 1), the morale line. All decks ≤ 200 characters.

| City | Id | Group | Headline | Deck |
|---|---|---|---|---|
| Coalport | `hl.welcome` (replaces `hl.first-day`) | personal 1, `firstEdition` | Welcome to Coalport | Three orders from Secretary Holm below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Spend it at the Mill Gate first. |
| Coalport | `hl.arrival` | city 0, `firstEdition` | {name} Steps Off the Irongate Train | One more pair of hands for the branch, says the Union Hall. The mill is hiring. |
| Duskwall | `hl.v.welcome` | personal 1, `firstEdition` | Welcome to Duskwall | Three orders from Organiser Stahl below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Spend it at the Fortress Gate first. |
| Duskwall | `hl.v.arrival` | city 0, `firstEdition` | {name} Arrives at Duskwall Station | Papers in order, says the station office. Beacon House expects a visit. |
| Ashford | `hl.a.welcome` | personal 1, `firstEdition` | Welcome to Ashford | Three orders from Mr Grey below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Spend it at Gazette House first. |
| Ashford | `hl.a.arrival` | city 0, `firstEdition` | {name} Arrives on the Irongate Train | The Assembly Rooms note one new volunteer. The Gazette, as ever, is hiring. |

The third headline is the city's morale line (`hl.morale-*`, always present). The other templates for the Sentinel and the Gazette are in the cities doc §1.6 and §2.6.

### 7.3 Party orders on day 1: the welcome set

The first City Day of a character uses a **fixed welcome set** instead of the rotation (pinned in §13.7): slot A, two attempts at the first pin's canvass; slot B, one committee session at the HQ; slot C, *Take a job*. The three teach the three things a session is made of (an action, party work, a job), fit in 30 Energy, and complete inside ten minutes, which pays the first +5 PC and puts *Branch Praises Its Canvassers* in the day-2 paper. From day 2 the rotation applies.

| City | A | B | C |
|---|---|---|---|
| Coalport | `dir.shift-change` *Be at the gate* (2) | `dir.report` *Report to the hall* (1) | `dir.work-shift`, frozen as *Take a job* |
| Duskwall | `dir.v.guard-change` *Be at the gate* (2) | `dir.v.report` *Report to Beacon House* (1) | `dir.v.work-shift`, as *Take a job* |
| Ashford | `dir.a.print-room` *Be at the loading bay* (2) | `dir.a.report` *Report to the Rooms* (1) | `dir.a.work-shift`, as *Take a job* |

No new templates: the welcome set names existing ids. The first pin (A) is also the pin with the day-1 job's Jobs card, so the first sheet a player opens holds two of the three orders.

### 7.4 Letters (new section, v2)

Between the orders and the desk, one row on day 1: **From your father's things** · *His ward book* (or *The prison letter*, *The marker*) · *Chapter 1 is ready · 10 Energy* → opens the chapter. While a chapter is mid-way: *waiting for you*. When none is ready: the row is absent (§3.3 lists Letters; patron letters arrive in slice 8).

### 7.5 Your desk on the first edition

The slice-1 rows, with day-1 values: *Salary: no job yet* · *Rested: 0 / 200 (banks once Energy is full)* · *Energy 100 / 100* · *Work streak: none yet* · *Level 1 · 150 XP to Level 2* · *{City} standing: Stranger · 10 to Familiar* · plus one new row, **Wearing: Your father's coat · CHA 5** (or *Mill work coat · CHA 2*). No *Yesterday*.

---

## 8. Day one: what opens when, and how it is introduced

Nothing in tier 1 is gated, so this is an order of *introduction*, not of unlocks. The principle: every new thing is introduced by the thing before it (a paper line, an order, a ticket tag, a modal line, a HUD dot), and never by a screen whose only purpose is to explain.

### 8.1 What the player sees on first landing

After *To the city*: the home-city map, day or night art, six numbered pins, the city plate (*Coalport · Home city · Collective 70.0 %* · *Stranger · 0 / 10 to Familiar*), the three-line orders list, an empty Today strip, and **the first pin's location sheet already open** (the URL carries `?loc=`), so the first screen of play is a ticket, not a map to explore. On the sheet: the location's blurb; the canvass ticket with **×1 · 10 Energy · 66 %** and its tag **Party order 0 / 2 · +25 % FXP**; the other tickets; the **Jobs card** with *Take the job* and the pay line. The orders list on the plate links each order to its pin, so the map is never a puzzle.

### 8.2 The timeline

| When | What becomes real | Introduced by |
|---|---|---|
| **Minute 0** | Name, face, the origin, the faction, the welcome edition (§1–§7) | The story itself |
| **Minute 3** | The first canvass; the result modal with its stamp, text, roll bar and four tiles | The first pin's sheet is open; the ticket shows the odds; *Party order 0 / 2* on the tag |
| **Minute 4** | *Again ×1 / Again ×3* on the modal; the second canvass completes order A: **+20 FXP** as a modal line; **Level 2 at 150 XP** on the third or fourth tap: the **stat point**, placed with one tap in the modal's knock-on line (*Level 2 · place your point: STR · INT · Later*) | The modal's buttons and knock-on lines; a dot on the Me tab if *Later* |
| **Minute 5** | **The job**: *Take the job* on the Jobs card → *Taken · party order complete: +20 FXP*; the shift ticket goes live (*4 Energy · no roll*) | The Jobs card on the same sheet; order C; the paper's *hiring* line |
| **Minute 6** | **The shift** (*Shift worked* · streak 1 · half pay tomorrow at 01:00) | The live shift ticket |
| **Minute 7** | **The HQ** and the committee session (order B): council FXP at 1.5×; all three orders done → **+5 PC**, and **PC appears in the HUD** for the first time (§26) | The orders list on the plate links to the HQ pin; *All orders carried out · +5 PC* |
| **Minute 8** | **The Ambition chapter**: two screens and a modal, 10 Energy; the keepsake; the chapter-2 hook | The Paper tab's dot and the Letters row |
| **Minute 10–15** | Free play until the bar is empty (about 56 Energy left after the above: five or six taps; **Level 3 at 450 XP** arrives on the first bar if the chapter succeeded, otherwise early in the second session, `docs/economy.md` §13.2). The **Out of Energy card**: *+5 every 10 min · full at hh:mm* · *Rested banks once you're full* | The card, when the cheapest ticket costs more than the Energy left |
| **Minute 15** | The player leaves with something pending: Energy refilling, half pay at the boundary, a streak of 1 | The Out of Energy card lists what's waiting |
| **Day 1, later** | Second and third sessions: training (the *Sharpen up* order isn't in the welcome set, so the training tickets introduce themselves by their live cost, *44 Energy · INT 12 → 13*); the Driver job visible and locked (*Needs Level 3, AGI 10*) | Tickets and the Jobs card |
| **Day 2** | The second paper: *Yesterday*, half pay, Rested banked, *Branch Praises Its Canvassers*, the rotation orders; **Rank 2 at 400 FXP** during day 2 for the reference recruit (`docs/economy.md` §13): *Made Activist by the Branch*, which slice 3 turns into the first vote | The paper |
| **Day 8** | Chapter 2, if its requirement is met | The Letters row |

Half pay for a job taken at 23:50 UTC is paid at the boundary ten minutes later, as §9.1 says; the welcome set likewise belongs to the City Day of creation, however short. Both are acceptable edge cases for the playtest (§11, question 3).

### 8.3 What is deliberately not explained

Rested (the desk row explains it when it first has a value), Local Standing (the plate counts *0 / 10*; the modal's knock-on line names it at 10), the day boundary (the shift ticket's *next at 01:00*), Heat and Health (not in slice 2), the other two cities (the train is slice 4; the map shows only the home city).

---

## 9. Art by step

| Step or screen | Art panel | Portrait | Kicker |
|---|---|---|---|
| Sign-up, *Your face* | — | the six `mvp/avatars/*.png` tiles | — |
| Origin 1–3 | `mvp/scenes/origin-deathbed.png` (2688 × 1520; on desktop cropped to the 420 px panel at object-position 30 % 50 %, on the bed) | `mvp/portraits/father.png` (880 × 1168, 4:5 crop) beside the question | *Irongate · a rented room above the tram depot · night* |
| The street and the faction cards | `mvp/scenes/origin-street.png` | crests `crests/crest-{vanguard,collective,alliance}.svg` on the cards | *Irongate · morning* |
| Welcome edition | the masthead (no art) | — | — |
| First landing | `maps-pen/{city}.png` or `{city}-night.png` | — | — |
| Ambition chapter, steps 1–2 | a map crop of the home city around the HQ (§13.5 rung 3; no story art for chapter 1) | — | *Ambition · {title} · Chapter 1 of 12* |
| Ambition chapter, result | the same crop with the stamp | — | — |
| Duskwall HQ (Beacon House) | `mvp/scenes/vanguard-office.png` (desk, wall map, a plain banner, a window; reviewed: no symbol) | `mvp/portraits/stahl.png` on orders | — |
| Ashford press (Gazette House) | `mvp/scenes/newsroom.png` | `mvp/portraits/grey.png` on orders | — |
| Ashford HQ (Assembly Rooms) | none yet: map crop. **Art request:** an Alliance HQ scene | — | — |

Existing and checked: all of the above exist in `E:\Projects\ironGateCity Docs\art-direction\`. Missing and requested, none blocking: an Alliance HQ scene; scenes for `ministry`, `library`, `station`, `street`, `market`, `university`, `court` (the map crop stands in for all of them by design).

---

## 10. Phones

The Story mockup (`docs/mockups/Story.dc.html`) is the shape for every tier-3 screen here (origin, street, chapter): art panel, kicker, title, a 2–3 line paragraph, choices as full-width buttons with a Courier hint line, one dark CTA, and the caption *Close the game now and this waits for you*. On phones the art panel becomes a top band (full width, 16:9, at most 40 % of the viewport height) with the kicker and title over its lower edge; the choices stack; the CTA sticks to the bottom. The faction cards stack vertically; the selected card expands to show its facts; the confirm button sticks to the bottom. The rest of slice 2's mobile work (map, sheet, modal, paper, Me) follows the existing `MobileCity`, `MobileMission` and `MobilePaper` mockups and is the architect's and developer's call; no new mobile mockup is needed for this slice.

---

## 11. Questions for the architect

1. **Where the origin lives before the character exists.** Stats, home city and faction are unknown until the last tap, but the flow must resume. Suggested: create the character at sign-up in `status: 'origin'` with `origin { step, answers[] }` and null stats; `origin.complete` computes stats, kit, FXP seed and Ambition from the answers in one transaction and sets `status: 'active'`. The alternative (answers on the user until completion) leaves the HUD with nothing to show during the origin. Either is fine for the design; the answers must be idempotent per question index.
2. **The welcome set** (§7.3) is per character (the City Day of creation) while ADR 0009 computes orders faction-wide from the day. Suggested: `orders.day === character.createdDay` selects the welcome ids; no new storage. Confirm the *Take a job* variant is frozen as `noJob` for the welcome set even though the check is normally made at the boundary.
3. **Ambition state** as an embedded `ambition { id, chapter, step, flags, completedDay }` with one idempotency key per step; the chapter check reuses `computeCheck` at difficulty 8 with the Rested bonus and no Standing bonus. The chapter's flags are read by later chapters only, never by rules.
4. **Items:** a catalogue section in content (`items[]`, §4.2) and `inventory[]` + `equipment { clothing, document }` on the character; worn CHA = `chaBase + Σ equipped cha`, computed on read like the timers. Keepsakes have no slot and never leave the inventory.
5. **Avatar** on the sign-up form and `character.avatarId`; the six assets in the art catalogue.
6. **Placeholders in story text** (`{secretary}`, `{hq}`, `{city}`) resolved on the server from the character's faction and home city, like the headline placeholders.
7. **Three cities, one home:** the client shows only `homeCityId`'s map in slice 2; `city.get` for another city can simply be refused until slice 4.
8. **Job ids:** see the cities doc §3, question 1 (prefix Coalport's by city now).

---

## 12. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 29 Sep 2026 (slice-2 design)" change table |
| §3.3 | Mastheads pinned for the Sentinel and the Gazette; the welcome edition; the Letters section from slice 2 |
| §5.4 | Alliance Rank 3 title *Councillor* → **Agent** (it was also the name of the office the rank lets you stand for) |
| §7.2 | The dialogue in three steps; the coat's three effects made exact (CHA 5 · +150 Iron · keepsake with +1 CHA base); the wish shown on the faction screen |
| §7.3 | The street, the faction cards and the tag for the father's wish; the train to the home city |
| §7.5 (new) | The first ten minutes: the welcome edition, the first landing, the order of introduction |
| §8.2 | The table: per-faction Tier I outfits at CHA 2; *Your father's coat* at 5; CHA base 0–4 |
| §8.5 | Starting stats restated: origin 6–9 points across STR/INT/AGI (8–9 counting CHA base), at most +8 to one, CHA base up to +4; best stat 8–16 (corrected in §13 Q13); the reference recruit's full answer set and the two mirror recruits |
| §9.2 | New jobs pinned: Stores hand (Duskwall, 180 / 216) and Copy clerk (Ashford, 180 / 216); Street vendor and Driver placed in each home city |
| §13.5 | Duskwall's and Ashford's six locations listed against their kinds |
| §13.7 | Stahl and Grey as secretaries; the welcome set for the first City Day |
| §14.11 | Duskwall and Ashford baselines pinned (were provisional) |
| §16.1 | "national purity" → "the nation above all" (since replaced by "a strong hand at the top" in the content-policy review, which also changed §5.4, §16.3, §17.2 and the Duskwall content; `docs/design/content-policy-review.md`) |
| §17.1 | Chapter rules: three steps, never fails, difficulty and Energy per chapter, chapter 1 numbers, the Letter, the seven-day spacing; chapter 1 titles; *Finish His Work* built first |
| §21.2, §21.4 (new) | Tier I examples matched to the art; the slice-2 item catalogue and the keepsake flag |
| Appendix C | #6 closed (*Finish His Work* first); #12 closed (stacking accepted); new #18 (the welcome set is per character), #19 (the avatar has no bearing on anything: keep it so), #20 (the Ambition failure texts on day 1) |

Companion edit: `docs/economy.md` §13 (day-1 arithmetic with the FXP seed, the chapter and the coat).

---

## 13. Answers to the slice-2 tech design (§20.1)

Game designer, 29 Sep 2026. Thirteen questions from `docs/tech/slice-2.md` §20.1. "Default stands" means the design's default is the rule; where a rule is new it is pinned in the GDD section named. The content-policy flags in §20.3 were the user's; they are decided in `docs/design/content-policy-review.md` (29 Sep 2026), and every string in this document already reads in its reviewed form.

| # | Question | Answer | Pinned in |
|---|---|---|---|
| 1 | Echo lines | **Written: nine lines**, in the table under §2 above. One per answer to the first question of each step, Courier, past tense, second person. | GDD §7.2; this doc §2 |
| 2 | The chapter-2 hook | **Default stands, computed.** *Chapter 2, "Stand where he stood": from Tuesday 6 October, at Rank 2* for a chapter played on 29 September. Format: `Chapter {n}, "{title}": from {Weekday D Month}, at {Rank n \| Level n}`. §3.2–3.4 now read *from {date}*. | GDD §17.1 |
| 3 | The Today tally | **Default stands.** The chapter's Energy, XP, FXP and Iron count in *Today*; no attempt, no win. | GDD §17.1 |
| 4 | Going back in the origin | **Default stands: set-once.** No number is shown, so there is nothing to optimise by going back, and the echo line is how the player sees what they tapped. A double tap changes nothing. | GDD §7.2 |
| 5 | §3.2 odds | **Corrected.** CHA+INT for the reference recruit: 46 %; coat A **52 %**; coat C **54 %**. §2.4's "rise 4–6 / 6–8 points" was also wrong: coat A is always **+6**, coat C **+8** (the average rises by 1.5 or 2). | `docs/economy.md` §13.1 (already right) |
| 6 | Card crest vs the plain square | **The SVG passes.** An iron gate beneath a lantern, gold line on black, in a square frame: the city's gate, no real-world emblem. Default stands: SVG crests on the street cards and the party card; the plain square, circle and triangle only as small marks. §5.3 corrected. | GDD §7.3; this doc §5.3 |
| 7 | Migrated characters | **Default stands.** *Finish His Work* chapter 1 as a Letter in their next paper; no face until chosen. Until then the HUD shows the empty portrait ring and the Me tab carries a dot with the line *No face yet*; nothing is blocked. | ADR 0016 (no GDD rule) |
| 8 | The Paper tab dot for a Letter | ~~**Default stands.** Shown while a chapter is `ready` and not yet opened; not for `midway`.~~ **Superseded by §14.3 (n7):** shown while `ready`, opened or not; off once played or `midway`. | GDD §17.1 |
| 9 | The first-landing sheet | **Default stands.** First edition only; later mornings open the map. | GDD §7.5 (as written) |
| 10 | Failure wording | **Default stands.** The stamp reads *Failure*; nothing else in the modal or the texts says "failed". Consistency with §8.4 matters more than a softer stamp; Appendix C #20 holds the fallback (no Failure band) if the playtest shows the word landing badly. | GDD §17.1 |
| 11 | Copy review | **Approved with three notes**, below. Six avatar alt texts written below. | — |
| 12 | *Chapter 1 of 12* | **Keep *of 12* for all three.** Twelve is the Ambition's declared length (§17.1) and `of` is read from the Ambition definition in content, not from the number of chapters written. A player who reaches the last written chapter sees no Letters row (`kind: 'none'`), which is the existing behaviour; chapter 5 of either shorter Ambition cannot be reached before day 29 (four chapters, seven days apart), by which time it will be written (§25). | GDD §17.1 |
| 13 | The origin arithmetic | **The table stands; the sentences were wrong.** Corrected in GDD §7.2, §8.5, §0 and Appendix C #12, in §2.4 above and in `docs/economy.md` §13.1. Detail below. **No content changes.** | GDD §7.2, §8.5 |

### 13.1 Q11: copy notes

The §12.4 strings are approved as drafted, with these exact forms:

- `keepsakeLine(name)` → `Keepsake: {name}` with the catalogue name verbatim: *Keepsake: His ward book* · *Keepsake: The prison letter* · *Keepsake: The marker*. (The design's *Keepsake: his ward book* is superseded; the capital is the item's name as it appears in the wardrobe.)
- `theirEvent(name)` → `Their event: {name}`, and the article travels with the content string: *Their event: the General Strike* · *Their event: the Headline Story* · *Their event: the Grand Rally*.
- `partyCard(faction, rank, date)` → *Iron Vanguard · Initiate · member since 29 September* (lower-case *member*, no year, as the dateline).
- *Your face* is the sign-up field label; *Choose your face* is the line shown when the form is submitted without one, and the heading on the Me tab when changing it.
- Everything else as drafted: *Close the game now and this waits for you* · *His wish · +50 Faction XP* · *Join the {name} · take the train to {city}* · *+2 Strength, +1 Intelligence* · *Starts in {city}* · *Chapter 1 is ready · 10 Energy* · *waiting for you* · *Wearing: Your father's coat · CHA 5* · *Ambition · Finish His Work · Chapter 1 of 12*.
- Two lines the design implies but does not list, for completeness: the Letters row on day 1 reads **From your father's things** · *{keepsake name}* · *Chapter 1 is ready · 10 Energy*; the Me tab for a migrated character reads *No face yet*.

### 13.2 Q11: the six avatar alt texts

One line each, describing the portrait as drawn (checked against `mvp/avatars/*.png`), no character judgement.

| Asset | Alt text |
|---|---|
| `avatar.man-20s` | A young man in a white shirt and braces, sleeves rolled, dark hair uncombed, a small scar over one eyebrow. |
| `avatar.man-30s` | A man in his thirties with close dark curls and a day's stubble, in a jumper under a leather jacket. |
| `avatar.man-40s` | A man in his forties, greying hair swept back, round spectacles and a moustache, in a tweed jacket with a cap in his hand. |
| `avatar.woman-20s` | A young woman with dark curls and freckles, in a knitted cardigan with a red scarf at her throat. |
| `avatar.woman-30s` | A woman in her thirties with fair waved hair, in a belted trench coat with the collar turned up. |
| `avatar.woman-40s` | A woman in her forties, dark hair going grey and pinned back, in a plain dark jacket. |

### 13.3 Q13: the corrected origin arithmetic

The answer table (§2.1–2.2) was always the rule; three sentences summarising it were wrong and are now fixed.

| | Was written | Correct |
|---|---|---|
| Points across STR, INT and AGI | 8–9 | **6–9** (summer +3; trouble +2 or 0; talent +3 or +4) |
| Points counting CHA base | — | **8–9** (the promised coat adds a tenth, to CHA base) |
| At most to one stat | +8 | +8 (unchanged) |
| CHA base | up to +4 | up to +4 (unchanged) |
| Best stat after the faction's +3 | 10–16, typically 12–14 | **8–16, typically 11–14** |
| The other two stats | 5–8 | **5–11** |

The minimum of 8 is one build: a Vanguard recruit who fished, talked them out and read people (STR 8 / INT 8 / AGI 8, CHA base 3). **Accepted, not changed**, for three reasons: it is what those answers describe (a people person in a party of clerks and foremen); CHA base 3 is permanent and adds to every outfit bought later, which is a better long-run trade than +2 to a trained stat; and at 50 % the build still reaches Level 2 inside the first bar and the 95 % clamp by about day 5 (`docs/economy.md` §13.1). Changing an answer would have meant content changes mid-build for a corner case no pacing target depends on. The reference recruits and every number in the tech design's §6.3 tests are unchanged.

---

## 14. QA slice 2 — design answers

Game designer, 29 Sep 2026. Answers to the design calls in `docs/qa/slice-2.md` (m5, m3, the copy nits and n8). The developer applies them with the slice-2 fixes. Every string below is exact; every rule is also in the GDD (§0 rows under "QA slice 2").

### 14.1 m5: Political Capital on phones

**Decision: the HUD shows PC on every screen size once PC > 0.** The GDD's intent stands (§7.5, §6.5): PC is introduced by the moment it is first earned, and from slice 3 it is the price on every political button, so the player must be able to see the balance where they see Energy and Iron. Nothing else is added.

- **HUD:** the existing PC column (value over the caps label *PC*) loses `hidden … sm:flex` and shows on all widths when `pc > 0`. The Iron and PC columns are the same shape, so a phone HUD reads *… 100 / 100 · 150 Iron · 5 PC*. If the row is tight at 360 px the name truncates first; the Energy status line (*full at 14:20*) may drop to the number alone below 360 px. The desktop HUD is unchanged.
- **Before PC > 0:** no column, no zero. The first appearance is the same moment on every device: the modal line *All orders carried out · +5 PC* (`copy.allOrdersDone`), then the column.
- **Me tab:** from slice 3 the line pinned in `slice-3-screens.md` §8: *Political Capital 45 · declare 10 · endorse 10 · propose 20*. In slice 2 the Me tab shows *Political Capital 5* (the same row without the sinks). This is also where the full name lives; the HUD says *PC*.
- **Not on the plate.** The plate is the city's, the HUD is the character's (`slice-3-politics.md` §8). Political tickets and buttons carry their price (*Declare · 10 PC*, *Needs 10 PC*), which is enough at the point of spend.

GDD: §7.5 now reads "on phones as on desktop"; §6.5 says where PC is shown. `slice-3-politics.md` §15 Q10 is answered: the bar, not the council card.

### 14.2 m3: a blank name, and the name rules

**Decision: the name is 2–40 characters after trimming; sign-up refuses anything else.** Runs of inner spaces collapse to one. No character class is restricted (accents and apostrophes are normal names in a Central European republic). Forty, not sixty: the name is printed in a headline on day 1 (*{name} Arrives at Duskwall Station*) and in the HUD at 15 px, and sixty characters make a three-line headline. The form's `maxLength` and the server's `NAME_MAX` both become 40.

Validation copy, in the voice of *Choose your face* and *At least 8 characters.* (no full stop on a bare line, second person, no "please"):

| Case | String | Key |
|---|---|---|
| Blank, or spaces only | **Your name can't be blank** | `copy.nameBlank` |
| One character | **Your name needs at least 2 characters** | `copy.nameTooShort` |
| Over 40 characters | **Your name can have at most 40 characters** | `copy.nameTooLong` |

Shown under the field on submit, the same pattern as the face. The server refuses the same cases at sign-up and at the join, so the fallback below can only ever be reached by an account made before this rule.

**The fallback is neutral and lives in content:** `copy.unnamed: 'A Newcomer'`. The arrival headline then reads *A Newcomer Arrives at Duskwall Station* and the HUD *A Newcomer*, in every faction. *Comrade* is removed from the server; the source sweep's allowance for it goes with it.

GDD: §7.3 gains the name rule (a §0 row).

### 14.3 The nits whose fix is copy or content

| Nit | Decision | Exact strings |
|---|---|---|
| **n7** Paper-tab dot while a Letter is ready | **The deviation stands and becomes the rule:** the dot shows while a chapter is `ready`, whether or not the Letter has been opened, and goes off when the chapter is played or `midway`. A Letter is a call to action, and "opened but not played" is exactly the case a player forgets. §13 Q8 above is superseded. | — |
| **n9** *1 · MINISTRY* on a customs house | **Kind labels move to content** (`copy.kindLabel(kind)`), one per §13.5 kind, so a new kind never needs client code. `ministry` reads **Public office**, which fits a customs house, police HQ and a ministry alike. The full list: `factory-gate` **Factory gate** · `docks` **Docks** · `market` **Market** · `station` **Station** · `street` **Street** · `square` **Square** · `bar` **Bar** · `hotel` **Hotel** · `press` **Press** · `faction-hq` **Party hall** · `hospital` **Hospital** · `jail` **Jail** · `court` **Courts** · `university` **University** · `library` **Library** · `gym` **Club** · `barracks` **Landmark** · `parliament` **Parliament** · `ministry` **Public office**. *Club* rather than *Gym* (the period word, and Vanguard House is a club); *Landmark* for the old barracks, which no faction uses and which should not read as a military place on a ticket. | `Public office`, `Club`, `Landmark`, `Party hall`, `Courts` |
| **n10** The ticker's red square | **A neutral separator:** a middle dot **·** (U+00B7) in the dim text colour, `aria-hidden`. No faction mark is used as punctuation anywhere; the marks are the factions' own. | `·` |
| **n13** The chapter screen after chapter 1 | **The screen shows the hook, not an empty chapter.** Kicker *Ambition · Finish His Work · Chapter 2 of 12*, title *Stand where he stood*, one Courier line with the same computed hook as the modal, and the CTA **Back to the paper**. No choices, no odds. When the date and requirement are met the Letters row takes over as designed. | Line: `From {Weekday D Month}, at {Rank n or Level n}` → *From Tuesday 6 October, at Rank 2*; with no requirement: *From Tuesday 6 October*. Key `copy.chapterWaitsUntil(from, needs)`. CTA: `Back to the paper` |
| **n5** `garrison-gate` in the URL | **No rename.** Ids are addresses, not text; the review's rule ("never shown") means never shown as copy, and a query string is not copy. Renaming now would touch content, logs, tests and the migration for a corner nobody reads. New ids follow the reviewed names (a Fortress Gate made today would be `duskwall.fortress-gate`). | — |
| **n6** The Collective crest's alt text | **Waiting on the user** (content-policy review §5). The alt text stays honest about what is drawn until the crest is decided; when it is, the alt text changes with it. | — |
| **m1** Faction colours on the reward tiles | An art-direction note, not a copy change: add a **text variant** of each faction colour for values on paper, as `energy-light` was added; the crest and mark colours stay. Measured on `#f6f0e1`: Vanguard **#7d5f18** (5.24:1), Alliance **#3a5b78** (6.27:1); the Collective red `#8c2b23` already passes (7.43:1) and needs no variant. | tokens `--vanguard-text: #7d5f18`, `--alliance-text: #3a5b78` |
| **n12** Report shares as 0–1 | Print as a percentage with the space before the sign, as the game does: *first action was welcome order A: 62 %*. | `62 %` |

The rest (M1, M2, m2, m4, n1–n4, n11) are layout or code and belong to the developer; the GDD needs nothing for them.

### 14.4 n8: Ashford's first-session art (929 KB)

**Acceptable for the slice-2 playtest; nothing is cut.** The 1 MB of ADR 0015 is a ceiling, not a target, and the weight is where it should be: the city map is the game's main screen and the one image a player looks at for the whole session. Ashford is heavier than Duskwall and Coalport because its pen map has more line work (the lettered press front, the colonnade, the terraces), which compresses worse than open ground. Two rules for what comes next, so the ceiling holds:

1. **Nothing new on the first path until slice 4.** The first path is sign-up → origin → street → welcome edition → first landing → first modal. Any art added to it (an Alliance HQ scene, a chapter-1 story panel) is measured against 1 MB on the Alliance path first, since that is the tight one. Art off the first path (scenes for pins 2–6, the Me tab's item images) is free.
2. **In slice 4 the train loads a city's map only when the player travels there**, never on sign-in, so the first session stays at one map whatever the destination. The night map is loaded only when the player lands at night (already the case).

**Art-direction note, not a change:** if the pipeline can take the Ashford day map at 2560 to about 400 KB with one AVIF quality step and no visible loss on the pen lines, take it; if the lines go muddy, leave it at 525 KB. The pen style is the look; a soft map is worse than a heavy one.
