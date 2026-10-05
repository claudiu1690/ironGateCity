import type { TrainingPlaces } from '@irongate/ui';

interface CityLocations {
  locations: {
    name: string;
    ref?: string | null;
    actions: { trains?: { stat: 'str' | 'int' | 'agi' } | null }[];
  }[];
}

/** Review 2 (answers §2.4): where each stat trains in a city, for a result's reason line. */
export function trainingPlacesOf(city: CityLocations | undefined | null): TrainingPlaces {
  const out: TrainingPlaces = {};
  for (const l of city?.locations ?? [])
    for (const a of l.actions) if (a.trains && !out[a.trains.stat]) out[a.trains.stat] = l.ref ?? l.name;
  return out;
}
