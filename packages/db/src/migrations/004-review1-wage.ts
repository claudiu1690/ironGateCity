import { Character } from '../models/character';
import { City } from '../models/city';
import { OrderPaper } from '../models/politics';

/** The slot-C shift orders review 1 removed (GDD §9.1, §13.7). */
export const RETIRED_ORDER_TEMPLATES = ['dir.work-shift', 'dir.v.work-shift', 'dir.a.work-shift'] as const;
/** Review 1: the Shift Hours Order is the Long Service Order. */
export const RENAMED_ORDINANCES: Readonly<Record<string, string>> = { 'ord.shift-hours': 'ord.long-service' };

/**
 * Review 1 (30 Sep 2026; GDD §9.1): a job is a wage. Idempotent, each step touching only documents
 * still in the old shape:
 * - a held job gets `seniority: 0` and loses its work streak (the answers are silent on converting
 *   the streak, so seniority starts at 0; it reaches the +20 % cap in ten days, five under Long
 *   Service) and its `lastShiftDay`;
 * - the weekly sick days and the tally's `shiftWorked` are removed;
 * - today's retired *Work your shift* / *Take a job* order items are dropped (their templates are
 *   gone, so they could never complete);
 * - the Shift Hours Order is renamed to the Long Service Order in the cities (in force and history)
 *   and on the order papers (items, votes, divisions).
 * Returns the number of documents changed.
 *
 * Not called from `ensureIndexes` yet: running it at start-up rewrites every existing database the
 * server connects to, so wiring it in is left to the user. The server reads a job stored without
 * `seniority` as seniority 0 and ignores the retired fields, so it works before and after this runs.
 */
export async function migrateReview1Wage(): Promise<number> {
  let changed = 0;
  const jobs = await Character.updateMany(
    { job: { $ne: null }, 'job.seniority': { $exists: false } },
    { $set: { 'job.seniority': 0 }, $unset: { 'job.streak': '', 'job.lastShiftDay': '' } },
    { strict: false, timestamps: false },
  );
  changed += jobs.modifiedCount;
  const fields = await Character.updateMany(
    { $or: [{ sickDays: { $exists: true } }, { 'today.shiftWorked': { $exists: true } }] },
    { $unset: { sickDays: '', 'today.shiftWorked': '' } },
    { strict: false, timestamps: false },
  );
  changed += fields.modifiedCount;
  const orders = await Character.updateMany(
    { 'orders.items.templateId': { $in: RETIRED_ORDER_TEMPLATES } },
    { $pull: { 'orders.items': { templateId: { $in: RETIRED_ORDER_TEMPLATES } } } },
    { strict: false, timestamps: false },
  );
  changed += orders.modifiedCount;

  const rename = (id: unknown) => (typeof id === 'string' ? (RENAMED_ORDINANCES[id] ?? id) : id);
  const old = Object.keys(RENAMED_ORDINANCES);
  const cities = await City.find(
    { $or: [{ 'ordinance.id': { $in: old } }, { 'ordinanceHistory.id': { $in: old } }] },
    { ordinance: 1, ordinanceHistory: 1 },
  ).lean();
  for (const c of cities) {
    await City.updateOne(
      { _id: c._id },
      {
        $set: {
          ordinance: c.ordinance ? { ...c.ordinance, id: rename(c.ordinance.id) } : c.ordinance,
          ordinanceHistory: (c.ordinanceHistory ?? []).map((h) => ({ ...h, id: rename(h.id) as string })),
        },
      },
      { strict: false, timestamps: false },
    );
    changed += 1;
  }
  const papers = await OrderPaper.find({
    $or: [
      { 'items.ordinanceId': { $in: old } },
      { 'votes.choice': { $in: old } },
      { 'division.passed': { $in: old } },
      { 'division.npcChoice': { $in: old } },
      { 'division.tallies.choice': { $in: old } },
    ],
  }).lean();
  for (const p of papers) {
    const division = p.division
      ? {
          ...p.division,
          passed: rename(p.division.passed) as string | null,
          npcChoice: rename(p.division.npcChoice) as string | null,
          tallies: p.division.tallies.map((t) => ({ ...t, choice: rename(t.choice) as string })),
        }
      : null;
    await OrderPaper.updateOne(
      { _id: p._id },
      {
        $set: {
          items: p.items.map((i) => ({ ...i, ordinanceId: rename(i.ordinanceId) as string })),
          votes: p.votes.map((v) => ({ ...v, choice: rename(v.choice) as string })),
          division,
        },
      },
      { timestamps: false },
    );
    changed += 1;
  }
  return changed;
}
