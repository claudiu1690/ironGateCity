---
type: system
title: Chat and Presence
aliases: [Chat, Faction chat, Presence, Here now, Members list, Favours between players, Posting bail, Visits, The nudge, The invite, Faction tab, Word filter (chat)]
tags: [social, co-op, chat]
status: partly built
slice: "6 (phase A: rules and db; server, socket and screens to come); officers' channel 7; recognition 8; moderation 9"
gdd: ["§16.2", "§19.1", "§19.2"]
adrs: ["0038", "0039", "0040"]
updated: 2026-10-16
---

# Chat and Presence

## In one paragraph

Slice 6 makes the game feel shared. **Faction chat** gives each party a channel for the whole
faction and one for each city branch; **presence** shows who is at a place right now; and small
**favours** let members help each other: post bail for a mate in the cells, visit one in the
infirmary, invite one onto an open event. Everything sits in the **Faction tab** (the HQ). Chat is
a nicety: nothing in the game depends on being connected, in keeping with the short-session rule.
Designed, **not built**.

## How it works

**Chat** ([[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]]):
- **Channels:** *Party* (faction-wide) and *{City} branch* for the home city and the capital: three per faction. A member reads the branch of the city they stand in (or their residence city's on rival ground) and may switch. Slice 7 adds *Officers* (Rank 4+) and a *Clearwater branch*: five chips at most.
- **Who:** every member from Rank 1.
- **Messages:** plain text, **≤ 280 characters**, no links rendered, no images. **The last 200 messages or 7 days** per channel kept, fifty loaded at a time.
- **Limits:** **one message every 3 seconds, thirty in ten minutes**; an identical repeat within a minute refused.
- **System lines** in the branch channel carry news with a button where one applies: an event called or resolved, a mate taken in (*Post bail*), admitted (*Visit*), a seat won, a hero named, an invite.
- **Moderation in slice 6:** mute a member (hides their lines for you), report a line (stored with twenty lines of context; nothing automatic), the sign-up name rule, the limits; chat can be hidden from the Me tab. **The word filter** (review 7, 15 Oct 2026; [[design/slice-6-together#23.1 The word filter (note #2: "chat needs a profanity filter")|design §23.1]]): slurs and real-world hate are **refused** (*That can't be said here.*, the draft kept, nothing stored, the try still counts toward the limits); ordinary swearing is **masked** as its first letter and the editor's dash (*b—*) and stored masked; *bloody, damn, hell, sod* pass. A name is refused on either tier. Help: *The editor* under the composer. Slice 9 adds the policy, the flag queue and the ladder ([[Moderation and Fair Play]]).
- Delivered over WebSockets while the Faction tab is open.

**Presence:**
- `presence { locationId, seenAt }` on the character; *here now* = **seen within ten minutes**.
- A place's sheet reads *Here now: you, {two names} and n more · k from other parties*: **your own faction by name** (tap for a public profile: name, faction, rank, Level, residence, member since, heroes, Reputation; never the record, Heat, Health, Iron or stats), **the other two factions as one count**.
- **On rival ground a visitor is invisible** to everyone but their own faction ([[Hostile Ground]]). From slice 8 a *recognised* visitor counts as *1 from another party*, never named.
- The **Members list** shows mates' city and state (*in the cells at Harbour Police · 24 min*, *in the infirmary*, *on the train to Irongate*).

**Favours:**
- **Posting bail** ([[Jail and the Cells]]): any member of the prisoner's faction, from anywhere, pays the prisoner's own bail; release at once; the payer +10 Party XP; once per sentence. Nothing transfers between accounts.
- **A visit** ([[Hospital and Treatment]]): **3 Energy** from anywhere but rival ground; **+10 Health and five minutes off** for the patient; once per visitor per stay, three count; the visitor +10 Party XP.
- **The invite** (was *the nudge*; review 7, [[design/slice-6-together#23.2 The invite (note #3: "Ask to join… ask to join what?")|design §23.2]]): one tap by a member signed up to an open event: *Invite to the rally · 19:40* on a mate's row and profile. It names **the soonest** of your open events with a place the mate can take (an open named role at their rank, or a hand's place), and is **hidden** when there is none, when they are on it, or when they are in the cells or on the ward. After the tap the row reads *Invited to the rally* (plain text) and a toast says *Invited. {name} will see it in the branch's chat.* The mate's line names the venue: *Jan Sorel invites Mira Hale to the rally at Market Row, 19:40 · a hand's place is open*, with **Join**. Once per pair per event; nothing held. Help: *Invite* on the Members tab. Ids stay `events.nudge`, `nudge:{event}:{from}:{to}`.

**Technical shape (ADRs):**
- [[adr/0038-chat-socketio-push-trpc-writes-change-streams|ADR 0038]]: **Socket.IO as a push-only channel** at `/api/socket.io`; posting and history over tRPC (`chat.post`, `chat.history`); fan-out by a MongoDB **change stream** on `chatMessages`; no Redis. The client refetches history on every reconnect; no rule or reward travels over the socket.
- [[adr/0039-chat-storage-limits-and-system-lines|ADR 0039]]: `chatMessages` with a 7-day TTL and the 200 cap enforced on read; an atomic per-poster limiter in `chatLimits`; text normalised on the server; system lines as outbox inserts with a `dedupeKey`; mutes on the character without a version bump; `chatReports` (later replaced by `reports`, ADR 0065).
- [[adr/0040-presence-embedded-unversioned|ADR 0040]]: presence embedded on the character and **never bumps `version`**; read by index; one pure visibility rule `visibleTo`; a mate's status is projected from `held`, `journey` and `cityId`, not stored.

## Where it lives

**Rules:** [[GDD#16.2 Faction chat and presence (moved into MVP)|GDD §16.2]] · [[design/slice-6-together|slice 6 design §6–§9]] · [[design/slice-6-screens|slice 6 screens]] · [[tech/slice-6|slice 6 tech spec]] · [[adr/0038-chat-socketio-push-trpc-writes-change-streams|ADR 0038]] · [[adr/0039-chat-storage-limits-and-system-lines|ADR 0039]] · [[adr/0040-presence-embedded-unversioned|ADR 0040]]

**Code (slice 6 phase A, 15 Oct 2026):** rules `packages/rules/src/presence.ts` (`presenceBand`, `visibleTo`, `hereNowLine`, `memberStatus`), `chat.ts` (channels, `normaliseChatText`, `chatRateCheck`, `systemChannelFor`), `favours.ts` (`bailFavourGate`, `visitGate`, `visitEffect`), `PRESENCE`, `CHAT` and `FAVOURS` in `constants.ts`, the views in `togetherTypes.ts`; db `chatMessages`, `chatReports`, `chatLimits` (`packages/db/src/models/chat.ts`), `presence`, `chat`, `mutes`, `nameWords` on the character, `stays.bailPostedBy` and `visits`; `chatCities` in content. A change stream on `chatMessages` was checked on the memory replica set. **Server (phase B, 15 Oct 2026, `21929a7`):** `apps/server/src/services/chatService.ts` (post with the limiter, history with live buttons, channels, report, mute, hide, *for you*, the daily trim), `chatOutbox.ts` (system lines as outbox inserts with a `dedupeKey`), `apps/server/src/chatSocket.ts` (Socket.IO on `/api/socket.io`, push only, a change stream on `chatMessages`), `presenceService.ts` (the read path's touch with no version bump, `presence.at`, *Here now*, the plate's count, the train's fellows), `factionService.ts` (`faction.hq`, `members`, `profile`, `scoreboard`); routers in `apps/server/src/trpc/routers/faction.ts`; the `chat-trim` job; the Vite proxy has `ws: true`. **Client (phase C lane B, 15 Oct 2026):** `packages/ui/src/components/Chat.tsx` (`ChatPanel`, `ChatLine`, `SystemLine`, `systemLineText`), `Members.tsx` (`MemberRow`, `ProfileSheet`, `FactionScoreboard`); `apps/client/src/features/faction/` (`ChatTab`, `MembersTab`, `ScoreboardTab`, `ProfileFlow`, `useChatSocket`, `chatDraft`); Me's *Chat* switch in `routes/me.tsx`. **The word filter (review 7):** `apps/server/src/moderation/` (`filter.ts`: `check(text)` → refused or masked, `nameAllowed(name)`; on `obscenity` 0.4.6, MIT), its lists in `moderation/lists/` (`refuse.ts`: the slur tier, the refuse phrases, the mild words; `allow.ts`), called from `chatPost` after the limiter and from `acceptName` in `apps/server/src/auth.ts`; the client maps `CHAT_REFUSED` and `NAME_NOT_ALLOWED`. **The invite:** `inviteFor` in `factionService.ts` (the row's `ask` with `eventName`, `startsAt`), the `venue` in `nudgeEvent`'s payload (`eventService.ts`), `inviteLabel` and `Toast` in `Members.tsx`. E2E: `apps/client/e2e/faction.spec.ts` (two browsers, live within 2 s). **The Branch Office (review 7 #1):** the channels are the game's paper chips (`packages/ui/src/components/Chip.tsx`, shared with the scoreboard), never a second ink strip; the desktop column opens under a paper-2 head *The room* (`chat-room-head`) carrying *{n} here · {channel}*. **Presence on the map (phase C lane A):** *Here now* under a place's blurb via `presence.at` (`features/faction/PlacePresence.tsx`, `HereNowLine` in `packages/ui/src/components/EventTicket.tsx`), the plate's *{n} of the {faction} in town now* (from 640 px), the journey's *You and n others on this train*.

## Status

- **Slice 7, lane Y (16 Oct 2026):** the *Officers* channel `officers:{faction}` for Rank 4 and above (`channelsOf(f, cities, officers)` in `packages/rules/src/chat.ts`, `channelsFor` in `chatService.ts`, the socket's rooms, the trim, the chip). With Clearwater's branch a member reads four chips, five from Rank 4.
- **Slice 8 (T13, 16 Oct 2026):** `presence.recognised` is written by `touchPresence` (recognition above 0 on rival ground, from `loadCharacter`), and *Here now* counts a recognised visitor for the place's home faction (`presenceService.ts`).
- **Built end to end** (15 Oct 2026): rules, db, the server and the socket (phases A–B), the Members list, profile, scoreboard and chat screens with the socket client (phase C, lane B). QA to come.
- **Review 7** (15 Oct 2026): the word filter (refuse and mask tiers) and the invite naming its event, built; e2e in `faction.spec.ts` (the filter, a refused name) and `favours.spec.ts` (the invite hidden, then named, the toast, the venue in the line).
- **The Branch Office** (review 7 #1, 15 Oct 2026): the channels as paper chips, the compact letterhead over Chat on a phone, *The room* head on the desktop column. The old drift (the *Chat* chip on a desktop and with chat hidden) is closed: the strip has no Chat cell in either case.

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
