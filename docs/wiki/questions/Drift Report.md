---
type: question
title: Drift Report
aliases: [Drift, Inconsistencies]
tags: [lint, drift]
updated: 2026-10-14
---

# Drift Report

Places where two sources disagree: the GDD, the design docs, the ADRs, the implementation plan,
the content data, the rules constants and the code. Found during the first build of the wiki
(14 Oct 2026). Rule: **the GDD wins on rules and numbers, the code wins on what is built**. Each
row needs a decision (fix the GDD, fix the code, or mark the old doc superseded), not a silent
pick. Move a row to *Resolved* when it's fixed, and log it.

Owner hints: **GD** = game-designer (GDD, content, design docs) · **AR** = architect (ADRs, plan,
tech specs) · **DEV** = developer (code, comments, tooling) · **USER** = needs the user's call.

## A. Voting rework leftovers

The rework (10–12 Oct, [[Voting Rework]]) replaced candidate ballots, endorsements, deposits,
order papers and withdrawal. Old wording survives in many places.

| # | Where | Says | Should say (current rule) | Owner |
|---|---|---|---|---|
| A1 | GDD §14.11 *Residence* (≈ line 1645) | two endorsements, polls open, nominations, candidacy withdrawn at the move, "the deposit stays with the branch" | no backers needed, no withdrawal, no deposit; a standing candidate is blocked from moving (`ON_BALLOT`) until the count (ADR 0084, §15.3) | GD |
| A2 | GDD §3.6 (first week) and §24 (≈ line 2372) | standing needs "2 faction members endorse you" / "if Known locally and endorsed" | no backers needed (App C #106, §15.3) | GD |
| A3 | GDD §2 City Day row | "divides on an ordinance" | the town votes on a rule | GD |
| A4 | GDD Appendix C #24, #26, #68 | #24 small-branch rule live; #26 locals abstaining after *None of these*; #68 "the things worth taking from a council are its rule" | #24 and #26 describe removed rules — mark closed/superseded; #68 predates "a city always has a rule" | GD |
| A5 | GDD §15.3 menu table | 10 ordinances; capital menu = home menu + Tram Subsidy | screens say eleven rows; `ordinancesMenu()` and `irongateMenu()` in `packages/content/src/load.ts` both return all 11 | GD |
| A6 | Dissolution — ADR 0049 §2, slice-7 design §10.1 body, voting-simplified §3.10, App C #68 | a dissolved council's rule is **struck** | GDD §15.9, the slice-7 design's 10 Oct addendum and the tech/slice-7 note: the rule **runs out its window** | GD + AR |
| A7 | ADR 0047; slice-7 design §3 ladder table | two backers (and deposits, small-branch rule) for councillor and Chair | GDD §15.1 / §15.4: no backers needed | AR + GD |
| A8 | ADR 0048 §6 | Governor's rule as an order-paper item, a locals' voting chain, *None of these* | GDD and tech/slice-7: Governor's rule is card 1, no council vote | AR |
| A9 | GDD §22.2; ADR 0058 §4 | season rollover: "order papers start the rules again", "count and division" | neither exists; rollover ending every rule conflicts with "a city always has a rule" (ADR 0083) — see [[Open Questions]] | USER |
| A10 | ADR 0067; GDD §16.2 | closing an account withdraws candidacies "(deposit kept)" | candidacies can't be withdrawn and have no deposit (ADR 0084) | AR + GD |
| A11 | ADR 0062 §4 | a recount leaves "the order paper" untouched | no order papers for councils | AR |
| A12 | ADR 0018 | request kinds `council.withdraw`, `council.propose`, `council.councilVote` | `REQUEST_KINDS` in `packages/db/src/models/requestLog.ts` has `council.setRule` instead | AR |
| A13 | ADR 0019, ADR 0020 | candidate ballots, deposits, order papers | no pointer to ADR 0083/0084 — mark superseded | AR |
| A14 | design/slice-7-nation.md §13 | chapter "The deposit", "Your deposit receipt" | renamed "The list" (GDD, voting-simplified §8.12, 12 Oct) | GD |
| A15 | voting-simplified §8.11.1 | Ambition chapter 4 "after your first council seat" | GDD §17.1, slice-8 design: "a completed council term" | GD |
| A16 | Code comments: `packages/rules/src/constants.ts` `CAPITAL_COUNCIL` ("six to pass"); `packages/db/src/models/city.ts` `paperId` ("the order paper that passed it") | old voting | update the comments | DEV |
| A17 | tech/slice-6…9 | knock-ons in tech/review-4 §20, tech/review-5 §18, tech/voting-rework §17 never applied | apply before building slice 6 | AR |

## B. Inside the GDD: old text beside newer rules

| # | Where | Conflict | Owner |
|---|---|---|---|
| B1 | §7.4 vs §5.2, §14.11, App C #27 | Residence move at **Rank 3** vs **Rank 2** (code: `RESIDENCE.rank = 2`) | GD |
| B2 | §8.2 vs §8.5 | origin Charisma base 0–4 vs "no CHA base any more"; code still stores `stats.chaBase` and `wornCha()` adds it | GD + DEV |
| B3 | §2 units table vs §6.4 | Heat cools on the 10-minute tick vs continuously (1 point / 12 min, `packages/rules/src/heat.ts`) | GD |
| B4 | §11.2 opening vs its slice-5 paragraph | every illegal action rolls a caught check vs only on Partial/Failure (`caughtCheck` in `runIn.ts`); code also skips it after a Run, which the GDD doesn't say | GD |
| B5 | §11.4 | bribe priced "at Known" — level is now *On file*; slice 8 prices 500 / 1,000 / 2,000 | GD |
| B6 | §6.7 vs §6.4 | safehouse (Lodged) gives Heat −20 vs safehouses make Heat cool faster | GD |
| B7 | §18.2 vs §9.2 | week-1 job income 80–300 (v3.0) vs ladder floor 100, day-1 pay 216 | GD |
| B8 | §5.5 | "seed data (6 XP / 1.2 FXP) too generous" refers to v3.0 code; `TIER_RATES` is already 4.5 / 0.6 | GD |
| B9 | §3.3 | slice-4/5 paper paragraphs still printed although the review-4 local-editions paragraph supersedes them | GD |
| B10 | §21.4 | "the origin coat if it was taken" — everyone wears the demob suit since review 4 | GD |
| B11 | §3.2 | "a rally … starts at 19:00" — nothing has a clock time; events settle at the boundary | GD |
| B12 | §19.1 | old hospital table (Full Recovery, Early Discharge, Antidote, Recovery Boost, storylets) vs slice 5's two ways out and one ward tap | GD |
| B13 | §4.2 vs ADR 0071 | Welcome Back Ambition chapter in the package vs none (GDD marks it post-MVP) | GD |
| B14 | §13.7 | review-4 welcome favour titles vs review-5 *Sign on / Get the stamp / File the appeal* (`orders.ts`, city files) | GD |
| B15 | §15.4 | "secretary steps in if the Chair sets nothing by 06:00" vs the slice-7 paragraph and ADR 0046: from the next boundary, no deadline | GD |
| B16 | §16.3 | opening bullets (Rank 3+, 1–12 h, one every 4 h, 3 a City Day) vs the slice-6 paragraph below (four chips, three starts a city a day, three open sign-ups) | GD |
| B17 | §14.9, §14.11, §14.1 | say slice-7 items are "built" (Heat +25 %, Unrest 5 % count, Clearwater) — slice 7 is not built | GD |
| B18 | §15.5 vs §8, §11, §17.3 | personal vote appeal arrives in slice 8 (+5) but pieces are scattered (CHA, Notorious −5 %, Legacy) and the §15.5 score formula has no appeal term | GD |
| B19 | §25 vs plan *After the MVP*, slice-5 design §11.6, tech/slice-5 §19 | Bodyguards ✔ at launch vs after the MVP (no slice 6–9 includes them) | USER |
| B20 | §25 + slice-8 §7.2 vs plan *After the MVP* | Legacy perks in the MVP vs after it | USER |
| B21 | §25, §6.7, city-quarters §3, slice-5 §2.4 | when bar services / Well-Fed buffs arrive: slice 5, slice 8, later, or "✔ at launch" | USER |
| B22 | §14.11 + `UNREST_PRIZE.legacy: 2` vs §17.3, slice-8 §7.1, ADR 0057 | the Unrest prize grants Legacy +2 but no Legacy entry exists for it | GD |
| B23 | §15.10 | locals' rules "in `people.ts`" — they are in `packages/content/src/data/candidates.ts` | GD |
| B24 | §14.5 vs ADR 0042 | scoreboard columns Moved + Events vs Moved, Events and heroes (neither built) | GD + AR |

## C. GDD vs content data and code

| # | Where | Conflict | Owner |
|---|---|---|---|
| C1 | Clearwater baseline | `packages/content/src/data/nation.ts` `baselineOpinion` 20/24/24/32 (shown on the nation card today) vs GDD §14.8 / §14.11 / App C #70: 22/22/22/34 | GD |
| C2 | Survey size | GDD §14.13: 89 pins, 18 playable vs `mapPins.ts`: 92 city pins (30/16/16/17/13) + 5 nation pins, 66 playable places | GD |
| C3 | Place kinds | GDD §13.5: "twenty kinds", no `theatre` vs schema: 21 (`theatre`, `town-hall`) | GD |
| C4 | Faction exclusives | GDD §16.1 / §14.1: Vanguard House an exclusive gym with training perks; an Underground Press in Coalport; an Alliance-only Press Club vs content: `irongate.vanguard-house` is a plain `faction-hq`; no Underground Press; `irongate.press-club` is an ordinary bar; GDD §14.1 also puts Vanguard House in Duskwall, whose HQ is Beacon House | USER |
| C5 | Control effects | GDD §14.3: control opens faction buildings and shifts prices vs code gates nothing by control (`controlledBy` read only by the view and the capital boundary) | GD + AR |
| C6 | Mission art order | GDD §13.5 ladder: story, place scene, map crop, mission/type card vs `missionArt()` in `apps/server/src/services/missionResult.ts`: mission card first (the slice-5 design chose this order) | GD |
| C7 | Knock-on priority | GDD §13.1a order vs `PRIORITY` in `packages/ui/src/result.ts` (record beside Heat; adds morale, branch, PC, standing, trained; cites review-5 answers §18 Q3) | GD |
| C8 | Health on the HUD | ADR 0033: only below full vs GDD §6.1 (review 4) and `HudBar.tsx`: always | AR |
| C9 | Ledger rows for losses (QA slice-4 n3) | persuasion writes a row only for the gaining party, so a fold doesn't reproduce the meter; ADR 0028 §4 assumes it does | AR |
| C10 | Patrol street source | review-5 answers §18 Q5: `cities[].patrol.street` in content vs `streetOf()` in `apps/server/src/services/patrol.ts` derives it from the `street`-kind place (same strings today) | minor |

## D. ADRs out of date (not marked superseded)

| # | ADR | Stale part | Replaced by | Owner |
|---|---|---|---|---|
| D1 | 0005 | 20:00–06:00 night; half salary, work streak, sick days | ADR 0079 (six-hour day); review-1 wage | AR |
| D2 | 0006 | batch uses success text if any row succeeds; `mixed` stamp; training ×3 | GDD §13.1, §8.5, `usesSuccessText` (more than half) in `rules/action.ts`, stamp `batch`, training ×1 only | AR |
| D3 | 0012 | slot A "first pin's canvass", slot B committee session | review 1, ADR 0073 | AR |
| D4 | 0021 (status *implemented*) | Ward Fund / Shift Hours / Ward Register; kinds `shiftEnergyDelta`, `shiftStreakDays` | code: `seniorityDays`, `ticketPct`, `roomPct`, `heatCoolPct`, `bailPct` | AR |
| D5 | 0002 | a fresh seed per action | code derives the seed from the request key by HMAC (`keySeed`, slice-5 QA fix) — no ADR | AR |
| D6 | 0018, 0019, 0020, 0047, 0048, 0049, 0058, 0062, 0067 | old voting (see section A) | ADRs 0083–0086 | AR |

## E. The plan and the project CLAUDE.md vs reality

| # | Where | Conflict | Owner |
|---|---|---|---|
| E1 | Project `CLAUDE.md` *Current state* | "being rebuilt… next up slice 0" — slices 0–5, reviews 1–5 and the voting rework are built; `apps/api` and `apps/web` are gone | USER |
| E2 | Project `CLAUDE.md` *Final art* | names `maps-pen\` — code builds every map from `maps-v3\` (`content/src/data/art.ts`, `scripts/art/tiles.ts`) | USER |
| E3 | Project `CLAUDE.md` design rule 2 vs GDD §1.5 | rule 2 lists canvass, rally… as the vocabulary; §1.5 keeps those words off every screen (review 2 proposed an edit; no answer recorded) | USER |
| E4 | Plan §1, slice 0 "done when", slice 9; `apps/client/vercel.json` | every slice deployed / betas in slice 9 vs the user's rule: local until the end (`<api-host>` placeholder) | AR |
| E5 | Plan §2 | a root `art/` folder (doesn't exist); Server-Sent Events as the first realtime tool (none; slice 6 plans Socket.IO, ADR 0038) | AR |
| E6 | Plan §4 slice texts | slice 1 shifts/streak/sick days; slice 2 faction choice; slice 3 endorsements and the ordinance vote; slice 4 three-way elections and a rented room; slice 5 Fight/Flee/Bluff/Bribe, jail, hospital, the home overview (ADR 0035, reversed by 0076); slice 7 recall and no-confidence; slice 8 room + flat | AR |
| E7 | Plan §5 data model | `directives` and `items` collections, cities with locations embedded, `job {streak, sickDays, lastShift}` — replaced by ADRs 0009, 0014, 0003 and the wage | AR |

## F. Tooling vs the stated workflow

| # | Conflict | Owner |
|---|---|---|
| F1 | `pnpm check` and `pnpm e2e:only` are named in the 8 Oct workflow and agent notes but exist in no `package.json` (the developer agent file already marks them "planned") | USER |
| F2 | Playwright still runs `workers: 1`, `fullyParallel: false` — no parallel group | DEV |
| F3 | CI (`.github/workflows/ci.yml`) still runs every Vitest suite via `turbo … test`; README still lists `pnpm test`; tech/slice-6 §6.9 and slice-9 §6.5 plan Vitest tests — vs the 8 Oct "no unit tests for now" rule | USER |
| F4 | Art budget: README and the `art:check` comment say ≤ 12 MB; `TOTAL_BUDGET` in `scripts/art/build.ts` is 19.85 MB | DEV |

## G. Small code and content notes

| # | Note | Owner |
|---|---|---|
| G1 | `packages/rules/src/items.ts` comment: "weapon, utility and accessory come with the Wardrobe" — GDD §20.3 / §21.1: no weapon slot | DEV |
| G2 | `portrait.father` and `scene.origin-deathbed` still in `art.ts` though the opening no longer uses them (a test lists them as retired) | DEV |
| G3 | The model `RuleBallot` is stored in the `ordinances` collection — intentional, but easy to misread | note |
| G4 | "order paper" and "division" are retired for councils but still used for Parliament (GDD §15.6, ADR 0045) — searches hit both | note |
| G5 | design/slice-0-answers.md reference recruit (STR 10 / INT 12 / AGI 5 / CHA 2) superseded by STR 8 / INT 12 / AGI 5 / CHA 5 (historical record) | note |

## Resolved

| # | Drift | Fixed | How |
|---|---|---|---|
| — | | | |

## Related

[[Open Questions]] · [[Decision Log]] · [[Voting Rework]] · [[Keep the Wiki Current]]
