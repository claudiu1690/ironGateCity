---
type: system
title: Street Actions
aliases: [Tier 1, Tier-1 actions, Actions, Tickets, Batches]
tags: [street-play, tier-1]
status: built
slice: "1; places added in 2, 4 and 5; rewording in reviews 1–3"
gdd: ["§13.1", "§13.1a", "§13.3", "§8.4", "§8.5", "§5.5"]
adrs: ["0006", "0002", "0073"]
updated: 2026-10-14
---

# Street Actions

## In one paragraph

Street actions are **tier 1** of play: about 80 % of the game's content. Each is a **ticket** on a place's sheet (*Knock on doors*, *Put up posters on the wagons*, *Study at the library*). One tap spends Energy, rolls one check and opens one [[The Result Modal|result modal]]. They exist so that a full bar of Energy can be spent in two or three minutes (pillar 7). Depth is kept for [[Missions]] (tier 2) and stories (tier 3).

## How it works

- **One tap, one result.** No briefing, no choice. A tier-1 action **never fails**: it is a Success or a Partial, and a Partial just pays less ([[GDD#13.1 Three tiers of play (new)|GDD §13.1]]).
- **The types** ([[GDD#13.3 Mission types|GDD §13.3]]), with the player's words (review 2):
  - canvass, *Talk to voters*: **10 Energy** (the reference action), Party XP and opinion;
  - propaganda, *Spread the word*: **8 Energy**;
  - street speech: **12 Energy**;
  - intelligence (safe surveillance), *Watch and listen*: **3–5 Energy**, XP and Iron only;
  - council, *Party meeting*: **10 Energy**, Party XP at **1.5×** the rate, no opinion, checks your **best trained stat**;
  - training: Energy = **20 + 2 × the stat** for the next point ([[Stats and Checks]], [[GDD#8.5 Stat growth (new)|GDD §8.5]]).
- **The check** is [[Stats and Checks|§8.4]]'s: 50 + 4 × (stat − difficulty) + bonuses, kept 5–95. Difficulty is **8 at home, 10 in a battleground**, +4 on [[Hostile Ground|rival ground]]. Any action may check two stats (their average).
- **Rewards** come from the type and the Energy, never from content: **4.5 XP, 0.6 Party XP and 2 Iron per Energy**, opinion 0.005 a point per Energy ([[GDD#5.5 Reward rates per mission tier (starting values)|GDD §5.5]]). [[Rested]], Issue, weather and order bonuses apply on their own and show as tags.
- **Batches.** *Once* or **×3**. A ×3 is one request with one seed, all-or-nothing on Energy (disabled when short), one row per attempt and a stamp *n of 3*. Each row counts on its own for [[Local Standing]] and [[Party Orders]]. The narrative is the success text when **more than half** the rows succeeded. ×5 is in the GDD but not built.
- **×1 only** for training, for the welcome favour (`ONCE_ONLY`, [[Patronage and Favours]]) and on rival ground (`ONCE_ON_RIVAL_GROUND`).
- **No run-ins**, except on rival ground: there every tap rolls a **15 %** run-in (**25 %** at night, [[Night and Patrols]]); a Run or a loss drops the row to Partial ([[Run-ins and Combat]]).
- **Buttons say what they cost** (review 3): *Once more · 10 Energy* · *Three more · 30 Energy* · *Continue*.

## Where it lives

**Rules:** [[GDD#13.1 Three tiers of play (new)|GDD §13.1]] · [[GDD#13.1a The result modal|§13.1a]] · [[GDD#13.3 Mission types|§13.3]] · [[design/slice-1-content|slice-1 content]] · [[design/review-3-answers|review-3 answers §3–§4]] (buttons, receipt) · [[adr/0006-repeat-actions-one-request|ADR 0006]] (×3) · [[adr/0002-atomic-idempotent-actions|ADR 0002]] (one key per tap) · [[tech/slice-1|tech spec slice 1]]

**Code:**
- Rules: `packages/rules/src/action.ts` (`resolveTier1Action`, `usesSuccessText`), `check.ts`, `rewards.ts`, `training.ts`; numbers in `constants.ts` (`TIER_RATES`, `TIER1_DIFFICULTY`, `TRAINING`, `FXP_TYPE_MULTIPLIER`)
- Server: `apps/server/src/services/actionService.ts` (`performAction`, `computeTier1`, `writeTier1`), `actionResult.ts`, `keyedAction.ts` · router `apps/server/src/trpc/routers/action.ts` (`perform`, `times: 1 | 3`)
- Data: content `packages/content/src/data/cities/*.ts` (each `location.actions`; type presets such as `canvass = { energy: 10 … }` at the top of each file) · log `packages/db/src/models/actionLog.ts`
- Client: `apps/client/src/features/action/usePerformAction.ts` · `packages/ui/src/components/Ticket.tsx`, `Places.tsx`, `ResultModal.tsx`

## Status

Built in [[Slice 1 The 5-Minute Session|slice 1]]; places added in slices 2, 4 and 5. Reworded and re-laid out in [[Review 1]] to [[Review 3]]; the modal made to fit in [[Review 5]]. Not built: ×5, the bar's tier-1 services ([[Bars]]), the Dossier entry from a lucky intelligence tap ([[The Dossier]], slice 8).

## Decisions

- Review 1: council sessions check the best trained stat, so every build has one good check at the HQ.
- Review 2: no percentages or rolls shown; plain action titles, verb first.
- Review 3: every Energy button names its action and cost; rewards are a receipt.
- Designer answer §12 Q5: a batch uses the success text only when more than half the rows succeeded.

## Open questions / drift

> [!warning] Drift
> [[adr/0006-repeat-actions-one-request|ADR 0006]] says a batch uses the success text "when at least one row succeeded" and stamps `mixed`, and that training ×3 trains three points. The GDD (§13.1, §8.5) and the code (`usesSuccessText`: more than half; stamp `batch`; training refused above ×1) agree with each other; the ADR is stale.

## Related

[[Missions]] · [[Local Standing]] · [[Party Orders]] · [[Energy]] · [[Rested]] · [[Stats and Checks]] · [[The Result Modal]] · [[Hostile Ground]] · [[Issues of the Week]]
