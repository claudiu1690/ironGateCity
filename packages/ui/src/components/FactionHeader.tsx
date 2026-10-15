import type { AssetView, FactionId } from '@irongate/rules';
import { cx } from '../format';
import { Picture, artUrl } from './Picture';

export interface FactionHeaderProps {
  factionId: FactionId;
  /** The faction's display name (the crest's accessible name too). */
  name: string;
  /** The faction's HQ scene; null: the plate is plain ink. */
  plate: AssetView | null;
  /** The plate's caps line: *Coalport branch · 9 here now*. */
  plateLine?: string;
  /** The letterhead's Courier line: *Organiser · 9 members*. */
  line?: string;
  /** Chat on a phone: the plate and letterhead fold to the 52 px compact letterhead. */
  compact?: boolean;
}

/** The seal's edge, in the crest's own shape: a 2 px paper edge, a 1 px ink keyline and a soft shadow. */
const SEAL_FILTER = 'faction-seal';

function SealFilter() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute" focusable="false">
      <filter id={SEAL_FILTER} x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="outer" />
        <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="inner" />
        <feGaussianBlur in="outer" stdDeviation="3" result="blur" />
        <feOffset in="blur" dy="3" result="drop" />
        <feFlood floodColor="#15181a" floodOpacity="0.35" />
        <feComposite in2="drop" operator="in" result="shadow" />
        <feFlood floodColor="#15181a" />
        <feComposite in2="outer" operator="in" result="keyline" />
        <feFlood floodColor="#efe6d2" />
        <feComposite in2="inner" operator="in" result="edge" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="keyline" />
          <feMergeNode in="edge" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </svg>
  );
}

/**
 * Review 7 #1, direction A (*The Branch Office*; screens §2): the Faction tab's header. The HQ scene
 * as a lithograph plate (128 px; 180 px from 1024 px) with one caps line on an ink scrim; the real
 * crest SVG (64 px; 80 px) as a seal over the plate's bottom edge, in its own shape; the name in
 * Playfair and the Courier line on paper beneath. On Chat (phone) and on a phone held sideways the
 * plate is dropped and the header is one 52 px compact letterhead.
 */
export function FactionHeader({ factionId, name, plate, plateLine, line, compact = false }: FactionHeaderProps) {
  const crest = artUrl(`crest.${factionId}`, 0, 'svg');
  return (
    <header className="relative shrink-0 bg-paper text-ink" data-testid="faction-header" data-compact={compact ? 'true' : 'false'}>
      <SealFilter />
      {!compact && (
        <div className="short:hidden" data-testid="faction-letterhead">
          <div className="relative h-32 overflow-hidden border-b border-ink bg-ink lg:h-[180px]" data-testid="faction-plate">
            {plate && (
              <Picture
                asset={plate}
                decorative
                loading="eager"
                sizes="(min-width: 1024px) 1000px, 100vw"
                className="block size-full object-cover opacity-[0.92]"
                style={{ objectPosition: '50% 40%' }}
              />
            )}
            {/* The scrim: ink from 90 % at the foot to clear at 55 %, so the caps line reads at the window. */}
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/60 via-25% to-ink/0 to-55%" />
            {plateLine && (
              <p
                className="label-caps absolute right-4 bottom-2 left-[92px] truncate text-[10px] text-paper lg:bottom-2.5 lg:left-[124px] lg:text-[11px]"
                data-testid="faction-plate-line"
              >
                {plateLine}
              </p>
            )}
          </div>
          <div className="relative flex h-[52px] items-center border-b border-ink pr-4 pl-[92px] lg:h-14 lg:pl-[124px]">
            <img
              src={crest}
              alt={name}
              width={64}
              height={64}
              className="absolute -top-[34px] left-4 z-[2] size-16 lg:-top-[42px] lg:left-6 lg:size-20"
              style={{ filter: `url(#${SEAL_FILTER})` }}
              data-testid="faction-crest"
            />
            <div className="min-w-0">
              <h1 className="truncate font-display text-[22px] leading-none font-bold lg:text-[26px]" data-testid="faction-name">
                {name}
              </h1>
              {line && (
                <p className="mt-1 truncate font-mono text-[12px] text-muted" data-testid="faction-header-line">
                  {line}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* The compact letterhead: Chat on a phone, and every part on a phone held sideways. */}
      <div
        className={cx('h-[52px] items-center gap-2.5 border-b border-ink px-4', compact ? 'flex' : 'hidden short:flex')}
        data-testid="faction-letterhead-compact"
      >
        <img
          src={crest}
          alt={compact ? name : ''}
          width={32}
          height={32}
          className="size-8 shrink-0 drop-shadow-[0_1px_2px_rgb(0_0_0/0.3)]"
          data-testid={compact ? 'faction-crest' : undefined}
        />
        {compact ? (
          <h1 className="shrink-0 font-display text-[18px] leading-none font-bold whitespace-nowrap" data-testid="faction-name">
            {name}
          </h1>
        ) : (
          <p className="shrink-0 font-display text-[18px] leading-none font-bold whitespace-nowrap">{name}</p>
        )}
        {plateLine && (
          <p className="ml-auto min-w-0 text-right font-mono text-[11px] leading-tight text-muted" data-testid={compact ? 'faction-plate-line' : undefined}>
            {plateLine}
          </p>
        )}
      </div>
    </header>
  );
}
