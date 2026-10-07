/**
 * Review 4, T19 (docs/tech/review-4.md §6.4, §6.6; ADR 0075): the journey on the nation map. The
 * card's moment is drawn at boarding in 0.20–0.80 of the journey; the server keeps the card until
 * then and refuses an early answer (`CARD_NOT_YET`, nothing written, the key not kept); the view
 * carries the route and the nation's pictures.
 */
import { randomUUID } from 'node:crypto';
import { copy } from '@irongate/content/copy';
import { Character, Journey, RequestLog } from '@irongate/db';
import type { CharacterDoc, JourneyDoc } from '@irongate/db';
import { CARD_AT } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, content, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const MIN = 60_000;
const key = () => randomUUID();
const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => {
        throw new Error('expected a refusal');
      },
      (e: unknown) => e,
    ),
  );
const stored = async (id: string) => (await Journey.findById(id).lean<JourneyDoc>())!;

beforeAll(async () => {
  await setupDb('review4-journey-test');
});
afterAll(teardownDb);

const fresh = async (opts: Parameters<typeof traveller>[1] = {}) => {
  const clock = testClock(at(DAY));
  const p = await traveller(clock, opts);
  return { ...p, clock };
};

describe('the card’s moment (ADR 0075 §3)', () => {
  it('boarding stores card.at in [0.20, 0.80] of the journey, whole seconds; the view sends cardAt, not the card', async () => {
    const p = await fresh({ name: 'Ines Moment' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const j = await stored(b.journey.id);
    const f = (j.card!.at!.getTime() - j.boardedAt.getTime()) / (j.arrivesAt.getTime() - j.boardedAt.getTime());
    expect(f).toBeGreaterThanOrEqual(CARD_AT.from);
    expect(f).toBeLessThanOrEqual(CARD_AT.to);
    expect(j.card!.at!.getTime() % 1_000).toBe(0);
    expect(b.journey.cardAt).toBe(j.card!.at!.getTime());
    expect(b.journey.card).toBeNull();
  });

  it('the view hides the card before its moment and shows it from then', async () => {
    const p = await fresh({ name: 'Ines Hidden' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const cardAt = b.journey.cardAt!;
    p.clock.set(cardAt - 1_000);
    const before = (await p.caller.travel.journey())!;
    expect([before.cardAt, before.card]).toEqual([cardAt, null]);
    p.clock.set(cardAt);
    const after = (await p.caller.travel.journey())!;
    expect(after.card).toMatchObject({ eventId: 'jev.passenger', chosen: null });
  });

  it('an answer before the moment is CARD_NOT_YET: nothing written, and the same key succeeds after it', async () => {
    const p = await fresh({ name: 'Ines Early' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const cardAt = b.journey.cardAt!;
    const before = (await Character.findById(p.id).lean<CharacterDoc>())!;
    const k = key();
    p.clock.set(cardAt - 1);
    expect(
      await refusal(p.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'listen', idempotencyKey: k })),
    ).toMatchObject({ code: 'PRECONDITION_FAILED', game: { reason: 'CARD_NOT_YET', at: cardAt } });
    expect((await stored(b.journey.id)).choice).toBeNull();
    const same = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect([same.version, same.xp, same.iron]).toEqual([before.version, before.xp, before.iron]);
    expect(await RequestLog.countDocuments({ characterId: p.id, kind: 'travel.choose' })).toBe(0);
    p.clock.set(cardAt);
    const r = await p.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'listen', idempotencyKey: k });
    expect(r.rewards).toEqual([{ id: 'xp', amount: 14 }]);
    expect((await stored(b.journey.id)).choice?.choiceId).toBe('listen');
  });

  it('the hostile deck behaves the same: the checkpoint is kept until its moment', async () => {
    const p = await fresh({ name: 'Ines Hostile', level: 10 });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    expect((await stored(b.journey.id)).card).toMatchObject({ eventId: 'jev.checkpoint', deck: 'hostile' });
    expect(b.journey.card).toBeNull();
    expect(
      (await refusal(p.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'papers', idempotencyKey: key() })))
        .game?.reason,
    ).toBe('CARD_NOT_YET');
    p.clock.set(b.journey.cardAt!);
    expect((await p.caller.travel.journey())!.card).toMatchObject({ eventId: 'jev.checkpoint', deck: 'hostile' });
    const r = await p.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'papers', idempotencyKey: key() });
    expect(r.headline).toBe('Waved on');
  });

  it('an unanswered card is in the arrival modal (and answerable there)', async () => {
    const p = await fresh({ name: 'Ines Asleep' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    p.clock.set(b.journey.arrivesAt + 1);
    const j = (await p.caller.travel.journey())!;
    expect(j.status).toBe('arrived');
    expect(j.card).toMatchObject({ eventId: 'jev.passenger', chosen: null });
    expect(j.arrival!.body).toBe(copy.travel.cardBelow);
    await p.caller.travel.choose({ journeyId: j.id, choiceId: 'listen', idempotencyKey: key() });
  });

  it('the arrival brought forward (the test hook, the dev panel) opens the card whatever its moment', async () => {
    const p = await fresh({ name: 'Ines Hooked' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    p.clock.advance(MIN);
    await Journey.updateOne({ _id: b.journey.id }, { $set: { arrivesAt: new Date(p.clock.now()) } });
    await Character.updateOne({ _id: p.id }, { $set: { 'journey.arrivesAt': new Date(p.clock.now()) } });
    const j = (await p.caller.travel.journey())!;
    expect(j.status).toBe('arrived');
    expect(j.card?.eventId).toBe('jev.passenger');
  });

  it('a journey boarded before the change (no card.at) is answerable at once', async () => {
    const p = await fresh({ name: 'Ines Migrated' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    await Journey.updateOne({ _id: b.journey.id }, { $unset: { 'card.at': 1 } });
    const j = (await p.caller.travel.journey())!;
    expect(j.cardAt).toBe(b.journey.boardedAt);
    expect(j.card?.eventId).toBe('jev.passenger');
    const r = await p.caller.travel.choose({ journeyId: j.id, choiceId: 'listen', idempotencyKey: key() });
    expect(r.rewards).toEqual([{ id: 'xp', amount: 14 }]);
  });

  it('no card drawn: cardAt is null', async () => {
    const p = await fresh({ name: 'Ines Quiet' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    await Journey.updateOne({ _id: b.journey.id }, { $set: { card: null } });
    const j = (await p.caller.travel.journey())!;
    expect([j.cardAt, j.card]).toEqual([null, null]);
  });
});

describe('the route on the nation map (tech design §6.4)', () => {
  it('into the capital: one leg, Coalport’s reversed, the whole time; the pictures and the five pins', async () => {
    const p = await fresh({ name: 'Ines Route' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const leg = content.nation.routes.find((r) => r.to === 'coalport')!;
    expect(b.journey.route.legs).toEqual([{ points: [...leg.points].reverse(), fromT: 0, toT: 1 }]);
    expect(b.journey.route.cities.map((c) => c.cityId)).toEqual(content.nation.cities.map((c) => c.cityId));
    expect(b.journey.map.day.id).toBe('map.nation.day');
    expect(b.journey.map.night.id).toBe('map.nation.night');
    expect(b.journey.map.day.tiles).toBeTruthy();
  });

  it('Coalport to Duskwall: two legs through the capital, the time split 12 : 15', async () => {
    const p = await fresh({ name: 'Ines Through', level: 10 });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const legs = b.journey.route.legs;
    expect(legs).toHaveLength(2);
    expect(legs[0]!.toT).toBeCloseTo(12 / 27, 12);
    expect(legs[1]).toMatchObject({ fromT: legs[0]!.toT, toT: 1 });
    expect(legs[0]!.points.at(-1)).toEqual(legs[1]!.points[0]);
    expect(b.journey.arrivesAt - b.journey.boardedAt).toBe(27 * MIN);
  });
});
