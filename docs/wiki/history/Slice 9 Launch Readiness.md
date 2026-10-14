---
type: history
title: Slice 9 Launch Readiness
aliases: [Slice 9, Launch readiness]
tags: [slice, designed]
status: designed
dates: 2026-10-04 (designed); not built
commits: [b1ce711, a1d5975]
gdd: ["§3.3", "§3.7", "§7.3", "§14.2", "§15.2", "§16.2", "§26", "§27"]
adrs: ["0059", "0060", "0061", "0062", "0063", "0064", "0065", "0066", "0067", "0068", "0069", "0070", "0071", "0072"]
updated: 2026-10-14
---

# Slice 9 Launch Readiness

**Status: designed only, not built.** Designed on 4 Oct 2026. The hosting part is deliberately last: the user wants everything worked on and playtested **locally until the end**.

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 9 — Launch readiness|the plan]]: a balance pass against telemetry (GDD §27), anti-abuse (one account per person, network checks, the 24 h election audit), moderation tools for chat and names, performance, accessibility and onboarding polish, then a closed and an open beta.

- **Question:** are the day-7 and day-30 retention targets within reach?

## What is planned

- **Telemetry**, first-party, in our own database: player-days, sessions, classic Day-N retention with the rolling figure beside it ([[adr/0059-telemetry-first-party-events-and-player-days|ADR 0059]]). See [[Checks and Testing]].
- **A balance pass**: a simulation of the first 30 days; one new rule, **opinion damping** (`clamp(20 ÷ active, 0.25, 1)`), the identity below twenty contributors ([[adr/0068-opinion-damping-from-a-seven-day-ring-on-the-place|ADR 0068]]). See [[Influence and Opinion]].
- **Anti-abuse** ([[Moderation and Fair Play]]): device and network sightings, sign-up caps (two a device, three a network a day), linked accounts' votes counted once, silently, at the count; a national audit that confirms itself at day 0 ([[adr/0060-network-sightings-device-cookie-and-signup-caps|ADR 0060]], [[adr/0061-linked-accounts-count-once-at-every-count|ADR 0061]], [[adr/0062-the-national-audit-self-confirms-and-council-recounts|ADR 0062]]).
- **Moderation**: a four-reason report, a name filter, rename once every 30 days, the ladder (note · mute · suspend · close) that never touches anything owned, a moderator console, closing an account with erasure ([[adr/0063-moderation-state-on-the-user-roles-and-the-log|ADR 0063]] to [[adr/0067-closing-an-account-retirement-and-erasure|ADR 0067]]). See [[Auth and Accounts]].
- **Polish**: *While you were away* after two days ([[adr/0071-while-you-were-away-built-at-read|ADR 0071]]), a purpose line on every screen, empty states, Settings (motion, text size, night map, clouds, chat), WCAG 2.2 AA and performance budgets checked with Playwright and axe ([[adr/0070-performance-and-accessibility-checks-with-playwright-and-axe|ADR 0070]]); request guards ([[adr/0069-request-guards-in-process-rate-limits-and-maintenance|ADR 0069]]).
- **The beta plan**: 150–300 testers over six weeks, gates D7 ≥ 30 % to open, D7 ≥ 35 % and D30 ≥ 20 % to launch.
- **The hosting step**, only at the very end: a 17-item checklist and the production topology ([[adr/0072-production-topology-for-the-hosting-step|ADR 0072]]).

## Documents

- Design: [[design/slice-9-launch|design/slice-9-launch]] (§16 points for the user, §17 settled) and [[design/slice-9-screens|design/slice-9-screens]].
- Tech design: [[tech/slice-9|tech/slice-9]].
- ADRs: [[adr/0059-telemetry-first-party-events-and-player-days|ADR 0059]] to [[adr/0072-production-topology-for-the-hosting-step|ADR 0072]].
- GDD: [[GDD#27. Key metrics|GDD §27]], [[GDD#15.2 Integrity rules|GDD §15.2]], [[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]].

## Decisions made

- Twelve **points for the user** with defaults (design §16), among them: telemetry in our own database (no third party); linked ballots count once, silently; the audit confirms itself; renames every 30 days; an age line of 16+; the beta gates a little under §27's 38 / 22. No explicit answer is recorded.
- GDD Appendix C #7 (chat moderation) and #13 (opinion swing at scale) were **closed** by this design.
- The second Appendix C #61 was renumbered **#89**.

> [!warning] Drift
> The plan puts the closed and open betas inside slice 9, which needs a hosted game; the user's "local until the end" decision moves hosting to the very end. Knock-ons from [[tech/review-4|tech/review-4]] §20, [[tech/review-5|tech/review-5]] §18 and [[tech/voting-rework|tech/voting-rework]] §17 are recorded but **not yet applied** to [[tech/slice-9|tech/slice-9]]. Since 8 Oct the project runs **no Vitest** (Playwright only), while this tech design plans Vitest checks.

## QA and leftovers

Not built, so no QA. Open defaults: GDD Appendix C #82–#88 (see [[Open Questions]]).

## Commits

`b1ce711` design (4 Oct) · `a1d5975` tech design, ADRs 0059–0072, Appendix C renumbering (4 Oct).

## Related

- Previous: [[Slice 8 A Life in the City]]
- After the MVP (plan): ministers, bodyguards, first class and cars, more homes, Legacy perks, Season Twists, a premium track, more patrons, counter-demonstrations, trading. See [[Ministers]], [[Bodyguards]], [[Monetisation]].
