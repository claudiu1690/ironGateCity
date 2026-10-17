# ADR 0052 — Personal modifiers: what you wear and your lasting perks beside the place's sources; recognition on rival ground

**Status:** accepted (slice 8, built 17 Oct 2026; beside ADR 0030 and 0044) · **Date:** 2026-10-04

## Context

Slice 8 adds bonuses that belong to the **player**, not the place (design §3.2, §3.6, §7.2):

- **items**: `chancePct` 5–10 on one kind of work (a tier-1 type, a mission type, the checkpoint, talking your way out, the exposé), `fxpPct` 5 (the party coat, the badge), `dossierChance` 5–15;
- **Legacy perks**: +5 % Party XP, +1 Dossier slot, Rested cap +50, canvassing −1 Energy, +1 to the home count a level, a Monday day's pay, Favour ×1.1, Heat cooling +10 %;
- **recognition** on rival ground: worn Charisma 20–29 +5, 30+ +10; the highest office +5 / +10 / +15; doubled at night; +1 per 10 Legacy (at most +5); plain clothes (Charisma under 10) remove the Charisma part and halve the office part.

ADR 0030 made the place's ordinance and Issue effects named `ModifierSource`s; ADR 0044 added laws with `appliesTo`. A place source's `chancePct` names an action type, and a mission is matched by the type it is *seen as* (a surveillance mission as `intelligence`). The press pass gives +10 on `intelligence` **and** on `surveillance`; keyed by *seen as*, a surveillance mission would get +20.

## Decision

1. **`PersonalModifiers { worn, perks }`**, built once per request on `LoadedCharacter`, beside `PlaceModifiers`. Not new `ModifierSource` kinds.
2. **Item effects are a closed DSL** of three kinds with `ITEM_EFFECT_BOUNDS` in rules, enforced by the content loader (at most one `chancePct` per kind of work; no Energy, Iron, Rested or opinion kind exists).
3. **An item's `chancePct` matches the act's own type**: a tier-1 action's type, a mission's own type (never its *seen as*), or the special works `checkpoint`, `bluff` (with `against: 'police'` for forged papers) and `expose`.
4. **Each effect is a named line**: a check row `{ id: 'item:{itemId}', label }` (the ticket's tag *{Item} · better odds*), a Party XP part on the base (*Steward's jacket +5 %*), the Dossier chance's addition. Perks are named the same way (`perk:party`).
5. **Scope:** tier-1 actions and missions (society calls included). Not chapters, event roles or the exposé's fixed rewards; the exposé's check takes its `expose` rows.
6. **Perks that change a lazy rate re-base at the tap** (ADR 0030 §5): the Rested cap (Energy) and Heat's cooling (Heat).
7. **Recognition is pure** (`recognition()`), from worn Charisma, the night at the act's time, the highest **current** office (the `offices[]` projection) and `legacy.total`; night doubles the Charisma and office parts; it is **added to the run-in chance on rival ground** before the 0–90 clamp. The client gets a word (*Recognised · run-ins likelier* / *Plain clothes · unnoticed*), never the figure. Presence stores `recognised` (unversioned, ADR 0040) at each touch, so a recognised visitor is counted by the home faction.

## Consequences

- An item tag and a council rule's tag look the same on a ticket and in the breakdown, from two small lists.
- The place DSL keeps its *seen as* rule; the personal DSL has its own, tested apart.
- Recognition costs no read: everything it needs is on the character.
- A later Well-Fed buff or a bodyguard is another personal kind, not a place source.
