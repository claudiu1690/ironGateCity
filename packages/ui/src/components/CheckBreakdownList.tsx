import type { CheckBreakdown } from '@irongate/rules';
import { ledger } from '../odds';

/**
 * §8.4 (review 1): the ledger behind a tap on the odds, in words (*Even odds · 50 %*, *INT 5, 3 below
 * the 8 needed, 4 % a point · −12 %*, each bonus, *Chance · 38 %*), with the fixed footnote.
 */
export function CheckBreakdownList({ check, id }: { check: CheckBreakdown; id?: string }) {
  const l = ledger(check);
  return (
    <div id={id} className="flex flex-col gap-1.5">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 font-mono text-[12px] text-text-2">
        {l.rows.map((r, i) => (
          <FragmentRow key={i} label={r.label} value={r.value} />
        ))}
        <dt className="border-t border-dotted border-faint pt-0.5 font-bold">{l.total.label}</dt>
        <dd className="border-t border-dotted border-faint pt-0.5 text-right font-bold">{l.total.value}</dd>
      </dl>
      <p className="font-body text-[12px] leading-snug text-muted" data-testid="ledger-note">
        {l.note}
      </p>
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </>
  );
}
