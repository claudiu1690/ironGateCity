import { getContent } from '@irongate/content';
import { Character, City, District, IssueModel, Journey, issueDocId } from '@irongate/db';
import type { CityDoc } from '@irongate/db';
import { dayKey, dayStart, weekOf, xpForLevel } from '@irongate/rules';
import type { DayKey, FactionId, OpinionShares } from '@irongate/rules';
import { settleCityDay } from '../src/services/cityDay';
import { callerFor } from './helpers';
import { player } from './politics.helpers';
import type { Player } from './politics.helpers';

/** Slice-4 test helpers: travellers, residents, the week's Issues and a district's meter. */

export const content = getContent();
export const at = (day: number, hour = 9) => dayStart(day) + hour * 3_600_000;

/**
 * A reference recruit at Level 10 (and the given FXP, so a Rank), with Iron, standing where asked
 * and living where asked (every window open, as the e2e hook does).
 */
export async function traveller(
  clock: { now: () => number },
  opts: {
    name?: string;
    factionId?: FactionId;
    fxp?: number;
    level?: number;
    iron?: number;
    pc?: number;
    cityId?: string;
    residence?: {
      cityId: string;
      districtId: string | null;
      windows?: Partial<Record<'votesFromDay' | 'standsFromDay' | 'canMoveFromDay' | 'sinceDay', number>>;
    };
    irongateSuccesses?: number;
    successes?: number;
  } = {},
): Promise<Player> {
  const p = await player(clock, {
    ...(opts.name ? { name: opts.name } : {}),
    ...(opts.factionId ? { factionId: opts.factionId } : {}),
    fxp: opts.fxp ?? 400,
    ...(opts.pc !== undefined ? { pc: opts.pc } : {}),
    ...(opts.successes !== undefined ? { successes: opts.successes } : {}),
  });
  const level = opts.level ?? 10;
  const set: Record<string, unknown> = {
    level,
    xp: xpForLevel(level),
    iron: opts.iron ?? 1_000,
    'energy.value': 100,
    'energy.updatedAt': new Date(clock.now()),
  };
  if (opts.cityId) set.cityId = opts.cityId;
  if (opts.residence) {
    set.residence = {
      cityId: opts.residence.cityId,
      districtId: opts.residence.districtId,
      sinceDay: 0,
      votesFromDay: 0,
      standsFromDay: 0,
      canMoveFromDay: 0,
      ...opts.residence.windows,
    };
  }
  if (opts.irongateSuccesses !== undefined) {
    const doc = (await Character.findById(p.id).lean())!;
    set.localStanding = [
      ...doc.localStanding.filter((x) => x.cityId !== 'irongate'),
      { cityId: 'irongate', successes: opts.irongateSuccesses },
    ];
  }
  await Character.updateOne({ _id: p.id }, { $set: set, $inc: { version: 1 } });
  return { ...p, caller: callerFor(p.user, clock.now) };
}

/** Make `issueIds` this week's live Issues of a city (in order), replacing the draw. */
export async function setLiveIssues(cityId: string, issueIds: string[], day: DayKey): Promise<string[]> {
  const week = weekOf(day);
  await settleCityDay(content, cityId, at(day));
  await IssueModel.deleteMany({ cityId, weekDay: week });
  const docs = issueIds.map((issueId, i) => {
    const where = content.issuesFor(cityId).find((x) => x.issue.id === issueId)!;
    return {
      _id: issueDocId(cityId, week, issueId),
      cityId,
      districtId: where.districtId,
      issueId,
      weekDay: week,
      order: (i + 1) as 1 | 2,
      seed: 'test',
      status: 'live',
      momentum: { vanguard: 0, collective: 0, alliance: 0 },
      result: null,
      resolvedAt: null,
    };
  });
  if (docs.length) await IssueModel.insertMany(docs);
  const city = (await City.findById(cityId).lean<CityDoc>())!;
  await City.updateOne(
    { _id: cityId },
    {
      $set: {
        issues: {
          weekDay: week,
          live: docs.map((d) => ({
            docId: d._id,
            issueId: d.issueId,
            districtId: d.districtId,
            order: d.order,
          })),
          effects: city.issues?.effects ?? [],
        },
      },
    },
  );
  return docs.map((d) => d._id);
}

/** An Issue effect in force in a city (an owned Issue's week). */
export async function setIssueEffect(
  cityId: string,
  issueId: string,
  fromDay: DayKey,
  toDay: DayKey,
): Promise<void> {
  // Settled first, so a bootstrap does not draw over the effect.
  await settleCityDay(content, cityId, at(fromDay + 1));
  const city = (await City.findById(cityId).lean<CityDoc>())!;
  await City.updateOne(
    { _id: cityId },
    {
      $set: {
        'issues.effects': [
          ...(city.issues?.effects ?? []),
          { issueId, docId: issueDocId(cityId, fromDay, issueId), ownerId: 'collective', fromDay, toDay },
        ],
      },
    },
  );
}

/** Set a district's meter and its close-race state for today. */
export async function setDistrict(
  id: string,
  opinion: OpinionShares,
  state: { battleground: boolean; controlledBy?: FactionId | null },
  day: DayKey,
): Promise<void> {
  await District.updateOne(
    { _id: id },
    {
      $set: {
        opinion,
        state: {
          day,
          battleground: state.battleground,
          controlledBy: state.controlledBy ?? null,
          previous: { battleground: state.battleground, controlledBy: state.controlledBy ?? null },
        },
      },
    },
  );
}

export const today = (clock: { now: () => number }) => dayKey(clock.now());

/**
 * Review 4 (ADR 0075 §4): the card is withheld until its moment, drawn at boarding in 0.20–0.80 of
 * the journey. Moves the test clock to that moment (never back), so the card can be read and answered.
 */
export function toTheCard(
  clock: { now: () => number; set: (ms: number) => void },
  journey: { cardAt: number | null },
): void {
  if (journey.cardAt !== null && clock.now() < journey.cardAt) clock.set(journey.cardAt);
}

/**
 * Review 4 (ADR 0075): the journey's card opens now (its stored moment set to `at`), for tests whose
 * figures hang on the clock at boarding (Heat cools as the clock moves). Nothing else changes.
 */
export async function cardNow(journeyId: string, at: number): Promise<void> {
  await Journey.updateOne({ _id: journeyId, card: { $ne: null } }, { $set: { 'card.at': new Date(at) } });
}
