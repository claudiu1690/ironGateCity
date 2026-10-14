---
type: entity
title: Red Collective
aliases: [Collective, the Collective, Communists]
tags: [faction]
status: built
slice: "0–1 (faction and Coalport); 3 (branch motion, Unrest orders); 6–7 designed (General Strike, Chair)"
gdd: ["§16.1", "§5.4", "§7.1", "§14.11", "Appendix A"]
adrs: []
updated: 2026-10-14
---

# Red Collective

## In one paragraph

The Red Collective is the grassroots workers' movement: the mill and the docks against the men who
own them. It works through solidarity, the union hall and collective action
([[GDD#16.1 The three factions|GDD §16.1]]). Its home city is [[Coalport]], the steel town on the
river, which was the first city built (slice 1). Faction naming is parked (project CLAUDE.md rule 5).

## Key facts

| | |
|---|---|
| Content id | `collective` · short name *Collective* · small mark ● (circle) |
| Home city | [[Coalport]] (baseline 70 % Collective; [[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]]) |
| Home HQ | **Union Hall** (`coalport.union-hall`, members only), *the Union Hall* |
| Capital HQ | **Union House** in Eastside, [[Irongate]] (`irongate.union-house`) |
| Party secretary | **Petra Holm**, branch secretary (*Secretary Holm*, signs *— P.H.*); see [[People of Irongate]] |
| Starting bonus | +2 Strength, +1 Intelligence |
| Rank titles | Recruit · Activist · Organiser · Convenor · Delegate · Tribune · Chairman ([[GDD#5.4 Faction Rank|GDD §5.4]]) |
| Signature event | **the General Strike** ([[Campaign Events]], slice 6, designed) |
| Branch motion | *Long Service Order* (`ord.long-service`) |
| Starting kit | mill work coat (`outfit.mill-coat`) and the party card |
| Paper at home | *The Coalport Clarion* ([[The Morning Paper]]) |
| Legislation style | cheaper Energy and more XP for everyone, labour protections, taxes on the rich (§16.1) |

**In the opening** ([[GDD#7.1 *Coming home* (review 5, 8 Oct 2026; replaces *The Last Train In*)|GDD §7.1]]):
Holm is the union organiser signing men up off the trains. Her problem is the job: the mill is sold,
but Coalport rehires on Monday, union men first. Picking it makes you Collective.

The content-policy review removed real-world titles: *Commissar* became **Convenor** (Rank 4),
*Comrade-General* became **Tribune** (Rank 6); *Red Guard* and *People's Commissar* became the
*Strike Picket* and *Branch Inspector* opponents
([[design/content-policy-review#1. The decisions|content-policy review §1]]).

## Places / members / roles

- **Union Hall** (Coalport): HQ tickets, the welcome favour (*Deliver Holm's parcel at the Union
  Hall*), and two rival-ground missions for visitors (*Spike the duplicator*, *Lift the branch's
  membership roll*). See [[Coalport]].
- **Union House** (Eastside, Irongate): the capital office, members only.
- Run-in opponents on its side: the *strike picket* and the *branch inspector* (can't be bought;
  −10 to your Fight odds). Coalport's run-in pool. See [[Run-ins and Combat]].
- Designed, not built: party figure **Hanna Brod** (slice 7) and patron **Mikhail "Misha"
  Draganov** (after the MVP). See [[People of Irongate]].

## In the game

**Content:** `packages/content/src/data/factions.ts`, `packages/content/src/data/cities/coalport.ts`,
`packages/content/src/data/people.ts` (Holm), `packages/content/src/data/candidates.ts` (nine
Coalport locals, two per capital district).

## Art

- Crest: `art-direction/crests/crest-collective.svg` (and `.png`): **a hammer raised through a gear
  wheel**, cream on a red disc. The content-policy review said *change it* (the hammer-and-cogwheel
  family); the **user kept it as it is on 29 Sep 2026**. A replacement brief (a quayside crane and
  two mill chimneys) is on file ([[design/content-policy-review#5. Crest verdicts|§5]]).
- HQ scene: `mvp/scenes/union-hq.png`. Secretary portrait: `mvp/portraits/holm.png`. Opponents:
  `strike-picket.png`, `branch-inspector.png`. Early style art: `portrait-collective.png`,
  `poster-collective.png`.

## Status

Built: faction, Coalport, ranks, secretary, welcome set, branch rule, Unrest pair (slices 0–3, then
reviews 4–5 and the [[Voting Rework]]). Designed, not built: the General Strike
([[Slice 6 Together]]), Chair and laws ([[Slice 7 The Nation]]).

**Later, after the MVP** (the user, 14 Oct 2026): the **Underground Press** in Coalport
(propaganda at double speed, the union intelligence network; [[GDD#16.1 The three factions|GDD §16.1]],
now marked *planned*). No such place exists in content or in Coalport's survey pins; the
Collective's presses are the party store at the Union Hall. [[GDD#14.1 The five cities|§14.1]] no
longer lists it among Coalport's places.

## Related

[[Iron Vanguard]] · [[Civic Alliance]] · [[Coalport]] · [[Irongate]] · [[Levels and Faction Rank]] ·
[[Party Orders]] · [[Coming Home]]
