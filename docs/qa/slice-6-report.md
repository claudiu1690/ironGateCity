# QA report: slice 6 "Together"

Date: 15 Oct 2026. Branch `slice-0`, commits up to `3c34cc9`. Time-boxed and narrowed to the risk areas the coordinator listed (the full e2e already passed every project). Run with `E2E_WEB_PORT=4273 E2E_API_PORT=3301`, `--no-deps`.

New test: `apps/client/e2e/qa.slice6.spec.ts` (project `qa-together`, last in the chain, 375 x 667; 5 tests, all pass on the last run). Screenshots in `docs/qa/slice-6/qa-*.png`. One test-code fix in `qa.voting.spec.ts` (item 7).

## Result

No blocker and no major bug. Three minor findings (one product race, one routing gap, one known deviation) and one flaky test (fixed). Every number checked matches the GDD, design §2.7 and economy §20.

## Bugs

### Minor

**m1. A concurrent replay of the same key on Join can answer `ALREADY_ON_EVENT` instead of the stored result.**
- Steps: one Rank 2 member, an open rally; send three `events.signUp` calls at once with the same `idempotencyKey` and the same role.
- Expected (tech §18, the project's idempotency rule): every replay returns the first result; one charge.
- Actual: in 1 of 3 runs the third call was refused with `ALREADY_ON_EVENT` (the other two ok). The run passed on the other two attempts. I could not check the Energy on the failing run (the test stopped at that assertion), so a double charge is **not** ruled out, but the Energy check passed on both clean runs. A real double tap on a phone is sequential and would hit the stored-tap path, so the player impact is a possible error toast after a successful sign-up.
- File: `apps/server/src/services/eventService.ts`, `signUpEvent` (the stored-replay lookup against the "already on this event" gate when two requests overlap). The test records the allowed outcome and logs `QA concurrent same-key sign-ups`.
- Same-key concurrency on `callEvent`, `withdraw`, `postBail` and `visit` all passed (same result, one effect, one charge).

**m2. Deep link to `/faction` while a released stay has not been seen: no release modal and the event results wait invisibly.**
- Steps: sign up for events, be sent to the cells, go away past the end of the stay and the events; open `/faction?tab=events` (a bookmark, or a reload on the Faction tab).
- Expected (design §2.8, pillar 7): the player is told what is waiting (the release, then the results, oldest first).
- Actual: the character has `held.state: 'out'` and `events.unseen: 3`; the Faction page shows no modal and nothing says three results wait. `EventGate` correctly waits for the release modal, but only `/` redirects to `/held`. The Map tab does go to `/held`, so the player is one tap from it; the normal return (open the game at `/`) shows the full sequence correctly (item 2 below).
- File: `apps/client/src/features/faction/EventGate.tsx` (`waiting` is false while `character.held`) and `apps/client/src/routes/faction.tsx` (no redirect). Suggest the same `held` redirect that `router.tsx` has for `/`.

**m3 (known deviation, not a defect): a withdrawal has no modal.** Design §22.5 says a small *Withdrawn* modal; tech Deviations records one tap and a line under the roles. Working as built. Listed so the designer can confirm.

### Flaky test (item 7): not a product bug, not pollution

`qa.voting.spec.ts` "the count: ... a three-way tie goes to card 1" is **nondeterministic by construction**. The earlier test fires six concurrent `council.vote` calls (two keys per card) and keeps whichever one wins; it then votes card 3 with a second member and a third card with the third. If the burst's winner was card 3 (about one run in three, more likely on a loaded server, such as straight after the long `voting` project), card 3 gets two votes against one and the count is `how: 'votes'`, not `'tie'`. I re-ran `voting` then `qa-voting` in one server (32 tests) and it passed, which fits a race and not shared state. Server behaviour is right in both cases. Fix applied in the test: the burst's winner is remembered and the count test expects `votes` (card 3) when it won, `tie` (card 1) otherwise (same for the five-day line). Not re-run after the edit beyond `--list` (the file parses).

## What was checked

1. **Double taps and replays** (API, same key twice or three times at once, and two keys at once): Call it (one event, one 15 Energy; a second call refused), Join (see m1; a second key on the same member refused `ALREADY_ON_EVENT`), Withdraw (same key twice: one refund; a new key afterwards: refused), Post bail (same key twice plus a rival payer at once: one payer charged 150 Iron, the other refused `ALREADY_OUT`), Visit (same key twice: both ok, 3 Energy once, 97), chat post (a retried key is one line), `events.seen` twice (both ok, nothing left). Event result Continue is `events.seen`, covered by the last. Not clicked in the UI twice.
2. **Away.** A Rank 2 member signed up as a hand on the Coalport fixture, a member-called canvass drive (+1 h) and the Irongate fixture, was sent to the cells, then the clock went past the next City Day. Back at `/`: the release modal first, then the three results in start order (the drive, then the Coalport fixture, then the Irongate fixture), one modal each, a reload gave none again (credited once), the Continue button 44 px high and inside a 375 x 667 screen. The run-in step and the orders-complete note at the end were not exercised (see Not covered).
3. **Numbers** (a rally, Success: Speaker 15 Energy and Security 10 Energy, two volunteers; all rolls forced):
   - XP 75 and 50 (+25 Rested on the 10-Energy role); Party XP base 12 and 8 (0.8 x Energy x 1.0); Political Capital 10, full.
   - The same day's second event paid **5 PC at the half rate** (a Success: 10 halves to 5).
   - Rules constants read against the GDD: 15 / 10 / 6 / 3 and 8 / 5 / 3 / 2 (halves up), Party XP 1.5 / 1 / 0.5 / 0.25, no Iron.
   - **No Iron**: the Iron of both members did not move.
   - A hand costs 5 Energy and has no roll.
   - **Withdraw** returned the Energy once. Above a full bar the 5 Energy banked as 5 Rested (30 to 35) and 0 as Energy, as economy §20 says.
   - Withdrawing in the last hour is refused (`WITHDRAW_CLOSED`, also for the caller); signing up in the last hour is allowed and stands.
4. **Favours:** a second bail payer is refused (`ALREADY_OUT`) with one charge; a visit costs 3 Energy and works from Irongate; from rival ground (Duskwall) it is refused (`RIVAL_GROUND`). The mate's release is in `favours.spec`.
5. **Chat:** the *repeat* refusal (`why: 'repeat'`) and *too many* at the 31st line in ten minutes (`why: 'tooMany'`) come back as `CHAT_RATE`; the composer shows *Thirty messages in ten minutes is enough for anyone; back in 10 minutes*. Mute, report-once and Me's switch are in `faction.spec` (passed in the full e2e); not repeated.
6. **Layout:**
   - The event result's Continue sits at 655 px on a 375 x 667 screen, 44 px high.
   - On a 375 x 600 phone the event page's sign-up button ends at 528 px, above the tab bar (536 px), 44 px high, no sideways scroll.
   - Desktop 1440 x 900 with chat hidden: the Events column is centred at 640 px, no chat column or chip, no sideways scroll (`qa-desktop-chat-hidden.png`).
   - *Post bail* from the cells card (Harbour Police, Level 6): the sheet opens with the confirm button 44 px high at 595 px of 667.
7. See "Flaky test" above.

## Clarity verdict (item 8)

Mostly clear, from the board card and the event page; I did not run a first-time-player walkthrough. The card says who called it, where, how many roles are filled and has one **Join** button; a Recruit's sheet reads *Join as a hand · 5 Energy*; the result modal lists how every role went with a receipt. Two small gaps: *settles at 03:00* (the City Day boundary) is not explained and a new player has no reason to know why 03:00; and the board's only explanation of what an event is is the line *Organisers and above can call events; anyone can join one.* (the help notes were not read). The Doorstep Drive name on the card is the designer's rename in progress.

## Not covered

- The run-in step of the modal order, and the orders-complete note after the event modals (the day had turned, so no note was pending).
- Mixed, Triumph and Fiasco payouts on screen (only the rules constants were read); the Grand Rally's Heat; the volunteers' 0.75 at *Fired up*.
- A race of two members for one role in this run (the developer's scratch run covered it).
- The system lines' buttons refreshing on a mate's open chat (only the payer's own line, in `favours.spec`); the *repeat* line text in the UI (only the API refusal); report and mute beyond the full e2e.
- Withdrawal of the fixture before its last hour; the hands cap of four; three open sign-ups from the UI.
- Accessibility beyond 44 px targets on the checked controls (no contrast or keyboard pass); content and vocabulary beyond the sweep already in `events.spec`.
- The manual playtest checklist (tech §16): the questions about feeling part of a team need people.
- 360 px width; Playwright ran at 375 and 1440 only. The designer had uncommitted content edits (event names) while I ran; nothing here depended on them.
