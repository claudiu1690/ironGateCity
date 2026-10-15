import type { GameContent } from '@irongate/content';
import { Character, City, OfficeTerm, Petition } from '@irongate/db';
import type { CharacterDoc, CityDoc, PetitionDoc } from '@irongate/db';
import {
  PETITION,
  councilDay,
  councilKey,
  dayKey,
  dayStart,
  petitionGate,
  signaturesNeeded,
  townHallSignatures,
} from '@irongate/rules';
import type { DayKey, EventBand, PetitionView, PoliticalResult } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { newsItem } from './nationDay';
import type { NationBoundaryCtx } from './nationDay';
import { nationResult, refusal, runNationAct, spendPc } from './nationAct';
import type { NationActDeps, NationCtx } from './nationAct';
import { weekdayName } from './politicsService';
import { residenceOf } from './residence';

/**
 * Slice 7 T19 (docs/tech/slice-7.md §8.2 `petitionService`; ADR 0049 as amended; design §10.1, §10.4):
 * a petition to dissolve the council of the residence city. Opened on cycle days 0–2 by a Rank 3+
 * resident (10 PC, the first signature); signed by Rank 2+ residents of any party (10 PC, public,
 * final; the council's own members cannot sign); closed at the second boundary after opening by the
 * city's day, before the set (`closePetitionsInTx`, called by the city day). The Town Hall adds the
 * townspeople's signatures in the event's resolution (`townHallSignaturesInTx`).
 */

export const dissolveId = (cityId: string, day: DayKey): string => `dissolve:${cityId}:${day}`;
const ACTIVE_MS = 7 * 24 * 60 * 60 * 1000;

/** The city's turnout roll: Rank 2+ residents active in the last seven days (design §10.1). */
export async function eligibleResidents(cityId: string, now: number, session: ClientSession | null = null): Promise<number> {
  const q = Character.countDocuments({
    'residence.cityId': cityId,
    rank: { $gte: PETITION.signRank },
    lastActionAt: { $gte: new Date(now - ACTIVE_MS) },
  });
  return session ? q.session(session) : q;
}

interface Where {
  cityId: string;
  offset: number;
  cityName: string;
}

function residenceCity(content: GameContent, c: CharacterDoc): Where | null {
  const cityId = residenceOf(c).cityId;
  const city = content.city(cityId);
  if (!city?.council) return null;
  return { cityId, offset: city.council.offset, cityName: city.name };
}

async function councillorHere(session: ClientSession | null, c: Pick<CharacterDoc, '_id'>, cityId: string, today: DayKey) {
  const q = OfficeTerm.exists({
    cityId,
    office: { $in: ['council', null] },
    'holder.kind': 'player',
    'holder.characterId': c._id,
    fromDay: { $lte: today },
    toDay: { $gt: today },
    vacatedDay: null,
  });
  return !!(await (session ? q.session(session) : q));
}

async function gateFor(
  x: Pick<NationCtx, 'session' | 'c' | 'today'>,
  w: Where | null,
  opening: boolean,
  open: PetitionDoc | null,
): Promise<ReturnType<typeof petitionGate>> {
  if (!w) return { reason: 'NOT_RESIDENT' };
  const cal = councilDay(x.today, w.offset);
  const last = await Petition.findOne({ cityId: w.cityId, kind: 'dissolve', status: { $ne: 'open' } })
    .sort({ closesDay: -1 })
    .session(x.session)
    .lean<PetitionDoc>();
  // Resident since before the current polls opened (design §10.1: no move-and-sign).
  const votesFromOk = residenceOf(x.c).votesFromDay <= cal.election.pollsFrom;
  return petitionGate({
    rank: x.c.rank,
    resident: residenceOf(x.c).cityId === w.cityId,
    votesFromOk,
    cycleDay: cal.cycleDay,
    lastClosedDay: last?.closesDay ?? null,
    today: x.today,
    open: !!open,
    pc: x.c.pc,
    councillor: await councillorHere(x.session, x.c, w.cityId, x.today),
    signed: !!open?.signatures.some((s) => s.characterId.equals(x.c._id)),
    opening,
  });
}

/** `petition.open` (§7.2): the residence city's council, cycle days 0–2, one per city every seven days. */
export function open(deps: NationActDeps<object>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'petition.open', async (x) => {
    const { c, session, today } = x;
    const w = residenceCity(content, c);
    const existing = w
      ? await Petition.findOne({ cityId: w.cityId, kind: 'dissolve', status: 'open' }).session(session).lean<PetitionDoc>()
      : null;
    const gate = await gateFor(x, w, true, existing);
    if (gate) throw refusal(gate, gate.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: PETITION.cost } : {});
    const cal = councilDay(today, w!.offset);
    const at = new Date(x.now);
    const closesDay = today + PETITION.closeAfter;
    // E11000 on the one-open-per-city index: the request key retries and the gate names `ALREADY_OPEN`.
    await Petition.create(
      [
        {
          _id: dissolveId(w!.cityId, today),
          kind: 'dissolve',
          cityId: w!.cityId,
          councilKey: councilKey(w!.cityId, cal.cycle),
          factionId: null,
          chairTermId: null,
          openedBy: { characterId: c._id, name: c.name },
          openedDay: today,
          closesDay,
          count: 1,
          signatures: [{ characterId: c._id, name: c.name, factionId: c.factionId, day: today, at }],
          townHall: 0,
          needed: null,
          status: 'open',
          closedAt: null,
        },
      ],
      { session },
    );
    const updated = await spendPc(x, PETITION.cost);
    const needed = signaturesNeeded(await eligibleResidents(w!.cityId, x.now, session));
    return nationResult(content, { ...x, c: updated }, {
      act: 'petitionOpen',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { city: w!.cityName, needed: String(needed), resultWeekday: weekdayName(closesDay) },
      until: dayStart(closesDay),
      at: dayStart(closesDay),
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'petition', petition: await petitionView(content, updated, x.now, w!.cityId, session) },
    });
  });
}

/** `petition.sign` (§7.2): Rank 2+ residents of any party, 10 PC, once; not the council's own members. */
export function sign(deps: NationActDeps<{ petitionId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'petition.sign', async (x) => {
    const { c, session, today } = x;
    const w = residenceCity(content, c);
    const p = await Petition.findById(deps.input.petitionId).session(session).lean<PetitionDoc>();
    if (!p || p.kind !== 'dissolve') throw new GameError('PETITION_CLOSED', {}, 'NOT_FOUND');
    if (!w || p.cityId !== w.cityId) throw new GameError('NOT_RESIDENT');
    const gate = await gateFor(x, w, false, p.status === 'open' ? p : null);
    if (gate) throw refusal(gate, gate.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: PETITION.cost } : {});
    const at = new Date(x.now);
    const pushed = await Petition.updateOne(
      { _id: p._id, status: 'open', 'signatures.characterId': { $ne: c._id } },
      { $push: { signatures: { characterId: c._id, name: c.name, factionId: c.factionId, day: today, at } }, $inc: { count: 1 } },
      { session },
    );
    if (pushed.matchedCount === 0) throw new GameError('ALREADY_SIGNED', {}, 'CONFLICT');
    const updated = await spendPc(x, PETITION.cost);
    const needed = signaturesNeeded(await eligibleResidents(w.cityId, x.now, session));
    return nationResult(content, { ...x, c: updated }, {
      act: 'petitionSign',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { signatures: String(p.count + 1), needed: String(needed), resultWeekday: weekdayName(p.closesDay) },
      until: dayStart(p.closesDay),
      at: dayStart(p.closesDay),
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'petition', petition: await petitionView(content, updated, x.now, w.cityId, session) },
    });
  });
}

/** `petition.get` (§8.3): the city's open petition (signers public), whether you can open or sign, the last close. */
export async function petitionView(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  cityId: string,
  session: ClientSession | null = null,
): Promise<PetitionView> {
  const today = dayKey(now);
  const city = content.city(cityId);
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const open = await s(Petition.findOne({ cityId, kind: 'dissolve', status: 'open' })).lean<PetitionDoc>();
  const last = await s(Petition.findOne({ cityId, kind: 'dissolve', status: { $ne: 'open' } }).sort({ closesDay: -1 })).lean<PetitionDoc>();
  const w = city?.council ? { cityId, offset: city.council.offset, cityName: city.name } : null;
  const mine = residenceOf(c).cityId === cityId ? w : null;
  const x = { session: session as ClientSession, c, today };
  const openGate = await gateFor(x, mine, true, open);
  const signGate = await gateFor(x, mine, false, open);
  const needed = signaturesNeeded(await eligibleResidents(cityId, now, session));
  const councillor = await councillorHere(session, c, cityId, today);
  return {
    city: { id: cityId, name: city?.name ?? cityId },
    open: open
      ? {
          id: open._id,
          count: open.count,
          needed,
          until: dayStart(open.closesDay),
          closesDay: open.closesDay,
          signers: open.signatures.map((x2) => ({ name: x2.name, factionId: x2.factionId })),
          townHall: open.townHall,
          you: open.openedBy.characterId.equals(c._id)
            ? 'open'
            : open.signatures.some((x2) => x2.characterId.equals(c._id))
              ? 'signed'
              : councillor
                ? 'councillor'
                : signGate
                  ? 'no'
                  : 'sign',
        }
      : null,
    canOpen: { ok: !openGate, why: openGate?.reason ?? null, ...(openGate?.need !== undefined ? { need: openGate.need } : {}) },
    canSign: { ok: !!open && !signGate, why: signGate?.reason ?? null },
    last:
      last && last.needed !== null
        ? { outcome: last.status === 'succeeded' ? 'dissolved' : 'fellShort', day: last.closesDay, count: last.count, needed: last.needed }
        : null,
  };
}

/** `petition.get` for the router (the residence city by default). */
export async function getPetition(
  deps: { user: SessionUser; content: GameContent; now: () => number },
  cityId?: string,
): Promise<PetitionView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  const id = cityId ?? residenceOf(doc).cityId;
  if (!deps.content.city(id)?.council) throw new GameError('WRONG_CITY', { cityId: id }, 'BAD_REQUEST').toTRPC();
  return petitionView(deps.content, doc, now, id);
}

// ---------------------------------------------------------------------------------------------
// The close (the city's day, before the set) and the Town Hall (the event's resolution).
// ---------------------------------------------------------------------------------------------

/**
 * ADR 0049 as amended (tech §8.2 `closeInTx`): called by the city's day at its boundary into `d`,
 * before the set. The city's open petition closing at `d` succeeds with `signaturesNeeded(the turnout
 * roll)`: the council is dissolved (every sitting councillor's and the Governor's term vacated at `d`,
 * not completed; `council.dissolved`); **the rule in force is not touched** and the open ballot
 * proceeds. Returns what happened, for the city's paper. Idempotent: a closed petition is not re-read.
 */
export async function closePetitionsInTx(
  cityId: string,
  d: DayKey,
  now: number,
  session: ClientSession,
): Promise<{ petitionId: string; succeeded: boolean; count: number; needed: number } | null> {
  const p = await Petition.findOne({ cityId, kind: 'dissolve', status: 'open', closesDay: { $lte: d } })
    .session(session)
    .lean<PetitionDoc>();
  if (!p) return null;
  const needed = signaturesNeeded(await eligibleResidents(cityId, now, session));
  const succeeded = p.count >= needed;
  const closed = await Petition.updateOne(
    { _id: p._id, status: 'open' },
    { $set: { status: succeeded ? 'succeeded' : 'failed', needed, closedAt: new Date(now) } },
    { session },
  );
  if (closed.matchedCount === 0) return null;
  if (succeeded) {
    // Every seat of the sitting council (players and locals) and the Governor's: vacated, not completed.
    await OfficeTerm.updateMany(
      {
        cityId,
        office: { $in: ['council', 'governor', null] },
        fromDay: { $lte: d },
        toDay: { $gt: d },
        vacatedDay: null,
      },
      { $set: { vacatedDay: d } },
      { session },
    );
    await City.updateOne(
      { _id: cityId, council: { $ne: null } },
      { $set: { 'council.dissolved': { day: d, petitionId: p._id } } },
      { session },
    );
  }
  return { petitionId: p._id, succeeded, count: p.count, needed };
}

/**
 * Design §10.4 (tech §8.2): the Town Hall's townspeople's signatures, in the event's resolution
 * transaction: Triumph 3, Success 2, Mixed 1, Fiasco 0, to the city's open dissolve petition (none
 * open: nothing happens).
 */
export async function townHallSignaturesInTx(session: ClientSession, cityId: string, band: EventBand): Promise<number> {
  const n = townHallSignatures(band);
  if (n <= 0) return 0;
  const res = await Petition.updateOne(
    { cityId, kind: 'dissolve', status: 'open' },
    { $inc: { count: n, townHall: n } },
    { session },
  );
  return res.matchedCount > 0 ? n : 0;
}

/** Nation step 'chair' (§8.2 step 8): the national line for a council dissolved at `d`. */
async function dissolvedNews(ctx: NationBoundaryCtx): Promise<void> {
  const rows = await Petition.find({ kind: 'dissolve', status: 'succeeded', closesDay: ctx.d }).session(ctx.session).lean<PetitionDoc[]>();
  for (const p of rows) {
    const city = ctx.content.city(p.cityId ?? '');
    const doc: CityDoc | null | undefined = ctx.cities.get(p.cityId ?? '');
    ctx.news.push(
      newsItem(ctx.d, 'nl.council-dissolved', 1, null, {
        city: city?.name ?? p.cityId,
        signatures: p.count,
        weekday: weekdayName(doc?.council?.toDay ?? ctx.d),
      }),
    );
  }
}

export const petitionSteps = [dissolvedNews] as const;
