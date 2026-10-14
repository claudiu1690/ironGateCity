---
type: system
title: Health
aliases: [HP, Hit points]
tags: [resource, timer, risk]
status: built
slice: "5"
gdd: ["§6.1", "§19.1", "§20"]
adrs: ["0033"]
updated: 2026-10-14
---

# Health

## In one paragraph

Health is the character's condition in a run-in. It is lost only in fights and comes back on its
own, quickly. It exists so that risky work on the street has a cost you can see, without ever
taking anything you own. Neglect (hunger, cold) no longer drains it: the v3.0 survival system is
gone.

## How it works

- **Max 100 at Level 1, +5 a level:** 100 + 5 × (Level − 1), so 125 at Level 6 and 145 at Level 10
  ([[GDD#6.1 Health|GDD §6.1]]).
- **Regen +10 every 10 minutes**, passive and lazy (value and timestamp, projected on read).
- **Lost only in a run-in** ([[Run-ins and Combat]]): *winning* a fight costs their power × 0.8
  ± 20 %, less your armour; *losing* one sets Health to 0.
- **At 0: the infirmary** ([[Hospital and Treatment]]). The player is admitted to the infirmary of
  the city they are in, Health is set to **30** at once and the stay is **20 minutes**. Ways out:
  *Walk out well · 5 Energy · 100 Iron* (full Health) or *Discharge yourself · 5 Energy* (half of max).
  A lost run-in with the **police** is the cells instead ([[Jail and the Cells]]).
- **Get patched up** (review 5): at any infirmary, any time Health is below full, **1 Iron a point
  missing, at least 10**, no Energy. A choice, never a must, since Health comes back free.
- **On the HUD always**, directly under Energy (*Health · 125 / 125*), on the Me tab and in the
  run-in modal, with a help note on the label.
- **Stored as damage, not value**, so a level-up never leaves a full-Health player below full
  ([[adr/0033-heat-health-record-held-lazy|ADR 0033]]).

## Where it lives

**Rules:** [[GDD#6.1 Health|GDD §6.1]] · [[GDD#19.1 Hospital|GDD §19.1]] ·
[[design/slice-5-risk|slice-5 risk §9]] · [[design/review-5-answers|review 5 answers §6, §8]] ·
[[adr/0033-heat-health-record-held-lazy|ADR 0033]] · [[tech/slice-5|tech spec, slice 5]]

**Code:**
- Rules: `packages/rules/src/health.ts` (`healthMax`, `projectHealth`, `healthNow`, `healthFullAt`,
  `treatmentPrice`, `treat`) · `packages/rules/src/held.ts` (`admit`, `walkOut`, `dischargeSelf`,
  `policeLossHealth`) · `HEALTH`, `TREATMENT` in `packages/rules/src/constants.ts` ·
  `packages/rules/src/runIn.ts` (damage)
- Server: `apps/server/src/services/heldService.ts` · `treatmentService.ts` · routers
  `apps/server/src/trpc/routers/held.ts`, `character.ts` (`treat`)
- Data: `characters.health { damage, at }`, `characters.held`, the `stays` collection
  (`packages/db/src/models/character.ts`, `stay.ts`)
- Client: `packages/ui/src/components/HudBar.tsx` (`HealthBar` from `Street.tsx`) ·
  `packages/ui/src/components/Treatment.tsx` · `Held.tsx` · route `apps/client/src/routes/held.tsx`

## Status

Built in slice 5. Review 4 made it always visible; review 5 moved it directly under Energy and added
*Get patched up*. Faction mates' visits (+10 Health, 5 minutes off) are slice 6, not built. The
other v3.0 hospital services (Antidote, Recovery Boost) are not built.

## Decisions

- [[Review 4]] (6 Oct 2026): Health on the HUD always, not only below full (it read as a fault
  when it appeared).
- [[Review 5]] (8 Oct 2026): Health directly under Energy; pay to heal at any infirmary, 1 Iron a
  point (Appendix C #97).

## Open questions / drift

> [!warning] Drift
> **ADR 0033 vs GDD §6.1 / code.** ADR 0033's consequences say *the HUD shows … Health only below
> full*. Review 4 changed that to always; the code (`HudBar.tsx`) shows it always. The ADR is stale.

> [!warning] Drift
> **GDD §19.1 table vs slice 5.** The v3.0 table still lists *Full Recovery*, *Early Discharge*,
> *Antidote* and *Recovery Boost*, and the hospital's *talk to other patients, write to your
> patrons* lines. Slice 5 built two ways out and one ward tap; the rest is not planned for a slice.

## Related

[[Hospital and Treatment]] · [[Run-ins and Combat]] · [[Heat and Record]] · [[Jail and the Cells]] ·
[[Levels and Faction Rank]] · [[Lazy Timers]] · [[Equipment and Wardrobe]] (armour)
