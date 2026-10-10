import type { HeatState } from './heat';
import type { DayFlags } from './runIn';

/**
 * Review 5 (answers §16.1, GDD §14.12, ADR 0081): the night patrol on rival ground. A player who is
 * only looking at a rival town at night may be stopped: one seeded roll per ten-minute bucket per
 * city, on a read of the city view, never on an act, a timer or with the app closed. Pure: the caller
 * passes the night, the time and the roll.
 */
export const PATROL = {
  bucketMs: 10 * 60_000,
  basePct: 12,
  noticed: 5,
  hotOrWanted: 10,
  watched: 10,
  warned: -10,
  curfewFactor: 2,
  min: 5,
  max: 40,
  stopsPerNight: 2,
  quietAfterStopMs: 15 * 60_000,
  quietAfterRunInMs: 15 * 60_000,
  quietAfterArrivalMs: 10 * 60_000,
  /** Answers §12.2: the card's checks, the hostile deck's. */
  difficulty: 14,
} as const;

/** One city's record for one night: the last bucket rolled and the stops so far. */
export interface PatrolNight {
  cityId: string;
  night: number;
  bucket: number;
  stops: number;
}

/** A card waiting to be answered (`seed` rolls its checked rows). */
export interface PatrolCardState {
  id: string;
  cityId: string;
  night: number;
  bucket: number;
  at: number;
  seed: string;
}

export interface PatrolState {
  nights: PatrolNight[];
  /** Epoch ms; no roll before it (the street is quiet after trouble). */
  quietUntil: number | null;
  card: PatrolCardState | null;
}

export const EMPTY_PATROL: PatrolState = { nights: [], quietUntil: null, card: null };

/** `floor(now ÷ 10 min)`. */
export const patrolBucket = (now: number): number => Math.floor(now / PATROL.bucketMs);

/**
 * The chance per roll (answers §16.1): 12, +5 at Noticed, +10 at Hot or Wanted, +10 Watched, −10
 * Warned, ×2 under the Curfew Order, kept between 5 and 40.
 */
export function patrolChance(i: { heatState: HeatState; flags: DayFlags; curfew: boolean }): number {
  let p: number = PATROL.basePct;
  if (i.heatState === 'noticed') p += PATROL.noticed;
  else if (i.heatState === 'hot' || i.heatState === 'wanted') p += PATROL.hotOrWanted;
  if (i.flags.watched) p += PATROL.watched;
  if (i.flags.warned) p += PATROL.warned;
  if (i.curfew) p *= PATROL.curfewFactor;
  return Math.min(PATROL.max, Math.max(PATROL.min, p));
}

export type PatrolSkip = 'day' | 'notRival' | 'held' | 'transit' | 'runIn' | 'pending' | 'rolled' | 'quiet' | 'cap';

export type PatrolDecision = { skip: PatrolSkip } | { stop: boolean; next: PatrolState };

/**
 * Whether this read rolls, and what the state becomes. Order: day → notRival → held / transit /
 * runIn / pending → rolled (this city, night and bucket) → quiet → cap → roll. A skip never writes.
 * A roll keeps this night's entries only (other nights pruned) and records the bucket; a stop adds
 * the card, counts it and sets the quiet to 15 minutes on.
 */
export function patrolDecision(i: {
  state: PatrolState | null;
  cityId: string;
  now: number;
  /** The town's night index (through the server's seam); null by day. */
  night: number | null;
  rivalGround: boolean;
  held: boolean;
  inTransit: boolean;
  runInPending: boolean;
  chance: number;
  /** 1..100 from the bucket's seed. */
  roll: number;
  cardId: () => string;
  seed: string;
}): PatrolDecision {
  if (i.night === null) return { skip: 'day' };
  if (!i.rivalGround) return { skip: 'notRival' };
  if (i.held) return { skip: 'held' };
  if (i.inTransit) return { skip: 'transit' };
  if (i.runInPending) return { skip: 'runIn' };
  const s = i.state ?? EMPTY_PATROL;
  if (s.card) return { skip: 'pending' };
  const bucket = patrolBucket(i.now);
  const entry = s.nights.find((n) => n.cityId === i.cityId && n.night === i.night);
  if (entry && entry.bucket >= bucket) return { skip: 'rolled' };
  if (s.quietUntil !== null && i.now < s.quietUntil) return { skip: 'quiet' };
  if (entry && entry.stops >= PATROL.stopsPerNight) return { skip: 'cap' };
  const stop = i.roll <= i.chance;
  const nights = [
    ...s.nights.filter((n) => n.night === i.night && n.cityId !== i.cityId),
    { cityId: i.cityId, night: i.night, bucket, stops: (entry?.stops ?? 0) + (stop ? 1 : 0) },
  ];
  if (!stop) return { stop, next: { nights, quietUntil: s.quietUntil, card: null } };
  return {
    stop,
    next: {
      nights,
      quietUntil: i.now + PATROL.quietAfterStopMs,
      card: { id: i.cardId(), cityId: i.cityId, night: i.night, bucket, at: i.now, seed: i.seed },
    },
  };
}
