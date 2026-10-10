# Event Catalogue (Irongate City)

The closed list of telemetry kinds. **The source of truth is `docs/design/slice-9-launch.md` §2**; keep this file in step with it. Every kind has a Zod schema for its `props` in the server, and an event of an unknown kind is dropped.

## Naming

- `noun.verb`, lower case with a dot: `action.tap`, `mission.run`, `vote.cast`, `journey.boarded`.
- Related kinds share the noun: `held.enter` / `held.leave`; `candidacy.filed` / `struck` / `seated`.
- World events from the day job use the same form: `day.rollover`, `election.counted`, `issue.resolved`.

## The envelope (filled by the server on every event)

| Field | Type | Notes |
|---|---|---|
| `_id` | string | `{kind}:{idempotencyKey}` for keyed acts, `{kind}:{ref}` for world events, else `{kind}:{uuid}` |
| `kind` | string | from this catalogue |
| `at` | Date | server time |
| `day` | string | the City Day key |
| `userId`, `characterId` | string \| null | null only for the anonymous kinds |
| `sid` | string \| null | the client's session id |
| `client` | `{ platform, build }` | compact; never the user agent string |
| `props` | object | enums, numbers, booleans and ids only |

## Never in telemetry

Chat text, names, emails, IPs, or **which faction a ballot chose** (ADR 0019). `vote.cast` carries the election kind and city only.

## Kinds (from slice-9 §2; abridged; extend there first)

| Kind | Fires | Props | Feeds |
|---|---|---|---|
| `signup.form` | sign-up submitted (anonymous ok) | `ok`, `reason` | the funnel |
| `origin.step` | each opening answer | `step`, `answer` | the funnel; builds |
| `faction.joined` | faction confirmed | `factionId` | faction balance |
| `paper.opened` | an edition opened | `edition`, `daysAway`, `rows` | sessions |
| `screen.view` | a route or sheet opens | `screen`, `from` | dwell (first to sample) |
| `action.tap` | a tier-1 or training tap | `actionType`, `count`, `energy`, `outcome`, `oddsBand`, `rested` | Energy per day, ×3 share |
| `mission.run` | a mission result | `missionId`, `type`, `way`, `outcome`, `remembered`, `runIn`, `caught` | risk |
| `encounter.choice` | a run-in answered | `choice`, `auto`, `won`, `opponentKind` | risk |
| `held.enter` / `held.leave` | the cells or the ward | `kind`, `minutes`, `how` | risk; favours |
| `order.done` / `orders.complete` | an order, all three | `slot`, `family` | Directives |
| `stat.placed` | a level point placed | `stat`, `waited` | builds |
| `standing.level` | a Reputation rung | `cityId`, `level` | pacing |
| `job.taken`, `job.switched` | | `jobId` | income |
| `vote.cast` | any ballot | `electionKind`, `cityId` | turnout (never the choice) |
| `candidacy.filed` / `struck` / `seated` | | `office`, `cityId`, `dayInGame` | first seat |
| `journey.boarded` / `arrived` | | `from`, `to`, `minutes`, `dwellSeconds`, `card` | travel |
| `residence.moved` | | `from`, `to`, `dayInGame` | battlegrounds |
| `help.opened` | a dotted label tapped | `label` | which notes are read |
| `energy.empty` | the Out of Energy card | `restedLeft` | session end |
| `error.client` (anonymous ok) | an uncaught client error | `route` | crash-free sessions |
| `day.rollover` (world) | the day job | `durationMs`, `settled` | ops |
| `election.counted` (world) | a count | `turnout`, `npcSeats`, `playerSeats`, `setAside` | politics |

Later slices add their kinds the same way: events, chat (counts only), favours, dossier, patrons, shops, homes, Political Capital spent, feedback.

## Adding a kind

1. Add it to `docs/design/slice-9-launch.md` §2 (the designer owns the list).
2. Add its Zod props schema on the server.
3. Fire it **after the commit**. Pass `key` for a keyed act or `ref` for a world event.
4. Check it in `pnpm report:metrics` on a local playtest.

### Checklist

- [ ] `noun.verb`, and in the catalogue
- [ ] props are enums, numbers, booleans or ids only; no PII; no ballot choice
- [ ] keyed acts pass the idempotency key; world events pass a stable ref
- [ ] fired after the transaction, never inside it
- [ ] shows up in the local report
