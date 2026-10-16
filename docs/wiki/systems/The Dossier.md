---
type: system
title: The Dossier
aliases: [Dossier, Case Files, Case File, Exposé, Expose, Informants, Dossier entries]
tags: [intelligence, slice-8]
status: designed
slice: "8 (designed, not built)"
gdd: ["§10", "§10.1", "§10.2", "§10.3", "§10.4", "§10.5"]
adrs: ["0053", "0054", "0052"]
updated: 2026-10-16
---

# The Dossier

## In one paragraph

The Dossier is the player's **private intelligence journal** on the republic's named people: candidates, local deputies, party figures, secretaries and the Ambitions' named figures. Entries arrive by luck and by work (a lucky intelligence tap, a surveillance mission, a society call, a patron's gossip). Three entries' worth on one name bind into a **Case File**, which can be spent on an **exposé** at the press, **sold**, or turned into an **informant**. In the MVP it covers NPCs only; player dossiers are v1.5. It is **designed for slice 8 and not built**: the client's *Dossier* tab exists but is disabled.

## How it works

- **Capacity** by Intelligence: **10 slots at INT 1–10, up to 60 at INT 51+**, +1 per Legacy perk *A bigger Dossier* (twice). Entries and Case Files each take a slot. A full Dossier **refuses** a new entry (*an entry went begging*): opportunity, never loss ([[GDD#10.1 Capacity|GDD §10.1]]).
- **An entry** is `{ name, category, line, day, source }`; its line is drawn from the category's pool of twenty.
- **Categories:** political · criminal · pattern · asset · the small stuff ([[GDD#10.3 Categories|GDD §10.3]]).
- **Where entries come from** (slice-8 form, [[GDD#10.2 Gathering intelligence|GDD §10.2]]):
  - a tier-1 **intelligence** Success: **10 %** + worn items' `dossierChance` (press pass 10, camera 15, Crane's pen 10);
  - a **surveillance** mission (Success one; Partial one time in two) and a **theft** Success;
  - *The informer* journey card; *Listen to the cells* and *Talk to the ward* (25 % on a Success);
  - a **society call** (25 %), a patron's Monday **gossip**, an **informant** (every second day for 14 days).
  The v3.0 methods (journalist contact, underground network, secret police file) are expressed through these, not separate actions.
- **Freshness:** entries older than **7 days** are *stale*: half weight in a Case File, half price. Nothing is deleted by time ([[GDD#10.5 Freshness|GDD §10.5]]).
- **Case Files** (from **Level 16**): three entries' worth on one name (fresh 1, stale ½) bind with one tap. The file keeps the lines and **never goes stale**; one file per name ([[GDD#10.4 Case Files (new)|GDD §10.4]]).
- **Uses in the MVP:**
  - **The exposé** at Herald House or Gazette House: three resumable steps, one a day, **20 Energy**. Step 1 picks the file and the angle (*the facts, plainly*: the swing to Neutral; *the story, with a headline*: half to your party, a point harder). Step 2 is one check (**difficulty 18 / 16 / 14** by the file's weight). Success: **opinion −1.0** against the name's party in the name's town, **+5 PC, Legacy +2**, the front page with your name, the name burned 14 days. Partial −0.5. **Failure keeps the file.** No run-in, no Heat.
  - **Sell** at a station place: a file 200 Iron, a fresh entry 50, a stale one 25.
  - **An informant:** spend a file with a pattern line in a town whose patron you are **Associate** with; an entry every second morning for 14 days; two at most.
- **Deferred:** Blackmail and Denounce (Appendix C #78).

## Where it lives

**Rules:** [[GDD#10. The Dossier|GDD §10]] · [[design/slice-8-life#4. The Dossier (GDD §10, pinned)|slice-8 design §4]] (and §16.4 lines, §16.6 exposé texts) · [[adr/0053-dossier-entries-collection-counted-not-stored|ADR 0053]] · [[adr/0054-expose-a-story-at-the-press|ADR 0054]] · [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]] (item `dossierChance`) · [[tech/slice-8|tech spec slice 8]]

**Code (planned, per the ADRs; none exists yet):**
- A `dossierEntries` collection (entries, Case Files, informants; slot count counted in the transaction, never stored); `landEntry` helper; `characters.expose { fileId, angle, locationId, day }` pointer; `dossierBurns[]`
- Content (T6, 16 Oct 2026): the twenty lines in `packages/content/src/data/dossier.ts`; Brandauer in `people.ts` (`extraNames`); the `dossier` payloads on `held.ts` (the cells criminal, the ward neutral, 25 %), the informer's *Feed him a story* in `journeyEvents.ts` and the morgue file; `expose` feeds on *The Cells Are Full* and *The Casino's Licence* in `issues.ts`; the tab's, the station's and the exposé's copy and modal texts in `copy.ts` (`copy.life.dossier`, `.expose`); the paper's lines in `lifeHeadlines.ts`. **Not yet bound:** `load.ts` does not pass `dossierLines`, `extraNames` or `lifeHeadlines` into `rawContent` (the developer's binding).
- Today: only the disabled tab, `apps/client/src/components/AppShell.tsx` (`{ id: 'dossier', disabled: true }`) and the icon in `packages/ui/src/components/Shell.tsx`

## Status

**Slice 8, building:** the rules (T2) and the content (T6) are in since 16 Oct 2026; the collection, the server and the tab are not. Slice-5 surveillance and theft missions and the cells' and ward's taps already exist; they gain their Dossier payloads in slice 8. Safe intelligence taps pay XP and Iron only until then.

## Decisions

- Slice 8 design (4 Oct 2026): the exposé is a three-step story with its own pointer; Case Files from Level 16; Blackmail and Denounce deferred.
- Appendix C #76: the exposé's swing is −1.0 / −0.5.

## Open questions / drift

- The §10.4 v3.0 table ("Sell 50–200 IM at tram stations"; Blackmail +10 Heat) is superseded by the slice-8 paragraph below it; not drift, but easy to misread.
- [[adr/0054-expose-a-story-at-the-press|ADR 0054]] leaves open whether a burn should be shared across players (a scoop).

## Related

[[Missions]] · [[Patronage and Favours]] · [[Equipment and Wardrobe]] · [[Legacy]] · [[Influence and Opinion]] · [[Stats and Checks]] · [[Ambitions]] · [[People of Irongate]] · [[Jail and the Cells]] · [[Hospital and Treatment]]
