import type { GameContent } from '@irongate/content';
import { Character, City as CityModel, Stay } from '@irongate/db';
import type { CharacterDoc, CityDoc, StayDoc } from '@irongate/db';
import {
  ENERGY,
  FAVOURS,
  addToTally,
  applyGains,
  bailFavourGate,
  dayKey,
  healHealth,
  projectEnergy,
  spendEnergy,
  visitEffect,
  visitGate,
} from '@irongate/rules';
import type { MemberRowView, PoliticalResult } from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { progressOf, progressSet } from './actionService';
import { branchChannel, systemLine } from './chatOutbox';
import { ensureSettled, loadCharacter } from './dayService';
import { restedCapToday } from './modifiers';
import { withRequestKey } from './requestKey';
import { residenceCityId } from './residence';
import { healthDoc, healthTimerOf, isRivalGround, notFree } from './risk';
import { t6 } from './togetherCopy';
import { DayChanged, VersionConflict } from './txn';
import { energyState, rankTitle, toCharacterView } from './views';

/**
 * Slice 6 (ADR 0041; tech design §8.2): favours between faction mates. One transaction over the
 * payer or visitor, the stay and the mate. A mate's bail moves the stay's end to now; slice 5's
 * release path releases the prisoner on their next read (one release path; the modal names the
 * payer). A visit moves `held.until` and heals.
 */

interface Deps {
  user: SessionUser;
  content: GameContent;
  now: () => number;
}

const mateHeld = (m: CharacterDoc) =>
  m.held
    ? {
        kind: m.held.kind,
        state: m.held.state,
        until: new Date(m.held.until).getTime(),
        bail: m.held.bail ? { total: m.held.bail.total } : null,
      }
    : null;

/** The mate's row after a favour (the modal's `view`). */
function memberAfter(content: GameContent, m: CharacterDoc, now: number): MemberRowView {
  const res = m.residence ?? { cityId: residenceCityId(m), districtId: null };
  return {
    characterId: m._id.toHexString(),
    name: m.name,
    avatarId: m.avatarId ?? null,
    rankTitle: rankTitle(content, m, m.rank),
    level: m.level,
    residence: {
      cityName: content.city(res.cityId)?.name ?? res.cityId,
      districtName: res.districtId ? (content.district(res.districtId)?.quarter.name ?? null) : null,
    },
    band: 'today',
    status:
      m.held && m.held.state === 'in' && new Date(m.held.until).getTime() > now
        ? {
            kind: m.held.kind,
            placeName: content.servicesOf(m.held.cityId)?.[m.held.kind].location.name ?? m.held.cityId,
            minutes: Math.max(1, Math.ceil((new Date(m.held.until).getTime() - now) / 60_000)),
          }
        : null,
    heroes: [],
    movedThisWeek: 0,
    favour: null,
    ask: null,
    you: false,
  };
}

function favourResult(
  content: GameContent,
  i: {
    act: 'bailPosted' | 'visit';
    c: CharacterDoc;
    mate: CharacterDoc;
    headline: string;
    body: string;
    next?: string;
    knockOns: Partial<PoliticalResult['knockOns']>;
    now: number;
    idempotencyKey: string;
    residenceCity: CityDoc | null;
  },
): PoliticalResult {
  const home = content.city(residenceCityId(i.c));
  const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
  const place = content.city(i.mate.held?.cityId ?? i.mate.cityId);
  return {
    kind: 'political',
    act: i.act,
    stamp: { label: t6(i.act === 'bailPosted' ? 'modal.bailPosted.stamp' : 'modal.visit.stamp'), tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: place?.id ?? i.mate.cityId, cityName: place?.name ?? i.mate.cityId },
    headline: i.headline,
    body: i.body,
    ...(i.next ? { next: i.next } : {}),
    until: null,
    at: i.now,
    knockOns: { pc: null, morale: null, backers: null, ...i.knockOns },
    performedAt: new Date(i.now).toISOString(),
    idempotencyKey: i.idempotencyKey,
    character: toCharacterView(i.c, i.now, content, null, { city: i.residenceCity }),
    view: { kind: 'member', member: memberAfter(content, i.mate, i.now) },
  };
}

const refuse = (reason: string, data: Record<string, unknown> = {}) =>
  new GameError(reason as ConstructorParameters<typeof GameError>[0], data);

/** `favours.postBail` (ADR 0041): from anywhere; Iron, not an Energy act. */
export async function postBail(deps: Deps & { input: { characterId: string; idempotencyKey: string } }): Promise<PoliticalResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const mateId = new Types.ObjectId(input.characterId);
  return withRequestKey<PoliticalResult>({
    characterId: c0._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'favours.postBail',
    input: { characterId: input.characterId },
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      const m = await Character.findById(mateId).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (!m || m.factionId !== c.factionId) throw refuse('NOT_A_MATE');
      if (c.day.settled !== today) throw new DayChanged();
      const gate = bailFavourGate({
        payer: { factionId: c.factionId, iron: c.iron, id: c._id.toHexString() },
        mate: { factionId: m.factionId, id: m._id.toHexString(), held: mateHeld(m) },
        now,
      });
      if (gate) throw refuse(gate.reason, gate.need !== undefined ? { need: gate.need, iron: c.iron } : {});
      const total = m.held!.bail!.total;
      const stay = await Stay.findOneAndUpdate(
        { _id: m.held!.stayId, releasedAt: null, bailPostedBy: null },
        {
          $set: {
            bailPostedBy: { characterId: c._id, name: c.name, at: new Date(now), iron: total },
            until: new Date(now),
          },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!stay) throw refuse('ALREADY_OUT');
      const moved = await Character.updateOne(
        { _id: m._id, 'held.stayId': m.held!.stayId, 'held.state': 'in', 'held.until': { $gt: new Date(now) } },
        { $set: { 'held.until': new Date(now) }, $inc: { version: 1 } },
        { session },
      );
      if (moved.modifiedCount !== 1) throw new VersionConflict();
      const gains = applyGains(progressOf(c), { xp: 0, fxp: FAVOURS.bail.fxp, pc: 0 });
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: total } },
        {
          $set: { ...progressSet(gains), today: addToTally(c.today, today, { fxp: FAVOURS.bail.fxp, iron: -total }) },
          $inc: { iron: -total, version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const ch = branchChannel(content, m, m.held!.cityId);
      await systemLine(session, {
        channel: ch.channel,
        factionId: c.factionId,
        cityId: ch.cityId,
        kind: 'bailPosted',
        payload: { name: c.name, prisoner: m.name, characterId: m._id.toHexString(), iron: total },
        to: m._id,
        ref: stay._id.toHexString(),
        dedupeKey: `bail:${stay._id.toHexString()}`,
        at: new Date(now),
      });
      const residenceCity = await CityModel.findById(residenceCityId(updated)).session(session).lean<CityDoc>();
      const mateAfter = { ...m, held: { ...m.held!, until: new Date(now) } };
      return favourResult(content, {
        act: 'bailPosted',
        c: updated,
        mate: mateAfter,
        headline: t6('modal.bailPosted.headline', { name: m.name }),
        body: t6('modal.bailPosted.body', { name: m.name }),
        next: t6('modal.bailPosted.next'),
        knockOns: { iron: { before: c.iron, after: c.iron - total }, fxp: { added: FAVOURS.bail.fxp, order: 0 } },
        now,
        idempotencyKey: input.idempotencyKey,
        residenceCity,
      });
    },
  });
}

/** `favours.visit` (ADR 0041): 3 Energy, no Rested drawn; from anywhere but rival ground. */
export async function visitMate(deps: Deps & { input: { characterId: string; idempotencyKey: string } }): Promise<PoliticalResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const busy = notFree(c0);
  if (busy && busy.reason === 'PATROL_PENDING') throw busy.toTRPC();
  const mateId = new Types.ObjectId(input.characterId);
  return withRequestKey<PoliticalResult>({
    characterId: c0._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'favours.visit',
    input: { characterId: input.characterId },
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      const m = await Character.findById(mateId).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (!m || m.factionId !== c.factionId) throw refuse('NOT_A_MATE');
      if (c.day.settled !== today) throw new DayChanged();
      if (c.patrol?.card) throw refuse('PATROL_PENDING', { cityId: c.patrol.card.cityId });
      const residenceCity = await CityModel.findById(residenceCityId(c)).session(session).lean<CityDoc>();
      const cap = restedCapToday(content, residenceCity, today, c.room);
      const p = projectEnergy(energyState(c), now, ENERGY.max, cap);
      const stay = m.held ? await Stay.findById(m.held.stayId).session(session).lean<StayDoc>() : null;
      const gate = visitGate({
        visitor: {
          factionId: c.factionId,
          id: c._id.toHexString(),
          energy: p.value,
          held: !!c.held && c.held.state === 'in',
          inTransit: !!c.journey && c.journey.status === 'onTheWay',
          rivalGround: isRivalGround(content, c, c.cityId),
          runInPending: c.runIn?.state === 'pending',
        },
        mate: { factionId: m.factionId, id: m._id.toHexString(), held: mateHeld(m) },
        visits: (stay?.visits ?? []).map((v) => ({ characterId: v.characterId.toHexString() })),
        now,
      });
      if (gate) throw refuse(gate.reason, gate.need !== undefined ? { need: gate.need, energy: p.value, cost: FAVOURS.visit.energy } : {});
      if (!stay || stay.releasedAt) throw refuse('ALREADY_OUT');
      const counted = (stay.visits ?? []).filter((v) => v.counted).length;
      const eff = visitEffect({ since: new Date(m.held!.since).getTime(), until: new Date(m.held!.until).getTime(), now, counted });
      const pushed = await Stay.updateOne(
        { _id: stay._id, releasedAt: null, 'visits.characterId': { $ne: c._id } },
        {
          $push: { visits: { characterId: c._id, name: c.name, at: new Date(now), counted: eff.counted } },
          ...(eff.counted ? { $set: { until: new Date(eff.until) } } : {}),
        },
        { session },
      );
      if (pushed.modifiedCount !== 1) throw refuse('ALREADY_VISITED');
      if (eff.counted) {
        const healed = healHealth(healthTimerOf(m), now, eff.health);
        const moved = await Character.updateOne(
          { _id: m._id, version: m.version, 'held.stayId': stay._id, 'held.state': 'in' },
          { $set: { 'held.until': new Date(eff.until), health: healthDoc(healed) }, $inc: { version: 1 } },
          { session },
        );
        if (moved.modifiedCount !== 1) throw new VersionConflict();
      }
      const spent = spendEnergy({ value: p.value, rested: p.rested, updatedAt: p.updatedAt }, FAVOURS.visit.energy, { useRested: false });
      if (!spent.ok) throw refuse('NOT_ENOUGH_ENERGY', { energy: p.value, cost: FAVOURS.visit.energy });
      const gains = applyGains(progressOf(c), { xp: 0, fxp: FAVOURS.visit.fxp, pc: 0 });
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today },
        {
          $set: {
            ...progressSet(gains),
            'energy.value': spent.state.value,
            'energy.updatedAt': new Date(spent.state.updatedAt),
            rested: spent.state.rested,
            lastActionAt: new Date(now),
            today: addToTally(c.today, today, { energy: FAVOURS.visit.energy, fxp: FAVOURS.visit.fxp }),
          },
          $inc: { version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const mateAfter = eff.counted ? { ...m, held: { ...m.held!, until: new Date(eff.until) } } : m;
      return favourResult(content, {
        act: 'visit',
        c: updated,
        mate: mateAfter,
        headline: t6('modal.visit.headline', { name: m.name }),
        body: t6(eff.counted ? 'modal.visit.body' : 'modal.visit.bodyGrapes', { name: m.name }),
        next: t6('modal.visit.next'),
        knockOns: {
          energy: { before: p.value, after: spent.state.value },
          fxp: { added: FAVOURS.visit.fxp, order: 0 },
          mate: { name: m.name, health: eff.health, minutes: eff.minutesOff },
        },
        now,
        idempotencyKey: input.idempotencyKey,
        residenceCity,
      });
    },
  });
}

export { gameError };
