/**
 * Maps v3, for the dev map viewer only (`@irongate/content/maps`): the survey of every painted place,
 * the tile pyramids and the alt texts of all twelve pictures. None of it is read by a game screen:
 * those get their maps from the server.
 */
import { ashford } from './data/cities/ashford';
import { coalport } from './data/cities/coalport';
import { duskwall } from './data/cities/duskwall';
import { irongate } from './data/cities/irongate';
import { mapPins } from './data/mapPins';
import { nation } from './data/nation';
export { mapAlt } from './data/art';
import tiles from './data/tiles.json';
import type { TilesManifest } from './schemas';

export { mapPins };
export const tilePyramids: TilesManifest = tiles as TilesManifest;
/** The pictures whose city has the map atmosphere on (`City.clouds`): the viewer's default. */
export const cloudyMaps: ReadonlySet<string> = new Set([
  ...[coalport, duskwall, ashford, irongate].filter((c) => c.clouds).map((c) => c.id),
  // Slice 4: the nation map has the same atmosphere when its content turns it on.
  ...(nation.clouds ? ['nation'] : []),
]);
export type { MapPins, SurveyPin, TilesEntry, TilesManifest } from './schemas';
