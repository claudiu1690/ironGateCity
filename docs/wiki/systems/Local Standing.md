---
type: system
title: Local Standing
aliases: [Reputation, Standing, Known here]
tags: [street-play, progression]
status: built
slice: "1; wording in reviews 1, 2 and 4"
gdd: ["§13.4", "§6.5"]
adrs: ["0006"]
updated: 2026-10-14
---

# Local Standing

## In one paragraph

Local Standing is **how well the people of a town know your face**. Every player has one per city. It grows with every win there and never falls. It makes repetition feel like progress: the tenth canvass at the Mill Gate goes better than the first. It also ties players to their [[Home Cities|home city]] and opens a few doors (council candidacy, some missions, a daily point of [[Political Capital]]). The player reads it as **Reputation**.

## How it works

- **Five levels** ([[GDD#13.4 Local Standing (new)|GDD §13.4]]): **Stranger → Familiar → Known → Trusted → One of Us**, at **10, 30, 70 and 150 wins** in that city.
- **What counts as a win:** one Success on any **checked** action in the city, tier 1 or a [[Missions|mission]]. Each row of a ×3 counts on its own. Partials, training and Ambition chapters do not count.
- **What it gives:**
  - **+3 % on every check per level** in that city (so +12 % at One of Us);
  - at **Known**: some missions there unlock, and you may stand for the council there (with Rank 3; [[City Council and the Rule Vote]]);
  - at **One of Us**: **1 Political Capital a day** ([[GDD#6.5 Political Capital (new)|GDD §6.5]]).
- **Never decays.** Moving residence keeps it in every city ([[Residence]]).
- **Not on rival ground:** no standing is earned there ([[Hostile Ground]]).
- **An Issue can double it:** an Issue effect `standingMultiplier` makes every win count twice for the week (the player reads *Reputation: every win counts twice*; [[Issues of the Week]]).
- **What the player sees:** *Reputation in Coalport · Known · 34 / 70*, counted in *wins*. No percentage: the help note says each step makes everything **three times in a hundred** more likely to come off, and checked tickets carry the tag ***Known here · better odds*** from Familiar.
- **The crossing is a moment:** a **Standing card** inside the [[The Result Modal|result modal]] (kicker *REPUTATION*, the new title, what changed, what the next level brings). No second modal.
- **Pace:** the reference player is *Known* at home about day 3 and *One of Us* about day 8 (`docs/economy.md` §9).

## Where it lives

**Rules:** [[GDD#13.4 Local Standing (new)|GDD §13.4]] · [[design/review-2-answers|review-2 answers §1.9]] (the card's texts) · [[design/review-4-answers|review-4 answers]] (the size said in words)

**Code:**
- Rules: `packages/rules/src/standing.ts` (`standingView`, `standingBonus`); `STANDING` in `constants.ts` (`thresholds [0, 10, 30, 70, 150]`, `bonusPerLevel 3`, `oneOfUsPcPerDay 1`); `standingPerSuccess` in `ordinances.ts` (the Issue's ×2)
- Server: written in the action's own transaction by `apps/server/src/services/actionService.ts` and `missionService.ts`; One of Us PC paid at settlement in `dayService.ts`
- Data: embedded `characters.localStanding: [{ cityId, successes }]` (`packages/db/src/models/character.ts`) · level names `standingLevels` in `packages/content/src/data/people.ts`; gate copy in `copy.ts`
- Client: the plate's *Standing* label opens the ladder; card in `packages/ui/src/components/ResultModal.tsx`

## Status

Built in [[Slice 1 The 5-Minute Session|slice 1]]. Mission wins count from [[Slice 5 Risk|slice 5]]. The crossing card came in [[Review 1]]; percentages were removed in [[Review 2]]; the size said in words and the *Known here* tag in [[Review 4]].

## Decisions

- Review 1: each new level is a card inside the result modal, not a separate modal.
- Review 2: the player reads *Reputation*; no percentages; thresholds given as goals in wins.
- Review 4: the rule's size is said once, in words (*three times in a hundred*).

## Open questions / drift

None found. The rules constants match GDD §13.4.

## Related

[[Street Actions]] · [[Missions]] · [[Stats and Checks]] · [[Political Capital]] · [[Home Cities]] · [[City Council and the Rule Vote]] · [[Issues of the Week]]
