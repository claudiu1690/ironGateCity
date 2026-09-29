import type { City, GameContent, Location } from '@irongate/content';
import { isNight } from '@irongate/rules';
import type { ResultArt } from '@irongate/rules';
import { assetView } from './views';

/**
 * §13.5 fallback ladder without story art: a scene bound to the location kind (and, for a
 * `faction-hq`, the faction whose hall it is: the city's home faction), else a crop of the city map
 * by day or by night centred on the location.
 */
export function pickArt(content: GameContent, city: City, location: Location, now: number): ResultArt {
  const faction = location.kind === 'faction-hq' ? city.homeFactionId : undefined;
  const scene = content.art.scenes.find(
    (s) => s.locationKind === location.kind && (s.factionId === undefined || s.factionId === faction),
  );
  if (scene) return { rung: 'scene', asset: assetView(content, scene.assetId) };
  return {
    rung: 'map-crop',
    asset: assetView(content, isNight(now) ? city.map.night : city.map.day),
    x: location.map.x,
    y: location.map.y,
  };
}
