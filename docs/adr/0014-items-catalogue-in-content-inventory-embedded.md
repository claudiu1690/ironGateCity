# ADR 0014 — Items are a content catalogue; inventory and equipment are embedded with instance ids; worn CHA is computed on read

**Status:** accepted (slice 2; amends plan §5 row 2) · **Date:** 2026-09-29

## Context

GDD §8.2: Charisma is worn, the sum of equipped items plus the origin's CHA base (0–4). §21.4 pins the slice-2
catalogue: three Tier I faction outfits (CHA 2), the father's coat (CHA 5, plain or as a keepsake), the party card
(document slot) and three chapter keepsakes with no slot. The plan's data table lists an `items` (catalogue)
collection, `inventory[]` and `equipment {slot: itemId}` on the character.

ADR 0003 already keeps static definitions in `packages/content` and only live state in MongoDB. An item definition
(name, slot, tier, CHA, keepsake flag, art) is static. Crafting (§21.3: combine two items of the same type) and
duplicates will exist later, so "one entry per item id" won't hold forever.

## Decision

- **Catalogue as content**, not a collection: `items[]` in `packages/content`, Zod-validated, referenced by id from
  faction kits, origin effects and chapter keepsakes. No `items` collection (the plan's §5 row 2 changes).
- **Embedded state:** `characters.inventory: [{ uid, itemId, day, source }]` and
  `characters.equipment: { clothing: uid | null, document: uid | null }`. Equipment points at an **inventory
  instance** (`uid`, an ObjectId hex string), not at a catalogue id, so two coats or a crafted copy never need a
  migration. Slots other than clothing and document are added with the Wardrobe (slice 8).
- **Keepsakes** (`keepsake: true`) are unique per character: `grantItem` in rules never adds a second one, and no
  code path removes one.
- **Worn CHA is computed on read**, like the lazy timers: `wornCha(chaBase, equipped)` in rules;
  `wornStats(doc, content)` on the server is the only place checks, job requirements and views get `cha` from. It is
  never stored.
- Inventory and equipment are written whole with `$set` inside the character's version-guarded update, as
  `localStanding` and `orders` are.

## Consequences

- A new item is a content change; worn CHA can never drift from what is equipped.
- `stats.chaBase` changes meaning from slice 0's stand-in (2) to the origin base (0–4); migrated characters get
  `chaBase: 0` and the mill work coat worn, so their CHA stays 2 (ADR 0016).
- Queries such as "who owns item X" need a multikey index on `inventory.itemId` when a feature asks; none does yet.
