# ADR 0055 — Patrons: embedded on the character; Requests arrive, expire and are paid by calendar arithmetic in the settlement

**Status:** proposed (slice 8) · **Date:** 2026-10-04

## Context

GDD §17.2 and design §5: two patrons, Edith Crane (Herald House) and Julius Marr (the Pier Hotel). **Favour** 0–100 never falls. It comes from **Requests** (+6; one arrives every second boundary after the first visit; two may be held; each expires at its fourth boundary; six per patron in rotation; a matcher in the orders' DSL), gifts (+2, 200 Iron, one a day), society calls (+2 / +1) and two chapters (+5); a perk makes every gain ×1.1, rounded up. Tiers at 10 / 30 / 60 / 90 give gossip (a Monday entry), introductions and informants, a weekly favour for Political Capital, and the endorsement with the patron's piece. The design suggests the Requests' +6 be paid by the day job.

## Decision

1. **Embedded `patrons[]`** (at most two) on the character: Favour, the first visit, the open Requests with progress and their params (the rotating district, the Herald's Issue), the rotation pointer, the days each tier was reached, the weekly favour's day and Marr's discretion. A patron's state is read with the character and changed only by the character's own transactions.
2. **Requests by calendar arithmetic**: the pure `patronDays` walks each boundary of the settlement's window in order: pay what was done before it (+6, crossing tiers), drop what has expired, let one arrive on the even boundaries after the first visit when fewer than two are open, and mark Mondays for gossip. **The settlement pays**, not a job: the world never writes a character (ADR 0020), and an absent player's Requests arrive and expire exactly as a present one's.
3. **Progress is written with the act that earns it** by `requestMatches` (ADR 0009's matcher without the rival-ground exclusion, plus mission types, the Request's own district and the new kinds `dossierEntry` and `expose`).
4. **Favour is pure** (`addFavour`): the perk, the cap, the tiers crossed. A crossing in any transaction (a gift, a call, a chapter, the settlement) goes through one server helper that grants the Protégé's piece and Legacy +5.
5. **The weekly favour** is a set-once day (`favourDay`, seven City Days); Crane's planted headline reuses the Address's momentum and points (slice 7); Marr's discretion sets Heat to 0 and `discretionUntil`.

## Consequences

- No new collection and no job; a patron costs nothing on a read.
- A third patron is content plus one more array entry.
- The Protégé's endorsement is read by the council counts from the candidates' characters (read only), as the Legacy perk's ward vote is.
