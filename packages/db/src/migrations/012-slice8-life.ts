import { LEGACY, defaultOutfits } from '@irongate/rules';
import type { Equipment, FactionId, InventoryEntry, LegacyKind } from '@irongate/rules';
import type { Content } from '@irongate/content';
import type { Types } from 'mongoose';
import { Character } from '../models/character';
import { LegacyEntry } from '../models/legacy';
import { Award } from '../models/ledger';
import { Candidacy, OfficeTerm, Vote } from '../models/politics';
import type { StepCounts } from './008-review4';

/**
 * Migration 012 (docs/tech/slice-8.md §5.7, §24.4): slice 8's data. Run by `ensureIndexes` after 011;
 * the two new collections (`dossierEntries`, `legacyEntries`) and their indexes come first through
 * `syncIndexes`. Idempotent: each step filters on the field's absence, so a second run modifies
 * nothing. Step 4 (the season on `nation`) is deferred with the season (16 Oct 2026).
 */

const OFFICE_POINTS: Record<string, LegacyKind> = {
  council: 'councilTerm',
  governor: 'governorTerm',
  chair: 'chairTerm',
  deputy: 'deputyTerm',
  president: 'presidentTerm',
};

const AWARD_POINTS: Record<string, LegacyKind> = { hero: 'hero', issue: 'issueTopFive', unrest: 'unrest' };

interface MigratingCharacter {
  _id: Types.ObjectId;
  factionId: FactionId;
  inventory?: InventoryEntry[];
  equipment?: Partial<Equipment>;
}

/**
 * Step 1: the Wardrobe's sets (Town is what is worn; Plain clothes the kit's outfit and the party
 * card, ADR 0051), the four slots, and every slice-8 field at its default (§24.4's bodyguard and buffs
 * included). One update per character, filtered on `outfits` being absent.
 */
export async function addLifeCharacterFields(content: Pick<Content, 'factions'>): Promise<StepCounts> {
  const kits = new Map(content.factions.map((f) => [f.id, f.kit]));
  const cursor = Character.find({ outfits: { $exists: false } }, { factionId: 1, inventory: 1, equipment: 1 })
    .lean<MigratingCharacter[]>()
    .cursor();
  let matched = 0;
  let modified = 0;
  for await (const c of cursor) {
    matched += 1;
    const kit = kits.get(c.factionId) ?? { outfit: '', card: '' };
    const worn: Equipment = {
      clothing: c.equipment?.clothing ?? null,
      accessory: c.equipment?.accessory ?? null,
      document: c.equipment?.document ?? null,
      utility: c.equipment?.utility ?? null,
    };
    const outfits = defaultOutfits(c.inventory ?? [], worn, kit);
    const r = await Character.updateOne(
      { _id: c._id, outfits: { $exists: false } },
      {
        $set: {
          equipment: worn,
          outfits,
          lastOutfit: 'town',
          patrons: [],
          home: { flat: null },
          expose: null,
          dossierBurns: [],
          dossierLastAt: null,
          dossierSeenAt: null,
          'today.calls': [],
          'today.gifts': [],
          'today.expose': false,
          'today.bribe': false,
          // Tech design §24.4: bodyguards and the bar.
          bodyguard: null,
          buffs: { wellFed: null, spirits: { left: 0 } },
          'today.rounds': 0,
        },
      },
      { timestamps: false },
    );
    modified += r.modifiedCount;
  }
  return { matched, modified };
}

/**
 * Step 2 (tech design §5.7): the milestones from history: the first Chair and national votes, the
 * first list candidacy, completed terms by office and the first deputy term's day. Characters without
 * `milestones` only.
 */
export async function addMilestones(): Promise<StepCounts> {
  const ids = await Character.find({ milestones: { $exists: false } }, { _id: 1 }).lean<
    Array<{ _id: Types.ObjectId }>
  >();
  let modified = 0;
  for (const { _id } of ids) {
    const firstVote = async (prefix: string) =>
      (
        await Vote.findOne({ voterId: _id, electionId: { $regex: `^${prefix}:` } })
          .sort({ createdAt: 1 })
          .lean<{ createdAt: Date }>()
      )?.createdAt ?? null;
    const list = await Candidacy.findOne({ characterId: _id, kind: 'list' })
      .sort({ filedAt: 1 })
      .lean<{ filedAt: Date }>();
    const terms = await OfficeTerm.find({ 'holder.characterId': _id }).lean<
      Array<{ office?: string; completed: boolean; fromDay: number }>
    >();
    const completed = { council: 0, governor: 0, chair: 0, deputy: 0, president: 0 };
    let deputyFromDay: number | null = null;
    for (const t of terms) {
      const office = (t.office ?? 'council') as keyof typeof completed;
      if (t.completed && office in completed) completed[office] += 1;
      if (office === 'deputy')
        deputyFromDay = deputyFromDay === null ? t.fromDay : Math.min(deputyFromDay, t.fromDay);
    }
    const r = await Character.updateOne(
      { _id, milestones: { $exists: false } },
      {
        $set: {
          milestones: {
            caseFileAt: null,
            chairVoteAt: await firstVote('chair'),
            nationalVoteAt: await firstVote('nation'),
            listAt: list?.filedAt ?? null,
            deputyFromDay,
            completed,
          },
        },
      },
      { timestamps: false },
    );
    modified += r.modifiedCount;
  }
  return { matched: ids.length, modified };
}

/**
 * Step 3 (§22.1 Q41, ADR 0057): the Legacy backfill. For each character without `legacy`: a row per
 * completed term (council 3, Governor 5, Chair 10, deputy 5, President 40; `term:{id}`) and per award
 * (a Hero 2, an Issue's top five 2, review 5's Unrest prize 2 under its own ref; else `award:{id}`),
 * with their days; then `legacy.total` = the sum of the character's rows. The unique `{ characterId,
 * ref }` makes a second run insert nothing, and the `legacy` filter makes it set nothing.
 */
export async function backfillLegacy(): Promise<StepCounts & { rows: number }> {
  const ids = await Character.find({ legacy: { $exists: false } }, { _id: 1 }).lean<
    Array<{ _id: Types.ObjectId }>
  >();
  let modified = 0;
  let rows = 0;
  for (const { _id } of ids) {
    const terms = await OfficeTerm.find({ 'holder.characterId': _id, completed: true }).lean<
      Array<{ _id: Types.ObjectId; office?: string; toDay: number; cityId: string }>
    >();
    const awards = await Award.find({ characterId: _id }).lean<
      Array<{ _id: Types.ObjectId; kind: string; ref: string; day: number; cityId: string }>
    >();
    const docs = [
      ...terms.map((t) => {
        const kind = OFFICE_POINTS[t.office ?? 'council'] ?? 'councilTerm';
        return {
          characterId: _id,
          ref: `term:${String(t._id)}`,
          kind,
          points: LEGACY.points[kind],
          day: t.toDay,
          params: {
            office: t.office ?? 'council',
            ...(t.cityId && t.cityId !== 'nation' ? { cityId: t.cityId } : {}),
          },
        };
      }),
      ...awards.flatMap((a) => {
        const kind = AWARD_POINTS[a.kind];
        if (!kind) return [];
        const ref = a.kind === 'unrest' ? a.ref : `award:${String(a._id)}`;
        return [
          {
            characterId: _id,
            ref,
            kind,
            points: LEGACY.points[kind],
            day: a.day,
            params: { award: a.kind, cityId: a.cityId },
          },
        ];
      }),
    ];
    for (const d of docs) {
      const r = await LegacyEntry.updateOne(
        { characterId: d.characterId, ref: d.ref },
        { $setOnInsert: d },
        { upsert: true },
      );
      rows += r.upsertedCount;
    }
    const all = await LegacyEntry.find({ characterId: _id }, { points: 1 }).lean<Array<{ points: number }>>();
    const total = all.reduce((s, x) => s + x.points, 0);
    const r = await Character.updateOne(
      { _id, legacy: { $exists: false } },
      {
        $set: {
          legacy: {
            total,
            spent: 0,
            perks: { party: 0, dossier: 0, sleep: 0, walk: 0, name: 0, monday: 0, friends: 0, quiet: 0 },
          },
        },
      },
      { timestamps: false },
    );
    modified += r.modifiedCount;
  }
  return { matched: ids.length, modified, rows };
}

/** Migration 012, in order; `ensureIndexes` calls it after 011 and the start-up log prints the counts. */
export async function migrateSlice8Life(content: Pick<Content, 'factions'>): Promise<{
  characters: StepCounts;
  milestones: StepCounts;
  legacy: StepCounts & { rows: number };
}> {
  const characters = await addLifeCharacterFields(content);
  const milestones = await addMilestones();
  const legacy = await backfillLegacy();
  return { characters, milestones, legacy };
}
