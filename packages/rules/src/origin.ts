import type { AmbitionState } from './ambition';
import { ENERGY, STARTING } from './constants';
import { dayKey } from './day';
import type { DayKey } from './day';
import type { Equipment, InventoryEntry, ItemSlot } from './items';
import { rankForFxp } from './rank';
import { emptyTally } from './tally';
import type { DailyTally, FactionId, TrainableStat } from './types';

/**
 * The origin (GDD §7.1, review 4: *The Last Train In*, ADR 0073): three beats of one question each,
 * every answer with effects in this closed DSL. Beat 1's answer carries the party (`faction`), beat 2
 * the stats (+6 and +1), beat 3 the Ambition and his coat (`wear`). Content is validated against these
 * types (`satisfies`); the rules resolve them. No CHA base, no Iron and no FXP seed any more.
 */
export type OriginEffect =
  /** Beat 1: whom you help is your party; `person` is that party's secretary (the {helper}). */
  | { kind: 'faction'; factionId: FactionId; person: string }
  | { kind: 'stat'; stat: TrainableStat; value: number }
  /** Worn in place of the faction outfit; the outfit is kept (§21.4). */
  | { kind: 'wear'; itemId: string }
  | { kind: 'ambition'; ambitionId: string };

export interface OriginSpec {
  questions: Array<{ id: string; answers: Array<{ id: string; effects: OriginEffect[] }> }>;
}

export interface OriginAnswerRef {
  questionId: string;
  answerId: string;
}

export interface OriginOutcome {
  factionId: FactionId;
  stats: { str: number; int: number; agi: number; chaBase: 0 };
  /** STARTING.iron (0): the refused coat's 150 is gone (review 4). */
  iron: number;
  /** The wish's seed is gone (review 4): the favour pays its own Party XP. */
  fxp: 0;
  ambitionId: string;
  /** In the order they are granted; `equip` is the slot the item is worn in, or null (kept). */
  items: Array<{ itemId: string; equip: ItemSlot | null; source: 'kit' | 'origin' }>;
}

export type ResolveOriginResult =
  | { ok: true; outcome: OriginOutcome }
  | { ok: false; reason: 'ORIGIN_INCOMPLETE' | 'UNKNOWN_ANSWER' | 'NO_FACTION'; answered: number };

export interface OriginFaction {
  id: FactionId;
  /** §7.3: Vanguard +3 STR, Collective +2 STR +1 INT, Alliance +3 INT. */
  startingBonus: Partial<Record<TrainableStat, number>>;
  kit: { outfit: string; card: string };
}

/** The answer given to a question, or undefined (not answered) / null (an unknown answer id). */
function answerOf(
  q: OriginSpec['questions'][number],
  answers: readonly OriginAnswerRef[],
): OriginSpec['questions'][number]['answers'][number] | null | undefined {
  const given = answers.find((a) => a.questionId === q.id);
  if (!given) return undefined;
  return q.answers.find((a) => a.id === given.answerId) ?? null;
}

/**
 * The party beat 1 chose, and the person helped, or null before it is answered (the story's
 * `{city}`, `{helper}` and `{helperPronoun}` from beat 2 on; the join's faction).
 */
export function originFaction(
  origin: OriginSpec,
  answers: readonly OriginAnswerRef[],
): { factionId: FactionId; person: string } | null {
  for (const q of origin.questions) {
    const a = answerOf(q, answers);
    for (const e of a?.effects ?? []) {
      if (e.kind === 'faction') return { factionId: e.factionId, person: e.person };
    }
  }
  return null;
}

/**
 * §7.1, §8.5, §21.4: a new character from the three answers. The party is beat 1's `faction`
 * effect; stats are 5 each plus every stat effect (beat 2's +6 and +1) plus that party's bonus;
 * Iron starts at 0 and FXP at 0. The kit is the party's outfit and party card; a `wear` item (his
 * coat, beat 3) is worn in place of the outfit, which is kept.
 */
export function resolveOrigin(i: {
  origin: OriginSpec;
  answers: readonly OriginAnswerRef[];
  factions: readonly OriginFaction[];
}): ResolveOriginResult {
  const stats = { str: STARTING.baseStat, int: STARTING.baseStat, agi: STARTING.baseStat, chaBase: 0 as const };
  let factionId: FactionId | null = null;
  let ambitionId: string | null = null;
  let wear: string | null = null;
  let answered = 0;

  for (const q of i.origin.questions) {
    const answer = answerOf(q, i.answers);
    if (answer === undefined) continue;
    if (answer === null) return { ok: false, reason: 'UNKNOWN_ANSWER', answered };
    answered += 1;
    for (const e of answer.effects) {
      switch (e.kind) {
        case 'faction':
          factionId = e.factionId;
          break;
        case 'stat':
          stats[e.stat] += e.value;
          break;
        case 'wear':
          wear = e.itemId;
          break;
        case 'ambition':
          ambitionId = e.ambitionId;
          break;
      }
    }
  }
  if (answered < i.origin.questions.length) return { ok: false, reason: 'ORIGIN_INCOMPLETE', answered };
  const faction = factionId === null ? undefined : i.factions.find((f) => f.id === factionId);
  if (!faction) return { ok: false, reason: 'NO_FACTION', answered };
  if (ambitionId === null) throw new Error('origin content has no ambition effect');

  for (const [stat, bonus] of Object.entries(faction.startingBonus) as Array<[TrainableStat, number]>) {
    stats[stat] += bonus;
  }
  const items: OriginOutcome['items'] = [
    { itemId: faction.kit.outfit, equip: wear === null ? 'clothing' : null, source: 'kit' },
    { itemId: faction.kit.card, equip: 'document', source: 'kit' },
    ...(wear === null ? [] : [{ itemId: wear, equip: 'clothing' as const, source: 'origin' as const }]),
  ];
  return {
    ok: true,
    outcome: { factionId: faction.id, stats, iron: STARTING.iron, fxp: 0, ambitionId, items },
  };
}

/** Everything a fresh character stores before its first City Day is settled (ADR 0011). */
export interface NewCharacterState {
  userId: string;
  name: string;
  avatarId: string | null;
  factionId: FactionId;
  homeCityId: string;
  cityId: string;
  stats: { str: number; int: number; agi: number; chaBase: number };
  /** Epoch ms. */
  energy: { value: number; updatedAt: number };
  rested: number;
  xp: number;
  level: number;
  fxp: number;
  iron: number;
  statPointsPending: number;
  rank: number;
  pc: number;
  localStanding: Array<{ cityId: string; successes: number }>;
  job: null;
  day: { settled: DayKey | null };
  orders: { day: DayKey; items: never[]; allDoneAt: null };
  today: DailyTally;
  lastActionAt: null;
  version: number;
  origin: { answers: OriginAnswerRef[]; arrivedAt: number };
  ambition: AmbitionState;
  inventory: InventoryEntry[];
  equipment: Equipment;
}

/**
 * The character a join inserts (tech design §6.2): full Energy, no Rested, Level 1, the Rank the
 * FXP seed gives, the kit and coat as inventory instances (uids from `uid`), worn per the outcome,
 * the Ambition's chapter 1 waiting at its first step, and no settled day yet.
 */
export function buildNewCharacter(i: {
  userId: string;
  name: string;
  avatarId: string | null;
  factionId: FactionId;
  homeCityId: string;
  outcome: OriginOutcome;
  answers: readonly OriginAnswerRef[];
  now: number;
  uid: () => string;
}): NewCharacterState {
  const day = dayKey(i.now);
  const inventory: InventoryEntry[] = [];
  const equipment: Equipment = { clothing: null, document: null };
  for (const item of i.outcome.items) {
    const uid = i.uid();
    inventory.push({ uid, itemId: item.itemId, day, source: item.source });
    if (item.equip) equipment[item.equip] = uid;
  }
  return {
    userId: i.userId,
    name: i.name,
    avatarId: i.avatarId,
    factionId: i.factionId,
    homeCityId: i.homeCityId,
    cityId: i.homeCityId,
    stats: { ...i.outcome.stats },
    energy: { value: ENERGY.max, updatedAt: i.now },
    rested: 0,
    xp: 0,
    level: 1,
    fxp: i.outcome.fxp,
    iron: i.outcome.iron,
    statPointsPending: 0,
    rank: rankForFxp(i.outcome.fxp),
    pc: 0,
    localStanding: [],
    job: null,
    day: { settled: null },
    orders: { day: 0, items: [], allDoneAt: null },
    today: emptyTally(null),
    lastActionAt: null,
    version: 0,
    origin: {
      answers: i.answers.map((a) => ({ questionId: a.questionId, answerId: a.answerId })),
      arrivedAt: i.now,
    },
    ambition: {
      id: i.outcome.ambitionId,
      chapter: 1,
      step: 'choose',
      choiceId: null,
      flags: [],
      history: [],
    },
    inventory,
    equipment,
  };
}
