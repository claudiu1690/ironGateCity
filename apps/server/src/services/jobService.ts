import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  JOBS,
  addToTally,
  advanceOrders,
  applyGains,
  dayKey,
  dayStart,
  jobLock,
  orderRewards,
  projectEnergy,
  spendEnergy,
} from '@irongate/rules';
import type { CharacterView, JobView } from '@irongate/rules';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { withRequestKey } from './requestKey';
import { DayChanged, VersionConflict } from './txn';
import { energyState, fromOrdersState, jobView, toCharacterView, toOrdersState, wornStats } from './views';

export interface TakeJobResult {
  character: CharacterView;
  job: JobView;
  /** For the one line on the Jobs card (content §12.1). */
  outcome: { switched: boolean; orderCompleted: boolean; fxp: number; firstPayAt: number };
}

/**
 * §9.1, tech design §7.5: take a job (free) or switch (2 Energy without Rested, streak to 0) at the
 * job's location. Requirements are checked on taking only. The last shift day carries over, so a
 * shift already worked today is not repeated. Taking a job completes a "Take a job" order at once.
 */
export async function takeJob(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { jobId: string; idempotencyKey: string };
}): Promise<TakeJobResult> {
  const { content, input } = deps;
  const job = content.job(input.jobId);
  if (!job) throw gameError('NOT_FOUND', 'UNKNOWN_JOB', { jobId: input.jobId });
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const jobCity = content.location(job.locationId)!.city.id;

  return withRequestKey({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'job.take',
    input: { jobId: job.id },
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      if (c.cityId !== jobCity)
        throw new GameError('WRONG_CITY', { cityId: c.cityId, jobCityId: jobCity }, 'BAD_REQUEST');
      if (c.job?.id === job.id) throw new GameError('ALREADY_IN_JOB', { jobId: job.id }, 'BAD_REQUEST');
      const lock = jobLock(job.unlock, { level: c.level, stats: wornStats(c) });
      if (lock) throw new GameError('JOB_LOCKED', { ...lock });

      const switching = c.job !== null;
      const before = projectEnergy(energyState(c), now);
      let energy = { value: before.value, rested: before.rested, updatedAt: before.updatedAt };
      if (switching) {
        const spent = spendEnergy(before, JOBS.switchEnergy, { useRested: JOBS.shiftUsesRested });
        if (!spent.ok) {
          throw new GameError('NOT_ENOUGH_ENERGY', {
            energy: before.value,
            cost: JOBS.switchEnergy,
            times: 1,
            nextTickAt: before.nextTickAt,
          });
        }
        energy = spent.state;
      }

      const adv = advanceOrders(
        toOrdersState(c.orders),
        content.ordersOf(c.factionId),
        { kind: 'takeJob' },
        'success',
        c.homeCityId,
        now,
      );
      const pay = orderRewards(adv.completed ? 1 : 0, adv.allDone);
      const gains = applyGains(
        {
          xp: c.xp,
          level: c.level,
          fxp: c.fxp,
          rank: c.rank,
          pc: c.pc,
          statPointsPending: c.statPointsPending,
        },
        { xp: 0, fxp: pay.fxp, pc: pay.pc },
      );
      const tally = addToTally(c.today, today, {
        energy: switching ? JOBS.switchEnergy : 0,
        fxp: pay.fxp,
        pc: pay.pc,
        ordersDone: adv.completed ? 1 : 0,
      });
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today },
        {
          $set: {
            job: { id: job.id, since: today, streak: 0, lastShiftDay: c.job?.lastShiftDay ?? null },
            'energy.value': energy.value,
            'energy.updatedAt': new Date(energy.updatedAt),
            rested: energy.rested,
            orders: fromOrdersState(adv.orders),
            today: tally,
            fxp: gains.next.fxp,
            rank: gains.next.rank,
            pc: gains.next.pc,
          },
          $inc: { version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      return {
        character: toCharacterView(updated, now, content, loaded.editionReadAt),
        job: jobView(content, updated, today)!,
        outcome: {
          switched: switching,
          orderCompleted: adv.completed !== null,
          fxp: pay.fxp,
          firstPayAt: dayStart(today + 1),
        },
      };
    },
  });
}
