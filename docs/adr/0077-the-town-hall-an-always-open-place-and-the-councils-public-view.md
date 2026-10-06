# ADR 0077 — The Town Hall: an always-open place, the council's public view by city, the hall read from its location

**Status:** proposed (review 4 fix round; amends review 3's `council.hall` and ADR 0020's council read) · **Date:** 2026-10-06

## Context

Review 4 (`docs/design/review-4-answers.md` §10–§11, GDD §15.3) makes the council's hall **a location on every city map**, kind `town-hall`, open from Level 1. Its sheet is the council's public face, in this order:

1. the gallery ticket;
2. *Your desk* for a councillor here;
3. the rule in force, with its plain effect;
4. the council's seats as rows;
5. the order paper, read-only;
6. the week's Issues;
7. the Election card.

The city plate's rule line prints the effect, and a seat won shows a *What now* card once per term.

Today:

- `council.hall` is a point and a name, a backdrop only (review 3).
- `council.chamber` returns `CouncilView` for the **residence's** council only, so there is no way to read another city's council.
- Each ordinance has `effectLine`, a caps line with numbers (*Job pay +10 %*) used on the order paper and the menu.

## Decision

1. **`town-hall` joins the closed `LocationKind` list.**
   - The halls are ordinary locations: a pin, a blurb and one tier-1 ticket.
   - `placeOpen` (ADR 0076) treats the kind as always open, whatever its quarter.
   - No scene binding until `scene.town-hall` is drawn: `pickArt` falls back to the map crop, as the election screens already do.
2. **`council.hall` becomes `{ locationId }`.**
   - The name, `ref` and point are read from that location.
   - The loader checks that the location is in the city, and that every council city has one.
   - Clearwater's Casino (slice 7) is named the same way, with its own kind, `bar`.
3. **`council.hall({ cityId })`**, a protected query, returns `TownHallView` for **any** city with a council.
   - Built by `councilViewFor(content, c, cityId, cityDoc, today)`, the existing `councilView` generalised from the residence spec to a city id. `council.chamber` becomes `councilViewFor(residence)`.
   - **Public blocks:**
     - the seats as rows (player or local, the name, the rank title, *you*, the vote after division);
     - the rule in force (name, `plainLine`, days left), or why there is none;
     - the order paper, read-only;
     - the next vote's moment;
     - the city's two Issues;
     - the city's Election card.
   - **`desk`:** the existing `CouncilView` and a `next` line (`deskNext` in rules), present only when the caller holds a seat on **this** council. The council's write procedures stay residence-bound, which is the same council, because a move vacates a seat (ADR 0026).
4. **The plain effect is a new field, `Ordinance.plainLine`** (≤ 60, *jobs pay a tenth more*). The existing `effectLine` keeps its caps role on the order paper and the menu. The plate and the hall's *rule in force* print `plainLine`.
5. **What now.**
   - `officeTerms.whatNowSeenAt` defaults to null; absent reads as unseen.
   - `TownHallView.whatNow` is present for the caller's own term on this council while unseen.
   - `council.whatNowSeen({ termId })` is a conditional `$set` to a target state: idempotent with no request key (ADR 0008).
   - The front page shows the same card once, through the existing `frontPageSeenAt`.

## Consequences

- A visitor sees another city's council. The data is already public: the paper prints the count and the rule in force.
- Opening a hall's sheet costs one query with three or four reads (terms, order paper, city document, Issues), cached by TanStack Query for the sheet's life.
- Councillors already sitting when this lands see *What now* once at their hall.
- Orders matching `actionTypes: ['intelligence']` in a city now also match the gallery ticket. This is intended: a place to do it at Level 1.
- Pin numbers shift where a hall is inserted among a city's places (the designer's *pin 7 of the Mill's places*). Specs that address pins by number are updated.
