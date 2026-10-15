# Slice 6 — Together: technical design

| | |
|---|---|
| **Goal** | A branch plays together. **Campaign Events**: a Rank 3 member calls one at a fixed venue in the city they stand in, 1–12 hours ahead, and takes the first role; members sign up for named roles (Rank 2) or as **hands** (any Rank); **signing up is the commitment** (the Energy is spent at the tap; withdrawal until an hour before). At the start the server rolls every member-held role, fills the empty ones with **the branch's volunteers** at half strength, and turns the roles into **Triumph, Success, Mixed or Fiasco**: opinion, Party XP, Political Capital, Issue momentum and a headline. **The secretary's fixture** is posted every City Day in each faction's home city and in the capital, and settles at the next boundary. Around the events: **the Faction tab** (Orders, Events, Members, Scoreboard, Chat), **presence** (*Here now*), **faction chat** over WebSockets with mute and report, and **favours** (posting a mate's bail, visiting the ward, the nudge). Nothing requires being online at a set time |
| **Question** | **Do players feel part of a team, and do they come back for the group's events?** |
| **Builds on** | Slices 0–4 as built on branch `slice-0` at `a337c5c`, the slice-4 fix round, and **slice 5 as designed** in `docs/tech/slice-5.md` (built before slice 6): `heat`, `health`, `held`, `runIn` on the character, the `encounters` and `stays` collections, the read order of ADR 0033 §5, `applyAgainst`, `districts.state.leader`, `missionTarget`. Where this document leans on a slice-5 name it is that design's name; if slice 5's Deviations rename something, T8 follows the rename. Slices 0–5, reviews 4–5 and the voting rework (ADR 0073–0086) are now built; their knock-ons were applied to this document on 14 Oct 2026 (dated notes at the end) |
| **Design inputs** | `docs/design/slice-6-together.md` (*design §n*) · `docs/design/slice-6-screens.md` (*screens §n*) · `docs/economy.md` §20 · GDD §3.3, §5.2, §5.4, §6.2, §6.5, §13.7, §14.2, §14.4–§14.6, §14.11–§14.12, §15.4, §16.2, §16.3, §18.2, §19.1, §19.2, Appendix C #7, #57–#63 · `docs/IMPLEMENTATION_PLAN.md` · ADR 0001 (the proxy), 0002, 0008, 0017, 0025, 0028, 0030, 0032, 0033 |
| **ADRs** | [0036 events, roster, sign-ups, limits](../adr/0036-campaign-events-roster-signups-and-natural-limits.md) · [0037 resolution and credit](../adr/0037-event-resolution-world-first-credit-on-read.md) · [0038 chat transport](../adr/0038-chat-socketio-push-trpc-writes-change-streams.md) · [0039 chat storage and lines](../adr/0039-chat-storage-limits-and-system-lines.md) · [0040 presence](../adr/0040-presence-embedded-unversioned.md) · [0041 favours](../adr/0041-favours-across-two-characters-one-release-path.md) · [0042 the faction scoreboard](../adr/0042-faction-scoreboard-scoped-totals.md) |
| **Accepted defaults** (design §19, taken by the main session) | Rank 1 joins **as a hand** · the fixture resolves **at the boundary** · events pay **no Iron** · Political Capital **halves after the first event** of the day · visits **from anywhere but rival ground** · the Headline Story **without a Case File** · chat ships with **mute and report only** (moderation tools slice 9), hideable from the Me tab |
| **Environment** | **Local only** until the end of the project. Everything is played in `pnpm dev:mem` (API, worker and the shared memory replica set) with the dev panel (§8.7). Production concerns (WebSockets through Vercel, several API instances) are recorded, not built (§8.5, ADR 0038) |

Every number below is a GDD, design or economy number. Where the design leaves a point open, this document states a default and lists the question in §22.

---

## 1. Scope

**In**

- **Campaign Events** (design §2–§4):
  - six event types in content (Rally, Canvass Drive, Poster Night, and the three signature events), 27 venue rows;
  - calling (Rank 3, three steps, four time chips), with the limits per faction per city (per district in the capital): one upcoming member-called event, two member-called starts a City Day, the fixture;
  - sign-up (named roles at Rank 2, four hands at any Rank), Energy and Rested at the tap, three open sign-ups per member, the event order at the tap;
  - withdrawal until an hour before the start, the caller's withdrawal, *called off*;
  - resolution at the start by an Agenda job and lazily, the volunteers (0.5, or 0.75 at home while *Fired up*), the score and the four outcomes, the swing with the members' share and every §14.4 factor, attribution to the ledger, Issue momentum (double for the General Strike), the Headline Story *against* the leader, the Grand Rally's Heat;
  - rewards per participant (XP by the holder's roll, Party XP by the outcome, Political Capital full then half, a Reputation win, Heat), credited on the participant's next read with **one result modal per event**;
  - **the secretary's fixture**: two a faction a day (home and the capital), posted at the boundary, resolved at the next.
- **The Faction tab** (`/faction`): Orders (with the fixture), Events (the board, *your sign-ups*, the last ten results), Members (presence bands, status, favours, the nudge), Scoreboard (this week and all time, by city, by bracket), Chat.
- **Presence**: `presence { locationId, seenAt }`; *Here now* on a place's sheet, the city plate's count, the Members list's bands and status, *You and n others on this train*.
- **Chat**: *Party* and *{City} branch* channels, 280 characters, 200 messages or 7 days, the rate limits, system lines with buttons, mute, report, hide; **Socket.IO** for live lines through the Vite proxy; posting over tRPC.
- **Favours**: posting bail (the prisoner's figure, from anywhere), a visit (3 Energy, +10 Health, five minutes off, three count), the nudge.
- **The paper**: the *Events* section (live), the desk's *Signed up* row, ten new headlines per paper (the Clarion, the Sentinel, the Gazette, the Herald), *In Print* for events, bail and visits.
- **Orders**: one slot-B template per faction (`kinds: ['event']`).
- **Art**: `scene.event-poster-night` and `scene.event-grand-rally` (they exist), the event art per type.
- **The dev panel and test hooks** for solo play (test members, start now, forced rolls), the playtest report's **together** section.

**Out** (§19): the officers' channel and the Chair's events (slice 7), Town Hall (slice 7), counter-demonstrations (v1.1), Case Files on the Headline Story (slice 8), rival events and the barman's report (slice 8), moderation tools (slice 9), private messages, push notifications, carriage chat, events on rival ground or in second quarters, deployment of the socket (Vercel, sticky sessions, several instances).

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| Events in content | `campaignEventTypes[]` (roles, base swing, difficulty, `actionType`, `special`, art, texts) and `eventVenues[]`, as design §16 Q1, plus `factionId` (who may call a signature event) and `art`. The fixture's rotation is content; bands, multipliers, rates, volunteer scores, hands and limits are rules (`EVENTS`) | §4.1 (Q1) |
| The event and its roster | `campaignEvents`, **roster embedded** (≤ 5 roles and ≤ 4 hands, read with the event on every board row). Signing up writes the slot with a guard that it is empty and the event is open and not started | ADR 0036, §5.1 (Q2) |
| Sign-ups | Their own collection, **`eventSignups`**: the commitment (Energy, Rested, the order bonus), the idempotency record of the tap, the per-participant result at resolution and the receipt at credit; history for the scoreboard, the paper and the report | ADR 0036, §5.2 |
| The per-member limit | `events.open[]` on the character (≤ 3), written in the sign-up's version-guarded transaction. Also the read path's pointer to due sign-ups (no query when none is due) | ADR 0036 |
| Limits per faction per place | **Natural keys, not counters**: unique `{ factionId, placeId, day, dayIndex }` (the fixture 0, member starts 1 and 2) and a unique partial `{ factionId, placeId }` on open member-called events. No write to the city document | ADR 0036 (Q2) |
| The seed | **A secret 32-hex seed stored on the event**, never sent before resolution. The event id is public (the route), so it cannot be the seed | ADR 0036 (design §2.6, §23) |
| Resolution | `resolveEvent`: an Agenda job at `startsAt` (scheduled after the call, best effort) **and** lazily on any read of the event, on a participant's read, and **by the city day before each boundary** (every open event of an earlier day). One transaction writes **the world only**: the event's result, opinion, morale, ledger rows, contributions, Issue momentum, each sign-up's result, the chat line | ADR 0037 (Q3) |
| Rewards | **Credited on the participant's own read** (`ensureEventsCredited`), in their version-guarded transaction: XP, Party XP, PC, level and rank, Reputation, Heat as of the start, the tally; the receipt is stored on the sign-up and a modal pointer pushed. The world never writes a character (ADR 0020, 0028) | ADR 0037 (Q3) |
| The fixture | Posted by the city day at each boundary (and by `ensureFixtures` on the board, the paper and the HQ, idempotent by its natural key); `startsAt` = the next boundary; resolved by the city day before that boundary | ADR 0037, §3.2 |
| Stats "at the start" | Read at resolution. Exact because every participant's read path resolves their due events before any act of theirs can change a stat | ADR 0037 |
| Presence | `presence { locationId, seenAt }` on the character (no `cityId`: the character's `cityId` is it); touched by `loadCharacter` at most once a minute and by `presence.at` when a sheet opens; **never bumps `version`** | ADR 0040 (Q4) |
| Visibility | Own faction by name, the other two as one count, a visitor on rival ground invisible to all but their own faction. One pure rule, `visibleTo` | ADR 0040, §6.3 |
| Chat transport | **Socket.IO** (the plan's choice) as a **push-only** channel on `/api/socket.io`, through the same-origin proxy (`ws: true`); **posting is a tRPC mutation**; fan-out by a **MongoDB change stream** on `chatMessages` in each API process (no adapter, no Redis); the worker's lines reach sockets the same way | ADR 0038 (Q5) |
| Chat storage | `chatMessages` (TTL 7 days; **200 per channel enforced on read** and trimmed by a daily job), `chatReports`, `chatLimits` (one per character: the 3-second, 30-in-10-minutes and repeat rules, atomically), mutes on the character, system lines as **outbox inserts** with a `dedupeKey` in the transaction that caused them | ADR 0039 (Q5) |
| Favours | One transaction over the payer or visitor, the stay and the mate. **Bail by a mate moves the stay's end to now; slice 5's release path releases on the prisoner's next read** (one release path, the modal names the payer). A visit moves `until` and heals | ADR 0041 (Q6) |
| Releases | **Still no tidy job** (ADR 0033 §4's open point). Views project `held` lazily (`until ≤ now` reads as out, or as *on the train home* after a rival-ground arrest) | ADR 0041 |
| The scoreboard | **Faction-scoped contribution totals** (`faction|{f}|{period}|{city or all}`, four upserts per opinion row, in `addInfluence` for every path) with an `events` count, read by index per bracket. The ledger is never folded on a read path | ADR 0042 (Q7) |
| Orders | `ActionKind += 'event'`; an `event` descriptor matches **only** templates whose `kinds` include `event`; a call is a sign-up for the order | §6.7 |
| Issue feeds | `feedMatches` accepts `event` descriptors (type = the event's `actionType`, the venue, its kind and district) | §6.7 |
| Ordinance effects | The roles' checks, Party XP and swing take every line **an action of the event's `actionType` at the venue** would (Standing, close race, `chancePct`, `fxpPct`, `swingPct`, the comeback, Issues). Cost effects do not change a role's Energy | §6.2, §22.1 Q8 |
| Odds | The server sends each open role's chance for the viewer; the client words it (`oddsBand`). No digit reaches the screen | §8.3 |
| Routes | `/faction?tab=…` (the five tabs), `/faction/events/$eventId` | §12.1 |
| Jobs | `campaign-event-resolve` (new, per event), `chat-trim` (new, daily), `city-day` (extended: resolve, then post the fixture). No release job | §9 |

---

## 3. The order of play, time, and the flow

### 3.1 An event's life

```
events.call (one transaction; the caller's tap is the event's first sign-up, ADR 0036)
  refusals (§7.2) · resolve due events of the place first (lazy) · Rank 3 · an open city · the district named in the call (capital; client memory, GDD §14.13; §22.1 Q6)
  insert campaignEvents { kind 'member', day = dayKey(startsAt), dayIndex 1|2, seed, roster with the caller }
        ← unique { factionId, placeId, day, dayIndex } and the partial unique "one open" refuse a race
  insert eventSignups (caller: true, the tap's key, the stored PoliticalResult)
  character: Energy and Rested (lazy, version guard, 'day.settled': today), events.open += , orders (the event order),
             tally, presence.locationId = venue
  chatMessages: the "called" system line (dedupeKey 'called:{eventId}')
  after commit: schedule campaign-event-resolve at startsAt (best effort)

events.signUp (one transaction)            events.withdraw (one transaction, request key)
  the slot: roles.i.holder null → me          now < startsAt − 1 h · the slot back to null (guard: my signupId)
  or hands.push (< 4), status 'open',         sign-up 'withdrawn' · Energy and Rested back (the overflow rule)
  startsAt > now, I am not on it              events.open −= · the caller: events.calls += (the called-off modal)
  eventSignups insert · character as call     tally energy − (same City Day only) · the order stays (§22.1 Q3)

startsAt  →  resolveEvent (one transaction; job, lazy read, or the city day before the next boundary)
  status 'open' → 'resolved' | 'calledOff'    (no member on it: called off, nothing else written)
  read the roster's characters (stats, worn CHA, Standing, Level): read only
  read the place (city or district) and its day's modifiers (ADR 0030) for the event's actionType at the venue
  r = resolveCampaignEvent(input, streams(seed))                       // pure, §6.2
  write: event.result · opinion (applyPersuasion | applyAgainst) and morale · ledger rows (kind 'event', one per
         member participant per leg) · contributions (place cycle + faction scopes, +1 event) · Issue momentum
         · each eventSignups.result · chatMessages "result" line (dedupeKey 'result:{eventId}')

the participant's next read  →  ensureEventsCredited (one transaction per sign-up, the character's version guard)
  the sign-up's result + the character now → eventCredit (pure): gains, level, rank, PC cap, Standing win, Heat as of
  startsAt · character $set + events.open −= + events.unseen += · eventSignups.receipt, creditedAt (guard: null)
the modal gate  →  events.current → ResultModal kind="event" → Continue → events.seen
```

### 3.2 The fixture's day

| When | What | Who |
|---|---|---|
| Boundary into day *d* | `processBoundary(d)` / `processCapitalBoundary(d)` upserts day *d*'s fixtures: the home faction's in a home city; all three in Irongate, in district `dayKey mod 5` (by `n`). Type `(d + factionIndex) mod 3` over the content rotation. `startsAt = dayStart(d + 1)`, `day = d`, `dayIndex = 0`, `calledBy: secretary` | `city-day` job or the first request (ADR 0017) |
| During day *d* | Open for sign-ups; withdrawal until 23:00 UTC; also ensured on reads (`ensureFixtures`, a natural-key upsert) so the deploy day and a late bootstrap have one | any read of the board, the HQ or the paper |
| Boundary into day *d + 1* | **Before** `processBoundary(d + 1)`: every open event of the city with `day < d + 1` is resolved (each its own transaction), so day *d*'s swing, ledger cycle and Issue momentum land before the drift, the count and Monday's Issue resolution | `settleCityDay` (job or request) |

The fixture counts as day *d*'s event for the limits and for *first event today*. A fixture nobody joined is *called off* and is not listed in *Results* (§22.1 Q5).

### 3.3 Time and the lazy state

| State | Stored | Read | Ends |
|---|---|---|---|
| An open event | `campaignEvents.status: 'open'`, `startsAt` | any read at or after `startsAt` resolves it first | resolved or called off, as of `startsAt` (stats and factors as they stand at resolution, §3.4) |
| A sign-up | `eventSignups.status: 'committed'`, `events.open[]` on the character | the participant's read: due when `startsAt ≤ now` | credited (`creditedAt`), the pointer moved to `events.unseen` |
| Withdrawal | — | `now < startsAt − 1 h` (server clock) | at `startsAt − 1 h` |
| A result modal | `events.unseen[]` | the modal gate | `events.seen` |
| Presence | `presence.seenAt` | *here now* while `now − seenAt < 10 min` | — |
| Chat limits | `chatLimits` | at `chat.post` | sliding windows |
| A stay shortened by a visit or a mate's bail | `held.until`, `stays.until` | slice 5's `heldNow` | released on read as of `until` |

### 3.4 The read order (`loadCharacter` v6)

1. `ensurePlaces`: the city days of the current, residence and job cities, **and of the cities of due sign-ups** (`events.open` with `startsAt ≤ now`). A city day's boundary resolves that city's open events of earlier days first (§3.2).
2. `ensureRunInSettled` (slice 5).
3. `ensureReleased` (slice 5; now also `how: 'bailPosted'`, §8.2).
4. **`ensureEventsResolved`**: each due sign-up's event (and each due `events.calls[]` event) that is still open is resolved (`resolveEvent`, no character write).
5. `ensureSettled`: the character's day. The edition reads yesterday's resolved sign-ups, called-off events, bail and visits (§11.2).
6. **`ensureEventsCredited`**: each due, resolved sign-up is credited (after the settlement, so the gains land in today's tally); a due call whose event was called off pushes the called-off modal.
7. `ensureArrived` (slice 4).
8. **`touchPresence`**: `presence.seenAt = now` when older than a minute (no version bump).

Each step reads only fields already on the loaded character and writes only when something is due. With no sign-up, no call and a fresh `seenAt`, slice 6 adds **no query** to the read path. Stats "as at the start" hold because step 4 runs before any act of the participant (design §2.9): another member cannot change your stats, and your own acts all pass through this read first.

### 3.5 The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | any screen | the read path (§3.4) | city days (+ due events, fixtures), luck, releases, due events, the settlement, credits, arrival, presence |
| 1 | Faction · Events (`/faction?tab=events`) | `events.board` | lazy resolutions; `ensureFixtures` |
| 2 | Call an event (sheet) | `events.callSheet`, `events.call` | `campaignEvents`, `eventSignups`, `characters`, `chatMessages`, Agenda |
| 3 | An event (`/faction/events/$id`) | `events.get`, `events.signUp`, `events.withdraw`, `events.nudge` | `campaignEvents`, `eventSignups`, `characters`, `requestLogs`, `chatMessages` |
| 4 | The result modal | `events.current`, `events.result`, `events.seen` | `characters.events.unseen` |
| 5 | Faction · Members, the profile | `faction.members`, `faction.profile` | — |
| 6 | A favour (sheet) | `favours.postBail`, `favours.visit` | `characters` ×2, `stays`, `requestLogs`, `chatMessages` |
| 7 | Faction · Scoreboard | `faction.scoreboard` | — |
| 8 | Faction · Chat | `chat.channels`, `chat.history`, `chat.post`, `chat.seen`, `chat.report`, `chat.mute`; the socket | `chatMessages`, `chatLimits`, `chatReports`, `characters` (mutes, `chat.seenAt`) |
| 9 | A place's sheet | `presence.at`; `city.get` (the event ticket, the plate count) | `characters.presence` |
| 10 | Me · *Chat* | `chat.setHidden` | `characters.chat.hidden` |
| 11 | Paper | `paper.today` | — (stored headlines at the settlement; *Events* and the desk row live) |
| 12 | The cells, the ward (`/held`) | `held.get`, `held.close` (slice 5) | the release names the payer; the ward lists visitors |

---

## 4. Content (`packages/content`)

### 4.1 New and changed schemas

```ts
// Campaign events (design §3; GDD §16.3)
EventRole = z.strictObject({
  id: Id,                                              // 'speaker', 'canvasser-1', 'paster-agi'
  name: z.string().min(1).max(30),                     // "Canvasser" (×3 share a name, not an id)
  stats: CheckStatsSchema,                             // one, two averaged, or ['best']
  energy: z.union([z.literal(10), z.literal(15)]),
  hint: z.string().min(1).max(90),
});
EventSpecial = z.enum(['heatInRivalHeld', 'doubleMomentum', 'againstLeader']);
CampaignEventType = z.strictObject({
  id: Id,                                              // 'event.rally'
  name: z.string().min(1).max(40),                     // "Rally"
  runningName: z.string().min(1).max(40),              // "rally" ({event} in running text, design §10)
  factionId: FactionId.optional(),                     // a signature event: only this faction calls it
  venueKinds: z.array(LocationKind).min(1),
  roles: z.array(EventRole).min(3).max(5),
  baseSwing: z.number().positive().max(3),             // 0.8 … 2.0
  difficulty: z.strictObject({ home: z.int().min(8).max(20), capital: z.int().min(10).max(22) }),
  actionType: z.enum(['canvass', 'speech', 'propaganda']),
  special: EventSpecial.optional(),
  art: AssetId,                                        // a `scene`
  blurb: z.string().min(1).max(200),
  text: z.strictObject({ triumph: OutcomeText, success: OutcomeText, mixed: OutcomeText, fiasco: OutcomeText }),
});
EventVenue = z.strictObject({
  eventId: Id, cityId: Id, districtId: Id.nullable(), locationId: Id,
});
Content += {
  campaignEventTypes: z.array(CampaignEventType).length(6),
  eventVenues: z.array(EventVenue),
  fixtureRotation: z.tuple([Id, Id, Id]),              // ['event.canvass-drive', 'event.rally', 'event.poster-night']
};

// Orders (design §5)
OrderMatch.kinds: ActionKind[] where ActionKind += 'event';

// Headlines (design §10; §11.2)
HeadlineCondition += EventCondition;                   // eventOpenToday · eventResolvedYesterday { tookPart, outcome? }
                                                       // · eventCalledOffYesterday · bailPostedForYesterday
                                                       // · bailPostedByYesterday · visitedYesterday
```

`OutcomeText` is slice 1's `{ headline, body }`. `GameContent` gains:

- `eventType(id)`, `eventTypes()`, `eventTypesFor(factionId)` (the three common and the faction's own);
- `venueOf(eventId, cityId, districtId)` → the located venue (location, kind, quarter, district), `venuesAt(locationId)`;
- `fixtureRotation()`;
- `chatCities(factionId)` → the open cities of the faction's channels: its home city and the capital (§22.1 Q11).

### 4.2 Loader cross-checks (added)

- **Event types.**
  - Six, ids unique; exactly one per faction has `factionId` (Grand Rally, General Strike, Headline Story), each with its `special` (`heatInRivalHeld`, `doubleMomentum`, `againstLeader`); the three common ones have neither.
  - Roles: 3–5, ids unique within the type; a `best` role has exactly `['best']`; Energy totals equal design §3 (45, 40, 30, 55, 50, 45).
  - `difficulty.capital = difficulty.home + 2`.
  - `art` names a `scene` asset. Blurb ≤ 200; hints ≤ 90; outcome texts ≤ 240 and ≤ 4 sentences.
- **Venues.**
  - Every row's location exists, lies in its `cityId` (and `districtId` in the capital), and is in a **first quarter or a district** (no slice-5 second quarter).
  - **The location's kind is in the type's `venueKinds`** (design §3.7; Poster Night's kinds gained `university`, `square` and `bar`, so every row passes, §22.1 Q1).
  - Exactly one row per (event, city, district): each home city has its three common events and its faction's signature event; each of Irongate's five districts has the three common events; each signature event has exactly one capital district.
  - No venue is on rival ground for the event's possible callers (a home city's rows serve only its home faction).
- **The fixture rotation** names the three common events.
- **Orders.** Each faction has exactly one slot-B `rotation` template with `match: { kinds: ['event'], cityId: 'home' }`, `residence: 'any'`, `target: 1`, `counts: 'attempts'`. No other template's match can fire on an `event` descriptor (the rules exclude it; the loader also refuses an `event` kind beside other kinds).
- **Headlines.** Each home paper has the ten ids of design §10 and the Herald its ten (`hl.ig.*`); placeholders only from §4.3.
- **Vocabulary.** Both QA guards (`qa.content.test.ts`, `qa.slice2.test.ts`) run over every new string. **`front page`** (the Headline Story's Triumph) joins the `front` allow-list with *out front, the front of, front door, front room, front row* and slice 5's *in front of*. *Rally, strike, picket, steward, security, lookout, stand, the movement, row on row* match neither regex. *sergeant* is settled by slice 5 (*the duty officer*, no allowance; `slice-5-risk.md` §23.1 #22) and no slice-6 string uses it; *usher* is in neither regex.

### 4.3 Placeholders

| Where | Added | Resolved |
|---|---|---|
| Event headlines (design §10) | `{event}` `{venue}` `{caller}` `{time}` `{open}` `{roles}` `{swing}` `{pc}` `{members}` `{outcome}` `{payer}` `{prisoner}` `{place}` `{iron}` `{visitors}` `{district}` `{faction}` | server, from the settlement's facts (§11.2); `EVENT_PLACEHOLDERS` in rules. `{time}` is stored as epoch ms and formatted by the client in the player's clock (*midnight* for the fixture) |
| System lines | `{name}` `{event}` `{venue}` `{time}` `{filled}` `{roles}` `{outcome}` `{swing}` `{place}` `{n}` `{iron}` `{caller}` `{role}` `{prisoner}` | the client, from `system.payload` (times in the reader's clock) |
| Copy (screens §11) | as listed there | the client |

### 4.4 Data to transcribe

| File | Contents | Source |
|---|---|---|
| `data/events.ts` | six types (roles, hints, numbers, art, blurbs, the four outcome texts each, `runningName`); the 27 venue rows; the fixture rotation | design §3, §3.7, §4 |
| `data/orders.ts` | `dir.event`, `dir.v.event`, `dir.a.event` | design §5 |
| `data/headlines.ts`, `heraldHeadlines.ts` | ten per paper (the Clarion in full; the Sentinel, the Gazette and the Herald with their decks and headline substitutions) | design §10 |
| `data/art.ts` | the two new scenes; nothing else (the types carry their `art`) | design §18 |
| `data/copy.ts` | screens §11's strings, the help notes, the system-line templates, the modal texts of design §11 | screens §11, design §8, §11 |

Content tests parse both slice-6 design documents and compare every table and text word for word, as slices 1–5 do: types, roles, hints, numbers, outcome texts, venues, orders, headlines and decks, copy.

---

## 5. Data model (`packages/db`)

Five new collections, each for a reason (plan rule 6):

| Collection | Why its own | Growth |
|---|---|---|
| `campaignEvents` | Shared by a branch, read on the board and the venue; its roster is bounded and read with it, so it is embedded | ≤ 3 starts a place a day |
| `eventSignups` | One per tap; history (withdrawals included), the per-participant result and receipt, the first-of-day rule, the scoreboard's *Events*, the report | per sign-up |
| `chatMessages` | Grows without bound; TTL and a per-channel cap | per line |
| `chatReports` | The report record with its context; kept for slice 9's audit | per report |
| `chatLimits` | One small document per poster, so a chat post never writes the character | per character |

### 5.1 `campaignEvents` — new (ADR 0036, 0037)

```ts
{
  _id: ObjectId,
  kind: 'member' | 'fixture',
  typeId: string, factionId: FactionId,
  cityId: string, districtId: string | null, placeId: string,      // placeId = the district, else the city
  venueId: string,
  day: DayKey,                         // the City Day it counts against: member dayKey(startsAt); fixture the posting day
  dayIndex: 0 | 1 | 2,                 // 0 the fixture; 1 and 2 the day's member-called starts
  calledBy: { kind: 'member'; characterId: ObjectId; name: string } | { kind: 'secretary'; npcId: string },
  calledAt: Date, startsAt: Date,
  targetFactionId: FactionId | null,   // the Headline Story's target, frozen at the call (§22.1 Q7)
  seed: string,                        // 32 hex; never in a view before resolution
  roles: Array<{ roleId: string; holder: Holder | null }>,          // content order
  hands: Holder[],                     // ≤ 4, sign-up order
  rev: number,                         // +1 on every roster write
  status: 'open' | 'resolved' | 'calledOff',
  result: EventResolutionDoc | null,   // §6.2's resolution, minus the per-participant rewards (those are on the sign-ups)
  resolvedAt: Date | null,
  createdAt, updatedAt
}
Holder = { characterId: ObjectId; signupId: ObjectId; name: string; avatarId: string | null;
           rank: number; level: number; signedAt: Date }
```

Indexes:

- `{ factionId: 1, placeId: 1, day: 1, dayIndex: 1 }` **unique**: one fixture and two member starts a place a day;
- `{ factionId: 1, placeId: 1 }` **unique, partial** `{ status: 'open', kind: 'member' }`: one upcoming member-called event;
- `{ factionId: 1, cityId: 1, status: 1, startsAt: 1 }`: the board (open soonest first; results by `startsAt` descending), the venue tickets, the paper's row;
- `{ cityId: 1, day: 1 }` partial `{ status: 'open' }`: the city day's catch-up before a boundary;
- `{ 'calledBy.characterId': 1, day: -1 }` partial `{ 'calledBy.kind': 'member' }`: the paper's *called off*, the report.

### 5.2 `eventSignups` — new (ADR 0036)

```ts
{
  _id: ObjectId,
  eventId: ObjectId, characterId: ObjectId, factionId, typeId, cityId, placeId,
  day: DayKey, startsAt: Date,                         // the event's, denormalised for the indexes
  slot: string,                                        // a role id, or 'hand'
  caller: boolean,                                     // the tap that called the event
  energy: number, restedCovered: number,
  orderBonus: boolean,                                 // the event order was open and this tap advanced it
  idempotencyKey: string, signedAt: Date,
  tap: PoliticalResult,                                // the tap's modal (Called / Signed up), returned on a retry
  status: 'committed' | 'withdrawn' | 'resolved',
  withdrawnAt: Date | null, refund: { energy: number; rested: number } | null,
  result: SignupResultDoc | null,                      // written at resolution (§6.2: outcome, rewards, pc rate, win,
                                                       //  heat, points, actor share, firstToday)
  receipt: EventResult | null,                         // the modal, written at credit (§10.1)
  creditedAt: Date | null,
  createdAt
}
```

Indexes:

- `{ characterId: 1, idempotencyKey: 1 }` **unique** (the tap's key; ADR 0002's fast path);
- `{ eventId: 1 }`;
- `{ characterId: 1, day: 1, startsAt: 1 }`: *first event today*, the paper's facts, the report.

### 5.3 `chatMessages`, `chatReports`, `chatLimits` — new (ADR 0039)

```ts
chatMessages {
  _id: ObjectId,
  channel: string,                     // 'party:collective' | 'city:collective:coalport'
  factionId: FactionId, cityId: string | null,
  kind: 'member' | 'system',
  characterId: ObjectId | null, name: string | null, avatarId: string | null, rank: number | null,   // a snapshot
  text: string | null,                 // member lines: ≤ 280 code points, normalised (§6.4)
  system: { kind: SystemLineKind; payload: Record<string, unknown>; to?: ObjectId; ref?: string } | null,
  idempotencyKey?: string,             // member lines
  dedupeKey?: string,                  // system lines: 'called:{id}', 'result:{id}', 'held:{stayId}', 'nudge:{event}:{from}:{to}', …
  at: Date
}
SystemLineKind = 'eventCalled' | 'eventResult' | 'takenIn' | 'admitted' | 'bailPosted' | 'seatWon' | 'heroNamed' | 'nudge'
```

Indexes: `{ channel: 1, at: -1, _id: -1 }` (history) · `{ at: 1 }` **TTL 7 days** · `{ characterId: 1, idempotencyKey: 1 }` unique partial `{ kind: 'member' }` · `{ dedupeKey: 1 }` unique partial `{ dedupeKey: { $exists: true } }` · `{ 'system.to': 1, at: -1 }` partial `{ 'system.to': { $exists: true } }` (the *for you* dot).

```ts
chatReports { _id, messageId, channel, reporterId, reportedId, text, context: ChatLineView[] /* ≤ 20 */, createdAt }
chatLimits  { _id: characterId, recent: Date[] /* the last 30, oldest first */, last: { hash: string; at: Date } | null,
              posts: number, firstAt: Date | null, days: number, lastDay: DayKey | null }   // the report's counters
```

`chatReports`: `{ messageId: 1, reporterId: 1 }` unique; `{ createdAt: -1 }`. No TTL (slice 9's audit reads them).

### 5.4 `characters` — new embedded fields

```ts
{
  ...slice 5,
  presence: { locationId: string | null, seenAt: Date | null },          // ADR 0040; never bumps `version`
  events: {
    open:   Array<{ signupId: ObjectId; eventId: ObjectId; cityId: string; startsAt: Date; slot: string; energy: number }>,  // ≤ 3
    calls:  Array<{ eventId: ObjectId; startsAt: Date }>,                // calls the caller withdrew from (≤ 3)
    unseen: Array<{ kind: 'result' | 'calledOff'; eventId: ObjectId; signupId: ObjectId | null }>,   // ≤ 10, oldest dropped
  },
  chat: { hidden: boolean, seenAt: Date | null },
  mutes: ObjectId[],                                                    // ≤ 200
  nameWords: string[],                                                  // lower-cased words of the name (the search)
}
```

Indexes added: `{ factionId: 1, 'presence.seenAt': -1 }` (Members, the plate count, the chat header) · `{ 'presence.locationId': 1, 'presence.seenAt': -1 }` partial `{ 'presence.locationId': { $type: 'string' } }` (*Here now*) · `{ factionId: 1, nameWords: 1 }` (the search).

### 5.5 Changed collections

- **`stays`** (slice 5's placeholders filled): `bailPostedBy: { characterId, name, at: Date, iron: number } | null`; `visits: Array<{ characterId, name, at: Date, counted: boolean }>`; `how` += `'bailPosted'`. Index `{ 'bailPostedBy.characterId': 1, 'bailPostedBy.at': -1 }` partial (the payer's paper).
- **`influenceLedger`**: `LEDGER_KINDS` += `'event'`; `ref` = the event id.
- **`contributions`**: `kind` += `'faction'`; new optional fields `period: 'week' | 'all'`, `bracket: 1 | 2 | 3`, `events: number`. Scope `faction|{factionId}|w{weekDay}|{cityId}` / `…|all|{cityId}` with `cityId` a city or `all` (ADR 0042). Index `{ scope: 1, bracket: 1, amount: -1, lastAt: 1 }`.
- **`requestLogs`**: `REQUEST_KINDS` += `events.withdraw`, `favours.postBail`, `favours.visit`.
- **`paperEntries`**: the stored headlines gain the event set.

### 5.6 Migration `010-slice6-together.ts`

`ensureIndexes()` runs it after 009 (renumbered 14 Oct 2026: review 4 took 008 and the voting rework 009). Idempotent: each step filters on the field's absence or uses natural keys.

1. **Characters** (`presence` absent): `presence: { locationId: null, seenAt: '$lastActionAt' }`, `events: { open: [], calls: [], unseen: [] }`, `chat: { hidden: false, seenAt: null }`, `mutes: []`, `nameWords` from `name` (a code loop: lower case, split on non-letters).
2. **Faction scopes** (none exist): all-time totals per character per city and in all, from `contributions` of kind `influence`; this week's from `influenceLedger` rows of the week with a character source whose faction is the row's faction and `swing > 0`. `events: 0`. Bracket from the character's Level.
3. **Today's fixtures** for every council city (`ensureFixtures`), so the deploy day has its event.
4. `ensureIndexes` creates the five collections and the new indexes first (no new unique index is on a field the migration adds).

A test runs 010 twice (no change the second time) and checks the backfilled week against a ledger fold.

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants

```ts
export const EVENTS = {
  startsInHours: [1, 3, 6, 12], withdrawBeforeMs: 3_600_000,
  hands: { max: 4, energy: 5 }, namedRoleRank: 2, callRank: 3, maxOpenSignups: 3,
  perPlaceDay: { memberStarts: 2, memberOpen: 1 },                  // + the fixture = three starts
  volunteer: { score: 0.5, firedUp: 0.75 },
  bands: [ { min: 0.875, band: 'triumph', m: 1.5 }, { min: 0.625, band: 'success', m: 1 },
           { min: 0.375, band: 'mixed', m: 0.5 }, { min: 0, band: 'fiasco', m: 0 } ],
  roleScore: { success: 1, partial: 0.5, failure: 0 },
  fillCap: 1.25,
  xp: { perEnergy: 5, byRoll: { success: 1, partial: 0.5, failure: 0.2 },
        handByBand: { triumph: 1, success: 1, mixed: 0.5, fiasco: 0.2 } },
  fxp: { perEnergy: 0.8, byBand: { triumph: 1.5, success: 1, mixed: 0.5, fiasco: 0.25 } },
  pc: { triumph: 15, success: 10, mixed: 6, fiasco: 3, laterShare: 0.5 },          // halves up: 8 / 5 / 3 / 2
  momentumByBand: { triumph: 1, success: 1, mixed: 0.5, fiasco: 0 }, doubleMomentum: 2,
  grandRallyHeat: 5, rivalHeldAbove: 50,
  resultsKept: 10,
} as const;                                                                         // design §2, GDD §16.3
export const PRESENCE = { hereNowMs: 600_000, touchEveryMs: 60_000, trainWindowMs: 600_000, namesShown: 2 } as const;
export const CHAT = { maxLength: 280, keep: 200, page: 50, ttlDays: 7,
                      minGapMs: 3_000, window: { ms: 600_000, max: 30 }, repeatMs: 60_000, maxMutes: 200 } as const;
export const FAVOURS = { bail: { fxp: 10 }, visit: { energy: 3, health: 10, minutes: 5, counted: 3,
                         minStayMinutes: 5, fxp: 10 } } as const;                   // design §9
```

### 6.2 `events.ts`

```ts
export type EventBand = 'triumph' | 'success' | 'mixed' | 'fiasco';
export const eventDifficulty = (t: { difficulty: { home: number; capital: number } }, role: CityRole) => number;
export const bandFor = (score: number): { band: EventBand; m: number };   // ≥ 0.875 · ≥ 0.625 · ≥ 0.375 · else
export const volunteerScore = (firedUpAtHome: boolean) => 0.5 | 0.75;
export function fillOf(i: { roleEnergy: readonly number[]; memberRoleEnergy: number; handsEnergy: number }): number;
//  min(1.25, (members' named Energy + hands' Energy) ÷ all named Energy)
export function eventSwing(i: { base: number; m: number; fill: number; factors: readonly SwingFactor[] }):
  { requested: number /* thousandths */; product: number };
//  base × m × fill × Π(1 + pct/100), full precision, rounded once to three decimals (§14.4); 0 on a Fiasco
export function splitEqually(total: number, n: number): number[];
//  integer thousandths; floor each, the remainder one each to the first in roster order; Σ = total exactly
export const startsAtFor = (now: number, hours: 1 | 3 | 6 | 12) => number;   // now + h, up to the next whole minute
export const withdrawUntil = (startsAt: number) => startsAt - EVENTS.withdrawBeforeMs;
export const canWithdraw = (startsAt: number, now: number) => now < withdrawUntil(startsAt);
export function fixtureFor(i: { day: DayKey; factionId: FactionId; rotation: readonly [string, string, string];
  districts: readonly string[] /* by n */ | null }): { typeId: string; districtId: string | null };
//  (day + factionIndex) mod 3; the capital's district day mod 5
export const fixtureStartsAt = (day: DayKey) => dayStart(day + 1);
export function callGate(i: { rank: number; inOpenCity: boolean; held: boolean; inTransit: boolean;
  runInPending: boolean; rivalGround: boolean; typeFactionId?: FactionId; factionId: FactionId;
  districtOk: boolean; openSignups: number }):
  null | { reason: 'RANK' | 'WHERE' | 'HELD' | 'IN_TRANSIT' | 'RUN_IN_PENDING' | 'RIVAL_GROUND'
                   | 'NOT_YOUR_EVENT' | 'WRONG_DISTRICT' | 'TOO_MANY_SIGNUPS'; need?: number };
export function signUpGate(i: { slot: string; rank: number; energy: number; cost: number; sameCity: boolean;
  held: boolean; inTransit: boolean; runInPending: boolean; onEvent: boolean; openSignups: number;
  slotFree: boolean; started: boolean }):
  null | { reason: 'RANK' | 'NOT_ENOUGH_ENERGY' | 'WRONG_CITY' | 'HELD' | 'IN_TRANSIT' | 'RUN_IN_PENDING'
                   | 'ALREADY_ON_EVENT' | 'TOO_MANY_SIGNUPS' | 'ROLE_TAKEN' | 'HANDS_FULL' | 'EVENT_STARTED'; need?: number };
export function roleCheck(i: { role: { stats: CheckStatSpec }; values: Stats; difficulty: number;
  standingSuccesses: number; actionType: string; m: Modifiers; prefer?: TrainableStat }): CheckBreakdown;
//  computeCheck with Standing (+3 a level), the close race (+5, political types) and `chancePct` sources by type:
//  the bonuses a tier-1 action of `actionType` at the venue gets (`placeCheckBonuses` + Standing + sources)
export const opinionUpTo = (base: number, factors: readonly SwingFactor[]) => number;   // base × 1.5 × Π, one decimal
export const heatInRivalHeld = (shares: OpinionShares, factionId: FactionId) => boolean;  // a rival above 50
export function refundEnergy(p: EnergyProjection, energy: number, rested: number, restedCap: number): EnergyState;
//  the regen's overflow rule: Energy up to max, the excess to Rested; Rested + its own refund, capped (§22.1 Q4)

export interface EventParticipantInput {
  characterId: string; signupId: string; slot: string /* role id */ | 'hand';
  energy: number; restedCovered: number; orderBonus: boolean;
  firstToday: boolean;                                   // computed by the server from eventSignups (§8.2)
  values: Stats;                                         // worn CHA
  standingSuccesses: number;                             // Local Standing in the event's city
  prefer?: TrainableStat;                                // the faction's bonus stat (best-stat ties)
}
export interface ResolveEventInput {
  type: CampaignEventTypeSpec; cityRole: CityRole; factionId: FactionId;
  homeFactionId: FactionId | null;                       // the city's (floors; morale)
  participants: EventParticipantInput[];                 // roles in content order, then hands in sign-up order
  modifiers: Modifiers;                                  // ADR 0030 place modifiers of the venue for the event's faction
  tagged: ReadonlyArray<{ docId: string; issueId: string; name: string }>;
  shares: OpinionShares;                                 // the place's meter now
  targetFactionId: FactionId | null;                     // againstLeader
}
export interface EventResolution {
  calledOff: boolean;
  roles: Array<{ roleId: string; holder: { characterId: string; signupId: string } | null;
                 check: CheckBreakdown | null; roll: number | null;
                 outcome: Outcome | 'volunteer'; score: number }>;
  score: number; band: EventBand; m: number; fill: number;
  swing: { base: number; factors: SwingFactor[]; requested: number /* thousandths */ };
  opinion: { mode: 'persuade' | 'against'; applied: number; shares: OpinionShares;
             toActor?: number; toNeutral?: number; taken?: number; targetFactionId?: FactionId };
  participants: Array<{
    characterId: string; signupId: string; slot: string;
    outcome: Outcome | null;                             // the holder's roll; null for a hand
    rewards: Rewards;                                    // xp (Rested part), fxp (band, order, close race, Fired up, sources), iron 0
    pc: { amount: number; rate: 'full' | 'half' };
    win: boolean;                                        // a named role's Success
    heat: number;                                        // 5 or 0
    share: { actor: number; target: number };           // thousandths (target ≤ 0, against only)
    points: Array<{ docId: string; points: number }>;   // momentum per tagged Issue
  }>;
}
export function resolveCampaignEvent(i: ResolveEventInput, stream: (name: string) => Rng): EventResolution;
//  no member participant → calledOff; per held role one roll from stream('role:' + roleId) (named streams: the roster
//  doesn't move another role's roll); empty roles score the volunteers; S = mean; band; fill; swing by
//  `swingFactors(actionType, factionId, m, tagged)`; persuasion by applyPersuasion (Neutral first), against by
//  applyAgainst on the target (slice 5); the applied total split equally by `splitEqually`; rewards by `eventRewards`
export function eventRewards(i: { slot: 'role' | 'hand'; energy: number; outcome: Outcome | null; band: EventBand;
  restedCovered: number; orderBonus: boolean; fxpShares: readonly LineShare[]; firstToday: boolean }):
  { rewards: Rewards; pc: { amount: number; rate: 'full' | 'half' } };
//  §5.5 rounding: base and each part halves up separately; XP 5 × E × (roll or the hand's band factor), Rested part
//  0.5 × restedCovered/E; Party XP 0.8 × E × the band's factor with the order's 0.25 and `rewardShares(type)` lines;
//  PC by band, × 0.5 halves up after the first
export interface EventCredit { gains: GainResult; standing: { before; after } | null; standingUp; heat: ReturnType<typeof addHeatAt> | null }
export function eventCredit(i: { result: SignupResultDoc; character: { xp; level; fxp; rank; pc; statPointsPending;
  standingSuccesses: number; heat: HeatTimer }; startsAt: number; now: number; rateOn: (d: DayKey) => number }): EventCredit;
```

### 6.3 `presence.ts`

```ts
export type PresenceBand = 'hereNow' | 'online' | 'today' | 'thisWeek' | 'away';
export function presenceBand(seenAt: number | null, now: number, sameCity: boolean): PresenceBand;
//  < 10 min: hereNow (same city) or online; same City Day: today; < 7 days: thisWeek; else away
export function visibleTo(viewer: FactionId, x: FactionId, placeHomeFactionId: FactionId | null): boolean;
//  own faction always; otherwise only where the place is nobody's home (the capital) or x's own home
//  (a visitor on rival ground is invisible to all but their own faction, design §7)
export function hereNowLine(i: { me: string; mine: Array<{ id: string; name: string }>; others: number }):
  { names: Array<{ id: string; name: string }>; more: number; others: number; nobody: boolean };
export type MemberStatus =
  | { kind: 'cells' | 'infirmary'; placeName: string; minutes: number }
  | { kind: 'train'; to: string; minutes: number; deported: boolean }
  | { kind: 'rivalGround'; cityName: string } | null;
export function memberStatus(i: { held; journey; cityId; homeCityOf: (cityId) => FactionId | null; factionId; now;
  deportationMinutes: (from, to) => number }): MemberStatus;
//  projects slice 5's lazy release: `until ≤ now` reads as out, or as on the train home after a rival-ground arrest
//  review 5: a pending patrol card shows nothing (it is not a status; the member is where they stand)
```

The status line's words come from `copy.when` (review 4), as the cells and the journey do: *in the cells at Harbour Police · out in 24 min*, *on the train to Irongate · arrives in 8 min*. `minutes` is what `copy.when` words; no clock time is printed.

### 6.4 `chat.ts`

```ts
export const partyChannel = (f: FactionId) => `party:${f}`;
export const cityChannel = (f: FactionId, cityId: string) => `city:${f}:${cityId}`;
export function channelsOf(f: FactionId, chatCities: readonly string[]): string[];   // party + one per open city
export function parseChannel(id: string): { kind: 'party'; factionId } | { kind: 'city'; factionId; cityId } | null;
export function normaliseChatText(raw: string):
  { ok: true; text: string; hash: string /* fnv-1a of the lower-cased text */ } | { ok: false; reason: 'empty' | 'tooLong' };
//  NFC; control characters and bidi overrides (U+202A–202E, U+2066–2069) removed; newlines to spaces; trimmed;
//  ≤ 280 code points
export function chatRateCheck(i: { recent: readonly number[]; last: { hash: string; at: number } | null;
  hash: string; now: number }): null | { reason: 'tooFast' | 'tooMany' | 'repeat'; retryAt: number };
export function systemChannelFor(i: { factionId; placeCityId: string; residenceCityId: string; chatCities }): string;
//  the place's city branch if it is one of the faction's channels, else the residence city's (§22.1 Q12)
```

### 6.5 `favours.ts`, and slice 5's timers

```ts
export function bailFavourGate(i: { payer: { factionId; iron: number; id }; mate: { factionId; id;
  held: { kind; state; until: number; bail: { total } | null } | null }; now: number }):
  null | { reason: 'NOT_A_MATE' | 'SELF' | 'ALREADY_OUT' | 'NOT_IN_CELLS' | 'NOT_ENOUGH_IRON'; need?: number };
export function visitGate(i: { visitor: { factionId; id; energy: number; held: boolean; inTransit: boolean;
  rivalGround: boolean; runInPending: boolean }; mate: { factionId; id; held }; visits: ReadonlyArray<{ characterId }>;
  now: number }): null | { reason: 'NOT_A_MATE' | 'SELF' | 'ALREADY_OUT' | 'NOT_IN_INFIRMARY' | 'ALREADY_VISITED'
  | 'NOT_ENOUGH_ENERGY' | 'HELD' | 'IN_TRANSIT' | 'RIVAL_GROUND' | 'RUN_IN_PENDING' };
export function visitEffect(i: { since: number; until: number; now: number; counted: number }):
  { counted: boolean; until: number; minutesOff: number; health: number };
//  the first three visits: until − 5 min, never below since + 5 min nor below now; +10 Health; later: grapes only
health.ts  += healHealth(t: HealthTimer, now: number, amount: number): HealthTimer   // damage − amount ≥ 0, `at` on the tick grid
heat.ts    += addHeatAt(t: HeatTimer, gain: number, at: number, now: number, rateOn): ReturnType<typeof addHeat>
//  the gain as if added at `at` (the event's start): exact when `t.at ≤ at`; else the gain less what would have
//  cooled between `at` and `t.at`
```

### 6.6 `scoreboard.ts`

```ts
export function factionScopes(f: FactionId, cityId: string, day: DayKey): [string, string, string, string];
//  faction|f|w{weekOf(day)}|{city}, …|w{week}|all, …|all|{city}, …|all|all (ADR 0042)
export const scopeFor = (f: FactionId, period: 'week' | 'all', cityId: string | null, day: DayKey) => string;
```

### 6.7 Changed functions

| Function | Change |
|---|---|
| `ActionKind`, `ACTION_KINDS` | += `'event'` |
| `orderMatches(m, a, ctx)` | an `event` descriptor matches only when `m.kinds` includes `'event'` (so *Canvass in Coalport* never counts a canvass drive; design §2.7 "the roles' types match nothing else") |
| `feedMatches(m, a)` | accepts `kind: 'event'` (type = `actionType`, the venue, its kind, district) |
| `selectHeadlines` | the event conditions (§11.2) |
| `computeRewards` neighbours | a shared `partsLine(base, shares)` (base and each part halves up on their own; no outcome factor) used by `eventRewards` |
| `applyGains` | unchanged; called by the credit and the favours |

`computeCheck`, Energy and the City Day are unchanged.

### 6.8 Types: views, results, errors

All in `types.ts` (§8.3, §10). `GameErrorReason` gains:

- events: `EVENT_NOT_FOUND`, `EVENT_STARTED`, `EVENT_CLOSED`, `ROLE_TAKEN`, `HANDS_FULL`, `ALREADY_ON_EVENT`, `TOO_MANY_SIGNUPS { max: 3 }`, `RANK { need }`, `NOT_YOUR_EVENT`, `WRONG_DISTRICT { districtId }`, `ONE_AT_A_TIME { eventId, startsAt }`, `BRANCH_HANDS_FULL { cityId }`, `WITHDRAW_CLOSED { committedFrom }`, `NOT_SIGNED_UP`, `UNKNOWN_EVENT_TYPE`, `UNKNOWN_ROLE`;
- favours: `NOT_A_MATE`, `SELF`, `ALREADY_OUT`, `ALREADY_VISITED`, `RIVAL_GROUND`;
- chat: `CHAT_RATE { reason, retryAt }`, `CHAT_TEXT { reason }`, `CHAT_CHANNEL`, `CANNOT_REPORT`, `NUDGE_NOT_ALLOWED`, `NUDGE_NOTHING_OPEN`.

`PoliticalAct` += `call`, `signUp`, `bailPosted`, `visit`, `calledOff`. `PoliticalResult.view` += `{ kind: 'event'; event: EventPageView }` and `{ kind: 'member'; member: MemberRowView }`. Slice 5's `released` act gains `postedBy: { name } | null`.

### 6.9 Tests (Vitest, `packages/rules/test`)

- **Bands and score:** the edges 0.875 / 0.874, 0.625 / 0.624, 0.375 / 0.374; three roles (sixths), four (eighths), five (tenths); design §2.6's four-role examples; **a lone member on the four-role fixture**: Success 0.625; Partial 0.5 (Mixed); Failure 0.375 (Mixed); *Fired up* 0.8125 and 0.6875 (both Success); Poster Night's lone Failure 0.333 (Fiasco); a Triumph needs three holders.
- **Fill and swing:** economy §20.3's table to the thousandth: 0.250, 1.500, 4.219, 7.031; the cap at 1.25 (a Rally with four hands: 1.444 → 1.25); a Fiasco moves nothing.
- **Attribution:** `splitEqually` sums exactly over 5,000 random calls; 1.5 among four is 375 each; the remainder goes to the first in roster order.
- **Rewards:** economy §20.1 to the unit (15-Energy roles: XP 75 / 38 / 15, Rested **+38**; Party XP 18 / 12 / 6 / 3; a hand 25 / 25 / 13 / 5 and 6 / 4 / 2 / 1; PC 15 / 10 / 6 / 3 and 8 / 5 / 3 / 2); the order's +25 %, *close race* +25 %, *Fired up* +10 % each a part on the base.
- **Resolution:** determinism per seed; named streams (adding a hand or filling another role does not change a role's roll); `best` takes the highest of STR, INT, AGI with the faction tie; CHA worn; Standing +3 a level; the close race +5 for every event type (all political); volunteers 0.75 only at home while *Fired up*; no member → `calledOff`.
- **The Headline Story:** the target's leg, the actor's and Neutral's sum to zero exactly; the floors; nothing from a target at its floor.
- **The Grand Rally:** Heat 5 only where a rival holds the place above 50.
- **Momentum:** Triumph and Success full, Mixed half (halves up), Fiasco none; the General Strike double; two tagged Issues each.
- **Fixtures:** the rotation over six days × three factions; the capital's district by `n`; `fixtureStartsAt`.
- **Gates:** every refusal of `callGate` and `signUpGate`; `canWithdraw` at exactly an hour before (refused).
- **Refunds:** Energy below max back in full; above max the excess to Rested; Rested capped.
- **Presence:** the bands at 9:59 / 10:00 minutes and across a City Day; `visibleTo` for the nine faction × place cases; `hereNowLine` with 0, 1, 2 and 5 mates; `memberStatus` for cells, ward, train, a due release, a due rival-ground release (on the train home).
- **Chat:** normalisation (bidi, controls, newlines, 280 vs 281 code points, an emoji counts one); the three limits at their edges (2,999 / 3,000 ms; the 31st in ten minutes; a repeat at 59,999 / 60,000 ms, case-insensitive); channels.
- **Favours:** `visitEffect` for the first three visits and a fourth (grapes only), never below five minutes or now; `healHealth` keeps the tick; `addHeatAt` exact when `t.at ≤ at` and bounded otherwise; the gates.
- **Orders:** an `event` descriptor advances `dir.event` and nothing else (every slice 1–5 template run against it).

---

## 7. The read path and the guards (`apps/server`)

### 7.1 `loadCharacter(user, content, now, opts?)` v6

The order is §3.4's. `LoadedCharacter` gains `dueSignups` (the pointers due), so the services read them once. `placesOf(content, c)` adds the cities of due sign-ups.

- `ensureEventsResolved(content, c, now)`: for each due pointer in `events.open` and `events.calls` whose event is `open`, `eventService.resolve(content, eventId, now)`. One indexed read per due pointer; nothing when none is due.
- `ensureEventsCredited(content, c, now)`: for each due pointer in `events.open` (oldest `startsAt` first), `eventService.credit(content, c, signupId, now)`; for each due `events.calls` entry, pull it and, when the event is `calledOff`, push `{ kind: 'calledOff', eventId }` to `unseen`. A credit that loses its race (the version or `creditedAt` guard) re-reads and moves on.
- `touchPresence(c, now)`: `Character.updateOne({ _id, $or: [{ 'presence.seenAt': null }, { 'presence.seenAt': { $lt: now − 60 s } }] }, { $set: { 'presence.seenAt': now } })`, after the steps above, without `version`.

### 7.2 The guards

| Procedure | Refuses |
|---|---|
| `events.call` | `RANK { need: 3 }`, `HELD`, `IN_TRANSIT`, `RUN_IN_PENDING`, `PATROL_PENDING`, `RIVAL_GROUND`, `WRONG_CITY` (not an open city of the faction), `UNKNOWN_EVENT_TYPE`, `NOT_YOUR_EVENT`, `WRONG_DISTRICT`, `UNKNOWN_ROLE`, `NOT_ENOUGH_ENERGY`, `TOO_MANY_SIGNUPS`, `ONE_AT_A_TIME`, `BRANCH_HANDS_FULL` |
| `events.signUp` | `EVENT_NOT_FOUND` (another faction's too), `EVENT_STARTED`, `EVENT_CLOSED`, `RANK { need: 2 }` (a named role), `WRONG_CITY`, `HELD`, `IN_TRANSIT`, `RUN_IN_PENDING`, `PATROL_PENDING`, `NOT_ENOUGH_ENERGY`, `ALREADY_ON_EVENT`, `TOO_MANY_SIGNUPS`, `ROLE_TAKEN`, `HANDS_FULL`, `UNKNOWN_ROLE` |
| `events.withdraw` | `NOT_SIGNED_UP`, `WITHDRAW_CLOSED { committedFrom }` |
| `events.nudge` | `NUDGE_NOT_ALLOWED` (not on the event, the event started, not a mate, yourself, already on it), `NUDGE_NOTHING_OPEN` |
| `favours.postBail` | `NOT_A_MATE`, `SELF`, `NOT_IN_CELLS`, `ALREADY_OUT`, `NOT_ENOUGH_IRON` (from anywhere: held, in transit, rival ground and a pending patrol card are allowed; it is Iron, not an Energy act) |
| `favours.visit` | `NOT_A_MATE`, `SELF`, `NOT_IN_INFIRMARY`, `ALREADY_OUT`, `ALREADY_VISITED`, `NOT_ENOUGH_ENERGY`, `HELD`, `IN_TRANSIT`, `RIVAL_GROUND`, `RUN_IN_PENDING`, `PATROL_PENDING` |
| `chat.post` | `CHAT_CHANNEL`, `CHAT_TEXT`, `CHAT_RATE` (works held, in transit and on rival ground) |
| `chat.report` | `CANNOT_REPORT` (a system line, your own line, another faction's channel) |
| `faction.profile` | `NOT_FOUND` unless a faction mate |

Every guard is checked twice: before the key, so the client gets a clean refusal, and inside the transaction against the session's read. `HELD`, `RUN_IN_PENDING` and `PATROL_PENDING` come from slice 5's `notFree` (`apps/server/src/services/risk.ts`; review 5 added the patrol card, ADR 0081): *Visit · 3 Energy*, a call and a sign-up are Energy acts and wait for the card's one tap; *Post bail* is Iron from anywhere and never calls `notFree`.

---

## 8. API (`apps/server`)

### 8.1 Procedures

Every procedure is protected. No input names the caller's character. `Oid = z.string().regex(/^[0-9a-f]{24}$/)`; `Channel = z.string().regex(/^(party:(vanguard|collective|alliance)|city:(vanguard|collective|alliance):[a-z-]+)$/)`.

```ts
// The Faction tab
faction.hq         ()                                                      → FactionHqView
faction.members    ({ q: z.string().trim().min(1).max(40).optional(), cursor: z.string().max(80).optional(),
                      filter: z.enum(['all', 'hereNow']).default('all') }) → { rows: MemberRowView[]; next: string | null; total: number }
faction.profile    ({ characterId: Oid })                                  → ProfileView           // NOT_FOUND
faction.scoreboard ({ period: z.enum(['week', 'all']), cityId: z.string().min(1).nullable().default(null) })
                                                                           → FactionScoreboardView

// Campaign events
events.board       ()                                                      → EventBoardView
events.get         ({ eventId: Oid })                                      → EventPageView          // EVENT_NOT_FOUND
events.callSheet   ()                                                      → CallSheetView
events.call        ({ typeId: z.string().min(1), hours: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
                      roleId: z.string().min(1), districtId: z.string().min(1).nullable(), idempotencyKey: z.uuid() })
                                                                           → PoliticalResult (act 'call', view: event)
events.signUp      ({ eventId: Oid, slot: z.union([z.strictObject({ roleId: z.string().min(1) }), z.literal('hand')]),
                      idempotencyKey: z.uuid() })                          → PoliticalResult (act 'signUp', view: event)
events.withdraw    ({ eventId: Oid, idempotencyKey: z.uuid() })            → { event: EventPageView; character: CharacterView;
                                                                               refund: { energy: number; rested: number } }
events.nudge       ({ eventId: Oid, characterId: Oid })                    → { asked: true; already: boolean }
events.current     ()                                                      → { kind: 'result'; result: EventResult }
                                                                             | { kind: 'calledOff'; result: PoliticalResult } | null
events.result      ({ signupId: Oid })                                     → EventResult            // NOT_FOUND unless yours
events.seen        ({ eventId: Oid, signupId: Oid.nullable() })            → { character: CharacterView }   // idempotent $pull

// Favours
favours.postBail   ({ characterId: Oid, idempotencyKey: z.uuid() })        → PoliticalResult (act 'bailPosted', view: member)
favours.visit      ({ characterId: Oid, idempotencyKey: z.uuid() })        → PoliticalResult (act 'visit', view: member)

// Presence
presence.at        ({ locationId: z.string().min(1) })                     → HereNowView    // sets presence; no key (state)

// Chat
chat.channels      ()                                                      → ChatChannelsView
chat.history       ({ channel: Channel, before: Oid.optional() })          → ChatPageView    // ≤ 50, never past the 200th
chat.post          ({ channel: Channel, text: z.string().max(2_000), idempotencyKey: z.uuid() })   → ChatLineView
chat.seen          ()                                                      → { ok: true }    // chat.seenAt = now ($max)
chat.report        ({ messageId: Oid })                                    → { reported: true; already: boolean }
chat.mute          ({ characterId: Oid, muted: z.boolean() })              → { muted: string[] }
chat.setHidden     ({ hidden: z.boolean() })                               → { character: CharacterView }

// Changed
character.me → CharacterView v7 · city.get → CityView v6 · paper.today → PaperView v6
travel.journey → JourneyView + fellows · held.get → HeldView + visits, postedBy, signups
```

Refusals are `GameError`s with the §7.2 reasons (`PRECONDITION_FAILED`, `NOT_FOUND`, `CONFLICT KEY_REUSED / ACTION_CONFLICT`, and `TOO_MANY_REQUESTS` for `CHAT_RATE`).

### 8.2 Services

**`eventService.call`** (ADR 0002 shape via `runKeyedAction`; `stored()` = `EventSignup.findOne({ characterId, idempotencyKey })` → its `tap`, refused `KEY_REUSED` when the stored sign-up is not this call):

1. `loadCharacter`, then the §7.2 refusals; `resolveDue(place)` (the place's open member event, if due, so the partial unique index reflects the truth).
2. In the transaction:
   1. Re-read the character (version, `'day.settled': today`, held, run-in, transit, city). Energy ≥ the role's (lazy).
   2. `dayIndex` = 1 + the member events of the place with that `day` (read in the session); above 2 → `BRANCH_HANDS_FULL`.
   3. Insert the event (`seed` = 16 random bytes, `targetFactionId` for `againstLeader`: slice 5's `missionTarget('leader', …)` in the capital, the top rival by share in a home city). E11000 on the open index → `ONE_AT_A_TIME`; on the day index → retry (the second start) or `BRANCH_HANDS_FULL`.
   4. Insert the caller's sign-up; write the character (Energy, Rested, `events.open`, orders with the `event` descriptor, tally, `presence.locationId`); insert the *called* line.
3. After the commit, `eventScheduler().resolveAt(eventId, startsAt)` (best effort; tests inject a recorder).

**`eventService.signUp`** (same key shape): in the transaction, the event's slot with one conditional update:

```ts
CampaignEvent.updateOne(
  { _id, factionId, status: 'open', startsAt: { $gt: now },
    'roles.holder.characterId': { $ne: me }, 'hands.characterId': { $ne: me },
    ...(role ? { [`roles.${i}.holder`]: null } : { 'hands.3': { $exists: false } }) },
  { ...(role ? { $set: { [`roles.${i}.holder`]: holder } } : { $push: { hands: holder } }), $inc: { rev: 1 } }, { session })
```

A miss re-reads the event and names the refusal. Then the sign-up, the character (as the call) and nothing in chat. The write on the event document makes a sign-up and a resolution conflict, so a sign-up committed after the resolution's snapshot cannot be left out (ADR 0036).

**`eventService.withdraw`** (`withRequestKey('events.withdraw')`): `canWithdraw` (server clock), the slot back to `null` (guard: `holder.signupId`) or `$pull` from `hands`, the sign-up `withdrawn` with its refund, the character (`refundEnergy`, `events.open` −, tally energy − on the same City Day, and `events.calls` + when the withdrawer called it). The order item is left as it is (§22.1 Q3).

**`eventService.resolve(content, eventId, now)`** (ADR 0037; the job, the lazy paths and the city day call it; `resolveInTx` inside the city day's catch-up):

1. Read the event; nothing unless `status: 'open'` and `startsAt ≤ now`. `ensureCityDay(cityId, now)` first, except from inside the city day.
2. In the transaction: re-read (`status: 'open'`); read the roster's characters (stats, equipment, `localStanding`, `level`, `name`); read the city and, in the capital, the district; `placeModifiers` for the venue and the event's faction on the event's `day` (ADR 0030); the live Issues tagging an `event` descriptor at the venue; `firstToday` per participant (`EventSignup.exists({ characterId, day, status: { $in: ['committed', 'resolved'] }, $or: [{ startsAt: { $lt } }, { startsAt: =, eventId: { $lt } }] })`); `eventHooks()` (forced rolls, test only).
3. `resolveCampaignEvent(…, (name) => createRng(seed + ':' + name))`.
4. Writes:
   - **the event** (`status: 'open'` guard): `status`, `result`, `resolvedAt`;
   - **called off**: nothing else;
   - **the place**: the meter (`applyPersuasion` / `applyAgainst` result), the morale record when a threshold is crossed (ADR 0022);
   - **the ledger**: one row per member participant per leg (`kind: 'event'`, `ref` = the event id, the participant as source) via `writeLedger`;
   - **contributions**: `addInfluence` per participant (the place cycle and the four faction scopes, ADR 0042) and `$inc events` on the four faction scopes; `addPoints` per Issue;
   - **Issue momentum**: `$inc momentum.{faction}` guarded by `status: 'live'` (a miss means the Issue resolved first; impossible after §3.2's ordering, so it throws and retries);
   - **each sign-up**: `status: 'resolved'`, `result` (guard `status: 'committed'`);
   - **chat**: the *result* line in the event's city channel.

**`eventService.credit(content, c, signupId, now)`**: in one transaction, re-read the character (version, `'day.settled': today`) and the sign-up (`status: 'resolved'`, `creditedAt: null`); `eventCredit` (pure); `$set` xp, level, fxp, rank, pc, statPointsPending, `localStanding`, `heat`, tally (xp, fxp, pc, opinion); `$pull events.open`, `$push events.unseen` (`$slice: -10`); `$inc version`; the sign-up's `receipt` (§10.1) and `creditedAt`.

**`eventService.ensureFixtures(content, cityId, day, session?)`**: `fixtureFor` per faction that has a fixture there; `updateOne({ factionId, placeId, day, dayIndex: 0 }, { $setOnInsert: {...} }, { upsert: true })`; E11000 is success.

**`favourService.postBail`** (`withRequestKey('favours.postBail')`; ADR 0041): one transaction over the payer (version, Iron ≥ the stored `held.bail.total`, `$inc iron −total`, `applyGains` +10 Party XP, tally), the stay (`releasedAt: null`, `bailPostedBy: null` → `{ characterId, name, at: now, iron }`, `until: now`) and the prisoner (`'held.stayId'`, `'held.state': 'in'`, `'held.until': { $gt: now }` → `held.until = now`, `$inc version`), and the *bail posted* chat line. The prisoner's next read releases through slice 5's `ensureReleased` **as of now** with `how: 'bailPosted'` (no Iron from them, Heat 25, deportation on rival ground) and the release modal *Out, on the branch's Iron*.

**`favourService.visit`** (`withRequestKey('favours.visit')`): one transaction over the visitor (version, `'day.settled'`, Energy ≥ 3 lazily with **no Rested drawn**, +10 Party XP), the stay (`releasedAt: null`, `'visits.characterId': { $ne: visitor }` → `$push visits`) and the patient (version: `held.until` and `health` by `visitEffect` and `healHealth` when the visit counts).

**`chatService`** (ADR 0038, 0039):

- `post`: `normaliseChatText`; the channel is the caller's faction's; in one transaction, the limiter (`chatLimits.findOneAndUpdate` with the three guards as a filter, upsert; a miss reads the document and returns `chatRateCheck`'s reason) and the insert (`{ characterId, idempotencyKey }` unique; E11000 → the stored line).
- `system(session, line)`: the outbox insert used by every source (events, held, favours, the city day's count and heroes, the nudge); E11000 on `dedupeKey` is success.
- `history`: 50 before the cursor, never past the channel's 200th newest; each line's live button (`postBail` while the stay is open and the viewer is a mate, `visit` unless visited, `join` while the event is open, `seeResult` when resolved; one `$in` read per kind); `muted` from the viewer.
- `report`: a system line, your own line or another faction's channel is refused; insert `{ messageId, reporterId }` with the 20 lines around it in the channel (E11000 → `already`).

**`presenceService`** (ADR 0040): `at(c, locationId)` sets `presence.locationId` and `seenAt` (skipped when unchanged and fresh) and returns the place's `HereNowView` from `{ 'presence.locationId': L, 'presence.seenAt': { $gte: now − 10 min } }` with `visibleTo`; `cityCount(c)` for the plate; `fellows(journey)` over `{ to, boardedAt ± 10 min, status: 'onTheWay', from }`. Every action's transaction already writes the character: it adds `presence.locationId` to its `$set`; `travel.board` sets it to `null`; slice 5's `arrestInTx` and `admitInTx` set it to the service's place.

**`factionService`**: `hq` (the header counts, the residence's `OrdersView` with the event order's link, today's residence fixture as an `EventCardView`), `members` (§8.3; one page: the characters by `{ factionId, presence.seenAt }` (or the search), the week's faction scope for *+n this week*, live awards for the rosettes, the stays of held rows for the favour buttons, the viewer's open event and existing nudges for *Ask to join*), `profile`, `scoreboard` (per bracket the top ten by `{ scope, bracket, amount, lastAt }`, the rosette on three; the viewer's row and rank by a count; heroes in the period from `awards`).

**`actionService`, `missionService`, `travelService`**: `presence.locationId` in their `$set`; `addInfluence`'s four faction scopes come free (ADR 0042). **`heldService`**: `release` accepts `how: 'bailPosted'` (no Iron; the modal's `postedBy`); `arrestInTx` and `admitInTx` insert the *taken in* and *admitted* lines (`dedupeKey: 'held:{stayId}'`). **City day**: §9.

### 8.3 Views

```ts
interface CharacterView /* v7 */ {
  ...v6,
  events: { open: Array<{ eventId; signupId; name; venueName; cityId; startsAt: number; roleName: string;
                          energy: number; withdrawUntil: number }>;
            unseen: number };
  chat: { hidden: boolean; forYou: boolean };       // forYou: character.me only (an indexed exists)
  factionDot: boolean;                              // unseen > 0 || forYou
}
interface EventCardView {
  id; kind: 'member' | 'fixture'; typeId; name; art: AssetView;
  place: { cityId; cityName; districtId: string | null; districtName: string | null; venueId; venueName };
  startsAt: number; state: 'open' | 'settling' | 'resolved' | 'calledOff';
  filled: number; roles: number; hands: { k: number; max: 4 };
  calledBy: { kind: 'member'; name: string } | { kind: 'secretary'; name: string };
  tags: PlaceTagView[];                             // issue +50 %, close race +25 %
  you: { roleName: string } | null;
  action: 'join' | 'joinHand' | 'yours' | 'full' | 'settling' | 'elsewhere';
}
interface EventBoardView {
  here: { cityId; cityName; districtName: string | null; events: EventCardView[] };   // the capital: every district, yours first
  elsewhere: EventCardView[];                       // the faction's other cities, action 'elsewhere'
  mine: Array<EventCardView & { withdrawUntil: number; canWithdraw: boolean }>;
  results: Array<{ id; startsAt; name; venueName; band: EventBand | 'calledOff'; swing: number; members: number }>;
  call: { ok: true } | { ok: false; reason: 'RANK' | 'HANDS_FULL' | 'ONE_AT_A_TIME' | 'WHERE' | 'HELD' | 'IN_TRANSIT'
          | 'RIVAL_GROUND' | 'RUN_IN_PENDING' | 'PATROL_PENDING'; rank3Title: string; open?: { eventId; name; startsAt: number } };
}
interface EventPageView {
  id; kind; typeId; name; blurb; art: ResultArt; ground: GroundSashView;
  place: EventCardView['place']; startsAt: number; withdrawUntil: number; serverNow: number;
  state: EventCardView['state']; calledBy: EventCardView['calledBy'];
  pays: { opinionUpTo: number; againstFactionId: FactionId | null; pc: [3, 15] };
  tags: PlaceTagView[]; firedUp: boolean;           // "Fired up · better volunteers" (home only)
  roles: Array<{ roleId; name; stats: CheckStatSpec; energy: number; hint: string;
                 holder: { characterId; name; avatarId; rankTitle; you: boolean } | null;
                 forYou: { chance: number; stats: CheckStats /* best resolved */ } | null;   // open roles only
                 gate: { reason: 'RANK' | 'NOT_ENOUGH_ENERGY' | 'ALREADY_ON_EVENT' | 'WRONG_CITY' | 'TOO_MANY_SIGNUPS'
                                 | 'HELD' | 'IN_TRANSIT' | 'PATROL_PENDING'; need?: number } | null;
                 result: { outcome: Outcome | 'volunteer' } | null }>;
  hands: { holders: Array<{ characterId; name; avatarId; you: boolean }>; max: 4; energy: 5; gate: … | null };
  mine: { signupId; slot; roleName; energy; canWithdraw: boolean; committedFrom: number } | null;
  result: { band: EventBand; swing: number; members: number; volunteers: number } | null;
  yourResult: { signupId: string } | null;          // "See your result"
  nudge: boolean;                                   // you may ask mates (you are on it, an open role exists)
}
interface CallSheetView {
  where: { cityId; cityName; districtId: string | null; districtName: string | null };
  gate: EventBoardView['call'];
  options: Array<{ typeId; name; blurb; venueId; venueName; roles: EventPageView['roles']; energyOfRoles: number;
                   opinionUpTo: number; here: boolean; goTo: { districtName; venueName } | null }>;
  times: Array<{ hours: 1 | 3 | 6 | 12; startsAt: number }>;
}
interface MemberRowView {
  characterId; name; avatarId; rankTitle; level; residence: { cityName; districtName: string | null };
  band: PresenceBand; status: MemberStatus; heroes: string[]; movedThisWeek: number;
  favour: { kind: 'bail'; iron: number; affordable: boolean } | { kind: 'visit'; energy: 3; affordable: boolean;
          visited: boolean } | null;
  ask: { eventId; roleName: string; asked: boolean } | null;
  you: boolean;
}
interface ProfileView extends MemberRowView { memberSince: number; standingHere: { level: string } | null; muted: boolean }
interface FactionHqView { faction: { id; name }; rankTitle: string; members: number; hereNow: number;
  orders: OrdersView;   // with review 4's `off` (the day's orders taken off by an arrest), shown as on the city plate
  fixture: EventCardView | null }
interface FactionScoreboardView { period: 'week' | 'all'; cityId: string | null; cities: Array<{ id; name }>;
  brackets: Array<{ bracket: 1 | 2 | 3; rows: Array<{ characterId; name; level; moved: number; events: number;
                    heroes: number; rosette: boolean; you: boolean }> }>;
  you: { bracket; rank: number; moved: number; events: number } | null }
interface HereNowView { names: Array<{ characterId; name }>; more: number; others: number; nobody: boolean }
interface ChatLineView {
  id; channel; at: number; kind: 'member' | 'system';
  author: { characterId; name; avatarId; rank: number } | null; text: string | null;
  system: { kind: SystemLineKind; payload: Record<string, unknown>; to: string | null;
            button: { kind: 'postBail'; iron: number; characterId } | { kind: 'visit'; characterId }
                  | { kind: 'join'; eventId } | { kind: 'seeResult'; eventId } | null } | null;
}
interface ChatPageView { channel; lines: ChatLineView[]; more: boolean; muted: string[]; hereNow: number }
interface ChatChannelsView { channels: Array<{ id; kind: 'party' | 'city'; cityId: string | null; name: string;
  hereNow: number }>; current: string }
CityView += { factionHere: number };                // "{n} of the {faction} in town now"
LocationView += { events: EventTicketView[] };       // open events of your faction at this venue
JourneyView += { fellows: number | null };
HeldView += { visits: Array<{ name; at }>; postedBy: { name } | null;
              signups: Array<{ roleName; eventName; startsAt: number }> };
OrderView += { link?: { kind: 'event'; eventId } | { kind: 'board' } };
PaperView += { events: EventRowView[]; desk.signedUp: Array<{ eventName; venueName; startsAt; roleName }> };
```

### 8.4 The settlement v6 (`computeSettlement`)

1. **Reads added** (each by an index of §5): the sign-ups with `day = yesterday` and `status: 'resolved'`; the faction's events resolved yesterday in the residence city (for the city line, the latest one the reader did not join); the reader's member-called events called off yesterday; the reader's stays with `bailPostedBy.at` or a visit yesterday; the stays whose `bailPostedBy.characterId` is the reader, posted yesterday.
2. **Stored headlines:** the event facts (§11.2).
3. Nothing is credited by the settlement: the credit is §3.4 step 6, after it.

### 8.5 The socket (ADR 0038)

- `attachChat(app.server, { auth, content })` in `index.ts` after `buildApp` (the API process only): `new Server(httpServer, { path: '/api/socket.io', serveClient: false, maxHttpBufferSize: 1e4, allowRequest: sameOrigin })`.
- **Handshake auth:** Better Auth's `getSession` with the handshake headers (the same cookie the tRPC context reads); the character; joins `channelsOf(factionId)` rooms and `char:{id}`. No client→server events are handled. At most five sockets a user.
- **Fan-out:** `ChatMessage.watch([{ $match: { operationType: 'insert' } }])` in each API process; each insert is emitted to its channel's room as `chat:line` (`ChatLineView` without per-viewer buttons; the client asks for the button state on tap). On a stream error: log, Sentry, reopen after 1 s with the last resume token.
- **Dev and e2e:** the Vite proxy (`server.proxy` and `preview.proxy`) gains `ws: true` on `/api`. Same origin, cookies as tRPC (ADR 0001).
- **Production (recorded, not built):** Vercel rewrites cannot upgrade a WebSocket. At deploy: ADR 0001's option B (an API subdomain, the cookie on the parent domain) with the client socket on the API origin, `transports: ['websocket']` (no sticky sessions needed). Several API instances need nothing more: each runs its own change stream. Atlas tier: change streams are available on the shared tiers used here; verify at deploy.

### 8.6 Test hooks (only with `E2E_TEST_HOOKS`, memory mode)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/members` | `{ n: 1..8, rank?: 1..7, level?, cityId?, energy? }` | creates `n` **test members** of the caller's faction in the caller's (or the given) city: characters with `userId: 'test:{uuid}'` (no login) and `playtest.testMember: true`; returns their ids and names. The report leaves them out |
| `POST /api/test/events` | `{ startNow: Oid \| 'mine' }` · `{ fill: Oid, members: Oid[], as?: 'roles' \| 'hands' }` · `{ rolls: { eventId: Oid, byRole: Record<string, 1..100> \| 'success' \| 'failure' } }` · `{ call: { typeId, hours, roleId, as: Oid } }` | `startNow` sets `startsAt = now` on the event, its sign-ups and the holders' pointers (the next read resolves it); `fill` signs test members up through `eventService.signUp`; `rolls` is a memory map read by `eventHooks()` at resolution, consumed once; `call` calls as a test member |
| `POST /api/test/held` (slice 5, extended) | `{ send, characterId?: Oid }` | sends the caller **or a test member** to the cells or the infirmary of the city they are in |
| `POST /api/test/chat` | `{ as: Oid, channel, text }` · `{ resetLimits: true }` | a test member's line through `chatService.post`; clears the caller's limiter |
| `POST /api/test/presence` | `{ characterId: Oid, locationId: string \| null, seenAgoMs: number }` | sets a test member's presence |
| `POST /api/test/clock`, `/api/test/city-day` | unchanged | the fixture at a forced boundary |

### 8.7 The dev panel (README "Reviewing with the dev panel")

Each new button calls a hook above, then the existing settle. The panel holds no rule.

- **Faction:** *Rank 2*, *Rank 3* (Rank exists from slice 5's panel), *Three test members here*.
- **Events:** *Fill my event with test members* (roles, or hands), *Start my event now*, *Next rolls: all succeed / all fail / random*, *Run the boundary* (the fixture; the existing next-day button).
- **Favours:** *A test member to the cells*, *A test member to the infirmary*.
- **Chat:** *A test member says something*, *Clear my chat limits*.

`GET /api/test/dev/status` adds: open sign-ups (event, role, starts), events here (state, filled), today's fixture, unseen results, the chat limiter (recent posts, retry at), presence (`seenAt`, place).

---

## 9. Scheduled jobs (Agenda)

| Job | When | Does | Idempotency |
|---|---|---|---|
| `campaign-event-resolve` (new) | scheduled by the API after `events.call` commits, at `startsAt`, `unique` on `data.eventId` (a non-processing Agenda client, as `journey-arrive`) | `eventService.resolve(content, eventId, now)` | the `status: 'open'` guard; a run before `startsAt` does nothing; the lazy paths are the guarantee (ADR 0037) |
| `city-day` (extended) | 00:01 UTC and at worker start (ADR 0017) | per boundary *d*: **resolve every open event of the city with `day < d`** (each its own transaction), then the boundary, which **posts day *d*'s fixtures** in its transaction and inserts the *seat won* and *hero named* lines | `world.settledDay` guard; the fixture's natural key; the lines' `dedupeKey` |
| `chat-trim` (new) | daily at 00:30 UTC and at worker start | per channel (content: factions × (party + chat cities)), deletes lines older than the 200th newest | a delete by a computed bound; re-running deletes nothing. The TTL index removes lines after 7 days; the history read never shows past the 200th, so the job is storage hygiene only |
| `journey-arrive` | unchanged | — | — |

**No release job** (ADR 0041): slice 6's views project `held` lazily, so a mate's bail or a visit needs nothing written early.

---

## 10. The result modal: how the breakdown is produced

### 10.1 The event result (`EventResult`, `ResultModal kind="event"`, screens §5)

Built by `credit` from the sign-up's `result`, the event's `result` and the character's knock-ons, stored as the sign-up's `receipt` and returned unchanged by `events.current` and `events.result`.

| Field | What | Example (Market Row, Coalport; a Collective organiser in the Organiser role; four members) |
|---|---|---|
| `art`, `ground` | the type's scene (`art`), the ground sash of the venue (slice 4) | `scene.square` · *Collective ground* |
| `stamp` | `triumph \| success \| mixed \| fiasco` (the faction colour on Triumph, the failure colour on Fiasco) | *Triumph* |
| `place` | `{ cityName, districtName, venueName }`, `startsAt` | *Market Row · Coalport · Thursday 19:40* |
| `headline`, `body` | the type's text for the band | *The square was ours* |
| `roles[]` | `{ roleId, name, holder { name, you } \| null, outcome: success \| partial \| failure \| volunteer }`; `chance` and `roll` for dev and QA only | *Organiser · you · Success* |
| `reason` | under your row when not a Success, §8.4's plain cause from your check (`stat`, the stat's name); on a Fiasco, the roster's cause (`volunteers: k` or the weakest held role's stat) | — |
| `hands` | names | *Hands · J. Sorel* |
| `summary` | `{ cameOff, roles, volunteers }` | *4 of 4 roles came off* |
| `rewards.xp` | base + Rested part | *+50 · Rested +25* |
| `rewards.fxp` | base (band) + parts: *Triumph*, *Party order*, *Close race*, *Fired up*, sources | *+8 · Triumph +4 · Party order +2* |
| `pc` | `{ amount, rate }` | *+15 · first event today* |
| `opinion` | `{ factionId, placeName, total, share, before, after, mode, targetFactionId? }` | *+1.50 for the Collective in Coalport · your share +0.38 · Collective 84.0 → 85.5 %* |
| `issues[]` | `{ issueId, name, added }` | *+10 on the tram fares* |
| `effects.standing`, `standingUp` | the win in the city (a named Success) | *Reputation in Coalport · a win · 41 / 70* |
| `effects.heat` | the Grand Rally's +5 with the state (`addHeatAt`) | — |
| `effects.levelUp`, `rankUp`, `pc` | from `applyGains` | — |
| `next` | the residence's next fixture | *Next: the branch's event tomorrow is on the Faction tab* |
| `character` | the view after the credit (refreshed when read later) | |

No *Again* button. The client words odds and reasons from copy; no number of a check reaches the player.

### 10.2 The political modals (`ResultModal kind: 'political'`, design §11)

| Act | Stamp | Headline · body | Knock-ons | `view` |
|---|---|---|---|---|
| `call` | *Called* | *The branch has a {event} at {time}* | `energy`, `rested` | `{ kind: 'event' }` |
| `signUp` | *Signed up* | *You're the {role}* | `energy`, `rested`, the order line (+20 Party XP) | `{ kind: 'event' }` |
| `bailPosted` (the payer) | *Bail posted* | *{name} is out* | `iron { before, after }`, `fxp` +10 | `{ kind: 'member' }` |
| `visit` | *Visited* | *Grapes and the paper* | `energy` −3, `fxp` +10, the mate's line | `{ kind: 'member' }` |
| `calledOff` (the caller) | *Called off* | *Nobody came* | — | `{ kind: 'event' }` |
| `released` (slice 5, the prisoner) | *Released* | *Out, on the branch's Iron* (when `postedBy`) | `heat { before, after: 25 }`, *Bail {iron} Iron · posted by {name}* | `{ kind: 'held' }` |

---

## 11. The paper v6

### 11.1 Sections

- **Events** (new, live at read, under *Party orders*): the faction's open events in the residence city (the fixture first), one row each with *you're the {role}* or **Join**; on the welcome edition *join as a hand · 5 Energy*; empty: *No event in {city} today*. `ensureFixtures` runs first.
- **Your desk:** the *Signed up* row (from `events.open`, live).
- **In Print:** the stored event, bail and visit headlines.
- **The Unrest prize** (review 5, ADR 0082): when the branch's *Restore the base* orders are in the paper, the prize's award line sits with them (the award is review 5's `awards { kind: 'unrest' }`, credited by the settlement as today).

### 11.2 New headline conditions (design §10)

| Condition | Kind | Facts from |
|---|---|---|
| `eventOpenToday` → `event-today` (city 1) | live | the first open event of the faction in the residence city (`{caller}`, `{time}`, `{open}`, `{roles}`, `{district}`) |
| `eventResolvedYesterday { tookPart: true, outcome }` → `event-triumph`, `-success`, `-mixed`, `-fiasco` (In Print) | stored | the reader's sign-ups resolved yesterday (the best band; `{swing}`, `{pc}`, `{members}`) |
| `eventResolvedYesterday { tookPart: false }` → `event-city` (city 0) | stored | the faction's events resolved yesterday in the residence city, the reader not on them |
| `eventCalledOffYesterday` → `event-called-off` | stored | the reader's member-called events called off yesterday |
| `bailPostedForYesterday` → `bail-posted-for` (In Print) | stored | the reader's stay with `bailPostedBy.at` yesterday |
| `bailPostedByYesterday` → `bail-posted-by` | stored | stays whose `bailPostedBy.characterId` is the reader, yesterday |
| `visitedYesterday` → `visited` | stored | the reader's stay with visits yesterday (`{visitors}`) |

*Yesterday* is the event's `day`: the fixture of day *d* is in the paper of *d + 1*. The read order (§3.4) resolves yesterday's events before the settlement reads them.

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes

| Route | Screen | Data |
|---|---|---|
| `/faction?tab=orders\|events\|members\|scoreboard\|chat` | the Faction tab (screens §2). The first visit opens Events; the tab is remembered for the session. Desktop (≥ 1024): two columns, Chat persistent at the right | `faction.hq`, `events.board`, `faction.members`, `faction.scoreboard`, `chat.*` |
| `/faction/events/$eventId` | the event page (screens §3): open, signed up, committed, settling, resolved, called off | `events.get` (1 s tick for the countdown; refetch at `startsAt`) |
| sheets on `/faction` | *Call an event* (three steps), the profile, the favour | `events.callSheet`, `faction.profile` |
| `/paper`, `/me`, `/held`, `/city/…`, `/journey` | the *Events* row and desk row; *Chat* show/hide; the ward's visitors and the sign-up line; the venue ticket, *Here now*, the plate's count; *You and n others on this train*; *Post bail* on the own-party rows of *In the cells now* | as before, plus `presence.at` on a sheet's open |

- **The place sheet's card slot** (review 4, `docs/tech/review-4.md` §3.1): the event tickets (`EventTicket`) and the HQ card go into the sheet's `cards` array, after the Town Hall's blocks, built in `apps/client/src/routes/city.tsx` from the `LocationView` flags. No new sheet code.
- **`CellsNowCard`** (review 4, ADR 0078) gains *Post bail · {n} Iron* on the rows of the player's own party. It opens the same `FavourSheet` and calls the same `favours.postBail`; the rows come from `held.inCells` (the `held_cells_now` index), as today.

- `AppShell`: the *Faction* tab enabled, with a **dot** (`character.factionDot`).
- **The modal gate** (the `modalGate` pattern): the run-in (slice 5) first; then, while `character.events.unseen > 0`, `events.current` → `ResultModal kind="event"` (or the *Called off* political modal) → Continue → `events.seen`; then the orders-complete note.
- After any mutation the client renders the returned view and invalidates `character.me`, `events.board`, `events.get`, `faction.*`, `city.get`, `paper.today`, `held.get`.

### 12.2 `packages/ui` additions (plain props, no tRPC)

New: `FactionTabs`, `EventCard`, `EventPage`, `RoleRow` (a `StoryScreen` row), `HandsRow`, `CallEventSheet`, `TimeChips`, `EventResultRoles` (the *How it went* block), `MemberRow`, `MemberStatus`, `ProfileSheet`, `FavourSheet`, `ChatPanel`, `ChatLine`, `SystemLine`, `HereNowLine`, `EventTicket`. Changed: `ResultModal` (kind `event`), `CellsNowCard` (*Post bail* on own-party rows), `ScoreboardTable` (period, city filter, top ten with three rosettes, your row), `Paper` (*Events* row, desk row), `HeldScreen` (visitors, the sign-up line, *posted by*), `Plate` (the count), `HudBar` / `Shell` (the dot). `oddsBand` and `presenceBand` words come from `copy.ts`.

### 12.3 The socket client

- `useChatSocket()` connects (`io({ path: '/api/socket.io', withCredentials: true })`) **only while the Faction route is mounted and chat is not hidden**; disconnects on leave. On `chat:line` it appends to the channel's `chat.history` query data (dedup by id) and, when `system.to` is the player, invalidates `character.me`.
- On (re)connect it refetches the open channel's history (lines missed while away come from the history, never from the socket).
- The composer: 280 code points with the counter from 240; Enter sends on desktop; the limit lines read from `CHAT_RATE`; a double tap re-sends the same key.
- Muted authors are collapsed client-side (*Muted · {name}*, tap to show once).

### 12.4 Layout checks (screens §10)

On 375 × 667: the Faction header (120 px) and tab strip (44 px) above the content; on Events the *Call an event* button and the first card; on Members the search and three rows; on Chat the strip, four lines and the composer pinned above the tab bar (the keyboard pushes the lines, never the composer). The event page: the header band, the four tiles and the first role row above the sticky button. The result modal: art, stamp, headline and two role rows above the fold, *Continue* sticky. *Post bail · 1,600 Iron* never wraps in its 140 px column. A 280-character line wraps to at most eight lines at 360 px. Desktop: two columns (640 + 360), centred cards at 640 px, side sheets at 480 px. Matrix: 360 × 640, 375 × 667, 390 × 844, landscape, 1440 × 900.

**Double taps:** *Join*, a role's confirm, *Call it*, *Withdraw*, *Post bail*, *Visit*, *Ask to join*, *Send*, *Report* and *Continue* are disabled from the tap until the returned view renders; every mutation's key is made once per tap.

### 12.5 Copy and vocabulary

Screens §11's strings, the help notes, the system-line templates and design §11's modal texts go to `copy.ts`; event texts, hints and blurbs are content. Both QA vocabulary guards run on every new string with the *front page* allowance (§4.2). No player-facing string says *co-op, NPC, resolve, roster, schedule, WebSocket, presence, ledger, directive*, a percentage for odds, or a roll.

---

## 13. Art (ADR 0007, 0015)

| Asset id | Source (`art-direction/mvp/`) | Kind · widths | Used for |
|---|---|---|---|
| `scene.event-poster-night` | `scenes/event-poster-night.png` (new, 2688 × 1520) | scene · 640, 1280 | Poster Night: the board card, the event page, the result |
| `scene.event-grand-rally` | `scenes/event-grand-rally.png` (new, 2688 × 1520) | scene · 640, 1280 | the Grand Rally |
| `scene.square` · `scene.street` · `scene.newsroom` · `scene.news-strike` | existing (`news-strike` catalogued by slice 5 at 2048 × 1360) | scene | the Rally · the Canvass Drive · the Headline Story · the General Strike |
| `scene.union-hq` · `scene.vanguard-office` · `scene.alliance-hq` | existing | scene | the Faction tab's header per faction |
| avatars (18), `portrait.holm`, `.stahl`, `.grey`, `.duty-officer` (slice 5's id for `sergeant.png`), `.matron` | existing | — | chat, members, the fixture's caller, the favours' modals |

- **Wiring:** the two catalogue entries (alt texts ≤ 160 from design §18: *A poster crew at night at a long fence: a bucket, a brush, a stack of blank sheets under a street lamp, a printer's handcart.* · *A main square full at dusk under strings of lamps, seen from the back of the crowd: a timber stand, plain striped bunting, the fortress wall beyond.*); each event type's `art` names its scene; the loader checks the kind. The game designer confirms the alt texts against the pictures (T6's *Done when*).
- **Content policy:** checked (design §18): posters blank, bunting plain stripes, no flag, symbol, torch or armband. The art build's review list records it.
- **Budget:** two scenes (~0.3 MB at two widths) on top of the cap slice 5 raises under ADR 0015's per-slice rule; measured after `pnpm art:build` and recorded in the Deviations. No new ADR.
- **Maps:** none.

---

## 14. Security

| Threat | Guard |
|---|---|
| Predicting a role's roll and choosing the role | **A secret seed** on the event, never in a view before resolution; named streams per role. The event id is public and is not the seed |
| Signing up after the start, or after the resolution read the roster | The sign-up's conditional write on the event (`status: 'open'`, `startsAt > now`) conflicts with the resolution's write; one of them retries and sees the other |
| A double sign-up, two roles on one event, a fourth hand, a fourth sign-up | The slot's guard, `$ne` on the member in the filter, `hands.3` absent, `events.open` < 3 under the version guard; the tap's unique key |
| Withdrawing at the last second for a free result | Withdrawal closes an hour before by the server clock; the result needs a committed sign-up |
| Banking Energy above the bar by sign-up and withdrawal | The refund follows the regen's overflow rule (§6.2) |
| Calling a fourth start, two open events | Unique natural keys (ADR 0036); no counter to race |
| Seeing another faction's events | Every event read filters on the caller's faction; another faction's id is `EVENT_NOT_FOUND` |
| A crafted favour on a stranger, double bail, endless visits | Faction match, `bailPostedBy: null`, `releasedAt: null`, `held.until > now`, `visits.characterId` absent, request keys; nothing moves between accounts |
| Chat: spoofed author, other channels, floods | The author is the session's character; the channel must be the faction's; the limiter is one atomic document; text normalised (bidi and control characters removed), rendered as text, links never linked |
| Socket hijacking | Same-origin check on the handshake (`allowRequest`), the session cookie (`SameSite=Lax`), server-assigned rooms, no client→server events, five sockets a user, a 10 kB buffer |
| Presence leaks | Other factions as a count only; rival-ground visitors invisible; no ids of other factions in any view; the profile has no record, Heat, Health, Iron or stats |
| Report abuse | Once per reporter per line; reports change nothing automatically |
| Test members in production | `E2E_TEST_HOOKS` requires memory mode; test members are flagged and left out of the report |

---

## 15. Testing

| Layer | What |
|---|---|
| Rules | §6.9 |
| Content | The real data validates. A failing fixture for every §4.2 check: a venue of the wrong kind, a venue in a second quarter, two venues for one event and city, a signature event in two capital districts, a capital difficulty ≠ home + 2, a `best` role with two stats, an `event` kind beside another kind, an unknown art id. Word-for-word comparisons with both design documents. The vocabulary guards with *front page* |
| DB | The five collections' indexes; migration 010 twice; the faction backfill against a ledger fold; a transaction over `characters`, `campaignEvents`, `eventSignups`, `cities`, `districts`, `influenceLedger`, `contributions`, `issues`, `chatMessages` commits; **a change stream on `chatMessages` delivers an insert committed in a transaction** on the memory replica set |
| Server — events | call: limits by natural keys (a third member start refused; two concurrent calls → one open), the district rule, the target frozen; sign-up: every gate, two members racing for one role → one holder, a fourth hand refused, a member on two slots refused; withdraw: refund (overflow rule), an hour before refused at the boundary millisecond, the caller's withdrawal keeps the event; the order advanced at the tap only by an `event` template |
| Server — resolution | the job, the lazy event read, the participant's read and the city day each resolve once (four runners in parallel → one result); a sign-up racing the resolution at `startsAt` is either in the roster or refused `EVENT_STARTED`, never paid for nothing; called off; the fixture resolved before the boundary with its swing before the drift and its momentum before Monday's resolution; the Headline Story's legs; the Grand Rally's Heat only in a rival-held district; contributions and the four faction scopes |
| Server — credit | each participant credited once (two parallel reads); `firstToday` across three events and the fixture (full, half, half); Heat as of the start for a member who comes back a day later; Standing win; level and rank up; the modal pointer; the called-off modal for a caller who withdrew |
| Server — favours | bail by a mate: the prisoner released on their next read as of the bail (Heat 25), deported on rival ground with the journey from then, the payer's Iron and +10 Party XP, a second payer refused, the prisoner's own bail racing it → one release; a visit: +10 Health, five minutes off, the fourth visitor counted as grapes, a stay never under five minutes or before now, the same visitor twice refused |
| Server — chat | post: the three limits at their edges, the repeat, a retry with the same key → one line; history: 50 a page, never past the 200th, live buttons; report with context once; mute; the socket: a second client in the faction receives a line within 1 s, another faction's client does not, an unauthenticated handshake is refused, a cross-origin handshake is refused; a line inserted by a second process (the worker) reaches the socket |
| Server — presence | the touch once a minute without a version bump (a concurrent action still commits); *Here now* with visibility on rival ground and in the capital; the plate count; the members' bands and status (a due release reads as out) |
| Server — views and paper | the board's groups (the capital's districts all *here*); the venue ticket; the call sheet's `goTo`; the scoreboard by period and city with the brackets; each §11.2 headline from its facts; the *Events* row on the welcome edition |
| Server — integration (T17) | a week for one branch per faction on the test clock: calls, sign-ups, withdrawals, the fixture every night, a member in the cells bailed by a mate, a visit, chat. Boundary races: a sign-up at 23:59:59 for the fixture; a member event at 23:30 whose resolution runs inside the boundary; an event of Sunday against Monday's Issue resolution; the worker down for a day (all resolved by reads and the next boundary). Run ten times in a row |
| UI | fixtures for every new component and state: cards (join, hand, yours, full, settling, elsewhere), the event page in all six states, roles with odds and gates, the call sheet steps, the event modal for each band with and without hands, the member row with each status and favour, the profile, the chat line kinds (muted, for you, system with each button), the scoreboard with your row below the top ten |
| E2E | §15.1 |

### 15.1 E2E specs (each in its own Playwright project after slice 5's, in this order)

**`events.spec.ts`** (phone):

1. A fresh Collective (A) at Rank 3 and a second (B) at Rank 2 in another browser context (hooks), both in Coalport.
2. A: Faction → Events: the fixture card (*called by Secretary Holm · the branch's event*), **Call an event** → *Rally · Market Row* → *In 3 hours* + *Speaker* → **Call it · Speaker · 15 Energy** → *Called*. Back on the board, the call sheet's button is replaced by *One at a time: the branch's rally at {time} is still open*.
3. B: the board shows the rally (*1 of 4 roles*); open it; *Organiser · Good odds · Intelligence* (no digit anywhere); select, **Organiser · 10 Energy** → *Signed up*. The button reads **Withdraw · 10 Energy back**: withdraw (the HUD's Energy returns), then sign up again.
4. Clock + 2 h 30 min (hook): B's page reads *Committed from {time}* and no button. Hooks: rolls all succeed, start now. A reloads: the result modal (the band the roster gives: two Successes and two volunteers), *How it went* with both names and *2 went to volunteers*, the receipt; Continue. B reloads: the same event, B's own receipt.
5. A fresh Rank 1 (C): the welcome edition's *Events* row *join as a hand · 5 Energy* → the fixture → **Join as a hand · 5 Energy**.
6. `POST /api/test/clock` to the boundary, `POST /api/test/city-day`: C reloads → the fixture's result modal; the paper's *In Print* line (*The Branch's canvass drive Comes Off at Foundry Row*).

**`faction.spec.ts`** (phone, then desktop):

1. A and B (two contexts) on Faction → Chat: A posts *who's on the rally tonight*; B sees it **live** within 2 s without a reload (the socket through `vite preview`'s proxy); a fourth line within three seconds reads *One message every three seconds*.
2. B mutes A from A's profile: A's lines collapse to *Muted · {name}*. B reports a line: *Reported*, once.
3. Members: A *here now · Coalport* first; the profile shows no record, Heat, Health, Iron or stats.
4. Scoreboard: *This week* and *All time*, the city chips, B's row highlighted.
5. Me → hide chat: the Chat chip is gone (desktop: the column is gone).
6. Desktop (1440 × 900): Chat is a persistent column beside Events.

**`favours.spec.ts`** (phone):

1. B to the cells (hook). A: the chat's *taken in* line with **Post bail · {n} Iron**, the Members row in the failure colour; **Post bail** → the sheet → **Post bail** → *Bail posted*.
2. B reloads: *Released · Out, on the branch's Iron*.
3. B to the infirmary (hook). A: **Visit · 3 Energy** → *Visited*; B's ward shows *Visitors: A* and the minutes moved; A again → *You've visited this stay*.
4. A presses *Ask to join* on B's row while A has an open event: B's chat shows the line *for you* with **Join**.

### 15.2 Playtest report: together (design §16 Q9)

`pnpm report:playtest` gains a **together** section: a pure builder in `packages/db/src/together.ts` with fixture tests, reading `campaignEvents`, `eventSignups`, `stays`, `chatLimits`, `characters` and `actionLogs` (test members and boosted testers left out).

- **Events:** called per day, by members and by the secretary; outcomes' distribution; called off; **the fill rate per role and of member-called events** (the design's number to watch); hands per event and by Rank (Appendix C #57's alt check: hands from accounts under three days old).
- **Sign-ups:** per member per day; withdrawals (and those whose tap completed the event order, §22.1 Q3); the share of D7 players who joined an event (GDD §27 target ≥ 40 %).
- **The return rate:** members active the City Day after a sign-up against members who did not sign up that day (**the slice's question**).
- **Political Capital** from events per member per day (Appendix C #59).
- **Chat:** lines per member per day, the share of members who never opened chat (`chat.seenAt` null), reports, mutes.
- **Favours:** bails posted (Iron), visits (counted, grapes only), nudges and how many led to a sign-up on that event.

---

## 16. QA playtest checklist (the slice question, in play)

Run on `pnpm dev:mem` with the dev panel; testers in one faction where possible, test members to fill the rest.

- [ ] **Day 1 as a Recruit:** the welcome paper's *Events* row; join the fixture as a hand in two taps; nothing asks you to come back at a time; the next morning a result modal and a line in the paper.
- [ ] **A named role (Rank 2):** the board's card, odds words on every open role, no digit; *Signed up*; *Withdraw · 10 Energy back* gives the Energy back; inside the last hour *Committed from …*.
- [ ] **Calling (Rank 3):** three steps; the chat line; *Ask to join* on three mates; *The branch has its hands full* at the fourth start.
- [ ] **Away at the start:** close the game before an event starts, come back hours later: one modal per event, in order, each with *How it went* and a receipt; the paper has it.
- [ ] **In the cells or on the ward at the start:** the held screen says you were counted; the result waits.
- [ ] **Volunteers:** a lone member on a four-role drive gets a Success with *three went to volunteers*; a Triumph needs a roster.
- [ ] **The Faction tab:** Orders with the fixture; Members with *here now* first and the status lines; the scoreboard; chat live between two players; mute and report; hide chat.
- [ ] **Favours:** bail a mate from another city; visit a mate on the ward; both modals; the mate's release and ward lines.
- [ ] **Here now:** two testers at Market Row see each other by name; a rival visitor is not counted.
- [ ] **Being away costs nothing:** three days away with three sign-ups: every Energy point paid something; nothing owned was lost.
- [ ] **Do players feel part of a team, and do they come back for the group's events?** Ask:
  - Did you come back to see an event's result?
  - Did you join an event because someone asked?
  - Did the volunteers feel fair, or like a participation prize?
  - Did you use chat, and would you miss it?

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| **The read path grows again** (resolve, credit, presence) | Pointers on the character (`events.open`, `events.calls`); no query when nothing is due; the presence touch once a minute. Measured in T8: the read path adds no query for a character with no sign-up |
| **Late resolution** (worker down) changing the inputs | Every participant's read resolves before their acts; the city day resolves an earlier day's events before its boundary; factors are day-constant. The integration suite runs with the worker off |
| **Multi-document transactions at resolution** (event, place, ledger, contributions, Issues, sign-ups, chat) contending with actions on the place | The same place document every action writes; resolutions are at most three a place a day; `txAttempts` in the report |
| **Four more contribution upserts per opinion row** (ADR 0042) | Each on the actor's own documents (no contention); measured in T9; the fallback is two scopes with the city filter read from the `all` documents |
| **Change streams** in dev memory mode and later on Atlas | A DB smoke test in T7; a stream error reopens; lines missed during a gap come from the history on reconnect |
| **The socket in production** (Vercel cannot proxy WebSockets) | Recorded in ADR 0038 with the option-B plan; nothing in the game depends on the socket |
| **Chat abuse before slice 9's tools** | Faction-only channels, the limits, mute, report with context, hide; a closed local playtest |
| **Exploits:** the event order by sign-up and withdrawal; alts as hands; Energy banking | §22.1 Q3 with the report's count; Appendix C #57 with the report's account-age split; the overflow rule |
| **Presence writes** on the hot character document | No version bump; once a minute; a transient conflict retries the action's transaction (driver) |
| **Transcription volume**: 6 types (blurbs, 24 outcome texts, 25 role hints), 27 venues, 40 headlines with decks, ~190 copy strings | Word-for-word comparison tests against the design documents |
| **E2E with two contexts and a socket** | The chat panel exposes `data-socket="connected"`; the spec waits for it before posting |

---

## 18. Idempotency and atomicity summary

- **`events.call`, `events.signUp`:** the tap's key, unique on `eventSignups { characterId, idempotencyKey }` (the stored `tap` returned on a retry) + the character's version and `'day.settled': today` + the event's conditional slot write + the natural keys of §5.1. One transaction.
- **`events.withdraw`:** `withRequestKey` + `canWithdraw` + the slot's `signupId` guard + the sign-up's `status: 'committed'` + the version.
- **Resolution:** `campaignEvents.status: 'open'` → `resolved | calledOff`, with every world write in one transaction; sign-ups `committed → resolved`; the chat line's `dedupeKey`. Any number of runners resolve once.
- **Credit:** `eventSignups.creditedAt: null` + the character's version, in one transaction; the modal pointer `$push` with it. `events.seen` is a `$pull` to a target state.
- **The fixture:** a natural-key upsert; posted once whoever runs first.
- **Favours:** `withRequestKey` + the stay's `releasedAt: null` and `bailPostedBy: null` (or `visits.characterId` absent) + the mate's `held.stayId`, `held.state: 'in'`, `held.until > now` + both versions, in one transaction. The release itself is slice 5's guarded release.
- **Chat:** a post's `{ characterId, idempotencyKey }`; the limiter's atomic filter; system lines' `dedupeKey`; a report's `{ messageId, reporterId }`; mutes `$addToSet` / `$pull`; `chat.seen` `$max`.
- **Presence:** conditional `$set`s to a target state; no key.
- **Everything from slices 0–5:** unchanged.

---

## 19. Deliberately left out of slice 6

| Left out | Why / where |
|---|---|
| The officers' channel; the Chair's faction-wide events and orders | Slice 7 (the Chair) |
| Town Hall (Recall signatures) | Slice 7 with recall petitions |
| Case Files on the Headline Story (+50 %, the named NPC) | Slice 8 (the Dossier) |
| Seeing rival events; counter-demonstrations | Slice 8 (the barman's report); v1.1 |
| Moderator roles, timeouts, bans, word filters, the report audit, appeals | Slice 9 (Appendix C #7) |
| Private messages, mentions that notify, push notifications | Not in the design; `@name` is plain text |
| Carriage chat; recognition by fame on rival ground | Later (ADR 0025's leg window is ready for it) |
| Events on rival ground or in second quarters; Clearwater | Design §2.1, §3.7; slice 7 |
| Iron from events | Design §2.7 (accepted default) |
| A tidy job for releases | Not needed: views project `held` (ADR 0041) |
| Deploying the socket (Vercel, the API domain, sticky sessions) | Local only (ADR 0038) |

---

## 20. Task list (in order; each task leaves `pnpm lint typecheck test` green and is one commit)

**Before T1:** slice 5 is built and its Deviations are read (names this design leans on: `held`, `stays`, `addHeat`, `projectHealth`, `applyAgainst`, `missionTarget`, `ensureReleased`, `heldService.release`). The two scenes are in `art-direction/mvp/scenes/`.

**Parallel lanes.**

- **Phase A:** T1 first. T2 needs T1. T3 can start after T1 (alongside T2). T4 needs T3's types; T5 needs T4. T6 runs alongside T4–T5. T7 needs T3's types and runs alongside T4–T6.
- **Phase B:** T8 first. T9 and T10 in parallel. T11 needs T10; T12 needs T11. T13 and T14 start after T8 and run alongside T10–T12. T15 needs T12 and T13. T16 needs T12–T14. T17 last.
- **Phase C:** UI T18 can start after T3, on fixtures, alongside phase B. T19 needs T10; T20 needs T11, T12 and T8; T21 needs T9 and T13; T22 needs T14; T23 needs T15 and T13. Then T24 and T25.

### Phase A — rules, content, art, db

**T1. Rules: the event's maths.** `EVENTS`, `eventDifficulty`, `bandFor`, `volunteerScore`, `fillOf`, `eventSwing`, `splitEqually`, `startsAtFor`, `withdrawUntil`, `canWithdraw`, `fixtureFor`, `fixtureStartsAt`, `refundEnergy`, `opinionUpTo`, `heatInRivalHeld`. *Done when:* the band edges, economy §20.3's four swings to the thousandth, the split's exact sum over 5,000 calls, the fixture rotation over six days × three factions and the refund cases pass.

**T2. Rules: `resolveCampaignEvent`, `eventRewards`, `eventCredit`, the gates, `roleCheck`.** *Done when:*
- economy §20.1 passes to the unit (Rested **+38**);
- the lone-fixture cases, determinism per seed and the named streams pass;
- the Headline Story's legs sum to zero exactly; the Grand Rally's Heat and the General Strike's double momentum pass;
- every `callGate` and `signUpGate` refusal has a test.

**T3. Rules: orders, Issues, presence, chat, favours, scoreboard, paper; types and errors.** `ActionKind += 'event'` and `orderMatches`, `feedMatches`, `presence.ts`, `chat.ts`, `favours.ts`, `healHealth`, `addHeatAt`, `scoreboard.ts`, the event headline conditions and `EVENT_PLACEHOLDERS`, §6.8 and §8.3's types. *Done when:* §6.9's presence, chat, favours and orders tests pass and `pnpm typecheck` is green across the repo.

**T4. Content: schemas, accessors, cross-checks.** §4.1–§4.2, the `GameContent` accessors, a failing fixture for each check. *Done when:* every §4.2 check has a failing fixture and the existing content validates (the new arrays empty until T5).

**T5. Content: the data.** `data/events.ts` (six types, 27 venues, the rotation), the three orders, ten headlines per paper with decks, copy and help notes, the *front page* allowance. *Done when:* the word-for-word tests against both design documents pass, the venue-kind check passes with §22.1 Q1's default (or the designer's answer), and both vocabulary guards pass.

**T6. Art.** The two catalogue entries, the types' `art`, `pnpm art:build`, the budget measured and recorded. *Done when:* `art:check` passes, the dev viewer shows both scenes, and the designer has confirmed the alt texts and the content-policy read.

**T7. DB.** The five models, the changed fields and enums (`characters`, `stays`, `contributions`, `influenceLedger`, `requestLogs`), the indexes of §5, migration 010. *Done when:* migration 008 run twice changes nothing the second time, the week's backfill equals a ledger fold, a transaction over every touched collection commits, and the change-stream smoke test passes on the memory replica set.

### Phase B — the server

**T8. Server: the read path v6 and presence.** `loadCharacter` §3.4 with stubs for resolve and credit, `touchPresence`, `presence.at`, *Here now*, the plate count, the train count, `presence.locationId` in every act's `$set`, the guards of §7.2 that do not need events. *Done when:* every slice 1–5 server test and e2e spec passes unchanged, the read path adds no query for a character with no sign-up, and the presence tests pass (a concurrent action commits through a touch).

**T9. Server: the faction scopes and the Faction tab's reads.** `addInfluence`'s four scopes, `faction.hq`, `faction.members` (search, pages, bands, status, the favour and ask fields stubbed until T13 and T10), `faction.profile`, `faction.scoreboard`. *Done when:* an action, a mission, a journey card and a ledger fold give the same weekly total; the scoreboard's brackets and your row pass; the members list's ordering and statuses pass.

**T10. Server: calling, signing up, withdrawing; the board.** `ensureFixtures`, `events.call`, `signUp`, `withdraw`, `nudge`, `board`, `get`, `callSheet`, the venue ticket in `city.get`, the event order at the tap, the job scheduled after a call. *Done when:* the events tests of §15 pass (limits, races, refunds, the order) and a refusal writes nothing.

**T11. Server: resolution.** `eventService.resolve` with every world write, the `campaign-event-resolve` job, the lazy paths (event reads, the participant's §3.4 step 4, the city day's catch-up before a boundary and the fixtures posted in the boundary), called off, the *called* and *result* lines. *Done when:* the resolution tests of §15 pass, including four runners → one result and the fixture before the drift and Monday's Issues.

**T12. Server: the credit and the modals.** `ensureEventsCredited`, the called-off modal, `events.current`, `result`, `seen`, the receipt of §10.1. *Done when:* the credit tests pass (once, first-today, Heat as of the start, level and rank) and a member away three days with three sign-ups gets three modals in order.

**T13. Server: favours.** `favours.postBail` and `visit`, slice 5's release with `how: 'bailPosted'` and the modal's payer, the held view's visitors and sign-up line, the *taken in*, *admitted* and *bail posted* lines. *Done when:* the favours tests pass, including the prisoner's own bail racing a mate's → one release.

**T14. Server: chat.** `chat.*`, the limiter, the outbox for every system line (events, held, favours, the city day's seats and heroes, the nudge), `attachChat` with the handshake auth and the change-stream fan-out, `chat-trim`, the Vite proxy's `ws: true` (dev and preview). *Done when:* the chat tests pass, including a line from a second process reaching a socket and a cross-origin handshake refused.

**T15. Server: the settlement and the paper v6.** The *Events* section (live, `ensureFixtures` first), the desk's *Signed up* row, the stored headlines' facts, `event-today` live, the orders' link. *Done when:* each §11.2 headline is produced from its facts in a test and the welcome edition's *Events* row reads *join as a hand · 5 Energy*.

**T16. Server: test hooks and the dev panel.** §8.6–§8.7, test members. *Done when:* `devPanel.test.ts` covers each new button and status field, and the hooks and test members are absent without `E2E_TEST_HOOKS`.

**T17. Server: the integration suite.** §15's week and boundary races, with the worker off for a day. *Done when:* it passes ten times in a row.

### Phase C — the client, e2e, report, docs

**T18. UI package.** §12.2's components and changes with fixtures and smoke tests. *Done when:* each fixture test passes and the existing UI tests pass.

**T19. Client: the Faction tab and events.** `/faction` with the five tabs (Chat a stub until T22), Orders with the fixture, the board, `/faction/events/$eventId` in every state, sign-up and withdrawal, the call sheet's three steps, the tab bar's dot. *Done when:* `events.spec.ts` passes to step 3 and the event page's and call sheet's layout checks pass.

**T20. Client: the result modal and the map's presence.** The modal gate (event results, *Called off*), `ResultModal kind="event"`, the venue's `EventTicket`, `HereNowLine` on sheets (via `presence.at`), the plate's count, the journey's line. *Done when:* `events.spec.ts` passes end to end and the result modal's layout check passes.

**T21. Client: Members, the profile, favours, the scoreboard.** *Done when:* `favours.spec.ts` passes to step 3 and `faction.spec.ts` steps 3–4 pass.

**T22. Client: chat.** `ChatPanel`, `useChatSocket`, the composer and its limit lines, system lines and buttons, mute, report, *New lines ↓*, the desktop column, Me's *Chat* switch. *Done when:* `faction.spec.ts` and `favours.spec.ts` pass in full.

**T23. Client: the paper and the held screens.** The *Events* row, the desk row, *In Print* lines, the ward's visitors, the cells' line, *posted by* on the release modal, the sign-up line on both held screens. *Done when:* the paper's and held screens' fixtures and the e2e lines they assert pass.

**T24. E2E, vocabulary, report.** The three Playwright projects after slice 5's, the vocabulary test over slice-6 strings, §15.2's *together* section with a pure builder. *Done when:* the whole e2e suite is green locally and a report run after it prints every *together* section.

**T25. Docs.** The README (new hooks and buttons; walk-throughs of a first event as a hand, calling one, bailing a mate, chat between two browsers), the **Deviations** section at the end of this file, ADR statuses, the GDD edits for any answered §22.1 question that changes a number. *Done when:* the README's steps reproduce each walk-through from a fresh `pnpm dev:mem`.

---

## 21. Answers to the design's questions (design §16)

1. **Events in content.** As suggested, with four changes: `factionId` on a signature event (who may call it); `art` per type (a scene); `runningName` for `{event}` in running text; **`hands` in rules, not content** (always four). Rates, bands, volunteer scores and limits are in rules (`EVENTS`). `resolveCampaignEvent` is pure and seeded **by a secret seed stored on the event**, not its id: the id is in the route, and a public seed would let a player compute their roll and choose the role it wins (ADR 0036).
2. **The collection.** `campaignEvents` with the roster embedded, as suggested. Two refinements (ADR 0036):
   - the sign-ups also get **their own collection**, `eventSignups`: the commitment, the tap's idempotency record, the per-participant result and receipt, and the history the scoreboard, the paper's facts and the report read;
   - the per-place limits are **unique natural keys** (`{ factionId, placeId, day, dayIndex }` and a partial unique on open member events), not counters on the city document: exact under races, and no write to the document every action in that city contends on.
   The sign-up is one transaction as you list it; the three-sign-up count is `events.open` on the character under its version guard.
3. **Resolution.** The job at `startsAt` and the lazy path on any read, as suggested, plus **the city day resolves every open event of an earlier day before its boundary** (so a day's swing lands before the drift, the count and Monday's Issues). One change (ADR 0037): **the resolution writes the world, not the participants.** Each sign-up gets its result; each participant's own read credits it (XP, Party XP, PC, level, Standing, Heat as of the start) and queues the modal (`events.unseen`, your `pendingEventResults`). This keeps ADR 0020's rule that the world never writes a character, avoids version conflicts on up to nine players at once, and lands the gains in a settled day's tally. The fixture is posted by the city day at each boundary (and ensured on reads), and resolved by the next.
4. **Presence.** As suggested, minus `cityId` (the character's `cityId` already is it). `seenAt` is touched by `loadCharacter`, not the auth middleware (it needs the character), **without a version bump**. `presence.at` also returns the place's *Here now* line, so opening a sheet is one round trip. Your index plus `{ factionId, presence.seenAt }` (ADR 0040).
5. **Chat.** `chatMessages` with your channel ids, a 7-day TTL, `chatReports`, mutes on the character, Socket.IO rooms, system lines as messages, as suggested. Decisions (ADR 0038, 0039): **posting is a tRPC mutation** (one auth, validation, idempotency and test path) and Socket.IO only pushes; **fan-out is a MongoDB change stream** in each API process, which also carries the worker's lines and needs no adapter or Redis for several instances; the 200 cap is enforced on read and trimmed daily; a `chatLimits` document per poster makes the limits atomic without writing the character; system lines are outbox inserts in the transaction that caused them, with a `dedupeKey`. ADR 0001's proxy is tested with `ws: true` in dev and e2e; production is recorded.
6. **Favours.** One transaction across the two characters and the stay, with request keys, as suggested. One change (ADR 0041): **bail by a mate sets the stay's end to now; slice 5's release path releases the prisoner on their next read**, as of then (Heat 25, deportation on rival ground). One release path, and the release modal names the payer. The visit moves `held.until` and heals, guarded by the visit list, as suggested.
7. **The Faction tab.** `faction.hq` (header, orders, the fixture), `events.board`, `faction.members` (paged), `faction.scoreboard({ period, cityId })`, `faction.profile({ characterId })` with public fields only. The scoreboard does **not** fold the ledger on read (ADR 0028's rule): it reads **faction-scoped contribution totals** written with every opinion row (ADR 0042).
8. **The paper.** As suggested: *Events* live; the event, bail and visit facts read at the settlement from the sign-ups, events and stays (stored headlines, as slices 3–5).
9. **The playtest report.** §15.2, with your two numbers: the return rate after a sign-up, and the fill rate of member-called events.
10. **Test hooks.** §8.6: test members (so one tester can fill a roster), start now, forced rolls, fill, cells and ward for a test member, chat as a test member. The e2e flows you asked for are §15.1, the fixture at a forced boundary included.
11. **The vocabulary test.** Against the two guards as they stand: *rally, strike, picket, steward, security, lookout, stand, the movement, row on row* match neither regex. **`front page`** needs an allowance. *sergeant* is gone (slice 5 settled *the duty officer*; the slice-6 texts were reworded with it). Nothing else matches.

---

## 22. Questions

### 22.1 For the game designer (each has a default so the build doesn't wait)

**Settled 3 Oct 2026** (`docs/design/slice-6-together.md` §20): every default below is taken except **Q6** (the capital's district stays client memory and the call names it) and **Q17** (the Grand Rally's two *Steward* roles are **Usher**, ids `usher-1`, `usher-2`); **Q13** is confirmed as written. Each item carries its settlement.

1. **Three Poster Night venues are not of its kinds** (`street, station, docks, press, ministry`): `ashford.university` (*university*), `irongate.tram-junction` (*square*), `irongate.gate-tavern` (*bar*). **Default:** add `university`, `square` and `bar` to Poster Night's kinds (the venue table was chosen per place). The alternative is other venues. **Settled: the default**; Poster Night's `venueKinds` gains `university`, `square`, `bar`.
2. **The Rested part.** Design §2.7, screens §5 and economy §20.1 print *+75 · Rested +37*; §5.5's rounding (halves up) gives **+38**. **Default: 38**; please correct the examples. **Settled: 38**; the examples are corrected.
3. **The event order and withdrawal.** The order counts at the tap; a member can sign up, take the +20 Party XP and withdraw for the Energy. **Default:** the order stays carried out (orders never go backwards anywhere in the game); the report counts it. The alternative is that a sign-up which completed the order cannot be withdrawn that City Day. **Settled: the default** (the order stays carried out).
4. **Withdrawal above a full bar.** "Returned in full": a member at full Energy who withdraws would go above the bar. **Default:** the regen's overflow rule: Energy to the bar, the rest to Rested, Rested capped. **Settled: the default.**
5. **A called-off fixture.** **Default:** not listed under *Results* and no paper line (no caller); member-called events that are called off are listed. **Settled: the default.**
6. **"The district you're in" in the capital** (calling; the call sheet's *go there to call it*). **Default:** the district of the place you last opened or acted at, else your residence district, else Station & Market. The server holds you to it. **Settled: not the default.** The district is client memory (GDD §14.13), as for every capital action: `events.call` and `events.callSheet` take a `districtId`; the server checks only that the caller is in Irongate and that the venue is in the named district (`callGate.districtOk` means that); nothing stored holds a member to a district. `presence.locationId` is not used for this.
7. **The Headline Story's target.** Design §3.6 says *the rival leading at the last boundary*. **Default:** frozen at the call (the page shows *against the {faction}* and that is what happens): in the capital slice 5's *leader, or the runner-up when it is the Alliance*; in Ashford the rival with the larger share at the call. **Settled: the default** (`targetFactionId` stored on the event at the call).
8. **Ordinance and Issue effects on events.** **Default:** the roles' checks, Party XP and the swing take every line an action of the event's `actionType` at the venue would (Standing, close race, `chancePct`, `fxpPct`, `swingPct`, the comeback, Issues: design §2.6's list plus the comeback and ordinances, as GDD §16.3 says). Cost effects (*Rally Permits*) **do not** change a role's Energy, which the members' share is counted in. **Settled: the default.**
9. **Who may nudge, and for what.** Design §9.3 reads "while the member has an open event". **Default:** any member signed up to an open event with a free place may ask a mate not on it, once per pair per event; the line names the first open named role the mate may take, or **a pair of hands** when only a hand's place suits them (a new copy string: *{caller} asks {name} for a pair of hands at the {event} · {time}*). **Settled: the default**; the string is in screens §11.
10. **Visits and Rested.** **Default:** a visit draws no Rested (it pays no XP), like slice 5's *Walk out well*. **Settled: the default.**
11. **Chat cities.** **Default:** a faction's branches are its home city and Irongate (three channels with *Party*); a member on rival ground reads their residence city's branch by default. **Settled: the default** (three channels per faction).
12. **Where a system line goes** when the place is not one of the faction's branches (taken in on rival ground). **Default:** the residence city's branch. **Settled: the default.**
13. **The capital's fixtures.** Design §4 puts all three factions' capital fixtures in the same district each day (`dayKey mod 5`). **Default:** as written; confirm it is meant (the alternative offsets the district by the faction, like the type). **Settled: confirmed as written** (the three branches meet on the same ground; the offset is the lever if it reads as a stalemate).
14. ***First event today* and the fixture.** **Default:** the fixture counts as its posting day's event and, starting at midnight, is that day's last; *first* is by start time among your committed events of the day. **Settled: the default.**
15. **The scoreboard's rows.** §6.4 says the top three carry the rosette but not how many rows. **Default:** the top ten of each bracket, the rosette on three, and your own row below when you are outside them. **Settled: the default.**
16. **When event gains land in the tally.** **Default:** in the City Day they are credited (your next read), like a hero's PC; the paper's *yesterday* summary of a long absence counts them on the day you came back. The headline itself is the event's day. **Settled: the default.**
17. **A *Steward* role and the Vanguard's Rank 2 title *Steward*.** A Grand Rally role row can read *Steward · {name} · Steward*. **Default:** unchanged. If you rename the role, note that *Marshal* is banned by the QA guard; *Usher* is not. **Settled: renamed.** The two Grand Rally roles are **Usher** (ids `usher-1`, `usher-2`, name *Usher*); the texts say *ushers*; the Vanguard's description (*volunteers and stewards*) and the Collective's *Shop Steward* are unchanged.
18. **Modal order on the first read.** **Default:** a run-in, then the held release, then event results oldest first, then the orders-complete note. **Settled: the default.**

**An architecture decision to take before T7 (added 14 Oct 2026; QA slice 4 n3, drift row C9).** Persuasion writes an `influenceLedger` row only for the gaining party, so the rivals' losses when Neutral is at its floor have no row, and a fold of the ledger would not reproduce the meter (ADR 0028's amendment). Slice 6 is the first slice that reads the ledger for a screen (the faction ledger, the scoreboard). **Choose:** (a) write the losers' rows too (a system source, so contributions stay credited to the actor alone), which makes a fold exact and keeps it as the contention remedy; or (b) keep gaining rows only and record the ledger as an attribution log, not the meter's source. **Default:** (a) if a slice-6 screen shows losses per party, else (b). No code changes until then.

### 22.2 For the user

None blocking. Points for awareness (defaults taken):

1. **The socket in production.** Vercel's rewrites cannot carry WebSockets, so when the game is deployed the chat socket needs the API on its own subdomain (ADR 0001's option B). Locally everything runs through the Vite proxy. Nothing in the game depends on the socket.
2. **Two dependencies** from the plan arrive: `socket.io` (server) and `socket.io-client` (client). No Redis: several servers would share lines through MongoDB.
3. **Chat before slice 9** has mute, report, hide and the rate limits only, as the design's default; it stays faction-only and local.

---

## 23. Notes on the design documents (for the designer)

**Answered 3 Oct 2026** in `docs/design/slice-6-together.md` §20.2: the design documents, the GDD and the economy sheet are reworded accordingly (the seed, Poster Night's kinds, +38, the swing's factors, no `presence.cityId`, the fixture resolved by the city's boundary, the nudge, withdrawal and the order, the tally, the scoreboard's ten, the target at the call, the data-model row, *the duty officer* for *sergeant*, *per stay*, no SSE).

1. **The seed.** Design §2.6, §2.9 and GDD §16.3 say *seeded by the event id*. The id is public (the event's route), so the rolls would be computable before choosing a role. Built with a secret seed stored on the event (ADR 0036); please change "seeded by the event id" to "seeded per event".
2. **Poster Night's venue kinds** against three venues of §3.7: §22.1 Q1.
3. **Rested +37** (design §2.7, screens §5, economy §20.1): §22.1 Q2.
4. **The swing's inputs** (§2.6) list Issue, close race, Groundswell, the ordinance and *Fired up*; GDD §16.3 adds the comeback. Built as *every factor an action of the type at the venue gets* (ADR 0030's named factors): §22.1 Q8.
5. **`presence.cityId`** (§7, Q4) duplicates the character's `cityId`: dropped (ADR 0040).
6. **"Stats are read at resolution"** (§2.9) is exact only if a participant cannot act between the start and the resolution: built so (the read order, §3.4).
7. **"The city-day job resolves the fixture with the orders"** (§2.9, §4): the orders are the character's settlement; the fixture is resolved by the city's boundary (ADR 0017), before the drift and the count, and its result reaches the member's paper the same morning.
8. **The nudge** (§9.3, screens §2.3, §3.1.7): who may ask is ambiguous: §22.1 Q9.
9. **Withdrawal and the order** (§2.4, §5): §22.1 Q3.
10. **The rewards land "on the outcome"**, but a long absence moves them to the day of return: §22.1 Q16.
11. **The scoreboard's length** (§6.4, screens §2.4): §22.1 Q15.
12. **The Headline Story's target "at the last boundary"** (§3.6) against a page that must say who it is against before the start: §22.1 Q7.
13. **The plan's data-model row for slice 6** (`campaignEvents` with roles embedded, `chatMessages`, `presence { locationId, seenAt }`) becomes: `campaignEvents` (roster embedded), **`eventSignups`**, `chatMessages`, **`chatReports`**, **`chatLimits`**, faction-scoped `contributions`, and on the character `presence`, `events`, `chat`, `mutes`, `nameWords`.
14. **The QA vocabulary note** (§17) is right about *front page*; *sergeant* depends on slice 5's open Q22.
15. **GDD §19.1** still reads *once per visitor per day* in its first paragraph; the slice-6 pin says *per stay*. Built per stay.
16. **The plan names Server-Sent Events first** for realtime; slice 6 uses Socket.IO only for chat and nothing else needs realtime (refetch on focus), so no SSE is built (ADR 0038).

---

## Review 4 knock-ons (dated note, 7 Oct 2026)

Copied from `docs/tech/review-4.md` §20 when review 4 was built (ADRs 0073–0078). **Applied to the sections above on 14 Oct 2026** (drift row A17); kept here as the record.

- *Post bail* also sits on `CellsNowCard`'s own-party rows. It is the same `FavourSheet` and `favour.bail`, reading `held.inCells` (the same index).
- The Members status line uses `copy.when` (*in the cells at Harbour Police · out in 24 min*).
- The Faction tab's orders show `off`.
- Events and the HQ card go into the place card slot (§3.1), not new sheet code.

## Review 5 knock-ons: the night, the patrol, the Unrest prize (dated note, 10 Oct 2026)

Copied from `docs/tech/review-5.md` §18 when review 5 was built (ADRs 0079–0082). **Applied to the sections above on 14 Oct 2026** (drift row A17); kept here as the record.

- *Visit · 3 Energy* and the event sign-ups are Energy acts, so `notFree` refuses them while a patrol card is pending. *Post bail* is Iron from anywhere and is not refused.
- The Members status shows nothing for a pending card.
- The Unrest prize's award line appears with the branch's *Restore the base* orders in the paper.

## Deviations (as built)

### Phase A (T1–T7, 15 Oct 2026)

Built on branch `slice-0` after the user approved design §19's seven defaults (15 Oct 2026). Commits: `f7657d9` (T1–T3), `b58f48d` (T4–T6), then T7 with these notes.

**Testing (the user's rule of 8 Oct 2026).** No Vitest was written or run. Each *Done when* that names tests was checked with throwaway scripts (not committed) run with `tsx`:

- **T1–T3, rules (107 checks, all pass):** the band edges 0.875 / 0.874, 0.625 / 0.624, 0.375 / 0.374, and sixths, eighths and tenths; the lone member on a four-role event (Success 0.625; Partial and Failure Mixed; *Fired up* 0.8125 and 0.6875 Success) and Poster Night's lone Failure (Fiasco); economy §20.3's swings to the thousandth (250, 1,500, 4,219, 7,031) and the fill cap (a Rally with four hands: 1.25); `splitEqually` exact over 5,000 random calls, 1.5 among four is 375 each, the remainder to the first; the fixture rotation over six days × three factions with the shared capital district; `canWithdraw` refused at exactly an hour before; the refund's overflow rule (below the bar, above it, Rested capped); economy §20.1 to the unit (XP 75 / 38 / 15 and **Rested +38**; Party XP 18 / 12 / 6 / 3 and 12 / 8 / 4 / 2; a hand 25 / 25 / 13 / 5 and 6 / 4 / 2 / 1; PC 15 / 10 / 6 / 3 and 8 / 5 / 3 / 2; the order, close-race and *Fired up* parts 3 / 3 / 1 on a base of 12); determinism per seed and named streams (adding a hand and filling another role leave a role's roll unchanged); `best` with the faction's tie; Standing +3 a level; the Headline Story's legs (shares still sum to 100.000, `toActor + toNeutral = taken`, the participants' target legs sum to −taken) and nothing from a target at its floor; the Grand Rally's Heat only where a rival holds above 50; the General Strike's double momentum on two Issues, and Mixed halving up (15 → 8); a Fiasco moves nothing; every `callGate` and `signUpGate` refusal; `eventCredit`'s Standing win; `visitEffect` (first visit, the five-minute floor, never before now, the fourth as grapes); `healHealth` on the tick grid; chat normalisation (280 / 281 code points, an emoji counts one, bidi and newlines) and the three limits at their edges; presence bands at 9:59 / 10:00; `visibleTo`; `hereNowLine`; an `event` descriptor counts only for a template naming `event` and is tagged by an Issue's feeds; the four faction scopes.
- **T4, content:** the real data loads (6 types, 30 venue rows); eight negative cases are each refused with their own message (a venue of the wrong kind, two venues for one event and city, a signature event in two capital districts, a capital difficulty other than home + 2, a `best` role with two stats, an `event` kind beside another kind, an unknown art id, an Energy total off design §3). The second-quarter check was not exercised (no home city has a street in a second quarter to swap in); it reads the quarter's `opens`.
- **T7, db (13 checks on the memory replica set, all pass):** migration 010 run twice, the second run modifies nothing; presence from `lastActionAt`, the empty `events`, `chat` and `mutes`, the name's words; this week's faction scopes equal a fold of the week's ledger (per city and in all); the all-time scopes from the influence contributions; bracket and `events: 0`; one transaction over `campaignEvents`, `eventSignups`, `characters`, `influenceLedger`, `contributions`, `stays`, `chatMessages`, `chatLimits` and `chatReports` commits; **a change stream on `chatMessages` delivers an insert committed in a transaction**; the fixture's natural key refuses a second fixture; the indexes exist with their names.
- **The fast check:** `pnpm art:check && pnpm turbo run lint typecheck build` green (14 tasks). Playwright: nothing client-facing changed; because shared types changed, `--project=missions` was started with its dependency chain (`E2E_WEB_PORT=4273 E2E_API_PORT=3301`): 73 passed (phone, small-phone, landscape, desktop) before the shell's 10-minute timeout cut the run inside `council`; `missions` itself was not reached. No failure was seen.

**Rules (T1–T3).**

- `EVENTS`, `PRESENCE`, `CHAT` and `FAVOURS` are in `constants.ts` (§6.1 as written). The event maths is in `packages/rules/src/events.ts`; `presence.ts`, `chat.ts`, `favours.ts` and `scoreboard.ts` follow §6.3–§6.6.
- **`addHeatAt` lives in `events.ts`**, not `heat.ts` (only the credit uses it), built from `addHeat` and `projectHeat`.
- **`partsLine(full, shares)`** was added to `rewards.ts` (§6.7) and is what `eventRewards` uses: base and each part halve up on their own, with no outcome factor.
- **`resolveCampaignEvent` takes `forcedRolls?: Record<roleId, roll>`** (the test hooks' forced rolls, §8.6), so the server need not wrap the streams. Rolls use tier 2's outcome rule (more than 20 above the chance is a Failure).
- `eventCredit` takes `standingPerWin` (default 1), so the server can pass Street Register's double count.
- The resolution's `opinion.applied` is the actor's gain for persuasion and **what was taken** for the Headline Story. Each participant's `rewards.opinion` is their actor share in points, and `share.target` is their (negative) leg of the target.
- **`togetherTypes.ts`** holds §8.3's and §10.1's views. The fields §8.3 adds to existing views (`CharacterView` v7, `CityView.factionHere`, `LocationView.events`, `JourneyView.fellows`, the `HeldView` visitors, `OrderView.link`, `PaperView.events` and the desk row) are **separate interfaces** (`CharacterViewV7`, `CityViewV6`, `LocationViewV6`, and so on). Phase B merges them into the views as the server fills them, as slice 5 did with `CharacterViewV6`. `types.ts` gained only `ActionKind += 'event'`, §6.8's error reasons (plus `RIVAL_GROUND`), the five acts (`TogetherAct`, kept out of `CouncilAct` so `politics.results` needs no texts for them) and `PoliticalResult.view += event | member`.
- `EventPageView.ground` is `{ homeFactionId, shares }` for the client's `groundOf` (slice 4's sash is worked out on the client).

**Content (T4–T6).**

- **30 venue rows, not 27.** Design §3.7's table has 12 home rows (three cities × four), 15 capital rows for the common events (five districts × three) and 3 capital rows for the signature events: 30 in all. The loader checks the structure (§4.2), not a count. *(For the designer: the "27" in design §3.7 and tech §1 looks like a miscount.)*
- **No `fixtureRotation()` accessor.** `GameContent` extends `Content`, whose `fixtureRotation` is the tuple itself, so an accessor of that name would clash. Callers read `content.fixtureRotation`.
- **The three event order templates are transcribed but not wired** (`eventOrderTemplates` in `data/events.ts`, exported from the package). In the slot-B rotation now, they would be orders nobody can carry out until phase B's sign-up exists, and they would shift the rotation the existing e2e specs read. **Phase B's T10 adds them to `orderTemplates`.** The loader already checks that an `event` kind stands alone and that a faction has at most one event template.
- **Not transcribed in phase A:** the ten headlines per paper with their decks (§4.4, `headlines.ts`, `heraldHeadlines.ts`), screens §11's copy and help notes, design §11's modal texts and the system-line templates (`copy.ts`), and the *front page* allowance in the QA vocabulary guard. Only the server and client of phases B and C read them (the paper v6, the modals, chat), so they move to **T15 (headlines) and T18–T23 (copy)**. The user's testing rule replaces the word-for-word comparison tests: the event texts were copied from design §3 and checked by eye.
- Role ids: Rally `speaker`, `organiser`, `security`, `press`; Canvass Drive `coordinator`, `canvasser-1` to `canvasser-3`; Poster Night `printer`, `paster-agi`, `paster-str`; Grand Rally `speaker`, `stand-builder`, `usher-1`, `usher-2`, `lookout`; General Strike `shop-steward`, `picket-captain`, `printer`, `runner`; Headline Story `reporter`, `editor`, `source-handler`, `lawyer`.
- **Art:** `scene.event-poster-night` and `scene.event-grand-rally` have §13's alt texts. `pnpm art:build` wrote six files, **+458 KB** (AVIF 34 + 125 KB and 45 + 142 KB; WebP at 640 only, 48 and 64 KB, as for every October scene). `art:check`: 81 assets, 19.79 MB. The designer's check of the alt texts against the pictures is still to do (T6's *Done when*); the content-policy read is recorded in `art.ts`.

**DB (T7).**

- **The ledger choice (§22.1, last paragraph): (b).** No slice-6 screen shows losses per party. The scoreboard's *Moved* is the sum of a member's positive swings (design §6.4, screens §2.4). The event result shows the event's total and your share for your own party. The Headline Story's receipt names its target without a per-party loss table. So persuasion keeps writing only the gaining party's rows, and **the ledger is an attribution log, not the meter's source** (ADR 0028's amendment stands as written). The Headline Story still writes the target's leg, as slice 5's actions against a rival do.
- `campaignEvents` and `eventSignups` are in `models/campaignEvent.ts`; `chatMessages`, `chatReports` and `chatLimits` in `models/chat.ts`. Every §5 index has a name. `result`, `tap` and `receipt` are `Mixed` in the schemas (the rules' types on the TypeScript side).
- `characters`: `presence`, `events`, `chat`, `mutes` and `nameWords`, with schema defaults equal to the migration's, and the three indexes. `stays`: `bailPostedBy` and `visits` typed, `how += 'bailPosted'`, the payer's index. `influenceLedger`: `LEDGER_KINDS += 'event'`. `contributions`: `kind += 'faction'`, `period`, `bracket`, `events` and the scoreboard index. `requestLogs`: the three new kinds.
- **The playtest report** (`scripts/playtestReport.ts`) now leaves the faction scopes out of the capital's contributions (they would have counted as a place's), and `RiskStay.how` accepts `bailPosted`.
- **Migration 010** (`migrations/010-slice6-together.ts`, run by `ensureIndexes` after 009; the counts are returned as `slice6`). Step 1 sets the character fields (`nameWords` by a code loop). Step 2 writes the faction scopes, only while none exist, as upserts by natural key with `$setOnInsert`. **Step 3, today's fixtures, is not in the migration:** posting a fixture is the server's `ensureFixtures` (phase B, T10), which also runs on every board, HQ and paper read (§3.2), so the deploy day has its fixture without it.

**For phase B.**

- Merge the `*V6` and `CharacterViewV7` additions into the views as the server fills them. Build the `PoliticalResult`s for `call`, `signUp`, `bailPosted`, `visit` and `calledOff` from copy (they are `TogetherAct`s, not `politics.results`).
- Wire `eventOrderTemplates` into `orderTemplates` (T10); transcribe the headlines (T15) and the copy (T18–T23).
- `resolveCampaignEvent` wants each participant's `standingLabel` (the *Known in Coalport* line) and `prefer`; `firstToday` is the server's (§8.2).
- `addInfluence` writes the four faction scopes (`factionScopes`) with `kind: 'faction'`, `period`, `bracket` (`levelBracket`) and `events`.

### Phase B (T8–T16, 15 Oct 2026)

Built on branch `slice-0` as one commit, `21929a7` (the tasks share the read path and the services, so they were not split per task). The designer's copy landed in `55d14b7` while it was built and is bound (no fallbacks). **T17 (the integration suite) is a throwaway scratch script, as the user's testing rule asks; it was run and is not committed.**

**Testing (the user's rule of 8 Oct 2026).** No Vitest was written or run.

- **Scratch script on the memory replica set (58 checks, all pass):** the read path's presence touch without a version bump; the fixture on the board; the call sheet's four types at home; a call (Called, 15 Energy, a retried key returns the same tap, the *called* line in `city:collective:coalport`); `ONE_AT_A_TIME`; Rank 2 cannot call, Rank 1 cannot take a named role; the page's odds only on open roles and **the seed in no view**; withdraw returns the Energy and is refused in the last hour; two members racing for one role → one holder, the other `ROLE_TAKEN`; a member on two slots refused; a hand on the fixture; **four parallel runners resolve once**; one ledger row (`kind: 'event'`) per member participant; the four faction scopes with `events: 1`; the result line; the credit on the participant's read only, **two parallel reads credit once**, `events.current` → `seen`; the fixture resolved by the city day and the next one posted by the boundary; the paper's stored event headline, *Events* rows and *In Print*; the *taken in* line with a live *Post bail* button in history; bail by a mate (a second payer refused, the prisoner released on their read with `how: 'bailPosted'` and the payer named); a visit moves the stay, a second visit by the same mate refused; chat (a retried key → one line, a second line within 3 s `CHAT_RATE`, another faction's channel `CHAT_CHANNEL`, report once, mute, three channels); `faction.hq`, `members`, `scoreboard` (with your row), the profile without record, Heat or Iron; a caller who withdrew gets the *Called off* modal; **a change stream delivers the inserts**.
- **The fast check:** `pnpm art:check && pnpm turbo run lint typecheck build` green (14 tasks).
- **Playwright** (`E2E_WEB_PORT=4273 E2E_API_PORT=3301`, `--no-deps`): `phone` 64 passed (8.4 min). Further projects: see the round's report.

**Deviations.**

- **`events.call` is `events.callEvent`.** tRPC reserves `call` as a router key (the router throws at start-up). Phase C calls `trpc.events.callEvent`.
- **The slot guard of a sign-up is `roles: { $elemMatch: { roleId, holder: null } }`** with `roles.$.holder`, not `roles.{i}.holder: null` (Mongoose's cast of that filter let a second racer overwrite the first; caught by the race check).
- **Morale at resolution:** the resolution writes the meter but not the morale record of a home city crossing a threshold (ADR 0022); the city day's drift and the next action record it. Phase C/QA can add it if a playtest shows it.
- **Members:** heroes are the hero awards of the last seven days; *here now* rows are sorted first within the page (not across pages). The cursor is an offset.
- **`chat.history`'s buttons** read the stay from the line's `system.ref` (the stay id) and the event from `payload.eventId`.
- **The socket:** `attachChat` refuses a cross-origin handshake (`allowRequest`), needs the session cookie, joins `channelsOf` rooms and `char:{id}`, and emits `chat:line` (and `chat:forYou` to the addressee). It runs in the API process only (`index.ts`); the e2e server (`node dist/index.js`) has it.
- **Test hooks:** `POST /api/test/members`, `/api/test/events` (`startNow`, `fill`, `rolls`, `call`), `/api/test/chat`, `/api/test/presence`, and **`/api/test/member-held`** (a test member to the cells or the ward) instead of extending slice 5's `/api/test/held`. Test members have `userId: 'test:{uuid}'` (no `playtest.testMember` field; the report should filter by that prefix, T24). Dev panel actions: `members`, `fillEvent`, `startEvent`, `rolls`, `memberCells`, `memberWard`, `memberSays`, `chatReset`, and `status.together`; **the client's buttons are phase C's**.
- **The paper:** `event-today` is built at read by `togetherPaper` (`{time}` left as a token with `until` = the start; *midnight* filled for the fixture); In Print by `EVENT_IN_PRINT_NAMES`. The settlement's facts are `PaperFacts.events` (`EventFacts`), read by `readTogether` in the settlement's transaction.
- **The event order** (`eventOrderTemplates`) is appended to `orderTemplates` in `data/orders.ts` (the loader accepts its `residence: 'any'`, designer's 55d14b7). It shifts every faction's slot-B rotation.
- `CharacterView.events.open`, `chat.forYou` and `factionDot` are full only from `character.me` (`fullCharacterView`); other views carry the counts with an empty `open`.

**For phase C.** The client for every procedure above (`callEvent`), the dev panel's buttons, the socket client (`useChatSocket`, path `/api/socket.io`), `CellsNowCard`'s *Post bail*, the report's *together* section (test members by `userId` prefix), the e2e specs of §15.1.
