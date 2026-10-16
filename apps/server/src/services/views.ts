import { isCheckedAction, isWelcomeAction } from '@irongate/content';
import type { Action, City, GameContent, Location, Quarter } from '@irongate/content';
import { residenceCityId, residenceCtx, residenceOf } from './residence';
import type { CharacterDoc, CityDoc, StoredOrders } from '@irongate/db';
import { Types } from 'mongoose';
import {
  DIRECTIVES,
  ENERGY,
  FACTION_IDS,
  TRAVEL,
  fillTemplate,
  MONTH_NAMES,
  bestTrainedStat,
  chapterStatus,
  currentTally,
  dayKey,
  dayStart,
  equippedItems,
  isPaperDue,
  issueTags,
  itemSpec,
  jobLocks,
  MISSION_TYPES,
  missionGate,
  firstDayBonus,
  isWelcomeDay,
  jobPay,
  orderDoneFxp,
  orderMatches,
  projectEnergy,
  rankBounds,
  rankLadder,
  seniorityPct,
  standingView,
  statUse,
  verbsPhrase,
  placeOpen,
  quarterOpen,
  weekOf,
  wornCha,
} from '@irongate/rules';
import { liveIssuesOf, restedCapToday } from './modifiers';
import { recordLevelOf, riskView } from './risk';
import type { LiveIssue } from '@irongate/rules';
import type {
  ActionDescriptor,
  AssetView,
  ChapterStatus,
  CharacterView,
  CheckBonus,
  DayKey,
  EnergyState,
  Equipment,
  FactionId,
  JobView,
  NamedStandingView,
  OrderItem,
  OrderTemplate,
  OrdersState,
  OrdersView,
  LockedPinView,
  QuarterView,
  Stats,
  TileSource,
  TrainableStat,
} from '@irongate/rules';

const NO_EQUIPMENT: Equipment = { clothing: null, accessory: null, document: null, utility: null };

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
  // The First day is in the faction's home city (review 1), wherever the residence.
  // eslint-disable-next-line no-restricted-properties -- the faction's home
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

/**
 * Review 1 (§7.5): the first landing opened slot A's pin. Review 4 (ADR 0073): it opens the welcome
 * set's slot B, the favour from the platform: its HQ, with the favour's ticket (`actionId`)
 * highlighted. Without a slot-B action, the home city's first place.
 */
export function welcomeLanding(
  content: GameContent,
  doc: Pick<CharacterDoc, 'factionId'>,
): { cityId: string; locationId: string; actionId?: string } {
  const b = content.faction(doc.factionId).welcomeOrders.B;
  const t = content.ordersOf(doc.factionId).find((x) => x.id === b);
  const first = t?.match.actionIds?.[0];
  const found = first ? content.action(first) : undefined;
  // The welcome landing is in the faction's home city.
  // eslint-disable-next-line no-restricted-properties -- the faction's home
  const city = content.city(content.faction(doc.factionId).homeCityId)!;
  if (found && found.city.id === city.id) {
    return { cityId: city.id, locationId: found.location.id, actionId: found.action.id };
  }
  return { cityId: city.id, locationId: city.locations[0]!.id };
}

/**
 * Review 4 (ADR 0073): a welcome ticket (the favour from the platform) is offered only while today's
 * orders hold an open item whose template is `use: 'welcome'` and matches it, and the orders are on.
 * Once done it stays done: the welcome set is dealt once per character (`carriedWelcome`, QA m2). Any other action is
 * always "offered" here (its own rules apply).
 */
export function welcomeOffered(
  content: GameContent,
  c: Pick<CharacterDoc, 'factionId' | 'orders'>,
  action: Action,
  today: DayKey,
): boolean {
  if (!isWelcomeAction(action)) return true;
  if (c.orders.day !== today) return false;
  // QA n2: while the day's orders are off (an arrest) its order cannot be done, so the errand is not
  // offered either: it would pay on every tap. It comes back with an open order (a second welcome day).
  if (c.orders.off) return false;
  const templates = content.ordersOf(c.factionId);
  return c.orders.items.some((item) => {
    if (item.doneAt) return false;
    const t = templates.find((x) => x.id === item.templateId);
    return t?.use === 'welcome' && (t.match.actionIds ?? []).includes(action.id);
  });
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
 *
 * Slice-4 fixes §3 (QA m2): `live`, the residence city's Issues this week in their order (first,
 * second), tag the actions as the tickets show them, so an `issueTagged` order points at the first
 * place, in pin order, with an action its first Issue tags (else its second's). A place the member
 * may not act at (another party's headquarters in the capital) is never the pin.
 */
export function orderPin(
  content: GameContent,
  doc: CharacterDoc,
  item: OrderItem,
  t: OrderTemplate,
  live: readonly LiveIssue[],
  /** The day read, for a mission order's gates (the record's marks fade by day). */
  today: DayKey,
): { locationId: string; n: number } | null {
  // Slice 4 (ADR 0026): the pins of the residence city, where its orders point.
  const city = content.city(residenceCityId(doc));
  if (!city) return null;
  const spec = itemSpec(item, t);
  if (spec.match.issueTagged) {
    for (const issue of live) {
      const pin = firstPin(content, doc, city, spec.match, [issue], today);
      if (pin) return pin;
    }
    return null;
  }
  return firstPin(content, doc, city, spec.match, live, today);
}

/** The first pin of the city, in pin order, where an action (or a job) matches the order's rule. */
function firstPin(
  content: GameContent,
  doc: CharacterDoc,
  city: NonNullable<ReturnType<GameContent['city']>>,
  match: OrderTemplate['match'],
  live: readonly LiveIssue[],
  today: DayKey,
): { locationId: string; n: number } | null {
  const ctx = residenceCtx(doc);
  const spec = { match };
  const values = wornStats(doc, content);
  // Review 4 #22: a mission order points at the first place with a mission the member can start.
  const missions = spec.match.kinds?.includes('mission')
    ? startableMissions(content, doc, city.id, today)
    : [];
  for (const [i, location] of city.locations.entries()) {
    const pin = { locationId: location.id, n: i + 1 };
    // Review 4 #22: never a pin at a place the member cannot open yet (ADR 0076: `placeOpen`).
    if (!placeOpenFor(content, doc, location).open) continue;
    for (const m of missions.filter((x) => x.locationId === location.id)) {
      const descriptor: ActionDescriptor = {
        kind: 'mission',
        actionId: m.missionId,
        type: m.seenAs,
        locationId: location.id,
        cityId: city.id,
        districtId: location.quarterId,
        locationKind: location.kind,
      };
      if (orderMatches(spec.match, descriptor, ctx)) return pin;
    }
    if (location.factionId && location.factionId !== doc.factionId) continue;
    if (spec.match.kinds?.includes('takeJob')) {
      const takeable = content
        .jobsAt(location.id)
        .some(
          (j) => doc.job?.id !== j.id && jobLocks(j.unlock, { level: doc.level, stats: values }).length === 0,
        );
      if (takeable && orderMatches(spec.match, { kind: 'takeJob' }, ctx)) return pin;
      continue;
    }
    for (const action of location.actions) {
      const descriptor: ActionDescriptor = {
        kind: isCheckedAction(action) ? 'checked' : 'training',
        actionId: action.id,
        type: action.type,
        locationId: location.id,
        cityId: city.id,
        districtId: location.quarterId,
        locationKind: location.kind,
      };
      const tagged = isCheckedAction(action) ? issueTags(live, descriptor).map((x) => x.issueId) : [];
      if (orderMatches(spec.match, { ...descriptor, issueIds: tagged }, ctx)) return pin;
    }
  }
  return null;
}

/**
 * Review 4 #22: the missions `doc` could start in `cityId` on `today`, in pin order: the place's
 * quarter open to them (GDD §14.13), the mission offered to their party (not against it, design
 * §4.1), and no gate unmet (Level, Rank, reputation, record: `missionGate`). The capital's
 * `leader` missions always have a target other than the actor, so they are offered. Energy, Heat,
 * Health and the cells are left out: they pass within the day. The slot-B mission order is only drawn
 * when this is not empty, and its pin is the first of them. Review 5: night missions are left out.
 */
export function startableMissions(
  content: GameContent,
  doc: Pick<CharacterDoc, 'factionId' | 'level' | 'rank' | 'localStanding' | 'record' | 'held'>,
  cityId: string,
  today: DayKey,
): Array<{ locationId: string; missionId: string; seenAs: string; n: number }> {
  const city = content.city(cityId);
  if (!city) return [];
  const record = recordLevelOf(doc, today);
  const standingLevel = standingView(standingSuccesses(doc, cityId)).level;
  const out: Array<{ locationId: string; missionId: string; seenAs: string; n: number }> = [];
  for (const [i, location] of city.locations.entries()) {
    if (!placeOpenFor(content, doc, location).open) continue;
    for (const mission of content.missionsAt(location.id)) {
      if (mission.target !== undefined && mission.target !== 'leader' && mission.target === doc.factionId)
        continue;
      // Review 5 (tech design §7.3, answers §12.1: night work is extra): a night mission never makes
      // the mission order offerable nor takes its pin. An ordinary mission keeps a way by day.
      if (mission.window === 'night') continue;
      const hq = location.factionId ?? (location.kind === 'faction-hq' ? city.homeFactionId : undefined);
      const gate = missionGate({
        level: doc.level,
        rank: doc.rank,
        standingLevel,
        record,
        mission,
        place: { kind: location.kind, ...(hq ? { factionId: hq } : {}) },
      });
      if (gate) continue;
      out.push({
        locationId: location.id,
        missionId: mission.id,
        seenAs: MISSION_TYPES[mission.type].seenAs,
        n: i + 1,
      });
    }
  }
  return out;
}

export function toOrdersState(o: StoredOrders): OrdersState {
  return {
    day: o.day,
    items: o.items.map((i) => ({
      templateId: i.templateId,
      variant: i.variant,
      // Slice 7 T16 (ADR 0046): the Chair's push rides on the item (its match and the party's target).
      ...(i.push ? { push: i.push } : {}),
      target: i.target,
      progress: i.progress,
      doneAt: i.doneAt ? new Date(i.doneAt).getTime() : null,
    })),
    allDoneAt: o.allDoneAt ? new Date(o.allDoneAt).getTime() : null,
    // Review 4 #20 (ADR 0078): the day's orders off since an arrest.
    ...(o.off ? { off: { at: new Date(o.off.at).getTime(), reason: o.off.reason } } : {}),
    // Slice 7 (ADR 0046): *Set by the Chair*, kept on every write of the day's orders.
    ...(o.setBy ? { setBy: { characterId: o.setBy.characterId.toHexString(), name: o.setBy.name } } : {}),
  };
}

export function fromOrdersState(o: OrdersState): StoredOrders {
  return {
    day: o.day,
    items: o.items.map((i) => ({ ...i, doneAt: i.doneAt === null ? null : new Date(i.doneAt) })),
    allDoneAt: o.allDoneAt === null ? null : new Date(o.allDoneAt),
    ...(o.off ? { off: { at: new Date(o.off.at), reason: o.off.reason } } : {}),
    ...(o.setBy ? { setBy: { characterId: new Types.ObjectId(o.setBy.characterId), name: o.setBy.name } } : {}),
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

/**
 * Slice-4 fixes §2 (QA m1): an order's placeholders, resolved at read for its reader: `{issue}` the
 * residence city's first Issue this week, `{city}` the residence city's name, `{verbs}` the verbs of
 * its training actions the member may take (another party's headquarters excluded), *Study, carry or
 * run* in Irongate.
 */
export function orderVars(
  content: GameContent,
  doc: Pick<CharacterDoc, 'factionId' | 'residence' | 'homeCityId'> & { level?: number },
  issueShort: string | null,
): { issue: string; city: string; verbs: string } {
  const city = content.city(residenceCityId(doc as CharacterDoc));
  const verbs: string[] = [];
  for (const l of city?.locations ?? []) {
    if (l.factionId && l.factionId !== doc.factionId) continue;
    // Slice 5 (GDD §14.13): only the places open to the member (the Harbour's *Carry* from Level 6).
    const q = city?.quarters.find((x) => x.id === l.quarterId);
    if (!placeOpen({ quarter: q ?? null, kind: l.kind, level: doc.level ?? 1 }).open) continue;
    for (const a of l.actions) if (!isCheckedAction(a)) verbs.push(a.verb);
  }
  return { issue: issueShort ?? 'the week', city: city?.name ?? '', verbs: verbsPhrase(verbs) };
}

/** An order's title or line for its reader (`orderVars`). */
export const orderText = (text: string, vars: { issue: string; city: string; verbs: string }): string =>
  fillTemplate(text, vars);

/** The residence city's Issues this week in their order (first, second), for the orders' pins. */
export function liveIssuesInOrder(
  content: GameContent,
  doc: CharacterDoc,
  city: Pick<CityDoc, 'issues'> | null | undefined,
  today: DayKey,
): LiveIssue[] {
  const order = new Map((city?.issues?.live ?? []).map((l) => [l.docId, l.order]));
  return liveIssuesOf(content, residenceCityId(doc), city ?? null, today).sort(
    (a, b) => (order.get(a.docId) ?? 0) - (order.get(b.docId) ?? 0),
  );
}

/** The residence city's first Issue this week, by its phrase (capital orders' `{issue}`). */
export function firstIssueShort(
  content: GameContent,
  city: Pick<CityDoc, 'issues'> | null | undefined,
  today: DayKey,
): string | null {
  const first =
    city?.issues?.weekDay === weekOf(today) ? city.issues.live.find((l) => l.order === 1) : undefined;
  return first ? (content.issue(first.issueId)?.short ?? null) : null;
}

/** Slice 7: a push's place in words (*Eastside*, *Clearwater*). */
export function pushPlaceName(content: GameContent, p: { cityId: string; districtId: string | null }): string {
  if (p.districtId) return content.district(p.districtId)?.quarter.name ?? p.districtId;
  return content.city(p.cityId)?.name ?? p.cityId;
}

export function ordersView(
  content: GameContent,
  doc: CharacterDoc,
  today: DayKey,
  issueShort: string | null = null,
  /** The residence city's document (its Issues tag the Issue order's pin: slice-4 fixes §3). */
  residenceCity: Pick<CityDoc, 'issues'> | null = null,
): OrdersView {
  const vars = orderVars(content, doc, issueShort);
  const live = liveIssuesInOrder(content, doc, residenceCity, today);
  const faction = content.faction(doc.factionId);
  const npc = content.npc(faction.secretary.npcId)!;
  const templates = content.ordersOf(doc.factionId);
  const state = toOrdersState(doc.orders);
  const items = state.day === today ? state.items : [];
  // Review 4 #20 (ADR 0078): an arrest today took the orders off: no pins (nothing to go to).
  const off = state.day === today && !!state.off;
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
      // Slice 7 (design §4.2): a pushed order's `{place}` is the push's (the residence below Level 10).
      const place = (x: string) => (item.push ? x.replaceAll('{place}', pushPlaceName(content, item.push)) : x);
      return [
        {
          id: item.templateId,
          // Slice 4 (design §10), slice-4 fixes §2: `{issue}`, `{city}`, `{verbs}`, resolved at read.
          title: place(orderText(spec.title, vars)),
          line: place(orderText(spec.line, vars)),
          progress: Math.min(item.progress, item.target),
          target: item.target,
          done: item.doneAt !== null,
          pin: item.doneAt === null && !off ? orderPin(content, doc, item, t, live, today) : null,
          // Slice 7 (tech design §8.3): the Chair's push names its place.
          ...(item.push ? { push: { place: pushPlaceName(content, item.push), counts: item.push.counts } } : {}),
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
    // welcome day with a job already held) paid nothing, and an item carried done from the evening
    // before (QA m2: a late sign-up's set carried on) paid then.
    complete:
      state.day === today && state.allDoneAt !== null && doc.ordersNoteSeenDay !== today
        ? {
            pc: DIRECTIVES.allDonePc,
            fxp: items.reduce((sum, i) => {
              const t = templates.find((x) => x.id === i.templateId);
              return i.doneAt !== null && i.doneAt > dayStart(today) ? sum + orderDoneFxp(t) : sum;
            }, 0),
          }
        : null,
    // Review 4 #13 (answers §13): away from the residence (rival ground included) and on a train,
    // the orders stand but are done at home: one quiet line, *Your orders are in Coalport · 1 of 3
    // done* (the residence city, which `{city}` names too).
    away:
      doc.journey?.status === 'onTheWay' || doc.cityId !== residenceCityId(doc)
        ? {
            cityName: content.city(residenceCityId(doc))?.name ?? residenceCityId(doc),
            done: items.filter((i) => i.doneAt !== null).length,
            of: items.length,
          }
        : null,
    off: off ? { reason: 'cells' } : null,
    setBy: state.day === today && state.setBy ? { name: state.setBy.name } : null,
  };
}

/**
 * GDD §14.13, design §2.1 (ADR 0035): whether a quarter is open to the character, by Level, or
 * because the game has sent them to a place in it (the cells or the infirmary, until the stay is
 * closed: a view rule, nothing stored), so a service never lands on a locked view.
 */
export function quarterOpenFor(
  content: GameContent,
  doc: Pick<CharacterDoc, 'level' | 'held'>,
  q: Pick<Quarter, 'id' | 'opens'>,
): ReturnType<typeof quarterOpen> {
  const heldHere = !!doc.held && content.quarterOf(doc.held.locationId)?.id === q.id;
  return quarterOpen(q, doc.level, heldHere);
}

/**
 * Review 4 (ADR 0076–0077): whether a place is open to the character (`placeOpen`): the Town Hall
 * always, else its quarter by Level, or because the game holds the character in that quarter. Every
 * place-level call (the city view, the order pins, the missions, the action and mission refusals).
 */
export function placeOpenFor(
  content: GameContent,
  doc: Pick<CharacterDoc, 'level' | 'held'>,
  location: Pick<Location, 'kind' | 'quarterId'>,
): ReturnType<typeof placeOpen> {
  const quarter = findQuarter(content, location.quarterId);
  const heldHere = !!doc.held && !!quarter && content.quarterOf(doc.held.locationId)?.id === quarter.id;
  return placeOpen({ quarter: quarter ?? null, kind: location.kind, level: doc.level, heldHere });
}

/**
 * Review 4 (ADR 0076): where a screen lands at a place: the capital's district route with the place,
 * a home city's one map with the place (no quarter: a home city has no quarter routes).
 */
export function landingAt(
  content: GameContent,
  cityId: string,
  locationId: string,
): { cityId: string; quarterId?: string; locationId: string } {
  const q = content.location(locationId)?.location.quarterId;
  return { cityId, ...(q && content.isDistricted(cityId) ? { quarterId: q } : {}), locationId };
}

const findQuarter = (content: GameContent, quarterId: string): Quarter | undefined =>
  content.quartersOf(quarterId.slice(0, quarterId.indexOf('.'))).find((q) => q.id === quarterId);

/**
 * Tech design §8.3 (ADR 0035): a city's quarters, every one, open or locked: the frame, the outline
 * and the label for the overview, the lock and its teaser line, the blurb, and how many places it has.
 */
export function quarterViews(
  content: GameContent,
  city: City,
  doc: Pick<CharacterDoc, 'level' | 'held'>,
): QuarterView[] {
  return city.quarters.map((q) => {
    const o = quarterOpenFor(content, doc, q);
    // Review 4 (ADR 0076): a home quarter is a group of places with a Level gate; only the
    // capital's districts carry their shapes.
    return {
      id: q.id,
      name: q.name,
      ...(q.frame ? { frame: { ...q.frame } } : {}),
      ...(q.outline ? { outline: q.outline.map(([x, y]) => [x, y] as [number, number]) } : {}),
      ...(q.label ? { label: { ...q.label } } : {}),
      open: o.open,
      lock: o.lock,
      blurb: q.blurb ?? null,
      places: city.locations.filter((l) => l.quarterId === q.id).length,
    };
  });
}

/**
 * Review 4 (ADR 0076): a home city's greyed pins, in pin order: its places the character cannot
 * open yet (a locked quarter's), then the survey's later places (`content.laterPins`, a later
 * edition). Names and points only: no tickets leave the server. [] in the capital.
 */
export function lockedPinViews(
  content: GameContent,
  city: City,
  doc: Pick<CharacterDoc, 'level' | 'held'>,
): LockedPinView[] {
  if (content.isDistricted(city.id)) return [];
  const locked: LockedPinView[] = [];
  for (const l of city.locations) {
    const o = placeOpenFor(content, doc, l);
    if (o.open || !o.lock) continue;
    locked.push({ id: l.id, name: l.name, quarterId: l.quarterId, map: { ...l.map }, lock: o.lock });
  }
  for (const p of content.laterPins(city.id))
    locked.push({ id: p.id, name: p.name, quarterId: p.quarterId, map: { ...p.map }, lock: { kind: 'edition' } });
  return locked;
}

/**
 * The voting rework (design §4.7): the rule in force in the residence city, for the Me tab's line;
 * null when the document is another city's or no rule is in force.
 */
export function cityRuleView(
  content: GameContent,
  doc: CharacterDoc,
  city: CityDoc | null,
  today: DayKey,
): CharacterView['cityRule'] {
  const cityId = residenceCityId(doc);
  const o = city && city._id === cityId ? city.ordinance : null;
  if (!o || !(o.fromDay <= today && today < o.toDay)) return null;
  return {
    cityName: content.city(cityId)?.name ?? cityId,
    name: content.ordinance(o.id)?.name ?? o.id,
    daysLeft: o.toDay - today,
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
  const restedCap = restedCapToday(content, ctx.city ?? null, today, doc.room, doc.factionId);
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
    // Slice 4: every party's short name (the capital's tables, the ground sash, Issue rows).
    factionNames: Object.fromEntries(
      FACTION_IDS.map((f) => [f, content.faction(f).shortName]),
    ) as Record<FactionId, string>,
    // eslint-disable-next-line no-restricted-properties -- the faction's home, as the view says
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
    // Review 4 #25 (answers §25): the ladder's rows, for the sheet the Party XP label opens.
    ranks: rankLadder(faction.rankTitles),
    pc: doc.pc,
    statPointsPending: doc.statPointsPending,
    job: jobView(content, doc, today),
    standing: namedStanding(content, doc.cityId, standingSuccesses(doc, doc.cityId)),
    today: currentTally(doc.today, today),
    orders: ordersView(content, doc, today, firstIssueShort(content, ctx.city, today), ctx.city ?? null),
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
    ...(ctx.city !== undefined ? { cityRule: cityRuleView(content, doc, ctx.city, today) } : {}),
    politicsWaiting: ctx.politicsWaiting ?? 0,
    restedCap,
    // Slice 4 (tech design §8.3): the journey, where you live, the room, the train.
    journey: doc.journey
      ? {
          id: doc.journey.id.toHexString(),
          from: doc.journey.from,
          to: doc.journey.to,
          arrivesAt: new Date(doc.journey.arrivesAt).getTime(),
          status: doc.journey.status,
        }
      : null,
    residence: residenceView(content, doc),
    room:
      doc.room && doc.room.fromDay <= today && today < doc.room.untilDay
        ? { untilDay: doc.room.untilDay }
        : null,
    trainOpen: doc.level >= TRAVEL.level,
    welcomeDay: welcomeDayOf(doc, today),
    statGuide: statGuideOf(content, doc),
    // Slice 5 (tech design §8.3): Heat, Health, the record, held, the run-in, where you stand.
    ...riskView(content, doc, now, ctx.city ?? null),
    // Slice 6 (tech design §8.3): `events.open`'s names and `chat.forYou` need reads, so
    // `fullCharacterView` fills them; here the counts the character carries.
    events: { open: [], unseen: doc.events?.unseen?.length ?? 0 },
    chat: { hidden: doc.chat?.hidden ?? false, forYou: false },
    factionDot: (doc.events?.unseen?.length ?? 0) > 0,
  };
}

/** Review 1 (§5.3): the stat-point screen's counts, from the residence (home) city's checked actions. */
export function statGuideOf(content: GameContent, doc: CharacterDoc): CharacterView['statGuide'] {
  const city = content.city(residenceCityId(doc));
  const checked = (city?.locations ?? []).flatMap((l) => l.actions.filter(isCheckedAction));
  const use = statUse(checked);
  const best = bestTrainedStat(doc.stats, preferredStat(content, doc.factionId));
  return {
    cityName: city?.name ?? residenceCityId(doc),
    total: use.total,
    counts: use.counts,
    lead: use.lead,
    best: { stat: best, value: doc.stats[best] },
  };
}

/** ADR 0026: where the character lives, for the Me tab and the plate. */
export function residenceView(
  content: GameContent,
  doc: CharacterDoc,
): NonNullable<CharacterView['residence']> {
  const r = residenceOf(doc);
  return {
    cityId: r.cityId,
    cityName: content.city(r.cityId)?.name ?? r.cityId,
    districtId: r.districtId,
    districtName: r.districtId ? (content.district(r.districtId)?.quarter.name ?? r.districtId) : null,
    sinceDay: r.sinceDay,
    votesFromDay: r.votesFromDay,
    standsFromDay: r.standsFromDay,
    canMoveFromDay: r.canMoveFromDay,
  };
}
