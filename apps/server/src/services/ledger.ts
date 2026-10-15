import type { GameContent } from '@irongate/content';
import { Contribution, InfluenceLedger, contributionId } from '@irongate/db';
import type { LedgerKind } from '@irongate/db';
import { councilDay, electionKey, factionScopes, levelBracket } from '@irongate/rules';
import type { DayKey, FactionId } from '@irongate/rules';
import type { ClientSession, Types } from 'mongoose';

/**
 * The influence ledger's writes (ADR 0028, tech design §5.3–§5.4): a row per opinion change in the
 * transaction that changes opinion, and the per-character totals upserted alongside. Amounts are
 * integer thousandths of a point (influence) or integer momentum (points).
 */

/** Points → integer thousandths. */
export const toThousandths = (points: number): number => Math.round(points * 1_000);

/** The place's election key for the cycle of `day` ("irongate.eastside:4146", "coalport:4145"). */
export function cycleKeyOf(content: GameContent, cityId: string, placeId: string, day: DayKey): string {
  const offset = content.city(cityId)?.council?.offset ?? 0;
  return electionKey(placeId, councilDay(day, offset).cycle);
}

export interface LedgerRowInput {
  cityId: string;
  placeId: string;
  factionId: FactionId;
  /** Points as applied after the floors; signed (the drift). */
  swing: number;
  kind: LedgerKind;
  characterId?: Types.ObjectId | null;
  ref: string;
  day: DayKey;
  at: Date;
}

/** Append ledger rows (zero swings are skipped). */
export async function writeLedger(
  content: GameContent,
  rows: readonly LedgerRowInput[],
  session: ClientSession,
): Promise<void> {
  const docs = rows
    .filter((r) => toThousandths(r.swing) !== 0)
    .map((r) => ({
      cityId: r.cityId,
      placeId: r.placeId,
      factionId: r.factionId,
      swing: toThousandths(r.swing),
      kind: r.kind,
      source: r.characterId ? { kind: 'character', characterId: r.characterId } : { kind: 'system' },
      ref: r.ref,
      day: r.day,
      cycleKey: cycleKeyOf(content, r.cityId, r.placeId, r.day),
      at: r.at,
    }));
  if (docs.length > 0) await InfluenceLedger.insertMany(docs, { session });
}

export interface Contributor {
  _id: Types.ObjectId;
  name: string;
  factionId: FactionId;
  level: number;
}

/**
 * The influence total of a character in a place this election (action, journey and event rows), and
 * slice 6's four faction scopes (ADR 0042): this week and all time, in the city and in all cities,
 * with `events` counting the Campaign Events the member took part in (`event: true`). Every path that
 * credits a member's opinion comes through here, so the scoreboard never folds the ledger.
 */
export async function addInfluence(
  content: GameContent,
  session: ClientSession,
  i: { c: Contributor; cityId: string; placeId: string; points: number; day: DayKey; at: Date; event?: boolean },
): Promise<void> {
  const amount = toThousandths(i.points);
  if (amount > 0) {
    const ref = cycleKeyOf(content, i.cityId, i.placeId, i.day);
    await upsertContribution(session, {
      scope: `influence|${ref}`,
      kind: 'influence',
      cityId: i.cityId,
      placeId: i.placeId,
      ref,
      c: i.c,
      amount,
      at: i.at,
    });
  }
  if (amount <= 0 && !i.event) return;
  const scopes = factionScopes(i.c.factionId, i.cityId, i.day);
  const periods = ['week', 'week', 'all', 'all'] as const;
  const cities = [i.cityId, 'all', i.cityId, 'all'];
  for (let k = 0; k < 4; k++) {
    await Contribution.updateOne(
      { _id: contributionId(scopes[k]!, i.c._id) },
      {
        $inc: { amount: Math.max(0, amount), events: i.event ? 1 : 0 },
        $set: { level: i.c.level, bracket: levelBracket(i.c.level), lastAt: i.at, name: i.c.name },
        $setOnInsert: {
          scope: scopes[k]!,
          kind: 'faction',
          cityId: cities[k]!,
          placeId: cities[k]!,
          ref: scopes[k]!,
          characterId: i.c._id,
          factionId: i.c.factionId,
          period: periods[k]!,
        },
      },
      { session, upsert: true },
    );
  }
}

/** The points total of a character on an Issue document. */
export async function addPoints(
  session: ClientSession,
  i: { c: Contributor; cityId: string; placeId: string; docId: string; points: number; at: Date },
): Promise<void> {
  if (i.points <= 0) return;
  await upsertContribution(session, {
    scope: `points|${i.docId}`,
    kind: 'points',
    cityId: i.cityId,
    placeId: i.placeId,
    ref: i.docId,
    c: i.c,
    amount: i.points,
    at: i.at,
  });
}

async function upsertContribution(
  session: ClientSession,
  i: {
    scope: string;
    kind: 'influence' | 'points';
    cityId: string;
    placeId: string;
    ref: string;
    c: Contributor;
    amount: number;
    at: Date;
  },
): Promise<void> {
  await Contribution.updateOne(
    { _id: contributionId(i.scope, i.c._id) },
    {
      $inc: { amount: i.amount },
      $set: { level: i.c.level, lastAt: i.at, name: i.c.name },
      $setOnInsert: {
        scope: i.scope,
        kind: i.kind,
        cityId: i.cityId,
        placeId: i.placeId,
        ref: i.ref,
        characterId: i.c._id,
        factionId: i.c.factionId,
      },
    },
    { session, upsert: true },
  );
}
