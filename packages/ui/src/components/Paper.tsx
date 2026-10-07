import { copy } from '@irongate/content/copy';
import { WEEKDAY_NAMES, weekday } from '@irongate/rules';
import type { DailyTally, DeskView, OrdersView, PaperView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock, formatNumber, formatOpinionDelta, formatWhen, nextDayTurn, plural } from '../format';
import { HelpButton, helpMark } from './Help';
import type { HelpNote } from './Help';
import { Picture } from './Picture';

/**
 * The Today tally strip (§3.7): "Today: 30 Energy · 3 attempts · 2 wins · +135 XP · …". Review 1
 * (answers §5): with `help`, the label and each item are dotted-underlined and the strip is one
 * tap target whose sheet explains each of them.
 */
export function TodayStrip({
  today,
  label = 'Today',
  className,
  help,
}: {
  today: DailyTally;
  label?: string;
  className?: string;
  /** The city (the opinion note) and when the day turns (the Today note). */
  help?: { cityName: string; turnsAt: number };
}) {
  const h = copy.help;
  const parts: Array<[string, HelpNote]> = [
    [`${today.energy} Energy`, h.todayEnergy() as HelpNote],
    [plural(today.attempts, 'attempt'), h.todayAttempts() as HelpNote],
    [plural(today.successes, 'win'), h.todayWins() as HelpNote],
    [`+${formatNumber(today.xp)} XP`, h.todayXp() as HelpNote],
    [`+${formatNumber(today.fxp)} Party XP`, h.todayFxp() as HelpNote],
    [`${formatOpinionDelta(today.opinion)} opinion`, h.todayOpinion(help?.cityName ?? '') as HelpNote],
  ];
  if (today.iron > 0) parts.push([`+${formatNumber(today.iron)} Iron`, h.todayIron() as HelpNote]);
  if (today.ordersDone > 0) parts.push([`${today.ordersDone} / 3 orders`, h.todayOrders() as HelpNote]);
  if (today.statTrained > 0) parts.push([`${today.statTrained} trained`, h.todayTrained() as HelpNote]);
  const body = (
    <>
      <span className={cx('label-caps mr-1.5 text-[10px]', help && helpMark)}>{label}:</span>
      {parts.map(([text], i) => (
        <span key={text}>
          {i > 0 && ' · '}
          <span className={help ? helpMark : undefined}>{text}</span>
        </span>
      ))}
    </>
  );
  if (!help) {
    return (
      <p className={cx('font-label text-[12.5px] leading-snug', className)} data-testid="today-strip">
        {body}
      </p>
    );
  }
  return (
    <HelpButton
      notes={[h.today(formatClock(help.turnsAt)) as HelpNote, ...parts.map(([, n]) => n)]}
      label="What today's numbers mean"
      testId="today-help"
      className={cx('block w-full font-label text-[12.5px] leading-snug', className)}
    >
      <span data-testid="today-strip">{body}</span>
    </HelpButton>
  );
}

export interface OrdersListProps {
  orders: OrdersView;
  /** The paper shows the secretary's lines, portrait and signature; the city screen a compact list. */
  variant?: 'compact' | 'paper';
  className?: string;
  /**
   * Slice 2: an open order with a pin links to it ("the map is never a puzzle"); review 1: the
   * order's id travels too, so the pin's sheet marks the matching tickets.
   */
  onPin?: (locationId: string, orderId: string) => void;
}

/**
 * Today's Party orders (§13.7) with progress. Review 4 #13 (answers §13): away from home the panel is
 * one quiet line, 36 px, not tappable, no chevron: *Your orders are in Coalport · 1 of 3 done*. The
 * paper keeps the full list.
 */
export function OrdersList({ orders, variant = 'compact', className, onPin }: OrdersListProps) {
  const paper = variant === 'paper';
  // Review 4 #20 (answers §20.1): an arrest today took the orders off; the panel is one quiet line
  // (it wins over *away*: nothing is to be done anywhere until the day turns).
  if (orders.off && !paper) {
    return (
      <section aria-label="Party orders" className={cx('flex flex-col', className)} data-testid="orders">
        <p
          className="flex h-9 items-center truncate font-mono text-[12px] text-failure"
          data-testid="orders-off"
        >
          {copy.orders.off}
        </p>
      </section>
    );
  }
  if (orders.away && !paper) {
    return (
      <section aria-label="Party orders" className={cx('flex flex-col', className)} data-testid="orders">
        <p
          className="flex h-9 items-center truncate font-mono text-[12px] text-text-2"
          data-testid="orders-away"
        >
          {copy.orders.away(orders.away.cityName, orders.away.done, orders.away.of)}
        </p>
      </section>
    );
  }
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
      {paper && orders.off && (
        <p className="border-b border-dotted border-faint py-1.5 font-mono text-[12px] text-failure" data-testid="orders-off">
          {copy.orders.off}
        </p>
      )}
      <ul className="flex flex-col">
        {orders.items.map((o) => (
          <li
            key={o.id}
            className="flex flex-col gap-0.5 border-b border-dotted border-faint py-1.5"
            data-testid="order"
          >
            <div className="flex items-center justify-between gap-2.5">
              <span
                className={cx(
                  'flex min-w-0 items-center gap-2 font-body',
                  // Review 1: the titles say what and where, so they are longer: one line on a phone.
                  paper ? 'text-[14px]' : 'text-[13px] leading-tight sm:text-[14px]',
                )}
              >
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
                    onClick={() => onPin(o.pin!.locationId, o.id)}
                    className="-my-2 flex min-h-11 min-w-0 cursor-pointer items-center text-left underline decoration-dotted underline-offset-2 hover:text-petrol"
                    data-testid="order-pin"
                    aria-label={`${o.title}: open pin ${o.pin.n}`}
                  >
                    {/* A phone shorter than 700 px keeps each order to one line, so the map keeps its
                        pins apart (QA M2); the whole title is in the sheet's ticket tag and the label. */}
                    <span className="[@media(max-width:639px)_and_(max-height:700px)]:truncate">
                      {o.title}
                    </span>
                    <span className="font-label text-[11px] whitespace-nowrap text-muted no-underline">
                      {' '}
                      · {o.pin.n}
                    </span>
                  </button>
                ) : (
                  <span
                    className={cx(
                      '[@media(max-width:639px)_and_(max-height:700px)]:truncate',
                      o.done && 'line-through decoration-1',
                    )}
                  >
                    {o.title}
                  </span>
                )}
                {o.done && <span className="sr-only">(done)</span>}
              </span>
              <span className="shrink-0 font-label text-[13px] whitespace-nowrap">
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
            +{orders.rewards.matchFxpBonusPct} % Party XP on matching actions · +{orders.rewards.orderDoneFxp}{' '}
            Party XP per order · +{orders.rewards.allDonePc} Political Capital for all three · new orders{' '}
            {formatWhen(orders.resetsAt)}
          </p>
          <p className="self-end pt-1 font-display text-[15px] italic">{orders.issuer.signature}</p>
        </>
      )}
    </section>
  );
}

/**
 * The masthead (§3.3): name, edition line, dateline. Review 4 (answers §23.1, ADR 0074): away from
 * home, the local edition's line under the name in Courier (*The Coalport Clarion · Duskwall edition*),
 * dotted, opening its note; the dateline names the city the reader is in.
 */
export function Masthead({ paper }: { paper: Pick<PaperView, 'paper' | 'dateline'> & Partial<Pick<PaperView, 'edition'>> }) {
  return (
    <header className="flex flex-col items-center gap-1.5 border-b-[3px] border-double border-ink pb-2">
      <div className="label-caps flex w-full justify-between text-[9px]">
        <span>Morning edition</span>
        <span>Price {paper.paper.price}</span>
      </div>
      <h1 className="text-center font-display text-[34px] leading-none font-black tracking-[-0.01em] sm:text-[40px]">
        {paper.paper.name}
      </h1>
      {paper.edition && (
        <HelpButton notes={[copy.help.edition()]} label={copy.paper.editionLabel(paper.edition.cityName)} className="-my-1">
          <span className={cx('font-mono text-[12px] text-text-2', helpMark)} data-testid="edition-line">
            {copy.paper.edition(paper.edition.cityName)}
          </span>
        </HelpButton>
      )}
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

function Row({ label, value, tone, testId }: { label: string; value: string; tone?: string; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2.5 border-b border-dotted border-faint py-1.5 text-[14px]">
      <dt className="font-body">{label}</dt>
      <dd className={cx('text-right font-label', tone)} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

/** A full-width desk line (the wage, review 1). */
function Line({ children, testId, small }: { children: ReactNode; testId?: string; small?: boolean }) {
  return (
    <p
      className={cx(
        'border-b border-dotted border-faint py-1.5',
        small ? 'font-mono text-[12px] text-muted' : 'font-body text-[14px]',
      )}
      data-testid={testId}
    >
      {children}
    </p>
  );
}

/** Your desk (§3.3, tech design §10.3): frozen settlement rows plus live rows. */
export function DeskList({ desk, onHeld }: { desk: DeskView; onHeld?: () => void }) {
  const y = desk.yesterday;
  // Slice 5 (screens §2.5): the held line first while held (a tap goes to the cells or the ward).
  const held = desk.held ?? null;
  const heldLine = held
    ? held.kind === 'cells'
      ? copy.risk.desk.cells(held.placeName, formatWhen(held.until), held.bail ?? 0)
      : copy.risk.desk.infirmary(held.placeName, formatWhen(held.until))
    : null;
  return (
    <section aria-label="Your desk" className="flex flex-col">
      <div className="label-caps flex justify-between border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
        <span>Your desk</span>
        <span className="font-normal">since your last paper</span>
      </div>
      <dl data-testid="desk">
        {heldLine &&
          (onHeld ? (
            <button
              type="button"
              onClick={onHeld}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 border-b border-dotted border-faint text-left font-body text-[14px] text-failure hover:bg-paper-card"
              data-testid="desk-held"
            >
              <span>{heldLine}</span>
              <span aria-hidden="true" className="font-label text-[18px]">
                ›
              </span>
            </button>
          ) : (
            <Line testId="desk-held">{heldLine}</Line>
          ))}
        {/* Review 1 (§9.1): the wage row, with its seniority and ordinance lines. */}
        {desk.salary ? (
          <>
            <Line testId="desk-paid">
              {copy.deskPaid(
                desk.salary.total,
                desk.salary.jobName,
                desk.salary.seniority.days,
                desk.salary.seniority.pct,
              )}
            </Line>
            {(desk.salary.seniority.amount > 0 || desk.salary.ordinance || desk.salary.days > 1) && (
              <Line testId="desk-paid-lines" small>
                {[
                  `${plural(desk.salary.days, 'day')} × ${formatNumber(desk.salary.perDay)}`,
                  ...(desk.salary.seniority.amount > 0
                    ? [copy.seniorityLine(desk.salary.seniority.days, desk.salary.seniority.amount)]
                    : []),
                  ...(desk.salary.ordinance
                    ? [
                        `${desk.salary.ordinance.label} ${desk.salary.ordinance.amount >= 0 ? '+' : '−'}${formatNumber(Math.abs(desk.salary.ordinance.amount))}`,
                      ]
                    : []),
                ].join(' · ')}
              </Line>
            )}
          </>
        ) : desk.job ? (
          <Row label={desk.job.name} value={copy.jobPayLine(desk.job.dailyPay, formatWhen(nextDayTurn()))} />
        ) : (
          <Line testId="desk-no-job">{copy.deskNoJob(desk.jobPlaces)}</Line>
        )}
        {desk.oneOfUsPc > 0 && <Line testId="desk-one-of-us">{copy.oneOfUsPaid(desk.oneOfUsPc)}</Line>}
        {/* Slice 4 (ADR 0028, screens §9.3): hero and Issue Political Capital credited, and the room. */}
        {(desk.awards ?? []).map((a) => (
          <Line key={`${a.kind}:${a.label}`} testId="desk-award">
            {copy.deskAward(a.label, a.pc)}
          </Line>
        ))}
        {desk.room && (
          <Line testId="desk-room" small>
            {copy.lodgings.running(WEEKDAY_NAMES[weekday(desk.room.untilDay)], desk.room.cap)}
          </Line>
        )}
        <div className="flex items-baseline justify-between gap-2.5 border-b border-dotted border-faint text-[14px]">
          <HelpButton
            notes={[copy.help.rested() as HelpNote]}
            label="What Rested means"
            className="font-body"
          >
            <span className={helpMark}>Rested</span>, banked since last visit
          </HelpButton>
          <span className="text-right font-label text-petrol">
            +{desk.restedBanked} · {desk.rested.value} / {desk.rested.cap}
          </span>
        </div>
        {/* Slice 5 (screens §2.5): where you are on rival ground, then Heat and the record. */}
        {desk.where?.rivalGround && (
          <Row
            label={copy.risk.desk.whereYouAre}
            value={copy.risk.desk.rivalGround(desk.where.rivalGround.cityName)}
            testId="desk-where"
          />
        )}
        {desk.heat && desk.heat.value > 0 && (
          <Row
            label="Heat"
            value={copy.risk.heatDesk(
              copy.risk.heatState[desk.heat.state],
              desk.heat.value,
              desk.heat.coolsAt !== null ? formatWhen(desk.heat.coolsAt) : null,
            )}
            tone={desk.heat.state === 'hot' || desk.heat.state === 'wanted' ? 'text-failure' : undefined}
            testId="desk-heat"
          />
        )}
        {desk.record && desk.record.level !== 'clean' && (
          <Row
            label={copy.risk.yourRecord}
            value={copy.risk.recordLine(copy.risk.recordLevel[desk.record.level], desk.record.marks)}
            testId="desk-record"
          />
        )}
        <Row
          label="Energy"
          value={`${desk.energy.value} / ${desk.energy.max}${desk.energy.fullAt ? ` · ${copy.energyFullAt(formatWhen(desk.energy.fullAt))}` : ''}`}
        />
        <Row
          label={`Level ${desk.level.level}`}
          value={`${formatNumber(desk.level.xpToNext)} XP to Level ${desk.level.next}${desk.level.statPointsPending > 0 ? ` · ${copy.pointsToPlace(desk.level.statPointsPending)}` : ''}`}
        />
        <Row
          label={`Reputation in ${desk.standing.cityName}`}
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
