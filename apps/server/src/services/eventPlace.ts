import type { CampaignEventType, GameContent } from '@irongate/content';
import { CampaignEvent, City as CityModel, District, isDuplicateKeyError } from '@irongate/db';
import type { CampaignEventDoc, CityDoc, DistrictDoc } from '@irongate/db';
import { randomBytes } from 'node:crypto';
import { FACTION_IDS, fixtureFor, fixtureStartsAt, dayStart, issueTags, missionTarget, placeOf } from '@irongate/rules';
import type { ActionDescriptor, DayKey, FactionId, OpinionShares, PlaceModifiers } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { modifiersFor } from './modifiers';

/**
 * Slice 6 (ADR 0036, 0037; tech design §3.2, §8.2): the shared reads of a Campaign Event's place:
 * its type and venue in content, the place's meter and modifiers, the descriptor the event's roles
 * are seen as (orders, Issue feeds), and the secretary's fixtures (natural-key upserts).
 */

export const placeIdOf = (cityId: string, districtId: string | null): string => districtId ?? cityId;

export function typeOf(content: GameContent, typeId: string): CampaignEventType {
  const t = content.eventType(typeId);
  if (!t) throw new Error(`unknown event type ${typeId}`);
  return t;
}

/** The venue of an event in content (its location, city and quarter). */
export function venueOfEvent(content: GameContent, ev: Pick<CampaignEventDoc, 'typeId' | 'cityId' | 'districtId' | 'venueId'>) {
  const v = content.venueOf(ev.typeId, ev.cityId, ev.districtId);
  if (v && v.location.id === ev.venueId) return v;
  const l = content.location(ev.venueId);
  if (!l) throw new Error(`unknown venue ${ev.venueId}`);
  return { venue: { eventId: ev.typeId, cityId: ev.cityId, districtId: ev.districtId, locationId: ev.venueId }, city: l.city, location: l.location, districtId: ev.districtId };
}

/** The descriptor an event's sign-up and roles are seen as (tech §6.7): the type's `actionType` at the venue. */
export function eventDescriptor(
  content: GameContent,
  ev: Pick<CampaignEventDoc, 'typeId' | 'cityId' | 'districtId' | 'venueId'>,
): ActionDescriptor {
  const type = typeOf(content, ev.typeId);
  const v = venueOfEvent(content, ev);
  return {
    kind: 'event',
    actionId: type.id,
    type: type.actionType,
    locationId: v.location.id,
    cityId: ev.cityId,
    ...(ev.districtId ? { districtId: ev.districtId } : {}),
    locationKind: v.location.kind,
  };
}

export interface EventPlaceRead {
  cityState: CityDoc | null;
  district: DistrictDoc | null;
  shares: OpinionShares;
  homeFactionId: FactionId | null;
  modifiers: PlaceModifiers;
  tagged: Array<{ docId: string; issueId: string; name: string }>;
  placeName: string;
}

/** The place's documents and the modifiers in force for `factionId` on `day` (ADR 0030), in a session or not. */
export async function readEventPlace(
  content: GameContent,
  ev: Pick<CampaignEventDoc, 'typeId' | 'cityId' | 'districtId' | 'venueId' | 'factionId'>,
  day: DayKey,
  session: ClientSession | null,
): Promise<EventPlaceRead> {
  const city = content.city(ev.cityId);
  if (!city) throw new Error(`unknown city ${ev.cityId}`);
  const cq = CityModel.findById(ev.cityId);
  const cityState = await (session ? cq.session(session) : cq).lean<CityDoc>();
  const dq = ev.districtId ? District.findById(ev.districtId) : null;
  const district = dq ? await (session ? dq.session(session) : dq).lean<DistrictDoc>() : null;
  const modifiers = modifiersFor(content, cityState, ev.factionId, day, { cityId: ev.cityId, district });
  const live = placeOf(modifiers)?.issues ?? [];
  const tagged = issueTags(live, eventDescriptor(content, ev)).map((t) => ({
    docId: t.docId,
    issueId: t.issueId,
    name: t.name,
  }));
  const shares = district?.opinion ?? cityState?.opinion ?? city.baselineOpinion;
  return {
    cityState,
    district,
    shares,
    homeFactionId: (ev.districtId ? null : (city.homeFactionId ?? null)) as FactionId | null,
    modifiers,
    tagged,
    placeName: ev.districtId ? (content.district(ev.districtId)?.quarter.name ?? ev.districtId) : city.name,
  };
}

/** The Headline Story's target, frozen at the call (tech §22.1 Q7). */
export function headlineTarget(
  factionId: FactionId,
  place: Pick<EventPlaceRead, 'district' | 'shares'>,
): FactionId {
  if (place.district) {
    return missionTarget('leader', factionId, {
      leader: (place.district.state?.leader ?? null) as FactionId | null,
      shares: place.district.opinion,
    })!;
  }
  const rivals = FACTION_IDS.filter((f) => f !== factionId);
  return [...rivals].sort((a, b) => place.shares[b] - place.shares[a])[0]!;
}

/** The capital's districts by `n` (the fixture's district is `day mod 5` over them). */
export function districtsByN(content: GameContent, cityId: string): string[] | null {
  if (!content.isDistricted(cityId)) return null;
  return [...content.districtsOf(cityId)]
    .sort((a, b) => (a.district?.n ?? 0) - (b.district?.n ?? 0))
    .map((q) => q.id);
}

/**
 * Tech §3.2: the secretary's fixtures of `day` in a council city: the home faction's in a home city,
 * all three in the capital (in one district). A natural-key upsert (`dayIndex: 0`): whoever runs
 * first posts it; E11000 is success. Returns the fixtures of the city for that day.
 */
export async function ensureFixtures(
  content: GameContent,
  cityId: string,
  day: DayKey,
  session?: ClientSession | null,
): Promise<void> {
  const city = content.city(cityId);
  if (!city?.council) return;
  const districts = districtsByN(content, cityId);
  const factions: FactionId[] = districts ? [...FACTION_IDS] : city.homeFactionId ? [city.homeFactionId as FactionId] : [];
  for (const factionId of factions) {
    const f = fixtureFor({ day, factionId, rotation: content.fixtureRotation, districts });
    const venue = content.venueOf(f.typeId, cityId, f.districtId);
    if (!venue) continue;
    const type = typeOf(content, f.typeId);
    const faction = content.faction(factionId);
    const placeId = placeIdOf(cityId, f.districtId);
    const doc: Omit<CampaignEventDoc, '_id' | 'createdAt' | 'updatedAt'> = {
      kind: 'fixture',
      typeId: type.id,
      factionId,
      cityId,
      districtId: f.districtId,
      placeId,
      venueId: venue.location.id,
      day,
      dayIndex: 0,
      calledBy: { kind: 'secretary', npcId: faction.secretary.npcId },
      calledAt: new Date(dayStart(day)),
      startsAt: new Date(fixtureStartsAt(day)),
      targetFactionId: null,
      seed: randomBytes(16).toString('hex'),
      roles: type.roles.map((r) => ({ roleId: r.id, holder: null })),
      hands: [],
      rev: 0,
      status: 'open',
      result: null,
      resolvedAt: null,
    };
    try {
      await CampaignEvent.updateOne(
        { factionId, placeId, day, dayIndex: 0 },
        { $setOnInsert: doc },
        { upsert: true, ...(session ? { session } : {}) },
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  }
}
