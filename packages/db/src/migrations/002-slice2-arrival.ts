import type { Content } from '@irongate/content';
import { dayKey } from '@irongate/rules';
import type { AmbitionState, InventoryEntry } from '@irongate/rules';
import { Types } from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongoose';
import { Character } from '../models/character';
import type { CharacterDoc } from '../models/character';

/** Coalport's job ids became city-prefixed in slice 2 (cities §3 Q1, ADR 0016). */
export const RENAMED_JOBS: Readonly<Record<string, string>> = {
  'factory-worker': 'coalport-factory-worker',
  'street-vendor': 'coalport-street-vendor',
  driver: 'coalport-driver',
};

/** The Ambition every migrated character gets (ADR 0016). */
const MIGRATED_AMBITION = 'finish-his-work';

/**
 * ADR 0016: characters from slices 0–1 become the reference recruit in place. Idempotent: the job
 * rename matches only old ids, and the rest touches only documents without an `ambition`. Stats,
 * Iron and FXP are left alone (the origin's 150 Iron and 50 FXP are not paid); the CHA base becomes
 * 0 and the faction's outfit is worn, so worn CHA stays 2.
 */
export async function migrateSlice2Arrival(
  content: Pick<Content, 'origin' | 'factions'>,
): Promise<{ jobsRenamed: number; migrated: number }> {
  let jobsRenamed = 0;
  for (const [from, to] of Object.entries(RENAMED_JOBS)) {
    const r = await Character.updateMany(
      { 'job.id': from },
      { $set: { 'job.id': to } },
      { timestamps: false },
    );
    jobsRenamed += r.modifiedCount;
  }

  const cursor = Character.find({ ambition: { $exists: false } }, { _id: 1, factionId: 1, createdAt: 1 })
    .lean<Pick<CharacterDoc, '_id' | 'factionId' | 'createdAt'>>()
    .cursor();
  let ops: AnyBulkWriteOperation<CharacterDoc>[] = [];
  let migrated = 0;
  const flush = async () => {
    if (ops.length === 0) return;
    const r = await Character.bulkWrite(ops, { ordered: false });
    migrated += r.modifiedCount;
    ops = [];
  };
  for await (const c of cursor) {
    const kit = content.factions.find((f) => f.id === c.factionId)?.kit;
    if (!kit) continue;
    const day = dayKey((c.createdAt ?? new Date()).getTime());
    const outfit = new Types.ObjectId().toHexString();
    const card = new Types.ObjectId().toHexString();
    const inventory: InventoryEntry[] = [
      { uid: outfit, itemId: kit.outfit, day, source: 'migration' },
      { uid: card, itemId: kit.card, day, source: 'migration' },
    ];
    const ambition: AmbitionState = {
      id: MIGRATED_AMBITION,
      chapter: 1,
      step: 'choose',
      choiceId: null,
      flags: [],
      history: [],
    };
    ops.push({
      updateOne: {
        filter: { _id: c._id, ambition: { $exists: false } },
        update: {
          $set: {
            avatarId: null,
            origin: {
              answers: content.origin.reference.map((r) => ({
                questionId: r.questionId,
                answerId: r.answerId,
              })),
              arrivedAt: c.createdAt ?? new Date(),
              migrated: true,
            },
            'stats.chaBase': 0,
            inventory,
            equipment: { clothing: outfit, document: card },
            ambition,
          },
        },
        timestamps: false,
      },
    });
    if (ops.length >= 500) await flush();
  }
  await flush();
  return { jobsRenamed, migrated };
}
