---
type: history
title: Slice 1 The 5-Minute Session
aliases: [Slice 1, The 5-minute session]
tags: [slice, built]
status: built
dates: 2026-09-29
commits: [03a2bab, ed08e5c, d6d33c4, 877de30, d2f3c3c]
gdd: ["§2.2", "§3.3", "§3.7", "§5.4", "§6.3", "§8.5", "§9", "§13.1", "§13.4", "§13.7", "§15.4"]
adrs: ["0005", "0006", "0007", "0008", "0009", "0010"]
updated: 2026-10-14
---

# Slice 1 The 5-Minute Session

**Status: built** (29 Sep 2026), QA'd and fixed the same day.

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 1 — The 5-minute session|the plan]]: one home city ([[Coalport]]) with 5–6 places, tier-1 actions with ×1 / ×3, Energy and Rested, Local Standing, jobs, the Morning Paper v1, Party Directives, levels and ranks, and the *Today* tally.

- **Question:** is spending a bar of Energy fun, and do players want to come back in 3 hours?

## What it added

- [[Coalport]]: six places on its painted map, day and night; 21 tier-1 actions ([[Street Actions]]).
- [[Energy]] and [[Rested]], both computed lazily from a value and a timestamp ([[Lazy Timers]]).
- ×1 and ×3 in one request ([[adr/0006-repeat-actions-one-request|ADR 0006]]).
- [[Local Standing]] at 10 / 30 / 70 / 150 successes ([[GDD#13.4 Local Standing (new)|GDD §13.4]]).
- [[Jobs]]: daily pay plus a shift, a streak and sick days (replaced in [[Review 1]]).
- [[The Morning Paper]] v1: the desk and 2–3 headlines; per-city mastheads.
- [[Party Orders]] (Directives) from the NPC secretary Petra Holm, computed and embedded ([[adr/0009-party-orders-computed-progress-embedded|ADR 0009]]).
- [[Levels and Faction Rank]]: XP, Party XP (FXP), Rank 2 lowered to 400.
- The per-character City Day at 00:00 UTC ([[adr/0005-lazy-per-character-city-day|ADR 0005]]); see [[Time and the Game Day]].
- Opinion written inside the action's transaction ([[adr/0010-opinion-written-in-action-transaction|ADR 0010]]); see [[Influence and Opinion]].
- The web art pipeline ([[adr/0007-web-art-pipeline|ADR 0007]]); see [[Art and Maps Pipeline]].

## Documents

- Design: [[design/slice-1-content|design/slice-1-content]] (the Coalport content list, §12 answers to the tech design, §13 QA answers) and [[economy|the economy sheet]].
- Tech design: [[tech/slice-1|tech/slice-1]].
- ADRs: [[adr/0005-lazy-per-character-city-day|ADR 0005]] to [[adr/0010-opinion-written-in-action-transaction|ADR 0010]].
- QA: [[qa/slices-0-1|qa/slices-0-1]] (with fix round 1, §8).
- GDD: [[GDD#0. What changed in 3.1|GDD §0]], the 29 Sep rows for slice 1, its tech answers and QA fix round 1.

## Decisions made

- 00:00 UTC is the City Day for the MVP; night art shows 20:00–06:00 UTC and is cosmetic (later changed by the six-hour day in [[Review 5]]).
- Training always succeeds at half-rate XP. After QA, **training has no batch** (×1 only): a ×3 cost more Energy than the bar holds.
- Back pay on return is capped at 14 days.
- An outcome text is at most 240 characters and four sentences.
- The Collective's Rank 5 title became *Delegate* (it was "Vanguard", a rival's name).

> [!warning] Drift
> The plan lists "Jobs: daily salary and shift, streak and sick days", and the plan's data-model row for slice 1 still names `job {streak, sickDays, lastShift}`. [[Review 1]] replaced all of that with a wage and seniority (GDD §9). See [[Drift Report]].

## QA and leftovers

- **Verdict: Pass with issues** ([[qa/slices-0-1|QA report]]): blocker 0, major 2, minor 7, nit 12. No double-paying bug was found.
- **M1** (a same-key retry refused instead of replayed) and **M2** (3 of 6 Coalport pins off-screen on a phone) were fixed in fix round 1 (`d2f3c3c`), with the rest.
- Left: **n10**, caps labels at 8–10 px, "won't fix now", a readability item to watch in the playtest.

## Commits

`03a2bab` content list and economy sheet · `ed08e5c` tech decisions (ADRs 0005–0010) and designer answers · `d6d33c4` the build · `877de30` QA answers · `d2f3c3c` QA and fix round 1. All 29 Sep 2026.

## Related

- Previous: [[Slice 0 Walking Skeleton]] · Next: [[Slice 2 Arrival]]
- Reworked by: [[Review 1]] (jobs, orders, breakdown), [[Review 2]] (plain words, hidden rolls)
