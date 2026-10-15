---
type: system
title: Recall and Removal
aliases: [Recall, Petition, Petition to dissolve, Dissolution, No confidence, Vote to remove the President, Vote on the Chair, Impeachment]
tags: [politics, petitions, nation]
status: designed
slice: "7 (designed, not built)"
gdd: ["§15.4", "§15.9", "§16.3"]
adrs: ["0049", "0045", "0047"]
updated: 2026-10-15
---

# Recall and Removal

## In one paragraph

Three ways end an office early. Residents of a city can **petition to dissolve its council**;
deputies or Chairs can table **a vote to remove the President** (and the game tables one itself
when the President's party falls too far); members can force **a vote on their Chair**. There are
no snap elections: the calendar stays pure, and the next scheduled count is never more than five
days away. Nothing is destroyed: an office-holder loses the rest of a term and its ladder credit,
nothing else. All three are designed for slice 7 and **not built**.

## How it works

**A petition to dissolve the council** ([[GDD#15.9 Recall, no-confidence and impeachment|GDD §15.9]]):
- **Opened** by a Rank 3+ resident (resident since before the current vote opened), **10 PC** (the first signature), on **cycle days 0–2**.
- **Signed** by Rank 2+ residents of any party, 10 PC each, public, final. Sitting councillors of that council can't sign.
- **Closes** at the second boundary after opening, always before the next count (and, since the voting rework, before the set). **Succeeds** with **the greater of three and a quarter of the city's eligible residents** (the turnout roll). **One per city every seven days.**
- **On success** the council is dissolved: **the rule in force runs out its window** (a city always has a rule); the open ballot proceeds with the party's card and the seated locals' rules; the Governor's chair passes to the bloc's top local; every councillor's term ends **not completed**; local candidates sit until the next scheduled result.
- **The Town Hall** campaign event adds townspeople's signatures to an open petition: **Triumph 3 · Success 2 · Mixed 1** ([[Campaign Events]]).
- It is "the political way to push back against a majority's rule in a battleground". Impeaching a Governor *is* the petition.

**A vote to remove the President** (no confidence):
- Tabled by a deputy or a Chair of any party (**50 PC**, a slot on Parliament's order paper), or **automatically** when the President's party's **control share** is **below 25 %** (once a term, in the clerk's name).
- Not on term days 0–4 or 24–27; seven days between motions.
- Three days' vote, every deputy; **passes with 40 of 60**. The secretaries' line is *Against* for the President's party, free for the others, so a removal needs players.
- On passing, **the runner-up of the election** serves the rest of the term. Survived: a headline (Legacy 10, slice 8). Can't be vetoed. See [[The Legislature and Laws]].

**A vote on the Chair** ([[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]]):
- Automatic when the home city enters Unrest while a player Chair holds office (once per Chair per term), or by petition (Rank 3+, 10 PC, the greater of three and a quarter of active Rank 3+ members within two City Days; not in the Chair's first five or last three days).
- Two full days, every Rank 2+ member, *Confidence* / *No confidence*, secret. **Removed with two thirds of the votes cast and at least three No.** The secretary acts until the next election.

## Where it lives

- **Rules (built, slice 7 phase A):** `nationEvents.ts` (`petitionGate`, `chairPetitionGate`, `townHallSignatures`), `national.ts` (`signaturesNeeded`, `confidenceResult`, `autoRemovalDue`), the removal bill in `parliament.ts`. Collection `petitions` (one open dissolve petition per city). Services are phase B.
**Rules:** [[GDD#15.9 Recall, no-confidence and impeachment|GDD §15.9]] · [[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]] · [[design/slice-7-nation#10. Petitions and removals|slice 7 design §10]] (and its "Added 10 Oct 2026" section) · [[tech/slice-7|slice 7 tech spec]] (`petitionService`) · [[adr/0049-petitions-dissolution-and-removals|ADR 0049]] (petitions as set-once records; removals act at the division) · [[adr/0045-parliament-bills-slots-and-computed-local-deputies|ADR 0045]] (the removal as a bill) · [[adr/0047-elections-above-the-council-reuse-the-box|ADR 0047]] (the vote on the Chair as a `factionElections` row)

- **Server (built, slice 7 phase B lane 2, 15 Oct 2026):** `apps/server/src/services/petitionService.ts` (`open`, `sign`, the view, `closePetitionsInTx` called by every city day before the count and the set, `townHallSignaturesInTx` in `eventService.resolveInTx`), `confidenceService.ts` (the petition on the Chair, the vote, the automatic vote on Unrest, the removal), the President's removal in `parliamentService.ts`. Routers `petition.*`, `confidence.*`.

**Code (as first planned):** a `petitions` collection (`dissolve:{city}:{openedDay}`, `chair:{faction}:{chairTermId}`), `petitionService` (`open`, `sign`, `closeInTx` in the city's boundary), the clerk's motion in the nation's day. A dissolution writes `vacatedDay` on the council's `officeTerms` rows (the field exists today, used for moves).

## Status

- **Server built** (slice 7 phase B, 15 Oct 2026): dissolution (the rule in force untouched, the terms vacated), the Town Hall's signatures, the vote on the Chair, the removal of the President at 40 and the clerk's motion at a 24 % control share. **Not built:** the screens (phase C).
- The voting rework changed two things: the petition closes **before the set** (it was before the division), and dissolution **no longer strikes** the rule in force.

## Decisions

- **A petition dissolves the council; no snap election** (Appendix C #68).
- **The automatic removal uses the control share**, not raw National Control, because raw control is 23.5 for everyone at the baselines (settled 4 Oct 2026; Appendix C #67).
- **Sitting councillors can't sign** their own council's petition (4 Oct 2026).
- **The rule runs out its window** on dissolution (architect Q16, 10 Oct 2026). Since 14 Oct 2026 every source says so: GDD §15.9 and Appendix C #68 (now: *the things worth taking are its Governor, its councillors' rung and their say over the next ballot's cards*), [[adr/0049-petitions-dissolution-and-removals|ADR 0049]] (amended: no `toDay` cut, no order paper; the petition closes before the set), slice-7 design §10.1 and [[design/voting-simplified|voting-simplified §3.10]].

## Open questions / drift

> [!note] Inference
> With the rule no longer struck, a successful petition takes the Governor's chair and the councillors' ladder credit, and changes which cards a future ballot might hold, but not the rule in force. Whether that is still worth 10 PC a signature is a playtest question; Appendix C #68's levers (a fifth; two days' notice) predate this change.

## Related

[[City Council and the Rule Vote]] · [[Offices]] · [[The Legislature and Laws]] · [[National Elections]] · [[Campaign Events]] · [[National Control]] · [[Home Cities]] · [[Slice 7 The Nation]]
