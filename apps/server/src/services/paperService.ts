import type { GameContent } from '@irongate/content';
import { residenceCityId } from './residence';
import { City, OfficeTerm, PaperEntry } from '@irongate/db';
import type { CityDoc } from '@irongate/db';
import {
  ENERGY,
  MONTH_NAMES,
  WEEKDAY_NAMES,
  councilDay,
  dayKey,
  dayStart,
  isPaperDue,
  mergeHeadlines,
  projectEnergy,
  selectPoliticalHeadlines,
  seniorityPct,
  weekday,
  xpForLevel,
} from '@irongate/rules';
import type { LetterView, LiveHeadline, PaperView, PoliticalFacts } from '@irongate/rules';
import { capitalFacts, paperIssues, visitorFacts } from './capitalPaper';
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
  firstIssueShort,
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
  const cap = restedCapToday(content, homeState, today, c.room);
  const energy = projectEnergy(energyState(c), now, ENERGY.max, cap);
  // ADR 0023: the political sections are live at read; the front page on a winner's first paper
  // of the term; political headlines merged into the stored edition by priority.
  const term = await frontPageTerm(c, today);
  const frontPage = term ? await frontPageView(content, c, term) : null;
  // Slice 4 (tech design §11.2): the residence's live lines (its election, Issues, the moves, heroes
  // and quotes), and for a visitor reading the Herald the capital's own city lines.
  const residenceId = residenceCityId(c);
  const res = await capitalFacts(content, c, residenceId, today, { personal: true, district: true });
  const capital = content.nation.capitalId;
  const visitor: LiveHeadline[] = [];
  if (entry.cityId === capital && residenceId !== capital) {
    const cf = await capitalFacts(content, c, capital, today, { personal: false, district: false });
    cf.facts.firstCapitalArrivalYesterday = res.facts.firstCapitalArrivalYesterday;
    const capDoc = await City.findById(capital).lean<CityDoc>();
    const cal = councilDay(today, content.city(capital)!.council!.offset);
    const facts: PoliticalFacts = {
      ...visitorFacts({ cycleDay: cal.cycleDay, phase: cal.phase }, cf.facts),
      ordinanceFromToday: capDoc?.ordinance?.fromDay === today && capDoc.world?.bootstrappedDay !== today,
      vars: { ...cf.vars, name: c.name, city: content.city(capital)!.name },
      varsByKind: {
        ...cf.varsByKind,
        ...(res.varsByKind.firstCapitalArrivalYesterday
          ? { firstCapitalArrivalYesterday: res.varsByKind.firstCapitalArrivalYesterday }
          : {}),
      },
      until: {
        nominations: dayStart(cal.election.pollsFrom),
        polls: dayStart(cal.election.countDay),
        divide: dayStart(cal.council.divideDay),
      },
    };
    visitor.push(...selectPoliticalHeadlines(content.politicalHeadlinesOf(capital), facts));
  }
  const residenceLines = await politicalHeadlines(content, c, homeState, today, {
    capital: res.facts,
    vars: res.vars,
    varsByKind: res.varsByKind,
  });
  const live = [...residenceLines, ...visitor].filter(
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
  // The residence city's places with a Jobs card; the welcome landing (slice 4, ADR 0026).
  const home = content.city(residenceCityId(c));

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
      // Screens §7.3: the hero and the reporter's quote carry the In Print kicker.
      ...(/.(hero|quoted)$/.test(h.templateId) ? { inPrint: true } : {}),
      // The hero's headline carries the rosette (screens §7.3).
      ...(/.hero$/.test(h.templateId) ? { medal: true } : {}),
    })),
    issues: await paperIssues(content, c, today),
    orders: ordersView(content, c, today, firstIssueShort(content, homeState, today), homeState),
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
      awards: entry.desk.awards ?? null,
      room:
        c.room && c.room.fromDay <= today && today < c.room.untilDay
          ? { untilDay: c.room.untilDay, cap }
          : null,
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
