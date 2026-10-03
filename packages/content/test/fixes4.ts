/**
 * The slice-4 fix round (docs/design/slice-4-fixes.md §2, QA m1): the overlay the content tests apply
 * to the earlier order tables, read from the designer's note: the nine slot-C templates' titles and
 * lines with `{city}` and `{verbs}`, resolved at read for the reader's residence.
 */
import FIXES from '../../../docs/design/slice-4-fixes.md?raw';

/** §2's table: title and line by template id. */
export const FIX4_ORDERS: ReadonlyMap<string, { title: string; line: string }> = new Map(
  FIXES.slice(FIXES.indexOf('## 2. m1'), FIXES.indexOf('## 3. m2'))
    .split('\n')
    .filter((l) => /^\| `dir\./.test(l))
    .map((l) => {
      const c = l
        .split('|')
        .slice(1, -1)
        .map((x) => x.trim());
      const tick = (s: string) => s.match(/`([^`]+)`/)![1]!;
      return [tick(c[0]!), { title: tick(c[1]!), line: tick(c[2]!) }] as const;
    }),
);
