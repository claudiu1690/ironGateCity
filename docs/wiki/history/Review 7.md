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
(`14e62fd`); the developer built #2 and #3.

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

Note #1 (the Faction tab's look, black on black) is with the designer as a redesign proposal; nothing
built yet.

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
  - The refuse phrases: Hitler, Nazi/NSDAP, Mussolini, *sieg heil*, *heil*, *white power*,
    *third reich*/*reich*, KKK, *blood and soil*.
  - Communist-bloc leaders are not on the list.
  - The user reviews the lists before the closed beta (ADR 0064).
- **Inferred:** when the mate is already invited to the soonest event, the row shows *Invited to the
  {event}* (plain text) rather than moving on to a later event; the design's "until the event starts".
- Leftover: an invite line stored before this change has no venue and reads *at , 19:40*. These
  are dev data only, and they expire after seven days.

## Related

[[Review 6]] · [[Slice 6 Together]] · [[Chat and Presence]] · [[Moderation and Fair Play]] ·
[[Decision Log]] · [[Run a Design Review Round]]
