---
type: system
title: Campaign Events
aliases: [Campaign Event, Events, Rally, Canvass Drive, Poster Night, Grand Rally, General Strike, Headline Story, Town Hall event, The daily fixture, Volunteers, Hands]
tags: [co-op, events, politics]
status: partly built
slice: "6 (phase A built: rules, content, art, db; server and screens to come); Town Hall and the Chair's events 7; Case File on the Headline Story 8"
gdd: ["§15.4", "§16.3", "§14.2", "§14.4"]
adrs: ["0036", "0037", "0049"]
updated: 2026-10-15
---

# Campaign Events

## In one paragraph

A campaign event is **co-op politics**: a short, scheduled event (a rally, a canvass drive, a
poster night) that faction members fill together, each taking a role. **Signing up is the
commitment**: the role's Energy is spent at the tap, and nothing afterwards is required. At the
start time the event resolves on its own, empty roles go to volunteers run by the game, and every
participant finds the result waiting as a modal and in the next paper. Nobody needs to be online
at a set time. Designed for slice 6, **not built**.

## How it works

- **The events** ([[GDD#16.3 Campaign Events (new)|GDD §16.3]]): **Rally**, **Canvass Drive** (the newcomer's event), **Poster Night** (slice 6), and one signature event per faction: **Grand Rally** (Vanguard; +5 Heat on rival-held ground), **General Strike** (Collective; double Issue momentum), **Headline Story** (Alliance; drawn from the leading rival; a Case File can be attached from slice 8 for +50 %). **Town Hall** (slice 7) adds signatures to an open dissolve petition ([[Recall and Removal]]). Roles, base swings and difficulties: GDD §16.3's table.
- **Callers:** Rank 3+, standing in an open city, not held or in transit, **never on rival ground**. The caller chooses the event; the venue is fixed in content. Start **in 1 · 3 · 6 · 12 hours**.
- **The daily fixture:** at every City Day boundary the secretary calls one event per faction in its home city and one in Irongate, open all day and resolved at the next boundary ([[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]]).
- **Limits:** per faction per city (per district in the capital): **one upcoming member-called event, two member-called starts a day, three starts with the fixture**. Per member: **three open sign-ups** at once.
- **Roles and hands:** 3–5 named roles need **Rank 2**; up to **four hands** for any Rank (5 Energy, no roll). One role per member per event.
- **Sign-up:** in the event's city at the tap; the role's Energy (10–20) spent at once. **Withdraw** until an hour before, Energy and Rested returned. An event with no member at the start is **called off**.
- **Volunteers:** empty named roles score **0.5** (0.75 at home when *Fired up*) and take no reward.
- **Resolution** (seeded, in `packages/rules`): one check per member-held role (the [[Stats and Checks|§8.4 roll]]): **Success 1 · Partial 0.5 · Failure 0**. Score = the mean of the named roles. **Triumph ≥ 0.875 · Success ≥ 0.625 · Mixed ≥ 0.375 · Fiasco below.** A lone member succeeding on a four-role fixture is a Success; a Triumph needs a roster.
- **The swing:** base × outcome × **the members' share** (capped ×1.25) × the usual lines (Issue +50 %, close race +25 %, comeback, the council rule), attributed equally to the members as ledger rows ([[Influence and Opinion]], [[Influence Ledger and City Hero]]).
- **Rewards per participant:** XP at the tier-2 rate by their own roll; Party XP by the outcome; **Political Capital 15 / 10 / 6 / 3** (full for the first event of the day, half after); **no Iron**.

**Technical shape:**
- [[adr/0036-campaign-events-roster-signups-and-natural-limits|ADR 0036]]: `campaignEvents` with the roster embedded; `eventSignups` one per tap (with the idempotency key and result); per-member limit as `events.open[]` on the character; per-place limits as **unique natural keys**, not counters; a **secret seed** per event with a named stream per role.
- [[adr/0037-event-resolution-world-first-credit-on-read|ADR 0037]]: one `resolveEvent` with four runners (an Agenda job `campaign-event-resolve`, any read of the event, a participant's read, the city day); it writes the **world only**; **each participant credits their own rewards on their next read**.

## Where it lives

**Rules:** [[GDD#16.3 Campaign Events (new)|GDD §16.3]] · [[GDD#15.4 Faction Chair and Party Directives|GDD §15.4]] (the fixture) · [[design/slice-6-together|slice 6 design §2–§4]] (texts for every event and outcome in §3) · [[design/slice-7-nation#10.4 The Town Hall (Campaign Event, GDD §16.3's seventh)|slice 7 design §10.4]] (Town Hall) · [[tech/slice-6|slice 6 tech spec]] · [[adr/0036-campaign-events-roster-signups-and-natural-limits|ADR 0036]] · [[adr/0037-event-resolution-world-first-credit-on-read|ADR 0037]] · [[adr/0049-petitions-dissolution-and-removals|ADR 0049]] (Town Hall signatures)

**Code (slice 6 phase A, 15 Oct 2026):**
- Rules: `packages/rules/src/events.ts` (`resolveCampaignEvent`, `eventRewards`, `eventCredit`, `bandFor`, `fillOf`, `eventSwing`, `splitEqually`, `fixtureFor`, `refundEnergy`, `callGate`, `signUpGate`, `roleCheck`, `addHeatAt`); `EVENTS` in `constants.ts`; the views in `togetherTypes.ts`; `orderMatches` and `feedMatches` accept an `event` descriptor. The swing's factors come from `swingFactors` in `ordinances.ts`.
- Content: `packages/content/src/data/events.ts` (six types, **30** venue rows, the fixture rotation, the three event orders not yet in the rotation); checks and accessors in `packages/content/src/slice6.ts` (`eventType`, `eventTypesFor`, `venueOf`, `venuesAt`).
- Art: `scene.event-poster-night`, `scene.event-grand-rally` in `data/art.ts`.
- DB: `campaignEvents` and `eventSignups` (`packages/db/src/models/campaignEvent.ts`), `events` on the character, `LEDGER_KINDS += 'event'`, migration `010-slice6-together.ts`.
- Server (slice 6 phase B, 15 Oct 2026, `21929a7`): `apps/server/src/services/eventService.ts` (`callEvent`, `signUpEvent`, `withdrawEvent`, `nudgeEvent`, `resolveEvent`/`resolveInTx`, `resolveOpenBefore`, `creditSignup`, the read path's `ensureEventsResolved`/`ensureEventsCredited`, `currentEvent`, `eventResult`, `seenEvent`, `eventHooks`); `eventPlace.ts` (`ensureFixtures`, `readEventPlace`, `eventDescriptor`, `headlineTarget`); `eventViews.ts` (board, page, call sheet, tickets, the receipt); `eventScheduler.ts`; the `campaign-event-resolve` job in `apps/server/src/jobs/together.ts`; the city day resolves an earlier day's events before each boundary and posts the fixtures in it (`cityDay.ts`). Router `apps/server/src/trpc/routers/events.ts`: **`events.callEvent`** (tRPC reserves `call`). The event orders are in the slot-B rotation (`data/orders.ts`). The paper: `togetherEdition.ts` (stored facts), `togetherPaper.ts` (the *Events* rows, `event-today` live).
- Client (slice 6 phase C lane A, 15 Oct 2026): `packages/ui/src/components/EventCard.tsx` (`EventCard`, `EventResultLine`, `bandStamp`), `EventPage.tsx` (`EventHeader`, `PaysTiles`, `RoleRow`, `HandsRow`, `roleGateText`, `roleOdds`), `CallEventSheet.tsx` (with `TimeChips`), `EventResult.tsx` (`ResultModal kind="event"`), `EventTicket.tsx` (`EventTicket`, `HereNowLine`), `FactionTabs.tsx`; `apps/client/src/routes/faction.tsx` (the `/faction` shell and its five parts), `routes/event.tsx` (`/faction/events/$eventId`), `features/faction/OrdersTab.tsx`, `EventsTab.tsx`, `EventGate.tsx` (results and *Called off* in the shell), `eventActs.ts`, `PlacePresence.tsx`; the venue's tickets, *Here now* and the plate's count in `routes/city.tsx`. The dev panel's *Together* buttons. E2E `apps/client/e2e/events.spec.ts` (project `events`); the playtest report's *together* section in `packages/db/src/together.ts`.

## Status

- **Built end to end** (15 Oct 2026): rules, content, art, db (phase A), the server and jobs (phase B), the Faction tab, the board, the event page, the call sheet and the result modal (phase C, lane A). QA next, in [[Slice 6 Together]]. Town Hall and the Chair's faction-wide events: slice 7. The Case File on the Headline Story: slice 8. Counter-Demonstrations: v1.1.

> [!warning] Drift
> Design §3.7 and the tech spec say *27 venues*; the table itself has **30** rows (12 home, 15 common in the capital, 3 signature in the capital). Built as the table; a question for the designer.

## Decisions

- **Hands at Rank 1** so the first event is day 1 (Appendix C #57).
- **Three starts a city a day** as the scale lever (Appendix C #58), replacing the GDD's first "one per faction per city every 4 hours". GDD §16.3's opening bullets now say the same (four chips 1 · 3 · 6 · 12 h, three starts with the fixture, three open sign-ups at once; fixed 14 Oct 2026).
- **PC from events halves after the first of the day** (Appendix C #59).
- **The fixture resolves at the City Day boundary** (Appendix C #60).
- **Volunteers at half strength make a lone member's fixture a Success** (Appendix C #62).
- The Vanguard's event is the **Grand Rally**; the *Torchlight March* is gone; its *Stewards* role became *Ushers* (3 Oct 2026) to avoid clashing with the Vanguard's Rank 2 title ([[design/content-policy-review|content-policy review]]).

## Open questions / drift

- **For the designer:** *Canvass Drive* and *Canvasser* (content's event and role names) are caught by the review-2 vocabulary guard (*canvass* banned for players), while CLAUDE.md rule 2 lists *canvass* as a campaign term. The review-4 e2e sweeps allow the two names for now (phase C Deviations).

> [!note] Inference
> With the voting rework, "the council rule for the event's type" in the swing means the ordinance chosen by the town's vote (e.g. *Street Permits* for a propaganda-matched event).

## Related

[[Chat and Presence]] · [[Party Orders]] · [[Influence and Opinion]] · [[Issues of the Week]] · [[Stats and Checks]] · [[Recall and Removal]] · [[NPC Fill]] · [[The Result Modal]] · [[Slice 6 Together]]
