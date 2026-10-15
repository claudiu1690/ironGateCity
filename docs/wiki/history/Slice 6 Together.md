---
type: history
title: Slice 6 Together
aliases: [Slice 6, Together]
tags: [slice, building]
status: building
dates: 2026-10-03 (designed); 2026-10-15 (defaults approved, build started)
commits: [b756c48, 8173e3e]
gdd: ["§3.3", "§6.5", "§13.7", "§14.5", "§16.2", "§16.3", "§19.1", "§19.2"]
adrs: ["0036", "0037", "0038", "0039", "0040", "0041", "0042"]
updated: 2026-10-15
---

# Slice 6 Together

**Status: building.** Design and tech design were done on 3 Oct 2026, one slice ahead. On 15 Oct 2026 the user approved the seven defaults of design §19 and phase A of the build started.

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 6 — Together|the plan]]: Campaign Events (scheduling, roles, sign-up as commitment, automatic resolution), faction chat and presence over WebSockets, the Faction HQ screen, and favours between players (posting bail, hospital visits).

- **Question:** do players feel part of a team, and do they come back for the group's events?

## What is planned

- [[Campaign Events]]: Poster Night, Canvass Drive, Rally, Grand Rally, General Strike, Headline Story. A Rank 3+ member calls one 1–12 hours ahead at a fixed venue; others sign up for a role with one tap. **Signing up is the commitment**: the event resolves at its time whether you are online or not. One roll per role, banded Triumph / Success / Mixed / Fiasco. The secretary calls a daily fixture that resolves at the day's turn. Roster and sign-ups: [[adr/0036-campaign-events-roster-signups-and-natural-limits|ADR 0036]], resolution: [[adr/0037-event-resolution-world-first-credit-on-read|ADR 0037]].
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
- No QA yet.

## Decisions made

- **15 Oct 2026, the user: all seven points for the user approved as written** (design §19): hands at Rank 1, the fixture at the day's turn, no Iron from events, Political Capital halving after the first event of the day, visits from anywhere but rival ground, the Headline Story without a Case File until slice 8, chat with mute and report only (full moderation in slice 9). No number moved. Recorded in GDD §0 (15 Oct) and Appendix C #57, #59, #60, #89; [[Decision Log]].
- Settled with the architect (3 Oct): rolls seeded per event by a secret seed; the Grand Rally's *Steward* roles renamed *Ushers*; three chat channels per faction.

> [!warning] Drift
> The plan still calls the screen "Faction HQ"; the design calls it the **Faction tab**.

## QA and leftovers

Building; no QA yet. The approved defaults and the design's other slice-6 defaults (three starts a day, volunteers at half strength, presence hidden on rival ground: Appendix C #58, #62, #63) are watch items in [[Open Questions]].

## Commits

`b756c48` slice 6 design (with the slice 5 tech design, 3 Oct) · `8173e3e` tech design and ADRs 0036–0042 (3 Oct).

## Related

- Previous: [[Slice 5 Risk]] · Next: [[Slice 7 The Nation]]
