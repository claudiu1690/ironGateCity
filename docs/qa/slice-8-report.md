# QA report: slice 8 "A Life in the City"

Build under test: `bd066a3` (branch `slice-0`), 17 Oct 2026. Political Seasons are deferred and were not tested. Time-boxed to 30 minutes, narrow by the user's rule: the full e2e (353 of 353) already proves the screens, so this pass went through the API for what a browser cannot do (the same key three times at once, different keys racing for the last place, a week away) plus one geometry check on the integration's flagged tap target.

**Result: no blocker, no major. One minor bug and two nits. Every race and every number checked came out as the GDD and economy §22 say.**

How it was run: `E2E_WEB_PORT=4273 E2E_API_PORT=3301 npx playwright test --project=qa-slice8 --no-deps --output=../../.qa8-results`, in the foreground (about 15 s a run). New file `apps/client/e2e/qa.slice8.spec.ts` (7 tests, all green at the end), its own project `qa-slice8` after `chapter8` in `apps/client/playwright.config.ts`. No unit tests. The output folder is deleted and no `docs/` screenshot was rewritten.

## Bugs

### Minor

**m1. The share bar's 44 px button reaches over the bottom of some pins' tap targets (integration flag 4a).**
- File: `apps/client/src/routes/city.tsx` (`shareBar`, the `share-bar-button`: `absolute inset-x-0 top-1/2 h-11 -translate-y-1/2`, full plate width, z-10).
- Steps: open `/city/coalport` at 360 × 640, or `/city/duskwall` at 390 × 844. For each pin, sample nine points across its 44 × 44 target with `elementFromPoint`.
- Expected: a pin's tap goes to the pin; the invisible target should add reach only where nothing else lives (the plate's own foot).
- Actual: the lowest row of three points of two pins resolves to the button, which opens the plate's notes instead of the place:
  - 360 × 640, Coalport, *1. Mill Gate* (target 242,149, 44 × 44; button top 177): the bottom 16 px of the target.
  - 390 × 844, Duskwall, *4. State Archives* (target 310,278; button top 307): the bottom 15 px.
- The pin's marker point (left 22 px, vertical centre, the point `unclearPins` uses) is still clear on both, which is why the full e2e is green. A thumb that lands low on the pin opens the plate notes. Coalport 812 × 375 and the other combinations I sampled (Irongate has no plate button at all) were clean.
- Suggested fix: cap the button's height to the plate's own foot (for example `top-0` to a few px below the bar), or give pins a higher z-index than the button.
- Not checked: the rule line on a city with a live council rule (no ordinance in the fresh test world, so `rule-line` was absent). The code comment says the rule line is z-20 above the button; `qa-risk` in the full e2e proves the rule's target ends at the bar's top. Worth a manual look on a city with a rule.

### Nits (no action needed unless convenient)

**n1. `DossierInformantView.last` is always `null`.** `apps/server/src/services/dossierService.ts` line 399 hard-codes it, and the client never reads it (`routes/dossier.tsx`). Either fill it with the last report day or drop the field from `packages/rules/src/lifeViews.ts`.

**n2. A new player's worn Charisma is 5, so the dinner (Charisma 10) needs 5 more.** Not a bug: the demob suit gives +5 on a base of 0. Noted so the designer knows the dining room is closed to every new character until a hat, a trained point or the flat's +2 plus something is in place. Matches design intent as far as I can tell (the bar spec tests 9 and 10).

## Idempotency and races (risk area 1): all pass

The same key three times at once always returned the stored result three times, with one effect and one charge. Different keys racing for the last place always left exactly one winner and no second charge.

| Action | Same key x3 | Different keys, last place |
|---|---|---|
| `shop.buy` (hat 400) | 3 ok, 400 once | coat x2 keys: one ok, one `ALREADY_OWNED`, 200 once |
| `shop.sell` (hat, a tenth: 40) | 3 ok, +40 once | sold item with a new key: refused |
| `shop.bribe` (one minor mark) | 3 ok, 500 once | not raced (BRIBED_TODAY by design) |
| `bodyguard.hire` (400) | 3 ok, 400 once | tiers 1, 2, 3 racing from nothing: one ok, two `WITH_YOU`, one tier charged |
| `bodyguard.renew` | 3 ok, 400 once | two keys for the last week ahead (paid through today + 34): one ok, one `PAID_AHEAD`; 4 weeks past the limit refused |
| `bar.round` (30 Iron, 2 Energy) | 3 ok, 30 once, Energy 100 to 98 | two used, three keys: one ok, two `ROUNDS_TODAY`; a fourth refused; at nine in hand `SPIRITS_FULL` |
| `bar.meal` (plate 100) | 3 ok, 100 once, Health +15 (40 to 55) | three keys: one ok, two `WELL_FED`, 100 once; a second plate while fed: no charge |
| `bar.dinner` (400) | 3 ok, 400 once | worn Charisma 9: `NOT_DRESSED`; 10: ok |
| `patron.gift` (200) | 3 ok, 200 once | two more keys the same day: `GIVEN_TODAY` |
| `patron.favour` (Marr, 20 PC) | 3 ok, 20 once | three keys on a fresh week: one ok, two `FAVOUR_USED`; once-a-week holds |
| `dossier.bind` | 3 ok, one Case File, three entries spent | two keys: one ok, one `FILE_HELD` |
| `dossier.sell` (file 200) | 3 ok, +200 once | sold file with a new key: refused |
| `dossier.turn` | 3 ok, one informant | two keys on one file: refused; two files, two keys at the cap of two informants: one ok, one `INFORMANTS_FULL` |
| `expose.attempt` (write) | 3 ok, Energy -20, PC +5, Legacy +2, once | two keys on the spent file: both refused, Legacy unchanged |
| `home.buyFlat` | 3 ok, 2,500 once | two more keys: refused, no second charge |
| `home.payRent` | 1 week 150 once; 4 weeks 600 once | four 1-week keys at the 55-day limit: two fit, two `PAID_AHEAD`, paid through exactly today + 55 |
| `legacy.takePerk` | `sleep` (10) 3 ok, 10 once | Dossier perk (5) with 7 points, three keys: one ok, two `NOT_ENOUGH_LEGACY` |
| Dossier capacity 15 | n/a | 14 held, three landings at once: one lands, two refused, used 15 of 15 |

Caveat on the Dossier capacity row: the landing was driven through the test hook `POST /api/test/dossier {entries}`, which calls the product's own `landEntry` (count then insert) inside a transaction. No ticket was raced end to end, because the landing chance on real actions is random and the force hook is a single slot. The hook writes the character document, so it is the same serialisation a real action would get; I judge the risk low.

## Numbers (risk area 2)

Checked in `packages/rules/src/constants.ts` and by arithmetic against the Fight formula (`50 + 3 x (power - theirs)`, clamp 5 to 95), plus the live runs above.
- **Bodyguard prices** 400 / 1,200 / 3,000 a week, power 28 / 36 / 44, Level 6 / Rank 3 / Level 16. Odds against the street enforcer (power 22, 24 on a mission, 28 on rival ground): 62 / 86 / 95 at home, 50 / 74 / 95 on rival ground. Matches design §24.2. Never against the police: `blocked` is set in `bodyguardService.ts` when the opponent's side is police and the minder row is refused in `streetService.ts` (the row itself is covered by `bodyguard.spec.ts`; I did not re-run it).
- **Bar:** round 30 Iron + 2 Energy, 3 a day, +3 missions, nine at most; plate 100, 4 h, Health +15 (live: 40 to 55); dinner 400, 6 h, +10 % XP and Iron, Health +25, Charisma 10 (live: refused at 9, taken at 10). All match.
- **Flat:** 2,500 at Level 10 in the residence city, first week paid, then 150 a week, at most 55 days ahead (live).
- **Exposé:** Energy 20, +5 PC, Legacy +2, one effect (live). The opinion swing figure was not re-read (the e2e checks `Opinion in X: Vanguard -1.0`).
- **Favour:** gift +2 (constant and live behaviour), society call +2 success / +1 partial (`SOCIETY.favour`), the late table's +3 is a per-call `social.favour` override in content. **Protege Legacy +5** is `LEGACY.points.protege`; the once-only credit is by natural ref (not exercised here).
- Marr's discretion favour costs 20 PC, Crane's headline 25 PC (content).

## Being away (risk area 3): pass

A flat bought, a doorman hired (3 days left), a plate (120 min), nine rounds in hand and an informant, then the clock moved 8 days with no player action:
- Iron 9,500 before and after: nothing was drawn or taken.
- The flat is still there, state `waiting`, line "Your flat waits, pay a week to sleep there". One week of rent (150) restored it with no arrears.
- The contract is gone from `life.me` (`minder: null`), nothing else changed; the wardrobe's items are all still owned.
- The meal ran out (`wellFedUntil: null`); the rounds in hand waited (`spirits: 9`).
- The informant reported each due report once (three entries over eight days, used slots 4 = file + 3), not once per login.
- Not tested: a council term stipend paid once (no office in this run).

## Integration's flagged points (risk area 4)

- **4a, the share bar target:** see m1.
- **4b, bought yesterday and lapsed on the same morning:** not re-run; `home.spec.ts` reads *The Flat Waits* in the paper in the full e2e, and the lapsed-flat state above is `waiting`. The Letters rendering of both facts at once was not read by hand.
- **4c, the patron card first at Herald House and the Pier Hotel, first ticket one scroll down on a phone:** not re-measured; `patron.spec.ts` checks the card sits above the first ticket. I did not check the "one scroll" distance.

## Wording (risk area 5)

Not re-swept: the e2e's `lifeSweep` runs on 24 screens in the seven slice-8 specs and `bodyguard.spec.ts` / `wardrobe.spec.ts` assert the hire card has no *bodyguard / guard / escort / muscle*, the minder row reads "as good as odds get" and the Town chip text. What I saw in API payloads (modal headlines and bodies, refusal reasons, the home line) read in plain words with no system vocabulary. The Me tab's stat strip is the sweep's blind spot, as the integration notes say.

## Clarity verdict (risk area 6)

Short version: **clear enough for short sessions, with one caution (the Dossier).**
- **The Wardrobe:** clear. Four plain slots, two outfits, a chip line saying recognised or unnoticed, one tap to change. The word "Charisma" carries it. A new player starts at worn Charisma 5, so the first useful number to chase is obvious.
- **Patrons:** clear. A card at a place, a gift for 200, a request in the paper, a Favour bar. The weekly favour is one tap with a cost.
- **The flat and the bar:** very clear. Prepaid, waits when lapsed, nothing taken; a round and a plate each say what they do and for how long.
- **The Dossier and the exposé:** the weakest, but workable. It asks for the most learning: entries, three make a file, a file prints in three steps, fresh versus stale, a 14-day burn. The first-time help notes exist (twelve in design §14), and each step is one choice, resumable. The risk is the first hour: a new player gets an entry by luck and may not learn that three on one name matter. Worth watching in the playtest ("which clock were you watching") rather than changing now.

## Not covered

- Real two-device concurrency (all races are one session's parallel requests).
- Bodyguard in a real run-in (hire row first, "steps in", pushed aside) and the police case: left to `bodyguard.spec.ts`.
- Odds words and ceiling tag on screen, the Town chip under Charisma 20, the dining room's UI: left to the e2e.
- The rule line tap on a city with an active council rule; the "first ticket one scroll down" distance; Letters with two flat facts.
- Society call favour totals through the real mission path, Protege's one-time Legacy +5, a patron's Request through ordinary play.
- A scheduled job settling a whole month without the player; a week-away stipend; the playtest report's life section.
- Accessibility (keyboard, contrast, 44 px for the new cards), content review of Vanguard text for extremist symbols, mobile screenshots.
- Political Seasons (deferred), unit tests (the user's rule).

## Files

- `E:\Projects\ironGateCity\apps\client\e2e\qa.slice8.spec.ts` (new)
- `E:\Projects\ironGateCity\apps\client\playwright.config.ts` (project `qa-slice8`, phone ignore)
- This report: `E:\Projects\ironGateCity\docs\qa\slice-8-report.md`
