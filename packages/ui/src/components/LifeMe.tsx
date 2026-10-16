import { copy } from '@irongate/content/copy';
import type { HomeView, LegacyView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { Button } from './Button';
import { weekdayOf } from './Capital';
import { HelpButton, helpMark } from './Help';

/**
 * Slice 8 phase C, lane Q (screens §8.2, §9.2, §10, §16): the Me tab's lower blocks (Patrons, Where
 * you sleep, Legacy), each collapsed to its kicker and one line until tapped; and their bodies.
 */

/** A Me-tab block: a 44 px kicker row with its one line; a tap opens the body (the state is the caller's). */
export function MeBlock({
  title,
  line,
  open,
  onToggle,
  help,
  children,
  testId,
}: {
  title: string;
  line: ReactNode;
  open: boolean;
  onToggle: () => void;
  help?: ReactNode;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col border-[1.5px] border-ink bg-paper-card" data-testid={testId} data-open={open}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left"
        data-testid={`${testId}-toggle`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="label-caps text-[11px] font-semibold text-muted">{title}</span>
          <span className="truncate font-mono text-[12px] text-ink" data-testid={`${testId}-line`}>
            {line}
          </span>
        </span>
        <span aria-hidden="true" className={cx('font-label text-[16px] transition-transform', open && 'rotate-90')}>
          ›
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-dotted border-faint px-3 pt-2 pb-3">
          {help}
          {children}
        </div>
      )}
    </section>
  );
}

/** Screens §9.2: *Where you sleep*: the line, the flat's offer or the rent's two buttons. */
export function HomeCard({
  home,
  onBuy,
  onPay,
  pending,
  notice,
}: {
  home: HomeView;
  onBuy: () => void;
  onPay: (weeks: 1 | 4) => void;
  pending: 'buy' | 'week' | 'four' | null;
  notice?: string | null;
}) {
  const f = home.flat;
  return (
    <div className="flex flex-col gap-2" data-testid="home-card">
      <HelpButton notes={[copy.life.help.home()]} label="What a flat gives" className="self-start">
        <span
          className={cx('font-body text-[14px]', helpMark, f?.state === 'waiting' && 'text-failure')}
          data-testid={f && f.state !== 'waiting' ? 'home-paid' : 'home-line'}
        >
          {f && f.state !== 'waiting' ? copy.life.home.flatLine(f.cityName, weekdayOf(f.paidThrough)) : home.line}
        </span>
      </HelpButton>
      {f && f.livesIn && (
        <span className="font-mono text-[12px] text-muted" data-testid="home-elsewhere">
          {copy.life.home.elsewhere(f.cityName, f.livesIn)}
        </span>
      )}
      {!f && home.buy && (
        <>
          {home.buy.ok ? (
            <>
              <span className="font-mono text-[12px] text-text-2">{copy.life.home.flatGives(home.buy.city)}</span>
              <span className="font-mono text-[11.5px] text-muted">{copy.life.home.flatTerms}</span>
              <Button className="w-full" onClick={onBuy} pending={pending === 'buy'} data-testid="home-buy">
                {copy.life.home.flatOffer(home.buy.city)}
              </Button>
            </>
          ) : (
            <span className="font-mono text-[12px] text-muted" data-testid="home-buy-why">
              {home.buy.why === 'level'
                ? copy.life.home.flatFromLevel
                : home.buy.why === 'iron'
                  ? copy.life.wardrobe.needsIron(home.buy.cost)
                  : copy.life.errors.notResidence}
            </span>
          )}
        </>
      )}
      {f && (
        <>
          {f.state === 'waiting' && (
            <span className="font-mono text-[12px] text-failure" data-testid="home-waits">
              {copy.life.home.waits}
            </span>
          )}
          {!home.rent.ok.week && !home.rent.ok.four ? (
            <span className="font-mono text-[12px] text-muted" data-testid="home-paid-ahead">
              {copy.life.home.paidAhead}
            </span>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                disabled={!home.rent.ok.week || (pending !== null && pending !== 'week')}
                pending={pending === 'week'}
                onClick={() => onPay(1)}
                data-testid="home-pay-week"
              >
                {copy.life.home.payWeek}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={!home.rent.ok.four || (pending !== null && pending !== 'four')}
                pending={pending === 'four'}
                onClick={() => onPay(4)}
                data-testid="home-pay-four"
              >
                {copy.life.home.payFour}
              </Button>
            </div>
          )}
        </>
      )}
      {notice && (
        <p role="status" className="font-mono text-[12px] text-collective">
          {notice}
        </p>
      )}
    </div>
  );
}

/** "Thu 15 Oct", the entry's date (the day key's own calendar). */
function shortDate(day: number): string {
  const d = new Date(day * 86_400_000);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(',', '');
}

/** Screens §10: the figure, the entries (three, then *and n more*), the lasting perks. */
export function LegacyBlock({
  legacy,
  expanded,
  onExpand,
  onTake,
  pendingPerk,
  notice,
}: {
  legacy: LegacyView;
  expanded: boolean;
  onExpand: () => void;
  onTake: (perkId: LegacyView['perks'][number]['id']) => void;
  pendingPerk: string | null;
  notice?: string | null;
}) {
  const shown = expanded ? legacy.entries : legacy.entries.slice(0, 3);
  const more = legacy.entries.length - shown.length;
  return (
    <div className="flex flex-col gap-2" data-testid="legacy-block">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[22px] font-black" data-testid="legacy-total">
          {legacy.total}
        </span>
        <span className="font-mono text-[12px] text-muted" data-testid="legacy-to-spend">
          {copy.life.legacy.toSpend(legacy.toSpend)}
        </span>
      </div>
      {legacy.entries.length === 0 ? (
        <p className="font-body text-[14px] text-text-2" data-testid="legacy-empty">
          {copy.life.legacy.empty}
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((e, i) => (
            <li key={`${e.day}-${i}`} className="flex flex-col border-b border-dotted border-faint py-1.5" data-testid="legacy-entry">
              <span className="font-body text-[14px]">{e.words}</span>
              <span className="font-mono text-[11.5px] text-muted">
                {shortDate(e.day)} · +{e.points}
              </span>
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <button
          type="button"
          onClick={onExpand}
          className="label-caps min-h-11 cursor-pointer self-start text-[11px] text-petrol underline decoration-dotted underline-offset-2"
        >
          {copy.life.dossier.andMore(more)}
        </button>
      )}
      <h3 className="label-caps border-t border-ink pt-2 text-[11px] font-semibold text-muted">{copy.life.legacy.perksKicker}</h3>
      <ul className="flex flex-col" data-testid="perk-rows">
        {legacy.perks.map((p) => (
          <li key={p.id} className="flex flex-col gap-1 border-b border-dotted border-faint py-2" data-testid="perk-row" data-perk={p.id}>
            <span className="font-body text-[14px] font-semibold">{p.name}</span>
            <span className="font-mono text-[11.5px] text-text-2">{p.line}</span>
            {p.state === 'take' ? (
              <Button
                variant="outline"
                className="self-start"
                pending={pendingPerk === p.id}
                disabled={pendingPerk !== null && pendingPerk !== p.id}
                onClick={() => onTake(p.id)}
                data-testid="perk-take"
              >
                {copy.life.legacy.take(p.cost)}
                {p.max > 1 && p.taken > 0 ? ` · ${copy.life.legacy.takenOf(p.taken, p.max)}` : ''}
              </Button>
            ) : p.state === 'needs' ? (
              <span className="font-mono text-[12px] text-muted" data-testid="perk-needs">
                {copy.life.legacy.needs(p.cost)}
                {p.max > 1 && p.taken > 0 ? ` · ${copy.life.legacy.takenOf(p.taken, p.max)}` : ''}
              </span>
            ) : (
              <span className="font-mono text-[12px] text-success" data-testid="perk-taken">
                {p.max > 1 ? copy.life.legacy.takenOf(p.taken, p.max) : copy.life.legacy.taken}
              </span>
            )}
          </li>
        ))}
      </ul>
      {notice && (
        <p role="status" className="font-mono text-[12px] text-collective">
          {notice}
        </p>
      )}
    </div>
  );
}
