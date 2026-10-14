---
type: runbook
title: Run a Design Review Round
aliases: [review round, design review, fix round]
tags: [process, review]
updated: 2026-10-14
---

# Run a Design Review Round

**Use when:** the user has played a build and written notes. A round turns those notes into
decisions, a plan, a phased build, QA and a fix round, then hands the next build back. Based on how
reviews 4 and 5 were run ([[Review 4]], [[Review 5]]); reviews 1–3 were smaller (notes and an
answers doc only).

> [!note] Two numberings
> The repo numbers rounds **Review 1–5**. Notion numbers the user's pages **Design Review 1, 2, 3…**
> from review 4 on: Design Review 1 = repo review 4 (6 Oct 2026), Design Review 2 = review 5
> (8 Oct), Design Review 3 = the next one (its page holds the voting rework).

## Steps

1. **Hand over the build.** Before a review, write a short guide for the user, as
   `docs/review/review-4-guide.md` did: how to start (`pnpm dev:mem`, http://localhost:5173, the
   **Dev** button), what is in the game, a walk-through of about an hour, defaults taken for them to
   confirm, known open items, what comes next, and a screenshot sheet in `docs/review/review-N/`.
   In Notion, the **Design Review N** page (inside *Design Reviews* under the IronGateCity page)
   carries the build snapshot and a *Current build context* toggle (branch, commit, date, how to
   run, what is in, what is not).
2. **Collect the notes.** The user writes raw bullets under `## Review Notes` on the Notion page.
   Copy them **verbatim, lightly tidied** into `docs/review/YYYY-MM-DD-review-N.md`, numbered, with
   the build commit they played.
3. **Triage in Notion.** Under each of the user's bullets (never edit theirs), add one nested line:
   `**Category** · status · what changes`. Categories: Art, Story, UI, Bug, Copy, Feature, Map,
   Gameplay, Balance, Decision, Keep. Status: Done, In progress, Planned, Needs you. Keep these
   lines current as work lands.
4. **Answer every note — game-designer.** `docs/design/review-N-answers.md`: a table of every note
   with its decision and where it is answered, then one section per note with the decision, the
   reason, **the exact player-facing strings**, ids and numbers, and the screens affected. Notes
   that need the user carry options with a **▶ Default**. Rule changes go into the GDD in the same
   work (GDD §0 *Added …* plus the section; new Appendix C items). Quick fixes are listed
   separately (a fix list) so they can ship first.
5. **Get the user's decisions**, batched. Where the user rejects every option (the opening went
   three rounds in review 5), write a new round of options in the same answers doc.
6. **Plan the build — architect.** `docs/tech/review-N.md`: goal and per-note checklist, decisions
   at a glance, shared groundwork, one section per feature (F1, F2…) with its answers §, GDD § and
   ADR, API, migration (if any), jobs, idempotency, the result modal, testing, risks, knock-ons on
   the unbuilt slices' tech docs, left out, a **task list in phases** with *Done when*, questions,
   and a **Deviations** section filled in as built. New ADRs in `docs/adr/`.
7. **Build in phases — developer.** Quick fixes first if any, then phase by phase. Per phase:
   `pnpm art:check && pnpm turbo run lint typecheck build` plus the e2e projects it touches; commit
   per phase. Don't stop between phases for wording: batch wording questions to the designer and
   answer them in parallel. Run the full `pnpm e2e` once, before QA.
8. **Write the build notes** for the user: `docs/review/review-N-build-notes.md`, a table of every
   note: *your note · what the build does now · where to see it*, plus how to start and what an old
   account will see.
9. **QA.** `docs/qa/review-N-report.md`, checked against the user's notes, the answers doc, the tech
   doc and its Deviations, the ADRs and the build notes. Browser tests only
   (`apps/client/e2e/qa.reviewN.spec.ts`, its own project, known bugs `test.fail`). Brief QA
   narrowly and time-box it.
10. **Fix round — developer**, then commit. Points QA leaves for the user go to the next review.
11. **Close the round.** Mark the Notion lines Done with what actually changed; open the next
    **Design Review N+1** page with its build context and a *New since the last review* checklist.
    Push only when the user says so.
12. **Update the wiki**: a history page for the round, the user's decisions in the
    [[Decision Log]], every touched system page, Open Questions and the Drift Report. See
    [[Keep the Wiki Current]].

## Checks before done

- Every note has an answer, a build-notes row and a Notion status.
- GDD edits for every rule change are in; Appendix C updated.
- Fast check green, full e2e green once, QA fix round committed.
- The next review's Notion page is ready.

## Examples

| Round | Notes | Answers | Tech plan | Build notes | QA |
|---|---|---|---|---|---|
| Review 1–3 | `docs/review/2026-09-30-review-1.md`, `…-review-2.md`, `2026-10-02-review-3.md` | [[design/review-1-answers|1]], [[design/review-2-answers|2]], [[design/review-3-answers|3]] | — | — | — |
| Review 4 (Design Review 1) | [[review/2026-10-06-review-4|notes]] | [[design/review-4-answers|answers]] | [[tech/review-4|tech]] | [[review/review-4-build-notes|build notes]] | [[qa/review-4-report|report]] |
| Review 5 (Design Review 2) | [[review/2026-10-08-review-5|notes]] | [[design/review-5-answers|answers]] | [[tech/review-5|tech]] | [[review/review-5-build-notes|build notes]] | [[qa/review-5-report|report]] |
| Voting rework (Design Review 3 item) | — | [[design/voting-simplified|design]] | [[tech/voting-rework|tech]] | — | [[qa/voting-rework-report|report]] |

## Related

[[Run a Slice]] · [[Keep the Wiki Current]] · [[Review 4]] · [[Review 5]] · [[Voting Rework]] ·
[[Decision Log]]
