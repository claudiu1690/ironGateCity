import { copy } from '@irongate/content/copy';
import type { CheckBreakdown, Outcome } from '@irongate/rules';

/**
 * Review 2 (GDD §8.4, `review-2-answers.md` §2): the odds a player reads are a word, and a result
 * that isn't a Success says why in one plain line. These word the numbers the server decided (the
 * breakdown it sent); they compute no outcome, and no string they return holds a digit.
 */

type StatId = 'str' | 'int' | 'agi' | 'cha';
/** "Intelligence". */
export const statName = (s: string): string => copy.statNames[s as StatId] ?? s;

export type OddsBand = 'good' | 'fair' | 'long';

/** Good odds 70 % and above, Fair odds 50–69 %, Long shot under 50 % (answers §2.2). */
export function oddsBand(chance: number): OddsBand {
  return chance >= 70 ? 'good' : chance >= 50 ? 'fair' : 'long';
}

/** The ticket's stat words: "Intelligence", "Charisma and Intelligence", "your best, Strength". */
export function statLine(check: Pick<CheckBreakdown, 'stats' | 'best'>): string {
  if (check.best) return copy.odds.statBest(statName(check.stats[0]));
  return copy.odds.statLine(check.stats.map(statName));
}

/** "Good odds · Intelligence" (before the tap). */
export function ticketOdds(check: CheckBreakdown): string {
  return copy.odds.ticket(copy.odds.band(check.chance), statLine(check));
}

/** The band's two-line note behind the tap: [kicker, note]. */
export function bandNote(check: CheckBreakdown): [string, string] {
  const stat = check.best ? statName(check.stats[0]) : copy.odds.statLine(check.stats.map(statName));
  return copy.odds.note[oddsBand(check.chance)](stat) as [string, string];
}

/** A check bonus as a tag's words: "First day in Duskwall · better odds". */
export function oddsTag(b: { label: string; value: number }): string {
  return `${b.label} · ${b.value >= 0 ? copy.odds.betterOdds : copy.odds.worseOdds}`;
}

/** Where to train each stat in the residence city ("the Union Hall"), for the reason line. */
export type TrainingPlaces = Partial<Record<'str' | 'int' | 'agi', string>>;

/** Why a check came off short, as a cause (for grouping) and the sentence (answers §2.4). */
export interface Reason {
  cause: string;
  text: string;
}

/**
 * The one reason under a row that isn't a Success, chosen by the largest thing that went against
 * the player: a stat under what the job needs (with odds under 60 %), a penalty larger than that,
 * else luck (good odds) or middling odds. A tier 2–3 Failure starts "It went badly."
 */
export function reasonFor(
  check: CheckBreakdown,
  outcome: Outcome,
  places: TrainingPlaces = {},
): Reason | null {
  if (outcome === 'success') return null;
  const place = (s: string) => places[s as keyof TrainingPlaces] ?? null;
  let cause: string;
  let text: string;
  const penalties = check.bonuses.filter((b) => b.value < 0).sort((a, b) => a.value - b.value);
  const worst = penalties[0];
  const statDrag = Math.min(0, check.statTerm);
  const low = check.chance < 60;
  if (low && worst && -worst.value > -statDrag && copy.reason.penalty[worst.id]) {
    cause = `penalty:${worst.id}`;
    text = copy.reason.penalty[worst.id]!;
  } else if (low && check.statValue < check.difficulty) {
    if (check.best) {
      cause = 'statLowBest';
      text = copy.reason.statLowBest(statName(check.stats[0]));
    } else if (check.stats.length === 2) {
      const [a, b] = check.stats;
      const weak = (check.statValues[1] ?? 0) < (check.statValues[0] ?? 0) ? b! : a;
      cause = `statLowTwo:${weak}`;
      text = copy.reason.statLowTwo(statName(a), statName(b!), statName(weak), place(weak));
    } else if (check.stats[0] === 'cha') {
      cause = 'statLowCha';
      text = copy.reason.statLowCha;
    } else {
      cause = `statLow:${check.stats[0]}`;
      text = copy.reason.statLow(statName(check.stats[0]), place(check.stats[0]));
    }
  } else if (check.chance >= 70) {
    cause = 'luckGood';
    text = copy.reason.luckGood;
  } else {
    cause = 'luckFair';
    text = copy.reason.luckFair;
  }
  return outcome === 'failure'
    ? { cause: `failure:${cause}`, text: copy.reason.failure(text) }
    : { cause, text };
}

/**
 * The reasons for a batch (answers §2.3): rows sharing a cause print it once under the section
 * ("2 of 3 didn't come off. …"), a cause of its own prints under its row.
 */
export function batchReasons(
  attempts: ReadonlyArray<{ index: number; check: CheckBreakdown; outcome: Outcome }>,
  places: TrainingPlaces = {},
): { byRow: Map<number, string>; shared: string | null } {
  const reasons = attempts.map((a) => ({ index: a.index, r: reasonFor(a.check, a.outcome, places) }));
  const counts = new Map<string, number>();
  for (const { r } of reasons) if (r) counts.set(r.cause, (counts.get(r.cause) ?? 0) + 1);
  let sharedCause: string | null = null;
  for (const [cause, n] of counts) if (n >= 2 && attempts.length > 1) sharedCause = cause;
  const byRow = new Map<number, string>();
  let shared: string | null = null;
  for (const { index, r } of reasons) {
    if (!r) continue;
    if (r.cause === sharedCause) {
      const n = counts.get(r.cause)!;
      shared = copy.reason.batch(String(n), String(attempts.length), r.text);
    } else byRow.set(index, r.text);
  }
  return { byRow, shared };
}
