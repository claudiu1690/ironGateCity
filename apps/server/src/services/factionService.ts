import type { GameContent } from '@irongate/content';
import { Award, CampaignEvent, Character, ChatMessage, Contribution, Stay, contributionId } from '@irongate/db';
import type { CampaignEventDoc, CharacterDoc, StayDoc } from '@irongate/db';
import {
  ENERGY,
  EVENTS,
  FAVOURS,
  PRESENCE,
  dayKey,
  levelBracket,
  memberStatus,
  presenceBand,
  projectEnergy,
  scopeFor,
} from '@irongate/rules';
import type {
  AssetView,
  FactionHqView,
  FactionScoreboardView,
  MemberRowView,
  OrdersView,
  ProfileView,
} from '@irongate/rules';
import { Types } from 'mongoose';
import { gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { cardView, todaysFixture } from './eventViews';
import { typeOf } from './eventPlace';
import { residenceOf, residenceCityId } from './residence';
import { legMinutesBetween } from './travelService';
import { assetView, energyState, namedStanding, rankTitle, standingSuccesses, toCharacterView } from './views';

/**
 * Slice 6 (tech design §8.2–§8.3; ADR 0040, 0042): the Faction tab's reads. Members are the
 * faction's characters by presence (`{ factionId, presence.seenAt }`); the scoreboard reads the
 * faction-scoped totals by index per bracket (the ledger is never folded on a read).
 */

interface Deps {
  user: SessionUser;
  content: GameContent;
  now: () => number;
}

/**
 * Review 7 #1 (direction A, *The Branch Office*): the header's plate is the faction's HQ scene and its
 * caps line names the member's branch. Server-side only, so `FactionHqView` in `packages/rules` is
 * unchanged; tRPC carries the extra fields to the client.
 */
export type FactionHqPageView = FactionHqView & {
  /** The branch: the member's residence city. */
  branch: { cityId: string; name: string };
  /** The faction's HQ scene (`scene.union-hq` / `scene.vanguard-office` / `scene.alliance-hq`). */
  plate: AssetView | null;
};

/** The Faction tab's header and Orders (tech §8.3 `FactionHqView`). */
export async function factionHq(deps: Deps): Promise<FactionHqPageView> {
  const { content } = deps;
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, content, now);
  const c = loaded.doc;
  const view = toCharacterView(c, now, content, loaded.editionReadAt, { city: loaded.city });
  const fixture = await todaysFixture(content, c, residenceCityId(c), now);
  const templates = content.ordersOf(c.factionId);
  const orders: OrdersView = {
    ...view.orders,
    items: view.orders.items.map((o) => {
      const t = templates.find((x) => x.id === o.id);
      if (!t || !(t.match.kinds ?? []).includes('event')) return o;
      return { ...o, link: fixture ? { kind: 'event' as const, eventId: fixture._id.toHexString() } : { kind: 'board' as const } };
    }),
  };
  const [members, hereNow] = await Promise.all([
    Character.countDocuments({ factionId: c.factionId }),
    Character.countDocuments({ factionId: c.factionId, 'presence.seenAt': { $gte: new Date(now - PRESENCE.hereNowMs) } }),
  ]);
  const branchId = residenceCityId(c);
  const scene = content.art.scenes.find(
    (s) => s.locationKind === 'faction-hq' && s.locationId === undefined && s.factionId === c.factionId,
  );
  return {
    faction: { id: c.factionId, name: content.faction(c.factionId).name },
    branch: { cityId: branchId, name: content.city(branchId)?.name ?? branchId },
    plate: scene ? assetView(content, scene.assetId) : null,
    rankTitle: rankTitle(content, c, c.rank),
    members,
    hereNow,
    orders,
    fixture: fixture ? cardView(content, fixture, c, now) : null,
  };
}

/**
 * The viewer's open events, soonest first, and whom they have invited to each (review 7 #3, design
 * §23.2: the invite picks the soonest event with a place for the mate).
 */
async function askContext(c: CharacterDoc, now: number) {
  const open = (c.events?.open ?? []).filter((p) => new Date(p.startsAt).getTime() > now);
  if (open.length === 0) return null;
  const evs = await CampaignEvent.find({ _id: { $in: open.map((p) => p.eventId) }, status: 'open', startsAt: { $gt: new Date(now) } })
    .sort({ startsAt: 1 })
    .lean<CampaignEventDoc[]>();
  if (evs.length === 0) return null;
  const me = c._id.toHexString();
  const keys = await ChatMessage.find(
    { dedupeKey: { $in: evs.map((ev) => new RegExp(`^nudge:${ev._id.toHexString()}:${me}:`)) } },
    { dedupeKey: 1 },
  ).lean();
  // `nudge:{event}:{from}:{to}`: the pairs already invited.
  const invited = new Set(keys.map((k) => { const p = (k.dedupeKey ?? '').split(':'); return `${p[1]}:${p[3]}`; }));
  return { evs, invited };
}

/**
 * The invite on a mate's row (design §23.2): the soonest of the viewer's open events that has a place
 * this mate can take (an open named role at their rank, or a hand's place) and that they are not on.
 * None for the viewer, or a mate in the cells or on the ward. `asked` when already invited to it: the
 * row then reads *Invited to the rally*, plain text, until the event starts.
 */
function inviteFor(
  content: GameContent,
  ctx: Awaited<ReturnType<typeof askContext>>,
  r: CharacterDoc,
  now: number,
): MemberRowView['ask'] {
  if (!ctx) return null;
  if (r.held && r.held.state === 'in' && new Date(r.held.until).getTime() > now) return null;
  for (const ev of ctx.evs) {
    const onIt = ev.roles.some((x) => x.holder?.characterId.equals(r._id)) || ev.hands.some((h) => h.characterId.equals(r._id));
    if (onIt) continue;
    const type = typeOf(content, ev.typeId);
    const idx = r.rank >= EVENTS.namedRoleRank ? ev.roles.findIndex((x) => x.holder === null) : -1;
    const roleName = idx >= 0 ? (type.roles[idx]?.name ?? '') : ev.hands.length < EVENTS.hands.max ? 'hand' : null;
    if (roleName === null) continue;
    const id = ev._id.toHexString();
    return {
      eventId: id,
      eventName: type.runningName,
      startsAt: ev.startsAt.getTime(),
      roleName,
      asked: ctx.invited.has(`${id}:${r._id.toHexString()}`),
    };
  }
  return null;
}

/** One Members row (tech §8.3). */
async function memberRows(
  content: GameContent,
  viewer: CharacterDoc,
  rows: CharacterDoc[],
  now: number,
): Promise<MemberRowView[]> {
  const today = dayKey(now);
  const ids = rows.map((r) => r._id);
  const weekScope = scopeFor(viewer.factionId, 'week', null, today);
  const [moved, stays, heroes, ask] = await Promise.all([
    Contribution.find({ _id: { $in: ids.map((id) => contributionId(weekScope, id)) } }, { characterId: 1, amount: 1 }).lean(),
    Stay.find({ _id: { $in: rows.flatMap((r) => (r.held?.state === 'in' ? [r.held.stayId] : [])) } }).lean<StayDoc[]>(),
    Award.find({ characterId: { $in: ids }, kind: 'hero', day: { $gte: today - 6 } }, { characterId: 1, title: 1 }).lean(),
    askContext(viewer, now),
  ]);
  const energy = projectEnergy(energyState(viewer), now, ENERGY.max).value;
  return rows.map((r) => {
    const you = r._id.equals(viewer._id);
    const res = residenceOf(r);
    const held = r.held;
    const placeName = held ? (content.servicesOf(held.cityId)?.[held.kind === 'cells' ? 'cells' : 'infirmary'].location.name ?? held.cityId) : '';
    const homeId = residenceCityId(r);
    const status = memberStatus({
      held: held
        ? {
            kind: held.kind,
            state: held.state,
            until: new Date(held.until).getTime(),
            rivalGround: held.rivalGround,
            placeName,
            homeCityId: homeId,
            homeCityName: content.city(homeId)?.name ?? homeId,
          }
        : null,
      journey:
        r.journey && r.journey.status === 'onTheWay'
          ? { toName: content.city(r.journey.to)?.name ?? r.journey.to, arrivesAt: new Date(r.journey.arrivesAt).getTime() }
          : null,
      cityId: r.cityId,
      cityName: content.city(r.cityId)?.name ?? r.cityId,
      homeCityOf: (id) => (content.city(id)?.homeFactionId ?? null) as ReturnType<Parameters<typeof memberStatus>[0]['homeCityOf']>,
      factionId: r.factionId,
      now,
      deportationMinutes: (from, to) => legMinutesBetween(content, from, to),
    });
    const stay = held && held.state === 'in' ? stays.find((s) => s._id.equals(held.stayId)) : undefined;
    const inNow = !!held && held.state === 'in' && new Date(held.until).getTime() > now && !!stay && !stay.releasedAt;
    const favour: MemberRowView['favour'] =
      you || !inNow
        ? null
        : held!.kind === 'cells'
          ? stay!.bailPostedBy
            ? null
            : { kind: 'bail', iron: held!.bail?.total ?? 0, affordable: viewer.iron >= (held!.bail?.total ?? 0) }
          : {
              kind: 'visit',
              energy: 3,
              affordable: energy >= FAVOURS.visit.energy,
              visited: (stay!.visits ?? []).some((v) => v.characterId.equals(viewer._id)),
            };
    const askRow = you ? null : inviteFor(content, ask, r, now);
    const seen = r.presence?.seenAt ? new Date(r.presence.seenAt).getTime() : null;
    return {
      characterId: r._id.toHexString(),
      name: r.name,
      avatarId: r.avatarId ?? null,
      rankTitle: rankTitle(content, r, r.rank),
      level: r.level,
      residence: {
        cityName: content.city(res.cityId)?.name ?? res.cityId,
        districtName: res.districtId ? (content.district(res.districtId)?.quarter.name ?? null) : null,
      },
      band: presenceBand(seen, now, r.cityId === viewer.cityId),
      status,
      heroes: heroes.filter((h) => h.characterId.equals(r._id)).map((h) => h.title?.label ?? 'Hero'),
      movedThisWeek: (moved.find((m) => m.characterId.equals(r._id))?.amount ?? 0) / 1_000,
      favour,
      ask: askRow,
      you,
    };
  });
}

/** `faction.members` (tech §8.1): presence first, a search by name words, a cursor. */
export async function factionMembers(
  deps: Deps & { input: { q?: string | undefined; cursor?: string | undefined; filter: 'all' | 'hereNow' } },
): Promise<{ rows: MemberRowView[]; next: string | null; total: number }> {
  const { content, input } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const PAGE = 20;
  const filter: Record<string, unknown> = { factionId: c.factionId };
  if (input.q) {
    const words = input.q.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
    if (words.length > 0)
      filter.$and = words.map((w) => ({ nameWords: { $regex: `^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` } }));
  }
  if (input.filter === 'hereNow') filter['presence.seenAt'] = { $gte: new Date(now - PRESENCE.hereNowMs) };
  const total = await Character.countDocuments(filter);
  const skip = input.cursor ? Math.max(0, Number.parseInt(input.cursor, 10) || 0) : 0;
  const page = await Character.find(filter)
    .sort({ 'presence.seenAt': -1, _id: 1 })
    .skip(skip)
    .limit(PAGE)
    .lean<CharacterDoc[]>();
  // *here now · {city}* first: those in the viewer's city seen in the last ten minutes.
  const rows = await memberRows(content, c, page, now);
  rows.sort((a, b) => Number(b.band === 'hereNow') - Number(a.band === 'hereNow'));
  return { rows, next: skip + page.length < total ? String(skip + page.length) : null, total };
}

/** `faction.profile` (tech §8.1): a faction mate's public fields only. */
export async function factionProfile(deps: Deps & { input: { characterId: string } }): Promise<ProfileView> {
  const { content } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const id = new Types.ObjectId(deps.input.characterId);
  const r = await Character.findOne({ _id: id, factionId: c.factionId }).lean<CharacterDoc>();
  if (!r) throw gameError('NOT_FOUND', 'NOT_FOUND' as never);
  const [row] = await memberRows(content, c, [r], now);
  const successes = standingSuccesses(r, c.cityId);
  return {
    ...row!,
    memberSince: (r.origin?.arrivedAt ?? r.createdAt).getTime(),
    standingHere: successes > 0 ? { level: namedStanding(content, c.cityId, successes).name } : null,
    muted: (c.mutes ?? []).some((m) => m.equals(r._id)),
  };
}

/** `faction.scoreboard` (ADR 0042): the top ten per bracket by the scoped totals; your row by a count. */
export async function factionScoreboard(
  deps: Deps & { input: { period: 'week' | 'all'; cityId: string | null } },
): Promise<FactionScoreboardView> {
  const { content, input } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const today = dayKey(now);
  const scope = scopeFor(c.factionId, input.period, input.cityId, today);
  const brackets: FactionScoreboardView['brackets'] = [];
  const heroCounts = async (ids: Types.ObjectId[]) => {
    const since = input.period === 'week' ? today - 6 : 0;
    const a = await Award.find({ characterId: { $in: ids }, kind: 'hero', day: { $gte: since } }, { characterId: 1 }).lean();
    return (id: Types.ObjectId) => a.filter((x) => x.characterId.equals(id)).length;
  };
  for (const bracket of [1, 2, 3] as const) {
    const rows = await Contribution.find({ scope, bracket, amount: { $gt: 0 } })
      .sort({ amount: -1, lastAt: 1 })
      .limit(10)
      .lean();
    const heroes = await heroCounts(rows.map((r) => r.characterId));
    brackets.push({
      bracket,
      rows: rows.map((r, i) => ({
        characterId: r.characterId.toHexString(),
        name: r.name,
        level: r.level,
        moved: r.amount / 1_000,
        events: r.events ?? 0,
        heroes: heroes(r.characterId),
        rosette: i < 3,
        you: r.characterId.equals(c._id),
      })),
    });
  }
  const mine = await Contribution.findById(contributionId(scope, c._id)).lean();
  let you: FactionScoreboardView['you'] = null;
  if (mine && mine.amount > 0) {
    const bracket = (mine.bracket ?? levelBracket(c.level)) as 1 | 2 | 3;
    const higher = await Contribution.countDocuments({
      scope,
      bracket,
      $or: [{ amount: { $gt: mine.amount } }, { amount: mine.amount, lastAt: { $lt: mine.lastAt } }],
    });
    you = { bracket, rank: higher + 1, moved: mine.amount / 1_000, events: mine.events ?? 0 };
  }
  return {
    period: input.period,
    cityId: input.cityId,
    cities: content.councilCities().map((x) => ({ id: x.id, name: x.name })),
    brackets,
    you,
  };
}
