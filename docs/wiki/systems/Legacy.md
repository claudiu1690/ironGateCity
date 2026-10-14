---
type: system
title: Legacy
aliases: [Legacy points, Lasting perks, Legacy perks, The record in the republic]
tags: [long-term, progression, slice-8]
status: designed
slice: "MVP, slice 8, not built yet (record and perks; decided 14 Oct 2026)"
gdd: ["§17.3", "§14.11", "§10.4"]
adrs: ["0057", "0052"]
updated: 2026-10-14
---

# Legacy

## In one paragraph

Legacy is your **permanent, public political record**, shown on your profile (*Legacy 23*). It replaces a generic achievement system: points come from real political events (a council term served, an exposé printed, an Ambition completed, a term as President). The total **never falls**. Small **lasting perks** are bought from a balance kept beside it (*23 · 8 to spend*). It is **MVP, slice 8, not built yet** (the record and the eight perks together; the user, 14 Oct 2026).

## How it works

- **Entries and points** ([[GDD#17.3 Legacy (new)|GDD §17.3]]; headline values): City or District Hero **2** · a council term completed **3** · an Issue resolved in its top five **2** · a Governor's, Mayor's or deputy's term **5** · a Chair's, Minister's or Speaker's term **10** · a pledged law passed **10** · surviving a no-confidence vote **10** · an Ambition completed **30** · a President's term **40** · an exposé printed **2** · Protégé of a patron **5** · the Champion faction **5** · a season award **5** · pushed a rival home town into Unrest **2** (the review-5 prize, `UNREST_PRIZE.legacy`) · helped win your home town back from Unrest **2** (pinned 14 Oct 2026 to match).
- **Lasting perks** (the player's words; one tap each on the Me tab; permanent and small):
  - *A fifth more from the party* (15): +5 % Party XP on every action and mission;
  - *A bigger Dossier* (5, twice): +1 slot ([[The Dossier]]);
  - *A better night's sleep* (10): Rested cap +50 ([[Rested]]);
  - *A shorter walk* (15): canvassing −1 Energy;
  - *A name they know* (10, three times): +1 to the ward vote per level in a home count;
  - *A bonus at the end of the week* (10): an extra day's pay at the Monday boundary ([[Jobs]]);
  - *A friend of friends* (10): Favour gains ×1.1 ([[Patronage and Favours]]);
  - *A quiet word at the station* (10): Heat cools 10 % faster.
- **Pace:** the reference player has about **15 Legacy by day 30**: one perk, chosen. Legacy is never spent on anything else and **cannot be bought** ([[Monetisation]]).
- **Fame is dangerous:** +1 recognition per 10 Legacy (at most +5) on rival ground ([[Hostile Ground]]).
- **Absence:** an entry earned by the world (a term ending, a season award) is credited at your next settlement; nothing is missed.

## Where it lives

**Rules:** [[GDD#17.3 Legacy (new)|GDD §17.3]] · [[design/slice-8-life#7. Legacy (GDD §17.3, pinned)|slice-8 design §7]] · [[adr/0057-legacy-entries-by-natural-ref-credited-in-character-transactions|ADR 0057]] (proposed) · [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]] (perks as personal modifiers) · [[tech/slice-8|tech spec slice 8]]

**Code (planned, per ADR 0057; none exists yet):**
- A `legacyEntries` collection with a unique `{ characterId, ref }` (`term:…`, `award:…`, `expose:…`, `ambition:…`); embedded `legacy { total, spent, perks, seasonCredited }`; `legacyFromWindow` and `seasonCredits` in the settlement; migration `012-slice8-life` back-fills past terms and awards (renumbered from 010 on 14 Oct 2026).
- Today: only `UNREST_PRIZE.legacy: 2` in `packages/rules/src/constants.ts`, marked "waits for slice 8". (Other `legacy` hits in the code are the voting rework's kept old order paper, unrelated.)

## Status

**MVP, slice 8, not built yet.** Planned for [[Slice 8 A Life in the City|slice 8]], record and perks together. The events it records (council terms, heroes, Issue awards) are already stored by slices 3–4, and ADR 0057 plans a back-fill so they count.

## Decisions

- Slice 8 design (4 Oct 2026): the record and the eight perks are in the MVP; perks spend a balance, the total never falls.
- 8 Oct 2026, review 5 #10: pushing a rival town into Unrest pays Legacy +2 from slice 8.
- **14 Oct 2026 (the user, drift cleanup):** Legacy perks are MVP, slice 8, with the record; the plan no longer lists them after the MVP. GDD §17.3 gained the Unrest prize's row and a new row for winning your home town back from Unrest.

## Open questions / drift

- The new row *helped win your home town back from Unrest* (+2) was pinned by the game-designer; the user has not confirmed it, nor the Unrest prize's wording. [[design/slice-8-life|Slice-8 design §7.1]] and ADR 0057's list of refs don't list the Unrest rows yet ([[tech/slice-8|tech/slice-8]] does, under `unrest|{cityId}|{entry}`).
- *A name they know* is one of three pieces of personal vote appeal; how they become points is [[GDD#Appendix C — Open questions|Appendix C #108]].

> [!note] Inference
> The perk name *A fifth more from the party* reads as +20 %, but its effect is +5 % Party XP. Possibly a naming slip; worth a designer look.

## Related

[[Ambitions]] · [[Patronage and Favours]] · [[The Dossier]] · [[Offices]] · [[Political Seasons]] · [[Influence Ledger and City Hero]] · [[Hostile Ground]] · [[Issues of the Week]]
