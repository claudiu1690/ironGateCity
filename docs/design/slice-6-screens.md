# Slice 6 — "Together": the screens

Game designer, 3 Oct 2026. The screen-by-screen spec for slice 6: the Faction tab and its five parts (Orders, Events, Members, Scoreboard, Chat), the event page and sign-up, calling an event, the event result modal, presence on a place's sheet and the venue's event ticket, the bail and visit flows from the Members list, the chat lines and the held screens, the paper's rows, the empty states, and the phone and desktop layouts. Rules and numbers are in `docs/design/slice-6-together.md` (cited as *design §n*). Where a slice-3 to slice-5 screen already does the job it is named and only the change is given.

**Phone first** (375 wide, supported from 360), desktop as the existing screens. **Every string a player reads is in everyday words** (GDD §1.5): no *co-op*, *NPC*, *resolve*, *roster*, *schedule*, *WebSocket*, *presence*, *ledger*, *directive*; no percentage, roll, check or difficulty anywhere. Odds are words; Energy, Iron and Political Capital are numbers because they are costs.

## 1. The look, and what already exists

The printed-matter look of slices 3–5: paper `#EFE6D2`, ink `#15181A`, the faction colours, Oswald caps for labels, Courier Prime for datelines and anything typed, Source Serif 4 for body, Playfair Display for headlines; the failure colour for *Fiasco* and *in the cells*; the faction colour for *Triumph*.

Components reused as they are: `HudBar`, `Ticket`, `Stamp`, `ResultModal` (kinds `action`, `political`, `mission`; a new `event` kind that is `action` plus the roles block), `BottomSheet`, `StoryScreen` (its rows are the role rows), `HelpButton` and the help notes, `Picture`, `FactionCrest`, `Button`, `ProgressBar`, `OrdersPanel` (the city screen's orders, reused on the Orders tab), `LettersRow`, the paper's rows, `HeldScreen`, the Me tab's rows, the ground sash on the scene art, the mockup `MobileEvent.dc.html` for the event page's look (its *From your Dossier* box is slice 8 and left out; its *CHA 24* and *about 70 %* lines become odds words, review 2).

New components (plain props, no tRPC): `FactionTabs`, `EventCard` (the board's row), `EventPage` (the mockup's screen with the roles block), `RoleRow` (a `StoryScreen` row with the holder or *open* and the member's odds word), `HandsRow`, `CallEventSheet`, `TimeChips`, `EventResultRoles` (the *How it went* block of the event modal), `MemberRow`, `MemberStatus`, `ProfileSheet`, `FavourSheet`, `ScoreboardTable` (slice 4's, with the period and city filters), `ChatPanel`, `ChatLine`, `SystemLine`, `HereNowLine`, `EventTicket` (the venue's ticket).

---

## 2. The Faction tab (route `/faction`)

The tab-bar stub *Faction* (between Paper and Me on the mockups' bar; `AppShell.tsx` already lists it, disabled) comes alive. It carries a **dot** when there is an unread chat line addressed to the member (a nudge, a system line with a button for them) or a pending event result.

**The header** (one band, 120 px on a phone): the faction's HQ scene (`union-hq` / `vanguard-office` / `alliance-hq`) cropped behind an ink band with the faction's crest, the faction's name in Playfair 22 px, and one Courier line: *{rank title} · {n} members · {m} here now* (own faction only). Under it the five tabs as a `TramBar`-style strip (44 px, the current one inverted): **Orders · Events · Members · Scoreboard · Chat**. The tab last used is remembered for the session; the first visit opens **Events**.

### 2.1 Orders

The city screen's `OrdersPanel` as it is (the three orders with progress, the secretary's portrait at 40 px and today's line, the orders-complete state with its modal), with one addition under it: **today's fixture** as an `EventCard` under the kicker *THE BRANCH'S EVENT TODAY* (design §4). Nothing else: the orders live here as well as on the city screen so a member in the capital sees the capital rotation here without finding the plate.

### 2.2 Events (the board)

Three groups, each a kicker on a double rule and `EventCard`s:

1. **HERE · {CITY}** (or *{DISTRICT}, IRONGATE*): every open event of the faction in the city the member is in, soonest first; the fixture first when both are today. Then, folded under *Also open elsewhere · {n}* (tap to expand), the faction's open events in other cities, each with its city and *join from there*; nothing on these is tappable but the expand.
2. **YOUR SIGN-UPS** (only when any): the member's open sign-ups anywhere, each a card with *you're the {role}* and *Withdraw* (until the hour before; after: *Committed from {time}*).
3. **RESULTS · {CITY}**: the last ten resolved events here, each a one-line row (`SystemLine` style): *{weekday} {time} · {event} at {venue} · **{Outcome}** · opinion {swing} · {n} members*; tap → the event page in its resolved state (§3.3).

Above the first group, for Rank 3 and above, a full-width `primary` button **Call an event** (→ §4); for others a Courier line *{rank3}s and above can call events; anyone can join one.* When the city has reached its three starts: the button is replaced by *The branch has its hands full in {city} today*.

**`EventCard`** (the board's row; 1.5 px ink border, paper-2): a 56 px square of the event's art at the left (the scene cropped, the ground sash not drawn at this size); the event's name in Playfair 16 px; under it Courier 11 px: *{venue} · settles at {time} · {filled} of {roles} roles{ · hands n of 4}*; a third line in body 13 px: *called by {name}* / *called by Secretary Holm · the branch's event*; at the right a `Button` **Join** (open roles the member may take exist) / **Join as a hand** (no named role open to them, a hand's place is) / *You're the {role}* (Courier, when signed up) / *Full* / *Settling…* (start passed, result pending). Tapping anywhere else opens the event page. A tag line when it applies, Oswald caps 10 px: *Issue: {issue} · opinion +50 %* · *Close race · +25 %*.

### 2.3 Members

A search field (*Find a member*) and the list of `MemberRow`s, fifty a page (*Show more*), sorted here now → online → last seen.

**`MemberRow`** (64 px): the avatar at 40 px with the faction's colour ring; the name in body 600 and the rank title and Level in Courier (*Organiser · Level 12*); the second line, Courier 11 px, is **`MemberStatus`**: *here now · Coalport* (ink) / *online · Eastside, Irongate* / *today* / *this week* / *away* (paper-3), **or the state that matters, in the failure colour:** *in the cells at Harbour Police · 24 min* / *in the infirmary · 12 min* / *on the train to Irongate · 8 min* / *in Duskwall · rival ground*; a rosette and *District Hero, Eastside* when held; at the right a small Courier *+1.3 this week* (opinion moved). **The favour button** sits at the right in place of the figure when the state calls for one: **Post bail · 150 Iron** / **Visit · 3 Energy** (→ §7); when you are signed up to an open event with a free place and the mate is not on it: a text button **Ask to join** (one tap; the nudge, design §9.3: the first open named role they may take, or a pair of hands; then *Asked*). Tapping the row opens the `ProfileSheet`.

**`ProfileSheet`** (a `BottomSheet`, 60 dvh): the avatar at 96 px, the name in Playfair 20 px, *{faction} · {rank title} · Level {n}*; rows in the Me tab's style: *Lives in {place}* · *Member since {d Month}* · *Heroes: {list}* (or none) · *Reputation here: {level}* (when both are in the same city) · the status line; two buttons: **Message** (opens Chat with *@{name} * typed) and the favour when it applies; a text button **Mute** / **Unmute** at the foot (design §8). Nothing private: no record, Heat, Health, Iron or stats.

### 2.4 Scoreboard

Two chips at the top, **This week** · **All time** (*This season* from slice 8), and a city filter row (*All cities* · *Coalport* · *Irongate* …, chips; the member's city first). Then slice 4's `ScoreboardTable` with the kicker *WHO MOVED THE MOST FOR THE {FACTION} · {PERIOD}*: **#** · **Name** · **Level** · **Moved** · **Events**; ten rows per bracket, the top three with the rosette and the member's own row below the ten when outside them, the brackets separated by a rule with the bracket in Courier at its right, the member's own row on paper-2 with *you*. Under it in Courier: *Moved is opinion won in every city, added up. A District or City Hero is the top of a bracket in one place at the result.* Tapping a row opens the profile sheet.

### 2.5 Chat

`ChatPanel` fills the tab below the header: a channel strip (chips: **Party** · **{Home city} branch** · **Irongate branch**; the branch of the city the member stands in is selected by default, the residence city's elsewhere), the header line in Courier (*{n} here · {channel}*), the lines, and the composer pinned above the tab bar (a single-line field growing to three, *Say something to the branch…*, the counter at 240 of 280, a **Send** button; Enter sends on desktop). **`ChatLine`:** the avatar at 28 px, the name in body 600 with the rank title in Courier after it, the time in Courier at the right, the text in body 15 px; the member's own lines on paper-2. A muted member's lines are collapsed to *Muted · {name}* (tap to show once). **`SystemLine`:** an ink rule above and below, no avatar, the line in Courier 12 px, and a `Button` at the right when the line carries one (**Post bail · 150 Iron** · **Visit · 3 Energy** · **Join** · **See result**); a nudge addressed to the member is on paper-2 with *for you* at its left. **Report** on a long press (phone) or hover (desktop): a one-line sheet, *Report this message to the game's moderators?* · **Report** · *Cancel*; then *Reported* on the line, once. Scroll loads older lines (fifty at a time); a *New lines ↓* pill when new lines arrive while scrolled up.

Rate limits read as a Courier line under the composer, only when hit: *One message every three seconds* · *Thirty messages in ten minutes is enough for anyone; back in {n} minutes* · *Said that already*.

---

## 3. The event page and sign-up (route `/faction/events/{id}`; the mockup `MobileEvent.dc.html`'s screen)

### 3.1 The page

1. **The header band** (230 px on a phone, the mockup's): the event's art (design §18) behind the ink band, **the ground sash** on the art's top-right corner (slice 4's sash: whose ground the venue is); the kicker *CAMPAIGN EVENT · {CITY} · {VENUE}*; the name in Playfair 32 px; the Courier line *{Weekday} {time} · starts in {h} h {m} m · called by {name}* (*settles at midnight · the branch's event* for the fixture; *started · settling* once the start has passed). The back arrow returns to where the page was opened from.
2. **What it can pay** (the mockup's four tiles, two by two, 1 px ink border): **Opinion** *up to about +{max} here* (base × 1.5 × the day's lines, one decimal; *against the {target}* for the Headline Story) · **Party XP** *by the outcome* · **Political Capital** *3 to 15, by the outcome* · **In the paper** *your name, tomorrow morning*. A tag row under them when it applies: *Issue: {issue} · opinion +50 %* · *Close race · +25 %* · *Fired up · better volunteers* (home only).
3. **The blurb** (body 15 px, the event's, design §3).
4. **Roles · {filled} of {n} filled** (the kicker, with the Courier *every role rolls its own check* replaced by *every role matters*). One `RoleRow` per named role (56 px min, the mockup's): the holder's avatar at 36 px (or a dashed circle with *?* for an open one; the faction's small mark for a volunteer after the start); the role's name in Playfair 16 px; under it Courier 11 px: a holder's *{name} · {stat word}* (*P. Holm · Charisma and Intelligence*), or for an open role **the member's own odds word and the stat** (*Good odds · Intelligence* / *Long shot · Charisma and Intelligence* / *Good odds · your best, Strength*) in the faction colour, or the gate when the member cannot take it (*{rank2}s and above* · *Needs 15 Energy* · *You're the Organiser*); a tick at the right when filled. The hint (body italic 13 px) under the open rows only. **Tapping an open row selects it** (the row inverts) and the sticky button reads **{Role} · {n} Energy**; the row's tap selects, the button spends (the briefing's pattern, slice 5 §4.2); *Needs {n} Energy* disabled when short.
5. **Hands · {k} of 4** (`HandsRow`): the hands' avatars at 28 px, then a dashed circle; Courier *any Rank · 5 Energy · no check; your Energy counts toward the swing*; the row selects like a role (the sticky button: **Join as a hand · 5 Energy**).
6. **The Courier paragraph** (the mockup's): *Roles still empty at the start go to the branch's volunteers: townspeople run by the game, at half strength. You need not be here when it starts: the result waits for you in a modal and in the paper.* A dotted-underlined *volunteers* opens the help note.
7. **When signed up:** the sticky button becomes **Withdraw · {n} Energy back** (`outline`) until the hour before, then a Courier line *Committed from {time}: the branch is counting on you* and no button. A nudge button for any signed-up member while a place is free: a text button **Ask someone to join** → the Members list filtered to *here now* with *Ask* on each row.

### 3.2 Sign-up: the taps

One tap on a row, one on the button. The result is a small `ResultModal kind="political"`: stamp **Signed up**, headline *You're the {role}*, body *{venue}, {time}. The Energy is spent; the rest is the branch's. You need not be here when it starts: the result waits for you.*, knock-on *−{n} Energy* · *Rested: {r} of {n} Energy, +50 % XP* · the order line when the event order completes (*Order carried out · +20 Party XP. Two remain. — P.H.*), *Next: the result, {time}. Withdraw until {time − 1 h} if you must.*; **Continue** → the page in its signed-up state.

### 3.3 The resolved page

The same page after the start: the header's line *{Outcome} · opinion {swing} · {n} members*; the tiles replaced by **the stamp** at the left and the receipt-style summary; every role row shows its result at the right (*Success* / *Partial* / *Failure* / *Volunteer*); no buttons. For a participant, a text button **See your result** reopens their modal.

---

## 4. Calling an event (`CallEventSheet`; Rank 3 and above; three steps)

1. **Which:** a `BottomSheet` (70 dvh), kicker *CALL AN EVENT · {CITY}*, one `StoryScreen` row per event the faction may call here (the three common ones and the faction's own; the capital's signature events only in their district: a row elsewhere reads *Grand Rally · at the Esplanade, Garrison Hill · go there to call it*, dimmed): the name in Playfair 16 px, Courier *{venue} · {n} roles · {energy} Energy of roles · opinion up to about +{max}*; the event's blurb under it. Tap → step 2.
2. **When and your role:** the same sheet, kicker *THE RALLY · MARKET ROW*; **`TimeChips`**: four chips in a row, *In 1 hour · {time}* … *In 12 hours · {time}* (the local clock on a second line; the first selected by default); under them the roles as `RoleRow`s with the caller's odds words; tap selects (one role is required). The sticky button: **Call it · {Role} · {n} Energy**. *Needs {n} Energy* disabled when short.
3. **The tap.** `ResultModal kind="political"`: stamp **Called**, headline *The branch has a {event} at {time}*, body *{venue}, {time}. You're the {role}. The branch's chat has the line; three more names and it's a rally.*, knock-on *−{n} Energy* · *Next: ask the branch. Roles still open at the start go to volunteers.*; **Continue** → the event page. The chat gets its system line.

Guards read as a line in place of the button: *One at a time: the branch's {event} at {time} is still open* · *The branch has its hands full in {city} today* · *Not from the train* · *Not from the cells* · *Not on rival ground*.

---

## 5. The event result modal (`ResultModal kind="event"`)

Shown on the next read after the start, one per event the member took part in, in the order resolved; it waits like the orders-complete modal.

1. **Art and stamp:** the event's scene with the ground sash; the stamp **Triumph** (the faction colour) / **Success** / **Mixed** / **Fiasco** (the failure colour); the place line *{venue} · {city} · {weekday} {time}*.
2. **What happened:** the outcome's headline (Playfair) and body (design §3).
3. **How it went** (`EventResultRoles`, the kicker): one row per named role, 44 px: the role's name in body 600, the holder's name (or *Volunteer · townspeople run by the game* in Courier), and at the right **Success** / **Partial** / **Failure** (the failure colour) / **half strength**; the member's own row on paper-2 with *you*; under their row, when it was not a Success, the one plain reason (§8.4: *Your Charisma is low for this. It comes from what you wear.*). A last row *Hands · {names}* when any. Under the block in Courier: *{s} of {n} roles came off{; k went to volunteers}.*
4. **The receipt** (review 3): **XP** *+75 · Rested +38* with the bar; **Party XP** *+12 · Triumph +6 · Party order +3* with the bar; **Political Capital** *+10 · first event today* / *+5 · second event today, half*; **Opinion** *+1.20 for the Collective in Coalport · your share +0.30 · Collective 84.0 → 85.2 %*; **Issue points** *+15 on the tram fares* when tagged. A zero line is not printed.
5. **Knock-ons:** *Reputation in Coalport · a win · 41 / 70* (a named role's Success); *Heat +5 → 12 · Cool* (the Grand Rally in a rival-held district, with the first-state card if a state is reached); *Next: the branch's event tomorrow is on the Faction tab.*
6. **Button:** **Continue**. No repeat buttons: an event is not repeated from a modal.

Desktop: the slice-4 modal at 640 px.

---

## 6. Presence on a place's sheet, and the venue's ticket

### 6.1 Here now (`HereNowLine`)

Under a place's blurb, one Courier 11 px line with a dotted-underlined label: **Here now** · *you, Jan Sorel, Mira Hale and 2 more · 1 from another party* / *you and 1 from another party* / *nobody else just now*. Own-faction names are tappable (the profile sheet); the other parties are a count. On rival ground the line never names or counts the visitor to the home faction (design §7). The help note: *HERE NOW · Who's been at this place in the last ten minutes. Your own party by name; the others as a count. Tap a name for who they are.*

The city plate gains a Courier line under the morale line: *{n} of the {faction} in town now* (own faction; absent when it is only you).

### 6.2 The venue's event ticket (`EventTicket`)

On the venue's sheet, above the tier-1 tickets while an event of the member's faction is open there, under a kicker **CAMPAIGN EVENT** on a double rule: a `Ticket` whose stub is the event's art at 56 px instead of an Energy figure; the title (*The rally · settles at 19:40*), the tags line (*{filled} of {n} roles · called by {name}* · the Issue and close-race tags); one button **Join** (→ the event page) or *You're the Organiser* in Courier. After the start and before the result is read: *Settling…*. Resolved events are not on the sheet (the board keeps them).

### 6.3 The journey screen

One Courier line under the progress line when the count is cheap: *You and 2 others on this train.* Nothing tappable.

---

## 7. Favours: bail and visits

### 7.1 From the Members list, chat and profile (`FavourSheet`)

The button (**Post bail · 150 Iron** / **Visit · 3 Energy**) opens a `BottomSheet` (40 dvh), kicker *POST BAIL* / *A VISIT*, the mate's avatar and name, one body line (*Jan Sorel is in the cells at Harbour Police, 24 minutes to go. Bail is 150 Iron; they walk out now and the duty officer notes who paid. You get +10 Party XP.* / *Mira Hale is in the infirmary, 12 minutes to go. A visit is 3 Energy: Health +10 for her and five minutes off the stay. You get +10 Party XP.*), the Courier guard when it applies (*Bail is double on rival ground* · *Legal Aid: half price* · *Already out* · *Not from rival ground* · *Needs 150 Iron* · *Needs 3 Energy* · *You've visited this stay*), and one button **Post bail · 150 Iron** / **Visit · 3 Energy**. The result: the payer's and the visitor's modals (design §11). The row's button becomes *Posted* / *Visited*.

### 7.2 On the held screens (`HeldScreen`, slice 5 §6–§7)

- **The cells:** under *Pay bail*, one Courier line: *A faction mate can post it from the Faction tab; the branch's chat has been told.* When bail is posted, the next read shows the release modal with *Out, on the branch's Iron* (design §11).
- **The infirmary:** under the two buttons, a Courier line *Visitors: {names}, Health +10 and five minutes off each* when any; the header's minutes and *out at {time}* move with each visit. The chat line is posted on admission.
- **Both, when the member has an open sign-up:** a Courier line under the sentence: *You're the {role} at {event}, {time}. You were counted before you came in; the result waits for you.*

---

## 8. The paper

- **Events** (a new section row group, under Party orders; `LettersRow` style): one row per open event of the faction in the residence city: the kicker *EVENTS*, the line *Today: the branch's canvass drive on Foundry Row · settles at midnight · 2 of 4 roles* and at the right *you're the Coordinator* or a **Join** button; a tap opens the event page. On the welcome edition the row reads *· join as a hand · 5 Energy*. When nothing is open: *No event in {city} today. {rank3}s can call one on the Faction tab.*
- **In Print:** the event result lines with the rosette for a Triumph; *{payer} Posts Bail for {name}*; *Visitors for {name} on the Ward*.
- **Your desk:** a *Signed up* row when any (*Signed up: the rally at Market Row, 19:40 · Organiser*).

---

## 9. Empty states

| Where | State | What it reads |
|---|---|---|
| Events, here | nothing open in this city | *No event in {city} today.* Under it for Rank 3+: the **Call an event** button; for others: *{rank3}s and above can call one. The branch's event is posted every morning.* |
| Events, results | none yet | *No results here yet. The first is tomorrow morning.* |
| Members | a branch of one | the member's own row and a Courier line: *You're the branch for now. New members arrive at the station; the paper will say.* |
| Scoreboard | nothing moved this week | *Nobody has moved anything this week yet. Opinion won in any city counts here.* |
| Chat | no lines | *Nothing said yet. The branch's lines land here: events called, results, who needs bail.* |
| Here now | nobody | *nobody else just now* |
| A role, after the start | unfilled | *Volunteer · townspeople run by the game · half strength* |
| An event page, called off | no one at the start | the stamp **Called off** over the header and one line: *Nobody signed up by the start. Nothing happened and nothing was spent.* |

---

## 10. Phone and desktop layouts; above the fold

- **The Faction tab on 375 × 667:** the header band (120 px) and the tab strip (44 px) are always above the content; on **Events**, the *Call an event* button and the first `EventCard` are above the fold; on **Members**, the search and three rows; on **Chat**, the channel strip, the last four lines and the composer (the composer pinned above the tab bar; the keyboard pushes the lines, never the composer).
- **The event page on 375 × 667:** the header band, the four tiles and the first role row are above the fold; the sticky button sits above the tab bar at all times; the roles scroll. The role rows are 56 px min and the hint wraps to two lines at most at 13 px.
- **The call sheet:** step 1 shows three rows above its fold (the fourth scrolls); step 2 shows the chips and two role rows above the sticky button.
- **The event result modal:** the art, the stamp, the headline and the first two role rows are above the fold on 375 × 667; the receipt scrolls; **Continue** is sticky.
- **Member rows** are 64 px; a favour button is 44 px tall and never wraps (*Post bail · 1,600 Iron* is 20 characters at 13 px Oswald, inside the 140 px column).
- **Chat lines** wrap; a 280-character line is at most eight lines at 15 px on 360 px and never truncated. System lines with a button keep the button on the right at 360 px by wrapping the text first.
- **Desktop (≥ 1024):** the Faction tab is a two-column page: the chosen tab's content in a 640 px column at the left, **Chat as a persistent 360 px column at the right** (the Chat tab chip disappears; the strip has four chips); the event page and the result modal are centred cards at 640 px; the call sheet and the favour sheet are side sheets at 480 px; the profile sheet a centred card at 420 px.
- **Reduced motion:** sheets fade, no slides; the chat's *New lines* pill without animation.

---

## 11. Copy (new strings, for `copy.ts`)

*Faction* · *Orders* · *Events* · *Members* · *Scoreboard* · *Chat* · *{rank} · {n} members · {m} here now* · *The branch's event today* · *Here · {city}* · *Also open elsewhere · {n}* · *join from there* · *Your sign-ups* · *Results · {city}* · *Call an event* · *{rank3}s and above can call events; anyone can join one.* · *The branch has its hands full in {city} today* · *{venue} · settles at {time} · {filled} of {roles} roles* · *hands {k} of 4* · *called by {name}* · *called by {secretary} · the branch's event* · *Join* · *Join as a hand* · *You're the {role}* · *Full* · *Settling…* · *Campaign event · {city} · {venue}* · *{weekday} {time} · starts in {h} h {m} m* · *settles at midnight · the branch's event* · *started · settling* · *What it can pay* · *Opinion · up to about +{n} here* · *against the {faction}* · *Party XP · by the outcome* · *Political Capital · 3 to 15, by the outcome* · *In the paper · your name, tomorrow morning* · *Issue: {issue} · opinion +50 %* · *Close race · +25 %* · *Fired up · better volunteers* · *Roles · {filled} of {n} filled* · *every role matters* · *open* · *{rank2}s and above* · *Needs {n} Energy* · *your best, {stat}* · *Hands · {k} of 4* · *any Rank · 5 Energy · no check; your Energy counts toward the swing* · *Roles still empty at the start go to the branch's volunteers: townspeople run by the game, at half strength. You need not be here when it starts: the result waits for you in a modal and in the paper.* · *{Role} · {n} Energy* · *Join as a hand · 5 Energy* · *Withdraw · {n} Energy back* · *Committed from {time}: the branch is counting on you* · *Ask someone to join* · *Ask to join* · *Asked* · *Signed up* · *You're the {role}* · *{venue}, {time}. The Energy is spent; the rest is the branch's. You need not be here when it starts: the result waits for you.* · *Next: the result, {time}. Withdraw until {time2} if you must.* · *{Outcome} · opinion {swing} · {n} members* · *See your result* · *Call an event · {city}* · *{venue} · {n} roles · {energy} Energy of roles · opinion up to about +{max}* · *go there to call it* · *In 1 hour* · *In 3 hours* · *In 6 hours* · *In 12 hours* · *Call it · {role} · {n} Energy* · *Called* · *The branch has a {event} at {time}* · *{venue}, {time}. You're the {role}. The branch's chat has the line; three more names and it's a rally.* · *Next: ask the branch. Roles still open at the start go to volunteers.* · *One at a time: the branch's {event} at {time} is still open* · *Not from the train* · *Not from the cells* · *Not on rival ground* · *Triumph* · *Success* · *Mixed* · *Fiasco* · *How it went* · *Volunteer · townspeople run by the game* · *half strength* · *Hands · {names}* · *{s} of {n} roles came off* · *; {k} went to volunteers* · *Triumph +{n}* · *first event today* · *second event today, half* · *+{swing} for the {faction} in {place} · your share +{share}* · *Issue points · +{n} on {issue}* · *Three roles went to volunteers. More of the branch on it next time.* · *Next: the branch's event tomorrow is on the Faction tab.* · *Here now* · *you, {names} and {n} more* · *{n} from another party* · *{n} from other parties* · *nobody else just now* · *{n} of the {faction} in town now* · *You and {n} others on this train.* · *Campaign event* · *Find a member* · *Show more* · *here now · {city}* · *online · {place}* · *today* · *this week* · *away* · *in the cells at {place} · {n} min* · *in the infirmary · {n} min* · *on the train to {city} · {n} min* · *in {city} · rival ground* · *+{n} this week* · *Post bail · {n} Iron* · *Visit · 3 Energy* · *Lives in {place}* · *Member since {date}* · *Heroes: {list}* · *Reputation here: {level}* · *Message* · *Mute* · *Unmute* · *Muted · {name}* · *This week* · *All time* · *All cities* · *Who moved the most for the {faction} · {period}* · *Moved* · *Events* · *Moved is opinion won in every city, added up. A District or City Hero is the top of a bracket in one place at the result.* · *Party* · *{city} branch* · *{n} here · {channel}* · *Say something to the branch…* · *Send* · *for you* · *New lines ↓* · *Report this message to the game's moderators?* · *Report* · *Reported* · *One message every three seconds* · *Thirty messages in ten minutes is enough for anyone; back in {n} minutes* · *Said that already* · *{name} has called a {event} at {venue} for {time} · {filled} of {roles} roles* · *The branch's {event} at {venue}: {outcome} · opinion {swing}* · *{name} has been taken in at {place} · bail {n} Iron* · *{name} is in the infirmary · {n} minutes* · *{caller} asks {name} to take the {role} at the {event} · {time}* · *{caller} asks {name} for a pair of hands at the {event} · {time}* · *{name} posted {prisoner}'s bail* · *Post bail* · *A visit* · *{name} is in the cells at {place}, {n} minutes to go. Bail is {iron} Iron; they walk out now and the duty officer notes who paid. You get +10 Party XP.* · *{name} is in the infirmary, {n} minutes to go. A visit is 3 Energy: Health +10 for them and five minutes off the stay. You get +10 Party XP.* · *Already out* · *Not from rival ground* · *You've visited this stay* · *Posted* · *Visited* · *Bail posted* · *{name} is out* · *The duty officer took the Iron, looked at you once and opened the door. The branch remembers these things.* · *−{n} Iron · bail for {name}* · *Next: they're at the station's pin; the chat knows.* · *Grapes and the paper* · *Ten minutes on the ward, the matron pretending not to listen. {name} is sitting up. Five minutes off their stay and ten points of Health; the branch's runner took the parcel.* · *{name}: Health +10, out five minutes sooner* · *Out, on the branch's Iron* · *{name} posted your bail at the desk. Heat is down to 25 and the duty officer has both your names. Say thank you in the chat.* · *Bail {n} Iron · posted by {name}* · *A faction mate can post it from the Faction tab; the branch's chat has been told.* · *Visitors: {names}, Health +10 and five minutes off each* · *You're the {role} at {event}, {time}. You were counted before you came in; the result waits for you.* · *Called off* · *Nobody came* · *No one signed up by the start, so the {event} at {venue} didn't happen. Nothing was spent. Ask in the chat before you call the next one.* · *Next: call another from the Faction tab.* · *Today: the branch's {event} on {venue} · settles at {time} · {filled} of {roles} roles* · *join as a hand · 5 Energy* · *No event in {city} today. {rank3}s can call one on the Faction tab.* · *Signed up: the {event} at {venue}, {time} · {role}* · *No results here yet. The first is tomorrow morning.* · *You're the branch for now. New members arrive at the station; the paper will say.* · *Nobody has moved anything this week yet. Opinion won in any city counts here.* · *Nothing said yet. The branch's lines land here: events called, results, who needs bail.* · *Nobody signed up by the start. Nothing happened and nothing was spent.*

## 12. Settled for the build (3 Oct 2026; `slice-6-together.md` §20)

- **Modal order on a read:** a run-in, then the held release, then event results oldest first, then the orders-complete note.
- **The nudge** (§2.3, §3.1): any member signed up to an open event with a free place may ask a mate not on it; the line names the first open named role they may take, or *a pair of hands*.
- **The call sheet in the capital** lists the open district's events (client memory, GDD §14.13); the call carries the district.
- **Chat** has three chips per faction (Party, the home branch, the Irongate branch); no *Other branches* menu.
- **The scoreboard** shows ten rows a bracket; the member's own row below when outside them.
- **The Grand Rally's role rows** read *Usher* (×2), never *Steward*.
- **The receipt's Rested example** is +38 on a 15-Energy role.

Help notes (tap the label; the review-1 pattern): **Campaign event** · *An event the branch does together: a few roles, each on someone's stats, and one result for all of you. Sign up ahead; you need not be there when it starts.* · **Volunteers** · *Townspeople run by the game. They fill any role still empty at the start, at half strength, so an event always happens; a member in the role does better.* · **Here now** (§6.1) · **Hands** · *A place on any event for anyone, 5 Energy, no check. Your Energy counts toward how far the event moves opinion, and you're paid like everyone else.* · **Scoreboard** · *Opinion won in every city, added up, for this week or for good. The top three of each Level bracket are marked.* · **Chat** · *The branch's room. Party is everyone; the city branch is who's here. Mute anyone from their profile; report a line with a long press. Hide chat from the Me tab if you'd rather.*

British English, no exclamation marks, no percentages for odds, times in the player's local clock.

---

## 13. Review 4 addendum (6 Oct 2026)

- **§2.3, `MemberStatus`:** *in the cells at Harbour Police · out in 24 min* · *in the infirmary · out in 12 min* · *on the train to Irongate · arrives in 8 min* (GDD §2.2's countdown style).
- **§7.1, `FavourSheet`:** also opened from the police station's ***In the cells now*** card (slice 5 §13 addendum), on a faction mate's row; the Legal Aid guard reads *Legal Aid · the Alliance pays half your bail*.
- **§7.2, the held screens:** the sentence lines are the review-4 ones (no *You can close the game*); under *Pay bail* the Courier line stands.
