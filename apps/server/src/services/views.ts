import { isCheckedAction, isShiftAction } from '@irongate/content';
import type { GameContent } from '@irongate/content';
import type { CharacterDoc, StoredOrders } from '@irongate/db';
import {
  DIRECTIVES,
  JOBS,
  MONTH_NAMES,
  chapterStatus,
  currentTally,
  dayKey,
  dayStart,
  equippedItems,
  isPaperDue,
  itemSpec,
  jobLocks,
  jobPay,
  orderMatches,
  projectEnergy,
  rankBounds,
  standingView,
  weekKey,
  wornCha,
} from '@irongate/rules';
import type {
  ActionDescriptor,
  AssetView,
  ChapterStatus,
  CharacterView,
  DayKey,
  EnergyState,
  Equipment,
  JobView,
  NamedStandingView,
  OrderItem,
  OrderTemplate,
  OrdersState,
  OrdersView,
  Stats,
} from '@irongate/rules';

const NO_EQUIPMENT: Equipment = { clothing: null, document: null };

/**
 * Stats as a check sees them (ADR 0014): CHA is worn, the origin's CHA base plus what is equipped,
 * computed on read. The only place checks, job locks and views get `cha` from.
 */
export function wornStats(
  doc: Pick<CharacterDoc, 'stats' | 'inventory' | 'equipment'>,
  content: GameContent,
): Stats {
  const equipped = equippedItems(doc.inventory ?? [], doc.equipment ?? NO_EQUIPMENT, (id) =>
    content.itemSpec(id),
  );
  return {
    str: doc.stats.str,
    int: doc.stats.int,
    agi: doc.stats.agi,
    cha: wornCha(doc.stats.chaBase, equipped),
  };
}

/** "29 September": the dateline's form, no year (§3.3). */
export function dayMonth(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

export function energyState(doc: Pick<CharacterDoc, 'energy' | 'rested'>): EnergyState {
  return { value: doc.energy.value, rested: doc.rested, updatedAt: doc.energy.updatedAt.getTime() };
}

export function assetView(content: GameContent, id: string): AssetView {
  const a = content.asset(id);
  return {
    id: a.id,
    format: a.kind === 'vector' ? 'svg' : 'raster',
    width: a.width,
    height: a.height,
    widths: [...a.widths],
    alt: a.alt,
    focus: a.focus ? { ...a.focus } : null,
  };
}

/** An item's picture: its own art, or the holder's faction crest (the party card). */
export function itemArt(
  content: GameContent,
  doc: Pick<CharacterDoc, 'factionId'>,
  itemId: string,
): AssetView {
  const item = content.item(itemId);
  const art = !item || item.art === 'faction-crest' ? content.faction(doc.factionId).crestArt : item.art;
  return assetView(content, art);
}

/** The chapter the character's Ambition is at, and its status (§17.1, ADR 0013). */
export function ambitionStatus(content: GameContent, doc: CharacterDoc, today: DayKey): ChapterStatus {
  if (!doc.ambition) return { kind: 'none' };
  return chapterStatus(
    doc.ambition,
    content.chapterRules(doc.ambition.id, doc.ambition.chapter),
    { rank: doc.rank, level: doc.level },
    today,
  );
}

/**
 * Slice-2 tech design §7.3: the first home-city pin where a tap would advance this order: an action
 * the frozen spec matches, the held job's shift, or, for "Take a job", the first Jobs card with a
 * job the character can take.
 */
export function orderPin(
  content: GameContent,
  doc: CharacterDoc,
  item: OrderItem,
  t: OrderTemplate,
): { locationId: string; n: number } | null {
  const city = content.city(doc.homeCityId);
  if (!city) return null;
  const spec = itemSpec(item, t);
  const values = wornStats(doc, content);
  for (const [i, location] of city.locations.entries()) {
    const pin = { locationId: location.id, n: i + 1 };
    if (spec.match.kinds?.includes('takeJob')) {
      const takeable = content
        .jobsAt(location.id)
        .some(
          (j) => doc.job?.id !== j.id && jobLocks(j.unlock, { level: doc.level, stats: values }).length === 0,
        );
      if (takeable && orderMatches(spec.match, { kind: 'takeJob' }, doc.homeCityId)) return pin;
      continue;
    }
    for (const action of location.actions) {
      if (isShiftAction(action) && doc.job?.id !== action.jobId) continue;
      const descriptor: ActionDescriptor = {
        kind: isCheckedAction(action) ? 'checked' : isShiftAction(action) ? 'shift' : 'training',
        actionId: action.id,
        type: action.type,
        locationId: location.id,
        cityId: city.id,
      };
      if (orderMatches(spec.match, descriptor, doc.homeCityId)) return pin;
    }
  }
  return null;
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
  const npc = content.npc(faction.secretary.npcId)!;
  const templates = content.ordersOf(doc.factionId);
  const state = toOrdersState(doc.orders);
  const items = state.day === today ? state.items : [];
  return {
    day: today,
    resetsAt: dayStart(today + 1),
    issuer: {
      name: npc.name,
      title: npc.title,
      signature: faction.secretary.signature,
      portrait: assetView(content, npc.portrait),
    },
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
          pin: item.doneAt === null ? orderPin(content, doc, item, t) : null,
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
  const faction = content.faction(doc.factionId);
  const inventory = doc.inventory ?? [];
  const equipment = doc.equipment ?? NO_EQUIPMENT;
  const worn = inventory.find((e) => e.uid === equipment.clothing);
  const wornItem = worn ? content.item(worn.itemId) : undefined;
  const card = inventory.find((e) => e.uid === equipment.document);
  const status = ambitionStatus(content, doc, today);
  const ambition = doc.ambition ? content.ambition(doc.ambition.id) : undefined;
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    factionId: doc.factionId,
    factionName: content.faction(doc.factionId).shortName,
    homeCityId: doc.homeCityId,
    cityId: doc.cityId,
    stats: wornStats(doc, content),
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
    avatar: doc.avatarId ? assetView(content, doc.avatarId) : null,
    chaBase: doc.stats.chaBase,
    wearing: wornItem ? { itemId: wornItem.id, name: wornItem.name, cha: wornItem.cha } : null,
    partyCard: card
      ? {
          factionName: faction.name,
          rankTitle: rankTitle(content, doc, doc.rank),
          memberSince: (doc.origin?.arrivedAt ?? doc.createdAt).getTime(),
        }
      : null,
    keepsakes: inventory.flatMap((e) => {
      const item = content.item(e.itemId);
      if (!item?.keepsake || item.slot === 'document') return [];
      return [{ itemId: item.id, name: item.name, art: itemArt(content, doc, item.id) }];
    }),
    ambition: {
      id: doc.ambition?.id ?? '',
      title: ambition?.title ?? '',
      chapter: doc.ambition?.chapter ?? 0,
      status: status.kind,
      readyFrom: status.kind === 'waiting' ? dayStart(status.readyFrom) : null,
    },
    // §20 Q8: the Paper tab's dot while a chapter is ready (not mid-way).
    lettersWaiting: status.kind === 'ready' ? 1 : 0,
  };
}
