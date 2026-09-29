import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Arrival, Character, PaperEntry } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, gameData, newUser, setupDb, teardownDb, testClock } from './helpers';

/** Slice-2 tech design §14 "Server — arrival" and "Server — cities". */
beforeAll(async () => {
  await setupDb('arrival-test');
});
afterAll(teardownDb);

const content = getContent();
const REF = content.origin.reference;
const fresh = (name = 'Mara Lenk') => {
  const clock = testClock();
  const user = newUser(name);
  return { user, clock, caller: callerFor(user, clock.now) };
};
const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );

describe('arrival: the face and the origin (ADR 0011)', () => {
  it('starts at the face; the faces are public', async () => {
    const { caller } = fresh();
    const v = await caller.arrival.get();
    expect(v.phase).toBe('face');
    expect(v.faces?.map((f) => f.id)).toEqual(content.avatars);
    expect((await callerFor(null).arrival.faces()).map((f) => [f.id, f.format])).toEqual(
      content.avatars.map((id) => [id, 'raster']),
    );
    expect(await refusal(caller.arrival.start({ avatarId: 'avatar.dog' }))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_AVATAR' },
    });
    expect(await refusal(caller.arrival.answer(REF[0]!))).toMatchObject({ game: { reason: 'NO_FACE' } });
  });

  it('resumes mid-origin: three answers, then a new caller sees step 2 second question with the echo', async () => {
    const { user, caller, clock } = fresh();
    const started = await caller.arrival.start({ avatarId: 'avatar.man-40s' });
    expect(started.phase).toBe('story');
    expect(started.screen).toMatchObject({
      title: 'The room',
      echo: null,
      prompt: 'Do you remember the summer you were ten? What did you do every day?',
      progress: { step: 1, of: 3 },
      art: { kind: 'scene', asset: { id: 'scene.origin-deathbed' }, focus: { x: 0.3, y: 0.5 } },
      portrait: { id: 'portrait.father' },
    });
    for (const a of REF.slice(0, 3)) await caller.arrival.answer(a);
    const again = await callerFor(user, clock.now).arrival.get();
    expect(again.phase).toBe('story');
    expect(again.avatar?.id).toBe('avatar.man-40s');
    expect(again.screen).toMatchObject({
      title: 'The talent',
      echo: 'You could fix anything.',
      prompt: "Take my coat. It's all I have left.",
      progress: { step: 2, of: 3 },
    });
    expect(again.screen?.choices.map((c) => c.hint)).toEqual([
      'A good wool coat.',
      'He tells you where the tin is.',
      'His coat, and your word.',
    ]);
    // No number on any origin screen (§7.1).
    expect(JSON.stringify(again.screen?.choices)).not.toMatch(/\d/);
  });

  it('a double submit stores one answer; two different answers at once: the first wins for both', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.woman-20s' });
    const views = await Promise.all(Array.from({ length: 5 }, () => caller.arrival.answer(REF[0]!)));
    expect(new Set(views.map((v) => JSON.stringify(v))).size).toBe(1);
    expect((await Arrival.findOne({ userId: user.id }).lean())!.answers).toHaveLength(1);

    const q = REF[1]!.questionId;
    const [x, y] = await Promise.all([
      caller.arrival.answer({ questionId: q, answerId: 'a' }),
      caller.arrival.answer({ questionId: q, answerId: 'b' }),
    ]);
    expect(x).toEqual(y);
    const stored = (await Arrival.findOne({ userId: user.id }).lean())!.answers;
    expect(stored).toHaveLength(2);
    // Out of order and unknown answers are refused.
    expect(await refusal(caller.arrival.answer(REF[4]!))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'OUT_OF_ORDER', next: 'origin.talent' },
    });
    expect(await refusal(caller.arrival.answer({ questionId: q, answerId: 'z' }))).toMatchObject({
      game: { reason: 'UNKNOWN_ANSWER' },
    });
  });

  it('the street: three cards, the wish tag on the card of the father wish, the confirm labels', async () => {
    const { caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.woman-20s' });
    let v = await caller.arrival.get();
    for (const a of REF) v = await caller.arrival.answer(a);
    expect(v.phase).toBe('street');
    expect(v.street?.screen).toMatchObject({
      kicker: 'Irongate · morning',
      title: 'He dies before the first tram.',
    });
    expect(v.street?.note).toBe('Permanent. A Faction Reset token is the only way back.');
    expect(v.street?.cards.map((c) => [c.factionId, c.wish, c.wishLabel, c.crest.format, c.confirm])).toEqual(
      [
        ['vanguard', false, null, 'svg', 'Join the Iron Vanguard · take the train to Duskwall'],
        [
          'collective',
          true,
          'His wish · +50 Faction XP',
          'svg',
          'Join the Red Collective · take the train to Coalport',
        ],
        ['alliance', false, null, 'svg', 'Join the Civic Alliance · take the train to Ashford'],
      ],
    );
    expect(v.street?.cards[0]!.facts).toEqual([
      '+3 Strength',
      'Starts in Duskwall',
      'Their event: the Grand Rally',
    ]);
  });
});

describe('arrival.join (ADR 0011, 0012)', () => {
  it('five concurrent joins: one character, one paper, the arrival completed, identical results', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF) await caller.arrival.answer(a);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => caller.arrival.join({ factionId: 'collective' })),
    );
    expect(new Set(results.map((r) => r.character.id)).size).toBe(1);
    expect(await Character.countDocuments({ userId: user.id })).toBe(1);
    expect(await PaperEntry.countDocuments({ characterId: results[0]!.character.id })).toBe(1);
    const arrival = (await Arrival.findOne({ userId: user.id }).lean())!;
    expect(arrival.completedAt).not.toBeNull();
    expect(arrival.factionId).toBe('collective');
    expect((await caller.arrival.get()).phase).toBe('arrived');
    expect(await refusal(caller.arrival.join({ factionId: 'vanguard' }))).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'ALREADY_ARRIVED', factionId: 'collective' },
    });
    expect(await refusal(caller.arrival.answer(REF[0]!))).toMatchObject({
      game: { reason: 'ALREADY_ARRIVED' },
    });
  });

  it('five answers are not enough', async () => {
    const { caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF.slice(0, 5)) await caller.arrival.answer(a);
    expect(await refusal(caller.arrival.join({ factionId: 'alliance' }))).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'ORIGIN_INCOMPLETE', answered: 5 },
    });
  });

  it.each([
    [
      'vanguard',
      'duskwall',
      [11, 11, 5],
      0,
      'Welcome to Duskwall',
      'Mara Lenk Arrives at Duskwall Station',
      'The Duskwall Sentinel',
      ['Be at the gate', 'Report to Beacon House', 'Take a job'],
      'Viktor Stahl',
      'duskwall.garrison-gate',
      'Work jacket and cap',
      62,
    ],
    [
      'collective',
      'coalport',
      [10, 12, 5],
      50,
      'Welcome to Coalport',
      'Mara Lenk Steps Off the Irongate Train',
      'The Coalport Clarion',
      ['Be at the gate', 'Report to the hall', 'Take a job'],
      'Petra Holm',
      'coalport.mill-gate',
      'Mill work coat',
      66,
    ],
    [
      'alliance',
      'ashford',
      [8, 14, 5],
      0,
      'Welcome to Ashford',
      'Mara Lenk Arrives on the Irongate Train',
      'The Ashford Gazette',
      ['Be at the loading bay', 'Report to the Rooms', 'Take a job'],
      'Thomas Grey',
      'ashford.gazette-house',
      'Worn wool overcoat',
      74,
    ],
  ] as const)(
    'per faction: %s lands in %s with its stats, kit, welcome set and welcome edition',
    async (
      factionId,
      home,
      [str, int, agi],
      fxp,
      welcome,
      arrival,
      paperName,
      orders,
      issuer,
      pin1,
      wearing,
      odds,
    ) => {
      const { caller } = fresh();
      const r = await arrive(caller, { factionId });
      expect(r.landing).toEqual({ cityId: home, locationId: pin1 });
      const me = await caller.character.me();
      expect(me).toMatchObject({
        factionId,
        homeCityId: home,
        cityId: home,
        stats: { str, int, agi, cha: 2 },
        chaBase: 0,
        iron: 150,
        fxp,
        wearing: { name: wearing, cha: 2 },
        avatar: { id: 'avatar.woman-30s' },
        ambition: { id: 'finish-his-work', chapter: 1, status: 'ready' },
        lettersWaiting: 1,
        partyCard: { rankTitle: me.rank.title },
      });
      expect(me.orders.items.map((o) => [o.title, o.progress, o.done])).toEqual(
        orders.map((t) => [t, 0, false]),
      );
      expect(me.orders.issuer.name).toBe(issuer);
      expect(me.orders.items.map((o) => o.pin?.n)).toEqual(
        [1, 3, 1].map((n) => (home === 'ashford' && n === 3 ? 2 : n)),
      );
      const paper = await caller.paper.today();
      expect(paper.paper.name).toBe(paperName);
      expect(paper.firstEdition).toBe(true);
      expect(paper.headlines.map((h) => h.headline).slice(0, 2)).toEqual([welcome, arrival]);
      expect(paper.headlines[2]!.group).toBe('city');
      expect(paper.letters).toHaveLength(1);
      expect(paper.landing).toEqual({ cityId: home, locationId: pin1 });
      const city = await caller.city.get({ cityId: home });
      const canvass = city.locations[0]!.actions.find((a) => a.type === 'canvass')!;
      expect(canvass.preview?.chance).toBe(odds);
      expect(canvass.order).toMatchObject({ progress: 0, target: 2 });
      const other = content.cities.find((c) => c.id !== home)!.id;
      expect(await refusal(caller.city.get({ cityId: other }))).toMatchObject({
        code: 'BAD_REQUEST',
        game: { reason: 'WRONG_CITY' },
      });
    },
  );

  it('character.me before the join is ARRIVAL_PENDING; setAvatar changes the face', async () => {
    const { caller } = fresh();
    expect(await refusal(caller.character.me())).toMatchObject({ game: { reason: 'ARRIVAL_PENDING' } });
    await arrive(caller);
    const v = await caller.character.setAvatar({ avatarId: 'avatar.man-40s' });
    expect(v.avatar?.id).toBe('avatar.man-40s');
    expect(await refusal(caller.character.setAvatar({ avatarId: 'nope' }))).toMatchObject({
      game: { reason: 'UNKNOWN_AVATAR' },
    });
  });

  it('the welcome set completes in ten minutes: two canvasses, the job, the committee → +5 PC', async () => {
    const { caller } = fresh();
    await arrive(caller);
    const canvass = {
      actionId: 'coalport.mill-gate.canvass',
      locationId: 'coalport.mill-gate',
      times: 1 as const,
    };
    await caller.action.perform({ ...canvass, idempotencyKey: randomUUID() });
    const second = await caller.action.perform({ ...canvass, idempotencyKey: randomUUID() });
    expect(second.effects.orders[0]).toMatchObject({
      title: 'Be at the gate',
      after: 2,
      done: true,
      fxp: 20,
    });
    const job = await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    expect(job.outcome).toMatchObject({ orderCompleted: true, fxp: 20 });
    const hall = await caller.action.perform({
      actionId: 'coalport.union-hall.committee',
      locationId: 'coalport.union-hall',
      idempotencyKey: randomUUID(),
      times: 1,
    });
    expect(hall.effects.ordersAllDone).toEqual({ pc: 5 });
    expect(hall.character.pc).toBe(5);
  });
});
