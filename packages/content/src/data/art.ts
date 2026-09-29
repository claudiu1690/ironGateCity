import type { Asset, SceneBinding } from '../schemas';

/**
 * The art catalogue (ADR 0007). Sources live outside the repository in the art folder
 * (IRONGATE_ART_SRC); `pnpm art:build` turns them into /art/<id>-<width>.avif|webp, which are
 * committed. Content references art only by these ids.
 */
export const assets: Asset[] = [
  {
    id: 'map.coalport.day',
    kind: 'map',
    source: 'maps-pen/coalport.png',
    width: 5056,
    height: 3392,
    widths: [1280, 2560],
    alt: "Illustrated map of Coalport by day: the steel mill, Market Row, the Union Hall, Foundry Row's terraces, the quays and the river.",
    flatten: '#EFE6D2',
  },
  {
    id: 'map.coalport.night',
    kind: 'map',
    source: 'maps-pen/coalport-night.png',
    width: 5056,
    height: 3392,
    widths: [1280, 2560],
    alt: 'Illustrated map of Coalport at night: lit windows along the mill, the market and the quays.',
  },
  {
    id: 'portrait.holm',
    kind: 'portrait',
    source: 'mvp/portraits/holm.png',
    // 4:5 head and shoulders.
    width: 760,
    height: 950,
    crop: { left: 60, top: 40, width: 760, height: 950 },
    widths: [256, 512],
    alt: 'Petra Holm, branch secretary: dark hair pinned back, work overalls and a red scarf.',
  },
  {
    id: 'scene.union-hq',
    kind: 'scene',
    source: 'mvp/scenes/union-hq.png',
    width: 2688,
    height: 1520,
    widths: [640, 1280],
    alt: 'The back room of the Union Hall: organisers bent over a ward map, a mimeograph and stacks of bulletins.',
  },
  {
    id: 'scene.bar-anchor',
    kind: 'scene',
    source: 'mvp/scenes/bar-anchor.png',
    width: 2688,
    height: 1520,
    widths: [640, 1280],
    alt: 'Inside The Anchor: the barman at the counter, dockers at the tables, cranes and a lit ship beyond the window.',
  },
];

/** §13.5 rung 2: the scenes slice 1 has. Other locations fall back to a crop of the city map. */
export const scenes: SceneBinding[] = [
  { locationKind: 'faction-hq', factionId: 'collective', assetId: 'scene.union-hq' },
  { locationKind: 'bar', assetId: 'scene.bar-anchor' },
];
