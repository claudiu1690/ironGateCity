import { copy } from '@irongate/content/copy';
import type { DailyTally, DeskView, OrdersView, PaperView } from '@irongate/rules';
import { cx, formatClock, formatNumber, formatOpinionDelta, plural } from '../format';
import { Picture } from './Picture';

/** The Today tally strip (§3.7): "Today: 30 Energy · 3 attempts · 2 wins · +135 XP · …". */
export function TodayStrip({
  today,
  label = 'Today',
  className,
}: {
  today: DailyTally;
  label?: string;
  className?: string;
}) {
  const parts = [
    `${today.energy} Energy`,
    plural(today.attempts, 'attempt'),
    plural(today.successes, 'win'),
    `+${formatNumber(today.xp)} XP`,
    `+${formatNumber(today.fxp)} FXP`,
    `${formatOpinionDelta(today.opinion)} opinion`,
  ];
  if (today.iron > 0) parts.push(`+${formatNumber(today.iron)} Iron`);
  if (today.shiftWorked) parts.push('shift worked');
  if (today.statTrained > 0) parts.push(`${today.statTrained} trained`);
  return (
    <p className={cx('font-label text-[12.5px] leading-snug', className)} data-testid="today-strip">
      <span className="label-caps mr-1.5 text-[10px]">{label}:</span>
      {parts.join(' · ')}
    </p>
  );
}

export interface OrdersListProps {
  orders: OrdersView;
  /** The paper shows the secretary's lines, portrait and signature; the city screen a compact list. */
  variant?: 'compact' | 'paper';
  className?: string;
  /** Slice 2: an open order with a pin links to it ("the map is never a puzzle"). */
  onPin?: (locationId: string) => void;
}

/** Today's Party orders (§13.7) with progress. */
export function OrdersList({ orders, variant = 'compact', className, onPin }: OrdersListProps) {
  const paper = variant === 'paper';
  return (
    <section aria-label="Party orders" className={cx('flex flex-col', className)} data-testid="orders">
      {paper && (
        <div className="label-caps flex justify-between border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
          <span>Party orders</span>
          <span className="font-normal">from {orders.issuer.name}</span>
        </div>
      )}
      {paper && (
        <div className="flex items-center gap-3 border-b border-dotted border-faint py-2">
          <Picture
            asset={orders.issuer.portrait}
            sizes="56px"
            className="size-14 shrink-0 rounded-full border-2 border-ink object-cover object-top"
          />
          <div className="flex flex-col">
            <span className="font-display text-[16px] font-bold">{orders.issuer.name}</span>
            <span className="font-mono text-[11px] text-muted">{orders.issuer.title}</span>
          </div>
        </div>
      )}
      <ul className="flex flex-col">
        {orders.items.map((o) => (
          <li
            key={o.id}
            className="flex flex-col gap-0.5 border-b border-dotted border-faint py-1.5"
            data-testid="order"
          >
            <div className="flex items-center justify-between gap-2.5">
              <span className="flex items-center gap-2 font-body text-[14px]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" />
                  {o.done && <path d="M7 12l3 3 7-7" />}
                </svg>
                {onPin && o.pin && !o.done ? (
                  <button
                    type="button"
                    onClick={() => onPin(o.pin!.locationId)}
                    className="-my-2 min-h-11 cursor-pointer text-left underline decoration-dotted underline-offset-2 hover:text-petrol"
                    data-testid="order-pin"
                    aria-label={`${o.title}: open pin ${o.pin.n}`}
                  >
                    {o.title}{' '}
                    <span className="font-label text-[11px] text-muted no-underline">· {o.pin.n}</span>
                  </button>
                ) : (
                  <span className={o.done ? 'line-through decoration-1' : undefined}>{o.title}</span>
                )}
                {o.done && <span className="sr-only">(done)</span>}
              </span>
              <span className="font-label text-[13px]">
                {o.progress} / {o.target}
              </span>
            </div>
            {paper && <span className="pl-6 font-body text-[13px] text-text-2 italic">{o.line}</span>}
          </li>
        ))}
      </ul>
      {orders.allDone && (
        <p className="pt-1.5 font-label text-[13px] text-petrol">
          {copy.allOrdersDone(orders.rewards.allDonePc)}
        </p>
      )}
      {paper && (
        <>
          <p className="pt-1.5 font-mono text-[11px] text-muted">
            +{orders.rewards.matchFxpBonusPct} % FXP on matching actions · +{orders.rewards.orderDoneFxp} FXP
            per order · +{orders.rewards.allDonePc} Political Capital for all three · new orders at{' '}
            {formatClock(orders.resetsAt)}
          </p>
          <p className="self-end pt-1 font-display text-[15px] italic">{orders.issuer.signature}</p>
        </>
      )}
    </section>
  );
}

/** The masthead (§3.3): name, edition line, dateline. */
export function Masthead({ paper }: { paper: Pick<PaperView, 'paper' | 'dateline'> }) {
  return (
    <header className="flex flex-col items-center gap-1.5 border-b-[3px] border-double border-ink pb-2">
      <div className="label-caps flex w-full justify-between text-[9px]">
        <span>Morning edition</span>
        <span>Price {paper.paper.price}</span>
      </div>
      <h1 className="text-center font-display text-[34px] leading-none font-black tracking-[-0.01em] sm:text-[40px]">
        {paper.paper.name}
      </h1>
      <p className="font-display text-[13px] italic text-text-2">{paper.paper.strapline}</p>
      <div
        className="flex w-full justify-center border-t border-ink pt-1 font-mono text-[11px]"
        data-testid="dateline"
      >
        {paper.dateline.weekday} · {paper.dateline.date} · {paper.dateline.city}
      </div>
    </header>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2.5 border-b border-dotted border-faint py-1.5 text-[14px]">
      <dt className="font-body">{label}</dt>
      <dd className={cx('text-right font-label', tone)}>{value}</dd>
    </div>
  );
}

/** Your desk (§3.3, tech design §10.3): frozen settlement rows plus live rows. */
export function DeskList({ desk }: { desk: DeskView }) {
  const y = desk.yesterday;
  return (
    <section aria-label="Your desk" className="flex flex-col">
      <div className="label-caps flex justify-between border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
        <span>Your desk</span>
        <span className="font-normal">since your last paper</span>
      </div>
      <dl data-testid="desk">
        <Row
          label={desk.salary ? `Salary, ${desk.salary.jobName} (half pay)` : 'Salary'}
          value={
            desk.salary
              ? `+${formatNumber(desk.salary.total)} Iron`
              : desk.jobName
                ? 'first half pay at midnight'
                : 'no job yet'
          }
        />
        <Row
          label="Rested, banked since last visit"
          value={`+${desk.restedBanked} · ${desk.rested.value} / ${desk.rested.cap}`}
          tone="text-petrol"
        />
        <Row
          label="Energy"
          value={`${desk.energy.value} / ${desk.energy.max}${desk.energy.fullAt ? ` · full at ${formatClock(desk.energy.fullAt)}` : ''}`}
        />
        {desk.workStreak && (
          <Row
            label="Work streak · sick days"
            value={`${plural(desk.workStreak.streak, 'day')} · ${desk.workStreak.sickDaysLeft} left`}
          />
        )}
        <Row
          label={`Level ${desk.level.level}`}
          value={`${formatNumber(desk.level.xpToNext)} XP to Level ${desk.level.next}${desk.level.statPointsPending > 0 ? ` · ${copy.pointsToPlace(desk.level.statPointsPending)}` : ''}`}
        />
        <Row
          label={`${desk.standing.cityName} standing`}
          value={
            desk.standing.next === null
              ? desk.standing.name
              : `${desk.standing.name} · ${desk.standing.successes} / ${desk.standing.next} to ${desk.standing.nextName}`
          }
        />
        {desk.wearing && <Row label="Wearing" value={`${desk.wearing.name} · CHA ${desk.wearing.cha}`} />}
        {y && (
          <Row
            label="Yesterday"
            value={`${y.energy} Energy · ${plural(y.successes, 'win')} · +${formatNumber(y.xp)} XP · ${y.ordersDone} / 3 orders`}
          />
        )}
      </dl>
    </section>
  );
}
