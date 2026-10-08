# Review 5 — design and copy answers (8 Oct 2026)

Answers to the twelve notes of `docs/review/2026-10-08-review-5.md` (Design Review 2 in Notion; the build at `f9096bd`, slices 0–5 and every review-4 fix). Each answer gives the decision, the reason, the exact player-facing strings, ids and numbers, and the screens affected. Rule changes are pinned in `docs/GDD.md` (§0, *Added 8 Oct 2026 (review 5)*) and in the section named; the pacing check is `docs/economy.md` §25; the slice docs that change carry a dated addendum (§14). The plain-words rule (GDD §1.5) applies to every string here. **No code in this document; a developer builds from it** (§15, the fix list).

**Four notes need the user's decision** — **1** (the opening), **10** (rival ground), **11** (the game day) and **12** (night) — each with a recommended default marked **▶ Default**. Everything else is decided here.

Nothing here adds a required tap to a session. The level-up picker is one tap as before; *What's here* is one tap to a list; the treatment card is one optional tap; the journey card already needed a tap and now cannot be lost by a tap elsewhere.

| # | Note | Decision | Where |
|---|---|---|---|
| 1 | The opening is weak | **Three full versions**, A *Next of kin*, B *He never chose*, C *The bill*; **▶ B recommended**; the mechanics (party · stat · Ambition) unchanged | §1; GDD §7.1 |
| 2 | Small clouds | **Fewer, larger**: three clouds and two wisps by day, none narrower than 0.36 of the picture; the small puffs are gone; **a config change, no new art** | §2 |
| 3 | Level-up boxes | **Three paper cards in the ticket's style**, one per stat, the whole card the tap; the black blocks are gone | §3; GDD §5.3 |
| 4 | Unstyled scroll bar | The result modal never scrolls for an ordinary result; the picker in a modal is **a line and a button that opens a sheet**; **one thin ink scroll bar** everywhere else | §4 |
| 5 | Jobs pay | **The Driver pays 240** (was 200); a rule: **a job that asks more pays more**, each rung a tenth over the best below it, the member's fifth counted; the catalogue's ranges pinned | §5; GDD §9.2; economy §25.1 |
| 6 | Health under Energy | **Energy · Health · Heat · XP · Party XP** at every width | §6; GDD §6.1 |
| 7 | The journey card can be skipped | **The card stays until answered**: no scrim-dismiss, an explicit *Sleep through it* row, the arrival modal's *Continue* only after a row | §7; GDD §14.10 |
| 8 | Pay to heal | **A *Treatment* card on every infirmary**: *Get patched up · n Iron*, **one Iron a point of Health missing**, no Energy, no limit but being below full | §8; GDD §19.1 |
| 9 | What's here | **The Places list becomes *What's here***: the city's Issues, the missions you can start, your orders here, then the places | §9; GDD §14.13 |
| 10 | Rival ground emphasis | **▶ A three-line header**: the push bar against the 2-point cap, the danger in words, **the goal: Unrest** (what it does to them and for you, the points to go); **▶ a prize** for pushing a town into Unrest | §10; GDD §14.12 |
| 11 | Day/night more often | **▶ Option B: a six-hour game day, the last two hours night, the same for everyone; every daily rule stays on the real City Day** | §11; GDD §2.2 |
| 12 | Night missions and patrols | **▶ Night-only ways and four night missions (+25 % Iron); on rival ground at night a higher run-in base while acting, and one *Patrol* stop a night on the first read there, never while absent** | §12; GDD §14.12 |

---

## 1. #1 — The opening (needs the user's decision)

### 1.1 What was wrong

*The Last Train In* answers none of the three questions a player asks in the first minute. **Who am I?** A person with a suitcase. **Why am I at the station at midnight?** Because the story needed a platform. **Why do three party officials want two minutes of a stranger?** No reason is given, so the asks read as three recruiting posters with faces. The parcel, the bundle and the signature are concrete things, but nothing ties them to the player: anyone on the platform could carry a parcel.

The three versions below each give the player a reason to be on that platform tonight, a thing they already know about their father, and three people who are there **because of the player**, each wanting something **only this player can give**, tied to what their party is. The mechanics are untouched: **beat 1, whom you help is your party** (a row selects, the button commits, the favour is slot B of the welcome set at the HQ); **beat 2, the suitcase sets a stat** (+6 and +1; the three answers unchanged); **beat 3, the lining sets the Ambition** (the three items unchanged, his coat worn from here on). Three beats, one choice each, 2–3 lines, no number anywhere, resumable. The name stays the player's. The three people stay the three secretaries (Appendix C #90), so the next morning's signed line lands.

Every narrative below is at most 240 characters and four sentences; every row title at most 180; every favour text at most 240. The Vanguard rows carry a club, a ledger, a clerk and a Thursday meeting, and nothing else (§13, the policy check).

### 1.2 Version A — *Next of kin*

**Premise.** You stayed with your mother's people in the provinces when he went into politics; you have not seen him in six years. The railway wrote: a suitcase in his name has sat in the left-luggage office at Irongate Central since the night he died, and unclaimed luggage is sold at the month's end unless next of kin signs for it. Tonight is the last night of the month and the last train in. What you know: he died three weeks ago in a boarding house by the station; the Herald gave him four lines and the word *formerly*. The three on the platform knew him, and the left-luggage clerk, who talks, told each of them which train the claim letter named. Each needs the one thing only next of kin can do.

**Beat 1 — *The platform*** (`origin.step-platform`; art `scene.station`; kicker *Irongate · Central Station · the last train in*)

> *The last train in, and the left-luggage clerk hands you a suitcase with your father's name on the label. Three people asked after it, he says; they're on the platform now. Each knew him. Each needs his next of kin for two minutes.*

| Row | Title (the ask) | Line 1 | Line 2 |
|---|---|---|---|
| `holm` | **"The branch's flyers are at the capital's printer in his name, and the printer releases to next of kin only. Sign for them, and carry them to Coalport on the six o'clock."** | Petra Holm · union organiser · Coalport | Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence |
| `stahl` | **"He kept the Duskwall club's books for a year before he fell out with us, and the bank releases his papers to next of kin only. Sign them over at Beacon House, on the six o'clock."** | Viktor Stahl · steward · Duskwall | Iron Vanguard · order, discipline and a strong hand · +3 Strength |
| `grey` | **"He stood witness on a tenant's lease the week he died, and a dead witness is no witness. Put your name under his tonight and the lease holds till the office opens at nine. Then the six o'clock to Ashford."** | Thomas Grey · agent · Ashford | Civic Alliance · elections, courts and a free press · +3 Intelligence |

Under the rows: *Whoever you sign for, you go with. Permanent: a Faction Reset token is the only way back.* Confirm: ***Sign for Holm · the six o'clock to Coalport*** / ***Sign for Stahl · the six o'clock to Duskwall*** / ***Sign for Grey · the six o'clock to Ashford***. Echo: *You signed for the branch's flyers.* / *You signed the club's papers over.* / *You put your name under his for Grey.*

**Beat 2 — *The suitcase*** (kicker *The six o'clock to {city} · the compartment*; portrait `helper`): *The six o'clock, the compartment, his suitcase on the rack and heavier than a dead man's should be. {helper} comes back from the corridor and asks, kindly enough, what you brought of your own.* Answers: *tools* / *books* / *light*, unchanged.

**Beat 3 — *The lining***: *Under the lining, where he kept what mattered: his coat, folded small, and one thing more. Six years since you saw him; three weeks since the paper's four lines. This is what he left you to finish.* Answers: *His ward book* / *His letter from prison* / *The marker*, unchanged.

**The favour** (slot B, `use: 'welcome'`, type `council`, 10 Energy, difficulty 8):

| Party | Order | Ticket | Success (headline · body) | Partial |
|---|---|---|---|---|
| Collective | **Deliver the branch's flyers at the Union Hall** · *The flyers you signed for, to the hall, to whoever's on the door. Then come and find me; there's tea. — P.H.* | Deliver the flyers | **Counted in, under his name** · Five hundred flyers, counted in by the man on the door while you wait. "She said you'd come." He finds your father three pages back in the book and writes your name under his. | **Counted twice, in pencil** · The man on the door is out and the flyers wait on a bench till he's back. He counts them twice and asks your name three times. It goes in the book, in pencil. |
| Vanguard | **Sign the club's papers over at Beacon House** · *The bank's papers on my desk by noon; the clerk has the form. Your name where his was. — V.S.* | Sign the papers over | **Where his was** · The clerk has the form ready and a pen that works. Your name goes where his was, in the club's book and the bank's. "Thursday," says the clerk, which is the meeting, and nearly a welcome. | **Twice, once in pencil** · The clerk has the form but not the bank's stamp, so you sign twice, once in pencil. He enters your name in the day book under Thursday and says it twice. |
| Alliance | **Countersign the lease at the Assembly Rooms** · *Mr Albrecht's lease, the reading room, your father's name on the witness line. Yours under it, and the date right. — T.G.* | Countersign the lease | **"That'll hold"** · You sign under his name, Grey blots it and holds it to the light. "That'll hold." The reading room has a tenancy with two of your family on it, which is how the Rooms start people. | **The second copy counts** · The tenant is late and the first copy is smudged where his name was; the second copy is the one that counts. Grey files it without comment and writes your name in the Rooms' book. |

**For:** the most concrete asks of the three; every one is a signature, and a signature is what next of kin is for. **Against:** the left-luggage clerk selling your train to three parties is a contrivance the player can see; the auction deadline is paperwork; Grey's ask (a dead witness attested by next of kin) is law the game invents.

### 1.3 Version B — *He never chose* (▶ recommended)

**Premise.** Your father was a name once in the capital's politics: a councillor, a mill man, a debtor by the end (the lining decides which part is yours). In his last month three parties wrote to him with work: the Coalport branch, the Duskwall club, the Ashford agent. He answered none of them and died in a boarding house by the station with the three letters in his coat. The coroner's clerk sent you the luggage ticket and, by the look of the platform, sent the three who wrote your train. You arrive tonight because the burial money took three weeks to raise and the last train is the cheap one. What you know: he never chose. You will.

**Beat 1 — *The platform*** (`origin.step-platform`; `scene.station`; kicker *Irongate · Central Station · the last train in*)

> *The last train in. Your father died by this station three weeks ago with three letters in his coat, each offering him work, none answered. The coroner's clerk sent you the luggage ticket and, it seems, sent the three who wrote your train.*

| Row | Title (the offer) | Line 1 | Line 2 |
|---|---|---|---|
| `holm` | **"He was to carry the branch's print down from the capital on Mondays. The first parcel is at the station office, in his name. Take it to Coalport on the six o'clock and the work is yours."** | Petra Holm · union organiser · Coalport | Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence |
| `stahl` | **"He was to keep the Duskwall club's books, and the club keeps its word to a man's family. The ledger is on my desk and the first count is Thursday. Come on the six o'clock and count."** | Viktor Stahl · steward · Duskwall | Iron Vanguard · order, discipline and a strong hand · +3 Strength |
| `grey` | **"He was to witness tenancies for the Rooms' legal-aid desk. There's a lease on my desk that runs out at midnight and no witness. A pen, your name, and the six o'clock to Ashford."** | Thomas Grey · agent · Ashford | Civic Alliance · elections, courts and a free press · +3 Intelligence |

Under the rows: *His place is yours if you want it. Whoever you go with, you go with: a Faction Reset token is the only way back.* Confirm: ***Take his place with Holm · the six o'clock to Coalport*** / ***Take his place with Stahl · the six o'clock to Duskwall*** / ***Take his place with Grey · the six o'clock to Ashford***. Echo: *You took his place with the branch.* / *You took his place at the club.* / *You took his place at the Rooms.*

**Beat 2 — *The suitcase*** (portrait `helper`): *The six o'clock, and the compartment is yours. His suitcase is on the rack, and under it the letter he didn't answer, still in its envelope. {helper} comes back from the corridor and asks what you carry that's your own.* Answers unchanged.

**Beat 3 — *The lining***: *Under the lining, where he kept what mattered: his coat, folded small, and one thing more. He never chose; you have. This is what he left you to finish.* Answers unchanged.

**The favour** (slot B, `use: 'welcome'`, type `council`, 10 Energy, difficulty 8):

| Party | Order | Ticket | Success | Partial |
|---|---|---|---|---|
| Collective | **Carry the branch's print to the Union Hall** · *The parcel from the station office, to the hall, to whoever's on the door. Mondays after this one, the same. There's tea. — P.H.* | Deliver the parcel | **The parcel, counted in** · The parcel is flyers, five hundred of them, and the man on the door counts them in while you wait. "She said you'd come." He finds your father's letter in the book and writes your name under it. | **Counted twice, in pencil** · The man on the door is out and the parcel waits on a bench till he's back. He counts them twice and asks your name three times. It goes in the book, in pencil. |
| Vanguard | **Count the club's books at Beacon House** · *The ledger is on my desk, the subscriptions in the tin. Count the one against the other and have the total for me by noon. — V.S.* | Count the books | **To the penny** · The tin and the ledger agree to the penny by eleven, which the clerk says they have not done since March. Your name goes on the list for Thursday, under the word *books*. | **A slip short** · The tin is short by one subscription and it takes till noon to find the slip. The clerk enters your name in the day book and says Thursday, twice. |
| Alliance | **Witness the lease at the Assembly Rooms** · *Mr Albrecht's lease, the reading room, the pen on the desk. Your name on the witness line, and the date right. — T.G.* | Witness the lease | **"That'll hold"** · The tenant signs, you sign, Grey blots it and holds it to the light. "That'll hold." The reading room has your name on a tenancy now, which is how the Rooms start people. | **The second copy counts** · The tenant is late and nervous and signs on the wrong line; the second copy is the one that counts. Grey files it without comment and writes your name in the Rooms' book. |

Welcome headline decks: *…the branch's print wants carrying to the Union Hall; start there.* · *…the club's books want counting at Beacon House; start there.* · *…Grey's tenant wants a witness at the Assembly Rooms; start there.* Outcome headlines (§29.2 of review 4) as the table.

**For:** who you are, why tonight and what you know are one sentence each, and the beat's first line says them. Three officials meeting one train is believable because each had a letter out to the man and wants the work done. *Take his place* is a reason to join a party for life, which *carry this parcel* never was; it is also why you put on his coat in beat 3. The Vanguard's offer is a clerk's job, which is what the content policy wants it to be. Two of the three favours keep their texts. **Against:** a man all three parties wanted has to have been somebody; the premise says so (*a name once*) and the Ambitions bear it out (a councillor, a prisoner of the '19 fire, a man in debt to Clearwater), but a player who takes *the marker* is a debtor's child being offered three jobs, which is the least likely of the three. Accepted: nobody on the platform knows what is under the lining.

### 1.4 Version C — *The bill*

**Premise.** He died eleven weeks behind on his rent at a boarding house by the station. The landlady wrote to you and, when you did not answer fast enough (you had no fare), to the three names in his address book. Each paid a part of what he owed: the branch his room, the club his doctor, the agent his burial. You come tonight, on the last train, with the watch money, to pay what is left and take the suitcase. The three are on the platform because the landlady told them which train, and they would rather be paid in work than in money. What you know: he died owing, and the people who paid are owed.

**Beat 1 — *The platform***

> *The last train in. Your father died eleven weeks behind on his rent by this station. His room, his doctor, his burial: three people paid before you could. The landlady told them your train, and they'd rather be paid in work than in money.*

| Row | Title (the debt) | Line 1 | Line 2 |
|---|---|---|---|
| `holm` | **"The branch paid his room; he stood on our picket in '31 and we don't forget. Square it with a day's carrying: the parcel on that bench is ours, and it goes to Coalport on the six o'clock."** | Petra Holm · union organiser · Coalport | Red Collective · … · +2 Strength, +1 Intelligence |
| `stahl` | **"The club paid his doctor, and the club keeps accounts. There's a bundle to go out Thursday and a name to enter in the book. Come to Duskwall on the six o'clock and the account closes."** | Viktor Stahl · steward · Duskwall | Iron Vanguard · … · +3 Strength |
| `grey` | **"I paid the undertaker, and I'm owed two minutes: a lease runs out at midnight and needs a witness. A pen and your name, and we're square. Then the six o'clock to Ashford."** | Thomas Grey · agent · Ashford | Civic Alliance · … · +3 Intelligence |

Under the rows: *Whoever you settle with, you go with. Permanent: a Faction Reset token is the only way back.* Confirm: ***Settle with Holm · the six o'clock to Coalport*** (and Stahl, Grey). Echo: *You owe the branch a day's carrying.* / *You owe the club a bundle.* / *You're square with Grey.*

**Beat 2**: *The six o'clock, the compartment, and his suitcase on the rack, which the landlady kept against the bill and gave up for the watch money. {helper} comes back from the corridor and asks what you brought that's yours.* **Beat 3**: *Under the lining, where he kept what mattered: his coat, folded small, and one thing more. He died owing. This is what he left you, and what he left you to finish.* Answers unchanged in both.

**The favour:** the Collective's and the Vanguard's are the built ones (*Deliver Holm's parcel at the Union Hall*; *Hand out Stahl's bundle at Beacon House*, texts unchanged); the Alliance's is ***Witness the second copy at the Assembly Rooms*** · *Mr Albrecht's second copy, the one the office stamps at nine. Your name again, and the date right. — T.G.*, texts as built.

**For:** the strongest noir line (*they'd rather be paid in work than in money*) and the clearest reason for three people to meet a train: they are owed. **Against:** a debt is a weak reason to join a party for life, and a weaker one to wear his coat; the Alliance's ask is done on the platform, so its favour is a repeat; a club that pays a dead man's doctor and then duns his child is a shade kinder than the Vanguard should be.

### 1.5 The pick

**▶ Default: version B.** It answers all three questions in the first beat without a line of explanation; it gives a reason for the party choice that lasts past the platform (*his place is yours*); it keeps the secretaries, the station art, the three stat answers, the three keepsakes and two of the three favours; and the Vanguard's row is the most policy-safe of any version (a ledger and a Thursday count). The user picks; the content changes are the same size in every version (`origin.ts` strings, three order templates, three favour actions, three welcome decks, three outcome headlines; no ids, no schema, no numbers).

**Art:** `scene.station` exists and reads as night under the glass (steam and lamps); the optional night variant of review 4 §28 stays optional. No new art for any version.

**Where:** GDD §7.1 (the premise paragraph, once chosen); `slice-2-onboarding.md` §15 (addendum); content as listed. Until the user picks, the build keeps the current strings.

---

## 2. #2 — Clouds: fewer and larger (decided)

**The cause.** The day sky in `packages/ui/src/clouds.ts` draws **four small sprites among its ten**: two *puffs* in the middle depth at 0.13–0.20 of the picture's width (capped at 0.26 of the box's longer side) and one high puff at 0.07–0.10 (capped at 0.14), plus three wisps at 0.22–0.34. On a desktop the picture at rest is about the width of the screen, so a puff is a hand's width of cloud drifting over a city, which is what reads as odd. On a phone the picture is zoomed in and the same puff is a third of the screen, which is why it was not seen before.

**The decision: three clouds and two wisps by day, every one large; the puffs leave the day sky.** A config change in `clouds.ts`; `CloudLayer` needs nothing. The numbers:

| Depth · kind | Was | Now |
|---|---|---|
| **Middle · the main clouds** | 1 BIG at 0.42–0.50 (`minPx` 260, `maxShare` 0.6) + 1 CLOUD at 0.30–0.38 (200, 0.48) | **Pool BIG + CLOUD (five sprites), count 2, size 0.48–0.62, `minPx` 420, `maxShare` 0.8**, cross 140–190 s, shadow `{ opacity 0.22, dx 0.10, dy 0.18, blur 14 }` (a bigger cloud casts a softer shadow) |
| **Middle · the third cloud** | 2 PUFF at 0.13–0.20 | **The same pool, count 1, size 0.36–0.46, `minPx` 320, `maxShare` 0.6**, cross 110–150 s, the same shadow |
| **High · wisps** | 3 WISP at 0.22–0.34 (150, 0.45) | **Count 2, size 0.34–0.46, `minPx` 260, `maxShare` 0.6**, opacity 0.5–0.7 |
| **High · the small puff** | 1 at 0.07–0.10 | **Gone** |
| **Low · mist** | 2 at 0.55–0.75 | Unchanged |
| **Night · middle curls** | 3 at 0.18–0.28 | **Count 2, size 0.26–0.36, `minPx` 220** |
| Night · everything else | | Unchanged (the fog patches are already 0.38–0.65) |

Day images fall from 14 to **10** (2 mist, 3 clouds, 3 shadows, 2 wisps); night from 9 to **8**. The pass rule (*never the same sprite twice running*) now draws from a pool of five for the main clouds, so two slots rarely show the same shape at once.

**No new art.** The big clouds are 1,100 px sprites; at 0.62 of a 1,440 px picture they are drawn at 890 px (a downscale), and on a 2,560 px screen at about 1.5× (an upscale a soft cloud survives). If the user wants more variety later, **two more big day clouds** (`bigcloud-day-3`, `-4`, 1100 × 650–850, soft edges, no stray fragment at the edge, the same lithograph grain) would be the only art; not needed to close the note.

**Where:** `packages/ui/src/clouds.ts` (`CLOUDS.day`, `CLOUDS.night`); the dev viewer's cloud panel shows the result; no GDD rule.

---

## 3. #3 — The level-up picker, in the house style (decided; GDD §5.3)

### 3.1 What was wrong

Three **black, sharp-cornered, label-caps buttons** (`STR 8 → 9`) with explanation text beside them. The house has no black blocks on paper except the HUD; everything a player taps is a ticket (paper, a 1.5 px ink rule, a stub), a story row, or a button with its cost. The picker also used the stat abbreviations the rest of the game avoids (§1.5: *Strength*, never *STR*).

### 3.2 The cards

One **paper card per stat in the ticket's style**, stacked, the whole card the tap (56 px minimum, 1.5 px ink border, no fill; corners as the ticket's, which are square: the house has no rounded cards). Top to bottom in each card:

- **Left:** the stat in full, body 600 (*Strength*); under it one Courier line, the stat's own words from `copy.statChoice.*` (*Shift changes, loaders, posters, the gate steps: 4 of 15 actions here. Later, security work, marches and holding your own.*; two lines on a phone).
- **Right:** the number, Playfair 20 px: ***8 → 9***.
- **Tags** (Oswald caps 10 px, top right, when they apply): ***Most used here*** on the city's lead stat; ***Your best*** on the player's highest. Both on one card when they coincide.

Above the cards the heading, body 600: ***Level 4 · one point to place*** / ***Level 5 · two points to place*** (`copy.levelPointsToPlace`, reworded: *one point*, *two points*, never *1 stat point*), then the lead line as today (*Most of the work in Coalport uses Intelligence: 9 of 15 actions, and it is your best, at 12.*). Below the cards the footer, italic: *Charisma isn't trained. It's worn: your coat, your suit, your party outfit.* and the text button ***Choose later · nothing is lost*** (`copy.later`).

**States:**

| State | The card |
|---|---|
| Ready | Paper, tappable; the row inverts on press (ink fill, paper text), the briefing's pattern |
| Placing (the call in flight) | The tapped card stays inverted with `aria-busy`; the other two at 60 % |
| Placed | The card reads ***Strength 9*** with a small Courier ***+1*** in the success colour where the arrow was; the others return to paper. With a second point waiting the heading reads *Level 5 · one more to place* and the cards are tappable again. With none waiting the picker closes and the line above it reads *Level 4 · Strength 8 → 9* (review 4 §5) |
| No point waiting | The picker is not shown (the Me tab's Level card shows the stats as rows) |

One tap places the point, as §5.3 says; there is no confirm (nothing is undone by waiting and a card is large enough not to be hit by mistake). On an ink surface (the result modal, §4) the same cards are paper on ink, the ticket-on-modal pattern.

**Where:** `StatPointsPanel` (`packages/ui/src/components/Shell.tsx`) on the Me tab's Level card and in the result modal's knock-on block (as §4 says); `copy.levelPointsToPlace`, `copy.statChoice.tags` (*Most used here*, *Your best*), `copy.later`. GDD §5.3 gains one sentence.

---

## 4. #4 — The scroll bar (decided)

### 4.1 Where scrolling is avoided

The scroll bar appears when **the result modal** grows past the viewport: a mission result (art, stamp, headline, the rows, the receipt, the run-in's block, the knock-on lines) with **the level-up picker inline** in its knock-on block is taller than a 740 px window, and the modal's middle scrolls with the browser's default bar (grey, 15 px, arrows) over the ink ground.

**Rules:**

1. **An ordinary result never scrolls** at 740 px of height and 390 px of width (a phone upright) or on any desktop: a tier-1 result's parts fit; a mission result's run-in block is one band; the receipt prints no zero lines (review 3).
2. **The picker is not inline in a modal.** In the result modal the level-up block is **one line and one button**: ***Level 4 · one point to place*** · **Place it** (`outline`, paper on ink). The button opens the picker of §3 as a `BottomSheet` (paper; at most 70 dvh on a phone, a 480 px panel on desktop) over the modal; placing the point closes the sheet and the line reads *Level 4 · Strength 8 → 9*. A player who ignores the button finds the point on the Me tab as before (the HUD badge). On the Me tab the picker is inline and the page scrolls as a page.
3. When a modal must scroll (a mission result with two points waiting and a run-in, at 600 px of height), **only its middle scrolls**: the art and the stamp stay at the top, the buttons at the bottom; `overscroll-behavior: contain`.

### 4.2 The scroll bar, everywhere

**One thin ink scroll bar, on paper and on ink alike:** 6 px wide, no arrows, a transparent track, a thumb of **ink at 45 %** on paper grounds and **paper at 35 %** on ink grounds, square ends, visible only while the content overflows (the platform's own auto-hide on a phone). In CSS terms: `scrollbar-width: thin` and `scrollbar-color` on every scrolling box (the page, sheets, the modal's middle, the Places list, chat), the WebKit pseudo-elements set to the same (`::-webkit-scrollbar { width: 6px; height: 6px }`, the thumb's colour by surface, the track transparent), and no `scrollbar-gutter` (a reserved gutter reads as a band). A sheet's scrolling box gets the ink thumb; the result modal's middle the paper one.

**Where:** `apps/client/src/index.css` (the global rule and the two surface classes); `ResultModal` (the level-up line and button; the middle as the only scrolling box); `StatPointsPanel` in a `BottomSheet`. GDD: none.

---

## 5. #5 — Jobs: every job, every city, and a rule (decided; GDD §9.2; economy §25.1)

### 5.1 The audit

Twelve jobs are built (nine in the home cities, three in the capital); three more are designed for Clearwater (slice 7). The effective requirement includes the quarter the job's place is in (a job in a Level-6 quarter asks Level 6 whatever its card says): **every built job stands in a Level-1 quarter**, so the card's requirement is the real one.

| City | Place (quarter) | Job · id | Requirements | Pay now | Members | **Proposed** |
|---|---|---|---|---|---|---|
| Coalport | Market Row (The Mill, L1) | Street vendor · `coalport-street-vendor` | Level 1 | 100 | — | **100** |
| Coalport | Mill Gate (The Mill, L1) | Factory worker · `coalport-factory-worker` | Level 1 · Strength 5 | 180 | 216 | **180 · 216** |
| Coalport | Harbour Quays (The Mill, L1) | Driver · `coalport-driver` | **Level 3 · Agility 10** | **200** | — | **240** |
| Duskwall | Customs Market (The Fortress, L1) | Street vendor · `duskwall-street-vendor` | Level 1 | 100 | — | **100** |
| Duskwall | Fortress Gate (The Fortress, L1) | Stores hand · `duskwall-stores-hand` | Level 1 · Strength 5 | 180 | 216 | **180 · 216** |
| Duskwall | Goods Yard (The Fortress, L1) | Driver · `duskwall-driver` | **Level 3 · Agility 10** | **200** | — | **240** |
| Ashford | Bridge Street (The College, L1) | Street vendor · `ashford-street-vendor` | Level 1 | 100 | — | **100** |
| Ashford | Gazette House (The College, L1) | Copy clerk · `ashford-copy-clerk` | Level 1 · Intelligence 5 | 180 | 216 | **180 · 216** |
| Ashford | Bridge Street (The College, L1) | Driver · `ashford-driver` | **Level 3 · Agility 10** | **200** | — | **240** |
| Irongate | Market Square (Station & Market) | Street vendor · `irongate-street-vendor` | Level 1 | 100 | — | **100** |
| Irongate | Central Station (Station & Market) | Porter · `irongate-porter` | Level 1 · Strength 5 | 180 | — (no fifth in the capital) | **180** |
| Irongate | Riverside Quays (Eastside) | Driver · `irongate-driver` | **Level 3 · Agility 10** | **200** | — | **240** |
| Clearwater (slice 7, designed) | Back Lane Market | Street vendor · `clearwater-street-vendor` | Level 1 | 100 | — | **100** |
| Clearwater (slice 7) | The Cannery | Cannery hand · `clearwater-cannery-hand` | Level 1 · Strength 5 | 180 | — | **180** |
| Clearwater (slice 7) | Tram Depot | Tram conductor · `clearwater-tram-conductor` | **Level 3 · Agility 10** | **200** | — | **240** |

**The fault the user found:** the Driver asks Level 3 and Agility 10 (five points above a new character's 5, which is five level-ups or 170 Energy of training) and pays **200**, while the day-1 job asks Strength 5 and pays a member **216**. Four Drivers and the Tram conductor have it; nothing else is out of order (the vendor asks nothing and pays least; the Porter is the day-1 job without the fifth, by design, GDD §9.2).

### 5.2 The rule

> **A job that asks more pays more.** In any city, each rung of the job ladder pays **at least a tenth more than the best pay of the rung below it, the member's fifth counted**. Rungs are set by the requirement, never by the city.

| Rung | Requirement | Pay | For members (home only) | Jobs |
|---|---|---|---|---|
| The fallback | Level 1 | **100** | — | Street vendor (every city) |
| The day-1 job | Level 1 · a stat at 5 | **180** | **216** | Factory worker, Stores hand, Copy clerk, Porter, Cannery hand |
| The first step | Level 3 · a stat at 10 | **240** | — | Driver (four), Tram conductor; **Market trader** when placed (Level 3 · **Intelligence 10**, was 8, so the Intelligence build has its step too) |
| Level 6 | Level 6 · a stat at 12 (+ Charisma 10 for the guard) | **320** | — | Security guard, Newspaper reporter (the reporter's extra is the Dossier entry, not pay) |
| Level 10 | Level 10 · a stat at 15–20 | **500** | — | Factory foreman, Lawyer's clerk |
| Level 16 | Intelligence 30 | **900** | — | Professor |
| Rank 4 | Level 20 · Rank 4 | **1,500** | — | Political aide (plus Party XP and 2 PC a day) |

Check: 216 × 1.1 = 238 → **240**; 240 × 1.1 = 264 → 320; 352 → 500; 550 → 900; 990 → 1,500. The GDD's ranges (Driver 180–250, trader 200–300, guard 300–400, reporter 350–500, foreman 500–700, clerk 600–800, professor 900–1,200, aide 1,500–2,500) all contain their pinned value; the table replaces them.

**What it does.** The Driver is now a real step: +24 a day over a member's day-1 job (+11 %), and a switch (seniority to 0) overtakes the old job's seniority **after four days** and pays 288 against 259 at ten. An Agility build (*light*, Agility 11 from the platform) can take it **on day 1 at Level 3** (450 XP, inside the first bar), which gives that build a visible perk the others earn by training. The reference recruit (Intelligence) keeps the factory job and nothing in `docs/economy.md` moves (§25.1).

**The Jobs card** already prints *needs Level 3 and Agility 10*; it gains nothing. GDD §9.2's catalogue table is rewritten with the pinned values.

**Where:** `jobs.ts` (four `dailyPay: 240`), `slice-7-nation.md` §9.4 (240); GDD §9.2; `docs/economy.md` §25.1; content test: every job's pay against the rung rule.

---

## 6. #6 — Health directly under Energy (decided; GDD §6.1)

**The HUD's order at every width: Energy · Health · Heat (above 0) · XP · Party XP.** Review 4 put Heat under Energy and Health as a third bar under Party XP; the user reads Energy and Health as the pair, which they are (the two things a run-in and a day spend). Heat, when shown, sits **under Health** (the vitals together), then the two progress bars.

- **Phone:** the four bars stack in that order, Heat's line between Health and XP.
- **Wide (the `lg` grid):** column 1 is **Energy over Health**; XP in column 2 and Party XP in column 3 on the first row; Heat's line on the second row under Health (the HUD is three rows deep only while Heat is above 0, which is a state worth the height).
- **Sideways (the 60 px HUD):** unchanged (Health and Heat in the name line).
- The group help button's order follows (Energy, Health, Heat, XP, Party XP).

**Where:** `HudBar` (`packages/ui/src/components/HudBar.tsx`); `slice-5-screens.md` §2.1–2.2 (addendum). GDD §6.1 and §6.4's HUD sentences.

---

## 7. #7 — The journey card stays until answered (decided; GDD §14.10)

### 7.1 The rule

**A journey card, once shown, cannot be dismissed by a tap elsewhere.** The sheet over the map has **no scrim-dismiss, no close button and no swipe-down**; the map behind it is visible and inert (the pin keeps moving, which is the picture). The Paper, Me and Council tabs still work (a vote never waits for a card); the Map tab returns to the card. Closing the app changes nothing: the card is there on return, and if the train has arrived, inside the arrival modal.

**The only ways out are a row on the card:** its two or three choices, or **an explicit put-aside row**, which is what *slept through* now means:

- **The ordinary deck:** a text row at the foot, ***Sleep through it*** (`copy.travel.sleepThrough`), detail *Nothing happens.*; the outcome is the card's `ignore` text (*You nod at the window until he gives up. You arrive as you left.*), no stamp.
- **The hostile deck:** the row is ***Let it pass***, with the consequence on its detail line from the card's `ignoreEffects` (*your name gets written down · Heat +10 · Watched today* for *Papers, please*; *Watched today* for the informer and the list; *nothing* for the conductor), the outcome the card's `ignore` text (*You keep your eyes shut. They write your name down anyway.*).

**The arrival modal** shows an unanswered card with the same rows, the put-aside row included; **the *Continue* button is not shown until a row has been tapped**, then the outcome prints and *Continue* appears. One tap either way.

**What does not change:** a card fires at `cardAt` and is answerable until arrival or on the arrival modal; a player who never comes back is settled by the first read after arrival, which is the arrival modal with the card still answerable; the journey, Energy and the political acts run regardless. *Being away costs opportunity, never assets*: a card is an opportunity, and it waits for the first read.

**Strings:** the line under the card, *Ignore it and you sleep through it. Nothing happens.* (`copy.travel.ignoreIt`), is **replaced** by the row (a line that says a thing can be ignored invites the tap elsewhere). The arrival modal's *…it's below, and you can still answer it* stays.

**Where:** `JourneyCard` (the rows; the sheet's dismissal props), the nation map in journey mode, `ResultModal kind="journey"`; `copy.travel.sleepThrough`, `copy.travel.letItPass`; `slice-4-screens.md` §3–§4 (addendum); GDD §14.10.

---

## 8. #8 — Pay to heal at any infirmary (decided; GDD §19.1)

### 8.1 The rule

Every `hospital` place (Coalport's Infirmary, Duskwall's Infirmary, Ashford's County Infirmary, St Agnes; Clearwater's Sanatorium in slice 7) carries a ***Treatment* card** on its sheet, the `JobsCard` pattern, for a player who is **not** admitted:

| | |
|---|---|
| **Price** | **1 Iron per point of Health missing**, at least **10 Iron**; no Energy |
| **Effect** | Health to its maximum, now |
| **When** | Any time Health is below its maximum, any city (rival ground included: the sisters ask no questions); not while held or in transit; not inside the ward (the ward's own *Walk out well · 5 Energy · 100 Iron* stays, since it buys the time as well) |
| **Limit** | None but being below full. The price is live on the button |

**Why this price.** Health comes back free at ten every ten minutes, and it only matters for the next run-in (the *Won at full strength* +10 %, and not walking around at 1). One Iron a point makes a 60-point top-up 60 Iron against a day's ~1,000, about the price of paying off an enforcer: a choice for the impatient, never a must (economy §25.2). The ward's 100 Iron for a full recovery from 30 is the same rate plus the twenty minutes.

### 8.2 The card and the modal

- Kicker ***TREATMENT***; line ***See the matron · Health 64 / 125*** (St Agnes: *See the sister*); Courier ***One Iron a point: 61 Iron to be whole now. It comes back on its own, ten every ten minutes.***; button ***Get patched up · 61 Iron*** (`outline`; ***Needs 61 Iron*** disabled). At full Health the card reads ***You're well · nothing to treat*** with no button.
- The help note (`help.treatment`): ***TREATMENT** · The matron will make you whole now for one Iron a point. Health comes back on its own, ten every ten minutes; this is only for the impatient. Nothing else about you changes.*
- The modal: `ResultModal kind="political"`, stamp ***Patched up***, headline ***Whole again***, body ***"Politics," says the matron, and doesn't ask which. Ten minutes' work and she charges for twenty. Mind the step.*** (St Agnes: ***The sister does it without a word and the porter takes the money. Mind the step.***); knock-on ***Health 64 → 125*** · ***−61 Iron · the ward***; one button, *Continue* → the place's sheet.

**Where:** `TreatmentCard` (new; `JobsCard`'s shape) on `hospital` sheets; a `character.treat` call (idempotent; refused at full Health, while held or in transit, or short of Iron); `copy.treatment.*`, `copy.help.treatment`; `slice-5-screens.md` §7 (addendum); GDD §19.1 (a row in the table), §18.3 (the sink).

---

## 9. #9 — *What's here* (decided; GDD §14.13)

### 9.1 Where it lives

**The Places list becomes *What's here*.** The plate's button reads ***What's here*** (was *Places*), and the sheet it opens carries, above the places, three short blocks for the city the player is in. It is the same sheet, the same tap, and every row goes where a tap on the pin goes. A home city, the capital's district and rival ground all read the same way.

### 9.2 The sheet

Title ***Coalport · what's here***. Blocks, each a kicker on a double rule, empty-stated:

1. ***ISSUES THIS WEEK*** · two rows: the Issue's name, then Courier *the Collective leads · 48 momentum* (or *nobody yet*); tap → the first place tagged by it, its matching ticket highlighted (the order's pin pattern). The chip's note (`help.issue`) from the kicker.
2. ***MISSIONS YOU CAN START*** · one row per mission in the city whose gates the player passes today, Energy aside (Level, Rank, Reputation, the record, members-only, the target rule): the title in body 600, Courier *Watch and listen · Customs House · Fair odds · 12 Energy* (the odds word of the remembered or best way; the risk word after it when the type carries one: *Risky*); tap → the place's sheet scrolled to the mission. After the rows, one Courier line for the rest: ***2 more from Level 8 · 3 from Rank 3*** (counts by the first gate that fails; nothing named). Empty: ***None yet · the first opens at Level 6***.
3. ***YOUR ORDERS HERE*** · the day's orders that point into this city, as the orders panel prints them (*Knock on doors in Foundry Row · 1 of 3*); tap → the pin with the ticket highlighted. Away from the residence: the collapsed line ***Your orders are in Coalport · 1 of 3 done***, not tappable. All done: ***All three done · tomorrow's are in the paper***. In the cells: *Orders off today*.
4. ***PLACES*** · the list as today, grouped by quarter in a home city with its lock lines, in pin order in the capital's district.

On rival ground the blocks read the same (the missions block lists the visitor's missions; the orders block the collapsed line); the plate's rival header (§10) is not repeated here. On desktop the sheet is the side panel it is today. If §12 is taken, a night mission's row carries *Opens at nightfall · dusk at 16:00* by day.

**Why here.** The user's case was a strange city: *where are its Issues, what can I start, where do my orders point*. The Places button is already the "what is in this town" tap and the first thing a player finds on a new plate; a fourth tab or a second button would be a second place to look.

**Where:** `PlacesList` → `WhatsHere` (the three blocks are props: `issues[]`, `missions[]` with `moreLine`, `orders`), the city view's data (the missions' gates are already computed for their tickets; the server returns the startable list for the city), `copy.whatsHere.*`; `slice-4-screens.md` and `slice-5-screens.md` (addenda); GDD §14.13 (the Places list paragraph).

---

## 10. #10 — Rival ground: the push, the danger, the goal (needs the user's decision)

### 10.1 What was wrong

The plate on rival ground says *Your work here draws from the Vanguard's morale · 1.3 of 2.0 points left today* in one Courier line, which is the only place the 2-point cap is read, and nothing says **why** a player should be here beyond the +50 % Party XP tag, or what happens if the party keeps pushing. The stake that already exists in the rules, **Unrest** (§14.11: under 60 % the home branch's orders switch to *Restore the base*, the city counts half for its party, its deputies go quiet in Parliament from slice 7, and rival work there pays +75 % instead of +50 %), is invisible to the visitor who could cause it.

### 10.2 ▶ Default: the header

The plate on rival ground replaces its one Courier line with **three lines under the morale line**, each in plain words, each with a note on tap:

1. **The push bar** (`PushBar`): label ***Pushed today***, a 2-point track filled in **two colours**: the player's party's points there today and the third party's (the cap is across both rivals, §14.11), with the figure in Courier: ***0.7 of 2 points · the Collective 0.5 · the Alliance 0.2***. At the cap: ***The town has had enough today · 2 of 2 · more from tomorrow 01:00*** (the §4.2 style; the bar full in the failure colour), and the political tickets' line as today. Note (`help.push`): *What the town will take from outsiders in a day: two points off the home party's share, between the other two parties. After that your work here still pays XP, Party XP and Iron and moves nothing until the day turns.*
2. **The danger line** (Courier; the failure colour from *Dangerous*): ***Risk here: Risky · every tap can bring a run-in · Heat counts double · the cells put you on the train home***. The word is the band of **the player's tier-1 run-in chance here today** (15 base, the Heat state, *Watched* or *Warned*, the record; the mission ticket's bands: *A little risk* to 10, *Risky* to 24, *Dangerous* from 25). The note is `help.rivalGround`, reworded to end *…the worst is the cells and the train home, and nothing you own is at risk.*
3. **The goal line** (body 13 px): ***The goal: Unrest. Under 60 % the Vanguard's branch drops everything to win the town back, its deputies go quiet, and your work here pays three quarters more. 11.4 points to go · your party has pushed 4.2 this week.*** The figure is the home share minus 60; the week's push is the party's seven-day sum of points moved there (the ledger). In Unrest: ***Duskwall is in Unrest · hold it: your work here pays +75 % Party XP · the Vanguard needs 60 to get out · 3.1 points above the floor.*** Note (`help.unrest`): *A home town under 60 % is in Unrest: its branch's orders become "restore the base", the town counts half for its party in the republic, its deputies abstain in Parliament, and visitors' party work there pays three quarters more. It ends when the home party is back at 60.*

Under 700 px of height the plate folds the goal line into the push bar's note. On the nation map the city's card gains the goal line's first sentence (*The goal: Unrest · 11.4 points to go*).

**What "flipping the lead" means here:** nothing, and the header should not pretend otherwise. A home city's party never falls below 50 (§14.11); the stake is the state, not the lead. In the battlegrounds the lead does flip and the plate already says *close race* and *comeback* (§14.4); this header is for rival ground only.

### 10.3 ▶ Default: the prize (*Pressed into Unrest*)

A goal needs a reward beyond the +25 % more Party XP once it is reached. **When a rival home city enters Unrest**, every member of a pushing party who moved **at least 0.5 points there in the last seven days** gets **+50 Party XP** (the knock-on line ***Duskwall in Unrest · you pushed 1.8 points this week · +50 Party XP***, paid at the boundary job that reads the state), a headline in their paper (***{Party} Callers Push Duskwall into Unrest*** · *The town's share fell under 60 overnight. {Top three} did most of the pushing; the Vanguard's branch has dropped everything to win it back.*), and from slice 8 **Legacy +2**. Paid **once per entry into Unrest per city, at most once in seven days per city**, so a town that wobbles at the line pays nobody twice. Bounded: at most 50 Party XP a week from it, a quarter of a day's Party XP (economy §25.3).

**Alternative, not taken:** a weekly party target set by the secretary (*This week: push Duskwall 10 points*) with the Chair's push mechanics (slice 7). It restates the Unrest goal with a number the secretary made up; the state is the better target because its consequences are real and already written. If the user prefers a target, it should be the Chair's push from slice 7 pointed at a rival city, not a new system.

**Numbers.** From *Fired up* at 70, with both rivals at the cap, a town reaches 60 in **five days**; the drift back is 2 % of the distance to 70 a day (+0.2 at 60), so the home branch gets it back by work, not by waiting: three active members canvassing (+1.15 each a day) take it from 58 to 60 in a day. Appendix C #52's cap lever is unchanged.

**Where (if taken):** `PushBar` and the plate's rival block; `copy.rival.*`, `help.push`, `help.unrest`; the city-day job (the Unrest entry and its prize); `headlines.ts` (three decks); `slice-5-screens.md` §8.3 (addendum); GDD §14.12 (the header), §14.11 (the prize), Appendix C #102.

---

## 11. #11 — Should time pass in real time? (needs the user's decision)

### 11.1 What the days drive

Every rule with a day in it runs on the **real City Day** (00:00 UTC): the wage and seniority, the Party orders, the council cycle (five days), the Issues (a week), Heat's *quiet day*, the *Today* tally, the term (28 days) and the season (84). Night is a **window inside the day**: 20:00–06:00 UTC, cosmetic today, with three rules waiting on it (the Curfew Order's run-ins ×2 at night, slice 7; recognition doubled at night, slice 8; the night train, post-MVP). At UTC+3 that night is 23:00–09:00, which is why the map was dark at breakfast.

### 11.2 The three options

| | **A · Real days; a shorter visual day/night only** | **B · A six-hour game day; night mechanics on it; every daily rule on the real day** | **C · Everything on a shorter game day** |
|---|---|---|---|
| **What changes** | The map's art cycles on a short clock (say every three hours); the rules keep the 20:00–06:00 UTC night, or drop night from the rules altogether | `isNight` becomes *the last two hours of every six* (dusk at 04, 10, 16, 22 UTC; dawn at 00, 06, 12, 18): the map, the clouds and every night rule follow it; the City Day, the orders, the wage, the councils, the Issues, terms and seasons are untouched | The City Day becomes six hours: four sets of orders, four wages, a council every 30 hours, a term in a week |
| **Short sessions** | No effect | Every session has about a one-in-three chance of falling in the dark; a player with three sessions a day sees both most days. The plate says *Dusk in 40 min* / *Night · dawn at 18:00* (the §4.2 style) | Four "mornings" a day: the paper, the orders and the tally four times; a session no longer maps to a day |
| **Never online at a set time** | Kept | Kept for every rule that matters (nothing daily moves). Night content is an **opportunity** at a known hour, like Monday's Issues or a poll's three days; it must never be *required*: night missions are extra (§12), never on the ladder a Level needs | Broken: orders that lapse every six hours ask for four logins |
| **Fairness across zones** | The night rules, if kept on UTC, favour the zones whose evening is UTC's; if dropped, nothing to be fair about | **Fairest:** the same four nights for everyone at the same instant, whatever the zone; every real day has eight hours of dark in four windows, so no zone is "the night zone" | The same, but every zone also gets the same four deadlines a day |
| **Art and the clock** | The map says night while the HUD clock says 14:22 and the rules say day: three clocks | The HUD keeps the player's own time; the plate adds the town's dusk and dawn; the map agrees with every rule | One game clock for everything; the HUD's real clock becomes decoration |
| **Build cost** | A constant for the art cycle, and a contradiction to explain | **Small:** two constants in `packages/rules` (`GAME_DAY_HOURS = 6`, `NIGHT_HOURS = 2`), `isNight`, `nextDusk`/`nextDawn`; the map and clouds already key on `isNight`; a plate line; the clock's help note; tests; the dev panel's clock jump. No migration, no job | Large: the day key, every boundary job, the orders' rotation, the wage, the calendar, the paper's editions, the tally, telemetry's player-days; every economy figure retuned |
| **Slices 6–9** | Nothing | **Events** resolve at the boundary (unchanged). **Terms** of 28 days and **seasons** unchanged. **The Curfew Order** (slice 7) doubles run-ins at night: its share of the day goes from 10/24 to 1/3 (the bound unchanged). **Recognition at night** (slice 8): the same rule a third of the time, the same for everyone. **The night train** (post-MVP) is redefined as *boards at dusk, arrives at dawn*. §3.1's "a rally at 19:00" is already an event with no clock | Terms and seasons would run in a week and three; the events' sign-up windows (1–12 h) span two game days; everything in `economy.md` is re-derived |

### 11.3 ▶ Default: option B

**Keep real-time days; give the town a six-hour day.** The political calendar must stay on real days: short sessions and *never online at a set time* depend on a daily rhythm a player can keep without a clock (one paper, one set of orders, one wage, one tally). What should move faster is **the scenery and the street**: dusk four times a day gives the user the cycle they asked for, lets the night rules of slices 7–8 and the night of §12 happen to everyone fairly, and costs two constants. Why six and not eight (three a day, three hours of night): six gives the dark to more sessions, and the 00:00 UTC boundary falls on a dawn, so *the day turns at dawn* is literally true and the Morning Paper lands at first light. Eight hours with a three-hour night is the lever if four nights a day reads as too busy (Appendix C #100).

**What it would take:** the constants and the two helpers in `packages/rules`; the plate's line (***Dusk in 40 min*** · ***Night · dawn at 18:00***, `copy.when`); the clock's help note (`help.clock`): *The game runs on real time, shown in your own clock. The day turns at {dayTurn}. The town's own day is six hours long: dusk comes round four times a day, and the map and the streets are dark for two hours each time. Every time you read in the game is in this clock.*; the Settings sheet's *Map at night* line unchanged; GDD §2.2 rewritten; the slice-7 and slice-8 night rules re-read against the window (no number moves); a test that the four windows tile the day; the dev panel's clock jump already exists.

**What it does not change:** the HUD shows the player's own time; the City Day and every rule with a day in it; the maps' art (day and night pictures exist); the clouds (the night fog is drawn already).

---

## 12. #12 — Night missions, and patrols on rival ground at night (needs the user's decision)

### 12.1 ▶ Default: night as a window on content

**A mission, or one way of a mission, may carry `window: 'night'`.** By day the ticket (or the way's row) is shown but not tappable, with the lock line ***Opens at nightfall · dusk at 16:00*** (the §4.2 style; `copy.night.opensAt`); at night it plays as any other. Night missions are **extra**: every Level's ladder stays complete by day, so nothing a player needs waits for the dark.

**Night-only ways in existing missions** (no new mission; the way's row carries the line by day):

| Mission | The night way | By day |
|---|---|---|
| *Tear down the Vanguard's posters on the fish quay* (`coalport.far-bank.posters`) | *Before the market, in the dark* (Agility) | *At the busiest, in plain sight* (Strength) stays |
| *Tear down the posters* at the Mountain Inn (`duskwall.mountain-inn.posters`) and the Brewery (`ashford.brewery.posters`) | the Agility way | the Strength way stays |
| *Spike the duplicator* (three HQs) and *Lift the roll* (three HQs) | the Agility way | the other ways stay |
| *Watch the sheds / the checkpoint / the wharf after dark* | the Agility way (the roofs, the fence) | the Intelligence way (the bollard, the flask) stays, title and all: a watch can start at dusk |

**Four new night missions**, one per city, at the tier-2 rate with **+25 % Iron** (*the night rate*, a line on the receipt; never Party XP, so the dark cannot be turned into political power), the difficulty ladder by Level (§8.4):

| Id | Title | Place | Type · Energy · Level | Ways (stat) | Briefing (≤ 300) |
|---|---|---|---|---|---|
| `coalport.customs-house.lorry` | **Follow the ten o'clock lorry** | Customs House (The Harbour) | surveillance · 12 · Level 8 · everyone · pool `city-police` | *On foot, by the back lanes* (Agility) · *From the tram, a stop behind* (Intelligence) | *The shed door that opens at ten lets a lorry out at eleven, with no stamp and no lights. Somewhere in Coalport it unloads. The man who knows where owns the quay, and the man who finds out owns him.* |
| `duskwall.checkpoint.log` | **Lift the checkpoint's log after lights-out** | Frontier Checkpoint (The Pass) | theft · 15 · Level 10 · Rank 3 · target `vanguard` · pool `street-enforcer`, `city-police` | *Through the window while the stove is lit* (Agility) · *Talk the night clerk into a smoke outside* (Charisma) | *The checkpoint's log says who crossed the Pass and when, in the night clerk's hand. The club reads it on Fridays. Anyone else who reads it first has a week of their business.* |
| `ashford.brewery.dawn-shift` | **Paste over the brewery gate before the dawn shift** | The Brewery (The Wharf) | vandalism · 10 · Level 6 · Rank 3 · target `alliance` · pool `party-thug`, `city-police` | *Lamp out, bucket and brush* (Agility) · *Two of you and a ladder, quickly* (Strength) | *The Alliance papers the brewery gate for the dawn shift, when four hundred men read whatever is there. The watchman does his round at four. What is on the gate at five is the morning's news.* |
| `irongate.tram-junction.last-tram` | **Ride the last tram with the Eastside flyers** | Tram Junction (Station & Market) | propaganda · 10 · Level 10 · everyone · pool `street-enforcer`, `party-thug` | *A seat by the door, a flyer for every stop* (Charisma + Intelligence) · *The whole bundle on the rear platform, and off at the bridge* (Agility) | *The last tram to Eastside carries the late shift home, two hundred people with nothing to read. The conductor doesn't mind flyers; he minds trouble. Who gets off at the Iron Bridge decides which it is.* |

Outcome texts (Success / Partial / Failure, ≤ 240 each) are written with the slice that builds them, in the §5 catalogue's shape.

### 12.2 ▶ Default: patrols on rival ground at night

Two rules, both only on rival ground, both only at night, neither touching an absent player:

1. **While acting (the higher base).** At night on rival ground **the tier-1 run-in base is 25 % instead of 15**, and **a mission's run-in gains +10** after the ×2 (the same 90 cap); the Curfew Order (slice 7) doubles on top. The ticket's risk word moves accordingly (*Dangerous* at night with any Heat) and a tag reads ***Night · patrols out***. Patrol run-ins draw **the city police half the time** whatever the Heat state (the pool's other half as today).
2. **While present (the night stop).** **Once per night per city**, on the **first read of the city view at night** while the player stands on rival ground (not held, not in transit, and not when a journey's hostile card already stopped them this night), **a *Patrol* card** in the hostile deck's shape (difficulty 14, never failing, no Energy): kicker *A PATROL · RAMPART ROW*, setup ***Two of them under the corner lamp, with the walk of men paid by the hour. "Late to be out. Papers."***, rows ***Show your papers*** (unchecked; passes a Cool player with a clean record, else *your name gets written down · Heat +10 · Watched today*) · ***Talk your way past · Charisma*** (Success nothing; Partial Heat +5) · ***Slip down a side street · Agility*** (Success nothing; Partial Heat +5, *Watched*) · the put-aside row ***Let it pass*** (the papers' worse outcome). It is a card, not a fight: it never sends anyone to the cells by itself; it raises Heat and sets *Watched*, which is what makes the next tap's run-in likelier. That is the user's "stopped just for being there", bounded to one a night.

**Why not an idle timer.** A patrol that fires while the app is closed, or while the player reads the paper, would be a timer that threatens (§4.3 rule 5) and would punish the absent (§4.3 rule 1): a player who left the app on rival ground at dusk would come back arrested. The night stop fires only on a read the player makes, costs no asset, and is answered in one tap; a player who closes the app on rival ground at night is stopped at most once when they return, by a card they can talk past.

**Home cities and battlegrounds:** no patrols (at home the police are your own; the battlegrounds' tier-1 taps have no run-ins, §14.11); the Curfew Order is the only night rule there.

### 12.3 With and without §11

With option B the night is two hours in six, so a rival-ground visit is in the dark a third of the time and a night mission's window comes round four times a day. Without it (the UTC 20:00–06:00 night) the same rules apply ten hours in twenty-four, and a player's zone decides whether their evening is the game's night; the rules still hold, less fairly. §12 does not need §11, but reads better with it.

**Numbers.** A thirty-tap rival-ground day spent wholly at night: 7.5 run-ins instead of 4.5 (economy §19.6), about +180 Iron of pay-offs or an infirmary stay more; the +50 % Party XP is unchanged, so the night pays the same and costs more, which is what *the night is dangerous* should mean (§25.4). Four night missions at +25 % Iron are at most +60 Iron a day.

**Where (if taken):** `missions[].window` and `ways[].window` on the schema; `copy.night.*`; the run-in formula (`packages/rules`) and the night stop in the city read (idempotent per night key per city); the four missions and the *Patrol* card in content; `slice-5-risk.md` §10–§11 (addendum); GDD §13.1, §14.12, §20; Appendix C #101.

---

## 13. Content-policy check

Version A's and B's Vanguard rows and favours carry a club, a bank's papers, a ledger, subscriptions, a clerk, a day book and a Thursday meeting; version C's a bundle, a book and an account. No uniform, no rank of the army, no symbol, no salute, no slogan; *ex-servicemen* is not in any string. The night mission at the Frontier Checkpoint names *the club* and *the night clerk*; the *Patrol* card's men are *paid by the hour* and have no party named (the pool decides). The Curfew Order is a law of the republic. Checked against `docs/design/content-policy-review.md` §7.

## 14. Documents changed

| Document | Change |
|---|---|
| `docs/GDD.md` | §0 (*Added 8 Oct 2026, review 5*); §2.2 (the game day, proposed); §5.3 (the picker's cards); §6.1 and §6.4 (the HUD order); §7.1 (the premise under review); §9.2 (the rung rule, the Driver 240, the pinned catalogue); §13.1 (night windows, proposed); §14.10 (the card stays); §14.11 (the prize, proposed); §14.12 (the header, the patrols, proposed); §14.13 (*What's here*); §18.3 (the treatment sink); §19.1 (*Get patched up*); Appendix C #96–#103 |
| `docs/economy.md` | §25 (review 5: the job ladder, the treatment price, the prize, the night, session shape) |
| `slice-1-content.md`, `slice-2-cities.md`, `slice-4-battleground.md`, `slice-7-nation.md` | Addendum: the Driver and the Tram conductor at 240 |
| `slice-2-onboarding.md` | Addendum: the premise is under review (§1 here); mechanics unchanged |
| `slice-4-screens.md` | Addendum: the card stays until answered; *What's here* |
| `slice-5-screens.md` | Addendum: the HUD order; the picker and the scroll bar; the *Treatment* card; the rival header (proposed) |
| `slice-5-risk.md` | Addendum: night windows and patrols (proposed) |

---

## 15. For the developer: the fix list

Ordered; each with *Done when*. Items marked **(user)** wait for the user's pick and are specified above so they can be built the day the pick lands.

### Bugs

1. **The journey card can be dismissed** (§7). *Done when* the card's sheet has no scrim-dismiss, close or swipe; the ordinary deck's card carries the *Sleep through it* row and the hostile deck's *Let it pass* with its consequence line; the arrival modal shows *Continue* only after a row; `copy.travel.ignoreIt` is gone; a Playwright test taps the scrim and the map behind the card and finds the card still open, then taps *Sleep through it* and reads the `ignore` text.
2. **The scroll bar on the result modal** (§4). *Done when* a mission result with a run-in and a level-up fits a 740 × 390 viewport without scrolling, the level-up block is one line and *Place it*, and every scrolling box in the app shows the 6 px thin bar (ink on paper, paper on ink) in Chromium and Firefox.

### UI

3. **Health under Energy** (§6). *Done when* the HUD reads Energy · Health · Heat · XP · Party XP on a phone, Energy over Health in the first column on wide screens, and the help group's order matches.
4. **The level-up picker as cards** (§3). *Done when* the picker shows three paper cards (name, Courier line, *8 → 9*, the *Most used here* and *Your best* tags), the whole card is the tap, the placed card reads *Strength 9 · +1*, the heading reads *one point to place*, and no black button remains; on the Me tab inline, in the result modal behind *Place it* as a sheet.
5. **Clouds** (§2). *Done when* `CLOUDS.day` draws three main clouds from the BIG + CLOUD pool (two at 0.48–0.62, one at 0.36–0.46), two wisps at 0.34–0.46 and no puff; the night's middle curls are two at 0.26–0.36; `spriteCount` is 10 by day and 8 by night; the dev viewer at 1,440 px shows no cloud narrower than a third of the screen.
6. ***What's here*** (§9). *Done when* the plate's button reads *What's here* and the sheet lists the two Issues (tap → the first tagged place with the ticket highlighted), the missions the player can start today with the *n more from Level/Rank* line, the orders here (or the collapsed line away), then the places; the server returns the startable missions by the same gates the tickets use; an e2e in Duskwall as a Coalport resident reads all four blocks.

### Balance

7. **The Driver pays 240** (§5). *Done when* the four Drivers are `dailyPay: 240`, slice 7's Tram conductor is 240 in its design, a content test asserts the rung rule (each rung ≥ 1.1 × the best pay below it, the member's fifth counted) for every job in every city, and the economy test's job figures are updated.

### Features

8. **Pay to heal** (§8). *Done when* every `hospital` sheet carries the *Treatment* card with the live price (one Iron a point, at least 10), the call is idempotent and refused at full Health, while held, in transit or short of Iron, the modal prints *Patched up* with the knock-on lines, and a test shows a player at 64 / 125 paying 61.
9. **(user) The opening, version A, B or C** (§1). *Done when* the chosen version's three narratives, nine row strings, three confirms, three echoes, three order templates, three favour tickets with their four texts and three welcome decks are in content (`origin.ts`, `orders.ts`, `cities/*.ts`, `headlines.ts`), every text ≤ 240 and four sentences, the Vanguard strings pass the policy regex, and the reference answers still give STR 8 / INT 12 / AGI 5 / CHA 5 and *Finish His Work*.
10. **(user) The rival-ground header and the prize** (§10). *Done when* the plate on rival ground shows the push bar in two colours against 2, the danger line with the player's risk word, and the goal line with the points to go and the party's week; the city-day job pays +50 Party XP once per Unrest entry per city to members with ≥ 0.5 points there in seven days and prints the headline; a test enters Unrest twice in a day and pays once.
11. **(user) The six-hour game day** (§11). *Done when* `isNight` is the last two hours of every six from 00:00 UTC, `nextDusk`/`nextDawn` exist, the plate reads *Dusk in n min* / *Night · dawn at hh:mm*, the clock's note says the town's day is six hours, the map and the clouds flip on the new window in the dev panel's clock, and every daily rule's test is unchanged.
12. **(user) Night windows and patrols** (§12). *Done when* a mission or a way with `window: 'night'` is locked by day with *Opens at nightfall · dusk at hh:mm* and plays at night; the twelve night-only ways (three posters, three duplicators, three rolls, three watches) and four night missions are in content with their texts; the night rate (+25 % Iron) is a receipt line; on rival ground at night the tier-1 run-in base is 25 and a mission's +10, with the *Night · patrols out* tag; the *Patrol* card fires once per night per city on the first city read, never while held, in transit, or on the night a hostile journey card fired, and never with the app closed; tests cover the once-a-night key and the absence case.

### Art (noir lithograph, the `mvp` style)

- **None required.** The clouds reuse the five day sprites; the station scene serves every opening version; the *Treatment* card uses the `hospital` scene on its modal; the *Patrol* card uses the hostile deck's checkpoint art (the map crop at the place, as the journey cards do).
- **Optional:** two more big day clouds (`bigcloud-day-3`, `-4`; 1100 × 650–850, soft edges, no stray fragment) if the two-sprite pool reads repetitive; a night variant of `scene.station` (review 4 §28, still optional); a **patrol portrait** (two men under a lamp, 880 × 1168, no insignia) for the card's row art if the map crop reads too plain.
