import type { TownHallView, WhatNowView } from '../types';
import { countViewFixture, hallFixture, nightFixture, ruleBallotFixture } from './fixtures';

/**
 * Review 4 (answers §10–§11, ADR 0077); the voting rework (design §4.4, §4.6): the Town Hall's sheet
 * for a visitor and for a councillor (their rule and the picker on days 0–1), and the *What now* card.
 */
const DAY_MS = 86_400_000;
const termEndsAt = ruleBallotFixture.countAt;
const setAt = ruleBallotFixture.setAt;

export const whatNowFixture: WhatNowView = {
  termId: '64b7f0c2a1b2c3d4e5f60718',
  cityId: 'coalport',
  hall: { locationId: 'coalport.town-hall', name: 'Town Hall' },
  rule: { name: 'Street Fund', onBallot: true },
  capital: null,
  changeUntil: setAt,
  pollsOpenAt: setAt,
  countAt: termEndsAt,
};

export const townHallFixture: TownHallView = {
  cityId: 'coalport',
  cityName: 'Coalport',
  hall: hallFixture,
  night: nightFixture,
  seatCount: 7,
  termEndsAt,
  inForce: {
    ordinanceId: 'ord.reading-room',
    name: 'Reading Room Grant',
    plainLine: 'studying costs a fifth less',
    daysLeft: 3,
    how: 'votes',
    countDay: countViewFixture.countDay,
    votes: 4,
    voters: 6,
    seats: null,
    factionIds: ['collective'],
    by: 'Petra Holm',
  },
  next: { ...ruleBallotFixture, status: 'provisional', canVote: false, reason: 'NOT_POLLING' },
  seats: countViewFixture.council
    .filter((r) => r.seated)
    .map((r) => ({
      seat: r.place,
      kind: r.kind,
      name: r.name,
      avatar: r.avatar,
      rankTitle: r.rankTitle,
      you: false,
      rule: r.rule?.name ?? null,
    })),
  stand: null,
  issues: [],
  issuesSettleAt: termEndsAt + 2 * DAY_MS,
  councillor: null,
  whatNow: null,
  serverNow: setAt - DAY_MS,
};

export const townHallDeskFixture: TownHallView = {
  ...townHallFixture,
  seats: townHallFixture.seats.map((s) => (s.seat === 1 ? { ...s, you: true } : s)),
  councillor: {
    rule: { ordinanceId: 'ord.street-fund', name: 'Street Fund' },
    onBallot: true,
    changeUntil: setAt,
    menu: [
      {
        ordinanceId: 'ord.rest-day',
        name: 'Rest Day Order',
        line: 'A day of rest by council rule: the town sleeps in.',
        plainLine: 'Rested banks higher.',
        effectLine: 'Rested cap +50',
        onBallot: false,
      },
    ],
  },
  whatNow: whatNowFixture,
};
