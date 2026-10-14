---
type: system
title: Jail and the Cells
aliases: [Jail, The cells, Cells, Arrest, Bail, In the cells now]
tags: [risk, city-services]
status: built
slice: "5; reworked in the review-4 fix round; a mate's bail designed for 6"
gdd: ["§19.2", "§11.2", "§11.4", "§13.7"]
adrs: ["0033", "0078", "0041"]
updated: 2026-10-14
---

# Jail and the Cells

## In one paragraph

The cells (the GDD's *jail*) are where an arrest sends you: a short sentence at the police station of the city you are in. It costs **time, the day's Party orders and a mark on your record**, never anything you own. While inside you can still read the paper and do every political act, and Energy keeps refilling. Being held is public: every police station lists who is in its cells. See [[Heat and Record]] for how you get caught.

## How it works

- **When you go in** ([[GDD#19.2 Jail (new)|GDD §19.2]], slice-5 paragraph):
  - a caught check that lands while **Hot** or **Wanted** ([[GDD#11.2 Getting caught|GDD §11.2]]);
  - a **Failure** on an illegal mission while **Wanted** (no roll);
  - a **run-in with the police lost** ([[Run-ins and Combat]]).
  Never a tier-1 action at home; never a legal mission unless a police run-in is lost.
- **An arrest is always at least one mark** (review 4): the work's marks, or **one minor mark** when it carried none. Every arrest counts for the seven-day escalation.
- **Where:** the police station of the city you are in (Harbour Police, the Lock-up, Ashford's Police Station, Police Headquarters in the capital), its quarter opened if locked.
- **The sentence:** **20 minutes + Heat ÷ 2**, at most 60; **×1.5 on rival ground** (still at most 60). Lazy: any read after the end releases you.
- **Bail:** **100 Iron + 50 per mark** on the record, ×2 if *Notorious*, ×2 on rival ground, **×½ for Alliance members** (*Legal Aid*), to the nearest 10. The *Cells Are Full* Issue halves it in the capital.
- **Afterwards Heat is 25**, whatever it was. At home you stand at the police station's pin; **on rival ground release is deportation** (the train home, barred 24 h; [[Hostile Ground]]).
- **Orders off** (review 4): from the arrest to the day's turn your [[Party Orders]] are closed. Done stays done; the +5 PC is out of reach unless already paid. The panel reads *Orders off today · the branch heard about the cells*.
- **Inside:** no Energy actions, training or travel. Political acts and the paper work. One tier-1 tap, ***Listen to the cells*** (3 Energy). The duty officer, a civic policeman of the republic, is the screen's voice. The screen says *The door opens at {time} either way, and Energy keeps refilling in here.*
- ***In the cells now***: every police station's sheet lists the players held there (any party), name and *out in n min*. Record, Heat and bail stay private.
- **A mate's bail** (designed, slice 6): any faction member, from anywhere, pays your own bail figure and you are out at once; they get +10 Party XP. Once per sentence; nothing moves between accounts (ADR 0041).
- **Striking a mark** (built): 30 Political Capital strikes one mark, from the Me tab's record row. The bribe in a bar's back room is slice 8 ([[Bars]]).

## Where it lives

**Rules:** [[GDD#19.2 Jail (new)|GDD §19.2]] · [[GDD#11.2 Getting caught|§11.2]] · [[GDD#11.4 Clearing a record|§11.4]] · [[design/slice-5-risk#8. The cells (GDD §19.2, pinned)|slice-5 design §8]] · [[design/review-4-answers|review-4 answers §19–§20]] · [[adr/0033-heat-health-record-held-lazy|ADR 0033]] · [[adr/0078-the-cells-costs-orders-off-an-arrest-always-marks-and-the-cells-list|ADR 0078]] · [[adr/0041-favours-across-two-characters-one-release-path|ADR 0041]] (a mate's bail, proposed) · [[tech/review-4|tech spec review 4]]

**Code:**
- Rules: `packages/rules/src/held.ts`, `record.ts` (`arrestOnRecord`), `heat.ts`; `CELLS` (base 20, max 60, rival ×1.5, bail figures), `RECORD`, `HEAT.afterRelease` in `constants.ts`; `closeOrders` in `orders.ts`
- Server: `apps/server/src/services/heldService.ts` (`createStayInTx`, `releaseInTx`, `ensureReleased`, `payOut`, `heldAct`, `cellsNow`, `strikeMark`, `sendToHeld`), `risk.ts` · router `apps/server/src/trpc/routers/held.ts` (`get`, `inCells`, `act`, `bail`, `close`, `strike`)
- Data: model `packages/db/src/models/stay.ts`; `characters.held` with a partial index on `held.locationId, held.until` · content `services.cells` per city and `packages/content/src/data/held.ts`
- Client: `apps/client/src/routes/held.tsx`, `features/game/CellsNow.tsx` · `packages/ui/src/components/Held.tsx`

## Status

Built in [[Slice 5 Risk|slice 5]]; the sentence, orders off, the always-a-mark rule and the cells list in the [[Review 4]] fix round (7 Oct 2026). **Not built:** a mate's bail (slice 6), cellmates' Dossier entries and recruiting prisoners (slice 8 or later), the back-room bribe (slice 8), Political Protection (Rank 4) and the Rehabilitation Act (slice 7).

## Decisions

- Review 4 (6 Oct 2026): longer sentence (was 10 + Heat ÷ 2), orders off, always a mark, the public cells list. A Party XP or Reputation penalty was rejected: it would take an asset (Appendix C #94).
- 3 Oct 2026: the duty officer has no rank and belongs to no party.

## Open questions / drift

- None open. [[qa/slice-5-report|QA slice 5]] m6 (Heat "down to 25" when it went up) was fixed in copy; the rule stands: Heat is 25 after any release, even up from 0.

## Related

[[Heat and Record]] · [[Run-ins and Combat]] · [[Missions]] · [[Party Orders]] · [[Hostile Ground]] · [[Hospital and Treatment]] · [[Civic Alliance]] · [[Bars]]
