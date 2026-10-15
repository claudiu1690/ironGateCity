import type { GameContent } from '@irongate/content';
import type { CharacterDoc, StoredResidence } from '@irongate/db';
import type { FactionId, ResidenceCtx } from '@irongate/rules';
import { gameError } from '../gameError';

/**
 * The residence seam (slice-4 tech design §8.4, ADR 0026). `homeCityId` keeps meaning the faction's
 * home (morale, *Fired up*, the welcome day, the Ambition); everything that means *where I vote,
 * stand, read and take orders* goes through here. A lint rule (`no-restricted-properties`) keeps new
 * server code off `homeCityId` outside the files and lines that mean the faction's home.
 */

type ResidenceSource = Pick<CharacterDoc, 'homeCityId' | 'residence'>;

/**
 * Where the character lives. Migration 006 and the schema's default set it on every document; a
 * document stored before them lives at home with every window open.
 */
export function residenceOf(c: ResidenceSource): StoredResidence {
  return (
    c.residence ?? {
      // eslint-disable-next-line no-restricted-properties -- the seam: before migration 006, home.
      cityId: c.homeCityId,
      districtId: null,
      sinceDay: 0,
      votesFromDay: 0,
      standsFromDay: 0,
      canMoveFromDay: 0,
    }
  );
}

/** The residence as the rules' order matches take it (`cityId: 'home'`, `districtId: 'home'`). */
export function residenceCtx(c: ResidenceSource): ResidenceCtx {
  const r = residenceOf(c);
  return { cityId: r.cityId, districtId: r.districtId };
}

/** The residence city's id. */
export const residenceCityId = (c: ResidenceSource): string => residenceOf(c).cityId;

export interface ResidenceSpec {
  city: NonNullable<ReturnType<GameContent['city']>>;
  offset: number;
  /**
   * The home faction of the residence city (its council's branch); null in the capital, where every
   * faction stands (ADR 0027).
   */
  home: FactionId | null;
  /** The branch the character belongs to there: the home faction at home, their own in the capital. */
  faction: ReturnType<GameContent['faction']>;
  /** Where the character votes: the home city, or a capital district. */
  place: { id: string; name: string; kind: 'home' | 'district' };
}

/**
 * The residence's council: the city, its cycle offset, its home faction and the place voted in: the
 * home city, or in the capital the district registered in (ADR 0026, 0027).
 */
export function residenceSpec(
  content: GameContent,
  c: ResidenceSource & Partial<Pick<CharacterDoc, 'factionId'>>,
): ResidenceSpec {
  const r = residenceOf(c);
  const city = content.city(r.cityId);
  if (city?.council && content.isDistricted(city.id) && r.districtId && c.factionId) {
    const district = content.district(r.districtId);
    if (!district) throw gameError('PRECONDITION_FAILED', 'ELECTION_NOT_READY');
    return {
      city,
      offset: city.council.offset,
      home: null,
      faction: content.faction(c.factionId),
      place: { id: r.districtId, name: district.quarter.name, kind: 'district' },
    };
  }
  // Slice 7 (ADR 0050): Clearwater votes as one place, every faction standing (the capital's rules).
  if (city?.council && city.role === 'battleground' && !content.isDistricted(city.id) && c.factionId) {
    return {
      city,
      offset: city.council.offset,
      home: null,
      faction: content.faction(c.factionId),
      place: { id: city.id, name: city.name, kind: 'district' },
    };
  }
  if (!city?.council || !city.homeFactionId) throw gameError('PRECONDITION_FAILED', 'ELECTION_NOT_READY');
  const faction = content.faction(city.homeFactionId);
  return {
    city,
    offset: city.council.offset,
    home: city.homeFactionId,
    faction,
    place: { id: city.id, name: city.name, kind: 'home' },
  };
}

/** The city of the job held (its wage's modifiers, ADR 0030 §6), or null without one. */
export function jobCityOf(content: GameContent, c: Pick<CharacterDoc, 'job'>): string | null {
  if (!c.job) return null;
  const job = content.job(c.job.id);
  return job ? (content.location(job.locationId)?.city.id ?? null) : null;
}

/**
 * Review 4 (ADR 0074 §1, answers §23.1): whose paper the edition is: always the residence city's,
 * wherever the character stands (slice 4's "the Herald for a visitor to the capital" is reversed).
 * Away from home it is read as a local edition, composed at read (`paperService`, `localEdition`).
 */
export function paperCityOf(c: ResidenceSource): string {
  return residenceCityId(c);
}

/**
 * Tech design §7.6: the cities a request depends on (each settled for the day before the
 * character acts): where the character stands (or is travelling to), the residence and the job's
 * city. Distinct, in that order.
 */
export function placesOf(
  content: GameContent,
  c: Pick<CharacterDoc, 'homeCityId' | 'residence' | 'cityId' | 'journey' | 'job'>,
): string[] {
  const here = c.journey?.status === 'onTheWay' ? c.journey.to : c.cityId;
  const ids = [here, residenceCityId(c), jobCityOf(content, c)].filter((x): x is string => !!x);
  return [...new Set(ids)];
}

/**
 * Slice 7 (ADR 0050): a contested council (the capital, Clearwater): one card per party, the
 * largest bloc's rule, a Mayor. `isDistricted` stays the test for districts.
 */
export const isContested = (content: GameContent, cityId: string): boolean =>
  content.city(cityId)?.role === 'battleground';

/** Slice 7 (ADR 0050): the cities beyond the capital and home that anyone may live in (Clearwater). */
export const openResidences = (content: GameContent): string[] =>
  content
    .councilCities()
    .filter((c) => c.role === 'battleground' && !content.isDistricted(c.id))
    .map((c) => c.id);
