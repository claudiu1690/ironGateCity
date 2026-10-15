import { DIRECTIVES, PUSH } from './constants';
import { cityDayIndex, mod } from './day';
import type { DayKey } from './day';
import type {
  ActionDescriptor,
  OrderItem,
  OrderMatch,
  OrderSlot,
  OrderTemplate,
  OrdersState,
  Outcome,
  ResidenceCtx,
} from './types';

const SLOTS: OrderSlot[] = ['A', 'B', 'C'];

/**
 * §13.7 / ADR 0009: the faction's three orders for a City Day, deterministically: slot A
 * `A[i mod |A|]`, B `B[i mod |B|]`, C `C[i mod |C|]` with i = City Days since 2026-01-01.
 * `templates` are one faction's, in file order.
 */
export function ordersForDay(
  templates: readonly OrderTemplate[],
  day: DayKey,
  residence: ResidenceKind = 'home',
  /**
   * Slice 5 (design §12.2): a template with `minLevel` enters a member's rotation from that Level
   * (orders are faction-wide among members who can do them). Absent: Level 1, so a caller that does
   * not pass it keeps the slice-4 rotation.
   */
  level = 1,
  /**
   * Review 4 #22: whether the member can do a template's work today at all (the slot-B mission
   * order needs a mission they can start in the residence city). A template it refuses leaves the
   * slot's rotation for the day, like one under `minLevel`. Absent: every template.
   */
  offerable: (t: OrderTemplate) => boolean = () => true,
): OrderTemplate[] {
  const i = cityDayIndex(day);
  const picked: OrderTemplate[] = [];
  for (const slot of SLOTS) {
    // Crisis templates (Restore the base) never enter the rotation (slice-3 tech design §4.1).
    // Slice 4 (design §10): a template serves the residents it names (`any`: both).
    const inSlot = templates.filter(
      (t) =>
        t.slot === slot &&
        (t.use ?? 'rotation') === 'rotation' &&
        ((t.residence ?? 'home') === residence || t.residence === 'any') &&
        (t.minLevel ?? 1) <= level &&
        offerable(t),
    );
    if (inSlot.length > 0) picked.push(inSlot[mod(i, inSlot.length)]!);
  }
  return picked;
}

/**
 * A fresh day's orders. With `welcome` (a character's welcome day, ADR 0012 and review 1) the three
 * items are those templates, in slot order A, B, C, instead of the rotation; a *Take a job* item
 * (`kinds: ['takeJob']`) starts done, with no reward, when a job is already held (the second
 * welcome day of a late sign-up). With `crisis` (the home city in Unrest, GDD §14.11) the pair
 * replaces slots A and B; the welcome set wins over it on a welcome day. Slice 4: `residence`
 * picks the home or the capital rotation; the crisis pair is only ever for home residents.
 */
export function startOrders(
  templates: readonly OrderTemplate[],
  day: DayKey,
  hasJob: boolean,
  welcome?: readonly [string, string, string],
  crisis?: readonly [string, string],
  now?: number,
  residence: ResidenceKind = 'home',
  /** Slice 5: the member's Level, for `minLevel` templates (default 1). */
  level = 1,
  /** Review 4 #22: `ordersForDay`'s filter (the mission order only with a mission to start). */
  offerable?: (t: OrderTemplate) => boolean,
  /** Slice 7 (ADR 0046): the Chair's standing orders for the day; the crisis pair and the welcome set still win. */
  standing?: StandingInput,
): OrdersState {
  const byId = (kind: string) => (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) throw new Error(`${kind} order "${id}" is not one of this faction's templates`);
    return t;
  };
  let picked: OrderTemplate[];
  if (welcome) picked = welcome.map(byId('welcome'));
  else {
    picked = standing
      ? standingOrdersForDay(templates, day, residence, level, standing, offerable)
      : ordersForDay(templates, day, residence, level, offerable);
    if (crisis && residence === 'home') {
      const [a, b] = crisis.map(byId('crisis'));
      picked = [a!, b!, ...picked.filter((t) => t.slot !== 'A' && t.slot !== 'B')];
    }
  }
  return {
    day,
    items: picked.map((t: OrderTemplate & { push?: OrderItem['push'] }) => {
      const already = hasJob && (t.match.kinds ?? []).includes('takeJob');
      return {
        templateId: t.id,
        variant: 'main' as const,
        target: t.target,
        progress: already ? t.target : 0,
        doneAt: already ? (now ?? 0) : null,
        ...(t.push ? { push: { ...t.push } } : {}),
      };
    }),
    allDoneAt: null,
  };
}

/**
 * Review 4 QA m2 (ADR 0073: the favour is *a first action that is offered once*; GDD §13.7): the welcome
 * set is dealt once per character. A character created after 22:00 UTC has two welcome days; on the
 * second, the set dealt the evening before goes on as it stands, items done stay done (so the favour
 * and its order cannot pay twice) and the day's *off* ends. A set already finished gives way to the
 * day's rotation (`'rotation'`). `null`: yesterday held no welcome set (deal it fresh).
 */
export function carriedWelcome(
  prev: OrdersState,
  today: DayKey,
  welcomeBId: string,
  templates: readonly OrderTemplate[],
  hasJob: boolean,
  now: number,
): OrdersState | 'rotation' | null {
  if (prev.day >= today || !prev.items.some((i) => i.templateId === welcomeBId)) return null;
  if (prev.allDoneAt !== null || prev.items.every((i) => i.doneAt !== null)) return 'rotation';
  return {
    day: today,
    items: prev.items.map((i) => {
      const t = templates.find((x) => x.id === i.templateId);
      // As `startOrders`: a job taken (with the orders off, say) counts for *Take a job*.
      const already = i.doneAt === null && hasJob && (t?.match.kinds ?? []).includes('takeJob');
      return already ? { ...i, progress: i.target, doneAt: now } : { ...i };
    }),
    allDoneAt: null,
  };
}

/** Where `'home'` points: a residence, or (slice 1–3 callers) a city id with no district. */
export type MatchCtx = ResidenceCtx | string;

const ctxOf = (ctx: MatchCtx): ResidenceCtx =>
  typeof ctx === 'string' ? { cityId: ctx, districtId: null } : ctx;

/**
 * ADR 0009, slice 4 (ADR 0026): AND of the match's fields. `cityId: 'home'` is the residence city,
 * `districtId: 'home'` the residence district (never matches without one).
 */
export function orderMatches(
  m: OrderMatch,
  a: ActionDescriptor,
  ctx: MatchCtx,
  /** Slice 7 (ADR 0046): the item's pushed place, which `'push'` in a match resolves to. */
  push?: { cityId: string; districtId: string | null },
): boolean {
  const r = ctxOf(ctx);
  // Slice 5 (ADR 0034 §3): the orders are home's or the capital's; nothing on rival ground counts.
  if (r.rivalGround) return false;
  if (m.kinds && !m.kinds.includes(a.kind)) return false;
  // Slice 6 (design 2.7): an event sign-up counts only for a template naming `event` (the roles' types match nothing else).
  if (a.kind === 'event' && !m.kinds?.includes('event')) return false;
  if (m.actionTypes && (a.type === undefined || !m.actionTypes.includes(a.type))) return false;
  if (m.actionIds && (a.actionId === undefined || !m.actionIds.includes(a.actionId))) return false;
  if (m.locationIds && (a.locationId === undefined || !m.locationIds.includes(a.locationId))) return false;
  if (m.locationKinds && (a.locationKind === undefined || !m.locationKinds.includes(a.locationKind)))
    return false;
  if (m.cityId !== undefined) {
    if (m.cityId === 'push' && !push) return false;
    const city = m.cityId === 'home' ? r.cityId : m.cityId === 'push' ? push!.cityId : m.cityId;
    if (a.cityId !== city) return false;
  }
  // Slice 7: a push to a place with no district (Clearwater) leaves `districtId: 'push'` unconstrained.
  if (m.districtId !== undefined && !(m.districtId === 'push' && push?.districtId === null)) {
    if (m.districtId === 'push' && !push) return false;
    const district = m.districtId === 'home' ? r.districtId : m.districtId === 'push' ? push!.districtId : m.districtId;
    if (district === null || a.districtId !== district) return false;
  }
  if (m.issueTagged && (a.issueIds ?? []).length === 0) return false;
  return true;
}

/**
 * The title, line and match rule an item is using. Review 1 retired the `noJob` variant: an item
 * stored with it before then reads as its template (the template ids were removed, so such an item
 * is only ever yesterday's, and never advances).
 */
export function itemSpec(_item: OrderItem, t: OrderTemplate) {
  return { title: t.title, line: t.line, match: t.match, counts: t.counts };
}

/** Slice-4 fixes §2 (QA m1): the training verbs' fixed order in an order's `{verbs}`. */
export const TRAINING_VERB_ORDER = ['Study', 'Lift', 'Unload', 'Carry', 'Run'] as const;

/**
 * Slice-4 fixes §2 (QA m1): `{verbs}`, the training verbs a member may use where they live, distinct,
 * in TRAINING_VERB_ORDER (others after, as found), at most three, the first capitalised and the rest
 * lower-case, joined "a, b or c": *Study, lift or run*.
 */
export function verbsPhrase(verbs: Iterable<string>): string {
  const found = [...new Set(verbs)];
  const rank = (v: string) => {
    const i = (TRAINING_VERB_ORDER as readonly string[]).indexOf(v);
    return i < 0 ? TRAINING_VERB_ORDER.length + found.indexOf(v) : i;
  };
  const words = found
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 3)
    .map((v, i) => (i === 0 ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v.toLowerCase()));
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} or ${words.at(-1)!}`;
}

/**
 * Review 4 #20 (GDD §13.7, §19.2; ADR 0078): an arrest takes the day's orders off the board at `at`.
 * Orders already done stay done and paid; nothing else advances until the settlement's new orders.
 * Set once: a second call returns the state unchanged.
 */
export function closeOrders(o: OrdersState, at: number): OrdersState {
  if (o.off) return o;
  return { ...o, items: o.items.map((x) => ({ ...x })), off: { at, reason: 'cells' } };
}

/** Whether the day's orders are off (an arrest today). */
export const ordersOff = (o: Pick<OrdersState, 'off'>): boolean => !!o.off;

/**
 * The first open item this row would advance, if any (successes-only items only on Success). None
 * while the orders are off (review 4, ADR 0078).
 */
export function findAdvancingItem(
  o: OrdersState,
  templates: readonly OrderTemplate[],
  a: ActionDescriptor,
  outcome: Outcome,
  ctx: MatchCtx,
): number {
  if (o.off) return -1;
  return o.items.findIndex((item) => {
    if (item.doneAt !== null) return false;
    const t = templates.find((x) => x.id === item.templateId);
    if (!t) return false;
    const spec = itemSpec(item, t);
    if (spec.counts === 'successes' && outcome !== 'success') return false;
    return orderMatches(spec.match, a, ctx);
  });
}

export interface AdvanceResult {
  orders: OrdersState;
  /** The item after advancing, or null if nothing matched. */
  advanced: OrderItem | null;
  /** The item if this row reached its target. */
  completed: OrderItem | null;
  /** True when this row completed the third order of the day. */
  allDone: boolean;
}

/** One row advances at most one item: the first open one that matches (ADR 0009). */
export function advanceOrders(
  o: OrdersState,
  templates: readonly OrderTemplate[],
  a: ActionDescriptor,
  outcome: Outcome,
  ctx: MatchCtx,
  now: number,
): AdvanceResult {
  const idx = findAdvancingItem(o, templates, a, outcome, ctx);
  if (idx < 0) return { orders: o, advanced: null, completed: null, allDone: false };
  const items = o.items.map((x) => ({ ...x }));
  const item = items[idx]!;
  item.progress += 1;
  const completed = item.progress >= item.target;
  if (completed) item.doneAt = now;
  const everyDone = items.length > 0 && items.every((x) => x.doneAt !== null);
  const allDone = completed && everyDone && o.allDoneAt === null;
  return {
    orders: { ...o, items, allDoneAt: allDone ? now : o.allDoneAt },
    advanced: { ...item },
    completed: completed ? { ...item } : null,
    allDone,
  };
}

/** The FXP one completed order pays: its `doneFxp` (Restore the base: 40), else +20. */
export const orderDoneFxp = (t: Pick<OrderTemplate, 'doneFxp'> | undefined): number =>
  t?.doneFxp ?? DIRECTIVES.orderDoneFxp;

/**
 * FXP and PC the completed orders pay (§15.4): +20 FXP each (a template's `doneFxp` when given),
 * +5 PC for all three. A number counts plain orders.
 */
export function orderRewards(
  completed: number | ReadonlyArray<Pick<OrderTemplate, 'doneFxp'> | undefined>,
  allDone: boolean,
): { fxp: number; pc: number } {
  const fxp =
    typeof completed === 'number'
      ? completed * DIRECTIVES.orderDoneFxp
      : completed.reduce((sum, t) => sum + orderDoneFxp(t), 0);
  return { fxp, pc: allDone ? DIRECTIVES.allDonePc : 0 };
}

// ---------------------------------------------------------------------------------------------
// Slice 7 (docs/tech/slice-7.md §6.7, ADR 0046): the Chair's standing orders and the push.
// ---------------------------------------------------------------------------------------------

/** Whose rotation a member reads (slice 4's home and capital; slice 7's Clearwater). */
export type ResidenceKind = 'home' | 'capital' | 'clearwater';

/** The Chair's picks: a family id per slot, or null for the rotation. */
export interface StandingPicks {
  A: string | null;
  B: string | null;
  C: string | null;
}

/** The push: slot A or B to a capital district or Clearwater, with the party's target. */
export interface PushSpec {
  slot: 'A' | 'B';
  cityId: string;
  districtId: string | null;
  target: 25 | 50 | 100;
}

/** One stored set of standing orders (`factions.orders.current` / `next`). */
export interface StandingSpec {
  fromDay: DayKey;
  picks: StandingPicks;
  push: PushSpec | null;
}

/** What `startOrders` needs of the Chair's orders for the day. */
export interface StandingInput {
  picks: StandingPicks;
  push: PushSpec | null;
  /** The faction's push templates (content's `pushTemplate`). */
  pushTemplates: { A: OrderTemplate | undefined; B: OrderTemplate | undefined };
  /** The member's residence place, where a member below Level 10 reads the push (counts: false). */
  residencePlace: { cityId: string; districtId: string | null };
}

/** ADR 0046: the standing orders in force on `day`: `next` once it has started, else `current`. */
export function standingOn<T extends { fromDay: DayKey }>(
  o: { current: T | null; next: T | null },
  day: DayKey,
): T | null {
  if (o.next && day >= o.next.fromDay) return o.next;
  if (o.current && day >= o.current.fromDay) return o.current;
  return null;
}

/**
 * ADR 0046 (design §23.2): per slot, the pick's template for this residence (the same family; `any`
 * serves every residence), else the rotation. The pushed slot is the faction's push template: at the
 * battleground for Level 10+ (its attempts count), at the residence below (they do not).
 */
export function standingOrdersForDay(
  templates: readonly OrderTemplate[],
  day: DayKey,
  residence: ResidenceKind,
  level: number,
  standing: StandingInput,
  offerable: (t: OrderTemplate) => boolean = () => true,
): Array<OrderTemplate & { push?: { cityId: string; districtId: string | null; counts: boolean } }> {
  const rotation = ordersForDay(templates, day, residence, level, offerable);
  const out: Array<OrderTemplate & { push?: { cityId: string; districtId: string | null; counts: boolean } }> = [];
  for (const slot of SLOTS) {
    const push = standing.push;
    const pushT = push && push.slot === slot ? standing.pushTemplates[slot as 'A' | 'B'] : undefined;
    if (push && pushT) {
      const counts = level >= PUSH.level;
      const place = counts ? { cityId: push.cityId, districtId: push.districtId } : standing.residencePlace;
      out.push({ ...pushT, push: { ...place, counts } });
      continue;
    }
    const family = standing.picks[slot];
    const picked =
      family === null
        ? undefined
        : templates.find(
            (t) =>
              t.slot === slot &&
              t.family === family &&
              (t.use ?? 'rotation') === 'rotation' &&
              ((t.residence ?? 'home') === residence || t.residence === 'any') &&
              (t.minLevel ?? 1) <= level &&
              offerable(t),
          );
    const fallback = rotation.find((t) => t.slot === slot);
    if (picked) out.push(picked);
    else if (fallback) out.push(fallback);
  }
  return out;
}

/** ADR 0046: does this attempt count toward the party's target? The item's push counts and its match holds. */
export function pushCounts(item: OrderItem, t: OrderTemplate, a: ActionDescriptor, ctx: MatchCtx): boolean {
  return !!item.push?.counts && orderMatches(t.match, a, ctx, item.push);
}

/** Design §23.3: the push's title with its place: "Talk to voters in Eastside, Irongate". */
export function pushTitle(t: Pick<OrderTemplate, 'title'>, place: { cityName: string; districtName: string | null }): string {
  const name = place.districtName ? `${place.districtName}, ${place.cityName}` : place.cityName;
  return t.title.replaceAll('{place}', name);
}

/** Design §4.2: the party's target is met. */
export const pushMet = (count: number, target: number): boolean => count >= target;
