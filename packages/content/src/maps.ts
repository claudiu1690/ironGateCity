/**
 * Maps v3, for the dev map viewer only (`@irongate/content/maps`): the survey of every painted place,
 * the tile pyramids and the alt texts of all twelve pictures. None of it is read by a game screen:
 * those get their maps from the server.
 */
import { mapPins } from './data/mapPins';
export { mapAlt } from './data/art';
import tiles from './data/tiles.json';
import type { TilesManifest } from './schemas';

export { mapPins };
export const tilePyramids: TilesManifest = tiles as TilesManifest;
export type { MapPins, SurveyPin, TilesEntry, TilesManifest } from './schemas';
