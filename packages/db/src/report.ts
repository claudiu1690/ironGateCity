/**
 * The slice-1 playtest report (tech design §14): pure maths over rows read from the database, so
 * it is testable without one. "Is spending a bar of Energy fun, and do players want to come back in
 * 3 hours?" — sessions, returns, ×3 use, the paper, orders, shifts, levels and contention.
 */

export interface ReportAction {
  characterId: string;
  createdAt: Date;
  kind: 'checked' | 'training' | 'shift' | 'chapter';
  times: number;
  txAttempts: number;
  /** Energy spent by the row (before − after). */
  energy: number;
  /** Level after the action. */
  level: number;
  /** Party orders this action completed. */
  ordersCompleted: number;
}

export interface ReportPaper {
  characterId: string;
  day: number;
  read: boolean;
}

export interface ReportCharacter {
  id: string;
  name: string;
  createdAt: Date;
}

export interface PlayerReport {
  id: string;
  name: string;
  actions: number;
  daysActive: number;
  sessions: number;
  sessionsPerDay: number;
  energyPerSession: number;
  /** Median gap between sessions, hours. */
  medianReturnHours: number | null;
  /** Share of returns 2–4 h after the previous session ended. */
  returns2to4h: number | null;
  x3Share: number;
  paperReadRate: number | null;
  ordersPerDay: number;
  shiftsPerDay: number;
  /** Highest level reached within 1, 2 and 3 days of signing up. */
  levelByDay: [number, number, number];
}

export interface PlaytestReport {
  players: PlayerReport[];
  overall: {
    players: number;
    actions: number;
    sessionsPerDay: number;
    energyPerSession: number;
    medianReturnHours: number | null;
    returns2to4h: number | null;
    x3Share: number;
    paperReadRate: number | null;
    ordersPerDay: number;
    shiftsPerDay: number;
    /** Share of action transactions that ran more than once (ADR 0010). */
    contendedTransactions: number;
  };
}

/** A gap of 30 minutes or more starts a new session. */
export const SESSION_GAP_MS = 30 * 60_000;
const DAY_MS = 86_400_000;
const H = 3_600_000;

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

interface Session {
  start: number;
  end: number;
  energy: number;
}

function sessionsOf(actions: ReportAction[]): Session[] {
  const sorted = [...actions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const out: Session[] = [];
  for (const a of sorted) {
    const t = a.createdAt.getTime();
    const last = out.at(-1);
    if (last && t - last.end < SESSION_GAP_MS) {
      last.end = t;
      last.energy += a.energy;
    } else out.push({ start: t, end: t, energy: a.energy });
  }
  return out;
}

export function buildPlaytestReport(
  characters: ReportCharacter[],
  actions: ReportAction[],
  papers: ReportPaper[],
): PlaytestReport {
  const allGaps: number[] = [];
  let allSessions = 0;
  let allEnergy = 0;
  let allDays = 0;
  let allOrders = 0;
  let allShifts = 0;

  const players = characters.map((c): PlayerReport => {
    const mine = actions.filter((a) => a.characterId === c.id);
    const sessions = sessionsOf(mine);
    const gaps = sessions.slice(1).map((s, i) => s.start - sessions[i]!.end);
    const days = new Set(mine.map((a) => Math.floor(a.createdAt.getTime() / DAY_MS))).size;
    const myPapers = papers.filter((p) => p.characterId === c.id);
    const energy = sessions.reduce((s, x) => s + x.energy, 0);
    const orders = mine.reduce((s, a) => s + a.ordersCompleted, 0);
    const shifts = mine.filter((a) => a.kind === 'shift').length;
    const levelBy = (n: number) =>
      mine
        .filter((a) => a.createdAt.getTime() - c.createdAt.getTime() < n * DAY_MS)
        .reduce((l, a) => Math.max(l, a.level), 1);

    allGaps.push(...gaps);
    allSessions += sessions.length;
    allEnergy += energy;
    allDays += days;
    allOrders += orders;
    allShifts += shifts;

    return {
      id: c.id,
      name: c.name,
      actions: mine.length,
      daysActive: days,
      sessions: sessions.length,
      sessionsPerDay: round(ratio(sessions.length, days)),
      energyPerSession: round(ratio(energy, sessions.length), 1),
      medianReturnHours: gaps.length ? round(median(gaps)! / H) : null,
      returns2to4h: gaps.length
        ? round(ratio(gaps.filter((g) => g >= 2 * H && g <= 4 * H).length, gaps.length))
        : null,
      x3Share: round(ratio(mine.filter((a) => a.times > 1).length, mine.length)),
      paperReadRate: myPapers.length
        ? round(ratio(myPapers.filter((p) => p.read).length, myPapers.length))
        : null,
      ordersPerDay: round(ratio(orders, days)),
      shiftsPerDay: round(ratio(shifts, days)),
      levelByDay: [levelBy(1), levelBy(2), levelBy(3)],
    };
  });

  return {
    players,
    overall: {
      players: characters.length,
      actions: actions.length,
      sessionsPerDay: round(ratio(allSessions, allDays)),
      energyPerSession: round(ratio(allEnergy, allSessions), 1),
      medianReturnHours: allGaps.length ? round(median(allGaps)! / H) : null,
      returns2to4h: allGaps.length
        ? round(ratio(allGaps.filter((g) => g >= 2 * H && g <= 4 * H).length, allGaps.length))
        : null,
      x3Share: round(ratio(actions.filter((a) => a.times > 1).length, actions.length)),
      paperReadRate: papers.length ? round(ratio(papers.filter((p) => p.read).length, papers.length)) : null,
      ordersPerDay: round(ratio(allOrders, allDays)),
      shiftsPerDay: round(ratio(allShifts, allDays)),
      contendedTransactions: round(ratio(actions.filter((a) => a.txAttempts > 1).length, actions.length), 3),
    },
  };
}
