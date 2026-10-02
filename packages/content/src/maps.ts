/**
 * Maps v3, for the dev map viewer only (`@irongate/content/maps`): the survey of every painted place
 * and the tile pyramids of all twelve pictures. Neither is game content; the client's game screens
 * get their maps from the server.
 */
import { mapPins } from './data/mapPins';
import tiles from './data/tiles.json';
import type { TilesManifest } from './schemas';

export { mapPins };
export const tilePyramids: TilesManifest = tiles as TilesManifest;
export type { MapPins, SurveyPin, TilesEntry, TilesManifest } from './schemas';
