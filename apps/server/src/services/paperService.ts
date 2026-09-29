import type { GameContent } from '@irongate/content';
import { PaperEntry } from '@irongate/db';
import {
  MONTH_NAMES,
  RESTED,
  WEEKDAY_NAMES,
  dayKey,
  dayStart,
  isPaperDue,
  projectEnergy,
  weekday,
  xpForLevel,
} from '@irongate/rules';
import type { LetterView, PaperView } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import {
  ambitionStatus,
  energyState,
  jobView,
  namedStanding,
  ordersView,
  sickDaysLeft,
  standingSuccesses,
  toCharacterView,
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
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const today = dayKey(now);
  const entry = await PaperEntry.findOne({ characterId: c._id, day: today }).lean();
  if (!entry) throw new Error(`no edition for day ${today}: settlement should have printed it`);
  const city = content.city(entry.cityId);
  const date = new Date(dayStart(today));
  const energy = projectEnergy(energyState(c), now);
  const job = jobView(content, c, today);
  const readAt = entry.readAt ? entry.readAt.getTime() : null;
  const wearing = toCharacterView(c, now, content, readAt).wearing;
  // §3.3 v2 Letters, live at read: the Ambition chapter when it is ready or mid-way.
  const status = ambitionStatus(content, c, today);
  const chapter = c.ambition ? content.chapter(c.ambition.id, c.ambition.chapter) : undefined;
  const letters: LetterView[] =
    chapter?.story && (status.kind === 'ready' || status.kind === 'midway')
      ? [
          {
            kind: 'chapter',
            from: chapter.story.letterFrom,
            title: chapter.title,
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
    headlines: entry.headlines.map((h) => ({
      group: h.group,
      headline: h.headline,
      ...(h.deck ? { deck: h.deck } : {}),
    })),
    orders: ordersView(content, c, today),
    desk: {
      salary: entry.desk.salary
        ? {
            jobName: entry.desk.salary.jobName,
            days: entry.desk.salary.days,
            perDay: entry.desk.salary.perDay,
            total: entry.desk.salary.total,
          }
        : null,
      streak: entry.desk.streak,
      restedBanked: entry.desk.restedBanked,
      daysSinceLastPaper: entry.desk.daysSinceLastPaper,
      yesterday: entry.desk.yesterday,
      jobName: job?.name ?? null,
      energy: { value: energy.value, max: energy.max, fullAt: energy.fullAt },
      rested: { value: energy.rested, cap: RESTED.cap },
      level: {
        level: c.level,
        xpToNext: xpForLevel(c.level + 1) - c.xp,
        next: c.level + 1,
        statPointsPending: c.statPointsPending,
      },
      workStreak: job ? { streak: job.streak, sickDaysLeft: sickDaysLeft(c, today) } : null,
      standing: namedStanding(content, c.cityId, standingSuccesses(c, c.cityId)),
      wearing: wearing ? { name: wearing.name, cha: wearing.cha } : null,
    },
    letters,
    // The first edition's "To the city" opens the first pin's sheet (§7.5; designer answer §13 Q9).
    landing:
      entry.firstEdition && home?.locations[0] ? { cityId: home.id, locationId: home.locations[0].id } : null,
    readAt,
    due: isPaperDue({
      editionReadAt: readAt,
      lastActionAt: c.lastActionAt ? c.lastActionAt.getTime() : null,
      now,
    }),
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
  const entry = await PaperEntry.findOne({ characterId: doc._id, day: deps.day }, { readAt: 1 }).lean();
  return { readAt: entry?.readAt ? entry.readAt.getTime() : null };
}
