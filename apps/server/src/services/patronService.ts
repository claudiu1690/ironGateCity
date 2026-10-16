import { copy } from '@irongate/content/copy';
import type { GameContent, Patron } from '@irongate/content';
import { Character, IssueModel } from '@irongate/db';
import type { CharacterDoc, IssueDoc, StoredPatron } from '@irongate/db';
import {
  PATRON,
  PATRON_TIERS,
  addFavour,
  advanceRequests,
  dayKey,
  discretionOn,
  discretionUntil,
  favourGate,
  fillTemplate,
  giftGate,
  nextTier,
  projectHeat,
  protegeLegacy,
  tierAtLeast,
  tierOf,
} from '@irongate/rules';
import type {
  ActionDescriptor,
  DayKey,
  FactionId,
  FavourKnock,
  Outcome,
  PatronCardView,
  PatronClockView,
  PatronId,
  PatronRequestView,
  PatronTier,
  PoliticalResult,
  RequestKnock,
  RequestSpec,
  StoredRequest,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { addLegacyInTx } from './legacyService';
import { addPoints } from './ledger';
import { assertHere, lifeAct, lifeResult, weekdayOf } from './lifeActs';
import type { LifeDeps } from './lifeActs';
import { perksOf } from './personal';
import { residenceCityId } from './residence';
import { heatDoc, heatRateOn, heatTimerOf } from './risk';
import { VersionConflict } from './txn';
import { assetView } from './views';

/**
 * Slice 8 phase B, lane 1 (T13; tech design §3.7, §8.2, §8.3; design §5; ADR 0055): patrons. Favour
 * (0–100, never falls) is embedded in `characters.patrons[]`; the Requests' calendar is the
 * settlement's (`patronDays`, lane 2). Here: the card (`get`), the first visit (set-once), the gift
 * and the Confidant's favour (keyed acts), and the helpers every act calls in its own transaction:
 * `addFavourInTx` (a society call, a chapter), `crossInTx` (a tier crossed: the Protégé's piece and
 * Legacy) and `advanceRequestsInTx` (a Request's progress; a Failure never counts, design §24.9).
 *
 * The helpers write the embedded `patrons` without a version bump, inside the caller's transaction
 * and from a read in that session (as `landEntry`'s `dossierLastAt` and the chapters' Favour), so a
 * caller's own guarded write (the settlement's `day.settled`, an act's version) is not disturbed; two
 * transactions on one character still conflict on the document and the later one retries.
 */

const p8 = copy.life.patron;

/** A patron's stored state, or the empty one (Favour 0, never visited). */
export function patronStateOf(c: Pick<CharacterDoc, 'patrons'>, id: PatronId): StoredPatron {
  return (
    (c.patrons ?? []).find((p) => p.id === id) ?? {
      id,
      favour: 0,
      firstVisitDay: null,
      requests: [],
      next: 0,
      tierDays: {},
      favourDay: null,
      discretionUntil: null,
      thanks: [],
    }
  );
}

const withPatron = (c: Pick<CharacterDoc, 'patrons'>, p: StoredPatron): StoredPatron[] => {
  const list = [...(c.patrons ?? [])];
  const k = list.findIndex((x) => x.id === p.id);
  if (k >= 0) list[k] = p;
  else list.push(p);
  return list;
};

/** The six Requests as the rules read them (content's `PatronRequest`). */
export const rotationOf = (spec: Patron): RequestSpec[] =>
  spec.requests.map((r) => ({ id: r.id, match: r.match, target: r.target, ...(r.minLevel ? { minLevel: r.minLevel } : {}) }));

const surname = (spec: Patron | undefined, id: string) => (spec?.name ?? id).split(' ').slice(-1)[0]!;
const tierWord = (t: PatronTier | null) => p8.tiers[t ?? 'none'];

function favourKnock(spec: Patron, before: number, after: number, crossed: PatronTier[]): FavourKnock {
  const last = crossed[crossed.length - 1] ?? null;
  return {
    patronId: spec.id,
    patron: spec.name,
    before,
    after,
    crossed,
    line: `${p8.favourKnock(spec.name, before, after)}${last ? ` · ${tierWord(last)}` : ''}`,
  };
}

// ---------------------------------------------------------------------------------------------
// The helpers every act calls inside its own transaction.
// ---------------------------------------------------------------------------------------------

/**
 * Tech design §8.2 (`crossInTx`): the tiers crossed, dated once (`tierDays`); at Protégé the piece
 * (Crane's pen, Marr's case; source `patron`, once) and Legacy +5 (`protege:{patronId}`, unique).
 * Idempotent: a second call for the same crossing adds nothing. No version bump (see above).
 */
export async function crossInTx(
  session: ClientSession,
  content: GameContent,
  characterId: Types.ObjectId,
  patronId: PatronId,
  crossed: readonly PatronTier[],
  day: DayKey,
): Promise<{ piece: string | null; legacy: number }> {
  if (crossed.length === 0) return { piece: null, legacy: 0 };
  const spec = content.patron(patronId);
  const set: Record<string, DayKey> = {};
  for (const t of crossed) set[`patrons.$[p].tierDays.${t}`] = day;
  // Dated once: only a tier not dated yet (the settlement may have dated it in this session).
  const c = await Character.findById(characterId, { patrons: 1 }).session(session).lean<CharacterDoc>();
  const days = patronStateOf(c ?? {}, patronId).tierDays ?? {};
  const fresh = Object.fromEntries(Object.entries(set).filter(([k]) => days[k.split('.').pop() as PatronTier] === undefined));
  if (Object.keys(fresh).length > 0 && (c?.patrons ?? []).some((p) => p.id === patronId))
    await Character.updateOne({ _id: characterId }, { $set: fresh }, { session, arrayFilters: [{ 'p.id': patronId }] });
  if (!crossed.includes('protege') || !spec) return { piece: null, legacy: 0 };
  const entry = { uid: new Types.ObjectId().toHexString(), itemId: spec.piece, day, source: 'patron' as const };
  const pushed = await Character.updateOne(
    { _id: characterId, 'inventory.itemId': { $ne: spec.piece } },
    { $push: { inventory: entry } },
    { session },
  );
  const added = await addLegacyInTx(session, characterId, [protegeLegacy(patronId, day)]);
  return { piece: pushed.modifiedCount > 0 ? spec.piece : null, legacy: added.reduce((n, r) => n + r.points, 0) };
}

/**
 * Design §5.2: a Favour gain with the perk, capped at 100, the tiers crossed (`crossInTx`). Reads the
 * character in the session (after the caller's own write) and pushes the patron when absent.
 */
export async function addFavourInTx(
  session: ClientSession,
  content: GameContent,
  characterId: Types.ObjectId,
  patronId: PatronId,
  gain: number,
  now: number,
): Promise<FavourKnock | null> {
  const spec = content.patron(patronId);
  if (!spec || gain <= 0) return null;
  const c = await Character.findById(characterId, { patrons: 1, legacy: 1 }).session(session).lean<CharacterDoc>();
  if (!c) return null;
  const p = patronStateOf(c, patronId);
  const add = addFavour(p.favour, gain, perksOf(c));
  if (add.gained > 0) {
    const tierDays = { ...(p.tierDays ?? {}) };
    await Character.updateOne(
      { _id: characterId },
      { $set: { patrons: withPatron(c, { ...p, favour: add.favour, tierDays }) } },
      { session },
    );
  }
  await crossInTx(session, content, characterId, patronId, add.crossed, dayKey(now));
  return favourKnock(spec, p.favour, add.favour, add.crossed);
}

/** One act as the Requests read it: its descriptor (with the mission's type) and its outcome. */
export interface RequestAct {
  a: ActionDescriptor & { missionType?: string };
  outcome: Outcome;
}

/**
 * Tech design §3.7, §8.2 (`advanceRequests`): every open, matching Request moves one per act, a
 * Success or a Partial (a Failure never counts, design §24.9); a done one is paid at the next
 * boundary (the settlement). Returns the knock-on lines (*Crane's letter: 1 of 2*).
 */
export async function advanceRequestsInTx(
  session: ClientSession,
  content: GameContent,
  characterId: Types.ObjectId,
  acts: readonly RequestAct[],
  now: number,
): Promise<RequestKnock[]> {
  if (acts.length === 0) return [];
  const c = await Character.findById(characterId, { patrons: 1, residence: 1, homeCityId: 1, cityId: 1 })
    .session(session)
    .lean<CharacterDoc>();
  if (!c || !(c.patrons ?? []).some((p) => p.requests.length > 0)) return [];
  const r = advancePatrons(content, c, c.patrons ?? [], acts, now);
  if (r.changed) await Character.updateOne({ _id: characterId }, { $set: { patrons: r.patrons } }, { session });
  return r.knocks;
}

/**
 * The pure step of `advanceRequestsInTx` over a patrons list (the settlement applies it to the list
 * it is about to write, for the entries its gossip and informants land).
 */
export function advancePatrons(
  content: GameContent,
  c: Pick<CharacterDoc, 'residence' | 'homeCityId' | 'cityId'>,
  patrons: readonly StoredPatron[],
  acts: readonly RequestAct[],
  now: number,
): { patrons: StoredPatron[]; knocks: RequestKnock[]; changed: boolean } {
  const today = dayKey(now);
  const home = { cityId: residenceCityId(c as CharacterDoc), districtId: c.residence?.districtId ?? null };
  const knocks = new Map<string, RequestKnock>();
  let changed = false;
  const next = patrons.map((p) => {
    const spec = content.patron(p.id);
    if (!spec || p.requests.length === 0 || acts.length === 0) return p;
    const rotation = rotationOf(spec);
    // A stored `params: {}` reads back absent (the schema minimises it).
    let requests: StoredRequest[] = p.requests.map((r) => ({ ...r, params: r.params ?? {}, doneAt: r.doneAt ? new Date(r.doneAt).getTime() : null }));
    for (const act of acts) {
      const r = advanceRequests(requests, rotation, act.a, act.outcome, home, today, now);
      requests = r.requests;
      for (const id of r.advanced) {
        const q = requests.find((x) => x.id === id)!;
        changed = true;
        knocks.set(`${p.id}:${id}`, {
          patronId: p.id,
          requestId: id,
          progress: q.progress,
          target: q.target,
          done: q.doneAt !== null,
          line: p8.letterKnock(surname(spec, p.id), q.progress, q.target),
        });
      }
    }
    return { ...p, requests: requests.map((r) => ({ ...r, doneAt: r.doneAt === null ? null : new Date(r.doneAt) })) };
  });
  return { patrons: next, knocks: [...knocks.values()], changed };
}

// ---------------------------------------------------------------------------------------------
// The views (§8.3): the card at the place and the Me tab's clocks.
// ---------------------------------------------------------------------------------------------

function requestViews(content: GameContent, spec: Patron, p: StoredPatron): PatronRequestView[] {
  return p.requests.map((q) => {
    const r = spec.requests.find((x) => x.id === q.id);
    const params = q.params ?? {};
    const vars = {
      district: params.districtId ? (content.district(params.districtId)?.quarter.name ?? '') : '',
      until: weekdayOf(q.untilDay),
      issue: params.issueId ? (content.issue(params.issueId)?.short ?? '') : 'the week',
    };
    return {
      id: q.id,
      title: fillTemplate(r?.title ?? q.id, vars),
      line: fillTemplate(r?.line ?? '', vars),
      until: q.untilDay,
      untilWeekday: weekdayOf(q.untilDay),
      progress: q.progress,
      target: q.target,
      done: q.doneAt !== null,
    };
  });
}

/** Crane's chooser: the live Issues of the open cities (the Address's rule: a live Issue). */
async function liveIssues(content: GameContent, session: ClientSession | null): Promise<IssueDoc[]> {
  const q = IssueModel.find({ status: 'live' }).sort({ cityId: 1, _id: 1 }).limit(40);
  return (session ? q.session(session) : q).lean<IssueDoc[]>();
}

/** Tech design §8.3: the patron's card for this character, here and now. */
export async function patronCard(
  content: GameContent,
  c: CharacterDoc,
  patronId: PatronId,
  now: number,
  session: ClientSession | null = null,
): Promise<PatronCardView> {
  const spec = content.patron(patronId);
  if (!spec) throw gameError('NOT_FOUND', 'NO_PATRON_HERE', { patronId });
  const today = dayKey(now);
  const p = patronStateOf(c, patronId);
  const tier = tierOf(p.favour);
  const nt = nextTier(p.favour);
  const level = c.level >= PATRON.level;
  const given = c.today.day === today && (c.today.gifts ?? []).includes(patronId);
  const gate = favourGate({ tier, favourDay: p.favourDay ?? null, today, pc: c.pc, cost: spec.favour.pc });
  const ready = gate === null || gate.reason === 'NOT_ENOUGH_PC';
  const from = p.favourDay !== null && p.favourDay !== undefined ? p.favourDay + PATRON.favourEveryDays : null;
  const issues =
    spec.favour.act === 'plantHeadline' && tierAtLeast(tier, 'confidant')
      ? (await liveIssues(content, session)).map((x) => ({
          docId: x._id,
          cityName: content.city(x.cityId)?.name ?? x.cityId,
          name: content.issue(x.issueId)?.name ?? x.issueId,
        }))
      : undefined;
  const intro = content.mission(spec.introduction);
  return {
    id: spec.id,
    name: spec.name,
    portrait: assetView(content, spec.portrait),
    voice: spec.voice,
    locationId: spec.locationId,
    visited: p.firstVisitDay !== null,
    level,
    tier,
    tierWord: tierWord(tier),
    favour: p.favour,
    next: nt ? { tier: nt.tier, tierWord: tierWord(nt.tier), at: nt.at } : null,
    line: nt ? p8.line(tierWord(tier), p.favour, tierWord(nt.tier), nt.at) : p8.lineTop(tierWord(tier), p.favour),
    gift: {
      cost: PATRON.gift.iron,
      state: !level ? 'level' : given ? 'given' : c.iron < PATRON.gift.iron ? 'needsIron' : 'ok',
    },
    requests: requestViews(content, spec, p),
    favourAct: tierAtLeast(tier, 'confidant')
      ? {
          act: spec.favour.act,
          title: spec.favour.act === 'plantHeadline' ? p8.plantHeadline : p8.discretion,
          pc: spec.favour.pc,
          state: !ready ? 'used' : gate?.reason === 'NOT_ENOUGH_PC' ? 'needsPc' : 'ok',
          from: !ready ? from : null,
          fromWeekday: !ready && from !== null ? weekdayOf(from) : null,
          ...(issues ? { issues } : {}),
        }
      : null,
    discretionUntil: discretionOn(p.discretionUntil ?? null, today) ? p.discretionUntil : null,
    perks: PATRON_TIERS.map((t) => ({
      tier: t,
      line: t === 'protege' ? (spec.id === 'marr' ? p8.perks.protegeMarr : p8.perks.protegeCrane) : p8.perks[t],
      reached: tierAtLeast(tier, t),
    })),
    introduction: {
      missionId: spec.introduction,
      locationId: intro?.location.id ?? spec.locationId,
      open: tierAtLeast(tier, 'associate'),
    },
  };
}

/** Screens §8.2: the Me tab's clock for each patron (met or not: Favour 0 reads *A stranger*). */
export function patronClocks(content: GameContent, c: CharacterDoc): PatronClockView[] {
  return content.patrons.map((spec) => {
    const p = patronStateOf(c, spec.id);
    const tier = tierOf(p.favour);
    const nt = nextTier(p.favour);
    return {
      id: spec.id,
      name: spec.name,
      tierWord: tierWord(tier),
      favour: p.favour,
      next: nt ? { tierWord: tierWord(nt.tier), at: nt.at } : null,
      line: p8.meLine(spec.name, tierWord(tier), p.favour),
      requests: requestViews(content, spec, p),
    };
  });
}

/** The patron receiving at a place (the place's cards), or null. */
export async function patronCardAt(content: GameContent, c: CharacterDoc, locationId: string, now: number): Promise<PatronCardView | null> {
  const spec = content.patronAt(locationId);
  return spec ? patronCard(content, c, spec.id, now) : null;
}

// ---------------------------------------------------------------------------------------------
// The procedures (§8.1).
// ---------------------------------------------------------------------------------------------

function patronHere(content: GameContent, c: CharacterDoc, patronId: PatronId): Patron {
  const spec = content.patron(patronId);
  if (!spec) throw new GameError('NO_PATRON_HERE', { patronId }, 'NOT_FOUND');
  if (c.level < PATRON.level) throw new GameError('PATRON_LEVEL', { need: PATRON.level });
  if (c.cityId !== spec.cityId) throw new GameError('NOT_A_PATRON_PLACE', { patronId, cityId: spec.cityId });
  return spec;
}

/** `patron.get`: the card (a read). */
export async function getPatron(deps: { user: SessionUser; content: GameContent; now: () => number }, patronId: PatronId): Promise<PatronCardView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  return patronCard(deps.content, doc, patronId, now);
}

/**
 * `patron.visit` (§21.1 Q37): the first time the card is shown at the place, from Level 10, sets
 * `firstVisitDay` once (no key: a set-once write; a replay is a no-op). The first letter arrives at
 * the boundary into the day after next (`patronDays`).
 */
export async function visitPatron(deps: { user: SessionUser; content: GameContent; now: () => number }, patronId: PatronId): Promise<PatronCardView> {
  const { content } = deps;
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, content, now);
  patronHere(content, doc, patronId);
  const today = dayKey(now);
  const p = patronStateOf(doc, patronId);
  if (p.firstVisitDay === null) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const c = attempt === 0 ? doc : await Character.findById(doc._id).lean<CharacterDoc>();
      if (!c) break;
      const cur = patronStateOf(c, patronId);
      if (cur.firstVisitDay !== null) break;
      const r = await Character.updateOne(
        { _id: c._id, version: c.version },
        { $set: { patrons: withPatron(c, { ...cur, firstVisitDay: today }) }, $inc: { version: 1 } },
      );
      if (r.modifiedCount > 0) break;
    }
  }
  const after = (await Character.findById(doc._id).lean<CharacterDoc>()) ?? doc;
  return patronCard(content, after, patronId, now);
}

/** `patron.gift` (design §5.2): 200 Iron at the patron's place, once a day per patron, Favour +2. */
export function giftPatron(deps: LifeDeps, input: { patronId: PatronId; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  return lifeAct(deps, 'patron.gift', input.idempotencyKey, { patronId: input.patronId }, async ({ session, c, now, today }) => {
    const spec = patronHere(content, c, input.patronId);
    assertHere(c, spec.cityId);
    const gifts = c.today.day === today ? (c.today.gifts ?? []) : [];
    const g = giftGate({ level: c.level, givenToday: gifts.includes(spec.id), iron: c.iron });
    if (g) throw new GameError(g.reason, g.need !== undefined ? { need: g.need } : {});
    const p = patronStateOf(c, spec.id);
    const add = addFavour(p.favour, PATRON.gift.favour, perksOf(c));
    const tally = c.today.day === today ? { ...c.today, gifts: [...gifts, spec.id] } : { ...c.today, day: today, gifts: [spec.id] };
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: PATRON.gift.iron } },
      {
        $set: { patrons: withPatron(c, { ...p, favour: add.favour }), today: tally, lastActionAt: new Date(now) },
        $inc: { iron: -PATRON.gift.iron, version: 1 },
      },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const crossed = await crossInTx(session, content, c._id, spec.id, add.crossed, today);
    const after = crossed.piece || crossed.legacy ? ((await Character.findById(c._id).session(session).lean<CharacterDoc>()) ?? updated) : updated;
    const knock = favourKnock(spec, p.favour, add.favour, add.crossed);
    const text = copy.life.modals.gift(spec.name, copy.life.modals.giftLines[spec.id]);
    return lifeResult({
      content,
      session,
      before: c,
      updated: after,
      now,
      idempotencyKey: input.idempotencyKey,
      act: 'gift',
      stamp: copy.life.stamps.gift,
      headline: text.headline,
      body: text.body,
      knockOns: { favour: knock },
      lines: [copy.life.knock.iron(PATRON.gift.iron), knock.line],
      view: { kind: 'patron', patron: await patronCard(content, after, spec.id, now, session) },
    });
  });
}

/**
 * `patron.favour` (design §5.4, §21.1 Q36): Confidant or better, once a week (seven City Days),
 * for Political Capital. Crane's *A headline planted*: +50 momentum for the caller's party on a live
 * Issue, in the caller's name (the Address's figure and its contribution row). Marr's *The bank's
 * discretion*: Heat to 0 now and the back room's bribe at half price for seven days.
 */
export function favourPatron(
  deps: LifeDeps,
  input: { patronId: PatronId; issueDocId?: string | undefined; idempotencyKey: string },
): Promise<PoliticalResult> {
  const { content } = deps;
  return lifeAct(
    deps,
    'patron.favour',
    input.idempotencyKey,
    { patronId: input.patronId, issueDocId: input.issueDocId ?? null },
    async ({ session, c, now, today }) => {
      const spec = patronHere(content, c, input.patronId);
      assertHere(c, spec.cityId);
      const p = patronStateOf(c, spec.id);
      const g = favourGate({ tier: tierOf(p.favour), favourDay: p.favourDay ?? null, today, pc: c.pc, cost: spec.favour.pc });
      if (g) throw new GameError(g.reason, { ...(g.from !== undefined ? { from: g.from } : {}), ...(g.need !== undefined ? { need: g.need } : {}) });
      const next: StoredPatron = { ...p, favourDay: today };
      const set: Record<string, unknown> = { lastActionAt: new Date(now) };
      const knockOns: Partial<PoliticalResult['knockOns']> = { pc: { before: c.pc, after: c.pc - spec.favour.pc } };
      const lines: string[] = [copy.life.knock.pc(spec.favour.pc)];
      let issue: IssueDoc | null = null;
      if (spec.favour.act === 'plantHeadline') {
        issue = input.issueDocId ? await IssueModel.findById(input.issueDocId).session(session).lean<IssueDoc>() : null;
        if (!issue || issue.status !== 'live') throw new GameError('NOT_AN_ISSUE', { issueDocId: input.issueDocId ?? null }, 'BAD_REQUEST');
      } else {
        next.discretionUntil = discretionUntil(today);
        set.heat = heatDoc({ value: 0, at: now });
      }
      set.patrons = withPatron(c, next);
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, pc: { $gte: spec.favour.pc } },
        { $set: set, $inc: { pc: -spec.favour.pc, version: 1 } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      if (issue) {
        const f = c.factionId as FactionId;
        const before = { ...issue.momentum };
        const inc = await IssueModel.updateOne(
          { _id: issue._id, status: 'live' },
          { $inc: { [`momentum.${f}`]: PATRON.plantMomentum } },
          { session },
        );
        if (inc.matchedCount === 0) throw new GameError('NOT_AN_ISSUE', {});
        await addPoints(session, {
          c: updated,
          cityId: issue.cityId,
          placeId: issue.districtId ?? issue.cityId,
          docId: issue._id,
          points: PATRON.plantMomentum,
          at: new Date(now),
        });
        const after = { ...before, [f]: (before[f] ?? 0) + PATRON.plantMomentum } as Record<FactionId, number>;
        const ispec = content.issue(issue.issueId);
        knockOns.issue = { name: ispec?.name ?? issue.issueId, added: PATRON.plantMomentum, before, after };
      } else {
        knockOns.heat = { before: Math.round(projectHeat(heatTimerOf(c), now, heatRateOn(content, null, c.factionId)).value), after: 0 };
        lines.push(copy.life.knock.untilWeekday(weekdayOf(next.discretionUntil!)));
      }
      const text = spec.favour.act === 'plantHeadline' ? copy.life.modals.patronFavour.plantHeadline() : copy.life.modals.patronFavour.discretion();
      return lifeResult({
        content,
        session,
        before: c,
        updated,
        now,
        idempotencyKey: input.idempotencyKey,
        act: 'patronFavour',
        stamp: copy.life.stamps.patronFavour,
        headline: text.headline,
        body: text.body,
        knockOns,
        lines: [...lines, p8.calledIn(weekdayOf(today + PATRON.favourEveryDays))],
        view: { kind: 'patron', patron: await patronCard(content, updated, spec.id, now, session) },
      });
    },
  );
}
