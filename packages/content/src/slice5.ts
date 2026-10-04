import { FACTION_IDS, MISSION_TYPES, MISSION_TYPE_IDS, missionDifficulty, placeholdersIn } from '@irongate/rules';
import { inPolygon } from './geometry';
import type { Asset, City, Content, Location, MapPins } from './schemas';

/**
 * Slice 5 (docs/tech/slice-5.md §4.2): the loader's cross-checks for the second quarters, the
 * services, the missions, the opponents, the hostile cards, the orders, the papers and the art.
 */

/** Design §14: the ten risk templates every home paper carries (by id suffix). */
export const RISK_HEADLINE_NAMES = [
  'quarter-open',
  'mission-first',
  'seen',
  'name-taken',
  'cells',
  'infirmary',
  'record-up',
  'rival-trip',
  'deported',
  'rival-pressure',
] as const;

/** Design §14 (§23.6 #6): the Herald's eight (no second quarter, no home faction). */
export const HERALD_RISK_HEADLINE_NAMES = RISK_HEADLINE_NAMES.filter(
  (n) => n !== 'quarter-open' && n !== 'rival-pressure',
);

/** Screens §10: quarter names at least this far apart on a home city's overview. */
export const LABEL_MIN_DISTANCE = 0.25;

const isDistricted = (city: City): boolean => city.quarters.some((q) => q.district !== undefined);

/** No point of a fine grid lies in two outlines, and no vertex of one lies strictly inside another. */
export function outlinesOverlap(
  A: ReadonlyArray<readonly [number, number]>,
  B: ReadonlyArray<readonly [number, number]>,
): boolean {
  if (A.some(([x, y]) => inPolygon({ x, y }, B, true)) || B.some(([x, y]) => inPolygon({ x, y }, A, true)))
    return true;
  for (let i = 1; i < 200; i++)
    for (let j = 1; j < 200; j++) {
      const p = { x: i / 200, y: j / 200 };
      if (inPolygon(p, A, true) && inPolygon(p, B, true)) return true;
    }
  return false;
}

export function slice5Problems(
  content: Content,
  idx: {
    cityById: Map<string, City>;
    locationById: Map<string, { city: City; location: Location }>;
    assetById: Map<string, Asset>;
    mapPins: MapPins;
  },
): string[] {
  const problems: string[] = [];
  const opponentById = new Map(content.opponents.map((o) => [o.id, o]));

  // Quarters (ADR 0035).
  for (const city of content.cities) {
    const qs = city.quarters;
    if (city.role === 'home') {
      const want = [{ level: 1 }, { level: 6 }, { edition: 'later' }];
      if (qs.length !== 3 || qs.some((q, i) => JSON.stringify(q.opens ?? { level: 1 }) !== JSON.stringify(want[i])))
        problems.push(`cities.${city.id}: a home city has three quarters opening at Level 1, Level 6 and a later edition`);
      for (const q of qs.slice(1)) if (!q.teaser) problems.push(`${q.id}: a locked quarter needs a teaser`);
    } else if (qs.some((q) => q.opens !== undefined && JSON.stringify(q.opens) !== JSON.stringify({ level: 1 }))) {
      problems.push(`cities.${city.id}: the capital's districts are open from Level 1`);
    }
    if (qs.length < 2) continue;
    for (const q of qs) {
      if (!q.outline) problems.push(`${q.id}: a quarter of a city with two or more needs an outline`);
      if (!q.label) problems.push(`${q.id}: a quarter of a city with two or more needs a label`);
      if (q.outline && q.label && !inPolygon(q.label, q.outline)) problems.push(`${q.id}: its label is outside its outline`);
    }
    // Every pin inside its own quarter's outline: the content's places, and (a teaser's places are
    // not content yet) the survey's pins of the quarter by number.
    for (const l of city.locations) {
      const q = qs.find((x) => x.id === l.quarterId);
      if (q?.outline && !inPolygon(l.map, q.outline))
        problems.push(`location "${l.id}": its pin is outside ${q.id}'s outline`);
    }
    if (city.role === 'home') {
      for (const pin of idx.mapPins[city.id]?.pins ?? []) {
        const q = qs[pin.quarter - 1];
        if (q?.outline && !inPolygon(pin, q.outline))
          problems.push(`survey pin "${pin.id}": outside ${q.id}'s outline`);
      }
    }
    for (let a = 0; a < qs.length; a++)
      for (let b = a + 1; b < qs.length; b++) {
        const A = qs[a]!.outline;
        const B = qs[b]!.outline;
        if (A && B && outlinesOverlap(A, B)) problems.push(`${qs[a]!.id} and ${qs[b]!.id}: their outlines overlap`);
        const la = qs[a]!.label;
        const lb = qs[b]!.label;
        if (city.role === 'home' && la && lb && Math.hypot(la.x - lb.x, la.y - lb.y) < LABEL_MIN_DISTANCE)
          problems.push(`${qs[a]!.id} and ${qs[b]!.id}: their labels are under ${LABEL_MIN_DISTANCE} apart`);
      }
  }

  // Services (design §8.1, §9.2): every council city's cells and infirmary.
  for (const city of content.cities) {
    if (!city.council) continue;
    if (!city.services) {
      problems.push(`cities.${city.id}: a council city needs its services (cells, infirmary)`);
      continue;
    }
    const cells = idx.locationById.get(city.services.cells);
    const infirmary = idx.locationById.get(city.services.infirmary);
    const cellsKinds = isDistricted(city) ? ['jail', 'ministry'] : ['jail'];
    if (!cells || cells.city.id !== city.id || !cellsKinds.includes(cells.location.kind))
      problems.push(`cities.${city.id}.services.cells must be a ${cellsKinds.join(' or ')} place of ${city.id}`);
    if (!infirmary || infirmary.city.id !== city.id || infirmary.location.kind !== 'hospital')
      problems.push(`cities.${city.id}.services.infirmary must be a hospital of ${city.id}`);
    for (const id of city.runInPool ?? [])
      if (!opponentById.has(id)) problems.push(`cities.${city.id}.runInPool: unknown opponent "${id}"`);
    if (city.role === 'home' && !city.runInPool) problems.push(`cities.${city.id}: a home city needs a runInPool`);
  }
  // Every jail and hospital place has exactly its two ordinary tickets.
  for (const city of content.cities)
    for (const l of city.locations)
      if ((l.kind === 'jail' || l.kind === 'hospital') && l.actions.length !== 2)
        problems.push(`location "${l.id}": a ${l.kind} has exactly two tickets`);

  // Missions (design §4–§5, ADR 0031).
  for (const city of content.cities) {
    for (const l of city.locations) {
      for (const m of l.missions ?? []) {
        const where = `mission "${m.id}"`;
        const spec = MISSION_TYPES[m.type];
        if (m.energy !== spec.energy) problems.push(`${where}: Energy ${m.energy} is not the type's ${spec.energy}`);
        const diff = missionDifficulty(m.level, city.role);
        if (m.difficulty !== diff) problems.push(`${where}: difficulty ${m.difficulty} is not the ladder's ${diff}`);
        if (spec.illegal) {
          if (m.requires?.rank !== 3) problems.push(`${where}: an illegal mission needs Rank 3`);
          if (!m.target) problems.push(`${where}: an illegal mission needs a target`);
        } else {
          if (m.requires?.rank !== undefined) problems.push(`${where}: a legal mission needs no Rank`);
          if (m.target) problems.push(`${where}: a legal mission has no target`);
        }
        if (m.target === 'leader' && !isDistricted(city)) problems.push(`${where}: \`leader\` only in a city with districts`);
        if (l.kind === 'faction-hq' && m.target && m.target !== l.factionId)
          problems.push(`${where}: a mission at an HQ targets that HQ's faction`);
        // The design's pools may be only the target's own people (the Collective's stewards at its
        // stair meeting); the run-in drops the actor's side and falls back to the police (tech design
        // Deviations: the "not only the target's side" check is dropped).
        for (const id of m.pool) if (!opponentById.has(id)) problems.push(`${where}: unknown opponent "${id}"`);
        const ways = m.ways.map((w) => w.id);
        if (new Set(ways).size !== ways.length) problems.push(`${where}: duplicate way ids`);
        if (m.ways.filter((w) => w.stats[0] === 'best').length > 1) problems.push(`${where}: at most one best way`);
        if (m.card) {
          const a = idx.assetById.get(m.card);
          if (!a || a.kind !== 'scene') problems.push(`${where}: its card must be a scene`);
        }
        for (const p of placeholdersIn(`${m.name} ${m.briefing}`))
          problems.push(`${where}: no placeholder in a mission ({${p}})`);
      }
    }
  }

  // Opponents (design §10.2, §10.6).
  const opponentIds = new Set<string>();
  for (const o of content.opponents) {
    if (opponentIds.has(o.id)) problems.push(`duplicate opponent "${o.id}"`);
    opponentIds.add(o.id);
    if ((o.payOff === null) !== (o.lines.paid === undefined))
      problems.push(`opponent "${o.id}": won't be bought exactly when there is no paid line`);
    const a = idx.assetById.get(o.portrait);
    if (!a || a.kind !== 'portrait') problems.push(`opponent "${o.id}": its portrait must be a portrait`);
  }
  if (content.opponents.filter((o) => o.side === 'police').length !== 1)
    problems.push('opponents: exactly one is the police');

  // The hostile deck (design §11.4).
  const ordinary = content.journeyEvents.filter((j) => j.deck === 'ordinary');
  const hostile = content.journeyEvents.filter((j) => j.deck === 'hostile');
  if (ordinary.length !== 7) problems.push(`journeyEvents: ${ordinary.length} ordinary cards, not 7`);
  if (hostile.length !== 4) problems.push(`journeyEvents: ${hostile.length} hostile cards, not 4`);
  if (!hostile.some((j) => j.id === 'jev.checkpoint' && j.first)) problems.push('journeyEvents: jev.checkpoint is the hostile deck\'s first');
  const listed = hostile.filter((j) => j.heatAtLeast !== undefined);
  if (listed.length !== 1 || listed[0]!.id !== 'jev.listed' || listed[0]!.heatAtLeast !== 50 || listed[0]!.first)
    problems.push('journeyEvents: jev.listed alone has heatAtLeast 50, outside the rotation');
  for (const j of content.journeyEvents) {
    if (j.deck === 'ordinary' && (j.heatAtLeast !== undefined || j.ignoreEffects))
      problems.push(`${j.id}: only a hostile card has heatAtLeast or ignoreEffects`);
    for (const c of j.choices) {
      if (c.gate && j.deck !== 'hostile') problems.push(`${j.id}.${c.id}: a gate is on the hostile deck`);
      if (c.cost && !c.stats && c.partial && !c.gate) problems.push(`${j.id}.${c.id}: a paid unchecked choice has no partial`);
    }
  }

  // Orders (design §12.2): one slot-B mission order per faction.
  for (const f of FACTION_IDS) {
    const mission = content.orderTemplates.filter((t) => t.factionId === f && t.minLevel !== undefined);
    const ok =
      mission.length === 1 &&
      mission[0]!.minLevel === 6 &&
      mission[0]!.slot === 'B' &&
      mission[0]!.residence === 'any' &&
      mission[0]!.match.cityId === 'home' &&
      mission[0]!.match.kinds?.join() === 'mission' &&
      Object.keys(mission[0]!.match).length === 2;
    if (!ok) problems.push(`factions.${f}: one slot-B mission order (Level 6, any residence, kinds mission, cityId home)`);
  }

  // The papers (design §14).
  for (const city of content.cities) {
    if (!city.paper) continue;
    const names = new Set(
      content.headlines.filter((h) => h.cityId === city.id).map((h) => h.id.slice(h.id.lastIndexOf('.') + 1)),
    );
    const want = isDistricted(city) ? HERALD_RISK_HEADLINE_NAMES : RISK_HEADLINE_NAMES;
    for (const n of want) if (!names.has(n)) problems.push(`cities.${city.id}: the paper has no "${n}" headline`);
    if (isDistricted(city))
      for (const n of ['quarter-open', 'rival-pressure'])
        if (names.has(n)) problems.push(`cities.${city.id}: the Herald has no "${n}" headline`);
  }

  // Art: every type's mission card, the services' kinds bound.
  for (const type of MISSION_TYPE_IDS) {
    const card = content.art.missionCards.filter((m) => m.missionType === type);
    if (card.length !== 1) problems.push(`art.missionCards: ${type} needs exactly one card`);
    else {
      const a = idx.assetById.get(card[0]!.assetId);
      if (!a || a.kind !== 'scene') problems.push(`art.missionCards: ${type}'s card must be a scene`);
    }
  }
  for (const kind of ['hospital', 'jail'] as const)
    if (!content.art.scenes.some((s) => s.locationKind === kind)) problems.push(`art.scenes: "${kind}" needs a scene`);

  return problems;
}
