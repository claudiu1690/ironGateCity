import { copy } from '@irongate/content/copy';
import type { GameContent, LocatedAction } from '@irongate/content';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  DIRECTIVES,
  ENERGY,
  CLOSE_RACE,
  COMEBACK,
  FIRED_UP,
  NO_MODIFIERS,
  actionEnergy,
  itemSpec,
  orderDoneFxp,
  projectEnergy,
  restedCapFor,
  rivalGroundIn,
  sourcesOf,
  trainingCost,
  trainingEnergy,
  usesSuccessText,
} from '@irongate/rules';
import type {
  ActionResult,
  BonusTag,
  DailyTally,
  EnergyProjection,
  EnergyState,
  GainsResult,
  Modifiers,
  OrderEffect,
  OrdersState,
  RewardLine,
  Rewards,
  StreetView,
  Tier1Resolution,
  TrainingResolution,
} from '@irongate/rules';
import { pickArt } from './art';
import { namedStanding, orderText, orderVars, rankTitle, toCharacterView } from './views';

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
  modifiers?: Modifiers;
  /** The residence city (the HUD's Rested cap). */
  city?: CityDoc | null;
  /** Slice 4 (ADR 0030 §5): the Rested cap of the residence and the room. */
  restedCap?: number;
  /** Slice 4: the meter the action moved (a district, or the city). */
  place?: { placeId: string; placeName: string };
  /** Slice 4: the Issues' momentum this action added; the scoreboard line after it. */
  issues?: NonNullable<ActionResult['effects']['issues']>;
  scoreboard?: ActionResult['effects']['scoreboard'];
  morale?: ActionResult['effects']['morale'];
  branchEndorsement?: ActionResult['effects']['branchEndorsement'];
  /** Slice 5 (tech design §10.2): a rival-ground tap's street block. */
  street?: StreetView;
}

export type ResultInput = Common &
  (
    | {
        kind: 'checked';
        resolution: Tier1Resolution;
        /** The meter's move; slice 5: `against` a faction (ADR 0034). */
        opinion: Omit<NonNullable<ActionResult['effects']['opinion']>, 'cityId' | 'factionId' | 'delta'> | null;
      }
    | { kind: 'training'; resolution: TrainingResolution }
  );

function orderEffects(content: GameContent, c: Common): OrderEffect[] {
  const templates = content.ordersOf(c.before.factionId);
  // Slice-4 fixes §2 (QA m1): `{city}` and `{verbs}` for the reader (titles carry no `{issue}`).
  const vars = orderVars(content, c.before, null);
  return c.orders.after.items.flatMap((item) => {
    const prev = c.orders.before.items.find((x) => x.templateId === item.templateId);
    if (!prev || prev.progress === item.progress) return [];
    const t = templates.find((x) => x.id === item.templateId);
    if (!t) return [];
    const done = c.orders.completed.includes(item.templateId);
    return [
      {
        id: item.templateId,
        title: orderText(itemSpec(item, t).title, vars),
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
  const energyAfter = projectEnergy(energy.after, i.now, ENERGY.max, i.restedCap ?? restedCapFor(m));
  const bonusTags: BonusTag[] = [];
  if (energy.restedUsed > 0) {
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
  let standingUp: ActionResult['effects']['standingUp'] = null;

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
        note: `+${Math.round(DIRECTIVES.matchFxpBonus * 100)} % Party XP`,
      });
    }
    // Review 2 (GDD §8.4): a bonus to the odds is named, never numbered; the breakdown keeps the value.
    const odds = (v: number) => (v >= 0 ? 'better odds' : 'worse odds');
    const standingBonus = r.attempts.at(-1)?.check.bonuses.find((b) => b.id === 'standing');
    if (standingBonus)
      bonusTags.push({ id: 'standing', label: standingBonus.label, note: odds(standingBonus.value) });
    const firstDay = r.attempts.at(-1)?.check.bonuses.find((b) => b.id === 'first-day');
    if (firstDay) bonusTags.push({ id: 'first-day', label: firstDay.label, note: odds(firstDay.value) });
    // Slice 4 (ADR 0030, tech design §10.1): the place's tags first (Issue, Close race, Comeback).
    for (const t of r.issues ?? [])
      bonusTags.push({ id: `issue:${t.issueId}`, label: `Issue: ${t.name}`, note: 'opinion +50 %' });
    // Slice 5 (tech design §10.2): rival ground, its Party XP share and the worse odds.
    const rivalPart = r.rewards.fxp.parts?.find((p) => p.id === 'rivalGround');
    if (r.attempts.at(-1)?.check.bonuses.some((b) => b.id === 'rivalGround')) {
      const pct = rivalGroundIn(m)?.unrest ? 75 : 50;
      bonusTags.push({
        id: 'rivalGround',
        label: 'Rival ground',
        note: rivalPart ? `+${pct} % Party XP · worse odds` : 'worse odds',
      });
    }
    const closeRace = r.attempts.at(-1)?.check.bonuses.some((b) => b.id === CLOSE_RACE.id);
    if (closeRace)
      bonusTags.push({ id: CLOSE_RACE.id, label: CLOSE_RACE.label, note: '+25 % Party XP · better odds' });
    const comeback = r.opinionFactors?.find((f) => f.id === COMEBACK.id);
    if (comeback) bonusTags.push({ id: COMEBACK.id, label: COMEBACK.label, note: `+${comeback.pct} %` });
    // Slice 3 (tech design §10.2): one tag per source (an ordinance, an Issue effect) that applied.
    for (const src of sourcesOf(m)) {
      const own = <K extends string>(kind: K, actionType?: string) =>
        src.effects.find((e) => e.kind === kind && (!('actionType' in e) || e.actionType === actionType)) as
          { value: number } | undefined;
      const tag = (note: string) => bonusTags.push({ id: src.id, label: src.name, note });
      const check = r.attempts.at(-1)?.check.bonuses.find((b) => b.id === src.id);
      if (check) tag(odds(check.value));
      if (own('energyDelta', action.type) && 'energy' in action)
        tag(`${actionEnergy(action.energy, action.type, m)} Energy`);
      if (r.rewards.iron.parts?.some((p) => p.id === src.id)) tag(`+${own('ironPct')!.value} % Iron`);
      if (r.rewards.fxp.parts?.some((p) => p.id === src.id)) tag(`+${own('fxpPct')!.value} % Party XP`);
      if (own('standingMultiplier') && r.standing.after > r.standing.before) tag('reputation ×2');
      const swing = own('swingPct', action.type);
      if (swing) tag(`+${swing.value} % opinion`);
    }
    if (r.rewards.fxp.parts?.some((p) => p.id === FIRED_UP.id))
      bonusTags.push({ id: FIRED_UP.id, label: FIRED_UP.label, note: '+10 % Party XP' });
    if (i.opinion) {
      opinion = {
        cityId: city.id,
        ...(i.place ? { placeId: i.place.placeId, placeName: i.place.placeName } : {}),
        factionId: before.factionId,
        delta: r.rewards.opinion,
        ...i.opinion,
      };
    }
    standing = {
      before: namedStanding(content, city.id, r.standing.before),
      after: namedStanding(content, city.id, r.standing.after),
    };
    // Review 1 (§13.4): a level crossed is a Standing card in the modal (the highest one reached).
    if (standing.after.level > standing.before.level && standing.after.level > 0) {
      standingUp = {
        level: standing.after.level as 1 | 2 | 3 | 4,
        cityName: city.name,
        rank3Title: rankTitle(content, before, 3),
      };
    }
    const cost = 'energy' in action ? actionEnergy(action.energy, action.type, m) : 0;
    // Slice 5 (design §11.2): ×1 only on rival ground.
    again = { cost1: cost, cost3: i.street ? null : cost * 3 };
  } else {
    const r = i.resolution;
    stamp = 'trained';
    rewards = { xp: r.xp, fxp: { ...NONE }, iron: { ...NONE }, opinion: 0 };
    // Review 2 (answers §1.2, §2.2): the stat in full; training always works.
    const name = copy.statNames[r.stat.stat];
    rows = r.rows.map((row) => ({
      index: row.index,
      label: `${name} ${row.from} → ${row.to}`,
      detail: `${row.cost} Energy · always works`,
    }));
    stat = r.stat;
    for (const src of sourcesOf(m))
      if (src.effects.some((e) => e.kind === 'trainingEnergyPct'))
        bonusTags.push({ id: src.id, label: src.name, note: `${r.energy.cost} Energy` });
    // ×1 only (§8.5); review 3: the repeat button names the action's verb ("Study again · 46 Energy").
    again = {
      cost1: trainingEnergy(trainingCost(r.stat.after), m),
      cost3: null,
      ...('verb' in action ? { verb: action.verb } : {}),
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
      times: i.resolution.times,
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
      standingUp,
      item: null,
      hooks: [],
      morale: i.morale ?? null,
      branchEndorsement: i.branchEndorsement ?? null,
      ...(i.issues && i.issues.length > 0 ? { issues: i.issues } : {}),
      ...(i.scoreboard ? { scoreboard: i.scoreboard } : {}),
    },
    today: i.tally,
    again,
    ...(i.street ? { street: i.street } : {}),
    character: toCharacterView(after, i.now, content, i.editionReadAt, { city: i.city ?? null }),
  };
}
