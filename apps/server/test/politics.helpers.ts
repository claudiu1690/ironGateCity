import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Character } from '@irongate/db';
import { councilDay, dayKey, dayStart, rankForFxp } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { callerFor, newUser, seedRecruit } from './helpers';

/** Slice-3 test helpers: players at a rank and a standing, and the day's orders done through the API. */

export const at = (day: number, hour = 9) => dayStart(day) + hour * 3_600_000;

/** The first day on or after `from` with `cycleDay` in `cityId`'s calendar. */
export function nextCycleDay(cityId: string, cycleDay: number, from: number): number {
  const offset = getContent().city(cityId)!.council!.offset;
  for (let d = from; ; d++) if (councilDay(d, offset).cycleDay === cycleDay) return d;
}

export interface Player {
  user: ReturnType<typeof newUser>;
  caller: ReturnType<typeof callerFor>;
  id: string;
  factionId: FactionId;
}

/**
 * A reference recruit lifted to a rank (by FXP), a Local Standing in its home city and a PC purse;
 * `active` sets lastActionAt so the member counts for the small-branch rule and turnout.
 */
export async function player(
  clock: { now: () => number },
  opts: {
    name?: string;
    factionId?: FactionId;
    fxp?: number;
    successes?: number;
    pc?: number;
    active?: boolean;
    avatarId?: string | null;
  } = {},
): Promise<Player> {
  const user = newUser(opts.name ?? 'Mara Lenk');
  const factionId = opts.factionId ?? 'collective';
  await seedRecruit(user, clock.now(), {
    factionId,
    fxp: opts.fxp ?? 0,
    ...(opts.avatarId !== undefined ? { avatarId: opts.avatarId } : {}),
  });
  const home = getContent().faction(factionId).homeCityId;
  await Character.updateOne(
    { userId: user.id },
    {
      $set: {
        rank: rankForFxp(opts.fxp ?? 0),
        pc: opts.pc ?? 0,
        localStanding: opts.successes ? [{ cityId: home, successes: opts.successes }] : [],
        lastActionAt: opts.active === false ? null : new Date(clock.now()),
      },
    },
  );
  const caller = callerFor(user, clock.now);
  const me = await caller.character.me();
  // Review 1 (§13.4): One of Us (150 Successes) pays 1 PC at the boundary this first read settles;
  // the purse is set again after it, so a player starts the test with exactly `pc`.
  if (me.pc !== (opts.pc ?? 0)) await Character.updateOne({ _id: me.id }, { $set: { pc: opts.pc ?? 0 } });
  return { user, caller, id: me.id, factionId };
}

/** Do the day's three Party orders through the API: the pins say where (slice-2 §7.3). */
export async function doTodaysOrders(caller: ReturnType<typeof callerFor>): Promise<void> {
  for (let guard = 0; guard < 20; guard++) {
    const me = await caller.character.me();
    const open = me.orders.items.find((o) => !o.done);
    if (!open) return;
    if (open.title.startsWith('Take a job')) {
      const job = getContent().jobsAt(open.pin!.locationId)[0]!;
      await caller.job.take({ jobId: job.id, idempotencyKey: randomUUID() });
      continue;
    }
    // A test convenience: a full bar before each tap, so a long "A full day" order finishes.
    if (me.energy.value < 40) {
      await Character.updateOne(
        { _id: me.id },
        { $set: { 'energy.value': 100, 'energy.updatedAt': new Date(me.serverNow) } },
      );
    }
    const city = await caller.city.get({ cityId: me.cityId });
    const loc = city.locations.find((l) => l.id === open.pin?.locationId)!;
    const action = loc.actions.find((a) => a.order?.id === open.id)!;
    await caller.action.perform({
      actionId: action.id,
      locationId: loc.id,
      idempotencyKey: randomUUID(),
      times: 1,
    });
  }
  throw new Error('orders did not complete');
}

export const key = () => randomUUID();

/** The day key of a clock. */
export const today = (clock: { now: () => number }) => dayKey(clock.now());
