---
type: tech
title: Content Package
aliases: [packages/content, Content, Game Data]
tags: [tech, content]
status: built
slice: "0; a city or content set per slice to 5, review rounds, voting rework"
gdd: []
adrs: ["0003", "0007", "0014", "0021", "0024", "0029", "0031"]
updated: 2026-10-14
---

# Content Package

## In one paragraph

`packages/content` (`@irongate/content`) holds everything that is *written* rather than *played*:
cities, places, actions and their text, missions, Issues, journey cards, orders, ordinances, papers'
headlines, NPCs, items, the art catalogue and the UI copy. It is TypeScript data, checked by Zod
schemas plus cross-checks when the server starts. **Content is data**: a new place or mission is an
edit here, never new code. Live state (opinion, elections) is not here; it lives in MongoDB
([[adr/0003-city-documents-hold-state-not-content|ADR 0003]]).

## How it works

1. `src/load.ts` gathers every data file into `rawContent`.
2. `parseContent(raw)` runs the Zod schema `Content` from `src/schemas.ts` (strict objects, so an
   unknown key fails), then a long list of cross-checks the schemas cannot say: unique ids, every
   referenced id exists with the right kind, art ids, headline placeholders, route problems, ballot
   fills, the job pay ladder (`jobLadderProblems`), district outlines (`slice5Problems`,
   `src/slice5.ts`; `tilingProblems`, `src/geometry.ts`). Any problem throws `ContentError` with a
   readable list, so a bad edit stops the server at start-up.
3. `indexContent(content)` builds `GameContent`: lookups like `content.city(id)`,
   `content.district(id)`, `content.ordinance(id)`, `content.issuesFor(cityId)`,
   `content.runInPoolOf(cityId)`, `content.ordersOf(factionId)`, `content.laterPins`.
4. `getContent()` parses once per process and memoises. The server, the db seed and the reports
   all call it.

Rewards are mostly **not** data: they follow from an action's type and Energy at the rules' rates
(`packages/rules/src/constants.ts`). Mission Energy and difficulty come from the rules too.

### Data files (`src/data/`)

| File | Holds |
|---|---|
| `cities/coalport.ts`, `duskwall.ts`, `ashford.ts` | The three home cities: quarters, places, actions, text, maps ([[Coalport]], [[Duskwall]], [[Ashford]]) |
| `cities/irongate.ts` | The capital: five districts, places, actions (about 1,500 lines) ([[Irongate]]) |
| `cities/townHall.ts` | The Town Hall place appended to every city |
| `missions/*.ts`, `missions/attach.ts` | Each city's missions, attached to their places ([[Missions]]) |
| `factions.ts` | The three factions, crests, rank titles, secretaries ([[Iron Vanguard]], [[Red Collective]], [[Civic Alliance]]) |
| `people.ts` | Named NPCs (the party secretaries) and Local Standing level names |
| `candidates.ts` | NPC council slates per home city and the capital |
| `jobs.ts` | The nine jobs ([[Jobs]]) |
| `orders.ts` | Party order templates by slot ([[Party Orders]]) |
| `ordinances.ts` | The ten rules a town can vote in, with effects in the DSL ([[Ordinances]]) |
| `issues.ts` | Nineteen Issues of the Week, where they are drawn, their feeds and effects ([[Issues of the Week]]) |
| `journeyEvents.ts` | Journey cards, the hostile deck and the patrol card ([[Travel and Journeys]]) |
| `opponents.ts` | Run-in opponents and their lines ([[Run-ins and Combat]]) |
| `held.ts` | The one tap in the cells and on the ward |
| `nation.ts` | The nation map: city positions, routes, journey times |
| `mapPins.ts` | The survey pins of the painted maps (from `maps-v3/pins/pins.json`) |
| `tiles.json` | The tile manifest written by `pnpm art:tiles` (size, levels, `rev`, bytes per map) |
| `art.ts` | The art catalogue: every image id, kind, source, widths, alt text ([[Art and Maps Pipeline]]) |
| `items.ts` | The item catalogue (clothing, documents, keepsakes) ([[Equipment and Wardrobe]]) |
| `origin.ts` | The three-beat opening ([[Coming Home]]) |
| `ambitions.ts` | Three Ambitions with chapter 1 ([[Ambitions]]) |
| `headlines.ts`, `localHeadlines.ts`, `heraldHeadlines.ts`, `capitalHomeHeadlines.ts`, `politicalHeadlines.ts`, `ruleHeadlines.ts` | The papers' headline templates ([[The Morning Paper]]) |
| `politics.ts` | Political result modal texts |
| `copy.ts` | Short UI copy, British English; safe to import in the client (`@irongate/content/copy`) |

**`src/maps.ts`** (`@irongate/content/maps`): for the dev map viewer only — pins, tile pyramids,
alt texts, city outlines, nation routes. No game screen reads it; they get maps from the server.
**`src/geometry.ts`**: `inPolygon`, `polygonArea`, `tilingProblems`, `outlinesOverlap`.

## Key files

- `packages/content/src/schemas.ts` (Zod), `src/load.ts` (`parseContent`, `indexContent`, `getContent`), `src/index.ts`
- `packages/content/test/` — 28 Vitest files incl. word-for-word and vocabulary checks (frozen under the 8 Oct rule)

## Rules to follow

- New content is a data edit; if it needs a new field, add it to `schemas.ts` and a cross-check.
- Reference other things by id only (art, places, NPCs); the loader checks every id.
- Numbers that are rules stay in `packages/rules`, not in content.
- Text follows the game's vocabulary (campaign words, never war framing) and the parked faction names.

## Decisions (ADRs)

- [[adr/0003-city-documents-hold-state-not-content|ADR 0003]] — content in code, state in Mongo.
- [[adr/0007-web-art-pipeline|ADR 0007]] — the art catalogue as content.
- [[adr/0014-items-catalogue-in-content-inventory-embedded|ADR 0014]] — items catalogue in content.
- [[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]] — effects validated by content against rules' bounds.
- [[adr/0029-issues-of-the-week|ADR 0029]], [[adr/0031-missions-their-own-list-one-resolver|ADR 0031]] — Issues and missions as content.

> [!note] Inference
> Clearwater has a map in `tiles.json` and a place on the nation map, but no city file: it is a
> slice-7 battleground ([[adr/0050-clearwater-single-meter-battleground|ADR 0050]], not built).

## Related

[[Architecture Overview]] · [[Rules Package]] · [[Add a Mission]] · [[Add a Place]] ·
[[Add or Change Game Text]] · [[Art and Maps Pipeline]]
