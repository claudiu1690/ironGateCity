---
type: system
title: Hostile Ground
aliases: [Rival ground, Rival home cities, Behind the lines, Deportation, Rival header]
tags: [city, risk, travel]
status: partly built
slice: "5; rival header and night patrols in review 5; recognition designed for 8"
gdd: ["§14.12", "§14.11"]
adrs: ["0034", "0082", "0080", "0081"]
updated: 2026-10-14
---

# Hostile Ground

## In one paragraph

A player can take the train to a **rival party's home city** and work there. The player word is
*rival ground*. It is the most dangerous place in the game and pays the best: every check is harder,
every tap can bring a run-in, Heat counts double, and a stay in the cells ends with deportation. In
return, Party XP is half again higher, and the work wears down the home party's morale, with a
prize for pushing the town into Unrest. Nothing a player owns is ever at risk.

## How it works

**What differs there** ([[GDD#14.12 Hostile ground: rival home cities (new)|GDD §14.12]], slice-5
form; every item is a ticket tag before the tap)
- Open from **Level 10** with the train; the nation card says *Rival ground*.
- **+4 difficulty** on every check (a named row, −16); **×1 only** (no ×3).
- **A 15 % run-in on every tier-1 tap**; mission run-ins ×2; Heat ×2; the caught base ×2
  ([[Run-ins and Combat]], [[Heat and Record]]).
- **Party XP +50 %** on every action and mission, **+75 % while the city is in Unrest**.
- **Opinion is taken from the home party** (the *against* rule: half to you, half to Neutral) and
  **capped at 2 points a City Day per city** across both rivals; past the cap, actions still pay XP,
  Party XP and Iron but move nothing ([[Influence and Opinion]]).
- No residence, standing or backing there; Party orders cannot be done there; jobs are pointless.
- **The journey in always carries a card** from the hostile deck at difficulty 14: *Papers,
  please* (always the first time), *The informer*, *Your name is on a list* (Heat 50+), *A friendly
  conductor*. New effects: Heat ±, *Watched* (+10 % run-ins today) and *Warned* (−10 %).
- **The cells there:** sentence ×1.5, bail ×2, release is **deportation**: a free train to your
  residence city and **barred from that city for 24 hours** ([[Jail and the Cells]]).

**The rival header** (review 5, built; [[adr/0082-the-push-ring-on-the-city-and-the-unrest-prize-as-an-award|ADR 0082]])
- The plate replaces its pressure line with three: the **push bar** (*Pushed today · 0.7 of 2
  points*, split by the two rival parties), the **danger line** in the player's own risk word, and
  the **goal line** (*The goal: Unrest … 11.4 points to go · your party has pushed 4.2 this week*).
  A home's lead never flips, so the stake is the state, never the lead.
- **The Unrest prize:** +50 Party XP to each member who pushed ≥ 0.5 points in seven days when the
  town enters Unrest ([[Battleground and Groundswell]]).

**Night patrols** (review 5, built): only on rival ground and only at night, never on an absent
player. A higher run-in base while acting (25 instead of 15 on tier 1) and a random *Patrol* stop
on reading the city view. Full rules on [[Night and Patrols]].

## Where it lives

**Rules:** [[GDD#14.12 Hostile ground: rival home cities (new)|GDD §14.12]] ·
[[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]] (the cap, the prize) ·
[[design/slice-5-risk#11. Rival ground (GDD §14.12, slice-5 form)|slice-5 design §11]] ·
[[design/review-5-answers#10. #10 — Rival ground: the push, the danger, the goal (decided: the user approved §10.2 and §10.3 as proposed, 8 Oct 2026)|review-5 answers §10]] ·
[[adr/0034-opinion-against-and-rival-ground|ADR 0034]] · ADR 0080, 0081 (night run-in, patrol) · ADR 0082

**Code:**
- Rules: `packages/rules/src/rivalGround.ts` (`rivalGroundOf`, `RIVAL_ROW`, `addPressure`,
  `pressureByFaction`, `pushedThisWeek`, `rivalFxpShare`) · `packages/rules/src/opinion.ts`
  (`applyAgainst`) · `packages/rules/src/runIn.ts`, `packages/rules/src/patrol.ts` · constants
  `RIVAL_GROUND`, `UNREST_PRIZE`
- Server: `apps/server/src/services/modifiers.ts` (`rivalGroundAt`) ·
  `apps/server/src/services/place.ts` (`moveOpinion`: the cap and the push ring) ·
  `apps/server/src/services/cityService.ts` (`rivalHeaderView`) ·
  `apps/server/src/services/patrol.ts`, `night.ts` · `apps/server/src/services/travelService.ts`
  (hostile deck, deportation)
- Data: `packages/db/src/models/city.ts` (`rivalPressure { day, lost, prev, byFaction, week }`) ·
  content `packages/content/src/data/journeyEvents.ts` (hostile and patrol decks)
- Client: `packages/ui/src/components/RivalHeader.tsx` · `apps/client/src/routes/city.tsx`
  (`rivalHeaderLines`, the *rival ground* kicker)

## Status

- **Built:** slice 5 (the whole slice-5 form); review 5 (header, push ring, prize, night patrols).
- **Not built:** recognition by Charisma, office and Legacy, plain clothes, forged papers and the
  press pass (slice 8); safehouses, bodyguards, night travel, the Secret Police, the opportunity
  encounters (the disillusioned local, the leaked document); missions only doable there; *rare
  Dossier entries*.

## Decisions

- ×1 only on rival ground (Appendix C #48). Deportation is release (Appendix C #51). The cap is 2
  points a day per home city (Appendix C #52). +50 % Party XP (Appendix C #53).
- Header, prize and night patrols approved by the user on 8 Oct 2026, with the patrol stop made a
  chance, not a certainty (review 5 #10, #12).
- Presence is invisible on rival ground (Appendix C #63).

## Open questions / drift

- GDD §14.12's opening table says *10–20 % encounter* on tier-1 taps; slice 5 pinned **15 %** (25
  at night). The later paragraph wins, so this is history, not drift.
- ADR 0082 notes a member can earn the prize in two rival towns in one week (100 Party XP); settled
  as intended in [[design/review-5-answers|review-5 answers §18]].

## Related

[[Night and Patrols]] · [[Travel and Journeys]] · [[Home Cities]] · [[Battleground and Groundswell]] ·
[[Run-ins and Combat]] · [[Heat and Record]] · [[Jail and the Cells]] · [[Equipment and Wardrobe]] ·
[[Slice 5 Risk]] · [[Review 5]]
