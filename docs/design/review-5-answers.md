# Review 5 — design and copy answers (8 Oct 2026)

Answers to the twelve notes of `docs/review/2026-10-08-review-5.md` (Design Review 2 in Notion; the build at `f9096bd`, slices 0–5 and every review-4 fix). Each answer gives the decision, the reason, the exact player-facing strings, ids and numbers, and the screens affected. Rule changes are pinned in `docs/GDD.md` (§0, *Added 8 Oct 2026 (review 5)*) and in the section named; the pacing check is `docs/economy.md` §25; the slice docs that change carry a dated addendum (§14). The plain-words rule (GDD §1.5) applies to every string here. **No code in this document; a developer builds from it** (§15, the fix list).

**Four notes need the user's decision** — **1** (the opening), **10** (rival ground), **11** (the game day) and **12** (night) — each with a recommended default marked **▶ Default**. Everything else is decided here.

Nothing here adds a required tap to a session. The level-up picker is one tap as before; *What's here* is one tap to a list; the treatment card is one optional tap; the journey card already needed a tap and now cannot be lost by a tap elsewhere.

| # | Note | Decision | Where |
|---|---|---|---|
| 1 | The opening is weak | Round 1: A, B, C (§1), **not taken** (*"unrelated to the father"*). Round 2: D, E, G (§16.2–16.6), **rejected** (*"tables at a train station"*). **Round 3 (§19): *Coming home*** — the demob office, the clerk's three pieces of bad news (the mill sold, the stamp missing, the flat requisitioned), three people in the hall for their own reasons; which problem you chase is your party; the kitbag sets the stat; the office's post sets the long story (*The Names on the Stone*, *Who Sold the Homes*, *The Ration Ledger*) | §19; GDD §7.1, §17.1 |
| 2 | Small clouds | **Fewer, larger**: three clouds and two wisps by day, none narrower than 0.36 of the picture; the small puffs are gone; **a config change, no new art** | §2 |
| 3 | Level-up boxes | **Three paper cards in the ticket's style**, one per stat, the whole card the tap; the black blocks are gone | §3; GDD §5.3 |
| 4 | Unstyled scroll bar | The result modal never scrolls for an ordinary result; the picker in a modal is **a line and a button that opens a sheet**; **one thin ink scroll bar** everywhere else | §4 |
| 5 | Jobs pay | **The Driver pays 240** (was 200); a rule: **a job that asks more pays more**, each rung a tenth over the best below it, the member's fifth counted; the catalogue's ranges pinned | §5; GDD §9.2; economy §25.1 |
| 6 | Health under Energy | **Energy · Health · Heat · XP · Party XP** at every width | §6; GDD §6.1 |
| 7 | The journey card can be skipped | **The card stays until answered**: no scrim-dismiss, an explicit *Sleep through it* row, the arrival modal's *Continue* only after a row | §7; GDD §14.10 |
| 8 | Pay to heal | **A *Treatment* card on every infirmary**: *Get patched up · n Iron*, **one Iron a point of Health missing**, no Energy, no limit but being below full | §8; GDD §19.1 |
| 9 | What's here | **The Places list becomes *What's here***: the city's Issues, the missions you can start, your orders here, then the places | §9; GDD §14.13 |
| 10 | Rival ground emphasis | **Decided (user, 8 Oct): a three-line header** (the push bar against the 2-point cap, the danger in words, **the goal: Unrest** with the points to go) and **the prize** for pushing a town into Unrest | §10; GDD §14.12, §14.11 |
| 11 | Day/night more often | **Decided (user, 8 Oct): a six-hour game day**, dusk at 04 / 10 / 16 / 22 UTC, the last two hours night, the same for everyone; every daily rule stays on the real City Day | §11; GDD §2.2 |
| 12 | Night missions and patrols | **Decided (user, 8 Oct):** night-only ways and four night missions (+25 % Iron); on rival ground at night a higher run-in base while acting, and **a random *Patrol* stop** on a city read (12 % a ten-minute bucket, by Heat and the flags, at most two a night), never while absent | §12, §16.1; GDD §14.12 |
| 17 | The result modal overflows | **A compact layout** (the picture 112 / 136 / 150 px; *How it went* only when it says something; tags one line; the receipt's notes behind *Details*; three knock-on lines and *n more*); a ×3 or a reason line may scroll ≤ 100 px on a 740 px phone | §17 |

---

## 1. #1 — The opening, round 1 (not taken: the user asked for a premise unrelated to the father; see §16.2)

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

## 10. #10 — Rival ground: the push, the danger, the goal (decided: the user approved §10.2 and §10.3 as proposed, 8 Oct 2026)

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

## 11. #11 — Should time pass in real time? (decided: the user took option B as §11.3 specifies it, 8 Oct 2026)

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

## 12. #12 — Night missions, and patrols on rival ground at night (decided: the user approved §12.1 and §12.2, with the night stop made random as §16.1 settles it, 8 Oct 2026)

### 12.1 ▶ Default: night as a window on content

**A mission, or one way of a mission, may carry `window: 'night'`.** By day the ticket (or the way's row) is shown but not tappable, with the lock line ***Opens at nightfall · dusk at 16:00*** (the §4.2 style; `copy.night.opensAt`); at night it plays as any other. Night missions are **extra**: every Level's ladder stays complete by day, so nothing a player needs waits for the dark.

**Night-only ways in existing missions** (no new mission; the way's row carries the line by day):

| Mission | The night way | By day |
|---|---|---|
| *Tear down the Vanguard's posters on the fish quay* (`coalport.far-bank.posters`) | *Before the market, in the dark* (Agility) | *At the busiest, in plain sight* (Strength) stays |
| *Tear down the posters* at the Mountain Inn (`duskwall.mountain-inn.posters`) and the Brewery (`ashford.brewery.posters`) | the Agility way | the Strength way stays |
| *Spike the duplicator* (three HQs) and *Lift the roll* (three HQs) | the Agility way | the other ways stay |
| *Watch the sheds / the checkpoint / the wharf after dark* | the Agility way (the roofs, the fence) | the Intelligence way (the bollard, the flask) stays, title and all: a watch can start at dusk |

**Four new night missions**, one per city, at the tier-2 rate with **+25 % Iron** (*the night rate*: the tag ***Night rate · +25 % Iron*** on the ticket and on the result's tags line, its part in the receipt's *Details* (§17.2, settled §18); never Party XP, so the dark cannot be turned into political power), the difficulty ladder by Level (§8.4):

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
12. **Night windows and patrols** (§12, §16.1, §18; decided). *Done when* a mission or a way with `window: 'night'` is locked by day with *Opens at nightfall · dusk at hh:mm* and plays at night; the twelve night-only ways (three posters, three duplicators, three rolls, three watches) and the four night missions are in content with the outcome texts of §18.2; the night rate is the tag *Night rate · +25 % Iron* with its part in *Details*; on rival ground at night the tier-1 run-in base is 25 and a mission's +10, with the *Night · patrols out* tag; the *Patrol* card (`patrol.stop`, the kicker *A PATROL · {street}* from §18.1) rolls **once per ten-minute bucket per city on a city read at night on rival ground at 12 % (+5 / +10 by Heat state, +10 *Watched*, −10 *Warned*, ×2 under the Curfew Order, 5–40)**, never on an act, never within ten minutes of `arrivesAt`, never within fifteen minutes of a stop or a run-in, at most two a night per city, never while held or in transit, never with no read; a pending card holds Energy acts and boarding and never resolves itself; tests with a seeded clock cover one roll per bucket, the cap of two, the quiet after a run-in and after arrival, the absence case (no read, no roll) and a Cool clean player passing *Show your papers*.

### Art (noir lithograph, the `mvp` style)

- **None required.** The clouds reuse the five day sprites; the station scene serves every opening version; the *Treatment* card uses the `hospital` scene on its modal; the *Patrol* card uses the hostile deck's checkpoint art (the map crop at the place, as the journey cards do).
- **Optional:** two more big day clouds (`bigcloud-day-3`, `-4`; 1100 × 650–850, soft edges, no stray fragment) if the two-sprite pool reads repetitive; a night variant of `scene.station` (review 4 §28, still optional); a **patrol portrait** (two men under a lamp, 880 × 1168, no insignia) for the card's row art if the map crop reads too plain.

---

## 16. Round 2 (8 Oct 2026): the user's decisions, and three openings without the father

The user decided the four open notes the same day: **#10 approved** as proposed (the header and the Unrest prize); **#11 approved**, option B as specified (a six-hour game day, dusk at 04 / 10 / 16 / 22 UTC, night the last two hours); **#12 approved, with the night stop made random** instead of once on the first read; **#1: none of A, B or C** — *"come up with a better one, unrelated to the father."* §16.1 settles the patrol numbers; §16.2–16.5 are the three new openings; §16.6 the pick; §16.7 the fix-list changes. §1, §10.2–10.3, §11.3 and §12.2 above stand as the record of the first round, with the decisions marked in their headings.

### 16.1 The patrol, made random (decided; GDD §14.12, §20)

**The shape.** On rival ground at night (§2.2's window) there are two patrols, as before: **while acting** the run-in is the patrol (the tier-1 base 25 instead of 15, a mission's +10 after its ×2; unchanged from §12.2); **while present** the *Patrol* card may stop a player who is only looking at the town. The card is now **a chance on a read, not a certainty on the first one**:

| | Rule |
|---|---|
| **When a roll happens** | On a **read of the city view** (the Map tab opening on the city, a return to it from another tab or from a result) **at night, on rival ground**, not held, not in transit, not within **ten minutes of arriving by train** (the journey's hostile card was tonight's first stop), and **at most one roll per ten-minute bucket per city** (`floor(now ÷ 10 min)` keyed with the character and the city, idempotent), so a refresh never rolls twice. An **act never rolls the patrol**: an act rolls its run-in and nothing else |
| **The chance per roll** | **12 %**, **+5 at *Noticed*, +10 at *Hot* or *Wanted***, **+10 *Watched*, −10 *Warned***, ×2 under the Curfew Order (slice 7), kept between **5 and 40**. A new, Cool visitor: 12 % a bucket |
| **The cap** | **At most two stops a night per city**, and **never within fifteen minutes of the last stop or of a run-in** (the street is quiet after trouble). Expected for a player present and reading through a whole two-hour night: 12 buckets × 0.12 ≈ **1.4 stops**, capped at 2; for a five-minute look-in: **one roll at 12 %**; for a *Hot*, *Watched* visitor: 32 % a bucket, two stops in most full nights |
| **What a stop is** | The *Patrol* card of §12.2, unchanged: difficulty 14, never failing, no Energy; *Show your papers* (Cool and clean passes; else the name written down, Heat +10, *Watched*) · *Talk your way past* (Charisma; Partial Heat +5) · *Slip down a side street* (Agility; Partial Heat +5, *Watched*) · *Let it pass*. A card, not a fight; it never sends anyone to the cells by itself |
| **Interaction with the run-in** | Separate rolls on separate events (reads and acts). A stop's Heat and *Watched* raise the next act's run-in (+5 / +15 by state, +10 *Watched*), which is the chain. A run-in in a bucket suppresses the patrol roll for fifteen minutes; a stop never changes the run-in's own chance except through Heat and the flag |
| **Absence** | Nothing rolls on a timer; nothing rolls with the app closed; a player who closes the app on rival ground at dusk and reopens at midnight gets one 12 % roll, not a stop. Nothing owned is ever at risk (§4.3) |

**The ticket tag** on rival ground at night reads ***Night · patrols out*** as before; the plate's danger line (§10.2) reads ***Risk here: Dangerous · patrols out · every tap can bring a run-in · Heat counts double · the cells put you on the train home***. `help.patrols`: *After dark on rival ground the streets are watched: every tap is likelier to bring a run-in, and now and then a patrol stops you just for being out. A stop is papers, a word or a side street, never a fight; your name taken means more Heat. Nothing you own is at risk, and nothing happens while you are away.*

**Why these numbers.** Twelve per cent a bucket is low enough that a quick visit at night usually passes, high enough that a player who works a whole night there meets the patrol more often than not; the cap of two keeps the card from becoming a tax; the fifteen-minute quiet after any trouble keeps two cards from landing back to back; the Heat and flag terms make the stop the consequence of being noticed, which is what a patrol is. Appendix C #101 carries the levers (the 12, the cap, the quiet).

### 16.2 The openings, round 2: no father (**D, E and G rejected by the user, 8 Oct 2026**: *"none of the stories make any sense… tables at a train station"*; the record stands; round 3 is §19)

The last round's three versions all hung on a dead man the player had never met in play; the user asked for a premise that stands on its own. Each version below gives **who you are** (a trade, a state), **why tonight** (something ends or starts at this station tonight), **why these three people** are on the platform and **what each wants from you** that only this player can give, tied to their party's politics. The mechanics are unchanged: **beat 1, whom you help is your party**; **beat 2, what you carry sets a stat** (+6 and +1); **beat 3 sets your long-term story** (the Ambition) and dresses you (a Tier I coat at CHA 5). Each version re-anchors the three Ambitions without the father; the ladder of *Finish His Work* (twelve chapters, three built, nine designed) survives in every one as a different person's climb, because its keepsakes are electoral documents and its chapters are rungs, not memories. Ids never change (`finish-his-work`, `clear-his-name`, `settle-his-debts`, `keep.*`, `outfit.fathers-coat`); only names and strings do.

**Common cost of any version:** `origin.ts` (three beats' strings), three order templates, three favour actions with four texts each, three welcome decks, three outcome headlines; the item names of `outfit.fathers-coat` and the three chapter-1 keepsakes; the three Ambitions' titles and premises; the scripts of the five built chapters (three chapter 1s, *Stand where he stood*, *The riverside house*) and the Letters rows; the strings of the designed chapters (*The deposit*, chapters 4–12, *The night foreman*, *The collector*) in `slice-7-nation.md` and `slice-8-life.md`; GDD §7.1 and §17.1; a content test that no player string contains *father*. Nothing in rules, schema, rewards, requirements or ids moves.

### 16.3 Version D — *The warrant* (demobbed, with nothing)

**Premise.** You are six years away: the war, then the camp, then the demob train that empties at Irongate Central at midnight with a cardboard case each, a suit that fits nobody, and **a railway warrant good for one journey anywhere in the republic** before the six o'clock trains. The address you had is the Bombed Blocks. The parties have tables at the barrier, because the demob train is where every party recruits; three people want your warrant to say their town.

**Beat 1 — *The barrier*** (`scene.station`; kicker *Irongate · Central Station · the demob train*)

> *The demob train empties at midnight: suits that fit nobody, a cardboard case each, a railway warrant good for one journey anywhere in the republic. The parties have tables at the barrier. Three people want your warrant to say their town.*

| Row | The ask | Line 1 · Line 2 |
|---|---|---|
| `holm` | **"The mill takes its men back Monday at the old rate unless we're at the gate with names. Use your warrant on the six o'clock to Coalport, stand with us at the gate, and the branch finds you a bed."** | Petra Holm · union organiser · Coalport · Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence |
| `stahl` | **"Your gratuity is three days' queue here and an hour in Duskwall, and the club has a bed and a trade for men who want order after what they've seen. The six o'clock; I'll sign your warrant."** | Viktor Stahl · steward · Duskwall · Iron Vanguard · order, discipline and a strong hand · +3 Strength |
| `grey` | **"Six years away and your name is on no roll in the republic. Ashford's closes Friday. The Rooms register the demobbed; I'll do yours on the six o'clock, and the first thing you do is vote."** | Thomas Grey · agent · Ashford · Civic Alliance · elections, courts and a free press · +3 Intelligence |

Under the rows: *One warrant, one town. Whoever signs it, you go with. Permanent: a Faction Reset token is the only way back.* Confirm: ***Go with Holm · the six o'clock to Coalport*** (and Stahl, Grey). Echo: *Your warrant says Coalport.* / *Duskwall.* / *Ashford.*

**Beat 2 — *The case***: *The six o'clock, the case on the rack, the suit on your back. {helper} asks what six years left you with, besides the suit.* Answers: **Tools, mostly. A trade travels.** (+6 STR, +1 INT) · **Books. The ones I could carry.** (+6 INT, +1 STR) · **Not much. I learned to run before I learned to carry.** (+6 AGI, +1 STR).

**Beat 3 — *Under the suit***: *In the case, under the suit, the three things you kept through six years. One of them is why you came back.* Answers: ***The names on the doors*** (hint *Who lived in the Blocks, floor by floor, before the bombs. Nobody speaks for them.*) · ***The camp letter*** (*A letter that reached the camp: the Blocks' leases, sold while you were away, and a name.*) · ***The chit*** (*Your gratuity, signed over for cash on the train to a man with a Clearwater address.*). **The demob suit** is worn from here on (`outfit.fathers-coat` renamed *The demob suit*, CHA 5).

**The favours** (slot B at the HQ; type `council`, 10 Energy): Collective ***Stand at the Mill Gate with the branch*** (*The gate at seven, the branch's list, your name on it first. Then the hall; there's tea. — P.H.*; Success *The owners' clerk reads the old rate off a board and the branch reads two hundred names back at him, yours first. Monday is not settled, but it is not his either.*; Partial *The clerk is late and the gate opens before the list is read. Half the names go in at the old rate. Holm writes yours in the branch book anyway, under Monday.*) · Vanguard ***Sign the club's book at Beacon House*** (*The club's book on my desk, the gratuity office next door. Your name in the one and your chit at the other, by noon. — V.S.*; Success *The gratuity office takes an hour, as promised, and the club's book takes a minute. "Thursday," says the clerk, which is the meeting, and nearly a welcome.*; Partial *The gratuity office wants a form the camp never gave you. The club's clerk enters your name in the day book and says Thursday, twice, and the form can wait.*) · Alliance ***Go on the roll at the Assembly Rooms*** (*The Ashford roll, the registrar's desk in the reading room, your demob papers. Your name, your address, the date right. — T.G.*; Success *The registrar reads the demob papers twice and writes you onto the roll in a fair hand. "That'll hold," says Grey. The first thing you do in Ashford is be allowed to vote.*; Partial *The registrar wants an address and the Rooms' hostel will do, in pencil. Grey initials it and writes your name in the Rooms' book under *roll*.*).

**The long story re-anchored.** *Finish His Work* → ***The Blocks*** (premise: *The Bombed Blocks were your street; the people on its doors have no one on any council. Speak for them, up to Parliament.*; chapters 1–12 as built and designed with the names changed: 1 *The names on the doors*, 2 *Stand for the Blocks*, 3 *The deposit*, 4 *The count*, 5 *Your seat*, 6 *The hall*, 7 *The cutting*, 8 *The rule*, 9 *The list*, 10 *The republic votes*, 11 *Twenty-five marks*, 12 *Under the Blocks' name*; keepsakes *The names on the doors*, *Your election bill*, *Your deposit receipt*, *The count sheet*, … *The Blocks' rosette*). *Clear His Name* → ***Who Sold the Blocks*** (the camp letter's name; the leases sold while the tenants were away; the Dossier and the exposé; ending: the buyer, now a senator; chapter 2 *The night foreman* becomes *The night watchman* at the Blocks, Brandauer kept as the name with no party). *Settle His Debts* → ***The Chit*** (the gratuity signed over; the Clearwater man holds your paper; chapters *The chit*, *The riverside house*, *The collector*, *The parcel* unchanged but for the marker's name). **Cost:** the common cost, plus the Bombed Blocks gaining the Ambition's scenes (the place exists; no art).

**For:** the strongest "who am I" (nothing, and a warrant); the asks are three things a demobbed person needs (work, money, a vote) read through three politics; the Alliance's *the first thing you do is vote* is the game's own first week. **Against:** the war is in the first line (a backstory, not the game's framing, but it is there); the Vanguard recruiting men off the demob train is accurate to the period and the most delicate row of any version; *The Blocks* ties the long story to the capital, so a Coalport player's chapters travel.

### 16.4 Version E — *After the count* (the ballot-box clerk) ▶ recommended

**Premise.** You are a counting clerk of the republic's electoral office: for years you have counted other people's ballots, for every party and none, and never cast one. Tonight the capital counted, and you counted it straight. The three parties' scrutineers walked you from the Town Hall to the station, because the office posts its clerks to the towns on Friday for the council cycle and your posting is your choice. Each wants the clerk who counts straight in their town, for a reason of their own. **Neutral is a job; tonight you quit it.** (Why tonight: the count ended at eleven and the office closed; the last train in is the first train out.)

**Beat 1 — *After the count*** (`scene.station`; kicker *Irongate · Central Station · after the count*)

> *After the count, the last train. You counted the capital's ballots tonight for the electoral office, as you have for years, for every party and none. The three scrutineers walked you to the station. Each wants the clerk who counts straight, in their town, by Friday.*

| Row | The ask | Line 1 · Line 2 |
|---|---|---|
| `holm` | **"The Coalport roll is two hundred names short of the men on the mill's books; somebody struck them. Come on the six o'clock and count it right before Friday's names go in. The branch pays a clerk's wage."** | Petra Holm · union organiser · Coalport · Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence |
| `stahl` | **"Duskwall counts on Thursday and the club wants a clerk at the table who can't be bought and won't be shouted down. The six o'clock, a desk at Beacon House, and the count done properly."** | Viktor Stahl · steward · Duskwall · Iron Vanguard · order, discipline and a strong hand · +3 Strength |
| `grey` | **"Ashford's roll has dead men on it and they all vote the same way. The Rooms want it audited before the poll, by someone the court will believe. The six o'clock; the Gazette prints what you find."** | Thomas Grey · agent · Ashford · Civic Alliance · elections, courts and a free press · +3 Intelligence |

Under the rows: *Neutral is a job. Tonight you quit it: whoever you count for, you go with. Permanent: a Faction Reset token is the only way back.* Confirm: ***Count for Holm · the six o'clock to Coalport*** / ***Count for Stahl · the six o'clock to Duskwall*** / ***Count for Grey · the six o'clock to Ashford***. Echo: *You'll count for the branch.* / *You'll count for the club.* / *You'll count for the Rooms.*

**Beat 2 — *The satchel*** (portrait `helper`): *The six o'clock. The office's satchel on the rack, your name still on the strap. {helper} asks what a clerk is good for, besides counting.* Answers: **My hands. I carried the boxes before I counted them.** (+6 STR, +1 INT) · **Figures. Give me a roll and I'll tell you who's missing.** (+6 INT, +1 STR) · **My legs. I ran the sheets between halls on count nights.** (+6 AGI, +1 STR).

**Beat 3 — *What you kept***: *In the satchel, under the tally boards, three things you should have handed in tonight. One of them is why you're on this train.* Answers:

| Id (unchanged) | Text | Hint | Sets |
|---|---|---|---|
| `ward-book` | **The struck roll.** | Two hundred names with a line through each, in a hand you know. | ***The Honest Count*** |
| `letter` | **The altered sheet.** | A tally changed after the seal, and the initials beside it. | ***The Altered Sheet*** |
| `marker` | **The receipt.** | For a ballot box you signed for and never saw again. A Clearwater address on the back. | ***The Box*** |

**The office coat** is worn from here on (`outfit.fathers-coat` renamed ***The office coat***, CHA 5: *the republic's clerk's coat, brass buttons, which you were told to hand in*).

**The favours** (slot B at the HQ; `council`, 10 Energy, difficulty 8):

| Party | Order | Ticket | Success | Partial |
|---|---|---|---|---|
| Collective | **Count the roll at the Union Hall** · *The Coalport roll and the mill's books, side by side on the hall's table. Every name that's in one and not the other, in your hand. — P.H.* | Count the roll | **Two hundred names back** · Two hundred names back on the roll by eleven, in your hand, with the mill's books beside them to prove it. Holm reads the first page and says nothing, which from her is a speech. | **A hundred and forty** · A hundred and forty names by noon; the rest are in a book the mill keeps locked. Holm writes your name in the branch book under *clerk* and says Friday. |
| Vanguard | **Take the table at Beacon House** · *The club's count is Thursday; today the membership roll, the tin and the ledger, and a clerk's hand on all three. Noon. — V.S.* | Take the table | **To the penny** · The roll, the tin and the ledger agree by eleven, which the clerk says they have not done since March. Your name goes on the list for Thursday under the word *table*. | **A slip short** · The tin is short a subscription and the roll long a name; you find both by noon. The clerk enters you in the day book and says Thursday, twice. |
| Alliance | **Audit the roll at the Assembly Rooms** · *The Ashford roll, the parish's burial book, a ruler and a pen. Every name in both, struck, initialled, dated. — T.G.* | Audit the roll | **Eleven dead men** · Eleven dead men voting, each with a burial date beside his name in your hand. Grey holds the page to the light. "That'll hold." The Gazette has it by four. | **Six, and a dispute** · Six dead men by noon and a page the registrar disputes. Grey files it, initials it, and writes your name in the Rooms' book under *audit*. |

Welcome decks: *…the Coalport roll wants counting at the Union Hall; start there.* · *…the club's table wants a clerk at Beacon House; start there.* · *…the Ashford roll wants auditing at the Assembly Rooms; start there.* Outcome headlines as the table.

**The long story re-anchored.** *Finish His Work* → ***The Honest Count*** (premise: *You counted the republic's votes for years and never had one counted for you. Climb from a struck roll to a seat in Parliament, and have your name read out.*; **every chapter survives with its title nearly intact**, because its keepsakes are already the documents of a count: 1 *The struck roll* (the built *His ward book*: two hundred names, the choice *show the branch / keep it*, the step *Three names*, the check unchanged), 2 *Stand on your own name* (*Stand where he stood*; keepsake *Your election bill*), 3 *The deposit*, 4 *The count* (the chapter in which the counter is counted), 5 *Your seat*, 6 *The hall*, 7 *The cutting*, 8 *The rule*, 9 *The list*, 10 *The republic votes*, 11 *Twenty-five marks*, 12 ***Under your own name*** (keepsake ***Your rosette***, Legacy 30); the keepsakes *The struck roll*, *Your election bill*, *Your deposit receipt*, *The count sheet*, *The minute book*, *Your ballot stub*, *The cutting*, *Your rule, in draft*, *The letter from the list*, *Your polling card*, *The list's receipt*). *Clear His Name* → ***The Altered Sheet*** (premise: *A tally changed after the seal, in a hand you know. The man who held the pen is rising. Prove it before he is a senator.*; the Dossier, Case Files and the exposé as before; chapter 2 *The night foreman* becomes ***The night clerk*** — the returning officer's clerk, Konrad Brandauer kept as the Coalport name with no party; chapter 3 *The archive*; the Mill Fire of '19 goes). *Settle His Debts* → ***The Box*** (premise: *A ballot box you signed for never came back, and the people who have it have your signature. Pay, betray or take them over.*; chapters *The receipt* (the built *The marker*, the man in the good coat now holding *a copy of your receipt*), *The riverside house*, *The collector*, *The parcel*, unchanged but for the names). **Cost:** the common cost only; nothing moves city.

**For:** the stake is the player's own and it is **the game's own stake** (rolls, counts, ballots); the three asks are one skill applied three ways by three politics (a struck roll, a table that can't be bought, a roll of dead men), each a real job for the next morning; the long story's keepsakes were electoral documents already, so chapters 4–12 survive with their titles and the ending *Under your own name* is earned by a person who spent years counting other people's names; the coat you were told to hand in is a better coat than a dead man's; the Vanguard's row is the most policy-safe of any version written (a clerk at a table). **Against:** a clerk is a quieter person to be than a soldier or a refugee; the premise asks the player to accept that the office lets clerks choose their posting (one line carries it).

### 16.5 Version G — *The frontier train* (papers that don't quite work)

**Premise.** You came over the Pass tonight on the frontier train, which ends at Irongate Central, and so do your papers: issued by an office that no longer exists, in a name that is yours. The capital's registry closes your case at nine tomorrow and does not reopen it. Three people meet this train every night for people like you, because each party has a way to make papers good in its own town, and each wants to be the one you owe.

**Beat 1 — *The frontier train*** (`scene.station`; kicker *Irongate · Central Station · the frontier train*)

> *The frontier train ends at Irongate Central, and so do your papers: issued by an office that no longer exists, in a name that is yours. The registry closes your case at nine tomorrow. Three people meet this train every night, for people like you.*

| Row | The ask | Line 1 · Line 2 |
|---|---|---|
| `holm` | **"The union hostel in Coalport registers anyone who'll work the mill, and the mill asks no office for a stamp. A bed tonight, a card tomorrow, and the six o'clock gets you there before the registry opens."** | Petra Holm · union organiser · Coalport · Red Collective · … · +2 Strength, +1 Intelligence |
| `stahl` | **"The frontier office answers to the club in Duskwall, and a customs stamp tonight outranks a registry tomorrow. Order has its uses. The six o'clock; I'll vouch at the Fortress Gate myself."** | Viktor Stahl · steward · Duskwall · Iron Vanguard · … · +3 Strength |
| `grey` | **"A closed case can be appealed, and the Rooms' legal-aid desk files appeals before nine. Yours needs a witness and a town, and Ashford will do. The six o'clock, and sign nothing before I've read it."** | Thomas Grey · agent · Ashford · Civic Alliance · … · +3 Intelligence |

Under the rows: *Whoever makes your papers good, you go with. Permanent: a Faction Reset token is the only way back.* Confirm: ***Go with Holm · the six o'clock to Coalport*** (and Stahl, Grey). Echo: *The branch will stamp your papers.* / *The club will stamp your papers.* / *Grey will file your appeal.*

**Beat 2 — *The case***: *The six o'clock. One case, which crossed with you, lighter than it was. {helper} asks what you brought over, besides the name.* Answers: **Tools, mostly. A trade travels.** · **Books. The ones I couldn't leave.** · **Not much. You learn to run before you learn to carry.** (+6 / +1 as always).

**Beat 3 — *In the lining***: *Sewn into your coat, where the frontier guards didn't look, three papers. One of them is why you crossed.* Answers: ***The old passport*** (*Your name as it was, and a photograph of someone younger.* → ***Under Your Own Name***) · ***The registry's stamp*** (*From the office that burned, dated the week before it did.* → ***The Office That Burned***) · ***The crossing's price*** (*What you owe the man who got you over, and the Clearwater address.* → ***The Crossing***). **The coat you crossed in** is worn (`outfit.fathers-coat` renamed, CHA 5).

**The favours:** Collective ***Register at the hostel through the Union Hall*** (*The hostel's book is at the hall; your name in it and the mill's card by noon. Then tea. — P.H.*) · Vanguard ***Have the club vouch at Beacon House*** (*The club's letter to the frontier office, on my desk, wants your name and mine. The clerk has the form. — V.S.*) · Alliance ***File the appeal at the Assembly Rooms*** (*The appeal, the reading room, the witness line. Read it first; then your name, and the date right. — T.G.*); outcome texts in the §1 favours' shape, written with the build.

**The long story re-anchored.** *Finish His Work* → ***Under Your Own Name*** (premise: *Papers that don't quite work, and a name that does. Make it good the long way: a vote, a seat, a chamber that reads it out.*; chapters 1–12 as the ladder, renamed: 1 *The old passport*, 2 *Stand on the name*, … 12 *Under your own name*). *Clear His Name* → ***The Office That Burned*** (who burned the registry that issued your papers, and why; the Dossier and the exposé; the culprit now a senator). *Settle His Debts* → ***The Crossing*** (the man who got you over holds the price; the Clearwater syndicate; pay, betray or take over). **Cost:** the common cost, plus one new Dossier name (the registry's clerk) in `people.ts`.

**For:** the most 1946 of the three and the best noir line (*in a name that is yours*); three politics in three stamps (solidarity, order, law); the ending *Under your own name* lands hardest here. **Against:** a nationalist party making a border-crosser's papers good is the row most likely to read wrong whatever its words (it is written as the club buying a debt, not a kindness, and it is still the row a reviewer will stop on); the premise is about papers, not about the game's verbs, so the first week's canvassing is a job you took rather than the thing you came for.

### 16.6 The pick (superseded: all three rejected; see §19)

**▶ Default: version E, *After the count*.** It is stronger than the last round because the stake is the player's own, not a dead man's, and it is the stake the game is made of: the person who counted everyone's votes and never cast one chooses a side on the night of a count, and the long story ends with their own name read out in Parliament. The three asks are the same skill asked for by three politics, each a real piece of work the next morning at the HQ, and the Vanguard's is a clerk at a table. It is also the cheapest re-anchor: the twelve chapters of the ladder keep their titles and keepsakes with a pronoun changed, because they were electoral documents all along. D is a close second (the strongest first line; the war in it, and the demob-train Vanguard row, are the reasons it is second). G is the best-written row of the three and the riskiest.

### 16.7 Changes to the fix list

- **Item 9** becomes: **(user) The opening, version D, E or G** (§16.3–16.5). *Done when* the chosen version's three narratives, nine row strings, three confirms, three echoes, three beat-2 answers, three beat-3 answers with hints, three order templates, three favour tickets with their four texts, three welcome decks and three outcome headlines are in content; the coat item and the three chapter-1 keepsakes carry the version's names (ids unchanged); the three Ambitions' titles and premises and the five built chapters' strings are rewritten as the version says; a content test finds no player string containing *father*; every text ≤ 240 and four sentences; the Vanguard strings pass the policy regex; the reference answers (`holm · books · ward-book`) still give STR 8 / INT 12 / AGI 5 / CHA 5 and the first Ambition.
- **Item 10** is **decided**: build the header and the prize as §10.2–10.3.
- **Item 11** is **decided**: build the six-hour day as §11.3.
- **Item 12** is **decided with §16.1**: the *Patrol* card rolls at 12 % (+5 / +10 by Heat state, +10 *Watched*, −10 *Warned*, ×2 under the Curfew Order, 5–40) once per ten-minute bucket per city on a city read at night on rival ground, never within ten minutes of arrival, fifteen minutes of a stop or a run-in, at most two a night per city; *Done when* a test with a seeded clock rolls once per bucket, never on an act, never while held or in transit, never with no read, caps at two, and a Cool clean player's stop passes *Show your papers*.
- **Designed chapters** (`slice-7-nation.md` §13, `slice-8-life.md` §8 and §16) are re-strung when the version is picked; no number in them moves.

---

## 17. The result modal that fits (8 Oct 2026, after the build of §4; decided)

### 17.1 What the screenshots show

With the picker in a sheet and the picture, the stamp and the buttons fixed, the middle still overflows: an ordinary ×1 result by **303–358 px at 390 × 740** and **74–121 px at 1440 × 900**; a mission with a level-up by 255 / 151 / 61 px (390 × 740, 390 × 844, 1440 × 900). The height goes on five things, in order: a 150 px picture; the *How it went* section printing a row the stamp already prints (*1 · Success · +45 XP*); three bonus tags as three boxed lines; a receipt whose every line has a note and two have bars; a knock-on block that prints every line it has.

### 17.2 The compact layout (all sizes; the phone budget in brackets)

Top to bottom, one rule each:

1. **The picture:** **112 px on phones under 800 px tall, 136 px up to 900, 150 px above** (the 2688 × 1520 scene cropped to the width, the stamp at 80 % on the short crops, the place line *COALPORT · MILL GATE · 14:16* in the picture's bottom band as now). [112]
2. **The title block:** kicker, headline (Playfair **22 px** on phones, 24 on desktop), the body at 15 / 22 px, at most 240 characters (five lines at 390 px). [≈ 172 with its gaps]
3. ***How it went* is printed only when it says something the stamp does not:** for a **×1 Success it is omitted** (the stamp says *Success*, the receipt says the XP); for a **×1 Partial or Failure** the section is **one italic reason line under the body** (*Bad luck. The odds were good; it just didn't come off. Try again.*; no kicker, no row); for a **×3** it is **one Courier line** of the rows, ***1 · Success · +45 · 2 · Partial · +23 · 3 · Success · +45***, then the reason line if any; a run-in's block stays as built (it is the thing that happened). [0 / 40 / 64]
4. **Bonus tags as one line:** Oswald caps 10 px, no boxes, joined with *·*: ***Party order · +25 % Party XP · First day in Coalport · better odds · Issue · opinion +50 %***; when it would wrap, the line is cut at the last whole tag that fits and ends ***· +1 more*** (the rest in *Details*). The tag's note opens on a tap of its words, as the chips did. [20]
5. **The receipt, four lines at most** (XP, Party XP, Iron, opinion; a zero line is not printed, as before; **a fifth, the item or keepsake line, stays when a result carries one**: chapter results only, outside the measured cases; settled §18): **XP and Party XP keep their bar and their one Courier note** (*955 to Level 7* · *8 / 400 to Activist*: the HUD in miniature); **Iron and opinion are one line each**, label left, value right, **no note**. Everything else the receipt said moves into ***Details***: the base-and-bonus breakdown (*+6 and +2 bonus · party order*; *Rested: 3 of 10 Energy, +15 % XP and Iron*), the opinion's meter and Issue line (*Issue: Men at the Labour Exchange +50 % · Collective 70.1 → 70.3 %*), the tags that were cut, the ×3 rows' XP. *Details* is a Courier text row at the receipt's foot, right-aligned, ***Details ▾***, expanding in place (the middle may then scroll; the player asked for it). [16 + 44 + 44 + 28 + 28 + 20 = 180]
6. **Knock-on lines capped at three**, in this priority, each one line (Courier 12) unless it is a card: **a point to place** (the *Place it* line, 48 px, counts as one) · **a rank-up or a Reputation step** (its card; the first-time Heat card likewise) · **Heat** (*Heat +8 → 32 · Noticed · Cool at 20:40*) · **the order's signed line or progress** · **Issue momentum** · **the election / ledger line** · **the chapter hook** · **Energy and Rested before → after** · ***Missions remember: next time, one tap*** (the first mission only). After the third: ***n more ▾***, a text row that expands in place. Nothing is dropped; the fourth and later lines are behind the row. [16 + 3 × 24 = 88; with *Place it* 112]
7. **The buttons** as built: the pair side by side with the cost on a second line, *Continue* under them. [108]

Phone budget at 390 × 740, ×1 Success: 112 + 172 + 0 + 20 + 180 + 88 + 108 + 40 (paddings and rules) = **720**. A mission with a level-up: 112 + 172 + 0 + 20 + 180 + 112 + 108 + 40 = **744**: four pixels over, taken from the paddings (the kickers *REWARDS* and *KNOCK-ON EFFECTS* lose their 8 px top gap on phones under 800 px). A ×1 Partial with a reason: 760 → the rule below.

### 17.3 The rule, restated

- **Never scrolls:** a ×1 Success, and a mission result with a level-up, at **390 × 740** and on **every desktop** (1440 × 900 has ~150 px to spare under the layout above; 1024 × 520 is a sideways phone and follows the phone rule).
- **A short scroll is accepted on a 740 px phone** (at most **about 100 px** of the middle, the picture and the buttons fixed) for a **×3**, a result **with a reason line**, or a **run-in**; never on phones of 844 px and above. The thin bar of §4.2 shows it.
- *Details* and *n more* may scroll the middle anywhere, by the player's own tap.

**Where:** `ResultModal` (`packages/ui`), `Receipt` (the fold), the tags line, the knock-on cap; `copy.result.details`, `copy.result.more(n)`; no rule in the GDD changes (§13.1a gains one sentence); the slice-3 receipt design (`review-3-answers.md` §3) is superseded by §17.2's item 5 for the notes.

**Fix-list item 2 becomes:** *Done when* a ×1 Success and a mission with a level-up fit 390 × 740 and 1440 × 900 without a scroll bar; a ×3 or a Partial scrolls at most 100 px at 390 × 740 and nothing at 390 × 844; the picture is 112 / 136 / 150 by height; the tags are one line with *+n more*; the receipt prints no note under Iron or opinion and *Details* opens the breakdown; the knock-on block shows three lines and *n more*; Playwright measures the five cases of §17.1.

---

## 18. Settled with the architect (8 Oct 2026; `docs/tech/review-5.md` §21.1 and §22)

Fourteen questions, each with the architect's default; eleven take the default, two are given text here (Q5, Q6), one is confirmed with the economy sheet corrected (Q9). The §22 doc notes are all fixed in place (§18.4).

| Q | Decision |
|---|---|
| 1 | **Default.** The night rate is the tag ***Night rate · +25 % Iron*** on the tags line; its part (*+15 · night rate*) in *Details*. §12.1 and GDD §13.1 reworded |
| 2 | **Default.** The item or keepsake line stays on the receipt when a result carries one (chapter results only); §17.2 item 5 says so |
| 3 | **Default**, the order of §4.1 in the tech doc: the morale crossing and *all three done* go with the order's line; the record line goes with Heat; a trained stat is first on a *Trained* result; the branch's endorsement, PC and Reputation progress after the Issue line, before the election line; the item never in the knock-on block (it is on the receipt) |
| 4 | **Default.** Group by gate and need, print the two lowest groups (*2 more from Level 8 · 1 from Level 10*), Reputation as *from Known here*; members-only, own-target and record bars never counted |
| 5 | **Text given** (§18.1): one street per rival home city (`cities[].patrol.street`: Coalport *Foundry Row*, Duskwall *Rampart Row*, Ashford *Weavers' Row*; the kicker *A PATROL · FOUNDRY ROW*), and the rows' six outcome texts and the ignore line |
| 6 | **Text given** (§18.2): the twelve outcome texts of the four night missions |
| 7 | **Default: no.** Rival ground does not double the patrol card's Heat; +10 and +5 are final, like the checkpoint card's |
| 8 | **Default: yes.** A pending patrol card holds Energy acts and boarding until a row is tapped and never resolves itself; the paper, the Me tab and every political act work meanwhile; the refusal reads *A patrol has stopped you · answer it on the map* |
| 9 | **Default, per city**, and **economy §25.3 corrected**: a member has two rival home cities, so the prize can pay at most **100 a week**, only when both towns enter Unrest in the same seven days (about ten rival-ground days of two parties' Energy); in practice 50. GDD §14.11 and Appendix C #102 say *per city* |
| 10 | **Default**, the top three of the reader's party; **the three decks written** (§18.3) |
| 11 | **Default: accepted.** A tap refused `PATROL_PENDING` shows the §18 Q8 message on its sheet, with the card on the map |
| 12 | **Default.** Quiet until `arrivesAt + 10 min`, the arrival modal open or not |
| 13 | **Default.** In the capital *What's here* is the district the sheet is opened on; the plate is per district |
| 14 | **Default.** `Location.treatment.carer`: *matron* in the three home infirmaries, *sister* at St Agnes; **Clearwater's Sanatorium: *nurse*** (*See the nurse*; the modal's body *The nurse does it in ten minutes and the clerk charges for twenty. Mind the step.*) |

### 18.1 The patrol card (`patrol.stop`, `deck: 'patrol'`; kicker *A PATROL · {street}*)

| Field | String |
|---|---|
| `title` | **A patrol** |
| `setup` | *Two of them under the corner lamp, with the walk of men paid by the hour. "Late to be out. Papers."* |
| `papers` *Show your papers* · detail | *Your party card · it depends on your Heat and your record* |
| `papers.success` | **Waved on** · He reads the card by the lamp, then your face, and hands it back. "Mind how you go." They walk on, slowly, so that you have to walk the other way. |
| `papers.partial` (Heat +10, *Watched*) | **They write your name down** · He reads the card twice and writes something in a book, slowly, so you can see him do it. "Visiting, are we." The lamp stays on you to the corner. |
| `talk` *Talk your way past* · detail | *Charisma* |
| `talk.success` | **A lodger, late back** · You've a room at the inn and a landlady who locks the door at twelve, and you say so as if it's their fault. The taller one laughs. They let you by. |
| `talk.partial` (Heat +5) | **Half believed** · They take the story, the accent and the hour, and the shorter one writes your name down anyway, to be safe. "Straight home, then." |
| `slip` *Slip down a side street* · detail | *Agility* |
| `slip.success` | **A door closing** · You know the lane behind the lamp better than they do, or you walk as if you do. By the time the lamp swings round the corner you are a door closing. |
| `slip.partial` (Heat +5, *Watched*) | **A yard with a wall** · The lane is a yard with a wall. You get over it with the lamp on your back and a name shouted after you, which means they have it. |
| `ignore` (*Let it pass*; Heat +10, *Watched*) | You stand still and say nothing. They write your name down anyway, and the lamp follows you to the corner. |

The streets: `coalport.patrol.street = 'Foundry Row'`, `duskwall … 'Rampart Row'`, `ashford … 'Weavers' Row'` (each city's `street`-kind place; the kicker prints it in caps). Every body ≤ 240 and four sentences; no party is named (the pool decides who the men are).

### 18.2 The four night missions' outcome texts (≤ 240, four sentences)

| Id | Success | Partial | Failure |
|---|---|---|---|
| `coalport.customs-house.lorry` | **The yard behind the Anchor** · The lorry takes the long way round the basin and turns in at a yard behind the Anchor, where a man with a lantern counts it in. The yard, the man, the time: the notebook's best page. The quay's owner owns the Anchor too. | **Lost at the bridge** · You keep the lorry to the swing bridge, which opens for a barge and closes with you on the wrong side. One street name and the lights going north. Another night, from the bridge end. | **A lorry is a lorry** · It stops at the first corner and the driver gets out to look at you, long enough to be sure. Then it goes, unhurried, somewhere you aren't. You walk home by the lit streets. The sheds have your face. |
| `duskwall.checkpoint.log` | **A week of the Pass** · The log is a school exercise book in the night clerk's hand, and a week of the Pass is in it: who crossed, when, who was turned back and why. It is in your coat before the stove needs feeding. | **Three pages** · The clerk comes back for his tobacco and you get three pages, torn clean, before the window. Thursday to Saturday, and a name the club will miss on Friday. The rest stays by the stove. | **The stove goes out** · The stove goes out and the clerk comes to see why, with the lamp. You are gone by the time he reaches the window, and the book is where it was. The Pass has your face now. |
| `ashford.brewery.dawn-shift` | **Four hundred readers** · The watchman does his round at four, the gate is bare at five and yours by ten past. Four hundred men read it at the dawn shift, and the dray horses after. The Rooms' man comes with a bucket at seven and finds he is the news. | **Half the gate** · You get the left-hand gate pasted before the watchman's lamp comes round the stables, and leave by the hop store. Half the gate is yours. The shift reads both halves and argues. | **The paste won't take** · Wet night, cold paste, and the posters slide off the gate in sheets the size of a tablecloth. The watchman finds you on the second. You walk out past the stables with the bucket. The gate says what it said. |
| `irongate.tram-junction.last-tram` | **The whole car** · A flyer for every stop and a word for every face, and by the Iron Bridge the whole car is reading. The conductor takes one for his wife. Two hundred people get off in Eastside with your side in their pockets. | **Half a car** · The front half of the car takes flyers and the back half takes offence, and the conductor rings for the bridge before it comes to anything. A hundred flyers out and a hundred still in your coat. | **Off at the bridge** · A man in the back seat wants to know who printed it, loudly, and the car takes his side. The conductor stops at the bridge and says this is your stop. The flyers go out of the window behind you. |

Outcome headlines for the paper's *In Print* line, where a mission prints one: the Success and Partial headlines above.

### 18.3 The prize decks (`hl.unrest-pushed`, `hl.v.unrest-pushed`, `hl.a.unrest-pushed`; `{city}`, `{party}` the home party, `{top}` the reader's party's top three; decks ≤ 200)

| Paper | Headline | Deck |
|---|---|---|
| The Clarion (Collective) | **{city} Wobbles: the Branch Pushed Hard** | The {party}'s share of its own town fell under 60 overnight. {top} did the heaviest carrying. The Collective's work there pays three quarters more while it lasts. |
| The Sentinel (Vanguard) | **{city} Under Sixty** | The {party}'s town is in Unrest this morning. {top} are named by the district office for their part. Work there pays more until the town settles, which it will not do on its own. |
| The Gazette (Alliance) | **{city} in Unrest: the Rooms' Callers Did It** | The {party}'s share of its home town fell under sixty. {top} knocked the most doors. Every Alliance act there pays three quarters more while it lasts. |
| The Herald and the local line (neutral, `cityId: '*'`) | **{pushingParty} Callers Push {city} into Unrest** | The town's share fell under 60 overnight. {top} did most of the pushing; the {party}'s branch has dropped everything to win it back. |

### 18.4 The §22 doc notes, fixed in place

1. GDD §2.2's old night bullet is struck through and marked superseded; the clock's help note no longer prints *{nightFrom} to {nightTo}*; §14.12's slice-8 paragraph reads *§2.2's night* in place of *20:00–06:00 UTC*.
2. Fix-list item 12's *Done when* rewritten to the bucket roll and the ten minutes after arrival (§15).
3. The night rate's wording: §12.1 and GDD §13.1 (Q1).
4. The receipt's item line: §17.2 item 5 (Q2).
5. The unranked knock-ons: Q3 above, in the §4.1 order.
6. `slice-2-cities.md` §1.3 and §2.3 Driver rows print **240** *(was 200 until review 5)* in place; the same in `slice-1-content.md` §3 and §12.1, `slice-4-battleground.md` §4.4 and §4.5, `slice-7-nation.md` §9.4. The content tests that read 200 (`load.test.ts`, `qa.content.test.ts`) are the developer's to move with the data.
7. Economy §25.3: the cap is per city, at most 100 a week across both rival towns (Q9).

---

## 19. The opening, round 3: *Coming home* (8 Oct 2026; one version, from the main session)

**The user rejected D, E and G** (*"none of the stories make any sense… coming back from the war is good but tables at a train station wtf?"*). What they liked is the direction of D; what broke every version so far is the device: three party people waiting on a platform for one stranger. This version keeps the logic the user set out and drops the device. **The three people are in the hall for their own reasons, and the player's three problems come from the clerk, not from them.**

### 19.1 The premise

Spring 1946. The player is demobbed after years away: the war, then a camp. The demob trains end at Irongate Central, and nobody goes home without a stamp from the **demobilisation office**, which is a real place: a hall with queues, clerks and rubber stamps, open nine to four. On the second morning home the player reaches the counter, and the clerk gives them three pieces of news without looking up: **the mill they left has been sold and the job with it; the discharge papers are missing a stamp, which means six weeks with no pay; the family flat was requisitioned and given to someone else.** Three people work that hall every day because that hall is where those three problems arrive: a union organiser signing up men off the trains, the League's welfare desk, and a legal-aid lawyer taking housing cases. The player can chase **one** problem today. That one is their party and their town.

Nothing a stranger need know: a demob office, a lost job, a missing stamp, a lost flat, and three people whose job is one of those three things.

### 19.2 Beat 1 — *The counter* (`origin.step-platform`, id kept; kicker *Irongate · the demobilisation office · the second morning home*; art `scene.ministry`, §19.7)

> *The demobilisation office, the second morning home. You reach the counter at eleven with a kitbag and your papers, and the clerk gives you three pieces of news without looking up. The mill is sold. The stamp is missing. The flat is gone.*

The three rows (the portrait at the left; the title is the ask; line 1 says who they are and why they are in this hall; line 2 is the party line and the bonus, as built):

| Row | The ask | Line 1 | Line 2 |
|---|---|---|---|
| `holm` | **"Your mill's sold, but Coalport's rehires on Monday, union men first. Put your name on my sheet now and you've a place at the gate and a bed at the union hostel tonight. The six o'clock to Coalport."** | Petra Holm · union organiser · at the bench by the door, signing up men off the trains | Red Collective · the mill and the docks against the men who own them · +2 Strength, +1 Intelligence |
| `stahl` | **"No stamp, no pay, and this office takes six weeks. The League in Duskwall sees to its men: the stamp by Thursday, the pension after, and a bed at the League's hostel till then. The six o'clock; I'll put you on the list."** | Viktor Stahl · the Duskwall League's welfare desk · stamps, pensions and a bed for men coming home | Iron Vanguard · order, discipline and a strong hand · +3 Strength |
| `grey` | **"A requisition can be appealed, and Ashford's court hears housing cases this week. I need your discharge papers, the flat's address and your signature today; the Rooms file on Thursday. The six o'clock to Ashford."** | Thomas Grey · legal-aid lawyer · at the end of the counter, taking housing cases | Civic Alliance · elections, courts and a free press · +3 Intelligence |

Under the rows (Courier): *One of these today. The other two will keep, or they won't. Whoever you go with, you go with: a Faction Reset token is the only way back.*

Confirm: ***Go for the work · the six o'clock to Coalport*** / ***Go for the stamp · the six o'clock to Duskwall*** / ***Go for the flat · the six o'clock to Ashford***. Echo on beat 2: *You went for the work.* / *You went for the stamp.* / *You went for the flat.*

### 19.3 Beat 2 — *The kitbag* (`origin.step-suitcase`, id kept; kicker *The six o'clock to {city} · the compartment*; art `scene.train-compartment`; portrait `helper`)

> *The six o'clock, the kitbag on the rack. Everything you own is in it, and it still isn't heavy. {helper} asks what a person brings home from four years.*

| Id | Answer | Effect | Echo |
|---|---|---|---|
| `tools` | **Tools. I kept the workshop's kit when the workshop went.** | +6 STR, +1 INT | You brought tools. |
| `books` | **Books, from the camp library. They let us keep those.** | +6 INT, +1 STR | You brought books. |
| `light` | **The boots I walked out in. Two hundred miles, and they still fit.** | +6 AGI, +1 STR | You brought the boots. |

### 19.4 Beat 3 — *The post* (`origin.step-lining`, id kept; kicker *The same compartment · the office's post*; portrait none)

> *The office held post in your name since the autumn: three envelopes, handed over with the bad news, which you open on the train. A list, an order, a torn page. One of them is why you'll stay.*

| Id (kept) | Text | Hint (Courier) | Sets |
|---|---|---|---|
| `ward-book` | **The unit's list.** | Forty names in your hand, and the town's memorial being cut without them. | ***The Names on the Stone*** + `outfit.fathers-coat` renamed ***The demob suit*** (Tier I, CHA 5), worn |
| `letter` | **The requisition order.** | The flat, the date, and a signature you can read. | ***Who Sold the Homes*** + the suit |
| `marker` | **The ration page.** | A year of rations drawn in your family's name after they were gone. Somebody ate them. | ***The Ration Ledger*** + the suit |

Then the welcome edition and the first landing on the HQ's pin with the favour's ticket highlighted, as built.

### 19.5 The favours (slot B of the welcome set at the HQ; `use: 'welcome'`, type `council`, 10 Energy, difficulty 8; each follows from the beat-1 problem)

| Party | Order (`dir.welcome-b`, `dir.v.welcome-b`, `dir.a.welcome-b`) | Ticket | Success | Partial |
|---|---|---|---|---|
| Collective | **Sign on at the Union Hall** · *The rehiring sheet, at the hall, before Monday's gate. Your name, your trade, the years. Then tea. — P.H.* | Sign on | **Union men first** · The sheet is a school exercise book and your name goes in it under forty others, with the trade and the years. "Monday, seven, the gate," says the man at the table. "Union men first." There's tea. | **The second page** · The first page is full and the second is for men without a card, which is you till Monday. He writes you in pencil and says come early. The tea is cold. |
| Vanguard | **Get the stamp at Beacon House** · *Your discharge papers on the clerk's desk by ten. The League's letter goes with them to the office at eleven; the stamp comes back Thursday. — V.S.* | Get the stamp | **Thursday, stamped** · The clerk reads your papers, writes the League's letter in a fair hand and pins the two together. "Thursday," he says, "and the pension office after." Your name goes in the League's book under the word *stamp*. | **A form the camp never gave you** · The clerk wants a form the camp never issued, and writes to say so. Thursday becomes next week. He enters your name in the day book and says the bed is yours till then. |
| Alliance | **File the appeal at the Assembly Rooms** · *The requisition order, your papers, the flat's address, the reading room's desk. Read it; then your name, and the date right. — T.G.* | File the appeal | **Filed** · Grey reads the order twice, writes the appeal in a hand that counts words, and you sign it under his. "Thursday," he says, "and they'll hate it." The Rooms' book has your name under *housing*. | **A copy is missing** · The order's second copy is in an office that shuts at four, and the appeal goes in with a gap where it should be. Grey files it anyway and writes your name in the Rooms' book, in pencil. |

**Welcome decks** (the welcome headline's second sentence): *…the rehiring sheet wants your name at the Union Hall; start there.* · *…your papers want the League's letter at Beacon House; start there.* · *…the appeal wants your signature at the Assembly Rooms; start there.* **Outcome headlines** for the paper: the Success and Partial headlines above. Slot A (two attempts at a political action by the best stat) and slot C (*Take a job*) are unchanged.

### 19.6 The long story, re-anchored (no father; the ladder, its numbers and every id kept)

| Was | Now | Premise | Systems | Ending |
|---|---|---|---|---|
| *Finish His Work* (`finish-his-work`) | ***The Names on the Stone*** | Forty of your unit didn't come home, and the town is cutting its memorial without them: the council says they weren't the town's own. Get the names on the stone, and that takes a seat. | Campaigning, offices, speeches (unchanged) | A law for the republic's memorials, and the names read out in Parliament |
| *Clear His Name* (`clear-his-name`) | ***Who Sold the Homes*** | Requisitioned flats were given away while their people were away, and somebody was paid for each one. The signature on your order belongs to a man who is rising. | Dossier, Case Files, exposés (unchanged) | Expose him, now a senator |
| *Settle His Debts* (`settle-his-debts`) | ***The Ration Ledger*** | A year of rations drawn in your family's name after they were gone, by a ring that ran the ration books from Clearwater. They want the page back, and they have a price for your silence. | Iron, Heat, the Black Market, patrons (unchanged) | Pay, betray or take over the ring |

**The ladder of *The Names on the Stone*** (chapters, requirements, difficulties, rewards unchanged from §17.1; titles and keepsakes renamed; `keep.*` ids kept):

| Ch | Title | Keepsake |
|---|---|---|
| 1 | *The unit's list* (the built *His ward book*: the choice *show the branch / keep it*; the step *Three names* becomes three families to knock on; the check unchanged) | *The unit's list* |
| 2 | *Stand for the stone* (first ballot) | *Your election bill* |
| 3 | *The deposit* (Rank 3) | *Your deposit receipt* |
| 4 | *The count* | *The count sheet* |
| 5 | *Your seat* (Rank 4) | *The minute book* |
| 6 | *The hall* | *Your ballot stub* |
| 7 | *The cutting* (a Case File) | *The cutting* |
| 8 | *The stone's rule* (a Governor's term or three council terms: the council rule that cuts the names) | *The rule, in draft* |
| 9 | *The list* (Rank 5) | *The letter from the list* |
| 10 | *The republic votes* | *Your polling card* |
| 11 | *Twenty-five marks* | *The list's receipt* |
| 12 | *The names read out* (a term as a deputy begun) | ***The memorial ribbon*** (wearable, CHA 5; the rosette renamed; a plain black ribbon, no device) · Legacy 30 |

*Who Sold the Homes*: chapter 1 *The requisition order* (the built *The prison letter*: the lamp / the branch choice; the reading-room check becomes the housing office's register), chapter 2 *The night caretaker* (the built *The night foreman*: the block's caretaker; Konrad Brandauer kept as the Coalport name with no party), chapter 3 *The archive* (a Case File). *The Ration Ledger*: chapter 1 *The ration page* (the built *The marker*: the man in the good coat holds *a copy of the page*), 2 *The riverside house*, 3 *The collector*, 4 *The parcel*, unchanged but for the names. The Mill Fire of '19 goes.

**Cost:** the common cost of §16.2 (strings only: `origin.ts`, three order templates, three favours, three welcome decks, three outcome headlines, the item and keepsake names, the three Ambitions' titles and premises, the five built chapters' strings, the designed chapters' titles in `slice-7-nation.md` §13 and `slice-8-life.md` §8/§16, GDD §7.1 and §17.1, a content test for no *father*). Ids, rules, rewards and requirements do not move; the reference answers (`holm · books · ward-book`) still give STR 8 / INT 12 / AGI 5 / CHA 5 and the first Ambition.

### 19.7 Art (checked against `mvp/scenes`)

- **Beat 1:** `scene.ministry` (exists: a counter hall, clerks stamping, a queue with cases, a clock) **stands in and reads as the demob office**; the kicker names the office. **Optional, not blocking:** a dedicated **`scene.demob-office`** (2688 × 1520, the same lithograph grain): a longer queue of men in ill-fitting suits with kitbags, a counter of stamps, a *DEMOBILISATION — DISCHARGES · PENSIONS · HOUSING* board in the republic's plain lettering, no flag, no insignia, no uniform. Alt text: *A crowded office hall at eleven: a long counter, clerks with rubber stamps, a queue of men in new suits with kitbags, a clock.*
- **Beats 2–3:** `scene.train-compartment` (exists).
- **The favours' modals:** the HQ scenes (`scene.union-hq`, `scene.vanguard-office`, `scene.alliance-hq`; exist).
- **The three portraits:** `holm`, `stahl`, `grey` (exist). No other art.

### 19.8 Policy check

The war is the past and is named once as *four years* and *the camp*; nothing in play is a fight. The Vanguard row is a **welfare desk**: the League, stamps, pensions, a hostel bed, a clerk, a letter, a day book; no uniform, rank, march, symbol or slogan; *the League sees to its men* is the voice of a lobby, not a militia. The memorial ribbon is plain and carries no device. Checked against `docs/design/content-policy-review.md` §7.

### 19.9 Changes elsewhere

- §16.2–16.6 (D, E, G) are **rejected** and stand as the record; the summary table's row 1 points here.
- Fix-list item 9 reads: **The opening, *Coming home*** (§19). *Done when* the three beats, nine row strings, three confirms and echoes, the three kitbag answers, the three post items with hints, the three favours with their four texts, the three welcome decks and outcome headlines are in content; the suit and the three keepsakes carry §19.4's names; the three Ambitions' titles, premises and the five built chapters' strings read as §19.6; `review5.opening.test.ts` finds no *father*; the Vanguard strings pass the policy regex; eight taps from sign-up to the first result; the reference recruit's stats unchanged.
- GDD §7.1 and §17.1 carry a one-line pointer to this section until the user confirms; `docs/tech/review-5.md` §12 (phase 10) builds this version.
