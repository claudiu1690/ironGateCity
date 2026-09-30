import { PAPER } from './constants';
import { cityDayIndex, mod } from './day';
import type { DayKey } from './day';
import type { CouncilPhase } from './calendar';
import { POLITICAL_CONDITION_KINDS } from './types';
import type {
  HeadlineCondition,
  HeadlineGroup,
  HeadlineTemplate,
  Placeholder,
  PoliticalCondition,
  PoliticalPlaceholder,
  StoryPlaceholder,
} from './types';

/** What the edition knows when it is set (from the settlement and the previous edition). */
export interface PaperFacts {
  firstEdition: boolean;
  rankRose: boolean;
  /** The rank now (for `rankRose` with values). */
  rank: number;
  levelRose: boolean;
  standingRose: boolean;
  ordersAllDoneYesterday: boolean;
  /** The streak reached yesterday (after yesterday's shift), or null without a job. */
  streakHitYesterday: number | null;
  /**
   * Slice 3 (design §17 Q11): the streak before yesterday's shift. A streak headline fires on
   * crossing its value, not on equality, so Shift Hours' +2 steps (4 → 6) still print Five Straight
   * Shifts. Absent: one below `streakHitYesterday`.
   */
  streakBeforeYesterday?: number | null;
  daysSinceLastPaper: number | null;
  /** Seen yesterday, but spent nothing and worked no shift. */
  idleYesterday: boolean;
  /** Half-pays credited at the boundaries crossed since the last paper (0 without a job). */
  halfPaysCredited: number;
  /** Energy spent on the previous City Day (0 when not seen yesterday). */
  energyYesterday: number;
  /** The home faction's share of its home city, in points. */
  homeShare: number;
}

/** Inclusive bounds; an absent bound is open. */
const within = (v: number, c: { min?: number; max?: number }) =>
  (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);

function holds(c: HeadlineCondition, f: PaperFacts, noPersonal: boolean): boolean {
  switch (c.kind) {
    case 'firstEdition':
      return f.firstEdition;
    case 'rankRose':
      return (
        f.rankRose &&
        (c.values === undefined || c.values.includes(f.rank)) &&
        (c.min === undefined || f.rank >= c.min)
      );
    case 'levelRose':
      return f.levelRose;
    case 'standingRose':
      return f.standingRose;
    case 'ordersAllDoneYesterday':
      return f.ordersAllDoneYesterday;
    case 'streakHitYesterday': {
      const now = f.streakHitYesterday;
      if (now === null) return false;
      const before = f.streakBeforeYesterday ?? now - 1;
      return c.values.some((v) => before < v && v <= now);
    }
    case 'daysSinceLastPaper':
      return f.daysSinceLastPaper !== null && f.daysSinceLastPaper >= c.min;
    case 'idleYesterday':
      return f.idleYesterday;
    case 'halfPaysCredited':
      return within(f.halfPaysCredited, c);
    case 'energyYesterday':
      return within(f.energyYesterday, c);
    case 'noPersonal':
      return noPersonal;
    case 'homeShare':
      // min inclusive, max exclusive: bands ≥ 80, 60–79.999, < 60.
      return (c.min === undefined || f.homeShare >= c.min) && (c.max === undefined || f.homeShare < c.max);
    default:
      // Political conditions are selected live at read (ADR 0023), never at settlement.
      return false;
  }
}

const byPriority = (a: HeadlineTemplate, b: HeadlineTemplate) => a.priority - b.priority;

/**
 * §3.3 / tech design §6.2: up to two personal headlines by priority, then city headlines by priority
 * while fewer than three (`noPersonal` holds iff no personal one was picked), then one ambient
 * headline rotated by the day while fewer than three. Deterministic; no RNG.
 */
export function selectHeadlines(
  templates: readonly HeadlineTemplate[],
  facts: PaperFacts,
  day: DayKey,
): HeadlineTemplate[] {
  const eligible = (group: HeadlineTemplate['group'], noPersonal: boolean) =>
    templates
      .filter((t) => t.group === group && t.when.every((c) => holds(c, facts, noPersonal)))
      .sort(byPriority);

  const picked = eligible('personal', false).slice(0, PAPER.personalMax);
  const noPersonal = picked.length === 0;
  for (const t of eligible('city', noPersonal)) {
    if (picked.length >= PAPER.headlines) break;
    picked.push(t);
  }
  const ambient = templates.filter((t) => t.group === 'ambient');
  if (picked.length < PAPER.headlines && ambient.length > 0) {
    picked.push(ambient[mod(cityDayIndex(day), ambient.length)]!);
  }
  return picked;
}

const PLACEHOLDER_RE = /\{([a-zA-Z]+)\}/g;

/** The `{…}` names used in a text. */
export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]!);
}

/**
 * Resolve `{name}`-style placeholders (headline and order ones, and the story ones of slice 2); an
 * unknown or missing one is left as written.
 */
export function fillTemplate(
  text: string,
  vars: Partial<Record<Placeholder | StoryPlaceholder | PoliticalPlaceholder, string>>,
): string {
  return text.replace(
    PLACEHOLDER_RE,
    (whole, key: string) => (vars as Record<string, string | undefined>)[key] ?? whole,
  );
}

/**
 * §3.3: the paper is due when today's edition is unread, or 3 hours or more have passed since the
 * later of the last read and the last action.
 */
export function isPaperDue(i: {
  editionReadAt: number | null;
  lastActionAt: number | null;
  now: number;
}): boolean {
  if (i.editionReadAt === null) return true;
  const since = Math.max(i.editionReadAt, i.lastActionAt ?? 0);
  return i.now - since >= PAPER.dueAfterAbsenceMs;
}

// ---------------------------------------------------------------------------------------------
// Slice 3 (ADR 0023): political headlines, selected live at read and merged by priority.
// ---------------------------------------------------------------------------------------------

const POLITICAL_KINDS = new Set<string>(POLITICAL_CONDITION_KINDS);
const GROUP_ORDER: Record<HeadlineGroup, number> = { personal: 0, city: 1, ambient: 2 };

export const isPoliticalCondition = (c: HeadlineCondition): c is PoliticalCondition =>
  POLITICAL_KINDS.has(c.kind);

/** A template with political conditions (content keeps them out of the settlement's selector). */
export const isPoliticalTemplate = (t: Pick<HeadlineTemplate, 'when'>): boolean =>
  t.when.some(isPoliticalCondition);

/** What the live paper knows about the caller's politics this morning. */
export interface PoliticalFacts {
  /** The caller stood at last night's count. */
  seat: { won: boolean; top: boolean; tie: boolean } | null;
  /** The caller voted at last night's count. */
  voted: { won: boolean; tie: boolean } | null;
  filedYesterday: boolean;
  /** The caller filed; the nominations closed last night. */
  nominationsClosed: { struck: boolean } | null;
  termEnded: boolean;
  /** The caller sat on the council that divided last night. */
  divided: { passed: boolean } | null;
  movedYesterday: boolean;
  countToday: boolean;
  phase: CouncilPhase;
  cycleDay: number;
  ordinanceFromToday: boolean;
  leftUnrest: boolean;
  /** Placeholder values, resolved on the server. */
  vars: Partial<Record<PoliticalPlaceholder, string>>;
  /**
   * Values that depend on the template: `{votes}` is the caller's total in a seat headline and
   * their candidate's in a vote headline. Keyed by the template's first condition kind.
   */
  varsByKind?: Partial<Record<PoliticalCondition['kind'], Partial<Record<PoliticalPlaceholder, string>>>>;
  /** Epoch ms of the boundaries `{until}` may name. */
  until: { nominations: number; polls: number; divide: number };
}

function politicalHolds(c: PoliticalCondition, f: PoliticalFacts): boolean {
  switch (c.kind) {
    case 'seatWon':
      return f.seat !== null && f.seat.won && (c.top === undefined || c.top === f.seat.top);
    case 'seatLost':
      return f.seat !== null && !f.seat.won && (c.tie === undefined || c.tie === f.seat.tie);
    case 'votedFor':
      return f.voted !== null && f.voted.won === c.won && (c.tie === undefined || c.tie === f.voted.tie);
    case 'filedYesterday':
      return f.filedYesterday && f.phase === 'nominations';
    case 'nominationsClosed':
      return f.nominationsClosed !== null && f.nominationsClosed.struck === c.struck;
    case 'termEnded':
      return f.termEnded;
    case 'divided':
      return f.divided !== null && f.divided.passed === c.passed;
    case 'movedYesterday':
      return f.movedYesterday;
    case 'countToday':
      return f.countToday;
    case 'phaseToday':
      return f.phase === c.phase && (c.cycleDay === undefined || c.cycleDay === f.cycleDay);
    case 'ordinanceFromToday':
      return f.ordinanceFromToday;
    case 'leftUnrest':
      return f.leftUnrest;
  }
}

/** A resolved line starts with a capital ("{ordinal} of seven" → "Second of seven"). */
export const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Which boundary a template's `{until}` names, from its condition. */
function untilFor(t: HeadlineTemplate, f: PoliticalFacts): number | undefined {
  for (const c of t.when) {
    if (c.kind === 'filedYesterday') return f.until.nominations;
    if (c.kind === 'movedYesterday') return f.until.divide;
    if (c.kind === 'nominationsClosed') return f.until.polls;
    if (c.kind === 'phaseToday') return c.phase === 'nominations' ? f.until.nominations : f.until.polls;
  }
  return undefined;
}

export interface LiveHeadline {
  templateId: string;
  group: HeadlineGroup;
  priority: number;
  headline: string;
  deck?: string;
  /** For `{until}`: left in the text for the client to render in the player's clock. */
  until?: number;
}

/**
 * Every political template whose conditions hold, by priority (file order on a tie), with the
 * placeholders resolved and `{until}` left in the text beside its epoch ms.
 */
export function selectPoliticalHeadlines(
  templates: readonly HeadlineTemplate[],
  f: PoliticalFacts,
): LiveHeadline[] {
  return templates
    .map((t, idx) => ({ t, idx }))
    .filter(
      ({ t }) =>
        isPoliticalTemplate(t) && t.when.every((c) => isPoliticalCondition(c) && politicalHolds(c, f)),
    )
    .sort(
      (a, b) =>
        GROUP_ORDER[a.t.group] - GROUP_ORDER[b.t.group] || a.t.priority - b.t.priority || a.idx - b.idx,
    )
    .map(({ t }) => {
      const first = t.when[0];
      const vars = { ...f.vars, ...(first && isPoliticalCondition(first) ? f.varsByKind?.[first.kind] : {}) };
      const text = `${t.headline} ${t.deck ?? ''}`;
      const until = text.includes('{until}') ? untilFor(t, f) : undefined;
      return {
        templateId: t.id,
        group: t.group,
        priority: t.priority,
        headline: capitalise(fillTemplate(t.headline, vars)),
        ...(t.deck ? { deck: capitalise(fillTemplate(t.deck, vars)) } : {}),
        ...(until !== undefined ? { until } : {}),
      };
    });
}

/**
 * ADR 0023: merge live political headlines into the stored edition, keeping the slice-1 shape: up
 * to two personal headlines by priority (live first on a tie), then city headlines to three, then
 * the stored ambient headline if there is room. On the welcome edition (`storedFirst`) the stored
 * headlines win ties, so the welcome and the arrival notice are never displaced.
 */
export function mergeHeadlines(
  stored: readonly LiveHeadline[],
  live: readonly LiveHeadline[],
  opts: { storedFirst?: boolean } = {},
): LiveHeadline[] {
  const [l, s] = opts.storedFirst ? [1, 0] : [0, 1];
  const byGroup = (g: HeadlineGroup) =>
    [
      ...live.filter((h) => h.group === g).map((h, i) => ({ h, live: l, i })),
      ...stored.filter((h) => h.group === g).map((h, i) => ({ h, live: s, i })),
    ]
      .sort((a, b) => a.h.priority - b.h.priority || a.live - b.live || a.i - b.i)
      .map((x) => x.h);
  const out = byGroup('personal').slice(0, PAPER.personalMax);
  for (const h of byGroup('city')) {
    if (out.length >= PAPER.headlines) break;
    out.push(h);
  }
  const ambient = stored.find((h) => h.group === 'ambient');
  if (out.length < PAPER.headlines && ambient) out.push(ambient);
  return out;
}
