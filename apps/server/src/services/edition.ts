import type { GameContent } from '@irongate/content';
import type { CharacterDoc, CityDoc, PaperEntryDoc } from '@irongate/db';
import { JOBS, fillTemplate, itemSpec, selectHeadlines, standingView } from '@irongate/rules';
import type {
  DayKey,
  HeadlineTemplate,
  OrdersState,
  PaperFacts,
  Placeholder,
  Settlement,
} from '@irongate/rules';
import { namedStanding, rankTitle, standingSuccesses } from './views';

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
}): NewEdition {
  const { content, character: c, settlement: s, previous: prev, today } = i;
  const yesterday = today - 1;
  const homeCity = content.city(c.homeCityId);
  const homeShare = (i.home?.opinion ?? homeCity?.baselineOpinion)?.[c.factionId] ?? 0;
  const standingLevel = standingView(standingSuccesses(c, c.homeCityId)).level;
  const lastPlayed = s.lastPlayed;
  const playedYesterday = lastPlayed?.day === yesterday ? lastPlayed : null;
  const workedYesterday = c.job?.lastShiftDay === yesterday;

  const facts: PaperFacts = {
    firstEdition: s.firstEdition,
    rankRose: prev !== null && c.rank > prev.snapshot.rank,
    rank: c.rank,
    levelRose: prev !== null && c.level > prev.snapshot.level,
    standingRose: prev !== null && standingLevel > prev.snapshot.standingLevel,
    ordersAllDoneYesterday: c.orders.day === yesterday && c.orders.allDoneAt !== null,
    streakHitYesterday: workedYesterday && c.job ? c.job.streak : null,
    daysSinceLastPaper: prev ? today - prev.day : null,
    idleYesterday: playedYesterday !== null && playedYesterday.energy === 0 && !playedYesterday.shiftWorked,
    halfPaysCredited: s.salary?.days ?? 0,
    energyYesterday: playedYesterday?.energy ?? 0,
    homeShare,
  };

  const templates = content.headlinesOf(c.homeCityId);
  const picked = templates.length > 0 ? selectHeadlines(templates, facts, today) : [];

  // Today's slot A as frozen (the rotation, or the welcome set on a first City Day, ADR 0012).
  const itemA = i.ordersToday.items[0];
  const slotA = itemA ? content.ordersOf(c.factionId).find((t) => t.id === itemA.templateId) : undefined;
  const orderA = itemA && slotA ? itemSpec(itemA, slotA) : undefined;
  const standing = namedStanding(content, c.homeCityId, standingSuccesses(c, c.homeCityId));
  const streak = c.job?.streak ?? 0;
  const baseVars: Partial<Record<Placeholder, string>> = {
    name: c.name,
    level: String(c.level),
    rank: rankTitle(content, c, c.rank),
    energyYesterday: String(facts.energyYesterday),
    standing: standing.name,
    days: String(facts.halfPaysCredited),
    iron: String(s.salary?.total ?? 0),
    share: (Math.round(homeShare * 10 + 1e-7) / 10).toFixed(1),
    streak: String(streak),
    ordersTitle: orderA?.title ?? '',
    ordersLine: orderA?.line ?? '',
  };
  const varsFor = (t: HeadlineTemplate): Partial<Record<Placeholder, string>> => {
    // {bonus} means the Standing bonus or the streak bonus, by the headline's condition.
    const streakBonus = Math.round(JOBS.streakPerDay * 100 * Math.min(streak, JOBS.streakCapDays));
    const bonus = t.when.some((w) => w.kind === 'streakHitYesterday') ? streakBonus : standing.bonus;
    return { ...baseVars, bonus: String(bonus) };
  };

  const job = s.job ? content.job(s.job.id) : undefined;
  return {
    characterId: c._id,
    day: today,
    cityId: c.homeCityId,
    firstEdition: s.firstEdition,
    headlines: picked.map((t) => ({
      templateId: t.id,
      group: t.group,
      headline: fillTemplate(t.headline, varsFor(t)),
      ...(t.deck ? { deck: fillTemplate(t.deck, varsFor(t)) } : {}),
    })),
    desk: {
      salary: s.salary && job && s.salary.days > 0 ? { jobId: job.id, jobName: job.name, ...s.salary } : null,
      streak: s.streak,
      restedBanked: s.restedBanked,
      daysSinceLastPaper: facts.daysSinceLastPaper,
      yesterday: playedYesterday,
    },
    snapshot: { level: c.level, rank: c.rank, standingLevel },
  };
}
