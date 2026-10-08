import type { GameContent } from '@irongate/content';
import { Character, City, Encounter } from '@irongate/db';
import type { CharacterDoc, CityDoc, EncounterDoc } from '@irongate/db';
import { RIVAL_GROUND, dayKey, dayStart, pressureLostToday, runInChance } from '@irongate/rules';
import { z } from 'zod';
import { releaseHeldNow, sendToHeld } from '../services/heldService';
import { nightAt } from '../services/night';
import { riskView } from '../services/risk';
import { streetHooks } from '../services/streetHooks';
import type { StreetForce } from '../services/streetHooks';
import { formatUtc } from './clock';
import type { DevRisk } from './types';

/**
 * Slice 5 (tech design §8.5–§8.6): the risk test hooks as functions, so the e2e routes and the dev
 * panel's buttons make the very same writes. Memory mode only (E2E_TEST_HOOKS). No game rule here:
 * the cells and the infirmary are the held service's own `sendToHeld` (the rules' sentence and bail),
 * a release or a decision only moves a time to `now`, and the next read does the rest.
 */

/** A hook's clean refusal (the HTTP status and one line). */
export class DevRefusal extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

const roll = z.number().int().min(1).max(100);
const stat = z.number().int().min(0).max(999);

/** `POST /api/test/character`'s slice-5 fields (the slice 3–4 fields are read as before). */
export const CharacterRiskBody = z.object({
  heat: z.number().int().min(0).max(100).optional(),
  health: z.number().int().min(0).max(999).optional(),
  marks: z
    .array(
      z.object({ kind: z.enum(['minor', 'moderate', 'serious']), daysAgo: z.number().int().min(0).max(365) }),
    )
    .max(50)
    .optional(),
  agi: stat.optional(),
  str: stat.optional(),
  cha: stat.optional(),
  rank: z.number().int().min(1).max(7).optional(),
});

/** `POST /api/test/street`: what the caller's next act (a mission or a rival tap) uses. */
export const StreetBody = z
  .object({
    runIn: z.enum(['next', 'never']).optional(),
    opponentId: z.string().min(1).optional(),
    checkRoll: roll.optional(),
    choiceRoll: roll.optional(),
    caught: z.enum(['always', 'never']).optional(),
    // Review 5 (tech design §4.3): each row's check roll for any act, home tier 1 included.
    rolls: z.array(roll).min(1).max(3).optional(),
  })
  .strict();

/** Review 5 (ADR 0079): `POST /api/test/night`, the night seam's test mode. */
export const NightBody = z.object({ mode: z.enum(['clock', 'day', 'night']) }).strict();

/** `POST /api/test/held`: one of the two. */
export const HeldBody = z.union([
  z.object({ send: z.enum(['cells', 'infirmary']) }).strict(),
  z.object({ releaseNow: z.literal(true) }).strict(),
]);

/** `POST /api/test/run-in`. */
export const RunInBody = z.object({ decideNow: z.literal(true) }).strict();

/** The first Zod issue as one line, for a 400. */
export const zodLine = (e: z.ZodError): string => {
  const i = e.issues[0];
  return i ? `${i.path.join('.') || 'body'}: ${i.message}` : 'invalid body';
};

/** The street force for the caller's next act (merged with what is already set). */
export function setStreet(
  content: GameContent,
  c: Pick<CharacterDoc, '_id'>,
  force: StreetForce,
): StreetForce {
  if (force.opponentId !== undefined && !content.opponent(force.opponentId)) {
    throw new DevRefusal(400, `unknown opponentId "${force.opponentId}"`);
  }
  const id = c._id.toHexString();
  streetHooks.set(id, force);
  return streetHooks.peek(id) ?? {};
}

/**
 * The panel's *Next run-in*: `off` (no run-in), `random` (a run-in, the pool's opponent) or an
 * opponent id. Replaces the run-in part of the force; the rolls and the caught check are kept.
 */
export function setNextRunIn(
  content: GameContent,
  c: Pick<CharacterDoc, '_id'>,
  target: string,
): StreetForce {
  const id = c._id.toHexString();
  if (target !== 'off' && target !== 'random' && !content.opponent(target)) {
    throw new DevRefusal(400, 'target is off, random or an opponent id');
  }
  // `take` then `set`: the merge in `set` cannot drop a key.
  const { runIn: _r, opponentId: _o, ...rest } = streetHooks.take(id) ?? {};
  return setStreet(content, c, {
    ...rest,
    runIn: target === 'off' ? 'never' : 'next',
    ...(target === 'off' || target === 'random' ? {} : { opponentId: target }),
  });
}

/** The cells or the infirmary of the city the character is in now (reason `dev`). */
export async function sendHeld(
  content: GameContent,
  c: CharacterDoc,
  kind: 'cells' | 'infirmary',
  now: number,
): Promise<void> {
  if (c.held?.state === 'in') throw new DevRefusal(409, `already in the ${c.held.kind}`);
  if (c.journey?.status === 'onTheWay') throw new DevRefusal(409, 'on a train');
  if (!content.servicesOf(c.cityId)) throw new DevRefusal(409, `${c.cityId} has no cells or infirmary`);
  await sendToHeld(content, c._id, kind, now);
}

/** The stay ends now (the next read releases). */
export async function releaseNow(c: CharacterDoc, now: number): Promise<void> {
  if (c.held?.state !== 'in') throw new DevRefusal(409, 'not held');
  await releaseHeldNow(c._id, now);
}

/** The pending run-in's `decideBy = now` on the encounter and the pointer (the next read decides by luck). */
export async function decideNow(c: CharacterDoc, now: number): Promise<void> {
  const r = c.runIn;
  if (r?.state !== 'pending') throw new DevRefusal(409, 'no run-in pending');
  const at = new Date(now);
  await Encounter.updateOne({ _id: r.encounterId, state: 'pending' }, { $set: { decideBy: at } });
  await Character.updateOne(
    { _id: c._id, 'runIn.encounterId': r.encounterId, 'runIn.state': 'pending' },
    { $set: { 'runIn.decideBy': at }, $inc: { version: 1 } },
  );
}

/** The two rival home cities (the panel's *Take me to…*). */
export function rivalHomes(
  content: GameContent,
  c: Pick<CharacterDoc, 'factionId'>,
): Array<{ cityId: string; cityName: string }> {
  return content
    .councilCities()
    .filter((x) => x.homeFactionId && x.homeFactionId !== c.factionId)
    .map((x) => ({ cityId: x.id, cityName: x.name }));
}

/**
 * Review 5 (ADR 0080): a tier-1 tap's run-in chance for `c` where it stands, at `now` (the night
 * read through the seam); null off rival ground. The status's night block shows it.
 */
export function tapRunInChance(
  content: GameContent,
  c: CharacterDoc,
  residenceCity: CityDoc | null,
  now: number,
): number | null {
  const v = riskView(content, c, now, residenceCity);
  if (!v.here.rivalGround) return null;
  return runInChance({
    base: 0,
    tier: 1,
    rivalGround: true,
    heatState: v.heat.state,
    record: v.record.level,
    flags: { watched: v.here.flags.includes('watched'), warned: v.here.flags.includes('warned') },
    night: nightAt(now).night,
  });
}

/** The status's risk block (tech design §8.6), read from the stored character without settling it. */
export async function riskStatus(
  content: GameContent,
  c: CharacterDoc,
  residenceCity: CityDoc | null,
  now: number,
): Promise<DevRisk> {
  const v = riskView(content, c, now, residenceCity);
  const today = dayKey(now);
  const enc = c.runIn ? await Encounter.findById(c.runIn.encounterId).lean<EncounterDoc>() : null;
  const spec = content.city(c.cityId);
  const home = spec?.homeFactionId ?? null;
  const here = home ? await City.findById(c.cityId, { rivalPressure: 1 }).lean<CityDoc>() : null;
  const street = streetHooks.peek(c._id.toHexString());
  return {
    level: c.level,
    heat: {
      value: v.heat.value,
      state: v.heat.state,
      coolBy: v.heat.coolsAt,
      coolByUtc: v.heat.coolsAt === null ? null : formatUtc(v.heat.coolsAt),
    },
    health: { value: v.health.value, max: v.health.max },
    record: {
      level: v.record.level,
      marks: v.record.marks,
      fadesOn: v.record.fadesOn,
      fadesOnUtc: v.record.fadesOn === null ? null : formatUtc(dayStart(v.record.fadesOn)),
    },
    held: v.held
      ? {
          kind: v.held.kind,
          state: v.held.state,
          placeName: v.held.placeName,
          minutesLeft: Math.max(0, Math.ceil((v.held.until - now) / 60_000)),
          bail: c.held?.bail?.total ?? null,
        }
      : null,
    runIn:
      v.runIn && c.runIn
        ? {
            state: v.runIn.state,
            opponent: enc ? (content.opponent(enc.opponent.id)?.label ?? enc.opponent.id) : '?',
            decidesAt: v.runIn.decideBy,
            decidesAtUtc: formatUtc(v.runIn.decideBy),
          }
        : null,
    flags: v.here.flags,
    barred: v.barred.map((b) => ({ ...b, untilUtc: formatUtc(b.until) })),
    pressure:
      spec && home
        ? {
            cityName: spec.name,
            homeFaction: content.faction(home).shortName,
            rivalGround: v.here.rivalGround,
            lostToday: pressureLostToday(here?.rivalPressure ?? null, today) / 1_000,
            cap: RIVAL_GROUND.pressureCapPerDay,
          }
        : null,
    street: street && Object.keys(street).length > 0 ? street : null,
    rivalHomes: rivalHomes(content, c),
    opponents: content.opponents.map((o) => ({ id: o.id, label: o.label })),
  };
}
