# QA report: slice 7 "The Nation" (16 Oct 2026)

Build: `8cc7b27` on `slice-0`. Scope: the brief's risk areas, with the full e2e's results (all projects green) taken as given. Spec: `apps/client/e2e/qa.slice7.spec.ts`, its own Playwright project `qa-nation` (`pnpm exec playwright test --project=qa-nation --no-deps`, ports 4273 / 3301). **Result: 7 tests, all 7 pass** on the final run (a fresh server). The suite also found one real bug (M1) and one UX regression (m1).

## Bugs

### Blocker
None.

### Major

**M1. The law book says every law was "put to Parliament by (nobody), passed {a day early} 0–0".**
- Steps: seat a deputy, table Public Assembly / People's Education, let it divide (40 to 0 in the chamber's own division) and come into force; open `/parliament/laws`.
- Expected (GDD §15.6, tech §6.11 and §8.3: "T15 adds the rows' tablers and divisions"): each row names who put it forward and the real division, e.g. *put to Parliament by Qa Rosa · passed Monday 40–0*.
- Actual: *put to Parliament by · passed Friday 0–0*, on every row. Screenshot: `docs/qa/slice-7/qa-law-book-row.png`. The bill's own page is right (`division: {for: 40, against: 0, passed: true}`), so the data exists.
- Cause: `getLawBook` returns placeholders: `by: ''` and `passed: { for: 0, against: 0, day: l.fromDay - 1 }`. The `day` is the day before it came into force, not the division day. Rows seeded by the secretaries' bills have the same gap.
- File: `apps/server/src/services/nationService.ts` lines 173-180 (shown by `apps/client/src/routes/parliament.tsx:553` through `copy.nation.parliament.lawRow`). Fix: read the bill's `tabledBy`, `division` and `divideDay` (the `bills` row whose `lawId` and `inForceFrom` match), or store them on `nation.laws.inForce` when the law is enacted (`parliamentService.ts:801` already builds `passed: { for, against, overridden }`).

### Minor

**m1. A tap on the left half of the share bar under the home plate opens the Town Hall, not the plate's notes (375 × 812).**
- Steps: new Collective member, `/city/coalport` at 375 × 812, tap the left quarter of `share-bar`.
- Expected: the plate's notes (`share-bar` onClick = `plateHelp.click()`, `city.tsx:753`).
- Actual: the Town Hall sheet (*Long Service Order · 5 days*). Cause: the rule line's invisible 44 px target (`after:-inset-y-[16px]`) reaches over the bar. This is the known trade-off the integration notes list (they say the share bar's left half "opens the Town Hall now"). Also worth knowing: the bar is 16.75 px tall, `aria-hidden` and click-only (no keyboard path, under 44 px), so the plate's notes are only reachable through the labelled help mark. Screenshot: `docs/qa/slice-7/qa-plate-share-bar-375x812.png`.
- Recommendation: accept the new behaviour, but make the bar's caption a real button for the notes, or drop the share bar's click. File: `apps/client/src/routes/city.tsx` (shareBar, ruleLine).

**m2. GDD §15.6's *one bill per member per term, whichever office tables it* is ambiguous; the build reads it as tabling only.** A deputy can vote on every bill (one vote each); it can table one bill a term (a second table by another key is refused, 50 PC charged once). Reads right, but the sentence sits after the vote sentence. For the game designer to confirm or reword. No code change.

### Observations (not filed as bugs)
- The Chair's result can read *turnout 18 of 16* (voters above the roll) because `activeMembers` is evaluated at the count with a 7-day window; the test clock jumps the real members out of it. Not reproducible in real play (a voter was seen within three days), but the view should clamp.
- At 375 × 667 on the Chair's desk the sticky *Set the orders* (y 551 to 595) sits 3 px over picker B's top (y 592), pickers A and B and the button are above the fold, picker C below. Fine.
- The DEV pill covers the end of a law's line on `/parliament/laws` (dev build only).

## Verified (observed, passing)

1. **Idempotency and races** (same key x3 at once, then two other keys at once):
   - `chairElection.stand`: one name, 25 PC once; a second key refused, no charge.
   - `chairElection.back`: 10 PC once; a second key refused (one per member).
   - `chairElection.vote`: one ballot, `ALREADY_VOTED` for another key; two keys at once on one voter: at most one.
   - `parliament.table`: one bill, 50 PC once; another key from the same deputy refused; two deputies tabling the same law at once: one bill (`LAW_ON_PAPER`), one 50 PC charge.
   - `parliament.vote`: one vote for three taps, For + Against at once: one.
   - `parliament.veto`: three taps with one key all ok, one veto; a second veto in the term refused.
   - `governor.setRule` x3 and two keys at once with two rules: both ok, the last write stands, no corruption. `governor.address` and `president.address`: x3 ok, momentum moved once (+50), a second Address in the term refused.
   - `petition.open` (10 PC once; a second key refused) and `petition.sign` (10 PC once; a second key refused).
2. **Numbers:**
   - Constants match GDD §15: 28-day term, 60 seats, 31 / 36 / 40, five laws at most, Chair 25 PC spent, backers +3 and at most five, stipends (deputy 5, Chair 20, President 50 PC; Governor 20), weights 0.4 / 0.3 / 0.1 x3, Clearwater `22 / 22 / 22 / 34`.
   - In play: a Chair count with seven backers totals 1 vote + 5 x 3 = 16 (cap held) against the secretary's 17; an exact 3 to 3 goes to the secretary (`secretaryKept`, margin 0).
   - Division of a bill (Collective 2 for, Vanguard locals For, Alliance abstain): 40–0, passed.
3. **Laws in play:** Public Assembly Act passed by the chamber came into force the day after the division (one signature day); a speech ticket went 12 to 10 Energy and carries `{source: 'law', name: 'Public Assembly Act'}`. A vetoed bill did not come into force. Laws from the secretaries' Monday bills appeared in the book across the jumped terms (three of five at one point).
4. **Being away** (clock to term day 7 with nobody reading; deputy, Chair and President seated): stipends over a control character were 35 / 140 / 350 PC (7 days x 5 / 20 / 50), identical after a second read (paid once, nothing lost).
5. **The 16 Oct Unrest ruling:** Vanguard pushed Coalport into Unrest; with the Collective deputy voting Against the Collective's 19 locals voted the secretary's For (`why: 'unrest'`); the Alliance's follow the secretary as usual.
6. **Wording:** a Mayor of Irongate: front page *Qa Mayor, elected Mayor of Irongate*, *Qa Mayor Is Mayor of Irongate*, `pg.city.title = 'Mayor'`; after an Address and a day, the paper has no literal `{title}` or any `{word}` and no *Governor of Irongate*.
7. **Layout:** at 375 × 667 Parliament's For and Against are whole, side by side (167.5 x 44 each, no overflow, y 503); the Chair's desk is above.
8. **Art:** the Casino, the tram depot and the harbour decode and stand on `scene.casino`, `scene.tram-depot`, `scene.lake-harbour` (checked by the loaded image's source). The law book's page shows the law-book scene (screenshot).

## Clarity verdict (partial: from the screens I opened, not a naive playtest)

A new player can follow the **law book** and the **ladder** well: *3 of 5 · every city · the lines on your tickets* and the *LAW · …* tag on the speech ticket explain a law without a number being hunted for, and the Chair's *To be confirmed* / *Final* stamps are plain. **Parliament** is the hardest of the three: three voices (players, locals by a chain, secretaries' lines) and *one bill a term* (m2) need the help notes to be read; the data to explain a result is all there (`localLines` says *players / secretary / unrest*), but M1 removes the law book's own explanation of who passed what, which is the part a short session reads. The **national election** is a four-window affair (names, pick, vote, count); it is never timed to the clock, so it works in short sessions, but I did not walk it through as a new player. A proper clarity pass needs a human playtest.

## Not covered (time box)

- Idempotency of the national election (`nation.standPresident / withdrawPresident / standList / pickVote / vote / back`), `confidence.*`, the Chair's desk acts (`chair.setOrders / setLine / setRule / setFixture / callEvent`), and bill votes racing the division boundary (the join-race class from slice 6: checks before the transaction). Only the acts listed under *Verified* were raced.
- A removal at 40 and 39, the override vote (40 of 60), the five-law cap and replace, a factional law at 35 and 36, a tie on the party's pick, the clerk's motion, the Rehabilitation Act's fade on the record, the Eight-Hour Day and Free Market effects on a wage / Iron result.
- National Control weights and Clearwater's baseline as computed values (constants and content only), the −3 penalty with and without an eligible voter.
- The nation map at 375 × 667 and 390 × 844, the plate's wording and layout beyond the share bar, the pick / national pages' art (the bill and Governor pages are asserted by `nation` and `governor`), a Chair desk at 360 px, keyboard reach and contrast of the new screens, the README's six walk-throughs from a fresh `pnpm dev:mem`.
- A Mayor's headlines for the *took office* and *local* cases (only the front page and the Address's paper day).
