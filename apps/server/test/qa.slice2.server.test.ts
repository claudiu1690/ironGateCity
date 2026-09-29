/**
 * QA (slice 2, "Arrival"): the server against the GDD (§7.2–7.5, §8.2, §17.1, §21.4), the slice-2
 * tech design (§7, §16) and ADRs 0011–0016. Independent of the developer's tests: permissions on
 * every new procedure, no auto-created character, input validation, set-once answers resumable at
 * every step, concurrent joins with different factions, join atomicity (a failure in the middle of
 * the transaction leaves nothing), the kit and worn CHA for every coat choice, worn CHA inside real
 * CHA checks, chapter concurrency, key reuse, the hook's computed date, the Today tally, the
 * migration through the API, and a content-policy sweep of the code's own strings.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getContent } from '@irongate/content';
import { ActionLog, Arrival, Character, PaperEntry, ensureIndexes } from '@irongate/db';
import { computeCheck, createRng, dayKey, resolveChapterCheck, tier1Difficulty } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { arrive, callerFor, gameData, newUser, setupDb, teardownDb, testClock } from './helpers';

beforeAll(async () => {
  await setupDb('qa-slice2-test');
});
afterAll(teardownDb);
afterEach(() => {
  vi.restoreAllMocks();
});

const content = getContent();
const REF = content.origin.reference;
const T0 = Date.UTC(2026, 8, 29, 9); // Tuesday 29 September 2026, 09:00 UTC
const FACTIONS: FactionId[] = ['vanguard', 'collective', 'alliance'];
const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );
const questions = content.origin.steps.flatMap((s) => s.questions);
const answersWith = (over: Record<string, string>) =>
  REF.map((a) => ({ questionId: a.questionId, answerId: over[a.questionId] ?? a.answerId }));
function fresh(name = 'Ida Brenner', clock = testClock(T0)) {
  const user = newUser(name);
  return { user, clock, caller: callerFor(user, clock.now) };
}

describe('permissions and validation (tech design §7.1)', () => {
  it('every new procedure refuses a signed-out caller; only arrival.faces is public', async () => {
    const anon = callerFor(null, () => T0);
    const key = randomUUID();
    const calls: Array<[string, () => Promise<unknown>]> = [
      ['arrival.get', () => anon.arrival.get()],
      ['arrival.start', () => anon.arrival.start({ avatarId: 'avatar.man-20s' })],
      ['arrival.answer', () => anon.arrival.answer(REF[0]!)],
      ['arrival.join', () => anon.arrival.join({ factionId: 'collective' })],
      ['ambition.get', () => anon.ambition.get()],
      ['ambition.choose', () => anon.ambition.choose({ chapter: 1, choiceId: 'show' })],
      [
        'ambition.attempt',
        () => anon.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: key }),
      ],
      ['character.setAvatar', () => anon.character.setAvatar({ avatarId: 'avatar.man-20s' })],
    ];
    for (const [name, call] of calls) {
      expect((await refusal(call())).code, name).toBe('UNAUTHORIZED');
    }
    const faces = await anon.arrival.faces();
    expect(faces.map((f) => f.id)).toEqual(content.avatars);
  });

  it('no character is ever auto-created: every character procedure is ARRIVAL_PENDING before the join', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    const key = () => randomUUID();
    const calls: Array<[string, () => Promise<unknown>]> = [
      ['character.me', () => caller.character.me()],
      ['character.setAvatar', () => caller.character.setAvatar({ avatarId: 'avatar.man-30s' })],
      [
        'character.placeStatPoint',
        () => caller.character.placeStatPoint({ stat: 'str', idempotencyKey: key() }),
      ],
      ['city.get', () => caller.city.get({ cityId: 'coalport' })],
      ['paper.today', () => caller.paper.today()],
      ['paper.markRead', () => caller.paper.markRead({ day: dayKey(T0) })],
      [
        'action.perform',
        () =>
          caller.action.perform({
            actionId: 'coalport.mill-gate.canvass',
            locationId: 'coalport.mill-gate',
            times: 1,
            idempotencyKey: key(),
          }),
      ],
      ['job.take', () => caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: key() })],
      ['ambition.get', () => caller.ambition.get()],
      ['ambition.choose', () => caller.ambition.choose({ chapter: 1, choiceId: 'show' })],
      [
        'ambition.attempt',
        () => caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: key() }),
      ],
    ];
    for (const [name, call] of calls) {
      expect(await refusal(call()), name).toMatchObject({
        code: 'PRECONDITION_FAILED',
        game: { reason: 'ARRIVAL_PENDING' },
      });
    }
    expect(await Character.countDocuments({ userId: user.id })).toBe(0);
    expect(await PaperEntry.countDocuments({})).toBeGreaterThanOrEqual(0);
  });

  it('refuses bad input: unknown faction, face, question or answer; no face; chapter and key shapes', async () => {
    const { caller } = fresh();
    // No face yet: answers and the join are refused (the draft does not exist).
    expect(await refusal(caller.arrival.answer(REF[0]!))).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'NO_FACE' },
    });
    expect(await refusal(caller.arrival.join({ factionId: 'collective' }))).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'NO_FACE' },
    });
    expect(await refusal(caller.arrival.start({ avatarId: 'portrait.holm' }))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_AVATAR' },
    });
    expect(await refusal(caller.arrival.start({ avatarId: '' }))).toMatchObject({ code: 'BAD_REQUEST' });
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    // An answer id of another question, a made-up id, an unknown question.
    for (const bad of [
      { questionId: 'origin.summer', answerId: 'd' },
      { questionId: 'origin.nope', answerId: 'a' },
      { questionId: '', answerId: 'a' },
    ]) {
      expect((await refusal(caller.arrival.answer(bad))).code, JSON.stringify(bad)).toBe('BAD_REQUEST');
    }
    // A faction that doesn't exist, or a faction smuggled as a number.
    const join = caller.arrival.join as unknown as (i: unknown) => Promise<unknown>;
    expect((await refusal(join({ factionId: 'neutral' }))).code).toBe('BAD_REQUEST');
    expect((await refusal(join({ factionId: 1 }))).code).toBe('BAD_REQUEST');
  });

  it('the client cannot set stats, Iron, FXP, items or a seed: extra fields are stripped', async () => {
    const { caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF) await caller.arrival.answer(a);
    const join = caller.arrival.join as unknown as (i: unknown) => Promise<{ character: { stats: unknown } }>;
    const r = await join({
      factionId: 'collective',
      stats: { str: 60, int: 60, agi: 60, cha: 60 },
      iron: 1e6,
      fxp: 1e6,
      items: ['outfit.fathers-coat'],
      seed: '00',
      homeCityId: 'ashford',
    });
    const me = await caller.character.me();
    expect(r.character.stats).toEqual({ str: 10, int: 12, agi: 5, cha: 2 });
    expect(me).toMatchObject({
      iron: 150,
      fxp: 50,
      homeCityId: 'coalport',
      wearing: { name: 'Mill work coat' },
    });
    // The chapter's roll is the server's: a client seed is ignored and the stored seed replays.
    await caller.ambition.choose({ chapter: 1, choiceId: 'keep' });
    const attempt = caller.ambition.attempt as unknown as (
      i: unknown,
    ) => Promise<{ seed: string; logId: string }>;
    const res = await attempt({
      chapter: 1,
      approachId: 'sort',
      idempotencyKey: randomUUID(),
      seed: 'ffffffffffffffffffffffffffffffff',
      outcome: 'success',
      rewards: { xp: 9999 },
    });
    expect(res.seed).not.toBe('ffffffffffffffffffffffffffffffff');
    const choose = caller.ambition.choose as unknown as (i: unknown) => Promise<unknown>;
    for (const chapter of [0, -1, 1.5, '1']) {
      expect((await refusal(choose({ chapter, choiceId: 'show' }))).code, String(chapter)).toBe(
        'BAD_REQUEST',
      );
    }
    expect(
      (
        await refusal(
          caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: 'not-a-uuid' }),
        )
      ).code,
    ).toBe('BAD_REQUEST');
  });
});

describe('the origin: set-once answers, resumable after a reload at every step (§7.2, ADR 0011)', () => {
  it('after each of the six answers a new session sees the next question, with the echo on the second question of each step only', async () => {
    const { user, clock } = fresh();
    const first = callerFor(user, clock.now);
    await first.arrival.start({ avatarId: 'avatar.woman-20s' });
    // A non-reference path, so the echoes differ from the developer's test.
    const path = answersWith({ 'origin.summer': 'a', 'origin.talent': 'c', 'origin.promise': 'b' });
    for (const [i, a] of path.entries()) {
      await first.arrival.answer(a);
      const reloaded = await callerFor(user, clock.now).arrival.get();
      if (i < 5) {
        expect(reloaded.phase).toBe('story');
        expect(reloaded.questionId).toBe(questions[i + 1]!.id);
        const secondOfStep = (i + 1) % 2 === 1;
        const echo = secondOfStep ? questions[i]!.answers.find((x) => x.id === a.answerId)!.echo : null;
        expect(reloaded.screen?.echo ?? null, `after answer ${i + 1}`).toBe(echo ?? null);
        expect(reloaded.screen?.progress).toEqual({ step: Math.floor((i + 1) / 2) + 1, of: 3 });
      } else {
        expect(reloaded.phase).toBe('street');
        // Justice was the wish: the Collective's card carries the tag, and only it.
        expect(reloaded.street?.cards.map((c) => [c.factionId, c.wish, c.wishLabel])).toEqual([
          ['vanguard', false, null],
          ['collective', true, 'His wish · +50 Faction XP'],
          ['alliance', false, null],
        ]);
      }
      // No number reaches an origin screen (§7.1): the view carries no stats, Iron or effects.
      expect(JSON.stringify(reloaded)).not.toMatch(/"effects"|"stat"|"iron"|"chaBase"|"fxp"/);
    }
    // Changing the face mid-way keeps the answers (a cosmetic value).
    const v = await first.arrival.start({ avatarId: 'avatar.man-40s' });
    expect(v.phase).toBe('street');
    expect((await Arrival.findOne({ userId: user.id }).lean())!.answers).toHaveLength(6);
  });

  it('replaying an earlier answer (same or different) changes nothing; answering ahead is OUT_OF_ORDER', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF.slice(0, 3)) await caller.arrival.answer(a);
    const before = (await Arrival.findOne({ userId: user.id }).lean())!.answers;
    const same = await caller.arrival.answer(REF[0]!);
    const other = await caller.arrival.answer({ questionId: REF[1]!.questionId, answerId: 'a' });
    expect(same.questionId).toBe('origin.coat');
    expect(other.questionId).toBe('origin.coat');
    expect((await Arrival.findOne({ userId: user.id }).lean())!.answers).toEqual(before);
    expect(await refusal(caller.arrival.answer(REF[5]!))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'OUT_OF_ORDER', next: 'origin.coat' },
    });
  });

  it('a double tap and a racing different answer store one answer; answers are never stored out of order', async () => {
    for (let i = 0; i < 6; i++) {
      const { user, caller } = fresh();
      await caller.arrival.start({ avatarId: 'avatar.man-20s' });
      for (const a of REF.slice(0, i)) await caller.arrival.answer(a);
      const q = questions[i]!;
      const next = questions[i + 1];
      const calls = [
        ...Array.from({ length: 4 }, () => caller.arrival.answer({ questionId: q.id, answerId: 'a' })),
        ...Array.from({ length: 4 }, () => caller.arrival.answer({ questionId: q.id, answerId: 'b' })),
        // A tap on the next question racing the first: it may land after it, never before it.
        ...(next ? [caller.arrival.answer({ questionId: next.id, answerId: 'c' })] : []),
      ];
      const settled = await Promise.allSettled(calls);
      const stored = (await Arrival.findOne({ userId: user.id }).lean())!.answers;
      expect(stored.slice(0, i + 1).map((s) => s.questionId)).toEqual(
        questions.slice(0, i + 1).map((x) => x.id),
      );
      expect(stored.length === i + 1 || stored.length === i + 2).toBe(true);
      if (stored.length === i + 2) expect(stored[i + 1]!.questionId).toBe(next!.id);
      const winner = stored[i]!.answerId;
      expect(['a', 'b']).toContain(winner);
      // Every copy of the tap on question i succeeds (no refusal for a double tap).
      for (const s of settled.slice(0, 8)) expect(s.status).toBe('fulfilled');
    }
  });
});

describe('the join (ADR 0011, 0012): atomic, one character per user, permanent', () => {
  it('nine concurrent joins naming three factions: one character, one paper, the losers get it or ALREADY_ARRIVED', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF) await caller.arrival.answer(a);
    const joins = FACTIONS.flatMap((f) => [f, f, f]).map((f) =>
      caller.arrival.join({ factionId: f }).then(
        (r) => ({ ok: true as const, f, id: r.character.id, faction: r.character.factionId }),
        (e: unknown) => ({ ok: false as const, f, ...gameData(e) }),
      ),
    );
    const results = await Promise.all(joins);
    const chars = await Character.find({ userId: user.id }).lean();
    expect(chars).toHaveLength(1);
    const winner = chars[0]!;
    expect(await PaperEntry.countDocuments({ characterId: winner._id })).toBe(1);
    const arrival = (await Arrival.findOne({ userId: user.id }).lean())!;
    expect(arrival.completedAt).not.toBeNull();
    expect(arrival.factionId).toBe(winner.factionId);
    expect(String(arrival.characterId)).toBe(String(winner._id));
    for (const r of results) {
      if (r.f === winner.factionId) {
        expect(r).toMatchObject({ ok: true, id: winner._id.toHexString(), faction: winner.factionId });
      } else {
        expect(r).toMatchObject({
          ok: false,
          code: 'CONFLICT',
          game: { reason: 'ALREADY_ARRIVED', factionId: winner.factionId },
        });
      }
    }
    // After the join, the origin is closed and the face is on the character.
    expect(await refusal(caller.arrival.answer(REF[0]!))).toMatchObject({
      game: { reason: 'ALREADY_ARRIVED' },
    });
    const again = await caller.arrival.start({ avatarId: 'avatar.woman-40s' });
    expect(again.phase).toBe('arrived');
    expect((await Arrival.findOne({ userId: user.id }).lean())!.avatarId).toBe('avatar.man-20s');
    expect((await caller.arrival.get()).landing).toEqual({
      cityId: winner.homeCityId,
      locationId: content.city(winner.homeCityId)!.locations[0]!.id,
    });
  });

  it('is atomic: a failure while printing the welcome edition leaves no character, no paper and an open arrival; a retry then works', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF) await caller.arrival.answer(a);
    const spy = vi.spyOn(PaperEntry, 'create').mockRejectedValueOnce(new Error('QA: the disk is full'));
    await expect(caller.arrival.join({ factionId: 'vanguard' })).rejects.toThrow(/QA: the disk is full/);
    expect(spy).toHaveBeenCalled();
    expect(await Character.countDocuments({ userId: user.id })).toBe(0);
    expect((await Arrival.findOne({ userId: user.id }).lean())!.completedAt).toBeNull();
    spy.mockRestore();
    const r = await caller.arrival.join({ factionId: 'vanguard' });
    expect(r.character.factionId).toBe('vanguard');
    expect(
      await PaperEntry.countDocuments({ characterId: (await Character.findOne({ userId: user.id }))!._id }),
    ).toBe(1);
  });

  it('is atomic: a failure while closing the arrival rolls back the character and the paper', async () => {
    const { user, caller } = fresh();
    await caller.arrival.start({ avatarId: 'avatar.man-20s' });
    for (const a of REF) await caller.arrival.answer(a);
    const papersBefore = await PaperEntry.countDocuments({});
    const spy = vi.spyOn(Arrival, 'updateOne').mockRejectedValueOnce(new Error('QA: primary stepped down'));
    await expect(caller.arrival.join({ factionId: 'alliance' })).rejects.toThrow(/QA: primary stepped down/);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await Character.countDocuments({ userId: user.id })).toBe(0);
    expect(await PaperEntry.countDocuments({})).toBe(papersBefore);
    vi.restoreAllMocks();
    expect((await caller.arrival.join({ factionId: 'alliance' })).character.homeCityId).toBe('ashford');
  });

  it('the new character is settled today in one write: version 0, the welcome set, the first edition, landing on pin 1', async () => {
    const { user, caller } = fresh();
    const r = await arrive(caller, { factionId: 'vanguard' });
    const doc = (await Character.findOne({ userId: user.id }).lean())!;
    expect(doc).toMatchObject({
      version: 0,
      day: { settled: dayKey(T0) },
      energy: { value: 100 },
      rested: 0,
      level: 1,
    });
    expect(doc.orders.items.map((i) => [i.templateId, i.variant, i.target, i.progress])).toEqual([
      ['dir.v.guard-change', 'main', 2, 0],
      ['dir.v.report', 'main', 1, 0],
      ['dir.v.work-shift', 'noJob', 1, 0],
    ]);
    const paper = await PaperEntry.findOne({ characterId: doc._id }).lean();
    expect(paper).toMatchObject({ day: dayKey(T0), firstEdition: true, cityId: 'duskwall' });
    expect(r.landing).toEqual({ cityId: 'duskwall', locationId: 'duskwall.garrison-gate' });
  });
});

describe('the kit and worn CHA (GDD §8.2, §21.4, ADR 0014)', () => {
  const outfits: Record<FactionId, [string, string]> = {
    vanguard: ['outfit.work-jacket', 'Work jacket and cap'],
    collective: ['outfit.mill-coat', 'Mill work coat'],
    alliance: ['outfit.worn-overcoat', 'Worn wool overcoat'],
  };

  it.each(FACTIONS.flatMap((f) => (['a', 'b', 'c'] as const).map((coat) => [f, coat] as const)))(
    '%s, coat answer %s: inventory, what is worn, worn CHA, Iron, keepsakes and the party card',
    async (f, coat) => {
      const { user, caller } = fresh();
      await arrive(caller, { factionId: f, answers: answersWith({ 'origin.coat': coat }) });
      const me = await caller.character.me();
      const doc = (await Character.findOne({ userId: user.id }).lean())!;
      const [outfitId, outfitName] = outfits[f];
      const inv = doc.inventory.map((e) => [e.itemId, e.source]);
      const worn = doc.inventory.find((e) => e.uid === doc.equipment.clothing)!.itemId;
      const card = doc.inventory.find((e) => e.uid === doc.equipment.document)!.itemId;
      expect(card).toBe('doc.party-card');
      if (coat === 'b') {
        expect(inv).toEqual([
          [outfitId, 'kit'],
          ['doc.party-card', 'kit'],
        ]);
        expect(worn).toBe(outfitId);
        expect(me).toMatchObject({
          iron: 150,
          chaBase: 0,
          stats: { cha: 2 },
          wearing: { name: outfitName, cha: 2 },
        });
        expect(me.keepsakes).toEqual([]);
      } else {
        const coatId = coat === 'a' ? 'outfit.fathers-coat' : 'outfit.fathers-coat-promised';
        expect(inv).toEqual([
          [outfitId, 'kit'],
          ['doc.party-card', 'kit'],
          [coatId, 'origin'],
        ]);
        expect(worn).toBe(coatId);
        expect(me).toMatchObject({
          iron: 0,
          chaBase: coat === 'c' ? 1 : 0,
          stats: { cha: coat === 'c' ? 6 : 5 },
          wearing: { name: "Your father's coat", cha: 5 },
        });
        expect(me.keepsakes.map((k) => k.itemId)).toEqual(
          coat === 'c' ? ['outfit.fathers-coat-promised'] : [],
        );
      }
      expect(me.partyCard).toMatchObject({
        factionName: content.faction(f).name,
        rankTitle: content.faction(f).rankTitles[0],
      });
      const paper = await caller.paper.today();
      expect(paper.desk.wearing).toEqual(
        coat === 'b' ? { name: outfitName, cha: 2 } : { name: "Your father's coat", cha: 5 },
      );
    },
  );

  it('worn CHA is the CHA of every CHA check: previews, a real CHA+INT attempt and a chapter approach', async () => {
    // Alliance: library · watched · read people · the promised coat · Settle His Debts · Truth.
    const { caller } = fresh();
    await arrive(caller, {
      factionId: 'alliance',
      answers: answersWith({
        'origin.talent': 'c',
        'origin.coat': 'c',
        'origin.promise': 'b',
        'origin.wish': 'c',
      }),
    });
    const me = await caller.character.me();
    // CHA base: read people 1 + promised coat 1 = 2; worn: 2 + the coat's 5 = 7. INT 5+3+2+3+3 = 16.
    expect(me.stats).toEqual({ str: 5, int: 16, agi: 5, cha: 7 });
    expect(me.fxp).toBe(50);
    const city = await caller.city.get({ cityId: 'ashford' });
    const difficulty = tier1Difficulty('home');
    let chaChecks = 0;
    for (const loc of content.city('ashford')!.locations) {
      for (const a of loc.actions) {
        if (!('stats' in a)) continue;
        const view = city.locations.find((l) => l.id === loc.id)!.actions.find((x) => x.id === a.id)!;
        const want = computeCheck({ stats: a.stats, values: me.stats, difficulty });
        expect(view.preview?.chance, a.id).toBe(want.chance);
        if (a.stats.includes('cha')) chaChecks += 1;
      }
    }
    expect(chaChecks).toBe(6); // cities doc §2.2: six CHA+INT checks in Ashford
    const r = await caller.action.perform({
      actionId: 'ashford.courts.queue',
      locationId: 'ashford.courts',
      times: 1,
      idempotencyKey: randomUUID(),
    });
    // (7 + 16) / 2 = 11.5 → 50 + 4 × 3.5 = 64 %.
    expect(r.attempts[0]!.check.chance).toBe(64);
    expect(JSON.stringify(r.attempts[0]!.check)).toMatch(/"cha"/);
    await caller.ambition.choose({ chapter: 1, choiceId: 'ask' });
    const amb = await caller.ambition.get();
    // Settle His Debts: CHA+STR (7 + 5) / 2 = 6 → 42 %; INT 16 → 82 %.
    expect(amb.screen?.approaches.map((a) => [a.id, a.check.chance])).toEqual([
      ['date', 42],
      ['read', 82],
    ]);
  });
});

describe('Ambition chapter 1 (GDD §17.1, ADR 0013)', () => {
  async function chosen(
    opts: { factionId?: FactionId; promise?: 'a' | 'b' | 'c'; clock?: ReturnType<typeof testClock> } = {},
  ) {
    const { user, caller, clock } = fresh('Ida Brenner', opts.clock);
    await arrive(caller, {
      factionId: opts.factionId ?? 'collective',
      answers: answersWith({ 'origin.promise': opts.promise ?? 'c' }),
    });
    const amb = await caller.ambition.get();
    const choice = amb.screen!.choices[0]!.id;
    await caller.ambition.choose({ chapter: 1, choiceId: choice });
    return { user, caller, clock, choice };
  }

  it('the step resumes: a new session finds the check with the choice as its echo, and the Letters row reads midway', async () => {
    const { user, clock, choice } = await chosen();
    const other = callerFor(user, clock.now);
    const amb = await other.ambition.get();
    expect(amb.status).toBe('midway');
    expect(amb.screen?.progress).toEqual({ step: 2, of: 3 });
    expect(amb.screen?.choices).toEqual([]);
    expect(amb.screen?.approaches).toHaveLength(2);
    const text = content
      .chapter('finish-his-work', 1)!
      .story!.choose.choices.find((c) => c.id === choice)!.text;
    expect(amb.screen?.echo).toBe(text.replace('{secretary}', 'Secretary Holm'));
    expect(amb.screen?.cta).toEqual({ label: 'Walk his ward', energy: 10, readyAt: null });
    const paper = await other.paper.today();
    expect(paper.letters).toEqual([
      {
        kind: 'chapter',
        from: "From your father's things",
        title: 'His ward book',
        chapter: 1,
        status: 'midway',
        energy: 10,
      },
    ]);
    const me = await other.character.me();
    expect(me.ambition.status).toBe('midway');
    expect(me.lettersWaiting).toBe(0);
    // Choosing again (the other choice) changes nothing: set-once.
    const again = await other.ambition.choose({ chapter: 1, choiceId: 'keep' });
    expect(again.screen?.echo).toBe(amb.screen?.echo);
  });

  it('five attempts with five different keys at once: one result, one log, 10 Energy, one keepsake', async () => {
    const { user, caller } = await chosen();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: randomUUID() }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(1);
    for (const r of results) {
      if (r.status === 'rejected') expect(gameData(r.reason).game?.reason).toBe('CHAPTER_NOT_READY');
    }
    const doc = (await Character.findOne({ userId: user.id }).lean())!;
    expect(doc.energy.value).toBe(90);
    expect(doc.inventory.filter((e) => e.itemId === 'keep.ward-book')).toHaveLength(1);
    expect(await ActionLog.countDocuments({ characterId: doc._id, kind: 'chapter' })).toBe(1);
    expect(doc.ambition).toMatchObject({ chapter: 2, step: 'choose', choiceId: null });
    expect(doc.ambition.history).toHaveLength(1);
  });

  it('a key is bound to its approach (KEY_REUSED); the same key after completion returns the stored result', async () => {
    const { caller } = await chosen();
    const key = randomUUID();
    const first = await caller.ambition.attempt({ chapter: 1, approachId: 'knock', idempotencyKey: key });
    const retry = await caller.ambition.attempt({ chapter: 1, approachId: 'knock', idempotencyKey: key });
    expect(retry).toEqual(first);
    expect(
      await refusal(caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: key })),
    ).toMatchObject({
      code: 'CONFLICT',
      game: { reason: 'KEY_REUSED' },
    });
    // A key used for a canvass cannot be replayed as a chapter, and the other way round.
    const canvassKey = randomUUID();
    await caller.action.perform({
      actionId: 'coalport.mill-gate.canvass',
      locationId: 'coalport.mill-gate',
      times: 1,
      idempotencyKey: canvassKey,
    });
    expect(
      await refusal(caller.ambition.attempt({ chapter: 1, approachId: 'knock', idempotencyKey: canvassKey })),
    ).toMatchObject({ game: { reason: 'KEY_REUSED' } });
    expect(
      await refusal(
        caller.action.perform({
          actionId: 'coalport.mill-gate.canvass',
          locationId: 'coalport.mill-gate',
          times: 1,
          idempotencyKey: key,
        }),
      ),
    ).toMatchObject({ game: { reason: 'KEY_REUSED' } });
  });

  it('counts in Today (Energy, XP, FXP, Iron) but adds no attempt or win, and moves neither Standing nor orders', async () => {
    const { user, caller } = await chosen();
    const before = (await Character.findOne({ userId: user.id }).lean())!;
    const r = await caller.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: randomUUID() });
    const after = (await Character.findOne({ userId: user.id }).lean())!;
    expect(after.today).toMatchObject({
      energy: before.today.energy + 10,
      attempts: before.today.attempts,
      successes: before.today.successes,
      xp: before.today.xp + r.rewards.xp.total,
      fxp: before.today.fxp + r.rewards.fxp.total,
      iron: before.today.iron + r.rewards.iron.total,
      opinion: before.today.opinion,
    });
    expect(after.localStanding).toEqual(before.localStanding);
    expect(after.orders.items.map((i) => i.progress)).toEqual(before.orders.items.map((i) => i.progress));
    expect(r.effects).toMatchObject({ orders: [], standing: null, opinion: null, pc: null });
    expect(r.again).toBeNull();
    expect(r.rewards.opinion).toBe(0);
    // The stored seed replays the stamp and the rewards (§13.1a).
    const spec = content.chapterRules('finish-his-work', 1)!;
    const replay = resolveChapterCheck(
      {
        spec,
        approachId: 'sort',
        values: { str: 10, int: 12, agi: 5, cha: 2 },
        energy: { value: 100, rested: 0, updatedAt: T0 },
        now: T0,
      },
      createRng(r.seed),
    );
    expect(replay.ok && replay.resolution.outcome).toBe(r.stamp);
    expect(replay.ok && replay.resolution.rewards).toEqual(r.rewards);
  });

  it('the hook names the date seven City Days after the day played, and the requirement (Rank 2 / Level 6)', async () => {
    // Played on Saturday 3 October at 23:55 UTC: the hook says Saturday 10 October.
    const late = testClock(Date.UTC(2026, 9, 3, 23, 55));
    const a = await chosen({ clock: late });
    const ra = await a.caller.ambition.attempt({
      chapter: 1,
      approachId: 'sort',
      idempotencyKey: randomUUID(),
    });
    expect(ra.effects.hooks).toEqual([
      'Chapter 2, "Stand where he stood": from Saturday 10 October, at Rank 2',
    ]);
    const b = await chosen({ promise: 'a' });
    const rb = await b.caller.ambition.attempt({
      chapter: 1,
      approachId: 'report',
      idempotencyKey: randomUUID(),
    });
    expect(rb.effects.hooks).toEqual(['Chapter 2, "The night foreman": from Tuesday 6 October, at Level 6']);
    expect(rb.effects.item).toMatchObject({
      itemId: 'keep.prison-letter',
      name: 'The prison letter',
      keepsake: true,
    });
    // After the chapter: no Letter, nothing open; chapter 2 is not playable.
    expect((await b.caller.paper.today()).letters).toEqual([]);
    const amb = await b.caller.ambition.get();
    expect(amb).toMatchObject({ chapter: 2, status: 'none', screen: null });
    expect((await b.caller.ambition.choose({ chapter: 1, choiceId: 'lamp' })).chapter).toBe(2);
    expect(await refusal(b.caller.ambition.choose({ chapter: 2, choiceId: 'lamp' }))).toMatchObject({
      game: { reason: 'CHAPTER_NOT_READY' },
    });
    expect(
      await refusal(
        b.caller.ambition.attempt({ chapter: 2, approachId: 'report', idempotencyKey: randomUUID() }),
      ),
    ).toMatchObject({ game: { reason: 'CHAPTER_NOT_READY' } });
  });

  it('exactly 10 Energy is enough (the bar ends at 0); a Failure still reads as a setback, never "failed"', async () => {
    const { user, caller } = await chosen();
    await Character.updateOne(
      { userId: user.id },
      { $set: { 'energy.value': 10, 'energy.updatedAt': new Date(T0) } },
    );
    const r = await caller.ambition.attempt({
      chapter: 1,
      approachId: 'knock',
      idempotencyKey: randomUUID(),
    });
    expect(r.effects.energy).toMatchObject({ before: 10, after: 0 });
    expect(['success', 'partial', 'failure']).toContain(r.stamp);
    expect(`${r.headline} ${r.body} ${r.effects.hooks.join(' ')}`).not.toMatch(/\bfail/i);
  });
});

describe('one home city in slice 2 (tech design §7.1)', () => {
  it.each(FACTIONS)('a %s recruit cannot read, act in or take a job in another city', async (f) => {
    const { user, caller } = fresh();
    await arrive(caller, { factionId: f });
    const home = content.faction(f).homeCityId;
    const before = (await Character.findOne({ userId: user.id }).lean())!;
    for (const other of content.cities.filter((c) => c.id !== home)) {
      expect(await refusal(caller.city.get({ cityId: other.id }))).toMatchObject({
        code: 'BAD_REQUEST',
        game: { reason: 'WRONG_CITY' },
      });
      const loc = other.locations[0]!;
      const canvass = loc.actions.find((a) => a.type === 'canvass')!;
      expect(
        await refusal(
          caller.action.perform({
            actionId: canvass.id,
            locationId: loc.id,
            times: 1,
            idempotencyKey: randomUUID(),
          }),
        ),
      ).toMatchObject({ game: { reason: 'WRONG_CITY' } });
      const job = content.jobs.find((j) => content.location(j.locationId)!.city.id === other.id)!;
      expect(await refusal(caller.job.take({ jobId: job.id, idempotencyKey: randomUUID() }))).toMatchObject({
        game: { reason: 'WRONG_CITY' },
      });
    }
    expect(await refusal(caller.city.get({ cityId: 'clearwater' }))).toMatchObject({ code: 'NOT_FOUND' });
    const after = (await Character.findOne({ userId: user.id }).lean())!;
    expect(after.version).toBe(before.version);
    expect(after.energy).toEqual(before.energy);
    expect(after.job).toBeNull();
  });
});

describe('migration 002 through the API (ADR 0016)', () => {
  const slice1Doc = (userId: string, overrides: Record<string, unknown> = {}) => {
    const now = new Date(T0 - 3 * 86_400_000);
    return {
      userId,
      name: 'Old Hand',
      factionId: 'collective',
      homeCityId: 'coalport',
      cityId: 'coalport',
      stats: { str: 10, int: 12, agi: 5, chaBase: 2 },
      energy: { value: 100, updatedAt: now },
      rested: 0,
      xp: 300,
      level: 2,
      fxp: 120,
      iron: 400,
      statPointsPending: 0,
      rank: 1,
      pc: 0,
      localStanding: [],
      job: {
        id: 'factory-worker',
        since: dayKey(now.getTime()),
        streak: 2,
        lastShiftDay: dayKey(now.getTime()),
      },
      sickDays: { week: 0, left: 2 },
      day: { settled: dayKey(now.getTime()) },
      orders: { day: dayKey(now.getTime()), items: [], allDoneAt: null },
      today: {
        day: dayKey(now.getTime()),
        energy: 0,
        attempts: 0,
        successes: 0,
        xp: 0,
        fxp: 0,
        iron: 0,
        pc: 0,
        opinion: 0,
        ordersDone: 0,
        shiftWorked: false,
        statTrained: 0,
      },
      lastActionAt: now,
      version: 5,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  it('a slice-1 and a slice-0 character play on unchanged: CHA 2 worn, the renamed job, the Letter, no face; a re-run changes nothing', async () => {
    const u1 = newUser('Old Hand');
    const u0 = newUser('Older Hand');
    await Character.collection.insertOne(slice1Doc(u1.id));
    const s0 = slice1Doc(u0.id);
    const slice0 = Object.fromEntries(
      Object.entries(s0).filter(
        ([k]) =>
          ![
            'statPointsPending',
            'rank',
            'pc',
            'localStanding',
            'job',
            'sickDays',
            'day',
            'orders',
            'today',
            'lastActionAt',
          ].includes(k),
      ),
    );
    await Character.collection.insertOne(slice0);
    // A slice-2 character, joined normally, must be untouched by the migrations.
    const joined = fresh('New Hand');
    await arrive(joined.caller, { factionId: 'alliance' });
    const joinedBefore = await Character.findOne({ userId: joined.user.id }).lean();

    await ensureIndexes();
    const m1 = await Character.findOne({ userId: u1.id }).lean();
    const m0 = await Character.findOne({ userId: u0.id }).lean();
    await ensureIndexes();
    expect(await Character.findOne({ userId: u1.id }).lean()).toEqual(m1);
    expect(await Character.findOne({ userId: u0.id }).lean()).toEqual(m0);
    expect(await Character.findOne({ userId: joined.user.id }).lean()).toEqual(joinedBefore);

    for (const u of [u1, u0]) {
      const caller = callerFor(u, () => T0);
      const me = await caller.character.me();
      expect(me).toMatchObject({
        stats: { str: 10, int: 12, agi: 5, cha: 2 },
        chaBase: 0,
        avatar: null,
        wearing: { name: 'Mill work coat', cha: 2 },
        partyCard: { factionName: 'Red Collective' },
        ambition: { id: 'finish-his-work', chapter: 1, status: 'ready' },
        lettersWaiting: 1,
      });
      expect((await caller.arrival.get()).phase).toBe('arrived');
      expect(await refusal(caller.arrival.answer(REF[0]!))).toMatchObject({
        game: { reason: 'ALREADY_ARRIVED' },
      });
      const city = await caller.city.get({ cityId: 'coalport' });
      const mill = city.locations[0]!;
      expect(mill.actions.find((a) => a.id === 'coalport.mill-gate.canvass')!.preview?.chance).toBe(66);
      // CHA+INT (2 + 12) / 2 = 7 → 46 %: worn CHA replaced the old stand-in without changing the odds.
      expect(mill.actions.find((a) => a.id === 'coalport.mill-gate.speech')!.preview?.chance).toBe(46);
    }
    // The slice-1 character's job survived the rename: its shift is live and pays.
    const c1 = callerFor(u1, () => T0);
    const me1 = await c1.character.me();
    expect(me1.job).toMatchObject({ id: 'coalport-factory-worker', name: 'Factory worker' });
    const shift = await c1.action.perform({
      actionId: 'coalport.mill-gate.shift',
      locationId: 'coalport.mill-gate',
      times: 1,
      idempotencyKey: randomUUID(),
    });
    expect(shift.stamp).toBe('worked');
    // And it can play chapter 1 and choose a face.
    await c1.ambition.choose({ chapter: 1, choiceId: 'show' });
    const ch = await c1.ambition.attempt({ chapter: 1, approachId: 'sort', idempotencyKey: randomUUID() });
    expect(ch.effects.item?.itemId).toBe('keep.ward-book');
    expect((await c1.character.setAvatar({ avatarId: 'avatar.man-40s' })).avatar?.id).toBe('avatar.man-40s');
  });
});

describe('Content policy in the code’s own strings (CLAUDE.md rules 2 and 6)', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) return files(p);
      return /\.(ts|tsx)$/.test(p) ? [p] : [];
    });
  }
  /** String literals and JSX text, comments removed. */
  function strings(src: string): string[] {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const out: string[] = [];
    for (const m of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`|>([^<>{}\n]+)</g)) {
      const s = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
      // Display text: anything with a space, or one capitalised word ('Comrade', 'Close').
      if (s && (/\s/.test(s) || /^[A-Z][a-z]+$/.test(s))) out.push(s);
    }
    return out;
  }
  const banned =
    /\b(comrades?|struggle|war|wars|battle|troops|army|militia|enemy|enemies|uprising|front|garrison|barracks|drill|muster|marshal|sergeant|captain|uniform|torch(light)?|purge|salute|commissar|siege|invasion)\b/i;

  it('client, UI and server strings use campaign vocabulary (the "Comrade" fallback of bug m-3 is gone)', () => {
    const hits: string[] = [];
    for (const dir of ['apps/client/src', 'packages/ui/src', 'apps/server/src']) {
      for (const f of files(path.join(root, dir))) {
        for (const s of strings(readFileSync(f, 'utf8'))) {
          if (banned.test(s)) hits.push(`${path.relative(root, f)}: ${s.slice(0, 80)}`);
        }
      }
    }
    // Fix round 1 (m3): the blank-name fallback is content's neutral `copy.unnamed`; the sweep's
    // allowance for "Comrade" went with it (onboarding §14.2).
    expect(hits).toEqual([]);
  });

  // BUG (minor): a sign-up name of spaces passes the form's `required` and Better Auth, and the
  // server then names the character "Comrade": a hard-coded, Collective-flavoured word that every
  // faction's paper prints on day 1 ("Comrade Arrives at Duskwall Station"). Expected: the name is
  // refused (or trimmed and validated) at sign-up, and no faction word stands in for it.
  // Fixed in fix round 1: sign-up refuses it; an older account's blank name reads "A Newcomer".
  it('BUG: a blank sign-up name is not turned into "Comrade" in the welcome edition', async () => {
    const { caller } = fresh('   ');
    await arrive(caller, { factionId: 'vanguard' });
    const paper = await caller.paper.today();
    expect(paper.headlines[1]!.headline).not.toMatch(/Comrade/);
  });
});
