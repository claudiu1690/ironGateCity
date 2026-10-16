import { copy } from '@irongate/content/copy';
import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  BAR,
  ENERGY,
  addToTally,
  afterMeal,
  afterRound,
  healHealth,
  healthMax,
  healthNow,
  mealGate,
  mealHealth,
  projectEnergy,
  roundGate,
  spendEnergy,
  wellFedAt,
} from '@irongate/rules';
import type { BarCardView, Buffs, BuffsView, DayKey, DiningCardView, MealTier, PoliticalResult } from '@irongate/rules';
import { GameError, gameError } from '../gameError';
import { assertHere, lifeAct, lifeResult, timeOf } from './lifeActs';
import type { LifeDeps } from './lifeActs';
import { homeCapOf, restedCapToday } from './modifiers';
import { buffsOf } from './personal';
import { healthDoc, healthTimerOf } from './risk';
import { VersionConflict } from './txn';
import { energyState, wornStats } from './views';

/**
 * Slice 8 phase B, lane 1 (T31; tech design §24, ADR 0088): the bar's card (a round, a plate) and
 * the dining room's dinner. Each is one keyed transaction on the character: 2 Energy through the
 * lazy writer, the Iron in the filter, Health through `healHealth` (never above max), the buffs as
 * value + time (lazy: a meal runs out at `until` with no write).
 */

const b = copy.life.bar;

const buffsDoc = (x: Buffs) => ({
  wellFed: x.wellFed ? { tier: x.wellFed.tier, until: new Date(x.wellFed.until) } : null,
  spirits: { left: x.spirits },
});

/** The Energy at `now` with today's Rested cap (the flat's and the perk's included). */
const energyNow = (content: GameContent, c: CharacterDoc, now: number, today: DayKey) =>
  projectEnergy(energyState(c), now, ENERGY.max, restedCapToday(content, null, today, c.room, c.factionId, homeCapOf(c)));

/** Tech design §24.6: the bar's card at a place with `bar`, or null. */
export function barCard(content: GameContent, c: CharacterDoc, locationId: string, now: number, today: DayKey): BarCardView | null {
  const l = content.location(locationId);
  if (!l || !l.location.bar) return null;
  const buffs = buffsOf(c);
  const rounds = c.today.day === today ? (c.today.rounds ?? 0) : 0;
  const energy = energyNow(content, c, now, today).value;
  const rg = roundGate({ rounds, spirits: buffs.spirits, energy, iron: c.iron });
  const meal = wellFedAt(buffs, now);
  const pg = mealGate({ tier: 'plate', current: meal, until: buffs.wellFed?.until ?? null, wornCha: 0, energy, iron: c.iron });
  const word = (r: string | undefined) =>
    r === 'ROUNDS_TODAY' ? 'today' : r === 'SPIRITS_FULL' ? 'full' : r === 'NOT_ENOUGH_IRON' ? 'needsIron' : 'needsEnergy';
  return {
    place: l.location.name,
    round: { state: rg ? (word(rg.reason) as BarCardView['round']['state']) : 'ok', left: Math.max(0, BAR.round.perDay - rounds) },
    plate: {
      state: pg ? (pg.reason === 'WELL_FED' ? 'fed' : pg.reason === 'NOT_ENOUGH_IRON' ? 'needsIron' : 'needsEnergy') : 'ok',
      until: meal ? (buffs.wellFed?.until ?? null) : null,
    },
  };
}

/** Tech design §24.6: the dining room's card at a place with `dining`, or null. */
export function diningCard(content: GameContent, c: CharacterDoc, locationId: string, now: number, today: DayKey): DiningCardView | null {
  const l = content.location(locationId);
  if (!l || !l.location.dining) return null;
  const buffs = buffsOf(c);
  const meal = wellFedAt(buffs, now);
  const g = mealGate({
    tier: 'dinner',
    current: meal,
    until: buffs.wellFed?.until ?? null,
    wornCha: wornStats(c, content, now).cha,
    energy: energyNow(content, c, now, today).value,
    iron: c.iron,
  });
  return {
    hotel: l.location.name,
    state: g
      ? g.reason === 'WELL_FED'
        ? 'fed'
        : g.reason === 'NOT_DRESSED'
          ? 'notDressed'
          : g.reason === 'NOT_ENOUGH_IRON'
            ? 'needsIron'
            : 'needsEnergy'
      : 'ok',
    until: meal ? (buffs.wellFed?.until ?? null) : null,
    cha: 10,
  };
}

/** Tech design §24.6: the Me tab's buff line, or null when nothing counts. */
export function buffsView(c: CharacterDoc, now: number): BuffsView | null {
  const buffs = buffsOf(c);
  const meal = wellFedAt(buffs, now);
  if (!meal && buffs.spirits <= 0) return null;
  return { wellFedUntil: meal ? buffs.wellFed!.until : null, tier: meal, spirits: buffs.spirits };
}

function locate(content: GameContent, locationId: string, need: 'bar' | 'dining') {
  const l = content.location(locationId);
  if (!l) throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId });
  if (need === 'bar' && !l.location.bar) throw new GameError('NO_BAR', { locationId }).toTRPC();
  if (need === 'dining' && !l.location.dining) throw new GameError('NO_DINING', { locationId }).toTRPC();
  return l;
}

const refuse = (reason: string, data: Record<string, unknown> = {}): never => {
  throw new GameError(reason as never, data);
};

/** `bar.round` (§24.1): 2 Energy · 30 Iron; three a day; nine missions in hand at most. */
export function round(deps: LifeDeps, input: { locationId: string; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  const l = locate(content, input.locationId, 'bar');
  return lifeAct(deps, 'bar.round', input.idempotencyKey, { locationId: input.locationId }, async ({ session, c, now, today }) => {
    assertHere(c, l.city.id);
    const buffs = buffsOf(c);
    const rounds = c.today.day === today ? (c.today.rounds ?? 0) : 0;
    const before = energyNow(content, c, now, today);
    const g = roundGate({ rounds, spirits: buffs.spirits, energy: before.value, iron: c.iron });
    if (g) refuse(g.reason, g.reason === 'NOT_ENOUGH_ENERGY' ? { cost: BAR.energy, energy: before.value } : {});
    const spent = spendEnergy(before, BAR.energy, { useRested: false });
    if (!spent.ok) refuse('NOT_ENOUGH_ENERGY', { cost: BAR.energy });
    const after = (spent as Extract<typeof spent, { ok: true }>).state;
    const next = afterRound(buffs);
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: BAR.round.iron } },
      {
        $set: {
          'energy.value': after.value,
          'energy.updatedAt': new Date(after.updatedAt),
          rested: after.rested,
          buffs: buffsDoc(next),
          today: { ...addToTally(c.today, today, { energy: BAR.energy }), rounds: rounds + 1 },
          lastActionAt: new Date(now),
        },
        $inc: { iron: -BAR.round.iron, version: 1 },
      },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const text = b.modals.round();
    return lifeResult({
      content,
      session,
      before: c,
      updated,
      now,
      idempotencyKey: input.idempotencyKey,
      act: 'round',
      stamp: b.stamps.round,
      headline: text.headline,
      body: text.body,
      knockOns: { energy: { before: before.value, after: after.value } },
      lines: [copy.life.knock.iron(BAR.round.iron), b.knock.energy, b.knock.spirits],
      view: { kind: 'place', locationId: l.location.id },
    });
  });
}

/** A plate (at a bar) or dinner (in a dining room): Well fed until `now + hours`, Health up to max. */
function eat(deps: LifeDeps, tier: MealTier, input: { locationId: string; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  const l = locate(content, input.locationId, tier === 'plate' ? 'bar' : 'dining');
  return lifeAct(deps, tier === 'plate' ? 'bar.meal' : 'bar.dinner', input.idempotencyKey, { locationId: input.locationId }, async ({ session, c, now, today }) => {
    assertHere(c, l.city.id);
    const buffs = buffsOf(c);
    const before = energyNow(content, c, now, today);
    const meal = wellFedAt(buffs, now);
    const g = mealGate({
      tier,
      current: meal,
      until: buffs.wellFed?.until ?? null,
      wornCha: wornStats(c, content, now).cha,
      energy: before.value,
      iron: c.iron,
    });
    if (g) refuse(g.reason, { ...(g.until !== undefined ? { until: g.until } : {}), ...(g.need !== undefined ? { need: g.need } : {}) });
    const spent = spendEnergy(before, BAR.energy, { useRested: false });
    if (!spent.ok) refuse('NOT_ENOUGH_ENERGY', { cost: BAR.energy });
    const after = (spent as Extract<typeof spent, { ok: true }>).state;
    const next = afterMeal(buffs, tier, now);
    const max = healthMax(c.level);
    const hBefore = healthNow(healthTimerOf(c), now, c.level);
    const healed = healHealth(healthTimerOf(c), now, mealHealth(tier));
    const hAfter = healthNow(healed, now, c.level);
    const price = BAR[tier].iron;
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: price } },
      {
        $set: {
          'energy.value': after.value,
          'energy.updatedAt': new Date(after.updatedAt),
          rested: after.rested,
          buffs: buffsDoc(next),
          health: healthDoc(healed),
          today: addToTally(c.today, today, { energy: BAR.energy }),
          lastActionAt: new Date(now),
        },
        $inc: { iron: -price, version: 1 },
      },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const until = next.wellFed!.until;
    const text = tier === 'plate' ? b.modals.meal() : b.modals.dinner(l.location.name);
    return lifeResult({
      content,
      session,
      before: c,
      updated,
      now,
      idempotencyKey: input.idempotencyKey,
      act: tier === 'plate' ? 'meal' : 'dinner',
      stamp: tier === 'plate' ? b.stamps.meal : b.stamps.dinner,
      headline: text.headline,
      body: text.body,
      until,
      knockOns: {
        energy: { before: before.value, after: after.value },
        health: { before: hBefore, after: hAfter, max },
      },
      lines: [
        copy.life.knock.iron(price),
        b.knock.energy,
        tier === 'plate' ? b.knock.wellFed(timeOf(until)) : b.knock.wellFedProperly(timeOf(until)),
        ...(hAfter > hBefore ? [b.knock.health(hAfter - hBefore)] : []),
      ],
      view: { kind: 'place', locationId: l.location.id },
    });
  });
}

export const meal = (deps: LifeDeps, input: { locationId: string; idempotencyKey: string }) => eat(deps, 'plate', input);
export const dinner = (deps: LifeDeps, input: { locationId: string; idempotencyKey: string }) => eat(deps, 'dinner', input);
