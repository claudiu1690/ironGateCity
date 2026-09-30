# Slice 3 — "The first vote": the political screens

Game designer, 29 Sep 2026; **revised 30 Sep 2026 (review 2)**. The screen-by-screen spec for the plan's "Political screens (mocks)": the Election card, who's standing, backing, the vote, the result, the council's rule vote, plus the morale and rule lines on screens that already exist. There is no canvas mockup for these; this document is the mock. Rules and numbers are in `docs/design/slice-3-politics.md` (cited as *politics §n*; its words are the design's, this document's are the player's: GDD §1.5, `review-2-answers.md` §1).

**What changed in the revision** (each section is marked): **§1a is new** (the Election card on the city screen); **§2** the paper's row is the same card, renamed *Election*; **§3** *the slate* is *Who's standing*, *endorse* is *back*, *declare* is *stand*; **§4** *the ballot* is *Vote*; **§5** *the count* is *The result*, reachable all cycle; **§6** *the order paper* is *Up for a vote*, *the division* is *the council's vote*; **§7** the HQ card is the Election card; **§8** tickets show odds as a word, no percentages; **§9** every modal carries a *Next* line; **§11** the copy. §10 is unchanged. The reason for the revision: in the second play-through every political act was one tap, as designed, and left no trace where the player looked next (`docs/review/2026-09-30-review-2.md` #6).

**Phone first** (375 wide, supported from 360), desktop as the existing mockups do it (the paper in a column of 640; a location opens centred on desktop from review 2 #2, the developer's item). Every screen below is one tap or one choice, resumable, and reads its numbers from the server.

## 1. The look, and what already exists

The printed-matter look of `docs/mockups/MobilePaper.dc.html` and `MobileMission.dc.html`: paper `#EFE6D2`, ink `#15181A`, Playfair Display for headlines, Source Serif 4 for body, Oswald caps for labels, Courier Prime for datelines, footnotes and anything "typed". Rules are double (3px double ink) for section heads, dotted (`#9b917a`) between rows.

Components in `packages/ui/src/components` this slice reuses as they are:

| Component | Used for |
|---|---|
| `Masthead`, `DeskList`, `OrdersList`, `TodayStrip` | The paper, unchanged |
| `Plate` (title, kicker, children) | The city plate (morale word, council-rule line) and the council screen's header |
| `Ticket` | Gains council-rule tags in its tags line (from the server's `ActionView`); odds as a word (§8) |
| `Stamp` (`tone`, `label`) | *Vote cast*, *You're standing*, *Backed*, *Voted*, **ELECTED** |
| `ResultModal` | The vote, standing and rule-vote results (`kind: 'political'`, §9) |
| `BottomSheet` | The rule menu (Put forward), the platform picker |
| `JobsCard` | The **pattern** for the Election card: a card with a kicker, a state line, a Courier line and one button |
| `StoryScreen` | The **pattern** for choice lists: full-width rows, one selected, a sticky CTA, the Courier caption under it |
| `Picture` | Avatars on lists; the halftone photograph on the front page |
| `FactionCrest` | The small mark in a local candidate's avatar ring |
| `Button` (`primary`, `secondary`, `outline`) | CTAs |
| `ProgressBar` (`tone: 'ink'`) | Backers *n of 2*; the term's days |
| `LettersRow` | The **pattern** for the Election row on the paper |

New components (plain props, no tRPC, as the slice-0 rule): `ElectionCard` (one component for the city screen, the paper's row and the HQ sheet), `FrontPage`, `CandidateRow`, `Candidates`, `VoteList`, `ResultTable`, `SeatGrid`, `UpForAVote`, `RuleRow`, `RuleMenu`. Each is described where it appears.

Marks: a player line shows the avatar (32 px ring); a local (NPC) line shows the faction's small mark (`FactionCrest`, 12 px) centred in the same ring on paper-2, and the word **local** in Oswald caps where a rank title would be (politics §5.4, the word changed in review 2).

---

## 1a. The Election card on the city screen *(new, review 2)*

`ElectionCard`, in the `JobsCard` style (paper-card, 1px ink border), **under the city plate and above the location sheet**, folding with the plate on phones when a sheet is open (the folded header keeps the kicker and line 1). Desktop: in the side column above the Today strip.

- **Kicker** `ELECTION · COALPORT COUNCIL` (Oswald caps 10 px, dotted-underlined: tap → the help note *Election*, §11).
- **Line 1** (body 600, 15 px): the state.
- **Line 2** (Courier 11 px): what is open and the **countdown**: *{n} days left*, computed to the closing boundary in the player's clock, rounded up; on the last day *closes tonight at midnight*.
- **Line 3** (Courier 11 px, only when a rule is in force): *Council rule: Public Works Order · 3 days left* (the label dotted-underlined: tap → the help note *Council rule*).
- **Buttons**: one `Button primary` (full width on phones); at most one `Button outline` beside or under it.
- **First appearance** (the morning a player makes Rank 2): a one-line body-italic note above the kicker, once: *Coalport elects its council every five days. You can vote now; Organisers who are Known here can stand.* It goes at the next boundary.

The states, chosen by the server (`election.card`): see the table in §2.1; the card and the row are one component with two layouts.

---

## 2. The Morning Paper: the Election row and the front page

### 2.1 The Election row *(changed, review 2: was Polling Day)*

A row built like `LettersRow`: a 56 px full-width button with the kicker **ELECTION** (Oswald caps, 10 px, letter-spaced, above a 1px rule), line 1 and line 2 of the card, and a chevron. One of these states, chosen by the server; the same table drives the city-screen card (§1a) and the HQ card (§7):

| Phase · the player | Line 1 (body) | Line 2 (Courier) | Button(s) on the card / tap → |
|---|---|---|---|
| Candidates · below Rank 2 | Coalport elects its council on Sunday | Activists vote · 400 Party XP makes an Activist · you have {fxp} | *See who's standing* (`outline`) → §3 |
| Candidates · Rank 2, not standing, not backing | Candidates are putting their names in | Voting opens Wednesday · {n} days to stand or back someone | *See who's standing* (`primary`); **Stand for the council · 10 Political Capital** (`primary`, replaces the first as primary) when Rank 3 and Known → §3 with the stand card open |
| Candidates · standing | You're standing · backers {n} of 2 | Two backers by Tuesday midnight or your name comes off · do today's orders and the branch backs you | *See the candidates* → §3 |
| Candidates · backing someone | You're backing {name} | Voting opens Wednesday · {n} days | *See who's standing* → §3 |
| Voting · not voted | **Voting is open** | Closes Saturday midnight · {n} days left · your vote is secret | **Vote now** → §4 |
| Voting · voted | You voted for {name} | Result Sunday morning, here and in the Clarion | *See the candidates* → §4 read-only |
| Voting · a candidate, not voted | You're a candidate · voting is open | Closes Saturday midnight · you can vote for yourself | **Vote now** → §4 |
| Result (cycle days 0–1) · everyone | Result: {winner} topped the poll · {your line} | Seven seats · the new council sits until Thursday · next election: names in until Tuesday | **See the result** → §5; *Stand for the council · 10 Political Capital* (`outline`) when eligible |
| Result · councillor, rule vote open | **You're on the council** · vote on the rule | The council votes Tuesday midnight · {n} days | **Vote on the rule** → §6 |
| Result · councillor, voted | You voted for {rule} | Result Wednesday morning | *See the council* → §6 |

`{your line}`: *you: elected, 3rd of 7* · *you: missed the last seat by 3* · *your vote: {name} was elected* · *your vote: {name} fell short*; absent for a player who neither stood nor voted. On days 0–1 the *Result* row and the *Candidates* phase both apply; the card shows the result state (its line 2 already names the next election), and once the player stands or backs someone it shows the candidates state. "Midnight" is the boundary in the player's local clock, rendered by the same helper as before. The Paper tab's dot is shown while a vote can be cast and has not been, and while a councillor's rule vote is open and not cast; never for the candidates phase.

### 2.2 The front page (the morning a seat is won)

Only on the first edition the winner opens during the term (GDD §3.3). It replaces the headline block at the top of the paper, under the masthead, in this order (phone, one column):

1. **The photograph.** The player's avatar (`Picture`, 256 width) as a printed halftone: greyscale, slight contrast, a 1px ink border, 4:5, 160 px wide, centred. CSS only (`filter: grayscale(1) contrast(1.15)` and a dotted-pattern overlay at 30 % opacity); no new asset. Under it a Courier caption, 11 px, centred: *{name}, Organiser, elected to Coalport Council*.
2. **The stamp**, `Stamp tone="success" label="ELECTED"`, absolutely positioned over the photograph's top-right corner (rotated as the component does), animated in on open (`animate-stamp`), once. Reopening the paper shows it without the animation.
3. **The headline** (Playfair 900, 34 px, centred): *{name} Takes a Seat on Coalport Council* or *{name} Tops the Poll in Coalport*.
4. **The deck** (Playfair italic 700, 17 px, `#3d3a33`, centred), from the template (`review-2-answers.md` §1.12).
5. **The result table** (§5.2) with the player's row highlighted.
6. A sticky bottom CTA **To the council** (`Button primary`, full width, safe-area padded). The rest of the paper follows below as usual.

Desktop: the same column at 640 px; the photograph floats left of the headline at 200 px wide with the stamp on it.

### 2.3 Losing, and the voter's morning

No front page. The result headline and the player's personal line (*Misses the Last Seat by 3*, *Loses the Last Seat on the Tie-Break*, *Your Vote Counted: …*) appear as ordinary headlines in the headline block. The Election row shows the *Result* state with `{your line}`; an eligible loser's card also offers *Stand for the council · 10 Political Capital*, since candidates' names go in again that morning.

---

## 3. Who's standing *(changed, review 2: was "the slate")*

Route `/council/candidates`. Header: `Plate` with kicker *COALPORT COUNCIL · CANDIDATES* and title *Who's standing*; under the title, in Courier: *Names go in until Tuesday midnight · voting opens Wednesday*. Under the header one Courier line that says how it is decided, always shown: *Seven seats. The seven with most support win. Support = local support (your reputation) + 3 per backer + votes.*

### 3.1 The list

A `Candidates` list of `CandidateRow`s, players first in the order they stood, then locals in profile order (labelled with a 1px rule and *Local candidates* in Oswald caps). Each row (min 64 px):

- Left: the avatar ring or the local mark.
- Middle: **name** (body 600, 16 px); second line in Oswald caps 10 px: *Organiser · Trusted in Coalport · 2 backers* (a local: *local · Known in Coalport*); third line, body italic 13 px, the platform line.
- Right: **Back · 10 Political Capital** (`Button outline`, 36 px) when the viewer may back this candidate; *Backed* (Courier) once they have; nothing on local rows; *You* on the viewer's own row.
- Tapping the row (not the button) expands it to show *Backed by Petra Holm (the branch), M. Kovac* and the local support (*Local support 40 · from your reputation here*). One row open at a time.

Backing is one tap; the row's button becomes *Backed* and the count moves; a small line under the list confirms *You're backing {name} · −10 Political Capital*. Not enough: the button reads **Needs 10 Political Capital** (disabled), the same pattern as *Needs 10 Energy*. The result is a modal (§9): stamp **Backed**.

### 3.2 The stand card (eligible players only)

Above the list, a card in the `JobsCard` style:

- Kicker *STAND FOR THE COUNCIL*. Three requirement lines with a tick or a cross in Courier: *✓ Rank 3, Organiser* · *✓ Known in Coalport (74 wins)* · *2 backers by Tuesday midnight*. Below Rank 3 or Known: the crosses and no button (*Needs Rank 3 · 1,240 Party XP to go*).
- **Your line**: three radio rows (the faction's platform lines, politics §6.4), one selected by default.
- Button **Stand · 10 Political Capital** (`Button primary`, full width). Under it, Courier: *Costs 10 Political Capital. You get it back only if you don't find two backers.*
- After standing, the card becomes the **candidate card**: *You're standing · backers 1 of 2* with a `ProgressBar tone="ink"` (max 2), the line *All orders carried out · the branch backs you* when it applies, the small-branch note *The branch will make up the number* when it applies (politics §6.3), and a text button **Withdraw** (outline, right-aligned, Courier caption *The 10 Political Capital stays with the branch*). Withdraw is one tap; no dialog; the caption is the warning.

The stand result is a modal (§9): stamp **You're standing**.

---

## 4. Vote *(changed, review 2: was "the ballot")*

Route `/council/vote`. Header: `Plate` kicker *COALPORT COUNCIL · VOTING*, title *Your vote*, Courier line *Seven seats · one vote · secret and final · closes Saturday midnight*.

The list is `VoteList`: the same rows as §3.1, no Back buttons, and a radio mark at the right (a 24 px ring; filled ink when selected). Tapping anywhere on a row selects it. Order: players first, then locals.

Sticky bottom: **Vote for Anna Weiss** (`Button primary`, disabled reading *Choose a name* until a row is selected). Under it in Courier: *One vote, final. The result is at 01:00 on Sunday.*

Already voted: the chosen row carries *You voted for {name}* in Courier instead of the ring, the others are dimmed, the CTA is replaced by the line *Vote cast · the result is in Sunday's paper and on the Election card*. There are no totals anywhere on this screen (politics §4.3).

The result is a modal (§9): stamp **Vote cast**.

---

## 5. The result *(changed, review 2: was "the count"; reachable all cycle)*

Route `/council/result`, also embedded in the front page (§2.2). Reached from the Election card on days 0–1 (*See the result*) and from the council screen on every day (*Last result*, §6.1), so the names never disappear.

### 5.1 Header

`Plate` kicker *COALPORT COUNCIL · THE RESULT*, title *Sunday's result*, Courier: *Turnout 3 of 9 members · local seats 6 / 7 · final*.

### 5.2 `ResultTable`

A printed table, one row per candidate in finishing order, dotted rules, Oswald caps header: **#** · **Name** · **Local support** · **Backers** · **Votes** · **Support**. The first seven rows carry a thin ink bar at the left and the word *Elected* in Courier after the name; the eighth onward none, and a 1px rule between the seventh and eighth with *the line* in Courier at its right. The player's own row (if they stood) is on paper-2 with *you* after the name; the row they voted for carries *your vote* in Courier. Local rows show the mark before the name. Numbers right-aligned in Oswald.

Under the table, in Courier 11 px: *Support = local support + 3 per backer + votes. Ties: votes, backers, reputation, who stood first.* One line, always shown: how the seats were decided is not a secret (the roll-hiding rule of GDD §8.4 is about checks; an election is a count).

Desktop: the same table at full width.

---

## 6. The council *(changed, review 2)*

Route `/council`. Reached from the front page, the Election card, the HQ sheet's card (§7) and the Me tab's seat line.

### 6.1 Header

`Plate` kicker *COALPORT COUNCIL · SITTING*, title *The council*, Courier: *Term ends Thursday · local seats 6 / 7 · council rule in force: Public Works Order · 3 days left*; a text button **Last result** (Courier, right) → §5.

### 6.2 `SeatGrid`

Seven tiles in a row that wraps (4 + 3 on phones), each 64 px: the avatar or local-mark ring, the name in Oswald caps 10 px below, the seat number. The viewer's tile has a 2px ink outline. Tapping a tile shows a small popover with the name, rank or *local*, reputation, and (after the council's vote) *voted for {rule}*.

### 6.3 `UpForAVote` (term days 0–1)

Kicker *UP FOR A VOTE* with the double rule. Rows of `RuleRow`:

- Left: an item number in Courier (1, 2, 3, 4).
- Middle: **name** (body 600), second line the one-line text (italic 13 px), third line in Oswald caps the effect (*JOB PAY +10 % · 5 DAYS*). Item 1 carries *the party's proposal · Secretary Holm* in Courier; a proposal carries *put forward by {name}*.
- Right: the radio ring (a councillor who has not voted); *your vote* in Courier once cast; after the council's vote, the number of votes in Oswald.
- A final row **None of these**, same shape, no effect line.

Under the rows: **Put forward a rule · 20 Political Capital** (`Button outline`, full width) while the councillor has not put one forward and fewer than three proposals stand; it opens the `RuleMenu` (§6.5). Otherwise a Courier line: *You put forward Street Fund* or *No room for more proposals this term*.

Sticky bottom for a councillor who has not voted: **Vote for Public Works Order** (disabled *Choose a rule* until a row is selected); Courier under it: *One vote, final; the whole council sees it. The council votes at 01:00 on Tuesday.* After voting: the line *Vote recorded · the result is in Tuesday's paper and on the Election card*.

For a resident who is not a councillor the same screen is read-only: the seats, the proposals without rings, and the in-force line. That is how a voter sees what their council is doing.

### 6.4 After the council's vote (term days 2–4)

The rows show each item's votes and the passed item stamped in-line with a small `Stamp tone="success" label="Passed"` (18 px text variant via `className`), or *The council couldn't agree · no rule this term* in the failure colour. The in-force line in the header counts down.

### 6.5 `RuleMenu` (a `BottomSheet`)

Title *Put forward a rule · 20 Political Capital*. Ten rows (`RuleRow` without the ring): name, line, effect caps. Rows already up for a vote are dimmed with *already up for a vote*. Tapping a row puts it forward at once (one tap; the sheet's title says the price; not enough dims every row with *Needs 20 Political Capital* in the title). The sheet closes on the modal (§9, stamp **Put forward**).

---

## 7. The Election card on the HQ sheet *(changed, review 2)*

On the faction HQ location sheet (Union Hall, Beacon House, the Assembly Rooms), under the tickets and above the Jobs card if any: the same `ElectionCard` as §1a, compact layout (kicker, line 1, line 2, one button). One component, three places: the city screen, the paper and the HQ, so every route leads to the same state and the same next step.

---

## 8. The city plate, tickets and the Me tab *(changed, review 2)*

- **The plate** (`Plate`): title *Coalport*, kicker *HOME CITY*, children: *Collective 84.0 % · Fired up* (the state word in Oswald caps; *Unrest* in the failure colour), the *Reputation* line (*Reputation · Known · 34 / 70*, the label dotted-underlined), and a Courier line when a rule is in force: *Council rule: Public Works Order · 3 days left*. The Election card sits under the plate (§1a). On phones the plate already folds to its header when a sheet is open; the lines and the card fold with it.
- **Tickets** (`Ticket`): the odds line reads **`{Odds word} · {Stat}`** (*Good odds · Intelligence*, *Fair odds · Charisma and Intelligence*, *Good odds · your best, Strength*; training *Intelligence 12 → 13 · always works*), dotted-underlined; a tap opens the two-line band note (GDD §8.4), never a ledger. The type label is the plain one (*Talk to voters*, *Spread the word*, *Watch and listen*, *Party meeting*). The server adds rule tags to the tags line, before the Party-order tag, in words: *Rally Permits · 10 Energy* (and the Energy stub shows 10), *Open Doors · better odds*, *Street Fund · +25 % Iron*, *Public Meetings · +25 % Party XP*, *Reading Room Grant · 35 Energy*, *First day in Coalport · better odds*. No percentage of chance anywhere on a ticket.
- **The result modal** (`ResultModal`): the *How it went* rows are *Success* / *Partial* and the XP, with a reason line under a row that isn't a Success (GDD §8.4; `review-2-answers.md` §2.3); bonus lines named after the rule and the morale state (*Fired up: +1 Party XP*, *Street Fund: +5 Iron*), the same pattern as *Rested* and *party order*; a knock-on line when a threshold is crossed (*Coalport: Fired up · +10 % Party XP at home*).
- **The Me tab**: a line under the party card: *Councillor, Coalport · term ends Thursday* (tap → the council), or *No seat · Organisers may stand for the council* at Rank 3, or nothing below Rank 3. The Political Capital line with its uses in Courier: *Political Capital 45 · stand 10 · back a candidate 10 · put forward a rule 20*. Reputation per city: *Coalport · Known · 34 / 70 wins to Trusted*.
- **The HUD**: *Political Capital 45* in full once above 0 (GDD §6.5); the Party XP bar labelled *Party XP* in its help note.

---

## 9. The result modals *(changed, review 2: a Next line on every one)*

One modal each, `ResultModal` kind `political`. No art panel: the modal's top section is the masthead strip of the city's paper (the paper name in Playfair 22 px on a 3px double rule) with the stamp over its right end, in place of the map crop. Sections: stamp and place · headline and text · knock-on lines, the last of them always **Next:** in Courier · **Continue** only, which returns to the screen the act was taken from with the Election card already in its new state. No *How it went*, no reward tiles (nothing rolled).

| Act | Stamp | Headline | Text (≤ 240 chars) | Knock-on lines |
|---|---|---|---|---|
| Vote | **Vote cast** (success) | Your vote is in | You voted for {name}. Nobody can see who you chose. The result is in the Clarion on Sunday morning, and on the Election card. | *Coalport morale +0.5 → 84.5 %* · *Next: the result, Sunday morning.* |
| Stand | **You're standing** (success) | Your name is on the list | You need two backers by Tuesday midnight or your name comes off. Do today's Party orders and the branch backs you. | *−10 Political Capital · 35 left* · *Next: find backers. Voting opens Wednesday.* |
| Back | **Backed** (success) | {name} has your backing | Backing is public and final. {name} has {n} now; two by Tuesday midnight keep the name on the list, and up to five count. | *−10 Political Capital · 25 left* · *Next: voting opens Wednesday.* |
| Withdraw | **Withdrawn** (partial) | Your name comes off the list | The 10 Political Capital stays with the branch. Candidates can put their names in again on Friday. | *Next: nothing until Friday.* |
| Put forward | **Put forward** (success) | {rule} is up for a vote | {ruleLine} The council votes at 01:00 on Tuesday. | *−20 Political Capital · 25 left* · *Next: vote for a rule before 01:00 on Tuesday.* |
| Rule vote | **Voted** (success) | Your vote is recorded | For {rule}. The whole council can see it, and it's final. The council votes at 01:00 on Tuesday; the Clarion prints the result. | *Next: the result, Wednesday morning.* |

The seat itself has no modal: the front page (§2.2) is its moment.

---

## 10. Phone layout rules (as slice 2's §12.3; unchanged)

- Lists use full-width rows ≥ 56 px, one selected state, and a sticky CTA with safe-area padding; on a 375 × 667 phone the header and at least five rows are visible above the CTA.
- The front page's photograph, stamp, headline and deck fit above the fold with the CTA visible; the result table scrolls.
- The `BottomSheet` for the rule menu is at most 80 dvh and scrolls its ten rows.
- No horizontal scroll at 360 px; the result table's six columns use Oswald numerals at 13 px and abbreviate *Local support* to *Local* and *Backers* to *Back.* only when the column would wrap.
- The Election card on the city screen is at most 120 px tall unfolded (kicker, two lines, one button row) and folds to 44 px with the plate.
- Desktop (≥ 1024): who's standing, the vote, the result and the council render in the paper's 640 px column; the HQ sheet opens centred (review 2 #2) with the Election card inside it.

---

## 11. Copy (new and changed strings, for `copy.ts`) *(changed, review 2)*

*Election* · *Coalport elects its council on Sunday* · *Activists vote · 400 Party XP makes an Activist · you have {fxp}* · *Candidates are putting their names in* · *Voting opens {weekday} · {n} days to stand or back someone* · *You're standing · backers {n} of 2* · *Two backers by {until} or your name comes off · do today's orders and the branch backs you* · *You're backing {name}* · *Voting is open* · *Closes {until} · {n} days left · your vote is secret* · *closes tonight at midnight* · *You voted for {name}* · *Result {weekday} morning, here and in the {paper}* · *You're a candidate · voting is open* · *Closes {until} · you can vote for yourself* · *Result: {winner} topped the poll* · *you: elected, {ordinal} of 7* · *you: missed the last seat by {margin}* · *your vote: {name} was elected* · *your vote: {name} fell short* · *Seven seats · the new council sits until {weekday} · next election: names in until {until}* · *You're on the council · vote on the rule* · *The council votes {until} · {n} days* · *You voted for {rule}* · *Result {weekday} morning* · *Council rule: {name} · {n} days left* · *See who's standing* · *See the candidates* · *See the result* · *See the council* · *Last result* · *Vote now* · *Vote for {name}* · *Choose a name* · *One vote, final. The result is at {at}.* · *Vote cast · the result is in {weekday}'s paper and on the Election card* · *Stand for the council · 10 Political Capital* · *Stand · 10 Political Capital* · *Needs 10 Political Capital* · *Costs 10 Political Capital. You get it back only if you don't find two backers.* · *Back · 10 Political Capital* · *Backed* · *You're backing {name} · −10 Political Capital* · *Backed by {names}* · *Local support {n} · from your reputation here* · *All orders carried out · the branch backs you* · *The branch will make up the number* · *Withdraw* · *The 10 Political Capital stays with the branch* · *Who's standing* · *Local candidates* · *local* · *Local seats {n} / 7* · *Turnout {n} of {m} members* · *the line* · *Elected* · *your vote* · *you* · *Support = local support + 3 per backer + votes. Ties: votes, backers, reputation, who stood first.* · *To the council* · *Up for a vote* · *the party's proposal · {secretary}* · *put forward by {name}* · *None of these* · *Put forward a rule · 20 Political Capital* · *Needs 20 Political Capital* · *already up for a vote* · *No room for more proposals this term* · *You put forward {rule}* · *Vote for {rule}* · *Choose a rule* · *One vote, final; the whole council sees it. The council votes at {at}.* · *Vote recorded · the result is in {weekday}'s paper and on the Election card* · *Passed* · *The council couldn't agree · no rule this term* · *Councillor, {city} · term ends {weekday}* · *No seat · {rank3Title}s may stand for the council* · *Political Capital {pc} · stand 10 · back a candidate 10 · put forward a rule 20* · *Fired up* · *Steady* · *Unrest* · *{name}, {rank}, elected to {city} Council* · *ELECTED* · *Next: …* (the six lines of §9).

Help notes (tap the label; kicker · note): **ELECTION** · *{city} elects its council every five days: two days for candidates to put their names in, three days of voting, the result the next morning. {rank2}s vote; {rank3}s who are Known here can stand.* · **COUNCIL RULE** · *The seven councillors pick one rule for the town each term. It changes a real number for everyone in {city} for five days.* · **BACKERS** · *A candidate needs two backers to stay on the list. Backing costs 10 Political Capital, is public, and can't be taken back. Do all three Party orders while you're standing and the branch backs you.* · **LOCAL SUPPORT** · *The town's own vote for a candidate: your reputation here, counted as wins ÷ 5. Every round of talking to voters raises it.*

British English, no exclamation marks, no percentages of chance, times in the player's local clock.
