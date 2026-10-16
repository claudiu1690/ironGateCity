import type { GameContent } from '@irongate/content';
import { Bill, Contribution, FactionState, Nation, contributionId } from '@irongate/db';
import type { BillDoc, CharacterDoc, FactionStateDoc, NationDoc, StandingOrdersDoc } from '@irongate/db';
import {
  DEPUTY,
  FACTION_IDS,
  PUSH,
  dayKey,
  dayStart,
  councilDay,
  chairCallGate,
  localVote,
  pushCounts,
  pushMet,
  standingOn,
  termOf,
} from '@irongate/rules';
import type { ActionDescriptor, ChairDeskView, DayKey, FactionId, LineVote, PoliticalResult, PushSpec } from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { newsItem } from './nationDay';
import type { NationBoundaryCtx } from './nationDay';
import { currentTerm, nationResult, runNationAct } from './nationAct';
import type { NationActDeps, NationCtx } from './nationAct';
import { insertChairCallInTx, scheduleEventResolve } from './eventService';
import { billView } from './parliamentService';
import { weekdayName } from './politicsService';
import { residenceCtx } from './residence';
import { orderText, orderVars } from './views';

/**
 * Slice 7 T16 (docs/tech/slice-7.md §8.2 `chairService`; ADR 0046; design §4.2–§4.4): the Chair's
 * desk. Every act re-reads the Chair's `officeTerms` row in its transaction and writes the faction's
 * document filtered on `chair.holder.characterId: me` (a removal or a new Chair committing first makes
 * the write miss: `NOT_CHAIR`). Standing orders, the push and the party's target, the party line, the
 * party's rule per council, tomorrow's fixtures. The member's push contribution is upserted in every
 * action and mission transaction (`recordPushInTx`); the nation's day stores the day's result.
 */

const pushScope = (f: FactionId, day: DayKey): string => `push|${f}|${day}`;

/** The branches a Chair sets a rule and a fixture for: home, the capital, Clearwater (design §4.3, §4.4). */
function branchCities(content: GameContent, f: FactionId): string[] {
  const home = content.councilCities().find((c) => c.homeFactionId === f)?.id;
  const battlegrounds = content
    .councilCities()
    .filter((c) => c.role === 'battleground')
    .map((c) => c.id);
  return [...(home ? [home] : []), ...battlegrounds];
}

/** The places a push may go: a capital district or a battleground city without districts. */
function pushPlaces(content: GameContent): Array<{ cityId: string; districtId: string | null; name: string }> {
  const out: Array<{ cityId: string; districtId: string | null; name: string }> = [];
  for (const c of content.councilCities().filter((x) => x.role === 'battleground')) {
    if (content.isDistricted(c.id)) {
      for (const q of content.districtsOf(c.id)) out.push({ cityId: c.id, districtId: q.id, name: `${q.name}, ${c.name}` });
    } else out.push({ cityId: c.id, districtId: null, name: c.name });
  }
  return out;
}

const menuOf = (content: GameContent, cityId: string) =>
  content.isDistricted(cityId) ? content.irongateMenu() : content.ordinancesMenu();

/** The Chair, re-read in the session: the term (ADR 0020) and the faction document's projection. */
async function asChair(x: NationCtx): Promise<{ termId: Types.ObjectId; fs: FactionStateDoc }> {
  const term = await currentTerm(x.session, x.c._id, 'chair', x.today);
  const fs = await FactionState.findById(x.c.factionId).session(x.session).lean<FactionStateDoc>();
  if (!term || !fs?.chair || !fs.chair.holder.characterId.equals(x.c._id)) throw new GameError('NOT_CHAIR');
  return { termId: term._id, fs };
}

/** Write the faction's document as the Chair (a miss: the Chair changed under us). */
async function writeAsChair(x: NationCtx, update: Record<string, unknown>): Promise<void> {
  const res = await FactionState.updateOne(
    { _id: x.c.factionId, 'chair.holder.characterId': x.c._id },
    update,
    { session: x.session },
  );
  if (res.matchedCount === 0) throw new GameError('NOT_CHAIR');
}

/**
 * `chair.setOrders` (§7.2): three family picks (null: the rotation) and at most one push (slot A or B)
 * to a battleground with the party's target, from tomorrow. `rollStanding` first: a `next` that has
 * started becomes `current`.
 */
export function setOrders(
  deps: NationActDeps<{
    picks: { A: string | null; B: string | null; C: string | null };
    push: PushSpec | null;
  }>,
): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'chair.orders', async (x) => {
    const { c, today } = x;
    const { fs } = await asChair(x);
    const f = c.factionId;
    for (const slot of ['A', 'B', 'C'] as const) {
      const fam = deps.input.picks[slot];
      if (fam !== null && !content.families(f, slot).some((m) => m.family === fam))
        throw new GameError('UNKNOWN_FAMILY', { slot, family: fam }, 'BAD_REQUEST');
    }
    const push = deps.input.push;
    if (push) {
      if ((push.slot as string) === 'C') throw new GameError('PUSH_SLOT', {}, 'BAD_REQUEST');
      if (!pushPlaces(content).some((p) => p.cityId === push.cityId && p.districtId === push.districtId))
        throw new GameError('PUSH_PLACE', { cityId: push.cityId, districtId: push.districtId }, 'BAD_REQUEST');
      if (!(PUSH.targets as readonly number[]).includes(push.target)) throw new GameError('PUSH_PLACE', { target: push.target }, 'BAD_REQUEST');
    }
    const current = standingOn(fs.orders, today);
    const next: StandingOrdersDoc = {
      fromDay: today + 1,
      picks: deps.input.picks,
      push,
      setBy: { characterId: c._id, name: c.name },
      setAt: new Date(x.now),
    };
    await writeAsChair(x, { $set: { 'orders.current': current, 'orders.next': next } });
    return nationResult(content, x, {
      act: 'chairOrders',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {},
      at: dayStart(today + 1),
      view: { kind: 'desk', desk: await deskView(content, c, x.now, x.session) },
    });
  });
}

/** `chair.setLine` (§7.2): the party line on an open bill (For · Against · Free vote), a target-state `$set`. */
export function setLine(deps: NationActDeps<{ billId: string; line: LineVote }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'chair.line', async (x) => {
    const { c, session } = x;
    await asChair(x);
    const billId = Types.ObjectId.isValid(deps.input.billId) ? new Types.ObjectId(deps.input.billId) : null;
    const bill = billId ? await Bill.findById(billId).session(session).lean<BillDoc>() : null;
    if (!bill) throw new GameError('BILL_NOT_FOUND', {}, 'NOT_FOUND');
    const res = await Bill.updateOne(
      { _id: bill._id, status: 'voting' },
      { $set: { [`lines.${c.factionId}`]: { line: deps.input.line, at: new Date(x.now), by: { characterId: c._id, name: c.name } } } },
      { session },
    );
    if (res.matchedCount === 0) throw new GameError('BILL_CLOSED', { status: bill.status });
    const nation = x.nation;
    const locals = nation ? Math.max(0, (nation.government.parliament.seats[c.factionId] ?? 0) - (nation.government.parliament.players[c.factionId] ?? 0)) : 0;
    const lawName = bill.lawId ? (content.law(bill.lawId)?.name ?? bill.lawId) : 'the removal of the President';
    const view = await billView(content, c, bill._id, x.now, session);
    return nationResult(content, x, {
      act: 'partyLine',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {
        line: deps.input.line === 'for' ? 'For' : deps.input.line === 'against' ? 'Against' : 'a free vote',
        law: lawName,
        n: String(locals),
        resultWeekday: weekdayName(bill.divideDay),
      },
      at: dayStart(bill.divideDay),
      view: { kind: 'bill', bill: view! },
    });
  });
}

/** `chair.setRule` (§7.2): the party's card in a city (home, the capital, Clearwater), read at the next set. */
export function setRule(deps: NationActDeps<{ cityId: string; ordinanceId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'chair.rule', async (x) => {
    const { c, today } = x;
    await asChair(x);
    const { cityId, ordinanceId } = deps.input;
    if (!branchCities(content, c.factionId).includes(cityId)) throw new GameError('WRONG_CITY', { cityId }, 'BAD_REQUEST');
    const o = content.ordinance(ordinanceId);
    if (!o || !menuOf(content, cityId).some((m) => m.id === ordinanceId))
      throw new GameError('UNKNOWN_ORDINANCE', { ordinanceId }, 'BAD_REQUEST');
    await writeAsChair(x, { $pull: { rules: { cityId } } });
    await writeAsChair(x, { $push: { rules: { cityId, ordinanceId, setDay: today } } });
    const city = content.city(cityId)!;
    const cal = councilDay(today, city.council!.offset);
    // The next set the rule can reach: this cycle's when it has not run yet (days 0–1), else the next.
    const setDay = cal.cycleDay <= 1 ? cal.council.setDay : cal.council.setDay + (cal.council.toDay - cal.council.fromDay);
    return nationResult(content, x, {
      act: 'partyRule',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { ordinance: o.name, city: city.name, weekday: weekdayName(setDay) },
      at: dayStart(setDay),
      view: { kind: 'desk', desk: await deskView(content, c, x.now, x.session) },
    });
  });
}

/** `chair.setFixture` (§7.2): tomorrow's event in a branch city (the three common types and the faction's own). */
export function setFixture(
  deps: NationActDeps<{ cityId: string; typeId: string; districtId: string | null }>,
): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'chair.fixture', async (x) => {
    const { c, today } = x;
    await asChair(x);
    const { cityId, typeId } = deps.input;
    if (!branchCities(content, c.factionId).includes(cityId)) throw new GameError('WRONG_CITY', { cityId }, 'BAD_REQUEST');
    const type = content.eventTypesFor(c.factionId).find((t) => t.id === typeId);
    if (!type) throw new GameError('UNKNOWN_FIXTURE', { typeId }, 'BAD_REQUEST');
    const districted = content.isDistricted(cityId);
    const districtId = districted ? deps.input.districtId : null;
    if (districted && (!districtId || !content.districtsOf(cityId).some((q) => q.id === districtId)))
      throw new GameError('WRONG_DISTRICT', { districtId }, 'BAD_REQUEST');
    const venue = content.venueOf(typeId, cityId, districtId);
    if (!venue) throw new GameError('UNKNOWN_FIXTURE', { typeId, cityId }, 'BAD_REQUEST');
    const day = today + 1;
    await writeAsChair(x, { $pull: { fixtures: { cityId } } });
    await writeAsChair(x, { $push: { fixtures: { cityId, day, typeId, districtId } } });
    return nationResult(content, x, {
      act: 'fixture',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { city: content.city(cityId)!.name, event: type.name, venue: venue.location.name },
      at: dayStart(day),
      view: { kind: 'desk', desk: await deskView(content, c, x.now, x.session) },
    });
  });
}

/**
 * `chair.callEvent` (§7.2, design §4.4): an event in any open city from anywhere, no role, no Energy,
 * *called by the Chair*; slice 6's place limits; not on a rival's home ground; in the capital a
 * district. The resolution is scheduled after the commit.
 */
export async function callEvent(
  deps: NationActDeps<{ cityId: string; districtId: string | null; typeId: string; hours: 1 | 3 | 6 | 12 }>,
): Promise<PoliticalResult> {
  const { content } = deps;
  let scheduled: { eventId: string; at: Date } | null = null;
  const result = await runNationAct(deps, 'chair.call', async (x) => {
    const { c } = x;
    await asChair(x);
    const { cityId, typeId, hours } = deps.input;
    const type = content.eventTypesFor(c.factionId).find((t) => t.id === typeId);
    if (!type) throw new GameError('UNKNOWN_EVENT_TYPE', { typeId }, 'BAD_REQUEST');
    const city = content.city(cityId);
    const districted = content.isDistricted(cityId);
    const districtId = districted ? deps.input.districtId : null;
    const venue = districtId !== null || !districted ? content.venueOf(typeId, cityId, districtId) : undefined;
    const gate = chairCallGate({
      chair: true,
      cityOpen: !!city?.council,
      rivalHome: city?.role === 'home' && city.homeFactionId !== c.factionId,
      districtOk: !!venue,
    });
    if (gate) throw new GameError(gate.reason, { cityId, districtId }, gate.reason === 'WRONG_DISTRICT' ? 'BAD_REQUEST' : 'PRECONDITION_FAILED');
    const { ev, view, venueName } = await insertChairCallInTx(content, x.session, c, { typeId, cityId, districtId, hours }, x.now);
    scheduled = { eventId: ev._id.toHexString(), at: ev.startsAt };
    return nationResult(content, x, {
      act: 'chairCall',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { event: type.runningName, city: city!.name, venue: venueName },
      at: ev.startsAt.getTime(),
      view: { kind: 'event', event: view },
    });
  });
  const s = scheduled as { eventId: string; at: Date } | null;
  if (s) scheduleEventResolve(s.eventId, s.at);
  return result;
}

// ---------------------------------------------------------------------------------------------
// The desk view (the Chair's, and the read-only page for members).
// ---------------------------------------------------------------------------------------------

async function pushCount(f: FactionId, day: DayKey, session: ClientSession | null): Promise<number> {
  const agg = Contribution.aggregate<{ n: number }>([
    { $match: { scope: pushScope(f, day) } },
    { $group: { _id: null, n: { $sum: '$amount' } } },
  ]);
  const rows = await (session ? agg.session(session) : agg);
  return rows[0]?.n ?? 0;
}

/** `chair.desk` / `office.chair` (§8.3): the orders, the lines, the rules, the fixtures, the bill. */
export async function deskView(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  session: ClientSession | null = null,
): Promise<ChairDeskView> {
  const today = dayKey(now);
  const f = c.factionId;
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const fs = await s(FactionState.findById(f)).lean<FactionStateDoc>();
  const nation = await s(Nation.findById('republic')).lean<NationDoc>();
  const standing = fs ? standingOn(fs.orders, today) : null;
  const shown = fs?.orders.next ?? standing;
  // Phase C (lane X): the menu's titles read as the Chair would read them (`{city}`, `{verbs}` resolved).
  const vars = orderVars(content, c, null);
  const families = (slot: 'A' | 'B' | 'C') =>
    content.families(f, slot).map((m) => ({ family: m.family, label: orderText(m.label, vars) }));
  const places = pushPlaces(content);
  const target = standing?.push
    ? {
        count: await pushCount(f, today, session),
        target: standing.push.target,
        unit: 'doors',
        place: places.find((p) => p.cityId === standing.push!.cityId && p.districtId === standing.push!.districtId)?.name ?? standing.push.cityId,
        met: false,
      }
    : null;
  if (target) target.met = pushMet(target.count, target.target);
  const n = termOf(today).index;
  const bills = await s(Bill.find({ termIndex: n, status: 'voting' }).sort({ tabledAt: 1 })).lean<BillDoc[]>();
  const seats = nation?.government.parliament;
  const locals = seats ? Math.max(0, (seats.seats[f] ?? 0) - (seats.players[f] ?? 0)) : 0;
  const unrest = !!nation?.control.cities.some((x) => x.unrest && content.city(x.cityId)?.homeFactionId === f);
  const used = await s(Bill.findOne({ tablerKey: `${c._id.toHexString()}:${n}:bill` })).lean<BillDoc>();
  const branches = branchCities(content, f);
  const districtsOf = (cityId: string) =>
    content.districtsOf(cityId).map((q) => ({ districtId: q.id, name: q.name }));
  const pres = nation?.government.president.holder.factionId ?? f;
  return {
    factionId: f,
    chair: fs?.chair
      ? { name: fs.chair.holder.name, since: fs.chair.fromDay, until: fs.chair.toDay, you: fs.chair.holder.characterId.equals(c._id) }
      : null,
    orders: {
      slots: (['A', 'B', 'C'] as const).map((slot) => {
        const fam = shown?.picks[slot] ?? null;
        const menu = families(slot);
        return { slot, current: fam ? (menu.find((m) => m.family === fam) ?? null) : null, menu };
      }),
      push: shown?.push ?? null,
      places,
      fromDay: shown?.fromDay ?? null,
      setBy: shown ? { name: shown.setBy.name } : null,
      target,
    },
    lines: bills.map((b) => {
      const law = b.lawId ? content.law(b.lawId) : undefined;
      const secretaryLine: LineVote =
        b.kind === 'removal' ? (pres === f ? 'against' : 'free') : (law?.secretaryLines[f] ?? 'free');
      const players = b.votes.filter((v) => v.factionId === f);
      const lv = localVote({
        players: { for: players.filter((v) => v.vote === 'for').length, against: players.filter((v) => v.vote === 'against').length },
        chairLine: b.lines?.[f]?.line ?? null,
        secretaryLine,
        unrest,
      });
      return {
        billId: b._id.toHexString(),
        law: law?.name ?? 'The removal of the President',
        kind: b.kind,
        line: b.lines?.[f]?.line ?? null,
        secretaryLine,
        players: players.length,
        localsFollow: lv.why === 'unrest' ? 'unrest' : lv.why === 'players' ? 'players' : 'you',
        locals,
      };
    }),
    rules: branches.map((cityId) => {
      const city = content.city(cityId)!;
      const r = fs?.rules.find((x) => x.cityId === cityId) ?? null;
      const cal = councilDay(today, city.council!.offset);
      const fromSet = cal.cycleDay <= 1 ? cal.council.setDay : cal.council.setDay + (cal.council.toDay - cal.council.fromDay);
      return {
        cityId,
        cityName: city.name,
        ordinanceId: r?.ordinanceId ?? null,
        name: r ? (content.ordinance(r.ordinanceId)?.name ?? r.ordinanceId) : null,
        fromSet,
        menu: menuOf(content, cityId).map((o) => ({ ordinanceId: o.id, name: o.name })),
      };
    }),
    bill: {
      used: used ? { lawName: used.lawId ? (content.law(used.lawId)?.name ?? used.lawId) : 'A removal', day: used.tabledDay } : null,
      cost: DEPUTY.billCost,
    },
    fixtures: branches.map((cityId) => {
      const fx = fs?.fixtures.find((x) => x.cityId === cityId && x.day === today + 1) ?? null;
      return {
        cityId,
        cityName: content.city(cityId)!.name,
        day: today + 1,
        districtId: fx?.districtId ?? null,
        typeId: fx?.typeId ?? null,
        rotation: !fx,
        menu: content
          .eventTypesFor(f)
          .filter((t) =>
            content.isDistricted(cityId)
              ? districtsOf(cityId).some((q) => !!content.venueOf(t.id, cityId, q.districtId))
              : !!content.venueOf(t.id, cityId, null),
          )
          .map((t) => ({ typeId: t.id, name: t.name })),
        districts: districtsOf(cityId),
      };
    }),
    callCities: branches.map((cityId) => ({ cityId, name: content.city(cityId)!.name, districts: districtsOf(cityId) })),
  };
}

/** `chair.desk`: the Chair only (`NOT_CHAIR` for others). */
export async function getDesk(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<ChairDeskView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  const view = await deskView(deps.content, doc, now);
  if (!view.chair?.you) throw new GameError('NOT_CHAIR').toTRPC();
  return view;
}

/** `office.chair`: the same page, read-only, for any member. */
export async function getChairPage(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<ChairDeskView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  return deskView(deps.content, doc, now);
}

// ---------------------------------------------------------------------------------------------
// The party's target: the member's contribution (in the act's transaction) and the day's result.
// ---------------------------------------------------------------------------------------------

/** The order-matching descriptor of an act at a place (the push's match reads the place and the type). */
export function placeDescriptor(
  content: GameContent,
  kind: 'checked' | 'mission',
  act: { id: string; type: string },
  location: { id: string; kind?: string },
  city: { id: string },
): ActionDescriptor {
  const districtId = content.isDistricted(city.id) ? (content.quarterOf(location.id)?.id ?? null) : null;
  return {
    kind,
    actionId: act.id,
    type: act.type,
    locationId: location.id,
    cityId: city.id,
    ...(districtId ? { districtId } : {}),
    ...(location.kind ? { locationKind: location.kind } : {}),
  } as ActionDescriptor;
}

/**
 * ADR 0046 (design §4.2, §23.3): an attempt at the pushed place by a member whose pushed order counts
 * (Level 10+) `$inc`s the member's own `push|{f}|{day}` row, whether or not their order is still open;
 * a ×3 counts three. No faction-wide hot document. Called once per action and mission transaction,
 * after the character write (`c` is the character as written).
 */
export async function recordPushInTx(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  a: ActionDescriptor,
  attempts: number,
  now: number,
): Promise<void> {
  const today = dayKey(now);
  if (attempts <= 0 || c.orders?.day !== today) return;
  const items = (c.orders.items ?? []) as Array<{ templateId: string; push?: { cityId: string; districtId: string | null; counts: boolean } }>;
  const item = items.find((i) => i.push?.counts);
  if (!item) return;
  const t = content.ordersOf(c.factionId).find((x) => x.id === item.templateId);
  if (!t || !pushCounts(item as never, t, a, residenceCtx(c))) return;
  const scope = pushScope(c.factionId, today);
  await Contribution.updateOne(
    { _id: contributionId(scope, c._id) },
    {
      $inc: { amount: attempts },
      $set: { lastAt: new Date(now), level: c.level, name: c.name },
      $setOnInsert: {
        scope,
        kind: 'faction',
        cityId: item.push!.cityId,
        placeId: item.push!.districtId ?? item.push!.cityId,
        ref: String(today),
        characterId: c._id,
        factionId: c.factionId,
      },
    },
    { upsert: true, session },
  );
}

/** Nation step 'push' (§8.2 step 2): the party's target of day `d − 1` per faction, stored once. */
async function pushResults(ctx: NationBoundaryCtx): Promise<void> {
  const day = ctx.d - 1;
  for (const f of FACTION_IDS) {
    const fs = ctx.factions[f];
    if (!fs) continue;
    const s = standingOn(fs.orders, day);
    if (!s?.push || fs.pushDays.some((p) => p.day === day)) continue;
    const count = await pushCount(f, day, ctx.session);
    const met = pushMet(count, s.push.target);
    const row = { day, slot: s.push.slot, cityId: s.push.cityId, districtId: s.push.districtId, target: s.push.target, count, met };
    await FactionState.updateOne(
      { _id: f, 'pushDays.day': { $ne: day } },
      { $push: { pushDays: { $each: [row], $slice: -14 } } },
      { session: ctx.session },
    );
    if (met) {
      const who = await Contribution.find({ scope: pushScope(f, day) }, { characterId: 1 }).session(ctx.session).lean<Array<{ characterId: Types.ObjectId }>>();
      const city = ctx.content.city(s.push.cityId);
      const place = s.push.districtId ? (ctx.content.district(s.push.districtId)?.quarter.name ?? s.push.districtId) : (city?.name ?? s.push.cityId);
      ctx.news.push({
        ...newsItem(ctx.d, 'nl.target-met', 2, f, { faction: ctx.content.faction(f).name, place, count, target: s.push.target }),
        contributors: who.map((w) => w.characterId),
      });
    }
  }
}

export const chairDeskSteps = [pushResults] as const;

