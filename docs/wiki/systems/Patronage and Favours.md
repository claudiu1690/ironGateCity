---
type: system
title: Patronage and Favours
aliases: [Patronage, Patrons, Patron, Favour, Favours, Requests, The welcome favour, Edith Crane, Julius Marr]
tags: [story, long-term, slice-8]
status: partly built
slice: "the welcome favour built (review 4, re-strung review 5); mates' favours designed for 6; patrons designed for 8"
gdd: ["§17.2", "§13.7", "§19.1", "§19.2"]
adrs: ["0055", "0041", "0073"]
updated: 2026-10-16
---

# Patronage and Favours

## In one paragraph

"Favour" means three different things in Irongate, and this page covers all three. **Patronage** is the slow one: each city has a powerful NPC **patron** you cultivate over real days, earning **Favour** (0–100) that unlocks gossip, introductions, a weekly favour and finally an endorsement. **Favours between faction mates** (slice 6) are posting a mate's bail and visiting a mate in the infirmary. **The welcome favour** is your very first action: the errand you agreed to in the opening, done at your party's HQ. Only the welcome favour is built.

## How it works

**Patronage** ([[GDD#17.2 Patronage (new)|GDD §17.2]]; designed for slice 8):
- **Five patrons in the GDD, two in the MVP:** **Edith Crane**, owner of the *Irongate Herald* (Herald House), and **Julius Marr**, banker (the Pier Hotel, Clearwater). Both are neutral and in battlegrounds, so every faction courts them on the same terms. Voss, Draganov and Reinholt follow after the MVP.
- **Favour never decays.** It comes from a **Request** done (**+6**; a letter in the paper's Letters row; one every second day after your first visit, two held at most, each expires at its fourth boundary; **a Success or a Partial counts, a Failure never**, the party orders' rule, settled 16 Oct 2026, design §24.9), **a gift** (+2, 200 Iron, once a day), **a society call** in the patron's town (+2; [[Missions]]) and chapters that name the patron (+5). A devoted player gains 5–7 a day.
- **Tiers:** **Acquaintance 10** (gossip: a free Dossier entry every Monday) · **Associate 30** (an introduction: Crane's *The morgue file*, Marr's *The late table*; informants, [[The Dossier]]) · **Confidant 60** (a favour once a week for Political Capital: Crane plants a headline, +50 momentum on an Issue; Marr's *discretion*: Heat to 0 and the back-room bribe half price for a week) · **Protégé 90** (an endorsement in council counts; the patron's piece, CHA 8; **Legacy +5**).
- **Away:** Favour stands, Requests expire, informants keep reporting. Opportunity, never loss.

**Favours between mates** (designed, slice 6; [[adr/0041-favours-across-two-characters-one-release-path|ADR 0041]]):
- **Post bail** for a faction mate from anywhere: pay their own bail figure, they are out at once, you get +10 Party XP ([[Jail and the Cells]]).
- **Visit** a mate in the infirmary (3 Energy): +10 Health and five minutes off their stay; three visits count; +10 Party XP ([[Hospital and Treatment]]).

**The welcome favour** (built; [[adr/0073-the-last-train-in-faction-as-an-answer-and-a-welcome-only-favour|ADR 0073]]):
- **Slot B of the welcome set** ([[Party Orders]]): a one-off ticket at your HQ, `use: 'welcome'`, type `council` (best-stat check), **10 Energy, difficulty 8**, with the committee session's rewards.
- Since review 5 the three are ***Sign on*** at the Union Hall (Collective), ***Get the stamp*** at Beacon House (Vanguard) and ***File the appeal*** at the Assembly Rooms (Alliance), each following from the opening's first beat ([[Coming Home]]).
- Offered only while today's welcome order is open; ×3 refused (`ONCE_ONLY`), otherwise `NOT_OFFERED`. The first landing opens the HQ's pin with the favour highlighted.

## Where it lives

**Rules:** [[GDD#17.2 Patronage (new)|GDD §17.2]] · [[GDD#13.7 Party Directives (new)|§13.7]] (the welcome set) · [[design/slice-8-life#5. Patrons (GDD §17.2, two for the MVP)|slice-8 design §5]] (and §16.5 Requests) · [[design/slice-6-together|slice-6 design §9]] · [[design/review-4-answers|review-4 answers §2.6]] · [[design/review-5-answers|review-5 answers §19.5]] · [[adr/0055-patrons-favour-and-requests-by-the-calendar|ADR 0055]] (proposed) · [[adr/0041-favours-across-two-characters-one-release-path|ADR 0041]] (proposed) · [[adr/0073-the-last-train-in-faction-as-an-answer-and-a-welcome-only-favour|ADR 0073]]

**Code:**
- Welcome favour: the `*.favour` tickets in `packages/content/src/data/cities/{coalport,duskwall,ashford}.ts`; the `welcome-b` templates in `orders.ts`; `use: 'welcome'` in `schemas.ts`; the offer check and `ONCE_ONLY` in `apps/server/src/services/actionService.ts`; `carriedWelcome` in `packages/rules/src/orders.ts`
- Patrons: rules in `packages/rules/src/patrons.ts` (T3, 16 Oct 2026); **content** (T6, 16 Oct 2026) in `packages/content/src/data/patrons.ts` (Crane and Marr, six Requests each, word for word from design §16.5), the two NPCs in `people.ts`, `patronId` on Herald House and the Pier Hotel, the introductions *The morgue file* (`missions/irongate.ts`) and *The late table* (`missions/clearwater.ts`), the six society calls, the pen and the case in `items.ts`, the card's and the paper's words and the gift and favour modals in `copy.ts` (`copy.life.patron`, `.modals`). **Server (T13, 16 Oct 2026, `b34c740`):** `apps/server/src/services/patronService.ts`: `patron.get/visit/gift/favour` (router `patronRouter` in `trpc/routers/life.ts`), the card `PatronCardView` (on `life.place`), the Me tab's clocks (`life.me().patrons`), and the in-transaction helpers `addFavourInTx`, `crossInTx` (Protégé's piece and Legacy, idempotent) and `advanceRequestsInTx` / `advancePatrons`, called from tier-1 taps, missions and society calls, the exposé, every landed Dossier entry, chapters and the settlement (`lifeSettlement.ts`). Requests arrive, expire and are paid by `patronDays` in the settlement (lane 2). The endorsement in the counts: `countLines(…, { home: true })` and `protegeScoreBonus` in `cityDayCore.ts`. Test hook `POST /api/test/patron` and the panel's *Crane / Marr at 29 / 59 / 89* in `apps/server/src/dev/life.ts`.
- Mates' favours (ADR 0041): the gates and the visit's effect in `packages/rules/src/favours.ts`, `healHealth` in `health.ts`, `stays.bailPostedBy`, `visits` and `how: 'bailPosted'` in `packages/db/src/models/stay.ts` (slice 6 phase A, 15 Oct 2026); `apps/server/src/services/favourService.ts` (`postBail`, `visitMate`), slice 5's `releaseInTx` naming the payer (`how: 'bailPosted'`), the held view's visitors and sign-ups (phase B, `21929a7`); the screens (phase C lane B): `FavourSheet` in `packages/ui/src/components/Members.tsx`, `apps/client/src/features/faction/FavourFlow.tsx` (from a Members row, a profile, a chat line and `CellsNow`'s *Post bail*), the held screens' lines in `Held.tsx`; e2e `apps/client/e2e/favours.spec.ts`.

## Status

**Phase C, lane Q (16 Oct 2026): on screen** (`5510772`): the patron's card on Herald House's and the Pier Hotel's sheets (`PatronCard` in `packages/ui/src/components/Patron.tsx`; `patron.visit` on its first showing, Gift, the Requests, the Confidant's favour with Crane's Issue sheet, the perks), the Me tab's Patrons block (`life.me().patrons`), the paper's Request, informant and gossip Letters, a society ticket's door and Favour, the morgue file's name picker in the briefing. E2E `patron.spec.ts`.

**Built:** the welcome favour ([[Review 4]] fix round, re-strung in [[Review 5]]). **Built, QA to come:** mates' bail and visits ([[Slice 6 Together|slice 6]] phase B). **Slice 8, building:** Crane and Marr's rules and content (phase A) and the server (T13, 16 Oct 2026: Favour from gifts, society calls, Requests and chapters; the Confidant's favours; Protégé's piece, Legacy and endorsement) are built; the card's screen is phase C ([[Slice 8 A Life in the City|slice 8]]). A Request counts a Success or a Partial, never a Failure (design §24.9). **Post-MVP:** the other three patrons, new patrons each season.

## Decisions

- Review 4 (6 Oct 2026): the favour you did in the opening becomes your first action.
- Slice 8 design: two neutral patrons in battlegrounds for the MVP (Appendix C #77 on Favour's pace).
- Appendix C #89: visits from anywhere but rival ground.

## Open questions / drift

- GDD §13.7 now names the review-5 favours too (fixed 14 Oct 2026).
- The GDD §17.2 tier table (Voss expunges a record point, Marr grants a loan, "+2 % council score") is the v3.1 text; the slice-8 paragraph below it is what will be built.

## Related

[[Party Orders]] · [[The Dossier]] · [[Legacy]] · [[Ambitions]] · [[Missions]] · [[Jail and the Cells]] · [[Hospital and Treatment]] · [[People of Irongate]] · [[Irongate]] · [[Clearwater]]
