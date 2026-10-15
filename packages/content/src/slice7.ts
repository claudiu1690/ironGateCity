import {
  FACTION_IDS,
  NATIONAL_PLACEHOLDERS,
  NATION_ACTS,
  NATION_PERSONAL_PLACEHOLDERS,
  NATION_RESULT_PLACEHOLDERS,
  POLITICAL_PLACEHOLDERS,
  TIME_TOKENS,
  isFactional,
  isNationTemplate,
  placeholdersIn,
} from '@irongate/rules';
import type { FactionId, LawSpec } from '@irongate/rules';
import type { Asset, City, Content, Faction, Law, Location, OrderTemplate } from './schemas';

/**
 * Slice 7 (docs/tech/slice-7.md §4.2): the loader's cross-checks for the nation. The slice-7 data is
 * written by the designer (T7 Clearwater, T8 the nation) after these schemas; until it lands, each
 * check applies only to what is present (the new arrays empty, the new faction fields absent), and a
 * set that is started must be complete.
 */

/** Design §7.2: the catalogue's size. */
export const LAW_COUNT = 13;

/** Design §8 (GDD §14.8): the republic's weights. */
export const NATIONAL_WEIGHTS: Readonly<Record<string, number>> = {
  irongate: 0.4,
  clearwater: 0.3,
  coalport: 0.1,
  duskwall: 0.1,
  ashford: 0.1,
};

/** Design §8 (§21 #5, settled): Clearwater's evened baseline. */
export const CLEARWATER_BASELINE = { vanguard: 22, collective: 22, alliance: 22, neutral: 34 } as const;

/** Design §10.4, §23.6: the Town Hall. */
export const TOWN_HALL_ID = 'event.town-hall';
export const TOWN_HALL_SPEC = { energy: 50, baseSwing: 1.2, difficulty: { home: 12, capital: 14 } } as const;
export const TOWN_HALL_VENUE_KINDS = ['square', 'university', 'court', 'theatre', 'hotel', 'library', 'faction-hq'] as const;

/** The faction fields slice 7 adds; all or none (T8 lands them together). */
const FACTION_NATION_FIELDS = [
  'nationalFigure',
  'pickName',
  'chairPlatforms',
  'preferredLaws',
  'localDeputies',
  'house',
] as const satisfies ReadonlyArray<keyof Faction>;

const ALLOWED_NATIONAL = new Set<string>(NATIONAL_PLACEHOLDERS);
const ALLOWED_PERSONAL = new Set<string>(NATION_PERSONAL_PLACEHOLDERS);
const ALLOWED_RESULT = new Set<string>([...POLITICAL_PLACEHOLDERS, ...TIME_TOKENS, ...NATION_RESULT_PLACEHOLDERS]);

/** A law as the rules read it. */
export const lawSpecOf = (l: Law): LawSpec => ({
  id: l.id,
  name: l.name,
  factionId: l.factionId,
  effects: l.effects,
  days: l.days,
});

/** Design §7.2's *Needs*: 36 for a factional law, else 31 (the loader computes it, the bills use it). */
export const lawNeeds = (l: Pick<Law, 'effects'>): 31 | 36 => (isFactional(l) ? 36 : 31);

/** Is this a push template (the Chair's push, ADR 0046)? */
export const isPushTemplate = (t: Pick<OrderTemplate, 'use'>): boolean => t.use === 'push';

export function slice7Problems(
  content: Content,
  idx: {
    cityById: Map<string, City>;
    locationById: Map<string, { city: City; location: Location }>;
    assetById: Map<string, Asset>;
  },
): string[] {
  const problems: string[] = [];
  const lawIds = new Set<string>();

  // Laws (design §7.2, ADR 0044). Bounds, kinds and `appliesTo` are the schema's.
  if (content.laws.length > 0 && content.laws.length !== LAW_COUNT)
    problems.push(`laws: ${content.laws.length} laws, the catalogue has ${LAW_COUNT}`);
  for (const l of content.laws) {
    if (lawIds.has(l.id)) problems.push(`laws: duplicate id "${l.id}"`);
    lawIds.add(l.id);
  }

  // Factions (design §4.6, §6.5, §7.3, §23.5): the slice-7 fields, all or none, on every faction.
  const withNation = content.factions.filter((f) => FACTION_NATION_FIELDS.some((k) => f[k] !== undefined));
  if (withNation.length > 0) {
    for (const f of content.factions)
      for (const k of FACTION_NATION_FIELDS)
        if (f[k] === undefined) problems.push(`factions.${f.id}: slice 7's "${k}" is missing`);
  }
  const deputyIds = new Set<string>();
  const deputyNames = new Set<string>();
  const platformIds = new Set<string>();
  for (const f of content.factions) {
    const where = `factions.${f.id}`;
    if (f.nationalFigure) {
      const a = idx.assetById.get(f.nationalFigure.portrait);
      if (!a) problems.push(`${where}.nationalFigure: unknown portrait "${f.nationalFigure.portrait}"`);
      else if (a.kind !== 'portrait') problems.push(`${where}.nationalFigure: "${a.id}" is a ${a.kind}, not a portrait`);
    }
    for (const id of f.preferredLaws ?? []) {
      if (content.laws.length > 0 && !lawIds.has(id)) problems.push(`${where}.preferredLaws: "${id}" is not a law`);
      const law = content.laws.find((l) => l.id === id);
      if (law && law.factionId !== f.id) problems.push(`${where}.preferredLaws: "${id}" is the ${law.factionId}'s law`);
    }
    if (f.preferredLaws && new Set(f.preferredLaws).size !== f.preferredLaws.length)
      problems.push(`${where}.preferredLaws: a law named twice`);
    for (const d of f.localDeputies ?? []) {
      if (deputyIds.has(d.npcId)) problems.push(`${where}.localDeputies: duplicate id "${d.npcId}"`);
      deputyIds.add(d.npcId);
      if (deputyNames.has(d.name)) problems.push(`${where}.localDeputies: duplicate name "${d.name}"`);
      deputyNames.add(d.name);
      const prefix = `npc.${f.id[0]}.dep.`;
      if (!d.npcId.startsWith(prefix)) problems.push(`${where}.localDeputies: "${d.npcId}" is not ${prefix}{surname}`);
    }
    for (const p of f.chairPlatforms ?? []) {
      if (platformIds.has(p.id)) problems.push(`${where}.chairPlatforms: duplicate id "${p.id}"`);
      platformIds.add(p.id);
    }
    if (f.house) {
      const at = idx.locationById.get(f.house.locationId);
      if (!at) problems.push(`${where}.house: unknown location "${f.house.locationId}"`);
      else if (at.location.kind !== 'faction-hq' || at.location.factionId !== f.id || at.city.id !== 'irongate')
        problems.push(`${where}.house: "${f.house.locationId}" is not the ${f.id}'s house in the capital`);
    }
  }

  // Cities (design §8, §9.1): the weights, Clearwater's council and baseline, the nation's entry.
  const council = content.cities.filter((c) => c.council);
  const weighted = council.filter((c) => c.nationalWeight !== undefined);
  if (weighted.length > 0) {
    for (const c of council)
      if (c.nationalWeight === undefined) problems.push(`cities.${c.id}: no nationalWeight`);
      else if (NATIONAL_WEIGHTS[c.id] !== undefined && Math.abs(c.nationalWeight - NATIONAL_WEIGHTS[c.id]!) > 1e-9)
        problems.push(`cities.${c.id}: nationalWeight ${c.nationalWeight}, design §8 says ${NATIONAL_WEIGHTS[c.id]}`);
    const nationIds = content.nation.cities.map((n) => n.cityId);
    if (nationIds.every((id) => idx.cityById.get(id)?.nationalWeight !== undefined)) {
      const sum = nationIds.reduce((s, id) => s + (idx.cityById.get(id)?.nationalWeight ?? 0), 0);
      if (Math.abs(sum - 1) > 1e-9) problems.push(`cities: the national weights sum to ${sum}, not 1`);
    }
  }
  for (const c of content.cities) {
    if (c.council?.listSize !== undefined && c.role !== 'battleground')
      problems.push(`cities.${c.id}: a listSize only on a contested council`);
    if (c.nationalWeight !== undefined && !c.council) problems.push(`cities.${c.id}: a nationalWeight without a council`);
  }
  const clearwater = idx.cityById.get('clearwater');
  if (clearwater) {
    const where = 'cities.clearwater';
    if (clearwater.role !== 'battleground') problems.push(`${where}: a battleground`);
    if (clearwater.council?.offset !== 4) problems.push(`${where}: council offset 4`);
    if (clearwater.council?.seats !== 7) problems.push(`${where}: seven seats`);
    if (clearwater.council?.listSize !== 3) problems.push(`${where}: lists of three`);
    const b = clearwater.baselineOpinion;
    if (FACTION_IDS.some((f) => b[f] !== CLEARWATER_BASELINE[f]) || b.neutral !== CLEARWATER_BASELINE.neutral)
      problems.push(`${where}: the baseline is design §8's 22 / 22 / 22 / 34`);
    if (clearwater.quarters.some((q) => q.frame || q.outline || q.label || q.district))
      problems.push(`${where}: a one-map city (no frames, outlines, labels or districts; review 4)`);
    const entry = content.nation.cities.find((n) => n.cityId === 'clearwater');
    if (entry?.service !== 'open') problems.push('nation.cities.clearwater: service "open" (slice 7)');
    if (entry?.baselineOpinion !== undefined)
      problems.push('nation.cities.clearwater: no baselineOpinion of its own (the city carries it)');
  }

  // Party orders (ADR 0046, design §23.2–§23.4).
  const push = content.orderTemplates.filter(isPushTemplate);
  if (push.length > 0) {
    for (const f of FACTION_IDS)
      for (const slot of ['A', 'B'] as const) {
        const n = push.filter((t) => t.factionId === f && t.slot === slot).length;
        if (n !== 1) problems.push(`orders: the ${f} has ${n} push templates in slot ${slot}, not 1`);
      }
  }
  for (const t of push) {
    const where = `order "${t.id}"`;
    if (t.slot === 'C') problems.push(`${where}: a push template is in slot A or B`);
    if (t.match.cityId !== 'push') problems.push(`${where}: a push template matches cityId 'push'`);
    if (!placeholdersIn(t.title).includes('place')) problems.push(`${where}: a push template's title names {place}`);
    if (t.family !== undefined) problems.push(`${where}: a push template has no family`);
  }
  for (const t of content.orderTemplates) {
    const pushMatch = t.match.cityId === 'push' || t.match.districtId === 'push';
    if (pushMatch && !isPushTemplate(t)) problems.push(`order "${t.id}": only a push template matches 'push'`);
    if (t.family !== undefined && (t.use ?? 'rotation') !== 'rotation')
      problems.push(`order "${t.id}": only a rotation template has a family`);
  }
  const familyKeys = new Set<string>();
  for (const t of content.orderTemplates) {
    if (t.family === undefined) continue;
    const residences = t.residence === 'any' ? ['home', 'capital', 'clearwater'] : [t.residence ?? 'home'];
    for (const r of residences) {
      const key = `${t.factionId}|${t.slot}|${r}|${t.family}`;
      if (familyKeys.has(key))
        problems.push(`order "${t.id}": two templates of family "${t.family}" for the ${t.factionId} in slot ${t.slot} (${r})`);
      familyKeys.add(key);
    }
  }
  const lake = content.orderTemplates.filter((t) => t.residence === 'clearwater');
  if (lake.length > 0) {
    for (const f of FACTION_IDS) {
      const a = lake.filter((t) => t.factionId === f && t.slot === 'A' && (t.use ?? 'rotation') === 'rotation').length;
      const b = lake.filter((t) => t.factionId === f && t.slot === 'B' && (t.use ?? 'rotation') === 'rotation').length;
      if (a !== 1 || b !== 2) problems.push(`orders: the ${f}'s Clearwater rotation is A ${a} · B ${b}, design §23.4 says 1 · 2`);
    }
    if (lake.some((t) => t.slot === 'C')) problems.push('orders: slot C is the shared set (no Clearwater twin)');
  }

  // Events (design §10.4, §23.6): the Town Hall, the seventh.
  const types = content.campaignEventTypes;
  const townHall = types.find((t) => t.id === TOWN_HALL_ID);
  if (types.length === 7 && !townHall) problems.push(`campaignEventTypes: the seventh is ${TOWN_HALL_ID}`);
  for (const t of types)
    if (t.special === 'petitionSignatures' && t.id !== TOWN_HALL_ID)
      problems.push(`${t.id}: only the Town Hall adds signatures`);
  if (townHall) {
    const where = `campaignEventTypes.${TOWN_HALL_ID}`;
    if (townHall.special !== 'petitionSignatures') problems.push(`${where}: special "petitionSignatures"`);
    if (townHall.factionId !== undefined) problems.push(`${where}: a common event`);
    const energy = townHall.roles.reduce((s, r) => s + r.energy, 0);
    if (energy !== TOWN_HALL_SPEC.energy) problems.push(`${where}: the roles' Energy is ${energy}, design §10.4 says 50`);
    if (townHall.baseSwing !== TOWN_HALL_SPEC.baseSwing) problems.push(`${where}: base swing 1.2`);
    if (
      townHall.difficulty.home !== TOWN_HALL_SPEC.difficulty.home ||
      townHall.difficulty.capital !== TOWN_HALL_SPEC.difficulty.capital
    )
      problems.push(`${where}: difficulty 12 / 14`);
    for (const k of townHall.venueKinds)
      if (!(TOWN_HALL_VENUE_KINDS as readonly string[]).includes(k)) problems.push(`${where}: "${k}" is not a hall's kind`);
  }
  if (clearwater) {
    // Design §23.6: the Town Hall and the three common events have a venue in Clearwater; no signature event.
    const common = types.filter((t) => t.factionId === undefined);
    for (const t of common)
      if (!content.eventVenues.some((v) => v.eventId === t.id && v.cityId === 'clearwater'))
        problems.push(`eventVenues: ${t.id} has no venue in clearwater`);
    for (const v of content.eventVenues)
      if (v.cityId === 'clearwater' && types.find((t) => t.id === v.eventId)?.factionId !== undefined)
        problems.push(`eventVenues: no signature event in clearwater in slice 7 (${v.eventId})`);
  }

  // Headlines (design §11): the national lines and the personal national lines' placeholders.
  const lineIds = new Set<string>();
  for (const l of content.nationalLines) {
    if (lineIds.has(l.id)) problems.push(`nationalLines: duplicate id "${l.id}"`);
    lineIds.add(l.id);
    for (const p of placeholdersIn(`${l.headline} ${l.deck}`))
      if (!ALLOWED_NATIONAL.has(p)) problems.push(`nationalLines "${l.id}": unknown national placeholder {${p}}`);
  }
  for (const h of content.headlines) {
    if (!isNationTemplate(h)) continue;
    for (const p of placeholdersIn(`${h.headline} ${h.deck ?? ''}`))
      if (!ALLOWED_PERSONAL.has(p)) problems.push(`headline "${h.id}": unknown national placeholder {${p}}`);
  }

  // The result modals (design §12, §23.7): all of slice 7's together, with their placeholders.
  const results = content.politics.results as Record<string, { headline: string; body: string; next: string } | undefined>;
  const present = NATION_ACTS.filter((a) => results[a] !== undefined);
  if (present.length > 0)
    for (const a of NATION_ACTS) if (results[a] === undefined) problems.push(`politics.results.${a} is missing`);
  for (const a of present) {
    const t = results[a]!;
    for (const p of placeholdersIn(`${t.headline} ${t.body} ${t.next}`))
      if (!ALLOWED_RESULT.has(p)) problems.push(`politics.results.${a}: unknown placeholder {${p}}`);
  }

  // Art (tech design §13): the nation's scenes.
  const ns = content.art.nationScenes;
  if (ns)
    for (const [use, id] of Object.entries(ns)) {
      const a = idx.assetById.get(id);
      if (!a) problems.push(`art.nationScenes.${use}: unknown asset "${id}"`);
      else if (a.kind !== 'scene') problems.push(`art.nationScenes.${use}: "${id}" is a ${a.kind}, not a scene`);
    }

  return problems;
}

/** The faction of a law id's party, for the accessors. */
export const lawsOfFaction = (laws: readonly Law[], f: FactionId): Law[] => laws.filter((l) => l.factionId === f);
