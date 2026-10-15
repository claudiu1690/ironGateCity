import type { GameContent } from '@irongate/content';
import type { CharacterDoc, CityDoc, DistrictDoc } from '@irongate/db';
import {
  groundswellPct,
  issueEffectsOnDay,
  moraleState,
  ordinanceOnDay,
  ordinanceSource,
  placeModifiers,
  restedCapFor,
  rivalGroundOf,
  weekOf,
} from '@irongate/rules';
import type {
  DayKey,
  FactionId,
  LiveIssue,
  ModifierSource,
  MoraleState,
  PlaceModifiers,
  PlaceState,
  RivalGroundState,
} from '@irongate/rules';
import { lawSourcesFor } from './lawBook';

/**
 * The day-constant modifiers of a place (ADR 0021, 0022, 0030): the sources in force in the city
 * (its ordinance, then the week's Issue effects), morale, and at a place the close race, the
 * comeback and the live Issues whose feeds tag actions. Read from the documents every request
 * already has (ADR 0017): the city's, and in the capital the district's.
 */

type CityState = Pick<CityDoc, 'ordinance' | 'ordinanceHistory' | 'issues'>;

/** The ordinance id in force in `city` on `day` (the current one, else the short history). */
export function ordinanceIdOn(
  city: Pick<CityDoc, 'ordinance' | 'ordinanceHistory'> | null,
  day: DayKey,
): string | null {
  if (!city) return null;
  const o = city.ordinance;
  if (o && o.fromDay <= day && day < o.toDay) return o.id;
  return ordinanceOnDay(city.ordinanceHistory ?? [], day);
}

/** The Issue effects in force in `city` on `day` (`[fromDay, toDay)`), by the order they took effect. */
export function issueEffectsOn(
  city: Pick<CityDoc, 'issues'> | null,
  day: DayKey,
): NonNullable<CityDoc['issues']>['effects'] {
  return issueEffectsOnDay(city?.issues?.effects ?? [], day);
}

/**
 * ADR 0030: the named sources in force in a city on a day: the ordinance first, then the Issue
 * effects, then (slice 7, ADR 0044) the laws in force that day for `actor` (no actor: no laws).
 */
export function sourcesOn(
  content: GameContent,
  city: CityState | null,
  day: DayKey,
  actor?: FactionId,
): ModifierSource[] {
  const out: ModifierSource[] = [];
  const ordId = ordinanceIdOn(city, day);
  const spec = ordId ? content.ordinanceSpec(content.ordinance(ordId)?.id ?? ordId) : undefined;
  if (spec) out.push(ordinanceSource(spec));
  for (const e of issueEffectsOn(city, day)) {
    const issue = content.issue(e.issueId);
    if (issue) out.push({ id: issue.id, name: issue.name, kind: 'issue', effects: issue.effects });
  }
  out.push(...lawSourcesFor(content, day, actor));
  return out;
}

/** The home faction's morale in a home city, or null for a battleground. */
export function moraleOf(
  content: GameContent,
  city: Pick<CityDoc, '_id' | 'opinion'> | null,
): MoraleState | null {
  if (!city?.opinion) return null;
  const home = content.city(city._id)?.homeFactionId;
  return home ? moraleState(city.opinion[home]) : null;
}

/** ADR 0029: the city's live Issues this week, with the feeds that tag actions there. */
export function liveIssuesOf(
  content: GameContent,
  cityId: string,
  city: Pick<CityDoc, 'issues'> | null,
  day: DayKey,
): LiveIssue[] {
  const issues = city?.issues;
  if (!issues || issues.weekDay !== weekOf(day)) return [];
  const eligible = content.issuesFor(cityId);
  return issues.live.flatMap((l) => {
    const found = eligible.find((x) => x.issue.id === l.issueId && x.districtId === l.districtId);
    return found ? [{ docId: l.docId, issueId: l.issueId, name: found.issue.name, feeds: found.feeds }] : [];
  });
}

/** A district's comeback in force on `day`, with its percentage, or null. */
export function groundswellOn(
  district: Pick<DistrictDoc, 'groundswell'> | null | undefined,
  day: DayKey,
): { factionId: FactionId; pct: number } | null {
  const g = district?.groundswell;
  if (!g || day < g.fromDay || day >= g.untilDay) return null;
  return { factionId: g.factionId, pct: groundswellPct(g, day) };
}

/** ADR 0034: another faction's home city is rival ground (the cap from the city's `rivalPressure`). */
export function rivalGroundAt(
  content: GameContent,
  factionId: FactionId,
  cityId: string,
  city: Pick<CityDoc, 'opinion' | 'rivalPressure'> | null,
  today: DayKey,
): RivalGroundState | null {
  const home = content.city(cityId)?.homeFactionId ?? null;
  if (!home || home === factionId) return null;
  const share = city?.opinion?.[home];
  return rivalGroundOf({
    homeFactionId: home,
    actor: factionId,
    morale: share === undefined ? null : moraleState(share),
    pressure: city?.rivalPressure ?? null,
    today,
  });
}

/** The place's state for an action (a district in the capital; a home city has no close race). */
export function placeStateOf(
  content: GameContent,
  i: {
    cityId: string;
    city: CityDoc | null;
    district?: DistrictDoc | null;
    day: DayKey;
    /** Slice 5: the actor, for rival ground (ADR 0034). */
    factionId?: FactionId;
  },
): PlaceState {
  return {
    battleground: i.district?.state.battleground ?? false,
    groundswell: groundswellOn(i.district, i.day),
    issues: liveIssuesOf(content, i.cityId, i.city, i.day),
    rivalGround: i.factionId ? rivalGroundAt(content, i.factionId, i.cityId, i.city, i.day) : null,
  };
}

/**
 * ADR 0030: the modifiers for an actor of `factionId` acting in `cityId` (and its district) today:
 * the city's sources, Fired up in the faction's home city, and the place.
 */
export function modifiersFor(
  content: GameContent,
  city: CityDoc | null,
  factionId: FactionId,
  day: DayKey,
  i: { cityId?: string; district?: DistrictDoc | null } = {},
): PlaceModifiers {
  const cityId = i.cityId ?? city?._id ?? '';
  return placeModifiers({
    sources: sourcesOn(content, city, day, factionId),
    moraleState: moraleOf(content, city),
    actorIsHomeFaction: !!cityId && content.city(cityId)?.homeFactionId === factionId,
    place: placeStateOf(content, { cityId, city, district: i.district ?? null, day, factionId }),
  });
}

/** A past day's sources alone (no morale, no place): each ended day's wage, its seniority, its cap. */
export function dayModifiers(
  content: GameContent,
  city: CityState | null,
  day: DayKey,
  actor?: FactionId,
): PlaceModifiers {
  return { sources: sourcesOn(content, city, day, actor), firedUp: false };
}

/** A room runs `[fromDay, untilDay)` (ADR 0030 §5). */
export const roomRunsOn = (room: CharacterDoc['room'] | undefined, day: DayKey): boolean =>
  !!room && room.fromDay <= day && day < room.untilDay;

/**
 * ADR 0030 §5 (design §7.4): each day's Rested cap: 200 + the residence city's sources of that day +
 * a room while it runs. The base cap for a day older than the city's short history.
 */
export function capOn(
  content: GameContent,
  city: CityState | null,
  room?: CharacterDoc['room'],
  actor?: FactionId,
): (day: DayKey) => number {
  return (day) => restedCapFor(dayModifiers(content, city, day, actor), roomRunsOn(room, day));
}

/** Today's Rested cap (the residence city's sources and the room). */
export function restedCapToday(
  content: GameContent,
  city: CityState | null,
  day: DayKey,
  room?: CharacterDoc['room'],
  actor?: FactionId,
): number {
  return capOn(content, city, room, actor)(day);
}
