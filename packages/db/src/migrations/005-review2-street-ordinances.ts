import { City } from '../models/city';
import { RuleBallot } from '../models/politics';

/**
 * Review 2 (30 Sep 2026; docs/design/review-2-answers.md §1.10, §5.6; GDD §15.3): the Ward Register
 * and the Ward Fund are the Street Register and the Street Fund, ids included.
 */
export const RENAMED_ORDINANCES_REVIEW2: Readonly<Record<string, string>> = {
  'ord.ward-register': 'ord.street-register',
  'ord.ward-fund': 'ord.street-fund',
};

/**
 * Rewrites the two renamed ordinance ids wherever a stored document holds one: a city's ordinance in
 * force and its history, and an order paper's items, votes and division (the NPC choice, the passed
 * rule and the tallies). Nothing else stores an ordinance id: elections, candidacies, votes and
 * office terms never hold one, and the paper's entries hold the printed name, not the id. Idempotent:
 * only documents still holding an old id are touched, so a second run changes nothing. Returns the
 * number of documents changed.
 *
 * Run from `ensureIndexes` at start-up, after 004. Content also resolves the old ids to the new ones
 * (`RENAMED_ORDINANCE_IDS`), so a document the migration has not reached yet still reads correctly.
 */
export async function migrateReview2StreetOrdinances(): Promise<number> {
  let changed = 0;
  const rename = (id: unknown) => (typeof id === 'string' ? (RENAMED_ORDINANCES_REVIEW2[id] ?? id) : id);
  const old = Object.keys(RENAMED_ORDINANCES_REVIEW2);

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

  // The voting rework: old order papers are raw documents (their fields moved under `legacy` at the
  // conversion), so they are read and written through the driver.
  const papers = await RuleBallot.collection.find<OldPaper>({
    $or: [
      { 'items.ordinanceId': { $in: old } },
      { 'votes.choice': { $in: old } },
      { 'division.passed': { $in: old } },
      { 'division.npcChoice': { $in: old } },
      { 'division.tallies.choice': { $in: old } },
    ],
  }).toArray();
  for (const p of papers) {
    const division = p.division
      ? {
          ...p.division,
          passed: rename(p.division.passed) as string | null,
          npcChoice: rename(p.division.npcChoice) as string | null,
          tallies: p.division.tallies.map((t) => ({ ...t, choice: rename(t.choice) as string })),
        }
      : null;
    await RuleBallot.collection.updateOne(
      { _id: p._id } as Record<string, unknown>,
      {
        $set: {
          items: p.items.map((i) => ({ ...i, ordinanceId: rename(i.ordinanceId) as string })),
          votes: p.votes.map((v) => ({ ...v, choice: rename(v.choice) as string })),
          division,
        },
      },
    );
    changed += 1;
  }
  return changed;
}

/** An order paper as stored before the voting rework (migrations 004 and 005 rename its ids). */
interface OldPaper {
  _id: string;
  items: Array<{ ordinanceId: string }>;
  votes: Array<{ choice: string }>;
  division: {
    passed: string | null;
    npcChoice: string | null;
    tallies: Array<{ choice: string; player: number; npc: number }>;
  } | null;
}
