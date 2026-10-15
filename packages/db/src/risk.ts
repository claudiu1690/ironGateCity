import {
  HEAT,
  MISSION_TYPES,
  MISSION_TYPE_IDS,
  RIVAL_GROUND,
  dayKey,
  dayStart,
  heatState,
  liveMarks,
  recordLevel,
} from '@irongate/rules';
import type { DayKey, HeatState, MarkKind, MissionType, RecordLevel } from '@irongate/rules';
import { formatShare } from './funnel';

/**
 * The slice-5 playtest report (tech design §15.2, design §19 Q10): "is risk exciting rather than
 * punishing?" Pure maths over rows read from five collections only: `actionLogs`, `encounters`,
 * `stays`, `journeys` and `characters` (plus the content's home cities, to tell rival ground). The
 * numbers to watch are the loss rate on auto-resolve and how often a player who was taken in comes
 * back the next City Day.
 *
 * What these five collections do not hold, and how the section handles it:
 * - **Strike-offs** are request logs (`record.strike`, kept seven days), not in the five: printed as
 *   *not recorded*. So are record levels going down (fades and strike-offs write no row).
 * - **Fades** are estimated: each player's marks are rebuilt from their missions' results (the
 *   type's mark kind, or serious when escalated, dated by the mission's City Day) and faded with the
 *   rules' `liveMarks` as of the report's day, as if nothing was struck off. Marks set by the dev
 *   panel or the test hooks have no mission and are not in the estimate.
 * - **Time spent Hot or above** is approximated from the Heat readings that are stored (a mission's
 *   or a rival tap's Heat after, a journey card's Heat after, a stay's Heat at the arrest and after
 *   the release): from each reading Heat is taken to cool at the base rate (5 an hour) until the next
 *   reading or the report's time. Cooling ordinances and the dev panel's Heat are not seen.
 * - **Flags** are counted from answered hostile cards (`journeys.choice.result.flag`). A card slept
 *   through sets its flag without storing it on the journey, so those are not counted.
 * - **Pressure** on a home city is rebuilt from the actions' opinion lines (`against` its home party
 *   on its own ground), not read from `cities.rivalPressure`, which keeps only today and yesterday.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const share = (a: number, b: number): number | null => (b > 0 ? round(a / b, 3) : null);
const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const count = <K extends string>(m: Map<K, number>, k: K, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
/** A City Day as its date (the boundary is 00:00 UTC). */
export const dayLabel = (day: DayKey): string => new Date(dayStart(day)).toISOString().slice(0, 10);

/**
 * A mission attempt is counted as **repeated with Again** when the same character's previous action
 * (any kind, in start order) was the same mission taken the same way, and this one started within
 * ten minutes of that one's result. Nothing stored says which button started a mission, so this is
 * inferred; a player who picks the same way from the ticket within ten minutes is counted too.
 */
export const AGAIN_WINDOW_MS = 10 * MIN;

/** The parts of a stored `ActionResult` the section reads: a structural subset, so a full result fits. */
export interface RiskResult {
  action?: { type?: string };
  mission?: { type: string; way: { id: string } };
  attempts?: Array<{ outcome?: string; dropped?: 'ran' | 'lost' | null }>;
  street?: {
    runIn?: { ironPaid: number } | null;
    heat?: { before: number; after: number } | null;
    record?: { added: number; escalated: boolean; before: RecordLevel; after: RecordLevel } | null;
    dropped?: 'ran' | 'lost' | null;
  };
  effects?: {
    fxp?: { before: number; after: number };
    opinion?: {
      applied: number;
      mode?: 'persuade' | 'against';
      targetFactionId?: string;
      capped?: boolean;
    } | null;
    heat?: { before: number; after: number } | null;
  };
}

export interface RiskCharacter {
  id: string;
  name: string;
  factionId: string;
  homeCityId: string;
  /** `record.marks` as stored (absent on a character migrated without it: []). */
  marks: Array<{ day: DayKey; kind: MarkKind; logId: string | null }>;
}

export interface RiskActionLog {
  characterId: string;
  createdAt: Date;
  kind: string;
  /** The action id, or the mission id for `kind: 'mission'`. */
  actionId: string;
  cityId: string;
  times: number;
  outcome: string;
  /** The run-in this row resolved (its day and start come from the encounter). */
  encounterId: string | null;
  result: RiskResult | null;
}

export interface RiskEncounter {
  id: string;
  characterId: string;
  kind: 'mission' | 'action';
  refId: string;
  cityId: string;
  day: DayKey;
  rivalGround: boolean;
  state: 'pending' | 'resolved';
  choice: 'fight' | 'run' | 'talk' | 'pay' | null;
  by: 'player' | 'luck' | 'auto' | null;
  outcome: 'won' | 'lost' | 'ran' | 'talked' | 'paid' | null;
  /** The opponent's price (the Iron paid off when the resolving row is missing). */
  payOff: number | null;
  createdAt: Date;
}

export interface RiskStay {
  characterId: string;
  kind: 'cells' | 'infirmary';
  cityId: string;
  rivalGround: boolean;
  since: Date;
  releasedAt: Date | null;
  /** Slice 6: `bailPosted`, out on a faction mate's bail (ADR 0041). */
  how: 'served' | 'bail' | 'walkOut' | 'discharge' | 'bailPosted' | null;
  ironPaid: number;
  heatAtArrest: number | null;
  heatAfter: number | null;
}

export interface RiskJourney {
  characterId: string;
  to: string;
  boardedAt: Date;
  kind: 'ticket' | 'deported';
  rivalGround: boolean;
  card: { eventId: string; deck: 'ordinary' | 'hostile' } | null;
  choice: {
    choiceId: string;
    at: Date;
    flag: 'watched' | 'warned' | null;
    heat: { before: number; after: number } | null;
  } | null;
  sleptThrough: boolean;
}

export interface RiskInput {
  /** The report's time: today's City Day, the open end of the Heat readings. */
  now: Date;
  /** Each faction's home city (content): a home city of another faction is rival ground. */
  homeCities: Array<{ cityId: string; factionId: string }>;
  characters: RiskCharacter[];
  actionLogs: RiskActionLog[];
  encounters: RiskEncounter[];
  stays: RiskStay[];
  journeys: RiskJourney[];
}

type Share = number | null;
type Where = 'rival ground' | 'home' | 'elsewhere';

export interface RiskReport {
  missions: {
    attempts: number;
    players: { active: number; tookOne: Share; legal: Share; illegal: Share };
    byDay: Array<{
      day: string;
      byType: Record<MissionType, number>;
      attempts: number;
      active: number;
      tookOne: Share;
      legal: Share;
      illegal: Share;
    }>;
    byType: Array<{
      type: string;
      attempts: number;
      success: Share;
      partial: Share;
      failure: Share;
      takenIn: number;
      infirmary: number;
      dropped: number;
      again: Share;
    }>;
  };
  runIns: {
    total: number;
    resolved: number;
    pending: number;
    perActivePlayer: number | null;
    byDay: Array<{
      day: string;
      runIns: number;
      players: number;
      active: number;
      perActivePlayer: number | null;
    }>;
    byPlayer: Array<{
      player: string;
      runIns: number;
      won: number;
      lost: number;
      away: number;
      auto: number;
    }>;
    choices: Array<{
      by: 'player' | 'luck' | 'auto';
      fight: number;
      run: number;
      talk: number;
      pay: number;
      total: number;
    }>;
    rates: { won: Share; lost: Share; away: Share };
    auto: { resolved: number; lost: Share };
    paidOff: { runIns: number; iron: number };
  };
  heat: {
    atMission: { missions: number; median: number | null; byState: Record<HeatState, number> };
    hotOrAbove: { players: number; hours: number; byPlayer: Array<{ player: string; hours: number }> };
  };
  record: {
    marksAdded: number;
    escalations: number;
    byPlayer: Array<{ player: string; added: number; onRecord: number; level: RecordLevel }>;
    levelRises: Array<{ from: RecordLevel; to: RecordLevel; times: number }>;
    fadesEstimated: number;
    /** Not in the five collections (request logs): always null. */
    strikeOffs: null;
  };
  held: Array<{
    kind: 'cells' | 'infirmary';
    stays: number;
    players: number;
    stillIn: number;
    served: number;
    bail: number;
    walkOut: number;
    discharge: number;
    medianMinutesServed: number | null;
    medianMinutesPaid: number | null;
    iron: number;
    bailIron: number;
    /** Of players whose first such stay's next City Day is over: those with any action that day. */
    cameBack: { players: number; of: number; share: Share };
  }>;
  rival: {
    trips: number;
    travellers: number;
    byCity: Array<{ city: string; trips: number }>;
    cards: Array<{ card: string; choice: string; times: number }>;
    flags: { watched: number; warned: number };
    partyXp: Array<{ where: Where; actions: number; partyXp: number; perAction: number | null }>;
    pressure: Array<{ city: string; day: string; lost: number; capReached: boolean }>;
    deportations: number;
  };
}

const HEAT_STATES: HeatState[] = ['cool', 'noticed', 'hot', 'wanted'];
const isMissionType = (t: string): t is MissionType => (MISSION_TYPE_IDS as readonly string[]).includes(t);

export function buildRiskReport(i: RiskInput): RiskReport {
  const now = i.now.getTime();
  const today = dayKey(now);
  const chars = new Map(i.characters.map((c) => [c.id, c]));
  const nameOf = (id: string) => chars.get(id)?.name ?? id;
  const homeFaction = new Map(i.homeCities.map((h) => [h.cityId, h.factionId]));
  const encounters = new Map(i.encounters.map((e) => [e.id, e]));

  // Each row's City Day and start: a run-in's row is written at its resolution, but belongs to the
  // run-in's day and started when the run-in did.
  const logs = i.actionLogs.map((l) => {
    const e = l.encounterId ? encounters.get(l.encounterId) : undefined;
    const r = l.result ?? {};
    const type = l.kind === 'mission' ? (r.mission?.type ?? r.action?.type ?? 'unknown') : null;
    return {
      ...l,
      r,
      day: e ? e.day : dayKey(l.createdAt.getTime()),
      start: e ? e.createdAt.getTime() : l.createdAt.getTime(),
      type,
      way: r.mission?.way.id ?? null,
    };
  });
  type Row = (typeof logs)[number];
  const where = (l: Row): Where => {
    const home = homeFaction.get(l.cityId);
    const faction = chars.get(l.characterId)?.factionId;
    if (!home || !faction) return 'elsewhere';
    return home === faction ? 'home' : 'rival ground';
  };
  const missions = logs.filter((l) => l.kind === 'mission');
  const activeIds = new Set(logs.map((l) => l.characterId));
  const activeOn = new Map<DayKey, Set<string>>();
  for (const l of logs) activeOn.set(l.day, (activeOn.get(l.day) ?? new Set()).add(l.characterId));
  const illegal = (t: string | null) => (t && isMissionType(t) ? MISSION_TYPES[t].illegal : false);
  const playersWith = (xs: Row[], legal?: boolean) =>
    new Set(xs.filter((l) => legal === undefined || illegal(l.type) !== legal).map((l) => l.characterId))
      .size;

  // Missions: per day, per type, the Again share.
  const days = [...new Set(missions.map((l) => l.day))].sort((a, b) => a - b);
  const byDay = days.map((d) => {
    const xs = missions.filter((l) => l.day === d);
    const active = activeOn.get(d)?.size ?? 0;
    const byType = Object.fromEntries(
      MISSION_TYPE_IDS.map((t) => [t, xs.filter((l) => l.type === t).length]),
    ) as Record<MissionType, number>;
    return {
      day: dayLabel(d),
      byType,
      attempts: xs.length,
      active,
      tookOne: share(playersWith(xs), active),
      legal: share(playersWith(xs, true), active),
      illegal: share(playersWith(xs, false), active),
    };
  });
  const repeated = new Set<Row>();
  const byChar = new Map<string, Row[]>();
  for (const l of logs) {
    const xs = byChar.get(l.characterId) ?? [];
    xs.push(l);
    byChar.set(l.characterId, xs);
  }
  for (const xs of byChar.values()) {
    xs.sort((a, b) => a.start - b.start);
    for (let k = 1; k < xs.length; k++) {
      const prev = xs[k - 1]!;
      const cur = xs[k]!;
      if (
        cur.kind === 'mission' &&
        prev.kind === 'mission' &&
        prev.actionId === cur.actionId &&
        prev.way !== null &&
        prev.way === cur.way &&
        cur.start - prev.createdAt.getTime() <= AGAIN_WINDOW_MS
      )
        repeated.add(cur);
    }
  }
  const types = [
    ...MISSION_TYPE_IDS,
    ...new Set(missions.map((l) => l.type!).filter((t) => !isMissionType(t))),
  ];
  const byType = types
    .map((t) => {
      const xs = missions.filter((l) => l.type === t);
      const check = (o: string) => xs.filter((l) => l.r.attempts?.[0]?.outcome === o).length;
      return {
        type: t,
        attempts: xs.length,
        success: share(check('success'), xs.length),
        partial: share(check('partial'), xs.length),
        failure: share(check('failure'), xs.length),
        takenIn: xs.filter((l) => l.outcome === 'takenIn').length,
        infirmary: xs.filter((l) => l.outcome === 'carriedOff').length,
        dropped: xs.filter((l) => (l.r.street?.dropped ?? l.r.attempts?.[0]?.dropped ?? null) !== null)
          .length,
        again: share(xs.filter((l) => repeated.has(l)).length, xs.length),
      };
    })
    .filter((x) => x.attempts > 0 || isMissionType(x.type));

  // Run-ins.
  const resolved = i.encounters.filter((e) => e.state === 'resolved' && e.outcome !== null);
  const away = (e: RiskEncounter) => e.outcome === 'ran' || e.outcome === 'talked' || e.outcome === 'paid';
  const runInDays = [...new Set(i.encounters.map((e) => e.day))].sort((a, b) => a - b);
  const runInPlayers = [...new Set(i.encounters.map((e) => e.characterId))];
  const ironOf = new Map<string, number>();
  for (const l of logs)
    if (l.encounterId && l.r.street?.runIn) ironOf.set(l.encounterId, l.r.street.runIn.ironPaid);
  const paid = resolved.map((e) => ironOf.get(e.id) ?? (e.outcome === 'paid' ? (e.payOff ?? 0) : 0));
  const autoResolved = resolved.filter((e) => e.by === 'auto');

  // Heat: at mission time, and the time spent Hot or above (approximated, see the header).
  const atMission = missions.flatMap((l) => (l.r.street?.heat ? [l.r.street.heat.before] : []));
  const byState = Object.fromEntries(HEAT_STATES.map((s) => [s, 0])) as Record<HeatState, number>;
  for (const h of atMission) byState[heatState(h)]++;
  const readings = new Map<string, Array<{ t: number; v: number }>>();
  const read = (id: string, t: number, v: number | null | undefined) => {
    if (v === null || v === undefined) return;
    const rs = readings.get(id) ?? [];
    rs.push({ t, v });
    readings.set(id, rs);
  };
  for (const l of logs)
    read(l.characterId, l.createdAt.getTime(), (l.r.street?.heat ?? l.r.effects?.heat)?.after);
  for (const j of i.journeys)
    if (j.choice?.heat) read(j.characterId, j.choice.at.getTime(), j.choice.heat.after);
  for (const s of i.stays) {
    read(s.characterId, s.since.getTime(), s.heatAtArrest);
    if (s.releasedAt) read(s.characterId, s.releasedAt.getTime(), s.heatAfter);
  }
  const hotHours = [...readings.entries()].map(([id, rs]) => {
    rs.sort((a, b) => a.t - b.t);
    let ms = 0;
    rs.forEach((x, k) => {
      if (x.v < HEAT.states.hot) return;
      const window = (rs[k + 1]?.t ?? Math.max(now, x.t)) - x.t;
      // A whole point lasts an hour ÷ 5, so Heat 50 is still Hot for one point's worth.
      ms += Math.min(window, ((x.v - HEAT.states.hot + 1) / HEAT.coolPerHour) * HOUR);
    });
    return {
      player: nameOf(id),
      hours: round(ms / HOUR, 1),
      reached: rs.some((x) => x.v >= HEAT.states.hot),
    };
  });

  // The record.
  const marked = missions.filter((l) => (l.r.street?.record?.added ?? 0) > 0);
  const rises = new Map<string, number>();
  for (const l of marked) {
    const rec = l.r.street!.record!;
    if (rec.before !== rec.after) count(rises, `${rec.before}|${rec.after}`);
  }
  let fades = 0;
  const recordRows = i.characters
    .map((c) => {
      const mine = marked.filter((l) => l.characterId === c.id);
      const rebuilt = mine.flatMap((l) => {
        const rec = l.r.street!.record!;
        const spec = l.type && isMissionType(l.type) ? MISSION_TYPES[l.type] : null;
        const kind: MarkKind = rec.escalated ? 'serious' : (spec?.markKind ?? 'minor');
        return Array.from({ length: rec.added }, () => ({ day: l.day, kind, logId: null }));
      });
      fades += rebuilt.length - liveMarks(rebuilt, today).length;
      const onRecord = liveMarks(c.marks, today).length;
      return { player: c.name, added: rebuilt.length, onRecord, level: recordLevel(onRecord) };
    })
    .filter((x) => x.added > 0 || x.onRecord > 0);

  // The cells and the infirmary.
  const held = (['cells', 'infirmary'] as const).map((kind) => {
    const xs = i.stays.filter((s) => s.kind === kind);
    const minutes = (s: RiskStay) => round((s.releasedAt!.getTime() - s.since.getTime()) / MIN, 1);
    const paidOut = xs.filter((s) => s.releasedAt && s.how !== null && s.how !== 'served');
    const first = new Map<string, RiskStay>();
    for (const s of [...xs].sort((a, b) => +a.since - +b.since))
      if (!first.has(s.characterId)) first.set(s.characterId, s);
    const due = [...first.values()].filter((s) => dayKey(s.since.getTime()) + 1 < today);
    const back = due.filter((s) => {
      const next = dayKey(s.since.getTime()) + 1;
      return logs.some((l) => l.characterId === s.characterId && dayKey(l.createdAt.getTime()) === next);
    }).length;
    return {
      kind,
      stays: xs.length,
      players: first.size,
      stillIn: xs.filter((s) => !s.releasedAt).length,
      served: xs.filter((s) => s.releasedAt && s.how === 'served').length,
      bail: xs.filter((s) => s.how === 'bail').length,
      walkOut: xs.filter((s) => s.how === 'walkOut').length,
      discharge: xs.filter((s) => s.how === 'discharge').length,
      medianMinutesServed: median(xs.filter((s) => s.releasedAt && s.how === 'served').map(minutes)),
      medianMinutesPaid: median(paidOut.map(minutes)),
      iron: xs.reduce((a, s) => a + s.ironPaid, 0),
      bailIron: xs.filter((s) => s.how === 'bail').reduce((a, s) => a + s.ironPaid, 0),
      cameBack: { players: back, of: due.length, share: share(back, due.length) },
    };
  });

  // Rival ground.
  const trips = i.journeys.filter((j) => j.rivalGround && j.kind !== 'deported');
  const tripsTo = new Map<string, number>();
  for (const j of trips) count(tripsTo, j.to);
  const cards = new Map<string, number>();
  for (const j of trips) {
    if (!j.card) continue;
    const choice = j.choice ? j.choice.choiceId : j.sleptThrough ? 'slept through' : 'not answered yet';
    count(cards, `${j.card.eventId} (${j.card.deck})|${choice}`);
  }
  const flags = { watched: 0, warned: 0 };
  for (const j of trips) if (j.choice?.flag) flags[j.choice.flag]++;
  const xpBy = new Map<Where, { actions: number; partyXp: number }>(
    (['rival ground', 'home', 'elsewhere'] as const).map((w) => [w, { actions: 0, partyXp: 0 }]),
  );
  for (const l of logs) {
    if (l.kind !== 'checked' && l.kind !== 'mission') continue;
    const x = xpBy.get(where(l))!;
    x.actions += l.times;
    x.partyXp += l.r.effects?.fxp ? l.r.effects.fxp.after - l.r.effects.fxp.before : 0;
  }
  const pressure = new Map<string, { lost: number; capped: boolean }>();
  for (const l of logs) {
    const op = l.r.effects?.opinion;
    if (where(l) !== 'rival ground' || !op || op.mode !== 'against') continue;
    if (op.targetFactionId !== homeFaction.get(l.cityId)) continue;
    const k = `${l.cityId}|${l.day}`;
    const p = pressure.get(k) ?? { lost: 0, capped: false };
    pressure.set(k, { lost: p.lost + op.applied, capped: p.capped || op.capped === true });
  }

  return {
    missions: {
      attempts: missions.length,
      players: {
        active: activeIds.size,
        tookOne: share(playersWith(missions), activeIds.size),
        legal: share(playersWith(missions, true), activeIds.size),
        illegal: share(playersWith(missions, false), activeIds.size),
      },
      byDay,
      byType,
    },
    runIns: {
      total: i.encounters.length,
      resolved: resolved.length,
      pending: i.encounters.filter((e) => e.state === 'pending').length,
      perActivePlayer: activeIds.size ? round(i.encounters.length / activeIds.size) : null,
      byDay: runInDays.map((d) => {
        const xs = i.encounters.filter((e) => e.day === d);
        const active = activeOn.get(d)?.size ?? 0;
        return {
          day: dayLabel(d),
          runIns: xs.length,
          players: new Set(xs.map((e) => e.characterId)).size,
          active,
          perActivePlayer: active ? round(xs.length / active) : null,
        };
      }),
      byPlayer: runInPlayers.map((id) => {
        const xs = i.encounters.filter((e) => e.characterId === id);
        return {
          player: nameOf(id),
          runIns: xs.length,
          won: xs.filter((e) => e.outcome === 'won').length,
          lost: xs.filter((e) => e.outcome === 'lost').length,
          away: xs.filter(away).length,
          auto: xs.filter((e) => e.by === 'auto').length,
        };
      }),
      choices: (['player', 'luck', 'auto'] as const).map((by) => {
        const xs = resolved.filter((e) => e.by === by);
        const n = (c: string) => xs.filter((e) => e.choice === c).length;
        return { by, fight: n('fight'), run: n('run'), talk: n('talk'), pay: n('pay'), total: xs.length };
      }),
      rates: {
        won: share(resolved.filter((e) => e.outcome === 'won').length, resolved.length),
        lost: share(resolved.filter((e) => e.outcome === 'lost').length, resolved.length),
        away: share(resolved.filter(away).length, resolved.length),
      },
      auto: {
        resolved: autoResolved.length,
        lost: share(autoResolved.filter((e) => e.outcome === 'lost').length, autoResolved.length),
      },
      paidOff: {
        runIns: resolved.filter((e) => e.outcome === 'paid').length,
        iron: paid.reduce((a, b) => a + b, 0),
      },
    },
    heat: {
      atMission: { missions: atMission.length, median: median(atMission), byState },
      hotOrAbove: {
        players: hotHours.filter((x) => x.reached).length,
        hours: round(
          hotHours.reduce((a, x) => a + x.hours, 0),
          1,
        ),
        byPlayer: hotHours.filter((x) => x.hours > 0).map(({ player, hours }) => ({ player, hours })),
      },
    },
    record: {
      marksAdded: marked.reduce((a, l) => a + l.r.street!.record!.added, 0),
      escalations: marked.filter((l) => l.r.street!.record!.escalated).length,
      byPlayer: recordRows,
      levelRises: [...rises.entries()].map(([k, times]) => {
        const [from, to] = k.split('|') as [RecordLevel, RecordLevel];
        return { from, to, times };
      }),
      fadesEstimated: fades,
      strikeOffs: null,
    },
    held,
    rival: {
      trips: trips.length,
      travellers: new Set(trips.map((j) => j.characterId)).size,
      byCity: [...tripsTo.entries()]
        .map(([city, n]) => ({ city, trips: n }))
        .sort((a, b) => b.trips - a.trips),
      cards: [...cards.entries()]
        .map(([k, times]) => {
          const [card, choice] = k.split('|') as [string, string];
          return { card, choice, times };
        })
        .sort((a, b) => a.card.localeCompare(b.card) || b.times - a.times),
      flags,
      partyXp: [...xpBy.entries()].map(([w, x]) => ({
        where: w,
        actions: x.actions,
        partyXp: x.partyXp,
        perAction: x.actions ? round(x.partyXp / x.actions, 1) : null,
      })),
      pressure: [...pressure.entries()]
        .map(([k, p]) => {
          const [city, day] = k.split('|') as [string, string];
          return {
            city,
            day: dayLabel(Number(day)),
            lost: round(p.lost, 2),
            capReached: p.capped || p.lost >= RIVAL_GROUND.pressureCapPerDay - 1e-9,
          };
        })
        .sort((a, b) => a.day.localeCompare(b.day) || a.city.localeCompare(b.city)),
      deportations: i.journeys.filter((j) => j.kind === 'deported').length,
    },
  };
}

/** One printed table: a title, and its rows (none: the script prints *none*). */
export interface RiskTable {
  title: string;
  rows: Array<Record<string, string | number>>;
}

const LEVEL_WORDS: Record<RecordLevel, string> = {
  clean: 'Clean',
  onFile: 'On file',
  repeat: 'Repeat offender',
  notorious: 'Notorious',
};
const TYPE_WORDS: Record<string, string> = {
  speech: 'Speech',
  surveillance: 'Watch and listen',
  vandalism: 'Vandalism',
  disruption: 'Disruption',
  sabotage: 'Sabotage',
  theft: 'Theft',
};
const BY_WORDS = {
  player: 'chosen by the player',
  luck: 'Leave it to luck',
  auto: 'left to luck (no answer)',
} as const;
const WHERE_WORDS: Record<Where, string> = {
  'rival ground': 'on rival ground',
  home: 'in your own home city',
  elsewhere: 'elsewhere (the capital)',
};
const num = (x: number | null) => (x === null ? '–' : x);

/** The section as printable tables, labels in plain words. */
export function riskTables(r: RiskReport): RiskTable[] {
  const m = r.missions;
  const ri = r.runIns;
  return [
    {
      title: 'Missions: overall',
      rows: [
        {
          'mission attempts': m.attempts,
          'active players': m.players.active,
          'took a mission': formatShare(m.players.tookOne),
          'took a legal one': formatShare(m.players.legal),
          'took an illegal one': formatShare(m.players.illegal),
        },
      ],
    },
    {
      title: 'Missions per day (by type; shares are of the players active that day)',
      rows: m.byDay.map((d) => ({
        day: d.day,
        ...Object.fromEntries(Object.entries(d.byType).map(([t, n]) => [TYPE_WORDS[t] ?? t, n])),
        all: d.attempts,
        'active players': d.active,
        'took a mission': formatShare(d.tookOne),
        legal: formatShare(d.legal),
        illegal: formatShare(d.illegal),
      })),
    },
    {
      title: 'Missions by type (the check’s result; repeats with Again are inferred)',
      rows: m.byType.map((t) => ({
        type: TYPE_WORDS[t.type] ?? t.type,
        attempts: t.attempts,
        success: formatShare(t.success),
        partial: formatShare(t.partial),
        failure: formatShare(t.failure),
        'taken in': t.takenIn,
        'to the infirmary': t.infirmary,
        'dropped (ran or lost)': t.dropped,
        'repeated with Again': formatShare(t.again),
      })),
    },
    {
      title: 'Run-ins: overall',
      rows: [
        {
          'run-ins': ri.total,
          resolved: ri.resolved,
          'still waiting for a choice': ri.pending,
          'per active player': num(ri.perActivePlayer),
          won: formatShare(ri.rates.won),
          lost: formatShare(ri.rates.lost),
          'got away (ran, talked or paid)': formatShare(ri.rates.away),
          'left to luck (no answer)': ri.auto.resolved,
          'lost when left to luck (no answer)': formatShare(ri.auto.lost),
          'paid off': ri.paidOff.runIns,
          'Iron paid off': ri.paidOff.iron,
        },
      ],
    },
    {
      title: 'Run-ins per day',
      rows: ri.byDay.map((d) => ({
        day: d.day,
        'run-ins': d.runIns,
        players: d.players,
        'active players': d.active,
        'per active player': num(d.perActivePlayer),
      })),
    },
    {
      title: 'Run-ins per player',
      rows: ri.byPlayer.map((p) => ({
        player: p.player,
        'run-ins': p.runIns,
        won: p.won,
        lost: p.lost,
        'got away': p.away,
        'left to luck (no answer)': p.auto,
      })),
    },
    {
      title: 'Run-in choices',
      rows: ri.choices.map((c) => ({
        'how it was decided': BY_WORDS[c.by],
        fight: c.fight,
        run: c.run,
        talk: c.talk,
        'pay them off': c.pay,
        all: c.total,
      })),
    },
    {
      title: 'Heat at mission time (before the mission)',
      rows: [
        {
          missions: r.heat.atMission.missions,
          median: num(r.heat.atMission.median),
          'Cool (0–24)': r.heat.atMission.byState.cool,
          'Noticed (25–49)': r.heat.atMission.byState.noticed,
          'Hot (50–74)': r.heat.atMission.byState.hot,
          'Wanted (75+)': r.heat.atMission.byState.wanted,
        },
      ],
    },
    {
      title: 'Time spent Hot or above (approximate: cooling at 5 an hour from each stored reading)',
      rows: [
        {
          'players who reached Hot': r.heat.hotOrAbove.players,
          'hours, all players': r.heat.hotOrAbove.hours,
        },
        ...r.heat.hotOrAbove.byPlayer.map((p) => ({ player: p.player, hours: p.hours })),
      ],
    },
    {
      title: 'The record',
      rows: [
        {
          'marks added': r.record.marksAdded,
          'escalated arrests': r.record.escalations,
          'fades (estimated, as if nothing was struck off)': r.record.fadesEstimated,
          'struck off': 'not recorded',
          'levels going down': 'not recorded',
        },
      ],
    },
    {
      title: 'Marks per player',
      rows: r.record.byPlayer.map((p) => ({
        player: p.player,
        'marks added': p.added,
        'on the record now': p.onRecord,
        level: LEVEL_WORDS[p.level],
      })),
    },
    {
      title: 'Record level rises',
      rows: r.record.levelRises.map((x) => ({
        from: LEVEL_WORDS[x.from],
        to: LEVEL_WORDS[x.to],
        times: x.times,
      })),
    },
    {
      title: 'The cells and the infirmary (minutes spent; came back = any action the next City Day)',
      rows: r.held.map((h) => ({
        where: h.kind === 'cells' ? 'the cells' : 'the infirmary',
        stays: h.stays,
        players: h.players,
        'still in': h.stillIn,
        'waited it out': h.served,
        bail: h.bail,
        'walked out': h.walkOut,
        discharged: h.discharge,
        'minutes when waited (median)': num(h.medianMinutesServed),
        'minutes when paid (median)': num(h.medianMinutesPaid),
        'Iron spent': h.iron,
        'of which bail': h.bailIron,
        'came back next day': `${formatShare(h.cameBack.share)} (${h.cameBack.players} of ${h.cameBack.of})`,
      })),
    },
    {
      title: 'Rival ground: overall',
      rows: [
        {
          trips: r.rival.trips,
          travellers: r.rival.travellers,
          'flags: watched': r.rival.flags.watched,
          'flags: warned': r.rival.flags.warned,
          'put on the train home': r.rival.deportations,
        },
      ],
    },
    {
      title: 'Rival ground: trips per city',
      rows: r.rival.byCity.map((c) => ({ city: c.city, trips: c.trips })),
    },
    {
      title: 'Rival ground: journey cards and choices',
      rows: r.rival.cards.map((c) => ({ card: c.card, choice: c.choice, times: c.times })),
    },
    {
      title: 'Party XP by where it was earned (checked actions and missions)',
      rows: r.rival.partyXp.map((x) => ({
        where: WHERE_WORDS[x.where],
        actions: x.actions,
        'Party XP': x.partyXp,
        'per action': num(x.perAction),
      })),
    },
    {
      title: `Pressure on home cities (points lost to rivals per day; the cap is ${RIVAL_GROUND.pressureCapPerDay})`,
      rows: r.rival.pressure.map((p) => ({
        city: p.city,
        day: p.day,
        'points lost': p.lost,
        'cap reached': p.capReached ? 'yes' : 'no',
      })),
    },
  ];
}
