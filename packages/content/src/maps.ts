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

/** Review 4 (tech design §6.1): the nation's legs, drawn over the picture by the viewer. */
export const nationRoutes = nation.routes;
/**
 * Review 4 (answers §8.2): every city's quarter outlines that content has (the capital's districts),
 * so the viewer's trace mode can show them and slide a shared point along the river.
 */
export const cityOutlines: Readonly<Record<string, ReadonlyArray<{ id: string; points: ReadonlyArray<readonly [number, number]> }>>> =
  Object.fromEntries(
    [coalport, duskwall, ashford, irongate].map((c) => [
      c.id,
      (c.quarters ?? []).flatMap((q) => (q.outline ? [{ id: q.id, points: q.outline }] : [])),
    ]),
  );
