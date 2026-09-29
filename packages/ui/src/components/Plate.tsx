import type { ReactNode } from 'react';
import { cx } from '../format';

export interface PlateProps {
  title: string;
  kicker?: string;
  /** Heading level of the title. */
  as?: 'h1' | 'h2' | 'h3';
  children?: ReactNode;
  className?: string;
}

/** An enamel-sign heading: a dark plate with a paper keyline, for a city or a place. */
export function Plate({ title, kicker, as: Heading = 'h1', children, className }: PlateProps) {
  return (
    <header className={cx('bg-ink p-1 text-paper', className)}>
      <div className="flex flex-col gap-1 border border-paper/70 px-4 py-3">
        {kicker && <span className="label-caps text-[10px] text-dim">{kicker}</span>}
        <Heading className="font-display text-[28px] leading-none font-black">{title}</Heading>
        {children}
      </div>
    </header>
  );
}
