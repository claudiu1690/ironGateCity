# ADR 0054 — The exposé: a three-step story at the press, with its own pointer, a keyed check, and the swing in the name's town

**Status:** accepted (slice 8, built 17 Oct 2026; applies ADR 0013) · **Date:** 2026-10-04

## Context

Design §4.5: at a `press` place, a Case File with a political or criminal line becomes an exposé. Step 1 chooses the file and the angle (*the facts, plainly*: the swing goes to Neutral; *the story, with a headline*: half to your party, half to Neutral, a point harder). Step 2 is one check (18 / 16 / 14 by the file's weight, +1 for the headline, +2 in the capital's and Clearwater's papers) with three ways. Step 3 is the result: −1.0 / −0.5 against the name's party in the name's town, XP, Party XP, Iron, +5 Political Capital, Legacy +2, the front page with the author's name; a Failure keeps the file. One a day; resumable; the name burned for 14 days.

ADR 0013 decided that stories share one view model and one screen, each flow being a small service, and to revisit when a third flow arrives. The chapter is stored in `characters.ambition`.

## Decision

1. **A pointer of its own**, `characters.expose { fileId, angle, locationId, day }`, set once at step 1 (no Energy, no key, filtered on `expose: null`), so a reload resumes at step 2 and an Ambition in progress is untouched.
2. **Step 2 is a game action** (`actionLogs` kind `expose`, ADR 0002) through ADR 0013's shared retry helper. One transaction writes the character (Energy, Rested, rewards, PC, `today.expose`, the burn, `expose: null`), the file (`held → spent`, or kept on a Failure), the name's meter, the ledger and contributions (the actor's leg only, ADR 0034), Issue points when tagged, the Legacy row and the log.
3. **The swing lands in the name's town** (its district in the capital), wherever the paper is. *The headline* uses `applyAgainst`; *plainly* uses a new `applyToNeutral`; the 2-point cap applies when that town is the party's home (ADR 0034). A season twist's multiplier is a factor with no source in season 1.
4. **No run-in and no Heat**, anywhere (an exposé is legal); the rival-ground check row applies when the paper itself is on rival ground.
5. **The burn is per player** (`dossierBurns[]`, 14 days), written by the exposé and by the Headline Story's attached file.
6. **No story interpreter.** The exposé, the chapter and the origin keep their own small services; they share `StoryScreenView`, the screen and the keyed check.

## Consequences

- A player can hold a chapter and an exposé in progress at once.
- The front page is a stored headline from the log; the public line in other readers' papers is a live read of yesterday's logs.
- A burn shared across players (a scoop) would need a shared document; it is not built (the designer's question).
