---
type: system
title: Session Loop
aliases: [Core Loop, Today tally, Today, Agendas, Retention, Being Away, While You Were Away, Welcome Back]
tags: [core, session, retention, pillar-7]
status: partly built
slice: "1 (loop, Today tally); 2 (first day); later slices add agendas"
gdd: ["§3", "§3.1", "§3.2", "§3.4", "§3.5", "§3.6", "§3.7", "§4", "§4.1", "§4.2", "§4.3"]
adrs: ["0005", "0071"]
updated: 2026-10-14
---

# Session Loop

## In one paragraph

Irongate is a browser game of short sessions (GDD pillar 7). A session is five to ten minutes:
read the paper, do the quick things, pick an agenda, spend the Energy bar, see what it moved, and
leave something pending for next time. Over weeks those sessions add up to influence, influence
swings cities, cities swing elections, and elections put players in office, where they write the
laws that change every session. Coming back is driven only by **positive** hooks, and **being away
costs opportunity, never assets**.

## How it works

### The loop and a typical session

- **Core loop** ([[GDD#3.1 The core loop|GDD §3.1]]): read the city ([[The Morning Paper]]) →
  choose an agenda → spend [[Energy]] → see your impact → leave something pending. Energy refills
  in 3h20.
- **A typical session** ([[GDD#3.2 A typical session (5–10 minutes)|GDD §3.2]]): paper (~30 s),
  quick things (~30 s, never mandatory upkeep), pick an agenda (~10 s), spend Energy (1–5 min,
  mostly one-tap actions ×1 or ×3), see the result (~15 s), leave something pending.
- **Agendas** ([[GDD#3.4 Agendas: what to spend Energy on|GDD §3.4]]): a [[Party Orders|Party order]] (+25 % Party XP), an [[Issues of the Week|Issue]] (+50 % influence), an
  [[Ambitions|Ambition]] chapter, a patron Request ([[Patronage and Favours]]), a
  [[Campaign Events|Campaign Event]], an election.
- **Archetypes** ([[GDD#3.5 Session archetypes|GDD §3.5]]): quick check (1–2 min), regular (5–10
  min, 3–4 a day), chained (optional, never required), polling day.
- **The first week, month and season** ([[GDD#3.6 The first week, month and season (new)|GDD §3.6]]):
  days 1–3 at home (a taste of everything, the first vote by day 4); days 4–14 the train at Level
  10 and Rank 3; weeks 3–4 the move to a battleground; months 2–3 the city; then the nation.

### The Today tally

- A one-line running sum of the current City Day, on the city screen, and as *Yesterday* in the
  paper ([[GDD#3.7 The "Today" tally (new)|GDD §3.7]]): Energy spent · attempts · Successes · XP ·
  Party XP · Iron earned by actions · opinion moved · orders done (n/3) · stat points trained.
- It resets at the boundary; nothing is lost. **The wage is not in it** (it lands on the desk).
- Every label with a rule behind it has a dotted underline and a two-line note on a tap; no "i"
  icons anywhere (review 1).

### Retention and being away

- **Hooks by timescale** ([[GDD#4.1 Hooks by timescale|GDD §4.1]]): minutes (Energy refills),
  daily (paper, orders, wage), every 5 days (the home council), weekly (Issues), 28 days (national
  election), 12 weeks (season). All are positive.
- **What being away costs** ([[GDD#4.2 What being away costs|GDD §4.2]]): 3 hours, nothing
  (overflow banks as [[Rested]]); 1 day, the wage still pays and seniority counts, today's orders
  are missed; 1 week, Dossier entries go stale; 2 weeks+, pay stops accruing after 14 boundaries
  but the job is kept; the cells or infirmary cost time and the day's orders, nothing owned.
- **Rules we don't break** ([[GDD#4.3 Rules we don't break|GDD §4.3]]): absence never destroys
  what a player owns; absence never lowers a rate; losses belong to competition; collective decay
  is acceptable; every timer is a reward arriving or a choice, never a threat.
- **While You Were Away** (slice 9, designed): after **2+ City Days** away the paper opens with a
  row of at most four lines and a digest of missed days; after **30 days** Rested is filled to the
  cap at the first read and the row says *Welcome back*
  ([[adr/0071-while-you-were-away-built-at-read|ADR 0071]]).

## Where it lives

**Rules:** [[GDD#3. The Session Loop|GDD §3]] · [[GDD#4. Retention: why players come back|GDD §4]] ·
[[design/review-1-answers|review 1 answers §5]] (the notes) ·
[[design/slice-9-screens|slice-9 screens §7]] (the away row) · [[economy|economy sheet §11]]
(session shape) · [[adr/0005-lazy-per-character-city-day|ADR 0005]] ·
[[adr/0071-while-you-were-away-built-at-read|ADR 0071]]

**Code:**
- Rules: `packages/rules/src/tally.ts` (`emptyTally`, `currentTally`, `addToTally`) ·
  `packages/rules/src/jobs.ts` (`settleDays`, the day settlement) · `DailyTally` in
  `packages/rules/src/types.ts`
- Server: `apps/server/src/services/dayService.ts` (settle on first touch) · tally written in
  `actionService.ts`, `missionService.ts`, `ambitionService.ts`, `jobService.ts`, `travelService.ts`
- Data: `characters.today` and the last-played snapshot (`packages/db/src/models/character.ts`) ·
  away headlines `hl.away*` in `packages/content/src/data/headlines.ts`
- Client: `apps/client/src/routes/city.tsx` (the Today strip) · `packages/ui/src/components/Paper.tsx`
  (*Yesterday*)

## Status

- **Built:** the loop end to end (slice 1), the first day (slice 2), the Today tally and
  *Yesterday*, the dotted-underline notes (review 1), lazy settlement so absence is caught up on the
  next read.
- **Designed, not built:** Campaign Events and patron Requests as agendas (slices 6, 8); the slice-9
  *While you were away* row and *Welcome back* Rested fill. The returning Ambition chapter is
  post-MVP.

## Decisions

- [[Review 1]] (30 Sep 2026): a job is a wage, so no daily shift asks for a login; every rule label
  gets a note.
- Pillar 7 ([[GDD#1.2 Design pillars|GDD §1.2]]): never require being online at a set time.

## Open questions / drift

> [!warning] Drift
> **GDD §3.6 vs §15.3 (voting simplified).** The first-week table still says Rank 3 lets you stand
> *if you're Known locally and 2 faction members endorse you*. Since 10 Oct 2026 no backers are
> needed to stand (Appendix C #106).

> [!warning] Drift
> **GDD §4.2 (1 month row) vs ADR 0071.** §4.2 lists a *returning-operative Ambition chapter* in the
> Welcome Back package, then says it is post-MVP. ADR 0071 has no chapter. Consistent in effect,
> but the row reads as if it were in the package.

- Appendix C #17 (the 14-day pay cap may become a deliberate returning bonus) and #31 (seniority
  counts absent days) are open and touch this page.

## Related

[[The Morning Paper]] · [[Energy]] · [[Rested]] · [[Jobs]] · [[Party Orders]] ·
[[Time and the Game Day]] · [[The Result Modal]] · [[Coming Home]]
