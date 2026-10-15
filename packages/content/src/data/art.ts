import type { Asset, Content, SceneBinding } from '../schemas';

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

/**
 * A location scene (§13.5 rung 2), 2688 × 1520 like the slice-1 scenes. `focus`: where a phone's crop of
 * the 16:9 picture centres (docs/design/art-wiring-oct.md §1).
 *
 * The October scenes are painted denser than slice 1's: six of the fourteen 1280 px WebPs stay over
 * their 200 KB budget at the q60 floor (207–255 KB). As for the maps (maps v3), the WebP fallback is
 * written at 640 px only; every supported browser takes the AVIF, at both widths and within budget.
 */
function scene(key: string, alt: string, focus?: { x: number; y: number }): Asset {
  return {
    id: `scene.${key}`,
    kind: 'scene',
    source: `mvp/scenes/${key}.png`,
    width: 2688,
    height: 1520,
    widths: [640, 1280],
    webpWidths: [640],
    ...(focus ? { focus } : {}),
    alt,
  };
}

/**
 * Slice 5 (tech design §13): a 4:5 head-and-shoulders portrait from an 880 × 1168 source, cropped
 * like the faces. `top` as for the faces (art-wiring-oct.md §2): 20 where a hat or the hair reaches
 * the top of the picture, 40 otherwise. `file`: the source's name when it is not the id's.
 */
function portrait(key: string, top: number, alt: string, file = key): Asset {
  return {
    id: `portrait.${key}`,
    kind: 'portrait',
    source: `mvp/portraits/${file}.png`,
    width: 760,
    height: 950,
    crop: { left: 60, top, width: 760, height: 950 },
    widths: [256, 512],
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
function cityMap(city: MapName, time: 'day' | 'night', size = 8640): Asset {
  return {
    id: `map.${city}.${time}`,
    kind: 'map',
    source: `maps-v3/${city}-${time}-${size}.png`,
    width: size,
    height: size,
    widths: [1024, 2048],
    webpWidths: [1024],
    alt: mapAlt[`${city}.${time}`],
  };
}

type MapName = 'coalport' | 'duskwall' | 'ashford' | 'irongate' | 'clearwater' | 'nation';

/**
 * Alt texts for the twelve painted maps (game designer, 2 Oct 2026): what a sighted player sees of
 * the real layout, in plain words, within the schema's 160 characters. The night ones say it is
 * night. Clearwater is not catalogued yet (its slice adds the stills with a measured budget, ADR
 * 0015); its texts wait here so the slice copies nothing by hand. Irongate and the nation: slice 4.
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
    // Slice 4: 163 characters as written; "Painted" dropped to fit the 160 of the schema (for the designer).
    'Map of the republic by day: Coalport on the coast at the left, Ashford top left, Irongate in the centre, Duskwall in the mountains, Clearwater on its lake.',
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
  // Slice 4 (tech design §13): the capital (11,520 px) and the nation (9,216 px). Tiles are their
  // first view; the stills are the first paint, the fallback and the result's map crops.
  cityMap('irongate', 'day', 11_520),
  cityMap('irongate', 'night', 11_520),
  cityMap('nation', 'day', 9_216),
  cityMap('nation', 'night', 9_216),
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
  // October 2026 (docs/design/art-wiring-oct.md §2): twelve more faces, eighteen at sign-up.
  avatar(
    'man-20s-b',
    40,
    'A young man with cropped fair hair and freckles, in a cable-knit jumper, holding his flat cap.',
  ),
  avatar(
    'man-20s-c',
    40,
    'A lanky, freckled young man with red hair and big ears, in a jacket too big for him.',
  ),
  avatar(
    'man-30s-b',
    40,
    'A man in his thirties with a shaved head and a moustache, in shirt sleeves and a dark waistcoat.',
  ),
  avatar(
    'man-30s-c',
    40,
    "A stocky bearded docker in his thirties in a knit cap, a fisherman's sweater and a pea coat.",
  ),
  avatar(
    'man-40s-b',
    20,
    'A man in his forties in a flat cap, unshaven, in a heavy worn coat with the collar up and a scarf.',
  ),
  avatar(
    'man-50s',
    20,
    'A man in his fifties with silver hair and a short beard, a red knitted scarf over a tweed coat.',
  ),
  avatar(
    'woman-20s-b',
    20,
    'A broad-faced young woman with a long light-brown plait, in a knitted waistcoat.',
  ),
  avatar(
    'woman-20s-c',
    40,
    'A lean young woman with cropped dark hair under a flat cap, a cigarette behind her ear.',
  ),
  avatar(
    'woman-30s-b',
    20,
    'A woman in her thirties with red hair in a plait and a smudge on her cheek, in a red neckerchief and dungarees.',
  ),
  avatar(
    'woman-30s-c',
    40,
    'A sturdy, round-faced woman in her thirties in a patterned headscarf and an apron.',
  ),
  avatar(
    'woman-40s-b',
    20,
    'A woman in her forties in a small dark red hat and pearl earrings, in a tailored suit.',
  ),
  avatar(
    'woman-50s',
    40,
    'A woman in her fifties with grey hair pinned up and spectacles on a chain, in a dark cardigan with a brooch.',
  ),
  // October 2026 (docs/design/art-wiring-oct.md §1): fourteen location scenes.
  scene(
    'factory-gate',
    'A works gate at the shift change: men in caps streaming out under the clock, a tram waiting, a man handing a flyer to a woman in a red coat.',
    { x: 0.6, y: 0.55 },
  ),
  scene(
    'docks',
    "Dockers eating on the bollards at the water's edge, sacks and a crane behind them, a steamer and a tug on the harbour.",
  ),
  scene(
    'market',
    'A market under striped awnings round a stone column: a fish stall, bread and bootlaces, shoppers with baskets, a tram passing behind.',
  ),
  scene(
    'station',
    'Inside a glass-roofed station: the departure board and clock, porters with trunks on trolleys, passengers in coats, a locomotive letting off steam.',
    { x: 0.45, y: 0.6 },
  ),
  // Review 5 (answers §19.7 and its art note, 8 Oct): beat 1 of *Coming home*, the demobilisation
  // office. The focus holds the counter and the head of the queue on a tall phone panel.
  scene(
    'demob-office',
    'The demobilisation office: clerks stamping papers at a long counter, a queue of men with kitbags, a woman with a clipboard on the bench by the door.',
    { x: 0.42, y: 0.45 },
  ),
  // Review 4 (answers §2.9, §30.3; ADR 0073): beats 2 and 3 of *The Last Train In*. The source (7 Oct,
  // the empty compartment) is the scenes' 2688 × 1520 already, so nothing is cut. The desktop's tall
  // panel centres on the rack and the window's left half, so the suitcase stays in the picture.
  scene(
    'train-compartment',
    'An empty third-class compartment at first light: wooden benches, a suitcase on the rack, a dark coat on one bench, a parcel on the other, fields at the window.',
    { x: 0.3, y: 0.4 },
  ),
  scene(
    'street',
    'A terraced street of brick houses: a woman with a flyer at a doorstep, washing on the lines, children playing football on the cobbles.',
  ),
  scene(
    'square',
    'A speaker on a box on the steps of a church, a crowd in hats listening, a bandstand and trees behind them.',
  ),
  scene(
    'hotel',
    'A grand hotel lobby: marble columns and a chandelier, a man reading a paper in an armchair, two men talking over a low table, the desk clerk beyond.',
  ),
  scene(
    'court',
    'A courtroom: three judges on the bench, counsel in gowns at the tables, a witness in the box, the public benches full.',
  ),
  scene(
    'university',
    'Students with books crossing a college quad in autumn, a green dome and a cloister behind the trees.',
  ),
  scene(
    'library',
    'A reading room: a man writing under a green lamp, shelves of bound files to the ceiling, a clerk with a trolley, a woman on a ladder.',
    { x: 0.35, y: 0.6 },
  ),
  scene(
    'ministry',
    'A ministry counter: clerks stamping papers under hanging lamps, a queue of people in coats with cases, filing cabinets and a clock.',
  ),
  scene(
    'alliance-hq',
    'A committee round a long table with a map and tea cups, bookshelves, a window over the river and a domed roof.',
  ),
  scene(
    'gym',
    'A boxing gym: two men sparring in the ring, others skipping and at the punchbags, tall windows over the town.',
  ),
  scene(
    'theatre',
    'An opera foyer at the interval: evening dress and champagne, a marble staircase under chandeliers, an usher at a box door.',
  ),
  // Review 4 (answers §28 art 1, ADR 0077): the council chamber for the `town-hall` kind.
  scene(
    'town-hall',
    'A council chamber: a horseshoe of desks, the chair under an arched window, a clerk with the minute book, and the public at the gallery rail.',
  ),
  // Slice 5 (tech design §13; slice-5-risk.md §21, alt texts §23.5): the five mission cards (rung 4),
  // the strike card, the infirmary and the cells.
  scene(
    'mission-speech',
    'A speaker in shirtsleeves leans on a platform rail under a loudspeaker horn, pointing down at a shipyard crowd who wave caps and clap; a hull and cranes behind.',
  ),
  scene(
    'mission-watch',
    'A man in a hat at a café window with a newspaper, a coffee and a notebook, watching two men in coats at a lit hotel doorway across a wet street at dusk.',
  ),
  scene(
    'mission-posters',
    'A woman with a paste brush at a half-stripped poster on a brick wall at night, a man with rolled sheets looking back down the street; a bucket on the kerb.',
  ),
  scene(
    'mission-sabotage',
    'A man in a flat cap crouched at a printing press in a dark print room, a hand lamp in one hand and the other on the drive wheel; stacks of paper, the door open.',
  ),
  scene(
    'mission-theft',
    'A man in a dark overcoat lifting papers from an open filing cabinet in a dim office, eyes on a frosted door where a hatted shadow stands; a desk lamp, files.',
  ),
  {
    // The disruption card: a halftone news print at 2048 × 1360 (3:2), cropped to the other scenes'
    // ratio (2688 × 1520) below the chimney tops; its WebP may step one further (scripts/art/build.ts).
    // The alt texts of this one, the infirmary and the cells are drafts for the designer to confirm.
    ...scene(
      'news-strike',
      'A woman in a belted coat speaking from a box at a works gate, strikers in caps holding up blank placards, a line of police in helmets by the railings.',
    ),
    width: 2048,
    height: 1158,
    crop: { left: 0, top: 40, width: 2048, height: 1158 },
  },
  // Slice 6 (tech design 13; design 18): the two event scenes. Content policy checked: posters
  // blank, bunting plain stripes; no flag, symbol, torch or armband.
  scene(
    'event-poster-night',
    "A poster crew at night at a long fence: a bucket, a brush, a stack of blank sheets under a street lamp, a printer's handcart.",
  ),
  scene(
    'event-grand-rally',
    'A main square full at dusk under strings of lamps, seen from the back of the crowd: a timber stand, plain striped bunting, the fortress wall beyond.',
  ),
  scene(
    'hospital',
    'An infirmary: men asleep in iron beds under tall arched windows, a nurse with a tray walking down the aisle, a doctor in a white coat reading a chart.',
  ),
  scene(
    'jail-cell',
    'A cell through its bars: a bench with a blanket and a tin mug, tally marks on the wall, moonlight from a high window, a man in a peaked cap in the lit corridor.',
  ),
  // Slice 5: the run-in opponents, the cells' duty officer (the file keeps its old name), the
  // constable and the matron.
  portrait(
    'street-enforcer',
    40,
    'A Vanguard street enforcer: a heavy-shouldered man in a flat cap and a rough dark jacket over an open collar, stubble, a bruised cheekbone, fists clenched.',
  ),
  portrait(
    'vanguard-doorman',
    40,
    'The doorman at Beacon House: a big man in a dark double-breasted coat with the collar up, close-cropped hair, arms folded in leather gloves.',
  ),
  portrait(
    'strike-picket',
    40,
    "A Collective strike picket: a young man in a knitted cap and a red scarf over a work jacket, his breath in the cold, a gloved hand on a blank placard's pole.",
  ),
  portrait(
    'branch-inspector',
    20,
    'A Collective branch inspector: a neat man with round spectacles, a moustache and a pencil behind his ear, a grey suit and waistcoat, a notebook under his arm.',
  ),
  portrait(
    'party-thug',
    40,
    'An Alliance party heavy: a man with slicked dark hair, a scar through one eyebrow and a toothpick in his teeth, a dark leather coat over a maroon roll-neck.',
  ),
  portrait(
    'duty-officer',
    20,
    'The duty officer of the civic police: a grey-moustached man in a dark tunic and a peaked cap with a plain shield badge, a pen in his hand.',
    'sergeant',
  ),
  portrait(
    'kessler',
    20,
    'A constable of the city police in plain clothes: a man in a fedora and a belted trench coat with the collar up, a grey moustache, a cigarette in his mouth.',
  ),
  portrait(
    'matron',
    40,
    "The matron: a woman in a white nurse's cap, dark hair pinned back, a dark cape over a white collar and apron, looking straight at you.",
    'nurse',
  ),
  item('item.work-jacket', 'work-jacket-cap.jpg', 'A work jacket and a flat cap.'),
  item('item.mill-coat', 'collective-work-coat.jpg', 'A heavy mill work coat.'),
  item('item.worn-overcoat', 'wool-overcoat.jpg', 'A worn wool overcoat.'),
  // Review 5 (answers §19.10.6): the demob suit's picture.
  item('item.winter-coat', 'winter-coat.jpg', 'A plain wool overcoat, the kind issued with a demob suit.'),
  item('item.document-folder', 'document-folder.jpg', 'A folder of papers tied with string.'),
  crest('vanguard', 'Iron Vanguard crest: an iron gate beneath a lantern.'),
  crest('collective', 'Red Collective crest: a hammer raised through a gear wheel.'),
  crest('alliance', 'Civic Alliance crest: a domed hall rising over a voting slot.'),
];

/**
 * §13.5 rung 2: the scenes there are. Other locations fall back to a crop of the city map. October
 * 2026 (art-wiring-oct.md §1) and slice 5 (tech design §13: `hospital`, `jail`): every kind has one
 * but `parliament` (held until an action is set in the chamber) and `barracks`.
 */
/**
 * Slice 5 (GDD §13.5 rung 4, design §21): the mission card of each type, shown on a mission's result
 * before the place's kind scene. Disruption's is the existing strike picture.
 */
export const missionCards: Content['art']['missionCards'] = [
  { missionType: 'speech', assetId: 'scene.mission-speech' },
  { missionType: 'surveillance', assetId: 'scene.mission-watch' },
  { missionType: 'vandalism', assetId: 'scene.mission-posters' },
  { missionType: 'disruption', assetId: 'scene.news-strike' },
  { missionType: 'sabotage', assetId: 'scene.mission-sabotage' },
  { missionType: 'theft', assetId: 'scene.mission-theft' },
];

export const scenes: SceneBinding[] = [
  { locationKind: 'faction-hq', factionId: 'collective', assetId: 'scene.union-hq' },
  { locationKind: 'faction-hq', factionId: 'vanguard', assetId: 'scene.vanguard-office' },
  { locationKind: 'faction-hq', factionId: 'alliance', assetId: 'scene.alliance-hq' },
  { locationKind: 'bar', assetId: 'scene.bar-anchor' },
  { locationKind: 'press', assetId: 'scene.newsroom' },
  { locationKind: 'factory-gate', assetId: 'scene.factory-gate' },
  { locationKind: 'docks', assetId: 'scene.docks' },
  { locationKind: 'market', assetId: 'scene.market' },
  { locationKind: 'station', assetId: 'scene.station' },
  { locationKind: 'street', assetId: 'scene.street' },
  { locationKind: 'square', assetId: 'scene.square' },
  { locationKind: 'hotel', assetId: 'scene.hotel' },
  { locationKind: 'court', assetId: 'scene.court' },
  { locationKind: 'university', assetId: 'scene.university' },
  { locationKind: 'library', assetId: 'scene.library' },
  { locationKind: 'ministry', assetId: 'scene.ministry' },
  { locationKind: 'gym', assetId: 'scene.gym' },
  { locationKind: 'theatre', assetId: 'scene.theatre' },
  { locationKind: 'hospital', assetId: 'scene.hospital' },
  { locationKind: 'jail', assetId: 'scene.jail-cell' },
  // Review 4 (answers §28 art 1): the Town Halls.
  { locationKind: 'town-hall', assetId: 'scene.town-hall' },
];

/**
 * The faces offered at sign-up (§7.3), in the order shown: eighteen since October 2026, mixed so the
 * first row is varied however the grid wraps (art-wiring-oct.md §2.1).
 */
export const avatars: string[] = [
  'avatar.woman-20s-c',
  'avatar.man-40s-b',
  'avatar.woman-50s',
  'avatar.man-20s',
  'avatar.woman-30s-c',
  'avatar.man-30s-c',
  'avatar.woman-20s',
  'avatar.man-50s',
  'avatar.woman-40s-b',
  'avatar.man-20s-c',
  'avatar.woman-30s-b',
  'avatar.man-40s',
  'avatar.woman-40s',
  'avatar.man-30s-b',
  'avatar.woman-20s-b',
  'avatar.man-30s',
  'avatar.woman-30s',
  'avatar.man-20s-b',
];
