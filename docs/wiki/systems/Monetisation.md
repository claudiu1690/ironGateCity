---
type: system
title: Monetisation
aliases: [Energy Packs, Premium, Never for sale, Faction Reset token, Payments, Stripe]
tags: [business, energy, post-mvp]
status: designed
slice: "none: not part of the slices; Stripe after the MVP"
gdd: ["§15.2", "§23", "§22.4"]
adrs: []
updated: 2026-10-14
---

# Monetisation

## In one paragraph

Irongate plans to earn money from **Energy Packs**, a monthly **Premium** subscription and a paid
**Faction Reset token**, and promises that **nothing political is ever for sale**: no votes,
Political Capital, influence, offices, stats or XP. The design learns from eRepublik, "widely
said to have declined because money could buy power". Monetisation is in the GDD only: it is not
part of any slice, and payments (Stripe) come after the MVP.

## How it works

- **Energy Packs** ([[GDD#23.1 Energy Packs|GDD §23.1]]): Small 25 Energy $0.99 · Medium 60 $1.99 · Large 120 $3.49. **At most 120 purchased Energy per City Day**, Premium's daily pack included. The v3.0 Weekly Bundle (300 Energy) is removed because it got around the cap. See [[Energy]].
- **Premium, $9.99 a month** ([[GDD#23.2 Premium ($9.99/month)|GDD §23.2]]):
  - Energy cap 120 (the base is 100);
  - one free Large Pack a day (inside the daily cap);
  - the season's premium track (**cosmetic only**; [[Political Seasons]]);
  - profile cosmetics (badge frame, title suffix, colour theme);
  - priority support and beta access.
  - *Remote Work for Tier I–II jobs* was retired with the shift (§9); "a replacement perk is open". The v3.0 *Premium Mission* (+50 % XP, no Energy) was removed because it let players buy progress.
- **Never for sale** ([[GDD#23.3 Never for sale|GDD §23.3]]): votes, PC, influence, offices, endorsements, Favour, Legacy, stats, XP, Party XP, Heat reduction, record clearance. Repeated in [[GDD#15.2 Integrity rules|§15.2]] and the moderation policy ("nothing offered for a vote, a backing or a signature").
- **Faction Reset token** ([[GDD#23.4 Faction Reset token|GDD §23.4]]): paid. Switching faction **vacates your offices, resets your tenure, and halves your PC**. After a switch a member needs **7 days** in the new faction to vote or back and **14 days** to stand (§15.2). The prologue's faction choice tells the player *a Faction Reset token is the only way back* ([[design/review-5-answers|review 5 answers]]).

## Where it lives

**Rules:** [[GDD#23. Monetisation|GDD §23]] · [[GDD#15.2 Integrity rules|GDD §15.2]] (tenure after a switch) · `docs/IMPLEMENTATION_PLAN.md` ("Payments: Stripe, after the MVP · Monetisation isn't part of the slices"; the premium cosmetic track and Stripe listed post-MVP) · [[design/slice-3-politics|slice 3 design]] (tenure pinned)

**Code:** none. No packs, premium flag, payment or faction-switch code exists. The 100 Energy cap is in `packages/rules` ([[Energy]]).

## Status

- **Designed in the GDD only; not scheduled in any slice.** No design doc or tech spec covers purchase flows, the Premium flag or the faction switch itself.

## Decisions

- The Weekly Bundle and the Premium Mission were removed in v3.1 (pay-for-progress).
- Remote Work retired with the shift (§9).

## Open questions / drift

- Premium's replacement perk for Remote Work is open (GDD §23.2).
- How the Faction Reset token works in play (where it is bought, what happens to a home, a residence, a council candidacy that "cannot move until the result", Ambition progress) is not designed.

> [!note] Inference
> GDD §23.1's 120-a-day cap and Premium's cap of 120 interact with Rested and the regen overflow rule ([[Rested]]); no source works through that interaction.

## Related

[[Energy]] · [[Political Seasons]] · [[Offices]] · [[Political Capital]] · [[Moderation and Fair Play]] · [[Iron Marks and the Economy]]
