---
type: system
title: Jobs
aliases: [Job, Wage, Seniority, Job ladder, Jobs board, Salary]
tags: [economy, progression]
status: partly built
slice: "1 (shift version); review 1 (a job is a wage); review 5 (the ladder rule)"
gdd: ["§9", "§9.1", "§9.2"]
adrs: ["0005", "0017"]
updated: 2026-10-14
---

# Jobs

## In one paragraph

A job is a **wage**: steady Iron that costs no Energy and does not depend on faction work, so the
whole Energy bar goes on politics. There is no shift to work. The only decision is *which* job: the
faction's own job pays members a fifth more, the Driver is the first thing training unlocks, and
council rules fight over the wage. A job is never lost by being away.

## How it works

- **One job at a time.** Taking it is free and one tap on the *Jobs* card at the job's place; the
  card lists pay and requirements, checked only on taking ([[GDD#9.1 Rules (reworked)|GDD §9.1]]).
- **Switching** is one tap, free, at once, and **resets seniority to 0**. Nothing about a job costs
  Energy or touches Rested.
- **The wage** pays the job's **full daily pay at every 00:00 UTC boundary**, present or not. The
  member's fifth is its own line. Desk: *Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)*;
  card: *216 a day, paid at midnight* (in the player's clock).
- **Seniority:** +2 % of daily pay per City Day held, to **+20 % after ten days**, its own line. It
  never falls except by switching and keeps counting while away. *Five Days In* and *Ten Days In*
  headlines fire the morning after.
- **Cap on return:** at most **14 days' pay** credited after any absence; the job is kept and pay
  resumes at the next boundary.
- **Under a council rule** ([[Ordinances]]): seniority and the rule's pay line (e.g. *Street Fund
  −54*) are each a percentage of the unmodified pay; the wage uses the rule in force on the day
  that ended. Wage effects apply where the job is.
- **The ladder rule** (review 5): *a job that asks more pays more*. Each rung pays **at least a
  tenth more than the best pay of the rung below, the member's fifth counted**; rungs are set by
  the requirement, never the city ([[GDD#9.2 Job catalogue|GDD §9.2]]).
- **Pinned rungs:** street vendor **100** (fallback) · day-1 job **180, 216 for members** (Factory
  worker / Stores hand / Copy clerk; the capital's Porter 180, no fifth) · first step **240** (Driver,
  Level 3 + Agility 10; Market trader, Level 3 + INT 10) · Level 6 **320** · Level 10 **500** ·
  Level 16 **900** · Rank 4 **1,500**.
- **Built jobs:** twelve, three per home city and three in the capital, all in Level-1 quarters,
  so the card's requirement is the real one. One job belongs to one place ("Driver" is four ids).

## Where it lives

**Rules:** [[GDD#9. Jobs|GDD §9]] · [[design/review-5-answers|review 5 answers §5]] (the audit and
rule) · [[design/review-1-answers|review 1 answers]] (the wage) · [[economy|economy sheet §5.1, §16.1, §25.1]] · [[adr/0005-lazy-per-character-city-day|ADR 0005]] (settled lazily) ·
[[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]]

**Code:**
- Rules: `packages/rules/src/jobs.ts` (`jobPay`, `seniorityPct`, `seniorityBonus`, `jobLocks`,
  `settleDays`) · `JOBS` in `packages/rules/src/constants.ts` · `jobPayPct`, `seniorityDays` bounds
  in `ORDINANCE_BOUNDS`
- Server: `apps/server/src/services/jobService.ts` (take, switch) · `dayService.ts` (the wage at the
  boundary) · router `apps/server/src/trpc/routers/job.ts` (`take`)
- Data: `characters.job { id, since, seniority }` (`packages/db/src/models/character.ts`) · content
  `packages/content/src/data/jobs.ts` (four Drivers at `dailyPay: 240`)
- Client: `JobsCard` in `packages/ui/src/components/Sheets.tsx` (on the place sheet,
  `apps/client/src/routes/city.tsx`); the desk row in `Paper.tsx`

## Status

Built: the wage, seniority and the cap (review 1 fix round), the twelve jobs, the Driver at 240
(review 5). Designed: Clearwater's three jobs (slice 7). Not placed: the Market trader (and its
mini-game), Level 6–16 jobs and the Political aide.

## Decisions

- [[Review 1]] (30 Sep 2026, user decision): a job is a wage; the shift, work streak, sick days and
  Premium *Remote Work* are gone; *Take a job* is a welcome-day order only.
- [[Review 5]] (8 Oct 2026): the ladder rule; Driver 200 → 240 (Appendix C #96).

## Open questions / drift

- Appendix C #17 (the 14-day cap may become a returning bonus), #31 (seniority counts absent days)
  and #96 (if Agility builds take the Driver and never look back, place the Level-6 rung) are open.
- [[adr/0005-lazy-per-character-city-day|ADR 0005]] was amended on 14 Oct 2026: the wage (review 1)
  replaces its half salary, work streak and sick days.

> [!note] Inference
> §4.2 (*pay stops accruing after 14 boundaries*) and §9.1 (*a return credits at most 14 days'
> pay*) are one rule in two wordings; the code caps each settlement at `JOBS.salaryMaxDays = 14`.

## Related

[[Iron Marks and the Economy]] · [[Ordinances]] · [[Session Loop]] · [[The Morning Paper]] ·
[[Party Orders]] · [[Stats and Checks]] · [[Time and the Game Day]]
