import { PAPER } from './constants';
import { cityDayIndex, mod } from './day';
import type { DayKey } from './day';
import type { HeadlineCondition, HeadlineTemplate, Placeholder } from './types';

/** What the edition knows when it is set (from the settlement and the previous edition). */
export interface PaperFacts {
  firstEdition: boolean;
  rankRose: boolean;
  levelRose: boolean;
  standingRose: boolean;
  ordersAllDoneYesterday: boolean;
  /** The streak reached yesterday (after yesterday's shift), or null without a job. */
  streakHitYesterday: number | null;
  daysSinceLastPaper: number | null;
  /** Seen yesterday, but spent nothing and worked no shift. */
  idleYesterday: boolean;
  /** The home faction's share of its home city, in points. */
  homeShare: number;
}

function holds(c: HeadlineCondition, f: PaperFacts, noPersonal: boolean): boolean {
  switch (c.kind) {
    case 'firstEdition':
      return f.firstEdition;
    case 'rankRose':
      return f.rankRose;
    case 'levelRose':
      return f.levelRose;
    case 'standingRose':
      return f.standingRose;
    case 'ordersAllDoneYesterday':
      return f.ordersAllDoneYesterday;
    case 'streakHitYesterday':
      return f.streakHitYesterday !== null && c.values.includes(f.streakHitYesterday);
    case 'daysSinceLastPaper':
      return f.daysSinceLastPaper !== null && f.daysSinceLastPaper >= c.min;
    case 'idleYesterday':
      return f.idleYesterday;
    case 'noPersonal':
      return noPersonal;
    case 'homeShare':
      // min inclusive, max exclusive: bands ≥ 80, 60–79.999, < 60.
      return (c.min === undefined || f.homeShare >= c.min) && (c.max === undefined || f.homeShare < c.max);
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

/** Resolve `{name}`-style placeholders; an unknown or missing one is left as written. */
export function fillTemplate(text: string, vars: Partial<Record<Placeholder, string>>): string {
  return text.replace(PLACEHOLDER_RE, (whole, key: string) => vars[key as Placeholder] ?? whole);
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
