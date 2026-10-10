# Retention and Engagement Queries (MongoDB aggregation)

The pipelines behind `pnpm report:metrics`. Wrap each in a **pure builder function** in `packages/db/src/metrics.ts` that takes the aggregation output and returns the figures. Nothing is stored: there's no cohorts collection (ADR 0059 §7).

Collections:
- `users` (`_id`, `createdAt`, the flags to exclude: `tester`, `role`, `boosted`, `testMember`);
- `playerDays` (`_id = "{userId}:{day}"`, `userId`, `day`, `spans[[startMin, endMin]]`);
- `telemetry`.

`day` is the City Day key (`YYYY-MM-DD`), and a user's cohort day is the City Day of `users.createdAt`.

## Exclusions (applied to every figure)

```js
const included = { tester: { $ne: true }, boosted: { $ne: true }, testMember: { $ne: true }, role: { $nin: ['moderator', 'admin'] } };
```

## D1 / D7 / D30 retention (classic and rolling)

- **Classic:** the share of the cohort active on exactly cohort day + N.
- **Rolling:** the share active on cohort day + N or later.

Print the cohort's size, and flag cohorts under 20 people as noisy.

```js
db.users.aggregate([
  { $match: { ...included, createdAt: { $gte: from, $lt: to } } },
  { $project: { cohortDay: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: CITY_DAY_TZ } } } },
  { $lookup: { from: 'playerDays', localField: '_id', foreignField: 'userId', as: 'days', pipeline: [{ $project: { _id: 0, day: 1 } }] } },
  { $project: {
      cohortDay: 1,
      offsets: { $map: { input: '$days', as: 'd', in: {
        $dateDiff: { startDate: { $dateFromString: { dateString: '$cohortDay' } }, endDate: { $dateFromString: { dateString: '$$d.day' } }, unit: 'day' } } } },
  } },
  { $group: {
      _id: '$cohortDay',
      size: { $sum: 1 },
      d1: { $sum: { $cond: [{ $in: [1, '$offsets'] }, 1, 0] } },
      d7: { $sum: { $cond: [{ $in: [7, '$offsets'] }, 1, 0] } },
      d30: { $sum: { $cond: [{ $in: [30, '$offsets'] }, 1, 0] } },
      d7plus: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$offsets', cond: { $gte: ['$$this', 7] } } } }, 0] }, 1, 0] } },
      d30plus: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$offsets', cond: { $gte: ['$$this', 30] } } } }, 0] }, 1, 0] } },
  } },
  { $sort: { _id: 1 } },
]);
// The builder turns counts into rates and leaves out offsets that haven't happened yet
// (a cohort only 5 days old has no D7).
```

## Sessions per player-day and session length

A session is one span: a run of requests with no gap of 30 minutes or more.

```js
db.playerDays.aggregate([
  { $match: { day: { $gte: fromDay, $lte: toDay } } },
  { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u', pipeline: [{ $match: included }, { $project: { _id: 1 } }] } },
  { $match: { 'u.0': { $exists: true } } },
  { $project: { day: 1, sessions: { $size: '$spans' },
      minutes: { $map: { input: '$spans', as: 's', in: { $add: [{ $subtract: [{ $arrayElemAt: ['$$s', 1] }, { $arrayElemAt: ['$$s', 0] }] }, 1] } } } } },
  { $group: { _id: '$day', playerDays: { $sum: 1 }, sessions: { $sum: '$sessions' }, minutes: { $push: '$minutes' } } },
]);
// The builder flattens minutes to give the median and p75 session length, plus sessions per player-day.
```

## DAU / MAU

```js
// DAU for a City Day = distinct included users with a playerDays doc that day
db.playerDays.aggregate([
  { $match: { day: { $gte: fromDay, $lte: toDay } } },
  { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u', pipeline: [{ $match: included }, { $project: { _id: 1 } }] } },
  { $match: { 'u.0': { $exists: true } } },
  { $group: { _id: '$day', dau: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]);
// MAU = distinct userId over the 30 City Days ending that day. The builder computes it from the
// same per-day user lists to avoid a second scan; stickiness = DAU / MAU.
```

## Top kinds by volume (ops and sampling)

```js
db.telemetry.aggregate([
  { $match: { day: { $gte: fromDay, $lte: toDay } } },
  { $group: { _id: '$kind', count: { $sum: 1 }, users: { $addToSet: '$userId' } } },
  { $project: { count: 1, users: { $size: '$users' } } },
  { $sort: { count: -1 } },
  { $limit: 30 },
]);
```

## Funnels (defined as data)

Each funnel is a list of steps, each a `kind` plus an optional `props` filter. A step counts a person only if it happened after their previous step. The first-session funnel, for example: `signup.form{ok:true}` → `origin.step{step:3}` → `faction.joined` → `action.tap` → `order.done`.

```js
const steps = [
  { kind: 'signup.form', match: { 'props.ok': true } },
  { kind: 'origin.step', match: { 'props.step': 3 } },
  { kind: 'faction.joined' },
  { kind: 'action.tap' },
  { kind: 'order.done' },
];

db.telemetry.aggregate([
  { $match: { $or: steps.map((s) => ({ kind: s.kind, ...(s.match ?? {}) })), at: { $gte: from, $lt: to } } },
  // anonymous steps are tied to the account through sid
  { $group: { _id: { $ifNull: ['$userId', '$sid'] }, events: { $push: { kind: '$kind', at: '$at', props: '$props' } } } },
]);
// The builder walks each person's events in time order against `steps` and counts
// how far each got. Report absolute counts and the drop-off per step.
```

## Notes

- Use the **City Day** key (`day`) for day maths, never the UTC date. The game's day turns at the City Day boundary. The six-hour game day (review 5) is only for night and the scenery, not for these metrics.
- **Indexes** these pipelines rely on:
  - `playerDays {day: 1}` and `{userId: 1, day: 1}`;
  - `telemetry {kind: 1, day: 1}` and `{userId: 1, day: 1}`;
  - `users {createdAt: 1}`.
- **Run on a secondary** (`readPreference: 'secondaryPreferred'`) in production, so the report never competes with the game.
- **The gates** (GDD §27, slice-9 §9): closed beta to open beta needs D1 ≥ 40 and D7 ≥ 30; open beta to launch needs D7 ≥ 35 and D30 ≥ 20. Print each gate next to its figure.
