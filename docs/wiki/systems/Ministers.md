---
type: system
title: Ministers
aliases: [Minister, Ministries, Speaker, Interior, Labour, Health, Culture & Press, Treasury]
tags: [politics, nation, post-mvp]
status: parked
slice: "post-MVP (launch + 60 days); confirmed in slice 7"
gdd: ["§15.1", "§15.7", "§25"]
adrs: []
updated: 2026-10-14
---

# Ministers

## In one paragraph

Ministers are a planned office above Parliament: each ministry adjusts one or two game settings
once a week, within fixed bounds, for the whole republic. They are **post-MVP** (launch + 60
days), together with the Speaker. The GDD keeps the settings as the plan; nothing is designed in
detail or built.

## How it works

The plan in [[GDD#15.7 Ministers|GDD §15.7]] (adjusted once a week, within bounds):

| Ministry | Setting |
|---|---|
| Interior | Police encounter chance ±10 %; Heat cooling rate ±20 % |
| Labour | Job pay ±10 %; seniority cap ±5 % |
| Health | Hospital costs ±25 %; HP regen ±20 % |
| Culture & Press | Social mission CHA thresholds ±3; propaganda influence ±10 % |
| *Treasury* (v1.2) | Faction treasury and public spending |

- A minister's weekly setting will be "a sixth source of the §15.8 effect kinds, bounded as the laws are": it would reuse the same effects language as [[Ordinances]] and [[The Legislature and Laws|laws]] (see [[Modifiers]]).
- [[GDD#15.1 Offices|GDD §15.1]] lists *Minister* and *Speaker* with no seats, term or powers: "Post-MVP (§15.7, §25)".
- [[GDD#25. Scope and roadmap|GDD §25]]: Ministers at launch + 60 days; Treasury v1.2.

## Where it lives

**Rules:** [[GDD#15.7 Ministers|GDD §15.7]] · [[GDD#25. Scope and roadmap|GDD §25]] · `docs/IMPLEMENTATION_PLAN.md` (listed among post-MVP items) · [[adr/0048-offices-on-office-terms-and-the-ladder|ADR 0048]] (notes that adding ministers later is "another `office` value with its own key")

**Code:** none.

## Status

- **Parked: post-MVP.** Confirmed out of the MVP in slice 7, with the Speaker. No design doc, tech spec or code.

## Decisions

- Slice 7 pins one office at the top, the President, and leaves Ministers and the Speaker post-MVP (Appendix C #64).

## Open questions / drift

- How a minister is chosen (appointed by the President? from deputies?), the term, the pay and the ladder rung are not written anywhere.

> [!note] Inference
> Several settings touch numbers that laws already bound (job pay, propaganda swing, Heat cooling). How a minister's setting and a law on the same number combine is not stated; ADR 0030's "combine by kind" table would presumably apply.

## Related

[[Offices]] · [[The Legislature and Laws]] · [[National Elections]] · [[Modifiers]] · [[Heat and Record]] · [[Jobs]] · [[Hospital and Treatment]]
