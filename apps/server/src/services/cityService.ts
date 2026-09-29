import { isCheckedAction, isShiftAction } from '@irongate/content';
import type { GameContent } from '@irongate/content';
import { City } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  JOBS,
  computeCheck,
  dayKey,
  dayStart,
  findAdvancingItem,
  isNight,
  itemSpec,
  jobLocks,
  jobPay,
  orderMatches,
  standingBonus,
  standingView,
  tier1Difficulty,
  trainingCost,
} from '@irongate/rules';
import type { ActionDescriptor, ActionView, CityView, OrdersState } from '@irongate/rules';
import { gameError } from '../gameError';
import { assetView, namedStanding, standingSuccesses, toOrdersState, wornStats } from './views';

/** The order a tap here would advance (open first), or a done one it matched, for the ticket tag. */
function orderTag(
  content: GameContent,
  c: CharacterDoc,
  orders: OrdersState,
  a: ActionDescriptor,
): ActionView['order'] {
  const templates = content.ordersOf(c.factionId);
  let idx = findAdvancingItem(orders, templates, a, 'success', c.homeCityId);
  if (idx < 0) {
    idx = orders.items.findIndex((item) => {
      const t = templates.find((x) => x.id === item.templateId);
      return t ? item.doneAt !== null && orderMatches(itemSpec(item, t).match, a, c.homeCityId) : false;
    });
  }
  if (idx < 0) return null;
  const item = orders.items[idx]!;
  const t = templates.find((x) => x.id === item.templateId)!;
  return {
    id: item.templateId,
    title: itemSpec(item, t).title,
    progress: Math.min(item.progress, item.target),
    target: item.target,
  };
}

/** Content city + live state + this character's odds, costs, orders and jobs (ADR 0003). */
export async function getCityView(
  content: GameContent,
  cityId: string,
  c: CharacterDoc,
  now: number,
): Promise<CityView> {
  const city = content.city(cityId);
  if (!city) throw gameError('NOT_FOUND', 'UNKNOWN_CITY', { cityId });

  const state = await City.findById(city.id).lean();
  const values = wornStats(c);
  const difficulty = tier1Difficulty(city.role);
  const today = dayKey(now);
  const successes = standingSuccesses(c, city.id);
  const standing = namedStanding(content, city.id, successes);
  const bonus = standingBonus(successes, `${standing.name} in ${city.name}`);
  const orders = toOrdersState(c.orders);
  const liveOrders: OrdersState = orders.day === today ? orders : { day: today, items: [], allDoneAt: null };
  const workedToday = c.job?.lastShiftDay === today;

  return {
    id: city.id,
    name: city.name,
    role: city.role,
    ...(city.homeFactionId ? { homeFactionId: city.homeFactionId } : {}),
    opinion: state?.opinion ?? city.baselineOpinion,
    map: { day: assetView(content, city.map.day), night: assetView(content, city.map.night) },
    isNight: isNight(now),
    standing,
    locations: city.locations.map((location, index) => ({
      id: location.id,
      name: location.name,
      kind: location.kind,
      blurb: location.blurb,
      n: index + 1,
      map: { x: location.map.x, y: location.map.y },
      actions: location.actions.map((action): ActionView => {
        const descriptor: ActionDescriptor = {
          kind: isCheckedAction(action) ? 'checked' : isShiftAction(action) ? 'shift' : 'training',
          actionId: action.id,
          type: action.type,
          locationId: location.id,
          cityId: city.id,
        };
        const base = {
          id: action.id,
          name: action.name,
          type: action.type,
          order: orderTag(content, c, liveOrders, descriptor),
        };
        if (isCheckedAction(action)) {
          let locked: ActionView['locked'] = null;
          if (action.requires?.level !== undefined && c.level < action.requires.level) {
            locked = { reason: 'LEVEL', need: action.requires.level };
          } else if (
            action.requires?.standing !== undefined &&
            standingView(successes).level < action.requires.standing
          ) {
            locked = { reason: 'STANDING', need: action.requires.standing };
          }
          return {
            ...base,
            kind: 'checked',
            givesFxp: action.givesFxp,
            energy: action.energy,
            energy3: action.energy * 3,
            preview: computeCheck({ stats: action.stats, values, difficulty, bonuses: bonus ? [bonus] : [] }),
            locked,
          };
        }
        if (isShiftAction(action)) {
          const job = content.job(action.jobId)!;
          return {
            ...base,
            kind: 'shift',
            givesFxp: false,
            energy: job.shiftEnergy,
            energy3: null,
            preview: null,
            shift: {
              jobId: job.id,
              held: c.job?.id === job.id,
              workedToday,
              nextShiftAt: workedToday ? dayStart(today + 1) : null,
            },
            locked: null,
          };
        }
        const from = c.stats[action.trains];
        return {
          ...base,
          kind: 'training',
          givesFxp: false,
          energy: trainingCost(from),
          energy3: null,
          preview: null,
          trains: { stat: action.trains, from, to: from + 1 },
          locked: null,
        };
      }),
      jobs: content.jobsAt(location.id).map((job) => {
        const unmet = jobLocks(job.unlock, { level: c.level, stats: values });
        const held = c.job?.id === job.id;
        return {
          jobId: job.id,
          name: job.name,
          blurb: job.blurb,
          pay: jobPay(job, c.factionId),
          shiftEnergy: job.shiftEnergy,
          held,
          locked: unmet[0] ?? null,
          unmet,
          switchCost: c.job && !held ? JOBS.switchEnergy : 0,
        };
      }),
    })),
  };
}
