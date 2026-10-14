---
type: history
title: Voting Rework
aliases: [Voting simplified, Vote on the rule, Design Review 3]
tags: [review, built, voting]
status: built
dates: 2026-10-10 to 2026-10-12
commits: [9067c94, aea2bd0, 14ad0ba, 04bcb83, 7376f5a, a4a810d, 521cc71, 0468164, eff6f45, f8cfc88, 0072c50, 17f817e, b1f769a, f938d03, 29004a8, ddf32f4, 0bf211a, ae6ab89]
gdd: ["§1.5", "§2", "§3.3", "§6.5", "§14.11", "§15.1", "§15.3", "§15.4", "§15.10", "§17.1"]
adrs: ["0083", "0084", "0085", "0086"]
updated: 2026-10-14
---

# Voting Rework

The council vote was rebuilt so that **the town votes on a rule, not on people**. Approved 10 Oct 2026, built, QA'd and fixed by 12 Oct 2026.

## Where it came from

The user's note after [[Review 5]]: *"The voting feature feels overwhelming and I don't really understand it. I like what the feature does with the buffs (laws), but I want it easier to understand."* ([[design/voting-simplified|voting-simplified]], intro).

> [!note] Inference
> The repo docs say only "after review 5". The session notes say the note came from the user's Notion page **"Design Review 3"**, which was marked Done when this round was pushed (12 Oct).

## What was decided

The designer's audit counted 33 concepts between a Rank 2 player and one tap. **The user approved the proposal on 10 Oct 2026 with the recommended default on all three open questions** ([[design/voting-simplified|voting-simplified]] §7):

- **The ballot is for a rule.** Every five days each city votes on one rule: **three rule cards** (the party's rule and two put up by councillors), one tap, secret, final. The card with the most votes **runs the city for five days** from the count. A tie or no votes goes to the party's card, so a city always has a rule. In Unrest the party's card comes off the ballot.
- **Q1: members' votes are out of the seat count.** Seats go to **reputation + 3 × backers** (at most five count).
- **Q2: no backers are needed to stand.** Standing is **Rank 3 · Known · 10 Political Capital, spent · name your rule**. Backing is an optional +3; the branch's backing is a bonus for doing the orders.
- **Q3: the capital's rule is the largest bloc's.** In Irongate and Clearwater each party puts up one card; votes and opinion decide seats as before; the rule with the most seats behind it wins; parties that pick the same rule share a card and add up.
- **Removed:** the council's own vote (the division), proposals (20 PC), *None of these*, four of seven / six of ten, the locals' voting chain, striking, withdrawing, deposits and refunds, the small-branch doubling, platform lines.
- The councillor's power is **their rule on the ballot** (free to change on cycle days 0–1); pay unchanged.

See [[City Council and the Rule Vote]], [[Ordinances]], [[Offices]], [[NPC Fill]], [[Political Capital]], [[Capital Districts]].

## What was built

Technical plan [[tech/voting-rework|tech/voting-rework]] with [[adr/0083-the-town-votes-on-a-rule-three-cards-set-at-day-2|ADR 0083]] (three cards set at day 2), [[adr/0084-seats-by-reputation-and-backers-standing-is-spent-with-a-rule|ADR 0084]] (seats and standing), [[adr/0085-the-contested-citys-rule-is-the-largest-blocs|ADR 0085]] (the largest bloc), [[adr/0086-converting-a-city-to-the-rule-vote|ADR 0086]] (converting live cities). The `ordinances` collection became the **rule ballot** (`RuleBallot`); migration 009 refunds due deposits once; each city converts itself at its next settlement. No unit tests, by the user's 8 Oct rule.

| Phase | What | Commit | Wording settled |
|---|---|---|---|
| 1 | foundations: rules, fields, content, types | `04bcb83` | `7376f5a` (§8.6) |
| 2 | the back end switch to the rule vote | `a4a810d` | `521cc71` (§8.7) |
| 3 | the home city's voting screens | `0468164` | `eff6f45` (§8.8) |
| 4 | the capital's voting screens | `f8cfc88` | `0072c50` (§8.9) |
| 5 | the paper, the chip, the help notes, the dev panel | `17f817e` | `b1f769a` (§8.10) |
| 6 | integration, the report's council section v2 | `f938d03` | `29004a8` (§8.11) |
| QA | report, screenshots, specs | `ddf32f4` | |
| fix round | wording (§8.12), then code | `0bf211a`, `ae6ab89` | |

Before the build: `9067c94` updated the GDD, `docs/economy.md` and the slice 3, 4 and 7 design docs; `aea2bd0` the tech plan; `14ad0ba` sixteen questions settled with the architect.

## QA result

[[qa/voting-rework-report|QA report]] (12 Oct, at `29004a8`): **no blockers, two majors**, a list of minors. "The model works and is much easier to read than the old one." Every action was atomic and idempotent under bursts; the conversion check passed 601 of 601. Voting is three taps on a phone, two on a desktop.

- **M1**: in Unrest the fallback was called "the branch's rule" in the hall and the paper. **M2**: the third card sat under the sticky *Vote for* bar when the day's paper was unread.
- The fix round fixed both majors and m1, m2 (plurals and ties: new tie headlines), m5 (old "election" words), m6, m7, m9 and m10 (GDD §15.1 and §15.3 wording). Chapter 3 of *The Names on the Stone* was renamed ***The list***.
- **Decided and not reopened** in the fix round: m3 (the count morning's headline order stays) and m8 (east-of-UTC strings stand, per the review-4 clock decision).

## Leftovers (as of 12 Oct 2026)

- Times east of UTC read oddly (*Vote until Wednesday 03:00*), following the review-4 clock decision.
- *Councillor … Steps Down* is untested.
- GDD §14.11's residence paragraph still says "two endorsements" and "the deposit stays with the branch".
- `packages/db/test/elections.test.ts` still expects the removed report columns (not run, per the no-Vitest rule).
- No test drives a capital ballot with a wrapped Street Fund line.
- The full e2e last passed (276) before the fix round; it has not been re-run since.
- Not covered by QA: the vote against the count at the exact boundary, the branch's +3 backing in play, the *carried over* card state, keyboard use on the new screens, a real phone clock.

See [[Open Questions]] and [[Drift Report]].

## Related

- Replaces the voting model of [[Slice 3 The First Vote]] and the capital count of [[Slice 4 The Battleground]]; amends [[Slice 7 The Nation]].
- Previous: [[Review 5]] · [[Decision Log]]
