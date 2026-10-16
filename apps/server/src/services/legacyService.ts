import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Character, LegacyEntry } from '@irongate/db';
import type { CharacterDoc, LegacyEntryDoc } from '@irongate/db';
import { LEGACY, PERK_IDS, NO_PERKS, dayKey, perkGate, toSpend } from '@irongate/rules';
import type { DayKey, LegacyKnock, LegacyRow, LegacyView, PerkId, PoliticalResult } from '@irongate/rules';
import type { ClientSession, Types } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { lifePolitical } from './lifeResult';
import { withRequestKey } from './requestKey';
import { VersionConflict } from './txn';

/**
 * Slice 8 phase B, lane 2 (T14; tech design §8.2; ADR 0057): Legacy. One row per natural `ref`
 * (unique per character) and `legacy.total` moved in the same transaction, so the two never
 * disagree; a replay finds the ref and adds nothing.
 */

/** Design §7.2's perk names keyed by the rules' ids (copy keys them by its own words). */
const PERK_COPY: Record<PerkId, keyof typeof copy.life.legacy.perks> = {
  party: 'fxp',
  dossier: 'dossier',
  sleep: 'sleep',
  walk: 'walk',
  name: 'name',
  monday: 'bonus',
  friends: 'friends',
  quiet: 'station',
};

/**
 * Insert the rows not already there and `$inc legacy.total` by their points. Does not bump the
 * character's version (the caller's own write does); returns the rows added.
 */
export async function addLegacyInTx(
  session: ClientSession,
  characterId: Types.ObjectId,
  rows: readonly LegacyRow[],
): Promise<LegacyRow[]> {
  if (rows.length === 0) return [];
  const have = await LegacyEntry.find({ characterId, ref: { $in: rows.map((r) => r.ref) } }, { ref: 1 })
    .session(session)
    .lean();
  const seen = new Set(have.map((h) => h.ref));
  const fresh: LegacyRow[] = [];
  for (const r of rows) {
    if (seen.has(r.ref)) continue;
    seen.add(r.ref);
    fresh.push(r);
  }
  if (fresh.length === 0) return [];
  await LegacyEntry.insertMany(
    fresh.map((r) => ({ characterId, ref: r.ref, kind: r.kind, points: r.points, day: r.day, params: r.params })),
    { session },
  );
  const points = fresh.reduce((n, r) => n + r.points, 0);
  await Character.updateOne({ _id: characterId }, { $inc: { 'legacy.total': points } }, { session });
  return fresh;
}

/** The words of a record entry (design §7.1). */
export function legacyWords(content: GameContent, e: Pick<LegacyEntryDoc, 'kind' | 'params' | 'ref'>): string {
  const w = copy.life.legacy.entries;
  const city = e.params.cityId ? (content.city(e.params.cityId)?.name ?? e.params.cityId) : '';
  switch (e.kind) {
    case 'hero':
      return w.hero(city || 'the city');
    case 'councilTerm':
      return w.councilTerm(city);
    case 'issueTopFive':
      return w.issueTop('An Issue');
    case 'pledge':
      return w.pledge(e.params.lawId ? (content.law(e.params.lawId)?.name ?? e.params.lawId) : '');
    case 'governorTerm':
      return content.isDistricted(e.params.cityId ?? '') ? w.mayorTerm(city) : w.governorTerm(city);
    case 'deputyTerm':
      return w.deputyTerm;
    case 'chairTerm':
      return w.chairTerm('party');
    case 'presidentTerm':
      return w.presidentTerm;
    case 'survived':
      return e.ref.includes('removal') ? w.survivedRemoval : w.survivedChair;
    case 'ambition':
      return w.ambition(content.ambition(e.params.ambitionId ?? '')?.title ?? 'An Ambition');
    case 'expose':
      return w.expose(content.name((e.params as { subjectId?: string }).subjectId ?? '')?.name ?? 'a name');
    case 'protege':
      return w.protege(content.patron((e.params.patronId ?? 'crane') as 'crane')?.name ?? '');
    case 'unrest':
      return w.unrestPrize(city);
    default:
      return String(e.kind);
  }
}

/** The knock-on line for a row just added (*Legacy +2 · An exposé printed*). */
export function legacyKnock(content: GameContent, row: LegacyRow, total: number): LegacyKnock {
  return {
    kind: row.kind,
    points: row.points,
    total,
    line: `${copy.life.knock.legacyGained(row.points)} · ${legacyWords(content, { kind: row.kind, params: row.params, ref: row.ref })}`,
  };
}

export async function legacyViewFor(
  content: GameContent,
  c: CharacterDoc,
  session?: ClientSession,
): Promise<LegacyView> {
  const q = LegacyEntry.find({ characterId: c._id }).sort({ day: -1, _id: -1 }).limit(50);
  const rows = await (session ? q.session(session) : q).lean<LegacyEntryDoc[]>();
  const l = c.legacy ?? { total: 0, spent: 0, perks: NO_PERKS };
  const spend = toSpend(l);
  return {
    total: l.total,
    toSpend: spend,
    line: copy.life.legacy.total(l.total, spend),
    entries: rows.map((r) => ({ words: legacyWords(content, r), day: r.day, points: r.points })),
    perks: PERK_IDS.map((id) => {
      const spec = LEGACY.perks[id];
      const taken = l.perks[id] ?? 0;
      const words = copy.life.legacy.perks[PERK_COPY[id]];
      return {
        id,
        name: words.name,
        line: words.line,
        cost: spec.cost,
        taken,
        max: spec.max,
        state: taken >= spec.max ? 'taken' : spend >= spec.cost ? 'take' : 'needs',
      };
    }),
  };
}

interface Deps<I> {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: I;
}

export async function getLegacy(deps: Omit<Deps<unknown>, 'input'>): Promise<LegacyView> {
  const loaded = await loadCharacter(deps.user, deps.content, deps.now());
  return legacyViewFor(deps.content, loaded.doc);
}

/**
 * `legacy.takePerk` (design §7.2): the gate, `legacy.spent += cost`, `perks.{id} += 1`, under the
 * version guard and `total − spent ≥ cost` in the filter. Energy and Heat are projections of the
 * stored perks (the cap and the cooling read them on every read), so nothing is re-based here.
 */
export async function takePerk(deps: Deps<{ perkId: PerkId; idempotencyKey: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: 'legacy.takePerk',
    input: { perkId: deps.input.perkId },
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== dayKey(now)) throw new VersionConflict();
      const l = c.legacy ?? { total: 0, spent: 0, perks: NO_PERKS };
      const gate = perkGate({ total: l.total, spent: l.spent, perks: { ...NO_PERKS, ...l.perks } }, deps.input.perkId);
      if (gate) throw new GameError(gate.reason, gate.need !== undefined ? { need: gate.need } : {});
      const cost = LEGACY.perks[deps.input.perkId].cost;
      const updated = await Character.findOneAndUpdate(
        {
          _id: c._id,
          version: c.version,
          'legacy.spent': l.spent,
          'legacy.total': { $gte: l.spent + cost },
        },
        { $inc: { 'legacy.spent': cost, [`legacy.perks.${deps.input.perkId}`]: 1, version: 1 } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const words = copy.life.legacy.perks[PERK_COPY[deps.input.perkId]];
      const m = copy.life.modals.perk(words.name, words.line);
      const view = await legacyViewFor(content, updated, session);
      return lifePolitical({
        content,
        session,
        updated,
        now,
        idempotencyKey: deps.input.idempotencyKey,
        act: 'perk',
        stamp: copy.life.stamps.perk,
        headline: m.headline,
        body: m.body,
        knockOns: { life: [copy.life.knock.legacy(cost, view.toSpend)] },
        view: { kind: 'legacy', legacy: view },
      });
    },
  });
}

/** Tech design §8.6 (`POST /api/test/legacy { points }`): a `test:{n}` entry. */
export async function testLegacy(characterId: Types.ObjectId, points: number, day: DayKey): Promise<void> {
  const { inTransaction } = await import('./txn');
  await inTransaction(async (session) => {
    const n = await LegacyEntry.countDocuments({ characterId, ref: /^test:/ }).session(session);
    await addLegacyInTx(session, characterId, [
      { ref: `test:${n + 1}`, kind: 'hero', points, day, params: {} },
    ]);
    await Character.updateOne({ _id: characterId }, { $inc: { version: 1 } }, { session });
  });
}
