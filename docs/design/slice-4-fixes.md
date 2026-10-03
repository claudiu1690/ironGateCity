# Slice 4 — QA fixes: the designer's decisions (3 Oct 2026)

Game designer, 3 Oct 2026. Answers to the rules and player-text points in `docs/qa/slice-4-report.md` (M2, m1–m5, m9, n2, n4, and the `keep.ledger-page` gate). Each point below is a decision, a reason, and the exact strings and ids to paste. The GDD edits are listed in §10; the design documents (`slice-4-battleground.md`, `slice-4-screens.md`) carry the same rules where they belong.

**Applied by the designer in this change** (content and the design tables the tests read, so the word-for-word tests stay green): m3 (the three seat headlines), m4's help note and `hl.ig.battleground` deck, m9 (the capital's *How elections work* note), `keep.ledger-page` (with the item count and the slice-2 exclusion in `packages/content/test/slice2.content.test.ts` l. 63–64 and 388–389), and the `it.fails` marker of m3 in `packages/content/test/qa.slice4.test.ts`. The content package and the rules QA file run green with these (172/172 and 21/21). **For the developer:** M2, m1, m2, m4's first-arrival count, m5, n2, and the small doc rows named under each (they change code or a server-filled token). Where a design table is read by a test, change the table and the content in the same commit.

---

## 1. M2 — moving residence while on a ballot: **refuse the move until the result**

**Decision.** While the member's name is **on a ballot** (polls open) in the place they live, a move is **refused** and the residence card says so and names the day. Nothing is struck, no vote is lost, and nothing odd prints the next morning. The same rule between two districts of the capital. A candidacy still **filed** (nominations open) is withdrawn at the move as before (the deposit stays with the branch, the sheet warns); a seat held is vacated as before.

**Why (over QA's (b)).** (a) striking the name loses votes already cast, which is a cost to other players; (b) letting the name stand and handing a seat it wins to the branch keeps the ballot honest but prints a morning paper saying a member won a seat they cannot take, and the Election card would show *you: elected* for a seat the player never sits in: two things to explain for a rule that fires rarely. (c) is one sentence a player understands at once, the wait is at most three days (polls are days 2–4; the count is the boundary into day 0) and the card names the day. It costs nobody an asset. Recorded as GDD Appendix C #61 with (b) as the lever if the wait ever reads as a wall.

**Rule, precisely.**
- `ON_BALLOT` is checked after `MOVE_COOLDOWN` and before `NOT_ENOUGH_IRON`: `here → belowRank → cooldown → onBallot → noIron`. (If the cooldown runs past the count, the card shows the cooldown line; the two never show together.)
- "On a ballot" = a `Candidacy` with `status: 'standing'` for the election of the residence (city, or district in the capital) whose polls are open today. A `filed` candidacy is not a bar: it is withdrawn at the move, as built.
- The day the player can move: **the count day**, i.e. the next cycle day 0 of the residence city's offset (the result morning). `canMoveFromDay` on the card carries that day.
- Applies to every move: home → capital, capital → home, district → district.
- `oldPlaceStakes` should also look for `standing` so the server's refusal and the card agree; the sheet never shows for an on-ballot member because the button is absent.

**Strings.**

| Where | Id | Text |
|---|---|---|
| Residence card, new state `onBallot`, line 1 | `copy.residence.youLiveIn(place)` | *You live in Coalport* (as now) |
| Residence card, state `onBallot`, line 2 (Courier) | `copy.residence.onBallotLine(place, weekday)` | *You're a candidate in {place} until the result · you can move from {weekday}* |
| Button | — | none |
| Refusal (a request that arrives anyway), `GameError('ON_BALLOT', { canMoveFromAt })` | `copy.errors.onBallot` | *You're a candidate where you live until the result. You can move after it.* (fix round: *ballot* is a system word, review 2 §1.13; approved 3 Oct 2026) |

`{place}` is the residence as the card already names it (*Coalport* / *Eastside*). `{weekday}` is `weekdayName(countDay)`.

**Types.** `ResidenceCardView.state` gains `'onBallot'` (with `canMoveFromDay`); `GameErrorReason` gains `'ON_BALLOT'` (`PRECONDITION_FAILED`).

**Screens §6.1 row to add** (added in `slice-4-screens.md` by this change):

| State | Line 1 | Line 2 | Button |
|---|---|---|---|
| On a ballot where you live (polls open) | You live in Coalport | You're a candidate in Coalport until the result · you can move from Sunday | none |

**Tests.** QA's two `it.fails` in `apps/server/test/qa.slice4.residence.test.ts` (M2) expect the sheet's *give up* line and a withdrawal; under this rule they become: the card is `onBallot` with no button, `register` is refused with `ON_BALLOT`, the candidacy stays `standing`, and at the count the member (still resident) is seated normally. Rewrite the two to that and drop the markers.

---

## 2. m1 — slot-C order titles for a capital resident: `{city}` and `{verbs}`

**Decision.** The three slot-C templates per faction stay shared (`residence: 'any'`, the loader's rule) and take two placeholders resolved at read, where `{issue}` is resolved today (`views.ts` `fillTemplate`, now on the **title and the line**):

- **`{city}`** → the residence city's name: *Coalport*, *Duskwall*, *Ashford*, *Irongate*. Allowed on any template.
- **`{verbs}`** → the verbs of the residence city's **training actions the member may take** (a members-only gymnasium counts only for its faction's members), distinct, in the fixed order **Study · Lift · Unload · Carry · Run**, at most three, the first capitalised and the rest lower-case, joined *a, b or c*. Allowed only on a template whose match is `kinds: ['training']`. Expected: Coalport and Duskwall *Study, lift or run*; Ashford *Study, unload or run*; Irongate *Study, carry or run* (a Vanguard member in Irongate: *Study, lift or carry*).

Why placeholders and not capital twins: the loader requires a slot-C rotation order to serve every residence (`slice4.content.test.ts` l. 349–358), and twins would double nine templates to fix one word. Why `{verbs}` as well as `{city}`: review 3 made the training order name the verbs, and *Study, unload or run once in Irongate* would name a thing that does not exist there.

**Templates (`packages/content/src/data/orders.ts`).** Titles with the placeholders; three lines reworded so they name no home place (the others were already residence-neutral).

| Id | Title | Line |
|---|---|---|
| `dir.sharpen-up` | `{verbs} once in {city}` | `A tired organiser is a bad one. An hour's training, anywhere in {city}; the pin says where.` |
| `dir.full-day` | `Six wins anywhere in {city}` | `Six wins before the paper goes to bed.` (unchanged) |
| `dir.five-in-the-book` | `Five attempts anywhere in {city}` | `Five entries in the day book, win or lose. Volume is the point.` (unchanged) |
| `dir.v.sharpen-up` | `{verbs} once in {city}` | `A soft organiser is no use to me. An hour's training, anywhere in {city}, and I will know if it was skipped.` |
| `dir.v.full-day` | `Six wins anywhere in {city}` | `Six wins before lights out.` (unchanged) |
| `dir.v.five-in-the-book` | `Five attempts anywhere in {city}` | `Five entries in the day book. I read it every night.` (unchanged) |
| `dir.a.sharpen-up` | `{verbs} once in {city}` | `A tired helper is a bad one. An hour's training, anywhere in {city}; the pin knows where.` |
| `dir.a.full-day` | `Six wins anywhere in {city}` | `Six wins before the evening edition.` (was *before the Gazette goes to bed*: the capital's paper is the Herald) |
| `dir.a.five-in-the-book` | `Five attempts anywhere in {city}` | `Five lines in the day book, and I count the lines.` (unchanged) |

**Also fill** `{ordersTitle}` in `hl.*.orders-call` (it prints a title), the result modal's *Order carried out* line and the all-done modal if they print a title, and the dev panel's order list.

**Loader checks to add:** `{verbs}` only on a `training` template; no unknown placeholder in a title or line (`{issue}`, `{city}`, `{verbs}` are the set).

**Docs and tests to change in the same commit:** `docs/design/review-3-answers.md` l. 215 (`orders:` line, read by `packages/content/test/review3.ts`) becomes `orders: dir.sharpen-up '{verbs} once in {city}' · dir.v.sharpen-up '{verbs} once in {city}' · dir.a.sharpen-up '{verbs} once in {city}'` and l. 125 gains the sentence *(3 Oct 2026, QA m1: the title is now `{verbs} once in {city}`, resolved at read to the residence city, so a capital resident reads Study, carry or run once in Irongate.)*; `packages/content/test/qa.content.test.ts` l. 190–197 (the three expected titles); the slice-1 and slice-2 design tables if a test still compares the full-day lines (`slice-1-content.md` §6, `slice-2-cities.md` §1.5 and §2.5: the *A full day* rows); `docs/economy.md` l. 513 already says `{city}`. The QA `it.fails` for m1 in `apps/server/test/qa.slice4.issues.test.ts` then passes: drop the marker.

---

## 3. m2 — the *Speak on this week's Issue* order's pin

**Decision.** An `issueTagged` order points at **the first place, in the residence city's pin order, with an action tagged by the city's first Issue this week** (the Issue `{issue}` names) that the member may take (members-only actions only for members). If the first Issue tags nothing the member can take (not the case with the current deck), the second Issue. In the capital the pin's tap opens **the district view of that place** with the tagged tickets highlighted, as every capital order pin does. The rule is the same for any city; in slice 4 only capital residents get an Issue order.

Why the first Issue and not the nearest: the order's line names it (*The Herald says the capital is arguing about the tram fares*), so the pin should match the sentence; the second Issue's tickets wear the *Issue* tag anyway and count too.

**Expected pins** (derived from §4.3's pin order and §9.5's feeds; for QA to check, the code derives them):

| First Issue | Pin | Place |
|---|---|---|
| Tram Fare Hike | 13 | Market Square |
| Press Raids in Old Town | 7 | Herald House |
| Eviction Notices in Eastside | 19 for Collective members (Union House's duplicator); 20 for everyone else | Union House · Riverside Quays |
| The Ministry Cuts | 1 | Parliament |
| Curfew on the Hill | 26 | Police Headquarters |
| Bread Queues at the Market | 13 | Market Square |
| Strike at the Quays | 20 | Riverside Quays |
| The Opera Gala | 1 | Parliament |
| Fever at St Agnes | 9 | Basilica Square |
| The Census on the Hill | 26 | Police Headquarters |
| Men at the Labour Exchange (Station & Market) | 13 | Market Square |
| The Price of Coal (Eastside) | 23 | Foundry Row |
| Lights Out (Old Town) | 7 | Herald House |

**Implementation note.** `orderPin`'s descriptor needs the live Issue ids that tag each action (the same `issueIds` the ticket tags come from), so `orderMatches` with `issueTagged: true` can match; iterate the first Issue's tags before the second's. QA's `it.fails` for m2 in `qa.slice4.issues.test.ts` then passes: drop the marker.

---

## 4. m3 — the Herald's seat headlines (applied)

Reworded, never article logic. Headline style drops the article anyway, so *in Government Quarter* is fine beside *in Eastside*.

| Id | Was | Now |
|---|---|---|
| `hl.ig.seat-won` | {name} Takes a {district} Seat for the {faction} | **{name} Takes a Seat in {district} for the {faction}** |
| `hl.ig.seat-lost` | {name} Misses a {district} Seat by {margin} | **{name} Misses a Seat in {district} by {margin}** |
| `hl.ig.voted-won` | Your Vote Counted: {voted} Takes a {district} Seat | **Your Vote Counted: {voted} Takes a Seat in {district}** |

Applied in `packages/content/src/data/heraldHeadlines.ts` and in `slice-4-battleground.md` §12 (the table the headline test reads); the m3 `it.fails` in `packages/content/test/qa.slice4.test.ts` is now a plain `it`. The other district templates (*the {district} Seat*, *the {district} list*, *Seat in {district}*, *{district} Is a Close Race Today*) already read well for every name.

---

## 5. m4 — "close race" wording (help note and deck applied; the first-arrival count for the developer)

The rule (GDD §14.4) is **the top two within ten points**. Three strings:

| Where | Id | Text |
|---|---|---|
| Help note (applied: `copy.capital.help.closeRace`, screens §11) | `copy.capital.help.closeRace` | **Close race** · *The two parties in front are within ten points of each other here today. Party work in a close race pays +25 % Party XP, moves opinion +25 % and has better odds.* |
| Herald, resident's district is a close race (applied: content and design §12) | `hl.ig.battleground` deck | *The two leading parties are within ten points of each other. Party work here pays +25 % Party XP and moves opinion +25 %.* |
| Herald, first arrival (**developer**: a server-filled token) | `hl.ig.first-arrival` deck | *Off the {origin} train into Station & Market. Five districts, {closeRaces}. The tram is free.* |

**`{closeRaces}`** is filled at the edition from the count of districts whose `battleground` flag is set (the same count as the nation card's tail, `travelService.ts` l. 215):

| Count | Text |
|---|---|
| 0 | none of them a close race today |
| 1 | one of them a close race today |
| 2 | two of them close races today |
| 3 | three of them close races today |
| 4 | four of them close races today |
| 5 | all five close races today |

Change the §12 row's deck and `heraldHeadlines.ts` l. 40 together (the headline test compares them). If a live token on a stored personal headline costs more than a few lines, the no-code fallback is *Off the {origin} train into Station & Market. Five districts; the Districts list says which are close races today. The tram is free.* The token is preferred: a visitor's first Herald has no other line that counts them.

---

## 6. m5 — the room's renewal: **a renewal adds seven nights to the end**

**Decision.** *Renew* **adds seven nights to the end of the room** (it never restarts it): 100 Iron, 50 under Eviction Notices. It is **offered while seven or fewer nights remain**, so at most fourteen nights are ever paid for; with more than seven left the button is absent and the line says when it returns. The server refuses a renewal with more than seven nights remaining (`ROOM_PAID_AHEAD`), which also closes QA's hand-made double buy. Taking a room when none runs is unchanged (seven nights from today).

Why: a renewal that restarts the week sells nothing on day one and little on day two, which is a button that costs the player money for nothing; a renewal that always buys seven nights is the same deal as the first tap, so the button never needs a warning. The cap keeps the sink optional and small (GDD §18.1: no month-long prepay). The price per night is unchanged, so `docs/economy.md` §15.1 moves no number.

**Strings.**

| Where | Id | Text |
|---|---|---|
| Button (room running, ≤ 7 nights left) | `copy.residence.renew(iron)` | *Renew · {iron} Iron · 7 more nights* |
| Line, room running, ≤ 7 nights left | `copy.residence.roomUntil(weekday, cap)` | *Room until {weekday} · Rested cap {cap}* (as now) |
| Line, room paid ahead (> 7 nights left), no button | `copy.residence.roomPaidAhead(weekday, cap, renewFrom)` | *Room until {weekday} · Rested cap {cap} · renew from {renewFrom}* |
| Refusal | `copy.errors.roomPaidAhead` | *The room is paid for a week ahead already. You can renew from {weekday}.* |
| Modal on a renewal (`politics.ts` `renew`) | stamp **Renewed** · headline *A room in Irongate* · body *Seven more nights on the tram line. Rested banks to {cap} until {weekday}.* · next *Next: rest up. The room runs to {weekday}.* · knock-on *−100 Iron* |
| Modal on taking (existing `room`), the Next line | `politics.ts` `room.next` | *Next: rest up. Renew any day to add seven nights.* (was *Renew the room on {weekday} if you want to keep it.*) |

`{renewFrom}` = `weekdayName(untilDay − 7)`. The screens §11 list and the §6.1 room row need the two new strings and the new button label (`slice-4-screens.md` §6.1 carries the rule as of this change; add the strings to §11 with the copy, since the copy test compares them). QA's m5 `it.fails` in `qa.slice4.residence.test.ts` becomes: renew on the day the room was taken → `untilDay` + 7, 100 Iron; a second renewal the same day → `ROOM_PAID_AHEAD`, nothing written. Drop the marker.

---

## 7. m9 — the capital's *How elections work* note (applied)

`copy.help.capitalElection(rank2, rank3)`, five lines, the home note's tone, no formula:

> **How elections work**
> Irongate elects ten councillors every five days, two in each of its five districts: two days for names to go in, three days of voting, the result the next morning.
> The candidates are players who stand, and local candidates: townspeople run by the game, who fill every party's list so there is always a choice.
> {rank2}s vote once, in secret, for any name on their district's list, from the first election that opens after they registered. {rank3}s who are Known in Irongate can stand in their district; it costs 10 Political Capital and takes two backers of their party who live in the capital.
> Each party's score mixes its share of the votes with its share of opinion in the district. The top score takes the first seat; a party takes both only with more than twice the next.
> A seat is five days on the council: a vote on the city's rule, which needs six votes of ten, and 10 Political Capital and 20 Party XP a day.

Checked against GDD §15.3 (who votes, who stands, the backers' residence, the score, D'Hondt in words, six of ten) and §15.1 (the stipend). Applied in `copy.ts`; the `TODO` comment above it is gone.

---

## 8. n2 and n4 — the arrival modal's body, and two stale GDD strings

**n2.** The body of the arrival modal is one of three lines, never *Nothing happened* above a card:

| Case | Id | Text |
|---|---|---|
| No card was drawn | `copy.travel.nothingHappened` | *The train was on time. Nothing happened, which is rare.* (as now) |
| A card was answered (on the way or on this modal) | — | the outcome line, as now (*The passenger: +6 Party XP, opinion +0.03 in Station & Market*) |
| A card is unanswered and shown in the modal | `copy.travel.cardBelow` (**new**) | *The train was on time. One thing happened on the way: it's below, and you can still answer it.* |

Add the new string to screens §4 and §11 with the copy (the copy test compares the list). The journey card's own *Ignore it and you sleep through it. Nothing happens.* stays under the card.

**n4.** GDD §14.5 *"This cycle you moved Eastside +1.3 for the Collective (2nd of 7)"* → *"This election you've moved Eastside +1.3 for the Collective (2nd of 7)"*; §14.6 *Issue: Tram Fare Hike · +50 % swing* → *Issue: Tram Fare Hike · opinion +50 %*. Applied; the code was already right.

---

## 9. `keep.ledger-page` (applied)

Added to `packages/content/src/data/items.ts`, matching the GDD §21.4 row and the catalogue's format:

```ts
  // GDD §21.4: Settle His Debts chapter 2's keepsake (*The riverside house*, slice 5,
  // docs/design/slice-5-risk.md §13). Its chapter is slice 5; the item is catalogued now because
  // the GDD's table lists it.
  {
    id: 'keep.ledger-page',
    name: 'A page of his ledger',
    slot: null,
    tier: null,
    cha: 0,
    keepsake: true,
    art: 'item.document-folder',
  },
```

`packages/content/test/qa.slice2.test.ts` › *§21.4 catalogue* is green again.

---

## 10. Where each rule now lives

| Point | GDD | Design |
|---|---|---|
| M2 a candidate on a ballot stays put | §14.11 (Residence); §15.3 (nominations bullet); §0 change table; Appendix C #61 | `slice-4-battleground.md` §7.3; `slice-4-screens.md` §6.1 |
| m1 `{city}` / `{verbs}` | §13.7 (the capital rotation bullet) | `slice-4-battleground.md` §10; `review-3-answers.md` l. 125 and 215 (developer, with the content) |
| m2 the Issue order's pin | §13.7 (the same bullet) | `slice-4-battleground.md` §10 |
| m3 seat headlines | — | `slice-4-battleground.md` §12 (applied) |
| m4 close race wording | §14.4 (the rule, unchanged) | `slice-4-screens.md` §11 help note (applied); `slice-4-battleground.md` §12 `hl.ig.battleground` (applied), `hl.ig.first-arrival` (developer) |
| m5 the room's renewal | §14.11 | `slice-4-battleground.md` §7.4; `slice-4-screens.md` §6.1 |
| m9 the capital note | §15.3 already says it | `copy.ts` (applied) |
| n2 the arrival body | — | `slice-4-screens.md` §4 (developer, with the copy) |
| n4 stale strings | §14.5, §14.6 (applied) | — |
| `keep.ledger-page` | §21.4 (already) | `items.ts` (applied) |

**Economy:** nothing moves. The move is still 500, the room 100 a week (a renewal is the same price per night), tickets 20; no XP, Party XP or odds change. `docs/economy.md` §15.1's room row gains a note that a renewal adds seven nights.
