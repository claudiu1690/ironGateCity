import { copy } from '@irongate/content/copy';
import type { PatronCardView, PatronClockView, PatronRequestView } from '@irongate/rules';
import { useState } from 'react';
import { cx } from '../format';
import { Button } from './Button';
import { HelpButton, helpMark } from './Help';
import { Picture } from './Picture';
import { ProgressBar } from './ProgressBar';
import { BottomSheet } from './Sheets';

/**
 * Slice 8 phase C, lane Q (screens §8): the patron's card on Herald House's and the Pier Hotel's
 * sheets, the Me tab's patron clocks and the Requests' rows. Plain props; the server words the lines.
 */

/** Screens §8.1: the progress toward the next tier, from the previous tier's figure. */
function barOf(favour: number, next: { at: number } | null) {
  if (!next) return { value: 1, max: 1 };
  const floors = [0, 10, 30, 60, 90];
  const floor = [...floors].reverse().find((f) => f <= favour && f < next.at) ?? 0;
  return { value: favour - floor, max: Math.max(1, next.at - floor) };
}

/** One open Request (screens §8.1, §8.2): the title, *by {weekday}*, the progress. */
export function RequestRow({
  request,
  onOpen,
  testId = 'request-row',
}: {
  request: PatronRequestView;
  onOpen?: () => void;
  testId?: string;
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-col">
        <span className="font-body text-[14px] leading-snug font-semibold">{request.title}</span>
        <span className="font-mono text-[11.5px] text-muted">{copy.life.patron.by(request.untilWeekday)}</span>
      </span>
      <span className={cx('shrink-0 font-mono text-[12px]', request.done ? 'text-success' : 'text-petrol')} data-testid="request-progress">
        {copy.life.patron.progress(request.progress, request.target)}
        {request.done ? ' ✓' : ''}
      </span>
    </>
  );
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-t border-dotted border-faint py-1.5 text-left hover:bg-paper-2"
      data-testid={testId}
    >
      {body}
    </button>
  ) : (
    <div className="flex min-h-11 items-center justify-between gap-3 border-t border-dotted border-faint py-1.5" data-testid={testId}>
      {body}
    </div>
  );
}

export interface PatronCardProps {
  card: PatronCardView;
  onGift: () => void;
  giftPending?: boolean;
  onFavour: (issueDocId?: string) => void;
  favourPending?: boolean;
  onRequest?: (r: PatronRequestView) => void;
  notice?: string | null;
}

/** Screens §8.1: the portrait, the Favour line and bar, the voice, Gift, the Requests, the favour, the perks. */
export function PatronCard({ card, onGift, giftPending, onFavour, favourPending, onRequest, notice }: PatronCardProps) {
  const [pick, setPick] = useState(false);
  const bar = barOf(card.favour, card.next);
  const f = card.favourAct;
  return (
    <section
      aria-label={copy.life.patron.kicker(card.name)}
      className="mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card"
      data-testid="patron-card"
      data-patron={card.id}
    >
      <HelpButton notes={[copy.life.help.favour()]} label="What Favour means" className="w-full border-b border-ink px-3 py-1.5">
        <h3 className={cx('label-caps text-[11px] font-semibold', helpMark)}>{copy.life.patron.kicker(card.name)}</h3>
      </HelpButton>
      <div className="flex flex-col gap-2 px-3 py-2">
        <div className="flex items-center gap-3">
          <Picture
            asset={card.portrait}
            sizes="56px"
            decorative
            className="size-14 shrink-0 rounded-full border-2 border-ink object-cover object-top"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-body text-[15px] font-semibold">{card.name}</span>
            <span className="font-mono text-[12px]" data-testid="patron-line">
              {card.line}
            </span>
            <ProgressBar
              label={card.next ? copy.life.patron.nextAt(card.next.tierWord, card.next.at) : card.tierWord}
              value={bar.value}
              max={bar.max}
              tone="petrol"
              className="w-full"
            />
          </div>
        </div>
        <p className="font-body text-[13px] text-text-2 italic">{card.voice}</p>
        {card.gift.state === 'level' ? (
          <span className="font-mono text-[12px] text-muted">{copy.life.patron.meEmpty}</span>
        ) : card.gift.state === 'given' ? (
          <span className="font-mono text-[12px] text-muted" data-testid="patron-given">
            {copy.life.patron.givenToday}
          </span>
        ) : (
          <Button
            className="w-full"
            onClick={onGift}
            pending={giftPending}
            disabled={card.gift.state === 'needsIron'}
            data-testid="patron-gift"
          >
            {copy.life.patron.gift}
          </Button>
        )}
        {card.gift.state === 'needsIron' && (
          <span className="font-mono text-[12px] text-muted">{copy.life.wardrobe.needsIron(card.gift.cost)}</span>
        )}
        {card.requests.length > 0 ? (
          <div className="flex flex-col" data-testid="patron-requests">
            {card.requests.map((r) => (
              <RequestRow key={r.id} request={r} onOpen={onRequest ? () => onRequest(r) : undefined} />
            ))}
          </div>
        ) : card.level ? (
          <span className="font-mono text-[12px] text-muted" data-testid="patron-first-visit">
            {copy.life.patron.firstVisit}
          </span>
        ) : null}
        {f && (
          <div className="flex flex-col gap-1 border-t border-dotted border-faint pt-1.5">
            {f.state === 'used' ? (
              <span className="font-mono text-[12px] text-muted" data-testid="patron-favour-used">
                {copy.life.patron.calledIn(f.fromWeekday ?? '')}
              </span>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                disabled={f.state === 'needsPc'}
                pending={favourPending}
                onClick={() => (f.act === 'plantHeadline' ? setPick(true) : onFavour())}
                data-testid="patron-favour"
              >
                {f.title}
              </Button>
            )}
          </div>
        )}
        <ul className="flex flex-col gap-0.5 pt-1" data-testid="patron-perks">
          {card.perks.map((p) => (
            <li key={p.tier} className={cx('font-mono text-[11.5px]', p.reached ? 'text-ink' : 'text-muted')}>
              {p.line}
              {p.reached ? ' ✓' : ''}
            </li>
          ))}
        </ul>
        {notice && (
          <p role="status" className="font-mono text-[12px] text-collective">
            {notice}
          </p>
        )}
      </div>
      {f?.act === 'plantHeadline' && (
        <BottomSheet open={pick} onOpenChange={setPick} title={f.title}>
          <ul className="flex flex-col" data-testid="patron-issues">
            {(f.issues ?? []).map((i) => (
              <li key={i.docId}>
                <button
                  type="button"
                  onClick={() => {
                    setPick(false);
                    onFavour(i.docId);
                  }}
                  className="flex min-h-11 w-full cursor-pointer flex-col items-start border-b border-dotted border-faint py-1.5 text-left hover:bg-paper-2"
                >
                  <span className="font-body text-[14px] font-semibold">{i.name}</span>
                  <span className="font-mono text-[11.5px] text-muted">{i.cityName}</span>
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
    </section>
  );
}

/** Screens §8.2: the Me tab's row per patron: the name, the tier and Favour, the bar, the Requests. */
export function PatronClock({
  clock,
  portrait,
  onOpen,
}: {
  clock: PatronClockView;
  portrait?: PatronCardView['portrait'] | null;
  onOpen?: () => void;
}) {
  const bar = barOf(clock.favour, clock.next);
  const inner = (
    <>
      <div className="flex items-center gap-2.5">
        {portrait && (
          <Picture asset={portrait} sizes="32px" decorative className="size-8 shrink-0 rounded-full border border-ink object-cover object-top" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-body text-[14px]" data-testid="patron-clock-line">
            {clock.line}
          </span>
          <ProgressBar
            label={clock.next ? copy.life.patron.nextAt(clock.next.tierWord, clock.next.at) : clock.tierWord}
            value={bar.value}
            max={bar.max}
            tone="petrol"
            className="w-full"
          />
          {clock.next && (
            <span className="font-mono text-[11px] text-muted">{copy.life.patron.nextAt(clock.next.tierWord, clock.next.at)}</span>
          )}
        </div>
      </div>
      {clock.requests.map((r) => (
        <span key={r.id} className="font-mono text-[11.5px] text-text-2" data-testid="patron-clock-request">
          {r.title} · {copy.life.patron.by(r.untilWeekday)}
        </span>
      ))}
    </>
  );
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full cursor-pointer flex-col gap-1 border-b border-dotted border-faint py-2 text-left hover:bg-paper-2"
      data-testid="patron-clock"
      data-patron={clock.id}
    >
      {inner}
    </button>
  ) : (
    <div className="flex flex-col gap-1 border-b border-dotted border-faint py-2" data-testid="patron-clock" data-patron={clock.id}>
      {inner}
    </div>
  );
}
