import { copy } from '@irongate/content/copy';
import type { CheckBonus, CheckBreakdown, Outcome } from '@irongate/rules';
import { formatSigned } from './format';

/**
 * Review 1 (GDD §8.4, `review-1-answers.md` §4): the odds a person can read. These word the numbers
 * the server decided (the breakdown it sent); they compute no outcome.
 */

const NAME = (s: string) => s.toUpperCase();
/** A stat value as the maths used it: a two-stat average may be a half ("6.5"). */
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "3 below" / "4 above" / "level with". */
function rel(value: number, difficulty: number): string {
  const d = value - difficulty;
  if (d === 0) return 'level with';
  return `${num(Math.abs(d))} ${d > 0 ? 'above' : 'below'}`;
}

/** The ticket's stat line: "STR 11", "CHA 2 + INT 11", "your best, STR 13". */
export function statLine(check: CheckBreakdown): string {
  if (check.best) return copy.odds.ticketBest(NAME(check.stats[0]), check.statValues[0]!);
  return check.stats.map((s, i) => `${NAME(s)} ${check.statValues[i]}`).join(' + ');
}

/** "62 % · STR 11" (before the tap). */
export function ticketOdds(check: CheckBreakdown): string {
  return copy.odds.ticket(check.chance, statLine(check));
}

/** A bonus row in running text: "being Known here", "your first day in Duskwall", "Open Doors". */
function bonusPhrase(b: CheckBonus): string {
  if (b.id === 'standing') return `being ${b.label.split(' in ')[0]} here`;
  if (b.id === 'first-day') return `your ${b.label.charAt(0).toLowerCase()}${b.label.slice(1)}`;
  return b.label;
}

/**
 * The odds as one sentence: *Your INT 5 is 3 below the 8 this needs: 38 %.*; with bonuses
 * *…: 66 %, and +6 % for being Known here: 72 %.*; clamped *…: 98 %, capped at 95 %.*
 */
export function oddsSentence(check: CheckBreakdown): string {
  // A no-break space before "%", so a number and its sign never part at a line end.
  return words(check).replace(/ %/g, ' %');
}

function words(check: CheckBreakdown): string {
  const base = check.base + check.statTerm;
  const d = check.difficulty;
  const v = check.statValue;
  let head: string;
  if (check.best) {
    head = copy.odds.best(NAME(check.stats[0]), check.statValues[0]!, d, rel(v, d), base);
  } else if (check.stats.length === 2) {
    const [a, b] = check.stats;
    head = copy.odds.two(
      NAME(a),
      check.statValues[0]!,
      NAME(b!),
      check.statValues[1]!,
      num(v),
      d,
      rel(v, d),
      base,
    );
  } else if (v > d) {
    head = copy.odds.above(NAME(check.stats[0]), num(v), d, num(v - d), base);
  } else if (v < d) {
    head = copy.odds.below(NAME(check.stats[0]), num(v), d, num(d - v), base);
  } else {
    head = copy.odds.equal(NAME(check.stats[0]), num(v), d, base);
  }
  const plain = `${base} %.`;
  if (!head.endsWith(plain)) return head;
  let tail = plain;
  if (check.bonuses.length === 1) {
    const b = check.bonuses[0]!;
    tail = copy.odds.bonusOne(base, bonusPhrase(b), b.value, check.raw);
  } else if (check.bonuses.length > 1) {
    tail = copy.odds.bonusMany(base, check.bonusTotal, check.raw);
  }
  if (check.raw !== check.chance) {
    const end = `${check.raw} %.`;
    tail = `${tail.slice(0, tail.length - end.length)}${copy.odds.capped(check.raw, check.chance)}`;
  }
  return head.slice(0, head.length - plain.length) + tail;
}

const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

/**
 * The roll, one line: *Rolled 26: Success (38 or under).* · *Rolled 51: Partial (39 to 58).* ·
 * *Rolled 77: Partial (a canvass never fails).* · tiers 2–3: *Rolled 77: Failure (more than 20 over).*
 */
export function rollLine(i: {
  roll: number;
  chance: number;
  outcome: Outcome;
  tier: number;
  type: string;
}): string {
  if (i.outcome === 'success') return copy.odds.rollSuccess(i.roll, i.chance);
  if (i.outcome === 'failure') return copy.odds.rollFailure(i.roll);
  if (i.roll <= i.chance + 20) return copy.odds.rollPartial(i.roll, i.chance + 1, i.chance + 20);
  const what = i.type.toLowerCase();
  return copy.odds.rollPartialNoFail(i.roll, what).replace(`(a ${what} `, `(${article(what)} ${what} `);
}

/** The ledger behind the tap: [label, value] rows, the total, and the fixed footnote. */
export function ledger(check: CheckBreakdown): {
  rows: Array<{ label: string; value: string }>;
  total: { label: string; value: string };
  note: string;
} {
  const d = check.difficulty;
  const v = check.statValue;
  let statRow: string;
  if (check.best) statRow = copy.odds.ledgerBest(NAME(check.stats[0]), check.statValues[0]!, rel(v, d), d);
  else if (check.stats.length === 2) {
    const [a, b] = check.stats;
    statRow = copy.odds.ledgerTwo(
      NAME(a),
      check.statValues[0]!,
      NAME(b!),
      check.statValues[1]!,
      num(v),
      rel(v, d),
      d,
    );
  } else statRow = copy.odds.ledgerStat(NAME(check.stats[0]), num(v), rel(v, d), d);
  return {
    rows: [
      { label: copy.odds.ledgerEven, value: `${check.base} %` },
      { label: statRow, value: `${formatSigned(check.statTerm)} %` },
      ...check.bonuses.map((b) => ({ label: b.label, value: `${formatSigned(b.value)} %` })),
    ],
    total: {
      label: copy.odds.ledgerChance,
      value:
        check.raw !== check.chance
          ? `${check.chance} % (${copy.odds.ledgerCapped(check.raw)})`
          : `${check.chance} %`,
    },
    note: copy.odds.ledgerNote,
  };
}
