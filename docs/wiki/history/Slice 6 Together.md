---
type: history
title: Slice 6 Together
aliases: [Slice 6, Together]
tags: [slice, qa]
status: built, QA'd, fixed
dates: 2026-10-03 (designed); 2026-10-15 (defaults approved, built through phase C, QA'd, fix round)
commits: [b756c48, 8173e3e]
gdd: ["§3.3", "§6.5", "§13.7", "§14.5", "§16.2", "§16.3", "§19.1", "§19.2"]
adrs: ["0036", "0037", "0038", "0039", "0040", "0041", "0042"]
updated: 2026-10-15
---

# Slice 6 Together

**Status: built, QA'd, fixed.** Design and tech design were done on 3 Oct 2026, one slice ahead. On 15 Oct 2026 the user approved the seven defaults of design §19; phases A–C were built the same day (`3c34cc9` closes phase C), QA reported no blocker or major (`8c06e48`), and the fix round closed its findings the same day. How to play it: [[review/slice-6-build-notes|slice 6 build notes]]. The designer's phase C rulings (the Doorstep Drive rename, swing precision, the two phase-B defaults) are in [[design/slice-6-together#22. Slice 6 copy (15 Oct 2026; phase A's questions answered)|design §22]] #9–12.

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 6 — Together|the plan]]: Campaign Events (scheduling, roles, sign-up as commitment, automatic resolution), faction chat and presence over WebSockets, the Faction HQ screen, and favours between players (posting bail, hospital visits).

- **Question:** do players feel part of a team, and do they come back for the group's events?

## What is planned

- [[Campaign Events]]: Poster Night, Doorstep Drive, Rally, Grand Rally, General Strike, Headline Story. A Rank 3+ member calls one 1–12 hours ahead at a fixed venue; others sign up for a role with one tap. **Signing up is the commitment**: the event resolves at its time whether you are online or not. One roll per role, banded Triumph / Success / Mixed / Fiasco. The secretary calls a daily fixture that resolves at the day's turn. Roster and sign-ups: [[adr/0036-campaign-events-roster-signups-and-natural-limits|ADR 0036]], resolution: [[adr/0037-event-resolution-world-first-credit-on-read|ADR 0037]].
- **Hands**: any Rank may take one of four 5-Energy places with no roll, so the first event can be on day 1.
- **The Faction tab**: orders, the events board, members, the faction scoreboard (this week and all time, [[adr/0042-faction-scoreboard-scoped-totals|ADR 0042]]), chat.
- [[Chat and Presence]]: Party, home-branch and Irongate-branch channels; 280 characters; mute and report only (moderation tools in slice 9). Socket.IO push, tRPC writes ([[adr/0038-chat-socketio-push-trpc-writes-change-streams|ADR 0038]], [[adr/0039-chat-storage-limits-and-system-lines|ADR 0039]]). Presence is "seen in the last ten minutes", invisible on rival ground ([[adr/0040-presence-embedded-unversioned|ADR 0040]]).
- [[Patronage and Favours|Favours]]: a mate posts your bail from anywhere (+10 Party XP); a visit on the ward is 3 Energy from anywhere but rival ground ([[adr/0041-favours-across-two-characters-one-release-path|ADR 0041]]). [[Review 4]] adds *Post bail* to the *In the cells now* list.
- Events pay no Iron; Political Capital from events halves after the first of the day.

## Documents

- Design: [[design/slice-6-together|design/slice-6-together]] (§19 points for the user, §20 settled, §21 review-4 addendum) and [[design/slice-6-screens|design/slice-6-screens]].
- Tech design: [[tech/slice-6|tech/slice-6]]. Updated 14 Oct 2026: the knock-ons from [[tech/review-4|tech/review-4]] §20, [[tech/review-5|tech/review-5]] §18 and [[tech/voting-rework|tech/voting-rework]] §17 are applied (dated notes at the end); the planned migration is now `010-slice6-together` (§5.6, was 008). The ledger-for-losses choice from [[adr/0028-influence-ledger-contributions-and-awards|ADR 0028]]'s amendment is a slice-6 decision (§22.1).
- ADRs: [[adr/0036-campaign-events-roster-signups-and-natural-limits|ADR 0036]] to [[adr/0042-faction-scoreboard-scoped-totals|ADR 0042]].
- GDD: [[GDD#16.3 Campaign Events (new)|GDD §16.3]], [[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]].
- QA: [[qa/slice-6-report|qa/slice-6-report]].

## Decisions made

- **15 Oct 2026, the user: all seven points for the user approved as written** (design §19): hands at Rank 1, the fixture at the day's turn, no Iron from events, Political Capital halving after the first event of the day, visits from anywhere but rival ground, the Headline Story without a Case File until slice 8, chat with mute and report only (full moderation in slice 9). No number moved. Recorded in GDD §0 (15 Oct) and Appendix C #57, #59, #60, #89; [[Decision Log]].
- Settled with the architect (3 Oct): rolls seeded per event by a secret seed; the Grand Rally's *Steward* roles renamed *Ushers*; three chat channels per faction.

> [!warning] Drift
> The plan still calls the screen "Faction HQ"; the design calls it the **Faction tab**.

> [!success] Drift closed (15 Oct 2026, review 7 #1)
> Screens §2 asked for the HQ scene behind the header; the build had a plain ink band, three ink bands
> under the HUD and 1.69:1 tab dividers. The Branch Office replaced it and
> [[design/slice-6-screens#2. The Faction tab (route `/faction`)|screens §2]] now describes the build.

## Phase A built (15 Oct 2026)

T1–T7 of [[tech/slice-6|the tech spec]] §20: the rules (events, presence, chat, favours, the scoreboard's scopes, the views and error reasons), the content (six event types, 30 venue rows, the fixture rotation, the loader's checks), the two event scenes, and the db (`campaignEvents`, `eventSignups`, `chatMessages`, `chatReports`, `chatLimits`, the character's new fields, migration `010-slice6-together`). Checked with throwaway scripts under the user's no-unit-test rule and the fast check; details and deviations in the tech spec's **Deviations**.

- **Ledger choice: (b)**, the ledger stays an attribution log (no slice-6 screen shows losses per party); see [[Influence Ledger and City Hero]].
- Moved to later phases: the three event orders join the rotation in T10; the paper's event headlines (T15) and the copy (T18–T23).
- For the designer: the venue table has 30 rows where the text says 27; the alt texts of the two scenes still want a look against the pictures.

## Phase B built (15 Oct 2026)

T8–T16 of [[tech/slice-6|the tech spec]] §20 in one commit, `21929a7`: the read path v6 (due events resolved and credited, presence), the Faction tab's reads and the faction scopes, calling, signing up and withdrawing, the resolution (job, lazy paths, the city day's catch-up and the fixtures), the credit and the modals, favours, chat with the Socket.IO push socket, the paper's event parts and headlines, the test hooks. The designer's copy (`55d14b7`) is bound. T17's integration suite is a throwaway scratch script (58 checks pass, not committed). Deviations in the tech spec: `events.callEvent` (tRPC reserves `call`), the slot guard by `$elemMatch`, no morale record at resolution, `/api/test/member-held`.

## Phase C, lane B (15 Oct 2026)

T21–T23 of [[tech/slice-6|the tech spec]]: the Members list (search, pages, bands and status, *Post bail*, *Visit*, *Ask to join*), the profile (mute, *Message*), the faction scoreboard (this week and all time, the city chips, the top ten per bracket with rosettes, your row), chat (three channels, live over the socket, the composer and its limit lines, system lines with buttons, report, mute, *New lines ↓*, the desktop column, Me's switch), *Post bail* on *In the cells now*, the paper's *Events* row and desk's *Signed up*, the held screens' visitors, bail and sign-up lines. Server fixes: the chat limit's detail (`why`), `nameWords` for new characters (search), the mate's bail on the cells' rows. E2E `faction` and `favours` pass. Deviations in the tech spec (*Phase C, lane B*).

## Phase C, lane A (15 Oct 2026)

The `/faction` shell (commit `ce0e52b`, first, so lane B could fill its parts), then T18–T20 (`fc5065d`): the event components in `packages/ui`, Orders with the branch's event, the Events board, the event page in every state, the call sheet's three steps, withdrawal, the event gate in the shell (results and *Called off*), the venue's tickets, *Here now*, the plate's count, the journey's fellows line and the dev panel's *Together* buttons. T24 (`801514f`, `97fe0db`): `events.spec.ts` in its own project, an on-screen sweep for the slice-6 words, the playtest report's *together* section (test members left out by the `test:` prefix), the full e2e run and its fixes. Deviations in the tech spec (*Phase C, lane A*). Screenshots in `docs/qa/slice-6/`.

## QA and leftovers

QA run 15 Oct 2026 ([[qa/slice-6-report|report]]): **no blocker or major bug.** The numbers match (Party XP and Political Capital by band, the second event of the day at half, no Iron, a hand's 5 Energy, the withdraw refund and its overflow into Rested, the last hour refused); three events settled while away came back in start order after the release modal; double taps on Call it, Withdraw, Post bail, Visit and chat are one effect. Minor: **m1** a concurrent same-key *Join* can answer *already on this event*; **m2** `/faction` shows no release modal while a released stay is unseen (the results wait; only `/` redirects to the held screen). The `qa-voting` tie test was a race in the test (fixed), not a bug. New e2e project `qa-together`. The approved defaults and the design's other slice-6 defaults (three starts a day, volunteers at half strength, presence hidden on rival ground: Appendix C #58, #62, #63) are watch items in [[Open Questions]].

## Commits

`b756c48` slice 6 design (with the slice 5 tech design, 3 Oct) · `8173e3e` tech design and ADRs 0036–0042 (3 Oct) · `f7657d9` T1–T3 rules · `b58f48d` T4–T6 content and art · `9ad2b25` T7 db and the phase-A notes (15 Oct) · `55d14b7` the designer's copy · `21929a7` T8–T16 the server · `ce0e52b` T19a the Faction tab shell · `fc5065d` T18–T20 events on the client · `27b4c26` T21–T23 lane B · `801514f`, `97fe0db` T24 e2e and the report.

## Related

- Previous: [[Slice 5 Risk]] · Next: [[Slice 7 The Nation]]

## Fix round (15 Oct 2026)

QA's findings ([[qa/slice-6-report|report]]) and the designer's code items (design §22 #9–10):

- **m1, a concurrent same-key *Join*** answered `ALREADY_ON_EVENT` when a copy of the tap committed between the character read and the event read. `signUpEvent`'s pre-check refusals now return the winner's stored tap when there is one, and `assertKeyFree` (`apps/server/src/services/keyGuard.ts`) also looks in `eventSignups`. Reproduced on the old code with jittered bursts; on the new code 2 × 40 bursts of three gave one charge and identical bodies.
- **m2, the release on `/faction`**: `HeldReleaseGate` (`apps/client/src/features/street/HeldReleaseGate.tsx`) in the shell shows an unseen release on every screen but `/held`, before the event results and the orders-complete note. Playwright: `favours.spec.ts`.
- **m3, withdrawal**: one tap and a line, approved by the user (short sessions).
- **Clarity**: the board card's *settles at 19:40* opens a new *Settles at* note (then *Campaign event*); a Recruit's *Organisers and above can call events; anyone can join one.* opens *Campaign event* and *Hands*.
- **The paper's swing** trims like `formatSwing` (*+1*, *+0.8*); the review-4 sweeps no longer allow *canvass drive*; the tech docs say 30 venues and the Doorstep Drive.
- **Still open**: what QA did not cover ([[Open Questions]] S6-4) and the manual playtest question.

## Review 7 (15 Oct 2026)

The user's Design Review 4 notes on this build ([[Review 7]]): **the word filter** (refuse and mask tiers, design §23.1), **the invite** naming its event and hidden when there is nothing to ask (design §23.2), the event page's *Invite someone*, and the dev panel's **Give 2,000 Iron** for testing bail. The Faction tab's redesign (note #1) is built as direction A, *the Branch Office* (paper from the HUD down, the HQ scene as a plate, the crest as a seal, a ruled strip with a three-cue current part, chat's channels as paper chips).
