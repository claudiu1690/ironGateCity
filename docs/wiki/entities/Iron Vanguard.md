---
type: entity
title: Iron Vanguard
aliases: [Vanguard, the Vanguard, Fascists]
tags: [faction]
status: built
slice: "0–2 (faction, home city, ranks); 3 (branch motion, Unrest orders); 6–7 designed (Grand Rally, Chair)"
gdd: ["§16.1", "§5.4", "§7.1", "§14.11", "Appendix A"]
adrs: []
updated: 2026-10-14
---

# Iron Vanguard

## In one paragraph

The Iron Vanguard is the authoritarian nationalist party: order, discipline, a strong hand and the
frontier shut. Its home city is [[Duskwall]], the frontier customs town in the mountains. It is
**a party, not a militia**: it has a committee, an organiser, volunteers and stewards, and it courts
the police and the customs rather than being them ([[GDD#16.1 The three factions|GDD §16.1]]).
Faction naming is parked, so the name stays as the GDD has it (project CLAUDE.md rule 5).

> [!warning] Content rule
> No real-world extremist symbols in any art or text, and **all Vanguard content is reviewed** for
> this (project CLAUDE.md rule 6). The checklist is
> [[design/content-policy-review#7. The checklist for future Vanguard content (the content policy, Appendix C #7)|content-policy review §7]]:
> no army rank words, drill, garrison, uniform, torches, chalked marks, "above all", salutes, runes,
> eagles. Written cold: texts show what the party does to a town, never argue it is right.

## Key facts

| | |
|---|---|
| Content id | `vanguard` · short name *Vanguard* · small mark ■ (square) |
| Home city | [[Duskwall]] (baseline 70 % Vanguard; [[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]]) |
| Home HQ | **Beacon House** (`duskwall.beacon-house`, members only), *the district office* |
| Capital HQ | **Vanguard House** in Garrison Hill, [[Irongate]] (`irongate.vanguard-house`) |
| Party secretary | **Viktor Stahl**, district organiser (*Organiser Stahl*, signs *— V.S.*); see [[People of Irongate]] |
| Starting bonus | +3 Strength |
| Rank titles | Initiate · Steward · Bailiff · Prefect · Intendant · Guardian · Keeper of the Gate ([[GDD#5.4 Faction Rank|GDD §5.4]]) |
| Signature event | **the Grand Rally** (replaced the *Torchlight March*; [[Campaign Events]], slice 6, designed) |
| Branch motion | *Rally Permits* (`ord.rally-permits`): the branch's rule on the ballot ([[City Council and the Rule Vote]]) |
| Starting kit | work jacket (`outfit.work-jacket`) and the party card |
| Paper at home | *The Duskwall Sentinel* ([[The Morning Paper]]) |
| Legislation style | order, curfews, costs for the opposition (§16.1); laws are slice 7 |
| Recruits in | the frontier and the industrial outer towns, so it is the stronger rival in [[Coalport]] (§14.11) |

**In the opening** ([[GDD#7.1 *Coming home* (review 5, 8 Oct 2026; replaces *The Last Train In*)|GDD §7.1]]):
Stahl runs **the League's welfare desk** at the demobilisation office. His problem is the missing
stamp (no stamp, no pay). Picking it makes you Vanguard and sends you to Duskwall. The desk is only
stamps, pensions, a hostel bed and a day book: no uniform, rank, march or slogan.

## Places / members / roles

- **Beacon House** (Duskwall): the HQ tickets, the welcome favour (*Hand out Stahl's bundle at
  Beacon House*), and two rival-ground missions for visitors (*Spike the duplicator*, *Lift the
  district roll*). See [[Duskwall]].
- **Vanguard House** (Garrison Hill, Irongate): the capital office and club, members only.
- Run-in opponents on its side: the *Vanguard street enforcer* and the *Vanguard doorman*
  (Duskwall's run-in pool; [[Run-ins and Combat]]).
- Designed, not built: the party's own figure **Dr Konrad Albrecht** (slice 7) and the patron
  **Commissioner Anton Reinholt** (after the MVP). See [[People of Irongate]].

## In the game

**Content:** `packages/content/src/data/factions.ts` (the faction: ranks, secretary, kit, welcome
orders, branch motion, Unrest orders), `packages/content/src/data/cities/duskwall.ts`,
`packages/content/src/data/people.ts` (Stahl), `packages/content/src/data/candidates.ts` (nine
Duskwall locals, two per capital district).

## Art

- Crest: `art-direction/crests/crest-vanguard.svg` (and `.png`): **an iron gate beneath a lantern**,
  gold line on black in a square frame. Passed the content-policy review
  ([[design/content-policy-review#5. Crest verdicts|§5]]). Asset id `crest.vanguard`.
- HQ scene: `mvp/scenes/vanguard-office.png` (desk, wall map, a plain banner); the gym scene
  `mvp/scenes/gym.png` exists for the kind `gym`.
- Secretary portrait: `mvp/portraits/stahl.png`. Opponents: `street-enforcer.png`,
  `vanguard-doorman.png`. Early style art in the art-direction root: `portrait-vanguard.png`,
  `poster-vanguard.png`.

## Status

Built: the faction, its home city, ranks, secretary, welcome set, branch rule and the Unrest pair
(slices 0–3, reworked by reviews 4–5 and the [[Voting Rework]]). Designed, not built: the Grand Rally
([[Slice 6 Together]]), the Chair, laws and party figure ([[Slice 7 The Nation]]).

**Later, after the MVP** (the user, 14 Oct 2026): **Vanguard House as the movement's gym**
(kind `gym`: faster STR/AGI training, cheaper bodyguards, a surplus market; [[GDD#16.1 The three factions|GDD §16.1]],
now marked *planned*). Today `irongate.vanguard-house` is the party's capital HQ, kind
**`faction-hq`**, with no training perks. [[GDD#14.1 The five cities|GDD §14.1]] now lists **Beacon
House** as Duskwall's HQ (it said Vanguard House until 14 Oct 2026).

## Related

[[Red Collective]] · [[Civic Alliance]] · [[Duskwall]] · [[Irongate]] · [[Levels and Faction Rank]] ·
[[Party Orders]] · [[Hostile Ground]] · [[Coming Home]]
