import { PAPER } from './constants';
import { cityDayIndex, mod } from './day';
import type { DayKey } from './day';
import type { CouncilPhase } from './calendar';
import type { HeatState } from './heat';
import { CAPITAL_CONDITION_KINDS, POLITICAL_CONDITION_KINDS } from './types';
import type {
  CapitalCondition,
  CapitalPlaceholder,
  HeadlineCondition,
  HeadlineGroup,
  HeadlineTemplate,
  Placeholder,
  PoliticalCondition,
  PoliticalPlaceholder,
  RiskPlaceholder,
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
  /**
   * Review 1 (GDD §9.1): seniority before and after the boundaries this edition settles, or null
   * without a job. A seniority headline fires when a value lies in (before, after], so the Long
   * Service Order's two-day steps (4 → 6) still print *Five Days In*.
   */
  seniority: { before: number; after: number } | null;
  daysSinceLastPaper: number | null;
  /** Seen yesterday, but spent nothing. */
  idleYesterday: boolean;
  /** Days of pay credited at the boundaries crossed since the last paper (0 without a job). */
  daysPaid: number;
  /** Energy spent on the previous City Day (0 when not seen yesterday). */
  energyYesterday: number;
  /** The home faction's share of its home city, in points. */
  homeShare: number;
  /** Slice 4: the level before and after the boundaries this edition settles (`levelCrossed`). */
  level?: { before: number; after: number };
  /** Slice 5 (tech design §11.2): the risk facts of the settlement; absent = none holds. */
  risk?: RiskFacts;
  /**
   * Review 5 (ADR 0082): an Unrest prize credited at this settlement: the town, its home party, the
   * reader's party and its top three pushers; absent or null = none.
   */
  unrestPushed?: { cityName: string; homeName: string; partyName: string; top: string[] } | null;
  /** Slice 6 (tech design §11.2): yesterday's events and favours; absent = none holds. */
  events?: EventFacts;
}

/** Slice 6 (tech design §11.2): what the settlement knows of yesterday's events and favours. */
export interface EventFacts {
  /** The best band among the reader's sign-ups of yesterday's events (resolved), or null. */
  tookPart: 'triumph' | 'success' | 'mixed' | 'fiasco' | null;
  /** The faction resolved an event yesterday in the residence city that the reader was not on. */
  city: boolean;
  calledOff: boolean;
  bailPostedFor: boolean;
  bailPostedBy: boolean;
  visited: boolean;
}

/** Slice 5: what the settlement knows of yesterday's risks (design §14). */
export interface RiskFacts {
  missionFirstYesterday: boolean;
  /** The projected Heat's state at the settlement. */
  heat: HeatState;
  markYesterday: boolean;
  arrestedYesterday: boolean;
  admittedYesterday: boolean;
  recordRose: boolean;
  rivalGroundYesterday: boolean;
  deportedYesterday: boolean;
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
    case 'seniorityHitYesterday': {
      const s = f.seniority;
      return s !== null && c.values.some((v) => s.before < v && v <= s.after);
    }
    case 'daysSinceLastPaper':
      return f.daysSinceLastPaper !== null && f.daysSinceLastPaper >= c.min;
    case 'idleYesterday':
      return f.idleYesterday;
    case 'daysPaid':
      return within(f.daysPaid, c);
    case 'energyYesterday':
      return within(f.energyYesterday, c);
    case 'noPersonal':
      return noPersonal;
    case 'homeShare':
      // min inclusive, max exclusive: bands ≥ 80, 60–79.999, < 60.
      return (c.min === undefined || f.homeShare >= c.min) && (c.max === undefined || f.homeShare < c.max);
    case 'levelCrossed':
      return f.level !== undefined && f.level.before < c.level && c.level <= f.level.after;
    // Slice 5 (tech design §11.2): the risk facts.
    case 'missionFirstYesterday':
      return f.risk?.missionFirstYesterday === true;
    case 'heatState':
      return f.risk !== undefined && (f.risk.heat === 'wanted' || (c.min === 'hot' && f.risk.heat === 'hot'));
    case 'markYesterday':
      return f.risk?.markYesterday === true;
    case 'arrestedYesterday':
      return f.risk?.arrestedYesterday === true;
    case 'admittedYesterday':
      return f.risk?.admittedYesterday === true;
    case 'recordRose':
      return f.risk?.recordRose === true;
    case 'rivalGroundYesterday':
      return f.risk?.rivalGroundYesterday === true;
    case 'deportedYesterday':
      return f.risk?.deportedYesterday === true;
    case 'unrestPushed':
      return !!f.unrestPushed;
    // Slice 6 (tech design §11.2): `eventOpenToday` is live (selected at read), the rest stored.
    case 'eventResolvedYesterday':
      return c.tookPart
        ? f.events?.tookPart != null && (c.outcome === undefined || f.events.tookPart === c.outcome)
        : f.events?.city === true;
    case 'eventCalledOffYesterday':
      return f.events?.calledOff === true;
    case 'bailPostedForYesterday':
      return f.events?.bailPostedFor === true;
    case 'bailPostedByYesterday':
      return f.events?.bailPostedBy === true;
    case 'visitedYesterday':
      return f.events?.visited === true;
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
  const ambient = ambientFor(templates, day);
  if (picked.length < PAPER.headlines && ambient) picked.push(ambient);
  return picked;
}

// Slice 4: names may carry digits ({issue1Short}, {m1}).
const PLACEHOLDER_RE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

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
  vars: Partial<
    Record<Placeholder | StoryPlaceholder | PoliticalPlaceholder | CapitalPlaceholder | RiskPlaceholder, string>
  >,
): string {
  return text.replace(
    PLACEHOLDER_RE,
    (whole, key: string) => (vars as Record<string, string | undefined>)[key] ?? whole,
  );
}

/** The longest deck the content allows (`Headline.deck`, ≤ 200 characters). */
export const DECK_MAX = 200;

/**
 * Slice 5 (T18): a filled deck held to `max` characters. Placeholders can push a deck within the
 * cap as written past it (a long mission title and `{how}`), so whole sentences are dropped from
 * the end (the first is always kept); a first sentence still over is cut at a word boundary with an
 * ellipsis. A deck within the cap is returned unchanged.
 */
export function fitDeck(text: string, max: number = DECK_MAX): string {
  if (text.length <= max) return text;
  const sentences = text.split(/(?<=[.!?]['"’”]?)\s+(?=[A-Z0-9'"‘“])/);
  while (sentences.length > 1 && sentences.join(' ').length > max) sentences.pop();
  const kept = sentences.join(' ');
  if (kept.length <= max) return kept;
  const cut = kept.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, '')}…`;
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
  seat: { won: boolean; top: boolean; tie: boolean; bloc?: boolean } | null;
  filedYesterday: boolean;
  termEnded: boolean;
  countToday: boolean;
  phase: CouncilPhase;
  cycleDay: number;
  /** A rule took effect this morning at a count (not a bootstrap's). */
  ruleFromToday: boolean;
  leftUnrest: boolean;
  /** The voting rework (tech design §10): the rule ballot's live facts; absent = none holds. */
  rule?: RuleFacts;
  /** Slice 4: the capital's, the Issues' and travel's live facts; absent = none holds. */
  capital?: CapitalFacts;
  /** Placeholder values, resolved on the server. */
  vars: Partial<Record<PoliticalPlaceholder | CapitalPlaceholder | RiskPlaceholder, string>>;
  /**
   * Values that depend on the template: `{votes}` is the caller's total in a seat headline and
   * their candidate's in a vote headline. Keyed by the template's first condition kind.
   */
  varsByKind?: Partial<
    Record<PoliticalCondition['kind'], Partial<Record<PoliticalPlaceholder | CapitalPlaceholder, string>>>
  >;
  /**
   * Epoch ms of the boundaries `{until}` may name. The voting rework: `ruleEnds`, the boundary that
   * ends the rule decided this morning (its five days).
   */
  until: { nominations: number; polls: number; ruleEnds?: number };
}

/** The voting rework (tech design §10): what the live paper knows of the rule ballot this morning. */
export interface RuleFacts {
  /** Ballot k − 1 was counted this morning; `fallback` when no votes were cast, `drawn` on the capital's draw. */
  decided: {
    fallback: boolean;
    drawn: boolean;
    /** The fix round (design §8.12): level on votes (home), or on seats without a draw (the capital). */
    tie: boolean;
    /** A fallback whose card 1 was a councillor's (`{name}` is that councillor). */
    unrest: boolean;
  } | null;
  /** The caller voted on that ballot; their card won or lost; `tie` as `decided.tie`. */
  voted: { won: boolean; tie: boolean } | null;
  /** Today is the set day and the caller's council rule is a card of the set ballot. */
  onBallot: boolean;
  /** Cycle day 2: the vote opened this morning (design §8.1 Q12). */
  voteOpen: boolean;
}

/** Slice 4 (tech design §11.3): what the live paper knows of the capital, the Issues and travel. */
export interface CapitalFacts {
  registeredYesterday: boolean;
  firstCapitalArrivalYesterday: boolean;
  hero: 'district' | 'city' | null;
  issuePcYesterday: boolean;
  quotedYesterday: boolean;
  issuesDrawnToday: boolean;
  issueLeading: boolean;
  issueOpen: boolean;
  /** Monday: Issues resolved last night, owned or lapsed. */
  issueResolved: { owned: boolean; lapsed: boolean } | null;
  districtBattleground: boolean;
  districtBecameBattleground: boolean;
  districtLeftBattleground: boolean;
  groundswellStarted: boolean;
  /** The residence is a district (its line is the fallback city line). */
  districtLine: boolean;
  /** Slice 5: points the residence city's home faction lost to rivals yesterday (`{lost}`). */
  moraleLostToRivals?: number;
}

function capitalHolds(c: CapitalCondition, f: CapitalFacts | undefined): boolean {
  if (!f) return false;
  switch (c.kind) {
    case 'registeredYesterday':
      return f.registeredYesterday;
    case 'firstCapitalArrivalYesterday':
      return f.firstCapitalArrivalYesterday;
    case 'heroYesterday':
      return f.hero === c.place;
    case 'issuePcYesterday':
      return f.issuePcYesterday;
    case 'quotedYesterday':
      return f.quotedYesterday;
    case 'issuesDrawnToday':
      return f.issuesDrawnToday;
    case 'issueLeading':
      return f.issueLeading;
    case 'issueOpen':
      return f.issueOpen;
    case 'issueResolvedToday':
      return f.issueResolved !== null && (c.owned ? f.issueResolved.owned : f.issueResolved.lapsed);
    case 'districtBattleground':
      return f.districtBattleground;
    case 'districtBecameBattleground':
      return f.districtBecameBattleground;
    case 'districtLeftBattleground':
      return f.districtLeftBattleground;
    case 'groundswellStarted':
      return f.groundswellStarted;
    case 'districtLine':
      return f.districtLine;
    case 'moraleLostToRivals':
      return (f.moraleLostToRivals ?? 0) >= c.min;
  }
}

const CAPITAL_KINDS = new Set<string>(CAPITAL_CONDITION_KINDS);

function politicalHolds(c: PoliticalCondition, f: PoliticalFacts): boolean {
  if (CAPITAL_KINDS.has(c.kind)) return capitalHolds(c as CapitalCondition, f.capital);
  switch (c.kind) {
    case 'seatWon':
      return f.seat !== null && f.seat.won && (c.top === undefined || c.top === f.seat.top);
    case 'seatLost':
      return (
        f.seat !== null &&
        !f.seat.won &&
        (c.tie === undefined || c.tie === f.seat.tie) &&
        (c.bloc === undefined || c.bloc === (f.seat.bloc ?? false))
      );
    case 'filedYesterday':
      return f.filedYesterday && f.phase === 'nominations';
    case 'termEnded':
      return f.termEnded;
    case 'countToday':
      return f.countToday;
    case 'phaseToday':
      return f.phase === c.phase && (c.cycleDay === undefined || c.cycleDay === f.cycleDay);
    case 'ruleFromToday':
      return f.ruleFromToday;
    case 'leftUnrest':
      return f.leftUnrest;
    case 'ruleDecided':
      return (
        !!f.rule?.decided &&
        f.rule.decided.fallback === c.fallback &&
        (c.drawn === undefined || c.drawn === f.rule.decided.drawn) &&
        (c.tie === undefined || c.tie === f.rule.decided.tie) &&
        (c.unrest === undefined || c.unrest === f.rule.decided.unrest)
      );
    case 'votedRule':
      return (
        !!f.rule?.voted && f.rule.voted.won === c.won && (c.tie === undefined || c.tie === f.rule.voted.tie)
      );
    case 'ruleOnBallot':
      return f.rule?.onBallot ?? false;
    case 'voteOpen':
      return f.rule?.voteOpen ?? false;
    default:
      return false;
  }
}

/** A resolved line starts with a capital ("{ordinal} of seven" → "Second of seven"). */
export const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Which boundary a template's `{until}` names, from its condition. */
function untilFor(t: HeadlineTemplate, f: PoliticalFacts): number | undefined {
  for (const c of t.when) {
    if (c.kind === 'filedYesterday') return f.until.nominations;
    // The voting rework: the vote closes at the count's boundary; a decided rule runs five days.
    if (c.kind === 'voteOpen' || c.kind === 'ruleOnBallot') return f.until.polls;
    if (c.kind === 'ruleDecided' || c.kind === 'votedRule') return f.until.ruleEnds;
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

// ---------------------------------------------------------------------------------------------
// Review 4 (docs/tech/review-4.md §5.2, ADR 0074): local editions. The stored edition is always the
// residence's paper; away from home its local parts are composed at read.
// ---------------------------------------------------------------------------------------------

/**
 * The ambient line the settlement would pick from these templates on this day: the same rotation
 * `selectHeadlines` uses. Null when the set has no ambient template.
 */
export function ambientFor(templates: readonly HeadlineTemplate[], day: DayKey): HeadlineTemplate | null {
  const ambient = templates.filter((t) => t.group === 'ambient');
  return ambient.length > 0 ? ambient[mod(cityDayIndex(day), ambient.length)]! : null;
}

export interface EditionParts {
  /** Today's stored edition (personal, city and ambient lines, as printed at settlement). */
  stored: readonly LiveHeadline[];
  /** The residence's live political and capital lines (ADR 0023). */
  residenceLive: readonly LiveHeadline[];
  /** The city the reader is in, when it is not the edition's: its ambient line and its one local line. */
  local: { ambient: LiveHeadline | null; line: LiveHeadline | null } | null;
  /** The welcome edition: its stored lines win ties, and it is never composed away. */
  storedFirst?: boolean;
}

/**
 * ADR 0074 §3, §23.1 Q12. At home (or the welcome edition): `mergeHeadlines(stored, residenceLive)`,
 * exactly as before. Away: the stored ambient line is dropped; personal lines (stored and live, by
 * priority, live first on a tie) up to PAPER.personalMax; then the one local line; then the
 * residence's city lines (stored and live, by priority); then the local ambient line; at most
 * PAPER.headlines.
 */
export function composeHeadlines(p: EditionParts): LiveHeadline[] {
  if (!p.local || p.storedFirst) return mergeHeadlines(p.stored, p.residenceLive, { storedFirst: p.storedFirst });
  const byGroup = (g: HeadlineGroup) =>
    [
      ...p.residenceLive.filter((h) => h.group === g).map((h, i) => ({ h, live: 0, i })),
      ...p.stored.filter((h) => h.group === g).map((h, i) => ({ h, live: 1, i })),
    ]
      .sort((a, b) => a.h.priority - b.h.priority || a.live - b.live || a.i - b.i)
      .map((x) => x.h);
  const out = byGroup('personal').slice(0, PAPER.personalMax);
  if (p.local.line && out.length < PAPER.headlines) out.push(p.local.line);
  for (const h of byGroup('city')) {
    if (out.length >= PAPER.headlines) break;
    out.push(h);
  }
  if (out.length < PAPER.headlines && p.local.ambient) out.push(p.local.ambient);
  return out;
}

/**
 * Review 4 (answers §29.1): what the reader's city knows for its neutral local line (`hl.local.*`,
 * `cityId: '*'`), with its placeholders. `homeShare` and `moraleLost` are null where the city has
 * no home party (the capital, Clearwater), so the last two templates never match there.
 */
export interface LocalFacts {
  countToday: boolean;
  phase: CouncilPhase;
  cycleDay: number;
  ruleFromToday: boolean;
  /** Points the home party lost to rivals yesterday; null without a home party. */
  moraleLost: number | null;
  /** The home party's share of the city, in points; null without a home party. */
  homeShare: number | null;
  /** `{city}`, `{faction}`, `{ordinance}`, `{plainLine}`, `{playerSeats}`, `{npcSeats}`, `{lost}`, `{share}`. */
  vars: Partial<Record<string, string>>;
  /** Epoch ms of the boundaries `{until}` may name. */
  until: { nominations: number; polls: number };
}

function localHolds(c: HeadlineCondition, f: LocalFacts): boolean {
  switch (c.kind) {
    case 'countToday':
      return f.countToday;
    case 'phaseToday':
      return f.phase === c.phase && (c.cycleDay === undefined || c.cycleDay === f.cycleDay);
    case 'ruleFromToday':
      return f.ruleFromToday;
    case 'moraleLostToRivals':
      return f.moraleLost !== null && f.moraleLost >= c.min;
    case 'homeShare':
      return (
        f.homeShare !== null &&
        (c.min === undefined || f.homeShare >= c.min) &&
        (c.max === undefined || f.homeShare < c.max)
      );
    default:
      return false;
  }
}

/** The condition kinds a local-line template may use (the loader checks it). */
export const LOCAL_CONDITION_KINDS = [
  'countToday',
  'phaseToday',
  'ruleFromToday',
  'moraleLostToRivals',
  'homeShare',
] as const;

/** The placeholders a local-line template may use (the loader checks it). */
export const LOCAL_PLACEHOLDERS = [
  'city',
  'faction',
  'ordinance',
  'plainLine',
  'playerSeats',
  'npcSeats',
  'lost',
  'share',
  'until',
] as const;

/**
 * Answers §29.1: the one local line of a home-city edition, the first template (by priority, file
 * order on a tie) whose conditions hold for the city the reader is in, filled; `{until}` is left in
 * the text beside its epoch ms. Null when none holds (the local ambient line then has the room).
 */
export function selectLocalLine(templates: readonly HeadlineTemplate[], f: LocalFacts): LiveHeadline | null {
  const hit = templates
    .map((t, idx) => ({ t, idx }))
    .filter(({ t }) => t.when.every((c) => localHolds(c, f)))
    .sort((a, b) => a.t.priority - b.t.priority || a.idx - b.idx)[0]?.t;
  if (!hit) return null;
  const phase = hit.when.find((c) => c.kind === 'phaseToday');
  const text = `${hit.headline} ${hit.deck ?? ''}`;
  const until =
    text.includes('{until}') && phase?.kind === 'phaseToday'
      ? phase.phase === 'nominations'
        ? f.until.nominations
        : f.until.polls
      : undefined;
  return {
    templateId: hit.id,
    group: hit.group,
    priority: hit.priority,
    headline: capitalise(fillTemplate(hit.headline, f.vars as Record<string, string>)),
    ...(hit.deck ? { deck: capitalise(fillTemplate(hit.deck, f.vars as Record<string, string>)) } : {}),
    ...(until !== undefined ? { until } : {}),
  };
}
