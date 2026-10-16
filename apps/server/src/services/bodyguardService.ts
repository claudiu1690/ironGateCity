import { copy } from '@irongate/content/copy';
import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  BODYGUARD,
  RUN_IN,
  canRenew,
  contractCounts,
  createRng,
  hire as hireContract,
  hireGate,
  lastDay,
  minderChance,
  minderPower,
  oddsBand,
  renewGate,
  renewed,
  scaleOpponent,
} from '@irongate/rules';
import type { BodyguardTier, Contract, DayKey, HireCardView, MinderView, PoliticalResult, RunInOutcome } from '@irongate/rules';
import { GameError, gameError } from '../gameError';
import { assertHere, lifeAct, lifeResult, weekdayOf } from './lifeActs';
import type { LifeDeps } from './lifeActs';
import { keySeed } from './keyGuard';
import { VersionConflict } from './txn';
import { assetView } from './views';

/**
 * Slice 8 phase B, lane 1 (T30; tech design §24, ADR 0088): *someone to walk with you*. A contract
 * is a prepaid week on the character (`bodyguard { tier, name, paidThroughDay }`), counted lazily by
 * the day; his row is written with the encounter when a run-in fires (never against the police).
 */

const t = copy.life.minder;

const contractOf = (c: Pick<CharacterDoc, 'bodyguard'>): Contract | null => (c.bodyguard ? { ...c.bodyguard } : null);

const tierSpec = (content: GameContent, tier: BodyguardTier) => content.bodyguards.find((b) => b.tier === tier)!;

const nameIn = (s: string, name: string) => s.replaceAll('{Name}', name);

/** The run-in's row, written with the encounter (§24.1): his power, or blocked by the police. */
export function minderAtRunIn(
  c: Pick<CharacterDoc, 'bodyguard'>,
  today: DayKey,
  opponentSide: string,
): { tier: BodyguardTier; name: string; power: number; blocked: 'police' | null } | null {
  const k = contractOf(c);
  if (!k || !contractCounts(k, today)) return null;
  return { tier: k.tier, name: k.name, power: minderPower(k.tier), blocked: opponentSide === 'police' ? 'police' : null };
}

/**
 * Tech design §24.7: the run-in's line with him: *minded* is his `works` line; his row failed (the
 * cause `minder`) is his `fails` line, then the fight's own line.
 */
export function minderLine(
  content: GameContent,
  minder: { tier: BodyguardTier; name: string } | null | undefined,
  o: Pick<RunInOutcome, 'outcome' | 'cause'>,
  fallback: string,
): string {
  if (!minder) return fallback;
  const spec = tierSpec(content, minder.tier);
  if (o.outcome === 'minded') return nameIn(spec.works, minder.name);
  if (o.cause === 'minder') return `${nameIn(spec.fails, minder.name)} ${fallback}`;
  return fallback;
}

/** The renewal's prices: a week, and four weeks when they fit the limit (§24.10 Q1). */
const renewPrices = (k: Contract, today: DayKey) => ({
  week: BODYGUARD.tiers[k.tier].week,
  four: canRenew(k, 4, today) ? BODYGUARD.tiers[k.tier].week * 4 : null,
});

/** Tech design §24.6: the Me tab's *Walking with you* row, or null. */
export function minderView(content: GameContent, c: CharacterDoc, today: DayKey): MinderView | null {
  const k = contractOf(c);
  if (!k || !contractCounts(k, today)) return null;
  const spec = tierSpec(content, k.tier);
  return {
    tier: k.tier,
    said: spec.said,
    name: k.name,
    portrait: assetView(content, spec.portrait),
    until: k.paidThroughDay,
    state: lastDay(k, today) ? 'last' : 'with',
    renew: renewPrices(k, today),
  };
}

/** The street enforcer on a mission at home: the card's odds word (§24.10 Q7). */
function cardWord(content: GameContent, tier: BodyguardTier): 'good' | 'fair' | 'long' {
  const enforcer = content.opponents.find((o) => o.id === 'street-enforcer') ?? content.opponents.find((o) => o.side !== 'police');
  if (!enforcer) return 'fair';
  const them = scaleOpponent(enforcer, { tier: 2, rivalGround: false });
  return oddsBand(minderChance(minderPower(tier), them));
}

/** Tech design §24.6: the party store's hire card (a `partyStore` shop with `hire`), or null. */
export function hireCard(content: GameContent, c: CharacterDoc, locationId: string, today: DayKey): HireCardView | null {
  const l = content.location(locationId);
  const shop = content.shopsAt(locationId).find((s) => s.kind === 'partyStore' && s.hire);
  if (!l || !shop) return null;
  const k = contractOf(c);
  const member = l.location.factionId === c.factionId;
  return {
    rows: content.bodyguards.map((b) => {
      const spec = BODYGUARD.tiers[b.tier];
      const g = hireGate({ tier: b.tier, level: c.level, rank: c.rank, member, contract: k, today, iron: c.iron });
      const running = k && contractCounts(k, today) && k.tier === b.tier;
      const state = running
        ? 'running'
        : g === null
          ? 'hire'
          : g.reason === 'LEVEL'
            ? 'level'
            : g.reason === 'RANK'
              ? 'rank'
              : g.reason === 'WITH_YOU'
                ? 'withYou'
                : g.reason === 'NOT_ENOUGH_IRON'
                  ? 'needsIron'
                  : 'level';
      return {
        tier: b.tier,
        said: b.said,
        portrait: assetView(content, b.portrait),
        week: spec.week,
        word: cardWord(content, b.tier),
        state,
        ...(g?.need !== undefined ? { need: g.need } : {}),
        ...(k && contractCounts(k, today) ? { name: k.name, until: k.paidThroughDay } : {}),
        confirm: spec.week > BODYGUARD.confirmOver,
        ...(running && k ? { renew: renewPrices(k, today) } : {}),
      };
    }),
  };
}

const refuse = (g: { reason: string; need?: number; name?: string; until?: DayKey }): never => {
  const data: Record<string, unknown> = {};
  if (g.need !== undefined) data.need = g.need;
  if (g.name !== undefined) data.name = g.name;
  if (g.until !== undefined) data.until = g.until;
  throw new GameError(g.reason as never, data);
};

/** `bodyguard.hire` (§24.1): at your own party store; the same tier brings back the same man. */
export function hire(deps: LifeDeps, input: { locationId: string; tier: BodyguardTier; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  const l = content.location(input.locationId);
  if (!l) throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId: input.locationId });
  return lifeAct(deps, 'bodyguard.hire', input.idempotencyKey, { locationId: input.locationId, tier: input.tier }, async ({ session, c, now, today }) => {
    assertHere(c, l.city.id);
    if (!content.shopsAt(input.locationId).some((s) => s.kind === 'partyStore' && s.hire)) throw new GameError('NO_HIRE');
    const k = contractOf(c);
    const g = hireGate({
      tier: input.tier,
      level: c.level,
      rank: c.rank,
      member: l.location.factionId === c.factionId,
      contract: k,
      today,
      iron: c.iron,
    });
    if (g) refuse(g);
    const spec = tierSpec(content, input.tier);
    const week = BODYGUARD.tiers[input.tier].week;
    const next = hireContract({
      tier: input.tier,
      contract: k,
      names: spec.names,
      today,
      rng: createRng(`${keySeed(c._id, input.idempotencyKey)}:hire`),
    });
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: week } },
      { $set: { bodyguard: next }, $inc: { iron: -week, version: 1 } },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const text = t.hired(next.name);
    return lifeResult({
      content,
      session,
      before: c,
      updated,
      now,
      idempotencyKey: input.idempotencyKey,
      act: 'hired',
      stamp: t.stamps.hired,
      headline: text.headline,
      body: text.body,
      lines: [copy.life.knock.iron(week), copy.life.knock.untilWeekday(weekdayOf(next.paidThroughDay))],
      view: { kind: 'place', locationId: l.location.id },
    });
  });
}

/** `bodyguard.renew` (§24.1): from anywhere, a week or four, at most four weeks ahead. */
export function renew(deps: LifeDeps, input: { weeks: 1 | 4; idempotencyKey: string }): Promise<PoliticalResult> {
  const { content } = deps;
  return lifeAct(deps, 'bodyguard.renew', input.idempotencyKey, { weeks: input.weeks }, async ({ session, c, now, today }) => {
    const k = contractOf(c);
    const g = renewGate({ contract: k, weeks: input.weeks, today, iron: c.iron });
    if (g) refuse(g);
    const price = BODYGUARD.tiers[k!.tier].week * input.weeks;
    const next = renewed(k!, input.weeks, today);
    const updated = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: price } },
      { $set: { 'bodyguard.paidThroughDay': next.paidThroughDay }, $inc: { iron: -price, version: 1 } },
      { session, returnDocument: 'after', lean: true },
    );
    if (!updated) throw new VersionConflict();
    const text = t.renewed(next.name, weekdayOf(next.paidThroughDay));
    return lifeResult({
      content,
      session,
      before: c,
      updated,
      now,
      idempotencyKey: input.idempotencyKey,
      act: 'renewed',
      stamp: t.stamps.renewed,
      headline: text.headline,
      body: text.body,
      lines: [copy.life.knock.iron(price), copy.life.knock.untilWeekday(weekdayOf(next.paidThroughDay))],
      view: { kind: 'minder', minder: minderView(content, updated, today) },
    });
  });
}

/** §24.11's run-in XP when he works (no Health lost): `RUN_IN.xp.away`. */
export const MINDED_XP = RUN_IN.xp.away;
