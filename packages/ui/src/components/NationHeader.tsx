import type { AssetView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { Picture } from './Picture';
import { Stamp } from './Stamp';
import type { StampTone } from './Stamp';

export interface NationHeaderProps {
  /** The scene (the chamber, the study, election night); absent: an ink band (the art not loaded yet). */
  asset?: AssetView | null;
  /** Oswald caps over the gradient: *PARLIAMENT · THE CHAMBER*. */
  kicker: string;
  /** Playfair under the kicker. */
  title?: string;
  /** Courier under the title. */
  line?: ReactNode;
  /** A resolved state's stamp over the picture (*Passed*, *To be confirmed*). */
  stamp?: { label: string; tone: StampTone } | null;
  /** Under the line, on the picture (the holder's avatar row, a back link). */
  children?: ReactNode;
  className?: string;
  testId?: string;
}

/**
 * Slice 7 (screens §4, §6.1, §7): the office pages', the chamber's and the elections' header, a scene
 * edge to edge at 150 px on a phone and 180 px from 640 px, an ink gradient over the bottom, and the
 * kicker, the title and a Courier line over it. A stamp sits over the picture's right half when a bill
 * or a result is resolved.
 */
export function NationHeader({ asset, kicker, title, line, stamp, children, className, testId }: NationHeaderProps) {
  return (
    <header
      className={cx('relative min-h-[150px] shrink-0 overflow-hidden bg-ink text-paper sm:min-h-[180px]', className)}
      data-testid={testId ?? 'nation-header'}
      data-art={asset?.id}
    >
      {asset && (
        <Picture
          asset={asset}
          sizes="640px"
          decorative
          loading="eager"
          className="absolute inset-0 size-full object-cover opacity-80"
        />
      )}
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.95)_0%,rgb(21_24_26/0.55)_55%,rgb(21_24_26/0.1)_100%)]"
        aria-hidden="true"
      />
      {stamp && (
        <div className="absolute top-3 right-3 rotate-[-6deg]" data-testid="nation-stamp">
          <Stamp tone={stamp.tone} label={stamp.label} className="px-3 text-[18px]" animate={false} />
        </div>
      )}
      <div className="relative flex min-h-[150px] flex-col justify-end gap-1 px-4 pt-6 pb-3 sm:min-h-[180px]">
        <span className="label-caps text-[10px] text-dim" data-testid="nation-kicker">
          {kicker}
        </span>
        {title && <h1 className="font-display text-[24px] leading-tight font-black">{title}</h1>}
        {line && (
          <p className="font-mono text-[11.5px] leading-snug text-dim" data-testid="nation-line">
            {line}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}

/** A kicker with the double rule under it (the paper's section heads), for the nation's pages. */
export function SectionKicker({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="label-caps border-b-[3px] border-double border-ink pb-1 text-[11px] text-ink">
      {children}
    </h2>
  );
}

/** A `JobsCard`-style card: a ruled box on paper-card with a kicker, lines and an optional button. */
export function PowerCard({
  kicker,
  children,
  testId,
  className,
}: {
  kicker: string;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <section
      className={cx('flex flex-col gap-1.5 border-[1.5px] border-ink bg-paper-card px-3 py-2.5', className)}
      data-testid={testId}
    >
      <span className="label-caps text-[10px] text-muted">{kicker}</span>
      {children}
    </section>
  );
}
