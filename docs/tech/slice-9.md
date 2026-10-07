# Slice 9 — Launch readiness: technical design

| | |
|---|---|
| **Goal** | Make the game measurable, defensible and finished enough for a beta. **The instruments:** first-party telemetry (an event stream, player-days and a metrics report that reads GDD §27 the same way on a local playtest and on a beta). **The guards:** sign-up caps per device and network, a normalised email, **linked accounts** whose ballots, backings, signatures and hands count once at every count, **the 24-hour audit** on the national count that confirms itself, council recounts, **moderation** (four-reason reports, a server-only word filter, the ladder from a note to closure, renames, closing an account with erasure, the `/mod` console). **The polish:** a purpose line on every screen, an empty line on every list, every help note, *While you were away*, **Settings** (five lines), **WCAG 2.2 AA**, **performance budgets** checked locally. **One rule:** opinion damping at scale. **The plan:** the betas and their gates, and **Part B, the hosting step**, as a checklist that runs at the end of the project |
| **Question** | **Are the day-7 and day-30 retention targets within reach?** Locally the slice answers *is the game ready to measure?*; the betas answer the question (design §2.4, §9) |
| **Builds on** | Slices 0–4 as built on branch `slice-0`; **slice 5 as designed** in `docs/tech/slice-5.md` (being built); **slices 6, 7 and 8 as designed** in `docs/tech/slice-6.md`, `slice-7.md`, `slice-8.md` (not built). Where this document leans on a slice 5–8 name (`chatMessages`, `chatReports`, `chatLimits`, `chat.post`, `chat.report`, `chat.setHidden`, `ProfileSheet`, `eventSignups`, `resolveEvent`, `favours.postBail`, `favours.visit`, `presence`, `touchPresence`, `factionElections`, `nationalElections`, `countNation`, `countChair`, `countPick`, `countBattleground`, `processNationBoundary`, take-office, `petitions`, `termBackings`, `nation.news`, `officeTerms.office`, `contributions` scopes, `heroes`, `topByBracket`, the Letters builder, `legacyEntries`, `seasons`), it is that design's name. If a slice's Deviations rename something, the task that touches it follows the rename |
| **Design inputs** | `docs/design/slice-9-launch.md` (*design §n*) · `docs/design/slice-9-screens.md` (*screens §n*) · `docs/design/content-policy-review.md` §7 · `docs/economy.md` · GDD §1.5, §3.3, §4.2, §5.2, §7.3, §7.5, §14.2, §15.1, §15.2, §16.2, §25, §26, §27, Appendix C #7, #13 · `docs/IMPLEMENTATION_PLAN.md` · ADR 0001, 0002, 0004, 0008, 0017–0020, 0022, 0023, 0030, 0036–0041, 0043, 0045, 0047–0049, 0053, 0057 |
| **ADRs** | [0059 telemetry](../adr/0059-telemetry-first-party-events-and-player-days.md) · [0060 network sightings, the device cookie, sign-up caps](../adr/0060-network-sightings-device-cookie-and-signup-caps.md) · [0061 linked accounts count once](../adr/0061-linked-accounts-count-once-at-every-count.md) · [0062 the national audit and recounts](../adr/0062-the-national-audit-self-confirms-and-council-recounts.md) · [0063 moderation state, roles, the log](../adr/0063-moderation-state-on-the-user-roles-and-the-log.md) · [0064 `packages/moderation`](../adr/0064-packages-moderation-server-only-filter-and-names.md) · [0065 one report queue, editor notes, appeals](../adr/0065-one-report-queue-editor-notes-and-appeals.md) · [0066 renames through a snapshot registry](../adr/0066-renames-through-a-name-snapshot-registry.md) · [0067 closing an account](../adr/0067-closing-an-account-retirement-and-erasure.md) · [0068 opinion damping](../adr/0068-opinion-damping-from-a-seven-day-ring-on-the-place.md) · [0069 request guards](../adr/0069-request-guards-in-process-rate-limits-and-maintenance.md) · [0070 performance and accessibility checks](../adr/0070-performance-and-accessibility-checks-with-playwright-and-axe.md) · [0071 *While you were away*](../adr/0071-while-you-were-away-built-at-read.md) · [0072 the production topology](../adr/0072-production-topology-for-the-hosting-step.md) |
| **Defaults taken** (design §16, pending the user) | **Telemetry in our own database** · **closed beta 150–300 invited accounts, six weeks, three waves** · **linked ballots set aside silently**, one aggregate line · **the audit confirms itself at day 0** · **damping built now** · **a name change every 30 days, free; printed editions keep the old name** · **the user as admin plus at least one moderator; a second pair of eyes for one's own faction** · **closure erases personal data after 30 days** · **16+** · **five Settings lines** · **the gates as written** · **no count-room scene** |
| **Environment** | **Lanes A–C are local only**: `pnpm dev:mem`, the test clock, the dev panel, Playwright on `vite preview` with the memory server. Nothing in them needs a network beyond localhost or an account with any provider. **Lane D** (§20) is design §10's hosting checklist and runs only at the end of the project |

Every number below is a GDD or design number. Where the design leaves a point open, this document states a default and lists the question in §22.

---

## 1. Scope

**In**

- **Telemetry** (design §2): the `telemetry` stream (server, client and world events of design §2.2), `playerDays` (activity spans per account per City Day), the metrics report `pnpm report:metrics` with every dashboard of design §2.3, the console's and the dev panel's Metrics pages.
- **The balance pass's code side** (design §3): the model rows as content, *measured against modelled* in the Pacing and Economy dashboards with §3.4's ±25 % / ±50 % bands and the red flags; a `pnpm sim:scale` script running the two population simulations (opinion at scale, elections at scale) over the real `packages/rules` functions. The four-profile, 48-run player simulation stays the designer's (design §3.1).
- **Opinion damping** (design §3.3): `swingFactor(active)` on solo and event swings, the seven-day ring of distinct contributors on each place.
- **Anti-abuse** (design §4): the normalised email; the device cookie; sign-up caps (two accounts a device ever, three a network a City Day); rate limits (60 mutations a minute an account, 600 an IP); network sightings with salted hashes and 30-day retention; links L1–L3 with the household rule; linked sets counting once in **every** count (ballots, backings, petition signatures, event hands, the Issue's top five, District Hero, the scoreboard); bail's Party XP rules; linked visits; **the 24-hour audit** (automatic set-asides, bursts and rings noted, the console's actions, self-confirmation at day 0); **council recounts** within the day.
- **Moderation** (design §5): the policy page; reports from a line and from a profile with four reasons and a daily cap; the word filter (refuse or flag) on chat, names, report notes and feedback; the ladder (a note from the editor, muted, suspended, closed) with lazily expiring states; appeals; renames (own, every 30 days; forced); closing one's own account and reopening it within 30 days; erasure after 30 days; the console `/mod` (Queue, Audit, Accounts, Log, and Metrics for admins) with the two-person rule.
- **Onboarding polish** (design §6): purpose lines on twenty screens, empty lines on every list, the help-note audit (typed keys), *While you were away* (the row and the digest), Rested filled after 30 days away, the reviews' open fixes re-tested.
- **Accessibility** (design §7): the Settings sheet and its root attributes, keyboard and screen-reader work across the client, 44 px targets, contrast tokens, night pin plates, colour-vision simulation in the dev viewer, axe on every route of the matrix.
- **Performance** (design §8): route-level code splitting, font subsets, `pnpm report:perf` measuring every *must* and *target* locally.
- **The betas' mechanics** (design §9): invite codes and waves, the weekly feedback form, the boost script for the six seeded testers, test-hook refusals under `NODE_ENV=production`, the maintenance screen behind a flag.
- **Hosting preparation that runs locally**: a direct-origin API mode (ADR 0001's option B) behind configuration and tested in one e2e project; a `Mailer` with a console sink.

**Out** (§19): any provisioning, deploying or third-party account (lane D); PostHog; charts on the dashboards; a high-contrast theme; CAPTCHA, VPN or IP reputation lists; machine moderation; self-service data export; email verification; private messages; the returning chapter; the count-room scene; Lighthouse CI.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| Telemetry storage | **`telemetry`** (one document per event, TTL 180 days) written by an in-process **buffer** (`insertMany`, unordered) **after the commit**, never inside a transaction and never awaited by a response. Keyed acts and world events get **natural `_id`s** (`{kind}:{idempotencyKey}`, `{kind}:{ref}`), so a replay or a second runner inserts nothing | ADR 0059 (Q1) |
| Player-days and sessions | **`playerDays`** keyed `{userId}:{day}` holding **activity spans** (minute precision, a new span after a 30-minute gap), touched by the request context **at most once a minute per account** (the design's ten would make a five-minute session read as zero). Kept for good | ADR 0059 (Q1) |
| Cohorts | **Not stored.** Retention is computed by the report from `playerDays` and `user.createdAt`, so testers, boosted accounts and moderators are left out retroactively and no job can leave a stale row | ADR 0059 (Q1) |
| Client events | A Fastify route **`POST /api/telemetry`** (beacon-friendly, `text/plain` JSON) with a Zod schema per kind; **anonymous kinds** (`screen.view` of the sign-up and login, `signup.form`, `error.client`) accepted signed out; a client **session id** (`sid`) and a compact **client descriptor** travel as headers on every request | ADR 0059 |
| Ballot secrecy in telemetry | `vote.cast` carries **no `ownFaction` / `npcChoice`** (that is part of the choice, ADR 0019). Cross-faction ballots are an **aggregate computed by the report from `votes`**, never per voter | ADR 0059, §22.1 Q1 |
| Device id | **`igc_d`**, 128 random bits, HttpOnly, `SameSite=Lax`, one year, set by an **`onRequest` hook** on any `/api/*` response lacking it (no `/api/hello`) | ADR 0060 (Q2) |
| Network data | **`networkSightings`** (TTL 30 days): account, City Day, **HMAC of the full IP and of its /24 (/48)** under a **calendar-epoch salt** derived from a server secret (epoch = 30 City Days, so no rotation job), the **next epoch's hashes** stored in an epoch's last 14 days (*two salts during the switch*), the device id, activity spans. **Loopback addresses are not a network** (local play); a test header fakes one under the test hooks | ADR 0060 (Q2) |
| Sign-up caps | Checked in **our Fastify bridge** before Better Auth's sign-up handler (version-independent, has the IP and the cookie): the name filter, the normalised email, the invite code (closed beta), **device (2 ever) and network (3 a City Day) reservations** in `signupCaps` by conditional upsert. The Better Auth hook sets `emailNorm`; a **unique partial index** on `user.emailNorm` is the race's backstop | ADR 0060 |
| Links | **`accountLinks`** (one row per pair, `kinds`, evidence, `active` for L1/L2, `noted` for L3 alone, sticky `unlinked`). The pure **`findLinks`** in `packages/rules/audit.ts`; recomputed by the **`links-refresh`** job (23:50 UTC and at worker start) and **before the national count**; sets are connected components **at read** | ADR 0061 (Q3) |
| Counting once | One seam per count kind: **`countableTally`** (ballots), **`countableBackings`**, petition signatures, event hands, and **`rankBySet`** for heroes, the Issue's top five and the scoreboard; every one runs `collapseBySet` (pure). The set-asides are written to **`audits`** (one row per count that set anything aside or noted anything) and every count result carries `setAside` | ADR 0061 |
| The national audit | The count at the boundary into term day 27 already applies the automatic set-asides and writes `audits` **`provisional`**; moderators may confirm, set aside a noted set (the national result is recounted from its stored inputs), unlink, or recount a council; **take-office at day 0 confirms a provisional audit first** (`confirmedBy: 'auto'`) and seats from the possibly recounted result | ADR 0062 (Q4) |
| Council recounts | Only for a council, district or Clearwater count **counted at today's boundary**; pure `recountRows` over the stored rows with a new tally; a changed seat passes at once (the loser's term `vacatedDay = today`, not completed; the winner's from today, `afterRecount`); the Governor recomputed; the rule in force stands; a live headline | ADR 0062 |
| Roles and moderation state | **Flat additional fields on Better Auth's `user`** (`input: false`): `role`, `modState`, `modUntil`, `modReason`, `modLogId`, `renameReason`, `closedBy`, `closedDay`, `erasedAt`, `tester`, `emailNorm`, `invite`, `termsVersion`. The session read every request already returns them, so **the gate costs no read**. States **expire lazily** (`modUntil < now` reads as clear) | ADR 0063 (Q5, Q6) |
| The gate | `protectedProcedure` becomes three: **`playProcedure`** (refuses `ACCOUNT_SUSPENDED` / `ACCOUNT_CLOSED` with the reason and the date), **`accountProcedure`** (allowed in every state: `account.status`, `appeal.send`, `account.reopen`), **`modProcedure` / `adminProcedure`** (role re-checked on every call). A mute is checked by `chat.post` and `feedback.send` only | ADR 0063 |
| The log | **`moderationLog`**, append-only; each row is also the **idempotency record** of the moderator's tap (unique `{ actorId, idempotencyKey }`), so moderators need no character for ADR 0008 | ADR 0063 |
| Two pairs of eyes | A moderator's action on **a member of their own faction**, and any **closure** by a moderator, becomes a **`modProposals`** row that a second moderator or an admin confirms; an admin acts alone | ADR 0063 |
| The filter | A new **server-only workspace package, `packages/moderation`** (pure; lists as JSON in `packages/moderation/lists/`, never imported by the client or `packages/content`): `fold`, `checkText` (refuse / flag with tags), `checkName` (refuse + impersonation), `normaliseEmail`, `moderationAt`, `suggestRung` | ADR 0064 (Q7) |
| Reports | slice 6's `chatReports` **generalised into one `reports` queue** (`kind: 'line' \| 'name' \| 'filter'`), with the reason, the state, the assignee and the first action's time (the queue gate). A filter flag is a `reports` row written in `chat.post`'s transaction | ADR 0065 |
| Notes from the editor | **`editorNotes`** (one row per character per `ref`): the rung's note, *A line you reported was dealt with*, the appeal's answer; read live by the Letters builder; never a write to the character | ADR 0065 |
| Appeals | **`appeals`**, one per decision (unique `logId`), 500 characters; answered by an admin as an editor note (or an email for a closed account) | ADR 0065 |
| Renames | **`account.rename`**: the 30-day gate (`characters.renamedDay`), the filter, then **`renameEverywhere`** rewrites every denormalised name snapshot listed in the **`NAME_SNAPSHOTS` registry** (a schema-walk test makes a new snapshot impossible to forget). **Printed editions are not rewritten** for one's own change. A forced rename writes *A Newcomer* through the same registry **and scrubs printed text** (§22.1 Q3) | ADR 0066 (Q8) |
| Closure | **One transaction retires the character** (`retired`, offices vacated by kind, open candidacies withdrawn, open sign-ups withdrawn with their Energy kept spent, nothing else touched) and closes the account (`modState: 'closed'`, sessions revoked). **Reopen** within 30 days. The **`account-erase`** job (00:10 UTC) erases after 30 days: names through the registry to *A former member*, the email, credentials, sessions, sightings, appeal text, feedback lines | ADR 0067 (Q13) |
| Damping | **`active { days[≤7], mean }`** on each place document (home city, capital district, Clearwater), rolled by **the city's boundary** from the ledger's distinct contributors of the day before (lazy-safe, ADR 0017); the swing passed to `applyPersuasion` / `applyAgainst` × **`swingFactor(mean)`** in actions, missions and event resolutions; `influenceLedger.damped` records the factor; drift, Issue resolution, morale inputs and the exposé untouched | ADR 0068 (Q9) |
| *While you were away* | **Built at read** from the world's records keyed by day (counts, laws, ordinances, Issues, events, seats, `nation.news`): **a character away has no editions for the missed days** (editions are printed at a settlement). The return edition stores `desk.away { days, from, banked }`; the settlement **fills Rested to the cap when its window is 30 days or more** (once, by the settlement's own guard) | ADR 0071 (Q10) |
| Settings | **`characters.settings { motion, text, night, clouds, chat }`** (slice 6's `chat.hidden` moves here), written **without the version** (ADR 0040's pattern) by a set-to-state `settings.set`; applied by the client as `data-*` attributes on the root; the server reads none | §8.1 (Q11) |
| Purpose lines | **`characters.seen.purpose[]`** (screen ids, ≤ 30), `$addToSet` without the version, written when the client sees the player's first act on that screen | §8.1 |
| Rate limits | **In-process sliding windows** in the API (no Redis): 60 mutations a minute per account, 600 per IP, the beacon's 120 events a minute per session; Better Auth keeps its own. Several instances multiply the ceiling, which is recorded | ADR 0069 |
| Maintenance | **`MAINTENANCE_UNTIL`** in the environment: every tRPC and auth call answers 503 `MAINTENANCE { until }`, `/healthz` names it; the client shows *The presses are stopped* on it or after three failed health checks | ADR 0069 |
| Performance and accessibility checks | **No Lighthouse CI**: `pnpm report:perf` builds, measures gzip per chunk, and drives Playwright with CDP throttling (the Pixel 7 profile at 4G, 4× CPU) for LCP, an INP proxy, bytes and image memory. **`@axe-core/playwright`** (one dev dependency) runs on every route and sheet of the matrix | ADR 0070 (Q12) |
| Production topology | Recorded now, built at lane D: **option B** (`play.` / `api.` / `tiles.` subdomains, the session cookie on the parent domain, a direct WebSocket), the worker as a second process, R2 tiles, a transactional mail provider over HTTP. The **direct-origin mode** is built and tested locally behind configuration (localhost ports are same-site) | ADR 0072 |
| Routes | `/policy`, `/terms`, `/privacy` (public); `/mod/*` (its own chunk); a not-found route; the suspended, closed, forced-rename and maintenance screens are **root gates**, not routes | §12.1 |
| Jobs | **Two new:** `links-refresh` (23:50 UTC, at start) and `account-erase` (00:10 UTC, at start). `city-day` (set-asides, audits, the damping ring) and `nation-day` (the audit at 27, the confirmation at 0) are extended; the telemetry buffer is a timer, not a job | §9 |

---

## 3. The flows, time and the lazy state

### 3.1 A request's life (every tRPC call)

```
Fastify onRequest      igc_d cookie set if absent (HttpOnly, Lax, 1 year, Secure on https)
                       MAINTENANCE_UNTIL set → 503 { reason: 'MAINTENANCE', until } (tRPC and /api/auth; not /healthz)
createContext          getSession (one read: user + the slice-9 fields) → ctx.user { id, name, role, mod: moderationAt(…, now),
                       renameReason } · ctx.net { ip, deviceId, testIp? } · ctx.sid · ctx.client (header, Zod)
                       activity.touch(userId, ip, deviceId, now)   ← fire-and-forget, memo: once a minute per (account, ip, device)
                         playerDays     upsert {userId}:{day}   pipeline: extend the last span or open one (30-minute gap)
                         networkSightings upsert {userId, day, ipHash, deviceId}   same spans; ipHashNext in an epoch's last 14 days
middleware             mutations: rateLimit(account 60/min, ip 600/min) → SLOW_DOWN { retryAt } before anything runs
                       playProcedure: mod.state suspended | closed → ACCOUNT_SUSPENDED | ACCOUNT_CLOSED { until, reasonId }
procedure              as slices 0–8
after commit           track(kind, props, ctx) → the buffer (natural _id for keyed acts) → insertMany every 2 s or 100 events
```

A replayed keyed act (ADR 0002, ADR 0008) returns its stored result before the service's `track()` call, and the event's natural `_id` stops a second insert if it gets that far.

### 3.2 Signing up

```
POST /api/auth/sign-up/email   (our Fastify bridge, before auth.handler; ADR 0060)
  body (Zod: name, email, password, image?, invite?)
  1 name    acceptName (2–40, slice 2) · checkName(folded, refuse + impersonation)   → 400 NAME_NOT_ALLOWED
  2 email   normaliseEmail → user.emailNorm exists                                   → 400 EMAIL_TAKEN
  3 invite  SIGNUP_MODE=invite: inviteCodes { _id: code, uses < max, expiresAt > now } $inc uses (conditional)
                                                                                     → 400 INVITE_INVALID
  4 caps    (unless disabled by the test hooks' abuse config)
            device   signupCaps { _id: 'dev:{deviceHash}' }   findOneAndUpdate({ count < 2 }, $inc, upsert)
            network  signupCaps { _id: 'net:{prefixHash}:{day}' }  ({ count < 3 }, $inc, upsert)
            E11000 or no match                                                       → 429 DEVICE_CAP | NETWORK_CAP
  5 telemetry signup.form { ok, reason }                    (server refusals and success; client validation sends its own)
auth.handler → databaseHooks.user.create.before: { …user, name, emailNorm, termsVersion, role: ADMIN_EMAIL ? 'admin' : 'player' }
             → unique partial index user.emailNorm: a race between two sign-ups of one address fails the second (generic error)
networkSightings  a row with `signup: true` (the L3 and burst inputs)
```

A reservation consumed by a sign-up that then fails (rare: the backstop index, a database error) is not returned; the cap is a soft guard and the design's numbers allow for it.

### 3.3 Telemetry

```
server events   services call track(...) after their commit; result-derived events (levelup, rankup, standing.level,
                pc.spent) come from one pure mapping over the returned result's knock-ons (eventsFromResult)
world events    city-day / nation-day / event resolution / audit: day.rollover:{day}, election.counted:{electionId},
                issue.resolved:{issueDocId}, audit.ran:{electionId}, event.resolved:{eventId} (natural ids)
client events   a queue in the client (screen.view, help.opened, settings.changed, paper.opened, journey dwell,
                energy.empty, error.client, socket.reconnect) → POST /api/telemetry every 10 s, and by sendBeacon on
                pagehide; ≤ 50 a batch; Zod per kind; anonymous kinds only when signed out
api timings     an in-process histogram per procedure → telemetry api.timings { procedure: [count, p50, p95, max] } every 5 min
```

### 3.4 Links (ADR 0061)

```
links-refresh (23:50 UTC; at worker start; before the national count)
  read networkSightings (30 days), signups (sightings with signup: true), each new account's first three ballots
  findLinks (pure):
    L1  the same device on both accounts                                                   → active
    L2  the same ipHash on ≥ 3 City Days of the last 14, ≥ 3 interleavings (one's span ends, the other's begins within
        10 minutes), and no overlap on those days; never for a household (overlap ≥ 10 minutes on ≥ 3 days); an
        IP-day with more than 50 accounts is a shared network and gives no L2 evidence                  → active
    L3  created on the same device or /24 within 48 h and the same candidate in each one's first three ballots → noted
  upsert accountLinks by pair; a pair with no evidence left in the window → active: false (kept for the console)
  unlinked pairs stay inactive for the kinds a moderator unlinked; a new kind of evidence re-activates them
at a count (every kind):   sets = components(active links among the count's voters and their neighbours)
at a tap (bail, visit):    one indexed read of the pair's row
```

### 3.5 A count with set-asides (every count: council, district, Clearwater, the Chair, the picks, the republic, a vote on the Chair)

```
inside the count's existing transaction (ADR 0017, ADR 0043)
  ballots   = Vote.find({ electionId }, { voterId, candidateKey, createdAt })
  sets      = linkedSets(voters)                                   (accountLinks, active)
  { kept, setAside } = collapseBySet(ballots, sets)                 the earliest cast in a set stands
  votes     = tallyOf(kept);  turnout's voters = kept.length       (the ballot half's weight is never inflated by a ring)
  backings  = countableBackings(candidacy.endorsements, sets)       (endorsements, the Chair's backers, the national backers)
  … the slice 3–7 count with these inputs …
  result.setAside = setAside.length
  audits.insert { _id: electionId, kind, countedDay, status: 'final' | 'provisional', setAside[], notes[] }  when anything
  telemetry election.counted:{electionId} { turnout, npcSeats, playerSeats, setAside }
elsewhere, the same function:  petition close (signatures) · resolveEvent (hands: the earliest sign-up in a set counts in the
  members' share; everyone is paid) · heroes / the Issue's top five / the scoreboard (rankBySet: summed under the set's
  earliest account; ledger rows untouched)
```

### 3.6 The national audit (design §4.5)

```
boundary into term day 27 (nation-day; job or lazy path)
  before the boundary's transaction: refreshLinks()      (idempotent; bounded by 30 days of sightings)
  in the transaction: countNation with set-asides (§3.5); notes: findBursts, findRings, L3 pairs among the voters
  audits { _id: 'nation:{n}', status: 'provisional', confirmAtDay: day 0 }; nation.news nl.count-provisional (slice 7's line)
during day 27 (console · Audit)
  audit.confirm        status → 'confirmed', confirmedBy: userId
  audit.setAside       a noted set → manual set-aside; countNation re-run from the stored inputs and the new tally → result
  audit.unlink         accountLinks.unlinked; the result re-run without that set's automatic set-aside
  audit.recount        a council counted today (§3.7)
boundary into day 0, take office (nation-day): first, in the same transaction:
  audits status 'provisional' → 'confirmed', confirmedBy: 'auto'      (filter on status: a moderator's confirm wins or loses cleanly)
  seat from nationalElections.result (as recounted); nation.news nl.count-confirmed { setAside }
```

### 3.7 A council recount (design §4.5 step 4)

```
audit.recountPreview({ electionId })     a council / district / Clearwater election with countedDay = today
  rows' = recountRows(kind, stored rows and inputs, tallyOf(kept with the extra set-asides))   (pure)
  → { before: seats, after: seats, changed: [{ seat, from, to }] }
audit.recount({ electionId, idempotencyKey })  one transaction:
  elections result ← rows' (recountedDay = today; changed rows afterRecount: true); audits.recounts += …
  each changed seat: loser's officeTerm vacatedDay = today, recounted: 'lost' (not completed: no ladder credit)
                     winner's officeTerm fromDay today → the term's toDay, recounted: 'won'
  the Governor recomputed (governorOf) · the council projection on the city · both characters' offices[] (version guard)
  the order paper and the rule in force untouched
  moderationLog row; telemetry audit.recount
the paper: a live political headline (ADR 0023) on recountedDay = today or yesterday: *{Name} Takes the Seat After a Recount*
```

### 3.8 A report to a decision (design §5.2, §5.3)

```
report.line / report.name (playProcedure; muted players may report)
  chatLimits reports.{day, n} < 10 (conditional $inc)                  → REPORTS_TODAY
  reports insert { kind, targetKey, reporterId, reason, note (filtered), line + context | name, state 'new' }
                                                              (unique { targetKey, reporterId }: a second report → already)
chat.post: checkText refuse → CANT_BE_SAID (nothing posted, nothing echoed); flag → posted, and reports { kind: 'filter',
  reporterId: null, reason: 'filter' | 'voteBuying', tags } in the same transaction
console: mod.take → state 'inReview', assignee, firstActionAt (set once)
         mod.decide({ action, reasonId, memo }) →
            needsSecond (a moderator, the subject in their own faction, or 'close') → modProposals open → *Needs another moderator*
            else applySanction in one transaction:
              user  modState / modUntil / modReason / modLogId (note: none; rename: renameReason)
              moderationLog (the idempotency record)
              editorNotes for the subject (the rung's note: ref 'rung:{logId}')
              reports on the subject named in the decision → 'dealtWith' (+ resolvedAt);
              editorNotes for each reporter ('reportDealt:{reportId}')
              close → the retirement (§3.10) · rename → renameEverywhere(→ 'A Newcomer') + scrub printed text after commit
         mod.decide('noAction') → 'noAction' (counts towards the reporter's *baseless* figure)
appeal.send (accountProcedure)   appeals { logId: user.modLogId, text ≤ 500 } (unique logId) → APPEAL_SENT on a second
admin.answer                     'lifted' → user state cleared, moderationLog 'lift'; editorNotes appealAnswer (or the Mailer
                                 for a closed account)
```

### 3.9 Renames (design §5.4)

```
account.rename({ name, idempotencyKey })          playProcedure; moderationLog-free (the player's own act; requestLogs kind 'account.rename')
  acceptName → checkName → NAME_NOT_ALLOWED · renameGate(renamedDay, today) → RENAME_TOO_SOON { from } (skipped when
  renameReason is set) · same as now → NAME_SAME
  one transaction: character name, nameWords, renamedDay = today, version · user.name, renameReason = null ·
                   renameEverywhere(characterId, name, { scope: 'live' })     (registry: candidacies, endorsements,
                   contributions, issues.top, stored counts, roster rows, chat author snapshots, …)
  → { name, nextFrom: today + 30 }
forced: mod.decide('rename', reason) → renameReason set; renameEverywhere(…, 'A Newcomer', { scope: 'live' }) in the
  transaction; after commit scrubPrinted(oldName → 'A Newcomer') over stored editions and nation.news (batched)
the client: character.me.moderation.renameReason → the RenameSheet before any route (not dismissible)
```

### 3.10 Closing, reopening, erasure (design §5.5; ADR 0067)

```
account.close({ confirm: 'CLOSE', idempotencyKey })    or a moderator's 'close' (two moderators, or an admin)
  one transaction: retireCharacter(session, c, today)
     offices: every live officeTerm vacated by kind (§22.1 Q2's defaults) · open candidacies withdrawn (deposit kept) ·
     open event sign-ups withdrawn (Energy stays spent; a role falls to the volunteers) · characters.retired { day, by }
   user: modState 'closed', closedBy, closedDay = today · sessions deleted (signed out)
retired characters are left out of live lists (Members, presence, search, turnout's eligible, the small-branch roll, nudges)
account.reopen (accountProcedure; closedBy 'self' and today < closedDay + 30) → modState 'clear', retired null
  (offices stay vacated; everything owned is where it was) → *Welcome back. Your account is open again.*
account-erase (00:10 UTC daily, at start): users closed with closedDay + 30 ≤ today and erasedAt null, one at a time:
  renameEverywhere(→ 'A former member', { scope: 'all' }) + scrubPrinted · user: name, email → 'erased-{id}@erased.invalid',
  emailNorm unset, erasedAt · delete session, account (credentials), networkSightings, feedback, appeal text
```

### 3.11 Damping (design §3.3; ADR 0068)

```
the city's boundary into d (city-day, each place's own transaction, ADR 0017)
  n = distinct characterId of influenceLedger rows at the place on d − 1 with kind in solo | mission | event
  place.active = rollActive(active.days, d − 1, n)      (≤ 7 entries; mean of the entries; idempotent per day)
an act's opinion write (ADR 0022) and resolveEvent
  swing' = swing × swingFactor(place.active.mean)       factor = clamp(20 ÷ mean, 0.25, 1); 1 while mean ≤ 20
  influenceLedger.damped = factor when < 1; the opinion knock-on's factors += { id: 'damping', value, dev: true }
untouched: drift, the Issue's +3, ballot and seat inputs to morale, the exposé, the season reset
```

### 3.12 *While you were away* (design §6.6; ADR 0071)

```
the settlement into today (window w = today − previous settled day)
  w ≥ 30 → rested = restedAfterAbsence(w, rested, capOn(today))  (the cap)
  the edition: desk.away = w ≥ 2 ? { days: w, from: previous settled + 1, banked: { iron, rested, filled } } : null
paper.today → away: AwayRowView | null    awaySummary(facts in [from, today)): ≤ 4 lines (days · republic · city · branch · yours)
paper.away  → AwayDigestView              foldDigest(facts): by day, newest first, ≤ 6 rows a day, ≤ 30 days, read-only
facts (AwayFact { day, scope, templateId, params, priority }) from indexed range reads on: elections counted, laws from,
  ordinances from, Issues resolved, the faction's events resolved, officeTerms begun by members, nation.news (14 days)
```

### 3.13 Time and the lazy state

| State | Stored | Read | Ends |
|---|---|---|---|
| A mute, a suspension | `user.modState`, `modUntil` | `moderationAt(user, now)` in the context | `modUntil < now`: clear, nothing written |
| A closure's reopening window | `user.closedDay` | `today < closedDay + 30` | the `account-erase` job's day |
| The rename's 30 days | `characters.renamedDay` | `renameGate` | `renamedDay + 30` |
| Reports a day | `chatLimits.reports { day, n }` | conditional `$inc` | the next City Day |
| Bail's Party XP a day | `characters.today.bailsXp` | `bailPaysXp` | the day's tally reset (slice 1) |
| The salt epoch | — | `epochOf(day) = floor(day ÷ 30)` | the calendar |
| Links | `accountLinks` | components at read | evidence out of the 30-day window (the next refresh) |
| The audit | `audits.status` | — | a moderator's confirm, or take-office at day 0 |
| The damping ring | `place.active` | `swingFactor(mean)` at the act | rolled at each boundary |
| Away and the Rested fill | `paperEntries.desk.away` | the settlement's window | — |
| Purpose lines | `characters.seen.purpose` | `character.me` | permanent once seen |
| Telemetry, sightings, feedback, reports | TTLs 180 / 30 / 90 / 365 days | — | MongoDB's TTL monitor |

### 3.14 The read order (`loadCharacter` v9)

Unchanged in order (slice 8 §3.11). The gate runs before, in the procedure's middleware, from fields the session read already returned. The settlement v9 adds, on a new day only, the Rested fill and `desk.away`. With no new day slice 9 adds **one read** to `character.me` only: an indexed `exists` on `editorNotes` for the Letters dot. The activity touch and `track()` are writes outside the request's critical path.

### 3.15 The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | any | the context and gate (§3.1) | `playerDays`, `networkSightings` (async), `telemetry` (buffered) |
| 1 | Sign-up | `POST /api/auth/sign-up/email` (bridge) | `user`, `signupCaps`, `inviteCodes`, `networkSightings`, `telemetry` |
| 2 | Me · Settings | `settings.get`, `.set`, `.purposeDone` | `characters.settings`, `.seen` (unversioned) |
| 3 | Settings · Change your name; the forced sheet | `account.rename` | `characters`, `user`, the registry's collections, `requestLogs` |
| 4 | Settings · Close your account; the closed screen | `account.close`, `.reopen`, `.status` | `user`, `characters`, `officeTerms`, `candidacies`, `eventSignups`, `session` |
| 5 | Chat · *Report this*; a profile · *Report this name* | `report.line`, `report.name` | `reports`, `chatLimits` |
| 6 | Chat composer | `chat.post` (filter) | as slice 6, plus `reports` (flags) |
| 7 | Me · *Tell us how it's going*; the Letters row | `feedback.send` | `feedback`, `telemetry` |
| 8 | The suspended and closed screens; Me · *Reply to the moderators* | `account.status`, `appeal.send` | `appeals` |
| 9 | Paper · the away row, the digest, editor notes | `paper.today`, `paper.away`, `paper.noteSeen` | `editorNotes.shownDay` / `readAt` (set-once) |
| 10 | A count view | `council.count`, `nation.result`, … (+ `setAside`, `recounted`) | — |
| 11 | `/mod` · Queue, a report | `mod.queue`, `.report`, `.take`, `.decide`, `.confirm` | `reports`, `user`, `moderationLog`, `modProposals`, `editorNotes`, the retirement |
| 12 | `/mod` · Accounts | `mod.search`, `.account`, `.memo`, `.unlink` | `moderationLog`, `accountLinks` |
| 13 | `/mod` · Audit | `audit.current`, `.history`, `.confirm`, `.setAside`, `.recountPreview`, `.recount` | `audits`, `nationalElections` / `elections`, `officeTerms`, `cities`, `characters.offices` |
| 14 | `/mod` · Log; Metrics (admins) | `mod.log`, `GET /api/mod/log.csv`, `admin.metrics`, `admin.setRole`, `admin.appeals`, `admin.answer` | `user.role`, `appeals`, `editorNotes` |

---

## 4. Content (`packages/content`) and the moderation lists

### 4.1 New content

```ts
// copy.ts (screens §15): settings, report, rename, moderation, feedback, away, maintenance, closeAccount, purpose,
// empty, audit, mod (the console), help (the four new notes, design §6.4).
// Typed ids, so a missing string is a type error, not a QA finding:
export const PURPOSE_SCREENS = ['cityQuarter', 'cityOverview', 'placeSheet', 'paper', 'me', 'factionOrders',
  'factionEvents', 'factionMembers', 'factionScoreboard', 'factionChat', 'nation', 'council', 'parliament',
  'chairDesk', 'dossier', 'wardrobe', 'journey', 'held', 'event', 'settings'] as const;     // screens §11.1, twenty
export type PurposeScreen = (typeof PURPOSE_SCREENS)[number];
copy.purpose: Record<PurposeScreen, string>      // ≤ 90 characters each (loader check)
copy.empty: Record<EmptyList, string>             // EmptyList: every list id in the client (design §6.3 plus slices 6–8's)
copy.help: Record<HelpKey, { title: string; lines: [string, string] }>   // HelpButton takes a HelpKey
copy.moderation.reasons: Record<ReasonId, { player: string; note: string; console: string }>
   // ReasonId = 'realWorld' | 'harassment' | 'voteBuying' | 'spam' | 'evasion'   (design §5.3, screens §6.1, §7)
copy.moderation.renameReasons: Record<'realWorld' | 'gameName' | 'abusive', string>
copy.report.reasons: Record<'abuse' | 'realWorld' | 'spam' | 'other', { title: string; line: string }>
copy.signup += { nameNotAllowed, emailTaken, deviceCap, networkCap, inviteInvalid, slowDown, terms }   // design §4.1
policy.ts   PolicyLine[] (≤ 20, design §5.1) · legal.ts { terms, privacy, version }   // the user's text (lane D #13)
```

### 4.2 The model rows (design §3.1)

```ts
// data/model.ts — the economy sheet's modelled player, transcribed by the designer from docs/economy.md §23 when the
// pass runs; until then the existing day 1–7 rows of §13 and §19.3.
ModelProfile = z.enum(['casual', 'reference', 'regular', 'heavy']);     // 2 / 3 / 4 / 6 sessions; buckets 1–2, 3, 4, 5+
ModelRow = z.strictObject({ profile: ModelProfile, day: z.int().min(1).max(30),
  xp: z.int(), level: z.int(), fxp: z.int(), rank: z.int().min(1).max(7), energy: z.int(),
  ironHeld: z.int(), ironIn: z.int(), ironOut: z.int(), pcHeld: z.int(), marks: z.number().optional() });
Content.model: ModelRow[]   // loader: unique (profile, day); levels and ranks non-decreasing
```

### 4.3 Loader checks (added)

- Every `PurposeScreen`, `EmptyList` and `HelpKey` has its string; purpose lines ≤ 90 characters; help notes two lines.
- `copy.moderation.reasons` covers every `ReasonId`; no player string in `copy.moderation`, `copy.report`, `copy.signup` or `copy.audit` contains a word from the refused vocabulary (§12.4).
- `content.protectedNames()` (every NPC name, the secretaries, the patrons, the local candidates, the deputies, the party figures, the mastheads and paper names) is non-empty and each name passes `fold` without collapsing to under two characters.

### 4.4 The moderation lists (`packages/moderation/lists/`, ADR 0064)

`refuse.json` (words and phrases: slurs and dehumanising terms; content-policy §7's real-world symbols, salutes, slogans and anthem lines; real-world extremist parties and leaders), `flag.json` (the vote-buying pairs, harassment words with innocent uses), `impersonation.json` (*moderator*, *admin*, *editor*, *mod*, *staff*). JSON so the user can review them as a list before the closed beta (design §5.6). **Never imported by `packages/content` or the client**; the QA vocabulary guards do not read them; refusals never echo a word; telemetry records only the verdict.

Until the user's review, the lists hold a placeholder set the designer writes (enough for the fixture tests); the review is a lane D gate (#13).

---

## 5. Data model (`packages/db`)

Twelve new collections, each for a reason (plan rule 6), plus fields on Better Auth's `user`:

| Collection | Why its own | Growth | Kept |
|---|---|---|---|
| `telemetry` | An event stream, written by every path, read only by the report | ~150–250 per player-day | TTL 180 days |
| `playerDays` | One row per account per City Day: retention and sessions | 1 per player-day | for good |
| `networkSightings` | The audit's inputs; separate retention; never in telemetry | ~1–3 per player-day | TTL 30 days |
| `signupCaps` | Atomic sign-up counters | 1 per network-day and per device | TTL 2 days (network), 400 days (device) |
| `inviteCodes` | The closed beta's codes and waves | ≤ 300 | for good |
| `accountLinks` | One row per linked pair; read at counts and at bail and visit | small | for good (inactive rows keep the history) |
| `audits` | One per count that set anything aside or noted anything; every national count | ~1 a day | for good |
| `reports` | The queue (lines, names, filter flags) | ≤ 10 per reporter a day | 365 days after resolution |
| `editorNotes` | Letters rows from the moderators, without writing the character | rare | TTL 90 days |
| `appeals` | One reply per decision | rare | text erased with the account |
| `feedback` | The weekly form's free line | ≤ 1 a player-week | TTL 90 days |
| `moderationLog` | Append-only history of every moderator act; the idempotency record | rare | for good (names erased) |
| `modProposals` | The two-person rule | rare | for good |

`chatReports` (slice 6) is migrated into `reports` and dropped (§5.15).

### 5.1 `telemetry` — new (ADR 0059)

```ts
{
  _id: ObjectId | string,          // natural for keyed acts and world events: 'action.tap:{key}', 'election.counted:{id}'
  kind: TelemetryKind,             // design §2.2's list plus api.timings, socket.reconnect, audit.recount
  at: Date, day: DayKey,
  userId: string | null,           // null for anonymous kinds
  characterId: ObjectId | null,
  sid: string | null,              // the client's session id (22 chars, base64url)
  client: { d: 'phone' | 'desktop'; vw: number; rm: 0 | 1; tl: 0 | 1 } | null,
  props: Record<string, string | number | boolean | null | number[]>,   // per-kind Zod; ids and enums only, no free text
}
```

Indexes: `{ kind: 1, day: 1 }` (the dashboards), `{ userId: 1, at: 1 }` (the funnel), `{ sid: 1, at: 1 }` partial `{ userId: null }` (anonymous sign-up steps joined to the account by `sid`), TTL `{ at: 1 }` 180 days.

### 5.2 `playerDays` — new (ADR 0059)

```ts
{ _id: '{userId}:{day}', userId: string, day: DayKey,
  spans: Array<{ from: number; to: number }>,   // minutes of the day (0–1439); ≤ 48
  minutes: number }                              // active minutes (one touch per minute)
```

Indexes: `{ day: 1 }`, `{ userId: 1, day: 1 }`. The upsert is one pipeline update: if the last span's `to` is within 30 minutes, it becomes `now`; else a span `{ now, now }` is pushed (capped at 48). A session that crosses midnight is two spans the report joins.

### 5.3 `networkSightings` — new (ADR 0060)

```ts
{ _id: ObjectId, userId: string, day: DayKey,
  ipHash: string, netHash: string,                // HMAC(saltOf(epoch), ip) and of the /24 (/48), 32 hex
  ipHashNext?: string, netHashNext?: string,      // the next epoch's, in an epoch's last 14 days
  deviceId: string,                               // the igc_d value
  spans: Array<{ from: number; to: number }>,     // minutes of the day
  signup?: true,                                  // the sign-up's row (L3, bursts)
  at: Date }                                      // TTL 30 days
```

Indexes: `{ userId: 1, day: 1, ipHash: 1, deviceId: 1 }` unique (the upsert's key), `{ ipHash: 1, day: 1 }`, `{ ipHashNext: 1, day: 1 }` sparse, `{ deviceId: 1 }`, `{ netHash: 1, signup: 1 }` partial `{ signup: true }`, TTL `{ at: 1 }` 30 days. Loopback addresses write `ipHash: 'local'` and are excluded from every link rule.

### 5.4 `signupCaps`, `inviteCodes` — new

```ts
signupCaps  { _id: 'dev:{deviceHash}' | 'net:{netHash}:{day}', count: number, expireAt: Date }   // TTL on expireAt
inviteCodes { _id: string /* 10 chars, no 0/O/1/I */, wave: 1 | 2 | 3, uses: number, max: number,
              expiresAt: Date, createdAt: Date }
```

### 5.5 `accountLinks` — new (ADR 0061)

```ts
{ _id: '{a}|{b}',                                 // characterId hex, a < b
  a: ObjectId, b: ObjectId, users: [string, string],
  kinds: Array<'device' | 'network' | 'signup'>,  // L1, L2, L3
  evidence: { devices: number; sharedDays: number; interleavings: number; overlapDays: number;
              sameBallots: number; firstDay: DayKey; lastDay: DayKey },
  active: boolean,                                // L1 or L2, not unlinked for those kinds, evidence in the window
  noted: boolean,                                 // L3 alone (never set aside without a moderator)
  household: boolean,                             // overlap ≥ 10 min on ≥ 3 days: L2 never fires
  unlinked: { by: string; at: Date; reason: string; kinds: LinkKind[] } | null,
  refreshedAt: Date }
```

Indexes: `{ a: 1, active: 1 }`, `{ b: 1, active: 1 }`, `{ noted: 1, refreshedAt: -1 }`.

### 5.6 `audits` — new (ADR 0061, 0062)

```ts
{ _id: string,                                    // the election id: 'nation:41', '{council key}', 'chair:vanguard:41', …
  kind: 'council' | 'district' | 'clearwater' | 'chair' | 'pick' | 'nation' | 'confidence',
  cityId: string | null, districtId: string | null, factionId: FactionId | null,
  countedDay: DayKey,
  status: 'final' | 'provisional' | 'confirmed',  // 'provisional' only for 'nation' until day 0
  confirmedAt: Date | null, confirmedBy: 'auto' | string | null,
  setAside: Array<{ voterId: ObjectId; setKey: string; by: 'link' | 'manual'; reason?: string }>,
  backingsSetAside: number,
  notes: Array<{ kind: 'burst' | 'ring' | 'signupPair'; setKey: string; members: ObjectId[];
                 evidence: { accounts?: number; hours?: number; party?: FactionId; window: [DayKey, DayKey] } }>,
  recounts: Array<{ day: DayKey; by: string; logId: ObjectId; changed: Array<{ seat: number; from: string; to: string }> }>,
  createdAt: Date }
```

Indexes: `{ kind: 1, countedDay: -1 }`, `{ 'setAside.voterId': 1 }` (the Accounts page's *ballots set aside this term*).

### 5.7 `reports` — new, generalising `chatReports` (ADR 0065)

```ts
{ _id: ObjectId,
  kind: 'line' | 'name' | 'filter',
  targetKey: string,                              // 'line:{messageId}' · 'name:{characterId}:{nameAtReport}'
  reporterId: ObjectId | null,                    // null for a filter flag
  reportedUserId: string, reportedCharacterId: ObjectId, reportedFactionId: FactionId,
  reason: 'abuse' | 'realWorld' | 'spam' | 'other' | 'filter' | 'voteBuying',
  tags: Array<'voteBuying' | 'url' | 'phone' | 'email' | 'harassment'>,   // the filter's
  note: string | null,                            // 'Something else', ≤ 200, filtered
  line: { messageId: ObjectId; channel: string; text: string; at: Date; authorName: string } | null,
  context: ChatLineView[],                        // up to 20 before and the lines after that exist, ≤ 40 (§22.1 Q11)
  name: string | null,                            // a name report
  state: 'new' | 'inReview' | 'dealtWith' | 'noAction',
  assignee: string | null, firstActionAt: Date | null, resolvedAt: Date | null, decisionLogId: ObjectId | null,
  createdAt: Date }
```

Indexes: `{ targetKey: 1, reporterId: 1 }` unique, `{ state: 1, createdAt: 1 }` (the queue), `{ reporterId: 1, createdAt: -1 }` (the daily figure, *baseless*), `{ reportedUserId: 1, createdAt: -1 }`, TTL `{ resolvedAt: 1 }` 365 days (unresolved reports never expire).

### 5.8 `editorNotes`, `appeals`, `feedback` — new

```ts
editorNotes { _id, characterId: ObjectId, kind: 'rung' | 'reportDealt' | 'appealAnswer',
              ref: string,                        // 'rung:{logId}' · 'reportDealt:{reportId}' · 'appeal:{appealId}'
              reasonId: ReasonId | null, answer: 'upheld' | 'lifted' | null,
              day: DayKey, shownDay: DayKey | null, readAt: Date | null, createdAt }        // TTL createdAt 90 days
            indexes: { characterId: 1, ref: 1 } unique · { characterId: 1, readAt: 1, day: -1 }
appeals     { _id, userId: string, logId: ObjectId, text: string | null /* null after erasure */, at: Date,
              answer: 'upheld' | 'lifted' | null, answeredBy: string | null, answeredAt: Date | null }
            indexes: { logId: 1 } unique · { answer: 1, at: 1 }
feedback    { _id: '{userId}:{week}', userId: string, week: number, scores: [1|2|3|4|5 ×5],
              line: string | null, flagged: boolean, at: Date }                             // TTL at 90 days
```

### 5.9 `moderationLog`, `modProposals` — new (ADR 0063)

```ts
moderationLog { _id, actorId: string /* userId | 'auto' | 'system' */, actorRole: 'moderator' | 'admin' | 'system',
  idempotencyKey: string | null,
  action: 'take' | 'noAction' | 'note' | 'mute' | 'suspend' | 'close' | 'rename' | 'lift' | 'unlink' | 'setAside'
        | 'confirm' | 'recount' | 'role' | 'memo' | 'propose' | 'appealAnswer' | 'selfClose' | 'reopen' | 'erase',
  subjectUserId: string | null, subjectName: string | null,      // a snapshot, erased with the account
  reportId: ObjectId | null, electionId: string | null, proposalId: ObjectId | null,
  reasonId: ReasonId | null, memo: string | null /* moderators only */, until: Date | null, at: Date }
  indexes: { actorId: 1, idempotencyKey: 1 } unique partial (key exists) · { subjectUserId: 1, at: -1 } · { at: -1 }
modProposals { _id, subjectUserId, action, reasonId, until: Date | null, reportId: ObjectId | null,
  proposedBy: string, at: Date, status: 'open' | 'done' | 'withdrawn', confirmedBy: string | null }
  indexes: { subjectUserId: 1, action: 1 } unique partial { status: 'open' }
```

No service updates or deletes a `moderationLog` row except the erasure's `subjectName`.

### 5.10 Better Auth's `user` — additional fields (ADR 0063)

Declared in `createAuth` as `user.additionalFields`, every one `input: false` except `invite` (read at sign-up only):

| Field | Type | Default |
|---|---|---|
| `role` | `'player' \| 'moderator' \| 'admin'` | `'player'` |
| `emailNorm` | string | set by the create hook |
| `modState` | `'clear' \| 'muted' \| 'suspended' \| 'closed'` | `'clear'` |
| `modUntil` | Date \| null | null |
| `modReason` | ReasonId \| null | null |
| `modLogId` | string \| null | null (the decision a reply answers) |
| `renameReason` | `'realWorld' \| 'gameName' \| 'abusive'` \| null | null |
| `closedBy`, `closedDay` | `'self' \| 'moderator'`, DayKey | null |
| `erasedAt` | Date \| null | null |
| `tester` | boolean | false (left out of every figure) |
| `invite` | string \| null | the code used |
| `termsVersion` | number | the version accepted at sign-up |

Indexes on `user` (created by `ensureIndexes` with the native driver): `{ emailNorm: 1 }` unique partial `{ emailNorm: { $type: 'string' } }`, `{ modState: 1, closedDay: 1 }`, `{ role: 1 }`, `{ email: 1 }` if Better Auth has not made it.

Better Auth's `disabledPaths`: `/update-user` (names go through `account.rename`), `/delete-user` (closure is ours), `/change-email` (the normalised email and the caps). Password change and reset stay.

### 5.11 `characters` — changed embedded fields

```ts
{
  ...slice 8,
  settings: { motion: 'device' | 'reduced', text: 'standard' | 'large', night: 'clock' | 'day',
              clouds: 'on' | 'off', chat: 'shown' | 'hidden' },          // unversioned (ADR 0040); chat.hidden moves here
  seen: { purpose: PurposeScreen[] },                                     // unversioned, ≤ 30
  renamedDay: DayKey | null,
  retired: { day: DayKey; by: 'self' | 'moderator' } | null,
  today += { bailsXp: number },                                           // bails that paid Party XP today (≤ 3)
}
```

Index added: `{ nameWords: 1 }` (the console's search across factions).

### 5.12 Changed collections

- **`cities`, `districts`**: `active: { days: Array<{ day: DayKey; n: number }>, mean: number }` (on every place document that takes opinion: home cities, capital districts, Clearwater).
- **`influenceLedger`**: `damped?: number`. Index added `{ placeId: 1, day: 1, kind: 1 }` if slice 4's indexes do not cover the boundary's distinct count.
- **`elections`** (councils, districts, Clearwater), **`factionElections`**, **`nationalElections`**: the stored result gains `setAside: number`, `recountedDay?: DayKey`, rows `afterRecount?: true`; council and district results gain `inputs` where a recount needs them and slices 3–7 did not store them (the opinion shares and the turnout's eligible at the count).
- **`officeTerms`**: `recounted?: 'lost' | 'won'`; `vacatedBy?: 'move' | 'dissolution' | 'retired' | 'recount'`.
- **`chatLimits`**: `reports: { day: DayKey; n: number }`.
- **`paperEntries`**: `desk.away: { days: number; from: DayKey; banked: { iron: number; rested: number; filled: boolean } } | null`.
- **`requestLogs`**: `REQUEST_KINDS` += `account.rename`, `account.close`, `account.reopen`, `report.line`, `report.name`, `feedback.send`, `appeal.send`.

### 5.13 The name-snapshot registry (ADR 0066)

`packages/db/src/names.ts` exports `NAME_SNAPSHOTS: Array<{ model, path, idPath, scope: 'live' | 'record' }>`: every denormalised copy of a player's name, with the path of the character id beside it. From slices 3–8: `candidacies.name`, `candidacies.endorsements.$[].name`, `characters.endorsementsGiven.$[].name`, the stored count rows of `elections`, `factionElections` and `nationalElections` (rows, backers, lists, the President), `officeTerms` holder names where stored, `contributions.name`, `issues.top.$[].name`, `awards.name`, `campaignEvents` roster and caller names, `eventSignups.name`, `stays.bailPostedBy.name`, `factions.chair.name`, `nation.government` names, `bills` tabler and vote names, `petitions.signatures.$[].name`, `chatMessages.author.name`, `reports.line.authorName` and `context.$[].name`, `moderationLog.subjectName`; **records** (rewritten only by a forced rename and erasure): `seasons` awards and presidents, `nation.lastSeason`, `legacyEntries` params with names. Printed text (`paperEntries.headlines.$[].headline`, `nation.news` params) is handled by `scrubPrinted`.

A **schema-walk test** walks every Mongoose schema and fails on any path ending in `name` that sits beside a `characterId` (or inside an array of objects with one) and is neither in the registry nor in an explicit `NOT_A_PLAYER_NAME` list (NPC and place names).

### 5.14 Migration `011-slice9-launch.ts`

`ensureIndexes()` runs it after 010. Idempotent: each step filters on the field's absence.

1. **Characters**: `settings` from `chat.hidden` (`chat: hidden ? 'hidden' : 'shown'`, the rest the defaults), `$unset chat.hidden`; `seen.purpose: []`; `renamedDay: null`; `retired: null`; `today.bailsXp: 0`.
2. **Reports**: each `chatReports` row → `reports` (`kind: 'line'`, `reason: 'other'`, `state: 'new'`, the context as stored); then `chatReports` is dropped once the counts match.
3. **Users**: `role: 'player'`, `modState: 'clear'` and the other defaults; `emailNorm` from `email`. **Duplicates** (two accounts whose normalised emails meet) keep `emailNorm` on the older only; each younger one gets a `moderationLog` `memo` (*same email as {name}*) for the console, nothing else.
4. **Names**: every character's name through `checkName`; a failure sets `user.renameReason` (`realWorld` or `gameName`) and writes *A Newcomer* through the registry (design §5.4: checked once).
5. **Places**: `active: { days: [], mean: 0 }`.
6. **The first admin**: `ADMIN_EMAIL`'s user, if present, gets `role: 'admin'` (also done at API start and at sign-up).

A test runs 011 twice (no change the second time) on a seeded slice-8 database.

---

## 6. Rules and packages — pure, no I/O

### 6.1 Constants (`packages/rules/constants.ts`)

```ts
export const LINKS = { windowDays: 30, sharedNetworkMax: 50,
  l2: { days: 3, of: 14, interleavings: 3, gapMin: 10 }, household: { overlapMin: 10, days: 3 },
  l3: { hours: 48, ballots: 3 }, burst: { accounts: 5, hours: 48 } } as const;            // design §4.3, §4.5
export const SIGNUP = { perDevice: 2, perNetworkDay: 3 } as const;                          // design §4.1
export const RATE = { accountPerMin: 60, ipPerMin: 600, beaconPerMin: 120, beaconBatch: 50 } as const;
export const SESSION = { gapMin: 30 } as const;                                              // GDD §27
export const DAMPING = { reference: 20, floor: 0.25, days: 7 } as const;                     // design §3.3
export const AWAY = { rowFrom: 2, fullFrom: 30, digestDays: 30, perDay: 6 } as const;        // design §6.6
export const RENAME = { everyDays: 30 } as const;                                            // design §5.4
export const REPORTS = { perDay: 10, baselessWeek: 3 } as const;                             // design §5.2
export const LADDER = { muteHours: [24, 168], suspendDays: [3, 14], reopenDays: 30, eraseDays: 30 } as const;
export const BAIL += { xpPerDay: 3 };                                                        // design §4.4
export const FEEDBACK = { days: [7, 14, 21, 28], lineMax: 500 } as const;                    // design §9.3
export const RETENTION = { telemetry: 180, sightings: 30, feedback: 90, notes: 90, reports: 365 } as const;
```

### 6.2 `audit.ts` (ADR 0061, 0062)

```ts
export interface Span { from: number; to: number }                     // epoch minutes
export interface SightingRow { account: string; day: DayKey; ip: string; device: string; spans: Span[] }
export interface SignupRow { account: string; createdAt: number; device: string; net: string }
export type LinkKind = 'device' | 'network' | 'signup';
export interface Link { a: string; b: string; kinds: LinkKind[]; active: boolean; noted: boolean; household: boolean;
  evidence: LinkEvidence }

export function pairEvidence(a: SightingRow[], b: SightingRow[], today: DayKey): LinkEvidence;
export function findLinks(i: { rows: SightingRow[]; signups: SignupRow[]; firstBallots: Map<string, string[]>;
  today: DayKey; unlinked: Map<string, LinkKind[]> }): Link[];            // L1–L3, the household rule, shared networks
export function linkedSets(edges: ReadonlyArray<[string, string]>): Map<string, string>;   // member → setKey (smallest id)
export function collapseBySet<T extends { voter: string; at: number }>(rows: readonly T[],
  setOf: ReadonlyMap<string, string>, manual?: ReadonlySet<string>): { kept: T[]; setAside: Array<T & { setKey: string }> };
export function countableBackings<T extends { characterId: string; at: number }>(backers: readonly T[],
  setOf: ReadonlyMap<string, string>): T[];                               // one backer per set per name
export function rankBySet<T extends { id: string; amount: number; lastAt: number }>(rows: readonly T[],
  setOf: ReadonlyMap<string, string>, earliestOf: (setKey: string) => string): T[];   // summed under the earliest account
export function findBursts(signups: readonly SignupRow[], party: ReadonlyMap<string, FactionId>): Note[];
export function findRings(backings: ReadonlyArray<{ from: string; to: string }>): Note[];   // strongly connected, closed
export function tallyOf(rows: ReadonlyArray<{ candidateKey: string }>): Record<string, number>;
export function recountRows(kind: 'council' | 'district' | 'clearwater', stored: StoredCount,
  votes: Record<string, number>): { rows: CountRow[]; seated: CountRow[]; changed: SeatChange[] };
export function bailPaysXp(i: { linked: boolean; paidToday: number }): boolean;
```

### 6.3 `damping.ts`, `away.ts`, and small functions

```ts
export function swingFactor(active: number): number;                     // clamp(20 ÷ active, 0.25, 1)
export function rollActive(days: ReadonlyArray<{ day: DayKey; n: number }>, day: DayKey, n: number):
  { days: Array<{ day: DayKey; n: number }>; mean: number };              // replaces a same-day entry; keeps the last 7
export function restedAfterAbsence(windowDays: number, rested: number, cap: number): number;
export interface AwayFact { day: DayKey; scope: 'republic' | 'city' | 'branch'; templateId: string;
  params: Record<string, string | number>; priority: number }
export function awaySummary(i: { days: number; facts: readonly AwayFact[]; banked: AwayBanked; letters: number;
  welcomeBack: boolean }): AwayRowLines;                                  // ≤ 4 lines, one per scope by priority
export function foldDigest(facts: readonly AwayFact[], perDay?: number): Array<{ day: DayKey; facts: AwayFact[] }>;
export function renameGate(renamedDay: DayKey | null, today: DayKey): { ok: true } | { ok: false; from: DayKey };
export function feedbackWeek(joinDay: DayKey, today: DayKey): number;     // floor((today − joinDay) ÷ 7)
export function feedbackAskDue(i: { joinDay: DayKey; today: DayKey; sentWeeks: readonly number[];
  firstSeatYesterday: boolean }): boolean;                                // days 7, 14, 21, 28 and the morning after a first seat
export function eventsFromResult(result: ActionResult | PoliticalResult | MissionResult): DerivedEvent[];
                                                                          // levelup, rankup, standing.level, pc.spent
```

### 6.4 `packages/moderation` (ADR 0064)

```ts
export function fold(text: string): string;          // lower case, NFKD without marks, leet (0→o 1→i 3→e 4→a 5→s 7→t @→a $→s |→l),
                                                     // repeats collapsed
export function foldTight(text: string): string;     // fold, then spaces and punctuation removed (names, phrases)
export type Verdict = { verdict: 'ok' } | { verdict: 'refuse' }
                    | { verdict: 'flag'; tags: Array<'voteBuying' | 'url' | 'phone' | 'email' | 'harassment'> };
export function checkText(text: string, lists?: Lists): Verdict;   // refuse: a listed word as a whole folded token, a phrase in
                                                                   // the tight form; flag: the pairs within 12 words, URLs,
                                                                   // phone numbers, emails, the soft list
export function checkName(name: string, protectedNames: readonly string[], lists?: Lists):
  { ok: true } | { ok: false; why: 'refused' | 'impersonation' };  // impersonation: a protected name as a whole word or the whole name
export function normaliseEmail(email: string): string;             // lower case; +tags dropped; gmail/googlemail dots dropped
export function moderationAt(u: { modState: ModState; modUntil: Date | null }, now: number):
  { state: ModState; until: number | null };                       // muted / suspended past modUntil → clear
export function suggestRung(history: ReadonlyArray<{ action: string; reasonId: ReasonId | null; at: number }>,
  reasonId: ReasonId): Rung;                                       // realWorld → suspend14d, then close; voteBuying → suspend3d; …
export function csvCell(value: string): string;                    // the log's export: quotes, and a leading = + - @ neutralised
```

### 6.5 Tests (Vitest)

- **Links:** L1 on a shared device; L2 at exactly 3 days, 3 interleavings, a 10-minute gap, and its misses at 2 / 2 / 11; a household (overlap 10 minutes on 3 days) never L2, also when it later interleaves; a 2-minute overlap on one shared day kills L2; an IP-day of 51 accounts gives nothing; L3 at 48 hours with the same three first ballots, missed at 49 hours or a different third ballot; unlinked kinds stay off and a new kind re-activates; evidence older than 30 days drops a link.
- **Sets and collapsing:** components across a non-voter; the earliest ballot stands (ties by id); manual set-asides; backings once per set per name; `rankBySet` sums under the earliest account and keeps ledger rows; bursts of 5 within 48 hours on one /24 all voting one party, not 4, not across two parties; a ring of three backing only each other, not a ring with one outside backing.
- **Counts:** a council where a set of three collapses to one changes the seventh seat; a district's ballot half with a set; `recountRows` for each kind reproduces the stored count with no set-asides and moves a seat with one.
- **Damping:** `swingFactor` at 0, 20, 21, 40, 80, 100, 500 (1, 1, 0.952, 0.5, 0.25, 0.25, 0.25); `rollActive` replaces a same-day entry and keeps seven.
- **Away:** the four lines' priority per scope; *Welcome back* at 30; Rested to the cap at 30, unchanged at 29; the digest folds and caps at six a day.
- **Moderation package:** a fixture of refused and allowed strings in every spelling the folding catches; **every string in the game's content** (titles, orders, headlines, place names, NPC names, copy) passes `checkText` (`strike`, `rally`, `gate`, *Fortress Gate*); impersonation of each protected name and of *Moderator* / *the editor*, and *Anna Weiss-Baum* not refused for *Weiss* unless *Weiss* is protected as a whole name; `normaliseEmail` cases; `moderationAt` at the edges; `csvCell`.
- **Small:** `renameGate` at 29 and 30 days; `feedbackAskDue` on days 6–8 and after a first seat; `bailPaysXp`; `eventsFromResult` for a level-up, a rank-up and a PC spend.

---

## 7. The read path and the guards (`apps/server`)

### 7.1 Procedures by gate

| Gate | Procedures |
|---|---|
| `publicProcedure` | `health.*` |
| `accountProcedure` (any state, signed in) | `account.status`, `account.reopen`, `appeal.send`, `settings.get` |
| `playProcedure` (clear or muted) | every game procedure of slices 0–8, and `settings.set`, `settings.purposeDone`, `account.rename`, `account.close`, `report.*`, `feedback.send`, `paper.away`, `paper.noteSeen` |
| `modProcedure` (moderator or admin) | `mod.*`, `audit.*` |
| `adminProcedure` | `admin.*` |

A moderator's or admin's own play goes through `playProcedure` like anyone's.

### 7.2 Refusals

| Procedure | Refuses |
|---|---|
| any mutation | `SLOW_DOWN { retryAt }` (429), `MAINTENANCE { until }` (503) |
| `playProcedure` | `ACCOUNT_SUSPENDED { until, reasonId }`, `ACCOUNT_CLOSED { by, reopenUntil }` (403) |
| `chat.post` | slice 6's, plus `MUTED { until }`, `CANT_BE_SAID` |
| `account.rename` | `NAME_BLANK`, `NAME_TOO_SHORT`, `NAME_TOO_LONG`, `NAME_NOT_ALLOWED`, `NAME_SAME`, `RENAME_TOO_SOON { from }` |
| `account.close` | `CONFIRM_REQUIRED` (not `CLOSE`), `ALREADY_CLOSED` |
| `account.reopen` | `NOT_CLOSED`, `CLOSED_BY_MODERATORS`, `REOPEN_EXPIRED` |
| `report.line` | `CANNOT_REPORT` (a system line, your own line, another faction's channel), `REPORTS_TODAY`, `CANT_BE_SAID` (the note) |
| `report.name` | `CANNOT_REPORT` (yourself, a name you cannot see), `REPORTS_TODAY` |
| `feedback.send` | `FEEDBACK_STAMPS` (not five), `MUTED` (only when a line is sent: the stamps are kept, the line dropped), `CANT_BE_SAID` (the line dropped, the stamps kept: the result says so) |
| `appeal.send` | `NOTHING_TO_APPEAL`, `APPEAL_SENT` |
| `mod.decide` | `NOT_FOUND`, `NEEDS_SECOND { proposalId }` (not an error: the result), `SELF` (your own account), `ALREADY_DECIDED` |
| `mod.confirm` | `OWN_PROPOSAL`, `PROPOSAL_CLOSED` |
| `audit.confirm`, `.setAside` | `AUDIT_CLOSED` (not provisional), `NOT_NOTED` |
| `audit.recount` | `NOT_RECOUNTABLE` (not a council, district or Clearwater count; not counted today), `NO_CHANGE` (allowed: logged) |
| `admin.setRole` | `SELF` (an admin cannot demote themselves), `LAST_ADMIN` |

The client turns `ACCOUNT_SUSPENDED`, `ACCOUNT_CLOSED` and `MAINTENANCE` into their screens, `FORBIDDEN` on `/mod` into the not-found page, and `SLOW_DOWN` into the one-line *Slow down a moment.*

---

## 8. API (`apps/server`)

### 8.1 Procedures

`Oid = z.string().regex(/^[0-9a-f]{24}$/)`; `Key = z.uuid()`; `ReasonId = z.enum(['realWorld', 'harassment', 'voteBuying', 'spam', 'evasion'])`; `ReportReason = z.enum(['abuse', 'realWorld', 'spam', 'other'])`; `Score = z.int().min(1).max(5)`.

```ts
// Settings (set-to-state, unversioned, no key: ADR 0008's allowance)
settings.get          ()                                                       → SettingsView
settings.set          ({ key: z.enum(['motion','text','night','clouds','chat']), value: z.string() })   // refined per key
                                                                               → SettingsView
settings.purposeDone  ({ screen: z.enum(PURPOSE_SCREENS) })                    → void
// The account
account.status        ()                                                       → AccountStatusView
account.rename        ({ name: z.string().max(200), idempotencyKey: Key })      → { name: string; nextFrom: DayKey }
account.close         ({ confirm: z.literal('CLOSE'), idempotencyKey: Key })     → { closedDay: DayKey; reopenUntil: DayKey }
account.reopen        ({ idempotencyKey: Key })                                 → AccountStatusView
appeal.send           ({ text: z.string().trim().min(1).max(500), idempotencyKey: Key }) → { sentAt: number }
// Reports and feedback
report.line           ({ messageId: Oid, reason: ReportReason, note: z.string().max(200).optional(), idempotencyKey: Key })
                                                                               → { ok: true; already: boolean }
report.name           ({ characterId: Oid, reason: ReportReason, note: z.string().max(200).optional(), idempotencyKey: Key })
                                                                               → { ok: true; already: boolean }
feedback.send         ({ scores: z.tuple([Score, Score, Score, Score, Score]), line: z.string().max(500).optional(),
                         idempotencyKey: Key })                                → { week: number; lineKept: boolean }
// The paper
paper.away            ()                                                       → AwayDigestView
paper.noteSeen        ({ id: Oid })                                            → void      // editorNotes.readAt, set-once
// The console (moderator or admin)
mod.me                ()                                                       → { role; name; counts: { new; inReview; proposals } }
mod.queue             ({ state?: State, reason?: QueueReason, factionId?: FactionId, olderThanDay?: z.boolean(),
                         cursor?: Oid })                                       → QueuePage
mod.report            ({ id: Oid })                                            → ReportCardView
mod.take              ({ id: Oid, idempotencyKey: Key })                        → ReportCardView
mod.decide            ({ subjectUserId: z.string().min(1).max(64), reportId: Oid.optional(),
                         action: z.enum(['noAction','note','mute24h','mute7d','suspend3d','suspend14d','close','rename']),
                         reasonId: ReasonId.optional(),                        // required except noAction; rename uses renameReason
                         renameReason: z.enum(['realWorld','gameName','abusive']).optional(),
                         memo: z.string().max(500).optional(), idempotencyKey: Key })
                                                                               → { done: true; logId } | { proposed: true; proposalId }
mod.confirm           ({ proposalId: Oid, idempotencyKey: Key })                → { done: true; logId }
mod.withdraw          ({ proposalId: Oid })                                    → void
mod.search            ({ q: z.string().trim().min(2).max(80) })                → AccountRowView[]   // name words or email prefix
mod.account           ({ userId: z.string().min(1).max(64) })                  → AccountPageView
mod.memo              ({ userId, text: z.string().min(1).max(500), idempotencyKey: Key }) → void
mod.unlink            ({ a: Oid, b: Oid, reason: z.string().min(1).max(200), idempotencyKey: Key }) → AccountPageView
mod.log               ({ actorId?: z.string(), action?: LogAction, cursor?: Oid }) → LogPage
audit.current         ()                                                       → AuditPageView
audit.history         ()                                                       → AuditRowView[]   // the last ten
audit.confirm         ({ electionId: z.string().min(1).max(80), idempotencyKey: Key })      → AuditPageView
audit.setAside        ({ electionId, setKey: z.string().min(1).max(64), reason: ReasonId, idempotencyKey: Key }) → AuditPageView
audit.recountPreview  ({ electionId })                                         → RecountPreviewView
audit.recount         ({ electionId, idempotencyKey: Key })                    → RecountPreviewView
// Admins
admin.setRole         ({ userId, role: z.enum(['player','moderator','admin']), idempotencyKey: Key }) → AccountPageView
admin.appeals         ({ cursor?: Oid })                                       → AppealPage
admin.answer          ({ appealId: Oid, answer: z.enum(['upheld','lifted']), idempotencyKey: Key }) → void
admin.metrics         ({ from: DayKeyInput, to: DayKeyInput, factionId: FactionId.optional() }) → MetricsReport

// Changed
chat.post   (+ the filter: MUTED, CANT_BE_SAID; a flag queues)   · chat.report → removed (report.line replaces it)
chat.setHidden → removed (settings.set 'chat')                   · character.me → CharacterView v10
paper.today → PaperView v9 · every count view (+ setAside, recounted, afterRecount) · faction.profile (+ canReport)
favours.postBail (Party XP by bailPaysXp) · favours.visit (a linked visit heals and pays nothing; not one of the three)
```

### 8.2 Fastify routes and hooks

| Route / hook | Does |
|---|---|
| `onRequest` (all `/api/*`) | sets `igc_d` when absent; answers 503 under `MAINTENANCE_UNTIL` (not `/healthz`, not `/api/telemetry`) |
| the auth bridge (`/api/auth/*`) | `signupGuard` on `POST /api/auth/sign-up/email` (§3.2), then Better Auth as today |
| `POST /api/telemetry` | `text/plain` or JSON; `{ events: TelemetryEventIn[] }` ≤ 50; Zod per kind; signed out: anonymous kinds only; 120 a minute per `sid`; 204 |
| `GET /api/mod/log.csv` | admins: the log as CSV (`csvCell`), streamed |
| `GET /healthz` | `+ maintenance: { until } \| null` |
| `x-irongate-test-ip` header | honoured only with `E2E_TEST_HOOKS` (memory mode): the request's address for sightings and caps |

### 8.3 Services

**`activity.ts`** (ADR 0059, 0060): `touch({ userId, ip, deviceId, now })` with a per-process memo `Map<string, minute>` (pruned each minute); `playerDays` and `networkSightings` pipeline upserts with `bulkWrite`; errors logged, never thrown; `flush()` for tests. `hashIp(ip, epoch)`, `netOf(ip)` (/24, /48; IPv4-mapped IPv6 unwrapped), `saltOf(epoch) = HMAC(AUDIT_SECRET, 'ip:' + epoch)`.

**`telemetry.ts`** (ADR 0059): `track(ctx, kind, props, opts?: { id?: string })` validates `props` against the kind's Zod schema in development and test (a schema miss is a test failure, a production miss is dropped and counted), pushes to the buffer; `trackWorld(kind, ref, props)`; `trackResult(ctx, result)` (the derived events); the buffer flushes on a 2-second timer, at 100 events and on shutdown. **Instrumented services** (lane B, T9): arrival (origin steps, faction), action and training, mission and encounter, held, orders, stat, job, every vote, candidacy and endorsement, council and Parliament votes, travel, residence, events (call, sign-up, withdraw, resolution in the world), chat (count), reports, favours, dossier, patron, shop, home, settings, feedback, paper (opened, with `daysAway`).

**`signupGuard.ts`** (ADR 0060): §3.2; the abuse config (caps on or off, from the environment, switchable by the test hook); refusals in Better Auth's error shape `{ code, message }` with the copy.

**`links.ts`** (ADR 0061): `refreshLinks(now)` reads 30 days of sightings, the sign-up rows, the first three ballots of accounts created in the window, the unlinked map; runs `findLinks`; bulk upserts by pair; marks rows not found as `active: false, noted: false`. `setsFor(session, characterIds)`: active rows touching the ids (two indexed reads), then `linkedSets`, expanding one hop at a time until closed (bounded by the component). `linkedPair(session, a, b)` for bail and visits.

**`countSeams.ts`** (ADR 0061): `countableTally(session, electionId)` → `{ votes, kept, setAside }` (replaces slice 3's `tally`); `countableBackingsOf(session, candidacies)`; `writeAudit(session, …)`. Callers: `cityDayCore` (council, district, Clearwater counts), the nation's day (Chair, picks, republic, votes on the Chair), petitions' close, `resolveEvent` (hands), the hero and Issue awards, the scoreboard's read (the top 50 read, collapsed, ten shown).

**`auditService.ts`** (ADR 0062): `current`, `history`, `confirm` (filter `status: 'provisional'`), `setAside` (the noted set's members' ballots → manual; `countNation` re-run with the stored inputs and the new tally; the result replaced while provisional), `unlink` (via `mod.unlink`, then the same re-run), `recountPreview`, `recount` (§3.7). The take-office step calls `confirmIfProvisional(session, electionId)` first.

**`moderationService.ts`** (ADR 0063, 0065): `queue` (sorted oldest first, a reporter with three baseless reports this week after the rest, *Needs another moderator* on rows with an open proposal), `report` (the card: the line and its context, the reporter's reason and standing, the reported account's rung history and notes), `take`, `decide` → `needsSecond` → `modProposals` or `applySanction(session, …)`, `confirm`, `withdraw`, `search` (`characters.nameWords` prefix, `user.email` / `emailNorm` prefix), `account` (the public profile, state, rungs, notes, links as *same device* / *same network* with the evidence window, ballots set aside this term), `memo`, `unlink`, `log`. Every mutation inserts its `moderationLog` row in the same transaction (E11000 on `{ actorId, idempotencyKey }` returns the stored outcome).

**`accountService.ts`** (ADR 0066, 0067): `status`, `rename` (§3.9; `withRequestKey('account.rename')`), `close`, `reopen`, `retireCharacter(session, c, today, by)` (generalising slice 4's `vacateSeat` to every office kind with §22.1 Q2's defaults), `renameEverywhere(session, characterId, name, scope)`, `scrubPrinted(oldName, replacement)` (batched `updateMany` with array filters on a word-bounded match, after the commit), `promoteFirstAdmin`.

**`reportService.ts`, `feedbackService.ts`, `appealService.ts`** (ADR 0065): §3.8; `feedback.send` upserts `feedback` by `{userId}:{week}` (a second send replaces) and tracks `feedback.sent` with the scores.

**`awayService.ts`** (ADR 0071): `facts(c, from, to)` (indexed range reads; the residence city and the home city when different; the faction), `row`, `digest`.

**The settlement v9**: `restedAfterAbsence` and `desk.away` (§3.12).

**`cityDay.ts`**, **`capitalDay.ts`**, the battleground day: the damping ring (§3.11) in each place's boundary; counts through `countableTally`; `day.rollover` telemetry with the duration and the characters settled since the boundary.

**`favourService`**: `postBail` reads `linkedPair` and `today.bailsXp` in its transaction; `visit` reads `linkedPair` (a linked visit: no heal, no Party XP, not counted among three; the visitor's Energy is still spent and the modal reads as a visit made).

### 8.4 Views

```ts
interface SettingsView { motion: 'device' | 'reduced'; text: 'standard' | 'large'; night: 'clock' | 'day';
  clouds: 'on' | 'off'; chat: 'shown' | 'hidden'; rename: { allowed: boolean; from: DayKey | null };
  version: string }
interface AccountStatusView { state: 'clear' | 'muted' | 'suspended' | 'closed'; until: number | null;
  reasonId: ReasonId | null; closed: { by: 'self' | 'moderator'; day: DayKey; reopenUntil: DayKey | null } | null;
  reply: { allowed: boolean; sentAt: number | null; answer: 'upheld' | 'lifted' | null } }
CharacterView v10 += { settings: SettingsView-without-rename; purposeSeen: PurposeScreen[];
  moderation: { muted: number | null; renameReason: RenameReason | null; replyable: boolean };
  lettersDot: boolean /* + unread editor notes */ }
PaperView v9 += { away: AwayRowView | null; notes: EditorNoteRowView[]; feedbackAsk: boolean;
  nationalConfirmed?: { setAside: number } }
interface AwayRowView { kicker: 'away' | 'welcomeBack'; lines: string[] /* ≤ 4, filled */; days: number }
interface AwayDigestView { from: DayKey; to: DayKey; days: Array<{ day: DayKey; rows: Array<{ headline: string;
  scope: 'republic' | 'city' | 'branch' }> }> }
CountView += { setAside: number; recounted: DayKey | null; rows[].afterRecount: boolean }
ChatPageView += { composer: { muted: number | null } }
ProfileView += { canReport: boolean }
// The console (moderator words; may say *linked* and *set aside*, never *cheater*)
interface QueueRowView { id; kicker: 'ABUSE' | 'REAL-WORLD' | 'SPAM' | 'OTHER' | 'FILTER' | 'VOTE-BUYING'; excerpt: string;
  reported: string; reporter: string | null; ageMs: number; state: State; needsSecond: boolean; deprioritised: boolean }
interface ReportCardView { row: QueueRowView; line: ChatLineView | null; context: ChatLineView[]; name: string | null;
  note: string | null; reporterStanding: { thisWeek: number; baseless: number } | null;
  subject: { userId; name; factionId; state: AccountStatusView['state']; until: number | null;
             rungs: Array<{ action; reasonId; at }>; notes: string[] };
  suggested: Rung; proposal: { id; action; by; at } | null; actions: Array<{ action; allowed: boolean; why: string | null }> }
interface AccountPageView { profile: ProfileView; userId; email: string /* admins only; masked for moderators */;
  state; rungs; memos; links: Array<{ name; kind: 'sameDevice' | 'sameNetwork' | 'signup'; window: [DayKey, DayKey];
  active: boolean; unlinked: boolean }>; setAsideThisTerm: Array<{ electionId; label: string; n: number }>; role }
interface AuditPageView { electionId; term: number; countedDay: DayKey;
  status: 'provisional' | 'confirmed'; confirmedBy: 'auto' | string | null; confirmAt: number;
  result: NationalResultView; setAside: { total: number; linked: number; manual: number };
  sets: Array<{ setKey; kind: 'linked' | 'burst' | 'ring' | 'signupPair'; members: string[]; window: [DayKey, DayKey];
                setAside: boolean }>;
  recountable: Array<{ electionId; label: string }> }
interface RecountPreviewView { electionId; before: SeatRow[]; after: SeatRow[]; changed: SeatChange[]; done: boolean }
MetricsReport            // §13
```

### 8.5 Realtime

Nothing new. A suspended or closed player's open socket is not chased: the socket is push-only (ADR 0038), their next tRPC call shows the screen and the client disconnects; posting is refused by the gate. The handshake refuses a suspended or closed account.

### 8.6 Test hooks (only with `E2E_TEST_HOOKS`, memory mode; refused when `NODE_ENV=production`)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/abuse` | `{ signupCaps?: boolean, links?: boolean }` | switches the caps and the link rules for the process (both off by default in memory mode, so local play and e2e are not refused) |
| `x-irongate-test-ip` header | an address | the request's address for sightings and caps |
| `POST /api/test/role` | `{ role, tester?: boolean }` | the caller's role and tester flag |
| `POST /api/test/link` | `{ withCharacterId, kind: 'device' \| 'network' \| 'signup' }` | writes an `accountLinks` row through `refreshLinks`' writer (for specs that need a link without sightings) |
| `POST /api/test/links/refresh` | — | runs `refreshLinks(now)` |
| `POST /api/test/moderation` | `{ state, hours? }` · `{ renameReason }` · `{ closedDaysAgo }` | the caller's state through `applySanction` (as `system`) |
| `POST /api/test/erase` | — | runs the erasure sweep at the test clock |
| `POST /api/test/maintenance` | `{ until: number \| null }` | the maintenance flag for the process |
| `POST /api/test/away` | `{ days: number }` | moves the test clock forward without the caller's requests (the worker's days run) |
| `GET /api/test/dev/metrics` | `?from&to&factionId` | `buildMetrics` for the dev panel |

### 8.7 The dev panel

- **Measure:** *Metrics* (the console's page, same component), *Flag me as a tester*, *Telemetry: last 50 events* (kind, at, props).
- **Abuse:** *Sign-up caps on/off*, *Link rules on/off*, *Link me to a test member (device / network / sign-up)*, *Refresh links now*.
- **Moderation:** *Make me a moderator / admin / player*, *Mute me 24 h*, *Suspend me 3 days*, *Make me rename*, *Close my account 29 / 31 days ago*.
- **Away:** *Away 3 days*, *Away 31 days*.
- **Maintenance:** *Stop the presses for 10 minutes*, *Start them again*.
- **Damping:** the place's `active.mean` and today's factor in `GET /api/test/dev/status`.
- **Colour vision:** in the dev viewer, an SVG `feColorMatrix` filter on the root (deuteranopia, protanopia, tritanopia).

---

## 9. Scheduled jobs (Agenda)

| Job | When | Does | Idempotency |
|---|---|---|---|
| `links-refresh` (**new**) | 23:50 UTC daily, and at worker start | `refreshLinks(now)` | upsert by pair `_id`; a pure recompute of the window |
| `account-erase` (**new**) | 00:10 UTC daily, and at worker start | erases accounts closed 30 days ago (§3.10), one transaction per account, then the printed scrub | filter `erasedAt: null`; the registry's replacement is the same on a rerun |
| `city-day` (extended) | unchanged (00:01) | counts through `countableTally` with `audits`; the damping ring; `day.rollover`, `election.counted` telemetry | ADR 0017's guards; `audits._id` unique; natural telemetry ids |
| `nation-day` (extended) | unchanged (00:02) | before term day 27's boundary, `refreshLinks`; the national count with set-asides and the provisional audit; at day 0, the audit confirmed before taking office | `nation.world.settledDay`; `audits.status` filter; natural ids |
| `campaign-event-resolve` (extended) | unchanged | hands collapsed by set in the members' share | the event's status guard |
| `chat-trim`, `journey-arrive` | unchanged | — | — |

The national count's link refresh also runs on the lazy path (`ensureNationDay`), once a term, before the boundary's transaction. **Nothing else is scheduled**: mutes and suspensions expire by reading the date, the rename window and the reopening window are dates, the damping ring rolls with each city's boundary, the salt epoch is the calendar, the away row and the Rested fill are the settlement's, the telemetry buffer is a timer in each process, and every TTL is MongoDB's.

---

## 10. The result modal and the breakdowns

Slice 9 adds **no game result** and no new `ResultModal` kind; renames, reports, feedback and settings answer with a toast or a sheet state (screens §3, §4, §8).

| Where | What the server returns |
|---|---|
| **Every opinion knock-on** (tier-1, missions, events) | the applied swing, as today; `factors` gains `{ id: 'damping', label, value }` with `dev: true` when the factor is under 1: the dev panel and QA read it, the player reads the applied figure (§22.1 Q8) |
| **Every count view** | `setAside` (the aggregate line *{n} votes set aside after the audit.* when n > 0, with the *audit* help note), `recounted` and each row's `afterRecount`; never a name, never a voter |
| **The national result** (`NationalResultView`, slice 7) | the stamp *To be confirmed* while the audit is provisional, *Final* after; the confirmed line on day 0 |
| **The ballot receipt** | unchanged (*Your vote: {name}*), whether or not the ballot was set aside |
| **The bail modal** (`bailPosted`) | the Party XP line only when it was paid; nothing says why when it was not (a linked pair or the fourth bail of the day reads the same as an unpaid favour: *Party XP: none today*) (§22.1 Q18) |
| **A linked visit** | the visit modal without the heal line and without Party XP; the patient's view counts it as no visit |
| **The audit page** (console) | the stored count, the set-asides and the sets with their evidence windows; never a ballot's choice |

---

## 11. The paper v9

- ***While you were away*** (§3.12): the row above the headlines when `desk.away.days ≥ 2`; *WELCOME BACK* and *Rested: full* from 30; the chevron opens `paper.away`. Slice 8's season line (*a new season began*) becomes one of the republic's facts.
- ***Letters***, after slice 8's rows: **editor notes** (`EditorNoteRow`, kicker *FROM THE EDITOR*): the rung's note (tap → the policy; `paper.noteSeen`), *A line you reported was dealt with.* (no tap; shown from its day for the rest of the City Day after first shown), the appeal's answer; and **the weekly feedback row** on the player's days 7, 14, 21 and 28 and the morning after a first seat, while that week's form is not sent.
- **The republic** (slice 7's national lines): `nl.count-provisional` on day 27 (as built), **`nl.count-confirmed`** on day 0 (*The count is confirmed.* / *…; {n} votes were set aside after the audit.*).
- **A recount**: a live political headline (ADR 0023) on the recount's day and the morning after: *{Name} Takes the Seat After a Recount* / *{Name}'s Seat Goes to {Other} on the Recount*, in the city's voice.
- **Names in print**: editions keep the name they were printed with; a forced rename and an erasure scrub it (§22.1 Q3).

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes and root gates

| Route / gate | Screen (screens §) | Data |
|---|---|---|
| root gate 1: maintenance | `MaintenanceScreen` (§12): on a 503 `MAINTENANCE`, or three failed `/healthz` checks a minute apart (*Back shortly.*) | `/healthz` |
| root gate 2: suspended / closed | `SuspendedScreen` / `ClosedScreen` (§6), on `ACCOUNT_SUSPENDED` / `ACCOUNT_CLOSED` from any call; nothing else reachable but *Sign out*, *The rules* and the reply | `account.status`, `appeal.send`, `account.reopen` |
| root gate 3: forced rename | `RenameSheet` (§4) before any route while `character.moderation.renameReason` | `account.rename` |
| `/policy`, `/terms`, `/privacy` | the policy (20 lines), the terms, the privacy note (public; linked from sign-up and Settings) | content |
| `/signup` | + the invite field (closed beta), the terms line, the refusals of §3.2 | the bridge |
| `/me` | the foot: **Settings** · **Tell us how it's going** · **The rules** (+ **Reply to the moderators**) | `character.me` |
| sheets on `/me` | `SettingsSheet`, `RenameSheet`, `CloseAccountSheet`, `FeedbackSheet`, the reply sheet | `settings.*`, `account.*`, `feedback.send`, `appeal.send` |
| `/faction?tab=chat` | the line's overflow (*Report this* · *Mute {name}*), long press, `ReportSheet`, `MutedComposer` | `report.line` |
| `ProfileSheet` | **Report this name** | `report.name` |
| `/paper` | `AwayRow`, `AwayDigest`, `EditorNoteRow`, the feedback row | `paper.today`, `paper.away`, `paper.noteSeen` |
| `/mod`, `/mod/report/$id`, `/mod/audit`, `/mod/accounts`, `/mod/account/$userId`, `/mod/log`, `/mod/metrics` | the console (§9); **its own lazy chunk**; `mod.me` refused → the not-found page | `mod.*`, `audit.*`, `admin.*` |
| not found | a plain page in the paper's look (*Nothing printed here.* and a link home) | — |

- **Settings applied at once:** the root gets `data-motion`, `data-text`, `data-night`, `data-clouds`, `data-chat`; the map reads night and clouds; the chat socket connects only when `chat: 'shown'`; `prefers-reduced-motion` is read when `motion: 'device'`.
- **Purpose lines:** `PurposeLine screen=…` renders while the id is not in `purposeSeen`; each screen's first act (a pin, a ticket, a chip, a row: the list in `features/purpose.ts`) calls `settings.purposeDone` once.
- **Telemetry client:** `features/telemetry` (a queue, `sid` in `sessionStorage` renewed after 30 minutes idle, the client descriptor, the batch on a 10-second timer and `sendBeacon` on `pagehide`); the tRPC link adds `x-irongate-sid` and `x-irongate-client` headers.
- **Double taps:** every keyed mutation disabled from the tap until its answer; the console's decision buttons too.

### 12.2 `packages/ui` additions (plain props, no tRPC)

New (screens §1): `SettingsSheet`, `SettingRow` (a radiogroup of chips), `ReportSheet`, `RenameSheet`, `MutedComposer`, `SuspendedScreen`, `ClosedScreen`, `EditorNoteRow`, `FeedbackSheet`, `StampScale` (a radiogroup 1–5), `PurposeLine`, `EmptyLine`, `AwayRow`, `AwayDigest`, `MaintenanceScreen`, `CloseAccountSheet`, `AuditLine`, `Toast` (if not already), and the console's `ModShell`, `QueueList`, `ReportCard`, `AuditPage`, `AccountPage`, `LogList`, `MetricsPage` (plain tables). Changed: every gauge (`EnergyBar`, XP, Party XP, Health, the share bar, Issue momentum, the party's target) to `role="progressbar"` with a name, `aria-valuenow` and `aria-valuetext` in words; `Stamp` (text, and a live region on the result's stamp); `ResultModal` (first focus *Continue*); `BottomSheet` (focus trap, Escape, fade under reduced motion); `HelpButton` (`helpKey: HelpKey`); every list's empty state through `EmptyLine list=…`; map pins (buttons with names; a paper plate behind the number on night maps); the faction mark beside every faction colour.

### 12.3 Accessibility work (design §7; ADR 0070)

- **Tokens:** paper-3 and the failure colour checked ≥ 4.5:1 on paper and paper-2, ink ≥ 7:1, the Alliance blue and the Collective red as text ≥ 4.5:1; a unit test computes every pair from `tokens.css`.
- **Text size large:** `[data-text=large]` scales the body and Courier tokens by 1.2; layouts tested at 200 % zoom on the matrix (no clipping, the receipt and tickets reflow).
- **Motion:** every animation ≤ 350 ms with motion on; `[data-motion=reduced]` and the media query share one set of rules.
- **Keyboard:** reading-order tab stops; a 2 px ink focus ring with a paper gap (`:focus-visible`); sticky bars never cover the focused element (`scroll-padding`); the map's **Places list** as its keyboard route.
- **Screen readers:** `lang="en-GB"`; alt texts as written; map art `aria-hidden`; the Today strip as a `<dl>`; count tables as `<table>` with headers; the result announced once.
- **Targets:** 44 × 44 CSS px minimum, checked by a Playwright helper on every interactive element of every route on the matrix.
- **Checks:** `@axe-core/playwright` on every route and sheet on the matrix (360 × 640, 375 × 667, 390 × 844, landscape, 1440 × 900), failing on serious or critical issues; the designer's manual VoiceOver and NVDA pass before the closed beta (lane D #15).

### 12.4 Performance work (design §8; ADR 0070)

- **Code splitting:** the city and nation maps (with `react-zoom-pan-pinch` and the tile layer), the chat socket client (`socket.io-client` imported dynamically when chat mounts), the console, the dev panel and viewer, the away digest, the feedback sheet.
- **Fonts:** import only the `latin` and `latin-ext` subsets (Fontsource per-subset CSS); Source Serif italic is fetched only when italic text renders; `font-display: swap`; preload the first route's two faces. Measured on 4 Oct 2026 (the slice-5 build): **one JS chunk of 229 KB gzipped** (the whole app; slices 6–8 will push it over the 250 KB *must* without splitting) and **207 KB of Latin fonts** (Playfair 38, Oswald 28, Source Serif 51 + 52 italic, Courier Prime 19 + 19): under the 220 KB *must*, over the 160 KB *target* until the italic is deferred.
- **`pnpm report:perf`:** builds, prints gzip per chunk (first route; whole app), then the `perf` Playwright project on `vite preview` with the memory server: CDP `Network.emulateNetworkConditions` (165 ms RTT, 8.1 Mbit/s) and `Emulation.setCPUThrottlingRate(4)` on the Pixel 7 profile, and desktop 1440 × 900; LCP of the first view (the paper for a returning player, the sign-up form for a new one) by `PerformanceObserver`; tap-to-modal by the Event Timing API (the INP proxy); `/art/` and tile bytes (the existing counters); decoded image bytes (the mounted images' natural sizes × 4); the API p95 from a load run (`--load 50`: fifty scripted players tapping for two minutes); the day job for 1,000 characters and five cities on the memory replica set. Output: a table of *must* and *target* per budget, exit 1 over a *must*.

### 12.5 Layout checks (screens §14)

On 375 × 667: Settings' title and four rows above the fold; the report sheet with the thing reported and the four reasons; the rename sheet's field and button with the keyboard up; the suspended screen's header, title, reason and three lines (buttons on scroll); the feedback sheet's first two blocks with **Send** sticky; the away row ≤ 120 px; the muted composer 56 px. Desktop: the console's list (360 px) and the item side by side from 1024. Phone: the console's item over the list with a back chevron. Matrix as §12.3.

### 12.6 Copy and vocabulary

Screens §15's strings go to `copy.ts` (§4.1); the policy to `policy.ts`. The QA vocabulary guards run on every new player string: **refused** in a player string: *moderation, moderator* (except the policy's and Settings' *the moderators*, design §1.1), *ban, banned, flag, flagged, alt, multi, multi-account, telemetry, analytics, cohort, accessibility, WCAG, cheat, cheater, troll, toxic, abuse* as a verb about a player, *audit* except as the dotted label with its help note. The console's strings (`copy.mod`) are checked separately: *linked* and *set aside* allowed, *cheater* refused.

---

## 13. Measurement: the metrics report (design §2.3, §2.4, §3.4)

`packages/db/src/metrics.ts` is a **pure builder** with fixture tests, the same shape as `report:playtest`:

```ts
export function buildMetrics(i: MetricsInput, o: { from: DayKey; to: DayKey; factionId?: FactionId; today: DayKey }): MetricsReport;
// MetricsInput: users (id, createdAt, role, tester, invite wave), characters (id, userId, factionId, joinDay, boosted,
// testMember, retired), playerDays, telemetry (by kind, in range), votes aggregated per election and per (voter faction,
// candidate faction) — never per voter —, audits, reports, moderationLog, model rows.
```

| Dashboard (design §2.3) | Read from |
|---|---|
| Retention | `playerDays`, `user.createdAt`: classic and rolling D1 / D7 / D30 per sign-up day and in all, the cohort size and ±1.96 √(p(1−p)/n) |
| Sessions | `playerDays.spans` (a session crossing midnight joined), `telemetry` `action.tap` / `mission.run` Energy, the model's 200 / 300 / 400 / 600 |
| The funnel | `telemetry` `screen.view` (signup), `signup.form`, `origin.step`, `faction.joined`, `paper.opened` (welcome), the first `action.tap`, the second, `order.done` ×3, the chapter opened, `energy.empty`, a second span on day 1, day 1 |
| Politics | `vote.cast`, `playerDays` (DAU), `election.counted`, `candidacy.seated`, the votes aggregate (cross-faction share) |
| Together | `event.*`, the hands, `playerDays` the day after a sign-up |
| Pacing | `levelup`, `rankup` with `dayInGame`, bucketed by sessions per day, against `content.model` |
| Factions | `characters.factionId`, `residence.moved`, DAU |
| Risk | `mission.run`, `encounter.choice`, `held.*`, the record levels by day 60 |
| Economy | `shop.*`, `home.*`, `pc.spent`, the Iron fields of the model; Iron held at days 7 / 14 / 30 from a daily `economy.snapshot` world event (the median of a sample of characters' Iron and PC, written by the city day) |
| Moderation | `chat.post` counts, `reports` (per 1,000 lines; the median of `firstActionAt − createdAt`), `moderationLog` by rung, filter refusals (`chat.refused`) |
| Abuse | `accountLinks` (sets), `audits` (set-asides per count), `signup.form` reason `cap` |
| Health | `error.client` against sessions (crash-free locally; Sentry's figure hosted), `api.timings`, `day.rollover` duration, `socket.reconnect` |
| Accessibility | `settings.changed` and the current `characters.settings` shares |

**Who is left out** of every figure: `user.tester`, `role ≠ 'player'`, `characters.playtest.boosted` (out of retention and pacing, **in** the political rows: design §13 Q14), `characters.playtest.testMember`. Every retention figure prints its band, and the report prints **red flags** (design §3.4) with *inside ±25 %* / *flag* / *move* against the model row.

`pnpm report:metrics [--from --to --faction --json]` prints the tables; `admin.metrics` and the dev panel render the JSON.

**`pnpm sim:scale`** (`scripts/sim/scale.ts`, tsx): (1) a city's meter with 5, 20, 100 and 500 contributors a day at §14.2's swings and the fixture's floor, with and without `swingFactor`, against the 1 % drift, printing the largest daily move; (2) the counts of §15.3 and §15.5 with 1, 5, 20 and 100 player ballots per district against the turnout weights, printing when ballots outweigh opinion and whether a bloc of twenty takes every seat. Both call the real `packages/rules` functions; the tables go to `docs/economy.md` §23 with the designer.

---

## 14. Security and privacy

### 14.1 Threats

| Threat | Guard |
|---|---|
| A player making themselves a moderator, unsuspending, or clearing a rename | Every slice-9 user field is `input: false`; `/update-user` is disabled; only `applySanction`, `admin.setRole` and the migration write them |
| Reaching the console | `modProcedure` / `adminProcedure` re-read the role from the session's user on every call; the client's 404 is cosmetic |
| A moderator's abuse | The two-person rule on one's own faction and on closure; the append-only log with every actor; admins export it; a moderator cannot act on their own account |
| Reading ballots through the audit | The console shows sets, counts and evidence windows, never a choice (ADR 0019); the report aggregates votes by faction pair only; telemetry has no choice |
| Probing the link rules | Never refused at the tap, never a message; the only public sign is an aggregate count per election |
| Reading network data | Hashes only (HMAC under a secret, rotated by epoch), 30-day TTL; the console says *same network* / *same device*; the email is masked for moderators (admins see it) |
| Evading caps | Clearing cookies and changing networks defeat the caps; accepted (design §4.1 calls them guards, not walls); links still catch a shared device or interleaving |
| The filter's lists leaking | Server-only package; refusals never echo; lists never in telemetry, content or the client bundle (a build test greps the client bundle for three list entries) |
| Filter bypass | Folding (leet, diacritics, repeats, spacing); flags for URLs, phones and emails; reports for the rest |
| Free text in telemetry | Every kind's props are a Zod object of enums, numbers, booleans and ids; unknown keys stripped |
| Report spam | Ten a day per account; *baseless* reporters sink in the queue |
| CSV injection in the export | `csvCell` neutralises a leading `= + - @` and quotes |
| XSS through notes, names, appeal text | Rendered as text everywhere; never `dangerouslySetInnerHTML` |
| Closing someone else's account | `account.close` acts on the session's user and needs `CLOSE` typed |
| Test hooks in production | `E2E_TEST_HOOKS` requires memory mode and is refused under `NODE_ENV=production`; the test IP header is ignored without it |
| Rate-limit evasion by many instances | Per-process limits; recorded in ADR 0069; one instance in the beta |
| Session fixation after closure or suspension | Closure deletes the sessions; a suspension leaves them (the screen needs them), and the gate refuses play |

### 14.2 Personal data and retention (the privacy note's facts)

| Data | Where | Kept | Erased at closure + 30 days |
|---|---|---|---|
| Email, password hash, sessions | Better Auth `user`, `account`, `session` | while the account lives | yes |
| The name | `user`, `characters`, the registry's snapshots, printed editions | while the account lives | replaced by *A former member* |
| The device id | `igc_d` cookie (1 year); `networkSightings` | 30 days | sightings deleted |
| IP-derived data | `networkSightings` (hashes only), `signupCaps` (hashes) | 30 days; caps 2 / 400 days | sightings deleted |
| Telemetry | `telemetry` (account id, no name, email, IP, text or choice) | 180 days | kept (no longer linked to a person) |
| Activity days | `playerDays` | for good | kept (anonymous once the account is erased) |
| Chat lines | `chatMessages` | 7 days | — |
| Reports | `reports` (lines and context) | 365 days after resolution | names replaced |
| Feedback lines | `feedback` | 90 days | deleted |
| Appeals | `appeals` | for good (the decision); text until erasure | text deleted |
| Moderation history | `moderationLog` | for good | the name snapshot replaced |
| Ballots | `votes` (ADR 0019) | for good | kept (the character is retired, not deleted) |

---

## 15. Testing

| Layer | What |
|---|---|
| Rules and moderation | §6.5 |
| Content | The copy's typed ids complete; purpose lines ≤ 90; help notes two lines; `protectedNames()`; the model rows' checks; word-for-word comparisons with both design documents (Settings' rows and notes, the report's reasons, the rename and closure texts, the suspended and closed screens' lines, the editor's notes, the feedback statements, the purpose lines, the empty lines, the away row's lines, the maintenance screen, the policy); the vocabulary guards |
| DB | Every new collection's indexes and TTLs; the `user` indexes; migration 011 twice; the schema-walk test of the name registry; `buildMetrics` on fixtures (retention classic and rolling with bands, a session across midnight, the funnel's steps, testers, boosted and moderators left out, the votes aggregate); `metrics.ts` never reads a voter's choice (a fixture without votes rows by voter) |
| Server — plumbing | the device cookie once; the activity touch once a minute (memo) with a span extended and a new span after 30 minutes; loopback ignored; the test IP header only with hooks; the epoch's next hash in the last 14 days; rate limits at 60 and 61, and a refused tap spends nothing; maintenance on every route but `/healthz`; `NODE_ENV=production` with hooks refused |
| Server — sign-up | each refusal (name filter, impersonation, normalised email, invite, device at the third, network at the fourth with the test IP); two parallel sign-ups of one normalised email → one account; the first admin by `ADMIN_EMAIL` |
| Server — telemetry | every kind of design §2.2 produced by its real path once (a table-driven test); a keyed replay inserts nothing; a world event twice (job and lazy path) inserts once; anonymous kinds only when signed out; a free-text prop refused by the schema |
| Server — links and counts | `refreshLinks` over fixture sightings; each count kind with a linked pair: the earliest ballot stands, `setAside` on the result, `audits` written; backings, petition signatures, hands, heroes, the Issue's top five, the scoreboard collapsed; bail Party XP (linked, the fourth of the day); a linked visit; the ballot receipt unchanged for a set-aside voter |
| Server — the audit | the national count provisional with set-asides; confirm; set aside a noted burst (the result re-run); unlink (re-run); auto-confirm at day 0 by the job and by the lazy path (once); a moderator's confirm racing take-office; recount preview and recount of a council counted today (a seat changes; the loser not completed; the Governor; the headline), refused for yesterday's |
| Server — moderation | reports (each reason, the daily cap, *already*, the filter's flag row in `chat.post`'s transaction); the queue's order and *baseless*; every decision on the ladder with its notes and the reporters' notes; the two-person rule (own faction, closure, an admin alone); idempotent decisions; mute refuses chat and the feedback line only; suspension refuses every play procedure, allows status and the reply, and leaves timers running (Energy, the wage and Rested on return); appeals once per decision and the answer as a note; lazy expiry |
| Server — names and closure | rename (30 days, the filter, every registry snapshot rewritten, a printed edition unchanged); forced rename (*A Newcomer* everywhere, the printed scrub, the own change's clock); closure (every office kind vacated by §22.1 Q2's defaults, candidacies, sign-ups, live lists exclude the retired); reopen at 29 days, refused at 30; erasure (every row of §14.2's table) |
| Server — away and damping | the row at 2 days, not at 1; *Welcome back* and Rested full at 30, once; the digest's facts for each scope; the ring rolled once per boundary by four runners; the factor applied to actions, missions and events and not to drift, Issues, morale or the exposé; `damped` on the ledger |
| Server — integration (T18) | **a beta fortnight on the test clock**: twelve players (two linked by device, two interleaving on one network, a household), a council count and a national count with the audit, a report → mute → suspension → appeal → lifted, a rename, a closure and reopen, an erasure at day 30, the metrics report over it, the worker off for three days in the middle. Run ten times in a row |
| UI | fixtures for every new component and state; the contrast test over the tokens; `HelpButton`, `PurposeLine` and `EmptyLine` typed |
| E2E | §15.1 |
| Accessibility and performance | the `a11y` and `perf` Playwright projects (§12.3, §12.4) |

### 15.1 E2E specs (each its own Playwright project after slice 8's)

**`settings.spec.ts`** (phone): Me → **Settings** → five rows; **Reduced** → the root's `data-motion`; **Large** → no clipping on the paper, a place sheet and the result; **Always daylight** at 21:00 (clock hook) → the day map; **Hidden** chat → no chip; a second context of the same account reads the same settings.

**`moderation.spec.ts`** (desktop for the moderator, phone for players): A and B chat; A writes a line on the refuse list → *That can't be said here.* and nothing posted; A writes a URL → posted; B reports A's line (*Real-world politics or hate*) → the toast; the moderator (hook) opens `/mod` → the queue lists **REAL-WORLD** and **FILTER** rows → the card with its context → **Mute 24 h** with the reason → A's composer *Muted until …*; A's next paper *FROM THE EDITOR*; B's *A line you reported was dealt with.*; **Suspend 3 d** on A → A's next tap → the suspended screen → **Reply to the moderators** → the admin answers *lifted* → A plays and reads the note. A moderator of A's own faction proposes → *Needs another moderator* → a second moderator confirms.

**`names.spec.ts`** (phone): sign-up with a refused name and with an NPC's name → *That name can't be used. Try another.*; Settings → **Change your name** → *You're {name} now.*; the HUD and the Members list in another context show it; yesterday's edition keeps the old one; the row is dimmed *from {date}*; the moderator's **Rename** → the next load shows *Your name needs changing* first; another context's Members list reads *A Newcomer*; the change → back to the paper.

**`audit.spec.ts`** (phone and desktop): two contexts sharing one `igc_d` value (L1) and a third vote nationally (term hooks); day 27 → the result *To be confirmed* with *1 vote set aside after the audit*; `/mod/audit` → the set (*same device*), **Confirm now**; a second term with nobody acting → day 0 → *The count is confirmed; 1 vote was set aside after the audit.*; a council counted today with a noted pair → **Set aside this set** → **Recount** → *after a recount* on the row and the headline. Each voter's receipt still reads *Your vote: {name}*.

**`account.spec.ts`** (phone): Settings → **Close your account** → **Close my account** disabled until *CLOSE* → signed out with *Your account is closed. Sign in before {date} to open it again.* → sign in → the closed screen → **Open it again** → the toast and the paper; a second account closed 31 days ago (hook) → the erasure → its name reads *A former member* in an old count.

**`away.spec.ts`** (phone): *Away 3 days* → the row with *3 days.*, the republic, city and branch lines and *Banked: … Iron in wages, Rested …* → the digest folded by day; *Away 31 days* → *WELCOME BACK*, *Rested: full*.

**`feedback.spec.ts`** (phone): day 7 (clock) → the Letters row → five stamps → **Send** enabled → *Thank you. It's read.*; a second send the same week replaces the first (DB check); a muted player sees no field.

**`signup-guard.spec.ts`** (phone): caps on (hook); a third account from one device → *This phone already has accounts. Sign in instead.*; a fourth from one network (the test IP) → *Too many new accounts from here today. Try tomorrow.*; `name+tag@gmail.com` after `n.a.m.e@gmail.com` → *There's already an account for this email. Sign in instead.*; invite mode → a used code refused.

**`maintenance.spec.ts`** (phone): the hook stops the presses → *The presses are stopped. Back at {time}.* → started again → **Try again** → the paper.

**`a11y.spec.ts`** (the matrix): axe on every route and sheet (serious and critical fail); 44 px targets; keyboard only: sign-up → the first modal through the Places list; Escape closes every sheet; the result's first focus.

**`perf.spec.ts`** (Pixel 7 at 4G, desktop): §12.4's measurements; asserts the *musts*.

**`direct-api.spec.ts`** (phone; a second web server with `VITE_API_ORIGIN=http://localhost:3101` and no proxy): sign up, a tap, chat over the socket, sign out: ADR 0072's option B works before lane D.

---

## 16. QA playtest checklist (is the game ready to measure?)

Run on `pnpm dev:mem` with the dev panel; a handful of testers over a few real days plus the test clock.

- [ ] **Every dashboard fills from real play** (design §2.4): `pnpm report:metrics` after a day's play prints every table with no empty section except retention's later columns; every red flag line prints a verdict.
- [ ] **Every event fires where the design says**: the dev panel's *last 50 events* after a scripted walk through the funnel, a mission, a vote, an event, a journey, a shop, the paper.
- [ ] **Model against measured**: the first three days' Pacing and Economy rows inside ±25 % of the model for the testers' bucket, or each difference explained.
- [ ] **Nothing new costs a tap**: a report is two taps, a rename three, Settings one a line, the feedback seven once a week; the purpose line leaves on its own; the away row is one row.
- [ ] **No player screen accuses**: a set-aside voter sees their receipt; a linked player sees nothing; the only public sign is the aggregate line; no *ban, flag, alt, cheat* anywhere a player looks.
- [ ] **Suspension costs no assets**: a player suspended 3 days returns to full Energy, the wage banked, Rested banked, the flat waiting, their name on a ballot still there.
- [ ] **Local play is not refused**: testers on one machine are never capped or linked by loopback.
- [ ] **The console works for two or three people**: the queue's oldest first; a decision in two taps; the log readable; the audit page on a test-clock national count.
- [ ] **Accessibility**: one session played by keyboard only; one on a phone with VoiceOver for the first modal; Settings' five lines each change what they say.
- [ ] **Performance**: `pnpm report:perf` with every *must* met locally.
- [ ] **Are day-7 and day-30 within reach?** Ask (the betas answer it; the local playtest asks what would bring testers back):
  - What would make you come back tomorrow?
  - When did you last not know what to do?
  - Did anything read as an accusation, or as a rule you were not told?

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| **Telemetry volume** (~150–250 events a player-day; a six-week closed beta of 300 is ~2–3 M documents, more than Atlas M0's 512 MB) | Measured in the local soak (events per player-day recorded in the Deviations); the hosting step sizes Atlas (M10) or samples `screen.view`; natural ids keep duplicates out |
| **False links** (households on one phone, a shared university network, local loopback) | The household rule, the shared-network ceiling (50 accounts an IP-day), L3 only noted, loopback excluded, unlinking with a note, the *audit fires* red flag (> 5 % set aside) |
| **The national count's link refresh on the lazy path** (one request pays for it once a term) | The job normally runs it at 00:02; the refresh is bounded by 30 days of sightings; timed in the integration run |
| **A rename misses a snapshot** (slices 6–8 not built yet) | The schema-walk test over every schema, run after each slice lands; the registry is one file |
| **Printed-text scrubbing** (word-bounded replacement in stored headlines) | Only for forced renames and erasure; batched after the commit; a name shorter than four characters is replaced only where the stored headline's params named it (slice 8's stored facts) |
| **The filter refuses the game's own words** | The fixture test over all of content; flags instead of refusals for every ambiguous pattern; the user reviews the lists |
| **Moderator workload** (two or three people) | Oldest first; the filter queues only flags; *baseless* reporters sink; the gate (24 h) on the Metrics page |
| **Per-process rate limits** | One API instance in the betas (ADR 0069); the documented path is a MongoDB counter if a second instance arrives |
| **Better Auth's internals** (additional fields, `disabledPaths`, the hook's shape) | The guard lives in our bridge, not in a hook signature; a contract test pins the fields round-tripping through `getSession` and the disabled paths answering 404 |
| **Performance on low-end phones** (eight slices of UI) | Route splitting first; the *must* column fails the local run; the map's decoded memory measured |
| **Accessibility regressions across slices 1–8** | axe on every route; the 44 px helper; the contrast unit test; a manual pass before the closed beta |
| **Erasure completeness** | §14.2's table is a test: every row checked after an erasure |
| **Self-confirmation with a dispute pending** | A moderator can confirm or act until day 0; after it, a seat follows only a council recount (councils), never a national one; disputes go to the Log |
| **Transcription** (~200 strings, the policy, purpose and empty lines) | Typed ids and word-for-word tests |

---

## 18. Idempotency and atomicity summary

- **Activity and sightings:** pipeline upserts by natural keys; a repeated touch extends the same span.
- **Telemetry:** natural `_id`s for keyed acts and world events (`insertMany` unordered ignores E11000); other events may be lost on a crash and are never duplicated by a retry (they are tracked after a fresh commit only).
- **Sign-up caps:** conditional upsert reservations; the normalised email's unique partial index.
- **Links:** a pure recompute upserted by pair; unlinking is a set-to-state write with a log row.
- **Counts:** set-asides inside the count's transaction (ADR 0017, 0043 guards); `audits._id` is the election id (E11000 is success for a second runner).
- **The audit:** confirm and auto-confirm both filter `status: 'provisional'`; set-aside and recount carry a key in `moderationLog`; the national re-run replaces the stored result while provisional.
- **Recounts:** one transaction over the election, the terms, the city projection and the two characters (version guard); a key; `recountedDay`.
- **Moderator acts:** `moderationLog { actorId, idempotencyKey }` unique is the request record; proposals unique while open.
- **Player acts:** `account.rename`, `.close`, `.reopen`, `report.*`, `feedback.send`, `appeal.send` through `withRequestKey` (ADR 0008); `report.*` also unique by `{ targetKey, reporterId }`; `feedback` by `{userId}:{week}`; `appeals` by `logId`; `editorNotes` by `{ characterId, ref }`.
- **Settings and purpose lines:** set-to-state, unversioned (ADR 0040).
- **The damping ring:** `rollActive` replaces a same-day entry; inside each place's boundary transaction.
- **The Rested fill and `desk.away`:** inside the settlement's `day.settled` guard.
- **Erasure:** `erasedAt: null` filter; the registry's writes converge.

---

## 19. Deliberately left out of slice 9

| Left out | Why / where |
|---|---|
| Provisioning, deploying, domains, Atlas, R2, the mail provider, Sentry projects | Lane D, at the end (design §10; the user's decision) |
| PostHog or any third-party analytics | Design §2.1, §16 point 1 |
| Charts on the dashboards | Screens §9.5: tables in the MVP |
| A high-contrast theme | Design §16 point 10 |
| CAPTCHA, VPN detection, IP reputation lists | Not in the design; the caps and links are the guards |
| Machine moderation, sentiment scoring | Not in the design |
| Email verification at sign-up | Not in the design; needs the mail provider (§22.2 Q8) |
| Self-service data export | Not in the design; handled by an admin on request (§22.2 Q7) |
| Changing email | `/change-email` disabled (the normalised email and the caps) |
| Private messages, push notifications | GDD §25 |
| The returning chapter | Design §6.6: post-MVP |
| The count-room scene | Design §15, §16 point 12 |
| The 48-run player simulation as code | Design §3.1: the designer's scratch space; only the population simulations run over the rules |
| Lighthouse CI | ADR 0070; Lighthouse is run by hand at lane D as a cross-check |
| Multi-instance rate limits | ADR 0069 |
| A transfer guard | Design §4.4: no Iron moves between accounts in the MVP |

---

## 20. Task list (in order; each task leaves `pnpm lint typecheck test` green and is one commit)

**Before T1:** slices 5–8 are built and their Deviations are read (the names this design leans on: `chatMessages`, `chatReports`, `chatLimits`, `chat.post`, `chat.report`, `chat.setHidden`, `ProfileSheet`, `eventSignups`, `resolveEvent`, `favours.postBail` / `visit`, `presence`, `factionElections`, `nationalElections`, `countNation`, `countChair`, `countPick`, `countBattleground`, `processNationBoundary`, take-office, `petitions`, `termBackings`, `nation.news`, `officeTerms.office`, `vacateSeat` and the slice-7 vacancies, `contributions`, `heroes`, `topByBracket`, the Letters builder, `legacyEntries`, `seasons`). The designer's answers to §22.1 are in, or the defaults are taken. The placeholder moderation lists exist.

**Lanes.**

- **Lane A — rules, packages and db:** T1, T2 and T4 in parallel; T3 after T2's types; T5 after T1–T4's types; T6 after T5; T7 after T2 (needs only rules).
- **Lane B — server, jobs and admin:** T8 first (after T5). T9, T10 and T13 after T8, in parallel. T11 after T8 and T2. T12 after T11. T14 after T13. T15 after T14 and T5's registry. T16 after T8. T17 grows with each task. T18 last.
- **Lane C — client, accessibility and performance, e2e and docs:** T19 after T4, on fixtures, alongside lane B. T20 after T8, T13 and T15; T21 after T14 and T12; T22 and T23 can start after T19 and run alongside; T24 after T20–T23; T25 alongside T22; T26 last.
- **Lane D — the hosting step:** only after T26 and the local playtest of §16; D1–D17 in order, each against design §10's line.

### Lane A — rules, packages and db

**T1. `packages/moderation`.** The workspace package (server-only; the client's and content's `package.json` must not depend on it), `fold`, `foldTight`, `checkText`, `checkName`, `normaliseEmail`, `moderationAt`, `suggestRung`, `csvCell`; the placeholder lists; ADR 0064's import rule as an ESLint `no-restricted-imports` in `apps/client` and `packages/content`. *Done when:*
- the refused / allowed fixture passes in every folded spelling;
- every string in the game's content and copy passes `checkText` (a test that loads content);
- impersonation refuses each protected name and *the editor*, and `normaliseEmail` passes its cases;
- `pnpm --filter @irongate/client build` contains none of three sentinel list entries.

**T2. Rules: links, sets and recounts.** `audit.ts` (§6.2), §6.1's `LINKS`, `SIGNUP`, `REPORTS`, `BAIL.xpPerDay`. *Done when:* §6.5's link, set, collapse, burst, ring and count tests pass, including the seventh seat moving with a set of three and `recountRows` reproducing each kind's stored count with no set-asides.

**T3. Rules: damping, away, the small functions, types.** `damping.ts`, `away.ts`, `renameGate`, `feedbackWeek`, `feedbackAskDue`, `eventsFromResult`; the new `GameErrorReason`s and view types of §7.2 and §8.4. *Done when:* §6.5's damping and away tests pass, `swingFactor` gives 1 / 0.5 / 0.25 at 20 / 40 / 100, and `pnpm typecheck` is green across the repo.

**T4. Content: copy, policy, the model rows, typed ids.** §4.1–§4.3: the copy keys with typed `PurposeScreen`, `EmptyList`, `HelpKey`, `ReasonId`; `policy.ts`; `legal.ts` placeholders; `model.ts` with the existing day 1–7 rows; `protectedNames()`. *Done when:* the word-for-word tests against both design documents pass, every loader check has a failing fixture, and both vocabulary guards pass (the console's separately).

**T5. DB: models, indexes, the registry, migration 011.** §5.1–§5.13's collections, the `user` fields and indexes (the `createAuth` declaration is T8's; the indexes are created here), the changed fields, `NAME_SNAPSHOTS` with its schema-walk test, migration 011. *Done when:*
- 011 run twice changes nothing the second time on a seeded slice-8 database;
- the schema-walk test passes and fails when a fixture schema adds an unregistered `name` beside a `characterId`;
- every TTL index exists with its period, and a transaction over `characters`, `elections`, `officeTerms`, `cities`, `audits`, `moderationLog` and `user` commits on the memory replica set.

**T6. DB: the metrics builder and `pnpm report:metrics`.** §13's `buildMetrics`, the loader, the script (`--from --to --faction --json`). *Done when:* the fixture tests pass for every dashboard (retention with bands, a midnight session, the funnel, exclusions, the votes aggregate), and a run on a fresh `pnpm dev:mem` database after a scripted session prints every table.

**T7. `pnpm sim:scale`.** §13's two population simulations over the real rules. *Done when:* it prints both tables in under a minute, the opinion table shows the largest daily move at 5 / 20 / 100 / 500 contributors with and without damping, and the designer has the output for economy §23.

### Lane B — server, jobs and admin

**T8. The request plumbing and the gate.** `env.ts` (`AUDIT_SECRET`, `ADMIN_EMAIL`, `SIGNUP_MODE`, `MAINTENANCE_UNTIL`, and `CORS_ORIGINS` and `COOKIE_DOMAIN`, read by T25; test hooks refused under `NODE_ENV=production`); `createAuth` (additional fields, `disabledPaths`, the create hook); the device cookie hook; `createContext` v9 (user fields, `moderationAt`, ip, device, sid, client); `activity.ts`; the rate limiter; the maintenance flag; `playProcedure` / `accountProcedure` / `modProcedure` / `adminProcedure` across every router; `account.status`; `promoteFirstAdmin`. *Done when:* §15's plumbing tests pass, a contract test pins the user fields through `getSession` and the disabled paths, and every slice 0–8 server test and e2e spec passes unchanged.

**T9. Telemetry.** `telemetry.ts` (the buffer, natural ids, `trackResult`, the world events, `api.timings`), `POST /api/telemetry`, the per-kind Zod schemas, and the instrumentation of every service in §8.3; `economy.snapshot` in the city day. *Done when:* the table-driven test produces every kind of design §2.2 from its real path exactly once, a keyed replay adds nothing, and a world event run by the job and the lazy path is stored once.

**T10. The sign-up guard and invites.** `signupGuard` in the bridge, the caps, the invite codes and `pnpm admin:invites --wave n --count k`, the sign-up sighting, `signup.form`. *Done when:* §15's sign-up tests pass, including two parallel sign-ups of one normalised email.

**T11. Links and counting once.** `links.ts`, the `links-refresh` job, `countSeams.ts` in every count of slices 3–7, petitions, `resolveEvent`, heroes, the Issue's top five, the scoreboard; `audits` written; `setAside` on every count view; bail's and visits' rules. *Done when:* §15's links-and-counts tests pass for every count kind and the receipts are unchanged on the wire.

**T12. The national audit and recounts.** `auditService`, `audit.*`, the day-27 refresh and provisional audit, take-office's confirmation, the national re-run, the council / district / Clearwater recount with terms, the Governor, the projections, the headline, `nl.count-confirmed`. *Done when:* §15's audit tests pass, including the auto-confirmation once across four runners and a moderator's confirm racing take-office.

**T13. Reports, the filter, editor notes, feedback, appeals.** `report.*` (replacing `chat.report`), the filter in `chat.post` (refuse and flag rows), the name filter's use in T10 and T15, `editorNotes` and the Letters rows, `feedback.send`, `appeal.send`, `paper.noteSeen`. *Done when:* §15's report, filter, feedback and appeal tests pass, and a flagged line and its queue row commit or fail together.

**T14. The console's server.** `moderationService` (`mod.*`), `applySanction` for every rung with lazy expiry, the two-person rule, `admin.*` (roles, appeals, metrics), the CSV export, the moderationLog's idempotency. *Done when:* §15's moderation tests pass, including a decision retried with its key, a proposal confirmed by a second moderator, and a suspended player's Energy, wage and Rested intact on return.

**T15. Names and closure.** `account.rename`, the forced rename, `renameEverywhere`, `scrubPrinted`, `account.close` / `reopen`, `retireCharacter` with every office kind, the retired filters on live lists, the `account-erase` job. *Done when:* §15's names-and-closure tests pass, including §14.2's erasure table row by row.

**T16. Damping, away, settings.** The ring in the three city boundaries; `swingFactor` in actions, missions and events; `damped`; the settlement's Rested fill and `desk.away`; `awayService`, `paper.today`'s row and `paper.away`; `settings.*` (with `chat.hidden` gone). *Done when:* §15's away-and-damping tests pass and a place's factor shows in the dev status.

**T17. Test hooks and the dev panel.** §8.6–§8.7. *Done when:* `devPanel.test.ts` covers each new button and status field, and every hook and the test IP header are absent without `E2E_TEST_HOOKS`.

**T18. The integration suite.** §15's beta fortnight. *Done when:* it passes ten times in a row, and the events per player-day, the link refresh's time and the day job's time for 1,000 characters are recorded in the Deviations.

### Lane C — client, accessibility and performance, e2e and docs

**T19. UI package.** §12.2's new and changed components with fixtures and smoke tests; the gauges as progress bars; the focus ring; the `data-*` styles; the contrast unit test. *Done when:* each fixture test passes, the contrast test passes for every pair of §12.3, and the existing UI tests pass.

**T20. Client: the player's screens.** The root gates (maintenance, suspended and closed, forced rename); Settings and the Me tab's foot; rename; close and reopen; reports from chat and profiles; the muted composer; feedback and the stamp scale; the reply; the policy, terms and privacy routes; the sign-up's invite field and terms line; the away row and digest; editor notes; purpose lines on the twenty screens with their first acts; empty lines on every list; the telemetry client; the not-found page. *Done when:* `settings.spec.ts`, `names.spec.ts`, `account.spec.ts`, `away.spec.ts`, `feedback.spec.ts`, `signup-guard.spec.ts` and `maintenance.spec.ts` pass.

**T21. Client: the console.** `/mod` as a lazy chunk: Queue, the card, Audit (with the recount picker), Accounts, Log (with the export), Metrics; the dev panel's Metrics page. *Done when:* `moderation.spec.ts` and `audit.spec.ts` pass, and the console's chunk is absent from the first route's bundle.

**T22. Accessibility pass.** §12.3 across every slice 1–9 screen; the Places list as the map's keyboard route; night pin plates; the colour-vision filter in the dev viewer; the `a11y` project with axe and the 44 px helper. *Done when:* `a11y.spec.ts` passes on the whole matrix with no serious or critical issue and no target under 44 px, and a keyboard-only run reaches the first modal.

**T23. Performance pass.** Route splitting, font subsets and the deferred italic, `pnpm report:perf` with the `perf` project, the load run and the day-job timing. *Done when:* every *must* of design §8 passes locally, the first route's JS is under 250 KB gzipped, and the targets' gaps are listed in the Deviations.

**T24. E2E and vocabulary.** The projects of §15.1 after slice 8's; the vocabulary test over slice-9 strings (player and console separately). *Done when:* the whole e2e suite is green locally, twice in a row.

**T25. Hosting preparation that runs locally.** ADR 0072's direct-origin mode behind configuration (`VITE_API_ORIGIN`; `CORS_ORIGINS` with a hand-written exact-origin CORS hook; Better Auth's cross-subdomain cookie setting behind `COOKIE_DOMAIN`; the socket client on the API origin); the `Mailer` interface with the console sink, wired to Better Auth's password reset (§22.1 Q6) and the closed account's appeal answer; the production headers (CSP, HSTS) as configuration that is off in development; `docker build` of `apps/server` and both entry points started against the memory database once. *Done when:* `direct-api.spec.ts` passes, the default local setup is unchanged (the proxy), and a reset link appears in the server log in `pnpm dev:mem`.

**T26. Docs.** The README (walk-throughs: a report to a mute and an appeal; an audit on the test clock; a rename and a forced one; closing and reopening; the away row; reading the metrics; the perf report), the **Deviations** section of this file, ADR statuses, the plan's §5 row for slice 9 (§23 #19), the GDD edits for answered §22.1 questions, and **`docs/ops/hosting.md`**: lane D's runbook (every variable, every command, every check). *Done when:* the README's steps reproduce each walk-through from a fresh `pnpm dev:mem`, and the runbook names every value lane D needs.

### Lane D — the hosting step (runs only at the end; each line is design §10's)

Preconditions: lanes A–C done; §16's checklist passed locally; the user has the accounts design §10 names (#2, #3, #7, #8, #9). Each task is a checklist in `docs/ops/hosting.md`, ticked with the date and who.

**D1. GitHub remote and CI** (§10 #1). Actions: `lint`, `typecheck`, `test`, `e2e`, `art:check`, `report:perf`, the axe project. *Done when:* CI is green on `main` twice in a row.

**D2. The domain** (#2). `play.`, `api.`, `tiles.` records. *Done when:* each name resolves with TLS.

**D3. MongoDB Atlas** (#3). The cluster (sized for telemetry, §17: M10 unless sampling is chosen), change streams verified on the tier, a database user, the allow list, backups, `MONGODB_URI` with `retryWrites=true&w=majority`. *Done when:* `ensureIndexes()` and migrations 001–011 run against it and a change-stream smoke test passes from the API's region.

**D4. The API and the worker** (#4). Two services from `apps/server/Dockerfile`; the environment from `env.ts` (`NODE_ENV=production`, `DB_MODE=uri`, `BETTER_AUTH_SECRET`, `AUDIT_SECRET`, `PUBLIC_ORIGIN`, `CORS_ORIGINS`, `COOKIE_DOMAIN`, `SENTRY_DSN`, `ADMIN_EMAIL`, `SIGNUP_MODE=invite`, `TRUST_PROXY` per the platform); the health check. *Done when:* `/healthz` is 200 from outside, the worker's log shows `city-day`, `nation-day`, `links-refresh` and `account-erase` scheduled, and two networks' sign-in attempts are limited separately (the `TRUST_PROXY` check of `env.ts`).

**D5. The client on Vercel** (#5). Root `apps/client`; `VITE_API_ORIGIN=https://api.<domain>`; the `/api` rewrite removed; the SPA fallback; `/art/` immutable caching; preview deploys pointed at a staging API or listed in `CORS_ORIGINS`; CSP with `connect-src` for the API and its WebSocket and `img-src` for `tiles.`. *Done when:* sign-up and the first modal work from a phone on the hosted client.

**D6. The socket** (#6). `transports: ['websocket']` on the API origin. *Done when:* a chat line passes between two phones on different networks within a second.

**D7. Tiles on R2** (#7). The bucket, `tiles.<domain>`, `pnpm art:publish`, `VITE_TILES_ORIGIN`, the stills as fallback, the repaint rule. *Done when:* a city's first view with tiles is within ADR 0024's budget on the hosted build.

**D8. Email** (#8). A transactional provider over HTTP (no SDK), the sender on the domain, the `Mailer`'s HTTP implementation. *Done when:* a password reset and a closure notice arrive at a real inbox.

**D9. Sentry** (#9). Two DSNs, release from the git SHA, alerts on the error rate and on the day job's lateness. *Done when:* a thrown test error from each side appears with its release.

**D10. Seed and bootstrap** (#10). `pnpm seed` once; the worker's bootstrap of cities, fixtures and term 0; the first admin; the reviewed moderation lists in the image. *Done when:* the admin opens `/mod` and the nation document shows the current term.

**D11. Test hooks off; the boost** (#11). The dev panel absent; `pnpm admin:boost` for the six seeded testers (two a faction) against Atlas. *Done when:* `POST /api/test/clock` answers 404 and the six read Rank 3 and *Known*, marked boosted.

**D12. Limits and headers live** (#12). The rate limits and caps on; CSP, HTTPS only, HSTS. *Done when:* a scripted 61st mutation in a minute reads *Slow down a moment.* and a security-headers scan passes.

**D13. The policy, terms and privacy** (#13). The user's texts in `legal.ts` and `policy.ts`, the age line, the cookie and network-data sentences, the erasure; the moderation lists reviewed by the user. *Done when:* `/policy`, `/terms` and `/privacy` are linked from sign-up and Settings, and the user has signed off the lists.

**D14. Maintenance and rollback** (#14). `MAINTENANCE_UNTIL` documented in the runbook; the previous image kept. *Done when:* a rehearsal deploy shows *The presses are stopped* and a rollback restores the previous image in under ten minutes.

**D15. The hosted smoke** (#15). Sign up on a phone, the first modal, a ballot, a journey, a chat line, a report reaching the console, the first day boundary, Sentry receiving, `report:perf` against the hosted build; the designer's VoiceOver and NVDA pass. *Done when:* every item is ticked and every performance *must* holds hosted.

**D16. The closed beta's codes and people** (#16). `pnpm admin:invites` for three waves; the moderators' accounts and roles; the feedback channel outside the game. *Done when:* wave 1's codes are sent and two moderators have signed in to `/mod`.

**D17. The first week's watch** (#17). The day job's duration, the API p95, socket reconnects, the audit page on term day 27, the queue daily. *Done when:* a week of the Health and Moderation dashboards is recorded, with every red flag either clear or acted on.

---

## 21. Answers to the design's questions (design §13)

1. **Telemetry storage.** As suggested, with four changes (ADR 0059):
   - `playerDays` is touched **once a minute**, not every ten: a five-minute session (the game's shape) would read as length zero at ten-minute resolution;
   - it holds **activity spans**, from which the report derives sessions, lengths and gaps;
   - **`cohorts` is not stored**: the report computes retention from `playerDays` and `user.createdAt`, so exclusions apply retroactively and no job can leave it stale;
   - `track()` buffers and inserts after the commit, with **natural `_id`s** for keyed acts and world events, so retries and second runners never double-count.
   Indexes are `{ kind, day }` and `{ userId, at }` (events before the character exists have no character).
2. **Network data.** `networkSightings` with a 30-day TTL, written by the request context as suggested. Two changes (ADR 0060):
   - the salt is **derived per 30-day calendar epoch** from a server secret, so no job rotates it; the "two salts during the switch" are the next epoch's hashes stored in an epoch's last 14 days, so L2's 14-day window never splits;
   - the device cookie is set by an **`onRequest` hook** on any API response, so no extra endpoint.
   Loopback is never a network, so local play is never linked.
3. **Links.** `accountLinks` as suggested, refreshed nightly (23:50 UTC), at worker start and **before the national count**; the sets are components at read; `collapseBySet` is in rules; **L3 alone is only noted** (ADR 0061).
4. **The audit.** `audits` as suggested but **one per count of any kind** (set-asides apply to every count; the national one is the only provisional). Take-office confirms first, inside its own transaction. The recount reuses the count functions over **stored inputs** (ADR 0047 stores them for the nation; council and district results gain `inputs` where missing) (ADR 0062).
5. **Roles and the console.** As suggested: `user.role` as a Better Auth additional field (`input: false`), the same SPA at `/mod` in its own chunk, every procedure checking the role on the server, and `moderationLog` append-only. The log is also the moderator's **idempotency record**, so a moderator needs no character (ADR 0063).
6. **Mutes, suspensions, closures.** The state is on the user, but as **flat fields** (`modState`, `modUntil`, `modReason`, `modLogId`): Better Auth's additional fields are primitives, and the session read returns them, so the gate costs no read. The history is the log. The rest is as suggested: states expire lazily, the gate refuses play procedures with typed errors, a mute is checked only by `chat.post` and the feedback line, closure is one retirement transaction, and the 30-day erasure is a daily job (ADR 0063, 0067).
7. **The filter.** As suggested: a new `packages/moderation`, pure and **server-only** (the client imports `packages/content` and `packages/rules`, so the lists cannot live there). `checkText` returns the flag's tags for the queue (ADR 0064).
8. **Renames.** `renamedDay` as suggested. One change: **live views read denormalised name snapshots today** (candidacies, contributions, counts, rosters, chat), so the rename rewrites them through a **registry** guarded by a schema-walk test, rather than every view re-reading the character. Printed editions keep the old name. A forced rename writes *A Newcomer* through the same registry, and the client's root gate shows the sheet (ADR 0066).
9. **Damping.** `swingFactor(active)` in rules and the factor on the ledger row, as suggested. The place stores a **ring of the last seven days' counts** (`active.days`) beside the mean, so a boundary re-run replaces its own day instead of averaging twice. The ring is written by each place's own boundary transaction (ADR 0068).
10. **The digest.** Built at read, nothing stored, as suggested. One change: **a character away has no editions for the missed days** (an edition is printed only at a settlement), so the digest reads the world's own records by day (counts, laws, ordinances, Issues, events, seats, `nation.news`) and renders them with the existing templates. The Rested fill needs no `awayFilledDay`: the settlement's day guard makes it happen once (ADR 0071).
11. **Settings.** As suggested: `characters.settings` (with `chat.hidden` moved in by migration 011), unversioned, applied as `data-*` attributes; the server reads none.
12. **Performance and accessibility in CI.** axe through Playwright, as suggested. **No Lighthouse CI**: the same measurements (LCP, an INP proxy, bytes, image memory) come from Playwright with CDP throttling, already in the stack, and a bundle script. The only new dependency is `@axe-core/playwright` (dev). Locally the commands are `pnpm report:perf` and the `a11y` project; CI runs them from lane D's first task (ADR 0070).
13. **Account closure.** As suggested: `account.close` with *CLOSE*, the day on the user (`closedDay`), and the erasure job after 30 days. The job replaces the name through the registry (snapshots and printed text), drops the email, credentials, sessions and sightings, and keeps the retired character for the world's integrity (ADR 0067).
14. **The seeded testers.** As suggested. The existing `admin:boost` script already marks `playtest.boosted`. The metrics builder leaves boosted testers out of retention and pacing and keeps them in the political rows. Local testers can also be marked `user.tester` from the dev panel.

---

## 22. Questions

### 22.1 For the game designer (each has a default so the build does not wait)

**Telemetry**

1. **`vote.cast`'s `ownFaction` and `npcChoice`** (design §2.2) record part of a ballot's choice per voter, which ADR 0019 keeps only in `votes`. **Default:** `vote.cast` carries `electionKind` and `cityId`; the **cross-faction share is an aggregate** the report computes from `votes` by faction pair, never per voter. → **Settled (designer, 4 Oct 2026):** accepted: `electionKind` and `cityId` only; the cross-faction share is the report's aggregate.

**Closure and renames**

2. **Vacating high offices at closure.** "Offices vacated as by a move" covers council seats; a move never vacated a Governor, Chair, deputy or President. **Default:** → **Settled (designer, 4 Oct 2026):** accepted with one change: a deputy's seat goes to the next unseated name on the party's list, else a local (slice 7 §23.1 #13); the Chair's closure is a change of Chair (the secretary's orders, rules and fixtures). Design §17.1 #2.
   - Governor: the bloc's top local (dissolution's rule);
   - Chair: no player Chair until the next Chair election (the secretary's lines apply);
   - deputy: the seat to the party's local deputies;
   - President: the runner-up, as a removal.
3. **Printed names after a forced rename or an erasure.** Design §5.4 keeps printed editions for one's own change. **Default:** a forced rename and an erasure **do** scrub stored editions and national lines, so an abusive name or an erased person does not survive in print. → **Settled (designer, 4 Oct 2026):** accepted: a forced rename and an erasure scrub printed editions; one's own change keeps them. GDD §7.3.
4. **The suspended screen's reasons** (screens §6.1) list four, without spam and selling, which the editor's notes (§7) include. **Default:** a fifth line, *Something you wrote was selling or spam.* Please confirm the wording. → **Settled (designer, 4 Oct 2026):** accepted; the line is *Something you wrote was spam or selling.*; all eight reason lines in design §17.2.
5. **The invite field** (closed beta). **Default:** an *Invitation code* field on the sign-up form while invite mode is on, refused with *That code isn't right, or it's been used.* Please write the strings. → **Settled (designer, 4 Oct 2026):** strings in design §17.3.
6. **Password reset.** A public beta needs it; no screen is designed. **Default:** *Forgot your password?* on the login form → an email field → *If there's an account for that email, a link is on its way.* → the link's page with a new password field, built in T25 with a console mail sink. Please write the strings. → **Settled (designer, 4 Oct 2026):** strings in design §17.4.
7. **Accepting the terms at sign-up.** **Default:** a line under the button: *By signing up you accept the rules and say you are 16 or older.*, with links; no checkbox; the version is stored. → **Settled (designer, 4 Oct 2026):** accepted; the line reads *By signing up you accept the rules and say you're 16 or older.* with *the rules* and *Privacy* as links (design §17.3).

**The rules a player never reads**

8. **Is damping named to the player?** **Default:** no. The applied figure is shown as today, and the factor is a dev-only row. → **Settled (designer, 4 Oct 2026):** accepted: never named; a dev-only row.
9. **Unlinking.** **Default:** sticky for the kinds a moderator unlinked; new evidence of another kind (a shared device after an unlinked network pair) re-activates the link. → **Settled (designer, 4 Oct 2026):** accepted: sticky per kind.
10. **"Counted in the last 24 hours"** for a council recount. **Default:** counted at today's boundary. → **Settled (designer, 4 Oct 2026):** accepted: counted at today's boundary (design §4.5, GDD §15.2).
11. **A report's context** is "twenty lines around" (design §5.2, slice 6) and "twenty above and below" (screens §9.1). **Default:** up to twenty before it, plus the lines after it that exist at the time of the report, at most forty. → **Settled (designer, 4 Oct 2026):** accepted: up to twenty before plus the lines after that exist, at most forty (design §5.2, screens §9.1).
12. **A recount that changes the Governor.** **Default:** the Governor is recomputed and changes at once, like the seat. → **Settled (designer, 4 Oct 2026):** accepted.
13. **Reports by a muted or suspended player.** **Default:** a muted player may report; a suspended player cannot (no play procedure). A suspended player's lines can still be reported. → **Settled (designer, 4 Oct 2026):** accepted.
14. **Moderators' characters "left out of every figure".** **Default:** telemetry figures only; their ballots, backings and contributions count as anyone's. → **Settled (designer, 4 Oct 2026):** accepted: telemetry figures only (design §5.7).
15. **Bursts and network evidence** outlast the 30-day retention. **Default:** bursts and L3 only consider accounts whose sign-up row is still kept (created in the last 30 days). → **Settled (designer, 4 Oct 2026):** accepted.
16. **Shared networks.** **Default:** an IP-day with more than 50 accounts (a university, a café chain) gives no L2 evidence. → **Settled (designer, 4 Oct 2026):** accepted: over fifty accounts on an IP-day is a shared network (design §4.3, GDD §15.2).
17. **The away row's lines.** **Default** priority per scope: → **Settled (designer, 4 Oct 2026):** confirmed as listed (design §6.6).
    - republic: a President seated, a law in force, a national count, a season;
    - city: the council count with a seat for the branch, a rule in force, the morale word's change, an Issue resolved;
    - branch: seats won by members, then events by outcome.
    Each uses its existing template. Please confirm.
18. **Bail's Party XP when unpaid.** **Default:** the modal's Party XP line reads *none today* and gives no reason, whether the pair is linked or it is the fourth bail of the day. → **Settled (designer, 4 Oct 2026):** accepted, plus one public line on the *Post bail* sheet: *Posting bail pays +10 Party XP, up to three times a day.* (design §17.1 #18).
19. **Event hands in a linked set.** **Default:** the earliest sign-up counts in the members' share. All are paid. → **Settled (designer, 4 Oct 2026):** accepted.
20. **The feedback "week".** **Default:** the player's own week, `floor((today − join day) ÷ 7)`. → **Settled (designer, 4 Oct 2026):** accepted.
21. **A purpose line's "first act".** **Default:** the list in `features/purpose.ts`: → **Settled (designer, 4 Oct 2026):** confirmed as listed (design §6.2).
    - the map: a pin;
    - a place: a ticket;
    - the paper: any tap;
    - the Me tab: any row;
    - the Faction tab: the tab's first control;
    - the council and Parliament: a vote or a name;
    - Settings: a chip;
    - the other screens: their main button.

**Data**

22. **The model rows.** **Default:** content (`data/model.ts`) that the designer transcribes from economy §23. Until the pass runs, it holds the existing day 1–7 rows. → **Settled (designer, 4 Oct 2026):** accepted as content; the rows are written now in `docs/economy.md` §23.7, not deferred.
23. **`playerDays` fields.** Design §2.1 lists `requests, energySpent, taps, wins`. **Default:** spans and active minutes only; Energy, taps and wins are summed from telemetry. → **Settled (designer, 4 Oct 2026):** accepted.
24. **Retention of reports.** **Default:** 365 days after resolution; unresolved reports are kept. → **Settled (designer, 4 Oct 2026):** accepted.

### 22.2 For the user

None blocks lanes A–C. Defaults taken:

1. **Design §16's twelve points**: built on the design's defaults (this document's header).
2. **No opt-out from usage figures.** They are first-party, with no free text, under the privacy note. An opt-out switch on Settings would be a sixth line. **Default:** none; your privacy text says so.
3. **One new dev dependency, `@axe-core/playwright`** (MPL-2.0), for the accessibility checks (ADR 0070). No runtime dependency is added. Lighthouse is not added.
4. **Retention periods:**
   - telemetry 180 days;
   - network data 30;
   - feedback lines 90;
   - editor notes 90;
   - reports 365 after resolution;
   - the moderation log for good, with names erased.
   **Default:** as listed; your privacy note states them.
5. **The Atlas tier.** At ~2–3 M events in a six-week closed beta of 300, telemetry outgrows M0's 512 MB. **Default:** M10 at lane D, or sampling `screen.view` if you prefer the free tier.
6. **The mail provider** (lane D #8). **Default:** any provider with an HTTP API (Postmark, Resend or SES), called without an SDK.
7. **Requests for a person's data.** **Default:** handled by an admin by hand on request; there is no self-service export in the MVP.
8. **Email verification at sign-up.** **Default:** off for the closed beta (invite codes gate it). Turn it on for the open beta once the mail provider exists.
9. **Operator access to ballots** (ADR 0019): the audit reads `votes` by voter. Who has database access in production is an operational control for you to decide.
10. **The device cap's weakness.** Clearing cookies resets the device count, which is accepted by design §4.1.

---

## 23. Notes on the design documents (for the designer)

**Settled (designer, 4 Oct 2026):** every note is answered in `docs/design/slice-9-launch.md` §17.6; the design, the screens, the GDD (§0, §7.3, §14.2, §15.2, §16.2), `docs/economy.md` §23.7 and the plan's §5 row were corrected in the same change. Appendix C's duplicate #61 (the slice-6 visits rule) is now #89.

1. **`cohorts`** (design §2.1) is computed by the report, not stored (§21 #1).
2. **`playerDays`' fields** (§2.1): spans and minutes only (§22.1 Q23).
3. **`vote.cast`'s `ownFaction` and `npcChoice`** (§2.2) conflict with ADR 0019 (§22.1 Q1).
4. **`paper.opened`'s `edition: 'away'`** (§2.2): *While you were away* is a row in the daily edition, not an edition. Built as `edition: 'daily'` with `daysAway`.
5. **Design §13 Q2's `/api/hello`** becomes an `onRequest` hook (§21 #2).
6. **Design §13 Q10's "paperEntries by day"** do not exist for days the player missed (§21 #10).
7. **Design §13 Q12's Lighthouse CI** becomes Playwright with CDP throttling (ADR 0070).
8. **Design §13 Q1's ten-minute memo** becomes one minute (§21 #1).
9. **Slice 8's T16** lists *While You Were Away* in the paper v8. Slice 9 builds it, and slice 8's season line becomes one of its republic facts.
10. **Damping's "active"** (§3.3) counts characters with **solo, mission or event** ledger rows: drift and system rows have no character.
11. **GDD §15.2's first sentence** still reads "Accounts on the same network can't vote in the same election or endorse each other". The pinned paragraph replaces it with links and the household rule, so the first sentence wants the same.
12. **Design §4.1's "600 a minute per IP"** is per API process (ADR 0069).
13. **Screens §9's "the ordinary 404 page"**: the client has none yet. T20 adds it (*Nothing printed here.*). Please write the line.
14. **Design §5.2 against screens §9.1** on the report's context (§22.1 Q11).
15. **Screens §6.1 against §7** on the reasons (§22.1 Q4).
16. **Design §4.4's backings "count once"**: a backer's Political Capital stays spent (as designed). The count reads one backer per set per name.
17. **Design §2.3's Health row "API p95 by procedure"** is measured by 5-minute in-process histograms (`api.timings`), not a row per request.
18. **Design §9.1's "`NODE_ENV=production` refuses them"**: `env.ts` refuses test hooks outside memory mode today. T8 adds the production refusal.
19. **The plan's data-model row for slice 9** becomes:
    - collections: `telemetry`, `playerDays`, `networkSightings`, `signupCaps`, `inviteCodes`, `accountLinks`, `audits`, `reports` (replacing `chatReports`), `editorNotes`, `appeals`, `feedback`, `moderationLog`, `modProposals`;
    - on Better Auth's `user`: the role, the moderation state, the normalised email, the closure, the tester flag;
    - changed: `cities` and `districts` (`active`), `influenceLedger` (`damped`), the election collections (`setAside`, recounts), `officeTerms` (`recounted`, `vacatedBy`), `chatLimits` (reports), `paperEntries` (`desk.away`);
    - embedded on `characters`: `settings`, `seen.purpose`, `renamedDay`, `retired`, `today.bailsXp`.
20. **Design §8's "Lighthouse CI with budgets"** and **§10 #1's CI list**: `report:perf` and the axe project replace it.
21. **Design §10 #5's "`vercel.json` with the `/api` rewrite removed under option B"**: the direct mode is built and tested locally in T25, so lane D only switches configuration.

---

## Review 4 knock-ons (dated note, 7 Oct 2026)

Copied from `docs/tech/review-4.md` §20 when review 4 was built (ADRs 0073–0078). Read them before this slice is built; where they disagree with the sections above, they win.

- `PURPOSE_SCREENS`: `cityQuarter` and `cityOverview` apply to the capital only. A home city is `city`.
- The funnel counts three `origin.step`s and eight taps to the first result.
- The performance and axe checks add `/journey` (the map) and the hall's sheet.
- *While you were away* uses `copy.when`.

## Deviations (as built)

*Filled in by T26.*
