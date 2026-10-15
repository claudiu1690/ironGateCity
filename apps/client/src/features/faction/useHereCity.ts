import { useCharacter } from '../game/hooks';

/** The name of the city the player stands in (*here now · Coalport*): the character's Local Standing city. */
export function useHereCity(): string {
  const { character } = useCharacter();
  return character?.standing.cityName ?? '';
}
