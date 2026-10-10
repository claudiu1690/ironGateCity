# ADR 0080 — Night windows on content, the night rate, and the night run-in on rival ground

**Status:** accepted, built 8–10 Oct 2026 (review 5 fix round; extends ADR 0031 and 0032) · **Date:** 2026-10-08

## Context

The user decided review 5 #12 (`docs/design/review-5-answers.md` §12.1, §16.1; GDD §13.1, §14.12):

- **A mission, or one way of a mission, may be night-only.** By day it is shown and locked, with the line *Opens at nightfall · dusk at 16:00*. Twelve Agility ways become night-only.
- **Four new night missions** pay **+25 % Iron** (*the night rate*), never Party XP.
- **Night content is extra.** Every Level's ladder stays complete by day.
- **On rival ground at night, acting is riskier.** The tier-1 run-in base is **25** instead of 15. A mission's run-in gains **+10** after its ×2, under the same 90 cap. The city police make up half of every pool whatever the Heat state.

Missions are content (ADR 0031) and the run-in is one pure function (ADR 0032). Night is read through one server seam (ADR 0079).

## Decision

1. **Content:** `Mission.window?: 'night'` and `Way.window?: 'night'`. The loader enforces three rules:
   - a mission with a window has no way with one (the window is the mission's);
   - a mission without a window keeps at least one way without one, so a day player can always do it;
   - only `night` exists.
2. **Rules:**
   - `windowLock({ mission, way?, night: NightView }) → { lock: 'NIGHT', opensAt } | null`, where `opensAt` is `nextDusk`.
   - The night rate belongs to a mission whose own window is `night`. It is one Iron part, `{ id: 'nightRate' }`: +25 % of the base, rounded half up, in the ADR 0030 way. It is never on Party XP. A night-only way in an ordinary mission pays the ordinary rate.
   - `runInChance` and `missionRisk` gain `night`: tier 1 on rival ground uses `RUN_IN.rivalTier1Night` (25), and tier 2 on rival ground adds `RUN_IN.rivalNightAdd` (10) after the ×2. At home and in a battleground, night changes nothing.
   - `pickOpponent` gains `night`: on rival ground at night the police take half of every pool, as from *Noticed*.
3. **Server:**
   - The window is checked at `mission.start`, before the key is stored, as `MISSION_LOCKED { lock: 'NIGHT', opensAt, wayId? }`. A refusal is not stored, so the same key works after dusk.
   - **A mission that started at night finishes as it started.** A run-in pending across dawn keeps the chance it was rolled at.
   - The tickets show the lock and the risk at the moment they are read.
   - `PlaceTag { kind: 'night' }` reads *Night · patrols out* on rival ground at night.
4. **Night content never gates a rule that matters.** `startableMissions(…, { forOrders: true })` skips night missions and night-locked ways, so the mission order is never offered on the strength of work that waits for the dark.

## Consequences

- Night is a fact read at the act, like the Curfew's (ADR 0044's one exception to day-constant modifiers).
- The receipt shows the night rate as a part, and the tags line shows it as a tag (*Night rate · +25 % Iron*).
- About 7.5 run-ins instead of 4.5 on a thirty-tap night on rival ground (economy §25.4). No asset is at risk.
- E2E specs that take an Agility way of the posters, the duplicator, the roll or a watch run in the forced day (ADR 0079), so they must pick the day way or set night.
- Rejected: a window on tier-1 actions. Tier 1 stays the same by night, and the danger is in the run-in.
