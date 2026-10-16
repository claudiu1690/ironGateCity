import type { GameContent } from '@irongate/content';
import { Character, DossierEntry } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { DOSSIER_CATEGORIES, FACTION_IDS, PATRON, PATRON_TIERS, createRng, dayKey, flatCounts, flatState, grantItem, hire, minderPower, tierOf, toSpend } from '@irongate/rules';
import type { DossierCategory, PatronId, PatronTier } from '@irongate/rules';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import type { Auth } from '../auth';
import { bindInTx, capacityOf, dossierHooks, landEntry, slotsUsed, turnInTx } from '../services/dossierService';
import { testHome } from '../services/homeService';
import { testLegacy } from '../services/legacyService';
import { crossInTx, patronStateOf } from '../services/patronService';
import { residenceCityId } from '../services/residence';
import { recognitionOf } from '../services/personal';
import { streetHooks } from '../services/streetHooks';
import { wornStats } from '../services/views';
import { createCaller } from '../trpc/router';
import { inTransaction } from '../services/txn';
import { DevRefusal, zodLine } from './risk';
import type { DevLifeStatus } from './types';

/**
 * Slice 8 phase B, lane 2 (T17; tech design §8.6–§8.7): the life hooks, only with `E2E_TEST_HOOKS`
 * (memory mode): `POST /api/test/dossier` (land entries, stale ones by `daysAgo`; bind a file; turn
 * one; force the next landing), `/api/test/home` (move the rent's day key) and `/api/test/legacy`
 * (a `test:{n}` entry). Each goes through the services' own writers; the panel's buttons call the
 * same functions. Lane 1's Wardrobe, patron, bodyguard and bar hooks join here as they are relayed.
 */

const Category = z.enum(DOSSIER_CATEGORIES as unknown as [DossierCategory, ...DossierCategory[]]);
export const DossierBody = z.union([
  z.strictObject({
    entries: z
      .array(z.strictObject({ subjectId: z.string().min(1), category: Category.optional(), daysAgo: z.number().int().min(0).max(30).optional() }))
      .min(1)
      .max(20),
  }),
  z.strictObject({ file: z.string().min(1) }),
  z.strictObject({ informant: z.string().min(1) }),
  z.strictObject({ force: z.enum(['land', 'never']) }),
  z.strictObject({ stale: z.literal(true) }),
]);
export const HomeBody = z.strictObject({
  paidThroughDay: z.union([z.literal('yesterday'), z.literal('today'), z.number().int()]),
  buy: z.boolean().optional(),
});
export const LegacyBody = z.strictObject({ points: z.number().int().min(1).max(200) });
// Lane 1's hooks (tech design §8.6, §24.9; relayed in Deviations, phase B lane 1).
export const WardrobeBody = z.strictObject({
  grant: z.array(z.string().min(1)).max(10).optional(),
  wear: z.array(z.string().min(1)).max(10).optional(),
});
export const BodyguardBody = z.union([
  z.strictObject({ tier: z.union([z.literal(1), z.literal(2), z.literal(3)]), daysLeft: z.number().int().min(0).max(34).optional() }),
  z.strictObject({ lapse: z.literal(true) }),
]);
export const BuffsBody = z.strictObject({
  wellFed: z.strictObject({ tier: z.enum(['plate', 'dinner']), minutesLeft: z.number().int().min(0).max(24 * 60) }).nullable().optional(),
  spirits: z.number().int().min(0).max(9).optional(),
  rounds: z.number().int().min(0).max(3).optional(),
});
export const ForceBody = z.strictObject({
  dossier: z.enum(['land', 'never']).optional(),
  runIn: z.string().min(1).optional(),
  minder: z.enum(['works', 'fails']).optional(),
});

// Lane 1's T13 hook (tech design §8.6): a patron's Favour (or a tier), the first visit, a Request.
export const PatronBody = z.strictObject({
  patronId: z.enum(['crane', 'marr']),
  /** Favour set to this figure (0–100); crossings upward go through `crossInTx` (the piece, Legacy). */
  favour: z.number().int().min(0).max(100).optional(),
  /** Favour set to the tier's threshold (Acquaintance 10 … Protégé 90). */
  tier: z.enum(PATRON_TIERS).optional(),
  /** `firstVisitDay = today − n` (0: today; 2: the first letter arrives at the next boundary). */
  visitDaysAgo: z.number().int().min(0).max(60).optional(),
  /** A Request open now (arrived today, `daysLeft` more days, default 3), or `'clear'` for none. */
  request: z
    .union([
      z.strictObject({
        id: z.string().min(1),
        progress: z.number().int().min(0).max(5).optional(),
        daysLeft: z.number().int().min(0).max(3).optional(),
        districtId: z.string().min(1).optional(),
      }),
      z.literal('clear'),
    ])
    .optional(),
  /** The weekly favour called `n` days ago (null: ready). */
  favourDaysAgo: z.number().int().min(0).max(7).nullable().optional(),
});

/** `/api/test/patron`: writes the embedded patron in one transaction (version bumped). */
export async function testPatron(content: GameContent, c0: CharacterDoc, body: z.output<typeof PatronBody>, now: number) {
  const spec = content.patron(body.patronId);
  if (!spec) throw new DevRefusal(404, 'no such patron');
  const today = dayKey(now);
  return inTransaction(async (session) => {
    const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
    if (!c) throw new DevRefusal(404, 'no character');
    const p = { ...patronStateOf(c, body.patronId as PatronId) };
    const before = p.favour;
    if (body.tier) p.favour = PATRON.tiers.find(([t]) => t === body.tier)![1];
    if (body.favour !== undefined) p.favour = body.favour;
    if (body.visitDaysAgo !== undefined) p.firstVisitDay = today - body.visitDaysAgo;
    if (body.favourDaysAgo !== undefined) p.favourDay = body.favourDaysAgo === null ? null : today - body.favourDaysAgo;
    if (body.request === 'clear') p.requests = [];
    else if (body.request) {
      const want = body.request;
      const r = spec.requests.find((x) => x.id === want.id);
      if (!r) throw new DevRefusal(400, `not one of the patron's Requests: ${want.id}`);
      const progress = Math.min(r.target, want.progress ?? 0);
      const districtId = want.districtId ?? (r.match.districtId === 'rotate' ? content.districtsOf(content.nation.capitalId)[0]?.id : undefined);
      p.requests = [
        ...p.requests.filter((x) => x.id !== r.id),
        {
          id: r.id,
          arrivedDay: today,
          untilDay: today + (want.daysLeft ?? PATRON.request.openDays - 1),
          target: r.target,
          progress,
          doneAt: progress >= r.target ? new Date(now) : null,
          params: { ...(districtId ? { districtId } : {}) },
        },
      ].slice(-PATRON.request.held);
    }
    const list = [...(c.patrons ?? []).filter((x) => x.id !== p.id), p];
    await Character.updateOne({ _id: c._id }, { $set: { patrons: list }, $inc: { version: 1 } }, { session });
    const crossed = PATRON.tiers.filter(([, at]) => before < at && p.favour >= at).map(([t]) => t as PatronTier);
    const x = await crossInTx(session, content, c._id, p.id, crossed, today);
    return {
      patron: { id: p.id, favour: p.favour, tier: tierOf(p.favour), firstVisitDay: p.firstVisitDay, favourDay: p.favourDay, requests: p.requests },
      crossed,
      piece: x.piece,
      legacy: x.legacy,
    };
  });
}

const callerAs = (content: GameContent, c: CharacterDoc, now: () => number) =>
  createCaller({ user: { id: c.userId, name: c.name }, content, now } as never);

/** Items into the inventory (source `test`), then worn through `wardrobe.wear` (the service's own writer). */
export async function testWardrobe(
  content: GameContent,
  c: CharacterDoc,
  body: { grant?: string[] | undefined; wear?: string[] | undefined },
  now: () => number,
): Promise<{ granted: string[]; worn: string[] }> {
  const granted: string[] = [];
  for (const id of body.grant ?? []) {
    const spec = content.itemSpec(id);
    if (!spec) throw new DevRefusal(400, `no item "${id}"`);
    const fresh = (await Character.findById(c._id).lean<CharacterDoc>())!;
    if ((fresh.inventory ?? []).some((e) => e.itemId === id)) continue;
    const r = grantItem(fresh.inventory ?? [], spec, { uid: new Types.ObjectId().toHexString(), day: dayKey(now()), source: 'test' } as never);
    await Character.updateOne({ _id: c._id, version: fresh.version }, { $set: { inventory: r.inventory }, $inc: { version: 1 } });
    granted.push(id);
  }
  const worn: string[] = [];
  for (const id of body.wear ?? []) {
    const fresh = (await Character.findById(c._id).lean<CharacterDoc>())!;
    const e = (fresh.inventory ?? []).find((x) => x.itemId === id);
    if (!e) throw new DevRefusal(400, `not owned: "${id}"`);
    await callerAs(content, fresh, now).wardrobe.wear({ uid: e.uid });
    worn.push(id);
  }
  return { granted, worn };
}

/** The contract (the name drawn as a hire would), or moved to yesterday (a lapse). */
export async function testBodyguard(
  content: GameContent,
  c: CharacterDoc,
  body: { tier: 1 | 2 | 3; daysLeft?: number | undefined } | { lapse: true },
  now: number,
) {
  const today = dayKey(now);
  if ('lapse' in body) {
    if (!c.bodyguard) throw new DevRefusal(409, 'nobody walking with you');
    await Character.updateOne({ _id: c._id }, { $set: { 'bodyguard.paidThroughDay': today - 1 }, $inc: { version: 1 } });
    return { bodyguard: { ...c.bodyguard, paidThroughDay: today - 1 } };
  }
  const names = content.bodyguards.find((b) => b.tier === body.tier)?.names ?? [];
  const contract = hire({ tier: body.tier, contract: c.bodyguard ?? null, names, today, rng: createRng(randomUUID()) });
  const set = body.daysLeft !== undefined ? { ...contract, paidThroughDay: today + body.daysLeft } : contract;
  await Character.updateOne({ _id: c._id }, { $set: { bodyguard: set }, $inc: { version: 1 } });
  return { bodyguard: set, power: minderPower(body.tier) };
}

/** The bar's buffs and today's rounds. */
export async function testBuffs(
  c: CharacterDoc,
  body: { wellFed?: { tier: 'plate' | 'dinner'; minutesLeft: number } | null | undefined; spirits?: number | undefined; rounds?: number | undefined },
  now: number,
) {
  const set: Record<string, unknown> = {};
  if (body.wellFed !== undefined)
    set['buffs.wellFed'] = body.wellFed ? { tier: body.wellFed.tier, until: new Date(now + body.wellFed.minutesLeft * 60_000) } : null;
  if (body.spirits !== undefined) set['buffs.spirits'] = { left: body.spirits };
  if (body.rounds !== undefined) set['today.rounds'] = body.rounds;
  await Character.updateOne({ _id: c._id }, { $set: set, $inc: { version: 1 } });
  return { set: Object.keys(set) };
}

/** The caller's next act: a Dossier landing, a run-in (an opponent id) and his row's roll. */
export function testForce(c: CharacterDoc, body: { dossier?: 'land' | 'never' | undefined; runIn?: string | undefined; minder?: 'works' | 'fails' | undefined }) {
  const id = c._id.toHexString();
  if (body.dossier) dossierHooks.set(id, body.dossier);
  if (body.runIn || body.minder)
    streetHooks.set(id, {
      runIn: 'next',
      ...(body.runIn && body.runIn !== 'random' ? { opponentId: body.runIn } : {}),
      ...(body.minder ? { choiceRoll: body.minder === 'works' ? 1 : 100 } : {}),
    });
  return { force: body };
}

/** A rival party's drawn name in the character's city (the panel's *Three entries on a rival name*). */
export function rivalNameHere(content: GameContent, c: CharacterDoc): string {
  const rivals = FACTION_IDS.filter((f) => f !== c.factionId);
  const here = content.namesOf(c.cityId).filter((n) => n.drawn && n.factionId && rivals.includes(n.factionId));
  const any = content.names().filter((n) => n.drawn && n.factionId && rivals.includes(n.factionId));
  const pick = here[0] ?? any[0];
  if (!pick) throw new DevRefusal(409, 'no rival name to land an entry on');
  return pick.id;
}

/** Land entries on named subjects (days ago for stale ones), through `landEntry`. */
export async function landTestEntries(
  content: GameContent,
  c0: CharacterDoc,
  entries: ReadonlyArray<{ subjectId: string; category?: DossierCategory; daysAgo?: number }>,
  now: number,
): Promise<{ landed: number; refused: number }> {
  const today = dayKey(now);
  return inTransaction(async (session) => {
    const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
    if (!c) throw new DevRefusal(404, 'no character');
    let landed = 0;
    let refused = 0;
    const seed = randomUUID();
    for (const [n, e] of entries.entries()) {
      const name = content.name(e.subjectId);
      if (!name) throw new DevRefusal(400, `no Dossier name "${e.subjectId}"`);
      const r = await landEntry(session, content, c, {
        source: 'test',
        category: e.category ?? 'political',
        cityId: name.cityId,
        subjectId: e.subjectId,
        chancePct: 100,
        seed,
        row: n,
        now,
        day: today - (e.daysAgo ?? 0),
      });
      if (r.landed) landed += 1;
      else if (r.knock?.refused) refused += 1;
    }
    await Character.updateOne({ _id: c._id }, { $inc: { version: 1 } }, { session });
    return { landed, refused };
  });
}

/** A Case File on the name now (three fresh entries landed first when short; no Level gate). */
export async function testFile(content: GameContent, c0: CharacterDoc, subjectId: string, now: number) {
  const held = await DossierEntry.countDocuments({ characterId: c0._id, kind: 'entry', status: 'held', subjectId });
  if (held < 3)
    await landTestEntries(
      content,
      c0,
      Array.from({ length: 3 - held }, (_, k) => ({ subjectId, category: k === 0 ? ('political' as const) : ('pattern' as const) })),
      now,
    );
  return inTransaction(async (session) => {
    const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
    if (!c) throw new DevRefusal(404, 'no character');
    const { file } = await bindInTx(session, content, c, subjectId, now, { skipLevel: true });
    await Character.updateOne({ _id: c._id }, { $inc: { version: 1 } }, { session });
    return { fileId: file._id.toHexString(), kinds: file.kinds, weight: file.weight };
  });
}

/** Turn a Case File on the name into an informant now (no patron gate; a file made first if none). */
export async function testInformant(content: GameContent, c0: CharacterDoc, subjectId: string, now: number) {
  let file = await DossierEntry.findOne({ characterId: c0._id, kind: 'file', status: 'held', subjectId }).lean();
  if (!file) {
    await testFile(content, c0, subjectId, now);
    file = await DossierEntry.findOne({ characterId: c0._id, kind: 'file', status: 'held', subjectId }).lean();
  }
  if (!file) throw new DevRefusal(409, 'no file to turn');
  return inTransaction(async (session) => {
    const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
    if (!c) throw new DevRefusal(404, 'no character');
    const turned = await turnInTx(session, content, c, file!._id, now, { skipPatron: true });
    await Character.updateOne({ _id: c._id }, { $inc: { version: 1 } }, { session });
    return { informantId: turned._id.toHexString(), untilDay: turned.informant?.untilDay ?? null };
  });
}

/** *Make it stale*: every held entry dated a week earlier (fresh → stale), nothing else touched. */
export async function makeStale(c: CharacterDoc): Promise<number> {
  const r = await DossierEntry.updateMany(
    { characterId: c._id, kind: 'entry', status: 'held' },
    { $inc: { day: -7 } },
  );
  return r.modifiedCount;
}

/** The dev panel's life block (tech design §8.7, lane 2's part). */
export async function lifeStatus(content: GameContent, c: CharacterDoc | null, now: number): Promise<DevLifeStatus | null> {
  if (!c) return null;
  const today = dayKey(now);
  const flat = c.home?.flat ?? null;
  const last = dossierHooks.last.get(c._id.toHexString()) ?? null;
  const cha = wornStats(c, content, now).cha;
  const rec = recognitionOf(c, cha, now);
  const bg = c.bodyguard ?? null;
  return {
    worn: { cha, chaBase: c.stats.chaBase, recognition: rec as unknown as Record<string, unknown> },
    bodyguard: bg ? { tier: bg.tier, name: bg.name, paidThroughDay: bg.paidThroughDay, power: minderPower(bg.tier) } : null,
    buffs: {
      wellFed: c.buffs?.wellFed ? { tier: c.buffs.wellFed.tier, minutesLeft: Math.max(0, Math.round((new Date(c.buffs.wellFed.until).getTime() - now) / 60_000)) } : null,
      spirits: c.buffs?.spirits?.left ?? 0,
      rounds: c.today?.day === today ? (c.today.rounds ?? 0) : 0,
    },
    dossier: { used: await slotsUsed(c._id), cap: capacityOf(c), lastRoll: last },
    flat: flat
      ? { cityId: flat.cityId, paidThroughDay: flat.paidThroughDay, state: flatState(flat, today), counts: flatCounts(flat, residenceCityId(c), today) }
      : null,
    legacy: { total: c.legacy?.total ?? 0, toSpend: toSpend(c.legacy ?? { total: 0, spent: 0 }) },
    // Lane 1's T13: each patron's Favour, tier and open Requests.
    patrons: content.patrons.map((spec) => {
      const p = patronStateOf(c, spec.id);
      return {
        id: spec.id,
        favour: p.favour,
        tier: tierOf(p.favour),
        firstVisitDay: p.firstVisitDay,
        requests: p.requests.map((q) => ({ id: q.id, progress: q.progress, target: q.target, untilDay: q.untilDay, done: q.doneAt !== null })),
      };
    }),
  };
}

export function registerLifeHooks(app: FastifyInstance, deps: { auth: Auth; content: GameContent; now: () => number }): void {
  const { auth, content, now } = deps;
  dossierHooks.enabled = true;

  const handle =
    <S extends z.ZodType>(schema: S, fn: (body: z.output<S>, c: CharacterDoc) => Promise<object>) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = schema.safeParse(request.body ?? {});
        if (!parsed.success) throw new DevRefusal(400, zodLine(parsed.error));
        const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        if (!session) throw new DevRefusal(401, 'sign in first');
        const c = await Character.findOne({ userId: session.user.id }).lean<CharacterDoc>();
        if (!c) throw new DevRefusal(404, 'no character yet');
        return { ok: true, ...(await fn(parsed.data, c)) };
      } catch (err) {
        if (err instanceof DevRefusal) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    };

  app.post(
    '/api/test/dossier',
    handle(DossierBody, async (body, c) => {
      if ('entries' in body) return landTestEntries(content, c, body.entries, now());
      if ('file' in body) return testFile(content, c, body.file, now());
      if ('informant' in body) return testInformant(content, c, body.informant, now());
      if ('stale' in body) return { staled: await makeStale(c) };
      dossierHooks.set(c._id.toHexString(), body.force);
      return { force: body.force };
    }),
  );
  app.post(
    '/api/test/home',
    handle(HomeBody, async (body, c) => ({
      flat: await testHome(c._id, { paidThroughDay: body.paidThroughDay, ...(body.buy ? { buy: true } : {}) }, now()),
    })),
  );
  app.post('/api/test/wardrobe', handle(WardrobeBody, async (body, c) => testWardrobe(content, c, body, now)));
  app.post('/api/test/bodyguard', handle(BodyguardBody, async (body, c) => testBodyguard(content, c, body, now())));
  app.post('/api/test/buffs', handle(BuffsBody, async (body, c) => testBuffs(c, body, now())));
  app.post('/api/test/force', handle(ForceBody, async (body, c) => testForce(c, body)));
  app.post('/api/test/patron', handle(PatronBody, async (body, c) => testPatron(content, c, body, now())));
  app.post(
    '/api/test/legacy',
    handle(LegacyBody, async (body, c) => {
      await testLegacy(c._id, body.points, dayKey(now()));
      const after = await Character.findById(c._id, { legacy: 1 }).lean<CharacterDoc>();
      return { total: after?.legacy?.total ?? 0 };
    }),
  );
}

/** The panel's life buttons (lane 2's): each calls a hook's writer above, then the panel settles. */
export type LifeDevAction =
  | 'dossierThree'
  | 'dossierStale'
  | 'dossierNext'
  | 'dossierFile'
  | 'rentToday'
  | 'rentOut'
  | 'legacy20'
  // Lane 1's (tech design §8.7, §24.9): the Wardrobe, someone to walk with you, the bar.
  | 'partyCoat'
  | 'greatcoatHat'
  | 'pressKit'
  | 'forgedPapers'
  | 'doorman'
  | 'steward'
  | 'minder'
  | 'minderLastDay'
  | 'minderLapse'
  | 'wellFed5'
  | 'spirits9'
  | 'roundsUsed'
  // Lane 1's T13 (tech design §8.7): Crane at 29 / 59 / 89, Marr at 29 / 59 / 89, first visit two days ago.
  | 'crane29'
  | 'crane59'
  | 'crane89'
  | 'marr29'
  | 'marr59'
  | 'marr89'
  | 'patronVisited';
export const LIFE_DEV_ACTIONS: readonly LifeDevAction[] = [
  'dossierThree',
  'dossierStale',
  'dossierNext',
  'dossierFile',
  'rentToday',
  'rentOut',
  'legacy20',
  'partyCoat',
  'greatcoatHat',
  'pressKit',
  'forgedPapers',
  'doorman',
  'steward',
  'minder',
  'minderLastDay',
  'minderLapse',
  'wellFed5',
  'spirits9',
  'roundsUsed',
  'crane29',
  'crane59',
  'crane89',
  'marr29',
  'marr59',
  'marr89',
  'patronVisited',
];

export async function lifeAction(content: GameContent, c: CharacterDoc, action: LifeDevAction, now: number): Promise<string> {
  const at = () => now;
  const items = (ids: string[]) => testWardrobe(content, c, { grant: ids, wear: ids }, at);
  switch (action) {
    case 'partyCoat': {
      const coat = content.items.find((i) => i.slot === 'clothing' && i.factionId === c.factionId && (i.price ?? 0) > 0);
      if (!coat) throw new DevRefusal(409, 'no party coat for this party');
      await items([coat.id]);
      return `Wearing ${coat.name}`;
    }
    case 'greatcoatHat':
      await items(['outfit.greatcoat', 'acc.good-hat']);
      return 'Wearing the greatcoat and the hat';
    case 'pressKit':
      await items(['doc.press-pass', 'tool.press-camera']);
      return 'Wearing the press pass and the camera';
    case 'forgedPapers':
      await items(['doc.forged-papers']);
      return 'Carrying forged papers';
    case 'doorman':
    case 'steward':
    case 'minder': {
      const tier = action === 'doorman' ? 1 : action === 'steward' ? 2 : 3;
      const r = await testBodyguard(content, c, { tier }, now);
      return `${r.bodyguard.name} walks with you for a week`;
    }
    case 'minderLastDay': {
      if (!c.bodyguard) throw new DevRefusal(409, 'nobody walking with you');
      await testBodyguard(content, c, { tier: c.bodyguard.tier, daysLeft: 0 }, now);
      return `${c.bodyguard.name}'s last day`;
    }
    case 'minderLapse':
      await testBodyguard(content, c, { lapse: true }, now);
      return 'Sent him home (the week ran out yesterday)';
    case 'wellFed5':
      await testBuffs(c, { wellFed: { tier: 'plate', minutesLeft: 5 } }, now);
      return 'Well fed, five minutes left';
    case 'spirits9':
      await testBuffs(c, { spirits: 9 }, now);
      return 'Nine missions in good spirits';
    case 'roundsUsed':
      await testBuffs(c, { rounds: 3 }, now);
      return "Today's three rounds used";
    case 'dossierThree': {
      const subjectId = rivalNameHere(content, c);
      const r = await landTestEntries(content, c, [{ subjectId }, { subjectId, category: 'pattern' }, { subjectId, category: 'criminal' }], now);
      return `Three entries on ${content.name(subjectId)?.name ?? subjectId}: ${r.landed} landed${r.refused ? `, ${r.refused} refused (full)` : ''}`;
    }
    case 'dossierStale':
      return `${await makeStale(c)} entries made stale`;
    case 'dossierNext':
      dossierHooks.set(c._id.toHexString(), 'land');
      return 'Your next tap lands an entry';
    case 'dossierFile': {
      const subjectId = rivalNameHere(content, c);
      const r = await testFile(content, c, subjectId, now);
      return `A Case File on ${content.name(subjectId)?.name ?? subjectId} (${(r.kinds ?? []).join(', ')})`;
    }
    case 'rentToday':
    case 'rentOut': {
      const flat = await testHome(c._id, { paidThroughDay: action === 'rentToday' ? 'today' : 'yesterday', buy: true }, now);
      return flat ? `Rent paid through day ${flat.paidThroughDay}` : 'No flat';
    }
    case 'legacy20':
      await testLegacy(c._id, 20, dayKey(now));
      return 'Legacy +20';
    case 'crane29':
    case 'crane59':
    case 'crane89':
    case 'marr29':
    case 'marr59':
    case 'marr89': {
      const patronId = action.startsWith('crane') ? 'crane' : 'marr';
      const favour = Number(action.slice(-2));
      await testPatron(content, c, { patronId, favour }, now);
      const next = favour === 29 ? 'Associate' : favour === 59 ? 'Confidant' : 'Protégé';
      return `${content.patron(patronId)?.name ?? patronId} at ${favour}, one short of ${next}`;
    }
    case 'patronVisited':
      for (const patronId of ['crane', 'marr'] as const) await testPatron(content, c, { patronId, visitDaysAgo: 2 }, now);
      return 'First visit to both patrons two days ago: a letter at the next boundary';
  }
}
