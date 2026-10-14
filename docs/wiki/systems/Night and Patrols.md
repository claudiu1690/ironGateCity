---
type: system
title: Night and Patrols
aliases: [Night, Patrols, Patrol, Night missions, Night rate, The night stop, Night windows]
tags: [time, risk, review-5]
status: built
slice: "night art since 1 (cosmetic); the six-hour night, night windows, night missions and patrols in the review-5 fix round (8–10 Oct 2026)"
gdd: ["§2.2", "§13.1", "§14.12", "§20"]
adrs: ["0079", "0080", "0081"]
updated: 2026-10-14
---

# Night and Patrols

## In one paragraph

Night in Irongate is **the last two hours of every six-hour town day**, the same for everyone, so dusk comes round four times a real day and no time zone is "the night zone". Until [[Review 5]] night was only the maps' night art. Now it does three things: some **missions and ways open only at night**, four **night missions pay +25 % Iron**, and on **rival ground at night** the streets are watched: acting is riskier, and a player who is only looking at the town may be **stopped by a patrol**. Night content is always extra, and nothing happens to an absent player.

## How it works

- **The night window** ([[GDD#2.2 Day and night (new)|GDD §2.2]]): the City Day stays the real day (00:00 UTC boundary). Night is **04–06, 10–12, 16–18 and 22–24 UTC**. The plate prints *Dusk in 40 min* / *Night · dawn at 18:00*. Every rule that mentions night reads this one window. See [[Time and the Game Day]].
- **Night windows on content** ([[GDD#13.1 Three tiers of play (new)|GDD §13.1]]): a mission, or one of its ways, may carry `window: 'night'`. By day it shows *Opens at nightfall · dusk at 16:00*. The Agility way of every poster, duplicator, roll and *after dark* watch mission is night-only (twelve ways); the other ways stay open by day. **Every Level's ladder stays complete by day.** Tier-1 actions have no windows.
- **Four night missions**, one per city, pay **the night rate: +25 % Iron** (tag *Night rate · +25 % Iron*), **never Party XP**, so the dark can't be turned into political power ([[Missions]]):
  - *Follow the ten o'clock lorry* (Coalport, surveillance, 12 Energy);
  - *Lift the checkpoint's log after lights-out* (Duskwall, theft, 15);
  - *Paste over the brewery gate before the dawn shift* (Ashford, vandalism, 10);
  - *Ride the last tram with the Eastside flyers* (Irongate, speech, 15).
- **Patrols while acting** (rival ground only, night only; [[GDD#14.12 Hostile ground: rival home cities (new)|GDD §14.12]]): the tier-1 run-in base is **25 %** instead of 15; a mission's run-in gains **+10** after its ×2 (cap 90); **the city police make up half of every pool**. Tickets carry *Night · patrols out*. See [[Run-ins and Combat]].
- **The patrol stop while present** (decided random, review 5 §16.1):
  - rolled **only on a read of the city view**, at night, on rival ground, not held or in transit; **never on an act, a timer or a closed app**;
  - **one seeded roll per ten-minute bucket per city**, so a refresh never re-rolls;
  - **12 %** a roll, +5 *Noticed*, +10 *Hot*/*Wanted*, +10 *Watched*, −10 *Warned*, ×2 under the Curfew Order, kept **5–40**;
  - **at most two stops a night per city**; quiet for 10 minutes after arriving by train and 15 minutes after a stop or a run-in.
- **The patrol card** (kicker *A PATROL · FOUNDRY ROW*): difficulty 14, never failing, no Energy. *Show your papers* (a Cool, clean player is waved on; else the name is written down, Heat +10, *Watched*) · *Talk your way past* (Charisma) · *Slip down a side street* (Agility) · *Let it pass*. It never sends anyone to the cells. While it waits, Energy acts, missions, boarding and treatment wait (`PATROL_PENDING`); the paper and votes do not. It never resolves itself.
- **Home cities and battlegrounds:** no patrols. The Curfew Order (a law, slice 7) is the only night rule there.

## Where it lives

**Rules:** [[GDD#2.2 Day and night (new)|GDD §2.2]] · [[GDD#13.1 Three tiers of play (new)|§13.1]] · [[GDD#14.12 Hostile ground: rival home cities (new)|§14.12]] · [[design/review-5-answers|review-5 answers §11 (the six-hour day), §12, §16.1, §18.1–§18.2a]] · [[adr/0079-the-six-hour-game-day-one-night-seam-and-a-night-block-in-the-views|ADR 0079]] · [[adr/0080-night-windows-on-content-and-the-night-run-in-on-rival-ground|ADR 0080]] · [[adr/0081-the-patrol-stop-a-seeded-roll-per-bucket-on-the-city-read|ADR 0081]] · [[tech/review-5|tech spec review 5]] · [[qa/review-5-report|QA review 5]]

**Code:**
- Rules: `packages/rules/src/day.ts` (`isNight`, `nextDusk`, `nextDawn`); `GAME_DAY_HOURS = 6`, `NIGHT_HOURS = 2` in `constants.ts`; `missions.ts` (`windowLock`, `NIGHT_RATE`); `runIn.ts` (night terms, `RUN_IN.rivalTier1Night`, `rivalNightAdd`); `patrol.ts` (`PATROL`, `patrolChance`, `patrolDecision`, `patrolBucket`)
- Server: `apps/server/src/services/night.ts` (`nightAt`, the one night seam; test modes), `patrol.ts` (`ensurePatrol`, called from `city.get` only; `answerPatrol`; the street from the city's `street`-kind place), `patrolHooks.ts`; `views.ts` (`startableMissions` skips night content for orders) · routers `trpc/routers/patrol.ts` (`answer`), `city.ts`
- Data: embedded `characters.patrol { nights[], quietUntil, card }` · content `window: 'night'` in `packages/content/src/data/missions/*.ts`; the card in `journeyEvents.ts` (`deck: 'patrol'`)
- Client: `apps/client/src/features/game/PatrolLink.tsx`, `components/DuskLine.tsx`

## Status

Built in the [[Review 5]] fix round (8–10 Oct 2026) and QA'd (the patrol's one-write-per-bucket and 12.01 % over 20,000 seeds; [[qa/review-5-report|QA review 5 §1]]). **Not built:** the Curfew Order (slice 7), recognition doubled at night (slice 8), night travel and the night train.

## Decisions

- 8 Oct 2026 (review 5 #11): option B, a six-hour town day for night only; options A and C rejected (Appendix C #100).
- 8 Oct 2026 (review 5 #12): night windows on missions and patrols on rival ground; the user asked for the stop to be **a chance, not a certainty** (Appendix C #101).
- Architect defaults (answers §18): the patrol card's Heat is not doubled on rival ground; a pending card holds the street.

## Open questions / drift

- Design detail vs build: [[design/review-5-answers|review-5 answers §18 Q5]] puts the patrol street in content as `cities[].patrol.street`; the server derives it from each city's `street`-kind place (`streetOf` in `patrol.ts`). Same strings today; a city with two street places would differ.
- Appendix C #101 keeps the levers open (the 12 %, the cap of two, the quiet).

## Related

[[Time and the Game Day]] · [[Hostile Ground]] · [[Missions]] · [[Run-ins and Combat]] · [[Heat and Record]] · [[Travel and Journeys]] · [[The Legislature and Laws]] · [[Equipment and Wardrobe]]
