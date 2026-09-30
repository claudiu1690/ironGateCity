import type { GameContent } from '@irongate/content';
import { Character, City } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  addToTally,
  advanceOrders,
  applyGains,
  dayKey,
  dayStart,
  jobLock,
  orderRewards,
} from '@irongate/rules';
import type { CharacterView, JobView } from '@irongate/rules';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { branchEndorseIfFiled } from './councilService';
import { ensureSettled, loadCharacter } from './dayService';
import { withRequestKey } from './requestKey';
import { DayChanged, VersionConflict } from './txn';
import { fromOrdersState, jobView, toCharacterView, toOrdersState, wornStats } from './views';

export interface TakeJobResult {
  character: CharacterView;
  job: JobView;
  /** For the one line on the Jobs card (content §12.1). */
  outcome: { switched: boolean; orderCompleted: boolean; fxp: number; firstPayAt: number };
  /** Slice 3: taking the job completed the third order and the branch endorsed the candidacy. */
  branchEndorsement: { endorsements: number; needed: number; smallBranch: boolean } | null;
}

/**
 * §9.1 (review 1: a job is a wage), tech design §7.5: take a job or switch at the job's location,
 * free, one tap; a switch resets seniority to 0. Requirements are checked on taking only. Taking a
 * job completes a "Take a job" order at once. Nothing about a job costs Energy or touches Rested.
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
      const lock = jobLock(job.unlock, { level: c.level, stats: wornStats(c, content) });
      if (lock) throw new GameError('JOB_LOCKED', { ...lock });

      const switching = c.job !== null;
      const cityState = await City.findById(c.homeCityId).session(session).lean<CityDoc>();

      const adv = advanceOrders(
        toOrdersState(c.orders),
        content.ordersOf(c.factionId),
        { kind: 'takeJob' },
        'success',
        c.homeCityId,
        now,
      );
      const completedT = adv.completed
        ? content.ordersOf(c.factionId).filter((t) => t.id === adv.completed!.templateId)
        : [];
      const pay = orderRewards(completedT, adv.allDone);
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
        fxp: pay.fxp,
        pc: pay.pc,
        ordersDone: adv.completed ? 1 : 0,
      });
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today },
        {
          $set: {
            job: { id: job.id, since: today, seniority: 0 },
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
      const branchEndorsement = adv.allDone
        ? await branchEndorseIfFiled(content, session, updated, today, now)
        : null;
      return {
        branchEndorsement,
        character: toCharacterView(updated, now, content, loaded.editionReadAt, { city: cityState }),
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
