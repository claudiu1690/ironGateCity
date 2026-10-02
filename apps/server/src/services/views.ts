import { isCheckedAction } from '@irongate/content';
import type { GameContent } from '@irongate/content';
import type { CharacterDoc, CityDoc, StoredOrders } from '@irongate/db';
import {
  DIRECTIVES,
  ENERGY,
  MONTH_NAMES,
  bestTrainedStat,
  chapterStatus,
  currentTally,
  dayKey,
  dayStart,
  equippedItems,
  isPaperDue,
  itemSpec,
  jobLocks,
  firstDayBonus,
  isWelcomeDay,
  jobPay,
  orderDoneFxp,
  orderMatches,
  projectEnergy,
  rankBounds,
  seniorityPct,
  standingView,
  statUse,
  wornCha,
} from '@irongate/rules';
import { restedCapToday } from './modifiers';
import type {
  ActionDescriptor,
  AssetView,
  ChapterStatus,
  CharacterView,
  CheckBonus,
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
  TileSource,
  TrainableStat,
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

/** Review 1 (§8.4, §13.7): the faction's bonus stat, the tie-break of a best-stat check. */
export function preferredStat(content: GameContent, factionId: CharacterDoc['factionId']): TrainableStat {
  const bonus = content.faction(factionId).startingBonus;
  let best: TrainableStat = 'int';
  let v = -1;
  for (const s of ['str', 'int', 'agi'] as const) {
    if ((bonus[s] ?? 0) > v) {
      best = s;
      v = bonus[s] ?? 0;
    }
  }
  return best;
}

/** When the character arrived (the join): the welcome day is counted from it (review 1). */
export const arrivedAt = (doc: Pick<CharacterDoc, 'origin' | 'createdAt'>): number =>
  (doc.origin?.arrivedAt ?? doc.createdAt).getTime();

/** Review 1 (§8.4): today is the character's welcome day. */
export function welcomeDayOf(doc: Pick<CharacterDoc, 'origin' | 'createdAt'>, today: DayKey): boolean {
  return isWelcomeDay(arrivedAt(doc), today);
}

/** Review 1 (§8.4): the *First day in {city}* row, on checks in the home city on the welcome day. */
export function firstDayBonuses(
  content: GameContent,
  doc: Pick<CharacterDoc, 'origin' | 'createdAt' | 'homeCityId'>,
  cityId: string,
  today: DayKey,
): CheckBonus[] {
  if (cityId !== doc.homeCityId || !welcomeDayOf(doc, today)) return [];
  return [firstDayBonus(content.city(cityId)?.name ?? cityId)];
}

/** Review 1 (§13.7): the welcome set's slot A by the best trained stat, then B and C. */
export function welcomeOrderIds(
  content: GameContent,
  doc: Pick<CharacterDoc, 'factionId' | 'stats'>,
): [string, string, string] {
  const w = content.faction(doc.factionId).welcomeOrders;
  const best = bestTrainedStat(doc.stats, preferredStat(content, doc.factionId));
  return [w.A[best], w.B, w.C];
}

/** A location in running text: its `ref` ("the Mill Gate"), else its name. */
export function locationRef(content: GameContent, locationId: string): string {
  const l = content.location(locationId)?.location;
  return l ? (l.ref ?? l.name) : locationId;
}

/** Review 1 (§7.5): the first landing opens slot A's pin: the location of its first action. */
export function welcomeLanding(
  content: GameContent,
  doc: Pick<CharacterDoc, 'factionId' | 'stats' | 'homeCityId'>,
): { cityId: string; locationId: string } {
  const [a] = welcomeOrderIds(content, doc);
  const t = content.ordersOf(doc.factionId).find((x) => x.id === a);
  const first = t?.match.actionIds?.[0];
  const found = first ? content.action(first) : undefined;
  const city = content.city(content.faction(doc.factionId).homeCityId)!;
  return { cityId: city.id, locationId: found?.location.id ?? city.locations[0]!.id };
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
    ...(a.webpWidths ? { webpWidths: [...a.webpWidths] } : {}),
    alt: a.alt,
    focus: a.focus ? { ...a.focus } : null,
    tiles: tileSource(content, a),
  };
}

/** ADR 0024: a map's pyramid from the tiles manifest (every catalogue map has one, checked at load). */
function tileSource(content: GameContent, a: { id: string; kind: string }): TileSource | null {
  if (a.kind !== 'map') return null;
  const t = content.tiles(a.id);
  if (!t) return null;
  return {
    path: `${a.id}/${t.rev}`,
    width: t.width,
    height: t.height,
    tileSize: t.tileSize,
    overlap: t.overlap,
    maxLevel: t.maxLevel,
    format: t.format,
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
    { rank: doc.rank, level: doc.level, ballotCast: !!doc.firstBallotAt },
    today,
  );
}

/**
 * Slice-2 tech design §7.3: the first home-city pin where a tap would advance this order: an action
 * the spec matches, or, for "Take a job", the first Jobs card with a job the character can take.
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
      const descriptor: ActionDescriptor = {
        kind: isCheckedAction(action) ? 'checked' : 'training',
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
  // A job stored before review 1 has no seniority yet (migration 004): it reads as 0.
  const days = doc.job.seniority ?? 0;
  return {
    id: job.id,
    name: job.name,
    locationId: job.locationId,
    locationName: content.location(job.locationId)?.location.name ?? job.locationId,
    dailyPay: jobPay(job, doc.factionId),
    seniority: { days, pct: Math.round(seniorityPct(days) * 100) },
    paidAt: dayStart(today + 1),
  };
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
    // Review 1 (§13.7): the note waits until it is seen (Carry on), today only. The FXP tile sums
    // today's completions; a Take a job item started done (doneAt at the day's start: a second
    // welcome day with a job already held) paid nothing.
    complete:
      state.day === today && state.allDoneAt !== null && doc.ordersNoteSeenDay !== today
        ? {
            pc: DIRECTIVES.allDonePc,
            fxp: items.reduce((sum, i) => {
              const t = templates.find((x) => x.id === i.templateId);
              return i.doneAt !== null && i.doneAt !== dayStart(today) ? sum + orderDoneFxp(t) : sum;
            }, 0),
          }
        : null,
  };
}

/** Slice 3: the seat held today, from the settlement's projection (ADR 0020). */
export function officeView(content: GameContent, doc: CharacterDoc, today: DayKey): CharacterView['office'] {
  const o = (doc.offices ?? []).find((x) => x.fromDay <= today && today < x.toDay);
  if (!o) return null;
  return {
    cityId: o.cityId,
    cityName: content.city(o.cityId)?.name ?? o.cityId,
    seat: o.seat,
    termEndsAt: dayStart(o.toDay),
  };
}

/**
 * The HUD view: lazy Energy and Rested projected to `now` (with today's Rested cap in the home
 * city, ADR 0021), plus everything slices 1–3 show. `politicsWaiting` needs a read, so the caller
 * that shows the Paper tab's dot (character.me) passes it.
 */
export function toCharacterView(
  doc: CharacterDoc,
  now: number,
  content: GameContent,
  editionReadAt: number | null,
  ctx: { city?: CityDoc | null; politicsWaiting?: 0 | 1 } = {},
): CharacterView {
  const today = dayKey(now);
  const restedCap = restedCapToday(content, ctx.city ?? null, today);
  const energy = projectEnergy(energyState(doc), now, ENERGY.max, restedCap);
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
      nextTitle: bounds.next === null ? null : rankTitle(content, doc, doc.rank + 1),
      ladder: [...faction.rankTitles],
    },
    pc: doc.pc,
    statPointsPending: doc.statPointsPending,
    job: jobView(content, doc, today),
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
    // The Paper tab's dot while a chapter is ready, opened or not; off when played or mid-way
    // (onboarding §14.3 n7).
    lettersWaiting: status.kind === 'ready' ? 1 : 0,
    office: officeView(content, doc, today),
    politicsWaiting: ctx.politicsWaiting ?? 0,
    restedCap,
    welcomeDay: welcomeDayOf(doc, today),
    statGuide: statGuideOf(content, doc),
  };
}

/** Review 1 (§5.3): the stat-point screen's counts, from the residence (home) city's checked actions. */
export function statGuideOf(content: GameContent, doc: CharacterDoc): CharacterView['statGuide'] {
  const city = content.city(doc.homeCityId);
  const checked = (city?.locations ?? []).flatMap((l) => l.actions.filter(isCheckedAction));
  const use = statUse(checked);
  const best = bestTrainedStat(doc.stats, preferredStat(content, doc.factionId));
  return {
    cityName: city?.name ?? doc.homeCityId,
    total: use.total,
    counts: use.counts,
    lead: use.lead,
    best: { stat: best, value: doc.stats[best] },
  };
}
