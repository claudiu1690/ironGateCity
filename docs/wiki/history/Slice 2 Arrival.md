---
type: history
title: Slice 2 Arrival
aliases: [Slice 2, Arrival]
tags: [slice, built]
status: built
dates: 2026-09-29
commits: [168323e, cb1b5a5, 1251184, 8db603e, 78167e2, c732d64, f28610f, af7d22e, 72abaaa, 790da86]
gdd: ["§3.3", "§7", "§7.5", "§8.2", "§8.5", "§13.7", "§17.1", "§21.4"]
adrs: ["0011", "0012", "0013", "0014", "0015", "0016"]
updated: 2026-10-14
---

# Slice 2 Arrival

**Status: built** (29 Sep 2026), QA'd and fixed the same day. Its opening story was replaced twice later ([[Review 4]], [[Review 5]]).

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 2 — Arrival|the plan]]: the origin story, the faction choice and a start in that faction's home city, the welcome edition of the paper and the day-1 unlock order, the starting kit, the first outfit (Charisma is worn), Ambition chapter 1, and a mobile layout.

- **Question:** does a brand-new player understand what to do in the first 10 minutes, without a tutorial screen?

## What it added

- **The origin story** as built then: a deathbed dialogue with the father, six questions setting the stats, the coat and the Ambition. Today's opening is [[Coming Home]] (see below).
- **Three home cities**: [[Duskwall]] ([[Iron Vanguard]]), [[Coalport]] ([[Red Collective]]) and [[Ashford]] ([[Civic Alliance]]), six places each, with secretaries Viktor Stahl and Thomas Grey beside Petra Holm. See [[Home Cities]].
- The welcome edition of [[The Morning Paper]] and a fixed **welcome set** of [[Party Orders]] on the first City Day ([[adr/0012-welcome-set-first-city-day-orders|ADR 0012]]).
- [[Equipment and Wardrobe]] groundwork: an item catalogue in content, inventory embedded ([[adr/0014-items-catalogue-in-content-inventory-embedded|ADR 0014]]); Charisma is worn.
- [[Ambitions]]: chapter 1 as a three-step story that never fails, sent as a Letter ([[adr/0013-tier-3-stories-shared-view-no-interpreter|ADR 0013]]).
- The arrival draft and the character made at join ([[adr/0011-arrival-draft-and-character-at-join|ADR 0011]]); slice 0–1 characters migrated in place ([[adr/0016-slice-0-1-characters-migrate-in-place|ADR 0016]]).
- Art kinds and budgets ([[adr/0015-art-pipeline-slice-2-kinds-and-budgets|ADR 0015]]); see [[Art and Maps Pipeline]].
- Phone layouts for everything built so far.

## Documents

- Design: [[design/slice-2-onboarding|design/slice-2-onboarding]] (the flow, §13 tech answers, §14 QA answers, §15–§16 later addenda) and [[design/slice-2-cities|design/slice-2-cities]].
- [[design/content-policy-review|design/content-policy-review]]: campaign language for the Vanguard and the Collective.
- Tech design: [[tech/slice-2|tech/slice-2]].
- ADRs: [[adr/0011-arrival-draft-and-character-at-join|ADR 0011]] to [[adr/0016-slice-0-1-characters-migrate-in-place|ADR 0016]].
- QA: [[qa/slice-2|qa/slice-2]].

## Decisions made

- **Content policy** (29 Sep): the Vanguard is an authoritarian nationalist party, **not a militia**. Military ranks became *Initiate / Steward / Bailiff / …*; the *Torchlight March* became the *Grand Rally*; chalking is words, never a mark; "enemy" became "rival". Faction names were left alone (parked).
- **User decision (29 Sep): keep the Collective's crest as it is** ([[design/content-policy-review|content-policy review]]).
- The origin answers may stack (at most +8 to one stat). An answer is final once tapped.
- The player's name is 2–40 characters after trimming. Political Capital shows in the HUD on every screen size once above 0.
- The Alliance's Rank 3 title became *Agent* (it was *Councillor*, the office).

> [!warning] Drift
> The plan says the faction is a **choice** after the origin. Since [[Review 4]] the party is **whom you help** in the opening, and since [[Review 5]] the opening is [[Coming Home]] at the demobilisation office. GDD §7.2 keeps the old dialogue "for the record". The reference recruit is now STR 8 / INT 12 / AGI 5 / CHA 5.

## QA and leftovers

- **Verdict: Pass with issues** ([[qa/slice-2|QA report]]): blocker 0, major 2, minor 5, nit 13.
- **M1**: a double tap on an origin answer answered the next question too. **M2**: Ashford's first pin was hidden under the city plate on wide screens. Both fixed in the fix round (`790da86`), with the minors.
- A separate fix the same day: lost taps on the city map after closing a sheet (`c732d64`). Its side effect (the map recentring) was a [[Review 1]] note.
- No open leftovers recorded for slice 2.

## Commits

`168323e` onboarding script and cities · `cb1b5a5` tech design, ADRs 0011–0016 · `1251184` answers · `8db603e` the build · `78167e2`, `f28610f`, `af7d22e` the content-policy review, applied, crest kept · `c732d64` lost-tap fix · `72abaaa` answers to QA · `790da86` QA and fix round 1. All 29 Sep 2026.

## Related

- Previous: [[Slice 1 The 5-Minute Session]] · Next: [[Slice 3 The First Vote]]
- [[Coming Home]] · [[Decision Log]]
