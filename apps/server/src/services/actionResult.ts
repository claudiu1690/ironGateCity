import type { GameContent, LocatedAction } from '@irongate/content';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  DIRECTIVES,
  ENERGY,
  FIRED_UP,
  NO_MODIFIERS,
  actionEnergy,
  effect,
  itemSpec,
  orderDoneFxp,
  projectEnergy,
  restedCapFor,
  trainingCost,
  trainingEnergy,
  usesSuccessText,
} from '@irongate/rules';
import type {
  ActionResult,
  BonusTag,
  CityModifiers,
  DailyTally,
  EnergyProjection,
  EnergyState,
  GainsResult,
  OrderEffect,
  OrdersState,
  RewardLine,
  Rewards,
  ShiftResolution,
  Tier1Resolution,
  TrainingResolution,
} from '@irongate/rules';
import { pickArt } from './art';
import { namedStanding, rankTitle, toCharacterView } from './views';

const NONE: RewardLine = { base: 0, bonus: 0, total: 0 };

interface Common {
  content: GameContent;
  logId: string;
  idempotencyKey: string;
  /** Generated for every kind (only checked actions roll). */
  seed: string;
  now: number;
  located: LocatedAction;
  before: CharacterDoc;
  after: CharacterDoc;
  editionReadAt: number | null;
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  gains: GainsResult;
  orders: { before: OrdersState; after: OrdersState; completed: string[]; allDone: boolean };
  tally: DailyTally;
  /** Slice 3: the modifiers the action ran under, the city, a morale crossing, the branch's endorsement. */
  modifiers?: CityModifiers;
  city?: CityDoc | null;
  morale?: ActionResult['effects']['morale'];
  branchEndorsement?: ActionResult['effects']['branchEndorsement'];
}

export type ResultInput = Common &
  (
    | {
        kind: 'checked';
        resolution: Tier1Resolution;
        opinion: { applied: number; shareBefore: number; shareAfter: number } | null;
      }
    | { kind: 'training'; resolution: TrainingResolution }
    | { kind: 'shift'; resolution: ShiftResolution; sickDaysLeft: number; nextShiftAt: number }
  );

function orderEffects(content: GameContent, c: Common): OrderEffect[] {
  const templates = content.ordersOf(c.before.factionId);
  return c.orders.after.items.flatMap((item) => {
    const prev = c.orders.before.items.find((x) => x.templateId === item.templateId);
    if (!prev || prev.progress === item.progress) return [];
    const t = templates.find((x) => x.id === item.templateId);
    if (!t) return [];
    const done = c.orders.completed.includes(item.templateId);
    return [
      {
        id: item.templateId,
        title: itemSpec(item, t).title,
        before: prev.progress,
        after: item.progress,
        target: item.target,
        done: item.doneAt !== null,
        fxp: done ? orderDoneFxp(t) : 0,
      },
    ];
  });
}

/**
 * The result modal payload (GDD §13.1a, tech design §9), built in one place from the pure
 * resolution, the content text and the character before and after. Stored verbatim in
 * `actionLogs.result` and returned unchanged on a retry. The client computes nothing.
 */
export function buildActionResult(i: ResultInput): ActionResult {
  const { content, located, before, after, energy } = i;
  const { city, location, action } = located;
  const m = i.modifiers ?? NO_MODIFIERS;
  const energyAfter = projectEnergy(energy.after, i.now, ENERGY.max, restedCapFor(m));
  const bonusTags: BonusTag[] = [];
  const restedApplies = i.kind !== 'shift';
  if (restedApplies && energy.restedUsed > 0) {
    // §6.3 modal tag: "Rested: 20 of 30 Energy, +33 % XP and Iron" (training: XP only).
    const pct = Math.round((50 * energy.restedUsed) / energy.cost);
    bonusTags.push({
      id: 'rested',
      label: 'Rested',
      note: `${energy.restedUsed} of ${energy.cost} Energy, +${pct} % ${i.kind === 'training' ? 'XP' : 'XP and Iron'}`,
    });
  }

  let stamp: ActionResult['stamp'];
  let successes = 0;
  let text = action.text.success;
  let rewards: Rewards;
  let attempts: ActionResult['attempts'] = [];
  let rows: ActionResult['rows'] = [];
  let again: ActionResult['again'] = null;
  let opinion: ActionResult['effects']['opinion'] = null;
  let standing: ActionResult['effects']['standing'] = null;
  let stat: ActionResult['effects']['stat'] = null;
  let shift: ActionResult['effects']['shift'] = null;

  if (i.kind === 'checked') {
    const r = i.resolution;
    stamp = r.summary.stamp;
    successes = r.summary.successes;
    if ('partial' in action.text && !usesSuccessText(successes, r.times)) text = action.text.partial;
    rewards = r.rewards;
    attempts = r.attempts;
    if (r.attempts.some((a) => a.orderId !== null)) {
      bonusTags.push({
        id: 'order',
        label: 'Party order',
        note: `+${Math.round(DIRECTIVES.matchFxpBonus * 100)} % FXP`,
      });
    }
    const standingBonus = r.attempts.at(-1)?.check.bonuses.find((b) => b.id === 'standing');
    if (standingBonus)
      bonusTags.push({ id: 'standing', label: standingBonus.label, note: `+${standingBonus.value} %` });
    // Slice 3 (tech design §10.2): one tag per ordinance or state that applied.
    const ord = m.ordinance;
    const ordCheck = r.attempts.at(-1)?.check.bonuses.find((b) => b.id === ord?.id);
    if (ord && ordCheck) bonusTags.push({ id: ord.id, label: ord.name, note: `+${ordCheck.value} %` });
    if (ord && effect(m, 'energyDelta', action.type) && 'energy' in action)
      bonusTags.push({
        id: ord.id,
        label: ord.name,
        note: `${actionEnergy(action.energy, action.type, m)} Energy`,
      });
    if (ord && r.rewards.iron.parts?.some((p) => p.id === ord.id))
      bonusTags.push({ id: ord.id, label: ord.name, note: `+${effect(m, 'ironPct')!.value} % Iron` });
    if (ord && r.rewards.fxp.parts?.some((p) => p.id === ord.id))
      bonusTags.push({ id: ord.id, label: ord.name, note: `+${effect(m, 'fxpPct')!.value} % FXP` });
    if (ord && effect(m, 'standingMultiplier') && r.standing.after > r.standing.before)
      bonusTags.push({ id: ord.id, label: ord.name, note: 'Standing ×2' });
    if (ord && effect(m, 'swingPct', action.type))
      bonusTags.push({
        id: ord.id,
        label: ord.name,
        note: `+${effect(m, 'swingPct', action.type)!.value} % opinion`,
      });
    if (r.rewards.fxp.parts?.some((p) => p.id === FIRED_UP.id))
      bonusTags.push({ id: FIRED_UP.id, label: FIRED_UP.label, note: '+10 % FXP' });
    if (i.opinion) {
      opinion = { cityId: city.id, factionId: before.factionId, delta: r.rewards.opinion, ...i.opinion };
    }
    standing = {
      before: namedStanding(content, city.id, r.standing.before),
      after: namedStanding(content, city.id, r.standing.after),
    };
    const cost = 'energy' in action ? actionEnergy(action.energy, action.type, m) : 0;
    again = { cost1: cost, cost3: cost * 3 };
  } else if (i.kind === 'training') {
    const r = i.resolution;
    stamp = 'trained';
    rewards = { xp: r.xp, fxp: { ...NONE }, iron: { ...NONE }, opinion: 0 };
    const name = r.stat.stat.toUpperCase();
    rows = r.rows.map((row) => ({
      index: row.index,
      label: `${name} ${row.from} → ${row.to}`,
      detail: `${row.cost} Energy · no roll`,
    }));
    stat = r.stat;
    if (m.ordinance && effect(m, 'trainingEnergyPct'))
      bonusTags.push({ id: m.ordinance.id, label: m.ordinance.name, note: `${r.energy.cost} Energy` });
    again = { cost1: trainingEnergy(trainingCost(r.stat.after), m), cost3: null }; // ×1 only (§8.5)
  } else {
    const r = i.resolution;
    stamp = 'worked';
    const ordPay = r.pay.ordinance;
    rewards = {
      xp: { ...NONE },
      fxp: { ...NONE },
      iron: {
        base: r.pay.half,
        bonus: r.pay.total - r.pay.half,
        total: r.pay.total,
        // Economy §14.4: the streak and the ordinance line are each a share of the unmodified pay.
        ...(ordPay
          ? {
              parts: [
                { id: 'streak', label: 'Streak', amount: r.pay.bonus },
                { id: ordPay.id, label: ordPay.label, amount: ordPay.amount },
              ],
            }
          : {}),
      },
      opinion: 0,
    };
    if (m.ordinance && (effect(m, 'shiftEnergyDelta') || ordPay)) {
      const notes = [
        ...(effect(m, 'shiftEnergyDelta') ? [`${r.energy.cost} Energy`] : []),
        ...(effect(m, 'shiftStreakDays') ? ['streak +2'] : []),
        ...(ordPay ? [`${ordPay.amount >= 0 ? '+' : '−'}${Math.abs(ordPay.amount)} Iron`] : []),
      ];
      bonusTags.push({ id: m.ordinance.id, label: m.ordinance.name, note: notes.join(', ') });
    }
    const job = before.job ? content.job(before.job.id) : undefined;
    rows = [{ index: 1, label: job?.name ?? 'Shift', detail: `${r.energy.cost} Energy · no roll` }];
    shift = {
      half: r.pay.half,
      streakBonus: r.pay.bonus,
      streakPct: Math.round(r.pay.pct * 100),
      streak: r.streak,
      sickDaysLeft: i.sickDaysLeft,
      nextShiftAt: i.nextShiftAt,
    };
  }

  const g = i.gains;
  return {
    logId: i.logId,
    idempotencyKey: i.idempotencyKey,
    performedAt: new Date(i.now).toISOString(),
    seed: i.seed,
    place: {
      cityId: city.id,
      cityName: city.name,
      locationId: location.id,
      locationName: location.name,
      kind: location.kind,
    },
    kind: i.kind,
    action: {
      id: action.id,
      name: action.name,
      type: action.type,
      tier: 1,
      times: i.kind === 'shift' ? 1 : i.resolution.times,
    },
    stamp,
    story: null,
    successes,
    headline: text.headline,
    body: text.body,
    art: pickArt(content, city, location, i.now),
    attempts,
    rows,
    rewards,
    bonusTags,
    effects: {
      energy: {
        before: energy.before.value,
        after: energy.after.value,
        max: energy.before.max,
        nextTickAt: energyAfter.nextTickAt,
      },
      rested: { before: energy.before.rested, after: energy.after.rested },
      xp: { before: before.xp, after: after.xp },
      fxp: { before: before.fxp, after: after.fxp },
      iron: { before: before.iron, after: after.iron },
      level: after.level,
      opinion,
      standing,
      levelUp: g.levelUp,
      rankUp: g.rankUp ? { ...g.rankUp, title: rankTitle(content, before, g.rankUp.to) } : null,
      pc: after.pc !== before.pc ? { before: before.pc, after: after.pc } : null,
      orders: orderEffects(content, i),
      ordersAllDone: i.orders.allDone ? { pc: DIRECTIVES.allDonePc } : null,
      stat,
      shift,
      item: null,
      hooks: [],
      morale: i.morale ?? null,
      branchEndorsement: i.branchEndorsement ?? null,
    },
    today: i.tally,
    again,
    character: toCharacterView(after, i.now, content, i.editionReadAt, { city: i.city ?? null }),
  };
}
