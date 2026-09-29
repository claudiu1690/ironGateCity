# ADR 0013 — Tier-3 stories share one view model and one screen; each flow is a small service; no story interpreter yet

**Status:** accepted (slice 2) · **Date:** 2026-09-29

## Context

Slice 2 has two tier-3 stories (GDD §13.1: 2–3 short steps, always resumable): the **origin** (three steps of two
questions, then the street and the faction choice; no roll, no Energy; it ends by creating a character) and the
**Ambition chapter** (§17.1: a choice with no roll, one check with two approaches paid in Energy, the result modal).
Later slices add more: encounters (slice 5), patron Requests (slice 8), later chapters.

A generic engine (steps as a graph in content, an interpreter on the server, one `story.advance` procedure) would
cover both, but the two flows share almost nothing on the server: one writes an `arrivals` draft and ends in a
character insert (ADR 0011); the other spends Energy, rolls from a seed and pays rewards like an action (ADR 0002).
What they do share is the **screen**: art panel, kicker, title, a 2–3 line paragraph, choices as full-width buttons
with a hint line, one dark CTA, *Close the game now and this waits for you* (`docs/mockups/Story.dc.html`).

## Decision

- **One view model**, `StoryScreenView`, built on the server with every placeholder resolved: kicker, title,
  narrative, art (a scene with a focus point, or a map crop), portrait, echo line, prompt, `choices[]` (one tap
  commits), `approaches[]` (each with its full `CheckBreakdown`), `cta`, progress (*step n of 3*) and the resume
  note. **One component**, `StoryScreen` in `packages/ui`, renders it on phones and desktop.
- **Two services, no interpreter.** `arrivalService` (ADR 0011) and `ambitionService`. Chapter content has a fixed
  shape (`choose` → `check` → result), which is exactly GDD §17.1's chapter rule, so the flow is code and the words,
  numbers and flags are data.
- **Resumability is state, not a session:** the arrival's `answers[]`, and `characters.ambition { chapter, step,
  choiceId, flags, history }`. A reload re-renders the stored step.
- **Idempotency by kind of step.** Choices (origin answers, chapter step 1) are set-once conditional updates keyed
  by the step itself (no key, as ADR 0008 allows). The chapter check spends Energy and rolls dice, so it is a game
  action with an idempotency key and an `actionLogs` row (`kind: 'chapter'`), resolved exactly like ADR 0002, and its
  result is an `ActionResult` so the existing result modal renders it (stamp *Success / Partial / Failure*).
- Revisit when a third flow with branching steps arrives (encounters in slice 5 or patron Requests in slice 8): if
  two flows then share their server logic, extract it; not before.

## Consequences

- Little new machinery: one screen, one DTO, the existing modal and action transaction.
- A chapter with a shape other than choose → check → result needs code. GDD §17.1 pins that shape, so this is a
  design change, not a content change, which is the right cost.
- The retry loop of `action.perform` is extracted into a shared helper so `ambition.attempt` uses the same code
  (fast path, M1 stored-result lookup, day change, bounded retries).
