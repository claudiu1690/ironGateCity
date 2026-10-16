---
type: system
title: Missions
aliases: [Tier 2, Tier-2 missions, Mission, Ways, Society calls, Night missions]
tags: [street-play, tier-2, risk]
status: partly built
slice: "5; night windows and four night missions in the review-5 fix round; society calls designed for 8"
gdd: ["§13.1", "§13.2", "§13.3", "§13.5", "§13.6", "§8.4"]
adrs: ["0031", "0032", "0080"]
updated: 2026-10-16
---

# Missions

## In one paragraph

A mission is **tier 2** of play (about 15 % of content): a ticket under a *Missions* kicker on a place's sheet, with one short briefing and **two or three ways** to do it. Tapping a way is the choice. Missions are where risk lives: [[Heat and Record|Heat]], a possible [[Run-ins and Combat|run-in]], and for illegal work a caught check that can put a mark on your record or send you to [[Jail and the Cells|the cells]]. They give weight to the moments that deserve it, while [[Street Actions]] stay fast.

## How it works

- **The ticket shows the risk in words before the tap**: *Heat +8 · Risky · if caught, a mark on your record*. The risk word is the band of your run-in chance here today: *Safe*, *A little risk* (to 10 %), *Risky* (to 24 %), *Dangerous* (25 % and over) ([[GDD#13.1 Three tiers of play (new)|GDD §13.1]], "Tier 2 as built").
- **Each way** is a stat and an odds word (*Fair odds · Agility*); a way may carry its own Heat or run-in. **The way is remembered**: next time the ticket reads *Again, {way} · 15 Energy* with *Choose another way*. **No ×3** on a mission.
- **Outcomes:** Success, Partial or **Failure** (tier 2 can fail). A Success on an Agility way adds a quarter point of Agility.
- **The order of play:** the check decides the outcome and **holds** the rewards → the run-in is rolled and, if it fires, decides whether the held result is paid → the caught check (illegal missions, **Partial or Failure only**) → one [[The Result Modal|result modal]].
- **Types** ([[GDD#13.3 Mission types|GDD §13.3]], pinned for slice 5): Energy **speech 15 · surveillance 12 · vandalism 10 · disruption 15 · sabotage 20 · theft 15**. Run-in base 5 / 10 / 15 / 30 / 25 / 25 %. The four illegal types have a caught check and marks (1 · 1 · 3 · 2); speech and surveillance are legal. Theft pays **double Iron and no opinion**; surveillance pays no Party XP.
- **Rewards** at the tier-2 rate: **5 XP, 0.8 Party XP, 4 Iron per Energy**; opinion **0.01 a point per Energy, ×2 for illegal types**, drawn from the target faction ([[Influence and Opinion]]).
- **Difficulty** by the mission's Level: **14 at Level 6, 16 at 8, 18 at 10, 20 at 12**; +2 in [[Irongate]]; +4 on [[Hostile Ground|rival ground]] ([[design/slice-5-risk#4.3 The difficulty ladder (GDD §8.4, Appendix C #15 closed)|design §4.3]]).
- **Gates:** Level, **Rank 3 for every illegal mission**, a *Known* [[Local Standing|Reputation]] for some, and *Notorious* bars court and university places. An illegal mission names a **target** faction and is for everyone else; in the capital the target may be `leader`.
- **Party orders:** from Level 6 slot B can be *take on a mission* ([[Party Orders]]). A speech mission counts as `speech` and a surveillance as `intelligence` for orders and Issues.
- **Night (review 5):** a mission, or one way, may be night-only (`window: 'night'`). By day it shows *Opens at nightfall · dusk at 16:00*. Twelve Agility ways became night-only, and **four night missions** (one per city) pay **+25 % Iron**, never Party XP. Night content is always extra. See [[Night and Patrols]].
- **Art** ([[GDD#13.5 Art for missions: the fallback ladder (new)|GDD §13.5]]): missions never get unique art. The ladder's rungs: story art, a scene per location **kind** (twenty-one kinds, closed list, `theatre` and `town-hall` included), a map crop, a mission-type card, portraits. **As built** (GDD §13.5 says so since 14 Oct 2026): a tier-2 mission shows **the type card first**, then the place scene, then the map crop; a tier-1 action shows the place scene, then the map crop. Tier 1 needs no art of its own. See [[Art and Maps Pipeline]].
- **Social missions** ([[GDD#13.6 Social missions|GDD §13.6]], designed for slice 8): a **society call**, legal, 15 Energy, difficulty = its Charisma requirement, barred below that minus 10; +2 Favour with the town's patron and a Dossier entry one time in four. Six calls at the Opera, the Grand Hotel and Clearwater's Front.

## Where it lives

**Rules:** [[GDD#13.1 Three tiers of play (new)|GDD §13.1]] · [[GDD#13.2 Mission anatomy|§13.2]] · [[GDD#13.3 Mission types|§13.3]] · [[GDD#13.5 Art for missions: the fallback ladder (new)|§13.5]] · [[GDD#13.6 Social missions|§13.6]] · [[design/slice-5-risk#4. Missions (tier 2): the rules|design §4]] and [[design/slice-5-risk#5. The mission catalogue (22)|§5 catalogue]] · [[design/review-5-answers#12. #12 — Night missions, and patrols on rival ground at night (decided: the user approved §12.1 and §12.2, with the night stop made random as §16.1 settles it, 8 Oct 2026)|review-5 answers §12]], §18.2–§18.2a · [[design/slice-8-life|slice-8 design §3.7]] (society calls) · [[adr/0031-missions-their-own-list-one-resolver|ADR 0031]] · [[adr/0032-run-ins-pending-step-and-luck|ADR 0032]] · [[adr/0080-night-windows-on-content-and-the-night-run-in-on-rival-ground|ADR 0080]] · [[tech/slice-5|tech spec slice 5]] · [[qa/slice-5-report|QA slice 5]]

**Code:**
- Rules: `packages/rules/src/missions.ts` (`missionDifficulty`, `missionRisk`, `windowLock`, `resolveMission`, `finishMission`, `NIGHT_RATE`), `runIn.ts`; type table `MISSION_TYPES` in `constants.ts`
- Server: `apps/server/src/services/missionService.ts` (`startMission`, `writeMissionFinal`), `missionCtx.ts`, `missionResult.ts`, `streetService.ts` (the run-in step), `views.ts` (`startableMissions`) · router `apps/server/src/trpc/routers/mission.ts` (`start`)
- Data: content `packages/content/src/data/missions/{coalport,duskwall,ashford,irongate}.ts`, `attach.ts`; `opponents.ts` · models `actionLog.ts` (`kind: 'mission'`), `encounter.ts`; the remembered way is `characters.ways`
- Client: `apps/client/src/features/street/useMissionStart.ts`, `RunInGate.tsx` · `packages/ui/src/components/Missions.tsx`

## Status

- **Built** in [[Slice 5 Risk|slice 5]]: 22 missions at 21 places. [[Review 5]] added night windows and four night missions, so content now holds **26** (5 speech, 5 surveillance, 5 vandalism, 4 disruption, 4 theft, 3 sabotage) with **16** night windows.
- **Slice 8, server built (16 Oct 2026):** society calls through `writeMissionFinal` in `apps/server/src/services/missionService.ts` (`today.calls` once a day per place, Favour with the town's patron, the entry one time in four through `landEntry`; T13, `b34c740`), the patron introductions (*The morgue file* takes `mission.start`'s `subjectId`, `SUBJECT_REQUIRED`; *The late table*), the ticket's `MissionView.society` and `.subject`; Dossier entries on surveillance and theft (lane 2). The screens are phase C.
- **Designed, not built:** Operations (tier 3, Rank 5+).

## Decisions

- 3 Oct 2026 (ADR 0032): an unanswered run-in is settled by luck after five minutes, or at the day's end.
- Slice 5: the caught check rolls only on a Partial or a Failure; a clean job leaves no name (Appendix C #56).
- 8 Oct 2026, [[Review 5]]: night as a window on content, the night rate, and night content is always extra.
- 9 Oct 2026: the last tram is a `speech` at 15 Energy, not propaganda (review-5 answers §18.2a).

## Open questions / drift

- [[qa/slice-5-report|QA slice 5 §4]]: a mission with a named target that isn't the home party keeps its target on rival ground (uncapped); flagged as ambiguous. GDD §14.12 now says the named target is kept and capped only when it is the home faction.

## Related

[[Street Actions]] · [[Run-ins and Combat]] · [[Heat and Record]] · [[Jail and the Cells]] · [[Hospital and Treatment]] · [[Night and Patrols]] · [[Local Standing]] · [[Party Orders]] · [[Hostile Ground]] · [[Add a Mission]]
