import { PLACEHOLDERS, placeholdersIn } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { z } from 'zod';
import { assets, scenes } from './data/art';
import { coalport } from './data/cities/coalport';
import { factions } from './data/factions';
import { headlines } from './data/headlines';
import { jobs } from './data/jobs';
import { orderTemplates } from './data/orders';
import { npcs, standingLevels } from './data/people';
import { startingCharacter } from './data/startingCharacter';
import { Content, isCheckedAction, isShiftAction } from './schemas';
import type {
  Action,
  Asset,
  City,
  Faction,
  HeadlineTemplate,
  Job,
  Location,
  Npc,
  OrderTemplate,
} from './schemas';

/** Every data file, before validation. */
export const rawContent: unknown = {
  factions,
  cities: [coalport],
  startingCharacter,
  art: { assets, scenes },
  npcs,
  standingLevels,
  jobs,
  orderTemplates,
  headlines,
};

export class ContentError extends Error {
  override name = 'ContentError';
}

/** §4.3 of the slice-1 tech design: two hotspots closer than this are too close to tap. */
const MIN_HOTSPOT_DISTANCE = 0.03;
const ALLOWED_PLACEHOLDERS = new Set<string>(PLACEHOLDERS);
/** GDD §1.2 pillar 7 (content §13.7, n9): an outcome text is at most 240 characters and 4 sentences. */
const OUTCOME_TEXT_MAX_CHARS = 240;
const OUTCOME_TEXT_MAX_SENTENCES = 4;

/** Sentences in a text: split after . ? or ! (and a closing quote), before whitespace. */
export function sentenceCount(text: string): number {
  return text
    .trim()
    .split(/(?<=[.?!]["'’”)]?)\s+/)
    .filter((part) => part.length > 0).length;
}

/**
 * Validate content with the Zod schemas (throws with the path of the bad field) and the
 * cross-checks the schemas can't express.
 */
export function parseContent(raw: unknown): Content {
  const parsed = Content.safeParse(raw);
  if (!parsed.success) {
    throw new ContentError(`Invalid content:\n${z.prettifyError(parsed.error)}`);
  }
  const content = parsed.data;
  const problems: string[] = [];

  const seen = new Set<string>();
  const unique = (kind: string, id: string) => {
    if (seen.has(id)) problems.push(`duplicate id "${id}" (${kind})`);
    seen.add(id);
  };

  // Art: ids unique, referenced ids exist with the right kind.
  const assetById = new Map<string, Asset>();
  for (const a of content.art.assets) {
    if (assetById.has(a.id)) problems.push(`duplicate asset id "${a.id}"`);
    assetById.set(a.id, a);
    if (a.crop && (a.crop.width !== a.width || a.crop.height !== a.height)) {
      problems.push(`asset "${a.id}": width/height must be the crop's size`);
    }
  }
  const needAsset = (where: string, id: string, kind: Asset['kind']) => {
    const a = assetById.get(id);
    if (!a) problems.push(`${where} references unknown asset "${id}"`);
    else if (a.kind !== kind) problems.push(`${where} references "${id}", a ${a.kind}, not a ${kind}`);
  };
  for (const s of content.art.scenes) needAsset(`scene for ${s.locationKind}`, s.assetId, 'scene');

  for (const f of content.factions) unique('faction', f.id);
  const cityById = new Map(content.cities.map((c) => [c.id, c]));
  const locationById = new Map<string, { city: City; location: Location }>();
  const actionById = new Map<string, { city: City; location: Location; action: Action }>();

  for (const city of content.cities) {
    unique('city', city.id);
    if (city.id.includes('.')) problems.push(`city id "${city.id}" must not contain a dot`);
    needAsset(`cities.${city.id}.map.day`, city.map.day, 'map');
    needAsset(`cities.${city.id}.map.night`, city.map.night, 'map');
    const { vanguard, collective, alliance, neutral } = city.baselineOpinion;
    const sum = vanguard + collective + alliance + neutral;
    if (Math.abs(sum - 100) > 1e-9)
      problems.push(`cities.${city.id}.baselineOpinion sums to ${sum}, not 100`);
    if (city.role === 'home') {
      if (!city.homeFactionId) {
        problems.push(`cities.${city.id} is a home city without a homeFactionId`);
      } else {
        const faction = content.factions.find((f) => f.id === city.homeFactionId);
        if (faction?.homeCityId !== city.id) {
          problems.push(
            `cities.${city.id} is home to "${city.homeFactionId}", whose homeCityId is not "${city.id}"`,
          );
        }
      }
    } else if (city.homeFactionId) {
      problems.push(`cities.${city.id} is a battleground but has a homeFactionId`);
    }
    city.locations.forEach((location, i) => {
      unique('location', location.id);
      locationById.set(location.id, { city, location });
      if (!location.id.startsWith(`${city.id}.`)) {
        problems.push(`location "${location.id}" must be dotted under its city "${city.id}"`);
      }
      for (const other of city.locations.slice(i + 1)) {
        const d = Math.hypot(location.map.x - other.map.x, location.map.y - other.map.y);
        if (d < MIN_HOTSPOT_DISTANCE) {
          problems.push(`hotspots "${location.id}" and "${other.id}" are too close (${d.toFixed(3)})`);
        }
      }
      for (const action of location.actions) {
        unique('action', action.id);
        const texts = Object.entries(action.text) as Array<[string, { body: string }]>;
        for (const [outcome, t] of texts) {
          if (t.body.length > OUTCOME_TEXT_MAX_CHARS) {
            problems.push(
              `action "${action.id}" ${outcome} text is ${t.body.length} characters (at most ${OUTCOME_TEXT_MAX_CHARS})`,
            );
          }
          const n = sentenceCount(t.body);
          if (n > OUTCOME_TEXT_MAX_SENTENCES) {
            problems.push(
              `action "${action.id}" ${outcome} text has ${n} sentences (at most ${OUTCOME_TEXT_MAX_SENTENCES})`,
            );
          }
        }
        actionById.set(action.id, { city, location, action });
        if (!action.id.startsWith(`${location.id}.`)) {
          problems.push(`action "${action.id}" must be dotted under its location "${location.id}"`);
        }
      }
    });
  }

  // Jobs ↔ shift actions, both directions.
  const jobById = new Map<string, Job>();
  for (const job of content.jobs) {
    unique('job', job.id);
    jobById.set(job.id, job);
    if (!locationById.has(job.locationId))
      problems.push(`job "${job.id}": unknown location "${job.locationId}"`);
    const shift = actionById.get(job.shiftActionId);
    if (!shift || !isShiftAction(shift.action)) {
      problems.push(`job "${job.id}": shiftActionId "${job.shiftActionId}" is not a job shift action`);
    } else if (shift.location.id !== job.locationId || shift.action.jobId !== job.id) {
      problems.push(`job "${job.id}" and its shift action "${job.shiftActionId}" must point at each other`);
    }
  }
  for (const { location, action } of actionById.values()) {
    if (!isShiftAction(action)) continue;
    const job = jobById.get(action.jobId);
    if (!job) problems.push(`action "${action.id}": unknown job "${action.jobId}"`);
    else if (job.locationId !== location.id || job.shiftActionId !== action.id) {
      problems.push(`action "${action.id}" and job "${job.id}" must point at each other`);
    }
  }

  // NPCs.
  const npcById = new Map<string, Npc>();
  for (const npc of content.npcs) {
    unique('npc', npc.id);
    npcById.set(npc.id, npc);
    needAsset(`npc "${npc.id}".portrait`, npc.portrait, 'portrait');
  }

  for (const f of content.factions) {
    // Only Coalport is built so far, so a faction's home city may not be loaded yet (slice-0
    // Deviations). When it is loaded, it must point back.
    const home = cityById.get(f.homeCityId);
    if (home && (home.role !== 'home' || home.homeFactionId !== f.id)) {
      problems.push(`factions.${f.id}.homeCityId "${f.homeCityId}" is not a home city of "${f.id}"`);
    }
    if (f.secretary) {
      const npc = npcById.get(f.secretary.npcId);
      if (!npc) problems.push(`factions.${f.id}.secretary: unknown npc "${f.secretary.npcId}"`);
      else if (npc.factionId !== f.id)
        problems.push(`factions.${f.id}.secretary "${npc.id}" is not of that faction`);
      for (const slot of ['A', 'B', 'C'] as const) {
        if (!content.orderTemplates.some((t) => t.factionId === f.id && t.slot === slot)) {
          problems.push(`factions.${f.id} has a secretary but no order template in slot ${slot}`);
        }
      }
    }
  }
  const factionIds = new Set(content.factions.map((f) => f.id));
  if (factionIds.size !== content.factions.length) problems.push('each faction must appear once');

  // Party orders.
  const checkText = (where: string, text: string) => {
    for (const p of placeholdersIn(text)) {
      if (!ALLOWED_PLACEHOLDERS.has(p)) problems.push(`${where}: unknown placeholder {${p}}`);
    }
  };
  for (const t of content.orderTemplates) {
    unique('order template', t.id);
    for (const m of [t.match, t.noJob?.match]) {
      if (!m) continue;
      for (const id of m.actionIds ?? [])
        if (!actionById.has(id)) problems.push(`order "${t.id}": unknown action "${id}"`);
      for (const id of m.locationIds ?? [])
        if (!locationById.has(id)) problems.push(`order "${t.id}": unknown location "${id}"`);
      if (m.cityId && m.cityId !== 'home' && !cityById.has(m.cityId))
        problems.push(`order "${t.id}": city "${m.cityId}" is not loaded`);
    }
    checkText(`order "${t.id}"`, `${t.title} ${t.line} ${t.noJob?.title ?? ''} ${t.noJob?.line ?? ''}`);
  }

  // Headlines.
  for (const h of content.headlines) {
    unique('headline', h.id);
    if (!cityById.has(h.cityId)) problems.push(`headline "${h.id}": city "${h.cityId}" is not loaded`);
    checkText(`headline "${h.id}"`, `${h.headline} ${h.deck ?? ''}`);
  }
  for (const city of content.cities) {
    if (city.paper && !content.headlines.some((h) => h.cityId === city.id && h.group === 'ambient')) {
      problems.push(`cities.${city.id} has a paper but no ambient headline`);
    }
  }

  const starter = content.factions.find((f) => f.id === content.startingCharacter.factionId);
  if (starter && !cityById.has(starter.homeCityId)) {
    problems.push(`startingCharacter's home city "${starter.homeCityId}" is not loaded`);
  }

  if (problems.length > 0) {
    throw new ContentError(`Invalid content:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  return content;
}

export interface LocatedAction {
  city: City;
  location: Location;
  action: Action;
}

/** Content plus id lookups. Built once; content is immutable at runtime. */
export interface GameContent extends Content {
  faction(id: FactionId): Faction;
  city(id: string): City | undefined;
  location(id: string): { city: City; location: Location } | undefined;
  action(id: string): LocatedAction | undefined;
  job(id: string): Job | undefined;
  jobsAt(locationId: string): Job[];
  npc(id: string): Npc | undefined;
  asset(id: string): Asset;
  /** One faction's order templates, in file order. */
  ordersOf(factionId: FactionId): OrderTemplate[];
  /** One city's headline templates. */
  headlinesOf(cityId: string): HeadlineTemplate[];
  standingNames: string[];
}

export function indexContent(content: Content): GameContent {
  const factions = new Map(content.factions.map((f) => [f.id, f]));
  const cities = new Map<string, City>();
  const locations = new Map<string, { city: City; location: Location }>();
  const actions = new Map<string, LocatedAction>();
  for (const city of content.cities) {
    cities.set(city.id, city);
    for (const location of city.locations) {
      locations.set(location.id, { city, location });
      for (const action of location.actions) actions.set(action.id, { city, location, action });
    }
  }
  const jobs = new Map(content.jobs.map((j) => [j.id, j]));
  const npcs = new Map(content.npcs.map((n) => [n.id, n]));
  const assets = new Map(content.art.assets.map((a) => [a.id, a]));
  return {
    ...content,
    faction: (id) => {
      const f = factions.get(id);
      if (!f) throw new ContentError(`unknown faction "${id}"`);
      return f;
    },
    city: (id) => cities.get(id),
    location: (id) => locations.get(id),
    action: (id) => actions.get(id),
    job: (id) => jobs.get(id),
    jobsAt: (locationId) => content.jobs.filter((j) => j.locationId === locationId),
    npc: (id) => npcs.get(id),
    asset: (id) => {
      const a = assets.get(id);
      if (!a) throw new ContentError(`unknown asset "${id}"`);
      return a;
    },
    ordersOf: (factionId) => content.orderTemplates.filter((t) => t.factionId === factionId),
    headlinesOf: (cityId) => content.headlines.filter((h) => h.cityId === cityId),
    standingNames: content.standingLevels.map((s) => s.name),
  };
}

export function loadContent(raw: unknown = rawContent): GameContent {
  return indexContent(parseContent(raw));
}

let memo: GameContent | undefined;

/** The validated game content, parsed once per process. */
export function getContent(): GameContent {
  memo ??= loadContent();
  return memo;
}

export { isCheckedAction };
