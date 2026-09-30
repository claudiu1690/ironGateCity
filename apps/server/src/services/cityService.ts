import { isCheckedAction } from '@irongate/content';
import type { GameContent } from '@irongate/content';
import { City } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  actionEnergy,
  computeCheck,
  dayKey,
  findAdvancingItem,
  isNight,
  itemSpec,
  jobLocks,
  jobPay,
  moraleState,
  ordinanceCheckBonuses,
  ordinanceTags,
  orderMatches,
  standingBonus,
  standingView,
  tier1Difficulty,
  trainingCost,
  trainingEnergy,
} from '@irongate/rules';
import type { ActionDescriptor, ActionView, CityView, OrdersState } from '@irongate/rules';
import { gameError } from '../gameError';
import { modifiersFor, ordinanceIdOn } from './modifiers';
import { politicsSummary } from './politicsService';
import {
  assetView,
  firstDayBonuses,
  namedStanding,
  preferredStat,
  standingSuccesses,
  toOrdersState,
  wornStats,
} from './views';

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

/**
 * Content city + live state + this character's odds, costs, orders and jobs (ADR 0003). Slice 3:
 * live costs, the Open Doors bonus and the ticket tags under the ordinance in force (ADR 0021), the
 * plate's morale and ordinance lines, and the HQ's council card.
 */
export async function getCityView(
  content: GameContent,
  cityId: string,
  c: CharacterDoc,
  now: number,
  loaded?: CityDoc | null,
): Promise<CityView> {
  const city = content.city(cityId);
  if (!city) throw gameError('NOT_FOUND', 'UNKNOWN_CITY', { cityId });

  const state =
    loaded !== undefined && loaded?._id === city.id ? loaded : await City.findById(city.id).lean<CityDoc>();
  const values = wornStats(c, content);
  const difficulty = tier1Difficulty(city.role);
  const today = dayKey(now);
  const successes = standingSuccesses(c, city.id);
  const standing = namedStanding(content, city.id, successes);
  const bonus = standingBonus(successes, `${standing.name} in ${city.name}`);
  const orders = toOrdersState(c.orders);
  const liveOrders: OrdersState = orders.day === today ? orders : { day: today, items: [], allDoneAt: null };
  // Review 1 (§8.4): the First day row at home on the welcome day; a best-stat tie-break.
  const firstDay = firstDayBonuses(content, c, city.id, today);
  const prefer = preferredStat(content, c.factionId);
  const m = modifiersFor(content, state, c.factionId, today);
  const hq = city.homeFactionId === c.factionId ? content.hqOf(c.factionId).location.id : null;
  const council =
    hq && city.id === c.homeCityId ? await politicsSummary(content, c, state, now, today) : null;
  const opinion = state?.opinion ?? city.baselineOpinion;
  const ordId = ordinanceIdOn(state, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  const inForceTo = state?.ordinance?.id === ordId ? state?.ordinance?.toDay : undefined;

  return {
    id: city.id,
    name: city.name,
    role: city.role,
    ...(city.homeFactionId ? { homeFactionId: city.homeFactionId } : {}),
    opinion,
    morale: city.homeFactionId
      ? {
          factionId: city.homeFactionId,
          share: opinion[city.homeFactionId],
          state: moraleState(opinion[city.homeFactionId]),
        }
      : null,
    ordinance:
      ord && inForceTo !== undefined
        ? {
            ordinanceId: ord.id,
            name: ord.name,
            line: ord.line,
            effectLine: ord.effectLine,
            daysLeft: inForceTo - today,
          }
        : null,
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
          kind: isCheckedAction(action) ? 'checked' : 'training',
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
          const cost = actionEnergy(action.energy, action.type, m);
          return {
            ...base,
            kind: 'checked',
            givesFxp: action.givesFxp,
            energy: cost,
            energy3: cost * 3,
            preview: computeCheck({
              stats: action.stats,
              values,
              difficulty,
              bonuses: [...firstDay, ...(bonus ? [bonus] : []), ...ordinanceCheckBonuses(action.type, m)],
              prefer,
            }),
            locked,
            tags: ordinanceTags({
              kind: 'checked',
              type: action.type,
              base: action.energy,
              givesFxp: action.givesFxp,
              m,
            }),
          };
        }
        const from = c.stats[action.trains];
        return {
          ...base,
          kind: 'training',
          givesFxp: false,
          energy: trainingEnergy(trainingCost(from), m),
          tags: ordinanceTags({ kind: 'training', type: action.type, base: trainingCost(from), m }),
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
          held,
          locked: unmet[0] ?? null,
          unmet,
          isSwitch: !!c.job && !held,
        };
      }),
      council: location.id === hq ? council : null,
    })),
  };
}
