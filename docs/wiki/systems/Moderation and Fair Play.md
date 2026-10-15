---
type: system
title: Moderation and Fair Play
aliases: [Moderation, Anti-abuse, Fair play, Linked accounts, The audit, The 24-hour audit, Reports, Word filter, The ladder (moderation), Mute, Suspension, Closing an account, Renames, Rate limits, Sign-up caps, Content policy]
tags: [moderation, anti-abuse, launch]
status: designed
slice: "9 (designed, not built); slice 6 basics (mute, report); content policy applied since slice 2"
gdd: ["§15.2", "§16.2", "§26", "§7.3"]
adrs: ["0060", "0061", "0062", "0063", "0064", "0065", "0066", "0067", "0069"]
updated: 2026-10-15
---

# Moderation and Fair Play

## In one paragraph

Two jobs keep the game fair. **Anti-abuse** makes one person count once: sign-up caps per device
and network, **linked accounts** whose ballots, backings and signatures count once at every count,
and a **24-hour audit** on national results. It works silently: a link is never refused at the tap
and never announced. **Moderation** keeps chat and names civil: a public policy, reports, a word
filter, a ladder from a note to closure, appeals and a console for moderators. A **content
policy** keeps real-world extremism out of the game's own text. Slice 9 designs all of it; only
the content policy and the basic name rule are in the game today.

## How it works

**One account per person** ([[GDD#15.2 Integrity rules|GDD §15.2]]):
- One character per account (built). Email **normalised** at sign-up (lower case; `+tags` dropped; gmail dots dropped).
- **At most two accounts ever from one device; three per network (IPv4 /24, IPv6 /48) per City Day.** These are the only refusals a player ever sees.
- **Rate limits:** Better Auth's on sign-in and sign-up; **60 game mutations a minute per account, 600 per IP** (per API process); a miss reads *Slow down a moment.*

**Linked accounts:**
- **Linked** when they share a device (L1), or share a network on **three days in fourteen** with **interleaving** sessions and **no overlap** (L2). Two accounts online together are a household, not a link; a network with more than fifty accounts a day links nobody. A weak signal (L3: created close together and voting alike) is only *noted*.
- A linked set's **ballots, backings, petition signatures and event hands count once** (the earliest stands), set aside at the count. A linked bail pays no Party XP (and bail pays Party XP at most three times a day for anyone); a linked visit heals nothing.
- **Never at the tap, never with a message.** The only public sign is one line: *{n} votes set aside after the audit.* Energy, Iron, XP, orders and the Dossier are untouched; nothing transfers between accounts.

**The 24-hour audit:** at the national count (term day 27) the audit runs itself and the provisional result already carries the automatic set-asides. During the day a moderator may confirm, set aside a noted set, unlink, or **order a recount** of any council, district or Clearwater count made at that day's boundary. **At day 0 the count confirms itself** if nobody acted. Council results are final at the count; a recount that moves a seat passes it at once (the loser's term not completed; the rule ballot and the rule in force stand: a recount moves seats only, [[adr/0062-the-national-audit-self-confirms-and-council-recounts|ADR 0062]] as amended 14 Oct 2026).

**Moderation** ([[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]]):
- **The policy** (20 lines, accepted at sign-up): no harassment, no real-world hate, **no real-world political slogans, symbols, parties or leaders as identity**, no doxxing, no spam or selling, **nothing offered for a vote, a backing or a signature**, no impersonation, no evading a mute.
- **Reports** from a chat line or a profile, four reasons (*Abuse or harassment · Real-world politics or hate · Spam or selling · Something else*), **ten a day**. The reporter reads *Thanks. Someone will read it.* and later, if acted on, *A line you reported was dealt with.*
- **The word filter** **refuses** (*That can't be said here.*, no echo) or **flags** to the queue. Its lists live outside content, and the game's own words (*strike*, *rally*, *gate*) always pass. **Brought forward in slice 6** (review 7, [[design/slice-6-together#23.1 The word filter (note #2: "chat needs a profanity filter")|design §23.1]]) in two tiers: **refuse** for slurs and real-world hate; **mask** for ordinary swearing, printed as its first letter and the editor's dash (*b—*), the way the period's papers did, and stored masked. A name is refused on either tier (*That name can't be used here. Try another.*). Mild period words (*bloody, damn, hell, sod*) pass.
- **The ladder:** a note from the editor (a Letters row) · **muted** 24 h, then 7 days · **suspended** 3 days, then 14 (nothing owned is touched; timers run; office duties fall to their defaults) · **closed** (the character retired; offices vacated by kind; **a council candidacy can't be withdrawn and runs to the count**; national candidacies and event sign-ups are withdrawn; personal data erased after 30 days). **Real-world hate goes straight to 14 days**, a second time to closure.
- **Appeals:** one reply of 500 characters per decision, answered within a week.
- **Names:** checked at sign-up and on every rename (folded against the refuse and impersonation lists); **one change every 30 days**; printed editions keep the old name unless a moderator forced the rename.
- **The console** `/mod` (Queue, Audit, Accounts, Log; admins see Metrics). Moderators may play; a report on a moderator's own faction needs a second moderator. Beta gate: **median time to first action under 24 hours**.

**Content policy** ([[design/content-policy-review|content-policy review]], 29 Sep 2026): the Vanguard is an authoritarian party, **not a militia** (no army ranks, drill, barracks, uniforms); **no real-world symbol, salute, slogan or title** for any faction (the Collective lost *Commissar* and *Comrade-General*); **no war framing** (rival, not enemy; *The Upset*, not *The Uprising*). Its §7 checklist applies to every new Vanguard string and is the list the filter and moderators use.

**Technical shape (ADRs):** [[adr/0060-network-sightings-device-cookie-and-signup-caps|0060]] device cookie `igc_d`, `networkSightings` with salted hashes rotated every 30 days (never addresses; loopback never counts), sign-up caps as reservations · [[adr/0061-linked-accounts-count-once-at-every-count|0061]] `accountLinks` refreshed nightly, sets computed at read, one collapsing seam (`countableTally`) in every count · [[adr/0062-the-national-audit-self-confirms-and-council-recounts|0062]] the audit self-confirms at take-office; council recounts from stored inputs · [[adr/0063-moderation-state-on-the-user-roles-and-the-log|0063]] moderation state and roles as flat fields on Better Auth's `user`, lazy expiry, an append-only `moderationLog`, the two-person rule · [[adr/0064-packages-moderation-server-only-filter-and-names|0064]] a pure, server-only `packages/moderation` (filter, names, email) · [[adr/0065-one-report-queue-editor-notes-and-appeals|0065]] one `reports` queue, `editorNotes`, `appeals` · [[adr/0066-renames-through-a-name-snapshot-registry|0066]] renames through a `NAME_SNAPSHOTS` registry guarded by a schema-walk test · [[adr/0067-closing-an-account-retirement-and-erasure|0067]] retirement in one transaction, reopen within 30 days, a daily erase job · [[adr/0069-request-guards-in-process-rate-limits-and-maintenance|0069]] in-process rate limits (no Redis) and a maintenance flag.

## Where it lives

**Rules:** [[GDD#15.2 Integrity rules|GDD §15.2]] · [[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]] · [[design/slice-9-launch#4. Anti-abuse (GDD §15.2, §26)|slice 9 design §4]] (anti-abuse) · [[design/slice-9-launch#5. Moderation (GDD §16.2, §26; Appendix C #7, closed)|§5]] (moderation) · §17 (settled for the build) · [[design/slice-9-screens|slice 9 screens]] · [[tech/slice-9|slice 9 tech spec]] · [[design/content-policy-review|content-policy review]] · ADRs above

**Code (built):** the 2–40 name rule `checkName` in `packages/rules/src/name.ts`; Better Auth's own rate limit on auth routes (`apps/server/src/auth.ts`, off with the e2e test hooks); one character per account; the vocabulary guard `packages/content/test/vocabulary.ts`.

**Planned:** `packages/moderation`; rules `packages/rules/audit.ts` (`findLinks`, `linkedSets`, `collapseBySet`, `recountRows`); server `signupGuard.ts`, `links.ts`, `moderationService.ts`, `reportService.ts`, `appealService.ts`; content `policy.ts`, `legal.ts`; jobs `links-refresh` and `account-erase`; client route `/mod`.

## Status

- **Designed, not built** (slice 9). Slice 6 brings the first pieces (mute, report a line, chat limits; [[Chat and Presence]]), and review 7 (15 Oct 2026) the word filter's refuse and mask tiers: `apps/server/src/moderation/` (`check`, `nameAllowed`, on `obscenity` 0.4.6, the project lists in `moderation/lists/`), not yet the `packages/moderation` of [[adr/0064-packages-moderation-server-only-filter-and-names|ADR 0064]]; slice 9 moves or extends it (flags, the impersonation list, folding for names).
- **Built:** the content policy (applied to content since 29 Sep 2026), the basic name rule, one character per account.
- Hosting is deferred to the end of the project, so the production-only parts (salted IP hashes, maintenance) are local-only when built.

## Decisions

- **Linked accounts' ballots count once, silently** (Appendix C #82). **The audit confirms itself at day 0** (#83). **Two accounts a device, three a network a day** (#84). **A name may change once every 30 days** (#85). **The ladder's rungs** (#86).
- Appendix C #7 (Vanguard presentation) **closed** by the content-policy review (29 Sep 2026) and slice 9's policy.
- Settled 4 Oct 2026 (slice 9 design §17): a shared network (> 50 accounts) gives no link; unlinking is sticky; a forced rename and an erasure scrub printed editions, one's own change doesn't.

## Open questions / drift

> [!warning] Drift
> **A closed account's standing candidacy.** Both sources now agree the name **stays on the list until the count** (no withdrawal, no deposit, ADR 0084). They differ on what happens if it would win: GDD §16.2 says the seat it wins **is vacated at once, as by a move**; [[adr/0067-closing-an-account-retirement-and-erasure|ADR 0067]]'s amendment (14 Oct 2026) says **the count skips a retired candidate** and the next name takes the seat. The user's call.

- **Can a recount change the rule a town chose?** ADR 0062's amendment leaves it open for the slice-9 design; the default is **no** (the rule stands, GDD §15.2). Waiting for the user.

## Related

[[Chat and Presence]] · [[Auth and Accounts]] · [[National Elections]] · [[City Council and the Rule Vote]] · [[Recall and Removal]] · [[Monetisation]] · [[Iron Vanguard]] · [[Slice 9 Launch Readiness]]
