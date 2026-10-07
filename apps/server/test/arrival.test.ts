import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Arrival, Character, PaperEntry } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, gameData, newUser, originAnswers, setupDb, teardownDb, testClock } from './helpers';

/**
 * Slice-2 tech design §14 "Server — arrival" and "Server — cities", rewritten for review 4's three
 * beats (*The Last Train In*, ADR 0073, tech design docs/tech/review-4.md §4.4).
 */
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

describe('arrival: the face and the three beats (ADR 0011, 0073)', () => {
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

  it('beat 1, the platform: three rows with a portrait, two lines and a confirm; the note', async () => {
    const { caller } = fresh();
    const v = await caller.arrival.start({ avatarId: 'avatar.man-40s' });
    expect(v.phase).toBe('story');
    expect(v.questionId).toBe('origin.platform');
    expect(v.screen).toMatchObject({
      kicker: 'Irongate · Central Station · the last train in',
      title: 'The platform',
      echo: null,
      prompt: null,
      portrait: null,
      progress: { step: 1, of: 3 },
      art: { kind: 'scene', asset: { id: 'scene.station' } },
      note: 'Whoever you help, you go with. Permanent: a Faction Reset token is the only way back.',
    });
    expect(
      v.screen?.choices.map((c) => [c.id, c.portrait?.id, c.lines?.[0], c.confirm]),
    ).toEqual([
      ['holm', 'portrait.holm', 'Petra Holm · union organiser · Coalport', "Help Holm · the six o'clock to Coalport"],
      ['stahl', 'portrait.stahl', 'Viktor Stahl · steward · Duskwall', "Help Stahl · the six o'clock to Duskwall"],
      ['grey', 'portrait.grey', 'Thomas Grey · agent · Ashford', "Help Grey · the six o'clock to Ashford"],
    ]);
  });

  it.each([
    ['holm', 'Coalport', 'Holm', 'She', "You carried Holm's parcel."],
    ['stahl', 'Duskwall', 'Stahl', 'He', "You took Stahl's bundle."],
    ['grey', 'Ashford', 'Grey', 'He', "You witnessed Grey's signature."],
  ] as const)(
    'beat 2 after helping %s: the six o’clock to %s, the helper beside the text, the echo; resumes on reload',
    async (helper, city, surname, pronoun, echo) => {
      const { user, caller, clock } = fresh();
      await caller.arrival.start({ avatarId: 'avatar.man-40s' });
      await caller.arrival.answer({ questionId: 'origin.platform', answerId: helper });
      const again = await callerFor(user, clock.now).arrival.get();
      expect(again.phase).toBe('story');
      expect(again.questionId).toBe('origin.suitcase');
      expect(again.screen).toMatchObject({
        kicker: `The six o'clock to ${city} · the compartment`,
        title: 'The suitcase',
        echo,
        prompt: null,
        portrait: { id: `portrait.${helper}` },
        art: { kind: 'scene', asset: { id: 'scene.train-compartment' } },
        progress: { step: 2, of: 3 },
      });
      expect(again.screen?.narrative).toBe(
        `${surname} dozes against the window before the viaduct. The suitcase sits between your feet, heavier than it should be. ${pronoun} wakes long enough to ask what a person carries to a new town.`,
      );
      // No number on beats 2 and 3 (§7.1); the rows' lines on beat 1 carry the party's bonus.
      expect(JSON.stringify(again.screen?.choices)).not.toMatch(/\d/);
    },
  );

  it('beat 3, the lining: the echo of the suitcase, three keepsakes with their hints; then ready', async () => {
    const { caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-40s' });
    await caller.arrival.answer(REF[0]!);
    const v = await caller.arrival.answer(REF[1]!);
    expect(v.screen).toMatchObject({
      kicker: 'The same compartment · under the lining',
      title: 'The lining',
      echo: 'You carry books.',
      portrait: null,
      progress: { step: 3, of: 3 },
    });
    expect(v.screen?.choices.map((c) => [c.text, c.hint])).toEqual([
      ['His ward book.', 'Two hundred names in his hand, and the seat he lost.'],
      ['His letter from prison.', "The Mill Fire of '19, and the word innocent, underlined twice."],
      ['The marker.', 'What he owed, to whom, and the Clearwater address.'],
    ]);
    const ready = await caller.arrival.answer(REF[2]!);
    expect(ready).toMatchObject({ phase: 'ready', screen: null, questionId: null, landing: null });
    expect((await caller.arrival.get()).phase).toBe('ready');
  });

  it('a double submit stores one answer; two different answers at once: the first wins for both', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.woman-20s' });
    const views = await Promise.all(Array.from({ length: 5 }, () => caller.arrival.answer(REF[0]!)));
    expect(new Set(views.map((v) => JSON.stringify(v))).size).toBe(1);
    expect((await Arrival.findOne({ userId: user.id }).lean())!.answers).toHaveLength(1);

    const q = REF[1]!.questionId;
    const [x, y] = await Promise.all([
      caller.arrival.answer({ questionId: q, answerId: 'tools' }),
      caller.arrival.answer({ questionId: q, answerId: 'light' }),
    ]);
    expect(x).toEqual(y);
    const stored = (await Arrival.findOne({ userId: user.id }).lean())!.answers;
    expect(stored).toHaveLength(2);
    // Out of order and unknown answers are refused.
    expect(await refusal(callerFor(user).arrival.answer({ questionId: 'origin.platform', answerId: 'zz' }))).toMatchObject({
      game: { reason: 'UNKNOWN_ANSWER' },
    });
    expect(await refusal(caller.arrival.answer({ questionId: q, answerId: 'z' }))).toMatchObject({
      game: { reason: 'UNKNOWN_ANSWER' },
    });
  });

  it('out of order: the lining before the suitcase is refused', async () => {
    const { caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.woman-20s' });
    await caller.arrival.answer(REF[0]!);
    expect(await refusal(caller.arrival.answer(REF[2]!))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'OUT_OF_ORDER', next: 'origin.suitcase' },
    });
  });

  it('QA M1: an answer is bound to the question it was shown for; a late tap on an answered question changes nothing', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.woman-20s' });
    const shown = await caller.arrival.get();
    expect(shown.questionId).toBe(REF[0]!.questionId);
    const after = await caller.arrival.answer({ questionId: shown.questionId!, answerId: 'holm' });
    expect(after.questionId).toBe(REF[1]!.questionId);
    for (const answerId of ['holm', 'stahl', 'grey']) {
      const v = await caller.arrival.answer({ questionId: shown.questionId!, answerId });
      expect(v.questionId).toBe(REF[1]!.questionId);
      expect(v.screen?.echo).toBe(after.screen?.echo);
    }
    const stored = (await Arrival.findOne({ userId: user.id }).lean())!.answers;
    expect(stored.map((s) => [s.questionId, s.answerId])).toEqual([[REF[0]!.questionId, 'holm']]);
  });

  it('QA m3: an account named before the name rule: blank or one letter reads "A Newcomer", a long name is cut to 40', async () => {
    const named = async (accountName: string) => {
      const { caller } = fresh(accountName);
      return (await caller.arrival.start({ avatarId: 'avatar.woman-20s' })).name;
    };
    expect(await named('   ')).toBe('A Newcomer');
    expect(await named('K')).toBe('A Newcomer');
    expect(await named('  Mara   Lenk ')).toBe('Mara Lenk');
    expect(await named(`${'Abcdefghij'.repeat(4)} Lenk`)).toBe('Abcdefghij'.repeat(4));
    expect((await fresh('  ').caller.arrival.get()).name).toBe('A Newcomer');
  });

  it('QA m3: the join refuses a draft whose name breaks the rule (BAD_NAME), and names the character normalised', async () => {
    const { user, caller } = fresh('Mara Lenk');
    await caller.arrival.start({ avatarId: 'avatar.woman-20s' });
    for (const a of originAnswers('vanguard')) await caller.arrival.answer(a);
    await Arrival.updateOne({ userId: user.id }, { $set: { name: 'K' } });
    expect(await refusal(caller.arrival.join({}))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'BAD_NAME', problem: 'short' },
    });
    expect(await Character.countDocuments({ userId: user.id })).toBe(0);
    await Arrival.updateOne({ userId: user.id }, { $set: { name: 'Mara   Lenk' } });
    const r = await caller.arrival.join({});
    expect(r.character.name).toBe('Mara Lenk');
    expect(r.character.factionId).toBe('vanguard');
  });
});

describe('arrival.join (ADR 0011, 0012, 0073)', () => {
  it('five concurrent joins: one character, one paper, the arrival completed, identical results', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF) await caller.arrival.answer(a);
    const results = await Promise.all(Array.from({ length: 5 }, () => caller.arrival.join({})));
    expect(new Set(results.map((r) => r.character.id)).size).toBe(1);
    expect(await Character.countDocuments({ userId: user.id })).toBe(1);
    expect(await PaperEntry.countDocuments({ characterId: results[0]!.character.id })).toBe(1);
    const arrival = (await Arrival.findOne({ userId: user.id }).lean())!;
    expect(arrival.completedAt).not.toBeNull();
    expect(arrival.factionId).toBe('collective');
    expect((await caller.arrival.get()).phase).toBe('arrived');
    // A retry after the join returns the same character (the join takes no input).
    expect((await caller.arrival.join({})).character.id).toBe(results[0]!.character.id);
    expect(await refusal(caller.arrival.answer(REF[0]!))).toMatchObject({
      game: { reason: 'ALREADY_ARRIVED' },
    });
  });

  it('the join takes no faction: an input is refused by the schema', async () => {
    const { caller } = fresh();
    await expect(caller.arrival.join({ factionId: 'vanguard' } as never)).rejects.toThrow();
  });

  it('two answers are not enough', async () => {
    const { caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF.slice(0, 2)) await caller.arrival.answer(a);
    expect(await refusal(caller.arrival.join({}))).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'ORIGIN_INCOMPLETE' },
    });
  });

  it.each([
    [
      'vanguard',
      'duskwall',
      [14, 6, 5],
      'Welcome to Duskwall',
      'Mara Lenk Arrives at Duskwall Station',
      'The Duskwall Sentinel',
      [
        'Talk to the customs men at the Fortress Gate',
        "Hand out Stahl's bundle at Beacon House",
        'Take a job at the Fortress Gate',
      ],
      'Viktor Stahl',
      'duskwall.beacon-house',
      'duskwall.beacon-house.favour',
    ],
    [
      'collective',
      'coalport',
      [8, 12, 5],
      'Welcome to Coalport',
      'Mara Lenk Steps Off the Irongate Train',
      'The Coalport Clarion',
      [
        'Talk to the workers at the Mill Gate',
        "Deliver Holm's parcel at the Union Hall",
        'Take a job at the Mill Gate',
      ],
      'Petra Holm',
      'coalport.union-hall',
      'coalport.union-hall.favour',
    ],
    [
      'alliance',
      'ashford',
      [6, 14, 5],
      'Welcome to Ashford',
      'Mara Lenk Arrives on the Irongate Train',
      'The Ashford Gazette',
      [
        'Talk to the printers at Gazette House',
        'Witness the signature at the Assembly Rooms',
        'Take a job at Gazette House',
      ],
      'Thomas Grey',
      'ashford.assembly-rooms',
      'ashford.assembly-rooms.favour',
    ],
  ] as const)(
    'per party: helping %s’s secretary lands in %s with its stats, his coat, the welcome set and the favour',
    async (factionId, home, [str, int, agi], welcome, arrival, paperName, orders, issuer, hq, favour) => {
      const { caller } = fresh();
      const r = await arrive(caller, { factionId });
      // Review 4 (§7.5): the first landing is the HQ with the favour highlighted.
      expect(r.landing).toEqual({ cityId: home, locationId: hq, actionId: favour });
      const me = await caller.character.me();
      expect(me).toMatchObject({
        factionId,
        homeCityId: home,
        cityId: home,
        stats: { str, int, agi, cha: 5 },
        chaBase: 0,
        iron: 0,
        fxp: 0,
        wearing: { name: "Your father's coat", cha: 5 },
        avatar: { id: 'avatar.woman-30s' },
        ambition: { id: 'finish-his-work', chapter: 1, status: 'ready' },
        lettersWaiting: 1,
      });
      expect(me.orders.items.map((o) => [o.title, o.progress, o.done])).toEqual(
        orders.map((t) => [t, 0, false]),
      );
      expect(me.orders.issuer.name).toBe(issuer);
      const paper = await caller.paper.today();
      expect(paper.paper.name).toBe(paperName);
      expect(paper.firstEdition).toBe(true);
      expect(paper.headlines.map((h) => h.headline).slice(0, 2)).toEqual([welcome, arrival]);
      // The welcome deck names the favour's place, the HQ.
      expect(paper.headlines[0]!.deck).toContain(`at ${content.location(hq)!.location.ref ?? content.location(hq)!.location.name}; start there.`);
      expect(paper.letters).toHaveLength(1);
      expect(paper.landing).toEqual({ cityId: home, locationId: hq, actionId: favour });
      // The favour is the HQ's first ticket while its order is open, ×1 only.
      const city = await caller.city.get({ cityId: home });
      const sheet = city.locations.find((l) => l.id === hq)!;
      expect(sheet.actions[0]).toMatchObject({ id: favour, kind: 'checked', energy: 10, energy3: null });
      expect(sheet.actions[0]!.order).toMatchObject({ progress: 0, target: 1 });
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

  it('the welcome set completes in ten minutes: two canvasses, the job, the favour → +5 PC', async () => {
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
      title: 'Talk to the workers at the Mill Gate',
      after: 2,
      done: true,
      fxp: 20,
    });
    const job = await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    expect(job.outcome).toMatchObject({ orderCompleted: true, fxp: 20 });
    const hall = await caller.action.perform({
      actionId: 'coalport.union-hall.favour',
      locationId: 'coalport.union-hall',
      idempotencyKey: randomUUID(),
      times: 1,
    });
    expect(hall.effects.ordersAllDone).toEqual({ pc: 5 });
    expect(hall.character.pc).toBe(5);
  });
});
