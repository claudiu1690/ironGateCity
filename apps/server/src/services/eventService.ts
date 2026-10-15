import { randomBytes } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { CampaignEvent, Character, ChatMessage, City as CityModel, District, EventSignup, IssueModel, isDuplicateKeyError } from '@irongate/db';
import type { CampaignEventDoc, CharacterDoc, CityDoc, EventHolder, EventSignupDoc } from '@irongate/db';

type StoredEventOpen = NonNullable<CharacterDoc['events']>['open'][number];
import {
  ENERGY,
  EVENTS,
  advanceOrders,
  addToTally,
  applyGains,
  callGate,
  canWithdraw,
  createRng,
  dayKey,
  eventCredit,
  orderRewards,
  projectEnergy,
  refundEnergy,
  resolveCampaignEvent,
  signUpGate,
  spendEnergy,
  standingPerSuccess,
  startsAtFor,
  withdrawUntil,
} from '@irongate/rules';
import type {
  CharacterView,
  EventHours,
  EventPageView,
  EventParticipantInput,
  EventResult,
  FactionId,
  PoliticalResult,
  SignupResultDoc,
} from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { GameError, gameError } from '../gameError';
import { captureException } from '../sentry';
import type { SessionUser } from '../trpc/context';
import { progressOf, progressSet } from './actionService';
import { branchChannel, cityChannel, systemLine } from './chatOutbox';
import { ensureSettled, loadCharacter } from './dayService';
import type { LoadedCharacter } from './dayService';
import { eventDescriptor, headlineTarget, placeIdOf, readEventPlace, typeOf, venueOfEvent } from './eventPlace';
import { eventScheduler } from './eventScheduler';
import { buildReceipt, pageView } from './eventViews';
import { addInfluence, addPoints, writeLedger } from './ledger';
import { heatDoc, heatRateOn, heatTimerOf, isRivalGround, notFree } from './risk';
import { residenceCityId, residenceCtx } from './residence';
import { restedCapToday } from './modifiers';
import { runKeyedAction } from './keyedAction';
import { withRequestKey } from './requestKey';
import { t6 } from './togetherCopy';
import { DayChanged, MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import { energyState, fromOrdersState, namedStanding, preferredStat, standingSuccesses, toCharacterView, toOrdersState, wornStats } from './views';

/**
 * Slice 6: Campaign Events on the server (ADR 0036, 0037; tech design §3, §8.2). Calling and signing
 * up are one transaction each with the tap's key on `eventSignups`; the resolution writes the world
 * only (one transaction, any number of runners resolve once); each participant's own read credits
 * the stored result into their character (version-guarded) and queues one modal.
 */

export interface EventDeps {
  user: SessionUser;
  content: GameContent;
  now: () => number;
}

const oid = (s: string): Types.ObjectId => new Types.ObjectId(s);

function holderOf(c: CharacterDoc, signupId: Types.ObjectId, now: number): EventHolder {
  return {
    characterId: c._id,
    signupId,
    name: c.name,
    avatarId: c.avatarId ?? null,
    rank: c.rank,
    level: c.level,
    signedAt: new Date(now),
  };
}

const openSignups = (c: Pick<CharacterDoc, 'events'>): number => c.events?.open?.length ?? 0;
const inTransit = (c: Pick<CharacterDoc, 'journey'>): boolean => !!c.journey && c.journey.status === 'onTheWay';
const onEvent = (ev: Pick<CampaignEventDoc, 'roles' | 'hands'>, id: Types.ObjectId): boolean =>
  ev.roles.some((r) => r.holder?.characterId.equals(id)) || ev.hands.some((h) => h.characterId.equals(id));

/** The political modal of a call or a sign-up (tech §10.2). */
function tapResult(
  content: GameContent,
  i: {
    act: 'call' | 'signUp';
    c: CharacterDoc;
    ev: CampaignEventDoc;
    slot: string;
    energyBefore: number;
    energyAfter: number;
    restedBefore: number;
    restedAfter: number;
    orderFxp: number;
    now: number;
    idempotencyKey: string;
    residenceCity: CityDoc | null;
    view: EventPageView;
  },
): PoliticalResult {
  const type = typeOf(content, i.ev.typeId);
  const v = venueOfEvent(content, i.ev);
  const roleName = i.slot === 'hand' ? t6('modal.hand') : (type.roles.find((r) => r.id === i.slot)?.name ?? i.slot);
  const vars = { event: type.runningName, venue: v.location.name, role: roleName };
  const home = content.city(residenceCityId(i.c));
  const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
  const key = i.act === 'call' ? 'call' : 'signUp';
  // A hand's "role" is *a pair of hands*: the templates' *You're the {role}* would read "the a pair".
  const hand = (text: string) => (i.slot === 'hand' ? text.replace(/the (a pair of hands)/g, '$1') : text);
  return {
    kind: 'political',
    act: i.act,
    stamp: { label: t6(`modal.${key}.stamp`), tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: i.ev.cityId, cityName: content.city(i.ev.cityId)?.name ?? i.ev.cityId },
    headline: hand(t6(`modal.${key}.headline`, vars)),
    body: hand(t6(`modal.${key}.body`, vars)),
    next: hand(t6(`modal.${key}.next`, vars)),
    at: i.ev.startsAt.getTime(),
    until: withdrawUntil(i.ev.startsAt.getTime()),
    knockOns: {
      pc: null,
      morale: null,
      backers: null,
      energy: { before: i.energyBefore, after: i.energyAfter },
      rested: i.restedBefore !== i.restedAfter ? { before: i.restedBefore, after: i.restedAfter } : null,
      fxp: i.orderFxp > 0 ? { added: i.orderFxp, order: i.orderFxp } : null,
    },
    performedAt: new Date(i.now).toISOString(),
    idempotencyKey: i.idempotencyKey,
    character: toCharacterView(i.c, i.now, content, null, { city: i.residenceCity }),
    view: { kind: 'event', event: i.view },
  };
}

/**
 * The character's side of a call or a sign-up, inside the transaction: Energy and Rested (lazy, no
 * Rested above the bar's rule), the event order at the tap, the tally, `events.open`, the venue as
 * presence. Guarded by the version and the settled day.
 */
async function commitTap(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  i: { ev: CampaignEventDoc; slot: string; cost: number; signupId: Types.ObjectId; now: number },
): Promise<{
  updated: CharacterDoc;
  energyBefore: number;
  restedBefore: number;
  restedCovered: number;
  orderBonus: boolean;
  orderFxp: number;
  residenceCity: CityDoc | null;
}> {
  const now = i.now;
  const today = dayKey(now);
  if (c.day.settled !== today) throw new DayChanged();
  const residenceCity = await CityModel.findById(residenceCityId(c)).session(session).lean<CityDoc>();
  const cap = restedCapToday(content, residenceCity, today, c.room);
  const p = projectEnergy(energyState(c), now, ENERGY.max, cap);
  const spent = spendEnergy({ value: p.value, rested: p.rested, updatedAt: p.updatedAt }, i.cost);
  if (!spent.ok) {
    throw new GameError('NOT_ENOUGH_ENERGY', { energy: p.value, cost: i.cost, times: 1, nextTickAt: p.nextTickAt });
  }
  const templates = content.ordersOf(c.factionId);
  const adv = advanceOrders(toOrdersState(c.orders), templates, eventDescriptor(content, i.ev), 'success', residenceCtx(c), now);
  const pay = orderRewards(
    adv.completed ? templates.filter((t) => t.id === adv.completed!.templateId) : [],
    adv.allDone,
  );
  const gains = applyGains(progressOf(c), { xp: 0, fxp: pay.fxp, pc: pay.pc });
  const tally = addToTally(c.today, today, {
    energy: i.cost,
    fxp: pay.fxp,
    pc: pay.pc,
    ordersDone: adv.completed ? 1 : 0,
  });
  const pointer: StoredEventOpen = {
    signupId: i.signupId,
    eventId: i.ev._id,
    cityId: i.ev.cityId,
    startsAt: i.ev.startsAt,
    slot: i.slot,
    energy: i.cost,
  };
  const updated = await Character.findOneAndUpdate(
    {
      _id: c._id,
      version: c.version,
      'day.settled': today,
      [`events.open.${EVENTS.maxOpenSignups - 1}`]: { $exists: false },
    },
    {
      $set: {
        lastActionAt: new Date(now),
        ...progressSet(gains),
        'energy.value': spent.state.value,
        'energy.updatedAt': new Date(spent.state.updatedAt),
        rested: spent.state.rested,
        orders: fromOrdersState(adv.orders),
        today: tally,
        'presence.locationId': i.ev.venueId,
        'presence.seenAt': new Date(now),
      },
      $push: { 'events.open': pointer },
      $inc: { version: 1 },
    },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  return {
    updated,
    energyBefore: p.value,
    restedBefore: p.rested,
    restedCovered: spent.restedUsed,
    orderBonus: adv.advanced !== null,
    orderFxp: pay.fxp,
    residenceCity,
  };
}

/** Resolve the place's open member event if it is due, so the "one open" index reflects the truth. */
async function resolveDueAt(content: GameContent, factionId: FactionId, placeId: string, now: number): Promise<void> {
  const due = await CampaignEvent.find(
    { factionId, placeId, status: 'open', startsAt: { $lte: new Date(now) } },
    { _id: 1 },
  ).lean();
  for (const e of due) await resolveEvent(content, e._id, now);
}

/** `events.call` (tech §8.2): the caller's tap is the event's first sign-up. */
export async function callEvent(
  deps: EventDeps & {
    input: { typeId: string; hours: EventHours; roleId: string; districtId: string | null; idempotencyKey: string };
  },
): Promise<PoliticalResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const fast = await storedTap(c0._id, input.idempotencyKey, (s) => s.caller && s.typeId === input.typeId);
  if (fast) return fast;
  const type = content.eventType(input.typeId);
  if (!type) throw gameError('BAD_REQUEST', 'UNKNOWN_EVENT_TYPE', { typeId: input.typeId });
  const role = type.roles.find((r) => r.id === input.roleId);
  if (!role) throw gameError('BAD_REQUEST', 'UNKNOWN_ROLE', { roleId: input.roleId });
  const cityId = c0.cityId;
  const city = content.city(cityId);
  const districted = content.isDistricted(cityId);
  const districtId = districted ? input.districtId : null;
  const venue = content.venueOf(type.id, cityId, districtId);
  const rival = isRivalGround(content, c0, cityId);
  const inOpenCity = !!city?.council && (districted || city.homeFactionId === c0.factionId);
  const gate = callGate({
    rank: c0.rank,
    inOpenCity,
    held: !!c0.held && c0.held.state === 'in',
    inTransit: inTransit(c0),
    runInPending: c0.runIn?.state === 'pending',
    rivalGround: rival,
    ...(type.factionId ? { typeFactionId: type.factionId } : {}),
    factionId: c0.factionId,
    districtOk: !!venue,
    openSignups: openSignups(c0),
  });
  if (gate) {
    const code = gate.reason === 'WRONG_DISTRICT' ? 'BAD_REQUEST' : 'PRECONDITION_FAILED';
    const reason = gate.reason === 'WHERE' ? 'WRONG_CITY' : gate.reason;
    throw gameError(code, reason, { ...(gate.need !== undefined ? { need: gate.need } : {}), ...(gate.reason === 'WRONG_DISTRICT' ? { districtId } : {}) });
  }
  const busy = notFree(c0);
  if (busy) throw busy.toTRPC();
  const placeId = placeIdOf(cityId, districtId);
  await resolveDueAt(content, c0.factionId, placeId, deps.now());

  let scheduled: { eventId: string; at: Date } | null = null;
  const result = await runKeyedAction<PoliticalResult>({
    key: { characterId: c0._id, idempotencyKey: input.idempotencyKey },
    stored: () => storedTap(c0._id, input.idempotencyKey, (s) => s.caller && s.typeId === input.typeId),
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    write: async (session) => {
      const now = deps.now();
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      const e = notFree(c);
      if (e) throw e;
      if (c.cityId !== cityId || inTransit(c)) throw new GameError('WRONG_CITY', { cityId: c.cityId });
      if (openSignups(c) >= EVENTS.maxOpenSignups) throw new GameError('TOO_MANY_SIGNUPS', { max: EVENTS.maxOpenSignups });
      const open = await CampaignEvent.findOne({ factionId: c.factionId, placeId, kind: 'member', status: 'open' })
        .session(session)
        .lean<CampaignEventDoc>();
      if (open) {
        throw new GameError('ONE_AT_A_TIME', { eventId: open._id.toHexString(), startsAt: open.startsAt.getTime() });
      }
      const startsAt = startsAtFor(now, input.hours);
      const day = dayKey(startsAt);
      const starts = await CampaignEvent.countDocuments({ factionId: c.factionId, placeId, day, kind: 'member' }).session(session);
      if (starts >= EVENTS.perPlaceDay.memberStarts) throw new GameError('BRANCH_HANDS_FULL', { cityId });
      const ev0 = { typeId: type.id, cityId, districtId, venueId: venue!.location.id, factionId: c.factionId };
      const place = await readEventPlace(content, ev0, day, session);
      const eventId = new Types.ObjectId();
      const signupId = new Types.ObjectId();
      const ev: CampaignEventDoc = {
        _id: eventId,
        kind: 'member',
        typeId: type.id,
        factionId: c.factionId,
        cityId,
        districtId,
        placeId,
        venueId: venue!.location.id,
        day,
        dayIndex: (starts + 1) as 1 | 2,
        calledBy: { kind: 'member', characterId: c._id, name: c.name },
        calledAt: new Date(now),
        startsAt: new Date(startsAt),
        targetFactionId: type.special === 'againstLeader' ? headlineTarget(c.factionId, place) : null,
        seed: randomBytes(16).toString('hex'),
        roles: type.roles.map((r) => ({ roleId: r.id, holder: r.id === role.id ? holderOf(c, signupId, now) : null })),
        hands: [],
        rev: 1,
        status: 'open',
        result: null,
        resolvedAt: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      try {
        await CampaignEvent.create([ev], { session });
      } catch (err) {
        if (isDuplicateKeyError(err)) throw new GameError('ONE_AT_A_TIME', { cityId });
        throw err;
      }
      const tap = await commitTap(content, session, c, { ev, slot: role.id, cost: role.energy, signupId, now });
      const view = await pageView(content, ev, tap.updated, now, { place, session });
      const result = tapResult(content, {
        act: 'call',
        c: tap.updated,
        ev,
        slot: role.id,
        energyBefore: tap.energyBefore,
        energyAfter: tap.updated.energy.value,
        restedBefore: tap.restedBefore,
        restedAfter: tap.updated.rested,
        orderFxp: tap.orderFxp,
        now,
        idempotencyKey: input.idempotencyKey,
        residenceCity: tap.residenceCity,
        view,
      });
      await insertSignup(session, ev, c, {
        signupId,
        slot: role.id,
        caller: true,
        energy: role.energy,
        restedCovered: tap.restedCovered,
        orderBonus: tap.orderBonus,
        idempotencyKey: input.idempotencyKey,
        now,
        tap: result,
      });
      const ch = branchChannel(content, c, cityId);
      await systemLine(session, {
        channel: ch.channel,
        factionId: c.factionId,
        cityId: ch.cityId,
        kind: 'eventCalled',
        payload: {
          name: c.name,
          eventId: eventId.toHexString(),
          event: type.runningName,
          venue: venue!.location.name,
          time: startsAt,
          filled: 1,
          roles: type.roles.length,
        },
        ref: eventId.toHexString(),
        dedupeKey: `called:${eventId.toHexString()}`,
        at: new Date(now),
      });
      scheduled = { eventId: eventId.toHexString(), at: new Date(startsAt) };
      return result;
    },
  });
  if (scheduled) scheduleResolve(scheduled);
  return result;
}

function scheduleResolve(s: { eventId: string; at: Date }): void {
  void Promise.resolve()
    .then(() => eventScheduler().resolveAt(s.eventId, s.at))
    .catch((err: unknown) => captureException(err, { where: 'campaign-event-resolve schedule', eventId: s.eventId }));
}

async function storedTap(
  characterId: Types.ObjectId,
  idempotencyKey: string,
  same: (s: EventSignupDoc) => boolean,
): Promise<PoliticalResult | null> {
  const s = await EventSignup.findOne({ characterId, idempotencyKey }).lean<EventSignupDoc>();
  if (!s) return null;
  if (!same(s)) throw gameError('CONFLICT', 'KEY_REUSED', { idempotencyKey });
  return s.tap;
}

async function insertSignup(
  session: ClientSession,
  ev: CampaignEventDoc,
  c: CharacterDoc,
  i: {
    signupId: Types.ObjectId;
    slot: string;
    caller: boolean;
    energy: number;
    restedCovered: number;
    orderBonus: boolean;
    idempotencyKey: string;
    now: number;
    tap: PoliticalResult;
  },
): Promise<void> {
  await EventSignup.create(
    [
      {
        _id: i.signupId,
        eventId: ev._id,
        characterId: c._id,
        factionId: c.factionId,
        typeId: ev.typeId,
        cityId: ev.cityId,
        placeId: ev.placeId,
        day: ev.day,
        startsAt: ev.startsAt,
        slot: i.slot,
        caller: i.caller,
        energy: i.energy,
        restedCovered: i.restedCovered,
        orderBonus: i.orderBonus,
        idempotencyKey: i.idempotencyKey,
        signedAt: new Date(i.now),
        tap: i.tap,
        status: 'committed',
        withdrawnAt: null,
        refund: null,
        result: null,
        receipt: null,
        creditedAt: null,
      },
    ],
    { session },
  );
}

/** Why a sign-up's slot write missed, read again (tech §8.2). */
function missReason(ev: CampaignEventDoc | null, me: Types.ObjectId, roleIdx: number | null, now: number): GameError {
  if (!ev) return new GameError('EVENT_NOT_FOUND');
  if (ev.status !== 'open') return new GameError('EVENT_CLOSED');
  if (ev.startsAt.getTime() <= now) return new GameError('EVENT_STARTED');
  if (onEvent(ev, me)) return new GameError('ALREADY_ON_EVENT');
  if (roleIdx === null) return new GameError('HANDS_FULL');
  return new GameError('ROLE_TAKEN');
}

/** `events.signUp` (tech §8.2): a named role (Rank 2) or a pair of hands (any Rank). */
export async function signUpEvent(
  deps: EventDeps & { input: { eventId: string; slot: { roleId: string } | 'hand'; idempotencyKey: string } },
): Promise<PoliticalResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const slotId = input.slot === 'hand' ? 'hand' : input.slot.roleId;
  const same = (s: EventSignupDoc) => !s.caller && s.eventId.toHexString() === input.eventId && s.slot === slotId;
  const fast = await storedTap(c0._id, input.idempotencyKey, same);
  if (fast) return fast;
  const ev0 = await CampaignEvent.findOne({ _id: oid(input.eventId), factionId: c0.factionId }).lean<CampaignEventDoc>();
  if (!ev0) throw gameError('NOT_FOUND', 'EVENT_NOT_FOUND');
  const type = typeOf(content, ev0.typeId);
  const roleIdx = slotId === 'hand' ? null : type.roles.findIndex((r) => r.id === slotId);
  if (roleIdx !== null && roleIdx < 0) throw gameError('BAD_REQUEST', 'UNKNOWN_ROLE', { roleId: slotId });
  const cost = roleIdx === null ? EVENTS.hands.energy : type.roles[roleIdx]!.energy;
  const now0 = deps.now();
  if (ev0.status !== 'open') {
    const winner = await storedTap(c0._id, input.idempotencyKey, same);
    if (winner) return winner;
    throw gameError('PRECONDITION_FAILED', 'EVENT_CLOSED');
  }
  const p = projectEnergy(energyState(c0), now0, ENERGY.max, restedCapToday(content, loaded.city, dayKey(now0), c0.room));
  const gate = signUpGate({
    slot: slotId,
    rank: c0.rank,
    energy: p.value,
    cost,
    sameCity: c0.cityId === ev0.cityId && !inTransit(c0),
    held: !!c0.held && c0.held.state === 'in',
    inTransit: inTransit(c0),
    runInPending: c0.runIn?.state === 'pending',
    onEvent: onEvent(ev0, c0._id),
    openSignups: openSignups(c0),
    slotFree: roleIdx === null ? ev0.hands.length < EVENTS.hands.max : ev0.roles[roleIdx]?.holder === null,
    started: ev0.startsAt.getTime() <= now0,
  });
  // Slice 6 fix round (QA m1): the pre-checks read the event after the character, so a copy of
  // this tap that committed in between makes them refuse (ALREADY_ON_EVENT, or the Energy it
  // spent). Before refusing, the winner's stored result is the answer, as in the transaction.
  const refuse = async (err: Error): Promise<PoliticalResult> => {
    const winner = await storedTap(c0._id, input.idempotencyKey, same);
    if (winner) return winner;
    throw err;
  };
  if (gate) {
    const reason = gate.reason === 'TOO_MANY_SIGNUPS' ? 'TOO_MANY_SIGNUPS' : gate.reason;
    return refuse(
      gameError('PRECONDITION_FAILED', reason, {
        ...(gate.need !== undefined ? { need: gate.need } : {}),
        ...(gate.reason === 'NOT_ENOUGH_ENERGY' ? { energy: p.value, cost, nextTickAt: p.nextTickAt } : {}),
        ...(gate.reason === 'TOO_MANY_SIGNUPS' ? { max: EVENTS.maxOpenSignups } : {}),
      }),
    );
  }
  const busy = notFree(c0);
  if (busy) return refuse(busy.toTRPC());

  return runKeyedAction<PoliticalResult>({
    key: { characterId: c0._id, idempotencyKey: input.idempotencyKey },
    stored: () => storedTap(c0._id, input.idempotencyKey, same),
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    write: async (session) => {
      const now = deps.now();
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      const e = notFree(c);
      if (e) throw e;
      if (c.cityId !== ev0.cityId || inTransit(c)) throw new GameError('WRONG_CITY', { cityId: c.cityId });
      if (openSignups(c) >= EVENTS.maxOpenSignups) throw new GameError('TOO_MANY_SIGNUPS', { max: EVENTS.maxOpenSignups });
      const signupId = new Types.ObjectId();
      const holder = holderOf(c, signupId, now);
      const filter: Record<string, unknown> = {
        _id: ev0._id,
        factionId: c.factionId,
        status: 'open',
        startsAt: { $gt: new Date(now) },
        'roles.holder.characterId': { $ne: c._id },
        'hands.characterId': { $ne: c._id },
        // The slot's guard (ADR 0036): the role still empty, or fewer than four hands.
        ...(roleIdx !== null
          ? { roles: { $elemMatch: { roleId: slotId, holder: null } } }
          : { [`hands.${EVENTS.hands.max - 1}`]: { $exists: false } }),
      };
      const ev = await CampaignEvent.findOneAndUpdate(
        filter,
        {
          ...(roleIdx !== null ? { $set: { 'roles.$.holder': holder } } : { $push: { hands: holder } }),
          $inc: { rev: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!ev) {
        const now2 = await CampaignEvent.findById(ev0._id).session(session).lean<CampaignEventDoc>();
        throw missReason(now2, c._id, roleIdx, now);
      }
      const tap = await commitTap(content, session, c, { ev, slot: slotId, cost, signupId, now });
      const view = await pageView(content, ev, tap.updated, now, { session });
      const result = tapResult(content, {
        act: 'signUp',
        c: tap.updated,
        ev,
        slot: slotId,
        energyBefore: tap.energyBefore,
        energyAfter: tap.updated.energy.value,
        restedBefore: tap.restedBefore,
        restedAfter: tap.updated.rested,
        orderFxp: tap.orderFxp,
        now,
        idempotencyKey: input.idempotencyKey,
        residenceCity: tap.residenceCity,
        view,
      });
      await insertSignup(session, ev, c, {
        signupId,
        slot: slotId,
        caller: false,
        energy: cost,
        restedCovered: tap.restedCovered,
        orderBonus: tap.orderBonus,
        idempotencyKey: input.idempotencyKey,
        now,
        tap: result,
      });
      return result;
    },
  });
}

/** `events.withdraw` (tech §8.2): until an hour before the start; the Energy back by the overflow rule. */
export async function withdrawEvent(
  deps: EventDeps & { input: { eventId: string; idempotencyKey: string } },
): Promise<{ event: EventPageView; character: CharacterView; refund: { energy: number; rested: number } }> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const eventId = oid(input.eventId);
  return withRequestKey({
    characterId: c0._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'events.withdraw',
    input: { eventId: input.eventId },
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      const s = await EventSignup.findOne({ eventId, characterId: c._id, status: 'committed' })
        .session(session)
        .lean<EventSignupDoc>();
      if (!s) throw new GameError('NOT_SIGNED_UP');
      if (!canWithdraw(s.startsAt.getTime(), now)) {
        throw new GameError('WITHDRAW_CLOSED', { committedFrom: withdrawUntil(s.startsAt.getTime()) });
      }
      const ev = await CampaignEvent.findOneAndUpdate(
        s.slot === 'hand'
          ? { _id: eventId, status: 'open', 'hands.signupId': s._id }
          : { _id: eventId, status: 'open', roles: { $elemMatch: { roleId: s.slot, 'holder.signupId': s._id } } },
        s.slot === 'hand'
          ? { $pull: { hands: { signupId: s._id } }, $inc: { rev: 1 } }
          : { $set: { 'roles.$.holder': null }, $inc: { rev: 1 } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!ev) throw new GameError('NOT_SIGNED_UP');
      const residenceCity = await CityModel.findById(residenceCityId(c)).session(session).lean<CityDoc>();
      const cap = restedCapToday(content, residenceCity, today, c.room);
      const p = projectEnergy(energyState(c), now, ENERGY.max, cap);
      const back = refundEnergy(p, s.energy, s.restedCovered, cap);
      const refund = { energy: back.value - p.value, rested: back.rested - p.rested };
      const sameDay = dayKey(s.signedAt.getTime()) === today;
      const tally = sameDay ? addToTally(c.today, today, { energy: -s.energy }) : c.today;
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'events.open.signupId': s._id },
        {
          $set: {
            'energy.value': back.value,
            'energy.updatedAt': new Date(back.updatedAt),
            rested: back.rested,
            today: tally,
          },
          $pull: { 'events.open': { signupId: s._id } },
          ...(s.caller ? { $push: { 'events.calls': { eventId, startsAt: s.startsAt } } } : {}),
          $inc: { version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const done = await EventSignup.updateOne(
        { _id: s._id, status: 'committed' },
        { $set: { status: 'withdrawn', withdrawnAt: new Date(now), refund } },
        { session },
      );
      if (done.modifiedCount !== 1) throw new VersionConflict();
      const event = await pageView(content, ev, updated, now, { session });
      return {
        event,
        character: toCharacterView(updated, now, content, null, { city: residenceCity }),
        refund,
      };
    },
  });
}

/** `events.nudge` (tech §22.1 Q9), *the invite* for players (design §23.2): a member on an open event invites a mate not on it, once per pair. */
export async function nudgeEvent(
  deps: EventDeps & { input: { eventId: string; characterId: string } },
): Promise<{ asked: true; already: boolean }> {
  const { content, input } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const ev = await CampaignEvent.findOne({ _id: oid(input.eventId), factionId: c.factionId }).lean<CampaignEventDoc>();
  const mate = await Character.findById(oid(input.characterId), {
    _id: 1, name: 1, factionId: 1, rank: 1, residence: 1, homeCityId: 1,
  }).lean<CharacterDoc>();
  if (
    !ev ||
    ev.status !== 'open' ||
    ev.startsAt.getTime() <= now ||
    !onEvent(ev, c._id) ||
    !mate ||
    mate.factionId !== c.factionId ||
    mate._id.equals(c._id) ||
    onEvent(ev, mate._id)
  ) {
    throw gameError('PRECONDITION_FAILED', 'NUDGE_NOT_ALLOWED');
  }
  const type = typeOf(content, ev.typeId);
  const role = type.roles.find((r, i) => ev.roles[i]?.holder === null && mate.rank >= EVENTS.namedRoleRank);
  const handFree = ev.hands.length < EVENTS.hands.max;
  if (!role && !handFree) throw gameError('PRECONDITION_FAILED', 'NUDGE_NOTHING_OPEN');
  const key = `nudge:${ev._id.toHexString()}:${c._id.toHexString()}:${mate._id.toHexString()}`;
  const ch = branchChannel(content, mate, ev.cityId);
  const already = !!(await ChatMessage.exists({ dedupeKey: key }));
  if (!already) {
    await systemLine(null, {
      channel: ch.channel,
      factionId: c.factionId,
      cityId: ch.cityId,
      kind: 'nudge',
      payload: {
        caller: c.name,
        name: mate.name,
        eventId: ev._id.toHexString(),
        event: type.runningName,
        // Review 7 #3 (design §23.2): the invite names the venue.
        venue: venueOfEvent(content, ev).location.name,
        role: role ? role.name : null,
        hand: !role,
        time: ev.startsAt.getTime(),
      },
      to: mate._id,
      ref: ev._id.toHexString(),
      dedupeKey: key,
      at: new Date(now),
    });
  }
  return { asked: true, already };
}

// ---------------------------------------------------------------------------------------------
// Resolution (ADR 0037): the world only.
// ---------------------------------------------------------------------------------------------

/** Test hooks (§8.6): forced rolls per event, consumed once. */
export const eventHooks: { rolls: Map<string, Record<string, number> | 'success' | 'failure'> } = { rolls: new Map() };

function forcedRollsFor(eventId: string, roleIds: string[]): Record<string, number> | undefined {
  const r = eventHooks.rolls.get(eventId);
  if (r === undefined) return undefined;
  eventHooks.rolls.delete(eventId);
  if (r === 'success') return Object.fromEntries(roleIds.map((id) => [id, 1]));
  if (r === 'failure') return Object.fromEntries(roleIds.map((id) => [id, 100]));
  return r;
}

/**
 * Resolve an event at its start (ADR 0037): any runner (the job, a read, the city day). Nothing
 * unless open and due. One transaction writes the event's result, the meter, the ledger,
 * contributions and the faction scopes, Issue momentum, each sign-up's result and the chat line.
 * `inCityDay`: called from the city day's catch-up, which has already settled the city's day.
 */
export async function resolveEvent(
  content: GameContent,
  eventId: Types.ObjectId,
  now: number,
): Promise<boolean> {
  const ev0 = await CampaignEvent.findById(eventId, { status: 1, startsAt: 1 }).lean();
  if (!ev0 || ev0.status !== 'open' || ev0.startsAt.getTime() > now) return false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS + 2; attempt++) {
    try {
      return await inTransaction((session) => resolveInTx(content, session, eventId, now));
    } catch (err) {
      if (err instanceof VersionConflict || err instanceof DayChanged || isDuplicateKeyError(err)) continue;
      throw err;
    }
  }
  const fresh = await CampaignEvent.findById(eventId, { status: 1 }).lean();
  if (fresh && fresh.status !== 'open') return false;
  throw new Error(`event ${eventId.toHexString()} kept conflicting at resolution`);
}

export async function resolveInTx(
  content: GameContent,
  session: ClientSession,
  eventId: Types.ObjectId,
  now: number,
): Promise<boolean> {
  const ev = await CampaignEvent.findById(eventId).session(session).lean<CampaignEventDoc>();
  if (!ev || ev.status !== 'open' || ev.startsAt.getTime() > now) return false;
  const type = typeOf(content, ev.typeId);
  const at = ev.startsAt;
  const signups = await EventSignup.find({ eventId: ev._id, status: 'committed' }).session(session).lean<EventSignupDoc[]>();
  const holders = [
    ...ev.roles.flatMap((r) => (r.holder ? [{ slot: r.roleId, h: r.holder }] : [])),
    ...ev.hands.map((h) => ({ slot: 'hand', h })),
  ];
  const chars = holders.length
    ? await Character.find({ _id: { $in: holders.map((x) => x.h.characterId) } }).session(session).lean<CharacterDoc[]>()
    : [];
  const byId = new Map(chars.map((c) => [c._id.toHexString(), c]));
  const place = await readEventPlace(content, ev, ev.day, session);
  const participants: EventParticipantInput[] = [];
  for (const x of holders) {
    const c = byId.get(x.h.characterId.toHexString());
    const s = signups.find((y) => y._id.equals(x.h.signupId));
    if (!c || !s) continue;
    const firstToday = !(await EventSignup.exists({
      characterId: c._id,
      day: ev.day,
      status: { $in: ['committed', 'resolved'] },
      $or: [{ startsAt: { $lt: ev.startsAt } }, { startsAt: ev.startsAt, eventId: { $lt: ev._id } }],
    }).session(session));
    const successes = standingSuccesses(c, ev.cityId);
    const city = content.city(ev.cityId)!;
    participants.push({
      characterId: c._id.toHexString(),
      signupId: s._id.toHexString(),
      slot: x.slot,
      energy: s.energy,
      restedCovered: s.restedCovered,
      orderBonus: s.orderBonus,
      firstToday,
      values: wornStats(c, content),
      standingSuccesses: successes,
      standingLabel: `${namedStanding(content, ev.cityId, successes).name} in ${city.name}`,
      prefer: preferredStat(content, c.factionId),
    });
  }
  const r = resolveCampaignEvent(
    {
      type,
      cityRole: content.city(ev.cityId)!.role,
      factionId: ev.factionId,
      homeFactionId: place.homeFactionId,
      participants,
      modifiers: place.modifiers,
      tagged: place.tagged,
      shares: place.shares,
      targetFactionId: ev.targetFactionId,
      ...withForced(ev._id.toHexString(), type.roles.map((x) => x.id)),
    },
    (name) => createRng(`${ev.seed}:${name}`),
  );
  const { participants: parts, ...rest } = r;
  const done = await CampaignEvent.updateOne(
    { _id: ev._id, status: 'open', rev: ev.rev },
    {
      $set: {
        status: r.calledOff ? 'calledOff' : 'resolved',
        result: { ...rest, participants: parts.map((p) => ({ characterId: p.characterId, signupId: p.signupId, slot: p.slot })) },
        resolvedAt: new Date(now),
      },
    },
    { session },
  );
  if (done.modifiedCount !== 1) throw new VersionConflict();
  if (r.calledOff) return true;

  // The meter: the district's or the city's (ADR 0027), with the morale record on a home city.
  if (ev.districtId) {
    await District.updateOne({ _id: ev.districtId }, { $set: { opinion: r.opinion.shares } }, { session });
  } else {
    await CityModel.updateOne({ _id: ev.cityId }, { $set: { opinion: r.opinion.shares } }, { session, upsert: true });
  }
  const placeId = ev.placeId;
  const ref = ev._id.toHexString();
  for (const p of parts) {
    const c = byId.get(p.characterId)!;
    const who = { _id: c._id, name: c.name, factionId: c.factionId, level: c.level };
    const legs = [
      { factionId: ev.factionId, swing: p.share.actor / 1_000 },
      ...(r.opinion.mode === 'against' && r.opinion.targetFactionId
        ? [{ factionId: r.opinion.targetFactionId, swing: p.share.target / 1_000 }]
        : []),
    ];
    await writeLedger(
      content,
      legs.map((l) => ({
        cityId: ev.cityId,
        placeId,
        factionId: l.factionId,
        swing: l.swing,
        kind: 'event' as const,
        characterId: c._id,
        ref,
        day: ev.day,
        at,
      })),
      session,
    );
    await addInfluence(content, session, {
      c: who,
      cityId: ev.cityId,
      placeId,
      points: p.share.actor / 1_000,
      day: ev.day,
      at,
      event: true,
    });
    for (const pt of p.points) {
      if (pt.points <= 0) continue;
      const doc = await IssueModel.findOneAndUpdate(
        { _id: pt.docId, status: 'live' },
        { $inc: { [`momentum.${ev.factionId}`]: pt.points } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!doc) continue; // the week resolved before a late resolution (the boundary order makes this rare)
      await addPoints(session, { c: who, cityId: ev.cityId, placeId: doc.districtId ?? ev.cityId, docId: pt.docId, points: pt.points, at });
    }
    const result: SignupResultDoc = { ...p, band: r.band, eventId: ref };
    const s = await EventSignup.updateOne(
      { _id: oid(p.signupId), status: 'committed' },
      { $set: { status: 'resolved', result } },
      { session },
    );
    if (s.modifiedCount !== 1) throw new VersionConflict();
  }
  const caller = ev.calledBy.kind === 'member' ? byId.get(ev.calledBy.characterId.toHexString()) : undefined;
  const ch = caller ? branchChannel(content, caller, ev.cityId) : { channel: cityChannel(ev.factionId, ev.cityId), cityId: ev.cityId };
  await systemLine(session, {
    channel: ch.channel,
    factionId: ev.factionId,
    cityId: ch.cityId,
    kind: 'eventResult',
    payload: {
      eventId: ref,
      event: type.runningName,
      venue: venueOfEvent(content, ev).location.name,
      outcome: r.band,
      swing: r.opinion.mode === 'against' ? (r.opinion.toActor ?? 0) : r.opinion.applied,
      members: parts.length,
    },
    ref,
    dedupeKey: `result:${ref}`,
    at: new Date(Math.max(at.getTime(), Math.min(now, at.getTime() + 60_000))),
  });
  return true;
}

function withForced(eventId: string, roleIds: string[]): { forcedRolls?: Record<string, number> } {
  const f = forcedRollsFor(eventId, roleIds);
  return f ? { forcedRolls: f } : {};
}

/**
 * The city day's catch-up (tech §3.2): every open event of the city with `day < d` is resolved, each
 * in its own transaction, before the boundary into `d`.
 */
export async function resolveOpenBefore(content: GameContent, cityId: string, day: number, now: number): Promise<number> {
  const due = await CampaignEvent.find({ cityId, status: 'open', day: { $lt: day } }, { _id: 1 }).lean();
  let n = 0;
  for (const e of due) if (await resolveEvent(content, e._id, now)) n += 1;
  return n;
}

// ---------------------------------------------------------------------------------------------
// The read path (tech §3.4 steps 4 and 6) and the credit.
// ---------------------------------------------------------------------------------------------

const dueOpen = (c: CharacterDoc, now: number) =>
  (c.events?.open ?? []).filter((p) => new Date(p.startsAt).getTime() <= now);
const dueCalls = (c: CharacterDoc, now: number) =>
  (c.events?.calls ?? []).filter((p) => new Date(p.startsAt).getTime() <= now);

/** The cities whose day must be settled before a due sign-up resolves (step 1). */
export const dueCities = (c: CharacterDoc, now: number): string[] => [...new Set(dueOpen(c, now).map((p) => p.cityId))];

/** Step 4: each due sign-up's (and withdrawn call's) event that is still open is resolved. */
export async function ensureEventsResolved(content: GameContent, c: CharacterDoc, now: number): Promise<void> {
  const ids = [...dueOpen(c, now).map((p) => p.eventId), ...dueCalls(c, now).map((p) => p.eventId)];
  for (const id of ids) await resolveEvent(content, id, now);
}

/**
 * Step 6: each due, resolved sign-up is credited (oldest start first); a due call whose event was
 * called off pushes the called-off modal. A sign-up of an event still open (a runner lost) waits.
 */
export async function ensureEventsCredited(content: GameContent, c0: CharacterDoc, now: number): Promise<CharacterDoc> {
  let c = c0;
  const due = [...dueOpen(c, now)].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  for (const p of due) c = (await creditSignup(content, c, p.signupId, now)) ?? c;
  for (const call of dueCalls(c, now)) {
    const ev = await CampaignEvent.findById(call.eventId, { status: 1 }).lean();
    if (!ev || ev.status === 'open') continue;
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, 'events.calls.eventId': call.eventId },
      {
        $pull: { 'events.calls': { eventId: call.eventId } },
        ...(ev.status === 'calledOff'
          ? { $push: { 'events.unseen': { $each: [{ kind: 'calledOff', eventId: call.eventId, signupId: null }], $slice: -10 } } }
          : {}),
        $inc: { version: 1 },
      },
      { returnDocument: 'after', lean: true },
    );
    if (updated) c = updated;
  }
  return c;
}

/** One sign-up's credit (ADR 0037), in the character's version-guarded transaction. */
export async function creditSignup(
  content: GameContent,
  c0: CharacterDoc,
  signupId: Types.ObjectId,
  now: number,
): Promise<CharacterDoc | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await inTransaction(async (session) => {
        const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
        if (!c) return null;
        const s = await EventSignup.findById(signupId).session(session).lean<EventSignupDoc>();
        if (!s) {
          // A stale pointer: drop it.
          return Character.findOneAndUpdate(
            { _id: c._id, version: c.version },
            { $pull: { 'events.open': { signupId } }, $inc: { version: 1 } },
            { session, returnDocument: 'after', lean: true },
          );
        }
        if (s.status === 'committed' || s.creditedAt) {
          if (s.creditedAt && c.events?.open?.some((p) => p.signupId.equals(signupId))) {
            return Character.findOneAndUpdate(
              { _id: c._id, version: c.version },
              { $pull: { 'events.open': { signupId } }, $inc: { version: 1 } },
              { session, returnDocument: 'after', lean: true },
            );
          }
          return null;
        }
        if (s.status === 'withdrawn' || !s.result) {
          return Character.findOneAndUpdate(
            { _id: c._id, version: c.version },
            { $pull: { 'events.open': { signupId } }, $inc: { version: 1 } },
            { session, returnDocument: 'after', lean: true },
          );
        }
        const ev = await CampaignEvent.findById(s.eventId).session(session).lean<CampaignEventDoc>();
        if (!ev) return null;
        const today = dayKey(now);
        const residenceCity = await CityModel.findById(residenceCityId(c)).session(session).lean<CityDoc>();
        const eventCity = ev.cityId === residenceCity?._id ? residenceCity : await CityModel.findById(ev.cityId).session(session).lean<CityDoc>();
        const rateOn = heatRateOn(content, residenceCity);
        const place = await readEventPlace(content, ev, ev.day, session);
        const credit = eventCredit({
          result: s.result,
          character: { ...progressOf(c), standingSuccesses: standingSuccesses(c, ev.cityId), heat: heatTimerOf(c) },
          startsAt: ev.startsAt.getTime(),
          now,
          rateOn,
          standingPerWin: standingPerSuccess(place.modifiers),
        });
        void eventCity;
        const others = c.localStanding.filter((x) => x.cityId !== ev.cityId);
        const tally = addToTally(c.today, today, {
          xp: s.result.rewards.xp.total,
          fxp: s.result.rewards.fxp.total,
          pc: s.result.pc.amount,
          opinion: s.result.rewards.opinion,
        });
        const updated = await Character.findOneAndUpdate(
          { _id: c._id, version: c.version, 'events.open.signupId': signupId },
          {
            $set: {
              ...progressSet(credit.gains),
              ...(credit.standing
                ? { localStanding: [...others, { cityId: ev.cityId, successes: credit.standing.after }] }
                : {}),
              ...(credit.heat ? { heat: heatDoc(credit.heat.timer) } : {}),
              ...(c.day.settled === today ? { today: tally } : {}),
            },
            $pull: { 'events.open': { signupId } },
            $push: { 'events.unseen': { $each: [{ kind: 'result', eventId: ev._id, signupId }], $slice: -10 } },
            $inc: { version: 1 },
          },
          { session, returnDocument: 'after', lean: true },
        );
        if (!updated) throw new VersionConflict();
        const receipt: EventResult = await buildReceipt(content, {
          ev,
          signup: s,
          before: c,
          after: updated,
          credit,
          place,
          now,
          residenceCity,
          session,
        });
        const marked = await EventSignup.updateOne(
          { _id: s._id, creditedAt: null },
          { $set: { receipt, creditedAt: new Date(now) } },
          { session },
        );
        if (marked.modifiedCount !== 1) throw new VersionConflict();
        return updated;
      });
    } catch (err) {
      if (err instanceof VersionConflict) {
        const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
        if (fresh) c0 = fresh;
        continue;
      }
      throw err;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// The modal gate (tech §12.1): events.current → ResultModal → events.seen.
// ---------------------------------------------------------------------------------------------

function calledOffResult(content: GameContent, c: CharacterDoc, ev: CampaignEventDoc, view: EventPageView, now: number): PoliticalResult {
  const type = typeOf(content, ev.typeId);
  const v = venueOfEvent(content, ev);
  const home = content.city(residenceCityId(c));
  const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
  const vars = { event: type.runningName, venue: v.location.name };
  return {
    kind: 'political',
    act: 'calledOff',
    stamp: { label: t6('modal.calledOff.stamp'), tone: 'partial' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: ev.cityId, cityName: content.city(ev.cityId)?.name ?? ev.cityId },
    headline: t6('modal.calledOff.headline', vars),
    body: t6('modal.calledOff.body', vars),
    next: t6('modal.calledOff.next', vars),
    until: null,
    at: ev.startsAt.getTime(),
    knockOns: { pc: null, morale: null, backers: null },
    performedAt: new Date(now).toISOString(),
    idempotencyKey: '',
    character: toCharacterView(c, now, content, null),
    view: { kind: 'event', event: view },
  };
}

export async function currentEvent(
  deps: EventDeps,
): Promise<{ kind: 'result'; result: EventResult } | { kind: 'calledOff'; result: PoliticalResult } | null> {
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, deps.content, now);
  for (const u of c.events?.unseen ?? []) {
    if (u.kind === 'result' && u.signupId) {
      const s = await EventSignup.findById(u.signupId, { receipt: 1 }).lean<EventSignupDoc>();
      if (s?.receipt) return { kind: 'result', result: { ...s.receipt, character: toCharacterView(c, now, deps.content, null) } };
    } else if (u.kind === 'calledOff') {
      const ev = await CampaignEvent.findById(u.eventId).lean<CampaignEventDoc>();
      if (ev) {
        const view = await pageView(deps.content, ev, c, now, {});
        return { kind: 'calledOff', result: calledOffResult(deps.content, c, ev, view, now) };
      }
    }
  }
  return null;
}

export async function eventResult(deps: EventDeps & { input: { signupId: string } }): Promise<EventResult> {
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, deps.content, now);
  const s = await EventSignup.findOne({ _id: oid(deps.input.signupId), characterId: c._id }).lean<EventSignupDoc>();
  if (!s?.receipt) throw gameError('NOT_FOUND', 'EVENT_NOT_FOUND');
  return { ...s.receipt, character: toCharacterView(c, now, deps.content, null) };
}

export async function seenEvent(
  deps: EventDeps & { input: { eventId: string; signupId: string | null } },
): Promise<{ character: CharacterView }> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  const updated = await Character.findOneAndUpdate(
    { _id: loaded.doc._id },
    { $pull: { 'events.unseen': { eventId: oid(deps.input.eventId) } } },
    { returnDocument: 'after', lean: true },
  );
  return { character: toCharacterView(updated ?? loaded.doc, now, deps.content, loaded.editionReadAt, { city: loaded.city }) };
}

/** For the views: a loaded character's character view (shared). */
export type { LoadedCharacter };
