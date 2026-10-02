/**
 * Review 3 (docs/design/review-3-answers.md): the overlay the content tests apply to the earlier
 * design tables, read from the answers themselves: §7's training-order titles (*Study, lift or run
 * once in Coalport*) and §5.3's table of the nine training verbs.
 */
import R3 from '../../../docs/design/review-3-answers.md?raw';

/** §7 `orders:` — the training orders' new titles by template id. */
export const R3_ORDER_TITLES: ReadonlyMap<string, string> = new Map(
  [...(R3.match(/^orders: (.+)$/m)?.[1] ?? '').matchAll(/(dir\.[a-z.-]+) '([^']+)'/g)].map((m) => [
    m[1]!,
    m[2]!,
  ]),
);

/** §5.3 — `[id, title, verb]` for the nine training actions. */
export const R3_VERBS: ReadonlyArray<readonly [string, string, string]> = R3.slice(
  R3.indexOf('### 5.3'),
  R3.indexOf('### 5.4'),
)
  .split('\n')
  .filter((l) => /^\| [A-Z][a-z]+ \| `/.test(l))
  .map((l) => {
    const c = l
      .split('|')
      .slice(1, -1)
      .map((x) => x.trim());
    return [
      c[1]!.match(/`([^`]+)`/)![1]!,
      c[2]!.replace(/ \(unchanged\)$/, ''),
      c[3]!.replace(/\*/g, ''),
    ] as const;
  });
