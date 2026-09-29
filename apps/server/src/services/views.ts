import type { GameContent } from '@irongate/content';
import type { CharacterDoc, StoredOrders } from '@irongate/db';
import {
  DIRECTIVES,
  JOBS,
  currentTally,
  dayKey,
  dayStart,
  isPaperDue,
  itemSpec,
  jobPay,
  projectEnergy,
  rankBounds,
  standingView,
  weekKey,
} from '@irongate/rules';
import type {
  AssetView,
  CharacterView,
  DayKey,
  EnergyState,
  JobView,
  NamedStandingView,
  OrdersState,
  OrdersView,
  Stats,
} from '@irongate/rules';

/** Stats as a check sees them: CHA is worn (until slice 2, chaBase stands in for it). */
export function wornStats(doc: Pick<CharacterDoc, 'stats'>): Stats {
  return { str: doc.stats.str, int: doc.stats.int, agi: doc.stats.agi, cha: doc.stats.chaBase };
}

export function energyState(doc: Pick<CharacterDoc, 'energy' | 'rested'>): EnergyState {
  return { value: doc.energy.value, rested: doc.rested, updatedAt: doc.energy.updatedAt.getTime() };
}

export function assetView(content: GameContent, id: string): AssetView {
  const a = content.asset(id);
  return { id: a.id, width: a.width, height: a.height, widths: [...a.widths], alt: a.alt };
}

export function toOrdersState(o: StoredOrders): OrdersState {
  return {
    day: o.day,
    items: o.items.map((i) => ({
      templateId: i.templateId,
      variant: i.variant,
      target: i.target,
      progress: i.progress,
      doneAt: i.doneAt ? new Date(i.doneAt).getTime() : null,
    })),
    allDoneAt: o.allDoneAt ? new Date(o.allDoneAt).getTime() : null,
  };
}

export function fromOrdersState(o: OrdersState): StoredOrders {
  return {
    day: o.day,
    items: o.items.map((i) => ({ ...i, doneAt: i.doneAt === null ? null : new Date(i.doneAt) })),
    allDoneAt: o.allDoneAt === null ? null : new Date(o.allDoneAt),
  };
}

export function standingSuccesses(doc: Pick<CharacterDoc, 'localStanding'>, cityId: string): number {
  return doc.localStanding.find((s) => s.cityId === cityId)?.successes ?? 0;
}

export function namedStanding(content: GameContent, cityId: string, successes: number): NamedStandingView {
  const v = standingView(successes);
  const names = content.standingNames;
  return {
    ...v,
    cityId,
    cityName: content.city(cityId)?.name ?? cityId,
    name: names[v.level] ?? '',
    nextName: v.next === null ? null : (names[v.level + 1] ?? null),
  };
}

export function rankTitle(content: GameContent, doc: Pick<CharacterDoc, 'factionId'>, rank: number): string {
  const titles = content.faction(doc.factionId).rankTitles;
  return titles[Math.min(Math.max(rank, 1), titles.length) - 1]!;
}

export function jobView(content: GameContent, doc: CharacterDoc, today: DayKey): JobView | null {
  if (!doc.job) return null;
  const job = content.job(doc.job.id);
  if (!job) return null;
  const worked = doc.job.lastShiftDay === today;
  return {
    id: job.id,
    name: job.name,
    locationId: job.locationId,
    locationName: content.location(job.locationId)?.location.name ?? job.locationId,
    dailyPay: jobPay(job, doc.factionId),
    shiftEnergy: job.shiftEnergy,
    streak: doc.job.streak,
    shiftWorkedToday: worked,
    nextShiftAt: worked ? dayStart(today + 1) : null,
  };
}

export function sickDaysLeft(doc: CharacterDoc, today: DayKey): number {
  return doc.sickDays.week === weekKey(today) ? doc.sickDays.left : JOBS.sickDaysPerWeek;
}

export function ordersView(content: GameContent, doc: CharacterDoc, today: DayKey): OrdersView {
  const faction = content.faction(doc.factionId);
  const npc = faction.secretary ? content.npc(faction.secretary.npcId) : undefined;
  const templates = content.ordersOf(doc.factionId);
  const state = toOrdersState(doc.orders);
  const items = state.day === today ? state.items : [];
  return {
    day: today,
    resetsAt: dayStart(today + 1),
    issuer:
      npc && faction.secretary
        ? {
            name: npc.name,
            title: npc.title,
            signature: faction.secretary.signature,
            portrait: assetView(content, npc.portrait),
          }
        : null,
    items: items.flatMap((item) => {
      const t = templates.find((x) => x.id === item.templateId);
      if (!t) return [];
      const spec = itemSpec(item, t);
      return [
        {
          id: item.templateId,
          title: spec.title,
          line: spec.line,
          progress: Math.min(item.progress, item.target),
          target: item.target,
          done: item.doneAt !== null,
        },
      ];
    }),
    allDone: state.day === today && state.allDoneAt !== null,
    rewards: {
      matchFxpBonusPct: Math.round(DIRECTIVES.matchFxpBonus * 100),
      orderDoneFxp: DIRECTIVES.orderDoneFxp,
      allDonePc: DIRECTIVES.allDonePc,
    },
  };
}

/** The HUD view: lazy Energy and Rested projected to `now`, plus everything slice 1 shows. */
export function toCharacterView(
  doc: CharacterDoc,
  now: number,
  content: GameContent,
  editionReadAt: number | null,
): CharacterView {
  const today = dayKey(now);
  const energy = projectEnergy(energyState(doc), now);
  const bounds = rankBounds(doc.rank);
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    factionId: doc.factionId,
    factionName: content.faction(doc.factionId).shortName,
    homeCityId: doc.homeCityId,
    cityId: doc.cityId,
    stats: wornStats(doc),
    energy: {
      value: energy.value,
      max: energy.max,
      updatedAt: energy.updatedAt,
      nextTickAt: energy.nextTickAt,
      fullAt: energy.fullAt,
    },
    rested: energy.rested,
    xp: doc.xp,
    level: doc.level,
    fxp: doc.fxp,
    iron: doc.iron,
    version: doc.version,
    serverNow: now,
    day: { key: today, endsAt: dayStart(today + 1) },
    rank: {
      value: doc.rank,
      title: rankTitle(content, doc, doc.rank),
      fxpFloor: bounds.floor,
      fxpNext: bounds.next,
    },
    pc: doc.pc,
    statPointsPending: doc.statPointsPending,
    job: jobView(content, doc, today),
    sickDaysLeft: sickDaysLeft(doc, today),
    standing: namedStanding(content, doc.cityId, standingSuccesses(doc, doc.cityId)),
    today: currentTally(doc.today, today),
    orders: ordersView(content, doc, today),
    paperDue: isPaperDue({
      editionReadAt,
      lastActionAt: doc.lastActionAt ? doc.lastActionAt.getTime() : null,
      now,
    }),
  };
}
