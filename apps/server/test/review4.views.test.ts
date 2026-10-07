/**
 * Review 4, phase 1 (tech design docs/tech/review-4.md §12.2–§12.5, T3–T4): the small server views.
 * `OrdersView.away` in any city but the residence and on a train (#13); *Known here · better odds*
 * on checked tickets at Familiar or better (#18); the rank ladder on the character view (#25); the
 * run-in's Heat knock-on carries its cooling moment (#12).
 */
import { RANK_FXP } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupDb, teardownDb, testClock } from './helpers';
import { at, content, key, member } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026

beforeAll(async () => {
  await setupDb('review4-views-test');
});
afterAll(async () => {
  await teardownDb();
});

describe('the home orders away (review 4 #13, answers §13)', () => {
  it('null at home; one line with the day count in another city, rival ground included', async () => {
    const clock = testClock(at(DAY));
    const home = await member(clock, { name: 'Hal Home' });
    const me = await home.caller.character.me();
    expect(me.orders.away).toBeNull();

    const capital = await member(clock, { name: 'Cas Away', cityId: 'irongate' });
    const away = (await capital.caller.character.me()).orders.away;
    expect(away).toEqual({ cityName: 'Coalport', done: expect.any(Number), of: 3 });

    const rival = await member(clock, { name: 'Riv Away', level: 10, cityId: 'duskwall' });
    expect((await rival.caller.paper.today()).orders.away).toMatchObject({ cityName: 'Coalport', of: 3 });
  });

  it('on a train, the same line', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Tra Inn', level: 10 });
    await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const me = await p.caller.character.me();
    expect(me.journey?.status).toBe('onTheWay');
    expect(me.orders.away).toMatchObject({ cityName: 'Coalport', of: 3 });
  });
});

describe('Known here · better odds (review 4 #18, answers §18)', () => {
  it('on every checked ticket where the player is Familiar or better; none for a Stranger', async () => {
    const clock = testClock(at(DAY));
    const familiar = await member(clock, { name: 'Fam Iliar', successes: 10 });
    const city = await familiar.caller.city.get({ cityId: 'coalport' });
    const checked = city.locations.flatMap((l) => l.actions.filter((a) => a.kind === 'checked'));
    expect(checked.length).toBeGreaterThan(0);
    for (const a of checked) expect(a.placeTags ?? [], a.id).toContainEqual({ kind: 'known' });
    // Training is not a check: no tag.
    const training = city.locations.flatMap((l) => l.actions.filter((a) => a.kind === 'training'));
    for (const a of training) expect(a.placeTags ?? []).not.toContainEqual({ kind: 'known' });

    const stranger = await member(clock, { name: 'Str Anger', successes: 0 });
    const plain = await stranger.caller.city.get({ cityId: 'coalport' });
    for (const a of plain.locations.flatMap((l) => l.actions)) {
      expect(a.placeTags ?? []).not.toContainEqual({ kind: 'known' });
    }
  });

  it('on a mission ticket too', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Mis Sion', successes: 30 });
    const city = await p.caller.city.get({ cityId: 'coalport' });
    const missions = city.locations.flatMap((l) => l.missions ?? []);
    expect(missions.length).toBeGreaterThan(0);
    for (const m of missions) expect(m.placeTags).toContainEqual({ kind: 'known' });
  });
});

describe('the rank ladder (review 4 #25, answers §25)', () => {
  it('seven rows: the faction titles, the Party XP floors and what each opens', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Lad Der', factionId: 'collective', rank: 2 });
    const me = await p.caller.character.me();
    expect(me.ranks).toEqual(
      content.faction('collective').rankTitles.map((title, i) => ({
        rank: i + 1,
        title,
        fxp: RANK_FXP[i],
        opens: ['hall', 'vote', 'stand', 'chair', 'list', 'president', 'life'][i],
      })),
    );
    expect(me.ranks.map((r) => r.fxp)).toEqual([0, 400, 2_000, 6_000, 15_000, 25_000, 60_000]);
    expect(me.rank).toMatchObject({ value: 2, title: 'Activist', fxpNext: 2_000, nextTitle: 'Organiser' });
  });
});
