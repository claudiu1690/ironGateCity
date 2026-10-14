---
type: history
title: Slice 0 Walking Skeleton
aliases: [Slice 0, Walking skeleton]
tags: [slice, built]
status: built
dates: 2026-09-29
commits: [e400bc4, 7ad1c16, 64065fb]
gdd: ["§5.3", "§5.5", "§6.3", "§8.4", "§13.1a", "§14.2"]
adrs: ["0001", "0002", "0003", "0004"]
updated: 2026-10-14
---

# Slice 0 Walking Skeleton

**Status: built** (29 Sep 2026), checked by QA with slice 1.

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 0 — Walking skeleton|the plan]]: the monorepo, the database, sign-up, the rules package v1 with the check formula, the UI package v1 with the result modal, and **one action that resolves on the server and shows the result modal**.

- **Done when:** a deployed URL where you sign up, tap *Canvass* and see a real result modal.
- **Question:** does the whole pipe work, from tap to database to modal?

## What it added

- The repo layout and tooling: pnpm + Turborepo, the client, the server, and the packages. See [[Architecture Overview]], [[Server and API]], [[Game Client]].
- [[Rules Package]] v1: the check formula (50 % + 4 % × (stat − difficulty) + bonuses) and a seeded roll. See [[Stats and Checks]].
- [[Database and Models]] v1: users, characters, cities, action logs. City documents hold state, not content ([[adr/0003-city-documents-hold-state-not-content|ADR 0003]]).
- [[Auth and Accounts]]: Better Auth sign-up and login.
- [[The Result Modal]] with the full breakdown from the server ([[GDD#13.1a The result modal|GDD §13.1a]]).
- One Coalport place with one *Canvass* action. Every new character was the **reference recruit** (Collective, STR 10 / INT 12 / AGI 5 / CHA 2), at 66 % on the canvass.
- [[Atomic Actions and Idempotency]]: one conditional write per action, a key per request ([[adr/0002-atomic-idempotent-actions|ADR 0002]]).
- An in-memory replica set for tests and local play ([[adr/0004-in-memory-replica-set-for-tests-and-dev|ADR 0004]]). See [[Dev Panel and Local Setup]].

## Documents

- Tech design: [[tech/slice-0|tech/slice-0]] (with its *Deviations* section).
- Designer answers to the architect: [[design/slice-0-answers|design/slice-0-answers]] (ten numbers: Energy, rounding, opinion per Energy, the level table, Coalport's baseline, place kinds).
- ADRs: [[adr/0001-same-origin-api-via-proxy|ADR 0001]] to [[adr/0004-in-memory-replica-set-for-tests-and-dev|ADR 0004]].
- QA: [[qa/slices-0-1|qa/slices-0-1]] (shared with slice 1).
- GDD changes: [[GDD#0. What changed in 3.1|GDD §0]], *Added 29 Sep 2026 (slice-0 answers)*.

## Decisions made

- The old v3.0 code (`apps/api`, `apps/web`) was removed in one commit so it stays in git history (`e400bc4`).
- Designer answers, pinned in the GDD the same day: rounding is nearest whole, halves up, per line; a roll **at or below** the chance succeeds; Rested is proportional per Energy point; opinion moves 0.005 points per Energy, drawn from Neutral first; levels 1–51 have a fixed XP table ([[GDD#5.3 Levels|GDD §5.3]]).
- The reference recruit was a real set of origin answers, so slice 2 could replace it with the dialogue.

> [!warning] Drift
> The plan's *done when* asks for a **deployed URL**, preview deploys and Sentry. Nothing is deployed: the user later decided to work and playtest **locally until the end** of the project (the review-4 guide, §6). The deploy config exists (`vercel.json`, Sentry no-op without a DSN) but no service is live. Project `CLAUDE.md` still says every slice is "deployed".

> [!note] Inference
> The reference recruit's numbers were replaced in review 4 (STR 8 / INT 12 / AGI 5 / CHA 5). The slice-0 answers doc still shows the old figures as the record.

## QA and leftovers

- **Verdict: Pass** ([[qa/slices-0-1|QA report]], 29 Sep 2026). Sign-up, the canvass, server-side rolls, atomic writes, the health check and env checks all behaved.
- It shared bug **M1** with slice 1: a concurrent retry with the same key got a refusal instead of the stored result. Fixed in fix round 1 (`d2f3c3c`).
- No leftovers specific to slice 0.

## Commits

- `e400bc4` remove the v3.0 codebase · `7ad1c16` GDD v3.1, the plan, mockups and the agent team · `64065fb` slice 0 (all 29 Sep 2026). All work is on branch `slice-0`.

## Related

- Next: [[Slice 1 The 5-Minute Session]]
- [[Decision Log]] · [[Open Questions]]
