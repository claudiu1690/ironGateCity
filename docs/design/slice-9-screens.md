# Slice 9 — "Launch readiness": the screens

Game designer, 4 Oct 2026. The screen-by-screen spec for slice 9: the Settings sheet, the report flow, the rename flow (the player's own and the forced one), the muted state, the suspended and closed screens, a note from the editor, the feedback form, the moderator console, the audit's lines on a count, the onboarding fixes (purpose lines, empty states, *While you were away*), the maintenance screen and closing an account. Rules and numbers are in `docs/design/slice-9-launch.md` (cited as *design §n*). Where a slice-1 to slice-8 screen already does the job it is named and only the change is given.

**Phone first** (375 wide, supported from 360), desktop as the existing screens. **Every string a player reads is in everyday words** (GDD §1.5, design §1.1): no *moderation*, *ban*, *flag*, *alt*, *multi-account*, *telemetry*, *analytics*, *accessibility*, *WCAG*, *cohort*; a player is *muted*, *suspended* or their account is *closed*, and votes are *set aside after the audit*. The console (§9) is a moderator's screen and may use *linked* and *set aside*, never *cheater*.

## 1. The look, and what already exists

The printed-matter look of slices 1–8. Components reused as they are: `HudBar`, `BottomSheet`, `Button`, `Stamp`, `ResultModal`, `LettersRow`, `ProfileSheet` (gains **Report this name**), `HelpButton` and the help notes, `Picture`, `ArtHeader`, the paper's rows, the Me tab's rows, `JobsCard` (the Settings rows are its shape), the count view (`CountTable`).

New components (plain props, no tRPC): `SettingsSheet`, `SettingRow` (a label, a help note, a two- or three-way chip), `ReportSheet`, `RenameSheet`, `MutedComposer` (the chat composer's muted state), `SuspendedScreen`, `ClosedScreen`, `EditorNoteRow` (a `LettersRow` kind), `FeedbackSheet`, `StampScale` (five stamps 1–5), `PurposeLine`, `EmptyLine`, `AwayRow` and `AwayDigest`, `MaintenanceScreen`, `CloseAccountSheet`, `AuditLine` (on a count), and the console's `ModShell`, `QueueList`, `ReportCard`, `AuditPage`, `AccountPage`, `LogList`, `MetricsPage`.

---

## 2. Settings (`SettingsSheet`; design §7)

Reached from the **Me tab's foot**: three text buttons in a row under the last block, Courier 12 px, always in the same place on every screen size (3.2.6): **Settings** · **Tell us how it's going** · **The rules**. Desktop: the same foot in the Me column.

A `BottomSheet` at 70 dvh (desktop: the side sheet at 480 px); title *Settings*; rows 56 px, each a `SettingRow`: the label in body 600 15 px with a dotted underline (the help note), the choice as chips at the right (Oswald caps 11 px, 36 px high, the chosen one inverted). One tap changes the row; no save button; the sheet closes on the chevron.

| Row | Chips | Help note (two lines, the paper's voice) |
|---|---|---|
| **Motion** | *As the device says* · *Reduced* | MOTION · Reduced keeps the clouds still, cuts the map's zoom to a step and fades every sheet instead of sliding it. |
| **Text size** | *Standard* · *Large* | TEXT SIZE · Large makes the reading text a fifth bigger. Headlines stay as they are. |
| **Map at night** | *As the clock says* · *Always daylight* | MAP AT NIGHT · The city's night picture from eight till six. Daylight shows the day picture all the time; the night's rules still apply. |
| **Clouds** | *On* · *Off* | CLOUDS · The weather drifting over the map. Off saves a little on an old phone. |
| **Chat** | *Shown* · *Hidden* | CHAT · The branch's room on the Faction tab. Hidden takes the chip away; nothing in the game needs it. |

Under the five rows, a thin rule and three Courier 12 px lines: ***Change your name*** (→ §4; dimmed with *from {date}* inside the 30 days) · ***Close your account*** (→ §13) · ***Usage figures help us balance the game. They never include what you write.*** with a text button **Privacy** (→ `/privacy`). Under those, the version line in paper-3: *Irongate City · {version}*.

**Applied at once:** the client sets `data-motion`, `data-text`, `data-night`, `data-clouds` on the root; the map reads the night and clouds flags; chat reads the hidden flag (slice 6's `chat.hidden`, moved here). The choice is stored on the character (design §13 Q11) so a phone and a desktop agree.

---

## 3. Reporting (`ReportSheet`; design §5.2)

**From a chat line:** a long press on the line, or the row's overflow (a 44 px *⋯* at the right of every member line, paper-3) → a two-row menu (*Report this* · *Mute {name}*). **From a profile:** `ProfileSheet` gains a text button **Report this name** at its foot beside *Mute*.

The sheet (a `BottomSheet` at 60 dvh): title *Report this*; under it the thing reported in a paper-2 box (the line in body 14 px with the author's name and the time; or the name alone, Playfair 18 px); then four rows 56 px, each a reason in body 600 15 px with a Courier 11 px second line:

- **Abuse or harassment** · *Threats, insults, going after someone.*
- **Real-world politics or hate** · *Real parties, leaders, slogans or symbols; slurs.*
- **Spam or selling** · *Repeats, links, or anything offered for a vote.*
- **Something else** · a text field of 200 characters opens under the row.

A tap on a row sends (the fourth sends on **Send**). The sheet closes to a one-line toast at the foot of the screen for three seconds, Courier: ***Thanks. Someone will read it.*** The eleventh of the day: ***That's enough for today. Thank you.*** (and the sheet does not open). Reduced motion: the toast appears and goes.

When a report leads to an action, the reporter's next paper carries a Letters row (`EditorNoteRow`, kicker **FROM THE EDITOR**): ***A line you reported was dealt with.*** No tap.

---

## 4. Changing a name (`RenameSheet`; design §5.4)

**The player's own:** from Settings → a `BottomSheet`: title *Change your name*; a Courier line *Once every 30 days. The papers already printed keep the old one.*; the field with the sign-up rules under it (2–40 characters; the same error lines as sign-up: *Your name can't be blank* · *Your name needs at least 2 characters* · *Your name can have at most 40 characters* · ***That name can't be used. Try another.***); one button **Change it**. On success the sheet closes, the HUD shows the new name, and a toast reads *You're {name} now.* No modal.

**A forced rename:** the root route shows the same sheet **before anything else** at sign-in, not dismissible, with a different title and a reason line in the failure colour's ink:

- Title ***Your name needs changing***
- Reason: *It breaks the rule on real-world politics.* / *It matches a name the game uses.* / *It's abusive.*
- Courier under it: *Until then you're listed as A Newcomer.*
- The field and **Change it**, as above.

On success the sheet closes to wherever the player was going (the paper if due). Nothing else about the account is different; the 30-day clock for the player's own change starts from this change.

---

## 5. Muted (`MutedComposer`; design §5.3)

In Chat the composer is replaced by a 56 px paper-2 row: ***Muted until {weekday} {time}*** in Courier, and under it *You can read the room; you can't post. Reply to the moderators from the Me tab.* The lines still scroll; the system lines still carry their buttons; everything else in the game is untouched. The Me tab's foot gains a fourth text button while muted or after any rung: **Reply to the moderators** (→ §6.2's reply sheet). The paper carried the rung's note the morning it happened (§7).

---

## 6. Suspended and closed (`SuspendedScreen`, `ClosedScreen`; design §4.6, §5.3)

Both replace the app after sign-in; the HUD is not shown; nothing else is reachable but *Sign out*, *The rules* and the reply.

### 6.1 Suspended

`ArtHeader` with `court.png` (the court's stone steps, no symbol) cropped to 180 px; the stamp **SUSPENDED** in the ink tone across its lower edge; then on paper:

- Playfair 22 px: ***Suspended until {weekday} {d Month}***
- Body 15 px: *{Reason}.* (one of the policy's lines: *A line you wrote broke the rule on real-world politics.* / *Something you wrote went after another player.* / *Something was offered for a vote.* / *Another account was used to get round a mute.* / *Something you wrote was spam or selling.*; design §17.2)
- Courier 12 px, three lines: *Nothing of yours is touched. Your Energy fills, Rested banks, your wage lands, your rent runs. Any office you hold falls to its usual stand-in until you're back.*
- Buttons: **Reply to the moderators** (§6.2) · text **The rules** · text **Sign out**.

### 6.2 The reply (`BottomSheet`)

Title *Reply to the moderators*; a Courier line *One reply per decision, up to 500 characters. Someone will read it within a week.*; the field; **Send**. After sending, the row reads *Sent {d Month}. You'll hear in the paper.* The answer is a Letters row (*The moderators have read your reply. The suspension stands.* / *…is lifted.*), or, for a closed account, an email.

### 6.3 Closed

`ArtHeader` with `station.png` (the last train, the platform at night) and the stamp **CLOSED**; Playfair ***This account is closed***; body *{Reason}.*; Courier *If you think this is wrong, reply once below. Otherwise there's nothing more to do here.*; **Reply to the moderators** (one reply, then the row reads *Sent.*) · text **Sign out**. A closed account's own closure (§13) shows the same screen with the line *You closed this account on {d Month}. Signing in again before {d Month + 30} opens it again.* and a button **Open it again**.

---

## 7. A note from the editor (`EditorNoteRow`; design §5.3)

A `LettersRow` kind with the kicker **FROM THE EDITOR** and the newsroom scene's 56 px crop at the left (`newsroom.png`). Line 1 in body 600: *A word about the room.*; line 2 in Courier: the rule in the paper's voice, at most two lines: *Real-world politics, parties and slogans stay outside the game's. The factions here are the game's own.* / *Keep it about the game: no going after other players.* / *Nothing is offered for a vote here, not Iron, not favours.* / *Links and selling stay out of the room.* A tap opens the full policy (§2's *The rules*). The row stays until opened, then leaves with the edition. **It is a note, not a sanction**: the rung is the moderator's choice and this row is its gentlest form.

---

## 8. Tell us how it's going (`FeedbackSheet`, `StampScale`; design §9.3)

From the Me tab's foot, and from the weekly Letters row (kicker **FROM THE EDITOR**, line 1 *How's it going?*, line 2 *Five stamps and a line, if you've a minute.*; the row on days 7, 14, 21 and 28, and the morning after a first seat).

A `BottomSheet` at 90 dvh (desktop: a centred card at 640 px); `ArtHeader` with `newsroom.png` at 120 px; title *Tell us how it's going*; a Courier line *Five stamps, one line, nothing else. It goes to the people making the game, not to the branch.*

Six blocks, each 88 px: the statement in body 600 15 px and under it a `StampScale`: five 44 px stamp outlines in a row, labelled *Not at all* at the left end and *Very much* at the right in Courier 10 px; a tap inks the stamp (the slice-1 stamp's look, 1–5 as a number inside); one at a time per row.

1. *Spending your Energy is fun.*
2. *You know what to do when you open the game.*
3. *Elections matter to you.*
4. *A run-in or the cells is exciting rather than annoying.*
5. *You've something you're working toward this month.*
6. *What would make you come back tomorrow?* — a field, 500 characters, optional.

One button **Send** (enabled when all five stamps are inked); then a toast *Thank you. It's read.* and the sheet closes. A second send in the same week replaces the first. Muted players see the five stamps and no field. The filter's refuse list applies to the field (*That can't be said here.* under it, the stamps still sent).

---

## 9. The moderator console (`ModShell`; design §5.7, §4.5)

Route `/mod`, for `role: moderator | admin` only; a player who types it sees the ordinary 404 page. **Its own chunk**; the game's HUD is not shown; a thin ink band at the top reads *Irongate City · Moderation · {your name}* with four tabs (and **Metrics** for admins): **Queue · Audit · Accounts · Log**. Desktop first (1024 and up: a list at the left, 360 px, the item at the right); on a phone the list fills the screen and an item opens over it. The look is the game's paper and type, plainer: no stamps, no scenes beyond `ministry.png` cropped behind the band.

### 9.1 Queue (`QueueList`, `ReportCard`)

The list: one row per report, 64 px: the reason as a kicker (**ABUSE** · **REAL-WORLD** · **SPAM** · **OTHER** · **FILTER** for a flagged line · **VOTE-BUYING** for the pattern), the first 60 characters of the line, the reported name, the reporter's name, the age (*2 h*), and the state as a small word at the right: ***New*** (ink) · ***In review*** (the Alliance blue) · ***Dealt with*** · ***No action*** (both paper-3). Filters along the top: state, reason, faction, *older than a day*. Sort: oldest first. A row with a second-pair-of-eyes need (a report about the moderator's own faction's member) carries a Courier line *Needs another moderator*.

The card: the line in a paper-2 box with its context (**up to twenty lines before it and the lines after it that existed when it was reported, at most forty**; the reported one marked), the channel and the time; the reporter's reason and free line; the reported account's **rung history** (*Note · 2 Oct · real-world* …) and its **notes** (a link found, a burst); the reporter's standing (*3 reports this week · 1 baseless*). Buttons in a row, 44 px: **Take it** (→ *In review*, your name on it) · **No action** · **Note** · **Mute 24 h** · **Mute 7 d** · **Suspend 3 d** · **Suspend 14 d** · **Close** (admin, or a second moderator's confirm) · **Rename**. Every sanction opens a one-line confirm with the **reason picker** (the policy's lines, one tap; the player reads this line) and an optional note for the log. *Dealt with* is set by any sanction; the reporter's paper line is queued.

### 9.2 Accounts (`AccountPage`)

Search by name or email (exact or prefix). The page: the public profile as the player's mates see it (the slice-6 sheet) plus, below a rule: the account's **state** (*Clear* / *Muted until…* / *Suspended until…* / *Closed*), **rung history**, **notes** (the audit's: *Linked: same device with {name}* · *Linked: same network, interleaving, with {name}* · *Burst: 5 accounts from one network, 28 Sep* · *Report pattern: 3 baseless this week*), the **links** as a list of names with the kind and the evidence window (never an address), and the **ballots set aside** this term (a count, with the election). Buttons as the card's, plus **Unlink** (with a reason; the pair only) and **Leave a note for the moderators**.

### 9.3 Audit (`AuditPage`)

The current or last national count. The header: *The republic's count · term {n} · counted {weekday} · {confirmed {time} by {name} / confirms itself at midnight / confirmed automatically}*. Then the **provisional result** as the slice-7 score table (every party's score, seats, the President), with a line under it ***{n} votes set aside: {m} from linked accounts*** and, where any, ***Noted: {k} bursts, {j} backing rings*** each a row that opens the set (names, the kind, the evidence window). Buttons: **Confirm now** · **Set aside this set** (on a noted row; a reason) · **Unlink** (on a linked row) · **Recount a council** (a picker of councils counted in the last 24 hours; shows the before and after seats; **Recount**). Below, a list of the last ten audits with their outcomes. The council recount's result view in the game marks the changed seat *after a recount* (§10).

### 9.4 Log (`LogList`)

Every action, newest first: the time, the moderator, the action, the account, the reason, the note; a filter by moderator and by action; **Export** (CSV) for admins.

### 9.5 Metrics (`MetricsPage`, admins)

The `report:metrics` tables of design §2.3 rendered as plain tables with the model row where one exists, a date range picker and a faction filter. No charts in the MVP.

---

## 10. The audit's lines on a count (`AuditLine`; design §4.4, §4.5)

- **The Courier's day-27 line** (slice 7) stays: *The republic's count: {party} leads · to be confirmed tomorrow.* The **day-0 line**: *The count is confirmed.* / *The count is confirmed; {n} votes were set aside after the audit.* Never a name.
- **Every count view** (the district's, the city's, the Chair's, the republic's) gains, when n > 0, a Courier 11 px line under its table: ***{n} votes set aside after the audit.*** with the dotted **audit** label (the help note of design §6.4).
- **A recount**: the count view's header reads *Recounted {weekday}* and the changed seat's row carries *after a recount* in Courier; the paper prints one line in the city's voice: *{Name} Takes the Seat After a Recount* / *{Name}'s Seat Goes to {Other} on the Recount*. The ballot's own receipt (*Your vote: {name}*) never changes.

---

## 11. Onboarding fixes (design §6)

### 11.1 Purpose lines (`PurposeLine`)

One Courier 12 px line in paper-3 under the screen's kicker, full width, shown until the player's first act on that screen; it leaves without animation (a fade under motion). Never a tap target. The lines:

| Screen | Line |
|---|---|
| The city map (the quarter view) | *Tap a place to see what you can do there. Your orders mark three.* |
| The city overview (quarters or districts) | *Tap a quarter to go in. Locked ones open as you level.* |
| A place's sheet | *Each ticket is one thing to do here. Good odds means it usually comes off.* |
| The paper | *What changed since you last looked. Tap anything underlined for what it means.* |
| The Me tab | *You, your record and your kit. A point to place waits here.* |
| The Faction tab · Orders | *Today's three from the branch. Done or not, they're new tomorrow.* |
| · Events | *The branch does these together. Sign up now; you needn't be here when it starts.* |
| · Members | *Who's in the branch and where they are. Tap a name for their page.* |
| · Scoreboard | *Opinion won, added up, this week and for good.* |
| · Chat | *The branch's room. Optional, always.* |
| The nation map | *Tap a town for the train. Your home and the capital are always in view.* |
| The council | *Who sits, what rule they're voting on, and when the next election is.* |
| Parliament | *Sixty seats, the laws up for a vote, and how your party is voting.* |
| The Chair's desk | *Set the party's orders for the morning. They repeat until you change them.* |
| The Dossier | *What you've learned about the republic's names. Three on one name make a Case File.* |
| The Wardrobe | *What you wear is your Charisma. One tap changes the outfit.* |
| The journey screen | *The train runs whether you watch or not. Come back when it's in.* |
| The cells · the ward | *You're held a while. Wait, or pay; nothing of yours is lost.* |
| An event's page | *Pick a role you can hold, or a pair of hands. The result comes to the paper.* |
| Settings | *Only what helps you read and play. Nothing here changes the rules.* |

### 11.2 Empty states (`EmptyLine`)

A Courier 12 px line in paper-3, centred in the empty panel's first 56 px, from design §6.3; every list in the client has one, and the QA audit asserts it. New lines are in design §6.3; existing ones (slices 6–8) stand.

### 11.3 *While you were away* (`AwayRow`, `AwayDigest`; design §6.6)

Above the headlines after two or more days away: a row in the paper's style with the kicker **WHILE YOU WERE AWAY** (or **WELCOME BACK** after 30 days), four lines at most in body 14 px, each from an existing template: *{n} days.* · the republic's line · the city's line · the branch's line · *Banked: {iron} Iron in wages, Rested {n}{, {k} letters waiting}.* A chevron opens `AwayDigest` (a `BottomSheet` at 90 dvh): the missed editions folded by day (*Thursday 2 October* as a rule, then that day's headlines as rows), newest first, read-only. After 30 days the row's first line reads *Welcome back.* and the Rested line reads *Rested: full.* The row is one per return and leaves with the edition.

---

## 12. The presses are stopped (`MaintenanceScreen`; design §10 #14)

Shown by the client when the API answers the maintenance status (and by the static host when the API is down for a deploy): `ArtHeader` with `station.png` at 180 px, the stamp **STOPPED**; Playfair ***The presses are stopped***; body *Back at {time}.* (or *Back shortly.*); Courier *Your Energy fills and your wage lands meanwhile. Nothing is lost.*; a text button **Try again**. No HUD.

---

## 13. Closing an account (`CloseAccountSheet`; design §5.5)

From Settings: a `BottomSheet`: title *Close your account*; body *This closes your account for good. Your character, their offices, their kit and their Iron go with it. For 30 days you can sign in and open it again; after that it's gone.*; a field labelled *Type CLOSE to confirm*; the button **Close my account** (the failure colour's outline; enabled when the field reads CLOSE). On confirm: signed out to the login screen with the line *Your account is closed. Sign in before {d Month} to open it again.* Signing in within 30 days shows §6.3's variant with **Open it again** → the toast *Welcome back. Your account is open again.*

---

## 14. Phone, desktop and what sits above the fold

On 375 × 667: Settings shows the title and four rows above the fold (the fifth and the foot on scroll); the report sheet shows the thing reported and all four reasons; the rename sheet shows the field and the button with the keyboard up; the suspended screen shows the header, the title, the reason and the three Courier lines, the buttons on scroll (desktop: all in one card at 640 px); the feedback sheet shows the title and the first two blocks, **Send** sticky at the foot; the away row is at most 120 px folded; the muted composer is the composer's 56 px. The console on a phone: the list full width, an item over it with a back chevron; the audit's score table scrolls sideways under 360 px as slice 7's does. Matrix: 360 × 640, 375 × 667, 390 × 844, landscape, 1440 × 900.

**Reduced motion:** every sheet fades; toasts appear and go; the purpose line goes without a fade; the stamp scale inks without a bounce.

**Keyboard and screen readers (design §7):** every chip row is a radiogroup with the row's label as its name; the stamp scale a radiogroup 1–5 with *Not at all* and *Very much* as the end labels; the report's reasons a list of buttons; the suspended screen announces its title once; the console's lists are tables with headers.

---

## 15. Strings to `copy.ts`, and alt texts

Every string above goes to `copy.ts` under `settings`, `report`, `rename`, `moderation` (the player-facing rungs and reasons), `feedback`, `away`, `maintenance`, `closeAccount`, `purpose`, `empty`, `audit`; the console's strings under `mod`. The policy's twenty lines are a content file (`policy.ts`) rendered at `/policy` and in the sheet. The reasons a moderator can pick are the same `copy.moderation.reasons` the player reads, so no free text ever reaches a player.

Alt texts (≤ 160; existing pictures, written against them): `court.png` on the suspended screen: *The stone steps and columned doorway of a courthouse at dusk, the doors shut, a lamp lit above them.* · `station.png` on the closed and maintenance screens: *A railway platform at night under a glass roof, the last train standing with its lamps lit and nobody boarding.* · `newsroom.png` on the editor's note and the form: *A newspaper office at night: desks under hanging lamps, a typewriter, galley proofs pinned to a board.* · `ministry.png` behind the console's band: *A ministry's grey façade with tall windows and a flag-less pole, seen from the street in rain.*

---

## 16. Settled for the build (4 Oct 2026; `docs/design/slice-9-launch.md` §17)

- **§6.1's reasons are five**: the four written plus *Something you wrote was spam or selling.*; the full table, with the three rename reasons, is design §17.2.
- **§9.1's context** reads *up to twenty lines before it and the lines after it that existed when it was reported, at most forty*.
- **The sign-up form** gains, while invite mode is on, an *Invitation code* field above the button with its help line, and under the button the terms line; **the login form** gains *Forgot your password?* and its two sheets (design §17.3, §17.4). Layout: on 375 × 667 the fields and the button stay above the fold with the keyboard down; the terms line may sit under the fold.
- **The not-found page** (design §17.5): the paper's look, no HUD, one button.
- **The *Post bail* sheet** (slice 6 screens §2.3) gains one Courier line: *Posting bail pays +10 Party XP, up to three times a day.*; a bail that pays none shows *Party XP · none today* on its receipt.
- **The suspended screen's office line**, when the player holds any office: *Your {office} is kept for you; its duties fall to the usual stand-in until you're back.* (a suspension vacates nothing).
- **The closed screen** for a moderator's closure adds nothing; a self-closure's variant is as written in §6.3.
