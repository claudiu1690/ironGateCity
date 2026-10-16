import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { energyReadyAt, riskBand } from '@irongate/rules';
import type { FactionId, MissionRiskView, MissionView } from '@irongate/rules';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cx, formatWhen } from '../format';
import { oddsTag, ticketOdds } from '../odds';
import { HelpButton, helpMark } from './Help';
import { ordinanceTagText } from './ResultModal';
import { placeTagText } from './Ticket';

/**
 * Slice 5's missions (docs/design/slice-5-screens.md §4): the ticket with its risk line, the
 * briefing with its ways, one choice and a confirm. Plain props: the server sends the chances and the
 * risk; these word them (odds and risk as words, Heat and marks as numbers, since they are costs).
 */

/** A mission's risk word: *Safe* never shows on a mission (screens §4.1), so the floor is *A little risk*. */
export function missionRiskWord(runInChance: number): { word: string; dangerous: boolean } {
  const band = riskBand(runInChance);
  const shown = band === 'safe' ? 'littleRisk' : band;
  return { word: copy.risk.riskWord[shown], dangerous: shown === 'dangerous' };
}

/** "Heat +8 · Risky · if caught, a mark on your record" (the tail only for illegal work). */
export function riskLineText(risk: MissionRiskView): string {
  const { word } = missionRiskWord(risk.runInChance);
  return [
    copy.risk.heatPlus(risk.heat),
    word,
    ...(risk.marks > 0 ? [copy.risk.ifCaught(risk.marks)] : []),
  ].join(' · ');
}

export interface RiskLineProps {
  risk: MissionRiskView;
  className?: string;
}

/**
 * Screens §4.1: the ticket's risk line in Courier 11 px, its own row. The risk word is dotted-underlined
 * and the line is one tap target for its note; the line is in the failure colour when *Dangerous*.
 */
export function RiskLine({ risk, className }: RiskLineProps) {
  const { word, dangerous } = missionRiskWord(risk.runInChance);
  return (
    <HelpButton
      notes={[copy.risk.help.risk()]}
      label={`${word}: what the risk means`}
      testId="risk-line-help"
      className={cx(
        // 56 characters of Courier at 11 px need ~370 px: tracked in a little, it wraps only below.
        '-mx-1 -my-2 inline-flex items-center self-start px-1 text-left font-mono text-[11px] tracking-[-0.03em]',
        dangerous ? 'text-failure' : 'text-text-2',
        className,
      )}
    >
      <span data-testid="risk-line" data-dangerous={dangerous || undefined}>
        {/* QA fixes §7.2: each segment is whole; the line breaks only at the dots. */}
        <span className="whitespace-nowrap">{copy.risk.heatPlus(risk.heat)}</span> ·{' '}
        <span className={cx(helpMark, 'whitespace-nowrap')}>{word}</span>
        {risk.marks > 0 && (
          <>
            {' '}
            · <span className="whitespace-nowrap">{copy.risk.ifCaught(risk.marks)}</span>
          </>
        )}
      </span>
    </HelpButton>
  );
}

/** The type label: *Mission · Speech* / *Mission · Watch and listen* / *Mission · Against the Vanguard*. */
export function missionLabel(
  m: Pick<MissionView, 'label' | 'targetFactionId'>,
  names: Partial<Record<FactionId, string>>,
): string {
  if (m.label === 'speech') return copy.risk.label.speech;
  if (m.label === 'watch') return copy.risk.label.watch;
  const t = m.targetFactionId;
  return copy.risk.label.against(t ? (names[t] ?? t) : '');
}

/** The way the ticket speaks for: the remembered one, else the suggested (the player's best). */
export function ticketWay(m: MissionView): MissionView['ways'][number] | undefined {
  return m.ways.find((w) => w.id === (m.remembered ?? m.suggested)) ?? m.ways[0];
}

/** A locked mission ticket's one reason (screens §4.1). */
export function missionLockText(m: MissionView): string | null {
  const l = m.locked;
  if (!l) return null;
  switch (l.reason) {
    case 'LEVEL':
      return copy.risk.locked.level(l.need);
    case 'RANK':
      return copy.risk.locked.rank(l.rankTitle ?? '');
    case 'STANDING':
      return copy.needsReputation(l.need);
    case 'RECORD':
      return copy.risk.locked.record;
    // Review 5 (answers §12.1, ADR 0080): *Opens at nightfall · dusk at 16:00*.
    case 'NIGHT':
      return copy.night.opensAt(formatWhen(l.opensAt ?? 0));
    // Slice 8 (T9, design §3.7, §5.4): a society call's door and a patron's introduction.
    case 'NOT_DRESSED':
      return copy.life.errors.notDressed(l.need);
    case 'WANTED':
      return copy.life.errors.wanted;
    case 'CALLED_TODAY':
      return copy.life.errors.onceADay;
    case 'NEEDS_ASSOCIATE':
      return copy.life.errors.needsAssociate(l.patron ?? '');
  }
}

export interface MissionTicketProps {
  mission: MissionView;
  /** Energy projected to now, from the HUD. */
  energy: { value: number; nextTickAt: number | null };
  /** Every party's short name, for *Against the Vanguard*. */
  names: Partial<Record<FactionId, string>>;
  /** *Choose a way* (the first time) and *Choose another way*: the briefing. */
  onChoose: () => void;
  /** *Again*: the remembered way, one tap. */
  onAgain: () => void;
  /** *Again* waits for the server. */
  pending?: boolean;
  /** A refusal from the server, already worded. */
  notice?: string;
  orderBonusPct?: number;
  highlight?: boolean;
}

/**
 * Screens §4.1: a mission as a printed ticket. The stub, the title, one tags line (the type, the odds
 * word and stat of the remembered way or the best one, then the place's and the rule's tags and the
 * Party order), the risk line; then *Choose a way* the first time, or *Again* with its cost and a text
 * button *Choose another way* under the ticket. Locked: dimmed, no button, one reason.
 */
export function MissionTicket({
  mission: m,
  energy,
  names,
  onChoose,
  onAgain,
  pending = false,
  notice,
  orderBonusPct = 25,
  highlight = false,
}: MissionTicketProps) {
  const hintId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight]);
  const way = ticketWay(m);
  const lock = missionLockText(m);
  const short = energy.value < m.energy;
  const readyAt = short ? energyReadyAt(energy, m.energy) : null;
  const reason =
    lock ?? (short ? copy.needsEnergy(m.energy, readyAt === null ? '—' : formatWhen(readyAt)) : null);
  const placeTags = m.placeTags ?? [];
  const rival = placeTags.some((t) => t.kind === 'rivalGround');
  const orderDone = !!m.order && m.order.progress >= m.order.target;
  const order = m.order
    ? orderDone
      ? copy.orderDone
      : copy.orderTag(m.order.progress, m.order.target, orderBonusPct)
    : null;
  // The odds' own tags (a rule's, First day) are words; rival ground's worse odds are its tag's.
  const bonusTags = (way?.preview.bonuses ?? [])
    .filter(
      (b) =>
        b.id !== 'standing' &&
        !(rival && b.id === 'rivalGround') &&
        !(placeTags.some((t) => t.kind === 'closeRace') && b.id === 'battleground') &&
        !(m.tags ?? []).some((t) => t.ordinanceId === b.id),
    )
    .map(oddsTag);
  // QA fixes §2 (m3): the tags line is the type label and the odds word only; every other tag is a
  // chip on a second line that exists only when there is one; the cap line is its own row (n12).
  const tags = [missionLabel(m, names), ...(lock || !way ? [] : [ticketOdds(way.preview)])].join(' · ');
  const chips: Array<{ text: string; order?: boolean }> = [
    ...(m.tags ?? []).filter((t) => t.kind === 'energy').map(ordinanceTagText),
    ...placeTags
      .filter((t) => t.kind !== 'membersOnly' && t.kind !== 'pressureCapped' && t.kind !== 'known')
      .map(placeTagText),
    ...(m.tags ?? []).filter((t) => t.kind !== 'energy').map(ordinanceTagText),
    // Review 4 #18: *Known here · better odds* where *Open Doors · better odds* sits.
    ...placeTags.filter((t) => t.kind === 'known').map(placeTagText),
    ...bonusTags,
  ].map((text) => ({ text }));
  if (order) chips.push({ text: order, order: !orderDone });
  // Slice 8 lane Q (screens §14): a society call's door and its Favour (*no Party XP · +2 Favour with …*).
  if (m.society) {
    chips.unshift({ text: m.society.needsLine });
    if (m.society.tag) chips.push({ text: m.society.tag });
  }
  const capped = !lock && placeTags.some((t) => t.kind === 'pressureCapped');
  const first = m.remembered === null;
  const button = cx(
    'shrink-0 cursor-pointer border-l border-ink font-label text-paper',
    'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-paper',
    'disabled:cursor-not-allowed disabled:bg-faint',
  );
  return (
    <div
      ref={ref}
      className="flex flex-col"
      data-testid={`mission-${m.id}`}
      data-mission={m.id}
      data-highlight={highlight || undefined}
    >
      <div
        className={cx(
          'flex flex-col border bg-paper-card text-ink',
          lock ? 'border-faint opacity-60' : 'border-ink',
          highlight && 'shadow-[0_0_0_3px_var(--color-xp)]',
        )}
        data-locked={lock ? m.locked!.reason : undefined}
      >
        <div className="flex min-h-[64px] items-stretch">
          <div className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-px border-r-[1.5px] border-dashed border-ink bg-paper-2">
            <span className="font-label text-[19px] leading-none font-semibold">{m.energy}</span>
            <span className="label-caps text-[8px]">Energy</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-1.5">
            <span className="font-display text-[15px] leading-tight font-bold" data-testid="mission-name">
              {m.name}
            </span>
            {lock && (
              <span className="font-mono text-[11px] text-muted" data-testid="mission-lock">
                {lock}
              </span>
            )}
          </div>
          {!lock &&
            (first ? (
              <button
                type="button"
                onClick={onChoose}
                disabled={short || pending}
                aria-describedby={reason ? hintId : undefined}
                className={cx(
                  button,
                  'w-16 bg-ink px-1 text-[11px] leading-tight tracking-[0.08em] uppercase hover:bg-ink-2',
                )}
                data-testid="mission-choose"
              >
                {copy.risk.chooseAWay}
              </button>
            ) : (
              <button
                type="button"
                onClick={onAgain}
                disabled={short || pending}
                aria-busy={pending || undefined}
                aria-label={`${m.name}: ${copy.risk.again}, ${way?.title ?? ''}, ${m.energy} Energy`}
                aria-describedby={reason ? hintId : undefined}
                className={cx(
                  button,
                  'group flex w-16 flex-col items-center justify-center gap-0.5 bg-ink hover:bg-ink-2',
                )}
                data-testid="mission-again"
              >
                {pending ? (
                  '…'
                ) : (
                  <>
                    <span className="text-[12px] leading-none tracking-[0.08em] uppercase">
                      {copy.risk.again}
                    </span>
                    <span
                      aria-hidden="true"
                      className="label-caps text-[8px] leading-none text-energy-light group-disabled:text-paper"
                      data-testid="mission-again-cost"
                    >
                      {copy.ticket.threeCost(m.energy)}
                    </span>
                  </>
                )}
              </button>
            ))}
        </div>
        {/* The type and the odds, one line across the ticket (Oswald caps 10 px; m3). */}
        <p
          className="px-2 pt-0.5 pb-1 font-label text-[10px] leading-[14px] tracking-[0.03em] text-muted uppercase"
          data-testid="mission-tags"
        >
          {tags}
        </p>
        {chips.length > 0 && (
          <ul
            className="flex flex-wrap gap-x-1 gap-y-0.5 border-t border-dotted border-ink px-2 py-1"
            aria-label="Tags"
            data-testid="mission-chips"
          >
            {chips.map((c) => (
              <li
                key={c.text}
                className={cx(
                  'border px-1 font-label text-[10px] leading-[15px]',
                  c.order ? 'border-collective text-collective' : 'border-faint text-text-2',
                )}
              >
                {c.text}
              </li>
            ))}
          </ul>
        )}
        {capped && (
          <p
            className="border-t border-dotted border-ink px-2 py-1 font-mono text-[11px] text-muted"
            data-testid="mission-capped"
          >
            {copy.risk.pressureCapped}
          </p>
        )}
        {/* The risk line, its own row across the ticket (screens §4.1). */}
        {!lock && (
          <div className="flex min-h-7 items-center border-t border-dotted border-ink px-2 py-0.5">
            <RiskLine risk={m.risk} />
          </div>
        )}
      </div>
      {!lock && short && reason && (
        <p id={hintId} className="mt-1 font-mono text-[11px] text-muted" data-testid="mission-hint">
          {reason}
        </p>
      )}
      {!lock && !first && (
        <button
          type="button"
          onClick={onChoose}
          disabled={pending}
          className="label-caps -mb-1 min-h-11 cursor-pointer self-start text-[11px] text-petrol underline decoration-dotted underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="mission-another"
        >
          {copy.risk.chooseAnotherWay}
        </button>
      )}
      {notice && (
        <p role="status" className="mt-1 font-body text-[13px] text-collective" data-testid="mission-notice">
          {notice}
        </p>
      )}
    </div>
  );
}

export interface WayRowProps {
  way: MissionView['ways'][number];
  /** The ticket's risk, to print the way's own only where it differs. */
  selected: boolean;
  last: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * Screens §4.2: a way, the `StoryScreen` row (full width, 56 px, 1.5 px ink): the title, the odds word
 * and stat (and its own risk word where it differs from the ticket's), the hint; *Last time* at the
 * right of the remembered way. A tap selects (the row inverts); the sheet's button spends.
 */
export function WayRow({ way, selected, last, onSelect, disabled }: WayRowProps) {
  const own = way.risk ? missionRiskWord(way.risk.runInChance) : null;
  // Review 5 (answers §12.1, ADR 0080): a night way by day is greyed with its lock line.
  const night = way.night ?? null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled || night !== null}
      data-night={night ? 'locked' : undefined}
      onClick={onSelect}
      className={cx(
        'flex min-h-14 w-full cursor-pointer flex-col items-start justify-center gap-0.5 border-[1.5px] border-ink px-3.5 py-2 text-left',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
        selected ? 'bg-ink text-paper' : 'bg-paper-card hover:bg-paper',
        'disabled:cursor-not-allowed',
        night && 'border-faint opacity-60 hover:bg-paper-card',
      )}
      data-testid="way-row"
      data-way={way.id}
    >
      <span className="flex w-full items-baseline justify-between gap-3">
        <span className="font-body text-[15px] leading-snug font-semibold">{way.title}</span>
        {last && (
          <span className="shrink-0 font-mono text-[10.5px] opacity-80" data-testid="way-last">
            {copy.risk.lastTime}
          </span>
        )}
      </span>
      {night ? (
        <span className="font-mono text-[11px] opacity-85" data-testid="way-night">
          {copy.night.opensAt(formatWhen(night.opensAt))}
        </span>
      ) : (
        <span className="font-mono text-[11px] opacity-85" data-testid="way-odds">
          {ticketOdds(way.preview)}
          {own ? ` · ${copy.risk.runInWord(own.word)}` : ''}
        </span>
      )}
      <span className="font-body text-[13px] leading-snug italic opacity-85">{way.hint}</span>
    </button>
  );
}

export interface MissionBriefingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: MissionView | null;
  /** "The Shipyard" (the kicker). */
  placeName: string;
  energy: { value: number; nextTickAt: number | null };
  /** The sticky button: start the mission with this way (slice 8: the morgue file's chosen name). */
  onConfirm: (wayId: string, subjectId?: string) => void;
  pending?: boolean;
  notice?: string;
}

/**
 * Screens §4.2: the briefing, a bottom sheet (at most 72 dvh, 80 on phones under 700 px tall, QA m2; a 480 px card on desktop): the kicker,
 * the title, the briefing, the ways (the remembered one first, *Last time*). A row selects; the sticky
 * button *{Way} · 15 Energy* spends (one more tap, so a brush on a row is no spend). Escape and Close
 * close it with nothing spent.
 */
export function MissionBriefing({
  open,
  onOpenChange,
  mission: m,
  placeName,
  energy,
  onConfirm,
  pending = false,
  notice,
}: MissionBriefingProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  // A new mission (or the sheet opened again) starts with no row selected.
  const missionId = m?.id ?? null;
  useEffect(() => {
    if (open) {
      setSelected(null);
      setSubject(null);
    }
  }, [open, missionId]);
  // QA m8: the briefing opens from a ticket's button, not a Radix trigger, so Radix has nothing to give
  // focus back to and it fell to <body>. The opener is taken before the focus moves into the sheet
  // (a layout effect runs before the focus scope's mount effect) and focused again on close.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const active = typeof document === 'undefined' ? null : document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, [open]);
  if (!m) return null;
  const ways = [...m.ways].sort(
    (a, b) => (a.id === m.remembered ? -1 : 0) - (b.id === m.remembered ? -1 : 0),
  );
  const way = ways.find((w) => w.id === selected) ?? null;
  const short = energy.value < m.energy;
  // Slice 8 lane Q (§21.1 Q12): the morgue file asks whose envelope first.
  const needsSubject = !!m.subject && m.subject.names.length > 0 && subject === null;
  const label = short
    ? copy.risk.needsEnergy(m.energy)
    : way
      ? copy.risk.wayCost(way.title, m.energy)
      : copy.risk.chooseAWay;
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="ease-dim fixed inset-0 z-40 bg-ink/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            const el = opener.current;
            if (el?.isConnected) {
              e.preventDefault();
              el.focus();
            }
          }}
          className={cx(
            'ease-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[72dvh] flex-col [@media(max-width:639px)_and_(max-height:700px)]:max-h-[80dvh] bg-paper text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.45)]',
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(720px,calc(100dvh-48px))] sm:w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]',
          )}
          data-testid="briefing"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pt-2.5 pb-2.5">
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="label-caps text-[10px] text-muted" data-testid="briefing-kicker">
                  {copy.risk.briefingKicker(placeName)}
                </span>
                <Dialog.Title className="font-display text-[20px] leading-tight font-black">
                  {m.name}
                </Dialog.Title>
              </div>
              <Dialog.Close
                className="label-caps -mr-1 min-h-11 min-w-11 shrink-0 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] hover:bg-ink hover:text-paper"
                aria-label={`Close ${m.name}`}
                disabled={pending}
              >
                Close
              </Dialog.Close>
            </div>
            <p className="font-body text-[15px] leading-snug text-text-2" data-testid="briefing-text">
              {m.briefing}
            </p>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label={copy.risk.chooseAWay}>
              {ways.map((w) => (
                <WayRow
                  key={w.id}
                  way={w}
                  selected={selected === w.id}
                  last={m.remembered === w.id}
                  onSelect={() => setSelected(w.id)}
                  disabled={pending}
                />
              ))}
            </div>
            {m.subject && (
              <fieldset className="flex flex-col gap-1.5" data-testid="briefing-subject">
                <legend className="label-caps pb-1 text-[11px] font-semibold">{m.subject.prompt}</legend>
                <div role="radiogroup" aria-label={m.subject.prompt} className="flex flex-wrap gap-1.5">
                  {m.subject.names.map((n) => (
                    <button
                      key={n.subjectId}
                      type="button"
                      role="radio"
                      aria-checked={subject === n.subjectId}
                      onClick={() => setSubject(n.subjectId)}
                      disabled={pending}
                      className={cx(
                        'label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-2.5 text-[11px]',
                        subject === n.subjectId ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-2',
                      )}
                      data-testid="briefing-subject-option"
                    >
                      {n.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {notice && (
              <p
                role="status"
                className="font-body text-[13px] text-collective"
                data-testid="briefing-notice"
              >
                {notice}
              </p>
            )}
          </div>
          <div className="shrink-0 border-t border-track bg-paper px-4 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => way && !short && !pending && !needsSubject && onConfirm(way.id, subject ?? undefined)}
              disabled={!way || short || pending || needsSubject}
              aria-busy={pending || undefined}
              className="label-caps flex min-h-12 w-full cursor-pointer items-center justify-center bg-ink px-4 py-1 text-center text-[13px] leading-tight text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:bg-faint"
              data-testid="briefing-confirm"
            >
              {pending ? '…' : label}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
