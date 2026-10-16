import type { GameContent } from '@irongate/content';
import { Character, DossierEntry } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { DOSSIER_CATEGORIES, FACTION_IDS, dayKey, flatCounts, flatState, toSpend } from '@irongate/rules';
import type { DossierCategory } from '@irongate/rules';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Auth } from '../auth';
import { bindInTx, capacityOf, dossierHooks, landEntry, slotsUsed, turnInTx } from '../services/dossierService';
import { testHome } from '../services/homeService';
import { testLegacy } from '../services/legacyService';
import { residenceCityId } from '../services/residence';
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
export async function lifeStatus(c: CharacterDoc | null, now: number): Promise<DevLifeStatus | null> {
  if (!c) return null;
  const today = dayKey(now);
  const flat = c.home?.flat ?? null;
  const last = dossierHooks.last.get(c._id.toHexString()) ?? null;
  return {
    dossier: { used: await slotsUsed(c._id), cap: capacityOf(c), lastRoll: last },
    flat: flat
      ? { cityId: flat.cityId, paidThroughDay: flat.paidThroughDay, state: flatState(flat, today), counts: flatCounts(flat, residenceCityId(c), today) }
      : null,
    legacy: { total: c.legacy?.total ?? 0, toSpend: toSpend(c.legacy ?? { total: 0, spent: 0 }) },
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
export type LifeDevAction = 'dossierThree' | 'dossierStale' | 'dossierNext' | 'dossierFile' | 'rentToday' | 'rentOut' | 'legacy20';
export const LIFE_DEV_ACTIONS: readonly LifeDevAction[] = [
  'dossierThree',
  'dossierStale',
  'dossierNext',
  'dossierFile',
  'rentToday',
  'rentOut',
  'legacy20',
];

export async function lifeAction(content: GameContent, c: CharacterDoc, action: LifeDevAction, now: number): Promise<string> {
  switch (action) {
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
  }
}
