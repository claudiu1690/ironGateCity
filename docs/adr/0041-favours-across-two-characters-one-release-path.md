# ADR 0041 — Favours: one transaction over the two characters and the stay; a mate's bail ends the stay now and slice 5's release path releases on read

**Status:** accepted (slice 6, built 15 Oct 2026) · **Date:** 2026-10-03

## Context

Slice 6 adds favours (`docs/design/slice-6-together.md` §9, GDD §19.1–§19.2).

- **Posting bail:** any member of the prisoner's faction, from anywhere, pays the prisoner's own bail figure. The prisoner is released at once (Heat 25; on rival ground, deported), and their release modal reads *bail posted by {name}*. The payer gets +10 Party XP. Once per sentence.
- **A visit:** 3 Energy, from anywhere but rival ground, not held or in transit. The patient gets +10 Health and five minutes off the stay, once per visitor per stay, three counting, never below five minutes. The visitor gets +10 Party XP.

Slice 5 (ADR 0033) built the cells and the infirmary as `held` on the character plus a `stays` document, with `bailPostedBy` and `visits` left empty for this slice. Release happens on read, as of `until`, through one function that sets Heat 25, starts a deportation journey on rival ground, and stores the release modal. The prisoner pays their own bail through a keyed act on that same function. ADR 0033 §4 left a tidy release job to slice 6 "if presence or a mate's bail needs it".

A favour changes two characters. Unlike a Campaign Event's crediting (ADR 0037), the act is one player's tap and its effect on the mate must be immediate and exact.

## Decision

1. **One transaction per favour, with a request key** (`favours.postBail`, `favours.visit`; ADR 0008):
   - the payer or visitor: version, `'day.settled': today`, Iron or Energy (no Rested drawn for a visit), +10 Party XP through `applyGains`, the tally;
   - the stay: guarded by `releasedAt: null` and, for bail, `bailPostedBy: null`, or for a visit the visitor absent from `visits`;
   - the mate: guarded by `held.stayId`, `held.state: 'in'`, `held.until > now`, and the version;
   - a chat line (ADR 0039).

   The mate must be of the payer's faction. Nothing moves between accounts: the payer's Iron leaves the game.
2. **Bail by a mate does not release in the payer's transaction.** It records `bailPostedBy { characterId, name, at, iron }` on the stay and sets the stay's and the pointer's `until` to now. The prisoner's next read releases them through slice 5's `ensureReleased`, **as of that moment**, with `how: 'bailPosted'`: no Iron from them, Heat 25 at the bail time, and a deportation journey from the bail time on rival ground. The release modal names the payer.

   There is **one release path** for serving, self-paid bail and a mate's bail. A prisoner paying their own bail at the same moment conflicts on their character document, and one of the two wins.
3. **A visit** applies `visitEffect` while fewer than three visits have counted: `until` minus five minutes, but never below the stay's start plus five minutes nor below now. It applies `healHealth` (+10, the lazy timer's tick kept). Later visits are recorded but change nothing. The patient's ward lists the visitors; a visit that moves `until` to now is discharged by the patient's next read.
4. **Still no release job.** Views project `held` lazily (ADR 0040): a stay whose `until` has passed reads as out everywhere, so nothing another player reads depends on the release being written early.

## Consequences

- Favours are exact and immediate in every view, though the prisoner's documents are written on their next read. The modal, the paper and the Heat all date from the bail.
- Slice 5's release code gains one `how` and a modal line, and no second release implementation.
- A favour writes another player's character once, under that character's version guard. It may make that player's own concurrent act retry, which is acceptable for a rare, deliberate tap.
- The payer's paper reads stays by `bailPostedBy.characterId` (a partial index); the patient's reads their stay's `visits`.
