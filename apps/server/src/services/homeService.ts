import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Character, City } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  ENERGY,
  FLAT,
  buyFlatGate,
  dayKey,
  dayStart,
  flatCounts,
  flatState,
  newFlat,
  payRent,
  payRentGate,
  projectEnergy,
  rentPrice,
} from '@irongate/rules';
import type { DayKey, Flat, HomeView, PoliticalResult } from '@irongate/rules';
import type { ClientSession, Types } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { lifePolitical, weekdayName } from './lifeResult';
import { homeCapOf, restedCapToday } from './modifiers';
import { residenceCityId, residenceOf } from './residence';
import { withRequestKey } from './requestKey';
import { VersionConflict, inTransaction } from './txn';
import { energyState } from './views';

/**
 * Slice 8 phase B, lane 2 (T14; design §6; tech design §3.8, §8.2; ADR 0056): the flat. Rent is a
 * day key (`paidThroughDay`, inclusive): every bonus is a pure function of the day, so a lapse
 * writes nothing and the flat waits; it is never taken. Buying, and paying a lapsed flat, re-base
 * Energy at the tap (the Rested cap changes today, ADR 0030 §5).
 */

const flatOf = (c: Pick<CharacterDoc, 'home'>): Flat | null => c.home?.flat ?? null;

/** *You live in Eastside*: the residence in words when the flat is elsewhere. */
function livesIn(content: GameContent, c: CharacterDoc): string {
  const r = residenceOf(c);
  return r.districtId
    ? (content.district(r.districtId)?.quarter.name ?? r.districtId)
    : (content.city(r.cityId)?.name ?? r.cityId);
}

export function homeViewOf(content: GameContent, c: CharacterDoc, today: DayKey): HomeView {
  const flat = flatOf(c);
  const residence = residenceCityId(c);
  const counts = flatCounts(flat, residence, today);
  const cityName = (id: string) => content.city(id)?.name ?? id;
  const h = copy.life.home;
  const buyGate = buyFlatGate({ level: c.level, inResidenceCity: c.cityId === residence, flat, iron: c.iron });
  return {
    sleep: counts ? 'flat' : 'room',
    line: !flat
      ? h.room
      : counts
        ? h.flatLine(cityName(flat.cityId), weekdayName(flat.paidThroughDay))
        : flat.cityId !== residence
          ? h.elsewhere(cityName(flat.cityId), livesIn(content, c))
          : h.waits,
    flat: flat
      ? {
          cityId: flat.cityId,
          cityName: cityName(flat.cityId),
          paidThrough: flat.paidThroughDay,
          state: flatState(flat, today),
          counts,
          livesIn: flat.cityId !== residence ? livesIn(content, c) : null,
        }
      : null,
    buy: flat
      ? null
      : {
          ok: buyGate === null,
          why:
            buyGate === null
              ? null
              : buyGate.reason === 'FLAT_LEVEL'
                ? 'level'
                : buyGate.reason === 'NOT_IN_RESIDENCE_CITY'
                  ? 'notHere'
                  : 'iron',
          cost: FLAT.price,
          city: cityName(residence),
        },
    rent: {
      week: rentPrice(1),
      four: rentPrice(4),
      ok: {
        week: payRentGate({ flat, weeks: 1, today, iron: c.iron }) === null,
        four: payRentGate({ flat, weeks: 4, today, iron: c.iron }) === null,
      },
    },
  };
}

interface Deps<I> {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: I;
}

export async function getHome(deps: Omit<Deps<unknown>, 'input'>): Promise<HomeView> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  return homeViewOf(deps.content, loaded.doc, dayKey(now));
}

/** Energy stored at `now` under the cap before the change, so the new cap counts from here on. */
async function rebaseSet(content: GameContent, session: ClientSession, c: CharacterDoc, now: number) {
  const city = await City.findById(residenceCityId(c)).session(session).lean<CityDoc>();
  const cap = restedCapToday(content, city, dayKey(now), c.room, c.factionId, homeCapOf(c));
  const p = projectEnergy(energyState(c), now, ENERGY.max, cap);
  return { 'energy.value': p.value, 'energy.updatedAt': new Date(now), rested: p.rested };
}

const resettleOf = (content: GameContent, id: Types.ObjectId, now: () => number) => async () => {
  const fresh = await Character.findById(id).lean<CharacterDoc>();
  if (fresh) await ensureSettled(content, fresh, now());
};

/** `home.buyFlat` (design §6): Level 10, standing in the residence city, no flat, 2,500 Iron. */
export async function buyFlat(deps: Deps<{ idempotencyKey: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: 'home.buyFlat',
    input: {},
    resettle: resettleOf(content, loaded.doc._id, deps.now),
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new VersionConflict();
      const residence = residenceCityId(c);
      const gate = buyFlatGate({ level: c.level, inResidenceCity: c.cityId === residence, flat: flatOf(c), iron: c.iron });
      if (gate) throw new GameError(gate.reason, gate.need !== undefined ? { need: gate.need } : {});
      const flat = newFlat(residence, today);
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, iron: { $gte: FLAT.price }, $or: [{ 'home.flat': null }, { 'home.flat': { $exists: false } }] },
        {
          $set: {
            ...(await rebaseSet(content, session, c, now)),
            'home.flat': flat,
            // ADR 0051: Evening is a third outfit, saved as what is worn today.
            ...(c.outfits ? { 'outfits.evening': c.equipment } : {}),
          },
          $inc: { iron: -FLAT.price, version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const city = content.city(residence)?.name ?? residence;
      const until = weekdayName(flat.paidThroughDay);
      const m = copy.life.modals.flatBought(city, copy.life.modals.flatLine, until);
      return lifePolitical({
        content,
        session,
        updated,
        now,
        idempotencyKey: deps.input.idempotencyKey,
        act: 'flatBought',
        stamp: copy.life.stamps.flatBought,
        headline: m.headline,
        body: m.body,
        until: dayStart(flat.paidThroughDay + 1),
        knockOns: {
          iron: { before: c.iron, after: updated.iron },
          life: [copy.life.knock.rested, copy.life.knock.untilWeekday(until)],
        },
        view: { kind: 'home', home: homeViewOf(content, updated, today) },
      });
    },
  });
}

/** `home.payRent` (design §6): one or four weeks, from anywhere; a lapsed flat pays from today. */
export async function payRentFor(deps: Deps<{ weeks: 1 | 4; idempotencyKey: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: 'home.payRent',
    input: { weeks: deps.input.weeks },
    resettle: resettleOf(content, loaded.doc._id, deps.now),
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new VersionConflict();
      const flat = flatOf(c);
      const gate = payRentGate({ flat, weeks: deps.input.weeks, today, iron: c.iron });
      if (gate) throw new GameError(gate.reason, gate.need !== undefined ? { need: gate.need } : {});
      const paid = payRent(flat!, today, deps.input.weeks);
      const price = rentPrice(deps.input.weeks);
      // The cap changes today only when a lapsed flat starts counting again.
      const lapsed = !flatCounts(flat, residenceCityId(c), today);
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, iron: { $gte: price }, 'home.flat.paidThroughDay': flat!.paidThroughDay },
        {
          $set: { ...(lapsed ? await rebaseSet(content, session, c, now) : {}), 'home.flat.paidThroughDay': paid.paidThroughDay },
          $inc: { iron: -price, version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const until = weekdayName(paid.paidThroughDay);
      const m = copy.life.modals.rentPaid(until);
      return lifePolitical({
        content,
        session,
        updated,
        now,
        idempotencyKey: deps.input.idempotencyKey,
        act: 'rentPaid',
        stamp: copy.life.stamps.rentPaid,
        headline: m.headline,
        body: m.body,
        until: dayStart(paid.paidThroughDay + 1),
        knockOns: { iron: { before: c.iron, after: updated.iron } },
        view: { kind: 'home', home: homeViewOf(content, updated, today) },
      });
    },
  });
}

/** Tech design §8.6 (`POST /api/test/home`): move the rent's day key (a lapse, the due day). */
export async function testHome(
  characterId: Types.ObjectId,
  body: { paidThroughDay: 'yesterday' | 'today' | number; buy?: boolean },
  now: number,
): Promise<Flat | null> {
  const today = dayKey(now);
  return inTransaction(async (session) => {
    const c = await Character.findById(characterId).session(session).lean<CharacterDoc>();
    if (!c) throw new Error('character disappeared');
    const flat = flatOf(c) ?? (body.buy ? newFlat(residenceCityId(c), today) : null);
    if (!flat) return null;
    const paidThroughDay =
      body.paidThroughDay === 'yesterday' ? today - 1 : body.paidThroughDay === 'today' ? today : body.paidThroughDay;
    const next = { ...flat, paidThroughDay };
    await Character.updateOne({ _id: c._id }, { $set: { 'home.flat': next }, $inc: { version: 1 } }, { session });
    return next;
  });
}
