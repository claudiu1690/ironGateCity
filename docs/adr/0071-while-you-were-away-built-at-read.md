# ADR 0071 — *While you were away*: built at read from the world's records by day; the return edition stores the absence; Rested filled by the settlement

**Status:** proposed (slice 9; extends ADR 0005, 0023) · **Date:** 2026-10-04

## Context

Design §6.6 (GDD §3.3, §4.2) sets out the row:

- after **two or more City Days** away, the paper opens with a **While you were away** row of at most four lines (the days; the republic's line; the city's; the branch's; what was banked);
- a tap opens **the digest**, the missed editions folded by day;
- after **30 or more days**, Rested is **filled to the cap** at the first read and the row reads *Welcome back.*

The design's default builds it at read from "the missed editions' entries (`paperEntries` by day)". But an edition is printed only at a character's settlement (ADR 0005). A player away for five days has **no editions for those days**, only the return day's, with `daysSinceLastPaper`. The world does keep its own dated records:

- elections counted;
- laws and ordinances with their `fromDay`;
- Issues resolved;
- events resolved;
- terms begun;
- `nation.news` for 14 boundaries.

## Decision

1. **The settlement** into today, with window `w`:
   - stores `desk.away = { days: w, from, banked }` on the edition when `w ≥ 2`;
   - when `w ≥ 30`, sets Rested to the day's cap (`restedAfterAbsence`). The settlement's `day.settled` guard makes this happen once. No `awayFilledDay` is needed.
2. **The facts** (`AwayFact { day, scope, templateId, params, priority }`) are read at request time by indexed range reads over the window. The scopes are the republic, the residence and home city, and the faction. Each fact names an existing headline template, so the voice is the paper's.
3. **`awaySummary`** (pure) picks one line per scope by priority. **`foldDigest`** (pure) groups by day, newest first, at most six a day and thirty days.
4. **Nothing new is stored** beyond `desk.away`. `paper.today` carries the row, and `paper.away` the digest.

## Consequences

- The digest is correct for any absence, including the days nobody settled.
- `nation.news` keeps 14 boundaries, so the republic's lines older than that come from laws and elections only.
- Slice 8's *a new season began* line becomes one of the republic's facts.
