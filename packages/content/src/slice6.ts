/**
 * Slice 6 (docs/tech/slice-6.md §4.1–§4.2): the Campaign Events' loader cross-checks and accessors.
 */
import { FACTION_IDS } from '@irongate/rules';
import type { FactionId, HeadlineCondition } from '@irongate/rules';
import type { Asset, CampaignEventType, City, Content, EventVenue, Location, Quarter } from './schemas';

/**
 * Slice 6 copy (15 Oct 2026; design §10, tech §4.1, §11.2): the event headlines' conditions, as the
 * rules' `HeadlineCondition` carries them (phase B). `eventOpenToday` is live (selected at read);
 * the rest are stored by the settlement.
 */
export type EventCondition = Extract<
  HeadlineCondition,
  {
    kind:
      | 'eventOpenToday'
      | 'eventResolvedYesterday'
      | 'eventCalledOffYesterday'
      | 'bailPostedForYesterday'
      | 'bailPostedByYesterday'
      | 'visitedYesterday';
  }
>;

export const EVENT_CONDITION_KINDS = [
  'eventOpenToday',
  'eventResolvedYesterday',
  'eventCalledOffYesterday',
  'bailPostedForYesterday',
  'bailPostedByYesterday',
  'visitedYesterday',
] as const satisfies ReadonlyArray<EventCondition['kind']>;

const EVENT_KINDS = new Set<string>(EVENT_CONDITION_KINDS);

/** A template with an event condition (design §10's forty). */
export const isEventTemplate = (t: { when: ReadonlyArray<{ kind: string }> }): boolean =>
  t.when.some((c) => EVENT_KINDS.has(c.kind));

/**
 * Tech §4.3: the placeholders the event headlines may use besides the base set, resolved on the
 * server from the settlement's facts. `{time}` travels as epoch ms and is formatted by the client in
 * the player's clock (*midnight* for the fixture), as `{until}` is. The developer may move this to
 * the rules package (tech §4.3 names it `EVENT_PLACEHOLDERS` there).
 */
export const EVENT_PLACEHOLDERS = [
  'event',
  'venue',
  'caller',
  'time',
  'open',
  'roles',
  'swing',
  'pc',
  'members',
  'outcome',
  'payer',
  'prisoner',
  'place',
  'iron',
  'visitors',
  'district',
  'faction',
] as const;
export type EventPlaceholder = (typeof EVENT_PLACEHOLDERS)[number];

/** Design §10: the ten event templates every paper carries (by id suffix), the Herald included. */
export const EVENT_HEADLINE_NAMES = [
  'event-today',
  'event-triumph',
  'event-success',
  'event-mixed',
  'event-fiasco',
  'event-city',
  'event-called-off',
  'bail-posted-for',
  'bail-posted-by',
  'visited',
] as const;

/**
 * The ids the server marks *In Print* (as slice 4 marks `hero` and slice 5 `cells`): the reader's own
 * event result, bail posted for them, their visitors.
 */
export const EVENT_IN_PRINT_NAMES = [
  'event-triumph',
  'event-success',
  'event-mixed',
  'event-fiasco',
  'bail-posted-for',
  'visited',
] as const;

/** Design §3: the named roles' Energy totals per type (hands add 5 each). */
export const EVENT_ENERGY_TOTALS: Readonly<Record<string, number>> = {
  'event.rally': 45,
  'event.canvass-drive': 40,
  'event.poster-night': 30,
  'event.grand-rally': 55,
  'event.general-strike': 50,
  'event.headline-story': 45,
  /** Slice 7 (design §10.4): the Town Hall, the seventh (its other numbers in slice7Problems). */
  'event.town-hall': 50,
};

const SIGNATURE: Readonly<Record<FactionId, { id: string; special: CampaignEventType['special'] }>> = {
  vanguard: { id: 'event.grand-rally', special: 'heatInRivalHeld' },
  collective: { id: 'event.general-strike', special: 'doubleMomentum' },
  alliance: { id: 'event.headline-story', special: 'againstLeader' },
};

const TEXT_MAX_CHARS = 240;
const TEXT_MAX_SENTENCES = 4;

export function slice6Problems(
  content: Content,
  idx: {
    cityById: Map<string, City>;
    locationById: Map<string, { city: City; location: Location }>;
    assetById: Map<string, Asset>;
    sentenceCount: (text: string) => number;
  },
): string[] {
  const problems: string[] = [];
  const types = content.campaignEventTypes;
  const typeById = new Map(types.map((t) => [t.id, t]));
  if (typeById.size !== types.length) problems.push('campaignEventTypes: duplicate ids');

  // Types: one signature event per faction with its special; the common three have neither.
  for (const f of FACTION_IDS) {
    const own = types.filter((t) => t.factionId === f);
    if (own.length !== 1 || own[0]!.id !== SIGNATURE[f].id)
      problems.push(`campaignEventTypes: ${f} needs exactly one signature event (${SIGNATURE[f].id})`);
    else if (own[0]!.special !== SIGNATURE[f].special)
      problems.push(`${own[0]!.id}: its special must be ${SIGNATURE[f].special}`);
  }
  for (const t of types) {
    const where = `campaignEventTypes.${t.id}`;
    // Slice 7 (design §10.4): the Town Hall is common and adds the townspeople's signatures.
    if (t.factionId === undefined && t.special !== undefined && t.special !== 'petitionSignatures')
      problems.push(`${where}: a common event has no special`);
    const roleIds = new Set(t.roles.map((r) => r.id));
    if (roleIds.size !== t.roles.length) problems.push(`${where}: duplicate role ids`);
    for (const r of t.roles)
      if (r.stats.includes('best' as never) && r.stats.length !== 1)
        problems.push(`${where}.${r.id}: a best role has exactly ['best']`);
    const total = t.roles.reduce((s, r) => s + r.energy, 0);
    const want = EVENT_ENERGY_TOTALS[t.id];
    if (want === undefined) problems.push(`${where}: not one of design §3's six events (or slice 7's Town Hall)`);
    else if (total !== want) problems.push(`${where}: the roles' Energy is ${total}, design §3 says ${want}`);
    if (t.difficulty.capital !== t.difficulty.home + 2) problems.push(`${where}: the capital's difficulty is the home's + 2`);
    const art = idx.assetById.get(t.art);
    if (!art) problems.push(`${where}: unknown art "${t.art}"`);
    else if (art.kind !== 'scene') problems.push(`${where}: art "${t.art}" is a ${art.kind}, not a scene`);
    for (const [band, text] of Object.entries(t.text)) {
      if (text.body.length > TEXT_MAX_CHARS) problems.push(`${where}.${band} is ${text.body.length} characters (at most 240)`);
      const n = idx.sentenceCount(text.body);
      if (n > TEXT_MAX_SENTENCES) problems.push(`${where}.${band} has ${n} sentences (at most 4)`);
    }
  }

  // Venues.
  const seen = new Set<string>();
  const capitalOf = new Map<string, Set<string>>();
  for (const v of content.eventVenues) {
    const where = `eventVenues ${v.eventId}@${v.locationId}`;
    const t = typeById.get(v.eventId);
    if (!t) {
      problems.push(`${where}: unknown event`);
      continue;
    }
    const city = idx.cityById.get(v.cityId);
    if (!city) {
      problems.push(`${where}: unknown city "${v.cityId}"`);
      continue;
    }
    const loc = idx.locationById.get(v.locationId);
    if (!loc) {
      problems.push(`${where}: unknown location`);
      continue;
    }
    if (loc.city.id !== v.cityId) problems.push(`${where}: the location is not in ${v.cityId}`);
    const quarter = city.quarters.find((q) => q.id === loc.location.quarterId);
    const districted = city.quarters.some((q) => q.district);
    if (districted) {
      if (v.districtId === null) problems.push(`${where}: a capital venue names its district`);
      else if (loc.location.quarterId !== v.districtId) problems.push(`${where}: the location is not in ${v.districtId}`);
    } else if (v.districtId !== null) problems.push(`${where}: only the capital's venues have a district`);
    if (!quarter || !firstQuarterOrDistrict(quarter))
      problems.push(`${where}: a venue is in a first quarter or a district (no second quarter)`);
    if (!t.venueKinds.includes(loc.location.kind))
      problems.push(`${where}: a ${loc.location.kind} is not one of the event's kinds`);
    const key = `${v.eventId}|${v.cityId}|${v.districtId ?? ''}`;
    if (seen.has(key)) problems.push(`${where}: two venues for one event and place`);
    seen.add(key);
    // No venue on rival ground for its callers: a home city serves its home faction only.
    if (city.homeFactionId && t.factionId && t.factionId !== city.homeFactionId)
      problems.push(`${where}: a signature event of the ${t.factionId} on another faction's home ground`);
    if (districted && t.factionId) {
      const set = capitalOf.get(t.id) ?? new Set<string>();
      set.add(v.districtId ?? '');
      capitalOf.set(t.id, set);
    }
  }
  for (const city of content.cities) {
    const districted = city.quarters.some((q) => q.district);
    const common = types.filter((t) => t.factionId === undefined);
    if (districted) {
      for (const q of city.quarters.filter((x) => x.district))
        for (const t of common)
          if (!seen.has(`${t.id}|${city.id}|${q.id}`)) problems.push(`eventVenues: ${t.id} has no venue in ${q.id}`);
    } else if (city.homeFactionId) {
      for (const t of [...common, ...types.filter((x) => x.factionId === city.homeFactionId)])
        if (!seen.has(`${t.id}|${city.id}|`)) problems.push(`eventVenues: ${t.id} has no venue in ${city.id}`);
    }
  }
  for (const f of FACTION_IDS) {
    const n = capitalOf.get(SIGNATURE[f].id)?.size ?? 0;
    if (n !== 1) problems.push(`eventVenues: ${SIGNATURE[f].id} needs exactly one capital district (has ${n})`);
  }

  // The papers (design §10): every paper carries the ten event templates, with event conditions only.
  for (const city of content.cities) {
    if (!city.paper) continue;
    const names = new Set(
      content.headlines
        .filter((h) => h.cityId === city.id && isEventTemplate(h))
        .map((h) => h.id.slice(h.id.lastIndexOf('.') + 1)),
    );
    for (const n of EVENT_HEADLINE_NAMES) if (!names.has(n)) problems.push(`cities.${city.id}: the paper has no "${n}" headline`);
  }
  for (const h of content.headlines) {
    if (isEventTemplate(h) && !h.when.every((c) => EVENT_KINDS.has(c.kind)))
      problems.push(`headline "${h.id}" mixes event and other conditions`);
  }

  // The fixture's rotation names the three common events.
  const common = new Set(types.filter((t) => t.factionId === undefined).map((t) => t.id));
  if (new Set(content.fixtureRotation).size !== 3 || content.fixtureRotation.some((id) => !common.has(id)))
    problems.push('fixtureRotation: the three common events, once each');

  // Orders: an `event` kind never sits beside another kind; a faction has at most one event template.
  for (const t of content.orderTemplates) {
    const kinds = t.match.kinds ?? [];
    if (kinds.includes('event') && kinds.length > 1) problems.push(`order "${t.id}": an event kind stands alone`);
  }
  for (const f of FACTION_IDS) {
    const n = content.orderTemplates.filter((t) => t.factionId === f && t.match.kinds?.includes('event')).length;
    if (n > 1) problems.push(`orders: the ${f} has ${n} event templates (at most one)`);
  }
  return problems;
}

const firstQuarterOrDistrict = (q: Quarter): boolean =>
  q.district !== undefined || q.opens === undefined || ('level' in q.opens && q.opens.level === 1);

export interface LocatedVenue {
  venue: EventVenue;
  city: City;
  location: Location;
  districtId: string | null;
}

/** The `GameContent` accessors of tech §4.1. */
export function eventIndex(
  content: Content,
  locate: (id: string) => { city: City; location: Location } | undefined,
): {
  eventType(id: string): CampaignEventType | undefined;
  eventTypes(): CampaignEventType[];
  eventTypesFor(factionId: FactionId): CampaignEventType[];
  venueOf(eventId: string, cityId: string, districtId: string | null): LocatedVenue | undefined;
  venuesAt(locationId: string): LocatedVenue[];
  chatCities(factionId: FactionId): string[];
} {
  const byId = new Map(content.campaignEventTypes.map((t) => [t.id, t]));
  const located = content.eventVenues.flatMap((venue) => {
    const l = locate(venue.locationId);
    return l ? [{ venue, city: l.city, location: l.location, districtId: venue.districtId }] : [];
  });
  const capital = content.cities.find((c) => c.quarters.some((q) => q.district));
  return {
    eventType: (id) => byId.get(id),
    eventTypes: () => content.campaignEventTypes,
    eventTypesFor: (f) => content.campaignEventTypes.filter((t) => t.factionId === undefined || t.factionId === f),
    venueOf: (eventId, cityId, districtId) =>
      located.find(
        (x) => x.venue.eventId === eventId && x.venue.cityId === cityId && x.venue.districtId === districtId,
      ),
    venuesAt: (locationId) => located.filter((x) => x.venue.locationId === locationId),
    // Tech §22.1 Q11: the faction's home city and the capital; slice 7 (§22.1 Q6): every faction's
    // branch in Clearwater (a battleground on one meter, open to all three).
    chatCities: (f) => {
      const home = content.factions.find((x) => x.id === f)?.homeCityId;
      const lakes = content.cities.filter(
        (c) => c.role === 'battleground' && c.council !== undefined && c.id !== capital?.id,
      );
      return [...(home ? [home] : []), ...(capital ? [capital.id] : []), ...lakes.map((c) => c.id)];
    },
  };
}
