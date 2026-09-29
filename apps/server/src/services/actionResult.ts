import type { GameContent, LocatedAction } from '@irongate/content';
import type { CharacterDoc } from '@irongate/db';
import { DIRECTIVES, itemSpec, projectEnergy, trainingCost, usesSuccessText } from '@irongate/rules';
import type {
  ActionResult,
  BonusTag,
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
        fxp: done ? DIRECTIVES.orderDoneFxp : 0,
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
  const energyAfter = projectEnergy(energy.after, i.now);
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
    if (i.opinion) {
      opinion = { cityId: city.id, factionId: before.factionId, delta: r.rewards.opinion, ...i.opinion };
    }
    standing = {
      before: namedStanding(content, city.id, r.standing.before),
      after: namedStanding(content, city.id, r.standing.after),
    };
    const cost = 'energy' in action ? action.energy : 0;
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
    again = { cost1: trainingCost(r.stat.after), cost3: null }; // ×1 only (§8.5)
  } else {
    const r = i.resolution;
    stamp = 'worked';
    rewards = {
      xp: { ...NONE },
      fxp: { ...NONE },
      iron: { base: r.pay.half, bonus: r.pay.bonus, total: r.pay.total },
      opinion: 0,
    };
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
    },
    today: i.tally,
    again,
    character: toCharacterView(after, i.now, content, i.editionReadAt),
  };
}
