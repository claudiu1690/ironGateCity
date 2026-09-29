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
  // Slice 2 (ADR 0015, docs/tech/slice-2.md §13). Duskwall and Ashford maps are RGB: no flatten.
  {
    id: 'map.duskwall.day',
    kind: 'map',
    source: 'maps-pen/duskwall.png',
    width: 5056,
    height: 3392,
    widths: [1280, 2560],
    alt: 'Illustrated map of Duskwall by day: the fortress and its gate, the market tents, Beacon House and its searchlight, the Archives, the goods yard.',
  },
  {
    id: 'map.duskwall.night',
    kind: 'map',
    source: 'maps-pen/duskwall-night.png',
    width: 5056,
    height: 3392,
    widths: [1280, 2560],
    alt: 'Illustrated map of Duskwall at night: the searchlight over Beacon House, lit windows in the fortress and along the line.',
  },
  {
    id: 'map.ashford.day',
    kind: 'map',
    source: 'maps-pen/ashford.png',
    width: 5056,
    height: 3392,
    widths: [1280, 2560],
    alt: "Illustrated map of Ashford by day: Gazette House, the Assembly Rooms, the college dome, the courts, the bridges and the weavers' tenements.",
  },
  {
    id: 'map.ashford.night',
    kind: 'map',
    source: 'maps-pen/ashford-night.png',
    width: 5056,
    height: 3392,
    widths: [1280, 2560],
    alt: 'Illustrated map of Ashford at night: lamps on the bridges, the lit dome of the college and the print room still working.',
  },
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
  crest('alliance', 'Civic Alliance crest: a domed hall rising over an open ballot.'),
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
