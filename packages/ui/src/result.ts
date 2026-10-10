import type { ActionResult } from '@irongate/rules';
import { formatSigned } from './format';

/**
 * Review 5 (answers §17, §18 Q1–Q3; tech design §4.1): the compact result modal's pure halves. What
 * the server sends is unchanged; these decide which of its parts print by default and which wait
 * behind *Details ▾* or *n more ▾*.
 */

/** `batchReasons`' shape (odds.ts): one reason per row that wasn't a Success, or one shared line. */
export interface BatchReasons {
  byRow: ReadonlyMap<number, string>;
  shared: string | null;
}

/**
 * *How it went* (answers §17.2 item 3), printed only when it says something the stamp does not:
 * nothing on a ×1 Success (or a training result: the stamp and the trained stat say it); one italic
 * reason line on a ×1 Partial or Failure; one Courier line of the rows on a ×3, then the reason line
 * if any; the run-in's block as built.
 */
export type HowItWent =
  | { kind: 'none' }
  | { kind: 'reason'; text: string }
  | { kind: 'rows'; line: string; reason: string | null }
  | { kind: 'runIn' };

const OUTCOME = { success: 'Success', partial: 'Partial', failure: 'Failure' } as const;

export function howItWent(r: Pick<ActionResult, 'attempts' | 'street'>, reasons: BatchReasons): HowItWent {
  if (r.street?.runIn) return { kind: 'runIn' };
  const a = r.attempts;
  if (a.length === 0) return { kind: 'none' };
  if (a.length === 1) {
    if (a[0]!.outcome === 'success') return { kind: 'none' };
    const text = reasons.byRow.get(a[0]!.index) ?? reasons.shared;
    return text ? { kind: 'reason', text } : { kind: 'none' };
  }
  const line = a
    .map((x) => `${x.index} · ${OUTCOME[x.outcome]} · ${formatSigned(x.rewards.xp.total)}`)
    .join(' · ');
  return { kind: 'rows', line, reason: rowsReason(r.attempts, reasons) };
}

/** A ×3's one printed reason: the shared line, else the first row's own (the rest wait in *Details*). */
export function rowsReason(attempts: ReadonlyArray<{ index: number }>, reasons: BatchReasons): string | null {
  if (reasons.shared) return reasons.shared;
  for (const a of attempts) {
    const t = reasons.byRow.get(a.index);
    if (t) return t;
  }
  return null;
}

/**
 * How many whole tags fit on one line of `available` px (answers §17.2 item 4): every tag when they
 * all fit; otherwise the most that fit with room left for *· +n more* (`more(n)` is that ending's
 * width, `sep` the *·* between two tags). Zero when not even the first fits beside its *+n more*.
 */
export function fitTagCount(
  widths: readonly number[],
  available: number,
  sep: number,
  more: (n: number) => number,
): number {
  const n = widths.length;
  const run = (k: number) => widths.slice(0, k).reduce((t, w) => t + w, 0) + sep * Math.max(0, k - 1);
  if (run(n) <= available) return n;
  for (let k = n - 1; k >= 1; k--) if (run(k) + sep + more(n - k) <= available) return k;
  return 0;
}

export type KnockOnKey =
  | 'placeIt'
  | 'card'
  | 'heat'
  | 'order'
  | 'issue'
  | 'ledger'
  | 'hook'
  | 'energy'
  | 'firstMission'
  | 'record'
  | 'morale'
  | 'trained'
  | 'pc'
  | 'standing'
  | 'branch'
  | 'item';

/**
 * One knock-on line: its key (for the priority), whether it prints as a line or a card, and an `id`
 * the modal renders it by (`order:<id>`, `issue:<id>`, `hook:<n>`, …).
 */
export interface KnockOnLine {
  key: KnockOnKey;
  height: 'line' | 'card';
  id: string;
}

/** The first this many knock-ons print; the rest wait behind *n more ▾* (answers §17.2 item 6). */
export const KNOCK_ONS_SHOWN = 3;
/** QA m2 (answers §17.3): on a phone under 700 px tall, two. */
export const KNOCK_ONS_SHOWN_SHORT = 2;
/** The media query of a phone under 700 px tall (375 × 667, 360 × 640): the result's compact form. */
export const SHORT_SCREEN = '(max-height: 700px)';

/**
 * The priority (answers §17.2 item 6, settled in §18 Q3): a point to place; a rank-up, a Reputation
 * step or a first-time card; Heat with the record; the order's lines with *all three done* and the
 * morale crossing; Issue momentum; the branch's endorsement, PC and Reputation progress; the ledger;
 * the chapter hook; a trained stat; Energy and Rested; *Missions remember*. The item stays on the
 * receipt (Q2) and never comes here.
 */
const PRIORITY: readonly KnockOnKey[] = [
  'placeIt',
  'card',
  'heat',
  'record',
  'order',
  'morale',
  'issue',
  'branch',
  'pc',
  'standing',
  'ledger',
  'hook',
  'trained',
  'energy',
  'firstMission',
];

/** Every knock-on the result has, in the priority order; a *Trained* result puts its stat first. */
export function knockOnLines(r: ActionResult, o: { statPending: number }): KnockOnLine[] {
  const e = r.effects;
  const s = r.street ?? null;
  const out: KnockOnLine[] = [];
  const add = (key: KnockOnKey, id: string, height: KnockOnLine['height'] = 'line') =>
    out.push({ key, id, height });

  if (e.levelUp) add('placeIt', 'placeIt', o.statPending > 0 ? 'card' : 'line');
  if (e.standingUp) add('card', 'standing-card', 'card');
  if (e.rankUp) add('card', 'rank');
  const heat = s?.heat ?? e.heat ?? null;
  if (heat && heat.after !== heat.before) {
    add('heat', 'heat');
    if (heat.first && heat.state !== 'cool') add('card', 'heat-card', 'card');
  }
  const rec = s?.record ?? null;
  if (rec && rec.added > 0) {
    add('record', 'record');
    if (rec.escalated) add('record', 'record-escalated');
    if (rec.first && rec.after !== 'clean') add('card', 'record-card', 'card');
  }
  if (s?.ordersOff) add('order', 'orders-off');
  // The order's signed line or its progress (answers §17.2 item 6): a done order is its signed line.
  for (const x of e.orders) add('order', x.fxp > 0 ? `order-signed:${x.id}` : `order:${x.id}`);
  if (e.ordersAllDone) add('order', 'all-orders');
  if (e.morale) add('morale', 'morale');
  for (const x of e.issues ?? []) add('issue', `issue:${x.issueId}`);
  if (e.branchEndorsement) add('branch', 'branch');
  if (e.pc) add('pc', 'pc');
  if (e.standing) add('standing', 'standing');
  if (e.scoreboard) add('ledger', 'scoreboard');
  (e.hooks ?? []).forEach((_, i) => add('hook', `hook:${i}`));
  if (e.stat) add('trained', 'trained');
  const agi = s?.agility ?? null;
  if (agi && agi.quarters > 0 && !(e.stat && e.stat.stat === 'agi')) add('trained', 'agility');
  add('energy', 'energy');
  if (s?.remembered) add('firstMission', 'remembered');

  const rank = (l: KnockOnLine) =>
    r.stamp === 'trained' && l.key === 'trained' ? -1 : PRIORITY.indexOf(l.key);
  // A stable sort: lines of one key keep the order they were added in.
  return out
    .map((l, i) => ({ l, i }))
    .sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i)
    .map((x) => x.l);
}
