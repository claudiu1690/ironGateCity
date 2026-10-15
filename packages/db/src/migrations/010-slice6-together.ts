import { dayKey, factionScopes, levelBracket, scopeFor, weekOf } from '@irongate/rules';
import type { DayKey, FactionId } from '@irongate/rules';
import type { AnyBulkWriteOperation, Types } from 'mongoose';
import { Character } from '../models/character';
import type { CharacterDoc } from '../models/character';
import { Contribution, InfluenceLedger, contributionId } from '../models/ledger';
import type { ContributionDoc } from '../models/ledger';
import type { StepCounts } from './008-review4';

/**
 * Migration 010 (docs/tech/slice-6.md §5.6): slice 6's data. Run by `ensureIndexes` after 009; the
 * five new collections and their indexes come first through `syncIndexes` (no new unique index is
 * on a field this migration adds). Idempotent: each step filters on the field's absence or upserts by
 * a natural key with `$setOnInsert`, so a second run modifies nothing.
 *
 * Step 3 of the tech design (today's fixtures for every council city) is the server's
 * `ensureFixtures` (phase B, T10): fixtures are also ensured on every board, HQ and paper read, so
 * the deploy day has its event without the migration (Deviations).
 */

/** Lower-cased words of a name, split on anything that is not a letter (the Members search). */
export function nameWordsOf(name: string): string[] {
  return [...new Set(name.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 0))];
}

/** Step 1: presence, events, chat, mutes on every character without them; then the name's words. */
export async function addTogetherFields(): Promise<StepCounts> {
  const res = await Character.updateMany(
    { presence: { $exists: false } },
    [
      {
        $set: {
          presence: { locationId: null, seenAt: { $ifNull: ['$lastActionAt', null] } },
          events: { open: [], calls: [], unseen: [] },
          chat: { hidden: false, seenAt: null },
          mutes: [],
        },
      },
    ],
    { updatePipeline: true },
  );
  const missing = await Character.find({ nameWords: { $exists: false } }, { _id: 1, name: 1 }).lean();
  if (missing.length > 0) {
    await Character.bulkWrite(
      missing.map((c) => ({
        updateOne: {
          filter: { _id: c._id, nameWords: { $exists: false } },
          update: { $set: { nameWords: nameWordsOf(c.name) } },
        },
      })),
    );
  }
  return { matched: res.matchedCount + missing.length, modified: res.modifiedCount + missing.length };
}

type Tot = { characterId: Types.ObjectId; amount: number; lastAt: Date };

/**
 * Step 2 (ADR 0042): the scoreboard's faction scopes. All time per character per city and in all
 * cities, from the influence contributions (positive by construction); this week's from the week's
 * ledger rows with a character source whose faction is the row's faction and a positive swing.
 * `events: 0` (no event happened before slice 6). The bracket from the character's Level now.
 */
export async function backfillFactionScopes(now: number = Date.now()): Promise<StepCounts> {
  // Tech §5.6: only while none exist (the live writes keep them from then on; a re-run is a no-op).
  if (await Contribution.exists({ kind: 'faction' })) return { matched: 0, modified: 0 };
  const chars = new Map<string, Pick<CharacterDoc, '_id' | 'name' | 'factionId' | 'level'>>();
  const charOf = async (id: Types.ObjectId) => {
    const k = String(id);
    if (!chars.has(k)) {
      const c = await Character.findById(id, { _id: 1, name: 1, factionId: 1, level: 1 }).lean();
      if (c) chars.set(k, c);
    }
    return chars.get(k) ?? null;
  };
  const totals = new Map<string, { scope: string; cityId: string; period: 'week' | 'all'; t: Tot }>();
  const add = (scope: string, cityId: string, period: 'week' | 'all', t: Tot) => {
    const key = contributionId(scope, t.characterId);
    const cur = totals.get(key);
    if (cur) {
      cur.t.amount += t.amount;
      if (t.lastAt > cur.t.lastAt) cur.t.lastAt = t.lastAt;
    } else totals.set(key, { scope, cityId, period, t: { ...t } });
  };

  const today: DayKey = dayKey(now);
  for await (const row of Contribution.find({ kind: 'influence' }).lean().cursor()) {
    const c = await charOf(row.characterId);
    if (!c || c.factionId !== row.factionId || row.amount <= 0) continue;
    const t = { characterId: row.characterId, amount: row.amount, lastAt: row.lastAt };
    add(scopeFor(c.factionId, 'all', row.cityId, today), row.cityId, 'all', t);
    add(scopeFor(c.factionId, 'all', null, today), 'all', 'all', t);
  }
  const monday = weekOf(today);
  for await (const row of InfluenceLedger.find({
    day: { $gte: monday, $lte: today },
    'source.kind': 'character',
    swing: { $gt: 0 },
  })
    .lean()
    .cursor()) {
    if (row.source.kind !== 'character') continue;
    const c = await charOf(row.source.characterId);
    if (!c || c.factionId !== row.factionId) continue;
    const [weekCity, weekAll] = factionScopes(c.factionId as FactionId, row.cityId, row.day);
    const t = { characterId: row.source.characterId, amount: row.swing, lastAt: row.at };
    add(weekCity, row.cityId, 'week', t);
    add(weekAll, 'all', 'week', t);
  }

  const ops: AnyBulkWriteOperation<ContributionDoc>[] = [];
  for (const [id, x] of totals) {
    const c = chars.get(String(x.t.characterId))!;
    ops.push({
      updateOne: {
        filter: { _id: id },
        update: {
          $setOnInsert: {
            _id: id,
            scope: x.scope,
            kind: 'faction',
            cityId: x.cityId,
            placeId: x.cityId,
            ref: x.scope,
            characterId: x.t.characterId,
            name: c.name,
            factionId: c.factionId,
            level: c.level,
            amount: x.t.amount,
            lastAt: x.t.lastAt,
            period: x.period,
            bracket: levelBracket(c.level),
            events: 0,
          },
        },
        upsert: true,
      },
    });
  }
  if (ops.length === 0) return { matched: 0, modified: 0 };
  const res = await Contribution.bulkWrite(ops, { ordered: false });
  return { matched: ops.length, modified: res.upsertedCount };
}

/** Migration 010, in order; `ensureIndexes` calls it after 009 and the start-up log prints the counts. */
export async function migrateSlice6Together(now: number = Date.now()): Promise<{ characters: StepCounts; factionScopes: StepCounts }> {
  const characters = await addTogetherFields();
  const factionScopesCounts = await backfillFactionScopes(now);
  return { characters, factionScopes: factionScopesCounts };
}
