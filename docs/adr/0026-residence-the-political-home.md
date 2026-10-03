# ADR 0026 — Residence is the political home; `homeCityId` stays the faction's home

**Status:** proposed (slice 4) · **Date:** 2026-10-03

## Context

Slices 1–3 used `characters.homeCityId` for everything "home": where the player votes and stands, whose paper they read, which Party orders they get, which council card shows, the eligibility counts, and also the faction's home (morale, *Fired up*, the Ambition, the welcome day). Slice 4 lets a Rank 2 player **register** in an Irongate district (500 Iron, seven days between moves, GDD §14.11): from then on they vote and stand there, read the Herald and take the capital's orders, while their faction's home is unchanged. Moving also has side effects: a candidacy filed at the old place is withdrawn and a seat held there is vacated to the branch's next NPC.

The design also says the player's district changes with the tram (§5), while GDD §14.13 and the design's §17 Q15 say which quarter you are in is client memory, not a server fact. Registering requires "standing in the district".

## Decision

1. **`characters.residence { cityId, districtId, sinceDay, votesFromDay, standsFromDay, canMoveFromDay }`.** Migration 006 sets it to the home city with every window at 0, so nothing changes for existing players.
2. **One seam.** `residenceOf(c)` and `residenceSpec(content, c)` replace `homeCityId` wherever it means *where I vote, read and take orders*: the council acts and views, the Election card, the paper's live sections, the Party orders (`cityId: 'home'` resolves to the residence city, `districtId: 'home'` to its district), eligibility, turnout and the small-branch counts. `homeCityId` keeps meaning the faction's home (morale, *Fired up*, the crisis orders' city, the Ambition). A lint rule restricts reading `homeCityId` outside an allow-list, so new code takes the seam. The refactor lands alone with no behaviour change (slice-4 task T12).
3. **The windows are stored at the move**, computed in rules from the target city's offset: `votesFromDay` = the first polls opening after the registration (`nextPollsFrom(today + 1)`), `standsFromDay` = the next nominations (`nextNominationsAfter(today)`), `canMoveFromDay = today + 7`. Voting checks `votesFromDay ≤ pollsFrom` of the election; standing checks `standsFromDay ≤ today`.
4. **The district you stand in is not a server fact.** Trams are instant and free, so requiring the server to know the district adds nothing: `residence.register` names the district and needs only that the character is in Irongate (and not on a train). The district view is client memory, as GDD §14.13 says.
5. **The move is one transaction** (request key, version guard, `iron ≥ 500`, `canMoveFromDay ≤ today`): the new residence and an Energy re-base; at the old place a `filed` candidacy becomes `withdrawn` (deposit kept); a sitting seat gets `vacatedDay = today` and a new NPC term for the same seat from today to the old `toDay` (so `officeTerms`' unique key becomes `{ councilKey, seat, fromDay }`); the old city's `council.npcSeats` goes up by one. Each write is conditional on the status it expects.
6. **Today stays as it was**: today's orders and today's edition are not rebuilt; the capital rotation and the Herald start at the next settlement, as the design says.

## Consequences

- Every place that meant "home" now says which home it means; the cost is one careful refactor, guarded by the whole slice 1–3 suite.
- Eligibility queries move to a `residence` index; a player who moved away no longer counts at home.
- A vacated term is not completed, so it is not a rung on the office ladder (design §7.3); the stipend stops at `vacatedDay`.
- A later residence in Clearwater (slice 7) is the same act with a different city; rival home cities stay impossible (GDD §14.12).
