---
type: system
title: The Legislature and Laws
aliases: [Legislature, Parliament, Laws, Law book, Bills, The veto, Deputies, Local deputies]
tags: [politics, nation, parliament, laws, modifiers]
status: designed
slice: "7 (designed, not built)"
gdd: ["§2", "§15.6", "§15.8", "§22.2"]
adrs: ["0043", "0044", "0045"]
updated: 2026-10-15
---

# The Legislature and Laws

## In one paragraph

**Parliament** is always sitting: sixty seats, refreshed at every national count. Deputies vote
For or Against on **bills**; a bill that passes becomes a **law**, a bounded rule that applies
everywhere in the republic for 7–28 days. Laws are the national version of a city's
[[Ordinances|council rule]]: they change numbers that exist (pay, journey times, run-ins at
night, bail) and never break the game. Seats no player holds go to **local deputies** run by the
game, who follow their party's players, then the Chair's line, then the secretary's, so the
law book fills from the first week even with no players. Designed for slice 7, **not built**.

## How it works

**Parliament** ([[GDD#15.6 The Legislature|GDD §15.6]]):
- **Sixty seats** by D'Hondt on the national scores ([[National Elections]]); a party's seats go down its list, the rest are local deputies (eight named per party, then counted). The ratio is shown openly.
- **The order paper:** at most **three bills plus the President's**. A bill is one law, a bill **to strike out** a law, or **a vote to remove the President** ([[Recall and Removal]]).
- **Who tables:** the **President** once a week, free, in a slot of its own · a **deputy** once a term, **50 PC** · a **Chair** once a term, 50 PC · **the secretary** of a party with no player Chair and no player deputy, at a Monday boundary when fewer than two bills are open (at most one a week).
- **The vote:** open from the tabling to the boundary into **tabling day + 4**; every deputy one tap, public, final. Local deputies vote by the chain: their party's player deputies' majority → the Chair's line → the secretary's line; they **abstain while the party's home city is in Unrest**. **31 For passes; a factional law needs 36; a removal or a veto override needs 40.**
- **In force** from the boundary after the **signature day** (the veto's day). A failed bill can't return for seven days; open bills lapse at term day 0.
- **The veto:** once a term; Parliament can override with 40 of 60 in a second three-day vote.
- **The cap:** at most **five laws in force, one of each**; a bill at the cap names the law it replaces.

**Laws** ([[GDD#15.8 Laws|GDD §15.8]]):
- **Thirteen laws** in a closed catalogue, four or five per party, each a bounded modifier (e.g. *Eight-Hour Day Act* job pay +10 % and seniority ×2; *Open Borders Act* journeys −25 % time; *Curfew Order* run-ins ×2 at night; *Rehabilitation Act* minor marks fade after 7 days, bail −25 %). Full table: GDD §15.8.
- **Factional** laws name a party's members (`appliesTo: members`) or everyone else (`others`) and need 36.
- **Never touch Party XP or the odds of a check.**
- A law reads like a council rule with the kicker **LAW**; the **law book** lists the five in force with days left and who put them up.
- With no players, the secretaries' lines pass the four laws two parties agree on (People's Education, Universal Care, Rehabilitation, Public Assembly) and fail the rest.
- **All laws expire at the season rollover** ([[Political Seasons]]).

**Laws as a modifier source** ([[adr/0044-laws-a-third-modifier-source|ADR 0044]]): a third `ModifierSource` kind (`'law'`) after the ordinance and the week's Issues; per-effect `appliesTo`; **seven new kinds** (`xpPct`, `missionEnergyDelta`, `journeyTimePct`, `runInPct`, `infirmaryCostPct`, `markFadeDays`, `caughtDelta`) with `LAW_BOUNDS`; the loader refuses `fxpPct` and `chancePct` in a law. The law book is a `laws` collection with a day-keyed projection on the `nation` document. See [[Modifiers]].

**Bills** ([[adr/0045-parliament-bills-slots-and-computed-local-deputies|ADR 0045]]): a `bills` collection with votes embedded; slots and once-a-term limits as unique natural keys; **local deputies are never stored**, computed at the division by a pure `divideBill`; a bill's life is a status machine driven by the nation's day boundaries ([[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]]).

## Where it lives

- **Rules (built, slice 7 phase A):** `laws.ts` (the DSL, `LAW_BOUNDS`, `lawSource` by `appliesTo`, `lawSourcesOn`, `lawsOnDay`), `parliament.ts` (`tableGate`, `localVote`, `divideBill`, `enact`, `secretaryBill`, `figureBill`, the veto), each new kind's helper in `ordinances.ts` (`missionEnergy`, `journeyMinutes`, `runInPcts`, `infirmaryPrice`, `caughtDeltas`, `markFadeDaysOf`) with optional inputs on `runInChance`, `caughtChance`, `walkOut`, `liveMarks`, `computeRewards`. Content: `Law` / `LawEffectSchema` in `packages/content/src/schemas.ts`, checks in `slice7.ts`, the catalogue in `data/laws.ts`. Collections `bills` and `laws`. Phase B passes the laws into the actions.
**Rules:** [[GDD#15.6 The Legislature|GDD §15.6]] · [[GDD#15.8 Laws|GDD §15.8]] · [[design/slice-7-nation#5. Parliament|slice 7 design §5]] · [[design/slice-7-nation#7. Laws|slice 7 design §7]] (the catalogue, lines, the secretaries' preferred laws) · [[tech/slice-7|slice 7 tech spec]] · [[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] · [[adr/0044-laws-a-third-modifier-source|ADR 0044]] · [[adr/0045-parliament-bills-slots-and-computed-local-deputies|ADR 0045]]

**Code:** none yet. Planned: `packages/rules/src/parliament.ts` (`divideBill`, `localVote`, `enact`, `secretaryBill`, `vetoOpen`, `overrideFits`), `packages/rules/src/laws.ts` (`LAW_BOUNDS`, `lawSource`, `lawsOnDay`), content `packages/content/src/data/laws.ts`, collections `bills` and `laws`, the `nation` document. The modifier code it extends is built: `packages/rules/src/ordinances.ts` and `apps/server/src/services/modifiers.ts`.

## Status

- **Designed, not built** (slice 7). No Parliament, bill, law or `nation` document exists in the code.
- The voting rework left Parliament unchanged: "a deputy's For / Against on a bill is already a vote on a rule" ([[design/voting-simplified|voting-simplified §3.10]]).

## Decisions

- **The secretaries table bills** so the book has laws from the first week (Appendix C #66).
- **Timing** (4 Oct 2026): the vote runs to tabling day + 4; tabling closes after term day 23 so nothing divides on day 27; an override that can't divide by day 27 is not tabled.
- **Laws never touch Party XP or check odds** (built into the loader, ADR 0044).
- The whip (Appendix C #26) was closed; moot for councils since the voting rework.

## Open questions / drift

> [!warning] Drift
> GDD §15.6 and ADR 0045 reuse the words **order paper** and **division** for Parliament, while the voting rework retired both for councils (GDD §1.5's plain-words table: for councils *the division* "no longer exist[s]"). Not a rule conflict, but a search for "order paper" in the sources now finds two different things.

- GDD §15.7 calls a minister's weekly setting "a sixth source" of the §15.8 effect kinds; which five sources come before it is not listed anywhere. See [[Ministers]].

## Related

[[National Elections]] · [[Offices]] · [[Ministers]] · [[Ordinances]] · [[Modifiers]] · [[Recall and Removal]] · [[NPC Fill]] · [[Political Seasons]] · [[Slice 7 The Nation]]
