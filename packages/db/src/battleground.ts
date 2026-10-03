/**
 * The slice-4 playtest report (tech design §15.2, design §17 Q12): "do players choose to move to the
 * capital, and does the three-way fight feel alive?" Pure maths over rows read from the domain
 * collections (journeys, districts, elections, issues, the ledger, contributions, awards, action
 * logs), so it is testable without a database. Moves and rooms come from request logs, which expire
 * after seven days (run it within a week); the residents per district come from the characters. No
 * row puts a voter next to a candidate (ADR 0019).
 */

const DAY_MS = 86_400_000;
const MIN = 60_000;
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const dayOf = (d: Date) => Math.floor(d.getTime() / DAY_MS);
/** Dwell (§15.2): a journey closed within two minutes of its arrival waited for it (or came back on time). */
export const DWELL_MS = 2 * MIN;

export type Faction = 'vanguard' | 'collective' | 'alliance';

export interface BgCharacter {
  id: string;
  name: string;
  homeCityId: string;
  createdAt: Date;
  /** The first action at Level 10 or more (null: not yet). */
  level10At: Date | null;
  /** The first action at Rank 2 or more (null: not yet). */
  rank2At: Date | null;
  residence: { cityId: string; districtId: string | null };
  boosted: boolean;
}

export interface BgJourney {
  characterId: string;
  from: string;
  to: string;
  boardedAt: Date;
  arrivesAt: Date;
  closedAt: Date | null;
  card: boolean;
  /** When the card was answered (null: not answered). */
  choiceAt: Date | null;
  sleptThrough: boolean;
}

export interface BgMove {
  characterId: string;
  at: Date;
  cityId: string;
  districtId: string | null;
}

export interface BgRoom {
  characterId: string;
  at: Date;
}

export interface BgDistrictElection {
  districtId: string;
  cycle: number;
  ballots: number;
  w: number;
  turnout: { voters: number; eligible: number };
  seats: Array<{ factionId: Faction; kind: 'player' | 'npc' }>;
  tie: 'draw' | null;
}

export interface BgCouncil {
  councilKey: string;
  passed: string | null;
  /** The parties of the councillors who voted for the motion that passed (a coalition). */
  coalition: Faction[];
}

export interface BgDistrictLog {
  districtId: string;
  log: Array<{ day: number; battleground: boolean; controlledBy: Faction | null }>;
}

export interface BgIssue {
  cityId: string;
  weekDay: number;
  issueId: string;
  status: 'live' | 'owned' | 'lapsed';
  momentum: Record<Faction, number>;
  ownerId: Faction | null;
  top: number;
  effect: boolean;
}

export interface BgLedgerRow {
  placeId: string;
  cycleKey: string;
  kind: 'action' | 'journey' | 'issue' | 'drift' | 'ballot' | 'seat' | 'noVoter';
  /** Thousandths of a point, signed. */
  swing: number;
}

export interface BgContribution {
  placeId: string;
  ref: string;
  kind: 'influence' | 'points';
}

export interface BgHero {
  placeId: string;
  ref: string;
  bracket: 1 | 2 | 3 | null;
}

export interface BgAction {
  cityId: string;
  /** The district whose meter the action moved (the capital), else null. */
  districtId: string | null;
  txAttempts: number;
  createdAt: Date;
}

export interface BattlegroundInput {
  capitalId: string;
  districts: Array<{ id: string; name: string }>;
  characters: BgCharacter[];
  journeys: BgJourney[];
  moves: BgMove[];
  rooms: BgRoom[];
  elections: BgDistrictElection[];
  councils: BgCouncil[];
  districtLogs: BgDistrictLog[];
  issues: BgIssue[];
  ledger: BgLedgerRow[];
  contributions: BgContribution[];
  heroes: BgHero[];
  actions: BgAction[];
  /** Actions before this instant count as "before slice 4" for the contention line. */
  slice4From: Date | null;
}

export interface BattlegroundReport {
  travel: {
    journeys: number;
    travellers: number;
    journeysPerTravellerDay: number;
    legs: Array<{ leg: string; journeys: number }>;
    cards: { drawn: number; answeredOnTheWay: number; answeredOnArrival: number; sleptThrough: number };
    /** Of closed journeys: closed within two minutes of arrival (waited) and later (closed the game). */
    dwell: { waited: number; later: number; waitedShare: number | null };
    /** Of answered cards: answered before the train arrived. */
    answeredBeforeArrival: number | null;
    /** Days from Level 10 to the first trip, per traveller. */
    firstTripDaysAfterLevel10: { median: number | null; values: number[] };
  };
  residence: {
    movers: number;
    firstMoveDay: { median: number | null; afterLevel10: number | null; afterRank2: number | null };
    movesBackHome: number;
    rooms: number;
    residents: Array<{ districtId: string; name: string; residents: number }>;
  };
  counts: Array<{
    district: string;
    cycle: number;
    ballots: number;
    w: number;
    turnout: string;
    seats: string;
    tie: boolean;
  }>;
  councils: Array<{ councilKey: string; passed: string | null; coalition: string }>;
  states: Array<{ district: string; closeRaceDays: number; groundswellStarts: number; controlChanges: number }>;
  issues: Array<{
    city: string;
    week: number;
    issue: string;
    vanguard: number;
    collective: number;
    alliance: number;
    outcome: string;
    topFive: number;
    effect: boolean;
  }>;
  ledger: {
    contributors: Array<{ district: string; cycle: string; contributors: number }>;
    heroes: Array<{ district: string; cycle: string; bracket1: number; bracket2: number; bracket3: number }>;
    /** Share of the capital's opinion moved (absolute) by each source. */
    movedBy: { actions: number; cards: number; issues: number; drift: number };
  };
  contention: {
    capital: Array<{ district: string; actions: number; contended: number }>;
    home: { before: number | null; after: number | null };
  };
}

export function buildBattlegroundReport(i: BattlegroundInput): BattlegroundReport {
  const nameOf = (id: string) => i.districts.find((d) => d.id === id)?.name ?? id;
  const characters = new Map(i.characters.map((c) => [c.id, c]));
  const real = (id: string) => !characters.get(id)?.boosted;

  // Travel.
  const journeys = i.journeys.filter((j) => real(j.characterId));
  const travellers = new Set(journeys.map((j) => j.characterId));
  const travelDays = new Set(journeys.map((j) => `${j.characterId}:${dayOf(j.boardedAt)}`)).size;
  const legs = new Map<string, number>();
  for (const j of journeys) legs.set(`${j.from} → ${j.to}`, (legs.get(`${j.from} → ${j.to}`) ?? 0) + 1);
  const drawn = journeys.filter((j) => j.card);
  const answered = drawn.filter((j) => j.choiceAt);
  const onTheWay = answered.filter((j) => j.choiceAt!.getTime() < j.arrivesAt.getTime()).length;
  const closed = journeys.filter((j) => j.closedAt);
  const waited = closed.filter((j) => j.closedAt!.getTime() - j.arrivesAt.getTime() <= DWELL_MS).length;
  const firstTrip: number[] = [];
  for (const id of travellers) {
    const c = characters.get(id);
    const first = journeys.filter((j) => j.characterId === id).sort((a, b) => +a.boardedAt - +b.boardedAt)[0];
    if (c?.level10At && first) firstTrip.push(round((+first.boardedAt - +c.level10At) / DAY_MS, 1));
  }

  // Residence.
  const moves = i.moves.filter((m) => real(m.characterId)).sort((a, b) => +a.at - +b.at);
  const firstMove = new Map<string, BgMove>();
  for (const m of moves) if (!firstMove.has(m.characterId)) firstMove.set(m.characterId, m);
  const since = (field: 'createdAt' | 'level10At' | 'rank2At') =>
    median(
      [...firstMove.values()].flatMap((m) => {
        const c = characters.get(m.characterId);
        const from = c?.[field];
        return from ? [round((+m.at - +from) / DAY_MS, 1)] : [];
      }),
    );
  const residents = i.districts.map((d) => ({
    districtId: d.id,
    name: d.name,
    residents: i.characters.filter((c) => c.residence.districtId === d.id && !c.boosted).length,
  }));

  // The capital's counts and councils.
  const counts = [...i.elections]
    .sort((a, b) => a.cycle - b.cycle || a.districtId.localeCompare(b.districtId))
    .map((e) => ({
      district: nameOf(e.districtId),
      cycle: e.cycle,
      ballots: e.ballots,
      w: round(e.w, 1),
      turnout: `${e.turnout.voters} of ${e.turnout.eligible}`,
      seats: e.seats.map((s) => `${s.factionId}${s.kind === 'npc' ? ' (local)' : ' (player)'}`).join(', '),
      tie: e.tie === 'draw',
    }));
  const councils = i.councils.map((c) => ({
    councilKey: c.councilKey,
    passed: c.passed,
    coalition: c.passed ? [...new Set(c.coalition)].sort().join(' + ') || 'one party' : '—',
  }));

  // States: close-race days, Groundswell starts (control lost), control changes.
  const states = i.districtLogs.map((d) => {
    const log = [...d.log].sort((a, b) => a.day - b.day);
    let starts = 0;
    let changes = 0;
    for (let k = 1; k < log.length; k++) {
      const was = log[k - 1]!.controlledBy;
      const now = log[k]!.controlledBy;
      if (was !== now) changes++;
      if (was !== null && now !== was) starts++;
    }
    return {
      district: nameOf(d.districtId),
      closeRaceDays: log.filter((x) => x.battleground).length,
      groundswellStarts: starts,
      controlChanges: changes,
    };
  });

  // Issues.
  const issues = [...i.issues]
    .sort((a, b) => a.weekDay - b.weekDay || a.cityId.localeCompare(b.cityId))
    .map((x) => ({
      city: x.cityId,
      week: x.weekDay,
      issue: x.issueId,
      ...x.momentum,
      outcome: x.status === 'live' ? 'live' : x.status === 'lapsed' ? 'lapsed' : `owned by ${x.ownerId}`,
      topFive: x.top,
      effect: x.effect,
    }));

  // The ledger: contributors and heroes per district and cycle; who moved the capital.
  const capitalPlaces = new Set(i.districts.map((d) => d.id));
  const contributorsBy = new Map<string, number>();
  for (const c of i.contributions)
    if (c.kind === 'influence' && capitalPlaces.has(c.placeId))
      contributorsBy.set(`${c.placeId}|${c.ref}`, (contributorsBy.get(`${c.placeId}|${c.ref}`) ?? 0) + 1);
  const heroesBy = new Map<string, [number, number, number]>();
  for (const h of i.heroes) {
    const k = `${h.placeId}|${h.ref}`;
    const v = heroesBy.get(k) ?? [0, 0, 0];
    if (h.bracket) v[h.bracket - 1] = v[h.bracket - 1]! + 1;
    heroesBy.set(k, v);
  }
  const moved = { actions: 0, cards: 0, issues: 0, drift: 0 };
  for (const r of i.ledger) {
    if (!capitalPlaces.has(r.placeId)) continue;
    const a = Math.abs(r.swing);
    if (r.kind === 'action') moved.actions += a;
    else if (r.kind === 'journey') moved.cards += a;
    else if (r.kind === 'issue') moved.issues += a;
    else if (r.kind === 'drift') moved.drift += a;
  }
  const total = moved.actions + moved.cards + moved.issues + moved.drift;

  // Contention: the capital's actions by district, the home cities' before and after slice 4.
  const capitalActions = i.actions.filter((a) => a.cityId === i.capitalId);
  const contended = (xs: BgAction[]) => (xs.length ? round(ratio(xs.filter((a) => a.txAttempts > 1).length, xs.length), 3) : null);
  const home = i.actions.filter((a) => a.cityId !== i.capitalId);
  const cut = i.slice4From?.getTime() ?? null;

  return {
    travel: {
      journeys: journeys.length,
      travellers: travellers.size,
      journeysPerTravellerDay: round(ratio(journeys.length, travelDays)),
      legs: [...legs.entries()].map(([leg, n]) => ({ leg, journeys: n })).sort((a, b) => b.journeys - a.journeys),
      cards: {
        drawn: drawn.length,
        answeredOnTheWay: onTheWay,
        answeredOnArrival: answered.length - onTheWay,
        sleptThrough: journeys.filter((j) => j.sleptThrough).length,
      },
      dwell: { waited, later: closed.length - waited, waitedShare: closed.length ? round(ratio(waited, closed.length)) : null },
      answeredBeforeArrival: answered.length ? round(ratio(onTheWay, answered.length)) : null,
      firstTripDaysAfterLevel10: { median: median(firstTrip), values: firstTrip },
    },
    residence: {
      movers: firstMove.size,
      firstMoveDay: { median: since('createdAt'), afterLevel10: since('level10At'), afterRank2: since('rank2At') },
      movesBackHome: moves.filter((m) => m.cityId === characters.get(m.characterId)?.homeCityId).length,
      rooms: i.rooms.filter((r) => real(r.characterId)).length,
      residents,
    },
    counts,
    councils,
    states,
    issues,
    ledger: {
      contributors: [...contributorsBy.entries()].map(([k, n]) => {
        const [placeId, cycle] = k.split('|');
        return { district: nameOf(placeId!), cycle: cycle!, contributors: n };
      }),
      heroes: [...heroesBy.entries()].map(([k, v]) => {
        const [placeId, cycle] = k.split('|');
        return { district: nameOf(placeId!), cycle: cycle!, bracket1: v[0], bracket2: v[1], bracket3: v[2] };
      }),
      movedBy: {
        actions: round(ratio(moved.actions, total)),
        cards: round(ratio(moved.cards, total)),
        issues: round(ratio(moved.issues, total)),
        drift: round(ratio(moved.drift, total)),
      },
    },
    contention: {
      capital: i.districts.map((d) => {
        const xs = capitalActions.filter((a) => a.districtId === d.id);
        return { district: d.name, actions: xs.length, contended: contended(xs) ?? 0 };
      }),
      home: {
        before: cut === null ? null : contended(home.filter((a) => +a.createdAt < cut)),
        after: contended(cut === null ? home : home.filter((a) => +a.createdAt >= cut)),
      },
    },
  };
}
