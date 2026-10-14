---
type: runbook
title: Run a Slice
aliases: [slice workflow, build a slice, the slice pipeline]
tags: [process, team]
updated: 2026-10-14
---

# Run a Slice

**Use when:** starting the next vertical slice of the plan
([[IMPLEMENTATION_PLAN|implementation plan]] §1, §4). Every slice cuts through every layer, ends
playable, and ends with **one playtest question**. Work is proposed and tracked as slices, in the
plan's order (project CLAUDE.md). State on 14 Oct 2026: slices 0–5 built; 6–9 designed, waiting for
the user's go after Design Review 3.

## Steps

1. **Read the slice in the plan**: what is built, the content it needs, and the playtest question.
   Read the wiki pages for the systems it touches ([[index|index]]).
2. **Design it — game-designer.** Writes `docs/design/slice-N-<name>.md` (e.g.
   `slice-5-risk.md`): the rules pinned with numbers, content lists and texts, what the player sees,
   session shape (pillar 7), economy, **the GDD edits made in this change**, questions for the
   architect, a content-policy check, art needed, and *points for the user, each with a default*.
   Screens go in `docs/design/slice-N-screens.md`. The GDD and `docs/economy.md` change **in the
   same work**. *Design one slice ahead*: slice N+1's design is prepared while N is built.
3. **Batch the user's decisions.** Only real decisions go to the user, together, each with a
   recommended default. Everything else the team decides.
4. **Technical design — architect.** Writes `docs/tech/slice-N.md`: scope, decisions, content
   shape, Mongoose models and indexes, `packages/rules` functions, tRPC procedures, Agenda jobs and
   their idempotency, how the result modal's breakdown is built, client, art, security, testing,
   a QA playtest checklist, risks, what is left out, and a **task list in phases**. Significant
   choices become ADRs, `docs/adr/NNNN-<title>.md` (context, decision, consequences). The designer
   answers the architect's questions in the design doc (*Settled for the build*).
5. **Build — developer**, phase by phase from the task list. Rules that always hold: server
   decides, client shows ([[Architecture Overview]]); every action atomic and idempotent
   ([[Atomic Actions and Idempotency]]); timers lazy ([[Lazy Timers]]); content is data
   ([[Content Package]]); numbers match the GDD. Migrations and seed in `packages/db`. Anything
   built differently from the tech design goes in its **Deviations** section.
6. **Check each phase**, then commit it (small logical commits on branch `slice-0`, with the
   attribution line):
   - `pnpm art:check && pnpm turbo run lint typecheck build` (turbo cache; never `--force` while
     working);
   - only the Playwright projects the phase touches, e.g.
     `pnpm --filter @irongate/client exec playwright test --project=missions` (projects are listed
     in `apps/client/playwright.config.ts`; set `E2E_WEB_PORT` / `E2E_API_PORT` if ports clash);
   - no new Vitest tests and no Vitest runs (the user, 8 Oct 2026; [[Checks and Testing]]).
7. **Full e2e once, before QA**: `pnpm e2e`.
8. **Verify — qa.** A test plan and report in `docs/qa/` (`slice-N.md`, `slice-N-report.md`):
   checked against the GDD, the tech design and its Deviations; bugs with steps, expected (with
   the GDD §), actual and severity. QA's browser tests go in `apps/client/e2e/qa.sliceN.spec.ts`
   as their own project, known bugs marked `test.fail`. QA does not fix product code. Brief it
   narrowly: the risk areas and a clarity verdict, about 20–30 minutes, with a *Not covered* list.
9. **Fix round — developer.** Fixes the QA findings; design questions go to the game-designer in
   parallel (sometimes a `docs/design/slice-N-fixes.md`). Re-check, commit.
10. **Answer the playtest question.** Play it locally: `pnpm dev:mem`, http://localhost:5173, the
    dashed **Dev** button (clock, Levels, Ranks, cells, night). Helpers: `pnpm admin:boost`,
    `pnpm report:playtest`. If the answer is no, fix before moving on.
11. **Update the wiki**: the slice's history page, every touched system's Status and Where it lives,
    new ADRs linked, the Decision Log, Open Questions, the Drift Report, `index.md` and `log.md`.
    Follow [[Keep the Wiki Current]].

## Checks before done

- The tech design's task list is done and its Deviations are written.
- Fast check green; full e2e green once; QA report filed and its fix round committed.
- The playtest question has an answer the user can see.
- Wiki updated.

> [!warning] Drift
> - The plan says every slice is **deployed**. The user decided to stay **local until the end of
>   the project** (no hosting yet), so "playable" means playable in `pnpm dev:mem`.
> - `pnpm check` and `pnpm e2e:only` are named in the 8 Oct workflow but **do not exist** in
>   `package.json`; use the commands in step 6.

> [!note] Inference
> From 3 Oct 2026 the user had slices built back to back without a review per slice, then chose a
> stop after slice 5 for a review round ([[Run a Design Review Round]]). Ask before assuming the
> next slice may start.

## Related

[[Run a Design Review Round]] · [[Keep the Wiki Current]] · [[Checks and Testing]] ·
[[Slice 5 Risk]] · [[Slice 6 Together]] · [[Decision Log]]
