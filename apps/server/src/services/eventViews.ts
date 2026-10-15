import type { GameContent } from '@irongate/content';
import { CampaignEvent, EventSignup } from '@irongate/db';
import type { CampaignEventDoc, CharacterDoc, CityDoc, EventSignupDoc } from '@irongate/db';
import {
  ENERGY,
  EVENTS,
  callGate,
  canWithdraw,
  dayKey,
  eventDifficulty,
  opinionUpTo,
  placeOf,
  projectEnergy,
  roleCheck,
  signUpGate,
  startsAtFor,
  swingFactors,
  withdrawUntil,
} from '@irongate/rules';
import type {
  CallSheetView,
  EventBoardView,
  EventCallGateView,
  EventCardView,
  EventCaller,
  EventCredit,
  EventPageView,
  EventResult,
  EventRoleGateReason,
  EventRoleView,
  EventState,
  EventTicketView,
  FactionId,
  PlaceTagView,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { ensureFixtures, placeIdOf, readEventPlace, typeOf, venueOfEvent } from './eventPlace';
import type { EventPlaceRead } from './eventPlace';
import { resolveEvent } from './eventService';
import { restedCapToday } from './modifiers';
import { isRivalGround } from './risk';
import { t6 } from './togetherCopy';
import { assetView, energyState, namedStanding, preferredStat, rankTitle, standingSuccesses, toCharacterView, wornStats } from './views';

/**
 * Slice 6 (tech design §8.3, §10.1): the views of Campaign Events. Every read filters on the
 * viewer's faction; the seed never leaves the server; odds are a chance the client words.
 */

export function eventState(ev: Pick<CampaignEventDoc, 'status' | 'startsAt'>, now: number): EventState {
  if (ev.status === 'resolved') return 'resolved';
  if (ev.status === 'calledOff') return 'calledOff';
  return ev.startsAt.getTime() <= now ? 'settling' : 'open';
}

export function callerOf(content: GameContent, ev: Pick<CampaignEventDoc, 'calledBy' | 'factionId'>): EventCaller {
  return ev.calledBy.kind === 'member'
    ? { kind: 'member', name: ev.calledBy.name }
    : { kind: 'secretary', name: content.faction(ev.factionId).secretary.addressedAs };
}

function placeView(content: GameContent, ev: CampaignEventDoc): EventPageView['place'] {
  const v = venueOfEvent(content, ev);
  return {
    cityId: ev.cityId,
    cityName: content.city(ev.cityId)?.name ?? ev.cityId,
    districtId: ev.districtId,
    districtName: ev.districtId ? (content.district(ev.districtId)?.quarter.name ?? ev.districtId) : null,
    venueId: v.location.id,
    venueName: v.location.name,
  };
}

function tagsOf(place: Pick<EventPlaceRead, 'tagged' | 'modifiers'>): PlaceTagView[] {
  const tags: PlaceTagView[] = place.tagged.map((t) => ({ kind: 'issue', issueId: t.issueId, name: t.name, pct: 50 }));
  if (placeOf(place.modifiers)?.battleground) tags.push({ kind: 'closeRace', fxpPct: 25 });
  return tags;
}

const filledOf = (ev: Pick<CampaignEventDoc, 'roles'>): number => ev.roles.filter((r) => r.holder !== null).length;

function youOf(content: GameContent, ev: CampaignEventDoc, me: CharacterDoc): { roleName: string } | null {
  const type = typeOf(content, ev.typeId);
  const r = ev.roles.find((x) => x.holder?.characterId.equals(me._id));
  if (r) return { roleName: type.roles.find((x) => x.id === r.roleId)?.name ?? r.roleId };
  if (ev.hands.some((h) => h.characterId.equals(me._id))) return { roleName: t6('modal.hand') };
  return null;
}

/** A board card (tech §8.3). */
export function cardView(
  content: GameContent,
  ev: CampaignEventDoc,
  me: CharacterDoc,
  now: number,
  tags: PlaceTagView[] = [],
): EventCardView {
  const type = typeOf(content, ev.typeId);
  const state = eventState(ev, now);
  const you = youOf(content, ev, me);
  const full = ev.roles.every((r) => r.holder !== null) && ev.hands.length >= EVENTS.hands.max;
  const here = me.cityId === ev.cityId;
  const action: EventCardView['action'] =
    state !== 'open'
      ? 'settling'
      : you
        ? 'yours'
        : !here
          ? 'elsewhere'
          : full
            ? 'full'
            : me.rank >= EVENTS.namedRoleRank && ev.roles.some((r) => r.holder === null)
              ? 'join'
              : ev.hands.length < EVENTS.hands.max
                ? 'joinHand'
                : 'full';
  return {
    id: ev._id.toHexString(),
    kind: ev.kind,
    typeId: ev.typeId,
    name: type.name,
    art: assetView(content, type.art),
    place: placeView(content, ev),
    startsAt: ev.startsAt.getTime(),
    state,
    filled: filledOf(ev),
    roles: ev.roles.length,
    hands: { k: ev.hands.length, max: 4 },
    calledBy: callerOf(content, ev),
    tags,
    you,
    action,
  };
}

/** The event page (tech §8.3), for `viewer`. */
export async function pageView(
  content: GameContent,
  ev: CampaignEventDoc,
  viewer: CharacterDoc,
  now: number,
  ctx: { place?: EventPlaceRead; session?: ClientSession; residenceCity?: CityDoc | null },
): Promise<EventPageView> {
  const type = typeOf(content, ev.typeId);
  const place = ctx.place ?? (await readEventPlace(content, ev, ev.day, ctx.session ?? null));
  const city = content.city(ev.cityId)!;
  const state = eventState(ev, now);
  const factors = swingFactors(type.actionType, ev.factionId, place.modifiers, place.tagged);
  const mine = (viewer.events?.open ?? []).find((p) => p.eventId.equals(ev._id)) ?? null;
  const onIt = !!youOf(content, ev, viewer);
  const p = projectEnergy(
    energyState(viewer),
    now,
    ENERGY.max,
    restedCapToday(content, ctx.residenceCity ?? null, dayKey(now), viewer.room),
  );
  const values = wornStats(viewer, content);
  const successes = standingSuccesses(viewer, ev.cityId);
  const named = namedStanding(content, ev.cityId, successes);
  const gateFor = (slot: string, cost: number, slotFree: boolean) => {
    const g = signUpGate({
      slot,
      rank: viewer.rank,
      energy: p.value,
      cost,
      sameCity: viewer.cityId === ev.cityId && !(viewer.journey && viewer.journey.status === 'onTheWay'),
      held: !!viewer.held && viewer.held.state === 'in',
      inTransit: !!viewer.journey && viewer.journey.status === 'onTheWay',
      runInPending: viewer.runIn?.state === 'pending',
      onEvent: onIt,
      openSignups: viewer.events?.open?.length ?? 0,
      slotFree,
      started: state !== 'open',
    });
    if (!g && viewer.patrol?.card) return { reason: 'PATROL_PENDING' as const };
    if (!g || g.reason === 'ROLE_TAKEN' || g.reason === 'EVENT_STARTED' || g.reason === 'RUN_IN_PENDING') return null;
    return g.reason === 'HANDS_FULL'
      ? { reason: 'HANDS_FULL' as const }
      : { reason: g.reason as EventRoleGateReason, ...(g.need !== undefined ? { need: g.need } : {}) };
  };
  const results = ev.result?.roles ?? [];
  const roles: EventRoleView[] = type.roles.map((role, i) => {
    const h = ev.roles[i]?.holder ?? null;
    const open = h === null && state === 'open';
    const check = open
      ? roleCheck({
          role,
          values,
          difficulty: eventDifficulty(type, city.role),
          standingSuccesses: successes,
          standingLabel: `${named.name} in ${city.name}`,
          actionType: type.actionType,
          m: place.modifiers,
          prefer: preferredStat(content, viewer.factionId),
        })
      : null;
    const r = results.find((x) => x.roleId === role.id);
    const gate = open ? gateFor(role.id, role.energy, true) : null;
    return {
      roleId: role.id,
      name: role.name,
      stats: role.stats,
      energy: role.energy,
      hint: role.hint,
      holder: h
        ? {
            characterId: h.characterId.toHexString(),
            name: h.name,
            avatarId: h.avatarId,
            rankTitle: rankTitle(content, ev, h.rank),
            you: h.characterId.equals(viewer._id),
          }
        : null,
      forYou: check ? { chance: check.chance, stats: check.stats } : null,
      gate: gate && gate.reason !== 'HANDS_FULL' ? gate : null,
      result: r ? { outcome: r.outcome } : null,
    };
  });
  const handGate = state === 'open' ? gateFor('hand', EVENTS.hands.energy, ev.hands.length < EVENTS.hands.max) : null;
  const yours =
    ev.status === 'resolved'
      ? await EventSignup.findOne({ eventId: ev._id, characterId: viewer._id, status: 'resolved' }, { _id: 1 })
          .session(ctx.session ?? null)
          .lean()
      : null;
  const anyFree = ev.roles.some((r) => r.holder === null) || ev.hands.length < EVENTS.hands.max;
  const r = ev.result;
  return {
    id: ev._id.toHexString(),
    kind: ev.kind,
    typeId: ev.typeId,
    name: type.name,
    blurb: type.blurb,
    art: { rung: 'scene', asset: assetView(content, type.art) },
    ground: { homeFactionId: place.homeFactionId, shares: place.shares },
    place: placeView(content, ev),
    startsAt: ev.startsAt.getTime(),
    withdrawUntil: withdrawUntil(ev.startsAt.getTime()),
    serverNow: now,
    state,
    calledBy: callerOf(content, ev),
    pays: { opinionUpTo: opinionUpTo(type.baseSwing, factors), againstFactionId: ev.targetFactionId, pc: [3, 15] },
    tags: tagsOf(place),
    firedUp: city.role === 'home' && place.modifiers.firedUp,
    roles,
    hands: {
      holders: ev.hands.map((h) => ({
        characterId: h.characterId.toHexString(),
        name: h.name,
        avatarId: h.avatarId,
        you: h.characterId.equals(viewer._id),
      })),
      max: 4,
      energy: 5,
      gate: handGate,
    },
    mine: mine
      ? {
          signupId: mine.signupId.toHexString(),
          slot: mine.slot,
          roleName: youOf(content, ev, viewer)?.roleName ?? mine.slot,
          energy: mine.energy,
          canWithdraw: canWithdraw(ev.startsAt.getTime(), now),
          committedFrom: withdrawUntil(ev.startsAt.getTime()),
        }
      : null,
    result:
      r && ev.status === 'resolved'
        ? {
            band: r.band,
            swing: r.opinion.mode === 'against' ? (r.opinion.toActor ?? 0) : r.opinion.applied,
            members: r.participants.length,
            volunteers: r.roles.filter((x) => x.outcome === 'volunteer').length,
          }
        : null,
    yourResult: yours ? { signupId: yours._id.toHexString() } : null,
    nudge: onIt && state === 'open' && anyFree,
  };
}

/** The call gate as the board shows it (tech §8.3). */
async function callGateView(content: GameContent, c: CharacterDoc, districtId: string | null, now: number): Promise<EventCallGateView> {
  const rank3Title = rankTitle(content, c, EVENTS.callRank);
  const no = (reason: Exclude<EventCallGateView, { ok: true }>['reason'], open?: { eventId: string; name: string; startsAt: number }) =>
    ({ ok: false as const, reason, rank3Title, ...(open ? { open } : {}) });
  const cityId = c.cityId;
  const city = content.city(cityId);
  const districted = content.isDistricted(cityId);
  const g = callGate({
    rank: c.rank,
    inOpenCity: !!city?.council && (districted || city.homeFactionId === c.factionId),
    held: !!c.held && c.held.state === 'in',
    inTransit: !!c.journey && c.journey.status === 'onTheWay',
    runInPending: c.runIn?.state === 'pending',
    rivalGround: isRivalGround(content, c, cityId),
    factionId: c.factionId,
    districtOk: true,
    openSignups: c.events?.open?.length ?? 0,
  });
  if (g) {
    if (g.reason === 'RANK' || g.reason === 'HELD' || g.reason === 'IN_TRANSIT' || g.reason === 'RIVAL_GROUND' || g.reason === 'RUN_IN_PENDING')
      return no(g.reason);
    if (g.reason === 'TOO_MANY_SIGNUPS') return no('HANDS_FULL');
    return no('WHERE');
  }
  if (c.patrol?.card) return no('PATROL_PENDING');
  const placeId = placeIdOf(cityId, districted ? districtId : null);
  const open = await CampaignEvent.findOne({ factionId: c.factionId, placeId, kind: 'member', status: 'open' }).lean<CampaignEventDoc>();
  if (open) {
    return no('ONE_AT_A_TIME', { eventId: open._id.toHexString(), name: typeOf(content, open.typeId).runningName, startsAt: open.startsAt.getTime() });
  }
  const starts = await CampaignEvent.countDocuments({ factionId: c.factionId, placeId, day: dayKey(now), kind: 'member' });
  if (starts >= EVENTS.perPlaceDay.memberStarts) return no('HANDS_FULL');
  return { ok: true };
}

/** Resolve every due open event of the faction in a city (the lazy path on a board read). */
async function resolveDueIn(content: GameContent, factionId: FactionId, cityIds: string[], now: number): Promise<void> {
  const due = await CampaignEvent.find(
    { factionId, cityId: { $in: cityIds }, status: 'open', startsAt: { $lte: new Date(now) } },
    { _id: 1 },
  ).lean();
  for (const e of due) await resolveEvent(content, e._id, now);
}

/** `events.board` (tech §8.3). */
export async function eventBoard(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<EventBoardView> {
  const { content } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const today = dayKey(now);
  const cities = content.chatCities(c.factionId);
  for (const id of cities) await ensureFixtures(content, id, today);
  await resolveDueIn(content, c.factionId, cities, now);
  const open = await CampaignEvent.find({ factionId: c.factionId, status: 'open' }).sort({ startsAt: 1 }).lean<CampaignEventDoc[]>();
  const tagCache = new Map<string, PlaceTagView[]>();
  const tagsFor = async (ev: CampaignEventDoc) => {
    const k = ev._id.toHexString();
    if (!tagCache.has(k)) tagCache.set(k, tagsOf(await readEventPlace(content, ev, ev.day, null)));
    return tagCache.get(k)!;
  };
  const here: EventCardView[] = [];
  const elsewhere: EventCardView[] = [];
  for (const ev of open) {
    const card = cardView(content, ev, c, now, await tagsFor(ev));
    if (ev.cityId === c.cityId) here.push(card);
    else elsewhere.push(card);
  }
  const mine = open
    .filter((ev) => (c.events?.open ?? []).some((p) => p.eventId.equals(ev._id)))
    .map((ev) => ({
      ...cardView(content, ev, c, now),
      withdrawUntil: withdrawUntil(ev.startsAt.getTime()),
      canWithdraw: canWithdraw(ev.startsAt.getTime(), now),
    }));
  const resolved = await CampaignEvent.find({
    factionId: c.factionId,
    cityId: c.cityId,
    $or: [{ status: 'resolved' }, { status: 'calledOff', kind: 'member' }],
  })
    .sort({ startsAt: -1 })
    .limit(EVENTS.resultsKept)
    .lean<CampaignEventDoc[]>();
  const city = content.city(c.cityId);
  return {
    here: { cityId: c.cityId, cityName: city?.name ?? c.cityId, districtName: null, events: here },
    elsewhere,
    mine,
    results: resolved.map((ev) => ({
      id: ev._id.toHexString(),
      startsAt: ev.startsAt.getTime(),
      name: typeOf(content, ev.typeId).name,
      venueName: venueOfEvent(content, ev).location.name,
      band: ev.status === 'calledOff' || !ev.result ? 'calledOff' : ev.result.band,
      swing: ev.result ? (ev.result.opinion.mode === 'against' ? (ev.result.opinion.toActor ?? 0) : ev.result.opinion.applied) : 0,
      members: ev.result?.participants.length ?? 0,
    })),
    call: await callGateView(content, c, null, now),
  };
}

/** `events.get` (tech §8.1): another faction's event is EVENT_NOT_FOUND. A due event resolves first. */
export async function getEvent(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { eventId: string };
}): Promise<EventPageView> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  const id = new Types.ObjectId(deps.input.eventId);
  let ev = await CampaignEvent.findOne({ _id: id, factionId: loaded.doc.factionId }).lean<CampaignEventDoc>();
  if (!ev) throw gameError('NOT_FOUND', 'EVENT_NOT_FOUND');
  if (ev.status === 'open' && ev.startsAt.getTime() <= now) {
    await resolveEvent(deps.content, id, now);
    ev = (await CampaignEvent.findById(id).lean<CampaignEventDoc>()) ?? ev;
  }
  return pageView(deps.content, ev, loaded.doc, now, { residenceCity: loaded.city });
}

/** `events.callSheet` (tech §8.3): the faction's types at the venues of the place. */
export async function callSheet(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { districtId: string | null };
}): Promise<CallSheetView> {
  const { content } = deps;
  const now = deps.now();
  const { doc: c, city: residenceCity } = await loadCharacter(deps.user, content, now);
  const cityId = c.cityId;
  const districted = content.isDistricted(cityId);
  const districtId = districted ? deps.input.districtId : null;
  const options: CallSheetView['options'] = [];
  for (const type of content.eventTypesFor(c.factionId)) {
    let venue = content.venueOf(type.id, cityId, districtId);
    let here = !!venue;
    if (!venue && districted) {
      venue = content.eventVenues
        .filter((v) => v.eventId === type.id && v.cityId === cityId)
        .map((v) => content.venueOf(type.id, cityId, v.districtId))
        .find((v) => v !== undefined);
      here = false;
    }
    if (!venue) continue;
    const fake: CampaignEventDoc = {
      _id: new Types.ObjectId(),
      kind: 'member',
      typeId: type.id,
      factionId: c.factionId,
      cityId,
      districtId: venue.districtId,
      placeId: placeIdOf(cityId, venue.districtId),
      venueId: venue.location.id,
      day: dayKey(now),
      dayIndex: 1,
      calledBy: { kind: 'member', characterId: c._id, name: c.name },
      calledAt: new Date(now),
      startsAt: new Date(now + 3_600_000),
      targetFactionId: null,
      seed: '',
      roles: type.roles.map((r) => ({ roleId: r.id, holder: null })),
      hands: [],
      rev: 0,
      status: 'open',
      result: null,
      resolvedAt: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
    const page = await pageView(content, fake, c, now, { residenceCity });
    options.push({
      typeId: type.id,
      name: type.name,
      blurb: type.blurb,
      venueId: venue.location.id,
      venueName: venue.location.name,
      roles: page.roles,
      energyOfRoles: type.roles.reduce((s, r) => s + r.energy, 0),
      opinionUpTo: page.pays.opinionUpTo,
      here,
      goTo: here
        ? null
        : { districtName: venue.districtId ? (content.district(venue.districtId)?.quarter.name ?? '') : '', venueName: venue.location.name },
    });
  }
  return {
    where: {
      cityId,
      cityName: content.city(cityId)?.name ?? cityId,
      districtId,
      districtName: districtId ? (content.district(districtId)?.quarter.name ?? districtId) : null,
    },
    gate: await callGateView(content, c, districtId, now),
    options,
    times: ([1, 3, 6, 12] as const).map((hours) => ({ hours, startsAt: startsAtFor(now, hours) })),
  };
}

/** The venue's tickets on a place's sheet (tech §8.3 `LocationView.events`). */
export async function ticketsAt(content: GameContent, c: CharacterDoc, cityId: string, now: number): Promise<Map<string, EventTicketView[]>> {
  const out = new Map<string, EventTicketView[]>();
  const evs = await CampaignEvent.find({ factionId: c.factionId, cityId, status: 'open', startsAt: { $gt: new Date(now) } }).lean<CampaignEventDoc[]>();
  for (const ev of evs) {
    const list = out.get(ev.venueId) ?? [];
    list.push({
      eventId: ev._id.toHexString(),
      name: typeOf(content, ev.typeId).name,
      startsAt: ev.startsAt.getTime(),
      filled: filledOf(ev),
      roles: ev.roles.length,
      you: youOf(content, ev, c),
    });
    out.set(ev.venueId, list);
  }
  return out;
}

/** The residence city's fixture as a card (the HQ and the paper). */
export async function todaysFixture(content: GameContent, c: CharacterDoc, cityId: string, now: number): Promise<CampaignEventDoc | null> {
  const today = dayKey(now);
  await ensureFixtures(content, cityId, today);
  return CampaignEvent.findOne({ factionId: c.factionId, cityId, day: today, dayIndex: 0 }).lean<CampaignEventDoc>();
}

/** The event result modal (tech §10.1), built at credit and stored as the sign-up's receipt. */
export async function buildReceipt(
  content: GameContent,
  i: {
    ev: CampaignEventDoc;
    signup: EventSignupDoc;
    before: CharacterDoc;
    after: CharacterDoc;
    credit: EventCredit;
    place: EventPlaceRead;
    now: number;
    residenceCity: CityDoc | null;
    session: ClientSession;
  },
): Promise<EventResult> {
  const { ev, signup: s } = i;
  const type = typeOf(content, ev.typeId);
  const r = ev.result!;
  const res = s.result!;
  const band = r.band;
  const text = type.text[band];
  const mine = r.roles.find((x) => x.holder?.signupId === s._id.toHexString());
  const volunteers = r.roles.filter((x) => x.outcome === 'volunteer').length;
  const reason: EventResult['reason'] =
    band === 'fiasco' && volunteers > 0
      ? { kind: 'volunteers', k: volunteers }
      : mine && mine.outcome !== 'success' && mine.check
        ? { kind: 'stat', stat: mine.check.stats[0] }
        : null;
  const f = ev.factionId;
  const after = r.opinion.shares[f];
  const total = r.opinion.mode === 'against' ? (r.opinion.toActor ?? 0) : r.opinion.applied;
  const city = content.city(ev.cityId)!;
  const standing = i.credit.standing
    ? {
        cityName: city.name,
        before: i.credit.standing.before,
        after: i.credit.standing.after,
        level: namedStanding(content, ev.cityId, i.credit.standing.after).name,
      }
    : null;
  const g = i.credit.gains;
  const pcBefore = i.before.pc;
  return {
    kind: 'event',
    eventId: ev._id.toHexString(),
    signupId: s._id.toHexString(),
    typeId: ev.typeId,
    name: type.name,
    art: { rung: 'scene', asset: assetView(content, type.art) },
    ground: { homeFactionId: i.place.homeFactionId, shares: r.opinion.shares },
    stamp: band,
    place: {
      cityName: city.name,
      districtName: ev.districtId ? (content.district(ev.districtId)?.quarter.name ?? null) : null,
      venueName: venueOfEvent(content, ev).location.name,
    },
    startsAt: ev.startsAt.getTime(),
    headline: text.headline,
    body: text.body,
    roles: r.roles.map((x) => {
      const h = ev.roles.find((y) => y.roleId === x.roleId)?.holder ?? null;
      return {
        roleId: x.roleId,
        name: type.roles.find((y) => y.id === x.roleId)?.name ?? x.roleId,
        holder: h ? { name: h.name, you: h.characterId.equals(s.characterId) } : null,
        outcome: x.outcome,
        ...(x.check ? { chance: x.check.chance } : {}),
        ...(x.roll !== null ? { roll: x.roll } : {}),
      };
    }),
    reason,
    hands: ev.hands.map((h) => h.name),
    summary: {
      cameOff: r.roles.filter((x) => x.outcome === 'success').length,
      roles: r.roles.length,
      volunteers,
    },
    rewards: { xp: res.rewards.xp, fxp: res.rewards.fxp },
    pc: res.pc,
    opinion: {
      factionId: f,
      placeName: i.place.placeName,
      total,
      share: res.share.actor / 1_000,
      before: Math.round((after - total) * 1_000) / 1_000,
      after,
      mode: r.opinion.mode,
      ...(r.opinion.targetFactionId ? { targetFactionId: r.opinion.targetFactionId } : {}),
    },
    issues: res.points
      .filter((p) => p.points > 0)
      .map((p) => {
        const t = i.place.tagged.find((x) => x.docId === p.docId);
        return { issueId: t?.issueId ?? p.docId, name: t?.name ?? '', added: p.points };
      }),
    effects: {
      standing,
      standingUp: i.credit.standingUp,
      heat: i.credit.heat
        ? {
            before: i.credit.heat.before,
            after: i.credit.heat.after,
            stateBefore: i.credit.heat.stateBefore,
            stateAfter: i.credit.heat.stateAfter,
          }
        : null,
      levelUp: g.levelUp,
      rankUp: g.rankUp ? { ...g.rankUp, title: rankTitle(content, i.after, g.rankUp.to) } : null,
      pc: g.next.pc !== pcBefore ? { before: pcBefore, after: g.next.pc } : null,
    },
    next: t6('event.next'),
    character: toCharacterView(i.after, i.now, content, null, { city: i.residenceCity }),
  };
}

/** The sign-ups still committed on the character, as the held screen's and the desk's lines. */
export async function signupLines(
  content: GameContent,
  c: CharacterDoc,
): Promise<Array<{ eventId: string; signupId: string; name: string; eventName: string; event: string; venueName: string; cityId: string; startsAt: number; roleName: string; energy: number; withdrawUntil: number }>> {
  const open = c.events?.open ?? [];
  if (open.length === 0) return [];
  const evs = await CampaignEvent.find({ _id: { $in: open.map((p) => p.eventId) } }).lean<CampaignEventDoc[]>();
  return open.flatMap((p) => {
    const ev = evs.find((e) => e._id.equals(p.eventId));
    if (!ev) return [];
    const type = typeOf(content, ev.typeId);
    const roleName = p.slot === 'hand' ? t6('modal.hand') : (type.roles.find((r) => r.id === p.slot)?.name ?? p.slot);
    return [
      {
        eventId: ev._id.toHexString(),
        signupId: p.signupId.toHexString(),
        name: type.name,
        eventName: type.name,
        event: type.runningName,
        venueName: venueOfEvent(content, ev).location.name,
        cityId: ev.cityId,
        startsAt: ev.startsAt.getTime(),
        roleName,
        energy: p.energy,
        withdrawUntil: withdrawUntil(ev.startsAt.getTime()),
      },
    ];
  });
}

export type { EventSignupDoc };
