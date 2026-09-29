import { FACTION_IDS, STAT_KEYS } from '@irongate/rules';
import { z } from 'zod';

/** Internal faction ids. Display names are data (GDD: faction naming is parked). */
export const FactionId = z.enum(FACTION_IDS);
export const StatKey = z.enum(STAT_KEYS);

export const Crest = z.enum(['square', 'circle', 'triangle']);

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

export const ActionType = z.enum(['canvass', 'speech', 'propaganda', 'training', 'intelligence', 'job']);

const Id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/, 'lower-case, dotted by containment');

/** Headline plus a 2–3 line narrative paragraph (CLAUDE.md: short sessions). */
const OutcomeText = z.strictObject({
  headline: z.string().min(1).max(80),
  body: z.string().min(1).max(400),
});

export const Action = z.strictObject({
  id: Id,
  name: z.string().min(1),
  tier: z.literal(1),
  type: ActionType,
  stat: StatKey,
  /** §5.5: tier 1 costs 5–15 Energy. */
  energy: z.number().int().min(5).max(15),
  /** §13.3: which rewards the action type gives. */
  givesFxp: z.boolean(),
  givesOpinion: z.boolean(),
  text: z.strictObject({ success: OutcomeText, partial: OutcomeText }),
});

export const Location = z.strictObject({
  id: Id,
  name: z.string().min(1),
  kind: LocationKind,
  blurb: z.string().min(1).max(200),
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

export const Content = z.strictObject({
  factions: z.array(Faction).length(FACTION_IDS.length),
  cities: z.array(City).min(1),
  startingCharacter: StartingCharacter,
});

export type Faction = z.infer<typeof Faction>;
export type LocationKind = z.infer<typeof LocationKind>;
export type ActionType = z.infer<typeof ActionType>;
export type Action = z.infer<typeof Action>;
export type Location = z.infer<typeof Location>;
export type City = z.infer<typeof City>;
export type StartingCharacter = z.infer<typeof StartingCharacter>;
export type Content = z.infer<typeof Content>;
