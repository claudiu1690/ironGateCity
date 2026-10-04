import type { Location, Mission } from '../../schemas';

/** Slice 5 (ADR 0031): a city's missions, by the place they are at. */
export type MissionsByPlace = Record<string, Mission[]>;

/** The city's places with their missions attached (a place with none keeps no `missions` field). */
export function withMissions(locations: Location[], missions: MissionsByPlace): Location[] {
  const known = new Set(locations.map((l) => l.id));
  for (const id of Object.keys(missions)) {
    if (!known.has(id)) throw new Error(`missions for "${id}", which is not a place of this city`);
  }
  return locations.map((l) => (missions[l.id] ? { ...l, missions: missions[l.id] } : l));
}
