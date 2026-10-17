---
type: system
title: The Dossier
aliases: [Dossier, Case Files, Case File, Exposé, Expose, Informants, Dossier entries]
tags: [intelligence, slice-8]
status: partly built
slice: "8 (server built 16 Oct 2026; client in phase C)"
gdd: ["§10", "§10.1", "§10.2", "§10.3", "§10.4", "§10.5"]
adrs: ["0053", "0054", "0052"]
updated: 2026-10-17
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

**Rules:** [[GDD#10. The Dossier|GDD §10]] · [[design/slice-8-life#4. The Dossier (GDD §10, pinned)|slice-8 design §4]] (and §16.4 lines, §16.6 exposé texts) · [[adr/0053-dossier-entries-collection-counted-not-stored|ADR 0053]] · [[adr/0054-expose-a-story-at-the-press|ADR 0054]] · [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]] (item `dossierChance`) · [[tech/slice-8|tech spec slice 8]] (Deviations, phase B lane 2)

**Code:**
- Rules: `packages/rules/src/dossier.ts` (capacity, freshness, `pickName`, `rollEntry`, binding, selling, turning, informant reports, the exposé's gate, difficulty, swing and rewards); views in `packages/rules/src/lifeViews.ts`.
- Data: the `dossierEntries` collection (`packages/db/src/models/dossier.ts`; entries, Case Files and informants, one row each); `characters.expose`, `dossierBurns`, `dossierLastAt` / `dossierSeenAt`.
- Server: `apps/server/src/services/dossierService.ts` (`landEntry`, the one helper every source calls in its own transaction; `dossier.get/seen/station/bind/sell/turn`; the Headline Story's attach / detach / spend); `exposeService.ts` (`expose.get/choose/attempt`); the settlement's informants and gossip in `lifeSettlement.ts`; router `apps/server/src/trpc/routers/dossier.ts`. Sources wired: tier-1 intelligence (`actionService.writeTier1`), the cells' and ward's taps, surveillance and theft (`missionService.writeMissionFinal`), *Feed him a story* (`travelService.choose`), a chapter's entry (`chapterLife.ts`). Society calls and the morgue file come with T13.
- Client: `packages/ui/src/components/Dossier.tsx` (the tab, `NameCard`, `CaseFileCard`, the station's card and sheet, `ExposeStory`), `apps/client/src/routes/dossier.tsx` (`/dossier`, `/dossier/expose`), `apps/client/src/features/dossier/PlaceDossier.tsx` (the place cards), the result lines in `packages/ui/src/lifeQLines.ts`.
- Content: the twenty lines in `packages/content/src/data/dossier.ts`; Brandauer in `people.ts`; the copy in `copy.ts` (`copy.life.dossier`, `.expose`); the paper's lines in `lifeHeadlines.ts`.
- Client: only the disabled tab so far (`apps/client/src/components/AppShell.tsx`); the tab, the station sheet and the exposé are phase C (T21).

## Status

**Phase C, lane Q (16 Oct 2026): on screen** (`5510772`): the *Dossier* tab (Names · Case Files · Informants, the dot), *Make a Case File*, the station's card and sheet, the press's ticket and the exposé's two steps with its *Printed* / *Page three* / *Spiked* modal and front page, the public line in every paper, *Attach a Case File* on the Headline Story's call sheet, the entry lines on every result. E2E `dossier.spec.ts`, `chapter8.spec.ts`.

**Phase B, lane 2 (16 Oct 2026): the server is built** (T11, T12): entries from every source but society calls, Case Files, selling at a station, informants, the exposé with its swing in the name's town, the burn and Legacy +2, and the Headline Story's *Attach a Case File* (+50 % on the swing). The tab is phase C.

**Slice 8, building:** the rules (T2) and the content (T6) are in since 16 Oct 2026; the collection, the server and the tab are not. Slice-5 surveillance and theft missions and the cells' and ward's taps already exist; they gain their Dossier payloads in slice 8. Safe intelligence taps pay XP and Iron only until then.

**Integration (17 Oct 2026, `8ae302a`):** the full e2e is green; the playtest report's life section counts entries by source, the stale share, files, exposés by angle and outcome, sales and informants (`packages/db/src/life.ts`). ADRs 0053 and 0054 accepted.

## Decisions

- Slice 8 design (4 Oct 2026): the exposé is a three-step story with its own pointer; Case Files from Level 16; Blackmail and Denounce deferred.
- Appendix C #76: the exposé's swing is −1.0 / −0.5.
- **17 Oct 2026 (the designer, phase C; design §25 #3–#4):** **the exposé's page is the outcome's, not the angle's**: a Success is the front page on *plainly* and *the headline* alike (as built); the angle decides only the split (all to Neutral / half to your party) and the point of difficulty; the hints and the plainly Success's title (*Page one, every line*) reworded. Lane Q's copy confirmed, three source words reworded (*Lifted papers*, *A rival's informer*, *The morgue file*), two empty states reworded; the step texts name no editor by rule.

## Open questions / drift

- The §10.4 v3.0 table ("Sell 50–200 IM at tram stations"; Blackmail +10 Heat) is superseded by the slice-8 paragraph below it; not drift, but easy to misread.
- [[adr/0054-expose-a-story-at-the-press|ADR 0054]] leaves open whether a burn should be shared across players (a scoop).

## Related

[[Missions]] · [[Patronage and Favours]] · [[Equipment and Wardrobe]] · [[Legacy]] · [[Influence and Opinion]] · [[Stats and Checks]] · [[Ambitions]] · [[People of Irongate]] · [[Jail and the Cells]] · [[Hospital and Treatment]]
