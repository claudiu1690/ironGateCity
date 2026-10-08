import type { City, GameContent, Location } from '@irongate/content';
import type { ResultArt } from '@irongate/rules';
import { nightAt } from './night';
import { assetView } from './views';

/**
 * §13.5 fallback ladder without story art: a scene bound to the location kind (and, for a
 * `faction-hq`, the faction whose hall it is: the location's own party in the capital, slice 4, else
 * the city's home faction), else a crop of the city map by day or by night centred on the location.
 */
export function pickArt(content: GameContent, city: City, location: Location, now: number): ResultArt {
  const faction = location.kind === 'faction-hq' ? (location.factionId ?? city.homeFactionId) : undefined;
  const scene = content.art.scenes.find(
    (s) => s.locationKind === location.kind && (s.factionId === undefined || s.factionId === faction),
  );
  if (scene) return { rung: 'scene', asset: assetView(content, scene.assetId) };
  return {
    rung: 'map-crop',
    asset: assetView(content, nightAt(now).night ? city.map.night : city.map.day),
    x: location.map.x,
    y: location.map.y,
  };
}
