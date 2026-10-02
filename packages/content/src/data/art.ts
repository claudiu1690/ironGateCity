import type { Asset, SceneBinding } from '../schemas';

/**
 * The art catalogue (ADR 0007). Sources live outside the repository in the art folder
 * (IRONGATE_ART_SRC); `pnpm art:build` turns them into /art/<id>-<width>.avif|webp, which are
 * committed. Content references art only by these ids.
 */
/** ADR 0015: faces are a 4:5 head-and-shoulders crop, like the NPC portraits (alt texts: onboarding §13.2). */
function avatar(key: string, top: number, alt: string): Asset {
  return {
    id: `avatar.${key}`,
    kind: 'avatar',
    source: `mvp/avatars/avatar-${key}.png`,
    width: 760,
    height: 950,
    crop: { left: 60, top, width: 760, height: 950 },
    widths: [128, 256],
    alt,
  };
}

function item(id: string, file: string, alt: string): Asset {
  return { id, kind: 'item', source: `mvp/items/${file}`, width: 512, height: 512, widths: [128, 256], alt };
}

/** Vectors are copied, not encoded (ADR 0015): /art/<id>.svg. */
function crest(faction: string, alt: string): Asset {
  return {
    id: `crest.${faction}`,
    kind: 'vector',
    source: `crests/crest-${faction}.svg`,
    width: 256,
    height: 256,
    widths: [],
    alt,
  };
}

/**
 * Maps v3 (ADR 0024 revised): one painted 8,640 px picture per city, day and night. The stills (1024
 * and 2048 px) are the first paint, the fallback and the production path until the tiles are hosted;
 * the tiles (`pnpm art:tiles`, data/tiles.json) are cut from the same master. A repainted master
 * needs a new id here: the stills keep their URLs under the year-long immutable /art/ cache. The
 * WebP fallback is 1024 px only (a 2048 px WebP of the painted art is over 1 MB; scripts/art/build.ts).
 */
function cityMap(city: MapName, time: 'day' | 'night'): Asset {
  return {
    id: `map.${city}.${time}`,
    kind: 'map',
    source: `maps-v3/${city}-${time}-8640.png`,
    width: 8640,
    height: 8640,
    widths: [1024, 2048],
    webpWidths: [1024],
    alt: mapAlt[`${city}.${time}`],
  };
}

type MapName = 'coalport' | 'duskwall' | 'ashford' | 'irongate' | 'clearwater' | 'nation';

/**
 * Alt texts for the twelve painted maps (game designer, 2 Oct 2026): what a sighted player sees of
 * the real layout, in plain words, within the schema's 160 characters. The night ones say it is
 * night. Irongate, Clearwater and the nation are not catalogued yet (their slices add the stills
 * with a measured budget, ADR 0015); their texts wait here so the slice copies nothing by hand.
 */
export const mapAlt: Record<`${MapName}.${'day' | 'night'}`, string> = {
  'coalport.day':
    "Painted map of Coalport by day: the steelworks' furnaces top right, a canal and a domed hall in the middle, the harbour's cranes and the glass station below.",
  'coalport.night':
    'Coalport at night: windows lit across the town, lamps along the canal and the quays, the furnaces glowing top right, the lighthouse at the harbour mouth.',
  'duskwall.day':
    'Painted map of Duskwall by day: a walled fortress on a crag under snowy peaks, the market square below it, a river down the right, the station at the bottom.',
  'duskwall.night':
    'Duskwall at night: lamps along the fortress wall, the market square and the bridges lit, windows glowing down to the station, the river dark under the viaduct.',
  'ashford.day':
    "Painted map of Ashford by day: the college's green dome at the top, the brick print works and a stone bridge in the middle, the river down the right side.",
  'ashford.night':
    "Ashford at night: the college dome and the bridge lit, lamps along the river, the print works' windows glowing, the station bright at the top right.",
  'irongate.day':
    'Painted map of Irongate by day: a wide river with an island and many bridges across the middle, the domed Parliament above it, the station and ironworks below.',
  'irongate.night':
    'Irongate at night: lamps on every bridge over the dark river, the Parliament dome and the station lit, windows glowing across the whole city.',
  'clearwater.day':
    'Painted map of Clearwater by day: a lake at the left with a promenade and pier, the domed casino above, tram sheds in the middle, the harbour at the right.',
  'clearwater.night':
    "Clearwater at night: lamps along the promenade and the pier, steamers lit on the dark lake, the casino's windows glowing, the harbour bright at the right.",
  'nation.day':
    'Painted map of the republic by day: Coalport on the coast at the left, Ashford top left, Irongate in the centre, Duskwall in the mountains, Clearwater on its lake.',
  'nation.night':
    'The republic at night: the five towns lit, lamps along the railway lines between them, trains with lit windows, the furnaces glowing on the coast.',
};

export const assets: Asset[] = [
  cityMap('coalport', 'day'),
  cityMap('coalport', 'night'),
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
    alt: 'The back room of the Union Hall: organisers bent over a street map, a mimeograph and stacks of flyers.',
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
  // Slice 2 (ADR 0015, docs/tech/slice-2.md §13).
  cityMap('duskwall', 'day'),
  cityMap('duskwall', 'night'),
  cityMap('ashford', 'day'),
  cityMap('ashford', 'night'),
  {
    id: 'scene.origin-deathbed',
    kind: 'scene',
    source: 'mvp/scenes/origin-deathbed.png',
    width: 2688,
    height: 1520,
    widths: [640, 1280],
    // On the bed (onboarding §9).
    focus: { x: 0.3, y: 0.5 },
    alt: 'A rented room above the tram depot at night: an old man in the bed by the window, a lamp, a suitcase.',
  },
  {
    id: 'scene.origin-street',
    kind: 'scene',
    source: 'mvp/scenes/origin-street.png',
    width: 2688,
    height: 1520,
    widths: [640, 1280],
    alt: 'An Irongate street in the morning: a newsboy shouting the Herald, a tram, party posters on the wall.',
  },
  {
    // Reviewed for the Vanguard (onboarding §5.3): a desk, a wall map, a plain banner, a window; no symbol.
    id: 'scene.vanguard-office',
    kind: 'scene',
    source: 'mvp/scenes/vanguard-office.png',
    width: 2688,
    height: 1520,
    widths: [640, 1280],
    alt: 'The district office in Beacon House: a desk under a wall map, a plain banner and a window over the town.',
  },
  {
    id: 'scene.newsroom',
    kind: 'scene',
    source: 'mvp/scenes/newsroom.png',
    width: 2688,
    height: 1520,
    widths: [640, 1280],
    alt: 'A newsroom: desks and typewriters, proofs on a spike, the print room through a glass door.',
  },
  {
    id: 'portrait.father',
    kind: 'portrait',
    source: 'mvp/portraits/father.png',
    width: 760,
    height: 950,
    crop: { left: 60, top: 40, width: 760, height: 950 },
    widths: [256, 512],
    alt: 'Your father, grey and unshaven, propped on a pillow in a worn cardigan.',
  },
  {
    id: 'portrait.stahl',
    kind: 'portrait',
    source: 'mvp/portraits/stahl.png',
    width: 760,
    height: 950,
    crop: { left: 60, top: 40, width: 760, height: 950 },
    widths: [256, 512],
    alt: 'Viktor Stahl, district organiser: bald, in a heavy dark coat and a yellow scarf.',
  },
  {
    id: 'portrait.grey',
    kind: 'portrait',
    source: 'mvp/portraits/grey.png',
    width: 760,
    height: 950,
    // The hat needs the top of the source.
    crop: { left: 60, top: 0, width: 760, height: 950 },
    widths: [256, 512],
    alt: 'Thomas Grey, constituency agent: a hat, a grey coat and a newspaper under his arm.',
  },
  avatar(
    'man-20s',
    20,
    'A young man in a white shirt and braces, sleeves rolled, dark hair uncombed, a small scar over one eyebrow.',
  ),
  avatar(
    'man-30s',
    40,
    "A man in his thirties with close dark curls and a day's stubble, in a jumper under a leather jacket.",
  ),
  avatar(
    'man-40s',
    40,
    'A man in his forties, greying hair swept back, round spectacles and a moustache, in a tweed jacket with a cap in his hand.',
  ),
  avatar(
    'woman-20s',
    40,
    'A young woman with dark curls and freckles, in a knitted cardigan with a red scarf at her throat.',
  ),
  avatar(
    'woman-30s',
    40,
    'A woman in her thirties with fair waved hair, in a belted trench coat with the collar turned up.',
  ),
  avatar(
    'woman-40s',
    40,
    'A woman in her forties, dark hair going grey and pinned back, in a plain dark jacket.',
  ),
  item('item.work-jacket', 'work-jacket-cap.jpg', 'A work jacket and a flat cap.'),
  item('item.mill-coat', 'collective-work-coat.jpg', 'A heavy mill work coat.'),
  item('item.worn-overcoat', 'wool-overcoat.jpg', 'A worn wool overcoat.'),
  item('item.winter-coat', 'winter-coat.jpg', "Your father's good wool coat."),
  item('item.document-folder', 'document-folder.jpg', 'A folder of papers tied with string.'),
  crest('vanguard', 'Iron Vanguard crest: an iron gate beneath a lantern.'),
  crest('collective', 'Red Collective crest: a hammer raised through a gear wheel.'),
  crest('alliance', 'Civic Alliance crest: a domed hall rising over a voting slot.'),
];

/** §13.5 rung 2: the scenes there are. Other locations fall back to a crop of the city map. */
export const scenes: SceneBinding[] = [
  { locationKind: 'faction-hq', factionId: 'collective', assetId: 'scene.union-hq' },
  { locationKind: 'faction-hq', factionId: 'vanguard', assetId: 'scene.vanguard-office' },
  { locationKind: 'bar', assetId: 'scene.bar-anchor' },
  { locationKind: 'press', assetId: 'scene.newsroom' },
];

/** The six faces offered at sign-up (§7.3), in the order shown. */
export const avatars: string[] = [
  'avatar.man-20s',
  'avatar.man-30s',
  'avatar.man-40s',
  'avatar.woman-20s',
  'avatar.woman-30s',
  'avatar.woman-40s',
];
