---
type: history
title: Review 7
aliases: [Review 7, Design Review 4]
tags: [review, built]
status: built
dates: 2026-10-15
commits: []
updated: 2026-10-15
---

# Review 7

The user's notes of 15 Oct 2026 on slice 6 "Together" (build `2be93a0`). **In the user's Notion this
is "Design Review 4"**; the repo calls it review 7 ([[review/2026-10-15-review-7|the notes and
triage]]). Three notes: the Faction tab's look (with the designer), a chat word filter, and the
Members tab's *Ask to join*. The designer's rulings are
[[design/slice-6-together#23. Review 7 rulings (15 Oct 2026; the user's Design Review 4 notes #2 and #3)|slice 6 design §23]]
(`14e62fd`); the developer built #2 and #3, then #1 as the designer's direction A, *the Branch Office*.

## Goal and playtest question

Make the branch's chat safe to leave open, and make the invite say what it is for. Playtest
question: does a swear in chat read as period colour (*b—*) rather than a scold, and does an invite
make it obvious which event a mate is asked to?

## What it added

1. **The word filter** (note #2, design §23.1), on the server before a line is stored:
   - **Refused:** slurs and real-world hate (salutes, slogans, party names and leaders). The line is
     not posted and nothing is stored; the composer keeps the draft and reads *That can't be said
     here.* (`CHAT_REFUSED`). The try still counts toward the limits.
   - **Masked:** ordinary swearing prints as its first letter and the editor's dash (*b—*), stored
     masked, so the author sees what everyone sees.
   - *Bloody, damn, hell, sod* pass. Leetspeak, symbol swaps, doubled letters and spelled-out
     letters (*s.h.i.t*) are caught.
   - **Names** at sign-up are refused on either tier: *That name can't be used here. Try another.*
     under the field.
   - *The editor* note sits under the composer.
   - Built on `obscenity` 0.4.6 (MIT) in `apps/server/src/moderation/`, with the project lists in
     `moderation/lists/` (never in `packages/content`). Every content and copy string (5,029) was run
     through the matcher once: no hits.
   - See [[Chat and Presence]], [[Moderation and Fair Play]].
2. **The invite** (note #3, design §23.2): *Ask to join* becomes **Invite to the rally · 19:40**,
   naming the soonest of your open events with a place the mate can take.
   - It is **hidden** when there is nothing to ask, when the mate is already on that event, or when
     they are in the cells or on the ward.
   - After the tap the row reads *Invited to the rally* as plain text, and a toast says *Invited.
     {name} will see it in the branch's chat.*
   - The mate's chat line names the venue (*… invites Mira Hale to the rally at Market Row, 19:40 ·
     a hand's place is open*).
   - The event page's link reads *Invite someone*, and an *Invite* note sits on the Members tab.
   - See [[Chat and Presence]], [[Campaign Events]].
3. **Dev panel: Give 2,000 Iron** (Together section), so bail can be tested without the console; the
   [[review/slice-6-build-notes|build notes]]' bail step uses it.

4. **The Faction tab as the Branch Office** (note #1, direction A of
   [[design/faction-tab-redesign|the designer's three directions]], picked by the user on 15 Oct;
   [[design/slice-6-screens#2. The Faction tab (route `/faction`)|screens §2]] rewritten to the build):
   - **Paper from the HUD down.** The HQ scene is a 128 px lithograph plate (180 px on desktop) with
     one caps line on an ink scrim, *Coalport branch · 9 here now*. The real crest SVG sits at 64 px
     (80 px) as a seal over the plate's edge, in its own shape (no round disc). The name and the
     Courier line *Organiser · 9 members* sit on paper beneath.
   - **The five parts are a ruled strip on paper.** The current part has three cues: weight 600, the
     paper-card fill, and a 3 px ink bar touching the panel, with a 2 px faction-colour line above it.
     Dividers are 1 px `muted` (5.9:1), the row's rule ink (14.4:1).
   - **Chat** folds the header to a 52 px compact letterhead; the channels are the game's paper chips.
   - **Desktop:** the plate spans the sheet; four 150 px cells left-aligned; the chat column under a
     paper-2 head, *The room*. No Chat cell on desktop or with chat hidden.
   - The designer's defaults: the plate scrolls away and the strip stays sticky; words only; the
     faction colour an accent only; the rank title kept; the Vanguard plate `scene.vanguard-office`;
     sideways phones drop the plate.
   - Code: `packages/ui/src/components/FactionHeader.tsx` (new), `FactionTabs.tsx`, `Chip.tsx` (new,
     shared with the scoreboard), `Chat.tsx`; `apps/client/src/routes/faction.tsx`,
     `features/faction/ChatTab.tsx`; `faction.hq` gains `branch` and `plate` on the server
     (`FactionHqPageView` in `factionService.ts`, `packages/rules` untouched). Copy:
     `together.plateLine`, `together.letterhead`, `together.room`.
   - After-screenshots: `docs/design/faction-tab-redesign/built-events-390.png`, `built-chat-390.png`,
     `built-desktop.png`.
5. **The refuse list** (15 Oct, the user): *Reich* is no longer refused (both *third reich* and the
   whole word removed from `apps/server/src/moderation/lists/refuse.ts`); everything else stays.

## Decisions made

See [[Decision Log]] (Review 7). The filter is brought forward from slice 9 in its simplest shape
(no flag queue, no ladder); the invite's rule is unchanged, only its wording and when it shows. No
GDD number changed.

## QA and leftovers

- Checks: `pnpm art:check` and the cached lint, typecheck and build (14 of 14). Playwright
  `faction` and `favours` 4 of 4, `events` and `dev-panel` 3 of 3, `phone`'s `arrival`,
  `qa.slice2` and `session` specs 16 of 16. The full e2e was not run this round.
- **Choices to confirm:**
  - The refuse tier counts these dataset words as slurs: *abo, abeed, africoon, arabush, boonga,
    chingchong, chink, dyke, fag, kike, negro, nigger, retard, spastic, tranny*.
  - The refuse phrases: Hitler, Nazi/NSDAP, Mussolini, *sieg heil*, *heil*, *white power*, KKK,
    *blood and soil*. **Confirmed by the user on 15 Oct:** keep *dyke*, unblock *Reich*, add nothing.
  - Communist-bloc leaders are not on the list (confirmed: no additions).
  - The user reviews the lists before the closed beta (ADR 0064).
- **The Branch Office build (15 Oct):** `pnpm art:check` ok; the cached lint, typecheck and build
  pass for every package of this change (13 of 14 tasks; `@irongate/content#typecheck` fails on the
  slice-7 agents' in-flight `data/laws.ts`, not this change). Playwright, run from a clean worktree of
  `HEAD` plus this change (the shared tree's in-flight slice-7 content does not load): `faction` 3 of 3
  (with the new layout check at 390 × 844, 375 × 667 and 1440 × 900, and *Reich* posting untouched),
  `favours` 2 of 2, `qa-together` 5 of 5, `qa-review4` 29 of 29 (the 44 px audit). `events` failed at
  the call sheet's *The branch has a rally at* because the wall clock was past 21:00 and the 3-hour
  chip lands *tomorrow 00:14*: a time-of-day flake, not this change (the spec's new plate-line check,
  before it, passed).
- **Inferred:** when the mate is already invited to the soonest event, the row shows *Invited to the
  {event}* (plain text) rather than moving on to a later event; the design's "until the event starts".
- Leftover: an invite line stored before this change has no venue and reads *at , 19:40*. These
  are dev data only, and they expire after seven days.

## Related

[[Review 6]] · [[Slice 6 Together]] · [[Chat and Presence]] · [[Moderation and Fair Play]] ·
[[Decision Log]] · [[Run a Design Review Round]]
