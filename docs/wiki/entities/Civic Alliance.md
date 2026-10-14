---
type: entity
title: Civic Alliance
aliases: [Alliance, the Alliance, Democrats]
tags: [faction]
status: built
slice: "2 (faction and Ashford); 3 (branch motion, Unrest orders); 6–7 designed (Headline Story, Chair)"
gdd: ["§16.1", "§5.4", "§7.1", "§14.11", "Appendix A"]
adrs: []
updated: 2026-10-14
---

# Civic Alliance

## In one paragraph

The Civic Alliance is the centrist coalition: elections, courts and a free press. Lawyers, students
and shopkeepers who think the republic can still be argued back onto its feet. It works in the
open, through the press, diplomacy and the courts ([[GDD#16.1 The three factions|GDD §16.1]]). Its
home city is [[Ashford]], the university town. Faction naming is parked (project CLAUDE.md rule 5).

## Key facts

| | |
|---|---|
| Content id | `alliance` · short name *Alliance* · small mark ▲ (triangle) |
| Home city | [[Ashford]] (baseline 70 % Alliance; [[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]]) |
| Home HQ | **Assembly Rooms** (`ashford.assembly-rooms`, members only), *the Rooms* |
| Capital HQ | **Concord House** in Old Town, [[Irongate]] (`irongate.concord-house`) |
| Party secretary | **Thomas Grey**, constituency agent (*Mr Grey*, signs *— T.G.*); see [[People of Irongate]] |
| Starting bonus | +3 Intelligence |
| Rank titles | Volunteer · Campaigner · Agent · Senator · Representative · Speaker · Prime Minister ([[GDD#5.4 Faction Rank|GDD §5.4]]) |
| Signature event | **the Headline Story** (needs a Case File; [[Campaign Events]] slice 6, [[The Dossier]] slice 8) |
| Branch motion | *Reading Room Grant* (`ord.reading-room`) |
| Starting kit | worn overcoat (`outfit.worn-overcoat`) and the party card |
| Paper at home | *The Ashford Gazette* ([[The Morning Paper]]) |
| Legislation style | voting rights, cheaper healthcare, curbs on propaganda (§16.1) |

**In the opening** ([[GDD#7.1 *Coming home* (review 5, 8 Oct 2026; replaces *The Last Train In*)|GDD §7.1]]):
Grey is the legal-aid lawyer taking housing cases. His problem is the requisitioned family flat
(Ashford's court hears housing cases this week). Picking it makes you Alliance.

## Places / members / roles

- **Assembly Rooms** (Ashford): HQ tickets, the welcome favour (*Witness the signature at the
  Assembly Rooms*), two rival-ground missions for visitors (*Spike the duplicator at the Rooms*,
  *Lift the constituency roll*). See [[Ashford]].
- **Concord House** (Old Town, Irongate): the capital office, members only.
- Run-in opponent on its side: the *party heavy* (`party-thug`), Ashford's only run-in opponent.
- Designed, not built: party figure **Professor Emil Faber** (slice 7) and patron **Senator Aurelia
  Voss** (after the MVP). See [[People of Irongate]].

## In the game

**Content:** `packages/content/src/data/factions.ts`, `packages/content/src/data/cities/ashford.ts`,
`packages/content/src/data/people.ts` (Grey), `packages/content/src/data/candidates.ts` (nine Ashford
locals, two per capital district).

## Art

- Crest: `art-direction/crests/crest-alliance.svg` (and `.png`): **a domed hall rising over a voting
  slot**, on a blue triangle. Passed the review, with one caution: keep the three rays short, never
  a sunburst, and never an eye above the dome
  ([[design/content-policy-review#5. Crest verdicts|§5]]).
- HQ scene: `mvp/scenes/alliance-hq.png`. Secretary portrait: `mvp/portraits/grey.png`. Opponent:
  `party-thug.png`. Early style art: `portrait-alliance.png`, `poster-alliance.png`.

## Status

Built: faction, Ashford, ranks, secretary, welcome set, branch rule, Unrest pair (slices 2–3, then
reviews 4–5 and the [[Voting Rework]]). Designed, not built: the Headline Story
([[Slice 6 Together]]), Chair and laws ([[Slice 7 The Nation]]), Case Files ([[Slice 8 A Life in the City]]).

> [!warning] Drift
> [[GDD#16.1 The three factions|GDD §16.1]] gives the Alliance the exclusive location **Press Club**
> (unlisted jobs, journalist intel). In content, *The Press Club* in Old Town
> (`irongate.press-club`) is an ordinary `bar` open to every party, and Ashford's *Press Club* is
> only an unbuilt survey pin (`ashford.press-club`, Station Road quarter).

## Related

[[Iron Vanguard]] · [[Red Collective]] · [[Ashford]] · [[Irongate]] · [[Levels and Faction Rank]] ·
[[Party Orders]] · [[Coming Home]]
