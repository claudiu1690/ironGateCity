/**
 * The slice-2 playtest report's arrival funnel (tech design §14.1): does a brand-new player
 * understand what to do in the first ten minutes? Pure maths over rows read from the database.
 * Where players stop is where the game failed to explain itself.
 */

export interface FunnelArrival {
  userId: string;
  createdAt: Date;
  hasFace: boolean;
  /** When each answer was given, in order. */
  answeredAt: Date[];
  completedAt: Date | null;
  factionId: string | null;
  characterId: string | null;
}

export interface FunnelAction {
  characterId: string;
  createdAt: Date;
  /**
   * `job`: a job taken (a `job.take` request log, not an action log; QA m2). It completes the
   * "Take a job" order, but it is not a tap on a ticket, so it is never the first or second action.
   */
  kind: 'checked' | 'training' | 'shift' | 'chapter' | 'job';
  /** The action, or the job for `job`. */
  actionId: string;
  /** Party orders this action completed. */
  ordersCompleted: number;
  /** True when this action completed the third order of the day. */
  allOrdersDone: boolean;
}

export interface FunnelCharacter {
  id: string;
  factionId: string;
  /** The join. */
  createdAt: Date;
  /** The City Day the current job was taken, or null (a job taken on day 1 and switched later shows
   * the later day: the `job` rows count the take itself). */
  jobSinceDay: number | null;
  /** The welcome set's slot-A action (the first pin's canvass). */
  welcomeActionId: string;
}

export interface FunnelStep {
  step: string;
  players: number;
}

export interface Funnel {
  steps: FunnelStep[];
  /** Median and 75th percentile, in seconds. */
  times: Record<
    'signupToJoin' | 'joinToFirstAction' | 'joinToAllOrders' | 'joinToChapter',
    { median: number | null; p75: number | null }
  >;
  /** Share (0–1) of players whose first action is the welcome order A's (the open sheet worked). */
  firstActionMatch: number | null;
  /** Share (0–1) whose second tap repeats the first within two minutes (Again from the modal). */
  secondTapAgain: number | null;
  /** Arrivals with a gap of more than 10 minutes between two answers that still joined. */
  resumes: number;
}

const DAY_MS = 86_400_000;
const dayOf = (d: Date) => Math.floor(d.getTime() / DAY_MS);
const pct = (xs: number[], q: number): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]!;
};
const stat = (xs: number[]) => ({ median: pct(xs, 0.5), p75: pct(xs, 0.75) });
const secs = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 1000);
const share = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) / 100 : null);

export function buildArrivalFunnel(
  arrivals: FunnelArrival[],
  characters: FunnelCharacter[],
  actions: FunnelAction[],
): Funnel {
  const byId = new Map(characters.map((c) => [c.id, c]));
  const actionsOf = (id: string) =>
    actions.filter((a) => a.characterId === id).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const joined = arrivals.filter((a) => a.completedAt && a.characterId && byId.has(a.characterId));
  const count = (f: (a: FunnelArrival, c: FunnelCharacter | undefined, acts: FunnelAction[]) => boolean) =>
    arrivals.filter((a) => {
      const c = a.characterId ? byId.get(a.characterId) : undefined;
      return f(a, c, c ? actionsOf(c.id) : []);
    }).length;
  const day1 = (c: FunnelCharacter, a: FunnelAction) => dayOf(a.createdAt) === dayOf(c.createdAt);
  /** A tap on a ticket: not a chapter, not a job taken. */
  const tap = (a: FunnelAction) => a.kind !== 'chapter' && a.kind !== 'job';

  const steps: FunnelStep[] = [
    { step: 'accounts', players: arrivals.length },
    { step: 'face', players: count((a) => a.hasFace) },
    ...[1, 2, 3, 4, 5, 6].map((n) => ({
      step: `answer ${n}`,
      players: count((a) => a.answeredAt.length >= n),
    })),
    { step: 'joined', players: joined.length },
    { step: 'first action', players: count((_a, c, acts) => !!c && acts.some(tap)) },
    ...[1, 2, 3].map((n) => ({
      step: `welcome orders ${n} / 3 on day 1`,
      players: count(
        (_a, c, acts) =>
          !!c && acts.filter((x) => day1(c, x)).reduce((s, x) => s + x.ordersCompleted, 0) >= n,
      ),
    })),
    {
      step: 'job taken on day 1',
      players: count(
        (_a, c, acts) =>
          !!c && (c.jobSinceDay === dayOf(c.createdAt) || acts.some((x) => x.kind === 'job' && day1(c, x))),
      ),
    },
    {
      step: 'chapter 1 done on day 1',
      players: count((_a, c, acts) => !!c && acts.some((x) => x.kind === 'chapter' && day1(c, x))),
    },
  ];

  const signupToJoin: number[] = [];
  const joinToFirstAction: number[] = [];
  const joinToAllOrders: number[] = [];
  const joinToChapter: number[] = [];
  let firstMatches = 0;
  let firsts = 0;
  let agains = 0;
  let seconds = 0;
  for (const a of joined) {
    const c = byId.get(a.characterId!)!;
    signupToJoin.push(secs(a.createdAt, a.completedAt!));
    const acts = actionsOf(c.id).filter(tap);
    const first = acts[0];
    if (first) {
      joinToFirstAction.push(secs(c.createdAt, first.createdAt));
      firsts += 1;
      if (first.actionId === c.welcomeActionId) firstMatches += 1;
      const second = acts[1];
      if (second) {
        seconds += 1;
        if (
          second.actionId === first.actionId &&
          second.createdAt.getTime() - first.createdAt.getTime() < 120_000
        )
          agains += 1;
      }
    }
    const all = actionsOf(c.id).find((x) => x.allOrdersDone && day1(c, x));
    if (all) joinToAllOrders.push(secs(c.createdAt, all.createdAt));
    const chapter = actionsOf(c.id).find((x) => x.kind === 'chapter');
    if (chapter) joinToChapter.push(secs(c.createdAt, chapter.createdAt));
  }

  const resumes = joined.filter((a) =>
    a.answeredAt.some((t, i) => i > 0 && t.getTime() - a.answeredAt[i - 1]!.getTime() > 10 * 60_000),
  ).length;

  return {
    steps,
    times: {
      signupToJoin: stat(signupToJoin),
      joinToFirstAction: stat(joinToFirstAction),
      joinToAllOrders: stat(joinToAllOrders),
      joinToChapter: stat(joinToChapter),
    },
    firstActionMatch: share(firstMatches, firsts),
    secondTapAgain: share(agains, seconds),
    resumes,
  };
}

/**
 * `job.take` request logs (ADR 0008) as funnel rows (QA m2): taking a job is not an action log, but
 * it completes the welcome set's "Take a job" order, and may be the one that completes all three.
 * `result` is the stored TakeJobResult; a row whose result has another shape is skipped.
 */
export function jobTakeRows(
  logs: Array<{ characterId: string; createdAt: Date; result: unknown }>,
): FunnelAction[] {
  return logs.flatMap((l) => {
    const r = l.result as
      | {
          job?: { id?: string };
          outcome?: { orderCompleted?: boolean };
          character?: { orders?: { allDone?: boolean } };
        }
      | null
      | undefined;
    if (!r?.job?.id || !r.outcome) return [];
    const completed = !!r.outcome.orderCompleted;
    return [
      {
        characterId: l.characterId,
        createdAt: l.createdAt,
        kind: 'job' as const,
        actionId: r.job.id,
        ordersCompleted: completed ? 1 : 0,
        allOrdersDone: completed && !!r.character?.orders?.allDone,
      },
    ];
  });
}

/** A share (0–1) as the game prints one: "62 %" (n12); "–" when there is none. */
export const formatShare = (share: number | null): string =>
  share === null ? '–' : `${Math.round(share * 100)} %`;

/** The funnel per faction, so one city's first ten minutes can be compared with another's. */
export function buildArrivalFunnels(
  arrivals: FunnelArrival[],
  characters: FunnelCharacter[],
  actions: FunnelAction[],
): { all: Funnel; byFaction: Record<string, Funnel> } {
  const factions = [...new Set(characters.map((c) => c.factionId))].sort();
  return {
    all: buildArrivalFunnel(arrivals, characters, actions),
    byFaction: Object.fromEntries(
      factions.map((f) => {
        const chars = characters.filter((c) => c.factionId === f);
        const ids = new Set(chars.map((c) => c.id));
        return [
          f,
          buildArrivalFunnel(
            arrivals.filter((a) => a.factionId === f),
            chars,
            actions.filter((a) => ids.has(a.characterId)),
          ),
        ];
      }),
    ),
  };
}
