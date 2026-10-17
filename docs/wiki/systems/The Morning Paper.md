---
type: system
title: The Morning Paper
aliases: [Morning Paper, The Paper, Paper, Edition, Local Edition, Welcome Edition, In Print, Your Desk]
tags: [paper, session, ui]
status: partly built
slice: "1 (v1); 2 (welcome edition, Letters); 3 (Election row, In Print); 4 (Issues, Herald); 5 (Heat, record); review 4 (local editions); voting rework (Council rule row)"
gdd: ["§3.3"]
adrs: ["0005", "0023", "0071", "0074"]
updated: 2026-10-16
---

# The Morning Paper

## In one paragraph

The Morning Paper is the first screen of a new City Day, and after any absence of three hours or
more. In about thirty seconds it tells the player what changed, what is open today and what is
waiting for them: headlines, the town's Issues, the council rule, Party orders, letters and the
player's own desk. It replaces a tutorial, a log and a notification feed with one printed page in
the voice of the player's home city. One tap dismisses it; it can be reopened any time.

## How it works

- **When it shows:** after the City Day changes, and after 3 hours away
  ([[GDD#3.3 The Morning Paper|GDD §3.3]]; `PAPER.dueAfterAbsenceMs`).
- **One paper per player: the paper of where they live.** Each home city has a masthead (*The
  Coalport Clarion*, *The Duskwall Sentinel*, *The Ashford Gazette*; the capital's *Irongate Herald*;
  the *Clearwater Courier* from slice 7). The app shell says *The {short name} is in*.
- **Local editions** (review 4): away from home the same paper is printed *· {City} edition*. The
  **local** parts (ambient headline, one city line, the local Issues first, a note of the local
  election) are that city's; the **own** parts (personal headlines, the Council rule row, orders,
  Letters, the desk) follow the player. On a train the edition is the destination's.
- **Dateline:** `{Weekday} · {D Month} · {City}` from the real UTC date. No year is ever printed.
- **Sections** (built so far): headlines (2–3, at most two personal); **The Issues**; **Council
  rule** (*Which rule for Coalport next week?* with *Vote now* on cycle days 2–4); **Party orders**;
  **Letters** (Ambition chapters); **Your desk** (wage and seniority, Rested, Energy, Level, Local
  Standing, *Yesterday* = the [[Session Loop#The Today tally|Today tally]], Heat and record when
  relevant); **In Print** (your name in the paper: the seat front page with the stamp *ELECTED*,
  the cells, the infirmary).
- **The welcome edition** is the first one a character sees: three headlines that point at the
  first Energy, the welcome set of orders, the chapter-1 letter and the desk
  ([[Coming Home]]).
- **Stored vs live.** The edition (its personal, city and ambient headlines and the desk) is
  printed once at the character's day settlement and stored. The political rows, the Issues and the
  local parts are **live at read**, so the paper always agrees with the ballot and the count.

## Where it lives

**Rules:** [[GDD#3.3 The Morning Paper|GDD §3.3]] ·
[[design/slice-1-content|slice-1 content §7]] (templates, conditions, priorities) ·
[[design/slice-2-onboarding|slice-2 onboarding §7]] (welcome texts) ·
[[design/slice-3-politics|slice-3 politics §8]] · [[design/voting-simplified|voting simplified §4]] ·
[[design/slice-4-battleground|slice-4 §12]] · [[design/slice-5-risk|slice-5 §14]] ·
[[design/review-4-answers|review 4 answers §23, §29.1]] (local editions) ·
[[adr/0005-lazy-per-character-city-day|ADR 0005]] ·
[[adr/0023-paper-political-sections-live|ADR 0023]] ·
[[adr/0074-local-editions-one-stored-paper-local-parts-at-read|ADR 0074]] ·
[[adr/0071-while-you-were-away-built-at-read|ADR 0071]] (slice 9, proposed)

**Code:**
- Rules: `packages/rules/src/paper.ts` (`selectHeadlines`, `selectPoliticalHeadlines`,
  `mergeHeadlines`, `composeHeadlines`, `selectLocalLine`, `isPaperDue`, `fitDeck`)
- Server: `apps/server/src/services/paperService.ts` · `edition.ts` (printing the stored edition)
  · `localEdition.ts` · `capitalPaper.ts` · `politicsService.ts` (live political rows) · router
  `apps/server/src/trpc/routers/paper.ts` (`today`, `markRead`)
- Data: model `packages/db/src/models/paperEntry.ts` (one per character per day) · content
  `packages/content/src/data/headlines.ts` (home papers), `heraldHeadlines.ts`,
  `capitalHomeHeadlines.ts`, `localHeadlines.ts` (the six neutral `hl.local.*`),
  `politicalHeadlines.ts`, `ruleHeadlines.ts`; mastheads in `packages/content/src/data/cities/*.ts`
  (`paper.name`, `shortName`)
- Client: route `apps/client/src/routes/paper.tsx` · `packages/ui/src/components/Paper.tsx`,
  `PaperSheet.tsx`

## Status

- **Slice 8 phase B, lane 2 (16 Oct 2026):** the life lines stored at the settlement (`lifeSettlement.ts`: the exposé's front page, a Case File, entries going stale, a patron's thanks and tier, the flat's three, Legacy, the coat, recognised, the bodyguard's two); `PaperView.life` (`lifePaper.ts`): the desk's Dossier, Patrons, Where you sleep, Legacy and Ahead rows, the Letters' Requests, informants' reports and Monday's gossip, and yesterday's exposé live in every other reader's paper. On screen in phase C (T23).

- **Phase C, lane Y (16 Oct 2026):** *From the capital* / *The republic* and the Election row's second row on screen (`NationalSection`, `ElectionWindowRow`); the desk's office and target lines; the office front pages (caption, *To the office* / *To Parliament*); the eleven personal national lines and the live `pushed` (`apps/server/src/services/nationPersonal.ts`, `pushTarget.ts`), `{until}` stored with its epoch.
- **Built:** v1–v5 (slices 1–5), local editions (review 4 fix round, 7 Oct 2026), the *Council
  rule* row and the rule headlines (voting rework, 12 Oct 2026). A slice-1 *While You Were Away*
  personal headline exists (`hl.away`, `hl.away-no-job`: days of pay banked).
- **Server built (slice 7 phase B, 15 Oct 2026):** v7's national section (`Paper.national`: *From
  the capital* / *The republic*, two lines at most and the open window's line, live at read;
  `apps/server/src/services/nationEdition.ts`), nine personal national lines stored at the settlement
  (the offices taken, a local's chair, the Address, a pledge kept, a bill passed or failed), the
  desk's office stipend and party-target lines, *In Print* for them. Not yet: the office front pages,
  eleven more personal lines, the screens (phase C).
- **Designed, not built:** v6 Events (slice 6), the rest of v7 (slice 7),
  v8 patron Letters, the Dossier and *Ahead* rows (slice 8), v9 the *While you were away* row with
  its digest and *From the editor* (slice 9, [[adr/0071-while-you-were-away-built-at-read|ADR 0071]]).

## Decisions

- [[Review 2]]: *Election* row, was *Polling Day*.
- [[Review 4]], 6 Oct 2026: one paper, printed in a local edition; the Herald is no longer forced
  on visitors to the capital.
- [[Voting Rework]], 10 Oct 2026: the row becomes *Council rule*; the seat's front page shows the
  three rule cards, not the count table.
- 14 Oct 2026 (drift cleanup): GDD §3.3's slice-4, slice-5 and slice-7 paragraphs now agree with
  local editions (a visitor on rival ground or in Clearwater reads their own paper in that city's
  edition; the Courier is the lake resident's paper).
- **17 Oct 2026 (the designer, phase C; design §25 #5):** *The Flat Waits* (priority 1) outranks the
  Level 10 and other milestone lines (priority 2); the two personal slots are chosen from every
  personal candidate of the morning in one stable sort by priority. If the Level 10 lines still win,
  the selector merges too late (developer); the numbers do not move.

## Open questions / drift

> [!note] Inference
> The slice-1 `hl.away` deck says *Rested is full*. After two days away that is true for any
> player (Rested fills in well under a day), so it reads correctly, but it is not computed.

## Related

[[Session Loop]] · [[Time and the Game Day]] · [[Party Orders]] · [[Issues of the Week]] ·
[[City Council and the Rule Vote]] · [[Heat and Record]] · [[Jobs]] · [[Coming Home]] ·
[[Ambitions]]
