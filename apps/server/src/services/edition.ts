import type { GameContent } from '@irongate/content';
import { paperCityFor, residenceOf } from './residence';
import type { CharacterDoc, CityDoc, PaperEntryDoc } from '@irongate/db';
import { fillTemplate, itemSpec, selectHeadlines, standingView } from '@irongate/rules';
import type {
  DayKey,
  HeadlineTemplate,
  OrdersState,
  PaperFacts,
  Placeholder,
  Settlement,
} from '@irongate/rules';
import { locationRef, namedStanding, orderText, orderVars, rankTitle, standingSuccesses } from './views';

export type NewEdition = Omit<PaperEntryDoc, '_id' | 'createdAt' | 'readAt'>;

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
}): NewEdition {
  const { content, character: c, settlement: s, previous: prev, today } = i;
  const yesterday = today - 1;
  // Slice 4 (tech design §11.1): the edition's paper (the Herald for a visitor to the capital).
  const paperCityId = paperCityFor(content, c, today);
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
  };

  const templates = content.headlinesOf(paperCityId);
  const picked = templates.length > 0 ? selectHeadlines(templates, facts, today) : [];

  // Today's slot A as frozen (the rotation, or the welcome set on a first City Day, ADR 0012).
  const itemA = i.ordersToday.items[0];
  const slotA = itemA ? content.ordersOf(c.factionId).find((t) => t.id === itemA.templateId) : undefined;
  const orderA = itemA && slotA ? itemSpec(itemA, slotA) : undefined;
  // Review 1 (§7.5): the welcome deck's "Spend it at {place} first." names slot A's place.
  const firstAction = slotA?.match.actionIds?.[0];
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
  const varsFor = (_t: HeadlineTemplate): Partial<Record<Placeholder, string>> => baseVars;

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
      ...(t.deck ? { deck: fillTemplate(t.deck, varsFor(t)) } : {}),
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
