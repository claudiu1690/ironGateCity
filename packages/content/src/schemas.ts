import { ACTION_KINDS, FACTION_IDS, STAT_KEYS, TRAINABLE_STATS } from '@irongate/rules';
import type { HeadlineCondition, HeadlineTemplate, OrderMatch, OrderTemplate } from '@irongate/rules';
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

const HexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'a #RRGGBB colour');
const Fraction = z.number().min(0).max(1);

export const Faction = z.strictObject({
  id: FactionId,
  name: z.string().min(1),
  shortName: z.string().min(1),
  crest: Crest,
  homeCityId: z.string().min(1),
  /** §7.3 / §16.1: Vanguard +3 STR, Collective +2 STR +1 INT, Alliance +3 INT. */
  startingBonus: z.strictObject({
    str: z.number().int().optional(),
    int: z.number().int().optional(),
    agi: z.number().int().optional(),
    cha: z.number().int().optional(),
  }),
  /** §5.4: the seven Rank titles, index 0 = Rank 1. */
  rankTitles: z.array(z.string().min(1)).length(7),
  /** §13.7: the NPC secretary who issues Party orders until a Chair exists. */
  secretary: z.strictObject({ npcId: NpcId, signature: z.string().min(1) }).optional(),
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
]);

export const ActionType = z.enum([
  'canvass',
  'speech',
  'propaganda',
  'intelligence',
  'council',
  'training',
  'job',
]);

/** Headline plus a 2–3 line narrative paragraph (CLAUDE.md: short sessions). */
const OutcomeText = z.strictObject({
  headline: z.string().min(1).max(80),
  body: z.string().min(1).max(400),
});

/** A check on one stat, or the average of two (§8.4). */
const CheckStatsSchema = z.union([z.tuple([StatKey]), z.tuple([StatKey, StatKey])]);

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
  text: z.strictObject({ success: OutcomeText, partial: OutcomeText }),
});

/** §8.5: not a check; +1 stat; cost 20 + 2 × stat at runtime. CHA is never trained. */
export const TrainingAction = z.strictObject({
  id: Id,
  name: z.string().min(1),
  tier: z.literal(1),
  type: z.literal('training'),
  trains: z.enum(TRAINABLE_STATS),
  text: z.strictObject({ success: OutcomeText }),
});

/** §9.1: a job shift; not a check; Energy and pay from the job. */
export const ShiftAction = z.strictObject({
  id: Id,
  name: z.string().min(1),
  tier: z.literal(1),
  type: z.literal('job'),
  jobId: JobId,
  text: z.strictObject({ success: OutcomeText }),
});

export const Action = z.discriminatedUnion('type', [CheckedAction, TrainingAction, ShiftAction]);

export const Location = z.strictObject({
  id: Id,
  name: z.string().min(1),
  kind: LocationKind,
  blurb: z.string().min(1).max(200),
  /** Fractions of the city map image; the pin number is the location's index + 1. */
  map: z.strictObject({ x: Fraction, y: Fraction }),
  actions: z.array(Action).min(1),
});

const Share = z.number().min(0).max(100);

export const City = z.strictObject({
  id: Id,
  name: z.string().min(1),
  role: z.enum(['home', 'battleground']),
  homeFactionId: FactionId.optional(),
  /** §14.2 / §14.11: three faction shares plus Neutral, summing to 100. */
  baselineOpinion: z.strictObject({
    vanguard: Share,
    collective: Share,
    alliance: Share,
    neutral: Share,
  }),
  /** The detailed map by day and by night (asset ids). */
  map: z.strictObject({ day: AssetId, night: AssetId }),
  /** §3.3: the home city's paper ("The Coalport Clarion"). */
  paper: z
    .strictObject({ name: z.string().min(1), strapline: z.string().min(1), price: z.string().min(1) })
    .optional(),
  locations: z.array(Location),
});

/** The character every new player gets until the origin story (slice 2). Home city = faction's home. */
export const StartingCharacter = z.strictObject({
  factionId: FactionId,
  stats: z.strictObject({
    str: z.number().int().min(0),
    int: z.number().int().min(0),
    agi: z.number().int().min(0),
    chaBase: z.number().int().min(0),
  }),
});

/** ADR 0007: every image the game references, by id. The build script reads `source`. */
export const Asset = z.strictObject({
  id: AssetId,
  kind: z.enum(['map', 'scene', 'portrait']),
  /** Path relative to the art source folder (IRONGATE_ART_SRC). */
  source: z.string().min(1),
  /** Size of the image after the crop, for its aspect ratio. */
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  /** Output widths; files are /art/<id>-<width>.avif|webp. */
  widths: z.array(z.number().int().min(16)).min(1),
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
});

/** §13.4: the five Local Standing names; the thresholds live in rules. */
export const StandingLevels = z.array(z.strictObject({ name: z.string().min(1) })).length(5);

export const Job = z.strictObject({
  id: JobId,
  name: z.string().min(1),
  locationId: Id,
  shiftActionId: Id,
  /** "Level 3, AGI 10": checked on taking, never again (§9.1). */
  unlock: z.strictObject({
    level: z.number().int().min(1),
    stats: z.partialRecord(StatKey, z.number().int().min(0)).optional(),
  }),
  shiftEnergy: z.number().int().min(3).max(8),
  /** Pinned per job (§9.2). */
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
  noJob: z
    .strictObject({
      title: z.string().min(1).max(60),
      line: z.string().min(1).max(140),
      match: OrderMatchSchema,
      target: z.number().int().min(1),
    })
    .optional(),
}) satisfies z.ZodType<OrderTemplate>;

export const HeadlineConditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('firstEdition') }),
  z.strictObject({ kind: z.literal('rankRose') }),
  z.strictObject({ kind: z.literal('levelRose') }),
  z.strictObject({ kind: z.literal('standingRose') }),
  z.strictObject({ kind: z.literal('ordersAllDoneYesterday') }),
  z.strictObject({ kind: z.literal('streakHitYesterday'), values: z.array(z.number().int()).min(1) }),
  z.strictObject({ kind: z.literal('daysSinceLastPaper'), min: z.number().int().min(1) }),
  z.strictObject({ kind: z.literal('idleYesterday') }),
  z.strictObject({ kind: z.literal('noPersonal') }),
  z.strictObject({ kind: z.literal('homeShare'), min: z.number().optional(), max: z.number().optional() }),
]) satisfies z.ZodType<HeadlineCondition>;

export const HeadlineTemplateSchema = z.strictObject({
  id: Id,
  cityId: Id,
  group: z.enum(['personal', 'city', 'ambient']),
  /** Lower first. */
  priority: z.number().int().default(0),
  /** AND; [] = always. */
  when: z.array(HeadlineConditionSchema).default([]),
  headline: z.string().min(1).max(80),
  deck: z.string().min(1).max(200).optional(),
}) satisfies z.ZodType<HeadlineTemplate, unknown>;

export const Content = z.strictObject({
  factions: z.array(Faction).length(FACTION_IDS.length),
  cities: z.array(City).min(1),
  startingCharacter: StartingCharacter,
  art: z.strictObject({ assets: z.array(Asset), scenes: z.array(SceneBinding) }),
  npcs: z.array(Npc),
  standingLevels: StandingLevels,
  jobs: z.array(Job),
  orderTemplates: z.array(OrderTemplateSchema),
  headlines: z.array(HeadlineTemplateSchema),
});

export type Faction = z.infer<typeof Faction>;
export type LocationKind = z.infer<typeof LocationKind>;
export type ActionType = z.infer<typeof ActionType>;
export type CheckedAction = z.infer<typeof CheckedAction>;
export type TrainingAction = z.infer<typeof TrainingAction>;
export type ShiftAction = z.infer<typeof ShiftAction>;
export type Action = z.infer<typeof Action>;
export type Location = z.infer<typeof Location>;
export type City = z.infer<typeof City>;
export type StartingCharacter = z.infer<typeof StartingCharacter>;
export type Asset = z.infer<typeof Asset>;
export type SceneBinding = z.infer<typeof SceneBinding>;
export type Npc = z.infer<typeof Npc>;
export type Job = z.infer<typeof Job>;
export type Content = z.infer<typeof Content>;
/** Content as authored (defaults not yet applied). */
export type ContentInput = z.input<typeof Content>;
export type { HeadlineTemplate, OrderTemplate };

/** Narrowing helpers for the action union. */
export const isCheckedAction = (a: Action): a is CheckedAction => a.type !== 'training' && a.type !== 'job';
export const isTrainingAction = (a: Action): a is TrainingAction => a.type === 'training';
export const isShiftAction = (a: Action): a is ShiftAction => a.type === 'job';
