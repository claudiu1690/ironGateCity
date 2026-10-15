import type { GameContent } from '@irongate/content';
import { Character, City, Nation, OfficeTerm } from '@irongate/db';
import type { CharacterDoc, CityDoc, NationDoc, OfficeTermDoc, RequestKind } from '@irongate/db';
import { OFFICES, dayKey, fillTemplate } from '@irongate/rules';
import type { DayKey, NationAct, Office, PoliticalResult, ServiceRecord } from '@irongate/rules';
import type { ClientSession, Types } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { residenceOf } from './residence';
import { withRequestKey } from './requestKey';
import { DayChanged, VersionConflict } from './txn';
import { toCharacterView } from './views';

/**
 * Slice 7 phase B, lane 2 (docs/tech/slice-7.md §7.2, §8.2, §10.1, §18): the frame every national act
 * runs in (the Chair's election, Parliament, the national election, the President, petitions and the
 * vote on the Chair). One ADR 0008 request key per tap; the guards are checked inside the transaction
 * against the session's read (`assertKeyFree` runs first, in `withRequestKey`), so a lost race returns
 * the winner's stored modal and a refusal is computed against committed state, never a stale pre-read.
 */

export interface NationActDeps<I> {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: I & { idempotencyKey: string };
}

export interface NationCtx {
  session: ClientSession;
  c: CharacterDoc;
  now: number;
  today: DayKey;
  /** The republic, read in the session (null before the nation's bootstrap: `NATION_NOT_READY`). */
  nation: NationDoc | null;
}

/** One national act: the request key, a fresh read of the character in the session, then `fn`. */
export async function runNationAct<I extends object, R = PoliticalResult>(
  deps: NationActDeps<I>,
  kind: RequestKind,
  fn: (x: NationCtx) => Promise<R>,
): Promise<R> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const { idempotencyKey, ...input } = deps.input;
  return withRequestKey<R>({
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
      const nation = await Nation.findById('republic').session(session).lean<NationDoc>();
      return fn({ session, c, now, today, nation });
    },
  });
}

/** The republic for an act that needs it (the nation's day has run at least once). */
export function nationOf(x: Pick<NationCtx, 'nation' | 'today'>): NationDoc {
  if (!x.nation || x.nation.world.settledDay < x.today) throw new GameError('NATION_NOT_READY', {}, 'CONFLICT');
  return x.nation;
}

/**
 * Spend Political Capital with the version and `pc ≥ cost` guards (ADR 0018); `extra` is `$set`,
 * `push` is `$push` and `filter` adds set-once guards (a backing's `termBackings.key: { $ne }`).
 */
export async function spendPc(
  x: Pick<NationCtx, 'session' | 'c' | 'today'>,
  cost: number,
  o: { set?: Record<string, unknown>; push?: Record<string, unknown>; filter?: Record<string, unknown> } = {},
): Promise<CharacterDoc> {
  const updated = await Character.findOneAndUpdate(
    { _id: x.c._id, version: x.c.version, 'day.settled': x.today, pc: { $gte: cost }, ...(o.filter ?? {}) },
    {
      $inc: { pc: -cost, version: 1 },
      ...(o.set && Object.keys(o.set).length ? { $set: o.set } : {}),
      ...(o.push && Object.keys(o.push).length ? { $push: o.push } : {}),
    },
    { session: x.session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  return updated as CharacterDoc;
}

/** The modal of a national act (tech design §10.1): content's texts, the server's names and numbers. */
export async function nationResult(
  content: GameContent,
  x: Pick<NationCtx, 'session' | 'now'> & { c: CharacterDoc },
  r: {
    act: NationAct;
    idempotencyKey: string;
    vars: Record<string, string>;
    until?: number | null;
    at?: number | null;
    /** Replaces the content's *Next* line (the veto that is final). */
    next?: string;
    knockOns?: Partial<PoliticalResult['knockOns']>;
    view: PoliticalResult['view'];
  },
): Promise<PoliticalResult> {
  const t = content.politics.results[r.act];
  if (!t) throw new Error(`politics.results.${r.act} is missing`);
  const residenceCityId = residenceOf(x.c).cityId;
  const cityContent = content.city(residenceCityId);
  const paper = cityContent?.paper ?? { name: 'The paper', shortName: 'paper' };
  const vars = { paper: `the ${paper.shortName}`, faction: content.faction(x.c.factionId).name, ...r.vars };
  const city = await City.findById(residenceCityId).session(x.session).lean<CityDoc>();
  const next = r.next ?? (t.next ? fillTemplate(t.next, vars) : undefined);
  return {
    kind: 'political',
    act: r.act,
    stamp: { label: t.stamp, tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: residenceCityId, cityName: cityContent?.name ?? residenceCityId },
    headline: fillTemplate(t.headline, vars),
    body: fillTemplate(t.body, vars),
    ...(next ? { next } : {}),
    until: r.until ?? null,
    at: r.at ?? null,
    knockOns: { pc: null, morale: null, backers: null, ...r.knockOns },
    performedAt: new Date(x.now).toISOString(),
    idempotencyKey: r.idempotencyKey,
    character: toCharacterView(x.c, x.now, content, null, { city }),
    view: r.view,
  };
}

/** A game error from a rules gate's refusal (`RANK` reads as slice 3's `RANK_TOO_LOW`). */
export function refusal(g: { reason: string; need?: number; rung?: string }, extra: Record<string, unknown> = {}): GameError {
  const reason = g.reason === 'RANK' ? 'RANK_TOO_LOW' : g.reason;
  return new GameError(reason as never, {
    ...(g.need !== undefined ? { need: g.need } : {}),
    ...(g.rung !== undefined ? { rung: g.rung } : {}),
    ...extra,
  });
}

/** ADR 0048: the office of a term (absent: council). */
export const officeOf = (t: Pick<OfficeTermDoc, 'office'>): Office => t.office ?? 'council';

/**
 * ADR 0048 (tech design §6.3): a member's service record, read from `officeTerms` (the ladder is a
 * count of completed terms by office; the term limits count the chain of terms ending with the one
 * held today). Tenure counts from joining (switching is not built, §22.1 Q30).
 */
export async function serviceRecord(
  c: Pick<CharacterDoc, '_id' | 'rank' | 'createdAt'>,
  today: DayKey,
  session: ClientSession | null = null,
): Promise<ServiceRecord & { terms: OfficeTermDoc[] }> {
  const q = OfficeTerm.find({ 'holder.kind': 'player', 'holder.characterId': c._id });
  const terms = await (session ? q.session(session) : q).lean<OfficeTermDoc[]>();
  const completed = Object.fromEntries(OFFICES.map((o) => [o, 0])) as Record<Office, number>;
  for (const t of terms) if (t.completed) completed[officeOf(t)] += 1;
  const chain = (office: 'chair' | 'president') => {
    const mine = terms.filter((t) => officeOf(t) === office);
    let cur = mine.find((t) => t.fromDay <= today && today < t.toDay && t.vacatedDay == null);
    let n = 0;
    while (cur) {
      n += 1;
      const prevTo = cur.fromDay;
      cur = mine.find((t) => t.toDay === prevTo && t.completed);
    }
    return n;
  };
  return {
    completed,
    consecutive: { chair: chain('chair'), president: chain('president') },
    tenureDays: Math.max(0, today - dayKey(new Date(c.createdAt).getTime())),
    rank: c.rank,
    terms,
  };
}

/** The current term of an office held by the member (re-read in the session: ADR 0020). */
export async function currentTerm(
  session: ClientSession,
  characterId: Types.ObjectId,
  office: Office,
  today: DayKey,
): Promise<OfficeTermDoc | null> {
  return OfficeTerm.findOne({
    office,
    'holder.kind': 'player',
    'holder.characterId': characterId,
    fromDay: { $lte: today },
    toDay: { $gt: today },
    vacatedDay: null,
  })
    .session(session)
    .lean<OfficeTermDoc>();
}
