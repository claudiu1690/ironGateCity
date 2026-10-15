import { copy } from '@irongate/content/copy';
import { cx } from '@irongate/ui';
import { useNavigate } from '@tanstack/react-router';
import type { MouseEvent } from 'react';

/**
 * Slice 4 (tech design §12.1, screens §2.1): the Map tab's *City | Nation* control, two segments in
 * Oswald caps, 44 px tall. It floats on the map (a block its first view keeps the pins clear of)
 * rather than in a bar of its own, so the map keeps its height on a phone. Review 6 #2: it is placed by
 * its parent (a row it shares with *What's here* or *Cities*, with a gap), or by `className`.
 */
export function MapSwitch({
  active,
  cityHref,
  className,
}: {
  active: 'city' | 'nation';
  /** Where *City* goes: the city the character stands in (the capital: its last district). */
  cityHref: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const go = (href: string) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    void navigate({ to: href });
  };
  const seg = (on: boolean) =>
    cx(
      'label-caps flex min-h-11 min-w-[68px] items-center justify-center px-3 text-[11px] font-semibold',
      on ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-2',
    );
  return (
    <nav
      aria-label="Map"
      data-map-overlay="switch"
      data-testid="map-switch"
      className={cx(
        'pointer-events-auto flex shadow-[0_0_0_1px_var(--color-ink),0_4px_12px_rgb(0_0_0/0.4)]',
        className,
      )}
    >
      <a
        href={cityHref}
        onClick={go(cityHref)}
        className={seg(active === 'city')}
        aria-current={active === 'city' ? 'page' : undefined}
        data-testid="map-switch-city"
      >
        {copy.travel.city}
      </a>
      <a
        href="/nation"
        onClick={go('/nation')}
        className={seg(active === 'nation')}
        aria-current={active === 'nation' ? 'page' : undefined}
        data-testid="map-switch-nation"
      >
        {copy.travel.nation}
      </a>
    </nav>
  );
}
