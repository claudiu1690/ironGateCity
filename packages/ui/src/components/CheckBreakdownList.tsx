import type { CheckBreakdown } from '@irongate/rules';
import { formatSigned } from '../format';

/** §8.4: "tapping the percentage shows the breakdown: stat, difficulty, and each bonus". */
export function CheckBreakdownList({ check, id }: { check: CheckBreakdown; id?: string }) {
  const names = check.stats.map((s) => s.toUpperCase());
  // Two-stat checks show both stats and the average (§8.4).
  const stat =
    names.length === 1
      ? `${names[0]} ${check.statValue}`
      : `${names.map((n, i) => `${n} ${check.statValues[i]}`).join(' + ')} → ${check.statValue}`;
  return (
    <dl id={id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 font-mono text-[12px] text-text-2">
      <dt>Base</dt>
      <dd className="text-right">{check.base} %</dd>
      <dt>
        {stat} vs difficulty {check.difficulty} (×4)
      </dt>
      <dd className="text-right">{formatSigned(check.statTerm)} %</dd>
      {check.bonuses.map((b) => (
        <FragmentRow key={b.id} label={b.label} value={`${formatSigned(b.value)} %`} />
      ))}
      <dt className="border-t border-dotted border-faint pt-0.5 font-bold">Chance</dt>
      <dd className="border-t border-dotted border-faint pt-0.5 text-right font-bold">
        {check.chance} %{check.raw !== check.chance ? ` (${check.raw} capped)` : ''}
      </dd>
    </dl>
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
