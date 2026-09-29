import type { GameContent } from '@irongate/content';
import { City } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { computeCheck, tier1Difficulty } from '@irongate/rules';
import type { CityView } from '@irongate/rules';
import { gameError } from '../gameError';
import { wornStats } from './characterService';

/** Content city + live state + this character's odds on every action (ADR 0003). */
export async function getCityView(
  content: GameContent,
  cityId: string,
  character: CharacterDoc,
): Promise<CityView> {
  const city = content.city(cityId);
  if (!city) throw gameError('NOT_FOUND', 'UNKNOWN_CITY', { cityId });

  const state = await City.findById(city.id).lean();
  const stats = wornStats(character);
  const difficulty = tier1Difficulty(city.role);

  return {
    id: city.id,
    name: city.name,
    role: city.role,
    ...(city.homeFactionId ? { homeFactionId: city.homeFactionId } : {}),
    opinion: state?.opinion ?? city.baselineOpinion,
    locations: city.locations.map((location) => ({
      id: location.id,
      name: location.name,
      kind: location.kind,
      blurb: location.blurb,
      actions: location.actions.map((action) => ({
        id: action.id,
        name: action.name,
        type: action.type,
        stat: action.stat,
        energy: action.energy,
        preview: computeCheck({ stat: action.stat, stats, difficulty }),
      })),
    })),
  };
}
