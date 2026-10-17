---
type: question
title: Drift Report
aliases: [Drift, Inconsistencies]
tags: [lint, drift]
updated: 2026-10-17
---

# Drift Report

Places where two sources disagree: the GDD, the design docs, the ADRs, the implementation plan,
the content data, the rules constants and the code. Rule: **the GDD wins on rules and numbers, the
code wins on what is built**. Each row needs a decision (fix the GDD, fix the code, or mark the old
doc superseded), not a silent pick. When a row is fixed, move it to *Resolved* and log it.

The first wiki build (14 Oct 2026) found about 75 rows. The same day's cleanup fixed almost all of
them (game-designer: GDD, design docs, content; architect: ADRs, plan, tech specs; the project
`CLAUDE.md` and code comments by hand). What is left is below.

Owner hints: **GD** = game-designer · **AR** = architect · **DEV** = developer · **USER** = needs
the user's call.

## Open

| # | Where | Conflict | Owner |
|---|---|---|---|
| A9 | GDD §22.2; ADR 0058 (status note added 14 Oct); tech/slice-8 | Season rollover "starts the rules again", but since the voting rework **a city always has a rule** (ADR 0083). May the rollover end a council rule, and what runs until the next count? **Parked 16 Oct 2026: the season is deferred out of slice 8** (ADR 0058 *Deferred*); decide when it returns | USER (parked) |
| S8-1 | `packages/content/src/data/{patrons,dossier,people,lifeHeadlines}.ts` vs `src/load.ts` | The slice-8 data (patrons, the Dossier's lines, `extraNames`, the fifteen personal lines) exists but `rawContent` does not include it, and the headline placeholder whitelist lacks the life lines' tokens; `content.patrons` reads `[]` until the developer binds them | DEV |
| S8-2 | `patrons.ts`, `people.ts` vs `art.ts` | `portrait.crane` and `portrait.marr` are referenced and the files exist in `mvp/portraits/`, but the catalogue has no entry; the loader refuses the patrons until T7 adds them. `missionCards` has no `social` card (the society call's ticket art). **Bound `91f1503`** (the two portraits and a `social` card, `scene.hotel`, confirmed 16 Oct); what remains is S8-4 | DEV |
| S8-4 | `art.ts` (alt texts); `missions/clearwater.ts` vs design §19, §24.6, §24.9 | The seven slice-8 alt texts in `art.ts` are the developer's drafts; the designer's finals (16 Oct 2026) differ for `portrait.doorman` (no boxer's nose), `portrait.steward` (a dark red tie, wavy hair) and `portrait.minder` (the cigarette is unlit), and add a detail to `portrait.marr` and `item.round`. The Casino's two society calls (*A word at the tables*, *The late table*) carry no `card`, so their result shows the `social` type's hotel lobby instead of `scene.casino`. **Fixed `310a86f`** (16 Oct 2026): the finals in `art.ts`, `card: 'scene.casino'` on *The tables after midnight* and *The late table* (the patron perk *A word at the tables* is not a mission) | DONE |
| S8-3 | `copy.life.minder.paper` vs `lifeHeadlines.ts` | The bodyguards' two paper lines are strings in copy until rules carry `bodyguardLast` / `bodyguardGone` (T26); then they move to headline templates | DEV |
| S8-5 | `copy.life` (17 Oct 2026) vs `wardrobeService.chipLine`, `Minder.tsx`, `PlaceDossier.tsx`, the paper's personal selector | The phase C rulings (design §25) are in copy and the design; four code changes wait on the developer: the Town chip's `chipTownPlain` below Charisma 20; `HireRowView.capped` and the *as good as odds get* tag on the hire card and the run-in row; the patron card first on the sheet, above the tickets; the personal slots sorted across every candidate so *The Flat Waits* (1) beats the Level 10 lines (2). **Built `8ae302a`** (17 Oct 2026); the selector was already one sort, the fix was `lifeSettlement`'s flat facts | DONE |
| S8-6 | `copy.life.dossier.paper.desk`, `copy.life.dossier.informantLine` | Both read wrong at 1 (*1 entries · 1 go stale*, *1 days of reports left*); the server's informant Letters row is fixed (`8ae302a`). **Fixed 17 Oct 2026 (GD)**: the two strings and six more in `copy.life` that broke at 1 (the burned name's two lines, *Make a Case File · n entries*, *Sells at a market: n things*, the exposé's *n lines*, the *Bound* modal's body) pluralise; the rule is [[design/slice-8-life#25.1 Integration (17 Oct 2026): plurals, and the Me tab's stat strip\|design §25.1 #7]]. `wardrobe.spec.ts`'s `/\d+ things$/` should allow *thing* (DEV) | DONE |
| S8-7 | `apps/client/src/routes/me.tsx` (the Level card's stat strip) vs GDD §1.5, design/slice-8-life §18 #13 | The Me tab prints *STR · INT · AGI · CHA* over the numbers, slice 1's labels; the player-facing rule is spelled-out words and §18 #13 bars *CHA*. The designer's ruling ([[design/slice-8-life#25.1 Integration (17 Oct 2026): plurals, and the Me tab's stat strip\|design §25.1 #8]]): the `<dt>` prints `copy.statNames[s]` (*Strength · Intelligence · Agility · Charisma*) in mixed case at 11 px; no new copy key; the `stat-{s}` test ids stay. **Fixed in the slice 8 fix round (17 Oct 2026)**; `statLabel()` removed | DONE |
| B2 | `stats.chaBase` in the character model; `wornCha()` in `packages/rules` | The GDD (§8.1, §8.2, §8.5, fixed 14 Oct) says there has been no Charisma base since review 4; the code still stores one and adds it (0 for new characters) | DEV |
| F1 | `package.json` | `pnpm check` and `pnpm e2e:only` are named in the 8 Oct workflow but don't exist (the developer agent file marks them "planned") | USER |
| F2 | `apps/client/playwright.config.ts` | `workers: 1`, `fullyParallel: false`: the planned parallel group isn't built | USER (with F1) |
| F3 | `.github/workflows/ci.yml`; README | CI still runs every Vitest suite (`turbo … test`) and the README lists `pnpm test`, against the 8 Oct "no unit tests for now" rule | USER |
| G2 | `packages/content/src/data/art.ts` | `portrait.father` and `scene.origin-deathbed` are still catalogued though the opening no longer uses them (a test lists them as retired) | DEV |

**Notes (not drift, worth knowing):**
- The model `RuleBallot` is stored in the `ordinances` collection. This is intentional but easy to misread.
- "Order paper" and "division" are retired for councils but still used for Parliament (GDD §15.6, ADR 0045), so searches hit both.
- `design/slice-0-answers.md` keeps the first reference recruit (STR 10 / INT 12 / AGI 5 / CHA 2) as a historical record. The current one is STR 8 / INT 12 / AGI 5 / CHA 5.
- `apps/client/vercel.json` still has an `<api-host>` placeholder; it waits for hosting at the end of the project.
- Review 5's patrol street: the design put it in content (`cities[].patrol.street`); the server derives it from the city's street-kind place (`streetOf()` in `patrol.ts`). The strings are the same today.

## Resolved — 16 Oct 2026 (slice 7, fix round)

| Rows | What was wrong | Fixed by | How |
|---|---|---|---|
| D-S7I-3b | `officeFrontPage` built the Mayor's caption from `officeTitle` and called the deprecated `captions.governor` | DEV | The `governor` case reads `p.governorOrMayor(c.name, vars.title, cityName)`; the `officeTitle` import is gone from `politicsService.ts` and `captions.governor` is deleted from `copy.ts` |
| D-S7Q-1 | `getLawBook` returned `by: ''` and `passed: {for: 0, against: 0, day: fromDay − 1}` ([[qa/slice-7-report\|QA M1]]) | DEV | The enactment stores `by` and `passed: {for, against, day}` on `nation.laws.inForce`; `getLawBook` reads them, falling back to the bill (`lawDocId`: `tabledBy`, `division`, `divideDay`) for older rows; checked in `qa.slice7.spec.ts` |

## Resolved — 16 Oct 2026 (slice 7, integration)

| Rows | What was wrong | Fixed by | How |
|---|---|---|---|
| D-S7I-1 | The Collective's event order line (`dir.event`) said *canvass* on the front page | GD | *The branch is on the doorsteps tonight, and there's a list with your name on it. Take a role, or take a bucket.* No other player-facing *canvass* in `packages/content` (ids, enums, the §1.5 copy key and test fixtures only); slice 6 design §12's table updated |
| D-S7I-2 | Screens §14 drew the bar and the law chips at 375 × 667; the build hides the chips on an upright phone 700 px tall or less | GD | Confirmed as built: the map is the screen's job; the bar still opens the republic sheet; the laws stay on the tickets' *LAW* tags and in the law book. Screens §14 rewritten ([[design/slice-7-nation|design, Settled 16 Oct (phase C)]] §6) |
| D-S7I-3 | The Mayor's front-page caption was built in code from `officeTitle` | GD | `copy.nation.paper.captions.governorOrMayor(name, title, city)` added beside the deprecated `governor(name, city)`; the binding is D-S7I-3b (DEV) |
| D-S7C-1 | The code abstained in Unrest, penalised an empty branch with the −3, showed *follow your line* for `localsFollow: 'unrest'`, and passed no `{title}` to the Governor headlines | DEV | `e710550`: `localVote` votes the secretary's line in Unrest; the −3 needs `turnout.eligible > 0`; the Chair's Lines show `localsUnrest`; `title` filled for `governorTookOffice`, `governorLocal`, `addressGiven` and the office front page (and allowed in `NATION_PERSONAL_PLACEHOLDERS`) |

## Resolved — 15 Oct 2026 (slice 7, phase B)

| Rows | What was wrong | Fixed by | How |
|---|---|---|---|
| H1 | `countChair` broke an exact tie of votes by backers, terms and filing, so a player beat the secretary | DEV | `dc36985`: votes, then the secretary, then backers, terms, filing (GDD §15.4); `countPick` puts the party's figure first the same way (design §21 #2) |

## Resolved — 14 Oct 2026 cleanup

| Rows | What was wrong | Fixed by | How |
|---|---|---|---|
| A1–A3, A5 | Old voting words in GDD §2, §3.6, §14.11, §24; a ten-ordinance menu in §15.3 | GD | No backers, no withdrawal, no deposit; a standing candidate stays put until the count; one menu of **eleven** for every city |
| A4 | Appendix C #24, #26, #68 described removed rules | GD | #24 closed (superseded by #106), #26 superseded, #68 reworded |
| A6 | Dissolution: "struck" vs "runs out its window" | GD + AR | All sources now say **the rule runs out its window** (GDD §15.9, voting-simplified §3.10, slice-7 design §10.1, ADR 0049 amendment, tech/slice-7) |
| A7, A8 | Backers, deposits and the Governor's order-paper item in ADR 0047, 0048 and the slice-7 design | GD + AR | No backers; the Governor's rule is **card 1** of the ballot |
| A10, A11 | Withdrawal/deposit on account closure; "order paper" in the recount | GD + AR | GDD §16.2, ADR 0067 (a standing candidacy stays on the list; the count skips a retired candidate), ADR 0062 (a recount never touches the rule) |
| A12, A13 | Old request kinds and ballots in ADR 0018, 0019, 0020 | AR | Amendments point to ADR 0083/0084; kinds listed as in `REQUEST_KINDS` |
| A14, A15 | "The deposit" chapter; chapter 4 "after your first council seat" | GD | Renamed **The list**; chapter 4 after a completed council term |
| A16 | Old voting in code comments (`CAPITAL_COUNCIL`, `city.ordinance.paperId`) | hand | Comments updated |
| A17 | Knock-ons from later rounds never applied to tech/slice-6…9 | AR | All applied in the body; planned migrations renumbered 010–013 |
| B1, B3–B18 | Old text next to newer rules inside the GDD (Rank 3, Heat tick, caught check, bribes, safehouse, job income, seed note, paper, coat, clock times, hospital table, Welcome back, welcome favour titles, 06:00, event limits, "built" slice-7 items, vote appeal) | GD | The newer, decided rule kept and the old text removed; §19.1 hospital is now the four built ways (Antidote and Recovery Boost are out of the MVP); vote appeal is one future term (App C #108) |
| B19–B21 | Bodyguards, Legacy perks and bar buffs: in the MVP or not | USER → GD + AR | **MVP, slice 8** (GDD §6.7, §12, §17.3, §19.3, §25; plan slice 8); **designed 16 Oct 2026** (design §24; App C #110, #111 closed); the architect's tech design to follow |
| B22 | The Unrest prize's Legacy +2 had no Legacy entry | GD | §17.3 rows added |
| B23, B24 | Wrong file name for the locals' rules; scoreboard columns | GD | `candidates.ts`; Moved, Events, Heroes |
| C1 | Clearwater's baseline 20/24/24/32 in content | GD | `nation.ts`, its test and the rules fixture now 22/22/22/34, as the GDD says |
| C6 | Slice-7 design lines over the schema's limits (Hofer 94, Brenn 91, the Special Powers Act 146 / 62, chapter 3's narratives 281 / 246); the Courier's council-vote lines predating the voting rework; `nl.council-dissolved` saying the rule is struck | GD | Trimmed and reworded in content on 15 Oct 2026; the design's "Added 15 Oct 2026" note marks the content as the current word |
| C2, C3 | Survey and place-kind counts | GD | GDD: 92 city pins + 5 nation pins, 66 playable places; twenty-one kinds |
| C4 | Faction-only places promised in GDD §16.1 | USER → GD + AR | **Built later**, after the MVP; GDD §14.1 now says Duskwall's HQ is Beacon House |
| C5 | Control-gated access in §14.3 with no code | GD | Marked designed, no slice (App C #109) |
| C6, C7 | Mission art order; knock-on priority | GD | GDD §13.5 and §13.1a now describe the built order |
| C8, C9 | Health on the HUD; ledger rows for losses | AR | ADR 0033 amended (Health always shown); ADR 0028 states the limit, decision listed for slice 6 (tech/slice-6 §22.1) |
| D1–D6 | Stale ADRs 0002, 0005, 0006, 0012, 0021 and the voting ADRs | AR | Status line + "Amendment (14 Oct 2026)" on each; new **ADR 0087** records the request-key seed |
| E1–E3 | Project `CLAUDE.md`: stale current state, `maps-pen\`, the vocabulary rule | USER → hand | `CLAUDE.md` slimmed to the rules plus wiki pointers; maps from `maps-v3\`; rule 2 says players read plain words (GDD §1.5) |
| E4–E7 | The plan: deploying every slice, SSE, a root `art/` folder, slice texts and the data model | AR | Local until the end; Socket.IO, no SSE; slices 0–5 rewritten as built; §5 rows corrected |
| F4 | Art budget said 12 MB; the code allows 19.85 MB | hand | README and the `art:check` comment now point at `TOTAL_BUDGET` |
| G1 | A comment promised a weapon slot | hand | Comment fixed (no weapon slot, §20.3) |

## Related

[[Open Questions]] · [[Decision Log]] · [[Voting Rework]] · [[Keep the Wiki Current]]
