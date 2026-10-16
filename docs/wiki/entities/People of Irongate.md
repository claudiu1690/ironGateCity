---
type: entity
title: People of Irongate
aliases: [NPCs, named NPCs, characters, cast]
tags: [people, npc]
status: partly built
slice: "1–2 (secretaries); 3–4 (local candidates); 5 (opponents, carers); review 5 (the opening); 7–8 designed (party figures, patrons)"
gdd: ["§7.1", "§13.7", "§15.10", "§17.2", "§20.2"]
adrs: []
updated: 2026-10-16
---

# People of Irongate

## In one paragraph

The game's named people are few and each has a job in a system. The **three party secretaries**
carry the opening, the Party orders and the party's voice. **Local candidates** (townspeople run by
the game) fill every council list so there is always an election. **Run-in opponents** and the
**carers and duty officers** of the cells and infirmaries are types, not individuals. **Party
figures** (slice 7) and **patrons** (slice 8) are designed but not built. No figure run by the game
is ever presented as a player ([[GDD#15.10 NPC fill: politics at any population|GDD §15.10]]).

## Key facts

**Built (in content):**

| Name | Role | Where | Used by |
|---|---|---|---|
| **Petra Holm** (she) | Branch secretary, [[Red Collective]] | Coalport · Union Hall | [[Coming Home]] (the rehiring sheet), [[Party Orders]] (*Secretary Holm*, *— P.H.*), [[The Morning Paper]], the branch's rule |
| **Viktor Stahl** (he) | District organiser, [[Iron Vanguard]] | Duskwall · Beacon House | Coming Home (the League's welfare desk, the stamp), Party Orders (*Organiser Stahl*, *— V.S.*) |
| **Thomas Grey** (he) | Constituency agent, [[Civic Alliance]]; a former *Gazette* sub-editor | Ashford · Assembly Rooms | Coming Home (the housing appeal), Party Orders (*Mr Grey*, *— T.G.*) |
| *the clerk* (unnamed) | Demobilisation office clerk | Irongate Central | Coming Home beat 1 (three pieces of bad news) |
| **58 local candidates** | Townspeople on the council lists, a platform line each; home locals carry a rule for the ballot | 9 per home city, 10 per party in Irongate (2 per district) | [[City Council and the Rule Vote]], [[NPC Fill]] |
| 6 opponent types | Vanguard street enforcer · Vanguard doorman · strike picket · branch inspector · party heavy · city police constable | run-in pools by city and mission | [[Run-ins and Combat]] ([[GDD#20.2 Opponents|GDD §20.2]]) |
| The matron · the sister · the nurse | Carers at the infirmaries (St Agnes has the sister; Clearwater will have the nurse) | `hospital` places | [[Hospital and Treatment]] (*See the matron*) |
| The duty officer | The cells' voice | `jail` places | [[Jail and the Cells]] |

**Local candidates by city** (`candidates.ts`; no portraits, the ballot shows the party mark):
- **Coalport** (Collective): Anna Weiss, Josef Baum, Marta Kolar, Emil Hauser, Lena Novak, Karl
  Dressler, Ida Pohl, Tomas Ruzicka, Paul Lenz.
- **Duskwall** (Vanguard): Ernst Kessler, Margarethe Vogel, Otto Reinhardt, Friedrich Lang, Klara
  Steiner, Gustav Ehrlich, Johann Weber, Ilse Marquardt, Rudolf Fink.
- **Ashford** (Alliance): Dr Helene Auer, Samuel Kranz, Beatrix Holl, Rudolf Mayr, Clara Dorn,
  Wilhelm Frisch, Agnes Tauber, Leo Pichler, Otto Brenner.
- **Irongate**, two per party per district: Vanguard (Hedwig Brandt, Anton Moser, Rosa Lechner, Emil
  Prager, Kurt Steinhauser, Frieda Dietz, Georg Hollmann, Elsa Wirth, Wilhelm Ritter, Greta Sommer);
  Collective (Mila Horvath, Jan Beran, Vera Kalina, Otto Schwarz, Judit Varga, Karel Pelikan, Pavel
  Novak, Rita Albers, Leo Fuchs, Hana Marek); Alliance (Dr Anna Keller, Peter Vogt, Franz Ober,
  Sophie Lind, Julius Hartmann, Clara Roth, Erich Baumann, Ilona Tesar, Max Gruber, Lotte Adler).

The loader refuses a candidate who shares a name with a secretary or another candidate.

**Designed, not built:**

| Name | Role | Where | Slice / system |
|---|---|---|---|
| **Dr Konrad Albrecht** | Chairman of the Vanguard's national committee, a retired appeal-court judge | national | 7 · party's own figure for President ([[National Elections]]) |
| **Hanna Brod** | General secretary of the Collective, a tram conductors' union secretary | national | 7 · same |
| **Professor Emil Faber** | Chairman of the Alliance, a constitutional lawyer | national | 7 · same |
| 8 local deputies per party | clerks, inspectors, a nurse, a compositor… | Parliament | 7 · [[The Legislature and Laws]] |
| 9 Clearwater locals | three per party | [[Clearwater]] | 7 · council list |
| **Edith Crane** (she) | Proprietor of the *Irongate Herald* | Herald House, Irongate | 8 · [[Patronage and Favours]] (MVP patron); **in `people.ts` and `patrons.ts` since T6, 16 Oct 2026** |
| **Julius Marr** (he) | Banker | the Pier Hotel, Clearwater | 8 · MVP patron; in content since T6 |
| **Konrad Brandauer** | The block's night caretaker (no party; a Dossier name never drawn at random) | Coalport | 8 · [[The Dossier]], *Who Sold the Homes* 2; `extraNames` in `people.ts` |
| **Ruda, Big Anton, Ferko** · **Weiss, Dušek, Holub** · **Mr Halm, Mr Varga, Mr Olbrich** | a doorman, a steward, a minder (names drawn at hire) | the party store | 8 · [[Bodyguards]]; `bodyguards.ts` since 16 Oct 2026 |
| **Senator Aurelia Voss** | Law, courts, respectability (Alliance) | Ashford | after the MVP · patron |
| **Mikhail "Misha" Draganov** | Dockworkers' union boss (Collective) | Coalport | after the MVP · patron |
| **Commissioner Anton Reinholt** | Frontier commissioner, customs and checkpoints (Vanguard) | Duskwall | after the MVP · patron |
| **Inspector Kessler** | A named police inspector with his own values | — | 8 (his face already stands for the city police) |

Sources: [[GDD#15.10 NPC fill: politics at any population|GDD §15.10]],
[[GDD#17.2 Patronage (new)|GDD §17.2]], [[design/slice-7-nation#6.5 The party's own figures (NPC fill at the top)|slice-7 §6.5]],
[[design/slice-8-life|slice-8 life]] §5.

## In the game

**Content:** `packages/content/src/data/people.ts` (the three secretaries; also the Reputation ladder
names), `factions.ts` (how each secretary signs and is addressed), `origin.ts` (the opening's three
rows, `{helper}` and `{helperPronoun}`), `candidates.ts`, `opponents.ts`, `held.ts` (the cells' and
ward's taps), `copy.ts` (`treatment`, the carer's words).
**Design:** [[design/slice-1-content|slice-1 content]] §6.1 (Holm),
[[design/slice-2-cities|slice-2 cities]] §1.4 and §2.4 (Stahl, Grey),
[[design/slice-3-politics|slice-3 politics]] §5.2 (home slates),
[[design/slice-4-battleground#8.3 NPC fill: the Irongate slates (§15.10 pinned)|slice-4 §8.3]] (capital slates),
[[design/slice-5-risk#10.2 Who it is|slice-5 §10.2]] (opponents),
[[design/review-5-answers|review-5 answers]] §19 (the opening).

## Art

Portraits in `art-direction/mvp/portraits/` (4:5, noir lithograph):

| File | Who | In the catalogue |
|---|---|---|
| `holm.png`, `stahl.png`, `grey.png` | the secretaries | yes |
| `street-enforcer.png`, `vanguard-doorman.png`, `strike-picket.png`, `branch-inspector.png`, `party-thug.png` | opponents | yes |
| `kessler.png` | the city police constable (Inspector Kessler's face) | yes |
| `sergeant.png` | the duty officer (`portrait.duty-officer`) | yes |
| `nurse.png` | the matron (`portrait.matron`) | yes |
| `father.png` | the father of the old opening | yes, but **retired** with `scene.origin-deathbed` |
| `albrecht.png`, `brod.png`, `faber.png` | party figures (slice 7) | not yet |
| `crane.png`, `marr.png` | the two MVP patrons (`portrait.crane`, `portrait.marr`, referenced by `patrons.ts` and `people.ts`) | **not yet: to catalogue (T7)** |
| `voss.png`, `draganov.png`, `reinholt.png` | the later patrons | not yet |
| `doorman.png`, `steward.png`, `minder.png` | a doorman, a steward, a minder ([[Bodyguards]]) | yes (T28, 16 Oct 2026) |
| `adler.png` | reserved for a *Gazette* reporter in slice 8's Dossier content (slice-2 cities §2.4) | not yet |
| `barman.png` | not found in any design doc | not yet |

Player faces (18) are in `mvp/avatars/` and have no effect on play.

## Status

Partly built. Secretaries, locals, opponents and carers are in the game. Party figures, local
deputies, Clearwater's slate and patrons wait for slices 7–8.

> [!note] Inference
> **Two Kesslers.** *Ernst Kessler* is a Duskwall local candidate (a retired customs inspector), and
> *Inspector Kessler* is the police face (§20.2, slice-5 design §10.2). Nothing in the sources says
> they are the same man. The loader's name check covers candidates and secretaries, not opponents.

## Related

[[Coming Home]] · [[Party Orders]] · [[NPC Fill]] · [[Run-ins and Combat]] ·
[[Patronage and Favours]] · [[Iron Vanguard]] · [[Red Collective]] · [[Civic Alliance]]
