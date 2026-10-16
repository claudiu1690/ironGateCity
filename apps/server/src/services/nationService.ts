import type { GameContent } from '@irongate/content';
import { City } from '@irongate/db';
import type { CityDoc, NationDoc } from '@irongate/db';
import {
  FACTION_IDS,
  TERM_DAYS,
  dayKey,
  dayStart,
  moraleState,
  nationalPhase,
  nextDate,
  termOf,
} from '@irongate/rules';
import type {
  DayKey,
  FactionId,
  LawBookView,
  NationRepublicView,
  NationalPhase,
  OpinionShares,
  TermDate,
  TermLineView,
} from '@irongate/rules';
import { gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { isContested } from './residence';
import { isNationReady } from './nationDay';

/**
 * Slice 7 (docs/tech/slice-7.md §8.3): the republic's views. `nation.get` is the nation map's bar,
 * the law chips, the pins' second line and the term line (`NationRepublicView`, also carried on
 * slice 4's `NationView` as `republic`). `parliament.laws` is the law book (T15 fills it).
 */

const one = (x: number) => Math.round(x * 10) / 10;

/** The phase's last day (exclusive) and the next date a TermLine names (design §2). */
const PHASE_END: Readonly<Record<NationalPhase, number | null>> = {
  none: null,
  names: TERM_DAYS.nation.pickFrom,
  pick: TERM_DAYS.nation.votesFrom,
  voting: TERM_DAYS.nation.countDay,
  result: 28,
};

export function termLineOf(today: DayKey): TermLineView {
  const t = termOf(today);
  const phase = nationalPhase(today);
  const end = PHASE_END[phase];
  const order: TermDate[] = ['chairNames', 'chairCount', 'nationNames', 'pick', 'votes', 'count', 'office'];
  let next: { what: TermDate; day: DayKey } = { what: 'office', day: nextDate(today, 'office') };
  for (const what of order) {
    const day = nextDate(today, what);
    if (day > today && day < next.day) next = { what, day };
  }
  return {
    termIndex: t.index,
    termDay: t.termDay,
    phase,
    until: end === null ? null : dayStart(t.fromDay + end),
    next,
  };
}

function cityWord(
  content: GameContent,
  cityId: string,
  shares: OpinionShares,
): { word: NationRepublicView['cities'][number]['word']; heldBy: FactionId | null } {
  const home = content.city(cityId)?.homeFactionId;
  if (home) return { word: moraleState(shares[home]), heldBy: home };
  const ranked = [...FACTION_IDS].sort((a, b) => shares[b] - shares[a]);
  const top = ranked[0]!;
  if (shares[top] >= 50) return { word: 'held', heldBy: top };
  if (shares[top] - shares[ranked[1]!] < 5) return { word: 'closeRace', heldBy: null };
  return { word: 'contested', heldBy: null };
}

/** Phase C (screens §2): who holds each council city's chair, for the city card's Governor line. */
export async function governorsByCity(): Promise<Map<string, NonNullable<CityDoc['council']>['governor']>> {
  const docs = await City.find({}, { 'council.governor': 1 }).lean<Array<Pick<CityDoc, '_id' | 'council'>>>();
  return new Map(docs.map((d) => [String(d._id), d.council?.governor ?? null]));
}

export function republicView(
  content: GameContent,
  nation: NationDoc,
  now: number,
  governors: Map<string, NonNullable<CityDoc['council']>['governor']> = new Map(),
): NationRepublicView {
  const today = dayKey(now);
  const ctl = nation.control;
  const phase = nationalPhase(today);
  const act: NationRepublicView['act'] =
    phase === 'names'
      ? { kind: 'standPresident' }
      : phase === 'pick'
        ? { kind: 'pick' }
        : phase === 'voting'
          ? { kind: 'vote' }
          : null;
  return {
    bar: {
      shares: Object.fromEntries(FACTION_IDS.map((f) => [f, one(ctl.controlShare[f])])) as Record<
        FactionId,
        number
      >,
      leader: ctl.leader,
      day: ctl.day,
    },
    laws: nation.laws.inForce
      .filter((l) => l.fromDay <= today && today < l.toDay)
      .map((l) => ({
        lawId: l.lawId,
        name: content.law(l.lawId)?.name ?? l.lawId,
        daysLeft: l.toDay - today,
      })),
    cities: ctl.cities.map((c) => ({
      cityId: c.cityId,
      name: content.city(c.cityId)?.name ?? c.cityId,
      weight: c.weight,
      unrest: c.unrest,
      shares: c.shares,
      ...cityWord(content, c.cityId, c.shares),
      governor: (() => {
        const g = governors.get(c.cityId);
        if (!g) return null;
        return {
          title: isContested(content, c.cityId) ? ('Mayor' as const) : ('Governor' as const),
          name: g.name,
          local: !!g.local,
          factionId: g.factionId,
        };
      })(),
    })),
    term: termLineOf(today),
    act,
  };
}

/** `nation.get`: the republic as settled for today (`NATION_NOT_READY` while it is not). */
export async function getNation(i: {
  user: SessionUser;
  content: GameContent;
  now: number;
}): Promise<NationRepublicView> {
  const loaded = await loadCharacter(i.user, i.content, i.now);
  if (!isNationReady(loaded.nation, i.now)) throw gameError('PRECONDITION_FAILED', 'NATION_NOT_READY');
  return republicView(i.content, loaded.nation, i.now, await governorsByCity());
}

/** `parliament.laws`: the law book (T15 adds the rows' tablers and divisions). */
export async function getLawBook(i: {
  user: SessionUser;
  content: GameContent;
  now: number;
}): Promise<LawBookView> {
  const loaded = await loadCharacter(i.user, i.content, i.now);
  if (!isNationReady(loaded.nation, i.now)) throw gameError('PRECONDITION_FAILED', 'NATION_NOT_READY');
  const today = dayKey(i.now);
  const row = (lawId: string) => {
    const l = i.content.law(lawId);
    return {
      lawId,
      name: l?.name ?? lawId,
      factionId: l?.factionId ?? ('vanguard' as FactionId),
      line: l?.line ?? '',
      days: l?.days ?? 0,
    };
  };
  return {
    inForce: loaded.nation.laws.inForce
      .filter((l) => l.fromDay <= today && today < l.toDay)
      .map((l) => ({
        ...row(l.lawId),
        daysLeft: l.toDay - today,
        by: '',
        passed: { for: 0, against: 0, day: l.fromDay - 1 },
      })),
    catalogue: i.content.laws.map((l) => row(l.id)),
    strike: null,
  };
}
