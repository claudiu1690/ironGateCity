---
type: system
title: Chat and Presence
aliases: [Chat, Faction chat, Presence, Here now, Members list, Favours between players, Posting bail, Visits, The nudge, Faction tab]
tags: [social, co-op, chat]
status: designed
slice: "6 (designed, not built); officers' channel 7; recognition 8; moderation 9"
gdd: ["§16.2", "§19.1", "§19.2"]
adrs: ["0038", "0039", "0040"]
updated: 2026-10-14
---

# Chat and Presence

## In one paragraph

Slice 6 makes the game feel shared. **Faction chat** gives each party a channel for the whole
faction and one for each city branch; **presence** shows who is at a place right now; and small
**favours** let members help each other: post bail for a mate in the cells, visit one in the
infirmary, nudge one onto an open event. Everything sits in the **Faction tab** (the HQ). Chat is
a nicety: nothing in the game depends on being connected, in keeping with the short-session rule.
Designed, **not built**.

## How it works

**Chat** ([[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]]):
- **Channels:** *Party* (faction-wide) and *{City} branch* for the home city and the capital: three per faction. A member reads the branch of the city they stand in (or their residence city's on rival ground) and may switch. Slice 7 adds *Officers* (Rank 4+) and a *Clearwater branch*: five chips at most.
- **Who:** every member from Rank 1.
- **Messages:** plain text, **≤ 280 characters**, no links rendered, no images. **The last 200 messages or 7 days** per channel kept, fifty loaded at a time.
- **Limits:** **one message every 3 seconds, thirty in ten minutes**; an identical repeat within a minute refused.
- **System lines** in the branch channel carry news with a button where one applies: an event called or resolved, a mate taken in (*Post bail*), admitted (*Visit*), a seat won, a hero named, a nudge.
- **Moderation in slice 6:** mute a member (hides their lines for you), report a line (stored with twenty lines of context; nothing automatic), the sign-up name rule, the limits; chat can be hidden from the Me tab. Slice 9 adds the policy, the filter and the ladder ([[Moderation and Fair Play]]).
- Delivered over WebSockets while the Faction tab is open.

**Presence:**
- `presence { locationId, seenAt }` on the character; *here now* = **seen within ten minutes**.
- A place's sheet reads *Here now: you, {two names} and n more · k from other parties*: **your own faction by name** (tap for a public profile: name, faction, rank, Level, residence, member since, heroes, Reputation; never the record, Heat, Health, Iron or stats), **the other two factions as one count**.
- **On rival ground a visitor is invisible** to everyone but their own faction ([[Hostile Ground]]). From slice 8 a *recognised* visitor counts as *1 from another party*, never named.
- The **Members list** shows mates' city and state (*in the cells at Harbour Police · 24 min*, *in the infirmary*, *on the train to Irongate*).

**Favours:**
- **Posting bail** ([[Jail and the Cells]]): any member of the prisoner's faction, from anywhere, pays the prisoner's own bail; release at once; the payer +10 Party XP; once per sentence. Nothing transfers between accounts.
- **A visit** ([[Hospital and Treatment]]): **3 Energy** from anywhere but rival ground; **+10 Health and five minutes off** for the patient; once per visitor per stay, three count; the visitor +10 Party XP.
- **The nudge:** one tap by a member signed up to an open event, asking a mate to take its first open role (once per pair per event).

**Technical shape (ADRs):**
- [[adr/0038-chat-socketio-push-trpc-writes-change-streams|ADR 0038]]: **Socket.IO as a push-only channel** at `/api/socket.io`; posting and history over tRPC (`chat.post`, `chat.history`); fan-out by a MongoDB **change stream** on `chatMessages`; no Redis. The client refetches history on every reconnect; no rule or reward travels over the socket.
- [[adr/0039-chat-storage-limits-and-system-lines|ADR 0039]]: `chatMessages` with a 7-day TTL and the 200 cap enforced on read; an atomic per-poster limiter in `chatLimits`; text normalised on the server; system lines as outbox inserts with a `dedupeKey`; mutes on the character without a version bump; `chatReports` (later replaced by `reports`, ADR 0065).
- [[adr/0040-presence-embedded-unversioned|ADR 0040]]: presence embedded on the character and **never bumps `version`**; read by index; one pure visibility rule `visibleTo`; a mate's status is projected from `held`, `journey` and `cityId`, not stored.

## Where it lives

**Rules:** [[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]] · [[design/slice-6-together|slice 6 design §6–§9]] · [[design/slice-6-screens|slice 6 screens]] · [[tech/slice-6|slice 6 tech spec]] · [[adr/0038-chat-socketio-push-trpc-writes-change-streams|ADR 0038]] · [[adr/0039-chat-storage-limits-and-system-lines|ADR 0039]] · [[adr/0040-presence-embedded-unversioned|ADR 0040]]

**Code:** none yet (no Socket.IO, `chatMessages` or `presence` in the code). Planned in the tech spec: rules `presence.ts`, `chat.ts`, `favours.ts`; services `chatService`, `presenceService`, `favourService`, `factionService`.

## Status

- **Designed, not built** (slice 6).

## Decisions

- **Chat moved into the MVP** (GDD §16.2 heading).
- **Two channels, then branch chips** (settled 3 Oct 2026).
- **Presence is invisible on rival ground** (Appendix C #63).
- **Visits from anywhere but rival ground** (Appendix C #89).
- **Server-Sent Events are not built**; Socket.IO only for chat (ADR 0038).
- Production note: Vercel rewrites can't upgrade a WebSocket; at deploy the API moves to a same-site subdomain (ADR 0038 §5). Hosting is deferred to the end of the project.

## Open questions / drift

> [!note] Inference
> Linked accounts change two favours from slice 9: a linked bail pays no Party XP and a linked visit heals nothing; bail Party XP is capped at three a day for everyone (GDD §15.2). The slice-6 numbers above don't show that cap.

## Related

[[Campaign Events]] · [[Moderation and Fair Play]] · [[Jail and the Cells]] · [[Hospital and Treatment]] · [[Hostile Ground]] · [[Party Orders]] · [[Slice 6 Together]]
