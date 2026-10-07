import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { paperCityOf, residenceOf } from './residence';
import type { CharacterDoc, CityDoc, PaperEntryDoc, StayDoc } from '@irongate/db';
import {
  HEAT,
  RISK_CONDITION_KINDS,
  dayKey,
  dayStart,
  fillTemplate,
  fitDeck,
  heatState,
  itemSpec,
  liveMarks,
  recordLevel,
  recordView,
  selectHeadlines,
  standingView,
} from '@irongate/rules';
import type {
  DayKey,
  HeadlineTemplate,
  Mark,
  OrdersState,
  PaperFacts,
  Placeholder,
  RiskCondition,
  RiskFacts,
  RiskPlaceholder,
  Settlement,
} from '@irongate/rules';
import { locationRef, namedStanding, orderText, orderVars, rankTitle, standingSuccesses } from './views';

const RISK_KINDS = new Set<string>(RISK_CONDITION_KINDS);
/** A slice-5 risk headline (its deck is held to 200 once filled). */
const isRisk = (t: HeadlineTemplate) => t.when.some((w) => RISK_KINDS.has(w.kind));

export type NewEdition =Omit<PaperEntryDoc, '_id' | 'createdAt' | 'readAt'>;

/**
 * Today's Morning Paper (§3.3), set at settlement from the character as it was before the
 * boundary, the settlement, the previous edition and the home city's meter. A pure function of
 * those, so a retried settlement prints the same edition. Placeholders are resolved here.
 */
export function buildEdition(i: {
  content: GameContent;
  character: CharacterDoc;
  settlement: Settlement;
  previous: Pick<PaperEntryDoc, 'day' | 'snapshot'> | null;
  home: Pick<CityDoc, 'opinion'> | null;
  today: DayKey;
  ordersToday: OrdersState;
  /** Slice 3 (ADR 0020): the stipend and the deposits returned at this settlement. */
  stipend?: { boundaries: number; pc: number; fxp: number; cityName: string } | null;
  deposits?: { count: number; pc: number } | null;
  /** Review 1 (§13.4): the PC One of Us paid at this settlement. */
  oneOfUsPc?: number;
  /** Slice 4 (ADR 0028): hero and Issue awards credited at this settlement. */
  awards?: Array<{ kind: 'hero' | 'issue'; label: string; pc: number }>;
  /** Review 1: the seniority days the last boundary added (the Long Service Order's 2), else 1. */
  seniorityStepYesterday?: number;
  /** Slice 5 (tech design §11.2): the risk facts and their placeholders (`riskEdition`). */
  risk?: RiskEdition | null;
}): NewEdition {
  const { content, character: c, settlement: s, previous: prev, today } = i;
  const yesterday = today - 1;
  // Review 4 (ADR 0074): the edition's paper is always the residence's.
  const paperCityId = paperCityOf(c);
  const homeCity = content.city(paperCityId);
  const homeShare = (i.home?.opinion ?? homeCity?.baselineOpinion)?.[c.factionId] ?? 0;
  const standingLevel = standingView(standingSuccesses(c, paperCityId)).level;
  const lastPlayed = s.lastPlayed;
  const playedYesterday = lastPlayed?.day === yesterday ? lastPlayed : null;

  const facts: PaperFacts = {
    firstEdition: s.firstEdition,
    rankRose: prev !== null && c.rank > prev.snapshot.rank,
    rank: c.rank,
    levelRose: prev !== null && c.level > prev.snapshot.level,
    standingRose: prev !== null && standingLevel > prev.snapshot.standingLevel,
    ordersAllDoneYesterday: c.orders.day === yesterday && c.orders.allDoneAt !== null,
    // Review 1 (§9.1): the Five / Ten Days In headlines fire the morning after seniority reaches the
    // number, so only the last boundary's step counts (a long absence does not print a crossing
    // weeks old over *While You Were Away*).
    seniority: s.seniority
      ? {
          before: Math.max(s.seniority.before, s.seniority.after - (i.seniorityStepYesterday ?? 1)),
          after: s.seniority.after,
        }
      : null,
    daysSinceLastPaper: prev ? today - prev.day : null,
    idleYesterday: playedYesterday !== null && playedYesterday.energy === 0,
    daysPaid: s.salary?.days ?? 0,
    energyYesterday: playedYesterday?.energy ?? 0,
    homeShare,
    // Slice 4: `hl.*.train-open` the morning after the Level reached 10.
    ...(prev !== null ? { level: { before: prev.snapshot.level, after: c.level } } : {}),
    ...(i.risk ? { risk: i.risk.facts } : {}),
  };

  const templates = content.headlinesOf(paperCityId);
  const picked = templates.length > 0 ? selectHeadlines(templates, facts, today) : [];

  // Today's slot A as frozen (the rotation, or the welcome set on a first City Day, ADR 0012).
  const itemA = i.ordersToday.items[0];
  const slotA = itemA ? content.ordersOf(c.factionId).find((t) => t.id === itemA.templateId) : undefined;
  const orderA = itemA && slotA ? itemSpec(itemA, slotA) : undefined;
  // Review 1 (§7.5): the welcome deck's {place} named slot A's place. Review 4 (ADR 0073): it names
  // the favour's, slot B's welcome template (the HQ), when today's orders hold one.
  const welcomeB = i.ordersToday.items
    .map((it) => content.ordersOf(c.factionId).find((t) => t.id === it.templateId))
    .find((t) => t?.slot === 'B' && t.use === 'welcome');
  const firstAction = (welcomeB ?? slotA)?.match.actionIds?.[0];
  const placeId = firstAction ? content.action(firstAction)?.location.id : undefined;
  const standing = namedStanding(content, paperCityId, standingSuccesses(c, paperCityId));
  const job = s.job ? content.job(s.job.id) : undefined;
  const baseVars: Partial<Record<Placeholder, string>> = {
    name: c.name,
    level: String(c.level),
    rank: rankTitle(content, c, c.rank),
    energyYesterday: String(facts.energyYesterday),
    standing: standing.name,
    bonus: String(standing.bonus),
    days: String(facts.daysPaid),
    iron: String(s.salary?.total ?? 0),
    share: (Math.round(homeShare * 10 + 1e-7) / 10).toFixed(1),
    // TODO(game-designer): the seniority decks read "{name} has been {job}"; {job} is the job's name.
    job: job?.name ?? '',
    place: placeId ? locationRef(content, placeId) : (homeCity?.locations[0]?.name ?? ''),
    // Slice-4 fixes §2 (QA m1): an order's `{city}` / `{verbs}` resolved for the reader.
    ordersTitle: orderA ? orderText(orderA.title, orderVars(content, c, null)) : '',
    ordersLine: orderA ? orderText(orderA.line, orderVars(content, c, null)) : '',
    // Slice 4: the Herald's stored lines name the faction and the residence.
    faction: content.faction(c.factionId).shortName,
    district: residencePlaceName(content, c),
  };
  // Slice 5: each risk headline's own fills (its `{missionTitle}` is the one its fact names).
  const varsFor = (t: HeadlineTemplate): Partial<Record<Placeholder | RiskPlaceholder, string>> =>
    Object.assign({}, baseVars, ...t.when.map((w) => i.risk?.varsByKind[w.kind as RiskCondition['kind']] ?? {}));

  return {
    characterId: c._id,
    day: today,
    cityId: paperCityId,
    firstEdition: s.firstEdition,
    headlines: picked.map((t) => ({
      templateId: t.id,
      group: t.group,
      priority: t.priority,
      headline: fillTemplate(t.headline, varsFor(t)),
      // Slice 5 (T18): a risk deck held to 200 once filled (a long mission title and `{how}`);
      // the slice 1–4 decks are printed as they always were.
      ...(t.deck
        ? { deck: isRisk(t) ? fitDeck(fillTemplate(t.deck, varsFor(t))) : fillTemplate(t.deck, varsFor(t)) }
        : {}),
    })),
    desk: {
      salary:
        s.salary && job && s.salary.days > 0
          ? {
              jobId: job.id,
              jobName: job.name,
              days: s.salary.days,
              perDay: s.salary.perDay,
              seniority: { days: s.salary.seniority.days, amount: s.salary.seniority.amount },
              total: s.salary.total,
              ordinance: s.salary.ordinance ?? null,
            }
          : null,
      stipend: i.stipend ?? null,
      deposits: i.deposits ?? null,
      oneOfUsPc: i.oneOfUsPc ?? 0,
      awards: i.awards && i.awards.length > 0 ? i.awards : null,
      restedBanked: s.restedBanked,
      daysSinceLastPaper: facts.daysSinceLastPaper,
      yesterday: playedYesterday,
    },
    snapshot: { level: c.level, rank: c.rank, standingLevel },
  };
}

/** The residence's place in a sentence: the district, or the city. */
function residencePlaceName(content: GameContent, c: CharacterDoc): string {
  const r = residenceOf(c);
  return r.districtId
    ? (content.district(r.districtId)?.quarter.name ?? r.districtId)
    : (content.city(r.cityId)?.name ?? r.cityId);
}

/** Slice 5 (tech design §8.4): what the settlement reads for the risk headlines. */
export interface RiskRead {
  /** The stays that started or ended yesterday (or since). */
  stays: StayDoc[];
  /** `actionLogs` rows by id (hex): the mission or action each names (titles). */
  acts: Map<string, { kind: string; actionId: string }>;
  /** Encounters by id (hex): what was being done and the opponent. */
  encounters: Map<string, { kind: 'mission' | 'action'; refId: string; opponentId: string }>;
  /** The first mission's id, when `firsts.mission` is yesterday. */
  firstMissionId: string | null;
}

type RiskVars = Partial<Record<RiskPlaceholder, string>>;

/** The risk facts of an edition and each headline's fills, by its condition (titles differ). */
export interface RiskEdition {
  facts: RiskFacts;
  varsByKind: Partial<Record<RiskCondition['kind'], RiskVars>>;
}

const LEVEL_ORDER = { clean: 0, onFile: 1, repeat: 2, notorious: 3 } as const;
/** A label in the middle of a sentence: "After a run-in with a Vanguard street enforcer." */
const inSentence = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

/**
 * Slice 5 (tech design §11.2, design §14): yesterday's risk facts from the character before the
 * boundary, the stays read, and the Heat projected at the settlement. Pure. A headline whose fill
 * cannot be named (a stay or a mark with no act behind it: the test hooks) is not printed, so no
 * edition carries an unfilled `{…}`. Held in the cells at the settlement, the edition reads the
 * Heat the release sets (25): the cells' night is `cells`, never `seen`.
 */
export function riskEdition(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  heatNow: number,
  read: RiskRead | null,
): RiskEdition {
  const y = today - 1;
  const from = dayStart(y);
  const to = dayStart(today);
  const yesterday = (d: Date | null | undefined) =>
    !!d && new Date(d).getTime() >= from && new Date(d).getTime() < to;
  const r: RiskRead = read ?? { stays: [], acts: new Map(), encounters: new Map(), firstMissionId: null };
  const nameOf = (kind: string, id: string): string | null =>
    (kind === 'mission' ? content.mission(id)?.mission.name : content.action(id)?.action.name) ?? null;
  const titleOfLog = (logId: string | null | undefined): string | null => {
    const a = logId ? r.acts.get(logId) : undefined;
    return a ? nameOf(a.kind, a.actionId) : null;
  };
  const titleOfStay = (s: StayDoc): string | null => {
    const byLog = titleOfLog(s.logId ? s.logId.toHexString() : null);
    if (byLog) return byLog;
    const e = s.encounterId ? r.encounters.get(s.encounterId.toHexString()) : undefined;
    return e ? nameOf(e.kind, e.refId) : null;
  };
  const varsByKind: RiskEdition['varsByKind'] = {};
  const latest = (xs: StayDoc[]) =>
    [...xs].sort((a, b) => new Date(b.since).getTime() - new Date(a.since).getTime())[0];

  // The first mission ever, yesterday.
  const firstTitle =
    c.firsts?.mission && dayKey(new Date(c.firsts.mission).getTime()) === y && r.firstMissionId
      ? nameOf('mission', r.firstMissionId)
      : null;
  if (firstTitle) varsByKind.missionFirstYesterday = { missionTitle: firstTitle };

  // A mark yesterday (the latest one's mission), and the record's level at yesterday's start and end.
  const marks: Mark[] = (c.record?.marks ?? []).map((m) => ({ day: m.day, kind: m.kind, logId: m.logId ?? null }));
  const marked = liveMarks(marks, today).filter((m) => m.day === y);
  const markTitle = [...marked].reverse().map((m) => titleOfLog(m.logId)).find((t) => t !== null) ?? null;
  if (markTitle) varsByKind.markYesterday = { missionTitle: markTitle };
  const levelOn = (ms: Mark[]) => recordLevel(liveMarks(ms, y).length);
  const before = levelOn(marks.filter((m) => m.day < y));
  const after = levelOn(marks.filter((m) => m.day <= y));
  const recordRose = LEVEL_ORDER[after] > LEVEL_ORDER[before];
  if (recordRose) {
    const rec = recordView(marks, today);
    varsByKind.recordRose = {
      recordLevel: rec.level === 'clean' ? '' : copy.risk.paper.recordLevel[rec.level],
      marks: String(rec.marks),
      marksLine: copy.risk.paper.marksLine(rec.marks),
      pct: String(-rec.ironPct),
    };
  }

  // Taken in yesterday (the latest), with its minutes and how.
  const stays = r.stays;
  const cells = latest(stays.filter((s) => s.kind === 'cells' && yesterday(s.since)));
  // Design §14 (4 Oct 2026): a stay with no act behind it (a dev stay) prints a fallback.
  const noAct = copy.risk.paper.noAct;
  const cellsTitle = cells ? (titleOfStay(cells) ?? noAct.missionTitle) : null;
  const how = cells
    ? cells.reason in copy.risk.paper.how
      ? copy.risk.paper.how[cells.reason as 'caught']
      : noAct.how
    : null;
  if (cells && cellsTitle && how) {
    const spent = cells.releasedAt
      ? Math.max(1, Math.round((new Date(cells.releasedAt).getTime() - new Date(cells.since).getTime()) / 60_000))
      : cells.minutes;
    // QA review 4 (nit): the unit with the count, so a minute's stay reads *Spent 1 Minute in the Cells*.
    varsByKind.arrestedYesterday = {
      missionTitle: cellsTitle,
      how,
      minutes: `${spent} ${spent === 1 ? 'Minute' : 'Minutes'}`,
    };
  }

  // Admitted yesterday: the opponent of its run-in.
  const ward = latest(stays.filter((s) => s.kind === 'infirmary' && yesterday(s.since)));
  const enc = ward?.encounterId ? r.encounters.get(ward.encounterId.toHexString()) : undefined;
  const opponent = enc ? content.opponent(enc.opponentId)?.label : undefined;
  if (opponent) varsByKind.admittedYesterday = { opponent: inSentence(opponent) };

  // On rival ground yesterday (the closed tally), and put on the train home yesterday.
  const tally = c.today as CharacterDoc['today'] & { rivalCityId?: string | null };
  const rivalId = tally.day === y ? (tally.rivalCityId ?? null) : null;
  if (rivalId) varsByKind.rivalGroundYesterday = { rivalCity: content.city(rivalId)?.name ?? rivalId };
  const deported = [...stays]
    .filter((s) => s.deportJourneyId && yesterday(s.releasedAt))
    .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime())[0];
  if (deported) varsByKind.deportedYesterday = { rivalCity: content.city(deported.cityId)?.name ?? deported.cityId };

  const inCells = c.held?.state === 'in' && c.held.kind === 'cells';
  return {
    facts: {
      missionFirstYesterday: firstTitle !== null,
      heat: heatState(inCells ? HEAT.afterRelease : heatNow),
      markYesterday: markTitle !== null,
      arrestedYesterday: varsByKind.arrestedYesterday !== undefined,
      admittedYesterday: varsByKind.admittedYesterday !== undefined,
      recordRose,
      rivalGroundYesterday: rivalId !== null,
      deportedYesterday: deported !== undefined,
    },
    varsByKind,
  };
}
