---
type: system
title: Issues of the Week
aliases: [Issues, Issue, Momentum, Issue deck]
tags: [city, opinion, signature]
status: built
slice: "4; deck extended in 5; Clearwater Issues designed for 7"
gdd: ["§14.6"]
adrs: ["0029", "0030"]
updated: 2026-10-14
---

# Issues of the Week

## In one paragraph

Irongate's signature mechanic. Every city has **two live public concerns each week** (*Tram Fare
Hike*, *Mill Strike*…). Work that matches an Issue moves opinion half again and earns **momentum**
for your party on it. On Sunday night the party with the most momentum **owns** the Issue: it gains
three points of opinion there, its top contributors get Political Capital, and the Issue's effect
runs for a week. Issues give each week a different shape and turn influence into an argument about
something.

## How it works

- **The draw** ([[GDD#14.6 Issues of the Week (new)|GDD §14.6]]): at the **Monday 00:00 UTC**
  boundary each open city draws **two** Issues from those eligible for it, seeded from the week,
  never last week's two. In Irongate the two come from **two different districts**. All weights 1
  in the MVP. A city with no draw yet draws at bootstrap, so no city is ever without Issues.
- **Stances:** each party has a one-line stance per Issue (flavour). The effect is the same
  whichever party owns it.
- **Tags:** an Issue has `feeds` (action types, places, place kinds, the district). A matching
  action is tagged (*Issue: Tram Fare Hike · opinion +50 %*) and gets **+50 % swing**. Missions are
  tagged by the same feeds as their type.
- **Momentum:** a tagged action adds its **content Energy on Success, half on Partial** (rounded
  half up). Journey cards add what they say. From slice 6 Campaign Events add each member's
  committed Energy. Momentum is **public**: the paper shows every party's total.
- **Resolution**, Monday boundary, before the new draw (no early resolution, Appendix C #28): most
  momentum owns it (ties: higher share in the city or district, then nobody); no momentum at all
  and it **lapses**. The owner gets **+3 opinion** (Neutral first, in the Issue's district in
  Irongate), a headline, **4 PC** to its top five contributors, and the **effect** on the whole city
  for **7 City Days**.
- **Effects** are bounded modifier lines, the same kinds as ordinances (tickets −50 %, rooms −50 %,
  job pay +10 %, speech −2 Energy, Heat cools faster, bail −50 % …). Two sources of one kind
  combine by fixed rules: Energy/chance/Rested deltas add, pay/Iron/FXP percentages are separate
  lines, opinion/ticket/room percentages multiply. See [[Modifiers]].
- **The deck:** 19 Issues in slice 4, +5 in slice 5 = **24** today. Slice 7 adds six for Clearwater
  (deck of 30). A roadmap table of later Issues waits for their systems.
- **Where players see it:** a chip on places and the Places list (*Issue · Tram Fare Hike*), the
  ticket tag, *What's here* (the city's two Issues, who leads, tap to the first tagged place), the
  Town Hall sheet, the paper's Issues section.

## Where it lives

**Rules:** [[GDD#14.6 Issues of the Week (new)|GDD §14.6]] ·
[[design/slice-4-battleground#9. Issues of the Week (§14.6, slice-4 form)|slice-4 design §9]]
(deck, texts, feeds, stances) ·
[[design/slice-5-risk#12. Issues and Party orders added|slice-5 design §12]] (five more) ·
[[design/slice-7-nation#9.6 Clearwater's Issues (six new; the deck becomes 30)|slice-7 design §9.6]] ·
[[adr/0029-issues-of-the-week|ADR 0029]] · ADR 0030 (modifier sources)

**Code:**
- Rules: `packages/rules/src/issues.ts` (`drawIssues`, `feedMatches`, `issueTags`, `pointsFor`,
  `resolveIssue`) · `packages/rules/src/week.ts` · constants `ISSUES`, `ORDINANCE_BOUNDS`
  (effect kinds) · `packages/rules/src/ordinances.ts` (`swingFactors`: the *Issue* line)
- Server: `apps/server/src/services/issuesDay.ts` (`drawWeek`, `issuesStep`, `bootstrapIssues`) ·
  `apps/server/src/services/modifiers.ts` (`liveIssuesOf`, Issue effects as modifier sources) ·
  `apps/server/src/services/place.ts` (momentum written in the act's transaction) ·
  `apps/server/src/services/cityService.ts` (`cityIssueRows`, `whatsHereOf`)
- Data: content `packages/content/src/data/issues.ts` (24 Issues) · model
  `packages/db/src/models/issue.ts` (collection `issues`, one doc per city-week-Issue) · the
  city document's `issues { weekDay, live, effects }`
- Dev: `apps/server/src/dev/issues.ts` (dev panel helpers)

## Status

- **Built:** slice 4 (draw, tags, momentum, resolution, effects, 19 Issues); slice 5 (five Issues
  and the `heatCoolPct`, `bailPct` kinds; missions tagged); review 4 (the chip's help note);
  review 5 (*What's here*).
- **Not built:** Campaign Event momentum (slice 6); Clearwater's six Issues (slice 7); law and
  weather weights on the draw; the Governor's and President's *Address* (+50 / +100 momentum,
  slice 7).

## Decisions

- Sunday-only resolution, no momentum threshold (Appendix C #28).
- Two sources of one kind combine by the fixed rules above (3 Oct 2026).

## Open questions / drift

- None found between GDD, design, content (24 ids) and constants (`ISSUES`: 2 per city, +50 %,
  owner +3, top five, 4 PC, 7 days).

## Related

[[Influence and Opinion]] · [[Influence Ledger and City Hero]] · [[Ordinances]] · [[Modifiers]] ·
[[Capital Districts]] · [[The Morning Paper]] · [[Campaign Events]] · [[Weather]]
