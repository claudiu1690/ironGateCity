import type { GameContent } from '@irongate/content';
import { OfficeTerm, PaperEntry } from '@irongate/db';
import {
  ENERGY,
  MONTH_NAMES,
  WEEKDAY_NAMES,
  dayKey,
  dayStart,
  isPaperDue,
  mergeHeadlines,
  projectEnergy,
  seniorityPct,
  weekday,
  xpForLevel,
} from '@irongate/rules';
import type { LetterView, LiveHeadline, PaperView } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { restedCapToday } from './modifiers';
import { frontPageTerm, frontPageView, politicalHeadlines, politicsSummary } from './politicsService';
import {
  ambitionStatus,
  energyState,
  jobView,
  locationRef,
  namedStanding,
  ordersView,
  standingSuccesses,
  toCharacterView,
  welcomeLanding,
} from './views';

/**
 * §3.3 Morning Paper v1: today's edition (printed at settlement) with the desk's live rows added at
 * read. Dateline from the real UTC date, no year (designer answer §12 Q6).
 */
export async function getPaper(deps: {
  user: SessionUser;
  content: GameContent;
  now: number;
}): Promise<PaperView> {
  const { content, now } = deps;
  const { doc: c, city: homeState } = await loadCharacter(deps.user, content, now);
  const today = dayKey(now);
  const entry = await PaperEntry.findOne({ characterId: c._id, day: today }).lean();
  if (!entry) throw new Error(`no edition for day ${today}: settlement should have printed it`);
  const city = content.city(entry.cityId);
  const date = new Date(dayStart(today));
  const cap = restedCapToday(content, homeState, today);
  const energy = projectEnergy(energyState(c), now, ENERGY.max, cap);
  // ADR 0023: the political sections are live at read; the front page on a winner's first paper
  // of the term; political headlines merged into the stored edition by priority.
  const term = await frontPageTerm(c, today);
  const frontPage = term ? await frontPageView(content, c, term) : null;
  const live = (await politicalHeadlines(content, c, homeState, today)).filter(
    (h) =>
      !(
        frontPage &&
        content.headlines.find((t) => t.id === h.templateId)?.when.some((w) => w.kind === 'seatWon')
      ),
  );
  const stored: LiveHeadline[] = entry.headlines.map((h) => ({
    templateId: h.templateId,
    group: h.group,
    priority: h.priority ?? content.headlines.find((t) => t.id === h.templateId)?.priority ?? 0,
    headline: h.headline,
    ...(h.deck ? { deck: h.deck } : {}),
  }));
  // The welcome edition keeps its welcome and arrival notice ahead of the phase line.
  const headlines = mergeHeadlines(stored, live, { storedFirst: entry.firstEdition });
  const job = jobView(content, c, today);
  const readAt = entry.readAt ? entry.readAt.getTime() : null;
  const wearing = toCharacterView(c, now, content, readAt, { city: homeState }).wearing;
  // §3.3 v2 Letters, live at read: the Ambition chapter when it is ready or mid-way.
  const status = ambitionStatus(content, c, today);
  const chapter = c.ambition ? content.chapter(c.ambition.id, c.ambition.chapter) : undefined;
  const letters: LetterView[] =
    chapter?.story && (status.kind === 'ready' || status.kind === 'midway')
      ? [
          {
            kind: 'chapter',
            from: chapter.story.letterFrom,
            // The Letters row names what is in the letter (design §17.7: "His election bill").
            title: chapter.story.choose.title,
            chapter: chapter.n,
            status: status.kind,
            energy: chapter.story.check.energy,
          },
        ]
      : [];
  const home = content.city(c.homeCityId);

  return {
    day: today,
    firstEdition: entry.firstEdition,
    paper: city?.paper ?? {
      name: 'The Irongate Herald',
      shortName: 'Herald',
      strapline: '',
      price: '5 marks',
    },
    dateline: {
      weekday: WEEKDAY_NAMES[weekday(today)],
      date: `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`,
      city: city?.name ?? entry.cityId,
    },
    headlines: headlines.map((h) => ({
      group: h.group,
      headline: h.headline,
      ...(h.deck ? { deck: h.deck } : {}),
      ...(h.until !== undefined ? { until: h.until } : {}),
    })),
    orders: ordersView(content, c, today),
    desk: {
      salary: entry.desk.salary
        ? {
            jobName: entry.desk.salary.jobName,
            days: entry.desk.salary.days,
            perDay: entry.desk.salary.perDay,
            // Review 1: editions settled before the wage carry no seniority line.
            seniority: {
              days: entry.desk.salary.seniority?.days ?? 0,
              pct: Math.round(seniorityPct(entry.desk.salary.seniority?.days ?? 0) * 100),
              amount: entry.desk.salary.seniority?.amount ?? 0,
            },
            total: entry.desk.salary.total,
            ordinance: entry.desk.salary.ordinance ?? null,
          }
        : null,
      stipend: entry.desk.stipend ?? null,
      deposits: entry.desk.deposits ?? null,
      restedBanked: entry.desk.restedBanked,
      daysSinceLastPaper: entry.desk.daysSinceLastPaper,
      yesterday: entry.desk.yesterday,
      jobName: job?.name ?? null,
      energy: { value: energy.value, max: energy.max, fullAt: energy.fullAt },
      rested: { value: energy.rested, cap },
      level: {
        level: c.level,
        xpToNext: xpForLevel(c.level + 1) - c.xp,
        next: c.level + 1,
        statPointsPending: c.statPointsPending,
      },
      job: job ? { name: job.name, dailyPay: job.dailyPay, seniority: job.seniority } : null,
      // Review 1: with no job, the home city's places with a Jobs card, in pin order.
      oneOfUsPc: entry.desk.oneOfUsPc ?? 0,
      jobPlaces: (job ? [] : (home?.locations ?? []))
        .filter((l) => content.jobsAt(l.id).length > 0)
        .map((l) => locationRef(content, l.id)),
      standing: namedStanding(content, c.cityId, standingSuccesses(c, c.cityId)),
      wearing: wearing ? { name: wearing.name, cha: wearing.cha } : null,
    },
    letters,
    // The first edition's "To the city" opens slot A's pin (§7.5; review 1: by the best stat).
    landing: entry.firstEdition && home ? welcomeLanding(content, c) : null,
    readAt,
    due: isPaperDue({
      editionReadAt: readAt,
      lastActionAt: c.lastActionAt ? c.lastActionAt.getTime() : null,
      now,
    }),
    pollingDay: await politicsSummary(content, c, homeState, now, today),
    frontPage,
  };
}

/** Mark an edition read: a conditional update to a target state, idempotent (ADR 0008). */
export async function markPaperRead(deps: {
  user: SessionUser;
  content: GameContent;
  now: number;
  day: number;
}): Promise<{ readAt: number | null }> {
  const { doc } = await loadCharacter(deps.user, deps.content, deps.now);
  await PaperEntry.updateOne(
    { characterId: doc._id, day: deps.day, readAt: null },
    { $set: { readAt: new Date(deps.now) } },
  );
  // ADR 0023: the ELECTED stamp animates once. A conditional $set where null: idempotent.
  const today = dayKey(deps.now);
  if (deps.day === today) {
    await OfficeTerm.updateMany(
      {
        'holder.kind': 'player',
        'holder.characterId': doc._id,
        fromDay: { $lte: today },
        toDay: { $gt: today },
        frontPageSeenAt: null,
      },
      { $set: { frontPageSeenAt: new Date(deps.now) } },
    );
  }
  const entry = await PaperEntry.findOne({ characterId: doc._id, day: deps.day }, { readAt: 1 }).lean();
  return { readAt: entry?.readAt ? entry.readAt.getTime() : null };
}
