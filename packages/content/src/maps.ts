/**
 * Maps v3, for the dev map viewer only (`@irongate/content/maps`): the survey of every painted place,
 * the tile pyramids and the alt texts of all twelve pictures. None of it is read by a game screen:
 * those get their maps from the server.
 */
import { ashford } from './data/cities/ashford';
import { coalport } from './data/cities/coalport';
import { duskwall } from './data/cities/duskwall';
import { mapPins } from './data/mapPins';
export { mapAlt } from './data/art';
import tiles from './data/tiles.json';
import type { TilesManifest } from './schemas';

export { mapPins };
export const tilePyramids: TilesManifest = tiles as TilesManifest;
/** The pictures whose city has the map atmosphere on (`City.clouds`): the viewer's default. */
export const cloudyMaps: ReadonlySet<string> = new Set(
  [coalport, duskwall, ashford].filter((c) => c.clouds).map((c) => c.id),
);
export type { MapPins, SurveyPin, TilesEntry, TilesManifest } from './schemas';
