import type { GameContent, LocatedMission, Mission } from '@irongate/content';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  CLOSE_RACE,
  COMEBACK,
  DIRECTIVES,
  ENERGY,
  FIRED_UP,
  heatEta,
  healthFullAt,
  isAgilityWay,
  itemSpec,
  oddsBand,
  orderDoneFxp,
  projectEnergy,
  rivalGroundIn,
  sourcesOf,
  NIGHT_RATE,
  NIGHT_RATE_PART,
} from '@irongate/rules';
import type {
  ActionResult,
  BonusTag,
  DailyTally,
  DayKey,
  GainsResult,
  MissionFinal,
  MissionStart,
  Modifiers,
  OrderEffect,
  OrdersState,
  ResultArt,
  RunInOutcome,
  StreetView,
} from '@irongate/rules';
import { pickArt } from './art';
import type { OpinionMove } from './place';
import { assetView, namedStanding, orderText, orderVars, rankTitle, toCharacterView } from './views';

/** Design §4.2 labels: *Mission · Speech* / *Watch and listen* / *Against the {faction}*. */
export function missionLabel(type: Mission['type']): 'speech' | 'watch' | 'against' {
  if (type === 'speech') return 'speech';
  if (type === 'surveillance') return 'watch';
  return 'against';
}

/** GDD §13.5 rung 4: the mission's card, else the type's, else the place's scene or map crop. */
export function missionArt(content: GameContent, located: LocatedMission, now: number): ResultArt {
  const id = located.mission.card ?? content.missionCard(located.mission.type);
  if (id && content.asset(id)) return { rung: 'scene', asset: assetView(content, id) };
  return pickArt(content, located.city, located.location, now);
}

/** The run-in's block as the result shows it (tech design §10.1). */
export interface RunInBlock {
  outcome: RunInOutcome;
  opponentId: string;
  by: 'player' | 'luck' | 'auto';
  /** Dev and QA see the chances and rolls. */
  showRolls: boolean;
}

/**
 * The mission's result modal (GDD §13.1a, tech design §10.1), built once from the pure start and
 * finish, the content text and the character before and after. Stored verbatim in `actionLogs`.
 */
export function buildMissionResult(i: {
  content: GameContent;
  located: LocatedMission;
  wayId: string;
  start: MissionStart;
  final: MissionFinal;
  runIn: RunInBlock | null;
  caught: { caught: boolean; withoutRoll: boolean; chance: number | null; roll: number | null } | null;
  sentTo: { stayId: string; placeName: string; landing: { cityId: string; quarterId?: string; locationId: string } } | null;
  move: OpinionMove | null;
  logId: string;
  idempotencyKey: string;
  now: number;
  before: CharacterDoc;
  after: CharacterDoc;
  gains: GainsResult;
  orders: { before: OrdersState; after: OrdersState; completed: string[]; allDone: boolean };
  tally: DailyTally;
  modifiers: Modifiers;
  residenceCity: CityDoc | null;
  restedCap: number;
  editionReadAt: number | null;
  place: { placeId: string; placeName: string };
  issues: NonNullable<ActionResult['effects']['issues']>;
  scoreboard: ActionResult['effects']['scoreboard'];
  morale: ActionResult['effects']['morale'];
  branch: ActionResult['effects']['branch'];
  rateOn: (day: DayKey) => number;
  firstMission: boolean;
  firstHeatState: boolean;
  firstMark: boolean;
  remembered: boolean;
  showRolls: boolean;
}): ActionResult {
  const { content, located, start: s, final: f, before, after } = i;
  const { city, location, mission } = located;
  const way = mission.ways.find((w) => w.id === i.wayId)!;
  const m = i.modifiers;
  const energyAfter = projectEnergy(s.energy.after, i.now, ENERGY.max, i.restedCap);

  const bonusTags: BonusTag[] = [];
  if (s.energy.restedUsed > 0) {
    const pct = Math.round((50 * s.energy.restedUsed) / s.energy.cost);
    bonusTags.push({
      id: 'rested',
      label: 'Rested',
      note: `${s.energy.restedUsed} of ${s.energy.cost} Energy, +${pct} % XP and Iron`,
    });
  }
  if (f.orders.advanced) {
    bonusTags.push({ id: 'order', label: 'Party order', note: `+${Math.round(DIRECTIVES.matchFxpBonus * 100)} % Party XP` });
  }
  const odds = (v: number) => (v >= 0 ? 'better odds' : 'worse odds');
  const bonuses = s.attempt.check.bonuses;
  const standingBonus = bonuses.find((b) => b.id === 'standing');
  if (standingBonus) bonusTags.push({ id: 'standing', label: standingBonus.label, note: odds(standingBonus.value) });
  const rival = rivalGroundIn(m);
  if (rival) {
    const part = f.rewards.fxp.parts?.some((p) => p.id === 'rivalGround');
    bonusTags.push({
      id: 'rivalGround',
      label: 'Rival ground',
      note: part ? `+${rival.unrest ? 75 : 50} % Party XP · worse odds` : 'worse odds',
    });
  }
  for (const t of s.issues) bonusTags.push({ id: `issue:${t.issueId}`, label: `Issue: ${t.name}`, note: 'opinion +50 %' });
  if (bonuses.some((b) => b.id === CLOSE_RACE.id))
    bonusTags.push({ id: CLOSE_RACE.id, label: CLOSE_RACE.label, note: '+25 % Party XP · better odds' });
  const comeback = s.opinion.factors.find((x) => x.id === COMEBACK.id);
  if (comeback) bonusTags.push({ id: COMEBACK.id, label: COMEBACK.label, note: `+${comeback.pct} %` });
  for (const src of sourcesOf(m)) {
    const check = bonuses.find((b) => b.id === src.id);
    if (check) bonusTags.push({ id: src.id, label: src.name, note: odds(check.value) });
    if (s.energy.cost !== mission.energy) bonusTags.push({ id: src.id, label: src.name, note: `${s.energy.cost} Energy` });
  }
  if (f.rewards.fxp.parts?.some((p) => p.id === FIRED_UP.id))
    bonusTags.push({ id: FIRED_UP.id, label: FIRED_UP.label, note: '+10 % Party XP' });
  // Review 5 (answers §12.1, §18 Q1): a night mission's rate, its part in the receipt's *Details*.
  if (f.rewards.iron.parts?.some((p) => p.id === NIGHT_RATE_PART.id))
    bonusTags.push({ id: NIGHT_RATE_PART.id, label: NIGHT_RATE_PART.label, note: `+${NIGHT_RATE.ironPct} % Iron` });
  const recordPart = f.rewards.iron.parts?.find((p) => p.id === 'record');
  if (recordPart) bonusTags.push({ id: 'record', label: 'Your record', note: `Iron ${recordPart.amount}` });

  const opinion: ActionResult['effects']['opinion'] = i.move?.effect
    ? {
        cityId: city.id,
        placeId: i.place.placeId,
        placeName: i.place.placeName,
        factionId: before.factionId,
        delta: f.swing,
        ...i.move.effect,
      }
    : null;
  const standing = {
    before: namedStanding(content, city.id, s.standing.before),
    after: namedStanding(content, city.id, f.standing),
  };
  const standingUp =
    standing.after.level > standing.before.level && standing.after.level > 0
      ? {
          level: standing.after.level as 1 | 2 | 3 | 4,
          cityName: city.name,
          rank3Title: rankTitle(content, before, 3),
        }
      : null;

  // The street block (tech design §10.1).
  const opp = i.runIn ? content.opponent(i.runIn.opponentId) : undefined;
  const r = i.runIn?.outcome;
  const street: StreetView = {
    runIn:
      i.runIn && r && opp
        ? {
            opponent: { id: opp.id, label: opp.label, portrait: assetView(content, opp.portrait), pronoun: opp.pronoun },
            choice: r.choice,
            by: i.runIn.by,
            steps: r.steps.map((x) => ({
              row: x.row,
              ok: x.ok,
              band: oddsBand(x.chance),
              ...(i.showRolls ? { chance: x.chance, roll: x.roll } : {}),
            })),
            outcome: r.outcome,
            // Slice 8 (ADR 0088): no run-in carries a bodyguard before phase B; then his `works` line.
            line: (r.outcome === 'minded' ? opp.lines.talked : opp.lines[r.outcome]) ?? opp.lines.won,
            cause: r.cause,
            health: f.health
              ? {
                  before: f.health.before,
                  after: f.health.after,
                  max: f.health.max,
                  fullAt: healthFullAt(f.health.timer, i.now),
                }
              : null,
            ironPaid: r.ironPaid,
            heatAdded: r.heatAdded,
            xp: r.xp,
          }
        : null,
    heat: {
      before: f.heat.before,
      gain: f.heat.after - f.heat.before,
      after: f.heat.after,
      state: f.heat.stateAfter,
      stateBefore: f.heat.stateBefore,
      coolsAt: f.heat.stateAfter === 'cool' ? null : heatEta(f.heat.timer, i.now, i.rateOn, 25),
      first: i.firstHeatState,
    },
    caught: i.caught?.caught || i.caught?.chance != null
      ? {
          caught: i.caught.caught,
          withoutRoll: i.caught.withoutRoll,
          ...(i.showRolls && i.caught.chance !== null ? { chance: i.caught.chance } : {}),
          ...(i.showRolls && i.caught.roll !== null ? { roll: i.caught.roll } : {}),
        }
      : null,
    record:
      f.record.added.length > 0
        ? {
            added: f.record.added.length,
            escalated: f.record.escalated,
            before: f.record.before,
            after: f.record.after,
            marks: f.record.marks.length,
            first: i.firstMark,
            allMinor: f.record.marks.every((m) => m.kind === 'minor'),
            ...(f.sentTo?.kind === 'cells' ? { takenIn: true } : {}),
          }
        : null,
    // Review 4 #20 (ADR 0078): *Orders off until the day turns* (not on a day already settled past).
    ...(f.ordersOff && i.orders.after.off ? { ordersOff: true } : {}),
    sentTo:
      f.sentTo && i.sentTo
        ? {
            kind: f.sentTo.kind,
            stayId: i.sentTo.stayId,
            placeName: i.sentTo.placeName,
            until: f.sentTo.held.until,
            bail: f.sentTo.held.bail?.total ?? null,
            landing: i.sentTo.landing,
          }
        : null,
    agility: f.agility ? { quarters: f.agility.quarters, gained: f.agility.gained } : null,
    remembered: i.remembered,
    dropped: f.dropped,
  };

  const text = mission.text[f.outcome];
  const templates = content.ordersOf(before.factionId);
  const vars = orderVars(content, before, null);
  const orders: OrderEffect[] = i.orders.after.items.flatMap((item) => {
    const prev = i.orders.before.items.find((x) => x.templateId === item.templateId);
    if (!prev || prev.progress === item.progress) return [];
    const t = templates.find((x) => x.id === item.templateId);
    if (!t) return [];
    const done = i.orders.completed.includes(item.templateId);
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
  const g = i.gains;
  return {
    logId: i.logId,
    idempotencyKey: i.idempotencyKey,
    performedAt: new Date(i.now).toISOString(),
    seed: s.seed,
    place: { cityId: city.id, cityName: city.name, locationId: location.id, locationName: location.name, kind: location.kind },
    kind: 'mission',
    action: { id: mission.id, name: mission.name, type: mission.type, tier: 2, times: 1 },
    stamp: f.stamp,
    story: null,
    successes: f.outcome === 'success' && !f.dropped ? 1 : 0,
    headline: text.headline,
    body: text.body,
    art: missionArt(content, located, i.now),
    attempts: [
      {
        ...s.attempt,
        rewards: f.rewards,
        restedUsed: s.energy.restedUsed,
        orderId: f.orders.advanced,
        ...(f.dropped ? { dropped: f.dropped } : {}),
      },
    ],
    rows: [],
    rewards: f.rewards,
    bonusTags,
    effects: {
      energy: {
        before: s.energy.before.value,
        after: s.energy.after.value,
        max: s.energy.before.max,
        nextTickAt: energyAfter.nextTickAt,
      },
      rested: { before: s.energy.before.rested, after: s.energy.after.rested },
      xp: { before: before.xp, after: after.xp },
      fxp: { before: before.fxp, after: after.fxp },
      iron: { before: before.iron, after: after.iron },
      level: after.level,
      opinion,
      standing,
      standingUp,
      levelUp: g.levelUp,
      rankUp: g.rankUp ? { ...g.rankUp, title: rankTitle(content, before, g.rankUp.to) } : null,
      pc: after.pc !== before.pc ? { before: before.pc, after: after.pc } : null,
      orders,
      ordersAllDone: i.orders.allDone ? { pc: DIRECTIVES.allDonePc } : null,
      stat: f.agility?.statUp ? { stat: 'agi', before: before.stats.agi, after: after.stats.agi } : null,
      item: null,
      hooks: [],
      morale: i.morale ?? null,
      branch: i.branch ?? null,
      ...(i.issues.length > 0 ? { issues: i.issues } : {}),
      ...(i.scoreboard ? { scoreboard: i.scoreboard } : {}),
    },
    today: i.tally,
    again: f.sentTo ? null : { cost1: s.energy.cost, cost3: null, way: { id: way.id, title: way.title } },
    mission: {
      id: mission.id,
      type: mission.type,
      label: missionLabel(mission.type),
      targetFactionId: s.opinion.mode === 'against' ? s.opinion.target : null,
      way: { id: way.id, title: way.title, stats: way.stats, agility: isAgilityWay(way) },
      firstTime: i.firstMission,
    },
    street,
    character: toCharacterView(after, i.now, content, i.editionReadAt, { city: i.residenceCity }),
  };
}
