import type { TownHallView, WhatNowView } from '../types';
import { councilViewFixture, hallFixture } from './fixtures';

/**
 * Review 4 (answers §10–§11, ADR 0077): the Town Hall's sheet for a visitor (no desk) and for a
 * councillor (the desk while voting), and the *What now* card.
 */
const DAY_MS = 86_400_000;
const termEndsAt = councilViewFixture.termEndsAt;
const divideAt = councilViewFixture.window.divideAt;

export const whatNowFixture: WhatNowView = {
  termId: '64b7f0c2a1b2c3d4e5f60718',
  cityId: 'coalport',
  hall: { locationId: 'coalport.town-hall', name: 'Town Hall' },
  seatCount: 7,
  passVotes: 4,
  divideAt,
};

export const townHallFixture: TownHallView = {
  cityId: 'coalport',
  cityName: 'Coalport',
  hall: hallFixture,
  seatCount: 7,
  passVotes: 4,
  termEndsAt,
  inForce: {
    ordinanceId: 'ord.reading-room',
    name: 'Reading Room Grant',
    plainLine: 'studying costs a fifth less',
    daysLeft: 3,
  },
  noRule: null,
  seats: councilViewFixture.seats.map((s) => ({
    seat: s.seat,
    kind: s.kind,
    name: s.name,
    avatar: s.avatar,
    rankTitle: s.rankTitle,
    you: false,
    votedFor: s.votedFor,
  })),
  paper: {
    status: 'open',
    items: councilViewFixture.paper.items.map((i) => ({
      n: i.n,
      ordinanceId: i.ordinanceId,
      name: i.name,
      plainLine: 'talking to voters comes off more often',
      effectLine: i.effectLine,
      movedBy: { ...i.movedBy, you: false },
      votes: i.votes,
      passed: i.passed,
    })),
    against: null,
    rose: false,
  },
  divideAt,
  nextVoteAt: divideAt,
  issues: [],
  issuesSettleAt: termEndsAt + 2 * DAY_MS,
  election: null,
  desk: null,
  whatNow: null,
  serverNow: divideAt - DAY_MS,
};

export const townHallDeskFixture: TownHallView = {
  ...townHallFixture,
  seats: townHallFixture.seats.map((s) => (s.seat === 1 ? { ...s, you: true } : s)),
  desk: {
    ...councilViewFixture,
    you: { ...councilViewFixture.you, proposed: null, canPropose: true, proposeReason: null, pc: 45 },
    menu: [
      {
        ordinanceId: 'ord.rest-day',
        name: 'Rest Day Order',
        line: 'A day of rest by council rule: the town sleeps in.',
        effectLine: 'Rested cap +50',
        onPaper: false,
      },
    ],
    next: { kind: 'votes', at: divideAt },
  },
  whatNow: whatNowFixture,
};
