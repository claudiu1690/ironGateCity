import { createHash } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { City, District, FactionState, Nation, isDuplicateKeyError } from '@irongate/db';
import type {
  CityDoc,
  DistrictDoc,
  FactionStateDoc,
  LawProjection,
  NationDoc,
  NationNewsItem,
} from '@irongate/db';
import {
  FACTION_IDS,
  PARLIAMENT,
  averageShares,
  createRng,
  dayKey,
  drawOrderOf,
  moraleState,
  nationWork,
  nationalControl,
  termOf,
} from '@irongate/rules';
import type { DayKey, FactionId, NationWork, NationalControl, OpinionShares } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { captureException } from '../sentry';
import { ensureCityDay } from './cityDay';
import { AlreadySettled } from './cityDayCore';
import { setLawBook } from './lawBook';
import { NATION_STEPS } from './nationSteps';
import type { NationStep } from './nationSteps';
import { inTransaction } from './txn';

/**
 * Slice 7 (docs/tech/slice-7.md §3.1, §8.2; ADR 0043): the nation's day. One document (`nation`,
 * `_id: 'republic'`) settled boundary by boundary after the five cities, each boundary one
 * transaction guarded by `world.settledDay: d − 1`; every derived document has a natural key, so a
 * second runner aborts and re-reads. The decisions are pure functions in `@irongate/rules`.
 *
 * The boundary's order is §3.1's. This file owns (1) National Control, the laws' expiries and
 * (8) the news and the write; the other steps are window handlers listed in `nationSteps.ts`, run in
 * the order of `NATION_STEP_ORDER`, each in the boundary's transaction (see `NationBoundaryCtx`).
 */

export const NATION_ID = 'republic' as const;

/** The days of news and of the law history kept (tech design §5.1). */
const NEWS_BOUNDARIES = 14;
const HISTORY_DAYS = 60;
const CONTROL_LOG = 60;

/** Test seams (§8.6): a control override consumed once, and a count of each boundary's runs. */
export const nationDayHooks: {
  controlOverride?: Record<FactionId, number> | null;
  onBoundary?: (d: DayKey) => void;
  onRetry?: (d: DayKey) => void;
} = {};

/**
 * What a window handler gets. Handlers write their own documents in `session`; they change the
 * nation document only through `government`, `laws` and `set` (written once, with the guard, at the
 * end of the boundary), and add lines to `news`.
 */
export interface NationBoundaryCtx {
  content: GameContent;
  /** The boundary into day `d`. */
  d: DayKey;
  now: number;
  session: ClientSession;
  /** The document as it was before this boundary (do not mutate). */
  nation: NationDoc;
  /** The three `factions` documents, by faction. */
  factions: Record<FactionId, FactionStateDoc>;
  /** The council cities as settled for `d` (the capital's districts on `districts`). */
  cities: Map<string, CityDoc | null>;
  districts: DistrictDoc[];
  /** This boundary's National Control snapshot (step 1). */
  control: NationalControl;
  /** The term-day work at `d` (§3.1's table, `nationWork`). */
  work: NationWork;
  /** `true` when the bootstrap runs its own day's window work (no boundary steps before it). */
  bootstrap: boolean;
  /** Mutable copies written at the end of the boundary. */
  government: NationDoc['government'];
  laws: NationDoc['laws'];
  /** Extra `$set`s on the nation document (dotted paths allowed); written with the guard. */
  set: Record<string, unknown>;
  /** The lines this boundary adds to `nation.news` (day `d`). */
  news: NationNewsItem[];
}

/**
 * A deep copy of a stored shape that keeps ObjectIds and Dates as they are (lane 2's fix:
 * `structuredClone` turns a BSON ObjectId into a plain object, which the boundary then wrote back as
 * garbage in `government.president.termId` and `laws.inForce[].docId`).
 */
function cloneDoc<T>(x: T): T {
  if (Array.isArray(x)) return x.map((v) => cloneDoc(v)) as T;
  if (x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype) {
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cloneDoc(v)])) as T;
  }
  return x;
}

/** A news line for the boundary. */
export const newsItem = (
  d: DayKey,
  id: string,
  priority: number,
  factionId: FactionId | null,
  facts: Record<string, unknown>,
): NationNewsItem => ({ day: d, id, priority, factionId, facts });

/** The draw for the republic's first President (`sha256('nation:' + day)`). */
const nationSeed = (day: DayKey): string =>
  createHash('sha256').update(`nation:${day}`).digest('hex').slice(0, 32);

// ---------------------------------------------------------------------------------------------
// Reads shared by the bootstrap and the boundary.
// ---------------------------------------------------------------------------------------------

interface WorldRead {
  cities: Map<string, CityDoc | null>;
  districts: DistrictDoc[];
  factions: Record<FactionId, FactionStateDoc>;
}

async function readWorld(content: GameContent, session: ClientSession): Promise<WorldRead> {
  const ids = content.councilCities().map((c) => c.id);
  const docs = await City.find({ _id: { $in: ids } })
    .session(session)
    .lean<CityDoc[]>();
  const cities = new Map<string, CityDoc | null>(
    ids.map((id) => [id, docs.find((c) => c._id === id) ?? null]),
  );
  const capitals = ids.filter((id) => content.isDistricted(id));
  const districts = capitals.length
    ? await District.find({ cityId: { $in: capitals } })
        .session(session)
        .lean<DistrictDoc[]>()
    : [];
  const fs = await FactionState.find({}).session(session).lean<FactionStateDoc[]>();
  const factions = Object.fromEntries(fs.map((f) => [f._id, f])) as Record<FactionId, FactionStateDoc>;
  return { cities, districts, factions };
}

/** A city's shares for the control snapshot: the capital's district average, else its meter, else content. */
function sharesOf(content: GameContent, cityId: string, w: WorldRead): OpinionShares {
  if (content.isDistricted(cityId)) {
    const ds = w.districts.filter((x) => x.cityId === cityId).map((x) => x.opinion);
    if (ds.length > 0) return averageShares(ds);
  }
  const doc = w.cities.get(cityId);
  if (doc?.opinion) return doc.opinion;
  return content.city(cityId)!.baselineOpinion;
}

/** Step 1 (design §8): National Control from the five cities as settled; a home city in Unrest counts half. */
export function controlOf(content: GameContent, w: WorldRead): NationalControl {
  const weights = content.nationalWeights();
  const cities = content
    .councilCities()
    .filter((c) => weights[c.id] !== undefined)
    .map((c) => {
      const doc = w.cities.get(c.id);
      const unrest =
        !!c.homeFactionId &&
        (doc?.morale?.state === 'unrest' ||
          (doc?.opinion ? moraleState(doc.opinion[c.homeFactionId]) === 'unrest' : false));
      return { cityId: c.id, weight: weights[c.id]!, unrest, shares: sharesOf(content, c.id, w) };
    });
  const ctl = nationalControl({ cities });
  const override = nationDayHooks.controlOverride;
  if (!override) return ctl;
  nationDayHooks.controlOverride = null;
  const sum = FACTION_IDS.reduce((s, f) => s + override[f], 0) || 1;
  const controlShare = Object.fromEntries(FACTION_IDS.map((f) => [f, (100 * override[f]) / sum])) as Record<
    FactionId,
    number
  >;
  let leader: FactionId = FACTION_IDS[0];
  for (const f of FACTION_IDS) if (controlShare[f] > controlShare[leader]) leader = f;
  return {
    ...ctl,
    shares: { ...override, neutral: Math.max(0, 100 - sum) } as OpinionShares,
    controlShare,
    leader,
  };
}

const factionDoc = (id: FactionId): Omit<FactionStateDoc, 'createdAt' | 'updatedAt'> => ({
  _id: id,
  chair: null,
  orders: { current: null, next: null },
  rules: [],
  fixtures: [],
  pushDays: [],
  secretaryBillIndex: 0,
});

// ---------------------------------------------------------------------------------------------
// Running the steps.
// ---------------------------------------------------------------------------------------------

async function runSteps(ctx: NationBoundaryCtx, steps: readonly NationStep[]): Promise<void> {
  for (const step of steps) for (const handler of NATION_STEPS[step]) await handler(ctx);
}

/** §3.1's order after the control snapshot: the window handlers, then the expiries. */
export const NATION_STEP_ORDER: readonly NationStep[] = [
  'push',
  'chair',
  'divisions',
  'enactments',
  'termWork',
  'monday',
  'clerk',
] as const;

/** The bootstrap runs its own day's window work only (ADR 0043, phase A's note). */
const BOOTSTRAP_STEPS: readonly NationStep[] = ['termWork', 'monday'];

/** The laws' projection rows ending at or before `d` move to history (expiry by the calendar). */
function expireLaws(ctx: NationBoundaryCtx): void {
  const keep: LawProjection[] = [];
  for (const l of ctx.laws.inForce) {
    if (l.toDay <= ctx.d) {
      ctx.laws.history.push(l);
      const law = ctx.content.law(l.lawId);
      ctx.news.push(
        newsItem(ctx.d, 'nl.law-expired', 2, null, { lawId: l.lawId, law: law?.name ?? l.lawId }),
      );
    } else keep.push(l);
  }
  ctx.laws.inForce = keep;
  ctx.laws.history = ctx.laws.history.filter((l) => l.toDay > ctx.d - HISTORY_DAYS);
}

/** Step 8's control lines: a change of leader (priority 1) or the standing line (3). */
function controlNews(ctx: NationBoundaryCtx): void {
  const prev = ctx.nation.control;
  const ranked = [...FACTION_IDS].sort((a, b) => ctx.control.controlShare[b] - ctx.control.controlShare[a]);
  const pct = (f: FactionId) => Math.round(ctx.control.controlShare[f] * 10) / 10;
  const facts = {
    leader: ranked[0],
    leaderShare: pct(ranked[0]!),
    second: ranked[1],
    secondShare: pct(ranked[1]!),
    third: ranked[2],
    thirdShare: pct(ranked[2]!),
    lawsCount: ctx.laws.inForce.length,
  };
  if (prev && prev.leader !== ctx.control.leader) {
    // The city whose shares moved most toward the new leader.
    let cityMoved: string | null = null;
    let best = -Infinity;
    for (const c of ctx.control.cities) {
      const before = prev.cities.find((x) => x.cityId === c.cityId);
      if (!before) continue;
      const delta = c.shares[ctx.control.leader] - before.shares[ctx.control.leader];
      if (delta > best) {
        best = delta;
        cityMoved = c.cityId;
      }
    }
    ctx.news.push(
      newsItem(ctx.d, 'nl.leader-change', 1, null, {
        ...facts,
        cityMoved: cityMoved ? (ctx.content.city(cityMoved)?.name ?? cityMoved) : null,
      }),
    );
  }
  ctx.news.push(newsItem(ctx.d, 'nl.leader-line', 3, null, facts));
}

function controlDoc(ctl: NationalControl, d: DayKey): NationDoc['control'] {
  return {
    day: d,
    shares: ctl.shares,
    controlShare: ctl.controlShare,
    leader: ctl.leader,
    cities: ctl.cities,
  };
}

// ---------------------------------------------------------------------------------------------
// The bootstrap and the boundary.
// ---------------------------------------------------------------------------------------------

/**
 * §8.2: insert `nation` (`_id` unique; E11000 is success) and the three `factions` documents: the
 * current term, the President the figure of the day's draw (`via: 'bootstrap'`), Parliament
 * 20 / 20 / 20 with no players, the control snapshot, no laws, `settledDay = bootstrappedDay =
 * today`. Then the bootstrap day's own window work (a window opening today runs; one already open
 * is skipped by `nationWork`).
 */
export async function bootstrapNation(
  content: GameContent,
  now: number,
  session: ClientSession,
): Promise<void> {
  const today = dayKey(now);
  const existing = await Nation.findById(NATION_ID).session(session).lean<NationDoc>();
  if (existing) throw new AlreadySettled();
  for (const f of FACTION_IDS) {
    await FactionState.updateOne({ _id: f }, { $setOnInsert: factionDoc(f) }, { upsert: true, session });
  }
  const w = await readWorld(content, session);
  const ctl = controlOf(content, w);
  const term = termOf(today);
  const first = drawOrderOf(createRng(nationSeed(today)))[0]!;
  const figure = content.figure(first);
  const seats = Object.fromEntries(
    FACTION_IDS.map((f) => [f, PARLIAMENT.seats / FACTION_IDS.length]),
  ) as Record<FactionId, number>;
  const government: NationDoc['government'] = {
    president: {
      holder: {
        kind: 'npc',
        npcId: figure?.npcId ?? `figure.${first}`,
        name: figure?.name ?? first,
        factionId: first,
      },
      termId: null,
      since: today,
      consecutive: 1,
      via: 'bootstrap',
    },
    runnerUp: null,
    parliament: {
      termIndex: term.index,
      seats,
      players: Object.fromEntries(FACTION_IDS.map((f) => [f, 0])) as Record<FactionId, number>,
    },
    lastRemovalDay: null,
    autoRemovalTerm: null,
  };
  const doc: Omit<NationDoc, 'createdAt' | 'updatedAt'> = {
    _id: NATION_ID,
    world: { settledDay: today, bootstrappedDay: today },
    term: { index: term.index, fromDay: term.fromDay, toDay: term.toDay },
    government,
    control: controlDoc(ctl, today),
    controlLog: [{ day: today, shares: ctl.shares, leader: ctl.leader }],
    laws: { inForce: [], history: [] },
    news: [],
  };
  await Nation.create([doc], { session });
  const ctx: NationBoundaryCtx = {
    content,
    d: today,
    now,
    session,
    nation: doc as NationDoc,
    factions: w.factions,
    cities: w.cities,
    districts: w.districts,
    control: ctl,
    work: nationWork(today, today),
    bootstrap: true,
    government: cloneDoc(government),
    laws: { inForce: [], history: [] },
    set: {},
    news: [],
  };
  await runSteps(ctx, BOOTSTRAP_STEPS);
  await Nation.updateOne(
    { _id: NATION_ID },
    { $set: { government: ctx.government, laws: ctx.laws, news: ctx.news, ...ctx.set } },
    { session },
  );
}

/**
 * §8.2: the boundary into `d`, in one transaction. Reads the nation (settled for `d − 1`, else
 * `AlreadySettled`), the cities and the factions; runs §3.1's steps; writes the nation under the guard.
 */
export async function processNationBoundary(
  content: GameContent,
  d: DayKey,
  now: number,
  session: ClientSession,
): Promise<void> {
  const nation = await Nation.findById(NATION_ID).session(session).lean<NationDoc>();
  if (!nation || nation.world.settledDay !== d - 1) throw new AlreadySettled();
  nationDayHooks.onBoundary?.(d);
  const w = await readWorld(content, session);
  // 1. National Control.
  const control = controlOf(content, w);
  const ctx: NationBoundaryCtx = {
    content,
    d,
    now,
    session,
    nation,
    factions: w.factions,
    cities: w.cities,
    districts: w.districts,
    control,
    work: nationWork(d, nation.world.bootstrappedDay),
    bootstrap: false,
    government: cloneDoc(nation.government),
    laws: cloneDoc(nation.laws),
    set: {},
    news: [],
  };
  // 2–7. The window handlers (lane 2's steps; §3.1's order).
  await runSteps(ctx, NATION_STEP_ORDER);
  // The laws ending at `d` (after the enactments, which may end a law at `d` themselves).
  expireLaws(ctx);
  // 8. The news, the log, the term, the guard.
  controlNews(ctx);
  const term = termOf(d);
  const keepNews = (nation.news ?? []).filter((n) => n.day > d - NEWS_BOUNDARIES);
  const res = await Nation.updateOne(
    { _id: NATION_ID, 'world.settledDay': d - 1 },
    {
      $set: {
        'world.settledDay': d,
        term: { index: term.index, fromDay: term.fromDay, toDay: term.toDay },
        government: ctx.government,
        laws: ctx.laws,
        control: controlDoc(control, d),
        controlLog: [
          ...(nation.controlLog ?? []),
          { day: d, shares: control.shares, leader: control.leader },
        ].slice(-CONTROL_LOG),
        news: [...keepNews, ...ctx.news],
        ...ctx.set,
      },
    },
    { session },
  );
  if (res.matchedCount === 0) throw new AlreadySettled();
}

const isConflict = (err: unknown) =>
  err instanceof AlreadySettled ||
  isDuplicateKeyError(err) ||
  (typeof err === 'object' &&
    err !== null &&
    ((err as { code?: unknown }).code === 112 ||
      ((err as { errorLabels?: unknown }).errorLabels instanceof Array &&
        (err as { errorLabels: string[] }).errorLabels.includes('TransientTransactionError'))));

/**
 * §8.2: bootstrap when absent, then each boundary in `(settledDay, today]` in its own transaction,
 * oldest first. The cities must already be settled for today (`ensureNationDay`, the job). Safe to race.
 */
export async function settleNationDay(content: GameContent, now: number): Promise<NationDoc> {
  const today = dayKey(now);
  for (let guard = 0; guard < 1_000; guard++) {
    const nation = await Nation.findById(NATION_ID).readConcern('majority').lean<NationDoc>();
    if (nation && nation.world.settledDay >= today) {
      setLawBook(nation, content);
      return nation;
    }
    const d = nation ? nation.world.settledDay + 1 : today;
    try {
      await inTransaction((session) =>
        nation ? processNationBoundary(content, d, now, session) : bootstrapNation(content, now, session),
      );
    } catch (err) {
      if (!isConflict(err)) throw err;
      nationDayHooks.onRetry?.(d);
    }
  }
  throw new Error('the nation day did not converge');
}

/** Every council city settled for today, the capital first (its count is the biggest). */
async function settleCities(content: GameContent, now: number): Promise<void> {
  const cities = [...content.councilCities()].sort(
    (a, b) => Number(content.isDistricted(b.id)) - Number(content.isDistricted(a.id)),
  );
  for (const c of cities) await ensureCityDay(content, c.id, now);
}

/**
 * §7.1, the read path: one read of `nation` by `_id`; when it is behind today, every city is settled
 * for today first, then the nation's boundaries. A failure goes to Sentry and the request goes on
 * with the last stored document (national acts then refuse `NATION_NOT_READY`).
 */
export async function ensureNationDay(content: GameContent, now: number): Promise<NationDoc | null> {
  const today = dayKey(now);
  const nation = await Nation.findById(NATION_ID).lean<NationDoc>();
  if (nation && nation.world.settledDay >= today) {
    setLawBook(nation, content);
    return nation;
  }
  try {
    await settleCities(content, now);
    return await settleNationDay(content, now);
  } catch (err) {
    captureException(err, { where: 'ensureNationDay' });
    console.error(`[nation-day] ${(err as Error).message}`);
    const last = await Nation.findById(NATION_ID).lean<NationDoc>();
    if (last) setLawBook(last, content);
    return last;
  }
}

/** The worker's job and the e2e hook: the cities, then the nation. */
export async function runNationDay(content: GameContent, now: number): Promise<{ settledDay: DayKey }> {
  await settleCities(content, now);
  const n = await settleNationDay(content, now);
  return { settledDay: n.world.settledDay };
}

/** The nation as settled for today, or `NATION_NOT_READY` for a national act (§7.1). */
export function isNationReady(nation: NationDoc | null, now: number): nation is NationDoc {
  return !!nation && nation.world.settledDay >= dayKey(now);
}
