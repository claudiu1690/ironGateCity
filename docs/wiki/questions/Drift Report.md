---
type: question
title: Drift Report
aliases: [Drift, Inconsistencies]
tags: [lint, drift]
updated: 2026-10-14
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
| A9 | GDD §22.2; ADR 0058 (status note added 14 Oct); tech/slice-8 | Season rollover "starts the rules again", but since the voting rework **a city always has a rule** (ADR 0083). May the rollover end a council rule, and what runs until the next count? | USER |
| B2 | `stats.chaBase` in the character model; `wornCha()` in `packages/rules` | The GDD (§8.1, §8.2, §8.5, fixed 14 Oct) says there has been no Charisma base since review 4; the code still stores one and adds it (0 for new characters) | DEV |
| F1 | `package.json` | `pnpm check` and `pnpm e2e:only` are named in the 8 Oct workflow but don't exist (the developer agent file marks them "planned") | USER |
| F2 | `apps/client/playwright.config.ts` | `workers: 1`, `fullyParallel: false`: the planned parallel group isn't built | USER (with F1) |
| F3 | `.github/workflows/ci.yml`; README | CI still runs every Vitest suite (`turbo … test`) and the README lists `pnpm test`, against the 8 Oct "no unit tests for now" rule | USER |
| G2 | `packages/content/src/data/art.ts` | `portrait.father` and `scene.origin-deathbed` are still catalogued though the opening no longer uses them (a test lists them as retired) | DEV |
| H1 | `packages/rules/src/national.ts` `countChair`; tech/slice-7 T14 | The Chair's tie was settled 15 Oct 2026 (GDD §15.4: votes, **then the secretary before any player**, then backers, completed terms, filing); the code still breaks ties by votes, backers, terms, filing, so a player wins an exact tie. One comparator step, spelled out in `docs/design/slice-7-nation.md` *Settled 15 Oct 2026 (phase B)* | DEV |

**Notes (not drift, worth knowing):**
- The model `RuleBallot` is stored in the `ordinances` collection. This is intentional but easy to misread.
- "Order paper" and "division" are retired for councils but still used for Parliament (GDD §15.6, ADR 0045), so searches hit both.
- `design/slice-0-answers.md` keeps the first reference recruit (STR 10 / INT 12 / AGI 5 / CHA 2) as a historical record. The current one is STR 8 / INT 12 / AGI 5 / CHA 5.
- `apps/client/vercel.json` still has an `<api-host>` placeholder; it waits for hosting at the end of the project.
- Review 5's patrol street: the design put it in content (`cities[].patrol.street`); the server derives it from the city's street-kind place (`streetOf()` in `patrol.ts`). The strings are the same today.

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
| B19–B21 | Bodyguards, Legacy perks and bar buffs: in the MVP or not | USER → GD + AR | **MVP, slice 8, not built yet** (GDD §6.7, §12, §17.3, §19.3, §25; plan slice 8; tech/slice-8 §1.1); prices and details in App C #110, #111 |
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
