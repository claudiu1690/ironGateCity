import type { City, GameContent, Location, Mission, Way } from '@irongate/content';
import type { CharacterDoc, CityDoc, DistrictDoc } from '@irongate/db';
import {
  MISSION_TYPES,
  RECORD,
  actionEnergy,
  dayKey,
  isAgilityWay,
  issueTags,
  missionCheck,
  missionGate,
  missionRisk,
  missionTarget,
  offeredTo,
  placeOf,
  projectHeat,
  rivalGroundIn,
  standingView,
} from '@irongate/rules';
import type {
  ActionDescriptor,
  CheckBonus,
  CheckBreakdown,
  DayFlags,
  DayKey,
  FactionId,
  HeatTimer,
  MissionInput,
  MissionRiskView,
  MissionSpec,
  MissionType,
  MissionTypeSpec,
  PlaceModifiers,
  RecordLevel,
  RivalGroundState,
  Stats,
  TrainableStat,
} from '@irongate/rules';
import { modifiersFor, restedCapToday } from './modifiers';
import { residenceCityId, residenceCtx } from './residence';
import { flagsToday, heatRateOn, heatTimerOf, recordLevelOf } from './risk';
import {
  placeOpenFor,
  energyState,
  firstDayBonuses,
  preferredStat,
  standingSuccesses,
  toOrdersState,
  wornStats,
} from './views';
import { nightAt } from './night';

/**
 * Slice 5 (tech design §8.2–§8.3, ADR 0031): everything a mission needs about the player, the place
 * and the day, computed once and shared by the ticket (`city.get`'s `MissionView`) and the start
 * (`mission.start`), so the ticket's preview rows are exactly the rows `resolveMission` checks
 * (`missionCheck` in rules is the one computation) and its risk line is `missionRisk` with the same
 * inputs. Pure over the documents the caller already read (the city, the capital's district, the
 * residence city): no I/O.
 */

/** The documents a mission reads (in `mission.start`, inside the transaction's snapshot). */
export interface MissionDocs {
  /** The city the mission is in. */
  city: CityDoc | null;
  /** The capital's district of the mission's place (`districts.state.leader`); null elsewhere. */
  district: DistrictDoc | null;
  /** The residence city (Heat's cooling rate and the Rested cap, design §23.1 #8). */
  residence: CityDoc | null;
}

export interface MissionCtx {
  city: City;
  location: Location;
  mission: Mission;
  type: MissionType;
  /** The type it is seen as by orders, Issues and type-keyed rules (design §23.1 #15). */
  seenAs: string;
  typeSpec: MissionTypeSpec;
  today: DayKey;
  /** The place's modifiers for this actor (sources, morale, close race, comeback, Issues, rival ground). */
  modifiers: PlaceModifiers;
  rivalGround: RivalGroundState | null;
  /** The resolved target (`missionTarget`, `districts.state.leader` in the capital), or null. */
  target: FactionId | null;
  /** False for the target faction's own members: the mission is hidden from them (design §4.1). */
  offered: boolean;
  /** The first unmet gate (`missionGate`), or null. */
  gate: { reason: 'LEVEL' | 'RANK' | 'STANDING' | 'RECORD'; need: number } | null;
  /** The live Energy (by the seen-as type: Rally Permits 15 → 13). */
  energy: number;
  values: Stats;
  prefer: TrainableStat;
  standing: { successes: number; names: readonly string[]; cityName: string };
  /** The caller's rows before Standing (the *First day* row). */
  bonuses: CheckBonus[];
  /** The stored Heat timer, its value now and the residence city's cooling rate. */
  heat: HeatTimer;
  heatNow: number;
  rateOn: (day: DayKey) => number;
  record: RecordLevel;
  /** The record's Iron penalty on missions: 0, −10, −20, −30. */
  recordIronPct: number;
  /** Today's *Watched* / *Warned* in this city. */
  flags: DayFlags;
  /** Review 5 (ADR 0080): night at `now` (the read's or the act's), from the one seam. */
  night: boolean;
  /** The descriptor a start would carry (kind `mission`, the seen-as type, its Issue tags). */
  descriptor: ActionDescriptor;
  /** The mission as `resolveMission` takes it. */
  spec: MissionSpec;
}

/** The place a mission's gates read: an HQ's faction is its own, else the city's home faction. */
const gatePlace = (city: City, location: Location): { kind: string; factionId?: FactionId } => {
  const factionId = location.factionId ?? (location.kind === 'faction-hq' ? city.homeFactionId : undefined);
  return { kind: location.kind, ...(factionId ? { factionId } : {}) };
};

/**
 * The mission's context for `c` at `now`, or undefined for an unknown mission. `modifiers` may be
 * passed when the caller already has them for this place (the city view), else they are computed
 * from `docs` (`modifiersFor`, ADR 0030).
 */
export function missionCtx(
  content: GameContent,
  c: CharacterDoc,
  missionId: string,
  docs: MissionDocs,
  now: number,
  modifiers?: PlaceModifiers,
): MissionCtx | undefined {
  const found = content.mission(missionId);
  if (!found) return undefined;
  const { city, location, mission } = found;
  const today = dayKey(now);
  const typeSpec = MISSION_TYPES[mission.type];
  const seenAs = typeSpec.seenAs;
  const m =
    modifiers ??
    modifiersFor(content, docs.city, c.factionId, today, { cityId: city.id, district: docs.district });
  const rivalGround = rivalGroundIn(m);

  const target = missionTarget(
    mission.target,
    c.factionId,
    docs.district ? { leader: docs.district.state.leader ?? null, shares: docs.district.opinion } : null,
  );
  const successes = standingSuccesses(c, city.id);
  const record = recordLevelOf(c, today);
  const gate = missionGate({
    level: c.level,
    rank: c.rank,
    standingLevel: standingView(successes).level,
    record,
    mission,
    place: gatePlace(city, location),
  });

  const rateOn = heatRateOn(content, docs.residence);
  const heat = heatTimerOf(c);

  const untagged: ActionDescriptor = {
    kind: 'mission',
    actionId: mission.id,
    type: seenAs,
    locationId: location.id,
    cityId: city.id,
    ...(location.quarterId ? { districtId: location.quarterId } : {}),
    locationKind: location.kind,
  };
  // Design §12.1: tagged by the feeds of the type it is seen as; the illegal types by none.
  const place = placeOf(m);
  const tagged = place && !typeSpec.illegal ? issueTags(place.issues, untagged) : [];

  return {
    city,
    location,
    mission,
    type: mission.type,
    seenAs,
    typeSpec,
    today,
    modifiers: m,
    rivalGround,
    target,
    // Review 4 (ADR 0076): and only at a place the character can open.
    offered: offeredTo(target, c.factionId) && placeOpenFor(content, c, location).open,
    gate,
    energy: actionEnergy(mission.energy, seenAs, m),
    values: wornStats(c, content),
    prefer: preferredStat(content, c.factionId),
    standing: { successes, names: content.standingNames, cityName: city.name },
    bonuses: firstDayBonuses(content, c, city.id, today),
    heat,
    heatNow: projectHeat(heat, now, rateOn).value,
    rateOn,
    record,
    recordIronPct: RECORD.ironPct[record],
    flags: flagsToday(c, city.id, today),
    night: nightAt(now).night,
    descriptor: tagged.length > 0 ? { ...untagged, issueIds: tagged.map((t) => t.issueId) } : untagged,
    spec: {
      id: mission.id,
      type: mission.type,
      energy: mission.energy,
      difficulty: mission.difficulty,
      locationId: location.id,
      cityId: city.id,
      ...(location.quarterId ? { districtId: location.quarterId } : {}),
      locationKind: location.kind,
      pool: mission.pool,
    },
  };
}

/** A way of the mission by id, or undefined. */
export const wayOf = (ctx: MissionCtx, wayId: string): Way | undefined =>
  ctx.mission.ways.find((w) => w.id === wayId);

/** The way's check as `resolveMission` will make it (the briefing row's odds word). */
export function wayPreview(ctx: MissionCtx, way: Way): CheckBreakdown {
  return missionCheck({
    type: ctx.type,
    difficulty: ctx.mission.difficulty,
    way,
    values: ctx.values,
    prefer: ctx.prefer,
    standing: ctx.standing,
    bonuses: ctx.bonuses,
    modifiers: ctx.modifiers,
  });
}

/** Design §4.7: the way's risk line for this player, here, today (Heat projected to now). */
export function wayRisk(ctx: MissionCtx, way: Way): MissionRiskView {
  return missionRisk({
    type: ctx.type,
    way,
    rivalGround: ctx.rivalGround !== null,
    heat: ctx.heatNow,
    record: ctx.record,
    flags: ctx.flags,
    night: ctx.night,
  });
}

/** The way the player chose last time (`characters.ways`), if it still exists. */
export function rememberedWay(ctx: MissionCtx, c: Pick<CharacterDoc, 'ways'>): string | null {
  const id = (c.ways ?? []).find((w) => w.missionId === ctx.mission.id)?.wayId;
  return id !== undefined && wayOf(ctx, id) ? id : null;
}

/** Whether the way is a single-stat Agility way (*Agility +¼* on a paid Success). */
export const agilityWay = (way: Way): boolean => isAgilityWay(way);

/**
 * `resolveMission`'s input for `c` taking `way` (tech design §8.2 step 2.4). The orders are the
 * stored ones (the caller has checked the day is settled), the Rested cap the residence city's;
 * `force` carries the test hooks (§8.5).
 */
export function missionInput(
  content: GameContent,
  ctx: MissionCtx,
  c: CharacterDoc,
  way: Way,
  docs: Pick<MissionDocs, 'residence'>,
  now: number,
  force?: MissionInput['force'],
): MissionInput {
  const police = content.opponents.find((o) => o.side === 'police');
  return {
    mission: ctx.spec,
    way,
    values: ctx.values,
    prefer: ctx.prefer,
    energy: energyState(c),
    now,
    restedCap: restedCapToday(content, docs.residence, ctx.today, c.room),
    standing: ctx.standing,
    orders: toOrdersState(c.orders),
    orderTemplates: content.ordersOf(c.factionId),
    homeCityId: residenceCityId(c),
    residence: residenceCtx(c),
    factionId: c.factionId,
    modifiers: ctx.modifiers,
    bonuses: ctx.bonuses,
    target: ctx.target,
    heat: ctx.heat,
    rateOn: ctx.rateOn,
    record: ctx.record,
    flags: ctx.flags,
    night: ctx.night,
    opponents: {
      sideOf: (id) => content.opponent(id)?.side ?? 'police',
      policeId: police?.id ?? '',
    },
    ...(force ? { force } : {}),
  };
}
