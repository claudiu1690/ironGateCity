---
type: history
title: Slice 3 The First Vote
aliases: [Slice 3, The first vote]
tags: [slice, built]
status: built
dates: 2026-09-29 to 2026-09-30
commits: [fc0e37a, 709d13b, 72abaaa, f9aa0f0, 3829e02]
gdd: ["§3.3", "§6.5", "§14.11", "§15.1", "§15.2", "§15.3", "§15.10", "§17.1"]
adrs: ["0017", "0018", "0019", "0020", "0021", "0022", "0023"]
updated: 2026-10-14
---

# Slice 3 The First Vote

**Status: built** (30 Sep 2026). Its voting model was **replaced** by the [[Voting Rework]] (10–12 Oct 2026). The calendar, the count job, councils, morale and the paper's political sections stand.

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 3 — The first vote (built; the voting reworked 10–12 Oct 2026)|the plan]] as first written (since 14 Oct 2026 the plan's slice text says what was built, with the later changes named): the calendar with the City Day rollover and council elections in each home city, ranks and the councillor rung (Rank 3, *Known*, 2 endorsements), standing, endorsing, a one-tap ballot, results in the paper, home councils with NPC fill, a councillor's ordinance vote, and morale.

- **Question:** does the first vote, and the first seat, feel like a big moment?

## What it added

- **The five-day council cycle** per city from the day key, with no clock times: two days of nominations, three days of polls, the count at the boundary ([[GDD#15.3 City Councils|GDD §15.3]]). See [[City Council and the Rule Vote]] and [[Time and the Game Day]].
- City-day boundaries handled lazily, with the first job as the main path ([[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]]); see [[Scheduled Jobs]].
- Political acts set once, with request keys ([[adr/0018-political-acts-set-once-with-request-keys|ADR 0018]]); a secret, numbered ballot box ([[adr/0019-secret-ballot-numbered-box|ADR 0019]]); council records as collections ([[adr/0020-council-records-collections-and-projections|ADR 0020]]).
- [[Ordinances]] (council rules): a menu of ten bounded effects in a closed DSL ([[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]]). See [[Modifiers]].
- [[NPC Fill]]: nine local candidates per party, marked as such.
- **Morale** and its states, *Fired up* and *Unrest* ([[adr/0022-morale-home-share-state-and-contention|ADR 0022]]); see [[Influence and Opinion]].
- [[Political Capital]] as the price of political acts; councillor pay (10 PC and 20 Party XP a day); see [[Offices]].
- Live political sections in [[The Morning Paper]] ([[adr/0023-paper-political-sections-live|ADR 0023]]).
- Ambition chapter 2. A dev time-skip panel ([[Dev Panel and Local Setup]]).

## Documents

- Design: [[design/slice-3-politics|design/slice-3-politics]] (§17 tech answers; a 10 Oct addendum for voting simplified) and [[design/slice-3-screens|design/slice-3-screens]] (review 2 and 3 addenda).
- Tech design: [[tech/slice-3|tech/slice-3]].
- ADRs: [[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]] to [[adr/0023-paper-political-sections-live|ADR 0023]].
- QA: [[qa/slice-3|qa/slice-3]].

## Decisions made

- The home-city count as built: ward vote + 3 × endorsements + members' votes; seven seats; the branch endorses a candidate who does the day's orders. A council order paper passed with four of seven. (All replaced by the [[Voting Rework]].)
- Tenure applies only after a faction switch; a new member votes at Rank 2.
- *Fired up* is +10 % Party XP at home; *Unrest* swaps two orders for *Restore the base*.
- **User decisions** (recorded in [[tech/slice-3|tech/slice-3]] and the session notes): `pnpm dev:mem` starts the worker; ballots are secret at the API but **linkable** for the slice-9 audit; the playtest uses an admin boost script (`pnpm admin:boost`).

## QA and leftovers

- **Verdict: Pass with issues** ([[qa/slice-3|QA report]], 30 Sep): blocker 0, major 0, minor 6, nit 10. The count ran exactly once per city per cycle under every race tried; the secret ballot held on the wire.
- **m3** (memory mode's loopback guard bypassed by a proxy option) was fixed with the QA commit (`3829e02`).
- **Still open as known-bug tests (`it.fails`):** **m1**, on a crowded count morning the Unrest announcement drops out of the paper (`apps/server/test/qa.slice3.server.test.ts`); **m6**, `admin:boost` marks a natural tester as boosted when it only tops up PC (`packages/db/test/qa.slice3.db.test.ts`).
- **m5**, the Me tab's office line was an 18 px tap target. No fix is recorded.

> [!note] Inference
> **m2** (a motion's past deadline in the paper) and **m4** (two ballot rows above the button on short phones) look superseded: the voting rework removed motions and replaced the nine-name ballot with three cards. The e2e `test.fail` markers for "five names above the CTA" were still listed as expected fails in the review-5 QA run.

## Commits

`fc0e37a` design (29 Sep) · `709d13b` tech design and ADRs 0017–0023 · `72abaaa` design answers · `f9aa0f0` the build (30 Sep) · `3829e02` QA, the dev time-skip panel, the m3 fix.

## Related

- Previous: [[Slice 2 Arrival]] · Next: [[Slice 4 The Battleground]]
- Reworked by: [[Review 2]] (the Election card), [[Review 3]] (the hall backdrop), [[Review 4]] (the Town Hall), [[Voting Rework]]
