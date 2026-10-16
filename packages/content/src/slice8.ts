import {
  DOSSIER_CATEGORIES,
  FACTION_IDS,
  MISSION_TYPES,
  PATRON_IDS,
  SLOT_CHA,
  placeholdersIn,
} from '@irongate/rules';
import type { DossierCategory, FactionId, PatronId } from '@irongate/rules';
import type {
  Asset,
  City,
  Content,
  DossierName,
  Item,
  Location,
  MapPins,
  Mission,
  Patron,
  PatronRequest,
  Shop,
} from './schemas';

/**
 * Slice 8 (docs/tech/slice-8.md §4.1–§4.2): the loader's cross-checks and the accessors for a life
 * in the city. The slice-8 data (the catalogue, the shops, the Front, the patrons, the Dossier's lines,
 * the chapters) is written by the designer (T6) after these schemas; until it lands each check
 * applies only to what is present, and a set that is started must be complete. The Political Season
 * is deferred (16 Oct 2026): no season line or copy is checked.
 */

/** Design §3.5: which place kinds carry each shop (§21.2 note 6: a tailor may sit in a `bar` with rooms). */
export const SHOP_PLACE_KINDS: Readonly<Record<Shop['kind'], readonly string[]>> = {
  clothesStall: ['market'],
  partyStore: ['faction-hq'],
  tailor: ['hotel', 'bar'],
  press: ['press'],
  backRoom: ['bar'],
};

/** Design §16.3: The Front's four places (review 4: they leave Clearwater's `laterPins`). */
export const FRONT_PLACES = {
  promenade: 'clearwater.promenade',
  casino: 'clearwater.casino',
  lido: 'clearwater.lido',
  pierHotel: 'clearwater.pier-hotel',
} as const;
const FRONT_KINDS: Readonly<Record<string, string>> = {
  [FRONT_PLACES.promenade]: 'square',
  [FRONT_PLACES.casino]: 'bar',
  [FRONT_PLACES.lido]: 'square',
  [FRONT_PLACES.pierHotel]: 'hotel',
};

/** Design §3.7: the six society calls (plus the late table, an introduction). */
export const SOCIETY_CALL_COUNT = 6;

/** Design §16.4: the Dossier lines' placeholders. */
export const DOSSIER_LINE_PLACEHOLDERS = ['name', 'party', 'place', 'weekday', 'city'] as const;
/** Design §16.5: a Request's placeholders. */
export const REQUEST_PLACEHOLDERS = ['district', 'until', 'issue'] as const;

/** Design §3.1: no weapon is catalogued (a content guard over ids and art). */
const WEAPON_WORDS = /revolver|truncheon|weapon/i;

/** The capital's quarter for deputies and party figures (tech design §4.1). */
export const GOVERNMENT_QUARTER = 'irongate.government-quarter';

/**
 * Tech design §4.1: every name the Dossier can hold: each candidate, secretary, local deputy and
 * party figure with a party and a town (deputies and figures in the capital's Government Quarter),
 * then the dossier-only names (`extraNames`, never drawn at random).
 */
export function dossierNames(content: Content): DossierName[] {
  const out: DossierName[] = [];
  const seen = new Set<string>();
  const add = (n: DossierName) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    out.push(n);
  };
  for (const c of content.candidates)
    add({
      id: c.id,
      name: c.name,
      cityId: c.cityId,
      ...(c.districtId ? { districtId: c.districtId } : {}),
      factionId: c.factionId,
      drawn: true,
    });
  const capital = content.nation.capitalId;
  for (const f of content.factions) {
    const sec = content.npcs.find((n) => n.id === f.secretary.npcId);
    if (sec)
      add({ id: sec.id, name: sec.name, cityId: sec.cityId ?? f.homeCityId, factionId: f.id, drawn: true });
    for (const d of f.localDeputies ?? [])
      add({
        id: d.npcId,
        name: d.name,
        cityId: capital,
        districtId: GOVERNMENT_QUARTER,
        factionId: f.id,
        drawn: true,
      });
    if (f.nationalFigure)
      add({
        id: f.nationalFigure.npcId,
        name: f.nationalFigure.name,
        cityId: capital,
        districtId: GOVERNMENT_QUARTER,
        factionId: f.id,
        drawn: true,
      });
  }
  for (const n of content.extraNames) add(n);
  return out;
}

/** The slice-8 accessors `GameContent` gains (tech design §4.1). */
export interface LifeAccessors {
  /** A place's shops, in content order ([] for none). */
  shopsAt(locationId: string): Shop[];
  /** The shop at a place that sells an item, with the item. */
  shopItem(locationId: string, itemId: string): { shop: Shop; item: Item } | undefined;
  /** The faction's kit: the outfit and the party card (`factions[].kit`). */
  kitOf(factionId: FactionId): { outfit: string; card: string };
  names(): DossierName[];
  /** A town's names (drawn and not), in `names()` order. */
  namesOf(cityId: string): DossierName[];
  name(id: string): DossierName | undefined;
  patron(id: PatronId): Patron | undefined;
  patronOf(cityId: string): Patron | undefined;
  patronAt(locationId: string): Patron | undefined;
  request(id: string): { patron: Patron; request: PatronRequest } | undefined;
  /** Design §16.4: a category's line by index (0–3); undefined until the lines are written. */
  dossierLine(category: DossierCategory, index: number): string | undefined;
  /** The society calls (type `social`), located, in content order. */
  societyCalls(): Array<{ city: City; location: Location; mission: Mission }>;
}

export function lifeAccessors(content: Content): LifeAccessors {
  const locations = new Map<string, { city: City; location: Location }>();
  for (const city of content.cities)
    for (const location of city.locations) locations.set(location.id, { city, location });
  const items = new Map(content.items.map((i) => [i.id, i]));
  const names = dossierNames(content);
  const nameById = new Map(names.map((n) => [n.id, n]));
  const patrons = new Map(content.patrons.map((p) => [p.id, p]));
  const requests = new Map<string, { patron: Patron; request: PatronRequest }>();
  for (const patron of content.patrons)
    for (const request of patron.requests) requests.set(request.id, { patron, request });
  const calls = content.cities.flatMap((city) =>
    city.locations.flatMap((location) =>
      (location.missions ?? [])
        .filter((m) => m.type === 'social')
        .map((mission) => ({ city, location, mission })),
    ),
  );
  const shopsAt = (locationId: string) => locations.get(locationId)?.location.shops ?? [];
  return {
    shopsAt,
    shopItem: (locationId, itemId) => {
      const shop = shopsAt(locationId).find((s) => s.items.includes(itemId));
      const item = items.get(itemId);
      return shop && item ? { shop, item } : undefined;
    },
    kitOf: (factionId) => {
      const f = content.factions.find((x) => x.id === factionId);
      if (!f) throw new Error(`unknown faction ${factionId}`);
      return { outfit: f.kit.outfit, card: f.kit.card };
    },
    names: () => names,
    namesOf: (cityId) => names.filter((n) => n.cityId === cityId),
    name: (id) => nameById.get(id),
    patron: (id) => patrons.get(id),
    patronOf: (cityId) => content.patrons.find((p) => p.cityId === cityId),
    patronAt: (locationId) => content.patrons.find((p) => p.locationId === locationId),
    request: (id) => requests.get(id),
    dossierLine: (category, index) => content.dossierLines?.[category][index],
    societyCalls: () => calls,
  };
}

/** Tech design §4.2: the loader's slice-8 cross-checks. */
export function slice8Problems(
  content: Content,
  idx: {
    cityById: Map<string, City>;
    locationById: Map<string, { city: City; location: Location }>;
    assetById: Map<string, Asset>;
    mapPins: MapPins;
    sentenceCount: (text: string) => number;
  },
): string[] {
  const problems: string[] = [];
  const items = new Map(content.items.map((i) => [i.id, i]));
  const missions = new Map<string, { city: City; location: Location; mission: Mission }>();
  for (const city of content.cities)
    for (const location of city.locations)
      for (const mission of location.missions ?? []) missions.set(mission.id, { city, location, mission });
  const kitItems = new Set(content.factions.flatMap((f) => [f.kit.outfit, f.kit.card]));
  const originItems = new Set(
    content.origin.steps.flatMap((s) =>
      s.questions.flatMap((q) =>
        q.answers.flatMap((a) => a.effects.filter((e) => e.kind === 'wear').map((e) => e.itemId)),
      ),
    ),
  );
  /** The slice-8 catalogue has landed once any item carries a price or a patron is written. */
  const catalogue = content.items.some((i) => i.price !== undefined) || content.patrons.length > 0;

  // Items (design §3.1, §3.2, §3.9; ADR 0051). The effect bounds are the schema's.
  for (const item of content.items) {
    const where = `items.${item.id}`;
    if (WEAPON_WORDS.test(item.id) || WEAPON_WORDS.test(item.art))
      problems.push(`${where}: no weapon is catalogued`);
    if (item.slot === 'clothing' && item.tier === null) problems.push(`${where}: a coat has a tier`);
    if (item.slot !== null) {
      const [lo, hi] = SLOT_CHA[item.slot];
      // Slice 2's party card and the kit predate the bands only where a band is 0 (documents): held.
      if (item.cha < lo || item.cha > hi)
        problems.push(`${where}: Charisma ${item.cha} is outside the ${item.slot} band ${lo}–${hi}`);
    }
    const ons = (item.effects ?? []).flatMap((e) => (e.kind === 'chancePct' ? [e.on] : []));
    if (new Set(ons).size !== ons.length) problems.push(`${where}: at most one chancePct per act`);
    if (item.price !== undefined) {
      if (item.keepsake) problems.push(`${where}: a keepsake has no price`);
      if (kitItems.has(item.id)) problems.push(`${where}: the kit has no price`);
      if (originItems.has(item.id)) problems.push(`${where}: the origin's coat has no price`);
    }
    if (item.keepsakeFrom && !item.keepsake)
      problems.push(`${where}: keepsakeFrom on an item that is not a keepsake`);
    if (item.read && idx.sentenceCount(item.read) > 4)
      problems.push(`${where}: its Read text is over four sentences`);
    if (item.read && !item.keepsake) problems.push(`${where}: only a keepsake has a Read text`);
  }
  for (const a of content.art.assets)
    if (WEAPON_WORDS.test(a.id) || WEAPON_WORDS.test(a.source))
      problems.push(`art.${a.id}: no weapon is catalogued`);
  if (catalogue) {
    // Every keepsake a chapter or patron grants names where it came from.
    for (const amb of content.ambitions)
      for (const ch of amb.chapters) {
        const k = ch.story?.keepsake;
        if (!k) continue;
        const item = items.get(k);
        if (!item?.keepsakeFrom || !('ambitionId' in item.keepsakeFrom))
          problems.push(`items.${k}: chapter ${amb.id} ${ch.n}'s keepsake needs keepsakeFrom`);
        else if (item.keepsakeFrom.ambitionId !== amb.id || item.keepsakeFrom.chapter !== ch.n)
          problems.push(`items.${k}: keepsakeFrom must be ${amb.id} chapter ${ch.n}`);
      }
  }

  // Shops (design §3.5).
  const soldSomewhere = new Set<string>();
  for (const city of content.cities)
    for (const l of city.locations) {
      const kinds = (l.shops ?? []).map((s) => s.kind);
      if (new Set(kinds).size !== kinds.length) problems.push(`location "${l.id}": two shops of one kind`);
      for (const shop of l.shops ?? []) {
        const where = `location "${l.id}" (${shop.kind})`;
        if (!SHOP_PLACE_KINDS[shop.kind].includes(l.kind))
          problems.push(`${where}: a ${shop.kind} is not on a ${l.kind}`);
        if (shop.bribe && shop.kind !== 'backRoom')
          problems.push(`${where}: only the back room strikes off a mark`);
        if (shop.kind === 'backRoom' && !shop.bribe)
          problems.push(`${where}: the back room carries the bribe`);
        if (shop.kind === 'clothesStall' ? shop.buys !== 'any' : shop.buys !== 'own')
          problems.push(`${where}: the stall buys 'any', every other shop 'own' (§21.1 Q1)`);
        if (new Set(shop.items).size !== shop.items.length) problems.push(`${where}: an item listed twice`);
        for (const id of shop.items) {
          soldSomewhere.add(id);
          const item = items.get(id);
          if (!item) {
            problems.push(`${where}: unknown item "${id}"`);
            continue;
          }
          if (item.price === undefined) problems.push(`${where}: "${id}" has no price`);
          if (shop.kind === 'partyStore' && item.factionId !== undefined && item.factionId !== l.factionId)
            problems.push(`${where}: "${id}" is another party's`);
          if (shop.kind !== 'partyStore' && item.members)
            problems.push(`${where}: "${id}" is sold at a party store only`);
        }
      }
    }
  for (const item of content.items)
    if (item.price !== undefined && !soldSomewhere.has(item.id))
      problems.push(`items.${item.id}: priced but sold by no shop`);

  // The Front (design §16.3; review 4: its places leave `laterPins`). Started → complete.
  const front = Object.values(FRONT_PLACES);
  const frontNew = front.filter((id) => id !== FRONT_PLACES.casino);
  if (frontNew.some((id) => idx.locationById.has(id))) {
    const pins = new Map((idx.mapPins.clearwater?.pins ?? []).map((p) => [p.id, p]));
    for (const id of front) {
      const located = idx.locationById.get(id);
      if (!located) {
        problems.push(`the Front: "${id}" is not a place yet`);
        continue;
      }
      const { location } = located;
      if (location.kind !== FRONT_KINDS[id]) problems.push(`the Front: "${id}" must be a ${FRONT_KINDS[id]}`);
      const pin = pins.get(id);
      if (!pin || pin.x !== location.map.x || pin.y !== location.map.y)
        problems.push(`the Front: "${id}" must sit on its pin in mapPins.clearwater`);
      if (frontNew.includes(id as (typeof frontNew)[number])) {
        const checked = location.actions.filter((a) => a.type !== 'training');
        if (checked.length !== 2) problems.push(`the Front: "${id}" has two tier-1 actions`);
        for (const a of checked)
          if ('difficulty' in a && a.difficulty !== 10)
            problems.push(`the Front: "${a.id}" is at difficulty 10`);
      }
    }
    const casino = idx.locationById.get(FRONT_PLACES.casino)?.location;
    if (casino && !(casino.shops ?? []).some((s) => s.kind === 'backRoom'))
      problems.push('the Front: the Casino carries the back room');
    const pier = idx.locationById.get(FRONT_PLACES.pierHotel)?.location;
    if (pier && !(pier.shops ?? []).some((s) => s.kind === 'tailor'))
      problems.push('the Front: the Pier Hotel carries the tailor');
    if (pier && pier.patronId !== 'marr')
      problems.push("the Front: the Pier Hotel receives Marr (patronId 'marr')");
  }

  // Missions: society calls, the Dossier payloads, the introductions (design §3.7, §4.2, §5.4).
  const social = [...missions.values()].filter((m) => m.mission.type === 'social');
  for (const { location, mission: m } of missions.values()) {
    const where = `mission "${m.id}"`;
    if (m.type === 'social') {
      if (!m.society) problems.push(`${where}: a society call needs its \`society\``);
      else if (m.difficulty !== m.society.needs)
        problems.push(`${where}: a call's difficulty is its Charisma figure`);
      if (m.level !== 10) problems.push(`${where}: a society call opens at Level 10 (§21.1 Q10)`);
      if (m.pool.length > 0) problems.push(`${where}: a society call has no run-in pool`);
      if (m.ways.length !== 3) problems.push(`${where}: a society call has three ways`);
      if (m.energy !== MISSION_TYPES.social.energy)
        problems.push(`${where}: a society call costs ${MISSION_TYPES.social.energy} Energy`);
      if (m.dossier) problems.push(`${where}: a society call's entry is its \`society.entry\``);
    } else {
      if (m.society) problems.push(`${where}: only a society call has \`society\``);
      if (m.pool.length === 0) problems.push(`${where}: a run-in pool of one or more`);
      if (m.difficulty < 14) problems.push(`${where}: difficulty under the ladder's 14`);
      if (m.dossier && m.type !== 'surveillance' && m.type !== 'theft')
        problems.push(`${where}: only surveillance and theft missions land an entry`);
    }
    const subject = m.dossier?.subject;
    if (subject && subject !== 'choose' && !dossierNames(content).some((n) => n.id === subject))
      problems.push(`${where}: unknown Dossier name "${subject}"`);
    const patronReq = m.requires?.patron;
    if (patronReq && content.patrons.length > 0) {
      const p = content.patrons.find((x) => x.id === patronReq.id);
      if (!p || p.introduction !== m.id) problems.push(`${where}: not ${patronReq.id}'s introduction`);
      else if (idx.locationById.get(p.locationId)?.city.id !== idx.locationById.get(location.id)?.city.id)
        problems.push(`${where}: an introduction is in its patron's city`);
    }
  }
  const calls = social.filter((m) => !m.mission.requires?.patron);
  if (calls.length > 0 && calls.length !== SOCIETY_CALL_COUNT)
    problems.push(`missions: ${calls.length} society calls, not ${SOCIETY_CALL_COUNT}`);

  // Patrons (design §5, §16.5; ADR 0055). Started → both.
  const names = dossierNames(content);
  if (content.patrons.length > 0) {
    const ids = content.patrons.map((p) => p.id);
    if (ids.length !== PATRON_IDS.length || PATRON_IDS.some((id) => !ids.includes(id)))
      problems.push(`patrons: exactly ${PATRON_IDS.join(' and ')}`);
    const requestIds = new Set<string>();
    for (const p of content.patrons) {
      const where = `patrons.${p.id}`;
      const located = idx.locationById.get(p.locationId);
      if (!located || located.city.id !== p.cityId)
        problems.push(`${where}: its place is not in ${p.cityId}`);
      else if (located.location.patronId !== p.id)
        problems.push(`${where}: "${p.locationId}" must carry patronId "${p.id}"`);
      if (!content.npcs.some((n) => n.id === p.npcId)) problems.push(`${where}: unknown NPC "${p.npcId}"`);
      const portrait = idx.assetById.get(p.portrait);
      if (!portrait || portrait.kind !== 'portrait')
        problems.push(`${where}: its portrait must be a portrait asset`);
      const piece = items.get(p.piece);
      if (!piece || !piece.keepsake || piece.slot === null)
        problems.push(`${where}: the piece is a wearable keepsake`);
      else if (
        !piece.keepsakeFrom ||
        !('patronId' in piece.keepsakeFrom) ||
        piece.keepsakeFrom.patronId !== p.id
      )
        problems.push(`${where}: the piece's keepsakeFrom names ${p.id}`);
      const intro = missions.get(p.introduction);
      if (!intro || intro.mission.requires?.patron?.id !== p.id)
        problems.push(`${where}: its introduction "${p.introduction}" needs requires.patron ${p.id}`);
      for (const r of p.requests) {
        const rw = `${where}.${r.id}`;
        if (requestIds.has(r.id)) problems.push(`${rw}: duplicate Request id`);
        requestIds.add(r.id);
        for (const ph of placeholdersIn(`${r.title} ${r.line}`))
          if (!(REQUEST_PLACEHOLDERS as readonly string[]).includes(ph))
            problems.push(`${rw}: unknown placeholder {${ph}}`);
        const m = r.match;
        for (const id of m.locationIds ?? [])
          if (!idx.locationById.has(id)) problems.push(`${rw}: unknown place "${id}"`);
        for (const id of m.actionIds ?? [])
          if (
            !missions.has(id) &&
            ![...idx.locationById.values()].some((x) => x.location.actions.some((a) => a.id === id))
          )
            problems.push(`${rw}: unknown action "${id}"`);
        if (m.cityId && m.cityId !== 'home' && !idx.cityById.has(m.cityId))
          problems.push(`${rw}: unknown city "${m.cityId}"`);
        const district = m.districtId;
        if (district && district !== 'home' && district !== 'rotate') {
          const q = [...idx.cityById.values()].some((c) => c.quarters.some((x) => x.id === district));
          if (!q) problems.push(`${rw}: unknown district "${district}"`);
        }
        if (district === 'rotate' || /\{district\}/.test(`${r.title} ${r.line}`)) {
          const capital = idx.cityById.get(content.nation.capitalId);
          const districts = (capital?.quarters ?? []).filter((q) => q.district);
          for (const d of districts)
            if (!names.some((n) => n.districtId === d.id && n.drawn))
              problems.push(`${rw}: the rotation reaches ${d.id}, which has no names`);
        }
      }
    }
    for (const { location } of idx.locationById.values())
      if (
        location.patronId &&
        !content.patrons.some((p) => p.id === location.patronId && p.locationId === location.id)
      )
        problems.push(`location "${location.id}": patronId "${location.patronId}" without its patron there`);
  } else {
    for (const { location } of idx.locationById.values())
      if (location.patronId)
        problems.push(`location "${location.id}": patronId before the patrons are written`);
  }

  // Names (tech design §4.1).
  const nameIds = [
    ...content.candidates.map((c) => c.id),
    ...content.factions.map((f) => f.secretary.npcId),
    ...content.factions.flatMap((f) => (f.localDeputies ?? []).map((d) => d.npcId)),
    ...content.factions.flatMap((f) => (f.nationalFigure ? [f.nationalFigure.npcId] : [])),
    ...content.extraNames.map((n) => n.id),
  ];
  const seenNames = new Set<string>();
  for (const id of nameIds) {
    if (seenNames.has(id)) problems.push(`names: "${id}" is two names`);
    seenNames.add(id);
  }
  for (const n of content.extraNames) {
    if (!idx.cityById.has(n.cityId)) problems.push(`extraNames.${n.id}: unknown city "${n.cityId}"`);
    if (n.drawn && n.factionId === null)
      problems.push(`extraNames.${n.id}: a name with no party is never drawn`);
  }
  for (const n of names) {
    if (n.drawn && n.factionId === null) problems.push(`names.${n.id}: a drawn name has a party`);
    const city = idx.cityById.get(n.cityId);
    if (city && city.quarters.some((q) => q.district) && !n.districtId)
      problems.push(`names.${n.id}: a capital name has a district`);
  }
  if (!FACTION_IDS.every((f) => names.some((n) => n.factionId === f && n.drawn)))
    problems.push('names: every party has a name to draw');

  // The Dossier's lines (design §16.4).
  if (content.dossierLines)
    for (const c of DOSSIER_CATEGORIES)
      for (const [i, line] of content.dossierLines[c].entries())
        for (const ph of placeholdersIn(line))
          if (!(DOSSIER_LINE_PLACEHOLDERS as readonly string[]).includes(ph))
            problems.push(`dossierLines.${c}[${i}]: unknown placeholder {${ph}}`);

  // Chapters (design §8, §16.1–§16.2).
  for (const amb of content.ambitions)
    for (const ch of amb.chapters) {
      const where = `ambitions.${amb.id}.${ch.n}`;
      const s = ch.story;
      if (!s) continue;
      if (s.dossier && !names.some((n) => n.id === s.dossier!.subjectId))
        problems.push(`${where}: unknown Dossier name "${s.dossier.subjectId}"`);
      if (s.favour && content.patrons.length > 0 && !content.patrons.some((p) => p.id === s.favour!.patronId))
        problems.push(`${where}: unknown patron "${s.favour.patronId}"`);
      if (s.completes && ch.n !== amb.chaptersPlanned)
        problems.push(`${where}: only the last chapter completes the Ambition`);
      if (typeof s.art === 'string' && !['home-hq', 'faction-hq', 'faction-house'].includes(s.art)) {
        const a = idx.assetById.get(s.art);
        if (!a || a.kind !== 'scene') problems.push(`${where}: its art must be a scene`);
      }
      for (const c of s.choose.choices)
        if (c.iron !== undefined && c.iron <= 0) problems.push(`${where}: a choice's Iron is positive`);
    }

  // Art (tech design §13): the life scenes, the places' own scenes.
  const life = content.art.lifeScenes;
  if (life)
    for (const [use, id] of Object.entries(life)) {
      const a = idx.assetById.get(id);
      if (!a || a.kind !== 'scene') problems.push(`art.lifeScenes.${use}: "${id}" must be a scene`);
    }
  for (const { location } of idx.locationById.values())
    if (location.scene) {
      const a = idx.assetById.get(location.scene);
      if (!a || a.kind !== 'scene')
        problems.push(`location "${location.id}": its scene must be a scene asset`);
    }

  return problems;
}
