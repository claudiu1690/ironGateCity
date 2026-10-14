---
type: system
title: Levels and Faction Rank
aliases: [Level, Levels, XP, Experience, Rank, Faction Rank, Party XP, FXP, Rank titles, Progression, Reward rates]
tags: [progression]
status: built
slice: "1 (levels, rank, rates); review 1 (stat point on STR/INT/AGI); review 4 (rank ladder); review 5 (level-up cards)"
gdd: ["§5", "§5.1", "§5.2", "§5.3", "§5.4", "§5.5"]
adrs: []
updated: 2026-10-14
---

# Levels and Faction Rank

## In one paragraph

A player climbs two ladders at once. **Level**, from XP, opens content: quarters, the train, tiers
of missions and equipment. **Faction Rank**, from Party XP (FXP), opens political *rights*: to vote,
to stand, to call events, to legislate. Rank gives the right; each office also needs the rung below
it on the office ladder ([[Offices]]). Both survive a season; offices do not.

## How it works

- **The tracks** ([[GDD#5.1 Progression tracks|GDD §5.1]]): Level, Rank, stats, Wardrobe (Charisma),
  [[Political Capital]], office, patronage, Legacy, Ambition, season standing.
- **Pacing** ([[GDD#5.2 Pacing targets|GDD §5.2]]): the reference player plays 3 sessions a day
  (300 Energy, nearly all with Rested). Targets: Rank 2 and the vote on day 2 (first ballot by day
  4) · Level 10 and the train ~day 5 · Rank 3 ~day 10 · Rank 5 ~week 8 · Rank 7 ~week 24.
- **Levels** ([[GDD#5.3 Levels|GDD §5.3]]): Level 2 at 150 XP, 6 at 2,500, 10 at 7,400, 16 at
  20,000, 31 at 100,000, 51 at 400,000; from 31 each step grows by 600, no cap. One action can cross
  several levels.
- **Each level-up:** +5 max [[Health]] and **+1 stat point** on STR, INT or AGI (never CHA). The
  point waits until placed; nothing is lost by choosing late.
- **The picker** (review 5): three paper cards in the ticket's style, one per stat, the whole card
  the tap, with tags *Most used here* and *Your best*, and a lead line computed from the residence
  city's checked actions. In a result it is one line and *Place it*, opening the cards as a sheet.
- **Faction Rank** ([[GDD#5.4 Faction Rank|GDD §5.4]]): FXP 0 / 400 / 2,000 / 6,000 / 15,000 /
  25,000 / 60,000 for Ranks 1–7. Rank 2: vote, named event roles · Rank 3: stand for the council,
  call events, illegal missions · Rank 4: stand for Chair · Rank 5: Parliament · Rank 6: President ·
  Rank 7: honorific.
- **Titles** are per faction and are a party's, never an army's (e.g. Recruit / Activist /
  Organiser for the Collective). The Party XP label opens the ladder in plain words (review 4).
- **Reward rates** ([[GDD#5.5 Reward rates per mission tier (starting values)|GDD §5.5]]): XP / FXP
  / Iron per Energy, tier 1 = 4.5 / 0.6 / 2, tier 2 = 5 / 0.8 / 4. The reference action, a 10-Energy
  canvass: **45 XP / 6 FXP / 20 Iron** on Success, half on Partial. Every line rounds half up; base
  and bonus round separately so the receipt adds up. About 25 % of FXP should come from outside
  missions (orders, events, Issues, stipends).

## Where it lives

**Rules:** [[GDD#5. Progression|GDD §5]] · [[design/review-1-answers|review 1 answers §7]] (the
choice screen) · [[design/review-4-answers|review 4 answers §25]] (the ladder) ·
[[design/review-5-answers|review 5 answers §3]] (the cards) ·
[[design/content-policy-review|content-policy review]] (titles) · [[economy|economy sheet §6, §7]]

**Code:**
- Rules: `packages/rules/src/levels.ts` (`xpForLevel`, `xpToNextLevel`, `levelForXp`) ·
  `packages/rules/src/rank.ts` (`rankForFxp`, `rankBounds`, `rankLadder`) ·
  `packages/rules/src/progress.ts` (`applyGains`) · `packages/rules/src/statGuide.ts` (`statUse`,
  the lead line) · `packages/rules/src/rewards.ts` (`computeRewards`, `roundHalfUp`) ·
  `LEVEL_XP_THRESHOLDS`, `LEVEL_XP_STEP`, `RANK_FXP`, `RANK_OPENS`, `LEVEL_UP`, `TIER_RATES` in
  `packages/rules/src/constants.ts`
- Server: `apps/server/src/services/statService.ts` (`placeStatPoint`) · router
  `apps/server/src/trpc/routers/character.ts` (`placeStatPoint`)
- Data: `characters.xp`, `level`, `fxp`, `rank`, `statPointsPending`
  (`packages/db/src/models/character.ts`) · rank titles in `packages/content/src/data/factions.ts`
- Client: `packages/ui/src/components/HudBar.tsx` (XP and Party XP bars) · `RankLadder.tsx` ·
  `ResultModal.tsx` (*Place it*) · `apps/client/src/routes/me.tsx` (inline cards)

## Status

Built in slice 1 (levels, rank, tier-1 rates), tier 2 rates in slice 5. Review 1 put the level
point on any trained stat; review 4 added the ladder note; review 5 the card picker. Tier 3–5 rates
are in the GDD only (no content at those Levels yet). Ranks 4–7 rights depend on slices 7–8.

## Decisions

- Rank 2 lowered from 500 to 400 FXP so the reference player votes on day 2 (economy sheet §7).
- [[Review 1]]: the level point may go on AGI too (Appendix C #34).
- [[Review 2]]: the Alliance's Rank 2 is *Campaigner* (was *Canvasser*).
- 29 Sep 2026 content-policy review: military Vanguard titles replaced (Steward, Bailiff, Prefect…).
- [[Review 5]]: the picker as three paper cards; one line and a sheet in a result.

## Open questions / drift

- Appendix C #14 (heavy players level ~35 % faster) is open.
- [[qa/review-5-report|QA review 5]] left the cards' square corners for the user to decide.
- GDD §5.5 now says the rates are built as written (`TIER_RATES`: 4.5 XP and 0.6 FXP per Energy at
  tier 1); its stale "seed data too generous" note is gone (14 Oct 2026). GDD §7.4 now also says
  **Rank 2** for a move ([[Residence]]).

## Related

[[Stats and Checks]] · [[Political Capital]] · [[Offices]] · [[Party Orders]] ·
[[The Result Modal]] · [[Health]] · [[Quarters and the Map]] · [[Travel and Journeys]]
