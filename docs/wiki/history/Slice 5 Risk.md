---
type: history
title: Slice 5 Risk
aliases: [Slice 5, Risk]
tags: [slice, built]
status: built
dates: 2026-10-03 to 2026-10-05
commits: [a337c5c, b756c48, b271ed4, f6bb49e, de4417d, a9e7390]
gdd: ["§6.1", "§6.4", "§8.4", "§11", "§13.1", "§13.3", "§14.12", "§14.13", "§19.1", "§19.2", "§20"]
adrs: ["0031", "0032", "0033", "0034", "0035"]
updated: 2026-10-14
---

# Slice 5 Risk

**Status: built** (5 Oct 2026), QA'd and fixed. The user asked for slices to be built back to back and to **stop after slice 5** for a review: that became [[Review 4]].

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 5 — Risk (built)|the plan]] as first written (since 14 Oct 2026 the plan's slice text says what was built, with the later changes named): tier-2 missions (briefings, approaches, the remembered approach, Success / Partial / Failure), Heat, the caught check, the criminal record, jail, hospital, encounters as one choice plus auto-resolve, and hostile ground.

- **Question:** is risk exciting rather than punishing?

## What it added

- [[Missions]]: 22 tier-2 missions with a briefing and a choice of way; the way is remembered; no ×3; Failure pays XP ÷ 5. Missions have their own list and one resolver ([[adr/0031-missions-their-own-list-one-resolver|ADR 0031]]).
- [[Heat and Record]]: Heat cools 5 an hour, lazily; the caught check fires only on a Partial or a Failure; minor marks fade after 14 quiet days ([[adr/0033-heat-health-record-held-lazy|ADR 0033]]).
- [[Health]] (100 + 5 per Level after the first) and [[Hospital and Treatment]] (the infirmary).
- [[Jail and the Cells]]: bail 100 + 50 a mark; a loss to the police is the cells.
- [[Run-ins and Combat]]: *Fight · Run · Talk your way out · Pay them off*, or luck after five minutes ([[adr/0032-run-ins-pending-step-and-luck|ADR 0032]]).
- [[Hostile Ground]] (rival ground): from Level 10, +4 difficulty, ×1 only, double Heat, +50 % Party XP, opinion against the home party capped at 2 points a day ([[adr/0034-opinion-against-and-rival-ground|ADR 0034]]).
- Second quarters in each home city at Level 6, fifteen places, and a home-city overview with outlines ([[adr/0035-home-quarters-outlines-and-overview|ADR 0035]]). See [[Quarters and the Map]].
- Five Issues, a slot-B mission order, Ambition chapter *The riverside house*.

## Documents

- Design: [[design/slice-5-risk|design/slice-5-risk]] (§22 points for the user, §23 settled; review 4 and review 5 addenda), [[design/slice-5-screens|design/slice-5-screens]], [[design/slice-5-fixes|design/slice-5-fixes]].
- Tech design: [[tech/slice-5|tech/slice-5]].
- ADRs: [[adr/0031-missions-their-own-list-one-resolver|ADR 0031]] to [[adr/0035-home-quarters-outlines-and-overview|ADR 0035]].
- QA: [[qa/slice-5-report|qa/slice-5-report]] (§9 the fix round).
- The hand-over: [[review/review-4-guide|review/review-4-guide]].

## Decisions made

Six points were put to the user with defaults ([[design/slice-5-risk|design §22]]); all were built as the defaults and listed again in the review-4 guide (§5) "to confirm or change":

- rival ground opens at Level 10 with the train; no ×3 there;
- a loss to the police is **the cells**, not the infirmary;
- the record's middle level is ***On file*** (not *Known*);
- the home-city overview with outlines was built;
- the caught check fires only on a Partial or a Failure;
- the civic police have no ranks: *the duty officer*; a run-in waits five minutes.

The build's words (the plan uses them since 14 Oct 2026): *Fight · Run · Talk your way out · Pay them off*, *the cells* and *the infirmary*. The home-city overview (ADR 0035) was **reversed** in [[Review 4]]: a home city is one map with locked pins ([[adr/0076-home-cities-one-map-capital-districts-tile-the-picture|ADR 0076]]).

## QA and leftovers

- **Verdict: Pass with issues** ([[qa/slice-5-report|QA report]], 5 Oct): blocker 0, major 1, minor 9, nit 12. The rules matched the GDD over thousands of random cases.
- **M1**: a retried mission or rival tap could charge twice after a write conflict. Fixed in `a9e7390`: every keyed transaction checks its key before writing (`apps/server/src/services/keyGuard.ts`), and rolls use a per-key seed.
- **Left open:** **n5**, map pins can sit under open overlays (allowed by review 3); the risk line still wraps at a dot on 360 px phones (screens §10's "never wraps" sentence is the designer's to reword).

## Commits

`a337c5c` design (3 Oct) · `b756c48` tech design and settled points (with the slice 6 design) · `b271ed4` phase A (4 Oct) · `f6bb49e` phase B · `de4417d` phase C (5 Oct) · `a9e7390` fix round · `9e51183` the review-4 guide.

## Related

- Previous: [[Slice 4 The Battleground]] · Next: [[Slice 6 Together]] (designed only)
- Reworked by: [[Review 4]] (the cells' costs, Heat display, one map per home city), [[Review 5]] (treatment, night, patrols, the rival header)
