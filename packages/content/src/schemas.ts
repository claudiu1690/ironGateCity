import {
  ACTION_KINDS,
  FACTION_IDS,
  MISSION_TYPE_IDS,
  STAT_KEYS,
  TRAINABLE_STATS,
  ordinanceBoundProblem,
} from '@irongate/rules';
import type {
  HeadlineCondition,
  HeadlineTemplate,
  OrderMatch,
  OrderTemplate,
  OrdinanceEffect as OrdinanceEffectRule,
  OriginEffect as OriginEffectRule,
} from '@irongate/rules';
import { z } from 'zod';

/** Internal faction ids. Display names are data (GDD: faction naming is parked). */
export const FactionId = z.enum(FACTION_IDS);
export const StatKey = z.enum(STAT_KEYS);

export const Crest = z.enum(['square', 'circle', 'triangle']);

/** Lower-case, dotted by containment ("coalport.mill-gate.canvass"). */
const Id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/, 'lower-case, dotted by containment');

export const AssetId = Id;
export const NpcId = Id;
export const JobId = Id;
export const ItemId = Id;
export const AmbitionId = Id;

const HexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'a #RRGGBB colour');
const Fraction = z.number().min(0).max(1);

/** A candidate's platform line (design §6.4); printed beside the name, no effect. */
export const Platform = z.strictObject({ id: Id, line: z.string().min(1).max(90) });

export const Faction = z.strictObject({
  id: FactionId,
  name: z.string().min(1),
  shortName: z.string().min(1),
  /** The plain shape, for small marks (HUD, plate, lists). */
  crest: Crest,
  /** The SVG crest (a `vector` asset) for the street card and the party card (onboarding §13 Q6). */
  crestArt: AssetId,
  homeCityId: z.string().min(1),
  /** §7.3 / §16.1: Vanguard +3 STR, Collective +2 STR +1 INT, Alliance +3 INT. CHA is worn, never a bonus. */
  startingBonus: z.strictObject({
    str: z.number().int().optional(),
    int: z.number().int().optional(),
    agi: z.number().int().optional(),
  }),
  /** §5.4: the seven Rank titles, index 0 = Rank 1. */
  rankTitles: z.array(z.string().min(1)).length(7),
  /** §13.7: the NPC secretary who issues Party orders until a Chair exists. */
  secretary: z.strictObject({
    npcId: NpcId,
    signature: z.string().min(1),
    /** "Secretary Holm": `{secretary}` in story text. */
    addressedAs: z.string().min(1),
  }),
  /** "the Union Hall" / "Beacon House" / "the Rooms": `{hq}` in story text. */
  hqRef: z.string().min(1),
  /** §21.4: the outfit worn and the party card carried from the start. */
  kit: z.strictObject({ outfit: ItemId, card: ItemId }),
  /**
   * §13.7, ADR 0012, review 1: the welcome day's orders. Slot A by the player's best trained stat
   * (ties to the faction's bonus stat, then INT, then STR); slots B and C as they are.
   */
  welcomeOrders: z.strictObject({
    A: z.strictObject({ str: Id, int: Id, agi: Id }),
    B: Id,
    C: Id,
  }),
  /** §7.3: the street card. */
  card: z.strictObject({
    blurb: z.string().min(1).max(240),
    /** With its article: "the General Strike" (onboarding §13.1). */
    signatureEvent: z.string().min(1).max(40),
  }),
  /** Slice 3 (design §10.2): the branch's motion, item 1 on every order paper; the NPC default. */
  branchMotion: Id,
  /** Slice 3 (design §6.4): the three platform lines a candidate picks from. */
  platforms: z.tuple([Platform, Platform, Platform]),
  /** Slice 3 (design §11.3): the Unrest pair, slots A and B (`use: 'crisis'`, `doneFxp: 40`). */
  restoreOrders: z.tuple([Id, Id]),
});

/** §13.5: the art key for the fallback ladder. Closed list; kinds may be added, never removed. */
export const LocationKind = z.enum([
  'factory-gate',
  'docks',
  'market',
  'station',
  'street',
  'square',
  'bar',
  'hotel',
  'press',
  'faction-hq',
  'hospital',
  'jail',
  'court',
  'university',
  'library',
  'gym',
  'barracks',
  'parliament',
  'ministry',
  /** Slice 4 (design §4.3): the Opera (its scene since art-wiring-oct.md). */
  'theatre',
  /** Review 4 (GDD §13.5, ADR 0077): the council's hall in every city; open at every Level. */
  'town-hall',
]);

export const ActionType = z.enum(['canvass', 'speech', 'propaganda', 'intelligence', 'council', 'training']);

/** Headline plus a 2–3 line narrative paragraph (CLAUDE.md: short sessions). */
export const OutcomeText = z.strictObject({
  headline: z.string().min(1).max(80),
  body: z.string().min(1).max(400),
});

/**
 * A check on one stat, the average of two (§8.4), or (review 1) `['best']`: the highest of STR,
 * INT and AGI, resolved in rules (council sessions, the chapter-1 *Legwork* approach).
 */
export const CheckStatsSchema = z.union([
  z.tuple([StatKey]),
  z.tuple([StatKey, StatKey]),
  z.tuple([z.literal('best')]),
]);

/** Canvass, speech, propaganda, intelligence, council: one roll per attempt (§8.4). */
export const CheckedAction = z.strictObject({
  id: Id,
  name: z.string().min(1),
  tier: z.literal(1),
  type: z.enum(['canvass', 'speech', 'propaganda', 'intelligence', 'council']),
  stats: CheckStatsSchema,
  /** §13.3: intelligence 3–4 … speech 12, inside the tier-1 band. */
  energy: z.number().int().min(3).max(15),
  /** §13.3: which rewards the action type gives. */
  givesFxp: z.boolean(),
  givesOpinion: z.boolean(),
  requires: z
    .strictObject({
      level: z.number().int().min(1).optional(),
      standing: z.number().int().min(0).max(4).optional(),
    })
    .optional(),
  /**
   * Review 4 (ADR 0073): a one-off welcome ticket (the favour from the platform). Offered only while
   * its `use: 'welcome'` order is open today; ×1 only (`ONCE_ONLY`), otherwise `NOT_OFFERED`.
   */
  use: z.literal('welcome').optional(),
  text: z.strictObject({ success: OutcomeText, partial: OutcomeText }),
});

/** §8.5: not a check; +1 stat; cost 20 + 2 × stat at runtime. CHA is never trained. */
export const TrainingAction = z.strictObject({
  id: Id,
  name: z.string().min(1),
  tier: z.literal(1),
  type: z.literal('training'),
  trains: z.enum(TRAINABLE_STATS),
  /**
   * Review 3 (GDD §8.5, `docs/design/review-3-answers.md` §5): the ticket's button is the title's
   * verb (*Study*, *Lift*, *Run*, *Unload*), never "Train"; the result's repeat button reads
   * "{verb} again · {cost} Energy". One capitalised word of 2–6 letters, so it fits the 64 px button.
   */
  verb: z.string().regex(/^[A-Z][a-z]{1,5}$/, 'one capitalised word of 2–6 letters'),
  text: z.strictObject({ success: OutcomeText }),
});

export const Action = z.discriminatedUnion('type', [CheckedAction, TrainingAction]);

/**
 * Maps v3 (ADR 0024 revised): a rectangle of a city's one big picture, in fractions of it. A quarter
 * (and from slice 4 a capital district) is a frame, not an image.
 */
export const Frame = z
  .strictObject({ x0: Fraction, y0: Fraction, x1: Fraction, y1: Fraction })
  .refine((f) => f.x0 < f.x1 && f.y0 < f.y1, 'a frame needs x0 < x1 and y0 < y1');

const Share = z.number().min(0).max(100);

/** §14.2 / §14.11: three faction shares plus Neutral, summing to 100 (checked by the loader). */
export const Shares = z.strictObject({
  vanguard: Share,
  collective: Share,
  alliance: Share,
  neutral: Share,
});

/**
 * GDD §14.13 (review 4, ADR 0076): a part of a city. In a home city it is the Level gate of a group of
 * places (`opens`, `name`, `blurb`), read on the Places list; only the capital's districts are
 * framed and outlined on the picture (`frame`, `outline`, `label`, `district`: the loader requires
 * them there and refuses them anywhere else).
 */
export const Quarter = z.strictObject({
  /** Dotted under its city ("coalport.mill"). */
  id: Id,
  name: z.string().min(1),
  /** A district's zoom target at rest (the capital only). */
  frame: Frame.optional(),
  /** Slice 4 (tech design §4.1): a district's card text (screens §5.1). */
  blurb: z.string().min(1).max(200).optional(),
  /**
   * Slice 4 (ADR 0027): present on every quarter of a city with districts (the capital). `n` is the
   * overview pin's number (1–5), `baselineOpinion` the district's baseline (design §4.1), `anchor`
   * the overview pin (screens §5.1).
   */
  district: z
    .strictObject({
      n: z.number().int().min(1).max(9),
      baselineOpinion: Shares,
      anchor: z.strictObject({ x: Fraction, y: Fraction }),
    })
    .optional(),
  /**
   * The user's district lock (3 Oct 2026), slice 5 (ADR 0035): the quarter's shape on the city's
   * picture, a polygon in fractions following the water, the main streets and the drawn blocks
   * (moved here from `district.outline`). The overview draws it with the name; a quarter view dims
   * the picture outside it. Every pin of the quarter lies inside it and no two outlines of a city
   * overlap (the loader checks both); the frame stays the zoom target.
   */
  outline: z.array(z.tuple([Fraction, Fraction])).min(6).max(24).optional(),
  /** Slice 5 (screens §10): where the quarter's name sits on the overview. */
  label: z.strictObject({ x: Fraction, y: Fraction }).optional(),
  /**
   * Slice 5 (GDD §14.13): the Level that opens it per character, or a later edition (a teaser).
   * Absent: Level 1 (`quarterOpen` reads it so).
   */
  opens: z
    .union([
      z.strictObject({ level: z.union([z.literal(1), z.literal(6), z.literal(10)]) }),
      z.strictObject({ edition: z.literal('later') }),
    ])
    .optional(),
});

/** Slice 5 (design §4.2, ADR 0031): the six mission types; their numbers live in rules. */
export const MissionType = z.enum(MISSION_TYPE_IDS);

/** Design §4.4: a way to do a mission. A louder way carries its own Heat or run-in base. */
export const Way = z.strictObject({
  id: Id,
  title: z.string().min(1).max(60),
  stats: CheckStatsSchema,
  hint: z.string().min(1).max(90),
  heat: z.number().int().min(0).max(30).optional(),
  runIn: z.number().int().min(0).max(90).optional(),
  /** Review 5 (answers §12.1, ADR 0080): played only at night; by day shown with *Opens at nightfall*. */
  window: z.literal('night').optional(),
});

/** Design §4–§5 (ADR 0031): a tier-2 mission at a place, after its tickets. */
export const Mission = z.strictObject({
  id: Id,
  name: z.string().min(1).max(80),
  tier: z.literal(2),
  type: MissionType,
  /** = MISSION_TYPES[type].energy (the loader holds it). */
  energy: z.number().int().min(1),
  level: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  /** = missionDifficulty(level, city.role) (the loader holds it; design §23.1 #1). */
  difficulty: z.number().int().min(14).max(22),
  requires: z
    .strictObject({
      rank: z.literal(3).optional(),
      standing: z.number().int().min(0).max(4).optional(),
    })
    .optional(),
  /** An illegal type's target: a faction, or (the capital) the district's leader. */
  target: z.union([FactionId, z.literal('leader')]).optional(),
  /** The opponents a run-in draws from (design §10.2). */
  pool: z.array(Id).min(1).max(4),
  /**
   * Design §4.4: where you are, the job, what could go wrong. Held to 300 characters and four
   * sentences (design/slice-5-fixes.md §2, QA m2: the title, the text and two ways above the button
   * on a short phone); outcome texts keep 240.
   */
  briefing: z.string().min(1).max(300),
  ways: z.array(Way).min(2).max(3),
  text: z.strictObject({ success: OutcomeText, partial: OutcomeText, failure: OutcomeText }),
  /** Overrides the type's mission card (§13.5 rung 4); a `scene`. */
  card: AssetId.optional(),
  /**
   * Review 5 (answers §12.1, ADR 0080): a night mission, played only at night, at the night rate
   * (+25 % Iron). Its ways carry no window of their own.
   */
  window: z.literal('night').optional(),
});

export const Location = z.strictObject({
  id: Id,
  name: z.string().min(1),
  /** Review 1: the name in running text when it takes an article ("the Mill Gate"); default the name. */
  ref: z.string().min(1).optional(),
  kind: LocationKind,
  blurb: z.string().min(1).max(200),
  /** Fractions of the city map image; the pin number is the location's index + 1. */
  map: z.strictObject({ x: Fraction, y: Fraction }),
  /** The quarter of its city it is in; its pin lies inside that quarter's frame (maps v3). */
  quarterId: Id,
  /** Slice 4 (design §4.3): members only; required on every `faction-hq` (the faction whose HQ it is). */
  factionId: FactionId.optional(),
  actions: z.array(Action).min(1),
  /** Slice 5 (ADR 0031): the place's missions, listed after its tickets. */
  missions: z.array(Mission).optional(),
  /**
   * Review 4 #9 (answers §9.3, tech design §10.1): the paid bed is a card at a place, said as a bed
   * (*A bed on the tram line · 7 nights · 100 Iron*). At most one per city, and only in `ROOM.cityId`
   * until slice 7 (the Rows in Clearwater).
   */
  lodgings: z.strictObject({ line: z.string().min(1).max(60) }).optional(),
  /**
   * Review 5 (answers §8, §18 Q14; tech design §6.2): *Get patched up* on the place's sheet, said by
   * its carer (*See the matron*). Only on `hospital` places, and required on every one.
   */
  treatment: z.strictObject({ carer: z.enum(['matron', 'sister', 'nurse']) }).optional(),
});

export const City = z.strictObject({
  id: Id,
  name: z.string().min(1),
  role: z.enum(['home', 'battleground']),
  homeFactionId: FactionId.optional(),
  /**
   * §14.2 / §14.11: three faction shares plus Neutral, summing to 100. A city with districts: the
   * equal average of its districts' baselines (checked by the loader).
   */
  baselineOpinion: Shares,
  /** The detailed map by day and by night (asset ids). */
  map: z.strictObject({ day: AssetId, night: AssetId }),
  /**
   * Maps v3: the city's quarters, frames on its one picture. The city view opens on the first. Only
   * the first quarter of each home city exists until quarter 2 is built.
   */
  quarters: z.array(Quarter).min(1),
  /**
   * Map atmosphere (clouds design note, 2 Oct 2026): clouds drift over the city map by day and fog
   * by night, a client-side overlay (`CityMap`'s `clouds`). Tried on Coalport first; switched on
   * per city once the user approves the look. Absent: off.
   */
  clouds: z.boolean().optional(),
  /** §3.3: the home city's paper ("The Coalport Clarion"). */
  paper: z
    .strictObject({
      name: z.string().min(1),
      /** For short lines: "The Clarion is in" (content §13.7). */
      shortName: z.string().min(1),
      strapline: z.string().min(1),
      price: z.string().min(1),
    })
    .optional(),
  /**
   * Slice 3 (GDD §2, §15.3): the council cycle's offset (Irongate 0 … Clearwater 4). Review 3
   * (`docs/design/review-3-answers.md` §6a): `hall` is the building the council sits in; the election
   * screens show a crop of the map there, by day or night. Review 4 (ADR 0077): the hall is a location
   * of the city (kind `town-hall`, or Clearwater's Casino), and its name, `ref` and point are read
   * from it.
   */
  council: z
    .strictObject({
      offset: z.number().int().min(0).max(4),
      /** Seven at home; ten in the capital (two per district, GDD §15.3). */
      seats: z.union([z.literal(7), z.literal(10)]),
      hall: z.strictObject({ locationId: Id }),
    })
    .optional(),
  locations: z.array(Location),
  /**
   * Slice 5 (design §8.1, §9.2): where the game sends a player in this city: the cells (a `jail`
   * place; Irongate's Police Headquarters, a `ministry`) and the infirmary (a `hospital`). Required on
   * every council city (the loader).
   */
  services: z.strictObject({ cells: Id, infirmary: Id }).optional(),
  /** Slice 5 (design §10.5): a home city's opponents for a visitor's tier-1 run-in. */
  runInPool: z.array(Id).min(1).optional(),
});

export const AssetKind = z.enum(['map', 'scene', 'portrait', 'avatar', 'item', 'vector']);

/** ADR 0007, 0015: every image the game references, by id. The build script reads `source`. */
export const Asset = z.strictObject({
  id: AssetId,
  kind: AssetKind,
  /** Path relative to the art source folder (IRONGATE_ART_SRC). */
  source: z.string().min(1),
  /** Size of the image after the crop, for its aspect ratio. */
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  /** Output widths; files are /art/<id>-<width>.avif|webp. None for a `vector` (/art/<id>.svg). */
  widths: z.array(z.number().int().min(16)),
  /**
   * The WebP fallback's widths when fewer than `widths` (maps v3: the painted maps' WebP only at
   * 1024 px; AVIF, which every supported browser takes, at every width). Default: `widths`.
   */
  webpWidths: z.array(z.number().int().min(16)).min(1).optional(),
  /** ADR 0015: where a cropping panel centres the image (object-position). */
  focus: z.strictObject({ x: Fraction, y: Fraction }).optional(),
  alt: z.string().min(1).max(160),
  /** Flatten transparency onto this colour (the day map has alpha). */
  flatten: HexColour.optional(),
  crop: z
    .strictObject({
      left: z.number().int().min(0),
      top: z.number().int().min(0),
      width: z.number().int().min(1),
      height: z.number().int().min(1),
    })
    .optional(),
});

/**
 * ADR 0024 (maps v3): one map's Deep Zoom pyramid, as `pnpm art:tiles` wrote it to
 * `.art-cache/tiles/<assetId>/<rev>/` (generated `data/tiles.json`).
 */
export const TilesEntry = z.strictObject({
  /** First 8 hex of sha256(master + settings): the pyramid's folder, new for every re-export. */
  rev: z.string().regex(/^[0-9a-f]{8}$/),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  tileSize: z.number().int().min(1),
  overlap: z.number().int().min(0),
  maxLevel: z.number().int().min(0),
  /** The tiles' image format (maps v3 §9.2: AVIF; WebP was the first pyramid). */
  format: z.enum(['avif', 'webp']),
  /** Files and bytes of the whole pyramid (for the storage figures). */
  tiles: z.number().int().min(1),
  bytes: z.number().int().min(1),
});
/** Keyed by asset id (`map.<name>.<day|night>`); entries without a catalogue asset are allowed. */
export const TilesManifest = z.record(AssetId, TilesEntry);

/**
 * Maps v3 §5.4: the survey of the art, every place painted on each picture (pins.json), current and
 * future. Not game content: nothing in the server reads it. A location's `map` equals its pin here.
 */
export const SurveyPin = z.strictObject({
  id: Id,
  name: z.string().min(1),
  x: Fraction,
  y: Fraction,
  /** The quarter (Irongate: district) number on the art, 1-based. */
  quarter: z.number().int().min(1),
});
export const MapPins = z.record(z.string().min(1), z.strictObject({ pins: z.array(SurveyPin) }));

/** §13.5 rung 2: a scene for a location kind (and a faction, for `faction-hq`). */
export const SceneBinding = z.strictObject({
  locationKind: LocationKind,
  factionId: FactionId.optional(),
  assetId: AssetId,
});

export const Npc = z.strictObject({
  id: NpcId,
  name: z.string().min(1),
  title: z.string().min(1),
  factionId: FactionId.optional(),
  cityId: z.string().optional(),
  portrait: AssetId,
  /** Review 4: the story's `{helperPronoun}` (*She* comes back to ask). */
  pronoun: z.enum(['she', 'he']).optional(),
});

/** §13.4: the five Local Standing names; the thresholds live in rules. */
export const StandingLevels = z.array(z.strictObject({ name: z.string().min(1) })).length(5);

export const Job = z.strictObject({
  id: JobId,
  name: z.string().min(1),
  locationId: Id,
  /** "Level 3, AGI 10": checked on taking, never again (§9.1). */
  unlock: z.strictObject({
    level: z.number().int().min(1),
    stats: z.partialRecord(StatKey, z.number().int().min(0)).optional(),
  }),
  /** Pinned per job (§9.2); paid in full at every boundary (review 1, §9.1). */
  dailyPay: z.number().int().min(1),
  /** { collective: 0.2 } → 216. */
  factionPayBonus: z.partialRecord(FactionId, z.number().min(0).max(1)).optional(),
  blurb: z.string().min(1).max(160),
});

export const OrderMatchSchema = z
  .strictObject({
    actionTypes: z.array(ActionType).min(1).optional(),
    actionIds: z.array(Id).min(1).optional(),
    locationIds: z.array(Id).min(1).optional(),
    cityId: z.union([z.literal('home'), Id]).optional(),
    kinds: z.array(z.enum(ACTION_KINDS)).min(1).optional(),
    /** Slice 4 (design §10): a district id, or 'home' for the residence district. */
    districtId: z.union([z.literal('home'), Id]).optional(),
    /** Slice 4: any action tagged with a live Issue. */
    issueTagged: z.literal(true).optional(),
    /** Slice 4: location kinds. */
    locationKinds: z.array(LocationKind).min(1).optional(),
  })
  .refine(
    (m) => Object.keys(m).length > 0,
    'a match needs at least one field',
  ) satisfies z.ZodType<OrderMatch>;

export const OrderTemplateSchema = z.strictObject({
  id: Id,
  factionId: FactionId,
  /** Rotation order = order in the file, per slot. */
  slot: z.enum(['A', 'B', 'C']),
  title: z.string().min(1).max(60),
  /** The secretary's line. */
  line: z.string().min(1).max(140),
  match: OrderMatchSchema,
  target: z.number().int().min(1),
  counts: z.enum(['attempts', 'successes']),
  /**
   * Slice 3: `crisis` templates (Restore the base) never enter the rotation; review 1: nor do
   * `welcome` ones (the welcome set's slot A by best stat, *Take a job*).
   */
  use: z.enum(['rotation', 'crisis', 'welcome']).default('rotation'),
  /** Slice 3: FXP when completed; default DIRECTIVES.orderDoneFxp (20). */
  doneFxp: z.number().int().min(1).optional(),
  /**
   * Slice 4 (design §10): whose rotation: home residents (default), capital residents (slots A and
   * B), or both (slot C).
   */
  residence: z.enum(['home', 'capital', 'any']).default('home'),
  /** Slice 5 (design §12.2): enters a member's rotation from this Level. */
  minLevel: z.number().int().min(1).optional(),
}) satisfies z.ZodType<OrderTemplate, unknown>;

export const HeadlineConditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('firstEdition') }),
  z.strictObject({
    kind: z.literal('rankRose'),
    values: z.array(z.number().int().min(1)).min(1).optional(),
    min: z.number().int().min(1).optional(),
  }),
  z.strictObject({ kind: z.literal('levelRose') }),
  z.strictObject({ kind: z.literal('standingRose') }),
  z.strictObject({ kind: z.literal('ordersAllDoneYesterday') }),
  z.strictObject({ kind: z.literal('seniorityHitYesterday'), values: z.array(z.number().int()).min(1) }),
  z.strictObject({ kind: z.literal('daysSinceLastPaper'), min: z.number().int().min(1) }),
  z.strictObject({ kind: z.literal('idleYesterday') }),
  z.strictObject({
    kind: z.literal('daysPaid'),
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }),
  z.strictObject({
    kind: z.literal('energyYesterday'),
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }),
  z.strictObject({ kind: z.literal('noPersonal') }),
  z.strictObject({ kind: z.literal('homeShare'), min: z.number().optional(), max: z.number().optional() }),
  // Slice 3 (ADR 0023): political conditions, selected live at read.
  z.strictObject({ kind: z.literal('seatWon'), top: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('seatLost'), tie: z.boolean().optional(), bloc: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('votedFor'), won: z.boolean(), tie: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('filedYesterday') }),
  z.strictObject({ kind: z.literal('nominationsClosed'), struck: z.boolean() }),
  z.strictObject({ kind: z.literal('termEnded') }),
  z.strictObject({ kind: z.literal('divided'), passed: z.boolean() }),
  z.strictObject({ kind: z.literal('movedYesterday') }),
  z.strictObject({ kind: z.literal('countToday') }),
  z.strictObject({
    kind: z.literal('phaseToday'),
    phase: z.enum(['nominations', 'polling']),
    cycleDay: z.number().int().min(0).max(4).optional(),
  }),
  z.strictObject({ kind: z.literal('ordinanceFromToday') }),
  z.strictObject({ kind: z.literal('leftUnrest') }),
  // Slice 4 (tech design §11.3): stored, the train opens at Level 10.
  z.strictObject({ kind: z.literal('levelCrossed'), level: z.number().int().min(2) }),
  // Slice 4: live conditions of the capital, the Issues and travel (selected at read).
  z.strictObject({ kind: z.literal('registeredYesterday') }),
  z.strictObject({ kind: z.literal('firstCapitalArrivalYesterday') }),
  z.strictObject({ kind: z.literal('heroYesterday'), place: z.enum(['district', 'city']) }),
  z.strictObject({ kind: z.literal('issuePcYesterday') }),
  z.strictObject({ kind: z.literal('quotedYesterday') }),
  z.strictObject({ kind: z.literal('issuesDrawnToday') }),
  z.strictObject({ kind: z.literal('issueLeading') }),
  z.strictObject({ kind: z.literal('issueOpen') }),
  z.strictObject({ kind: z.literal('issueResolvedToday'), owned: z.boolean() }),
  z.strictObject({ kind: z.literal('districtBattleground') }),
  z.strictObject({ kind: z.literal('districtBecameBattleground') }),
  z.strictObject({ kind: z.literal('districtLeftBattleground') }),
  z.strictObject({ kind: z.literal('groundswellStarted') }),
  z.strictObject({ kind: z.literal('districtLine') }),
  // Slice 5 (tech design §11.2): the risk conditions (stored) and the rival pressure (live).
  z.strictObject({ kind: z.literal('missionFirstYesterday') }),
  z.strictObject({ kind: z.literal('heatState'), min: z.enum(['hot', 'wanted']) }),
  z.strictObject({ kind: z.literal('markYesterday') }),
  z.strictObject({ kind: z.literal('arrestedYesterday') }),
  z.strictObject({ kind: z.literal('admittedYesterday') }),
  z.strictObject({ kind: z.literal('recordRose') }),
  z.strictObject({ kind: z.literal('rivalGroundYesterday') }),
  z.strictObject({ kind: z.literal('deportedYesterday') }),
  z.strictObject({ kind: z.literal('moraleLostToRivals'), min: z.number().min(0) }),
]) satisfies z.ZodType<HeadlineCondition>;

export const HeadlineTemplateSchema = z.strictObject({
  id: Id,
  /** Review 4 (answers §29.1): `'*'` for the neutral local lines (`hl.local.*`), read for any city. */
  cityId: Id.or(z.literal('*')),
  group: z.enum(['personal', 'city', 'ambient']),
  /** Lower first. */
  priority: z.number().int().default(0),
  /** AND; [] = always. */
  when: z.array(HeadlineConditionSchema).default([]),
  /**
   * 80 printed; a template may run to 90 before its placeholders are filled (slice 4: the Herald's
   * district line is 86 as written and at most 78 once filled, design §12).
   */
  headline: z.string().min(1).max(90),
  deck: z.string().min(1).max(200).optional(),
}) satisfies z.ZodType<HeadlineTemplate, unknown>;

// ---------------------------------------------------------------------------------------------
// Slice 2 (docs/tech/slice-2.md §4.2): items, the origin, Ambitions.
// ---------------------------------------------------------------------------------------------

/** §21.1: slice 2's slots; weapon, utility and accessory come with the Wardrobe (slice 8). */
export const ItemSlot = z.enum(['clothing', 'document']);

/** §21.4, ADR 0014. `slot: null` is a keepsake with no slot. */
export const Item = z.strictObject({
  id: ItemId,
  name: z.string().min(1),
  slot: ItemSlot.nullable(),
  tier: z.number().int().min(1).max(5).nullable(),
  cha: z.number().int().min(0).max(50).default(0),
  keepsake: z.boolean(),
  /** An `item` or `vector` asset, or the holder's faction crest (the party card). */
  art: z.union([AssetId, z.literal('faction-crest')]),
  note: z.string().max(120).optional(),
});

/** Story texts: at most 240 characters (and, checked by the loader, 4 sentences; GDD §1.2). */
export const StoryText = z.string().min(1).max(240);

/**
 * Review 4 (GDD §7.1, ADR 0073, tech design §4.1), restrung by review 5 as *Coming home*. Beat 1's
 * answer carries the party (`faction`, with the person); beat 2's +6 and +1; beat 3's Ambition and
 * the demob suit (`outfit.fathers-coat`, id kept).
 * `chaBase`, `iron` and `wish` are gone with the deathbed scene.
 */
export const OriginEffect = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('faction'), factionId: FactionId, person: NpcId }),
  z.strictObject({
    kind: z.literal('stat'),
    stat: z.enum(['str', 'int', 'agi']),
    value: z.number().int().min(1).max(6),
  }),
  z.strictObject({ kind: z.literal('wear'), itemId: ItemId }),
  z.strictObject({ kind: z.literal('ambition'), ambitionId: AmbitionId }),
]) satisfies z.ZodType<OriginEffectRule>;

export const OriginAnswer = z.strictObject({
  /** `holm`, `tools`, `ward-book`. */
  id: Id,
  /** Beat 1's asks: review 5's *Coming home* runs to 221 characters (answers §19.2), so a story text's 240. */
  text: z.string().min(1).max(240),
  /** Beat 1's two Courier lines under the ask (who, and what their party wants). */
  lines: z.tuple([z.string().min(1).max(110), z.string().min(1).max(110)]).optional(),
  /** Beat 1's row portrait (40 px). */
  portrait: AssetId.optional(),
  /** Beat 1: a row selects, this button commits (*Help Holm · the six o'clock to Coalport*). */
  confirm: z.string().min(1).max(60).optional(),
  /** Words under the button (beat 3); never a number. Review 5: 100 (the ration page's is 86). */
  hint: z.string().min(1).max(100).optional(),
  /** Shown in Courier at the top of the next step (*You carried Holm's parcel.*). */
  echo: z.string().min(1).max(80).optional(),
  effects: z.array(OriginEffect).min(1),
});

export const OriginQuestion = z.strictObject({
  id: Id,
  prompt: z.string().min(1).max(120).optional(),
  answers: z.array(OriginAnswer).length(3),
});

export const OriginStep = z.strictObject({
  id: Id,
  kicker: z.string().min(1).max(80),
  title: z.string().min(1).max(40),
  narrative: StoryText,
  /** A scene. */
  art: AssetId,
  /** Beside the text: a portrait, `'helper'` (the person helped on the platform), or none. */
  portrait: z.union([AssetId, z.literal('helper')]).nullable(),
  /** Beat 1: the Courier line under the rows (*One of these today…*; review 5: 137 characters). */
  note: z.string().min(1).max(160).optional(),
  questions: z.tuple([OriginQuestion]),
});

export const Origin = z.strictObject({
  steps: z.tuple([OriginStep, OriginStep, OriginStep]),
  /** §8.5: the reference recruit's answers (tests, migration 002): Holm · books · the unit's list. */
  reference: z.array(z.strictObject({ questionId: Id, answerId: z.string() })).length(3),
});

const ChapterReward = z.strictObject({
  xp: z.number().int().min(0),
  fxp: z.number().int().min(0),
  iron: z.number().int().min(0),
});

/** §17.1: a chapter with `story` is playable; without it, it is the next chapter's teaser. */
export const Chapter = z.strictObject({
  n: z.number().int().min(1).max(12),
  title: z.string().min(1).max(60),
  requires: z
    .strictObject({
      rank: z.number().int().min(1).optional(),
      level: z.number().int().min(1).optional(),
      /** Slice 3 (design §17 Q21): opens after the player's first ballot. */
      ballotCast: z.literal(true).optional(),
    })
    .optional(),
  story: z
    .strictObject({
      /** "From the office's post": the Letters row. */
      letterFrom: z.string().min(1).max(60),
      choose: z.strictObject({
        title: z.string().min(1).max(40),
        narrative: StoryText,
        choices: z
          .array(
            z.strictObject({
              id: Id,
              text: z.string().min(1).max(80),
              // 80: chapter 2's first hint is 66 characters (design §17.7). Slice 5: 100, as the
              // approaches (Settle His Debts chapter 2's first hint is 97, design §13).
              hint: z.string().min(1).max(100),
              /** Remembered for later chapters. */
              flag: Id,
            }),
          )
          .length(2),
      }),
      check: z.strictObject({
        title: z.string().min(1).max(40),
        narrative: StoryText,
        approaches: z
          .array(
            z.strictObject({
              id: Id,
              text: z.string().min(1).max(100),
              stats: CheckStatsSchema,
              /** Slice 5 (design §13): Heat added on any outcome (the quiet way +6). */
              heat: z.number().int().min(0).max(30).optional(),
            }),
          )
          .min(2)
          .max(3),
        cta: z.string().min(1).max(40),
        difficulty: z.number().int().min(1),
        energy: z.number().int().min(1).max(30),
      }),
      result: z.strictObject({ success: OutcomeText, partial: OutcomeText, failure: OutcomeText }),
      rewards: z.strictObject({ success: ChapterReward, partial: ChapterReward, failure: ChapterReward }),
      keepsake: ItemId,
      /** §13.5 rung 3: a crop of the home map around the faction HQ. */
      art: z.literal('home-hq'),
    })
    .optional(),
});

export const Ambition = z.strictObject({
  id: AmbitionId,
  title: z.string().min(1),
  /** §17.1: twelve chapters; "Chapter 1 of 12" reads this, not the chapters written (§13 Q12). */
  chaptersPlanned: z.number().int().min(1).max(12),
  chapters: z.array(Chapter).min(1),
});

// ---------------------------------------------------------------------------------------------
// Slice 3 (docs/tech/slice-3.md §4.1): ordinances, NPC slates, the political result texts.
// ---------------------------------------------------------------------------------------------

export const OrdinanceId = Id;

/** ADR 0021: the closed DSL; bounds live in rules (ORDINANCE_BOUNDS) and are enforced here. */
export const OrdinanceEffectSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('jobPayPct'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('seniorityDays'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('swingPct'), actionType: ActionType, value: z.number().int() }),
    z.strictObject({ kind: z.literal('energyDelta'), actionType: ActionType, value: z.number().int() }),
    z.strictObject({ kind: z.literal('trainingEnergyPct'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('restedCapDelta'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('chancePct'), actionType: ActionType, value: z.number().int() }),
    z.strictObject({ kind: z.literal('standingMultiplier'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('ironPct'), scope: z.literal('checked'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('fxpPct'), scope: z.literal('actions'), value: z.number().int() }),
    // Slice 4 (ADR 0030): tickets from the city, a room in it.
    z.strictObject({ kind: z.literal('ticketPct'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('roomPct'), value: z.number().int() }),
    // Slice 5 (design §12.1): Heat cools faster; bail cheaper.
    z.strictObject({ kind: z.literal('heatCoolPct'), value: z.number().int() }),
    z.strictObject({ kind: z.literal('bailPct'), value: z.number().int() }),
  ])
  .superRefine((e, ctx) => {
    const problem = ordinanceBoundProblem(e);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
  }) satisfies z.ZodType<OrdinanceEffectRule>;

export const Ordinance = z
  .strictObject({
    id: OrdinanceId,
    name: z.string().min(1).max(40),
    /** "The council puts the town to work: every wage in the city goes up." */
    line: z.string().min(1).max(120),
    /** The caps line, "Job pay +10 %"; the UI adds "· 5 days". */
    effectLine: z.string().min(1).max(60),
    /**
     * Review 4 (answers §11.3, §29 Q1; ADR 0077): the effect in plain words, lower case, for the city
     * plate's rule line and the Town Hall's *rule in force* ("jobs pay a tenth more").
     */
    plainLine: z.string().min(1).max(60),
    effects: z.array(OrdinanceEffectSchema).min(1),
  })
  .refine((o) => new Set(o.effects.map((e) => e.kind)).size === o.effects.length, {
    message: 'at most one effect of each kind',
  });

/** Design §5.2: the NPC slate; own section, since `npcs` need a portrait and these have none. */
export const NpcCandidate = z.strictObject({
  id: NpcId,
  name: z.string().min(1).max(40),
  factionId: FactionId,
  cityId: Id,
  /** The ward vote before jitter. */
  profile: z.number().int().min(1).max(60),
  /** Printed on the ballot. */
  line: z.string().min(1).max(90),
  /** Slice 4 (design §8.3): the district of a capital candidate (required for a city with districts). */
  districtId: Id.optional(),
});

/** Screens §9, design §17.3: one political result modal's texts. */
const PoliticalText = z.strictObject({
  stamp: z.string().min(1).max(20),
  headline: z.string().min(1).max(60),
  body: StoryText,
  /** Review 2 (answers §4.4): the modal's *Next* line, "Next: the result, {countDay} morning." */
  next: z.string().min(1).max(80),
});

/** The six political result modals (POLITICAL_ACTS in rules). */
export const PoliticalTexts = z.strictObject({
  results: z.strictObject({
    ballot: PoliticalText,
    declare: PoliticalText,
    endorse: PoliticalText,
    withdraw: PoliticalText,
    propose: PoliticalText,
    councilVote: PoliticalText,
    // Slice 4 (screens §6.3): the residence's register and the room.
    register: PoliticalText,
    room: PoliticalText,
    // Slice-4 fixes §6: the room's renewal.
    renew: PoliticalText,
  }),
});

// ---------------------------------------------------------------------------------------------
// Slice 4 (docs/tech/slice-4.md §4.1): the nation, the journey cards and the Issues of the Week.
// ---------------------------------------------------------------------------------------------

/** Design §2.1–§2.3: the nation map, the five cities, journey times and the station points. */
export const Nation = z.strictObject({
  map: z.strictObject({ day: AssetId, night: AssetId }),
  capitalId: Id,
  /** The five pins' box grown by 0.06. */
  frame: Frame,
  clouds: z.boolean().optional(),
  cities: z
    .array(
      z.strictObject({
        cityId: Id,
        name: z.string().min(1),
        /** Equal to `mapPins.nation` (content test). */
        x: Fraction,
        y: Fraction,
        /** Third class from the capital; the capital 0. */
        minutes: z.number().int().min(0),
        service: z.enum(['open', 'later']),
        /** "Home city of the Alliance"; the capital's tail is live (design §19 Q14). */
        line: z.string().min(1).max(60),
        /** The station point on the city's picture (its survey station pin). */
        arrival: z.strictObject({ x: Fraction, y: Fraction }),
        /** Only for a city with no content entry (Clearwater). */
        baselineOpinion: Shares.optional(),
      }),
    )
    .length(5),
  /**
   * Review 4 (tech design §6.1, ADR 0075): one leg per city other than the capital, traced along the
   * painted rails in the dev map viewer's trace mode, from the capital's pin to the city's. A journey
   * between two outer cities is the two legs joined through the capital.
   */
  routes: z
    .array(
      z.strictObject({
        /** A nation city other than the capital. */
        to: Id,
        points: z.array(z.tuple([Fraction, Fraction])).min(8).max(20),
      }),
    )
    .length(4),
});

const NonNeg = z.number().min(0);

/** Design §3: what one outcome of a card pays (fixed amounts, untouched by the capital's factors). */
export const JourneyRewards = z.strictObject({
  xp: NonNeg.optional(),
  fxp: NonNeg.optional(),
  iron: NonNeg.optional(),
  opinion: NonNeg.optional(),
  momentum: NonNeg.optional(),
  rested: NonNeg.optional(),
  quoted: z.literal(true).optional(),
  /** Slice 5 (design §11.4): Heat ±n and a day flag in the destination. */
  heat: z.number().int().min(-20).max(20).optional(),
  flag: z.enum(['watched', 'warned']).optional(),
});

export const JourneyChoice = z.strictObject({
  id: Id,
  title: z.string().min(1).max(40),
  /** "{destination}" and "{issue}" placeholders; the client prefixes the odds word. */
  detail: z.string().min(1).max(90),
  /** Absent: unchecked (no odds word, no roll). */
  stats: CheckStatsSchema.optional(),
  /** The stake (*Sit in* 20) or the price (*Pay his fare* 10). */
  cost: z.strictObject({ iron: z.number().int().min(1) }).optional(),
  success: z.strictObject({ rewards: JourneyRewards, text: OutcomeText }),
  /** Required when `stats` (a checked choice never fails). */
  partial: z.strictObject({ rewards: JourneyRewards, text: OutcomeText }).optional(),
  /**
   * Slice 5 (design §23.2): an unchecked choice that pays `success` when the gate holds (Cool and
   * Clean) and `partial` otherwise.
   */
  gate: z.literal('coolAndClean').optional(),
});

export const JourneyEvent = z.strictObject({
  id: Id,
  title: z.string().min(1).max(40),
  setup: StoryText,
  choices: z.array(JourneyChoice).min(2).max(3),
  /** What happens when the card is left unanswered ("slept through"). */
  ignore: StoryText,
  /** The first journey always draws this card (first in its own deck: the passenger, the checkpoint). */
  first: z.literal(true).optional(),
  /** Slice 5 (design §11.4): the ordinary deck, or the hostile one drawn on the way to rival ground. */
  deck: z.enum(['ordinary', 'hostile', 'patrol']).default('ordinary'),
  /** Slice 5: *Your name is on a list* replaces the hostile draw from this Heat. */
  heatAtLeast: z.number().int().min(1).max(100).optional(),
  /** Slice 5: what an unanswered card does when its window ends (*slept through*). */
  ignoreEffects: z
    .strictObject({
      heat: z.number().int().min(0).max(20).optional(),
      flag: z.enum(['watched', 'warned']).optional(),
    })
    .optional(),
});

/** Slice 5 (design §10.2, §10.6): an opponent in a run-in, and its six lines. */
const OpponentLine = z.string().min(1).max(120);
export const Opponent = z.strictObject({
  id: Id,
  /** *A Vanguard street enforcer*. */
  label: z.string().min(1).max(40),
  side: z.union([FactionId, z.literal('police')]),
  power: z.number().int().min(1),
  agi: z.number().int().min(1),
  wits: z.number().int().min(0),
  /** Iron to pay them off; null: won't be bought. */
  payOff: z.number().int().min(1).nullable(),
  /** The branch inspector: −10 on your Fight odds. */
  fightPct: z.number().int().min(-20).max(0).optional(),
  portrait: AssetId,
  /** The run-in's *did* line speaks of them as *he* or *they* (design/slice-5-fixes.md §7.3). */
  pronoun: z.enum(['he', 'they']),
  lines: z.strictObject({
    appears: OpponentLine,
    won: OpponentLine,
    lost: OpponentLine,
    ran: OpponentLine,
    talked: OpponentLine,
    paid: OpponentLine.optional(),
  }),
});

/** Slice 5 (design §8.2, §9.2, §23.3): the one tap in the cells and on the ward. */
export const HeldAction = z.strictObject({
  id: z.enum(['held.cells', 'held.ward']),
  name: z.string().min(1),
  type: z.literal('intelligence'),
  stats: CheckStatsSchema,
  energy: z.literal(3),
  text: z.strictObject({ success: OutcomeText, partial: OutcomeText }),
});

/** ADR 0029: what tags an action with an Issue (AND of the fields; at least one). */
export const IssueMatchSchema = z
  .strictObject({
    actionTypes: z.array(ActionType).min(1).optional(),
    locationIds: z.array(Id).min(1).optional(),
    locationKinds: z.array(LocationKind).min(1).optional(),
    districtId: Id.optional(),
  })
  .refine((m) => Object.keys(m).length > 0, 'a feed needs at least one field');

const Stance = z.string().min(1).max(90);

/** Design §9.5: an Issue of the Week. */
export const Issue = z.strictObject({
  id: Id,
  name: z.string().min(1).max(40),
  /** Inside sentences: "the tram fares". */
  short: z.string().min(1).max(30),
  blurb: z.string().min(1).max(160),
  /** Each city it is eligible in (in a city with districts, its district), with the feeds there. */
  where: z
    .array(
      z.strictObject({
        cityId: Id,
        districtId: Id.optional(),
        feeds: z.array(IssueMatchSchema).min(1),
      }),
    )
    .min(1),
  effects: z.array(OrdinanceEffectSchema).min(1),
  /** The player-facing effect line ("Tickets from Irongate: half price"). */
  effectLine: z.string().min(1).max(60),
  stances: z.strictObject({ vanguard: Stance, collective: Stance, alliance: Stance }),
});

export const Content = z.strictObject({
  factions: z.array(Faction).length(FACTION_IDS.length),
  cities: z.array(City).min(1),
  art: z.strictObject({
    assets: z.array(Asset),
    scenes: z.array(SceneBinding),
    /** Slice 5 (GDD §13.5 rung 4): the mission card of each type, a scene. */
    missionCards: z.array(z.strictObject({ missionType: MissionType, assetId: AssetId })),
  }),
  /** ADR 0024: the map tile pyramids (`data/tiles.json`, generated by `pnpm art:tiles`). */
  tilePyramids: TilesManifest,
  /** §7.3: the faces offered at sign-up (six in slice 2, eighteen since art-wiring-oct.md). */
  avatars: z.array(AssetId).min(6),
  items: z.array(Item),
  origin: Origin,
  ambitions: z.array(Ambition),
  npcs: z.array(Npc),
  standingLevels: StandingLevels,
  jobs: z.array(Job),
  orderTemplates: z.array(OrderTemplateSchema),
  headlines: z.array(HeadlineTemplateSchema),
  ordinances: z.array(Ordinance),
  candidates: z.array(NpcCandidate),
  politics: PoliticalTexts,
  // Slice 4.
  nation: Nation,
  /** Slice 4: seven ordinary cards; slice 5: four hostile ones; review 5: the patrol (the loader counts each deck). */
  journeyEvents: z.array(JourneyEvent).length(12),
  issues: z.array(Issue),
  // Slice 5.
  opponents: z.array(Opponent).length(6),
  held: z.strictObject({ cells: HeldAction, infirmary: HeldAction }),
});

export type Faction = z.infer<typeof Faction>;
export type LocationKind = z.infer<typeof LocationKind>;
export type ActionType = z.infer<typeof ActionType>;
export type CheckedAction = z.infer<typeof CheckedAction>;
export type TrainingAction = z.infer<typeof TrainingAction>;
export type Action = z.infer<typeof Action>;
export type Location = z.infer<typeof Location>;
export type City = z.infer<typeof City>;
export type Item = z.infer<typeof Item>;
export type Origin = z.infer<typeof Origin>;
export type OriginInput = z.input<typeof Origin>;
export type Ambition = z.infer<typeof Ambition>;
export type AmbitionInput = z.input<typeof Ambition>;
export type Chapter = z.infer<typeof Chapter>;
export type Asset = z.infer<typeof Asset>;
export type Frame = z.infer<typeof Frame>;
export type Quarter = z.infer<typeof Quarter>;
export type TilesEntry = z.infer<typeof TilesEntry>;
export type TilesManifest = z.infer<typeof TilesManifest>;
export type SurveyPin = z.infer<typeof SurveyPin>;
export type MapPins = z.infer<typeof MapPins>;
export type SceneBinding = z.infer<typeof SceneBinding>;
export type Npc = z.infer<typeof Npc>;
export type Job = z.infer<typeof Job>;
export type Ordinance = z.infer<typeof Ordinance>;
export type NpcCandidate = z.infer<typeof NpcCandidate>;
export type PoliticalTexts = z.infer<typeof PoliticalTexts>;
export type Platform = z.infer<typeof Platform>;
export type Nation = z.infer<typeof Nation>;
export type JourneyEvent = z.infer<typeof JourneyEvent>;
export type JourneyChoice = z.infer<typeof JourneyChoice>;
export type Issue = z.infer<typeof Issue>;
export type IssueMatch = z.infer<typeof IssueMatchSchema>;
export type Mission = z.infer<typeof Mission>;
export type Way = z.infer<typeof Way>;
export type Opponent = z.infer<typeof Opponent>;
export type HeldAction = z.infer<typeof HeldAction>;
export type Content = z.infer<typeof Content>;
/** Content as authored (defaults not yet applied). */
export type ContentInput = z.input<typeof Content>;
export type { HeadlineTemplate, OrderTemplate };

/** Narrowing helpers for the action union. */
export const isCheckedAction = (a: Action): a is CheckedAction => a.type !== 'training';
export const isTrainingAction = (a: Action): a is TrainingAction => a.type === 'training';
/** Review 4 (ADR 0073): a one-off welcome ticket (the favour from the platform). */
export const isWelcomeAction = (a: Action): boolean => isCheckedAction(a) && a.use === 'welcome';
