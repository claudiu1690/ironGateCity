---
type: system
title: Run-ins and Combat
aliases: [Run-in, Run-ins, Combat, Encounters, Encounter, Opponents, Leave it to luck]
tags: [risk, street-play]
status: built
slice: "5; night run-in in the review-5 fix round"
gdd: ["§20", "§20.1", "§20.2", "§20.3", "§14.12"]
adrs: ["0032", "0080", "0033"]
updated: 2026-10-14
---

# Run-ins and Combat

## In one paragraph

Combat in Irongate is a **hazard, not the core of the game**, and it is **NPC-only** in the MVP. The player meets it as a **run-in**: a street enforcer, a strike picket or the city police turns up after a [[Missions|mission]]'s check, or on a tap on [[Hostile Ground|rival ground]]. It is settled in **one choice**, not round by round: *Fight*, *Run*, *Talk your way out*, *Pay them off*, or *Leave it to luck*. The choice decides whether the mission's held result is paid. No asset is ever at risk.

## How it works

- **When** ([[GDD#20. Combat (NPC-only in MVP)|GDD §20]], slice-5 paragraph): rolled once after a mission's check, and once per tier-1 tap on rival ground. Chance = the type's base (×2 on rival ground) + the Heat state (Noticed +5, Hot/Wanted +15) + 5 for a Repeat offender + 10 if *Watched* − 10 if *Warned*, kept **0–90**. Rival-ground tier-1 taps: **15 %** flat, **25 % at night**; a mission at night on rival ground +10 after the ×2 ([[Night and Patrols]]).
- **Who:** from the mission's pool, own-faction opponents dropped; **the city police join from *Noticed*** and are picked half the time (and always half the time at night on rival ground). Power ×1.1 on a mission, +4 on rival ground.
- **The four options** ([[GDD#20.1 The four options|GDD §20.1]]), in the player's words:
  - ***Fight* · Strength:** 50 % + 3 % × (your power − theirs), 5–95 %. Your power = **STR × 1.5 + armour ÷ 2** (a Tier I coat is armour 4, so +2).
  - ***Run* · Agility:** (your AGI ÷ theirs) × 60 %. A failed Run takes extra damage, then the fight at −10.
  - ***Talk your way out* · Charisma:** the §8.4 check against their Wits. A failure is the fight at −10.
  - ***Pay them off* · {n} Iron:** **90 %** (*nearly always works*); the branch inspector won't be bought. A failed pay loses the Iron, +10 Heat, then the fight.
  - ***Leave it to luck*:** takes the best **free** odds (never spends Iron).
- **What it pays:** a win, a Talk or a Pay pays the held result as rolled; **a Run keeps only Failure's XP**; **a loss** is [[Hospital and Treatment|the infirmary]] with Failure's XP, or [[Jail and the Cells|the cells]] if it was the police. XP: +20 for a win, +10 for getting away. A win at **full Health** adds +10 % to the mission's XP and Party XP (*Won at full strength*).
- **Health:** a win costs their power × 0.8 (±20 %) − 4, never below 1 Health. A loss to the police sets Health to 30.
- **Unanswered:** a run-in left open (tab closed) is settled by luck **on the first read after five minutes, or at the day's end** if sooner. The player's own choice wins while it is pending (ADR 0032).
- **Opponents** ([[GDD#20.2 Opponents|GDD §20.2]]): six in content, from the branch inspector (power 17, takes 10 off your Fight odds) to the Vanguard doorman (35); the city police are 30 with a 300 Iron price. Each has six lines (appears, won, lost, ran, talked, paid). The Secret Police and named inspectors are later.
- **No weapons** ([[GDD#20.3 Weapons and armour|GDD §20.3]], Appendix C #74): this is a political contest; there is no weapon slot and no weapon item. Armour comes from the coat's tier ([[Equipment and Wardrobe]]).

## Where it lives

**Rules:** [[GDD#20. Combat (NPC-only in MVP)|GDD §20]] · [[GDD#14.12 Hostile ground: rival home cities (new)|§14.12]] · [[design/slice-5-risk#10. Encounters: a run-in (GDD §20, pinned)|slice-5 design §10]] · [[adr/0032-run-ins-pending-step-and-luck|ADR 0032]] · [[adr/0080-night-windows-on-content-and-the-night-run-in-on-rival-ground|ADR 0080]] · [[adr/0033-heat-health-record-held-lazy|ADR 0033]] · [[qa/slice-5-report|QA slice 5]]

**Code:**
- Rules: `packages/rules/src/runIn.ts` (`runInChance`, `pickOpponent`, `runInChances`); `RUN_IN`, `ARMOUR_BY_TIER` in `constants.ts`
- Server: `apps/server/src/services/streetService.ts` (`startRunInInTx`, `resolveInTx`, `chooseRunIn`, `ensureRunInSettled`, `luckAsOf`, `closeRunIn`) — the encounter router; `keyGuard.ts` (`assertKeyFree`); `risk.ts` (`notFree`, `rivalTapChance`) · router `apps/server/src/trpc/routers/encounter.ts` (`current`, `choose`, `close`)
- Data: model `packages/db/src/models/encounter.ts` (`pending → resolved`); pointer `characters.runIn` · content `packages/content/src/data/opponents.ts`
- Client: `apps/client/src/features/street/RunInGate.tsx` · `packages/ui/src/components/Street.tsx`

## Status

Built in [[Slice 5 Risk|slice 5]] (with the slice-5 fix round's key guard for double starts). Night chances and police share added in the [[Review 5]] fix round. **Not built:** recognition on rival ground (slice 8), [[Bodyguards]], the Secret Police (Level 20+), named NPC opponents, opportunity encounters.

## Decisions

- 3 Oct 2026 (ADR 0032): luck after a five-minute window or at the day's end, never mid-modal.
- 3 Oct 2026 (slice-5 design §23): a win never admits you; a loss to the police leaves you at 30 Health.
- Slice 8 design: no weapons as items (Appendix C #74).
- 8 Oct 2026, review 5: night on rival ground raises the run-in; no patrol off-app.

## Open questions / drift

- Settled: [[qa/slice-5-report|QA slice 5]] n6 asked when *Won at full strength* reads Health; the GDD and design now state the code's rule (before the run-in; a failed Run's damage does not lose it).
- The GDD §20 table's "auto-resolve when they next open the game" is superseded by the slice-5 paragraph (five minutes or the day's end); not drift, but the older line remains in the table.

## Related

[[Missions]] · [[Heat and Record]] · [[Hospital and Treatment]] · [[Jail and the Cells]] · [[Hostile Ground]] · [[Night and Patrols]] · [[Bodyguards]] · [[Equipment and Wardrobe]] · [[Health]]
