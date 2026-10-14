---
type: system
title: Hospital and Treatment
aliases: [Hospital, Infirmary, The infirmary, Treatment, Get patched up, The ward]
tags: [risk, city-services]
status: built
slice: "5; Get patched up in the review-5 fix round; visits designed for 6"
gdd: ["§19.1", "§6.1"]
adrs: ["0033", "0041"]
updated: 2026-10-14
---

# Hospital and Treatment

## In one paragraph

The hospital (the player reads **the infirmary**) is where a lost [[Run-ins and Combat|run-in]] sends you. A short stay, not a punishment: you can still read the paper and do every political act, and Energy keeps refilling. Since [[Review 5]] every infirmary also offers ***Get patched up***, a walk-in that buys back missing [[Health]] at **one Iron a point**. It is "a place to play, not a waiting room".

## How it works

- **Admission** ([[GDD#19.1 Hospital|GDD §19.1]], slice-5 paragraph): a run-in lost to anyone but the police sets Health to 0 and admits you to **the infirmary of the city you are in** (Coalport's Infirmary, Duskwall's Infirmary, Ashford's County Infirmary, St Agnes in Irongate), opening its quarter if locked. **Health goes to 30 at once; the stay is 20 minutes**, lazy (any read after the end discharges you).
- **Two ways out early:**
  - ***Walk out well* · 5 Energy · 100 Iron**: full Health, now;
  - ***Discharge yourself* · 5 Energy**: now, at half your max Health (or more if you have it).
- **Inside:** no Energy actions, training or travel. The paper and political acts work. Energy, Rested, the wage and Heat's cooling run. One tier-1 intelligence tap on the ward, ***Talk to the ward*** (3 Energy). The matron is the screen's voice.
- ***Get patched up*** (review 5, 8 Oct 2026): a ***Treatment*** card on every `hospital` place's sheet, any city (rival ground included), whenever Health is below full and you are not held or in transit. **1 Iron per point missing, at least 10; no Energy**; Health to full at once. A choice, never a must: Health comes back free, **10 every 10 minutes** ([[design/review-5-answers#8. #8 — Pay to heal at any infirmary (decided; GDD §19.1)|review-5 answers §8]]). The carer is the *matron* in the home towns and the *sister* at St Agnes.
- **Visits** (designed, slice 6): a faction mate taps *Visit · 3 Energy*; the patient gets +10 Health and five minutes off the stay, three visits count, never below five minutes; the visitor +10 Party XP (ADR 0041).
- **Nothing a player owns is touched.**

## Where it lives

**Rules:** [[GDD#19.1 Hospital|GDD §19.1]] · [[GDD#6.1 Health|§6.1]] · [[design/slice-5-risk#9. The infirmary and Health (GDD §6.1, §19.1, pinned)|slice-5 design §9]] · [[design/review-5-answers|review-5 answers §8, §18 Q14]] · [[adr/0033-heat-health-record-held-lazy|ADR 0033]] · [[adr/0041-favours-across-two-characters-one-release-path|ADR 0041]] (visits, proposed) · [[tech/review-5|tech spec review 5]]

**Code:**
- Rules: `packages/rules/src/health.ts`, `held.ts`; `HEALTH` (admitted 30, stay 20 min, walk-out 5 + 100, discharge 5 at half) and `TREATMENT { perPoint: 1, minIron: 10 }` in `constants.ts`
- Server: `apps/server/src/services/heldService.ts` (`createStayInTx`, `ensureReleased`, `payOut`, `heldAct`, `getHeld`), `treatmentService.ts` (`treatAt`) · routers `apps/server/src/trpc/routers/held.ts` (`walkOut`, `discharge`, `act`, `close`), `character.ts` (`treat`)
- Data: model `packages/db/src/models/stay.ts`; `characters.held` pointer · content: each infirmary's `treatment: { carer }` in `packages/content/src/data/cities/*.ts`; the city's `services.infirmary`
- Client: `apps/client/src/routes/held.tsx` · `packages/ui/src/components/Held.tsx`, `Treatment.tsx`

## Status

Built: the infirmary ([[Slice 5 Risk|slice 5]]) and *Get patched up* ([[Review 5]] fix round; QA found it atomic, [[qa/review-5-report|QA review 5]]). **Not built:** visits (slice 6); ward Dossier entries from *Talk to the ward* (slice 8); price changes by who controls the city (designed, **no slice**: [[GDD#Appendix C — Open questions|Appendix C #109]]). **Not in the MVP:** the Antidote and the Recovery Boost (GDD §19.1 since 14 Oct 2026); hospital storylets beyond the ward tap are not designed.

## Decisions

- 3 Oct 2026 (slice-5 design §23): a win never admits you; a police loss leaves you at 30 Health in the cells instead.
- 8 Oct 2026, review 5 #8: pay to heal at any infirmary, one Iron a point (Appendix C #97).

## Open questions / drift

- None open. QA slice 5's n10 (the max-Health formula) is fixed: GDD §6.1 now reads 100 + 5 × (Level − 1), as the code does.
- GDD §19.1's table now matches what is built (fixed 14 Oct 2026): ***Walk out well*** (5 Energy, 100 Iron), ***Discharge yourself*** (5 Energy), ***Talk to the ward*** (3 Energy) and ***Get patched up***. The v3.0 control prices (Vanguard +25 %, Collective −50 %) are kept as a control effect with no slice (Appendix C #109). Dropping the Antidote and Recovery Boost was the game-designer's call; the user has not confirmed it.

## Related

[[Health]] · [[Run-ins and Combat]] · [[Jail and the Cells]] · [[Missions]] · [[Hostile Ground]] · [[The Dossier]]
