import { copy } from '@irongate/content/copy';
import { cx } from '../format';
import { Stamp } from './Stamp';

/**
 * Slice 7 (screens §9.1, §9.3): the names on a petition, *{n} of {needed} residents*, as a bar in the
 * failure colour; closed, the stamp *Dissolved* / *Fell short* over it.
 */
export function SignatureBar({
  count,
  needed,
  text,
  stamp,
}: {
  count: number;
  needed: number;
  /** *3 of 4 residents*. */
  text: string;
  stamp?: 'dissolved' | 'fellShort' | null;
}) {
  const pct = needed > 0 ? Math.min(100, (count / needed) * 100) : 0;
  return (
    <div className="relative flex flex-col gap-1" data-testid="signature-bar" data-count={count} data-needed={needed}>
      <span className="font-mono text-[13px] font-bold">{text}</span>
      <div
        role="progressbar"
        aria-label={text}
        aria-valuemin={0}
        aria-valuemax={needed}
        aria-valuenow={Math.min(count, needed)}
        className="h-3 w-full border border-ink bg-paper-card"
      >
        <div className={cx('h-full bg-failure')} style={{ width: `${pct}%` }} />
      </div>
      {stamp && (
        <div className="absolute inset-0 flex items-center justify-center" data-testid="petition-stamp">
          <Stamp
            tone={stamp === 'dissolved' ? 'failure' : 'partial'}
            label={stamp === 'dissolved' ? copy.nation.petition.dissolved : copy.nation.petition.fellShort}
            animate={false}
            className="px-3 text-[16px]"
          />
        </div>
      )}
    </div>
  );
}
