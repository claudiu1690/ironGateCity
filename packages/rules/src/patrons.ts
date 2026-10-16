import { PATRON, PATRON_TIERS } from './constants';
import type { PatronId, PatronTier } from './constants';
import { dayKey } from './day';
import type { DayKey } from './day';
import type { RequestMatch } from './lifeTypes';
import { perkFavour } from './personal';
import type { LegacyPerks } from './personal';
import { isMonday } from './week';
import type { ActionDescriptor, Outcome } from './types';

/**
 * Patrons (design docs/design/slice-8-life.md §5; GDD §17.2; ADR 0055). Favour 0–100 never falls;
 * Requests arrive, expire and are paid by calendar arithmetic in the character's settlement
 * (`patronDays`), so an absent player's Requests run exactly as a present player's.
 */

export type { PatronId, PatronTier };

/** Design §5.2: Acquaintance 10 · Associate 30 · Confidant 60 · Protégé 90. */
export function tierOf(favour: number): PatronTier | null {
  let out: PatronTier | null = null;
  for (const [tier, at] of PATRON.tiers) if (favour >= at) out = tier;
  return out;
}

export function nextTier(favour: number): { tier: PatronTier; at: number } | null {
  const next = PATRON.tiers.find(([, at]) => favour < at);
  return next ? { tier: next[0], at: next[1] } : null;
}

export const tierAtLeast = (has: PatronTier | null, need: PatronTier): boolean =>
  has !== null && PATRON_TIERS.indexOf(has) >= PATRON_TIERS.indexOf(need);

/** Design §5.2: a gain (×1.1 rounded up with *A friend of friends*), capped at 100; the tiers crossed. */
export function addFavour(
  favour: number,
  gain: number,
  perks: LegacyPerks,
): { favour: number; gained: number; crossed: PatronTier[] } {
  const before = Math.max(0, Math.min(PATRON.max, favour));
  const after = Math.min(PATRON.max, before + Math.max(0, perkFavour(perks, gain)));
  const crossed = PATRON.tiers.filter(([, at]) => before < at && after >= at).map(([t]) => t);
  return { favour: after, gained: after - before, crossed };
}

export interface StoredRequest {
  id: string;
  arrivedDay: DayKey;
  untilDay: DayKey;
  target: number;
  progress: number;
  /** Epoch ms when done (paid at the next boundary), or null. */
  doneAt: number | null;
  params: { districtId?: string; issueId?: string };
}

export interface StoredPatronState {
  id: PatronId;
  favour: number;
  firstVisitDay: DayKey | null;
  requests: StoredRequest[];
  /** The rotation pointer. */
  next: number;
  tierDays: Partial<Record<PatronTier, DayKey>>;
  favourDay: DayKey | null;
  discretionUntil: DayKey | null;
}

/** What the rules need of a Request (content's `PatronRequest`). */
export interface RequestSpec {
  id: string;
  match: RequestMatch;
  target: number;
  minLevel?: number;
}

export interface PatronDays {
  state: StoredPatronState;
  paid: Array<{ requestId: string; day: DayKey; favour: number }>;
  expired: string[];
  arrived: Array<{ requestId: string; day: DayKey }>;
  crossed: Array<{ tier: PatronTier; day: DayKey }>;
  gossipDays: DayKey[];
}

/**
 * Tech design §3.7 (§21.1 Q35, Q40): for each boundary b in (settled, today], in order:
 * (1) pay the Requests done before b (+6 each, the perk applied, tiers crossed);
 * (2) drop those whose `untilDay` is before b (*the letter is in the bin*);
 * (3) at b = firstVisitDay + 2k (k ≥ 1) with fewer than two open, the next in rotation arrives
 *     (skipping one whose `minLevel` is above the Level), open through b + 3, its district by k mod
 *     the districts and the capital's Issue at b;
 * (4) b a Monday at Acquaintance or better: a gossip day.
 */
export function patronDays(i: {
  state: StoredPatronState;
  rotation: readonly RequestSpec[];
  level: number;
  settled: DayKey;
  today: DayKey;
  perks: LegacyPerks;
  districts: readonly string[];
  liveIssue: (day: DayKey) => string | null;
}): PatronDays {
  const s: StoredPatronState = {
    ...i.state,
    requests: i.state.requests.map((r) => ({ ...r, params: { ...r.params } })),
    tierDays: { ...i.state.tierDays },
  };
  const out: PatronDays = { state: s, paid: [], expired: [], arrived: [], crossed: [], gossipDays: [] };
  for (let b = i.settled + 1; b <= i.today; b++) {
    // (1) Paid at the boundary after it is done.
    for (const r of [...s.requests]) {
      if (r.doneAt === null || dayKey(r.doneAt) >= b) continue;
      const add = addFavour(s.favour, PATRON.request.favour, i.perks);
      s.favour = add.favour;
      out.paid.push({ requestId: r.id, day: b, favour: add.gained });
      for (const t of add.crossed) {
        s.tierDays[t] ??= b;
        out.crossed.push({ tier: t, day: b });
      }
      s.requests = s.requests.filter((x) => x !== r);
    }
    // (2) Expired at its fourth boundary.
    for (const r of [...s.requests])
      if (r.doneAt === null && r.untilDay < b) {
        out.expired.push(r.id);
        s.requests = s.requests.filter((x) => x !== r);
      }
    // (3) Arrivals every second boundary after the first visit.
    const v = s.firstVisitDay;
    if (
      v !== null &&
      b > v &&
      (b - v) % PATRON.request.everyDays === 0 &&
      s.requests.length < PATRON.request.held
    ) {
      const k = (b - v) / PATRON.request.everyDays;
      const n = i.rotation.length;
      for (let step = 0; step < n; step++) {
        const spec = i.rotation[(s.next + step) % n]!;
        if (spec.minLevel !== undefined && i.level < spec.minLevel) continue;
        const districtId = i.districts.length > 0 ? i.districts[k % i.districts.length] : undefined;
        const issueId = i.liveIssue(b);
        s.requests.push({
          id: spec.id,
          arrivedDay: b,
          untilDay: b + PATRON.request.openDays - 1,
          target: spec.target,
          progress: 0,
          doneAt: null,
          params: { ...(districtId ? { districtId } : {}), ...(issueId ? { issueId } : {}) },
        });
        s.next = (s.next + step + 1) % n;
        out.arrived.push({ requestId: spec.id, day: b });
        break;
      }
    }
    // (4) Monday's gossip.
    if (isMonday(b) && tierAtLeast(tierOf(s.favour), 'acquaintance')) out.gossipDays.push(b);
  }
  return out;
}

/**
 * Design §5.3 (ADR 0055): the orders' matcher without the rival-ground exclusion, with mission types,
 * `districtId: 'rotate'` (the Request's own district) and the slice-8 kinds (`dossierEntry`, `expose`).
 * `home` is the residence (as the orders').
 */
export function requestMatches(
  m: RequestMatch,
  a: ActionDescriptor & { missionType?: string },
  params: { districtId?: string },
  home: { cityId: string; districtId: string | null },
): boolean {
  if (m.kinds && !m.kinds.includes(a.kind)) return false;
  if (a.kind === 'event' && !m.kinds?.includes('event')) return false;
  if ((a.kind === 'dossierEntry' || a.kind === 'expose') && !m.kinds?.includes(a.kind)) return false;
  if (
    m.missionTypes &&
    (a.kind !== 'mission' || !a.missionType || !m.missionTypes.includes(a.missionType as never))
  )
    return false;
  if (m.actionTypes && (a.type === undefined || !m.actionTypes.includes(a.type))) return false;
  if (m.actionIds && (a.actionId === undefined || !m.actionIds.includes(a.actionId))) return false;
  if (m.locationIds && (a.locationId === undefined || !m.locationIds.includes(a.locationId))) return false;
  if (m.locationKinds && (a.locationKind === undefined || !m.locationKinds.includes(a.locationKind)))
    return false;
  if (m.cityId !== undefined && a.cityId !== (m.cityId === 'home' ? home.cityId : m.cityId)) return false;
  if (m.districtId !== undefined) {
    const d =
      m.districtId === 'home'
        ? home.districtId
        : m.districtId === 'rotate'
          ? (params.districtId ?? null)
          : m.districtId;
    if (d === null || a.districtId !== d) return false;
  }
  if (m.issueTagged && (a.issueIds ?? []).length === 0) return false;
  return true;
}

/**
 * Tech design §3.7: the act advances every open, matching, unfinished Request by one; a Failure never
 * counts (an exposé counts on a Success or a Partial, §21.1 Q26; an entry counts when it lands).
 * `done` names those that reached their target (paid at the next boundary).
 */
export function advanceRequests(
  requests: readonly StoredRequest[],
  rotation: readonly RequestSpec[],
  a: ActionDescriptor & { missionType?: string },
  outcome: Outcome,
  home: { cityId: string; districtId: string | null },
  today: DayKey,
  now: number,
): { requests: StoredRequest[]; advanced: string[]; done: string[] } {
  const advanced: string[] = [];
  const done: string[] = [];
  const out = requests.map((r) => {
    if (r.doneAt !== null || r.untilDay < today || r.arrivedDay > today || outcome === 'failure')
      return { ...r };
    const spec = rotation.find((x) => x.id === r.id);
    if (!spec || !requestMatches(spec.match, a, r.params, home)) return { ...r };
    const progress = Math.min(r.target, r.progress + 1);
    advanced.push(r.id);
    if (progress >= r.target) done.push(r.id);
    return { ...r, progress, doneAt: progress >= r.target ? now : null };
  });
  return { requests: out, advanced, done };
}

/** Design §5.4 (§21.1 Q36): the Confidant's favour, seven City Days from the last call. */
export const favourReady = (favourDay: DayKey | null, today: DayKey): boolean =>
  favourDay === null || today >= favourDay + PATRON.favourEveryDays;

export type FavourRefusal = 'NOT_CONFIDANT' | 'FAVOUR_USED' | 'NOT_ENOUGH_PC';

/** Design §5.4: Confidant or better, once a week, the Political Capital. */
export function favourGate(i: {
  tier: PatronTier | null;
  favourDay: DayKey | null;
  today: DayKey;
  pc: number;
  cost: number;
}): null | { reason: FavourRefusal; from?: DayKey; need?: number } {
  if (!tierAtLeast(i.tier, 'confidant')) return { reason: 'NOT_CONFIDANT' };
  if (!favourReady(i.favourDay, i.today))
    return { reason: 'FAVOUR_USED', from: i.favourDay! + PATRON.favourEveryDays };
  if (i.pc < i.cost) return { reason: 'NOT_ENOUGH_PC', need: i.cost };
  return null;
}

export type GiftRefusal = 'PATRON_LEVEL' | 'GIVEN_TODAY' | 'NOT_ENOUGH_IRON';

/** Design §5.2: 200 Iron at the patron's place, one a day per patron, from Level 10. */
export function giftGate(i: {
  level: number;
  givenToday: boolean;
  iron: number;
}): null | { reason: GiftRefusal; need?: number } {
  if (i.level < PATRON.level) return { reason: 'PATRON_LEVEL', need: PATRON.level };
  if (i.givenToday) return { reason: 'GIVEN_TODAY' };
  if (i.iron < PATRON.gift.iron) return { reason: 'NOT_ENOUGH_IRON', need: PATRON.gift.iron };
  return null;
}

/** Design §5.4: Marr's discretion, the back room's bribe at half price for seven days. */
export const discretionOn = (until: DayKey | null, today: DayKey): boolean =>
  until !== null && until >= today;
export const discretionUntil = (today: DayKey): DayKey => today + PATRON.discretionDays - 1;

/** Design §5.4: Protégé of any patron (the endorsement in the counts). */
export const protege = (patrons: ReadonlyArray<{ favour: number }>): boolean =>
  patrons.some((p) => p.favour >= PATRON.tiers[PATRON.tiers.length - 1]![1]);

/** Design §5.4 (§21.1 Q38): the home count's +2 and the battleground score's +1. */
export const endorsementBonus = (
  patrons: ReadonlyArray<{ favour: number }>,
): { homeTotal: number; battlegroundScore: number } =>
  protege(patrons)
    ? { homeTotal: PATRON.endorsement.homeTotal, battlegroundScore: PATRON.endorsement.battlegroundScore }
    : { homeTotal: 0, battlegroundScore: 0 };
