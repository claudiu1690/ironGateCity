import type { AmbitionState } from './ambition';
import { ENERGY, JOBS, STARTING } from './constants';
import { dayKey } from './day';
import type { DayKey } from './day';
import type { Equipment, InventoryEntry, ItemSlot } from './items';
import { rankForFxp } from './rank';
import { emptyTally } from './tally';
import type { DailyTally, FactionId, TrainableStat } from './types';

/**
 * The origin story (GDD §7.2, slice-2 tech design §6.2): six answers, each with effects in this
 * closed DSL. Content is validated against these types (`satisfies`); the rules resolve them.
 */
export type OriginEffect =
  | { kind: 'stat'; stat: TrainableStat; value: number }
  /** The permanent CHA base (0–4 in all), §8.2. */
  | { kind: 'chaBase'; value: number }
  | { kind: 'iron'; value: number }
  /** Worn in place of the faction outfit; the outfit is kept (§21.4). */
  | { kind: 'wear'; itemId: string }
  | { kind: 'ambition'; ambitionId: string }
  /** The father's wish: an FXP seed paid only if the player joins that faction. */
  | { kind: 'wish'; factionId: FactionId; fxp: number };

export interface OriginSpec {
  questions: Array<{ id: string; answers: Array<{ id: string; effects: OriginEffect[] }> }>;
}

export interface OriginAnswerRef {
  questionId: string;
  answerId: string;
}

export interface OriginOutcome {
  stats: { str: number; int: number; agi: number; chaBase: number };
  iron: number;
  fxp: number;
  ambitionId: string;
  /** In the order they are granted; `equip` is the slot the item is worn in, or null (kept). */
  items: Array<{ itemId: string; equip: ItemSlot | null; source: 'kit' | 'origin' }>;
}

export type ResolveOriginResult =
  | { ok: true; outcome: OriginOutcome }
  | { ok: false; reason: 'ORIGIN_INCOMPLETE' | 'UNKNOWN_ANSWER'; answered: number };

export interface OriginFaction {
  id: FactionId;
  /** §7.3: Vanguard +3 STR, Collective +2 STR +1 INT, Alliance +3 INT. */
  startingBonus: Partial<Record<TrainableStat, number>>;
  kit: { outfit: string; card: string };
}

/**
 * §7.2, §8.5, §21.4: a new character from the six answers and the faction joined. Stats are 5 each
 * plus every stat effect plus the faction's bonus (the answers stack as written, Appendix C #12);
 * the CHA base is the sum of its effects; Iron starts at 0 plus the refused coat; the wish's FXP is
 * paid only to its own faction. The kit is the faction's outfit and party card; a `wear` item (the
 * father's coat) is worn in place of the outfit, which is kept.
 */
export function resolveOrigin(i: {
  origin: OriginSpec;
  answers: readonly OriginAnswerRef[];
  faction: OriginFaction;
}): ResolveOriginResult {
  const stats = { str: STARTING.baseStat, int: STARTING.baseStat, agi: STARTING.baseStat, chaBase: 0 };
  let iron: number = STARTING.iron;
  let fxp = 0;
  let ambitionId: string | null = null;
  let wear: string | null = null;
  let answered = 0;

  for (const q of i.origin.questions) {
    const given = i.answers.find((a) => a.questionId === q.id);
    if (!given) continue;
    const answer = q.answers.find((a) => a.id === given.answerId);
    if (!answer) return { ok: false, reason: 'UNKNOWN_ANSWER', answered };
    answered += 1;
    for (const e of answer.effects) {
      switch (e.kind) {
        case 'stat':
          stats[e.stat] += e.value;
          break;
        case 'chaBase':
          stats.chaBase += e.value;
          break;
        case 'iron':
          iron += e.value;
          break;
        case 'wear':
          wear = e.itemId;
          break;
        case 'ambition':
          ambitionId = e.ambitionId;
          break;
        case 'wish':
          if (e.factionId === i.faction.id) fxp += e.fxp;
          break;
      }
    }
  }
  if (answered < i.origin.questions.length) return { ok: false, reason: 'ORIGIN_INCOMPLETE', answered };
  if (ambitionId === null) throw new Error('origin content has no ambition effect');

  for (const [stat, bonus] of Object.entries(i.faction.startingBonus) as Array<[TrainableStat, number]>) {
    stats[stat] += bonus;
  }
  const items: OriginOutcome['items'] = [
    { itemId: i.faction.kit.outfit, equip: wear === null ? 'clothing' : null, source: 'kit' },
    { itemId: i.faction.kit.card, equip: 'document', source: 'kit' },
    ...(wear === null ? [] : [{ itemId: wear, equip: 'clothing' as const, source: 'origin' as const }]),
  ];
  return { ok: true, outcome: { stats, iron, fxp, ambitionId, items } };
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
  sickDays: { week: number; left: number };
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
    sickDays: { week: 0, left: JOBS.sickDaysPerWeek },
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
