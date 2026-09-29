import { z } from 'zod';
import { coalport } from './data/cities/coalport';
import { factions } from './data/factions';
import { startingCharacter } from './data/startingCharacter';
import { Content } from './schemas';
import type { Action, City, Faction, Location } from './schemas';
import type { FactionId } from '@irongate/rules';

/** Every data file, before validation. */
export const rawContent: unknown = {
  factions,
  cities: [coalport],
  startingCharacter,
};

export class ContentError extends Error {
  override name = 'ContentError';
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

  for (const f of content.factions) unique('faction', f.id);
  const cityById = new Map(content.cities.map((c) => [c.id, c]));

  for (const city of content.cities) {
    unique('city', city.id);
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
    for (const location of city.locations) {
      unique('location', location.id);
      if (!location.id.startsWith(`${city.id}.`)) {
        problems.push(`location "${location.id}" must be dotted under its city "${city.id}"`);
      }
      for (const action of location.actions) {
        unique('action', action.id);
        if (!action.id.startsWith(`${location.id}.`)) {
          problems.push(`action "${action.id}" must be dotted under its location "${location.id}"`);
        }
      }
    }
  }

  for (const f of content.factions) {
    // Slice 0 ships only Coalport, so a faction's home city may not be loaded yet (see the
    // Deviations in docs/tech/slice-0.md). When it is loaded, it must point back.
    const home = cityById.get(f.homeCityId);
    if (home && (home.role !== 'home' || home.homeFactionId !== f.id)) {
      problems.push(`factions.${f.id}.homeCityId "${f.homeCityId}" is not a home city of "${f.id}"`);
    }
  }
  const factionIds = new Set(content.factions.map((f) => f.id));
  if (factionIds.size !== content.factions.length) problems.push('each faction must appear once');

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
