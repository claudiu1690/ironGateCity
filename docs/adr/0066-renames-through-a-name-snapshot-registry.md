# ADR 0066 — Renames rewrite every denormalised name through a registry guarded by a schema-walk test; printed editions keep the old name

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Design §5.4 (GDD §7.3) sets the rename rules:

- a player may **change their name once every 30 days**, and "the HUD, lists, the count and the ledger show the new name at once; **editions already printed keep the old one**";
- a moderator may **require** a change, and until it is done the name reads ***A Newcomer*** everywhere;
- closure ends in erasure, and the name becomes ***A former member*** on every list (design §5.5).

Slices 3–8 **denormalise player names** into many documents read by live views: candidacies and their endorsements, stored counts, contributions, Issue top fives, awards, event rosters, stays (bail), the Chair and the government, bills and petitions, chat author snapshots, Hall of Fame entries. The design's default ("every live view reads the character's name") would mean rewriting those views across eight slices.

## Decision

1. **`NAME_SNAPSHOTS`** in `packages/db` lists every denormalised copy: the model, the path, the path of the character id beside it, and its scope.
   - `live`: rewritten on every rename.
   - `record`: rewritten only by a forced rename and by erasure. The Hall of Fame and Legacy params are records.
2. **`renameEverywhere(session, characterId, name, scope)`** runs inside the rename's transaction, with the character's name, `nameWords`, `renamedDay` and the user's name.
3. **A schema-walk test** fails when any schema has a `name` path beside a `characterId` that is in neither the registry nor an explicit not-a-player list. A new slice cannot forget its snapshot.
4. **Printed text** (stored edition headlines, national lines) is left alone for one's own change. A forced rename and an erasure run **`scrubPrinted`** after the commit: a batched, word-bounded replacement.
5. **A forced rename** writes *A Newcomer* through the registry at once. The client shows the rename sheet before any route, and the player's own change then writes the new name the same way.

## Consequences

- Live views keep reading their snapshots, so no slice 3–8 view changes.
- A rename's transaction touches a bounded set: the character's own rows in each registered collection.
- An abusive or erased name does not survive in print. One's own old name does, as the design wants.
- The registry is one more thing each slice maintains, and the test makes that impossible to skip.
