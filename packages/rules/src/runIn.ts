import { ARMOUR_BY_TIER, CAUGHT, HEAT, MISSION_TYPES, RIVAL_GROUND, RUN_IN } from './constants';
import type { MissionType } from './constants';
import { heatBonus, heatState } from './heat';
import type { HeatState } from './heat';
import { recordBonus } from './record';
import type { RecordLevel } from './record';
import { roundHalfUp } from './rewards';
import type { Rng } from './rng';
import type { FactionId, Outcome } from './types';

/**
 * Run-ins and the caught check (GDD §20, §11.2; design §7, §10; ADR 0032). Pure: the server stores
 * the seed and the encounter; every roll comes from a named stream of it (`:runIn`, `:choice`,
 * `:damage`, `:caught`).
 */

export type RunInChoice = 'fight' | 'run' | 'talk' | 'pay';
export type RunInOutcomeKind = 'won' | 'lost' | 'ran' | 'talked' | 'paid';

/** Day flags from the hostile journey cards, in the city the act is in, today. */
export interface DayFlags {
  watched: boolean;
  warned: boolean;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const [CLAMP_MIN, CLAMP_MAX] = RUN_IN.clamp;

/**
 * Design §10.1 (§23.1 #2): the run-in chance. A mission: the base (the type's, or the way's own),
 * ×2 on rival ground; a tier-1 tap on rival ground: 15 flat (none at home); then + the Heat state's
 * bonus + 5 for a Repeat offender or worse + 10 Watched − 10 Warned, kept 0–90. The state is the one
 * after the act's own Heat.
 *
 * Review 5 (§14.12, ADR 0080): at `night` on rival ground the tier-1 base is 25, and a mission's
 * gains +10 after its ×2. At home or in a battleground `night` changes nothing.
 */
export function runInChance(i: {
  base: number;
  tier: 1 | 2;
  rivalGround: boolean;
  heatState: HeatState;
  record: RecordLevel;
  flags: DayFlags;
  night?: boolean;
  /**
   * Slice 7 (ADR 0044): the laws' `runInPct` in force at the act (`runInPcts`; the Curfew's +100 at
   * night): the chance multiplied, halves up, before the 0-90 clamp.
   */
  pcts?: readonly number[];
  /**
   * Slice 8 (design §3.6, ADR 0052): `recognition().total`, added on rival ground after the laws'
   * percentages and before the 0-90 clamp (ignored off rival ground).
   */
  recognition?: number;
}): number {
  const night = i.rivalGround && i.night === true;
  let base: number;
  if (i.tier === 2)
    base = i.base * (i.rivalGround ? RUN_IN.rivalFactor : 1) + (night ? RUN_IN.rivalNightAdd : 0);
  else if (i.rivalGround) base = night ? RUN_IN.rivalTier1Night : RUN_IN.rivalTier1;
  else return 0;
  const raw =
    base +
    heatBonus(i.heatState) +
    recordBonus(i.record) +
    (i.flags.watched ? RUN_IN.watched : 0) +
    (i.flags.warned ? RUN_IN.warned : 0);
  const pcts = i.pcts ?? [];
  const withLaws = pcts.length > 0 ? roundHalfUp(pcts.reduce((x, p) => x * (1 + p / 100), raw)) : raw;
  const recognised = i.rivalGround ? Math.max(0, i.recognition ?? 0) : 0;
  return clamp(withLaws + recognised, 0, RUN_IN.max);
}

/**
 * Design §10.2: who it is. The actor's own side is dropped; from *Noticed* the police are picked
 * half the time and the rest of the pool (police excluded) the other half, uniformly; at *Cool* the
 * pool as written, uniformly. An empty pool is the police.
 *
 * Review 5 (§14.12, ADR 0080): at `night` on `rivalGround` the police take half whatever the Heat
 * state, as from *Noticed*.
 */
export function pickOpponent(i: {
  pool: readonly string[];
  actor: FactionId;
  heatState: HeatState;
  sideOf: (id: string) => FactionId | 'police';
  policeId: string;
  rng: Rng;
  night?: boolean;
  rivalGround?: boolean;
}): string {
  const allowed = i.pool.filter((id) => i.sideOf(id) !== i.actor);
  if (i.heatState !== 'cool' || (i.night === true && i.rivalGround === true)) {
    const rest = allowed.filter((id) => id !== i.policeId);
    if (rest.length === 0 || i.rng.next() < RUN_IN.policeShare) return i.policeId;
    return rest[i.rng.int(0, rest.length - 1)]!;
  }
  if (allowed.length === 0) return i.policeId;
  return allowed[i.rng.int(0, allowed.length - 1)]!;
}

/**
 * §20.1: your power = STR × 1.5 + armour ÷ 2 (Tier I clothing is armour 4), rounded. Slice 8 (design
 * §3.10): `clothingTier` is the worn coat's (`coatTier`); a won fight's damage is less its armour.
 */
export function yourPower(str: number, clothingTier: number | null): number {
  return roundHalfUp(str * 1.5 + armourOf(clothingTier) / 2);
}

/** §20.3: a clothing tier's armour (none without clothing). */
export const armourOf = (tier: number | null): number =>
  tier !== null && tier >= 1 ? (ARMOUR_BY_TIER[Math.min(tier, ARMOUR_BY_TIER.length) - 1] ?? 0) : 0;

/** An opponent as content states it (design §10.2). */
export interface OpponentSpec {
  id: string;
  power: number;
  agi: number;
  wits: number;
  /** Iron to pay them off; null: won't be bought. */
  payOff: number | null;
  /** The branch inspector: −10 on your Fight odds. */
  fightPct?: number;
}

export interface ScaledOpponent {
  id: string;
  power: number;
  agi: number;
  wits: number;
  payOff: number | null;
  fightPct: number;
}

/** §20.2: power ×1.1 on a tier-2 mission, +4 on rival ground; AGI and Wits unchanged. */
export function scaleOpponent(o: OpponentSpec, i: { tier: 1 | 2; rivalGround: boolean }): ScaledOpponent {
  const power =
    roundHalfUp(o.power * (i.tier === 2 ? RUN_IN.tier2PowerFactor : 1)) + (i.rivalGround ? RUN_IN.rivalPowerAdd : 0);
  return { id: o.id, power, agi: o.agi, wits: o.wits, payOff: o.payOff, fightPct: o.fightPct ?? 0 };
}

export interface RunInChances {
  fight: number;
  run: number;
  talk: number;
  /** null: won't be bought. */
  pay: number | null;
}

/**
 * §20.1 (design §10.3): Fight 50 + 3 × (your power − theirs) (+ the inspector's −10); Run your AGI ÷
 * theirs × 60; Talk 50 + 4 × (worn CHA − their Wits); Pay 90 when they can be bought. Each whole,
 * kept 5–95.
 */
/**
 * Slice 8 (design §3.6, ADR 0052): `you.talkPct` is the sum of `itemBonuses(…, { special: 'bluff' },
 * their side)`: Marr's case always, forged papers against the police; added to Talk before the clamp.
 */
export function runInChances(
  you: { power: number; agi: number; cha: number; talkPct?: number },
  them: ScaledOpponent,
): RunInChances {
  const c = (x: number) => clamp(roundHalfUp(x), CLAMP_MIN, CLAMP_MAX);
  return {
    fight: c(RUN_IN.fight.base + RUN_IN.fight.perPower * (you.power - them.power) + them.fightPct),
    run: c((you.agi / Math.max(1, them.agi)) * RUN_IN.run.factor),
    talk: c(RUN_IN.talk.base + RUN_IN.talk.perPoint * (you.cha - them.wits) + (you.talkPct ?? 0)),
    pay: them.payOff === null ? null : RUN_IN.pay.chance,
  };
}

/** Design §10.4: *Leave it to luck* takes the free row with the best odds; ties fight > run > talk. */
export function luckChoice(c: Pick<RunInChances, 'fight' | 'run' | 'talk'>): 'fight' | 'run' | 'talk' {
  if (c.fight >= c.run && c.fight >= c.talk) return 'fight';
  if (c.run >= c.talk) return 'run';
  return 'talk';
}

export interface RunInStep {
  row: RunInChoice;
  chance: number;
  roll: number;
  ok: boolean;
}

export interface RunInOutcome {
  choice: RunInChoice;
  /** In order: the chosen row, then the fight it led to. */
  steps: RunInStep[];
  outcome: RunInOutcomeKind;
  /** Health lost (a loss: down to 0; the infirmary or the cells sets 30). */
  healthLoss: number;
  healthAfter: number;
  ironPaid: number;
  /** A failed *Pay them off*: +10 Heat. */
  heatAdded: number;
  xp: 0 | 10 | 20;
  /** Won at full Health: +10 % on the mission's XP and Party XP. */
  fullStrength: boolean;
  /** The first row that did not come off (the reason line), or null. */
  cause: 'power' | 'agi' | 'cha' | 'luck' | null;
}

/** A won fight's damage: their power × 0.8 × U[0.8, 1.2], rounded, less your armour, at least 0. */
function winDamage(them: ScaledOpponent, armour: number, rng: Rng): number {
  const spread = RUN_IN.damage.spreadPct / 100;
  const u = 1 - spread + rng.next() * 2 * spread;
  return Math.max(0, roundHalfUp(them.power * RUN_IN.damage.factor * u) - armour);
}

/**
 * Design §10.3: one tap is the whole run-in. A failed Run costs half a win's damage and the fight
 * goes ahead at −10; a failed Talk: the fight at −10; Pay takes the Iron whatever happens, and a
 * failed Pay adds 10 Heat and the fight at full odds. A win never takes Health below 1 (§23.1 #5);
 * a loss takes it to 0. `rng` is the `:choice` stream; `damageRng` the `:damage` stream.
 */
export function resolveRunIn(i: {
  choice: RunInChoice;
  chances: RunInChances;
  them: ScaledOpponent;
  iron: number;
  healthBefore: number;
  healthMax: number;
  armour: number;
  rng: Rng;
  damageRng?: Rng;
  /** Test hooks (tech design §8.5): the first row's roll. */
  forceRoll?: number;
}): RunInOutcome {
  const dmgRng = i.damageRng ?? i.rng;
  const steps: RunInStep[] = [];
  let first = true;
  const roll = () => {
    const r = i.rng.roll100();
    if (first && i.forceRoll !== undefined) {
      first = false;
      return i.forceRoll;
    }
    first = false;
    return r;
  };
  let health = i.healthBefore;
  let ironPaid = 0;
  let heatAdded = 0;
  let cause: RunInOutcome['cause'] = null;

  const fight = (chance: number): RunInOutcomeKind => {
    const r = roll();
    const ok = r <= chance;
    steps.push({ row: 'fight', chance, roll: r, ok });
    if (!ok) {
      cause ??= 'power';
      return 'lost';
    }
    health = Math.max(1, health - winDamage(i.them, i.armour, dmgRng));
    return 'won';
  };
  const followUp = (pct: number) => clamp(i.chances.fight + pct, CLAMP_MIN, CLAMP_MAX);

  let outcome: RunInOutcomeKind;
  switch (i.choice) {
    case 'fight':
      outcome = fight(i.chances.fight);
      break;
    case 'run': {
      const r = roll();
      const ok = r <= i.chances.run;
      steps.push({ row: 'run', chance: i.chances.run, roll: r, ok });
      if (ok) outcome = 'ran';
      else {
        cause = 'agi';
        health = Math.max(1, health - roundHalfUp(winDamage(i.them, i.armour, dmgRng) / 2));
        outcome = fight(followUp(RUN_IN.followUpPct));
      }
      break;
    }
    case 'talk': {
      const r = roll();
      const ok = r <= i.chances.talk;
      steps.push({ row: 'talk', chance: i.chances.talk, roll: r, ok });
      if (ok) outcome = 'talked';
      else {
        cause = 'cha';
        outcome = fight(followUp(RUN_IN.followUpPct));
      }
      break;
    }
    case 'pay': {
      const chance = i.chances.pay;
      const price = i.them.payOff;
      if (chance === null || price === null) throw new RangeError(`${i.them.id} won't be bought`);
      if (i.iron < price) throw new RangeError(`paying ${i.them.id} off needs ${price} Iron`);
      ironPaid = price;
      const r = roll();
      const ok = r <= chance;
      steps.push({ row: 'pay', chance, roll: r, ok });
      if (ok) outcome = 'paid';
      else {
        cause = 'luck';
        heatAdded = HEAT.failedPayOff;
        outcome = fight(i.chances.fight);
      }
      break;
    }
  }
  if (outcome === 'lost') health = 0;
  const xp = outcome === 'won' ? RUN_IN.xp.won : outcome === 'ran' || outcome === 'talked' ? RUN_IN.xp.away : 0;
  return {
    choice: i.choice,
    steps,
    outcome,
    healthLoss: i.healthBefore - health,
    healthAfter: health,
    ironPaid,
    heatAdded,
    xp,
    fullStrength: outcome === 'won' && i.healthBefore >= i.healthMax,
    cause,
  };
}

/**
 * §11.2 (design §7.1): base (×2 on rival ground) + Heat ÷ 2 + the state's bonus + 5 for a Repeat
 * offender − AGI ÷ 2, each term rounded down, kept 2–95. Heat is the value after the act's own gain.
 */
export function caughtChance(i: {
  base: number;
  rivalGround: boolean;
  heatAfter: number;
  record: RecordLevel;
  agi: number;
  /** Slice 7 (ADR 0044): the laws' `caughtDelta` for this mission's target (`caughtDeltas`), before the clamp. */
  deltas?: readonly number[];
}): number {
  const raw =
    (i.deltas ?? []).reduce((s, d) => s + d, 0) +
    i.base * (i.rivalGround ? RIVAL_GROUND.caughtFactor : 1) +
    Math.floor(i.heatAfter / CAUGHT.heatDivisor) +
    heatBonus(heatState(i.heatAfter)) +
    recordBonus(i.record) -
    Math.floor(i.agi / CAUGHT.agiDivisor);
  return clamp(raw, CAUGHT.min, CAUGHT.max);
}

export interface CaughtResult {
  /** The check was made (an illegal mission, a Partial or a Failure, no loss or Run). */
  checked: boolean;
  chance: number | null;
  roll: number | null;
  caught: boolean;
  /** *Wanted* and a Failure: the cells without a roll. */
  withoutRoll: boolean;
  /** Caught while *Hot* or *Wanted*: the cells; else the name taken. */
  arrest: boolean;
}

const NOT_CHECKED: CaughtResult = {
  checked: false,
  chance: null,
  roll: null,
  caught: false,
  withoutRoll: false,
  arrest: false,
};

/**
 * Design §7.1–§7.2 (§23.6 #11): only an illegal type, only on a Partial or a Failure, never after a
 * run-in lost or a Run. *Wanted* and a Failure: arrested without a roll. Caught while *Hot* or
 * *Wanted*: the cells; while *Cool* or *Noticed*: the name taken. `rng` is the `:caught` stream.
 */
export function caughtCheck(i: {
  type: MissionType;
  outcome: Outcome;
  street: 'none' | RunInOutcomeKind;
  heatAfter: number;
  record: RecordLevel;
  agi: number;
  rivalGround: boolean;
  rng: Rng;
  /** Test hooks (tech design §8.5). */
  force?: 'always' | 'never';
  /** Slice 7 (ADR 0044): the laws' `caughtDelta` for the mission's target (`caughtDeltas`). */
  deltas?: readonly number[];
}): CaughtResult {
  const spec = MISSION_TYPES[i.type];
  if (spec.caught === null || i.outcome === 'success' || i.street === 'lost' || i.street === 'ran') return NOT_CHECKED;
  const state = heatState(i.heatAfter);
  const hotOrWanted = state === 'hot' || state === 'wanted';
  if (state === 'wanted' && i.outcome === 'failure') {
    return { checked: true, chance: null, roll: null, caught: true, withoutRoll: true, arrest: true };
  }
  const chance = caughtChance({
    base: spec.caught,
    rivalGround: i.rivalGround,
    heatAfter: i.heatAfter,
    record: i.record,
    agi: i.agi,
    ...(i.deltas ? { deltas: i.deltas } : {}),
  });
  const drawn = i.rng.roll100();
  const caught = i.force === 'always' ? true : i.force === 'never' ? false : drawn <= chance;
  return { checked: true, chance, roll: drawn, caught, withoutRoll: false, arrest: caught && hotOrWanted };
}
