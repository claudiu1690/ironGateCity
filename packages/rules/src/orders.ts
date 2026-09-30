import { DIRECTIVES } from './constants';
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
} from './types';

const SLOTS: OrderSlot[] = ['A', 'B', 'C'];

/**
 * §13.7 / ADR 0009: the faction's three orders for a City Day, deterministically: slot A
 * `A[i mod |A|]`, B `B[i mod |B|]`, C `C[i mod |C|]` with i = City Days since 2026-01-01.
 * `templates` are one faction's, in file order.
 */
export function ordersForDay(templates: readonly OrderTemplate[], day: DayKey): OrderTemplate[] {
  const i = cityDayIndex(day);
  const picked: OrderTemplate[] = [];
  for (const slot of SLOTS) {
    // Crisis templates (Restore the base) never enter the rotation (slice-3 tech design §4.1).
    const inSlot = templates.filter((t) => t.slot === slot && (t.use ?? 'rotation') === 'rotation');
    if (inSlot.length > 0) picked.push(inSlot[mod(i, inSlot.length)]!);
  }
  return picked;
}

/**
 * A fresh day's orders; the variant and target are frozen now (no job → "Take a job"). With
 * `welcome` (a character's first City Day, ADR 0012) the three items are those templates, in slot
 * order A, B, C, instead of the rotation. With `crisis` (the home city in Unrest, GDD §14.11) the
 * pair replaces slots A and B; the welcome set wins over it on a first City Day.
 */
export function startOrders(
  templates: readonly OrderTemplate[],
  day: DayKey,
  hasJob: boolean,
  welcome?: readonly [string, string, string],
  crisis?: readonly [string, string],
): OrdersState {
  const byId = (kind: string) => (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) throw new Error(`${kind} order "${id}" is not one of this faction's templates`);
    return t;
  };
  let picked: OrderTemplate[];
  if (welcome) picked = welcome.map(byId('welcome'));
  else {
    picked = ordersForDay(templates, day);
    if (crisis) {
      const [a, b] = crisis.map(byId('crisis'));
      picked = [a!, b!, ...picked.filter((t) => t.slot !== 'A' && t.slot !== 'B')];
    }
  }
  return {
    day,
    items: picked.map((t) => {
      const variant = t.noJob && !hasJob ? 'noJob' : 'main';
      return {
        templateId: t.id,
        variant,
        target: variant === 'noJob' ? t.noJob!.target : t.target,
        progress: 0,
        doneAt: null,
      };
    }),
    allDoneAt: null,
  };
}

export function orderMatches(m: OrderMatch, a: ActionDescriptor, homeCityId: string): boolean {
  if (m.kinds && !m.kinds.includes(a.kind)) return false;
  if (m.actionTypes && (a.type === undefined || !m.actionTypes.includes(a.type))) return false;
  if (m.actionIds && (a.actionId === undefined || !m.actionIds.includes(a.actionId))) return false;
  if (m.locationIds && (a.locationId === undefined || !m.locationIds.includes(a.locationId))) return false;
  if (m.cityId !== undefined) {
    const city = m.cityId === 'home' ? homeCityId : m.cityId;
    if (a.cityId !== city) return false;
  }
  return true;
}

/** The title, line and match rule an item is using (its frozen variant). */
export function itemSpec(item: OrderItem, t: OrderTemplate) {
  return item.variant === 'noJob' && t.noJob
    ? { title: t.noJob.title, line: t.noJob.line, match: t.noJob.match, counts: 'attempts' as const }
    : { title: t.title, line: t.line, match: t.match, counts: t.counts };
}

/** The first open item this row would advance, if any (successes-only items only on Success). */
export function findAdvancingItem(
  o: OrdersState,
  templates: readonly OrderTemplate[],
  a: ActionDescriptor,
  outcome: Outcome,
  homeCityId: string,
): number {
  return o.items.findIndex((item) => {
    if (item.doneAt !== null) return false;
    const t = templates.find((x) => x.id === item.templateId);
    if (!t) return false;
    const spec = itemSpec(item, t);
    if (spec.counts === 'successes' && outcome !== 'success') return false;
    return orderMatches(spec.match, a, homeCityId);
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
  homeCityId: string,
  now: number,
): AdvanceResult {
  const idx = findAdvancingItem(o, templates, a, outcome, homeCityId);
  if (idx < 0) return { orders: o, advanced: null, completed: null, allDone: false };
  const items = o.items.map((x) => ({ ...x }));
  const item = items[idx]!;
  item.progress += 1;
  const completed = item.progress >= item.target;
  if (completed) item.doneAt = now;
  const everyDone = items.length > 0 && items.every((x) => x.doneAt !== null);
  const allDone = completed && everyDone && o.allDoneAt === null;
  return {
    orders: { day: o.day, items, allDoneAt: allDone ? now : o.allDoneAt },
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
