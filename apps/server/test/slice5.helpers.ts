import { randomUUID } from 'node:crypto';
import { Character } from '@irongate/db';
import type { StoredFlag, StoredHeld, StoredMark, StoredRunIn } from '@irongate/db';
import { RANK_FXP, healthMax } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { Types } from 'mongoose';
import type { Player } from './politics.helpers';
import { traveller } from './slice4.helpers';

/** Slice-5 test helpers: a member at a Level and Rank in a city, and the risk state set directly. */

export { at, content, today } from './slice4.helpers';
export const key = () => randomUUID();

/** A member at `level` (default 6) and Rank (default 1) standing in `cityId` (default the home city). */
export async function member(
  clock: { now: () => number },
  opts: {
    name?: string;
    factionId?: FactionId;
    level?: number;
    rank?: 1 | 2 | 3 | 4;
    cityId?: string;
    iron?: number;
    pc?: number;
    successes?: number;
  } = {},
): Promise<Player> {
  const rank = opts.rank ?? 1;
  return traveller(clock, {
    ...(opts.name ? { name: opts.name } : {}),
    ...(opts.factionId ? { factionId: opts.factionId } : {}),
    level: opts.level ?? 6,
    fxp: rankFloor(rank),
    ...(opts.cityId ? { cityId: opts.cityId } : {}),
    ...(opts.iron !== undefined ? { iron: opts.iron } : {}),
    ...(opts.pc !== undefined ? { pc: opts.pc } : {}),
    ...(opts.successes !== undefined ? { successes: opts.successes } : {}),
  });
}

/** The FXP floor of a Rank (Rank 1: 0). */
export function rankFloor(rank: number): number {
  const floors = RANK_FXP as readonly number[];
  return floors[rank - 1] ?? 0;
}

/** Set the lazy risk state at `now` (the stored fields, as the test hooks will). */
export async function setRisk(
  id: string,
  now: number,
  s: {
    heat?: number;
    health?: number;
    level?: number;
    marks?: Array<Pick<StoredMark, 'day' | 'kind'>>;
    arrests?: number[];
    held?: Omit<StoredHeld, 'stayId'> & { stayId?: Types.ObjectId };
    runIn?: Omit<StoredRunIn, 'encounterId'> & { encounterId?: Types.ObjectId };
    flags?: StoredFlag[];
    barred?: Array<{ cityId: string; until: Date }>;
  },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (s.heat !== undefined) set.heat = { value: s.heat, at: new Date(now) };
  if (s.health !== undefined) {
    const max = healthMax(s.level ?? (await Character.findById(id).lean())!.level);
    set.health = { damage: Math.max(0, max - s.health), at: new Date(now) };
  }
  if (s.marks) {
    set['record.marks'] = s.marks.map((m) => ({ ...m, logId: null }));
    set['record.arrests'] = s.arrests ?? [];
  }
  if (s.held) set.held = { stayId: new Types.ObjectId(), ...s.held };
  if (s.runIn) set.runIn = { encounterId: new Types.ObjectId(), ...s.runIn };
  if (s.flags) set.flags = s.flags;
  if (s.barred) set.barred = s.barred;
  await Character.updateOne({ _id: id }, { $set: set, $inc: { version: 1 } });
}
