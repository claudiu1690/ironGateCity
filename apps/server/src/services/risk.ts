import type { GameContent } from '@irongate/content';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  HEAT,
  RECORD,
  coolRate,
  dayKey,
  healthFullAt,
  healthMax,
  healthNow,
  heatCoolPcts,
  heatEta,
  heatState,
  heatStepMs,
  liveMarks,
  projectHeat,
  recordLevel,
  recordView,
} from '@irongate/rules';
import type {
  CharacterViewV6,
  DayFlags,
  DayKey,
  HealthTimer,
  HeatTimer,
  Mark,
  RecordLevel,
} from '@irongate/rules';
import { GameError } from '../gameError';
import { dayModifiers, rivalGroundAt } from './modifiers';

export { rivalGroundAt };

/**
 * Slice 5 (tech design §3.2, ADR 0033): the lazy risk state read from the character. Every reader
 * goes through these helpers so a character migrated without a field reads as the defaults
 * (Heat 0, full Health, a clean record).
 */

/** Design §23.1 #8: Heat cools at the residence city's rate of each City Day. */
export function heatRateOn(
  content: GameContent,
  residenceCity: Pick<CityDoc, 'ordinance' | 'ordinanceHistory' | 'issues'> | null,
): (day: DayKey) => number {
  return (day) => coolRate(heatCoolPcts(dayModifiers(content, residenceCity, day)));
}

export const heatTimerOf = (c: Pick<CharacterDoc, 'heat'>): HeatTimer => ({
  value: c.heat?.value ?? 0,
  at: c.heat ? new Date(c.heat.at).getTime() : 0,
});

export const healthTimerOf = (c: Pick<CharacterDoc, 'health'>): HealthTimer => ({
  damage: c.health?.damage ?? 0,
  at: c.health ? new Date(c.health.at).getTime() : 0,
});

export const heatDoc = (t: HeatTimer) => ({ value: t.value, at: new Date(t.at) });
export const healthDoc = (t: HealthTimer) => ({ damage: t.damage, at: new Date(t.at) });

export const marksOf = (c: Pick<CharacterDoc, 'record'>): Mark[] =>
  (c.record?.marks ?? []).map((m) => ({ day: m.day, kind: m.kind, logId: m.logId ?? null }));

export const arrestsOf = (c: Pick<CharacterDoc, 'record'>): DayKey[] => [...(c.record?.arrests ?? [])];

export function recordLevelOf(c: Pick<CharacterDoc, 'record'>, today: DayKey): RecordLevel {
  return recordLevel(liveMarks(marksOf(c), today).length);
}

/** Today's *Watched* and *Warned* in a city (the hostile cards' day flags). */
export function flagsToday(c: Pick<CharacterDoc, 'flags'>, cityId: string, today: DayKey): DayFlags {
  const mine = (c.flags ?? []).filter((f) => f.cityId === cityId && f.day === today);
  return { watched: mine.some((f) => f.flag === 'watched'), warned: mine.some((f) => f.flag === 'warned') };
}

/** The flags list pruned to today (every write that touches it). */
export const flagsPruned = (c: Pick<CharacterDoc, 'flags'>, today: DayKey) =>
  (c.flags ?? []).filter((f) => f.day === today);

/** The bars still running (every write that touches them). */
export const barsLive = (c: Pick<CharacterDoc, 'barred'>, now: number) =>
  (c.barred ?? []).filter((b) => new Date(b.until).getTime() > now);

/** When the character's bar from `cityId` ends, or null. */
export function barredUntil(c: Pick<CharacterDoc, 'barred'>, cityId: string, now: number): number | null {
  const b = barsLive(c, now).find((x) => x.cityId === cityId);
  return b ? new Date(b.until).getTime() : null;
}

/** A city is rival ground for the character (no document needed: the home faction is content). */
export function isRivalGround(content: GameContent, c: Pick<CharacterDoc, 'factionId'>, cityId: string): boolean {
  const home = content.city(cityId)?.homeFactionId ?? null;
  return !!home && home !== c.factionId;
}

/**
 * Tech design §7.2: the refusal for a character in the cells or on the ward (`HELD`), or with a
 * run-in waiting for a choice (`RUN_IN_PENDING`); null when free. Callers throw it (`toTRPC()`
 * before the key, as is inside the transaction).
 */
export function notFree(c: Pick<CharacterDoc, 'held' | 'runIn'>): GameError | null {
  if (c.held && c.held.state === 'in') {
    return new GameError('HELD', { kind: c.held.kind, until: new Date(c.held.until).getTime() });
  }
  if (c.runIn && c.runIn.state === 'pending') {
    return new GameError('RUN_IN_PENDING', {
      encounterId: c.runIn.encounterId.toHexString(),
      decideBy: new Date(c.runIn.decideBy).getTime(),
    });
  }
  return null;
}

/** `notFree` as a tRPC refusal (before the key). */
export function assertFree(c: Pick<CharacterDoc, 'held' | 'runIn'>): void {
  const e = notFree(c);
  if (e) throw e.toTRPC();
}

/** Tech design §8.3: the character view's slice-5 fields. */
export function riskView(
  content: GameContent,
  doc: CharacterDoc,
  now: number,
  residenceCity: CityDoc | null,
): CharacterViewV6 {
  const today = dayKey(now);
  const rateOn = heatRateOn(content, residenceCity);
  const t = projectHeat(heatTimerOf(doc), now, rateOn);
  const state = heatState(t.value);
  const hTimer = healthTimerOf(doc);
  const max = healthMax(doc.level);
  const hp = healthNow(hTimer, now, doc.level);
  const rec = recordView(marksOf(doc), today);
  const flags = flagsToday(doc, doc.cityId, today);
  return {
    heat: {
      value: t.value,
      state,
      at: t.at,
      stepMs: heatStepMs(rateOn(today)),
      coolsAt: state === 'cool' ? null : heatEta(t, now, rateOn, HEAT.states.noticed),
      zeroAt: t.value > 0 ? heatEta(t, now, rateOn, 1) : null,
    },
    health: {
      value: hp,
      max,
      full: hp >= max,
      at: now,
      fullAt: hp >= max ? null : healthFullAt(hTimer, now),
    },
    record: {
      level: rec.level,
      marks: rec.marks,
      fadesOn: rec.fadesOn,
      fading: rec.fading,
      bailDoubled: rec.bailNotorious,
      ironPct: rec.ironPct,
      strike: rec.marks > 0 ? { cost: RECORD.strikePc, affordable: doc.pc >= RECORD.strikePc } : null,
    },
    held: doc.held
      ? {
          stayId: doc.held.stayId.toHexString(),
          kind: doc.held.kind,
          state: doc.held.state,
          until: new Date(doc.held.until).getTime(),
          placeName: content.location(doc.held.locationId)?.location.name ?? doc.held.locationId,
          cityId: doc.held.cityId,
        }
      : null,
    runIn: doc.runIn
      ? {
          encounterId: doc.runIn.encounterId.toHexString(),
          state: doc.runIn.state,
          decideBy: new Date(doc.runIn.decideBy).getTime(),
        }
      : null,
    agiQuarters: doc.stats.agiQuarters ?? 0,
    here: {
      rivalGround: isRivalGround(content, doc, doc.cityId),
      flags: [...(flags.watched ? (['watched'] as const) : []), ...(flags.warned ? (['warned'] as const) : [])],
    },
    barred: barsLive(doc, now).map((b) => ({
      cityId: b.cityId,
      cityName: content.city(b.cityId)?.name ?? b.cityId,
      until: new Date(b.until).getTime(),
    })),
  };
}

/** The live marks today (the bail's count). */
export const liveMarkCount = (c: Pick<CharacterDoc, 'record'>, today: DayKey): number =>
  liveMarks(marksOf(c), today).length;
