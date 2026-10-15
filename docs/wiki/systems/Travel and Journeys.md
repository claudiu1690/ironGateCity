---
type: system
title: Travel and Journeys
aliases: [Travel, Journeys, Journey, Train, Nation map, Journey cards, Journey events]
tags: [travel, map, nation]
status: partly built
slice: "4; hostile deck in 5; journey on the map in review 4; card stays in review 5; dotted trail and the nation map held sideways in review 6; the journey held sideways in its leftovers"
gdd: ["§14.10"]
adrs: ["0025", "0075"]
updated: 2026-10-15
---

# Travel and Journeys

## In one paragraph

The cities are far apart, so **travelling takes real time**. From Level 10 a player boards a train
on the nation map; it leaves at the tap, takes 12–25 real minutes, and arrives even with the app
closed. The journey is drawn on the painted nation map as a moving pin. About one trip in three
carries a short **card** (a talkative passenger, a parcel…): one optional choice with a small
reward. Travel costs a ticket and time, **never Energy**.

## How it works

- **Times** from Irongate, third class ([[GDD#14.10 Travel and journeys (new)|GDD §14.10]]):
  Ashford 12 min · Coalport 12 · Duskwall 15 · Clearwater 25. Outer to outer runs through the
  capital (the two legs added). No journey over 30 minutes except the night train.
- **Built mode: third class only, 20 Iron** (never below 5; the Tram Subsidy ordinance and the Tram
  Fare Hike Issue each halve fares *from* their city). First class, the car and the night train are
  roadmap.
- **Who can go where:** the nation map opens at **Level 10**. Irongate and your home city from
  slice 4; rival home cities from slice 5 ([[Hostile Ground]]); [[Clearwater]] is locked (*No
  service yet*) until slice 7.
- **The train leaves at the tap.** No departure time, nothing to cancel.
- **In transit:** you stay *in* the city you left with the journey's status (never a null city). No
  Energy actions or training; the paper, the Me tab, the nation map and every political act of your
  residence (ballot, the council vote…) still work.
- **Arrival is lazy:** settled by any read at or after `arrivesAt`; a tidy job settles it at the
  same moment for absent players, best effort. Arrival is one modal (stamp *Arrived*) landing at
  Central Station (Station & Market) in the capital or on the **Town Hall's pin** in other cities.
- **Cards.** The first journey always carries one; afterwards one in three, drawn at boarding,
  seeded, without replacement through the seven. A card never fails, costs no Energy, and pays at
  most a 10-Energy action's worth (45 XP, 6 Party XP, 0.05 opinion, 10 points, 10 Rested, ≤ 100
  Iron; only the parcel pays 100). Opinion goes to the destination; points to its first Issue. Rows
  show an odds word and the stat, never a percentage.
- **The journey on the map** (review 4): both cities in view, the route traced along the painted
  rails, *your pin* where the clock puts it. The card's moment `cardAt` is drawn at boarding, uniform
  in **0.20–0.80** of the trip; the server refuses an answer before it.
- **The trail** (review 6): a row of round ink dots ringed in paper, the same size on screen at any
  zoom. The client smooths each traced leg (`smoothRoute`, Chaikin corner cutting) so its bends are
  rounded, and moves the pin along the same smoothed points, so the pin stays on the line. The server's
  route and `cardAt` are unchanged.
- **Held sideways** (review 6): the nation screen takes the screen's height (no 420 px floor), so
  every city can be dragged fully into view on a short phone. The journey screen too (review 6
  leftovers): its plate is a 260 px column on the left and the map fills the rest of the height, so
  the pin and the trail around it are always in view (the whole trail at 667 × 375 and 568 × 320).
  Upright the plate stays on top; from 1024 px it is the 480 px side sheet.
- **The card stays until a row is tapped** (review 5): no swipe-away. The ways out are a choice or
  the explicit *Sleep through it* (ordinary deck) / *Let it pass* (hostile deck). The arrival modal's
  *Continue* waits for one. Being away never loses the card.
- **Journey into a rival home city** always draws from the **hostile deck** at difficulty 14 (see
  [[Hostile Ground]]). Deportation from rival ground is a free, card-less journey home.

## Where it lives

**Rules:** [[GDD#14.10 Travel and journeys (new)|GDD §14.10]] ·
[[design/slice-4-battleground#2. Travel|slice-4 design §2]] ·
[[design/slice-4-battleground#3. The seven journey events|§3 (the seven cards)]] ·
[[design/slice-5-risk#11. Rival ground (GDD §14.12, slice-5 form)|slice-5 design §11]] (hostile deck) ·
[[design/review-4-answers#7. #7 — The journey on the nation map (GDD §14.10)|review-4 answers §7]] ·
[[design/review-5-answers#7. #7 — The journey card stays until answered (decided; GDD §14.10)|review-5 answers §7]] ·
[[adr/0025-journeys-lazy-arrival-and-a-tidy-job|ADR 0025]] ·
[[adr/0075-journey-on-the-map-content-routes-and-card-at|ADR 0075]]

**Code:**
- Rules: `packages/rules/src/travel.ts` (`legMinutes`, `destinationState`, `fare`,
  `drawJourneyCard`, `drawHostileCard`, `resolveJourneyChoice`, `journeyProgress`, `journeyLegs`,
  `trainAt`, `smoothRoute`, `ROUTE_SMOOTHING_ROUNDS`, `drawCardAt`, `CARD_AT`) · constant `TRAVEL`
- Server: `apps/server/src/services/travelService.ts` (`nationView`, `board`, `journeyView`,
  `choose`, `close`, `landingOf`) · `apps/server/src/services/journeyArrival.ts`
  (`settleArrival`, `ensureArrived`) · job `apps/server/src/jobs/journeyArrive.ts` · router
  `apps/server/src/trpc/routers/travel.ts` (`nation`, `board`, `journey`, `choose`, `close`)
- Data: model `packages/db/src/models/journey.ts` (collection `journeys`; pointer `journey` on the
  character) · content `packages/content/src/data/nation.ts` (cities, minutes, `routes[]`) ·
  `packages/content/src/data/journeyEvents.ts` (7 ordinary cards, 4 hostile cards, the patrol card)
- Client: `apps/client/src/routes/nation.tsx`, `apps/client/src/routes/journey.tsx`,
  `apps/client/src/features/travel/useBoard.ts` · `packages/ui/src/components/Travel.tsx`,
  `TravelPin.tsx` · the trail's dots in `packages/ui/src/components/CityMap.tsx` (`ROUTE_DOT`,
  `ROUTE_DOT_RING`, `ROUTE_DOT_GAP`) · e2e `apps/client/e2e/review6.spec.ts`

## Status

- **Built:** slice 4 (third class, nation map, lazy arrival, tidy job, seven cards); slice 5
  (rival home cities, hostile deck, deportation); review 4 (route on the map, `cardAt`, Town Hall
  landing); review 5 (the card stays until answered); review 6 (the dotted, smoothed trail; the
  nation map held sideways).
- **Not built:** first class, the car, the night train; checkpoints into Vanguard-controlled
  cities; snow and the Open Borders law on journey time; Clearwater's service (slice 7); carriage
  chat and fellow travellers' presence (slice 6); the *leave by* time for Campaign Events (slice 6).

## Decisions

- Journey times kept at 12 / 12 / 15 / 25, not the painted distances (Appendix C #8, 2 Oct 2026).
- The painted Coalport–Clearwater coast line carries no service (slice 7 design).
- The pin is a plain moving pin, not a train (user, 7 Oct 2026).
- *You can close the game* removed from every screen (review 4).
- The card cannot be put aside silently (review 5, Appendix C #98).
- The trail is dotted, without sharp turns (user, 15 Oct 2026, [[Review 6]]).

## Open questions / drift

- A curious player can see in the network response *when* a card will fire (ADR 0075,
  accepted and listed as a question).
- On wide but short screens held sideways (844 × 390, 932 × 430) 93–94 % of a long trail is in view
  at rest: the start behind the pin is a drag away, since the fit keeps two cities' pins apart
  (review 3's floor). R6-1 itself is closed.

## Related

[[Hostile Ground]] · [[Home Cities]] · [[Residence]] · [[Night and Patrols]] · [[Quarters and the Map]] ·
[[Scheduled Jobs]] · [[Lazy Timers]] · [[Issues of the Week]] · [[Slice 4 The Battleground]]
