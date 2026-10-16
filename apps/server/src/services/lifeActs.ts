import type { GameContent } from '@irongate/content';
import { Character, City } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import { dayKey, weekday, WEEKDAY_NAMES } from '@irongate/rules';
import type { DayKey, PoliticalAct, PoliticalResult } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { withRequestKey } from './requestKey';
import type { RequestKind } from '@irongate/db';
import { residenceCityId } from './residence';
import { notFree } from './risk';
import { DayChanged } from './txn';
import { toCharacterView } from './views';

/**
 * Slice 8 phase B, lane 1 (T10, T13, T30, T31; tech design §10.1, §24.7, §24.8): the keyed shell of
 * a life in the city's acts (a buy, a sale, a bribe, a gift, a favour, a hire, a round, a meal):
 * `withRequestKey` (ADR 0008: `assertKeyFree` inside the transaction, the winner's stored result on a
 * lost race), the character re-read in the session with the day's guard, and the political modal.
 */

export type LifeDeps = { user: SessionUser; content: GameContent; now: () => number };

/** *Thursday* for a City Day (the modals' and the cards' weekday words). */
export const weekdayOf = (day: DayKey): string => WEEKDAY_NAMES[weekday(day)] ?? '';

/** *14:05* in UTC (the client re-renders times in the player's clock). */
export const timeOf = (at: number): string => new Date(at).toISOString().slice(11, 16);

/** One keyed act: `fn` reads `c` in the session (the day settled) and returns the modal. */
export async function lifeAct(
  deps: LifeDeps,
  kind: RequestKind,
  idempotencyKey: string,
  input: unknown,
  fn: (i: { session: ClientSession; c: CharacterDoc; now: number; today: DayKey }) => Promise<PoliticalResult>,
): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey,
    kind,
    input,
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      return fn({ session, c, now, today });
    },
  });
}

/** Free to act at a place in this city: not held, no run-in or patrol card waiting, not on a train. */
export function assertHere(c: CharacterDoc, cityId: string): void {
  const blocked = notFree(c);
  if (blocked) throw blocked;
  if (c.journey?.status === 'onTheWay') {
    throw new GameError('IN_TRANSIT', { arrivesAt: new Date(c.journey.arrivesAt).getTime() });
  }
  if (c.cityId !== cityId) throw new GameError('WRONG_CITY', { cityId: c.cityId, actionCityId: cityId }, 'BAD_REQUEST');
}

/** The political modal (tech design §10.1): the residence's masthead, the texts and numbers given. */
export async function lifeResult(i: {
  content: GameContent;
  session: ClientSession;
  before: CharacterDoc;
  updated: CharacterDoc;
  now: number;
  idempotencyKey: string;
  act: PoliticalAct;
  stamp: string;
  headline: string;
  body: string;
  knockOns?: Partial<PoliticalResult['knockOns']>;
  lines?: string[];
  view: PoliticalResult['view'];
  until?: number | null;
}): Promise<PoliticalResult> {
  const { content, updated } = i;
  const residenceCity = await City.findById(residenceCityId(updated)).session(i.session).lean<CityDoc>();
  const home = content.city(residenceCityId(updated));
  const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
  return {
    kind: 'political',
    act: i.act,
    stamp: { label: i.stamp, tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: home?.id ?? updated.cityId, cityName: home?.name ?? updated.cityId },
    headline: i.headline,
    body: i.body,
    until: i.until ?? null,
    at: i.now,
    knockOns: {
      pc: null,
      morale: null,
      backers: null,
      ...(i.before.iron !== updated.iron ? { iron: { before: i.before.iron, after: updated.iron } } : {}),
      ...(i.knockOns ?? {}),
      ...(i.lines && i.lines.length > 0 ? { life: i.lines } : {}),
    },
    performedAt: new Date(i.now).toISOString(),
    idempotencyKey: i.idempotencyKey,
    character: toCharacterView(updated, i.now, content, null, { city: residenceCity }),
    view: i.view,
  };
}
